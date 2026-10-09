"""Research quality is a human rubric, separate from tool and investment metrics."""
from typing import Literal
from uuid import UUID
from pydantic import Field, model_validator
from .provider_contracts import Boundary
from .report_contracts import ReportDocument

DIMENSIONS = ('completeness', 'fact_accuracy', 'source_quality', 'uncertainty',
              'balanced_reasoning', 'catalyst_conditions', 'time_horizon', 'decision_usefulness')
RUBRIC_VERSION = 'research-trail-research-quality-v1'

class ResearchComparisonInput(Boundary):
    request_id: UUID
    run_id: UUID
    mode: Literal['offline', 'real'] = 'offline'
    models: list[str] = Field(min_length=2, max_length=2)
    consent: bool = False
    reasoning_effort: Literal['default', 'low', 'medium', 'high'] = 'default'
    @model_validator(mode='after')
    def bounded(self):
        import re
        if len(set(self.models)) != 2 or any(not re.fullmatch(r'[a-zA-Z0-9_.:/-]{1,80}', m) for m in self.models):
            raise ValueError('需要两个不同的模型ID')
        if self.mode == 'real' and not self.consent:
            raise ValueError('真实实验需要明确同意API费用及向已配置模型服务发送研究数据')
        return self

class ResearchRating(Boundary):
    score: int = Field(ge=1, le=5, strict=True)
    reason: str = Field(min_length=10, max_length=600)
    evidence_ids: list[str] = Field(min_length=1, max_length=8)

class ResearchQualityInput(Boundary):
    request_id: UUID
    candidate: int = Field(ge=0, le=1, strict=True)
    expected_version: int = Field(ge=0, strict=True)
    ratings: dict[str, ResearchRating]
    @model_validator(mode='after')
    def complete(self):
        if set(self.ratings) != set(DIMENSIONS):
            raise ValueError('八个质量维度必须全部评审，不以缺项计算分数')
        if any(not r.reason.strip() or len(set(r.evidence_ids)) != len(r.evidence_ids) for r in self.ratings.values()):
            raise ValueError('需要有效理由且证据不重复')
        return self

class ResearchQualityReview(ResearchQualityInput):
    version: int
    created_at: str
    rubric_version: str = RUBRIC_VERSION
    reviewer: Literal['human'] = 'human'
    score: float
    status: Literal['passed', 'quality_failed']

class ResearchCandidate(Boundary):
    model: str
    status: Literal['not_run', 'running', 'cancelled', 'run_error', 'completed'] = 'not_run'
    code: str | None = None
    failure_stage: str | None = None
    requests_started: int = 0
    request_uncertain: bool = False
    response_diagnostics: dict[str, str | bool] | None = None
    document: ReportDocument | None = None
    engineering_checks: list[str] = Field(default_factory=list)
    reviews: list[ResearchQualityReview] = Field(default_factory=list)

class ResearchComparisonView(Boundary):
    id: str
    input: ResearchComparisonInput
    created_at: str
    completed_at: str | None = None
    status: Literal['not_run', 'running', 'cancelled', 'run_error', 'completed'] = 'not_run'
    source_hash: str
    configuration_identity: str | None = None
    source_mode: Literal['simulated', 'real']
    candidates: list[ResearchCandidate]
    quality_status: Literal['not_reviewed', 'invalid', 'passed', 'quality_failed'] = 'not_reviewed'
    quality_delta: float | None = None
    rubric_version: str = RUBRIC_VERSION
    label: str = '同一冻结数据的模型报告对比；工程断言不等于事实正确。质量评分需八项人工评审，未评审/错误/取消无比较分数；不评盈利能力。'

class ResearchRubric(Boundary):
    version: str = RUBRIC_VERSION
    dimensions: dict[str, str]
    scale: str = '1=关键缺陷，2=明显不足，3=基本可用，4=较完整，5=充分且可复核；每项需证据与理由。全部维度至少3分才通过。'
