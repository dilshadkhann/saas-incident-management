from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Incident, Membership, Service, User

ALLOWED_STATUS_TRANSITIONS = {
    "investigating": {"identified", "monitoring", "resolved"},
    "identified": {"monitoring", "resolved"},
    "monitoring": {"resolved"},
    "resolved": set(),
}


def list_incidents(
    db: Session,
    *,
    organization_id: UUID,
    status_filter: str | None = None,
    severity: str | None = None,
    service_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Incident]:
    statement = select(Incident).where(Incident.organization_id == organization_id)
    if status_filter:
        statement = statement.where(Incident.status == status_filter)
    if severity:
        statement = statement.where(Incident.severity == severity)
    if service_id:
        statement = statement.where(Incident.service_id == service_id)
    statement = (
        statement.order_by(Incident.detected_at.desc(), Incident.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement).all())


def get_incident(
    db: Session,
    *,
    organization_id: UUID,
    incident_id: UUID,
) -> Incident | None:
    return db.scalar(
        select(Incident).where(
            Incident.organization_id == organization_id,
            Incident.id == incident_id,
        )
    )


def _validate_relationships(
    db: Session,
    *,
    organization_id: UUID,
    service_id: UUID,
    assignee_id: UUID | None,
) -> None:
    service = db.scalar(
        select(Service).where(
            Service.organization_id == organization_id,
            Service.id == service_id,
        )
    )
    if service is None:
        raise ValueError("Service not found in this organization.")
    if assignee_id is not None:
        membership = db.scalar(
            select(Membership).where(
                Membership.organization_id == organization_id,
                Membership.user_id == assignee_id,
            )
        )
        if membership is None:
            raise ValueError("Assignee is not a member of this organization.")


def create_incident(
    db: Session,
    *,
    organization_id: UUID,
    payload: dict,
    actor: User,
) -> Incident:
    _validate_relationships(
        db,
        organization_id=organization_id,
        service_id=payload["service_id"],
        assignee_id=payload.get("assignee_id"),
    )
    incident = Incident(
        organization_id=organization_id,
        service_id=payload["service_id"],
        assignee_id=payload.get("assignee_id"),
        title=payload["title"],
        description=payload.get("description"),
        severity=payload["severity"],
        status="investigating",
        detected_at=payload.get("detected_at") or datetime.now(UTC),
    )
    db.add(incident)
    db.flush()
    db.add(
        AuditLog(
            organization_id=organization_id,
            user_id=actor.id,
            action="incident.created",
            entity_type="incident",
            entity_id=incident.id,
            details={
                "title": incident.title,
                "severity": incident.severity,
                "status": incident.status,
                "service_id": str(incident.service_id),
            },
        )
    )
    db.flush()
    return incident


def update_incident(
    db: Session,
    *,
    incident: Incident,
    changes: dict,
    actor: User,
) -> Incident:
    if "title" in changes and changes["title"] is None:
        raise ValueError("Incident title cannot be null.")
    if "severity" in changes and changes["severity"] is None:
        raise ValueError("Incident severity cannot be null.")
    if "service_id" in changes and changes["service_id"] is None:
        raise ValueError("Incident service cannot be null.")
    if "status" in changes and changes["status"] is None:
        raise ValueError("Incident status cannot be null.")
    next_service_id = changes.get("service_id", incident.service_id)
    next_assignee_id = changes.get("assignee_id", incident.assignee_id)
    _validate_relationships(
        db,
        organization_id=incident.organization_id,
        service_id=next_service_id,
        assignee_id=next_assignee_id,
    )
    next_status = changes.get("status", incident.status)
    if next_status != incident.status:
        allowed = ALLOWED_STATUS_TRANSITIONS[incident.status]
        if next_status not in allowed:
            raise ValueError(
                f"Invalid incident status transition: {incident.status} -> {next_status}."
            )
    previous = {
        key: str(getattr(incident, key)) if getattr(incident, key) is not None else None
        for key in changes
    }
    for key, value in changes.items():
        setattr(incident, key, value)
    if "status" in changes:
        incident.resolved_at = datetime.now(UTC) if next_status == "resolved" else None
    updated = {key: str(value) if value is not None else None for key, value in changes.items()}
    db.add(
        AuditLog(
            organization_id=incident.organization_id,
            user_id=actor.id,
            action="incident.updated",
            entity_type="incident",
            entity_id=incident.id,
            details={"previous": previous, "updated": updated},
        )
    )
    db.flush()
    return incident
