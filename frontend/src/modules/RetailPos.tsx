import React, { useEffect, useRef, useState } from "react";
import {
  Scale,
  ScanBarcode,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Tag,
  Keyboard,
  Hand,
  Box,
  AlertTriangle,
  ArchiveRestore,
  Printer,
  BarChart3,
  CornerDownLeft,
  User,
  Phone,
  Monitor,
  ExternalLink,
  Sliders,
  Store,
  Maximize2,
  Minimize2,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Settings,
  Sparkles,
  QrCode,
  Check,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, Outlet } from "../types";
import { ThermalSlip } from "../components/ThermalSlip";
import { LowStockBanner, LowStockAlertItem } from "../components/LowStockBanner";
import { CashierEodReport } from "../components/CashierEodReport";
import { kickCashDrawer, print40ColumnThermalSlip } from "../utils/posHardware";
import { AdminPosHardwareModal } from "../components/AdminPosHardwareModal";
import { AdminCashCounterModal, CashCounter } from "../components/AdminCashCounterModal";
import { AdminRetailReportsModal } from "../components/AdminRetailReportsModal";
import { DualScreenPayload } from "../components/RetailCustomerDisplay";

interface RetailPosProps {
  activeOutlet: string;
  outlets: Outlet[];
  actorName?: string;
  isStandalone?: boolean;
}

export const RetailPos: React.FC<RetailPosProps> = ({
  activeOutlet,
  outlets,
  actorName = "Cashier",
  isStandalone = false,
}) => {
  const [counterTab, setCounterTab] = useState<
    "estimate" | "cashier" | "delivery" | "stock" | "eod"
  >("estimate");
  const [billingMode, setBillingMode] = useState<"3_COUNTER" | "DIRECT">("3_COUNTER");
  const [touchMode, setTouchMode] = useState(true);
  const [itemsCatalog, setItemsCatalog] = useState<ItemSku[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [shopStock, setShopStock] = useState<any[]>([]);
  const [hwConfig, setHwConfig] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [posPage, setPosPage] = useState<number>(1);
  const POS_PAGE_SIZE = 10;
  const [stagedEntry, setStagedEntry] = useState<{ item: ItemSku; qty: number } | null>(null);
  const [doubleEnterArmed, setDoubleEnterArmed] = useState(false);

  // Active Terminal & Cash Counter State
  const [activeCounter, setActiveCounter] = useState<CashCounter | null>(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [heldCarts, setHeldCarts] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Customer details for estimate & order
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Calculate live quantity left on shop shelf
  const getStockLeft = (sku: string): number => {
    const batches = (shopStock || []).filter((b: any) => b.sku === sku);
    const total = batches.reduce((sum: number, b: any) => sum + (Number(b.qty) || 0), 0);
    return Math.round(total * 100) / 100;
  };

  // Electronic Weighing Scale Simulator
  const [scaleItem, setScaleItem] = useState<ItemSku | null>(null);
  const [grossWeightGrams, setGrossWeightGrams] = useState<number>(550);

  // Cashier state
  const [scanInput, setScanInput] = useState("");
  const [loadedOrder, setLoadedOrder] = useState<any>(null);
  const [payMode, setPayMode] = useState<
    "UPI" | "Cash" | "Credit Card" | "Food Coupon" | "Split"
  >("UPI");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [splitAmounts, setSplitAmounts] = useState<{
    cash: string;
    upi: string;
    card: string;
    coupon: string;
  }>({ cash: "0", upi: "0", card: "0", coupon: "0" });

  // SMS OTP Ad-Hoc Discount state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCategory, setOtpCategory] = useState<"VIP" | "Owner" | "Employee" | "Vendor">("Owner");
  const [otpBeneficiary, setOtpBeneficiary] = useState("Director Guest");
  const [otpPct, setOtpPct] = useState(15);
  const [otpReason, setOtpReason] = useState("Festive goodwill treat");
  const [pendingOtp, setPendingOtp] = useState<any>(null);
  const [enteredOtp, setEnteredOtp] = useState("");

  // Delivery state
  const [deliveryBarcode, setDeliveryBarcode] = useState("");
  const [deliveryPreviewOrder, setDeliveryPreviewOrder] = useState<any>(null);
  const [deliveryAlert, setDeliveryAlert] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const deliveryInputRef = useRef<HTMLInputElement>(null);
  const doubleEnterTimerRef = useRef<number | null>(null);

  const outletObj = outlets.find((o) => o.code === activeOutlet);

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    const [catalog, posOrders, shopData, configs] = await Promise.all([
      apiFetch<ItemSku[]>("/api/admin/items"),
      apiFetch<any[]>(`/api/pos/orders?outlet_code=${activeOutlet}`),
      apiFetch<any>(`/api/pos/shop/overview?outlet_code=${activeOutlet}`),
      apiFetch<any[]>("/api/admin/config"),
    ]);
    setItemsCatalog(
      catalog.filter((i) => i.category === "FG-Sweet" || i.sku === "PKG-BAG-01")
    );
    setOrders(posOrders);
    setPromos(shopData.promos || []);
    setShopStock(shopData.stock || []);
    const hw = configs.find((c) => c.config_key === "pos_hardware_drivers")?.config_value;
    if (hw) {
      setHwConfig(hw);
      if (typeof hw.touch_screen_mode === "boolean") {
        setTouchMode(hw.touch_screen_mode);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOutlet]);

  // Active Counter terminal profile loading
  useEffect(() => {
    try {
      const storedCounter = localStorage.getItem("annavya_pos_active_counter");
      if (storedCounter) {
        const parsed = JSON.parse(storedCounter);
        if (parsed.outlet_code === activeOutlet) {
          setActiveCounter(parsed);
          return;
        }
      }
      apiFetch<CashCounter[]>(`/api/pos/counters?outlet_code=${activeOutlet}`).then((list) => {
        if (list && list.length > 0) {
          setActiveCounter(list[0]);
          localStorage.setItem("annavya_pos_active_counter", JSON.stringify(list[0]));
        }
      });
      const storedHeld = localStorage.getItem("annavya_pos_held_carts");
      if (storedHeld) {
        setHeldCarts(JSON.parse(storedHeld));
      }
    } catch (e) {
      console.warn("Error loading counter or held carts:", e);
    }
  }, [activeOutlet]);

  // Dual Screen / CFD Broadcast Helper
  const broadcastToCfd = (override?: Partial<DualScreenPayload>) => {
    const subtotal = cart.reduce((s, c) => s + Number(c.line_total || 0), 0);
    const gst = cart.reduce((s, c) => s + (Number(c.line_total || 0) * (Number(c.gst_pct || 5) / 100)), 0);
    const grandTotal = Math.round((subtotal + gst) * 100) / 100;

    const payload: DualScreenPayload = {
      outletCode: activeOutlet,
      outletName: outletObj?.trade_name || "Bikanervala Heritage Sweets",
      counterId: activeCounter?.counter_id || "CNT-DEL01-01",
      counterName: activeCounter?.counter_name || "Mithai Counter 1",
      cashierId: activeCounter?.cashier_id || "CSH-DEL01-001",
      cashierName: activeCounter?.cashier_name || actorName || "Priya Sharma",
      terminalIp: activeCounter?.ip_address || "127.0.0.1",
      items: cart,
      subtotal,
      discountAmount: 0,
      cgst: Math.round((gst / 2) * 100) / 100,
      sgst: Math.round((gst / 2) * 100) / 100,
      grandTotal,
      customerName,
      customerMobile,
      paymentMode: payMode,
      docId: selectedSlip?.invoice_no || selectedSlip?.estimate_no || loadedOrder?.estimate_no,
      isSettled: selectedSlip?.status === "DELIVERED_CLOSED" || selectedSlip?.status === "PAID_PENDING_DELIVERY",
      ...override,
    };

    try {
      localStorage.setItem("annavya_pos_cfd_state", JSON.stringify(payload));
      const bc = new BroadcastChannel("annavya_pos_cfd");
      bc.postMessage(payload);
      bc.close();
    } catch (e) {
      // fallback
    }
  };

  // Sync to CFD whenever cart, customer, or payMode changes
  useEffect(() => {
    if (counterTab === "estimate") {
      broadcastToCfd();
    }
  }, [cart, customerName, customerMobile, payMode, counterTab, activeCounter]);

  // Sync to CFD whenever loadedOrder changes in cashier tab
  useEffect(() => {
    if (counterTab === "cashier" && loadedOrder) {
      broadcastToCfd({
        items: loadedOrder.items || [],
        subtotal: Number(loadedOrder.subtotal || 0),
        discountAmount: Number(loadedOrder.discount_amount || 0),
        discountCategory: loadedOrder.discount_category,
        cgst: Number(loadedOrder.cgst || 0),
        sgst: Number(loadedOrder.sgst || 0),
        grandTotal: Number(loadedOrder.grand_total || 0),
        paymentMode: payMode,
        docId: loadedOrder.invoice_no || loadedOrder.estimate_no,
        isSettled: loadedOrder.status === "DELIVERED_CLOSED" || loadedOrder.status === "PAID_PENDING_DELIVERY",
      });
    }
  }, [loadedOrder, payMode, counterTab, activeCounter]);

  const launchCustomerDisplay = () => {
    broadcastToCfd();
    const dualWindow = window.open(
      "/pos/customer-display",
      "BikanervalaDualScreen",
      "width=1024,height=768,menubar=no,toolbar=no,location=no,status=no"
    );
    if (!dualWindow) {
      notify("err", "Pop-up blocked! Please allow pop-ups for Dual Screen Customer Display.");
    } else {
      notify("ok", "🖥️ Dual Screen (Customer Display) launched! Drag to secondary monitor.");
    }
  };

  const handleHoldCart = () => {
    if (cart.length === 0) {
      notify("err", "Cart is empty. Nothing to hold.");
      return;
    }
    const newHeld = [
      ...heldCarts,
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString("en-IN"),
        customerName: customerName || "Guest",
        customerMobile,
        items: cart,
        total: cart.reduce((s, c) => s + Number(c.line_total || 0), 0),
      },
    ];
    setHeldCarts(newHeld);
    localStorage.setItem("annavya_pos_held_carts", JSON.stringify(newHeld));
    setCart([]);
    setCustomerName("");
    setCustomerMobile("");
    notify("ok", `Cart held! (${newHeld.length} carts parked on hold)`);
  };

  const handleRecallCart = (idx: number) => {
    const target = heldCarts[idx];
    if (!target) return;
    setCart(target.items);
    setCustomerName(target.customerName !== "Guest" ? target.customerName : "");
    setCustomerMobile(target.customerMobile || "");
    const remaining = heldCarts.filter((_, i) => i !== idx);
    setHeldCarts(remaining);
    localStorage.setItem("annavya_pos_held_carts", JSON.stringify(remaining));
    notify("ok", `Cart recalled for ${target.customerName}!`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };


  const addItemToCart = (item: ItemSku) => {
    if (item.is_loose_weighed) {
      setScaleItem(item);
      setGrossWeightGrams(500 + Number(item.default_tare_grams || 50));
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.sku === item.sku);
      if (existing) {
        return prev.map((c) =>
          c.sku === item.sku
            ? { ...c, qty: c.qty + 1, line_total: (c.qty + 1) * c.unit_price }
            : c
        );
      }
      return [
        ...prev,
        {
          sku: item.sku,
          name: item.name,
          qty: 1,
          uom: item.pos_uom,
          unit_price: Number(item.selling_price),
          gst_pct: Number(item.gst_pct),
          gross_wt_g: 0,
          tare_wt_g: 0,
          net_wt_g: 0,
          line_total: Number(item.selling_price),
        },
      ];
    });
  };

  const adjustCartQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c, i) => {
          if (i !== idx) return c;
          const step = c.uom === "kg" ? 0.25 : 1;
          const nextQty = Number((Number(c.qty) + delta * step).toFixed(3));
          if (nextQty <= 0) return null;
          return {
            ...c,
            qty: nextQty,
            line_total: Number((nextQty * Number(c.unit_price)).toFixed(2)),
          };
        })
        .filter(Boolean)
    );
  };

  const confirmScaleWeight = (customGrams?: number) => {
    if (!scaleItem) return;
    const tare = Number(scaleItem.default_tare_grams || 0);
    const gross = customGrams ?? grossWeightGrams;
    const netGrams = Math.max(50, gross - tare);
    const netKg = Number((netGrams / 1000).toFixed(3));
    const unitPrice = Number(scaleItem.selling_price);
    setCart((prev) => [
      ...prev,
      {
        sku: scaleItem.sku,
        name: scaleItem.name,
        qty: netKg,
        uom: "kg",
        unit_price: unitPrice,
        gst_pct: Number(scaleItem.gst_pct),
        gross_wt_g: gross,
        tare_wt_g: tare,
        net_wt_g: netGrams,
        line_total: Number((netKg * unitPrice).toFixed(2)),
      },
    ]);
    setScaleItem(null);
  };

  const generateEstimate = async () => {
    if (cart.length === 0) return;
    setDoubleEnterArmed(false);
    try {
      const est = await apiFetch("/api/pos/estimates", {
        method: "POST",
        body: JSON.stringify({
          outlet_code: activeOutlet,
          mode: billingMode,
          items: cart,
          estimate_staff: activeCounter?.cashier_name || actorName,
          customer_name: customerName.trim() || undefined,
          customer_mobile: customerMobile.trim() || undefined,
          counter_id: activeCounter?.counter_id || "CNT-01",
          counter_name: activeCounter?.counter_name || "Mithai Counter 1",
          cashier_id: activeCounter?.cashier_id || "CSH-001",
          cashier_name: activeCounter?.cashier_name || actorName || "Priya Sharma",
          terminal_ip: activeCounter?.ip_address || "127.0.0.1",
        }),
      });
      setSelectedSlip(est);
      broadcastToCfd({
        items: cart,
        docId: est.estimate_no,
        isSettled: false,
      });
      setCart([]);
      setStagedEntry(null);
      setCustomerName("");
      setCustomerMobile("");
      await loadData();
      notify(
        "ok",
        `Generated Estimate ${est.estimate_no} (Last-4: #${String(est.estimate_no).slice(-4)})! Printing 40-Col Slip...`
      );
      print40ColumnThermalSlip(est, outletObj, hwConfig?.active_printer_driver);
      if (billingMode === "DIRECT") {
        setLoadedOrder(est);
        setCounterTab("cashier");
      }
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const armOrTriggerDoubleEnterEstimate = () => {
    if (cart.length === 0) return;
    if (doubleEnterArmed) {
      if (doubleEnterTimerRef.current) window.clearTimeout(doubleEnterTimerRef.current);
      setDoubleEnterArmed(false);
      generateEstimate();
      return;
    }
    setDoubleEnterArmed(true);
    notify("ok", "Press ENTER one more time to generate the Estimate Slip!");
    if (doubleEnterTimerRef.current) window.clearTimeout(doubleEnterTimerRef.current);
    doubleEnterTimerRef.current = window.setTimeout(() => {
      setDoubleEnterArmed(false);
    }, 2500);
  };

  const adjustStagedQty = (delta: number) => {
    setStagedEntry((prev) => {
      if (!prev) return null;
      const step = prev.item.is_loose_weighed ? 0.25 : 1;
      const minVal = prev.item.is_loose_weighed ? 0.25 : 1;
      const next = Math.max(minVal, Number((prev.qty + delta * step).toFixed(3)));
      return { ...prev, qty: next };
    });
  };

  const commitStagedToCart = () => {
    if (!stagedEntry) return;
    const { item, qty } = stagedEntry;
    const unitPrice = Number(item.selling_price);
    const tare = item.is_loose_weighed ? Number(item.default_tare_grams || 0) : 0;
    const netGrams = item.is_loose_weighed ? Math.round(qty * 1000) : 0;
    const grossGrams = item.is_loose_weighed ? netGrams + tare : 0;

    setCart((prev) => {
      const existing = prev.find((c) => c.sku === item.sku);
      if (existing) {
        const mergedQty = Number((Number(existing.qty) + qty).toFixed(3));
        return prev.map((c) =>
          c.sku === item.sku
            ? {
                ...c,
                qty: mergedQty,
                net_wt_g: item.is_loose_weighed ? Math.round(mergedQty * 1000) : 0,
                gross_wt_g: item.is_loose_weighed ? Math.round(mergedQty * 1000) + tare : 0,
                line_total: Number((mergedQty * unitPrice).toFixed(2)),
              }
            : c
        );
      }
      return [
        ...prev,
        {
          sku: item.sku,
          name: item.name,
          qty,
          uom: item.is_loose_weighed ? "kg" : item.pos_uom,
          unit_price: unitPrice,
          gst_pct: Number(item.gst_pct),
          gross_wt_g: grossGrams,
          tare_wt_g: tare,
          net_wt_g: netGrams,
          line_total: Number((qty * unitPrice).toFixed(2)),
        },
      ];
    });
    notify(
      "ok",
      `Added ${item.name} (${qty} ${item.is_loose_weighed ? "kg" : item.pos_uom}) to Cart! Press Enter ×2 to generate Estimate.`
    );
    setStagedEntry(null);
    setSearchQuery("");
    setDoubleEnterArmed(false);
    setTimeout(() => searchInputRef.current?.focus(), 40);
  };

  const loadEstimateAtCashier = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const ord = await apiFetch(
        `/api/pos/orders/scan/${encodeURIComponent(trimmed)}?outlet_code=${encodeURIComponent(
          activeOutlet
        )}&prefer_status=ESTIMATE_GENERATED`
      );
      setLoadedOrder(ord);
      setSelectedSlip(ord);
      setScanInput(ord.estimate_no);
      setSplitAmounts({
        cash: String(Number(ord.grand_total || 0).toFixed(2)),
        upi: "0",
        card: "0",
        coupon: "0",
      });
      notify(
        "ok",
        `Retrieved ${ord.estimate_no} (#${String(ord.estimate_no).slice(-4)}) — Press F5 to Complete Payment`
      );
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const addImpulseBagAtCashier = async () => {
    if (!loadedOrder) return;
    const updatedItems = [
      ...loadedOrder.items,
      {
        sku: "PKG-BAG-01",
        name: "Annavya Eco Carry Bag",
        qty: 1,
        uom: "pcs",
        unit_price: 10,
        gst_pct: 12,
        gross_wt_g: 0,
        tare_wt_g: 0,
        net_wt_g: 0,
        line_total: 10,
      },
    ];
    try {
      const res = await apiFetch(`/api/pos/orders/${loadedOrder.estimate_no}/cart`, {
        method: "PUT",
        body: JSON.stringify({ items: updatedItems }),
      });
      setLoadedOrder(res.order);
      setSelectedSlip(res.order);
      if (res.tamper_invalidated) {
        notify(
          "err",
          "ANTI-TAMPERING TRIGGERED: Cart changed after SMS OTP approval! Ad-hoc discount automatically invalidated."
        );
      } else {
        notify("ok", "Added Carry Bag to cart");
      }
      await loadData();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const applyPromoCode = async (code: string) => {
    if (!loadedOrder) return;
    try {
      const ord = await apiFetch(`/api/pos/orders/${loadedOrder.estimate_no}/apply-promo`, {
        method: "POST",
        body: JSON.stringify({ promo_code: code }),
      });
      setLoadedOrder(ord);
      setSelectedSlip(ord);
      notify("ok", `Applied promo ${code}`);
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const sendOtpRequest = async () => {
    if (!loadedOrder) return;
    try {
      const otp = await apiFetch("/api/pos/otp/request", {
        method: "POST",
        body: JSON.stringify({
          estimate_no: loadedOrder.estimate_no,
          category: otpCategory,
          beneficiary: otpBeneficiary,
          discount_pct: otpPct,
          reason: otpReason,
        }),
      });
      setPendingOtp(otp);
      notify("ok", `SMS OTP sent to ${otp.approver_name} (${otp.approver_mobile})`);
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const verifyOtpCode = async () => {
    if (!pendingOtp) return;
    try {
      const res = await apiFetch("/api/pos/otp/verify", {
        method: "POST",
        body: JSON.stringify({ otp_id: pendingOtp.id, otp_code: enteredOtp }),
      });
      setLoadedOrder(res.order);
      setSelectedSlip(res.order);
      setShowOtpModal(false);
      setPendingOtp(null);
      setEnteredOtp("");
      notify("ok", "SMS OTP Verified! Ad-hoc discount unlocked & applied.");
      await loadData();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const handleDrawerKick = async (reason = "Manual Cashier Drawer Kick [F8]") => {
    const cd = hwConfig?.cash_drawer;
    if (cd?.require_pin_manual_open && reason.includes("Manual")) {
      const pin = window.prompt("Manager PIN required to open Cash Drawer:");
      if (pin !== (cd.manual_open_pin || "2222")) {
        notify("err", "Invalid Manager PIN — Cash Drawer access denied!");
        return;
      }
    }
    try {
      const res = await kickCashDrawer({
        driver: hwConfig?.active_printer_driver || "Epson TM-T82III (ESC/POS 58mm)",
        pin: cd?.kick_pin || "Pin 2 (RJ11 via Printer)",
        outletCode: activeOutlet,
        actor: actorName,
        reason,
      });
      notify("ok", res.message);
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const collectPayment = async () => {
    if (!loadedOrder) return;
    const total = Number(loadedOrder.grand_total);
    let splits: any[] = [];
    if (payMode === "Split") {
      const candidates = [
        { mode: "Cash", amount: Number(splitAmounts.cash || 0), ref: "SPLIT-CASH" },
        { mode: "UPI", amount: Number(splitAmounts.upi || 0), ref: "SPLIT-UPI" },
        { mode: "Credit Card", amount: Number(splitAmounts.card || 0), ref: "SPLIT-CARD" },
        { mode: "Food Coupon", amount: Number(splitAmounts.coupon || 0), ref: "SPLIT-COUPON" },
      ].filter((s) => s.amount > 0);
      splits = candidates;
    } else {
      splits = [
        {
          mode: payMode,
          amount: total,
          ref: `${payMode.replace(/\s+/g, "_").toUpperCase()}-REF`,
        },
      ];
    }
    try {
      const paid = await apiFetch(`/api/pos/orders/${loadedOrder.estimate_no}/pay`, {
        method: "POST",
        body: JSON.stringify({
          payment_splits: splits,
          cashier_id: activeCounter?.cashier_id || actorName,
          cashier_name: activeCounter?.cashier_name || actorName,
          counter_id: activeCounter?.counter_id || "CNT-01",
          counter_name: activeCounter?.counter_name || "Mithai Counter 1",
          terminal_ip: activeCounter?.ip_address || "127.0.0.1",
        }),
      });
      setLoadedOrder(paid);
      setSelectedSlip(paid);
      broadcastToCfd({
        items: paid.items,
        docId: paid.invoice_no,
        isSettled: true,
        grandTotal: Number(paid.grand_total),
        paymentMode: payMode,
      });
      await loadData();

      // Simultaneously eject cash drawer AND print 40-column thermal invoice
      if (hwConfig?.cash_drawer?.enabled !== false) {
        handleDrawerKick(`Payment Settled (${paid.invoice_no} • ${payMode})`);
      }
      print40ColumnThermalSlip(paid, outletObj, hwConfig?.active_printer_driver);

      notify(
        "ok",
        `Tax Invoice ${paid.invoice_no} (#${String(paid.invoice_no).slice(-4)}) paid via ${payMode}! Cash Drawer ejected & 40-Col Invoice printed.`
      );
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const lookupDeliveryInvoice = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;
    setDeliveryAlert(null);
    try {
      const ord = await apiFetch(
        `/api/pos/orders/scan/${encodeURIComponent(trimmed)}?outlet_code=${encodeURIComponent(
          activeOutlet
        )}&prefer_status=PAID_PENDING_DELIVERY`
      );
      setDeliveryPreviewOrder(ord);
      setSelectedSlip(ord);
      setDeliveryBarcode(ord.invoice_no || ord.estimate_no);
      notify(
        "ok",
        `Found ${ord.invoice_no || ord.estimate_no} (${ord.status}) — Press F5 to Close Invoice & Handover!`
      );
    } catch (e: any) {
      setDeliveryPreviewOrder(null);
      setDeliveryAlert(e.message);
      notify("err", e.message);
    }
  };

  const scanAtDeliveryCounter = async (barcode: string, override = false) => {
    const target = (barcode || deliveryPreviewOrder?.invoice_no || "").trim();
    if (!target) return;
    setDeliveryAlert(null);
    try {
      const closed = await apiFetch("/api/pos/delivery/scan", {
        method: "POST",
        body: JSON.stringify({
          barcode: target,
          delivery_staff: actorName || "Delivery Counter",
          manager_override: override,
          outlet_code: activeOutlet,
        }),
      });
      setSelectedSlip(closed);
      setDeliveryPreviewOrder(closed);
      setDeliveryBarcode("");
      await loadData();
      notify("ok", `Invoice ${closed.invoice_no} closed, handed over & FEFO stock deducted!`);
    } catch (e: any) {
      setDeliveryAlert(e.message);
      notify("err", e.message);
    }
  };

  const filteredCatalog = itemsCatalog.filter((i) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (i.name || "").toLowerCase().includes(q) ||
      (i.sku || "").toLowerCase().includes(q) ||
      ((i as any).item_code || "").toLowerCase().includes(q) ||
      (i.sub_category || "").toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / POS_PAGE_SIZE));
  const currentPage = Math.min(posPage, totalPages);
  const pagedCatalog = filteredCatalog.slice(
    (currentPage - 1) * POS_PAGE_SIZE,
    currentPage * POS_PAGE_SIZE
  );

  // Global Keyboard Hotkeys (F1-F10, +/- for weight/qty, 1-9, Esc)
  useEffect(() => {
    if (hwConfig && hwConfig.enable_hotkeys === false) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isSearchFocused = target === searchInputRef.current;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (e.key === "Escape") {
        setScaleItem(null);
        setShowOtpModal(false);
        setStagedEntry(null);
        setDoubleEnterArmed(false);
        return;
      }

      // Function keys F1-F12 mapped cleanly
      if (e.key === "F1") {
        e.preventDefault();
        setCounterTab("estimate");
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      } else if (e.key === "F2") {
        e.preventDefault();
        setCounterTab("cashier");
        setPayMode("Cash");
        setTimeout(() => scanInputRef.current?.focus(), 50);
        return;
      } else if (e.key === "F3") {
        e.preventDefault();
        setCounterTab("cashier");
        setPayMode("UPI");
        return;
      } else if (e.key === "F4") {
        e.preventDefault();
        setCounterTab("cashier");
        setPayMode("Credit Card");
        return;
      } else if (e.key === "F5") {
        e.preventDefault();
        if (cart.length > 0) handleHoldCart();
        else if (heldCarts.length > 0) handleRecallCart(0);
        return;
      } else if (e.key === "F6") {
        e.preventDefault();
        generateEstimate();
        return;
      } else if (e.key === "F7") {
        e.preventDefault();
        launchCustomerDisplay();
        return;
      } else if (e.key === "F8") {
        e.preventDefault();
        setShowOtpModal(true);
        return;
      } else if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0 && confirm("Clear current cart?")) setCart([]);
        return;
      } else if (e.key === "F10") {
        e.preventDefault();
        if (counterTab === "cashier" && loadedOrder) collectPayment();
        else if (cart.length > 0) generateEstimate();
        return;
      } else if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
        return;
      } else if (e.key === "F12") {
        e.preventDefault();
        setCounterTab("eod");
        return;
      }

      // Estimate Counter keyboard weight/qty adjustment (+ / -) & quick keys
      if (counterTab === "estimate" && !scaleItem && !showOtpModal) {
        if ((e.key === "+" || e.key === "=" || e.code === "NumpadAdd") && (!isTyping || isSearchFocused || stagedEntry)) {
          if (stagedEntry) {
            e.preventDefault();
            adjustStagedQty(1);
            return;
          } else if (cart.length > 0 && !isTyping) {
            e.preventDefault();
            adjustCartQty(cart.length - 1, 1);
            return;
          }
        }
        if ((e.key === "-" || e.key === "_" || e.code === "NumpadSubtract") && (!isTyping || (isSearchFocused && searchQuery === "" && stagedEntry) || (!isTyping && stagedEntry))) {
          if (stagedEntry) {
            e.preventDefault();
            adjustStagedQty(-1);
            return;
          } else if (cart.length > 0 && !isTyping) {
            e.preventDefault();
            adjustCartQty(cart.length - 1, -1);
            return;
          }
        }
        if (!isTyping && e.key === "Enter" && !stagedEntry && cart.length > 0) {
          e.preventDefault();
          armOrTriggerDoubleEnterEstimate();
          return;
        }
        if (!isTyping && /^[1-9]$/.test(e.key)) {
          const idx = Number(e.key) - 1;
          if (pagedCatalog[idx]) {
            e.preventDefault();
            addItemToCart(pagedCatalog[idx]);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    counterTab,
    cart,
    stagedEntry,
    doubleEnterArmed,
    searchQuery,
    loadedOrder,
    deliveryBarcode,
    deliveryPreviewOrder,
    pagedCatalog,
    filteredCatalog,
    hwConfig,
    activeOutlet,
    selectedSlip,
    payMode,
    splitAmounts,
  ]);

  const unpaidEstimates = orders.filter((o) => o.status === "ESTIMATE_GENERATED");
  const pendingDeliveries = orders.filter((o) => o.status === "PAID_PENDING_DELIVERY");
  const closedOrders = orders.filter((o) => o.status === "DELIVERED_CLOSED");

  const today = new Date();
  const nearExpiryItems = shopStock.filter((b) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return days <= 2;
  });
  const lowStockItems = shopStock.filter((b) => Number(b.qty) <= 15);
  const bannerAlerts: LowStockAlertItem[] = [
    ...lowStockItems.map((b) => ({
      id: b.id,
      sku: b.sku,
      item_name: b.item_name,
      qty: Number(b.qty),
      uom: b.uom,
      expiry_date: b.expiry_date,
      kind: "LOW_STOCK" as const,
    })),
    ...nearExpiryItems
      .filter((b) => !lowStockItems.some((l) => l.id === b.id))
      .map((b) => ({
        id: b.id,
        sku: b.sku,
        item_name: b.item_name,
        qty: Number(b.qty),
        uom: b.uom,
        expiry_date: b.expiry_date,
        kind: "NEAR_EXPIRY" as const,
      })),
  ];

  return (
    <div className="space-y-4">
      {/* Top Hotkeys Command Bar */}
      <div className="bg-[#081F5C] text-white rounded-2xl p-2.5 shadow-lg border border-blue-900/40 select-none">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 custom-scroll">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {[
              { key: "F1", label: "Search / Scan", color: "bg-amber-400 text-slate-900", action: () => { setCounterTab("estimate"); setTimeout(() => searchInputRef.current?.focus(), 50); } },
              { key: "F2", label: "Cash Pay", color: "bg-emerald-500 text-white", action: () => { setCounterTab("cashier"); setPayMode("Cash"); setTimeout(() => scanInputRef.current?.focus(), 50); } },
              { key: "F3", label: "UPI QR Pay", color: "bg-blue-400 text-slate-900", action: () => { setCounterTab("cashier"); setPayMode("UPI"); } },
              { key: "F4", label: "Card EDC", color: "bg-indigo-400 text-slate-900", action: () => { setCounterTab("cashier"); setPayMode("Credit Card"); } },
              { key: "F5", label: `Hold/Recall (${heldCarts.length})`, color: "bg-purple-400 text-slate-900", action: () => { if (cart.length > 0) handleHoldCart(); else if (heldCarts.length > 0) handleRecallCart(0); } },
              { key: "F6", label: "Estimate", color: "bg-sky-400 text-slate-900", action: () => generateEstimate() },
              { key: "F7", label: "Dual Screen", color: "bg-cyan-400 text-slate-900", action: () => launchCustomerDisplay() },
              { key: "F8", label: "OTP Discount", color: "bg-rose-400 text-slate-900", action: () => setShowOtpModal(true) },
              { key: "F9", label: "Clear Cart", color: "bg-red-500 text-white", action: () => { if (cart.length > 0 && confirm("Clear current cart?")) setCart([]); } },
              { key: "F10", label: "Settle & Print", color: "bg-teal-400 text-slate-900", action: () => { if (counterTab === "cashier" && loadedOrder) collectPayment(); else if (cart.length > 0) generateEstimate(); } },
              { key: "F11", label: isFullscreen ? "Exit Full" : "Fullscreen", color: "bg-slate-300 text-slate-900", action: toggleFullscreen },
              { key: "F12", label: "EoD Handover", color: "bg-orange-400 text-slate-900", action: () => setCounterTab("eod") },
            ].map((hk) => (
              <button
                key={hk.key}
                type="button"
                onClick={hk.action}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition border border-white/10 shrink-0"
              >
                <kbd className={`px-1.5 py-0.5 rounded font-mono font-black text-[10px] shadow-sm ${hk.color}`}>
                  {hk.key}
                </kbd>
                <span>{hk.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-blue-200">Bikanervala POS v2.6</span>
          </div>
        </div>
      </div>

      {/* Terminal Workstation Counter & Admin Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Counter Details Info Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {activeCounter?.counter_name || "Mithai Counter 1"}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px]">
                {activeCounter?.counter_id || "CNT-01"}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Counter</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Cashier: <b className="text-slate-700 dark:text-slate-300">{activeCounter?.cashier_name || actorName}</b> ({activeCounter?.cashier_id || "CSH-001"})</span>
              <span>•</span>
              <span className="font-mono">IP: <b>{activeCounter?.ip_address || "127.0.0.1"}</b></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Admin Launchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={launchCustomerDisplay}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow"
          >
            <Monitor className="w-4 h-4 text-cyan-200" />
            <span>🖥️ Dual Screen (CFD)</span>
          </button>

          <a
            href={
              typeof window !== "undefined" &&
              (window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1" ||
                window.location.hostname.startsWith("192.168.") ||
                window.location.hostname.startsWith("10."))
                ? `http://${window.location.hostname}:8289`
                : "/retail-pos"
            }
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
          >
            <span>🚀 Standalone Retail POS</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
          </a>

          <button
            type="button"
            onClick={() => setShowHardwareModal(true)}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 border border-purple-200 dark:border-purple-800"
          >
            <Printer className="w-3.5 h-3.5 text-purple-600" />
            <span>⚙️ Printer Config (Admin)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCounterModal(true)}
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
          >
            <Store className="w-3.5 h-3.5 text-blue-600" />
            <span>🏪 Cash Counters (Admin)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReportsModal(true)}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-200 dark:border-amber-800"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>📊 Retail Reports (Admin)</span>
          </button>
        </div>
      </div>

      {/* Persistent Top Low Stock Notification Bar (Hide/Close reappears in 15 min) */}
      <LowStockBanner
        outletCode={activeOutlet}
        alerts={bannerAlerts}
        title="Shop Low Stock & Shelf Alert"
        onViewStock={() => setCounterTab("stock")}
      />

      {toast && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-sm ${
            toast.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 3-Counter + Stock + EoD Pipeline Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCounterTab("estimate")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              counterTab === "estimate"
                ? "bg-annavya-navy text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>1. Estimate ({unpaidEstimates.length})</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F1</kbd>
          </button>
          <span className="text-slate-300 font-bold">→</span>
          <button
            onClick={() => setCounterTab("cashier")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              counterTab === "cashier"
                ? "bg-annavya-royal text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>2. Cash ({unpaidEstimates.length})</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F2</kbd>
          </button>
          <span className="text-slate-300 font-bold">→</span>
          <button
            onClick={() => setCounterTab("delivery")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              counterTab === "delivery"
                ? "bg-emerald-700 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>3. Delivery ({pendingDeliveries.length})</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">F3</kbd>
          </button>

          <button
            onClick={() => setCounterTab("stock")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              counterTab === "stock"
                ? "bg-amber-600 text-white shadow"
                : "bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100"
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Shop Stock ({nearExpiryItems.length + lowStockItems.length})</span>
          </button>

          <button
            onClick={() => setCounterTab("eod")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              counterTab === "eod"
                ? "bg-indigo-700 text-white shadow"
                : "bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>EoD Reports</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/10 text-[10px] font-mono">F10</kbd>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => handleDrawerKick("Manual Button [F8]")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-amber-300 font-bold hover:bg-slate-800"
          >
            <ArchiveRestore className="w-3.5 h-3.5" />
            <span>Open Drawer</span>
            <kbd className="px-1 rounded bg-white/15 text-[10px] font-mono">F8</kbd>
          </button>
          <button
            onClick={() => setTouchMode(!touchMode)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border ${
              touchMode
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            {touchMode ? "Touch UI: ON" : "Touch UI: OFF"}
          </button>
          <button
            onClick={() => setBillingMode(billingMode === "3_COUNTER" ? "DIRECT" : "3_COUNTER")}
            className={`px-2.5 py-1.5 rounded-lg font-semibold border ${
              billingMode === "3_COUNTER"
                ? "bg-annavya-ice border-annavya-sky text-annavya-royal"
                : "bg-amber-50 border-amber-300 text-amber-800"
            }`}
          >
            {billingMode === "3_COUNTER" ? "3-Counter" : "Direct"}
          </button>
        </div>
      </div>

      {/* TAB 4: CASHIER SHOP STOCK & ALERTS VIEW */}
      {counterTab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Live Shop Item Alerts ({activeOutlet})
              </h3>
              <div className="space-y-2">
                {nearExpiryItems.map((b) => (
                  <div key={`exp-${b.id}`} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <div className="font-bold text-rose-900">NEAR EXPIRY: {b.item_name}</div>
                    <div className="text-[11px] text-rose-700">
                      Batch {b.batch_no} • {b.qty} {b.uom} • Exp: {b.expiry_date}
                    </div>
                  </div>
                ))}
                {lowStockItems.map((b) => (
                  <div key={`low-${b.id}`} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <div className="font-bold text-amber-900">LOW STOCK: {b.item_name}</div>
                    <div className="text-[11px] text-amber-700">
                      Remaining: {b.qty} {b.uom} • Inform Shop Manager for indent
                    </div>
                  </div>
                ))}
                {nearExpiryItems.length === 0 && lowStockItems.length === 0 && (
                  <div className="text-xs text-slate-400 py-6 text-center">All shop items healthy!</div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-annavya-navy mb-3">
              Outlet Shelf & Counter Stock Availability (STR-{activeOutlet}-BACK)
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-2">Item Name</th>
                  <th>Batch</th>
                  <th>Qty Available</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shopStock.map((b) => {
                  const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
                  return (
                    <tr key={b.id}>
                      <td className="py-2.5 font-semibold">{b.item_name}</td>
                      <td className="font-mono text-[11px]">{b.batch_no}</td>
                      <td className="font-bold">{b.qty} {b.uom}</td>
                      <td>{b.expiry_date}</td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            days <= 1
                              ? "bg-rose-100 text-rose-800"
                              : days <= 2
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {days <= 1 ? "EXPIRES 24H" : days <= 2 ? "EXPIRES 48H" : `FRESH (${days}d)`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CASHIER EoD REPORTS & ACCOUNTS RECONCILIATION */}
      {counterTab === "eod" && (
        <CashierEodReport
          outletCode={activeOutlet}
          outlet={outletObj}
          actorName={actorName}
        />
      )}

      {counterTab !== "stock" && counterTab !== "eod" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Counter Workspace */}
          <div className="xl:col-span-8 space-y-5">
            {/* COUNTER 1: ESTIMATE COUNTER */}
            {counterTab === "estimate" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  {/* Customer Information Capture (Customer Number & Optional Name before starting order) */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#081F5C]">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>Customer Profile & Receipt Routing (Optional)</span>
                      </div>
                      {customerMobile ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attached to Order
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          Ask customer mobile before estimate for SMS bill
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="tel"
                          value={customerMobile}
                          onChange={(e) => setCustomerMobile(e.target.value)}
                          placeholder="Customer Mobile (e.g. 98100 12345)"
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Customer Name (Optional, e.g. Rakesh Kumar)"
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-annavya-navy">
                        Item Code / Touch Entry — [1–9] or SKU Search
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Enter: Select • +/-: Wt/Qty • F5: Add Cart • Enter×2: Estimate
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPosPage(1);
                          setDoubleEnterArmed(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const q = searchQuery.trim().toLowerCase();
                            if (q && filteredCatalog.length > 0) {
                              const exact =
                                filteredCatalog.find(
                                  (i) =>
                                    i.sku.toLowerCase() === q ||
                                    ((i as any).item_code || "").toLowerCase() === q
                                ) || filteredCatalog[0];
                              setStagedEntry({
                                item: exact,
                                qty: exact.is_loose_weighed ? 0.5 : 1,
                              });
                              setSearchQuery("");
                              setDoubleEnterArmed(false);
                            } else if (!q && !stagedEntry && cart.length > 0) {
                              armOrTriggerDoubleEnterEstimate();
                            }
                          } else if (
                            (e.key === "+" || e.key === "=" || e.key === "-") &&
                            stagedEntry &&
                            !searchQuery.trim()
                          ) {
                            e.preventDefault();
                            adjustStagedQty(e.key === "-" ? -1 : 1);
                          }
                        }}
                        placeholder="Search by Item Code / SKU (e.g. FG-KAJU-01, FG-BESAN) or Name... [F1]"
                        className="border-2 border-annavya-royal/40 focus:border-annavya-royal rounded-xl px-3 py-2 text-xs font-mono flex-1 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Staged Item Keyboard Adjuster (Enter -> +/- -> F5 Add to Cart) */}
                  {stagedEntry && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#EBF4FF] to-amber-50 border-2 border-annavya-royal shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-annavya-navy text-white">
                            STAGED: {stagedEntry.item.sku}
                          </span>
                          <div className="text-sm font-extrabold text-annavya-navy mt-1">
                            {stagedEntry.item.name}
                          </div>
                          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>
                              {formatINR(stagedEntry.item.selling_price)}/{stagedEntry.item.is_loose_weighed ? "kg" : stagedEntry.item.pos_uom} • Est:{" "}
                              <b>{formatINR(stagedEntry.qty * Number(stagedEntry.item.selling_price))}</b>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] border border-emerald-200">
                              Shelf Stock: {getStockLeft(stagedEntry.item.sku)} {stagedEntry.item.pos_uom}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => adjustStagedQty(-1)}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-rose-50"
                            title="Press - key"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <div className="min-w-[82px] text-center font-mono font-extrabold text-sm px-2 py-1.5 rounded-xl bg-white border border-annavya-royal">
                            {stagedEntry.item.is_loose_weighed
                              ? `${stagedEntry.qty.toFixed(2)} kg`
                              : `${stagedEntry.qty} ${stagedEntry.item.pos_uom}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => adjustStagedQty(1)}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-emerald-50"
                            title="Press + key"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {stagedEntry.item.is_loose_weighed ? (
                          <div className="flex gap-1.5">
                            {[0.25, 0.5, 1, 2].map((wt) => (
                              <button
                                key={wt}
                                type="button"
                                onClick={() => setStagedEntry({ ...stagedEntry, qty: wt })}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold hover:border-annavya-royal"
                              >
                                {wt >= 1 ? `${wt} kg` : `${wt * 1000} g`}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600">
                            Press <kbd className="px-1 rounded bg-white border font-mono">+</kbd> /{" "}
                            <kbd className="px-1 rounded bg-white border font-mono">-</kbd> to adjust qty
                          </span>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setStagedEntry(null)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-white"
                          >
                            Cancel (Esc)
                          </button>
                          <button
                            type="button"
                            onClick={commitStagedToCart}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                          >
                            <span>Add to Cart</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">F5</kbd>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pagination Bar Top (Pages 1-5, Prev, Next) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span className="text-annavya-navy font-extrabold">Page {currentPage} of {totalPages}</span>
                      <span className="text-slate-400 font-normal">({filteredCatalog.length} items • 10/page)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setPosPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                        }
                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => setPosPage(pNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                              currentPage === pNum
                                ? "bg-annavya-navy text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {pNum}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPosPage((p) => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {pagedCatalog.map((it, idx) => {
                      const stockLeft = getStockLeft(it.sku);
                      return (
                        <button
                          key={it.sku}
                          onClick={() => addItemToCart(it)}
                          className={`text-left rounded-2xl border transition group ${
                            searchQuery.trim() && idx === 0
                              ? "border-2 border-annavya-royal bg-annavya-ice/50 ring-2 ring-annavya-sky/40"
                              : "border-slate-200 hover:border-annavya-royal hover:bg-annavya-ice/40"
                          } active:scale-[0.98] ${
                            touchMode ? "p-4 min-h-[104px]" : "p-3"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {it.sku}
                            </span>
                            <div className="flex items-center gap-1">
                              {idx < 9 && (
                                <kbd className="px-1.5 py-0.5 rounded bg-annavya-navy text-white text-[10px] font-mono font-bold">
                                  {idx + 1}
                                </kbd>
                              )}
                              {it.is_loose_weighed && <Scale className="w-3.5 h-3.5 text-amber-600" />}
                            </div>
                          </div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 mt-1.5 group-hover:text-annavya-royal">
                            {it.name}
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-xs">
                            <span className="font-extrabold text-annavya-navy">
                              {formatINR(it.selling_price)}/{it.pos_uom}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                                stockLeft <= 0
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : stockLeft <= 10
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              Left: <b>{stockLeft} {it.pos_uom}</b>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pagination Bar Bottom */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                      <span>Jump to page:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pNum) => (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => setPosPage(pNum)}
                            className={`w-6 h-6 rounded-md text-[11px] font-bold ${
                              currentPage === pNum
                                ? "bg-annavya-navy text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {pNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-annavya-navy mb-3">
                      Active Estimate Cart
                    </h3>
                    {cart.length === 0 ? (
                      <div className="text-xs text-slate-400 py-10 text-center bg-slate-50 rounded-xl">
                        Tap items or press keys 1–9 to add
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {cart.map((c, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{c.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {c.qty} {c.uom} × {formatINR(c.unit_price)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => adjustCartQty(idx, -1)}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => adjustCartQty(idx, 1)}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="font-bold w-14 text-right">{formatINR(c.line_total)}</span>
                              <button
                                onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between text-sm font-bold text-annavya-navy">
                      <span>Estimated Subtotal</span>
                      <span>{formatINR(cart.reduce((s, c) => s + Number(c.line_total), 0))}</span>
                    </div>
                    {cart.length > 0 && (
                      <div
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between ${
                          doubleEnterArmed
                            ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <CornerDownLeft className="w-3.5 h-3.5" />
                          {doubleEnterArmed
                            ? "1/2 ENTER pressed — Press ENTER again now!"
                            : "Shortcut: Press ENTER twice (2×) for Estimate"}
                        </span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono">Enter ×2</kbd>
                      </div>
                    )}
                    <button
                      disabled={cart.length === 0}
                      onClick={generateEstimate}
                      className={`w-full rounded-xl bg-annavya-navy text-white font-bold text-xs hover:bg-annavya-royal disabled:opacity-40 transition flex items-center justify-center gap-2 ${
                        touchMode ? "py-3.5 text-sm" : "py-2.5"
                      }`}
                    >
                      <span>Generate 40-Col Estimate Slip</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">Enter ×2</kbd>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* COUNTER 2: CASH COUNTER */}
            {counterTab === "cashier" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex-1 relative">
                      <ScanBarcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        ref={scanInputRef}
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadEstimateAtCashier(scanInput)}
                        placeholder="Scan Estimate OR Type Last 4 Digits [F4] (e.g. 0041)..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <button
                      onClick={() => loadEstimateAtCashier(scanInput)}
                      className="px-4 py-2 rounded-xl bg-annavya-royal text-white text-xs font-bold hover:bg-annavya-navy"
                    >
                      Retrieve Order
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-[11px] font-semibold text-slate-500">Waiting Estimates:</span>
                    {unpaidEstimates.map((u) => (
                      <button
                        key={u.estimate_no}
                        onClick={() => loadEstimateAtCashier(u.estimate_no)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] font-bold hover:bg-amber-100"
                      >
                        {u.estimate_no} ({formatINR(u.grand_total)})
                      </button>
                    ))}
                  </div>
                </div>

                {loadedOrder && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-annavya-royal">
                          {loadedOrder.estimate_no}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          Cashier Settlement & Discount Controls
                        </h4>
                      </div>
                      {loadedOrder.status === "ESTIMATE_GENERATED" && (
                        <button
                          onClick={addImpulseBagAtCashier}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Carry Bag (₹10)
                          <kbd className="px-1 rounded bg-slate-300 text-[10px] font-mono">F7</kbd>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {(loadedOrder.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-slate-50">
                          <span>
                            <b>{it.name}</b> ({it.qty} {it.uom})
                          </span>
                          <span className="font-semibold">{formatINR(it.line_total)}</span>
                        </div>
                      ))}
                    </div>

                    {loadedOrder.status === "ESTIMATE_GENERATED" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                            <Tag className="w-3.5 h-3.5 text-annavya-royal" />
                            Structured Promos
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {promos
                              .filter((p) => p.active)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => applyPromoCode(p.code)}
                                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold hover:border-annavya-royal"
                                >
                                  {p.code}
                                </button>
                              ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-annavya-ice/60 border border-annavya-sky/40 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-annavya-navy">
                              <Smartphone className="w-3.5 h-3.5 text-annavya-royal" />
                              Ad-Hoc Discount (SMS OTP)
                            </div>
                            <div className="text-[11px] text-slate-600">VIP / Owner / Employee / Vendor</div>
                          </div>
                          <button
                            onClick={() => setShowOtpModal(true)}
                            className="px-3 py-2 rounded-xl bg-annavya-navy text-white text-xs font-bold hover:bg-annavya-royal flex items-center gap-1"
                          >
                            <span>OTP</span>
                            <kbd className="px-1 rounded bg-white/20 text-[10px] font-mono">F6</kbd>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span>Subtotal: <b>{formatINR(loadedOrder.subtotal)}</b></span>
                        <span className="text-emerald-700">
                          Discount ({loadedOrder.discount_category || "None"}):{" "}
                          <b>-{formatINR(loadedOrder.discount_amount)}</b>
                        </span>
                        <span>GST: <b>{formatINR(Number(loadedOrder.cgst) + Number(loadedOrder.sgst))}</b></span>
                      </div>
                      <div className="flex justify-between items-center text-base font-extrabold text-annavya-navy border-t border-slate-200 pt-2">
                        <span>PAYABLE GRAND TOTAL</span>
                        <span>{formatINR(loadedOrder.grand_total)}</span>
                      </div>

                      {loadedOrder.status === "ESTIMATE_GENERATED" && (
                        <div className="space-y-3 pt-1">
                          <div className="flex flex-wrap gap-2">
                            {(["UPI", "Cash", "Credit Card", "Food Coupon", "Split"] as const).map((m) => (
                              <button
                                key={m}
                                onClick={() => setPayMode(m)}
                                className={`rounded-xl text-xs font-bold border ${
                                  touchMode ? "px-4 py-2.5" : "px-3 py-1.5"
                                } ${
                                  payMode === m
                                    ? "bg-annavya-navy text-white border-annavya-navy"
                                    : "bg-white text-slate-700 border-slate-200"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                          {payMode === "UPI" && (
                            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-[10px]">
                                    UPI
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-purple-950">Dynamic NPCI QR Pay</div>
                                    <div className="text-[10px] text-purple-700 font-mono">bikanervala@icici</div>
                                  </div>
                                </div>
                                <span className="font-mono font-black text-sm text-purple-900">
                                  {formatINR(loadedOrder.grand_total)}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-purple-100 shadow-sm">
                                <div className="w-14 h-14 bg-slate-900 rounded-lg p-1.5 flex flex-col justify-between flex-shrink-0 shadow-inner">
                                  <div className="flex justify-between">
                                    <div className="w-3 h-3 bg-white rounded-sm border-2 border-slate-900 flex items-center justify-center">
                                      <div className="w-1 h-1 bg-slate-900" />
                                    </div>
                                    <div className="w-3 h-3 bg-white rounded-sm border-2 border-slate-900 flex items-center justify-center">
                                      <div className="w-1 h-1 bg-slate-900" />
                                    </div>
                                  </div>
                                  <div className="flex justify-center gap-0.5">
                                    <div className="w-1 h-1 bg-white" />
                                    <div className="w-1 h-1 bg-white" />
                                  </div>
                                  <div className="flex justify-between">
                                    <div className="w-3 h-3 bg-white rounded-sm border-2 border-slate-900 flex items-center justify-center">
                                      <div className="w-1 h-1 bg-slate-900" />
                                    </div>
                                    <div className="w-3 h-3 bg-purple-400 rounded-sm flex items-center justify-center text-[7px] font-black text-slate-900">
                                      ₹
                                    </div>
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="text-[11px] font-bold text-slate-800">
                                    Scan with GPay, PhonePe, Paytm or BHIM
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono truncate" title={`upi://pay?pa=bikanervala@icici&pn=Bikanervala&am=${loadedOrder.grand_total}&tn=INV-${loadedOrder.invoice_no}`}>
                                    upi://pay?pa=bikanervala@icici&am={loadedOrder.grand_total}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        if ("speechSynthesis" in window) {
                                          const utterance = new SpeechSynthesisUtterance(`Paytm Soundbox par ${Math.round(loadedOrder.grand_total)} rupaye prapt hue.`);
                                          utterance.lang = "hi-IN";
                                          window.speechSynthesis.speak(utterance);
                                        }
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-extrabold flex items-center gap-1 transition"
                                  >
                                    <span>🔊 Test Soundbox Voice Announcement</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {payMode === "Credit Card" && (
                            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-blue-700" />
                                  <span className="font-extrabold text-blue-950">
                                    EDC Machine • PineLabs Plutus Cloud
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                  Connected (TID: 88412)
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {["RuPay Debit / Credit", "Visa / Mastercard", "Amex Corporate"].map((cardType, idx) => (
                                  <div key={cardType} className={`p-1.5 rounded-xl border text-center font-bold text-[10px] ${idx === 0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}>
                                    {cardType}
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                                <span>Ref: PLUTUS-POS-LAN-8082</span>
                                <span className="text-emerald-700 font-bold">Ready for Tap / Dip / Swipe</span>
                              </div>
                            </div>
                          )}

                          {payMode === "Cash" && (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <input
                                  type="number"
                                  value={cashTendered}
                                  onChange={(e) => setCashTendered(e.target.value)}
                                  placeholder="Cash tendered (₹)"
                                  className="border border-slate-200 rounded-lg px-3 py-2 w-40"
                                />
                                {[500, 1000, 2000, 5000].map((note) => (
                                  <button
                                    key={note}
                                    type="button"
                                    onClick={() => setCashTendered(String(note))}
                                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] font-bold"
                                  >
                                    ₹{note}
                                  </button>
                                ))}
                                {Number(cashTendered) > Number(loadedOrder.grand_total) && (
                                  <span className="font-bold text-emerald-700">
                                    Change Due: {formatINR(Number(cashTendered) - Number(loadedOrder.grand_total))}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {payMode === "Food Coupon" && (
                            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-extrabold text-amber-950">
                                  Sodexo / Pluxee / Edenred Meal Voucher
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  100% Food Eligible
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Meal Card No (e.g. 6071 **** 8821)"
                                  defaultValue="6071 **** **** 8821"
                                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-mono text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="Approval Code (e.g. PLX-9941)"
                                  defaultValue="PLX-9941"
                                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-mono text-[11px]"
                                />
                              </div>
                              <div className="text-[10px] text-amber-900">
                                FSSAI compliant: Meal vouchers applied strictly to edible sweets & restaurant items.
                              </div>
                            </div>
                          )}
                          {payMode === "Split" && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500">Cash (₹)</label>
                                <input
                                  type="number"
                                  value={splitAmounts.cash}
                                  onChange={(e) =>
                                    setSplitAmounts({ ...splitAmounts, cash: e.target.value })
                                  }
                                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500">UPI (₹)</label>
                                <input
                                  type="number"
                                  value={splitAmounts.upi}
                                  onChange={(e) =>
                                    setSplitAmounts({ ...splitAmounts, upi: e.target.value })
                                  }
                                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500">Credit Card (₹)</label>
                                <input
                                  type="number"
                                  value={splitAmounts.card}
                                  onChange={(e) =>
                                    setSplitAmounts({ ...splitAmounts, card: e.target.value })
                                  }
                                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500">Food Coupon (₹)</label>
                                <input
                                  type="number"
                                  value={splitAmounts.coupon}
                                  onChange={(e) =>
                                    setSplitAmounts({ ...splitAmounts, coupon: e.target.value })
                                  }
                                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5"
                                />
                              </div>
                            </div>
                          )}
                          <button
                            onClick={collectPayment}
                            className={`w-full rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow flex items-center justify-center gap-2 ${
                              touchMode ? "py-3.5 text-sm" : "py-2.5"
                            }`}
                          >
                            <span>Complete Payment • Eject Drawer & Print 40-Col Invoice</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">F5</kbd>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COUNTER 3: DELIVERY COUNTER */}
            {counterTab === "delivery" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-annavya-navy">
                    Delivery Counter Verification & Invoice Closure
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 relative min-w-[220px]">
                      <ScanBarcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        ref={deliveryInputRef}
                        value={deliveryBarcode}
                        onChange={(e) => setDeliveryBarcode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && lookupDeliveryInvoice(deliveryBarcode)}
                        placeholder="Scan Invoice Barcode OR Enter Last 4 Digits [F4] (e.g. 0039)..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <button
                      onClick={() => lookupDeliveryInvoice(deliveryBarcode)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                    >
                      Find (Enter)
                    </button>
                    <button
                      onClick={() => scanAtDeliveryCounter(deliveryBarcode)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5"
                    >
                      <span>Close & Handover</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">F5</kbd>
                    </button>
                  </div>

                  {deliveryPreviewOrder && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-mono font-extrabold text-emerald-900">
                          {deliveryPreviewOrder.invoice_no || deliveryPreviewOrder.estimate_no} •{" "}
                          <span className="uppercase">{deliveryPreviewOrder.status}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          {(deliveryPreviewOrder.items || [])
                            .map((i: any) => `${i.name} (${i.qty} ${i.uom})`)
                            .join(", ")}{" "}
                          • <b>{formatINR(deliveryPreviewOrder.grand_total)}</b>
                        </div>
                      </div>
                      {deliveryPreviewOrder.status === "PAID_PENDING_DELIVERY" && (
                        <button
                          onClick={() =>
                            scanAtDeliveryCounter(deliveryPreviewOrder.invoice_no)
                          }
                          className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5"
                        >
                          <span>Confirm Handover</span>
                          <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">F5</kbd>
                        </button>
                      )}
                    </div>
                  )}

                  {deliveryAlert && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center justify-between">
                      <span className="font-bold">{deliveryAlert}</span>
                      {deliveryAlert.includes("ALREADY DELIVERED") && (
                        <button
                          onClick={() => scanAtDeliveryCounter(deliveryBarcode, true)}
                          className="px-2.5 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-bold"
                        >
                          Manager Override
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
                      Paid Pending Delivery Queue ({pendingDeliveries.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingDeliveries.map((o) => (
                        <div
                          key={o.id}
                          className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-emerald-900">{o.invoice_no}</div>
                            <div className="text-[11px] text-slate-600">
                              {(o.items || []).map((i: any) => `${i.name} (${i.qty}${i.uom})`).join(", ")}
                            </div>
                          </div>
                          <button
                            onClick={() => scanAtDeliveryCounter(o.invoice_no)}
                            className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            Pack & Close
                          </button>
                        </div>
                      ))}
                      {pendingDeliveries.length === 0 && (
                        <div className="text-xs text-slate-400 py-6 text-center">No orders pending handover</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Recently Closed (Duplicate Protection Test)
                    </h4>
                    <div className="space-y-2">
                      {closedOrders.slice(0, 5).map((o) => (
                        <div
                          key={o.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-800">{o.invoice_no}</div>
                            <div className="text-[11px] text-slate-500">
                              Delivered by {o.delivery_staff} • {formatINR(o.grand_total)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setDeliveryBarcode(o.invoice_no);
                              scanAtDeliveryCounter(o.invoice_no);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-rose-100 hover:text-rose-800 text-[11px] font-semibold"
                          >
                            Re-Scan Test
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Live 40-Col Thermal Printer Preview */}
          <div className="xl:col-span-4 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Printer className="w-3.5 h-3.5 text-annavya-royal" />
                {hwConfig?.active_printer_driver || "Epson TM-T82III (ESC/POS 58mm)"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                RJ11 Ready
              </span>
            </div>
            {selectedSlip ? (
              <ThermalSlip order={selectedSlip} outlet={outletObj} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                Generate an Estimate or select an Order to preview the live 40-Column Thermal Slip & Code128 Barcode
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotkey Cheat-Sheet Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-annavya-navy">
          <Keyboard className="w-4 h-4 text-annavya-royal" />
          POS Hotkeys:
        </div>
        <div className="flex flex-wrap gap-2 text-slate-600">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F1</kbd> Estimate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F2</kbd> Cash</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F3</kbd> Delivery</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F4</kbd> Scan/Search</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">+ / -</kbd> Wt/Qty</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F5</kbd> Cart/Pay/Close</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">Enter×2</kbd> Estimate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F8</kbd> Drawer</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F9</kbd> 40-Col Print</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold">F10</kbd> EoD Report</span>
        </div>
      </div>

      {/* Electronic Weighing Scale Modal with Touch Weight Presets */}
      {scaleItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-annavya-navy font-bold text-sm">
              <Scale className="w-5 h-5 text-amber-600" />
              {hwConfig?.weighing_scale?.driver || "Essae Weighing Scale (RS232/USB)"}
            </div>
            <div className="bg-slate-900 text-emerald-400 font-mono rounded-xl p-4 text-center">
              <div className="text-xs text-slate-400">{scaleItem.name}</div>
              <div className="text-3xl font-bold mt-1">
                {Math.max(0, grossWeightGrams - Number(scaleItem.default_tare_grams)).toFixed(0)} g
              </div>
              <div className="text-[11px] text-amber-300 mt-1">
                Gross: {grossWeightGrams}g − Box Tare: {scaleItem.default_tare_grams}g
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-700">1-Tap Touch Weight Presets (Net):</div>
              <div className="grid grid-cols-4 gap-2">
                {[250, 500, 1000, 2000].map((netG) => {
                  const gross = netG + Number(scaleItem.default_tare_grams || 0);
                  return (
                    <button
                      key={netG}
                      onClick={() => confirmScaleWeight(gross)}
                      className="py-3 rounded-xl bg-annavya-ice hover:bg-annavya-royal hover:text-white text-annavya-navy font-bold text-xs transition"
                    >
                      {netG >= 1000 ? `${netG / 1000} kg` : `${netG} g`}
                    </button>
                  );
                })}
              </div>
              <label className="font-semibold text-slate-700 block pt-2">
                Fine-Tune Gross Weight (grams):
              </label>
              <input
                type="range"
                min={200}
                max={5000}
                step={50}
                value={grossWeightGrams}
                onChange={(e) => setGrossWeightGrams(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setScaleItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={() => confirmScaleWeight()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-annavya-navy text-white hover:bg-annavya-royal"
              >
                Capture Net Weight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS OTP Ad-Hoc Discount Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-annavya-navy font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-annavya-royal" />
              SMS OTP Ad-Hoc Discount Governance
            </div>
            {!pendingOtp ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Beneficiary Category</label>
                  <select
                    value={otpCategory}
                    onChange={(e) => setOtpCategory(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="VIP">VIP (Max 20% • Shop Manager)</option>
                    <option value="Owner">Owner / Director (Up to 100%)</option>
                    <option value="Employee">Employee (Monthly Cap)</option>
                    <option value="Vendor">Vendor Goodwill / Ledger</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Beneficiary Name / Emp ID</label>
                  <input
                    value={otpBeneficiary}
                    onChange={(e) => setOtpBeneficiary(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Discount Percentage (%)</label>
                  <input
                    type="number"
                    value={otpPct}
                    onChange={(e) => setOtpPct(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Reason / Reference Note</label>
                  <input
                    value={otpReason}
                    onChange={(e) => setOtpReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowOtpModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendOtpRequest}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-annavya-royal text-white"
                  >
                    Send 6-Digit SMS OTP
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="font-bold text-emerald-900">
                    Simulated Approver SMS Delivered ({pendingOtp.approver_mobile}):
                  </div>
                  <div className="font-mono text-[11px] text-emerald-800 mt-1">
                    "{pendingOtp.sms_message}"
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Enter 6-Digit OTP from Approver (3 attempts max):
                  </label>
                  <input
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-base tracking-widest text-center"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setPendingOtp(null);
                      setShowOtpModal(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                  >
                    Close
                  </button>
                  <button
                    onClick={verifyOtpCode}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                  >
                    Verify & Unlock Discount
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Hardware & Printer Configuration Modal */}
      <AdminPosHardwareModal
        isOpen={showHardwareModal}
        onClose={() => setShowHardwareModal(false)}
        activeOutlet={activeOutlet}
        outletName={outletObj?.trade_name}
        actorName={actorName}
      />

      {/* Admin Cash Counters Setup & Terminal Binding Modal */}
      <AdminCashCounterModal
        isOpen={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        activeOutlet={activeOutlet}
        activeCounter={activeCounter}
        onSelectCounter={(cnt) => {
          setActiveCounter(cnt);
          localStorage.setItem("annavya_pos_active_counter", JSON.stringify(cnt));
        }}
      />

      {/* Admin Retail BI Reports Modal */}
      <AdminRetailReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        activeOutlet={activeOutlet}
        outletName={outletObj?.trade_name}
      />
    </div>
  );
};
