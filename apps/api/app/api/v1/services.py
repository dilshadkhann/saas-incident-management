from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user, require_csrf
from app.api.dependencies.authorization import (
    require_organization_membership,
    require_responder_or_admin,
)
from app.api.dependencies.database import get_db
from app.models import Membership, Service, User
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate
from app.services.services import (
    create_service,
    get_service,
    list_services,
    update_service,
)

router = APIRouter(
    prefix="/organizations/{organization_id}/services",
    tags=["Services"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
OrganizationMember = Annotated[
    Membership,
    Depends(require_organization_membership),
]
ServiceEditor = Annotated[
    Membership,
    Depends(require_responder_or_admin),
]


@router.post(
    "",
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_service_endpoint(
    organization_id: UUID,
    payload: ServiceCreate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: ServiceEditor,
    __: Annotated[None, Depends(require_csrf)],
) -> Service:
    try:
        service = create_service(
            db,
            organization_id=organization_id,
            name=payload.name,
            description=payload.description,
            actor=user,
        )
        db.commit()
        db.refresh(service)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A service with this name already exists in this organization",
        ) from exc

    return service


@router.get("", response_model=list[ServiceResponse])
def list_services_endpoint(
    organization_id: UUID,
    db: DatabaseSession,
    _: OrganizationMember,
) -> list[Service]:
    return list_services(db, organization_id)


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service_endpoint(
    organization_id: UUID,
    service_id: UUID,
    db: DatabaseSession,
    _: OrganizationMember,
) -> Service:
    service = get_service(
        db,
        organization_id=organization_id,
        service_id=service_id,
    )
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    return service


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service_endpoint(
    organization_id: UUID,
    service_id: UUID,
    payload: ServiceUpdate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: ServiceEditor,
    __: Annotated[None, Depends(require_csrf)],
) -> Service:
    service = get_service(
        db,
        organization_id=organization_id,
        service_id=service_id,
    )
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    try:
        service = update_service(
            db,
            service=service,
            changes=payload.model_dump(exclude_unset=True),
            actor=user,
        )
        db.commit()
        db.refresh(service)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A service with this name already exists in this organization",
        ) from exc

    return service
