import React from "react";
import { Printer, Copy, Check } from "lucide-react";
import { BarcodeSvg } from "./BarcodeSvg";
import { Outlet } from "../types";
import { print40ColumnThermalSlip } from "../utils/posHardware";

interface ThermalSlipProps {
  order: any;
  outlet?: Outlet;
}

export const ThermalSlip: React.FC<ThermalSlipProps> = ({ order, outlet }) => {
  const [copied, setCopied] = React.useState(false);

  if (!order) return null;

  const isPaid =
    order.status === "PAID_PENDING_DELIVERY" ||
    order.status === "DELIVERED_CLOSED";
  const barcode = isPaid ? order.invoice_no : order.estimate_no;

  const copyBarcode = () => {
    if (!barcode) return;
    navigator.clipboard?.writeText(barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-annavya-royal">
          40-Col Thermal Slip ({isPaid ? "Tax Invoice" : "Estimate Only"})
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={copyBarcode}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy ID"}
          </button>
          <button
            onClick={() => print40ColumnThermalSlip(order, outlet)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-annavya-navy text-white hover:bg-annavya-royal"
          >
            <Printer className="w-3.5 h-3.5" />
            Print 40-Col
          </button>
        </div>
      </div>

      {/* 40-column thermal receipt paper */}
      <div className="thermal-paper border border-dashed border-slate-300 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-900 max-w-[310px] mx-auto shadow-inner">
        <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
          <img
            src="/annavya-badge-light.png"
            alt="Annavya"
            className="w-10 h-10 mx-auto mb-1 object-contain grayscale contrast-125"
          />
          <div className="font-bold text-sm tracking-wide">
            {outlet?.trade_name || "ANNAVYA HERITAGE SWEETS"}
          </div>
          <div className="text-[10px] text-slate-600">
            {outlet?.legal_name || "Annavya Foods Retail Pvt Ltd"}
          </div>
          <div className="text-[10px] text-slate-600">
            {outlet?.address || "Connaught Place, New Delhi"}
          </div>
          {isPaid ? (
            <>
              <div className="text-[10px] mt-0.5">
                GSTIN: {outlet?.gstin || "07AAACA5678A1ZY"}
              </div>
              <div className="text-[10px]">
                FSSAI: {outlet?.fssai_no || "13324001000451"}
              </div>
              <div className="mt-1 font-bold bg-slate-900 text-white py-0.5 px-2 inline-block text-[10px]">
                TAX INVOICE
              </div>
            </>
          ) : (
            <div className="mt-1 font-bold border border-slate-800 py-0.5 px-2 inline-block text-[10px]">
              *** ESTIMATE ONLY - NOT A BILL ***
            </div>
          )}
        </div>

        <div className="flex justify-between text-[10px] mb-2">
          <span>{isPaid ? `Inv: ${order.invoice_no}` : `Est: ${order.estimate_no}`}</span>
          <span>Out: {order.outlet_code}</span>
        </div>

        <div className="border-y border-dashed border-slate-400 py-1.5 mb-2">
          <div className="flex justify-between font-bold text-[10px] border-b border-dotted border-slate-300 pb-1 mb-1">
            <span className="w-[46%]">ITEM</span>
            <span className="w-[24%] text-right">QTY/WT</span>
            <span className="w-[30%] text-right">AMT</span>
          </div>
          {(order.items || []).map((it: any, idx: number) => (
            <div key={idx} className="mb-1">
              <div className="flex justify-between">
                <span className="w-[46%] truncate">{it.name}</span>
                <span className="w-[24%] text-right">
                  {Number(it.qty).toFixed(it.uom === "kg" ? 2 : 0)}
                  {it.uom}
                </span>
                <span className="w-[30%] text-right">
                  {Number(it.line_total || it.qty * it.unit_price).toFixed(2)}
                </span>
              </div>
              {it.tare_wt_g > 0 && (
                <div className="text-[9px] text-slate-500">
                  Gross {it.gross_wt_g}g - Tare {it.tare_wt_g}g = Net {it.net_wt_g}g
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Disc ({order.discount_category})</span>
              <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>CGST + SGST</span>
            <span>₹{(Number(order.cgst) + Number(order.sgst)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs border-t border-dashed border-slate-400 pt-1 mt-1">
            <span>GRAND TOTAL</span>
            <span>₹{Number(order.grand_total).toFixed(2)}</span>
          </div>
        </div>

        {isPaid && Array.isArray(order.payment_splits) && order.payment_splits.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-dashed border-slate-400 text-[10px] space-y-0.5">
            <div className="font-bold text-slate-700">TENDER SPLITS:</div>
            {order.payment_splits.map((sp: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span>{sp.mode}</span>
                <span>₹{Number(sp.amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {isPaid && (
          <div className="mt-2 pt-1.5 border-t border-dashed border-slate-400 text-center">
            <div className="font-bold text-[10px]">
              {order.status === "PAID_PENDING_DELIVERY"
                ? "PAID - COLLECT AT DELIVERY COUNTER"
                : "PAID & DELIVERED - CLOSED"}
            </div>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-dashed border-slate-400">
          <BarcodeSvg value={barcode} height={38} />
        </div>
        <div className="text-center text-[9px] text-slate-500 mt-1">
          {isPaid
            ? "Scan at Delivery Counter for Handover"
            : "Valid Today Only • Present at Cash Counter"}
        </div>
      </div>
    </div>
  );
};

