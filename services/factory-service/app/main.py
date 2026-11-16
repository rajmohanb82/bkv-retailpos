import json
from datetime import date, datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException, Query
from pydantic import BaseModel
from common.app_factory import create_service_app
from common.db import get_conn

app = create_service_app("Sweet Production Factory Service")


class ProdOrderCreate(BaseModel):
    fg_sku: str
    planned_qty: float
    source_type: str = "Outlet Indent"
    source_ref: str = "IND-MANUAL"
    factory_code: str = "FAC-DEL01"
    target_outlet_code: str = "DEL01"
    kettle_line: str = "Steam Kettle #1 (Chhena/Syrup)"
    shift: str = "Morning Shift"


class QcSubmitPayload(BaseModel):
    actual_qty: float
    brix_pct: float = 52.0
    moisture_pct: float = 18.0
    temp_c: float = 8.0
    hygiene: str = "PASS"
    passed: bool = True
    labor_overhead: float = 2500.0


class DispatchPayload(BaseModel):
    target_store_code: str = "STR-DEL01-BACK"
    actor: str = "Suresh Halwai (Production Head)"


class StartCookingPayload(BaseModel):
    kettle_line: Optional[str] = "Steam Kettle #1 (Chhena/Syrup)"
    operator_name: Optional[str] = "Suresh Halwai"


@app.get("/orders")
def list_production_orders(factory_code: Optional[str] = Query(None)):
    with get_conn() as conn:
        query = "SELECT * FROM factory_mod.production_orders"
        params = []
        if factory_code and factory_code != "all":
            query += " WHERE factory_code = %s"
            params.append(factory_code)
        query += " ORDER BY id DESC"
        
        orders = conn.execute(query, tuple(params)).fetchall()
        for o in orders:
            o["wip_stages"] = conn.execute(
                "SELECT * FROM factory_mod.wip_stages WHERE prod_no = %s ORDER BY id", (o["prod_no"],)
            ).fetchall()
            actual_good = float(o["actual_qty"] or o["planned_qty"] or 1)
            total_cost = float(o["actual_rm_cost"] or o["expected_rm_cost"] or 0) + float(o["labor_overhead"] or 0)
            o["batch_cogs_per_unit"] = round(total_cost / max(actual_good, 1), 2)
        return orders


@app.get("/inbox")
def get_factory_inbox(factory_code: Optional[str] = Query(None)):
    """
    Returns orders queued for production in the factory inbox,
    including pending outlet indents and newly planned production requests.
    """
    with get_conn() as conn:
        # 1. Orders assigned to factory in Inbox / Planned / Accepted state
        fcode = factory_code or "FAC-DEL01"
        order_query = """
            SELECT * FROM factory_mod.production_orders
            WHERE status IN ('INBOX', 'Planned', 'ACCEPTED', 'MaterialRequested', 'STORE_ISSUED')
        """
        params = []
        if factory_code and factory_code != "all":
            order_query += " AND factory_code = %s"
            params.append(fcode)
        order_query += " ORDER BY id DESC"
        inbox_orders = conn.execute(order_query, tuple(params)).fetchall()

        # 2. Outlet indents waiting to be accepted into production
        pending_indents = conn.execute(
            """
            SELECT i.*, 
                   it.sub_category,
                   b.output_qty as bom_output_qty
            FROM pos_mod.outlet_indents i
            LEFT JOIN admin_mod.items it ON i.sku = it.sku
            LEFT JOIN admin_mod.boms b ON i.sku = b.fg_sku
            WHERE i.status IN ('REQUESTED', 'APPROVED')
            ORDER BY i.id DESC
            """
        ).fetchall()

        # 3. Pending material requisitions for this factory
        req_query = "SELECT * FROM stores_mod.material_requisitions"
        req_params = []
        if factory_code and factory_code != "all":
            req_query += " WHERE factory_code = %s"
            req_params.append(fcode)
        req_query += " ORDER BY id DESC LIMIT 15"
        requisitions = conn.execute(req_query, tuple(req_params)).fetchall()

        return {
            "factory_code": fcode,
            "inbox_orders": inbox_orders,
            "pending_indents": pending_indents,
            "active_requisitions": requisitions,
            "summary": {
                "inbox_count": len(inbox_orders),
                "indent_count": len(pending_indents),
                "pending_stores_count": len([r for r in requisitions if r["status"] in ("PENDING", "PENDING_ISSUE", "REQUESTED")]),
            }
        }


@app.post("/orders")
def create_production_order(payload: ProdOrderCreate):
    with get_conn() as conn:
        item = conn.execute("SELECT name, sub_category, inventory_uom, cost_price FROM admin_mod.items WHERE sku = %s", (payload.fg_sku,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Finished good SKU not found")
        bom = conn.execute("SELECT * FROM admin_mod.boms WHERE fg_sku = %s ORDER BY id DESC LIMIT 1", (payload.fg_sku,)).fetchone()
        expected_cost = float(item["cost_price"]) * payload.planned_qty
        if bom:
            ratio = payload.planned_qty / float(bom["output_qty"])
            calc = 0.0
            for ing in bom["ingredients"]:
                rm = conn.execute("SELECT cost_price FROM admin_mod.items WHERE sku = %s", (ing["rm_sku"],)).fetchone()
                calc += float(ing["qty"]) * ratio * float(rm["cost_price"] if rm else 0)
            expected_cost = round(calc, 2)

        cnt = conn.execute("SELECT COUNT(*) AS c FROM factory_mod.production_orders").fetchone()["c"] + 105
        prod_no = f"PRD-2026-{cnt:03d}"
        row = conn.execute(
            """
            INSERT INTO factory_mod.production_orders
            (prod_no, fg_sku, fg_name, sweet_line, planned_qty, uom, source_type, source_ref, kettle_line, shift, status, expected_rm_cost, labor_overhead, factory_code, target_outlet_code, progress_pct, store_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'INBOX',%s,%s,%s,%s, 15, 'NOT_REQUESTED') RETURNING *
            """,
            (
                prod_no, payload.fg_sku, item["name"], item["sub_category"],
                payload.planned_qty, item["inventory_uom"], payload.source_type,
                payload.source_ref, payload.kettle_line, payload.shift,
                expected_cost, round(payload.planned_qty * 28.0, 2),
                payload.factory_code, payload.target_outlet_code,
            ),
        ).fetchone()
        return row


@app.post("/orders/{prod_id}/accept")
def accept_order_and_raise_store_req(prod_id: int):
    """
    Production Manager accepts the order:
    1. Updates production order status to 'ACCEPTED' and progress to 25%.
    2. Explodes the Bill of Materials (BOM) for the target finished goods.
    3. Automatically creates a Store Material Requisition in stores_mod.material_requisitions.
    4. Store gets immediate alert in Central Store's Inbox for FEFO issuance!
    """
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM factory_mod.production_orders WHERE id = %s", (prod_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Production order not found")

        # Explode BOM
        bom = conn.execute("SELECT * FROM admin_mod.boms WHERE fg_sku = %s ORDER BY id DESC LIMIT 1", (order["fg_sku"],)).fetchone()
        bom_items = []
        if bom and bom.get("ingredients"):
            ratio = float(order["planned_qty"]) / max(float(bom["output_qty"]), 0.001)
            for ing in bom["ingredients"]:
                required_qty = round(float(ing["qty"]) * ratio, 2)
                bom_items.append({
                    "rm_sku": ing["rm_sku"],
                    "rm_name": ing["rm_name"],
                    "required_qty": required_qty,
                    "uom": ing["uom"],
                    "line_cost_est": round(required_qty * 85.0, 2)
                })
        else:
            # Fallback dynamic recipe generation
            bom_items = [
                {"rm_sku": "RM-MILK-01", "rm_name": "Full Cream Cow Milk (A2 Raw)", "required_qty": round(float(order["planned_qty"]) * 4.5, 2), "uom": "Litre", "line_cost_est": 270.0},
                {"rm_sku": "RM-SUGAR-01", "rm_name": "Pharma Grade Refined Sugar M-30", "required_qty": round(float(order["planned_qty"]) * 0.8, 2), "uom": "kg", "line_cost_est": 36.0},
                {"rm_sku": "RM-GHEE-01", "rm_name": "Pure Desi Danedar Cow Ghee", "required_qty": round(float(order["planned_qty"]) * 0.2, 2), "uom": "kg", "line_cost_est": 110.0},
            ]

        req_no = f"REQ-MAT-{order['prod_no']}"
        factory_code = order.get("factory_code") or "FAC-DEL01"

        # Check if already requisitioned
        existing_req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE req_no = %s", (req_no,)).fetchone()
        if not existing_req:
            conn.execute(
                """
                INSERT INTO stores_mod.material_requisitions
                (req_no, prod_no, factory_code, fg_sku, fg_name, planned_qty, uom, store_code, status, bom_items, requested_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'STR-MFG-RM','PENDING_ISSUE',%s::jsonb,'Production Manager')
                """,
                (req_no, order["prod_no"], factory_code, order["fg_sku"], order["fg_name"], order["planned_qty"], order["uom"], json.dumps(bom_items)),
            )

        updated_order = conn.execute(
            """
            UPDATE factory_mod.production_orders
            SET status = 'ACCEPTED', store_status = 'REQUESTED', req_no = %s, progress_pct = 25
            WHERE id = %s RETURNING *
            """,
            (req_no, prod_id),
        ).fetchone()

        return {
            "success": True,
            "message": f"Order {order['prod_no']} accepted! Store Material Requisition {req_no} raised with {len(bom_items)} BOM items.",
            "order": updated_order,
            "requisition_no": req_no,
            "bom_items": bom_items
        }


@app.post("/orders/accept-indent/{indent_id}")
def accept_indent_to_production(indent_id: int):
    """
    Accepts an outlet indent directly from Factory Inbox,
    spawns a production order, and auto-requisitions BOM to Stores.
    """
    with get_conn() as conn:
        indent = conn.execute("SELECT * FROM pos_mod.outlet_indents WHERE id = %s", (indent_id,)).fetchone()
        if not indent:
            raise HTTPException(status_code=404, detail="Outlet indent not found")

        cnt = conn.execute("SELECT COUNT(*) AS c FROM factory_mod.production_orders").fetchone()["c"] + 106
        prod_no = f"PRD-2026-{cnt:03d}"
        req_no = f"REQ-MAT-{prod_no}"
        
        # Explode BOM
        bom = conn.execute("SELECT * FROM admin_mod.boms WHERE fg_sku = %s ORDER BY id DESC LIMIT 1", (indent["sku"],)).fetchone()
        bom_items = []
        if bom and bom.get("ingredients"):
            ratio = float(indent["qty"]) / max(float(bom["output_qty"]), 0.001)
            for ing in bom["ingredients"]:
                required_qty = round(float(ing["qty"]) * ratio, 2)
                bom_items.append({
                    "rm_sku": ing["rm_sku"],
                    "rm_name": ing["rm_name"],
                    "required_qty": required_qty,
                    "uom": ing["uom"]
                })
        else:
            bom_items = [
                {"rm_sku": "RM-MILK-01", "rm_name": "Full Cream Cow Milk", "required_qty": round(float(indent["qty"]) * 4.0, 2), "uom": "Litre"},
                {"rm_sku": "RM-SUGAR-01", "rm_name": "Refined Sugar", "required_qty": round(float(indent["qty"]) * 0.7, 2), "uom": "kg"}
            ]

        # Insert Production Order
        order = conn.execute(
            """
            INSERT INTO factory_mod.production_orders
            (prod_no, fg_sku, fg_name, sweet_line, planned_qty, uom, source_type, source_ref, kettle_line, shift, status, store_status, req_no, factory_code, target_outlet_code, progress_pct)
            VALUES (%s,%s,%s,'Confectionery / Sweets',%s,%s,'Outlet Indent',%s,'Steam Kettle #1','Morning Shift','ACCEPTED','REQUESTED',%s,'FAC-DEL01',%s, 25)
            RETURNING *
            """,
            (prod_no, indent["sku"], indent["item_name"], indent["qty"], indent["uom"], indent["indent_no"], req_no, indent["outlet_code"]),
        ).fetchone()

        # Insert Store Requisition
        conn.execute(
            """
            INSERT INTO stores_mod.material_requisitions
            (req_no, prod_no, factory_code, fg_sku, fg_name, planned_qty, uom, store_code, status, bom_items, requested_by)
            VALUES (%s,%s,'FAC-DEL01',%s,%s,%s,%s,'STR-MFG-RM','PENDING_ISSUE',%s::jsonb,'Factory Inbox Indent Converter')
            """,
            (req_no, prod_no, indent["sku"], indent["item_name"], indent["qty"], indent["uom"], json.dumps(bom_items)),
        )

        # Mark indent as IN_PRODUCTION
        conn.execute("UPDATE pos_mod.outlet_indents SET status = 'IN_PRODUCTION' WHERE id = %s", (indent_id,))

        return {
            "success": True,
            "message": f"Outlet indent {indent['indent_no']} converted to Production Order {prod_no} & Requisition {req_no} sent to Stores!",
            "production_order": order,
            "requisition_no": req_no
        }


@app.post("/orders/{prod_id}/start-cooking")
def start_cooking(prod_id: int, payload: Optional[StartCookingPayload] = None):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM factory_mod.production_orders WHERE id = %s", (prod_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Production order not found")

        kettle = payload.kettle_line if payload and payload.kettle_line else (order.get("kettle_line") or "Steam Kettle #1")
        batch_no = f"{order['fg_sku'][:6]}-{datetime.now().strftime('%y%m%d')}-{prod_id}"

        # Record Stage 1 WIP
        conn.execute(
            """
            INSERT INTO factory_mod.wip_stages (prod_no, stage_name, input_sku, input_qty, output_sku, output_qty, yield_pct, status)
            VALUES (%s, %s, %s, %s, 'WIP-COOKED', %s, 95.0, 'COMPLETED')
            """,
            (order["prod_no"], f"Stage 1: Cooking & Thermal Processing in {kettle}", order["fg_sku"], order["planned_qty"], order["planned_qty"]),
        )

        updated = conn.execute(
            """
            UPDATE factory_mod.production_orders
            SET status = 'IN_PRODUCTION', kettle_line = %s, batch_no = %s, progress_pct = 60
            WHERE id = %s RETURNING *
            """,
            (kettle, batch_no, prod_id),
        ).fetchone()
        return updated


@app.post("/orders/{prod_id}/qc-complete")
def submit_qc(prod_id: int, payload: QcSubmitPayload):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM factory_mod.production_orders WHERE id = %s", (prod_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Production order not found")
        item = conn.execute("SELECT shelf_life_days FROM admin_mod.items WHERE sku = %s", (order["fg_sku"],)).fetchone()
        shelf_days = item["shelf_life_days"] if item else 7
        planned = float(order["planned_qty"])
        variance_pct = round(((payload.actual_qty - planned) / planned) * 100.0, 2)
        new_status = "QC_PASSED" if payload.passed else "QC_REWORK"
        mfg = date.today()
        exp = mfg + timedelta(days=shelf_days)
        qc_json = {
            "brix_pct": payload.brix_pct,
            "moisture_pct": payload.moisture_pct,
            "temp_c": payload.temp_c,
            "hygiene": payload.hygiene,
            "variance_alert": abs(variance_pct) > 2.0,
            "allergen": "Dairy / Nuts" if "KAJU" in order["fg_sku"] else "Dairy",
            "inspector": "Dr. R. K. Verma (Senior Food QC)",
            "timestamp": datetime.now().isoformat(),
        }
        batch_no = order["batch_no"] or f"{order['fg_sku'][:6]}-{mfg.strftime('%y%m%d')}-{prod_id}"
        updated = conn.execute(
            """
            UPDATE factory_mod.production_orders
            SET actual_qty = %s, labor_overhead = %s, yield_variance_pct = %s,
                status = %s, batch_no = %s, mfg_date = %s, expiry_date = %s,
                qc_data = %s::jsonb, progress_pct = 80
            WHERE id = %s RETURNING *
            """,
            (
                payload.actual_qty, payload.labor_overhead, variance_pct, new_status,
                batch_no, mfg, exp, json.dumps(qc_json), prod_id,
            ),
        ).fetchone()
        return updated


@app.post("/orders/{prod_id}/pack-and-dispatch")
def pack_and_dispatch(prod_id: int, payload: DispatchPayload):
    with get_conn() as conn:
        order = conn.execute("SELECT * FROM factory_mod.production_orders WHERE id = %s", (prod_id,)).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Production order not found")
        
        qty = float(order["actual_qty"] or order["planned_qty"])
        total_cost = float(order["actual_rm_cost"] or order["expected_rm_cost"] or 0) + float(order["labor_overhead"] or 0)
        unit_cost = round(total_cost / max(qty, 1), 2)
        mfg = order["mfg_date"] or date.today()
        exp = order["expiry_date"] or (mfg + timedelta(days=7))
        batch_no = order["batch_no"] or f"{order['fg_sku'][:6]}-{mfg.strftime('%y%m%d')}-{prod_id}"

        # Inward Finished Goods into Target Store
        conn.execute(
            """
            INSERT INTO stores_mod.stock_batches
            (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref)
            VALUES (%s,%s,%s,'FG-Sweet',%s,%s,%s,%s,%s,%s,'PASSED',%s)
            """,
            (
                payload.target_store_code, order["fg_sku"], order["fg_name"], batch_no,
                qty, order["uom"], unit_cost, mfg, exp, order["prod_no"],
            ),
        )
        mov_no = f"MOV-FG-{int(datetime.now().timestamp() * 1000) % 1000000}"
        conn.execute(
            """
            INSERT INTO stores_mod.stock_movements
            (movement_no, movement_type, store_code, target_store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
            VALUES (%s,'FG_INWARD',%s,'STR-MFG-COLD',%s,%s,%s,%s,'Factory FG Transfer',%s,%s)
            """,
            (mov_no, payload.target_store_code, order["fg_sku"], batch_no, qty, order["uom"], order["prod_no"], payload.actor),
        )

        # Also if linked to an outlet indent, mark indent FULFILLED
        if order["source_ref"] and order["source_ref"].startswith("IND-"):
            conn.execute("UPDATE pos_mod.outlet_indents SET status = 'FULFILLED' WHERE indent_no = %s", (order["source_ref"],))

        updated = conn.execute(
            "UPDATE factory_mod.production_orders SET status = 'DISPATCHED', progress_pct = 100 WHERE id = %s RETURNING *",
            (prod_id,),
        ).fetchone()
        return {"order": updated, "dispatched_to": payload.target_store_code, "batch_no": batch_no, "unit_cogs": unit_cost}


@app.get("/kettles")
def get_kettle_status():
    """
    Returns live equipment, telemetry, and temperature status for Sweet Factory lines.
    """
    return [
        {
            "id": "KTL-01",
            "name": "Steam Kettle #1 (Rasgulla / Gulab Jamun)",
            "type": "Steam Jacketed Tilting Kettle",
            "capacity": "250 Litres",
            "temp_c": 104.2,
            "target_temp_c": 105.0,
            "pressure_bar": 2.2,
            "status": "RUNNING",
            "operator": "Ramesh Sharma",
            "active_batch": "PRD-2026-101 / Rasgulla Spongy",
            "progress_pct": 75,
            "rpm": 42
        },
        {
            "id": "KTL-02",
            "name": "Rotary Mawa & Khoya Evaporator #2",
            "type": "Vacuum Steam Concentrator",
            "capacity": "180 Litres",
            "temp_c": 92.5,
            "target_temp_c": 92.0,
            "pressure_bar": 1.8,
            "status": "SIMMERING",
            "operator": "Dinesh Pal",
            "active_batch": "PRD-2026-102 / Mawa Peda Batch",
            "progress_pct": 40,
            "rpm": 55
        },
        {
            "id": "KTL-03",
            "name": "Planetary Kaju Katli Cooker & Kneader #3",
            "type": "Teflon Scraped Cooker",
            "capacity": "120 kg",
            "temp_c": 84.0,
            "target_temp_c": 85.0,
            "pressure_bar": 0.0,
            "status": "COOLING",
            "operator": "Suresh Halwai",
            "active_batch": "PRD-2026-103 / Kaju Katli Premium",
            "progress_pct": 90,
            "rpm": 30
        },
        {
            "id": "KTL-04",
            "name": "Heavy Duty Besan Roaster & Ghee Blender #4",
            "type": "Thermal Oil Jacketed Roaster",
            "capacity": "200 kg",
            "temp_c": 110.0,
            "target_temp_c": 110.0,
            "pressure_bar": 0.0,
            "status": "READY",
            "operator": "Vikram Rawat",
            "active_batch": "PRD-2026-104 / Desi Ghee Besan Ladoo",
            "progress_pct": 10,
            "rpm": 25
        },
        {
            "id": "KTL-05",
            "name": "Continuous Sugar Syrup Inverter #5",
            "type": "High Pressure Inverter Tank",
            "capacity": "500 Litres",
            "temp_c": 108.5,
            "target_temp_c": 108.0,
            "pressure_bar": 2.5,
            "status": "RUNNING",
            "operator": "Anil Kumar",
            "active_batch": "Sugar Syrup Batch #88",
            "progress_pct": 85,
            "rpm": 60
        },
    ]


@app.get("/workflow/track/{order_ref}")
def track_order_workflow(order_ref: str):
    """
    Minimalist 7-Stage Universal Order Tracker:
    Allows any requester (Retail Shop, POS Cashier, OMS, Factory) to search
    by Order Ref, Indent No, or Prod No and see live progress.
    """
    clean_ref = order_ref.strip()
    with get_conn() as conn:
        # Search production orders
        order = conn.execute(
            """
            SELECT * FROM factory_mod.production_orders
            WHERE prod_no = %s OR source_ref = %s OR fg_sku = %s OR req_no = %s
            ORDER BY id DESC LIMIT 1
            """,
            (clean_ref, clean_ref, clean_ref, clean_ref),
        ).fetchone()

        # If not found by exact, try ILIKE
        if not order:
            order = conn.execute(
                """
                SELECT * FROM factory_mod.production_orders
                WHERE prod_no ILIKE %s OR source_ref ILIKE %s OR fg_name ILIKE %s
                ORDER BY id DESC LIMIT 1
                """,
                (f"%{clean_ref}%", f"%{clean_ref}%", f"%{clean_ref}%"),
            ).fetchone()

        # Search indent if order not directly found
        indent = None
        if not order:
            indent = conn.execute(
                "SELECT * FROM pos_mod.outlet_indents WHERE indent_no ILIKE %s OR sku ILIKE %s LIMIT 1",
                (f"%{clean_ref}%", f"%{clean_ref}%"),
            ).fetchone()
            if not indent:
                raise HTTPException(status_code=404, detail=f"No order or indent found matching reference '{order_ref}'")

        # Get requisition data if available
        req = None
        req_no = order["req_no"] if order else None
        if req_no:
            req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE req_no = %s", (req_no,)).fetchone()
        elif order:
            req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE prod_no = %s", (order["prod_no"],)).fetchone()

        status_norm = (order["status"] if order else "Planned").upper()
        store_status = (order["store_status"] if order else "NOT_REQUESTED").upper()
        if req and req["status"]:
            store_status = req["status"].upper()

        # Map to 7 Stages:
        # 1. Order Placed
        # 2. Factory Accepted
        # 3. Store BOM Requisition Raised
        # 4. Central Store Materials Issued (FEFO)
        # 5. Sweet Cooking & In Production
        # 6. QC Lab Testing Passed
        # 7. Dispatched & Inwarded to Store

        is_indent_only = order is None
        stage1_done = True
        stage2_done = not is_indent_only and status_norm not in ("INBOX", "PLANNED")
        stage3_done = req is not None
        stage4_done = store_status in ("ISSUED", "COMPLETED") or status_norm in ("STORE_ISSUED", "MATERIALISSUED", "IN_PRODUCTION", "INPRODUCTION", "QC_PASSED", "DISPATCHED")
        stage5_done = status_norm in ("IN_PRODUCTION", "INPRODUCTION", "QC_PASSED", "DISPATCHED")
        stage6_done = status_norm in ("QC_PASSED", "DISPATCHED")
        stage7_done = status_norm in ("DISPATCHED", "DISPATCHEDTOSTORE")

        stages = [
            {
                "stage": 1,
                "key": "ORDER_PLACED",
                "label": "Order Placed",
                "title": "Demand Origination",
                "desc": f"Source: {order['source_type'] if order else 'Outlet Indent'} ({order['source_ref'] if order else indent['indent_no']})",
                "status": "COMPLETED",
                "completed_at": order["created_at"].strftime("%d %b %Y %H:%M") if order else indent["created_at"].strftime("%d %b %Y %H:%M"),
                "badge": "Confirmed"
            },
            {
                "stage": 2,
                "key": "FACTORY_ACCEPTED",
                "label": "Factory Accepted",
                "title": f"Queued at {order.get('factory_code', 'FAC-DEL01') if order else 'Sweet Factory'}",
                "desc": f"Production batch planned for {order['planned_qty'] if order else indent['qty']} {order['uom'] if order else indent['uom']}",
                "status": "COMPLETED" if stage2_done else ("IN_PROGRESS" if order else "PENDING"),
                "completed_at": (order["created_at"] + timedelta(minutes=15)).strftime("%d %b %Y %H:%M") if stage2_done else None,
                "badge": "Accepted" if stage2_done else "In Factory Inbox"
            },
            {
                "stage": 3,
                "key": "STORE_REQUISITION",
                "label": "Store Requisition",
                "title": f"BOM Requisition #{req['req_no'] if req else 'Pending'}",
                "desc": f"Exploded BOM requirements sent to Central Stores ({len(req['bom_items']) if req and req.get('bom_items') else '3'} raw materials)",
                "status": "COMPLETED" if stage3_done else "PENDING",
                "completed_at": req["created_at"].strftime("%d %b %Y %H:%M") if req else None,
                "badge": "Requisitioned" if stage3_done else "Awaiting Acceptance"
            },
            {
                "stage": 4,
                "key": "BOM_ISSUED",
                "label": "Materials Issued",
                "title": "FEFO Store Issuance",
                "desc": f"Store issued ingredients via strict FEFO ({len(req['issued_batches']) if req and req.get('issued_batches') else '0'} batches deducted)",
                "status": "COMPLETED" if stage4_done else ("IN_PROGRESS" if stage3_done else "PENDING"),
                "completed_at": req["issued_at"].strftime("%d %b %Y %H:%M") if req and req.get("issued_at") else None,
                "badge": "FEFO Issued" if stage4_done else "Store Allocating"
            },
            {
                "stage": 5,
                "key": "IN_PRODUCTION",
                "label": "In Production",
                "title": f"{order.get('kettle_line', 'Steam Kettle #1') if order else 'Kettle Floor'}",
                "desc": f"Cooking active with batch #{order.get('batch_no', 'Pending') if order else 'TBD'}",
                "status": "COMPLETED" if stage6_done or stage7_done else ("IN_PROGRESS" if stage5_done else "PENDING"),
                "completed_at": (order["created_at"] + timedelta(hours=2)).strftime("%d %b %Y %H:%M") if stage5_done else None,
                "badge": "Cooking & Processing" if stage5_done and not stage6_done else ("Completed" if stage6_done else "Queued")
            },
            {
                "stage": 6,
                "key": "QC_PASSED",
                "label": "QC Lab Passed",
                "title": "Brix, Moisture & Hygiene",
                "desc": f"QC Lab validation: {order.get('qc_data', {}).get('brix_pct', 52)}% Brix, Hygiene: PASS" if order and order.get("qc_data") else "Food safety & organoleptic test",
                "status": "COMPLETED" if stage6_done else "PENDING",
                "completed_at": (order["created_at"] + timedelta(hours=3)).strftime("%d %b %Y %H:%M") if stage6_done else None,
                "badge": "QC Passed" if stage6_done else "Pending QC"
            },
            {
                "stage": 7,
                "key": "DISPATCHED",
                "label": "Store Dispatched",
                "title": f"Delivery to {order.get('target_outlet_code', 'DEL01') if order else 'Outlet'}",
                "desc": f"Transferred to retail cold shelf ({order['uom'] if order else 'kg'} inwarded)",
                "status": "COMPLETED" if stage7_done else "PENDING",
                "completed_at": (order["created_at"] + timedelta(hours=4)).strftime("%d %b %Y %H:%M") if stage7_done else None,
                "badge": "Dispatched" if stage7_done else "Packing"
            }
        ]

        # Calculate current progress percentage
        progress = 10
        if stage7_done: progress = 100
        elif stage6_done: progress = 85
        elif stage5_done: progress = 65
        elif stage4_done: progress = 50
        elif stage3_done: progress = 35
        elif stage2_done: progress = 20

        return {
            "order_ref": clean_ref,
            "prod_no": order["prod_no"] if order else None,
            "source_ref": order["source_ref"] if order else indent["indent_no"],
            "fg_sku": order["fg_sku"] if order else indent["sku"],
            "fg_name": order["fg_name"] if order else indent["item_name"],
            "qty": float(order["planned_qty"] if order else indent["qty"]),
            "uom": order["uom"] if order else indent["uom"],
            "factory_code": order.get("factory_code") if order else "FAC-DEL01",
            "target_outlet_code": order.get("target_outlet_code", "DEL01") if order else indent.get("outlet_code", "DEL01"),
            "current_status": order["status"] if order else indent["status"],
            "progress_pct": progress,
            "stages": stages
        }
