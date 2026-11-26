import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  PieChart,
  UserCheck,
  FileSpreadsheet,
  Printer,
  Download,
  X,
  RefreshCw,
  Calendar,
  Layers,
  Percent,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";

interface AdminRetailReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOutlet: string;
  outletName?: string;
}

export const AdminRetailReportsModal: React.FC<AdminRetailReportsModalProps> = ({
  isOpen,
  onClose,
  activeOutlet,
  outletName = "Bikanervala Karol Bagh Flagship",
}) => {
  const [reportTab, setReportTab] = useState<
    "register" | "hourly" | "category" | "cashier" | "gst"
  >("register");
  const [loading, setLoading] = useState(false);

  const [registerData, setRegisterData] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [cashierData, setCashierData] = useState<any[]>([]);
  const [gstData, setGstData] = useState<any[]>([]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [reg, hour, cat, cash, gst] = await Promise.all([
        apiFetch<any>(`/api/pos/reports/register?outlet_code=${activeOutlet}`),
        apiFetch<any>(`/api/pos/reports/hourly-sales?outlet_code=${activeOutlet}`),
        apiFetch<any>(`/api/pos/reports/category-performance?outlet_code=${activeOutlet}`),
        apiFetch<any>(`/api/pos/reports/cashier-productivity?outlet_code=${activeOutlet}`),
        apiFetch<any>(`/api/pos/reports/gst-summary?outlet_code=${activeOutlet}`),
      ]);
      setRegisterData(reg);
      setHourlyData(hour?.hourly_data || []);
      setCategoryData(cat?.categories || []);
      setCashierData(cash?.cashiers || []);
      setGstData(gst?.slabs || []);
    } catch (e) {
      console.error("Could not load retail reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReportData();
    }
  }, [isOpen, activeOutlet]);

  if (!isOpen) return null;

  const exportCurrentTabToCsv = () => {
    let rows: any[] = [];
    let filename = `bikanervala_${reportTab}_report_${activeOutlet}.csv`;

    if (reportTab === "register") {
      rows = (registerData?.counters_report || []).map((r: any) => ({
        Counter_ID: r.counter_id,
        Counter_Name: r.counter_name,
        Cashier: r.cashier_name,
        Terminal_IP: r.terminal_ip,
        Total_Bills: r.total_bills,
        Paid_Bills: r.paid_bills,
        Revenue: r.total_revenue,
        Discount: r.total_discount,
        Tax: r.total_tax,
      }));
    } else if (reportTab === "hourly") {
      rows = hourlyData.map((h: any) => ({
        Hour: `${h.hour_of_day}:00 - ${h.hour_of_day + 1}:00`,
        Bills_Count: h.bills_count,
        Total_Sales: h.total_sales,
        Avg_Bill_Value: h.avg_bill_value,
      }));
    } else if (reportTab === "category") {
      rows = categoryData.map((c: any) => ({
        Category: c.category,
        Items_Count: c.items_count,
        Total_Qty: c.total_qty,
        Sales_Revenue: c.total_sales,
      }));
    } else if (reportTab === "cashier") {
      rows = cashierData.map((c: any) => ({
        Cashier: c.cashier_name,
        Counter: c.counter_name,
        Bills_Processed: c.total_bills,
        Revenue: c.total_revenue,
        Discounts: c.total_discounts,
        Avg_Ticket: c.avg_ticket_size,
      }));
    } else if (reportTab === "gst") {
      rows = gstData.map((g: any) => ({
        Slab: g.rate,
        Taxable_Amount: g.taxable,
        CGST: g.cgst,
        SGST: g.sgst,
        Total_Tax: g.total_tax,
      }));
    }

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]).join(",");
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows.map((r) => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printCurrentReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#081F5C] via-[#0E328A] to-[#1242BA] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">Admin Retail POS Business Intelligence</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#081F5C] font-black text-[10px] uppercase">
                  Reports Suite
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Audited cash reconciliation, rush hour trends, category yields & cashier KPIs for {activeOutlet}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCurrentTabToCsv}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={printCurrentReport}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print A4</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "register", label: "Cash Counter Register", icon: FileSpreadsheet },
              { id: "hourly", label: "Hourly Rush Analysis", icon: Clock },
              { id: "category", label: "Category & Sweets Performance", icon: PieChart },
              { id: "cashier", label: "Cashier Productivity & Audit", icon: UserCheck },
              { id: "gst", label: "GST Tax Slab Breakdown", icon: Percent },
            ].map((t) => {
              const isActive = reportTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setReportTab(t.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isActive
                      ? "bg-[#081F5C] text-white shadow-md dark:bg-blue-600"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={loadReportData}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-800 dark:text-slate-200">
          {/* TAB 1: Counter Register & Drawer Reconciliation */}
          {reportTab === "register" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                    Total Revenue Today
                  </span>
                  <div className="text-xl font-extrabold text-[#081F5C] dark:text-blue-200 font-mono">
                    {formatINR(
                      (registerData?.counters_report || []).reduce(
                        (sum: number, r: any) => sum + (Number(r.total_revenue) || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    Invoices Paid
                  </span>
                  <div className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200 font-mono">
                    {(registerData?.counters_report || []).reduce(
                      (sum: number, r: any) => sum + (Number(r.paid_bills) || 0),
                      0
                    )}{" "}
                    Bills
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">
                    Total Discounts Given
                  </span>
                  <div className="text-xl font-extrabold text-purple-800 dark:text-purple-200 font-mono">
                    {formatINR(
                      (registerData?.counters_report || []).reduce(
                        (sum: number, r: any) => sum + (Number(r.total_discount) || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                    GST Collected
                  </span>
                  <div className="text-xl font-extrabold text-amber-800 dark:text-amber-200 font-mono">
                    {formatINR(
                      (registerData?.counters_report || []).reduce(
                        (sum: number, r: any) => sum + (Number(r.total_tax) || 0),
                        0
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Table of Counter Performance */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Counter ID & Name</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3">Terminal IP</th>
                      <th className="p-3 text-right">Total Bills</th>
                      <th className="p-3 text-right">Paid Bills</th>
                      <th className="p-3 text-right">Discounts</th>
                      <th className="p-3 text-right">Tax (CGST+SGST)</th>
                      <th className="p-3 text-right">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {(registerData?.counters_report || []).map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="font-mono text-blue-600 text-[11px]">{r.counter_id}</span>
                            <span>{r.counter_name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold">{r.cashier_name}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{r.terminal_ip}</td>
                        <td className="p-3 text-right font-mono font-bold">{r.total_bills}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{r.paid_bills}</td>
                        <td className="p-3 text-right font-mono text-purple-600">{formatINR(r.total_discount)}</td>
                        <td className="p-3 text-right font-mono text-amber-600">{formatINR(r.total_tax)}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-[#081F5C] dark:text-amber-300">
                          {formatINR(r.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Hourly Rush Analysis */}
          {reportTab === "hourly" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                  Peak Hour Footfall & Revenue Distribution
                </h4>
                <p className="text-[11px] text-slate-500">
                  Analyze high volume rush hours to plan sweet stock refills and cashier scheduling.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Time Window</th>
                      <th className="p-3 text-right">Bills Processed</th>
                      <th className="p-3 text-right">Average Bill Value (ABV)</th>
                      <th className="p-3 text-right">Total Revenue</th>
                      <th className="p-3">Volume Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {hourlyData.map((h: any, i: number) => {
                      const maxSales = Math.max(...hourlyData.map((x: any) => Number(x.total_sales) || 1));
                      const pct = Math.round(((Number(h.total_sales) || 0) / maxSales) * 100);
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {String(h.hour_of_day).padStart(2, "0")}:00 - {String(h.hour_of_day + 1).padStart(2, "0")}:00
                          </td>
                          <td className="p-3 text-right font-mono font-bold">{h.bills_count}</td>
                          <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatINR(h.avg_bill_value)}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-[#081F5C] dark:text-amber-300">
                            {formatINR(h.total_sales)}
                          </td>
                          <td className="p-3 w-48">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Category & Sweets Performance */}
          {reportTab === "category" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                  Category Mix & Top Selling Sweets
                </h4>
                <p className="text-[11px] text-slate-500">
                  Revenue contribution across Milk/Mithai Sweets, Ghee Sweets, Dry Fruits, Namkeen, and Chaat.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryData.map((cat: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-sm text-[#081F5C] dark:text-amber-300">
                        {cat.category}
                      </div>
                      <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                        {formatINR(cat.total_sales)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex justify-between">
                      <span>Total Quantity Sold: <b>{cat.total_qty} kg / units</b></span>
                      <span>Transactions: <b>{cat.items_count}</b></span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                        Sample Top Dishes:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(cat.sample_items || []).map((s: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-semibold border border-slate-200 dark:border-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Cashier Productivity */}
          {reportTab === "cashier" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                  Cashier Productivity & Audit Ledger
                </h4>
                <p className="text-[11px] text-slate-500">
                  Audit cashier speed, total collection, and manual discounts applied.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Cashier Staff</th>
                      <th className="p-3">Assigned Counter</th>
                      <th className="p-3 text-right">Bills Processed</th>
                      <th className="p-3 text-right">Discounts Given</th>
                      <th className="p-3 text-right">Average Ticket Size</th>
                      <th className="p-3 text-right">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {cashierData.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{c.cashier_name}</td>
                        <td className="p-3 font-semibold text-slate-600 dark:text-slate-400">{c.counter_name}</td>
                        <td className="p-3 text-right font-mono font-bold text-blue-600">{c.total_bills}</td>
                        <td className="p-3 text-right font-mono text-rose-600">{formatINR(c.total_discounts)}</td>
                        <td className="p-3 text-right font-mono">{formatINR(c.avg_ticket_size)}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-emerald-600">
                          {formatINR(c.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: GST Slab Summary */}
          {reportTab === "gst" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                  GST Tax Slab Breakdown (Statutory Compliance)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Taxable value and tax liability for monthly GSTR-1 and GSTR-3B filings.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">GST Tax Slab</th>
                      <th className="p-3 text-right">Taxable Turnover (₹)</th>
                      <th className="p-3 text-right">CGST (₹)</th>
                      <th className="p-3 text-right">SGST (₹)</th>
                      <th className="p-3 text-right">Total GST Liability (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {gstData.map((g: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{g.rate}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatINR(g.taxable)}</td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(g.cgst)}</td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(g.sgst)}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-amber-600">
                          {formatINR(g.total_tax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Outlet: <b>{outletName}</b> • Generated from live transactional ledger.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#081F5C] hover:bg-[#1242BA] text-white font-extrabold text-xs"
          >
            Close Reports
          </button>
        </div>
      </div>
    </div>
  );
};
