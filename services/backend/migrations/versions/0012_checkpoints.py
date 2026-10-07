"""Atomic research checkpoints and explicit idempotent recovery. No auto replay."""
from alembic import op
import sqlalchemy as sa
import hashlib
import json
revision='0012_checkpoints'
down_revision='0011_reports'
branch_labels=None
depends_on=None

def upgrade():
    op.add_column('research_runs',sa.Column('generation',sa.Integer(),nullable=False,server_default=sa.text('0')))
    op.add_column('research_runs',sa.Column('parent_run_id',sa.String(36)))
    op.add_column('research_runs',sa.Column('abandoned_at',sa.String(40)))
    op.add_column('research_reports',sa.Column('request_id',sa.String(36)))
    op.add_column('research_reports',sa.Column('model_identity',sa.String(64)))
    op.add_column('research_reports',sa.Column('request_uncertain',sa.Boolean(),nullable=False,server_default=sa.text('0')))
    op.create_index('ix_report_request','research_reports',['run_id','request_id'],unique=True)
    op.create_table('research_checkpoints',sa.Column('id',sa.Integer(),primary_key=True,autoincrement=True),
        sa.Column('run_id',sa.String(36),sa.ForeignKey('research_runs.id'),nullable=False),
        sa.Column('created_at',sa.String(40),nullable=False),sa.Column('cause',sa.String(80),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),sa.Column('checksum',sa.String(64),nullable=False),sa.Column('valid',sa.Boolean(),nullable=False))
    op.create_index('ix_research_checkpoints_run_id','research_checkpoints',['run_id'])
    op.create_table('research_actions',sa.Column('request_id',sa.String(36),primary_key=True),
        sa.Column('run_id',sa.String(36),sa.ForeignKey('research_runs.id'),nullable=False),
        sa.Column('operation',sa.String(10),nullable=False),sa.Column('target_run_id',sa.String(36),sa.ForeignKey('research_runs.id'),nullable=False),
        sa.Column('created_at',sa.String(40),nullable=False))
    op.create_index('ix_research_actions_run_id','research_actions',['run_id'])
    # One-time migration snapshots old evidence as it exists now. They do not
    # retroactively prove pre-migration integrity, execution or model usage.
    conn=op.get_bind()
    canon=lambda value: json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
    digest=lambda value: hashlib.sha256(canon(value).encode()).hexdigest()
    for row in conn.execute(sa.text('SELECT id,plan,status,started_at,completed_at FROM research_runs')).mappings().all():
        plan=json.loads(row['plan']); steps=[]
        for s in conn.execute(sa.text('SELECT * FROM research_steps WHERE run_id=:id ORDER BY ordinal'),{'id':row['id']}).mappings():
            result=json.loads(s['result']) if s['result'] is not None else None
            steps.append(dict(capability=s['capability'],ordinal=s['ordinal'],status=s['status'],code=s['code'],
                started_at=s['started_at'],completed_at=s['completed_at'],result_hash=digest(result) if result is not None else None))
        payload=dict(version=1,run_id=row['id'],plan_hash=digest(plan),generation=0,status=row['status'],
            abandoned_at=None,parent_run_id=None,started_at=row['started_at'],completed_at=row['completed_at'],steps=steps)
        conn.execute(sa.text('INSERT INTO research_checkpoints (run_id,created_at,cause,payload,checksum,valid) VALUES (:id,:at,:cause,:payload,:checksum,1)'),
            dict(id=row['id'],at=row['completed_at'] or row['started_at'],cause='legacy-migration',payload=canon(payload),checksum=digest(payload)))
    conn.execute(sa.text("UPDATE research_reports SET request_uncertain=1 WHERE mode='real' AND status IN ('generating','interrupted','cancelled')"))

def downgrade():
    raise RuntimeError('研究检查点及恢复操作历史不自动降级。')
