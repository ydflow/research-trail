"""Fixed clock, durable source/cooldown/claims; no paid model or real provider."""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import time
from uuid import uuid4
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from research_trail.app import create_app
from research_trail.models import MonitoringRunRecord, MonitoringResearchRecord
from research_trail.provider_service import authored_data
from research_trail.monitoring_contracts import RuleInput
from research_trail.monitoring_schedule import next_due
from test_settings import TOKEN, HEADERS, Vault

class Clock:
    def __init__(self): self.value=datetime(2024,1,16,13,0,tzinfo=timezone.utc)
    def __call__(self): return self.value
    def advance(self,minutes=1): self.value+=timedelta(minutes=minutes)

@pytest.fixture
def api(tmp_path):
    clock=Clock(); calls=[]; changed={'price':200,'closed':False,'rating':'Buy','news':[]}
    def executor(q):
        calls.append(q)
        if q.capability=='market.status': return {'market_time':[{'market':q.market,'status':'Closed' if changed['closed'] else 'Open'}]}
        if q.capability=='market.quote':
            raw=authored_data(q); return {**raw,'last_price':changed['price'],'prev_close':100}
        if q.capability=='company.ratings': return {'latest':{'rating':changed['rating']}}
        if q.capability=='research.news': return deepcopy(changed['news'])
        return authored_data(q)
    @contextmanager
    def open(path=None,start=False,interval=60):
        model=Mock();model.label='unused-model'
        app=create_app(TOKEN,database_path=path or tmp_path/'monitor.sqlite3',credential_vault=Vault(),model_provider=model,
            provider_options={'simulated_executor':executor},calendar_options={'clock':clock},
            monitoring_options={'clock':clock,'start':start,'interval_seconds':interval})
        with TestClient(app,headers=HEADERS) as c:
            yield c,app,clock,changed,calls
            assert model.mock_calls==[]
    return open

def rule(c,kind='price_above',**kwargs):
    body=dict(request_id=str(uuid4()),name='fixed clock rule',kind=kind,enabled=True)
    if kind in ('price_above','price_below','new_news','earnings','rating_change','dividend','position_weight'): body['symbol']='AAPL.US'
    if kind in ('price_above','price_below'): body['threshold']='190'
    response=c.post('/monitoring/rules',json={**body,**kwargs})
    assert response.status_code==200,response.text
    return response.json()

def tick(app): return [r.model_dump(mode='json') for r in app.state.monitoring.tick()]

def test_strict_threshold_no_trigger_cooldown_dedup_and_new_source(api):
    with api() as (c,app,clock,state,calls):
        r=rule(c); state['price']=190
        assert tick(app)[0]['status']=='quiet'
        clock.advance(); state['price']=191
        triggered=tick(app)[0]; assert triggered['status']=='triggered'
        assert triggered['payload']['price']=='191' and triggered['payload']['model_requests']==0
        count=len(calls); clock.advance(); assert len(tick(app))==2 and len(calls)==count
        clock.advance(60); assert tick(app)[0]['code']=='DUPLICATE_EVIDENCE'
        clock.advance(); state['price']=192
        assert tick(app)[0]['status']=='triggered'
        assert len(c.get('/monitoring/notifications').json())==2

def test_same_minute_concurrent_poll_and_restart_keeps_claims(api):
    with api() as (c,app,clock,state,calls):
        rule(c,cooldown_minutes=0)
        with ThreadPoolExecutor(4) as pool: list(pool.map(lambda _:app.state.monitoring.tick(),range(4)))
        assert len(app.state.monitoring.history())==1 and len(calls)==2
        original=c.get('/monitoring/runs').json()[0]
        claimed=c.post('/monitoring/notifications/'+original['id']+'/claim').json()
        assert claimed['notification_status']=='claimed' and not claimed['notified']
        assert c.post('/monitoring/notifications/'+original['id']+'/claim').json() is None
    with api() as (c,app,clock,state,calls):
        assert len(tick(app))==1
        assert c.get('/monitoring/runs').json()[0]['notification_status']=='uncertain'
        clock.advance(); assert tick(app)[0]['code']=='DUPLICATE_EVIDENCE'
        assert c.get('/monitoring/notifications').json()==[]

@pytest.mark.parametrize('status',['shown','failed','unsupported'])
def test_delivery_receipt_idempotent_notified_means_native_show(api,status):
    with api() as (c,app,*_):
        rule(c); run=tick(app)[0]; base='/monitoring/notifications/'+run['id']
        assert c.post(base+'/result',json={'status':'shown'}).json()['notification_status']=='pending'
        c.post(base+'/claim')
        got=c.post(base+'/result',json={'status':status}).json()
        assert got['notification_status']==status and got['notified']==(status=='shown')
        assert c.post(base+'/result',json={'status':'shown'}).json()==got
        assert c.post(base+'/claim').json() is None

def test_disabled_rule_and_disabled_after_claim_no_notification(api):
    with api() as (c,app,clock,state,calls):
        r=rule(c,enabled=False); assert tick(app)==[] and calls==[]
        c.put('/monitoring/rules/'+r['id']+'/enabled',json={'enabled':True}); run=tick(app)[0]
        c.put('/monitoring/rules/'+r['id']+'/enabled',json={'enabled':False})
        assert c.post('/monitoring/notifications/'+run['id']+'/claim').json() is None
        assert c.get('/monitoring/runs').json()[0]['notification_status']=='suppressed'

def test_market_closed_and_unknown_symbol_failure_are_honest(api):
    with api() as (c,app,clock,state,calls):
        rule(c); state['closed']=True
        assert tick(app)[0]['status']=='quiet' and len(calls)==1
        clock.advance(); state['closed']=False
        rule(c,symbol='BAD.US'); results=tick(app)
        assert any(r['status']=='failed' and r['code']=='NO_DATA' for r in results)
        assert any(r['status']=='triggered' for r in results)

def test_real_unavailable_no_simulated_fallback_or_model(api):
    with api() as (c,app,clock,state,calls):
        rule(c,mode='real'); got=tick(app)[0]
        assert got['status']=='failed' and got['code']=='UNCONFIGURED' and calls==[]
        assert got['payload']['reads']==[] and got['payload']['model_requests']==0

def test_daily_schedule_before_due_once_restart_and_missed_closed(api):
    with api() as (c,app,clock,state,calls):
        rule(c,'watchlist-daily-review',hour=21,minute=1,notify='all')
        assert tick(app)==[]
        clock.advance(); run=tick(app)[0]
        assert run['status']=='triggered' and len(run['payload']['scope'])==4
        count=len(calls); clock.advance(); assert len(tick(app))==1 and len(calls)==count
    with api() as (c,app,clock,state,calls):
        assert len(tick(app))==1 and c.get('/monitoring/notifications').json()==[]
        clock.advance(24*60)
    with api() as (c,app,clock,state,calls):
        records=c.get('/monitoring/runs').json(); assert records[0]['status']=='skipped'
        assert records[0]['code']=='APPLICATION_CLOSED'
        before=len(calls); tick(app); assert len(calls)==before
        assert len(c.get('/monitoring/runs').json())==2

def test_rating_baseline_then_change_then_restart_duplicate(api):
    with api() as (c,app,clock,state,calls):
        rule(c,'rating_change',cooldown_minutes=0)
        assert tick(app)[0]['status']=='quiet'
        state['rating']='Hold';clock.advance()
        assert tick(app)[0]['status']=='triggered'
    with api() as (c,app,clock,state,calls):
        clock.advance(); assert tick(app)[0]['status']=='quiet'

def test_news_cursor_ignores_future_and_deduplicates_source(api):
    with api() as (c,app,clock,state,calls):
        rule(c,'new_news',cooldown_minutes=0); tick(app)
        clock.advance(); state['news']=[{'id':'new','published_at':clock().isoformat(),'title':'fixed news'},
            {'id':'future','published_at':(clock()+timedelta(days=1)).isoformat(),'title':'future'}]
        assert len(tick(app)[0]['payload']['items'])==1
        clock.advance(); assert tick(app)[0]['status']=='quiet'

def test_earnings_saved_events_dedup_future_not_occurrence(api):
    with api() as (c,app,clock,state,calls):
        snapshot=c.post('/calendar/snapshots',json={'request_id':str(uuid4())}).json()
        rule(c,'earnings',cooldown_minutes=0)
        first=tick(app)[0]; assert first['status']=='triggered'
        assert first['payload']['snapshot_id']==snapshot['id']
        assert len(first['payload']['events'])==1
        rule(c,'post-earnings-research',symbol='AAPL.US',cooldown_minutes=0)
        clock.advance(); results=tick(app)
        assert sum(r['status']=='triggered' for r in results)==1
        assert all(r['payload']['model_requests']==0 for r in results)

def test_research_from_trigger_once_concurrent_and_restart(api):
    with api() as (c,app,clock,state,calls):
        c.post('/calendar/snapshots',json={'request_id':str(uuid4())})
        rule(c,'pre-earnings-research',symbol='AAPL.US')
        run=tick(app)[0]; endpoint='/monitoring/runs/'+run['id']+'/research'
        with ThreadPoolExecutor(2) as pool:
            responses=list(pool.map(lambda _:c.post(endpoint,json={'symbol':'AAPL.US'}).json(),range(2)))
        assert responses[0]==responses[1] and responses[0]['status']=='dispatched'
        assert len(c.get('/research/runs').json())==1
        assert c.post(endpoint,json={'symbol':'TSLA.US'}).status_code==409
    with api() as (c,app,clock,state,calls):
        assert c.post(endpoint,json={'symbol':'AAPL.US'}).json()==responses[0]
        assert len(c.get('/research/runs').json())==1

def test_restart_uncertain_work_never_replays(api):
    with api() as (c,app,clock,state,calls):
        r=rule(c)
        with app.state.store.database.write() as db:
            db.add(MonitoringRunRecord(id=str(uuid4()),rule_id=r['id'],occurrence='tick:'+clock().isoformat(),
                started_at=clock().isoformat(),status='running',payload={},notified=False,notification_status='none'))
    with api() as (c,app,clock,state,calls):
        assert c.get('/monitoring/runs').json()[0]['status']=='interrupted'
        assert len(tick(app))==1

def test_today_sources_do_not_read_provider_duplicate_events_or_create_tasks(api):
    with api() as (c,app,clock,state,calls):
        clock.value=datetime(2024,1,16,23,0,tzinfo=timezone.utc)
        for _ in range(2): c.post('/calendar/snapshots',json={'request_id':str(uuid4())})
        before=len(calls)
        a=c.post('/today',json={}).json(); b=c.post('/today',json={}).json()
        assert a==b and len(calls)==before
        assert {'calendar','portfolio','watchlist'}<=set(i['source'] for i in a['items'])
        events=[i for i in a['items'] if i['source']=='calendar']
        assert len(events)==2 and len({i['source_id'].split(':',1)[1] for i in events})==2
        assert all('模拟' in i['reason'] for i in events)
        assert c.get('/research/runs').json()==[] and a['application_only']
        assert c.post('/today',json={'timezone':'../../private'}).status_code==422

@pytest.mark.parametrize('kwargs',[{'threshold':'NaN'},{'threshold':'-1'},{'days':[1,1]},
    {'days':[0]},{'hour':24},{'cooldown_minutes':-1},{'timezone':'../../private'},
    {'symbol':None},{'kind':'position_weight','threshold':'1.1'},{'unknown':True},
    {'auto_research':'true'},{'auto_research':True}])
def test_invalid_rule_boundary(api,kwargs):
    with api() as (c,*_):
        response=c.post('/monitoring/rules',json={
                'request_id':str(uuid4()),'name':'rule','kind':'price_above','symbol':'AAPL.US','threshold':'1',**kwargs})
        assert response.status_code==422

def test_uuid_idempotency_toggle_preserves_cooldown_and_migration(api):
    with api() as (c,app,clock,state,calls):
        r=rule(c); assert c.post('/monitoring/rules',json=r['input']).json()==r
        assert c.post('/monitoring/rules',json={**r['input'],'name':'different'}).status_code==409
        tick(app);clock.advance();before=len(calls)
        for enabled in (False,True): c.put('/monitoring/rules/'+r['id']+'/enabled',json={'enabled':enabled})
        tick(app);assert len(calls)==before
        app.state.store.database.migrate()
        with app.state.store.database.sessions() as db:
            assert db.scalar(text('SELECT version_num FROM alembic_version'))=='0017_evaluation'

@pytest.mark.parametrize('stamp,hour,expected',[
    ('2024-03-10T05:00:00+00:00',2,'2024-03-11T06:30:00+00:00'),
    ('2024-11-03T04:00:00+00:00',1,'2024-11-03T05:30:00+00:00')])
def test_dst_nonexistent_skipped_and_repeated_hour_once(stamp,hour,expected):
    r=RuleInput(request_id=uuid4(),name='DST',kind='watchlist-daily-review',hour=hour,minute=30,
        timezone='America/New_York',days=[1,2,3,4,5,6,7])
    assert next_due(r,datetime.fromisoformat(stamp)).isoformat()==expected
    assert next_due(r,datetime.fromisoformat(expected)).date()>datetime.fromisoformat(expected).date()

def test_loop_starts_stops_and_serializes_fixed_clock(api):
    with api(start=True,interval=0.05) as (c,app,clock,state,calls):
        rule(c)
        deadline=time.monotonic()+2
        while not c.get('/monitoring/runs').json() and time.monotonic()<deadline: time.sleep(.02)
        assert len(c.get('/monitoring/runs').json())==1
        thread=app.state.monitoring.thread
    assert not thread.is_alive()

def test_price_below_and_portfolio_weight_decimal_boundary(api):
    with api() as (c,app,clock,state,calls):
        rule(c,'price_below',threshold='200');assert tick(app)[0]['status']=='quiet'
        state['price']=199;clock.advance();assert tick(app)[0]['status']=='triggered'
        pid=next(p['id'] for p in c.get('/portfolios').json() if p['kind']=='simulated')
        rule(c,'position_weight',portfolio_id=pid,threshold='1',cooldown_minutes=0)
        clock.advance();assert tick(app)[0]['status']=='quiet'
        r=rule(c,'position_weight',portfolio_id=pid,threshold='0.999999',cooldown_minutes=0)
        clock.advance();got=next(x for x in tick(app) if x['rule_id']==r['id'])
        assert got['status']=='triggered' and got['payload']['metrics']=={'USD':'1'}

def test_drawdown_and_portfolio_daily_brief_reuse_local_revision(api):
    with api() as (c,app,clock,state,calls):
        pid=next(p['id'] for p in c.get('/portfolios').json() if p['kind']=='simulated')
        r=rule(c,'portfolio_drawdown',portfolio_id=pid,threshold='0.1',cooldown_minutes=0)
        assert tick(app)[0]['status']=='quiet'
        csv='record_type,symbol,currency,quantity,cost_price,market_price,amount\nholding,AAPL.US,USD,2,100,100,\ncash,,USD,,,,100\n'
        saved=c.post('/portfolios/preview',json={'portfolio_id':pid,'csv_text':csv}).json()
        assert saved['can_import']
        assert c.post('/portfolios/confirm',json={'portfolio_id':pid,'draft_id':saved['draft_id']}).status_code==200
        clock.advance();got=next(x for x in tick(app) if x['rule_id']==r['id'])
        assert got['status']=='triggered'
        assert got['payload']['metrics']['USD'].startswith('0.117647')
        r=rule(c,'portfolio-daily-brief',portfolio_id=pid,hour=21,minute=2)
        clock.advance();got=next(x for x in tick(app) if x['rule_id']==r['id'])
        assert got['status']=='triggered' and got['payload']['currencies'][0]['assets']=='300'
        partial=c.post('/portfolios/preview',json={'portfolio_id':pid,'csv_text':csv.replace('cash,,USD,,,,100\n','')}).json()
        c.post('/portfolios/confirm',json={'portfolio_id':pid,'draft_id':partial['draft_id']})
        clock.advance();assert any(x['code']=='PORTFOLIO_INCOMPLETE' for x in tick(app))

def test_dividend_event_cursor_once_and_weekly_empty_thesis_quiet(api):
    with api() as (c,app,clock,state,calls):
        clock.value=datetime(2024,1,15,15,0,tzinfo=timezone.utc)
        r=rule(c,'dividend',cooldown_minutes=0); assert tick(app)[0]['status']=='triggered'
        clock.advance();assert tick(app)[0]['status']=='quiet'
        r=rule(c,'weekly-thesis-review');clock.value=datetime(2024,1,21,1,0,tzinfo=timezone.utc)
        got=next(x for x in tick(app) if x['rule_id']==r['id']);assert got['status']=='quiet'
        assert got['payload']['thesis_ids']==[]

def test_automation_partial_retains_exact_missing_source_and_no_tasks(api):
    with api() as (c,app,clock,state,calls):
        c.post('/workspace/watchlist',json={'symbol':'BAD.US'})
        rule(c,'watchlist-daily-review',hour=21,minute=1)
        clock.advance();run=tick(app)[0]
        assert run['status']=='failed' and run['code']=='AUTOMATION_PARTIAL'
        assert run['payload']['failures']==[{'symbol':'BAD.US','code':'NO_DATA'}]
        assert len(run['payload']['reads'])==4 and c.get('/research/runs').json()==[]

def test_today_includes_actual_research_report_and_unreviewed_thesis(api):
    from test_reports import collected, report, finished
    with api() as (c,app,clock,state,calls):
        run=collected(c,strategy='value'); job=finished(c,report(c,run))
        t=c.post('/theses',json={'report_id':job['id'],'request_id':str(uuid4())}).json()
        # Research/report creation uses the existing wall clock; Today observes that date.
        clock.value=datetime.now(timezone.utc)
        before=len(calls);today=c.post('/today',json={}).json()
        by_source={i['source']:i for i in today['items']}
        assert by_source['research']['source_id']==run
        assert by_source['report']['source_id']==job['id']
        assert by_source['thesis']['source_id']==t['id'] and '人工复审' in by_source['thesis']['reason']
        assert len(calls)==before

def test_shutdown_cancels_blocked_read_and_does_not_create_trigger(api):
    import threading
    with api() as (c,app,clock,state,calls):
        rule(c);entered=threading.Event();release=threading.Event()
        original=app.state.providers.simulated_executor
        def blocked(q): entered.set();release.wait(3);return original(q)
        app.state.providers.simulated_executor=blocked
        worker=threading.Thread(target=app.state.monitoring.tick);worker.start();assert entered.wait(1)
        app.state.monitoring.stop.set();worker.join(1)
        assert not worker.is_alive()
        assert c.get('/monitoring/runs').json()[0]['status']=='interrupted'
        assert c.get('/monitoring/notifications').json()==[]
        release.set()
        for reader in list(app.state.monitoring.workers.values()): reader.join(1)

def test_full_calendar_batch_evidence_stays_deduplicated_after_restart(api):
    with api() as (c,app,clock,state,calls):
        snapshot=c.post('/calendar/snapshots',json={'request_id':str(uuid4())}).json()
        page=app.state.calendar.view(snapshot['id'],'Asia/Shanghai')
        event=next(e for e in page.events if 'AAPL.US' in e.related_symbols)
        page=page.model_copy(update={'events':[event.model_copy(update={'id':format(i,'064x')}) for i in range(200)]})
        app.state.monitoring.saved_events=lambda _:page
        rule(c,'earnings',cooldown_minutes=0)
        first=tick(app)[0];assert len(first['payload']['events'])==200
        clock.advance();assert tick(app)[0]['status']=='quiet'
    with api() as (c,app,clock,state,calls):
        app.state.monitoring.saved_events=lambda _:page
        clock.advance();assert tick(app)[0]['status']=='quiet'
        assert sum(r['status']=='triggered' for r in c.get('/monitoring/runs').json())==1

def test_daily_rule_cooldown_survives_restart_and_skips_source_reads(api):
    with api() as (c,app,clock,state,calls):
        rule(c,'watchlist-daily-review',hour=21,minute=1,notify='all',cooldown_minutes=2880)
        clock.advance();assert tick(app)[0]['status']=='triggered'
        count=len(calls);clock.advance(24*60)
        assert tick(app)[0]['status']=='quiet' and len(calls)==count
        assert '冷却' in tick(app)[0]['payload']['reason']
    with api() as (c,app,clock,state,calls):
        assert tick(app)[0]['status']=='quiet'
        clock.advance(24*60);assert tick(app)[0]['status']=='triggered'

def test_hong_kong_a_share_connect_uses_same_cn_market_mapping(api):
    with api() as (c,app,clock,state,calls):
        rule(c,symbol='600519.HAS');tick(app)
        assert calls[0].capability=='market.status' and calls[0].market=='CN'

@pytest.mark.parametrize('kind',['pre-earnings-research','post-earnings-research'])
def test_opt_in_automatic_collection_once_poll_restart_and_manual_replay(api,kind):
    with api() as (c,app,clock,state,calls):
        if kind=='post-earnings-research':
            original=app.state.providers.simulated_executor
            def occurred(q):
                data=original(q)
                if q.capability=='research.events':
                    for e in data['list']:
                        if e.get('symbol')=='AAPL.US':
                            e.update(status='occurred',timezone='UTC',occurred_at=(clock()-timedelta(minutes=1)).isoformat(),
                                scheduled_at=(clock()-timedelta(minutes=2)).isoformat())
                return data
            app.state.providers.simulated_executor=occurred
        c.post('/calendar/snapshots',json={'request_id':str(uuid4())})
        rule(c,kind,symbol='AAPL.US',auto_research=True,cooldown_minutes=0)
        run=tick(app)[0];assert run['status']=='triggered'
        actions=c.post('/today',json={}).json()['research_actions']
        assert len(actions)==1 and actions[0]['status']=='dispatched'
        endpoint='/monitoring/runs/'+run['id']+'/research'
        assert c.post(endpoint,json={'symbol':'AAPL.US'}).json()==actions[0]
        clock.advance();assert tick(app)[0]['status']=='quiet'
        assert len(c.get('/research/runs').json())==1
    with api() as (c,app,clock,state,calls):
        clock.advance();assert tick(app)[0]['status']=='quiet'
        assert c.post(endpoint,json={'symbol':'AAPL.US'}).json()==actions[0]
        assert len(c.get('/research/runs').json())==1
