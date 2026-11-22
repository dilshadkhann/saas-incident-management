from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Incident,
    Membership,
    Organization,
    Service,
    User,
)


def create_organization(session: Session, name: str) -> Organization:
    organization = Organization(
        name=name,
        slug=f"{name.lower()}-{uuid4().hex[:8]}",
    )
    session.add(organization)
    session.flush()
    return organization


def create_user(session: Session) -> User:
    user = User(
        email=f"{uuid4().hex}@example.com",
        password_hash="test-password-hash",
        full_name="Test User",
    )
    session.add(user)
    session.flush()
    return user


def create_service(
    session: Session,
    organization: Organization,
) -> Service:
    service = Service(
        organization_id=organization.id,
        name="Test Service",
    )
    session.add(service)
    session.flush()
    return service


def create_incident(
    organization: Organization,
    service: Service,
    **overrides,
) -> Incident:
    values = {
        "organization_id": organization.id,
        "service_id": service.id,
        "title": "Test incident",
        "severity": "SEV2",
        "status": "investigating",
        "detected_at": datetime.now(UTC),
    }
    values.update(overrides)
    return Incident(**values)


def test_persists_organization_membership_service_and_incident(
    db_session: Session,
):
    organization = create_organization(db_session, "Acme")
    user = create_user(db_session)

    membership = Membership(
        user_id=user.id,
        organization_id=organization.id,
        role="admin",
    )
    db_session.add(membership)
    db_session.flush()

    service = create_service(db_session, organization)
    incident = create_incident(
        organization,
        service,
        assignee_id=user.id,
    )
    db_session.add(incident)
    db_session.flush()

    assert db_session.get(Incident, incident.id) is not None
    assert db_session.get(Membership, membership.id) is not None


def test_rejects_service_from_another_organization(
    db_session: Session,
):
    organization_a = create_organization(db_session, "Alpha")
    organization_b = create_organization(db_session, "Beta")
    service_b = create_service(db_session, organization_b)

    incident = create_incident(organization_a, service_b)
    db_session.add(incident)

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_rejects_assignee_from_another_organization(
    db_session: Session,
):
    organization_a = create_organization(db_session, "Alpha")
    organization_b = create_organization(db_session, "Beta")

    user = create_user(db_session)

    membership = Membership(
        user_id=user.id,
        organization_id=organization_b.id,
        role="responder",
    )
    db_session.add(membership)
    db_session.flush()

    service_a = create_service(db_session, organization_a)

    incident = create_incident(
        organization_a,
        service_a,
        assignee_id=user.id,
    )
    db_session.add(incident)

    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        ("severity", "SEV0"),
        ("status", "closed"),
    ],
)
def test_rejects_invalid_incident_values(
    db_session: Session,
    field: str,
    invalid_value: str,
):
    organization = create_organization(db_session, "Acme")
    service = create_service(db_session, organization)

    incident = create_incident(
        organization,
        service,
        **{field: invalid_value},
    )
    db_session.add(incident)

    with pytest.raises(IntegrityError):
        db_session.flush()
