"""ResearchTrail DTOs; protocol semantics checked against Folio's fixed v1 reference.

This is a Python implementation, not the upstream TypeScript business kernel.
Wire names are snake_case and UTC ISO times; legacy UI conversions belong in TS.
"""
from typing import Annotated, Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, TypeAdapter, field_validator


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


class RunDTO(DTO):
    id: str
    session_id: str
    kind: Literal["fixture"]
    status: Literal["completed"]
    input: str
    answer: str
    assistant_message_id: str
    started_at: AwareDatetime
    completed_at: AwareDatetime
    last_sequence: int = Field(ge=1)


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
    stop_reason: Literal["completed"]


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


StreamEvent = Annotated[RunStartedEvent | MessageStartedEvent | StatusEvent | TextDeltaEvent |
                        MessageCompletedEvent | RunCompletedEvent, Field(discriminator="type")]
EVENT_ADAPTER = TypeAdapter(StreamEvent)


class EventPage(DTO):
    events: list[StreamEvent]
    last_sequence: int
