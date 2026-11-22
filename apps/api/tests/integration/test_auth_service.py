import pytest
from sqlalchemy.orm import Session

from app.models import AuthSession
from app.services.auth import (
    AuthenticationFailed,
    EmailAlreadyRegistered,
    authenticate_user,
    create_session,
    get_active_session,
    register_user,
    revoke_session,
    verify_csrf_token,
)


def test_registers_user_and_rejects_duplicate_email(db_session: Session):
    user = register_user(
        db_session,
        name="Alex Morgan",
        email="Alex@Example.com",
        password="StrongPassword123!",
    )

    assert user.email == "alex@example.com"
    assert user.full_name == "Alex Morgan"
    assert user.password_hash != "StrongPassword123!"

    with pytest.raises(EmailAlreadyRegistered):
        register_user(
            db_session,
            name="Another User",
            email="alex@example.com",
            password="AnotherStrongPassword123!",
        )


def test_authenticates_user_and_rejects_invalid_credentials(
    db_session: Session,
):
    register_user(
        db_session,
        name="Alex Morgan",
        email="alex@example.com",
        password="StrongPassword123!",
    )

    user = authenticate_user(
        db_session,
        email="ALEX@example.com",
        password="StrongPassword123!",
    )

    assert user.email == "alex@example.com"

    with pytest.raises(AuthenticationFailed):
        authenticate_user(
            db_session,
            email="alex@example.com",
            password="WrongPassword123!",
        )


def test_rejects_inactive_user(db_session: Session):
    user = register_user(
        db_session,
        name="Alex Morgan",
        email="alex@example.com",
        password="StrongPassword123!",
    )
    user.is_active = False
    db_session.flush()

    with pytest.raises(AuthenticationFailed):
        authenticate_user(
            db_session,
            email="alex@example.com",
            password="StrongPassword123!",
        )


def test_session_creation_validation_and_revocation(db_session: Session):
    user = register_user(
        db_session,
        name="Alex Morgan",
        email="alex@example.com",
        password="StrongPassword123!",
    )

    credentials = create_session(db_session, user)

    assert credentials.session_token
    assert credentials.csrf_token
    assert credentials.expires_at

    auth_session, authenticated_user = get_active_session(
        db_session,
        credentials.session_token,
    )

    assert authenticated_user.id == user.id
    assert verify_csrf_token(auth_session, credentials.csrf_token)
    assert not verify_csrf_token(auth_session, "incorrect-token")

    revoke_session(db_session, auth_session)

    assert get_active_session(db_session, credentials.session_token) is None
    assert db_session.query(AuthSession).count() == 1
