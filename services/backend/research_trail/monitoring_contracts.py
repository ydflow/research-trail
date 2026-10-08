"""Step21: explicit opt-in rules. Scheduling never authorizes paid report synthesis."""
from decimal import Decimal
from typing import Literal, Annotated
from uuid import UUID
from pydantic import AwareDatetime, Field, field_validator, model_validator
from .provider_contracts import Boundary
from .analytics_contracts import Symbol
from .calendar_contracts import valid_zone
from .portfolio_contracts import Id, decimal_value, decimal_text

RuleKind = Literal['price_above','price_below','new_news','earnings','rating_change','dividend',
    'position_weight','portfolio_drawdown','watchlist-daily-review','portfolio-daily-brief',
    'weekly-thesis-review','pre-earnings-research','post-earnings-research']

class RuleInput(Boundary):
    request_id: UUID
    name: str = Field(min_length=1,max_length=60)
    kind: RuleKind
    enabled: bool = Field(default=False,strict=True)
    mode: Literal['simulated','real'] = 'simulated'
    provider: Literal['longbridge','massive'] = 'longbridge'
    symbol: Symbol | None = None
    portfolio_id: Id | None = None
    threshold: str | None = None
    cooldown_minutes: int = Field(default=60,ge=0,le=10080,strict=True)
    horizon_days: int = Field(default=7,ge=1,le=30,strict=True)
    timezone: str = 'Asia/Shanghai'
    hour: int = Field(default=16,ge=0,le=23,strict=True)
    minute: int = Field(default=30,ge=0,le=59,strict=True)
    days: list[Annotated[int,Field(ge=1,le=7,strict=True)]] = Field(default_factory=lambda:[1,2,3,4,5],min_length=1,max_length=7)
    notify: Literal['material-only','all'] = 'material-only'
    auto_research: bool = Field(default=False,strict=True)
    _zone = field_validator('timezone')(valid_zone)

    @model_validator(mode='before')
    @classmethod
    def weekly_defaults(cls,value):
        if isinstance(value,dict) and value.get('kind')=='weekly-thesis-review':
            value={'hour':9,'minute':0,'days':[7],**value}
        return value

    @field_validator('name')
    @classmethod
    def safe_name(cls,value):
        if not value.strip() or any(ord(c)<32 for c in value): raise ValueError('规则名称无效')
        return value.strip()

    @field_validator('threshold')
    @classmethod
    def number(cls,value):
        return decimal_text(decimal_value(value)) if value is not None else None

    @model_validator(mode='after')
    def complete(self):
        if self.auto_research and (self.kind not in {'pre-earnings-research','post-earnings-research'} or self.symbol is None):
            raise ValueError('自动采集仅用于指定股票的财报前/后规则')
        if len(set(self.days))!=len(self.days) or any(type(d)!=int or d<1 or d>7 for d in self.days):
            raise ValueError('星期须为不重复的ISO星期1至7')
        symbol_kinds={'price_above','price_below','new_news','earnings','rating_change','dividend','position_weight'}
        if self.kind in symbol_kinds and self.symbol is None: raise ValueError('此规则需要股票')
        if self.kind in {'position_weight','portfolio_drawdown','portfolio-daily-brief'} and self.portfolio_id is None:
            raise ValueError('此规则需要已保存组合')
        if self.kind in {'price_above','price_below','position_weight','portfolio_drawdown'}:
            if self.threshold is None: raise ValueError('此规则需要阈值')
            if self.kind in {'position_weight','portfolio_drawdown'} and Decimal(self.threshold)>1:
                raise ValueError('权重及回撤阈值须为0至1')
        elif self.threshold is not None: raise ValueError('此规则不接受阈值')
        return self

class RuleToggle(Boundary):
    enabled: bool = Field(strict=True)

class RuleView(Boundary):
    id: str
    created_at: AwareDatetime
    revision: int
    input: RuleInput
    last_checked_at: AwareDatetime | None = None
    last_triggered_at: AwareDatetime | None = None
    last_code: str | None = None
    next_due: AwareDatetime | None = None

class MonitorRun(Boundary):
    id: str
    rule_id: str
    occurrence: str
    started_at: AwareDatetime
    completed_at: AwareDatetime | None = None
    status: Literal['running','triggered','quiet','failed','interrupted','skipped']
    code: str | None = None
    notified: bool = False
    notification_status: Literal['none','pending','claimed','shown','failed','unsupported','uncertain','suppressed'] = 'none'
    payload: dict

class NotificationResult(Boundary):
    status: Literal['shown','failed','unsupported']

class MonitorResearchInput(Boundary):
    symbol: Symbol

class MonitorResearchAction(Boundary):
    id: str
    run_id: str
    symbol: str
    status: Literal['claimed','dispatched','failed','uncertain']
    research_id: str | None = None
    code: str | None = None

class TodayInput(Boundary):
    timezone: str = 'Asia/Shanghai'
    _zone = field_validator('timezone')(valid_zone)

class TodayItem(Boundary):
    source: Literal['alert','automation','calendar','research','report','thesis','portfolio','watchlist']
    source_id: str
    title: str
    status: str
    reason: str
    symbol: str | None = None
    mode: str | None = None
    provider: str | None = None

class DailyBrief(Boundary):
    date: str
    source_counts: dict[str,int]
    attention_count: int
    description: str = '已有来源的确定性每日聚合；不消费模型，不给投资影响评分。'

class TodayView(Boundary):
    generated_at: AwareDatetime
    timezone: str
    application_only: bool = True
    external_tracing: bool = False
    items: list[TodayItem]
    runs: list[MonitorRun]
    rules: list[RuleView]
    research_actions: list[MonitorResearchAction]
    brief: DailyBrief
    limitations: list[str]
