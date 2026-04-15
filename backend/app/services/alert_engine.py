"""
Alert engine — scans all SKUs and creates/resolves alerts.
Runs on startup and on a configurable schedule.
"""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models import SKU, Alert, Promotion
from app.database import SessionLocal

EXPIRY_WARNING_DAYS = 7
EXPIRY_CRITICAL_DAYS = 3


def _upsert_alert(db: Session, sku_id: int, alert_type: str, severity: str, message: str):
    existing = db.query(Alert).filter(
        Alert.sku_id == sku_id,
        Alert.alert_type == alert_type,
        Alert.is_active == True,
    ).first()
    if existing:
        existing.message = message
        existing.severity = severity
    else:
        db.add(Alert(sku_id=sku_id, alert_type=alert_type, severity=severity, message=message))


def _resolve_alert(db: Session, sku_id: int, alert_type: str):
    from datetime import datetime
    db.query(Alert).filter(
        Alert.sku_id == sku_id,
        Alert.alert_type == alert_type,
        Alert.is_active == True,
    ).update({"is_active": False, "resolved_at": datetime.utcnow()})


def run_alert_scan(db: Optional[Session] = None):
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        skus = db.query(SKU).all()
        today = date.today()

        for sku in skus:
            stock = sku.stock
            on_hand = stock.on_hand if stock else 0.0

            # --- Stockout ---
            if on_hand <= 0:
                _upsert_alert(db, sku.id, "STOCKOUT", "CRITICAL",
                              f"{sku.name} is out of stock (0 {sku.unit} on hand).")
            else:
                _resolve_alert(db, sku.id, "STOCKOUT")

            # --- Low stock ---
            if 0 < on_hand <= sku.reorder_point:
                from app.services.inventory_monitor import _daily_avg, _compute_dos
                dos = _compute_dos(on_hand, _daily_avg(db, sku.id))
                severity = "HIGH" if dos <= 1 else "MEDIUM"
                _upsert_alert(db, sku.id, "LOW_STOCK", severity,
                              f"{sku.name} is low: {on_hand} {sku.unit} on hand ({dos} days of supply).")
            else:
                _resolve_alert(db, sku.id, "LOW_STOCK")

            # --- Near expiry ---
            from app.models import ExpiryBatch
            batches = db.query(ExpiryBatch).filter(
                ExpiryBatch.sku_id == sku.id,
                ExpiryBatch.expiry_date >= today,
                ExpiryBatch.disposed == False,
                ExpiryBatch.quantity > 0,
            ).order_by(ExpiryBatch.expiry_date.asc()).all()

            near = [b for b in batches if (b.expiry_date - today).days <= EXPIRY_WARNING_DAYS]
            if near:
                nearest = near[0]
                days = (nearest.expiry_date - today).days
                severity = "CRITICAL" if days <= EXPIRY_CRITICAL_DAYS else "HIGH"
                units = sum(b.quantity for b in near)
                _upsert_alert(db, sku.id, "NEAR_EXPIRY", severity,
                              f"{sku.name}: {units} {sku.unit} expiring within {EXPIRY_WARNING_DAYS} days "
                              f"(nearest: {nearest.expiry_date}).")
            else:
                _resolve_alert(db, sku.id, "NEAR_EXPIRY")

            # --- Promo shortfall ---
            promos = db.query(Promotion).filter(
                Promotion.sku_id == sku.id,
                Promotion.start_date <= today + timedelta(days=14),
                Promotion.end_date >= today,
                Promotion.is_active == True,
            ).all()
            if promos and on_hand <= sku.reorder_point:
                promo = promos[0]
                _upsert_alert(db, sku.id, "PROMO_SHORTFALL", "HIGH",
                              f"{sku.name} is on promo '{promo.promo_name}' "
                              f"({promo.start_date} – {promo.end_date}) but stock is low: "
                              f"{on_hand} {sku.unit} on hand.")
            else:
                _resolve_alert(db, sku.id, "PROMO_SHORTFALL")

        db.commit()
    finally:
        if close:
            db.close()
