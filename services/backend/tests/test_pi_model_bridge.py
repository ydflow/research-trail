"""Real pi + Python adapters, except explicitly named hostile transport stubs."""
import asyncio
from copy import deepcopy
import json
import threading
import time

import httpx
import pytest

from research_trail.model_provider import FakeModelProvider
from research_trail.openai_provider import OpenAIModelProvider, ModelConfiguration
from research_trail.pi_bridge import Pipe, worker_environment
from research_trail.pi_model_bridge import PiModelBridge
from research_trail.store import RunStopped
from research_trail.tools import market_tools
from test_pi_bridge import NODE, RecordingProvider


def tool(identity='quote_1', name='market_quote', arguments='{"symbol":"AAPL.US"}'):
    return dict(id=identity, type='function', function=dict(name=name, arguments=arguments))


def assistant(calls=None, content=None):
    return dict(role='assistant', content=content, tool_calls=calls or [])


class RecordingFake(FakeModelProvider):
    def __init__(self): self.plans, self.responses = [], []
    def plan(self, text):
        self.plans.append(text); return super().plan(text)
    def respond(self, data):
        self.responses.append(data); return super().respond(data)


class Dialog:
    """Injected adapter fixture, not an Agent loop or pi replacement."""
    label = 'deterministic Python dialog'
    def __init__(self, replies): self.replies, self.contexts = replies, []
    def complete(self, messages, tools, stop, deadline):
        self.contexts.append(deepcopy(messages))
        return deepcopy(self.replies[len(self.contexts)-1])


def bridge(model=None, **options):
    provider = RecordingProvider()
    b = PiModelBridge(market_tools(provider), model or RecordingFake(), node=NODE, **options)
    return b, provider


def run(b, **options):
    events = []
    outcome = b.run('查询AAPL.US行情', lambda k,p: events.append((k,p)), **options)
    assert b.process is None or b.process.poll() is not None
    assert not any(t.is_alive() and t.name == 'pi-pipe' for t in threading.enumerate())
    return outcome, events


@pytest.mark.parametrize('text,kind', [('查询AAPL.US行情','quote'), ('查询NVDA.US K线','kline')])
def test_real_pi_fake_rule_dialog_model_tool_model(text, kind):
    model = RecordingFake(); b, provider = bridge(model)
    outcome = b.run(text, lambda *_: None)
    assert outcome.status == 'completed', outcome
    assert len(model.plans) == len(model.responses) == 1
    assert model.responses[0].kind == kind and len(provider.calls) == 1
    assert '模拟数据' in outcome.answer
    assert b.model_calls == 2 and b.execution_count == 1
    assert b.proof['stats']['stream_calls'] == 2 and b.proof['stats']['results_seen'] == 1
    assert b.proof['ready']['agent'] == 'Agent'
    assert b.history[2]['tool_calls'][0]['id'] == b.history[3]['tool_call_id']
    assert b.process.poll() is not None
    with pytest.raises(ValueError): run(b)


def test_real_pi_openai_complete_mocktransport_and_credentials_stay_python(monkeypatch):
    bodies, frames, launches = [], [], []
    secret = 'offline-api-key-sentinel'
    def handler(request):
        assert request.headers['Authorization'] == 'Bearer '+secret
        body = json.loads(request.content); bodies.append(body)
        assert body['stream'] is False and body['tools'][0]['function']['strict'] is True
        message = assistant([tool(arguments='{ "symbol" : "AAPL.US" }')], '先查询模拟行情') if len(bodies) == 1 else assistant(content='AAPL.US 189.43 USD；fixture 模拟数据。')
        return httpx.Response(200, json=dict(choices=[dict(message=message,finish_reason='tool_calls' if len(bodies)==1 else 'stop')]))
    model = OpenAIModelProvider(ModelConfiguration('https://offline.invalid/v1','private-model-name',secret), transport=httpx.MockTransport(handler))
    original = Pipe.send
    def capture(self, kind, payload, request_id=None):
        frames.append(deepcopy(dict(type=kind,payload=payload)))
        return original(self,kind,payload,request_id)
    monkeypatch.setattr(Pipe, 'send', capture)
    import research_trail.pi_bridge as module
    popen = module.subprocess.Popen
    def launch(*args, **options):
        launches.append(dict(args=args,env=options['env'])); return popen(*args, **options)
    monkeypatch.setattr(module.subprocess, 'Popen', launch)
    for name in ('OPENAI_API_KEY','RESEARCH_TRAIL_DB_PATH','APPDATA','USERPROFILE','NODE_OPTIONS','RESEARCH_TRAIL_TOKEN'):
        monkeypatch.setenv(name, 'private-path-sentinel')
    b, provider = bridge(model)
    outcome, events = run(b)
    assert outcome.status == 'completed', outcome
    assert model.requests_started == b.model_calls == len(bodies) == 2
    assert provider.calls == ['AAPL.US'] and b.execution_count == 1
    context = bodies[1]['messages']
    assert [m['role'] for m in context] == ['system','user','assistant','tool']
    assert context[2]['content'] == '先查询模拟行情'
    assert context[2]['tool_calls'][0]['function']['arguments'] == '{ "symbol" : "AAPL.US" }'
    assert context[2]['tool_calls'][0]['id'] == context[3]['tool_call_id'] == 'quote_1'
    assert json.loads(context[3]['content'])['data']['quote']['last_price'] == 189.43
    wire = json.dumps([frames,launches,events,b.proof,outcome.answer], ensure_ascii=False)
    assert all(s not in wire for s in (secret,'Authorization','private-path-sentinel','private-model-name','https://offline.invalid'))
    assert 'private-path-sentinel' not in json.dumps(worker_environment())


@pytest.mark.parametrize('bad,code', [
    (tool('bad', arguments='{"symbol":"bad"}'),'INVALID_ARGUMENT'),
    (tool('bad', name='unregistered'),'UNKNOWN_TOOL'),
    (tool('quote_1'),'MODEL_RESPONSE_INVALID'),
    (tool('bad', arguments='{"symbol":"AAPL.US","symbol":"NVDA.US"}'),'INVALID_ARGUMENT'),
    (tool('bad', arguments='{"symbol":"'+ 'x'*4096+'"}'),'INVALID_ARGUMENT'),
])
def test_real_model_response_mixed_invalid_batch_zero_execution(bad, code):
    model = Dialog([assistant([tool(),bad])]); b, provider = bridge(model)
    outcome, events = run(b)
    assert outcome.error.code == code
    assert b.model_calls == 1 and b.execution_count == 0 and provider.calls == []
    assert b.observations['assistant_batches'] == 1 and b.observations['tool_execution_start'] == 0
    assert not any(k == 'tool_started' for k,p in events)


@pytest.mark.parametrize('budget,expected,code', [('tool',0,'TOOL_LIMIT'),('model',1,'MODEL_CALL_LIMIT'),('duplicate',1,'MODEL_RESPONSE_INVALID')])
def test_model_or_tool_budget_and_reused_ids_never_add_execution(budget, expected, code):
    first = [tool(),tool('two')] if budget == 'tool' else [tool()]
    model = Dialog([assistant(first),assistant([tool()])])
    b, provider = bridge(model, **({'max_calls':1} if budget=='tool' else {'max_model_calls':1} if budget=='model' else {}))
    outcome, _ = run(b)
    assert outcome.error.code == code, outcome
    assert len(provider.calls) == b.execution_count == expected
    assert len(model.contexts) == (2 if budget=='duplicate' else 1)


def test_real_model_batch_executes_original_registry_in_order_and_maps_all_results():
    model=Dialog([assistant([tool(),tool('two',arguments='{"symbol":"NVDA.US"}')]),assistant(content='fixture 模拟行情已查询。')])
    b,provider=bridge(model); outcome,_=run(b)
    assert outcome.status=='completed' and provider.calls==['AAPL.US','NVDA.US']
    assert b.execution_count==2 and b.model_calls==2
    assert [m['tool_call_id'] for m in model.contexts[1] if m['role']=='tool']==['quote_1','two']
    assert b.proof['stats']['results_seen']==2


def test_openai_error_after_executed_tool_preserves_result_without_retry():
    def handler(request):
        if model.requests_started==1:
            return httpx.Response(200,json={'choices':[dict(message=assistant([tool()]),finish_reason='tool_calls')]})
        return httpx.Response(401,json={'error':'private-sentinel'})
    model=OpenAIModelProvider(ModelConfiguration('https://offline.invalid','offline','offline-key'),transport=httpx.MockTransport(handler))
    b,provider=bridge(model); outcome,events=run(b)
    assert outcome.error.code=='MODEL_AUTH_FAILED' and b.model_calls==model.requests_started==2
    assert b.execution_count==1 and provider.calls==['AAPL.US']
    assert sum(k=='tool_result' for k,p in events)==1
    assert b.history[-1]['role']=='tool'


def test_read_only_tool_failure_does_not_request_another_model_or_retry():
    model=Dialog([assistant([tool(arguments='{"symbol":"GOOG.US"}')])])
    b,provider=bridge(model); outcome,_=run(b)
    assert outcome.error.code=='UNKNOWN_SYMBOL'
    assert b.model_calls==b.execution_count==1 and provider.calls==['GOOG.US']


@pytest.mark.parametrize('response', [None, {'role':'user','content':'bad'}, assistant(content=''), assistant(content='x'*4001),
    {'role':'assistant','content':'good','private_config':'sentinel'}, assistant([{'id':'one','type':'shell','function':{'name':'market_quote','arguments':'{}'}}]),
    assistant(content='x'*100000)])
def test_invalid_or_oversized_python_model_response_no_tools(response):
    model = Dialog([response]); b, provider = bridge(model)
    outcome, _ = run(b)
    assert outcome.error.code == 'MODEL_RESPONSE_INVALID'
    assert b.model_calls == 1 and not provider.calls


@pytest.mark.parametrize('failure,code,status', [(401,'MODEL_AUTH_FAILED','failed'),(429,'MODEL_RATE_LIMIT','failed'),
    (500,'MODEL_HTTP_ERROR','failed'),('timeout','MODEL_TIMEOUT','timed_out'),('network','MODEL_NETWORK_ERROR','failed'),('invalid','MODEL_RESPONSE_INVALID','failed')])
def test_existing_openai_error_classification_and_no_retries(failure, code, status):
    def handler(request):
        if failure == 'timeout': raise httpx.ReadTimeout('private-error-sentinel',request=request)
        if failure == 'network': raise httpx.ConnectError('private-error-sentinel',request=request)
        if failure == 'invalid': return httpx.Response(200,json={'choices':[]})
        return httpx.Response(failure,json={'error':'private-error-sentinel'})
    model = OpenAIModelProvider(ModelConfiguration('https://offline.invalid/v1','offline','offline-key'),transport=httpx.MockTransport(handler))
    b, provider = bridge(model); outcome, events = run(b)
    assert outcome.status == status and outcome.error.code == code, outcome
    assert model.requests_started == 1 and not provider.calls
    assert 'private-error-sentinel' not in json.dumps([events,outcome.answer])
    assert outcome.error.retryable == (failure in (429,500,'timeout','network'))


@pytest.mark.parametrize('action', ['cancel','deadline','model_timeout','crash'])
def test_real_pi_pending_model_late_response_is_discarded_and_worker_cleaned(action):
    entered, release, finished, stop = (threading.Event() for _ in range(4))
    model = Dialog([])
    def complete(*args):
        entered.set(); release.wait(6); finished.set()
        return assistant([tool()])
    model.complete = complete
    b, provider = bridge(model, model_timeout=2.0 if action=='deadline' else 1.0, response_timeout=3.0)
    outcomes, errors, events = [], [], []
    def task():
        try: outcomes.append(b.run('查询AAPL.US行情', lambda k,p: events.append((k,p)),stop=stop,deadline=time.monotonic()+(1.6 if action=='deadline' else 8)))
        except Exception as error: errors.append(error)
    thread = threading.Thread(target=task); thread.start()
    assert entered.wait(3)
    if action=='cancel': stop.set()
    if action=='crash': b.process.kill()
    thread.join(3)
    assert not thread.is_alive() and b.process.poll() is not None
    snapshot = list(events); history = deepcopy(b.history)
    release.set(); assert finished.wait(1)
    assert events == snapshot and b.history == history and b.execution_count == 0 and not provider.calls
    if action=='cancel': assert len(errors)==1 and isinstance(errors[0],RunStopped)
    else:
        assert not errors
        # The smaller model deadline can win the overall deadline. The separate
        # overall test below proves RUN_TIMEOUT without changing old timeouts.
        assert outcomes[0].error.code == ('PI_WORKER_EXIT' if action=='crash' else 'MODEL_TIMEOUT' if action=='model_timeout' else 'RUN_TIMEOUT')


def test_openai_cooperative_cancel_cancels_mock_http_exchange():
    entered, cancelled, stop = (threading.Event() for _ in range(3))
    async def handler(request):
        entered.set()
        try: await asyncio.Event().wait()
        finally: cancelled.set()
    model = OpenAIModelProvider(ModelConfiguration('https://offline.invalid/v1','offline','offline-key'),transport=httpx.MockTransport(handler))
    b, provider = bridge(model)
    errors=[]
    def task():
        try: run(b,stop=stop)
        except Exception as error: errors.append(error)
    thread=threading.Thread(target=task); thread.start()
    assert entered.wait(3); stop.set(); thread.join(3)
    assert not thread.is_alive() and cancelled.wait(1) and isinstance(errors[0],RunStopped)
    assert b.process.poll() is not None and not provider.calls and model.requests_started==1


@pytest.mark.parametrize('field', ['content','arguments','escaped_arguments','invalid_escaped_arguments'])
def test_key_echo_is_redacted_or_rejected_before_model_response(field, monkeypatch):
    secret='offline-private-key-sentinel'; frames=[]
    def handler(request):
        if field=='content': message=assistant(content='Echo '+secret)
        else:
            raw=json.dumps({'symbol':secret})
            if field in ('escaped_arguments','invalid_escaped_arguments'): raw=raw.replace('o','\\u006f')
            if field=='invalid_escaped_arguments': raw=raw[:-1]+',}'
            message=assistant([tool(arguments=raw)])
        return httpx.Response(200,json={'choices':[dict(message=message,finish_reason='stop' if field=='content' else 'tool_calls')]})
    model=OpenAIModelProvider(ModelConfiguration('https://offline.invalid','offline',secret),transport=httpx.MockTransport(handler))
    original=Pipe.send
    def capture(self,kind,payload,request_id=None):
        frames.append(deepcopy(payload)); return original(self,kind,payload,request_id)
    monkeypatch.setattr(Pipe,'send',capture)
    b, provider=bridge(model); outcome,_=run(b)
    assert not provider.calls
    if field=='content': assert outcome.status=='completed' and '[已脱敏]' in outcome.answer
    else: assert outcome.error.code=='MODEL_RESPONSE_INVALID'
    assert secret not in json.dumps(frames)


def model_stub(tmp_path, mode):
    """Hostile transport unit only; does NOT prove pi execution."""
    path=tmp_path/'模型 有空格 worker.cjs'
    path.write_text('''
const [run_id,attempt_id]=process.argv.slice(2);let sequence=0,buffer='';
const mode='''+json.dumps(mode)+''';
function send(type,payload,id='id_'+(sequence+1)){process.stdout.write(JSON.stringify({version:1,run_id,attempt_id,request_id:id,sequence:++sequence,type,payload})+'\\n');}
send('ready',{package:'@earendil-works/pi-agent-core',version:'1.1.0',agent:'Agent',tool_execution:'sequential'});
process.stdin.on('data',c=>{buffer+=c;let i;while((i=buffer.indexOf('\\n'))>=0){const m=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);
 if(m.type==='shutdown')process.exit();
 if(m.type==='start'){
  const p={messages:[{role:'system',content:m.payload.system},{role:'user',content:m.payload.text}],tools:m.payload.tools.map(f=>({type:'function',function:{...f,strict:true}})),call_index:1};
  if(mode==='history')p.messages[1].content='forged';
  if(mode==='schema')p.tools[0].function.parameters={type:'object'};
  if(mode==='extra')p.authorization='private-sentinel';
  if(mode==='size')p.messages[1].content='x'.repeat(100000);
  if(mode==='sequence')p.call_index=2;
  send('model_request',p,'model_one');
  if(mode==='duplicate')send('model_request',p,'model_one');
 }
 if(m.type==='model_response' && mode==='batch')send('tool_batch',{calls:[{id:'forged',name:'market_quote',arguments:'{"symbol":"AAPL.US"}'}]});
}});setInterval(()=>{},1000);
''',encoding='utf-8')
    return path


@pytest.mark.parametrize('mode', ['history','schema','extra','size','sequence','duplicate','batch'])
def test_hostile_model_transport_rejects_forgery_or_duplicate_with_zero_tools(tmp_path, mode):
    model=Dialog([assistant([tool()])])
    if mode=='duplicate':
        # Hold the first request pending until the duplicate is observed.
        model.complete=lambda *args: (time.sleep(0.3),assistant([tool()]))[1]
    b, provider=bridge(model,worker=model_stub(tmp_path,mode),response_timeout=1.5,model_timeout=1)
    outcome,_=run(b)
    assert outcome.status=='failed' and outcome.error.code in ('PI_PROTOCOL','MODEL_CONTEXT_LIMIT')
    assert b.execution_count==0 and not provider.calls
    assert b.model_calls == (1 if mode in ('duplicate','batch') else 0)


def test_explicit_model_override_store_replay_never_calls_model_or_tools(tmp_path):
    from fastapi.testclient import TestClient
    from research_trail.app import create_app
    from research_trail.agent import AgentRunner
    from research_trail.lifecycle import Timing
    token='offline-model-store-token-'*4
    app=create_app(token,database_path=tmp_path/'model-store.sqlite3')
    b,provider=bridge()
    with TestClient(app,headers={'X-ResearchTrail-Token':token}) as client:
        assert isinstance(app.state.manager.runner,AgentRunner)
        sid=client.post('/sessions',json={'title':'explicit model test'}).json()['id']
        record=app.state.manager.start(sid,'查询AAPL.US行情','normal',runner=b,timing=Timing(run_timeout=8))
        limit=time.monotonic()+8
        while (app.state.store.run(sid,record.id).status=='running' or record.id in app.state.manager.work) and time.monotonic()<limit:time.sleep(.01)
        assert app.state.store.run(sid,record.id).status=='completed'
        events=app.state.store.events(sid,record.id).events
        assert sum(e.type=='run_completed' for e in events)==1
        assert [e.sequence for e in events]==list(range(1,len(events)+1))
        for _ in range(2):
            assert client.get(f'/sessions/{sid}/runs/{record.id}/event-log').status_code==200
            assert client.get(f'/sessions/{sid}/runs/{record.id}/events?after_sequence=0').status_code==200
        assert b.model_calls==2 and b.execution_count==1 and provider.calls==['AAPL.US']
        assert app.state.store.events(sid,record.id).events==events and b.process.poll() is not None


@pytest.mark.parametrize('tamper', ['bundle','source','escape'])
def test_development_artifact_hash_units_reject_stale_or_escaping_inputs(tmp_path, monkeypatch, tamper):
    # Hash selection unit only, never run these fixture files as a pi Worker.
    import hashlib
    import research_trail.pi_bridge as module
    directory=tmp_path/'packages/pi-worker'
    (directory/'dist').mkdir(parents=True)
    inputs={}
    for name in ('worker.mjs','protocol.mjs','model-messages.mjs'):
        path=directory/name;path.write_text('hash fixture',encoding='utf-8')
        inputs[f'packages/pi-worker/{name}']=hashlib.sha256(path.read_bytes()).hexdigest()
    bundle=directory/'dist/worker.mjs';bundle.write_text('hash fixture bundle',encoding='utf-8')
    manifest=dict(version=1,core='1.1.0',ai='1.1.0',inputs=inputs,bundle=hashlib.sha256(bundle.read_bytes()).hexdigest())
    monkeypatch.setattr(module,'ROOT',tmp_path)
    (directory/'dist/manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
    assert module.default_worker()==bundle
    if tamper=='bundle': bundle.write_text('changed',encoding='utf-8')
    elif tamper=='source': (directory/'worker.mjs').write_text('changed',encoding='utf-8')
    else:
        manifest['inputs']['../private-path']='a'*64
        (directory/'dist/manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
    with pytest.raises(ValueError,match='build invalid'):module.default_worker()
