from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.database import engine, SessionLocal
from app.models import SKU, StockLevel, SalesHistory, Alert, Promotion, ExpiryBatch, PurchaseOrder  # noqa: F401 — register models
from app.database import Base
from app.seed_data import seed
from app.services.alert_engine import run_alert_scan
from app.api import skus, alerts, dashboard, chat, purchase_orders


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed demo data
    db = SessionLocal()
    try:
        seed(db)
        run_alert_scan(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Grocery Inventory Manager",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(skus.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(purchase_orders.router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
