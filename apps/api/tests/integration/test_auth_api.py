from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.main import app


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client: TestClient) -> dict[str, str]:
    email = f"user-{uuid4().hex[:12]}@example.com"
    password = "SecureTestPassword123!"

    response = client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 201

    return {"email": email, "password": password}


def test_registers_user_without_exposing_password(client: TestClient):
    email = f"user-{uuid4().hex[:12]}@example.com"

    response = client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "email": email,
            "password": "SecureTestPassword123!",
        },
    )

    assert response.status_code == 201
    assert response.json()["email"] == email
    assert response.json()["name"] == "Test User"
    assert "password" not in response.json()
    assert "password_hash" not in response.json()


def test_rejects_duplicate_registration(
    client: TestClient,
    registered_user: dict[str, str],
):
    response = client.post(
        "/auth/register",
        json={
            "name": "Duplicate User",
            "email": registered_user["email"],
            "password": registered_user["password"],
        },
    )

    assert response.status_code == 409


def test_login_sets_session_and_csrf_cookies(
    client: TestClient,
    registered_user: dict[str, str],
):
    response = client.post("/auth/login", json=registered_user)

    settings = get_settings()

    assert response.status_code == 200
    assert response.json()["email"] == registered_user["email"]

    assert settings.session_cookie_name in client.cookies
    assert settings.csrf_cookie_name in client.cookies

    cookies = response.headers.get_list("set-cookie")
    session_cookie = next(
        cookie for cookie in cookies if cookie.startswith(f"{settings.session_cookie_name}=")
    )
    csrf_cookie = next(
        cookie for cookie in cookies if cookie.startswith(f"{settings.csrf_cookie_name}=")
    )

    assert "httponly" in session_cookie.lower()
    assert "httponly" not in csrf_cookie.lower()


def test_rejects_invalid_login(
    client: TestClient,
    registered_user: dict[str, str],
):
    response = client.post(
        "/auth/login",
        json={
            "email": registered_user["email"],
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_current_user_requires_authentication(client: TestClient):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_authenticated_user_can_access_profile(
    client: TestClient,
    registered_user: dict[str, str],
):
    login_response = client.post("/auth/login", json=registered_user)
    assert login_response.status_code == 200

    response = client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == registered_user["email"]


def test_logout_rejects_missing_csrf_token(
    client: TestClient,
    registered_user: dict[str, str],
):
    login_response = client.post("/auth/login", json=registered_user)
    assert login_response.status_code == 200

    response = client.post("/auth/logout")

    assert response.status_code == 403

    profile_response = client.get("/auth/me")
    assert profile_response.status_code == 200


def test_logout_rejects_mismatched_csrf_token(
    client: TestClient,
    registered_user: dict[str, str],
):
    login_response = client.post("/auth/login", json=registered_user)
    assert login_response.status_code == 200

    response = client.post(
        "/auth/logout",
        headers={"X-CSRF-Token": "incorrect-csrf-token"},
    )

    assert response.status_code == 403

    profile_response = client.get("/auth/me")
    assert profile_response.status_code == 200


def test_logout_revokes_session(
    client: TestClient,
    registered_user: dict[str, str],
):
    login_response = client.post("/auth/login", json=registered_user)
    assert login_response.status_code == 200

    settings = get_settings()
    csrf_token = client.cookies.get(settings.csrf_cookie_name)

    assert csrf_token is not None

    logout_response = client.post(
        "/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )

    assert logout_response.status_code == 204

    profile_response = client.get("/auth/me")

    assert profile_response.status_code == 401


def test_login_rate_limit_blocks_after_five_failed_attempts(
    client: TestClient,
    registered_user: dict[str, str],
):
    invalid_credentials = {
        "email": registered_user["email"],
        "password": "WrongPassword123!",
    }

    for _ in range(5):
        response = client.post("/auth/login", json=invalid_credentials)
        assert response.status_code == 401

    blocked_response = client.post(
        "/auth/login",
        json=registered_user,
    )

    assert blocked_response.status_code == 429
    assert int(blocked_response.headers["Retry-After"]) > 0


def test_successful_login_clears_failed_attempts(
    client: TestClient,
    registered_user: dict[str, str],
):
    invalid_credentials = {
        "email": registered_user["email"],
        "password": "WrongPassword123!",
    }

    for _ in range(2):
        response = client.post("/auth/login", json=invalid_credentials)
        assert response.status_code == 401

    successful_response = client.post(
        "/auth/login",
        json=registered_user,
    )
    assert successful_response.status_code == 200

    for _ in range(5):
        response = client.post("/auth/login", json=invalid_credentials)
        assert response.status_code == 401

    blocked_response = client.post(
        "/auth/login",
        json=invalid_credentials,
    )

    assert blocked_response.status_code == 429
    assert int(blocked_response.headers["Retry-After"]) > 0


def test_login_accepts_configured_origin_and_sets_cookie_attributes(
    client: TestClient,
    registered_user: dict[str, str],
):
    settings = get_settings()
    response = client.post(
        "/auth/login",
        json=registered_user,
        headers={"Origin": settings.cors_origins[0]},
    )

    assert response.status_code == 200

    cookies = response.headers.get_list("set-cookie")
    session_cookie = next(
        cookie for cookie in cookies if cookie.startswith(f"{settings.session_cookie_name}=")
    )
    csrf_cookie = next(
        cookie for cookie in cookies if cookie.startswith(f"{settings.csrf_cookie_name}=")
    )

    for cookie in (session_cookie, csrf_cookie):
        assert "path=/" in cookie.lower()
        assert f"max-age={settings.session_ttl_hours * 3600}" in cookie.lower()
        assert f"samesite={settings.session_cookie_samesite}" in cookie.lower()
        assert ("secure" in cookie.lower()) == settings.session_cookie_secure

    assert "httponly" in session_cookie.lower()
    assert "httponly" not in csrf_cookie.lower()


def test_login_rejects_untrusted_origin(
    client: TestClient,
    registered_user: dict[str, str],
):
    response = client.post(
        "/auth/login",
        json=registered_user,
        headers={"Origin": "https://untrusted.example"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Request origin is not allowed"


def test_login_rejects_untrusted_referer_when_origin_is_missing(
    client: TestClient,
    registered_user: dict[str, str],
):
    response = client.post(
        "/auth/login",
        json=registered_user,
        headers={"Referer": "https://untrusted.example/login"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Request origin is not allowed"
