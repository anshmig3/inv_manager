"""
Phase 2 & 3 operational models:
  StockAdjustment, CycleCount/CycleCountItem,
  Disposal, StockTransfer, CostHistory
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# ── Stock Adjustment (FR-73, FR-74, FR-78) ─────────────────────────────────

ADJUSTMENT_REASONS = [
    "PHYSICAL_COUNT",
    "DAMAGED",
    "THEFT",
    "DATA_ENTRY_ERROR",
    "RECEIVING_CORRECTION",
    "OTHER",
]


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    before_qty: Mapped[float] = mapped_column(Float)
    after_qty: Mapped[float] = mapped_column(Float)
    delta: Mapped[float] = mapped_column(Float)             # after - before
    reason: Mapped[str] = mapped_column(String(50))         # one of ADJUSTMENT_REASONS
    reference_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    adjusted_by: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    cycle_count_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("cycle_counts.id"), nullable=True)


# ── Cycle Count (FR-75 to FR-78) ───────────────────────────────────────────

CYCLE_STATUS_OPEN = "OPEN"
CYCLE_STATUS_COUNTING = "COUNTING"
CYCLE_STATUS_PENDING = "PENDING_APPROVAL"
CYCLE_STATUS_COMPLETED = "COMPLETED"
CYCLE_STATUS_CANCELLED = "CANCELLED"


class CycleCount(Base):
    __tablename__ = "cycle_counts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category_filter: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=CYCLE_STATUS_OPEN)
    created_by: Mapped[str] = mapped_column(String(200))
    completed_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[List["CycleCountItem"]] = relationship("CycleCountItem", back_populates="cycle_count")


class CycleCountItem(Base):
    __tablename__ = "cycle_count_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cycle_count_id: Mapped[int] = mapped_column(Integer, ForeignKey("cycle_counts.id"))
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    expected_qty: Mapped[float] = mapped_column(Float)
    counted_qty: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    variance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # counted - expected
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)   # |variance| > 5%

    cycle_count: Mapped["CycleCount"] = relationship("CycleCount", back_populates="items")


# ── Disposal / Shrinkage (FR-88 to FR-93) ──────────────────────────────────

DISPOSAL_REASON_EXPIRED = "EXPIRED"
DISPOSAL_REASON_DAMAGED = "DAMAGED"
DISPOSAL_REASON_CONTAMINATED = "CONTAMINATED"
DISPOSAL_REASON_THEFT = "THEFT"
DISPOSAL_REASON_OTHER = "OTHER"

DISPOSAL_METHOD_BIN = "BIN"
DISPOSAL_METHOD_DONATE = "DONATE"
DISPOSAL_METHOD_RETURN = "RETURN_TO_SUPPLIER"

DISPOSAL_STATUS_PENDING = "PENDING_APPROVAL"
DISPOSAL_STATUS_APPROVED = "APPROVED"
DISPOSAL_STATUS_COMPLETED = "COMPLETED"

DISPOSAL_APPROVAL_THRESHOLD = 50.0   # £50 default


class Disposal(Base):
    __tablename__ = "disposals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    batch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("expiry_batches.id"), nullable=True)
    quantity: Mapped[float] = mapped_column(Float)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)    # cost at time of disposal
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str] = mapped_column(String(50))
    method: Mapped[str] = mapped_column(String(50))
    actioned_by: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default=DISPOSAL_STATUS_COMPLETED)
    approved_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    stock_decremented: Mapped[bool] = mapped_column(Boolean, default=False)


# ── Stock Transfer (FR-94 to FR-97) ────────────────────────────────────────

TRANSFER_STATUS_PENDING = "PENDING"
TRANSFER_STATUS_APPROVED = "APPROVED"
TRANSFER_STATUS_COMPLETED = "COMPLETED"
TRANSFER_STATUS_REJECTED = "REJECTED"


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    from_department: Mapped[str] = mapped_column(String(100))
    to_department: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[float] = mapped_column(Float)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=TRANSFER_STATUS_PENDING)
    requested_by: Mapped[str] = mapped_column(String(200))
    approved_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── Cost History (FR-98, FR-99) ─────────────────────────────────────────────

class CostHistory(Base):
    __tablename__ = "cost_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    unit_cost: Mapped[float] = mapped_column(Float)
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    changed_by: Mapped[str] = mapped_column(String(200))
    reason: Mapped[str] = mapped_column(String(200), default="")  # supplier price change / contract / spot
    previous_cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
