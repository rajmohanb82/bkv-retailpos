import React, { useEffect, useState } from "react";
import {
  Truck,
  Award,
  FileCheck2,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Inbox,
  FileText,
  Building,
  Upload,
  ShieldCheck,
  Printer,
  Eye,
  Warehouse,
  Check,
  Clock,
  Plus,
  Send,
  Building2,
  Layers,
  Scale,
  X,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { VendorDocument, VendorLetterheadPO, VendorPortalDashboard } from "../types";

export const VendorModule: React.FC = () => {
  const [tab, setTab] = useState<"portal" | "tenders" | "vendors" | "pos" | "prices">("portal");
  const [vendors, setVendors] = useState<any[]>([]);
  const [tenders, setTenders] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Vendor Portal State
  const [selectedPortalVendor, setSelectedPortalVendor] = useState("VND-001");
  const [portalData, setPortalData] = useState<VendorPortalDashboard | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Official Letterhead PO Modal
  const [letterheadPo, setLetterheadPo] = useState<VendorLetterheadPO | null>(null);
  const [loadingPoModal, setLoadingPoModal] = useState(false);

  // Document Upload Modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docVendorId, setDocVendorId] = useState<number>(1);
  const [docType, setDocType] = useState<string>("GST_CERTIFICATE");
  const [docName, setDocName] = useState("GST Registration Certificate");
  const [docNumber, setDocNumber] = useState("07AADCM1111D1Z9");
  const [docValidUntil, setDocValidUntil] = useState("2028-12-31");

  // Vendor Creation Modal
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [newVendorCode, setNewVendorCode] = useState("VND-007");
  const [newLegalName, setNewLegalName] = useState("");
  const [newTradeName, setNewTradeName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newMobile, setNewMobile] = useState("+91-");
  const [newEmail, setNewEmail] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newPan, setNewPan] = useState("");
  const [newFssai, setNewFssai] = useState("");
  const [newBankName, setNewBankName] = useState("HDFC Bank");
  const [newBankAccount, setNewBankAccount] = useState("");
  const [newIfsc, setNewIfsc] = useState("HDFC0001204");
  const [newIsMsme, setNewIsMsme] = useState(false);
  const [newMsmeRegNo, setNewMsmeRegNo] = useState("");
  const [newCity, setNewCity] = useState("Delhi");
  const [newState, setNewState] = useState("Delhi");

  // New PO form
  const [poVendor, setPoVendor] = useState("VND-001");
  const [poSku, setPoSku] = useState("RM-MILK-01");
  const [poQty, setPoQty] = useState(300);
  const [poRate, setPoRate] = useState(55);

  // Line-Wise PO Approval State
  const [approvalPo, setApprovalPo] = useState<any | null>(null);
  const [lineDecisions, setLineDecisions] = useState<any[]>([]);
  const [managerRemarks, setManagerRemarks] = useState<string>("Approved line items against contracted price master caps");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    try {
      const [v, t, p, pm, mp] = await Promise.all([
        apiFetch<any[]>("/api/vendor/vendors"),
        apiFetch<any[]>("/api/vendor/tenders"),
        apiFetch<any[]>("/api/vendor/purchase-orders"),
        apiFetch<any[]>("/api/vendor/price-masters"),
        apiFetch<any[]>("/api/vendor/mappings"),
      ]);
      setVendors(v);
      setTenders(t);
      setPos(p);
      setPrices(pm);
      setMappings(mp);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadPortalDashboard = async (code: string) => {
    setLoadingPortal(true);
    try {
      const data = await apiFetch<VendorPortalDashboard>(`/api/vendor/vendor-portal/dashboard/${code}`);
      setPortalData(data);
    } catch (e: any) {
      console.error(e);
      notify(false, "Failed to load vendor portal dashboard: " + e.message);
    } finally {
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedPortalVendor) {
      loadPortalDashboard(selectedPortalVendor);
    }
  }, [selectedPortalVendor]);

  const viewLetterheadPO = async (poId: number) => {
    setLoadingPoModal(true);
    try {
      const data = await apiFetch<VendorLetterheadPO>(`/api/vendor/purchase-orders/${poId}/letterhead`);
      setLetterheadPo(data);
    } catch (e: any) {
      notify(false, "Failed to load Purchase Order letterhead: " + e.message);
    } finally {
      setLoadingPoModal(false);
    }
  };

  const fetchNextVendorCode = async () => {
    try {
      const res = await apiFetch<any>("/api/admin/code-sequences/vendor/next", { method: "POST" });
      if (res && res.code) {
        setNewVendorCode(res.code);
        notify(true, `Next sequence code assigned: ${res.code}`);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLegalName || !newGstin) {
      notify(false, "Legal Name and GSTIN are required");
      return;
    }
    try {
      await apiFetch("/api/vendor/vendors", {
        method: "POST",
        body: JSON.stringify({
          vendor_code: newVendorCode,
          legal_name: newLegalName.trim(),
          trade_name: newTradeName.trim() || newLegalName.trim(),
          contact_person: newContactPerson.trim(),
          mobile: newMobile.trim(),
          email: newEmail.trim(),
          pan: newPan.trim() || newGstin.substring(2, 12),
          gstin: newGstin.trim().toUpperCase(),
          fssai_no: newFssai.trim(),
          bank_name: newBankName,
          bank_account: newBankAccount,
          ifsc: newIfsc,
          msme: newIsMsme,
          msme_reg_no: newMsmeRegNo,
          city: newCity,
          state: newState,
          regions: [newCity, newState],
          documents: [
            {
              id: "DOC-GST-01",
              doc_type: "GST_CERTIFICATE",
              doc_name: "GST Registration Certificate",
              doc_number: newGstin.trim().toUpperCase(),
              file_url: "/docs/gst_reg.pdf",
              verified: true,
              uploaded_at: new Date().toISOString(),
            },
            {
              id: "DOC-PAN-01",
              doc_type: "PAN_CARD",
              doc_name: "Permanent Account Number",
              doc_number: newPan.trim() || newGstin.substring(2, 12),
              file_url: "/docs/pan.pdf",
              verified: true,
              uploaded_at: new Date().toISOString(),
            },
          ],
        }),
      });
      notify(true, `Vendor Partner ${newVendorCode} registered successfully!`);
      setShowNewVendorModal(false);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/vendor/vendors/${docVendorId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          doc_type: docType,
          doc_name: docName,
          doc_number: docNumber,
          file_url: `/vault/vendor_${docVendorId}_${docType.toLowerCase()}.pdf`,
          valid_until: docValidUntil,
        }),
      });
      notify(true, `Compliance document '${docName}' uploaded & indexed successfully!`);
      setShowDocModal(false);
      load();
      if (portalData && portalData.vendor.id === docVendorId) {
        loadPortalDashboard(portalData.vendor.vendor_code);
      }
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const awardTender = async (tenderId: number, bidId: number) => {
    try {
      const res = await apiFetch<any>(`/api/vendor/tenders/${tenderId}/award/${bidId}`, {
        method: "POST",
      });
      notify(true, `Tender Awarded to ${res.awarded_vendor}! Price Master locked & PO ${res.po.po_no} issued.`);
      load();
      if (selectedPortalVendor) loadPortalDashboard(selectedPortalVendor);
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const createPo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>("/api/vendor/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          vendor_code: poVendor,
          outlet_code: "MFG01",
          store_code: "STR-MFG-COLD",
          items: [{ sku: poSku, name: poSku, qty: poQty, uom: "kg", rate: poRate, gst_pct: 5 }],
        }),
      });
      notify(true, `Purchase Order ${res.po_no} issued cleanly! Vendor notified.`);
      load();
      if (selectedPortalVendor === poVendor) loadPortalDashboard(poVendor);
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const grnAndMatch = async (po: any) => {
    try {
      const res = await apiFetch<any>(`/api/vendor/purchase-orders/${po.id}/grn-and-match`, {
        method: "POST",
        body: JSON.stringify({
          invoice_no: `VINV-${po.id + 500}`,
          invoice_amount: Number(po.total_amount),
        }),
      });
      notify(true, `GRN ${res.grn_no} posted to Stores + 3-Way Match: ${res.three_way_match_status}`);
      load();
      if (selectedPortalVendor) loadPortalDashboard(selectedPortalVendor);
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const openLineApprovalModal = (po: any) => {
    setApprovalPo(po);
    const items = po.items || [];
    setLineDecisions(
      items.map((it: any, idx: number) => ({
        item_id: idx + 1,
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        rate: it.rate,
        gst_pct: it.gst_pct,
        uom: it.uom,
        approved: it.approval_status !== "DECLINED",
        approved_qty: it.approved_qty || it.qty,
        remarks: it.approval_note || "Rate verified against Price Master cap",
      }))
    );
    setManagerRemarks("Line-wise items inspected and approved against master contract rate limits.");
  };

  const submitLineApproval = async (overallDecision: "APPROVED" | "DECLINED") => {
    if (!approvalPo) return;
    setSubmittingApproval(true);
    try {
      const res = await apiFetch<any>(`/api/vendor/purchase-orders/${approvalPo.id}/line-approval`, {
        method: "POST",
        body: JSON.stringify({
          manager_name: "Location / Corporate Manager",
          overall_decision: overallDecision,
          manager_remarks: managerRemarks,
          line_decisions: lineDecisions.map((ld) => ({
            item_id: ld.item_id,
            approved: ld.approved,
            approved_qty: Number(ld.approved_qty),
            remarks: ld.remarks,
          })),
        }),
      });
      notify(true, res.message || `PO ${approvalPo.po_no} decision saved: ${overallDecision}`);
      setApprovalPo(null);
      load();
      if (selectedPortalVendor) loadPortalDashboard(selectedPortalVendor);
    } catch (err: any) {
      notify(false, err.message || "Line approval submission failed");
    } finally {
      setSubmittingApproval(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-sm ${
            toast.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#081F5C] via-[#10307A] to-[#1E40AF] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/20 text-sky-300 text-xs font-bold border border-sky-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Procurement & Partner Governance
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Vendor Portal & Contract Tendering
            </h1>
            <p className="text-sm text-slate-200">
              Vendor Onboarding & Multi-Doc Verification • Active RFQ Tendering • Indian GST Compliant PO (Rule 46) • Multi-Location Inventory Visibility
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchNextVendorCode();
                setShowNewVendorModal(true);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              Register New Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm flex flex-wrap gap-2">
        {[
          { id: "portal", label: "Dedicated Vendor Partner Portal (Inbox & Stock)", icon: Inbox },
          { id: "tenders", label: `Active Tendering & RFQ (${tenders.length})`, icon: Award },
          { id: "vendors", label: `Vendor Directory & Multi-Docs (${vendors.length})`, icon: Truck },
          { id: "pos", label: `Purchase Orders & GST Invoices (${pos.length})`, icon: FileCheck2 },
          { id: "prices", label: `Price Master Contracts (${prices.length})`, icon: IndianRupee },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
                tab === t.id
                  ? "bg-[#081F5C] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DEDICATED VENDOR PARTNER PORTAL */}
      {tab === "portal" && (
        <div className="space-y-5">
          {/* Sample Vendor Credentials Quick-Switch Card (Requirement 4) */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border border-sky-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Sample Registered Vendor Credentials & Instant Demo Switcher
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                Click any credential card to simulate vendor login & portal view
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { code: "VND-001", name: "Kamadhenu Fresh Milk", contact: "Harish Choudhary", mobile: "+91-9810112233", category: "Raw Milk & Paneer", gstin: "07AADCK1122A1Z4" },
                { code: "VND-002", name: "Brijbhoomi Sugar", contact: "Alok Mittal", mobile: "+91-9810223344", category: "Refined Sugar", gstin: "09AABCB2233B1Z2" },
                { code: "VND-003", name: "Vedic Bilona Ghee", contact: "Sunita Rathore", mobile: "+91-9829334455", category: "Pure A2 Desi Ghee", gstin: "08AACCV3344C1Z9" },
                { code: "VND-004", name: "Kishangarh Cashews", contact: "Nitin Bhandari", mobile: "+91-9829445566", category: "Whole Cashew W240", gstin: "08AADCK4455D1Z7" },
                { code: "VND-005", name: "PackCraft Eco Cartons", contact: "Deepak Jain", mobile: "+91-9818556677", category: "1kg Heritage Boxes", gstin: "07AABCP5566E1Z5" },
              ].map((sv) => (
                <button
                  key={sv.code}
                  type="button"
                  onClick={() => {
                    setSelectedPortalVendor(sv.code);
                    loadPortalDashboard(sv.code);
                    notify(true, `Simulated Vendor Login: ${sv.name} (${sv.code})`);
                  }}
                  className={`p-3 rounded-2xl text-left border transition ${
                    selectedPortalVendor === sv.code
                      ? "bg-[#081F5C] text-white border-[#081F5C] shadow-md ring-2 ring-blue-400"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span>{sv.code}</span>
                    <span className={selectedPortalVendor === sv.code ? "text-sky-300" : "text-emerald-600 font-bold"}>
                      {selectedPortalVendor === sv.code ? "Active" : "Switch"}
                    </span>
                  </div>
                  <div className="font-extrabold text-xs mt-1 truncate">{sv.name}</div>
                  <div className={`text-[10px] mt-0.5 truncate ${selectedPortalVendor === sv.code ? "text-slate-200" : "text-slate-500"}`}>
                    {sv.contact} • {sv.mobile}
                  </div>
                  <div className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md inline-block ${
                    selectedPortalVendor === sv.code ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}>
                    {sv.category}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vendor Partner Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Logged-in Vendor Identity:
              </span>
              <select
                value={selectedPortalVendor}
                onChange={(e) => setSelectedPortalVendor(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#081F5C] dark:text-sky-400 focus:outline-none"
              >
                {vendors.map((v) => (
                  <option key={v.vendor_code} value={v.vendor_code}>
                    {v.trade_name} ({v.vendor_code}) — {v.city || "Delhi NCR"}
                  </option>
                ))}
              </select>
            </div>

            {portalData && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  GSTIN: {portalData.vendor.gstin}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                  FSSAI: {portalData.vendor.fssai_no}
                </span>
                {portalData.vendor.msme && (
                  <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                    MSME Registered
                  </span>
                )}
              </div>
            )}
          </div>

          {loadingPortal ? (
            <div className="p-12 text-center text-slate-500 font-bold text-sm">
              Loading Vendor Partner Portal...
            </div>
          ) : portalData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Vendor Inbox & Released POs */}
              <div className="lg:col-span-7 space-y-5">
                {/* INBOX */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-sky-600" />
                        Partner Inbox & Letterhead PO Notices
                      </h3>
                      <p className="text-xs text-slate-500">
                        Official purchase order releases, tender invitations & payment notices from Annavya
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs font-bold">
                      {portalData.inbox.length} Messages
                    </span>
                  </div>

                  <div className="space-y-3">
                    {portalData.inbox.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                msg.type === "PO_RELEASED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : msg.type === "TENDER_INVITE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {msg.type.replace("_", " ")}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {msg.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{msg.date}</span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {msg.message}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="font-mono text-[11px] text-slate-500 font-semibold">
                            Ref: {msg.reference_no}
                          </span>
                          {msg.action_required && msg.action_type === "VIEW_LETTERHEAD_PO" && msg.po_id && (
                            <button
                              onClick={() => viewLetterheadPO(msg.po_id!)}
                              className="px-3 py-1.5 rounded-xl bg-[#081F5C] hover:bg-[#10307A] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              View Official Customer Letterhead PO
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* APPROVED SUPPLY PRODUCTS & RATES */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                        Approved Product Supply & Contracted Rates
                      </h3>
                      <p className="text-xs text-slate-500">
                        Active procurement contract rates locked with Annavya Commercial Division
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <tr>
                          <th className="py-2 px-3">Item SKU</th>
                          <th className="py-2 px-3">Contract Rate</th>
                          <th className="py-2 px-3">Min Order Qty (MOQ)</th>
                          <th className="py-2 px-3">Validity</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {portalData.contract_rates.map((cr) => (
                          <tr key={cr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#081F5C] dark:text-sky-400">
                              {cr.rm_sku}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-600">
                              {formatINR(cr.rate_per_uom)} / unit
                            </td>
                            <td className="py-2.5 px-3 font-semibold">{cr.min_order_qty} units</td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {cr.valid_from} to {cr.valid_to}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                ACTIVE
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Multi-Location Inventory Visibility & Pending Bills */}
              <div className="lg:col-span-5 space-y-5">
                {/* MULTI-LOCATION INVENTORY TRACKER */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-indigo-600" />
                        Multi-Store & Factory Inventory Tracker
                      </h3>
                      <p className="text-xs text-slate-500">
                        Real-time raw material stock levels across factories & retail hubs to plan replenishment
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto">
                    {(portalData.inventory_levels || portalData.multi_location_inventory || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No inventory tracked for mapped items.</p>
                    ) : (
                      (portalData.inventory_levels || portalData.multi_location_inventory || []).map((inv: any, idx: number) => {
                        const stock = Number(inv.current_stock);
                        const isLow = stock < 100;
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {inv.item_name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${
                                  isLow
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}
                              >
                                {isLow ? "REPLENISH NEEDED" : "HEALTHY"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-500 text-[11px]">
                              <span>
                                Location: <b className="text-slate-700 dark:text-slate-300">{inv.outlet_name} ({inv.outlet_code})</b>
                              </span>
                              <span>Store: {inv.store_name}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-[11px] text-slate-400">Current Stock:</span>
                              <span className="font-mono text-sm font-extrabold text-[#081F5C] dark:text-sky-400">
                                {stock.toFixed(1)} {inv.inventory_uom}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* PENDING BILLS & INVOICES */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        Pending Bills & Invoices
                      </h3>
                      <p className="text-xs text-slate-500">
                        Status of 3-way match, GRN clearance, and accounts payable
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {portalData.pending_bills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No pending bills currently.</p>
                    ) : (
                      portalData.pending_bills.map((bill, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              PO: <span className="font-mono text-[#081F5C] dark:text-sky-400">{bill.po_no}</span>
                              {bill.invoice_no && <span className="ml-2 font-mono text-slate-500">Inv: {bill.invoice_no}</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Status: {bill.status} • 3-Way: <b>{bill.three_way_match_status || "PENDING"}</b>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold font-mono text-emerald-600 text-sm">
                              {formatINR(bill.total_amount)}
                            </div>
                            <span className="text-[10px] text-slate-400">Due in 7 days</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: ACTIVE TENDERS & RFQ COMPARATIVE */}
      {tab === "tenders" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                Active Procurement Tenders & Comparative Statements
              </h3>
              <p className="text-xs text-slate-500">
                Transparent bidding workflow: Float RFQ → Vendor Quotation → L1/L2 Landed Cost Analysis → Award & Release PO
              </p>
            </div>
          </div>

          {tenders.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="font-mono font-bold text-sky-600 text-sm">{t.tender_no}</span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{t.title}</h3>
                  <div className="text-xs text-slate-500">
                    Target SKU: <b className="text-slate-800 dark:text-slate-200">{t.rm_name}</b> • Required Qty:{" "}
                    <b>{t.required_qty} {t.uom}</b> • Delivery Schedule: {t.delivery_schedule}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    t.status === "AWARDED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {t.status} {t.awarded_vendor_code ? `→ ${t.awarded_vendor_code}` : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">L1/L2 Rank</th>
                      <th className="py-2.5 px-3">Bidding Vendor</th>
                      <th className="py-2.5 px-3">Basic Rate</th>
                      <th className="py-2.5 px-3">Freight</th>
                      <th className="py-2.5 px-3">Credit Term</th>
                      <th className="py-2.5 px-3">Quality Rating</th>
                      <th className="py-2.5 px-3 font-bold">Total Landed Cost</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {(t.bids || []).map((b: any) => (
                      <tr
                        key={b.id}
                        className={
                          b.is_winner
                            ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                        }
                      >
                        <td className="py-3 px-3 font-mono font-extrabold text-[#081F5C] dark:text-sky-400">
                          {b.rank}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {b.vendor_name}
                        </td>
                        <td className="py-3 px-3">{formatINR(b.unit_rate)}</td>
                        <td className="py-3 px-3">{formatINR(b.freight_cost)}</td>
                        <td className="py-3 px-3">{b.credit_days} days</td>
                        <td className="py-3 px-3 font-semibold text-amber-600">★ {b.quality_score}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {formatINR(b.landed_cost)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {t.status !== "AWARDED" ? (
                            <button
                              onClick={() => awardTender(t.id, b.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#081F5C] hover:bg-[#10307A] text-white font-bold text-xs shadow transition"
                            >
                              Award & Issue Auto-PO
                            </button>
                          ) : b.is_winner ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> AWARDED L1
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Tender Closed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: VENDORS & MULTI-DOCUMENT COMPLIANCE */}
      {tab === "vendors" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map((v) => {
              const docs: VendorDocument[] = v.documents || [];
              return (
                <div
                  key={v.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#081F5C] dark:text-sky-400">
                        {v.vendor_code}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                        {v.status}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {v.trade_name}
                    </h4>
                    <p className="text-[11px] text-slate-500">{v.legal_name}</p>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                      <div>
                        GSTIN: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{v.gstin}</span>
                      </div>
                      <div>
                        FSSAI: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{v.fssai_no}</span>
                      </div>
                      <div>
                        Bank: <span className="font-semibold">{v.bank_name || "HDFC Bank"} • A/C: {v.bank_account}</span>
                      </div>
                    </div>

                    {/* Multi-Document Checklist */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Statutory Documents ({docs.length}):
                        </span>
                        <button
                          onClick={() => {
                            setDocVendorId(v.id);
                            setShowDocModal(true);
                          }}
                          className="text-blue-600 hover:underline font-bold text-[11px]"
                        >
                          + Upload Doc
                        </button>
                      </div>

                      <div className="space-y-1">
                        {docs.map((d, dIdx) => (
                          <div
                            key={dIdx}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-[11px]"
                          >
                            <span className="font-medium truncate mr-2">{d.doc_name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Terms: {v.payment_terms || "Net 7 Days"}</span>
                    <button
                      onClick={() => {
                        setSelectedPortalVendor(v.vendor_code);
                        setTab("portal");
                      }}
                      className="text-xs font-bold text-[#081F5C] dark:text-sky-400 hover:underline"
                    >
                      Open Portal View →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PURCHASE ORDERS & 3-WAY MATCH */}
      {tab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Issue PO Form */}
          <form
            onSubmit={createPo}
            className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs"
          >
            <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
              Issue Official Purchase Order
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Vendor Partner
              </label>
              <select
                value={poVendor}
                onChange={(e) => setPoVendor(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {vendors.map((v) => (
                  <option key={v.vendor_code} value={v.vendor_code}>
                    {v.trade_name} ({v.vendor_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Raw Material SKU
              </label>
              <select
                value={poSku}
                onChange={(e) => setPoSku(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="RM-MILK-01">Fresh Cow Milk (Cap ₹56/L)</option>
                <option value="RM-SUG-01">Refined Sugar (Cap ₹44/kg)</option>
                <option value="RM-GHEE-01">A2 Bilona Ghee (Cap ₹620/kg)</option>
                <option value="RM-KAJU-01">Whole Cashew W240 Grade (Cap ₹780/kg)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  value={poQty}
                  onChange={(e) => setPoQty(Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold text-right"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Rate (₹)</label>
                <input
                  type="number"
                  value={poRate}
                  onChange={(e) => setPoRate(Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold text-right text-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-[#081F5C] hover:bg-[#10307A] text-white font-bold shadow transition"
            >
              Issue Purchase Order & Notify Vendor
            </button>
          </form>

          {/* PO Listing */}
          <div className="lg:col-span-8 space-y-3">
            {pos.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-wrap justify-between items-center gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sky-600 text-sm">{p.po_no}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[10px]">
                      {p.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                      3-Way: {p.three_way_match_status}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {p.vendor_name} → Delivery at Store {p.store_code}
                  </div>
                  <div className="text-slate-500">
                    Grand Total: <b className="text-emerald-600 font-mono text-sm">{formatINR(p.total_amount)}</b>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewLetterheadPO(p.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Letterhead PO
                  </button>

                  <button
                    onClick={() => openLineApprovalModal(p)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-300 dark:border-amber-800 transition"
                    title="Location / Corporate Manager line-item inspection, rate review & approval"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Line Approval
                  </button>

                  {(p.status === "APPROVED" || p.status === "ISSUED") && (
                    <button
                      onClick={() => grnAndMatch(p)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
                    >
                      Gate QC + GRN + 3-Way Match
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PRICE MASTERS */}
      {tab === "prices" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Contracted Vendor</th>
                <th className="py-2.5 px-3">Raw Material SKU</th>
                <th className="py-2.5 px-3">Contract Rate</th>
                <th className="py-2.5 px-3">Slab Rate (Min Qty)</th>
                <th className="py-2.5 px-3 text-center">GST %</th>
                <th className="py-2.5 px-3">Freight Terms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {prices.map((pm) => (
                <tr key={pm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {pm.vendor_name}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#081F5C] dark:text-sky-400">
                    {pm.rm_name} ({pm.rm_sku})
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">
                    {formatINR(pm.rate_per_uom)}
                  </td>
                  <td className="py-2.5 px-3">
                    {formatINR(pm.slab_rate)} (≥ {pm.slab_min_qty})
                  </td>
                  <td className="py-2.5 px-3 text-center">{pm.gst_pct}%</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {pm.freight_included ? "Freight Included" : "Extra as per bill"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: OFFICIAL INDIAN GST CUSTOMER LETTERHEAD PURCHASE ORDER */}
      {letterheadPo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-8 shadow-2xl max-h-[95vh] overflow-y-auto space-y-6 border border-slate-300 font-sans print:p-0 print:border-none print:shadow-none">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Statutory GST Purchase Order (Rule 46 CGST Act, 2017)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#081F5C] hover:bg-[#10307A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => setLetterheadPo(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* LETTERHEAD BANNER */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-[#081F5C]">
                  {letterheadPo.company.legal_name}
                </h2>
                <p className="text-xs font-bold text-slate-700">
                  {letterheadPo.company.trade_name}
                </p>
                <p className="text-[11px] text-slate-600 max-w-md">
                  Corporate Office: {letterheadPo.company.corporate_office}
                </p>
                <div className="flex flex-wrap gap-x-4 text-[11px] font-mono font-bold text-slate-700 pt-1">
                  <span>CIN: {letterheadPo.company.cin}</span>
                  <span>GSTIN: {letterheadPo.company.gstin}</span>
                  <span>PAN: {letterheadPo.company.pan}</span>
                  <span>FSSAI: {letterheadPo.company.fssai_no}</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-[#081F5C] text-white font-mono text-xs font-extrabold rounded-lg">
                  ORIGINAL FOR SUPPLIER
                </span>
                <p className="text-[11px] text-slate-600">Email: {letterheadPo.company.email}</p>
                <p className="text-[11px] text-slate-600">Phone: {letterheadPo.company.phone}</p>
              </div>
            </div>

            {/* DOCUMENT TITLE & PO DETAILS */}
            <div className="text-center py-1 bg-slate-100 rounded-xl border border-slate-300">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                {letterheadPo.doc_title}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Buyer / Delivery Info */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Purchase Order Details:</span>
                <div className="font-mono text-base font-extrabold text-[#081F5C]">
                  {letterheadPo.po.po_no}
                </div>
                <div>PO Date: <b>{letterheadPo.po.po_date}</b></div>
                <div>Delivery Due Date: <b>{letterheadPo.po.delivery_date}</b></div>
                <div>Payment Terms: <b>{letterheadPo.po.terms || "Net 7 Days post GRN"}</b></div>
                <div>Shipping Destination: <b>{letterheadPo.po.shipping_address || "Central Base Kitchen / Factory"}</b></div>
              </div>

              {/* Supplier Info */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Supplier / Vendor Details:</span>
                <div className="text-sm font-extrabold text-slate-900">
                  {letterheadPo.vendor.legal_name}
                </div>
                <div className="text-[11px] text-slate-600">{letterheadPo.vendor.address || "Industrial Area, New Delhi"}</div>
                <div className="font-mono font-bold text-slate-800">
                  GSTIN: {letterheadPo.vendor.gstin}
                </div>
                <div className="font-mono text-[11px]">
                  PAN: {letterheadPo.vendor.pan} • FSSAI: {letterheadPo.vendor.fssai_no || "10023011001234"}
                </div>
                {letterheadPo.vendor.msme && (
                  <div className="text-[11px] text-purple-700 font-bold">
                    MSME Reg: {letterheadPo.vendor.msme_reg_no || "UDYAM-DL-03-001289"}
                  </div>
                )}
              </div>
            </div>

            {/* LINE ITEMS TABLE */}
            <div className="border border-slate-300 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-center">UOM</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right font-bold">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {letterheadPo.items.map((it, idx) => (
                    <tr key={idx} className="font-medium">
                      <td className="py-2.5 px-3">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{it.item_name}</td>
                      <td className="py-2.5 px-3 font-mono">{it.hsn_code}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{it.uom}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatINR(it.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatINR(it.taxable_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatINR(it.cgst_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatINR(it.sgst_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(it.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TAX BREAKUP & AMOUNT IN WORDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-600 block">Total Amount in Words:</span>
                <p className="font-bold text-slate-900 italic capitalize">
                  {letterheadPo.tax_summary.amount_in_words}
                </p>
                <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                  <p>• Bank Branch: HDFC Bank, Connaught Place New Delhi</p>
                  <p>• RTGS / NEFT IFSC: HDFC0000003</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Taxable Value:</span>
                  <span className="font-bold">{formatINR(letterheadPo.tax_summary.taxable_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Central GST (CGST):</span>
                  <span>{formatINR(letterheadPo.tax_summary.cgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>State GST (SGST):</span>
                  <span>{formatINR(letterheadPo.tax_summary.sgst)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm text-slate-900">
                  <span>Grand Total (INR):</span>
                  <span className="text-emerald-700">{formatINR(letterheadPo.tax_summary.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* STATUTORY CLAUSES */}
            <div className="text-[10px] text-slate-500 space-y-1 border-t pt-3">
              <span className="font-bold text-slate-700 uppercase">Statutory Clauses & Terms:</span>
              {letterheadPo.statutory_clauses.map((clause, cIdx) => (
                <p key={cIdx}>• {clause}</p>
              ))}
            </div>

            {/* DIGITAL SIGNATURE STAMP */}
            <div className="flex items-center justify-between border-t pt-4 text-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400">Digital Authentication:</div>
                <div className="font-mono text-[9px] text-slate-500 truncate max-w-sm">
                  SHA256: {letterheadPo.digital_signature.signature_hash}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="font-bold text-slate-900">{letterheadPo.digital_signature.authorized_signatory}</div>
                <div className="text-[11px] text-slate-500">{letterheadPo.digital_signature.designation}</div>
                <div className="text-[10px] font-bold text-emerald-700">Digitally Signed & Certified</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPLIANCE DOCUMENT UPLOAD */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                Upload Statutory Compliance Document
              </h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => {
                    setDocType(e.target.value);
                    if (e.target.value === "FSSAI_LICENSE") setDocName("FSSAI Food Safety License");
                    if (e.target.value === "PAN_CARD") setDocName("PAN Card Copy");
                    if (e.target.value === "MSME_UDYAM") setDocName("Udyam MSME Registration");
                    if (e.target.value === "CANCELLED_CHEQUE") setDocName("Cancelled Bank Cheque");
                    if (e.target.value === "QUALITY_AUDIT") setDocName("Third-Party Food Quality Audit");
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  <option value="GST_CERTIFICATE">GST Registration Certificate</option>
                  <option value="FSSAI_LICENSE">FSSAI Food Safety License</option>
                  <option value="PAN_CARD">Permanent Account Number (PAN)</option>
                  <option value="MSME_UDYAM">MSME Udyam Registration Certificate</option>
                  <option value="CANCELLED_CHEQUE">Cancelled Cheque (Bank Validation)</option>
                  <option value="QUALITY_AUDIT">NABL Food Lab Quality Audit Report</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Label / Name
                </label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document Number / ID
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    value={docValidUntil}
                    onChange={(e) => setDocValidUntil(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow"
                >
                  Upload & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW VENDOR */}
      {showNewVendorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Register Vendor Partner & Multi-Doc Compliance
                </h3>
                <p className="text-xs text-slate-500">
                  Code: <b className="font-mono text-emerald-600">{newVendorCode}</b> (Auto-incremented master sequence)
                </p>
              </div>
              <button onClick={() => setShowNewVendorModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Parakh Agro Industries Ltd"
                    value={newLegalName}
                    onChange={(e) => setNewLegalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trade / Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Parakh Wheat & Flours"
                    value={newTradeName}
                    onChange={(e) => setNewTradeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN (15 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="07AAACP1234D1Z5"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PAN Card No
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AAACP1234D"
                    value={newPan}
                    onChange={(e) => setNewPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FSSAI License No
                  </label>
                  <input
                    type="text"
                    placeholder="10023011005678"
                    value={newFssai}
                    onChange={(e) => setNewFssai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Account No
                  </label>
                  <input
                    type="text"
                    placeholder="409100028999"
                    value={newBankAccount}
                    onChange={(e) => setNewBankAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="HDFC0001204"
                    value={newIfsc}
                    onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Rajesh Parakh"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile No
                  </label>
                  <input
                    type="text"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City / State
                  </label>
                  <input
                    type="text"
                    value={`${newCity}, ${newState}`}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsMsme}
                    onChange={(e) => setNewIsMsme(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    MSME Registered Enterprise (Priority Payment 45 Days Rule)
                  </span>
                </label>
                {newIsMsme && (
                  <input
                    type="text"
                    placeholder="MSME Udyam Reg No (e.g. UDYAM-DL-03-009988)"
                    value={newMsmeRegNo}
                    onChange={(e) => setNewMsmeRegNo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl font-mono uppercase"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewVendorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow"
                >
                  Register Vendor Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Line-Wise PO Approval Modal for Location & Corporate Managers (Requirement 5) */}
      {approvalPo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Line-Wise Purchase Order Approval — {approvalPo.po_no}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {approvalPo.vendor_name} ({approvalPo.vendor_code}) • Store: {approvalPo.store_code} • Current: {approvalPo.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovalPo(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Line Items Review Table */}
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Approve</th>
                    <th className="py-2.5 px-3">Item Description & SKU</th>
                    <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                    <th className="py-2.5 px-3 text-right">Approved Qty</th>
                    <th className="py-2.5 px-3 text-right">PO Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-center">GST</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {lineDecisions.map((ld, idx) => {
                    const approvedQty = ld.approved ? Number(ld.approved_qty || 0) : 0;
                    const taxable = approvedQty * Number(ld.rate);
                    const tax = (taxable * Number(ld.gst_pct || 5)) / 100;
                    const total = taxable + tax;

                    return (
                      <tr
                        key={idx}
                        className={ld.approved ? "hover:bg-slate-50/50 dark:hover:bg-slate-800/40" : "bg-rose-50/40 dark:bg-rose-950/20 opacity-60"}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={ld.approved}
                            onChange={(e) => {
                              const updated = [...lineDecisions];
                              updated[idx].approved = e.target.checked;
                              setLineDecisions(updated);
                            }}
                            className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{ld.name}</div>
                          <div className="font-mono text-slate-400 text-[10px]">{ld.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {ld.qty} {ld.uom}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={!ld.approved}
                            value={ld.approved_qty}
                            onChange={(e) => {
                              const updated = [...lineDecisions];
                              updated[idx].approved_qty = Number(e.target.value);
                              setLineDecisions(updated);
                            }}
                            className="w-20 border rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-right font-bold text-emerald-600 disabled:opacity-30"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatINR(ld.rate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatINR(taxable)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {ld.gst_pct}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600">
                          {formatINR(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Manager Remarks */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Location / Corporate Manager Approval Remarks & Audit Note
              </label>
              <textarea
                rows={2}
                value={managerRemarks}
                onChange={(e) => setManagerRemarks(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-xs"
                placeholder="Enter remarks e.g. Cashew rate approved against contract cap ₹780; Sugar approved for 80kg based on current warehouse stock..."
              />
            </div>

            {/* Summary & Decision Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  Approved Lines: <b className="text-emerald-600">{lineDecisions.filter((l) => l.approved).length}</b> / {lineDecisions.length}
                </div>
                <div>
                  Approved Value: <b className="font-mono text-emerald-600 font-bold">
                    {formatINR(
                      lineDecisions.reduce((acc, l) => {
                        if (!l.approved) return acc;
                        const sub = Number(l.approved_qty) * Number(l.rate);
                        return acc + sub + (sub * Number(l.gst_pct || 5)) / 100;
                      }, 0)
                    )}
                  </b>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalPo(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingApproval}
                  onClick={() => submitLineApproval("DECLINED")}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Decline Entire PO
                </button>
                <button
                  type="button"
                  disabled={submittingApproval || lineDecisions.filter((l) => l.approved).length === 0}
                  onClick={() => submitLineApproval("APPROVED")}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm Line-Wise Approval & Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
