from collections.abc import Generator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.main import app
from app.models import (
    AuditLog,
    Incident,
    Membership,
    Service,
    User,
)


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
    email = f"membership-admin-{uuid4().hex[:12]}@example.com"
    password = "SecureTestPassword123!"

    registration = client.post(
        "/auth/register",
        json={
            "name": "Membership Admin",
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

    csrf_token = client.cookies.get(get_settings().csrf_cookie_name)
    assert csrf_token

    return {
        "id": registration.json()["id"],
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
        json={"name": "Membership Test Organization"},
        headers=csrf_headers(user),
    )
    assert response.status_code == 201
    return response.json()["id"]


def add_member(
    db_session: Session,
    organization_id: str,
    *,
    role: str = "responder",
) -> User:
    user = User(
        email=f"member-{uuid4().hex[:12]}@example.com",
        full_name="Test Organization Member",
        password_hash="test-password-hash",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    db_session.add(
        Membership(
            user_id=user.id,
            organization_id=organization_id,
            role=role,
        )
    )
    db_session.flush()

    return user


def test_admin_can_update_member_role_and_audit_change(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    member = add_member(db_session, organization_id, role="responder")

    response = client.patch(
        f"/organizations/{organization_id}/members/{member.id}",
        json={"role": "viewer"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 200
    assert response.json()["user_id"] == str(member.id)
    assert response.json()["role"] == "viewer"

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == member.id,
        )
    )
    assert membership is not None
    assert membership.role == "viewer"

    audit_log = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "membership.role_updated",
        )
    )
    assert audit_log is not None
    assert audit_log.details["previous_role"] == "responder"
    assert audit_log.details["new_role"] == "viewer"
    assert audit_log.details["target_email"] == member.email


def test_non_admin_cannot_update_member_role(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    member = add_member(db_session, organization_id)

    actor_membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert actor_membership is not None
    actor_membership.role = "responder"
    db_session.flush()

    response = client.patch(
        f"/organizations/{organization_id}/members/{member.id}",
        json={"role": "viewer"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 403


def test_cannot_demote_last_admin(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id = create_organization(client, authenticated_user)

    response = client.patch(
        f"/organizations/{organization_id}/members/{authenticated_user['id']}",
        json={"role": "responder"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == ("The organization must have at least one admin")


def test_cannot_remove_last_admin(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id = create_organization(client, authenticated_user)

    response = client.delete(
        f"/organizations/{organization_id}/members/{authenticated_user['id']}",
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == ("The organization must have at least one admin")


def test_admin_can_remove_member_and_preserve_user(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    member = add_member(db_session, organization_id, role="viewer")

    response = client.delete(
        f"/organizations/{organization_id}/members/{member.id}",
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 204

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == member.id,
        )
    )
    assert membership is None

    preserved_user = db_session.get(User, member.id)
    assert preserved_user is not None
    assert preserved_user.email == member.email

    audit_log = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "membership.removed",
        )
    )
    assert audit_log is not None
    assert audit_log.details["target_user_id"] == str(member.id)
    assert audit_log.details["previous_role"] == "viewer"


def test_cannot_remove_member_with_assigned_incidents(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    member = add_member(db_session, organization_id)

    service = Service(
        organization_id=organization_id,
        name="Membership Test Service",
    )
    db_session.add(service)
    db_session.flush()
    incident = Incident(
        organization_id=organization_id,
        service_id=service.id,
        assignee_id=member.id,
        title="Incident assigned to member",
        description="Used to verify membership removal protection.",
        severity="SEV2",
        status="investigating",
        detected_at=datetime.now(UTC),
    )
    db_session.add(incident)
    db_session.flush()
    # Preserve the complete test setup across the API's expected rollback.
    db_session.commit()

    response = client.delete(
        f"/organizations/{organization_id}/members/{member.id}",
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == ("Reassign this member's incidents before removing them")

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == member.id,
        )
    )
    assert membership is not None

    preserved_incident = db_session.get(Incident, incident.id)
    assert preserved_incident is not None
    assert preserved_incident.assignee_id == member.id


def test_cannot_update_member_from_another_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)

    other_user = User(
        email=f"external-{uuid4().hex[:12]}@example.com",
        full_name="External Organization Member",
        password_hash="test-password-hash",
        is_active=True,
    )
    db_session.add(other_user)
    db_session.flush()

    response = client.patch(
        f"/organizations/{organization_id}/members/{other_user.id}",
        json={"role": "viewer"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Organization member not found"


def test_cannot_remove_member_from_another_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)

    other_user = User(
        email=f"external-{uuid4().hex[:12]}@example.com",
        full_name="External Organization Member",
        password_hash="test-password-hash",
        is_active=True,
    )
    db_session.add(other_user)
    db_session.flush()

    response = client.delete(
        f"/organizations/{organization_id}/members/{other_user.id}",
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Organization member not found"
