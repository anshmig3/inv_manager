"""
Natural Language query agent using Anthropic Claude SDK.
Provides a system prompt grounded in live inventory context,
with tool use for creating alerts directly from chat.
"""
import os
from datetime import date, datetime
from typing import List, Any, Dict
import anthropic
from sqlalchemy.orm import Session

from app.models import SKU, Alert, Promotion
from app.models.alert import ALERT_OPEN
from app.schemas.chat import ChatRequest, ChatResponse

MODEL = "claude-sonnet-4-6"

# ---------- Tool definitions ----------

TOOLS: List[Dict[str, Any]] = [
    {
        "name": "create_alert",
        "description": (
            "Create a manual alert for a specific SKU. "
            "Use this when the user asks to create, add, raise, or flag an alert. "
            "Always confirm the SKU name and details before calling this tool."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sku_id": {
                    "type": "integer",
                    "description": "The numeric ID of the SKU (from the inventory snapshot).",
                },
                "alert_type": {
                    "type": "string",
                    "enum": ["STOCKOUT", "LOW_STOCK", "NEAR_EXPIRY", "PROMO_SHORTFALL", "MANUAL"],
                    "description": "Type of alert. Use MANUAL for custom/user-defined alerts.",
                },
                "severity": {
                    "type": "string",
                    "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
                    "description": "Severity level of the alert.",
                },
                "message": {
                    "type": "string",
                    "description": "Human-readable alert message describing the issue.",
                },
            },
            "required": ["sku_id", "alert_type", "severity", "message"],
        },
    }
]


# ---------- Tool executor ----------

def _execute_create_alert(db: Session, tool_input: Dict[str, Any]) -> str:
    sku = db.query(SKU).filter(SKU.id == tool_input["sku_id"]).first()
    if not sku:
        return f"Error: SKU with ID {tool_input['sku_id']} not found."

    alert = Alert(
        sku_id=sku.id,
        alert_type=tool_input["alert_type"],
        severity=tool_input["severity"],
        message=tool_input["message"],
        is_active=True,
        status=ALERT_OPEN,
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return (
        f"Alert created successfully (ID: {alert.id}) — "
        f"[{alert.severity}] {alert.alert_type} for {sku.name}: {alert.message}"
    )


# ---------- Context snapshot ----------

def _build_context_snapshot(db: Session) -> str:
    today = date.today()
    lines = [f"Today's date: {today}\n"]

    # Active alerts summary
    alerts = db.query(Alert).filter(Alert.is_active == True).order_by(Alert.severity).all()
    if alerts:
        lines.append("=== ACTIVE ALERTS ===")
        for a in alerts:
            sku = db.query(SKU).filter(SKU.id == a.sku_id).first()
            sku_label = sku.name if sku else f"SKU#{a.sku_id}"
            lines.append(f"[{a.severity}] {a.alert_type} — {sku_label}: {a.message}")

    # Active promotions
    promos = db.query(Promotion).filter(
        Promotion.start_date <= today,
        Promotion.end_date >= today,
        Promotion.is_active == True,
    ).all()
    if promos:
        lines.append("\n=== ACTIVE PROMOTIONS ===")
        for p in promos:
            sku = db.query(SKU).filter(SKU.id == p.sku_id).first()
            sku_label = sku.name if sku else f"SKU#{p.sku_id}"
            lines.append(
                f"{sku_label} — '{p.promo_name}' {p.start_date} to {p.end_date}"
                f" (+{p.expected_uplift_pct}% uplift)"
            )

    # Stock snapshot (all SKUs, sorted by urgency, with IDs for tool use)
    from app.services.inventory_monitor import get_sku_card
    skus = db.query(SKU).all()
    cards = sorted(
        [get_sku_card(db, s) for s in skus],
        key=lambda c: {"CRITICAL": 0, "WARNING": 1, "WATCH": 2, "HEALTHY": 3}[c.card_status],
    )[:30]
    lines.append("\n=== INVENTORY SNAPSHOT (top 30 by urgency) ===")
    lines.append(
        f"{'ID':>4} {'SKU':<30} {'Category':<15} {'On Hand':>8} {'On Order':>9} {'D/S':>6} {'Status':<10}"
    )
    lines.append("-" * 86)

    # Build an id→sku map for lookup
    sku_id_map = {s.name: s.id for s in skus}
    for c in cards:
        sku_id = sku_id_map.get(c.name, 0)
        lines.append(
            f"{sku_id:>4} {c.name:<30} {c.category:<15} {c.on_hand:>8.0f}"
            f" {c.on_order:>9.0f} {c.days_of_supply:>6.1f} {c.card_status:<10}"
        )

    return "\n".join(lines)


# ---------- System prompt ----------

SYSTEM_PROMPT = """You are an expert grocery store inventory management assistant. \
You help store managers understand their inventory situation, identify issues, and take action.

You have access to real-time inventory data in the context below. \
IMPORTANT: Never invent or guess inventory quantities, prices, or dates — only use figures from the provided context. \
If you don't have data to answer a question, say so clearly.

You can also CREATE ALERTS using the create_alert tool. When a user asks to create, raise, add, \
or flag an alert for an item, use the tool — do not just describe what you would do. \
Use the SKU IDs from the inventory snapshot. Choose severity based on urgency: \
CRITICAL for immediate action, HIGH for urgent, MEDIUM for soon, LOW for informational.

When recommending actions, be specific: name the SKU, quantity to order, and reason why.
Keep responses concise and actionable. Use bullet points for lists of items.
"""


# ---------- Main chat function ----------

def chat(request: ChatRequest, db: Session) -> ChatResponse:
    context = _build_context_snapshot(db)
    system = SYSTEM_PROMPT + f"\n\n{context}"

    messages: List[Dict[str, Any]] = [
        {"role": m.role, "content": m.content} for m in request.history
    ]
    messages.append({"role": "user", "content": request.message})

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

    # Agentic loop — handles tool use
    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        # If no tool calls, we have a final text reply
        if response.stop_reason != "tool_use":
            break

        # Execute each tool call and collect results
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                if block.name == "create_alert":
                    result_text = _execute_create_alert(db, block.input)
                else:
                    result_text = f"Unknown tool: {block.name}"

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_text,
                })

        # Append assistant turn + tool results, then loop back for final reply
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    # Extract final text reply
    reply = ""
    for block in response.content:
        if hasattr(block, "text"):
            reply += block.text

    # Heuristic suggested actions
    actions: List[str] = []
    lower = reply.lower()
    if "order" in lower or "purchase order" in lower:
        actions.append("Draft Purchase Order")
    if "markdown" in lower or "discount" in lower:
        actions.append("Apply Markdown")
    if "create alert" in lower or "raised an alert" in lower or "alert created" in lower:
        actions.append("View Alerts")

    return ChatResponse(reply=reply, suggested_actions=list(dict.fromkeys(actions)))
