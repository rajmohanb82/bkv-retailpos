import React, { useEffect, useState } from "react";
import { AlertTriangle, BellRing, Clock, EyeOff, X } from "lucide-react";

export interface LowStockAlertItem {
  id: string | number;
  sku: string;
  item_name: string;
  qty: number;
  uom: string;
  expiry_date?: string;
  kind: "LOW_STOCK" | "NEAR_EXPIRY";
}

interface LowStockBannerProps {
  outletCode: string;
  alerts: LowStockAlertItem[];
  title?: string;
  onViewStock?: () => void;
}

const SNOOZE_MS = 15 * 60 * 1000; // 15 minutes

export const LowStockBanner: React.FC<LowStockBannerProps> = ({
  outletCode,
  alerts,
  title = "Top Low Stock & Expiry Notification",
  onViewStock,
}) => {
  const storageKey = `annavya_low_stock_hidden_until_${outletCode}`;

  const readHiddenUntil = (): number => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  };

  const [hiddenUntil, setHiddenUntil] = useState<number>(() => readHiddenUntil());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setHiddenUntil(readHiddenUntil());
  }, [outletCode]);

  useEffect(() => {
    if (!hiddenUntil || hiddenUntil <= Date.now()) return;
    const remaining = hiddenUntil - Date.now();
    const timer = window.setTimeout(() => {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore storage errors
      }
      setHiddenUntil(0);
      setNow(Date.now());
    }, remaining + 50);

    const tick = window.setInterval(() => {
      const cur = Date.now();
      setNow(cur);
      if (cur >= hiddenUntil) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        setHiddenUntil(0);
      }
    }, 10000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
    };
  }, [hiddenUntil, storageKey]);

  const hideFor15Min = () => {
    const until = Date.now() + SNOOZE_MS;
    try {
      localStorage.setItem(storageKey, String(until));
    } catch {
      // ignore
    }
    setHiddenUntil(until);
    setNow(Date.now());
  };

  const isSnoozed = hiddenUntil > now;
  if (alerts.length === 0 || isSnoozed) {
    return null;
  }

  const lowCount = alerts.filter((a) => a.kind === "LOW_STOCK").length;
  const expCount = alerts.filter((a) => a.kind === "NEAR_EXPIRY").length;

  return (
    <div
      role="alert"
      className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 dark:from-amber-950/50 dark:via-rose-950/40 dark:to-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-2xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
          <BellRing className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-amber-950 dark:text-amber-200">
            <span>
              {title} ({outletCode})
            </span>
            {lowCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">
                {lowCount} Low Stock
              </span>
            )}
            {expCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 text-[10px] font-bold">
                {expCount} Near Expiry
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
              <Clock className="w-3 h-3" />
              Reappears every 15 min if hidden
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {alerts.slice(0, 5).map((a) => (
              <span
                key={`${a.kind}-${a.id}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                  a.kind === "NEAR_EXPIRY"
                    ? "bg-rose-100/90 border-rose-200 text-rose-900"
                    : "bg-white/90 border-amber-200 text-amber-900"
                }`}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[180px]">{a.item_name}</span>
                <span className="font-mono font-bold">
                  ({Number(a.qty)} {a.uom}
                  {a.kind === "NEAR_EXPIRY" && a.expiry_date ? ` • Exp ${a.expiry_date}` : ""})
                </span>
              </span>
            ))}
            {alerts.length > 5 && (
              <span className="text-[11px] font-bold text-amber-800 px-1.5 py-0.5">
                +{alerts.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onViewStock && (
          <button
            onClick={onViewStock}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
          >
            View Stock
          </button>
        )}
        <button
          onClick={hideFor15Min}
          title="Hide notification for 15 minutes"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-amber-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-100 transition"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Hide 15m</span>
        </button>
        <button
          onClick={hideFor15Min}
          aria-label="Close low stock notification"
          title="Close (reappears in 15 minutes)"
          className="p-1.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-amber-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

