import React, { useEffect, useState, useMemo } from "react";
import {
  UtensilsCrossed,
  Users,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Coffee,
  Check,
  ChevronRight,
  Flame,
  User,
  Phone,
  FileText,
  RefreshCw,
  ShoppingBag,
  ChefHat,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  ArrowLeft,
  Printer,
  X,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, Outlet } from "../types";
import { UpiQrCode } from "../components/UpiQrCode";
import { print40ColumnThermalSlip } from "../utils/posHardware";
import { WhatsAppDispatchModal } from "../components/WhatsAppDispatchModal";
import { cleanIndianMobile } from "../utils/whatsappHelper";

interface RestaurantOrderTakingProps {
  activeOutlet: string;
  outlets: Outlet[];
  actorName?: string;
}

interface CartLine {
  sku: string;
  name: string;
  qty: number;
  unit_price: number;
  station: string;
  modifiers: string;
  course: string;
}

export const RestaurantOrderTaking: React.FC<RestaurantOrderTakingProps> = ({
  activeOutlet,
  outlets,
  actorName = "Captain / Waiter",
}) => {
  const restOutlet = activeOutlet === "MFG01" ? "DEL01" : activeOutlet;
  const outletObj = outlets.find((o) => o.code === restOutlet);

  const [orderTakingTab, setOrderTakingTab] = useState<"entry" | "kds_progress">("entry");
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<ItemSku[]>([]);
  const [activeKots, setActiveKots] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("T-01");
  const [tableMode, setTableMode] = useState<"running_bill" | "add_items">("running_bill");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pax, setPax] = useState<number>(2);
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleMode, setSettleMode] = useState<"UPI" | "Card" | "Cash">("UPI");
  const [settleRef, setSettleRef] = useState<string>("");
  const [settleDiscount, setSettleDiscount] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [settlingLoading, setSettlingLoading] = useState(false);
  const [settleMobile, setSettleMobile] = useState<string>("");
  const [settleCustomerName, setSettleCustomerName] = useState<string>("");
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppModalMode, setWhatsAppModalMode] = useState<"PROFORMA_UPI" | "TAX_INVOICE">("PROFORMA_UPI");
  const [whatsAppOrderData, setWhatsAppOrderData] = useState<any>(null);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tbls, items, kots] = await Promise.all([
        apiFetch<any[]>(`/api/kot/tables?outlet_code=${restOutlet}`),
        apiFetch<ItemSku[]>("/api/admin/items"),
        apiFetch<any[]>(`/api/kot/kots?outlet_code=${restOutlet}`),
      ]);
      setTables(tbls);

      // Load both Restaurant food items and Sweet Counter items (Jalebi, Rasgulla, Mithai)
      setMenuItems(
        items.filter((i) => i.category === "FG-Rest" || i.category === "FG-Sweet")
      );

      const activeList = kots.filter((k) =>
        ["ACTIVE", "FIRED", "QUEUED", "COOKING", "PREPARING", "READY", "SERVED"].includes(
          (k.status || "").toUpperCase()
        )
      );
      setActiveKots(activeList);

      // If current selectedTable doesn't exist in loaded tables, select first
      if (tbls.length > 0 && !tbls.some((t) => t.table_code === selectedTable)) {
        setSelectedTable(tbls[0].table_code);
      }
    } catch (e: any) {
      notify(false, "Failed to load table & menu data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3500);
    return () => clearInterval(timer);
  }, [restOutlet]);

  // Distinct Sections from Tables
  const sections = useMemo(() => {
    const s = new Set<string>();
    tables.forEach((t) => {
      if (t.section) s.add(t.section);
    });
    return ["ALL", ...Array.from(s)];
  }, [tables]);

  // Distinct Categories from Menu (including Sweets)
  const categories = useMemo(() => {
    const c = new Set<string>();
    menuItems.forEach((m) => {
      if (m.sub_category) c.add(m.sub_category);
      else if (m.category === "FG-Sweet") c.add("Sweets & Mithai");
    });
    return ["ALL", ...Array.from(c)];
  }, [menuItems]);

  const filteredTables = useMemo(() => {
    if (selectedSection === "ALL") return tables;
    return tables.filter((t) => t.section === selectedSection);
  }, [tables, selectedSection]);

  const filteredMenu = useMemo(() => {
    let list = menuItems;
    if (selectedCategory !== "ALL") {
      if (selectedCategory === "Sweets & Mithai") {
        list = list.filter((m) => m.category === "FG-Sweet");
      } else {
        list = list.filter((m) => m.sub_category === selectedCategory);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          (m.kitchen_station && m.kitchen_station.toLowerCase().includes(q))
      );
    }
    return list;
  }, [menuItems, selectedCategory, searchQuery]);

  const currentTableObj = tables.find((t) => t.table_code === selectedTable);
  const tableKots = activeKots.filter((k) => k.table_code === selectedTable);
  const hasRunningKots =
    tableKots.length > 0 ||
    (currentTableObj &&
      (currentTableObj.status === "KOT Running" ||
        currentTableObj.status === "Bill Printed" ||
        currentTableObj.status === "Occupied"));

  // Aggregate all ordered line items across all active KOTs for this table
  const existingTableItems = useMemo(() => {
    const list: any[] = [];
    tableKots.forEach((k) => {
      const its = k.items || [];
      const itemsArr = Array.isArray(its) ? its : [];
      itemsArr.forEach((it: any, idx: number) => {
        list.push({
          ...it,
          kot_no: k.kot_no,
          kot_id: k.id,
          line_id: `${k.id}-${idx}`,
        });
      });
    });
    return list;
  }, [tableKots]);

  const runningSubtotal = existingTableItems.reduce(
    (sum, it) => sum + Number(it.qty || 1) * Number(it.unit_price || 0),
    0
  );
  const runningCgst = Number((runningSubtotal * 0.025).toFixed(2));
  const runningSgst = Number((runningSubtotal * 0.025).toFixed(2));
  const runningGrandTotal = Number(
    (runningSubtotal + runningCgst + runningSgst - Number(settleDiscount || 0)).toFixed(2)
  );

  const handleSelectTable = (tblCode: string) => {
    setSelectedTable(tblCode);
    const tbl = tables.find((t) => t.table_code === tblCode);
    if (tbl && tbl.current_pax > 0) setPax(tbl.current_pax);

    const isRunning =
      activeKots.some((k) => k.table_code === tblCode) ||
      (tbl &&
        (tbl.status === "KOT Running" ||
          tbl.status === "Bill Printed" ||
          tbl.status === "Occupied"));

    // If table has running order, automatically show Proforma & Running items!
    setTableMode(isRunning ? "running_bill" : "add_items");
  };

  const addToCart = (item: ItemSku) => {
    const isSweet =
      item.category === "FG-Sweet" ||
      (item.sub_category &&
        (item.sub_category.toLowerCase().includes("sweet") ||
          item.sub_category.toLowerCase().includes("mithai") ||
          item.sub_category.toLowerCase().includes("laddu") ||
          item.sub_category.toLowerCase().includes("ghee")));

    const station = isSweet ? "Sweet Counter" : item.kitchen_station || "Main Kitchen";

    setCart((prev) => {
      const existing = prev.find((c) => c.sku === item.sku);
      if (existing) {
        return prev.map((c) =>
          c.sku === item.sku ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          sku: item.sku,
          name: item.name,
          qty: 1,
          unit_price: Number(item.selling_price),
          station,
          modifiers: isSweet ? "Sweet Counter Dispatch" : "",
          course: isSweet ? "Dessert" : "Main",
        },
      ];
    });

    // If in running bill mode, automatically open add items view so waiter sees what they picked
    if (tableMode === "running_bill") {
      setTableMode("add_items");
    }
  };

  const updateCartQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.sku !== sku) return c;
          const nextQty = c.qty + delta;
          return nextQty > 0 ? { ...c, qty: nextQty } : null;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const updateCartModifier = (sku: string, mod: string) => {
    setCart((prev) =>
      prev.map((c) => (c.sku === sku ? { ...c, modifiers: mod } : c))
    );
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const cartGst = Number((cartSubtotal * 0.05).toFixed(2));
  const cartTotal = cartSubtotal + cartGst;

  const handleFireTableOrder = async () => {
    if (!selectedTable) {
      notify(false, "Please select a dining table first");
      return;
    }
    if (cart.length === 0) {
      notify(false, "Cart is empty. Tap items from the menu to add.");
      return;
    }

    try {
      const payload = {
        outlet_code: restOutlet,
        table_code: selectedTable,
        captain_name: actorName,
        pax,
        guest_name: guestName,
        guest_phone: guestPhone,
        order_notes: orderNotes,
        items: cart,
      };

      const res = await apiFetch<any>("/api/kot/table-order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      let successMsg = `Order aligned to ${selectedTable}! KOT #${res.kot.kot_no} fired to kitchen.`;
      if (res.sweet_estimate_no) {
        successMsg += ` Sweet Counter Estimate #${res.sweet_estimate_no} issued to Order Boy.`;
      }

      notify(true, successMsg);
      setCart([]);
      setOrderNotes("");
      setTableMode("running_bill");
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to place table order");
    }
  };

  // Print Proforma Invoice (Running Bill Slip) with Dynamic UPI QR Code
  const handlePrintProforma = async () => {
    if (existingTableItems.length === 0) {
      notify(false, "No active items on table to print proforma");
      return;
    }
    try {
      await print40ColumnThermalSlip(
        {
          mode: "PROFORMA_BILL",
          status: "PROFORMA",
          proforma_no: `CHK-${selectedTable}`,
          table_code: selectedTable,
          outlet_code: restOutlet,
          customer_name: guestName || `Guest (Table ${selectedTable})`,
          customer_mobile: guestPhone,
          items: existingTableItems.map((i) => ({
            name: i.name,
            qty: i.qty,
            uom: i.uom || "pcs",
            unit_price: i.unit_price,
            line_total: i.qty * i.unit_price,
          })),
          subtotal: runningSubtotal,
          cgst: runningCgst,
          sgst: runningSgst,
          grand_total: runningGrandTotal,
        },
        outletObj
      );
      notify(true, `Proforma Bill slip printed for Table ${selectedTable} with UPI QR Code!`);
    } catch (e: any) {
      notify(false, "Print failed: " + e.message);
    }
  };

  // Settle and Close Table Bill
  const handleConfirmSettle = async () => {
    setSettlingLoading(true);
    try {
      const res = await apiFetch<any>("/api/kot/tables/settle", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: restOutlet,
          table_code: selectedTable,
          payment_mode: settleMode,
          payment_ref: settleRef || (settleMode === "Cash" ? "CASH" : `REF-${selectedTable}`),
          cashier_id: actorName,
          discount_amount: Number(settleDiscount || 0),
        }),
      });

      if (res.order) {
        // Automatically print final Tax Invoice
        await print40ColumnThermalSlip(res.order, outletObj);

        // WhatsApp Tax Invoice Dispatch
        const cleanMob = cleanIndianMobile(settleMobile);
        if (cleanMob) {
          setWhatsAppOrderData({
            docId: res.order.invoice_no || `INV-REST-${selectedTable}`,
            customerName: settleCustomerName || `Table ${selectedTable} Guest`,
            customerMobile: cleanMob,
            items: res.order.items || existingTableItems,
            subtotal: Number(res.order.subtotal || runningSubtotal),
            discountAmount: Number(res.order.discount_amount || settleDiscount || 0),
            cgst: Number(res.order.cgst || runningCgst),
            sgst: Number(res.order.sgst || runningSgst),
            grandTotal: Number(res.order.grand_total || runningGrandTotal),
            paymentMode: settleMode,
            paymentRef: settleRef || "PAID-UPI",
            paidAt: res.order.paid_at || new Date().toISOString(),
            outletName: outletObj?.trade_name || "Bikanervala Connaught Place Flagship",
            counterName: `Restaurant Floor (Table ${selectedTable})`,
            cashierName: actorName || "Restaurant Cashier",
          });
          setWhatsAppModalMode("TAX_INVOICE");
          setWhatsAppModalOpen(true);
        }
      }

      notify(
        true,
        `Table ${selectedTable} settled! Invoice ${res.invoice_no || "CLOSED"} generated (${formatINR(res.grand_total || 0)}). Table is now AVAILABLE.`
      );
      setSettleModalOpen(false);
      setSettleRef("");
      setSettleDiscount(0);
      setCashReceived(0);
      setTableMode("add_items");
      setCart([]);
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to settle table");
    } finally {
      setSettlingLoading(false);
    }
  };

  const changeReturn = Math.max(0, Number(cashReceived || 0) - runningGrandTotal);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${toast.ok
            ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-200"
            : "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/70 dark:border-rose-700 dark:text-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            {toast.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.msg}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner / Table Context Bar */}
      <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#081F5C] to-[#1246A8] text-white flex items-center justify-center shadow-md">
            <UtensilsCrossed className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#081F5C] dark:text-[#F8F3E6]">
                Restaurant Table Order Taking & Bill Settlement
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold">
                {tables.length} Tables • {menuItems.length} Dishes & Sweets Loaded
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Align dine-in orders • Add more items to running tables • Print Proforma & Dynamic UPI QR • Settle via UPI / Card / Cash • Staff: <b className="text-slate-800 dark:text-slate-200">{actorName}</b> ({restOutlet})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              onClick={() => setOrderTakingTab("entry")}
              className={`px-3 py-1.5 rounded-lg transition ${orderTakingTab === "entry"
                ? "bg-[#081F5C] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
                }`}
            >
              Floor & Order Taking
            </button>
            <button
              onClick={() => setOrderTakingTab("kds_progress")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${orderTakingTab === "kds_progress"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
                }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Kitchen KDS Progress ({activeKots.length})</span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 3-Column Layout: Table Selector | Food & Sweet Catalog | Running Bill / Cart */}
      {orderTakingTab === "entry" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Tables Grid (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#1246A8] dark:text-sky-400" />
                  Select Table
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {tables.length} tables ({restOutlet})
                </span>
              </div>

              {/* Section Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {sections.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${selectedSection === sec
                      ? "bg-[#081F5C] dark:bg-[#1246A8] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>

              {/* Tables Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredTables.map((t) => {
                  const isSelected = selectedTable === t.table_code;
                  const isRunning =
                    t.status === "KOT Running" ||
                    t.status === "Bill Printed" ||
                    activeKots.some((k) => k.table_code === t.table_code);
                  const isOccupied = t.status === "Occupied";

                  return (
                    <button
                      key={t.id || t.table_code}
                      onClick={() => handleSelectTable(t.table_code)}
                      className={`p-3 rounded-2xl border-2 text-left transition relative flex flex-col justify-between ${isSelected
                        ? "border-[#1246A8] bg-[#EBF4FF] dark:bg-blue-950/60 ring-2 ring-[#1246A8]/40"
                        : isRunning
                          ? "border-amber-400/80 bg-amber-50/70 dark:bg-amber-950/30"
                          : isOccupied
                            ? "border-sky-300 bg-sky-50 dark:bg-sky-950/30"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-400"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#081F5C] dark:text-[#F8F3E6]">
                          {t.table_code}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {t.capacity}p
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                          {t.section || t.floor_name}
                        </span>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${isRunning
                            ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 animate-pulse"
                            : isOccupied
                              ? "bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                        >
                          {isRunning ? "KOT Running" : t.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Summary of Active Tables */}
            <div className="bg-slate-50 dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-semibold">
                <span>Active Table KOTs:</span>
                <b className="text-amber-600">{activeKots.length}</b>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-semibold">
                <span>Selected Table:</span>
                <b className="font-mono text-[#081F5C] dark:text-sky-300">{selectedTable}</b>
              </div>
            </div>
          </div>

          {/* Center Column: Interactive Food & Sweet Catalog (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food dish, jalebi, rasgulla, chaat, paneer..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1246A8]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Horizontal Scroll */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${selectedCategory === cat
                      ? "bg-[#1246A8] text-white shadow"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Menu Items Count & Hint */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex justify-between px-1">
                <span>Showing {filteredMenu.length} dishes & mithai</span>
                <span>Tap tile or '+' to add to order</span>
              </div>

              {/* Menu Items List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredMenu.slice(0, 100).map((dish) => {
                  const inCart = cart.find((c) => c.sku === dish.sku);
                  const isSweet =
                    dish.category === "FG-Sweet" ||
                    (dish.sub_category &&
                      (dish.sub_category.toLowerCase().includes("sweet") ||
                        dish.sub_category.toLowerCase().includes("mithai")));

                  return (
                    <div
                      key={dish.sku}
                      className={`p-3 rounded-2xl border transition text-left flex flex-col justify-between ${inCart
                        ? "border-[#1246A8] bg-[#F0F5FF] dark:bg-blue-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-400"
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate max-w-[120px] ${isSweet
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-sky-100 text-sky-900"
                              }`}
                          >
                            {isSweet ? "Sweet Counter" : dish.kitchen_station || "Kitchen"}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {dish.sku}
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2">
                          {dish.name}
                        </h4>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-black text-[#081F5C] dark:text-[#F8F3E6]">
                          {formatINR(dish.selling_price)}
                        </span>

                        {inCart ? (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-1.5 py-0.5">
                            <button
                              onClick={() => updateCartQty(dish.sku, -1)}
                              className="p-1 text-slate-600 hover:text-rose-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-extrabold text-[#1246A8] dark:text-sky-300 px-1">
                              {inCart.qty}
                            </span>
                            <button
                              onClick={() => updateCartQty(dish.sku, 1)}
                              className="p-1 text-slate-600 hover:text-emerald-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(dish)}
                            className="px-2.5 py-1 rounded-xl bg-[#081F5C] hover:bg-[#1246A8] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Running Bill & Proforma Invoice OR Add Items Cart (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* When Running Table is Selected and in "running_bill" mode: Display Existing Items & Proforma Invoice */}
            {hasRunningKots && tableMode === "running_bill" ? (
              <div className="bg-white dark:bg-[#0C1324] border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 shadow-sm space-y-4">
                {/* Header: Running Table Context */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Running Table Order & Proforma Bill
                    </span>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-[#081F5C] dark:text-[#F8F3E6]">
                        Table {selectedTable}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                        {currentTableObj?.section || "Dining Hall"} • {pax} Pax
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-extrabold uppercase animate-pulse">
                    KOT Running
                  </span>
                </div>

                {/* Existing Line Items & Live Kitchen / Sweet Counter Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-amber-600" />
                      Active Table Dishes ({existingTableItems.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {tableKots.length} KOT batches
                    </span>
                  </div>

                  {existingTableItems.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-dashed text-center text-xs text-slate-500">
                      Table is marked active. Tap "Add More Items" to fire KOT dishes.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {existingTableItems.map((it, idx) => {
                        const isSweet =
                          it.station === "Sweet Counter" ||
                          (it.category && String(it.category).toLowerCase().includes("sweet"));
                        const stStatus = it.station_status || "Queued";
                        const isReady = stStatus === "Ready";
                        const isCooking = stStatus === "Preparing" || stStatus === "Cooking";

                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                  {it.qty}× {it.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isSweet
                                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300"
                                      }`}
                                  >
                                    {it.station || "Kitchen"}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {it.kot_no}
                                  </span>
                                </div>
                              </div>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
                                {formatINR(Number(it.qty) * Number(it.unit_price))}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span
                                className={`font-semibold ${isSweet
                                  ? "text-amber-700 font-bold"
                                  : isReady
                                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                    : isCooking
                                      ? "text-amber-600 dark:text-amber-400 font-bold"
                                      : "text-sky-600 dark:text-sky-400"
                                  }`}
                              >
                                {isSweet
                                  ? "🍯 Sweet Counter (Estimate Issued)"
                                  : isReady
                                    ? "✓ Ready to Serve"
                                    : isCooking
                                      ? "🔥 Cooking in Kitchen"
                                      : "⏱️ Queued in KDS"}
                              </span>
                              {it.modifiers && (
                                <span className="text-slate-500 italic truncate max-w-[140px]">
                                  {it.modifiers}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Proforma Bill Breakdown */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-2xl">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300">
                    <span>PROFORMA INVOICE / RUNNING BILL</span>
                    <span className="font-mono text-xs">Table #{selectedTable}</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>{formatINR(runningSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>GST (5% Restaurant Dining)</span>
                      <span>{formatINR(runningCgst + runningSgst)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-[#081F5C] dark:text-[#F8F3E6] pt-1.5 border-t border-amber-200 dark:border-amber-800">
                      <span>Grand Total Payable</span>
                      <span className="text-base text-emerald-700 dark:text-emerald-400">
                        {formatINR(runningGrandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Print Proforma | Add More Items | Settle & Close Bill */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handlePrintProforma}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Proforma Slip</span>
                    </button>

                    <button
                      onClick={() => setTableMode("add_items")}
                      className="py-2.5 px-3 rounded-xl border border-blue-300 bg-[#EBF4FF] dark:bg-blue-950/60 hover:bg-blue-100 text-[#081F5C] dark:text-sky-300 font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add More Items</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSettleModalOpen(true)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <Receipt className="w-4 h-4 text-amber-200" />
                    <span>Settle & Close Bill ({formatINR(runningGrandTotal)})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* When in "add_items" Mode OR Available Table: Display Interactive Cart & Fire KOT */
              <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                {/* Header: Table Context */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {hasRunningKots
                        ? `Add Extra Items (KOT-${tableKots.length + 1})`
                        : "Target Dining Table"}
                    </span>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-[#081F5C] dark:text-[#F8F3E6]">
                        Table {selectedTable}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                        {currentTableObj?.section || "Dining Hall"}
                      </span>
                    </div>
                  </div>

                  {/* PAX Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {pax} Pax
                    </span>
                    <div className="flex gap-1 ml-1">
                      <button
                        onClick={() => setPax(Math.max(1, pax - 1))}
                        className="w-5 h-5 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-xs font-bold"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setPax(pax + 1)}
                        className="w-5 h-5 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {hasRunningKots && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                    <span className="text-amber-900 dark:text-amber-300 font-semibold">
                      Running Table has {existingTableItems.length} active dishes ({formatINR(runningGrandTotal)})
                    </span>
                    <button
                      onClick={() => setTableMode("running_bill")}
                      className="px-2 py-1 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" /> View Running Bill
                    </button>
                  </div>
                )}

                {/* Optional Guest Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Guest Name (Opt)
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Mr. Sharma"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Phone # (Opt)
                    </label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91-98..."
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Cart Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    <span>
                      {hasRunningKots ? "Additional Dishes to Fire" : "Cart Dishes"} ({cart.length})
                    </span>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Cart is empty. Tap dishes or sweets from the catalog to add.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.sku}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </h5>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                Route: {item.station}
                              </span>
                            </div>
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
                              {formatINR(item.qty * item.unit_price)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={item.modifiers}
                              onChange={(e) => updateCartModifier(item.sku, e.target.value)}
                              placeholder="Modifier: Less Spicy, Jain, Chilled..."
                              className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1220] flex-1"
                            />

                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-1.5 py-0.5">
                              <button
                                onClick={() => updateCartQty(item.sku, -1)}
                                className="p-0.5 text-slate-600 hover:text-rose-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold px-1 text-xs">{item.qty}</span>
                              <button
                                onClick={() => updateCartQty(item.sku, 1)}
                                className="p-0.5 text-slate-600 hover:text-emerald-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => updateCartQty(item.sku, -item.qty)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bill Summary & Fire Order Action */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Batch Subtotal</span>
                      <span>{formatINR(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>GST (5% Restaurant)</span>
                      <span>{formatINR(cartGst)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-[#081F5C] dark:text-[#F8F3E6] pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Batch Total</span>
                      <span>{formatINR(cartTotal)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Special KOT Note for Kitchen / Sweet Counter
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Serve sweets along with starters"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs"
                    />
                  </div>

                  <button
                    disabled={cart.length === 0}
                    onClick={handleFireTableOrder}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#081F5C] via-[#0D2E82] to-[#1246A8] hover:from-[#0D2E82] hover:to-[#1856C9] disabled:opacity-40 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <Send className="w-4 h-4 text-amber-300" />
                    <span>
                      {hasRunningKots
                        ? `Fire Additional KOT to Table ${selectedTable}`
                        : `Fire Order to Table ${selectedTable} & Kitchen KOT`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: KITCHEN KOT KDS LIVE COOKING PROGRESS DISPLAY */}
      {orderTakingTab === "kds_progress" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-500" />
                <span>Kitchen KOT KDS Live Preparation Progress ({activeKots.length} Active Orders)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Real-time tracking of dishes across Kitchen Stations & Sweet Counter • Informs order taking staff when dishes are ready to serve
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Outlet: <b className="text-[#081F5C] dark:text-sky-300">{restOutlet}</b>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeKots.map((k) => {
              const allItems = Array.isArray(k.items) ? k.items : [];
              const readyCount = allItems.filter((i: any) => i.station_status === "Ready").length;
              const isAllReady = allItems.length > 0 && readyCount === allItems.length;

              return (
                <div
                  key={k.id}
                  className={`rounded-2xl border p-4 shadow-sm space-y-3 transition ${isAllReady
                    ? "bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-700"
                    : "bg-white dark:bg-[#0C1324] border-slate-200 dark:border-slate-800"
                    }`}
                >
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#081F5C] dark:text-sky-300">
                          {k.kot_no}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-[#081F5C] text-white text-[10px] font-mono font-bold">
                          Table: {k.table_code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Captain / Waiter: <b>{k.captain_name || "Order Boy"}</b>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAllReady
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                    >
                      {isAllReady ? "ALL DISHES READY" : k.status}
                    </span>
                  </div>

                  {/* Dishes and their cooking progress */}
                  <div className="space-y-2">
                    {allItems.map((it: any, idx: number) => {
                      const stStatus = it.station_status || "Queued";
                      const isReady = stStatus === "Ready";
                      const isCooking = stStatus === "Preparing" || stStatus === "Cooking";
                      const isSweet =
                        it.station === "Sweet Counter" ||
                        (it.category && String(it.category).toLowerCase().includes("sweet"));

                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border text-xs space-y-1 ${isReady
                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60"
                            : isCooking
                              ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60"
                              : "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {it.qty}× {it.name}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 font-mono">
                              [{it.station || "Kitchen"}]
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px]">
                            <span
                              className={`font-semibold ${isSweet
                                ? "text-amber-700 font-bold"
                                : isReady
                                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1"
                                  : isCooking
                                    ? "text-amber-700 dark:text-amber-400 font-bold"
                                    : "text-sky-700 dark:text-sky-400"
                                }`}
                            >
                              {isSweet
                                ? "🍯 Sweet Counter (Estimate Issued)"
                                : isReady
                                  ? "✓ Plated & Ready to Serve!"
                                  : isCooking
                                    ? "🔥 Cooking in Wok"
                                    : "⏱️ Queued in KDS"}
                            </span>
                            <span className="font-mono text-slate-400">
                              {isReady ? "100%" : isCooking ? "65%" : "25%"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL (Settle & Close Bill via UPI / Card / Cash) */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-[#081F5C] dark:text-[#F8F3E6]">
                  Settle & Close Bill — Table {selectedTable}
                </h3>
                <p className="text-xs text-slate-500">
                  Outlet: {restOutlet} • Pax: {pax} • Waiter: {actorName}
                </p>
              </div>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Badge */}
            <div className="bg-gradient-to-r from-[#081F5C] to-[#1246A8] text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[11px] text-sky-200 uppercase tracking-wide font-bold">
                  Total Bill Amount
                </span>
                <div className="text-2xl font-black">{formatINR(runningGrandTotal)}</div>
                <div className="text-[10px] text-sky-200 mt-0.5">
                  Subtotal: {formatINR(runningSubtotal)} • GST (5%): {formatINR(runningCgst + runningSgst)}
                </div>
              </div>
              <button
                onClick={handlePrintProforma}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Select Customer Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMode("UPI")}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${settleMode === "UPI"
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 ring-2 ring-emerald-500/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <span>UPI QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettleMode("Card")}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${settleMode === "Card"
                    ? "border-sky-500 bg-sky-50/70 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200 ring-2 ring-sky-500/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                >
                  <CreditCard className="w-5 h-5 text-sky-600" />
                  <span>Card / POS EDC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettleMode("Cash")}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${settleMode === "Cash"
                    ? "border-amber-500 bg-amber-50/70 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 ring-2 ring-amber-500/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                >
                  <Banknote className="w-5 h-5 text-amber-600" />
                  <span>Manual Cash</span>
                </button>
              </div>
            </div>

            {/* Customer Details for WhatsApp Receipt / Pay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer WhatsApp Mobile
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold font-mono text-xs">+91</span>
                  <input
                    type="tel"
                    value={settleMobile.replace(/^\+?91/, "")}
                    onChange={(e) => setSettleMobile(e.target.value)}
                    placeholder="9811445566"
                    maxLength={10}
                    className="w-full pl-11 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={settleCustomerName}
                  onChange={(e) => setSettleCustomerName(e.target.value)}
                  placeholder={`Table ${selectedTable} Guest`}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                />
              </div>
            </div>

            {/* UPI QR Display & Screenshot Verification Mode */}
            {settleMode === "UPI" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-purple-50/50 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-200 dark:border-purple-800">
                  <div className="shrink-0 bg-white p-2 rounded-xl border border-purple-200 shadow-sm">
                    <UpiQrCode
                      amount={runningGrandTotal}
                      docId={`REST-${selectedTable}`}
                      size={140}
                      className="!p-0 !bg-transparent !border-0 !shadow-none"
                    />
                  </div>

                  <div className="space-y-2 text-left min-w-0 flex-1">
                    <div className="text-xs font-black text-purple-900 dark:text-purple-200">
                      Scan or Send UPI Pay to WhatsApp
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Customer can scan the QR code from their chair or receive the Tap-to-Pay link directly on WhatsApp.
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setWhatsAppOrderData({
                          docId: `REST-${selectedTable}`,
                          customerName: settleCustomerName || `Table ${selectedTable} Guest`,
                          customerMobile: settleMobile,
                          items: existingTableItems,
                          subtotal: runningSubtotal,
                          discountAmount: Number(settleDiscount || 0),
                          cgst: runningCgst,
                          sgst: runningSgst,
                          grandTotal: runningGrandTotal,
                          paymentMode: "UPI",
                          outletName: outletObj?.trade_name || "Bikanervala Connaught Place Flagship",
                          counterName: `Restaurant Dining Table ${selectedTable}`,
                          cashierName: actorName || "Order Taking Staff",
                        });
                        setWhatsAppModalMode("PROFORMA_UPI");
                        setWhatsAppModalOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>📲 Send UPI & Proforma to WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    UPI UTR / Reference ID (from Customer Screenshot)
                  </label>
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder="e.g. UPI-992817264812"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Verify transfer confirmation screenshot shown on customer's phone
                  </span>
                </div>
              </div>
            )}

            {/* Card Payment Mode */}
            {settleMode === "Card" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200">
                  Swipe/Dip credit or debit card on the handheld EDC machine for <b>{formatINR(runningGrandTotal)}</b>.
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Card Terminal Approval / Auth Code
                  </label>
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder="e.g. AUTH-482910"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Cash Payment Mode with Change Calculator */}
            {settleMode === "Cash" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Cash Received (₹)
                    </label>
                    <input
                      type="number"
                      value={cashReceived || ""}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      placeholder={String(runningGrandTotal)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-sm font-black text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Change Due to Customer
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-black text-emerald-600">
                      {formatINR(changeReturn)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Staff Discount / Waiver (Optional) */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Discount / Waiver Amount (Optional ₹)
              </label>
              <input
                type="number"
                value={settleDiscount || ""}
                onChange={(e) => setSettleDiscount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs font-semibold"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={settlingLoading}
                onClick={handleConfirmSettle}
                className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {settlingLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm Payment & Close Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Dispatch Modal for Proforma UPI & Tax Invoice */}
      {whatsAppOrderData && (
        <WhatsAppDispatchModal
          isOpen={whatsAppModalOpen}
          onClose={() => setWhatsAppModalOpen(false)}
          mode={whatsAppModalMode}
          orderData={whatsAppOrderData}
          onSent={(cleanMob) => {
            notify(
              true,
              `Dispatched ${whatsAppModalMode === "PROFORMA_UPI" ? "UPI Proforma & Pay link" : "Tax Invoice"} to WhatsApp (${cleanMob})!`
            );
          }}
        />
      )}
    </div>
  );
};
