import asyncio
from contextlib import asynccontextmanager
import json
import os
import socket
import sys
import threading

import uvicorn

from .app import create_app


def main() -> None:
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError("研迹后端需要 Python 3.12。请通过 start-dev.cmd 同步环境。")
    provider_options=None
    case=os.environ.get('RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE')
    if case in ('missing','failure','delayed','research-partial','research-delayed','report-updated') and os.environ.get('RESEARCH_TRAIL_OFFLINE')=='1':
        from .workspace_fixtures import fixture_executor
        provider_options={'simulated_executor':fixture_executor(case)}
    app = create_app(os.environ.pop("RESEARCH_TRAIL_TOKEN", ""),provider_options=provider_options)
    # Bind once and pass the same socket to Uvicorn: no free-port reservation race.
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", 0))
    listener.listen(128)
    listener.setblocking(False)
    port = listener.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, log_level="warning", access_log=False, timeout_graceful_shutdown=2))

    database_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(_app):
        async with database_lifespan(_app):
            print(json.dumps({"type": "ready", "port": port}), flush=True)
            yield

    app.router.lifespan_context = lifespan

    def watch_parent() -> None:
        # A command or EOF (including Electron crash) requests bounded graceful exit.
        sys.stdin.readline()
        server.should_exit = True

    threading.Thread(target=watch_parent, daemon=True, name="electron-owner").start()
    try:
        asyncio.run(server.serve(sockets=[listener]))
    finally:
        listener.close()


if __name__ == "__main__":
    main()
