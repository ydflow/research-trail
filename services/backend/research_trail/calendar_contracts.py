"""Python event time/source contracts. A forecast is not proof an event occurred."""
from datetime import date
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import AwareDatetime, Field, field_validator, model_validator
from .provider_contracts import Boundary, ReadQuery, ProviderResult
from .capabilities import CapabilityState

CalendarKind = Literal['earnings', 'macro', 'central-bank']

def valid_zone(value):
    if not isinstance(value,str) or len(value)>100: raise ValueError('时区无效')
    try: ZoneInfo(value)
    except (ValueError,ZoneInfoNotFoundError): raise ValueError('需要有效IANA时区，禁止文件路径') from None
    return value

class CalendarSelection(Boundary):
    mode: Literal['simulated','real'] = 'simulated'
    provider: Literal['longbridge','massive'] = 'longbridge'

class CalendarQuery(CalendarSelection):
    timezone: str = 'Asia/Shanghai'
    start: date = date(2024,1,15)
    end: date = date(2024,1,25)
    kinds: list[CalendarKind] = Field(default_factory=lambda:['earnings','macro','central-bank'],min_length=1,max_length=3)
    _zone = field_validator('timezone')(valid_zone)

    @model_validator(mode='after')
    def bounded(self):
        if self.start>self.end or (self.end-self.start).days>90 or len(set(self.kinds))!=len(self.kinds):
            raise ValueError('事件窗口最多90天、类别不可重复')
        return self

class CalendarRefresh(CalendarQuery):
    request_id: UUID

class CalendarViewInput(Boundary):
    timezone: str = 'Asia/Shanghai'
    _zone = field_validator('timezone')(valid_zone)

class CalendarSource(Boundary):
    kind: CalendarKind
    name: str
    availability: CapabilityState
    coverage: str

class CalendarRead(Boundary):
    id: str
    query: ReadQuery
    status: Literal['success','failed']
    code: str | None = None
    result_hash: str
    fetched_at: AwareDatetime | None = None

class CalendarIssue(Boundary):
    read_id: str
    pointer: str
    code: str

class CalendarEvent(Boundary):
    id: str
    source_event_id: str | None
    kind: CalendarKind
    title: str
    description: str
    related_symbols: list[str]
    scheduled_at: AwareDatetime | None
    occurred_at: AwareDatetime | None
    source_date: date | None
    source_timezone: str | None
    precision: Literal['instant','date','unknown']
    schedule_label: str | None
    occurrence_status: Literal['announced','occurred','cancelled','postponed','unknown']
    updated_at: AwareDatetime | None
    time_code: str | None
    conflict: bool = False
    read_id: str
    pointer: str

class CalendarEventView(CalendarEvent):
    display_timezone: str
    display_time: str
    display_date: date | None
    time_relation: Literal['upcoming','elapsed_unconfirmed','occurred','cancelled','postponed','date_only','unknown']

class CalendarPage(Boundary):
    id: str
    query: CalendarRefresh
    reference_time: AwareDatetime
    saved_at: AwareDatetime
    status: Literal['completed','partial','failed','unavailable']
    sources: list[CalendarSource]
    reads: list[CalendarRead]
    events: list[CalendarEventView]
    issues: list[CalendarIssue]
    duplicate_count: int
    label: str = '历史事件快照；仅显式刷新更新。预告时间经过不等于已发生，获取时间不是事件时间。'

class CalendarSummary(Boundary):
    id: str
    mode: Literal['simulated','real']
    provider: str
    status: str
    saved_at: AwareDatetime
    event_count: int

class CalendarOriginal(Boundary):
    snapshot_id: str
    read: CalendarRead
    result: ProviderResult

class EventResearchRef(Boundary):
    snapshot_id: UUID
    event_id: str = Field(pattern=r'^[a-f0-9]{64}$')
    timezone: str | None = None

    @field_validator('timezone')
    @classmethod
    def safe_zone(cls,value): return valid_zone(value) if value is not None else None

class EventResearchContext(Boundary):
    snapshot_id: str
    mode: Literal['simulated','real']
    provider: str
    target_symbol: str
    association: Literal['source','user-selected']
    reference_time: AwareDatetime
    result_hash: str
    event: CalendarEventView
    label: str = '事件来源快照仅为研究上下文，不证明投资影响；预告不等于已经发生。'
