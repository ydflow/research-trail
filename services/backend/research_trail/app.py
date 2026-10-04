import platform
import secrets
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel


class Health(BaseModel):
    status: str = "ok"
    service: str = "research-trail"
    python_version: str


def create_app(token: str) -> FastAPI:
    if len(token) < 32:
        raise ValueError("启动令牌缺失或过短；请由 Electron 启动服务。")
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health", response_model=Health)
    def health(x_researchtrail_token: Annotated[str | None, Header()] = None) -> Health:
        if not secrets.compare_digest(x_researchtrail_token or "", token):
            raise HTTPException(status_code=401, detail="Invalid startup token")
        return Health(python_version=platform.python_version())

    return app
