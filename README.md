# GroceryIQ — Inventory Management LLM Agent (Phase 1)

An agentic LLM application for grocery store inventory management.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```
API runs at `http://localhost:8000`. Auto-seeds 30 SKUs with realistic data on first run.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
UI runs at `http://localhost:5173`.

## Phase 1 Features
- **SKU Card Grid** — color-coded cards (red/amber/yellow/green) for all 30 SKUs
- **Click-to-expand detail panel** — sales stats, Days of Supply, promo dates, expiry batches, action buttons
- **Alert Engine** — auto-detects stockouts, low stock, near-expiry, promo shortfalls
- **Dashboard summary bar** — critical/warning/watch/healthy counts at a glance
- **Filter & Sort** — by category, status, promo, or search by name/SKU code
- **NL Chat Interface** — ask questions like "What should I order today?" powered by Claude
- **Draft PO** — one-click purchase order creation from any SKU detail panel

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0, SQLite |
| LLM | Claude claude-sonnet-4-6 (Anthropic SDK) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
