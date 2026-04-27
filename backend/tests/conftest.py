"""
Shared fixtures for all backend tests.
Uses an in-memory SQLite database — no production data is touched.
"""
import os
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("SMTP_HOST", "")
os.environ.setdefault("SMTP_USER", "")
os.environ.setdefault("SMTP_PASS", "")
os.environ.setdefault("ONEMIN_API_KEY", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User, ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_FLOOR_STAFF
from app.models import SKU, StockLevel, Alert
from app.core.security import hash_password, create_access_token

# ── In-memory database ────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///:memory:"

# StaticPool ensures all sessions share the same in-memory connection,
# so tables created in setup_db are visible to subsequent requests.
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Raw DB session for direct data setup."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=True)


def _create_user(db, email: str, password: str, role: str, full_name: str = "Test User"):
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token_for(user: User) -> str:
    return create_access_token({"sub": user.email, "role": user.role})


@pytest.fixture
def admin_user(db):
    return _create_user(db, "admin@test.com", "password123", ROLE_ADMIN, "Admin User")


@pytest.fixture
def manager_user(db):
    return _create_user(db, "manager@test.com", "password123", ROLE_STORE_MANAGER, "Manager User")


@pytest.fixture
def floor_user(db):
    return _create_user(db, "floor@test.com", "password123", ROLE_FLOOR_STAFF, "Floor User")


@pytest.fixture
def admin_headers(admin_user):
    return {"Authorization": f"Bearer {_token_for(admin_user)}"}


@pytest.fixture
def manager_headers(manager_user):
    return {"Authorization": f"Bearer {_token_for(manager_user)}"}


@pytest.fixture
def floor_headers(floor_user):
    return {"Authorization": f"Bearer {_token_for(floor_user)}"}


def make_sku(db, sku_code="SKU-001", name="Test Milk", category="Dairy",
             unit="litre", on_hand=50.0, reorder_point=10.0, unit_cost=1.20,
             max_stock=None) -> SKU:
    sku = SKU(
        sku_code=sku_code,
        name=name,
        category=category,
        unit=unit,
        reorder_point=reorder_point,
        reorder_qty=20.0,
        supplier_name="Test Supplier",
        supplier_email="supplier@test.com",
        unit_cost=unit_cost,
        max_stock=max_stock,
    )
    db.add(sku)
    db.flush()
    stock = StockLevel(sku_id=sku.id, on_hand=on_hand)
    db.add(stock)
    db.commit()
    db.refresh(sku)
    return sku
