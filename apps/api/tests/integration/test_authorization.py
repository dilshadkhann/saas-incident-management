from collections.abc import Callable
from typing import Annotated
from uuid import uuid4

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.authorization import (
    require_admin,
    require_organization_membership,
    require_responder_or_admin,
)
from app.api.dependencies.database import get_db
from app.models import Membership, Organization, User


@pytest.fixture
def authorization_data(db_session: Session):
    user = User(
        email=f"auth-{uuid4().hex[:12]}@example.com",
        full_name="Authorization Test",
        password_hash="test-password-hash",
        is_active=True,
    )
    organization = Organization(
        name="Authorization Test Organization",
        slug=f"auth-test-{uuid4().hex[:12]}",
    )

    db_session.add_all([user, organization])
    db_session.flush()

    return user, organization


@pytest.fixture
def client_factory(
    db_session: Session,
) -> Callable[[User], TestClient]:
    def create_client(user: User) -> TestClient:
        test_app = FastAPI()
        router = APIRouter()

        @router.get("/organizations/{organization_id}/member")
        def member_endpoint(
            membership: Annotated[
                Membership,
                Depends(require_organization_membership),
            ],
        ):
            return {"role": membership.role}

        @router.get("/organizations/{organization_id}/responder")
        def responder_endpoint(
            membership: Annotated[
                Membership,
                Depends(require_responder_or_admin),
            ],
        ):
            return {"role": membership.role}

        @router.get("/organizations/{organization_id}/admin")
        def admin_endpoint(
            membership: Annotated[
                Membership,
                Depends(require_admin),
            ],
        ):
            return {"role": membership.role}

        test_app.include_router(router)

        def override_get_db():
            yield db_session

        test_app.dependency_overrides[get_db] = override_get_db
        test_app.dependency_overrides[get_current_user] = lambda: user

        return TestClient(test_app)

    return create_client


def add_membership(
    db_session: Session,
    user: User,
    organization: Organization,
    role: str,
) -> None:
    db_session.add(
        Membership(
            user_id=user.id,
            organization_id=organization.id,
            role=role,
        )
    )
    db_session.flush()


def test_admin_can_access_admin_endpoint(
    db_session: Session,
    authorization_data,
    client_factory,
):
    user, organization = authorization_data
    add_membership(db_session, user, organization, "admin")

    with client_factory(user) as client:
        response = client.get(f"/organizations/{organization.id}/admin")

    assert response.status_code == 200
    assert response.json() == {"role": "admin"}


def test_responder_cannot_access_admin_endpoint(
    db_session: Session,
    authorization_data,
    client_factory,
):
    user, organization = authorization_data
    add_membership(db_session, user, organization, "responder")

    with client_factory(user) as client:
        response = client.get(f"/organizations/{organization.id}/admin")

    assert response.status_code == 403


def test_responder_can_access_responder_endpoint(
    db_session: Session,
    authorization_data,
    client_factory,
):
    user, organization = authorization_data
    add_membership(db_session, user, organization, "responder")

    with client_factory(user) as client:
        response = client.get(f"/organizations/{organization.id}/responder")

    assert response.status_code == 200
    assert response.json() == {"role": "responder"}


def test_viewer_can_access_member_endpoint_but_not_responder_endpoint(
    db_session: Session,
    authorization_data,
    client_factory,
):
    user, organization = authorization_data
    add_membership(db_session, user, organization, "viewer")

    with client_factory(user) as client:
        member_response = client.get(f"/organizations/{organization.id}/member")
        responder_response = client.get(f"/organizations/{organization.id}/responder")

    assert member_response.status_code == 200
    assert member_response.json() == {"role": "viewer"}
    assert responder_response.status_code == 403


def test_non_member_cannot_access_another_organization(
    authorization_data,
    client_factory,
):
    user, organization = authorization_data

    with client_factory(user) as client:
        response = client.get(f"/organizations/{organization.id}/member")

    assert response.status_code == 404
    assert response.json() == {"detail": "Organization not found"}
