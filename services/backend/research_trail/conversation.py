"""ResearchTrail DTOs; protocol semantics checked against Folio's fixed v1 reference.

This is a Python implementation, not the upstream TypeScript business kernel.
Wire names are snake_case and UTC ISO times; legacy UI conversions belong in TS.
"""
from typing import Annotated, Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, TypeAdapter, field_validator, model_validator
from .market import Quote, Kline
from .analytics_contracts import RiskQuery, CompareQuery, RiskReport, Comparison

MODEL_LABEL = "规则演示／假模型"
LIVE_MODEL_LABEL = "OpenAI兼容／真实模型"


class DTO(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class CreateSession(DTO):
    title: str = Field(default="新会话", min_length=1, max_length=80)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value):
        if not value.strip():
            raise ValueError("会话标题不能为空")
        return value.strip()


class SessionDTO(DTO):
    id: str
    title: str
    created_at: AwareDatetime
    updated_at: AwareDatetime
    message_count: int = Field(ge=0)


class StartRun(DTO):
    input: str = Field(min_length=1, max_length=2000)
    kind: Literal["fixture", "fake_agent", "openai_agent"] = "fixture"
    scenario: Literal["normal", "delayed", "timeout"] = "normal"

    @field_validator("input")
    @classmethod
    def input_not_blank(cls, value):
        if not value.strip():
            raise ValueError("测试输入不能为空")
        return value.strip()


class MessageDTO(DTO):
    id: str
    session_id: str
    run_id: str
    sequence: int = Field(ge=1)
    role: Literal["user", "assistant"]
    content: str
    created_at: AwareDatetime


class ErrorPayload(DTO):
    code: str
    message: str
    retryable: bool = False


class ToolArguments(DTO):
    symbol: str = Field(pattern=r"^[A-Z0-9]{1,6}\.US$")


ToolName = Literal["market.quote", "market.kline", "portfolio.risk", "stocks.compare"]
ToolInput = ToolArguments | RiskQuery | CompareQuery


class ToolCall(DTO):
    name: ToolName
    arguments: ToolInput


class MarketProvenance(DTO):
    source: Literal["fixture"]
    data_label: Literal["模拟数据"]
    fixture_version: Literal["authored-v1"]
    market_time: AwareDatetime
    fetched_at: AwareDatetime


class QuoteToolData(MarketProvenance):
    kind: Literal["quote"] = "quote"
    quote: Quote


class KlineToolData(MarketProvenance):
    kind: Literal["kline"] = "kline"
    symbol: str
    name: str
    period: Literal["1d"]
    klines: list[Kline] = Field(min_length=2)


class RiskToolData(DTO):
    kind: Literal['risk'] = 'risk'
    report: RiskReport

class CompareToolData(DTO):
    kind: Literal['compare'] = 'compare'
    report: Comparison

ToolData = Annotated[QuoteToolData | KlineToolData | RiskToolData | CompareToolData, Field(discriminator="kind")]


class ToolSuccess(DTO):
    ok: Literal[True] = True
    data: ToolData


class ToolFailure(DTO):
    ok: Literal[False] = False
    error: ErrorPayload


class RunDTO(DTO):
    id: str
    session_id: str
    kind: Literal["fixture", "fake_agent", "openai_agent"]
    status: Literal["running", "completed", "failed", "cancelled", "timed_out", "interrupted"]
    model_label: Literal["规则演示／假模型", "OpenAI兼容／真实模型"] | None = None
    error: ErrorPayload | None = None
    input: str
    answer: str
    assistant_message_id: str
    started_at: AwareDatetime
    completed_at: AwareDatetime | None
    last_sequence: int = Field(ge=1)

    @model_validator(mode="after")
    def terminal_consistency(self):
        if (self.status in ("failed", "timed_out", "interrupted")) != (self.error is not None):
            raise ValueError("Failed, timed-out and interrupted runs require an error")
        if (self.status == "running") != (self.completed_at is None):
            raise ValueError("Only running records have no completion time")
        if self.model_label != {"fixture": None, "fake_agent": MODEL_LABEL, "openai_agent": LIVE_MODEL_LABEL}[self.kind]:
            raise ValueError("Runs require the label matching their actual model kind")
        return self


class EmptyPayload(DTO):
    pass


class StartedPayload(DTO):
    input: str
    started_at: AwareDatetime


class TextPayload(DTO):
    text: str


class StatusPayload(DTO):
    phase: Literal["working"]
    detail: str


class CompletedPayload(DTO):
    stop_reason: Literal["completed", "error", "cancelled", "timeout", "interrupted"]


class PartialText(DTO):
    text: str


class CancelledPayload(DTO):
    reason: Literal["user"]
    partial: PartialText


class ToolStartedPayload(DTO):
    call_id: str
    name: ToolName
    input: ToolInput


class ToolResultPayload(DTO):
    call_id: str
    name: ToolName
    result: ToolSuccess | ToolFailure


class Envelope(DTO):
    protocol_version: Literal[1] = 1
    session_id: str
    run_id: str
    sequence: int = Field(ge=1)
    timestamp: AwareDatetime


class RunStartedEvent(Envelope):
    type: Literal["run_started"]
    payload: StartedPayload


class MessageStartedEvent(Envelope):
    type: Literal["message_started"]
    message_id: str
    payload: EmptyPayload


class StatusEvent(Envelope):
    type: Literal["status"]
    payload: StatusPayload


class TextDeltaEvent(Envelope):
    type: Literal["text_delta"]
    message_id: str
    payload: TextPayload


class MessageCompletedEvent(Envelope):
    type: Literal["message_completed"]
    message_id: str
    payload: EmptyPayload


class RunCompletedEvent(Envelope):
    type: Literal["run_completed"]
    payload: CompletedPayload


class ToolStartedEvent(Envelope):
    type: Literal["tool_started"]
    payload: ToolStartedPayload


class ToolResultEvent(Envelope):
    type: Literal["tool_result"]
    payload: ToolResultPayload


class ErrorEvent(Envelope):
    type: Literal["error"]
    payload: ErrorPayload


class CancelledEvent(Envelope):
    type: Literal["cancelled"]
    message_id: str
    payload: CancelledPayload


StreamEvent = Annotated[RunStartedEvent | MessageStartedEvent | StatusEvent | TextDeltaEvent |
                        MessageCompletedEvent | RunCompletedEvent | ToolStartedEvent | ToolResultEvent |
                        ErrorEvent | CancelledEvent, Field(discriminator="type")]
EVENT_ADAPTER = TypeAdapter(StreamEvent)


class EventPage(DTO):
    events: list[StreamEvent]
    last_sequence: int


class SessionSnapshot(DTO):
    session: SessionDTO
    messages: list[MessageDTO]
    runs: list[RunDTO]
    events: list[StreamEvent]
