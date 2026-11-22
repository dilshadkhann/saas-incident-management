import hmac
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models import AuthSession, User


class EmailAlreadyRegistered(Exception):
    pass


class AuthenticationFailed(Exception):
    pass


@dataclass(frozen=True)
class SessionCredentials:
    session_token: str
    csrf_token: str
    expires_at: datetime


def register_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
) -> User:
    normalized_email = email.strip().lower()

    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise EmailAlreadyRegistered

    user = User(
        full_name=name.strip(),
        email=normalized_email,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.flush()

    return user


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
) -> User:
    normalized_email = email.strip().lower()

    user = db.scalar(select(User).where(User.email == normalized_email))

    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise AuthenticationFailed

    return user


def create_session(
    db: Session,
    user: User,
) -> SessionCredentials:
    settings = get_settings()

    session_token = generate_token()
    csrf_token = generate_token()
    expires_at = datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours)

    auth_session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(session_token),
        csrf_token_hash=hash_token(csrf_token),
        expires_at=expires_at,
    )
    db.add(auth_session)
    db.flush()

    return SessionCredentials(
        session_token=session_token,
        csrf_token=csrf_token,
        expires_at=expires_at,
    )


def get_active_session(
    db: Session,
    session_token: str,
) -> tuple[AuthSession, User] | None:
    auth_session = db.scalar(
        select(AuthSession).where(AuthSession.token_hash == hash_token(session_token))
    )

    if auth_session is None:
        return None

    now = datetime.now(UTC)
    expires_at = auth_session.expires_at

    # PostgreSQL returns timezone-aware timestamps. This fallback also
    # supports databases that return naive UTC timestamps in tests.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    if auth_session.revoked_at is not None or expires_at <= now:
        return None

    user = db.get(User, auth_session.user_id)

    if user is None or not user.is_active:
        return None

    return auth_session, user


def revoke_session(
    db: Session,
    auth_session: AuthSession,
) -> None:
    if auth_session.revoked_at is None:
        auth_session.revoked_at = datetime.now(UTC)
        db.flush()


def verify_csrf_token(
    auth_session: AuthSession,
    csrf_token: str,
) -> bool:
    return hmac.compare_digest(
        hash_token(csrf_token),
        auth_session.csrf_token_hash,
    )
