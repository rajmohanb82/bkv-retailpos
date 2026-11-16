import json
from datetime import date, datetime
from fastapi import HTTPException, Query
from pydantic import BaseModel
from common.app_factory import create_service_app
from common.db import get_conn

app = create_service_app("Stores & Multi-Store Inventory Service")


class StoreCreate(BaseModel):
    store_code: str
    name: str
    outlet_code: str
    store_type: str
    temp_zone: str
    capacity_kg: float = 5000
    storekeeper: str


class StockInPayload(BaseModel):
    store_code: str
    sku: str
    batch_no: str
    qty: float
    unit_cost: float
    mfg_date: date
    expiry_date: date
    movement_type: str = "GRN"
    source_ref: str = "MANUAL-IN"
    actor: str = "Storekeeper"


class BomIssueRequest(BaseModel):
    prod_no: str
    fg_sku: str
    qty_to_produce: float
    source_store_code: str = "STR-MFG-RM"
    cold_store_code: str = "STR-MFG-COLD"
    actor: str = "Storekeeper"
    enforce_fefo: bool = True


class IstTransferPayload(BaseModel):
    from_store: str
    to_store: str
    sku: str
    qty: float
    actor: str = "Storekeeper"


class WastagePayload(BaseModel):
    store_code: str
    batch_id: int
    qty: float
    reason_code: str
    actor: str = "Storekeeper"


class MrnPayload(BaseModel):
    store_code: str
    prod_no: str
    sku: str
    qty: float
    actor: str = "Production Manager"


class CheckInPayload(BaseModel):
    store_code: str
    sku: str
    item_name: str | None = None
    category: str | None = None
    batch_no: str | None = None
    qty: float
    uom: str = "kg"
    unit_cost: float = 0.0
    mfg_date: date | None = None
    expiry_date: date | None = None
    qc_status: str = "PASSED"
    source_ref: str = "GRN-PO-DIRECT"
    actor: str = "Storekeeper"


class CheckOutPayload(BaseModel):
    store_code: str
    batch_id: int | None = None
    sku: str | None = None
    qty: float
    purpose: str = "Issue to Factory"
    destination_ref: str = "Sweet Factory Kettles"
    actor: str = "Storekeeper"


class BomMasterCreate(BaseModel):
    fg_sku: str
    fg_name: str
    output_qty: float = 10.0
    output_uom: str = "kg"
    expected_loss_pct: float = 3.5
    version: str = "v1.0"
    ingredients: list[dict]


class BomMasterUpdate(BaseModel):
    fg_name: str | None = None
    output_qty: float | None = None
    output_uom: str | None = None
    expected_loss_pct: float | None = None
    version: str | None = None
    ingredients: list[dict] | None = None


@app.get("/stores")
def list_stores():
    with get_conn() as conn:
        return conn.execute("SELECT * FROM stores_mod.stores ORDER BY id").fetchall()


@app.post("/stores")
def create_store(payload: StoreCreate):
    with get_conn() as conn:
        try:
            return conn.execute(
                """
                INSERT INTO stores_mod.stores (store_code, name, outlet_code, store_type, temp_zone, capacity_kg, storekeeper)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *
                """,
                (payload.store_code.upper(), payload.name, payload.outlet_code, payload.store_type, payload.temp_zone, payload.capacity_kg, payload.storekeeper),
            ).fetchone()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


@app.get("/batches")
def list_batches(store_code: str | None = None, sku: str | None = None):
    with get_conn() as conn:
        sql = "SELECT * FROM stores_mod.stock_batches WHERE qty > 0"
        params = []
        if store_code:
            sql += " AND store_code = %s"
            params.append(store_code)
        if sku:
            sql += " AND sku = %s"
            params.append(sku)
        sql += " ORDER BY expiry_date ASC, id ASC"
        return conn.execute(sql, tuple(params)).fetchall()


@app.post("/stock-in")
def stock_in(payload: StockInPayload):
    with get_conn() as conn:
        item = conn.execute("SELECT name, category, inventory_uom FROM admin_mod.items WHERE sku = %s", (payload.sku,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="SKU not found")
        batch = conn.execute(
            """
            INSERT INTO stores_mod.stock_batches
            (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'PASSED',%s) RETURNING *
            """,
            (
                payload.store_code, payload.sku, item["name"], item["category"],
                payload.batch_no, payload.qty, item["inventory_uom"], payload.unit_cost,
                payload.mfg_date, payload.expiry_date, payload.source_ref,
            ),
        ).fetchone()
        mov_no = f"MOV-IN-{int(datetime.now().timestamp() * 1000) % 1000000}"
        conn.execute(
            """
            INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'Stock Inward',%s,%s)
            """,
            (mov_no, payload.movement_type, payload.store_code, payload.sku, payload.batch_no, payload.qty, item["inventory_uom"], payload.source_ref, payload.actor),
        )
        return batch


@app.get("/bom-explode")
def explode_bom(fg_sku: str = Query(...), qty: float = Query(100.0)):
    with get_conn() as conn:
        bom = conn.execute("SELECT * FROM admin_mod.boms WHERE fg_sku = %s ORDER BY id DESC LIMIT 1", (fg_sku,)).fetchone()
        if not bom:
            raise HTTPException(status_code=404, detail=f"BOM not defined for {fg_sku}")
        ratio = qty / float(bom["output_qty"])
        exploded = []
        for ing in bom["ingredients"]:
            req_qty = round(float(ing["qty"]) * ratio, 3)
            batches = conn.execute(
                """
                SELECT id, store_code, batch_no, qty, uom, unit_cost, expiry_date
                FROM stores_mod.stock_batches
                WHERE sku = %s AND qty > 0 AND qc_status = 'PASSED' AND expiry_date >= CURRENT_DATE
                ORDER BY expiry_date ASC
                """,
                (ing["rm_sku"],),
            ).fetchall()
            avail = round(sum(float(b["qty"]) for b in batches), 3)
            exploded.append({
                "rm_sku": ing["rm_sku"],
                "rm_name": ing["rm_name"],
                "uom": ing["uom"],
                "is_packaging": ing.get("is_packaging", False),
                "required_qty": req_qty,
                "available_qty": avail,
                "shortage_qty": round(max(0.0, req_qty - avail), 3),
                "sufficient": avail >= req_qty,
                "fefo_batches": batches[:3],
            })
        return {
            "fg_sku": bom["fg_sku"],
            "fg_name": bom["fg_name"],
            "planned_qty": qty,
            "expected_loss_pct": float(bom["expected_loss_pct"]),
            "ingredients": exploded,
            "all_sufficient": all(e["sufficient"] for e in exploded),
        }


@app.post("/bom-issue")
def issue_bom_to_production(payload: BomIssueRequest):
    with get_conn() as conn:
        bom = conn.execute("SELECT * FROM admin_mod.boms WHERE fg_sku = %s ORDER BY id DESC LIMIT 1", (payload.fg_sku,)).fetchone()
        if not bom:
            raise HTTPException(status_code=404, detail="BOM not found")
        ratio = payload.qty_to_produce / float(bom["output_qty"])
        shortages = []
        issued_lines = []
        total_rm_cost = 0.0

        for ing in bom["ingredients"]:
            req_qty = round(float(ing["qty"]) * ratio, 3)
            batches = conn.execute(
                """
                SELECT * FROM stores_mod.stock_batches
                WHERE sku = %s AND store_code IN (%s, %s) AND qty > 0 AND qc_status = 'PASSED' AND expiry_date >= CURRENT_DATE
                ORDER BY expiry_date ASC, id ASC
                """,
                (ing["rm_sku"], payload.source_store_code, payload.cold_store_code),
            ).fetchall()
            avail = sum(float(b["qty"]) for b in batches)
            if avail < req_qty:
                short_qty = round(req_qty - avail, 3)
                shortages.append({"rm_sku": ing["rm_sku"], "rm_name": ing["rm_name"], "shortage": short_qty, "uom": ing["uom"]})
                pr_cnt = conn.execute("SELECT COUNT(*) AS c FROM stores_mod.purchase_requisitions").fetchone()["c"] + 21
                pr_no = f"PR-2026-{pr_cnt:03d}"
                conn.execute(
                    """
                    INSERT INTO stores_mod.purchase_requisitions (pr_no, store_code, sku, item_name, requested_qty, uom, reason, status)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,'OPEN')
                    """,
                    (pr_no, payload.source_store_code, ing["rm_sku"], ing["rm_name"], max(short_qty * 2, 20), ing["uom"], f"Auto-PR: Shortage for Production {payload.prod_no}"),
                )

        if shortages:
            raise HTTPException(
                status_code=409,
                detail={"message": "Shortage detected! Auto-Purchase Requisitions raised to Vendor Management.", "shortages": shortages},
            )

        # Deduct via strict FEFO
        for ing in bom["ingredients"]:
            remaining = round(float(ing["qty"]) * ratio, 3)
            batches = conn.execute(
                """
                SELECT * FROM stores_mod.stock_batches
                WHERE sku = %s AND store_code IN (%s, %s) AND qty > 0 AND qc_status = 'PASSED' AND expiry_date >= CURRENT_DATE
                ORDER BY expiry_date ASC, id ASC
                """,
                (ing["rm_sku"], payload.source_store_code, payload.cold_store_code),
            ).fetchall()
            for b in batches:
                if remaining <= 0:
                    break
                take = min(float(b["qty"]), remaining)
                conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (take, b["id"]))
                total_rm_cost += take * float(b["unit_cost"])
                mov_no = f"MOV-BOM-{int(datetime.now().timestamp() * 1000) % 1000000}-{b['id']}"
                conn.execute(
                    """
                    INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                    VALUES (%s,'BOM_ISSUE',%s,%s,%s,%s,%s,'FEFO Production Issue',%s,%s)
                    """,
                    (mov_no, b["store_code"], ing["rm_sku"], b["batch_no"], take, ing["uom"], payload.prod_no, payload.actor),
                )
                issued_lines.append({"rm_sku": ing["rm_sku"], "batch_no": b["batch_no"], "qty": round(take, 3), "uom": ing["uom"], "expiry_date": str(b["expiry_date"])})
                remaining = round(remaining - take, 3)

        # Update Production Order status -> MaterialIssued
        conn.execute(
            "UPDATE factory_mod.production_orders SET status = 'MaterialIssued', actual_rm_cost = %s WHERE prod_no = %s",
            (round(total_rm_cost, 2), payload.prod_no),
        )
        return {"prod_no": payload.prod_no, "status": "MaterialIssued", "total_rm_cost": round(total_rm_cost, 2), "issued_lines": issued_lines}


@app.post("/mrn")
def material_return_note(payload: MrnPayload):
    with get_conn() as conn:
        batch = conn.execute(
            "SELECT * FROM stores_mod.stock_batches WHERE store_code = %s AND sku = %s ORDER BY id DESC LIMIT 1",
            (payload.store_code, payload.sku),
        ).fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found for MRN")
        conn.execute("UPDATE stores_mod.stock_batches SET qty = qty + %s WHERE id = %s", (payload.qty, batch["id"]))
        mov_no = f"MOV-MRN-{int(datetime.now().timestamp() * 1000) % 1000000}"
        conn.execute(
            """
            INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
            VALUES (%s,'MRN_RETURN',%s,%s,%s,%s,%s,'Unused Material Return from Production',%s,%s)
            """,
            (mov_no, payload.store_code, payload.sku, batch["batch_no"], payload.qty, batch["uom"], payload.prod_no, payload.actor),
        )
        return {"movement_no": mov_no, "status": "RETURNED_TO_STORE"}


@app.post("/ist-transfer")
def inter_store_transfer(payload: IstTransferPayload):
    with get_conn() as conn:
        batches = conn.execute(
            """
            SELECT * FROM stores_mod.stock_batches
            WHERE store_code = %s AND sku = %s AND qty > 0 AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC
            """,
            (payload.from_store, payload.sku),
        ).fetchall()
        total_avail = sum(float(b["qty"]) for b in batches)
        if total_avail < payload.qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock in {payload.from_store}: available {total_avail}")
        remaining = payload.qty
        eway_no = f"EWB-{int(datetime.now().timestamp()) % 10000000}"
        for b in batches:
            if remaining <= 0:
                break
            take = min(float(b["qty"]), remaining)
            conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (take, b["id"]))
            conn.execute(
                """
                INSERT INTO stores_mod.stock_batches
                (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'PASSED',%s)
                """,
                (
                    payload.to_store, b["sku"], b["item_name"], b["category"], b["batch_no"],
                    take, b["uom"], b["unit_cost"], b["mfg_date"], b["expiry_date"], eway_no,
                ),
            )
            mov_no = f"MOV-IST-{int(datetime.now().timestamp() * 1000) % 1000000}-{b['id']}"
            conn.execute(
                """
                INSERT INTO stores_mod.stock_movements
                (movement_no, movement_type, store_code, target_store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor, eway_bill_no)
                VALUES (%s,'IST_OUT',%s,%s,%s,%s,%s,%s,'Inter-Store Replenishment',%s,%s,%s)
                """,
                (mov_no, payload.from_store, payload.to_store, b["sku"], b["batch_no"], take, b["uom"], eway_no, payload.actor, eway_no),
            )
            remaining = round(remaining - take, 3)
        return {"eway_bill_no": eway_no, "transferred_qty": payload.qty, "from": payload.from_store, "to": payload.to_store}


@app.post("/wastage")
def record_wastage(payload: WastagePayload):
    with get_conn() as conn:
        batch = conn.execute("SELECT * FROM stores_mod.stock_batches WHERE id = %s", (payload.batch_id,)).fetchone()
        if not batch or float(batch["qty"]) < payload.qty:
            raise HTTPException(status_code=400, detail="Batch not found or insufficient qty")
        conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (payload.qty, payload.batch_id))
        mov_no = f"MOV-WST-{int(datetime.now().timestamp() * 1000) % 1000000}"
        conn.execute(
            """
            INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
            VALUES (%s,'WASTAGE',%s,%s,%s,%s,%s,%s,'WRITE-OFF',%s)
            """,
            (mov_no, payload.store_code, batch["sku"], batch["batch_no"], payload.qty, batch["uom"], payload.reason_code, payload.actor),
        )
        return {"movement_no": mov_no, "written_off": payload.qty, "reason": payload.reason_code}


@app.get("/alerts")
def intelligent_alerts(festival_multiplier: float = Query(1.0, ge=1.0, le=5.0)):
    with get_conn() as conn:
        # 1. Dynamic ROP Alerts
        items = conn.execute("SELECT sku, name, category, inventory_uom, min_par_level FROM admin_mod.items WHERE active = TRUE").fetchall()
        batches = conn.execute("SELECT store_code, sku, item_name, batch_no, qty, uom, unit_cost, expiry_date FROM stores_mod.stock_batches WHERE qty > 0").fetchall()

        stock_by_sku: dict[str, float] = {}
        expiry_alerts = []
        today = date.today()
        for b in batches:
            stock_by_sku[b["sku"]] = stock_by_sku.get(b["sku"], 0.0) + float(b["qty"])
            days_left = (b["expiry_date"] - today).days
            if days_left <= 2:
                severity = "CRITICAL_24H" if days_left <= 1 else "WARNING_48H"
                expiry_alerts.append({
                    "store_code": b["store_code"],
                    "sku": b["sku"],
                    "item_name": b["item_name"],
                    "batch_no": b["batch_no"],
                    "qty": float(b["qty"]),
                    "uom": b["uom"],
                    "value_at_risk": round(float(b["qty"]) * float(b["unit_cost"]), 2),
                    "days_left": days_left,
                    "severity": severity,
                })

        rop_alerts = []
        for it in items:
            par = float(it["min_par_level"])
            if par <= 0:
                continue
            dynamic_rop = round(par * festival_multiplier, 2)
            cur = round(stock_by_sku.get(it["sku"], 0.0), 2)
            if cur <= dynamic_rop:
                rop_alerts.append({
                    "sku": it["sku"],
                    "name": it["name"],
                    "category": it["category"],
                    "current_stock": cur,
                    "base_par": par,
                    "dynamic_rop": dynamic_rop,
                    "shortfall": round(dynamic_rop - cur, 2),
                    "uom": it["inventory_uom"],
                })

        prs = conn.execute("SELECT * FROM stores_mod.purchase_requisitions ORDER BY id DESC").fetchall()
        movements = conn.execute("SELECT * FROM stores_mod.stock_movements ORDER BY created_at DESC LIMIT 30").fetchall()
        return {
            "festival_multiplier": festival_multiplier,
            "rop_alerts": rop_alerts,
            "expiry_alerts": expiry_alerts,
            "open_prs": prs,
            "recent_movements": movements,
        }


@app.post("/auto-pr")
def create_auto_pr(sku: str, store_code: str = "STR-MFG-RM", qty: float = 50.0, reason: str = "Dynamic ROP Triggered"):
    with get_conn() as conn:
        item = conn.execute("SELECT name, inventory_uom FROM admin_mod.items WHERE sku = %s", (sku,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="SKU not found")
        pr_cnt = conn.execute("SELECT COUNT(*) AS c FROM stores_mod.purchase_requisitions").fetchone()["c"] + 21
        pr_no = f"PR-2026-{pr_cnt:03d}"
        return conn.execute(
            """
            INSERT INTO stores_mod.purchase_requisitions (pr_no, store_code, sku, item_name, requested_qty, uom, reason, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'OPEN') RETURNING *
            """,
            (pr_no, store_code, sku, item["name"], qty, item["inventory_uom"], reason),
        ).fetchone()


class ReqIssuePayload(BaseModel):
    actor: str = "Central Storekeeper"
    source_store: str = "STR-MFG-RM"
    cold_store: str = "STR-MFG-COLD"


@app.get("/material-requisitions")
def list_material_requisitions(factory_code: str | None = None, status: str | None = None):
    with get_conn() as conn:
        sql = "SELECT * FROM stores_mod.material_requisitions"
        clauses = []
        params = []
        if factory_code:
            clauses.append("factory_code = %s")
            params.append(factory_code)
        if status:
            clauses.append("status = %s")
            params.append(status)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY id DESC"
        return conn.execute(sql, tuple(params) if params else None).fetchall()


@app.post("/material-requisitions/{req_id}/issue")
def issue_requisition_bom(req_id: int, payload: ReqIssuePayload):
    with get_conn() as conn:
        req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE id = %s", (req_id,)).fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Material requisition not found")
        if req["status"] == "ISSUED":
            return {"message": "Requisition already issued", "requisition": req}

        bom_items = req["bom_items"] if isinstance(req["bom_items"], list) else json.loads(req["bom_items"])
        issued_batches = []
        total_cost = 0.0

        for ing in bom_items:
            req_qty = float(ing.get("required_qty", ing.get("qty", 10.0)))
            batches = conn.execute(
                """
                SELECT * FROM stores_mod.stock_batches
                WHERE sku = %s AND qty > 0 AND qc_status = 'PASSED'
                ORDER BY expiry_date ASC, id ASC
                """,
                (ing["rm_sku"],),
            ).fetchall()
            
            rem = req_qty
            for b in batches:
                if rem <= 0:
                    break
                take = min(float(b["qty"]), rem)
                conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (take, b["id"]))
                total_cost += take * float(b["unit_cost"])
                mov_no = f"MOV-REQ-{int(datetime.now().timestamp() * 1000) % 1000000}-{b['id']}"
                conn.execute(
                    """
                    INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                    VALUES (%s,'BOM_ISSUE',%s,%s,%s,%s,%s,'BOM Material Issue for Production Order',%s,%s)
                    """,
                    (mov_no, b["store_code"], ing["rm_sku"], b["batch_no"], take, ing["uom"], req["prod_no"], payload.actor),
                )
                issued_batches.append({
                    "rm_sku": ing["rm_sku"],
                    "rm_name": ing["rm_name"],
                    "batch_no": b["batch_no"],
                    "qty": round(take, 3),
                    "uom": ing["uom"],
                    "unit_cost": float(b["unit_cost"])
                })
                rem -= take

        # Update requisition status
        updated_req = conn.execute(
            """
            UPDATE stores_mod.material_requisitions
            SET status = 'ISSUED', issued_by = %s, issued_at = NOW(), issued_batches = %s::jsonb
            WHERE id = %s RETURNING *
            """,
            (payload.actor, json.dumps(issued_batches), req_id),
        ).fetchone()

        # Update production order in factory_mod
        conn.execute(
            """
            UPDATE factory_mod.production_orders
            SET status = 'STORE_ISSUED', store_status = 'ISSUED', progress_pct = 50, actual_rm_cost = %s
            WHERE prod_no = %s
            """,
            (round(total_cost, 2), req["prod_no"]),
        )
        return {
            "success": True,
            "message": f"BOM materials issued cleanly via FEFO for {req['prod_no']}!",
            "requisition": updated_req,
            "issued_batches": issued_batches,
            "total_rm_cost": round(total_cost, 2)
        }


# ========================================================
# 📥 CHECK-IN (GRN / INWARD) & 📤 CHECK-OUT (ISSUE / OUTWARD)
# ========================================================

@app.post("/check-in")
def store_check_in(payload: CheckInPayload):
    """
    Standard Stores Check-in (Material Inward / Goods Receipt Note):
    Registers incoming raw materials, packaging, or stock batches with batch tracking,
    expiry date for FEFO compliance, and generates a Movement audit log.
    """
    with get_conn() as conn:
        item = conn.execute("SELECT name, category, inventory_uom FROM admin_mod.items WHERE sku = %s", (payload.sku,)).fetchone()
        item_name = payload.item_name or (item["name"] if item else payload.sku)
        category = payload.category or (item["category"] if item else "Raw Material")
        uom = payload.uom or (item["inventory_uom"] if item else "kg")

        ts = int(datetime.now().timestamp() * 1000) % 1000000
        batch_no = payload.batch_no or f"BAT-{payload.store_code}-{ts}"
        mfg = payload.mfg_date or date.today()
        # Default expiry: 90 days if not provided
        exp = payload.expiry_date or date.fromtimestamp(datetime.now().timestamp() + 90 * 86400)

        batch = conn.execute(
            """
            INSERT INTO stores_mod.stock_batches
            (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
            """,
            (
                payload.store_code, payload.sku, item_name, category,
                batch_no, payload.qty, uom, payload.unit_cost,
                mfg, exp, payload.qc_status, payload.source_ref,
            ),
        ).fetchone()

        mov_no = f"INW-{ts}"
        conn.execute(
            """
            INSERT INTO stores_mod.stock_movements
            (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
            VALUES (%s,'CHECK_IN_GRN',%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (mov_no, payload.store_code, payload.sku, batch_no, payload.qty, uom, payload.source_ref, f"Check-In by {payload.actor}", payload.actor),
        )
        return {
            "success": True,
            "message": f"Successfully checked-in {payload.qty} {uom} of {item_name} (Batch: {batch_no})",
            "batch": batch,
            "movement_no": mov_no
        }


@app.post("/check-out")
def store_check_out(payload: CheckOutPayload):
    """
    Standard Stores Check-out (Material Outward / Departmental Issue):
    Deducts stock from designated batch or applies automated FEFO to issue items
    to Sweet Factory, Retail Counters, Inter-store Transfer, or Scrap Write-off.
    """
    with get_conn() as conn:
        deducted_batches = []
        rem_qty = payload.qty

        if payload.batch_id:
            # Check-out from a specific batch
            b = conn.execute("SELECT * FROM stores_mod.stock_batches WHERE id = %s", (payload.batch_id,)).fetchone()
            if not b:
                raise HTTPException(status_code=404, detail="Selected batch not found")
            if float(b["qty"]) < payload.qty:
                raise HTTPException(status_code=400, detail=f"Insufficient batch qty: available {b['qty']} {b['uom']}, requested {payload.qty}")
            
            conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (payload.qty, payload.batch_id))
            ts = int(datetime.now().timestamp() * 1000) % 1000000
            mov_no = f"OUT-{ts}"
            conn.execute(
                """
                INSERT INTO stores_mod.stock_movements
                (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                VALUES (%s,'CHECK_OUT_ISSUE',%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (mov_no, b["store_code"], b["sku"], b["batch_no"], payload.qty, b["uom"], payload.purpose, payload.destination_ref, payload.actor),
            )
            deducted_batches.append({"batch_id": b["id"], "batch_no": b["batch_no"], "qty": payload.qty, "uom": b["uom"]})
        elif payload.sku:
            # Automated FEFO deduction across available batches
            batches = conn.execute(
                """
                SELECT * FROM stores_mod.stock_batches
                WHERE store_code = %s AND sku = %s AND qty > 0 AND qc_status = 'PASSED'
                ORDER BY expiry_date ASC, id ASC
                """,
                (payload.store_code, payload.sku),
            ).fetchall()
            
            total_avail = sum(float(b["qty"]) for b in batches)
            if total_avail < payload.qty:
                raise HTTPException(status_code=400, detail=f"Insufficient store stock: Available {total_avail}, Requested {payload.qty}")

            for b in batches:
                if rem_qty <= 0:
                    break
                take = min(float(b["qty"]), rem_qty)
                conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (take, b["id"]))
                ts = int(datetime.now().timestamp() * 1000) % 1000000
                mov_no = f"OUT-{ts}-{b['id']}"
                conn.execute(
                    """
                    INSERT INTO stores_mod.stock_movements
                    (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                    VALUES (%s,'CHECK_OUT_ISSUE',%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (mov_no, b["store_code"], b["sku"], b["batch_no"], take, b["uom"], payload.purpose, payload.destination_ref, payload.actor),
                )
                deducted_batches.append({"batch_id": b["id"], "batch_no": b["batch_no"], "qty": take, "uom": b["uom"]})
                rem_qty -= take
        else:
            raise HTTPException(status_code=400, detail="Either batch_id or sku must be provided for check-out")

        return {
            "success": True,
            "message": f"Successfully checked-out {payload.qty} for {payload.purpose} to {payload.destination_ref}",
            "deducted_batches": deducted_batches,
        }


@app.get("/check-in-out/movements")
def get_movement_ledger(store_code: str | None = None, movement_type: str | None = None, limit: int = 50):
    with get_conn() as conn:
        q = "SELECT * FROM stores_mod.stock_movements WHERE 1=1"
        params = []
        if store_code:
            q += " AND store_code = %s"
            params.append(store_code)
        if movement_type:
            q += " AND movement_type = %s"
            params.append(movement_type)
        q += " ORDER BY id DESC LIMIT %s"
        params.append(limit)
        return conn.execute(q, tuple(params)).fetchall()


# ========================================================
# 📋 RECIPE & BILL OF MATERIALS (BOM) MASTER CRUD
# ========================================================

@app.get("/boms")
def list_all_boms():
    with get_conn() as conn:
        return conn.execute("SELECT * FROM admin_mod.boms ORDER BY fg_name ASC").fetchall()


@app.post("/boms")
def create_recipe_bom(payload: BomMasterCreate):
    """
    Creates or versions a Recipe / BOM for finished food items with:
    - Variable output unit (kg, gm, pcs, boxes, platters, thal)
    - Error Margin % (cooking loss, moisture shrinkage, frying evaporation)
    - Detailed ingredient breakdown with wastage allowance
    """
    with get_conn() as conn:
        # Ensure fg_sku exists in items table
        item_exists = conn.execute("SELECT sku FROM admin_mod.items WHERE sku = %s", (payload.fg_sku,)).fetchone()
        if not item_exists:
            uom = payload.output_uom or "kg"
            conn.execute(
                """
                INSERT INTO admin_mod.items
                (sku, name, category, sub_category, purchase_uom, inventory_uom, pos_uom, hsn_code, gst_pct, active)
                VALUES (%s, %s, 'FG-Sweet', 'Assorted Sweets', %s, %s, %s, '210690', 5.0, true)
                ON CONFLICT (sku) DO NOTHING
                """,
                (payload.fg_sku, payload.fg_name, uom, uom, uom)
            )

        existing = conn.execute("SELECT id FROM admin_mod.boms WHERE fg_sku = %s", (payload.fg_sku,)).fetchone()
        if existing:
            # Increment version
            ver = f"v{int(datetime.now().timestamp() * 1000) % 1000}"
        else:
            ver = payload.version or "v1.0"

        row = conn.execute(
            """
            INSERT INTO admin_mod.boms
            (fg_sku, fg_name, output_qty, output_uom, expected_loss_pct, version, ingredients)
            VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb)
            RETURNING *
            """,
            (
                payload.fg_sku, payload.fg_name, payload.output_qty, payload.output_uom,
                payload.expected_loss_pct, ver, json.dumps(payload.ingredients),
            ),
        ).fetchone()

        conn.execute(
            "INSERT INTO admin_mod.audit_logs (module, action, actor, details) VALUES (%s,%s,%s,%s)",
            ("STORES", "BOM_CREATED", "Storekeeper", json.dumps({"fg_sku": payload.fg_sku, "output": f"{payload.output_qty} {payload.output_uom}", "error_margin_pct": payload.expected_loss_pct})),
        )
        return {"success": True, "message": f"Recipe & BOM for {payload.fg_name} created successfully!", "bom": row}


@app.put("/boms/{bom_id}")
def update_recipe_bom(bom_id: int, payload: BomMasterUpdate):
    with get_conn() as conn:
        bom = conn.execute("SELECT * FROM admin_mod.boms WHERE id = %s", (bom_id,)).fetchone()
        if not bom:
            raise HTTPException(status_code=404, detail="BOM not found")

        updates = []
        params = []
        if payload.fg_name is not None:
            updates.append("fg_name = %s")
            params.append(payload.fg_name)
        if payload.output_qty is not None:
            updates.append("output_qty = %s")
            params.append(payload.output_qty)
        if payload.output_uom is not None:
            updates.append("output_uom = %s")
            params.append(payload.output_uom)
        if payload.expected_loss_pct is not None:
            updates.append("expected_loss_pct = %s")
            params.append(payload.expected_loss_pct)
        if payload.version is not None:
            updates.append("version = %s")
            params.append(payload.version)
        if payload.ingredients is not None:
            updates.append("ingredients = %s::jsonb")
            params.append(json.dumps(payload.ingredients))

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(bom_id)
        row = conn.execute(
            f"UPDATE admin_mod.boms SET {', '.join(updates)} WHERE id = %s RETURNING *",
            tuple(params),
        ).fetchone()

        return {"success": True, "message": f"Recipe & BOM updated for {row['fg_name']}!", "bom": row}


@app.delete("/boms/{bom_id}")
def delete_recipe_bom(bom_id: int):
    with get_conn() as conn:
        bom = conn.execute("DELETE FROM admin_mod.boms WHERE id = %s RETURNING *", (bom_id,)).fetchone()
        if not bom:
            raise HTTPException(status_code=404, detail="BOM not found")
        return {"success": True, "message": f"Deleted BOM {bom['fg_name']} ({bom['fg_sku']})"}

