"""Separate data-provider profiles; native secret bundles never enter SQLite."""
from dataclasses import dataclass, field
import json
from uuid import uuid4
from sqlalchemy import select
from .models import DataProviderRecord
from .provider_contracts import ProviderConfiguration, ProviderCredentials, ProviderProfile
from .settings import SettingsError

IDS = ('longbridge', 'longbridge-account', 'massive')

@dataclass(frozen=True)
class ProviderSnapshot:
    provider: str
    configuration: ProviderConfiguration
    revision: int
    credentials: dict = field(repr=False)

class ProviderSettings:
    def __init__(self, settings):
        self.settings = settings
        self.lock = settings.lock
        self.database = settings.database
        self.vault = settings.vault

    def _profile(self, row, provider):
        if row is None:
            return ProviderProfile(provider=provider, configured=False, credential_present=False, revision=0)
        try:
            present = bool(row.credential_ref and self.vault.get(self.settings.target(row.credential_ref)))
        except Exception:
            present = False
        return ProviderProfile(provider=provider, configured=True, credential_present=present,
                               revision=row.revision, **row.configuration)

    def profiles(self):
        with self.lock, self.database.sessions() as db:
            rows = {r.provider: r for r in db.scalars(select(DataProviderRecord))}
            return [self._profile(rows.get(p), p) for p in IDS]

    def profile(self, provider):
        return next(p for p in self.profiles() if p.provider == provider)

    def save(self, provider, body):
        with self.lock, self.database.write() as db:
            row = db.get(DataProviderRecord, provider)
            if row is None:
                row = DataProviderRecord(provider=provider, revision=1, credential_ref=None)
                db.add(row)
            else:
                row.revision += 1
            row.configuration = body.model_dump()
        return self.profile(provider)

    def credentials(self, provider, body):
        values = {k: v.get_secret_value() for k, v in body if v is not None}
        if (provider == 'massive') != ('api_key' in values):
            raise SettingsError('凭证类型与提供商不匹配。')
        new = str(uuid4()); old = None
        with self.lock:
            try:
                with self.database.write() as db:
                    row = db.get(DataProviderRecord, provider)
                    if row is None:
                        raise SettingsError('先保存非敏感Provider配置。')
                    old = row.credential_ref
                    self.vault.set(self.settings.target(new), json.dumps(values, ensure_ascii=False))
                    row.credential_ref = new; row.revision += 1
            except Exception:
                try: self.vault.delete(self.settings.target(new))
                except Exception: pass
                raise SettingsError('系统凭证保存失败；未保存到明文文件。') from None
            if old:
                try: self.vault.delete(self.settings.target(old))
                except Exception: pass  # Same extreme-crash/orphan limitation as step 8.
        return self.profile(provider)

    def delete_credentials(self, provider):
        with self.lock, self.database.write() as db:
            row = db.get(DataProviderRecord, provider)
            if row and row.credential_ref:
                try: self.vault.delete(self.settings.target(row.credential_ref))
                except Exception: raise SettingsError('系统凭证删除失败。') from None
                row.credential_ref = None; row.revision += 1
        return self.profile(provider)

    def delete(self, provider):
        with self.lock:
            self.delete_credentials(provider)
            with self.database.write() as db:
                row = db.get(DataProviderRecord, provider)
                if row: db.delete(row)
        return self.profile(provider)

    def snapshot(self, provider):
        from .provider_errors import ProviderFault
        with self.lock, self.database.sessions() as db:
            row = db.get(DataProviderRecord, provider)
            if row is None: raise ProviderFault('PROVIDER_UNCONFIGURED', 'unconfigured')
            config = ProviderConfiguration.model_validate(row.configuration)
            if not config.enabled: raise ProviderFault('PROVIDER_DISABLED', 'disabled')
            try:
                secret = self.vault.get(self.settings.target(row.credential_ref)) if row.credential_ref else None
            except Exception: raise ProviderFault('VAULT_UNAVAILABLE') from None
            values = {}
            if secret:
                try:
                    bundle = ProviderCredentials.model_validate_json(secret)
                    values = {k: v.get_secret_value() for k, v in bundle if v is not None}
                except Exception: raise ProviderFault('CREDENTIAL_INVALID', 'unconfigured') from None
            return ProviderSnapshot(provider, config, row.revision, values)
