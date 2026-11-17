import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Send,
  Wallet,
  Clock,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Search,
  RefreshCw,
  TrendingDown,
  CalendarCheck,
  Check,
  ChevronRight,
  Factory,
  Layers,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";

interface ShopManagerProps {
  activeOutlet: string;
  initialTab?: "stock" | "eod" | "otp" | "promos" | "shifts";
}

interface IndentLineItem {
  sku: string;
  name: string;
  uom: string;
  current_stock: number;
  min_par_level: number;
  deficit: number;
  qty: number;
  selling_price?: number;
}

export const ShopManager: React.FC<ShopManagerProps> = ({ activeOutlet, initialTab = "stock" }) => {
  const [data, setData] = useState<any>(null);
  const [eodAnalysis, setEodAnalysis] = useState<any>(null);
  const [tab, setTab] = useState<"stock" | "eod" | "otp" | "promos" | "shifts">(initialTab);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Requisition cart for bulk indent
  const [indentItems, setIndentItems] = useState<Record<string, IndentLineItem>>({});
  const [indentPriority, setIndentPriority] = useState<"NORMAL" | "HIGH" | "URGENT">("HIGH");
  const [stockSearch, setStockSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(true);

  // Promo form
  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState("PERCENT");
  const [promoVal, setPromoVal] = useState(15);

  // Shift close
  const [declaredCash, setDeclaredCash] = useState<Record<number, string>>({});

  // Shop Manager Shift & Remittance Handover States
  const [newShiftCashier, setNewShiftCashier] = useState("Ramesh Kumar");
  const [newShiftCounter, setNewShiftCounter] = useState("Cash Counter 1");
  const [newShiftOpeningCash, setNewShiftOpeningCash] = useState<number>(5000);
  const [remittanceMap, setRemittanceMap] = useState<
    Record<
      number,
      {
        n500: number;
        n200: number;
        n100: number;
        n50: number;
        n20: number;
        n10: number;
        coins: number;
        handover_to: string;
      }
    >
  >({});
  const [acceptingShiftId, setAcceptingShiftId] = useState<number | null>(null);
  const [nextCashierForAccept, setNextCashierForAccept] = useState("Suresh Verma");
  const [nextCounterForAccept, setNextCounterForAccept] = useState("Cash Counter 1");
  const [nextOpeningForAccept, setNextOpeningForAccept] = useState<number>(5000);
  const [shouldStartNext, setShouldStartNext] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, eodRes] = await Promise.all([
        apiFetch(`/api/pos/shop/overview?outlet_code=${activeOutlet}`),
        apiFetch(`/api/pos/shop/eod-stock-analysis?outlet_code=${activeOutlet}`),
      ]);
      setData(overviewRes);
      setEodAnalysis(eodRes);

      // Pre-seed low-stock items into indent items map
      if (eodRes?.items) {
        const initialMap: Record<string, IndentLineItem> = {};
        eodRes.items.forEach((it: any) => {
          if (it.is_low_stock && it.deficit > 0) {
            initialMap[it.sku] = {
              sku: it.sku,
              name: it.name,
              uom: it.uom,
              current_stock: it.current_stock,
              min_par_level: it.min_par_level,
              deficit: it.deficit,
              qty: Math.max(10, Math.ceil(it.recommended_reorder || it.deficit)),
              selling_price: it.selling_price,
            };
          }
        });
        setIndentItems((prev) => (Object.keys(prev).length === 0 ? initialMap : prev));
      }
    } catch (e: any) {
      console.error("Error loading shop manager data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOutlet]);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 5000);
  };

  // Adjust quantity in indent builder
  const adjustQty = (item: any, delta: number) => {
    setIndentItems((prev) => {
      const current = prev[item.sku] || {
        sku: item.sku,
        name: item.name,
        uom: item.uom,
        current_stock: item.current_stock,
        min_par_level: item.min_par_level,
        deficit: item.deficit,
        qty: 0,
        selling_price: item.selling_price,
      };
      const newQty = Math.max(0, current.qty + delta);
      if (newQty === 0) {
        const copy = { ...prev };
        delete copy[item.sku];
        return copy;
      }
      return {
        ...prev,
        [item.sku]: { ...current, qty: newQty },
      };
    });
  };

  const setExactQty = (item: any, val: number) => {
    const qty = Math.max(0, val);
    setIndentItems((prev) => {
      if (qty === 0) {
        const copy = { ...prev };
        delete copy[item.sku];
        return copy;
      }
      return {
        ...prev,
        [item.sku]: {
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          current_stock: item.current_stock,
          min_par_level: item.min_par_level,
          deficit: item.deficit,
          qty,
          selling_price: item.selling_price,
        },
      };
    });
  };

  // Submit bulk stock requisition to Factory
  const submitBulkIndent = async () => {
    const itemsToSubmit = Object.values(indentItems).filter((i) => i.qty > 0);
    if (itemsToSubmit.length === 0) {
      notify("Please select at least one item with a quantity greater than 0.");
      return;
    }

    try {
      const payload = {
        outlet_code: activeOutlet,
        priority: indentPriority,
        items: itemsToSubmit.map((i) => ({
          sku: i.sku,
          qty: i.qty,
          notes: `Deficit: ${i.deficit} ${i.uom} | Min Par: ${i.min_par_level} ${i.uom}`,
        })),
      };

      const res = await apiFetch("/api/pos/shop/indents/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      notify(
        `🚀 Successfully dispatched ${res.total_items} requisitions (${itemsToSubmit.reduce((a, b) => a + b.qty, 0)} units) to Central Factory Inbox!`
      );
      loadData();
    } catch (e: any) {
      notify(`Error submitting indent: ${e.message || "Failed"}`);
    }
  };

  // 1-Click Complete EoD Next-Day Requisition
  const submitCompleteEodRequisition = async () => {
    if (!eodAnalysis?.items) return;
    const lowItems = eodAnalysis.items.filter((i: any) => i.is_low_stock && i.deficit > 0);
    if (lowItems.length === 0) {
      notify("All store inventory levels are currently above minimum par! No replenishment needed.");
      return;
    }

    try {
      const payload = {
        outlet_code: activeOutlet,
        priority: "HIGH",
        items: lowItems.map((i: any) => ({
          sku: i.sku,
          qty: Math.max(10, Math.ceil(i.recommended_reorder || i.deficit)),
          notes: `EoD Schedule: Deficit ${i.deficit} ${i.uom} (Par ${i.min_par_level})`,
        })),
      };

      const res = await apiFetch("/api/pos/shop/indents/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      notify(
        `⚡ EoD Next-Day Requisition Released! ${res.total_items} items queued for tomorrow's production at Central Sweet Factory.`
      );
      loadData();
    } catch (e: any) {
      notify(`Error raising EoD requisition: ${e.message || "Failed"}`);
    }
  };

  const createPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/api/pos/shop/promos", {
      method: "POST",
      body: JSON.stringify({
        code: promoCode,
        name: promoName,
        rule_type: promoType,
        value: promoVal,
        min_bill: 500,
        max_cap: 400,
      }),
    });
    setPromoCode("");
    setPromoName("");
    notify("Promotional rule created & live on POS");
    loadData();
  };

  const togglePromo = async (id: number) => {
    await apiFetch(`/api/pos/shop/promos/${id}/toggle`, { method: "PATCH" });
    loadData();
  };

  const expireEod = async () => {
    const res = await apiFetch(`/api/pos/shop/expire-eod?outlet_code=${activeOutlet}`, {
      method: "POST",
    });
    notify(`EOD Cleanup: Expired ${res.expired_count} unconverted estimates`);
    loadData();
  };

  const closeShift = async (shiftId: number) => {
    const cash = Number(declaredCash[shiftId] || 0);
    await apiFetch("/api/pos/shop/shifts/close", {
      method: "POST",
      body: JSON.stringify({ shift_id: shiftId, declared_cash: cash }),
    });
    notify("Cashier shift closed with blind cash variance audit");
    loadData();
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftCashier.trim()) {
      notify("Please provide a valid cashier name");
      return;
    }
    try {
      await apiFetch("/api/pos/shop/shifts/start", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: activeOutlet,
          cashier_name: newShiftCashier.trim(),
          counter_name: newShiftCounter,
          opening_cash: Number(newShiftOpeningCash) || 0,
          started_by: "Shop Manager",
        }),
      });
      notify(`Shift started for ${newShiftCashier} at ${newShiftCounter} with float ₹${newShiftOpeningCash}`);
      loadData();
    } catch (err: any) {
      notify(`Error starting shift: ${err.message || err}`);
    }
  };

  const getRemittance = (shiftId: number) => {
    return (
      remittanceMap[shiftId] || {
        n500: 0,
        n200: 0,
        n100: 0,
        n50: 0,
        n20: 0,
        n10: 0,
        coins: 0,
        handover_to: "Suresh Verma",
      }
    );
  };

  const updateRemittanceField = (shiftId: number, field: string, val: any) => {
    const cur = getRemittance(shiftId);
    setRemittanceMap((prev) => ({
      ...prev,
      [shiftId]: {
        ...cur,
        [field]: val,
      },
    }));
  };

  const calculateRemittanceTotal = (rem: any) => {
    return (
      (Number(rem.n500) || 0) * 500 +
      (Number(rem.n200) || 0) * 200 +
      (Number(rem.n100) || 0) * 100 +
      (Number(rem.n50) || 0) * 50 +
      (Number(rem.n20) || 0) * 20 +
      (Number(rem.n10) || 0) * 10 +
      (Number(rem.coins) || 0)
    );
  };

  const handleSubmitHandover = async (shift: any) => {
    const rem = getRemittance(shift.id);
    const totalDeclared = calculateRemittanceTotal(rem);
    try {
      await apiFetch("/api/pos/shop/shifts/handover", {
        method: "POST",
        body: JSON.stringify({
          shift_id: shift.id,
          remittance_breakdown: {
            "500": Number(rem.n500) || 0,
            "200": Number(rem.n200) || 0,
            "100": Number(rem.n100) || 0,
            "50": Number(rem.n50) || 0,
            "20": Number(rem.n20) || 0,
            "10": Number(rem.n10) || 0,
            coins: Number(rem.coins) || 0,
          },
          declared_cash: totalDeclared,
          handover_to: rem.handover_to || "Next Cashier",
        }),
      });
      notify(`Shift handover submitted by ${shift.cashier_name} for ₹${totalDeclared}`);
      loadData();
    } catch (err: any) {
      notify(`Error submitting handover: ${err.message || err}`);
    }
  };

  const handleAcceptHandover = async (shift: any) => {
    try {
      await apiFetch("/api/pos/shop/shifts/accept-handover", {
        method: "POST",
        body: JSON.stringify({
          shift_id: shift.id,
          verified_by: "Shop Manager",
          start_next_shift: shouldStartNext,
          next_cashier_name: nextCashierForAccept || shift.handover_to,
          next_counter_name: nextCounterForAccept || shift.counter_name,
          next_opening_cash: Number(nextOpeningForAccept),
        }),
      });
      notify(
        shouldStartNext
          ? `Handover accepted & Shift started for ${nextCashierForAccept}`
          : `Shift handover accepted and closed.`
      );
      setAcceptingShiftId(null);
      loadData();
    } catch (err: any) {
      notify(`Error accepting handover: ${err.message || err}`);
    }
  };

  if (!data) return <div className="p-8 text-center text-slate-500">Loading Shop Manager...</div>;

  const today = new Date();
  const nearExpiryCount = (data.stock || []).filter((b: any) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return days <= 2;
  }).length;

  // Filter items for stock replenishment
  const allAnalysisItems = eodAnalysis?.items || [];
  const filteredAnalysisItems = allAnalysisItems.filter((i: any) => {
    const matchesSearch =
      i.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      i.sku.toLowerCase().includes(stockSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (onlyLowStock) return i.is_low_stock || i.current_stock <= 15;
    return true;
  });

  const totalSelectedUnits = Object.values(indentItems).reduce((sum, item) => sum + item.qty, 0);
  const totalSelectedItems = Object.values(indentItems).filter((i) => i.qty > 0).length;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Sub-navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "stock", label: `📦 Low Stock & Indents (${eodAnalysis?.low_stock_count || 0})` },
            { id: "eod", label: `🌙 EoD Next-Day Requisitions` },
            { id: "otp", label: `📱 SMS OTP Inbox (${data.sms_inbox?.length || 0})` },
            { id: "promos", label: `🏷️ Discounts (${data.promos?.length || 0})` },
            { id: "shifts", label: `💼 Shift Oversight (${data.shifts?.length || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${tab === t.id
                ? "bg-[#081F5C] dark:bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            onClick={expireEod}
            className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 transition"
          >
            Run EOD Estimate Expiry
          </button>
        </div>
      </div>

      {/* TAB 1: LOW-STOCK INDENT & REQUISITION BUILDER */}
      {tab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Table: Low-Stock Inventory & Quantity Increment/Decrement Steppers */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  Shop Low-Stock Indent Builder ({data.store_code})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect shelf stock vs par thresholds, adjust required stock units with + / - steppers, and submit bulk production orders to Central Factory.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOnlyLowStock(!onlyLowStock)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${onlyLowStock
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200"
                    }`}
                >
                  {onlyLowStock ? "Showing Low Stock (≤15 / Deficit)" : "Showing All Catalog Items"}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search items by name, SKU, or category..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Item Master / SKU</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Current Stock</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Min Par</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Deficit</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-center">Requisition Qty Stepper</th>
                    <th className="py-2.5 pl-3 font-bold uppercase text-[10px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAnalysisItems.slice(0, 40).map((it: any) => {
                    const line = indentItems[it.sku];
                    const qtyInCart = line ? line.qty : 0;
                    const isLow = it.is_low_stock || it.current_stock <= 15;

                    return (
                      <tr key={it.sku} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {it.name}
                            {isLow && (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold uppercase">
                                Low
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{it.sku}</span>
                            <span>•</span>
                            <span>{formatINR(it.selling_price || 0)}</span>
                          </div>
                        </td>

                        <td className="py-3 pr-3 text-right">
                          <span className={`font-mono font-bold ${it.current_stock <= 5 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                            {it.current_stock} {it.uom}
                          </span>
                        </td>

                        <td className="py-3 pr-3 text-right font-mono text-slate-500">
                          {it.min_par_level} {it.uom}
                        </td>

                        <td className="py-3 pr-3 text-right">
                          {it.deficit > 0 ? (
                            <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
                              -{it.deficit} {it.uom}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Quantity Stepper Controls */}
                        <td className="py-3 pr-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => adjustQty(it, -5)}
                              title="Minus 5"
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-xs"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => adjustQty(it, -1)}
                              title="Minus 1"
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={qtyInCart || ""}
                              placeholder="0"
                              onChange={(e) => setExactQty(it, Number(e.target.value))}
                              className="w-14 text-center font-mono font-bold text-xs bg-transparent border-0 focus:outline-none text-[#081F5C] dark:text-sky-300"
                            />

                            <button
                              onClick={() => adjustQty(it, 1)}
                              title="Plus 1"
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => adjustQty(it, 5)}
                              title="Plus 5"
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-xs"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        <td className="py-3 pl-3 text-right">
                          {qtyInCart > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold font-mono text-[11px] border border-blue-200 dark:border-blue-800">
                              <Check className="w-3 h-3" /> {qtyInCart} {it.uom}
                            </span>
                          ) : (
                            <button
                              onClick={() => adjustQty(it, Math.max(10, Math.ceil(it.recommended_reorder || 10)))}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 dark:text-slate-300 font-semibold text-[10px] transition"
                            >
                              + Add Par
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Requisition Dispatch Panel & Live Indent Queue */}
          <div className="lg:col-span-4 space-y-5">
            {/* Bulk Requisition Summary Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 font-extrabold text-sm text-[#081F5C] dark:text-white">
                  <Factory className="w-4 h-4 text-blue-600" />
                  Factory Requisition Queue
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-mono font-bold text-xs">
                  {totalSelectedItems} SKUs
                </span>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Requisition Production Priority
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setIndentPriority(p)}
                      className={`py-1.5 rounded-xl text-[11px] font-bold transition border ${indentPriority === p
                        ? p === "URGENT"
                          ? "bg-rose-600 text-white border-rose-600"
                          : p === "HIGH"
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.values(indentItems).filter((i) => i.qty > 0).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    No items selected yet. Click + buttons on the table to queue items for factory replenishment.
                  </div>
                ) : (
                  Object.values(indentItems)
                    .filter((i) => i.qty > 0)
                    .map((item) => (
                      <div
                        key={item.sku}
                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Stock: {item.current_stock} {item.uom} | Par: {item.min_par_level}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 dark:text-sky-300">
                            {item.qty} {item.uom}
                          </span>
                          <button
                            onClick={() => setExactQty(item, 0)}
                            className="text-slate-400 hover:text-rose-500 font-bold text-xs"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Total & Submit Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Replenishment Units:</span>
                  <span className="font-mono font-extrabold text-sm text-[#081F5C] dark:text-white">
                    {totalSelectedUnits} units
                  </span>
                </div>

                <button
                  onClick={submitBulkIndent}
                  disabled={totalSelectedItems === 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-extrabold text-xs shadow-md hover:from-blue-800 hover:to-indigo-900 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Requisition to Factory
                </button>
              </div>
            </div>

            {/* Recent Indent Orders from Shop to Factory */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#081F5C] dark:text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Shop Indent Tracking (Recent)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">{data.indents?.length || 0} orders</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(data.indents || []).slice(0, 10).map((ind: any) => (
                  <div
                    key={ind.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[#081F5C] dark:text-sky-300">
                        {ind.indent_no}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${ind.status === "FULFILLED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : ind.status === "IN_PRODUCTION"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                      >
                        {ind.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {ind.qty} {ind.uom || "units"} • {ind.sku}
                    </div>
                    {ind.batch_no && (
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        Batch Assigned: {ind.batch_no}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EOD STORE MANAGER NEXT-DAY STOCK REQUISITIONS */}
      {tab === "eod" && (
        <div className="space-y-5">
          {/* Executive EoD KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
              <div className="text-xs text-slate-500 font-semibold">Total SKUs Monitored</div>
              <div className="text-2xl font-black text-[#081F5C] dark:text-white font-mono">
                {eodAnalysis?.total_skus || 0}
              </div>
              <div className="text-[11px] text-slate-400">FEFO Active Stock Batches</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
              <div className="text-xs text-rose-600 dark:text-rose-400 font-bold">Deficit & Low-Stock SKUs</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {eodAnalysis?.low_stock_count || 0}
              </div>
              <div className="text-[11px] text-slate-400">Below Minimum Par Level</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">Recommended Production</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {Math.round(
                  (eodAnalysis?.items || []).reduce((acc: number, cur: any) => acc + (cur.recommended_reorder || 0), 0)
                )}{" "}
                units
              </div>
              <div className="text-[11px] text-slate-400">Tomorrow's Outlet Demand</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-500 font-semibold">EoD Quick Action</div>
                <div className="text-xs text-slate-400 mt-1">1-Click Auto-Replenishment</div>
              </div>
              <button
                onClick={submitCompleteEodRequisition}
                className="mt-3 w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-xs shadow-sm hover:from-amber-600 hover:to-amber-700 transition flex items-center justify-center gap-1.5"
              >
                <CalendarCheck className="w-4 h-4" />
                ⚡ Raise Complete EoD Requisition
              </button>
            </div>
          </div>

          {/* Detailed EoD Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-500" />
                  EoD Store Manager Stock Requisition Ledger ({activeOutlet})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive end-of-day shelf stock audit vs par capacity to align tomorrow's manufacturing schedule at Central Factory.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-left sticky top-0 bg-white dark:bg-slate-900">
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">SKU / Item Master</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Current Stock</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Min Par Level</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Stock Deficit</th>
                    <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Recommended Reorder</th>
                    <th className="py-2.5 pl-3 font-bold uppercase text-[10px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(eodAnalysis?.items || []).slice(0, 50).map((b: any) => {
                    const isCritical = b.current_stock === 0;
                    const isLow = b.is_low_stock;

                    return (
                      <tr key={b.sku} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{b.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{b.sku}</div>
                        </td>
                        <td className="py-3 pr-3 text-right font-mono font-bold">
                          {b.current_stock} {b.uom}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-slate-500">
                          {b.min_par_level} {b.uom}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono font-extrabold text-amber-600 dark:text-amber-400">
                          {b.deficit > 0 ? `-${b.deficit} ${b.uom}` : "0"}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono font-bold text-blue-600 dark:text-sky-300">
                          {b.recommended_reorder > 0 ? `${b.recommended_reorder} ${b.uom}` : "—"}
                        </td>
                        <td className="py-3 pl-3 text-center">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-extrabold text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> STOCK-OUT
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                              <Clock className="w-3 h-3" /> LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                              ADEQUATE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SMS OTP INBOX */}
      {tab === "otp" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
            Manager Authorisation SMS / OTP Inbox
          </h3>
          <p className="text-xs text-slate-500">
            Real-time audit log of OTP tokens dispatched to store managers for manual discounts, bill voids, and price overrides.
          </p>
          <div className="space-y-2.5">
            {(data.sms_inbox || []).map((s: any) => (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{s.message}</div>
                  <div className="text-[11px] text-slate-400">
                    To: {s.mobile_no} • Staff: {s.staff_id} • Time: {new Date(s.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-sm text-[#081F5C] dark:text-sky-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {s.otp_code}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">Valid for 5 mins</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DISCOUNTS & PROMOTIONS */}
      {tab === "promos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={createPromo}
            className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3"
          >
            <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
              Create Promotional Discount Rule
            </h3>
            <input
              placeholder="Promo Code (e.g. DIWALI20)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs"
              required
            />
            <input
              placeholder="Promotion Name / Title"
              value={promoName}
              onChange={(e) => setPromoName(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
              <input
                type="number"
                value={promoVal}
                onChange={(e) => setPromoVal(Number(e.target.value))}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 text-white text-xs font-bold hover:bg-blue-900 transition"
            >
              Publish Rule to POS
            </button>
          </form>

          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white mb-3">
              Active & Scheduled Discount Rules
            </h3>
            <div className="space-y-2.5">
              {(data.promos || []).map((p: any) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-blue-600 dark:text-sky-400">{p.code}</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.rule_type === "PERCENT" ? `${p.value}% Off` : `Flat ₹${p.value} Off`} • Min Bill {formatINR(p.min_bill)} • Max Cap {formatINR(p.max_cap)}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePromo(p.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                  >
                    {p.active ? "ACTIVE" : "PAUSED"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: POS SHIFT OVERSIGHT, FLOAT DEFINITION & CASHIER HANDOVER */}
      {tab === "shifts" && (
        <div className="space-y-6">
          {/* Section 1: Shop Manager Drawer Float & Shift Start Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Shop Manager Shift Dispatch & Cash Drawer Float Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define opening cash float in drawer for incoming cashiers everyday, authorize drawers, and initiate shifts.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs">
                Outlet: {activeOutlet}
              </span>
            </div>

            <form onSubmit={handleStartShift} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Cashier
                </label>
                <input
                  type="text"
                  value={newShiftCashier}
                  onChange={(e) => setNewShiftCashier(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cash Counter
                </label>
                <select
                  value={newShiftCounter}
                  onChange={(e) => setNewShiftCounter(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="Cash Counter 1">Cash Counter 1 (Main Sweets Desk)</option>
                  <option value="Cash Counter 2">Cash Counter 2 (Namkeen & Bakery)</option>
                  <option value="Express Cashier">Express Cashier (Fast Pay)</option>
                  <option value="Banquet & Bulk Cash Desk">Banquet & Bulk Cash Desk</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Opening Cash Float in Drawer (₹)
                </label>
                <div className="space-y-1.5">
                  <input
                    type="number"
                    value={newShiftOpeningCash}
                    onChange={(e) => setNewShiftOpeningCash(Number(e.target.value))}
                    min="0"
                    step="100"
                    required
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-emerald-600 text-sm"
                  />
                  <div className="flex gap-1.5">
                    {[2000, 3000, 5000, 10000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setNewShiftOpeningCash(preset)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${newShiftOpeningCash === preset
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                      >
                        ₹{preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Start Shift & Assign Float
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Active Shifts & Cashier Remittance Handover */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Live Cashier Shifts & Drawer Remittance Handovers ({(data.shifts || []).length})
            </h4>

            {(data.shifts || []).length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-xs">
                No shift records found for {activeOutlet}. Start a shift above to allocate drawer cash.
              </div>
            ) : (
              (data.shifts || []).map((sh: any) => {
                const rem = getRemittance(sh.id);
                const countedTotal = calculateRemittanceTotal(rem);
                const openingCash = Number(sh.opening_cash) || 0;
                const systemCashSales = Number(sh.system_cash_sales) || 0;
                const expectedCash = openingCash + systemCashSales;
                const liveVariance = countedTotal - expectedCash;
                const isMatch = Math.abs(liveVariance) < 0.01;

                return (
                  <div
                    key={sh.id}
                    className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4 transition ${sh.status === "OPEN"
                      ? "border-blue-300 dark:border-blue-900/60 ring-2 ring-blue-100 dark:ring-blue-950/40"
                      : sh.status === "HANDOVER_PENDING"
                        ? "border-amber-300 dark:border-amber-900/60 ring-2 ring-amber-100 dark:ring-amber-950/40 bg-amber-50/10"
                        : "border-slate-200 dark:border-slate-800 opacity-90"
                      }`}
                  >
                    {/* Shift Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#081F5C] dark:text-sky-400 text-sm">
                            {sh.shift_no}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${sh.status === "OPEN"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : sh.status === "HANDOVER_PENDING"
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                          >
                            {sh.status === "OPEN"
                              ? "● ACTIVE ON DUTY"
                              : sh.status === "HANDOVER_PENDING"
                                ? "⏳ HANDOVER SUBMITTED — AWAITING SHOP MANAGER"
                                : "✓ CLOSED & RECONCILED"}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                            {sh.counter_name || "Cash Counter 1"}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 mt-1">
                          Cashier: <b className="text-slate-900 dark:text-white">{sh.cashier_name}</b> •
                          Started by: <b>{sh.started_by || "Shop Manager"}</b> • Opened:{" "}
                          {new Date(sh.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      {/* Financial Strip */}
                      <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="text-center px-2">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Opening Float</div>
                          <div className="font-mono font-bold text-emerald-600">{formatINR(openingCash)}</div>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center px-2">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">System Cash Sales</div>
                          <div className="font-mono font-bold text-blue-600">{formatINR(systemCashSales)}</div>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center px-2">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Expected in Drawer</div>
                          <div className="font-mono font-extrabold text-[#081F5C] dark:text-sky-300">
                            {formatINR(expectedCash)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OPEN SHIFT: CASHIER REMITTANCE BREAKDOWN FORM */}
                    {sh.status === "OPEN" && (
                      <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-xs text-[#081F5C] dark:text-white flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-blue-600" />
                            Cashier Shift Handover — Remittance Breakdown (Notes & Coins)
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            Example: 500 × 10, 200 × 2, Coins 1 × 10, 2 × 100
                          </span>
                        </div>

                        {/* Denominations Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                          {[
                            { label: "₹500", key: "n500", mult: 500 },
                            { label: "₹200", key: "n200", mult: 200 },
                            { label: "₹100", key: "n100", mult: 100 },
                            { label: "₹50", key: "n50", mult: 50 },
                            { label: "₹20", key: "n20", mult: 20 },
                            { label: "₹10", key: "n10", mult: 10 },
                          ].map((denom) => {
                            const count = (rem as any)[denom.key] || 0;
                            return (
                              <div
                                key={denom.key}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1"
                              >
                                <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  <span>{denom.label}</span>
                                  <span className="font-mono text-emerald-600">
                                    ₹{(count * denom.mult).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-slate-400 font-bold">×</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={(rem as any)[denom.key] || ""}
                                    onChange={(e) =>
                                      updateRemittanceField(sh.id, denom.key, Math.max(0, parseInt(e.target.value) || 0))
                                    }
                                    placeholder="0"
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-900 text-xs"
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* Coins Total */}
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              <span>Coins ₹</span>
                              <span className="font-mono text-emerald-600">
                                ₹{Number(rem.coins || 0).toLocaleString()}
                              </span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={rem.coins || ""}
                              onChange={(e) =>
                                updateRemittanceField(sh.id, "coins", Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              placeholder="₹ Coins"
                              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-900 text-xs"
                            />
                          </div>
                        </div>

                        {/* Live Total & Handover Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-3">
                            <div className="text-xs">
                              <span className="text-slate-500 font-bold">Counted Physical Cash: </span>
                              <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                                {formatINR(countedTotal)}
                              </span>
                            </div>

                            {/* Match Indicator */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${isMatch
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : liveVariance < 0
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                            >
                              {isMatch ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Cash Matches Drawer Exactly (₹0 Variance)
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Variance: {liveVariance > 0 ? `+${formatINR(liveVariance)} (Excess)` : `${formatINR(liveVariance)} (Shortage)`}
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={rem.handover_to || ""}
                              onChange={(e) => updateRemittanceField(sh.id, "handover_to", e.target.value)}
                              placeholder="Handover to (Cashier / Safe)"
                              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900 font-semibold"
                            />
                            <button
                              onClick={() => handleSubmitHandover(sh)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" /> Submit Cashier Shift Handover
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HANDOVER PENDING: SHOP MANAGER VERIFY & LAUNCH NEXT SHIFT */}
                    {sh.status === "HANDOVER_PENDING" && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h5 className="font-extrabold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                              <CalendarCheck className="w-4 h-4 text-amber-600" />
                              Handover Awaiting Shop Manager Acceptance: {sh.cashier_name} ➔ {sh.handover_to}
                            </h5>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                              Declared Cash: <b>{formatINR(sh.declared_cash)}</b> • Variance:{" "}
                              <b className={Number(sh.variance) < 0 ? "text-rose-600" : "text-emerald-700"}>
                                {formatINR(sh.variance)}
                              </b>
                            </p>
                          </div>

                          {/* Breakdown chips */}
                          {sh.remittance_breakdown && (
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {Object.entries(sh.remittance_breakdown).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-mono font-bold"
                                >
                                  {k === "coins" ? `Coins: ₹${v}` : `₹${k} × ${v}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Shop Manager Handover Decision Box */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 space-y-3 text-xs">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`start-next-${sh.id}`}
                              checked={shouldStartNext}
                              onChange={(e) => setShouldStartNext(e.target.checked)}
                              className="w-4 h-4 text-[#081F5C] rounded"
                            />
                            <label
                              htmlFor={`start-next-${sh.id}`}
                              className="font-bold text-slate-800 dark:text-slate-200"
                            >
                              Automatically start the shift of the next incoming cashier ({sh.handover_to || "Next Cashier"})
                            </label>
                          </div>

                          {shouldStartNext && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                  Next Cashier Name
                                </label>
                                <input
                                  type="text"
                                  value={nextCashierForAccept}
                                  onChange={(e) => setNextCashierForAccept(e.target.value)}
                                  placeholder={sh.handover_to || "e.g. Suresh Verma"}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                  Assigned Cash Counter
                                </label>
                                <input
                                  type="text"
                                  value={nextCounterForAccept}
                                  onChange={(e) => setNextCounterForAccept(e.target.value)}
                                  placeholder={sh.counter_name || "Cash Counter 1"}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                  Next Opening Cash Float (₹)
                                </label>
                                <input
                                  type="number"
                                  value={nextOpeningForAccept}
                                  onChange={(e) => setNextOpeningForAccept(Number(e.target.value))}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-emerald-600"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleAcceptHandover(sh)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {shouldStartNext
                                ? "Accept Handover & Start Next Cashier Shift"
                                : "Accept Handover & End Shift"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CLOSED SHIFT AUDIT TRAIL */}
                    {sh.status === "CLOSED" && (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-slate-600 dark:text-slate-400">
                            Verified by: <b className="text-slate-900 dark:text-white">{sh.verified_by || "Shop Manager"}</b> •
                            Closed at: {sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : "End of Shift"}
                          </div>
                          {sh.handover_to && (
                            <div className="text-[11px] text-slate-500">
                              Handed over to: <b>{sh.handover_to}</b>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {sh.remittance_breakdown && (
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {Object.entries(sh.remittance_breakdown).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono"
                                >
                                  {k === "coins" ? `Coins: ₹${v}` : `₹${k}×${v}`}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="text-right">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              Declared: {formatINR(sh.declared_cash)}
                            </div>
                            <div
                              className={`text-[11px] font-bold ${Number(sh.variance) < 0
                                ? "text-rose-600"
                                : Number(sh.variance) > 0
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                                }`}
                            >
                              Variance: {formatINR(sh.variance)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
