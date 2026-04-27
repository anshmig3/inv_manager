"""Tests for Phase 2 operations endpoints."""
import pytest
from tests.conftest import make_sku


# ══════════════════════════════════════════════════════════════════════════════
# STOCK ADJUSTMENTS
# ══════════════════════════════════════════════════════════════════════════════

def test_stock_adjustment_updates_on_hand(client, db, manager_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    res = client.post(
        "/api/stock-adjustments",
        json={"sku_id": sku.id, "new_quantity": 35.0, "reason": "Cycle count correction"},
        headers=manager_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["before_qty"] == 50.0
    assert data["after_qty"] == 35.0
    assert data["delta"] == pytest.approx(-15.0)


def test_stock_adjustment_requires_auth(client, db):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    res = client.post(
        "/api/stock-adjustments",
        json={"sku_id": sku.id, "new_quantity": 10.0, "reason": "Test"},
    )
    assert res.status_code == 401


def test_stock_adjustment_sku_not_found(client, manager_headers):
    res = client.post(
        "/api/stock-adjustments",
        json={"sku_id": 99999, "new_quantity": 10.0, "reason": "Test"},
        headers=manager_headers,
    )
    assert res.status_code == 404


def test_stock_adjustment_history(client, db, manager_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    client.post(
        "/api/stock-adjustments",
        json={"sku_id": sku.id, "new_quantity": 40.0, "reason": "First adjustment"},
        headers=manager_headers,
    )
    client.post(
        "/api/stock-adjustments",
        json={"sku_id": sku.id, "new_quantity": 30.0, "reason": "Second adjustment"},
        headers=manager_headers,
    )
    res = client.get(f"/api/stock-adjustments/sku/{sku.id}", headers=manager_headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


# ══════════════════════════════════════════════════════════════════════════════
# DISPOSALS
# ══════════════════════════════════════════════════════════════════════════════

def test_create_disposal_below_threshold_auto_completes(client, db, manager_headers):
    # unit_cost=1.0, quantity=10 → £10 < £50 threshold → auto-COMPLETED
    sku = make_sku(db, "SKU-D", "Yoghurt", "Dairy", on_hand=50.0, unit_cost=1.0)
    res = client.post(
        "/api/disposals",
        json={"sku_id": sku.id, "quantity": 10, "reason": "EXPIRED", "method": "BIN"},
        headers=manager_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "COMPLETED"


def test_create_disposal_above_threshold_requires_approval(client, db, manager_headers):
    # unit_cost=10.0, quantity=10 → £100 > £50 → PENDING_APPROVAL
    sku = make_sku(db, "SKU-E", "Premium Beef", "Meat", on_hand=50.0, unit_cost=10.0)
    res = client.post(
        "/api/disposals",
        json={"sku_id": sku.id, "quantity": 10, "reason": "DAMAGED", "method": "BIN"},
        headers=manager_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "PENDING_APPROVAL"


def test_list_disposals(client, db, manager_headers):
    sku = make_sku(db, "SKU-D", "Milk", "Dairy", on_hand=50.0, unit_cost=1.0)
    client.post(
        "/api/disposals",
        json={"sku_id": sku.id, "quantity": 5, "reason": "EXPIRED", "method": "BIN"},
        headers=manager_headers,
    )
    res = client.get("/api/disposals", headers=manager_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_approve_disposal(client, db, admin_headers):
    # Create an expensive disposal that needs approval
    sku = make_sku(db, "SKU-P", "Steak", "Meat", on_hand=50.0, unit_cost=20.0)
    create_res = client.post(
        "/api/disposals",
        json={"sku_id": sku.id, "quantity": 10, "reason": "DAMAGED", "method": "BIN"},
        headers=admin_headers,
    )
    assert create_res.json()["status"] == "PENDING_APPROVAL"
    disposal_id = create_res.json()["id"]
    approve_res = client.post(f"/api/disposals/{disposal_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    # approve returns {"message": "Disposal approved"}
    assert "message" in approve_res.json()


# ══════════════════════════════════════════════════════════════════════════════
# STOCK TRANSFERS
# ══════════════════════════════════════════════════════════════════════════════

def test_create_transfer(client, db, manager_headers):
    # Transfers require DEPT_HEAD or above — use manager
    sku = make_sku(db, "SKU-T", "Bread", "Bakery", on_hand=30.0)
    res = client.post(
        "/api/transfers",
        json={
            "sku_id": sku.id,
            "from_department": "Bakery",
            "to_department": "Deli",
            "quantity": 5,
            "reason": "Demand shift",
        },
        headers=manager_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PENDING"
    assert data["from_department"] == "Bakery"


def test_floor_staff_cannot_create_transfer(client, db, floor_headers):
    sku = make_sku(db, "SKU-T", "Bread", "Bakery", on_hand=30.0)
    res = client.post(
        "/api/transfers",
        json={"sku_id": sku.id, "from_department": "Bakery", "to_department": "Deli", "quantity": 2},
        headers=floor_headers,
    )
    assert res.status_code == 403


def test_approve_transfer(client, db, manager_headers):
    sku = make_sku(db, "SKU-T", "Bread", "Bakery", on_hand=30.0)
    create_res = client.post(
        "/api/transfers",
        json={"sku_id": sku.id, "from_department": "Bakery", "to_department": "Cafe", "quantity": 3},
        headers=manager_headers,
    )
    assert create_res.status_code == 200
    tid = create_res.json()["id"]
    approve_res = client.post(f"/api/transfers/{tid}/approve", headers=manager_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"


def test_complete_transfer(client, db, manager_headers):
    sku = make_sku(db, "SKU-T", "Bread", "Bakery", on_hand=30.0)
    create_res = client.post(
        "/api/transfers",
        json={"sku_id": sku.id, "from_department": "Bakery", "to_department": "Cafe", "quantity": 3},
        headers=manager_headers,
    )
    tid = create_res.json()["id"]
    client.post(f"/api/transfers/{tid}/approve", headers=manager_headers)
    complete_res = client.post(f"/api/transfers/{tid}/complete", headers=manager_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"


def test_list_transfers(client, db, manager_headers):
    sku = make_sku(db, "SKU-T", "Bread", "Bakery", on_hand=30.0)
    client.post(
        "/api/transfers",
        json={"sku_id": sku.id, "from_department": "Bakery", "to_department": "Deli", "quantity": 2},
        headers=manager_headers,
    )
    res = client.get("/api/transfers", headers=manager_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


# ══════════════════════════════════════════════════════════════════════════════
# SUPPLIERS
# ══════════════════════════════════════════════════════════════════════════════

def test_create_supplier(client, admin_headers):
    res = client.post(
        "/api/suppliers",
        json={"name": "FreshFarm Ltd", "email": "orders@freshfarm.com", "contact_name": "Jane"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == "FreshFarm Ltd"


def test_list_suppliers(client, admin_headers):
    client.post("/api/suppliers", json={"name": "Supplier A", "email": "a@a.com"}, headers=admin_headers)
    client.post("/api/suppliers", json={"name": "Supplier B", "email": "b@b.com"}, headers=admin_headers)
    res = client.get("/api/suppliers", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 2


def test_deactivate_supplier(client, admin_headers):
    create_res = client.post(
        "/api/suppliers",
        json={"name": "To Deactivate", "email": "x@x.com"},
        headers=admin_headers,
    )
    sid = create_res.json()["id"]
    patch_res = client.patch(f"/api/suppliers/{sid}", json={"is_active": False}, headers=admin_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False


def test_floor_staff_cannot_create_supplier(client, floor_headers):
    res = client.post(
        "/api/suppliers",
        json={"name": "X", "email": "x@x.com"},
        headers=floor_headers,
    )
    assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# DELIVERY CALENDAR
# ══════════════════════════════════════════════════════════════════════════════

def test_delivery_calendar_empty(client, admin_headers):
    res = client.get(
        "/api/deliveries/calendar?date_from=2026-04-01&date_to=2026-04-14",
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "calendar" in data
    assert "total_deliveries" in data
    assert data["total_deliveries"] == 0
