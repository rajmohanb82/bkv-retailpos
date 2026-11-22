import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Printer,
  Search,
  RefreshCw,
  Building2,
  DollarSign,
  Package,
  Truck,
  Layers,
  ArrowUpDown,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";

export const StoresReportsPanel: React.FC = () => {
  const [activeReport, setActiveReport] = useState<
    "item_stock" | "total_inventory" | "vendor_procurement"
  >("item_stock");
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [itemStockData, setItemStockData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [vendorData, setVendorData] = useState<any[]>([]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeReport === "item_stock") {
        const res = await apiFetch<any[]>("/api/stores/reports/item-wise-stock");
        setItemStockData(res || []);
      } else if (activeReport === "total_inventory") {
        const res = await apiFetch<any[]>("/api/stores/reports/total-inventory");
        setInventoryData(res || []);
      } else if (activeReport === "vendor_procurement") {
        const res = await apiFetch<any[]>("/api/stores/reports/vendor-procurement");
        setVendorData(res || []);
      }
    } catch (err: any) {
      console.error("Failed to load stores report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeReport]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    let rows: any[] = [];
    let title = "";

    if (activeReport === "item_stock") {
      rows = itemStockData;
      title = "Stores_Item_Wise_Stock_Ledger";
    } else if (activeReport === "total_inventory") {
      rows = inventoryData;
      title = "Stores_Total_Inventory_Valuation";
    } else if (activeReport === "vendor_procurement") {
      rows = vendorData;
      title = "Stores_Vendor_Procurement_Ledger";
    }

    if (rows.length === 0) {
      alert("No data available to export.");
      return;
    }

    const keys = Object.keys(rows[0]);
    let csvContent =
      "data:text/csv;charset=utf-8," +
      keys.join(",") +
      "\n" +
      rows
        .map((row) =>
          keys
            .map((k) => {
              const val = row[k];
              return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
            })
            .join(",")
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print A4 Report
  const handlePrintReport = () => {
    window.print();
  };

  // Filtered rows
  const filteredItemStock = itemStockData.filter(
    (r) =>
      !searchFilter ||
      r.sku?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredInventory = inventoryData.filter(
    (r) =>
      !searchFilter ||
      r.store_code?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.outlet_code?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredVendors = vendorData.filter(
    (r) =>
      !searchFilter ||
      r.vendor_code?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.trade_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.contact_person?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Report Switcher Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            {
              id: "item_stock",
              label: "📦 Item-wise Stock & Movement",
              desc: "SKU Valuation & Movement Ledger",
            },
            {
              id: "total_inventory",
              label: "🏬 Total Inventory Valuation",
              desc: "Store-wise Asset & Aging Analysis",
            },
            {
              id: "vendor_procurement",
              label: "🤝 Vendor Procurement Ledger",
              desc: "Vendor Spend, Lead Time & FSSAI",
            },
          ].map((rep) => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap text-left ${
                activeReport === rep.id
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <div>{rep.label}</div>
              <div
                className={`text-[10px] ${
                  activeReport === rep.id ? "text-blue-100" : "text-slate-500"
                }`}
              >
                {rep.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={loadReportData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter report records in real-time..."
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>

      {/* Report 1: Item-wise Stock & Movement Ledger */}
      {activeReport === "item_stock" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Item-wise Stock, Valuation & Movement Ledger
              </h3>
              <p className="text-slate-500 text-xs">
                Comprehensive stock valuation, active batches, and historical inward/outward ledger
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {filteredItemStock.length} SKUs Listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">SKU & Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">Min ROP</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Total Valuation</th>
                  <th className="py-2.5 px-3 text-right">Total Inward</th>
                  <th className="py-2.5 px-3 text-right">Total Issued</th>
                  <th className="py-2.5 px-3 text-center">Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItemStock.map((row) => (
                  <tr
                    key={row.sku}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {row.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {row.sku}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                      {row.current_stock} {row.inventory_uom}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {row.min_par_level} {row.inventory_uom}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      ₹{row.cost_price}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                      {formatINR(row.total_valuation)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-600 font-bold">
                      {row.total_inward_qty} {row.inventory_uom}
                    </td>
                    <td className="py-2.5 px-3 text-right text-orange-600 font-bold">
                      {row.total_outward_qty} {row.inventory_uom}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {row.active_batches} Lots
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Total Inventory Valuation & Aging */}
      {activeReport === "total_inventory" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Total Stores Inventory Valuation & Shelf Aging
              </h3>
              <p className="text-slate-500 text-xs">
                Valuation per store, storage temperature zones, and FEFO risk categories
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {filteredInventory.length} Stores Tracked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Store Code & Name</th>
                  <th className="py-2.5 px-3">Outlet</th>
                  <th className="py-2.5 px-3">Temp Zone</th>
                  <th className="py-2.5 px-3 text-right">Items / Batches</th>
                  <th className="py-2.5 px-3 text-right">Total Qty (kg/L)</th>
                  <th className="py-2.5 px-3 text-right">Total Valuation</th>
                  <th className="py-2.5 px-3 text-right">Fresh (&gt;30d)</th>
                  <th className="py-2.5 px-3 text-right">Aging (8-29d)</th>
                  <th className="py-2.5 px-3 text-right">Expiry Risk (≤7d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInventory.map((row) => (
                  <tr
                    key={row.store_code}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {row.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {row.store_code} ({row.store_type})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                      {row.outlet_code}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.temp_zone === "Chilled"
                            ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {row.temp_zone}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.items_count} SKUs / {row.batches_count} Lots
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {row.total_qty}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                      {formatINR(row.total_value)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                      {formatINR(row.fresh_value)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 font-bold">
                      {formatINR(row.aging_value)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-black">
                      {formatINR(row.risk_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Vendor-wise Procurement & Lead Time Ledger */}
      {activeReport === "vendor_procurement" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Vendor-wise Procurement, Spend & Lead Time Ledger
              </h3>
              <p className="text-slate-500 text-xs">
                Vendor performance, materials supplied, total purchase spend, lead times & compliance
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {filteredVendors.length} Vendors Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Vendor Code & Trade Name</th>
                  <th className="py-2.5 px-3">Contact Person & Phone</th>
                  <th className="py-2.5 px-3">GSTIN & FSSAI</th>
                  <th className="py-2.5 px-3">Primary Materials Supplied</th>
                  <th className="py-2.5 px-3 text-right">Lead Time</th>
                  <th className="py-2.5 px-3 text-right">POs</th>
                  <th className="py-2.5 px-3 text-right">Total Procurement Spend</th>
                  <th className="py-2.5 px-3 text-center">Quality Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredVendors.map((row) => (
                  <tr
                    key={row.vendor_code}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {row.trade_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {row.vendor_code} • {row.payment_terms}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {row.contact_person}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {row.mobile}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                      <div>GST: {row.gstin}</div>
                      <div>FSSAI: {row.fssai_no}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {row.materials_supplied?.slice(0, 2).map((m: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[120px]"
                          >
                            {m}
                          </span>
                        ))}
                        {row.materials_supplied?.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{row.materials_supplied.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-sky-400">
                      {row.lead_time_days} Days
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                      {row.po_count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                      {formatINR(row.total_spend)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        ⭐ {row.quality_rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
