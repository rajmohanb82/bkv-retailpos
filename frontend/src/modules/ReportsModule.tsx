import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  TrendingUp,
  BarChart3,
  PieChart,
  ShoppingBag,
  Layers,
  Calendar,
  Building2,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  Ticket,
  ChevronRight,
  Filter,
  CheckCircle2,
  Sparkles,
  Award,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "../api";

export const ReportsModule: React.FC = () => {
  // Navigation & Lens Filters
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "categories" | "quarterly" | "channels" | "tenders" | "gst" | "catalog"
  >("overview");
  const [timeline, setTimeline] = useState<string>("monthly");
  const [quarter, setQuarter] = useState<string>("Q3");
  const [roleLens, setRoleLens] = useState<"CXO" | "Director" | "Manager" | "Accountant">("CXO");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("ALL");

  // Data States
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Standard Catalog Data (for deep-dive raw SQL logs)
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("pos_funnel");
  const [reportData, setReportData] = useState<any>(null);
  const [batchQuery, setBatchQuery] = useState<string>("");

  // Fetch Executive Analytics
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        timeline,
        quarter,
        role_lens: roleLens,
        outlet_code: selectedOutlet,
      });
      const data = await apiFetch<any>(`/api/analytics/reports/executive-analytics?${query.toString()}`);
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch executive analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Raw Reports Catalog
  useEffect(() => {
    apiFetch<any[]>("/api/analytics/reports/catalog").then((data) => {
      setCatalog(data || []);
      if (data && data.length > 0) {
        runRawReport(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [timeline, quarter, roleLens, selectedOutlet]);

  const runRawReport = async (id: string, q = batchQuery) => {
    setSelectedReportId(id);
    try {
      const res = await apiFetch(`/api/analytics/reports/run/${id}?batch_query=${encodeURIComponent(q)}`);
      setReportData(res);
    } catch (err) {
      console.error("Failed to run raw report:", err);
    }
  };

  const exportCsv = (customData?: any[], customFilename?: string) => {
    let rowsToExport: any[] = [];
    let filename = customFilename || `annavya-${selectedReportId}.csv`;

    if (customData) {
      rowsToExport = customData;
    } else if (reportData?.rows) {
      rowsToExport = reportData.rows;
    }

    if (!rowsToExport || rowsToExport.length === 0) return;

    const keys = Object.keys(rowsToExport[0]);
    const csv = [
      keys.join(","),
      ...rowsToExport.map((r: any) =>
        keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = analyticsData?.kpis || {};
  const insights = analyticsData?.role_lens_insights || {};
  const productRanking = analyticsData?.product_ranking || [];
  const categoryAnalysis = analyticsData?.category_analysis || [];
  const channels = analyticsData?.channels || [];
  const paymentTenders = analyticsData?.payment_tenders || [];
  const quarterlyTrend = analyticsData?.quarterly_trend || [];
  const gstSummary = analyticsData?.gst_summary || [];

  return (
    <div className="space-y-6">
      {/* TOP HEADER: ROLE LENSES & CADENCE FILTERS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#081F5C] to-indigo-700 text-white flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-[#081F5C] dark:text-white">
                Executive & Multi-Tier Reporting Studio
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-dimensional analytics for CXOs, Managing Directors & Store Managers with granular timeline aggregation
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics()}
              title="Refresh Live Data"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              onClick={() => {
                if (activeTab === "products") exportCsv(productRanking, "annavya-product-margins.csv");
                else if (activeTab === "categories") exportCsv(categoryAnalysis, "annavya-category-performance.csv");
                else if (activeTab === "gst") exportCsv(gstSummary, "annavya-gst-hsn-reconciliation.csv");
                else exportCsv();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-4 h-4" /> Print View
            </button>
          </div>
        </div>

        {/* Filters Bar: Role Lens + Timelines + Outlets */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Role Lens */}
          <div className="md:col-span-4 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-2 shrink-0">
              Role Lens:
            </span>
            {(["CXO", "Director", "Manager", "Accountant"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleLens(r)}
                className={`flex-1 py-1 px-2 rounded-xl font-bold transition text-center ${
                  roleLens === r
                    ? "bg-[#081F5C] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                {r === "CXO" ? "👔 CXO" : r === "Director" ? "🏢 Director" : r === "Manager" ? "🏪 Manager" : "📊 Accounts"}
              </button>
            ))}
          </div>

          {/* Timeline Selector */}
          <div className="md:col-span-5 flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-2 shrink-0">
              Cadence:
            </span>
            {[
              { id: "daily", label: "Daily" },
              { id: "monthly", label: "Monthly" },
              { id: "quarterly", label: "Quarterly" },
              { id: "half_yearly", label: "Half-Year" },
              { id: "annual", label: "Annual" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeline(t.id)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition ${
                  timeline === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}

            {/* Quarter Selector dropdown when Quarterly is active */}
            {timeline === "quarterly" && (
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-0.5 font-bold text-slate-800 dark:text-slate-200 ml-1"
              >
                <option value="Q1">Q1 (Apr-Jun)</option>
                <option value="Q2">Q2 (Jul-Sep)</option>
                <option value="Q3">Q3 (Oct-Dec Festive)</option>
                <option value="Q4">Q4 (Jan-Mar)</option>
              </select>
            )}
          </div>

          {/* Outlet Filter */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">🌐 All Outlets & Factories</option>
              <option value="DEL01">DEL01 - CP Flagship</option>
              <option value="GUR02">GUR02 - CyberHub Grand</option>
              <option value="JAI01">JAI01 - Jaipur MI Road</option>
              <option value="NOI01">NOI01 - Noida Sector 18</option>
              <option value="MFG01">MFG01 - Central Sweet Factory</option>
            </select>
          </div>
        </div>
      </div>

      {/* ROLE LENS STRATEGIC INSIGHT BANNER */}
      {insights?.headline && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-blue-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-white/5 pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-extrabold tracking-wide uppercase">
              <Sparkles className="w-4 h-4" />
              <span>{roleLens} Executive Takeaway • {insights.focus_area}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {insights.headline}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-xs text-sky-100">
              {insights.bullet_points?.map((pt: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <span className="leading-snug">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXECUTIVE KPI SUMMARY RIBBON (6 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {[
          {
            label: "Gross Revenue",
            value: `₹${(kpis.total_gross_revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
            sub: `${timeline.toUpperCase()} Run-rate`,
            icon: DollarSign,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/40",
            border: "border-emerald-200 dark:border-emerald-800",
          },
          {
            label: "Gross Margin",
            value: `${kpis.gross_margin_pct || 58.0}%`,
            sub: `₹${(kpis.gross_profit || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} profit`,
            icon: TrendingUp,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/40",
            border: "border-blue-200 dark:border-blue-800",
          },
          {
            label: "Average Basket (ABV)",
            value: `₹${kpis.abv || 0}`,
            sub: `${kpis.total_invoices || 0} bills & orders`,
            icon: ShoppingBag,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-950/40",
            border: "border-indigo-200 dark:border-indigo-800",
          },
          {
            label: "Discounts & Leakage",
            value: `₹${(kpis.total_discounts || 0).toLocaleString("en-IN")}`,
            sub: "SMS OTP Verified",
            icon: ShieldCheck,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/40",
            border: "border-amber-200 dark:border-amber-800",
          },
          {
            label: "FEFO Expiry Risk",
            value: `₹${(kpis.near_expiry_risk || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
            sub: "≤ 3 Days Remaining",
            icon: AlertTriangle,
            color: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-950/40",
            border: "border-rose-200 dark:border-rose-800",
          },
          {
            label: "GST Output Tax",
            value: `₹${(kpis.total_gst || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
            sub: "5%, 12% & 18% Slabs",
            icon: Building2,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/40",
            border: "border-purple-200 dark:border-purple-800",
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border ${card.border} shadow-sm space-y-1.5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {card.label}
                </span>
                <div className={`w-7 h-7 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {card.value}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold truncate">
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* MULTI-TAB NAVIGATION */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: "overview", label: "📈 Overview & Trends" },
          { id: "products", label: "🍬 Product-Wise Matrix" },
          { id: "categories", label: "🏷️ Category Performance" },
          { id: "quarterly", label: "🗓️ Quarterly Comparison" },
          { id: "channels", label: "🛵 Channel & Aggregator Mix" },
          { id: "tenders", label: "💳 Payment Modes" },
          { id: "gst", label: "⚖️ GST & HSN Reconciliation" },
          { id: "catalog", label: "📂 Standard Compliance Reports (10)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-[#081F5C] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Channel Revenue Bars */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                Revenue Distribution by Sales Channel
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                Total: ₹{(kpis.total_gross_revenue || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="space-y-3.5">
              {channels.map((ch: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">{ch.channel}</span>
                    <span className="text-slate-900 dark:text-white">
                      ₹{Number(ch.revenue || 0).toLocaleString("en-IN")} ({ch.share_pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(Math.max(ch.share_pct, 4), 100)}%`,
                        backgroundColor: ch.color || "#081F5C",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Highlights */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Top Performing Food Categories
              </h3>
              <span className="text-[11px] text-amber-600 font-bold">Margin Leader</span>
            </div>

            <div className="space-y-3">
              {categoryAnalysis.slice(0, 5).map((cat: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {cat.category}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {cat.units_sold} units sold • {cat.profitability_tier}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-xs text-[#081F5C] dark:text-sky-300">
                      ₹{Number(cat.revenue || 0).toLocaleString("en-IN")}
                    </div>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {cat.margin_pct}% margin
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT-WISE PERFORMANCE MATRIX */}
      {activeTab === "products" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                SKU Product-Wise Sales, BOM Cost & Gross Margins
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed profitability ranking of top 25 selling sweets, chaat and restaurant dishes
              </p>
            </div>
            <button
              onClick={() => exportCsv(productRanking, "annavya-product-margins.csv")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
            >
              <Download className="w-3.5 h-3.5" /> Export Products CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Rank</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Product Name</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Category</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Units Sold</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Gross Sales</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">BOM RM Cost</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Gross Profit</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-center">Margin %</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productRanking.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 pr-3 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-2.5 pr-3 font-bold text-slate-900 dark:text-white">{p.product_name}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{p.category}</td>
                    <td className="py-2.5 pr-3 text-right font-mono font-semibold">{p.units_sold}</td>
                    <td className="py-2.5 pr-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{Number(p.gross_revenue || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-slate-500">
                      ₹{Number(p.rm_cogs_cost || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(p.gross_margin || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300">
                        {p.gross_margin_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-slate-500">{p.contribution_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORY PERFORMANCE */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryAnalysis.map((c: any, idx: number) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">{c.category}</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                  {c.profitability_tier}
                </span>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category Revenue:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    ₹{Number(c.revenue || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Units Sold:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{c.units_sold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Share of Total Sales:</span>
                  <span className="font-bold text-blue-600 dark:text-sky-400">{c.share_pct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Profit Margin:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{c.margin_pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: QUARTERLY COMPARISON */}
      {activeTab === "quarterly" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Fiscal Year Quarterly Trajectory (Q1, Q2, Q3 Festive & Q4)
              </h3>
              <p className="text-xs text-slate-500">
                YoY Growth & Gross Margin Progression across Q1 to Q4
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs">
              Diwali Surge: +26.8% YoY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quarterlyTrend.map((q: any, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#081F5C] dark:text-white">{q.quarter}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {q.status}
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  ₹{Number(q.revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="space-y-1 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Margin:</span>
                    <span className="font-bold text-emerald-600">{q.gross_margin_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">YoY Growth:</span>
                    <span className="font-extrabold text-indigo-600">+{q.yoy_growth_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Invoices:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{q.invoices}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CHANNELS & AGGREGATORS */}
      {activeTab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((ch: any, idx: number) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">{ch.channel}</h4>
                <span className="text-xs font-black text-blue-600 dark:text-sky-400">{ch.share_pct}%</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                ₹{Number(ch.revenue || 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Orders Processed:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{ch.orders}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: PAYMENT MODES & TENDERS */}
      {activeTab === "tenders" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentTenders.map((pt: any, idx: number) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate">{pt.mode}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300">
                  {pt.share_pct}%
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                ₹{Number(pt.amount || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-slate-400">
                Fully reconciled with terminal settlement ledger & bank statement feeds
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: GST & HSN TAX RECONCILIATION */}
      {activeTab === "gst" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                Statutory GSTR-1 & GSTR-3B Tax Schedule by HSN Slabs
              </h3>
              <p className="text-xs text-slate-500">
                Audit breakdown for CGST, SGST and Taxable Base across Indian statutory rates
              </p>
            </div>
            <button
              onClick={() => exportCsv(gstSummary, "annavya-gst-tax-schedule.csv")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
            >
              <Download className="w-3.5 h-3.5" /> Export GSTR-1 CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-left">
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Tax Slab & Scope</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">HSN Codes</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Taxable Base (₹)</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">CGST (₹)</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">SGST (₹)</th>
                  <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {gstSummary.map((g: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{g.slab}</td>
                    <td className="py-3 pr-3 font-mono text-slate-500">{g.hsn_codes}</td>
                    <td className="py-3 pr-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{Number(g.taxable_base || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-purple-600 dark:text-purple-400">
                      ₹{Number(g.cgst || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-purple-600 dark:text-purple-400">
                      ₹{Number(g.sgst || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ₹{Number(g.total_gst || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: STANDARD COMPLIANCE REPORTS (THE 10 DEEP-DIVE REPORTS) */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left Catalog List */}
          <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-2 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-[#081F5C] dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Standard Audit & Compliance Suite
            </div>
            {catalog.map((c) => (
              <button
                key={c.id}
                onClick={() => runRawReport(c.id)}
                className={`w-full text-left p-3 rounded-2xl border transition ${
                  selectedReportId === c.id
                    ? "bg-[#081F5C] text-white border-[#081F5C] shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                }`}
              >
                <div className={`text-[9px] font-bold uppercase tracking-wider ${selectedReportId === c.id ? "text-sky-300" : "text-blue-600 dark:text-sky-400"}`}>
                  {c.category}
                </div>
                <div className="text-xs font-bold mt-0.5">{c.name}</div>
                <div className={`text-[10px] mt-0.5 line-clamp-2 ${selectedReportId === c.id ? "text-slate-200" : "text-slate-500"}`}>
                  {c.description}
                </div>
              </button>
            ))}
          </div>

          {/* Right Raw Table Viewer */}
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                  {reportData?.title || "Audit Log"}
                </h3>
                <p className="text-xs text-slate-500">
                  {reportData?.rows?.length || 0} live database rows retrieved
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedReportId === "fssai_trace" && (
                  <div className="flex items-center gap-1">
                    <input
                      value={batchQuery}
                      onChange={(e) => setBatchQuery(e.target.value)}
                      placeholder="Batch / SKU / Ref..."
                      className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => runRawReport("fssai_trace", batchQuery)}
                      className="p-2 rounded-xl bg-blue-600 text-white"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => exportCsv()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
              {!reportData?.rows || reportData.rows.length === 0 ? (
                <div className="text-xs text-slate-400 py-12 text-center">
                  No records returned for this audit criteria.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-left">
                      {Object.keys(reportData.rows[0]).map((col) => (
                        <th key={col} className="py-2 pr-3 font-bold uppercase text-[10px] whitespace-nowrap">
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData.rows.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {Object.keys(reportData.rows[0]).map((col) => (
                          <td key={col} className="py-2 pr-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {r[col] === null || r[col] === undefined ? "-" : String(r[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
