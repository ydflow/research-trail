"""Independent settings/health state. Step 8 probes are deterministic, never HTTP.

UI semantics reference Folio ConnectionsCenter/ModelsTab/ProfileSecurityView;
the persistence, credential lifecycle and probe state machine are Python originals.
"""
from datetime import datetime, timezone
from hashlib import sha256
import threading
from typing import Literal
from urllib.parse import urlsplit
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator
from sqlalchemy import select

from .credentials import CredentialUnavailable, WindowsCredentialVault
from .models import ConnectionRecord, ProfileRecord

ConnectionKind = Literal["model", "market", "account", "skills", "runtime"]
HealthStatus = Literal["unconfigured", "untested", "ready", "failed", "invalid", "disabled"]
KINDS = ("model", "market", "account", "skills", "runtime")
REASONS = {
    "UNCONFIGURED": "尚未保存配置。", "UNTESTED": "已保存，尚未进行假连接测试。",
    "CONFIG_CHANGED": "配置或凭证已变更，原测试已失效，请重新测试。",
    "DISABLED": "此连接已停用。", "CREDENTIAL_MISSING": "所需凭证缺失或已从系统存储移除。",
    "VAULT_UNAVAILABLE": "系统凭证存储不可用。", "DEMO_OK": "假连接测试成功；未验证真实服务。",
    "DEMO_FAILED": "假连接测试失败。", "DEMO_INVALID": "假连接模拟凭证或配置失效。",
}


def timestamp():
    return datetime.now(timezone.utc).isoformat()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ConnectionInput(StrictModel):
    enabled: bool = True
    endpoint: str = Field(default="", max_length=200)
    model: str = Field(default="", max_length=80, pattern=r"^[a-zA-Z0-9_.:/-]*$")
    requires_credential: bool = False
    fake_result: Literal["success", "failure", "invalid"] = "success"
    max_tool_rounds: int = Field(default=8, ge=1, le=32, strict=True)
    run_timeout_seconds: int = Field(default=120, ge=1, le=600, strict=True)
    request_timeout_seconds: int = Field(default=30, ge=1, le=120, strict=True)

    @field_validator("endpoint")
    @classmethod
    def safe_endpoint(cls, value):
        if not value:
            return value
        try:
            url = urlsplit(value)
            if (url.scheme not in ("http", "https") or not url.hostname or url.username is not None
                    or url.password is not None or url.query or url.fragment or any(c.isspace() for c in value)):
                raise ValueError()
            _ = url.port
        except ValueError:
            raise ValueError("地址必须是无用户名、密码、查询参数和片段的HTTP(S)地址。") from None
        return value


class CredentialInput(StrictModel):
    secret: SecretStr

    @field_validator("secret")
    @classmethod
    def bounded_secret(cls, value):
        raw = value.get_secret_value()
        if not raw.strip() or len(raw.encode("utf-8")) > 2560 or "\0" in raw:
            raise ValueError("凭证需要1至2560字节，不能含空字符。")
        return value


class ConnectionView(ConnectionInput):
    kind: ConnectionKind
    configured: bool
    credential_present: bool
    status: HealthStatus
    reason: str
    detail: str
    revision: int
    checked_at: str | None = None
    test_mode: Literal["fake"] = "fake"


class Profile(StrictModel):
    display_name: str = Field(default="", max_length=40)
    research_style: Literal["balanced", "cautious", "exploratory"] = "balanced"


class DiagnosticConnection(StrictModel):
    kind: ConnectionKind
    configured: bool
    credential_present: bool
    status: HealthStatus
    reason: str
    checked_at: str | None


class Diagnostics(StrictModel):
    schema_version: Literal[1] = 1
    scope: Literal["connection-probes"] = "connection-probes"
    generated_at: str
    test_mode: Literal["fake"] = "fake"
    real_requests_sent: Literal[False] = False
    credential_storage: Literal["windows-credential-manager"] = "windows-credential-manager"
    connections: list[DiagnosticConnection]


class SettingsError(Exception):
    def __init__(self, message="设置操作未完成，请检查本机存储后重试。"):
        super().__init__(message)


class SettingsService:
    def __init__(self, database, vault=None):
        self.database = database
        self.vault = vault if vault is not None else WindowsCredentialVault()
        self.namespace = sha256(str(database.path).casefold().encode("utf-8")).hexdigest()[:32]
        self.lock = threading.RLock()

    def target(self, reference):
        return f"ResearchTrail/{self.namespace}/{reference}"

    def _view(self, row, kind):
        if row is None:
            return ConnectionView(kind=kind, configured=False, credential_present=False, status="unconfigured",
                                  reason="UNCONFIGURED", detail=REASONS["UNCONFIGURED"], revision=0)
        present, vault_failed = False, False
        if row.credential_ref:
            try:
                present = bool(self.vault.get(self.target(row.credential_ref)))
            except Exception:
                vault_failed = True
        status, reason = row.status, row.reason
        if not row.enabled:
            status, reason = "disabled", "DISABLED"
        elif vault_failed:
            status, reason = "failed", "VAULT_UNAVAILABLE"
        elif (row.credential_ref or row.requires_credential) and not present:
            status, reason = "invalid", "CREDENTIAL_MISSING"
        return ConnectionView(kind=kind, configured=True, enabled=row.enabled, endpoint=row.endpoint, model=row.model,
                              requires_credential=row.requires_credential, fake_result=row.fake_result,
                              credential_present=present, status=status, reason=reason, detail=REASONS[reason],
                              revision=row.revision, checked_at=row.checked_at, max_tool_rounds=row.max_tool_rounds,
                              run_timeout_seconds=row.run_timeout_seconds, request_timeout_seconds=row.request_timeout_seconds)

    def connections(self):
        with self.lock, self.database.sessions() as db:
            rows = {row.kind: row for row in db.scalars(select(ConnectionRecord))}
            return [self._view(rows.get(kind), kind) for kind in KINDS]

    def save(self, kind, body):
        if kind in ("skills", "runtime") and body.requires_credential:
            raise SettingsError("技能和本机运行时配置不接受凭证。")
        with self.lock:
            with self.database.write() as db:
                row = db.get(ConnectionRecord, kind)
                if row is None:
                    row = ConnectionRecord(kind=kind, revision=1, status="untested", reason="UNTESTED")
                    db.add(row)
                else:
                    row.revision += 1
                    row.status, row.reason = "invalid", "CONFIG_CHANGED"
                for key, value in body.model_dump().items():
                    setattr(row, key, value)
                row.checked_at = None
            return self._get(kind)

    def _get(self, kind):
        return next(view for view in self.connections() if view.kind == kind)

    def model_limits(self):
        # No vault access, network or secret in the public/non-sensitive limits snapshot.
        with self.lock, self.database.sessions() as db:
            row = db.get(ConnectionRecord, "model")
            if row is None:
                return 8, 120
            return row.max_tool_rounds, row.run_timeout_seconds

    def model_configuration(self):
        # Internal-only immutable snapshot. Never returned by an API/diagnostic serializer.
        from .openai_provider import ModelConfiguration, ModelError
        with self.lock, self.database.sessions() as db:
            row = db.get(ConnectionRecord, "model")
            if row is None or not row.enabled:
                raise ModelError("MODEL_UNCONFIGURED", "请在本机保存并启用模型连接。")
            if not row.endpoint or not row.model:
                raise ModelError("MODEL_CONFIG_INVALID", "真实模型需要Base URL和模型ID。")
            from ipaddress import ip_address
            url = urlsplit(row.endpoint)
            try:
                loopback = ip_address(url.hostname).is_loopback
            except ValueError:
                loopback = url.hostname == "localhost"
            if url.scheme != "https" and not loopback:
                raise ModelError("MODEL_CONFIG_INVALID", "远程模型地址需要HTTPS；HTTP仅支持本机模型。")
            try:
                secret = self.vault.get(self.target(row.credential_ref)) if row.credential_ref else None
            except Exception:
                raise ModelError("MODEL_VAULT_UNAVAILABLE", "系统凭证存储不可用。") from None
            if not secret:
                raise ModelError("MODEL_CREDENTIAL_MISSING", "模型API Key未配置，请仅在本机设置页保存。")
            return ModelConfiguration(row.endpoint, row.model, secret, row.request_timeout_seconds)

    def credential(self, kind, body):
        if kind in ("skills", "runtime"):
            raise SettingsError("技能和本机运行时配置不接受凭证。")
        with self.lock:
            with self.database.sessions() as db:
                row = db.get(ConnectionRecord, kind)
                if row is None:
                    raise SettingsError("请先保存此连接的非敏感配置。")
                previous = row.credential_ref
            reference = str(uuid4())
            try:
                self.vault.set(self.target(reference), body.secret.get_secret_value())
            except Exception:
                raise CredentialUnavailable() from None
            try:
                with self.database.write() as db:
                    row = db.get(ConnectionRecord, kind)
                    row.credential_ref = reference
                    row.revision += 1
                    row.status, row.reason, row.checked_at = "invalid", "CONFIG_CHANGED", None
            except Exception:
                try:
                    self.vault.delete(self.target(reference))
                except Exception:
                    pass  # A failed cleanup leaves only a system-vault entry, never plaintext.
                raise SettingsError() from None
            if previous:
                try:
                    self.vault.delete(self.target(previous))
                except Exception:
                    raise SettingsError("新凭证已保存，旧系统凭证清理失败；请检查Windows凭证管理器。") from None
            return self._get(kind)

    def delete_credential(self, kind):
        with self.lock:
            with self.database.write() as db:
                row = db.get(ConnectionRecord, kind)
                if row is not None:
                    if row.credential_ref:
                        try:
                            self.vault.delete(self.target(row.credential_ref))
                        except Exception:
                            raise CredentialUnavailable() from None
                    row.credential_ref = None
                    row.revision += 1
                    row.status, row.reason, row.checked_at = "invalid", "CONFIG_CHANGED", None
            return self._get(kind)

    def delete(self, kind):
        with self.lock:
            self.delete_credential(kind)
            with self.database.write() as db:
                row = db.get(ConnectionRecord, kind)
                if row is not None:
                    db.delete(row)
            return self._get(kind)

    def test(self, kind):
        # Serialized with edits. There are no transports, URLs or SDK calls here.
        with self.lock:
            view = self._get(kind)
            if not view.configured or not view.enabled or view.reason in ("CREDENTIAL_MISSING", "VAULT_UNAVAILABLE"):
                return view
            status, reason = {"success": ("ready", "DEMO_OK"), "failure": ("failed", "DEMO_FAILED"),
                              "invalid": ("invalid", "DEMO_INVALID")}[view.fake_result]
            with self.database.write() as db:
                row = db.get(ConnectionRecord, kind)
                row.status, row.reason, row.checked_at = status, reason, timestamp()
            return self._get(kind)

    def profile(self):
        with self.lock, self.database.sessions() as db:
            row = db.get(ProfileRecord, 1)
            return Profile(display_name=row.display_name, research_style=row.research_style) if row else Profile()

    def save_profile(self, body):
        with self.lock, self.database.write() as db:
            row = db.get(ProfileRecord, 1)
            if row is None:
                row = ProfileRecord(id=1)
                db.add(row)
            row.display_name, row.research_style = body.display_name, body.research_style
        return body

    def delete_profile(self):
        with self.lock, self.database.write() as db:
            row = db.get(ProfileRecord, 1)
            if row is not None:
                db.delete(row)
        return Profile()

    def diagnostics(self):
        # Project by explicit whitelist; omit endpoint, model, profile, ref, path, env and exception text.
        return Diagnostics(generated_at=timestamp(), connections=[DiagnosticConnection(**view.model_dump(include={
            "kind", "configured", "credential_present", "status", "reason", "checked_at"})) for view in self.connections()])
