"""Screening orchestration only: all data reads use the existing ProviderService.

Four physical calls maximum, 15s per call (Folio baseline), bounded pool <=40.
Late calls keep their slots and cannot write evidence after timeout/cancellation.
No model is involved in selecting, scoring or explaining these fixed-rule candidates.
"""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import threading
import time
from uuid import uuid4
from sqlalchemy import select
from .models import ScreeningRecord
from .provider_contracts import ReadQuery, ProviderFailure
from .screening_contracts import (ScreeningInput, ScreeningTask, ScreeningRun, ScreeningSummary,
    ScreeningRead, ScreeningDecision, ScreeningEvidence)
from .screening_rules import TASKS, BY_ID, evaluate

def digest(value):
    return sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def utc(): return datetime.now(timezone.utc)

class ScreeningError(Exception): pass

class ScreeningService:
    def __init__(self,database,registry,providers,watchlist,*,timeout_seconds=15,clock=utc):
        self.database=database; self.registry=registry; self.providers=providers; self.watchlist=watchlist
        self.timeout=timeout_seconds; self.clock=clock; self.lock=threading.RLock()
        self.closed=False; self.calls=[]; self.worker=None; self.stop=threading.Event()
        with database.write() as db:
            for row in db.scalars(select(ScreeningRecord)):
                if row.payload['run']['status']=='fetching':
                    payload=deepcopy(row.payload); payload['run']['status']='interrupted'
                    for read in payload['run']['reads']:
                        if read['status'] in ('pending','running'): read.update(status='failed',code='APP_INTERRUPTED',ended_at=utc().isoformat())
                    row.payload=payload

    def tasks(self,context):
        return [ScreeningTask(id=s[0],title=s[1],rule=s[3],score_rule=s[4],
            capabilities=[self.registry.state(c,mode=context.mode,provider=context.provider) for c in s[2]]) for s in TASKS]

    def _load(self,identity):
        with self.database.sessions() as db:
            row=db.get(ScreeningRecord,str(identity))
            if row is None: raise ScreeningError('SCREENING_NOT_FOUND')
            return deepcopy(row.payload)

    def _save(self,payload):
        with self.database.write() as db: db.get(ScreeningRecord,payload['run']['id']).payload=deepcopy(payload)

    def get(self,identity):
        with self.lock:
            payload=self._load(identity)
            for read in payload['run']['reads']:
                if read['result_hash'] is not None:
                    result=payload['results'].get(read['id'])
                    if result is None or digest(result)!=read['result_hash']: raise ScreeningError('SCREENING_EVIDENCE_MISMATCH')
            return ScreeningRun.model_validate(payload['run'])

    def list(self):
        with self.database.sessions() as db:
            return [ScreeningSummary.model_validate({k:r.payload['run'][k] for k in ScreeningSummary.model_fields})
                for r in db.scalars(select(ScreeningRecord).order_by(ScreeningRecord.created_at.desc(),ScreeningRecord.id).limit(100))]

    def evidence(self,identity,read_id):
        run=self.get(identity); read=next((r for r in run.reads if r.id==str(read_id)),None)
        if read is None: raise ScreeningError('SCREENING_NOT_FOUND')
        result=self._load(identity)['results'].get(read.id)
        if result is None: raise ScreeningError('SCREENING_EVIDENCE_UNAVAILABLE')
        return ScreeningEvidence(run_id=run.id,read=read,result=result)

    def start(self,query):
        query=ScreeningInput.model_validate(query.model_dump()); fingerprint=digest(query.model_dump(mode='json'))
        with self.lock:
            with self.database.sessions() as db:
                existing=db.scalar(select(ScreeningRecord).where(ScreeningRecord.request_id==str(query.request_id)))
                if existing:
                    if existing.request_hash!=fingerprint: raise ScreeningError('REQUEST_CONFLICT')
                    return self.get(existing.id)
            if self.closed: raise ScreeningError('SCREENING_CLOSED')
            if (self.worker and self.worker.is_alive()) or any(c['thread'].is_alive() for c in self.calls): raise ScreeningError('SCREENING_BUSY')
            universe=query.universe
            source='explicit'
            if universe is None:
                universe=[e.symbol for e in self.watchlist.state().entries]; source='watchlist'
                if not universe: universe=list(self.watchlist.catalog); source='fixture-catalog'
            now=self.clock(); now=now.astimezone(timezone.utc)
            task=next(t for t in self.tasks(query) if t.id==query.strategy)
            with self.providers.settings.lock:
                revision=self.providers.settings.profile(query.provider).revision
                identity=self.providers.settings.identity(query.provider)
            reads=[]
            for symbol in universe:
                market=symbol.rsplit('.',1)[1]; market='CN' if market in ('SH','SZ','HAS') else market
                for cap in BY_ID[query.strategy][2]:
                    params={'capability':cap,'mode':query.mode,'symbol':None if cap=='market.sentiment' else symbol,'market':market,'use_cache':False}
                    if cap=='market.kline': params.update(count=90,period='1d')
                    if cap=='company.financials': params.update(kind='IS',report='annual')
                    if cap=='research.events': params.update(event_type='financial',start=now.date(),end=(now+timedelta(days=30)).date(),count=60)
                    if cap=='research.news': params.update(count=100)
                    reads.append(ScreeningRead(id=str(uuid4()),symbol=symbol,query=ReadQuery(**params)))
            run=ScreeningRun(id=str(uuid4()),strategy=query.strategy,status='fetching',created_at=utc().isoformat(),
                input=query,task=task,universe=universe,universe_source=source,reference_time=now.isoformat(),timeout_seconds=self.timeout,reads=reads)
            payload={'run':run.model_dump(mode='json'),'results':{}}
            with self.database.write() as db:
                db.add(ScreeningRecord(id=run.id,request_id=str(query.request_id),request_hash=fingerprint,created_at=run.created_at,payload=payload))
            self.stop=threading.Event(); self.calls=[]
            self.worker=threading.Thread(target=self._execute,args=(payload,revision,identity),daemon=True)
            self.worker.start()
            return run

    def _failure(self,read,code,state='failed'):
        return ProviderFailure(provider=read['query'].get('provider',self.current_provider),capability=read['query']['capability'],code=code,message='筛选读取未完成：'+code,state=state,retryable=False).model_dump(mode='json')

    def _execute(self,payload,revision,identity):
        run=payload['run']; self.current_provider=run['input']['provider']; stop=self.stop
        try:
            while True:
                with self.lock:
                    active=[c for c in self.calls if c['thread'].is_alive()]
                    for call in self.calls:
                        read=call['read']
                        if read['status']!='running': continue
                        if stop.is_set(): result=self._failure(read,'APP_INTERRUPTED' if self.closed else 'CANCELLED','cancelled'); call['stop'].set()
                        elif (call['done'].is_set() and call['ended']-call['started']>=self.timeout) or (not call['done'].is_set() and time.monotonic()-call['started']>=self.timeout):
                            result=self._failure(read,'TIMEOUT','timed_out'); call['stop'].set()
                        elif call['done'].is_set():
                            result=call['result']
                            with self.providers.settings.lock:
                                unchanged=self.providers.settings.profile(self.current_provider).revision==revision and self.providers.settings.identity(self.current_provider)==identity
                            if not unchanged: result=self._failure(read,'CONFIG_CHANGED')
                        else: continue
                        if len(json.dumps(payload['results'],ensure_ascii=False).encode())+len(json.dumps(result,ensure_ascii=False).encode())>8*1024*1024: result=self._failure(read,'RESULT_BUDGET_EXCEEDED')
                        payload['results'][read['id']]=result
                        read.update(status='completed' if result['ok'] else 'failed',code=None if result['ok'] else result['code'],ended_at=utc().isoformat(),result_hash=digest(result))
                    pending=[r for r in run['reads'] if r['status']=='pending']
                    if stop.is_set():
                        for read in pending: read.update(status='failed',code='APP_INTERRUPTED' if self.closed else 'CANCELLED',ended_at=utc().isoformat())
                    else:
                        # A timed-out physical call still occupies a slot. Do not queue more behind four stuck calls.
                        if len(active)>=4 and all(c['read']['status']=='failed' for c in active):
                            for read in pending: read.update(status='failed',code='EXECUTOR_DRAINING',ended_at=utc().isoformat())
                        for read in pending[:max(0,4-len(active))]:
                            if read['status']!='pending': continue
                            state=self.registry.state(read['query']['capability'],mode=run['input']['mode'],provider=self.current_provider)
                            if not state.available:
                                read.update(status='failed',code=state.code,ended_at=utc().isoformat()); continue
                            read.update(status='running',started_at=utc().isoformat())
                            call={'read':read,'stop':threading.Event(),'done':threading.Event(),'started':time.monotonic()}
                            def fetch(call=call):
                                try:
                                    result=self.providers.query(self.current_provider,ReadQuery.model_validate(call['read']['query']),stop=call['stop'],timeout_seconds=self.timeout,expected_revision=revision,expected_identity=identity)
                                    call['result']=result.model_dump(mode='json')
                                except Exception: call['result']=self._failure(call['read'],'EXECUTION_FAILED')
                                finally:
                                    call['ended']=time.monotonic()
                                    call['done'].set()
                            call['thread']=threading.Thread(target=fetch,daemon=True); self.calls.append(call); call['thread'].start()
                    self._decisions(payload)
                    unsettled=any(r['status'] in ('pending','running') for r in run['reads'])
                    if not unsettled:
                        usable=sum(d['status'] in ('included','excluded') for d in run['decisions'])
                        run['status']=('interrupted' if self.closed else 'cancelled') if stop.is_set() else 'failed' if usable==0 else 'completed' if usable==len(run['universe']) else 'partial'
                    self._save(payload)
                    if not unsettled: return
                stop.wait(.02)
        except Exception:
            with self.lock:
                run['status']='failed'
                for read in run['reads']:
                    if read['status'] in ('pending','running'): read.update(status='failed',code='SCREENING_EXECUTOR_FAILED',ended_at=utc().isoformat())
                for call in self.calls: call['stop'].set()
                self._save(payload)

    def _decisions(self,payload):
        run=payload['run']; decisions=[]
        for symbol in run['universe']:
            reads=[r for r in run['reads'] if r['symbol']==symbol]
            if any(r['status'] in ('pending','running') for r in reads): continue
            failed=[r for r in reads if r['status']=='failed']
            name=self.watchlist.catalog.get(symbol,symbol)
            if failed: decision=ScreeningDecision(symbol=symbol,name=name,status='failed',code=','.join(dict.fromkeys(r['code'] or 'FAILED' for r in failed)),reasons=['必要能力未完成；成功读取仍保存在执行记录中。'])
            else:
                results={r['query']['capability']:(r['id'],payload['results'][r['id']]) for r in reads}
                decision=evaluate(run['strategy'],symbol,name,results,datetime.fromisoformat(run['reference_time']))
            decisions.append(decision.model_dump(mode='json'))
        run['decisions']=decisions
        from decimal import Decimal
        candidates=sorted((d for d in decisions if d['status']=='included'),key=lambda d:(-Decimal(d['score'] or '0'),d['symbol']))
        run['candidate_count']=len(candidates[:run['input']['limit']]); run['candidates']=candidates[:run['input']['limit']]

    def cancel(self,identity):
        with self.lock:
            run=self.get(identity)
            if run.status=='fetching': self.stop.set()
            return run

    def close(self):
        with self.lock:
            self.closed=True; self.stop.set()
        if self.worker: self.worker.join(timeout=2)
