import pytest


@pytest.fixture(autouse=True)
def isolated_database(tmp_path, monkeypatch):
    monkeypatch.setenv("RESEARCH_TRAIL_DB_PATH", str(tmp_path / "test.sqlite3"))
