"""Owned bounded processes; keys on stdin only, never command lines or inherited environment."""
import json
import os
import subprocess
import sys
import threading
import time
from .provider_errors import ProviderFault
from .provider_job import OwnedJob

MAX_RESPONSE = 256*1024

def safe_environment():
    keys = ('SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATH')
    env = {k:v for k,v in os.environ.items() if k.upper() in keys}
    env.update(PYTHONUTF8='1', PYTHONUNBUFFERED='1')
    # Preserve the project's offline guard in tests, never any model/provider credential.
    for key in ('RESEARCH_TRAIL_OFFLINE','PYTHONPATH'):
        if os.environ.get('RESEARCH_TRAIL_OFFLINE')=='1' and key in os.environ: env[key]=os.environ[key]
    return env

def run_process(argv, *, payload=None, timeout=15, stop=None, env=None):
    stop = stop or threading.Event()
    if stop.is_set(): raise ProviderFault('CANCELLED','cancelled')
    try:
        process = subprocess.Popen(argv, stdin=subprocess.PIPE if payload is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, env=env or safe_environment(),
            creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    except OSError: raise ProviderFault('CLI_UNAVAILABLE' if argv[0]!=sys.executable else 'SDK_UNAVAILABLE') from None
    try: job=OwnedJob(process)
    except Exception:
        if process.poll() is None: process.kill()
        process.wait(timeout=3)
        process.stdout.close()
        if process.stdin: process.stdin.close()
        raise ProviderFault('PROVIDER_ERROR') from None
    output=bytearray(); overflow=threading.Event()
    def read():
        try:
            while chunk:=process.stdout.read(4096):
                if len(output)+len(chunk)>MAX_RESPONSE:
                    overflow.set(); return
                output.extend(chunk)
        except OSError: pass
    reader=threading.Thread(target=read,daemon=True); reader.start()
    try:
        if payload is not None:
            raw=json.dumps(payload,ensure_ascii=False).encode()
            if len(raw)>16384: raise ProviderFault('RESPONSE_LIMIT')
            process.stdin.write(raw); process.stdin.close()
        deadline=time.monotonic()+timeout
        while process.poll() is None:
            if stop.is_set(): raise ProviderFault('CANCELLED','cancelled')
            if overflow.is_set(): raise ProviderFault('RESPONSE_LIMIT')
            if time.monotonic()>=deadline: raise ProviderFault('TIMEOUT','timed_out',True)
            stop.wait(0.025)
        reader.join(1)
        if overflow.is_set(): raise ProviderFault('RESPONSE_LIMIT')
        if process.returncode: raise ProviderFault('PROVIDER_ERROR')
        try:
            return json.loads(output,parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        except Exception: raise ProviderFault('INVALID_RESPONSE') from None
    except (BrokenPipeError,OSError): raise ProviderFault('PROVIDER_ERROR') from None
    finally:
        job.close()
        if process.poll() is None: process.kill()
        process.wait(timeout=3)
        reader.join(1)
        process.stdout.close()
        if process.stdin and not process.stdin.closed: process.stdin.close()

def sdk_process(snapshot,query,stop=None):
    result=run_process([sys.executable,'-m','research_trail.provider_worker'],timeout=snapshot.configuration.timeout_seconds,
        stop=stop,payload={'provider':snapshot.provider,'configuration':snapshot.configuration.model_dump(),
                          'credentials':snapshot.credentials,'query':query.model_dump(mode='json')})
    if not isinstance(result,dict) or not isinstance(result.get('ok'),bool): raise ProviderFault('INVALID_RESPONSE')
    if not result['ok']:
        from .provider_errors import MESSAGES
        if result.get('code') not in MESSAGES: raise ProviderFault('INVALID_RESPONSE')
        raise ProviderFault(result['code'], result.get('state','failed'), bool(result.get('retryable')))
    return result['data']
