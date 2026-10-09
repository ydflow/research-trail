"""PyInstaller entry points. The worker must not start a second HTTP server."""
import json
import sys


def main():
    if sys.argv[1:] == ['--provider-worker']:
        from research_trail.provider_worker import main as worker
        worker()
    elif sys.argv[1:] == ['--bundle-check']:
        from importlib.metadata import version
        from research_trail.runtime_paths import backend_resources, bundled_skills
        import longbridge.openapi  # Load the bundled native SDK without connecting.
        import sqlite3
        import ssl
        from zoneinfo import ZoneInfo
        from research_trail.evaluation import EvaluationService
        resources = backend_resources()
        assert (resources / 'alembic.ini').is_file()
        assert (resources / 'migrations/env.py').is_file()
        assert (resources / 'research_trail/evaluation.py').is_file()
        assert (bundled_skills() / 'LICENSE').is_file()
        print(json.dumps({'frozen': bool(getattr(sys, 'frozen', False)), 'python': sys.version.split()[0],
            'sqlite': sqlite3.sqlite_version, 'ssl': ssl.OPENSSL_VERSION, 'timezone': str(ZoneInfo('Asia/Shanghai')),
            'sdk': version('longbridge'), 'skill_files': len(list(bundled_skills().rglob('*.md')))}, ensure_ascii=False))
    elif not sys.argv[1:]:
        from research_trail.__main__ import main as server
        server()
    else:
        raise SystemExit('Unknown ResearchTrail backend entry point')


if __name__ == '__main__':
    main()
