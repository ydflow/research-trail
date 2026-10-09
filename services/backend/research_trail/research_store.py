"""Atomic collection history. Late workers never write to this store."""
from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer
from .models import ResearchRecord, ResearchStepRecord, ResearchActionRecord
from . import research_checkpoints as checkpoints
from .research_contracts import ResearchRun, ResearchSummary, ResearchData

class ResearchError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)

def now():
    return datetime.now(timezone.utc).isoformat()

class ResearchStore:
    def __init__(self, database):
        self.database = database

    @staticmethod
    def row(db, identity):
        try:
            if str(UUID(identity)) != identity: raise ValueError()
        except (ValueError, TypeError, AttributeError): raise ResearchError('RESEARCH_NOT_FOUND') from None
        row = db.get(ResearchRecord, identity)
        if row is None: raise ResearchError('RESEARCH_NOT_FOUND')
        return row

    @staticmethod
    def steps(db, identity):
        return list(db.scalars(select(ResearchStepRecord).where(ResearchStepRecord.run_id == identity)
            .options(defer(ResearchStepRecord.result)).order_by(ResearchStepRecord.ordinal)))

    @staticmethod
    def summary(row, counts):
        return dict(id=row.id, **{k: row.plan['input'][k] for k in ('symbol', 'strategy', 'mode', 'provider')},
            status=row.status, started_at=row.started_at, completed_at=row.completed_at,
            total=sum(counts.values()), completed=sum(n for s,n in counts.items() if s not in ('queued','running')),
            succeeded=counts.get('success',0), failed=sum(n for s,n in counts.items() if s not in ('queued','running','success')),
            generation=row.generation,parent_run_id=row.parent_run_id,abandoned_at=row.abandoned_at)

    def get(self, identity):
        with self.database.sessions() as db:
            # One read transaction prevents a terminal header with stale running steps.
            db.connection().exec_driver_sql('BEGIN')
            row = self.row(db, identity); steps = self.steps(db, identity)
            counts = {}
            for step in steps: counts[step.status] = counts.get(step.status,0)+1
            return ResearchRun(**self.summary(row,counts), plan=row.plan, steps=[dict(capability=s.capability,
                ordinal=s.ordinal, status=s.status, code=s.code, started_at=s.started_at, completed_at=s.completed_at,
                has_result=s.status=='success') for s in steps])

    def list(self):
        with self.database.sessions() as db:
            db.connection().exec_driver_sql('BEGIN')
            rows = list(db.scalars(select(ResearchRecord).order_by(ResearchRecord.started_at.desc(), ResearchRecord.id).limit(100)))
            counts = {r.id:{} for r in rows}
            for identity,status,n in db.execute(select(ResearchStepRecord.run_id,ResearchStepRecord.status,func.count())
                .where(ResearchStepRecord.run_id.in_(counts)).group_by(ResearchStepRecord.run_id,ResearchStepRecord.status)):
                counts[identity][status]=n
            return [ResearchSummary(**self.summary(r,counts[r.id])) for r in rows]

    def data(self, identity, capability):
        with self.database.sessions() as db:
            db.connection().exec_driver_sql('BEGIN')
            checkpoints.verify(db,self.row(db,identity))
            step = db.get(ResearchStepRecord,(identity,capability))
            if step is None or step.status != 'success': raise ResearchError('RESULT_NOT_AVAILABLE')
            return ResearchData(run_id=identity,capability=capability,result=step.result)

    def begin(self, plan, *, parent_run_id=None, request_id=None):
        identity, started = str(uuid4()), now()
        try:
            with self.database.write() as db:
                row=ResearchRecord(id=identity,status='fetching',plan=plan.model_dump(mode='json'),started_at=started,
                    generation=0,parent_run_id=parent_run_id)
                db.add(row)
                db.flush()
                for ordinal,read in enumerate(plan.reads,1):
                    available = read.availability.available or read.availability.can_attempt
                    db.add(ResearchStepRecord(run_id=identity,capability=read.capability,ordinal=ordinal,
                        status='queued' if available else 'unavailable',code=None if available else read.availability.code,
                        completed_at=None if available else started))
                checkpoints.save(db,row,'started')
                if request_id: db.add(ResearchActionRecord(request_id=request_id,run_id=parent_run_id,operation='restart',target_run_id=identity,created_at=started))
        except IntegrityError: raise ResearchError('RESEARCH_ACTIVE') from None
        return identity

    def active(self):
        with self.database.sessions() as db:
            return db.scalar(select(ResearchRecord.id).where(ResearchRecord.status=='fetching'))

    def step(self, identity, capability, status, code=None, result=None, *, generation=None):
        with self.database.write() as db:
            row = self.row(db,identity)
            s = db.get(ResearchStepRecord,(identity,capability))
            if row.status != 'fetching' or row.abandoned_at or (generation is not None and generation!=row.generation) or s is None or s.status not in ('queued','running'): return False
            checkpoints.verify(db,row)
            s.status, s.code, s.result = status, code, result
            if status=='running': s.started_at=now()
            else: s.completed_at=now()
            checkpoints.save(db,row,'step:'+capability)
            return True

    def finish(self, identity, status=None, code=None, *, generation=None):
        with self.database.write() as db:
            row = self.row(db,identity)
            if row.status != 'fetching' or row.abandoned_at or (generation is not None and generation!=row.generation): return
            # A corrupted active checkpoint must still stop polling, but may not
            # become a trusted success or be silently repaired.
            valid=True
            try: checkpoints.verify(db,row)
            except ResearchError:
                valid=False; status='interrupted'; code='CHECKPOINT_INVALID'
            steps = self.steps(db,identity); timestamp=now()
            if status in ('cancelled','interrupted','failed'):
                for s in steps:
                    if s.status in ('queued','running'):
                        s.status, s.code, s.completed_at = status, code, timestamp
            if any(s.status in ('queued','running') for s in steps): return
            successes = sum(s.status=='success' for s in steps)
            row.status = status or ('collected' if successes==len(steps) and successes else 'partial' if successes else 'failed')
            row.completed_at = timestamp
            checkpoints.save(db,row,'finished',valid=valid)

    def recover(self):
        identity = self.active()
        if identity: self.finish(identity,'interrupted','BACKEND_INTERRUPTED')

    def validate_checkpoint(self,identity):
        with self.database.sessions() as db:
            db.connection().exec_driver_sql('BEGIN')
            return checkpoints.verify(db,self.row(db,identity)).id

    def action(self,identity,operation,request_id):
        with self.database.sessions() as db:
            row=db.get(ResearchActionRecord,request_id)
            if row and (row.run_id!=identity or row.operation!=operation): raise ResearchError('ACTION_ID_CONFLICT')
            return row.target_run_id if row else None

    def resume(self,identity,request_id):
        with self.database.write() as db:
            row=self.row(db,identity); checkpoints.verify(db,row)
            if row.abandoned_at: raise ResearchError('RESEARCH_ABANDONED')
            if row.status!='fetching':
                steps=self.steps(db,identity)
                for s in steps:
                    if s.status in ('interrupted','cancelled','queued','running'):
                        s.status,s.code,s.started_at,s.completed_at,s.result='queued',None,None,None,None
                pending=any(s.status=='queued' for s in steps)
                if pending:
                    row.generation+=1; row.status='fetching'; row.completed_at=None
                elif row.status in ('interrupted','cancelled'):
                    successes=sum(s.status=='success' for s in steps)
                    row.status='collected' if successes==len(steps) and successes else 'partial' if successes else 'failed'
                checkpoints.save(db,row,'resume')
            db.add(ResearchActionRecord(request_id=request_id,run_id=identity,operation='resume',target_run_id=identity,created_at=now()))
        return self.get(identity)
