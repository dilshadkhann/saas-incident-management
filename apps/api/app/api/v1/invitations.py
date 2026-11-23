from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user, require_csrf
from app.api.dependencies.authorization import require_admin
from app.api.dependencies.database import get_db
from app.models import Membership, Organization, User
from app.schemas.invitation import (
    InvitationAcceptedResponse,
    InvitationCreate,
    InvitationCreatedResponse,
    InvitationResponse,
)
from app.services.invitations import (
    accept_invitation,
    create_invitation,
    list_invitations,
)

DatabaseSession = Annotated[Session, Depends(get_db)]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]

organization_router = APIRouter(
    prefix="/organizations/{organization_id}/invitations",
    tags=["Invitations"],
)

acceptance_router = APIRouter(
    prefix="/invitations",
    tags=["Invitations"],
)


@organization_router.post(
    "",
    response_model=InvitationCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invitation_endpoint(
    organization_id: UUID,
    payload: InvitationCreate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: Annotated[Membership, Depends(require_admin)],
    __: Annotated[None, Depends(require_csrf)],
) -> InvitationCreatedResponse:
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    try:
        invitation, raw_token = create_invitation(
            db,
            organization=organization,
            email=payload.email,
            role=payload.role,
            invited_by=user,
        )
        db.commit()
        db.refresh(invitation)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The invitation could not be created.",
        ) from exc

    return InvitationCreatedResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        invited_by=invitation.invited_by,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        created_at=invitation.created_at,
        token=raw_token,
    )


@organization_router.get(
    "",
    response_model=list[InvitationResponse],
)
def list_invitations_endpoint(
    organization_id: UUID,
    db: DatabaseSession,
    _: Annotated[Membership, Depends(require_admin)],
) -> list:
    return list_invitations(
        db,
        organization_id=organization_id,
    )


@acceptance_router.post(
    "/{token}/accept",
    response_model=InvitationAcceptedResponse,
)
def accept_invitation_endpoint(
    token: str,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: Annotated[None, Depends(require_csrf)],
) -> InvitationAcceptedResponse:
    try:
        invitation, membership = accept_invitation(
            db,
            token=token,
            user=user,
        )
        db.commit()
    except PermissionError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The invitation could not be accepted.",
        ) from exc

    return InvitationAcceptedResponse(
        organization_id=invitation.organization_id,
        role=membership.role,
        message="Invitation accepted successfully.",
    )
