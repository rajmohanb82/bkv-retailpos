import React, { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { AggregatorOrder } from "../types";
import { audioAlert } from "../utils/audioAlert";

interface AggregatorNotificationBarProps {
  onOrderUpdated?: () => void;
}

export const AggregatorNotificationBar: React.FC<AggregatorNotificationBarProps> = ({ onOrderUpdated }) => {
  const [pendingOrders, setPendingOrders] = useState<AggregatorOrder[]>([]);
  const [activeOrderIdx, setActiveOrderIdx] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prepTime, setPrepTime] = useState<number>(20);
  
  // Decline Modal state
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>("Item Out of Stock");
  const [declineComment, setDeclineComment] = useState<string>("");
  const [actionProcessing, setActionProcessing] = useState<boolean>(false);

  const fetchPendingOrders = async () => {
    try {
      const orders = await apiFetch<AggregatorOrder[]>("/api/oms/aggregators/orders?status=PLACED");
      setPendingOrders(orders);
      if (orders.length > 0) {
        audioAlert.startAlarmLoop(orders[0].platform);
      } else {
        audioAlert.stopAlarmLoop();
      }
    } catch (e) {
      // Polling quietly
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 5000);
    return () => {
      clearInterval(interval);
      audioAlert.stopAlarmLoop();
    };
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioAlert.setMuted(next);
  };

  const currentOrder = pendingOrders[activeOrderIdx] || pendingOrders[0];

  const handleAccept = async () => {
    if (!currentOrder) return;
    setActionProcessing(true);
    try {
      await apiFetch(`/api/oms/aggregators/orders/${currentOrder.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ prep_time_mins: prepTime, actor: "Cashier / Counter Head" }),
      });
      audioAlert.stopAlarmLoop();
      await fetchPendingOrders();
      if (onOrderUpdated) onOrderUpdated();
    } catch (e: any) {
      alert("Error accepting order: " + e.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleDeclineConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;
    if (!declineComment.trim()) {
      alert("Mandatory comment required: Please provide an operational comment to decline this aggregator order.");
      return;
    }
    setActionProcessing(true);
    try {
      await apiFetch(`/api/oms/aggregators/orders/${currentOrder.id}/decline`, {
        method: "POST",
        body: JSON.stringify({
          decline_reason: declineReason,
          decline_comment: declineComment.trim(),
          actor: "Store Manager",
        }),
      });
      setShowDeclineModal(false);
      setDeclineComment("");
      audioAlert.stopAlarmLoop();
      await fetchPendingOrders();
      if (onOrderUpdated) onOrderUpdated();
    } catch (e: any) {
      alert("Error declining order: " + e.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleSimulate = async (platform: "ZOMATO" | "SWIGGY") => {
    try {
      await apiFetch("/api/oms/aggregators/simulate-incoming", {
        method: "POST",
        body: JSON.stringify({ platform, outlet_code: "DEL01" }),
      });
      await fetchPendingOrders();
      if (onOrderUpdated) onOrderUpdated();
    } catch (e: any) {
      alert("Simulation failed: " + e.message);
    }
  };

  if (!currentOrder) {
    return null;
  }

  const isZomato = currentOrder.platform === "ZOMATO";

  return (
    <>
      {/* High-Visibility Sticky Notification Bar */}
      <div
        className={`sticky top-0 z-40 w-full px-4 py-2.5 shadow-xl transition-all duration-300 border-b flex flex-wrap items-center justify-between gap-3 ${
          isZomato
            ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-800"
            : "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white border-orange-700"
        }`}
      >
        {/* Left Side: Flashing Pill, Platform Badge, and Customer Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-slate-900 font-extrabold text-xs shadow-sm animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            <span>NEW {currentOrder.platform} ORDER</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm tracking-wide bg-black/20 px-2 py-0.5 rounded-md">
                {currentOrder.display_order_no}
              </span>
              <span className="text-white/80 text-xs">•</span>
              <span className="font-bold text-xs truncate">{currentOrder.customer_name}</span>
              <span className="text-white/80 text-xs">•</span>
              <span className="font-extrabold text-sm">{formatINR(currentOrder.grand_total)}</span>
              {pendingOrders.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-black/30 text-amber-200 text-[10px] font-bold">
                  +{pendingOrders.length - 1} more waiting
                </span>
              )}
            </div>

            <div className="text-[11px] text-white/90 truncate flex items-center gap-1.5 mt-0.5">
              <span>Items:</span>
              <span className="font-semibold underline">
                {(currentOrder.items || []).map((i) => `${i.name} × ${i.qty}`).join(", ")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Prep Time, Audio Mute, Accept & Decline Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-1 bg-black/20 rounded-xl px-2.5 py-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[11px] font-semibold text-white/80">Prep:</span>
            <select
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            >
              <option value={10} className="text-slate-900">10m</option>
              <option value={15} className="text-slate-900">15m</option>
              <option value={20} className="text-slate-900">20m</option>
              <option value={30} className="text-slate-900">30m</option>
              <option value={45} className="text-slate-900">45m</option>
            </select>
          </div>

          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute Alarm Sound" : "Mute Alarm Sound"}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-200" /> : <Volume2 className="w-4 h-4 text-emerald-200 animate-bounce" />}
          </button>

          <button
            onClick={handleAccept}
            disabled={actionProcessing}
            className="px-4 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-emerald-50 font-black text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Accept Order
          </button>

          <button
            onClick={() => setShowDeclineModal(true)}
            disabled={actionProcessing}
            className="px-3.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white font-bold text-xs border border-white/30 transition flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-200" />
            Decline
          </button>
        </div>
      </div>

      {/* Mandatory Decline Modal Dialog */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Decline {currentOrder.platform} Order {currentOrder.display_order_no}
                </h3>
              </div>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Zomato & Swiggy Merchant SLA mandates selecting a verified operational reason and entering a mandatory explanation comment before cancelling an order.
            </p>

            <form onSubmit={handleDeclineConfirm} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cancellation Reason *
                </label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="Item Out of Stock">Item Out of Stock (Raw Material / Batch Exhausted)</option>
                  <option value="Kitchen Overloaded">Kitchen Backlog / High Wait Time (&gt; 45 mins)</option>
                  <option value="Outlet Closing">Outlet Closed / Post-Hours Shift Transition</option>
                  <option value="Rider Unavailable">No Delivery Valet Available in Area</option>
                  <option value="Price or Tax Mismatch">Price or Tax Rate Discrepancy</option>
                  <option value="Custom Operational Issue">Custom Operational Reason</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mandatory Operational Comment * <span className="text-rose-500 font-normal">(Required to Decline)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this order is being declined (e.g., Sold out fresh Kaju Katli batch at 7 PM)..."
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!declineComment.trim() || actionProcessing}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition disabled:opacity-40"
                >
                  {actionProcessing ? "Relaying Cancellation..." : "Confirm & Send to Aggregator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
