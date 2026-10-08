"""Python-owned offline engineering evaluation; no financial outcome scores."""
from typing import Literal
from uuid import UUID
from pydantic import Field, SecretStr, field_validator, model_validator
from .settings import StrictModel, ConnectionInput

ResultStatus = Literal['not_run','running','cancelled','run_error','quality_failed','passed']
TraceProvider = Literal['langsmith','langfuse']
Profile = Literal['baseline','missing-disclosure','wrong-fact','missing-tool','provider-failure']

class EvaluationCase(StrictModel):
    id: str
    title: str
    category: Literal['normal','error','recovery','regression']
    origin: Literal['research-trail'] = 'research-trail'
    version: Literal[1] = 1
    prompt: str
    expected_tool: str | None = None
    expected_code: str | None = None
    purpose: str

class ExperimentInput(StrictModel):
    request_id: UUID
    name: str = Field(min_length=1,max_length=80)
    case_ids: list[str] = Field(min_length=1,max_length=20)
    profile: Profile = 'baseline'
    @field_validator('case_ids')
    @classmethod
    def unique(cls,value):
        if len(value)!=len(set(value)): raise ValueError('案例不能重复')
        return value

class Assertion(StrictModel):
    metric: str
    passed: bool
    reason: str
    stage: str
    sequence: int | None = None

class CaseResult(StrictModel):
    case_id: str
    status: ResultStatus = 'not_run'
    observed_status: str | None = None
    code: str | None = None
    failure_stage: str | None = None
    score: float | None = Field(default=None,ge=0,le=1,allow_inf_nan=False)
    assertions: list[Assertion] = []
    trace: list[dict] = []
    answer: str | None = None
    tool_calls: int = Field(default=0,ge=0,le=100,strict=True)
    @model_validator(mode='after')
    def evidence_before_score(self):
        if self.status=='passed' and (self.score!=1 or not self.assertions or not all(a.passed for a in self.assertions)):
            raise ValueError('通过必须有全部通过的断言及1分')
        if self.status=='quality_failed' and (self.score!=0 or not any(not a.passed for a in self.assertions)):
            raise ValueError('质量不达标必须有失败断言及0分')
        if self.status not in ('passed','quality_failed') and self.score is not None:
            raise ValueError('未完成/取消/运行错误不能有质量分数')
        return self

class EvaluationComparison(StrictModel):
    baseline_id: str
    comparable: bool
    reason: str
    delta: float | None = None
    regressed_cases: list[str] = []

class ExperimentView(StrictModel):
    id: str
    input: ExperimentInput
    created_at: str
    completed_at: str | None = None
    status: ResultStatus = 'not_run'
    suite_hash: str
    evaluator_version: Literal['rt-engineering-v1'] = 'rt-engineering-v1'
    cases: list[EvaluationCase]
    results: list[CaseResult]
    validity: Literal['not_executed','inconclusive','invalid','valid'] = 'not_executed'
    score: float | None = None
    counts: dict[str,int] = {}
    origin_counts: dict[str,int] = {}
    failure_counts: dict[str,int] = {}
    comparison: EvaluationComparison | None = None
    mode: Literal['deterministic-offline'] = 'deterministic-offline'
    model_requests: Literal[0] = 0

class ExperimentSummary(StrictModel):
    id: str
    name: str
    profile: Profile
    created_at: str
    status: ResultStatus
    validity: str
    score: float | None
    counts: dict[str,int]

class BaselineInput(StrictModel):
    request_id: UUID
    name: str = Field(min_length=1,max_length=80)
    experiment_id: UUID

class BaselineView(StrictModel):
    id: str
    name: str
    experiment_id: str
    created_at: str
    suite_hash: str
    evaluator_version: str
    results: list[CaseResult]
    score: float

class BaselineSummary(StrictModel):
    id: str
    name: str
    experiment_id: str
    created_at: str
    suite_hash: str
    evaluator_version: str
    score: float

class FeedbackInput(StrictModel):
    request_id: UUID
    case_id: str
    judgment: Literal['agree','disagree','needs-review']
    reason: str = Field(min_length=1,max_length=1000)
    @field_validator('reason')
    @classmethod
    def not_blank(cls,value):
        if not value.strip(): raise ValueError('反馈理由不能为空')
        return value

class FeedbackView(FeedbackInput):
    id: str
    experiment_id: str
    created_at: str
    source: Literal['human'] = 'human'

class TraceConfig(StrictModel):
    enabled: bool = Field(default=False,strict=True)
    endpoint: str = Field(default='',max_length=240)
    project: str = Field(default='research-trail',min_length=1,max_length=80,pattern=r'^[A-Za-z0-9_.-]+$')
    @field_validator('endpoint')
    @classmethod
    def endpoint_shape(cls,value):
        value=ConnectionInput.safe_endpoint(value).rstrip('/')
        if value:
            from urllib.parse import urlsplit
            u=urlsplit(value)
            if u.path or (u.scheme!='https' and u.hostname not in ('localhost','127.0.0.1','::1')):
                raise ValueError('追踪地址需HTTPS源站，或HTTP本机源站；不能带路径')
        return value

class TraceConfigView(TraceConfig):
    provider: TraceProvider
    credential_present: bool
    revision: int = 0
    status: str = 'disabled'
    code: str = 'TRACING_DISABLED'
    checked_at: str | None = None
    privacy: Literal['minimal-allowlist-v1'] = 'minimal-allowlist-v1'

class TraceCredential(StrictModel):
    secret: SecretStr
    public_key: SecretStr | None = None
    workspace_id: UUID | None = None
    @field_validator('secret','public_key')
    @classmethod
    def bounded(cls,value):
        if value is not None and (not value.get_secret_value().strip() or len(value.get_secret_value().encode())>2000 or any(c in value.get_secret_value() for c in '\0\r\n')):
            raise ValueError('凭证不能为空、过长或含控制字符')
        return value

class TracePreview(StrictModel):
    experiment_id: str
    provider: TraceProvider
    revision: int
    digest: str
    payload: dict
    excluded: list[str] = ['prompt','answer','tool-input','tool-output','feedback','names','account','portfolio','credentials']

class TraceUpload(StrictModel):
    request_id: UUID
    digest: str = Field(pattern=r'^[0-9a-f]{64}$')
    confirm_upload: Literal[True]
    @field_validator('confirm_upload',mode='before')
    @classmethod
    def explicit_confirmation(cls,value):
        if value is not True: raise ValueError('需要明确确认上传')
        return value

class TraceDelivery(StrictModel):
    id: str
    provider: TraceProvider
    experiment_id: str
    status: Literal['claimed','uploaded','failed','uncertain']
    code: str
    created_at: str

class TraceProbe(StrictModel):
    confirm_connection: Literal[True]
    @field_validator('confirm_connection',mode='before')
    @classmethod
    def explicit_confirmation(cls,value):
        if value is not True: raise ValueError('需要明确确认连接')
        return value
