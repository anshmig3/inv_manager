from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SKU, PurchaseOrder
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderOut

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])


def _po_number() -> str:
    return f"PO-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"


@router.post("", response_model=PurchaseOrderOut, status_code=201)
def create_po(body: PurchaseOrderCreate, db: Session = Depends(get_db)):
    sku = db.query(SKU).filter(SKU.id == body.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    qty = body.quantity if body.quantity > 0 else sku.reorder_qty
    total = round(qty * sku.unit_cost, 2)
    expected = datetime.utcnow() + timedelta(days=sku.lead_time_days)

    po = PurchaseOrder(
        sku_id=sku.id,
        po_number=_po_number(),
        quantity=qty,
        unit_cost=sku.unit_cost,
        total_cost=total,
        supplier_name=sku.supplier_name,
        status="DRAFT",
        notes=body.notes,
        expected_delivery=expected,
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    return PurchaseOrderOut(
        id=po.id,
        po_number=po.po_number,
        sku_id=sku.id,
        sku_name=sku.name,
        sku_code=sku.sku_code,
        quantity=po.quantity,
        unit_cost=po.unit_cost,
        total_cost=po.total_cost,
        supplier_name=po.supplier_name,
        status=po.status,
        notes=po.notes,
        created_at=po.created_at,
        expected_delivery=po.expected_delivery,
    )


@router.get("", response_model=list[PurchaseOrderOut])
def list_pos(db: Session = Depends(get_db)):
    pos = db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()
    result = []
    for po in pos:
        sku = db.query(SKU).filter(SKU.id == po.sku_id).first()
        result.append(PurchaseOrderOut(
            id=po.id,
            po_number=po.po_number,
            sku_id=po.sku_id,
            sku_name=sku.name if sku else "",
            sku_code=sku.sku_code if sku else "",
            quantity=po.quantity,
            unit_cost=po.unit_cost,
            total_cost=po.total_cost,
            supplier_name=po.supplier_name,
            status=po.status,
            notes=po.notes,
            created_at=po.created_at,
            expected_delivery=po.expected_delivery,
        ))
    return result
