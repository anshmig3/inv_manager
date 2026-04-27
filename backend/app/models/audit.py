"""Immutable audit log (FR-107 to FR-110)."""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


# Action type constants
AUDIT_LOGIN = "LOGIN"
AUDIT_LOGOUT = "LOGOUT"
AUDIT_STOCK_ADJUST = "STOCK_ADJUSTMENT"
AUDIT_DISPOSAL = "DISPOSAL"
AUDIT_PO_CREATE = "PO_CREATE"
AUDIT_PO_APPROVE = "PO_APPROVE"
AUDIT_PO_SEND = "PO_SEND"
AUDIT_PO_RECEIVE = "PO_RECEIVE"
AUDIT_ALERT_ACK = "ALERT_ACKNOWLEDGE"
AUDIT_ALERT_ASSIGN = "ALERT_ASSIGN"
AUDIT_ALERT_RESOLVE = "ALERT_RESOLVE"
AUDIT_ALERT_CREATE = "ALERT_CREATE"
AUDIT_USER_CREATE = "USER_CREATE"
AUDIT_USER_UPDATE = "USER_UPDATE"
AUDIT_TRANSFER_CREATE = "TRANSFER_CREATE"
AUDIT_TRANSFER_APPROVE = "TRANSFER_APPROVE"
AUDIT_COST_UPDATE = "COST_UPDATE"
AUDIT_CYCLE_COUNT = "CYCLE_COUNT"


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    user_email: Mapped[str] = mapped_column(String(200), index=True)
    user_name: Mapped[str] = mapped_column(String(200))
    action_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # SKU / PO / USER / ALERT
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    entity_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # human-readable
    before_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    after_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)             # free-text summary
    source: Mapped[str] = mapped_column(String(20), default="USER")                # USER | AI
