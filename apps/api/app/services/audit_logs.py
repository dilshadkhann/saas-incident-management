from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog


def list_audit_logs(
    db: Session,
    *,
    organization_id: UUID,
    action: str | None = None,
    entity_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    filters = [AuditLog.organization_id == organization_id]

    if action:
        filters.append(AuditLog.action == action)

    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)

    total = db.scalar(select(func.count(AuditLog.id)).where(*filters)) or 0

    statement = (
        select(AuditLog)
        .where(*filters)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(limit)
        .offset(offset)
    )

    return {
        "items": list(db.scalars(statement).all()),
        "total": total,
        "limit": limit,
        "offset": offset,
    }
