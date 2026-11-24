from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.main import app
from app.models import AuditLog, Membership


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
    email = f"incident-admin-{uuid4().hex[:12]}@example.com"
    password = "SecureTestPassword123!"
    registration = client.post(
        "/auth/register",
        json={"name": "Incident Admin", "email": email, "password": password},
    )
    assert registration.status_code == 201
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    csrf_token = client.cookies.get(get_settings().csrf_cookie_name)
    assert csrf_token
    return {"id": registration.json()["id"], "csrf_token": csrf_token}


def csrf_headers(user: dict[str, str]) -> dict[str, str]:
    return {"X-CSRF-Token": user["csrf_token"]}


def create_org_and_service(
    client: TestClient,
    user: dict[str, str],
) -> tuple[str, dict]:
    org = client.post(
        "/organizations",
        json={"name": "Incident Test Organization"},
        headers=csrf_headers(user),
    )
    assert org.status_code == 201
    organization_id = org.json()["id"]
    service = client.post(
        f"/organizations/{organization_id}/services",
        json={"name": "Payments API"},
        headers=csrf_headers(user),
    )
    assert service.status_code == 201
    return organization_id, service.json()


def create_incident(
    client: TestClient,
    user: dict[str, str],
    organization_id: str,
    service_id: str,
) -> dict:
    response = client.post(
        f"/organizations/{organization_id}/incidents",
        json={
            "service_id": service_id,
            "title": "Payment processing unavailable",
            "description": "Payments are failing.",
            "severity": "SEV1",
        },
        headers=csrf_headers(user),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_admin_can_create_list_and_get_incident(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id, service = create_org_and_service(client, authenticated_user)
    created = create_incident(client, authenticated_user, organization_id, service["id"])
    assert created["severity"] == "SEV1"
    assert created["status"] == "investigating"
    assert created["service_id"] == service["id"]
    listing = client.get(f"/organizations/{organization_id}/incidents")
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    detail = client.get(f"/organizations/{organization_id}/incidents/{created['id']}")
    assert detail.status_code == 200
    assert detail.json()["id"] == created["id"]
    audit = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "incident.created",
        )
    )
    assert audit is not None


def test_responder_can_update_incident_and_resolve_it(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id, service = create_org_and_service(client, authenticated_user)
    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert membership is not None
    membership.role = "responder"
    db_session.flush()
    created = create_incident(client, authenticated_user, organization_id, service["id"])
    url = f"/organizations/{organization_id}/incidents/{created['id']}"
    identified = client.patch(
        url,
        json={"status": "identified", "title": "Payment outage identified"},
        headers=csrf_headers(authenticated_user),
    )
    assert identified.status_code == 200
    assert identified.json()["status"] == "identified"
    monitoring = client.patch(
        url,
        json={"status": "monitoring"},
        headers=csrf_headers(authenticated_user),
    )
    assert monitoring.status_code == 200
    resolved = client.patch(
        url,
        json={"status": "resolved"},
        headers=csrf_headers(authenticated_user),
    )
    assert resolved.status_code == 200
    assert resolved.json()["resolved_at"] is not None
    audit = db_session.scalar(
        select(AuditLog).where(
            AuditLog.organization_id == organization_id,
            AuditLog.action == "incident.updated",
        )
    )
    assert audit is not None


def test_viewer_can_read_but_cannot_create_or_update_incidents(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id, service = create_org_and_service(client, authenticated_user)
    created = create_incident(client, authenticated_user, organization_id, service["id"])
    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert membership is not None
    membership.role = "viewer"
    db_session.flush()
    assert client.get(f"/organizations/{organization_id}/incidents").status_code == 200
    denied_create = client.post(
        f"/organizations/{organization_id}/incidents",
        json={"service_id": service["id"], "title": "Denied", "severity": "SEV2"},
        headers=csrf_headers(authenticated_user),
    )
    assert denied_create.status_code == 403
    denied_update = client.patch(
        f"/organizations/{organization_id}/incidents/{created['id']}",
        json={"title": "Denied"},
        headers=csrf_headers(authenticated_user),
    )
    assert denied_update.status_code == 403


def test_incident_validation_and_status_transitions(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id, service = create_org_and_service(client, authenticated_user)
    invalid = client.post(
        f"/organizations/{organization_id}/incidents",
        json={"service_id": service["id"], "title": "Bad", "severity": "SEV5"},
        headers=csrf_headers(authenticated_user),
    )
    assert invalid.status_code == 422
    created = create_incident(client, authenticated_user, organization_id, service["id"])
    url = f"/organizations/{organization_id}/incidents/{created['id']}"
    skipped_backwards = client.patch(
        url,
        json={"status": "monitoring"},
        headers=csrf_headers(authenticated_user),
    )
    assert skipped_backwards.status_code == 200
    backwards = client.patch(
        url,
        json={"status": "identified"},
        headers=csrf_headers(authenticated_user),
    )
    assert backwards.status_code == 422
    empty = client.patch(url, json={}, headers=csrf_headers(authenticated_user))
    assert empty.status_code == 422


def test_incident_filters_and_tenant_scoped_lookup(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id, service = create_org_and_service(client, authenticated_user)
    created = create_incident(client, authenticated_user, organization_id, service["id"])
    filtered = client.get(
        f"/organizations/{organization_id}/incidents?severity=SEV1&status=investigating"
    )
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()] == [created["id"]]
    missing = client.get(f"/organizations/{organization_id}/incidents/{uuid4()}")
    assert missing.status_code == 404


def test_incident_rejects_service_outside_organization(
    client: TestClient,
    authenticated_user: dict[str, str],
):
    organization_id, _ = create_org_and_service(client, authenticated_user)
    response = client.post(
        f"/organizations/{organization_id}/incidents",
        json={
            "service_id": str(uuid4()),
            "title": "Invalid service reference",
            "severity": "SEV2",
        },
        headers=csrf_headers(authenticated_user),
    )
    assert response.status_code == 422


def test_audit_history_is_paginated_filtered_and_tenant_scoped(
    client: TestClient,
    authenticated_user: dict[str, str],
    db_session: Session,
):
    organization_id, service = create_org_and_service(client, authenticated_user)
    created = create_incident(client, authenticated_user, organization_id, service["id"])
    url = f"/organizations/{organization_id}/audit-logs"

    response = client.get(url)
    assert response.status_code == 200, response.text
    assert response.json()["total"] >= 2
    assert response.json()["items"][0]["organization_id"] == organization_id

    filtered = client.get(url, params={"action": "incident.created"})
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["items"][0]["entity_id"] == created["id"]

    page = client.get(url, params={"limit": 1})
    assert page.status_code == 200
    assert len(page.json()["items"]) == 1

    membership = db_session.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == authenticated_user["id"],
        )
    )
    assert membership is not None
    membership.role = "viewer"
    db_session.flush()
    assert client.get(url).status_code == 200

    assert client.get(f"/organizations/{uuid4()}/audit-logs").status_code == 404
    assert client.get(f"{url}?limit=101").status_code == 422
    assert client.get(f"{url}?offset=-1").status_code == 422


def test_audit_history_endpoint(client: TestClient, authenticated_user: dict[str, str]):
    organization_id, service = create_org_and_service(client, authenticated_user)
    create_incident(client, authenticated_user, organization_id, service["id"])
    response = client.get(f"/organizations/{organization_id}/audit-logs")
    assert response.status_code == 200, response.text
    assert response.json()["total"] >= 2
    assert client.get(f"/organizations/{uuid4()}/audit-logs").status_code == 404
