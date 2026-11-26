import React from "react";
import {
  X,
  Printer,
  Barcode,
  CheckCircle2,
  Package,
  Calendar,
  User,
  Phone,
  Building2,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Copy,
} from "lucide-react";
import { BarcodeSvg, generateBarcodeSvgHtml } from "./BarcodeSvg";
import { formatINR } from "../api";

export interface StoresSlipData {
  slip_type?: string;
  slip_title?: string;
  barcode: string;
  req_no: string;
  prod_no: string;
  order_type: string;
  store_code: string;
  factory_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_company?: string;
  destination?: string;
  requested_by?: string;
  accepted_by?: string;
  accepted_at?: string;
  checkout_by?: string;
  checkout_at?: string;
  fg_name?: string;
  planned_qty?: number;
  uom?: string;
  items: Array<{
    sku?: string;
    rm_sku?: string;
    name?: string;
    rm_name?: string;
    batch_no?: string;
    qty: number;
    uom: string;
    unit_cost?: number;
    amount?: number;
  }>;
  total_items?: number;
  total_value?: number;
}

interface StoresOutwardSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: StoresSlipData | null;
}

export const StoresOutwardSlipModal: React.FC<StoresOutwardSlipModalProps> = ({
  isOpen,
  onClose,
  slip,
}) => {
  if (!isOpen || !slip) return null;

  const barcode = slip.barcode || slip.req_no || "BC-STR-001";
  const totalVal =
    slip.total_value ??
    slip.items.reduce(
      (sum, it) => sum + (it.amount ?? it.qty * (it.unit_cost ?? 0)),
      0
    );

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const barcodeHtml = generateBarcodeSvgHtml(barcode, 46, true);
    const orderTypeLabel = slip.order_type.toUpperCase();

    const itemsHtml = slip.items
      .map(
        (it) => `
        <div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dotted #ccc;">
          <div style="font-weight: bold; font-size: 11px;">${it.name || it.rm_name || it.sku}</div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333;">
            <span>Batch: ${it.batch_no || "FEFO-AUTO"}</span>
            <span><b>${it.qty} ${it.uom}</b>${it.unit_cost ? ` @ ₹${it.unit_cost}` : ""}</span>
          </div>
        </div>
      `
      )
      .join("");

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stores Outward Slip - ${slip.req_no}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 58mm;
              margin: 0;
              padding: 4mm 3mm;
              color: #000;
              font-size: 10.5px;
              line-height: 1.25;
              background: #fff;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .double-divider { border-top: 1px double #000; margin: 5px 0; }
            .bold { font-weight: bold; }
            .badge {
              border: 1px solid #000;
              padding: 2px 4px;
              font-size: 9px;
              font-weight: bold;
              display: inline-block;
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 13px;">BIKANERVALA</div>
          <div class="center" style="font-size: 9px;">BIKANERVALA FOODS PVT. LTD.</div>
          <div class="center" style="font-size: 8.5px;">Central Stores & Multi-Store Inventory</div>
          <div class="center" style="font-size: 8.5px;">10181/82 Gurudwara Road, Bikanervala Chowk, Arya Samaj Rd, Karol Bagh, New Delhi, Delhi 110005</div>
          <div class="center" style="font-size: 8.5px;">GSTIN: 07AAAFB0115B1ZJ | FSSAI: 13324001000451</div>
          
          <div class="double-divider"></div>
          <div class="center bold" style="font-size: 11px;">STORES OUTWARD CHECKOUT SLIP</div>
          <div class="center"><span class="badge">${orderTypeLabel}</span></div>
          <div class="double-divider"></div>

          <div><b>Req / Order No:</b> ${slip.req_no}</div>
          ${slip.prod_no ? `<div><b>Ref / Indent:</b> ${slip.prod_no}</div>` : ""}
          <div><b>Dispatch Store:</b> ${slip.store_code}</div>
          <div><b>Outward Date:</b> ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>

          <div class="divider"></div>
          <div class="bold" style="font-size: 10px; text-decoration: underline;">ORDER & CUSTOMER DETAILS</div>
          <div><b>Party / Outlet:</b> ${slip.customer_name || "Internal Outlet"}</div>
          ${slip.customer_company ? `<div><b>Company:</b> ${slip.customer_company}</div>` : ""}
          ${slip.customer_mobile ? `<div><b>Contact:</b> ${slip.customer_mobile}</div>` : ""}
          ${slip.destination ? `<div><b>Destination:</b> ${slip.destination}</div>` : ""}
          <div><b>Requested By:</b> ${slip.requested_by || "Staff"}</div>
          ${slip.accepted_by ? `<div><b>Accepted By:</b> ${slip.accepted_by}</div>` : ""}
          <div><b>Checked Out By:</b> ${slip.checkout_by || "Central Storekeeper"}</div>

          <div class="divider"></div>
          <div class="bold" style="font-size: 10px;">DISPATCHED MATERIAL BATCHES (FEFO):</div>
          <div class="divider"></div>

          ${itemsHtml}

          <div class="double-divider"></div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
            <span>TOTAL ITEMS:</span>
            <span>${slip.items.length} SKUs</span>
          </div>
          ${
            totalVal > 0
              ? `<div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
                  <span>TOTAL VALUATION:</span>
                  <span>₹${totalVal.toFixed(2)}</span>
                </div>`
              : ""
          }
          <div class="double-divider"></div>

          <!-- SCANNABLE BARCODE -->
          <div class="center" style="margin: 8px 0 4px 0;">
            ${barcodeHtml}
          </div>
          <div class="center" style="font-size: 8px; letter-spacing: 0.5px;">
            Scan Barcode at Gate / Receiving Counter
          </div>

          <div class="divider"></div>
          <div style="font-size: 8.5px; margin-top: 6px;">
            <div>Storekeeper: _______________________</div>
            <div style="margin-top: 5px;">Received By:   _______________________</div>
          </div>
          <div class="center" style="font-size: 8px; margin-top: 8px; color: #444;">
            Goods Checked Outward & Quality Verified<br/>
            Annavya ERP Stores Management Module
          </div>
        </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1500);
      }, 300);
    }
  };

  const copyBarcode = () => {
    navigator.clipboard?.writeText(barcode);
    alert(`Copied barcode "${barcode}" to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg">
              🖨️
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                40-Column Stores Outward Slip
              </h3>
              <p className="text-amber-100 text-xs">
                Physical Dispatch Gate & FEFO Batch Handover
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Thermal Paper Simulation */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div className="w-[320px] bg-white text-slate-900 p-5 shadow-lg border border-slate-300 font-mono text-xs leading-relaxed select-text rounded-sm">
            {/* Header */}
            <div className="text-center font-bold text-sm tracking-wide">
              BIKANERVALA
            </div>
            <div className="text-center text-[10px] text-slate-600">
              BIKANERVALA FOODS PVT. LTD.
            </div>
            <div className="text-center text-[9px] text-slate-500">
              Central Stores & Multi-Store Inventory
            </div>
            <div className="text-center text-[8.5px] text-slate-500">
              GSTIN: 07AAAFB0115B1ZJ | FSSAI: 13324001000451
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            <div className="text-center font-bold text-[11px] text-slate-800 uppercase">
              STORES OUTWARD CHECKOUT SLIP
            </div>
            <div className="text-center my-1">
              <span className="inline-block px-2 py-0.5 border border-slate-800 text-[9px] font-bold uppercase rounded bg-slate-50">
                {slip.order_type}
              </span>
            </div>

            <div className="border-t border-double border-slate-800 my-2" />

            {/* Requisition Meta */}
            <div className="space-y-0.5 text-[10px]">
              <div>
                <span className="font-bold">Req No:</span> {slip.req_no}
              </div>
              {slip.prod_no && (
                <div>
                  <span className="font-bold">Ref / Indent:</span>{" "}
                  {slip.prod_no}
                </div>
              )}
              <div>
                <span className="font-bold">Source Store:</span>{" "}
                {slip.store_code}
              </div>
              <div>
                <span className="font-bold">Dispatch Time:</span>{" "}
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Customer / Order Details */}
            <div className="space-y-0.5 text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
              <div className="font-bold text-[10px] text-slate-800 uppercase underline mb-1">
                ORDER & CUSTOMER DETAILS
              </div>
              <div>
                <span className="font-bold">Party/Outlet:</span>{" "}
                {slip.customer_name || "Internal Department"}
              </div>
              {slip.customer_company && (
                <div>
                  <span className="font-bold">Company:</span>{" "}
                  {slip.customer_company}
                </div>
              )}
              {slip.customer_mobile && (
                <div>
                  <span className="font-bold">Contact:</span>{" "}
                  {slip.customer_mobile}
                </div>
              )}
              {slip.destination && (
                <div>
                  <span className="font-bold">Destination:</span>{" "}
                  {slip.destination}
                </div>
              )}
              <div>
                <span className="font-bold">Requested By:</span>{" "}
                {slip.requested_by || "Staff"}
              </div>
              {slip.accepted_by && (
                <div>
                  <span className="font-bold">Accepted By:</span>{" "}
                  {slip.accepted_by}
                </div>
              )}
              <div>
                <span className="font-bold">Checked Out By:</span>{" "}
                {slip.checkout_by || "Central Storekeeper"}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Dispatched Material Batches */}
            <div className="font-bold text-[10px] mb-1.5 uppercase text-slate-800">
              DISPATCHED BATCHES (FEFO):
            </div>
            <div className="space-y-1.5">
              {slip.items.map((it, idx) => (
                <div
                  key={idx}
                  className="pb-1 border-b border-dotted border-slate-300 text-[10px]"
                >
                  <div className="font-bold text-slate-900 leading-tight">
                    {it.name || it.rm_name || it.sku}
                  </div>
                  <div className="flex justify-between text-slate-600 text-[9.5px] mt-0.5">
                    <span>Lot: {it.batch_no || "FEFO-ALLOCATED"}</span>
                    <span className="font-bold text-slate-900">
                      {it.qty} {it.uom}
                      {it.unit_cost ? ` @ ₹${it.unit_cost}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-double border-slate-800 my-2" />

            {/* Totals */}
            <div className="flex justify-between font-bold text-[11px]">
              <span>TOTAL ITEMS:</span>
              <span>{slip.items.length} SKUs</span>
            </div>
            {totalVal > 0 && (
              <div className="flex justify-between font-bold text-[11px] text-amber-700">
                <span>TOTAL VALUATION:</span>
                <span>{formatINR(totalVal)}</span>
              </div>
            )}

            <div className="border-t border-double border-slate-800 my-3" />

            {/* Crisp Code-128 Scannable Barcode */}
            <div
              onClick={copyBarcode}
              title="Click to copy barcode"
              className="my-2 cursor-pointer hover:opacity-85 transition bg-white p-1 rounded border border-slate-200"
            >
              <BarcodeSvg value={barcode} height={46} showText={true} />
            </div>
            <div className="text-center text-[8.5px] text-slate-500">
              Present Barcode for Gate Pass & Inward Verification
            </div>

            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Signatures */}
            <div className="text-[9px] space-y-2 mt-2">
              <div>Storekeeper Sign: ___________________</div>
              <div>Recipient Sign:   ___________________</div>
            </div>

            <div className="text-center text-[8px] text-slate-400 mt-3">
              Goods Verified & Dispatched under FEFO Standards
              <br />
              Annavya ERP Stores Management Module
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={copyBarcode}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Barcode</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/30 transition transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print 40-Col Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
