"""Collect exact Rust crate licenses observed in the official Windows wheel build.

Explicit preparation only; never part of offline CI. Crate archives stay ignored.
No arbitrary archive extraction or source files are added to the application.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import base64
import tarfile
import tomllib
import httpx

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'build/windows/native-audit'
DEST=ROOT/'docs/third-party/longbridge/native'
COMMIT='b2f749a3c68cc4f05642b37fc790fb711d2dfb13'
JOB='https://github.com/longbridge/openapi/actions/runs/36694316549/job/109855292957'

def collect(entry):
    name,version=entry;url=f'https://static.crates.io/crates/{name}/{name}-{version}.crate'
    cache=CACHE/f'{name}-{version}.crate'
    if cache.exists():blob=cache.read_bytes()
    else:
        with httpx.Client(timeout=40,follow_redirects=False,headers={'User-Agent':'ResearchTrail license audit'}) as client:
            response=client.get(url);response.raise_for_status();blob=response.content
        if len(blob)>20*1024*1024:raise ValueError('crate archive limit')
        cache.write_bytes(blob)
    copied=[]
    with tarfile.open(fileobj=BytesIO(blob),mode='r:gz') as archive:
        prefix=f'{name}-{version}/'
        cargo=tomllib.loads(archive.extractfile(prefix+'Cargo.toml').read().decode())['package']
        if cargo['name']!=name or cargo['version']!=version:raise ValueError('crate identity mismatch')
        for member in archive.getmembers():
            if not member.isfile() or not member.name.startswith(prefix):continue
            relative=PurePosixPath(member.name[len(prefix):])
            if relative.is_absolute() or '..' in relative.parts:raise ValueError('unsafe license path')
            if not re.search(r'(^|/)(LICENSE[^/]*|COPYING[^/]*|COPYRIGHT[^/]*|NOTICE[^/]*)$',str(relative),re.I):continue
            if member.size>2*1024*1024:raise ValueError('license text limit')
            text=archive.extractfile(member).read();text.decode('utf-8')
            target=DEST/f'{name}-{version}'/Path(*relative.parts)
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(text)
            copied.append({'path':target.relative_to(ROOT/'docs/third-party/longbridge').as_posix(),'sha256':sha256(text).hexdigest()})
        source_license_ref=None
        if not copied and cargo.get('repository','').startswith('https://github.com/'):
            vcs=json.load(archive.extractfile(prefix+'.cargo_vcs_info.json'))
            source_license_ref=vcs['git']['sha1']
            if not re.fullmatch('[0-9a-f]{40}',source_license_ref):raise ValueError('unsafe source revision')
            repository=cargo['repository'].removeprefix('https://github.com/').removesuffix('.git').strip('/')
            if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repository):raise ValueError('unsafe repository')
            def api(path):
                result=subprocess.run(['gh','api',path],capture_output=True,text=True,check=True)
                return json.loads(result.stdout)
            tree=api(f'repos/{repository}/git/trees/{source_license_ref}?recursive=1')
            for item in tree['tree']:
                path=item['path']
                if item['type']!='blob' or not re.fullmatch(r'(LICENSE[^/]*|COPYING[^/]*|COPYRIGHT[^/]*|NOTICE[^/]*)',path,re.I):continue
                body=api(f'repos/{repository}/contents/{path}?ref={source_license_ref}')
                text=base64.b64decode(body['content']);text.decode('utf-8')
                target=DEST/f'{name}-{version}'/'upstream'/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(text)
                copied.append({'path':target.relative_to(ROOT/'docs/third-party/longbridge').as_posix(),'sha256':sha256(text).hexdigest(),
                    'source_url':f'https://github.com/{repository}/blob/{source_license_ref}/{path}'})
        if not copied and cargo.get('license')=='MIT OR Apache-2.0':
            # The versioned published SPDX grant exists, but these two crates
            # have no standalone license text even at their recorded Git SHA.
            # Elect Apache-2.0 and supply the standard terms, without inventing
            # an upstream copyright file or claiming it came in the archive.
            text=(DEST.parent/'LICENSE-APACHE').read_bytes()
            target=DEST/f'{name}-{version}'/'DECLARED-APACHE-2.0.txt'
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(text)
            copied.append({'path':target.relative_to(DEST.parent).as_posix(),'sha256':sha256(text).hexdigest(),
                'basis':'Published Cargo.toml MIT OR Apache-2.0 grant; Apache-2.0 elected; supplied standard terms, not an original crate license file.'})
    return {'name':name,'version':version,'license':cargo.get('license'),'license_file':cargo.get('license-file'),
        'repository':cargo.get('repository'),'artifact_url':url,'artifact_sha256':sha256(blob).hexdigest(),
        'source_license_ref':source_license_ref,'license_files':copied,
        'source_offer':{'license':'MPL-2.0','url':url,'modified':False} if cargo.get('license')=='MPL-2.0' else None}

def main():
    log=CACHE/'upstream-windows-cp312.log'
    content=log.read_text(encoding='utf-8')
    if 'build-python-sdk (3.12, windows-latest)' not in content:raise ValueError('wrong build job log')
    content=re.sub(r'\^\[\[[0-9;]*m','',content)
    entries=sorted(set(re.findall(r'Compiling\s+([A-Za-z0-9_-]+) v([0-9][0-9A-Za-z.+-]*)',content)))
    if len(entries)<100:raise ValueError('incomplete compilation log')
    local=[e for e in entries if e[0].startswith('longbridge')]
    external=[e for e in entries if not e[0].startswith('longbridge')]
    rows=[];errors=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(collect,e):e for e in external}
        for future in as_completed(futures):
            name,version=futures[future]
            try:rows.append(future.result())
            except Exception as error:errors.append({'name':name,'version':version,'error_type':type(error).__name__})
    rows.sort(key=lambda r:(r['name'],r['version']))
    missing=[{'name':r['name'],'version':r['version'],'license':r['license']} for r in rows if not r['license_files'] or not r['license']]
    manifest={'source_commit':COMMIT,'official_build_job':JOB,'build_log_sha256':sha256(log.read_bytes()).hexdigest(),
        'scope':'All crates compiled by the official CPython 3.12 Windows x64 job, including build-only dependencies; conservative superset, not a claim each crate is linked into the wheel.',
        'local_crates':local,'crates':rows,'errors':errors,'missing':missing}
    DEST.mkdir(parents=True,exist_ok=True)
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'collected':len(rows),'local':len(local),'errors':errors,'missing':missing},ensure_ascii=False),flush=True)
    if errors or missing:raise SystemExit('Native notice collection incomplete; do not mark distribution audit passed.')

if __name__=='__main__':main()
