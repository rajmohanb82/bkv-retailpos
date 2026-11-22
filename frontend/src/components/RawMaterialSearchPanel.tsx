import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Truck,
  CheckCircle2,
  DollarSign,
  Package,
  Boxes,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";

export interface RawMaterialItem {
  sku: string;
  name: string;
  category: string;
  sub_category: string;
  uom: string;
  hsn_code: string;
  gst_pct: number;
  cost_price: number;
  min_par_level: number;
  total_stock: number;
  stock_status: "CRITICAL_LOW" | "LOW_STOCK" | "HEALTHY" | "OUT_OF_STOCK";
  batches_count: number;
  batches: Array<{
    id: number;
    batch_no: string;
    store_code: string;
    qty: number;
    uom?: string;
    unit_cost: number;
    mfg_date: string;
    expiry_date: string;
    days_to_expiry: number;
    qc_status: string;
  }>;
  usage_trend: {
    daily_burn: number;
    weekly_burn: number;
    monthly_burn: number;
    trend_direction: "UP" | "DOWN" | "STABLE";
    trend_pct: number;
    intensity: "HIGH" | "MODERATE" | "LOW";
  };
  predictive_depletion: {
    days_remaining: number;
    depletion_date: string;
    urgency: "CRITICAL" | "WARNING" | "HEALTHY";
    lead_time_days: number;
    recommended_reorder_date: string;
  };
  vendor: {
    vendor_code: string;
    trade_name: string;
    contact_person: string;
    mobile: string;
    email: string;
    gstin: string;
    fssai_no: string;
    lead_time_days: number;
    moq: number;
    contract_rate: number;
    quality_score: number;
    payment_terms: string;
  } | null;
}

export const RawMaterialSearchPanel: React.FC = () => {
  const [items, setItems] = useState<RawMaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "RM" | "Packaging">("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "HEALTHY">("ALL");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [prCreatedMsg, setPrCreatedMsg] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("query", searchQuery.trim());
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (urgencyFilter !== "ALL") params.append("urgency", urgencyFilter);

      const res = await apiFetch<RawMaterialItem[]>(
        `/api/stores/raw-materials/search?${params.toString()}`
      );
      setItems(res || []);
    } catch (err: any) {
      console.error("Failed to search raw materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, urgencyFilter]);

  const handleCreatePr = async (item: RawMaterialItem) => {
    try {
      const suggestedQty = Math.max(
        (item.min_par_level * 1.5) - item.total_stock,
        item.vendor?.moq || 25
      );
      const res = await apiFetch<any>("/api/stores/auto-pr", {
        method: "POST",
        body: JSON.stringify({
          store_code: item.batches[0]?.store_code || "STR-MFG-RM",
          sku: item.sku,
          qty: Math.round(suggestedQty),
          reason: `Auto Reorder: Predictive stock-out on ${item.predictive_depletion.depletion_date} (Burn: ${item.usage_trend.daily_burn} ${item.uom}/day)`,
        }),
      });
      setPrCreatedMsg(
        `Purchase Requisition created for ${item.name}! Ref: ${res.pr_no || "PR-OPEN"}`
      );
      setTimeout(() => setPrCreatedMsg(null), 4000);
    } catch (e: any) {
      alert(`Could not create PR: ${e.message}`);
    }
  };

  // Metrics
  const criticalCount = items.filter(
    (i) => i.predictive_depletion.urgency === "CRITICAL"
  ).length;
  const warningCount = items.filter(
    (i) => i.predictive_depletion.urgency === "WARNING"
  ).length;
  const totalValuation = items.reduce(
    (sum, i) => sum + i.total_stock * (i.cost_price || 0),
    0
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Materials Tracked
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {items.length} SKUs
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Raw Materials & Packaging
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Critical Stock-Out Risk
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {criticalCount} SKUs
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ≤ 3 Days Remaining
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Warning / Low Buffer
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {warningCount} SKUs
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              4 to 7 Days Remaining
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-900/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Stores RM Valuation
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatINR(totalValuation)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Active FEFO Stock Value
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {prCreatedMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{prCreatedMsg}</span>
        </div>
      )}

      {/* Search & Dynamic Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Raw Material by name, SKU (e.g. RM-KAJU-01), category, or vendor..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <span className="px-2 text-slate-500 text-[11px]">Type:</span>
              {(["ALL", "RM", "Packaging"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg transition ${
                    categoryFilter === cat
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {cat === "ALL" ? "All Types" : cat === "RM" ? "Raw Materials" : "Packaging"}
                </button>
              ))}
            </div>

            <button
              onClick={fetchItems}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Urgency Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Predictive Risk:
          </span>
          {[
            { id: "ALL", label: "All Items", badge: items.length },
            { id: "CRITICAL", label: "🚨 Critical Risk (≤3 Days)", badge: criticalCount, color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800" },
            { id: "WARNING", label: "⚠️ Low Stock (4-7 Days)", badge: warningCount, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800" },
            { id: "HEALTHY", label: "✅ Healthy (>7 Days)", badge: items.length - criticalCount - warningCount, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setUrgencyFilter(pill.id as any)}
              className={`px-3 py-1 rounded-xl font-bold border transition flex items-center gap-1.5 ${
                urgencyFilter === pill.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{pill.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                urgencyFilter === pill.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}>
                {pill.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Raw Materials List */}
      <div className="space-y-3">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
            <p className="text-sm font-semibold">Searching Raw Materials & Usage Trends...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Boxes className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No raw materials found matching "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try searching by generic name (e.g. Milk, Cashew, Sugar, Ghee, Container).
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isExpanded = expandedSku === item.sku;
            const urgency = item.predictive_depletion.urgency;
            const daysLeft = item.predictive_depletion.days_remaining;

            const urgencyBadge =
              urgency === "CRITICAL"
                ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                : urgency === "WARNING"
                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";

            return (
              <div
                key={item.sku}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Main Card Row */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Column 1: Item Basic Info */}
                  <div className="lg:w-1/4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {item.sku}
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        {item.sub_category}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-1">
                      {item.name}
                    </h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1">
                      <span>HSN: {item.hsn_code || "N/A"}</span>
                      <span>GST: {item.gst_pct}%</span>
                      <span>Unit Cost: ₹{item.cost_price} / {item.uom}</span>
                    </div>
                  </div>

                  {/* Column 2: Current Stock & Par */}
                  <div className="lg:w-1/5">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Available Stores Stock
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                        {item.total_stock} {item.uom}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        / Min ROP: {item.min_par_level} {item.uom}
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.total_stock < item.min_par_level * 0.5
                            ? "bg-rose-500"
                            : item.total_stock < item.min_par_level
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (item.total_stock / (item.min_par_level * 1.5 || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{item.batches_count} active lot(s)</span>
                      <span
                        className={`font-bold ${
                          item.total_stock < item.min_par_level
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {item.stock_status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Column 3: Current Usage Trend */}
                  <div className="lg:w-1/5">
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <span>Consumption Velocity</span>
                      {item.usage_trend.trend_direction === "UP" ? (
                        <TrendingUp className="w-3 h-3 text-rose-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                      {item.usage_trend.daily_burn} {item.uom} / day
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{item.usage_trend.weekly_burn} {item.uom}/wk</span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          item.usage_trend.trend_pct > 0
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                        }`}
                      >
                        {item.usage_trend.trend_pct > 0 ? "+" : ""}
                        {item.usage_trend.trend_pct}%
                      </span>
                    </div>
                  </div>

                  {/* Column 4: Predictive Run-Out & Integration Date */}
                  <div className="lg:w-1/5">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Predictive Depletion Date
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {item.predictive_depletion.depletion_date}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold border ${urgencyBadge}`}
                      >
                        {urgency === "CRITICAL" ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>
                          {daysLeft <= 0
                            ? "Exhausted"
                            : `${daysLeft} Days Remaining`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Column 5: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreatePr(item)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow transition"
                    >
                      <span>Reorder PR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedSku(isExpanded ? null : item.sku)}
                      className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Toggle Details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Drawer: Associated Vendor Details & Batch Lots */}
                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vendor Details */}
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-extrabold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                              Associated Primary Vendor
                            </span>
                          </div>
                          {item.vendor && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ⭐ {item.vendor.quality_score} Rating
                            </span>
                          )}
                        </div>

                        {item.vendor ? (
                          <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              <span>{item.vendor.trade_name}</span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {item.vendor.vendor_code}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.vendor.mobile}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">{item.vendor.email}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Lead Time:</span>{" "}
                                <span className="font-bold text-blue-600 dark:text-sky-400">
                                  {item.vendor.lead_time_days} Days
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">MOQ:</span>{" "}
                                <span className="font-bold">
                                  {item.vendor.moq} {item.uom}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Contract Rate:</span>{" "}
                                <span className="font-bold text-emerald-600">
                                  ₹{item.vendor.contract_rate} / {item.uom}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Payment:</span>{" "}
                                <span>{item.vendor.payment_terms}</span>
                              </div>
                            </div>

                            <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span>GSTIN: {item.vendor.gstin}</span>
                              <span>FSSAI: {item.vendor.fssai_no}</span>
                            </div>

                            <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] flex items-center justify-between">
                              <span className="font-bold text-blue-800 dark:text-blue-300">
                                Recommended Reorder Date:
                              </span>
                              <span className="font-black text-rose-600 dark:text-rose-400">
                                {item.predictive_depletion.recommended_reorder_date}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 py-3 text-center">
                            No primary vendor mapped to this SKU in vendor masters.
                          </div>
                        )}
                      </div>

                      {/* Batches Breakdown */}
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-extrabold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                              Active Stock Lots (FEFO Sorted)
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">
                            {item.batches.length} Lot(s)
                          </span>
                        </div>

                        {item.batches.length > 0 ? (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {item.batches.map((b) => (
                              <div
                                key={b.id}
                                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {b.batch_no}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                    <span>Store: {b.store_code}</span>
                                    <span>MFG: {b.mfg_date}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-slate-900 dark:text-slate-100">
                                    {b.qty} {b.uom || item.uom}
                                  </div>
                                  <div
                                    className={`text-[10px] font-bold ${
                                      b.days_to_expiry <= 3
                                        ? "text-rose-600"
                                        : b.days_to_expiry <= 7
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    Exp: {b.expiry_date} ({b.days_to_expiry}d left)
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-rose-500 py-4 text-center font-bold">
                            Zero batches in physical stock! Stock-out condition.
                          </div>
                        )}
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
  );
};
