"""
Phase 3 intelligence & automation APIs:
  Anomaly detection, PO approval/transmission,
  Receiving workflow, Cost management, Audit log,
  Advanced reporting
"""
import os
import smtplib
from datetime import datetime, timedelta, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SKU, StockLevel, SalesHistory, Alert, PurchaseOrder
from app.models.operations import (
    Disposal, CostHistory, DISPOSAL_STATUS_COMPLETED,
)
from app.models.audit import AuditLog
from app.models.alert import ALERT_OPEN
from app.core.security import get_current_user, require_roles
from app.models.user import ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD

router = APIRouter(prefix="/api", tags=["intelligence"])


def _log(db: Session, user, action_type: str, entity_type: str = None,
         entity_id: int = None, entity_name: str = None,
         before: str = None, after: str = None, detail: str = None, source: str = "USER"):
    entry = AuditLog(
        user_email=user.email, user_name=user.full_name,
        action_type=action_type, entity_type=entity_type,
        entity_id=entity_id, entity_name=entity_name,
        before_value=before, after_value=after, detail=detail, source=source,
    )
    db.add(entry)


# ══════════════════════════════════════════════════════════════════════════════
# ANOMALY DETECTION (FR-41 to FR-43)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/anomaly/scan")
def run_anomaly_scan(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    """Detect consumption spikes and high shrinkage rates."""
    today = datetime.utcnow()
    since_90 = today - timedelta(days=90)
    yesterday_start = (today - timedelta(days=1)).replace(hour=0, minute=0, second=0)
    yesterday_end = today.replace(hour=0, minute=0, second=0)

    skus = db.query(SKU).all()
    alerts_created = 0

    for sku in skus:
        # 30-day rolling average
        history = (db.query(SalesHistory)
                   .filter(SalesHistory.sku_id == sku.id, SalesHistory.sale_date >= since_90)
                   .all())
        if len(history) < 7:
            continue

        total_units = sum(s.units_sold for s in history)
        days_in_range = (today - since_90).days or 1
        daily_avg = total_units / days_in_range

        # Yesterday's consumption
        yesterday_sales = (db.query(SalesHistory)
                           .filter(SalesHistory.sku_id == sku.id,
                                   SalesHistory.sale_date >= yesterday_start,
                                   SalesHistory.sale_date < yesterday_end)
                           .all())
        yesterday_total = sum(s.units_sold for s in yesterday_sales)

        if daily_avg > 0 and yesterday_total > 2.5 * daily_avg:
            existing = db.query(Alert).filter(
                Alert.sku_id == sku.id,
                Alert.alert_type == "ANOMALY_SPIKE",
                Alert.is_active == True,
            ).first()
            if not existing:
                a = Alert(
                    sku_id=sku.id, alert_type="ANOMALY_SPIKE", severity="HIGH",
                    message=(f"{sku.name}: Yesterday's consumption ({yesterday_total:.0f} {sku.unit}) "
                             f"is {yesterday_total/daily_avg:.1f}× the 30-day average "
                             f"({daily_avg:.1f} {sku.unit}/day). Verify POS data or check for theft."),
                    status=ALERT_OPEN,
                )
                db.add(a)
                alerts_created += 1

        # Shrinkage rate: monthly disposals > 3% of received
        since_30 = today - timedelta(days=30)
        disposals = db.query(Disposal).filter(
            Disposal.sku_id == sku.id,
            Disposal.created_at >= since_30,
            Disposal.status == DISPOSAL_STATUS_COMPLETED,
        ).all()
        disposed_qty = sum(d.quantity for d in disposals)

        # Approximate "received" from POs
        pos = (db.query(PurchaseOrder)
               .filter(PurchaseOrder.sku_id == sku.id,
                       PurchaseOrder.received_at >= since_30)
               .all())
        received_qty = sum(p.received_quantity or p.quantity for p in pos)

        if received_qty > 0 and (disposed_qty / received_qty) > 0.03:
            existing = db.query(Alert).filter(
                Alert.sku_id == sku.id,
                Alert.alert_type == "HIGH_SHRINKAGE",
                Alert.is_active == True,
            ).first()
            if not existing:
                rate = disposed_qty / received_qty * 100
                a = Alert(
                    sku_id=sku.id, alert_type="HIGH_SHRINKAGE", severity="MEDIUM",
                    message=(f"{sku.name}: Monthly shrinkage rate is {rate:.1f}% "
                             f"({disposed_qty:.0f} {sku.unit} disposed out of {received_qty:.0f} received). "
                             f"Threshold is 3%."),
                    status=ALERT_OPEN,
                )
                db.add(a)
                alerts_created += 1

    db.commit()
    return {"message": f"Anomaly scan complete. {alerts_created} new alerts created."}


# ══════════════════════════════════════════════════════════════════════════════
# PO APPROVAL & EMAIL TRANSMISSION (FR-25 to FR-27)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/purchase-orders/{po_id}/approve")
def approve_po(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"PO is already {po.status}")

    po.status = "APPROVED"
    po.approved_by = current_user.full_name
    po.approved_at = datetime.utcnow()

    sku = db.query(SKU).filter(SKU.id == po.sku_id).first()
    _log(db, current_user, "PO_APPROVE", "PO", po.id, po.po_number,
         before="DRAFT", after="APPROVED",
         detail=f"Approved PO {po.po_number} for {sku.name if sku else po.sku_id}")
    db.commit()
    return {"message": f"PO {po.po_number} approved"}


@router.post("/purchase-orders/{po_id}/send")
def send_po(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po.status not in ("APPROVED", "DRAFT"):
        raise HTTPException(status_code=400, detail=f"PO cannot be sent in status {po.status}")

    sku = db.query(SKU).filter(SKU.id == po.sku_id).first()
    supplier_email = sku.supplier_email if sku else None

    email_sent = False
    if supplier_email:
        email_sent = _send_po_email(po, sku, supplier_email)

    po.status = "SENT"
    po.sent_at = datetime.utcnow()
    po.sent_to_email = supplier_email

    _log(db, current_user, "PO_SEND", "PO", po.id, po.po_number,
         before="APPROVED", after="SENT",
         detail=f"Sent PO {po.po_number} to {supplier_email or 'unknown'}")
    db.commit()

    return {
        "message": f"PO {po.po_number} sent",
        "email_sent": email_sent,
        "sent_to": supplier_email,
    }


def _send_po_email(po: PurchaseOrder, sku: Optional[SKU], to_email: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    from_email = os.getenv("SMTP_FROM", smtp_user)

    if not smtp_host or not smtp_user:
        return False  # SMTP not configured — skip silently

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Purchase Order {po.po_number} — GroceryIQ"
        msg["From"] = from_email
        msg["To"] = to_email

        sku_name = sku.name if sku else f"SKU#{po.sku_id}"
        html = f"""
        <h2>Purchase Order: {po.po_number}</h2>
        <table border="1" cellpadding="6" style="border-collapse:collapse">
          <tr><th>SKU</th><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
          <tr>
            <td>{sku.sku_code if sku else ''}</td>
            <td>{sku_name}</td>
            <td>{po.quantity} {sku.unit if sku else ''}</td>
            <td>£{po.unit_cost:.2f}</td>
            <td>£{po.total_cost:.2f}</td>
          </tr>
        </table>
        <p>Expected delivery: {po.expected_delivery.strftime('%Y-%m-%d') if po.expected_delivery else 'TBD'}</p>
        <p>Notes: {po.notes or '—'}</p>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())
        return True
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════════════
# RECEIVING / GOODS-IN (FR-37 to FR-40)
# ══════════════════════════════════════════════════════════════════════════════

class ReceivingRequest(BaseModel):
    received_quantity: float
    discrepancy_notes: Optional[str] = None
    expiry_batches: Optional[List[Dict[str, Any]]] = None  # [{batch_number, quantity, expiry_date}]


@router.post("/purchase-orders/{po_id}/receive")
def receive_po(
    po_id: int,
    body: ReceivingRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    from app.models.expiry import ExpiryBatch

    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po.status in ("RECEIVED",):
        raise HTTPException(status_code=400, detail="PO already fully received")

    sku = db.query(SKU).filter(SKU.id == po.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    discrepancy = abs(body.received_quantity - po.quantity) / po.quantity > 0.05
    po.received_quantity = body.received_quantity
    po.received_by = current_user.full_name
    po.received_at = datetime.utcnow()
    po.status = "PARTIALLY_RECEIVED" if discrepancy else "RECEIVED"

    if body.discrepancy_notes:
        po.discrepancy_notes = body.discrepancy_notes

    # Update on-hand stock
    stock = db.query(StockLevel).filter(StockLevel.sku_id == sku.id).first()
    if stock:
        stock.on_hand += body.received_quantity
        stock.on_order = max(0.0, stock.on_order - po.quantity)
        stock.last_updated = datetime.utcnow()

    # Add expiry batches if provided
    if body.expiry_batches:
        for eb_data in body.expiry_batches:
            try:
                exp_date = datetime.strptime(eb_data["expiry_date"], "%Y-%m-%d")
            except (KeyError, ValueError):
                continue
            eb = ExpiryBatch(
                sku_id=sku.id,
                batch_number=eb_data.get("batch_number", f"RECV-{po_id}"),
                quantity=eb_data.get("quantity", body.received_quantity),
                expiry_date=exp_date,
            )
            db.add(eb)

    # Flag discrepancy
    if discrepancy:
        short = po.quantity - body.received_quantity
        alert = Alert(
            sku_id=sku.id, alert_type="RECEIVING_DISCREPANCY", severity="MEDIUM",
            message=(f"PO {po.po_number}: Received {body.received_quantity:.0f} of "
                     f"{po.quantity:.0f} ordered from {po.supplier_name}. "
                     f"Shortfall: {short:.0f} {sku.unit}."),
            status=ALERT_OPEN,
        )
        db.add(alert)

    _log(db, current_user, "PO_RECEIVE", "PO", po.id, po.po_number,
         detail=f"Received {body.received_quantity}/{po.quantity} units. Status: {po.status}")
    db.commit()

    return {
        "message": f"PO {po.po_number} received",
        "status": po.status,
        "discrepancy": discrepancy,
        "received_quantity": body.received_quantity,
    }


# ══════════════════════════════════════════════════════════════════════════════
# PRICE & COST MANAGEMENT (FR-98 to FR-102)
# ══════════════════════════════════════════════════════════════════════════════

class CostUpdateRequest(BaseModel):
    unit_cost: float
    reason: str


class CostHistoryOut(BaseModel):
    id: int
    sku_id: int
    unit_cost: float
    previous_cost: Optional[float]
    effective_date: str
    changed_by: str
    reason: str

    class Config:
        from_attributes = True


@router.post("/skus/{sku_id}/cost", response_model=CostHistoryOut)
def update_sku_cost(
    sku_id: int,
    body: CostUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    sku = db.query(SKU).filter(SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    prev = sku.unit_cost
    entry = CostHistory(
        sku_id=sku.id, unit_cost=body.unit_cost,
        previous_cost=prev, changed_by=current_user.full_name,
        reason=body.reason,
    )
    db.add(entry)
    sku.unit_cost = body.unit_cost

    # Alert if deviation > 5%
    if prev > 0 and abs(body.unit_cost - prev) / prev > 0.05:
        direction = "increase" if body.unit_cost > prev else "decrease"
        pct = abs(body.unit_cost - prev) / prev * 100
        a = Alert(
            sku_id=sku.id, alert_type="PRICE_DEVIATION", severity="MEDIUM",
            message=(f"{sku.name}: Unit cost {direction} of {pct:.1f}% "
                     f"(£{prev:.2f} → £{body.unit_cost:.2f}). Reason: {body.reason}"),
            status=ALERT_OPEN,
        )
        db.add(a)

    _log(db, current_user, "COST_UPDATE", "SKU", sku.id, sku.name,
         before=str(prev), after=str(body.unit_cost), detail=body.reason)
    db.commit()
    db.refresh(entry)

    return CostHistoryOut(
        id=entry.id, sku_id=sku.id, unit_cost=entry.unit_cost,
        previous_cost=entry.previous_cost,
        effective_date=entry.effective_date.isoformat(),
        changed_by=entry.changed_by, reason=entry.reason,
    )


@router.get("/skus/{sku_id}/cost-history", response_model=List[CostHistoryOut])
def get_cost_history(
    sku_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    history = (db.query(CostHistory)
               .filter(CostHistory.sku_id == sku_id)
               .order_by(CostHistory.effective_date.desc())
               .limit(20).all())
    return [CostHistoryOut(
        id=h.id, sku_id=sku_id, unit_cost=h.unit_cost,
        previous_cost=h.previous_cost,
        effective_date=h.effective_date.isoformat(),
        changed_by=h.changed_by, reason=h.reason,
    ) for h in history]


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG VIEWER (FR-107 to FR-110)
# ══════════════════════════════════════════════════════════════════════════════

class AuditLogOut(BaseModel):
    id: int
    timestamp: str
    user_email: str
    user_name: str
    action_type: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    entity_name: Optional[str]
    before_value: Optional[str]
    after_value: Optional[str]
    detail: Optional[str]
    source: str

    class Config:
        from_attributes = True


@router.get("/audit-log", response_model=List[AuditLogOut])
def get_audit_log(
    user_email: Optional[str] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    query = db.query(AuditLog)
    if user_email:
        query = query.filter(AuditLog.user_email == user_email)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type.upper())
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.upper())
    if date_from:
        query = query.filter(AuditLog.timestamp >= datetime.strptime(date_from, "%Y-%m-%d"))
    if date_to:
        query = query.filter(AuditLog.timestamp <= datetime.strptime(date_to, "%Y-%m-%d"))

    entries = query.order_by(AuditLog.timestamp.desc()).limit(min(limit, 500)).all()
    return [AuditLogOut(
        id=e.id, timestamp=e.timestamp.isoformat(),
        user_email=e.user_email, user_name=e.user_name,
        action_type=e.action_type, entity_type=e.entity_type,
        entity_id=e.entity_id, entity_name=e.entity_name,
        before_value=e.before_value, after_value=e.after_value,
        detail=e.detail, source=e.source,
    ) for e in entries]


# ══════════════════════════════════════════════════════════════════════════════
# ADVANCED REPORTS (FR-45 to FR-47)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/reports/weekly-performance")
def weekly_performance_report(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    today = date.today()
    week_start = datetime.combine(today - timedelta(days=7), datetime.min.time())
    week_end = datetime.combine(today, datetime.min.time())

    # Stockout incidents
    stockout_alerts = (db.query(Alert)
                       .filter(Alert.alert_type == "STOCKOUT",
                               Alert.created_at >= week_start)
                       .all())

    # Disposals / shrinkage this week
    disposals = (db.query(Disposal)
                 .filter(Disposal.created_at >= week_start,
                         Disposal.status == DISPOSAL_STATUS_COMPLETED)
                 .all())
    shrinkage_cost = sum(d.total_cost for d in disposals)

    # POs sent this week
    pos_sent = (db.query(PurchaseOrder)
                .filter(PurchaseOrder.sent_at >= week_start)
                .all())

    # Overdue deliveries
    overdue_pos = (db.query(PurchaseOrder)
                   .filter(PurchaseOrder.expected_delivery < datetime.utcnow(),
                           PurchaseOrder.status.notin_(["RECEIVED", "PARTIALLY_RECEIVED"]))
                   .all())

    # Alert resolution rate
    total_alerts = (db.query(Alert)
                    .filter(Alert.created_at >= week_start)
                    .count())
    resolved_alerts = (db.query(Alert)
                       .filter(Alert.created_at >= week_start,
                               Alert.status == "RESOLVED")
                       .count())
    resolution_rate = round(resolved_alerts / total_alerts * 100, 1) if total_alerts else 0

    # Shrinkage by category
    shrinkage_by_cat: Dict[str, float] = {}
    for d in disposals:
        sku = db.query(SKU).filter(SKU.id == d.sku_id).first()
        cat = sku.category if sku else "Unknown"
        shrinkage_by_cat[cat] = shrinkage_by_cat.get(cat, 0.0) + d.total_cost

    return {
        "period": {"from": week_start.date().isoformat(), "to": today.isoformat()},
        "stockout_incidents": len(stockout_alerts),
        "stockout_skus": list({a.sku_id for a in stockout_alerts}),
        "total_shrinkage_cost": round(shrinkage_cost, 2),
        "shrinkage_by_category": {k: round(v, 2) for k, v in shrinkage_by_cat.items()},
        "disposal_count": len(disposals),
        "pos_sent": len(pos_sent),
        "pos_overdue": len(overdue_pos),
        "overdue_po_details": [
            {"po_number": p.po_number, "supplier": p.supplier_name,
             "expected": p.expected_delivery.isoformat() if p.expected_delivery else None,
             "status": p.status}
            for p in overdue_pos
        ],
        "total_alerts": total_alerts,
        "resolved_alerts": resolved_alerts,
        "alert_resolution_rate_pct": resolution_rate,
    }
