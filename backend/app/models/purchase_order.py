from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    po_number: Mapped[str] = mapped_column(String(50), unique=True)
    quantity: Mapped[float] = mapped_column(Float)
    unit_cost: Mapped[float] = mapped_column(Float)
    total_cost: Mapped[float] = mapped_column(Float)
    supplier_name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default="DRAFT")
    # DRAFT → APPROVED → SENT → ACKNOWLEDGED → IN_TRANSIT → RECEIVED / PARTIALLY_RECEIVED
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expected_delivery: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Approval workflow (FR-25)
    approved_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Transmission (FR-25)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_to_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Receiving (FR-37 to FR-40)
    received_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    received_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    discrepancy_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    sku: Mapped["SKU"] = relationship("SKU", back_populates="purchase_orders")
