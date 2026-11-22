from typing import Annotated
from urllib.parse import urlsplit

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import (
    get_current_authentication,
    get_current_user,
    require_csrf,
)
from app.api.dependencies.database import get_db
from app.core.config import get_settings
from app.models import AuthSession, User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services.auth import (
    AuthenticationFailed,
    EmailAlreadyRegistered,
    authenticate_user,
    create_session,
    register_user,
    revoke_session,
)
from app.services.login_rate_limit import (
    LoginRateLimitExceeded,
    check_login_rate_limit,
    clear_failed_login_attempts,
    record_failed_login_attempt,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

DatabaseSession = Annotated[Session, Depends(get_db)]


def validate_origin(request: Request) -> None:
    settings = get_settings()
    origin = request.headers.get("origin")

    if origin is None:
        referer = request.headers.get("referer")

        if referer is None:
            return

        parsed_referer = urlsplit(referer)
        origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"

    if origin not in settings.cors_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request origin is not allowed",
        )


def set_auth_cookies(
    response: Response,
    *,
    session_token: str,
    csrf_token: str,
    max_age: int,
) -> None:
    settings = get_settings()

    cookie_options = {
        "max_age": max_age,
        "path": "/",
        "secure": settings.session_cookie_secure,
        "samesite": settings.session_cookie_samesite,
    }

    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=True,
        **cookie_options,
    )

    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        **cookie_options,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    request: Request,
    db: DatabaseSession,
) -> User:
    validate_origin(request)

    try:
        user = register_user(
            db,
            name=payload.name,
            email=str(payload.email),
            password=payload.password,
        )
        db.commit()
        db.refresh(user)
    except EmailAlreadyRegistered as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from exc
    except IntegrityError as exc:
        db.rollback()

        existing_user = db.scalar(select(User).where(User.email == str(payload.email)))

        if existing_user is None:
            raise

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from exc

    return user


@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DatabaseSession,
) -> User:
    validate_origin(request)

    try:
        email_hash = check_login_rate_limit(db, str(payload.email))
    except LoginRateLimitExceeded as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    try:
        user = authenticate_user(
            db,
            email=str(payload.email),
            password=payload.password,
        )
    except AuthenticationFailed as exc:
        record_failed_login_attempt(db, email_hash)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from exc

    clear_failed_login_attempts(db, email_hash)
    credentials = create_session(db, user)
    db.commit()

    settings = get_settings()
    set_auth_cookies(
        response,
        session_token=credentials.session_token,
        csrf_token=credentials.csrf_token,
        max_age=settings.session_ttl_hours * 60 * 60,
    )

    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DatabaseSession,
    authentication: Annotated[
        tuple[AuthSession, User],
        Depends(get_current_authentication),
    ],
    _: Annotated[None, Depends(require_csrf)],
) -> None:
    auth_session, _ = authentication

    revoke_session(db, auth_session)
    db.commit()

    settings = get_settings()

    cookie_options = {
        "path": "/",
        "secure": settings.session_cookie_secure,
        "samesite": settings.session_cookie_samesite,
    }

    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        **cookie_options,
    )
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        httponly=False,
        **cookie_options,
    )


@router.get("/me", response_model=UserResponse)
def current_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    return user
