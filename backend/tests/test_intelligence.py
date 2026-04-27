"""Tests for Phase 3 intelligence endpoints."""
import pytest
from tests.conftest import make_sku


# ══════════════════════════════════════════════════════════════════════════════
# ANOMALY SCAN
# ══════════════════════════════════════════════════════════════════════════════

def test_anomaly_scan_returns_structured_result(client, db, manager_headers):
    make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    res = client.post("/api/anomaly/scan", headers=manager_headers)
    assert res.status_code == 200
    data = res.json()
    assert "anomalies_found" in data
    assert "anomalies" in data
    assert "scanned_at" in data
    assert isinstance(data["anomalies"], list)
    assert isinstance(data["anomalies_found"], int)


def test_anomaly_scan_no_skus_returns_zero(client, manager_headers):
    res = client.post("/api/anomaly/scan", headers=manager_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["anomalies_found"] == 0
    assert data["anomalies"] == []


def test_anomaly_scan_requires_manager(client, floor_headers):
    res = client.post("/api/anomaly/scan", headers=floor_headers)
    assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG
# ══════════════════════════════════════════════════════════════════════════════

def test_audit_log_empty(client, admin_headers):
    res = client.get("/api/audit-log", headers=admin_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_audit_log_populated_after_stock_adjustment(client, db, manager_headers, admin_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    client.post(
        "/api/stock-adjustments",
        json={"sku_id": sku.id, "new_quantity": 40.0, "reason": "Test adjustment"},
        headers=manager_headers,
    )
    res = client.get("/api/audit-log", headers=admin_headers)
    assert res.status_code == 200
    entries = res.json()
    assert len(entries) >= 1
    action_types = [e["action_type"] for e in entries]
    assert "STOCK_ADJUSTMENT" in action_types


def test_audit_log_requires_manager_or_admin(client, floor_headers):
    res = client.get("/api/audit-log", headers=floor_headers)
    assert res.status_code == 403


def test_audit_log_filter_by_action_type(client, db, manager_headers, admin_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    # Stock adjustment → STOCK_ADJUSTMENT audit entry
    client.post(
        "/api/stock-adjustments",
        json={"sku_id": sku.id, "new_quantity": 45.0, "reason": "Filter test"},
        headers=manager_headers,
    )
    # Disposal → DISPOSAL audit entry
    client.post(
        "/api/disposals",
        json={"sku_id": sku.id, "quantity": 2, "reason": "EXPIRED", "method": "BIN"},
        headers=manager_headers,
    )
    res = client.get("/api/audit-log?action_type=STOCK_ADJUSTMENT", headers=admin_headers)
    assert res.status_code == 200
    for entry in res.json():
        assert entry["action_type"] == "STOCK_ADJUSTMENT"


# ══════════════════════════════════════════════════════════════════════════════
# WEEKLY REPORT
# ══════════════════════════════════════════════════════════════════════════════

def test_weekly_report_structure(client, db, manager_headers):
    make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=50.0)
    res = client.get("/api/reports/weekly-performance", headers=manager_headers)
    assert res.status_code == 200
    data = res.json()
    # Verify actual backend keys
    assert "period" in data
    assert "from" in data["period"]
    assert "to" in data["period"]
    assert "stockout_incidents" in data
    assert "total_shrinkage_cost" in data
    assert "alert_resolution_rate_pct" in data
    assert "pos_sent" in data
    assert "pos_overdue" in data


def test_weekly_report_requires_auth(client):
    res = client.get("/api/reports/weekly-performance")
    assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# COST MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def test_update_sku_cost(client, db, admin_headers):
    sku = make_sku(db, "SKU-C", "Cheese", "Dairy", on_hand=20.0, unit_cost=2.50)
    res = client.post(
        f"/api/skus/{sku.id}/cost",
        json={"unit_cost": 2.75, "reason": "Supplier price increase"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["unit_cost"] == pytest.approx(2.75)


def test_cost_history_records_change(client, db, admin_headers):
    sku = make_sku(db, "SKU-C", "Cheese", "Dairy", on_hand=20.0, unit_cost=2.50)
    client.post(
        f"/api/skus/{sku.id}/cost",
        json={"unit_cost": 3.00, "reason": "First increase"},
        headers=admin_headers,
    )
    client.post(
        f"/api/skus/{sku.id}/cost",
        json={"unit_cost": 3.50, "reason": "Second increase"},
        headers=admin_headers,
    )
    res = client.get(f"/api/skus/{sku.id}/cost-history", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_update_cost_floor_staff_forbidden(client, db, floor_headers):
    sku = make_sku(db, "SKU-C", "Cheese", "Dairy", on_hand=20.0, unit_cost=2.50)
    res = client.post(
        f"/api/skus/{sku.id}/cost",
        json={"unit_cost": 3.00, "reason": "Test"},
        headers=floor_headers,
    )
    assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# PURCHASE ORDER WORKFLOW
# ══════════════════════════════════════════════════════════════════════════════

def test_po_approve(client, db, admin_headers):
    sku = make_sku(db, "SKU-P", "Butter", "Dairy", on_hand=5.0)
    create_res = client.post(
        "/api/purchase-orders",
        json={"sku_id": sku.id, "quantity": 50, "notes": ""},
        headers=admin_headers,
    )
    assert create_res.status_code in (200, 201)
    po_id = create_res.json()["id"]
    approve_res = client.post(f"/api/purchase-orders/{po_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    # approve returns {"message": "PO <number> approved"}
    assert "message" in approve_res.json()
    assert "approved" in approve_res.json()["message"].lower()


def test_po_approve_requires_manager(client, floor_headers):
    res = client.post("/api/purchase-orders/1/approve", headers=floor_headers)
    assert res.status_code == 403
