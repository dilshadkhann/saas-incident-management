from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Organization


def lock_organization(db: Session, organization_id: UUID) -> Organization:
    organization = db.scalar(
        select(Organization).where(Organization.id == organization_id).with_for_update()
    )
    if organization is None:
        raise LookupError("Organization not found")
    return organization
