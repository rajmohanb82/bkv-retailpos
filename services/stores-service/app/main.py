import json
from datetime import date, datetime, timedelta
from fastapi import HTTPException, Query
from pydantic import BaseModel
from common.app_factory import create_service_app
from common.db import get_conn

app = create_service_app("Stores & Multi-Store Inventory Service")


@app.on_event("startup")
def ensure_stores_schema():
    try:
        with get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS stores_mod.material_requisitions (
                    id SERIAL PRIMARY KEY,
                    req_no VARCHAR(40) UNIQUE NOT NULL,
                    prod_no VARCHAR(40) NOT NULL,
                    factory_code VARCHAR(30) NOT NULL DEFAULT 'FAC-DEL01',
                    fg_sku VARCHAR(40) NOT NULL,
                    fg_name VARCHAR(140) NOT NULL,
                    planned_qty NUMERIC(10,2) NOT NULL,
                    uom VARCHAR(20) NOT NULL DEFAULT 'kg',
                    store_code VARCHAR(30) NOT NULL DEFAULT 'STR-MFG-RM',
                    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ISSUE',
                    bom_items JSONB NOT NULL DEFAULT '[]'::jsonb,
                    issued_batches JSONB DEFAULT '[]'::jsonb,
                    requested_by VARCHAR(80) NOT NULL DEFAULT 'Production Manager',
                    issued_by VARCHAR(80),
                    issued_at TIMESTAMPTZ,
                    order_type VARCHAR(60) DEFAULT 'Factory BOM Requisition',
                    customer_name VARCHAR(120),
                    customer_mobile VARCHAR(30),
                    customer_company VARCHAR(140),
                    destination VARCHAR(160),
                    accepted_by VARCHAR(80),
                    accepted_at TIMESTAMPTZ,
                    checkout_by VARCHAR(80),
                    checkout_at TIMESTAMPTZ,
                    slip_barcode VARCHAR(60),
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS order_type VARCHAR(60) DEFAULT 'Factory BOM Requisition';
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(120);
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(30);
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS customer_company VARCHAR(140);
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS destination VARCHAR(160);
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(80);
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS checkout_by VARCHAR(80);
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ;
                ALTER TABLE stores_mod.material_requisitions ADD COLUMN IF NOT EXISTS slip_barcode VARCHAR(60);

                INSERT INTO stores_mod.material_requisitions 
                (req_no, prod_no, factory_code, fg_sku, fg_name, planned_qty, uom, store_code, status, bom_items, requested_by, order_type, customer_name, customer_mobile, customer_company, destination)
                VALUES
                ('REQ-SHOP-2026-081', 'IND-2026-014', 'DEL01', 'FG-RAS-01', 'Spongy White Rasgulla 1kg Box', 40.0, 'pcs', 'STR-DEL01-BACK', 'PENDING_ISSUE', '[{"rm_sku":"FG-RAS-01","rm_name":"Spongy White Rasgulla (1kg)","required_qty":40,"uom":"pcs"},{"rm_sku":"PKG-BOX-1K","rm_name":"1kg Heritage Gift Box","required_qty":40,"uom":"pcs"}]'::jsonb, 'Shop Manager Vikram Sethi', 'Shop Indent / Requisition', 'DEL01 Connaught Place Flagship', '+91-9811000001', 'Bikanervala Retail Outlet', 'Front Mithai Counter & Display Chiller #1'),
                ('REQ-OMS-2026-0042', 'OMS-2026-0011', 'DEL01', 'FG-KAJU-01', 'Royal Kaju Katli Heritage Hamper', 60.0, 'pkts', 'STR-MFG-RM', 'ACCEPTED', '[{"rm_sku":"RM-KAJU-01","rm_name":"Whole Cashew W240 Grade","required_qty":45,"uom":"kg"},{"rm_sku":"RM-SUG-01","rm_name":"Refined Sulphur-Free Sugar","required_qty":25,"uom":"kg"},{"rm_sku":"PKG-BOX-1K","rm_name":"1kg Heritage Gift Box","required_qty":60,"uom":"pcs"}]'::jsonb, 'OMS Lead Rajesh Kumar', 'OMS Bulk Order', 'Meera Kapoor', '+91-9810012345', 'TechCorp India Pvt Ltd', 'Connaught Place Corporate Suite 402'),
                ('REQ-MAT-PRD-2026-092', 'PRD-2026-092', 'FAC-DEL01', 'FG-RAS-01', 'Spongy White Rasgulla (Batch 92)', 100.0, 'kg', 'STR-MFG-RM', 'PENDING_ISSUE', '[{"rm_sku":"RM-MILK-01","rm_name":"Full Cream Cow Milk (A2 Raw)","required_qty":500.0,"uom":"Litre"},{"rm_sku":"RM-SUGAR-01","rm_name":"Pharma Grade Refined Sugar M-30","required_qty":80.0,"uom":"kg"}]'::jsonb, 'Production Manager Ramesh Verma', 'Factory BOM Requisition', 'Sweet Factory Division', '+91-9811000003', 'Bikanervala Central Kitchen', 'FAC-DEL01 Steam Kettle #2')
                ON CONFLICT (req_no) DO UPDATE SET 
                    order_type = EXCLUDED.order_type,
                    customer_name = EXCLUDED.customer_name,
                    customer_mobile = EXCLUDED.customer_mobile,
                    customer_company = EXCLUDED.customer_company,
                    destination = EXCLUDED.destination;
            """)
    except Exception as e:
        print(f"[Stores Service] Warning on ensure_stores_schema: {e}")


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


class BulkCheckInItem(BaseModel):
    sku: str
    item_name: str | None = None
    category: str | None = None
    qty: float
    uom: str = "kg"
    unit_cost: float = 0.0
    expiry_days: int = 90
    batch_no: str | None = None


class BulkCheckInPayload(BaseModel):
    store_code: str
    po_no: str
    vendor_name: str
    vendor_code: str | None = None
    vendor_address: str | None = None
    invoice_no: str | None = None
    invoice_date: str | None = None
    invoice_amount: float | None = None
    invoice_doc_url: str | None = None
    check_in_date: str | None = None
    check_in_time: str | None = None
    actor: str = "Central Stores Officer"
    items: list[BulkCheckInItem]


class BulkCheckOutItem(BaseModel):
    sku: str
    item_name: str | None = None
    qty: float
    uom: str = "kg"


class BulkCheckOutPayload(BaseModel):
    store_code: str
    order_no: str
    order_type: str = "STORE_REQUISITION"
    destination_ref: str = "Sweet Factory Floor / Kettle #1"
    actor: str = "Storekeeper"
    items: list[BulkCheckOutItem]


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

        # Update Production Order status -> STORE_ISSUED & store_status -> ISSUED
        conn.execute(
            """
            UPDATE factory_mod.production_orders 
            SET status = 'STORE_ISSUED', store_status = 'ISSUED', progress_pct = 50, actual_rm_cost = %s 
            WHERE prod_no = %s
            """,
            (round(total_rm_cost, 2), payload.prod_no),
        )
        return {"prod_no": payload.prod_no, "status": "STORE_ISSUED", "store_status": "ISSUED", "total_rm_cost": round(total_rm_cost, 2), "issued_lines": issued_lines}


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


@app.post("/check-in-bulk")
def store_check_in_bulk(payload: BulkCheckInPayload):
    """
    Automated PO-driven Material Check-In (GRN Inward):
    Receives all line items from an approved Purchase Order,
    creates FEFO-tracked stock batches, records inward movements,
    and attaches optional vendor invoice data.
    """
    with get_conn() as conn:
        created_batches = []
        created_movements = []
        total_inward_val = 0.0

        for it in payload.items:
            item_row = conn.execute("SELECT name, category, inventory_uom FROM admin_mod.items WHERE sku = %s", (it.sku,)).fetchone()
            item_name = it.item_name or (item_row["name"] if item_row else it.sku)
            category = it.category or (item_row["category"] if item_row else "Raw Material")
            uom = it.uom or (item_row["inventory_uom"] if item_row else "kg")

            ts = int(datetime.now().timestamp() * 1000) % 1000000
            batch_no = it.batch_no or f"BAT-{payload.store_code}-{ts}-{it.sku[-4:]}"
            mfg = date.today()
            exp = date.fromtimestamp(datetime.now().timestamp() + (it.expiry_days or 90) * 86400)

            batch = conn.execute(
                """
                INSERT INTO stores_mod.stock_batches
                (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
                """,
                (
                    payload.store_code, it.sku, item_name, category,
                    batch_no, it.qty, uom, it.unit_cost,
                    mfg, exp, "PASSED", f"PO:{payload.po_no}",
                ),
            ).fetchone()

            mov_no = f"INW-{ts}"
            conn.execute(
                """
                INSERT INTO stores_mod.stock_movements
                (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                VALUES (%s,'CHECK_IN_GRN',%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    mov_no, payload.store_code, it.sku, batch_no, it.qty, uom,
                    f"PO {payload.po_no} Inward ({payload.vendor_name})",
                    f"Inv: {payload.invoice_no or 'N/A'}", payload.actor
                ),
            )
            created_batches.append(batch)
            created_movements.append(mov_no)
            total_inward_val += float(it.qty) * float(it.unit_cost)

        # Update purchase order status and invoice if present
        if payload.po_no:
            match_status = "MATCHED" if payload.invoice_no else "PENDING"
            notes = f"Stores Check-In completed on {payload.check_in_date or date.today()} at {payload.check_in_time or 'N/A'} by {payload.actor}. Total Inward Batches: {len(created_batches)}."
            conn.execute(
                """
                UPDATE vendor_mod.purchase_orders
                SET status = 'INWARDED',
                    invoice_no = COALESCE(%s, invoice_no),
                    invoice_amount = COALESCE(%s, invoice_amount),
                    three_way_match_status = %s,
                    qc_notes = COALESCE(qc_notes, '') || E'\n' || %s
                WHERE po_no = %s
                """,
                (
                    payload.invoice_no,
                    payload.invoice_amount or total_inward_val,
                    match_status,
                    notes,
                    payload.po_no,
                ),
            )

        return {
            "success": True,
            "message": f"Successfully checked-in {len(created_batches)} line items from PO {payload.po_no} into {payload.store_code}",
            "batches_created": len(created_batches),
            "total_value": round(total_inward_val, 2),
            "batches": created_batches,
        }


@app.post("/check-out-bulk")
def store_check_out_bulk(payload: BulkCheckOutPayload):
    """
    Automated Order/BOM-driven Material Check-Out (Factory to Floor):
    Deducts all required BOM raw materials from store inventory using FEFO,
    generating departmental issue movement logs for factory preparation.
    """
    with get_conn() as conn:
        issued_items = []
        for it in payload.items:
            batches = conn.execute(
                """
                SELECT * FROM stores_mod.stock_batches
                WHERE store_code = %s AND sku = %s AND qty > 0 AND qc_status = 'PASSED'
                ORDER BY expiry_date ASC, id ASC
                """,
                (payload.store_code, it.sku),
            ).fetchall()

            total_avail = sum(float(b["qty"]) for b in batches)
            if total_avail < it.qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient store stock for {it.item_name or it.sku}: Available {total_avail} {it.uom}, Required {it.qty} {it.uom}"
                )

            rem_qty = it.qty
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
                    (
                        mov_no, b["store_code"], b["sku"], b["batch_no"], take, b["uom"],
                        f"Order {payload.order_no} ({payload.order_type})",
                        payload.destination_ref, payload.actor
                    ),
                )
                rem_qty -= take

            issued_items.append({"sku": it.sku, "name": it.item_name, "qty": it.qty, "uom": it.uom})

        return {
            "success": True,
            "message": f"Successfully checked-out {len(issued_items)} BOM items for Order {payload.order_no} to {payload.destination_ref}",
            "issued_items": issued_items,
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


# ========================================================
# 🔍 RAW MATERIAL SEARCH, USAGE TRENDS & PREDICTIVE STOCKOUT
# ========================================================

@app.get("/raw-materials/search")
def search_raw_materials(
    query: str = Query("", description="Search by item name, SKU, category, or vendor"),
    category: str = Query("ALL", description="Filter by category (ALL, RM, Packaging)"),
    urgency: str = Query("ALL", description="Filter by depletion urgency (ALL, CRITICAL, WARNING, HEALTHY)")
):
    """
    Search and inspect Raw Materials and Packaging items.
    Returns:
    - Item master attributes (SKU, Name, Category, UOM, HSN, GST, Cost)
    - Available stock quantity & batches across stores
    - Current usage trends (Daily, Weekly, Monthly burn rates and velocity)
    - Predictive stock integration/depletion date and urgency risk
    - Associated vendor details (preferred vendor, lead time, MOQ, contract price, phone/email)
    """
    with get_conn() as conn:
        # 1. Fetch raw materials and packaging items
        sql = """
            SELECT i.sku, i.name, i.category, i.sub_category, i.inventory_uom, i.purchase_uom,
                   i.cost_price, i.min_par_level, i.hsn_code, i.gst_pct, i.shelf_life_days
            FROM admin_mod.items i
            WHERE i.category IN ('RM', 'Packaging')
        """
        params = []
        if query.strip():
            sql += " AND (i.sku ILIKE %s OR i.name ILIKE %s OR i.sub_category ILIKE %s)"
            q_like = f"%{query.strip()}%"
            params.extend([q_like, q_like, q_like])
        if category != "ALL":
            sql += " AND i.category = %s"
            params.append(category)

        sql += " ORDER BY i.sku ASC"
        items = conn.execute(sql, tuple(params) if params else None).fetchall()

        # 2. Fetch stock batches
        batches = conn.execute("""
            SELECT id, store_code, sku, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status,
                   (expiry_date - CURRENT_DATE) AS days_to_expiry
            FROM stores_mod.stock_batches
            WHERE qc_status = 'PASSED' AND qty > 0
            ORDER BY expiry_date ASC
        """).fetchall()

        batches_by_sku = {}
        for b in batches:
            batches_by_sku.setdefault(b["sku"], []).append(b)

        # 3. Fetch vendor mapping and price master
        vendors_mapping = conn.execute("""
            SELECT m.rm_sku, m.vendor_code, m.moq, m.lead_time_days, m.quality_score,
                   v.trade_name, v.legal_name, v.contact_person, v.mobile, v.email, v.gstin, v.fssai_no, v.fssai_expiry, v.payment_terms,
                   COALESCE(p.rate_per_uom, 0) as contract_rate
            FROM vendor_mod.vendor_rm_mapping m
            JOIN vendor_mod.vendors v ON v.vendor_code = m.vendor_code
            LEFT JOIN vendor_mod.price_masters p ON p.vendor_code = m.vendor_code AND p.rm_sku = m.rm_sku
            ORDER BY m.priority_rank ASC
        """).fetchall()

        vendors_by_sku = {}
        for vm in vendors_mapping:
            vendors_by_sku.setdefault(vm["rm_sku"], []).append(vm)

        # 4. Fetch 30-day stock consumption from stock_movements
        movements = conn.execute("""
            SELECT sku, SUM(qty) as total_issued, COUNT(*) as issue_count
            FROM stores_mod.stock_movements
            WHERE movement_type IN ('BOM_ISSUE', 'CHECK_OUT_ISSUE', 'TRANSFER_OUT', 'WASTAGE')
            GROUP BY sku
        """).fetchall()
        issues_by_sku = {m["sku"]: float(m["total_issued"]) for m in movements}

        results = []
        for it in items:
            sku = it["sku"]
            item_batches = batches_by_sku.get(sku, [])
            total_stock = sum(float(b["qty"]) for b in item_batches)
            min_par = float(it["min_par_level"] or 20.0)

            # Usage trend calculation:
            past_issued = issues_by_sku.get(sku, 0.0)
            if past_issued > 0:
                daily_burn = round(past_issued / 30.0, 2)
            else:
                daily_burn = round(max(min_par * 0.08, 1.5), 2)

            weekly_burn = round(daily_burn * 7.0, 2)
            monthly_burn = round(daily_burn * 30.0, 2)

            # Trend direction & surge calculation
            trend_pct = 12.5 if total_stock < min_par else (0.0 if total_stock == min_par else -4.2)
            trend_direction = "UP" if trend_pct > 0 else ("DOWN" if trend_pct < 0 else "STABLE")

            # Predictive stock depletion date
            if daily_burn > 0:
                days_remaining = round(total_stock / daily_burn, 1)
            else:
                days_remaining = 999.0

            depletion_date = (date.today() + timedelta(days=int(days_remaining))).isoformat() if days_remaining < 365 else "365+ Days"

            if total_stock <= 0:
                stock_status = "OUT_OF_STOCK"
                depletion_urgency = "CRITICAL"
                days_remaining = 0.0
            elif days_remaining <= 3:
                depletion_urgency = "CRITICAL"
                stock_status = "CRITICAL_LOW"
            elif days_remaining <= 7:
                depletion_urgency = "WARNING"
                stock_status = "LOW_STOCK"
            else:
                depletion_urgency = "HEALTHY"
                stock_status = "HEALTHY"

            # Filter by urgency if requested
            if urgency != "ALL" and depletion_urgency != urgency:
                continue

            # Associated Vendor details
            vendor_list = vendors_by_sku.get(sku, [])
            primary_vendor = vendor_list[0] if vendor_list else None
            lead_time = primary_vendor["lead_time_days"] if primary_vendor else 2
            
            # Recommended reorder date
            if days_remaining < 365:
                reorder_days = max(int(days_remaining) - lead_time, 0)
                recommended_reorder_date = (date.today() + timedelta(days=reorder_days)).isoformat()
            else:
                recommended_reorder_date = "Sufficient Stock"

            results.append({
                "sku": sku,
                "name": it["name"],
                "category": it["category"],
                "sub_category": it["sub_category"],
                "uom": it["inventory_uom"],
                "hsn_code": it["hsn_code"],
                "gst_pct": float(it["gst_pct"] or 5.0),
                "cost_price": float(it["cost_price"] or 0),
                "min_par_level": min_par,
                "total_stock": round(total_stock, 2),
                "stock_status": stock_status,
                "batches_count": len(item_batches),
                "batches": [
                    {
                        "id": b["id"],
                        "batch_no": b["batch_no"],
                        "store_code": b["store_code"],
                        "qty": float(b["qty"]),
                        "unit_cost": float(b["unit_cost"]),
                        "mfg_date": str(b["mfg_date"]),
                        "expiry_date": str(b["expiry_date"]),
                        "days_to_expiry": b["days_to_expiry"],
                        "qc_status": b["qc_status"]
                    } for b in item_batches
                ],
                "usage_trend": {
                    "daily_burn": daily_burn,
                    "weekly_burn": weekly_burn,
                    "monthly_burn": monthly_burn,
                    "trend_direction": trend_direction,
                    "trend_pct": trend_pct,
                    "intensity": "HIGH" if daily_burn > min_par * 0.1 else "MODERATE"
                },
                "predictive_depletion": {
                    "days_remaining": days_remaining,
                    "depletion_date": depletion_date,
                    "urgency": depletion_urgency,
                    "lead_time_days": lead_time,
                    "recommended_reorder_date": recommended_reorder_date
                },
                "vendor": {
                    "vendor_code": primary_vendor["vendor_code"] if primary_vendor else "VND-GENERIC",
                    "trade_name": primary_vendor["trade_name"] if primary_vendor else "Bikanervala Approved Vendor Pool",
                    "contact_person": primary_vendor["contact_person"] if primary_vendor else "Procurement Desk",
                    "mobile": primary_vendor["mobile"] if primary_vendor else "+91-9811000008",
                    "email": primary_vendor["email"] if primary_vendor else "procurement@annavya.in",
                    "gstin": primary_vendor["gstin"] if primary_vendor else "07AAACB1234F1Z5",
                    "fssai_no": primary_vendor["fssai_no"] if primary_vendor else "10023011001234",
                    "lead_time_days": lead_time,
                    "moq": float(primary_vendor["moq"]) if primary_vendor else 10.0,
                    "contract_rate": float(primary_vendor["contract_rate"]) if primary_vendor else float(it["cost_price"] or 0),
                    "quality_score": float(primary_vendor["quality_score"]) if primary_vendor else 4.8,
                    "payment_terms": primary_vendor["payment_terms"] if primary_vendor else "Net 15 Days"
                } if primary_vendor else None
            })

        urgency_order = {"CRITICAL": 0, "WARNING": 1, "HEALTHY": 2}
        results.sort(key=lambda x: (urgency_order.get(x["predictive_depletion"]["urgency"], 3), x["predictive_depletion"]["days_remaining"]))
        return results


# ========================================================
# 📦 STORES REQUISITION ACCEPTANCE & OUTWARD CHECKOUT GATE
# ========================================================

class OrderAcceptPayload(BaseModel):
    actor: str = "Central Storekeeper"


class OrderCheckoutPayload(BaseModel):
    actor: str = "Central Storekeeper"
    destination_ref: str | None = None
    gate_pass_no: str | None = None


def generate_stores_slip_data(req, issued_batches=None, total_value=None):
    if issued_batches is None:
        issued_batches = req["issued_batches"] if isinstance(req.get("issued_batches"), list) else (json.loads(req.get("issued_batches") or "[]"))
    if total_value is None:
        total_value = sum(float(b.get("amount", b.get("qty", 0) * b.get("unit_cost", 0))) for b in issued_batches)
    
    order_type = req.get("order_type") or "Factory BOM Requisition"
    return {
        "slip_type": "40_COL_STORES_OUTWARD",
        "slip_title": "STORES DISPATCH OUTWARD SLIP",
        "barcode": req.get("slip_barcode") or f"BC-STR-{req.get('id', 1)}-{req.get('req_no', '')}",
        "req_no": req.get("req_no"),
        "prod_no": req.get("prod_no"),
        "order_type": order_type,
        "store_code": req.get("store_code") or "STR-MFG-RM",
        "factory_code": req.get("factory_code") or "DEL01",
        "customer_name": req.get("customer_name") or "Internal Department",
        "customer_mobile": req.get("customer_mobile") or "+91-9811000001",
        "customer_company": req.get("customer_company") or "Bikanervala Foods Pvt Ltd",
        "destination": req.get("destination") or "Store Front / Floor",
        "requested_by": req.get("requested_by") or "Staff",
        "accepted_by": req.get("accepted_by"),
        "accepted_at": str(req.get("accepted_at") or ""),
        "checkout_by": req.get("checkout_by") or req.get("issued_by") or "Central Storekeeper",
        "checkout_at": str(req.get("checkout_at") or req.get("issued_at") or datetime.now().isoformat()),
        "fg_name": req.get("fg_name"),
        "planned_qty": float(req.get("planned_qty") or 0),
        "uom": req.get("uom") or "kg",
        "items": issued_batches,
        "total_items": len(issued_batches),
        "total_value": round(float(total_value), 2)
    }


@app.post("/material-requisitions/{req_id}/accept")
def accept_stores_requisition(req_id: int, payload: OrderAcceptPayload):
    """
    Step 1: Stores Order Acceptance
    Marks requisition as ACCEPTED. Stock is NOT deducted yet.
    Outward dispatch can only occur after explicit stores checkout.
    """
    with get_conn() as conn:
        req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE id = %s", (req_id,)).fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Material requisition not found")
        if req["status"] in ("ISSUED", "CHECKOUT_DONE"):
            return {"success": False, "message": "Requisition has already been checked out and dispatched.", "requisition": req}
        
        updated = conn.execute(
            """
            UPDATE stores_mod.material_requisitions
            SET status = 'ACCEPTED', accepted_by = %s, accepted_at = NOW()
            WHERE id = %s RETURNING *
            """,
            (payload.actor, req_id),
        ).fetchone()

        return {
            "success": True,
            "message": f"Order {updated['req_no']} officially ACCEPTED! Awaiting physical Stores Check-Out Gate for dispatch.",
            "requisition": updated
        }


@app.post("/material-requisitions/{req_id}/checkout")
def checkout_stores_order(req_id: int, payload: OrderCheckoutPayload):
    """
    Step 2: Stores Check-Out Gate (Physical Dispatch & 40-Col Slip Generation)
    Deducts stock via FEFO from stock_batches, records stock_movements,
    generates Code-128 barcode, and returns 40-col slip data.
    """
    with get_conn() as conn:
        req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE id = %s", (req_id,)).fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Material requisition not found")
        if req["status"] in ("ISSUED", "CHECKOUT_DONE"):
            slip_data = generate_stores_slip_data(req)
            return {"success": True, "message": "Requisition was already checked out.", "requisition": req, "slip": slip_data}

        bom_items = req["bom_items"] if isinstance(req["bom_items"], list) else json.loads(req["bom_items"])
        issued_batches = []
        total_rm_cost = 0.0
        ts = int(datetime.now().timestamp() * 1000) % 1000000
        barcode = f"BC-OUT-{req['id']}-{ts}"

        for ing in bom_items:
            sku = ing.get("rm_sku") or ing.get("sku")
            req_qty = float(ing.get("required_qty", ing.get("qty", 1.0)))
            batches = conn.execute(
                """
                SELECT * FROM stores_mod.stock_batches
                WHERE sku = %s AND qty > 0 AND qc_status = 'PASSED'
                ORDER BY expiry_date ASC, id ASC
                """,
                (sku,),
            ).fetchall()

            rem = req_qty
            for b in batches:
                if rem <= 0:
                    break
                take = min(float(b["qty"]), rem)
                conn.execute("UPDATE stores_mod.stock_batches SET qty = qty - %s WHERE id = %s", (take, b["id"]))
                cost = take * float(b["unit_cost"])
                total_rm_cost += cost
                mov_no = f"OUT-{ts}-{b['id']}"
                conn.execute(
                    """
                    INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                    VALUES (%s,'CHECK_OUT_ISSUE',%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (mov_no, b["store_code"], sku, b["batch_no"], take, ing.get("uom", b["uom"]), f"Stores Check-Out for {req['req_no']}", req["prod_no"], payload.actor),
                )
                issued_batches.append({
                    "sku": sku,
                    "name": ing.get("rm_name", ing.get("name", sku)),
                    "batch_no": b["batch_no"],
                    "qty": round(take, 3),
                    "uom": ing.get("uom", b["uom"]),
                    "unit_cost": float(b["unit_cost"]),
                    "amount": round(cost, 2)
                })
                rem -= take

        # Update requisition status
        updated = conn.execute(
            """
            UPDATE stores_mod.material_requisitions
            SET status = 'CHECKOUT_DONE', checkout_by = %s, checkout_at = NOW(),
                issued_by = %s, issued_at = NOW(), issued_batches = %s::jsonb,
                slip_barcode = %s, destination = COALESCE(%s, destination)
            WHERE id = %s RETURNING *
            """,
            (payload.actor, payload.actor, json.dumps(issued_batches), barcode, payload.destination_ref, req_id),
        ).fetchone()

        # Link to factory order if applicable
        if req.get("prod_no") and req["prod_no"].startswith("PRD-"):
            conn.execute(
                """
                UPDATE factory_mod.production_orders
                SET status = 'STORE_ISSUED', store_status = 'ISSUED', progress_pct = 50, actual_rm_cost = %s
                WHERE prod_no = %s
                """,
                (round(total_rm_cost, 2), req["prod_no"]),
            )

        slip_data = generate_stores_slip_data(updated, issued_batches, total_rm_cost)
        return {
            "success": True,
            "message": f"Stores Check-Out completed! Stock deducted via FEFO and 40-Col slip generated for {updated['req_no']}.",
            "requisition": updated,
            "issued_batches": issued_batches,
            "total_value": round(total_rm_cost, 2),
            "slip": slip_data
        }


@app.get("/material-requisitions/{req_id}/slip")
def get_stores_slip(req_id: int):
    """
    Returns 40-column thermal slip data with barcode for any stores requisition.
    """
    with get_conn() as conn:
        req = conn.execute("SELECT * FROM stores_mod.material_requisitions WHERE id = %s", (req_id,)).fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Requisition not found")
        return generate_stores_slip_data(req)


# ========================================================
# 📊 STORES BUSINESS INTELLIGENCE REPORTS
# ========================================================

@app.get("/reports/item-wise-stock")
def report_item_wise_stock(store_code: str | None = None):
    """
    Item-wise Stock & Movement Ledger:
    SKU, Name, Category, UOM, Current Available Stock, Inward GRNs, Outward Issues, Buffer, Unit Cost & Valuation.
    """
    with get_conn() as conn:
        sql = """
            SELECT i.sku, i.name, i.category, i.sub_category, i.inventory_uom,
                   i.cost_price, i.selling_price, i.min_par_level,
                   COALESCE(SUM(b.qty), 0) AS current_stock,
                   COALESCE(COUNT(b.id), 0) AS active_batches,
                   ROUND(COALESCE(SUM(b.qty * b.unit_cost), 0), 2) AS total_valuation,
                   COALESCE(inw.inward_qty, 0) AS total_inward_qty,
                   COALESCE(outw.outward_qty, 0) AS total_outward_qty
            FROM admin_mod.items i
            LEFT JOIN stores_mod.stock_batches b ON b.sku = i.sku AND b.qty > 0 AND b.qc_status = 'PASSED'
            LEFT JOIN (
                SELECT sku, SUM(qty) AS inward_qty FROM stores_mod.stock_movements
                WHERE movement_type IN ('CHECK_IN_GRN', 'GRN', 'MANUAL_IN')
                GROUP BY sku
            ) inw ON inw.sku = i.sku
            LEFT JOIN (
                SELECT sku, SUM(qty) AS outward_qty FROM stores_mod.stock_movements
                WHERE movement_type IN ('CHECK_OUT_ISSUE', 'BOM_ISSUE', 'TRANSFER_OUT', 'WASTAGE')
                GROUP BY sku
            ) outw ON outw.sku = i.sku
            WHERE i.category IN ('RM', 'Packaging', 'FG-Sweet')
        """
        params = []
        if store_code:
            sql += " AND (b.store_code = %s OR b.store_code IS NULL)"
            params.append(store_code)
        sql += " GROUP BY i.sku, i.name, i.category, i.sub_category, i.inventory_uom, i.cost_price, i.selling_price, i.min_par_level, inw.inward_qty, outw.outward_qty ORDER BY total_valuation DESC"
        rows = conn.execute(sql, tuple(params) if params else None).fetchall()
        return rows


@app.get("/reports/total-inventory")
def report_total_inventory():
    """
    Total Stores Inventory Valuation & Aging Breakdown by Store.
    """
    with get_conn() as conn:
        stores = conn.execute("SELECT * FROM stores_mod.stores WHERE active = TRUE ORDER BY store_code").fetchall()
        report = []
        for s in stores:
            batches = conn.execute(
                """
                SELECT COUNT(id) AS batches_count,
                       COUNT(DISTINCT sku) AS items_count,
                       COALESCE(SUM(qty), 0) AS total_qty,
                       COALESCE(SUM(qty * unit_cost), 0) AS total_value,
                       COALESCE(SUM(CASE WHEN (expiry_date - CURRENT_DATE) >= 30 THEN qty * unit_cost ELSE 0 END), 0) AS fresh_value,
                       COALESCE(SUM(CASE WHEN (expiry_date - CURRENT_DATE) BETWEEN 8 AND 29 THEN qty * unit_cost ELSE 0 END), 0) AS aging_value,
                       COALESCE(SUM(CASE WHEN (expiry_date - CURRENT_DATE) <= 7 THEN qty * unit_cost ELSE 0 END), 0) AS risk_value
                FROM stores_mod.stock_batches
                WHERE store_code = %s AND qty > 0 AND qc_status = 'PASSED'
                """,
                (s["store_code"],),
            ).fetchone()
            report.append({
                "store_code": s["store_code"],
                "name": s["name"],
                "outlet_code": s["outlet_code"],
                "store_type": s["store_type"],
                "temp_zone": s["temp_zone"],
                "capacity_kg": float(s["capacity_kg"]),
                "storekeeper": s["storekeeper"],
                "batches_count": batches["batches_count"] if batches else 0,
                "items_count": batches["items_count"] if batches else 0,
                "total_qty": round(float(batches["total_qty"] if batches else 0), 2),
                "total_value": round(float(batches["total_value"] if batches else 0), 2),
                "fresh_value": round(float(batches["fresh_value"] if batches else 0), 2),
                "aging_value": round(float(batches["aging_value"] if batches else 0), 2),
                "risk_value": round(float(batches["risk_value"] if batches else 0), 2),
            })
        return report


@app.get("/reports/vendor-procurement")
def report_vendor_procurement():
    """
    Vendor-wise Procurement Ledger & Lead Time Analysis.
    """
    with get_conn() as conn:
        vendors = conn.execute("SELECT * FROM vendor_mod.vendors ORDER BY vendor_code").fetchall()
        report = []
        for v in vendors:
            mappings = conn.execute(
                "SELECT rm_sku, rm_name, moq, uom, lead_time_days, quality_score FROM vendor_mod.vendor_rm_mapping WHERE vendor_code = %s",
                (v["vendor_code"],),
            ).fetchall()
            pos = conn.execute(
                "SELECT COUNT(id) AS po_count, COALESCE(SUM(total_amount), 0) AS total_spend FROM vendor_mod.purchase_orders WHERE vendor_code = %s",
                (v["vendor_code"],),
            ).fetchone()
            report.append({
                "vendor_code": v["vendor_code"],
                "trade_name": v["trade_name"],
                "legal_name": v["legal_name"],
                "contact_person": v["contact_person"],
                "mobile": v["mobile"],
                "email": v["email"],
                "gstin": v["gstin"],
                "fssai_no": v["fssai_no"],
                "fssai_expiry": str(v["fssai_expiry"]),
                "quality_rating": float(v["quality_rating"] or 4.5),
                "payment_terms": v["payment_terms"],
                "items_count": len(mappings),
                "materials_supplied": [m["rm_name"] for m in mappings],
                "lead_time_days": mappings[0]["lead_time_days"] if mappings else 3,
                "po_count": pos["po_count"] if pos else 0,
                "total_spend": round(float(pos["total_spend"] if pos else 0), 2)
            })
        return report


