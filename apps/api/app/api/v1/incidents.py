from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user, require_csrf
from app.api.dependencies.authorization import (
    require_organization_membership,
    require_responder_or_admin,
)
from app.api.dependencies.database import get_db
from app.models import Incident, Membership, User
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
)
from app.services.incidents import (
    create_incident,
    get_incident,
    list_incidents,
    update_incident,
)

router = APIRouter(
    prefix="/organizations/{organization_id}/incidents",
    tags=["Incidents"],
)
DatabaseSession = Annotated[Session, Depends(get_db)]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
OrganizationMember = Annotated[
    Membership,
    Depends(require_organization_membership),
]
IncidentEditor = Annotated[
    Membership,
    Depends(require_responder_or_admin),
]


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_incident_endpoint(
    organization_id: UUID,
    payload: IncidentCreate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: IncidentEditor,
    __: Annotated[None, Depends(require_csrf)],
) -> Incident:
    try:
        incident = create_incident(
            db,
            organization_id=organization_id,
            payload=payload.model_dump(),
            actor=user,
        )
        db.commit()
        db.refresh(incident)
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
            detail="Incident could not be created because of a data conflict.",
        ) from exc
    return incident


@router.get("", response_model=list[IncidentResponse])
def list_incidents_endpoint(
    organization_id: UUID,
    db: DatabaseSession,
    _: OrganizationMember,
    status_filter: Annotated[
        str | None,
        Query(alias="status", pattern="^(investigating|identified|monitoring|resolved)$"),
    ] = None,
    severity: Annotated[
        str | None,
        Query(pattern="^(SEV1|SEV2|SEV3|SEV4)$"),
    ] = None,
    service_id: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Incident]:
    return list_incidents(
        db,
        organization_id=organization_id,
        status_filter=status_filter,
        severity=severity,
        service_id=service_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_endpoint(
    organization_id: UUID,
    incident_id: UUID,
    db: DatabaseSession,
    _: OrganizationMember,
) -> Incident:
    incident = get_incident(
        db,
        organization_id=organization_id,
        incident_id=incident_id,
    )
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident_endpoint(
    organization_id: UUID,
    incident_id: UUID,
    payload: IncidentUpdate,
    db: DatabaseSession,
    user: AuthenticatedUser,
    _: IncidentEditor,
    __: Annotated[None, Depends(require_csrf)],
) -> Incident:
    incident = get_incident(
        db,
        organization_id=organization_id,
        incident_id=incident_id,
    )
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )
    try:
        incident = update_incident(
            db,
            incident=incident,
            changes=payload.model_dump(exclude_unset=True),
            actor=user,
        )
        db.commit()
        db.refresh(incident)
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
            detail="Incident could not be updated because of a data conflict.",
        ) from exc
    return incident
