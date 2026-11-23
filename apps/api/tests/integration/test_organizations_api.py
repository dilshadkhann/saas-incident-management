from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.main import app
from app.models import AuditLog, Membership, Organization, User


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
    email = f"org-test-{uuid4().hex[:12]}@example.com"
    password = "SecureTestPassword123!"

    registration = client.post(
        "/auth/register",
        json={
            "name": "Organization Test User",
            "email": email,
            "password": password,
        },
    )
    assert registration.status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200

    settings = get_settings()
    csrf_token = client.cookies.get(settings.csrf_cookie_name)
    assert csrf_token

    return {
        "id": registration.json()["id"],
        "csrf_token": csrf_token,
    }


def csrf_headers(authenticated_user: dict[str, str]) -> dict[str, str]:
    return {"X-CSRF-Token": authenticated_user["csrf_token"]}


def test_creates_organization_with_creator_as_admin(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    response = client.post(
        "/organizations",
        json={"name": "Acme Operations"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 201

    organization_data = response.json()
    assert organization_data["name"] == "Acme Operations"
    assert organization_data["slug"] == "acme-operations"

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_data["id"],
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert membership is not None
    assert membership.role == "admin"

    audit_log = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_data["id"],
            AuditLog.action == "organization.created",
        )
    )
    assert audit_log is not None


def test_lists_only_organizations_the_user_belongs_to(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    own_response = client.post(
        "/organizations",
        json={"name": "My Organization"},
        headers=csrf_headers(authenticated_user),
    )
    assert own_response.status_code == 201

    other_user = User(
        email=f"other-{uuid4().hex[:12]}@example.com",
        full_name="Other User",
        password_hash="test-password-hash",
        is_active=True,
    )
    other_organization = Organization(
        name="Another Organization",
        slug=f"another-{uuid4().hex[:12]}",
    )
    db_session.add_all([other_user, other_organization])
    db_session.flush()

    db_session.add(
        Membership(
            user_id=other_user.id,
            organization_id=other_organization.id,
            role="admin",
        )
    )
    db_session.flush()

    response = client.get("/organizations")

    assert response.status_code == 200
    organizations = response.json()
    assert len(organizations) == 1
    assert organizations[0]["id"] == own_response.json()["id"]


def test_non_member_cannot_access_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    other_user = User(
        email=f"owner-{uuid4().hex[:12]}@example.com",
        full_name="Organization Owner",
        password_hash="test-password-hash",
        is_active=True,
    )
    organization = Organization(
        name="Private Organization",
        slug=f"private-{uuid4().hex[:12]}",
    )
    db_session.add_all([other_user, organization])
    db_session.flush()

    db_session.add(
        Membership(
            user_id=other_user.id,
            organization_id=organization.id,
            role="admin",
        )
    )
    db_session.flush()

    response = client.get(f"/organizations/{organization.id}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Organization not found"}


def test_admin_can_update_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    creation = client.post(
        "/organizations",
        json={"name": "Original Name"},
        headers=csrf_headers(authenticated_user),
    )
    assert creation.status_code == 201

    organization_id = creation.json()["id"]

    response = client.patch(
        f"/organizations/{organization_id}",
        json={"name": "Updated Name"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


def test_viewer_cannot_update_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    creation = client.post(
        "/organizations",
        json={"name": "Viewer Test Organization"},
        headers=csrf_headers(authenticated_user),
    )
    assert creation.status_code == 201

    organization_id = creation.json()["id"]

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert membership is not None

    membership.role = "viewer"
    db_session.flush()

    response = client.patch(
        f"/organizations/{organization_id}",
        json={"name": "Unauthorized Update"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 403


def test_member_can_list_organization_members(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    creation = client.post(
        "/organizations",
        json={"name": "Membership Test Organization"},
        headers=csrf_headers(authenticated_user),
    )
    assert creation.status_code == 201

    organization_id = creation.json()["id"]

    second_user = User(
        email=f"member-{uuid4().hex[:12]}@example.com",
        full_name="Second Member",
        password_hash="test-password-hash",
        is_active=True,
    )
    db_session.add(second_user)
    db_session.flush()

    db_session.add(
        Membership(
            user_id=second_user.id,
            organization_id=organization_id,
            role="responder",
        )
    )
    db_session.flush()

    response = client.get(f"/organizations/{organization_id}/members")

    assert response.status_code == 200

    members = response.json()
    assert len(members) == 2

    roles = {member["role"] for member in members}
    assert roles == {"admin", "responder"}

    emails = {member["email"] for member in members}
    assert emails == {
        client.get("/auth/me").json()["email"],
        second_user.email,
    }
