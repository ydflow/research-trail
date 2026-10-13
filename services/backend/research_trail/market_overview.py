"""Small bounded offline reader: two executions, two queued reads, per-request cancellation."""
import asyncio
from collections import OrderedDict
from datetime import datetime, timezone
import time
from pydantic import ValidationError
from .market_overview_contracts import (OverviewQuery, OverviewRow, OverviewSummary, MarketOverview,
    OverviewFailure, OverviewCancelResult)
from .market_overview_fixtures import overview_rows, FETCHED_AT, TIMEZONES

ERRORS = {
    'REAL_OVERVIEW_NOT_AUTHORIZED': ('unauthorized','真实总览本轮未授权；未调用行情服务。',False),
    'CRYPTO_PROVIDER_NOT_CONNECTED': ('unavailable','加密货币真实 Provider 尚未接入。',False),
    'UNCONFIGURED': ('unconfigured','数据源未配置。',False),
    'ACCESS_DENIED': ('restricted','行情权限受限。',False),
    'RATE_LIMITED': ('rate_limited','请求受限流；未自动重试。',True),
    'NETWORK_ERROR': ('failed','行情连接失败。',True),
    'TIMEOUT': ('timed_out','总览读取超时，迟到结果不会显示。',True),
    'CANCELLED': ('cancelled','本次总览读取已取消。',False),
    'INVALID_RESPONSE': ('failed','总览数据格式、数值或资产语义异常。',False),
    'REQUEST_LIMIT': ('busy','总览请求已达上限，请稍后重试。',True),
    'REQUEST_ID_CONFLICT': ('failed','请求标识已用于其他市场或模式。',False),
}


class OverviewFault(Exception):
    def __init__(self, code):
        if code not in ERRORS:
            raise ValueError('Unknown safe overview error')
        self.code = code


def failure(query, code):
    status, message, retryable = ERRORS[code]
    return OverviewFailure(request_id=query.request_id, market=query.market, mode=query.mode,
                           status=status, code=code, message=message, retryable=retryable)


class MarketOverviewService:
    def __init__(self, *, executor=overview_rows, clock=time.monotonic, timeout=5, ttl=30):
        self.executor, self.clock, self.timeout, self.ttl = executor, clock, timeout, ttl
        self.slots = asyncio.Semaphore(2)
        self.shared = {}  # market -> one execution; at most three market keys
        self.requests = {}  # request UUID -> (query, per-request stop, response task); max 4
        self.finished = OrderedDict()  # bounded idempotency and cancel-before-query tombstones
        self.cache = {}  # max three fixed market entries, no real data
        self.closed = False

    def _remember(self, identity, query, result):
        self.finished[identity] = (self.clock()+30, query, result.model_copy(deep=True) if result is not None else None)
        self.finished.move_to_end(identity)
        while len(self.finished) > 64:
            self.finished.popitem(last=False)

    async def _read(self, market):
        async with self.slots:
            rows = [OverviewRow.model_validate(r.model_dump() if isinstance(r, OverviewRow) else r) for r in await self.executor(market)]
            values = [r.change_percent for r in rows if r.change_percent is not None]
            result = MarketOverview(request_id='00000000-0000-0000-0000-000000000000', market=market,
                status='ready' if rows else 'empty', timezone=TIMEZONES[market], fetched_at=FETCHED_AT,
                served_at=datetime.now(timezone.utc), rows=rows,
                summary=OverviewSummary(total=len(rows), advancing=sum(v>0 for v in values), declining=sum(v<0 for v in values),
                    unchanged=sum(v==0 for v in values), missing=len(rows)-len(values), average_change_percent=sum(values)/len(values) if values else None))
            if not self.closed:
                self.cache[market] = (self.clock(), result.model_copy(deep=True))
            return result

    async def _respond(self, query, stop):
        identity = query.request_id
        task = None
        cancelled_wait = None
        try:
            if query.mode == 'real':
                return failure(query, 'CRYPTO_PROVIDER_NOT_CONNECTED' if query.market == 'CRYPTO' else 'REAL_OVERVIEW_NOT_AUTHORIZED')
            entry = self.cache.get(query.market)
            if entry is not None and self.clock()-entry[0] < self.ttl:
                result = entry[1].model_copy(deep=True)
                result.cache_hit = True
                result.cache_age_seconds = max(0., self.clock()-entry[0])
            else:
                task = self.shared.get(query.market)
                if task is None:
                    task = self.shared[query.market] = asyncio.create_task(self._read(query.market))
                cancelled_wait = asyncio.create_task(stop.wait())
                done, _ = await asyncio.wait((task, cancelled_wait), timeout=self.timeout, return_when=asyncio.FIRST_COMPLETED)
                if stop.is_set():
                    return failure(query, 'CANCELLED')
                if task not in done:
                    return failure(query, 'TIMEOUT')
                result = task.result().model_copy(deep=True)
            result.request_id = identity
            result.served_at = datetime.now(timezone.utc)
            return failure(query, 'CANCELLED') if stop.is_set() else result
        except asyncio.CancelledError:
            return failure(query, 'CANCELLED')
        except OverviewFault as error:
            return failure(query, error.code)
        except (ValidationError, ValueError, TypeError, KeyError):
            return failure(query, 'INVALID_RESPONSE')
        except Exception:
            return failure(query, 'INVALID_RESPONSE')
        finally:
            stop.set()  # This consumer has ended before awaiting any shared-task cleanup.
            if cancelled_wait is not None:
                cancelled_wait.cancel()
                await asyncio.gather(cancelled_wait, return_exceptions=True)
            # Shared work survives one consumer cancelling, but never the last one.
            if task is not None and not any(key != identity and q.market == query.market and not s.is_set() for key,(q,s,_) in self.requests.items()):
                if self.shared.get(query.market) is task:
                    self.shared.pop(query.market, None)
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)

    async def query(self, body):
        query = OverviewQuery.model_validate(body.model_dump())
        identity = query.request_id
        for key, (expiry, _, _) in list(self.finished.items()):
            if expiry <= self.clock():
                self.finished.pop(key)
        previous = self.finished.get(identity)
        if previous is not None:
            _, old, result = previous
            if old is None:
                return failure(query, 'CANCELLED')
            return result.model_copy(deep=True) if old == query else failure(query, 'REQUEST_ID_CONFLICT')
        active = self.requests.get(identity)
        if active is not None:
            if active[0] != query:
                return failure(query, 'REQUEST_ID_CONFLICT')
            return (await asyncio.shield(active[2])).model_copy(deep=True)
        if self.closed:
            return failure(query, 'CANCELLED')
        if len(self.requests) >= 4:
            return failure(query, 'REQUEST_LIMIT')
        stop = asyncio.Event()
        task = asyncio.create_task(self._respond(query, stop))
        self.requests[identity] = (query, stop, task)
        try:
            result = await asyncio.shield(task)
            if not self.closed:
                self._remember(identity, query, result)
            return result.model_copy(deep=True)
        except asyncio.CancelledError:
            stop.set()
            await asyncio.shield(task)
            raise
        finally:
            self.requests.pop(identity, None)

    async def cancel(self, identity):
        active = self.requests.get(identity)
        if active is not None:
            active[1].set()
            return OverviewCancelResult(request_id=identity, cancelled=True)
        if identity not in self.finished:
            self._remember(identity, None, None)
        return OverviewCancelResult(request_id=identity, cancelled=False)

    async def close(self):
        self.closed = True
        tasks = []
        for _, stop, task in self.requests.values():
            stop.set()
            tasks.append(task)
        await asyncio.gather(*tasks, return_exceptions=True)
        self.cache.clear()
        self.finished.clear()
        self.shared.clear()
