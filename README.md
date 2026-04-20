# GroceryIQ — Inventory Management Platform

An AI-powered grocery store inventory management application with role-based access control, alert lifecycle management, and a natural language assistant powered by Claude.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.9 or 3.10 | https://www.python.org/downloads/ |
| Node.js | 18 or higher | https://nodejs.org/ |
| Git | any | https://git-scm.com/ |

> **Windows users:** all commands below use Command Prompt (`cmd`). If you use PowerShell, replace `set` with `$env:VAR="value"` where applicable.

---

## Setup & Run

### 1. Clone the repo

```bash
git clone https://github.com/anshmig3/inv_manager.git
cd inv_manager
```

---

### 2. Backend

#### Mac / Linux
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

#### Windows (Command Prompt)
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

#### Configure environment

Open `backend/.env` and add your API key:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
JWT_SECRET=change-me-to-a-long-random-string
```

Get an Anthropic API key at https://console.anthropic.com

#### Start the backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API runs at **http://localhost:8000** — auto-seeds 30 SKUs and 4 demo users on first run.

---

### 3. Frontend

Open a **new terminal window** for this step.

```bash
cd frontend
npm install
npm run dev
```

UI runs at **http://localhost:5173**

---

## Demo Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@groceryiq.com | Admin1234! | Full access + user management |
| Store Manager | manager@groceryiq.com | Manager123! | Inventory + alert management |
| Dept Head | dairy@groceryiq.com | Dairy1234! | Department-scoped view |
| Floor Staff | staff@groceryiq.com | Staff1234! | Read + acknowledge alerts |

---

## Features (Phase 1)

### Inventory
- **SKU Card Grid** — color-coded cards (Critical / Warning / Watch / Healthy) for all 30 SKUs
- **Detail Panel** — sales stats, days of supply, promo dates, expiry batches, purchase order creation
- **Filter & Sort** — by category, status, active promo, or search by name / SKU code
- **Dashboard Summary** — live counts of critical, stockout, low stock, near-expiry, and promo SKUs

### Alerts
- **Alert Engine** — auto-detects stockouts, low stock, near-expiry, promo shortfalls
- **Lifecycle Management** — OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED with full audit trail
- **Assign & Resolve** — assign alerts to team members with notes; resolve with action description
- **Status Filters** — filter by status with per-status counts

### AI Assistant
- **Natural Language Chat** — ask questions like "What should I order today?" or "Which items expire this week?"
- **Live Inventory Context** — responses grounded in real-time stock, alert, and promo data
- **Markdown Rendering** — structured responses with bold, lists, and tables
- **Suggested Actions** — clickable follow-up suggestions after each response

### Auth & Access Control
- **JWT Authentication** — secure login with 8-hour token expiry
- **Role-Based Access** — ADMIN, STORE_MANAGER, DEPT_HEAD, FLOOR_STAFF, READ_ONLY
- **User Management** — admins can create users, change roles, activate/deactivate accounts

### Notifications
- **Notification Preferences** — per-channel (Email, In-App, SMS) × per-severity (Critical/High/Medium/Low) toggles
- **Quiet Hours** — configurable do-not-disturb window per channel
- **Digest Frequency** — Immediate, Hourly, or Daily digest per channel

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.9, FastAPI, SQLAlchemy 2.0, SQLite |
| Auth | JWT (python-jose), bcrypt (passlib) |
| LLM | Claude claude-sonnet-4-6 via Anthropic SDK |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Markdown | react-markdown, remark-gfm, @tailwindcss/typography |

---

## Troubleshooting

**`venv\Scripts\activate` is not recognized (Windows)**
Run this first: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**`python` not found (Mac/Linux)**
Use `python3` instead of `python`.

**Port already in use**
- Backend: `uvicorn app.main:app --port 8001 --reload` then update frontend proxy
- Frontend: Vite will automatically try the next available port (5174, 5175…)

**AI chat returns "Sorry, I could not reach the inventory service"**
Your `ANTHROPIC_API_KEY` in `backend/.env` is missing or invalid. Check https://console.anthropic.com for a valid key with credits.

**Database schema errors after pulling new code**
Delete `backend/inventory.db` and restart the backend — it will recreate and reseed automatically.
