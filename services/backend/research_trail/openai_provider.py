"""Bounded Chat Completions transport. No retries, redirects, proxy/env keys or raw errors.

Protocol: https://developers.openai.com/api/docs/guides/function-calling
Only the configured model endpoint is used; credentials never enter messages or events.
"""
import asyncio
from dataclasses import dataclass, field
import json
import threading
import time

import httpx

from .conversation import ErrorPayload, LIVE_MODEL_LABEL
from .store import RunStopped

class ModelError(Exception):
    def __init__(self, code, message, retryable=False):
        self.error = ErrorPayload(code=code, message=message, retryable=retryable)
        super().__init__(message)


@dataclass(frozen=True)
class ModelConfiguration:
    base_url: str
    model: str
    api_key: str = field(repr=False)
    request_timeout: float = 30


class OpenAIModelProvider:
    label = LIVE_MODEL_LABEL

    def __init__(self, configuration, *, transport=None):
        self.configuration = configuration  # callable: snapshot once, inside owned worker
        self._snapshot = None
        self.transport = transport
        self.requests_started = 0  # Internal accounting only; no request bodies/headers are logged.
        self.last_response_info = None  # Bounded protocol diagnostics, never content or credentials.

    def complete(self, messages, tools, stop, deadline, *, max_output_tokens=1024, json_output=False):
        if type(max_output_tokens) is not int or not 1 <= max_output_tokens <= 8192:
            raise ModelError('MODEL_OUTPUT_LIMIT', '模型输出限额无效。')
        if type(json_output) is not bool: raise ModelError('MODEL_FORMAT_INVALID','模型输出格式无效。')
        if self._snapshot is None:
            self._snapshot = self.configuration() if callable(self.configuration) else self.configuration
        config = self._snapshot
        payload = {"model": config.model, "messages": messages, "stream": False, "max_tokens": max_output_tokens}
        if json_output: payload['response_format']={'type':'json_object'}
        if tools:
            payload.update(tools=tools, tool_choice="auto", parallel_tool_calls=False)
        if len(json.dumps(payload, ensure_ascii=False).encode("utf-8")) > 1024 * 1024:
            raise ModelError("MODEL_CONTEXT_LIMIT", "模型请求上下文超过1MiB限制。")
        try:
            response = asyncio.run(self._request(config, payload, stop, deadline))
            choices = response.get("choices")
            if isinstance(choices,list) and len(choices)==1 and isinstance(choices[0],dict):
                reason=choices[0].get('finish_reason')
                msg=choices[0].get('message')
                self.last_response_info={'finish_reason':reason if reason in ('stop','tool_calls','length','content_filter') else 'other',
                    'content_present':isinstance(msg,dict) and isinstance(msg.get('content'),str) and bool(msg['content'])}
            if not isinstance(choices, list) or len(choices) != 1:
                raise ValueError()
            choice = choices[0]
            message = choice["message"]
            if choice.get("finish_reason") not in ("stop", "tool_calls") or message.get("role") != "assistant":
                raise ValueError()
            # Keep only protocol fields, never provider error/debug/reasoning metadata.
            content = message.get("content")
            if content is not None and not isinstance(content, str):
                raise ValueError()
            if content:
                content = content.replace(config.api_key, "[已脱敏]")
            calls = message.get("tool_calls")
            calls = [] if calls is None else calls
            if not isinstance(calls, list) or bool(calls) != (choice["finish_reason"] == "tool_calls"):
                raise ValueError()
            return {"role": "assistant", "content": content, "tool_calls": calls}
        except (RunStopped, ModelError):
            raise
        except Exception:
            raise ModelError("MODEL_RESPONSE_INVALID", "模型返回异常响应；未执行未验证工具。") from None

    async def _request(self, config, payload, stop, deadline):
        request_deadline = time.monotonic() + config.request_timeout
        async def exchange():
            try:
                remaining = min(config.request_timeout, max(0.001, deadline - time.monotonic()))
                async with httpx.AsyncClient(timeout=remaining, trust_env=False, follow_redirects=False,
                                             transport=self.transport) as client:
                    self.requests_started += 1
                    async with client.stream("POST", config.base_url.rstrip("/") + "/chat/completions",
                                             headers={"Authorization": "Bearer " + config.api_key}, json=payload) as response:
                        if response.status_code in (401, 403):
                            raise ModelError("MODEL_AUTH_FAILED", "模型认证失败，请在本机检查API Key与权限。")
                        if response.status_code == 429:
                            raise ModelError("MODEL_RATE_LIMIT", "模型请求被限流；本次未自动重试。", True)
                        if response.status_code != 200:
                            raise ModelError("MODEL_HTTP_ERROR", "模型HTTP请求失败，请检查服务与模型配置。", response.status_code >= 500)
                        body = bytearray()
                        async for chunk in response.aiter_bytes():
                            body.extend(chunk)
                            if len(body) > 256 * 1024:
                                raise ModelError("MODEL_RESPONSE_LIMIT", "模型响应超过256KiB限制。")
                        return json.loads(body)
            except httpx.TimeoutException:
                raise ModelError("MODEL_TIMEOUT", "模型单次请求超时。", True) from None
            except httpx.RequestError:
                raise ModelError("MODEL_NETWORK_ERROR", "模型网络连接失败。", True) from None

        task = asyncio.create_task(exchange())
        try:
            while True:
                if stop.is_set():
                    raise RunStopped()
                if time.monotonic() >= deadline:
                    raise ModelError("RUN_TIMEOUT", "模型运行达到整体时间限制。")
                if time.monotonic() >= request_deadline:
                    raise ModelError("MODEL_TIMEOUT", "模型单次请求超时。", True)
                done, _ = await asyncio.wait({task}, timeout=0.05)
                if done:
                    return await task
        finally:
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)
