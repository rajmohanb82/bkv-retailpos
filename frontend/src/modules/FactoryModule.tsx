import React, { useEffect, useState } from "react";
import {
  Factory,
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Inbox,
  Flame,
  Search,
  Check,
  RefreshCw,
  Clock,
  Gauge,
  Thermometer,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  CheckSquare,
  Square,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { BarcodeSvg } from "../components/BarcodeSvg";
import { KettleStatus, OrderWorkflowTrack } from "../types";

interface FactoryModuleProps {
  initialTab?: "inbox" | "kettles" | "orders" | "qc" | "dispatch" | "tracker";
}

export const FactoryModule: React.FC<FactoryModuleProps> = ({ initialTab = "inbox" }) => {
  const [tab, setTab] = useState<"inbox" | "kettles" | "orders" | "qc" | "dispatch" | "tracker">(initialTab);
  const [factoryCode, setFactoryCode] = useState<string>("FAC-DEL01");
  const [inboxData, setInboxData] = useState<any>({ inbox_orders: [], pending_indents: [], active_requisitions: [] });
  const [orders, setOrders] = useState<any[]>([]);
  const [kettles, setKettles] = useState<KettleStatus[]>([]);
  const [qcOrder, setQcOrder] = useState<any>(null);
  const [actualQty, setActualQty] = useState<number>(100);
  const [brixPct, setBrixPct] = useState<number>(52.5);
  const [moisturePct, setMoisturePct] = useState<number>(18.0);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState<number | string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [selectedIndentIds, setSelectedIndentIds] = useState<number[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // New batch plan
  const [fgSku, setFgSku] = useState("FG-RAS-01");
  const [plannedQty, setPlannedQty] = useState(100);
  const [selectedKettle, setSelectedKettle] = useState("Steam Kettle #1 (Chhena/Syrup)");

  // Order workflow tracker state
  const [searchQuery, setSearchQuery] = useState("PRD-2026-101");
  const [trackedOrder, setTrackedOrder] = useState<OrderWorkflowTrack | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [inboxRes, ordsRes, kettlesRes] = await Promise.all([
        apiFetch<any>(`/api/factory/inbox?factory_code=${factoryCode}`).catch((err) => {
          console.warn("Factory inbox load warning:", err);
          return { inbox_orders: [], pending_indents: [], active_requisitions: [] };
        }),
        apiFetch<any[]>(`/api/factory/orders?factory_code=${factoryCode}`).catch((err) => {
          console.warn("Factory orders load warning:", err);
          return [];
        }),
        apiFetch<KettleStatus[]>("/api/factory/kettles").catch((err) => {
          console.warn("Factory kettles load warning:", err);
          return [];
        }),
      ]);
      setInboxData(inboxRes || { inbox_orders: [], pending_indents: [], active_requisitions: [] });
      setOrders(ordsRes || []);
      setKettles(kettlesRes || []);
    } catch (e: any) {
      console.error("Factory load error:", e);
      notify(false, e.message || "Failed to load factory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [factoryCode]);

  const handleTrackOrder = async (queryToTrack?: string) => {
    const q = (queryToTrack || searchQuery).trim();
    if (!q) return;
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const res = await apiFetch<OrderWorkflowTrack>(`/api/factory/workflow/track/${encodeURIComponent(q)}`);
      setTrackedOrder(res);
    } catch (e: any) {
      setTrackingError(e.message || `No workflow found for reference "${q}"`);
      setTrackedOrder(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "tracker" && !trackedOrder) {
      handleTrackOrder("PRD-2026-101");
    }
  }, [tab]);

  const acceptOrder = async (orderId: number, prodNo: string) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch(`/api/factory/orders/${orderId}/accept`, { method: "POST" });
      notify(true, res.message || `Order ${prodNo} accepted! Store BOM Requisition raised.`);
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to accept order");
    } finally {
      setActionProcessing(null);
    }
  };

  const acceptIndent = async (indentId: number, indentNo: string) => {
    setActionProcessing(`indent-${indentId}`);
    try {
      const res = await apiFetch(`/api/factory/orders/accept-indent/${indentId}`, { method: "POST" });
      notify(true, res.message || `Indent ${indentNo} accepted into Sweet Production & Requisition sent to Stores!`);
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to convert indent to production");
    } finally {
      setActionProcessing(null);
    }
  };

  const handleBatchAcceptOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setBatchProcessing(true);
    let count = 0;
    try {
      for (const id of selectedOrderIds) {
        try {
          await apiFetch(`/api/factory/orders/${id}/accept`, { method: "POST" });
          count++;
        } catch (e) {
          console.error(e);
        }
      }
      notify(true, `Accept All Orders: Successfully accepted ${count} production orders into queue!`);
      setSelectedOrderIds([]);
      loadData();
    } catch (e: any) {
      notify(false, `Batch error: ${e.message || e}`);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchAcceptIndents = async () => {
    if (selectedIndentIds.length === 0) return;
    setBatchProcessing(true);
    let count = 0;
    try {
      for (const id of selectedIndentIds) {
        try {
          await apiFetch(`/api/factory/orders/accept-indent/${id}`, { method: "POST" });
          count++;
        } catch (e) {
          console.error(e);
        }
      }
      notify(true, `Accept All Indents: Successfully allotted ${count} outlet indents to production!`);
      setSelectedIndentIds([]);
      loadData();
    } catch (e: any) {
      notify(false, `Batch error: ${e.message || e}`);
    } finally {
      setBatchProcessing(false);
    }
  };

  const startCooking = async (id: number, lineName?: string) => {
    setActionProcessing(id);
    try {
      const res = await apiFetch(`/api/factory/orders/${id}/start-cooking`, {
        method: "POST",
        body: JSON.stringify({ kettle_line: lineName || selectedKettle }),
      });
      notify(true, `Batch ${res.prod_no} is now COOKING on ${res.kettle_line}! Stage 1 WIP logged.`);
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to start cooking");
    } finally {
      setActionProcessing(null);
    }
  };

  const submitQc = async () => {
    if (!qcOrder) return;
    setActionProcessing(qcOrder.id);
    try {
      const res = await apiFetch(`/api/factory/orders/${qcOrder.id}/qc-complete`, {
        method: "POST",
        body: JSON.stringify({
          actual_qty: actualQty,
          brix_pct: brixPct,
          moisture_pct: moisturePct,
          temp_c: 6.5,
          hygiene: "PASS",
          passed: true,
          labor_overhead: 2600,
        }),
      });
      setQcOrder(null);
      notify(true, `QC Passed for ${res.prod_no}! Brix: ${brixPct}%, Yield Variance: ${res.yield_variance_pct}%`);
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to submit QC");
    } finally {
      setActionProcessing(null);
    }
  };

  const dispatchToStore = async (id: number) => {
    setActionProcessing(id);
    try {
      const res = await apiFetch(`/api/factory/orders/${id}/pack-and-dispatch`, {
        method: "POST",
        body: JSON.stringify({ target_store_code: "STR-DEL01-BACK" }),
      });
      notify(true, `Batch ${res.batch_no} dispatched & inwarded into Outlet Cold Shelf! COGS: ${formatINR(res.unit_cogs)}/kg`);
      loadData();
    } catch (e: any) {
      notify(false, e.message || "Failed to dispatch batch");
    } finally {
      setActionProcessing(null);
    }
  };

  const createBatchPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/factory/orders", {
        method: "POST",
        body: JSON.stringify({
          fg_sku: fgSku,
          planned_qty: plannedQty,
          source_type: "Production Schedule",
          source_ref: "MASTER-PLAN",
          factory_code: factoryCode,
          kettle_line: selectedKettle,
        }),
      });
      notify(true, `Planned Production Batch ${res.prod_no} queued into Factory Inbox!`);
      loadData();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const inboxOrders = inboxData.inbox_orders || [];
  const pendingIndents = inboxData.pending_indents || [];
  const pendingInboxTotal = inboxOrders.filter((o: any) => o.status === "INBOX" || o.status === "Planned").length + pendingIndents.length;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm transition-all ${toast.ok
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Factory Selection Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#081F5C] dark:bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Sweet Factory & Central Kitchen</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                {factoryCode}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              End-to-End Factory Workflow: Inbox $\rightarrow$ Accept & Requisition $\rightarrow$ Stores BOM Issue $\rightarrow$ Cooking $\rightarrow$ QC $\rightarrow$ Dispatch
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={factoryCode}
            onChange={(e) => setFactoryCode(e.target.value)}
            className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="FAC-DEL01">FAC-DEL01: Annavya Central Mithai Plant (IMT Manesar)</option>
            <option value="FAC-GUR02">FAC-GUR02: Gurugram Artisanal Kitchen</option>
            <option value="FAC-JAI03">FAC-JAI03: Jaipur Sweets & Namkeen Hub</option>
            <option value="all">All Chain Production Facilities</option>
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh Factory Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Submenu Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "inbox",
              label: "Factory Inbox",
              icon: Inbox,
              badge: pendingInboxTotal > 0 ? `${pendingInboxTotal} New` : null,
              badgeColor: "bg-amber-500 text-white",
            },
            { id: "kettles", label: "Live Kettles & Floor", icon: Flame, badge: `${kettles.length} Units`, badgeColor: "bg-blue-600 text-white" },
            { id: "orders", label: "Production Batches", icon: Layers, badge: `${orders.length}`, badgeColor: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200" },
            { id: "qc", label: "QC Lab Gate", icon: FlaskConical },
            { id: "dispatch", label: "Packing & Dispatch", icon: Truck },
            { id: "tracker", label: "Order Workflow Stepper", icon: Search, badge: "7-Stage", badgeColor: "bg-emerald-600 text-white" },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${isActive
                  ? "bg-[#081F5C] dark:bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${t.badgeColor}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          TAB 1: FACTORY INBOX (ORDERS & INDENTS LINED UP)
      ======================================================== */}
      {tab === "inbox" && (
        <div className="space-y-5">
          {/* Inbox Overview Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#081F5C] dark:text-sky-300 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                Factory Production Inbox — {factoryCode}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Orders queued for this manufacturing line. Accept an order to trigger the automated BOM explosion & send raw material requisition to Central Stores!
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                Lined Up Orders: <b className="text-blue-600">{inboxOrders.length}</b>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                Pending Outlet Indents: <b className="text-amber-600">{pendingIndents.length}</b>
              </div>
            </div>
          </div>

          {/* Section A: Lined Up Orders in Factory Inbox */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Assigned Production Orders in Factory Queue ({inboxOrders.length})
              </h4>

              {inboxOrders.some((o: any) => o.status === "INBOX" || o.status === "Planned") && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const unaccepted = inboxOrders.filter(
                        (o: any) => o.status === "INBOX" || o.status === "Planned"
                      );
                      if (selectedOrderIds.length === unaccepted.length) {
                        setSelectedOrderIds([]);
                      } else {
                        setSelectedOrderIds(unaccepted.map((o: any) => o.id));
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-xs font-bold text-[#081F5C] dark:text-sky-300 shadow-sm transition"
                  >
                    {selectedOrderIds.length ===
                      inboxOrders.filter((o: any) => o.status === "INBOX" || o.status === "Planned").length &&
                    selectedOrderIds.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    Select All ({inboxOrders.filter((o: any) => o.status === "INBOX" || o.status === "Planned").length})
                  </button>

                  {selectedOrderIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchAcceptOrders}
                      disabled={batchProcessing}
                      className="px-4 py-1.5 bg-[#081F5C] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {batchProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Accept All Selected for Production ({selectedOrderIds.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {inboxOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No orders currently waiting in inbox for {factoryCode}.
              </div>
            ) : (
              inboxOrders.map((order: any) => {
                const isAccepted = order.status !== "INBOX" && order.status !== "Planned";
                const isStoreIssued = order.status === "STORE_ISSUED" || order.status === "MaterialIssued" || order.store_status === "ISSUED";
                const isProcessing = actionProcessing === order.id;

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-blue-400 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {!isAccepted && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOrderIds((prev) =>
                                prev.includes(order.id)
                                  ? prev.filter((id) => id !== order.id)
                                  : [...prev, order.id]
                              )
                            }
                            className="mt-1"
                          >
                            {selectedOrderIds.includes(order.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        )}
                        <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#081F5C] dark:text-sky-400">
                            {order.prod_no}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Source: {order.source_type} ({order.source_ref})
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Target Outlet: <b>{order.target_outlet_code || "DEL01"}</b>
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {order.fg_name} ({order.fg_sku}) — Planned {order.planned_qty} {order.uom}
                        </h5>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Assigned Line: <b>{order.kettle_line}</b> • Est RM Cost: {formatINR(order.expected_rm_cost)}
                        </div>
                      </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Store Status Indicator */}
                        {isAccepted && (
                          <div
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${isStoreIssued
                              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-pulse"
                              }`}
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            {isStoreIssued ? "Stores BOM Issued" : "Stores BOM Pending"}
                          </div>
                        )}

                        {/* Acceptance or Start Cooking Actions */}
                        {!isAccepted ? (
                          <button
                            onClick={() => acceptOrder(order.id, order.prod_no)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#081F5C] dark:bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
                          >
                            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Accept & Requisition Stores
                          </button>
                        ) : isStoreIssued ? (
                          <button
                            onClick={() => startCooking(order.id, order.kettle_line)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            Start Cooking
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Awaiting Stores to issue BOM materials
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setSearchQuery(order.prod_no);
                            setTab("tracker");
                            handleTrackOrder(order.prod_no);
                          }}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                          title="View 7-Stage Workflow Progress"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Section B: Direct Outlet Indents Queue */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" />
                Incoming Outlet Indents Awaiting Production Allocation ({pendingIndents.length})
              </h4>

              {pendingIndents.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIndentIds.length === pendingIndents.length) {
                        setSelectedIndentIds([]);
                      } else {
                        setSelectedIndentIds(pendingIndents.map((i: any) => i.id));
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-sm transition"
                  >
                    {selectedIndentIds.length === pendingIndents.length && selectedIndentIds.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    Select All ({pendingIndents.length})
                  </button>

                  {selectedIndentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchAcceptIndents}
                      disabled={batchProcessing}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {batchProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Allot All Selected Indents ({selectedIndentIds.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {pendingIndents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                No unallocated outlet indents found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingIndents.map((ind: any) => {
                  const isProcessing = actionProcessing === `indent-${ind.id}`;
                  return (
                    <div
                      key={ind.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedIndentIds((prev) =>
                              prev.includes(ind.id) ? prev.filter((id) => id !== ind.id) : [...prev, ind.id]
                            )
                          }
                          className="mt-0.5"
                        >
                          {selectedIndentIds.includes(ind.id) ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-700 dark:text-sky-300">{ind.indent_no}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700">
                            Outlet: {ind.outlet_code}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{ind.priority} Priority</span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-1">
                          {ind.item_name} ({ind.sku})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Demand Qty: <b>{ind.qty} {ind.uom}</b>
                        </div>
                      </div>
                      </div>

                      <button
                        onClick={() => acceptIndent(ind.id, ind.indent_no)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#081F5C] dark:bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
                      >
                        {isProcessing ? "Allocating..." : "Accept Indent"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: LIVE KETTLES & COOKING FLOOR TELEMETRY
      ======================================================== */}
      {tab === "kettles" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                Sweet Factory Floor — Live Kettle & Evaporator Telemetry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time steam pressure, temperatures, scraper RPM, and active halwai operations across production lines.
              </p>
            </div>
          </div>

          {/* Kettle Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kettles.map((k) => {
              const isRunning = k.status === "RUNNING" || k.status === "COOKING";
              const isSimmering = k.status === "SIMMERING" || k.status === "COOLING";

              return (
                <div
                  key={k.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-sky-400">{k.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isRunning
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 animate-pulse"
                            : isSimmering
                              ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
                              : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                            }`}
                        >
                          {k.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{k.name}</h4>
                      <p className="text-[11px] text-slate-400">{k.type} • Cap: {k.capacity}</p>
                    </div>
                  </div>

                  {/* Telemetry Dials */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Thermometer className="w-3 h-3 text-rose-500" /> Temp
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                        {k.temp_c}°C
                      </div>
                      <div className="text-[9px] text-slate-400">Target {k.target_temp_c}°C</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Gauge className="w-3 h-3 text-blue-500" /> Pressure
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                        {k.pressure_bar} bar
                      </div>
                      <div className="text-[9px] text-slate-400">Steam Jacketed</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                        <RefreshCw className="w-3 h-3 text-emerald-500" /> Stirrer
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                        {k.rpm} RPM
                      </div>
                      <div className="text-[9px] text-slate-400">Planetary Scraper</div>
                    </div>
                  </div>

                  {/* Active Batch & Halwai */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Active Batch:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{k.active_batch}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Head Halwai / Operator:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{k.operator}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${k.progress_pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schedule New Batch Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-[#081F5C] dark:text-sky-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Schedule New Sweet Production Batch to Floor
            </h4>
            <form onSubmit={createBatchPlan} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Finished Good Sweet</label>
                <select
                  value={fgSku}
                  onChange={(e) => setFgSku(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="FG-RAS-01">Spongy White Rasgulla (Milk Sweet)</option>
                  <option value="FG-KAJU-01">Royal Silver-Leaf Kaju Katli (Dryfruit)</option>
                  <option value="FG-BESAN-01">Desi Ghee Besan Laddu (Ghee Sweet)</option>
                  <option value="FG-GULAB-01">Hot Kesar Gulab Jamun (Mawa Sweet)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Planned Qty (kg)</label>
                <input
                  type="number"
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Assigned Kettle Line</label>
                <select
                  value={selectedKettle}
                  onChange={(e) => setSelectedKettle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="Steam Kettle #1 (Chhena/Syrup)">Steam Kettle #1 (Chhena/Syrup)</option>
                  <option value="Rotary Khoya Evaporator #2">Rotary Khoya Evaporator #2</option>
                  <option value="Planetary Kaju Cooker #3">Planetary Kaju Cooker #3</option>
                  <option value="Heavy Besan Roaster #4">Heavy Besan Roaster #4</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition"
                >
                  Queue Batch Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: PRODUCTION BATCHES & WIP STAGES
      ======================================================== */}
      {tab === "orders" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Production Floor Batches ({orders.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                  <th className="py-2.5">Prod No</th>
                  <th>Finished Good</th>
                  <th>Planned Qty</th>
                  <th>Kettle Line</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => {
                  const isCooking = o.status === "InProduction" || o.status === "IN_PRODUCTION";
                  const isQcPassed = o.status === "QC_Passed" || o.status === "QC_PASSED";
                  const isDispatched = o.status === "DispatchedToStore" || o.status === "DISPATCHED";

                  return (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 font-mono font-bold text-blue-700 dark:text-sky-400">{o.prod_no}</td>
                      <td>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{o.fg_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{o.fg_sku}</div>
                      </td>
                      <td className="font-semibold">
                        {o.planned_qty} {o.uom}
                      </td>
                      <td className="text-slate-600 dark:text-slate-400">{o.kettle_line}</td>
                      <td className="w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${o.progress_pct || 20}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">{o.progress_pct || 20}%</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDispatched
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : isQcPassed
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : isCooking
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse"
                                : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {isCooking && (
                            <button
                              onClick={() => {
                                setQcOrder(o);
                                setActualQty(Number(o.planned_qty));
                                setTab("qc");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              QC Test
                            </button>
                          )}
                          {isQcPassed && (
                            <button
                              onClick={() => dispatchToStore(o.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#081F5C] hover:bg-blue-900 text-white font-bold text-[11px]"
                            >
                              Dispatch
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSearchQuery(o.prod_no);
                              setTab("tracker");
                              handleTrackOrder(o.prod_no);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                            title="View Track"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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

      {/* ========================================================
          TAB 4: QC LAB GATE
      ======================================================== */}
      {tab === "qc" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FlaskConical className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                QC Lab Quality & Food Safety Release Gate
              </h3>
              <p className="text-slate-500">Refractometer Brix, Moisture, Core Temp & FSSAI Standards</p>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Select Batch Under Test</label>
            <select
              value={qcOrder?.id || ""}
              onChange={(e) => {
                const found = orders.find((o) => o.id === Number(e.target.value));
                setQcOrder(found);
                if (found) setActualQty(Number(found.planned_qty));
              }}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">-- Choose Cooking Batch --</option>
              {orders
                .filter((o) => o.status === "InProduction" || o.status === "IN_PRODUCTION" || o.status === "STORE_ISSUED")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.prod_no} - {o.fg_name} ({o.planned_qty} {o.uom})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Actual Yield (kg)</label>
              <input
                type="number"
                step="0.1"
                value={actualQty}
                onChange={(e) => setActualQty(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Refractometer Brix %</label>
              <input
                type="number"
                step="0.1"
                value={brixPct}
                onChange={(e) => setBrixPct(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Moisture %</label>
              <input
                type="number"
                step="0.1"
                value={moisturePct}
                onChange={(e) => setMoisturePct(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <button
            onClick={submitQc}
            disabled={!qcOrder}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            Validate QC, Log Yield Variance & Release Batch
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 5: PACKING & DISPATCH
      ======================================================== */}
      {tab === "dispatch" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#081F5C] dark:text-sky-300">
              Finished Goods Inward & Store Dispatch
            </h3>
            <p className="text-slate-500">
              Transfer approved batches directly to Retail Outlet Cold Shelf or Main Warehouse.
            </p>

            <div className="space-y-2">
              {orders
                .filter((o) => o.status === "QC_Passed" || o.status === "QC_PASSED")
                .map((o) => (
                  <div
                    key={o.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{o.fg_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {o.prod_no} • {o.actual_qty || o.planned_qty} {o.uom}
                      </div>
                    </div>
                    <button
                      onClick={() => dispatchToStore(o.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 text-white font-bold hover:bg-blue-700"
                    >
                      Dispatch & Inward
                    </button>
                  </div>
                ))}
              {orders.filter((o) => o.status === "QC_Passed" || o.status === "QC_PASSED").length === 0 && (
                <div className="p-4 text-center text-slate-400">No batches waiting for dispatch.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              Automated GS1 / EAN Barcode Generation
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
              <BarcodeSvg value="FG-RAS-261115-01" className="h-16 mx-auto" />
              <div className="text-[11px] font-mono text-slate-500 mt-2">
                EAN-128 Batch Lot: FG-RAS-261115-01 • FSSAI Lic #10824002000101
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: VISUAL ORDER WORKFLOW STEPPER (UNIVERSAL TRACKER)
      ======================================================== */}
      {tab === "tracker" && (
        <div className="space-y-5">
          {/* Search Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Universal Order & Production Cycle Tracker
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Enter any Indent No, Production Order No, Requisition No, or SKU to inspect the 7-stage live workflow timeline.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackOrder();
              }}
              className="flex items-center gap-2 max-w-xl"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. PRD-2026-101, IND-2026-021, REQ-MAT-2026-103..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-5 py-2.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition disabled:opacity-50"
              >
                {trackingLoading ? "Tracking..." : "Track Order"}
              </button>
            </form>

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
              <span className="text-slate-400">Quick Track:</span>
              {["PRD-2026-101", "PRD-2026-102", "PRD-2026-103", "PRD-2026-104", "IND-2026-018"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSearchQuery(chip);
                    handleTrackOrder(chip);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 font-mono text-slate-600 dark:text-slate-300 transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Result View */}
          {trackingError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center text-xs text-rose-800 dark:text-rose-200">
              {trackingError}
            </div>
          )}

          {trackedOrder && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Order Summary Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-blue-700 dark:text-sky-300">
                      {trackedOrder.prod_no || trackedOrder.order_ref}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Source Ref: {trackedOrder.source_ref}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {trackedOrder.current_status}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {trackedOrder.fg_name} ({trackedOrder.fg_sku})
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Batch Volume: <b>{trackedOrder.qty} {trackedOrder.uom}</b> • Factory: <b>{trackedOrder.factory_code}</b> • Dest: <b>Outlet {trackedOrder.target_outlet_code}</b>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Cycle Completion</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-sky-400 font-mono">
                    {trackedOrder.progress_pct}%
                  </div>
                </div>
              </div>

              {/* Minimalist 7-Stage Horizontal Stepper */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  7-Stage End-to-End Fulfillment Pipeline
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  {trackedOrder.stages.map((st) => {
                    const isDone = st.status === "COMPLETED";
                    const isInProgress = st.status === "IN_PROGRESS";
                    const isPending = st.status === "PENDING";

                    return (
                      <div
                        key={st.stage}
                        className={`p-3 rounded-2xl border transition-all ${isDone
                          ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                          : isInProgress
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 ring-2 ring-blue-300 dark:ring-blue-800"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${isDone
                              ? "bg-emerald-600 text-white"
                              : isInProgress
                                ? "bg-blue-600 text-white animate-pulse"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                              }`}
                          >
                            {isDone ? <Check className="w-3.5 h-3.5" /> : st.stage}
                          </span>

                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${isDone
                              ? "bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                              : isInProgress
                                ? "bg-blue-200/80 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "text-slate-400"
                              }`}
                          >
                            {st.badge}
                          </span>
                        </div>

                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{st.label}</div>
                        <div className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-0.5">{st.title}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-2 mt-1">{st.desc}</div>

                        {st.completed_at && (
                          <div className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 mt-2 font-semibold">
                            {st.completed_at}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
