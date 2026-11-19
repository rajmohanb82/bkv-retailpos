import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, Smartphone } from "lucide-react";
import { formatINR } from "../api";

interface UpiQrCodeProps {
  amount: number;
  docId: string;
  payeeVpa?: string;
  payeeName?: string;
  size?: number;
  className?: string;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  amount,
  docId,
  payeeVpa = "bikanervala.retail@icici",
  payeeName = "Bikanervala Foods Pvt Ltd",
  size = 140,
  className = "",
}) => {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const safeAmt = Number(amount || 0).toFixed(2);
  const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&am=${safeAmt}&cu=INR&tn=${encodeURIComponent(docId || "Table Bill")}`;

  useEffect(() => {
    QRCode.toDataURL(upiUri, {
      width: size,
      margin: 1,
      color: {
        dark: "#081F5C",
        light: "#FFFFFF",
      },
    })
      .then((url: string) => setDataUrl(url))
      .catch((err: any) => console.error("Error generating UPI QR Code", err));
  }, [upiUri, size]);

  const copyUpi = () => {
    navigator.clipboard?.writeText(payeeVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#081F5C] dark:text-sky-300 mb-2">
        <QrCode className="w-4 h-4 text-amber-500" />
        <span>Scan & Pay via UPI ({formatINR(amount)})</span>
      </div>

      {dataUrl ? (
        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 inline-block">
          <img
            src={dataUrl}
            alt="UPI QR Code"
            className="rounded"
            style={{ width: size, height: size }}
          />
        </div>
      ) : (
        <div
          className="bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center animate-pulse"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-slate-400">Loading QR...</span>
        </div>
      )}

      <div className="mt-2.5 space-y-1">
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
          Scan using PhonePe / GPay / Paytm / BHIM
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <span>UPI ID:</span>
          <b className="font-mono text-slate-700 dark:text-slate-200">{payeeVpa}</b>
          <button
            onClick={copyUpi}
            className="p-1 hover:text-slate-900 dark:hover:text-white"
            title="Copy UPI ID"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>
        <div className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
          Ask customer to share payment screenshot after transfer
        </div>
      </div>
    </div>
  );
};
