"""Tests for SKU endpoints."""
import pytest
from datetime import datetime, timedelta
from tests.conftest import make_sku
from app.models import SalesHistory


def _add_sales(db, sku_id: int, units_per_day: float, days: int = 30):
    """Insert sales history so days_of_supply is meaningful."""
    today = datetime.utcnow()
    for i in range(days):
        day = today - timedelta(days=i + 1)
        db.add(SalesHistory(sku_id=sku_id, sale_date=day, units_sold=units_per_day))
    db.commit()


def test_list_skus_empty(client, admin_headers):
    res = client.get("/api/skus", headers=admin_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_list_skus_returns_cards(client, db, admin_headers):
    make_sku(db, "SKU-A", "Full Cream Milk", "Dairy", on_hand=50.0)
    make_sku(db, "SKU-B", "Bread White", "Bakery", on_hand=20.0)
    res = client.get("/api/skus", headers=admin_headers)
    assert res.status_code == 200
    names = [s["name"] for s in res.json()]
    assert "Full Cream Milk" in names
    assert "Bread White" in names


def test_list_skus_filter_category(client, db, admin_headers):
    make_sku(db, "SKU-D", "Cheese", "Dairy", on_hand=10.0)
    make_sku(db, "SKU-B", "Bread", "Bakery", on_hand=10.0)
    res = client.get("/api/skus?category=Dairy", headers=admin_headers)
    assert res.status_code == 200
    names = [s["name"] for s in res.json()]
    assert "Cheese" in names
    assert "Bread" not in names


def test_list_skus_search(client, db, admin_headers):
    make_sku(db, "SKU-M", "Semi-Skimmed Milk", "Dairy", on_hand=30.0)
    make_sku(db, "SKU-J", "Orange Juice", "Drinks", on_hand=15.0)
    res = client.get("/api/skus?search=milk", headers=admin_headers)
    assert res.status_code == 200
    names = [s["name"] for s in res.json()]
    assert any("Milk" in n for n in names)
    assert "Orange Juice" not in names


def test_get_sku_detail(client, db, admin_headers):
    sku = make_sku(db, "SKU-X", "Yoghurt", "Dairy", on_hand=25.0)
    res = client.get(f"/api/skus/{sku.id}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Yoghurt"
    # on_hand is nested under 'stock'
    assert data["stock"]["on_hand"] == 25.0


def test_get_sku_detail_not_found(client, admin_headers):
    res = client.get("/api/skus/99999", headers=admin_headers)
    assert res.status_code == 404


def test_list_categories(client, db, admin_headers):
    make_sku(db, "SKU-1", "Milk", "Dairy", on_hand=10.0)
    make_sku(db, "SKU-2", "Bread", "Bakery", on_hand=10.0)
    res = client.get("/api/skus/categories", headers=admin_headers)
    assert res.status_code == 200
    cats = res.json()
    assert "Dairy" in cats
    assert "Bakery" in cats


def test_sku_status_critical_with_sales_history(client, db, admin_headers):
    # on_hand=2, reorder_point=10, selling 5/day → days_of_supply = 0.4 → CRITICAL
    sku = make_sku(db, "SKU-LOW", "Low Stock Item", "Grocery", on_hand=2.0, reorder_point=10.0)
    _add_sales(db, sku.id, units_per_day=5.0, days=30)
    res = client.get("/api/skus", headers=admin_headers)
    assert res.status_code == 200
    item = next(s for s in res.json() if s["name"] == "Low Stock Item")
    assert item["card_status"] in ("CRITICAL", "WARNING")


def test_sku_healthy_when_well_stocked(client, db, admin_headers):
    # on_hand=100, reorder_point=10, selling 1/day → days_of_supply=100 → HEALTHY
    sku = make_sku(db, "SKU-OK", "Well Stocked", "Grocery", on_hand=100.0, reorder_point=10.0)
    _add_sales(db, sku.id, units_per_day=1.0, days=30)
    res = client.get("/api/skus", headers=admin_headers)
    assert res.status_code == 200
    item = next(s for s in res.json() if s["name"] == "Well Stocked")
    assert item["card_status"] == "HEALTHY"


def test_sku_no_sales_history_is_healthy(client, db, admin_headers):
    # Without sales history, daily_avg=0 so days_of_supply is treated as infinite → HEALTHY
    make_sku(db, "SKU-NS", "No Sales SKU", "Grocery", on_hand=5.0, reorder_point=10.0)
    res = client.get("/api/skus", headers=admin_headers)
    assert res.status_code == 200
    item = next(s for s in res.json() if s["name"] == "No Sales SKU")
    assert item["card_status"] == "HEALTHY"
