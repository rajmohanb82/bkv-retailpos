import React, { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Save,
  Globe,
  UserCheck,
  Printer,
  Monitor,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../api";

export interface CashCounter {
  id?: number;
  counter_id: string;
  counter_name: string;
  outlet_code: string;
  ip_address: string;
  cashier_id: string;
  cashier_name: string;
  printer_type: string;
  printer_ip?: string;
  printer_name: string;
  paper_width_mm: number;
  is_dual_screen_enabled: boolean;
  status: string;
}

interface AdminCashCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOutlet: string;
  activeCounter?: CashCounter | null;
  onSelectCounter: (counter: CashCounter) => void;
}

export const AdminCashCounterModal: React.FC<AdminCashCounterModalProps> = ({
  isOpen,
  onClose,
  activeOutlet,
  activeCounter,
  onSelectCounter,
}) => {
  const [counters, setCounters] = useState<CashCounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CashCounter | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [detectingIp, setDetectingIp] = useState(false);
  const [generatingCid, setGeneratingCid] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCounters = async () => {
    setLoading(true);
    try {
      const list = await apiFetch<CashCounter[]>(`/api/pos/counters?outlet_code=${activeOutlet}`);
      setCounters(list || []);
    } catch (e: any) {
      notify(false, "Could not load counters: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCounters();
      setEditingCounter(null);
      setIsNew(false);
    }
  }, [isOpen, activeOutlet]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsNew(true);
    setEditingCounter({
      counter_id: `CNT-${activeOutlet}-0${counters.length + 1}`,
      counter_name: `Mithai Counter ${counters.length + 1}`,
      outlet_code: activeOutlet,
      ip_address: "127.0.0.1",
      cashier_id: `CSH-${activeOutlet}-00${counters.length + 1}`,
      cashier_name: "Priya Sharma",
      printer_type: "40_COL_THERMAL",
      printer_ip: "192.168.1.201",
      printer_name: "EPSON TM-T82II Thermal Receipt (40-Col)",
      paper_width_mm: 58,
      is_dual_screen_enabled: true,
      status: "ACTIVE",
    });
  };

  const handleDetectIp = async () => {
    setDetectingIp(true);
    try {
      const res = await apiFetch<{ client_ip: string }>("/api/pos/client-ip");
      if (res && res.client_ip && editingCounter) {
        setEditingCounter({ ...editingCounter, ip_address: res.client_ip });
        notify(true, `Local IP detected: ${res.client_ip}`);
      }
    } catch (e: any) {
      notify(false, "IP detection failed: " + e.message);
    } finally {
      setDetectingIp(false);
    }
  };

  const handleGenerateCashierId = async () => {
    setGeneratingCid(true);
    try {
      const res = await apiFetch<{ cashier_id: string }>(
        `/api/pos/counters/generate-cashier-id?outlet_code=${activeOutlet}`
      );
      if (res && res.cashier_id && editingCounter) {
        setEditingCounter({ ...editingCounter, cashier_id: res.cashier_id });
        notify(true, `New Cashier ID generated: ${res.cashier_id}`);
      }
    } catch (e: any) {
      notify(false, "ID generation failed: " + e.message);
    } finally {
      setGeneratingCid(false);
    }
  };

  const handleSaveCounter = async () => {
    if (!editingCounter) return;
    if (!editingCounter.counter_id.trim() || !editingCounter.counter_name.trim()) {
      notify(false, "Counter ID and Counter Name are required!");
      return;
    }

    try {
      await apiFetch("/api/pos/counters", {
        method: "POST",
        body: JSON.stringify(editingCounter),
      });
      notify(true, `Counter ${editingCounter.counter_id} saved successfully!`);
      setEditingCounter(null);
      setIsNew(false);
      await loadCounters();
    } catch (e: any) {
      notify(false, "Save failed: " + e.message);
    }
  };

  const handleDeleteCounter = async (cid: string) => {
    if (!confirm(`Are you sure you want to delete cash counter ${cid}?`)) return;
    try {
      await apiFetch(`/api/pos/counters/${cid}`, { method: "DELETE" });
      notify(true, `Counter ${cid} deleted.`);
      await loadCounters();
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#081F5C] via-[#0D2E82] to-[#1242BA] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">Cash Counter & Workstation Management</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-[#081F5C] font-black text-[10px] uppercase">
                  Admin Setup
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Define cash counters, detect terminal IPs, assign cashier IDs, and configure hardware bindings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 ${
              toast.ok
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-800 dark:text-slate-200">
          {editingCounter ? (
            /* Edit / Create Form */
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white flex items-center gap-2">
                  <span>{isNew ? "✨ Define New Cash Counter" : `Edit Counter: ${editingCounter.counter_id}`}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCounter(null);
                    setIsNew(false);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Counter ID / Code
                  </label>
                  <input
                    type="text"
                    value={editingCounter.counter_id}
                    onChange={(e) =>
                      setEditingCounter({ ...editingCounter, counter_id: e.target.value })
                    }
                    placeholder="e.g. CNT-DEL01-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Counter Display Name
                  </label>
                  <input
                    type="text"
                    value={editingCounter.counter_name}
                    onChange={(e) =>
                      setEditingCounter({ ...editingCounter, counter_name: e.target.value })
                    }
                    placeholder="e.g. Mithai Counter 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-bold"
                  />
                </div>

                {/* Local IP with Auto-Detect */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-slate-700 dark:text-slate-300">
                      Workstation IP Address
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectIp}
                      disabled={detectingIp}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{detectingIp ? "Detecting..." : "🔍 Auto-Detect Local IP"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingCounter.ip_address}
                    onChange={(e) =>
                      setEditingCounter({ ...editingCounter, ip_address: e.target.value })
                    }
                    placeholder="127.0.0.1 or 192.168.1.101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>

                {/* Cashier ID with Auto-Generate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-slate-700 dark:text-slate-300">
                      Unique Cashier ID
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateCashierId}
                      disabled={generatingCid}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generatingCid ? "Generating..." : "✨ Auto-Generate ID"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingCounter.cashier_id}
                    onChange={(e) =>
                      setEditingCounter({ ...editingCounter, cashier_id: e.target.value })
                    }
                    placeholder="e.g. CSH-DEL01-001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Cashier Staff Name
                  </label>
                  <input
                    type="text"
                    value={editingCounter.cashier_name}
                    onChange={(e) =>
                      setEditingCounter({ ...editingCounter, cashier_name: e.target.value })
                    }
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Thermal Slip Printer Name
                  </label>
                  <input
                    type="text"
                    value={editingCounter.printer_name}
                    onChange={(e) =>
                      setEditingCounter({ ...editingCounter, printer_name: e.target.value })
                    }
                    placeholder="e.g. EPSON TM-T82II Thermal Receipt"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C]"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCounter.is_dual_screen_enabled}
                    onChange={(e) =>
                      setEditingCounter({
                        ...editingCounter,
                        is_dual_screen_enabled: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Enable Dual Screen (Customer Display)</span>
                </label>

                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCounter.status === "ACTIVE"}
                    onChange={(e) =>
                      setEditingCounter({
                        ...editingCounter,
                        status: e.target.checked ? "ACTIVE" : "INACTIVE",
                      })
                    }
                    className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Counter is Active & Online</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCounter(null);
                    setIsNew(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCounter}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Cash Counter</span>
                </button>
              </div>
            </div>
          ) : (
            /* Counters Table List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                    Defined Cash Counters ({counters.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Select a counter to bind this terminal, or define new cash desks for this outlet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Cash Counter</span>
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-400">Loading counters...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {counters.map((cnt) => {
                    const isCurrent = activeCounter?.counter_id === cnt.counter_id;
                    return (
                      <div
                        key={cnt.counter_id}
                        className={`p-4 rounded-2xl border transition relative ${
                          isCurrent
                            ? "bg-blue-50/70 border-blue-500 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/30"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                                {cnt.counter_id}
                              </span>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {cnt.counter_name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>IP: <b className="font-mono text-slate-700 dark:text-slate-300">{cnt.ip_address}</b></span>
                              <span>•</span>
                              <span>Cashier: <b className="text-slate-700 dark:text-slate-300">{cnt.cashier_name}</b> ({cnt.cashier_id})</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Printer: {cnt.printer_name} ({cnt.paper_width_mm}mm) • Dual Screen: {cnt.is_dual_screen_enabled ? "Enabled" : "Disabled"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsNew(false);
                                setEditingCounter(cnt);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Counter"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCounter(cnt.counter_id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                              title="Delete Counter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {isCurrent ? (
                              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Active on this Terminal</span>
                              </span>
                            ) : (
                              "Available"
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectCounter(cnt);
                              notify(true, `This terminal is now operating as ${cnt.counter_name} (${cnt.counter_id})`);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                              isCurrent
                                ? "bg-blue-600 text-white shadow"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                          >
                            {isCurrent ? "Currently Selected" : "Use This Counter"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Current Active Terminal: <b>{activeCounter?.counter_name || "CNT-01 (Mithai Counter 1)"}</b>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#081F5C] hover:bg-[#1242BA] text-white font-extrabold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
