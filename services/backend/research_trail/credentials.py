"""Python-owned Windows Credential Manager; no plaintext fallback or enumeration.

Win32 ABI: https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw
Only application-generated targets may be accessed. Tests inject a separate vault.
"""
import ctypes
from ctypes import wintypes
import re
import sys
from typing import Protocol


class CredentialUnavailable(Exception):
    """Public message deliberately excludes native errors, targets and secrets."""

    def __init__(self):
        super().__init__("系统凭证存储不可用；未回退到明文存储。")


class CredentialVault(Protocol):
    def get(self, target: str) -> str | None: ...
    def set(self, target: str, secret: str) -> None: ...
    def delete(self, target: str) -> None: ...


class WindowsCredentialVault:
    def __init__(self):
        self._api = None

    def _load(self):
        if sys.platform != "win32":
            raise CredentialUnavailable()
        if self._api is None:
            class Credential(ctypes.Structure):
                _fields_ = [("Flags", wintypes.DWORD), ("Type", wintypes.DWORD),
                            ("TargetName", wintypes.LPWSTR), ("Comment", wintypes.LPWSTR),
                            ("LastWritten", wintypes.FILETIME), ("CredentialBlobSize", wintypes.DWORD),
                            ("CredentialBlob", ctypes.POINTER(wintypes.BYTE)), ("Persist", wintypes.DWORD),
                            ("AttributeCount", wintypes.DWORD), ("Attributes", ctypes.c_void_p),
                            ("TargetAlias", wintypes.LPWSTR), ("UserName", wintypes.LPWSTR)]
            api = ctypes.WinDLL("advapi32", use_last_error=True)
            pointer = ctypes.POINTER(Credential)
            api.CredWriteW.argtypes = [pointer, wintypes.DWORD]
            api.CredWriteW.restype = wintypes.BOOL
            api.CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(pointer)]
            api.CredReadW.restype = wintypes.BOOL
            api.CredDeleteW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
            api.CredDeleteW.restype = wintypes.BOOL
            api.CredFree.argtypes = [ctypes.c_void_p]
            api.CredFree.restype = None
            self._api, self._credential = api, Credential
        return self._api

    @staticmethod
    def _target(target):
        if re.fullmatch(r"ResearchTrail/[0-9a-f]{32}/[0-9a-f-]{36}", target) is None:
            raise CredentialUnavailable()

    def get(self, target):
        self._target(target)
        try:
            api = self._load()
            record = ctypes.POINTER(self._credential)()
            if not api.CredReadW(target, 1, 0, ctypes.byref(record)):
                if ctypes.get_last_error() == 1168:  # ERROR_NOT_FOUND
                    return None
                raise CredentialUnavailable()
            try:
                return ctypes.string_at(record.contents.CredentialBlob, record.contents.CredentialBlobSize).decode("utf-8")
            finally:
                api.CredFree(record)
        except Exception:
            raise CredentialUnavailable() from None

    def set(self, target, secret):
        self._target(target)
        try:
            raw = secret.encode("utf-8")
            if not raw or len(raw) > 2560:
                raise CredentialUnavailable()
            api = self._load()
            blob = (wintypes.BYTE * len(raw)).from_buffer_copy(raw)
            record = self._credential(Type=1, TargetName=target, CredentialBlobSize=len(raw),
                                      CredentialBlob=blob, Persist=2, UserName="ResearchTrail")
            try:
                if not api.CredWriteW(ctypes.byref(record), 0):
                    raise CredentialUnavailable()
            finally:
                ctypes.memset(blob, 0, len(raw))
        except Exception:
            raise CredentialUnavailable() from None

    def delete(self, target):
        self._target(target)
        try:
            api = self._load()
            if not api.CredDeleteW(target, 1, 0) and ctypes.get_last_error() != 1168:
                raise CredentialUnavailable()
        except Exception:
            raise CredentialUnavailable() from None
