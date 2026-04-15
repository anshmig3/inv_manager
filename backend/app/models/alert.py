from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    alert_type: Mapped[str] = mapped_column(String(50))   # STOCKOUT | LOW_STOCK | NEAR_EXPIRY | PROMO_SHORTFALL
    severity: Mapped[str] = mapped_column(String(20))     # CRITICAL | HIGH | MEDIUM | LOW
    message: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    sku: Mapped["SKU"] = relationship("SKU", back_populates="alerts")
