import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.models import AuthSession, User
from app.services.auth import get_active_session, verify_csrf_token

DatabaseSession = Annotated[Session, Depends(get_db)]

Authentication = tuple[AuthSession, User]


def get_current_authentication(
    request: Request,
    db: DatabaseSession,
) -> Authentication:
    settings = get_settings()
    session_token = request.cookies.get(settings.session_cookie_name)

    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    authentication = get_active_session(db, session_token)

    if authentication is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    return authentication


def get_current_user(
    authentication: Annotated[
        Authentication,
        Depends(get_current_authentication),
    ],
) -> User:
    return authentication[1]


def require_csrf(
    request: Request,
    authentication: Annotated[
        Authentication,
        Depends(get_current_authentication),
    ],
) -> None:
    settings = get_settings()

    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    csrf_header = request.headers.get("X-CSRF-Token")
    auth_session, _ = authentication

    if (
        not csrf_cookie
        or not csrf_header
        or not secrets.compare_digest(csrf_cookie, csrf_header)
        or not verify_csrf_token(auth_session, csrf_header)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )
