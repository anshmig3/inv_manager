from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert
from app.schemas.sku import AlertOut
from app.services.alert_engine import run_alert_scan

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(Alert.is_active == True).order_by(Alert.created_at.desc()).all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.post("/scan", status_code=202)
def trigger_scan(db: Session = Depends(get_db)):
    """Manually trigger an alert scan (normally runs on schedule)."""
    run_alert_scan(db)
    return {"message": "Alert scan completed."}
