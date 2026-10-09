"""Bounded Python collection executor; no synthesis, prompts or duplicate data adapters.

Folio references: shared/src/research/{planner,runner}.ts and strategies/presets.ts,
fixed ba5dcdfd. Plan/status history is distinct from current registry readiness.
Only the coordinator persists results. Timed-out/cancelled late calls cannot do so.
"""
from dataclasses import dataclass, field
import threading
import time
from pydantic import TypeAdapter
from .provider_contracts import ReadQuery, ProviderResult, ProviderFailure
from .provider_errors import MESSAGES
from .research_contracts import ResearchInput, ResearchPlan, PlannedSkill, PlannedRead
from .research_strategies import strategies
from .research_store import ResearchStore, ResearchError

SOURCE = 'helsome/folio ba5dcdfd31b162f5edb8b908f7f099a560389326 / packages/shared/src/strategies/presets.ts'
RESULT = TypeAdapter(ProviderResult)

@dataclass
class Call:
    read: PlannedRead
    stop: threading.Event = field(default_factory=threading.Event)
    done: threading.Event = field(default_factory=threading.Event)
    thread: threading.Thread | None = None
    started: float = 0
    ended: float = 0
    result: object = None
    applied: bool = False

@dataclass
class Work:
    identity: str
    plan: ResearchPlan
    generation: int = 0
    stop: threading.Event = field(default_factory=threading.Event)
    calls: list[Call] = field(default_factory=list)
    thread: threading.Thread | None = None
    draining_since: float | None = None

class ResearchService:
    def __init__(self, database, registry, skills, providers, *, timeout_seconds=20, drain_seconds=1, calendar=None):
        if not 0 < timeout_seconds <= 20 or not 0 <= drain_seconds <= 2: raise ValueError('研究执行时限无效')
        self.registry, self.skills, self.providers = registry, skills, providers
        self.calendar=calendar
        self.store = ResearchStore(database)
        self.timeout_seconds, self.drain_seconds = timeout_seconds, drain_seconds
        self.lock = threading.RLock()
        self.closed = False
        self.work = None
        self.calls = []
        self.store.recover()

    def plan(self, body):
        body = ResearchInput.model_validate(body.model_dump())
        context=None
        if body.event_ref:
            if self.calendar is None: raise ResearchError('CALENDAR_UNAVAILABLE')
            context=self.calendar.context(body.event_ref,body)
        strategy = next(s for s in strategies() if s.id==body.strategy)
        selected = {s.id:s for s in self.skills.list(body.mode,body.provider)}
        skill_states = [PlannedSkill(id=i,status=selected[i].status,code=selected[i].code) if i in selected else
            PlannedSkill(id=i,status='missing',code='SKILL_NOT_IMPORTED') for i in strategy.skill_ids]
        market = {'HK':'HK','SG':'SG','SH':'CN','SZ':'CN','HAS':'CN'}.get(body.symbol.split('.')[1],'US')
        reads = [PlannedRead(capability=c,availability=self.registry.state(c,body.mode,body.provider),
            query=ReadQuery(capability=c,mode=body.mode,symbol=None if c in ('market.sentiment','market.status') else body.symbol,
                market=market,event_type='financial',use_cache=False))
            for c in strategy.capability_ids]
        if context:
            from datetime import timedelta
            event=context.event
            event_time=event.scheduled_at or event.occurred_at
            anchor=event.source_date or (event_time.date() if event_time else None)
            for read in reads:
                if read.capability=='research.events':
                    read.query=ReadQuery(capability='research.events',mode=body.mode,
                        symbol=body.symbol if event.kind=='earnings' else None,market=market,
                        event_type='financial' if event.kind=='earnings' else 'macrodata',count=100,use_cache=False,
                        start=anchor-timedelta(days=1) if anchor else None,end=anchor+timedelta(days=1) if anchor else None)
                    read.availability=self.registry.state('calendar.'+event.kind,body.mode,body.provider)
        with self.providers.settings.lock:
            return ResearchPlan(input=body,source=SOURCE,provider_revision=self.providers.settings.profile(body.provider).revision,
                provider_identity=self.providers.settings.identity(body.provider),timeout_seconds=self.timeout_seconds,skills=skill_states,reads=reads,event_context=context)

    def start(self, body):
        with self.lock:
            if self.closed: raise ResearchError('BACKEND_CLOSED')
            if self.store.active(): raise ResearchError('RESEARCH_ACTIVE')
            self.calls = [c for c in self.calls if c.thread and c.thread.is_alive()]
            if self.calls: raise ResearchError('EXECUTOR_DRAINING')
            plan = self.plan(body)
            identity = self.store.begin(plan)
            work = self.work = Work(identity,plan)
            try:
                work.thread = threading.Thread(target=self.execute,args=(work,),daemon=True,name=f'research-{identity}')
                work.thread.start()
            except Exception:
                self.store.finish(identity,'failed','WORKER_START_FAILED'); self.work=None
            return self.store.get(identity)

    def cancel(self, identity):
        with self.lock:
            self.store.finish(identity,'cancelled','CANCELLED')
            if self.work and self.work.identity==identity:
                self.work.stop.set()
                for call in self.work.calls: call.stop.set()
            return self.store.get(identity)

    def resume(self,identity,request_id):
        with self.lock:
            previous=self.store.action(identity,'resume',request_id)
            if previous: return self.store.get(previous)
            if self.closed: raise ResearchError('BACKEND_CLOSED')
            active=self.store.active()
            if active and active!=identity: raise ResearchError('RESEARCH_ACTIVE')
            self.calls=[c for c in self.calls if c.thread and c.thread.is_alive()]
            if not active and self.calls: raise ResearchError('EXECUTOR_DRAINING')
            saved=self.store.resume(identity,request_id)
            if saved.status=='fetching' and (not self.work or self.work.identity!=identity or self.work.generation!=saved.generation):
                work=self.work=Work(identity,saved.plan,generation=saved.generation)
                try:
                    work.thread=threading.Thread(target=self.execute,args=(work,),daemon=True,name=f'research-{identity}')
                    work.thread.start()
                except Exception:
                    self.store.finish(identity,'interrupted','WORKER_START_FAILED',generation=work.generation); self.work=None
            return self.store.get(identity)

    def fetch(self, work, call):
        try:
            result = RESULT.validate_python(self.providers.query(work.plan.input.provider,call.read.query,
                stop=call.stop,timeout_seconds=work.plan.timeout_seconds,expected_revision=work.plan.provider_revision,
                expected_identity=work.plan.provider_identity))
            if result.provider != work.plan.input.provider or result.capability != call.read.capability: raise ValueError()
            if result.ok:
                if result.provenance.mode != work.plan.input.mode or result.provenance.provider != result.provider: raise ValueError()
                if len(result.model_dump_json().encode()) > 270*1024: raise ValueError()
            else:
                if result.code not in MESSAGES: raise ValueError()
                result.message = MESSAGES[result.code]
            call.result = result
        except Exception:
            call.result = ProviderFailure(provider=work.plan.input.provider,capability=call.read.capability,
                state='failed',code='INVALID_RESPONSE',message=MESSAGES['INVALID_RESPONSE'])
        finally:
            call.ended=time.monotonic(); call.done.set()

    def launch(self, work, read):
        state = self.registry.state(read.capability,work.plan.input.mode,work.plan.input.provider)
        continuing_verified_plan = work.generation>0 and read.availability.available and state.code=='REAL_UNVERIFIED'
        if not state.can_attempt and not continuing_verified_plan:
            self.store.step(work.identity,read.capability,'unavailable',state.code,generation=work.generation); return
        if self.providers.settings.profile(work.plan.input.provider).revision != work.plan.provider_revision:
            self.store.step(work.identity,read.capability,'failed','CONFIG_CHANGED',generation=work.generation); return
        if not self.store.step(work.identity,read.capability,'running',generation=work.generation): return
        call = Call(read=read,started=time.monotonic())
        work.calls.append(call); self.calls.append(call)
        try:
            call.thread=threading.Thread(target=self.fetch,args=(work,call),daemon=True,name=f'research-read-{read.capability}')
            call.thread.start()
        except Exception:
            call.applied=True; call.stop.set()
            self.store.step(work.identity,read.capability,'failed','WORKER_START_FAILED',generation=work.generation)

    def advance(self, work):
        timestamp = time.monotonic()
        for call in work.calls:
            if call.applied: continue
            if (call.done.is_set() and call.ended-call.started > self.timeout_seconds) or (
                not call.done.is_set() and timestamp-call.started >= self.timeout_seconds):
                call.stop.set(); call.applied=True
                self.store.step(work.identity,call.read.capability,'timed_out','TIMEOUT',generation=work.generation)
            elif call.done.is_set():
                call.applied=True; result=call.result
                status = 'success' if result.ok else 'timed_out' if result.state=='timed_out' else 'cancelled' if result.state=='cancelled' else 'failed'
                self.store.step(work.identity,call.read.capability,status,None if result.ok else result.code,
                    result.model_dump(mode='json') if result.ok else None,generation=work.generation)
        self.calls = [c for c in self.calls if c.thread and c.thread.is_alive()]
        view = self.store.get(work.identity)
        pending = [s.capability for s in view.steps if s.status=='queued']
        free = work.plan.input.concurrency-len(self.calls)
        for capability in pending[:max(0,free)]:
            read = next(r for r in work.plan.reads if r.capability==capability)
            self.launch(work,read)
        # Non-cooperative injected/third-party calls retain their physical slots.
        # After a bounded cleanup grace, stop queued work explicitly instead of
        # inventing more threads or hanging a run forever. Admission stays closed
        # until those calls actually exit. Built-in SDK/CLI observe their stop flag.
        if pending and self.calls and all(c.applied for c in self.calls):
            if work.draining_since is None: work.draining_since=timestamp
            elif timestamp-work.draining_since >= self.drain_seconds:
                for capability in pending: self.store.step(work.identity,capability,'failed','EXECUTOR_DRAINING',generation=work.generation)
        else: work.draining_since=None
        self.store.finish(work.identity,generation=work.generation)
        return self.store.get(work.identity).status != 'fetching'

    def execute(self, work):
        try:
            while not work.stop.is_set():
                with self.lock:
                    if self.closed or work.stop.is_set(): return
                    if self.advance(work): return
                work.stop.wait(min(0.05,self.timeout_seconds/5))
        except Exception:
            with self.lock:
                if not self.closed and not work.stop.is_set(): self.store.finish(work.identity,'failed','RESEARCH_ERROR',generation=work.generation)
        finally:
            with self.lock:
                work.stop.set()
                for call in work.calls: call.stop.set()
                if self.work is work: self.work=None

    def close(self):
        with self.lock:
            self.closed=True; work=self.work
            for call in self.calls: call.stop.set()
            if work:
                work.stop.set(); self.store.finish(work.identity,'interrupted','BACKEND_SHUTDOWN',generation=work.generation)
        if work and work.thread: work.thread.join(1)
