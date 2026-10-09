"""Build reviewed sources only. No runtime database, secrets or logs are copied."""
from importlib import metadata
import ast
import json
from pathlib import Path
import shutil
import subprocess
import sys
from packaging.requirements import Requirement

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'services/backend'
BUILD = ROOT / 'build/windows'


def notices():
    runtime = set()
    def add(name):
        dist = metadata.distribution(name)
        key = dist.metadata['Name'].lower().replace('_', '-')
        if key in runtime: return
        runtime.add(key)
        for raw in dist.requires or []:
            req = Requirement(raw)
            if req.marker is None or req.marker.evaluate({'extra': ''}): add(req.name)
    for name in ('fastapi', 'uvicorn', 'sqlalchemy', 'alembic', 'httpx', 'longbridge', 'tzdata'): add(name)
    # Analysis can include optional modules (e.g. setuptools) beyond declared
    # requirements. Their notices must follow the actual frozen module graph.
    toc = BUILD / 'pyinstaller/backend/PYZ-00.toc'
    if toc.is_file():
        packages = metadata.packages_distributions()
        modules = {row[0].split('.')[0] for row in ast.literal_eval(toc.read_text(encoding='utf-8'))[1]}
        for module in modules:
            for name in packages.get(module, []): add(name)
    rows = []
    directory = BUILD / 'notices'
    directory.mkdir(parents=True, exist_ok=True)
    for name in sorted(runtime | {'pyinstaller', 'pyinstaller-hooks-contrib'}):
        dist = metadata.distribution(name)
        copied = []
        for file in dist.files or []:
            if '.dist-info/' in str(file).replace('\\', '/') and any(s in str(file).upper() for s in ('LICENSE', 'COPYING', 'NOTICE')):
                original = Path(dist.locate_file(file))
                if original.is_file():
                    # Preserve nested vendor licenses rather than overwriting
                    # several different texts named LICENSE inside one wheel.
                    parts = Path(str(file)).parts
                    if '..' in parts: raise RuntimeError('Unexpected license outside distribution')
                    dest = directory / name / Path(*parts)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(original, dest)
                    copied.append(dest.relative_to(directory).as_posix())
        rows.append({'name': dist.metadata['Name'], 'version': dist.version,
            'role': 'runtime' if name in runtime else 'packaging-tool',
            'license_expression': dist.metadata.get('License-Expression') or dist.metadata.get('License'),
            'license_classifiers': [c for c in dist.metadata.get_all('Classifier', []) if c.startswith('License ::')],
            'license_files': copied, 'project_urls': dist.metadata.get_all('Project-URL', [])})
    for candidate in (Path(sys.base_prefix) / 'LICENSE.txt', Path(sys.base_prefix) / 'LICENSE'):
        if candidate.is_file():
            shutil.copyfile(candidate, directory / 'Python-LICENSE.txt')
            break
    (directory / 'python-dependencies.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


def main():
    if sys.platform != 'win32' or sys.version_info[:2] != (3, 12):
        raise SystemExit('Windows x64 / Python 3.12 required')
    BUILD.mkdir(parents=True, exist_ok=True)
    notices()
    # These ten exact source files are also used by the existing experiment
    # implementation hash. The rest of the Python application is in PYZ.
    hash_files = ('evaluation.py', 'evaluation_contracts.py', 'evaluation_engine.py', 'evaluation_cases.py',
                  'evaluation_trace.py', 'agent.py', 'tools.py', 'market.py', 'model_provider.py', 'store.py')
    datas = [(str(BACKEND/'alembic.ini'), '.')]
    datas += [(str(p), p.parent.relative_to(BACKEND).as_posix()) for p in (BACKEND/'migrations').rglob('*.py')]
    datas += [(str(BACKEND/'research_trail'/name), 'research_trail') for name in hash_files]
    spec = f'''from PyInstaller.utils.hooks import collect_all, collect_submodules, copy_metadata
datas, binaries, hidden = collect_all('longbridge')
datas += {datas!r}
for name in ('fastapi','uvicorn','sqlalchemy','alembic','httpx','longbridge','tzdata'):
    datas += copy_metadata(name, recursive=True)
hidden += collect_submodules('research_trail') + collect_submodules('uvicorn') + ['sqlalchemy.dialects.sqlite']
a = Analysis([{str(BACKEND/'frozen_entry.py')!r}], pathex=[{str(BACKEND)!r}], binaries=binaries,
    datas=datas, hiddenimports=hidden, excludes=['pytest','tkinter','unittest'])
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [('u',None,'OPTION'),('X utf8',None,'OPTION')], exclude_binaries=True,
    name='research-trail-backend', console=True, upx=False)
coll = COLLECT(exe, a.binaries, a.datas, name='backend', upx=False)
'''
    target = BUILD / 'backend.spec'
    target.write_text(spec, encoding='utf-8')
    subprocess.run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--distpath', str(BUILD/'python'),
                    '--workpath', str(BUILD/'pyinstaller'), str(target)], cwd=BACKEND, check=True)
    notices()


if __name__ == '__main__': main()
