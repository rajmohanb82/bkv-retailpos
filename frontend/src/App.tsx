import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ScanBarcode,
  Store,
  Gift,
  Warehouse,
  Factory,
  UtensilsCrossed,
  Truck,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  UserCircle2,
  Receipt,
  Lock,
  ClipboardList,
  Monitor,
  Sparkles,
  Zap,
  BookOpen,
  Radio,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "./api";
import { ModuleId, Outlet, BrandingConfig } from "./types";
import { AuthUser, LoginScreen } from "./components/LoginScreen";
import { AggregatorNotificationBar } from "./components/AggregatorNotificationBar";
import { ExecutiveDashboard } from "./modules/ExecutiveDashboard";
import { RetailPos } from "./modules/RetailPos";
import { RetailCustomerDisplay } from "./components/RetailCustomerDisplay";
import { RestaurantPos } from "./modules/RestaurantPos";
import { RestaurantOrderTaking } from "./modules/RestaurantOrderTaking";
import { RestaurantKiosk } from "./modules/RestaurantKiosk";
import { PortraitKioskExpress } from "./modules/PortraitKioskExpress";
import { ShopManager } from "./modules/ShopManager";
import { OmsModule } from "./modules/OmsModule";
import { StoresModule } from "./modules/StoresModule";
import { FactoryModule } from "./modules/FactoryModule";
import { KotModule } from "./modules/KotModule";
import { VendorModule } from "./modules/VendorModule";
import { AdminModule } from "./modules/AdminModule";
import { ItemAdminModule } from "./modules/ItemAdminModule";
import { ReportsModule } from "./modules/ReportsModule";
import { WalkieTalkieModule } from "./modules/WalkieTalkieModule";

const NAV_ITEMS: { id: ModuleId; num: string; label: string; sub: string; icon: any }[] = [
  { id: "executive", num: "9", label: "Executive Dashboard", sub: "CXO & CO/FR/DO KPIs", icon: LayoutDashboard },
  { id: "pos", num: "1", label: "Retail POS", sub: "Sweet Counter, Hotkeys & Stock", icon: ScanBarcode },
  { id: "rest_pos", num: "1B", label: "Restaurant POS", sub: "Tables, Takeaway & Kitchen Stock", icon: Receipt },
  { id: "order_taking", num: "1C", label: "Order Taking", sub: "Table Order Alignment & KOT", icon: ClipboardList },
  { id: "kiosk", num: "1D", label: "Express KIOSK", sub: "Self Checkout & Counter Pay", icon: Monitor },
  { id: "shop", num: "2", label: "Shop Manager", sub: "Shelf Alerts & SMS OTP", icon: Store },
  { id: "oms", num: "3", label: "OMS & Online", sub: "Zomato, Swiggy & Bulk", icon: Gift },
  { id: "stores", num: "4", label: "Stores & BOM", sub: "FEFO & RM Issue", icon: Warehouse },
  { id: "factory", num: "5", label: "Sweet Factory", sub: "WIP, Yield & QC", icon: Factory },
  { id: "kot", num: "6", label: "KOT & Kitchen", sub: "Floor Map & Multi-KDS", icon: UtensilsCrossed },
  { id: "vendor", num: "7", label: "Vendor & RFQ", sub: "Tenders, PO & 3-Way", icon: Truck },
  { id: "admin", num: "8", label: "Admin & GSTN", sub: "Outlets, RBAC & Hardware", icon: ShieldCheck },
  { id: "item_admin", num: "8B", label: "Item Admin", sub: "Discounts, Combos & Rates", icon: Sparkles },
  { id: "reports", num: "10", label: "All Reports", sub: "GST, FSSAI Trace & CSV", icon: FileSpreadsheet },
  { id: "walkie_talkie", num: "11", label: "Walkie-Talkie", sub: "Digital PTT Intercom", icon: Radio },
];

const ROLE_DEFAULT_MODULE: Record<string, ModuleId> = {
  "Super Admin": "executive",
  "Director / Owner": "executive",
  "Corporate Manager": "executive",
  "Location Manager": "pos",
  "Shop Manager": "shop",
  Cashier: "pos",
  "Restaurant Cashier": "rest_pos",
  "Production Manager": "factory",
  Storekeeper: "stores",
  "Kitchen Captain": "order_taking",
  "Procurement Officer": "vendor",
};

const FALLBACK_ROLE_MODULES: Record<string, ModuleId[]> = {
  "Super Admin": ["executive", "pos", "rest_pos", "order_taking", "kiosk", "shop", "oms", "stores", "factory", "kot", "vendor", "admin", "item_admin", "reports", "walkie_talkie"],
  "Director / Owner": ["executive", "pos", "rest_pos", "order_taking", "kiosk", "shop", "oms", "stores", "factory", "kot", "vendor", "item_admin", "reports", "walkie_talkie"],
  "Corporate Manager": ["executive", "pos", "rest_pos", "order_taking", "kiosk", "shop", "oms", "stores", "factory", "kot", "vendor", "item_admin", "reports", "walkie_talkie"],
  "Location Manager": ["executive", "pos", "rest_pos", "order_taking", "kiosk", "shop", "oms", "stores", "factory", "kot", "vendor", "item_admin", "reports", "walkie_talkie"],
  "Shop Manager": ["executive", "pos", "rest_pos", "order_taking", "kiosk", "shop", "oms", "stores", "factory", "kot", "vendor", "item_admin", "reports", "walkie_talkie"],
  Cashier: ["pos", "walkie_talkie"],
  "Restaurant Cashier": ["rest_pos", "order_taking", "kiosk", "walkie_talkie"],
  "Production Manager": ["factory", "stores", "oms", "reports", "walkie_talkie"],
  Storekeeper: ["stores", "factory", "vendor", "reports", "walkie_talkie"],
  "Kitchen Captain": ["kot", "order_taking", "rest_pos", "walkie_talkie"],
  "Procurement Officer": ["vendor", "stores", "reports", "walkie_talkie"],
};

interface SessionState {
  token: string;
  user: AuthUser;
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(() => {
    try {
      const raw = localStorage.getItem("annavya_auth_session");
      return raw ? (JSON.parse(raw) as SessionState) : null;
    } catch {
      return null;
    }
  });
  const [activeModule, setActiveModule] = useState<ModuleId>("executive");
  const [storesSubTab, setStoresSubTab] = useState<"inbox" | "batches" | "bom" | "alerts" | "transfer">("inbox");
  const [factorySubTab, setFactorySubTab] = useState<"inbox" | "kettles" | "orders" | "qc" | "dispatch" | "tracker">("inbox");
  const [omsSubTab, setOmsSubTab] = useState<"aggregators" | "bulk" | "config">("aggregators");
  const [adminSubTab, setAdminSubTab] = useState<"outlets" | "restaurant" | "branding" | "payments" | "rbac" | "sequences" | "hardware" | "config" | "backups">("outlets");
  const [shopSubTab, setShopSubTab] = useState<"stock" | "eod" | "shifts" | "promos" | "otp">("stock");
  const [vendorSubTab, setVendorSubTab] = useState<"portal" | "tenders" | "vendors" | "pos" | "prices">("portal");
  const [itemAdminSubTab, setItemAdminSubTab] = useState<"items" | "rates" | "promos" | "packages">("items");
  const [expandedMenu, setExpandedMenu] = useState<Record<string, boolean>>({
    stores: false,
    factory: false,
    oms: false,
    admin: false,
    shop: false,
    vendor: false,
    item_admin: false,
  });

  // Auto-scroll to top helper
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleDrawer = (moduleId: string) => {
    setExpandedMenu((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  useEffect(() => {
    scrollToTop();
  }, [
    activeModule,
    storesSubTab,
    factorySubTab,
    omsSubTab,
    adminSubTab,
    shopSubTab,
    vendorSubTab,
    itemAdminSubTab,
  ]);
  const [branding, setBranding] = useState<BrandingConfig>({
    customer_name: "Bikanervala",
    customer_trade_name: "Bikanervala Foods Pvt Ltd",
    customer_logo_url: "/bikanervala-customer-logo.svg",
    customer_logo_dark_url: "/bikanervala-customer-logo-dark.svg",
    dual_logo_mode: true,
    customer_logo_height_px: 44,
    brand_tagline: "Taste of Tradition & Trust",
  });
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [activeOutlet, setActiveOutlet] = useState<string>("DEL01");
  const [activeRole, setActiveRole] = useState<string>(
    session?.user?.role_name || "Super Admin"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("annavya_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("annavya_theme", theme);

    const fav = document.getElementById("annavya-favicon") as HTMLLinkElement | null;
    if (fav) {
      fav.href = theme === "dark" ? "/annavya-badge-dark.png" : "/annavya-badge-light.png";
    }
  }, [theme]);

  const loadOutlets = async () => {
    try {
      const [list, roles, brand] = await Promise.all([
        apiFetch<Outlet[]>("/api/admin/outlets"),
        apiFetch<any[]>("/api/admin/roles").catch(() => []),
        apiFetch<BrandingConfig>("/api/admin/branding").catch(() => null),
      ]);
      setOutlets(list);
      if (roles.length) setRolesList(roles);
      if (brand && brand.customer_name) setBranding(brand);
    } catch {
      // Initial retry handled cleanly
    }
  };

  useEffect(() => {
    if (session) {
      loadOutlets();
    }
  }, [session, activeModule]);

  const isSuperAdminOrDirector =
    session?.user?.role_name === "Super Admin" ||
    session?.user?.role_name === "Director / Owner";

  const isCorporateManager = session?.user?.role_name === "Corporate Manager";

  const isPrivilegedAdmin = isSuperAdminOrDirector;

  const effectiveRole = isPrivilegedAdmin
    ? activeRole
    : session?.user?.role_name || activeRole;

  const roleObj = rolesList.find((r) => r.name === effectiveRole);
  const rawModules: string[] | undefined =
    roleObj?.permissions?.modules ||
    (effectiveRole === session?.user?.role_name
      ? session?.user?.permissions?.modules
      : undefined) ||
    FALLBACK_ROLE_MODULES[effectiveRole];

  const allowedModules: ModuleId[] = (
    rawModules && rawModules.length > 0
      ? rawModules
      : FALLBACK_ROLE_MODULES[effectiveRole] || ["pos"]
  ) as ModuleId[];

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    allowedModules.includes(item.id)
  );

  useEffect(() => {
    if (session && !allowedModules.includes(activeModule)) {
      const preferred = ROLE_DEFAULT_MODULE[effectiveRole];
      setActiveModule(
        preferred && allowedModules.includes(preferred)
          ? preferred
          : allowedModules[0] || "pos"
      );
    }
  }, [session, effectiveRole, allowedModules.join(","), activeModule]);

  // Restrict selectable outlets based on user permissions
  const userAssignedOutlets: string[] = session?.user?.outlet_codes || [];
  const selectableOutlets = outlets
    .filter((o) => o.outlet_type !== "Manufacturing")
    .filter((o) => {
      if (isSuperAdminOrDirector) return true;
      if (isCorporateManager) {
        return userAssignedOutlets.length === 0 || userAssignedOutlets.includes(o.code);
      }
      return userAssignedOutlets.includes(o.code);
    });

  const isOutletStrictlyLocked = !isSuperAdminOrDirector && !isCorporateManager && selectableOutlets.length <= 1;

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    const nextSession = { token, user };
    setSession(nextSession);
    localStorage.setItem("annavya_auth_session", JSON.stringify(nextSession));
    setActiveRole(user.role_name);

    // Non-superadmin/director users are aligned strictly to their assigned outlet
    const assigned = (user.outlet_codes || []).find((c) => c !== "MFG01") || (user.outlet_codes || [])[0] || "DEL01";
    setActiveOutlet(assigned);

    setActiveModule(ROLE_DEFAULT_MODULE[user.role_name] || "executive");
  };

  const handleLogout = async () => {
    try {
      if (session?.user) {
        await apiFetch("/api/admin/auth/logout", {
          method: "POST",
          body: JSON.stringify({
            emp_id: session.user.emp_id,
            full_name: session.user.full_name,
          }),
        });
      }
    } catch {
      // Clear local session regardless
    } finally {
      localStorage.removeItem("annavya_auth_session");
      setSession(null);
    }
  };

  // Dedicated Port 8288 or Standalone Kiosk Detection
  const isKioskMode =
    typeof window !== "undefined" &&
    (window.location.port === "8288" ||
      window.location.search.includes("kiosk=standalone") ||
      window.location.search.includes("kiosk=portrait") ||
      window.location.pathname.startsWith("/kiosk"));

  if (isKioskMode) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#070B14]">
        <PortraitKioskExpress isStandalone={true} activeOutlet={activeOutlet || "DEL01"} />
      </div>
    );
  }

  // Dedicated Customer Facing Display (CFD) Mode
  const isCustomerDisplayMode =
    typeof window !== "undefined" &&
    (window.location.search.includes("display=customer") ||
      window.location.search.includes("view=cfd") ||
      window.location.pathname === "/cfd" ||
      window.location.pathname.startsWith("/pos/customer-display"));

  if (isCustomerDisplayMode) {
    return <RetailCustomerDisplay />;
  }

  // Dedicated Port 8289 or Standalone Retail POS Detection
  const isRetailPosStandalone =
    typeof window !== "undefined" &&
    (window.location.port === "8289" ||
      window.location.search.includes("pos=standalone") ||
      window.location.search.includes("view=retail-pos") ||
      window.location.pathname === "/retail-pos" ||
      window.location.pathname.startsWith("/pos/retail") ||
      window.location.pathname.startsWith("/pos/standalone"));

  if (isRetailPosStandalone) {
    if (!session) {
      return (
        <LoginScreen
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <div className="min-h-screen bg-[#F7F6F2] dark:bg-[#070B14] text-slate-900 dark:text-slate-100">
        <RetailPos
          activeOutlet={activeOutlet}
          outlets={outlets}
          actorName={session.user.full_name}
          isStandalone={true}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeModule);
  const currentOutletObj = outlets.find((o) => o.code === activeOutlet);
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex bg-[#F7F6F2] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0C1222] border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Customer Logo */}
              <div className="flex items-center justify-center">
                <img
                  src={
                    isDark
                      ? branding?.customer_logo_dark_url || branding?.customer_logo_url || "/bikanervala-customer-logo-dark.svg"
                      : branding?.customer_logo_url || "/bikanervala-customer-logo.svg"
                  }
                  alt={branding?.customer_name || "Customer Brand"}
                  style={{
                    height: `${Math.min(Math.max(branding?.customer_logo_height_px || 44, 38), 54)}px`,
                  }}
                  className="w-auto max-w-[130px] object-contain drop-shadow-sm transition-all"
                  onError={(e) => {
                    e.currentTarget.src = "/bikanervala-customer-logo.svg";
                  }}
                />
              </div>

              {/* Vertical Elegant Divider */}
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 flex-shrink-0 mx-1" />

              {/* Annavya ERP Platform Logo */}
              <div className="flex items-center justify-center">
                <img
                  src={isDark ? "/annavya-logo-dark.png" : "/annavya-logo-light.png"}
                  alt="Annavya Food Retail ERP"
                  className="h-10 w-auto max-w-[115px] object-contain drop-shadow-sm transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="font-extrabold text-[#1246A8] dark:text-amber-400 uppercase tracking-wider truncate">
              {branding?.customer_trade_name || "Bikanervala"}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-medium truncate ml-1">
              {currentOutletObj ? currentOutletObj.name : "Retail Chain"}
            </span>
          </div>
        </div>

        {/* Authenticated User Capsule */}
        <div className="p-3 mx-3 my-2 rounded-2xl bg-[#F7F6F2] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#081F5C] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {session.user.full_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {session.user.full_name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {effectiveRole} • {session.user.emp_id}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            const isStores = item.id === "stores";
            const isFactory = item.id === "factory";
            const isOms = item.id === "oms";
            const isAdmin = item.id === "admin";
            const isShop = item.id === "shop";
            const isVendor = item.id === "vendor";
            const isItemAdmin = item.id === "item_admin";
            const hasSubmenu =
              isStores || isFactory || isOms || isAdmin || isShop || isVendor || isItemAdmin;
            const isExpanded = Boolean(expandedMenu[item.id]);

            return (
              <div key={item.id} className="space-y-1">
                <div
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition cursor-pointer select-none ${
                    isActive
                      ? "bg-[#081F5C] text-white shadow-md font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                  onClick={() => {
                    scrollToTop();
                    setActiveModule(item.id);
                    if (hasSubmenu) {
                      setExpandedMenu((prev) => ({
                        ...prev,
                        [item.id]: isActive ? !prev[item.id] : true,
                      }));
                    } else {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span>{item.label}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {item.num}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive ? "text-slate-200" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </div>

                  {hasSubmenu ? (
                    <button
                      type="button"
                      aria-label="Toggle submenu drawer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDrawer(item.id);
                      }}
                      className={`p-1.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "hover:bg-white/20 text-white"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>
                  ) : isActive ? (
                    <ChevronRight className="w-4 h-4 text-white" />
                  ) : null}
                </div>

                {/* Submenu under Stores with Smooth Foldable Drawer Animation */}
                {isStores && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "inbox", label: "📥 Stores Inbox", sub: "Material Requisitions" },
                        { id: "batches", label: "📦 Stock Batches", sub: "FEFO Inventory" },
                        { id: "bom", label: "📋 BOM Exploder", sub: "Recipe Issuance" },
                        { id: "alerts", label: "🔔 Alerts & Expiry", sub: "Dynamic ROP" },
                        { id: "transfer", label: "🚚 Transfer (IST)", sub: "E-Way Bills" },
                      ].map((sub) => {
                        const isSubActive = isActive && storesSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("stores");
                              setStoresSubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-sky-300 shadow-sm font-bold ring-1 ring-blue-200 dark:ring-blue-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-blue-600 dark:bg-sky-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu under Sweet Factory with Smooth Foldable Drawer Animation */}
                {isFactory && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "inbox", label: "📥 Factory Inbox", sub: "Orders & Indents" },
                        { id: "kettles", label: "🔥 Live Kettles", sub: "Floor Telemetry" },
                        { id: "orders", label: "📋 Batches & WIP", sub: "Active Sweets" },
                        { id: "qc", label: "🔬 QC Lab Gate", sub: "Brix & Sensory" },
                        { id: "dispatch", label: "🚚 Store Dispatch", sub: "Cold Room Transfer" },
                        { id: "tracker", label: "📍 Workflow Stepper", sub: "7-Stage Tracker" },
                      ].map((sub) => {
                        const isSubActive = isActive && factorySubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("factory");
                              setFactorySubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-sm font-bold ring-1 ring-amber-200 dark:ring-amber-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-amber-600 dark:bg-amber-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu under OMS with Smooth Foldable Drawer Animation */}
                {isOms && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "aggregators", label: "🛵 Zomato & Swiggy Inbox", sub: "Live Orders & Alarm" },
                        { id: "bulk", label: "🎁 Bulk Hampers & Gifting", sub: "Marriage & Corporate" },
                        { id: "config", label: "⚙️ Aggregator API Config", sub: "Webhooks & SLA Keys" },
                      ].map((sub) => {
                        const isSubActive = isActive && omsSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("oms");
                              setOmsSubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-orange-700 dark:text-orange-300 shadow-sm font-bold ring-1 ring-orange-200 dark:ring-orange-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-orange-600 dark:bg-orange-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu under Shop Manager with Smooth Foldable Drawer Animation */}
                {isShop && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "stock", label: "📦 Stock & Deficits", sub: "Store Front Par Levels" },
                        { id: "eod", label: "🌙 EoD Indents", sub: "Next Day Requisitions" },
                        { id: "shifts", label: "💰 Shift Handovers", sub: "Opening Float & Remittance" },
                        { id: "promos", label: "🏷️ Promo Rules", sub: "Festive & Owner Offers" },
                        { id: "otp", label: "📱 SMS Approvals", sub: "Manager OTP Verification" },
                      ].map((sub) => {
                        const isSubActive = isActive && shopSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("shop");
                              setShopSubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold ring-1 ring-emerald-200 dark:ring-emerald-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-emerald-600 dark:bg-emerald-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu under Vendor & RFQ with Smooth Foldable Drawer Animation */}
                {isVendor && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "portal", label: "🌐 Vendor Portal", sub: "Bills, POs & Delivery Inbox" },
                        { id: "tenders", label: "⚖️ Tenders & RFQs", sub: "Reverse Bidding" },
                        { id: "vendors", label: "🏢 Vendor Directory", sub: "Document Vault & KYC" },
                        { id: "pos", label: "📄 Purchase Orders", sub: "Line Approval & GRN Match" },
                        { id: "prices", label: "💹 Price Masters", sub: "Contracted Rates & Slabs" },
                      ].map((sub) => {
                        const isSubActive = isActive && vendorSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("vendor");
                              setVendorSubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-sm font-bold ring-1 ring-sky-200 dark:ring-sky-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-sky-600 dark:bg-sky-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu under Admin & GSTN with Smooth Foldable Drawer Animation */}
                {isAdmin && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[600px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "outlets", label: "🏢 Outlets & GSTN", sub: "Locations & GSP" },
                        { id: "restaurant", label: "🍽️ Restaurant Admin", sub: "Floors & Counters" },
                        { id: "branding", label: "🎨 Brand & Logo", sub: "Dual-Logo Proportions" },
                        { id: "payments", label: "💳 Payment Gateways", sub: "UPI, EDC POS & Coupons" },
                        { id: "rbac", label: "👥 Users & MFA", sub: "RBAC & Security Keys" },
                        { id: "sequences", label: "#️⃣ Code Sequences", sub: "Master Barcode Prefixes" },
                        { id: "hardware", label: "🖨️ POS & Kiosk Hardware", sub: "Printers, EDC & Display" },
                        { id: "config", label: "⚙️ System Config", sub: "Audit & Operational Rules" },
                        { id: "backups", label: "💾 DB Backups", sub: "Disaster Recovery" },
                      ].map((sub) => {
                        const isSubActive = isActive && adminSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("admin");
                              setAdminSubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm font-bold ring-1 ring-purple-200 dark:ring-purple-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-purple-600 dark:bg-purple-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu under Item Admin with Smooth Foldable Drawer Animation */}
                {isItemAdmin && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ml-3 mr-1 space-y-1 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100 py-1"
                        : "max-h-0 opacity-0 py-0 pointer-events-none"
                    }`}
                  >
                    <div className="bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-0.5">
                      {[
                        { id: "items", label: "📦 Item Master", sub: "Catalog & Excel Bulk Upload" },
                        { id: "rates", label: "💰 Dynamic Rates", sub: "Slabs & Customer Pricing" },
                        { id: "promos", label: "🏷️ Promo Schemes", sub: "Festive, Owner & Staff Deals" },
                        { id: "packages", label: "🎁 Festive Packages", sub: "Custom Hampers & Thal Combos" },
                      ].map((sub) => {
                        const isSubActive = isActive && itemAdminSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToTop();
                              setActiveModule("item_admin");
                              setItemAdminSubTab(sub.id as any);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center justify-between group ${
                              isSubActive
                                ? "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-sm font-bold ring-1 ring-rose-200 dark:ring-rose-900"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${
                                  isSubActive ? "bg-rose-600 dark:bg-rose-400 scale-125" : "bg-slate-300 dark:bg-slate-600 group-hover:scale-110"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal truncate ml-1">{sub.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live System Status Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Microservices Live
            </span>
            <span className="font-mono text-[10px]">8 Services</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Active: <span className="font-mono text-emerald-600 font-bold">{activeOutlet}</span> (Gateway :8285)
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0C1222]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#081F5C] dark:text-white tracking-tight">
                  {currentNav?.label || "ERP Workspace"}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#EBF4FF] dark:bg-blue-950 text-[#1246A8] dark:text-sky-300 text-[10px] font-bold">
                  Module {currentNav?.num}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentOutletObj
                  ? `${currentOutletObj.name} (${currentOutletObj.ownership_type} • ${currentOutletObj.outlet_type})`
                  : "Annavya Enterprise Food Retail ERP"}
              </p>
            </div>
          </div>

          {/* Outlet, Role, Theme & Logout Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Demo Simulator Buttons */}
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await apiFetch("/api/oms/aggregators/simulate-incoming?platform=ZOMATO", { method: "POST" });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition active:scale-95"
                title="Simulate incoming Zomato order with alarm chime"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>+ Zomato Order</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await apiFetch("/api/oms/aggregators/simulate-incoming?platform=SWIGGY", { method: "POST" });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition active:scale-95"
                title="Simulate incoming Swiggy order with alarm chime"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>+ Swiggy Order</span>
              </button>
            </div>

            {/* Outlet Selector with Strict Location Alignment / Locking */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              {isOutletStrictlyLocked && (
                <span title="Strict Location Lock Enforced for Your Branch">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400 font-medium">Outlet:</span>
              {isOutletStrictlyLocked ? (
                <span className="font-bold text-[#081F5C] dark:text-[#F8F3E6] flex items-center gap-1" title="Assigned Branch Locked">
                  {currentOutletObj ? `${currentOutletObj.code} (${currentOutletObj.city})` : activeOutlet}
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                    Locked
                  </span>
                </span>
              ) : (
                <select
                  value={activeOutlet}
                  onChange={(e) => setActiveOutlet(e.target.value)}
                  className="bg-transparent font-bold text-[#081F5C] dark:text-[#F8F3E6] focus:outline-none"
                >
                  {selectableOutlets.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.code} ({o.ownership_type}) — {o.city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isPrivilegedAdmin ? (
              <div className="flex items-center gap-1.5 bg-[#EBF4FF] dark:bg-blue-950/70 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-[#1246A8] dark:text-sky-300 font-medium">Role Preview:</span>
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value)}
                  className="bg-transparent font-bold text-[#081F5C] dark:text-[#F8F3E6] focus:outline-none"
                >
                  <option>Super Admin</option>
                  <option>Director / Owner</option>
                  <option>Corporate Manager</option>
                  <option>Location Manager</option>
                  <option>Shop Manager</option>
                  <option>Cashier</option>
                  <option>Restaurant Cashier</option>
                  <option>Production Manager</option>
                  <option>Storekeeper</option>
                  <option>Kitchen Captain</option>
                  <option>Procurement Officer</option>
                </select>
              </div>
            ) : (
              <div
                title="Strict Role-Based Access Control enforced"
                className="flex items-center gap-1.5 bg-[#EBF4FF] dark:bg-blue-950/70 rounded-xl px-2.5 py-1.5 text-xs"
              >
                <Lock className="w-3.5 h-3.5 text-[#1246A8] dark:text-sky-300" />
                <span className="text-[#1246A8] dark:text-sky-300 font-medium">Role:</span>
                <span className="font-bold text-[#081F5C] dark:text-[#F8F3E6]">{effectiveRole}</span>
              </div>
            )}

            <button
              onClick={() => setActiveModule("walkie_talkie")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                activeModule === "walkie_talkie"
                  ? "bg-amber-500 text-white font-black ring-2 ring-amber-300"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
              }`}
              title="Push-to-Talk Digital Store Intercom"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Walkie-Talkie</span>
            </button>

            <button
              onClick={() => setShowDocsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition shadow-sm"
              title="System Architecture & Visual Icon-Based Workflows Guide"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Workflows & Docs</span>
            </button>

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              title={`Switch to ${isDark ? "Light" : "Dark"} Theme`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-[#081F5C] dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#081F5C]" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Floating Zomato & Swiggy Alarm Notification Bar */}
        <AggregatorNotificationBar />

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {activeModule === "executive" && <ExecutiveDashboard />}
          {activeModule === "pos" && (
            <RetailPos
              activeOutlet={activeOutlet}
              outlets={outlets}
              actorName={session.user.full_name}
            />
          )}
          {activeModule === "rest_pos" && (
            <RestaurantPos
              activeOutlet={activeOutlet}
              outlets={outlets}
              actorName={session.user.full_name}
            />
          )}
          {activeModule === "order_taking" && (
            <RestaurantOrderTaking
              activeOutlet={activeOutlet}
              outlets={outlets}
              actorName={session.user.full_name}
            />
          )}
          {activeModule === "kiosk" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-[#081F5C] flex items-center justify-center font-bold shadow">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-amber-200 flex items-center gap-2">
                      <span>Express Touch Kiosk (Connected to Central DB & Microservices)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
                        Port :8288 Live
                      </span>
                    </h4>
                    <p className="text-xs text-amber-900/80 dark:text-amber-300">
                      Optimized for vertical portrait touchscreen kiosk hardware. Launch fullscreen standalone kiosk below.
                    </p>
                  </div>
                </div>
                <a
                  href={`http://${window.location.hostname}:8288`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-2xl bg-[#081F5C] text-white font-bold text-xs shadow-md hover:bg-[#1246A8] transition flex items-center gap-1.5"
                >
                  <span>🚀 Open Dedicated Kiosk (Port :8288)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>

              <PortraitKioskExpress
                isStandalone={false}
                activeOutlet={activeOutlet}
              />
            </div>
          )}
          {activeModule === "shop" && (
            <ShopManager
              key={shopSubTab}
              activeOutlet={activeOutlet}
              initialTab={shopSubTab}
            />
          )}
          {activeModule === "oms" && (
            <OmsModule
              key={omsSubTab}
              activeOutlet={activeOutlet}
              initialTab={omsSubTab}
            />
          )}
          {activeModule === "stores" && <StoresModule key={storesSubTab} initialTab={storesSubTab} />}
          {activeModule === "factory" && <FactoryModule key={factorySubTab} initialTab={factorySubTab} />}
          {activeModule === "kot" && <KotModule activeOutlet={activeOutlet} />}
          {activeModule === "vendor" && (
            <VendorModule
              key={vendorSubTab}
              initialTab={vendorSubTab}
            />
          )}
          {activeModule === "admin" && (
            <AdminModule
              key={adminSubTab}
              initialTab={adminSubTab}
              onOutletsUpdated={loadOutlets}
            />
          )}
          {activeModule === "item_admin" && (
            <ItemAdminModule
              key={itemAdminSubTab}
              initialTab={itemAdminSubTab}
            />
          )}
          {activeModule === "reports" && <ReportsModule />}
          {activeModule === "walkie_talkie" && (
            <WalkieTalkieModule
              currentUser={session?.user}
              activeOutlet={activeOutlet}
            />
          )}
        </main>
      </div>

      {/* System Documentation & Icon-Based Workflows Modal (Requirement 6) */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full p-6 lg:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#081F5C] dark:text-white">
                    Annavya Enterprise Architecture & Icon-Based Workflows Guide
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive visual operation manuals and data flows across all 14 food retail modules & microservices
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Architecture Ecosystem Overview */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-slate-700 space-y-2">
              <h4 className="font-extrabold text-sm text-[#081F5C] dark:text-sky-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Containerized Microservices Map (Port 8285 Unified API Gateway)
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs">
                PostgreSQL 16 Multi-Schema Database (<code className="font-mono text-blue-600 font-bold">annavya_erp:5460</code>) powers 8 FastAPI microservices: Admin (:8001), Stores (:8002), Factory (:8003), OMS (:8004), Vendor (:8005), POS (:8006), KOT (:8007), and Reports (:8008), reverse-proxied under NGINX Gateway (:8285).
              </p>
            </div>

            {/* Module Workflows Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Flow 1: Retail POS */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <ScanBarcode className="w-4 h-4 text-blue-600" />
                  <span>1. Retail Sweet Counter POS Flow</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-sky-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Item Search / Barcode Scan / Fast Hotkeys</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-sky-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>RS232 Serial Scale Auto-Weigh Tare (±1g)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-sky-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>[F5] Add to Cart &gt; Dual [Enter] Estimate Bill</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-sky-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Cashier [F5] Pay: Cash Drawer Ejects &amp; 40-Col Invoice Prints</span>
                  </div>
                </div>
              </div>

              {/* Flow 2: Restaurant & Table KOT */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                  <span>2. Restaurant Table Service & KOT Flow</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Order Boy inputs table order on handheld tablet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Dual Slip Cut Prints at Kitchen (Copy 1: Captain, Copy 2: Chef)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Chef preps dish &amp; clicks Ready on KDS station</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Captain signals order boy / calls token on PA mic</span>
                  </div>
                </div>
              </div>

              {/* Flow 3: Self-Checkout KIOSK */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <Monitor className="w-4 h-4 text-emerald-600" />
                  <span>3. Express Self-Checkout KIOSK Flow</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Customer browses visual categorized vegetarian menu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Selects Dine-In or Takeaway &amp; adds customizations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Option A: Pay via Dynamic UPI QR | Option B: Pay at Cashier</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>KIOSK prints thermal receipt token for KOT counter collection</span>
                  </div>
                </div>
              </div>

              {/* Flow 4: Stores & Inward/Outward FEFO */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <Warehouse className="w-4 h-4 text-purple-600" />
                  <span>4. Stores Check-In, Check-Out & BOM Exploder</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Check-In Desk: Inward raw materials &amp; auto-generate batch number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>BOM Recipe Studio: Define sweet formulations &amp; permissible loss %</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Check-Out Desk: Issue to Sweet Factory or Counter via FEFO</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Live Audit Ledger records timestamped movements</span>
                  </div>
                </div>
              </div>

              {/* Flow 5: Sweet Factory & WIP */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <Factory className="w-4 h-4 text-rose-600" />
                  <span>5. Sweet Factory & Central Kitchen Production</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Factory Inbox receives pending production orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Accept Order &gt; Dispatches Raw Material Requisition to Stores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Sweet Cooking (Kettles) &gt; Lab QC Brix &amp; Fat Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Finished Goods Yield locked &gt; Dispatched via E-Way Bill</span>
                  </div>
                </div>
              </div>

              {/* Flow 6: OMS & Zomato/Swiggy */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <Gift className="w-4 h-4 text-orange-500" />
                  <span>6. OMS, Zomato/Swiggy & WhatsApp Gifting</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Incoming Aggregator Webhook triggers sound alarm chime</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Accept with Prep Time SLA or Decline with mandatory explanation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Bulk Corporate Gifting: Instant Quotation sent to customer WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Minimal Stepper Timeline: Search order by ID or last 4 digits</span>
                  </div>
                </div>
              </div>

              {/* Flow 7: Vendor Tendering & PO */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <Truck className="w-4 h-4 text-teal-600" />
                  <span>7. Vendor Governance & Line-Wise PO Approval</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Vendor Registration &amp; Multi-Document Vault (GST, FSSAI, MSME)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Active Tendering &amp; Price Master Contract Cap Locking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Location / Corp Manager line-wise PO inspection &amp; approval</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Official Letterhead Rule 46 GST PO generated for Vendor Inbox</span>
                  </div>
                </div>
              </div>

              {/* Flow 8: Admin & MFA Governance */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>8. User Governance, RBAC & Mandatory MFA</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Mandatory MFA enforced for privileged roles (Directors, Super Admins, Managers)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Real-time user search by name, employee code, or mobile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Super Admin MFA Device Recovery tool resets TOTP key if phone is lost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">4</span>
                    <span>Lock/Unlock accounts, reset 4-digit POS PINs &amp; scope multi-outlets</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="px-6 py-2.5 rounded-2xl bg-[#081F5C] hover:bg-blue-900 text-white font-bold text-xs shadow transition"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
