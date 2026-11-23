from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user, require_csrf
from app.api.dependencies.authorization import (
    require_admin,
    require_organization_membership,
)
from app.api.dependencies.database import get_db
from app.models import Membership, Organization, User
from app.schemas.organization import (
    MemberRoleUpdate,
    OrganizationCreate,
    OrganizationMemberResponse,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.services.memberships import remove_member, update_member_role
from app.services.organizations import (
    create_organization,
    get_organization,
    update_organization,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])

DatabaseSession = Annotated[Session, Depends(get_db)]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_organization_endpoint(
    payload: OrganizationCreate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: Annotated[None, Depends(require_csrf)],
) -> Organization:
    try:
        organization = create_organization(
            db,
            name=payload.name,
            creator=user,
        )
        db.commit()
        db.refresh(organization)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An organization with this slug already exists",
        ) from exc

    return organization


@router.get("", response_model=list[OrganizationResponse])
def list_organizations(
    db: DatabaseSession,
    user: AuthenticatedUser,
) -> list[Organization]:
    statement = (
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Membership.user_id == user.id)
        .order_by(Organization.name)
    )
    return list(db.scalars(statement).all())


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
)
def get_organization_endpoint(
    organization_id: UUID,
    db: DatabaseSession,
    _: Annotated[
        Membership,
        Depends(require_organization_membership),
    ],
) -> Organization:
    organization = get_organization(db, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return organization


@router.patch(
    "/{organization_id}",
    response_model=OrganizationResponse,
)
def update_organization_endpoint(
    organization_id: UUID,
    payload: OrganizationUpdate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: Annotated[Membership, Depends(require_admin)],
    __: Annotated[None, Depends(require_csrf)],
) -> Organization:
    organization = get_organization(db, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    organization = update_organization(
        db,
        organization=organization,
        name=payload.name,
        actor=user,
    )
    db.commit()
    db.refresh(organization)

    return organization


@router.get(
    "/{organization_id}/members",
    response_model=list[OrganizationMemberResponse],
)
def list_organization_members(
    organization_id: UUID,
    db: DatabaseSession,
    _: Annotated[
        Membership,
        Depends(require_organization_membership),
    ],
) -> list[OrganizationMemberResponse]:
    statement = (
        select(Membership, User)
        .join(User, User.id == Membership.user_id)
        .where(Membership.organization_id == organization_id)
        .order_by(Membership.joined_at)
    )

    memberships = db.execute(statement).all()

    return [
        OrganizationMemberResponse(
            id=membership.id,
            user_id=user.id,
            name=user.full_name,
            email=user.email,
            role=membership.role,
            joined_at=membership.joined_at,
        )
        for membership, user in memberships
    ]


@router.patch(
    "/{organization_id}/members/{user_id}",
    response_model=OrganizationMemberResponse,
)
def update_member_role_endpoint(
    organization_id: UUID,
    user_id: UUID,
    payload: MemberRoleUpdate,
    db: DatabaseSession,
    actor: AuthenticatedUser,
    _: Annotated[Membership, Depends(require_admin)],
    __: Annotated[None, Depends(require_csrf)],
) -> OrganizationMemberResponse:
    try:
        membership = update_member_role(
            db,
            organization_id=organization_id,
            user_id=user_id,
            new_role=payload.role,
            actor=actor,
        )
        db.commit()
    except PermissionError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except LookupError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
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
            detail="Unable to update member role",
        ) from exc

    target_user = db.get(User, user_id)

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization member not found",
        )

    return OrganizationMemberResponse(
        id=membership.id,
        user_id=target_user.id,
        name=target_user.full_name,
        email=target_user.email,
        role=membership.role,
        joined_at=membership.joined_at,
    )


@router.delete(
    "/{organization_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_member_endpoint(
    organization_id: UUID,
    user_id: UUID,
    db: DatabaseSession,
    actor: AuthenticatedUser,
    _: Annotated[Membership, Depends(require_admin)],
    __: Annotated[None, Depends(require_csrf)],
) -> Response:
    try:
        remove_member(
            db,
            organization_id=organization_id,
            user_id=user_id,
            actor=actor,
        )
        db.commit()
    except PermissionError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except LookupError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
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
            detail="Cannot remove this member while related records depend on the membership",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
