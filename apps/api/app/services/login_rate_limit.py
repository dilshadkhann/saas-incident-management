import hmac
import math
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import LoginAttempt

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOGIN_ATTEMPT_WINDOW = timedelta(minutes=15)


class LoginRateLimitExceeded(Exception):
    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Too many failed login attempts")


def _hash_email(email: str) -> str:
    settings = get_settings()

    return hmac.digest(
        settings.secret_key.encode("utf-8"),
        email.strip().lower().encode("utf-8"),
        "sha256",
    ).hex()


def _utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value


def check_login_rate_limit(
    db: Session,
    email: str,
) -> str:
    email_hash = _hash_email(email)

    # Serialize login attempts for this email, including when no row exists yet.
    lock_key = int.from_bytes(
        bytes.fromhex(email_hash)[:8],
        byteorder="big",
        signed=True,
    )
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {"lock_key": lock_key},
    )

    attempt = db.get(LoginAttempt, email_hash)

    if attempt is None:
        return email_hash

    now = datetime.now(UTC)
    window_started_at = _utc_datetime(attempt.window_started_at)

    if now - window_started_at >= LOGIN_ATTEMPT_WINDOW:
        attempt.window_started_at = now
        attempt.failed_attempts = 0
        return email_hash

    if attempt.failed_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
        window_expires_at = window_started_at + LOGIN_ATTEMPT_WINDOW
        retry_after = max(
            1,
            math.ceil((window_expires_at - now).total_seconds()),
        )
        raise LoginRateLimitExceeded(retry_after)

    return email_hash


def record_failed_login_attempt(
    db: Session,
    email_hash: str,
) -> None:
    now = datetime.now(UTC)
    attempt = db.get(LoginAttempt, email_hash)

    if attempt is None:
        attempt = LoginAttempt(
            email_hash=email_hash,
            window_started_at=now,
            failed_attempts=1,
        )
        db.add(attempt)
    else:
        window_started_at = _utc_datetime(attempt.window_started_at)

        if now - window_started_at >= LOGIN_ATTEMPT_WINDOW:
            attempt.window_started_at = now
            attempt.failed_attempts = 1
        else:
            attempt.failed_attempts += 1

    db.flush()


def clear_failed_login_attempts(
    db: Session,
    email_hash: str,
) -> None:
    db.execute(delete(LoginAttempt).where(LoginAttempt.email_hash == email_hash))
