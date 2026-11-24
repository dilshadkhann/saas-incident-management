from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

IncidentSeverity = Literal["SEV1", "SEV2", "SEV3", "SEV4"]
IncidentStatus = Literal["investigating", "identified", "monitoring", "resolved"]


class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    service_id: UUID
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    severity: IncidentSeverity
    assignee_id: UUID | None = None
    detected_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Incident title cannot be blank.")
        return value


class IncidentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    service_id: UUID | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    assignee_id: UUID | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Incident title cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_nonempty(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    organization_id: UUID
    service_id: UUID
    assignee_id: UUID | None
    title: str
    description: str | None
    severity: IncidentSeverity
    status: IncidentStatus
    detected_at: datetime
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
