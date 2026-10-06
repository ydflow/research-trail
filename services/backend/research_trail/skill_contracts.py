from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from .capabilities import CapabilityState

class SkillBoundary(BaseModel):
    model_config = ConfigDict(extra='forbid')

class SkillContext(SkillBoundary):
    mode: Literal['simulated', 'real'] = 'simulated'
    provider: Literal['longbridge', 'longbridge-account', 'massive'] = 'longbridge'

class SkillToggle(SkillContext):
    enabled: bool = Field(strict=True)

class SkillRead(SkillContext):
    path: str = Field(min_length=1, max_length=160)

class SkillView(SkillBoundary):
    id: str
    name: str
    description: str
    enabled: bool
    status: Literal['ready', 'partial', 'unavailable', 'disabled', 'invalid']
    code: str
    mode: Literal['simulated', 'real']
    provider: str
    required: list[CapabilityState]
    optional: list[CapabilityState]
    resources: list[str]
    missing_resources: list[str]
    source: str

class SkillResource(SkillBoundary):
    skill_id: str
    path: str
    content: str
    mode: Literal['simulated', 'real']
    label: str = '参考文本；不是可执行指令或能力验收证明'
