from pathlib import Path
import sys
from research_trail.runtime_paths import backend_resources, bundled_skills, database_path
from research_trail.provider_process import worker_command


def test_frozen_worker_does_not_reenter_server(monkeypatch):
    monkeypatch.setattr(sys, 'frozen', True, raising=False)
    monkeypatch.setattr(sys, 'executable', 'C:/app/resources/backend/research-trail-backend.exe')
    assert worker_command() == [sys.executable, '--provider-worker']


def test_installed_resources_and_writable_data_are_separate(monkeypatch, tmp_path):
    resources = tmp_path / 'install/resources/backend/_internal'
    executable = tmp_path / 'install/resources/backend/research-trail-backend.exe'
    monkeypatch.setattr(sys, 'frozen', True, raising=False)
    monkeypatch.setattr(sys, '_MEIPASS', str(resources), raising=False)
    monkeypatch.setattr(sys, 'executable', str(executable))
    monkeypatch.setenv('APPDATA', str(tmp_path / 'user'))
    monkeypatch.delenv('RESEARCH_TRAIL_DB_PATH', raising=False)
    assert backend_resources() == resources
    assert bundled_skills() == executable.parent.parent / 'skills'
    assert database_path() == tmp_path / 'user/ResearchTrail/data/research-trail.sqlite3'
    assert not database_path().is_relative_to(executable.parent)
    monkeypatch.setenv('RESEARCH_TRAIL_DB_PATH', str(tmp_path/'qa/data.sqlite3'))
    assert database_path() == tmp_path/'qa/data.sqlite3'
