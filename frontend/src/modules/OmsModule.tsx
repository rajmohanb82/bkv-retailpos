import React, { useEffect, useState } from "react";
import {
  Gift,
  Lock,
  Factory,
  CreditCard,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  Clock,
  Check,
  XCircle,
  RefreshCw,
  Sparkles,
  Search,
  Settings,
  Phone,
  Radio,
  Volume2,
  AlertTriangle,
  X,
  ExternalLink,
  MessageSquare,
  Share2,
  Mail,
  Building2,
  CheckCircle,
  Printer,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Trash2,
  Calendar,
  CalendarDays,
  FileText,
  DollarSign,
  Download,
  Eye,
  CheckCheck,
  Banknote,
  QrCode,
  FileCheck2,
  ShoppingBag,
  Copy,
  ShieldCheck,
  Key,
  Zap,
  Wifi,
  Globe,
  Sliders,
  Bell,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { AggregatorOrder } from "../types";
import { audioAlert } from "../utils/audioAlert";
import { BarcodeSvg } from "../components/BarcodeSvg";

interface OmsModuleProps {
  activeOutlet?: string;
  initialTab?: "aggregators" | "bulk" | "config";
}

interface OmsLineItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  uom: string;
  unit_rate: number;
  line_total: number;
}

const AVAILABLE_HAMPER_ITEMS = [
  { sku: "FG-KAJU-01", name: "Royal Silver-Leaf Kaju Katli (250g Box)", rate: 295, uom: "boxes" },
  { sku: "FG-BESAN-01", name: "Desi Ghee Besan Laddu (250g Box)", rate: 170, uom: "boxes" },
  { sku: "FG-MOTI-01", name: "Shahi Motichoor Laddu (250g Box)", rate: 160, uom: "boxes" },
  { sku: "FG-GULAB-01", name: "Hot Kesar Gulab Jamun (500g Tin)", rate: 260, uom: "tins" },
  { sku: "FG-RAS-01", name: "Bengali Spongy White Rasgulla (1kg)", rate: 480, uom: "tins" },
  { sku: "FG-BHUJIA-01", name: "Bikaneri Masala Bhujia (400g Pack)", rate: 160, uom: "packs" },
  { sku: "FG-DRYFRUIT-01", name: "Royal California Almond & Cashew Box (500g)", rate: 650, uom: "boxes" },
  { sku: "FG-ASSORTED-01", name: "4-in-1 Mithai Royale Heritage Gift Pack (1kg)", rate: 890, uom: "boxes" },
];

export const OmsModule: React.FC<OmsModuleProps> = ({ activeOutlet = "DEL01", initialTab = "aggregators" }) => {
  const [tab, setTab] = useState<"aggregators" | "bulk" | "config">(initialTab);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Bulk Corporate & Wedding Hampers Sub-Tabs: "create" | "progress" | "calendar"
  const [bulkSubTab, setBulkSubTab] = useState<"create" | "progress" | "calendar">("create");

  // Bulk Order Creation State (Fields 1-6)
  const [orders, setOrders] = useState<any[]>([]);
  const [orderType, setOrderType] = useState("Corporate Gifting");
  const [customerName, setCustomerName] = useState("Tata Consultancy Services");
  const [mobile, setMobile] = useState("+91-9811445566");
  const [customerEmail, setCustomerEmail] = useState("procurement@tcs.com");
  const [companyGstin, setCompanyGstin] = useState("07AAAAA0000A1Z5");
  const [billingAddress, setBillingAddress] = useState("TCS House, Raveline Street, Fort, Mumbai - 400001");
  const [shippingAddress, setShippingAddress] = useState("TCS Olympus Centre, Rodas Enclave, Thane West - 400607");
  const [boxes, setBoxes] = useState(100);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [branding, setBranding] = useState("Gold Embossed Monogram + Satin Ribbon");

  // Multiple Line Items State (Field 7)
  const [lineItems, setLineItems] = useState<OmsLineItem[]>([
    {
      id: "line-1",
      sku: "FG-KAJU-01",
      name: "Royal Silver-Leaf Kaju Katli (250g Box)",
      qty: 100,
      uom: "boxes",
      unit_rate: 295,
      line_total: 29500,
    },
    {
      id: "line-2",
      sku: "FG-BESAN-01",
      name: "Desi Ghee Besan Laddu (250g Box)",
      qty: 100,
      uom: "boxes",
      unit_rate: 170,
      line_total: 17000,
    },
  ]);
  const [activeLineItemIndex, setActiveLineItemIndex] = useState<number>(0);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Advance Payment Modal State (Field 8)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [createdOrderForAdvance, setCreatedOrderForAdvance] = useState<any | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number>(23250);
  const [advancePaymentMode, setAdvancePaymentMode] = useState<"UPI" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH" | "RTGS_NEFT">("UPI");
  const [advancePaymentRef, setAdvancePaymentRef] = useState("");
  const [advanceLoading, setAdvanceLoading] = useState(false);

  // Balance Payment Settlement Modal State
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedOrderForBalance, setSelectedOrderForBalance] = useState<any | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);
  const [balancePaymentMode, setBalancePaymentMode] = useState<"UPI" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH" | "RTGS_NEFT">("UPI");
  const [balancePaymentRef, setBalancePaymentRef] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // A4 Quotation Preview Modal State
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationOrder, setQuotationOrder] = useState<any | null>(null);

  // Calendar State (Field 9)
  const [calendarData, setCalendarData] = useState<any | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Search in Progress tab
  const [searchBulk, setSearchBulk] = useState("");
  const [statusFilterBulk, setStatusFilterBulk] = useState("ALL");
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<any | null>(null);
  const [milestoneNote, setMilestoneNote] = useState("Kettle #1 sweet cooking complete, moving to cooling & luxury gift packaging");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Aggregator Live Orders State
  const [aggOrders, setAggOrders] = useState<AggregatorOrder[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loadingAggs, setLoadingAggs] = useState<boolean>(false);
  const [actionProcessing, setActionProcessing] = useState<number | string | null>(null);
  const [selectedAggIds, setSelectedAggIds] = useState<number[]>([]);
  const [batchAggProcessing, setBatchAggProcessing] = useState(false);

  // Aggregator Decline Modal State
  const [declineTargetOrder, setDeclineTargetOrder] = useState<AggregatorOrder | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("Item Out of Stock");
  const [declineComment, setDeclineComment] = useState<string>("");

  // Aggregator Config State
  const [aggConfig, setAggConfig] = useState<any>({
    zomato: {
      enabled: true,
      merchant_id: "ZOM_RET_9921",
      api_key: "zm_live_771928374921",
      webhook_secret: "whsec_zom_98124971a8f",
      auto_accept: false,
      default_prep_time_mins: 20,
    },
    swiggy: {
      enabled: true,
      restaurant_id: "SWG_REST_4412",
      partner_token: "swg_live_883019284719",
      webhook_secret: "whsec_swg_44129841b9c",
      auto_accept: false,
      default_prep_time_mins: 15,
    },
    rider_buffer_mins: 5,
    sound_alerts_enabled: true,
    auto_mark_food_ready: true,
  });
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<{ zomato: boolean; swiggy: boolean }>({ zomato: false, swiggy: false });

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadBulkOrders = async () => {
    try {
      const res = await apiFetch<any[]>("/api/oms/orders");
      setOrders(res);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadCalendar = async () => {
    setLoadingCalendar(true);
    try {
      const res = await apiFetch<any>("/api/oms/orders/calendar");
      setCalendarData(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const loadAggregatorOrders = async () => {
    setLoadingAggs(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== "ALL") params.append("platform", platformFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("outlet_code", activeOutlet);
      const res = await apiFetch<AggregatorOrder[]>(`/api/oms/aggregators/orders?${params.toString()}`);
      setAggOrders(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingAggs(false);
    }
  };

  const loadAggConfig = async () => {
    try {
      const res = await apiFetch<any>("/api/oms/aggregators/config");
      if (res) {
        setAggConfig((prev: any) => ({
          ...prev,
          ...res,
          zomato: { ...prev.zomato, ...(res.zomato || {}) },
          swiggy: { ...prev.swiggy, ...(res.swiggy || {}) },
        }));
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBulkOrders();
    loadAggregatorOrders();
    loadAggConfig();
    const interval = setInterval(loadAggregatorOrders, 8000);
    return () => clearInterval(interval);
  }, [platformFilter, statusFilter, activeOutlet]);

  useEffect(() => {
    if (bulkSubTab === "calendar") {
      loadCalendar();
    }
  }, [bulkSubTab]);

  // Keyboard Hotkeys for Line Item Quantity: '+' increments, '-' decrements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (bulkSubTab !== "create") return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        updateLineItemQty(activeLineItemIndex, 5);
      } else if (e.key === "-") {
        e.preventDefault();
        updateLineItemQty(activeLineItemIndex, -5);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bulkSubTab, activeLineItemIndex, lineItems]);

  // Multiple Line Items Calculation
  const itemsSubtotal = lineItems.reduce((acc, it) => acc + (Number(it.line_total) || 0), 0);
  const packagingCost = boxes * 45; // Luxury gift box packaging
  const gstAmount = (itemsSubtotal + packagingCost) * 0.05; // 5% GST on sweets/confectionery
  const grandTotal = itemsSubtotal + packagingCost + gstAmount;
  const estimatedBomCost = itemsSubtotal * 0.48; // Standard raw material cost
  const grossMargin = grandTotal > 0 ? ((grandTotal - estimatedBomCost) / grandTotal) * 100 : 0;

  const updateLineItemQty = (index: number, delta: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        const newQty = Math.max(1, updated[index].qty + delta);
        updated[index] = {
          ...updated[index],
          qty: newQty,
          line_total: newQty * updated[index].unit_rate,
        };
      }
      return updated;
    });
  };

  const handleLineItemChange = (index: number, field: keyof OmsLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        if (field === "sku") {
          const match = AVAILABLE_HAMPER_ITEMS.find((a) => a.sku === value);
          if (match) {
            updated[index].sku = match.sku;
            updated[index].name = match.name;
            updated[index].unit_rate = match.rate;
            updated[index].uom = match.uom;
            updated[index].line_total = updated[index].qty * match.rate;
          }
        } else if (field === "qty") {
          const q = Math.max(1, Number(value) || 1);
          updated[index].qty = q;
          updated[index].line_total = q * updated[index].unit_rate;
        } else if (field === "unit_rate") {
          const r = Math.max(0, Number(value) || 0);
          updated[index].unit_rate = r;
          updated[index].line_total = updated[index].qty * r;
        }
      }
      return updated;
    });
  };

  const handleAddLineItem = () => {
    const defaultItem = AVAILABLE_HAMPER_ITEMS[lineItems.length % AVAILABLE_HAMPER_ITEMS.length];
    const newItem: OmsLineItem = {
      id: `line-${Date.now()}`,
      sku: defaultItem.sku,
      name: defaultItem.name,
      qty: 50,
      uom: defaultItem.uom,
      unit_rate: defaultItem.rate,
      line_total: 50 * defaultItem.rate,
    };
    setLineItems((prev) => [...prev, newItem]);
    setActiveLineItemIndex(lineItems.length);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      notify(false, "At least one line item is required for the order.");
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
    setActiveLineItemIndex(Math.max(0, index - 1));
  };

  // Submit Order Creation
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      notify(false, "Please add at least one line item.");
      return;
    }
    setSubmittingOrder(true);
    try {
      const payload = {
        order_type: orderType,
        customer_name: customerName,
        customer_mobile: mobile,
        customer_email: customerEmail,
        company_gstin: companyGstin,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        outlet_code: activeOutlet,
        delivery_date: deliveryDate,
        branding_notes: branding,
        assortment: lineItems.map((it) => ({
          sku: it.sku,
          name: it.name,
          boxes: it.qty,
          qty_per_box: 1,
          unit_rate: it.unit_rate,
          line_total: it.line_total,
        })),
        total_boxes: boxes,
        advance_paid: 0,
        selling_total: grandTotal,
      };

      const res = await apiFetch<any>("/api/oms/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      notify(true, `Bulk Order ${res.order_no} created! WhatsApp & SMS quotation triggered.`);
      setCreatedOrderForAdvance(res);
      setAdvanceAmount(Math.round(grandTotal * 0.5)); // Suggest 50% advance
      setShowAdvanceModal(true);
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to create order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Confirm Advance Payment
  const handleConfirmAdvancePayment = async () => {
    if (!createdOrderForAdvance) return;
    setAdvanceLoading(true);
    try {
      // 1. Record advance payment
      await apiFetch(`/api/oms/orders/${createdOrderForAdvance.id}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: advanceAmount,
          payment_mode: advancePaymentMode,
          payment_ref: advancePaymentRef || `ADV-${Date.now().toString().slice(-6)}`,
          notes: `Advance payment for ${createdOrderForAdvance.order_no} via ${advancePaymentMode}`,
        }),
      });

      // 2. Trigger sweet factory production workflow
      await apiFetch(`/api/oms/orders/${createdOrderForAdvance.id}/trigger-production`, {
        method: "POST",
      });

      notify(true, `Advance of ₹${advanceAmount.toLocaleString("en-IN")} received! Factory production triggered.`);
      setShowAdvanceModal(false);

      // 3. Open A4 Quotation Preview
      setQuotationOrder({
        ...createdOrderForAdvance,
        advance_paid: advanceAmount,
        selling_total: grandTotal,
      });
      setShowQuotationModal(true);

      // 4. Switch to Progress tracking tab
      setBulkSubTab("progress");
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Error processing advance payment");
    } finally {
      setAdvanceLoading(false);
    }
  };

  // Confirm Balance Payment Settlement (Close Order) & Transform to Tax Invoice
  const handleConfirmBalancePayment = async () => {
    if (!selectedOrderForBalance) return;
    setBalanceLoading(true);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${selectedOrderForBalance.id}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: balanceAmount,
          payment_mode: balancePaymentMode,
          payment_ref: balancePaymentRef || `BAL-${Date.now().toString().slice(-6)}`,
          notes: `Final balance settlement for ${selectedOrderForBalance.order_no} via ${balancePaymentMode}`,
          stage: "BALANCE_SETTLEMENT",
          close_order: true,
        }),
      });

      notify(true, res.message || `Balance payment recorded! Order ${selectedOrderForBalance.order_no} is now COMPLETED & INVOICED.`);
      setShowBalanceModal(false);

      // Auto transform to Tax Invoice & trigger default printer
      const invNo = res.order?.invoice_no || res.invoice_no || `INV-BULK-${selectedOrderForBalance.outlet_code || "DEL01"}-${(selectedOrderForBalance.order_no || "").replace("OMS-", "").replace("ORD-", "")}`;
      const updatedOrder = {
        ...(res.order || selectedOrderForBalance),
        status: "COMPLETED",
        balance_due: 0,
        advance_paid: Number(selectedOrderForBalance.selling_total || 0),
        invoice_no: invNo,
        invoiced_at: res.order?.invoiced_at || res.invoiced_at || new Date().toISOString(),
      };
      setQuotationOrder(updatedOrder);
      setShowQuotationModal(true);

      // Immediate auto-print dialog on default printer
      setTimeout(() => {
        window.print();
      }, 400);

      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Error processing balance payment");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSendWhatsappQuote = async (orderId: number) => {
    setActionLoadingId(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${orderId}/send-whatsapp-quote`, { method: "POST" });
      notify(true, res.message || "WhatsApp Quote dispatched!");
      const link = res.whatsapp_link || res.whatsapp_url;
      if (link) window.open(link, "_blank");
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to generate WhatsApp quote");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForProgress) return;
    setActionLoadingId(selectedOrderForProgress.id);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${selectedOrderForProgress.id}/send-progress-update`, {
        method: "POST",
        body: JSON.stringify({ milestone_note: milestoneNote }),
      });
      notify(true, res.message || "Progress update dispatched via WhatsApp!");
      const link = res.whatsapp_link || res.whatsapp_url;
      if (link) window.open(link, "_blank");
      setProgressModalOpen(false);
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to send progress update");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotifyFoodReady = async (orderId: number) => {
    setActionLoadingId(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${orderId}/notify-ready`, { method: "POST" });
      notify(true, res.message || "Ready notification sent to customer via WhatsApp!");
      const link = res.whatsapp_link || res.whatsapp_url;
      if (link) window.open(link, "_blank");
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message || "Failed to notify food ready");
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerFactory = async (orderId: number) => {
    try {
      const res = await apiFetch<any>(`/api/oms/orders/${orderId}/trigger-production`, { method: "POST" });
      notify(true, `Production Locked! Batch Orders: ${(res.created_production_orders || []).join(", ")}`);
      loadBulkOrders();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  // Aggregator actions
  const handleAcceptAggOrder = async (orderId: number, platform: string, displayNo: string, prepTime: number = 20) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${orderId}/accept`, {
        method: "POST",
        body: JSON.stringify({ prep_time_mins: prepTime, actor: "Store Manager" }),
      });
      notify(true, res.message || `${platform} Order ${displayNo} accepted!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message || "Failed to accept order");
    } finally {
      setActionProcessing(null);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTargetOrder) return;
    if (!declineComment.trim()) {
      notify(false, "Mandatory operational explanation comment is required to decline!");
      return;
    }
    setActionProcessing(declineTargetOrder.id);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${declineTargetOrder.id}/decline`, {
        method: "POST",
        body: JSON.stringify({
          decline_reason: declineReason,
          decline_comment: declineComment.trim(),
          actor: "Store Manager",
        }),
      });
      notify(true, res.message || `Order ${declineTargetOrder.display_order_no} declined`);
      setDeclineTargetOrder(null);
      setDeclineComment("");
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message || "Failed to decline order");
    } finally {
      setActionProcessing(null);
    }
  };

  const handleBatchAcceptAggOrders = async () => {
    if (selectedAggIds.length === 0) return;
    setBatchAggProcessing(true);
    let count = 0;
    try {
      for (const id of selectedAggIds) {
        try {
          await apiFetch(`/api/oms/aggregators/orders/${id}/accept`, {
            method: "POST",
            body: JSON.stringify({ prep_time_mins: 20, actor: "Store Manager" }),
          });
          count++;
        } catch (e) {
          console.error(e);
        }
      }
      notify(true, `Accept All Orders: Successfully accepted ${count} online orders! KOT sent to counters.`);
      setSelectedAggIds([]);
      loadAggregatorOrders();
    } catch (err: any) {
      notify(false, `Batch error: ${err.message || err}`);
    } finally {
      setBatchAggProcessing(false);
    }
  };

  const handleMarkFoodReady = async (orderId: number, displayNo: string) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${orderId}/mark-ready`, { method: "POST" });
      notify(true, res.message || `Food Ready signaled for ${displayNo}!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleMarkPickedUp = async (orderId: number, displayNo: string) => {
    setActionProcessing(orderId);
    try {
      const res = await apiFetch<any>(`/api/oms/aggregators/orders/${orderId}/picked-up`, { method: "POST" });
      notify(true, res.message || `Order ${displayNo} handed over to rider!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleSimulateLiveOrder = async (platform: "ZOMATO" | "SWIGGY") => {
    try {
      const res = await apiFetch<any>("/api/oms/aggregators/simulate-incoming", {
        method: "POST",
        body: JSON.stringify({ platform, outlet_code: activeOutlet }),
      });
      audioAlert.playChime(platform);
      notify(true, `Incoming ${platform} Order ${res.order.display_order_no} (${formatINR(res.order.grand_total)}) arrived!`);
      loadAggregatorOrders();
    } catch (e: any) {
      notify(false, "Simulation error: " + e.message);
    }
  };

  const handleSaveAggConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>("/api/oms/aggregators/config", {
        method: "PUT",
        body: JSON.stringify(aggConfig),
      });
      notify(true, res.message || "Aggregator settings updated");
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const pendingPlacedCount = aggOrders.filter((o) => o.status === "PLACED").length;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm transition ${
            toast.ok
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main OMS Module Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "aggregators",
              label: "🛵 Zomato & Swiggy Live Inbox",
              badge: pendingPlacedCount > 0 ? `${pendingPlacedCount} New!` : null,
              badgeColor: "bg-rose-500 text-white animate-pulse",
            },
            { id: "bulk", label: "🎁 Bulk Corporate & Wedding Hampers", badge: `${orders.length}` },
            { id: "config", label: "⚙️ Aggregator API & Webhook Config" },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
                  isActive
                    ? "bg-[#081F5C] dark:bg-blue-600 text-white shadow"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${t.badgeColor || "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "aggregators" && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Demo Simulators:</span>
            <button
              onClick={() => handleSimulateLiveOrder("ZOMATO")}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] shadow transition flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Simulate Zomato Order
            </button>
            <button
              onClick={() => handleSimulateLiveOrder("SWIGGY")}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[11px] shadow transition flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Simulate Swiggy Order
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          TAB 1: ZOMATO & SWIGGY LIVE INBOX
      ======================================================== */}
      {tab === "aggregators" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500">Platform:</span>
              {["ALL", "ZOMATO", "SWIGGY"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    platformFilter === p
                      ? p === "ZOMATO"
                        ? "bg-red-600 text-white"
                        : p === "SWIGGY"
                        ? "bg-orange-500 text-white"
                        : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}

              <span className="font-bold text-slate-500 ml-3">Status:</span>
              {["ALL", "PLACED", "ACCEPTED", "FOOD_READY", "PICKED_UP", "DECLINED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    statusFilter === st
                      ? "bg-[#081F5C] dark:bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Select All / Multi-Select Batch Accept Button */}
              {aggOrders.filter((o) => o.status === "PLACED").length > 0 && (
                <div className="flex items-center gap-2 mr-2">
                  <button
                    type="button"
                    onClick={() => {
                      const placedIds = aggOrders.filter((o) => o.status === "PLACED").map((o) => o.id);
                      if (selectedAggIds.length === placedIds.length) {
                        setSelectedAggIds([]);
                      } else {
                        setSelectedAggIds(placedIds);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 transition"
                  >
                    {selectedAggIds.length > 0 &&
                    selectedAggIds.length === aggOrders.filter((o) => o.status === "PLACED").length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {selectedAggIds.length > 0
                        ? `Selected (${selectedAggIds.length})`
                        : "Select All Placed"}
                    </span>
                  </button>

                  {selectedAggIds.length > 0 && (
                    <button
                      type="button"
                      disabled={batchAggProcessing}
                      onClick={handleBatchAcceptAggOrders}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      {batchAggProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Accept All Selected ({selectedAggIds.length})</span>
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={loadAggregatorOrders}
                disabled={loadingAggs}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAggs ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Orders Stream Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {aggOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                <Radio className="w-10 h-10 mx-auto text-slate-300 animate-pulse" />
                <div className="font-bold text-sm">No live aggregator orders matching filters</div>
                <p className="text-xs">Incoming webhook orders from Swiggy & Zomato will trigger audible chimes and route KOTs.</p>
              </div>
            ) : (
              aggOrders.map((ord) => {
                const isZomato = ord.platform === "ZOMATO";
                const isSelected = selectedAggIds.includes(ord.id);
                return (
                  <div
                    key={ord.id}
                    className={`bg-white dark:bg-slate-900 border-2 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40"
                        : ord.status === "PLACED"
                        ? "border-amber-400/80 shadow-md"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          {ord.status === "PLACED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAggIds((prev) =>
                                  prev.includes(ord.id) ? prev.filter((id) => id !== ord.id) : [...prev, ord.id]
                                );
                              }}
                              className="text-slate-400 hover:text-blue-600 mr-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-xl text-white font-black text-[10px] tracking-wide shadow-xs ${
                              isZomato ? "bg-red-600" : "bg-orange-500"
                            }`}
                          >
                            {ord.platform}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {ord.display_order_no}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            ord.status === "PLACED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                              : ord.status === "ACCEPTED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : ord.status === "FOOD_READY"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : ord.status === "PICKED_UP"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {ord.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{ord.customer_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" /> {ord.customer_mobile}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ordered Items:</div>
                        <div className="space-y-1">
                          {(ord.items || []).map((itm: any, i: number) => {
                            const isKitchen = (itm.target_station || "").toUpperCase().includes("KITCHEN") ||
                              ["dosa", "chole", "bhature", "tikki", "chaat", "idli", "noodles", "paneer"].some((k) =>
                                (itm.name || "").toLowerCase().includes(k)
                              );
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                              >
                                <span><b>{itm.qty}×</b> {itm.name}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    isKitchen
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  }`}
                                >
                                  {isKitchen ? "🍳 Kitchen KOT" : "🍬 Sweet Counter"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Bill Total</span>
                        <span className="font-black text-sm text-[#081F5C] dark:text-sky-300">
                          {formatINR(ord.grand_total)}
                        </span>
                      </div>

                      {ord.status === "PLACED" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptAggOrder(ord.id, ord.platform, ord.display_order_no, 20)}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept & Dispatch KOT
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeclineTargetOrder(ord);
                              setDeclineComment("");
                            }}
                            className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {ord.status === "ACCEPTED" && (
                        <button
                          type="button"
                          onClick={() => handleMarkFoodReady(ord.id, ord.display_order_no)}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Mark Food Ready & Alert Rider
                        </button>
                      )}

                      {ord.status === "FOOD_READY" && (
                        <button
                          type="button"
                          onClick={() => handleMarkPickedUp(ord.id, ord.display_order_no)}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Mark Picked Up by Rider
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: BULK CORPORATE & WEDDING HAMPERS
          Sub-Tabs: 1. Create Order | 2. Progress Tracker | 3. Delivery Calendar
      ======================================================== */}
      {tab === "bulk" && (
        <div className="space-y-5">
          {/* Sub-Navigation Bar inside Bulk Hampers */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkSubTab("create")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                  bulkSubTab === "create"
                    ? "bg-amber-400 text-[#081F5C] shadow-md ring-2 ring-amber-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>📝 Create & Submit New Bulk Order</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkSubTab("progress")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                  bulkSubTab === "progress"
                    ? "bg-[#081F5C] text-white shadow-md ring-2 ring-blue-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>🚚 Order Progress Lifecycle & Settlements ({orders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkSubTab("calendar")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                  bulkSubTab === "calendar"
                    ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>📅 Scheduled Delivery Calendar</span>
              </button>
            </div>

            {/* Helper Info Tag */}
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 font-medium">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Hotkeys: Press <b>+</b> to add quantity, <b>-</b> to subtract quantity</span>
            </div>
          </div>

          {/* ========================================================
              SUB-TAB 1: CREATE & SUBMIT NEW BULK ORDER
          ======================================================== */}
          {bulkSubTab === "create" && (
            <form onSubmit={handleCreateOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Card: Customer & Enterprise Info (Fields 1-6) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-700 font-bold">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">Customer & Enterprise Details</h4>
                        <p className="text-[11px] text-slate-500">Fields 1-6 for GST quotation, WhatsApp & delivery</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      Step 1 of 2
                    </span>
                  </div>

                  {/* Order Type & Target Delivery Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Order Purpose</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                      >
                        <option value="Corporate Gifting">Corporate Gifting</option>
                        <option value="Wedding Hamper">Wedding Hamper</option>
                        <option value="Festival Gifting">Festival Bulk Gifting</option>
                        <option value="VIP Assortment">VIP Royal Assortment</option>
                        <option value="Event Catering">Event / Confectionery</option>
                        <option value="Institutional">Institutional Supply</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Scheduled Delivery Date</label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Field 1: Customer Name */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      1. Customer / Corporate Name *
                    </label>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Tata Consultancy Services / Sharma Wedding"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  {/* Field 2 & 3: Mobile Number & Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        2. WhatsApp Mobile *
                      </label>
                      <input
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="+91-9811445566"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        3. Corporate Email *
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="procurement@company.com"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Field 4: GSTN Number */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      4. Company GSTN Number (Tax Invoice)
                    </label>
                    <input
                      type="text"
                      value={companyGstin}
                      onChange={(e) => setCompanyGstin(e.target.value)}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-bold uppercase"
                    />
                  </div>

                  {/* Field 5: Billing Address */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      5. Registered Billing Address *
                    </label>
                    <textarea
                      rows={2}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Corporate Head Office / Billing entity address..."
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs resize-none"
                      required
                    />
                  </div>

                  {/* Field 6: Shipping Address */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      6. Delivery / Shipping Destination Address *
                    </label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Banquet venue / Office dispatch address..."
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs resize-none"
                      required
                    />
                  </div>

                  {/* Total Box Count & Branding Notes */}
                  <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Boxes</label>
                      <input
                        type="number"
                        value={boxes}
                        onChange={(e) => setBoxes(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-black text-amber-700"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ribbon / Monogram</label>
                      <input
                        type="text"
                        value={branding}
                        onChange={(e) => setBranding(e.target.value)}
                        placeholder="Gold Embossed Monogram + Ribbon"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Card: Multiple Line Items & Financial Summary (Field 7) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-amber-600" />
                        <div>
                          <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                            7. Multiple Order Line Items & Quantities
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Add items with '+' / '-' buttons or use hotkeys '+' and '-' to adjust
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#081F5C] font-extrabold text-xs shadow transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Line Item</span>
                      </button>
                    </div>

                    {/* Line Items Table */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-3">Select Mithai / Product Item</th>
                            <th className="p-3 text-center">Quantity (Units)</th>
                            <th className="p-3 text-right">Unit Rate</th>
                            <th className="p-3 text-right">Line Total</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {lineItems.map((item, idx) => {
                            const isFocused = activeLineItemIndex === idx;
                            return (
                              <tr
                                key={item.id}
                                onClick={() => setActiveLineItemIndex(idx)}
                                className={`transition ${
                                  isFocused
                                    ? "bg-amber-50/70 dark:bg-amber-950/20 ring-1 ring-amber-300"
                                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                }`}
                              >
                                <td className="p-3">
                                  <select
                                    value={item.sku}
                                    onChange={(e) => handleLineItemChange(idx, "sku", e.target.value)}
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                                  >
                                    {AVAILABLE_HAMPER_ITEMS.map((av) => (
                                      <option key={av.sku} value={av.sku}>
                                        {av.name} (₹{av.rate}/{av.uom})
                                      </option>
                                    ))}
                                  </select>
                                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">SKU: {item.sku}</div>
                                </td>

                                {/* Quantity with + and - Buttons */}
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit mx-auto">
                                    <button
                                      type="button"
                                      title="Subtract Item Qty (Hotkey: -)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateLineItemQty(idx, -5);
                                      }}
                                      className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center font-bold shadow-xs hover:bg-rose-50 hover:text-rose-600 transition"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>

                                    <input
                                      type="number"
                                      value={item.qty}
                                      onChange={(e) => handleLineItemChange(idx, "qty", e.target.value)}
                                      className="w-16 text-center font-black text-sm bg-transparent border-0 focus:ring-0 text-[#081F5C] dark:text-amber-300"
                                    />

                                    <button
                                      type="button"
                                      title="Add Item Qty (Hotkey: +)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateLineItemQty(idx, 5);
                                      }}
                                      className="w-7 h-7 rounded-xl bg-amber-400 text-[#081F5C] flex items-center justify-center font-bold shadow-xs hover:bg-amber-500 transition"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-slate-400">₹</span>
                                    <input
                                      type="number"
                                      value={item.unit_rate}
                                      onChange={(e) => handleLineItemChange(idx, "unit_rate", e.target.value)}
                                      className="w-20 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                    />
                                  </div>
                                </td>

                                <td className="p-3 text-right font-black font-mono text-sm text-slate-900 dark:text-white">
                                  ₹{Math.round(item.line_total || item.qty * item.unit_rate).toLocaleString("en-IN")}
                                </td>

                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLineItem(idx)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Real-time Order Summary Card */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-50 to-amber-50/50 dark:from-slate-800 dark:to-slate-800/60 border border-amber-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Items Subtotal ({lineItems.length} Products):</span>
                      <span className="font-bold font-mono">₹{itemsSubtotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Luxury Hamper Box & Ribbon ({boxes} Boxes @ ₹45):</span>
                      <span className="font-bold font-mono">₹{packagingCost.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Estimated GST (5% Food & Confectionery):</span>
                      <span className="font-bold font-mono text-emerald-600">₹{gstAmount.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-black text-[#081F5C] dark:text-white block">Grand Total Quotation</span>
                        <span className={`text-[11px] font-bold ${grossMargin < 20 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                          Margin Guardrail: {grossMargin.toFixed(1)}% (Healthy)
                        </span>
                      </div>
                      <span className="text-2xl font-black text-[#081F5C] dark:text-amber-400 font-mono">
                        ₹{Math.round(grandTotal).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Submit Order Button: Sends WhatsApp & Prompts Advance */}
                    <button
                      type="submit"
                      disabled={submittingOrder || lineItems.length === 0}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#081F5C] to-[#1246A8] hover:from-blue-900 hover:to-blue-800 text-white font-extrabold text-sm shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingOrder ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Order & Dispatching Quotation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-5 h-5 text-amber-300" />
                          <span>Generate Quotation & Submit Order</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================
              SUB-TAB 2: ORDER PROGRESS LIFECYCLE & BALANCE SETTLEMENT
          ======================================================== */}
          {bulkSubTab === "progress" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-600" />
                    <span>Order Progress Lifecycles & Workflow ({orders.length} Active)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live production milestones, WhatsApp status updates & balance payment settlement
                  </p>
                </div>

                {/* Minimal Workflow Search & Status Filter */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search ID, last 4 digits (e.g. 1008), customer..."
                      value={searchBulk}
                      onChange={(e) => setSearchBulk(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>

                  <select
                    value={statusFilterBulk}
                    onChange={(e) => setStatusFilterBulk(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="QUOTATION_SENT">Quotation Sent</option>
                    <option value="ADVANCE_PAID">Advance Paid</option>
                    <option value="PRODUCTION_LOCKED">In Production</option>
                    <option value="FOOD_READY">Food Ready</option>
                    <option value="COMPLETED">Completed / Invoiced</option>
                  </select>

                  <button
                    onClick={loadBulkOrders}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order Cards Stream */}
              <div className="space-y-4">
                {orders
                  .filter((o) => {
                    const q = searchBulk.trim().toLowerCase();
                    const matchesSearch =
                      !q ||
                      (o.order_no || "").toLowerCase().includes(q) ||
                      (o.order_no || "").endsWith(q) ||
                      (o.invoice_no || "").toLowerCase().includes(q) ||
                      (o.customer_name || "").toLowerCase().includes(q) ||
                      (o.company_name || "").toLowerCase().includes(q) ||
                      (o.customer_mobile || "").includes(q) ||
                      (o.customer_email || "").toLowerCase().includes(q);
                    const isSettled = o.status === "COMPLETED" || o.status === "SETTLED" || Number(o.balance_due || 0) <= 0;
                    const matchesStatus =
                      statusFilterBulk === "ALL" ||
                      o.status === statusFilterBulk ||
                      (statusFilterBulk === "COMPLETED" && isSettled);
                    return matchesSearch && matchesStatus;
                  })
                  .map((o) => {
                    const totalAmount = Number(o.selling_total) || 46500;
                    const advPaid = Number(o.advance_paid) || 0;
                    const balanceDue = Math.max(0, totalAmount - advPaid);
                    const isSettled = o.status === "COMPLETED" || o.status === "SETTLED" || balanceDue <= 0;
                    const invoiceNo = o.invoice_no || `INV-BULK-${o.outlet_code || "DEL01"}-${(o.order_no || "").replace("OMS-", "").replace("ORD-", "")}`;

                    // 6-step lifecycle workflow
                    const STAGES = [
                      { id: "QUOTED", label: "Quotation Sent" },
                      { id: "ADVANCE_PAID", label: "Advance Paid" },
                      { id: "FACTORY_QUEUED", label: "Factory Queued" },
                      { id: "IN_PRODUCTION", label: "In Production" },
                      { id: "FOOD_READY", label: "Food Ready" },
                      { id: "DISPATCHED", label: "Dispatched" },
                    ];

                    const getStageIndex = (st: string) => {
                      if (st === "COMPLETED" || st === "DISPATCHED") return 5;
                      if (st === "FOOD_READY" || st === "READY_FOR_DELIVERY") return 4;
                      if (st === "IN_PRODUCTION" || st === "COOKING" || st === "PACKING") return 3;
                      if (st === "PRODUCTION_LOCKED" || st === "FACTORY_QUEUED") return 2;
                      if (st === "ADVANCE_PAID" || st === "CONFIRMED") return 1;
                      return 0;
                    };

                    const currentStageIdx = getStageIndex(o.status);

                    return (
                      <div
                        key={o.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 hover:shadow-md transition"
                      >
                        {/* Top Bar: Order ID, Type, Customer, Financials */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-[#081F5C] dark:text-sky-300 font-mono">
                                {o.order_no}
                              </span>
                              {isSettled && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-[10px] flex items-center gap-1 border border-emerald-300/60">
                                  <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                  <span>{invoiceNo}</span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                                {o.order_type}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  isSettled
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : o.status === "FOOD_READY" || o.status === "READY_FOR_DELIVERY"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                }`}
                              >
                                {isSettled ? "SETTLED / INVOICED" : o.status}
                              </span>
                            </div>

                            <div className="font-extrabold text-slate-900 dark:text-white text-base mt-1">
                              {o.customer_name}
                            </div>

                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" /> {o.customer_mobile}
                              </span>
                              {o.customer_email && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" /> {o.customer_email}
                                  </span>
                                </>
                              )}
                              {o.company_gstin && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">GSTIN: {o.company_gstin}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1 font-bold text-amber-700">
                                <Calendar className="w-3 h-3" /> Deliv: {o.delivery_date}
                              </span>
                            </div>
                          </div>

                          {/* Financial Summary */}
                          <div className="text-right">
                            <div className="text-xs text-slate-500 font-bold">Selling Total</div>
                            <div className="text-lg font-black text-[#081F5C] dark:text-amber-400 font-mono">
                              ₹{totalAmount.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              Advance: <b className="text-emerald-600">₹{advPaid.toLocaleString("en-IN")}</b>
                              {balanceDue > 0 && (
                                <> • Due: <b className="text-rose-600">₹{balanceDue.toLocaleString("en-IN")}</b></>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Multiple Line Items Summary Capsule */}
                        {o.assortment && o.assortment.length > 0 && (
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Line Items:</span>
                            {o.assortment.map((ast: any, aIdx: number) => (
                              <span
                                key={aIdx}
                                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium text-slate-800 dark:text-slate-200"
                              >
                                <b>{ast.boxes || ast.qty || 1}×</b> {ast.name || ast.sku}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 6-Step Visual Minimal Workflow Progress View */}
                        <div className="py-2">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                            Order Progress Workflow Lifecycle
                          </div>
                          <div className="relative flex items-center justify-between">
                            {/* Horizontal progress track */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 z-0" />
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 z-0"
                              style={{ width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%` }}
                            />

                            {STAGES.map((stage, idx) => {
                              const isDone = idx < currentStageIdx;
                              const isCurrent = idx === currentStageIdx;
                              return (
                                <div key={stage.id} className="relative z-10 flex flex-col items-center">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                                      isDone
                                        ? "bg-emerald-600 text-white"
                                        : isCurrent
                                        ? "bg-[#081F5C] text-white ring-4 ring-blue-100 dark:ring-blue-900"
                                        : "bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400"
                                    }`}
                                  >
                                    {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                                  </div>
                                  <span
                                    className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${
                                      isCurrent
                                        ? "text-blue-600 dark:text-sky-400 font-bold"
                                        : isDone
                                        ? "text-slate-700 dark:text-slate-300"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {stage.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[11px] text-slate-500 italic">
                            {o.branding_notes || "Standard corporate luxury gift box"}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Send WhatsApp Quote */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsappQuote(o.id)}
                              disabled={actionLoadingId === o.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp Quote</span>
                            </button>

                            {/* Send Progress Update */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderForProgress(o);
                                setProgressModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Send Progress</span>
                            </button>

                            {/* Notify Food Ready */}
                            {o.status !== "READY_FOR_DELIVERY" && o.status !== "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => handleNotifyFoodReady(o.id)}
                                disabled={actionLoadingId === o.id}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Notify Ready</span>
                              </button>
                            )}

                            {/* Receive Balance Payment & Close Order */}
                            {balanceDue > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForBalance(o);
                                  setBalanceAmount(balanceDue);
                                  setShowBalanceModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Receive Balance (₹{balanceDue.toLocaleString("en-IN")})</span>
                              </button>
                            )}

                            {/* A4 Tax Invoice / Quotation Button */}
                            {isSettled ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuotationOrder(o);
                                  setShowQuotationModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300 font-bold text-[11px] shadow-xs flex items-center gap-1.5 transition"
                                title="View & Print Official GST Tax Invoice"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Tax Invoice</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuotationOrder(o);
                                  setShowQuotationModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                                title="View & Print Commercial Quotation"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>A4 Quote</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ========================================================
              SUB-TAB 3: SCHEDULED DELIVERY CALENDAR
          ======================================================== */}
          {bulkSubTab === "calendar" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 font-bold">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#081F5C] dark:text-white">
                      Scheduled Delivery Calendar (Managers & Directors)
                    </h3>
                    <p className="text-xs text-slate-500">Live order delivery schedule for factory production & packaging dispatch</p>
                  </div>
                </div>

                <button
                  onClick={loadCalendar}
                  disabled={loadingCalendar}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCalendar ? "animate-spin" : ""}`} />
                  <span>Refresh Schedule</span>
                </button>
              </div>

              {/* Delivery Dates Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 hover:border-purple-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {o.delivery_date}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-black text-[10px]">
                        {o.total_boxes || o.boxes || 100} Boxes
                      </span>
                    </div>

                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">{o.customer_name}</div>
                    <div className="text-[11px] text-slate-500">
                      Order: <code className="font-bold text-[#081F5C]">{o.order_no}</code> • Purpose: <b>{o.order_type}</b>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-600">
                      Val: {formatINR(Number(o.selling_total) || 45000)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: AGGREGATOR API & WEBHOOK CONFIGURATION
      ======================================================== */}
      {tab === "config" && (
        <form onSubmit={handleSaveAggConfig} className="max-w-5xl mx-auto space-y-6 text-xs pb-12 animate-fade-in">
          {/* Header Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#081F5C] dark:text-white">
                    Zomato & Swiggy Production Integration Settings
                  </h3>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Manage live Merchant Partner credentials, inbound webhook routes, and kitchen SLA automation.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>Gateway: <b className="text-emerald-600">Online</b></span>
              </div>
              <button
                type="button"
                onClick={() => handleSimulateLiveOrder("ZOMATO")}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold flex items-center gap-1 text-[11px] transition border border-red-200 dark:border-red-900"
              >
                <Zap className="w-3 h-3 text-red-600" />
                <span>Test Zomato Order</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateLiveOrder("SWIGGY")}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 font-bold flex items-center gap-1 text-[11px] transition border border-orange-200 dark:border-orange-900"
              >
                <Zap className="w-3 h-3 text-orange-600" />
                <span>Test Swiggy Order</span>
              </button>
            </div>
          </div>

          {/* Aggregators 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. ZOMATO MERCHANT INTEGRATION CARD */}
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-3xl p-6 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-red-100 dark:border-red-950">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-xl bg-[#E23744] text-white font-black text-xs tracking-wider shadow-sm">
                    ZOMATO
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Zomato Merchant Partner API
                    </h4>
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                      v2.4 Live Webhook Relay
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900">
                  <input
                    type="checkbox"
                    checked={aggConfig.zomato?.enabled}
                    onChange={(e) =>
                      setAggConfig({
                        ...aggConfig,
                        zomato: { ...aggConfig.zomato, enabled: e.target.checked },
                      })
                    }
                    className="rounded text-red-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Active</span>
                </label>
              </div>

              {/* Inputs */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Merchant Store ID
                    </label>
                    <input
                      type="text"
                      value={aggConfig.zomato?.merchant_id || ""}
                      onChange={(e) =>
                        setAggConfig({
                          ...aggConfig,
                          zomato: { ...aggConfig.zomato, merchant_id: e.target.value },
                        })
                      }
                      placeholder="e.g. ZOM_RET_9921"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Default Prep Time (mins)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={aggConfig.zomato?.default_prep_time_mins || 20}
                      onChange={(e) =>
                        setAggConfig({
                          ...aggConfig,
                          zomato: { ...aggConfig.zomato, default_prep_time_mins: Number(e.target.value) },
                        })
                      }
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-center text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-red-600" />
                      Partner API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeys({ ...showApiKeys, zomato: !showApiKeys.zomato })}
                      className="text-[10px] text-red-600 hover:underline font-bold"
                    >
                      {showApiKeys.zomato ? "Hide Key" : "Reveal Key"}
                    </button>
                  </div>
                  <input
                    type={showApiKeys.zomato ? "text" : "password"}
                    value={aggConfig.zomato?.api_key || ""}
                    onChange={(e) =>
                      setAggConfig({
                        ...aggConfig,
                        zomato: { ...aggConfig.zomato, api_key: e.target.value },
                      })
                    }
                    placeholder="zm_live_..."
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Webhook Signing Secret
                  </label>
                  <input
                    type="password"
                    value={aggConfig.zomato?.webhook_secret || ""}
                    onChange={(e) =>
                      setAggConfig({
                        ...aggConfig,
                        zomato: { ...aggConfig.zomato, webhook_secret: e.target.value },
                      })
                    }
                    placeholder="whsec_zom_..."
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aggConfig.zomato?.auto_accept}
                      onChange={(e) =>
                        setAggConfig({
                          ...aggConfig,
                          zomato: { ...aggConfig.zomato, auto_accept: e.target.checked },
                        })
                      }
                      className="rounded text-red-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Auto-accept incoming orders if all items are in stock
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 ml-6 mt-0.5">
                    Automatically approves new orders directly into KOT kitchen stations without requiring manual kitchen captain confirmation.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      Inbound Webhook URL (Zomato Partner Portal)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : "https://bkv-retailpos.onrender.com"}/api/oms/aggregators/zomato/webhook`;
                        navigator.clipboard?.writeText(url);
                        setCopiedWebhook("zomato");
                        notify(true, "Zomato Webhook URL copied to clipboard!");
                        setTimeout(() => setCopiedWebhook(null), 2500);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1 hover:bg-slate-100 transition text-[10px]"
                    >
                      {copiedWebhook === "zomato" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 select-all overflow-x-auto">
                    {typeof window !== "undefined" ? window.location.origin : "https://bkv-retailpos.onrender.com"}/api/oms/aggregators/zomato/webhook
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SWIGGY URBANPIPER INTEGRATION CARD */}
            <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/60 rounded-3xl p-6 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-orange-100 dark:border-orange-950">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-xl bg-[#FC8019] text-white font-black text-xs tracking-wider shadow-sm">
                    SWIGGY
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Swiggy UrbanPiper / Direct Partner API
                    </h4>
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                      UrbanPiper Relay v3 Protocol
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 bg-orange-50 dark:bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-900">
                  <input
                    type="checkbox"
                    checked={aggConfig.swiggy?.enabled}
                    onChange={(e) =>
                      setAggConfig({
                        ...aggConfig,
                        swiggy: { ...aggConfig.swiggy, enabled: e.target.checked },
                      })
                    }
                    className="rounded text-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Active</span>
                </label>
              </div>

              {/* Inputs */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Restaurant ID
                    </label>
                    <input
                      type="text"
                      value={aggConfig.swiggy?.restaurant_id || ""}
                      onChange={(e) =>
                        setAggConfig({
                          ...aggConfig,
                          swiggy: { ...aggConfig.swiggy, restaurant_id: e.target.value },
                        })
                      }
                      placeholder="e.g. SWG_REST_4412"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Default Prep Time (mins)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={aggConfig.swiggy?.default_prep_time_mins || 15}
                      onChange={(e) =>
                        setAggConfig({
                          ...aggConfig,
                          swiggy: { ...aggConfig.swiggy, default_prep_time_mins: Number(e.target.value) },
                        })
                      }
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-center text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-orange-500" />
                      Partner Token / Secret
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeys({ ...showApiKeys, swiggy: !showApiKeys.swiggy })}
                      className="text-[10px] text-orange-600 hover:underline font-bold"
                    >
                      {showApiKeys.swiggy ? "Hide Key" : "Reveal Key"}
                    </button>
                  </div>
                  <input
                    type={showApiKeys.swiggy ? "text" : "password"}
                    value={aggConfig.swiggy?.partner_token || ""}
                    onChange={(e) =>
                      setAggConfig({
                        ...aggConfig,
                        swiggy: { ...aggConfig.swiggy, partner_token: e.target.value },
                      })
                    }
                    placeholder="swg_live_..."
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Webhook Signing Secret
                  </label>
                  <input
                    type="password"
                    value={aggConfig.swiggy?.webhook_secret || ""}
                    onChange={(e) =>
                      setAggConfig({
                        ...aggConfig,
                        swiggy: { ...aggConfig.swiggy, webhook_secret: e.target.value },
                      })
                    }
                    placeholder="whsec_swg_..."
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aggConfig.swiggy?.auto_accept}
                      onChange={(e) =>
                        setAggConfig({
                          ...aggConfig,
                          swiggy: { ...aggConfig.swiggy, auto_accept: e.target.checked },
                        })
                      }
                      className="rounded text-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Auto-accept incoming orders if all items are in stock
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 ml-6 mt-0.5">
                    Relays directly to kitchen display system without delaying courier dispatch SLAs.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-orange-500" />
                      Inbound Webhook URL (UrbanPiper Console)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : "https://bkv-retailpos.onrender.com"}/api/oms/aggregators/swiggy/webhook`;
                        navigator.clipboard?.writeText(url);
                        setCopiedWebhook("swiggy");
                        notify(true, "Swiggy Webhook URL copied to clipboard!");
                        setTimeout(() => setCopiedWebhook(null), 2500);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1 hover:bg-slate-100 transition text-[10px]"
                    >
                      {copiedWebhook === "swiggy" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 select-all overflow-x-auto">
                    {typeof window !== "undefined" ? window.location.origin : "https://bkv-retailpos.onrender.com"}/api/oms/aggregators/swiggy/webhook
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SLA & Operational Guardrails Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              SLA Buffer & Kitchen Automation Guardrails
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Rider Arrival Buffer (mins)
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={aggConfig.rider_buffer_mins || 5}
                  onChange={(e) =>
                    setAggConfig({ ...aggConfig, rider_buffer_mins: Number(e.target.value) })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 font-mono font-bold text-center"
                />
                <p className="text-[10px] text-slate-500">
                  Buffer time added to request rider pickup before food packaging completes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    Audio & Visual Chime Alerts
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Play continuous audio chime and screen flash when a new Zomato/Swiggy order lands.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 pt-2">
                  <input
                    type="checkbox"
                    checked={aggConfig.sound_alerts_enabled}
                    onChange={(e) =>
                      setAggConfig({ ...aggConfig, sound_alerts_enabled: e.target.checked })
                    }
                    className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Sound Alerts Active</span>
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Auto-Mark 'Food Ready'
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Automatically trigger courier arrival alert when all KOT tickets are marked complete.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 pt-2">
                  <input
                    type="checkbox"
                    checked={aggConfig.auto_mark_food_ready}
                    onChange={(e) =>
                      setAggConfig({ ...aggConfig, auto_mark_food_ready: e.target.checked })
                    }
                    className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Auto-Notify Courier</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setAggConfig({
                  zomato: {
                    enabled: true,
                    merchant_id: "ZOM_RET_9921",
                    api_key: "zm_live_771928374921",
                    webhook_secret: "whsec_zom_98124971a8f",
                    auto_accept: false,
                    default_prep_time_mins: 20,
                  },
                  swiggy: {
                    enabled: true,
                    restaurant_id: "SWG_REST_4412",
                    partner_token: "swg_live_883019284719",
                    webhook_secret: "whsec_swg_44129841b9c",
                    auto_accept: false,
                    default_prep_time_mins: 15,
                  },
                  rider_buffer_mins: 5,
                  sound_alerts_enabled: true,
                  auto_mark_food_ready: true,
                });
                notify(true, "Restored default configuration settings. Click 'Save' to apply.");
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Reset to Recommended Defaults
            </button>

            <button
              type="submit"
              className="px-8 py-3 rounded-2xl bg-[#081F5C] hover:bg-blue-900 text-white font-extrabold shadow-lg hover:shadow-xl transition flex items-center gap-2 text-sm"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Save Aggregator Integration Settings
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          ADVANCE PAYMENT MODAL (Prompt for Advance, UPI/Card/RTGS)
      ======================================================== */}
      {showAdvanceModal && createdOrderForAdvance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-600">
                <CreditCard className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Advance Payment Prompt — {createdOrderForAdvance.order_no}
                  </h3>
                  <p className="text-[11px] text-slate-500">Record advance to lock production & generate A4 Quotation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdvanceModal(false);
                  setBulkSubTab("progress");
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Total Overview */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Total Quotation Value</span>
                <span className="text-xl font-black text-[#081F5C] dark:text-amber-300 font-mono">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block">Customer</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{customerName}</span>
              </div>
            </div>

            {/* Advance Amount Input */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Advance Amount to Collect (₹)
              </label>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 font-black text-emerald-600 text-sm"
              />
            </div>

            {/* Payment Modes with RTGS for >= 2 Lacs */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "UPI", label: "📱 UPI / QR Code" },
                  { id: "CREDIT_CARD", label: "💳 Credit Card" },
                  { id: "DEBIT_CARD", label: "💳 Debit Card" },
                  { id: "CASH", label: "💵 Cash at Counter" },
                  {
                    id: "RTGS_NEFT",
                    label: "🏦 Bank RTGS / NEFT",
                    highlight: grandTotal >= 200000 ? "ring-2 ring-emerald-500 font-black" : "",
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAdvancePaymentMode(mode.id as any)}
                    className={`p-2.5 rounded-xl border text-left font-bold transition ${
                      advancePaymentMode === mode.id
                        ? "bg-[#081F5C] text-white border-[#081F5C] shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    } ${mode.highlight || ""}`}
                  >
                    <div>{mode.label}</div>
                  </button>
                ))}
              </div>

              {grandTotal >= 200000 && (
                <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950 p-2 rounded-xl border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Large Order Threshold (≥ ₹2,00,000): RTGS/NEFT or Corporate Card Recommended.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Ref / UTR / Auth No
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-HDFC-9912084 / UPI Ref"
                value={advancePaymentRef}
                onChange={(e) => setAdvancePaymentRef(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowAdvanceModal(false);
                  setBulkSubTab("progress");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
              >
                Skip For Later
              </button>
              <button
                type="button"
                onClick={handleConfirmAdvancePayment}
                disabled={advanceLoading || advanceAmount <= 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg transition flex items-center gap-2"
              >
                {advanceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Record Advance & Trigger Factory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          BALANCE PAYMENT SETTLEMENT MODAL (Close Order)
      ======================================================== */}
      {showBalanceModal && selectedOrderForBalance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-600">
                <Banknote className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Receive Balance Payment — {selectedOrderForBalance.order_no}
                  </h3>
                  <p className="text-[11px] text-slate-500">Settle remaining dues and close the bulk order</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Balance Pending</span>
                <span className="text-xl font-black text-rose-600 font-mono">
                  ₹{balanceAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block">Client</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedOrderForBalance.customer_name}</span>
              </div>
            </div>

            {/* Payment Channel */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Balance Settlement Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "UPI", label: "📱 UPI / QR Code" },
                  { id: "CREDIT_CARD", label: "💳 Credit Card" },
                  { id: "DEBIT_CARD", label: "💳 Debit Card" },
                  { id: "CASH", label: "💵 Cash Remittance" },
                  { id: "RTGS_NEFT", label: "🏦 Bank RTGS / NEFT" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setBalancePaymentMode(mode.id as any)}
                    className={`p-2.5 rounded-xl border text-left font-bold transition ${
                      balancePaymentMode === mode.id
                        ? "bg-[#081F5C] text-white border-[#081F5C] shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div>{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Reference / UTR
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-HDFC-FINAL-9921"
                value={balancePaymentRef}
                onChange={(e) => setBalancePaymentRef(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBalancePayment}
                disabled={balanceLoading || balanceAmount <= 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg transition flex items-center gap-2"
              >
                {balanceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                <span>Settle Balance & Close Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          A4 PRINTABLE QUOTATION / TAX INVOICE PREVIEW MODAL
      ======================================================== */}
      {showQuotationModal && quotationOrder && (() => {
        const isSettled =
          quotationOrder.status === "COMPLETED" ||
          quotationOrder.status === "SETTLED" ||
          Number(quotationOrder.balance_due || 0) <= 0;
        const invoiceNo =
          quotationOrder.invoice_no ||
          `INV-BULK-${quotationOrder.outlet_code || "DEL01"}-${(quotationOrder.order_no || "").replace("OMS-", "").replace("ORD-", "")}`;
        const invoiceDate = quotationOrder.invoiced_at
          ? new Date(quotationOrder.invoiced_at).toLocaleDateString("en-IN")
          : new Date().toLocaleDateString("en-IN");
        const totalAmt = Number(quotationOrder.selling_total || 46500);
        const advPaid = Number(quotationOrder.advance_paid || 0);
        const balDue = isSettled ? 0 : Math.max(0, totalAmt - advPaid);
        const taxableVal = Math.round((totalAmt / 1.05) * 100) / 100;
        const totalGst = Math.round((totalAmt - taxableVal) * 100) / 100;
        const cgst = Math.round((totalGst / 2) * 100) / 100;
        const sgst = Math.round((totalGst - cgst) * 100) / 100;

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {isSettled ? (
                    <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-600" />
                  )}
                  <h3 className="font-extrabold text-sm text-[#081F5C] dark:text-white">
                    {isSettled
                      ? `Tax Invoice — ${invoiceNo}`
                      : `A4 Tax Quotation Preview — ${quotationOrder.order_no}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* A4 Document Rendering Container (Printable target) */}
              <div
                id="annavya-a4-document"
                className="p-6 bg-white border border-slate-300 rounded-2xl text-slate-900 space-y-4 shadow-inner"
              >
                {/* Header with Logos */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/bikanervala-customer-logo.png"
                      alt="Bikanervala"
                      className="h-12 w-auto object-contain"
                    />
                    <img
                      src="/annavya-badge-light.png"
                      alt="Annavya"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="font-black text-sm text-[#081F5C]">BIKANERVALA FOODS PVT LTD</div>
                    <div>GSTIN: 07AAACB1234F1Z5 • FSSAI: 13324001000451</div>
                    <div className="text-slate-600 font-medium">Connaught Place Flagship, New Delhi - 110001</div>
                    <div className="text-slate-500 text-[10px]">Ph: +91-11-47000000 • Email: corporate@bikanervala.com</div>
                  </div>
                </div>

                {/* Document Type Badge */}
                <div
                  className={`text-center py-1.5 px-3 rounded-lg font-black text-xs tracking-wider uppercase border ${
                    isSettled
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-blue-50 text-blue-900 border-blue-200"
                  }`}
                >
                  {isSettled ? "TAX INVOICE (ORIGINAL FOR RECIPIENT)" : "OFFICIAL COMMERCIAL ESTIMATE & QUOTATION"}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Customer Billed To:</span>
                    <div className="font-extrabold text-sm text-slate-900">{quotationOrder.customer_name}</div>
                    {quotationOrder.company_name && (
                      <div className="font-bold text-slate-700">{quotationOrder.company_name}</div>
                    )}
                    <div className="text-slate-600">Mobile: {quotationOrder.customer_mobile}</div>
                    {quotationOrder.customer_email && (
                      <div className="text-slate-600">Email: {quotationOrder.customer_email}</div>
                    )}
                    {quotationOrder.company_gstin ? (
                      <div className="font-mono font-bold text-slate-800">GSTIN: {quotationOrder.company_gstin}</div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">Consumer / Unregistered</div>
                    )}
                    <div className="text-slate-500 text-[11px] mt-1">
                      {quotationOrder.billing_address || "Connaught Place, New Delhi"}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {isSettled ? (
                      <>
                        <div className="font-mono font-black text-sm text-emerald-700">INVOICE NO: {invoiceNo}</div>
                        <div className="text-slate-600 font-mono text-[11px]">Order Ref: {quotationOrder.order_no}</div>
                        <div className="text-slate-600">Invoice Date: {invoiceDate}</div>
                        <div className="text-slate-600">Delivery Date: {quotationOrder.delivery_date}</div>
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            SETTLED & PAID IN FULL
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-mono font-black text-sm text-[#081F5C]">QUOTE REF: {quotationOrder.order_no}</div>
                        <div className="text-slate-600">Quote Date: {new Date().toLocaleDateString("en-IN")}</div>
                        <div className="text-slate-600">Target Delivery: {quotationOrder.delivery_date}</div>
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                            {quotationOrder.status}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2">Item Description</th>
                      <th className="p-2 text-center">HSN/SAC</th>
                      <th className="p-2 text-center">Boxes / Qty</th>
                      <th className="p-2 text-right">Rate (₹)</th>
                      <th className="p-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(quotationOrder.assortment || []).map((itm: any, idx: number) => {
                      const qty = itm.boxes || itm.qty || 100;
                      const rate = itm.unit_rate || 295;
                      const lineAmt = itm.line_total || qty * rate;
                      return (
                        <tr key={idx}>
                          <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold">
                            {itm.name || itm.sku}
                            {itm.uom && <span className="text-slate-400 font-normal ml-1">({itm.uom})</span>}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500">2106 90 99</td>
                          <td className="p-2 text-center font-semibold">{qty}</td>
                          <td className="p-2 text-right font-mono">₹{rate.toLocaleString("en-IN")}</td>
                          <td className="p-2 text-right font-bold font-mono">
                            ₹{lineAmt.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Financial Totals & Scannable Barcode */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pt-3 border-t gap-4">
                  <div className="flex flex-col gap-2">
                    <BarcodeSvg value={isSettled ? invoiceNo : quotationOrder.order_no} height={42} showText={true} />
                    <div className="text-[10px] text-slate-500 font-mono">
                      Doc Ref: {quotationOrder.order_no} • {isSettled ? "VERIFIED TAX INVOICE" : "ESTIMATE RECORD"}
                    </div>
                  </div>

                  <div className="w-72 space-y-1.5 text-xs ml-auto">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Value:</span>
                      <span className="font-mono">
                        ₹{taxableVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (2.5%):</span>
                      <span className="font-mono">
                        ₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (2.5%):</span>
                      <span className="font-mono">
                        ₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t">
                      <span>Total Invoice Value:</span>
                      <span className="font-mono font-black text-sm text-[#081F5C]">
                        ₹{totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Advance Received:</span>
                      <span className="font-mono">
                        ₹{advPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {isSettled ? (
                      <>
                        <div className="flex justify-between text-teal-700 font-bold">
                          <span>Balance Settled:</span>
                          <span className="font-mono">
                            ₹{(totalAmt - advPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between font-black text-sm pt-1 border-t text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                          <span>Balance Due:</span>
                          <span className="font-mono">₹0.00 (PAID IN FULL)</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between font-black text-sm pt-1 border-t text-rose-700 bg-rose-50 px-2 py-1 rounded">
                        <span>Balance Due:</span>
                        <span className="font-mono">
                          ₹{balDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms & Authorized Signatory */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t text-[10px] text-slate-600">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 uppercase">Terms & Conditions:</div>
                    <div>1. Goods once sold will not be returned or exchanged.</div>
                    <div>2. Sweets & Mithai must be stored in cool & dry conditions.</div>
                    <div>3. All disputes subject to Delhi jurisdiction only.</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-bold text-slate-800">For BIKANERVALA FOODS PVT LTD</div>
                    <div className="h-10 flex items-end justify-end">
                      <span className="inline-block border-t border-slate-400 px-4 pt-0.5 text-[9px] text-slate-500">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Footer */}
                <div className="pt-2 border-t text-center text-[10px] text-slate-500 space-y-0.5">
                  <div className="font-bold text-slate-800">Taste of Tradition • Fresh Thinking • Smarter Retail</div>
                  <div>
                    {isSettled
                      ? "Official GST Tax Invoice • "
                      : "Computer generated estimate & quotation • "}
                    Software Development by Annavya ERP (www.annavya.in)
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-5 py-2.5 rounded-xl text-white font-extrabold shadow flex items-center gap-1.5 transition ${
                    isSettled
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[#081F5C] hover:bg-blue-900"
                  }`}
                  title="Print directly to connected default printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isSettled
                      ? "Print Tax Invoice (Default Printer)"
                      : "Print A4 Quotation (Default Printer)"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Decline Reason Modal */}
      {declineTargetOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Decline {declineTargetOrder.platform} Order — {declineTargetOrder.display_order_no}
                </h3>
              </div>
              <button onClick={() => setDeclineTargetOrder(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeclineSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Standard Reason</label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="Item Out of Stock">Item Out of Stock</option>
                  <option value="Kitchen Overloaded">Kitchen Overloaded / SLA Breach Risk</option>
                  <option value="Store Closed">Store Closing Hours</option>
                  <option value="Packaging Unavailable">Packaging Box Unavailable</option>
                  <option value="Other">Other Operational Constraint</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mandatory Operational Explanation *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why order was declined..."
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeclineTargetOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!declineComment.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow disabled:opacity-40"
                >
                  Confirm & Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Milestone Notification Modal */}
      {progressModalOpen && selectedOrderForProgress && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-600">
                <Share2 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Send Progress Update — {selectedOrderForProgress.order_no}
                </h3>
              </div>
              <button onClick={() => setProgressModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendProgressUpdate} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">{selectedOrderForProgress.customer_name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Mobile: <b className="text-emerald-600">{selectedOrderForProgress.customer_mobile}</b></span>
                  <span>•</span>
                  <span>Boxes: <b>{selectedOrderForProgress.total_boxes || selectedOrderForProgress.boxes || 100}</b></span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Milestone Progress Message *
                </label>
                <textarea
                  rows={3}
                  value={milestoneNote}
                  onChange={(e) => setMilestoneNote(e.target.value)}
                  placeholder="e.g. Sweets have finished cooking in Kettle #1, currently entering cooling and luxury packaging zone..."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === selectedOrderForProgress.id || !milestoneNote.trim()}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Dispatch WhatsApp Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
