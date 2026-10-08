"""Explicit minimal trace export. No prompt/answer/arguments/results/feedback upload.

Protocol references: LangSmith REST /runs; Langfuse OTLP JSON endpoint (v4).
No SDK background exporter, environment key fallback, retries or model calls.
"""
import json
import os
import threading
from datetime import datetime, timezone
from uuid import uuid4,uuid5,NAMESPACE_URL
import httpx
from sqlalchemy import select
from .calendar_normalize import digest
from .evaluation import EvaluationError
from .evaluation_cases import CATALOG
from .evaluation_contracts import TraceConfig, TraceConfigView, TracePreview, TraceDelivery
from .models import EvaluationTraceConfigRecord as Config, EvaluationTraceDeliveryRecord as Delivery
from .credentials import CredentialUnavailable

METRICS={'privacy','expected-error','bounded-tools','tool-selection','evidence','source-disclosure','fixture-fact','store-replay','store-recovery'}
CODES={'UNKNOWN_SYMBOL','UNKNOWN_TOOL','INVALID_ARGUMENT','MODEL_RESPONSE_INVALID','TOOL_LIMIT','PROVIDER_ERROR',
       'APPLICATION_RESTARTED','EVALUATOR_ERROR','EVALUATION_CANCELLED'}|{'QUALITY_'+m.upper().replace('-','_') for m in METRICS}
STAGES={'runtime','evaluator','tool','model','tool-validation','tool-selection','tool-result','answer','redaction','store-replay','store-recovery','model-validation','run-budget'}

def minimal_result(result):
    """Rebuild from allowlisted scalars; never recursively forward raw trace data."""
    tools=[]
    for event in result.trace:
        payload=event.get('payload',{})
        if not isinstance(payload,dict): continue
        if event.get('kind')=='tool_started' and payload.get('name') in ('market.quote','market.kline'):
            sequence=event.get('sequence')
            tools.append({'sequence':sequence if type(sequence) is int and 0<sequence<1000 else None,'name':payload['name']})
    return {'case_id':result.case_id if result.case_id in CATALOG else 'unknown-case','status':result.status,
            'observed_status':result.observed_status if result.observed_status in ('completed','failed','timed_out','interrupted','cancelled') else None,
            'code':result.code if result.code in CODES else None,
            'failure_stage':result.failure_stage if result.failure_stage in STAGES else None,
            'score':result.score,'tool_calls':result.tool_calls,'tools':tools,
            'assertions':[{'metric':a.metric,'passed':a.passed,'stage':a.stage if a.stage in STAGES else None,
                           'sequence':a.sequence} for a in result.assertions if a.metric in METRICS]}

def wire_payload(provider,view,project,revision):
    identity=uuid5(NAMESPACE_URL,f'research-trail:{provider}:{view.id}:{revision}')
    safe={'mode':'deterministic-offline','evaluator':view.evaluator_version,'suite_hash':view.suite_hash,
          'validity':view.validity,'score':view.score if view.validity=='valid' else None,
          'cases':[minimal_result(r) for r in view.results]}
    start=view.created_at;end=view.completed_at or start
    if provider=='langsmith':
        return {'id':str(identity),'name':'ResearchTrail offline evaluation','run_type':'chain','session_name':project,
                'start_time':start,'end_time':end,'inputs':{'case_count':len(view.cases)},'outputs':safe,
                'extra':{'metadata':{'source':'research-trail','privacy':'minimal-allowlist-v1'}}}
    def nanos(value):return str(int(datetime.fromisoformat(value).timestamp()*1_000_000)*1000)
    return {'resourceSpans':[{'resource':{'attributes':[{'key':'service.name','value':{'stringValue':'research-trail'}}]},
            'scopeSpans':[{'scope':{'name':'research-trail-evaluation','version':'1'},'spans':[{
                'traceId':identity.hex,'spanId':identity.hex[:16],'name':'ResearchTrail offline evaluation','kind':1,
                'startTimeUnixNano':nanos(start),'endTimeUnixNano':nanos(end),
                'attributes':[{'key':'langfuse.observation.type','value':{'stringValue':'evaluator'}},
                    {'key':'langfuse.observation.input','value':{'stringValue':json.dumps({'case_count':len(view.cases)})}},
                    {'key':'langfuse.observation.output','value':{'stringValue':json.dumps(safe,ensure_ascii=False)}},
                    {'key':'langfuse.trace.metadata.privacy','value':{'stringValue':'minimal-allowlist-v1'}}]}]}]}]}

class EvaluationTracing:
    def __init__(self,database,settings,evaluation,*,transport=None):
        self.database=database;self.settings=settings;self.evaluation=evaluation;self.transport=transport;self.lock=threading.RLock()
        with database.write() as db:
            for row in db.scalars(select(Delivery).where(Delivery.status=='claimed')):
                row.status='uncertain';row.code='APPLICATION_RESTARTED'

    def offline(self):
        # MockTransport is an explicit in-process fixture, never an HTTP connection.
        return os.environ.get('RESEARCH_TRAIL_OFFLINE')=='1' and not isinstance(self.transport,httpx.MockTransport)
    def vault(self,operation,*args):
        try:return getattr(self.settings.vault,operation)(*args)
        except Exception:raise CredentialUnavailable() from None
    def view(self,provider):
        with self.lock,self.database.sessions() as db:
            row=db.get(Config,provider)
            if row is None:return TraceConfigView(provider=provider,credential_present=False)
            present=bool(row.credential_ref and self.vault('get',self.settings.target(row.credential_ref)))
            return TraceConfigView(**row.payload,provider=provider,credential_present=present,revision=row.revision,
                status=('unconfigured' if not present else row.status) if row.payload['enabled'] else 'disabled',
                code=('TRACE_CREDENTIAL_MISSING' if not present else row.code) if row.payload['enabled'] else 'TRACING_DISABLED',checked_at=row.checked_at)
    def configurations(self):return [self.view(p) for p in ('langsmith','langfuse')]
    def configure(self,provider,body):
        with self.lock,self.database.write() as db:
            row=db.get(Config,provider)
            if row is None:
                row=Config(provider=provider,payload=body.model_dump(),revision=0,status='unverified',code='CONNECTION_NOT_TESTED');db.add(row)
            else:row.payload=body.model_dump();row.revision+=1;row.status='unverified';row.code='CONFIG_CHANGED';row.checked_at=None
        return self.view(provider)
    def credential(self,provider,body):
        if provider=='langfuse' and body.public_key is None:raise EvaluationError('LANGFUSE_PUBLIC_KEY_REQUIRED')
        value={'secret':body.secret.get_secret_value(),'public_key':body.public_key.get_secret_value() if body.public_key else None,
               'workspace_id':str(body.workspace_id) if body.workspace_id else None}
        packed=json.dumps(value)
        if len(packed.encode())>2560:raise EvaluationError('TRACE_CREDENTIAL_TOO_LARGE')
        with self.lock:
            with self.database.sessions() as db:
                row=db.get(Config,provider)
                if row is None:raise EvaluationError('TRACE_CONFIG_REQUIRED')
                previous=row.credential_ref
            reference=str(uuid4());self.vault('set',self.settings.target(reference),packed)
            try:
                with self.database.write() as db:
                    row=db.get(Config,provider);row.credential_ref=reference;row.revision+=1;row.status='unverified';row.code='CREDENTIAL_CHANGED';row.checked_at=None
            except BaseException:
                self.vault('delete',self.settings.target(reference));raise
            if previous:self.vault('delete',self.settings.target(previous))
        return self.view(provider)
    def delete_credential(self,provider):
        with self.lock,self.database.write() as db:
            row=db.get(Config,provider)
            if row:
                if row.credential_ref:self.vault('delete',self.settings.target(row.credential_ref))
                row.credential_ref=None;row.revision+=1;row.payload={**row.payload,'enabled':False};row.status='disabled';row.code='CREDENTIAL_REMOVED';row.checked_at=None
        return self.view(provider)
    def connection(self,provider):
        if self.offline():raise EvaluationError('OFFLINE_TRACING_BLOCKED')
        with self.database.sessions() as db:
            row=db.get(Config,provider)
            if row is None or not row.payload['enabled']:raise EvaluationError('TRACING_DISABLED')
            config=TraceConfig.model_validate(row.payload)
            if not config.endpoint:raise EvaluationError('TRACE_ENDPOINT_REQUIRED')
            raw=self.vault('get',self.settings.target(row.credential_ref)) if row.credential_ref else None
            if not raw:raise EvaluationError('TRACE_CREDENTIAL_MISSING')
            return config,json.loads(raw)
    def request(self,provider,method,path,config,credentials,payload=None):
        headers={'Content-Type':'application/json'};auth=None
        if provider=='langsmith':
            headers['x-api-key']=credentials['secret']
            if credentials.get('workspace_id'):headers['x-tenant-id']=credentials['workspace_id']
        else:
            auth=httpx.BasicAuth(credentials['public_key'],credentials['secret']);headers['x-langfuse-ingestion-version']='4'
        try:
            with httpx.Client(transport=self.transport,trust_env=False,timeout=5,follow_redirects=False) as client:
                with client.stream(method,config.endpoint+path,headers=headers,auth=auth,json=payload) as response:
                    chunks=[];size=0
                    for chunk in response.iter_bytes():
                        size+=len(chunk)
                        if size>65536:raise EvaluationError('TRACE_RESPONSE_TOO_LARGE')
                        chunks.append(chunk)
                    if not 200<=response.status_code<300:raise EvaluationError('TRACE_HTTP_'+str(response.status_code))
                    raw=b''.join(chunks)
                    return json.loads(raw) if raw.strip() else None
        except EvaluationError:raise
        except (httpx.TimeoutException,httpx.TransportError):raise EvaluationError('TRACE_DELIVERY_UNCERTAIN') from None
        except Exception:raise EvaluationError('TRACE_RESPONSE_INVALID') from None
    def probe(self,provider):
        with self.lock:
            config,credentials=self.connection(provider)
            try:
                data=self.request(provider,'GET','/sessions?limit=1' if provider=='langsmith' else '/api/public/projects',config,credentials)
                if not (isinstance(data,list) if provider=='langsmith' else isinstance(data,dict) and isinstance(data.get('data'),list)):
                    raise EvaluationError('TRACE_RESPONSE_INVALID')
                status,code='connected','AUTHENTICATED_RESPONSE'
            except EvaluationError as error:status,code='failed',error.code
            with self.database.write() as db:
                row=db.get(Config,provider);row.status=status;row.code=code;row.checked_at=datetime.now(timezone.utc).isoformat()
        return self.view(provider)
    def preview(self,provider,identity):
        config=self.view(provider);view=self.evaluation.get(identity)
        if view.status in ('running','not_run'):raise EvaluationError('TRACE_REQUIRES_FINISHED_EXPERIMENT')
        payload=wire_payload(provider,view,config.project,config.revision)
        if len(json.dumps(payload).encode())>65536:raise EvaluationError('TRACE_PAYLOAD_TOO_LARGE')
        fingerprint=digest({'provider':provider,'revision':config.revision,'endpoint':config.endpoint,'payload':payload})
        return TracePreview(experiment_id=str(identity),provider=provider,revision=config.revision,digest=fingerprint,payload=payload)
    @staticmethod
    def delivery(row):return TraceDelivery(**{k:getattr(row,k) for k in TraceDelivery.model_fields})
    def deliveries(self):
        with self.database.sessions() as db:return [self.delivery(r) for r in db.scalars(select(Delivery).order_by(Delivery.created_at.desc()).limit(100))]
    def upload(self,provider,identity,body):
        fingerprint=digest({'provider':provider,'experiment':str(identity),**body.model_dump(mode='json')})
        with self.lock:
            with self.database.sessions() as db:
                old=db.scalar(select(Delivery).where(Delivery.request_id==str(body.request_id)))
                if old:
                    if old.request_hash!=fingerprint:raise EvaluationError('TRACE_REQUEST_CONFLICT')
                    return self.delivery(old)
            config,credentials=self.connection(provider);preview=self.preview(provider,identity)
            if preview.digest!=body.digest:raise EvaluationError('TRACE_PREVIEW_CHANGED')
            with self.database.write() as db:
                old=db.scalar(select(Delivery).where(Delivery.provider==provider,Delivery.experiment_id==str(identity),Delivery.revision==preview.revision,Delivery.digest==preview.digest))
                if old:return self.delivery(old)
                row=Delivery(id=str(uuid4()),request_id=str(body.request_id),request_hash=fingerprint,provider=provider,
                    experiment_id=str(identity),revision=preview.revision,digest=preview.digest,created_at=datetime.now(timezone.utc).isoformat(),status='claimed',code='CLAIMED')
                db.add(row);db.flush();delivery_id=row.id
            try:
                data=self.request(provider,'POST','/runs' if provider=='langsmith' else '/api/public/otel/v1/traces',config,credentials,preview.payload)
                if provider=='langfuse':
                    if not isinstance(data,dict):raise EvaluationError('TRACE_RESPONSE_INVALID')
                    partial=data.get('partialSuccess',{})
                    if not isinstance(partial,dict):raise EvaluationError('TRACE_RESPONSE_INVALID')
                    try:rejected=int(partial.get('rejectedSpans',0))
                    except (ValueError,TypeError):raise EvaluationError('TRACE_RESPONSE_INVALID') from None
                    if rejected<0:raise EvaluationError('TRACE_RESPONSE_INVALID')
                    if rejected:raise EvaluationError('TRACE_PARTIAL_REJECTED')
                status,code='uploaded','REMOTE_ACCEPTED'
            except EvaluationError as error:
                status='uncertain' if error.code=='TRACE_DELIVERY_UNCERTAIN' else 'failed';code=error.code
            with self.database.write() as db:
                row=db.get(Delivery,delivery_id);row.status=status;row.code=code;return self.delivery(row)
