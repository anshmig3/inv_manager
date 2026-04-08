from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ExpiryBatch(Base):
    __tablename__ = "expiry_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("skus.id"))
    batch_number: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[float] = mapped_column(Float)
    expiry_date: Mapped[date] = mapped_column(Date)
    received_date: Mapped[date] = mapped_column(Date, default=datetime.utcnow)
    disposed: Mapped[bool] = mapped_column(default=False)

    sku: Mapped["SKU"] = relationship("SKU", back_populates="expiry_batches")
