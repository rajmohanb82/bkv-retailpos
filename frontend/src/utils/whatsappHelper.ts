/**
 * WhatsApp & UPI Integration Helper for Annavya Bikanervala Retail ERP
 * Supports:
 * - Dynamic UPI Intent URIs (Google Pay, PhonePe, Paytm, BHIM, WhatsApp Pay)
 * - Beautifully formatted Proforma Bill / Estimate messages with direct tap-to-pay
 * - Official Tax Invoice messages with GSTIN, FSSAI, itemized breakdowns & digital links
 * - Cross-window launching via wa.me / WhatsApp Web
 */

export function cleanIndianMobile(raw: string | undefined | null): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `91${cleaned.slice(1)}`;
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned;
  }
  return cleaned;
}

export interface UpiIntentParams {
  vpa?: string;
  payeeName?: string;
  amount: number;
  docId: string;
  note?: string;
}

/**
 * Standard NPCI UPI URI Scheme
 * e.g. upi://pay?pa=bikanervala.retail@icici&pn=Bikanervala%20Foods&am=480.00&cu=INR&tn=EST-DEL01-0012
 */
export function generateUpiIntentUri({
  vpa = "bikanervala.retail@icici",
  payeeName = "Bikanervala Foods Pvt Ltd",
  amount,
  docId,
  note,
}: UpiIntentParams): string {
  const am = Math.max(0, Number(amount || 0)).toFixed(2);
  const tn = encodeURIComponent(note || `Bill ${docId}`);
  const pn = encodeURIComponent(payeeName);
  return `upi://pay?pa=${vpa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

export interface WhatsAppProformaParams {
  estimateNo: string;
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
  outletName?: string;
  counterName?: string;
  cashierName?: string;
  vpa?: string;
}

export function formatWhatsAppProformaText(p: WhatsAppProformaParams): string {
  const vpa = p.vpa || "bikanervala.retail@icici";
  const upiUri = generateUpiIntentUri({
    vpa,
    amount: p.grandTotal,
    docId: p.estimateNo,
    note: `Bikanervala ${p.estimateNo}`,
  });

  const itemsList = (p.items || [])
    .slice(0, 6)
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.name}*\n   ${it.qty} ${it.uom || "pcs"} × ₹${Number(it.unit_price || 0).toLocaleString("en-IN")} = *₹${Number(it.line_total || 0).toLocaleString("en-IN")}*`
    )
    .join("\n");

  const moreItemsCount = Math.max(0, (p.items || []).length - 6);
  const moreText = moreItemsCount > 0 ? `\n   _...and ${moreItemsCount} more item(s)_` : "";

  return (
`✨ *BIKANERVALA FOODS PRIVATE LIMITED* ✨
_Taste of Tradition • Fresh Thinking_
📍 ${p.outletName || "Connaught Place Flagship (New Delhi)"}
GSTIN: 07AAACB1234F1Z5 • FSSAI Lic: 13324001000451
---------------------------------------------
📋 *PROFORMA BILL / ESTIMATE: #${p.estimateNo}*
👤 *Guest:* ${p.customerName || "Valued Customer"}
🏢 *Counter:* ${p.counterName || "Mithai Counter 1"} | *Staff:* ${p.cashierName || "Priya Sharma"}
---------------------------------------------
*ORDER SUMMARY:*
${itemsList}${moreText}
---------------------------------------------
Subtotal: ₹${Number(p.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
${p.discountAmount && p.discountAmount > 0 ? `Discount: -₹${Number(p.discountAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` : ""}` +
`Taxes (CGST 2.5% + SGST 2.5%): ₹${Number(p.cgst + p.sgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
💰 *PAYABLE AMOUNT: ₹${Number(p.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}*
---------------------------------------------
📲 *TAP TO PAY VIA UPI / WHATSAPP PAY:*
👉 ${upiUri}

📄 *VIEW / DOWNLOAD PROFORMA (PDF):*
👉 https://bkv-retailpos.onrender.com/api/pos/orders/${p.estimateNo}/digital-invoice

_UPI ID:_ \`${vpa}\`
_Supported Apps:_ *Google Pay, PhonePe, Paytm, BHIM, Cred, WhatsApp Pay*

💡 *Counter Payment:* You can also scan the active QR scanner displayed on our Dual Screen at the counter.
Once paid, your official Tax Invoice and packaging will be handed to you immediately!

🙏 *Thank you for choosing Bikanervala!*`
  );
}

export interface WhatsAppInvoiceParams {
  invoiceNo: string;
  estimateNo?: string;
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
}

export function formatWhatsAppInvoiceText(p: WhatsAppInvoiceParams): string {
  const dateStr = p.paidAt
    ? new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = p.paidAt
    ? new Date(p.paidAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const itemsList = (p.items || [])
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.name}*\n   Qty: ${it.qty} ${it.uom || "pcs"} | Rate: ₹${Number(it.unit_price || 0).toLocaleString("en-IN")} | *₹${Number(it.line_total || 0).toLocaleString("en-IN")}*`
    )
    .join("\n");

  return (
`✨ *BIKANERVALA FOODS PRIVATE LIMITED* ✨
_Taste of Tradition • Fresh Thinking_
📍 ${p.outletName || "Connaught Place Flagship (New Delhi)"}
GSTIN: 07AAACB1234F1Z5 • FSSAI Lic: 13324001000451
---------------------------------------------
🧾 *OFFICIAL GST TAX INVOICE*
*Invoice No:* ${p.invoiceNo} ${p.estimateNo ? `(Ref: #${p.estimateNo})` : ""}
🗓️ *Date & Time:* ${dateStr} at ${timeStr}
👤 *Customer:* ${p.customerName || "Valued Customer"} (${p.customerMobile || "Counter Walk-in"})
🏢 *Counter:* ${p.counterName || "Mithai Counter 1"}
👨‍💼 *Cashier:* ${p.cashierName || "Priya Sharma"}
---------------------------------------------
*ITEMIZED BILL PARTICULARS:*
${itemsList}
---------------------------------------------
Subtotal: ₹${Number(p.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
${p.discountAmount && p.discountAmount > 0 ? `Discount Applied: -₹${Number(p.discountAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` : ""}` +
`CGST (2.5%): ₹${Number(p.cgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
SGST (2.5%): ₹${Number(p.sgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
💰 *TOTAL PAID: ₹${Number(p.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}*
---------------------------------------------
💳 *Payment Mode:* ${p.paymentMode || "UPI"}
🔖 *Payment Ref:* ${p.paymentRef || "VERIFIED & SETTLED"}
✅ *Status:* PAID & GOODS DELIVERED

📄 *VIEW / DOWNLOAD OFFICIAL TAX INVOICE (PDF):*
👉 https://bkv-retailpos.onrender.com/api/pos/orders/${p.invoiceNo}/digital-invoice

Thank you for visiting Bikanervala! We hope you enjoyed our authentic sweets and savouries.
_For party orders & corporate gifting: www.bikanervala.com_
_Software powered by Annavya ERP (www.annavya.in)_`
  );
}

/**
 * Seamless Backend WhatsApp Dispatch
 */
export interface BackendDispatchParams {
  docType: "PROFORMA_UPI" | "TAX_INVOICE";
  docId: string;
  customerMobile: string;
  customerName?: string;
}

export async function dispatchWhatsAppBackend(params: BackendDispatchParams): Promise<{
  success: boolean;
  message_id?: string;
  pdf_url?: string;
  status?: string;
  message?: string;
}> {
  const cleanMob = cleanIndianMobile(params.customerMobile);
  const res = await fetch("/api/pos/whatsapp/dispatch-backend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doc_type: params.docType,
      doc_id: params.docId,
      customer_mobile: cleanMob,
      customer_name: params.customerName || "Valued Customer",
      send_pdf: true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}: Failed to dispatch WhatsApp message`);
  }
  return await res.json();
}

/**
 * Open WhatsApp Web or Mobile Client
 */
export function openWhatsAppChat(mobile: string, text: string): boolean {
  const clean = cleanIndianMobile(mobile);
  if (!clean) return false;
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}
