from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import generate_token, hash_token
from app.models import AuditLog, Invitation, Membership, Organization, User
from app.services.organization_locks import lock_organization


def create_invitation(
    db: Session,
    *,
    organization: Organization,
    email: str,
    role: str,
    invited_by: User,
) -> tuple[Invitation, str]:
    normalized_email = email.strip().lower()

    existing_member = db.scalar(
        select(Membership.id)
        .join(User, User.id == Membership.user_id)
        .where(
            Membership.organization_id == organization.id,
            User.email == normalized_email,
        )
    )

    if existing_member is not None:
        raise ValueError("This user is already a member of the organization.")

    now = datetime.now(UTC)

    existing_invitation = db.scalar(
        select(Invitation.id).where(
            Invitation.organization_id == organization.id,
            Invitation.email == normalized_email,
            Invitation.accepted_at.is_(None),
            Invitation.expires_at > now,
        )
    )

    if existing_invitation is not None:
        raise ValueError("A pending invitation already exists for this email.")

    raw_token = generate_token()
    settings = get_settings()

    invitation = Invitation(
        organization_id=organization.id,
        email=normalized_email,
        role=role,
        token_hash=hash_token(raw_token),
        invited_by=invited_by.id,
        expires_at=now + timedelta(hours=settings.invitation_ttl_hours),
    )

    db.add(invitation)
    db.flush()

    db.add(
        AuditLog(
            organization_id=organization.id,
            user_id=invited_by.id,
            action="invitation.created",
            entity_type="invitation",
            entity_id=invitation.id,
            details={
                "email": normalized_email,
                "role": role,
            },
        )
    )

    db.flush()
    return invitation, raw_token


def list_invitations(
    db: Session,
    *,
    organization_id: UUID,
) -> list[Invitation]:
    statement = (
        select(Invitation)
        .where(Invitation.organization_id == organization_id)
        .order_by(Invitation.created_at.desc())
    )

    return list(db.scalars(statement).all())


def accept_invitation(
    db: Session,
    *,
    token: str,
    user: User,
) -> tuple[Invitation, Membership]:
    token_hash = hash_token(token)

    invitation_reference = db.scalar(select(Invitation).where(Invitation.token_hash == token_hash))
    if invitation_reference is None:
        raise ValueError("Invitation is invalid, expired, or already used.")

    organization_id = invitation_reference.organization_id
    lock_organization(db, organization_id)

    invitation = db.scalar(
        select(Invitation)
        .where(
            Invitation.token_hash == token_hash,
            Invitation.organization_id == organization_id,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    now = datetime.now(UTC)
    if invitation is None or invitation.accepted_at is not None or invitation.expires_at <= now:
        raise ValueError("Invitation is invalid, expired, or already used.")

    if user.email.strip().lower() != invitation.email:
        raise PermissionError("This invitation belongs to a different email address.")

    existing_membership = db.scalar(
        select(Membership.id).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user.id,
        )
    )
    if existing_membership is not None:
        raise ValueError("You are already a member of this organization.")

    membership = Membership(
        organization_id=organization_id,
        user_id=user.id,
        role=invitation.role,
    )
    db.add(membership)
    db.flush()

    invitation.accepted_at = now
    db.add(
        AuditLog(
            organization_id=organization_id,
            user_id=user.id,
            action="invitation.accepted",
            entity_type="invitation",
            entity_id=invitation.id,
            details={
                "email": invitation.email,
                "role": invitation.role,
            },
        )
    )

    db.flush()
    return invitation, membership
