"""Step20: source times, DST/cross-day bounds, immutable evidence and research handoff."""
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from research_trail.app import create_app
from research_trail.calendar_fixtures import REFERENCE_TIME
from research_trail.provider_service import authored_data
from research_trail.provider_errors import ProviderFault
from research_trail.calendar_normalize import instant
from test_settings import TOKEN, HEADERS, Vault

@pytest.fixture
def api(tmp_path):
    @contextmanager
    def open(executor=None,path=None):
        model=Mock(); model.label='unused-model'
        app=create_app(TOKEN,database_path=path or tmp_path/'events.sqlite3',credential_vault=Vault(),model_provider=model,
            provider_options={'simulated_executor':executor or authored_data})
        with TestClient(app,headers=HEADERS) as client:
            yield client,app
            assert model.mock_calls==[]
    return open

def refresh(client,**kwargs):
    body={'request_id':str(uuid4()),**kwargs}
    response=client.post('/calendar/snapshots',json=body)
    assert response.status_code==200,response.text
    return response.json(),body

def event(page,source_id): return next(e for e in page['events'] if e['source_event_id']==source_id)

def test_fixed_sources_deduplicate_cross_day_and_separate_fetch_time(api):
    with api() as (c,app):
        page,body=refresh(c)
        assert page['status']=='completed' and len(page['events'])==6 and page['duplicate_count']==2
        assert datetime.fromisoformat(page['reference_time'])==REFERENCE_TIME
        a=event(page,'authored-aapl-earnings')
        assert a['display_time']=='2024-01-17T06:00:00+08:00 [Asia/Shanghai]'
        assert a['scheduled_at']=='2024-01-16T22:00:00Z' and a['occurrence_status']=='announced' and a['time_relation']=='upcoming'
        assert event(page,'authored-tsla-earnings')['time_relation']=='elapsed_unconfirmed'
        assert event(page,'authored-tsla-earnings')['occurrence_status']=='announced'
        assert event(page,'authored-macro-confirmed')['time_relation']=='occurred'
        assert event(page,'authored-hk-earnings')['precision']=='date'
        assert event(page,'authored-hk-earnings')['scheduled_at'] is None
        original=c.get(f"/calendar/snapshots/{page['id']}/reads/{a['read_id']}").json()
        assert original['result']['provenance']['fetched_at']!=a['scheduled_at']
        assert original['result']['data']['list'][0]['scheduled_at']=='2024-01-16T17:00:00-05:00'
        assert c.post('/calendar/snapshots',json=body).json()==page
        assert len(c.get('/calendar/snapshots').json())==1
        assert c.post('/calendar/snapshots',json={**body,'timezone':'UTC'}).status_code==409

def test_timezone_view_no_new_reads_cross_day_window_inclusive(api):
    calls=[]
    def executor(query): calls.append(query); return authored_data(query)
    with api(executor) as (c,_):
        page,_=refresh(c,start='2024-01-16',end='2024-01-16',timezone='UTC')
        assert event(page,'authored-aapl-earnings')['display_date']=='2024-01-16'
        view=c.post(f"/calendar/snapshots/{page['id']}/view",json={'timezone':'Asia/Shanghai'}).json()
        assert not any(e['source_event_id']=='authored-aapl-earnings' for e in view['events'])
        assert view['id']==page['id'] and len(calls)==2
        midnight={'id':'midnight','kind':'earnings','title':'midnight fixture','scheduled_at':'2024-01-16T16:00:00Z','status':'announced'}
    with api(lambda q:{'list':[midnight]}) as (c,_):
        page,_=refresh(c,kinds=['earnings'],timezone='Asia/Shanghai',start='2024-01-17',end='2024-01-17')
        assert page['events'][0]['display_date']=='2024-01-17'

@pytest.mark.parametrize('value,zone,expected',[
    ('2024-03-10T01:30:00','America/New_York','2024-03-10T06:30:00+00:00'),
    ('2024-03-10T03:30:00','America/New_York','2024-03-10T07:30:00+00:00'),
    ('2024-11-03T01:30:00-04:00','America/New_York','2024-11-03T05:30:00+00:00'),
    ('2024-11-03T01:30:00-05:00','America/New_York','2024-11-03T06:30:00+00:00'),
    ('2024-01-16T23:30:00+14:00',None,'2024-01-16T09:30:00+00:00'),
])
def test_timezone_instants(value,zone,expected): assert instant(value,zone).isoformat()==expected

@pytest.mark.parametrize('value,zone,code',[
    ('2024-03-10T02:30:00','America/New_York','EVENT_TIME_NONEXISTENT'),
    ('2024-11-03T01:30:00','America/New_York','EVENT_TIME_AMBIGUOUS'),
    ('2024-01-16T17:00:00',None,'EVENT_TIME_ZONE_MISSING'),
    ('2024-01-16T17:00:00+09:00','Asia/Shanghai','EVENT_TIME_ZONE_MISMATCH'),
])
def test_ambiguous_or_missing_timezone_not_guessed(value,zone,code):
    with pytest.raises(ValueError,match=code): instant(value,zone)

def test_missing_event_time_never_uses_envelope_date_or_fetch_time(api):
    def source(q): return {'date':'2024-01-16','list':[{'id':'missing-time','kind':'earnings','title':'untimed fixture'}]}
    with api(source) as (c,_):
        page,_=refresh(c,kinds=['earnings'])
        e=page['events'][0]
        assert e['scheduled_at'] is None and e['occurred_at'] is None and e['source_date'] is None
        assert e['precision']=='unknown' and e['time_relation']=='unknown'
        assert page['status']=='partial' and e['time_code']=='EVENT_TIME_MISSING'

def test_real_unavailable_and_massive_no_fixture_fallback(api):
    spy=Mock(side_effect=AssertionError('No unconfigured/unsupported read'))
    with api(spy) as (c,app):
        for body in ({'mode':'real'},{'provider':'massive'},{'mode':'real','kinds':['central-bank']}):
            page,_=refresh(c,**body); assert page['status']=='unavailable' and not page['events'] and not page['reads']
        assert not app.state.capabilities.state('calendar.central-bank','real').implemented
        assert not app.state.capabilities.state('calendar.central-bank','real').tool_exposed
        spy.assert_not_called()

def test_partial_and_all_failure_preserve_successes(api):
    def partial(q):
        if q.event_type=='macrodata': raise ProviderFault('NETWORK_ERROR')
        return authored_data(q)
    with api(partial) as (c,_):
        page,_=refresh(c); assert page['status']=='partial' and len(page['events'])==3
        assert [r['status'] for r in page['reads']]==['success','failed']
    def failed(q): raise ProviderFault('NETWORK_ERROR')
    with api(failed) as (c,_):
        page,_=refresh(c); assert page['status']=='failed' and not page['events']

@pytest.mark.parametrize('bad_source',['mismatch','exception'])
def test_provider_boundary_failure_is_saved_without_leaking_or_fake_events(api,bad_source):
    with api() as (c,app):
        if bad_source=='mismatch':
            from research_trail.provider_contracts import ReadQuery
            result=app.state.providers.query('longbridge',ReadQuery(capability='research.events'))
            result.provenance.mode='real'
            app.state.providers.query=Mock(return_value=result)
        else:
            app.state.providers.query=Mock(side_effect=RuntimeError('PRIVATE_PROVIDER_BODY'))
        page,_=refresh(c,kinds=['earnings'])
        assert page['status']=='failed' and not page['events']
        read=page['reads'][0]; assert read['code']=='INVALID_RESPONSE'
        raw=c.get(f"/calendar/snapshots/{page['id']}/reads/{read['id']}")
        assert raw.json()['result']['code']=='INVALID_RESPONSE' and 'PRIVATE_PROVIDER_BODY' not in raw.text

def test_no_source_id_distinct_actual_dates_do_not_collapse(api):
    first={'kind':'macro','title':'same indicator','occurred_at':'2024-01-15T12:00:00Z'}
    second={**first,'occurred_at':'2024-01-16T12:00:00Z'}
    with api(lambda q:{'list':[first,second,first]}) as (c,_):
        page,_=refresh(c,kinds=['macro'])
        assert page['status']=='completed' and len(page['events'])==2 and page['duplicate_count']==1
        assert len({e['id'] for e in page['events']})==2

def test_future_claim_of_occurrence_is_visible_conflict_and_not_researchable(api):
    row={'id':'future-occurred','kind':'earnings','title':'conflicting source',
        'occurred_at':'2024-01-18T12:00:00Z','related_symbols':['AAPL.US']}
    with api(lambda q:{'list':[row]}) as (c,_):
        page,_=refresh(c,kinds=['earnings']); e=page['events'][0]
        assert page['status']=='partial' and e['conflict'] and e['time_relation']=='unknown'
        assert page['issues'][0]['code']=='EVENT_OCCURRENCE_IN_FUTURE'
        assert c.post('/research/plan',json=dict(symbol='AAPL.US',event_ref=dict(snapshot_id=page['id'],event_id=e['id']))).status_code==409

def test_revised_event_identity_and_conflict_are_visible(api):
    row={'id':'same-event','kind':'earnings','title':'fixed event','symbol':'AAPL.US','scheduled_at':'2024-01-17T00:00:00Z','updated_at':'2024-01-15T00:00:00Z'}
    revised={**row,'scheduled_at':'2024-01-18T00:00:00Z','updated_at':'2024-01-16T00:00:00Z'}
    with api(lambda q:{'list':[row,revised]}) as (c,_):
        page,_=refresh(c,kinds=['earnings']); assert len(page['events'])==1 and page['duplicate_count']==1
        assert page['events'][0]['scheduled_at']=='2024-01-18T00:00:00Z' and not page['events'][0]['conflict']
    with api(lambda q:{'list':[row,{**revised,'updated_at':row['updated_at']}]}) as (c,_):
        page,_=refresh(c,kinds=['earnings']); e=page['events'][0]; assert e['conflict'] and page['status']=='partial'
        assert c.post('/research/plan',json=dict(symbol='AAPL.US',event_ref=dict(snapshot_id=page['id'],event_id=e['id']))).status_code==409

def test_context_validated_frozen_research_queries_and_report(api):
    with api() as (c,_):
        page,_=refresh(c); a=event(page,'authored-aapl-earnings'); macro=event(page,'authored-fomc')
        body=dict(symbol='AAPL.US',strategy='event-driven',event_ref=dict(snapshot_id=page['id'],event_id=a['id']))
        plan=c.post('/research/plan',json=body).json()
        assert plan['event_context']['event']['id']==a['id'] and plan['event_context']['association']=='source'
        zoned=c.post('/research/plan',json={**body,'event_ref':{**body['event_ref'],'timezone':'America/New_York'}}).json()
        assert zoned['event_context']['event']['display_time']=='2024-01-16T17:00:00-05:00 [America/New_York]'
        read=next(r for r in plan['reads'] if r['capability']=='research.events')
        assert read['query']['event_type']=='financial' and read['query']['start']=='2024-01-15'
        assert c.post('/research/plan',json={**body,'symbol':'TSLA.US'}).status_code==409
        assert c.post('/research/plan',json={**body,'mode':'real'}).status_code==409
        assert c.post('/research/plan',json={**body,'event_ref':{'snapshot_id':page['id'],'event_id':'0'*64}}).status_code==404
        body['event_ref']['event_id']=macro['id']; plan=c.post('/research/plan',json=body).json()
        assert plan['event_context']['association']=='user-selected'
        read=next(r for r in plan['reads'] if r['capability']=='research.events')
        assert read['query']['symbol'] is None and read['query']['event_type']=='macrodata'
        saved=c.post('/research/runs',json=body).json()
        from test_research import settled
        run=settled(c,saved['id'])
        assert run['plan']['event_context']==plan['event_context']
        packet=__import__('research_trail.report_facts',fromlist=['packet']).packet
        assert packet(c.app.state.research.store,run['id'])['event_context']==plan['event_context']

def test_restart_keeps_snapshot_without_fetch_and_tamper_detected(api,tmp_path):
    path=tmp_path/'restart.sqlite3'
    with api(path=path) as (c,_): page,_=refresh(c)
    spy=Mock(side_effect=AssertionError('History does not reexecute'))
    with api(spy,path) as (c,app):
        assert c.post(f"/calendar/snapshots/{page['id']}/view",json={'timezone':'Asia/Shanghai'}).json()==page
        spy.assert_not_called()
        with app.state.store.database.engine.begin() as db:
            assert db.scalar(text('SELECT version_num FROM alembic_version'))=='0015_calendar'
            db.execute(text("UPDATE calendar_snapshots SET checksum=:checksum"),{'checksum':'0'*64})
        assert c.post(f"/calendar/snapshots/{page['id']}/view",json={'timezone':'UTC'}).status_code==409

@pytest.mark.parametrize('extra',[
    {'timezone':'../../private'},{'timezone':'Not/AZone'},{'kinds':['macro','macro']},
    {'start':'2024-01-20','end':'2024-01-01'},{'start':'2024-01-01','end':'2025-01-01'},
    {'unexpected':True},
])
def test_input_bounds_and_no_path_escape(api,extra):
    with api() as (c,_): assert c.post('/calendar/snapshots',json={'request_id':str(uuid4()),**extra}).status_code==422

def test_startup_token_and_typed_evidence_ids(api):
    with api() as (c,_):
        assert c.post('/calendar/sources',json={},headers={'X-ResearchTrail-Token':'bad'}).status_code==401
        assert c.get('/calendar/snapshots/not-a-uuid/reads/not-a-uuid').status_code==422

@pytest.mark.parametrize('grouped',[False,True])
def test_event_limit_keeps_bounded_results_and_reports_truncation(api,grouped):
    records=[{'id':str(i),'kind':'macro','title':'bounded source event','scheduled_at':'2024-01-16T13:00:00Z'} for i in range(201)]
    source={'list':[{'infos':records}]} if grouped else {'list':records}
    with api(lambda q:source) as (c,_):
        page,_=refresh(c,kinds=['macro'])
        assert page['status']=='partial' and len(page['events'])==200
        assert page['issues'][0]['code']=='CALENDAR_ROW_LIMIT'
        assert page['issues'][0]['pointer']==('/list/0/infos/200' if grouped else '/list/200')
        original=c.get(f"/calendar/snapshots/{page['id']}/reads/{page['reads'][0]['id']}").json()
        assert original['result']['data']==source

def test_real_adapter_query_limit_fits_two_reads_inside_desktop_timeout(api):
    from test_providers import save,authorize
    from research_trail.provider_contracts import ReadQuery
    observed=[]
    def adapter(snapshot,query,stop):
        observed.append(snapshot.configuration.timeout_seconds)
        return authored_data(query)
    with api() as (c,app):
        save(c,timeout_seconds=60); authorize(c)
        app.state.providers.sdk_executor=adapter; app.state.providers.cli_executor=adapter
        verified=app.state.providers.query('longbridge',ReadQuery(capability='research.events',mode='real'))
        assert verified.ok and observed==[60]
        observed.clear()
        page,_=refresh(c,mode='real',kinds=['earnings','macro'])
        assert len(page['reads'])==2 and all(r['status']=='success' for r in page['reads'])
        assert observed==[20,20]
        assert app.state.provider_settings.profile('longbridge').timeout_seconds==60
