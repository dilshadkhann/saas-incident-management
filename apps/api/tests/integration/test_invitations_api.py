from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.core.security import hash_token
from app.main import app
from app.models import AuditLog, Invitation, Membership

PASSWORD = "SecureTestPassword123!"


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_user(client: TestClient) -> dict[str, str]:
    email = f"admin-{uuid4().hex[:12]}@example.com"

    registration = client.post(
        "/auth/register",
        json={
            "name": "Invitation Admin",
            "email": email,
            "password": PASSWORD,
        },
    )
    assert registration.status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert login.status_code == 200

    csrf_token = client.cookies.get(get_settings().csrf_cookie_name)
    assert csrf_token

    return {
        "id": registration.json()["id"],
        "email": email,
        "csrf_token": csrf_token,
    }


def csrf_headers(user: dict[str, str]) -> dict[str, str]:
    return {"X-CSRF-Token": user["csrf_token"]}


def create_organization(
    client: TestClient,
    user: dict[str, str],
) -> str:
    response = client.post(
        "/organizations",
        json={"name": "Invitation Test Organization"},
        headers=csrf_headers(user),
    )
    assert response.status_code == 201
    return response.json()["id"]


def register_user(client: TestClient, email: str) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Invited User",
            "email": email,
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201


def login_user(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200

    csrf_token = client.cookies.get(get_settings().csrf_cookie_name)
    assert csrf_token

    return {"csrf_token": csrf_token}


def create_invitation(
    client: TestClient,
    user: dict[str, str],
    organization_id: str,
    email: str,
) -> dict:
    response = client.post(
        f"/organizations/{organization_id}/invitations",
        json={"email": email, "role": "responder"},
        headers=csrf_headers(user),
    )
    assert response.status_code == 201
    return response.json()


def test_admin_can_create_invitation_and_only_hash_is_stored(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    invited_email = f"invite-{uuid4().hex[:12]}@example.com"

    response_data = create_invitation(
        client,
        authenticated_user,
        organization_id,
        invited_email,
    )

    raw_token = response_data["token"]
    invitation = db_session.get(Invitation, response_data["id"])

    assert invitation is not None
    assert invitation.email == invited_email
    assert invitation.role == "responder"
    assert invitation.token_hash == hash_token(raw_token)
    assert invitation.token_hash != raw_token

    audit_log = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "invitation.created",
        )
    )
    assert audit_log is not None
    assert "token" not in (audit_log.details or {})


def test_admin_can_list_invitations_without_exposing_tokens(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id = create_organization(client, authenticated_user)

    create_invitation(
        client,
        authenticated_user,
        organization_id,
        f"list-{uuid4().hex[:12]}@example.com",
    )

    response = client.get(
        f"/organizations/{organization_id}/invitations",
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert "token" not in response.json()[0]
    assert "token_hash" not in response.json()[0]


def test_non_admin_cannot_create_or_list_invitations(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert membership is not None

    membership.role = "responder"
    db_session.flush()

    create_response = client.post(
        f"/organizations/{organization_id}/invitations",
        json={
            "email": f"blocked-{uuid4().hex[:12]}@example.com",
            "role": "viewer",
        },
        headers=csrf_headers(authenticated_user),
    )
    list_response = client.get(
        f"/organizations/{organization_id}/invitations",
    )

    assert create_response.status_code == 403
    assert list_response.status_code == 403


def test_matching_user_can_accept_invitation_once(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    invited_email = f"accept-{uuid4().hex[:12]}@example.com"

    register_user(client, invited_email)

    invitation = create_invitation(
        client,
        authenticated_user,
        organization_id,
        invited_email,
    )

    invitee = login_user(client, invited_email)

    response = client.post(
        f"/invitations/{invitation['token']}/accept",
        headers=csrf_headers(invitee),
    )

    assert response.status_code == 200
    assert response.json()["organization_id"] == organization_id
    assert response.json()["role"] == "responder"

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id != authenticated_user["id"],
        )
    )
    assert membership is not None
    assert membership.role == "responder"

    stored_invitation = db_session.get(Invitation, invitation["id"])
    assert stored_invitation is not None
    assert stored_invitation.accepted_at is not None

    replay = client.post(
        f"/invitations/{invitation['token']}/accept",
        headers=csrf_headers(invitee),
    )
    assert replay.status_code == 400


def test_invitation_cannot_be_accepted_by_different_email(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id = create_organization(client, authenticated_user)
    invited_email = f"other-{uuid4().hex[:12]}@example.com"

    invitation = create_invitation(
        client,
        authenticated_user,
        organization_id,
        invited_email,
    )

    response = client.post(
        f"/invitations/{invitation['token']}/accept",
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 403


def test_expired_invitation_is_rejected(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    invited_email = f"expired-{uuid4().hex[:12]}@example.com"

    register_user(client, invited_email)

    invitation_data = create_invitation(
        client,
        authenticated_user,
        organization_id,
        invited_email,
    )

    invitation = db_session.get(Invitation, invitation_data["id"])
    assert invitation is not None

    invitation.expires_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.flush()

    invitee = login_user(client, invited_email)

    response = client.post(
        f"/invitations/{invitation_data['token']}/accept",
        headers=csrf_headers(invitee),
    )

    assert response.status_code == 400

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id != authenticated_user["id"],
        )
    )
    assert membership is None
