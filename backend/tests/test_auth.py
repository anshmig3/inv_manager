"""Tests for authentication endpoints."""
import pytest
from tests.conftest import _create_user


def test_login_success(client, db):
    _create_user(db, "alice@test.com", "secret123", "ADMIN")
    res = client.post("/api/auth/login", json={"email": "alice@test.com", "password": "secret123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@test.com"
    assert data["user"]["role"] == "ADMIN"


def test_login_wrong_password(client, db):
    _create_user(db, "alice@test.com", "secret123", "ADMIN")
    res = client.post("/api/auth/login", json={"email": "alice@test.com", "password": "wrong"})
    assert res.status_code == 401


def test_login_unknown_email(client):
    res = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "x"})
    assert res.status_code == 401


def test_login_inactive_user(client, db):
    from app.models.user import User
    from app.core.security import hash_password
    user = User(email="inactive@test.com", full_name="X", hashed_password=hash_password("p"), role="ADMIN", is_active=False)
    db.add(user); db.commit()
    res = client.post("/api/auth/login", json={"email": "inactive@test.com", "password": "p"})
    assert res.status_code == 401


def test_me_returns_profile(client, admin_user, admin_headers):
    res = client.get("/api/auth/me", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "admin@test.com"


def test_me_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_account_lockout_after_three_failures(client, db):
    _create_user(db, "bob@test.com", "correct", "FLOOR_STAFF")
    for _ in range(3):
        client.post("/api/auth/login", json={"email": "bob@test.com", "password": "wrong"})
    # 4th attempt — should be locked
    res = client.post("/api/auth/login", json={"email": "bob@test.com", "password": "correct"})
    assert res.status_code == 403
    assert "locked" in res.json()["detail"].lower()
