import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Store,
  ShieldAlert,
  Factory,
  Package,
  RefreshCw,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";
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
} from "recharts";
import { apiFetch, formatINR } from "../api";

const COLORS = ["#0F2544", "#1355B3", "#45A7E6", "#D97706"];

export const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [ownership, setOwnership] = useState<string>("");
  const [outletType, setOutletType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (ownership) params.append("ownership_type", ownership);
      if (outletType) params.append("outlet_type", outletType);
      const res = await apiFetch(`/api/analytics/executive-dashboard?${params.toString()}`);
      setData(res);
    } catch (err: any) {
      console.error("Executive dashboard load error:", err);
      setErrorMsg(err.message || "Failed to load executive metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ownership, outletType]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-annavya-royal animate-spin" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Loading Executive Command Center...</div>
        <div className="text-xs text-slate-400">Aggregating chain-wide multi-entity revenue, factory yield & leakage KPIs</div>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="p-8 max-w-xl mx-auto my-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Unable to Load Executive Dashboard</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const k = data?.kpis || {};
  const leak = data?.leakage_monitor || {};

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-annavya-navy">
            CXO & Director Real-Time Command Center
          </h2>
          <p className="text-xs text-slate-500">
            Enterprise drill-down across CO, Franchised & DO entities, Factory Yield & Leakage Governance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={ownership}
            onChange={(e) => setOwnership(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
          >
            <option value="">All Ownerships (CO / FR / DO)</option>
            <option value="CO">Company Owned (CO)</option>
            <option value="Franchised">Franchised (FR)</option>
            <option value="DO">Director Owned (DO)</option>
          </select>
          <select
            value={outletType}
            onChange={(e) => setOutletType(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
          >
            <option value="">All Outlet Types</option>
            <option value="Sweet Shop">Sweet Shop</option>
            <option value="Restaurant + Sweet Shop">Hybrid (Restaurant + Sweet Shop)</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Manufacturing">Manufacturing</option>
          </select>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-annavya-navy text-white hover:bg-annavya-royal transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-annavya-navy to-annavya-royal text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between opacity-80 text-xs font-medium">
            <span>LIVE CHAIN REVENUE</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold mt-2">{formatINR(k.total_revenue)}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-sky-200">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Invoices: {k.invoice_count} • ABV: {formatINR(k.avg_bill_value)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>INVENTORY & EXPIRY RISK</span>
            <Package className="w-4 h-4 text-annavya-royal" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatINR(k.inv_valuation)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">
              Near-Expiry Risk: {formatINR(k.near_expiry_value)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>FACTORY YIELD & OUTPUT</span>
            <Factory className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {k.actual_production_kg} / {k.planned_production_kg} kg
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                Math.abs(Number(k.avg_yield_variance_pct)) > 2
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              Avg BOM Variance: {k.avg_yield_variance_pct}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>DISCOUNT & LEAKAGE WATCH</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatINR(leak.total_discount_given)}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex gap-2">
            <span>Open Estimates: <b>{leak.unconverted_estimates}</b></span>
            <span>•</span>
            <span>Cancelled KOTs: <b>{leak.cancelled_kots}</b></span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-annavya-navy mb-1">
            Ownership Mix Performance (CO vs Franchised vs DO)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Consolidated multi-entity revenue & gross margin visibility
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.ownership_mix || []}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatINR(v)} />
                <Bar dataKey="revenue" fill="#1355B3" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-annavya-navy mb-1">
            Channel Revenue Mix
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Sweet Shop POS vs Restaurant KOT vs OMS Bulk vs Online Aggregators
          </p>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={data?.channel_mix || []}
                  dataKey="value"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={3}
                >
                  {(data?.channel_mix || []).map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[40%] space-y-2.5 text-xs">
              {(data?.channel_mix || []).map((c: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-600 font-medium">{c.channel}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatINR(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Outlets & Ad-Hoc OTP Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-annavya-royal" />
            <h3 className="text-sm font-bold text-annavya-navy">
              Active Network Outlets ({data?.outlets?.length || 0})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-2">Code</th>
                  <th>Outlet Name</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>GSTN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.outlets || []).map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono font-bold text-annavya-royal">{o.code}</td>
                    <td className="font-medium text-slate-800">{o.name}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-annavya-ice text-annavya-royal">
                        {o.ownership_type}
                      </span>
                    </td>
                    <td className="text-slate-600">{o.outlet_type}</td>
                    <td className="font-mono text-[11px] text-emerald-700">
                      {o.gstn_verified ? "Verified" : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-annavya-navy">
              Ad-Hoc SMS OTP Discount Audit Trail
            </h3>
          </div>
          {(leak.recent_otps || []).length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center bg-slate-50 rounded-xl">
              No ad-hoc SMS OTP requests logged yet. Trigger one in Retail POS Cash Counter to monitor live!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(leak.recent_otps || []).map((otp: any) => (
                <div
                  key={otp.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {otp.category} • {otp.beneficiary} ({otp.discount_pct}%)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {otp.estimate_no} • Approver: {otp.approver_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatINR(otp.discount_amount)}</div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        otp.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-700"
                          : otp.status === "PENDING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {otp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

