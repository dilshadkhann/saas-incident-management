from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.dependencies.database import get_db
from app.main import app

client = TestClient(app)


def test_liveness_returns_200():
    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_returns_200(monkeypatch):
    class FakeDatabase:
        def execute(self, statement):
            return None

    def override_get_db():
        yield FakeDatabase()

    monkeypatch.setitem(
        app.dependency_overrides,
        get_db,
        override_get_db,
    )

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_returns_503_when_database_unavailable(monkeypatch):
    class FakeDatabase:
        def execute(self, statement):
            raise OperationalError(
                "SELECT 1",
                {},
                Exception("Database connection failed"),
            )

    def override_get_db():
        yield FakeDatabase()

    monkeypatch.setitem(
        app.dependency_overrides,
        get_db,
        override_get_db,
    )

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Service unavailable"}
