"""Tests for alert endpoints."""
import pytest
from app.models import Alert, SKU, StockLevel
from app.models.alert import ALERT_OPEN, ALERT_ACKNOWLEDGED, ALERT_RESOLVED
from tests.conftest import make_sku


def _make_alert(db, sku: SKU, alert_type="LOW_STOCK", severity="HIGH", status=ALERT_OPEN) -> Alert:
    alert = Alert(
        sku_id=sku.id,
        alert_type=alert_type,
        severity=severity,
        message=f"{alert_type} for {sku.name}",
        status=status,
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def test_list_alerts_empty(client, admin_headers):
    res = client.get("/api/alerts", headers=admin_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_list_alerts_returns_open(client, db, admin_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=5.0)
    _make_alert(db, sku, "LOW_STOCK", "HIGH")
    res = client.get("/api/alerts", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["alert_type"] == "LOW_STOCK"


def test_list_alerts_filter_by_status(client, db, admin_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=5.0)
    _make_alert(db, sku, "LOW_STOCK", status=ALERT_OPEN)
    _make_alert(db, sku, "EXPIRY", status=ALERT_ACKNOWLEDGED)
    res_open = client.get("/api/alerts?status=OPEN", headers=admin_headers)
    assert len(res_open.json()) == 1
    assert res_open.json()[0]["alert_type"] == "LOW_STOCK"


def test_acknowledge_alert(client, db, manager_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=5.0)
    alert = _make_alert(db, sku)
    res = client.post(
        f"/api/alerts/{alert.id}/acknowledge",
        json={"note": "Noted"},
        headers=manager_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == ALERT_ACKNOWLEDGED


def test_resolve_alert(client, db, manager_headers):
    sku = make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=5.0)
    alert = _make_alert(db, sku)
    res = client.post(
        f"/api/alerts/{alert.id}/resolve",
        json={"resolution_action": "Restocked"},
        headers=manager_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == ALERT_RESOLVED


def test_acknowledge_alert_not_found(client, manager_headers):
    res = client.post("/api/alerts/99999/acknowledge", json={}, headers=manager_headers)
    assert res.status_code == 404


def test_floor_staff_cannot_trigger_scan(client, floor_headers):
    res = client.post("/api/alerts/scan", headers=floor_headers)
    assert res.status_code == 403


def test_manager_can_trigger_scan(client, db, manager_headers):
    make_sku(db, "SKU-A", "Milk", "Dairy", on_hand=5.0, reorder_point=10.0)
    res = client.post("/api/alerts/scan", headers=manager_headers)
    assert res.status_code == 202
