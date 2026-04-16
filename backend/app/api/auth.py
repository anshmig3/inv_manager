from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, NotificationPreference, ROLE_ADMIN, ROLE_STORE_MANAGER, ALL_ROLES
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserOut, UserCreate, UserUpdate,
    PasswordChange, NotificationPrefOut, NotificationPrefUpdate,
)
from app.core.security import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_roles,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
users_router = APIRouter(prefix="/api/users", tags=["users"])

CHANNELS = ["in_app", "email", "sms"]
SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def _default_prefs(user_id: int) -> List[NotificationPreference]:
    prefs = []
    for channel in CHANNELS:
        for severity in SEVERITIES:
            prefs.append(NotificationPreference(
                user_id=user_id,
                channel=channel,
                severity=severity,
                enabled=True,
                quiet_hours_start=22 if channel == "sms" else None,
                quiet_hours_end=7 if channel == "sms" else None,
                override_quiet_for_critical=True,
                digest_frequency="realtime",
            ))
    return prefs


# ── Auth endpoints ──────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Check lockout
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked until {user.locked_until.strftime('%H:%M UTC')}. Too many failed attempts.",
        )

    if not verify_password(body.password, user.hashed_password):
        user.failed_login_count = (user.failed_login_count or 0) + 1
        if user.failed_login_count >= 3:
            from datetime import timedelta
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            user.failed_login_count = 0
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Successful login
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.email, "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/change-password", status_code=204)
def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()


# ── User management (Admin only) ────────────────────────────────────────────

@users_router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    return db.query(User).order_by(User.full_name).all()


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ROLE_ADMIN)),
):
    if body.role not in ALL_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ALL_ROLES}")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        department=body.department,
    )
    db.add(user)
    db.flush()
    for pref in _default_prefs(user.id):
        db.add(pref)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@users_router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ROLE_ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        if body.role not in ALL_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role")
        user.role = body.role
    if body.department is not None:
        user.department = body.department
    if body.is_active is not None:
        user.is_active = body.is_active
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


# ── Notification preferences ────────────────────────────────────────────────

@users_router.get("/me/notification-preferences", response_model=List[NotificationPrefOut])
def get_my_prefs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).all()
    # Auto-create defaults if missing
    if not prefs:
        for pref in _default_prefs(current_user.id):
            db.add(pref)
        db.commit()
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).all()
    return prefs


@users_router.patch("/me/notification-preferences/{pref_id}", response_model=NotificationPrefOut)
def update_pref(
    pref_id: int,
    body: NotificationPrefUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.id == pref_id,
        NotificationPreference.user_id == current_user.id,
    ).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(pref, field, value)
    db.commit()
    db.refresh(pref)
    return pref
