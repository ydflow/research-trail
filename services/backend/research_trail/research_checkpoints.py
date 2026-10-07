"""Append-only integrity snapshots in the same transaction as canonical rows.

Folio checkpoint.ts is a conceptual reference (fixed ba5dcdfd). SQLite rows
remain the sole execution state; snapshots contain hashes, not another executor.
"""
import hashlib
import json
from sqlalchemy import select
from .models import ResearchCheckpointRecord, ResearchStepRecord

def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def snapshot(db,row):
    steps=db.scalars(select(ResearchStepRecord).where(ResearchStepRecord.run_id==row.id).order_by(ResearchStepRecord.ordinal))
    return dict(version=1,run_id=row.id,plan_hash=digest(row.plan),generation=row.generation,status=row.status,
        abandoned_at=row.abandoned_at,parent_run_id=row.parent_run_id,started_at=row.started_at,completed_at=row.completed_at,
        steps=[dict(capability=s.capability,ordinal=s.ordinal,status=s.status,code=s.code,
            started_at=s.started_at,completed_at=s.completed_at,result_hash=digest(s.result) if s.result is not None else None) for s in steps])

def latest(db,identity):
    return db.scalar(select(ResearchCheckpointRecord).where(ResearchCheckpointRecord.run_id==identity).order_by(ResearchCheckpointRecord.id.desc()).limit(1))

def verify(db,row):
    from .research_store import ResearchError
    saved=latest(db,row.id)
    if saved is None: raise ResearchError('CHECKPOINT_MISSING')
    try:
        if not saved.valid or type(saved.payload.get('version')) is not int or saved.payload.get('version')!=1 or saved.payload.get('run_id')!=row.id or digest(saved.payload)!=saved.checksum:
            raise ResearchError('CHECKPOINT_INVALID')
        current=snapshot(db,row)
        if current['plan_hash']!=saved.payload['plan_hash']: raise ResearchError('PLAN_CHANGED')
        old={s['capability']:s for s in saved.payload['steps']}; new={s['capability']:s for s in current['steps']}
        if old.keys()!=new.keys(): raise ResearchError('EVIDENCE_MISSING')
        for cap,step in old.items():
            if step['status']=='success':
                if not new[cap]['result_hash']: raise ResearchError('EVIDENCE_MISSING')
                if new[cap]['result_hash']!=step['result_hash']: raise ResearchError('EVIDENCE_CHANGED')
        if current!=saved.payload: raise ResearchError('CHECKPOINT_MISMATCH')
    except ResearchError: raise
    except Exception: raise ResearchError('CHECKPOINT_INVALID') from None
    return saved

def save(db,row,cause,*,valid=True):
    from .research_store import now
    db.flush()
    payload=snapshot(db,row)
    db.add(ResearchCheckpointRecord(run_id=row.id,created_at=now(),cause=cause,payload=payload,checksum=digest(payload),valid=valid))
