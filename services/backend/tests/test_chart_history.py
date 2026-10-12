"""P2-06 period truth, deterministic chart-only fixtures and offline real adapters."""
from datetime import datetime, timezone
import threading

from fastapi.testclient import TestClient
import httpx
import pytest

from research_trail.app import create_app
from research_trail.chart_fixtures import authored_chart_data, aggregate
from research_trail.market import FixtureMarketProvider, Kline
from research_trail.provider_contracts import ReadQuery
from research_trail.provider_errors import ProviderFault
from research_trail.provider_massive import MassiveProvider
from research_trail.provider_sdk import execute_sdk
from research_trail.provider_service import authored_data
from research_trail.workspace_fixtures import fixture_executor
from research_trail.workspace_normalize import bars
from test_settings import Vault, TOKEN, HEADERS
from test_providers import snap, authorize, save

PERIODS = ('1m', '5m', '15m', '1h', '1d', '1w')


def query(period, count=260):
    return ReadQuery(capability='market.kline', symbol='AAPL.US', period=period, count=count)


@pytest.mark.parametrize('period', PERIODS)
@pytest.mark.parametrize('executor', [None, 'success'])
def test_security_chart_period_truth_and_legacy_isolation(tmp_path, period, executor):
    options = {} if executor is None else {'simulated_executor': fixture_executor(executor)}
    app = create_app(TOKEN, database_path=tmp_path/'chart.sqlite3', credential_vault=Vault(), provider_options=options)
    with TestClient(app, headers=HEADERS) as client:
        page = client.post('/workspace/page', json={'view': 'kline', 'symbol': 'AAPL.US', 'period': period}).json()
        block = page['blocks'][0]
        assert block['status'] == 'ready'
        rows = block['bars']
        assert rows == authored_chart_data(query(period))
        assert len(rows) == (53 if period == '1w' else 260)
        for row in rows:
            Kline.model_validate(row)
        assert [r['timestamp'] for r in rows] == sorted(set(r['timestamp'] for r in rows))
        assert rows[-1]['close'] == 189.43
        if period in ('1m', '5m', '15m', '1h'):
            span = {'1m': 60, '5m': 300, '15m': 900, '1h': 3600}[period]
            assert all(b['timestamp'] - a['timestamp'] == span for a, b in zip(rows, rows[1:]))
        elif period == '1w':
            assert all(datetime.fromtimestamp(r['timestamp'], timezone.utc).weekday() == 0 for r in rows)
            assert all(b['timestamp'] - a['timestamp'] == 7*86400 for a, b in zip(rows, rows[1:]))
        provenance = block['provenance']
        assert provenance['data_label'] == '模拟数据'  # Preserve the public enum; UI supplies the synthetic explanation.
        assert provenance['mode'] == 'simulated' and provenance['transport'] == 'fixture'
        assert datetime.fromisoformat(provenance['market_time']).timestamp() == rows[-1]['timestamp']
        assert provenance['fetched_at'] and provenance['served_at']
        legacy = authored_data(query('1d'))
        assert len(legacy) == 10 and legacy == [r.model_dump() for r in FixtureMarketProvider().snapshot('AAPL.US').klines]
        # The ordinary provider/Agent path must not silently select chart history.
        result = client.post('/providers/longbridge/query', json=query('1d').model_dump(mode='json')).json()
        assert result['data'] == legacy and result['provenance']['data_label'] == '模拟数据'
        real = client.post('/workspace/page', json={'view': 'kline', 'symbol': 'AAPL.US', 'period': period, 'mode': 'real'}).json()
        assert real['status'] == 'failed' and real['blocks'][0]['status'] == 'unconfigured' and not real['blocks'][0]['bars']


@pytest.mark.parametrize('period,span', [('5m', 300), ('15m', 900), ('1h', 3600)])
def test_intraday_aggregation_matches_underlying_minutes(period, span):
    # Last three larger buckets are completely contained in the latest 260 minutes.
    minute = authored_chart_data(query('1m'))
    assert aggregate(minute, span)[-3:] == authored_chart_data(query(period, 3))
    assert authored_chart_data(query(period)) == authored_chart_data(query(period))


def test_weekly_is_ohlcv_aggregation_not_daily_relabel():
    daily = authored_chart_data(query('1d'))
    shifted = [{**row, 'timestamp': row['timestamp'] + 3*86400} for row in daily]
    expected = [{**row, 'timestamp': row['timestamp'] - 3*86400} for row in aggregate(shifted, 7*86400)]
    assert authored_chart_data(query('1w')) == expected


@pytest.mark.parametrize('case', ['missing', 'failure'])
def test_chart_fixture_errors_are_not_replaced_with_synthetic_success(tmp_path, case):
    with TestClient(create_app(TOKEN, database_path=tmp_path/'chart.sqlite3', credential_vault=Vault(),
            provider_options={'simulated_executor': fixture_executor(case)}), headers=HEADERS) as client:
        block = client.post('/workspace/page', json={'view': 'kline', 'symbol': 'AAPL.US', 'period': '5m'}).json()['blocks'][0]
        assert not block['bars'] and block['status'] == ('missing' if case == 'missing' else 'failed')


def test_unknown_and_unsupported_chart_never_claim_data(tmp_path):
    def unsupported(q):
        raise ProviderFault('UNSUPPORTED_CAPABILITY', 'unsupported')
    with TestClient(create_app(TOKEN, database_path=tmp_path/'chart.sqlite3', credential_vault=Vault(),
            provider_options={'simulated_executor': unsupported}), headers=HEADERS) as client:
        block = client.post('/workspace/page', json={'view': 'kline', 'symbol': 'AAPL.US', 'period': '1h'}).json()['blocks'][0]
        assert block['status'] == 'unsupported' and block['code'] == 'UNSUPPORTED_CAPABILITY' and not block['bars']
        assert client.post('/workspace/page', json={'view': 'kline', 'period': '2m'}).status_code == 422
    with pytest.raises(ValueError):
        authored_chart_data(query('1d').model_copy(update={'symbol': 'UNKNOWN.US'}))


def test_projection_keeps_newest_260_and_does_not_invent_missing_volume():
    rows = [{**r, 'timestamp': 1700000000 + i*60} for i, r in enumerate(authored_chart_data(query('1m')) + authored_data(query('1d')))]
    assert [r.timestamp for r in bars(list(reversed(rows)))] == [r['timestamp'] for r in rows[-260:]]
    assert bars([]) == [] and len(bars(rows[:1])) == 1
    missing = {**rows[0]}; missing.pop('volume')
    assert bars([missing]) == []  # Public Kline requires volume; never substitute zero.
    for field, value in [('timestamp', 'bad'), ('high', 1), ('volume', -1)]:
        with pytest.raises(ProviderFault):
            bars([{**rows[0], field: value}])


@pytest.mark.parametrize('period', ['1m','5m','15m','1h','1w'])
def test_legacy_fixture_explicitly_rejects_periods_without_matching_data(period):
    with pytest.raises(ProviderFault) as error:
        authored_data(query(period))
    assert error.value.code == 'UNSUPPORTED_CAPABILITY' and error.value.state == 'unsupported'


def test_real_workspace_executor_is_not_replaced_by_chart_examples(tmp_path):
    calls = []
    real_rows = [{**row, 'close': row['open']} for row in authored_data(query('1d'))]
    def sdk(snapshot, q, stop):
        calls.append((q.mode, q.period, q.count))
        return real_rows
    with TestClient(create_app(TOKEN, database_path=tmp_path/'real.sqlite3', credential_vault=Vault(),
            provider_options={'sdk_executor': sdk}), headers=HEADERS) as client:
        save(client); authorize(client)
        block = client.post('/workspace/page', json={'view':'kline','symbol':'AAPL.US','period':'1d','mode':'real'}).json()['blocks'][0]
        assert block['bars'] == real_rows and calls == [('real','1d',260)]
        assert block['provenance']['mode'] == 'real' and block['provenance']['transport'] == 'sdk'
        assert block['provenance']['data_label'] == '历史行情'
        simulation = client.post('/workspace/page', json={'view':'kline','symbol':'AAPL.US','period':'1d'}).json()['blocks'][0]
        assert simulation['bars'] == authored_chart_data(query('1d')) and len(calls) == 1


@pytest.mark.parametrize('period,enum', list(zip(PERIODS, ('Min_1','Min_5','Min_15','Min_60','Day','Week'))))
def test_longbridge_real_period_mapping_without_network(period, enum):
    import longbridge.openapi as sdk
    calls = []
    class Context:
        def candlesticks(self, *args):
            calls.append(args)
            return authored_chart_data(query(period))
    result = execute_sdk(snap(), query(period).model_copy(update={'mode': 'real'}), sdk=sdk, context_factory=lambda *a: Context())
    assert calls == [('AAPL.US', getattr(sdk.Period, enum), 260, sdk.AdjustType.NoAdjust)]
    assert result == authored_chart_data(query(period))


@pytest.mark.parametrize('period,multiplier,unit', [('1m',1,'minute'),('5m',5,'minute'),('15m',15,'minute'),('1h',60,'minute'),('1d',1,'day'),('1w',1,'week')])
def test_massive_real_period_mapping_and_accepted_order_without_network(period, multiplier, unit):
    rows = authored_chart_data(query(period, 3))
    def handler(request):
        assert f'/range/{multiplier}/{unit}/' in request.url.path
        assert request.url.params['limit'] == '260' and request.url.params['sort'] == 'desc'
        return httpx.Response(200, json={'results': [{'t':r['timestamp']*1000, 'o':r['open'], 'h':r['high'], 'l':r['low'], 'c':r['close'], 'v':r['volume']} for r in reversed(rows)]})
    result = MassiveProvider(httpx.MockTransport(handler)).execute(snap('massive'), query(period).model_copy(update={'mode': 'real'}), threading.Event())
    assert result == rows
