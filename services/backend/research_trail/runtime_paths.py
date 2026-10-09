"""Read-only bundle resources and writable per-user state are separate."""
import os
from pathlib import Path
import sys


def backend_resources() -> Path:
    return Path(sys._MEIPASS) if getattr(sys, 'frozen', False) else Path(__file__).resolve().parents[1]


def bundled_skills() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent.parent / 'skills'
    return Path(__file__).resolve().parents[3] / 'skills'


def database_path() -> Path:
    override = os.environ.get('RESEARCH_TRAIL_DB_PATH')
    if override:
        return Path(override).resolve()
    if getattr(sys, 'frozen', False):
        # A standalone diagnostic launch also never writes inside the install.
        return Path(os.environ['APPDATA']) / 'ResearchTrail' / 'data' / 'research-trail.sqlite3'
    return Path(__file__).resolve().parents[3] / 'runtime' / 'research-trail.sqlite3'
