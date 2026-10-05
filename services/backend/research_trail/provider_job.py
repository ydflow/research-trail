"""Windows owned process tree dies when the backend's last job handle closes.

ABI: https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
Only the freshly spawned process is assigned; no process-name enumeration.
"""
import ctypes
from ctypes import wintypes
import os
from .provider_errors import ProviderFault


class OwnedJob:
    def __init__(self,process):
        self.handle=None
        if os.name!='nt': return
        size=ctypes.c_size_t
        class Basic(ctypes.Structure):
            _fields_=[('ProcessTime',ctypes.c_int64),('JobTime',ctypes.c_int64),('LimitFlags',wintypes.DWORD),
                ('MinimumWorkingSetSize',size),('MaximumWorkingSetSize',size),('ActiveProcessLimit',wintypes.DWORD),
                ('Affinity',size),('PriorityClass',wintypes.DWORD),('SchedulingClass',wintypes.DWORD)]
        class IO(ctypes.Structure):
            _fields_=[(n,ctypes.c_uint64) for n in ('ReadOps','WriteOps','OtherOps','ReadBytes','WriteBytes','OtherBytes')]
        class Extended(ctypes.Structure):
            _fields_=[('Basic',Basic),('IO',IO),('ProcessMemoryLimit',size),('JobMemoryLimit',size),
                      ('PeakProcessMemoryUsed',size),('PeakJobMemoryUsed',size)]
        self.api=ctypes.WinDLL('kernel32',use_last_error=True)
        self.api.CreateJobObjectW.argtypes=[ctypes.c_void_p,wintypes.LPCWSTR]; self.api.CreateJobObjectW.restype=wintypes.HANDLE
        self.api.SetInformationJobObject.argtypes=[wintypes.HANDLE,ctypes.c_int,ctypes.c_void_p,wintypes.DWORD]
        self.api.SetInformationJobObject.restype=wintypes.BOOL
        self.api.AssignProcessToJobObject.argtypes=[wintypes.HANDLE,wintypes.HANDLE]; self.api.AssignProcessToJobObject.restype=wintypes.BOOL
        self.api.CloseHandle.argtypes=[wintypes.HANDLE]; self.api.CloseHandle.restype=wintypes.BOOL
        self.handle=self.api.CreateJobObjectW(None,None)
        limits=Extended(); limits.Basic.LimitFlags=0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not self.handle or not self.api.SetInformationJobObject(self.handle,9,ctypes.byref(limits),ctypes.sizeof(limits)) or not self.api.AssignProcessToJobObject(self.handle,int(process._handle)):
            self.close()
            raise ProviderFault('PROVIDER_ERROR')

    def close(self):
        if self.handle:
            self.api.CloseHandle(self.handle); self.handle=None
