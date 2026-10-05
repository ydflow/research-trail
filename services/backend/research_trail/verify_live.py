"""Explicit, at most two requests for one real tool round. Reads only local config/key.

python -m research_trail.verify_live --run
Without --run, only report whether local configuration exists. Never print key/URL/model/profile.
All runs and events are written to a new temporary DB; the daily database stays read-only.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
from tempfile import mkdtemp
import time

from .agent import AgentRunner
from .credentials import WindowsCredentialVault
from .database import Database, default_database_path
from .lifecycle import RunManager, Timing
from .market import FixtureMarketProvider
from .openai_provider import ModelConfiguration, ModelError, OpenAIModelProvider
from .settings import ConnectionInput
from .store import Store
from .tools import market_tools


def read_configuration(path):
    """Readonly snapshot of the explicitly configured model. No credential enumeration."""
    if not path.exists():
        raise ModelError("MODEL_UNCONFIGURED", "未配置模型。")
    try:
        with sqlite3.connect(path.as_uri() + "?mode=ro", uri=True) as db:
            db.row_factory = sqlite3.Row
            if not db.execute("SELECT 1 FROM sqlite_master WHERE name='connections'").fetchone():
                raise ModelError("MODEL_UNCONFIGURED", "未配置模型。")
            row = db.execute("SELECT * FROM connections WHERE kind='model'").fetchone()
        if row is None or not row["enabled"]:
            raise ModelError("MODEL_UNCONFIGURED", "未配置或已停用模型。")
        config = ConnectionInput(**{name: row[name] for name in ConnectionInput.model_fields if name in row.keys()})
        if not config.endpoint or not config.model:
            raise ModelError("MODEL_CONFIG_INVALID", "模型地址或ID未配置。")
        if not row["credential_ref"]:
            raise ModelError("MODEL_CREDENTIAL_MISSING", "系统凭证未配置。")
        namespace = sha256(str(path).casefold().encode("utf-8")).hexdigest()[:32]
        key = WindowsCredentialVault().get(f"ResearchTrail/{namespace}/{row['credential_ref']}")
        if not key:
            raise ModelError("MODEL_CREDENTIAL_MISSING", "系统凭证未配置。")
        # Match production transport policy; never send a key over remote plaintext HTTP.
        from ipaddress import ip_address
        from urllib.parse import urlsplit
        url = urlsplit(config.endpoint)
        try:
            loopback = ip_address(url.hostname).is_loopback
        except ValueError:
            loopback = url.hostname == "localhost"
        if url.scheme != "https" and not loopback:
            raise ModelError("MODEL_CONFIG_INVALID", "远程模型需要HTTPS。")
        return ModelConfiguration(config.endpoint, config.model, key, min(config.request_timeout_seconds, 30)), min(config.run_timeout_seconds, 60)
    except ModelError:
        raise
    except Exception:
        raise ModelError("MODEL_LOCAL_CONFIG_ERROR", "本机配置或系统凭证不可用。") from None


def verify(path, *, execute=False):
    try:
        config, timeout = read_configuration(Path(path).resolve())
    except ModelError as error:
        return {"real_validation": "not_executed", "reason": error.error.code, "requests_started": 0}
    if not execute:
        return {"real_validation": "not_executed", "reason": "CONFIGURED_REQUIRES_EXPLICIT_RUN", "requests_started": 0}
    directory = Path(mkdtemp(prefix="research-trail-live-qa-"))
    db = Database(directory / "validation.sqlite3")
    manager = None
    try:
        db.migrate()
        store = Store(db)
        model = OpenAIModelProvider(config)
        runner = AgentRunner(model, market_tools(FixtureMarketProvider()), max_tool_rounds=1)
        manager = RunManager(store, runner, {"normal": Timing(tool_timeout=2, run_timeout=timeout)})
        sid = store.create_session("一次真实模型工具验证").id
        record = manager.start(sid, "请调用market_quote查询AAPL.US，再依据返回结果回复。请明确说明模拟数据、非实时行情及来源时间。", "normal", kind="openai_agent")
        deadline = time.monotonic() + timeout + 2
        while record.status == "running" and time.monotonic() < deadline:
            time.sleep(0.05)
            record = store.run(sid, record.id)
        events = store.events(sid, record.id).events
        results = [event for event in events if event.type == "tool_result"]
        passed = record.status == "completed" and len(results) == 1 and results[0].payload.result.ok
        return {"real_validation": "passed" if passed else "failed", "run_status": record.status,
                "reason": record.error.code if record.error else None if passed else "TOOL_CALL_NOT_OBSERVED",
                "requests_started": model.requests_started, "tool_results": len(results), "event_count": len(events),
                "market_source": "fixture", "evidence_directory": str(directory)}
    finally:
        if manager:
            manager.shutdown()
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true", help="explicitly allow at most two model requests")
    args = parser.parse_args()
    result = verify(default_database_path(), execute=args.run)
    print(json.dumps(result, ensure_ascii=False))
    return 1 if result["real_validation"] == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
