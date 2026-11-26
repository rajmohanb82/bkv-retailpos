import React, { useEffect, useState } from "react";
import {
  Monitor,
  Sparkles,
  ShoppingBag,
  CreditCard,
  QrCode,
  CheckCircle2,
  Receipt,
  HeartHandshake,
  Clock,
  Store,
  UserCheck,
  Send,
  MessageSquare,
  Smartphone,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { formatINR } from "../api";
import { UpiQrCode } from "./UpiQrCode";

export interface DualScreenPayload {
  outletCode: string;
  outletName?: string;
  counterId?: string;
  counterName?: string;
  cashierId?: string;
  cashierName?: string;
  terminalIp?: string;
  items: Array<{
    sku: string;
    name: string;
    qty: number;
    uom: string;
    unit_price: number;
    gross_wt_g?: number;
    tare_wt_g?: number;
    net_wt_g?: number;
    line_total: number;
  }>;
  subtotal: number;
  discountAmount: number;
  discountCategory?: string;
  cgst: number;
  sgst: number;
  grandTotal: number;
  customerName?: string;
  customerMobile?: string;
  paymentMode?: "UPI" | "Cash" | "Credit Card" | "Food Coupon" | "Split" | null;
  paymentPending?: boolean;
  docId?: string; // Estimate or Invoice No
  isSettled?: boolean;
  settledAt?: string;
}

const SWEET_SHOWCASE = [
  {
    title: "Royal Silver-Leaf Kaju Katli",
    desc: "Crafted with pure Goan cashews, desi khand & certified 999 pure silver vark.",
    tag: "Bikanervala Heritage Special",
    image: "/bikanervala-customer-logo.png",
  },
  {
    title: "Spongy White Rasgulla",
    desc: "Delicate cottage cheese spheres soaked in pure aromatic saffron sugar syrup.",
    tag: "Freshly Made Every Morning",
    image: "/bikanervala-customer-logo.png",
  },
  {
    title: "Desi Ghee Besan Laddu",
    desc: "Slow roasted gram flour infused with green cardamom, pistachio & bikaneri dry fruits.",
    tag: "100% Pure Shuddh Desi Ghee",
    image: "/bikanervala-customer-logo.png",
  },
  {
    title: "Annavya Special Raj Kachori",
    desc: "Crispy jumbo kachori crowned with sprouted moong, spiced yoghurt & royal chutneys.",
    tag: "Famous Dilli Chaat Counter",
    image: "/bikanervala-customer-logo.png",
  },
];

export const RetailCustomerDisplay: React.FC = () => {
  const [data, setData] = useState<DualScreenPayload>({
    outletCode: "DEL01",
    outletName: "Bikanervala Karol Bagh Flagship",
    counterId: "CNT-DEL01-01",
    counterName: "Mithai Counter 1",
    cashierId: "CSH-DEL01-001",
    cashierName: "Priya Sharma",
    terminalIp: "127.0.0.1",
    items: [],
    subtotal: 0,
    discountAmount: 0,
    cgst: 0,
    sgst: 0,
    grandTotal: 0,
  });

  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString("en-IN"));
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Idle Carousel
  useEffect(() => {
    const carTimer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % SWEET_SHOWCASE.length);
    }, 5000);
    return () => clearInterval(carTimer);
  }, []);

  // Sync state via BroadcastChannel and localStorage
  useEffect(() => {
    // 1. Initial read from localStorage
    try {
      const stored = localStorage.getItem("annavya_pos_cfd_state");
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("CFD localStorage read error:", e);
    }

    // 2. BroadcastChannel for instant zero-latency cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("annavya_pos_cfd");
      channel.onmessage = (event) => {
        if (event.data) {
          setData(event.data);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported, falling back to storage listener");
    }

    // 3. Storage event listener (for cross-window on same origin)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "annavya_pos_cfd_state" && e.newValue) {
        try {
          setData(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const hasItems = data.items && data.items.length > 0;
  const currentPromo = SWEET_SHOWCASE[carouselIndex];

  return (
    <div className="min-h-screen bg-[#060D1E] text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="bg-[#09152D] border-b border-amber-500/20 px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src="/bikanervala-customer-logo.png"
            alt="Bikanervala"
            className="w-12 h-12 object-contain drop-shadow"
            onError={(e) => {
              e.currentTarget.src = "/bikanervala-customer-logo.svg";
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-amber-400 font-serif">
                BIKANERVALA
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                CUSTOMER DISPLAY
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{data.outletName || "Bikanervala Heritage Sweets"}</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-300/80 font-mono text-[11px]">
                {data.counterName || "Mithai Counter 1"} ({data.counterId || "CNT-01"})
              </span>
            </p>
          </div>
        </div>

        {/* Cashier & Time Info */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 bg-[#0C1A38] px-3.5 py-1.5 rounded-xl border border-slate-700/60">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Cashier</div>
              <div className="text-xs font-bold text-slate-200">
                {data.cashierName || "Priya Sharma"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0C1A38] px-3.5 py-1.5 rounded-xl border border-slate-700/60 font-mono">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Live Cart Items / Bill Details (7 Cols) */}
        <div className="col-span-7 p-6 border-r border-slate-800 flex flex-col bg-[#070F22]/70">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-extrabold text-white">Your Order Summary</h2>
              {hasItems && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/30">
                  {data.items.length} {data.items.length === 1 ? "Item" : "Items"}
                </span>
              )}
            </div>

            {data.docId && (
              <div className="font-mono text-xs text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                {data.isSettled ? "Invoice:" : "Estimate:"} <b>{data.docId}</b>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 custom-scroll">
            {!hasItems ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                  <Store className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Welcome to Bikanervala!</h3>
                  <p className="text-sm text-slate-400 max-w-sm mt-1">
                    Your freshly weighed sweets and snacks will appear here as they are entered at the counter.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300/80 bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/20">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Taste of Tradition • Fresh Thinking</span>
                </div>
              </div>
            ) : (
              data.items.map((it, idx) => (
                <div
                  key={idx}
                  className="bg-[#0D1C3D] hover:bg-[#12254F] border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition shadow-sm"
                >
                  <div className="space-y-0.5 max-w-[60%]">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-slate-400 text-xs font-mono">#{idx + 1}</span>
                      <span className="truncate">{it.name}</span>
                    </div>
                    {it.tare_wt_g && it.tare_wt_g > 0 ? (
                      <div className="text-[11px] text-amber-300/90 font-mono">
                        Gross: {it.gross_wt_g}g • Box Tare: {it.tare_wt_g}g • <b>Net: {it.net_wt_g}g</b>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Rate: {formatINR(it.unit_price)} / {it.uom}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-300 font-mono">
                      {Number(it.qty).toFixed(it.uom === "kg" ? 3 : 0)} {it.uom}
                    </div>
                    <div className="text-base font-extrabold text-amber-400 font-mono">
                      {formatINR(it.line_total)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Running Bill Totals Footer */}
          {hasItems && (
            <div className="bg-[#09152E] border border-slate-700/80 rounded-2xl p-4 mt-2 space-y-2 shadow-xl">
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatINR(data.subtotal)}</span>
                </div>
                {data.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Discount ({data.discountCategory || "Applied"})</span>
                    <span className="font-mono">- {formatINR(data.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>CGST (2.5%) + SGST (2.5%)</span>
                  <span className="font-mono">{formatINR(data.cgst + data.sgst)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-300 uppercase tracking-widest font-black">
                    TOTAL PAYABLE AMOUNT
                  </div>
                  <div className="text-xs text-slate-400">All Taxes Inclusive</div>
                </div>
                <div className="text-3xl font-black text-amber-400 font-mono tracking-tight drop-shadow-md">
                  {formatINR(data.grandTotal)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Payment QR / Specials Showcase / Thank You Screen (5 Cols) */}
        <div className="col-span-5 p-6 flex flex-col justify-between bg-gradient-to-b from-[#091630] to-[#050C1B]">
          {data.isSettled ? (
            /* 1. Thank You & Settlement Success View */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-2xl animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Payment Received!</h3>
                <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                  Tax Invoice <b>{data.docId}</b> has been generated & closed.
                </p>
              </div>

              <div className="bg-[#0C1A38] border border-emerald-500/30 rounded-2xl p-4 w-full max-w-sm space-y-2">
                <div className="text-[11px] text-slate-400">Total Amount Settled</div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {formatINR(data.grandTotal)}
                </div>
                <div className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-700/80 flex items-center justify-between">
                  <span>Mode: <b className="text-white">{data.paymentMode || "UPI"}</b></span>
                  <span>Counter: <b className="text-white">{data.counterName || "Mithai Counter 1"}</b></span>
                </div>
              </div>

              {/* Automated Actions Notification Badge */}
              <div className="w-full max-w-sm space-y-1.5">
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                  <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>40-Col Thermal Receipt Printed on Counter</span>
                </div>

                {data.customerMobile && (
                  <div className="bg-green-950/40 border border-green-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-green-300 font-semibold">
                    <MessageSquare className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="truncate">Invoice copy sent to WhatsApp ({data.customerMobile})</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <HeartHandshake className="w-4 h-4 text-rose-400" />
                <span>Thank you for choosing Bikanervala! Please collect your fresh pack.</span>
              </div>
            </div>
          ) : hasItems ? (
            /* 2. Active Payment QR & Live Scanner View */
            <div className="h-full flex flex-col justify-between space-y-3">
              <div className="bg-[#0C1A38] border border-amber-500/30 rounded-3xl p-5 text-center shadow-xl space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Scan & Pay via UPI
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE SCANNER
                  </span>
                </div>

                {/* Live Dynamic UPI QR with Scanner Beam Effect */}
                <div className="relative inline-block bg-white p-3.5 rounded-2xl shadow-2xl border-2 border-amber-400/60 overflow-hidden group">
                  <UpiQrCode
                    amount={data.grandTotal}
                    docId={data.docId || "POS-EST-LIVE"}
                    size={175}
                    className="!p-0 !bg-transparent !border-0 !shadow-none"
                  />
                  {/* Visual laser scan sweep animation */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 animate-pulse pointer-events-none" style={{ top: "45%" }} />
                </div>

                {/* WhatsApp Pay Link Active Banner if customer mobile is present */}
                {data.customerMobile ? (
                  <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-3 py-2 text-left flex items-start gap-2.5 text-xs text-emerald-200">
                    <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-emerald-300 text-[11px] flex items-center gap-1">
                        <span>📲 WhatsApp Pay Link Dispatched</span>
                      </div>
                      <div className="text-[10px] text-emerald-200/80 mt-0.5">
                        Proforma & UPI Tap-to-Pay link sent to <b>{data.customerMobile}</b>. You can pay directly from WhatsApp!
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    Scan with any UPI App or tap link on your phone
                  </div>
                )}

                {/* Accepted Payment Apps Pills */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">Google Pay</span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">PhonePe</span>
                  <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">Paytm</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">BHIM</span>
                  <span className="px-2 py-0.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30">WhatsApp Pay</span>
                </div>

                <div className="pt-2.5 border-t border-slate-700/80 flex items-center justify-between text-[11px] font-semibold px-1">
                  <span className="text-slate-400">Status:</span>
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Awaiting Payment ({data.paymentMode || "UPI"})</span>
                  </span>
                </div>
              </div>

              {/* Safety & Purity Guarantee Card */}
              <div className="bg-[#0B1730] border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                <img
                  src="/bikanervala-customer-logo.png"
                  alt="Seal"
                  className="w-9 h-9 object-contain drop-shadow"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-200">100% Desi Ghee & Freshness Guarantee</div>
                  <div className="text-[10px] text-slate-400">Traditional recipes crafted fresh daily with pure desi khand & khoya.</div>
                </div>
              </div>
            </div>
          ) : (
            /* 3. Idle Specials Carousel when Cart is Empty */
            <div className="h-full flex flex-col justify-between space-y-4">
              <div className="bg-[#0C1A38] border border-amber-500/30 rounded-3xl p-6 text-center shadow-xl space-y-4 flex-1 flex flex-col justify-center">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/30 mx-auto">
                  {currentPromo.tag}
                </span>

                <h3 className="text-2xl font-black text-amber-400 font-serif">
                  {currentPromo.title}
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed px-4">
                  {currentPromo.desc}
                </p>

                <div className="flex justify-center gap-1.5 pt-4">
                  {SWEET_SHOWCASE.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === carouselIndex ? "w-8 bg-amber-400" : "w-2 bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Bikanervala Heritage Tagline */}
              <div className="bg-[#0B1730] border border-slate-800 rounded-2xl p-4 text-center space-y-1">
                <div className="text-xs font-black text-amber-400 tracking-wider">
                  BIKANERVALA FOODS PRIVATE LIMITED
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  GSTIN: 07AAAFB0115B1ZJ • FSSAI Lic: 13324001000451
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Ticker Bar */}
      <footer className="bg-[#050B17] border-t border-slate-800/80 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-400">BIKANERVALA DUAL SCREEN</span>
          <span className="text-slate-600">|</span>
          <span>Please check your items and weights before payment settlement</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Terminal: {data.terminalIp || "127.0.0.1"}</span>
          <span>•</span>
          <span>Powered by Annavya Retail POS</span>
        </div>
      </footer>
    </div>
  );
};
