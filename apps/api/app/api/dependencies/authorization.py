from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.database import get_db
from app.models import Membership, User

DatabaseSession = Annotated[Session, Depends(get_db)]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]


def require_organization_role(
    *allowed_roles: str,
) -> Callable[..., Membership]:
    if not allowed_roles:
        raise ValueError("At least one allowed role must be specified")

    def check_organization_role(
        organization_id: UUID,
        db: DatabaseSession,
        user: AuthenticatedUser,
    ) -> Membership:
        membership = db.scalar(
            select(Membership).where(
                Membership.organization_id == organization_id,
                Membership.user_id == user.id,
            )
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

        if membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient organization permissions",
            )

        return membership

    return check_organization_role


require_organization_membership = require_organization_role(
    "admin",
    "responder",
    "viewer",
)

require_admin = require_organization_role("admin")

require_responder_or_admin = require_organization_role(
    "admin",
    "responder",
)
