from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert
from app.models.alert import ALERT_ACKNOWLEDGED, ALERT_IN_PROGRESS, ALERT_RESOLVED
from app.models.user import ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD
from app.schemas.sku import AlertOut
from app.services.alert_engine import run_alert_scan
from app.core.security import get_current_user, require_roles

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AcknowledgeRequest(BaseModel):
    note: Optional[str] = None


class AssignRequest(BaseModel):
    assigned_to: str
    note: Optional[str] = None


class ResolveRequest(BaseModel):
    resolution_action: str


@router.get("", response_model=List[AlertOut])
def list_alerts(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Alert).filter(Alert.is_active == True)
    if status:
        query = query.filter(Alert.status == status.upper())
    return query.order_by(Alert.created_at.desc()).all()


@router.post("/scan", status_code=202)
def trigger_scan(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER)),
):
    run_alert_scan(db)
    return {"message": "Alert scan completed."}


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    body: AcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != "OPEN":
        raise HTTPException(status_code=400, detail=f"Alert is already {alert.status}")

    alert.status = ALERT_ACKNOWLEDGED
    alert.acknowledged_by = current_user.full_name
    alert.acknowledged_at = datetime.utcnow()
    if body.note:
        alert.assignment_note = body.note
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/{alert_id}/assign", response_model=AlertOut)
def assign_alert(
    alert_id: int,
    body: AssignRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Auto-acknowledge if still OPEN
    if alert.status == "OPEN":
        alert.status = ALERT_ACKNOWLEDGED
        alert.acknowledged_by = current_user.full_name
        alert.acknowledged_at = datetime.utcnow()

    alert.status = ALERT_IN_PROGRESS
    alert.assigned_to = body.assigned_to
    alert.assigned_at = datetime.utcnow()
    if body.note:
        alert.assignment_note = body.note
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    body: ResolveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD)),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status == ALERT_RESOLVED:
        raise HTTPException(status_code=400, detail="Alert is already resolved")

    alert.status = ALERT_RESOLVED
    alert.is_active = False
    alert.resolved_by = current_user.full_name
    alert.resolved_at = datetime.utcnow()
    alert.resolution_action = body.resolution_action
    db.commit()
    db.refresh(alert)
    return alert
