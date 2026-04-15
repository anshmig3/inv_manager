"""
Natural Language query agent using Anthropic Claude SDK.
Provides a system prompt grounded in live inventory context.
"""
import os
from datetime import date
import anthropic
from sqlalchemy.orm import Session

from app.models import SKU, Alert, Promotion
from app.schemas.chat import ChatRequest, ChatResponse

MODEL = "claude-sonnet-4-6"


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

    # Stock snapshot (top 30 by urgency)
    from app.services.inventory_monitor import get_sku_card
    skus = db.query(SKU).all()
    cards = sorted(
        [get_sku_card(db, s) for s in skus],
        key=lambda c: {"CRITICAL": 0, "WARNING": 1, "WATCH": 2, "HEALTHY": 3}[c.card_status],
    )[:30]
    lines.append("\n=== INVENTORY SNAPSHOT (top 30 by urgency) ===")
    lines.append(
        f"{'SKU':<30} {'Category':<15} {'On Hand':>8} {'On Order':>9} {'D/S':>6} {'Status':<10}"
    )
    lines.append("-" * 80)
    for c in cards:
        lines.append(
            f"{c.name:<30} {c.category:<15} {c.on_hand:>8.0f}"
            f" {c.on_order:>9.0f} {c.days_of_supply:>6.1f} {c.card_status:<10}"
        )

    return "\n".join(lines)


SYSTEM_PROMPT = """You are an expert grocery store inventory management assistant. \
You help store managers understand their inventory situation, identify issues, and make good purchasing decisions.

You have access to real-time inventory data provided in the context below. \
IMPORTANT: Never invent or guess inventory quantities, prices, or dates — only use figures from the provided context. \
If you don't have data to answer a question, say so clearly.

When recommending actions, be specific: name the SKU, quantity to order, and reason why.
Keep responses concise and actionable. Use bullet points for lists of items.
"""


def chat(request: ChatRequest, db: Session) -> ChatResponse:
    context = _build_context_snapshot(db)
    system = SYSTEM_PROMPT + f"\n\n{context}"

    # Build messages array from history + new user message
    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    reply: str = response.content[0].text

    # Extract simple suggested actions heuristically
    actions: list[str] = []
    lower = reply.lower()
    if "order" in lower or "purchase order" in lower:
        actions.append("Draft Purchase Order")
    if "markdown" in lower or "discount" in lower:
        actions.append("Apply Markdown")
    if "stock increase" in lower or "increase stock" in lower:
        actions.append("Request Stock Increase")

    return ChatResponse(reply=reply, suggested_actions=list(dict.fromkeys(actions)))
