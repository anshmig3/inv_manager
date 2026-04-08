from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SKU
from app.schemas.sku import SKUCardOut, SKUDetailOut
from app.services.inventory_monitor import get_sku_card, get_sku_detail

router = APIRouter(prefix="/api/skus", tags=["skus"])


@router.get("", response_model=list[SKUCardOut])
def list_skus(
    category: str | None = Query(None),
    status: str | None = Query(None),
    promo: bool | None = Query(None),
    search: str | None = Query(None),
    sort_by: str = Query("status"),   # status | dos | name
    db: Session = Depends(get_db),
):
    query = db.query(SKU)
    if category:
        query = query.filter(SKU.category == category)
    if search:
        query = query.filter(SKU.name.ilike(f"%{search}%") | SKU.sku_code.ilike(f"%{search}%"))

    skus = query.all()
    cards = [get_sku_card(db, s) for s in skus]

    if status:
        cards = [c for c in cards if c.card_status == status.upper()]
    if promo is not None:
        cards = [c for c in cards if c.has_active_promo == promo]

    status_order = {"CRITICAL": 0, "WARNING": 1, "WATCH": 2, "HEALTHY": 3}
    if sort_by == "status":
        cards.sort(key=lambda c: (status_order.get(c.card_status, 9), c.days_of_supply))
    elif sort_by == "dos":
        cards.sort(key=lambda c: c.days_of_supply)
    elif sort_by == "name":
        cards.sort(key=lambda c: c.name.lower())

    return cards


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(SKU.category).distinct().order_by(SKU.category).all()
    return [r[0] for r in rows]


@router.get("/{sku_id}", response_model=SKUDetailOut)
def get_sku(sku_id: int, db: Session = Depends(get_db)):
    sku = db.query(SKU).filter(SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return get_sku_detail(db, sku)
