"""Durable report conversion and explicit review, over the existing report/data stores.

Folio ba5dcdfd core/thesis.ts and thesis/converter.ts are conceptual references.
No local news/price heuristic assigns investment impact; missing data is unable.
"""
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import select
from .models import ThesisRecord, ThesisVersionRecord, ThesisReviewRecord
from .research_store import ResearchError, now
from .report_facts import canonical, result_hash, original
from .report_output import diff
from .thesis_contracts import (ThesisContent, ThesisSummary, ThesisVersionSummary,
    ThesisVersion, ThesisReviewSummary, ThesisReview, ThesisView)


class ThesisService:
    def __init__(self, database, reports):
        self.database, self.reports = database, reports

    @staticmethod
    def row(db, identity):
        try:
            if str(UUID(identity)) != identity: raise ValueError()
        except (ValueError, TypeError, AttributeError): raise ResearchError('THESIS_NOT_FOUND') from None
        row = db.get(ThesisRecord, identity)
        if row is None: raise ResearchError('THESIS_NOT_FOUND')
        return row

    @staticmethod
    def fields(row, schema):
        return {key: getattr(row, key) for key in schema.model_fields if hasattr(row, key)}

    def version_view(self, row):
        return ThesisVersion(**self.fields(row, ThesisVersion))

    def review_view(self, row):
        return ThesisReview(**self.fields(row, ThesisReviewSummary), evaluation_id=row.evaluation_id, **row.payload)

    def view(self, db, row):
        versions = db.scalars(select(ThesisVersionRecord).where(ThesisVersionRecord.thesis_id == row.id)
            .order_by(ThesisVersionRecord.version.desc()).limit(100)).all()
        reviews = db.scalars(select(ThesisReviewRecord).where(ThesisReviewRecord.thesis_id == row.id)
            .order_by(ThesisReviewRecord.created_at.desc(), ThesisReviewRecord.id).limit(100)).all()
        return ThesisView(**self.fields(row, ThesisSummary), current=self.version_view(versions[0]),
            versions=[ThesisVersionSummary(**self.fields(v, ThesisVersionSummary)) for v in versions],
            reviews=[ThesisReviewSummary(**self.fields(r, ThesisReviewSummary)) for r in reviews])

    def list(self):
        with self.database.sessions() as db:
            return [ThesisSummary(**self.fields(row, ThesisSummary)) for row in db.scalars(
                select(ThesisRecord).order_by(ThesisRecord.created_at.desc(), ThesisRecord.id).limit(100))]

    def get(self, identity):
        with self.database.sessions() as db: return self.view(db, self.row(db, identity))

    def version(self, identity, version):
        with self.database.sessions() as db:
            thesis = self.row(db, identity)
            if version < 1 or version > thesis.current_version: raise ResearchError('THESIS_VERSION_NOT_FOUND')
            row = db.get(ThesisVersionRecord, (identity, version))
            if row is None: raise ResearchError('THESIS_VERSION_NOT_FOUND')
            return self.version_view(row)

    def review(self, identity, review_id):
        with self.database.sessions() as db:
            self.row(db, identity)
            row = db.get(ThesisReviewRecord, review_id)
            if row is None or row.thesis_id != identity: raise ResearchError('THESIS_REVIEW_NOT_FOUND')
            return self.review_view(row)

    @staticmethod
    def fingerprint(operation, identity, body):
        return result_hash(dict(operation=operation, identity=identity, input=body.model_dump(mode='json')))

    @staticmethod
    def replay(db, request_id, digest):
        for table in (ThesisVersionRecord, ThesisReviewRecord):
            row = db.scalar(select(table).where(table.request_id == request_id))
            if row is not None:
                if row.request_hash != digest: raise ResearchError('THESIS_REQUEST_CONFLICT')
                return row
        return None

    def checked(self, report_id, snapshot=None):
        job = self.reports.completed(report_id)
        if snapshot is not None and canonical(job.model_dump(mode='json')) != canonical(snapshot):
            raise ResearchError('EVIDENCE_CHANGED')
        self.reports.research.validate_checkpoint(job.run_id)
        for fact in job.document.evidence: original(self.reports.research, fact)
        if not job.document.evidence: raise ResearchError('NO_USABLE_FACT')
        return job

    @staticmethod
    def convert_content(job):
        doc = job.document
        # Converted prose is analysis, never a new numeric facts source. Facts
        # are rendered separately from the preserved report evidence snapshot.
        groups = {}
        for key in ('summary', 'bull_case', 'bear_case', 'catalysts', 'risks'):
            texts = []
            for claim in getattr(doc.synthesis, key):
                if claim.kind == 'fact':
                    texts.append('来源报告事实引用：' + '、'.join(claim.evidence_ids))
                else: texts.append(('【预测】' if claim.kind == 'prediction' else '【分析】') + claim.text)
            groups[key] = texts
        return ThesisContent(stance=doc.synthesis.stance, summary='\n'.join(groups.pop('summary')), **groups)

    def append_version(self, db, row, body, digest, content, job, origin, reason):
        version = row.current_version
        db.add(ThesisVersionRecord(thesis_id=row.id, version=version, origin=origin, reason=reason,
            created_at=now(), report_id=job.id, content=content.model_dump(mode='json'),
            data_report=job.model_dump(mode='json'), request_id=body.request_id, request_hash=digest))
        db.flush()

    def create(self, body):
        digest = self.fingerprint('create', None, body)
        with self.database.write() as db:
            saved = self.replay(db, body.request_id, digest)
            if saved: return self.view(db, self.row(db, saved.thesis_id))
            existing = db.scalar(select(ThesisRecord).where(ThesisRecord.origin_report_id == body.report_id))
            if existing: return self.view(db, existing)
            job = self.checked(body.report_id)
            row = ThesisRecord(id=str(uuid4()), symbol=job.symbol, origin_report_id=job.id,
                current_version=1, created_at=now())
            db.add(row); db.flush()
            self.append_version(db, row, body, digest, self.convert_content(job), job, 'report',
                '从已保存报告转换；保留来源事实，不额外采集或调用模型。')
            return self.view(db, row)

    @staticmethod
    def expected(row, version):
        if row.current_version != version: raise ResearchError('THESIS_VERSION_CONFLICT')

    def edit(self, identity, body):
        digest = self.fingerprint('edit', identity, body)
        with self.database.write() as db:
            row = self.row(db, identity)
            if self.replay(db, body.request_id, digest): return self.view(db, row)
            self.expected(row, body.expected_version)
            old = self.version_view(db.get(ThesisVersionRecord, (identity, row.current_version)))
            row.current_version += 1
            self.append_version(db, row, body, digest, body.content, old.data_report, 'edit', body.reason)
            return self.view(db, row)

    def assess(self, baseline, report_id):
        candidate, difference, missing = None, None, []
        try:
            self.checked(baseline.report_id, baseline.data_report.model_dump(mode='json'))
            if report_id is None: raise ResearchError('NEW_DATA_REQUIRED')
            candidate = self.reports.completed(report_id)
            a, b = baseline.data_report.document, candidate.document
            if a.symbol != b.symbol or a.source_mode != b.source_mode or a.provider != b.provider:
                raise ResearchError('THESIS_SOURCE_INCOMPATIBLE')
            old_run = self.reports.research.get(a.source_run_id)
            new_run = self.reports.research.get(b.source_run_id)
            if old_run.id == new_run.id or new_run.started_at <= old_run.started_at:
                raise ResearchError('FRESH_COLLECTION_REQUIRED')
            candidate = self.checked(report_id)
            difference = diff(baseline.data_report, candidate)
            left = {(f.capability, f.pointer): f for f in a.evidence}
            right = {(f.capability, f.pointer): f for f in b.evidence}
            missing = [cap + path for cap, path in sorted(left.keys() - right.keys())]
            if missing: raise ResearchError('MISSING_NEW_FACTS')
            # Fresh execution alone is not fresh data: saved cache/fetched_at is
            # inspected as well. No extra provider call is made by the evaluator.
            for key, old in left.items():
                new = right[key]
                raw = original(self.reports.research, new)
                if raw['result'].provenance.cached or datetime.fromisoformat(new.fetched_at) <= datetime.fromisoformat(old.fetched_at):
                    raise ResearchError('STALE_NEW_DATA')
            changed = sum(c.kind == 'fact' for c in difference.changes)
            comparison = 'changed' if changed else 'unchanged'
            reason = (f'可比较事实记录中有{changed}处字段变化，等待用户判断投资影响。' if changed else
                '本次已取得的新数据在旧论点对应字段内未发现变化；不等于投资论点已被证明或完整资料无变化。')
            return candidate, difference, missing, 'ready', None, comparison, reason
        except ResearchError as error:
            return candidate, difference, missing, 'unable', error.code, None, '无法完成评估：' + error.code + '。不生成论点变化结论。'

    def evaluate(self, identity, body):
        digest = self.fingerprint('evaluate', identity, body)
        with self.database.write() as db:
            row = self.row(db, identity)
            saved = self.replay(db, body.request_id, digest)
            if saved: return self.review_view(saved)
            self.expected(row, body.expected_version)
            baseline = self.version_view(db.get(ThesisVersionRecord, (identity, row.current_version)))
            candidate, difference, missing, status, code, comparison, reason = self.assess(baseline, body.report_id)
            saved = ThesisReviewRecord(id=str(uuid4()), thesis_id=identity, base_version=row.current_version,
                new_version=None, kind='evaluation', status=status, code=code, comparison=comparison,
                judgment=None, reason=reason, created_at=now(), report_id=candidate.id if candidate else None,
                evaluation_id=None, request_id=body.request_id, request_hash=digest,
                payload=dict(requested_report_id=body.report_id, base_content=baseline.content.model_dump(mode='json'),
                    baseline_report=baseline.data_report.model_dump(mode='json'),
                    candidate_report=candidate.model_dump(mode='json') if candidate else None,
                    difference=difference.model_dump(mode='json') if difference else None, missing_keys=missing))
            db.add(saved); db.flush()
            return self.review_view(saved)

    def judge(self, identity, body):
        digest = self.fingerprint('judge', identity, body)
        with self.database.write() as db:
            row = self.row(db, identity)
            if self.replay(db, body.request_id, digest): return self.view(db, row)
            self.expected(row, body.expected_version)
            evaluation = db.get(ThesisReviewRecord, body.evaluation_id)
            if evaluation is None or evaluation.thesis_id != identity or evaluation.kind != 'evaluation':
                raise ResearchError('THESIS_REVIEW_NOT_FOUND')
            if evaluation.status != 'ready': raise ResearchError('THESIS_EVALUATION_UNAVAILABLE')
            if evaluation.base_version != row.current_version: raise ResearchError('THESIS_VERSION_CONFLICT')
            if db.scalar(select(ThesisReviewRecord).where(ThesisReviewRecord.evaluation_id == evaluation.id)):
                raise ResearchError('THESIS_EVALUATION_ALREADY_REVIEWED')
            baseline = self.version_view(db.get(ThesisVersionRecord, (identity, row.current_version)))
            candidate, _, _, status, code, _, _ = self.assess(baseline, evaluation.report_id)
            if status != 'ready': raise ResearchError(code)
            if canonical(candidate.model_dump(mode='json')) != canonical(evaluation.payload['candidate_report']):
                raise ResearchError('EVIDENCE_CHANGED')
            old_version = row.current_version
            row.current_version += 1
            self.append_version(db, row, body, digest, body.content, candidate, 'review', body.reason)
            # Request id belongs to the version; the linked judgment is audited
            # separately with its own id, without mutating the old evaluation.
            db.add(ThesisReviewRecord(id=str(uuid4()), thesis_id=identity, base_version=old_version,
                new_version=row.current_version, kind='judgment', status='reviewed', code=None,
                comparison=evaluation.comparison, judgment=body.judgment, reason=body.reason,
                created_at=now(), report_id=candidate.id, evaluation_id=evaluation.id,
                request_id=str(uuid4()), request_hash=digest, payload=evaluation.payload))
            db.flush()
            return self.view(db, row)
