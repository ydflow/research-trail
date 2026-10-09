from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from uuid import uuid4
from pathlib import Path
import threading
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from alembic import command
from alembic.config import Config
from research_trail.database import Database
from research_trail.models import OutcomeAttemptRecord, OutcomeOpinionRecord, OutcomePolicyRecord
from research_trail.outcomes import OutcomeService, OutcomeError
from research_trail.outcome_contracts import (OutcomeRequest, PerformanceQuery, WeightChange, WeightParameters, OutcomeCapture)
from research_trail.outcome_engine import calculate, aggregate, window, instant
from research_trail.outcome_fixtures import AS_OF, RESEARCH_AT, HistoricalProvider, seed_history, history
from research_trail.verify_outcomes import verify
from research_trail.app import create_app
from test_settings import TOKEN, HEADERS, Vault

@pytest.fixture
def own(tmp_path):
    clock=[AS_OF]; db=Database(tmp_path/'observations.sqlite3');db.migrate()
    provider=HistoricalProvider(lambda:clock[0]);service=OutcomeService(db,provider,None,clock=lambda:clock[0])
    ids=seed_history(service,1)
    yield service,provider,clock,ids[0]
    service.close();db.close()

def request(): return OutcomeRequest(request_id=str(uuid4()))
def query(**kwargs): return PerformanceQuery(horizon='1w',source_mode='simulated',analysis_mode='fixed',origin='authored-history',**kwargs)
def fields_empty(result):
    assert result.return_percent is None and result.direction_correct is None
    assert result.exit_price is None and result.maximum_drawdown is None

def test_not_due_does_not_read_and_idempotent_request_stays_pending(own):
    s,p,clock,identity=own; clock[0]=RESEARCH_AT+timedelta(days=1);body=request()
    first=s.evaluate(identity,body);assert first.status=='pending' and first.code=='WINDOW_NOT_DUE';fields_empty(first)
    clock[0]=AS_OF;assert s.evaluate(identity,body)==first;assert not p.calls
    assert s.evaluate(identity,request()).status=='evaluated' and len(p.calls)==1

@pytest.mark.parametrize('code',['ENTRY_MISSING','ENTRY_STALE','FUTURE_ENTRY_DATA'])
def test_invalid_entry_never_backfills_from_later_history(own,code):
    s,p,_,identity=own
    with s.database.write() as db:
        row=db.get(OutcomeOpinionRecord,identity);row.payload=dict(row.payload,entry_price=None,entry_code=code)
    result=s.evaluate(identity,request());assert result.status=='unable' and result.code==code
    fields_empty(result);assert not p.calls

@pytest.mark.parametrize('kind,code',[('empty','HISTORY_INCOMPLETE'),('gap','HISTORY_INCOMPLETE'),
    ('missing-last','HISTORY_INCOMPLETE'),('duplicate','DUPLICATE_MARKET_DATA'),('future','FUTURE_MARKET_DATA'),
    ('milliseconds','HISTORY_INVALID'),('invalid-price','HISTORY_INVALID'),('duplicate-day','DUPLICATE_MARKET_DAY')])
def test_unusable_history_has_no_score(own,kind,code):
    s,_,_,identity=own;o=s.get(identity).opinion;bars=history(o.symbol)
    if kind=='empty':bars=[]
    elif kind=='gap':bars.pop(2)
    elif kind=='missing-last':bars.pop()
    elif kind=='duplicate':bars.append(bars[-1])
    elif kind=='future':bars.append(dict(timestamp=int((AS_OF+timedelta(days=1)).timestamp()),close='999999'))
    elif kind=='milliseconds':bars[0]=dict(bars[0],timestamp=bars[0]['timestamp']*1000)
    elif kind=='invalid-price':bars[0]=dict(bars[0],close='NaN')
    elif kind=='duplicate-day':bars.append(dict(timestamp=bars[0]['timestamp']+3600,close='110'))
    result=calculate(o,bars,AS_OF);assert result['status']=='unable' and result['code']==code
    assert all(result[k] is None for k in ('return_percent','exit_price','direction_correct','maximum_drawdown'))

@pytest.mark.parametrize('stance,exit_price,expected',[
    ('bullish','100',False),('bullish','100.000000000001',True),('bearish','100',False),('bearish','99.999999999999',True),
    ('neutral','102',True),('neutral','102.000000000001',False),('neutral','98',True),('neutral','97.999999999999',False)])
def test_direction_thresholds_use_raw_decimal(own,stance,exit_price,expected):
    s,*_,identity=own;o=s.get(identity).opinion.model_copy(update={'stance':stance})
    bars=history(o.symbol);bars[-1]=dict(bars[-1],close=exit_price)
    result=calculate(o,bars,AS_OF);assert result['status']=='evaluated' and result['direction_correct'] is expected

def test_drawdown_and_cutoff_never_use_later_bar(own):
    s,*_,identity=own;o=s.get(identity).opinion;bars=history(o.symbol)
    for bar,close in zip(bars,['110','99','120','96','110']):bar['close']=close
    result=calculate(o,bars,AS_OF)
    assert result['return_percent']=='10.0' and Decimal(result['maximum_drawdown'])==20
    # Observed later than the committed window but already known at as_of;
    # it is preserved in the attempt yet cannot influence this calculation.
    bars.append(dict(timestamp=int((AS_OF-timedelta(days=1)).timestamp()),close='1000000'))
    assert calculate(o,bars,AS_OF)==result
    assert calculate(o,bars,o.due_at-timedelta(microseconds=1))['status']=='pending'

def test_fixed_samples_29_null_30_valid_and_separate_strata(own):
    s,p,_,_=own;ids=seed_history(s,30)
    for identity in ids[:29]:s.evaluate(identity,request())
    before=s.performance(query())
    assert all(r.samples==29 and r.insufficient_data and r.adaptive_weight is None and r.average_return is None for r in before.rows)
    assert s.performance(PerformanceQuery()).rows==[]
    assert s.performance(query().model_copy(update={'horizon':'1m'})).rows==[]
    assert s.performance(query().model_copy(update={'origin':'prospective'})).rows==[]
    s.evaluate(ids[-1],request());after=s.performance(query())
    assert all(r.samples==30 and r.adaptive_weight=='1.25' and r.direction_hit_rate=='1' for r in after.rows)
    assert s.snapshot(before.id)==before
    assert s.performance(query())==after
    assert len(p.calls)==30

def test_repeated_polling_concurrent_claim_and_restart_no_duplicate(own):
    s,p,_,identity=own;entered=threading.Event();release=threading.Event();real=p.query
    def gate(*args,**kwargs): entered.set();assert release.wait(5);return real(*args,**kwargs)
    p.query=gate;body=request()
    with ThreadPoolExecutor(max_workers=2) as pool:
        work=pool.submit(s.evaluate,identity,body);assert entered.wait(5)
        assert s.evaluate(identity,body).status=='running'
        assert s.evaluate(identity,request()).status=='running'
        for _ in range(4):assert s.get(identity).attempts[-1].status=='running'
        assert not p.calls;release.set();result=work.result()
    restarted=OutcomeService(s.database,p,None,clock=lambda:AS_OF)
    assert restarted.evaluate(identity,body)==result
    assert restarted.evaluate(identity,request())==result
    assert len(p.calls)==1 and len(restarted.get(identity).attempts)==1

def test_interrupted_claim_is_not_resent_and_late_result_cannot_overwrite(own):
    s,p,_,identity=own;entered=threading.Event();release=threading.Event();real=p.query
    def gate(*args,**kwargs):entered.set();assert release.wait(5);return real(*args,**kwargs)
    p.query=gate;body=request()
    with ThreadPoolExecutor() as pool:
        work=pool.submit(s.evaluate,identity,body);assert entered.wait(5)
        s.close();restarted=OutcomeService(s.database,p,None,clock=lambda:AS_OF)
        persisted=restarted.evaluate(identity,body);assert persisted.status=='interrupted';fields_empty(persisted)
        assert not p.calls;release.set();assert work.result()==persisted
    assert restarted.get(identity).attempts==[persisted]
    assert restarted.evaluate(identity,request()).status=='evaluated' and len(p.calls)==2

def test_actual_provider_failure_is_unable_not_fixture_fallback(own):
    from research_trail.provider_contracts import ProviderFailure
    s,p,_,identity=own
    p.query=lambda *a,**kw:ProviderFailure(provider='longbridge',capability='market.kline',state='failed',code='NETWORK_ERROR',message='failed')
    result=s.evaluate(identity,request());fields_empty(result);assert result.code=='HISTORY_NETWORK_ERROR'
    row=s.performance(query()).rows[0];assert row.unable==1 and row.samples==0 and row.adaptive_weight is None

def test_policy_append_rollback_idempotency_and_historical_asof(own):
    s,_,clock,_=own;initial=s.policies();clock[0]+=timedelta(seconds=1)
    body=WeightChange(request_id=str(uuid4()),expected_version=1,reason='提高门槛',parameters=WeightParameters(min_samples=50))
    changed=s.change(body);assert changed.version==2 and changed.parent_version==1
    assert s.change(body)==changed
    with pytest.raises(OutcomeError,match='CONFLICT'):s.change(body.model_copy(update={'reason':'不同输入'}))
    with pytest.raises(OutcomeError,match='VERSION_CONFLICT'):s.change(body.model_copy(update={'request_id':str(uuid4())}))
    assert s.performance(query(as_of=AS_OF)).policy_version==1
    assert s.performance(query()).policy_version==2
    clock[0]+=timedelta(seconds=1)
    rolled=s.change(WeightChange(request_id=str(uuid4()),expected_version=2,reason='回滚基线',rollback_version=1))
    assert rolled.version==3 and rolled.parameters==initial.versions[0].parameters and rolled.rollback_version==1
    assert s.policies().versions[:2]==[initial.versions[0],changed]

@pytest.mark.parametrize('params',[{'min_samples':29},{'min_samples':100,'full_confidence_samples':50},{'unable_penalty':'0.051'},{'sensitivity':'NaN'}])
def test_parameters_do_not_allow_insufficient_samples_or_unbounded_weight(params):
    with pytest.raises(ValueError):WeightParameters(**params)

def test_future_asof_and_future_evaluation_cannot_change_past_snapshot(own):
    s,_,clock,identity=own;before=s.performance(query())
    clock[0]+=timedelta(seconds=1);s.evaluate(identity,request())
    after=s.performance(query(as_of=AS_OF))
    assert after.rows[0].samples==0 and after.input_hash==before.input_hash
    with pytest.raises(OutcomeError,match='FUTURE_AS_OF'):s.performance(query(as_of=clock[0]+timedelta(seconds=1)))

def test_source_snapshot_and_price_never_mutate_when_evaluated(own):
    s,_,_,identity=own;o=s.get(identity).opinion
    result=s.evaluate(identity,request());assert s.get(identity).opinion==o
    assert result.data_hash and len(result.bars)==5 and result.provenance.transport=='fixture'
    assert result.query['start']=='2024-01-02' and result.query['end']=='2024-01-09'
    assert result.engine_version=='research-trail-outcome-v1' and o.confidence is None
    snapshot=s.performance(query());assert snapshot.opinion_ids==[o.id] and snapshot.attempt_ids==[result.id]
    assert s.capture(OutcomeCapture(report_id=o.report_id,horizon='1w'))==o
    extra=s.capture(OutcomeCapture(report_id=o.report_id,horizon='1m'));assert extra.origin=='retrospective'

@pytest.mark.parametrize('values',[{'status':'unable','return_percent':'2'},
    {'status':'evaluated','exit_price':None},{'status':'evaluated','maximum_drawdown':'NaN'},
    {'status':'evaluated','evaluated_at':None}])
def test_invalid_saved_evaluation_shape_cannot_be_presented_as_valid(own,values):
    from research_trail.outcome_contracts import OutcomeAttempt
    s,_,_,identity=own;result=s.evaluate(identity,request())
    with pytest.raises(ValueError):OutcomeAttempt.model_validate(dict(result.model_dump(mode='json'),**values))

def test_iso_sdk_bars_are_normalized_but_exact_returned_source_is_saved(own):
    from datetime import datetime, timezone
    s,p,_,identity=own;real=p.query
    def sdk(*args,**kwargs):
        result=real(*args,**kwargs)
        raw=[dict(bar,timestamp=datetime.fromtimestamp(bar['timestamp'],timezone.utc).isoformat(),volume=20) for bar in result.data]
        return result.model_copy(update={'data':raw})
    p.query=sdk;result=s.evaluate(identity,request())
    assert result.status=='evaluated' and result.source_data[0]['volume']==20
    assert isinstance(result.source_data[0]['timestamp'],str) and isinstance(result.bars[0].timestamp,int)
    from research_trail.report_facts import result_hash
    assert result.data_hash==result_hash(result.source_data)
    assert result.bars_hash==result_hash([b.model_dump(mode='json') for b in result.bars])

def test_incompatible_engine_version_cannot_produce_false_statistics(own):
    s,_,_,identity=own;result=s.evaluate(identity,request())
    with s.database.write() as db:
        row=db.get(OutcomeAttemptRecord,result.id);row.payload=dict(row.payload,engine_version='unsupported-v99')
    with pytest.raises(OutcomeError,match='VERSION_UNSUPPORTED'):s.performance(query())

def test_restart_recovers_abrupt_running_claim_without_provider_call(own):
    s,p,_,identity=own;from research_trail.outcome_contracts import OutcomeAttempt
    attempted=OutcomeAttempt(id=str(uuid4()),opinion_id=identity,request_id=str(uuid4()),started_at=AS_OF,
        evaluated_at=None,status='running',code=None)
    with s.database.write() as db:
        db.add(OutcomeAttemptRecord(id=attempted.id,opinion_id=identity,request_id=attempted.request_id,status='running',payload=attempted.model_dump(mode='json')))
    restarted=OutcomeService(s.database,p,None,clock=lambda:AS_OF)
    result=restarted.evaluate(identity,OutcomeRequest(request_id=attempted.request_id))
    assert result.status=='interrupted' and result.code=='BACKEND_INTERRUPTED';fields_empty(result);assert not p.calls

def test_failed_close_write_keeps_durable_claim_for_restart_without_reexecution(own,monkeypatch):
    from contextlib import contextmanager
    from research_trail.outcome_contracts import OutcomeAttempt
    s,p,_,identity=own
    attempted=OutcomeAttempt(id=str(uuid4()),opinion_id=identity,request_id=str(uuid4()),started_at=AS_OF,
        evaluated_at=None,status='running',code=None)
    with s.database.write() as db:
        db.add(OutcomeAttemptRecord(id=attempted.id,opinion_id=identity,request_id=attempted.request_id,status='running',payload=attempted.model_dump(mode='json')))
    @contextmanager
    def failure():raise RuntimeError('test-only-storage-unavailable');yield
    with monkeypatch.context() as patch:
        patch.setattr(s.database,'write',failure);s.close();assert s.closed and s.stop.is_set()
    restarted=OutcomeService(s.database,p,None,clock=lambda:AS_OF)
    assert restarted.evaluate(identity,OutcomeRequest(request_id=attempted.request_id)).status=='interrupted'
    assert not p.calls

def test_provider_fetch_after_evaluation_clock_has_no_evaluation(own):
    s,p,_,identity=own;real=p.query
    def future(*args,**kwargs):
        result=real(*args,**kwargs)
        return result.model_copy(update={'provenance':result.provenance.model_copy(update={'fetched_at':AS_OF+timedelta(days=1)})})
    p.query=future;result=s.evaluate(identity,request())
    assert result.status=='unable' and result.code=='FUTURE_FETCH_TIME';fields_empty(result)

def test_capture_future_quote_does_not_become_entry_and_source_remains_frozen(own):
    from research_trail.models import ResearchStepRecord,ReportRecord
    from research_trail.report_facts import result_hash
    s,_,_,identity=own;old=s.get(identity).opinion
    with s.database.write() as db:
        quote=db.get(ResearchStepRecord,(old.run_id,'market.quote'));raw=dict(quote.result)
        raw['data']=dict(raw['data'],market_time=(RESEARCH_AT+timedelta(days=1)).isoformat());quote.result=raw
        report=db.get(ReportRecord,old.report_id);doc=dict(report.document)
        doc['evidence']=[dict(f,result_hash=result_hash(raw)) for f in doc['evidence']];report.document=doc
        captured=s.freeze(db,report,'1m','retrospective')
    assert captured.entry_code=='FUTURE_ENTRY_DATA' and captured.entry_price is None
    assert s.get(identity).opinion==old

@pytest.mark.parametrize('horizon,days',[('1w',7),('1m',30),('3m',90)])
def test_committed_windows_are_calendar_days_and_closed_daily_data(horizon,days):
    end,due=window(RESEARCH_AT,horizon)
    assert end==RESEARCH_AT+timedelta(days=days) and due>end and due.hour==0

def test_calibration_penalty_and_hard_weight_bounds(own):
    s,_,_,identity=own;result=s.evaluate(identity,request());o=s.get(identity).opinion
    correct=result.model_copy(update={'return_percent':'10','direction_correct':True})
    wrong=result.model_copy(update={'return_percent':'-10','direction_correct':False})
    unable=result.model_copy(update={'status':'unable','return_percent':None,'direction_correct':None})
    group=[(o,correct)]*18+[(o,wrong)]*12+[(o,unable)]*10
    stats=aggregate(group,WeightParameters());assert stats['unable_rate']=='0.25' and stats['adaptive_weight']=='1.0375'
    assert stats['average_return']=='2' and stats['sample_confidence']=='0.3'
    assert aggregate([(o,correct)]*30,WeightParameters(sensitivity=1))['adaptive_weight']=='1.25'
    assert aggregate([(o,wrong)]*30,WeightParameters(sensitivity=1))['adaptive_weight']=='0.75'

def test_offline_two_database_reproducibility(tmp_path):
    assert verify(tmp_path/'a.sqlite3')==verify(tmp_path/'b.sqlite3')

def test_0017_upgrade_keeps_actual_evaluation_and_session_records(tmp_path):
    from research_trail.store import Store
    db=Database(tmp_path/'old.sqlite3');cfg=Config(str(Path(__file__).parents[1]/'alembic.ini'))
    try:
        with db.engine.connect() as con:db.migration_transaction(con,lambda:command.upgrade(cfg,'0017_evaluation'),cfg)
        session=Store(db).create_session('保留Step22会话');identity=str(uuid4())
        with db.engine.begin() as con:
            con.execute(text("INSERT INTO evaluation_experiments VALUES (:id,:rid,'hash','2024-01-01','not_run','{}')"),{'id':identity,'rid':str(uuid4())})
            before=con.execute(text('SELECT * FROM evaluation_experiments')).all()
        db.migrate();db.migrate()
        assert Store(db).sessions()[0].id==session.id
        with db.engine.connect() as con:
            assert con.execute(text('SELECT * FROM evaluation_experiments')).all()==before
            assert con.scalar(text('SELECT version_num FROM alembic_version'))=='0020_research_quality'
            assert not con.exec_driver_sql('PRAGMA foreign_key_check').all()
    finally:db.close()

def test_completed_report_atomically_freezes_default_window_and_api_is_guarded(tmp_path):
    from test_reports import collected,report,finished
    app=create_app(TOKEN,database_path=tmp_path/'api.sqlite3',credential_vault=Vault())
    with TestClient(app,headers=HEADERS) as c:
        run=collected(c);rid=report(c,run);job=finished(c,rid);assert job['status']=='completed'
        opinions=c.get('/outcomes/opinions').json();assert len(opinions)==1
        o=opinions[0];assert o['report_id']==rid and o['origin']=='prospective' and o['horizon']=='1m'
        assert instant(o['research_at'])==instant(job['completed_at']) and o['entry_code']=='ENTRY_STALE' and o['entry_price'] is None
        assert c.post('/outcomes/opinions',json={'report_id':rid,'horizon':'1m'}).json()==o
        response=c.post('/outcomes/opinions/'+o['id']+'/evaluate',json=request().model_dump())
        assert response.status_code==200 and response.json()['status']=='pending' and response.json()['return_percent'] is None
        assert c.post('/outcomes/performance',json={}).json()['rows']==[]
        assert c.get('/outcomes/opinions',headers={'x-researchtrail-token':'wrong'}).status_code==401
        assert c.post('/outcomes/performance',json={'as_of':'2099-01-01T00:00:00Z'}).status_code==409
        assert c.post('/outcomes/policies',json={'request_id':str(uuid4()),'expected_version':1,'reason':'bad','parameters':{'min_samples':1}}).status_code==422
    with TestClient(create_app(TOKEN,database_path=tmp_path/'api.sqlite3',credential_vault=Vault()),headers=HEADERS) as c:
        assert c.get('/outcomes/opinions').json()==opinions
        assert len(c.get('/outcomes/opinions/'+o['id']).json()['attempts'])==1
