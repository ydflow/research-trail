"""Durable offline experiments; execution validity is separate from quality."""
from collections import Counter
from hashlib import sha256
from pathlib import Path
from datetime import datetime, timezone
import threading
from uuid import uuid4
from sqlalchemy import select,func
from .calendar_normalize import digest
from .models import EvaluationExperimentRecord as Experiment, EvaluationBaselineRecord as Baseline, EvaluationFeedbackRecord as Feedback
from .evaluation_cases import CATALOG
from .evaluation_contracts import ExperimentView, ExperimentSummary, CaseResult, BaselineView, BaselineSummary, FeedbackView, EvaluationComparison
from .evaluation_engine import execute_case
from .store import RunStopped

class EvaluationError(Exception):
    def __init__(self,code):self.code=code;super().__init__(code)

def now():return datetime.now(timezone.utc).isoformat()

def summarize(view):
    counts=Counter(r.status for r in view.results);view.counts=dict(counts)
    view.origin_counts=dict(Counter(c.origin for c in view.cases))
    view.failure_counts=dict(Counter(r.code or 'NO_RESULT' for r in view.results if r.status in ('quality_failed','run_error')))
    view.score=None
    if counts.get('run_error'):
        view.validity='invalid'
    elif counts.get('running') or counts.get('not_run') or counts.get('cancelled'):
        view.validity='not_executed' if all(r.status=='not_run' for r in view.results) else 'inconclusive'
    elif view.results and all(r.status in ('passed','quality_failed') and r.score is not None for r in view.results):
        view.validity='valid';view.score=sum(r.score for r in view.results)/len(view.results)
    else:view.validity='invalid'
    return view

class EvaluationService:
    def __init__(self,database,*,engine=execute_case,clock=now):
        self.database=database;self.engine=engine;self.clock=clock;self.lock=threading.RLock();self.work={};self.closed=False
        folder=Path(__file__).parent
        self.implementation_hash=sha256(b''.join((folder/name).read_bytes().replace(b'\r\n',b'\n') for name in
            ('evaluation.py','evaluation_contracts.py','evaluation_engine.py','evaluation_cases.py','evaluation_trace.py','agent.py','tools.py','market.py','model_provider.py','store.py'))).hexdigest()
        with database.write() as db:
            for row in db.scalars(select(Experiment).where(Experiment.status=='running')):
                view=ExperimentView.model_validate(row.payload)
                for r in view.results:
                    if r.status=='running':r.status='run_error';r.code='APPLICATION_RESTARTED';r.failure_stage='runtime';r.score=None
                view.status='run_error';view.completed_at=clock();self.save(row,summarize(view))

    @staticmethod
    def save(row,view):row.payload=view.model_dump(mode='json');row.status=view.status
    @staticmethod
    def row(db,identity):
        row=db.get(Experiment,str(identity))
        if row is None:raise EvaluationError('EXPERIMENT_NOT_FOUND')
        return row

    def get(self,identity):
        with self.database.sessions() as db:return ExperimentView.model_validate(self.row(db,identity).payload)
    def history(self):
        with self.database.sessions() as db:
            return [ExperimentSummary(id=r.id,name=r.payload['input']['name'],profile=r.payload['input']['profile'],
                    created_at=r.created_at,status=r.status,validity=r.payload['validity'],score=r.payload['score'],counts=r.payload['counts'])
                    for r in db.scalars(select(Experiment).order_by(Experiment.created_at.desc(),Experiment.id).limit(100))]
    def create(self,body):
        if any(c not in CATALOG for c in body.case_ids):raise EvaluationError('UNKNOWN_EVALUATION_CASE')
        cases=[CATALOG[c] for c in sorted(body.case_ids)];fingerprint=digest(body.model_dump(mode='json'))
        with self.database.write() as db:
            old=db.scalar(select(Experiment).where(Experiment.request_id==str(body.request_id)))
            if old:
                if old.request_hash!=fingerprint:raise EvaluationError('EXPERIMENT_REQUEST_CONFLICT')
                return ExperimentView.model_validate(old.payload)
            if db.scalar(select(func.count()).select_from(Experiment))>=500:raise EvaluationError('EXPERIMENT_LIMIT')
            view=ExperimentView(id=str(uuid4()),input=body,created_at=self.clock(),cases=cases,
                suite_hash=digest({'cases':[c.model_dump() for c in cases],'evaluator':'rt-engineering-v1','implementation':self.implementation_hash,'fixture':'authored-v1'}),
                results=[CaseResult(case_id=c.id) for c in cases])
            view=summarize(view)
            db.add(Experiment(id=view.id,request_id=str(body.request_id),request_hash=fingerprint,created_at=view.created_at,status=view.status,payload=view.model_dump(mode='json')))
        return view

    def start(self,identity):
        with self.lock:
            if self.closed:raise EvaluationError('EVALUATION_CLOSED')
            with self.database.write() as db:
                row=self.row(db,identity);view=ExperimentView.model_validate(row.payload)
                if view.status!='not_run':return view
                current_hash=digest({'cases':[c.model_dump() for c in view.cases],'evaluator':'rt-engineering-v1',
                                     'implementation':self.implementation_hash,'fixture':'authored-v1'})
                if view.suite_hash!=current_hash:raise EvaluationError('EVALUATION_IMPLEMENTATION_CHANGED')
                if db.scalar(select(Experiment.id).where(Experiment.status=='running')):raise EvaluationError('EVALUATION_BUSY')
                view.status='running';self.save(row,view)
            stop=threading.Event();thread=threading.Thread(target=self.execute,args=(str(identity),stop),daemon=True,name='research-trail-offline-evaluation')
            self.work[str(identity)]=(stop,thread);thread.start()
        return self.get(identity)

    def execute(self,identity,stop):
        try:
            initial=self.get(identity)
            for index,case in enumerate(initial.cases):
                if stop.is_set():break
                with self.database.write() as db:
                    row=self.row(db,identity);view=ExperimentView.model_validate(row.payload)
                    if row.status!='running':return
                    view.results[index].status='running';self.save(row,summarize(view))
                try:
                    result=self.engine(case,initial.input.profile,stop)
                    result=CaseResult.model_validate(result.model_dump() if isinstance(result,CaseResult) else result)
                    if result.case_id!=case.id:raise ValueError('wrong result identity')
                except RunStopped:break
                except Exception:
                    result=CaseResult(case_id=case.id,status='run_error',code='EVALUATOR_ERROR',failure_stage='evaluator')
                with self.database.write() as db:
                    row=self.row(db,identity);view=ExperimentView.model_validate(row.payload)
                    if row.status!='running' or stop.is_set():break
                    view.results[index]=result;self.save(row,summarize(view))
            with self.database.write() as db:
                row=self.row(db,identity);view=ExperimentView.model_validate(row.payload)
                if row.status!='running':return
                if stop.is_set():
                    for r in view.results:
                        if r.status in ('not_run','running'):r.status='cancelled';r.code='EVALUATION_CANCELLED';r.score=None
                summarize(view);view.completed_at=self.clock()
                view.status='cancelled' if stop.is_set() else 'run_error' if view.validity!='valid' else 'quality_failed' if any(r.status=='quality_failed' for r in view.results) else 'passed'
                self.save(row,view)
        finally:
            with self.lock:self.work.pop(identity,None)

    def cancel(self,identity):
        with self.lock:
            pair=self.work.get(str(identity))
            if pair:pair[0].set()
            with self.database.write() as db:
                row=self.row(db,identity);view=ExperimentView.model_validate(row.payload)
                if view.status in ('not_run','running'):
                    for r in view.results:
                        if r.status in ('not_run','running'):r.status='cancelled';r.code='EVALUATION_CANCELLED';r.score=None
                    view.status='cancelled';view.completed_at=self.clock();self.save(row,summarize(view))
            return self.get(identity)

    def close(self):
        with self.lock:
            self.closed=True;pairs=list(self.work.items())
            for _,(stop,_) in pairs:stop.set()
        for identity,(_,thread) in pairs:
            self.cancel(identity);thread.join(5)

    def baselines(self):
        with self.database.sessions() as db:return [BaselineSummary.model_validate({k:v for k,v in r.payload.items() if k!='results'}) for r in db.scalars(select(Baseline).order_by(Baseline.created_at.desc()).limit(100))]
    def baseline(self,body):
        fingerprint=digest(body.model_dump(mode='json'))
        with self.database.write() as db:
            old=db.scalar(select(Baseline).where(Baseline.request_id==str(body.request_id)))
            if old:
                if old.request_hash!=fingerprint:raise EvaluationError('BASELINE_REQUEST_CONFLICT')
                return BaselineView.model_validate(old.payload)
            view=ExperimentView.model_validate(self.row(db,body.experiment_id).payload)
            if view.status!='passed' or view.validity!='valid' or view.score is None:raise EvaluationError('BASELINE_REQUIRES_PASSED_EXPERIMENT')
            result=BaselineView(id=str(uuid4()),name=body.name,experiment_id=view.id,created_at=self.clock(),suite_hash=view.suite_hash,
                                evaluator_version=view.evaluator_version,results=view.results,score=view.score)
            db.add(Baseline(id=result.id,request_id=str(body.request_id),request_hash=fingerprint,experiment_id=view.id,created_at=result.created_at,payload=result.model_dump(mode='json')))
        return result

    def compare(self,identity,baseline_id):
        view=self.get(identity)
        with self.database.sessions() as db:
            row=db.get(Baseline,str(baseline_id))
            if row is None:raise EvaluationError('BASELINE_NOT_FOUND')
            base=BaselineView.model_validate(row.payload)
        comparable=view.validity=='valid' and view.score is not None and view.suite_hash==base.suite_hash and view.evaluator_version==base.evaluator_version
        comparison=EvaluationComparison(baseline_id=base.id,comparable=comparable,
            reason='相同案例/夹具/评估器快照且实验有效。' if comparable else '案例/夹具/评估器不同，或实验未完成/无效；不生成回归分数。')
        if comparable:
            comparison.delta=view.score-base.score
            old={r.case_id:r for r in base.results}
            comparison.regressed_cases=[r.case_id for r in view.results if r.score<old[r.case_id].score]
        view.comparison=comparison;return view

    def feedback(self,identity,body):
        fingerprint=digest({'experiment':str(identity),**body.model_dump(mode='json')})
        with self.database.write() as db:
            view=ExperimentView.model_validate(self.row(db,identity).payload)
            if body.case_id not in [c.id for c in view.cases]:raise EvaluationError('FEEDBACK_CASE_NOT_FOUND')
            old=db.scalar(select(Feedback).where(Feedback.request_id==str(body.request_id)))
            if old:
                if old.request_hash!=fingerprint:raise EvaluationError('FEEDBACK_REQUEST_CONFLICT')
                return FeedbackView.model_validate(old.payload)
            result=FeedbackView(**body.model_dump(),id=str(uuid4()),experiment_id=str(identity),created_at=self.clock())
            db.add(Feedback(id=result.id,request_id=str(body.request_id),request_hash=fingerprint,experiment_id=str(identity),created_at=result.created_at,payload=result.model_dump(mode='json')))
        return result
    def feedback_list(self,identity):
        self.get(identity)
        with self.database.sessions() as db:return [FeedbackView.model_validate(r.payload) for r in db.scalars(select(Feedback).where(Feedback.experiment_id==str(identity)).order_by(Feedback.created_at,Feedback.id).limit(200))]
