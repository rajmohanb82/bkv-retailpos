import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Utensils,
  ShoppingBag,
  Sparkles,
  CreditCard,
  QrCode,
  Receipt,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
  X,
  Volume2,
  Printer,
  RotateCcw,
  Flame,
  Leaf,
  Heart,
  Share2,
  Info,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Check,
  Edit3,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, Outlet } from "../types";
import { BarcodeSvg } from "../components/BarcodeSvg";
import { print40ColumnThermalSlip } from "../utils/posHardware";
import { getActualDishImage, BIKANERVALA_LOGO_FALLBACK } from "../utils/dishImageResolver";
import { ItemImageUploadModal } from "../components/ItemImageUploadModal";

interface PortraitKioskExpressProps {
  isStandalone?: boolean;
  activeOutlet?: string;
  onClose?: () => void;
}

interface CartItem {
  sku: string;
  name: string;
  qty: number;
  unit_price: number;
  station: string;
  modifiers: string[];
  notes?: string;
  image_url?: string;
}

type KioskStep = "ATTRACT" | "ORDER_TYPE" | "MENU" | "CUSTOMIZE_ITEM" | "CART_DRAWER" | "PAYMENT" | "CONFIRMATION";

export const PortraitKioskExpress: React.FC<PortraitKioskExpressProps> = ({
  isStandalone = false,
  activeOutlet = "DEL01",
  onClose,
}) => {
  const [step, setStep] = useState<KioskStep>("MENU");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [tableNumber, setTableNumber] = useState("T-04");
  const [buzzerNumber, setBuzzerNumber] = useState("B-12");

  const [menuItems, setMenuItems] = useState<ItemSku[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [dietaryFilter, setDietaryFilter] = useState<"ALL" | "BESTSELLER" | "GHEE" | "CHEF">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeItemForDetail, setActiveItemForDetail] = useState<ItemSku | null>(null);
  const [editingItemForImage, setEditingItemForImage] = useState<ItemSku | null>(null);

  // Customization selection state
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(["Pure Desi Ghee"]);
  const [customNotes, setCustomNotes] = useState("");

  // Payment states
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CARD_EDC" | "COUNTER_CASH">("UPI");
  const [upiTimer, setUpiTimer] = useState(180);
  const [confirmedOrderResult, setConfirmedOrderResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Kiosk hardware & display config from backend
  const [hardwareConfig, setHardwareConfig] = useState<any>({
    kiosk_id: "KIOSK-EXPRESS-01",
    printer_ip: "192.168.1.198",
    edc_tid: "TID-BIK-9901",
    screensaver_timeout_sec: 45,
  });

  const [outletInfo, setOutletInfo] = useState<Outlet | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [idleCounter, setIdleCounter] = useState(0);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Play subtle kiosk touch sound
  const playClickSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Load menu & hardware config
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [items, outlets] = await Promise.all([
          apiFetch<ItemSku[]>("/api/admin/items"),
          apiFetch<Outlet[]>("/api/admin/outlets").catch(() => []),
        ]);
        // Focus on Restaurant Prepared Foods & Fresh Sweets
        const available = items.filter(
          (i) => (i.category === "FG-Rest" || i.category === "FG-Sweet") && i.active !== false
        );
        setMenuItems(available);
        if (outlets.length > 0) {
          const current = outlets.find((o) => o.code === activeOutlet) || outlets[0];
          setOutletInfo(current);
        }
      } catch (e: any) {
        notify(false, "Failed to load live kiosk menu: " + e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeOutlet]);

  // UPI countdown timer
  useEffect(() => {
    if (step === "PAYMENT" && paymentMode === "UPI" && upiTimer > 0) {
      const timer = setInterval(() => setUpiTimer((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, paymentMode, upiTimer]);

  // Screensaver idle detector
  useEffect(() => {
    const interval = setInterval(() => {
      setIdleCounter((c) => {
        if (c + 1 >= (hardwareConfig.screensaver_timeout_sec || 45) && step !== "CONFIRMATION") {
          setStep("ATTRACT");
          return 0;
        }
        return c + 1;
      });
    }, 1000);

    const resetIdle = () => setIdleCounter(0);
    window.addEventListener("pointerdown", resetIdle);
    window.addEventListener("keydown", resetIdle);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", resetIdle);
      window.removeEventListener("keydown", resetIdle);
    };
  }, [step, hardwareConfig]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => {
      if (m.sub_category) set.add(m.sub_category);
    });
    return ["ALL", "Chaat", "North Indian", "South Indian", "Traditional Sweets", ...Array.from(set).filter((c) => !["Chaat", "North Indian", "South Indian"].includes(c))];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let list = menuItems;
    if (selectedCategory !== "ALL") {
      if (selectedCategory === "Traditional Sweets") {
        list = list.filter((i) => i.category === "FG-Sweet");
      } else {
        list = list.filter((i) => i.sub_category?.toLowerCase() === selectedCategory.toLowerCase());
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return list;
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: ItemSku, modifiers: string[] = ["Standard"], notes = "") => {
    playClickSound();
    const resolved = getActualDishImage(item);
    setCart((prev) => {
      const existing = prev.find((c) => c.sku === item.sku && c.modifiers.join() === modifiers.join());
      if (existing) {
        return prev.map((c) =>
          c.sku === item.sku && c.modifiers.join() === modifiers.join() ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          sku: item.sku,
          name: item.name,
          qty: 1,
          unit_price: Number(item.selling_price) || 120,
          station: item.kitchen_station || "Main Kitchen",
          modifiers,
          notes,
          image_url: resolved.url,
        },
      ];
    });
  };

  const updateCartQty = (sku: string, delta: number) => {
    playClickSound();
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.sku !== sku) return c;
          const next = c.qty + delta;
          return next > 0 ? { ...c, qty: next } : null;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const cartGst = Number((cartSubtotal * 0.05).toFixed(2));
  const cartGrandTotal = cartSubtotal + cartGst;
  const totalItemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handlePlaceOrder = async (mode: "UPI" | "CARD_EDC" | "COUNTER_CASH") => {
    if (cart.length === 0) {
      notify(false, "Tray is empty. Please select food items.");
      return;
    }
    setLoading(true);
    playClickSound();
    try {
      const payload = {
        outlet_code: activeOutlet || "DEL01",
        order_type: orderType,
        table_code: orderType === "DINE_IN" ? tableNumber : `PARCEL-${buzzerNumber}`,
        customer_name: "Kiosk Guest",
        customer_phone: "+91-9811000000",
        payment_choice: mode === "COUNTER_CASH" ? "PAY_AT_COUNTER" : "PAY_NOW_ONLINE",
        payment_mode: mode === "UPI" ? "UPI" : mode === "CARD_EDC" ? "Card" : "Cash",
        payment_ref: `KIOSK-${mode}-${Date.now().toString().slice(-4)}`,
        items: cart.map((c) => ({
          sku: c.sku,
          name: c.name,
          qty: c.qty,
          unit_price: c.unit_price,
          station: c.station,
          modifiers: c.modifiers.join(", "),
        })),
      };

      const res = await apiFetch<any>("/api/kot/kiosk/order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setConfirmedOrderResult(res);
      setStep("CONFIRMATION");
      setCart([]);

      // Trigger automatic 40-column thermal slip printer
      if (res.order) {
        print40ColumnThermalSlip(res.order, outletInfo, "Kiosk Express 40-Col Thermal Printer");
      }
    } catch (e: any) {
      notify(false, e.message || "Failed to process Kiosk order");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("ORDER_TYPE");
    setCart([]);
    setConfirmedOrderResult(null);
    setSearchQuery("");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`flex flex-col bg-[#FAF8F5] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 select-none overflow-x-hidden ${isStandalone ? "min-h-screen w-full" : "min-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl my-2"}`}>
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-bounce text-sm font-bold">
          {toast.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ATTRACT / SCREENSAVER MODE */}
      {step === "ATTRACT" && (
        <div
          onClick={() => {
            playClickSound();
            setStep("ORDER_TYPE");
          }}
          className="relative min-h-screen flex flex-col items-center justify-between p-8 bg-cover bg-center cursor-pointer overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(8, 31, 92, 0.85), rgba(7, 11, 20, 0.95)), url('https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1600&auto=format&fit=crop&q=80')`,
          }}
        >
          {/* Top Brand Logo */}
          <div className="pt-8 text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-4 p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
              <img src="/bikanervala-customer-logo.png" alt="Bikanervala" className="h-16 w-auto object-contain drop-shadow" onError={(e) => { e.currentTarget.src = "/annavya-badge-light.png"; }} />
              <div className="h-12 w-px bg-white/30" />
              <img src="/annavya-logo-dark.png" alt="Annavya" className="h-14 w-auto object-contain drop-shadow" />
            </div>
            <p className="text-amber-300 font-extrabold tracking-widest text-sm uppercase">Taste of Tradition & Trust Since 1905</p>
          </div>

          {/* Center Call to Action */}
          <div className="text-center space-y-6 my-auto">
            <div className="space-y-2">
              <span className="px-4 py-1.5 rounded-full bg-amber-400 text-[#081F5C] font-black text-xs uppercase tracking-widest shadow-lg">
                Self-Service Touch Kiosk
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Fresh Sweets, Chaat <br />
                <span className="text-amber-400">& Royal Dining</span>
              </h1>
              <p className="text-slate-300 text-base max-w-md mx-auto">
                Skip the line. Order your favorites fresh from our kitchen in seconds.
              </p>
            </div>

            {/* Glowing Pulse Button */}
            <div className="pt-6">
              <button
                type="button"
                className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-3xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#081F5C] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-amber-300/40 animate-pulse"
              >
                <Sparkles className="w-6 h-6 text-[#081F5C]" />
                <span>Touch Screen to Order</span>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="pb-4 text-center text-xs text-slate-400 flex items-center justify-between w-full max-w-3xl">
            <span>Terminal: <b>{hardwareConfig.kiosk_id}</b></span>
            <span>Pure Desi Ghee • 100% Vegetarian</span>
            <span>English / हिंदी</span>
          </div>
        </div>
      )}

      {/* HEADER BAR (Airy, Spacious & Beautiful) */}
      {step !== "ATTRACT" && (
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0C1222]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-4 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Logos & Brand */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => setStep("ATTRACT")}
                className="cursor-pointer flex items-center gap-3 group"
              >
                <img
                  src="/bikanervala-customer-logo.png"
                  alt="Bikanervala"
                  className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = "/annavya-badge-light.png"; }}
                />
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="font-black text-base text-[#081F5C] dark:text-amber-400 tracking-tight hidden sm:inline">
                  Express Kiosk
                </span>
              </div>
            </div>

            {/* Dining Mode Toggle (Dine In vs Takeaway) */}
            <div className="flex items-center gap-2 bg-[#F2EFE9] dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => { playClickSound(); setOrderType("DINE_IN"); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  orderType === "DINE_IN"
                    ? "bg-[#081F5C] text-white shadow-md scale-102"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Dine In ({tableNumber})</span>
              </button>
              <button
                type="button"
                onClick={() => { playClickSound(); setOrderType("TAKEAWAY"); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  orderType === "TAKEAWAY"
                    ? "bg-amber-500 text-white shadow-md scale-102"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Takeaway (Buzzer)</span>
              </button>
            </div>

            {/* Utility Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                title="Toggle Fullscreen Portrait Mode"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                  title="Close Kiosk"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* STEP: ORDER_TYPE SELECTION (If arriving fresh) */}
      {step === "ORDER_TYPE" && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
              Step 1 of 3 • Dining Preference
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#081F5C] dark:text-white">
              Where would you like to eat today?
            </h2>
            <p className="text-slate-500 text-sm">
              Prepared fresh to order in authentic Pure Desi Ghee
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Dine-In Option Card */}
            <div
              onClick={() => {
                playClickSound();
                setOrderType("DINE_IN");
                setStep("MENU");
              }}
              className="p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#081F5C] dark:hover:border-amber-400 cursor-pointer shadow-xl hover:scale-102 transition-all duration-300 text-center space-y-4 group"
            >
              <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/60 mx-auto flex items-center justify-center text-[#081F5C] dark:text-sky-300 group-hover:scale-110 transition-transform">
                <Utensils className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Eat In</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enjoy seated dining at our royal food court tables
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#081F5C] text-white text-xs font-bold shadow group-hover:bg-[#1246A8]">
                  <span>Select Dine In</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Takeaway Option Card */}
            <div
              onClick={() => {
                playClickSound();
                setOrderType("TAKEAWAY");
                setStep("MENU");
              }}
              className="p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 cursor-pointer shadow-xl hover:scale-102 transition-all duration-300 text-center space-y-4 group"
            >
              <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Take Away</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Carefully packed in tamper-proof heritage packaging
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow group-hover:bg-amber-600">
                  <span>Select Take Away</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP: MAIN MENU BROWSER (Airy, Spacious with Large Images) */}
      {step === "MENU" && (
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4 sm:p-6 pb-36 space-y-6">
          {/* Search & Dietary Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Raj Kachori, Dosa, Kaju Katli..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Pure Veg Assurance & Dietary Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-300" />
                100% Pure Veg
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                A2 Desi Ghee
              </span>
              <button
                type="button"
                onClick={() => {
                  const target = filteredItems[0] || menuItems[0];
                  if (target) setEditingItemForImage(target);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-900 dark:text-amber-200 text-xs font-extrabold border border-amber-300 dark:border-amber-700 hover:bg-amber-400 hover:text-[#081F5C] transition shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                <span>Search & Edit Item Photo</span>
              </button>
            </div>
          </div>

          {/* Airy Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { playClickSound(); setSelectedCategory(cat); }}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                    isSelected
                      ? "bg-[#081F5C] text-white shadow-lg scale-105 ring-2 ring-amber-400"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Food Cards Grid (Spacious, Airy & Interactive) */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-500">Preparing fresh menu items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 space-y-3">
              <Utensils className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold">No delicacies found</h3>
              <p className="text-xs text-slate-400">Try adjusting your search query or select another category</p>
              <button
                type="button"
                onClick={() => { setSelectedCategory("ALL"); setSearchQuery(""); }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-[#081F5C] text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const { url: imgUrl, isBrandFallback } = getActualDishImage(item);
                const inCart = cart.find((c) => c.sku === item.sku);

                return (
                  <div
                    key={item.sku}
                    className="group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
                  >
                    {/* Delicious Food Image Header */}
                    <div
                      onClick={() => {
                        setActiveItemForDetail(item);
                        setStep("CUSTOMIZE_ITEM");
                      }}
                      className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer flex items-center justify-center"
                    >
                      {isBrandFallback ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-4">
                          <img
                            src={BIKANERVALA_LOGO_FALLBACK}
                            alt="Bikanervala"
                            className="max-h-24 max-w-[75%] object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[10px] font-black tracking-widest uppercase text-amber-800 dark:text-amber-400 mt-2 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                            Bikanervala Authentic
                          </span>
                        </div>
                      ) : (
                        <img
                          src={imgUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = BIKANERVALA_LOGO_FALLBACK;
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                      {/* Pure Veg & Dietary Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md text-[10px] font-extrabold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span>Pure Veg</span>
                      </div>

                      {/* Pencil Icon Button: Search & Edit Item Photo */}
                      <button
                        type="button"
                        title="Edit Item Photo (Browse from Computer)"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItemForImage(item);
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-700 hover:text-amber-600 hover:bg-white shadow-md backdrop-blur-md transition-all z-20 group/pencil"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-700 group-hover/pencil:text-amber-600" />
                      </button>

                      {/* Kitchen Station / Category Badge */}
                      <div className="absolute top-3 right-11 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                        {item.sub_category || "Special"}
                      </div>

                      {/* Price Tag in Bottom Right of Image */}
                      <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-amber-400 text-[#081F5C] font-black text-sm shadow-lg">
                        {formatINR(Number(item.selling_price) || 120)}
                      </div>
                    </div>

                    {/* Card Content & Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <h4
                          onClick={() => {
                            setActiveItemForDetail(item);
                            setStep("CUSTOMIZE_ITEM");
                          }}
                          className="font-black text-base text-slate-900 dark:text-white leading-snug line-clamp-1 cursor-pointer hover:text-amber-600 transition"
                        >
                          {item.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          Authentic Indian recipe prepared with royal spices and full cream milk.
                        </p>
                      </div>

                      {/* Bottom Action: Stepper or Add Button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveItemForDetail(item);
                            setStep("CUSTOMIZE_ITEM");
                          }}
                          className="text-[11px] font-extrabold text-[#1246A8] dark:text-sky-300 hover:underline flex items-center gap-1"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Customize</span>
                        </button>

                        {inCart ? (
                          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/60 p-1 rounded-2xl border border-amber-300 dark:border-amber-800">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.sku, -1)}
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold shadow hover:bg-rose-50 hover:text-rose-600 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-sm px-2 text-[#081F5C] dark:text-amber-300">
                              {inCart.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.sku, 1)}
                              className="w-8 h-8 rounded-xl bg-amber-400 text-[#081F5C] flex items-center justify-center font-bold shadow hover:bg-amber-500 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#081F5C] hover:bg-[#1246A8] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Tray</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ITEM CUSTOMIZATION MODAL (Airy Bottom Sheet) */}
      {step === "CUSTOMIZE_ITEM" && activeItemForDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Image Header */}
            <div className="relative h-60 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
              {(() => {
                const { url: imgUrl, isBrandFallback } = getActualDishImage(activeItemForDetail);
                return isBrandFallback ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-6">
                    <img
                      src={BIKANERVALA_LOGO_FALLBACK}
                      alt="Bikanervala"
                      className="max-h-32 max-w-[80%] object-contain drop-shadow-md"
                    />
                    <span className="text-xs font-black tracking-widest uppercase text-amber-800 dark:text-amber-400 mt-2 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full">
                      Bikanervala Authenticity Guaranteed
                    </span>
                  </div>
                ) : (
                  <img
                    src={imgUrl}
                    alt={activeItemForDetail.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = BIKANERVALA_LOGO_FALLBACK;
                    }}
                  />
                );
              })()}
              <button
                type="button"
                onClick={() => setStep("MENU")}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-10">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Pure Vegetarian
                  </span>
                  <h3 className="text-xl font-black drop-shadow-md">{activeItemForDetail.name}</h3>
                </div>
                <div className="px-3.5 py-1.5 rounded-2xl bg-amber-400 text-[#081F5C] font-black text-lg shadow-lg">
                  {formatINR(Number(activeItemForDetail.selling_price) || 120)}
                </div>
              </div>
            </div>

            {/* Customization Options Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Special Taste Choices */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chef Preparation Choice
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Pure Desi Ghee",
                    "Jain Friendly (No Onion/Garlic)",
                    "Extra Spicy",
                    "Mild & Sweet",
                  ].map((mod) => {
                    const isSelected = selectedModifiers.includes(mod);
                    return (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedModifiers((prev) =>
                            isSelected ? prev.filter((m) => m !== mod) : [...prev, mod]
                          );
                        }}
                        className={`p-3 rounded-2xl text-left text-xs font-bold border transition flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-950 dark:text-amber-200"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span>{mod}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Cooking Instructions */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Special Kitchen Note (Optional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Serve hot, keep green chutney separate"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Modal Bottom Action */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep("MENU")}
                className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  addToCart(activeItemForDetail, selectedModifiers, customNotes);
                  setStep("MENU");
                  notify(true, `Added ${activeItemForDetail.name} to Tray!`);
                }}
                className="flex-1 px-6 py-3.5 rounded-2xl bg-[#081F5C] hover:bg-[#1246A8] text-white font-black text-sm shadow-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add to My Tray • {formatINR(Number(activeItemForDetail.selling_price) || 120)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BOTTOM TRAY / CART DRAWER BAR */}
      {step === "MENU" && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="p-4 sm:p-5 rounded-3xl bg-[#081F5C] text-white shadow-2xl border-2 border-amber-400 flex items-center justify-between gap-4 animate-slide-up">
              {/* Tray Summary */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#081F5C] flex items-center justify-center font-black text-base shadow-md">
                  {totalItemCount}
                </div>
                <div>
                  <div className="text-xs text-sky-200 font-semibold">
                    {orderType === "DINE_IN" ? "Dine In Order" : "Takeaway Order"} • Tray Total
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {formatINR(cartGrandTotal)}{" "}
                    <span className="text-xs text-slate-300 font-normal">(Incl. 5% GST)</span>
                  </div>
                </div>
              </div>

              {/* View Tray & Proceed Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { playClickSound(); setStep("CART_DRAWER"); }}
                  className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#081F5C] font-black text-sm sm:text-base shadow-xl flex items-center gap-2 transition hover:scale-102 active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Review Tray & Pay</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP: TRAY REVIEW & CHECKOUT CONFIRMATION */}
      {step === "CART_DRAWER" && (
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-6 space-y-6 animate-fade-in pb-20">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setStep("MENU")}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Adding Delicacies</span>
            </button>
            <h2 className="text-xl font-black text-[#081F5C] dark:text-white">Your Order Tray</h2>
            <span className="text-xs text-slate-400 font-bold">{totalItemCount} Items</span>
          </div>

          {/* Cart Items List */}
          <div className="space-y-3">
            {cart.map((c) => (
              <div
                key={c.sku}
                className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {c.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {c.modifiers.join(", ")}
                    </p>
                    <div className="font-bold text-xs text-[#081F5C] dark:text-amber-400 mt-1">
                      {formatINR(c.unit_price * c.qty)}
                    </div>
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => updateCartQty(c.sku, -1)}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-white shadow"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-sm px-2">{c.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(c.sku, 1)}
                    className="w-8 h-8 rounded-xl bg-amber-400 text-[#081F5C] flex items-center justify-center font-bold shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Breakdown Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-md">
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Item Subtotal</span>
              <span>{formatINR(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>GST (5% Food Services)</span>
              <span>{formatINR(cartGst)}</span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-lg font-black text-[#081F5C] dark:text-white">
              <span>Grand Total</span>
              <span className="text-amber-500">{formatINR(cartGrandTotal)}</span>
            </div>
          </div>

          {/* Proceed to Payment Button */}
          <button
            type="button"
            onClick={() => { playClickSound(); setStep("PAYMENT"); }}
            className="w-full py-4 rounded-3xl bg-[#081F5C] hover:bg-[#1246A8] text-white font-black text-base shadow-2xl flex items-center justify-center gap-3 transition"
          >
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span>Select Payment Method • {formatINR(cartGrandTotal)}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP: MULTI-MODE PAYMENT SELECTION (UPI, Card EDC POS, Cash at Counter) */}
      {step === "PAYMENT" && (
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-6 space-y-6 animate-fade-in pb-20">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setStep("CART_DRAWER")}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tray</span>
            </button>
            <h2 className="text-xl font-black text-[#081F5C] dark:text-white">Choose Payment Mode</h2>
            <span className="text-xs font-black text-amber-500">{formatINR(cartGrandTotal)}</span>
          </div>

          {/* Payment Options Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Dynamic UPI QR */}
            <div
              onClick={() => { playClickSound(); setPaymentMode("UPI"); }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition text-center space-y-2 ${
                paymentMode === "UPI"
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-400 shadow-xl scale-102"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 mx-auto flex items-center justify-center text-amber-600">
                <QrCode className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm">UPI QR Code</h4>
              <p className="text-[11px] text-slate-500">GPay, PhonePe, Paytm</p>
            </div>

            {/* 2. Card Swiping Machine */}
            <div
              onClick={() => { playClickSound(); setPaymentMode("CARD_EDC"); }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition text-center space-y-2 ${
                paymentMode === "CARD_EDC"
                  ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 shadow-xl scale-102"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 mx-auto flex items-center justify-center text-blue-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm">Debit / Credit Card</h4>
              <p className="text-[11px] text-slate-500">PineLabs EDC POS Tap</p>
            </div>

            {/* 3. Cash at Counter */}
            <div
              onClick={() => { playClickSound(); setPaymentMode("COUNTER_CASH"); }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition text-center space-y-2 ${
                paymentMode === "COUNTER_CASH"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-xl scale-102"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 mx-auto flex items-center justify-center text-emerald-600">
                <Receipt className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm">Pay at Counter</h4>
              <p className="text-[11px] text-slate-500">Cash / Token Desk</p>
            </div>
          </div>

          {/* ACTIVE PAYMENT MODE INTERACTIVE SCREEN */}
          {paymentMode === "UPI" && (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-5 shadow-xl animate-fade-in">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                  Instant Dynamic UPI
                </span>
                <h3 className="text-xl font-black">Scan QR to Complete Payment</h3>
                <p className="text-xs text-slate-500">
                  Open any UPI App on your phone and scan the code below
                </p>
              </div>

              {/* High Contrast Dynamic QR Box */}
              <div className="inline-block p-4 rounded-3xl bg-white border-4 border-[#081F5C] shadow-2xl relative">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=bikanervala@icici&pn=BikanervalaFoods&am=${cartGrandTotal}&cu=INR&tn=KioskOrder`)}`}
                  alt="UPI Payment QR"
                  className="w-48 h-48 rounded-xl"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow p-1 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-[#081F5C]" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>
                    Valid for: <b>{Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, "0")}</b> min
                  </span>
                </div>

                {/* Instant Simulator Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePlaceOrder("UPI")}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 mx-auto"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate UPI Payment Success</span>
                </button>
              </div>
            </div>
          )}

          {paymentMode === "CARD_EDC" && (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-6 shadow-xl animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950 mx-auto flex items-center justify-center text-blue-600">
                <CreditCard className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black">PineLabs Plutus Cloud POS Terminal</h3>
                <p className="text-xs text-slate-500">
                  TID: {hardwareConfig.edc_tid} • Please insert or tap your card on the POS machine below
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlaceOrder("CARD_EDC")}
                className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate Card Tap & PIN Verified</span>
              </button>
            </div>
          )}

          {paymentMode === "COUNTER_CASH" && (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-6 shadow-xl animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950 mx-auto flex items-center justify-center text-emerald-600">
                <Receipt className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black">Pay Cash at Counter</h3>
                <p className="text-xs text-slate-500">
                  Your order token will be printed. Hand over cash at Cash Counter 1 for immediate release.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlaceOrder("COUNTER_CASH")}
                className="px-8 py-3.5 rounded-2xl bg-[#081F5C] hover:bg-[#1246A8] text-white font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <Receipt className="w-4 h-4" />
                <span>Print Token & Pay Cash</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: ORDER CONFIRMATION & PRINTED TOKEN SLIP */}
      {step === "CONFIRMATION" && confirmedOrderResult && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-xl mx-auto w-full space-y-6 text-center animate-fade-in pb-16">
          {/* Celebratory Badge */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mx-auto shadow-xl ring-8 ring-emerald-50 dark:ring-emerald-900/40 animate-pulse">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow">
              Order Confirmed & Sent to Kitchen
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Thank you! Please collect your receipt
            </h2>
            <p className="text-xs text-slate-500">
              Kitchen Captains are now preparing your order with authentic ingredients
            </p>
          </div>

          {/* Token Card */}
          <div className="w-full p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-amber-400 shadow-2xl space-y-4">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Your Order Token
            </div>
            <div className="text-5xl font-black text-[#081F5C] dark:text-amber-400 tracking-tight">
              #{confirmedOrderResult.order?.order_no || "K-108"}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {confirmedOrderResult.order?.order_type === "DINE_IN" ? `Table: ${confirmedOrderResult.order?.table_code || "T-04"}` : "Takeaway Parcel"}
            </div>

            {/* Barcode Simulation */}
            <div className="pt-2 flex justify-center">
              <BarcodeSvg value={confirmedOrderResult.order?.order_no || "K-108"} height={45} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                if (confirmedOrderResult.order) {
                  print40ColumnThermalSlip(confirmedOrderResult.order, outletInfo, "Kiosk 40-Col Printer");
                }
              }}
              className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Reprint Slip</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3.5 rounded-2xl bg-[#081F5C] text-white font-black text-xs hover:bg-[#1246A8] transition shadow-xl"
            >
              Start New Order
            </button>
          </div>
        </div>
      )}

      {/* QUICK ITEM IMAGE EDIT & BROWSE MODAL (Search item, pencil icon, browse file, locked price) */}
      {editingItemForImage && (
        <ItemImageUploadModal
          item={editingItemForImage}
          allItems={menuItems}
          onClose={() => setEditingItemForImage(null)}
          onUpdated={(updated) => {
            setMenuItems((prev) =>
              prev.map((m) => (m.sku === updated.sku ? updated : m))
            );
            notify(true, `Photo for "${updated.name}" updated in Kiosk!`);
          }}
        />
      )}
    </div>
  );
};
