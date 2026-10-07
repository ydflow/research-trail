"""Explicit resume/restart/abandon over the existing collection and report stores.

Conceptual Folio service.ts/checkpoint.ts, fixed ba5dcdfd. No TS state kernel,
file checkpoints, automatic synthesis retries or second capability registry.
"""
from sqlalchemy import select
from .models import ReportRecord, ResearchActionRecord
from .research_store import ResearchError, now
from .research_contracts import RecoveryView, ResearchInput, ResearchPlan
from .research import Work
from .research_checkpoints import latest, verify, save
from .openai_provider import ModelError
from .provider_errors import ProviderFault

class ResearchRecovery:
    def __init__(self,research,reports,settings):
        self.research,self.reports,self.settings=research,reports,settings
        self.store=research.store

    def inspect(self,identity):
        with self.store.database.sessions() as db:
            db.connection().exec_driver_sql('BEGIN')
            row=self.store.row(db,identity); steps=self.store.steps(db,identity); cp=latest(db,identity)
            reports=list(db.scalars(select(ReportRecord).where(ReportRecord.run_id==identity).order_by(ReportRecord.version)))
            code='READY'; warnings=[]
            try: verify(db,row)
            except ResearchError as error: code=error.code
            pending=[s.capability for s in steps if s.status in ('queued','running','interrupted','cancelled')]
            reuse=[s.capability for s in steps if s.status=='success']
            if code!='READY': reuse=[]
            if row.abandoned_at: stage='abandoned'
            elif code!='READY': stage='blocked'
            elif row.status=='fetching': stage='collecting'
            elif reports and reports[-1].status=='generating': stage='report_generating'
            elif pending: stage='collection_interrupted'
            elif not reuse: stage='no_data'
            elif reports and reports[-1].status=='completed': stage='completed'
            else: stage='awaiting_report'
            allowed=stage in ('collection_interrupted','awaiting_report','completed')
            if pending and code=='READY' and not row.abandoned_at:
                plan=ResearchPlan.model_validate(row.plan)
                with self.research.providers.settings.lock:
                    profile=self.research.providers.settings.profile(plan.input.provider)
                    if profile.revision!=plan.provider_revision or (plan.provider_identity is not None and self.research.providers.settings.identity(plan.input.provider)!=plan.provider_identity):
                        code='CONFIG_CHANGED'; allowed=False
                    elif plan.provider_identity is None and plan.input.mode=='real':
                        code='LEGACY_IDENTITY_UNKNOWN'; allowed=False
                    else:
                        for read in plan.reads:
                            if read.capability not in pending: continue
                            state=self.research.registry.state(read.capability,plan.input.mode,plan.input.provider)
                            if not state.available:
                                if read.availability.available and state.code=='REAL_UNVERIFIED':
                                    warnings.append('REAL_READINESS_RECHECK_ON_RESUME')
                                else: code=state.code; allowed=False; break
                        if allowed and plan.input.mode=='real':
                            try: self.research.providers.settings.snapshot(plan.input.provider)
                            except ProviderFault as error: code=error.code; allowed=False
                if not allowed and stage!='collecting': stage='blocked'
            if reports and reports[-1].mode=='real':
                report=reports[-1]
                if report.model_identity is None: warnings.append('MODEL_IDENTITY_UNKNOWN')
                elif report.model_identity!=self.settings.model_identity(): warnings.append('MODEL_CONFIG_CHANGED')
                # Readonly preflight only. No provider, model creation or HTTP request.
                try: self.settings.model_configuration()
                except ModelError as error: warnings.append(error.error.code)
            if stage=='no_data': code='NO_COLLECTED_DATA'
            if stage=='abandoned': code='RESEARCH_ABANDONED'
            return RecoveryView(run_id=identity,checkpoint_id=cp.id if cp else None,generation=row.generation,
                stage=stage,resume_allowed=allowed,code=code,reuse_capabilities=reuse,remaining_capabilities=pending,
                report_ids=[r.id for r in reports],warnings=sorted(set(warnings)),
                model_request_uncertain=any(r.request_uncertain for r in reports))

    def resume(self,identity,body):
        with self.research.lock,self.reports.lock:
            prior=self.store.action(identity,'resume',body.request_id)
            if prior: return self.store.get(prior)
            view=self.inspect(identity)
            if view.stage=='report_generating': raise ResearchError('REPORT_ACTIVE')
            # Repeated clicks during collection are harmless and never reopen it.
            if view.stage not in ('collecting',) and not view.resume_allowed: raise ResearchError(view.code if view.code!='READY' else 'RECOVERY_NOT_AVAILABLE')
            if view.remaining_capabilities and view.code!='READY': raise ResearchError(view.code)
            return self.research.resume(identity,body.request_id)

    def restart(self,identity,body):
        with self.research.lock,self.reports.lock:
            prior=self.store.action(identity,'restart',body.request_id)
            if prior: return self.store.get(prior)
            if self.research.closed or self.reports.closed: raise ResearchError('BACKEND_CLOSED')
            if self.store.active(): raise ResearchError('RESEARCH_ACTIVE')
            if self.reports.work and self.reports.store.get(self.reports.work.identity).status=='generating': raise ResearchError('REPORT_ACTIVE')
            if self.reports.work and self.reports.work.thread and self.reports.work.thread.is_alive(): raise ResearchError('REPORT_DRAINING')
            self.research.calls=[c for c in self.research.calls if c.thread and c.thread.is_alive()]
            if self.research.calls: raise ResearchError('EXECUTOR_DRAINING')
            saved=self.store.get(identity)
            plan=self.research.plan(ResearchInput.model_validate(saved.plan.input))
            new=self.store.begin(plan,parent_run_id=identity,request_id=body.request_id)
            import threading
            work=self.research.work=Work(new,plan)
            try:
                work.thread=threading.Thread(target=self.research.execute,args=(work,),daemon=True,name=f'research-{new}')
                work.thread.start()
            except Exception:
                self.store.finish(new,'interrupted','WORKER_START_FAILED'); self.research.work=None
            return self.store.get(new)

    def abandon(self,identity,body):
        with self.research.lock,self.reports.lock:
            prior=self.store.action(identity,'abandon',body.request_id)
            if prior: return self.store.get(prior)
            if self.research.closed or self.reports.closed: raise ResearchError('BACKEND_CLOSED')
            work=self.research.work
            report=self.reports.work
            with self.store.database.write() as db:
                row=self.store.row(db,identity)
                valid=True
                try: verify(db,row)
                except ResearchError: valid=False
                if not row.abandoned_at:
                    timestamp=now(); row.abandoned_at=timestamp
                    if row.status=='fetching': row.status='cancelled'; row.completed_at=timestamp
                    for s in self.store.steps(db,identity):
                        if s.status in ('queued','running','interrupted','cancelled'):
                            s.status,s.code,s.completed_at='cancelled','RESEARCH_ABANDONED',timestamp
                    for r in db.scalars(select(ReportRecord).where(ReportRecord.run_id==identity,ReportRecord.status=='generating')):
                        r.status,r.code,r.completed_at='cancelled','RESEARCH_ABANDONED',timestamp
                        if report and report.identity==r.id: r.requests_started=self.reports.requests(report)
                    save(db,row,'abandon',valid=valid)
                db.add(ResearchActionRecord(request_id=body.request_id,run_id=identity,operation='abandon',target_run_id=identity,created_at=now()))
            if work and work.identity==identity:
                work.stop.set()
                for call in work.calls: call.stop.set()
            if report and report.bundle['source_run_id']==identity: report.stop.set()
            return self.store.get(identity)
