from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Service, User


def list_services(db: Session, organization_id: UUID) -> list[Service]:
    statement = (
        select(Service).where(Service.organization_id == organization_id).order_by(Service.name)
    )
    return list(db.scalars(statement).all())


def get_service(
    db: Session,
    *,
    organization_id: UUID,
    service_id: UUID,
) -> Service | None:
    statement = select(Service).where(
        Service.organization_id == organization_id,
        Service.id == service_id,
    )
    return db.scalar(statement)


def create_service(
    db: Session,
    *,
    organization_id: UUID,
    name: str,
    description: str | None,
    actor: User,
) -> Service:
    service = Service(
        organization_id=organization_id,
        name=name,
        description=description,
        status="operational",
    )
    db.add(service)
    db.flush()

    db.add(
        AuditLog(
            organization_id=organization_id,
            user_id=actor.id,
            action="service.created",
            entity_type="service",
            entity_id=service.id,
            details={
                "name": service.name,
                "status": service.status,
            },
        )
    )
    db.flush()
    return service


def update_service(
    db: Session,
    *,
    service: Service,
    changes: dict,
    actor: User,
) -> Service:
    if "name" in changes and changes["name"] is None:
        raise ValueError("Service name cannot be null.")
    if "status" in changes and changes["status"] is None:
        raise ValueError("Service status cannot be null.")

    previous_values = {field: getattr(service, field) for field in changes}

    for field, value in changes.items():
        setattr(service, field, value)

    db.add(
        AuditLog(
            organization_id=service.organization_id,
            user_id=actor.id,
            action="service.updated",
            entity_type="service",
            entity_id=service.id,
            details={
                "previous": previous_values,
                "updated": changes,
            },
        )
    )
    db.flush()
    return service
