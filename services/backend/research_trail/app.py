import asyncio
import platform
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from .conversation import CreateSession, SessionDTO, MessageDTO, StartRun, RunDTO, EventPage, SessionSnapshot
from .database import Database, default_database_path
from .store import Store, MissingRecord, ActiveRun
from .lifecycle import DatabaseLease, RunManager
from .market import FixtureMarketProvider, MarketError, MarketProvider, MarketSnapshot, MarketSymbol, UnknownSymbolError
from .agent import AgentRunner
from .model_provider import FakeModelProvider, ModelProvider
from .tools import market_tools
from .credentials import CredentialUnavailable
from .settings import SettingsService, SettingsError, ConnectionKind, ConnectionInput, ConnectionView, CredentialInput, Profile, Diagnostics


class Health(BaseModel):
    status: str = "ok"
    service: str = "research-trail"
    python_version: str


def create_app(token: str, market_provider: MarketProvider | None = None, *,
               database_path: Path | str | None = None, model_provider: ModelProvider | None = None,
               run_timings=None, credential_vault=None) -> FastAPI:
    if len(token) < 32:
        raise ValueError("启动令牌缺失或过短；请由 Electron 启动服务。")
    @asynccontextmanager
    async def lifespan(app):
        database = Database(database_path if database_path is not None else default_database_path())
        lease = None
        manager = None
        try:
            lease = DatabaseLease(database.path)
            database.migrate()
            app.state.store = Store(database)
            app.state.settings = SettingsService(database, credential_vault)
            app.state.store.recover_interrupted()
            manager = app.state.manager = RunManager(app.state.store, runner, run_timings)
            yield
        finally:
            try:
                if manager:
                    manager.shutdown()
            finally:
                database.close()
                if lease:
                    lease.close()

    # Schema export only constructs the app; it never opens a database.
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    provider = market_provider if market_provider is not None else FixtureMarketProvider()
    runner = AgentRunner(model_provider if model_provider is not None else FakeModelProvider(), market_tools(provider))

    def authorize(x_researchtrail_token: Annotated[str | None, Header()] = None):
        if not secrets.compare_digest(x_researchtrail_token or "", token):
            raise HTTPException(status_code=401, detail="Invalid startup token")

    @app.exception_handler(MissingRecord)
    async def missing_record(_request, error):
        return JSONResponse(status_code=404, content={"detail": str(error)})

    @app.exception_handler(ActiveRun)
    async def active_run(_request, error):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    protected = [Depends(authorize)]

    @app.middleware("http")
    async def protect_settings_errors(request, call_next):
        try:
            return await call_next(request)
        except Exception:
            if request.url.path.startswith("/settings"):
                # Do not let an injected/native/storage exception echo the request in logs.
                return JSONResponse(status_code=503, content={"detail": "设置存储操作失败，请检查本机环境后重试。"})
            raise

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        if request.url.path.startswith("/settings"):
            # FastAPI's default errors include the raw rejected input, including secrets.
            return JSONResponse(status_code=422, content={"detail": "设置输入不符合契约，请检查字段、长度与地址格式。"})
        return JSONResponse(status_code=422, content={"detail": [{"loc": list(item["loc"]),
                            "type": item["type"], "msg": item["msg"]} for item in error.errors()]})

    @app.exception_handler(CredentialUnavailable)
    async def vault_error(_request, _error):
        return JSONResponse(status_code=503, content={"detail": "系统凭证存储不可用；未回退到明文存储。"})

    @app.exception_handler(SettingsError)
    async def settings_error(_request, error):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    @app.get("/settings/connections", response_model=list[ConnectionView], dependencies=protected)
    def connections():
        return app.state.settings.connections()

    @app.put("/settings/connections/{kind}", response_model=ConnectionView, dependencies=protected)
    def save_connection(kind: ConnectionKind, body: ConnectionInput):
        return app.state.settings.save(kind, body)

    @app.delete("/settings/connections/{kind}", response_model=ConnectionView, dependencies=protected)
    def delete_connection(kind: ConnectionKind):
        return app.state.settings.delete(kind)

    @app.put("/settings/connections/{kind}/credential", response_model=ConnectionView, dependencies=protected)
    def save_credential(kind: ConnectionKind, body: CredentialInput):
        return app.state.settings.credential(kind, body)

    @app.delete("/settings/connections/{kind}/credential", response_model=ConnectionView, dependencies=protected)
    def delete_credential(kind: ConnectionKind):
        return app.state.settings.delete_credential(kind)

    @app.post("/settings/connections/{kind}/test", response_model=ConnectionView, dependencies=protected)
    def test_connection(kind: ConnectionKind):
        return app.state.settings.test(kind)

    @app.get("/settings/profile", response_model=Profile, dependencies=protected)
    def profile():
        return app.state.settings.profile()

    @app.put("/settings/profile", response_model=Profile, dependencies=protected)
    def save_profile(body: Profile):
        return app.state.settings.save_profile(body)

    @app.delete("/settings/profile", response_model=Profile, dependencies=protected)
    def delete_profile():
        return app.state.settings.delete_profile()

    @app.get("/settings/diagnostics", response_model=Diagnostics, dependencies=protected)
    def diagnostics():
        return app.state.settings.diagnostics()

    @app.post("/sessions", response_model=SessionDTO, status_code=201, dependencies=protected)
    def create_session(body: CreateSession):
        return app.state.store.create_session(body.title)

    @app.get("/sessions", response_model=list[SessionDTO], dependencies=protected)
    def sessions():
        return app.state.store.sessions()

    @app.get("/sessions/{session_id}", response_model=SessionDTO, dependencies=protected)
    def session(session_id: str):
        return app.state.store.session(session_id)

    @app.get("/sessions/{session_id}/snapshot", response_model=SessionSnapshot, dependencies=protected)
    def session_snapshot(session_id: str):
        return app.state.store.snapshot(session_id)

    @app.delete("/sessions/{session_id}", status_code=204, dependencies=protected)
    def delete_session(session_id: str):
        app.state.manager.delete_session(session_id)
        return Response(status_code=204)

    @app.get("/sessions/{session_id}/messages", response_model=list[MessageDTO], dependencies=protected)
    def messages(session_id: str):
        return app.state.store.messages(session_id)

    @app.get("/sessions/{session_id}/runs", response_model=list[RunDTO], dependencies=protected)
    def runs(session_id: str):
        return app.state.store.runs(session_id)

    @app.post("/sessions/{session_id}/runs", response_model=RunDTO, status_code=201, dependencies=protected)
    def start_run(session_id: str, body: StartRun):
        if body.kind == "fake_agent":
            return app.state.manager.start(session_id, body.input, body.scenario)
        return app.state.store.start_fixture(session_id, body.input)

    @app.get("/sessions/{session_id}/runs/{run_id}", response_model=RunDTO, dependencies=protected)
    def run(session_id: str, run_id: str):
        return app.state.store.run(session_id, run_id)

    @app.post("/sessions/{session_id}/runs/{run_id}/cancel", response_model=RunDTO, dependencies=protected)
    def cancel_run(session_id: str, run_id: str):
        return app.state.manager.cancel(session_id, run_id)

    def event_page(session_id, run_id, after_sequence, limit=500):
        try:
            return app.state.store.events(session_id, run_id, after_sequence, limit)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/sessions/{session_id}/runs/{run_id}/event-log", response_model=EventPage, dependencies=protected)
    def event_log(session_id: str, run_id: str, after_sequence: int = Query(default=0, ge=0),
                  limit: int = Query(default=500, ge=1, le=500)):
        return event_page(session_id, run_id, after_sequence, limit)

    @app.get("/sessions/{session_id}/runs/{run_id}/events", response_class=StreamingResponse,
             responses={200: {"content": {"text/event-stream": {"schema": {"type": "string"}}}}},
             dependencies=protected)
    def stream_events(request: Request, session_id: str, run_id: str, after_sequence: int = Query(default=0, ge=0),
                      last_event_id: Annotated[str | None, Header()] = None, follow: bool = False):
        if last_event_id is not None:
            prefix, separator, cursor = last_event_id.partition(":")
            if prefix != run_id or separator != ":" or len(cursor) > 16 or not cursor.isascii() or not cursor.isdigit():
                raise HTTPException(status_code=400, detail="Last-Event-ID必须是当前运行ID:非负序号。")
            after_sequence = max(after_sequence, int(cursor))
        # Validate before opening SSE, then send only committed immutable records.
        page = event_page(session_id, run_id, after_sequence)
        record = app.state.store.run(session_id, run_id)

        async def frames():
            cursor = after_sequence
            current = page
            heartbeat = asyncio.get_running_loop().time()
            # Ended runs and finite replay keep the original response semantics.
            while True:
                for event in current.events:
                    if await request.is_disconnected():
                        return
                    yield f"id: {event.run_id}:{event.sequence}\nevent: {event.type}\ndata: {event.model_dump_json()}\n\n"
                    cursor = event.sequence
                    if follow and event.type == "run_completed":
                        return
                if not follow or await request.is_disconnected():
                    return
                try:
                    record = await asyncio.to_thread(app.state.store.run, session_id, run_id)
                    if record.status != "running" and cursor >= record.last_sequence:
                        return
                    if asyncio.get_running_loop().time() - heartbeat >= 10:
                        yield ": keep-alive\n\n"
                        heartbeat = asyncio.get_running_loop().time()
                    await asyncio.sleep(0.1)
                    current = await asyncio.to_thread(app.state.store.events, session_id, run_id, cursor)
                except MissingRecord:
                    return  # Session deletion closes its subscription, never recreates it.

        return StreamingResponse(frames(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                                          "X-ResearchTrail-Run-Status": record.status,
                                          "X-ResearchTrail-Last-Sequence": str(record.last_sequence)})

    @app.get("/health", response_model=Health, dependencies=[Depends(authorize)])
    def health() -> Health:
        return Health(python_version=platform.python_version())

    @app.get("/market/symbols", response_model=list[MarketSymbol], dependencies=[Depends(authorize)])
    def symbols() -> list[MarketSymbol]:
        return provider.symbols()

    @app.get("/market/snapshot/{symbol}", response_model=MarketSnapshot,
             responses={404: {"model": MarketError}}, dependencies=[Depends(authorize)])
    def snapshot(symbol: str):
        try:
            return provider.snapshot(symbol)
        except UnknownSymbolError:
            error = MarketError(code="UNKNOWN_SYMBOL", symbol=symbol,
                                message=f"未知股票代码：{symbol}。模拟数据仅支持 AAPL.US、NVDA.US、MSFT.US、TSLA.US。")
            return JSONResponse(status_code=404, content=error.model_dump())

    return app
