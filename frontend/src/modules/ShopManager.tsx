import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  MessageSquare,
  Tag,
  Send,
  Wallet,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";

interface ShopManagerProps {
  activeOutlet: string;
}

export const ShopManager: React.FC<ShopManagerProps> = ({ activeOutlet }) => {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"stock" | "otp" | "promos" | "shifts">("stock");
  const [toast, setToast] = useState<string | null>(null);

  // Indent form
  const [indentSku, setIndentSku] = useState("FG-RAS-01");
  const [indentQty, setIndentQty] = useState(40);

  // Promo form
  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState("PERCENT");
  const [promoVal, setPromoVal] = useState(15);

  // Shift close
  const [declaredCash, setDeclaredCash] = useState<Record<number, string>>({});

  const load = async () => {
    const res = await apiFetch(`/api/pos/shop/overview?outlet_code=${activeOutlet}`);
    setData(res);
  };

  useEffect(() => {
    load();
  }, [activeOutlet]);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const raiseIndent = async () => {
    const res = await apiFetch("/api/pos/shop/indents", {
      method: "POST",
      body: JSON.stringify({
        outlet_code: activeOutlet,
        sku: indentSku,
        qty: indentQty,
        priority: "HIGH",
      }),
    });
    notify(`1-Click Indent ${res.indent_no} sent to Central Sweet Production Factory!`);
    load();
  };

  const createPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/api/pos/shop/promos", {
      method: "POST",
      body: JSON.stringify({
        code: promoCode,
        name: promoName,
        rule_type: promoType,
        value: promoVal,
        min_bill: 500,
        max_cap: 400,
      }),
    });
    setPromoCode("");
    setPromoName("");
    notify("Promotional rule created & live on POS");
    load();
  };

  const togglePromo = async (id: number) => {
    await apiFetch(`/api/pos/shop/promos/${id}/toggle`, { method: "PATCH" });
    load();
  };

  const expireEod = async () => {
    const res = await apiFetch(`/api/pos/shop/expire-eod?outlet_code=${activeOutlet}`, {
      method: "POST",
    });
    notify(`EOD Cleanup: Expired ${res.expired_count} unconverted estimates`);
    load();
  };

  const closeShift = async (shiftId: number) => {
    const cash = Number(declaredCash[shiftId] || 0);
    await apiFetch("/api/pos/shop/shifts/close", {
      method: "POST",
      body: JSON.stringify({ shift_id: shiftId, declared_cash: cash }),
    });
    notify("Cashier shift closed with blind cash variance audit");
    load();
  };

  if (!data) return <div className="p-8 text-center text-slate-500">Loading Shop Manager...</div>;

  const today = new Date();
  const nearExpiryCount = (data.stock || []).filter((b: any) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return days <= 2;
  }).length;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "stock", label: `Shelf Stock & Alerts (${nearExpiryCount} Near Expiry)` },
            { id: "otp", label: `SMS OTP Inbox & Approvers (${data.sms_inbox?.length || 0})` },
            { id: "promos", label: `Structured Discounts (${data.promos?.length || 0})` },
            { id: "shifts", label: "POS Oversight & Shifts" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                tab === t.id
                  ? "bg-annavya-navy text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={expireEod}
          className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100"
        >
          Run EOD Estimate Expiry
        </button>
      </div>

      {/* TAB 1: SHELF STOCK & 1-CLICK INDENT */}
      {tab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-annavya-navy">
                Outlet Shelf & Back-Store Batches ({data.store_code})
              </h3>
              <span className="text-[11px] text-slate-500">FEFO Sorted</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2">SKU / Item</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Expiry</th>
                    <th>Shelf-Life Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.stock || []).map((b: any) => {
                    const days = Math.ceil(
                      (new Date(b.expiry_date).getTime() - today.getTime()) / 86400000
                    );
                    return (
                      <tr key={b.id}>
                        <td className="py-2.5">
                          <div className="font-semibold text-slate-900">{b.item_name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{b.sku}</div>
                        </td>
                        <td className="font-mono text-[11px]">{b.batch_no}</td>
                        <td className="font-bold">
                          {b.qty} {b.uom}
                        </td>
                        <td>{b.expiry_date}</td>
                        <td>
                          {days <= 1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> CRITICAL ({days}d)
                            </span>
                          ) : days <= 2 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              <Clock className="w-3 h-3" /> WARNING ({days}d)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                              Fresh ({days}d)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-annavya-navy">
                <Send className="w-4 h-4 text-annavya-royal" />
                1-Click Outlet Indent to Factory
              </div>
              <select
                value={indentSku}
                onChange={(e) => setIndentSku(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="FG-RAS-01">Spongy White Rasgulla (FG-RAS-01)</option>
                <option value="FG-KAJU-01">Royal Silver-Leaf Kaju Katli (FG-KAJU-01)</option>
                <option value="FG-BESAN-01">Desi Ghee Besan Laddu (FG-BESAN-01)</option>
                <option value="FG-GULAB-01">Hot Kesar Gulab Jamun (FG-GULAB-01)</option>
              </select>
              <input
                type="number"
                value={indentQty}
                onChange={(e) => setIndentQty(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <button
                onClick={raiseIndent}
                className="w-full py-2.5 rounded-xl bg-annavya-navy text-white text-xs font-bold hover:bg-annavya-royal"
              >
                Send Indent to Factory
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Recent Outlet Indents</h4>
              <div className="space-y-2">
                {(data.indents || []).slice(0, 5).map((ind: any) => (
                  <div key={ind.id} className="p-2 rounded-xl bg-slate-50 text-xs flex justify-between">
                    <div>
                      <div className="font-mono font-bold text-annavya-royal">{ind.indent_no}</div>
                      <div>{ind.item_name} ({ind.qty} {ind.uom})</div>
                    </div>
                    <span className="px-2 py-0.5 h-fit rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {ind.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIMULATED SMS INBOX & APPROVERS */}
      {tab === "otp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-annavya-navy mb-3">
              Category Approver Registry & Monthly Quotas
            </h3>
            <div className="space-y-3">
              {(data.approvers || []).map((a: any) => (
                <div key={a.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex justify-between font-bold text-annavya-navy">
                    <span>{a.category} • {a.name}</span>
                    <span>Max {a.max_pct}%</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">{a.mobile}</div>
                  <div className="mt-2 flex justify-between text-[11px]">
                    <span>Used: {formatINR(a.used_quota)}</span>
                    <span>Quota: {formatINR(a.monthly_quota)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-annavya-royal" />
              <h3 className="text-sm font-bold text-annavya-navy">
                Live SMS Gateway Log & OTP Verification Audit
              </h3>
            </div>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {(data.sms_inbox || []).map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-annavya-royal">
                      {s.category} • {s.beneficiary} ({s.discount_pct}%)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-slate-800">
                    To {s.approver_mobile}: "{s.sms_message}"
                  </div>
                </div>
              ))}
              {(data.sms_inbox || []).length === 0 && (
                <div className="text-xs text-slate-400 py-8 text-center">
                  No SMS OTP requests yet. Trigger an Ad-hoc discount from Retail POS Cash Counter!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STRUCTURED PROMOS */}
      {tab === "promos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={createPromo} className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-annavya-navy">
              <Tag className="w-4 h-4 text-annavya-royal" />
              Create Promotional Rule
            </div>
            <input
              required
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Promo Code (e.g. DIWALI20)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase"
            />
            <input
              required
              value={promoName}
              onChange={(e) => setPromoName(e.target.value)}
              placeholder="Campaign Name"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
              <input
                type="number"
                value={promoVal}
                onChange={(e) => setPromoVal(Number(e.target.value))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-annavya-navy text-white text-xs font-bold hover:bg-annavya-royal"
            >
              Publish Rule to POS
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-annavya-navy mb-3">Active & Scheduled Discount Rules</h3>
            <div className="space-y-2.5">
              {(data.promos || []).map((p: any) => (
                <div key={p.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-annavya-royal">{p.code}</div>
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.rule_type === "PERCENT" ? `${p.value}% Off` : `Flat ₹${p.value} Off`} • Min Bill {formatINR(p.min_bill)} • Max Cap {formatINR(p.max_cap)}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePromo(p.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] ${
                      p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.active ? "ACTIVE" : "PAUSED"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHIFTS */}
      {tab === "shifts" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-annavya-royal" />
            <h3 className="text-sm font-bold text-annavya-navy">
              Cashier Shift Blind Cash Declaration & Variance Audit
            </h3>
          </div>
          <div className="space-y-3">
            {(data.shifts || []).map((sh: any) => (
              <div key={sh.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-mono font-bold text-annavya-navy">{sh.shift_no} ({sh.outlet_code})</div>
                  <div className="text-slate-600">
                    Cashier: <b>{sh.cashier_name}</b> • Opening: {formatINR(sh.opening_cash)} • System Cash Sales: {formatINR(sh.system_cash_sales)}
                  </div>
                </div>
                {sh.status === "OPEN" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Blind Cash Count ₹"
                      value={declaredCash[sh.id] || ""}
                      onChange={(e) => setDeclaredCash({ ...declaredCash, [sh.id]: e.target.value })}
                      className="border border-slate-200 rounded-xl px-3 py-1.5 w-40 bg-white"
                    />
                    <button
                      onClick={() => closeShift(sh.id)}
                      className="px-3 py-1.5 rounded-xl bg-annavya-navy text-white font-bold"
                    >
                      Close Shift
                    </button>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                      CLOSED
                    </span>
                    <div className={`mt-1 font-bold ${Number(sh.variance) < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      Declared: {formatINR(sh.declared_cash)} • Variance: {formatINR(sh.variance)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

