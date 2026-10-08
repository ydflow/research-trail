"""Execute the existing AgentRunner/ToolRegistry and Store in an offline sandbox."""
from datetime import datetime, timezone
import threading
import time
from tempfile import TemporaryDirectory
from pathlib import Path
from .agent import AgentRunner
from .market import FixtureMarketProvider
from .model_provider import FakeModelProvider
from .tools import market_tools
from .store import RunStopped, Store
from .database import Database
from .evaluation_contracts import CaseResult, Assertion

FIXED_TIME=datetime(2024,1,16,21,tzinfo=timezone.utc)

class EvaluationFixture(FixtureMarketProvider):
    def __init__(self,fail=False): self.fail=fail;self.calls=0
    def snapshot(self,symbol):
        self.calls+=1
        if self.fail: raise RuntimeError('authored provider failure')
        return super().snapshot(symbol).model_copy(update={'fetched_at':FIXED_TIME})

class Candidate(FakeModelProvider):
    def __init__(self,profile):self.profile=profile
    def plan(self,text):
        return None if self.profile=='missing-tool' else super().plan(text)
    def respond(self,data):
        answer=super().respond(data)
        if self.profile=='missing-disclosure':return '已获取行情。'
        if self.profile=='wrong-fact':return '最新价0.01 USD，模拟数据，固定市场时间2024，非实时行情。'
        return answer

class ProbeModel:
    label='确定性错误探针（不是LLM）'
    def __init__(self,case_id):self.case_id=case_id
    def complete(self,messages,tools,stop,deadline):
        if self.case_id=='model-shape':return {'role':'tool','content':'invalid'}
        name='trade_order' if self.case_id=='unknown-tool' else 'market_quote'
        args='{"symbol":"not-a-symbol"}' if self.case_id=='invalid-args' else '{"symbol":"AAPL.US"}'
        return {'role':'assistant','content':None,'tool_calls':[{'id':'probe-'+str(len(messages)),
            'type':'function','function':{'name':name,'arguments':args}}]}

def execute_case(case,profile,stop):
    if stop.is_set():raise RunStopped()
    if case.id in ('restart-interrupted','replay-no-tools'):
        return recovery_case(case,stop)
    if case.id=='minimal-redaction':
        from .evaluation_trace import minimal_result
        raw=CaseResult(case_id=case.id,answer='private answer',trace=[{'payload':{'api_key':'authored-secret','account':'private'},'kind':'tool_result'}])
        safe=minimal_result(raw)
        check=Assertion(metric='privacy',passed=not any(x in str(safe) for x in ('authored-secret','private answer','account')),
                        reason='远程投影仅允许固定身份、状态、工具名、断言名/布尔与计数。',stage='redaction')
        return CaseResult(case_id=case.id,status='passed' if check.passed else 'quality_failed',observed_status='completed',
                          score=1 if check.passed else 0,assertions=[check],trace=[{'sequence':1,'kind':'redaction_checked','payload':{'minimal':check.passed}}])
    provider=EvaluationFixture(case.id=='provider-error' or profile=='provider-failure')
    model=ProbeModel(case.id) if case.id in ('invalid-args','unknown-tool','model-shape','tool-budget') else Candidate(profile)
    runner=AgentRunner(model,market_tools(provider),max_tool_rounds=2)
    trace=[];ids={}
    def emit(kind,payload):
        if stop.is_set():raise RunStopped()
        payload=dict(payload)
        if 'call_id' in payload:
            ids.setdefault(payload['call_id'],'call-'+str(len(ids)+1));payload['call_id']=ids[payload['call_id']]
        trace.append({'sequence':len(trace)+1,'kind':kind,'payload':payload})
    outcome=runner.run(case.prompt,emit,stop=stop,deadline=time.monotonic()+3)
    if stop.is_set():raise RunStopped()
    code=outcome.error.code if outcome.error else None
    trace.append({'sequence':len(trace)+1,'kind':'run_finished','payload':{'status':outcome.status,'code':code}})
    tools=[e for e in trace if e['kind']=='tool_started'];results=[e for e in trace if e['kind']=='tool_result']
    result=CaseResult(case_id=case.id,observed_status=outcome.status,code=code,trace=trace,
                      answer=outcome.answer,tool_calls=len(tools))
    checks=[]
    def check(metric,passed,reason,stage,sequence=None):
        checks.append(Assertion(metric=metric,passed=passed,reason=reason,stage=stage,sequence=sequence))
    if case.expected_code:
        stage='run-budget' if code=='TOOL_LIMIT' else 'tool-result' if tools else 'model-validation'
        result.failure_stage=stage
        error_sequence=next((e['sequence'] for e in reversed(trace) if e['kind']=='error'),trace[-1]['sequence'])
        check('expected-error',code==case.expected_code,'预期 '+case.expected_code+'，实际 '+str(code),stage,error_sequence)
        check('bounded-tools',len(tools)==(2 if case.id=='tool-budget' else 1 if case.expected_tool else 0),'非法调用不得执行，循环限2次','tool-validation')
        if code!=case.expected_code:
            result.status='run_error';result.failure_stage='tool' if tools else 'model';result.assertions=checks;return result
    elif outcome.status!='completed':
        result.status='run_error';result.failure_stage='tool' if tools else 'model';return result
    else:
        check('tool-selection',len(tools)==1 and tools[0]['payload']['name']==case.expected_tool,'必须执行指定的一个只读工具','tool-selection',tools[0]['sequence'] if tools else None)
        check('evidence',bool(results) and all(e['payload']['result'].get('ok') for e in results),'成功结果是回答的事实依据','tool-result',results[0]['sequence'] if results else None)
        check('source-disclosure','模拟数据' in outcome.answer and '非实时行情' in outcome.answer and '2024' in outcome.answer,'保留模拟/固定市场时间及非实时声明','answer',trace[-1]['sequence'])
        symbol='NVDA.US' if case.id=='kline-nvda' else 'MSFT.US' if case.id=='quote-msft' else 'AAPL.US'
        snapshot=FixtureMarketProvider().snapshot(symbol)
        fact=f'{snapshot.quote.last_price:.2f}'
        check('fixture-fact',fact in outcome.answer and (symbol in outcome.answer or case.id=='kline-nvda'),'回答必须包含该股票夹具原始价格 '+fact,'answer',trace[-1]['sequence'])
    result.assertions=checks;failed=[c for c in checks if not c.passed]
    result.status='quality_failed' if failed else 'passed';result.score=0 if failed else 1
    if failed:result.failure_stage=failed[0].stage;result.code='QUALITY_'+failed[0].metric.upper().replace('-','_')
    return result

def recovery_case(case,stop):
    with TemporaryDirectory(prefix='research-trail-eval-') as work:
        db=Database(Path(work)/'sandbox.sqlite3');db.migrate()
        try:
            store=Store(db);session=store.create_session('评测隔离夹具');run=store.begin_agent(session.id,'查询AAPL.US行情')
            provider=EvaluationFixture();trace=[]
            if case.id=='replay-no-tools':
                outcome=AgentRunner(FakeModelProvider(),market_tools(provider)).run('查询AAPL.US行情',
                    lambda kind,payload:store.append_running(session.id,run.id,kind,payload),stop=stop)
                store.finish(session.id,run.id,outcome.status,outcome.answer,outcome.error)
                first=store.events(session.id,run.id).model_dump(mode='json');before=provider.calls
                second=store.events(session.id,run.id).model_dump(mode='json')
                store.finish(session.id,run.id,'failed')
                ok=first==second and provider.calls==before==1 and store.run(session.id,run.id).status=='completed'
                stage='store-replay';observed='completed'
            else:
                store.recover_interrupted();first=store.events(session.id,run.id).model_dump(mode='json')
                store.recover_interrupted();second=store.events(session.id,run.id).model_dump(mode='json')
                ok=first==second and provider.calls==0 and store.run(session.id,run.id).status=='interrupted'
                stage='store-recovery';observed='interrupted'
            if stop.is_set():raise RunStopped()
            # Raw sandbox UUID/timestamps are not comparison metrics or remote telemetry.
            trace=[{'sequence':1,'kind':stage,'payload':{'observed_status':observed,'tool_calls':provider.calls,'repeated_read_equal':first==second}}]
            check=Assertion(metric=stage,passed=ok,reason='实际Store重复恢复/事件重读不重复工具或终态。',stage=stage,sequence=1)
            return CaseResult(case_id=case.id,status='passed' if ok else 'quality_failed',observed_status=observed,
                              score=1 if ok else 0,assertions=[check],trace=trace,tool_calls=provider.calls)
        finally:db.close()
