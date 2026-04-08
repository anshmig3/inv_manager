from datetime import date, datetime
from pydantic import BaseModel


class StockLevelOut(BaseModel):
    on_hand: float
    on_order: float
    last_updated: datetime

    model_config = {"from_attributes": True}


class SalesStatsOut(BaseModel):
    daily_avg: float
    weekly_total: float
    monthly_total: float


class PromotionOut(BaseModel):
    id: int
    promo_name: str
    start_date: date
    end_date: date
    expected_uplift_pct: float

    model_config = {"from_attributes": True}


class ExpiryBatchOut(BaseModel):
    id: int
    batch_number: str
    quantity: float
    expiry_date: date
    days_until_expiry: int

    model_config = {"from_attributes": True}


class AlertOut(BaseModel):
    id: int
    alert_type: str
    severity: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SKUCardOut(BaseModel):
    """Compact representation for the card grid."""
    id: int
    sku_code: str
    name: str
    category: str
    unit: str
    on_hand: float
    on_order: float
    days_of_supply: float
    reorder_point: float
    card_status: str          # HEALTHY | WATCH | WARNING | CRITICAL
    active_alerts: list[AlertOut]
    has_active_promo: bool
    nearest_expiry_date: date | None
    days_until_expiry: int | None

    model_config = {"from_attributes": True}


class SKUDetailOut(BaseModel):
    """Full detail for the expanded panel."""
    id: int
    sku_code: str
    name: str
    category: str
    unit: str
    supplier_name: str
    supplier_email: str
    lead_time_days: int
    unit_cost: float
    reorder_point: float
    reorder_qty: float

    # Stock
    stock: StockLevelOut

    # Computed
    days_of_supply: float
    days_of_supply_after_order: float
    card_status: str

    # Sales
    sales_stats: SalesStatsOut

    # Promotion
    promotions: list[PromotionOut]
    has_active_promo: bool

    # Expiry
    expiry_batches: list[ExpiryBatchOut]

    # Alerts
    active_alerts: list[AlertOut]

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    total_skus: int
    critical_count: int
    warning_count: int
    watch_count: int
    healthy_count: int
    stockout_count: int
    low_stock_count: int
    near_expiry_count: int
    promo_active_count: int
    recent_alerts: list[AlertOut]
