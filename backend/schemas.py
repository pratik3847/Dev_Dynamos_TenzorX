from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def _parse_csv(value: Any) -> Optional[List[str]]:
    if value is None:
        return None
    if isinstance(value, str):
        items = [v.strip().lower() for v in value.split(",")]
        return [v for v in items if v]
    if isinstance(value, list):
        merged: List[str] = []
        for item in value:
            if item is None:
                continue
            if isinstance(item, str):
                merged.extend([v.strip().lower() for v in item.split(",")])
            else:
                merged.append(str(item).strip().lower())
        return [v for v in merged if v]
    return None


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    budget_pref: Optional[float] = None

    @field_validator("allergies", "conditions", "medications", mode="before")
    @classmethod
    def parse_arrays(cls, value: Any) -> Optional[List[str]]:
        return _parse_csv(value)

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    budget_pref: Optional[float] = None

    @field_validator("allergies", "conditions", "medications", mode="before")
    @classmethod
    def parse_arrays(cls, value: Any) -> Optional[List[str]]:
        return _parse_csv(value)


class UserResponse(BaseModel):
    user_id: UUID
    name: str
    email: EmailStr
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: List[str] = Field(default_factory=list)
    comorbidities: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    budget_pref: Optional[float] = None
    search_history: List[dict] = Field(default_factory=list)
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
