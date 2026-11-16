import React, { useEffect, useState, useMemo } from "react";
import {
  Monitor,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Sparkles,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RotateCcw,
  ArrowRight,
  Receipt,
  Utensils,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, Outlet } from "../types";
import { BarcodeSvg } from "../components/BarcodeSvg";
import { print40ColumnThermalSlip } from "../utils/posHardware";

interface RestaurantKioskProps {
  activeOutlet: string;
  outlets: Outlet[];
  actorName?: string;
}

interface KioskCartItem {
  sku: string;
  name: string;
  qty: number;
  unit_price: number;
  station: string;
  modifiers: string;
}

type KioskStep = "MENU" | "CART_REVIEW" | "PAYMENT_METHOD" | "ONLINE_PAYING" | "ORDER_CONFIRMED";

export const RestaurantKiosk: React.FC<RestaurantKioskProps> = ({
  activeOutlet,
  outlets,
  actorName = "Self Service Kiosk",
}) => {
  const restOutlet = activeOutlet === "DEL01" || activeOutlet === "MFG01" ? "GUR02" : activeOutlet;
  const outletObj = outlets.find((o) => o.code === restOutlet);

  const [step, setStep] = useState<KioskStep>("MENU");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [tableNumber, setTableNumber] = useState<string>("T-01");
  const [menuItems, setMenuItems] = useState<ItemSku[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [paymentChoice, setPaymentChoice] = useState<"PAY_NOW_ONLINE" | "PAY_AT_COUNTER">("PAY_NOW_ONLINE");
  const [onlinePayMode, setOnlinePayMode] = useState<"UPI" | "Card">("UPI");
  const [confirmedOrderResult, setConfirmedOrderResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadMenu = async () => {
    setLoading(true);
    try {
      const items = await apiFetch<ItemSku[]>("/api/admin/items");
      setMenuItems(items.filter((i) => i.category === "FG-Rest"));
    } catch (e: any) {
      notify(false, "Failed to load menu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [restOutlet]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => {
      if (m.sub_category) set.add(m.sub_category);
    });
    return ["ALL", ...Array.from(set)];
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    let list = menuItems;
    if (selectedCategory !== "ALL") {
      list = list.filter((m) => m.sub_category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          (m.kitchen_station && m.kitchen_station.toLowerCase().includes(q))
      );
    }
    return list;
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (dish: ItemSku) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.sku === dish.sku);
      if (existing) {
        return prev.map((c) =>
          c.sku === dish.sku ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          sku: dish.sku,
          name: dish.name,
          qty: 1,
          unit_price: Number(dish.selling_price),
          station: dish.kitchen_station || "Main Kitchen",
          modifiers: "Standard",
        },
      ];
    });
  };

  const updateCartQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.sku !== sku) return c;
          const next = c.qty + delta;
          return next > 0 ? { ...c, qty: next } : null;
        })
        .filter(Boolean) as KioskCartItem[]
    );
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const cartGst = Number((cartSubtotal * 0.05).toFixed(2));
  const cartGrandTotal = cartSubtotal + cartGst;
  const totalItemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handlePlaceKioskOrder = async (choice: "PAY_NOW_ONLINE" | "PAY_AT_COUNTER") => {
    if (cart.length === 0) {
      notify(false, "Your cart is empty. Please select food items.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        outlet_code: restOutlet,
        order_type: orderType,
        table_code: orderType === "DINE_IN" ? tableNumber : "PARCEL",
        customer_name: customerName.trim() || "Guest Customer",
        customer_phone: customerPhone.trim(),
        payment_choice: choice,
        payment_mode: choice === "PAY_NOW_ONLINE" ? onlinePayMode : "Cash",
        payment_ref: choice === "PAY_NOW_ONLINE" ? `KIOSK-${onlinePayMode}-${Date.now().toString().slice(-4)}` : "",
        items: cart,
      };

      const result = await apiFetch<any>("/api/kot/kiosk/order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setConfirmedOrderResult(result);
      setStep("ORDER_CONFIRMED");
      setCart([]);

      // Auto print thermal kiosk invoice / estimate slip
      if (result.order) {
        print40ColumnThermalSlip(result.order, outletObj, "Self-Service Kiosk 40-Col Printer");
      }
    } catch (e: any) {
      notify(false, e.message || "Failed to submit Kiosk order");
    } finally {
      setLoading(false);
    }
  };

  const handleResetKiosk = () => {
    setStep("MENU");
    setCart([]);
    setConfirmedOrderResult(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-[85vh] flex flex-col bg-[#FAF9F5] dark:bg-[#070B14] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3 m-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            toast.ok
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Kiosk Hero Brand Header */}
      <header className="bg-gradient-to-r from-[#081F5C] via-[#0D2E82] to-[#1246A8] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 backdrop-blur-sm shadow-inner">
            <img
              src="/annavya-badge-light.png"
              alt="Annavya"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Annavya Express Self-Ordering Kiosk
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-[#081F5C] text-[10px] font-black uppercase tracking-wider">
                Touch Kiosk
              </span>
            </div>
            <p className="text-xs text-sky-200">
              {outletObj?.trade_name || "Annavya Heritage Food Court"} ({restOutlet}) • Fresh Prepared on Kitchen Order
            </p>
          </div>
        </div>

        {/* Dine-In vs Takeaway Selector */}
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
          <button
            onClick={() => setOrderType("DINE_IN")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              orderType === "DINE_IN"
                ? "bg-amber-400 text-[#081F5C] shadow-md"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dine In (Table)</span>
          </button>
          <button
            onClick={() => setOrderType("TAKEAWAY")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              orderType === "TAKEAWAY"
                ? "bg-amber-400 text-[#081F5C] shadow-md"
                : "text-white/80 hover:text-white"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Takeaway Parcel</span>
          </button>
        </div>
      </header>

      {/* Main Kiosk Viewport */}
      {step === "MENU" && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left / Center: Interactive Menu Grid */}
          <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-4 overflow-hidden">
            {/* Search and Category Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Touch here to search food, snacks, desserts, drinks..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1324] text-xs font-medium focus:border-[#1246A8] focus:outline-none shadow-sm"
                />
              </div>

              {orderType === "DINE_IN" && (
                <div className="flex items-center gap-2 bg-white dark:bg-[#0C1324] border-2 border-slate-200 dark:border-slate-800 px-3 py-2 rounded-2xl">
                  <MapPin className="w-4 h-4 text-[#1246A8]" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Table:</span>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="bg-transparent font-black text-xs text-[#081F5C] dark:text-[#F8F3E6] focus:outline-none"
                  >
                    {["T-01", "T-02", "T-03", "T-04", "T-05", "T-06"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Category Ribbon */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition shadow-sm ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-[#081F5C] to-[#1246A8] text-white"
                      : "bg-white dark:bg-[#0C1324] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 max-h-[620px]">
              {filteredMenu.map((dish) => {
                const inCart = cart.find((c) => c.sku === dish.sku);
                return (
                  <div
                    key={dish.sku}
                    className={`p-4 rounded-3xl border-2 transition flex flex-col justify-between text-left group ${
                      inCart
                        ? "border-[#1246A8] bg-blue-50/60 dark:bg-blue-950/40 shadow-md"
                        : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1324] hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                          {dish.kitchen_station || "Kitchen"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {dish.sub_category}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-[#1246A8] transition">
                        {dish.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-black text-[#081F5C] dark:text-[#F8F3E6]">
                        {formatINR(dish.selling_price)}
                      </span>

                      {inCart ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#1246A8] px-2 py-1 shadow-sm">
                          <button
                            onClick={() => updateCartQty(dish.sku, -1)}
                            className="p-0.5 text-slate-700 hover:text-rose-600"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-xs px-1 text-[#1246A8] dark:text-sky-300">
                            {inCart.qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(dish.sku, 1)}
                            className="p-0.5 text-slate-700 hover:text-emerald-600"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(dish)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#081F5C] to-[#1246A8] hover:from-[#0D2E82] hover:to-[#1856C9] text-white text-xs font-black shadow-md flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Touch Cart Sidebar */}
          <div className="w-full lg:w-96 bg-white dark:bg-[#0C1324] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#1246A8]" />
                  <h2 className="text-base font-black text-[#081F5C] dark:text-[#F8F3E6]">
                    Your Kiosk Tray
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                  {totalItemCount} Items
                </span>
              </div>

              {/* Cart List */}
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    Touch dishes on the left to add them to your order tray.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.sku}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-bold">
                          {formatINR(item.unit_price)} × {item.qty} ={" "}
                          <span className="text-[#081F5C] dark:text-sky-300 font-black">
                            {formatINR(item.qty * item.unit_price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                        <button
                          onClick={() => updateCartQty(item.sku, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold hover:bg-rose-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black px-1.5">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.sku, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold hover:bg-emerald-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Checkout Action */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatINR(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST (5% Restaurant)</span>
                  <span className="font-bold">{formatINR(cartGst)}</span>
                </div>
                <div className="flex justify-between font-black text-base text-[#081F5C] dark:text-[#F8F3E6] pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Payable Total</span>
                  <span className="text-xl text-[#1246A8] dark:text-sky-300">
                    {formatINR(cartGrandTotal)}
                  </span>
                </div>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={() => setStep("PAYMENT_METHOD")}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 disabled:opacity-40 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Payment Method Choice (Pay Now Online vs Pay at Counter) */}
      {step === "PAYMENT_METHOD" && (
        <div className="flex-1 p-6 lg:p-12 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-[#1246A8] text-xs font-black uppercase tracking-wider">
              Step 2 of 2: Select Payment Option
            </span>
            <h2 className="text-2xl lg:text-3xl font-black text-[#081F5C] dark:text-[#F8F3E6]">
              How would you like to pay your bill?
            </h2>
            <p className="text-sm text-slate-500">
              Order Total: <b className="text-slate-900 dark:text-slate-100">{formatINR(cartGrandTotal)}</b> ({totalItemCount} items • {orderType})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* OPTION 1: PAY NOW ONLINE (Self Checkout) */}
            <div
              onClick={() => {
                setPaymentChoice("PAY_NOW_ONLINE");
                setStep("ONLINE_PAYING");
              }}
              className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-[#0C1324] hover:shadow-2xl cursor-pointer transition text-left space-y-4 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Instant Self Checkout
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  Pay Now at Kiosk (UPI / Card)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Scan Dynamic QR or tap credit/debit card directly at the kiosk. Get your <b>Tax Invoice & Token #</b> instantly, and wait for your token call on the mic!
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-emerald-700">
                <span>Immediate Kitchen KOT Fired</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* OPTION 2: PAY AT COUNTER */}
            <div
              onClick={() => handlePlaceKioskOrder("PAY_AT_COUNTER")}
              className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-white dark:bg-[#0C1324] hover:shadow-2xl cursor-pointer transition text-left space-y-4 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition">
                <Banknote className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                  Counter Settlement
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  Pay at Cashier Counter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Print an <b>Estimate Slip</b> from this kiosk, take it to the Cashier to pay via Cash, Food Coupon, or Card. After payment, cashier gives the bill to food counter for mic call.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-amber-700">
                <span>Print Estimate Slip & Go to Counter</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep("MENU")}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
          >
            ← Back to Food Menu
          </button>
        </div>
      )}

      {/* Step 3: Online Payment Simulation (UPI QR / Card) */}
      {step === "ONLINE_PAYING" && (
        <div className="flex-1 p-6 lg:p-12 flex flex-col items-center justify-center max-w-xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0C1324] border-2 border-[#1246A8] shadow-2xl text-center space-y-5 w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
              <ShieldCheck className="w-4 h-4" />
              <span>Annavya Secure UPI / BharatQR Gateway</span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Total Amount to Pay</span>
              <h2 className="text-3xl font-black text-[#081F5C] dark:text-[#F8F3E6]">
                {formatINR(cartGrandTotal)}
              </h2>
            </div>

            {/* Dynamic UPI QR Code Canvas */}
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
              <div className="w-52 h-52 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white p-3 space-y-2">
                <QrCode className="w-24 h-24 text-amber-300" />
                <span className="text-[11px] font-mono text-center font-bold">
                  scan &amp; pay via gpay / paytm / phonepe
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  upi://pay?pa=annavya@{restOutlet.toLowerCase()}&amp;am={cartGrandTotal}
                </span>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setOnlinePayMode("UPI")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  onlinePayMode === "UPI"
                    ? "bg-[#081F5C] text-white border-[#081F5C]"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                UPI QR Pay
              </button>
              <button
                onClick={() => setOnlinePayMode("Card")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  onlinePayMode === "Card"
                    ? "bg-[#081F5C] text-white border-[#081F5C]"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                Debit / Credit Card Tap
              </button>
            </div>

            <button
              onClick={() => handlePlaceKioskOrder("PAY_NOW_ONLINE")}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition"
            >
              <span>{loading ? "Processing Payment..." : "Simulate Payment Success & Print Invoice"}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setStep("PAYMENT_METHOD")}
            className="text-xs font-bold text-slate-500 hover:underline"
          >
            ← Choose Different Payment Method
          </button>
        </div>
      )}

      {/* Step 4: Order Confirmation & Slip View (Printed at Kiosk) */}
      {step === "ORDER_CONFIRMED" && confirmedOrderResult && (
        <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-center max-w-3xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0C1324] border-2 border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 w-full">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
                {confirmedOrderResult.is_paid ? "Invoice Generated • Kitchen Preparing" : "Estimate Generated • Pay at Counter"}
              </span>
              <h2 className="text-3xl font-black text-[#081F5C] dark:text-[#F8F3E6] mt-2">
                Order Placed Successfully!
              </h2>
            </div>

            {/* Token Callout Box */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#081F5C] to-[#1246A8] text-white shadow-xl space-y-2">
              <span className="text-xs text-amber-300 font-extrabold uppercase tracking-widest">
                YOUR ORDER TOKEN NUMBER
              </span>
              <div className="text-5xl font-black font-mono tracking-wider text-white">
                #{confirmedOrderResult.token_no}
              </div>
              <p className="text-xs text-sky-100 flex items-center justify-center gap-1.5 pt-1">
                <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>{confirmedOrderResult.mic_call_instruction}</span>
              </p>
            </div>

            {/* Workflow instructions banner */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-left text-amber-950 dark:text-amber-200 space-y-1.5">
              <div className="font-extrabold flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-700" />
                Next Steps for Customer:
              </div>
              {confirmedOrderResult.is_paid ? (
                <p>
                  1. Take your printed <b>Tax Invoice ({confirmedOrderResult.invoice_no})</b> from the kiosk printer slot below.<br />
                  2. Wait in the seating area — your Token <b>#{confirmedOrderResult.token_no}</b> will be called over the mic when the food is ready at the restaurant handover counter!
                </p>
              ) : (
                <p>
                  1. Take your printed <b>Estimate Slip ({confirmedOrderResult.estimate_no})</b> to the <b>Cashier Counter</b>.<br />
                  2. Pay the cashier via Cash, Card, or Food Coupon to receive your finalized Tax Invoice.<br />
                  3. Cashier hands over your order to kitchen, and your Token <b>#{confirmedOrderResult.token_no}</b> will be called on the mic!
                </p>
              )}
            </div>

            {/* Printed Barcode */}
            <div className="p-4 bg-slate-50 dark:bg-[#0B1324] rounded-2xl border border-slate-200 dark:border-slate-800">
              <BarcodeSvg
                value={confirmedOrderResult.invoice_no || confirmedOrderResult.estimate_no}
                height={40}
              />
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                {confirmedOrderResult.invoice_no || confirmedOrderResult.estimate_no}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={() =>
                  print40ColumnThermalSlip(
                    confirmedOrderResult.order,
                    outletObj,
                    "Self-Service Kiosk 40-Col Printer"
                  )
                }
                className="px-5 py-3 rounded-2xl bg-[#081F5C] hover:bg-[#1246A8] text-white text-xs font-black shadow-md flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Reprint 40-Col Receipt</span>
              </button>

              <button
                onClick={handleResetKiosk}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-md flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start New Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
