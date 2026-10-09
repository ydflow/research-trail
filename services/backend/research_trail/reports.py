"""Single bounded synthesis request over saved collection data; never recollects."""
from dataclasses import dataclass, field
import threading
import time
from .report_store import ReportStore
from .report_contracts import ReportDocument, ReportOriginal
from .report_facts import packet, original
from .report_synthesis import FixedReportSynthesizer, LiveReportSynthesizer, validate, validate_forecast_time
from .research_store import ResearchError
from .openai_provider import ModelError

@dataclass
class Generation:
    identity: str
    bundle: dict
    synthesizer: object
    stop: threading.Event = field(default_factory=threading.Event)
    done: threading.Event = field(default_factory=threading.Event)
    thread: threading.Thread | None = None
    coordinator: threading.Thread | None = None
    output: object = None
    code: str | None = None
    ended: float = 0

class ReportService:
    def __init__(self,database,research_store,model_factory,*,fixed_factory=FixedReportSynthesizer,timeout_seconds=120):
        if not 0 < timeout_seconds <= 120: raise ValueError('报告时限无效')
        self.store=ReportStore(database); self.research=research_store
        self.model_factory,self.fixed_factory=model_factory,fixed_factory
        self.timeout_seconds=timeout_seconds
        self.lock=threading.RLock(); self.closed=False; self.work=None
        self.store.recover()

    @staticmethod
    def requests(work):
        return getattr(getattr(work.synthesizer,'model',None),'requests_started',0)

    def start(self,run_id,body):
        with self.lock:
            if self.closed: raise ResearchError('BACKEND_CLOSED')
            previous=self.store.request(run_id,body.request_id)
            if previous:
                job=self.store.get(previous)
                if job.mode!=body.mode: raise ResearchError('ACTION_ID_CONFLICT')
                return job
            if self.work:
                if self.store.get(self.work.identity).status=='generating': raise ResearchError('REPORT_ACTIVE')
                if self.work.thread and self.work.thread.is_alive(): raise ResearchError('REPORT_DRAINING')
            bundle=packet(self.research,run_id)
            # Snapshot configured credentials once; no network or credential in stored report.
            try: synthesizer=self.fixed_factory() if body.mode=='fixed' else LiveReportSynthesizer(self.model_factory())
            except ModelError as error: raise ResearchError(error.error.code) from None
            identity=self.store.begin(bundle,body.mode,request_id=body.request_id,
                model_identity=getattr(getattr(synthesizer,'model',None),'settings_identity',None))
            work=self.work=Generation(identity,bundle,synthesizer)
            work.coordinator=threading.Thread(target=self.execute,args=(work,),daemon=True,name='report-coordinator')
            try: work.coordinator.start()
            except Exception: self.store.finish(identity,'failed','WORKER_START_FAILED')
            return self.store.get(identity)

    def invoke(self,work,deadline):
        try: work.output=work.synthesizer.synthesize(work.bundle,work.stop,deadline)
        except ResearchError as error: work.code=error.code
        except ModelError as error: work.code=error.error.code
        except Exception: work.code='REPORT_GENERATION_FAILED'
        finally: work.ended=time.monotonic(); work.done.set()

    def execute(self,work):
        deadline=time.monotonic()+self.timeout_seconds
        try:
            with self.lock:
                if work.stop.is_set(): return
                if not self.store.before_call(work.identity): return
                work.thread=threading.Thread(target=self.invoke,args=(work,deadline),daemon=True,name='report-synthesis')
                work.thread.start()
            while not work.done.wait(0.025):
                with self.lock:
                    if work.stop.is_set(): return
                    if time.monotonic()>=deadline:
                        work.stop.set(); self.store.finish(work.identity,'failed','REPORT_TIMEOUT',requests_started=self.requests(work)); return
            with self.lock:
                if work.stop.is_set(): return
                if work.ended>=deadline:
                    self.store.finish(work.identity,'failed','REPORT_TIMEOUT',requests_started=self.requests(work)); return
                if work.code:
                    uncertain=None if work.code in ('MODEL_TIMEOUT','MODEL_NETWORK_ERROR') else False
                    self.store.finish(work.identity,'failed',work.code,requests_started=self.requests(work),request_uncertain=uncertain); return
                synthesis=validate(work.output,work.bundle['evidence'])
                validate_forecast_time(synthesis,work.bundle,self.store.get(work.identity).started_at)
                document=ReportDocument(**work.bundle,synthesis=synthesis)
                self.research.validate_checkpoint(work.bundle['source_run_id'])
                self.store.finish(work.identity,'completed',document=document,requests_started=self.requests(work),request_uncertain=False)
        except ResearchError as error:
            with self.lock: self.store.finish(work.identity,'failed',error.code,requests_started=self.requests(work),request_uncertain=False)
        except Exception:
            with self.lock: self.store.finish(work.identity,'failed','REPORT_GENERATION_FAILED',requests_started=self.requests(work),request_uncertain=False)

    def cancel(self,identity):
        with self.lock:
            work=self.work if self.work and self.work.identity==identity else None
            if work: work.stop.set()
            self.store.finish(identity,'cancelled','CANCELLED',requests_started=self.requests(work) if work else 0)
            return self.store.get(identity)

    def completed(self,identity):
        job=self.store.get(identity)
        if job.status!='completed' or job.document is None: raise ResearchError('REPORT_NOT_READY')
        return job

    def evidence(self,identity,evidence_id):
        job=self.completed(identity)
        fact=next((f for f in job.document.evidence if f.id==evidence_id),None)
        if fact is None: raise ResearchError('EVIDENCE_INVALID')
        return ReportOriginal(**original(self.research,fact))

    def close(self):
        with self.lock:
            self.closed=True
            if self.work:
                self.work.stop.set()
                self.store.finish(self.work.identity,'interrupted','BACKEND_INTERRUPTED',requests_started=self.requests(self.work))
        if self.work:
            for thread in (self.work.coordinator,self.work.thread):
                if thread: thread.join(timeout=0.3)
