import React, { useState } from "react";
import {
  MessageSquare,
  X,
  Send,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Receipt,
  Monitor,
  Zap,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  cleanIndianMobile,
  formatWhatsAppProformaText,
  formatWhatsAppInvoiceText,
  openWhatsAppChat,
  generateUpiIntentUri,
  dispatchWhatsAppBackend,
  WhatsAppProformaParams,
  WhatsAppInvoiceParams,
} from "../utils/whatsappHelper";
import { formatINR } from "../api";

export interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "PROFORMA_UPI" | "TAX_INVOICE";
  orderData: {
    docId: string;
    customerName?: string;
    customerMobile?: string;
    items: Array<{
      name: string;
      qty: number;
      uom?: string;
      unit_price?: number;
      line_total: number;
    }>;
    subtotal: number;
    discountAmount?: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
    paymentMode?: string;
    paymentRef?: string;
    paidAt?: string;
    outletName?: string;
    counterName?: string;
    cashierName?: string;
  };
  onSent?: (mobile: string) => void;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  mode,
  orderData,
  onSent,
}) => {
  const [mobile, setMobile] = useState<string>(orderData.customerMobile || "");
  const [name, setName] = useState<string>(orderData.customerName || "Valued Guest");
  const [copied, setCopied] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [backendSuccess, setBackendSuccess] = useState<any>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isProforma = mode === "PROFORMA_UPI";

  const messageText = isProforma
    ? formatWhatsAppProformaText({
        estimateNo: orderData.docId,
        customerName: name,
        customerMobile: mobile,
        items: orderData.items,
        subtotal: orderData.subtotal,
        discountAmount: orderData.discountAmount,
        cgst: orderData.cgst,
        sgst: orderData.sgst,
        grandTotal: orderData.grandTotal,
        outletName: orderData.outletName,
        counterName: orderData.counterName,
        cashierName: orderData.cashierName,
      })
    : formatWhatsAppInvoiceText({
        invoiceNo: orderData.docId,
        customerName: name,
        customerMobile: mobile,
        items: orderData.items,
        subtotal: orderData.subtotal,
        discountAmount: orderData.discountAmount,
        cgst: orderData.cgst,
        sgst: orderData.sgst,
        grandTotal: orderData.grandTotal,
        paymentMode: orderData.paymentMode,
        paymentRef: orderData.paymentRef,
        paidAt: orderData.paidAt,
        outletName: orderData.outletName,
        counterName: orderData.counterName,
        cashierName: orderData.cashierName,
      });

  const handleBackendDispatch = async () => {
    const cleanMob = cleanIndianMobile(mobile);
    if (!cleanMob || cleanMob.length < 10) {
      alert("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    setIsSending(true);
    setSendError(null);
    try {
      const res = await dispatchWhatsAppBackend({
        docType: mode,
        docId: orderData.docId,
        customerMobile: cleanMob,
        customerName: name,
      });
      setBackendSuccess(res);
      if (onSent) onSent(cleanMob);
    } catch (err: any) {
      setSendError(err.message || "Failed to dispatch WhatsApp message from backend");
    } finally {
      setIsSending(false);
    }
  };

  const handleManualOpenWeb = () => {
    const cleanMob = cleanIndianMobile(mobile);
    if (!cleanMob || cleanMob.length < 10) {
      alert("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    openWhatsAppChat(cleanMob, messageText);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const digitalPdfUrl = `/api/pos/orders/${orderData.docId}/digital-invoice`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0C1324] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isProforma ? "Send UPI Pay & Proforma" : "Send Tax Invoice Copy"}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                  Direct API Dispatch
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isProforma
                  ? `Estimate #${orderData.docId} • Payable ${formatINR(orderData.grandTotal)}`
                  : `Invoice #${orderData.docId} • Total Paid ${formatINR(orderData.grandTotal)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Backend Success Banner */}
        {backendSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-extrabold text-sm">
                WhatsApp Message Seamlessly Dispatched!
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Transmitted directly via <strong>{backendSuccess.provider || "Meta Cloud API Gateway"}</strong> to customer mobile <strong>+{backendSuccess.recipient_mobile || mobile}</strong>.
              </p>
              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                Msg ID: {backendSuccess.message_id}
              </div>
              <div className="pt-1.5 flex items-center gap-2">
                <a
                  href={digitalPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 dark:text-emerald-200 underline hover:no-underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Official PDF Invoice</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {sendError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        {/* Proforma Dual Screen Info Banner */}
        {isProforma && (
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="text-[11px]">
              <span className="font-bold">Dual Screen Scanner Active: </span>
              <span>
                Live dynamic UPI QR is simultaneously displayed on customer dual screen for counter scanning.
              </span>
            </div>
          </div>
        )}

        {/* Customer Mobile & Name Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Customer Mobile No. *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono text-xs">
                +91
              </span>
              <input
                type="tel"
                value={mobile.replace(/^\+?91/, "")}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9811445566"
                maxLength={10}
                className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Live Message Preview Box */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-1.5 min-h-[150px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Direct Message Template Preview
            </span>
            <div className="flex items-center gap-3">
              <a
                href={digitalPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
              >
                <FileText className="w-3 h-3" />
                <span>Open Digital PDF</span>
              </a>
              <button
                onClick={handleCopy}
                className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 rounded-2xl bg-[#EFEAE2] dark:bg-[#08151E] border border-[#DAD2C7] dark:border-[#1E2E38] font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
            {messageText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Direct Backend API (No Web Redirect)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualOpenWeb}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Fallback: Open WhatsApp Web in browser tab"
            >
              WhatsApp Web
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleBackendDispatch}
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-lg hover:shadow-xl transition flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>{isProforma ? "⚡ Send UPI via Backend" : "⚡ Send Invoice via Backend"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
