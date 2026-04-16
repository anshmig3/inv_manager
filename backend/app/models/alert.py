from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

# Alert lifecycle statuses (FR-66)
ALERT_OPEN = "OPEN"
ALERT_ACKNOWLEDGED = "ACKNOWLEDGED"
ALERT_IN_PROGRESS = "IN_PROGRESS"
ALERT_RESOLVED = "RESOLVED"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    alert_type: Mapped[str] = mapped_column(String(50))   # STOCKOUT | LOW_STOCK | NEAR_EXPIRY | PROMO_SHORTFALL
    severity: Mapped[str] = mapped_column(String(20))     # CRITICAL | HIGH | MEDIUM | LOW
    message: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Lifecycle fields (FR-66 to FR-72)
    status: Mapped[str] = mapped_column(String(20), default=ALERT_OPEN)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assignment_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolution_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    sku: Mapped["SKU"] = relationship("SKU", back_populates="alerts")
