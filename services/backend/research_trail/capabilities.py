"""Single Python capability catalog and live views; no duplicated health storage.

Design reference: Folio ba5dcdfd, shared/src/capabilities/{registry,readiness}.ts.
Python implementation; provider health remains owned by ProviderService.
"""
from dataclasses import dataclass
from typing import Callable, Literal
from pydantic import BaseModel, ConfigDict
from .conversation import ToolArguments
from .analytics_contracts import RiskQuery, CompareQuery
from .provider_contracts import MARKET_CAPABILITIES, ACCOUNT_CAPABILITIES, MASSIVE_CAPABILITIES, CapabilityView

SUPPORTED = {'longbridge': MARKET_CAPABILITIES, 'longbridge-account': ACCOUNT_CAPABILITIES, 'massive': MASSIVE_CAPABILITIES}
CLI_CAPABILITIES = ('account.accounts', 'account.portfolio')

@dataclass(frozen=True)
class ToolSpec:
    arguments: type[BaseModel]
    result_kind: str

TOOL_SPECS = {'market.quote': ToolSpec(ToolArguments, 'quote'), 'market.kline': ToolSpec(ToolArguments, 'kline'),
              'portfolio.risk': ToolSpec(RiskQuery, 'risk'), 'stocks.compare': ToolSpec(CompareQuery, 'compare')}

class CapabilityState(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    implemented: bool
    available: bool
    mode: Literal['simulated', 'real']
    provider: str
    code: str
    tool_exposed: bool = False

class CapabilityRegistry:
    def __init__(self):
        self.handlers: dict[str, Callable] = {}
        self.providers = None

    def register_tool(self, name, handler):
        if name not in TOOL_SPECS or name in self.handlers:
            raise ValueError('工具名称未允许或已注册')
        self.handlers[name] = handler

    def provider_views(self):
        service = self.providers
        profiles = {p.provider: p.revision for p in service.settings.profiles()}
        with service.lock:
            return [CapabilityView(provider=p, capability=c,
                transport='http' if p == 'massive' else 'cli' if c in CLI_CAPABILITIES else 'sdk',
                **service.health.get((p, c, profiles[p]), {})) for p, cs in SUPPORTED.items() for c in cs]

    def state(self, name, mode='simulated', provider='longbridge'):
        if name in ('calendar.earnings','calendar.macro','calendar.central-bank'):
            # Calendar coverage derives from the same provider health, never another health table.
            base=self.state('research.events',mode,provider).model_copy(update={'id':name,'tool_exposed':False})
            if name=='calendar.central-bank' and mode=='real':
                return base.model_copy(update={'implemented':False,'available':False,'code':'NOT_IMPLEMENTED'})
            return base
        is_tool = name in self.handlers
        data = name in set(c for cs in SUPPORTED.values() for c in cs)
        implemented = is_tool or data
        code, available = 'NOT_IMPLEMENTED', False
        if implemented:
            if name in ('portfolio.risk', 'stocks.compare'):
                code, available = 'PYTHON_COMPUTATION', True
            elif name not in SUPPORTED.get(provider, []):
                code = 'PROVIDER_UNSUPPORTED'
            elif mode == 'simulated':
                code, available = 'SIMULATED_ONLY', True
            elif self.providers is None:
                code = 'UNCONFIGURED'
            else:
                profile = self.providers.settings.profile(provider)
                if not profile.configured: code = 'UNCONFIGURED'
                elif not profile.enabled: code = 'PROVIDER_DISABLED'
                elif not profile.credential_present and name not in CLI_CAPABILITIES: code = 'CREDENTIAL_MISSING'
                else:
                    with self.providers.lock:
                        health = self.providers.health.get((provider, name, profile.revision), {})
                    validation = health.get('validation', 'unverified')
                    available = validation == 'real'
                    code = 'REAL_REQUEST_VERIFIED' if available else health.get('code') or 'REAL_UNVERIFIED'
        # Legacy market tools always read the fixture; never expose them as real tools.
        exposed = is_tool and (name not in ('market.quote', 'market.kline') or mode == 'simulated')
        return CapabilityState(id=name, implemented=implemented, available=available, mode=mode,
                               provider=provider, code=code, tool_exposed=exposed and available)

    def list(self, mode='simulated', provider='longbridge'):
        names = sorted(set(TOOL_SPECS) | {c for cs in SUPPORTED.values() for c in cs} | {'calendar.earnings','calendar.macro','calendar.central-bank'})
        return [self.state(n, mode, provider) for n in names]

    def tool_available(self, name):
        return name in self.handlers and self.state(name).tool_exposed
