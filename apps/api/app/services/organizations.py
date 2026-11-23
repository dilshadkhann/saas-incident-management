import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Membership, Organization, User


def generate_organization_slug(db: Session, name: str) -> str:
    base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    base_slug = base_slug[:80].strip("-") or "organization"

    candidate = base_slug
    suffix = 2

    while db.scalar(select(Organization.id).where(Organization.slug == candidate)):
        candidate = f"{base_slug[:90]}-{suffix}"
        suffix += 1

    return candidate


def create_organization(
    db: Session,
    *,
    name: str,
    creator: User,
) -> Organization:
    organization = Organization(
        name=name,
        slug=generate_organization_slug(db, name),
    )
    db.add(organization)
    db.flush()

    membership = Membership(
        user_id=creator.id,
        organization_id=organization.id,
        role="admin",
    )
    db.add(membership)

    db.add(
        AuditLog(
            organization_id=organization.id,
            user_id=creator.id,
            action="organization.created",
            entity_type="organization",
            entity_id=organization.id,
            details={"name": name, "slug": organization.slug},
        )
    )

    db.flush()
    return organization


def update_organization(
    db: Session,
    *,
    organization: Organization,
    name: str,
    actor: User,
) -> Organization:
    previous_name = organization.name
    organization.name = name

    db.add(
        AuditLog(
            organization_id=organization.id,
            user_id=actor.id,
            action="organization.updated",
            entity_type="organization",
            entity_id=organization.id,
            details={
                "previous_name": previous_name,
                "new_name": name,
            },
        )
    )

    db.flush()
    return organization


def get_organization(
    db: Session,
    organization_id: UUID,
) -> Organization | None:
    return db.get(Organization, organization_id)
