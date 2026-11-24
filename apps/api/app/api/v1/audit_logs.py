from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies.authorization import require_organization_membership
from app.api.dependencies.database import get_db
from app.models import Membership
from app.schemas.audit_log import AuditLogPage
from app.services.audit_logs import list_audit_logs

router = APIRouter(
    prefix="/organizations/{organization_id}/audit-logs",
    tags=["Audit Logs"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
OrganizationMember = Annotated[
    Membership,
    Depends(require_organization_membership),
]


@router.get("", response_model=AuditLogPage)
def list_audit_logs_endpoint(
    organization_id: UUID,
    db: DatabaseSession,
    _: OrganizationMember,
    action: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    entity_type: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    return list_audit_logs(
        db,
        organization_id=organization_id,
        action=action,
        entity_type=entity_type,
        limit=limit,
        offset=offset,
    )
