from datetime import datetime
from pydantic import BaseModel


class PurchaseOrderCreate(BaseModel):
    sku_id: int
    quantity: float
    notes: str = ""


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    sku_id: int
    sku_name: str
    sku_code: str
    quantity: float
    unit_cost: float
    total_cost: float
    supplier_name: str
    status: str
    notes: str
    created_at: datetime
    expected_delivery: datetime | None

    model_config = {"from_attributes": True}
