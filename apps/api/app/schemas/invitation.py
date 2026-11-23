from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

InvitationRole = Literal["admin", "responder", "viewer"]


class InvitationCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    role: InvitationRole

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()

        if "@" not in value or value.startswith("@") or value.endswith("@") or " " in value:
            raise ValueError("A valid email address is required.")

        return value


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    invited_by: UUID
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime


class InvitationCreatedResponse(InvitationResponse):
    token: str


class InvitationAcceptedResponse(BaseModel):
    organization_id: UUID
    role: str
    message: str
