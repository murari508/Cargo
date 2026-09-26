from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

PHONE_RE = r"^[6-9]\d{9}$"


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(pattern=PHONE_RE, description="10 digit Indian mobile number")
    password: str = Field(min_length=8, max_length=72)
    preferred_language: Literal["en", "te", "hi", "auto"] = "auto"

    @field_validator("password")
    @classmethod
    def strong_enough(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must mix letters and numbers")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, pattern=PHONE_RE)
    preferred_language: Optional[Literal["en", "te", "hi", "auto"]] = None
    voice_response: Optional[bool] = None
    voice_speed: Optional[Literal["slow", "normal", "fast"]] = None


class UserOut(BaseModel):
    # password_hash is deliberately absent - it is never serialised
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str
    role: UserRole
    preferred_language: str
    voice_response: bool
    voice_speed: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)
