import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  FileSpreadsheet,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Ticket,
  Package,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { Outlet } from "../types";

interface CashierEodReportProps {
  outletCode: string;
  outlet?: Outlet;
  actorName?: string;
}

const TENDER_COLORS: Record<string, string> = {
  "Credit Card": "#4F46E5",
  Cash: "#059669",
  UPI: "#0284C7",
  "Food Coupon": "#D97706",
};

const TENDER_ICONS: Record<string, any> = {
  "Credit Card": CreditCard,
  Cash: Banknote,
  UPI: QrCode,
  "Food Coupon": Ticket,
};

export const CashierEodReport: React.FC<CashierEodReportProps> = ({
  outletCode,
  outlet,
  actorName = "Cashier",
}) => {
  const [scope, setScope] = useState<"today" | "all">("today");
  const [selectedCashier, setSelectedCashier] = useState<string>(actorName || "Priya Sharma");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<string>("ALL");
  const [openingFloat, setOpeningFloat] = useState<number>(5000);
  const [denominations, setDenominations] = useState<{ [denom: string]: number }>({
    "500": 0,
    "200": 0,
    "100": 0,
    "50": 0,
    "20": 0,
    "10": 0,
    coins: 0,
  });
  const [reconcileSuccess, setReconcileSuccess] = useState(false);

  const loadEod = async () => {
    setLoading(true);
    try {
      const cashierParam = selectedCashier ? `&cashier_id=${encodeURIComponent(selectedCashier)}` : "";
      const res = await apiFetch<any>(
        `/api/pos/reports/eod?outlet_code=${encodeURIComponent(outletCode)}&scope=${scope}${cashierParam}`
      );
      setData(res);
      if (res?.drawer_reconciliation) {
        setOpeningFloat(Number(res.drawer_reconciliation.opening_cash || 5000));
        if (res.drawer_reconciliation.declared_cash) {
          // If already declared in shift
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEod();
  }, [outletCode, scope, selectedCashier]);

  const summary = data?.summary || {};
  const tenderBreakdown: any[] = data?.tender_breakdown || [];
  const productBreakdown: any[] = data?.product_breakdown || [];
  const ordersLedger: any[] = data?.orders_ledger || [];
  const availableCashiers: string[] = data?.available_cashiers || [
    "Priya Sharma",
    "Meera Kapoor",
    "Rajeshwar Agarwal",
  ];

  const cashSales = Number(summary.cash_total || 0);
  const physicalCountedCash =
    (denominations["500"] || 0) * 500 +
    (denominations["200"] || 0) * 200 +
    (denominations["100"] || 0) * 100 +
    (denominations["50"] || 0) * 50 +
    (denominations["20"] || 0) * 20 +
    (denominations["10"] || 0) * 10 +
    (denominations["coins"] || 0);

  const expectedDrawerCash = openingFloat + cashSales;
  const drawerVariance = physicalCountedCash > 0 ? Number((physicalCountedCash - expectedDrawerCash).toFixed(2)) : 0;
  const isDrawerMatched = physicalCountedCash > 0 && Math.abs(drawerVariance) < 0.01;

  const handleReconcileDrawer = async () => {
    try {
      await apiFetch("/api/pos/reports/eod/declare-drawer", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: outletCode,
          cashier_id: selectedCashier,
          opening_cash: openingFloat,
          declared_cash: physicalCountedCash > 0 ? physicalCountedCash : expectedDrawerCash,
          denominations,
        }),
      });
      setReconcileSuccess(true);
      loadEod();
      setTimeout(() => setReconcileSuccess(false), 4500);
    } catch (e: any) {
      alert(e.message || "Failed to save drawer reconciliation");
    }
  };

  const filteredLedger = ordersLedger.filter((o) => {
    if (ledgerFilter === "ALL") return true;
    if (ledgerFilter === "UNPAID") return o.status === "ESTIMATE_GENERATED";
    if (ledgerFilter === "Credit Card") return Number(o.credit_card_amt) > 0;
    if (ledgerFilter === "Cash") return Number(o.cash_amt) > 0;
    if (ledgerFilter === "UPI") return Number(o.upi_amt) > 0;
    if (ledgerFilter === "Food Coupon") return Number(o.food_coupon_amt) > 0;
    return true;
  });

  const downloadAccountsCsv = () => {
    if (!data) return;
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [];

    lines.push("ANNAVYA FOOD RETAIL ERP - CASHIER EoD & ACCOUNTS RECONCILIATION REPORT");
    lines.push(`Outlet,${esc(outletCode)},Cashier,${esc(actorName)},Generated,${esc(new Date().toLocaleString("en-IN"))}`);
    lines.push("");

    lines.push("SECTION 1: TENDER CATEGORY SUMMARY");
    lines.push("Tender Category,Order Count,Amount (INR),Share %");
    for (const t of tenderBreakdown) {
      lines.push([esc(t.category), t.order_count, Number(t.amount).toFixed(2), `${t.share_pct}%`].join(","));
    }
    lines.push(["TOTAL COLLECTED", summary.paid_orders || 0, Number(summary.total_collected || 0).toFixed(2), "100%"].join(","));
    lines.push("");

    lines.push("SECTION 2: PRODUCT-WISE SALES SUMMARY");
    lines.push("SKU,Product Name,UOM,Qty/Wt Sold,Orders,GST %,Gross Sales (INR)");
    for (const p of productBreakdown) {
      lines.push([esc(p.sku), esc(p.name), esc(p.uom), p.qty_sold, p.order_count, `${p.gst_pct}%`, Number(p.gross_amount).toFixed(2)].join(","));
    }
    lines.push("");

    lines.push("SECTION 3: ACCOUNTS ORDER-BY-ORDER RECONCILIATION LEDGER");
    lines.push("Estimate No,Invoice No,Status,Subtotal,Discount,GST,Grand Total,Credit Card,Cash,UPI,Food Coupon,Splits Sum,Variance,Accounts Match,Cashier,Delivery Staff");
    for (const o of ordersLedger) {
      lines.push(
        [
          esc(o.estimate_no),
          esc(o.invoice_no || "-"),
          esc(o.status),
          Number(o.subtotal).toFixed(2),
          Number(o.discount_amount).toFixed(2),
          Number(o.gst_total).toFixed(2),
          Number(o.grand_total).toFixed(2),
          Number(o.credit_card_amt).toFixed(2),
          Number(o.cash_amt).toFixed(2),
          Number(o.upi_amt).toFixed(2),
          Number(o.food_coupon_amt).toFixed(2),
          Number(o.splits_total).toFixed(2),
          Number(o.variance).toFixed(2),
          o.status === "ESTIMATE_GENERATED" ? "UNPAID" : o.matched ? "MATCHED" : "MISMATCH",
          esc(o.cashier_id || "-"),
          esc(o.delivery_staff || "-"),
        ].join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Annavya_Cashier_EoD_${outletCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGraphicalPdf = () => {
    if (!data) return;
    const maxTender = Math.max(1, ...tenderBreakdown.map((t) => Number(t.amount || 0)));
    const maxProd = Math.max(1, ...productBreakdown.slice(0, 8).map((p) => Number(p.gross_amount || 0)));

    // Build inline SVG Donut Chart for the 4 Tender Categories
    const totalCol = Math.max(0.01, Number(summary.total_collected || 0));
    let cumulative = 0;
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const donutSegments = tenderBreakdown
      .filter((t) => Number(t.amount) > 0)
      .map((t) => {
        const frac = Number(t.amount) / totalCol;
        const dash = frac * circumference;
        const offset = -cumulative * circumference;
        cumulative += frac;
        const color = TENDER_COLORS[t.category] || "#081F5C";
        return `<circle r="${radius}" cx="80" cy="80" fill="transparent" stroke="${color}" stroke-width="26" stroke-dasharray="${dash} ${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 80 80)" />`;
      })
      .join("");

    // Inline SVG Horizontal Product Revenue Bars
    const prodBarsSvg = productBreakdown
      .slice(0, 8)
      .map((p, idx) => {
        const y = 12 + idx * 28;
        const w = Math.max(6, (Number(p.gross_amount) / maxProd) * 240);
        return `
          <text x="0" y="${y + 13}" font-size="10" fill="#1e293b" font-weight="600">${String(p.name).slice(0, 26)}</text>
          <rect x="175" y="${y}" width="${w}" height="16" rx="4" fill="#1246A8" />
          <text x="${182 + w}" y="${y + 12}" font-size="10" fill="#0f172a" font-weight="700">Rs.${Number(p.gross_amount).toFixed(0)} (${p.qty_sold}${p.uom})</text>
        `;
      })
      .join("");

    // Inline SVG Tender Category Bars
    const tenderBarsHtml = tenderBreakdown
      .map((t) => {
        const pct = Math.round((Number(t.amount) / maxTender) * 100);
        const color = TENDER_COLORS[t.category] || "#081F5C";
        return `
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px;">
              <span>${t.category} (${t.order_count} orders)</span>
              <span>Rs.${Number(t.amount).toFixed(2)} (${t.share_pct}%)</span>
            </div>
            <div style="height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${color};"></div>
            </div>
          </div>
        `;
      })
      .join("");

    const prodRowsHtml = productBreakdown
      .map(
        (p) => `
        <tr>
          <td>${p.sku}</td>
          <td><b>${p.name}</b></td>
          <td style="text-align:right;">${p.qty_sold} ${p.uom}</td>
          <td style="text-align:right;">${p.order_count}</td>
          <td style="text-align:right;">${p.gst_pct}%</td>
          <td style="text-align:right;"><b>Rs.${Number(p.gross_amount).toFixed(2)}</b></td>
        </tr>`
      )
      .join("");

    const ledgerRowsHtml = ordersLedger
      .map(
        (o) => `
        <tr>
          <td style="font-family:monospace;">${o.invoice_no || o.estimate_no}</td>
          <td>${o.status}</td>
          <td style="text-align:right;">Rs.${Number(o.grand_total).toFixed(2)}</td>
          <td style="text-align:right;">${Number(o.credit_card_amt) > 0 ? "Rs." + Number(o.credit_card_amt).toFixed(2) : "-"}</td>
          <td style="text-align:right;">${Number(o.cash_amt) > 0 ? "Rs." + Number(o.cash_amt).toFixed(2) : "-"}</td>
          <td style="text-align:right;">${Number(o.upi_amt) > 0 ? "Rs." + Number(o.upi_amt).toFixed(2) : "-"}</td>
          <td style="text-align:right;">${Number(o.food_coupon_amt) > 0 ? "Rs." + Number(o.food_coupon_amt).toFixed(2) : "-"}</td>
          <td style="text-align:center;font-weight:700;color:${
            o.status === "ESTIMATE_GENERATED" ? "#b45309" : o.matched ? "#047857" : "#be123c"
          };">${o.status === "ESTIMATE_GENERATED" ? "PENDING" : o.matched ? "MATCHED" : "DIFF " + o.variance}</td>
        </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cashier EoD & Drawer Reconciliation - ${selectedCashier} - ${outletCode}</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #081F5C; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 16px; font-weight: 800; color: #081F5C; letter-spacing: -0.3px; }
  .kpis { display:grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 12px; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px; background: #f8fafc; }
  .kpi .lbl { font-size: 9px; color: #475569; text-transform: uppercase; font-weight: 700; }
  .kpi .val { font-size: 13px; font-weight: 800; color: #081F5C; margin-top: 2px; }
  .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px; background: #fff; margin-bottom: 10px; }
  .card h3 { margin: 0 0 6px 0; font-size: 11.5px; color: #081F5C; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9.5px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
  th { background: #081F5C; color: #fff; font-weight: 700; }
  .sign { display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; text-align:center; font-size: 10px; }
  .sign div { border-top: 1px solid #334155; padding-top: 5px; font-weight: 700; }
</style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="/bikanervala-logo.png" style="height:42px;object-fit:contain;" onerror="this.style.display='none'" />
      <div style="height:32px;width:1.5px;background:#cbd5e1;"></div>
      <img src="/annavya-badge-light.png" style="height:38px;object-fit:contain;" />
      <div>
        <div class="brand">CASHIER END-OF-DAY (EoD) &amp; DRAWER RECONCILIATION</div>
        <div style="font-size:10px;color:#475569;">${outlet?.trade_name || outletCode} • ${outlet?.legal_name || "Retail Outlet"} | GSTIN: ${outlet?.gstin || "07AAACA5678A1ZY"}</div>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;">
      <div><b>Cashier:</b> <span style="color:#081F5C;font-size:12px;font-weight:800;">${selectedCashier}</span></div>
      <div><b>Terminal ID:</b> TERM-${outletCode}-POS1</div>
      <div><b>Shift:</b> ${data?.drawer_reconciliation?.shift_no || "SHF-01"}</div>
      <div><b>Printed:</b> ${new Date().toLocaleString("en-IN")}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="lbl">Credit Card</div><div class="val" style="color:#4F46E5;">Rs.${Number(summary.credit_card_total || 0).toFixed(2)}</div></div>
    <div class="kpi"><div class="lbl">Cash Sales</div><div class="val" style="color:#059669;">Rs.${Number(summary.cash_total || 0).toFixed(2)}</div></div>
    <div class="kpi"><div class="lbl">UPI / QR</div><div class="val" style="color:#0284C7;">Rs.${Number(summary.upi_total || 0).toFixed(2)}</div></div>
    <div class="kpi"><div class="lbl">Food Coupon</div><div class="val" style="color:#D97706;">Rs.${Number(summary.food_coupon_total || 0).toFixed(2)}</div></div>
    <div class="kpi"><div class="lbl">Gross Sales</div><div class="val" style="color:#081F5C;">Rs.${Number(summary.gross_sales || 0).toFixed(2)}</div></div>
    <div class="kpi"><div class="lbl">Total Collected</div><div class="val" style="color:#047857;">Rs.${Number(summary.total_collected || 0).toFixed(2)}</div></div>
  </div>

  <!-- Cash Drawer Balance & Reconciliation Statement -->
  <div class="card" style="border: 2px solid ${isDrawerMatched ? '#059669' : '#d97706'}; background:${isDrawerMatched ? '#f0fdf4' : '#fffbeb'};">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${isDrawerMatched ? '#86efac' : '#fde68a'};padding-bottom:5px;margin-bottom:6px;">
      <h3 style="margin:0;color:${isDrawerMatched ? '#065f46' : '#92400e'};font-size:11.5px;">
        💵 CASH DRAWER BALANCE &amp; PHYSICAL CASH RECONCILIATION
      </h3>
      <span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px;background:${isDrawerMatched ? '#059669' : '#d97706'};color:#fff;">
        ${isDrawerMatched ? 'DRAWER BALANCED & MATCHED (Rs.0.00 Variance)' : drawerVariance !== 0 ? 'DRAWER VARIANCE: Rs.' + drawerVariance.toFixed(2) : 'DRAWER COUNT BALANCED'}
      </span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:8px;font-size:10px;">
      <div>
        <div style="font-size:9px;color:#64748b;font-weight:700;">1. OPENING FLOAT</div>
        <div style="font-size:13px;font-weight:800;color:#0f172a;margin-top:2px;">Rs.${openingFloat.toFixed(2)}</div>
      </div>
      <div>
        <div style="font-size:9px;color:#64748b;font-weight:700;">2. CASH SALES (SYSTEM)</div>
        <div style="font-size:13px;font-weight:800;color:#059669;margin-top:2px;">Rs.${cashSales.toFixed(2)}</div>
      </div>
      <div>
        <div style="font-size:9px;color:#64748b;font-weight:700;">3. EXPECTED CASH IN DRAWER</div>
        <div style="font-size:13px;font-weight:800;color:#081F5C;margin-top:2px;">Rs.${expectedDrawerCash.toFixed(2)}</div>
      </div>
      <div>
        <div style="font-size:9px;color:#64748b;font-weight:700;">4. PHYSICAL CASH COUNTED</div>
        <div style="font-size:13px;font-weight:800;color:${isDrawerMatched ? '#059669' : '#b45309'};margin-top:2px;">Rs.${(physicalCountedCash > 0 ? physicalCountedCash : expectedDrawerCash).toFixed(2)}</div>
      </div>
      <div>
        <div style="font-size:9px;color:#64748b;font-weight:700;">5. DRAWER VARIANCE</div>
        <div style="font-size:13px;font-weight:800;color:${isDrawerMatched ? '#059669' : '#dc2626'};margin-top:2px;">Rs.${drawerVariance.toFixed(2)}</div>
      </div>
    </div>
    ${physicalCountedCash > 0 ? `
    <div style="margin-top:6px;padding-top:5px;border-top:1px dashed #cbd5e1;font-size:9.5px;display:flex;gap:10px;flex-wrap:wrap;color:#334155;">
      <b>Physical Denominations:</b>
      <span>₹500 × ${denominations['500'] || 0} = ₹${(denominations['500'] || 0)*500}</span>
      <span>₹200 × ${denominations['200'] || 0} = ₹${(denominations['200'] || 0)*200}</span>
      <span>₹100 × ${denominations['100'] || 0} = ₹${(denominations['100'] || 0)*100}</span>
      <span>₹50 × ${denominations['50'] || 0} = ₹${(denominations['50'] || 0)*50}</span>
      <span>₹20 × ${denominations['20'] || 0} = ₹${(denominations['20'] || 0)*20}</span>
      <span>₹10 × ${denominations['10'] || 0} = ₹${(denominations['10'] || 0)*10}</span>
      <span>Coins = ₹${denominations['coins'] || 0}</span>
    </div>` : ''}
  </div>

  <div class="card" style="margin-bottom:10px;">
    <h3>Tender Category Summary</h3>
    <table>
      <thead>
        <tr><th>Tender Mode</th><th style="text-align:right;">Order Count</th><th style="text-align:right;">Collected Amount</th><th style="text-align:right;">Share %</th></tr>
      </thead>
      <tbody>
        ${tenderBreakdown.map((t) => `
          <tr>
            <td><b>${t.category}</b></td>
            <td style="text-align:right;">${t.order_count}</td>
            <td style="text-align:right;">Rs.${Number(t.amount).toFixed(2)}</td>
            <td style="text-align:right;">${t.share_pct}%</td>
          </tr>
        `).join("")}
        <tr style="background:#f1f5f9;font-weight:700;">
          <td>TOTAL COLLECTED</td>
          <td style="text-align:right;">${summary.paid_orders || 0}</td>
          <td style="text-align:right;">Rs.${Number(summary.total_collected || 0).toFixed(2)}</td>
          <td style="text-align:right;">100%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="card" style="margin-bottom:10px;">
    <h3>Product-Wise Sales Summary (${productBreakdown.length} SKUs)</h3>
    <table>
      <thead>
        <tr><th>SKU</th><th>Product Name</th><th style="text-align:right;">Qty / Wt Sold</th><th style="text-align:right;">Orders</th><th style="text-align:right;">GST %</th><th style="text-align:right;">Gross Amount</th></tr>
      </thead>
      <tbody>${prodRowsHtml || "<tr><td colspan='6'>No paid product sales yet</td></tr>"}</tbody>
    </table>
  </div>

  <div class="card">
    <h3>Accounts Order-to-Tender Reconciliation Ledger (Unmatched: ${summary.unmatched_orders || 0})</h3>
    <table>
      <thead>
        <tr><th>Order / Invoice #</th><th>Status</th><th style="text-align:right;">Grand Total</th><th style="text-align:right;">Credit Card</th><th style="text-align:right;">Cash</th><th style="text-align:right;">UPI</th><th style="text-align:right;">Food Coupon</th><th style="text-align:center;">Match</th></tr>
      </thead>
      <tbody>${ledgerRowsHtml}</tbody>
    </table>
  </div>

  <div class="sign">
    <div>Cashier Signature (${selectedCashier})</div>
    <div>Shop Manager Verification</div>
    <div>Accounts Department Sign-off</div>
  </div>
</body>
</html>`;

    const existing = document.getElementById("annavya-eod-pdf-frame");
    if (existing) existing.remove();
    const iframe = document.createElement("iframe");
    iframe.id = "annavya-eod-pdf-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow?.document;
    if (idoc) {
      idoc.open();
      idoc.write(html);
      idoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 200);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-annavya-navy">
            Cashier End-of-Day (EoD) & Accounts Reconciliation ({outletCode})
          </h3>
          <p className="text-xs text-slate-500">
            Tender breakdown (Credit Card, Cash, UPI, Food Coupon), Product-wise sales & order-to-account matching
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-xs font-bold text-slate-500">Cashier:</span>
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="text-xs font-extrabold text-annavya-navy bg-transparent outline-none cursor-pointer"
            >
              {availableCashiers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="ALL">All Cashiers</option>
            </select>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => setScope("today")}
              className={`px-3 py-1.5 rounded-lg ${
                scope === "today" ? "bg-annavya-navy text-white" : "text-slate-600"
              }`}
            >
              Today Shift
            </button>
            <button
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 rounded-lg ${
                scope === "all" ? "bg-annavya-navy text-white" : "text-slate-600"
              }`}
            >
              All Outlet Orders
            </button>
          </div>
          <button
            onClick={loadEod}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={downloadAccountsCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Tabular CSV
          </button>
          <button
            onClick={downloadGraphicalPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-annavya-royal hover:bg-annavya-navy text-white text-xs font-bold shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Cashier EoD PDF Report
          </button>
        </div>
      </div>

      {/* Cash Drawer Balance & Physical Reconciliation Panel */}
      <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-extrabold text-annavya-navy flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Cash Drawer Balance & Physical Reconciliation ({selectedCashier})</span>
            </h4>
            <p className="text-xs text-slate-500">
              Terminal: TERM-{outletCode}-POS1 • Match drawer balance against cash sales + opening float
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                isDrawerMatched
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : drawerVariance !== 0
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isDrawerMatched ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>DRAWER BALANCED & MATCHED (₹0.00 Variance)</span>
                </>
              ) : drawerVariance !== 0 ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Variance: {formatINR(drawerVariance)} ({drawerVariance > 0 ? "Surplus" : "Shortage"})</span>
                </>
              ) : (
                <span>Count Drawer Cash to Reconcile</span>
              )}
            </span>
            <button
              onClick={handleReconcileDrawer}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              {reconcileSuccess ? "Saved & Reconciled ✓" : "Save & Reconcile Drawer"}
            </button>
          </div>
        </div>

        {/* 4 Reconciliation Stat Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">1. Opening Float</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                className="w-24 font-extrabold text-sm text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">2. Cash Sales (System)</span>
            <span className="font-extrabold text-sm text-emerald-700 block mt-1">
              {formatINR(cashSales)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">3. Expected in Drawer</span>
            <span className="font-extrabold text-sm text-annavya-navy block mt-1">
              {formatINR(expectedDrawerCash)}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isDrawerMatched ? "bg-emerald-50/60 border-emerald-200" : "bg-amber-50/60 border-amber-200"}`}>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">4. Counted in Drawer</span>
            <span className={`font-extrabold text-sm block mt-1 ${isDrawerMatched ? "text-emerald-700" : "text-amber-800"}`}>
              {formatINR(physicalCountedCash > 0 ? physicalCountedCash : expectedDrawerCash)}
            </span>
          </div>
        </div>

        {/* Cash Denomination Counter Grid */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Cash Denomination Counter (Count notes in physical drawer):</span>
            <span className="text-emerald-700 font-extrabold font-mono">
              Total Counted: {formatINR(physicalCountedCash)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { val: "500", mult: 500 },
              { val: "200", mult: 200 },
              { val: "100", mult: 100 },
              { val: "50", mult: 50 },
              { val: "20", mult: 20 },
              { val: "10", mult: 10 },
              { val: "coins", mult: 1, label: "Coins" },
            ].map((d) => (
              <div key={d.val} className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">
                  {d.label || `₹${d.val}`}
                </span>
                <input
                  type="number"
                  min="0"
                  value={denominations[d.val] || ""}
                  onChange={(e) =>
                    setDenominations((prev) => ({
                      ...prev,
                      [d.val]: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  placeholder="0"
                  className="w-full text-center font-mono font-bold text-xs py-1 px-1 border border-slate-200 rounded mt-1 outline-none"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  = ₹{((denominations[d.val] || 0) * d.mult).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Tender Category KPI Cards + Reconciliation Card */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {tenderBreakdown.map((t) => {
          const Icon = TENDER_ICONS[t.category] || CreditCard;
          const color = TENDER_COLORS[t.category] || "#081F5C";
          return (
            <div
              key={t.category}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{t.category}</span>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="text-xl font-extrabold text-annavya-navy mt-1">
                {formatINR(t.amount)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {t.order_count} orders • {t.share_pct}% share
              </div>
            </div>
          );
        })}

        <div className="bg-gradient-to-br from-[#081F5C] to-[#1246A8] text-white rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-200">
            Accounts Reconciliation
          </div>
          <div className="text-xl font-extrabold mt-1">
            {formatINR(summary.total_collected || 0)}
          </div>
          <div className="text-[11px] text-sky-100 mt-1 flex items-center gap-1">
            {(summary.unmatched_orders || 0) === 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>All {summary.paid_orders || 0} Paid Orders Matched</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>{summary.unmatched_orders} Mismatch(es)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Graphical Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-annavya-navy mb-2">
            Tender Share — Credit Card, Cash, UPI & Food Coupon
          </h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tenderBreakdown}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={82}
                  paddingAngle={3}
                  label={({ category, share_pct }) =>
                    share_pct > 0 ? `${category} (${share_pct}%)` : ""
                  }
                >
                  {tenderBreakdown.map((t) => (
                    <Cell
                      key={t.category}
                      fill={TENDER_COLORS[t.category] || "#1246A8"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatINR(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-annavya-navy mb-2">
            Product-Wise Sales Graph (Top SKUs by Revenue)
          </h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productBreakdown.slice(0, 7)}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="sku"
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: any) => formatINR(Number(v))}
                  labelFormatter={(lbl) => {
                    const item = productBreakdown.find((p) => p.sku === lbl);
                    return item ? `${item.name} (${item.qty_sold} ${item.uom})` : lbl;
                  }}
                />
                <Bar dataKey="gross_amount" fill="#1246A8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product-Wise Tabular Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
        <h4 className="text-sm font-bold text-annavya-navy flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-annavya-royal" />
          Product-Wise Sales Summary (Paid & Delivered Orders)
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="py-2">SKU Code</th>
              <th>Product Name</th>
              <th className="text-right">Qty / Wt Sold</th>
              <th className="text-right">Orders</th>
              <th className="text-right">GST %</th>
              <th className="text-right">Gross Sales (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productBreakdown.map((p) => (
              <tr key={p.sku}>
                <td className="py-2 font-mono text-[11px]">{p.sku}</td>
                <td className="font-semibold text-slate-900">{p.name}</td>
                <td className="text-right font-bold">
                  {p.qty_sold} {p.uom}
                </td>
                <td className="text-right">{p.order_count}</td>
                <td className="text-right">{p.gst_pct}%</td>
                <td className="text-right font-extrabold text-annavya-navy">
                  {formatINR(p.gross_amount)}
                </td>
              </tr>
            ))}
            {productBreakdown.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No paid product sales recorded yet in this view
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Accounts Reconciliation Order Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-annavya-navy">
            Accounts Reconciliation — Order-by-Order Payment Match ({filteredLedger.length})
          </h4>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {["ALL", "Credit Card", "Cash", "UPI", "Food Coupon", "UNPAID"].map((f) => (
              <button
                key={f}
                onClick={() => setLedgerFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-bold border ${
                  ledgerFilter === f
                    ? "bg-annavya-navy text-white border-annavya-navy"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="py-2">Estimate / Invoice #</th>
              <th>Status</th>
              <th className="text-right">Grand Total</th>
              <th className="text-right text-indigo-700">Credit Card</th>
              <th className="text-right text-emerald-700">Cash</th>
              <th className="text-right text-sky-700">UPI</th>
              <th className="text-right text-amber-700">Food Coupon</th>
              <th className="text-center">Accounts Match</th>
              <th>Cashier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLedger.map((o) => (
              <tr key={o.id}>
                <td className="py-2 font-mono text-[11px]">
                  <div className="font-bold text-annavya-navy">{o.invoice_no || o.estimate_no}</div>
                  {o.invoice_no && (
                    <div className="text-[10px] text-slate-400">{o.estimate_no}</div>
                  )}
                </td>
                <td>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.status === "DELIVERED_CLOSED"
                        ? "bg-emerald-100 text-emerald-800"
                        : o.status === "PAID_PENDING_DELIVERY"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="text-right font-extrabold">{formatINR(o.grand_total)}</td>
                <td className="text-right">{o.credit_card_amt > 0 ? formatINR(o.credit_card_amt) : "—"}</td>
                <td className="text-right">{o.cash_amt > 0 ? formatINR(o.cash_amt) : "—"}</td>
                <td className="text-right">{o.upi_amt > 0 ? formatINR(o.upi_amt) : "—"}</td>
                <td className="text-right">{o.food_coupon_amt > 0 ? formatINR(o.food_coupon_amt) : "—"}</td>
                <td className="text-center">
                  {o.status === "ESTIMATE_GENERATED" ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                      UNPAID
                    </span>
                  ) : o.matched ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      MATCHED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                      DIFF {formatINR(o.variance)}
                    </span>
                  )}
                </td>
                <td className="text-[11px] text-slate-600">{o.cashier_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

