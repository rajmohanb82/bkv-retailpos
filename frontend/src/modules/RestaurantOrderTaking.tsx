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
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, Outlet } from "../types";

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
      setMenuItems(items.filter((i) => i.category === "FG-Rest"));
      setActiveKots(
        kots.filter((k) =>
          ["ACTIVE", "FIRED", "QUEUED", "COOKING", "PREPARING", "READY"].includes(
            (k.status || "").toUpperCase()
          )
        )
      );
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

  // Distinct Categories from Menu
  const categories = useMemo(() => {
    const c = new Set<string>();
    menuItems.forEach((m) => {
      if (m.sub_category) c.add(m.sub_category);
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
      list = list.filter((m) => m.sub_category === selectedCategory);
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

  const addToCart = (item: ItemSku) => {
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
          station: item.kitchen_station || "Main Kitchen",
          modifiers: "",
          course: "Main",
        },
      ];
    });
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

      notify(true, `Order aligned to ${selectedTable}! KOT #${res.kot.kot_no} fired to kitchen.`);
      setCart([]);
      setOrderNotes("");
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to place table order");
    }
  };

  const handleMarkServed = async (kotId: number) => {
    try {
      await apiFetch(`/api/kot/kots/${kotId}/handover`, {
        method: "PATCH",
        body: JSON.stringify({
          handover_type: "CALL_WAITER_TABLE",
          runner_name: actorName,
        }),
      });
      notify(true, "Dish marked SERVED to table!");
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to update handover");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${
            toast.ok
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-200"
              : "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/70 dark:border-rose-700 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs font-bold hover:underline">
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
                Restaurant Table Order Taking
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold">
                {menuItems.length} Food Items Loaded
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Align dine-in orders to tables • Multi-station KOT routing • Captain: <b className="text-slate-800 dark:text-slate-200">{actorName}</b> ({restOutlet})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              onClick={() => setOrderTakingTab("entry")}
              className={`px-3 py-1.5 rounded-lg transition ${
                orderTakingTab === "entry"
                  ? "bg-[#081F5C] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Table Order Entry
            </button>
            <button
              onClick={() => setOrderTakingTab("kds_progress")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                orderTakingTab === "kds_progress"
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

      {/* VIEW 1: 3-Column Layout: Table Selector | Food Catalog | Active Order & Cart */}
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
                {tables.length} tables
              </span>
            </div>

            {/* Section Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {sections.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedSection === sec
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
                const isRunning = t.status === "KOT Running" || t.status === "Bill Printed";
                const isOccupied = t.status === "Occupied";
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTable(t.table_code);
                      if (t.current_pax > 0) setPax(t.current_pax);
                    }}
                    className={`p-3 rounded-2xl border-2 text-left transition relative flex flex-col justify-between ${
                      isSelected
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
                        {t.section}
                      </span>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          isRunning
                            ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 animate-pulse"
                            : isOccupied
                            ? "bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Running KOTs for Table with Live KDS Cooking Progress */}
          {tableKots.length > 0 && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Kitchen KDS Progress ({tableKots.length} KOTs)
                </span>
                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-amber-300">
                  {selectedTable}
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {tableKots.map((k) => (
                  <div
                    key={k.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#0B1324] border border-amber-200 dark:border-amber-800 text-xs space-y-2 shadow-sm"
                  >
                    <div className="flex justify-between items-center font-mono font-bold text-[#081F5C] dark:text-sky-300">
                      <span className="text-[11px]">{k.kot_no}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          k.status === "READY"
                            ? "bg-emerald-100 text-emerald-800 animate-bounce"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {k.status}
                      </span>
                    </div>

                    {/* Line Items Cooking Progress */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {(k.items || []).map((it: any, idx: number) => {
                        const stStatus = it.station_status || "Queued";
                        const isReady = stStatus === "Ready";
                        const isCooking = stStatus === "Preparing" || stStatus === "Cooking";
                        const pct = isReady ? 100 : isCooking ? 65 : 25;

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {it.qty}× {it.name}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                [{it.station || "Kitchen"}]
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                              <span
                                className={`font-semibold ${
                                  isReady
                                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                    : isCooking
                                    ? "text-amber-600 dark:text-amber-400 font-bold"
                                    : "text-sky-600 dark:text-sky-400"
                                }`}
                              >
                                {isReady ? "✓ Plated & Ready!" : isCooking ? "🔥 Cooking in Wok" : "⏱️ Queued in KDS"}
                              </span>
                              <span className="font-mono text-slate-400">{pct}%</span>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isReady
                                    ? "bg-emerald-500 w-full"
                                    : isCooking
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 w-[65%] animate-pulse"
                                    : "bg-sky-500 w-[25%]"
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Column: Interactive Food Menu Browser (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food item, beverage, chaat, paneer..."
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                    selectedCategory === cat
                      ? "bg-[#1246A8] text-white shadow"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items List */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex justify-between px-1">
              <span>Showing {filteredMenu.length} dishes</span>
              <span>Tap '+' or tile to add</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredMenu.slice(0, 100).map((dish) => {
                const inCart = cart.find((c) => c.sku === dish.sku);
                return (
                  <div
                    key={dish.sku}
                    className={`p-3 rounded-2xl border transition text-left flex flex-col justify-between ${
                      inCart
                        ? "border-[#1246A8] bg-[#F0F5FF] dark:bg-blue-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-400"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 truncate max-w-[120px]">
                          {dish.kitchen_station || "Kitchen"}
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

        {/* Right Column: Order Alignment & Active Cart (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            {/* Table Order Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Dining Table
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

            {/* Optional Guest Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Guest Name (Opt)</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Mr. Sharma"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Phone # (Opt)</label>
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
                <span>Cart Items ({cart.length})</span>
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
                    Cart is empty. Tap dishes from the menu to take table order.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
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
                            Station: {item.station}
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
                          placeholder="Modifier: No Onion/Garlic, Jain, Spicy..."
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
                  <span>Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST (5% Restaurant)</span>
                  <span>{formatINR(cartGst)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#081F5C] dark:text-[#F8F3E6] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Total Payable</span>
                  <span>{formatINR(cartTotal)}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Special KOT Note for Kitchen</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Serve starters first, festival special packaging"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1220] text-xs"
                />
              </div>

              <button
                disabled={cart.length === 0}
                onClick={handleFireTableOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#081F5C] via-[#0D2E82] to-[#1246A8] hover:from-[#0D2E82] hover:to-[#1856C9] disabled:opacity-40 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4 text-amber-300" />
                <span>Fire Order to Table {selectedTable} & Kitchen KOT</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* VIEW 2: KITCHEN KOT KDS LIVE COOKING PROGRESS DISPLAY */}
      {orderTakingTab === "kds_progress" && (
        <div className="space-y-4">
          {/* Header Summary Bar */}
          <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-500" />
                <span>Kitchen KOT KDS Live Preparation Progress ({activeKots.length} Active Orders)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Real-time tracking of dishes across Kitchen Stations • Informs order taking staff when dishes are ready to serve
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Outlet: <b className="text-[#081F5C] dark:text-sky-300">{restOutlet}</b>
              </span>
            </div>
          </div>

          {/* Active Table Orders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeKots.map((k) => {
              const allItems = k.items || [];
              const readyCount = allItems.filter((i: any) => i.station_status === "Ready").length;
              const isAllReady = allItems.length > 0 && readyCount === allItems.length;

              return (
                <div
                  key={k.id}
                  className={`rounded-2xl border p-4 shadow-sm space-y-3 transition ${
                    isAllReady
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
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAllReady
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {isAllReady ? "ALL DISHES READY" : k.status}
                    </span>
                  </div>

                  {/* Dishes and their cooking progress */}
                  <div className="space-y-3">
                    {allItems.map((it: any, idx: number) => {
                      const stStatus = it.station_status || "Queued";
                      const isReady = stStatus === "Ready";
                      const isCooking = stStatus === "Preparing" || stStatus === "Cooking";
                      const pct = isReady ? 100 : isCooking ? 65 : 25;

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                            isReady
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

                          {it.modifiers && (
                            <div className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                              Note: {it.modifiers}
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[10px]">
                            <span
                              className={`font-semibold ${
                                isReady
                                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1"
                                  : isCooking
                                  ? "text-amber-700 dark:text-amber-400 font-bold"
                                  : "text-sky-700 dark:text-sky-400"
                              }`}
                            >
                              {isReady ? "✓ Plated & Ready for Service" : isCooking ? "🔥 Cooking in Wok/Tandoor" : "⏱️ Queued in Kitchen"}
                            </span>
                            <span className="font-mono text-slate-500 font-bold">{pct}%</span>
                          </div>

                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isReady
                                  ? "bg-emerald-500 w-full"
                                  : isCooking
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 w-[65%] animate-pulse"
                                  : "bg-sky-500 w-[25%]"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions for Table */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                      Total: {formatINR(k.total_amount)}
                    </span>
                    <button
                      onClick={() => handleMarkServed(k.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                    >
                      Serve to Table
                    </button>
                  </div>
                </div>
              );
            })}

            {activeKots.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-3xl">
                <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="font-bold text-sm text-slate-600 dark:text-slate-300">
                  No active orders in Kitchen right now
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Place an order from the Table Order Entry tab to see live cooking progress here
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
