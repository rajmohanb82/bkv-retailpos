import React, { useEffect, useState } from "react";
import {
  Warehouse,
  Boxes,
  BellRing,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Send,
  PackageCheck,
  Clock,
  Check,
  RefreshCw,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  FileCheck,
  X,
  Sparkles
} from "lucide-react";
import { apiFetch, formatINR } from "../api";

interface StoresModuleProps {
  initialTab?: "inbox" | "checkinout" | "batches" | "bom" | "alerts" | "transfer";
}

interface BomIngredient {
  rm_sku: string;
  rm_name: string;
  qty: number;
  uom: string;
  is_packaging?: boolean;
  substitute_sku?: string | null;
}

interface BomMaster {
  id: number;
  fg_sku: string;
  fg_name: string;
  output_qty: number;
  output_uom: string;
  expected_loss_pct: number;
  version: string;
  ingredients: BomIngredient[];
}

export const StoresModule: React.FC<StoresModuleProps> = ({ initialTab = "inbox" }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [boms, setBoms] = useState<BomMaster[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [festivalMult, setFestivalMult] = useState<number>(1.0);
  const [tab, setTab] = useState<"inbox" | "checkinout" | "batches" | "bom" | "alerts" | "transfer">(initialTab);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const [searchReq, setSearchReq] = useState("");

  // Check-In (Inward) State
  const [inwardStore, setInwardStore] = useState("STR-DEL-RM");
  const [inwardSku, setInwardSku] = useState("RM-KAJU-01");
  const [inwardItemName, setInwardItemName] = useState("Whole Cashew W240 Grade");
  const [inwardBatchNo, setInwardBatchNo] = useState("");
  const [inwardQty, setInwardQty] = useState(25);
  const [inwardUom, setInwardUom] = useState("kg");
  const [inwardUnitCost, setInwardUnitCost] = useState(720);
  const [inwardExpiryDays, setInwardExpiryDays] = useState(60);
  const [inwardSupplierRef, setInwardSupplierRef] = useState("PO-2026-0043 / Kamadhenu");
  const [inwardActor, setInwardActor] = useState("Central Stores Officer");
  const [inwardLoading, setInwardLoading] = useState(false);

  // Check-Out (Outward / Issue) State
  const [outwardStore, setOutwardStore] = useState("STR-DEL-RM");
  const [outwardSku, setOutwardSku] = useState("RM-KAJU-01");
  const [outwardBatchNo, setOutwardBatchNo] = useState("");
  const [outwardQty, setOutwardQty] = useState(5);
  const [outwardUom, setOutwardUom] = useState("kg");
  const [outwardPurpose, setOutwardPurpose] = useState("Issue to Sweet Factory");
  const [outwardRefNo, setOutwardRefNo] = useState("Kettle #1 (Royal Kaju Katli)");
  const [outwardActor, setOutwardActor] = useState("Storekeeper");
  const [outwardLoading, setOutwardLoading] = useState(false);

  // Recipe & BOM Studio State
  const [showBomModal, setShowBomModal] = useState(false);
  const [editingBomId, setEditingBomId] = useState<number | null>(null);
  const [bomFgSku, setBomFgSku] = useState("FG-KAJU-01");
  const [bomFgName, setBomFgName] = useState("Royal Kaju Katli");
  const [bomOutputQty, setBomOutputQty] = useState(1);
  const [bomOutputUom, setBomOutputUom] = useState("kg");
  const [bomTolerance, setBomTolerance] = useState(1.5);
  const [bomVersion, setBomVersion] = useState("v2.1");
  const [bomIngredients, setBomIngredients] = useState<BomIngredient[]>([
    { rm_sku: "RM-KAJU-01", rm_name: "Whole Cashew W240 Grade", qty: 0.65, uom: "kg", is_packaging: false },
    { rm_sku: "RM-SUG-01", rm_name: "Refined Sulphur-Free Sugar", qty: 0.35, uom: "kg", is_packaging: false },
    { rm_sku: "RM-SILVER-01", rm_name: "Edible Silver Foil (Vark)", qty: 2.0, uom: "pcs", is_packaging: false },
    { rm_sku: "PKG-BOX-1K", rm_name: "1kg Heritage Gift Box", qty: 1.0, uom: "pcs", is_packaging: true },
  ]);

  // BOM Explosion tool state
  const [bomSku, setBomSku] = useState("FG-RAS-01");
  const [bomQty, setBomQty] = useState(100);
  const [bomProdNo, setBomProdNo] = useState("PRD-2026-092");
  const [bomPreview, setBomPreview] = useState<any>(null);

  // IST Transfer state
  const [fromStore, setFromStore] = useState("STR-MFG-COLD");
  const [toStore, setToStore] = useState("STR-DEL01-BACK");
  const [istSku, setIstSku] = useState("FG-RAS-01");
  const [istQty, setIstQty] = useState(10);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const load = async () => {
    try {
      const [st, bt, al, rq, mv, bm] = await Promise.all([
        apiFetch<any[]>("/api/stores/stores").catch(() => []),
        apiFetch<any[]>(`/api/stores/batches${selectedStore ? `?store_code=${selectedStore}` : ""}`).catch(() => []),
        apiFetch<any>(`/api/stores/alerts?festival_multiplier=${festivalMult}`).catch(() => ({ rop_alerts: [], expiry_alerts: [] })),
        apiFetch<any[]>("/api/stores/material-requisitions").catch(() => []),
        apiFetch<any[]>("/api/stores/check-in-out/movements").catch(() => []),
        apiFetch<BomMaster[]>("/api/stores/boms").catch(() => []),
      ]);
      setStores(st);
      setBatches(bt);
      setAlerts(al);
      setRequisitions(rq);
      setMovements(mv);
      setBoms(bm);
    } catch (e: any) {
      console.error("Stores fetch error:", e);
    }
  };

  useEffect(() => {
    load();
  }, [selectedStore, festivalMult]);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // Submit Check-In (Inward GRN)
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setInwardLoading(true);
    try {
      const expDate = new Date(Date.now() + inwardExpiryDays * 86400000).toISOString().slice(0, 10);
      const res = await apiFetch<any>("/api/stores/check-in", {
        method: "POST",
        body: JSON.stringify({
          store_code: inwardStore,
          sku: inwardSku,
          item_name: inwardItemName,
          batch_no: inwardBatchNo.trim() || undefined,
          qty: inwardQty,
          uom: inwardUom,
          unit_cost: inwardUnitCost,
          expiry_date: expDate,
          supplier_ref: inwardSupplierRef,
          actor: inwardActor,
        }),
      });
      notify(true, `Inward Successful! Batch ${res.batch_no} created with ${res.qty_inward} ${res.uom} in store ${res.store_code}.`);
      setInwardBatchNo("");
      load();
    } catch (err: any) {
      notify(false, err.message || "Failed to process Check-In");
    } finally {
      setInwardLoading(false);
    }
  };

  // Submit Check-Out (Department Issue)
  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutwardLoading(true);
    try {
      const res = await apiFetch<any>("/api/stores/check-out", {
        method: "POST",
        body: JSON.stringify({
          store_code: outwardStore,
          sku: outwardSku,
          batch_no: outwardBatchNo.trim() || undefined,
          qty: outwardQty,
          uom: outwardUom,
          purpose: outwardPurpose,
          ref_no: outwardRefNo,
          actor: outwardActor,
        }),
      });
      notify(true, `Outward Issue Successful! ${res.qty_issued} ${res.uom} issued from Batch ${res.batch_no} (Rem: ${res.remaining_batch_qty} ${res.uom}).`);
      load();
    } catch (err: any) {
      notify(false, err.message || "Failed to process Check-Out");
    } finally {
      setOutwardLoading(false);
    }
  };

  // Open Create/Edit BOM Modal
  const openNewBomModal = () => {
    setEditingBomId(null);
    setBomFgSku("FG-NEW-01");
    setBomFgName("Special Assorted Sweet Platter");
    setBomOutputQty(1);
    setBomOutputUom("thal");
    setBomTolerance(2.0);
    setBomVersion("v1.0");
    setBomIngredients([
      { rm_sku: "RM-KAJU-01", rm_name: "Whole Cashew W240", qty: 0.25, uom: "kg", is_packaging: false },
      { rm_sku: "RM-GHEE-01", rm_name: "A2 Desi Ghee", qty: 0.15, uom: "kg", is_packaging: false },
      { rm_sku: "PKG-BOX-THAL", rm_name: "Golden Handcrafted Thal Box", qty: 1.0, uom: "pcs", is_packaging: true },
    ]);
    setShowBomModal(true);
  };

  const openEditBomModal = (bom: BomMaster) => {
    setEditingBomId(bom.id);
    setBomFgSku(bom.fg_sku);
    setBomFgName(bom.fg_name);
    setBomOutputQty(bom.output_qty);
    setBomOutputUom(bom.output_uom || "kg");
    setBomTolerance(bom.expected_loss_pct || 0);
    setBomVersion(bom.version || "v1.0");
    setBomIngredients([...(bom.ingredients || [])]);
    setShowBomModal(true);
  };

  const addIngredientRow = () => {
    setBomIngredients([
      ...bomIngredients,
      { rm_sku: "RM-NEW-01", rm_name: "New Ingredient", qty: 0.1, uom: "kg", is_packaging: false },
    ]);
  };

  const removeIngredientRow = (idx: number) => {
    setBomIngredients(bomIngredients.filter((_, i) => i !== idx));
  };

  const updateIngredientField = (idx: number, field: keyof BomIngredient, value: any) => {
    const updated = [...bomIngredients];
    updated[idx] = { ...updated[idx], [field]: value };
    setBomIngredients(updated);
  };

  const saveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bomIngredients.length === 0) {
      notify(false, "At least one ingredient is required in the BOM recipe!");
      return;
    }
    try {
      const payload = {
        fg_sku: bomFgSku,
        fg_name: bomFgName,
        output_qty: Number(bomOutputQty),
        output_uom: bomOutputUom,
        expected_loss_pct: Number(bomTolerance),
        version: bomVersion,
        ingredients: bomIngredients.map((ing) => ({
          ...ing,
          qty: Number(ing.qty),
        })),
      };

      if (editingBomId) {
        await apiFetch(`/api/stores/boms/${editingBomId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        notify(true, `Recipe BOM for ${bomFgName} updated successfully!`);
      } else {
        await apiFetch("/api/stores/boms", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        notify(true, `New Recipe BOM for ${bomFgName} created successfully!`);
      }
      setShowBomModal(false);
      load();
    } catch (err: any) {
      notify(false, err.message || "Failed to save BOM recipe");
    }
  };

  const deleteBom = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the recipe for "${name}"?`)) return;
    try {
      await apiFetch(`/api/stores/boms/${id}`, { method: "DELETE" });
      notify(true, `Recipe BOM deleted`);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const issueRequisitionBom = async (reqId: number, prodNo: string) => {
    setIssuingId(reqId);
    try {
      const res = await apiFetch(`/api/stores/material-requisitions/${reqId}/issue`, {
        method: "POST",
        body: JSON.stringify({ actor: "Suresh Sharma (Central Stores Head)" }),
      });
      notify(true, res.message || `FEFO BOM Materials issued cleanly for Production Order ${prodNo}!`);
      load();
    } catch (e: any) {
      notify(false, e.message || "Failed to issue requisition materials");
    } finally {
      setIssuingId(null);
    }
  };

  const runBomExplode = async () => {
    const res = await apiFetch(`/api/stores/bom-explode?fg_sku=${bomSku}&qty=${bomQty}`);
    setBomPreview(res);
  };

  const issueBom = async () => {
    try {
      const res = await apiFetch("/api/stores/bom-issue", {
        method: "POST",
        body: JSON.stringify({
          prod_no: bomProdNo,
          fg_sku: bomSku,
          qty_to_produce: bomQty,
        }),
      });
      notify(true, `FEFO Raw Materials Issued to ${res.prod_no}! WIP Cost: ${formatINR(res.total_rm_cost)}`);
      load();
      runBomExplode();
    } catch (e: any) {
      notify(false, e.message);
      load();
    }
  };

  const runIst = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/stores/ist-transfer", {
        method: "POST",
        body: JSON.stringify({
          from_store: fromStore,
          to_store: toStore,
          sku: istSku,
          qty: istQty,
        }),
      });
      notify(true, `IST Completed! E-Way Bill ${res.eway_bill_no} generated.`);
      load();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const raiseAutoPr = async (sku: string, qty: number) => {
    const res = await apiFetch(`/api/stores/auto-pr?sku=${sku}&qty=${qty}`, { method: "POST" });
    notify(true, `Auto-PR ${res.pr_no} created for Vendor Management!`);
    load();
  };

  const pendingCount = requisitions.filter((r) => r.status !== "ISSUED").length;
  const filteredReqs = requisitions.filter(
    (r) =>
      r.req_no.toLowerCase().includes(searchReq.toLowerCase()) ||
      r.prod_no.toLowerCase().includes(searchReq.toLowerCase()) ||
      r.fg_name.toLowerCase().includes(searchReq.toLowerCase()) ||
      r.fg_sku.toLowerCase().includes(searchReq.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
            toast.ok
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Multi-Store Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stores.map((s) => (
          <button
            key={s.store_code}
            onClick={() => setSelectedStore(selectedStore === s.store_code ? "" : s.store_code)}
            className={`text-left p-3.5 rounded-2xl border transition ${
              selectedStore === s.store_code
                ? "bg-[#081F5C] text-white border-[#081F5C] shadow"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="font-mono">{s.store_code}</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  selectedStore === s.store_code
                    ? "bg-white/20 text-white"
                    : "bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                }`}
              >
                {s.temp_zone}
              </span>
            </div>
            <div className="text-xs font-bold mt-1.5 truncate">{s.name}</div>
            <div
              className={`text-[11px] mt-1 ${
                selectedStore === s.store_code ? "text-sky-200" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {s.store_type} • {s.storekeeper}
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "inbox",
              label: "Stores Inbox",
              icon: Inbox,
              badge: pendingCount > 0 ? `${pendingCount} Pending` : null,
              badgeColor: "bg-amber-500 text-white",
            },
            {
              id: "checkinout",
              label: "Check-In & Check-Out Desk",
              icon: ArrowDownToLine,
              badge: `${movements.length} Logs`,
              badgeColor: "bg-blue-600 text-white",
            },
            { id: "batches", label: "FEFO Stock Batches", icon: Warehouse },
            { id: "bom", label: "Recipe & BOM Studio", icon: Boxes, badge: `${boms.length} Recipes` },
            {
              id: "alerts",
              label: `Intelligent Alerts (${(alerts?.rop_alerts?.length || 0) + (alerts?.expiry_alerts?.length || 0)})`,
              icon: BellRing,
            },
            { id: "transfer", label: "Inter-Store Transfer (IST)", icon: ArrowRightLeft },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id as any);
                  if (t.id === "bom" && !bomPreview) runBomExplode();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isActive
                    ? "bg-[#081F5C] dark:bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${t.badgeColor || "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={load}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Refresh Stores Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================
          TAB 0: STORES INBOX (MATERIAL REQUISITIONS FROM FACTORY)
      ======================================================== */}
      {tab === "inbox" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                Central Store Inbox — Raw Material Requisitions from Sweet Factory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Orders accepted by the Production Manager appear here. Click "Issue BOM Materials" to deduct raw materials via FEFO.
              </p>
            </div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Req No, SKU, FG Name..."
                value={searchReq}
                onChange={(e) => setSearchReq(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredReqs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 text-xs">
                No material requisitions found in Inbox. Orders accepted in Factory will appear here instantly.
              </div>
            ) : (
              filteredReqs.map((req) => {
                const isIssued = req.status === "ISSUED";
                const isProcessing = issuingId === req.id;
                return (
                  <div
                    key={req.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition ${
                      isIssued
                        ? "border-emerald-200/80 dark:border-emerald-900/60"
                        : "border-amber-200 dark:border-amber-900/60 bg-amber-50/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 text-sm">{req.req_no}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isIssued
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {isIssued ? "MATERIALS ISSUED" : "PENDING STORE ISSUE"}
                          </span>
                          <span className="font-mono text-xs text-slate-500">Ref: {req.prod_no}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Produce {req.qty_to_produce} kg of {req.fg_name} ({req.fg_sku})
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-4">
                          <span>Requisitioned By: <b>{req.requested_by}</b></span>
                          <span>Est. RM Cost: <b>{formatINR(req.estimated_rm_cost || 0)}</b></span>
                          {req.issued_at && <span>Issued At: {new Date(req.issued_at).toLocaleString()}</span>}
                        </div>
                      </div>

                      <div>
                        {isIssued ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-4 h-4" />
                            Issued by {req.issued_by || "Stores"}
                          </div>
                        ) : (
                          <button
                            onClick={() => issueRequisitionBom(req.id, req.prod_no)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="w-3.5 h-3.5" />
                            )}
                            Issue BOM Raw Materials via FEFO
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Ingredients Breakdown */}
                    {req.ingredients && req.ingredients.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] font-bold text-slate-500 mb-2">Required BOM Formulation:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          {req.ingredients.map((ing: any, i: number) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px]"
                            >
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{ing.rm_name}</div>
                              <div className="font-mono text-slate-500">{ing.rm_sku}</div>
                              <div className="text-blue-600 font-bold mt-1">
                                {ing.required_qty} {ing.uom}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 1: CHECK-IN & CHECK-OUT DESK (MATERIAL MOVEMENTS)
      ======================================================== */}
      {tab === "checkinout" && (
        <div className="space-y-5">
          {/* Top Check-In & Check-Out Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Check-In Form (GRN Inward) */}
            <form
              onSubmit={handleCheckIn}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Material Check-In (GRN / Inward)
                    </h3>
                    <p className="text-[11px] text-slate-500">Inward fresh raw materials, generate batch & assign shelf</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                  INWARD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Store</label>
                  <select
                    value={inwardStore}
                    onChange={(e) => setInwardStore(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {stores.map((s) => (
                      <option key={s.store_code} value={s.store_code}>
                        {s.name} ({s.store_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item SKU</label>
                  <select
                    value={inwardSku}
                    onChange={(e) => {
                      setInwardSku(e.target.value);
                      if (e.target.value === "RM-KAJU-01") setInwardItemName("Whole Cashew W240 Grade");
                      else if (e.target.value === "RM-GHEE-01") setInwardItemName("A2 Bilona Desi Ghee");
                      else if (e.target.value === "RM-SUG-01") setInwardItemName("Refined Sulphur-Free Sugar");
                      else if (e.target.value === "RM-MILK-01") setInwardItemName("Fresh Buffalo Milk 6.5% Fat");
                      else if (e.target.value === "RM-PISTA-01") setInwardItemName("Iranian Roasted Pistachio");
                      else if (e.target.value === "PKG-BOX-1K") { setInwardItemName("1kg Heritage Gift Box"); setInwardUom("pcs"); setInwardUnitCost(45); }
                    }}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="RM-KAJU-01">RM-KAJU-01 (Whole Cashew W240)</option>
                    <option value="RM-GHEE-01">RM-GHEE-01 (A2 Bilona Desi Ghee)</option>
                    <option value="RM-SUG-01">RM-SUG-01 (Refined Sugar)</option>
                    <option value="RM-MILK-01">RM-MILK-01 (Buffalo Milk 6.5%)</option>
                    <option value="RM-PISTA-01">RM-PISTA-01 (Iranian Pistachio)</option>
                    <option value="PKG-BOX-1K">PKG-BOX-1K (1kg Heritage Box)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inward Qty</label>
                  <input
                    type="number"
                    step="any"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UOM</label>
                  <select
                    value={inwardUom}
                    onChange={(e) => setInwardUom(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                    <option value="boxes">boxes</option>
                    <option value="g">g</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={inwardUnitCost}
                    onChange={(e) => setInwardUnitCost(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Batch No (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={inwardBatchNo}
                    onChange={(e) => setInwardBatchNo(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shelf Life (Days to Expiry)
                  </label>
                  <input
                    type="number"
                    value={inwardExpiryDays}
                    onChange={(e) => setInwardExpiryDays(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">PO / Vendor Ref</label>
                  <input
                    type="text"
                    value={inwardSupplierRef}
                    onChange={(e) => setInwardSupplierRef(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Receiving Officer</label>
                  <input
                    type="text"
                    value={inwardActor}
                    onChange={(e) => setInwardActor(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium text-[11px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={inwardLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow transition flex items-center justify-center gap-2"
              >
                {inwardLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                Confirm Check-In & Generate GRN Batch
              </button>
            </form>

            {/* Check-Out Form (Department Issue) */}
            <form
              onSubmit={handleCheckOut}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                    <ArrowUpFromLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Material Check-Out (Issue / Outward)
                    </h3>
                    <p className="text-[11px] text-slate-500">Issue material to factory floor, kitchen or retail counter</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px]">
                  OUTWARD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Source Store</label>
                  <select
                    value={outwardStore}
                    onChange={(e) => setOutwardStore(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {stores.map((s) => (
                      <option key={s.store_code} value={s.store_code}>
                        {s.name} ({s.store_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Material SKU</label>
                  <select
                    value={outwardSku}
                    onChange={(e) => setOutwardSku(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="RM-KAJU-01">RM-KAJU-01 (Whole Cashew W240)</option>
                    <option value="RM-GHEE-01">RM-GHEE-01 (A2 Bilona Desi Ghee)</option>
                    <option value="RM-SUG-01">RM-SUG-01 (Refined Sugar)</option>
                    <option value="RM-MILK-01">RM-MILK-01 (Buffalo Milk 6.5%)</option>
                    <option value="RM-PISTA-01">RM-PISTA-01 (Iranian Pistachio)</option>
                    <option value="PKG-BOX-1K">PKG-BOX-1K (1kg Heritage Box)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Issue Qty</label>
                  <input
                    type="number"
                    step="any"
                    value={outwardQty}
                    onChange={(e) => setOutwardQty(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UOM</label>
                  <select
                    value={outwardUom}
                    onChange={(e) => setOutwardUom(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                    <option value="boxes">boxes</option>
                    <option value="g">g</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Specific Batch No</label>
                  <input
                    type="text"
                    placeholder="Auto FEFO if blank"
                    value={outwardBatchNo}
                    onChange={(e) => setOutwardBatchNo(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Purpose / Operation</label>
                  <select
                    value={outwardPurpose}
                    onChange={(e) => setOutwardPurpose(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="Issue to Sweet Factory">Issue to Sweet Factory</option>
                    <option value="Issue to Restaurant Kitchen">Issue to Restaurant Kitchen</option>
                    <option value="Transfer to Counter Display">Transfer to Counter Display</option>
                    <option value="Sample / Quality Tasting">Sample / Quality Tasting</option>
                    <option value="Scrap / Spoilage Written Off">Scrap / Spoilage Written Off</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination / Ref</label>
                  <input
                    type="text"
                    value={outwardRefNo}
                    onChange={(e) => setOutwardRefNo(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Issued By (Actor)</label>
                <input
                  type="text"
                  value={outwardActor}
                  onChange={(e) => setOutwardActor(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium text-[11px]"
                />
              </div>

              <button
                type="submit"
                disabled={outwardLoading}
                className="w-full py-2.5 rounded-xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold shadow transition flex items-center justify-center gap-2"
              >
                {outwardLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpFromLine className="w-4 h-4" />}
                Process Check-Out & Deduct Stock
              </button>
            </form>
          </div>

          {/* Movement Audit Ledger Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  Live Material Movement Audit Ledger ({movements.length} Records)
                </h3>
                <p className="text-xs text-slate-500">Chronological FEFO audit trail of all GRN check-ins and departmental check-outs</p>
              </div>
              <button
                onClick={load}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Movement No</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Store</th>
                    <th className="py-2.5 px-3">SKU & Batch</th>
                    <th className="py-2.5 px-3 text-right">Qty & UOM</th>
                    <th className="py-2.5 px-3">Reason / Ref</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {movements.slice(0, 25).map((m) => {
                    const isInward = m.movement_type === "CHECK_IN_GRN";
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{m.movement_no}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isInward
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {isInward ? "GRN INWARD" : "ISSUE OUTWARD"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{m.store_code}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-blue-600">{m.sku}</span>
                          <span className="text-slate-400 font-mono text-[11px] block">{m.batch_no}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          <span className={isInward ? "text-emerald-600" : "text-amber-600"}>
                            {isInward ? "+" : "-"}{m.qty} {m.uom}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          <div>{m.reason_code}</div>
                          {m.ref_no && <div className="text-[10px] text-slate-400 font-mono">{m.ref_no}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{m.actor}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: FEFO STOCK BATCHES
      ======================================================== */}
      {tab === "batches" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-blue-600" />
                FEFO Stock Batches & Shelf Allocation
              </h3>
              <p className="text-xs text-slate-500">
                Sorted strictly by closest expiry date. Outward dispatch will always consume top batch first.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Store</th>
                  <th className="py-2.5 px-3">Batch No</th>
                  <th className="py-2.5 px-3">Raw Material / Item</th>
                  <th className="py-2.5 px-3 text-right">Available Qty</th>
                  <th className="py-2.5 px-3">Location / Bin</th>
                  <th className="py-2.5 px-3">Mfg Date</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{b.store_code}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{b.batch_no}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 dark:text-white">{b.item_name}</span>
                      <span className="text-slate-400 font-mono text-[10px] block">{b.sku}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                      {b.qty_available} {b.uom}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{b.bin_location}</td>
                    <td className="py-2.5 px-3 text-slate-500">{b.mfg_date}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-600">{b.expiry_date}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatINR(b.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: RECIPE & BOM STUDIO + EXPLODER
      ======================================================== */}
      {tab === "bom" && (
        <div className="space-y-5">
          {/* Recipe Master Studio Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                Recipe & Bill of Materials (BOM) Master Studio
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define and calibrate finished sweet & snack formulations with variable output units (kg, g, pcs, boxes, thal, platters) and permissible shrinkage/cooking error margin %.
              </p>
            </div>
            <button
              onClick={openNewBomModal}
              className="px-4 py-2.5 rounded-2xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold text-xs shadow transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create / Modify Recipe & BOM
            </button>
          </div>

          {/* BOM Recipes Listing Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Configured Sweet & Snack Recipes ({boms.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Recipe No / Version</th>
                    <th className="py-2.5 px-3">Finished Good Item</th>
                    <th className="py-2.5 px-3">Standard Output Unit</th>
                    <th className="py-2.5 px-3 text-center">Permissible Loss / Tolerance %</th>
                    <th className="py-2.5 px-3">Ingredients Count</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {boms.map((bom) => (
                    <tr key={bom.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-bold text-blue-600">BOM-{String(bom.id).padStart(3, "0")}</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
                          {bom.version || "v1.0"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{bom.fg_name}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{bom.fg_sku}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold">
                          {bom.output_qty} {bom.output_uom}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                          ±{bom.expected_loss_pct || 0}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-600 dark:text-slate-300">
                          {(bom.ingredients || []).length} items (
                          {(bom.ingredients || []).filter((i) => i.is_packaging).length} packaging)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setBomSku(bom.fg_sku);
                            runBomExplode();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px]"
                          title="Explode this BOM"
                        >
                          Explode
                        </button>
                        <button
                          onClick={() => openEditBomModal(bom)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-[11px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBom(bom.id, bom.fg_name)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instant Exploder & FEFO Issue Tool */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-bold text-[#081F5C] dark:text-sky-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Instant Exploder & FEFO RM Allocator
              </h3>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Production Batch No</label>
                <input
                  type="text"
                  value={bomProdNo}
                  onChange={(e) => setBomProdNo(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Finished Good (FG)</label>
                <select
                  value={bomSku}
                  onChange={(e) => setBomSku(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="FG-RAS-01">FG-RAS-01: Spongy Rasgulla</option>
                  <option value="FG-KAJU-01">FG-KAJU-01: Royal Kaju Katli</option>
                  <option value="FG-BESAN-01">FG-BESAN-01: Desi Ghee Besan Laddu</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Batch Target Quantity</label>
                <input
                  type="number"
                  value={bomQty}
                  onChange={(e) => setBomQty(Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={runBomExplode}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                >
                  Calculate Explode
                </button>
                <button
                  type="button"
                  onClick={issueBom}
                  className="flex-1 py-2.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  Issue via FEFO
                </button>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Raw Material Formulation & FEFO Allocation Preview
              </h4>
              {bomPreview ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                    <span className="font-bold">{bomPreview.fg_name}</span>
                    <span className="font-bold text-emerald-600">
                      Total Estimated RM Cost: {formatINR(bomPreview.total_rm_cost)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {bomPreview.ingredients?.map((ing: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold">{ing.rm_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {ing.rm_sku} • Required: {ing.required_qty} {ing.uom}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            FEFO Batch Allocated
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Click "Calculate Explode" to simulate FEFO deduction.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CREATE / EDIT RECIPE & BOM MODAL
      ======================================================== */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={saveBom}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-[#081F5C] dark:text-white">
                  {editingBomId ? "Edit Recipe Formulation & BOM" : "Create New Recipe & BOM Formulation"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBomModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Finished Good SKU</label>
                <input
                  type="text"
                  value={bomFgSku}
                  onChange={(e) => setBomFgSku(e.target.value)}
                  placeholder="e.g. FG-KAJU-01"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Finished Good Name</label>
                <input
                  type="text"
                  value={bomFgName}
                  onChange={(e) => setBomFgName(e.target.value)}
                  placeholder="e.g. Royal Cashew Katli / Dry Fruit Thal"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                  required
                />
              </div>
            </div>

            {/* Units & Tolerance Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Output Batch Qty</label>
                <input
                  type="number"
                  step="any"
                  value={bomOutputQty}
                  onChange={(e) => setBomOutputQty(Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Output Unit (UOM)</label>
                <select
                  value={bomOutputUom}
                  onChange={(e) => setBomOutputUom(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="g">g (Grams)</option>
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="boxes">boxes (Gift Boxes)</option>
                  <option value="thal">thal (Dryfruit Thal / Plate)</option>
                  <option value="platters">platters (Savoury Platter)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Error Margin / Loss %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bomTolerance}
                  onChange={(e) => setBomTolerance(Number(e.target.value))}
                  placeholder="± %"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold text-amber-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Recipe Version</label>
                <input
                  type="text"
                  value={bomVersion}
                  onChange={(e) => setBomVersion(e.target.value)}
                  placeholder="v1.0"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Raw Material Ingredients & Packaging Materials ({bomIngredients.length})
                </span>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1 hover:bg-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Ingredient
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bomIngredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        placeholder="SKU (e.g. RM-KAJU-01)"
                        value={ing.rm_sku}
                        onChange={(e) => updateIngredientField(idx, "rm_sku", e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 font-mono text-[11px]"
                        required
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Name (e.g. Whole Cashew)"
                        value={ing.rm_name}
                        onChange={(e) => updateIngredientField(idx, "rm_name", e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-[11px]"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Qty"
                        value={ing.qty}
                        onChange={(e) => updateIngredientField(idx, "qty", Number(e.target.value))}
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 font-bold text-[11px] text-right"
                        required
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        placeholder="UOM"
                        value={ing.uom}
                        onChange={(e) => updateIngredientField(idx, "uom", e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-[11px] text-center"
                        required
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-center">
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ing.is_packaging}
                          onChange={(e) => updateIngredientField(idx, "is_packaging", e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        Pkg
                      </label>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(idx)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBomModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold shadow transition"
              >
                Save Recipe & BOM
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 4: INTELLIGENT ALERTS
      ======================================================== */}
      {tab === "alerts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-rose-600 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> Reorder Point (ROP) Alerts
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Festival Demand Mult:</span>
                <input
                  type="number"
                  step="0.1"
                  value={festivalMult}
                  onChange={(e) => setFestivalMult(Number(e.target.value))}
                  className="w-16 border rounded px-1.5 py-0.5 text-center font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              {alerts?.rop_alerts?.map((a: any, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-rose-800 dark:text-rose-300">{a.item_name}</div>
                    <div className="text-[11px] text-slate-500">
                      Current: {a.total_qty} {a.uom} • Dynamic ROP: {a.dynamic_rop} {a.uom}
                    </div>
                  </div>
                  <button
                    onClick={() => raiseAutoPr(a.sku, Math.round(a.dynamic_rop * 2))}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700"
                  >
                    Raise Auto-PR
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="font-bold text-amber-600 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Clock className="w-4 h-4" /> Perishable Expiry Alerts (&lt; 3 Days)
            </span>
            <div className="space-y-2">
              {alerts?.expiry_alerts?.map((e: any, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-amber-800 dark:text-amber-300">{e.item_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Batch {e.batch_no} • {e.qty_available} {e.uom}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-200 text-amber-900">
                    Expires {e.expiry_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: IST TRANSFER
      ======================================================== */}
      {tab === "transfer" && (
        <form
          onSubmit={runIst}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm max-w-xl space-y-3 text-xs"
        >
          <h3 className="text-sm font-bold text-[#081F5C] dark:text-sky-300">
            Inter-Store Stock Transfer (IST) + E-Way Bill
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">From Store</label>
              <select
                value={fromStore}
                onChange={(e) => setFromStore(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              >
                {stores.map((s) => (
                  <option key={s.store_code} value={s.store_code}>
                    {s.store_code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">To Store</label>
              <select
                value={toStore}
                onChange={(e) => setToStore(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              >
                {stores.map((s) => (
                  <option key={s.store_code} value={s.store_code}>
                    {s.store_code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">SKU</label>
              <select
                value={istSku}
                onChange={(e) => setIstSku(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              >
                <option value="FG-RAS-01">Spongy White Rasgulla</option>
                <option value="FG-KAJU-01">Royal Kaju Katli</option>
                <option value="RM-GHEE-01">A2 Bilona Desi Ghee</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Transfer Qty</label>
              <input
                type="number"
                value={istQty}
                onChange={(e) => setIstQty(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#081F5C] dark:bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
          >
            Dispatch IST & Generate E-Way Bill
          </button>
        </form>
      )}
    </div>
  );
};
