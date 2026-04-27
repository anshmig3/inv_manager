"""
Phase 2 operational APIs:
  Stock Adjustments, Cycle Counts, Disposals,
  Stock Transfers, Suppliers, Delivery Calendar, Demand Forecast
"""
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    SKU, StockLevel, SalesHistory, Alert, PurchaseOrder,
)
from app.models.operations import (
    StockAdjustment, CycleCount, CycleCountItem,
    Disposal, StockTransfer, CostHistory,
    CYCLE_STATUS_OPEN, CYCLE_STATUS_COUNTING,
    CYCLE_STATUS_PENDING, CYCLE_STATUS_COMPLETED, CYCLE_STATUS_CANCELLED,
    TRANSFER_STATUS_PENDING, TRANSFER_STATUS_APPROVED,
    TRANSFER_STATUS_COMPLETED, TRANSFER_STATUS_REJECTED,
    DISPOSAL_STATUS_PENDING, DISPOSAL_STATUS_APPROVED, DISPOSAL_STATUS_COMPLETED,
    DISPOSAL_APPROVAL_THRESHOLD,
)
from app.models.supplier import Supplier, SupplierSKU
from app.models.audit import AuditLog
from app.models.alert import ALERT_OPEN
from app.core.security import get_current_user, require_roles
from app.models.user import ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD, ROLE_FLOOR_STAFF

router = APIRouter(prefix="/api", tags=["operations"])

# ── Helpers ──────────────────────────────────────────────────────────────────

def _log(db: Session, user, action_type: str, entity_type: str = None,
         entity_id: int = None, entity_name: str = None,
         before: str = None, after: str = None, detail: str = None, source: str = "USER"):
    entry = AuditLog(
        user_email=user.email,
        user_name=user.full_name,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        before_value=before,
        after_value=after,
        detail=detail,
        source=source,
    )
    db.add(entry)


# ══════════════════════════════════════════════════════════════════════════════
# STOCK ADJUSTMENTS (FR-73, FR-74, FR-78)
# ══════════════════════════════════════════════════════════════════════════════

class StockAdjustmentRequest(BaseModel):
    sku_id: int
    new_quantity: float
    reason: str
    reference_note: Optional[str] = None


class StockAdjustmentOut(BaseModel):
    id: int
    sku_id: int
    sku_name: str
    before_qty: float
    after_qty: float
    delta: float
    reason: str
    reference_note: Optional[str]
    adjusted_by: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/stock-adjustments", response_model=StockAdjustmentOut)
def create_stock_adjustment(
    body: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    sku = db.query(SKU).filter(SKU.id == body.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    stock = db.query(StockLevel).filter(StockLevel.sku_id == sku.id).first()
    before = stock.on_hand if stock else 0.0
    delta = body.new_quantity - before

    adj = StockAdjustment(
        sku_id=sku.id,
        before_qty=before,
        after_qty=body.new_quantity,
        delta=delta,
        reason=body.reason,
        reference_note=body.reference_note,
        adjusted_by=current_user.full_name,
    )
    db.add(adj)

    if stock:
        stock.on_hand = body.new_quantity
        stock.last_updated = datetime.utcnow()

    _log(db, current_user, "STOCK_ADJUSTMENT", "SKU", sku.id, sku.name,
         str(before), str(body.new_quantity), body.reason)
    db.commit()
    db.refresh(adj)

    return StockAdjustmentOut(
        id=adj.id, sku_id=sku.id, sku_name=sku.name,
        before_qty=adj.before_qty, after_qty=adj.after_qty, delta=adj.delta,
        reason=adj.reason, reference_note=adj.reference_note,
        adjusted_by=adj.adjusted_by,
        created_at=adj.created_at.isoformat(),
    )


@router.get("/stock-adjustments/sku/{sku_id}", response_model=List[StockAdjustmentOut])
def get_sku_adjustment_history(
    sku_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sku = db.query(SKU).filter(SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    adjs = (db.query(StockAdjustment)
            .filter(StockAdjustment.sku_id == sku_id)
            .order_by(StockAdjustment.created_at.desc())
            .limit(50).all())
    return [
        StockAdjustmentOut(
            id=a.id, sku_id=sku_id, sku_name=sku.name,
            before_qty=a.before_qty, after_qty=a.after_qty, delta=a.delta,
            reason=a.reason, reference_note=a.reference_note,
            adjusted_by=a.adjusted_by,
            created_at=a.created_at.isoformat(),
        ) for a in adjs
    ]


# ══════════════════════════════════════════════════════════════════════════════
# CYCLE COUNTS (FR-75 to FR-78)
# ══════════════════════════════════════════════════════════════════════════════

class CycleCountCreate(BaseModel):
    name: str
    category_filter: Optional[str] = None
    notes: Optional[str] = None


class CycleCountItemIn(BaseModel):
    sku_id: int
    counted_qty: float


class CycleCountOut(BaseModel):
    id: int
    name: str
    category_filter: Optional[str]
    status: str
    created_by: str
    created_at: str
    completed_at: Optional[str]
    item_count: int

    class Config:
        from_attributes = True


class CycleCountDetailOut(BaseModel):
    id: int
    name: str
    category_filter: Optional[str]
    status: str
    created_by: str
    created_at: str
    notes: Optional[str]
    items: List[Dict[str, Any]]


@router.post("/cycle-counts", response_model=CycleCountOut)
def create_cycle_count(
    body: CycleCountCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    cc = CycleCount(
        name=body.name,
        category_filter=body.category_filter,
        notes=body.notes,
        created_by=current_user.full_name,
        status=CYCLE_STATUS_COUNTING,
    )
    db.add(cc)
    db.flush()

    query = db.query(SKU)
    if body.category_filter:
        query = query.filter(SKU.category == body.category_filter)
    skus = query.all()

    for sku in skus:
        stock = db.query(StockLevel).filter(StockLevel.sku_id == sku.id).first()
        expected = stock.on_hand if stock else 0.0
        item = CycleCountItem(
            cycle_count_id=cc.id,
            sku_id=sku.id,
            expected_qty=expected,
        )
        db.add(item)

    _log(db, current_user, "CYCLE_COUNT", "CYCLE_COUNT", cc.id, body.name,
         detail=f"Created cycle count for {len(skus)} SKUs")
    db.commit()
    db.refresh(cc)

    return CycleCountOut(
        id=cc.id, name=cc.name, category_filter=cc.category_filter,
        status=cc.status, created_by=cc.created_by,
        created_at=cc.created_at.isoformat(),
        completed_at=None, item_count=len(skus),
    )


@router.get("/cycle-counts", response_model=List[CycleCountOut])
def list_cycle_counts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    counts = db.query(CycleCount).order_by(CycleCount.created_at.desc()).limit(20).all()
    result = []
    for cc in counts:
        item_count = db.query(CycleCountItem).filter(CycleCountItem.cycle_count_id == cc.id).count()
        result.append(CycleCountOut(
            id=cc.id, name=cc.name, category_filter=cc.category_filter,
            status=cc.status, created_by=cc.created_by,
            created_at=cc.created_at.isoformat(),
            completed_at=cc.completed_at.isoformat() if cc.completed_at else None,
            item_count=item_count,
        ))
    return result


@router.get("/cycle-counts/{cc_id}", response_model=CycleCountDetailOut)
def get_cycle_count(
    cc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cc = db.query(CycleCount).filter(CycleCount.id == cc_id).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cycle count not found")

    items = db.query(CycleCountItem).filter(CycleCountItem.cycle_count_id == cc_id).all()
    item_data = []
    for it in items:
        sku = db.query(SKU).filter(SKU.id == it.sku_id).first()
        item_data.append({
            "id": it.id, "sku_id": it.sku_id,
            "sku_name": sku.name if sku else f"SKU#{it.sku_id}",
            "sku_code": sku.sku_code if sku else "",
            "expected_qty": it.expected_qty,
            "counted_qty": it.counted_qty,
            "variance": it.variance,
            "requires_approval": it.requires_approval,
        })

    return CycleCountDetailOut(
        id=cc.id, name=cc.name, category_filter=cc.category_filter,
        status=cc.status, created_by=cc.created_by,
        created_at=cc.created_at.isoformat(),
        notes=cc.notes, items=item_data,
    )


@router.patch("/cycle-counts/{cc_id}/items")
def update_cycle_count_items(
    cc_id: int,
    body: List[CycleCountItemIn],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cc = db.query(CycleCount).filter(CycleCount.id == cc_id).first()
    if not cc or cc.status == CYCLE_STATUS_COMPLETED:
        raise HTTPException(status_code=400, detail="Cycle count not editable")

    for entry in body:
        item = db.query(CycleCountItem).filter(
            CycleCountItem.cycle_count_id == cc_id,
            CycleCountItem.sku_id == entry.sku_id,
        ).first()
        if item:
            item.counted_qty = entry.counted_qty
            item.variance = entry.counted_qty - item.expected_qty
            if item.expected_qty > 0:
                item.requires_approval = abs(item.variance / item.expected_qty) > 0.05
            else:
                item.requires_approval = entry.counted_qty > 0

    cc.status = CYCLE_STATUS_PENDING
    db.commit()
    return {"message": "Items updated"}


@router.post("/cycle-counts/{cc_id}/confirm")
def confirm_cycle_count(
    cc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    cc = db.query(CycleCount).filter(CycleCount.id == cc_id).first()
    if not cc or cc.status != CYCLE_STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Cycle count not in PENDING_APPROVAL status")

    items = db.query(CycleCountItem).filter(CycleCountItem.cycle_count_id == cc_id).all()
    for item in items:
        if item.counted_qty is None:
            continue
        stock = db.query(StockLevel).filter(StockLevel.sku_id == item.sku_id).first()
        if not stock:
            continue
        before = stock.on_hand
        adj = StockAdjustment(
            sku_id=item.sku_id, before_qty=before,
            after_qty=item.counted_qty, delta=item.counted_qty - before,
            reason="PHYSICAL_COUNT", adjusted_by=current_user.full_name,
            cycle_count_id=cc_id,
        )
        db.add(adj)
        stock.on_hand = item.counted_qty
        stock.last_updated = datetime.utcnow()

    cc.status = CYCLE_STATUS_COMPLETED
    cc.completed_by = current_user.full_name
    cc.completed_at = datetime.utcnow()
    _log(db, current_user, "CYCLE_COUNT", "CYCLE_COUNT", cc_id, cc.name,
         detail="Cycle count confirmed and stock updated")
    db.commit()
    return {"message": "Cycle count confirmed and stock updated"}


# ══════════════════════════════════════════════════════════════════════════════
# DISPOSALS (FR-88 to FR-93)
# ══════════════════════════════════════════════════════════════════════════════

class DisposalCreate(BaseModel):
    sku_id: int
    quantity: float
    reason: str
    method: str
    batch_id: Optional[int] = None
    notes: Optional[str] = None


class DisposalOut(BaseModel):
    id: int
    sku_id: int
    sku_name: str
    quantity: float
    unit_cost: float
    total_cost: float
    reason: str
    method: str
    actioned_by: str
    status: str
    approved_by: Optional[str]
    notes: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.post("/disposals", response_model=DisposalOut)
def create_disposal(
    body: DisposalCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD, ROLE_FLOOR_STAFF)),
):
    sku = db.query(SKU).filter(SKU.id == body.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    total = body.quantity * sku.unit_cost
    needs_approval = total > DISPOSAL_APPROVAL_THRESHOLD

    disposal = Disposal(
        sku_id=sku.id,
        batch_id=body.batch_id,
        quantity=body.quantity,
        unit_cost=sku.unit_cost,
        total_cost=total,
        reason=body.reason,
        method=body.method,
        actioned_by=current_user.full_name,
        notes=body.notes,
        status=DISPOSAL_STATUS_PENDING if needs_approval else DISPOSAL_STATUS_COMPLETED,
        stock_decremented=False,
    )
    db.add(disposal)
    db.flush()

    if not needs_approval:
        _decrement_stock(db, sku.id, body.quantity)
        disposal.stock_decremented = True

    # Auto-alert for theft
    if body.reason == "THEFT":
        alert = Alert(
            sku_id=sku.id, alert_type="MANUAL", severity="HIGH",
            message=f"Theft disposal logged: {body.quantity} {sku.unit} of {sku.name}",
            status=ALERT_OPEN,
        )
        db.add(alert)

    _log(db, current_user, "DISPOSAL", "SKU", sku.id, sku.name,
         detail=f"{body.reason} disposal: {body.quantity} units, £{total:.2f}")
    db.commit()
    db.refresh(disposal)

    return DisposalOut(
        id=disposal.id, sku_id=sku.id, sku_name=sku.name,
        quantity=disposal.quantity, unit_cost=disposal.unit_cost,
        total_cost=disposal.total_cost, reason=disposal.reason,
        method=disposal.method, actioned_by=disposal.actioned_by,
        status=disposal.status, approved_by=disposal.approved_by,
        notes=disposal.notes, created_at=disposal.created_at.isoformat(),
    )


def _decrement_stock(db: Session, sku_id: int, qty: float):
    stock = db.query(StockLevel).filter(StockLevel.sku_id == sku_id).first()
    if stock:
        stock.on_hand = max(0.0, stock.on_hand - qty)
        stock.last_updated = datetime.utcnow()


@router.post("/disposals/{disposal_id}/approve")
def approve_disposal(
    disposal_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    disposal = db.query(Disposal).filter(Disposal.id == disposal_id).first()
    if not disposal or disposal.status != DISPOSAL_STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Disposal not pending approval")

    disposal.status = DISPOSAL_STATUS_COMPLETED
    disposal.approved_by = current_user.full_name
    disposal.approved_at = datetime.utcnow()

    if not disposal.stock_decremented:
        _decrement_stock(db, disposal.sku_id, disposal.quantity)
        disposal.stock_decremented = True

    db.commit()
    return {"message": "Disposal approved"}


@router.get("/disposals", response_model=List[DisposalOut])
def list_disposals(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Disposal)
    if status:
        query = query.filter(Disposal.status == status.upper())
    disposals = query.order_by(Disposal.created_at.desc()).limit(100).all()

    result = []
    for d in disposals:
        sku = db.query(SKU).filter(SKU.id == d.sku_id).first()
        result.append(DisposalOut(
            id=d.id, sku_id=d.sku_id, sku_name=sku.name if sku else f"SKU#{d.sku_id}",
            quantity=d.quantity, unit_cost=d.unit_cost, total_cost=d.total_cost,
            reason=d.reason, method=d.method, actioned_by=d.actioned_by,
            status=d.status, approved_by=d.approved_by,
            notes=d.notes, created_at=d.created_at.isoformat(),
        ))
    return result


@router.get("/disposals/summary")
def disposal_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    disposals = db.query(Disposal).filter(
        Disposal.created_at >= since,
        Disposal.status == DISPOSAL_STATUS_COMPLETED,
    ).all()

    by_reason: Dict[str, Dict] = {}
    by_category: Dict[str, float] = {}
    total_units = 0.0
    total_cost = 0.0

    for d in disposals:
        by_reason.setdefault(d.reason, {"count": 0, "units": 0.0, "cost": 0.0})
        by_reason[d.reason]["count"] += 1
        by_reason[d.reason]["units"] += d.quantity
        by_reason[d.reason]["cost"] += d.total_cost
        total_units += d.quantity
        total_cost += d.total_cost

        sku = db.query(SKU).filter(SKU.id == d.sku_id).first()
        cat = sku.category if sku else "Unknown"
        by_category[cat] = by_category.get(cat, 0.0) + d.total_cost

    return {
        "period_days": days,
        "total_disposals": len(disposals),
        "total_units": total_units,
        "total_cost": round(total_cost, 2),
        "by_reason": by_reason,
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
    }


# ══════════════════════════════════════════════════════════════════════════════
# STOCK TRANSFERS (FR-94 to FR-97)
# ══════════════════════════════════════════════════════════════════════════════

class TransferCreate(BaseModel):
    sku_id: int
    from_department: str
    to_department: str
    quantity: float
    reason: Optional[str] = None


class TransferOut(BaseModel):
    id: int
    sku_id: int
    sku_name: str
    from_department: str
    to_department: str
    quantity: float
    reason: Optional[str]
    status: str
    requested_by: str
    approved_by: Optional[str]
    created_at: str
    approved_at: Optional[str]
    completed_at: Optional[str]

    class Config:
        from_attributes = True


def _transfer_to_out(t: StockTransfer, sku_name: str) -> TransferOut:
    return TransferOut(
        id=t.id, sku_id=t.sku_id, sku_name=sku_name,
        from_department=t.from_department, to_department=t.to_department,
        quantity=t.quantity, reason=t.reason, status=t.status,
        requested_by=t.requested_by, approved_by=t.approved_by,
        created_at=t.created_at.isoformat(),
        approved_at=t.approved_at.isoformat() if t.approved_at else None,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
    )


@router.post("/transfers", response_model=TransferOut)
def create_transfer(
    body: TransferCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    sku = db.query(SKU).filter(SKU.id == body.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    t = StockTransfer(
        sku_id=sku.id, from_department=body.from_department,
        to_department=body.to_department, quantity=body.quantity,
        reason=body.reason, requested_by=current_user.full_name,
        status=TRANSFER_STATUS_PENDING,
    )
    db.add(t)
    _log(db, current_user, "TRANSFER_CREATE", "SKU", sku.id, sku.name,
         detail=f"Transfer {body.quantity} {sku.unit} from {body.from_department} to {body.to_department}")
    db.commit()
    db.refresh(t)
    return _transfer_to_out(t, sku.name)


@router.post("/transfers/{transfer_id}/approve", response_model=TransferOut)
def approve_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    t = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not t or t.status != TRANSFER_STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Transfer not pending")
    t.status = TRANSFER_STATUS_APPROVED
    t.approved_by = current_user.full_name
    t.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(t)
    sku = db.query(SKU).filter(SKU.id == t.sku_id).first()
    return _transfer_to_out(t, sku.name if sku else f"SKU#{t.sku_id}")


@router.post("/transfers/{transfer_id}/complete", response_model=TransferOut)
def complete_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    t = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not t or t.status != TRANSFER_STATUS_APPROVED:
        raise HTTPException(status_code=400, detail="Transfer must be approved first")
    t.status = TRANSFER_STATUS_COMPLETED
    t.completed_at = datetime.utcnow()
    _log(db, current_user, "TRANSFER_APPROVE", "SKU", t.sku_id,
         detail=f"Transfer completed: {t.quantity} units moved")
    db.commit()
    db.refresh(t)
    sku = db.query(SKU).filter(SKU.id == t.sku_id).first()
    return _transfer_to_out(t, sku.name if sku else f"SKU#{t.sku_id}")


@router.get("/transfers", response_model=List[TransferOut])
def list_transfers(
    status: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(StockTransfer)
    if status:
        query = query.filter(StockTransfer.status == status.upper())
    if department:
        query = query.filter(
            (StockTransfer.from_department == department) |
            (StockTransfer.to_department == department)
        )
    transfers = query.order_by(StockTransfer.created_at.desc()).limit(100).all()
    result = []
    for t in transfers:
        sku = db.query(SKU).filter(SKU.id == t.sku_id).first()
        result.append(_transfer_to_out(t, sku.name if sku else f"SKU#{t.sku_id}"))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# SUPPLIERS (FR-33 to FR-36)
# ══════════════════════════════════════════════════════════════════════════════

class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    notes: Optional[str] = None


class SupplierOut(BaseModel):
    id: int
    name: str
    contact_name: Optional[str]
    email: str
    phone: Optional[str]
    is_active: bool
    notes: Optional[str]
    created_at: str
    fill_rate: Optional[float] = None
    on_time_rate: Optional[float] = None

    class Config:
        from_attributes = True


def _supplier_scorecard(db: Session, supplier_name: str) -> Dict[str, Optional[float]]:
    """Calculate fill rate and on-time rate over last 90 days."""
    since = datetime.utcnow() - timedelta(days=90)
    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.supplier_name == supplier_name,
        PurchaseOrder.created_at >= since,
        PurchaseOrder.status.in_(["RECEIVED", "PARTIALLY_RECEIVED"]),
    ).all()
    if not pos:
        return {"fill_rate": None, "on_time_rate": None}

    total_ordered = sum(p.quantity for p in pos)
    total_received = sum(p.received_quantity or 0 for p in pos)
    fill_rate = (total_received / total_ordered * 100) if total_ordered > 0 else None

    on_time_count = sum(
        1 for p in pos
        if p.expected_delivery and p.received_at and p.received_at <= p.expected_delivery
    )
    total_with_dates = sum(1 for p in pos if p.expected_delivery and p.received_at)
    on_time_rate = (on_time_count / total_with_dates * 100) if total_with_dates > 0 else None

    return {"fill_rate": round(fill_rate, 1) if fill_rate else None,
            "on_time_rate": round(on_time_rate, 1) if on_time_rate else None}


@router.post("/suppliers", response_model=SupplierOut)
def create_supplier(
    body: SupplierCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    s = Supplier(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return SupplierOut(
        id=s.id, name=s.name, contact_name=s.contact_name, email=s.email,
        phone=s.phone, is_active=s.is_active, notes=s.notes,
        created_at=s.created_at.isoformat(),
    )


@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    suppliers = db.query(Supplier).order_by(Supplier.name).all()
    result = []
    for s in suppliers:
        sc = _supplier_scorecard(db, s.name)
        result.append(SupplierOut(
            id=s.id, name=s.name, contact_name=s.contact_name, email=s.email,
            phone=s.phone, is_active=s.is_active, notes=s.notes,
            created_at=s.created_at.isoformat(),
            fill_rate=sc["fill_rate"], on_time_rate=sc["on_time_rate"],
        ))
    return result


@router.patch("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in body.items():
        if hasattr(s, k):
            setattr(s, k, v)
    db.commit()
    db.refresh(s)
    sc = _supplier_scorecard(db, s.name)
    return SupplierOut(
        id=s.id, name=s.name, contact_name=s.contact_name, email=s.email,
        phone=s.phone, is_active=s.is_active, notes=s.notes,
        created_at=s.created_at.isoformat(),
        fill_rate=sc["fill_rate"], on_time_rate=sc["on_time_rate"],
    )


# ══════════════════════════════════════════════════════════════════════════════
# DELIVERY CALENDAR (FR-84 to FR-87)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/deliveries/calendar")
def delivery_calendar(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    supplier: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = date.today()
    start = datetime.strptime(date_from, "%Y-%m-%d") if date_from else datetime.combine(today, datetime.min.time())
    end = datetime.strptime(date_to, "%Y-%m-%d") if date_to else start + timedelta(days=14)

    query = db.query(PurchaseOrder).filter(
        PurchaseOrder.expected_delivery >= start,
        PurchaseOrder.expected_delivery <= end,
    )
    if supplier:
        query = query.filter(PurchaseOrder.supplier_name == supplier)
    if status:
        query = query.filter(PurchaseOrder.status == status.upper())

    pos = query.order_by(PurchaseOrder.expected_delivery).all()

    # Group by date
    calendar: Dict[str, List[Dict]] = {}
    for po in pos:
        day_key = po.expected_delivery.strftime("%Y-%m-%d")
        if day_key not in calendar:
            calendar[day_key] = []
        sku = db.query(SKU).filter(SKU.id == po.sku_id).first()
        calendar[day_key].append({
            "po_id": po.id,
            "po_number": po.po_number,
            "sku_name": sku.name if sku else f"SKU#{po.sku_id}",
            "supplier_name": po.supplier_name,
            "quantity": po.quantity,
            "total_cost": po.total_cost,
            "status": po.status,
            "expected_delivery": po.expected_delivery.isoformat(),
            "received_at": po.received_at.isoformat() if po.received_at else None,
        })

    return {"calendar": calendar, "total_deliveries": len(pos)}


# ══════════════════════════════════════════════════════════════════════════════
# DEMAND FORECAST (FR-18 to FR-21)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/forecast/{sku_id}")
def demand_forecast(
    sku_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sku = db.query(SKU).filter(SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    # Get last 90 days of sales
    since = datetime.utcnow() - timedelta(days=90)
    sales = (db.query(SalesHistory)
             .filter(SalesHistory.sku_id == sku_id, SalesHistory.sale_date >= since)
             .order_by(SalesHistory.sale_date)
             .all())

    if not sales:
        return {"sku_id": sku_id, "sku_name": sku.name, "has_data": False,
                "message": "Insufficient sales history for forecasting"}

    # Build daily sales dict
    daily: Dict[str, float] = {}
    for s in sales:
        d = s.sale_date.strftime("%Y-%m-%d")
        daily[d] = daily.get(d, 0.0) + s.units_sold

    values = list(daily.values())
    daily_avg = sum(values) / len(values) if values else 0

    # Day-of-week averages for seasonality
    dow_totals: Dict[int, float] = {i: 0.0 for i in range(7)}
    dow_counts: Dict[int, int] = {i: 0 for i in range(7)}
    for s in sales:
        dow = s.sale_date.weekday()
        dow_totals[dow] += s.units_sold
        dow_counts[dow] += 1
    dow_avg = {dow: (dow_totals[dow] / dow_counts[dow]) if dow_counts[dow] > 0 else daily_avg
               for dow in range(7)}

    # Generate 30-day forecast
    today = date.today()
    forecast_days = []
    for i in range(1, 31):
        future_date = today + timedelta(days=i)
        dow = future_date.weekday()
        predicted = dow_avg[dow]
        # Simple confidence interval: ±20% of daily avg
        margin = daily_avg * 0.2
        forecast_days.append({
            "date": future_date.isoformat(),
            "predicted": round(predicted, 2),
            "p10": round(max(0, predicted - margin), 2),
            "p90": round(predicted + margin, 2),
        })

    stock = db.query(StockLevel).filter(StockLevel.sku_id == sku_id).first()
    on_hand = stock.on_hand if stock else 0.0
    forecast_7d = sum(f["predicted"] for f in forecast_days[:7])
    forecast_30d = sum(f["predicted"] for f in forecast_days)

    return {
        "sku_id": sku_id,
        "sku_name": sku.name,
        "has_data": True,
        "daily_avg": round(daily_avg, 2),
        "on_hand": on_hand,
        "days_of_supply_forecast": round(on_hand / daily_avg, 1) if daily_avg > 0 else None,
        "forecast_7d_total": round(forecast_7d, 1),
        "forecast_30d_total": round(forecast_30d, 1),
        "forecast_days": forecast_days,
    }
