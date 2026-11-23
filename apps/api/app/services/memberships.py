from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, Incident, Membership, User
from app.services.organization_locks import lock_organization


def _get_membership(
    db: Session,
    organization_id: UUID,
    user_id: UUID,
) -> Membership:
    membership = db.scalar(
        select(Membership)
        .where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
        .with_for_update()
    )
    if membership is None:
        raise LookupError("Organization member not found")
    return membership


def _ensure_actor_is_admin(
    db: Session,
    organization_id: UUID,
    actor_id: UUID,
) -> None:
    actor_membership = db.scalar(
        select(Membership.id).where(
            Membership.organization_id == organization_id,
            Membership.user_id == actor_id,
            Membership.role == "admin",
        )
    )
    if actor_membership is None:
        raise PermissionError("Insufficient organization permissions")


def _ensure_another_admin_exists(
    db: Session,
    organization_id: UUID,
) -> None:
    admin_count = db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.organization_id == organization_id,
            Membership.role == "admin",
        )
    )

    if admin_count <= 1:
        raise ValueError("The organization must have at least one admin")


def update_member_role(
    db: Session,
    *,
    organization_id: UUID,
    user_id: UUID,
    new_role: str,
    actor: User,
) -> Membership:
    lock_organization(db, organization_id)
    _ensure_actor_is_admin(db, organization_id, actor.id)
    membership = _get_membership(db, organization_id, user_id)

    previous_role = membership.role

    if previous_role == new_role:
        return membership

    if previous_role == "admin" and new_role != "admin":
        _ensure_another_admin_exists(db, organization_id)

    target_user = db.get(User, user_id)
    if target_user is None:
        raise LookupError("Organization member not found")

    membership.role = new_role

    db.add(
        AuditLog(
            organization_id=organization_id,
            user_id=actor.id,
            action="membership.role_updated",
            entity_type="membership",
            entity_id=membership.id,
            details={
                "target_user_id": str(user_id),
                "target_email": target_user.email,
                "previous_role": previous_role,
                "new_role": new_role,
            },
        )
    )

    db.flush()
    return membership


def remove_member(
    db: Session,
    *,
    organization_id: UUID,
    user_id: UUID,
    actor: User,
) -> None:
    lock_organization(db, organization_id)
    _ensure_actor_is_admin(db, organization_id, actor.id)
    membership = _get_membership(db, organization_id, user_id)

    if membership.role == "admin":
        _ensure_another_admin_exists(db, organization_id)

    target_user = db.get(User, user_id)
    if target_user is None:
        raise LookupError("Organization member not found")

    assigned_incident_id = db.scalar(
        select(Incident.id)
        .where(
            Incident.organization_id == organization_id,
            Incident.assignee_id == user_id,
        )
        .limit(1)
    )

    if assigned_incident_id is not None:
        raise ValueError("Reassign this member's incidents before removing them")

    db.add(
        AuditLog(
            organization_id=organization_id,
            user_id=actor.id,
            action="membership.removed",
            entity_type="membership",
            entity_id=membership.id,
            details={
                "target_user_id": str(user_id),
                "target_email": target_user.email,
                "previous_role": membership.role,
            },
        )
    )

    db.delete(membership)
    db.flush()
