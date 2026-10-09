"""Python owns frozen opinions, observations, idempotency and append-only policies.

No automatic provider/model requests at startup or during GET/polling. A report
completion stores its default 1m opinion in the same transaction as the report.
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from uuid import uuid4
import threading
from sqlalchemy import select, func
from .models import (OutcomeOpinionRecord, OutcomeAttemptRecord, OutcomePolicyRecord,
    OutcomePolicyState, OutcomeSnapshotRecord, ResearchRecord, ResearchStepRecord, ReportRecord)
from .outcome_contracts import (OutcomeOpinion, OutcomeAttempt, OutcomeView, WeightParameters,
    WeightVersion, WeightHistory, PerformanceSnapshot, PerformanceRow)
from .outcome_engine import instant, window, calculate, aggregate, ENGINE_VERSION
from .provider_contracts import ReadQuery
from .report_facts import result_hash, resolve_pointer, canonical

class OutcomeError(Exception):
    def __init__(self, code): self.code = code; super().__init__(code)

class OutcomeService:
    def __init__(self, database, providers, reports, *, clock=None):
        self.database, self.providers, self.reports = database, providers, reports
        self.clock = clock or (lambda:datetime.now(timezone.utc))
        self.closed = False
        self.stop = threading.Event()
        with database.write() as db:
            if db.get(OutcomePolicyState, 1) is None:
                initial = WeightVersion(version=1, parent_version=None, rollback_version=None,
                    created_at=self.now(), reason='基线参数；权重仅供参考', parameters=WeightParameters())
                db.add(OutcomePolicyRecord(version=1, payload=initial.model_dump(mode='json')))
                db.flush()
                db.add(OutcomePolicyState(id=1, current_version=1))
            for row in db.scalars(select(OutcomeAttemptRecord).where(OutcomeAttemptRecord.status == 'running')):
                row.status = 'interrupted'
                row.payload = dict(row.payload, status='interrupted', code='BACKEND_INTERRUPTED', evaluated_at=self.now().isoformat())
        if reports is not None: reports.store.on_completed = self.capture_completed

    def now(self): return instant(self.clock())

    def close(self):
        self.closed = True
        self.stop.set()
        try:
            with self.database.write() as db:
                for row in db.scalars(select(OutcomeAttemptRecord).where(OutcomeAttemptRecord.status == 'running')):
                    row.status = 'interrupted'
                    row.payload = dict(row.payload, status='interrupted', code='BACKEND_CLOSED', evaluated_at=self.now().isoformat())
        except Exception:
            # A failed close write leaves the durable running claim. Startup
            # marks it interrupted; do not prevent other services/processes
            # from closing or leak a credential-bearing storage exception.
            pass

    @staticmethod
    def opinion_row(db, identity):
        row = db.get(OutcomeOpinionRecord, str(identity))
        if row is None: raise OutcomeError('OUTCOME_NOT_FOUND')
        return row

    def capture_completed(self, db, report):
        return self.freeze(db, report, '1m', 'prospective')

    def freeze(self, db, report, horizon, origin):
        existing = db.scalar(select(OutcomeOpinionRecord).where(OutcomeOpinionRecord.report_id == report.id,
            OutcomeOpinionRecord.horizon == horizon))
        if existing: return OutcomeOpinion.model_validate(existing.payload)
        if report.status != 'completed' or not report.document or not report.completed_at:
            raise OutcomeError('REPORT_NOT_COMPLETED')
        run = db.get(ResearchRecord, report.run_id)
        if run is None: raise OutcomeError('RESEARCH_NOT_FOUND')
        doc = report.document; research_at = instant(report.completed_at)
        captured = self.now(); end, due = window(research_at, horizon)
        entry = None; market_at = None; fetched_at = None; code = 'ENTRY_MISSING'
        evidence_ids = []
        quote = db.get(ResearchStepRecord, (report.run_id, 'market.quote'))
        if quote and quote.status == 'success' and quote.result:
            result = quote.result; data = result.get('data'); provenance = result.get('provenance', {})
            try:
                if not isinstance(data, dict) or data.get('symbol', report.symbol) != report.symbol: raise ValueError()
                if result.get('provider') != doc['provider'] or provenance.get('mode') != doc['source_mode']: raise ValueError()
                matching = [f for f in doc['evidence'] if f['capability'] == 'market.quote' and f['pointer'] == '/last_price']
                if len(matching) != 1: raise ValueError()
                fact = matching[0]
                if fact['result_hash'] != result_hash(result) or canonical(resolve_pointer(data, fact['pointer'])) != canonical(fact['value']): raise ValueError()
                raw_price = data['last_price']
                if isinstance(raw_price, bool): raise ValueError()
                price = Decimal(str(raw_price))
                if not price.is_finite() or price <= 0: raise ValueError()
                fetched_at = instant(provenance['fetched_at'])
                market_at = instant(data.get('market_time') or provenance['market_time'])
                if not quote.completed_at or instant(quote.completed_at) > research_at or fetched_at > research_at or market_at > research_at:
                    code = 'FUTURE_ENTRY_DATA'
                elif research_at-market_at > timedelta(days=7): code = 'ENTRY_STALE'
                else: entry = format(price, 'f'); code = None
                evidence_ids = [fact['id']]
            except (ValueError, TypeError, KeyError, InvalidOperation): code = 'ENTRY_INVALID'
        forecast=doc['synthesis'].get('forecast')
        probability=forecast['probability'] if forecast and forecast['horizon']==horizon and entry is not None else None
        opinion = OutcomeOpinion(id=str(uuid4()), report_id=report.id, report_version=report.version,
            report_hash=result_hash(dict(document=doc, version=report.version, completed_at=report.completed_at)),
            run_id=report.run_id, symbol=report.symbol, strategy=doc['strategy'],
            skill_ids=sorted(set(s['id'] for s in run.plan['skills'] if s['status'] in ('ready', 'partial'))),
            stance=doc['synthesis']['stance'], source_mode=doc['source_mode'], analysis_mode=report.mode,
            origin=origin, horizon=horizon, research_at=research_at, captured_at=captured, window_end=end, due_at=due,
            entry_price=entry, entry_market_at=market_at, entry_fetched_at=fetched_at, entry_code=code,
            provider=doc['provider'], provider_revision=run.plan['provider_revision'],
            provider_identity=run.plan.get('provider_identity'), evidence_ids=evidence_ids,
            confidence=probability, probability_event='stance-match-v1' if probability is not None else None)
        db.add(OutcomeOpinionRecord(id=opinion.id, report_id=report.id, horizon=horizon, payload=opinion.model_dump(mode='json')))
        return opinion

    def capture(self, body):
        # Adding a horizon to an old report is retrospective, never recast as a
        # precommitted historical judgment. Startup does not backfill old reports.
        with self.database.write() as db:
            report = db.get(ReportRecord, body.report_id)
            if report is None: raise OutcomeError('REPORT_NOT_FOUND')
            return self.freeze(db, report, body.horizon, 'retrospective')

    def opinions(self):
        with self.database.sessions() as db:
            rows = db.scalars(select(OutcomeOpinionRecord).order_by(OutcomeOpinionRecord.id).limit(101)).all()
            if len(rows) > 100: raise OutcomeError('OUTCOME_LIST_LIMIT')
            return [OutcomeOpinion.model_validate(row.payload) for row in rows]

    def get(self, identity):
        with self.database.sessions() as db:
            opinion = OutcomeOpinion.model_validate(self.opinion_row(db, identity).payload)
            rows = db.scalars(select(OutcomeAttemptRecord).where(OutcomeAttemptRecord.opinion_id == opinion.id)
                .order_by(OutcomeAttemptRecord.id).limit(101)).all()
            if len(rows) > 100: raise OutcomeError('OUTCOME_HISTORY_LIMIT')
            attempts = sorted((OutcomeAttempt.model_validate(row.payload) for row in rows), key=lambda a:(a.started_at, a.id))
            return OutcomeView(opinion=opinion, attempts=attempts)

    def evaluate(self, identity, body):
        now = self.now(); request = body.request_id
        with self.database.write() as db:
            if self.closed: raise OutcomeError('BACKEND_CLOSED')
            opinion = OutcomeOpinion.model_validate(self.opinion_row(db, identity).payload)
            prior = db.scalar(select(OutcomeAttemptRecord).where(OutcomeAttemptRecord.request_id == request))
            if prior:
                if prior.opinion_id != opinion.id: raise OutcomeError('OUTCOME_REQUEST_CONFLICT')
                return OutcomeAttempt.model_validate(prior.payload)
            terminal = db.scalar(select(OutcomeAttemptRecord).where(OutcomeAttemptRecord.opinion_id == opinion.id,
                OutcomeAttemptRecord.status.in_(('running', 'evaluated'))))
            if terminal: return OutcomeAttempt.model_validate(terminal.payload)
            if db.scalar(select(func.count()).select_from(OutcomeAttemptRecord).where(OutcomeAttemptRecord.opinion_id == opinion.id)) >= 100:
                raise OutcomeError('OUTCOME_HISTORY_LIMIT')
            attempt = OutcomeAttempt(id=str(uuid4()), opinion_id=opinion.id, request_id=request,
                started_at=now, evaluated_at=None, status='running', code=None)
            db.add(OutcomeAttemptRecord(id=attempt.id, opinion_id=opinion.id, request_id=request, status='running', payload=attempt.model_dump(mode='json')))
        # Persist the claim before the sole bounded provider call. Restart marks
        # the claim interrupted; it never resends a provider/model request.
        result = None; bars = []; query = None; code = None
        if now < opinion.due_at: code = 'WINDOW_NOT_DUE'
        elif opinion.entry_code: code = opinion.entry_code
        else:
            query = ReadQuery(capability='market.kline', mode=opinion.source_mode, symbol=opinion.symbol,
                period='1d', count=260, start=opinion.research_at.date(), end=opinion.window_end.date(), use_cache=False)
            try:
                result = self.providers.query(opinion.provider, query, timeout_seconds=20,
                    stop=self.stop, expected_revision=opinion.provider_revision, expected_identity=opinion.provider_identity)
                if not result.ok: code = 'HISTORY_'+result.code
                elif (result.provider != opinion.provider or result.provenance.mode != opinion.source_mode or
                    result.capability != 'market.kline'): code = 'HISTORY_SOURCE_MISMATCH'
                elif not isinstance(result.data, list) or len(result.data) > 260: code = 'HISTORY_INVALID'
                else:
                    from .outcome_contracts import OutcomeBar
                    def bar(b):
                        stamp=b['timestamp']
                        # Longbridge serializes aware SDK datetimes as ISO;
                        # fixture/Massive already return integer epoch seconds.
                        if isinstance(stamp,str) and not stamp.isdigit(): stamp=int(instant(stamp).timestamp())
                        return OutcomeBar.model_validate({'timestamp':stamp,'close':b['close']})
                    bars = [bar(b) for b in result.data]
            except Exception: code = 'HISTORY_INVALID'
        ended = self.now()
        if ended < now: code = 'CLOCK_REGRESSED'
        if result and result.ok and instant(result.provenance.fetched_at) > ended: code = 'FUTURE_FETCH_TIME'
        if code:
            calculated = dict(status='pending' if code == 'WINDOW_NOT_DUE' else 'unable', code=code)
        else: calculated = calculate(opinion, [b.model_dump() for b in bars], ended)
        attempt = attempt.model_copy(update=dict(**calculated, evaluated_at=ended, bars=bars,
            source_data=result.data if result and result.ok and isinstance(result.data,list) and len(result.data)<=260 else None,
            provenance=result.provenance if result and result.ok else None,
            data_hash=result_hash(result.data) if result and result.ok else None,
            bars_hash=result_hash([b.model_dump(mode='json') for b in bars]) if bars else None,
            query=query.model_dump(mode='json') if query else None))
        with self.database.write() as db:
            row = db.get(OutcomeAttemptRecord, attempt.id)
            if row.status != 'running': return OutcomeAttempt.model_validate(row.payload)
            if self.closed:
                row.status='interrupted'
                row.payload=dict(row.payload,status='interrupted',code='BACKEND_CLOSED',evaluated_at=ended.isoformat())
                return OutcomeAttempt.model_validate(row.payload)
            row.status, row.payload = attempt.status, attempt.model_dump(mode='json')
        return attempt

    def policies(self):
        with self.database.sessions() as db:
            current = db.get(OutcomePolicyState, 1).current_version
            versions = [WeightVersion.model_validate(row.payload) for row in db.scalars(select(OutcomePolicyRecord).order_by(OutcomePolicyRecord.version))]
            return WeightHistory(current_version=current, versions=versions)

    def change(self, body):
        digest = result_hash(body.model_dump(mode='json'))
        with self.database.write() as db:
            previous = db.scalar(select(OutcomePolicyRecord).where(OutcomePolicyRecord.request_id == body.request_id))
            if previous:
                if previous.request_hash != digest: raise OutcomeError('OUTCOME_REQUEST_CONFLICT')
                return WeightVersion.model_validate(previous.payload)
            state = db.get(OutcomePolicyState, 1)
            if state.current_version != body.expected_version: raise OutcomeError('POLICY_VERSION_CONFLICT')
            parameters = body.parameters
            if body.rollback_version is not None:
                old = db.get(OutcomePolicyRecord, body.rollback_version)
                if old is None: raise OutcomeError('POLICY_NOT_FOUND')
                parameters = WeightVersion.model_validate(old.payload).parameters
            version = WeightVersion(version=state.current_version+1, parent_version=state.current_version,
                rollback_version=body.rollback_version, created_at=self.now(), reason=body.reason, parameters=parameters)
            db.add(OutcomePolicyRecord(version=version.version, request_id=body.request_id, request_hash=digest, payload=version.model_dump(mode='json')))
            db.flush(); state.current_version = version.version
            return version

    def performance(self, body):
        now = self.now(); as_of = instant(body.as_of) if body.as_of else now
        if as_of > now: raise OutcomeError('FUTURE_AS_OF')
        groups = {}; input_data = []
        with self.database.write() as db:
            # Select the parameter version known at as_of, not today's future tuning.
            versions = [WeightVersion.model_validate(row.payload) for row in db.scalars(select(OutcomePolicyRecord))]
            known = [v for v in versions if v.created_at <= as_of]
            if not known: raise OutcomeError('POLICY_NOT_YET_CREATED')
            policy = max(known, key=lambda v:v.version)
            if policy.calculation_version != 'research-trail-calibration-v1': raise OutcomeError('PERFORMANCE_VERSION_UNSUPPORTED')
            count = db.scalar(select(func.count()).select_from(OutcomeOpinionRecord))
            if count > 10000: raise OutcomeError('PERFORMANCE_INPUT_LIMIT')
            if db.scalar(select(func.count()).select_from(OutcomeAttemptRecord)) > 20000: raise OutcomeError('PERFORMANCE_INPUT_LIMIT')
            attempts = {}
            for row in db.scalars(select(OutcomeAttemptRecord)):
                a = OutcomeAttempt.model_validate(row.payload)
                if a.evaluated_at is None or a.evaluated_at > as_of: continue
                previous = attempts.get(a.opinion_id)
                if previous is None or a.status == 'evaluated' or previous.status != 'evaluated' and (a.started_at, a.id) > (previous.started_at, previous.id):
                    attempts[a.opinion_id] = a
            for row in db.scalars(select(OutcomeOpinionRecord).order_by(OutcomeOpinionRecord.id)):
                o = OutcomeOpinion.model_validate(row.payload)
                if (o.horizon != body.horizon or o.source_mode != body.source_mode or o.analysis_mode != body.analysis_mode or
                    o.origin != body.origin or o.research_at > as_of or o.captured_at > as_of): continue
                a = attempts.get(o.id)
                if o.capture_version != 'research-trail-capture-v1' or a and a.engine_version != ENGINE_VERSION:
                    raise OutcomeError('PERFORMANCE_VERSION_UNSUPPORTED')
                input_data.append(dict(opinion=o.model_dump(mode='json'), attempt=a.model_dump(mode='json') if a else None))
                for kind, key in [('strategy', o.strategy), *[('skill', k) for k in set(o.skill_ids)]]:
                    groups.setdefault((kind, key), []).append((o, a))
            rows = [PerformanceRow(kind=kind, key=key, **aggregate(group, policy.parameters)) for (kind, key), group in sorted(groups.items())]
            payload = dict(as_of=as_of.isoformat(), filter=body.model_dump(mode='json'), policy_version=policy.version,
                rows=[r.model_dump(mode='json') for r in rows], input_hash=result_hash(input_data),
                opinion_ids=[v['opinion']['id'] for v in input_data],
                attempt_ids=[v['attempt']['id'] for v in input_data if v['attempt']])
            digest = result_hash(payload)
            previous = db.scalar(select(OutcomeSnapshotRecord).where(OutcomeSnapshotRecord.fingerprint == digest))
            if previous: return PerformanceSnapshot.model_validate(previous.payload)
            snapshot = PerformanceSnapshot(id=str(uuid4()), **payload)
            db.add(OutcomeSnapshotRecord(id=snapshot.id, fingerprint=digest, payload=snapshot.model_dump(mode='json')))
            return snapshot

    def snapshot(self, identity):
        with self.database.sessions() as db:
            row = db.get(OutcomeSnapshotRecord, str(identity))
            if row is None: raise OutcomeError('PERFORMANCE_NOT_FOUND')
            return PerformanceSnapshot.model_validate(row.payload)
