import platform
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from .market import FixtureMarketProvider, MarketError, MarketProvider, MarketSnapshot, MarketSymbol, UnknownSymbolError


class Health(BaseModel):
    status: str = "ok"
    service: str = "research-trail"
    python_version: str


def create_app(token: str, market_provider: MarketProvider | None = None) -> FastAPI:
    if len(token) < 32:
        raise ValueError("启动令牌缺失或过短；请由 Electron 启动服务。")
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    provider = market_provider if market_provider is not None else FixtureMarketProvider()

    def authorize(x_researchtrail_token: Annotated[str | None, Header()] = None):
        if not secrets.compare_digest(x_researchtrail_token or "", token):
            raise HTTPException(status_code=401, detail="Invalid startup token")

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
