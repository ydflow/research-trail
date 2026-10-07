"""Python-owned thesis versions and explicit evidence-based review boundaries."""
from typing import Annotated, Literal
from pydantic import Field, StringConstraints
from .provider_contracts import Boundary
from .report_contracts import ReportJob, ReportDiff

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
RequestId = Annotated[str, Field(pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')]
Judgment = Literal['strengthened', 'weakened', 'invalidated', 'unchanged', 'needs_revision']

class ThesisContent(Boundary):
    stance: Literal['bullish', 'bearish', 'neutral']
    summary: Text
    bull_case: list[Text] = Field(max_length=16)
    bear_case: list[Text] = Field(max_length=16)
    catalysts: list[Text] = Field(max_length=16)
    risks: list[Text] = Field(max_length=16)

class ThesisCreate(Boundary):
    report_id: RequestId
    request_id: RequestId

class ThesisEdit(Boundary):
    request_id: RequestId
    expected_version: int = Field(ge=1, strict=True)
    content: ThesisContent
    reason: Text

class ThesisEvaluate(Boundary):
    request_id: RequestId
    expected_version: int = Field(ge=1, strict=True)
    report_id: RequestId | None = None

class ThesisJudge(ThesisEdit):
    evaluation_id: RequestId
    judgment: Judgment

class ThesisSummary(Boundary):
    id: str
    symbol: str
    origin_report_id: str
    current_version: int
    created_at: str

class ThesisVersionSummary(Boundary):
    version: int
    origin: Literal['report', 'edit', 'review']
    reason: str
    created_at: str
    report_id: str

class ThesisVersion(ThesisVersionSummary):
    thesis_id: str
    content: ThesisContent
    data_report: ReportJob
    label: str = '文字是合成器或用户的分析与判断；对应事实保存在来源报告和实际执行记录中，引用不证明判断正确。'

class ThesisReviewSummary(Boundary):
    id: str
    thesis_id: str
    base_version: int
    new_version: int | None
    kind: Literal['evaluation', 'judgment']
    status: Literal['ready', 'unable', 'reviewed']
    code: str | None
    comparison: Literal['changed', 'unchanged'] | None
    judgment: Judgment | None
    reason: str
    created_at: str
    report_id: str | None

class ThesisReview(ThesisReviewSummary):
    requested_report_id: str | None
    evaluation_id: str | None
    base_content: ThesisContent
    baseline_report: ReportJob
    candidate_report: ReportJob | None
    difference: ReportDiff | None
    missing_keys: list[str]
    label: str = '自动评估只比较已保存的新旧事实；投资影响由用户显式判断。缺数据时不产生变化结论。'

class ThesisView(ThesisSummary):
    current: ThesisVersion
    versions: list[ThesisVersionSummary]
    reviews: list[ThesisReviewSummary]
    history_limit: int = 100
