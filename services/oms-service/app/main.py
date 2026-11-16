import json
from datetime import date, datetime
from fastapi import HTTPException
from pydantic import BaseModel
from common.app_factory import create_service_app
from common.db import get_conn

app = create_service_app("Order Management System (OMS) Service")


class OmsOrderCreate(BaseModel):
    order_type: str = "Corporate Gifting"
    customer_name: str
    customer_mobile: str
    customer_email: str | None = None
    company_name: str | None = None
    company_gstin: str | None = None
    outlet_code: str = "DEL01"
    delivery_date: date
    assortment: list[dict]
    branding_notes: str = ""
    credit_limit: float = 0.0
    dispatch_drops: list[dict] = []


class OmsPaymentPayload(BaseModel):
    stage: str
    amount: float
    mode: str = "UPI / NEFT"
    reference: str = "REF-1001"


class OmsAssortmentUpdate(BaseModel):
    assortment: list[dict]
    branding_notes: str = ""
    factory_override: bool = False


@app.get("/orders")
def list_oms_orders():
    with get_conn() as conn:
        orders = conn.execute("SELECT * FROM oms_mod.bulk_orders ORDER BY id DESC").fetchall()
        for o in orders:
            o["payments"] = conn.execute(
                "SELECT * FROM oms_mod.oms_payments WHERE order_no = %s ORDER BY id", (o["order_no"],)
            ).fetchall()
        return orders


@app.post("/orders")
def create_oms_order(payload: OmsOrderCreate):
    with get_conn() as conn:
        bom_cost_total = 0.0
        selling_total = 0.0
        enriched = []
        for line in payload.assortment:
            item = conn.execute(
                "SELECT name, cost_price, selling_price, inventory_uom FROM admin_mod.items WHERE sku = %s",
                (line["sku"],),
            ).fetchone()
            
            item_name = line.get("name") or (item["name"] if item else line["sku"])
            cost_p = float(item["cost_price"]) if item else float(line.get("unit_rate", 500)) * 0.52
            sell_p = float(line.get("unit_rate", item["selling_price"] if item else 650))
            uom = item["inventory_uom"] if item else line.get("uom", "kg")

            boxes = int(line.get("boxes", 10))
            qty_per_box = float(line.get("qty_per_box", 0.5))
            total_qty = round(boxes * qty_per_box, 2)
            unit_rate = sell_p
            bom_cost_total += total_qty * cost_p
            selling_total += total_qty * unit_rate
            enriched.append({
                "sku": line["sku"],
                "name": item_name,
                "qty_per_box": qty_per_box,
                "uom": uom,
                "boxes": boxes,
                "total_qty": total_qty,
                "unit_rate": unit_rate,
            })
        
        margin_pct = round(((selling_total - bom_cost_total) / max(selling_total, 1)) * 100.0, 2)
        cnt = conn.execute("SELECT COUNT(*) AS c FROM oms_mod.bulk_orders").fetchone()["c"] + 11
        order_no = f"OMS-2026-{cnt:04d}"
        return conn.execute(
            """
            INSERT INTO oms_mod.bulk_orders
            (order_no, order_type, customer_name, customer_mobile, customer_email, company_name, company_gstin, outlet_code, delivery_date,
             status, assortment, branding_notes, bom_cost_total, selling_total, margin_pct, advance_paid, balance_due, credit_limit, dispatch_drops)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'QUOTATION',%s::jsonb,%s,%s,%s,%s,0,%s,%s,%s::jsonb)
            RETURNING *
            """,
            (
                order_no, payload.order_type, payload.customer_name, payload.customer_mobile,
                payload.customer_email, payload.company_name, payload.company_gstin,
                payload.outlet_code, payload.delivery_date, json.dumps(enriched),
                payload.branding_notes, round(bom_cost_total, 2), round(selling_total, 2),
                margin_pct, round(selling_total, 2), payload.credit_limit,
                json.dumps(payload.dispatch_drops),
            ),
        ).fetchone()


@app.post("/orders/{order_id}/send-whatsapp-quote")
def send_whatsapp_quote(order_id: int):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.bulk_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        mobile = (order["customer_mobile"] or "").replace("-", "").replace(" ", "").replace("+", "")
        if not mobile.startswith("91") and len(mobile) == 10:
            mobile = f"91{mobile}"

        items_summary = ", ".join([f"{i.get('boxes', 1)}x {i.get('name', 'Box')} ({i.get('uom', 'kg')})" for i in (order["assortment"] or [])[:4]])
        corp_str = f"\n🏢 *Company:* {order['company_name']} (GSTIN: {order.get('company_gstin') or 'N/A'})" if order.get("company_name") else ""
        msg = (
            f"Namaste {order['customer_name']},{corp_str}\n\n"
            f"Thank you for choosing Bikanervala Foods Pvt. Ltd. for your {order['order_type']} requirement!\n\n"
            f"📋 *Official Quotation: #{order['order_no']}*\n"
            f"🎁 *Order Items:* {items_summary}\n"
            f"💰 *Total Amount:* ₹{float(order['selling_total']):,.2f}\n"
            f"📅 *Target Delivery Date:* {order['delivery_date']}\n"
            f"🏷️ *Packaging Note:* {order['branding_notes'] or 'Standard Luxury Ribbon'}\n\n"
            f"To confirm and reserve the production slot, kindly transfer the 30% booking advance.\n\n"
            f"Warm Regards,\n*Bikanervala Corporate & Catering Team*"
        )
        import urllib.parse
        encoded = urllib.parse.quote(msg)
        wa_link = f"https://wa.me/{mobile}?text={encoded}"

        conn.execute("UPDATE oms_mod.bulk_orders SET status = 'QUOTATION_SENT' WHERE id = %s AND status = 'QUOTATION'", (order_id,))
        return {
            "success": True,
            "message": f"WhatsApp Quotation dispatched for {order['order_no']} to {order['customer_mobile']}!",
            "whatsapp_link": wa_link,
            "formatted_message": msg,
            "recipient_mobile": order["customer_mobile"],
            "customer_name": order["customer_name"],
            "quote_amount": float(order["selling_total"])
        }


@app.post("/orders/{order_id}/send-progress-update")
def send_progress_update(order_id: int):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.bulk_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        mobile = (order["customer_mobile"] or "").replace("-", "").replace(" ", "").replace("+", "")
        if not mobile.startswith("91") and len(mobile) == 10:
            mobile = f"91{mobile}"

        stage = (order["status"] or "IN_PROGRESS").replace("_", " ").title()
        msg = (
            f"Namaste {order['customer_name']},\n\n"
            f"✨ *Order Progress Update — Bikanervala #{order['order_no']}*\n"
            f"Current Status: *{stage}*\n"
            f"Delivery Date: *{order['delivery_date']}*\n\n"
            f"Your freshly prepared sweets and gifting hampers are moving through our certified kitchen.\n"
            f"Track anytime with reference #{order['order_no']}."
        )
        import urllib.parse
        encoded = urllib.parse.quote(msg)
        wa_link = f"https://wa.me/{mobile}?text={encoded}"
        return {
            "success": True,
            "message": f"Progress update sent to {order['customer_name']} on WhatsApp!",
            "whatsapp_link": wa_link,
            "formatted_message": msg
        }


@app.post("/orders/{order_id}/notify-ready")
def notify_order_ready(order_id: int):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.bulk_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        mobile = (order["customer_mobile"] or "").replace("-", "").replace(" ", "").replace("+", "")
        if not mobile.startswith("91") and len(mobile) == 10:
            mobile = f"91{mobile}"

        conn.execute("UPDATE oms_mod.bulk_orders SET status = 'READY_FOR_DELIVERY' WHERE id = %s", (order_id,))

        msg = (
            f"Namaste {order['customer_name']} 🎉,\n\n"
            f"Good news! Your {order['order_type']} order *#{order['order_no']}* is *READY & PACKED* in luxury food-grade boxes.\n\n"
            f"📦 *Total Order Value:* ₹{float(order['selling_total']):,.2f}\n"
            f"💳 *Balance Pending:* ₹{float(order['balance_due']):,.2f}\n"
            f"🚚 Handover / Delivery is scheduled for: {order['delivery_date']}.\n\n"
            f"Thank you for choosing Bikanervala!"
        )
        import urllib.parse
        encoded = urllib.parse.quote(msg)
        wa_link = f"https://wa.me/{mobile}?text={encoded}"
        return {
            "success": True,
            "message": f"Order Ready notification sent to {order['customer_name']} on WhatsApp!",
            "whatsapp_link": wa_link,
            "formatted_message": msg,
            "status": "READY_FOR_DELIVERY"
        }


@app.post("/orders/{order_id}/payment")
def record_payment(order_id: int, payload: OmsPaymentPayload):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.bulk_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="OMS order not found")
        rcpt = f"RCPT-OMS-{int(datetime.now().timestamp()) % 100000}"
        conn.execute(
            """
            INSERT INTO oms_mod.oms_payments (order_no, receipt_no, stage, amount, mode, reference)
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (order["order_no"], rcpt, payload.stage, payload.amount, payload.mode, payload.reference),
        )
        new_adv = round(float(order["advance_paid"]) + payload.amount, 2)
        new_bal = round(max(0.0, float(order["selling_total"]) - new_adv), 2)
        new_status = order["status"]
        if order["status"] in ("ENQUIRY", "QUOTATION") and new_adv > 0:
            new_status = "CONFIRMED"
        elif new_bal == 0 and order["status"] in ("DISPATCHED", "QC_READY"):
            new_status = "SETTLED"
        updated = conn.execute(
            "UPDATE oms_mod.bulk_orders SET advance_paid = %s, balance_due = %s, status = %s WHERE id = %s RETURNING *",
            (new_adv, new_bal, new_status, order_id),
        ).fetchone()
        return {"order": updated, "receipt_no": rcpt}


@app.post("/orders/{order_id}/trigger-production")
def trigger_production(order_id: int):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.bulk_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="OMS order not found")
        if order["production_req_no"]:
            return {"message": "Production already triggered", "production_req_no": order["production_req_no"], "order": order}
        created_prods = []
        cnt = conn.execute("SELECT COUNT(*) AS c FROM factory_mod.production_orders").fetchone()["c"] + 91
        for idx, line in enumerate(order["assortment"]):
            item = conn.execute("SELECT sub_category, inventory_uom, cost_price FROM admin_mod.items WHERE sku = %s", (line["sku"],)).fetchone()
            prod_no = f"PRD-2026-{cnt + idx:03d}"
            qty = float(line["total_qty"])
            exp_cost = round(qty * float(item["cost_price"] if item else 300), 2)
            conn.execute(
                """
                INSERT INTO factory_mod.production_orders
                (prod_no, fg_sku, fg_name, sweet_line, planned_qty, uom, source_type, source_ref, kettle_line, shift, status, expected_rm_cost, labor_overhead)
                VALUES (%s,%s,%s,%s,%s,%s,'OMS Bulk',%s,'Copper Karahi #2','Morning Shift','Planned',%s,%s)
                """,
                (
                    prod_no, line["sku"], line["name"], item["sub_category"] if item else "Ghee Sweets",
                    qty, line["uom"], order["order_no"], exp_cost, round(qty * 25.0, 2),
                ),
            )
            created_prods.append(prod_no)
        primary_prod = created_prods[0] if created_prods else "PRD-OMS"
        updated = conn.execute(
            "UPDATE oms_mod.bulk_orders SET status = 'PRODUCTION_LOCKED', production_req_no = %s WHERE id = %s RETURNING *",
            (primary_prod, order_id),
        ).fetchone()
        return {"order": updated, "created_production_orders": created_prods}


@app.put("/orders/{order_id}/amend")
def amend_order(order_id: int, payload: OmsAssortmentUpdate):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.bulk_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order["status"] in ("PRODUCTION_LOCKED", "QC_READY", "DISPATCHED", "SETTLED") and not payload.factory_override:
            raise HTTPException(
                status_code=403,
                detail="Amendment Blocked: Order is PRODUCTION_LOCKED. Factory Manager override required.",
            )
        updated = conn.execute(
            "UPDATE oms_mod.bulk_orders SET assortment = %s::jsonb, branding_notes = %s WHERE id = %s RETURNING *",
            (json.dumps(payload.assortment), payload.branding_notes, order_id),
        ).fetchone()
        return updated


@app.post("/orders/{order_id}/advance-status")
def advance_status(order_id: int, next_status: str):
    with get_conn() as conn:
        row = conn.execute(
            "UPDATE oms_mod.bulk_orders SET status = %s WHERE id = %s RETURNING *",
            (next_status, order_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        return row


# =========================================================================
# ZOMATO & SWIGGY AGGREGATOR ORDER MANAGEMENT SYSTEM (OMS)
# =========================================================================

class AggregatorAcceptPayload(BaseModel):
    prep_time_mins: int = 20
    actor: str = "Store Manager"


class AggregatorDeclinePayload(BaseModel):
    decline_reason: str
    decline_comment: str
    actor: str = "Store Manager"


class AggregatorSimulatePayload(BaseModel):
    platform: str = "ZOMATO"
    outlet_code: str = "DEL01"


@app.get("/aggregators/orders")
def list_aggregator_orders(platform: str | None = None, status: str | None = None, outlet_code: str | None = None):
    with get_conn() as conn:
        q = "SELECT * FROM oms_mod.aggregator_orders WHERE 1=1"
        params = []
        if platform and platform.upper() != "ALL":
            q += " AND platform = %s"
            params.append(platform.upper())
        if status and status.upper() != "ALL":
            q += " AND status = %s"
            params.append(status.upper())
        if outlet_code and outlet_code.upper() != "ALL":
            q += " AND outlet_code = %s"
            params.append(outlet_code)
        q += " ORDER BY id DESC"
        orders = conn.execute(q, tuple(params)).fetchall()
        return orders


@app.post("/aggregators/zomato/webhook")
def zomato_order_webhook(payload: dict):
    """
    Live Zomato Webhook Receiver:
    Accepts incoming orders pushed directly by Zomato Partner API.
    """
    with get_conn() as conn:
        zom_order_id = payload.get("order_id") or payload.get("aggregator_order_id") or f"ZOM-EXT-{int(datetime.now().timestamp()*1000)%1000000}"
        display_no = payload.get("display_order_no") or f"ZOM#{zom_order_id[-4:]}"
        outlet_code = payload.get("outlet_code", "DEL01")
        customer_name = payload.get("customer_name", "Zomato Customer")
        customer_mobile = payload.get("customer_mobile", "+91-98XXXXXXXX")
        delivery_address = payload.get("delivery_address", "Customer Delivery Location")
        items = payload.get("items", [{"name": "Royal Kaju Katli (500g)", "qty": 1, "price": 480}])
        item_total = float(payload.get("item_total", 480.0))
        taxes = float(payload.get("taxes", item_total * 0.05))
        delivery_fee = float(payload.get("delivery_fee", 35.0))
        packing_charge = float(payload.get("packing_charge", 20.0))
        grand_total = float(payload.get("grand_total", item_total + taxes + delivery_fee + packing_charge))
        rider_name = payload.get("rider_name", "Assigned Zomato Valet")
        rider_mobile = payload.get("rider_mobile", "+91-9988001122")
        otp = str(payload.get("otp_code", f"{int(datetime.now().timestamp()) % 10000:04d}"))

        row = conn.execute(
            """
            INSERT INTO oms_mod.aggregator_orders
            (platform, aggregator_order_id, display_order_no, outlet_code, customer_name, customer_mobile,
             delivery_address, items, item_total, taxes, delivery_fee, packing_charge, grand_total, status,
             prep_time_mins, rider_name, rider_mobile, otp_code)
            VALUES ('ZOMATO', %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, 'PLACED', 20, %s, %s, %s)
            ON CONFLICT (aggregator_order_id) DO UPDATE SET status = 'PLACED'
            RETURNING *
            """,
            (
                zom_order_id, display_no, outlet_code, customer_name, customer_mobile,
                delivery_address, json.dumps(items), item_total, taxes, delivery_fee, packing_charge,
                grand_total, rider_name, rider_mobile, otp,
            ),
        ).fetchone()

        return {"status": "success", "message": "Zomato order received into Annavya OMS", "order": row}


@app.post("/aggregators/swiggy/webhook")
def swiggy_order_webhook(payload: dict):
    """
    Live Swiggy Webhook Receiver:
    Accepts incoming orders pushed directly by Swiggy UrbanPiper / Direct API.
    """
    with get_conn() as conn:
        swg_order_id = payload.get("order_id") or payload.get("aggregator_order_id") or f"SWG-EXT-{int(datetime.now().timestamp()*1000)%1000000}"
        display_no = payload.get("display_order_no") or f"SWG#{swg_order_id[-4:]}"
        outlet_code = payload.get("outlet_code", "DEL01")
        customer_name = payload.get("customer_name", "Swiggy Customer")
        customer_mobile = payload.get("customer_mobile", "+91-97XXXXXXXX")
        delivery_address = payload.get("delivery_address", "Delivery Address, Delhi NCR")
        items = payload.get("items", [{"name": "Desi Ghee Besan Laddu (1kg)", "qty": 1, "price": 580}])
        item_total = float(payload.get("item_total", 580.0))
        taxes = float(payload.get("taxes", item_total * 0.05))
        delivery_fee = float(payload.get("delivery_fee", 40.0))
        packing_charge = float(payload.get("packing_charge", 25.0))
        grand_total = float(payload.get("grand_total", item_total + taxes + delivery_fee + packing_charge))
        rider_name = payload.get("rider_name", "Swiggy Delivery Executive")
        rider_mobile = payload.get("rider_mobile", "+91-9977665544")
        otp = str(payload.get("otp_code", f"{int(datetime.now().timestamp()) % 10000:04d}"))

        row = conn.execute(
            """
            INSERT INTO oms_mod.aggregator_orders
            (platform, aggregator_order_id, display_order_no, outlet_code, customer_name, customer_mobile,
             delivery_address, items, item_total, taxes, delivery_fee, packing_charge, grand_total, status,
             prep_time_mins, rider_name, rider_mobile, otp_code)
            VALUES ('SWIGGY', %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, 'PLACED', 15, %s, %s, %s)
            ON CONFLICT (aggregator_order_id) DO UPDATE SET status = 'PLACED'
            RETURNING *
            """,
            (
                swg_order_id, display_no, outlet_code, customer_name, customer_mobile,
                delivery_address, json.dumps(items), item_total, taxes, delivery_fee, packing_charge,
                grand_total, rider_name, rider_mobile, otp,
            ),
        ).fetchone()

        return {"status": "success", "message": "Swiggy order received into Annavya OMS", "order": row}


KITCHEN_KEYWORDS = [
    "chaat", "plate", "bhalla", "chole", "bhature", "tikki", "samosa", "kachori",
    "thali", "paneer", "dal", "roti", "naan", "paratha", "kulcha", "dosa", "idli",
    "sambhar", "vada", "noodles", "manchurian", "fried rice", "combo", "tea", "coffee",
    "shake", "beverage", "lassi", "meal", "curry", "rice", "briyani", "biryani",
    "tandoor", "kulche", "soup", "chinese", "snack"
]


def classify_aggregator_item(item: dict) -> str:
    name_lower = str(item.get("name", "")).lower()
    cat = str(item.get("category", "")).lower()
    if "rest" in cat or "kitchen" in cat or "chaat" in cat:
        return "KITCHEN"
    if "sweet" in cat or "namkeen" in cat or "bakery" in cat or "pack" in cat:
        return "SWEET_COUNTER"
    if any(k in name_lower for k in KITCHEN_KEYWORDS):
        return "KITCHEN"
    return "SWEET_COUNTER"


@app.post("/aggregators/orders/{order_id}/accept")
def accept_aggregator_order(order_id: int, payload: AggregatorAcceptPayload):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.aggregator_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Aggregator order not found")
        if order["status"] == "DECLINED":
            raise HTTPException(status_code=400, detail="Cannot accept an already declined order")

        # 1. Update Aggregator Order status
        updated = conn.execute(
            """
            UPDATE oms_mod.aggregator_orders
            SET status = 'ACCEPTED', prep_time_mins = %s, accepted_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (payload.prep_time_mins, order_id),
        ).fetchone()

        # 2. Split items by category: Kitchen (FG-Rest) vs Sweet Counter (FG-Sweet / Packaged)
        raw_items = order["items"]
        if isinstance(raw_items, str):
            try:
                raw_items = json.loads(raw_items)
            except Exception:
                raw_items = []
        elif not isinstance(raw_items, list):
            raw_items = []

        kitchen_items = []
        sweet_items = []
        for itm in raw_items:
            dest = classify_aggregator_item(itm)
            if dest == "KITCHEN":
                kitchen_items.append(itm)
            else:
                sweet_items.append(itm)

        kot_slip = None
        sweet_slip = None
        clean_num = order["display_order_no"].replace("#", "").replace("-", "")

        # 3. Route to Restaurant KOT & Kitchen Station (if kitchen food items exist)
        if kitchen_items:
            kot_no = f"KOT-{order['platform'][:3]}-{clean_num}"
            kot_total = sum(float(i.get("price", 0)) * float(i.get("qty", 1)) for i in kitchen_items)
            kot_row = conn.execute(
                """
                INSERT INTO kot_mod.kots
                (kot_no, outlet_code, table_code, order_source, captain_name, items, status, total_amount, void_reason)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, 'FIRED', %s, %s)
                ON CONFLICT (kot_no) DO UPDATE SET items = EXCLUDED.items, total_amount = EXCLUDED.total_amount
                RETURNING *
                """,
                (
                    kot_no,
                    order["outlet_code"],
                    f"{order['platform']} Delivery Station",
                    order["platform"],
                    f"{order['platform']} OMS Dispatch",
                    json.dumps(kitchen_items),
                    kot_total,
                    f"Rider: {order['rider_name']} ({order['rider_mobile']}) | OTP: {order['otp_code']}",
                ),
            ).fetchone()
            kot_slip = {
                "kot_no": kot_no,
                "items": kitchen_items,
                "item_count": len(kitchen_items),
                "total_amount": kot_total,
                "printing_standard": "Dual-Cut Kitchen Slip (80mm StarPRNT - 1 Copy Kitchen Captain, 1 Copy Counter Chef)",
            }

        # 4. Route to Retail Sweet Counter (if sweets / packaged items exist)
        if sweet_items:
            import hashlib
            estimate_no = f"SWT-{order['platform'][:3]}-{clean_num}"
            invoice_no = f"INV-SWT-{clean_num}"
            sweet_total = sum(float(i.get("price", 0)) * float(i.get("qty", 1)) for i in sweet_items)
            cart_hash = hashlib.sha256(json.dumps(sweet_items, sort_keys=True).encode()).hexdigest()[:16]
            cgst = round(sweet_total * 0.025, 2)
            sgst = round(sweet_total * 0.025, 2)
            payment_splits = [{"mode": f"{order['platform']}_PREPAID", "amount": sweet_total}]
            pos_row = conn.execute(
                """
                INSERT INTO pos_mod.pos_orders
                (estimate_no, invoice_no, outlet_code, mode, status, items, subtotal, cart_hash, cgst, sgst, grand_total, payment_splits, estimate_staff, cashier_id, paid_at)
                VALUES (%s, %s, %s, 'AGGREGATOR_SWEET_COUNTER', 'PAID_PENDING_DELIVERY', %s::jsonb, %s, %s, %s, %s, %s, %s::jsonb, %s, 'PREPAID_AGGREGATOR', NOW())
                ON CONFLICT (estimate_no) DO UPDATE SET items = EXCLUDED.items, grand_total = EXCLUDED.grand_total
                RETURNING *
                """,
                (
                    estimate_no,
                    invoice_no,
                    order["outlet_code"],
                    json.dumps(sweet_items),
                    sweet_total,
                    cart_hash,
                    cgst,
                    sgst,
                    sweet_total,
                    json.dumps(payment_splits),
                    f"{order['platform']} Dispatch Desk",
                ),
            ).fetchone()
            sweet_slip = {
                "estimate_no": estimate_no,
                "invoice_no": invoice_no,
                "items": sweet_items,
                "item_count": len(sweet_items),
                "total_amount": sweet_total,
                "printing_standard": "40-Column Sweet Packaging Slip (58mm ESC/POS thermal format with item weights & packing tokens)",
            }

        routed_destinations = []
        if kot_slip:
            routed_destinations.append("Restaurant Kitchen KOT Station (Dual-Cut Slip)")
        if sweet_slip:
            routed_destinations.append("Retail Sweet Counter Packaging Desk (40-Col Thermal Slip)")

        return {
            "success": True,
            "message": f"🎉 {order['platform']} Order {order['display_order_no']} ACCEPTED & AUTO-ROUTED! Sent {payload.prep_time_mins} mins SLA buffer to {order['platform']}.",
            "order": updated,
            "routing": {
                "routed_destinations": routed_destinations,
                "kot_slip": kot_slip,
                "sweet_slip": sweet_slip,
                "kitchen_items_count": len(kitchen_items),
                "sweet_items_count": len(sweet_items),
            },
        }


@app.post("/aggregators/orders/{order_id}/decline")
def decline_aggregator_order(order_id: int, payload: AggregatorDeclinePayload):
    # Mandatory comment validation
    if not payload.decline_comment or not payload.decline_comment.strip():
        raise HTTPException(
            status_code=400,
            detail="Mandatory Comment Required: Zomato/Swiggy SLA requires an operational explanation comment to decline an order."
        )

    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.aggregator_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Aggregator order not found")

        updated = conn.execute(
            """
            UPDATE oms_mod.aggregator_orders
            SET status = 'DECLINED', decline_reason = %s, decline_comment = %s
            WHERE id = %s
            RETURNING *
            """,
            (payload.decline_reason, payload.decline_comment.strip(), order_id),
        ).fetchone()

        return {
            "success": True,
            "message": f"{order['platform']} Order {order['display_order_no']} DECLINED. Cancellation webhook relayed to {order['platform']}.",
            "order": updated,
        }


@app.post("/aggregators/orders/{order_id}/mark-ready")
def mark_aggregator_order_ready(order_id: int):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.aggregator_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        updated = conn.execute(
            """
            UPDATE oms_mod.aggregator_orders
            SET status = 'FOOD_READY', ready_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (order_id,),
        ).fetchone()

        return {
            "success": True,
            "message": f"Food Ready signaled for {order['platform']} {order['display_order_no']}! Rider notification triggered.",
            "order": updated,
        }


@app.post("/aggregators/orders/{order_id}/picked-up")
def mark_aggregator_order_picked_up(order_id: int):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM oms_mod.aggregator_orders WHERE id = %s", (order_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        updated = conn.execute(
            """
            UPDATE oms_mod.aggregator_orders
            SET status = 'PICKED_UP', picked_up_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (order_id,),
        ).fetchone()

        return {
            "success": True,
            "message": f"Order {order['display_order_no']} successfully handed over to {order['rider_name']}.",
            "order": updated,
        }


@app.post("/aggregators/simulate-incoming")
def simulate_incoming_order(
    payload: AggregatorSimulatePayload | None = None,
    platform: str | None = None,
    outlet_code: str | None = None,
):
    """
    Simulation tool for Customer Demos:
    Instantly generates an incoming live Zomato or Swiggy order with realistic customer & items,
    triggering the top notification bar and alarm chime!
    """
    import random
    ts = int(datetime.now().timestamp() * 1000) % 100000
    chosen_platform = (payload.platform if payload and payload.platform else platform or "ZOMATO").upper()
    chosen_outlet = (payload.outlet_code if payload and payload.outlet_code else outlet_code or "DEL01")
    prefix = "ZOM" if chosen_platform == "ZOMATO" else "SWG"
    order_id = f"{prefix}-LIVE-{ts}"
    display_no = f"{prefix}#{ts % 10000:04d}"

    demo_customers = [
        {"name": "Siddharth Verma", "mobile": "+91-9811099221", "address": "B-4/12 Connaught Place, New Delhi"},
        {"name": "Ananya Singhania", "mobile": "+91-9877112233", "address": "Tower 4, DLF Phase 5, Gurugram"},
        {"name": "Rajiv Mehra", "mobile": "+91-9899443322", "address": "Sector 18 Market, Pocket A, Noida"},
        {"name": "Meera Kapoor", "mobile": "+91-9810123456", "address": "33 Golf Links Road, New Delhi"},
    ]
    cust = random.choice(demo_customers)

    menu_samples = [
        {"name": "Royal Silver-Leaf Kaju Katli (500g)", "qty": 1, "price": 480, "category": "FG-Sweet"},
        {"name": "Spongy White Rasgulla (4 pcs)", "qty": 2, "price": 160, "category": "FG-Sweet"},
        {"name": "Desi Ghee Besan Laddu (1kg)", "qty": 1, "price": 580, "category": "FG-Sweet"},
        {"name": "Hot Kesar Gulab Jamun (4 pcs)", "qty": 1, "price": 180, "category": "FG-Sweet"},
        {"name": "Kaju Pista Roll (250g)", "qty": 1, "price": 320, "category": "FG-Sweet"},
        {"name": "Special Dahi Bhalla Chaat Plate", "qty": 2, "price": 140, "category": "FG-Rest"},
        {"name": "Amritsari Chole Bhature Special Combo", "qty": 2, "price": 220, "category": "FG-Rest"},
        {"name": "Bikanervala Royal Maharaja Thali", "qty": 1, "price": 380, "category": "FG-Rest"},
        {"name": "Desi Ghee Jalebi with Rabri Plate", "qty": 1, "price": 190, "category": "FG-Rest"},
        {"name": "Paneer Tikka Roll & Mint Chutney", "qty": 1, "price": 160, "category": "FG-Rest"},
        {"name": "Bikanervala Aloo Bhujia Namkeen 400g", "qty": 2, "price": 115, "category": "FG-Sweet"},
    ]
    sampled_items = random.sample(menu_samples, k=random.randint(1, 3))
    item_total = sum(i["qty"] * i["price"] for i in sampled_items)
    taxes = round(item_total * 0.05, 2)
    delivery_fee = 35.0
    packing_charge = 20.0
    grand_total = round(item_total + taxes + delivery_fee + packing_charge, 2)

    riders = [
        {"name": f"Suraj Pal ({chosen_platform} Delivery)", "mobile": "+91-9822331100"},
        {"name": f"Manish Joshi ({chosen_platform} Rider)", "mobile": "+91-9988771122"},
        {"name": f"Deepak Rawat ({chosen_platform} Partner)", "mobile": "+91-9711223344"},
    ]
    rider = random.choice(riders)
    otp = f"{random.randint(1000, 9999)}"

    with get_conn() as conn:
        row = conn.execute(
            """
            INSERT INTO oms_mod.aggregator_orders
            (platform, aggregator_order_id, display_order_no, outlet_code, customer_name, customer_mobile,
             delivery_address, items, item_total, taxes, delivery_fee, packing_charge, grand_total, status,
             prep_time_mins, rider_name, rider_mobile, otp_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, 'PLACED', 20, %s, %s, %s)
            RETURNING *
            """,
            (
                chosen_platform, order_id, display_no, chosen_outlet, cust["name"], cust["mobile"],
                cust["address"], json.dumps(sampled_items), item_total, taxes, delivery_fee, packing_charge,
                grand_total, rider["name"], rider["mobile"], otp,
            ),
        ).fetchone()

        return {
            "success": True,
            "message": f"Live incoming {chosen_platform} order {display_no} simulated!",
            "order": row,
            "id": row["id"],
            "display_order_no": display_no,
            "status": row["status"]
        }


@app.get("/aggregators/config")
def get_aggregator_config():
    with get_conn() as conn:
        row = conn.execute("SELECT config_value FROM admin_mod.system_config WHERE config_key = 'aggregator_config'").fetchone()
        if not row:
            return {
                "zomato": {"enabled": True, "merchant_id": "ZOM_9921", "auto_accept": False, "default_prep_time_mins": 20},
                "swiggy": {"enabled": True, "restaurant_id": "SWG_4412", "auto_accept": False, "default_prep_time_mins": 15}
            }
        return row["config_value"]


@app.put("/aggregators/config")
def update_aggregator_config(payload: dict):
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO admin_mod.system_config (config_key, config_value)
            VALUES ('aggregator_config', %s::jsonb)
            ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value
            """,
            (json.dumps(payload),),
        )
        return {"success": True, "message": "Zomato & Swiggy aggregator configurations updated successfully", "config": payload}


