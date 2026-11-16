import json
from datetime import date, datetime
from fastapi import HTTPException
from pydantic import BaseModel
from common.app_factory import create_service_app
from common.db import get_conn, validate_gstin_format

app = create_service_app("Vendor Management & Procurement Service")


class VendorCreate(BaseModel):
    vendor_code: str
    legal_name: str
    trade_name: str
    contact_person: str
    mobile: str
    email: str
    pan: str
    gstin: str
    fssai_no: str
    fssai_expiry: date
    bank_account: str
    ifsc: str
    msme: bool = False
    payment_terms: str = "Net 15 Days"
    regions: list[str] = ["Delhi NCR"]
    address: str = "Industrial Area, Phase 1"
    city: str = "Delhi"
    state: str = "Delhi"
    pincode: str = "110020"
    msme_reg_no: str = "UDYAM-DL-01-0045812"
    msme_category: str = "Micro"
    bank_name: str = "State Bank of India"
    bank_branch: str = "SME Branch, Okhla"
    documents: list[dict] = []


class VendorDocUpload(BaseModel):
    doc_type: str  # GST_CERTIFICATE, FSSAI_LICENSE, PAN_CARD, MSME_UDYAM, CANCELLED_CHEQUE, QUALITY_AUDIT
    doc_name: str
    file_url: str = ""
    notes: str = ""


class MappingCreate(BaseModel):
    vendor_code: str
    rm_sku: str
    rm_name: str
    priority_rank: int
    vendor_sku_code: str = ""
    moq: float = 10
    uom: str = "kg"
    lead_time_days: int = 2


class PriceMasterCreate(BaseModel):
    vendor_code: str
    rm_sku: str
    outlet_scope: str = "ALL"
    rate_per_uom: float
    slab_min_qty: float = 100
    slab_rate: float
    gst_pct: float = 5.0
    freight_included: bool = True


class TenderCreate(BaseModel):
    title: str
    rm_sku: str
    rm_name: str
    required_qty: float
    uom: str
    delivery_schedule: str


class BidCreate(BaseModel):
    vendor_code: str
    vendor_name: str
    unit_rate: float
    gst_pct: float = 5.0
    freight_cost: float = 0.0
    credit_days: int = 15
    quality_score: float = 4.5
    lead_time_days: int = 2
    sample_qc_passed: bool = True


class POCreate(BaseModel):
    vendor_code: str
    outlet_code: str = "MFG01"
    store_code: str = "STR-MFG-RM"
    items: list[dict]
    override_price_cap: bool = False
    delivery_date: date | None = None
    terms: str = "Standard 30 Days Net from date of GRN inspection. Goods subject to Annavya QA acceptance."
    status: str = "PENDING_APPROVAL"


class LineApprovalDecision(BaseModel):
    sku: str = ""
    item_id: int | None = None
    approved: bool = True
    approved_qty: float | None = None
    note: str = ""
    remarks: str = ""


class POLineApprovalPayload(BaseModel):
    decision: str = "APPROVED"  # "APPROVED" | "DECLINED" | "PARTIAL"
    overall_decision: str | None = None
    manager_name: str
    manager_role: str = "Location Manager"
    comments: str = ""
    manager_remarks: str = ""
    lines: list[LineApprovalDecision] = []
    line_decisions: list[LineApprovalDecision] = []


class POInvoiceMatch(BaseModel):
    invoice_no: str
    invoice_amount: float
    qc_notes: str = "Fat/SNF & Moisture verified within tolerance"


def num_to_words_inr(amount: float) -> str:
    """Converts a float amount into Indian English Words (Rupees)."""
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
             "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_two_digit(n: int) -> str:
        if n < 20:
            return units[n]
        return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")

    def convert_three_digit(n: int) -> str:
        h = n // 100
        rem = n % 100
        res = ""
        if h > 0:
            res += units[h] + " Hundred"
            if rem > 0:
                res += " and "
        if rem > 0:
            res += convert_two_digit(rem)
        return res

    amt = int(round(amount))
    if amt == 0:
        return "Rupees Zero Only"

    crores = amt // 10000000
    amt %= 10000000
    lakhs = amt // 100000
    amt %= 100000
    thousands = amt // 1000
    amt %= 1000
    hundreds = amt

    words = []
    if crores > 0:
        words.append(convert_three_digit(crores) + " Crore")
    if lakhs > 0:
        words.append(convert_three_digit(lakhs) + " Lakh")
    if thousands > 0:
        words.append(convert_three_digit(thousands) + " Thousand")
    if hundreds > 0:
        words.append(convert_three_digit(hundreds))

    return "Rupees " + " ".join(words) + " Only"


@app.get("/vendors")
def list_vendors():
    with get_conn() as conn:
        return conn.execute("SELECT * FROM vendor_mod.vendors ORDER BY id").fetchall()


@app.post("/vendors")
def create_vendor(payload: VendorCreate):
    ok, msg = validate_gstin_format(payload.gstin)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Vendor GSTIN invalid: {msg}")
    with get_conn() as conn:
        try:
            return conn.execute(
                """
                INSERT INTO vendor_mod.vendors
                (vendor_code, legal_name, trade_name, contact_person, mobile, email, pan, gstin,
                 gstn_verified, fssai_no, fssai_expiry, bank_account, ifsc, msme, payment_terms,
                 status, regions, address, city, state, pincode, msme_reg_no, msme_category,
                 bank_name, bank_branch, documents)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s,%s,%s,%s,%s,%s,'PENDING',%s::jsonb,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                RETURNING *
                """,
                (
                    payload.vendor_code.upper(), payload.legal_name, payload.trade_name,
                    payload.contact_person, payload.mobile, payload.email, payload.pan.upper(),
                    payload.gstin.upper(), payload.fssai_no, payload.fssai_expiry,
                    payload.bank_account, payload.ifsc.upper(), payload.msme,
                    payload.payment_terms, json.dumps(payload.regions),
                    payload.address, payload.city, payload.state, payload.pincode,
                    payload.msme_reg_no, payload.msme_category, payload.bank_name,
                    payload.bank_branch, json.dumps(payload.documents),
                ),
            ).fetchone()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


@app.patch("/vendors/{vendor_id}/approve")
def approve_vendor(vendor_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "UPDATE vendor_mod.vendors SET status = 'ACTIVE' WHERE id = %s RETURNING *",
            (vendor_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vendor not found")
        return row


@app.post("/vendors/{vendor_id}/documents")
def add_vendor_document(vendor_id: int, payload: VendorDocUpload):
    with get_conn() as conn:
        vendor = conn.execute("SELECT * FROM vendor_mod.vendors WHERE id = %s", (vendor_id,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        docs = list(vendor.get("documents") or [])
        new_doc = {
            "doc_type": payload.doc_type,
            "doc_name": payload.doc_name,
            "file_url": payload.file_url or f"/docs/{payload.doc_type.lower()}_{vendor['vendor_code']}.pdf",
            "notes": payload.notes,
            "uploaded_at": date.today().isoformat(),
            "status": "VERIFIED",
        }
        docs.append(new_doc)
        return conn.execute(
            "UPDATE vendor_mod.vendors SET documents = %s::jsonb WHERE id = %s RETURNING *",
            (json.dumps(docs), vendor_id),
        ).fetchone()


@app.patch("/vendors/{vendor_id}/documents/{doc_idx}/verify")
def verify_vendor_document(vendor_id: int, doc_idx: int):
    with get_conn() as conn:
        vendor = conn.execute("SELECT * FROM vendor_mod.vendors WHERE id = %s", (vendor_id,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        docs = list(vendor.get("documents") or [])
        if doc_idx < 0 or doc_idx >= len(docs):
            raise HTTPException(status_code=400, detail="Invalid document index")
        docs[doc_idx]["status"] = "VERIFIED"
        docs[doc_idx]["verified_at"] = date.today().isoformat()
        return conn.execute(
            "UPDATE vendor_mod.vendors SET documents = %s::jsonb WHERE id = %s RETURNING *",
            (json.dumps(docs), vendor_id),
        ).fetchone()


@app.get("/mappings")
def list_mappings():
    with get_conn() as conn:
        return conn.execute(
            """
            SELECT m.*, v.trade_name AS vendor_name
            FROM vendor_mod.vendor_rm_mapping m
            JOIN vendor_mod.vendors v ON v.vendor_code = m.vendor_code
            ORDER BY m.rm_sku, m.priority_rank
            """
        ).fetchall()


@app.post("/mappings")
def create_mapping(payload: MappingCreate):
    with get_conn() as conn:
        return conn.execute(
            """
            INSERT INTO vendor_mod.vendor_rm_mapping
            (vendor_code, rm_sku, rm_name, priority_rank, vendor_sku_code, moq, uom, lead_time_days)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
            """,
            (
                payload.vendor_code, payload.rm_sku, payload.rm_name, payload.priority_rank,
                payload.vendor_sku_code, payload.moq, payload.uom, payload.lead_time_days,
            ),
        ).fetchone()


@app.get("/price-masters")
def list_price_masters():
    with get_conn() as conn:
        return conn.execute(
            """
            SELECT p.*, v.trade_name AS vendor_name, i.name AS rm_name
            FROM vendor_mod.price_masters p
            LEFT JOIN vendor_mod.vendors v ON v.vendor_code = p.vendor_code
            LEFT JOIN admin_mod.items i ON i.sku = p.rm_sku
            ORDER BY p.id DESC
            """
        ).fetchall()


@app.post("/price-masters")
def create_price_master(payload: PriceMasterCreate):
    with get_conn() as conn:
        return conn.execute(
            """
            INSERT INTO vendor_mod.price_masters
            (vendor_code, rm_sku, outlet_scope, rate_per_uom, slab_min_qty, slab_rate, gst_pct, freight_included)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
            """,
            (
                payload.vendor_code, payload.rm_sku, payload.outlet_scope,
                payload.rate_per_uom, payload.slab_min_qty, payload.slab_rate,
                payload.gst_pct, payload.freight_included,
            ),
        ).fetchone()


@app.get("/tenders")
def list_tenders():
    with get_conn() as conn:
        tenders = conn.execute("SELECT * FROM vendor_mod.tenders ORDER BY id DESC").fetchall()
        for t in tenders:
            bids = conn.execute(
                "SELECT * FROM vendor_mod.tender_bids WHERE tender_id = %s ORDER BY landed_cost ASC",
                (t["id"],),
            ).fetchall()
            for idx, b in enumerate(bids):
                b["rank"] = f"L{idx + 1}"
            t["bids"] = bids
        return tenders


@app.post("/tenders")
def create_tender(payload: TenderCreate):
    with get_conn() as conn:
        cnt = conn.execute("SELECT COUNT(*) AS c FROM vendor_mod.tenders").fetchone()["c"] + 101
        tender_no = f"RFQ-2026-{cnt}"
        return conn.execute(
            """
            INSERT INTO vendor_mod.tenders (tender_no, title, rm_sku, rm_name, required_qty, uom, delivery_schedule, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'OPEN') RETURNING *
            """,
            (tender_no, payload.title, payload.rm_sku, payload.rm_name, payload.required_qty, payload.uom, payload.delivery_schedule),
        ).fetchone()


@app.post("/tenders/{tender_id}/bids")
def submit_bid(tender_id: int, payload: BidCreate):
    with get_conn() as conn:
        tender = conn.execute("SELECT * FROM vendor_mod.tenders WHERE id = %s", (tender_id,)).fetchone()
        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
        qty = float(tender["required_qty"])
        landed = round((qty * payload.unit_rate) * (1 + payload.gst_pct / 100.0) + payload.freight_cost, 2)
        bid = conn.execute(
            """
            INSERT INTO vendor_mod.tender_bids
            (tender_id, vendor_code, vendor_name, unit_rate, gst_pct, freight_cost, credit_days, quality_score, lead_time_days, sample_qc_passed, landed_cost)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
            """,
            (
                tender_id, payload.vendor_code, payload.vendor_name, payload.unit_rate,
                payload.gst_pct, payload.freight_cost, payload.credit_days, payload.quality_score,
                payload.lead_time_days, payload.sample_qc_passed, landed,
            ),
        ).fetchone()
        conn.execute("UPDATE vendor_mod.tenders SET status = 'EVALUATION' WHERE id = %s", (tender_id,))
        return bid


@app.post("/tenders/{tender_id}/award/{bid_id}")
def award_tender(tender_id: int, bid_id: int):
    with get_conn() as conn:
        tender = conn.execute("SELECT * FROM vendor_mod.tenders WHERE id = %s", (tender_id,)).fetchone()
        bid = conn.execute("SELECT * FROM vendor_mod.tender_bids WHERE id = %s AND tender_id = %s", (bid_id, tender_id)).fetchone()
        if not tender or not bid:
            raise HTTPException(status_code=404, detail="Tender or Bid not found")
        conn.execute("UPDATE vendor_mod.tender_bids SET is_winner = FALSE WHERE tender_id = %s", (tender_id,))
        conn.execute("UPDATE vendor_mod.tender_bids SET is_winner = TRUE WHERE id = %s", (bid_id,))
        conn.execute(
            "UPDATE vendor_mod.tenders SET status = 'AWARDED', awarded_vendor_code = %s WHERE id = %s",
            (bid["vendor_code"], tender_id),
        )
        # Auto-update Price Master for approved contract rates
        conn.execute(
            """
            INSERT INTO vendor_mod.price_masters (vendor_code, rm_sku, outlet_scope, rate_per_uom, slab_min_qty, slab_rate, gst_pct, freight_included)
            VALUES (%s,%s,'ALL',%s,%s,%s,%s,%s)
            """,
            (
                bid["vendor_code"], tender["rm_sku"], bid["unit_rate"],
                float(tender["required_qty"]) * 0.5, float(bid["unit_rate"]) * 0.97,
                bid["gst_pct"], float(bid["freight_cost"]) == 0,
            ),
        )
        # Auto-create PO
        po_cnt = conn.execute("SELECT COUNT(*) AS c FROM vendor_mod.purchase_orders").fetchone()["c"] + 41
        po_no = f"PO-2026-{po_cnt:04d}"
        po_items = [{"sku": tender["rm_sku"], "name": tender["rm_name"], "qty": float(tender["required_qty"]), "uom": tender["uom"], "rate": float(bid["unit_rate"]), "gst_pct": float(bid["gst_pct"])}]
        po = conn.execute(
            """
            INSERT INTO vendor_mod.purchase_orders (po_no, vendor_code, vendor_name, outlet_code, store_code, status, items, total_amount)
            VALUES (%s,%s,%s,'MFG01','STR-MFG-RM','ISSUED',%s::jsonb,%s) RETURNING *
            """,
            (po_no, bid["vendor_code"], bid["vendor_name"], json.dumps(po_items), float(bid["landed_cost"])),
        ).fetchone()
        return {"tender_status": "AWARDED", "awarded_vendor": bid["vendor_code"], "po": po}


@app.get("/purchase-orders")
def list_pos(vendor_code: str | None = None, status: str | None = None):
    with get_conn() as conn:
        q = "SELECT * FROM vendor_mod.purchase_orders WHERE 1=1"
        params = []
        if vendor_code:
            q += " AND vendor_code = %s"
            params.append(vendor_code)
        if status and status.upper() != "ALL":
            q += " AND status = %s"
            params.append(status.upper())
        q += " ORDER BY id DESC"
        return conn.execute(q, tuple(params)).fetchall()


@app.post("/purchase-orders")
def create_po(payload: POCreate):
    with get_conn() as conn:
        vendor = conn.execute("SELECT * FROM vendor_mod.vendors WHERE vendor_code = %s", (payload.vendor_code,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        if vendor["status"] != "ACTIVE":
            raise HTTPException(status_code=400, detail="Vendor is not ACTIVE")
        total = 0.0
        enriched_items = []
        for item in payload.items:
            pm = conn.execute(
                """
                SELECT * FROM vendor_mod.price_masters
                WHERE vendor_code = %s AND rm_sku = %s AND active = TRUE
                ORDER BY id DESC LIMIT 1
                """,
                (payload.vendor_code, item["sku"]),
            ).fetchone()
            if pm and float(item["rate"]) > float(pm["rate_per_uom"]) and not payload.override_price_cap:
                raise HTTPException(
                    status_code=400,
                    detail=f"PO Rate ₹{item['rate']} for {item['sku']} exceeds Price Master cap ₹{pm['rate_per_uom']}. Procurement Head override required.",
                )
            gst = float(item.get("gst_pct", pm["gst_pct"] if pm else 5.0))
            taxable = float(item["qty"]) * float(item["rate"])
            tax_amt = taxable * (gst / 100.0)
            total += taxable + tax_amt
            enriched_items.append({
                **item,
                "hsn_code": item.get("hsn_code", "040590" if "ghee" in item["name"].lower() else "210690"),
                "taxable_value": round(taxable, 2),
                "gst_pct": gst,
                "tax_amount": round(tax_amt, 2),
                "line_total": round(taxable + tax_amt, 2),
                "approval_status": "PENDING",
            })

        po_cnt = conn.execute("SELECT COUNT(*) AS c FROM vendor_mod.purchase_orders").fetchone()["c"] + 41
        po_no = f"PO-2026-{po_cnt:04d}"
        del_date = payload.delivery_date or (date.today())
        status = payload.status or "PENDING_APPROVAL"
        return conn.execute(
            """
            INSERT INTO vendor_mod.purchase_orders
            (po_no, vendor_code, vendor_name, outlet_code, store_code, status, items, total_amount, po_date, delivery_date, terms)
            VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s,CURRENT_DATE,%s,%s) RETURNING *
            """,
            (po_no, payload.vendor_code, vendor["trade_name"], payload.outlet_code, payload.store_code, status, json.dumps(enriched_items), round(total, 2), del_date, payload.terms),
        ).fetchone()


@app.post("/purchase-orders/{po_id}/line-approval")
def approve_po_lines(po_id: int, payload: POLineApprovalPayload):
    """
    Location Manager & Corporate Manager Line-by-Line PO Approval:
    Allows reviewing vendor purchase orders raised by stores staff, approving/declining
    specific items with rate verification, adjusting approved quantity, or rejecting the PO.
    """
    with get_conn() as conn:
        po = conn.execute("SELECT * FROM vendor_mod.purchase_orders WHERE id = %s", (po_id,)).fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        items = po["items"] or []
        effective_decision = payload.overall_decision or payload.decision
        effective_comments = payload.manager_remarks or payload.comments
        all_lines = payload.line_decisions or payload.lines or []
        decision_map = {}
        for idx, l in enumerate(all_lines):
            if l.sku:
                decision_map[l.sku] = l
            if l.item_id is not None:
                decision_map[l.item_id] = l
            decision_map[idx] = l

        new_items = []
        new_total = 0.0
        all_approved = True
        any_approved = False

        for idx, itm in enumerate(items):
            dec = decision_map.get(itm.get("sku")) or decision_map.get(idx + 1) or decision_map.get(idx)
            if dec:
                line_status = "APPROVED" if dec.approved else "DECLINED"
                approved_qty = dec.approved_qty if (dec.approved_qty is not None and dec.approved) else (float(itm["qty"]) if dec.approved else 0.0)
                note = dec.remarks or dec.note
            else:
                line_status = "APPROVED" if effective_decision == "APPROVED" else "DECLINED"
                approved_qty = float(itm["qty"]) if effective_decision == "APPROVED" else 0.0
                note = ""

            if line_status == "DECLINED":
                all_approved = False
            else:
                any_approved = True

            taxable = approved_qty * float(itm["rate"])
            gst = float(itm.get("gst_pct", 5.0))
            tax_amt = taxable * (gst / 100.0)
            line_tot = taxable + tax_amt
            new_total += line_tot

            new_items.append({
                **itm,
                "approval_status": line_status,
                "approved_qty": approved_qty,
                "approval_note": note,
                "taxable_value": round(taxable, 2),
                "tax_amount": round(tax_amt, 2),
                "line_total": round(line_tot, 2)
            })

        if effective_decision == "DECLINED" or not any_approved:
            final_status = "DECLINED"
        elif all_approved:
            final_status = "APPROVED"
        else:
            final_status = "PARTIALLY_APPROVED"

        updated = conn.execute(
            """
            UPDATE vendor_mod.purchase_orders
            SET status = %s, items = %s::jsonb, total_amount = %s, qc_notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                final_status, json.dumps(new_items), round(new_total, 2),
                f"Line-approval by {payload.manager_name} ({payload.manager_role}): {effective_comments}",
                po_id,
            ),
        ).fetchone()

        return {
            "success": True,
            "message": f"PO {po['po_no']} marked as {final_status} by {payload.manager_name} ({payload.manager_role})!",
            "po_status": final_status,
            "new_total_amount": round(new_total, 2),
            "po": updated
        }


# ---------------- STANDARD INDIAN GOVT GST PO ON CUSTOMER LETTERHEAD ---------------- #

@app.get("/purchase-orders/{po_id}/letterhead")
def get_po_letterhead(po_id: int):
    with get_conn() as conn:
        po = conn.execute("SELECT * FROM vendor_mod.purchase_orders WHERE id = %s", (po_id,)).fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
        vendor = conn.execute("SELECT * FROM vendor_mod.vendors WHERE vendor_code = %s", (po["vendor_code"],)).fetchone()
        outlet = conn.execute("SELECT * FROM admin_mod.outlets WHERE code = %s", (po["outlet_code"],)).fetchone()

        items = po["items"] if isinstance(po["items"], list) else json.loads(po["items"])
        taxable_sum = 0.0
        cgst_sum = 0.0
        sgst_sum = 0.0
        igst_sum = 0.0

        vendor_state = (vendor["state"] if vendor else "Delhi").lower()
        buyer_state = (outlet["state"] if outlet else "Delhi").lower()
        is_interstate = vendor_state != buyer_state

        table_rows = []
        for idx, it in enumerate(items):
            qty = float(it.get("qty", 1))
            rate = float(it.get("rate", 0))
            taxable = round(qty * rate, 2)
            gst_rate = float(it.get("gst_pct", 5.0))
            taxable_sum += taxable

            if is_interstate:
                igst = round(taxable * (gst_rate / 100.0), 2)
                cgst = 0.0
                sgst = 0.0
                igst_sum += igst
            else:
                cgst = round(taxable * (gst_rate / 200.0), 2)
                sgst = round(taxable * (gst_rate / 200.0), 2)
                igst = 0.0
                cgst_sum += cgst
                sgst_sum += sgst

            line_tot = round(taxable + cgst + sgst + igst, 2)
            table_rows.append({
                "sl_no": idx + 1,
                "sku": it.get("sku", ""),
                "description": it.get("name", it.get("sku", "")),
                "hsn_code": it.get("hsn_code", "040590"),
                "qty": qty,
                "uom": it.get("uom", "kg"),
                "rate": rate,
                "taxable_value": taxable,
                "gst_rate": gst_rate,
                "cgst_amount": cgst,
                "sgst_amount": sgst,
                "igst_amount": igst,
                "total": line_tot,
            })

        grand_total = round(taxable_sum + cgst_sum + sgst_sum + igst_sum, 2)
        total_in_words = num_to_words_inr(grand_total)

        letterhead = {
            "company": {
                "legal_name": "Annavya Foods Retail Pvt Ltd",
                "trade_name": "Annavya Heritage Sweets & Restaurant Chain",
                "corporate_office": "Block B-14, Inner Circle, Connaught Place, New Delhi - 110001",
                "cin": "U15400DL2024PTC123456",
                "gstin": "07AAACA5678A1ZY",
                "pan": "AAACA5678A",
                "fssai_no": "10018011002341",
                "state": "Delhi",
                "state_code": "07",
                "email": "procurement@annavya.in",
                "phone": "+91-11-43567890",
            },
            "doc_title": "OFFICIAL PURCHASE ORDER (FORM GST INV-1 / RULE 46)",
            "po": {
                "id": po["id"],
                "po_no": po["po_no"],
                "po_date": str(po.get("po_date") or date.today()),
                "delivery_date": str(po.get("delivery_date") or date.today()),
                "status": po["status"],
                "outlet_code": po["outlet_code"],
                "store_code": po["store_code"],
                "payment_terms": vendor["payment_terms"] if vendor else "Net 30 Days",
                "terms_and_conditions": po.get("terms") or "Standard 30 Days Net from date of GRN inspection. Goods subject to Annavya QA acceptance.",
            },
            "vendor": {
                "code": po["vendor_code"],
                "name": po["vendor_name"],
                "legal_name": vendor["legal_name"] if vendor else po["vendor_name"],
                "contact_person": vendor["contact_person"] if vendor else "",
                "mobile": vendor["mobile"] if vendor else "",
                "email": vendor["email"] if vendor else "",
                "gstin": vendor["gstin"] if vendor else "07AAACS1234F1Z5",
                "pan": vendor["pan"] if vendor else "AAACS1234F",
                "fssai_no": vendor["fssai_no"] if vendor else "10019011001122",
                "msme_reg_no": vendor.get("msme_reg_no") if vendor else "UDYAM-DL-01-0045812",
                "msme_category": vendor.get("msme_category") if vendor else "Micro",
                "address": vendor["address"] if vendor else "Industrial Area, Phase 1",
                "city": vendor["city"] if vendor else "Delhi",
                "state": vendor["state"] if vendor else "Delhi",
                "pincode": vendor["pincode"] if vendor else "110020",
                "bank_name": vendor.get("bank_name") if vendor else "State Bank of India",
                "bank_account": vendor["bank_account"] if vendor else "98765432101",
                "ifsc": vendor["ifsc"] if vendor else "SBIN0004512",
            },
            "shipping_location": {
                "name": outlet["name"] if outlet else "Annavya Central Factory & Warehouse",
                "address": outlet["address"] if outlet else "Plot 14-B Industrial Area, Gurugram - 122001",
                "gstin": outlet["gstin"] if outlet else "06AAACA5678A1Z0",
                "state": outlet["state"] if outlet else "Haryana",
            },
            "items": table_rows,
            "financial_summary": {
                "taxable_amount": taxable_sum,
                "cgst_amount": cgst_sum,
                "cgst": cgst_sum,
                "sgst_amount": sgst_sum,
                "sgst": sgst_sum,
                "igst_amount": igst_sum,
                "igst": igst_sum,
                "total_tax": round(cgst_sum + sgst_sum + igst_sum, 2),
                "grand_total": grand_total,
                "amount_in_words": total_in_words,
            },
            "tax_summary": {
                "taxable_amount": taxable_sum,
                "cgst_amount": cgst_sum,
                "cgst": cgst_sum,
                "sgst_amount": sgst_sum,
                "sgst": sgst_sum,
                "igst_amount": igst_sum,
                "igst": igst_sum,
                "total_tax": round(cgst_sum + sgst_sum + igst_sum, 2),
                "grand_total": grand_total,
                "amount_in_words": total_in_words,
            },
            "statutory_clauses": [
                "E-Way Bill: Mandatory for all consignments exceeding invoice value of INR 50,000 as per GST Act.",
                "FSSAI Compliance: The supplied materials must conform to FSSAI (Food Safety & Standards) Regulations 2011 with Batch Certificate of Analysis (CoA).",
                "Inspection & Tolerances: Moisture, fat/SNF, or foreign matter exceeding ±2% will lead to lot quarantine at supplier's risk and freight.",
                "Payment Settlement: Payment shall be disbursed as per agreed credit terms post 3-Way Match GRN clearance.",
                "Jurisdiction: All disputes shall be subject to Delhi jurisdiction only."
            ],
            "digital_signatory": {
                "signed_by": po.get("created_by") or "Procurement Officer",
                "authorized_signatory": po.get("created_by") or "Authorized Procurement Officer",
                "designation": "Head of Corporate Sourcing & Procurement",
                "entity": "Annavya Foods Retail Pvt Ltd",
                "verification_hash": f"SHA256-{abs(hash(po['po_no'])) % 999999999:09d}",
                "signature_hash": f"SHA256-{abs(hash(po['po_no'])) % 999999999:09d}",
                "timestamp": datetime.now().strftime("%d-%b-%Y %I:%M %p"),
            },
            "digital_signature": {
                "signed_by": po.get("created_by") or "Procurement Officer",
                "authorized_signatory": po.get("created_by") or "Authorized Procurement Officer",
                "designation": "Head of Corporate Sourcing & Procurement",
                "entity": "Annavya Foods Retail Pvt Ltd",
                "verification_hash": f"SHA256-{abs(hash(po['po_no'])) % 999999999:09d}",
                "signature_hash": f"SHA256-{abs(hash(po['po_no'])) % 999999999:09d}",
                "timestamp": datetime.now().strftime("%d-%b-%Y %I:%M %p"),
            }
        }
        return letterhead


# ---------------- VENDOR PORTAL DASHBOARD (INBOX, RATES, INVENTORY & BILLS) ---------------- #

@app.get("/vendor-portal/dashboard/{vendor_code}")
def get_vendor_portal_dashboard(vendor_code: str):
    with get_conn() as conn:
        vc = vendor_code.upper().strip()
        vendor = conn.execute("SELECT * FROM vendor_mod.vendors WHERE UPPER(vendor_code) = %s", (vc,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")

        # 1. Approved Contract Rates & Products
        rates = conn.execute(
            """
            SELECT p.*, i.name AS rm_name, i.category, i.hsn_code, i.inventory_uom
            FROM vendor_mod.price_masters p
            JOIN admin_mod.items i ON i.sku = p.rm_sku
            WHERE UPPER(p.vendor_code) = %s AND p.active = TRUE
            ORDER BY p.id DESC
            """,
            (vc,),
        ).fetchall()

        # 2. Purchase Orders
        pos = conn.execute(
            "SELECT * FROM vendor_mod.purchase_orders WHERE UPPER(vendor_code) = %s ORDER BY id DESC",
            (vc,),
        ).fetchall()

        # 3. Active Tenders & RFQs
        tenders = conn.execute("SELECT * FROM vendor_mod.tenders ORDER BY id DESC LIMIT 15").fetchall()

        # 4. Multi-Location Inventory Visibility for vendor-supplied items
        supplied_skus = [r["rm_sku"] for r in rates if r.get("rm_sku")]
        inventory_levels = []
        if supplied_skus:
            inventory_levels = conn.execute(
                """
                SELECT 
                    COALESCE(s.outlet_code, 'MFG01') AS outlet_code,
                    COALESCE(o.name, 'Central Base Kitchen / Factory') AS outlet_name,
                    sb.store_code,
                    COALESCE(s.name, sb.store_code) AS store_name,
                    sb.sku AS item_sku,
                    sb.item_name,
                    SUM(sb.qty) AS current_stock,
                    sb.uom AS inventory_uom,
                    150.0 AS par_level
                FROM stores_mod.stock_batches sb
                LEFT JOIN stores_mod.stores s ON s.store_code = sb.store_code
                LEFT JOIN admin_mod.outlets o ON o.code = s.outlet_code
                WHERE sb.sku = ANY(%s)
                GROUP BY s.outlet_code, o.name, sb.store_code, s.name, sb.sku, sb.item_name, sb.uom
                ORDER BY sb.sku, s.outlet_code
                """,
                (supplied_skus,),
            ).fetchall()
        else:
            # If no direct rates mapped, show factory and store RM inventory for partner overview
            inventory_levels = conn.execute(
                """
                SELECT 
                    COALESCE(s.outlet_code, 'MFG01') AS outlet_code,
                    COALESCE(o.name, 'Central Base Kitchen / Factory') AS outlet_name,
                    sb.store_code,
                    COALESCE(s.name, sb.store_code) AS store_name,
                    sb.sku AS item_sku,
                    sb.item_name,
                    SUM(sb.qty) AS current_stock,
                    sb.uom AS inventory_uom,
                    150.0 AS par_level
                FROM stores_mod.stock_batches sb
                LEFT JOIN stores_mod.stores s ON s.store_code = sb.store_code
                LEFT JOIN admin_mod.outlets o ON o.code = s.outlet_code
                GROUP BY s.outlet_code, o.name, sb.store_code, s.name, sb.sku, sb.item_name, sb.uom
                ORDER BY sb.sku, s.outlet_code
                LIMIT 20
                """
            ).fetchall()

        # 5. Pending Bills & Invoices
        pending_bills = conn.execute(
            """
            SELECT po_no, invoice_no, invoice_amount, total_amount, status,
                   three_way_match_status, created_at
            FROM vendor_mod.purchase_orders
            WHERE UPPER(vendor_code) = %s AND status IN ('ISSUED', 'INVOICE_MATCHED', 'VARIANCE_HOLD')
            ORDER BY id DESC
            """,
            (vc,),
        ).fetchall()

        # 6. Vendor Inbox Notifications
        inbox = []
        for p in pos:
            inbox.append({
                "type": "PO_RELEASED",
                "title": f"New Purchase Order Released: {p['po_no']}",
                "ref_no": p["po_no"],
                "po_id": p["id"],
                "amount": float(p["total_amount"]),
                "date": str(p["created_at"])[:10],
                "message": f"Annavya has released Purchase Order {p['po_no']} for {p['outlet_code']} (Value: ₹{p['total_amount']:,.2f}). Click to view / print Official GST PO Letterhead.",
                "action_url": f"/vendor-portal/po/{p['id']}",
            })

        for t in tenders:
            if t["status"] == "OPEN":
                inbox.append({
                    "type": "TENDER_INVITATION",
                    "title": f"Active Tender Invitation: {t['tender_no']}",
                    "ref_no": t["tender_no"],
                    "tender_id": t["id"],
                    "date": str(t["created_at"])[:10],
                    "message": f"Tender {t['tender_no']} for {t['required_qty']} {t['uom']} of {t['rm_name']} is currently open for competitive quotes.",
                    "action_url": f"/vendor-portal/tenders/{t['id']}",
                })

        return {
            "vendor": vendor,
            "inbox": inbox,
            "contract_rates": rates,
            "purchase_orders": pos,
            "pending_bills": pending_bills,
            "multi_location_inventory": inventory_levels,
            "inventory_levels": inventory_levels,
            "tenders": tenders,
        }


@app.post("/purchase-orders/{po_id}/grn-and-match")
def grn_and_three_way_match(po_id: int, payload: POInvoiceMatch):
    with get_conn() as conn:
        po = conn.execute("SELECT * FROM vendor_mod.purchase_orders WHERE id = %s", (po_id,)).fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        # Create stock batches in stores_mod (GRN inward)
        grn_no = f"GRN-2026-{po_id + 100:04d}"
        items = po["items"] if isinstance(po["items"], list) else json.loads(po["items"])
        for idx, item in enumerate(items):
            meta = conn.execute("SELECT category, shelf_life_days FROM admin_mod.items WHERE sku = %s", (item["sku"],)).fetchone()
            cat = meta["category"] if meta else "RM"
            shelf = meta["shelf_life_days"] if meta else 90
            batch_no = f"B-{item['sku'][-4:]}-{po_id}{idx}"
            conn.execute(
                """
                INSERT INTO stores_mod.stock_batches
                (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_DATE,CURRENT_DATE + (%s || ' days')::interval,'PASSED',%s)
                """,
                (
                    po["store_code"], item["sku"], item["name"], cat, batch_no,
                    item["qty"], item["uom"], item["rate"], str(shelf), grn_no,
                ),
            )
            mov_no = f"MOV-GRN-{po_id}-{idx}"
            conn.execute(
                """
                INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor)
                VALUES (%s,'GRN',%s,%s,%s,%s,%s,'3-Way PO GRN Passed QC',%s,'Storekeeper')
                ON CONFLICT (movement_no) DO NOTHING
                """,
                (mov_no, po["store_code"], item["sku"], batch_no, item["qty"], item["uom"], po["po_no"]),
            )
        diff = abs(float(payload.invoice_amount) - float(po["total_amount"]))
        match_status = "MATCHED" if diff <= 10.0 else "VARIANCE_HOLD"
        updated = conn.execute(
            """
            UPDATE vendor_mod.purchase_orders
            SET status = 'INVOICE_MATCHED', invoice_no = %s, invoice_amount = %s,
                three_way_match_status = %s, qc_notes = %s
            WHERE id = %s RETURNING *
            """,
            (payload.invoice_no, payload.invoice_amount, match_status, payload.qc_notes, po_id),
        ).fetchone()
        return {"po": updated, "grn_no": grn_no, "three_way_match_status": match_status}
