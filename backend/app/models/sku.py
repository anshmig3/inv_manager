from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SKU(Base):
    __tablename__ = "skus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(100))
    unit: Mapped[str] = mapped_column(String(20))           # e.g. "units", "kg", "litre"
    reorder_point: Mapped[float] = mapped_column(Float)     # trigger threshold
    reorder_qty: Mapped[float] = mapped_column(Float)       # suggested order qty
    supplier_name: Mapped[str] = mapped_column(String(200))
    supplier_email: Mapped[str] = mapped_column(String(200))
    lead_time_days: Mapped[int] = mapped_column(Integer, default=2)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    image_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stock: Mapped["StockLevel"] = relationship("StockLevel", back_populates="sku", uselist=False)
    sales_history: Mapped[List["SalesHistory"]] = relationship("SalesHistory", back_populates="sku")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="sku")
    promotions: Mapped[List["Promotion"]] = relationship("Promotion", back_populates="sku")
    expiry_batches: Mapped[List["ExpiryBatch"]] = relationship("ExpiryBatch", back_populates="sku")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="sku")


class StockLevel(Base):
    __tablename__ = "stock_levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"), unique=True)
    on_hand: Mapped[float] = mapped_column(Float, default=0.0)
    on_order: Mapped[float] = mapped_column(Float, default=0.0)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sku: Mapped["SKU"] = relationship("SKU", back_populates="stock")


class SalesHistory(Base):
    __tablename__ = "sales_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    sale_date: Mapped[datetime] = mapped_column(DateTime)
    units_sold: Mapped[float] = mapped_column(Float)

    sku: Mapped["SKU"] = relationship("SKU", back_populates="sales_history")
