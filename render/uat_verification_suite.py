"""
Comprehensive UAT Verification & Health Check Suite for Bikanervala Retail ERP.
Tests all 8 microservices, GSTN/Address/Branding alignment, Excel catalog import,
and end-to-end operational flows without any HTTP 500 or unexpected HTTP errors.

Usage:
    python render/uat_verification_suite.py --url https://bkv-retailpos.onrender.com
"""

import sys
import json
import argparse
import urllib.request
import urllib.error


def http_req(base_url: str, method: str, path: str, body=None, expected_codes=(200, 201)):
    url = f"{base_url.rstrip('/')}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            code = resp.status
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw
            ok = code in expected_codes
            return ok, code, parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = raw
        ok = e.code in expected_codes
        return ok, e.code, parsed
    except Exception as e:
        return False, 0, str(e)


def run_suite(base_url: str) -> int:
    results = []

    def check(module: str, name: str, method: str, path: str, body=None, expected=(200, 201), validator=None):
        ok, code, data = http_req(base_url, method, path, body=body, expected_codes=expected)
        note = ""
        if ok and validator:
            try:
                v_ok, v_msg = validator(data)
                if not v_ok:
                    ok = False
                note = v_msg
            except Exception as ex:
                ok = False
                note = f"Validator error: {ex}"
        elif not ok:
            note = str(data)[:180]
        results.append((module, name, method, path, code, ok, note))
        status_tag = "PASS" if ok else "FAIL"
        print(f"[{status_tag}] [{module}] {name} -> {method} {path} (HTTP {code}) {note}")
        return ok, data

    print(f"=== Running Bikanervala ERP UAT Verification Suite against {base_url} ===\n")

    # 1. Core Platform Health
    check("Platform", "Root Health", "GET", "/health")
    check("Platform", "API Health", "GET", "/api/health")
    check("Platform", "Frontend SPA Index", "GET", "/", validator=lambda d: (isinstance(d, str) and "html" in d.lower(), "HTML served"))

    # 2. Admin, Branding, GSTN & Address
    check("Admin", "Outlets List & DEL01 GSTN/Address", "GET", "/api/admin/outlets",
          validator=lambda d: (
              isinstance(d, list) and any(
                  o.get("code") == "DEL01"
                  and o.get("gstin") == "07AAAFB0115B1ZJ"
                  and "Karol Bagh" in (o.get("address") or "")
                  for o in d
              ),
              f"Outlets={len(d) if isinstance(d, list) else 0}, DEL01 GSTIN/Address verified"
          ))
    check("Admin", "Bikanervala Logo & Branding", "GET", "/api/admin/branding",
          validator=lambda d: (
              isinstance(d, dict) and "bikanervala-customer-logo" in (d.get("customer_logo_url") or ""),
              f"Logo={d.get('customer_logo_url')}"
          ))
    check("Admin", "Users & RBAC Roles", "GET", "/api/admin/users")
    check("Admin", "Roles Matrix", "GET", "/api/admin/roles")
    check("Admin", "Payment Gateways Config", "GET", "/api/admin/payment-gateways")
    check("Admin", "WhatsApp Cloud API Config", "GET", "/api/admin/whatsapp-config")
    check("Admin", "WhatsApp Dispatch Logs", "GET", "/api/admin/whatsapp/logs")
    check("Admin", "Code Sequences", "GET", "/api/admin/code-sequences")
    check("Admin", "System Config", "GET", "/api/admin/config")
    check("Admin", "Audit Logs", "GET", "/api/admin/audit-logs?limit=10")

    # 3. Item Admin & Excel Datasource Catalog
    check("ItemAdmin", "Excel Imported Items Catalog", "GET", "/api/admin/items",
          validator=lambda d: (
              isinstance(d, list) and len(d) >= 1000,
              f"Catalog items count={len(d) if isinstance(d, list) else 0}"
          ))

    # 4. Retail POS End-to-End (Estimate -> Pay -> Digital Invoice -> WhatsApp -> Shop Stock -> EOD)
    check("POS", "POS Items", "GET", "/api/pos/items")
    check("POS", "Cash Counters", "GET", "/api/pos/counters?outlet_code=DEL01")
    check("POS", "Promos", "GET", "/api/pos/promos")
    check("POS", "Shop Stock", "GET", "/api/pos/shop/stock?outlet_code=DEL01")
    check("POS", "EOD Report", "GET", "/api/pos/shop/eod?outlet_code=DEL01")

    ok_est, est_data = check("POS", "Create Estimate", "POST", "/api/pos/estimates", body={
        "outlet_code": "DEL01",
        "mode": "3_COUNTER",
        "items": [{"sku": "FG-RAS-01", "name": "Spongy White Rasgulla", "qty": 1.0, "uom": "kg", "unit_price": 480.0, "gst_pct": 5, "line_total": 480.0}],
        "estimate_staff": "UAT Verifier",
        "customer_name": "UAT Guest",
        "customer_mobile": "9811002233",
    })
    if ok_est and isinstance(est_data, dict) and est_data.get("estimate_no"):
        est_no = est_data["estimate_no"]
        grand_total = est_data.get("grand_total", 504.0)
        ok_pay, pay_data = check("POS", f"Settle Payment ({est_no})", "POST", f"/api/pos/orders/{est_no}/pay", body={
            "payment_splits": [{"mode": "Cash", "amount": grand_total, "ref": "UAT-CASH"}],
            "cashier_id": "CSH-DEL01-001",
            "cashier_name": "Priya Sharma",
            "counter_id": "CNT-DEL01-01",
            "counter_name": "Mithai Counter 1",
            "terminal_ip": "127.0.0.1",
            "customer_mobile": "9811002233",
            "customer_name": "UAT Guest",
            "send_whatsapp": True,
        })
        if ok_pay and isinstance(pay_data, dict) and pay_data.get("invoice_no"):
            inv_no = pay_data["invoice_no"]
            check("POS", f"Digital Invoice HTML/PDF ({inv_no})", "GET", f"/api/pos/orders/{inv_no}/digital-invoice",
                  validator=lambda d: (
                      isinstance(d, str) and "07AAAFB0115B1ZJ" in d and "Karol Bagh" in d and "bikanervala-customer-logo" in d,
                      "Verified GSTIN 07AAAFB0115B1ZJ, Karol Bagh address & Logo on invoice"
                  ))
            check("POS", f"WhatsApp Backend Dispatch ({inv_no})", "POST", "/api/pos/whatsapp/dispatch-backend", body={
                "doc_type": "TAX_INVOICE",
                "doc_id": inv_no,
                "customer_mobile": "9811002233",
                "customer_name": "UAT Guest",
                "send_pdf": True,
            })

    # 5. KOT & Restaurant POS
    check("KOT", "Dining Tables (DEL01)", "GET", "/api/kot/tables?outlet_code=DEL01",
          validator=lambda d: (isinstance(d, list) and len(d) > 0, f"Tables={len(d) if isinstance(d, list) else 0}"))
    check("KOT", "KDS Active Tickets", "GET", "/api/kot/kds")

    # 6. Stores & BOM
    check("Stores", "Stock Batches", "GET", "/api/stores/batches")
    check("Stores", "Material Requisitions", "GET", "/api/stores/requisitions")
    check("Stores", "Raw Material Search", "GET", "/api/stores/search?q=milk")
    check("Stores", "Stores Reports", "GET", "/api/stores/reports")

    # 7. Sweet Factory
    check("Factory", "Production Orders", "GET", "/api/factory/orders")
    check("Factory", "Kettles & Shifts", "GET", "/api/factory/kettles")

    # 8. OMS & Online Aggregators
    check("OMS", "Bulk Orders", "GET", "/api/oms/bulk-orders")
    check("OMS", "Aggregator Orders (Zomato/Swiggy)", "GET", "/api/oms/aggregators/orders?status=PLACED")
    check("OMS", "Aggregator Config", "GET", "/api/oms/aggregators/config")

    # 9. Vendor & RFQ
    check("Vendor", "Vendors List", "GET", "/api/vendor/vendors")
    check("Vendor", "Tenders / RFQ", "GET", "/api/vendor/tenders")
    check("Vendor", "Purchase Orders", "GET", "/api/vendor/pos")

    # 10. Executive Analytics & Reports
    check("Analytics", "Executive Summary", "GET", "/api/analytics/executive-summary")

    total = len(results)
    passed = sum(1 for r in results if r[5])
    failed = total - passed
    print(f"\n=== UAT Verification Complete: {passed}/{total} PASSED, {failed} FAILED ===")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bikanervala ERP UAT Verification Suite")
    parser.add_argument("--url", default="https://bkv-retailpos.onrender.com", help="Target ERP base URL")
    args = parser.parse_args()
    sys.exit(run_suite(args.url))
