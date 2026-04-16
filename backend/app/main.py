from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.database import engine, SessionLocal
from app.models import SKU, StockLevel, SalesHistory, Alert, Promotion, ExpiryBatch, PurchaseOrder  # noqa: F401
from app.models.user import User, NotificationPreference  # noqa: F401
from app.database import Base
from app.seed_data import seed
from app.services.alert_engine import run_alert_scan
from app.api import skus, alerts, dashboard, chat, purchase_orders
from app.api.auth import router as auth_router, users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(skus.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(purchase_orders.router)


@app.get("/health")
def health():
    return {"status": "ok"}
