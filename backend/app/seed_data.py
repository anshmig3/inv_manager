"""
Seed realistic grocery store data for Phase 1 development and demo.
"""
from datetime import datetime, date, timedelta
import random
from sqlalchemy.orm import Session

from app.models import SKU, StockLevel, SalesHistory, Promotion, ExpiryBatch
from app.models.user import User, NotificationPreference, ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_DEPT_HEAD, ROLE_FLOOR_STAFF
from app.models.supplier import Supplier
from app.models.operations import CostHistory
from app.core.security import hash_password

random.seed(42)

SKUS = [
    # (sku_code, name, category, unit, reorder_point, reorder_qty, supplier, email, lead_time, unit_cost)
    ("DAIRY-001", "Whole Milk 1L", "Dairy", "units", 72, 144, "DairyFresh Co.", "orders@dairyfresh.com", 2, 1.20),
    ("DAIRY-002", "Semi-Skimmed Milk 2L", "Dairy", "units", 50, 100, "DairyFresh Co.", "orders@dairyfresh.com", 2, 1.60),
    ("DAIRY-003", "Greek Yoghurt 500g", "Dairy", "units", 30, 60, "CreamTop Dairy", "supply@creamtop.com", 2, 1.80),
    ("DAIRY-004", "Cheddar Cheese 400g", "Dairy", "units", 20, 40, "CreamTop Dairy", "supply@creamtop.com", 3, 3.50),
    ("DAIRY-005", "Unsalted Butter 250g", "Dairy", "units", 25, 50, "DairyFresh Co.", "orders@dairyfresh.com", 2, 2.10),
    ("BREAD-001", "White Sliced Bread 800g", "Bakery", "units", 40, 80, "BakeWell Supplies", "info@bakewell.com", 1, 1.10),
    ("BREAD-002", "Wholemeal Bread 800g", "Bakery", "units", 30, 60, "BakeWell Supplies", "info@bakewell.com", 1, 1.30),
    ("BREAD-003", "Sourdough Loaf", "Bakery", "units", 15, 30, "ArtisanBake Ltd", "hello@artisanbake.com", 1, 2.80),
    ("PROD-001", "Bananas (loose)", "Produce", "kg", 20, 40, "FreshFarm Imports", "ops@freshfarm.com", 2, 1.20),
    ("PROD-002", "Apples Gala 6pk", "Produce", "units", 25, 50, "FreshFarm Imports", "ops@freshfarm.com", 2, 2.50),
    ("PROD-003", "Broccoli Head", "Produce", "units", 20, 40, "LocalGreens Ltd", "orders@localgreens.com", 1, 0.90),
    ("PROD-004", "Carrots 1kg Bag", "Produce", "units", 15, 30, "LocalGreens Ltd", "orders@localgreens.com", 1, 0.70),
    ("PROD-005", "Tomatoes 400g Pack", "Produce", "units", 20, 40, "FreshFarm Imports", "ops@freshfarm.com", 2, 1.40),
    ("MEAT-001", "Chicken Breast 500g", "Meat", "units", 20, 40, "Prime Meats UK", "supply@primemeats.com", 2, 4.50),
    ("MEAT-002", "Beef Mince 500g", "Meat", "units", 15, 30, "Prime Meats UK", "supply@primemeats.com", 2, 3.80),
    ("MEAT-003", "Pork Sausages 400g", "Meat", "units", 15, 30, "Prime Meats UK", "supply@primemeats.com", 2, 2.90),
    ("GROC-001", "Baked Beans 400g", "Grocery", "units", 40, 96, "PantryPlus Wholesale", "orders@pantryplus.com", 3, 0.55),
    ("GROC-002", "Pasta Fusilli 500g", "Grocery", "units", 30, 72, "PantryPlus Wholesale", "orders@pantryplus.com", 3, 0.80),
    ("GROC-003", "Tomato Sauce Jar 500g", "Grocery", "units", 25, 60, "PantryPlus Wholesale", "orders@pantryplus.com", 3, 1.20),
    ("GROC-004", "Cornflakes 750g", "Grocery", "units", 20, 48, "MorningMeal Dist.", "sales@morningmeal.com", 3, 2.40),
    ("GROC-005", "Orange Juice 1L", "Drinks", "units", 30, 72, "JuiceWorld Ltd", "orders@juiceworld.com", 2, 1.50),
    ("GROC-006", "Sparkling Water 6x500ml", "Drinks", "units", 20, 48, "AquaPure Dist.", "trade@aquapure.com", 3, 2.00),
    ("FROZEN-001", "Peas 900g", "Frozen", "units", 20, 48, "FrostLine Foods", "orders@frostline.com", 3, 1.60),
    ("FROZEN-002", "Fish Fingers 400g", "Frozen", "units", 15, 36, "FrostLine Foods", "orders@frostline.com", 3, 2.50),
    ("FROZEN-003", "Vanilla Ice Cream 1L", "Frozen", "units", 12, 24, "FrostLine Foods", "orders@frostline.com", 3, 3.20),
    ("CLEAN-001", "Washing Up Liquid 500ml", "Household", "units", 15, 36, "CleanHome Dist.", "trade@cleanhome.com", 4, 1.00),
    ("CLEAN-002", "Laundry Detergent 1kg", "Household", "units", 10, 24, "CleanHome Dist.", "trade@cleanhome.com", 4, 4.50),
    ("BAKE-001", "Plain Flour 1.5kg", "Baking", "units", 20, 48, "MillersChoice", "orders@millers.com", 4, 1.10),
    ("BAKE-002", "Caster Sugar 1kg", "Baking", "units", 15, 36, "MillersChoice", "orders@millers.com", 4, 0.90),
    ("DELI-001", "Smoked Salmon 100g", "Deli", "units", 10, 20, "OceanDeli Ltd", "supply@oceandeli.com", 2, 4.00),
]

# Stock scenarios: (on_hand_multiplier, on_order) — multiplier of reorder_point
STOCK_SCENARIOS = [
    # Healthy stocks
    (4.0, 0), (5.0, 0), (6.0, 0), (3.5, 0),
    # Watch-level
    (1.8, 0), (2.2, 0),
    # Low / warning
    (0.9, 0), (0.7, 0),
    # Critical / stockout
    (0.0, 144), (0.3, 0),
    # On order, healthy
    (3.0, 48), (4.5, 0),
]


DEMO_USERS = [
    # (email, full_name, password, role, department)
    ("admin@groceryiq.com",   "Admin User",       "Admin1234!",   ROLE_ADMIN,          None),
    ("manager@groceryiq.com", "Sam Manager",      "Manager123!",  ROLE_STORE_MANAGER,  None),
    ("dairy@groceryiq.com",   "Dana Dept Head",   "Dairy1234!",   ROLE_DEPT_HEAD,      "Dairy"),
    ("staff@groceryiq.com",   "Floor Staff",      "Staff1234!",   ROLE_FLOOR_STAFF,    "Dairy"),
]

CHANNELS = ["in_app", "email", "sms"]
SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def _seed_users(db: Session):
    if db.query(User).count() > 0:
        return
    for email, name, password, role, dept in DEMO_USERS:
        user = User(
            email=email,
            full_name=name,
            hashed_password=hash_password(password),
            role=role,
            department=dept,
        )
        db.add(user)
        db.flush()
        for channel in CHANNELS:
            for severity in SEVERITIES:
                db.add(NotificationPreference(
                    user_id=user.id,
                    channel=channel,
                    severity=severity,
                    enabled=True,
                    quiet_hours_start=22 if channel == "sms" else None,
                    quiet_hours_end=7 if channel == "sms" else None,
                    override_quiet_for_critical=True,
                    digest_frequency="realtime",
                ))
    db.commit()


def seed(db: Session):
    _seed_users(db)
    if db.query(SKU).count() > 0:
        return  # already seeded

    today = date.today()
    skus_created = []

    for i, row in enumerate(SKUS):
        (code, name, cat, unit, rop, roq, supplier, email, lead, cost) = row
        sku = SKU(
            sku_code=code,
            name=name,
            category=cat,
            unit=unit,
            reorder_point=rop,
            reorder_qty=roq,
            supplier_name=supplier,
            supplier_email=email,
            lead_time_days=lead,
            unit_cost=cost,
        )
        db.add(sku)
        db.flush()  # get id
        skus_created.append(sku)

        # Stock level
        scenario = STOCK_SCENARIOS[i % len(STOCK_SCENARIOS)]
        on_hand = round(rop * scenario[0])
        on_order = scenario[1]
        db.add(StockLevel(sku_id=sku.id, on_hand=on_hand, on_order=on_order))

        # Sales history — 60 days
        base_daily = roq / 7  # rough daily sales
        for d in range(60):
            sale_date = datetime.utcnow() - timedelta(days=59 - d)
            # Add day-of-week variation
            dow = sale_date.weekday()
            multiplier = 1.3 if dow >= 5 else (0.85 if dow == 0 else 1.0)
            units = max(0, round(base_daily * multiplier * random.uniform(0.8, 1.2), 1))
            db.add(SalesHistory(sku_id=sku.id, sale_date=sale_date, units_sold=units))

        # Expiry batches for perishables
        if cat in ("Dairy", "Bakery", "Produce", "Meat", "Deli"):
            # A batch expiring soon (near-expiry alert)
            if i % 4 == 0:
                db.add(ExpiryBatch(
                    sku_id=sku.id,
                    batch_number=f"BATCH-{code}-A",
                    quantity=max(1, round(on_hand * 0.3)),
                    expiry_date=today + timedelta(days=2),   # CRITICAL — 2 days
                ))
            elif i % 4 == 1:
                db.add(ExpiryBatch(
                    sku_id=sku.id,
                    batch_number=f"BATCH-{code}-A",
                    quantity=max(1, round(on_hand * 0.4)),
                    expiry_date=today + timedelta(days=5),   # WARNING — 5 days
                ))
            # A healthy batch
            db.add(ExpiryBatch(
                sku_id=sku.id,
                batch_number=f"BATCH-{code}-B",
                quantity=max(1, round(on_hand * 0.7)),
                expiry_date=today + timedelta(days=random.randint(10, 20)),
            ))

    # Promotions
    promos = [
        # Active this week
        (0, "Spring Fresh Event", today - timedelta(days=2), today + timedelta(days=5), 65),
        (2, "Dairy Deal Week", today, today + timedelta(days=7), 40),
        (6, "Budget Basket Promo", today - timedelta(days=1), today + timedelta(days=6), 30),
        # Upcoming in 3 days
        (14, "Easter Treats", today + timedelta(days=3), today + timedelta(days=10), 55),
        (20, "Drinks Bonanza", today + timedelta(days=4), today + timedelta(days=11), 45),
        # Future (>14 days — won't show on card badge)
        (10, "Summer BBQ Prep", today + timedelta(days=20), today + timedelta(days=27), 70),
    ]
    for idx, pname, start, end, uplift in promos:
        if idx < len(skus_created):
            db.add(Promotion(
                sku_id=skus_created[idx].id,
                promo_name=pname,
                start_date=start,
                end_date=end,
                expected_uplift_pct=uplift,
            ))

    # Seed storage locations and max stock on a few SKUs
    storage_map = {
        "DAIRY-001": ("Aisle 1 / Shelf A", 300),
        "DAIRY-002": ("Aisle 1 / Shelf A", 200),
        "BREAD-001": ("Aisle 2 / Shelf B", 200),
        "PROD-001":  ("Produce Bay",       100),
        "MEAT-001":  ("Cold Room 1",        80),
    }
    for sku in skus_created:
        if sku.sku_code in storage_map:
            loc, max_s = storage_map[sku.sku_code]
            sku.storage_location = loc
            sku.max_stock = max_s

    # Seed suppliers
    unique_suppliers = {}
    for row in SKUS:
        sname, semail = row[6], row[7]
        if sname not in unique_suppliers:
            unique_suppliers[sname] = semail
    for sname, semail in unique_suppliers.items():
        db.add(Supplier(name=sname, email=semail, is_active=True))

    # Seed cost history for a few SKUs
    for sku in skus_created[:5]:
        db.add(CostHistory(
            sku_id=sku.id,
            unit_cost=round(sku.unit_cost * 0.95, 2),
            previous_cost=round(sku.unit_cost * 0.90, 2),
            changed_by="Admin User",
            reason="Supplier contract renewal",
            effective_date=datetime.utcnow() - timedelta(days=60),
        ))
        db.add(CostHistory(
            sku_id=sku.id,
            unit_cost=sku.unit_cost,
            previous_cost=round(sku.unit_cost * 0.95, 2),
            changed_by="Admin User",
            reason="Annual price review",
            effective_date=datetime.utcnow() - timedelta(days=10),
        ))

    db.commit()
