from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.main import app
from app.models import AuditLog, Membership, Organization, Service


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
    email = f"service-admin-{uuid4().hex[:12]}@example.com"
    password = "SecureTestPassword123!"

    registration = client.post(
        "/auth/register",
        json={
            "name": "Service Admin",
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
        json={"name": "Service Test Organization"},
        headers=csrf_headers(user),
    )
    assert response.status_code == 201
    return response.json()["id"]


def set_member_role(
    db_session: Session,
    organization_id: str,
    user_id: str,
    role: str,
) -> None:
    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
    )
    assert membership is not None
    membership.role = role
    db_session.flush()


def create_service(
    client: TestClient,
    organization_id: str,
    user: dict[str, str],
    *,
    name: str = "Payments API",
) -> dict:
    response = client.post(
        f"/organizations/{organization_id}/services",
        json={"name": name, "description": "Payment processing"},
        headers=csrf_headers(user),
    )
    assert response.status_code == 201
    return response.json()


def test_admin_can_create_and_list_services(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)

    created = create_service(client, organization_id, authenticated_user)

    assert created["name"] == "Payments API"
    assert created["status"] == "operational"
    assert created["description"] == "Payment processing"

    response = client.get(f"/organizations/{organization_id}/services")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == created["id"]

    audit = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "service.created",
        )
    )
    assert audit is not None
    assert str(audit.entity_id) == created["id"]


def test_responder_can_create_and_update_service(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    set_member_role(
        db_session,
        organization_id,
        authenticated_user["id"],
        "responder",
    )

    created = create_service(client, organization_id, authenticated_user)
    response = client.patch(
        f"/organizations/{organization_id}/services/{created['id']}",
        json={"status": "degraded", "name": "Payments Platform"},
        headers=csrf_headers(authenticated_user),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Payments Platform"
    assert response.json()["status"] == "degraded"

    audit = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "service.updated",
        )
    )
    assert audit is not None


def test_viewer_can_read_but_cannot_create_or_update_services(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)
    created = create_service(client, organization_id, authenticated_user)

    set_member_role(
        db_session,
        organization_id,
        authenticated_user["id"],
        "viewer",
    )

    listing = client.get(f"/organizations/{organization_id}/services")
    assert listing.status_code == 200

    creation = client.post(
        f"/organizations/{organization_id}/services",
        json={"name": "Viewer Created Service"},
        headers=csrf_headers(authenticated_user),
    )
    assert creation.status_code == 403

    update = client.patch(
        f"/organizations/{organization_id}/services/{created['id']}",
        json={"status": "maintenance"},
        headers=csrf_headers(authenticated_user),
    )
    assert update.status_code == 403


def test_service_names_must_be_unique_within_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id = create_organization(client, authenticated_user)
    create_service(client, organization_id, authenticated_user)

    duplicate = client.post(
        f"/organizations/{organization_id}/services",
        json={"name": "Payments API"},
        headers=csrf_headers(authenticated_user),
    )
    assert duplicate.status_code == 409


def test_service_status_and_patch_payload_are_validated(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id = create_organization(client, authenticated_user)

    invalid_create = client.post(
        f"/organizations/{organization_id}/services",
        json={"name": "Invalid Status", "status": "offline"},
        headers=csrf_headers(authenticated_user),
    )
    assert invalid_create.status_code == 422

    created = create_service(client, organization_id, authenticated_user)

    invalid_update = client.patch(
        f"/organizations/{organization_id}/services/{created['id']}",
        json={"status": "offline"},
        headers=csrf_headers(authenticated_user),
    )
    assert invalid_update.status_code == 422

    empty_update = client.patch(
        f"/organizations/{organization_id}/services/{created['id']}",
        json={},
        headers=csrf_headers(authenticated_user),
    )
    assert empty_update.status_code == 422


def test_service_access_is_scoped_to_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id = create_organization(client, authenticated_user)

    other_organization = Organization(
        name="Other Organization",
        slug=f"other-{uuid4().hex[:12]}",
    )
    db_session.add(other_organization)
    db_session.flush()

    other_service = Service(
        organization_id=other_organization.id,
        name="Private Service",
        status="operational",
    )
    db_session.add(other_service)
    db_session.flush()

    response = client.get(f"/organizations/{organization_id}/services/{other_service.id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Service not found"
