# Business Requirements Document (BRD)
## Grocery Store Inventory Management — LLM Agentic Application

**Version:** 1.1  
**Date:** 2026-04-08  
**Status:** Draft  
**Change Log:** v1.1 — Added SKU Card UI requirements (FR-48 to FR-56); moved to Phase 1

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

---

## 4. Stakeholders

| Role | Responsibility |
|------|---------------|
| Store Manager | Primary user; approves orders, reviews alerts |
| Department Heads | Receive department-level alerts and recommendations |
| Procurement / Buyers | Receive generated purchase orders |
| Store Owner / Regional Manager | Access to performance dashboards and reports |
| Suppliers | Receive automated order requests (via integration) |
| IT / System Admin | Manages integrations and system health |

---

## 5. Scope

### 5.1 In Scope
- Real-time inventory monitoring and alerting
- Expiry and near-expiry tracking
- Promotion calendar integration and demand uplift modeling
- Automated reorder recommendations and draft purchase orders
- Supplier communication drafting
- Natural language query interface for ad-hoc reporting
- Shrinkage and waste tracking
- Demand forecasting (7-day and 30-day horizon)
- Receiving / goods-in reconciliation assistance
- Anomaly detection (unexpected consumption spikes, theft indicators)

### 5.2 Out of Scope (Phase 1)
- Full autonomous order placement without manager approval
- POS hardware integration (assumed data feed exists)
- Customer-facing features
- Multi-store orchestration (deferred to Phase 2)
- Financial accounting / ERP reconciliation

---

## 6. Functional Requirements

### 6.1 Inventory Monitoring & Alerting

| ID | Requirement |
|----|-------------|
| FR-01 | System shall monitor current stock levels for all SKUs in real time via POS/WMS data feed |
| FR-02 | System shall generate a **Low Stock Alert** when a SKU falls below its reorder point |
| FR-03 | System shall generate a **Stockout Alert** immediately when on-hand quantity reaches zero |
| FR-04 | System shall classify alerts by severity: Critical (stockout), High (≤ 1 day supply), Medium (≤ reorder point), Low (trending toward reorder) |
| FR-05 | System shall surface alerts via in-app notifications, email digest, and SMS (configurable per user) |
| FR-06 | System shall suppress duplicate alerts and auto-resolve when stock is replenished |

### 6.2 Expiry & Freshness Management

| ID | Requirement |
|----|-------------|
| FR-07 | System shall ingest batch/lot expiry dates from receiving records or supplier data feeds |
| FR-08 | System shall generate **Near-Expiry Alerts** at configurable thresholds (e.g., 3 days, 7 days before expiry) |
| FR-09 | System shall recommend markdown pricing or donation for near-expiry items |
| FR-10 | System shall suggest FIFO rotation reminders to floor staff |
| FR-11 | System shall log expired-item disposals and track shrinkage by category |

### 6.3 Promotion Calendar Integration

| ID | Requirement |
|----|-------------|
| FR-12 | System shall ingest the store's promotional calendar (weekly ads, seasonal events, holidays) |
| FR-13 | System shall calculate expected demand uplift per SKU per promotion event using historical sales data |
| FR-14 | System shall generate **Pre-Promo Stock Alerts** when projected stock will be insufficient for the promotion period |
| FR-15 | System shall recommend incremental order quantities aligned to promotion start dates |
| FR-16 | System shall flag SKUs that are on promotion but currently low or out of stock |
| FR-17 | System shall produce a "Promotion Readiness Report" per event |

### 6.4 Demand Forecasting

| ID | Requirement |
|----|-------------|
| FR-18 | System shall generate 7-day and 30-day demand forecasts per SKU using historical POS data |
| FR-19 | Forecasts shall account for seasonality, day-of-week effects, holidays, and weather (optional data feed) |
| FR-20 | System shall surface confidence intervals alongside point forecasts |
| FR-21 | System shall allow managers to manually adjust forecast assumptions via chat |

### 6.5 Reorder & Purchase Order Management

| ID | Requirement |
|----|-------------|
| FR-22 | System shall auto-generate reorder recommendations when stock triggers reorder point |
| FR-23 | Recommendations shall include: SKU, current stock, reorder quantity, suggested supplier, estimated cost |
| FR-24 | System shall draft purchase orders in standard format (PDF/EDI) for manager approval |
| FR-25 | Upon approval, system shall transmit PO to supplier via email or EDI integration |
| FR-26 | System shall track PO status (sent, acknowledged, in transit, received) |
| FR-27 | System shall alert manager if an expected delivery is overdue |

### 6.6 Natural Language Query Interface

| ID | Requirement |
|----|-------------|
| FR-28 | Manager shall be able to ask free-text questions such as: "What products are running low in dairy?", "What should I order before the weekend sale?", "Show me items expiring this week" |
| FR-29 | System shall interpret intent, query relevant data, and respond in plain language with supporting data tables |
| FR-30 | System shall support follow-up questions maintaining conversational context |
| FR-31 | System shall explain its reasoning when making recommendations |
| FR-32 | System shall support voice input (speech-to-text) as an optional channel |

### 6.7 Supplier Management

| ID | Requirement |
|----|-------------|
| FR-33 | System shall maintain a supplier catalog with lead times, MOQs, and contact info |
| FR-34 | System shall draft supplier communication (emails, order confirmations) on manager's behalf |
| FR-35 | System shall track supplier performance: fill rate, on-time delivery, price accuracy |
| FR-36 | System shall recommend alternate suppliers for a SKU when primary supplier has stock issues |

### 6.8 Receiving & Goods-In

| ID | Requirement |
|----|-------------|
| FR-37 | System shall assist with receiving by comparing inbound delivery against the original PO |
| FR-38 | System shall flag discrepancies (short shipments, wrong items, damaged goods) |
| FR-39 | System shall update on-hand inventory upon confirmed receipt |
| FR-40 | System shall capture batch/lot numbers and expiry dates at receiving |

### 6.9 Anomaly Detection

| ID | Requirement |
|----|-------------|
| FR-41 | System shall detect and alert on unexpected consumption spikes (possible theft or scanning errors) |
| FR-42 | System shall flag SKUs with unusually high shrinkage rates |
| FR-43 | System shall detect supplier invoices that deviate from agreed pricing |

### 6.10 SKU Card UI

The primary inventory view presents each SKU as an interactive card. This is the default landing screen for the store manager.

#### Card Summary View (collapsed)

| ID | Requirement |
|----|-------------|
| FR-48 | Each SKU shall be represented as a card displaying: SKU name, product image thumbnail (if available), current on-hand quantity, Days of Supply (D/S), and a status badge (Healthy / Low / Critical / Expiring) |
| FR-49 | Cards with any active issue (stockout, low stock, near-expiry, promo stock shortfall) shall be highlighted with a **red border and red background tint**; cards with warnings (approaching reorder point, promo upcoming with marginal stock) shall use **amber**; healthy cards shall use **green** |
| FR-50 | A promo indicator badge ("PROMO") shall be visible on the card face whenever the SKU has an active or upcoming promotion within the next 14 days |
| FR-51 | The card grid shall support filtering by: department/category, alert severity, promo status (on promo / not on promo), and Days of Supply range |
| FR-52 | Cards shall be sortable by: alert severity (default), Days of Supply (ascending), SKU name (A–Z), and last-updated timestamp |
| FR-53 | The card grid shall support a text search bar to find SKUs by name or SKU code |

#### Card Detail View (on click / tap)

| ID | Requirement |
|----|-------------|
| FR-54 | Clicking a card shall expand an inline detail panel (or modal) without leaving the grid view |
| FR-55 | The detail panel shall display all of the following fields: |

```
┌─────────────────────────────────────────────────────────┐
│  [Product Image]   Whole Milk 1L (SKU: DAIRY-0042)      │
│  Status: ● CRITICAL — Stockout                          │
├────────────────────┬────────────────────────────────────┤
│  STOCK             │  SALES                             │
│  On Hand:    0 units│  Daily Avg:   48 units/day        │
│  On Order:  144 units│  Weekly:    336 units             │
│  Reorder Pt: 72 units│  Last 30d:  1,440 units           │
├────────────────────┼────────────────────────────────────┤
│  DAYS OF SUPPLY    │  EXPIRY                            │
│  Current D/S: 0.0  │  Nearest batch: 2026-04-11         │
│  After PO D/S: 3.0 │  Units expiring: 0 (none on hand)  │
├────────────────────┴────────────────────────────────────┤
│  PROMOTION                                              │
│  On Promo:   YES                                        │
│  Promo Name: Spring Fresh Event                         │
│  Start Date: 2026-04-10                                 │
│  End Date:   2026-04-17                                 │
│  Expected Uplift: +65%                                  │
├─────────────────────────────────────────────────────────┤
│  [ Request Stock Increase ]  [ Draft PO ]  [ Dismiss ]  │
└─────────────────────────────────────────────────────────┘
```

| ID | Requirement |
|----|-------------|
| FR-56 | The detail panel shall include action buttons contextual to the SKU's current status: **"Request Stock Increase"** (generates a reorder recommendation), **"Draft PO"** (opens the PO workflow), **"Mark as Reviewed"** (dismisses alert for the current session), and **"Ask AI"** (opens the NL chat pre-filled with the SKU context) |

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
| FR-44 | System shall provide a real-time inventory dashboard showing: stock levels, alert counts, days-of-supply per category |
| FR-45 | System shall generate daily automated digest reports (email/in-app) summarizing key alerts and actions taken |
| FR-46 | System shall produce weekly performance reports: shrinkage, stockout incidents, promo readiness scores |
| FR-47 | System shall allow custom report generation via natural language ("Generate a report of all dairy items with < 3 days of supply") |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Alert generation latency ≤ 2 minutes from data ingestion |
| NFR-02 | Performance | NL query response time ≤ 10 seconds for standard queries |
| NFR-03 | Availability | System uptime ≥ 99.5% during store operating hours |
| NFR-04 | Scalability | Support up to 20,000 active SKUs per store |
| NFR-05 | Security | Role-based access control (RBAC) for manager, department head, owner roles |
| NFR-06 | Security | All data at rest and in transit encrypted (AES-256, TLS 1.3) |
| NFR-07 | Auditability | All agent actions and recommendations logged with timestamps and reasoning |
| NFR-08 | Explainability | Every recommendation must include a human-readable rationale |
| NFR-09 | Reliability | No autonomous order placement; all POs require human approval |
| NFR-10 | Integration | Expose REST API for POS, WMS, and ERP integration |
| NFR-11 | Usability | Mobile-responsive UI; accessible on tablet for floor staff |

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

---

## 10. Integration Requirements

| System | Integration Type | Direction |
|--------|-----------------|-----------|
| POS System | REST API / DB sync | Inbound |
| Warehouse Management System (WMS) | REST API / Webhook | Bi-directional |
| Supplier EDI / Email | EDI 850/856 or SMTP | Outbound |
| ERP (Finance) | REST API | Outbound (PO data) |
| Promotional Calendar Tool | API / CSV import | Inbound |
| Email / SMS Gateway | SMTP / Twilio | Outbound (alerts) |

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

---

## 12. Assumptions & Constraints

### Assumptions
- POS system can provide near-real-time stock-on-hand data via API or DB feed
- Supplier data and lead times are maintained and kept current
- Promotional calendar is available in a structured, machine-readable format
- Store has Wi-Fi / connectivity for real-time data sync
- LLM inference is hosted in a compliant cloud environment

### Constraints
- No fully autonomous purchasing — human approval required for all orders (Phase 1)
- Initial deployment is single-store; multi-store is Phase 2
- LLM must not hallucinate stock data — all inventory facts come from structured data sources; LLM provides reasoning and language only

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| POS data feed latency causing stale stock data | Medium | High | Alert on data feed age; fallback to last-known state with timestamp |
| LLM producing incorrect inventory numbers | Medium | High | Ground all facts in structured DB; LLM never invents quantities |
| Over-alerting causing alert fatigue | High | Medium | Configurable thresholds; digest mode; alert deduplication |
| Manager ignores recommendations | Medium | Medium | Gamification of compliance; weekly performance scoring |
| Supplier integration failures | Medium | Medium | Email fallback for POs; manual override workflow |
| Data privacy concerns (sales/supplier data) | Low | High | RBAC, encryption, audit logs, on-prem deployment option |

---

## 14. Phased Delivery Plan

### Phase 1 — Core (Weeks 1–8)
- Inventory monitoring & alerting (FR-01 to FR-06)
- **SKU Card UI — card grid, red/amber/green highlighting, promo badge (FR-48 to FR-53)**
- **SKU Card detail panel — sales, D/S, promo dates, expiry, action buttons (FR-54 to FR-56)**
- Basic NL query interface (FR-28 to FR-31)
- Reorder recommendations + manual PO draft (FR-22 to FR-24)
- Expiry tracking (FR-07 to FR-10)
- Basic dashboard (FR-44)

### Phase 2 — Promotion & Forecasting (Weeks 9–14)
- Promotion calendar integration (FR-12 to FR-17)
- Demand forecasting (FR-18 to FR-21)
- Pre-promo stock alerts and readiness report
- Supplier management (FR-33 to FR-36)

### Phase 3 — Intelligence & Automation (Weeks 15–20)
- Anomaly detection (FR-41 to FR-43)
- PO transmission to suppliers (FR-25 to FR-27)
- Receiving assistance (FR-37 to FR-40)
- Advanced reporting & shrinkage analytics (FR-45 to FR-47)
- Multi-store rollout (Phase 2 scope)

---

## 15. Acceptance Criteria

The system is considered production-ready when:
1. Stockout detection fires within 2 minutes of a SKU reaching zero
2. Near-expiry alerts are accurate to the batch/lot level
3. Promo readiness report covers 100% of promoted SKUs before each event
4. NL query interface answers 90%+ of common manager questions correctly
5. PO draft generation requires < 3 manager actions to send
6. System uptime ≥ 99.5% over a 30-day observation period
7. Zero instances of LLM-fabricated inventory quantities in audit log
8. SKU card grid loads ≤ 3 seconds for up to 500 visible cards
9. All cards with active alerts are highlighted red/amber — zero false-color cards in QA testing
10. Card detail panel renders all fields (sales, D/S, promo Y/N with dates) within 1 second of click

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| SKU | Stock Keeping Unit — unique product identifier |
| Reorder Point | Minimum stock level that triggers a replenishment recommendation |
| MOQ | Minimum Order Quantity |
| Shrinkage | Inventory loss due to expiry, damage, or theft |
| Days of Supply | Current stock divided by average daily sales |
| Uplift | Increase in demand expected during a promotional event |
| PO | Purchase Order |
| EDI | Electronic Data Interchange — structured supplier communication format |
| FIFO | First In, First Out — stock rotation method |
| WMS | Warehouse Management System |
| POS | Point of Sale system |

---

*Document Owner: Store Manager / Product Lead*  
*Next Review Date: 2026-05-08*
