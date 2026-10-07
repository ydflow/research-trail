"""Settings isolation, secrets, real native vault and retained conversation evidence."""
from contextlib import contextmanager
import json
import socket
import sqlite3
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import text

from research_trail.app import create_app
from research_trail.credentials import CredentialUnavailable, WindowsCredentialVault
from research_trail.database import Database
from research_trail.settings import SettingsService, KINDS, CredentialInput

TOKEN = "settings-test-only-" * 4
HEADERS = {"X-ResearchTrail-Token": TOKEN}
SENTINEL = "test-only-secret-研迹-never-return-" + "x" * 12


class Vault:
    """Injected in unit tests only. Production has no memory/plaintext fallback."""
    def __init__(self):
        self.values = {}
        self.fail = False

    def get(self, target):
        if self.fail:
            raise RuntimeError(SENTINEL)
        return self.values.get(target)

    def set(self, target, value):
        if self.fail:
            raise RuntimeError(SENTINEL)
        self.values[target] = value

    def delete(self, target):
        if self.fail:
            raise RuntimeError(SENTINEL)
        self.values.pop(target, None)


@pytest.fixture
def settings(tmp_path):
    vault = Vault()
    path = tmp_path / "settings.sqlite3"
    app = create_app(TOKEN, database_path=path, credential_vault=vault)
    with TestClient(app, headers=HEADERS) as client:
        yield client, vault, path, app


def rows(client):
    return {row["kind"]: row for row in client.get("/settings/connections").json()}


def save(client, kind="model", **values):
    response = client.put(f"/settings/connections/{kind}", json=values)
    assert response.status_code == 200, response.text
    return response.json()


def test_independent_success_failure_invalid_unconfigured(settings, monkeypatch):
    client, vault, path, app = settings
    monkeypatch.setattr(socket, "create_connection", lambda *_a, **_kw: pytest.fail("Probe attempted network"))
    assert {value["status"] for value in rows(client).values()} == {"unconfigured"}
    assert client.post("/settings/connections/model/test").json()["status"] == "unconfigured"
    save(client, endpoint="https://203.0.113.1/v1", model="demo-model")
    assert client.post("/settings/connections/model/test").json()["status"] == "ready"
    assert all(value["status"] == "unconfigured" for kind, value in rows(client).items() if kind != "model")
    for kind, result, expected in [("market", "failure", "failed"), ("account", "invalid", "invalid"),
                                   ("skills", "success", "ready"), ("runtime", "success", "ready")]:
        save(client, kind, fake_result=result)
        assert client.post(f"/settings/connections/{kind}/test").json()["status"] == expected
    assert rows(client)["model"]["status"] == "ready"
    assert client.get("/settings/diagnostics").json()["real_requests_sent"] is False


def test_configuration_edit_and_disabled_invalidate(settings):
    client, *_ = settings
    save(client)
    client.post("/settings/connections/model/test")
    changed = save(client, model="changed")
    assert changed["status"] == "invalid" and changed["checked_at"] is None
    assert changed["revision"] == 2
    assert client.post("/settings/connections/model/test").json()["status"] == "ready"
    assert save(client, enabled=False)["status"] == "disabled"
    assert client.post("/settings/connections/model/test").json()["status"] == "disabled"
    assert save(client, enabled=True)["status"] == "invalid"


def test_credentials_missing_changed_deleted_and_not_returned(settings, caplog):
    client, vault, path, app = settings
    save(client, requires_credential=True)
    assert client.post("/settings/connections/model/test").json()["reason"] == "CREDENTIAL_MISSING"
    first = client.put("/settings/connections/model/credential", json={"secret": SENTINEL})
    assert first.status_code == 200 and first.json()["credential_present"]
    assert SENTINEL not in first.text
    assert client.post("/settings/connections/model/test").json()["status"] == "ready"
    saved_credentials = dict(vault.values)
    for target in vault.values:
        vault.values[target] = ""  # A system entry externally cleared is not a usable credential.
    assert rows(client)["model"]["reason"] == "CREDENTIAL_MISSING"
    vault.values.update(saved_credentials)
    old_targets = set(vault.values)
    replaced = client.put("/settings/connections/model/credential", json={"secret": SENTINEL + "-new"})
    assert replaced.json()["status"] == "invalid"
    assert not old_targets.intersection(vault.values)
    client.post("/settings/connections/model/test")
    vault.values.clear()  # Credential removed outside the application.
    assert rows(client)["model"]["reason"] == "CREDENTIAL_MISSING"
    client.put("/settings/connections/model/credential", json={"secret": SENTINEL})
    assert client.delete("/settings/connections/model/credential").json()["credential_present"] is False
    assert client.post("/settings/connections/model/test").json()["status"] == "invalid"
    assert not vault.values
    assert client.delete("/settings/connections/model").json()["status"] == "unconfigured"
    assert client.delete("/settings/connections/model").status_code == 200
    for artifact in (path, path.with_name(path.name + "-wal"), path.with_name(path.name + "-shm")):
        if artifact.exists():
            assert SENTINEL.encode("utf-8") not in artifact.read_bytes()
    assert SENTINEL not in caplog.text


def test_vault_failure_preserves_config_and_redacts_all_responses(settings, caplog):
    client, vault, path, app = settings
    save(client)
    client.put("/settings/connections/model/credential", json={"secret": SENTINEL})
    client.post("/settings/connections/model/test")
    vault.fail = True
    assert client.put("/settings/connections/model/credential", json={"secret": SENTINEL}).status_code == 503
    for operation in [lambda: client.get("/settings/connections"), lambda: client.get("/settings/diagnostics"),
                      lambda: client.delete("/settings/connections/model/credential"),
                      lambda: client.delete("/settings/connections/model")]:
        response = operation()
        assert SENTINEL not in response.text
    assert rows(client)["model"]["reason"] == "VAULT_UNAVAILABLE"
    vault.fail = False
    assert rows(client)["model"]["credential_present"]
    assert SENTINEL not in caplog.text


@pytest.mark.parametrize("payload", [{"secret": ""}, {"secret": SENTINEL * 100}, {"secret": {"token": SENTINEL}},
                                     {"secret": SENTINEL, "unexpected": SENTINEL}])
def test_secret_validation_never_echoes_input(settings, payload):
    client, *_ = settings
    response = client.put("/settings/connections/model/credential", json=payload)
    assert response.status_code == 422
    assert SENTINEL not in response.text and "input" not in response.json()


@pytest.mark.parametrize("endpoint", ["https://user:test-only-secret@example.com", "https://example.com/?api_key=test-only-secret",
                                        "https://example.com/#test-only-secret", "file:///test-only-secret"])
def test_urls_cannot_store_embedded_credentials(settings, endpoint):
    client, _, path, _ = settings
    response = client.put("/settings/connections/model", json={"endpoint": endpoint})
    assert response.status_code == 422 and "test-only-secret" not in response.text
    assert rows(client)["model"]["configured"] is False


def test_auth_unknown_category_and_local_categories(settings):
    client, *_ = settings
    for method, path, body in [("GET", "/settings/connections", None), ("PUT", "/settings/connections/model", {}),
                               ("PUT", "/settings/connections/model/credential", {"secret": SENTINEL}),
                               ("DELETE", "/settings/connections/model", None), ("POST", "/settings/connections/model/test", None),
                               ("GET", "/settings/profile", None), ("PUT", "/settings/profile", {}),
                               ("DELETE", "/settings/profile", None), ("GET", "/settings/diagnostics", None)]:
        assert client.request(method, path, json=body, headers={"X-ResearchTrail-Token": "wrong"}).status_code == 401
    assert client.put("/settings/connections/unknown", json={}).status_code == 422
    for kind in ("skills", "runtime"):
        assert client.put(f"/settings/connections/{kind}", json={"requires_credential": True}).status_code == 409
        save(client, kind)
        assert client.put(f"/settings/connections/{kind}/credential", json={"secret": SENTINEL}).status_code == 409


def test_diagnostics_whitelist_profile_and_restart(settings):
    client, vault, path, app = settings
    save(client, endpoint="https://example.com/v1", model="demo-model")
    client.put("/settings/connections/model/credential", json={"secret": SENTINEL})
    client.post("/settings/connections/model/test")
    profile = {"display_name": "本机研究者", "research_style": "cautious"}
    assert client.put("/settings/profile", json=profile).json() == profile
    before = rows(client)
    report = client.get("/settings/diagnostics").json()
    assert set(report) == {"schema_version", "scope", "generated_at", "test_mode", "real_requests_sent", "credential_storage", "connections"}
    assert report["scope"] == "connection-probes"
    assert all(set(row) == {"kind", "configured", "credential_present", "status", "reason", "checked_at"} for row in report["connections"])
    serialized = json.dumps(report, ensure_ascii=False)
    assert all(value not in serialized for value in (SENTINEL, "example.com", "本机研究者", str(path), "credential_ref", "demo-model"))
    # Read-only reopening simulates a fresh service instance without starting a second owner.
    service = SettingsService(app.state.settings.database, vault)
    assert {row.kind: row.model_dump() for row in service.connections()} == before
    assert service.profile().model_dump() == profile
    assert client.delete("/settings/profile").json()["display_name"] == ""


def test_credential_database_commit_failure_keeps_old_vault_entry(settings, monkeypatch):
    client, vault, path, app = settings
    save(client)
    client.put("/settings/connections/model/credential", json={"secret": SENTINEL})
    original = dict(vault.values)
    service = app.state.settings
    @contextmanager
    def fail_write():
        raise RuntimeError(SENTINEL)
        yield
    with monkeypatch.context() as patch:
        patch.setattr(service.database, "write", fail_write)
        response = client.put("/settings/connections/model/credential", json={"secret": "new-test-only"})
        assert response.status_code == 409 and SENTINEL not in response.text
    assert vault.values == original


def test_migrate_old_conversation_and_repeat(tmp_path):
    from alembic import command
    from alembic.config import Config
    from research_trail.store import Store
    from pathlib import Path
    path = tmp_path / "old.sqlite3"
    database = Database(path)
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with database.engine.connect() as connection:
        database.migration_transaction(connection, lambda: command.upgrade(cfg, "0003_lifecycle"), cfg)
    store = Store(database)
    session = store.create_session("保留旧会话")
    store.start_fixture(session.id, "旧运行")
    before = store.snapshot(session.id).model_dump()
    database.migrate(); database.migrate()
    assert store.snapshot(session.id).model_dump() == before
    with database.engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0015_calendar"
    database.close()


def test_native_windows_vault_roundtrip_and_cleanup(tmp_path):
    vault = WindowsCredentialVault()
    service = SettingsService(Database(tmp_path / "native.sqlite3"), vault)
    target = service.target(str(uuid4()))
    try:
        assert vault.get(target) is None
        vault.set(target, SENTINEL)
        assert WindowsCredentialVault().get(target) == SENTINEL  # Independent native instance.
        vault.set(target, "test-only-replacement")
        assert vault.get(target) == "test-only-replacement"
        vault.delete(target); vault.delete(target)
        assert vault.get(target) is None
    finally:
        vault.delete(target)
        service.database.close()
