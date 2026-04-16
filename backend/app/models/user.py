from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

# Role constants
ROLE_ADMIN = "ADMIN"
ROLE_STORE_MANAGER = "STORE_MANAGER"
ROLE_DEPT_HEAD = "DEPT_HEAD"
ROLE_FLOOR_STAFF = "FLOOR_STAFF"
ROLE_READ_ONLY = "READ_ONLY"

ALL_ROLES = [ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD, ROLE_FLOOR_STAFF, ROLE_READ_ONLY]


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default=ROLE_FLOOR_STAFF)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    notification_prefs: Mapped[List["NotificationPreference"]] = relationship(
        "NotificationPreference", back_populates="user", cascade="all, delete-orphan"
    )


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    channel: Mapped[str] = mapped_column(String(20))          # in_app | email | sms
    severity: Mapped[str] = mapped_column(String(20))         # CRITICAL | HIGH | MEDIUM | LOW
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    quiet_hours_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # 0–23
    quiet_hours_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)     # 0–23
    override_quiet_for_critical: Mapped[bool] = mapped_column(Boolean, default=True)
    digest_frequency: Mapped[str] = mapped_column(String(20), default="realtime")     # realtime | hourly | daily

    user: Mapped["User"] = relationship("User", back_populates="notification_prefs")
