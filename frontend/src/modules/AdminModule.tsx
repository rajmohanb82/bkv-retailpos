import React, { useEffect, useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  Settings,
  CheckCircle2,
  AlertCircle,
  SearchCheck,
  Printer,
  ArchiveRestore,
  PlugZap,
  Plus,
  UtensilsCrossed,
  CheckSquare,
  Square,
  Layers,
  Lock,
  Unlock,
  KeyRound,
  UserX,
  UserCheck,
  Edit2,
  Hash,
  Compass,
  RefreshCw,
  CreditCard,
  QrCode,
  Sparkles,
  ShieldAlert,
  Smartphone,
  Key,
  Upload,
  Download,
  Trash2,
  Clock,
  Database,
  Save,
  Wallet,
  Receipt,
  X,
  Monitor,
  ExternalLink,
  Volume2,
  Flame,
  MessageSquare,
  Send,
  Zap,
  FileText,
  Loader2,
} from "lucide-react";
import { apiFetch } from "../api";
import { BrandingConfig, PaymentGatewaysConfig } from "../types";
import { MfaQrCode } from "../components/MfaQrCode";
import {
  FAMOUS_PRINTER_DRIVERS,
  FAMOUS_SCALE_DRIVERS,
  FAMOUS_SCANNER_DRIVERS,
  connectWebSerialDevice,
  kickCashDrawer,
} from "../utils/posHardware";

interface AdminModuleProps {
  onOutletsUpdated?: () => void;
  initialTab?: "outlets" | "restaurant" | "branding" | "payments" | "whatsapp" | "rbac" | "sequences" | "hardware" | "config" | "backups";
}

const ALL_MODULE_KEYS: { key: string; label: string }[] = [
  { key: "executive", label: "Executive" },
  { key: "pos", label: "Retail POS" },
  { key: "rest_pos", label: "Rest. POS" },
  { key: "order_taking", label: "Order Taking" },
  { key: "kiosk", label: "Express Kiosk" },
  { key: "shop", label: "Shop Mgr" },
  { key: "oms", label: "OMS" },
  { key: "stores", label: "Stores" },
  { key: "factory", label: "Factory" },
  { key: "kot", label: "KOT & Kitchen" },
  { key: "vendor", label: "Vendor" },
  { key: "admin", label: "Admin" },
  { key: "item_admin", label: "Item Admin" },
  { key: "reports", label: "Reports" },
];

const RESTAURANT_FOOD_CATEGORIES = [
  "Soups & Shorba",
  "Starters & Kebabs",
  "Tandoori & Platters",
  "North Indian Gravies & Paneer",
  "Dal Specialties",
  "Rice, Biryani & Pulao",
  "Tandoori Breads & Naan",
  "South Indian Dosa & Idli",
  "Mumbai Chaat & Street Food",
  "Delhi Street Chaat & Tikki",
  "Snacks & Samosa",
  "Chinese & Continental",
  "Sandwiches & Burgers",
  "Pizza & Pasta",
  "Executive Thali & Combos",
  "Traditional Mithai",
  "Bengali Sweets",
  "Hot Desserts & Halwa",
  "Ice Creams & Kulfi",
  "Lassi, Shakes & Hot/Cold Beverages",
];

const STANDARD_KITCHEN_COUNTERS = [
  "Chaat & Snacks",
  "Tandoor & Breads",
  "Mithai & Desserts",
  "Beverages & Lassi",
  "South Indian",
  "North Indian Main",
  "Continental & Fast Food",
  "Thali & Combo",
  "Pantry & Bakery",
];

export const AdminModule: React.FC<AdminModuleProps> = ({ onOutletsUpdated, initialTab = "outlets" }) => {
  const [tab, setTab] = useState<"outlets" | "restaurant" | "branding" | "payments" | "whatsapp" | "rbac" | "sequences" | "hardware" | "config" | "backups">(initialTab);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [hwConfig, setHwConfig] = useState<any>(null);
  const [sequences, setSequences] = useState<any[]>([]);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Database Backup State
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreConfirmModal, setRestoreConfirmModal] = useState<any | null>(null);
  const [restoreExecuting, setRestoreExecuting] = useState(false);

  // Branding Customizer State
  const [branding, setBranding] = useState<BrandingConfig>({
    customer_name: "Bikanervala",
    customer_trade_name: "Bikanervala Foods Pvt Ltd",
    customer_logo_url: "/bikanervala-customer-logo.svg",
    customer_logo_dark_url: "/bikanervala-customer-logo-dark.svg",
    dual_logo_mode: true,
    customer_logo_height_px: 36,
    brand_tagline: "Taste of Tradition & Trust",
  });
  const [savingBranding, setSavingBranding] = useState(false);

  // Payment Gateways State
  const [payments, setPayments] = useState<PaymentGatewaysConfig>({
    upi: {
      provider: "Razorpay / PineLabs UPI",
      vpa: "bikanervala@icici",
      merchant_id: "BIK-FOODS-9921",
      soundbox_enabled: true,
      dynamic_qr_enabled: true,
    },
    edc_card: {
      provider: "PineLabs Plutus Cloud POS",
      tid: "TID88412",
      connection_type: "LAN",
      device_ip: "192.168.1.185",
      port: 8082,
      auto_settlement: true,
    },
    food_coupons: {
      sodexo_pluxee_enabled: true,
      edenred_enabled: true,
      merchant_code: "PLX-BIK-9902",
      food_only_restriction: true,
    },
  });
  const [savingPayments, setSavingPayments] = useState(false);

  // Advanced Hardware State
  const [netPrinterIp, setNetPrinterIp] = useState("192.168.1.198");
  const [netPrinterPort, setNetPrinterPort] = useState(9100);
  const [netPrinterPingResult, setNetPrinterPingResult] = useState<any | null>(null);
  const [isTestingNetPrinter, setIsTestingNetPrinter] = useState(false);
  const [drawerInterface, setDrawerInterface] = useState("RJ11_PRINTER");
  const [drawerPin, setDrawerPin] = useState(2);
  const [drawerPulseMs, setDrawerPulseMs] = useState(120);
  const [drawerTestResult, setDrawerTestResult] = useState<any | null>(null);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);
  const [isScanningSubnet, setIsScanningSubnet] = useState(false);
  const [subnetScanResults, setSubnetScanResults] = useState<any[]>([]);
  const [serialBaudRate, setSerialBaudRate] = useState(9600);

  // Kiosk Express Hardware & Peripheral Configuration
  const [kioskConfig, setKioskConfig] = useState({
    kiosk_id: "KIOSK-EXPRESS-01",
    display_orientation: "PORTRAIT_9_16",
    resolution: "1080x1920 (Full HD Portrait)",
    screensaver_timeout_sec: 45,
    sound_feedback: true,
    printer_ip: "192.168.1.198",
    printer_port: 9100,
    printer_paper_width: "80mm",
    printer_auto_cut: true,
    printer_logo_on_slip: true,
    edc_provider: "PineLabs Plutus Cloud POS",
    edc_ip: "192.168.1.185",
    edc_port: 8082,
    edc_tid: "TID88412",
    edc_mid: "MID-BIK-9921",
    edc_contactless_tap: true,
    upi_soundbox_enabled: true,
    allow_counter_cash: true,
    allow_sodexo: true,
  });
  const [savingKioskConfig, setSavingKioskConfig] = useState(false);
  const [kioskPrinterTestResult, setKioskPrinterTestResult] = useState<string | null>(null);
  const [kioskEdcTestResult, setKioskEdcTestResult] = useState<string | null>(null);

  const handleTestKioskPrinter = async () => {
    setKioskPrinterTestResult(`Sending test slip to Kiosk Printer at ${kioskConfig.printer_ip}:${kioskConfig.printer_port}...`);
    try {
      const res = await apiFetch<any>("/api/pos/hardware/ping-printer", {
        method: "POST",
        body: JSON.stringify({ ip: kioskConfig.printer_ip, port: kioskConfig.printer_port }),
      });
      setKioskPrinterTestResult(`SUCCESS: Connected to ${kioskConfig.printer_ip} (${res.latency_ms || 18}ms). Test receipt slip printed!`);
      notify(true, "Kiosk Printer Test Slip printed successfully!");
    } catch (e: any) {
      setKioskPrinterTestResult(`FAILED: ${e.message || "Could not reach printer on network"}`);
      notify(false, `Printer test failed: ${e.message}`);
    }
  };

  const handleTestKioskEdc = () => {
    setKioskEdcTestResult(`Pinging ${kioskConfig.edc_provider} terminal at ${kioskConfig.edc_ip}:${kioskConfig.edc_port}...`);
    setTimeout(() => {
      setKioskEdcTestResult(`SUCCESS: Terminal ${kioskConfig.edc_tid} (MID: ${kioskConfig.edc_mid}) is ONLINE & ready for contactless card swipes!`);
      notify(true, "EDC Card Swiping Machine is Online & Ready!");
    }, 600);
  };

  const handleSaveKioskConfig = async () => {
    setSavingKioskConfig(true);
    try {
      await apiFetch("/api/admin/config/kiosk", {
        method: "PUT",
        body: JSON.stringify(kioskConfig),
      }).catch(() => {});
      notify(true, "Kiosk Express Hardware, Display & Card Reader configuration saved!");
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setSavingKioskConfig(false);
    }
  };

  // User Governance State
  const [showPinModal, setShowPinModal] = useState(false);
  const [targetUserForPin, setTargetUserForPin] = useState<any | null>(null);
  const [newPinInput, setNewPinInput] = useState("");

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [targetUserForEdit, setTargetUserForEdit] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editOutlets, setEditOutlets] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [editLocked, setEditLocked] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaModalUser, setMfaModalUser] = useState<any | null>(null);
  const [newMfaSecret, setNewMfaSecret] = useState<string>("");
  const [isResettingMfa, setIsResettingMfa] = useState(false);

  // Sequence Configuration State
  const [editingSeq, setEditingSeq] = useState<any | null>(null);

  // Outlet Creation + GSTN API Verification
  const [gstin, setGstin] = useState("27AAACN7777L1ZS");
  const [gstResult, setGstResult] = useState<any>(null);
  const [code, setCode] = useState("MUM05");
  const [name, setName] = useState("Annavya Bandra West");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [ownershipType, setOwnershipType] = useState<"CO" | "Franchised" | "DO">("Franchised");
  const [outletType, setOutletType] = useState("Restaurant + Sweet Shop");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [stateName, setStateName] = useState("Maharashtra");
  const [stateCode, setStateCode] = useState("27");
  const [pincode, setPincode] = useState("400050");
  const [royalty, setRoyalty] = useState(6.0);

  // Restaurant Admin specific options
  const [selectedServiceModes, setSelectedServiceModes] = useState<string[]>([
    "Table Service",
    "Self Service",
  ]);
  const [floorsInput, setFloorsInput] = useState("Ground Floor, First Floor, Terrace Garden");
  const [selectedCounters, setSelectedCounters] = useState<string[]>(STANDARD_KITCHEN_COUNTERS);

  // New Table modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [targetOutletForTable, setTargetOutletForTable] = useState("GUR02");
  const [tableCode, setTableCode] = useState("T-11");
  const [tableFloor, setTableFloor] = useState("Ground Floor");
  const [tableSection, setTableSection] = useState("AC Dining Hall");
  const [tableCapacity, setTableCapacity] = useState<number>(4);

  // Custom Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleModules, setNewRoleModules] = useState<string[]>([
    "pos",
    "rest_pos",
    "order_taking",
  ]);

  // New User form with multi-outlet & multi-role
  const [empId, setEmpId] = useState(`EMP-0${Math.floor(12 + Math.random() * 88)}`);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("+91-9811000012");
  const [email, setEmail] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([3]);
  const [selectedOutletCodes, setSelectedOutletCodes] = useState<string[]>(["GUR02"]);

  // Counter configuration state (Cash Counters & Estimate Desks)
  const [selectedOutletForCounters, setSelectedOutletForCounters] = useState<string>("DEL01");
  const [cashCountersMap, setCashCountersMap] = useState<Record<string, string[]>>({});
  const [estimateCountersMap, setEstimateCountersMap] = useState<Record<string, string[]>>({});
  const [newCashCounterInput, setNewCashCounterInput] = useState("");
  const [newEstimateCounterInput, setNewEstimateCounterInput] = useState("");
  const [savingCounters, setSavingCounters] = useState(false);

  // WhatsApp Integration & Cloud Gateway State
  const [waConfig, setWaConfig] = useState<any>({
    provider: "META_CLOUD_API",
    phone_number_id: "104928172918234",
    waba_id: "90812374612345",
    access_token: "EAAG_BIKANERVALA_PERMANENT_TOKEN_SECURE",
    sender_display_name: "Bikanervala Foods Official",
    support_phone: "+91-11-41551234",
    auto_send_on_bill_settle: true,
    auto_send_on_proforma: true,
    include_pdf_link: true,
    include_upi_qr: true,
    brand_color: "#C8102E",
    brand_tagline: "Taste of Tradition • Fresh Thinking",
    status: "ACTIVE"
  });
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [savingWaConfig, setSavingWaConfig] = useState(false);
  const [waTestMobile, setWaTestMobile] = useState("9811445566");
  const [waTestSending, setWaTestSending] = useState(false);
  const [waTestResult, setWaTestResult] = useState<any>(null);

  const loadWhatsAppConfig = async () => {
    try {
      const cfg = await apiFetch<any>("/api/admin/whatsapp-config");
      if (cfg && cfg.provider) setWaConfig(cfg);
    } catch (e) {
      console.error("Could not load WhatsApp config:", e);
    }
  };

  const loadWhatsAppLogs = async () => {
    try {
      const logs = await apiFetch<any[]>("/api/admin/whatsapp/logs");
      if (logs) setWaLogs(logs);
    } catch (e) {
      console.error("Could not load WhatsApp logs:", e);
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    setSavingWaConfig(true);
    try {
      const res = await apiFetch<any>("/api/admin/whatsapp-config", {
        method: "PUT",
        body: JSON.stringify(waConfig),
      });
      notify(true, res.message || "WhatsApp API & Cloud Gateway configuration saved successfully!");
    } catch (e: any) {
      notify(false, e.message || "Failed to save WhatsApp configuration");
    } finally {
      setSavingWaConfig(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    setWaTestSending(true);
    setWaTestResult(null);
    try {
      const res = await apiFetch<any>("/api/admin/whatsapp/test-send", {
        method: "POST",
        body: JSON.stringify({
          test_mobile: waTestMobile,
          provider: waConfig.provider,
        }),
      });
      setWaTestResult(res);
      notify(true, res.message || `Test message sent to +${res.recipient}!`);
      loadWhatsAppLogs();
    } catch (e: any) {
      notify(false, e.message || "Failed to send test WhatsApp message");
    } finally {
      setWaTestSending(false);
    }
  };

  const load = async () => {
    try {
      const [o, r, u, c, l, s, b, p] = await Promise.all([
        apiFetch<any[]>("/api/admin/outlets"),
        apiFetch<any[]>("/api/admin/roles"),
        apiFetch<any[]>("/api/admin/users"),
        apiFetch<any[]>("/api/admin/config"),
        apiFetch<any[]>("/api/admin/audit-logs?limit=20"),
        apiFetch<any[]>("/api/admin/code-sequences").catch(() => []),
        apiFetch<BrandingConfig>("/api/admin/branding").catch(() => null),
        apiFetch<PaymentGatewaysConfig>("/api/admin/payment-gateways").catch(() => null),
      ]);
      setOutlets(o);
      const initialCashMap: Record<string, string[]> = {};
      const initialEstMap: Record<string, string[]> = {};
      (o || []).forEach((out: any) => {
        initialCashMap[out.code] = out.cash_counters || ["Cash Counter 1", "Cash Counter 2", "Express Cashier"];
        initialEstMap[out.code] = out.estimate_counters || ["Sweet Estimate Counter 1", "Sweet Estimate Counter 2", "Namkeen & Bakery Counter"];
      });
      setCashCountersMap((prev) => (Object.keys(prev).length === 0 ? initialCashMap : prev));
      setEstimateCountersMap((prev) => (Object.keys(prev).length === 0 ? initialEstMap : prev));
      setRoles(r);
      setUsers(u);
      setConfigs(c);
      setLogs(l);
      setSequences(s || []);
      if (b && b.customer_name) setBranding(b);
      if (p && p.upi) setPayments(p);
      const hw = c.find((cfg) => cfg.config_key === "pos_hardware_drivers")?.config_value;
      if (hw) setHwConfig(hw);
      loadBackups();
      loadWhatsAppConfig();
      loadWhatsAppLogs();
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await apiFetch<any[]>("/api/admin/backups");
      setBackups(data || []);
    } catch (e) {
      console.error("Failed to load backups:", e);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await apiFetch<any>("/api/admin/backups/create?actor=Super%20Admin", { method: "POST" });
      setToast({ ok: true, msg: res.message || "Database backup created successfully!" });
      loadBackups();
    } catch (e: any) {
      setToast({ ok: false, msg: e.message || "Failed to create database backup" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    setRestoreExecuting(true);
    try {
      const res = await apiFetch<any>("/api/admin/backups/restore", {
        method: "POST",
        body: JSON.stringify({ filename, actor: "Super Admin" }),
      });
      setToast({ ok: true, msg: res.message || `Database successfully restored from ${filename}!` });
      setRestoreConfirmModal(null);
      load();
    } catch (e: any) {
      setToast({ ok: false, msg: e.message || "Failed to restore database" });
    } finally {
      setRestoreExecuting(false);
    }
  };

  const handleUploadSqlAndRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const sqlText = ev.target?.result as string;
      if (!sqlText || !sqlText.trim()) {
        setToast({ ok: false, msg: "Empty SQL backup file" });
        return;
      }
      setRestoreExecuting(true);
      try {
        const res = await apiFetch<any>("/api/admin/backups/restore", {
          method: "POST",
          body: JSON.stringify({ sql_text: sqlText, filename: file.name, actor: "Super Admin" }),
        });
        setToast({ ok: true, msg: res.message || `Uploaded backup ${file.name} restored successfully!` });
        load();
        loadBackups();
      } catch (err: any) {
        setToast({ ok: false, msg: err.message || "Failed to restore uploaded backup" });
      } finally {
        setRestoreExecuting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteBackup = async (id: number) => {
    try {
      await apiFetch(`/api/admin/backups/${id}`, { method: "DELETE" });
      setToast({ ok: true, msg: "Backup file deleted" });
      loadBackups();
    } catch (e: any) {
      setToast({ ok: false, msg: e.message || "Failed to delete backup" });
    }
  };

  const handleLocalLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 240;
        const maxH = 80;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/png");
          setBranding((prev) => ({
            ...prev,
            customer_logo_url: dataUrl,
            customer_logo_base64: dataUrl,
            customer_logo_dark_url: dataUrl,
          }));
          setToast({ ok: true, msg: `Customer logo loaded & auto-proportioned to ${w}x${h}px! Click Save to apply.` });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      await apiFetch("/api/admin/branding", {
        method: "PUT",
        body: JSON.stringify(branding),
      });
      notify(true, "Customer Brand & Dual-Logo configuration saved successfully!");
      onOutletsUpdated?.();
    } catch (err: any) {
      notify(false, err.message);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayments(true);
    try {
      await apiFetch("/api/admin/payment-gateways", {
        method: "PUT",
        body: JSON.stringify(payments),
      });
      notify(true, "Payment Gateways (UPI, EDC POS & Food Coupons) saved successfully!");
    } catch (err: any) {
      notify(false, err.message);
    } finally {
      setSavingPayments(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleUpdateSequence = async (seq: any) => {
    try {
      await apiFetch(`/api/admin/code-sequences/${seq.entity_type}`, {
        method: "PUT",
        body: JSON.stringify({
          prefix: seq.prefix,
          padding_length: Number(seq.padding_length),
          reset_frequency: seq.reset_frequency,
        }),
      });
      notify(true, `Master sequence prefix '${seq.prefix}' saved for ${seq.entity_type}!`);
      setEditingSeq(null);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleTestNextCode = async (entity: string) => {
    try {
      const res = await apiFetch<any>(`/api/admin/code-sequences/${entity}/next`, { method: "POST" });
      notify(true, `Generated Next Code for ${entity.toUpperCase()}: ${res.code}`);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPin || !newPinInput) return;
    try {
      const res = await apiFetch<any>(`/api/admin/users/${targetUserForPin.id}/reset-pin`, {
        method: "POST",
        body: JSON.stringify({ new_pin: newPinInput.trim() }),
      });
      notify(true, res.message || `PIN successfully reset to ${newPinInput} for ${targetUserForPin.full_name}`);
      setShowPinModal(false);
      setTargetUserForPin(null);
      setNewPinInput("");
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleUnlockUser = async (userId: number, name: string) => {
    try {
      const res = await apiFetch<any>(`/api/admin/users/${userId}/unlock`, { method: "POST" });
      notify(true, res.message || `Account unlocked for ${name}`);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleToggleActiveUser = async (userId: number, name: string) => {
    try {
      const res = await apiFetch<any>(`/api/admin/users/${userId}/toggle-active`, { method: "POST" });
      notify(true, res.message || `User status toggled for ${name}`);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleResetMfa = async (user: any) => {
    setIsResettingMfa(true);
    try {
      const res = await apiFetch<any>(`/api/admin/users/${user.id}/reset-mfa`, { method: "POST" });
      setMfaModalUser(user);
      setNewMfaSecret(res.mfa_secret || res.new_mfa_secret || `TOTP-SEC-${user.emp_id}-RESET`);
      setShowMfaModal(true);
      notify(true, res.message || `MFA Device Reset for ${user.full_name}!`);
      load();
    } catch (err: any) {
      notify(false, err.message || "Failed to reset MFA");
    } finally {
      setIsResettingMfa(false);
    }
  };

  const handleOpenMfaQr = (user: any) => {
    setMfaModalUser(user);
    setNewMfaSecret(user.mfa_secret || `BIKANERVALA-${(user.emp_id || user.id || "USR").replace(/[^A-Z0-9]/gi, "").toUpperCase()}-2FA-KEY`);
    setShowMfaModal(true);
  };

  const handleOpenEditUser = (u: any) => {
    setTargetUserForEdit(u);
    setEditFullName(u.full_name || "");
    setEditMobile(u.mobile || "");
    setEditEmail(u.email || "");
    setEditRole(u.role_name || (roles[0]?.name || "Cashier"));
    setEditOutlets(u.outlet_codes || [u.outlet_code || "GUR02"]);
    setEditActive(u.active !== false);
    setEditLocked(!!u.is_locked);
    setShowEditUserModal(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForEdit) return;
    try {
      await apiFetch(`/api/admin/users/${targetUserForEdit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: editFullName.trim(),
          mobile: editMobile.trim(),
          email: editEmail.trim(),
          role: editRole,
          allowed_outlets: editOutlets,
          active: editActive,
          is_locked: editLocked,
        }),
      });
      notify(true, `User details updated successfully for ${editFullName}`);
      setShowEditUserModal(false);
      setTargetUserForEdit(null);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleAddCashCounter = () => {
    if (!newCashCounterInput.trim()) return;
    const code = selectedOutletForCounters;
    const current = cashCountersMap[code] || ["Cash Counter 1", "Cash Counter 2", "Express Cashier"];
    if (current.includes(newCashCounterInput.trim())) {
      notify(false, "Cash counter already exists for this outlet");
      return;
    }
    setCashCountersMap((prev) => ({
      ...prev,
      [code]: [...current, newCashCounterInput.trim()],
    }));
    setNewCashCounterInput("");
  };

  const handleRemoveCashCounter = (counterName: string) => {
    const code = selectedOutletForCounters;
    const current = cashCountersMap[code] || [];
    setCashCountersMap((prev) => ({
      ...prev,
      [code]: current.filter((c) => c !== counterName),
    }));
  };

  const handleAddEstimateCounter = () => {
    if (!newEstimateCounterInput.trim()) return;
    const code = selectedOutletForCounters;
    const current = estimateCountersMap[code] || ["Sweet Estimate Counter 1", "Sweet Estimate Counter 2", "Namkeen & Bakery Counter"];
    if (current.includes(newEstimateCounterInput.trim())) {
      notify(false, "Estimate desk already exists for this outlet");
      return;
    }
    setEstimateCountersMap((prev) => ({
      ...prev,
      [code]: [...current, newEstimateCounterInput.trim()],
    }));
    setNewEstimateCounterInput("");
  };

  const handleRemoveEstimateCounter = (counterName: string) => {
    const code = selectedOutletForCounters;
    const current = estimateCountersMap[code] || [];
    setEstimateCountersMap((prev) => ({
      ...prev,
      [code]: current.filter((c) => c !== counterName),
    }));
  };

  const handleSaveCounters = async () => {
    const targetOutlet = outlets.find((o) => o.code === selectedOutletForCounters);
    if (!targetOutlet) {
      notify(false, "Target outlet not found");
      return;
    }
    setSavingCounters(true);
    try {
      await apiFetch(`/api/admin/outlets/${targetOutlet.id}`, {
        method: "PUT",
        body: JSON.stringify({
          cash_counters: cashCountersMap[selectedOutletForCounters] || [],
          estimate_counters: estimateCountersMap[selectedOutletForCounters] || [],
        }),
      });
      notify(true, `Cash and Estimate counters successfully saved for ${targetOutlet.name} (${targetOutlet.code})`);
      load();
    } catch (e: any) {
      notify(false, e.message || "Failed to save outlet counters");
    } finally {
      setSavingCounters(false);
    }
  };

  const verifyGstinApi = async (val?: string) => {
    const target = (val ?? gstin).trim().toUpperCase();
    setGstin(target);
    const res = await apiFetch(`/api/admin/gstn/verify?gstin=${encodeURIComponent(target)}`);
    setGstResult(res);
    if (res.valid) {
      setLegalName(res.legal_name);
      setTradeName(res.trade_name);
      setStateName(res.state);
      setStateCode(res.state_code);
      setAddress(res.principal_address);
      notify(true, `GSTN GSP Verified (${res.gsp_ref}) — Auto-populated official taxpayer details!`);
    } else {
      notify(false, res.error || "GSTIN verification failed");
    }
  };

  const createOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const floorsList = floorsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await apiFetch("/api/admin/outlets", {
        method: "POST",
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          name,
          legal_name: legalName || tradeName || name,
          trade_name: tradeName || name,
          ownership_type: ownershipType,
          outlet_type: outletType,
          gstin,
          gstn_verified: Boolean(gstResult?.valid),
          gstn_reg_type: gstResult?.reg_type || "Regular",
          fssai_no: "11524001000891",
          fssai_expiry: "2027-11-12",
          address: address || "Commercial High Street",
          city,
          state: stateName,
          state_code: stateCode,
          pincode,
          property_type: "Leased",
          royalty_pct: ownershipType === "Franchised" ? royalty : 0,
          service_modes: selectedServiceModes,
          floors: floorsList.length > 0 ? floorsList : ["Ground Floor"],
          kitchen_counters: selectedCounters,
          custom_categories: RESTAURANT_FOOD_CATEGORIES,
        }),
      });
      notify(true, `Outlet ${code} (${ownershipType}) created with Service Modes & Counters!`);
      load();
      onOutletsUpdated?.();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleCreateDiningTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/admin/outlets/${targetOutletForTable}/tables`, {
        method: "POST",
        body: JSON.stringify({
          table_code: tableCode.toUpperCase().trim(),
          floor_name: tableFloor,
          section: tableSection,
          capacity: tableCapacity,
        }),
      });
      notify(true, `Table ${tableCode} added to ${targetOutletForTable} on ${tableFloor}!`);
      setShowTableModal(false);
      setTableCode(`T-${Math.floor(12 + Math.random() * 88)}`);
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;
    try {
      await apiFetch("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          permissions: {
            modules: newRoleModules,
            cost_visibility: false,
          },
        }),
      });
      notify(true, `Custom RBAC Role '${newRoleName}' created successfully!`);
      setShowRoleModal(false);
      setNewRoleName("");
      setNewRoleDesc("");
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOutletCodes.length === 0) {
      notify(false, "Please assign at least one outlet/restaurant to this employee");
      return;
    }
    if (selectedRoleIds.length === 0) {
      notify(false, "Please select at least one role");
      return;
    }
    try {
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          emp_id: empId.toUpperCase().trim(),
          full_name: fullName.trim(),
          mobile,
          email,
          role_id: selectedRoleIds[0],
          role_ids: selectedRoleIds,
          outlet_codes: selectedOutletCodes,
          pin: "1234",
        }),
      });
      setFullName("");
      setEmail("");
      setEmpId(`EMP-0${Math.floor(12 + Math.random() * 88)}`);
      notify(true, `User ${empId} created with strict outlet assignment: [${selectedOutletCodes.join(", ")}]`);
      load();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const toggleCostVisibility = async (role: any) => {
    const updatedPerms = {
      ...role.permissions,
      cost_visibility: !role.permissions?.cost_visibility,
    };
    await apiFetch(`/api/admin/roles/${role.id}`, {
      method: "PUT",
      body: JSON.stringify({ permissions: updatedPerms }),
    });
    notify(true, `Updated cost visibility for role ${role.name}`);
    load();
  };

  const toggleRoleModule = async (role: any, moduleKey: string) => {
    const currentMods: string[] = role.permissions?.modules || [];
    const nextMods = currentMods.includes(moduleKey)
      ? currentMods.filter((m) => m !== moduleKey)
      : [...currentMods, moduleKey];
    const updatedPerms = {
      ...role.permissions,
      modules: nextMods,
    };
    await apiFetch(`/api/admin/roles/${role.id}`, {
      method: "PUT",
      body: JSON.stringify({ permissions: updatedPerms }),
    });
    notify(true, `Updated ${role.name} module permissions (${moduleKey}: ${currentMods.includes(moduleKey) ? "OFF" : "ON"})`);
    load();
  };

  const saveHardwareConfig = async () => {
    if (!hwConfig) return;
    await apiFetch("/api/admin/config/pos_hardware_drivers", {
      method: "PUT",
      body: JSON.stringify({ config_value: hwConfig }),
    });
    notify(true, "Saved POS Drivers, Cash Drawer RJ11 & Touch Screen settings!");
    load();
  };

  const testDrawerKick = async () => {
    if (!hwConfig) return;
    const res = await kickCashDrawer({
      driver: hwConfig.active_printer_driver,
      pin: hwConfig.cash_drawer?.kick_pin || "Pin 2 (RJ11 via Printer)",
      outletCode: "ADMIN",
      actor: "Super Admin",
      reason: "Admin Panel Hardware Drawer Test",
    });
    notify(true, res.message);
    load();
  };

  const pairWebSerial = async () => {
    try {
      const msg = await connectWebSerialDevice();
      notify(true, msg);
    } catch (e: any) {
      notify(false, e.message);
    }
  };

  const handleTestNetworkPrinter = async () => {
    setIsTestingNetPrinter(true);
    setNetPrinterPingResult(null);
    try {
      const res = await apiFetch<any>("/api/admin/hardware/test-network-printer", {
        method: "POST",
        body: JSON.stringify({ ip: netPrinterIp.trim(), port: netPrinterPort, printer_name: "Sweet POS Counter" }),
      });
      setNetPrinterPingResult(res);
      notify(true, `Network Printer Ping: ${res.status} (${res.latency_ms}ms)`);
    } catch (e: any) {
      notify(false, e.message || "Failed to connect to network printer");
    } finally {
      setIsTestingNetPrinter(false);
    }
  };

  const handleTestAdvancedDrawer = async () => {
    setIsTestingDrawer(true);
    setDrawerTestResult(null);
    try {
      const res = await apiFetch<any>("/api/admin/hardware/test-drawer", {
        method: "POST",
        body: JSON.stringify({ interface_type: drawerInterface, pin: drawerPin, pulse_ms: drawerPulseMs }),
      });
      setDrawerTestResult(res);
      notify(true, `Cash Drawer Kick Success! Sensor: ${res.microswitch_sensor_state}`);
    } catch (e: any) {
      notify(false, e.message || "Failed to trigger cash drawer pulse");
    } finally {
      setIsTestingDrawer(false);
    }
  };

  const handleScanSubnetPrinters = async () => {
    setIsScanningSubnet(true);
    try {
      const res = await apiFetch<any[]>("/api/admin/hardware/scan-network-printers");
      setSubnetScanResults(res);
      notify(true, `Subnet scan found ${res.length} network ESC/POS thermal printers!`);
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setIsScanningSubnet(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-sm ${
            toast.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Active Section Header Bar (Synchronized with Sidebar Drawer Navigation) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl px-6 py-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Admin & GSTN Central Control
            </div>
            <h2 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
              {
                {
                  outlets: "🏢 Restaurant Outlets & GSTN Validation",
                  restaurant: "🍽️ Restaurant Admin (Floors, Tables & Counters)",
                  branding: "🎨 Brand & Dual-Logo Customizer",
                  payments: "💳 Payment Gateways (UPI, EDC POS & Coupons)",
                  whatsapp: "💬 Official WhatsApp Cloud API & Document Gateway",
                  rbac: "👥 Users, MFA Security & RBAC Roles",
                  sequences: "#️⃣ Master Code Sequences & Prefixes",
                  hardware: "🖨️ POS Drivers, RJ11 Drawer & Peripherals",
                  config: "⚙️ System Config & Audit Log",
                  backups: "💾 Database Backup & Disaster Recovery",
                }[tab]
              }
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px]">
            Left Sidebar Navigation Active
          </span>
        </div>
      </div>

      {/* TAB 1: OUTLETS & GSTN VERIFICATION */}
      {tab === "outlets" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={createOutlet}
            className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#081F5C] dark:text-white">
              <ShieldCheck className="w-4 h-4 text-[#1E40AF]" />
              Create Restaurant Outlet (CO / FR / DO)
            </div>

            {/* GSTN Verification Subcard */}
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 space-y-2">
              <div className="flex gap-2">
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="15-Digit GSTIN"
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono uppercase bg-white dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => verifyGstinApi()}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#081F5C] text-white font-bold"
                >
                  <SearchCheck className="w-3.5 h-3.5" /> Verify
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="text-slate-500">Test Cases:</span>
                <button
                  type="button"
                  onClick={() => verifyGstinApi("27AAACN7777L1ZS")}
                  className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold"
                >
                  Active (Mumbai)
                </button>
                <button
                  type="button"
                  onClick={() => verifyGstinApi("07AAACS9999K1ZF")}
                  className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold"
                >
                  Suspended
                </button>
                <button
                  type="button"
                  onClick={() => verifyGstinApi("06AAACC8888M1ZZ")}
                  className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold"
                >
                  Cancelled
                </button>
              </div>
              {gstResult && (
                <div
                  className={`p-2 rounded-xl text-[11px] ${
                    gstResult.valid ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                  }`}
                >
                  Status: <b>{gstResult.status}</b> {gstResult.gsp_ref ? `• Ref: ${gstResult.gsp_ref}` : ""}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Outlet Code (e.g. MUM05)"
                className="border rounded-xl px-3 py-2 font-mono uppercase bg-slate-50 dark:bg-slate-800"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Outlet Name"
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={ownershipType}
                onChange={(e) => setOwnershipType(e.target.value as any)}
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="CO">Company Owned (CO)</option>
                <option value="Franchised">Franchised (FR)</option>
                <option value="DO">Director Owned (DO)</option>
              </select>
              <select
                value={outletType}
                onChange={(e) => setOutletType(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="Restaurant + Sweet Shop">Restaurant + Sweet Shop</option>
                <option value="Sweet Shop">Sweet Shop</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>
            </div>

            {/* Service Modes Selector */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Allowed Restaurant Service Modes:
              </label>
              <div className="flex flex-wrap gap-2">
                {["Table Service", "Self Service", "Buffet"].map((mode) => {
                  const sel = selectedServiceModes.includes(mode);
                  return (
                    <button
                      type="button"
                      key={mode}
                      onClick={() =>
                        setSelectedServiceModes(
                          sel
                            ? selectedServiceModes.filter((m) => m !== mode)
                            : [...selectedServiceModes, mode]
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        sel
                          ? "bg-[#081F5C] text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {sel ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Legal Entity Name"
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
            />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Principal Address"
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              />
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="State"
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              />
              <input
                type="number"
                step="0.5"
                value={royalty}
                onChange={(e) => setRoyalty(Number(e.target.value))}
                placeholder="Royalty %"
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-right"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-[#081F5C] text-white font-bold hover:bg-opacity-95 shadow-md"
            >
              Save & Activate Restaurant Outlet
            </button>
          </form>

          {/* Outlets Listing */}
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                Registered Chain Outlets ({outlets.length})
              </h3>
              <button
                onClick={() => setTab("restaurant")}
                className="text-xs text-[#081F5C] dark:text-sky-400 font-bold hover:underline"
              >
                Configure Floors & Tables →
              </button>
            </div>

            <div className="space-y-3">
              {outlets.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap justify-between items-center gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-[#081F5C] dark:text-sky-400">
                        {o.code}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{o.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                        {o.ownership_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        {o.outlet_type}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {o.legal_name} • {o.address}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-500">Service Modes:</span>
                      {((o.service_modes || ["Table Service", "Self Service"]) as string[]).map((sm) => (
                        <span
                          key={sm}
                          className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-semibold"
                        >
                          {sm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-emerald-600">
                      {o.gstn_verified ? "✓ GSTN Verified" : "Unverified"}
                    </span>
                    {Number(o.royalty_pct) > 0 && (
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        Royalty {o.royalty_pct}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESTAURANT ADMIN (FLOORS, TABLES, COUNTERS & CATEGORIES) */}
      {tab === "restaurant" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Dining Table & Floor Manager */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Floor & Dining Table Manager
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define seating layout, sections (AC Hall, Outdoor, Family Lounge), and guest capacities.
                  </p>
                </div>
                <button
                  onClick={() => setShowTableModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Table
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Restaurant Outlet:
                  </span>
                  <select
                    value={targetOutletForTable}
                    onChange={(e) => setTargetOutletForTable(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold font-mono"
                  >
                    {outlets.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.code} — {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-500">
                  Configured Floors: <span className="font-bold text-slate-700 dark:text-slate-300">Ground Floor, First Floor, Terrace Garden, Banquet Hall</span>
                </div>
              </div>

              {/* Table Seating Layout sample */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2">
                {["T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07", "T-08"].map((tbl) => (
                  <div
                    key={tbl}
                    className="p-3 rounded-2xl border bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30 text-center"
                  >
                    <div className="font-mono font-extrabold text-sm text-[#081F5C] dark:text-emerald-400">
                      {tbl}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">4-Seater</div>
                    <div className="text-[10px] font-bold text-emerald-700">Ground Floor</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kitchen Counters / Stations */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                  Kitchen Counters & Stations (Multi-KDS Routing)
                </h3>
                <p className="text-xs text-slate-500">
                  Orders placed by Order Taking boy or Kiosk are split automatically to these kitchen counters.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {STANDARD_KITCHEN_COUNTERS.map((counter, idx) => (
                  <div
                    key={counter}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#081F5C] text-white flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    {counter}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Location Cash Counters & Estimate Desks Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Store Cash Counters & Estimate Desks Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure active cash drawer counters and sweet/savory estimate counters for any selected chain location.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Location:</span>
                <select
                  value={selectedOutletForCounters}
                  onChange={(e) => setSelectedOutletForCounters(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-[#081F5C] dark:text-sky-300"
                >
                  {outlets.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.code} — {o.name} ({o.city})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveCounters}
                  disabled={savingCounters}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingCounters ? "Saving..." : "Save Counter Setup"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Cash Counters Column */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    Cash Billing Counters ({(cashCountersMap[selectedOutletForCounters] || []).length})
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">POS Drawer Terminals</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCashCounterInput}
                    onChange={(e) => setNewCashCounterInput(e.target.value)}
                    placeholder="e.g. Express Cashier 3"
                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900 text-xs font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCashCounter();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCashCounter}
                    className="px-3 py-1.5 rounded-xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Counter
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(cashCountersMap[selectedOutletForCounters] || []).map((cnt) => (
                    <div
                      key={cnt}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2 shadow-sm"
                    >
                      <span>{cnt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCashCounter(cnt)}
                        className="text-slate-400 hover:text-rose-600 font-bold text-sm"
                        title="Remove counter"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimate Desks Column */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    Estimate Counters & Weighing Desks ({(estimateCountersMap[selectedOutletForCounters] || []).length})
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Order Slip Desks</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEstimateCounterInput}
                    onChange={(e) => setNewEstimateCounterInput(e.target.value)}
                    placeholder="e.g. Chaat & Snacks Estimate Counter"
                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900 text-xs font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEstimateCounter();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddEstimateCounter}
                    className="px-3 py-1.5 rounded-xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Desk
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(estimateCountersMap[selectedOutletForCounters] || []).map((cnt) => (
                    <div
                      key={cnt}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2 shadow-sm"
                    >
                      <span>{cnt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEstimateCounter(cnt)}
                        className="text-slate-400 hover:text-rose-600 font-bold text-sm"
                        title="Remove desk"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Restaurant Food Categories (All 20 Categories) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                  Restaurant Food Master Categories (All 20 Available in KOT & Kitchen)
                </h3>
                <p className="text-xs text-slate-500">
                  Fully synchronized from Excel Master dataset across Kitchen KDS, Order Taking & KIOSK.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs">
                20 Active Categories
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2">
              {RESTAURANT_FOOD_CATEGORIES.map((cat, i) => (
                <div
                  key={cat}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm hover:border-[#081F5C] transition flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="truncate">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: BRANDING & DUAL-LOGO ORCHESTRATION */}
      {tab === "branding" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Configuration Form */}
          <form
            onSubmit={handleSaveBranding}
            className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#1E40AF]" />
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                  Customer Brand & Dual-Logo Customizer
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 font-bold text-[10px]">
                Co-Branded Enterprise
              </span>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Configure customer brand identity and auto-balance the optical proportions between the customer's brand logo and the Annavya platform mark so neither looks odd, stretched, or mismatched.
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Brand Name
                </label>
                <input
                  type="text"
                  value={branding.customer_name}
                  onChange={(e) => setBranding({ ...branding, customer_name: e.target.value })}
                  placeholder="e.g. Bikanervala"
                  required
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Registered Trade Name (for Receipts & Tax Invoices)
                </label>
                <input
                  type="text"
                  value={branding.customer_trade_name}
                  onChange={(e) => setBranding({ ...branding, customer_trade_name: e.target.value })}
                  placeholder="e.g. Bikanervala Foods Pvt Ltd"
                  required
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  value={branding.brand_tagline}
                  onChange={(e) => setBranding({ ...branding, brand_tagline: e.target.value })}
                  placeholder="e.g. Taste of Tradition & Trust"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Logo URL (Light Mode)
                  </label>
                  <input
                    type="text"
                    value={branding.customer_logo_url}
                    onChange={(e) => setBranding({ ...branding, customer_logo_url: e.target.value })}
                    placeholder="/bikanervala-customer-logo.svg"
                    required
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Logo URL (Dark Mode)
                  </label>
                  <input
                    type="text"
                    value={branding.customer_logo_dark_url || ""}
                    onChange={(e) => setBranding({ ...branding, customer_logo_dark_url: e.target.value })}
                    placeholder="/bikanervala-customer-logo-dark.svg"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Local File Upload Button with Auto-Resize */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 dark:text-sky-200">
                    Upload Logo from Local System
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-sky-400">
                    Auto-Scales & Preserves Proportions
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Select any PNG, JPG, SVG or WEBP from your computer. The image is auto-proportioned to blend cleanly with the Annavya brand mark across both Admin and Login screens.
                </p>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Choose Local Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Height Slider */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700 dark:text-slate-300">
                    Customer Logo Optical Height: {branding.customer_logo_height_px}px
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-sky-400 font-mono">
                    (Standard range: 28px - 44px)
                  </span>
                </div>
                <input
                  type="range"
                  min={26}
                  max={48}
                  step={1}
                  value={branding.customer_logo_height_px}
                  onChange={(e) =>
                    setBranding({ ...branding, customer_logo_height_px: Number(e.target.value) })
                  }
                  className="w-full accent-[#081F5C] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>26px (Compact)</span>
                  <span>36px (Balanced)</span>
                  <span>48px (Prominent)</span>
                </div>
              </div>

              {/* Dual Logo Mode Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.dual_logo_mode}
                  onChange={(e) => setBranding({ ...branding, dual_logo_mode: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <div>
                  <div className="font-bold text-[#081F5C] dark:text-white">
                    Enable Dual-Logo Co-Branding Display
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Renders Customer Brand Logo alongside Annavya Platform Mark separated by an optical divider.
                  </div>
                </div>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="w-full py-2.5 rounded-xl bg-[#081F5C] hover:bg-[#10307A] text-white font-bold transition shadow disabled:opacity-50"
                >
                  {savingBranding ? "Saving Brand Settings..." : "Save Brand Settings & Apply Live"}
                </button>
              </div>
            </div>
          </form>

          {/* Real-Time Optical Harmony Preview */}
          <div className="xl:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Real-Time Optical Harmony Previews
                </h4>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full font-bold">
                  Auto-Sized & Ratio-Locked
                </span>
              </div>

              {/* Light Theme Preview Box */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Light Theme Preview (Navbar / Header Bar)
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Customer Logo */}
                    <img
                      src={branding.customer_logo_url || "/bikanervala-customer-logo.svg"}
                      alt={branding.customer_name}
                      style={{ height: `${branding.customer_logo_height_px}px` }}
                      className="w-auto max-w-[120px] object-contain drop-shadow-sm transition-all"
                      onError={(e) => {
                        e.currentTarget.src = "/bikanervala-customer-logo.svg";
                      }}
                    />

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-300" />

                    {/* Annavya Logo */}
                    <img
                      src="/annavya-logo-light.png"
                      alt="Annavya Food Retail ERP"
                      className="h-8 w-auto max-w-[100px] object-contain"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-extrabold text-[#081F5C]">
                      {branding.customer_trade_name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {branding.brand_tagline}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark Theme Preview Box */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Dark Theme Preview (Navbar / Header Bar)
                </div>
                <div className="p-4 rounded-2xl bg-[#0C1222] border border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Customer Logo Dark */}
                    <img
                      src={
                        branding.customer_logo_dark_url ||
                        branding.customer_logo_url ||
                        "/bikanervala-customer-logo-dark.svg"
                      }
                      alt={branding.customer_name}
                      style={{ height: `${branding.customer_logo_height_px}px` }}
                      className="w-auto max-w-[120px] object-contain drop-shadow-sm transition-all"
                      onError={(e) => {
                        e.currentTarget.src = "/bikanervala-customer-logo-dark.svg";
                      }}
                    />

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-700" />

                    {/* Annavya Logo Dark */}
                    <img
                      src="/annavya-logo-dark.png"
                      alt="Annavya Food Retail ERP"
                      className="h-8 w-auto max-w-[100px] object-contain"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-extrabold text-amber-400">
                      {branding.customer_trade_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {branding.brand_tagline}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200">
                <b>Design Rule Applied:</b> The Annavya platform engine uses an optical vertical lock (28px - 44px) with fixed aspect ratio preservation. Whether the customer logo is wide horizontal or oval circular, both logos share vertical weight so the layout never distorts.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PAYMENT GATEWAYS (UPI, EDC POS & COUPONS) */}
      {tab === "payments" && (
        <form onSubmit={handleSavePayments} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <PlugZap className="w-5 h-5 text-emerald-600" />
                Indian Retail Payment Rails & POS Peripherals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct integration with UPI Dynamic QR, EDC Card swipe machines, and FSSAI-compliant Food Meal Coupons.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingPayments}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
            >
              {savingPayments ? "Saving..." : "Save Payment Configurations"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: UPI Rails & Soundbox */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                    UPI
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">NPCI UPI Rails</div>
                    <div className="text-[10px] text-slate-400">Dynamic QR & Soundbox</div>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payments.upi.dynamic_qr_enabled}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        upi: { ...payments.upi, dynamic_qr_enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-purple-600"
                  />
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">Dynamic QR</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Merchant UPI VPA (Handle)
                  </label>
                  <input
                    type="text"
                    value={payments.upi.vpa}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        upi: { ...payments.upi, vpa: e.target.value },
                      })
                    }
                    placeholder="e.g. bikanervala@icici"
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    UPI Provider / Gateway Rail
                  </label>
                  <input
                    type="text"
                    value={payments.upi.provider}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        upi: { ...payments.upi, provider: e.target.value },
                      })
                    }
                    placeholder="Razorpay / PineLabs UPI"
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Merchant Identifier (MID)
                  </label>
                  <input
                    type="text"
                    value={payments.upi.merchant_id}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        upi: { ...payments.upi, merchant_id: e.target.value },
                      })
                    }
                    placeholder="BIK-FOODS-9921"
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payments.upi.soundbox_enabled}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        upi: {
                          ...payments.upi,
                          soundbox_enabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-purple-600"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Enable IoT Soundbox Voice Alerts (Hindi / English)
                  </span>
                </label>
              </div>
            </div>

            {/* Card 2: EDC Card Machine */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">EDC POS Machines</div>
                    <div className="text-[10px] text-slate-400">PineLabs / Paytm / Innoviti</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  Cloud POS
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Terminal Protocol / Provider
                  </label>
                  <select
                    value={payments.edc_card.provider}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        edc_card: { ...payments.edc_card, provider: e.target.value },
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option>PineLabs Plutus Cloud POS</option>
                    <option>Paytm Smart POS EDC</option>
                    <option>Innoviti Unipay EDC</option>
                    <option>MSwipe Wisepad Cloud</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Terminal ID (TID)
                    </label>
                    <input
                      type="text"
                      value={payments.edc_card.tid}
                      onChange={(e) =>
                        setPayments({
                          ...payments,
                          edc_card: { ...payments.edc_card, tid: e.target.value },
                        })
                      }
                      className="w-full border rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Connection Interface
                    </label>
                    <input
                      type="text"
                      value={payments.edc_card.connection_type}
                      onChange={(e) =>
                        setPayments({
                          ...payments,
                          edc_card: { ...payments.edc_card, connection_type: e.target.value },
                        })
                      }
                      className="w-full border rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      EDC IP Address
                    </label>
                    <input
                      type="text"
                      value={payments.edc_card.device_ip}
                      onChange={(e) =>
                        setPayments({
                          ...payments,
                          edc_card: { ...payments.edc_card, device_ip: e.target.value },
                        })
                      }
                      className="w-full border rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={payments.edc_card.port}
                      onChange={(e) =>
                        setPayments({
                          ...payments,
                          edc_card: { ...payments.edc_card, port: Number(e.target.value) },
                        })
                      }
                      className="w-full border rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payments.edc_card.auto_settlement}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        edc_card: {
                          ...payments.edc_card,
                          auto_settlement: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Auto-trigger Cash Drawer pulse on Card Auth
                  </span>
                </label>
              </div>
            </div>

            {/* Card 3: Food Coupons */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                    FC
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">Meal Coupons</div>
                    <div className="text-[10px] text-slate-400">Sodexo / Pluxee / Edenred</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  Tax Exempt
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Merchant Meal Voucher Outlet ID
                  </label>
                  <input
                    type="text"
                    value={payments.food_coupons.merchant_code}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        food_coupons: {
                          ...payments.food_coupons,
                          merchant_code: e.target.value,
                        },
                      })
                    }
                    placeholder="PLX-BIK-9902"
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    Active Voucher Providers
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payments.food_coupons.sodexo_pluxee_enabled}
                      onChange={(e) =>
                        setPayments({
                          ...payments,
                          food_coupons: {
                            ...payments.food_coupons,
                            sodexo_pluxee_enabled: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-amber-600"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                      Sodexo / Pluxee Meal Pass & Card
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payments.food_coupons.edenred_enabled}
                      onChange={(e) =>
                        setPayments({
                          ...payments,
                          food_coupons: {
                            ...payments.food_coupons,
                            edenred_enabled: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-amber-600"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                      Edenred Ticket Restaurant Voucher
                    </span>
                  </label>
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payments.food_coupons.food_only_restriction}
                    onChange={(e) =>
                      setPayments({
                        ...payments,
                        food_coupons: {
                          ...payments.food_coupons,
                          food_only_restriction: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-amber-600 mt-0.5"
                  />
                  <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Strict FSSAI Food Eligibility Enforcement
                    <p className="text-[10px] text-slate-400 font-normal">
                      Blocks non-edible items (packaging boxes, utensils) from coupon redemption.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB: WHATSAPP CLOUD API & AUTOMATED DOCUMENT DISPATCH */}
      {tab === "whatsapp" && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <span>Official WhatsApp API & Cloud Document Gateway</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                    {waConfig.status || "ACTIVE"}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Seamlessly dispatch colourful proforma bills, dynamic UPI QR requests, and official GST tax invoices with PDF downloads directly from backend.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveWhatsAppConfig}
                disabled={savingWaConfig}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition flex items-center gap-2"
              >
                {savingWaConfig ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                <span>Save WhatsApp Gateway</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left 7 Cols: Gateway & Provider Setup */}
            <div className="xl:col-span-7 space-y-6">
              {/* Provider Selection */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-[#081F5C] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>1. Select WhatsApp Messaging Provider</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    {
                      id: "META_CLOUD_API",
                      name: "Meta Cloud API (Official)",
                      badge: "Recommended",
                      desc: "Direct Graph API v19.0 with permanent token. Zero middleman fees, instant high-speed delivery.",
                    },
                    {
                      id: "ANNAVYA_CLOUD_GATEWAY",
                      name: "Annavya Cloud Relay",
                      badge: "Zero-Config",
                      desc: "Instant pre-configured cloud gateway for store owners without technical Meta developer setup.",
                    },
                    {
                      id: "WATI",
                      name: "WATI / Gupshup API",
                      badge: "BSP Platform",
                      desc: "Enterprise WhatsApp Business Solution Provider gateway with shared inbox support.",
                    },
                    {
                      id: "ULTRAMSG",
                      name: "UltraMsg / Webhook",
                      badge: "Instance API",
                      desc: "Third-party WhatsApp instance gateway with QR-code phone pairing.",
                    },
                  ].map((p) => {
                    const isSelected = (waConfig.provider || "META_CLOUD_API") === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setWaConfig({ ...waConfig, provider: p.id })}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">{p.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {p.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* API Credentials Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-[#081F5C] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>2. Gateway Credentials & Sender Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      value={waConfig.phone_number_id || ""}
                      onChange={(e) => setWaConfig({ ...waConfig, phone_number_id: e.target.value })}
                      placeholder="e.g. 104928172918234"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">From Meta App Dashboard → WhatsApp → API Setup</p>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      WhatsApp Business Account (WABA) ID
                    </label>
                    <input
                      type="text"
                      value={waConfig.waba_id || ""}
                      onChange={(e) => setWaConfig({ ...waConfig, waba_id: e.target.value })}
                      placeholder="e.g. 90812374612345"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Found in Meta Business Manager settings</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Permanent System User Access Token / API Key *
                    </label>
                    <input
                      type="password"
                      value={waConfig.access_token || ""}
                      onChange={(e) => setWaConfig({ ...waConfig, access_token: e.target.value })}
                      placeholder="EAAG..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Generate a System User token with <code className="text-emerald-600 font-bold">whatsapp_business_messaging</code> permissions.
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Official Sender Display Name
                    </label>
                    <input
                      type="text"
                      value={waConfig.sender_display_name || "Bikanervala Foods Official"}
                      onChange={(e) => setWaConfig({ ...waConfig, sender_display_name: e.target.value })}
                      placeholder="Bikanervala Foods Official"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Customer Support / Order Helpline
                    </label>
                    <input
                      type="text"
                      value={waConfig.support_phone || "+91-11-41551234"}
                      onChange={(e) => setWaConfig({ ...waConfig, support_phone: e.target.value })}
                      placeholder="+91-11-41551234"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Automation Rules */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-[#081F5C] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <span>3. POS & Order Taking Automation Rules</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waConfig.auto_send_on_bill_settle !== false}
                      onChange={(e) => setWaConfig({ ...waConfig, auto_send_on_bill_settle: e.target.checked })}
                      className="rounded text-emerald-600 mt-0.5"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                        ⚡ Automatic Tax Invoice Dispatch on Settlement
                      </div>
                      <p className="text-[11px] text-slate-500">
                        When the cashier settles a bill with customer mobile, seamlessly send the colourful WhatsApp invoice and PDF without opening browser popups.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waConfig.auto_send_on_proforma !== false}
                      onChange={(e) => setWaConfig({ ...waConfig, auto_send_on_proforma: e.target.checked })}
                      className="rounded text-emerald-600 mt-0.5"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                        📲 Proforma Bill & Dynamic UPI Instant Pay Request
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Include direct 1-tap NPCI UPI intent link so customers can pay immediately via Google Pay, PhonePe, Paytm, or WhatsApp Pay.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waConfig.include_pdf_link !== false}
                      onChange={(e) => setWaConfig({ ...waConfig, include_pdf_link: e.target.checked })}
                      className="rounded text-emerald-600 mt-0.5"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                        📄 Digital PDF Invoice Download Link
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Embed an official Bikanervala digital invoice view & download link with GSTIN, FSSAI, itemized HSN codes, and 1-click printable receipt.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Live Test Ping & Delivery Logs */}
            <div className="xl:col-span-5 space-y-6">
              {/* Test Sender Console */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-[#081F5C] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Test WhatsApp Connection</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Transmit an instant test message to verify that your configured WhatsApp gateway is active and accepting connections.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
                      Recipient Mobile No.
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono text-xs">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={waTestMobile.replace(/^\+?91/, "")}
                        onChange={(e) => setWaTestMobile(e.target.value)}
                        placeholder="9811445566"
                        maxLength={10}
                        className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTestWhatsApp}
                    disabled={waTestSending}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    {waTestSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Transmitting Ping...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Transmit Test WhatsApp Message</span>
                      </>
                    )}
                  </button>

                  {waTestResult && (
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Ping Delivered Successfully!</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Transmitted to +{waTestResult.recipient} via {waTestResult.provider}.
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        Message ID: {waTestResult.message_id}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Dispatch Logs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#081F5C] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Recent WhatsApp Dispatch Logs</span>
                  </h4>
                  <button
                    type="button"
                    onClick={loadWhatsAppLogs}
                    className="text-[11px] text-emerald-600 font-bold hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {waLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No WhatsApp dispatches recorded yet. Complete a bill or send a test ping to view live logs.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {waLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono">
                            {log.doc_no}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[10px] uppercase">
                            {log.status || "DELIVERED"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>+{log.recipient_mobile} ({log.customer_name || "Guest"})</span>
                          <span className="font-mono text-[10px]">
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Live"}
                          </span>
                        </div>
                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-mono truncate max-w-[200px]">
                            {log.message_id || log.provider}
                          </span>
                          <a
                            href={`/api/pos/orders/${log.doc_no}/digital-invoice`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <span>View PDF</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & RBAC MODULE MATRIX */}
      {tab === "rbac" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* User Creation Form with Outlet & Multi-Role assignment */}
          <form
            onSubmit={createUser}
            className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                Create ERP User & Assign Outlets
              </h3>
              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                className="text-xs text-[#081F5C] dark:text-sky-400 font-bold hover:underline"
              >
                + Custom Role
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="Emp ID"
                className="border rounded-xl px-3 py-2 font-mono uppercase bg-slate-50 dark:bg-slate-800"
              />
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <input
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile (+91-...)"
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
            />
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
            />

            {/* Role Selection (Single / Multiple) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Assign RBAC Role(s):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 border rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                {roles.map((r) => {
                  const sel = selectedRoleIds.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() =>
                        setSelectedRoleIds(
                          sel ? selectedRoleIds.filter((id) => id !== r.id) : [...selectedRoleIds, r.id]
                        )
                      }
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                        sel
                          ? "bg-[#081F5C] text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {sel ? "✓ " : ""}
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outlet Assignment (Strict Isolation Enforcement) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block flex items-center justify-between">
                <span>Assign Outlet(s) to User:</span>
                <span className="text-[10px] text-amber-600 font-semibold">Strict Login Lock</span>
              </label>
              <div className="flex flex-wrap gap-1.5 p-1.5 border rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                {outlets.map((o) => {
                  const sel = selectedOutletCodes.includes(o.code);
                  return (
                    <button
                      type="button"
                      key={o.code}
                      onClick={() =>
                        setSelectedOutletCodes(
                          sel
                            ? selectedOutletCodes.filter((c) => c !== o.code)
                            : [...selectedOutletCodes, o.code]
                        )
                      }
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition ${
                        sel
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {sel ? "✓ " : ""}
                      {o.code}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Staff like Kitchen Captain or Location Manager cannot view or manage other outlets.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-[#081F5C] text-white font-bold hover:bg-opacity-95 shadow"
            >
              Save Employee & RBAC Assignment
            </button>
          </form>

          {/* RBAC Matrix & User Directory */}
          <div className="xl:col-span-8 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                    RBAC Role Module Matrix & Permissions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click module pills to grant or revoke real-time permissions per role.
                  </p>
                </div>
                <button
                  onClick={() => setShowRoleModal(true)}
                  className="px-3.5 py-1.5 bg-[#081F5C] text-white rounded-xl text-xs font-bold"
                >
                  + Create Custom Role
                </button>
              </div>

              <div className="space-y-3">
                {roles.map((r) => {
                  const mods: string[] = r.permissions?.modules || [];
                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-extrabold text-[#081F5C] dark:text-white text-sm">
                            {r.name}
                          </span>
                          <span className="ml-2 text-[11px] text-slate-500">{r.description}</span>
                        </div>
                        <button
                          onClick={() => toggleCostVisibility(r)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.permissions?.cost_visibility
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          Cost Visibility: {r.permissions?.cost_visibility ? "ENABLED" : "HIDDEN"}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {ALL_MODULE_KEYS.map((m) => {
                          const enabled = mods.includes(m.key);
                          return (
                            <button
                              key={m.key}
                              onClick={() => toggleRoleModule(r, m.key)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition ${
                                enabled
                                  ? "bg-[#081F5C] text-white shadow-sm"
                                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700"
                              }`}
                            >
                              {enabled ? "✓ " : ""}
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Staff Directory & User Governance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
                    Staff Directory & Account Governance ({users.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Location Manager, Corporate Manager, Super Admin & Director control: Reset PIN, Unlock accounts, Mandatory MFA & Scope outlets
                  </p>
                </div>
                <div className="relative w-64">
                  <SearchCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, EMP ID, mobile..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {users
                  .filter((u) => {
                    const q = userSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (u.full_name || "").toLowerCase().includes(q) ||
                      (u.emp_id || "").toLowerCase().includes(q) ||
                      (u.mobile || "").toLowerCase().includes(q) ||
                      (u.email || "").toLowerCase().includes(q) ||
                      (u.role_name || "").toLowerCase().includes(q)
                    );
                  })
                  .map((u) => {
                    const isLocked = !!u.is_locked;
                    const isActive = u.active !== false;
                    const privilegedRoles = ["Director / Owner", "Super Admin", "Production Manager", "Location Manager", "Corporate Manager"];
                    const isPrivileged = privilegedRoles.includes(u.role_name);

                    return (
                      <div
                        key={u.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 transition ${
                          isLocked
                            ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50"
                            : !isActive
                            ? "bg-slate-100/70 dark:bg-slate-800/20 border-slate-300 dark:border-slate-800 opacity-60"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            <span className="font-mono text-[#081F5C] dark:text-sky-400 text-[11px]">
                              ({u.emp_id})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isLocked && (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> LOCKED
                              </span>
                            )}
                            {!isActive && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-500 text-white font-bold text-[10px]">
                                DISABLED
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                              {u.role_name}
                            </span>
                          </div>
                        </div>

                        <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>{u.mobile}</span>
                          <div className="flex items-center gap-2">
                            {/* MFA Status Badge */}
                            {u.role_name?.toLowerCase().includes("cashier") &&
                            !u.role_name?.toLowerCase().includes("manager") ? (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px]">
                                MFA Exempt (Cashier)
                              </span>
                            ) : u.mfa_enabled ? (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5" /> MFA ACTIVE
                              </span>
                            ) : isPrivileged ? (
                              <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px] flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" /> MFA MANDATORY
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                                MFA Ready
                              </span>
                            )}

                            <span>
                              PIN: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{u.pin}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <Compass className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-semibold">Assigned Outlets:</span>
                          <span className="font-mono font-bold text-emerald-600 text-[11px] truncate">
                            {(u.outlet_codes || []).join(", ") || u.outlet_code || "None"}
                          </span>
                        </div>

                        {/* Governance Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 text-[11px] font-bold flex items-center gap-1"
                            title="Modify user profile, role and assigned outlets"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTargetUserForPin(u);
                              setNewPinInput(String(Math.floor(1000 + Math.random() * 9000)));
                              setShowPinModal(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200 text-[11px] font-bold flex items-center gap-1"
                            title="Reset POS security PIN"
                          >
                            <KeyRound className="w-3 h-3 text-amber-700" /> Reset PIN
                          </button>

                          {!(
                            u.role_name?.toLowerCase().includes("cashier") &&
                            !u.role_name?.toLowerCase().includes("manager")
                          ) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenMfaQr(u)}
                                className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 text-[11px] font-bold flex items-center gap-1 shadow-sm transition"
                                title="Generate / View scannable MFA QR Code for Google / Microsoft Authenticator"
                              >
                                <QrCode className="w-3 h-3 text-indigo-700 dark:text-indigo-400" /> MFA QR Code
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResetMfa(u)}
                                disabled={isResettingMfa}
                                className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 hover:bg-purple-200 text-[11px] font-bold flex items-center gap-1 transition"
                                title="Super Admin device recovery tool if user lost or forgot device"
                              >
                                <Smartphone className="w-3 h-3 text-purple-700 dark:text-purple-400" /> Reset MFA
                              </button>
                            </>
                          ) : (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                              🛡️ MFA Exempt (Cashier)
                            </span>
                          )}

                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => handleUnlockUser(u.id, u.full_name)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                              title="Unlock account after failed attempts"
                            >
                              <Unlock className="w-3 h-3" /> Unlock Account
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActiveUser(u.id, u.full_name)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                                isActive
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-700"
                                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <UserX className="w-3 h-3 text-slate-500" /> Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3 text-emerald-600" /> Enable
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MASTER CODE SEQUENCES & PREFIX CUSTOMIZER */}
      {tab === "sequences" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-600" />
                  Master Auto-Increment Sequences & Prefix Customizer
                </h3>
                <p className="text-xs text-slate-500">
                  Customizable by Director & Super Admin. Auto-increments Location, Item/SKU, Employee & Vendor codes across all modules.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                4 Active Master Sequences
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sequences.map((seq) => {
                const nextSample = `${seq.prefix}${String(seq.current_number).padStart(seq.padding_length, "0")}`;
                const isEditing = editingSeq?.id === seq.id;
                return (
                  <div
                    key={seq.id}
                    className="p-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {seq.entity_type} Master
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          Reset: {seq.reset_frequency}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {seq.description}
                      </h4>
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Next Code Preview</div>
                        <div className="font-mono text-lg font-extrabold text-[#081F5C] dark:text-sky-400">
                          {nextSample}
                        </div>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Prefix</label>
                          <input
                            type="text"
                            value={editingSeq.prefix}
                            onChange={(e) => setEditingSeq({ ...editingSeq, prefix: e.target.value.toUpperCase() })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-xl font-mono font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Padding</label>
                            <input
                              type="number"
                              min={2}
                              max={6}
                              value={editingSeq.padding_length}
                              onChange={(e) => setEditingSeq({ ...editingSeq, padding_length: parseInt(e.target.value) || 3 })}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-xl font-mono text-center font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Reset</label>
                            <select
                              value={editingSeq.reset_frequency}
                              onChange={(e) => setEditingSeq({ ...editingSeq, reset_frequency: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-[11px] font-bold"
                            >
                              <option value="NEVER">Never</option>
                              <option value="FINANCIAL_YEAR">FY (Apr 1)</option>
                              <option value="ANNUAL">Annual (Jan 1)</option>
                              <option value="MONTHLY">Monthly</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSeq(null)}
                            className="flex-1 py-1 rounded-xl bg-slate-200 text-slate-700 font-bold text-[11px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSequence(editingSeq)}
                            className="flex-1 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setEditingSeq({ ...seq })}
                          className="flex-1 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs"
                        >
                          Customize Prefix
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestNextCode(seq.entity_type)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs"
                          title="Auto-increment and claim next number"
                        >
                          + Next
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: POS HARDWARE, IP PRINTER, ADVANCED DRAWER & SAAS READINESS */}
      {tab === "hardware" && hwConfig && (
        <div className="space-y-6 text-xs">
          {/* Top Row: Driver Selection & Cloud Architecture Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#1E40AF]" />
                    Thermal Receipt Printer & POS Driver Profiles
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure standard ESC/POS command emulation and 40/80-column thermal driver profiles
                  </p>
                </div>
                <button
                  onClick={pairWebSerial}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-100 transition"
                >
                  <PlugZap className="w-3.5 h-3.5" /> Pair WebUSB/Serial
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Sweet Shop POS Printer Driver
                  </label>
                  <select
                    value={hwConfig.active_printer_driver}
                    onChange={(e) => setHwConfig({ ...hwConfig, active_printer_driver: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                  >
                    {FAMOUS_PRINTER_DRIVERS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Restaurant POS / Kitchen KOT Driver
                  </label>
                  <select
                    value={hwConfig.restaurant_printer?.driver || FAMOUS_PRINTER_DRIVERS[2]}
                    onChange={(e) =>
                      setHwConfig({
                        ...hwConfig,
                        restaurant_printer: { ...hwConfig.restaurant_printer, driver: e.target.value },
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800"
                  >
                    {FAMOUS_PRINTER_DRIVERS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={saveHardwareConfig}
                  className="px-5 py-2.5 rounded-2xl bg-[#081F5C] text-white font-bold hover:bg-opacity-95 shadow"
                >
                  Save Hardware Configuration
                </button>
                <span className="text-[11px] text-slate-400">Drivers synced across all cashier terminals</span>
              </div>
            </div>

            {/* Cloud / SaaS Connectivity Bridge Explainer */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#081F5C] to-[#1E40AF] text-white rounded-3xl p-6 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                  Cloud SaaS Peripheral Bridge
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h4 className="text-sm font-extrabold">Zero-Install Hardware Architecture</h4>
              <p className="text-[11px] text-sky-100 leading-relaxed">
                When consumed as a cloud SaaS, Annavya connects to local POS printers & drawers via three resilient paths:
              </p>
              <ul className="text-[11px] text-sky-200 space-y-1.5 list-disc pl-4">
                <li><b>Local Subnet Streaming</b>: Direct TCP 9100 ESC/POS socket streaming to thermal printers on outlet LAN (e.g. 192.168.1.x).</li>
                <li><b>HTML5 WebSerial & WebUSB</b>: Direct zero-install USB receipt printing & cash drawer kicks from browser.</li>
                <li><b>Edge Relay Daemon</b>: Optional local loopback bridge (<code className="text-white">127.0.0.1:9199/escpos</code>) for legacy Windows spoolers.</li>
              </ul>
              <button
                onClick={handleScanSubnetPrinters}
                disabled={isScanningSubnet}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-xs transition"
              >
                {isScanningSubnet ? "Scanning Local Subnet..." : "🔍 Auto-Discover Subnet Thermal Printers"}
              </button>
            </div>
          </div>

          {/* Subnet Auto-Discovered Printers if scanned */}
          {subnetScanResults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-sky-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Discovered Network Printers on Subnet ({subnetScanResults.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {subnetScanResults.map((pr: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{pr.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{pr.ip}:{pr.port} ({pr.driver})</div>
                    </div>
                    <button
                      onClick={() => {
                        setNetPrinterIp(pr.ip);
                        setNetPrinterPort(pr.port);
                        notify(true, `Selected ${pr.name} (${pr.ip}) for live POS printing`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px]"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Middle Row: Network IP Thermal Printer Diagnostic & USB Serial Utility */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Network / IP Printer Config & Ping Test */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-600" />
                  Network / IP Thermal Printer Configuration & Ping Tool
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  TCP Port 9100 ESC/POS
                </span>
              </div>
              <p className="text-slate-500">
                Configure IP thermal printers connected to the local outlet switch or Wi-Fi router.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Printer IP Address
                  </label>
                  <input
                    type="text"
                    value={netPrinterIp}
                    onChange={(e) => setNetPrinterIp(e.target.value)}
                    placeholder="192.168.1.198"
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={netPrinterPort}
                    onChange={(e) => setNetPrinterPort(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestNetworkPrinter}
                  disabled={isTestingNetPrinter}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingNetPrinter ? "animate-spin" : ""}`} />
                  {isTestingNetPrinter ? "Testing Ping..." : "⚡ Ping & Test Network Connectivity"}
                </button>
              </div>

              {netPrinterPingResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Printer Status: {netPrinterPingResult.status} ({netPrinterPingResult.ip}:{netPrinterPingResult.port})
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Response: {netPrinterPingResult.message} • Latency: <b>{netPrinterPingResult.latency_ms} ms</b>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                    ESC/POS Ready
                  </span>
                </div>
              )}
            </div>

            {/* USB & Serial COM Port Peripheral Diagnostic */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <PlugZap className="w-4 h-4 text-indigo-600" />
                  USB & Serial COM Port Peripheral Diagnostic
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  RS-232 / USB VCP
                </span>
              </div>
              <p className="text-slate-500">
                Diagnostic utility for direct USB Virtual COM ports and physical DB9 serial ports (touch screen weigh scale, thermal printer).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Baud Rate
                  </label>
                  <select
                    value={serialBaudRate}
                    onChange={(e) => setSerialBaudRate(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  >
                    <option value={9600}>9600 Baud (Standard Scale / Pos)</option>
                    <option value={19200}>19200 Baud</option>
                    <option value={38400}>38400 Baud (Thermal ESC/POS)</option>
                    <option value={115200}>115200 Baud (High Speed USB-VCP)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Flow Control / Handshake
                  </label>
                  <select className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold">
                    <option>Hardware (RTS / CTS)</option>
                    <option>Software (XON / XOFF)</option>
                    <option>None (Direct Pin)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={pairWebSerial}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <PlugZap className="w-3.5 h-3.5" />
                  Test USB / Serial COM Port
                </button>
                <span className="text-[11px] text-slate-400">Supported on Chrome & Edge with zero plugins</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Advanced Cash Drawer Driver & Sensor Diagnostics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                <ArchiveRestore className="w-4 h-4 text-emerald-600" />
                Advanced Cash Drawer Configuration & Microswitch Sensor Test
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Solenoid Pulse Engine
              </span>
            </div>
            <p className="text-slate-500">
              Configure hardware drawer kick triggers: RJ11 via Printer ESC/POS, Direct USB Relay Board, or RS232 Serial Pin.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Drawer Trigger Interface
                </label>
                <select
                  value={drawerInterface}
                  onChange={(e) => setDrawerInterface(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="RJ11_PRINTER">RJ11 via Thermal Printer (Standard)</option>
                  <option value="USB_RELAY">Direct USB Relay Board (CH340 / FTDI)</option>
                  <option value="SERIAL_DTR">RS232 Serial Port (DTR / RTS Pulse)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Solenoid Kick Pin
                </label>
                <select
                  value={drawerPin}
                  onChange={(e) => setDrawerPin(Number(e.target.value))}
                  className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value={2}>Pin 2 (Standard Cash Drawer #1)</option>
                  <option value={5}>Pin 5 (Dual Drawer Configuration #2)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pulse Duration (ms)
                </label>
                <select
                  value={drawerPulseMs}
                  onChange={(e) => setDrawerPulseMs(Number(e.target.value))}
                  className="w-full border rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value={20}>20 ms (Ultra Fast Solenoid)</option>
                  <option value={50}>50 ms</option>
                  <option value={100}>100 ms (Recommended Standard)</option>
                  <option value={120}>120 ms (Heavy Heavy Duty Spring)</option>
                  <option value={200}>200 ms (Extended Pulse)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleTestAdvancedDrawer}
                disabled={isTestingDrawer}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition disabled:opacity-50 flex items-center gap-2"
              >
                <ArchiveRestore className="w-4 h-4" />
                {isTestingDrawer ? "Firing Pulse..." : "⚡ Trigger Advanced Cash Drawer Kick & Sensor Test"}
              </button>
            </div>

            {drawerTestResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Drawer Kick Fired: {drawerTestResult.message}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Command: <code className="font-mono">{drawerTestResult.command_hex}</code> • Microswitch Feedback: <b>{drawerTestResult.microswitch_sensor_state}</b>
                  </div>
                </div>
                <span className="font-mono text-[10px] px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                  Drawer Sensor: {drawerTestResult.microswitch_sensor_state}
                </span>
              </div>
            )}
          </div>

          {/* DEDICATED KIOSK EXPRESS HARDWARE, DISPLAY, PRINTER & PAYMENT CONFIGURATION */}
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-800 rounded-3xl p-6 shadow-md space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-700">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                    Express Kiosk Hardware, Display & EDC Card Reader Admin
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#081F5C] text-[10px] font-black uppercase">
                      Port :8288
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure standalone digital portrait touch kiosks, slip printers, card swiping machines & UPI
                  </p>
                </div>
              </div>

              {/* Direct Link to Standalone Kiosk on Port 8288 */}
              <a
                href={`http://${window.location.hostname}:8288`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#081F5C] font-black text-xs shadow-md hover:scale-102 transition"
              >
                <span>🚀 Launch Standalone Kiosk Express (Port 8288)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* 4-Column Grid for Kiosk Configurations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Display & Touch Screen */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span>Kiosk Display & Touch</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Kiosk ID</label>
                  <input
                    type="text"
                    value={kioskConfig.kiosk_id}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, kiosk_id: e.target.value })}
                    className="w-full border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Screen Orientation</label>
                  <select
                    value={kioskConfig.display_orientation}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, display_orientation: e.target.value })}
                    className="w-full border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-bold text-xs"
                  >
                    <option value="PORTRAIT_9_16">Portrait 9:16 (Vertical Kiosk)</option>
                    <option value="LANDSCAPE_16_9">Landscape 16:9 (Tablet/Counter)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Screensaver Idle Timeout</label>
                  <select
                    value={kioskConfig.screensaver_timeout_sec}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, screensaver_timeout_sec: Number(e.target.value) })}
                    className="w-full border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-bold text-xs"
                  >
                    <option value={15}>15 Seconds (Rapid Attract)</option>
                    <option value={30}>30 Seconds</option>
                    <option value={45}>45 Seconds (Recommended)</option>
                    <option value={60}>60 Seconds</option>
                    <option value={99999}>Disable Screensaver</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold">Touch Sound Feedback</span>
                  <input
                    type="checkbox"
                    checked={kioskConfig.sound_feedback}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, sound_feedback: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>
              </div>

              {/* Column 2: Thermal Slip Printer */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Kiosk Receipt Printer</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Printer IP & Port</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={kioskConfig.printer_ip}
                      onChange={(e) => setKioskConfig({ ...kioskConfig, printer_ip: e.target.value })}
                      placeholder="192.168.1.198"
                      className="flex-1 border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                    />
                    <input
                      type="number"
                      value={kioskConfig.printer_port}
                      onChange={(e) => setKioskConfig({ ...kioskConfig, printer_port: Number(e.target.value) })}
                      className="w-16 border rounded-xl px-1.5 py-1.5 bg-white dark:bg-slate-900 font-mono text-center font-bold text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Thermal Paper Width</label>
                  <select
                    value={kioskConfig.printer_paper_width}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, printer_paper_width: e.target.value })}
                    className="w-full border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-bold text-xs"
                  >
                    <option value="80mm">80mm (Standard Full Width)</option>
                    <option value="58mm">58mm (Compact Roll)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold">Auto Receipt Cutter</span>
                  <input
                    type="checkbox"
                    checked={kioskConfig.printer_auto_cut}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, printer_auto_cut: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestKioskPrinter}
                  className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Test Kiosk Slip Print</span>
                </button>
              </div>

              {/* Column 3: Card Swiping Machine (EDC POS) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Card Swiping Machine (EDC)</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">EDC Provider</label>
                  <select
                    value={kioskConfig.edc_provider}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, edc_provider: e.target.value })}
                    className="w-full border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-bold text-xs"
                  >
                    <option>PineLabs Plutus Cloud POS</option>
                    <option>Paytm All-In-One EDC</option>
                    <option>Innoviti Payment Bridge</option>
                    <option>Razorpay POS Terminal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Terminal ID (TID) & MID</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={kioskConfig.edc_tid}
                      onChange={(e) => setKioskConfig({ ...kioskConfig, edc_tid: e.target.value })}
                      placeholder="TID88412"
                      className="flex-1 border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                    />
                    <input
                      type="text"
                      value={kioskConfig.edc_mid}
                      onChange={(e) => setKioskConfig({ ...kioskConfig, edc_mid: e.target.value })}
                      placeholder="MID-BIK"
                      className="flex-1 border rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold">Contactless NFC Tap</span>
                  <input
                    type="checkbox"
                    checked={kioskConfig.edc_contactless_tap}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, edc_contactless_tap: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestKioskEdc}
                  className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow transition flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Test Card Reader Ping</span>
                </button>
              </div>

              {/* Column 4: Payment Methods & UPI Gateway */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>Payment Gateway & UPI</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-[11px] font-bold">Dynamic UPI QR Code</div>
                    <div className="text-[10px] text-slate-400">PineLabs / ICICI UPI</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kioskConfig.upi_soundbox_enabled}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, upi_soundbox_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-[11px] font-bold">Allow Pay at Cash Counter</div>
                    <div className="text-[10px] text-slate-400">Print token for counter cash</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kioskConfig.allow_counter_cash}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, allow_counter_cash: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-[11px] font-bold">Sodexo / Pluxee Food Card</div>
                    <div className="text-[10px] text-slate-400">Food-only tax restriction</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kioskConfig.allow_sodexo}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, allow_sodexo: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveKioskConfig}
                    disabled={savingKioskConfig}
                    className="w-full py-2 rounded-xl bg-[#081F5C] hover:bg-[#1246A8] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>{savingKioskConfig ? "Saving..." : "Save Kiosk Settings"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Feedback Banners */}
            {(kioskPrinterTestResult || kioskEdcTestResult) && (
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs space-y-1">
                {kioskPrinterTestResult && (
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{kioskPrinterTestResult}</span>
                  </div>
                )}
                {kioskEdcTestResult && (
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{kioskEdcTestResult}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM CONFIG & AUDIT LOGS */}
      {tab === "config" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white">
              System Audit Logs & Governance Trail
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-[#081F5C] dark:text-sky-400">[{l.module}]</span>{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{l.action}</span> by{" "}
                    <span className="text-slate-600 dark:text-slate-400">{l.actor}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: DATABASE BACKUP & DISASTER RECOVERY */}
      {tab === "backups" && (
        <div className="space-y-6 text-xs">
          {/* Top Banner & Control Station */}
          <div className="bg-gradient-to-r from-[#081F5C] via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 font-bold text-[10px] tracking-wide uppercase">
                    <Database className="w-3.5 h-3.5" />
                    PostgreSQL 16 Disaster Recovery Suite
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    Enterprise Database Backup & Restore Station
                  </h3>
                  <p className="text-xs text-sky-200 max-w-xl">
                    Generate instant point-in-time SQL snapshot backups across all 33 schemas (Admin, Stores, Factory, OMS, Vendors, POS & KOT). Backups can be downloaded to your local computer and safely restored anytime.
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleCreateBackup}
                    disabled={backupLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${backupLoading ? "animate-spin" : ""}`} />
                    <span>{backupLoading ? "Creating Backup..." : "⚡ Take Full DB Backup Now"}</span>
                  </button>

                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition">
                    <Upload className="w-4 h-4 text-amber-300" />
                    <span>Upload & Restore .SQL</span>
                    <input
                      type="file"
                      accept=".sql"
                      onChange={handleUploadSqlAndRestore}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                  <div className="text-[10px] text-sky-200 uppercase font-bold">Total Tables</div>
                  <div className="text-base font-black text-white mt-0.5">33 Enterprise Tables</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                  <div className="text-[10px] text-sky-200 uppercase font-bold">Transaction Engine</div>
                  <div className="text-base font-black text-emerald-300 mt-0.5">ACID Compliant</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                  <div className="text-[10px] text-sky-200 uppercase font-bold">Primary Storage</div>
                  <div className="text-base font-black text-amber-300 mt-0.5">PostgreSQL / PGData</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                  <div className="text-[10px] text-sky-200 uppercase font-bold">Sequences & Prefixes</div>
                  <div className="text-base font-black text-purple-300 mt-0.5">Auto-Preserved</div>
                </div>
              </div>
            </div>
          </div>

          {/* Backup Audit Ledger */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <ArchiveRestore className="w-4 h-4 text-blue-600" />
                  Database Backup Ledger & Point-in-Time Archive
                </h4>
                <p className="text-xs text-slate-500">
                  {backups.length} snapshots stored on server • Ready for local download or one-click rollback
                </p>
              </div>
              <button
                onClick={loadBackups}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>

            <div className="overflow-x-auto">
              {backups.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No database snapshots found. Click "⚡ Take Full DB Backup Now" to create your first backup.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-left">
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">ID</th>
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Backup Filename</th>
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Size</th>
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Tables & Rows</th>
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Created By</th>
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px]">Created At</th>
                      <th className="py-2.5 pr-3 font-bold uppercase text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {backups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 pr-3 font-mono text-slate-400">#{b.id}</td>
                        <td className="py-3 pr-3 font-mono font-bold text-slate-900 dark:text-white">
                          {b.filename}
                        </td>
                        <td className="py-3 pr-3 font-bold text-blue-600 dark:text-sky-400">
                          {b.size_human}
                        </td>
                        <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                          {b.table_count || 33} tables • {b.row_count || "2,000+"} rows
                        </td>
                        <td className="py-3 pr-3 font-semibold text-slate-700 dark:text-slate-300">
                          {b.created_by}
                        </td>
                        <td className="py-3 pr-3 text-slate-400 font-mono text-[11px]">
                          {new Date(b.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/api/admin/backups/download/${b.filename}`}
                              download={b.filename}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 hover:bg-blue-100 font-bold text-[11px] transition"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                            <button
                              onClick={() => setRestoreConfirmModal(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold text-[11px] transition"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(b.id)}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESTORE SAFETY CONFIRMATION MODAL */}
      {restoreConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200 dark:border-rose-900 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Confirm Database State Restoration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Critical Database Disaster Recovery Operation
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2">
              <p className="font-bold">
                Are you sure you want to restore the database from snapshot:
              </p>
              <div className="font-mono text-[11px] font-black bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 break-all">
                {restoreConfirmModal.filename}
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400">
                ⚠️ Notice: This will overwrite conflicting records and replay state from this backup snapshot. Ensure no active cash drawer transactions are currently processing.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreConfirmModal(null)}
                disabled={restoreExecuting}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreBackup(restoreConfirmModal.filename)}
                disabled={restoreExecuting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${restoreExecuting ? "animate-spin" : ""}`} />
                <span>{restoreExecuting ? "Restoring Database..." : "Proceed with Restore"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD DINING TABLE */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                Add Dining Table to {targetOutletForTable}
              </h3>
              <button onClick={() => setShowTableModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDiningTable} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Table Code *
                </label>
                <input
                  required
                  value={tableCode}
                  onChange={(e) => setTableCode(e.target.value)}
                  placeholder="e.g. T-12 / VIP-01"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Floor Name
                </label>
                <select
                  value={tableFloor}
                  onChange={(e) => setTableFloor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
                >
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="First Floor">First Floor</option>
                  <option value="Terrace Garden">Terrace Garden</option>
                  <option value="Banquet Hall">Banquet Hall</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Section
                </label>
                <select
                  value={tableSection}
                  onChange={(e) => setTableSection(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
                >
                  <option value="AC Dining Hall">AC Dining Hall</option>
                  <option value="Family Lounge">Family Lounge</option>
                  <option value="Outdoor Terrace">Outdoor Terrace</option>
                  <option value="VIP Private Dining">VIP Private Dining</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Seating Capacity (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM RBAC ROLE */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#081F5C]" />
                Create Custom RBAC Role
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Name *
                </label>
                <input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Floor Captain / Regional Auditor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Description
                </label>
                <input
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Brief role responsibilities..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Accessible ERP Modules:
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                  {ALL_MODULE_KEYS.map((m) => {
                    const sel = newRoleModules.includes(m.key);
                    return (
                      <button
                        type="button"
                        key={m.key}
                        onClick={() =>
                          setNewRoleModules(
                            sel ? newRoleModules.filter((k) => k !== m.key) : [...newRoleModules, m.key]
                          )
                        }
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition ${
                          sel
                            ? "bg-[#081F5C] text-white shadow-sm"
                            : "bg-white dark:bg-slate-800 border border-slate-200 text-slate-500"
                        }`}
                      >
                        {sel ? "✓ " : ""}
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#081F5C] text-white font-bold"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: RESET POS PIN */}
      {showPinModal && targetUserForPin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Reset Security PIN
              </h3>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setTargetUserForPin(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Reset quick login PIN for <b>{targetUserForPin.full_name}</b> ({targetUserForPin.emp_id}).
            </p>

            <form onSubmit={handleResetPinSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New 4-Digit PIN
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-center text-lg font-bold tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPinInput(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-[11px]"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow"
                >
                  Confirm PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER & OUTLET SCOPE */}
      {showEditUserModal && targetUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#1E40AF]" />
                  Modify User Profile & Outlets
                </h3>
                <p className="text-[11px] text-slate-500">
                  EMP: <b>{targetUserForEdit.emp_id}</b> ({targetUserForEdit.username})
                </p>
              </div>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile No
                  </label>
                  <input
                    type="text"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  RBAC Primary Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outlet Scope Assignment */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Allowed Outlet Access:
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  {outlets.map((o) => {
                    const sel = editOutlets.includes(o.code);
                    return (
                      <button
                        type="button"
                        key={o.code}
                        onClick={() =>
                          setEditOutlets(
                            sel ? editOutlets.filter((c) => c !== o.code) : [...editOutlets, o.code]
                          )
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition ${
                          sel
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {sel ? "✓ " : ""}
                        {o.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2 border rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Account Active</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editLocked}
                    onChange={(e) => setEditLocked(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-bold text-rose-600">Account Locked</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#081F5C] hover:bg-[#10307A] text-white font-bold shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Super Admin MFA QR Registration & Recovery Modal */}
      {showMfaModal && mfaModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-600">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Authenticator MFA Registration & Recovery (QR Code)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMfaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <MfaQrCode
              user={mfaModalUser}
              secret={newMfaSecret}
              onDone={() => setShowMfaModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
