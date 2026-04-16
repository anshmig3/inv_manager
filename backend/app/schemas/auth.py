from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str
    department: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class NotificationPrefOut(BaseModel):
    id: int
    channel: str
    severity: str
    enabled: bool
    quiet_hours_start: Optional[int]
    quiet_hours_end: Optional[int]
    override_quiet_for_critical: bool
    digest_frequency: str

    model_config = {"from_attributes": True}


class NotificationPrefUpdate(BaseModel):
    enabled: Optional[bool] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None
    override_quiet_for_critical: Optional[bool] = None
    digest_frequency: Optional[str] = None


TokenResponse.model_rebuild()
