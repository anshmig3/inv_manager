"""
Core inventory monitoring service.
Computes derived metrics (Days of Supply, card status) and runs the alert engine.
"""
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import SKU, StockLevel, SalesHistory, Alert, Promotion, ExpiryBatch
from app.schemas.sku import (
    SKUCardOut, SKUDetailOut, StockLevelOut, SalesStatsOut,
    PromotionOut, ExpiryBatchOut, AlertOut, DashboardOut,
)

EXPIRY_WARNING_DAYS = 7
EXPIRY_CRITICAL_DAYS = 3


def _daily_avg(db: Session, sku_id: int, days: int = 30) -> float:
    cutoff = datetime.utcnow() - timedelta(days=days)
    total = db.query(func.sum(SalesHistory.units_sold)).filter(
        SalesHistory.sku_id == sku_id,
        SalesHistory.sale_date >= cutoff,
    ).scalar() or 0.0
    return round(total / days, 2)


def _compute_dos(on_hand: float, daily_avg: float) -> float:
    if daily_avg <= 0:
        return 999.0
    return round(on_hand / daily_avg, 1)


def _card_status(on_hand: float, dos: float, active_alerts: list, nearest_expiry_days: int | None) -> str:
    severities = {a.severity for a in active_alerts}
    if "CRITICAL" in severities or on_hand <= 0:
        return "CRITICAL"
    if nearest_expiry_days is not None and nearest_expiry_days <= EXPIRY_CRITICAL_DAYS:
        return "CRITICAL"
    if "HIGH" in severities or dos <= 1.0:
        return "CRITICAL"
    if nearest_expiry_days is not None and nearest_expiry_days <= EXPIRY_WARNING_DAYS:
        return "WARNING"
    if "MEDIUM" in severities or dos <= 3.0:
        return "WARNING"
    if "LOW" in severities or dos <= 5.0:
        return "WATCH"
    return "HEALTHY"


def _active_promos(db: Session, sku_id: int) -> list[Promotion]:
    today = date.today()
    return db.query(Promotion).filter(
        Promotion.sku_id == sku_id,
        Promotion.start_date <= today + timedelta(days=14),
        Promotion.end_date >= today,
        Promotion.is_active == True,
    ).all()


def _active_alerts(db: Session, sku_id: int) -> list[Alert]:
    return db.query(Alert).filter(
        Alert.sku_id == sku_id,
        Alert.is_active == True,
    ).order_by(Alert.created_at.desc()).all()


def _nearest_expiry(db: Session, sku_id: int) -> ExpiryBatch | None:
    today = date.today()
    return db.query(ExpiryBatch).filter(
        ExpiryBatch.sku_id == sku_id,
        ExpiryBatch.expiry_date >= today,
        ExpiryBatch.disposed == False,
        ExpiryBatch.quantity > 0,
    ).order_by(ExpiryBatch.expiry_date.asc()).first()


def get_sku_card(db: Session, sku: SKU) -> SKUCardOut:
    stock = sku.stock
    on_hand = stock.on_hand if stock else 0.0
    on_order = stock.on_order if stock else 0.0
    daily_avg = _daily_avg(db, sku.id)
    dos = _compute_dos(on_hand, daily_avg)

    alerts = _active_alerts(db, sku.id)
    promos = _active_promos(db, sku.id)
    nearest = _nearest_expiry(db, sku.id)
    nearest_expiry_date = nearest.expiry_date if nearest else None
    days_until_expiry = (nearest.expiry_date - date.today()).days if nearest else None

    status = _card_status(on_hand, dos, alerts, days_until_expiry)

    return SKUCardOut(
        id=sku.id,
        sku_code=sku.sku_code,
        name=sku.name,
        category=sku.category,
        unit=sku.unit,
        on_hand=on_hand,
        on_order=on_order,
        days_of_supply=dos,
        reorder_point=sku.reorder_point,
        card_status=status,
        active_alerts=[AlertOut.model_validate(a) for a in alerts],
        has_active_promo=len(promos) > 0,
        nearest_expiry_date=nearest_expiry_date,
        days_until_expiry=days_until_expiry,
    )


def get_sku_detail(db: Session, sku: SKU) -> SKUDetailOut:
    stock = sku.stock
    on_hand = stock.on_hand if stock else 0.0
    on_order = stock.on_order if stock else 0.0

    daily_avg_30 = _daily_avg(db, sku.id, 30)
    daily_avg_7 = _daily_avg(db, sku.id, 7)

    cutoff_30 = datetime.utcnow() - timedelta(days=30)
    monthly = db.query(func.sum(SalesHistory.units_sold)).filter(
        SalesHistory.sku_id == sku.id,
        SalesHistory.sale_date >= cutoff_30,
    ).scalar() or 0.0

    dos = _compute_dos(on_hand, daily_avg_30)
    dos_after = _compute_dos(on_hand + on_order, daily_avg_30)

    alerts = _active_alerts(db, sku.id)
    promos = _active_promos(db, sku.id)

    today = date.today()
    expiry_batches = db.query(ExpiryBatch).filter(
        ExpiryBatch.sku_id == sku.id,
        ExpiryBatch.expiry_date >= today,
        ExpiryBatch.disposed == False,
        ExpiryBatch.quantity > 0,
    ).order_by(ExpiryBatch.expiry_date.asc()).all()

    nearest = expiry_batches[0] if expiry_batches else None
    days_until_expiry = (nearest.expiry_date - today).days if nearest else None
    status = _card_status(on_hand, dos, alerts, days_until_expiry)

    expiry_out = [
        ExpiryBatchOut(
            id=b.id,
            batch_number=b.batch_number,
            quantity=b.quantity,
            expiry_date=b.expiry_date,
            days_until_expiry=(b.expiry_date - today).days,
        )
        for b in expiry_batches
    ]

    return SKUDetailOut(
        id=sku.id,
        sku_code=sku.sku_code,
        name=sku.name,
        category=sku.category,
        unit=sku.unit,
        supplier_name=sku.supplier_name,
        supplier_email=sku.supplier_email,
        lead_time_days=sku.lead_time_days,
        unit_cost=sku.unit_cost,
        reorder_point=sku.reorder_point,
        reorder_qty=sku.reorder_qty,
        stock=StockLevelOut.model_validate(stock) if stock else StockLevelOut(on_hand=0, on_order=0, last_updated=datetime.utcnow()),
        days_of_supply=dos,
        days_of_supply_after_order=dos_after,
        card_status=status,
        sales_stats=SalesStatsOut(
            daily_avg=daily_avg_30,
            weekly_total=round(daily_avg_7 * 7, 1),
            monthly_total=round(monthly, 1),
        ),
        promotions=[PromotionOut.model_validate(p) for p in promos],
        has_active_promo=len(promos) > 0,
        expiry_batches=expiry_out,
        active_alerts=[AlertOut.model_validate(a) for a in alerts],
    )


def get_dashboard(db: Session) -> DashboardOut:
    skus = db.query(SKU).all()
    cards = [get_sku_card(db, s) for s in skus]

    recent_alerts = db.query(Alert).filter(Alert.is_active == True).order_by(
        Alert.created_at.desc()
    ).limit(10).all()

    return DashboardOut(
        total_skus=len(cards),
        critical_count=sum(1 for c in cards if c.card_status == "CRITICAL"),
        warning_count=sum(1 for c in cards if c.card_status == "WARNING"),
        watch_count=sum(1 for c in cards if c.card_status == "WATCH"),
        healthy_count=sum(1 for c in cards if c.card_status == "HEALTHY"),
        stockout_count=sum(1 for c in cards if c.on_hand <= 0),
        low_stock_count=sum(1 for c in cards if 0 < c.on_hand <= c.reorder_point),
        near_expiry_count=sum(1 for c in cards if c.days_until_expiry is not None and c.days_until_expiry <= EXPIRY_WARNING_DAYS),
        promo_active_count=sum(1 for c in cards if c.has_active_promo),
        recent_alerts=[AlertOut.model_validate(a) for a in recent_alerts],
    )
