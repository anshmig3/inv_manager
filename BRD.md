# Business Requirements Document (BRD)
## Grocery Store Inventory Management — LLM Agentic Application

**Version:** 1.2  
**Date:** 2026-04-15  
**Status:** Draft  
**Change Log:**
- v1.1 — Added SKU Card UI requirements (FR-48 to FR-56); moved to Phase 1
- v1.2 — Added missing manager workflows: User Auth & RBAC (FR-57–65), Alert Acknowledgment (FR-66–72), Stock Adjustment & Cycle Count (FR-73–78), Capacity & Storage (FR-79–83), Delivery Calendar (FR-84–87), Shrinkage & Disposal Workflow (FR-88–93), Inter-Department Transfers (FR-94–97), Price & Cost Management (FR-98–102), Notification Preferences (FR-103–106), Audit Log Viewer (FR-107–110), Onboarding & Data Import (FR-111–115). Expanded underspecified FRs. Redefined delivery from 3 to 4 phases. Added RBAC permission matrix.

---

## 1. Executive Summary

This document defines the business requirements for an LLM-powered agentic application that assists grocery store managers with end-to-end inventory management. The system acts as an intelligent assistant capable of monitoring stock levels, predicting demand, flagging issues proactively, coordinating with supplier workflows, and aligning purchasing decisions with promotional calendars — all through a natural-language conversational interface.

---

## 2. Business Context & Problem Statement

Grocery store managers currently face:

- Manual, reactive stock monitoring (issues noticed after they occur)
- Misalignment between purchasing cycles and promotional events
- Significant shrinkage from expired or near-expiry products
- Over-ordering leading to waste, and under-ordering causing lost sales
- Fragmented data across POS systems, supplier portals, and promo calendars
- Time-consuming reporting that delays decision-making
- No structured workflow for alert acknowledgment, stock corrections, or disposal logging
- No visibility into delivery schedules or inter-department stock movements

An agentic LLM application consolidates these concerns into a single intelligent interface that monitors, reasons, and acts on behalf of the store manager.

---

## 3. Goals & Objectives

| # | Objective | Success Metric |
|---|-----------|----------------|
| 1 | Eliminate stockouts for top-200 SKUs | < 1% stockout rate |
| 2 | Reduce food waste from expiry | 20% reduction in shrinkage |
| 3 | Align stock levels to promo calendar | 100% promo SKUs pre-stocked ≥ 5 days before event |
| 4 | Automate routine reorder suggestions | ≥ 80% of reorders auto-suggested with manager approval |
| 5 | Provide real-time inventory visibility | Dashboard refresh ≤ 15 min |
| 6 | Support manager decision-making via NL queries | Query-to-answer latency < 10 sec |
| 7 | Ensure all alerts are actioned, not just seen | 100% of Critical alerts acknowledged within 2 hours |
| 8 | Reduce stock discrepancies from manual errors | < 2% variance between system stock and physical count |

---

## 4. Stakeholders

| Role | Responsibility |
|------|---------------|
| Store Manager | Primary user; approves orders, reviews alerts, manages stock adjustments |
| Department Heads | Receive department-level alerts, acknowledge and assign tasks to floor staff |
| Floor Staff | Act on FIFO reminders, receive disposal and rotation tasks |
| Procurement / Buyers | Receive generated purchase orders |
| Store Owner / Regional Manager | Access to performance dashboards, reports, and audit logs |
| Suppliers | Receive automated order requests (via integration) |
| IT / System Admin | Manages integrations, user accounts, and system health |

---

## 5. Scope

### 5.1 In Scope
- Real-time inventory monitoring and alerting
- User authentication and role-based access control
- Alert acknowledgment, assignment, and escalation workflows
- Expiry and near-expiry tracking with disposal logging
- Promotion calendar integration and demand uplift modeling
- Automated reorder recommendations and draft purchase orders
- Delivery calendar and PO tracking
- Supplier communication drafting and performance tracking
- Natural language query interface for ad-hoc reporting
- Shrinkage and waste tracking with disposal workflows
- Demand forecasting (7-day and 30-day horizon)
- Stock adjustment and cycle count workflows
- Inter-department stock transfers
- Price and cost management
- Receiving / goods-in reconciliation assistance
- Anomaly detection (unexpected consumption spikes, theft indicators)
- Audit log viewer
- Bulk onboarding and data import

### 5.2 Out of Scope
- Full autonomous order placement without manager approval (all phases)
- POS hardware integration (assumed data feed exists)
- Customer-facing features
- Multi-store orchestration (Phase 4 only)
- Financial accounting / ERP reconciliation (integration only, not full accounting)
- Label printing / barcode scanning hardware

---

## 6. Functional Requirements

### 6.1 Inventory Monitoring & Alerting

| ID | Requirement |
|----|-------------|
| FR-01 | System shall monitor current stock levels for all SKUs in real time via POS/WMS data feed |
| FR-02 | System shall generate a **Low Stock Alert** when a SKU falls below its reorder point |
| FR-03 | System shall generate a **Stockout Alert** immediately when on-hand quantity reaches zero |
| FR-04 | System shall classify alerts by severity: Critical (stockout), High (≤ 1 day supply), Medium (≤ reorder point), Low (trending toward reorder) |
| FR-05 | System shall surface alerts via in-app notifications, email digest, and SMS. Each user shall configure per-channel preferences, quiet hours (e.g., no SMS between 22:00–07:00), and digest frequency (real-time / hourly / daily) via a Notification Preferences screen |
| FR-06 | System shall suppress duplicate alerts and auto-resolve when stock is replenished; resolved alerts shall be archived with timestamp and resolution reason |

### 6.2 Expiry & Freshness Management

| ID | Requirement |
|----|-------------|
| FR-07 | System shall ingest batch/lot expiry dates from receiving records or supplier data feeds |
| FR-08 | System shall generate **Near-Expiry Alerts** at configurable thresholds (default: 3 days and 7 days before expiry) |
| FR-09 | System shall recommend markdown pricing or donation for near-expiry items. Recommendations shall include: suggested markdown % based on days remaining and daily velocity, estimated units to clear, and a one-click "Apply Markdown" action that logs the decision |
| FR-10 | System shall generate FIFO rotation reminders assigned to a named floor staff member, with acknowledgment required before the reminder is cleared |
| FR-11 | System shall log expired-item disposals. Each disposal record shall capture: SKU, quantity, batch number, disposal reason (expired / damaged / contaminated / theft), disposal method (bin / donate / return to supplier), actioned by, and timestamp. Shrinkage shall be aggregated by category, department, and time period |

### 6.3 Promotion Calendar Integration

| ID | Requirement |
|----|-------------|
| FR-12 | System shall ingest the store's promotional calendar (weekly ads, seasonal events, holidays) via CSV upload or API |
| FR-13 | System shall calculate expected demand uplift per SKU per promotion event using historical sales data. Uplift model shall factor in: promotion type (% off, BOGOF, feature placement), historical uplift for same SKU in prior events, and seasonal baseline |
| FR-14 | System shall generate **Pre-Promo Stock Alerts** when projected stock at promotion start date will be insufficient. Alert shall trigger ≥ 5 days before event start |
| FR-15 | System shall recommend incremental order quantities aligned to promotion start dates, factoring in supplier lead time |
| FR-16 | System shall flag SKUs that are on promotion but currently low or out of stock with a PROMO-SHORTFALL severity alert |
| FR-17 | System shall produce a "Promotion Readiness Report" per event containing: list of promoted SKUs, current D/S, projected D/S at event start, shortfall quantity, recommended order quantity, and readiness status (Ready / At Risk / Critical) |

### 6.4 Demand Forecasting

| ID | Requirement |
|----|-------------|
| FR-18 | System shall generate 7-day and 30-day demand forecasts per SKU using historical POS data (minimum 90 days history required) |
| FR-19 | Forecasts shall account for: seasonality, day-of-week effects, public holidays, and active promotions. Weather data integration is optional and additive |
| FR-20 | System shall surface confidence intervals (P10–P90 range) alongside point forecasts |
| FR-21 | System shall allow managers to manually adjust forecast assumptions via chat (e.g., "Assume 30% uplift for dairy next week") and log the override with reason |

### 6.5 Reorder & Purchase Order Management

| ID | Requirement |
|----|-------------|
| FR-22 | System shall auto-generate reorder recommendations when stock triggers reorder point |
| FR-23 | Recommendations shall include: SKU, current stock, days of supply, reorder quantity, suggested supplier, MOQ check, estimated cost, and AI rationale |
| FR-24 | System shall draft purchase orders containing: PO number, date, supplier details, line items (SKU, description, quantity, unit cost, line total), delivery address, requested delivery date, and total value. POs shall be exportable as PDF |
| FR-25 | Upon manager approval, system shall transmit PO to supplier via email (SMTP) with PDF attachment, or EDI 850 for integrated suppliers |
| FR-26 | System shall track PO status through: DRAFT → APPROVED → SENT → ACKNOWLEDGED → IN_TRANSIT → RECEIVED / PARTIALLY_RECEIVED |
| FR-27 | System shall alert manager if an expected delivery is overdue (past expected delivery date with status not RECEIVED), with escalation to store owner if overdue by > 48 hours |

### 6.6 Natural Language Query Interface

| ID | Requirement |
|----|-------------|
| FR-28 | Manager shall be able to ask free-text questions such as: "What products are running low in dairy?", "What should I order before the weekend sale?", "Show me items expiring this week" |
| FR-29 | System shall interpret intent, query relevant structured data, and respond in plain language with supporting data tables. LLM shall never fabricate inventory quantities — all facts must be sourced from the database |
| FR-30 | System shall support follow-up questions maintaining conversational context for the duration of the session |
| FR-31 | System shall explain its reasoning when making recommendations (e.g., "I recommend ordering 144 units because daily average is 48, lead time is 2 days, and promo starts in 4 days") |
| FR-32 | System shall support voice input (speech-to-text) as an optional channel on mobile |

### 6.7 Supplier Management

| ID | Requirement |
|----|-------------|
| FR-33 | System shall maintain a supplier catalog with: supplier name, contact name, email, phone, lead times per SKU, MOQ per SKU, contracted unit price, and active/inactive status. Managers shall be able to add, edit, and deactivate suppliers via UI |
| FR-34 | System shall draft supplier communication (emails, order confirmations, chaser emails for overdue deliveries) on manager's behalf via AI, with manager review before sending |
| FR-35 | System shall track supplier performance per rolling 90-day window: fill rate (units received / units ordered), on-time delivery rate (deliveries on or before expected date / total deliveries), and price accuracy rate (invoiced price matches PO price). Performance shall be displayed on a supplier scorecard |
| FR-36 | System shall recommend alternate suppliers for a SKU when: primary supplier fill rate drops below 80%, primary supplier has 2+ consecutive late deliveries, or primary supplier is marked inactive |

### 6.8 Receiving & Goods-In

| ID | Requirement |
|----|-------------|
| FR-37 | System shall assist with receiving by displaying the expected PO contents (SKU, description, ordered quantity) alongside an editable received quantity field |
| FR-38 | System shall flag discrepancies at receiving: short shipments (received < ordered by > 5%), wrong items (SKU mismatch), and damaged goods (manager-reported). Discrepancies shall auto-generate a supplier claim notification draft |
| FR-39 | System shall update on-hand inventory upon manager confirmation of receipt. Partial receipts shall update stock proportionally and retain the PO in PARTIALLY_RECEIVED status |
| FR-40 | System shall capture batch/lot numbers and expiry dates for each received line item and link them to the corresponding ExpiryBatch records |

### 6.9 Anomaly Detection

| ID | Requirement |
|----|-------------|
| FR-41 | System shall detect unexpected consumption spikes: daily consumption > 2.5× the 30-day rolling average for a SKU, flagged as ANOMALY_SPIKE with recommended actions (verify POS data, check for theft or scanning errors) |
| FR-42 | System shall flag SKUs whose monthly shrinkage rate exceeds 3% of units received, with a breakdown by disposal reason |
| FR-43 | System shall detect supplier invoice price deviations: any invoice line item priced > 5% above the contracted unit price shall trigger a PRICE_DEVIATION alert requiring manager sign-off before payment approval |

### 6.10 SKU Card UI

The primary inventory view presents each SKU as an interactive card. This is the default landing screen for the store manager.

#### Card Summary View (collapsed)

| ID | Requirement |
|----|-------------|
| FR-48 | Each SKU shall be represented as a card displaying: SKU name, product image thumbnail (if available), current on-hand quantity, Days of Supply (D/S), and a status badge (Healthy / Watch / Warning / Critical) |
| FR-49 | Cards shall be color-coded by status: Critical — red border + red tint; Warning — amber border + amber tint; Watch — yellow border; Healthy — green border |
| FR-50 | A promo indicator badge ("PROMO") shall be visible on the card face whenever the SKU has an active or upcoming promotion within the next 14 days |
| FR-51 | The card grid shall support filtering by: department/category, alert severity, promo status (on promo / not on promo), and Days of Supply range |
| FR-52 | Cards shall be sortable by: alert severity (default), Days of Supply (ascending), SKU name (A–Z), and last-updated timestamp |
| FR-53 | The card grid shall support a text search bar to find SKUs by name or SKU code |

#### Card Detail View (on click / tap)

| ID | Requirement |
|----|-------------|
| FR-54 | Clicking a card shall expand an inline detail panel (or modal) without leaving the grid view |
| FR-55 | The detail panel shall display: SKU name and code, status badge, active alerts, stock (on-hand, on-order, reorder point, reorder qty), days of supply (current and post-PO), sales stats (daily avg, weekly, 30-day), promotion details (name, dates, expected uplift), expiry batches, and supplier info |
| FR-56 | The detail panel shall include contextual action buttons: **"Request Stock Increase"** (generates a reorder recommendation), **"Draft PO"** (opens the PO workflow), **"Mark as Reviewed"** (dismisses alert for the current session), and **"Ask AI"** (opens the NL chat pre-filled with the SKU context) |

#### Color-coding Reference

| State | Card Color | Trigger Condition |
|-------|-----------|-------------------|
| Critical (red) | Red border + red tint | Stockout OR Days of Supply = 0 OR item expired OR on-promo SKU with D/S < 1 |
| Warning (amber) | Amber border + amber tint | D/S ≤ 3 days OR expiry within 3 days OR on-promo SKU with D/S < promo duration |
| Watch (yellow) | Yellow border | Approaching reorder point OR expiry within 7 days |
| Healthy (green) | Green border | All thresholds met; no active alerts |

---

### 6.11 Reporting & Dashboards

| ID | Requirement |
|----|-------------|
| FR-44 | System shall provide a real-time inventory dashboard showing: stock level summary, alert counts by severity, days-of-supply distribution per category, and top-10 at-risk SKUs |
| FR-45 | System shall generate a daily automated digest (email and/or in-app) summarising: new Critical/High alerts, alerts resolved since last digest, POs sent and overdue, and top action items for the day |
| FR-46 | System shall produce a weekly performance report containing: total shrinkage cost by category, stockout incidents (count and affected SKUs), promo readiness score (% of promo SKUs fully stocked on event start date), and supplier on-time delivery rate. Report delivered via email and available in-app |
| FR-47 | System shall allow custom report generation via natural language (e.g., "Generate a report of all dairy items with < 3 days of supply") with results exportable as CSV |

---

### 6.12 User Management & Authentication

| ID | Requirement |
|----|-------------|
| FR-57 | System shall require all users to authenticate before accessing any feature. Authentication shall support email + password and optionally SSO (Google Workspace / Microsoft 365) |
| FR-58 | Passwords shall meet minimum security requirements: ≥ 12 characters, mixed case, number, and special character. Bcrypt hashing required at rest |
| FR-59 | System shall support a self-service password reset flow via email verification link (valid for 1 hour) |
| FR-60 | System shall enforce role-based access control (RBAC) with the following roles: **Admin**, **Store Manager**, **Department Head**, **Floor Staff**, and **Read-Only** (owner/regional). See Section 6.12.1 for permission matrix |
| FR-61 | Admin shall be able to create, edit, deactivate, and assign roles to users via a User Management screen |
| FR-62 | Sessions shall expire after 8 hours of inactivity. Users shall be warned 5 minutes before expiry with an option to extend |
| FR-63 | System shall log all login attempts (successful and failed) with IP address and timestamp. Three consecutive failed logins shall trigger a 15-minute account lockout |
| FR-64 | Department Head accounts shall be scoped to one or more departments; they shall only see SKUs, alerts, and reports for their assigned departments |
| FR-65 | Floor Staff accounts shall have read-only access to their department's SKU cards and shall receive task assignments (FIFO reminders, disposal confirmations) only |

#### 6.12.1 RBAC Permission Matrix

| Feature | Admin | Store Manager | Dept Head | Floor Staff | Read-Only |
|---------|-------|--------------|-----------|-------------|-----------|
| View SKU cards & dashboard | ✅ | ✅ | ✅ (dept only) | ✅ (dept only) | ✅ |
| Acknowledge / assign alerts | ✅ | ✅ | ✅ (dept only) | ❌ | ❌ |
| Create / approve POs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Adjust stock manually | ✅ | ✅ | ✅ (dept only) | ❌ | ❌ |
| Log disposal / shrinkage | ✅ | ✅ | ✅ (dept only) | ✅ (dept only) | ❌ |
| Create inter-dept transfers | ✅ | ✅ | ✅ (own dept) | ❌ | ❌ |
| Manage suppliers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage promotions | ✅ | ✅ | ❌ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ (dept only) | ❌ | ✅ |
| Export data (CSV/PDF) | ✅ | ✅ | ✅ | ❌ | ✅ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ✅ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure notification prefs | ✅ | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| Use NL chat | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 6.13 Alert Acknowledgment & Assignment

| ID | Requirement |
|----|-------------|
| FR-66 | Every alert shall have a lifecycle: **Open → Acknowledged → In Progress → Resolved**. Alerts may not skip directly from Open to Resolved without acknowledgment |
| FR-67 | Store Manager and Department Head shall be able to acknowledge an alert (marking it seen) and optionally assign it to a named staff member with a free-text note |
| FR-68 | Assigned staff shall receive an in-app notification and optional SMS/email with the alert details and note |
| FR-69 | System shall escalate any Critical alert that remains unacknowledged for more than 2 hours: first to Store Manager via SMS, then to Store Owner after a further 2 hours |
| FR-70 | Resolved alerts shall be archived with: resolved by, resolution timestamp, resolution action taken (free text), and time-to-resolution |
| FR-71 | Dashboard shall display a KPI tile showing: alerts acknowledged within SLA (< 2 hours for Critical) as a percentage, updated daily |
| FR-72 | System shall produce a weekly Alert Response Report: total alerts by severity, average time-to-acknowledge, average time-to-resolve, and top 5 SKUs by alert frequency |

---

### 6.14 Stock Adjustment & Cycle Count

| ID | Requirement |
|----|-------------|
| FR-73 | Store Manager and Department Head shall be able to manually adjust the on-hand quantity for any SKU. Each adjustment shall require: adjusted quantity, adjustment reason (physical count correction / damaged / theft / data entry error / other), and a reference note |
| FR-74 | All stock adjustments shall be logged in the audit trail with: user, SKU, before and after quantity, reason, and timestamp |
| FR-75 | System shall support a **Cycle Count** workflow: manager selects a category or set of SKUs, system generates a count sheet (SKU, expected quantity), floor staff enter physical counts, and system calculates and displays variances before the manager confirms the adjustment |
| FR-76 | Cycle count sessions shall be lockable during counting (read-only for the selected SKUs) to prevent concurrent changes |
| FR-77 | System shall flag SKUs with a variance > 5% between system stock and physical count as requiring manager sign-off before update |
| FR-78 | Cumulative stock adjustment history per SKU shall be accessible from the SKU detail panel |

---

### 6.15 Capacity & Storage Management

| ID | Requirement |
|----|-------------|
| FR-79 | Each SKU shall have an optional **maximum stock level** (shelf/storage capacity) in addition to the reorder point |
| FR-80 | System shall warn when a recommended order quantity would cause on-hand + on-order to exceed maximum stock level, and adjust the recommendation accordingly |
| FR-81 | Each SKU shall have an optional **storage location** field (e.g., aisle, shelf number, cold room zone) displayed on the SKU card and detail panel |
| FR-82 | System shall flag SKUs where current stock exceeds maximum stock level as OVERSTOCK status |
| FR-83 | Dashboard shall include an Overstock count tile alongside Critical / Warning / Watch / Healthy counts |

---

### 6.16 Delivery Calendar

| ID | Requirement |
|----|-------------|
| FR-84 | System shall provide a **Delivery Calendar** view showing all expected PO deliveries by date, with supplier name, PO number, total value, and status badge |
| FR-85 | Each day in the calendar shall show a summary count of: deliveries due, deliveries overdue, and deliveries received |
| FR-86 | Clicking a delivery in the calendar shall open the PO detail and allow the manager to update its status or begin the receiving workflow |
| FR-87 | Manager shall be able to filter the delivery calendar by supplier, status, or department |

---

### 6.17 Shrinkage & Disposal Workflow

| ID | Requirement |
|----|-------------|
| FR-88 | System shall provide a **Disposal Log** screen where managers and floor staff log expired, damaged, or stolen inventory |
| FR-89 | Each disposal entry shall capture: SKU, batch number (if applicable), quantity disposed, disposal reason (expired / damaged / contaminated / theft / other), disposal method (bin / donate / return to supplier), actioned by, and timestamp |
| FR-90 | Upon logging a disposal, system shall automatically decrement on-hand quantity and link the disposal to the relevant ExpiryBatch record if applicable |
| FR-91 | Disposals caused by theft or unexplained loss shall auto-generate an ANOMALY alert for manager review |
| FR-92 | System shall calculate and display a **Shrinkage Report** per category and per period showing: total units disposed, total cost of disposal, disposal reason breakdown (pie chart), and trend vs prior period |
| FR-93 | System shall enforce a **disposal approval** workflow for write-offs above a configurable cost threshold (default: £50 per event): disposals above threshold require Store Manager or Admin approval before stock is decremented |

---

### 6.18 Inter-Department Stock Transfers

| ID | Requirement |
|----|-------------|
| FR-94 | Department Head or Store Manager shall be able to raise a **Stock Transfer Request**: source department, destination department, SKU, quantity, and reason |
| FR-95 | Transfer requests shall require approval from the manager of the source department before stock is moved |
| FR-96 | Upon approval, system shall decrement source department stock and increment destination department stock, logging the transfer in the audit trail |
| FR-97 | Pending and completed transfer requests shall be visible in a Transfer History screen, filterable by department and date |

---

### 6.19 Price & Cost Management

| ID | Requirement |
|----|-------------|
| FR-98 | Each SKU shall maintain a **cost price history**: list of unit costs with effective date, changed by, and reason (supplier price change / contract renewal / spot purchase) |
| FR-99 | Manager shall be able to update the unit cost for a SKU. The change shall be effective immediately for new POs; existing open POs shall not be retroactively updated |
| FR-100 | System shall alert manager when a supplier invoice price for any line item deviates > 5% from the current contracted unit cost (expanding on FR-43). Alert shall include: SKU, expected price, invoiced price, variance %, and a link to raise a dispute |
| FR-101 | System shall support optional **budget caps** per category per calendar month (e.g., Dairy budget = £5,000/month). When cumulative PO spend for a category exceeds 80% of the budget, a BUDGET_WARNING alert shall be generated |
| FR-102 | System shall display a **Spend Dashboard** tile showing: month-to-date PO spend by category vs budget, with green/amber/red status bands |

---

### 6.20 Notification Preferences

| ID | Requirement |
|----|-------------|
| FR-103 | Each user shall have a **Notification Preferences** screen accessible from their profile |
| FR-104 | Preferences shall be configurable per alert severity and channel: in-app, email, SMS. Users may disable any channel for any severity band (e.g., Low severity alerts: in-app only) |
| FR-105 | Users shall be able to set **quiet hours** per channel (e.g., no SMS between 22:00–07:00). Critical alerts shall override quiet hours by default, with an opt-out toggle |
| FR-106 | Users shall be able to choose digest frequency per channel: real-time, hourly digest, or daily digest (08:00 local time) |

---

### 6.21 Audit Log Viewer

| ID | Requirement |
|----|-------------|
| FR-107 | System shall maintain an immutable audit log of all significant actions: user login/logout, stock adjustments, disposal entries, PO creation/approval/transmission, alert acknowledgments, user management changes, and AI recommendations accepted or dismissed |
| FR-108 | Store Manager and Admin shall be able to access the Audit Log Viewer: a searchable, filterable table of log entries showing: timestamp, user, action type, affected entity (SKU / PO / user), before/after values, and source (user action or AI recommendation) |
| FR-109 | Audit log shall support filtering by: date range, user, action type, and entity |
| FR-110 | Audit log entries shall be retained for a minimum of 2 years and shall not be editable or deletable by any user role |

---

### 6.22 Onboarding & Data Import

| ID | Requirement |
|----|-------------|
| FR-111 | System shall provide a **CSV import** tool for initial SKU onboarding, accepting fields: SKU code, name, category, unit, reorder point, reorder qty, max stock, supplier name, supplier email, lead time days, unit cost, storage location |
| FR-112 | System shall provide a **CSV import** tool for opening stock: SKU code, on-hand quantity, on-order quantity |
| FR-113 | System shall provide a **CSV import** tool for historical sales data: SKU code, date, units sold |
| FR-114 | All import tools shall validate the CSV before applying: display a preview of the first 10 rows, highlight validation errors (missing required fields, invalid data types, unknown SKU codes), and require explicit confirmation before committing |
| FR-115 | All imported data shall be logged in the audit trail with: file name, row count, import timestamp, imported by, and count of validation errors skipped |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Alert generation latency ≤ 2 minutes from data ingestion |
| NFR-02 | Performance | NL query response time ≤ 10 seconds for standard queries |
| NFR-03 | Availability | System uptime ≥ 99.5% during store operating hours |
| NFR-04 | Scalability | Support up to 20,000 active SKUs per store |
| NFR-05 | Security | Role-based access control per Section 6.12.1 |
| NFR-06 | Security | All data at rest encrypted (AES-256); all data in transit via TLS 1.3 |
| NFR-07 | Auditability | All agent actions and user changes logged with timestamps, user identity, and reasoning |
| NFR-08 | Explainability | Every AI recommendation must include a human-readable rationale |
| NFR-09 | Reliability | No autonomous order placement; all POs require human approval |
| NFR-10 | Integration | Expose REST API for POS, WMS, and ERP integration |
| NFR-11 | Usability | Mobile-responsive UI; accessible on tablet for floor staff |
| NFR-12 | Data Retention | Audit logs retained ≥ 2 years; transaction data retained ≥ 5 years |
| NFR-13 | Accessibility | UI shall meet WCAG 2.1 AA standards |

---

## 8. Agent Architecture & Key Capabilities

The application is built as a **multi-agent LLM system** with the following specialized agents:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Store Manager Interface                      │
│              (Chat UI / Mobile App / Voice)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │  Orchestrator Agent  │
                │  (Intent Routing &   │
                │   Task Delegation)   │
                └──┬───┬───┬───┬───┬──┘
                   │   │   │   │   │
       ┌───────────┘   │   │   │   └────────────┐
       │               │   │   │                │
  ┌────▼────┐    ┌──────▼─┐ │ ┌▼──────────┐ ┌──▼──────────┐
  │Inventory│    │Expiry & │ │ │ Promotion │ │  Supplier & │
  │Monitor  │    │Freshness│ │ │ & Demand  │ │  PO Agent   │
  │ Agent   │    │ Agent   │ │ │  Agent    │ │             │
  └────┬────┘    └──────┬──┘ │ └───────┬──┘ └──────┬──────┘
       │                │    │         │            │
       └────────────────┴────┴─────────┴────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   Data & Tool Layer    │
                    │  (POS · WMS · Suppliers│
                    │   Promo Calendar · DB) │
                    └────────────────────────┘
```

### Agent Roles

| Agent | Responsibility |
|-------|---------------|
| **Orchestrator Agent** | Parses manager intent, routes to specialist agents, aggregates responses |
| **Inventory Monitor Agent** | Polls stock levels, triggers alerts, tracks reorder points |
| **Expiry & Freshness Agent** | Tracks lot/batch expiry, triggers markdown/disposal recommendations |
| **Promotion & Demand Agent** | Reads promo calendar, models uplift, ensures promo readiness |
| **Supplier & PO Agent** | Generates POs, communicates with suppliers, tracks deliveries |
| **Reporting Agent** | Generates ad-hoc and scheduled reports via NL queries |
| **Anomaly Detection Agent** | Monitors for unusual consumption, pricing deviations, shrinkage |

---

## 9. Data Requirements

| Data Source | Data Type | Refresh Frequency |
|-------------|-----------|-------------------|
| POS System | Sales transactions, current stock on-hand | Real-time / every 15 min |
| WMS / Receiving System | Inbound shipments, lot numbers, expiry dates | On receiving events |
| Promotional Calendar | Planned promotions, start/end dates, featured SKUs | Weekly update |
| Supplier Catalog | Supplier info, lead times, MOQ, pricing | On change |
| Historical Sales Data | 2+ years of daily sales per SKU | Batch / nightly |
| Weather Data (optional) | Local forecast | Daily |
| Shrinkage Logs | Waste disposal records | On event |
| Budget Data | Monthly category spend caps | On change |

---

## 10. Integration Requirements

| System | Integration Type | Direction |
|--------|-----------------|-----------|
| POS System | REST API / DB sync | Inbound |
| Warehouse Management System (WMS) | REST API / Webhook | Bi-directional |
| Supplier EDI / Email | EDI 850/856 or SMTP | Outbound |
| ERP (Finance) | REST API | Outbound (PO data) |
| Promotional Calendar Tool | API / CSV import | Inbound |
| Email / SMS Gateway | SMTP / Twilio | Outbound (alerts, digests) |
| SSO Provider (optional) | OAuth 2.0 / SAML | Inbound (auth) |

---

## 11. User Stories (Priority Order)

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Store Manager | Receive an alert when any SKU hits stockout | I can take immediate action to prevent lost sales |
| US-02 | Store Manager | Ask "What should I order today?" | The system guides my purchasing decisions |
| US-03 | Store Manager | See which items are expiring this week | I can markdown or donate before waste occurs |
| US-04 | Store Manager | View promo readiness before a weekend sale | I ensure shelves are stocked for the promotion |
| US-05 | Store Manager | Approve a draft PO with one click | I save time on manual order writing |
| US-06 | Department Head | Get a daily digest for my department | I stay informed without logging in constantly |
| US-07 | Store Manager | Ask follow-up questions like "Why is this item low?" | I understand root cause, not just symptoms |
| US-08 | Store Owner | View weekly shrinkage and stockout reports | I can measure operational performance |
| US-09 | Store Manager | Be alerted if a delivery is overdue | I can chase the supplier proactively |
| US-10 | Store Manager | Get alternate supplier suggestions when primary is out | I maintain supply continuity |
| US-11 | Store Manager | See all SKUs as cards and immediately spot red cards | I can triage issues at a glance without reading lists |
| US-12 | Store Manager | Click a red card and see sales, D/S, and promo dates in one place | I have full context before deciding what action to take |
| US-13 | Store Manager | Log in securely and see only what I'm authorised to see | I trust the system with sensitive commercial data |
| US-14 | Store Manager | Assign an alert to a floor staff member with a note | The right person acts on it without me doing it myself |
| US-15 | Department Head | Manually correct a stock quantity after a physical count | System data stays accurate after I find a discrepancy |
| US-16 | Store Manager | View a calendar of this week's expected deliveries | I can plan receiving staff accordingly |
| US-17 | Floor Staff | Log a batch of expired yoghurts as disposed | Shrinkage is tracked and stock is decremented automatically |
| US-18 | Store Manager | Transfer 20 units of olive oil from Grocery to Deli | I can balance stock across departments without a new order |
| US-19 | Store Manager | See my month-to-date spend vs budget per category | I can stay within my purchasing budget |
| US-20 | Store Owner | View the full audit log of who changed what and when | I can investigate any discrepancy or compliance question |
| US-21 | Admin | Bulk-import 500 SKUs from a CSV on day one | I don't have to enter products one by one to go live |

---

## 12. Assumptions & Constraints

### Assumptions
- POS system can provide near-real-time stock-on-hand data via API or DB feed
- Supplier data and lead times are maintained and kept current
- Promotional calendar is available in a structured, machine-readable format
- Store has Wi-Fi / connectivity for real-time data sync
- LLM inference is hosted in a compliant cloud environment
- At least 90 days of historical sales data is available for forecasting

### Constraints
- No fully autonomous purchasing — human approval required for all orders (all phases)
- Initial deployment is single-store; multi-store is Phase 4
- LLM must not hallucinate stock data — all inventory facts come from structured data sources; LLM provides reasoning and language only
- Disposal write-offs above threshold require manager approval before stock is updated

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| POS data feed latency causing stale stock data | Medium | High | Alert on data feed age; fallback to last-known state with timestamp |
| LLM producing incorrect inventory numbers | Medium | High | Ground all facts in structured DB; LLM never invents quantities |
| Over-alerting causing alert fatigue | High | Medium | Configurable thresholds; digest mode; alert deduplication; SLA tracking |
| Manager ignores recommendations | Medium | Medium | Escalation workflow; weekly performance scoring |
| Supplier integration failures | Medium | Medium | Email fallback for POs; manual override workflow |
| Data privacy concerns (sales/supplier data) | Low | High | RBAC, encryption, audit logs, on-prem deployment option |
| Staff not logging disposals consistently | High | Medium | Required disposal confirmation on FIFO reminders; shrinkage anomaly detection |
| Incorrect stock levels from skipped cycle counts | Medium | High | Scheduled cycle count reminders; variance alerts |

---

## 14. Phased Delivery Plan

### Phase 1 — Core Foundation (Weeks 1–8) ✅ In Progress
**Goal:** Live inventory visibility with alerting, SKU card UI, NL chat, and secure access

- Inventory monitoring & alerting (FR-01 to FR-06)
- SKU Card UI — card grid, color-coded status, promo badge (FR-48 to FR-53)
- SKU Card detail panel — sales, D/S, promo dates, expiry, action buttons (FR-54 to FR-56)
- Basic NL query interface with conversational context (FR-28 to FR-31)
- Reorder recommendations + manual PO draft (FR-22 to FR-24)
- Expiry tracking (FR-07 to FR-10)
- Basic dashboard with stat tiles (FR-44)
- **User authentication & RBAC (FR-57 to FR-65)**
- **Alert acknowledgment & assignment (FR-66 to FR-72)**
- **Notification preferences UI (FR-103 to FR-106)**

### Phase 2 — Operational Workflows (Weeks 9–16)
**Goal:** Full daily operations — disposals, transfers, deliveries, supplier management, and promo readiness

- Promotion calendar integration & pre-promo alerts (FR-12 to FR-17)
- Demand forecasting 7-day / 30-day (FR-18 to FR-21)
- Shrinkage & disposal workflow with approval (FR-88 to FR-93)
- Delivery calendar view (FR-84 to FR-87)
- Supplier management UI — catalog, scorecard, alternates (FR-33 to FR-36)
- Stock adjustment & cycle count workflow (FR-73 to FR-78)
- Inter-department stock transfers (FR-94 to FR-97)
- Capacity & storage management — max stock, storage location (FR-79 to FR-83)

### Phase 3 — Intelligence & Automation (Weeks 17–24)
**Goal:** Automate supplier workflows, detect anomalies, close the receiving loop, and add cost controls

- Anomaly detection — consumption spikes, shrinkage rates (FR-41 to FR-43)
- PO transmission to suppliers via email / EDI (FR-25 to FR-27)
- Receiving & goods-in reconciliation (FR-37 to FR-40)
- Price & cost management — cost history, price deviation alerts, budget caps (FR-98 to FR-102)
- Audit log viewer (FR-107 to FR-110)
- Advanced reporting — weekly performance, shrinkage analytics, custom NL reports (FR-45 to FR-47)
- Daily automated digest (FR-45)

### Phase 4 — Scale & Governance (Weeks 25–32)
**Goal:** Go-live readiness, multi-store rollout, and full data lifecycle management

- Onboarding & bulk CSV import for SKUs, stock, and sales history (FR-111 to FR-115)
- Multi-store support — per-store data isolation, cross-store reporting (scope expansion)
- Voice input for NL chat (FR-32)
- Full EDI 850/856 integration with supported suppliers
- SSO integration (Google Workspace / Microsoft 365) (FR-57)
- WCAG 2.1 AA accessibility audit and remediation (NFR-13)
- 2-year data retention and archival policies (NFR-12)

---

## 15. Acceptance Criteria

The system is considered production-ready (Phase 1) when:
1. Stockout detection fires within 2 minutes of a SKU reaching zero
2. Near-expiry alerts are accurate to the batch/lot level
3. NL query interface answers 90%+ of common manager questions correctly without fabricating data
4. PO draft generation requires < 3 manager actions
5. System uptime ≥ 99.5% over a 30-day observation period
6. All users authenticated via secure login; unauthenticated requests return 401
7. RBAC enforced: Department Head sees only their department's SKUs and alerts
8. Critical alert escalation fires within 2 hours of an unacknowledged alert
9. SKU card grid loads ≤ 3 seconds for up to 500 visible cards
10. Card detail panel renders all fields within 1 second of click

Full production-ready (all phases) additionally requires:
11. Promo readiness report covers 100% of promoted SKUs before each event
12. Disposal workflow logs 100% of disposals with reason and approver where required
13. Cycle count workflow reconciles and updates stock in a single confirmed session
14. Audit log captures all actions with no gaps; entries non-editable by any role
15. CSV import successfully onboards 500 SKUs with < 1% error rate on valid data
16. Zero instances of LLM-fabricated inventory quantities in audit log review

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| SKU | Stock Keeping Unit — unique product identifier |
| Reorder Point | Minimum stock level that triggers a replenishment recommendation |
| Maximum Stock Level | Upper stock limit based on shelf or storage capacity |
| MOQ | Minimum Order Quantity |
| Shrinkage | Inventory loss due to expiry, damage, theft, or miscounting |
| Days of Supply | Current stock divided by average daily sales |
| Uplift | Increase in demand expected during a promotional event |
| PO | Purchase Order |
| EDI | Electronic Data Interchange — structured supplier communication format |
| FIFO | First In, First Out — stock rotation method |
| WMS | Warehouse Management System |
| POS | Point of Sale system |
| RBAC | Role-Based Access Control |
| Cycle Count | A scheduled partial stock count of a subset of SKUs to verify system accuracy |
| Disposal Log | Record of inventory removed from saleable stock with reason and method |
| D/S | Days of Supply (abbreviation used in UI) |
| SLA | Service Level Agreement — used here for alert acknowledgment time targets |
| SSO | Single Sign-On |

---

*Document Owner: Store Manager / Product Lead*  
*Next Review Date: 2026-05-15*
