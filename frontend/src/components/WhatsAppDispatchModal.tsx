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
} from "lucide-react";
import {
  cleanIndianMobile,
  formatWhatsAppProformaText,
  formatWhatsAppInvoiceText,
  openWhatsAppChat,
  generateUpiIntentUri,
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
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

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

  const handleSend = () => {
    const cleanMob = cleanIndianMobile(mobile);
    if (!cleanMob || cleanMob.length < 10) {
      alert("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    const ok = openWhatsAppChat(cleanMob, messageText);
    if (ok) {
      setSentSuccess(true);
      if (onSent) onSent(cleanMob);
      setTimeout(() => {
        onClose();
      }, 1800);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
                  WhatsApp
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isProforma
                  ? `Estimate #${orderData.docId} • Payable ${formatINR(orderData.grandTotal)}`
                  : `Tax Invoice ${orderData.docId} • Settled via ${orderData.paymentMode || "UPI"}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Screen Sync Status Banner */}
        {isProforma && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
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
        <div className="flex-1 overflow-hidden flex flex-col space-y-1.5 min-h-[160px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Message Preview
            </span>
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
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 rounded-2xl bg-[#EFEAE2] dark:bg-[#08151E] border border-[#DAD2C7] dark:border-[#1E2E38] font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
            {messageText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Official Bikanervala GST Receipt</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg hover:shadow-xl transition flex items-center gap-2"
            >
              {sentSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Opening WhatsApp...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isProforma ? "Send UPI Pay via WhatsApp" : "Send Invoice via WhatsApp"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
