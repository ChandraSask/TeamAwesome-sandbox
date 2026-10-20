from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_greeting():
    assert client.get("/healthz").json() == {"status": "ok"}
    result = client.get("/api/hello", params={"name": "Team One"})
    assert result.status_code == 200
    assert "Team One" in result.json()["message"]

def test_invalid_name_and_unknown_api():
    assert client.get("/api/hello", params={"name": "x" * 81}).status_code == 422
    assert client.get("/api/missing").status_code == 404
