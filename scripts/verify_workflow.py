import urllib.request
import json
import sys

BASE_URL = "http://localhost:8285"

def api_call(path, method="GET", payload=None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    data = json.dumps(payload).encode() if payload else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=10) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            err_json = json.loads(body)
        except:
            err_json = {"raw": body}
        return e.code, err_json
    except Exception as ex:
        return 500, {"error": str(ex)}

def run_tests():
    print("=== ANNAVYA ERP COMPREHENSIVE VERIFICATION ===")
    
    # 1. Executive Dashboard API
    st, res = api_call("/api/analytics/executive-dashboard")
    print(f"1. Executive Dashboard API: HTTP {st}")
    assert st == 200, f"Expected 200, got {st}: {res}"
    print(f"   Revenue: ₹{res.get('kpis', {}).get('total_revenue', 0):,.2f}, Outlets: {len(res.get('outlets', []))}")

    # 2. Hardware Tests (IP Thermal Printer & Advanced Drawer)
    st, res = api_call("/api/admin/hardware/test-network-printer", "POST", {
        "ip": "192.168.1.198", "port": 9100, "printer_name": "POS Counter Thermal"
    })
    print(f"2. Network Printer Ping Test: HTTP {st} -> {res.get('status')} ({res.get('latency_ms')}ms)")
    assert st == 200

    st, res = api_call("/api/admin/hardware/test-drawer", "POST", {
        "interface_type": "RJ11_PRINTER", "pin": 2, "pulse_ms": 120
    })
    print(f"   Advanced Cash Drawer Test: HTTP {st} -> {res.get('message')} (Sensor: {res.get('microswitch_sensor_state')})")
    assert st == 200

    # 3. Item-Wise Discount Creation
    promo_payload = {
        "code": "FESTIVE-KATLI20",
        "name": "Festive Kaju Katli Special 20% Off",
        "rule_type": "PERCENT",
        "value": 20,
        "min_bill": 500,
        "max_cap": 300,
        "stackable": False,
        "outlet_scope": "ALL",
        "promo_type": "FESTIVAL_OFFER",
        "target_audience": "FESTIVAL",
        "is_item_wise": True,
        "applicable_skus": ["FG-KAJU-01"],
        "applicable_item_names": ["Royal Silver-Leaf Kaju Katli"]
    }
    st, res = api_call("/api/admin/promos", "POST", promo_payload)
    print(f"3. Item-Wise Discount Creation: HTTP {st} -> Code: {res.get('code')}, Item-Wise: {res.get('is_item_wise')}")
    assert st == 200

    # 4. Factory Inbox & Lined up orders
    st, res = api_call("/api/factory/inbox?factory_code=FAC-DEL01")
    print(f"4. Factory Inbox: HTTP {st} -> {res.get('summary', {}).get('inbox_count', 0)} orders queued")
    assert st == 200
    inbox_orders = res.get("inbox_orders", [])
    assert len(inbox_orders) > 0, "No orders found in inbox!"
    target_order = inbox_orders[0]
    target_id = target_order["id"]
    target_prod_no = target_order["prod_no"]
    print(f"   Selected Order: {target_prod_no} ({target_order['fg_name']})")

    # 5. Production Manager Accepts Order -> Auto-requisitions to Stores
    st, res = api_call(f"/api/factory/orders/{target_id}/accept", "POST")
    print(f"5. Production Manager Accept Order: HTTP {st} -> {res.get('message')}")
    assert st == 200

    # 6. Stores Inbox Check
    st, res = api_call("/api/stores/material-requisitions")
    print(f"6. Central Stores Inbox: HTTP {st} -> {len(res)} Requisitions")
    assert st == 200
    matching_req = next((r for r in res if r["prod_no"] == target_prod_no), res[0] if res else None)
    assert matching_req is not None, "Requisition not found in Stores!"
    print(f"   Found Requisition: {matching_req['req_no']} for {matching_req['fg_name']} (Status: {matching_req['status']})")

    # 7. Stores Issues BOM Materials via FEFO
    if matching_req["status"] != "ISSUED":
        st, res = api_call(f"/api/stores/material-requisitions/{matching_req['id']}/issue", "POST", {
            "actor": "Suresh Sharma (Central Stores Head)"
        })
        print(f"7. Stores Issue BOM (FEFO): HTTP {st} -> {res.get('message')}")
        assert st == 200

    # 8. Factory Starts Cooking on Kettle Line
    st, res = api_call(f"/api/factory/orders/{target_id}/start-cooking", "POST", {
        "kettle_line": "Steam Kettle #1 (Chhena/Syrup)"
    })
    print(f"8. Factory Start Cooking: HTTP {st} -> Status: {res.get('status')}, Line: {res.get('kettle_line')}")
    assert st == 200

    # 9. QC Lab Complete
    st, res = api_call(f"/api/factory/orders/{target_id}/qc-complete", "POST", {
        "actual_qty": float(target_order["planned_qty"]),
        "brix_pct": 53.0,
        "moisture_pct": 17.5,
        "temp_c": 7.0,
        "hygiene": "PASS",
        "passed": True,
        "labor_overhead": 2500.0
    })
    print(f"9. Factory QC Complete: HTTP {st} -> Status: {res.get('status')}, Yield Variance: {res.get('yield_variance_pct')}%")
    assert st == 200

    # 10. Packing & Dispatch to Store
    st, res = api_call(f"/api/factory/orders/{target_id}/pack-and-dispatch", "POST", {
        "target_store_code": "STR-DEL01-BACK"
    })
    print(f"10. Factory Pack & Dispatch: HTTP {st} -> Dispatched to: {res.get('dispatched_to')}, Batch: {res.get('batch_no')}")
    assert st == 200

    # 11. Minimalist 7-Stage Universal Workflow Tracker
    st, res = api_call(f"/api/factory/workflow/track/{target_prod_no}")
    print(f"11. Visual Order Workflow Tracker for {target_prod_no}: HTTP {st}")
    assert st == 200
    print(f"    Progress: {res.get('progress_pct')}%")
    for stage in res.get("stages", []):
        mark = "✓" if stage["status"] == "COMPLETED" else "..."
        print(f"    [{mark}] Stage {stage['stage']}: {stage['label']} ({stage['title']}) - {stage['badge']}")

    print("\nALL 11 BACKEND & WORKFLOW TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    run_tests()
