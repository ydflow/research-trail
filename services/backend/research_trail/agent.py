"""One rule decision and at most one read-only Python tool call per run."""
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal
from uuid import uuid4

from .conversation import MODEL_LABEL, ErrorPayload, ToolCall, ToolSuccess, ToolFailure
from .model_provider import ModelProvider, SUPPORTED_SCOPE
from .tools import ToolRegistry, ToolExecutionError


@dataclass(frozen=True)
class AgentOutcome:
    answer: str
    status: Literal["completed", "failed"]
    error: ErrorPayload | None = None


class AgentRunner:
    def __init__(self, model: ModelProvider, tools: ToolRegistry):
        self.model, self.tools = model, tools

    @staticmethod
    def failed(error: ErrorPayload, emit):
        emit("error", error.model_dump(mode="json"))
        return AgentOutcome(f"{MODEL_LABEL}：运行失败。{error.message}", "failed", error)

    def run(self, text: str, emit: Callable[[str, dict], None], *, before_tool=lambda: None,
            after_tool=lambda: None) -> AgentOutcome:
        emit("status", {"phase": "working", "detail": f"{MODEL_LABEL}：识别明确的股票查询指令。"})
        try:
            planned = self.model.plan(text)
            call = ToolCall.model_validate(planned.model_dump()) if planned is not None else None
        except Exception:
            return self.failed(ErrorPayload(code="MODEL_ERROR", message="规则模型未能生成合法工具请求。"), emit)
        if call is None:
            return AgentOutcome(f"{MODEL_LABEL}：{SUPPORTED_SCOPE}", "completed")

        call_id = str(uuid4())
        emit("tool_started", {"call_id": call_id, "name": call.name, "input": call.arguments.model_dump()})
        before_tool()
        try:
            data = self.tools.execute(call)
        except ToolExecutionError as error:
            after_tool()
            emit("tool_result", {"call_id": call_id, "name": call.name,
                                 "result": ToolFailure(error=error.error).model_dump(mode="json")})
            return self.failed(error.error, emit)
        after_tool()
        emit("tool_result", {"call_id": call_id, "name": call.name,
                             "result": ToolSuccess(data=data).model_dump(mode="json")})
        try:
            answer = self.model.respond(data)
            if not isinstance(answer, str) or not answer.strip() or len(answer) > 4000:
                raise ValueError("Invalid model reply")
        except Exception:
            return self.failed(ErrorPayload(code="MODEL_ERROR", message="规则模型生成回复失败；工具结果已记录。"), emit)
        return AgentOutcome(answer, "completed")
