"""Internal, explicit pi experiment. No production app import, route or switch.

RunManager/Store still own the entire lifecycle. A factory takes the Store ID
and creates a fresh Python model and single-use bridge; Node starts only in run.
Only Fake or the existing OpenAI adapter with MockTransport is supported here.
"""
from dataclasses import dataclass, field, replace
from pathlib import Path
from collections.abc import Callable
import math

import httpx

from .lifecycle import Timing
from .model_provider import FakeModelProvider
from .openai_provider import ModelConfiguration, OpenAIModelProvider
from .pi_model_bridge import PiModelBridge
from .tools import ToolRegistry


@dataclass(frozen=True)
class PiRuntime:
    tools: ToolRegistry = field(repr=False)
    node: Path
    configuration: ModelConfiguration | Callable[[], ModelConfiguration] | None = field(default=None, repr=False)
    transport: httpx.MockTransport | None = field(default=None, repr=False)
    timing: Timing = Timing()
    model_timeout: float = 2.0
    response_timeout: float = 3.0
    max_calls: int = 8
    max_model_calls: int = 9
    worker: Path | None = None

    def __post_init__(self):
        # Configuration lives in Python. Requiring MockTransport prevents this
        # internal entry from becoming an accidental live-model selector.
        if self.configuration is None:
            if self.transport is not None:
                raise ValueError("Fake mode has no HTTP transport")
        elif not isinstance(self.transport, httpx.MockTransport):
            raise ValueError("Internal pi requires an explicit MockTransport")
        if (not 0.01 <= self.model_timeout < self.response_timeout <= 10 or
            not 0 < self.timing.tool_timeout <= self.response_timeout * 0.8 or
            not 0 <= self.timing.delay < self.timing.tool_timeout or
            not 0 < self.timing.run_timeout <= 120):
            raise ValueError("Invalid internal pi timeout hierarchy")

    @property
    def kind(self):
        # Existing public DTO values describe model kind, not the engine.
        return "fake_agent" if self.configuration is None else "openai_agent"

    def create(self, run_id):
        if self.configuration is None:
            model = FakeModelProvider()
        else:
            config = self.configuration() if callable(self.configuration) else self.configuration
            if (type(config) is not ModelConfiguration or
                not all(isinstance(getattr(config, name), str) for name in ('base_url', 'model', 'api_key', 'reasoning_effort')) or
                not isinstance(config.request_timeout, (int, float)) or
                not math.isfinite(config.request_timeout) or not 0 < config.request_timeout):
                raise ValueError("Invalid model configuration snapshot")
            # Frozen dataclass of scalar values. Never defer config access to
            # the first model request, which may be much later than start().
            model = OpenAIModelProvider(replace(config), transport=self.transport)
        bridge = PiModelBridge(self.tools, model, node=self.node, worker=self.worker,
                               run_id=run_id, model_timeout=self.model_timeout,
                               response_timeout=self.response_timeout, max_calls=self.max_calls,
                               max_model_calls=self.max_model_calls)
        # Same TOOL_TIMEOUT reason for Manager and bridge; both are earlier
        # than Node's RPC guard. Manager also covers before_tool's delay.
        bridge.tool_timeout = self.timing.tool_timeout
        return bridge

    def start(self, manager, session_id, text):
        return manager.start(session_id, text, "normal", kind=self.kind,
                             runner_factory=self.create, timing=self.timing)
