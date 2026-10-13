"""Offline overview contracts, no-provider API, bounded shared work and independent cancellation."""
import asyncio
from uuid import uuid4
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from research_trail.app import create_app
from research_trail.market_overview import MarketOverviewService, OverviewFault
from research_trail.market_overview_contracts import OverviewQuery, OverviewRow
from research_trail.market_overview_fixtures import overview_rows

TOKEN = 'overview-test-token-' * 3


def query(market='CN', mode='simulated', identity=None):
    return OverviewQuery(request_id=identity or uuid4(), market=market, mode=mode)


@pytest.mark.parametrize('market,count,unit', [('CN',6,'CNY'),('US',4,'USD'),('CRYPTO',6,'USDT')])
def test_deterministic_rows_asset_units_summary_and_missing_weights(market,count,unit):
    async def run():
        service = MarketOverviewService()
        try:
            one = await service.query(query(market)); two = await service.query(query(market))
            assert one.ok and two.ok and two.cache_hit
            assert one.rows == two.rows and one.summary == two.summary and len(one.rows) == count
            assert one.source == 'authored-market-v1' and one.freshness == 'fixture' and one.area_encoding == 'equal'
            assert one.fetched_at.year == 2024
            assert all(r.turnover_unit == unit and r.market_cap is None for r in one.rows)
            assert any(r.classification is None for r in one.rows)
            assert all(r.classification_kind != 'industry' for r in one.rows)
            if market == 'CRYPTO':
                assert all(r.asset.asset_class == 'crypto_pair' and r.security_symbol is None and r.volume_unit == r.asset.base_asset for r in one.rows)
                assert all((r.window_end-r.window_start).total_seconds() == 86400 for r in one.rows)
            elif market == 'CN':
                assert all(r.detail_target is None for r in one.rows)
            else:
                assert all(r.security_symbol == r.asset.symbol for r in one.rows)
            two.rows.clear()
            assert len((await service.query(query(market))).rows) == count
        finally: await service.close()
    asyncio.run(run())


@pytest.mark.parametrize('mutation', [
    lambda r:r['asset'].update(currency='USD'), lambda r:r['asset'].update(symbol='BTC/USDT'),
    lambda r:r['asset'].update(market='US'), lambda r:r.update(last_price=True),
    lambda r:r.update(change_percent=float('nan')), lambda r:r.update(change=float('inf')),
    lambda r:r.update(change_percent=100), lambda r:r.update(volume=-1),
    lambda r:r.update(turnover_unit='USDT'), lambda r:r.update(volume_unit='CNY'),
    lambda r:r.update(market_cap=1), lambda r:r.update(classification='银行', classification_kind='unclassified'),
    lambda r:r.update(security_symbol='AAPL.US',detail_target='security'),
], ids=['currency','crypto-stock','market','bool','nan','infinity','percent','volume','quote-unit','base-unit','unsourced-cap','unsourced-category','unsupported-detail'])
def test_row_rejects_invalid_cross_market_and_fabricated_semantics(mutation):
    row = asyncio.run(overview_rows('CN'))[-1].model_dump()
    mutation(row)
    with pytest.raises(ValidationError): OverviewRow.model_validate(row)


@pytest.mark.parametrize('change', [{'security_symbol':'AAPL.US','detail_target':'security'},
    {'asset':{'currency':'USD'}}, {'change_basis':'previous_close'}, {'window_start':None}])
def test_crypto_never_adopts_stock_semantics(change):
    row = asyncio.run(overview_rows('CRYPTO'))[0].model_dump()
    if 'asset' in change: row['asset'].update(change['asset'])
    else: row.update(change)
    with pytest.raises(ValidationError): OverviewRow.model_validate(row)


def test_api_auth_validation_cancel_and_real_never_call_provider(tmp_path):
    app = create_app(TOKEN, database_path=tmp_path/'api.sqlite3')
    with TestClient(app) as client:
        body = query().model_dump(mode='json')
        assert client.post('/market/overview',json=body).status_code == 401
        assert client.post(f"/market/overview/{body['request_id']}/cancel").status_code == 401
        app.state.providers.query = lambda *a,**kw:pytest.fail('Overview must never call a vendor')
        client.headers['X-ResearchTrail-Token'] = TOKEN
        for market in ('CN','US','CRYPTO'):
            simulated = client.post('/market/overview',json=query(market).model_dump(mode='json'))
            assert simulated.status_code == 200 and simulated.json()['mode'] == 'simulated'
            real = client.post('/market/overview',json=query(market,'real').model_dump(mode='json')).json()
            assert not real['ok'] and 'rows' not in real
            assert real['code'] == ('CRYPTO_PROVIDER_NOT_CONNECTED' if market == 'CRYPTO' else 'REAL_OVERVIEW_NOT_AUTHORIZED')
        for invalid in ({**body,'market':'HK'}, {**body,'mode':'live'}, {**body,'request_id':'../cancel'}, {**body,'symbols':['AAPL.US']}, {**body,'provider':'binance'}):
            assert client.post('/market/overview',json=invalid).status_code == 422
        identity = uuid4()
        assert client.post(f'/market/overview/{identity}/cancel').json()['cancelled'] is False
        assert client.post('/market/overview',json=query(identity=identity).model_dump(mode='json')).json()['code'] == 'CANCELLED'


@pytest.mark.parametrize('code,status', [('UNCONFIGURED','unconfigured'),('ACCESS_DENIED','restricted'),('RATE_LIMITED','rate_limited'),('NETWORK_ERROR','failed')])
def test_safe_failure_states_no_cache_or_fake_success(code,status):
    async def run():
        async def bad(_): raise OverviewFault(code)
        service = MarketOverviewService(executor=bad)
        try:
            result = await service.query(query())
            assert not result.ok and result.status == status and result.code == code
            assert not service.cache and not service.requests and not service.shared
        finally: await service.close()
    asyncio.run(run())


@pytest.mark.parametrize('case',['empty','overflow','duplicate','wrong-market','invalid'])
def test_empty_and_bad_batches_are_truthful(case):
    async def run():
        async def read(_):
            rows = await overview_rows('US' if case == 'wrong-market' else 'CN')
            if case == 'empty': return []
            if case == 'overflow': return rows * 4
            if case == 'duplicate': return [rows[0],rows[0]]
            if case == 'invalid': return [{'debug':'private exception content'}]
            return rows
        service = MarketOverviewService(executor=read)
        try:
            result = await service.query(query())
            if case == 'empty': assert result.ok and result.status == 'empty' and result.summary.total == 0
            else: assert not result.ok and result.code == 'INVALID_RESPONSE' and not service.cache
        finally: await service.close()
    asyncio.run(run())


def test_shared_reads_duplicate_id_cache_expiry_and_context_conflict():
    async def run():
        started,release = asyncio.Event(),asyncio.Event()
        calls = []; now = [0.]
        async def read(market):
            calls.append(market); started.set(); await release.wait(); return await overview_rows(market)
        service = MarketOverviewService(executor=read,clock=lambda:now[0])
        first = query(); other = query()
        try:
            a = asyncio.create_task(service.query(first)); await started.wait()
            duplicate = asyncio.create_task(service.query(first)); b = asyncio.create_task(service.query(other))
            await asyncio.sleep(0)
            conflict = await service.query(query('US', identity=first.request_id))
            assert conflict.code == 'REQUEST_ID_CONFLICT'
            release.set(); one,again,two = await asyncio.gather(a,duplicate,b)
            assert calls == ['CN'] and one == again and two.request_id == other.request_id
            assert (await service.query(first)) == one and len(calls) == 1
            assert (await service.query(query())).cache_hit
            now[0] = 31
            assert not (await service.query(query())).cache_hit and len(calls) == 2
            assert not service.shared and not service.requests
        finally: release.set(); await service.close()
    asyncio.run(run())


def test_one_consumer_cancel_does_not_stop_shared_work_and_last_cancel_does():
    async def run():
        started, release, stopped = asyncio.Event(),asyncio.Event(),asyncio.Event()
        async def read(market):
            started.set()
            try: await release.wait(); return await overview_rows(market)
            finally: stopped.set()
        service = MarketOverviewService(executor=read)
        first,other = query(),query()
        try:
            a = asyncio.create_task(service.query(first)); await started.wait()
            b = asyncio.create_task(service.query(other)); await asyncio.sleep(0)
            assert (await service.cancel(first.request_id)).cancelled
            assert (await a).code == 'CANCELLED' and not stopped.is_set()
            release.set(); assert (await b).ok
            assert not (await service.cancel(other.request_id)).cancelled
            service.cache.clear(); started.clear();release.clear();stopped.clear()
            third=query(); c=asyncio.create_task(service.query(third)); await started.wait()
            await service.cancel(third.request_id)
            assert (await c).code == 'CANCELLED' and stopped.is_set() and not service.cache
        finally: release.set(); await service.close()
    asyncio.run(run())


def test_two_execution_slots_four_requests_timeout_close_and_bounded_history():
    async def run():
        release=asyncio.Event(); calls=[]; current=[0]; peak=[0]
        async def read(market):
            current[0]+=1; peak[0]=max(peak[0],current[0]); calls.append(market)
            try: await release.wait(); return await overview_rows(market)
            finally: current[0]-=1
        service=MarketOverviewService(executor=read,timeout=.1)
        tasks=[asyncio.create_task(service.query(query(m))) for m in ('CN','US','CRYPTO','CN')]
        await asyncio.sleep(.02)
        assert (await service.query(query())).code == 'REQUEST_LIMIT'
        results=await asyncio.gather(*tasks)
        assert all(not r.ok and r.code == 'TIMEOUT' for r in results)
        assert peak[0] == 2 and len(calls) <= 3 and not service.requests and not service.shared and not service.cache
        pending=asyncio.create_task(service.query(query()));await asyncio.sleep(.01)
        await service.close();assert (await pending).code == 'CANCELLED' and current[0] == 0
        assert (await service.query(query())).code == 'CANCELLED'
        other=MarketOverviewService()
        for _ in range(90): await other.cancel(uuid4())
        assert len(other.finished)==64
        await other.close()
    asyncio.run(run())


def test_cancelled_http_waiter_reaps_its_last_execution():
    async def run():
        started, stopped = asyncio.Event(), asyncio.Event()
        async def read(_):
            started.set()
            try: await asyncio.Event().wait()
            finally: stopped.set()
        service = MarketOverviewService(executor=read)
        pending = asyncio.create_task(service.query(query()))
        await started.wait(); pending.cancel()
        with pytest.raises(asyncio.CancelledError): await pending
        assert stopped.is_set() and not service.requests and not service.shared and not service.cache
        await service.close()
    asyncio.run(run())
