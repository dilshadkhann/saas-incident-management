from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    email_hash: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    window_started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    failed_attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    __table_args__ = (
        CheckConstraint(
            "failed_attempts >= 0",
            name="failed_attempts_nonnegative",
        ),
        Index("ix_login_attempts_window_started_at", "window_started_at"),
    )
