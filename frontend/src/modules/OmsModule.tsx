import React, { useEffect, useState } from "react";
import {
  Gift,
  Lock,
  Factory,
  CreditCard,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  Clock,
  Check,
  XCircle,
  RefreshCw,
  Sparkles,
  Search,
  Settings,
  Phone,
  Radio,
  Volume2,
  AlertTriangle,
  X,
  ExternalLink,
  MessageSquare,
  Share2,
  Mail,
  Building2,
  CheckCircle,
  Printer,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { AggregatorOrder } from "../types";
import { audioAlert } from "../utils/audioAlert";

interface OmsModuleProps {
  activeOutlet?: string;
  initialTab?: "aggregators" | "bulk" | "config";
}

export const OmsModule: React.FC<OmsModuleProps> = ({ activeOutlet = "DEL01", initialTab = "aggregators" }) => {
  const [tab, setTab] = useState<"aggregators" | "bulk" | "config">(initialTab);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Bulk Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [orderType, setOrderType] = useState("Corporate Gifting");
  const [customerName, setCustomerName] = useState("Tata Consultancy Services");
  const [mobile, setMobile] = useState("+91-9811445566");
  const [customerEmail, setCustomerEmail] = useState("procurement@tcs.com");
  const [companyGstin, setCompanyGstin] = useState("07AAAAA0000A1Z5");
  const [boxes, setBoxes] = useState(100);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [branding, setBranding] = useState("Gold Embossed Monogram + Satin Ribbon");
  const [kajuRate, setKajuRate] = useState(1180);
  const [besanRate, setBesanRate] = useState(680);
  const [searchBulk, setSearchBulk] = useState("");
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<any | null>(null);
  const [milestoneNote, setMilestoneNote] = useState("Kettle #1 sweet cooking complete, moving to cooling & gift boxing");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Aggregator Live Orders State
  const [aggOrders, setAggOrders] = useState<AggregatorOrder[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loadingAggs, setLoadingAggs] = useState<boolean>(false);
  const [actionProcessing, setActionProcessing] = useState<number | string | null>(null);

  // Aggregator Decline Modal State
  const [declineTargetOrder, setDeclineTargetOrder] = useState<AggregatorOrder | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("Item Out of Stock");
  const [declineComment, setDeclineComment] = useState<string>("");

  // Aggregator Config State
  const [aggConfig, setAggConfig] = useState<any>({
    zomato: { enabled: true, merchant_id: "ZOM_RET_9921", api_key: "zm_live_771928374921", auto_accept: false, default_prep_time_mins: 20 },
    swiggy: { enabled: true, restaurant_id: "SWG_REST_4412", partner_token: "swg_live_883019284719", auto_accept: false, default_prep_time_mins: 15 }
  });

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadBulkOrders = async () => {
    try {
      const res = await apiFetch<any[]>("/api/oms/orders");
      setOrders(res);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadAggregatorOrders = async () => {
    setLoadingAggs(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== "ALL") params.append("platform", platformFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("outlet_code", activeOutlet);
      const res = await apiFetch<AggregatorOrder[]>(`/api/oms/aggregators/orders?${params.toString()}`);
      setAggOrders(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingAggs(false);
    }
  };

  const loadAggConfig = async () => {
    try {
      const res = await apiFetch<any>("/api/oms/aggregators/config");
      if (res) setAggConfig(res);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBulkOrders();
    loadAggregatorOrders();
    loadAggConfig();
    const interval = setInterval(loadAggregatorOrders, 8000);
    return () => clearInterval(interval);
  }, [platformFilter, statusFilter, activeOutlet]);

  const handleAcceptAggOrder = async (orderId: number, platform: string, displayNo: string, prepTime: number = 20) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${orderId}/accept`, {
        method: "POST",
        body: JSON.stringify({ prep_time_mins: prepTime, actor: "Store Manager" }),
      });
      notify(true, res.message || `${platform} Order ${displayNo} accepted!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message || "Failed to accept order");
    } finally {
      setActionProcessing(null);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTargetOrder) return;
    if (!declineComment.trim()) {
      notify(false, "Mandatory operational explanation comment is required to decline!");
      return;
    }
    setActionProcessing(declineTargetOrder.id);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${declineTargetOrder.id}/decline`, {
        method: "POST",
        body: JSON.stringify({
          decline_reason: declineReason,
          decline_comment: declineComment.trim(),
          actor: "Store Manager",
        }),
      });
      notify(true, res.message || `Order ${declineTargetOrder.display_order_no} declined`);
      setDeclineTargetOrder(null);
      setDeclineComment("");
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message || "Failed to decline order");
    } finally {
      setActionProcessing(null);
    }
  };

  const handleMarkFoodReady = async (orderId: number, displayNo: string) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${orderId}/mark-ready`, { method: "POST" });
      notify(true, res.message || `Food Ready signaled for ${displayNo}!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleMarkPickedUp = async (orderId: number, displayNo: string) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${orderId}/picked-up`, { method: "POST" });
      notify(true, res.message || `Order ${displayNo} handed over to rider!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleSimulateLiveOrder = async (platform: "ZOMATO" | "SWIGGY") => {
    try {
      const res = await apiFetch<any>("/api/oms/aggregators/simulate-incoming", {
        method: "POST",
        body: JSON.stringify({ platform, outlet_code: activeOutlet }),
      });
      audioAlert.playChime(platform);
      notify(true, `Incoming ${platform} Order ${res.order.display_order_no} (${formatINR(res.order.grand_total)}) arrived!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, "Simulation error: " + e.message);
    }
  };

  const handleSaveAggConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>("/api/oms/aggregators/config", {
        method: "PUT",
        body: JSON.stringify(aggConfig),
      });
      notify(true, res.message || "Aggregator settings updated");
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  // Bulk order math
  const estCost = boxes * (0.25 * 610 + 0.25 * 310);
  const estSell = boxes * (0.25 * kajuRate + 0.25 * besanRate);
  const estMargin = estSell > 0 ? ((estSell - estCost) / estSell) * 100 : 0;

  const createHamperOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ord = await apiFetch<any>("/api/oms/orders", {
        method: "POST",
        body: JSON.stringify({
          order_type: orderType,
          customer_name: customerName,
          customer_mobile: mobile,
          customer_email: customerEmail,
          company_gstin: companyGstin,
          outlet_code: activeOutlet,
          delivery_date: deliveryDate,
          branding_notes: branding,
          assortment: [
            { sku: "FG-KAJU-01", boxes, qty_per_box: 0.25, unit_rate: kajuRate },
            { sku: "FG-BESAN-01", boxes, qty_per_box: 0.25, unit_rate: besanRate },
          ],
          dispatch_drops: [{ venue: "Customer Primary Banquet / Corporate Office", boxes, slot: "11:00 AM" }],
        }),
      });
      notify(true, `Created Bulk Order ${ord.order_no} with ${ord.margin_pct}% Margin!`);
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleSendWhatsappQuote = async (orderId: number) => {
    setActionLoadingId(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${orderId}/send-whatsapp-quote`, { method: "POST" });
      notify(true, res.message || "WhatsApp Quote link generated!");
      const link = res.whatsapp_link || res.whatsapp_url;
      if (link) {
        window.open(link, "_blank");
      }
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to generate WhatsApp quote");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForProgress) return;
    setActionLoadingId(selectedOrderForProgress.id);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${selectedOrderForProgress.id}/send-progress-update`, {
        method: "POST",
        body: JSON.stringify({ milestone_note: milestoneNote }),
      });
      notify(true, res.message || "Progress update dispatched via WhatsApp!");
      const link = res.whatsapp_link || res.whatsapp_url;
      if (link) {
        window.open(link, "_blank");
      }
      setProgressModalOpen(false);
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to send progress update");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotifyFoodReady = async (orderId: number) => {
    setActionLoadingId(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${orderId}/notify-ready`, { method: "POST" });
      notify(true, res.message || "Ready notification sent to customer via WhatsApp!");
      const link = res.whatsapp_link || res.whatsapp_url;
      if (link) {
        window.open(link, "_blank");
      }
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to notify food ready");
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerFactory = async (orderId: number) => {
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${orderId}/trigger-production`, {
        method: "POST",
      });
      notify(true, `Production Locked! Created Factory Batch Orders: ${(res.created_production_orders || []).join(", ")}`);
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const pendingPlacedCount = aggOrders.filter((o) => o.status === "PLACED").length;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm transition ${
            toast.ok
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* OMS Tabs Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "aggregators",
              label: "🛵 Zomato & Swiggy Live Inbox",
              badge: pendingPlacedCount > 0 ? `${pendingPlacedCount} New!` : null,
              badgeColor: "bg-rose-500 text-white animate-pulse",
            },
            { id: "bulk", label: "🎁 Bulk Corporate & Wedding Hampers", badge: `${orders.length}` },
            { id: "config", label: "⚙️ Aggregator API & Webhook Config" },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
                  isActive
                    ? "bg-[#081F5C] dark:bg-blue-600 text-white shadow"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${t.badgeColor || "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Demo Order Simulation Tool */}
        {tab === "aggregators" && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Demo Simulators:</span>
            <button
              onClick={() => handleSimulateLiveOrder("ZOMATO")}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] shadow transition flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Simulate Zomato Order
            </button>
            <button
              onClick={() => handleSimulateLiveOrder("SWIGGY")}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[11px] shadow transition flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Simulate Swiggy Order
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          TAB 1: ZOMATO & SWIGGY LIVE INBOX
      ======================================================== */}
      {tab === "aggregators" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500">Platform:</span>
              {["ALL", "ZOMATO", "SWIGGY"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    platformFilter === p
                      ? p === "ZOMATO"
                        ? "bg-red-600 text-white"
                        : p === "SWIGGY"
                        ? "bg-orange-500 text-white"
                        : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

              <span className="font-bold text-slate-500">Status:</span>
              {["ALL", "PLACED", "ACCEPTED", "FOOD_READY", "PICKED_UP", "DECLINED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-xl font-semibold text-[11px] transition ${
                    statusFilter === st
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <button
              onClick={loadAggregatorOrders}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAggs ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Orders Grid */}
          <div className="space-y-3">
            {aggOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  No online orders found matching current filters
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the "+ Simulate Zomato Order" or "+ Simulate Swiggy Order" button above to generate realistic demo orders and trigger the audio alert!
                </p>
              </div>
            ) : (
              aggOrders.map((ord) => {
                const isZomato = ord.platform === "ZOMATO";
                const isPlaced = ord.status === "PLACED";
                const isAccepted = ord.status === "ACCEPTED";
                const isReady = ord.status === "FOOD_READY";
                const isPickedUp = ord.status === "PICKED_UP";
                const isDeclined = ord.status === "DECLINED";

                return (
                  <div
                    key={ord.id}
                    className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition hover:shadow-md ${
                      isPlaced
                        ? isZomato
                          ? "border-red-400 dark:border-red-800 ring-2 ring-red-200 dark:ring-red-950/60"
                          : "border-orange-400 dark:border-orange-800 ring-2 ring-orange-200 dark:ring-orange-950/60"
                        : isDeclined
                        ? "border-slate-200 dark:border-slate-800 opacity-60"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg font-black text-xs text-white ${
                              isZomato ? "bg-red-600" : "bg-orange-500"
                            }`}
                          >
                            {ord.platform}
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                            {ord.display_order_no}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-mono text-slate-400">{ord.aggregator_order_id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPlaced
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 animate-pulse"
                                : isAccepted
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                                : isReady
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                : isPickedUp
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {ord.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{ord.customer_name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" /> {ord.customer_mobile}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[11px] truncate max-w-md">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /> {ord.delivery_address}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Totals & Action Buttons */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                            {formatINR(ord.grand_total)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Items: {formatINR(ord.item_total)} + Tax/Pack: {formatINR(ord.taxes + ord.packing_charge)}
                          </div>
                        </div>

                        {/* Order Workflow Actions */}
                        <div className="flex items-center gap-2">
                          {isPlaced && (
                            <>
                              <button
                                onClick={() => handleAcceptAggOrder(ord.id, ord.platform, ord.display_order_no, 20)}
                                disabled={actionProcessing === ord.id}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Accept (20m)
                              </button>
                              <button
                                onClick={() => setDeclineTargetOrder(ord)}
                                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-bold text-xs border border-rose-200 dark:border-rose-900 transition flex items-center gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                Decline
                              </button>
                            </>
                          )}

                          {isAccepted && (
                            <button
                              onClick={() => handleMarkFoodReady(ord.id, ord.display_order_no)}
                              disabled={actionProcessing === ord.id}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                            >
                              <Sparkles className="w-4 h-4" />
                              Signal Food Ready
                            </button>
                          )}

                          {isReady && (
                            <button
                              onClick={() => handleMarkPickedUp(ord.id, ord.display_order_no)}
                              disabled={actionProcessing === ord.id}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                            >
                              <Truck className="w-4 h-4" />
                              Handover to Valet
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items List & Rider Bar */}
                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {(ord.items || []).map((itm: any, idx: number) => {
                            const nameLower = (itm.name || "").toLowerCase();
                            const isKitchen =
                              itm.category === "FG-Rest" ||
                              ["chaat", "plate", "bhalla", "chole", "bhature", "tikki", "thali", "paneer", "combo", "lassi", "meal"].some((k) => nameLower.includes(k));
                            return (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                              >
                                <b>{itm.qty}×</b> {itm.name} (₹{itm.price * itm.qty})
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isKitchen
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  }`}
                                >
                                  {isKitchen ? "🍳 Kitchen KOT" : "🍬 Sweet Counter"}
                                </span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Rider & Delivery Partner Card */}
                        {ord.rider_name && !isDeclined && (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Rider: {ord.rider_name}</span>
                            <span className="text-slate-400 font-mono">({ord.rider_mobile})</span>
                            {ord.otp_code && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold font-mono">
                                OTP: {ord.otp_code}
                              </span>
                            )}
                          </div>
                        )}

                        {isDeclined && ord.decline_comment && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 italic">
                            Declined: <b>{ord.decline_reason}</b> — "{ord.decline_comment}"
                          </div>
                        )}
                      </div>

                      {/* Auto-Routing Station Badges & Printing Standards */}
                      {(isAccepted || isReady || isPickedUp) && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-[#081F5C] dark:text-sky-300 flex items-center gap-1">
                              ⚡ Auto-Routed Dispatch:
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 font-bold">
                              🍳 Kitchen KOT (Dual-Cut 80mm Slip)
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                              🍬 Sweet Counter (40-Col 58mm Slip)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <button
                              onClick={() => notify(true, `🖨️ Dual-Cut KOT printed for ${ord.display_order_no} (Kitchen Captain + Counter Chef copies sent to StarPRNT)`)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-600" /> Print KOT
                            </button>
                            <button
                              onClick={() => notify(true, `🖨️ 40-Col Thermal Sweet Slip printed for ${ord.display_order_no} (Packaging Desk ESC/POS)`)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-600" /> Print Sweet Slip
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: BULK CORPORATE & WEDDING HAMPERS
      ======================================================== */}
      {tab === "bulk" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Custom Assorted Box / Hamper Builder */}
          <form onSubmit={createHamperOrder} className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#081F5C] dark:text-white">
              <Gift className="w-4 h-4 text-amber-600" />
              Custom Hamper & Corporate Order Builder
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="Corporate Gifting">Corporate Gifting</option>
                <option value="Retail Bulk">Retail Bulk Hamper</option>
                <option value="Marriage">Marriage Catering</option>
                <option value="Festival">Festival Bulk</option>
                <option value="Event Catering">Event Catering</option>
                <option value="Institutional">Institutional Supply</option>
              </select>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
              />
            </div>

            <div>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer / Corporate Name"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="WhatsApp Mobile (+91...)"
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                required
              />
              <input
                type="number"
                value={boxes}
                onChange={(e) => setBoxes(Number(e.target.value))}
                placeholder="Total Boxes"
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Customer Email Address"
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
              />
              <input
                type="text"
                value={companyGstin}
                onChange={(e) => setCompanyGstin(e.target.value)}
                placeholder="Company GSTIN (Optional)"
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300">Assortment (250g Kaju Katli + 250g Besan Laddu)</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px]">
                  Kaju Rate (₹/kg)
                  <input
                    type="number"
                    value={kajuRate}
                    onChange={(e) => setKajuRate(Number(e.target.value))}
                    className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 font-bold"
                  />
                </label>
                <label className="text-[11px]">
                  Besan Rate (₹/kg)
                  <input
                    type="number"
                    value={besanRate}
                    onChange={(e) => setBesanRate(Number(e.target.value))}
                    className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 font-bold"
                  />
                </label>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>BOM Cost: <b>{formatINR(estCost)}</b></span>
                <span>Quote: <b>{formatINR(estSell)}</b></span>
              </div>
              <div className={`font-bold ${estMargin < 15 ? "text-rose-600" : "text-emerald-700"}`}>
                Margin Guardrail: {estMargin.toFixed(1)}% {estMargin < 15 ? "(Blocked < 15%)" : "(Healthy)"}
              </div>
            </div>

            <input
              value={branding}
              onChange={(e) => setBranding(e.target.value)}
              placeholder="Custom Ribbon / Monogram Notes"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800"
            />
            <button
              type="submit"
              disabled={estMargin < 15}
              className="w-full py-2.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-40 shadow transition"
            >
              Generate Quotation & Advance Bill
            </button>
          </form>

          {/* Orders List & Production Trigger */}
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" />
                  Active Bulk Orders & Progress Lifecycles ({orders.length})
                </h3>
                <p className="text-xs text-slate-500">Live order status, WhatsApp quotations & progressive milestone notifications</p>
              </div>

              {/* Minimal Workflow Search Bar (Supports order no, customer, mobile, email or last 4 digits) */}
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ID, last 4 digits (e.g. 0016), name..."
                  value={searchBulk}
                  onChange={(e) => setSearchBulk(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              {orders
                .filter((o) => {
                  const q = searchBulk.trim().toLowerCase();
                  if (!q) return true;
                  const orderNo = (o.order_no || "").toLowerCase();
                  const lastFour = orderNo.slice(-4);
                  const cust = (o.customer_name || "").toLowerCase();
                  const mob = (o.customer_mobile || "").toLowerCase();
                  const em = (o.customer_email || "").toLowerCase();
                  const gst = (o.company_gstin || "").toLowerCase();
                  return (
                    orderNo.includes(q) ||
                    lastFour === q ||
                    cust.includes(q) ||
                    mob.includes(q) ||
                    em.includes(q) ||
                    gst.includes(q)
                  );
                })
                .map((o) => {
                  const st = (o.status || "").toUpperCase();
                  let activeStage = 0;
                  if (st === "CONFIRMED") activeStage = 1;
                  else if (st === "PRODUCTION_LOCKED" || st === "QUEUED") activeStage = 2;
                  else if (st === "IN_PRODUCTION") activeStage = 3;
                  else if (st === "READY_FOR_DELIVERY" || st === "READY") activeStage = 4;
                  else if (st === "DISPATCHED" || st === "COMPLETED") activeStage = 5;

                  const stages = [
                    { label: "Quotation Sent", sub: "B2B Quote" },
                    { label: "Advance Paid", sub: "Locked" },
                    { label: "Factory Queued", sub: "BOM Reserved" },
                    { label: "In Production", sub: "Sweet Cooking" },
                    { label: "Food Ready", sub: "Packed & Sealed" },
                    { label: "Dispatched", sub: "Handed Over" },
                  ];

                  return (
                    <div
                      key={o.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm space-y-4 text-xs"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-[#081F5C] dark:text-sky-400 text-sm">
                              {o.order_no}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px]">
                              {o.order_type}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px]">
                              {o.status}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                            {o.customer_name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                              <Phone className="w-3 h-3" /> {o.customer_mobile}
                            </span>
                            {o.customer_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" /> {o.customer_email}
                              </span>
                            )}
                            {o.company_gstin && (
                              <span className="flex items-center gap-1 font-mono">
                                <Building2 className="w-3 h-3 text-slate-400" /> GSTIN: {o.company_gstin}
                              </span>
                            )}
                            <span>Deliv: <b>{o.delivery_date}</b></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-slate-500 text-[11px]">Selling Total</div>
                          <div className="text-sm font-extrabold text-emerald-600 font-mono">
                            {formatINR(o.selling_total)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Advance: {formatINR(o.advance_paid || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Minimal Workflow & Progress Stepper */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                          Order Progress Workflow Lifecycle
                        </div>
                        <div className="relative flex items-center justify-between">
                          {/* Stepper background line */}
                          <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
                          {/* Active stage line */}
                          <div
                            className="absolute top-1/2 left-3 -translate-y-1/2 h-0.5 bg-blue-600 transition-all -z-0"
                            style={{ width: `${(activeStage / (stages.length - 1)) * 95}%` }}
                          />

                          {stages.map((stage, idx) => {
                            const isDone = idx < activeStage;
                            const isCurrent = idx === activeStage;
                            return (
                              <div key={idx} className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                                    isDone
                                      ? "bg-emerald-600 text-white"
                                      : isCurrent
                                      ? "bg-[#081F5C] dark:bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900"
                                      : "bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400"
                                  }`}
                                >
                                  {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                                </div>
                                <span
                                  className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${
                                    isCurrent
                                      ? "text-blue-600 dark:text-sky-400 font-bold"
                                      : isDone
                                      ? "text-slate-700 dark:text-slate-300"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {stage.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500 italic">
                          {o.branding_notes || "Standard corporate sweet box packaging"}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Send WhatsApp Quote */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsappQuote(o.id)}
                            disabled={actionLoadingId === o.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                            title="Directly dispatch GST compliant quotation to customer's WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp Quote
                          </button>

                          {/* Send Progress Update */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForProgress(o);
                              setProgressModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                            title="Send real-time milestone progress update to customer on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Send Progress
                          </button>

                          {/* Notify Food Ready */}
                          {o.status !== "READY_FOR_DELIVERY" && o.status !== "DISPATCHED" && (
                            <button
                              type="button"
                              onClick={() => handleNotifyFoodReady(o.id)}
                              disabled={actionLoadingId === o.id}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                              title="Notify customer on WhatsApp that food/hamper order is prepared & ready for pickup/delivery"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Notify Ready
                            </button>
                          )}

                          {/* Trigger Production */}
                          {(o.status === "CONFIRMED" || o.status === "QUOTED") && (
                            <button
                              type="button"
                              onClick={() => triggerFactory(o.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                            >
                              <Factory className="w-3.5 h-3.5" />
                              Trigger Factory
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: AGGREGATOR API & WEBHOOK CONFIGURATION
      ======================================================== */}
      {tab === "config" && (
        <form onSubmit={handleSaveAggConfig} className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Zomato & Swiggy Production Integration Settings
            </h3>
            <p className="text-slate-500 mt-1">
              Configure live Merchant Partner API keys, webhook endpoints, and automatic SLA buffer thresholds.
            </p>
          </div>

          {/* Zomato Configuration Section */}
          <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">ZOMATO</span>
                Zomato Merchant Partner API
              </h4>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={aggConfig.zomato?.enabled}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, zomato: { ...aggConfig.zomato, enabled: e.target.checked } })
                  }
                  className="rounded text-red-600 w-4 h-4"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Merchant Store ID</label>
                <input
                  type="text"
                  value={aggConfig.zomato?.merchant_id || ""}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, zomato: { ...aggConfig.zomato, merchant_id: e.target.value } })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Default Prep Time (mins)</label>
                <input
                  type="number"
                  value={aggConfig.zomato?.default_prep_time_mins || 20}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, zomato: { ...aggConfig.zomato, default_prep_time_mins: Number(e.target.value) } })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-800 font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Webhook URL Endpoint</label>
              <input
                type="text"
                readOnly
                value="http://localhost:8285/api/oms/aggregators/zomato/webhook"
                className="w-full border rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Swiggy Configuration Section */}
          <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-black text-[10px]">SWIGGY</span>
                Swiggy UrbanPiper / Direct Partner API
              </h4>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={aggConfig.swiggy?.enabled}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, swiggy: { ...aggConfig.swiggy, enabled: e.target.checked } })
                  }
                  className="rounded text-orange-500 w-4 h-4"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Restaurant ID</label>
                <input
                  type="text"
                  value={aggConfig.swiggy?.restaurant_id || ""}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, swiggy: { ...aggConfig.swiggy, restaurant_id: e.target.value } })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Default Prep Time (mins)</label>
                <input
                  type="number"
                  value={aggConfig.swiggy?.default_prep_time_mins || 15}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, swiggy: { ...aggConfig.swiggy, default_prep_time_mins: Number(e.target.value) } })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-800 font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Webhook URL Endpoint</label>
              <input
                type="text"
                readOnly
                value="http://localhost:8285/api/oms/aggregators/swiggy/webhook"
                className="w-full border rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#081F5C] dark:bg-blue-600 text-white font-bold hover:bg-blue-700 shadow transition"
          >
            Save Aggregator Integration Settings
          </button>
        </form>
      )}

      {/* Mandatory Decline Modal Dialog */}
      {declineTargetOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Decline {declineTargetOrder.platform} Order {declineTargetOrder.display_order_no}
                </h3>
              </div>
              <button
                onClick={() => setDeclineTargetOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeclineSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cancellation Reason *
                </label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="Item Out of Stock">Item Out of Stock</option>
                  <option value="Kitchen Overloaded">Kitchen Backlog / High Wait Time (&gt; 45 mins)</option>
                  <option value="Outlet Closing">Outlet Closed / Shift Transition</option>
                  <option value="Rider Unavailable">No Delivery Valet Available</option>
                  <option value="Price or Tax Mismatch">Price or Tax Rate Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mandatory Operational Comment * <span className="text-rose-500 font-normal">(Required to Decline)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this order is being declined..."
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeclineTargetOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!declineComment.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow disabled:opacity-40"
                >
                  Confirm & Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Milestone Notification Modal */}
      {progressModalOpen && selectedOrderForProgress && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-600">
                <Share2 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Send Progress Update — {selectedOrderForProgress.order_no}
                </h3>
              </div>
              <button
                onClick={() => setProgressModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendProgressUpdate} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrderForProgress.customer_name}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Mobile: <b className="text-emerald-600">{selectedOrderForProgress.customer_mobile}</b></span>
                  <span>•</span>
                  <span>Boxes: <b>{selectedOrderForProgress.total_boxes || selectedOrderForProgress.boxes || 100}</b></span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Milestone Progress Message *
                </label>
                <textarea
                  rows={3}
                  value={milestoneNote}
                  onChange={(e) => setMilestoneNote(e.target.value)}
                  placeholder="e.g. Sweets have finished cooking in Kettle #1, currently entering cooling and luxury packaging zone..."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === selectedOrderForProgress.id || !milestoneNote.trim()}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Dispatch WhatsApp Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
