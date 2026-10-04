import platform
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from .conversation import CreateSession, SessionDTO, MessageDTO, StartRun, RunDTO, EventPage
from .database import Database, default_database_path
from .store import Store, MissingRecord
from .market import FixtureMarketProvider, MarketError, MarketProvider, MarketSnapshot, MarketSymbol, UnknownSymbolError


class Health(BaseModel):
    status: str = "ok"
    service: str = "research-trail"
    python_version: str


def create_app(token: str, market_provider: MarketProvider | None = None, *,
               database_path: Path | str | None = None) -> FastAPI:
    if len(token) < 32:
        raise ValueError("启动令牌缺失或过短；请由 Electron 启动服务。")
    @asynccontextmanager
    async def lifespan(app):
        database = Database(database_path if database_path is not None else default_database_path())
        try:
            database.migrate()
            app.state.store = Store(database)
            yield
        finally:
            database.close()

    # Schema export only constructs the app; it never opens a database.
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    provider = market_provider if market_provider is not None else FixtureMarketProvider()

    def authorize(x_researchtrail_token: Annotated[str | None, Header()] = None):
        if not secrets.compare_digest(x_researchtrail_token or "", token):
            raise HTTPException(status_code=401, detail="Invalid startup token")

    @app.exception_handler(MissingRecord)
    async def missing_record(_request, error):
        return JSONResponse(status_code=404, content={"detail": str(error)})

    protected = [Depends(authorize)]

    @app.post("/sessions", response_model=SessionDTO, status_code=201, dependencies=protected)
    def create_session(body: CreateSession):
        return app.state.store.create_session(body.title)

    @app.get("/sessions", response_model=list[SessionDTO], dependencies=protected)
    def sessions():
        return app.state.store.sessions()

    @app.get("/sessions/{session_id}", response_model=SessionDTO, dependencies=protected)
    def session(session_id: str):
        return app.state.store.session(session_id)

    @app.delete("/sessions/{session_id}", status_code=204, dependencies=protected)
    def delete_session(session_id: str):
        app.state.store.delete_session(session_id)
        return Response(status_code=204)

    @app.get("/sessions/{session_id}/messages", response_model=list[MessageDTO], dependencies=protected)
    def messages(session_id: str):
        return app.state.store.messages(session_id)

    @app.get("/sessions/{session_id}/runs", response_model=list[RunDTO], dependencies=protected)
    def runs(session_id: str):
        return app.state.store.runs(session_id)

    @app.post("/sessions/{session_id}/runs", response_model=RunDTO, status_code=201, dependencies=protected)
    def start_run(session_id: str, body: StartRun):
        return app.state.store.start_fixture(session_id, body.input)

    @app.get("/sessions/{session_id}/runs/{run_id}", response_model=RunDTO, dependencies=protected)
    def run(session_id: str, run_id: str):
        return app.state.store.run(session_id, run_id)

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
    def stream_events(session_id: str, run_id: str, after_sequence: int = Query(default=0, ge=0),
                      last_event_id: Annotated[str | None, Header()] = None):
        if last_event_id is not None:
            prefix, separator, cursor = last_event_id.partition(":")
            if prefix != run_id or separator != ":" or len(cursor) > 16 or not cursor.isascii() or not cursor.isdigit():
                raise HTTPException(status_code=400, detail="Last-Event-ID必须是当前运行ID:非负序号。")
            after_sequence = max(after_sequence, int(cursor))
        # Validate before opening SSE, then send only committed immutable records.
        page = event_page(session_id, run_id, after_sequence)

        def frames():
            for event in page.events:
                yield f"id: {event.run_id}:{event.sequence}\nevent: {event.type}\ndata: {event.model_dump_json()}\n\n"

        return StreamingResponse(frames(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

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
