"""Immutable terminal report versions. Only the coordinator commits synthesis."""
from uuid import UUID, uuid4
from sqlalchemy import select, func
from sqlalchemy.orm import defer
from sqlalchemy.exc import IntegrityError
from .models import ReportRecord
from .report_contracts import ReportJob, ReportSummary
from .research_store import ResearchError, now

class ReportStore:
    def __init__(self,database): self.database=database

    @staticmethod
    def row(db,identity):
        try:
            if str(UUID(identity))!=identity: raise ValueError()
        except (ValueError,TypeError,AttributeError): raise ResearchError('REPORT_NOT_FOUND') from None
        row=db.get(ReportRecord,identity)
        if row is None: raise ResearchError('REPORT_NOT_FOUND')
        return row

    @staticmethod
    def summary(row):
        return {k:getattr(row,k) for k in ReportSummary.model_fields}

    def get(self,identity):
        with self.database.sessions() as db:
            row=self.row(db,identity)
            return ReportJob(**self.summary(row),document=row.document)

    def list(self,run_id=None):
        with self.database.sessions() as db:
            query=select(ReportRecord).options(defer(ReportRecord.document))
            if run_id is not None: query=query.where(ReportRecord.run_id==run_id)
            rows=db.scalars(query.order_by(ReportRecord.started_at.desc(),ReportRecord.id).limit(100))
            return [ReportSummary(**self.summary(row)) for row in rows]

    def begin(self,bundle,mode):
        identity=str(uuid4())
        try:
            with self.database.write() as db:
                version=(db.scalar(select(func.max(ReportRecord.version)).where(ReportRecord.run_id==bundle['source_run_id'])) or 0)+1
                db.add(ReportRecord(id=identity,run_id=bundle['source_run_id'],symbol=bundle['symbol'],version=version,
                    mode=mode,status='generating',started_at=now(),requests_started=0))
        except IntegrityError: raise ResearchError('REPORT_ACTIVE') from None
        return identity

    def finish(self,identity,status,code=None,document=None,requests_started=0):
        with self.database.write() as db:
            row=self.row(db,identity)
            if row.status!='generating': return
            row.status,row.code,row.completed_at=status,code,now()
            row.document=document.model_dump(mode='json') if document else None
            row.requests_started=requests_started

    def recover(self):
        with self.database.write() as db:
            for row in db.scalars(select(ReportRecord).where(ReportRecord.status=='generating')):
                row.status,row.code,row.completed_at='interrupted','BACKEND_INTERRUPTED',now()
