import React, { useEffect, useState } from "react";
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Plus,
  Trash2,
  Flame,
  Printer,
  Scissors,
  CheckCircle2,
  BellRing,
  UserCheck,
  Search,
  Filter,
  Check,
  ArrowRight,
  Clock,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku } from "../types";

interface KotModuleProps {
  activeOutlet: string;
}

const ALL_KITCHEN_STATIONS = [
  "Chaat & Snacks",
  "Tandoor & Breads",
  "South Indian",
  "North Indian Main",
  "Continental & Fast Food",
  "Mithai & Desserts",
  "Beverages & Lassi",
  "Thali & Combo",
  "Pantry & Bakery",
];

export const getMatchingCounter = (station?: string, name?: string, category?: string): string => {
  const s = (station || "").trim().toLowerCase();
  const n = (name || "").trim().toLowerCase();
  const c = (category || "").trim().toLowerCase();

  if (
    s.includes("chaat") ||
    n.includes("chaat") ||
    n.includes("tikki") ||
    n.includes("bhalla") ||
    n.includes("golgappa") ||
    n.includes("samosa") ||
    n.includes("kachori") ||
    n.includes("papdi") ||
    n.includes("bhel")
  ) {
    return "Chaat & Snacks";
  }
  if (
    s.includes("tandoor") ||
    n.includes("tandoor") ||
    n.includes("naan") ||
    n.includes("roti") ||
    n.includes("kulcha") ||
    n.includes("paratha") ||
    n.includes("tikka") ||
    n.includes("chaap")
  ) {
    return "Tandoor & Breads";
  }
  if (
    s.includes("south indian") ||
    n.includes("dosa") ||
    n.includes("idli") ||
    n.includes("vada") ||
    n.includes("uttapam") ||
    n.includes("sambhar")
  ) {
    return "South Indian";
  }
  if (
    s.includes("thali") ||
    n.includes("thali") ||
    n.includes("combo") ||
    n.includes("platter") ||
    n.includes("deluxe meal")
  ) {
    return "Thali & Combo";
  }
  if (
    s.includes("curry") ||
    s.includes("main kitchen") ||
    s.includes("north indian") ||
    n.includes("dal") ||
    n.includes("paneer") ||
    n.includes("chole") ||
    n.includes("sabzi") ||
    n.includes("curry") ||
    n.includes("rice") ||
    n.includes("biryani") ||
    n.includes("pulao") ||
    n.includes("kofta") ||
    n.includes("korma")
  ) {
    return "North Indian Main";
  }
  if (
    s.includes("chinese") ||
    s.includes("fast food") ||
    s.includes("continental") ||
    n.includes("noodle") ||
    n.includes("manchurian") ||
    n.includes("burger") ||
    n.includes("pizza") ||
    n.includes("sandwich") ||
    n.includes("fried rice") ||
    n.includes("spring roll") ||
    n.includes("pasta") ||
    n.includes("fries")
  ) {
    return "Continental & Fast Food";
  }
  if (
    s.includes("beverage") ||
    s.includes("lassi") ||
    n.includes("lassi") ||
    n.includes("tea") ||
    n.includes("chai") ||
    n.includes("coffee") ||
    n.includes("shake") ||
    n.includes("juice") ||
    n.includes("cold drink") ||
    n.includes("soda") ||
    n.includes("water") ||
    n.includes("chaas")
  ) {
    return "Beverages & Lassi";
  }
  if (
    s.includes("dessert") ||
    s.includes("mithai") ||
    s.includes("sweet") ||
    c.includes("sweet") ||
    n.includes("halwa") ||
    n.includes("jamun") ||
    n.includes("kulfi") ||
    n.includes("rasgulla") ||
    n.includes("jalebi") ||
    n.includes("ice cream") ||
    n.includes("kheer")
  ) {
    return "Mithai & Desserts";
  }
  if (
    s.includes("pantry") ||
    s.includes("bakery") ||
    n.includes("bread") ||
    n.includes("toast") ||
    n.includes("cake") ||
    n.includes("cookie") ||
    n.includes("rusk")
  ) {
    return "Pantry & Bakery";
  }
  return "North Indian Main";
};

const RESTAURANT_CATEGORIES = [
  "All Categories",
  "Soups & Shorba",
  "Starters & Kebabs",
  "Tandoori & Platters",
  "North Indian Gravies & Paneer",
  "Dal Specialties",
  "Rice, Biryani & Pulao",
  "Tandoori Breads & Naan",
  "South Indian Dosa & Idli",
  "Mumbai Chaat & Street Food",
  "Delhi Street Chaat & Tikki",
  "Snacks & Samosa",
  "Chinese & Continental",
  "Sandwiches & Burgers",
  "Pizza & Pasta",
  "Executive Thali & Combos",
  "Traditional Mithai",
  "Bengali Sweets",
  "Hot Desserts & Halwa",
  "Ice Creams & Kulfi",
  "Lassi, Shakes & Hot/Cold Beverages",
];

export const KotModule: React.FC<KotModuleProps> = ({ activeOutlet }) => {
  const [kotOutlet, setKotOutlet] = useState<string>(
    activeOutlet === "MFG01" ? "DEL01" : activeOutlet
  );
  const [view, setView] = useState<"floor" | "kds">("floor");
  const [tables, setTables] = useState<any[]>([]);
  const [kots, setKots] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<ItemSku[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("T-02");
  const [orderCart, setOrderCart] = useState<any[]>([]);
  const [modifier, setModifier] = useState("Standard");
  const [searchMenu, setSearchMenu] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStationFilter, setSelectedStationFilter] = useState("All Stations");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Two-Slip Print Preview Modal
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipPayload, setSlipPayload] = useState<any>(null);

  // Waiter Dispatch Modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchKot, setDispatchKot] = useState<any>(null);
  const [selectedRunner, setSelectedRunner] = useState("Ram Singh (Waiter 1)");

  const load = async () => {
    try {
      const [tbls, kList, catalog] = await Promise.all([
        apiFetch<any[]>(`/api/kot/tables?outlet_code=${kotOutlet}`),
        apiFetch<any[]>(`/api/kot/kots?outlet_code=${kotOutlet}`),
        apiFetch<ItemSku[]>("/api/admin/items"),
      ]);
      setTables(tbls);
      setKots(kList);
      setMenuItems(catalog.filter((i) => i.category === "FG-Rest"));
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    setKotOutlet(activeOutlet === "MFG01" ? "DEL01" : activeOutlet);
  }, [activeOutlet]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [kotOutlet]);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const fireKot = async (source = "DINE_IN", customTable?: string) => {
    const targetTable = customTable || selectedTable;
    try {
      const res = await apiFetch("/api/kot/kots", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: kotOutlet,
          table_code: targetTable,
          order_source: source,
          captain_name: source === "DINE_IN" ? "Arjun Negi (Captain)" : "Aggregator Webhook",
          pax: 4,
          items: orderCart,
        }),
      });
      setOrderCart([]);
      if (res.two_slip) {
        setSlipPayload(res.two_slip);
        setShowSlipModal(true);
      }
      notify(true, `Fired ${res.kot_no} → Generated Two-Slip KOT (Captain Copy & Chef Counter Copy)!`);
      load();
    } catch (err: any) {
      notify(false, err.message || "Failed to fire KOT");
    }
  };

  const openSlipPreview = async (kotId: number) => {
    try {
      const res = await apiFetch(`/api/kot/kots/${kotId}/two-slip`);
      setSlipPayload(res.two_slip);
      setShowSlipModal(true);
    } catch (e: any) {
      notify(false, "Failed to load KOT slip");
    }
  };

  const injectAggregatorOrder = async () => {
    try {
      const res = await apiFetch("/api/kot/kots", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: kotOutlet,
          table_code: `ZOM-${Math.floor(1000 + Math.random() * 9000)}`,
          order_source: "ZOMATO",
          captain_name: "Zomato Webhook",
          pax: 1,
          items: [
            { sku: "RST-CHAAT-01", qty: 2, modifiers: "Pack curd separate", station: "Chaat & Snacks", course: "Pack" },
            { sku: "RST-TAND-01", qty: 1, modifiers: "Extra Butter Naan", station: "Tandoor & Breads", course: "Pack" },
          ],
        }),
      });
      notify(true, `Ingested Zomato Order ${res.kot_no} straight to Kitchen KDS!`);
      load();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const updateKdsItem = async (kotId: number, itemIdx: number, nextStatus: string) => {
    try {
      await apiFetch(`/api/kot/kots/${kotId}/station-status`, {
        method: "PATCH",
        body: JSON.stringify({ item_index: itemIdx, station_status: nextStatus }),
      });
      if (nextStatus === "Ready") {
        notify(true, `Dish marked READY by Counter Chef! Captain notified to handover or dispatch runner.`);
      }
      load();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const handleHandover = async (kotId: number, handoverType: "DIRECT_TO_CUSTOMER" | "CALL_WAITER_TABLE", runnerName?: string) => {
    try {
      const res = await apiFetch(`/api/kot/kots/${kotId}/handover`, {
        method: "PATCH",
        body: JSON.stringify({
          handover_type: handoverType,
          runner_name: runnerName || "Ram Singh (Waiter 1)",
          notes: "",
        }),
      });
      notify(true, res.message);
      setShowDispatchModal(false);
      load();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const settleTable = async (tableCode: string) => {
    try {
      const res = await apiFetch("/api/kot/tables/settle", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: kotOutlet,
          table_code: tableCode,
          payment_mode: "UPI",
        }),
      });
      notify(true, `Table ${tableCode} settled! Invoice ${res.invoice_no} (${formatINR(res.grand_total)}) + Kitchen BOM recipe deducted.`);
      load();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const activeKots = kots.filter(
    (k) =>
      ["ACTIVE", "FIRED", "QUEUED", "COOKING", "PREPARING", "READY", "SERVED"].includes(
        (k.status || "").toUpperCase()
      )
  );

  const getElapsedMins = (createdAt?: string) => {
    if (!createdAt) return 0;
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  // Filter menu items
  const filteredMenuItems = menuItems.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchMenu.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchMenu.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory !== "All Categories" && m.sub_category !== selectedCategory) {
      return false;
    }
    if (selectedStationFilter !== "All Stations" && m.kitchen_station !== selectedStationFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-sm ${
            toast.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Flame className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("floor")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
              view === "floor"
                ? "bg-[#081F5C] text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Captain Floor Map & KOT Entry ({kotOutlet})
          </button>
          <button
            onClick={() => setView("kds")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
              view === "kds"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Multi-Station Kitchen KDS ({activeKots.length} Active Orders)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={kotOutlet}
            onChange={(e) => setKotOutlet(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="DEL01">DEL01 - Connaught Place</option>
            <option value="GUR02">GUR02 - CyberHub</option>
            <option value="JAI03">JAI03 - Jaipur</option>
            <option value="NOI04">NOI04 - Noida</option>
          </select>
          <button
            onClick={injectAggregatorOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100"
          >
            <Flame className="w-3.5 h-3.5" />
            Simulate Zomato Order
          </button>
        </div>
      </div>

      {/* VIEW 1: FLOOR MAP & CAPTAIN ENTRY */}
      {view === "floor" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 space-y-4">
            {/* Dining Floor Map */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                  Dining Floor Map — Outlet <span className="font-mono text-emerald-600">{kotOutlet}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Tables: {tables.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tables.map((t) => {
                  const isSel = selectedTable === t.table_code;
                  const statusColor =
                    t.status === "Available"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-300"
                      : t.status === "KOT Running"
                      ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-300"
                      : t.status === "Bill Printed"
                      ? "bg-sky-50 border-sky-300 text-sky-900 dark:bg-sky-950/30 dark:border-sky-700/50 dark:text-sky-300"
                      : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTable(t.table_code)}
                      className={`cursor-pointer p-4 rounded-3xl border-2 transition ${statusColor} ${
                        isSel ? "ring-2 ring-[#081F5C] dark:ring-sky-400 shadow-md scale-[1.01]" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-extrabold text-base">{t.table_code}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80">
                          {t.capacity} Pax
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold mt-1 opacity-80">
                        {t.floor_name || "Ground Floor"} • {t.section}
                      </div>
                      <div className="text-[11px] font-extrabold mt-2 uppercase tracking-wide">
                        {t.status}
                      </div>

                      {(t.status === "KOT Running" || t.status === "Bill Printed") && (
                        <div className="mt-2.5 w-full py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 text-amber-500" /> Settle Bill via Order Taking
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Catalog with All 20 Categories */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                  Restaurant Food Menu ({filteredMenuItems.length} Dishes)
                </h3>
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dishes or SKU..."
                    value={searchMenu}
                    onChange={(e) => setSearchMenu(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Category Pills Slider */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
                {RESTAURANT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1 rounded-xl text-[11px] font-bold transition flex-shrink-0 ${
                      selectedCategory === cat
                        ? "bg-[#081F5C] text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pt-1">
                {filteredMenuItems.slice(0, 80).map((m) => (
                  <button
                    key={m.sku}
                    onClick={() =>
                      setOrderCart((prev) => [
                        ...prev,
                        {
                          sku: m.sku,
                          name: m.name,
                          qty: 1,
                          unit_price: m.selling_price,
                          station: m.kitchen_station || "North Indian Main",
                          modifiers: modifier,
                          course: "Main",
                        },
                      ])
                    }
                    className="text-left p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#081F5C] hover:bg-sky-50/30 dark:hover:bg-slate-800/60 transition text-xs group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                        {m.kitchen_station || "North Indian Main"}
                      </span>
                      <span className="font-extrabold text-[#081F5C] dark:text-sky-400">
                        {formatINR(m.selling_price)}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1.5 flex items-center justify-between">
                      <span className="truncate pr-2">{m.name}</span>
                      <Plus className="w-4 h-4 text-[#081F5C] dark:text-sky-400 group-hover:scale-110 transition" />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{m.sub_category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Captain KOT Ticket Builder */}
          <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                  Captain KOT Order — Table <span className="font-mono text-emerald-600">{selectedTable}</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {orderCart.length} Items
                </span>
              </div>

              <div className="text-xs">
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Cooking / Chef Instructions
                </label>
                <select
                  value={modifier}
                  onChange={(e) => setModifier(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option>Standard</option>
                  <option>No Onion / Garlic (Jain)</option>
                  <option>Less Spicy & Less Oil</option>
                  <option>Extra Desi Ghee & Crispy</option>
                  <option>Serve Starters First</option>
                </select>
              </div>

              {/* Cart Items */}
              <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
                {orderCart.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Station: <b>{c.station}</b> • {c.modifiers}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatINR(c.unit_price)}
                      </span>
                      <button
                        onClick={() => setOrderCart(orderCart.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {orderCart.length === 0 && (
                  <div className="text-xs text-slate-400 py-12 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                    Tap dishes on the left to add to Captain KOT Ticket
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                disabled={orderCart.length === 0}
                onClick={() => fireKot("DINE_IN")}
                className="w-full py-3 rounded-2xl bg-[#081F5C] text-white text-xs font-bold hover:bg-opacity-95 disabled:opacity-40 shadow-lg flex items-center justify-center gap-2"
              >
                <Scissors className="w-4 h-4" />
                Fire KOT & Print 2 Slips (Captain + Chef Cut)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MULTI-STATION KITCHEN KDS WITH READINESS & WAITER DISPATCH */}
      {view === "kds" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {ALL_KITCHEN_STATIONS.map((st) => {
              const stationItems: any[] = [];
              activeKots.forEach((k) => {
                (k.items || []).forEach((it: any, idx: number) => {
                  const matched = getMatchingCounter(it.station, it.name, it.category);
                  if (matched === st) {
                    stationItems.push({ kot: k, item: it, idx });
                  }
                });
              });

              return (
                <div
                  key={st}
                  className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg space-y-3 border border-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="font-extrabold text-sm text-sky-400">{st} Counter</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono font-bold text-amber-300">
                      {stationItems.length} items
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
                    {stationItems.map((entry, i) => {
                      const stStatus = entry.item.station_status || "Queued";
                      const isReady = stStatus === "Ready";
                      const isPreparing = stStatus === "Preparing" || stStatus === "Cooking";
                      const elapsed = getElapsedMins(entry.kot.created_at);
                      const progressPct = isReady ? 100 : isPreparing ? 65 : 25;

                      return (
                        <div
                          key={i}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition ${
                            isReady
                              ? "bg-emerald-950/40 border-emerald-500/50"
                              : isPreparing
                              ? "bg-amber-950/30 border-amber-500/50"
                              : "bg-slate-800/80 border-slate-700"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-amber-300">
                              {entry.kot.kot_no} ({entry.kot.table_code})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                                  elapsed >= 20
                                    ? "bg-rose-500/30 text-rose-300 animate-pulse border border-rose-500/50"
                                    : elapsed >= 10
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                ⏱️ {elapsed}m
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 font-semibold text-slate-300">
                                {entry.kot.order_source}
                              </span>
                            </div>
                          </div>

                          <div className="font-bold text-sm text-white">
                            {entry.item.qty}× {entry.item.name}
                          </div>

                          {/* Cooking Progress Bar & Indicator */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-semibold text-slate-400">
                                Preparation Progress:
                              </span>
                              <span
                                className={`font-bold ${
                                  isReady
                                    ? "text-emerald-400"
                                    : isPreparing
                                    ? "text-amber-400"
                                    : "text-sky-400"
                                }`}
                              >
                                {isReady
                                  ? "100% (Plated & Ready)"
                                  : isPreparing
                                  ? "65% (Cooking in Wok/Tandoor)"
                                  : "25% (Queued in KDS)"}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isReady
                                    ? "bg-emerald-500 w-full"
                                    : isPreparing
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 w-[65%] animate-pulse"
                                    : "bg-sky-500 w-[25%]"
                                }`}
                              />
                            </div>
                          </div>

                          {entry.item.modifiers && (
                            <div className="text-[11px] text-amber-200">
                              Note: {entry.item.modifiers}
                            </div>
                          )}

                          {/* Chef Status Control */}
                          <div className="flex gap-1.5 pt-1">
                            {[
                              { label: "Queued", val: "Queued" },
                              { label: "🔥 Cooking", val: "Preparing" },
                              { label: "✅ Ready", val: "Ready" },
                            ].map((s) => (
                              <button
                                key={s.val}
                                onClick={() => updateKdsItem(entry.kot.id, entry.idx, s.val)}
                                className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition ${
                                  stStatus === s.val || (s.val === "Preparing" && isPreparing)
                                    ? s.val === "Ready"
                                      ? "bg-emerald-500 text-white shadow-sm"
                                      : s.val === "Preparing"
                                      ? "bg-amber-500 text-white shadow-sm"
                                      : "bg-sky-500 text-white shadow-sm"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>

                          {/* When Dish is READY: Captain Handover & Waiter Dispatch Actions */}
                          {isReady && (
                            <div className="p-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/40 space-y-2 mt-2">
                              <div className="text-[10px] font-extrabold text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Plated & Ready for Service!
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => handleHandover(entry.kot.id, "DIRECT_TO_CUSTOMER")}
                                  className="py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500"
                                >
                                  Counter Handover
                                </button>
                                <button
                                  onClick={() => {
                                    setDispatchKot(entry.kot);
                                    setShowDispatchModal(true);
                                  }}
                                  className="py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold hover:bg-amber-400 flex items-center justify-center gap-1"
                                >
                                  <BellRing className="w-3 h-3" /> Call Waiter
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {stationItems.length === 0 && (
                      <div className="text-xs text-slate-500 py-8 text-center">
                        No active tickets at this counter
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active KOTs Ledger & Two-Slip Re-print */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
              Active KOT Master Ledger ({activeKots.length} Orders in Kitchen)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeKots.map((k) => (
                <div
                  key={k.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-[#081F5C] dark:text-sky-400">
                      {k.kot_no}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        k.status === "READY"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : k.status === "SERVED"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {k.status}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-900 dark:text-white">
                    Table: {k.table_code} • Captain: {k.captain_name}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => openSlipPreview(k.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1.5"
                    >
                      <Scissors className="w-3.5 h-3.5 text-slate-500" />
                      Two-Slip Cut
                    </button>

                    {k.status === "READY" && (
                      <button
                        onClick={() => {
                          setDispatchKot(k);
                          setShowDispatchModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Serve Table
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TWO-SLIP KOT PRINT PREVIEW (CAPTAIN COPY + CHEF COPY WITH CUT) */}
      {showSlipModal && slipPayload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#081F5C] dark:text-sky-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  KOT Two-Slip Dual Print Preview (ESC/POS Auto-Cut)
                </h3>
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Two slips are printed simultaneously on the 40-Column KOT printer with an automated cut command (<code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">0x1D 0x56 0x00</code>): Copy 1 is kept at the Captain Desk, and Copy 2 is sent to the Counter Chef.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slip 1: Captain Copy */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-200">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 dark:text-amber-400 mb-2">
                  [Copy 1: Captain Copy — Kept at Desk]
                </div>
                <pre className="font-mono text-[11px] whitespace-pre-wrap leading-tight">
                  {slipPayload.captain_slip}
                </pre>
              </div>

              {/* Slip 2: Counter Chef Copy */}
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-dashed border-sky-300 dark:border-sky-700/60 text-slate-800 dark:text-slate-200">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-800 dark:text-sky-400 mb-2">
                  [Copy 2: Counter Chef Copy — Station Food Ticket]
                </div>
                <pre className="font-mono text-[11px] whitespace-pre-wrap leading-tight">
                  {slipPayload.chef_slip}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                Cut Command: ESC/POS \x1dV\x00 Auto-Separator
              </span>
              <button
                onClick={() => {
                  window.print();
                  notify(true, "Sent dual KOT slip to thermal printer spooler!");
                }}
                className="px-5 py-2.5 rounded-2xl bg-[#081F5C] text-white text-xs font-bold hover:bg-opacity-90 shadow flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Two Slips Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WAITER DISPATCH & SERVE TABLE */}
      {showDispatchModal && dispatchKot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-500" />
                Dispatch Waiter / Runner to Table {dispatchKot.table_code}
              </h3>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Order KOT No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{dispatchKot.kot_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Table:</span>
                <span className="font-bold text-emerald-600">{dispatchKot.table_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kitchen Status:</span>
                <span className="font-bold text-emerald-600">ALL DISHES READY</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Floor Order Boy / Waiter Runner:
              </label>
              <select
                value={selectedRunner}
                onChange={(e) => setSelectedRunner(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
              >
                <option value="Ram Singh (Waiter 1)">Ram Singh (Floor Waiter 1)</option>
                <option value="Sunil Kumar (Waiter 2)">Sunil Kumar (Floor Waiter 2)</option>
                <option value="Vikash Sharma (Order Boy)">Vikash Sharma (Order Boy)</option>
                <option value="Manoj Verma (Runner)">Manoj Verma (Kitchen Runner)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleHandover(dispatchKot.id, "CALL_WAITER_TABLE", selectedRunner)}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow"
              >
                Dispatch Runner & Serve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
