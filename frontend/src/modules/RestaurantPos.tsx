import React, { useEffect, useState } from "react";
import {
  UtensilsCrossed,
  CreditCard,
  Box,
  AlertTriangle,
  ArchiveRestore,
  Plus,
  Trash2,
  Printer,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, Outlet } from "../types";
import { kickCashDrawer, print40ColumnThermalSlip } from "../utils/posHardware";
import { ThermalSlip } from "../components/ThermalSlip";
import { LowStockBanner } from "../components/LowStockBanner";
import { CashierEodReport } from "../components/CashierEodReport";

interface RestaurantPosProps {
  activeOutlet: string;
  outlets: Outlet[];
  actorName?: string;
}

export const RestaurantPos: React.FC<RestaurantPosProps> = ({
  activeOutlet,
  outlets,
  actorName = "Restaurant Cashier",
}) => {
  const restOutlet = activeOutlet === "DEL01" || activeOutlet === "MFG01" ? "GUR02" : activeOutlet;
  const outletObj = outlets.find((o) => o.code === restOutlet);

  const [tab, setTab] = useState<"tables" | "takeaway" | "stock" | "eod">("tables");
  const [tables, setTables] = useState<any[]>([]);
  const [kots, setKots] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<ItemSku[]>([]);
  const [kitchenStock, setKitchenStock] = useState<any[]>([]);
  const [hwConfig, setHwConfig] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [payMode, setPayMode] = useState<"UPI" | "Cash" | "Credit Card" | "Food Coupon">("UPI");
  const [takeawayCart, setTakeawayCart] = useState<any[]>([]);
  const [lastBill, setLastBill] = useState<any>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    const [tbls, kList, catalog, batches, configs] = await Promise.all([
      apiFetch<any[]>(`/api/kot/tables?outlet_code=${restOutlet}`),
      apiFetch<any[]>(`/api/kot/kots?outlet_code=${restOutlet}`),
      apiFetch<ItemSku[]>("/api/admin/items"),
      apiFetch<any[]>(`/api/stores/batches?store_code=STR-${restOutlet}-BACK`),
      apiFetch<any[]>("/api/admin/config"),
    ]);
    setTables(tbls);
    setKots(kList);
    setMenuItems(catalog.filter((i) => i.category === "FG-Rest" || i.sku === "FG-GULAB-01"));
    setKitchenStock(batches);
    const hw = configs.find((c) => c.config_key === "pos_hardware_drivers")?.config_value;
    if (hw) setHwConfig(hw);
  };

  useEffect(() => {
    load();
  }, [restOutlet]);

  const handleDrawerKick = async (reason = "Restaurant POS Drawer Kick [F8]") => {
    try {
      const driver =
        hwConfig?.restaurant_printer?.driver ||
        hwConfig?.active_printer_driver ||
        "Star Micronics TSP143III";
      const res = await kickCashDrawer({
        driver,
        pin: hwConfig?.cash_drawer?.kick_pin || "Pin 2 (RJ11 via Printer)",
        outletCode: restOutlet,
        actor: actorName,
        reason,
      });
      notify(true, res.message);
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const settleSelectedTable = async () => {
    if (!selectedTable) return;
    try {
      const res = await apiFetch("/api/kot/tables/settle", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: restOutlet,
          table_code: selectedTable,
          payment_mode: payMode,
          cashier_id: actorName,
        }),
      });
      if (hwConfig?.cash_drawer?.enabled !== false) {
        handleDrawerKick(`Table Settle (${res.invoice_no} • ${payMode})`);
      }
      const settledKots = kots.filter(
        (k) => k.table_code === selectedTable && (k.status === "ACTIVE" || k.status === "READY")
      );
      const items = settledKots.flatMap((k) =>
        (k.items || []).map((it: any) => ({
          name: it.name,
          qty: it.qty,
          uom: "pcs",
          unit_price: it.unit_price,
          line_total: Number(it.qty) * Number(it.unit_price),
        }))
      );
      const subtotal = items.reduce((s, i) => s + i.line_total, 0);
      const billObj = {
        invoice_no: res.invoice_no,
        estimate_no: res.invoice_no,
        outlet_code: restOutlet,
        status: "DELIVERED_CLOSED",
        items,
        subtotal,
        discount_amount: 0,
        cgst: Number((subtotal * 0.025).toFixed(2)),
        sgst: Number((subtotal * 0.025).toFixed(2)),
        grand_total: res.grand_total,
        payment_splits: [{ mode: payMode, amount: res.grand_total, ref: res.invoice_no }],
      };
      setLastBill(billObj);
      print40ColumnThermalSlip(billObj, outletObj, hwConfig?.restaurant_printer?.driver);
      notify(true, `Table ${selectedTable} settled! Invoice ${res.invoice_no} (${formatINR(res.grand_total)})`);
      setSelectedTable("");
      load();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const billTakeaway = async () => {
    if (takeawayCart.length === 0) return;
    try {
      const est = await apiFetch("/api/pos/estimates", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: restOutlet,
          mode: "DIRECT",
          items: takeawayCart,
          estimate_staff: actorName,
        }),
      });
      const paid = await apiFetch(`/api/pos/orders/${est.estimate_no}/pay`, {
        method: "POST",
        body: JSON.stringify({
          payment_splits: [{ mode: payMode, amount: est.grand_total, ref: `REST-${payMode}` }],
          cashier_id: actorName,
        }),
      });
      if (hwConfig?.cash_drawer?.enabled !== false) {
        handleDrawerKick(`Restaurant Takeaway (${paid.invoice_no} • ${payMode})`);
      }
      setLastBill(paid);
      print40ColumnThermalSlip(paid, outletObj, hwConfig?.restaurant_printer?.driver);
      setTakeawayCart([]);
      notify(true, `Takeaway Bill ${paid.invoice_no} paid (${formatINR(paid.grand_total)})!`);
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  // Hotkeys for Restaurant POS
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "F1") {
        e.preventDefault();
        setTab("tables");
      } else if (e.key === "F2") {
        e.preventDefault();
        setTab("takeaway");
      } else if (e.key === "F3") {
        e.preventDefault();
        setTab("stock");
      } else if (e.key === "F5") {
        e.preventDefault();
        if (tab === "tables" && selectedTable) settleSelectedTable();
        else if (tab === "takeaway" && takeawayCart.length > 0) billTakeaway();
      } else if (e.key === "F8") {
        e.preventDefault();
        handleDrawerKick("Restaurant POS Hotkey [F8]");
      } else if (e.key === "F9") {
        e.preventDefault();
        if (lastBill) print40ColumnThermalSlip(lastBill, outletObj, hwConfig?.restaurant_printer?.driver);
        else window.print();
      } else if (e.key === "F10") {
        e.preventDefault();
        setTab("eod");
      } else if (!typing && tab === "takeaway" && /^[1-9]$/.test(e.key)) {
        const m = menuItems[Number(e.key) - 1];
        if (m) {
          e.preventDefault();
          setTakeawayCart((prev) => [
            ...prev,
            {
              sku: m.sku,
              name: m.name,
              qty: 1,
              uom: "pcs",
              unit_price: Number(m.selling_price),
              gst_pct: Number(m.gst_pct),
              line_total: Number(m.selling_price),
            },
          ]);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tab, selectedTable, takeawayCart, menuItems, payMode, restOutlet]);

  const activeKotsForTable = kots.filter(
    (k) => k.table_code === selectedTable && (k.status === "ACTIVE" || k.status === "READY")
  );
  const tableTotal = activeKotsForTable.reduce((s, k) => s + Number(k.total_amount || 0), 0);

  const today = new Date();
  const restAlerts = kitchenStock.filter((b) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return days <= 3 || Number(b.qty) <= 25;
  });

  const restBannerAlerts = restAlerts.map((b) => ({
    id: b.id,
    sku: b.sku,
    item_name: b.item_name,
    qty: Number(b.qty),
    uom: b.uom,
    expiry_date: b.expiry_date,
    kind: (Number(b.qty) <= 25 ? "LOW_STOCK" : "NEAR_EXPIRY") as "LOW_STOCK" | "NEAR_EXPIRY",
  }));

  return (
    <div className="space-y-4">
      <LowStockBanner
        outletCode={restOutlet}
        alerts={restBannerAlerts}
        title="Restaurant Kitchen Low Stock & Expiry Alert"
        onViewStock={() => setTab("stock")}
      />

      {toast && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Restaurant POS Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("tables")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              tab === "tables" ? "bg-annavya-navy text-white shadow" : "bg-slate-100 text-slate-700"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Dine-In Table Billing ({restOutlet})</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F1</kbd>
          </button>
          <button
            onClick={() => setTab("takeaway")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              tab === "takeaway" ? "bg-annavya-royal text-white shadow" : "bg-slate-100 text-slate-700"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Quick Takeaway Touch POS</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F2</kbd>
          </button>
          <button
            onClick={() => setTab("stock")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              tab === "stock"
                ? "bg-amber-600 text-white shadow"
                : "bg-amber-50 border border-amber-200 text-amber-900"
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Restaurant Stock ({restAlerts.length})</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F3</kbd>
          </button>
          <button
            onClick={() => setTab("eod")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              tab === "eod"
                ? "bg-indigo-700 text-white shadow"
                : "bg-indigo-50 border border-indigo-200 text-indigo-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>EoD Reports</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F10</kbd>
          </button>
        </div>

        <button
          onClick={() => handleDrawerKick()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold hover:bg-slate-800"
        >
          <ArchiveRestore className="w-4 h-4" />
          <span>Open Cash Drawer</span>
          <kbd className="px-1 rounded bg-white/15 text-[10px] font-mono">F8</kbd>
        </button>
      </div>

      {/* TAB 1: DINE-IN TABLE SETTLEMENT */}
      {tab === "tables" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-annavya-navy mb-3">
                Select Running Table ({restOutlet})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {tables.map((t) => {
                  const hasKot = t.status === "KOT Running" || t.status === "Bill Printed";
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(t.table_code)}
                      className={`p-4 rounded-2xl border-2 text-left transition ${
                        selectedTable === t.table_code
                          ? "border-annavya-royal ring-2 ring-annavya-sky bg-annavya-ice/50"
                          : hasKot
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-slate-50 opacity-70"
                      }`}
                    >
                      <div className="font-mono font-extrabold text-sm">{t.table_code}</div>
                      <div className="text-[11px] text-slate-600">{t.section}</div>
                      <div className="text-[11px] font-bold mt-1.5">{t.status}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-annavya-navy mb-3">
                  Table Settlement {selectedTable ? `— ${selectedTable}` : ""}
                </h3>
                {!selectedTable || activeKotsForTable.length === 0 ? (
                  <div className="text-xs text-slate-400 py-10 text-center bg-slate-50 rounded-xl">
                    Select an active table with running KOTs to settle bill
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {activeKotsForTable.map((k) => (
                      <div key={k.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="font-mono font-bold text-annavya-royal">{k.kot_no}</div>
                        {(k.items || []).map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between mt-1">
                            <span>{it.qty}× {it.name}</span>
                            <span className="font-semibold">{formatINR(it.qty * it.unit_price)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedTable && activeKotsForTable.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-200 space-y-3">
                  <div className="flex justify-between text-sm font-extrabold text-annavya-navy">
                    <span>Total (incl. 5% GST)</span>
                    <span>{formatINR(tableTotal * 1.05)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["UPI", "Cash", "Credit Card", "Food Coupon"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPayMode(m)}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border ${
                          payMode === m ? "bg-annavya-navy text-white border-annavya-navy" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {payMode === "UPI" && (
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-purple-900">Dynamic UPI:</span>
                        <span className="font-mono text-purple-700">bikanervala@icici</span>
                      </div>
                      <span className="text-[10px] text-purple-600 font-bold">Soundbox Ready</span>
                    </div>
                  )}
                  {payMode === "Credit Card" && (
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-blue-900">EDC Terminal:</span>
                        <span className="font-mono text-blue-700">PineLabs Plutus Cloud (TID: 88412)</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold">LAN 8082</span>
                    </div>
                  )}
                  {payMode === "Food Coupon" && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-amber-900">Meal Voucher:</span>
                        <span className="text-amber-800">Sodexo / Pluxee / Edenred</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">100% Tax Exempt Food</span>
                    </div>
                  )}
                  <button
                    onClick={settleSelectedTable}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <span>Settle Table & Deduct Kitchen Stock</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">F5</kbd>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Printer className="w-3.5 h-3.5 text-annavya-royal" />
                {hwConfig?.restaurant_printer?.driver || "Star Micronics TSP143III"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">80mm Ready</span>
            </div>
            {lastBill ? (
              <ThermalSlip order={lastBill} outlet={outletObj} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                Settle a table or takeaway bill to preview the Restaurant GST Invoice
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUICK TAKEAWAY TOUCH POS */}
      {tab === "takeaway" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-annavya-navy mb-3">
              Restaurant Takeaway Touch Menu (Keys 1–9)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map((m, idx) => (
                <button
                  key={m.sku}
                  onClick={() =>
                    setTakeawayCart((prev) => [
                      ...prev,
                      {
                        sku: m.sku,
                        name: m.name,
                        qty: 1,
                        uom: "pcs",
                        unit_price: Number(m.selling_price),
                        gst_pct: Number(m.gst_pct),
                        line_total: Number(m.selling_price),
                      },
                    ])
                  }
                  className="p-4 rounded-2xl border border-slate-200 hover:border-annavya-royal hover:bg-annavya-ice/40 text-left transition"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {m.kitchen_station || "Kitchen"}
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-annavya-navy text-white text-[10px] font-mono font-bold">
                      {idx + 1}
                    </kbd>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 mt-1.5">{m.name}</div>
                  <div className="font-extrabold text-annavya-navy text-xs mt-2 flex justify-between">
                    <span>{formatINR(m.selling_price)}</span>
                    <Plus className="w-4 h-4 text-annavya-royal" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-annavya-navy mb-3">Takeaway Parcel Bill</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {takeawayCart.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-semibold">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatINR(c.line_total)}</span>
                      <button onClick={() => setTakeawayCart(takeawayCart.filter((_, i) => i !== idx))} className="text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {takeawayCart.length === 0 && (
                  <div className="text-xs text-slate-400 py-10 text-center">Tap menu tiles or press 1–9</div>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["UPI", "Cash", "Credit Card", "Food Coupon"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMode(m)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border ${
                      payMode === m ? "bg-annavya-navy text-white border-annavya-navy" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {payMode === "UPI" && (
                <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-[11px] flex items-center justify-between">
                  <span className="font-extrabold text-purple-900">Dynamic UPI: bikanervala@icici</span>
                  <span className="text-[10px] text-purple-600 font-bold">Soundbox Ready</span>
                </div>
              )}
              {payMode === "Credit Card" && (
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] flex items-center justify-between">
                  <span className="font-extrabold text-blue-900">PineLabs Plutus Cloud (TID: 88412)</span>
                  <span className="text-[10px] text-blue-600 font-bold">LAN Ready</span>
                </div>
              )}
              {payMode === "Food Coupon" && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] flex items-center justify-between">
                  <span className="font-extrabold text-amber-900">Sodexo / Pluxee / Edenred</span>
                  <span className="text-[10px] text-emerald-700 font-bold">100% Tax Exempt Food</span>
                </div>
              )}
              <button
                disabled={takeawayCart.length === 0}
                onClick={billTakeaway}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <span>Pay & Print Takeaway Bill</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">F5</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESTAURANT STOCK & ALERTS */}
      {tab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Restaurant Kitchen Alerts ({restOutlet})
            </h3>
            {restAlerts.map((b) => (
              <div key={b.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <div className="font-bold text-amber-900">{b.item_name}</div>
                <div className="text-[11px] text-amber-800">
                  Batch {b.batch_no} • {b.qty} {b.uom} • Exp: {b.expiry_date}
                </div>
              </div>
            ))}
            {restAlerts.length === 0 && (
              <div className="text-xs text-slate-400 py-8 text-center">No kitchen stock alerts</div>
            )}
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-annavya-navy mb-3">
              Restaurant Store Inventory (STR-{restOutlet}-BACK)
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-2">Ingredient / Sweet</th>
                  <th>Category</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kitchenStock.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 font-semibold">{b.item_name}</td>
                    <td>{b.category}</td>
                    <td className="font-mono text-[11px]">{b.batch_no}</td>
                    <td className="font-bold">{b.qty} {b.uom}</td>
                    <td>{b.expiry_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RESTAURANT CASHIER EoD REPORTS */}
      {tab === "eod" && (
        <CashierEodReport
          outletCode={restOutlet}
          outlet={outletObj}
          actorName={actorName}
        />
      )}

      {/* Hotkey Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-annavya-navy">
          <Keyboard className="w-4 h-4 text-annavya-royal" />
          Restaurant POS Hotkeys:
        </div>
        <div className="flex flex-wrap gap-3 text-slate-600">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F1</kbd> Tables</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F2</kbd> Takeaway</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F3</kbd> Kitchen Stock</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F5</kbd> Settle/Pay</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F8</kbd> Cash Drawer</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F9</kbd> Print</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">1–9</kbd> Quick Dish</span>
        </div>
      </div>
    </div>
  );
};

