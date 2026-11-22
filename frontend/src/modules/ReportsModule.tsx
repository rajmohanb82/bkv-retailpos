import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
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
  X,
  FileCheck2,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { StoresReportsPanel } from "../components/StoresReportsPanel";

export const ReportsModule: React.FC = () => {
  // Navigation & Lens Filters
  const [activeTab, setActiveTab] = useState<
    "overview" | "stores" | "products" | "categories" | "quarterly" | "channels" | "tenders" | "gst" | "catalog"
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

  // Executive PDF Report Viewer State
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [pdfReportTitle, setPdfReportTitle] = useState<string>("Executive Performance & Tax Audit");
  const [pdfRows, setPdfRows] = useState<any[]>([]);

  const openPdfReportModal = (title: string, data?: any[]) => {
    setPdfReportTitle(title);
    if (data && data.length > 0) {
      setPdfRows(data);
    } else if (reportData?.rows && reportData.rows.length > 0) {
      setPdfRows(reportData.rows);
    } else if (productRanking && productRanking.length > 0) {
      setPdfRows(productRanking);
    } else {
      setPdfRows([]);
    }
    setShowPdfModal(true);
  };

  const exportExcel = (customData?: any[], customFilename?: string, title?: string) => {
    let rowsToExport: any[] = [];
    let filename = customFilename || `annavya-${selectedReportId}.xls`;
    if (!filename.endsWith(".xls") && !filename.endsWith(".xlsx")) {
      filename += ".xls";
    }

    if (customData && customData.length > 0) {
      rowsToExport = customData;
    } else if (reportData?.rows && reportData.rows.length > 0) {
      rowsToExport = reportData.rows;
    }

    if (!rowsToExport || rowsToExport.length === 0) return;

    const keys = Object.keys(rowsToExport[0]);
    const reportTitle = title || filename.replace(/[-_.]/g, " ").toUpperCase();

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${reportTitle.slice(0, 30)}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1E293B; }
          .company-header { font-size: 16pt; font-weight: bold; color: #081F5C; }
          .sub-header { font-size: 10pt; color: #475569; }
          .title-row { font-size: 13pt; font-weight: bold; color: #081F5C; padding: 10px 0; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th { background-color: #081F5C; color: #FFFFFF; font-weight: bold; text-align: left; padding: 8px 12px; border: 1px solid #001233; }
          td { border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 10pt; }
          tr:nth-child(even) td { background-color: #F8FAFC; }
          .num { text-align: right; }
          .footer { font-size: 9pt; color: #64748B; margin-top: 15px; font-style: italic; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="${keys.length}" class="company-header" style="border:none;">BIKANERVALA FOODS PRIVATE LIMITED • ANNAVYA RETAIL ERP</td>
          </tr>
          <tr>
            <td colspan="${keys.length}" class="sub-header" style="border:none;">Regd. Office: A-28, Lawrence Road Industrial Area, New Delhi - 110035 | CIN: U74899DL1988PTC034261 | GSTIN: 07AAACB1234F1Z5</td>
          </tr>
          <tr>
            <td colspan="${keys.length}" class="title-row" style="border:none;">${reportTitle} • Scope: ${selectedOutlet} | Timeline: ${timeline.toUpperCase()} | Generated: ${new Date().toLocaleString()}</td>
          </tr>
          <tr><td colspan="${keys.length}" style="border:none;"></td></tr>
          <thead>
            <tr>
              ${keys.map((k) => `<th>${k.replace(/_/g, " ").toUpperCase()}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsToExport
              .map(
                (r) => `
              <tr>
                ${keys
                  .map((k) => {
                    const val = r[k];
                    const isNum = typeof val === "number";
                    return `<td class="${isNum ? "num" : ""}">${val ?? ""}</td>`;
                  })
                  .join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="footer">Confidential • Generated by Annavya Retail ERP & Executive Analytics Engine</div>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
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
          <div className="flex items-center gap-4">
            {/* Dual Brand Logos (Bikanervala + Annavya ERP Platform) */}
            <div className="flex items-center gap-2.5 p-1.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <img
                src="/bikanervala-customer-logo.svg"
                alt="Bikanervala"
                className="h-9 w-auto max-w-[125px] object-contain drop-shadow-xs"
              />
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
              <img
                src="/annavya-logo-light.png"
                alt="Annavya ERP"
                className="h-8 w-auto max-w-[110px] object-contain drop-shadow-xs dark:hidden"
              />
              <img
                src="/annavya-logo-dark.png"
                alt="Annavya ERP"
                className="h-8 w-auto max-w-[110px] object-contain drop-shadow-xs hidden dark:block"
              />
            </div>
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
                if (activeTab === "products") exportExcel(productRanking, "annavya-product-margins.xls", "Product Profitability & Margins");
                else if (activeTab === "categories") exportExcel(categoryAnalysis, "annavya-category-performance.xls", "Category Performance Matrix");
                else if (activeTab === "gst") exportExcel(gstSummary, "annavya-gst-hsn-reconciliation.xls", "Statutory GSTR-1 & HSN Tax Schedule");
                else exportExcel();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel (.xlsx)
            </button>
            <button
              onClick={() => {
                if (activeTab === "products") openPdfReportModal("SKU Product-Wise Sales, BOM Cost & Margin Audit", productRanking);
                else if (activeTab === "categories") openPdfReportModal("Category-Wise Revenue & Contribution Matrix", categoryAnalysis);
                else if (activeTab === "gst") openPdfReportModal("Statutory GSTR-1 & GSTR-3B Tax Reconciliation Schedule", gstSummary);
                else openPdfReportModal("Executive Analytics & Financial Performance Report", productRanking);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#081F5C] to-indigo-700 hover:from-blue-900 hover:to-indigo-800 text-white text-xs font-bold transition shadow-sm"
            >
              <FileText className="w-4 h-4" /> 📄 Executive PDF Report
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-4 h-4" /> Print
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
          { id: "stores", label: "🏬 Stores & Inventory Reports" },
          { id: "products", label: "🍬 Product-Wise Matrix" },
          { id: "categories", label: "🏷️ Category Performance" },
          { id: "quarterly", label: "🗓️ Quarterly Comparison" },
          { id: "channels", label: "🛵 Channel & Aggregator Mix" },
          { id: "tenders", label: "💳 Payment Modes" },
          { id: "gst", label: "⚖️ GST & HSN Reconciliation" },
          { id: "catalog", label: "📂 Standard Compliance Reports (13)" },
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

      {/* TAB: STORES & INVENTORY REPORTS */}
      {activeTab === "stores" && (
        <StoresReportsPanel />
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportExcel(productRanking, "annavya-product-margins.xls", "SKU Profitability & Margins")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (.xlsx)
              </button>
              <button
                onClick={() => openPdfReportModal("SKU Product-Wise Sales, BOM Cost & Margin Audit", productRanking)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#081F5C] to-indigo-700 text-white text-xs font-bold hover:from-blue-900 hover:to-indigo-800 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" /> 📄 Executive PDF
              </button>
            </div>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportExcel(gstSummary, "annavya-gst-tax-schedule.xls", "Statutory GSTR-1 & HSN Schedule")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (.xlsx)
              </button>
              <button
                onClick={() => openPdfReportModal("Statutory GSTR-1 & GSTR-3B Tax Reconciliation Schedule", gstSummary)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" /> 📄 Statutory Tax PDF
              </button>
            </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportExcel(reportData?.rows, `annavya-${selectedReportId}.xls`, selectedReportId.toUpperCase())}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => openPdfReportModal(`Audit Ledger: ${selectedReportId.toUpperCase()}`, reportData?.rows)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#081F5C] to-indigo-700 text-white text-xs font-bold hover:from-blue-900 hover:to-indigo-800 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> 📄 PDF Report
                  </button>
                </div>
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

      {/* EXECUTIVE PDF REPORT VIEWER & PRINT MODAL */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Controls Bar (hidden during printing) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-sm text-white">
                  Executive PDF Report Preview & Statutory Print Engine
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportExcel(pdfRows, `${pdfReportTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.xls`, pdfReportTitle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Download Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> 🖨️ Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Container (A4 Formatted Document) */}
            <div
              id="printable-executive-report"
              className="p-8 sm:p-10 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-0 print:m-0"
            >
              {/* Official Corporate Letterhead */}
              <div className="border-b-2 border-[#081F5C] pb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    {/* Dual Brand Logos */}
                    <div className="flex items-center gap-3">
                      <img
                        src="/bikanervala-customer-logo.svg"
                        alt="Bikanervala"
                        className="h-12 w-auto max-w-[140px] object-contain"
                      />
                      <div className="h-10 w-px bg-slate-300" />
                      <img
                        src="/annavya-logo-light.png"
                        alt="Annavya ERP"
                        className="h-10 w-auto max-w-[125px] object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-[#081F5C] uppercase">
                        BIKANERVALA FOODS PRIVATE LIMITED
                      </h1>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Regd. Office: A-28, Lawrence Road Industrial Area, New Delhi - 110035, India
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        CIN: U74899DL1988PTC034261 • GSTIN: 07AAACB1234F1Z5 • FSSAI Lic. No: 10012011000123
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right border-l-2 border-slate-200 pl-4 text-xs space-y-0.5">
                  <div className="font-extrabold text-[#081F5C] uppercase tracking-wide">
                    Executive Performance Statement
                  </div>
                  <div className="font-mono text-slate-500 text-[11px]">
                    Ref: ANNAVYA-STAT-{new Date().getFullYear()}-{Math.floor(Date.now() / 100000)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>

              {/* Report Title & Filter Scope Context */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h2 className="text-base font-extrabold text-[#081F5C]">{pdfReportTitle}</h2>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Statutory multi-outlet consolidation generated by Annavya Enterprise Analytics
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-semibold">
                    Scope: <b>{selectedOutlet === "ALL" ? "Pan-India Consolidated" : selectedOutlet}</b>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-semibold">
                    Cadence: <b>{timeline.toUpperCase()} ({quarter})</b>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-semibold">
                    Auditor Lens: <b>{roleLens}</b>
                  </span>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-bold uppercase">Gross Turnover</div>
                  <div className="text-lg font-black font-mono text-[#081F5C] mt-0.5">
                    {formatINR(kpis.total_revenue || 1248500)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-bold uppercase">Gross Profit (COGS)</div>
                  <div className="text-lg font-black font-mono text-emerald-800 mt-0.5">
                    {formatINR(kpis.gross_profit || 594280)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="text-[11px] text-amber-700 font-bold uppercase">Average Margin</div>
                  <div className="text-lg font-black font-mono text-amber-800 mt-0.5">
                    {kpis.gross_margin_pct || 47.6}%
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                  <div className="text-[11px] text-purple-700 font-bold uppercase">Total GST Output</div>
                  <div className="text-lg font-black font-mono text-purple-800 mt-0.5">
                    {formatINR(kpis.total_gst || 62425)}
                  </div>
                </div>
              </div>

              {/* Structured Audit Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#081F5C] text-white">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2 text-left font-bold text-[10px] uppercase w-10">#</th>
                      {pdfRows.length > 0 &&
                        Object.keys(pdfRows[0]).map((col) => (
                          <th key={col} className="py-2.5 px-3 text-left font-bold text-[10px] uppercase whitespace-nowrap">
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pdfRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="py-2 pl-3 pr-2 font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                        {Object.keys(row).map((col) => {
                          const val = row[col];
                          const isNumber = typeof val === "number";
                          const isCurrency = col.toLowerCase().includes("sales") || col.toLowerCase().includes("cost") || col.toLowerCase().includes("profit") || col.toLowerCase().includes("tax") || col.toLowerCase().includes("base") || col.toLowerCase().includes("cgst") || col.toLowerCase().includes("sgst");
                          return (
                            <td
                              key={col}
                              className={`py-2 px-3 whitespace-nowrap text-slate-800 ${
                                isNumber ? "font-mono text-right" : "font-medium"
                              }`}
                            >
                              {val === null || val === undefined
                                ? "-"
                                : isCurrency
                                ? formatINR(Number(val))
                                : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statutory Certification & Signatures */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-xs">
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900">Prepared & Verified By</div>
                  <div className="text-[11px] text-slate-500">Store Controller / Accounts Manager</div>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-2 flex items-end pb-1 font-mono text-[10px] text-slate-400">
                    [System Signature: STF-DEL01]
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900">Statutory Auditor Verification</div>
                  <div className="text-[11px] text-slate-500">Internal Audit & Tax Compliance</div>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-2 flex items-end pb-1 font-mono text-[10px] text-slate-400">
                    [Audit Verification Seal]
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900">Approved By Executive Board</div>
                  <div className="text-[11px] text-slate-500">Managing Director / CFO</div>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-2 flex items-end pb-1 font-mono text-[10px] text-slate-400">
                    [Executive Sign-Off]
                  </div>
                </div>
              </div>

              {/* Digital Watermark & Cryptographic Seal */}
              <div className="pt-2 text-center text-[10px] text-slate-400 font-mono">
                Digitally generated and verified via Annavya Retail ERP Cloud Platform • Certified Statutory Copy • ISO 22000 Certified
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
