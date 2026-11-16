import json
from datetime import datetime
from fastapi import HTTPException
from pydantic import BaseModel
from common.app_factory import create_service_app
from common.db import get_conn

app = create_service_app("KOT & Restaurant Kitchen Service")


class KotCreate(BaseModel):
    outlet_code: str = "GUR02"
    table_code: str = "T-02"
    order_source: str = "DINE_IN"
    captain_name: str = "Arjun Negi"
    pax: int = 4
    items: list[dict]


class StationStatusUpdate(BaseModel):
    item_index: int
    station_status: str


class KotVoidPayload(BaseModel):
    reason: str
    manager_pin: str


class TableSettlePayload(BaseModel):
    outlet_code: str
    table_code: str
    payment_mode: str = "UPI"
    cashier_id: str = "Priya Sharma"


class TableStatusUpdate(BaseModel):
    status: str = "Occupied"
    current_pax: int = 2


class TableOrderPayload(BaseModel):
    outlet_code: str = "GUR02"
    table_code: str = "T-01"
    captain_name: str = "Arjun Negi"
    pax: int = 2
    guest_name: str = ""
    guest_phone: str = ""
    order_notes: str = ""
    items: list[dict]


class KotHandoverPayload(BaseModel):
    handover_type: str = "DIRECT_TO_CUSTOMER"  # "DIRECT_TO_CUSTOMER" or "CALL_WAITER_TABLE"
    runner_name: str = "Waiter - Ram Singh"
    notes: str = ""


class KioskOrderPayload(BaseModel):
    outlet_code: str = "GUR02"
    order_type: str = "DINE_IN"  # DINE_IN or TAKEAWAY
    table_code: str = "KIOSK-01"
    customer_name: str = "Guest Customer"
    customer_phone: str = ""
    payment_choice: str = "PAY_AT_COUNTER"  # "PAY_NOW_ONLINE" or "PAY_AT_COUNTER"
    payment_mode: str = "Cash"  # UPI, Card, Cash
    payment_ref: str = ""
    items: list[dict]


def generate_two_slip_kot(kot_no: str, outlet_code: str, table_code: str, captain_name: str, pax: int, items: list[dict], order_notes: str = "") -> dict:
    timestamp_str = datetime.now().strftime("%d-%b-%Y %I:%M %p")
    divider = "-" * 40

    # COPY 1: KITCHEN CAPTAIN COPY (Stays with Captain for table tracking)
    slip_captain = [
        "========================================",
        "      *** KITCHEN CAPTAIN COPY ***      ",
        "        (Retained at Captain Desk)      ",
        "========================================",
        f"Outlet: {outlet_code} | Table: {table_code}",
        f"KOT No: {kot_no} | Pax: {pax}",
        f"Captain: {captain_name}",
        f"Time: {timestamp_str}",
        divider,
        f"{'ITEM / DISH':<24} {'QTY':>4} {'STATUS':>8}",
        divider,
    ]
    for it in items:
        name = (it.get("name") or it.get("sku", ""))[:24]
        qty = it.get("qty", 1)
        slip_captain.append(f"{name:<24} {qty:>4} {'Queued':>8}")
        if it.get("modifiers") and it.get("modifiers") not in ("Standard", "Kiosk Self-Order"):
            slip_captain.append(f"  * Note: {it.get('modifiers')}")
    if order_notes:
        slip_captain.append(divider)
        slip_captain.append(f"Notes: {order_notes}")
    slip_captain.extend([
        divider,
        "Status: ACTIVE / QUEUED IN KITCHEN",
        "Wait for Counter Chef Readiness Call",
        "========================================",
    ])

    # COPY 2: COUNTER CHEF COPY (Sent to Kitchen Counter / Station Chef)
    slip_chef = [
        "========================================",
        "       *** COUNTER CHEF COPY ***        ",
        "      (Kitchen Station Food Ticket)     ",
        "========================================",
        f"Outlet: {outlet_code} | Table: {table_code}",
        f"KOT No: {kot_no} | Pax: {pax}",
        f"Captain: {captain_name}",
        f"Time: {timestamp_str}",
        divider,
        f"{'ITEM / DISH':<26} {'STATION':<8} {'QTY':>4}",
        divider,
    ]
    for it in items:
        name = (it.get("name") or it.get("sku", ""))[:26]
        st = (it.get("station") or "Main")[:8]
        qty = it.get("qty", 1)
        slip_chef.append(f"{name:<26} {st:<8} {qty:>4}")
        if it.get("modifiers") and it.get("modifiers") not in ("Standard", "Kiosk Self-Order"):
            slip_chef.append(f"  * Instructions: {it.get('modifiers')}")
    slip_chef.extend([
        divider,
        "CHEF ACTION: Mark READY when plated",
        "Inform Captain for Runner Pickup",
        "========================================",
    ])

    cut_line = "\n\n✂ ----------------- CUT HERE (KOT PRINTER AUTO-CUT) ----------------- ✂\n\n"
    combined = "\n".join(slip_captain) + cut_line + "\n".join(slip_chef)

    return {
        "captain_slip": "\n".join(slip_captain),
        "cut_command": "\x1dV\x00",
        "cut_line": cut_line,
        "chef_slip": "\n".join(slip_chef),
        "combined_dual_slip": combined,
    }


@app.get("/tables")
def list_tables(outlet_code: str = "GUR02"):
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM kot_mod.dining_tables WHERE outlet_code = %s ORDER BY table_code",
            (outlet_code.upper(),),
        ).fetchall()


@app.get("/kots")
def list_kots(outlet_code: str | None = None):
    with get_conn() as conn:
        if outlet_code:
            return conn.execute(
                "SELECT * FROM kot_mod.kots WHERE outlet_code = %s ORDER BY id DESC LIMIT 50",
                (outlet_code.upper(),),
            ).fetchall()
        return conn.execute("SELECT * FROM kot_mod.kots ORDER BY id DESC LIMIT 50").fetchall()


@app.get("/kots/{kot_id}/two-slip")
def get_kot_two_slip(kot_id: int):
    with get_conn() as conn:
        kot = conn.execute("SELECT * FROM kot_mod.kots WHERE id = %s", (kot_id,)).fetchone()
        if not kot:
            raise HTTPException(status_code=404, detail="KOT not found")
        items = kot["items"] if isinstance(kot["items"], list) else json.loads(kot["items"])
        two_slip = generate_two_slip_kot(
            kot_no=kot["kot_no"],
            outlet_code=kot["outlet_code"],
            table_code=kot["table_code"],
            captain_name=kot["captain_name"],
            pax=2,
            items=items,
        )
        return {"kot": kot, "two_slip": two_slip}


@app.post("/kots")
def fire_kot(payload: KotCreate):
    if not payload.items:
        raise HTTPException(status_code=400, detail="KOT items cannot be empty")
    with get_conn() as conn:
        enriched = []
        total = 0.0
        for item in payload.items:
            meta = conn.execute(
                "SELECT name, selling_price, kitchen_station FROM admin_mod.items WHERE sku = %s",
                (item["sku"],),
            ).fetchone()
            price = float(item.get("unit_price", meta["selling_price"] if meta else 150))
            qty = float(item.get("qty", 1))
            total += price * qty
            enriched.append({
                "sku": item["sku"],
                "name": meta["name"] if meta else item.get("name", item["sku"]),
                "qty": qty,
                "unit_price": price,
                "station": meta["kitchen_station"] if (meta and meta["kitchen_station"]) else item.get("station", "Tandoor"),
                "modifiers": item.get("modifiers", "Standard"),
                "course": item.get("course", "Main"),
                "station_status": "Queued",
            })

        cnt = conn.execute("SELECT COUNT(*) AS c FROM kot_mod.kots").fetchone()["c"] + 106
        kot_no = f"KOT-{payload.outlet_code}-{cnt}"
        kot = conn.execute(
            """
            INSERT INTO kot_mod.kots (kot_no, outlet_code, table_code, order_source, captain_name, items, status, total_amount)
            VALUES (%s,%s,%s,%s,%s,%s::jsonb,'ACTIVE',%s) RETURNING *
            """,
            (kot_no, payload.outlet_code, payload.table_code, payload.order_source, payload.captain_name, json.dumps(enriched), round(total, 2)),
        ).fetchone()

        if payload.order_source == "DINE_IN":
            conn.execute(
                "UPDATE kot_mod.dining_tables SET status = 'KOT Running', current_pax = %s WHERE outlet_code = %s AND table_code = %s",
                (payload.pax, payload.outlet_code, payload.table_code),
            )

        two_slip = generate_two_slip_kot(
            kot_no=kot_no,
            outlet_code=payload.outlet_code,
            table_code=payload.table_code,
            captain_name=payload.captain_name,
            pax=payload.pax,
            items=enriched,
        )

        return {
            "success": True,
            "kot": kot,
            "two_slip": two_slip,
            "kot_no": kot_no,
            "table_code": payload.table_code,
            "total_amount": round(total, 2),
        }


@app.patch("/kots/{kot_id}/station-status")
def update_station_status(kot_id: int, payload: StationStatusUpdate):
    with get_conn() as conn:
        kot = conn.execute("SELECT * FROM kot_mod.kots WHERE id = %s", (kot_id,)).fetchone()
        if not kot:
            raise HTTPException(status_code=404, detail="KOT not found")
        items = list(kot["items"])
        if payload.item_index < 0 or payload.item_index >= len(items):
            raise HTTPException(status_code=400, detail="Invalid item index")
        items[payload.item_index]["station_status"] = payload.station_status
        all_ready = all(i.get("station_status") == "Ready" for i in items)
        new_kot_status = "READY" if all_ready else "ACTIVE"
        return conn.execute(
            "UPDATE kot_mod.kots SET items = %s::jsonb, status = %s WHERE id = %s RETURNING *",
            (json.dumps(items), new_kot_status, kot_id),
        ).fetchone()


@app.patch("/kots/{kot_id}/handover")
def kot_handover(kot_id: int, payload: KotHandoverPayload):
    with get_conn() as conn:
        kot = conn.execute("SELECT * FROM kot_mod.kots WHERE id = %s", (kot_id,)).fetchone()
        if not kot:
            raise HTTPException(status_code=404, detail="KOT not found")
        new_status = "SERVED" if payload.handover_type == "CALL_WAITER_TABLE" else "DELIVERED"
        updated = conn.execute(
            "UPDATE kot_mod.kots SET status = %s WHERE id = %s RETURNING *",
            (new_status, kot_id),
        ).fetchone()
        msg = (
            f"Dispatched Order Boy '{payload.runner_name}' to deliver ready dishes to Table {kot['table_code']}"
            if payload.handover_type == "CALL_WAITER_TABLE"
            else f"Ready dishes handed over directly to Customer at pickup counter"
        )
        return {
            "success": True,
            "kot": updated,
            "handover_type": payload.handover_type,
            "runner_name": payload.runner_name,
            "message": msg,
        }


@app.post("/kots/{kot_id}/void")
def void_kot(kot_id: int, payload: KotVoidPayload):
    with get_conn() as conn:
        mgr = conn.execute(
            "SELECT u.full_name FROM admin_mod.users u JOIN admin_mod.roles r ON r.id = u.role_id WHERE r.name IN ('Super Admin', 'Director / Owner', 'Shop Manager', 'Corporate Manager') AND u.pin = %s LIMIT 1",
            (payload.manager_pin,),
        ).fetchone()
        if not mgr:
            raise HTTPException(status_code=403, detail="Manager PIN verification failed for KOT VOID")

        row = conn.execute(
            "UPDATE kot_mod.kots SET status = 'VOIDED', void_reason = %s WHERE id = %s RETURNING *",
            (f"Voided by {mgr['full_name']}: {payload.reason}", kot_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="KOT not found")
        return row


@app.post("/tables/settle")
def settle_table(payload: TableSettlePayload):
    with get_conn() as conn:
        kots = conn.execute(
            "SELECT * FROM kot_mod.kots WHERE outlet_code = %s AND table_code = %s AND status IN ('ACTIVE', 'READY', 'SERVED')",
            (payload.outlet_code, payload.table_code),
        ).fetchall()
        if not kots:
            raise HTTPException(status_code=400, detail="No active KOT found for this table")

        aggregated_items = []
        subtotal = 0.0
        for k in kots:
            for it in k["items"]:
                price = float(it.get("unit_price", 150))
                qty = float(it.get("qty", 1))
                subtotal += price * qty
                aggregated_items.append({
                    "sku": it["sku"],
                    "name": it.get("name", it["sku"]),
                    "qty": qty,
                    "unit_price": price,
                    "uom": "pcs",
                    "gst_pct": 5.0,
                    "line_total": round(price * qty, 2),
                    "kot_no": k["kot_no"],
                })

        cgst = round(subtotal * 0.025, 2)
        sgst = round(subtotal * 0.025, 2)
        grand_total = round(subtotal + cgst + sgst, 2)

        cnt = conn.execute("SELECT COUNT(*) AS c FROM pos_mod.pos_orders WHERE invoice_no IS NOT NULL").fetchone()["c"] + 39
        inv_no = f"INV-REST-{payload.outlet_code}-{cnt:04d}"
        est_no = f"EST-REST-{payload.outlet_code}-{cnt:04d}"

        # Insert POS order
        order = conn.execute(
            """
            INSERT INTO pos_mod.pos_orders
            (estimate_no, invoice_no, outlet_code, mode, status, items, subtotal, discount_amount, cart_hash, cgst, sgst, grand_total, payment_splits, cashier_id, paid_at)
            VALUES (%s,%s,%s,'RESTAURANT_DINE_IN','PAID',%s::jsonb,%s,0,'rest-hash',%s,%s,%s,%s::jsonb,%s,NOW())
            RETURNING *
            """,
            (
                est_no, inv_no, payload.outlet_code, json.dumps(aggregated_items),
                round(subtotal, 2), cgst, sgst, grand_total,
                json.dumps([{"mode": payload.payment_mode, "amount": grand_total, "ref": f"REST-{payload.table_code}"}]),
                payload.cashier_id,
            ),
        ).fetchone()

        # Update KOTs with invoice_no and status
        conn.execute(
            "UPDATE kot_mod.kots SET status = 'SETTLED', pos_invoice_no = %s WHERE outlet_code = %s AND table_code = %s AND status IN ('ACTIVE', 'READY', 'SERVED')",
            (inv_no, payload.outlet_code, payload.table_code),
        )

        # Release table
        conn.execute(
            "UPDATE kot_mod.dining_tables SET status = 'Available', current_pax = 0 WHERE outlet_code = %s AND table_code = %s",
            (payload.outlet_code, payload.table_code),
        )

        # Deduct kitchen recipe ingredients
        for it in aggregated_items:
            bom = conn.execute("SELECT * FROM admin_mod.boms WHERE fg_sku = %s", (it["sku"],)).fetchone()
            if bom:
                for line in bom["lines"]:
                    req_qty = float(line["qty"]) * it["qty"]
                    conn.execute(
                        """
                        UPDATE stores_mod.stock_levels
                        SET current_stock = GREATEST(0, current_stock - %s)
                        WHERE outlet_code = %s AND item_sku = %s
                        """,
                        (req_qty, payload.outlet_code, line["rm_sku"]),
                    )

        return {
            "invoice_no": inv_no,
            "order_id": order["id"],
            "grand_total": grand_total,
            "table_code": payload.table_code,
            "settled_kots_count": len(kots),
        }


@app.post("/tables/{outlet_code}/{table_code}/clean")
def mark_table_cleaned(outlet_code: str, table_code: str):
    with get_conn() as conn:
        row = conn.execute(
            "UPDATE kot_mod.dining_tables SET status = 'Available', current_pax = 0 WHERE outlet_code = %s AND table_code = %s RETURNING *",
            (outlet_code.upper(), table_code.upper()),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Table not found")
        return row


@app.patch("/tables/{outlet_code}/{table_code}/status")
def update_table_status(outlet_code: str, table_code: str, payload: TableStatusUpdate):
    with get_conn() as conn:
        row = conn.execute(
            "UPDATE kot_mod.dining_tables SET status = %s, current_pax = %s WHERE outlet_code = %s AND table_code = %s RETURNING *",
            (payload.status, payload.current_pax, outlet_code.upper(), table_code.upper()),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Table not found")
        return row


@app.post("/table-order")
def place_table_order(payload: TableOrderPayload):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cannot place order with empty cart")
    with get_conn() as conn:
        tbl = conn.execute(
            "SELECT * FROM kot_mod.dining_tables WHERE outlet_code = %s AND table_code = %s",
            (payload.outlet_code.upper(), payload.table_code.upper()),
        ).fetchone()
        if not tbl:
            raise HTTPException(status_code=404, detail=f"Table {payload.table_code} not found in outlet {payload.outlet_code}")

        enriched = []
        total = 0.0
        for item in payload.items:
            meta = conn.execute(
                "SELECT name, selling_price, kitchen_station FROM admin_mod.items WHERE sku = %s",
                (item["sku"],),
            ).fetchone()
            price = float(item.get("unit_price", meta["selling_price"] if meta else 150))
            qty = float(item.get("qty", 1))
            total += price * qty
            enriched.append({
                "sku": item["sku"],
                "name": meta["name"] if meta else item.get("name", item["sku"]),
                "qty": qty,
                "unit_price": price,
                "station": meta["kitchen_station"] if (meta and meta["kitchen_station"]) else item.get("station", "Main Kitchen"),
                "modifiers": item.get("modifiers", payload.order_notes or "Standard"),
                "course": item.get("course", "Main"),
                "station_status": "Queued",
            })

        cnt = conn.execute("SELECT COUNT(*) AS c FROM kot_mod.kots").fetchone()["c"] + 107
        kot_no = f"KOT-{payload.outlet_code.upper()}-{cnt}"
        kot = conn.execute(
            """
            INSERT INTO kot_mod.kots (kot_no, outlet_code, table_code, order_source, captain_name, items, status, total_amount)
            VALUES (%s,%s,%s,'TABLE_ORDER',%s,%s::jsonb,'ACTIVE',%s) RETURNING *
            """,
            (kot_no, payload.outlet_code.upper(), payload.table_code.upper(), payload.captain_name, json.dumps(enriched), round(total, 2)),
        ).fetchone()

        conn.execute(
            "UPDATE kot_mod.dining_tables SET status = 'KOT Running', current_pax = %s WHERE outlet_code = %s AND table_code = %s",
            (payload.pax, payload.outlet_code.upper(), payload.table_code.upper()),
        )

        two_slip = generate_two_slip_kot(
            kot_no=kot_no,
            outlet_code=payload.outlet_code.upper(),
            table_code=payload.table_code.upper(),
            captain_name=payload.captain_name,
            pax=payload.pax,
            items=enriched,
            order_notes=payload.order_notes,
        )

        return {
            "success": True,
            "kot": kot,
            "two_slip": two_slip,
            "kot_no": kot_no,
            "table_code": payload.table_code,
            "total_amount": round(total, 2),
            "items_count": len(enriched),
            "message": f"KOT {kot_no} fired for Table {payload.table_code} by {payload.captain_name}",
        }


@app.post("/kiosk/order")
def create_kiosk_order(payload: KioskOrderPayload):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Kiosk cart cannot be empty")

    with get_conn() as conn:
        enriched_items = []
        subtotal = 0.0
        for it in payload.items:
            meta = conn.execute(
                "SELECT name, selling_price, kitchen_station, pos_uom, gst_pct FROM admin_mod.items WHERE sku = %s",
                (it["sku"],),
            ).fetchone()
            price = float(it.get("unit_price", meta["selling_price"] if meta else 100))
            qty = float(it.get("qty", 1))
            lt = round(price * qty, 2)
            subtotal += lt
            enriched_items.append({
                "sku": it["sku"],
                "name": meta["name"] if meta else it.get("name", it["sku"]),
                "qty": qty,
                "uom": meta["pos_uom"] if meta else "pcs",
                "unit_price": price,
                "gst_pct": float(meta["gst_pct"] if meta else 5.0),
                "line_total": lt,
                "station": meta["kitchen_station"] if (meta and meta["kitchen_station"]) else "Main Kitchen",
                "modifiers": it.get("modifiers", "Kiosk Self-Order"),
            })

        cgst = round(subtotal * 0.025, 2)
        sgst = round(subtotal * 0.025, 2)
        grand_total = round(subtotal + cgst + sgst, 2)

        order_seq = conn.execute("SELECT COUNT(*) AS c FROM pos_mod.pos_orders WHERE estimate_no LIKE '%%KSK%%'").fetchone()["c"] + 1
        token_no = f"K-{order_seq:03d}"
        est_no = f"EST-KSK-{payload.outlet_code}-{order_seq:04d}"

        if payload.payment_choice == "PAY_NOW_ONLINE":
            cnt = conn.execute("SELECT COUNT(*) AS c FROM pos_mod.pos_orders WHERE invoice_no IS NOT NULL").fetchone()["c"] + 41
            inv_no = f"INV-KSK-{payload.outlet_code}-{cnt:04d}"
            status = "PAID_PENDING_DELIVERY"
            splits = [{
                "mode": payload.payment_mode or "UPI",
                "amount": grand_total,
                "ref": payload.payment_ref or f"KIOSK-ONLINE-{token_no}",
            }]
            paid_at = "NOW()"

            cnt_kot = conn.execute("SELECT COUNT(*) AS c FROM kot_mod.kots").fetchone()["c"] + 107
            kot_no = f"KOT-{payload.outlet_code}-{cnt_kot}"
            conn.execute(
                """
                INSERT INTO kot_mod.kots (kot_no, outlet_code, table_code, order_source, captain_name, items, status, total_amount, pos_invoice_no)
                VALUES (%s,%s,%s,'KIOSK',%s,%s::jsonb,'ACTIVE',%s,%s)
                """,
                (kot_no, payload.outlet_code, f"KIOSK {token_no}", "Self Kiosk", json.dumps(enriched_items), grand_total, inv_no),
            )
        else:
            inv_no = None
            status = "ESTIMATE_GENERATED"
            splits = []
            paid_at = "NULL"

        order_row = conn.execute(
            f"""
            INSERT INTO pos_mod.pos_orders
            (estimate_no, invoice_no, outlet_code, mode, status, items, subtotal, discount_amount, cart_hash, cgst, sgst, grand_total, payment_splits, estimate_staff, cashier_id, delivery_staff, paid_at)
            VALUES (%s,%s,%s,'DIRECT',%s,%s::jsonb,%s,0,'kiosk-hash',%s,%s,%s,%s::jsonb,'Self Kiosk',NULL,'Kiosk Pickup',{paid_at})
            RETURNING *
            """,
            (
                est_no, inv_no, payload.outlet_code, status,
                json.dumps(enriched_items), round(subtotal, 2), cgst, sgst, grand_total,
                json.dumps(splits),
            ),
        ).fetchone()

        return {
            "success": True,
            "token_no": token_no,
            "order": order_row,
            "payment_choice": payload.payment_choice,
            "is_paid": payload.payment_choice == "PAY_NOW_ONLINE",
            "invoice_no": inv_no,
            "estimate_no": est_no,
            "order_type": payload.order_type,
            "outlet_code": payload.outlet_code,
            "grand_total": grand_total,
            "items": enriched_items,
            "customer_name": payload.customer_name,
            "mic_call_instruction": f"Order Token #{token_no} will be called on Restaurant Mic when ready for pickup at Counter!",
        }
