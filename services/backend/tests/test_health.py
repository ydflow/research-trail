from fastapi.testclient import TestClient
import pytest

from research_trail.app import create_app

TOKEN = "test-only-token-" + "x" * 48


def test_health_requires_own_startup_token():
    with TestClient(create_app(TOKEN)) as client:
        assert client.get("/health").status_code == 401
        assert client.get("/health", headers={"X-ResearchTrail-Token": "other-instance"}).status_code == 401
        response = client.get("/health", headers={"X-ResearchTrail-Token": TOKEN})
        assert response.status_code == 200
        assert response.json()["service"] == "research-trail"
        assert response.json()["python_version"].startswith("3.12.")
        assert TOKEN not in response.text


def test_docs_and_missing_token_are_rejected():
    with pytest.raises(ValueError):
        create_app("")
    with TestClient(create_app(TOKEN)) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
