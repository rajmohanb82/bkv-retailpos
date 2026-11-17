import React, { useState, useEffect } from "react";
import {
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  Store,
  Factory,
  UtensilsCrossed,
  ScanBarcode,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../api";

export interface AuthUser {
  id: number;
  emp_id: string;
  full_name: string;
  email: string;
  mobile: string;
  role_name: string;
  permissions: any;
  outlet_codes: string[];
}

interface LoginScreenProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

const QUICK_PERSONAS = [
  { role: "Super Admin", empId: "EMP-002", pin: "1111", name: "Meera Kapoor" },
  { role: "Director / Owner", empId: "EMP-001", pin: "9001", name: "Rajeshwar Agarwal" },
  { role: "Shop Manager", empId: "EMP-003", pin: "2222", name: "Vikram Sethi" },
  { role: "Cashier", empId: "EMP-004", pin: "3333", name: "Priya Sharma" },
  { role: "Rest. Cashier", empId: "EMP-009", pin: "8888", name: "Neha Rawat" },
  { role: "Production Mgr", empId: "EMP-005", pin: "4444", name: "Suresh Halwai" },
  { role: "Storekeeper", empId: "EMP-006", pin: "5555", name: "Ramesh Yadav" },
  { role: "Kitchen Captain", empId: "EMP-007", pin: "6666", name: "Arjun Negi" },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({
  theme,
  onToggleTheme,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState("EMP-002");
  const [pin, setPin] = useState("1111");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<any>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    apiFetch<any>("/api/admin/branding")
      .then((data) => {
        if (data && data.customer_name) setBranding(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>(
        "/api/admin/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ identifier, pin }),
        }
      );
      onLoginSuccess(res.token, res.user);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F6F2] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Brand & Architecture Showcase */}
      <div className="lg:w-[48%] relative overflow-hidden bg-gradient-to-br from-[#081F5C] via-[#0D2E82] to-[#1246A8] dark:from-[#050A17] dark:via-[#0B1736] dark:to-[#12306E] text-white p-8 lg:p-12 flex flex-col justify-between">
        {/* Decorative background filigree rings */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full border border-amber-300/15 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold tracking-wide text-amber-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enterprise Multi-Outlet Food Retail ERP
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-sky-200" />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>
        </div>

        <div className="relative z-10 my-8 flex flex-col items-center text-center">
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#0B1328]/90 shadow-2xl border border-white/20 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-center gap-4">
              <img
                src={isDark ? "/annavya-logo-dark.png" : "/annavya-logo-light.png"}
                alt="Annavya"
                className="h-32 sm:h-40 w-auto object-contain mx-auto"
              />
              {branding?.customer_logo_url && (
                <>
                  <div className="h-20 w-px bg-slate-300 dark:bg-slate-700" />
                  <div className="flex flex-col items-center">
                    <img
                      src={
                        isDark
                          ? branding.customer_logo_dark_url || branding.customer_logo_url
                          : branding.customer_logo_url
                      }
                      alt={branding.customer_name || "Customer Logo"}
                      style={{
                        height: `${Math.min(Math.max(branding.customer_logo_height_px || 52, 42), 64)}px`,
                      }}
                      className="w-auto max-w-[160px] object-contain drop-shadow"
                    />
                    <span className="text-[10px] font-extrabold text-[#081F5C] dark:text-amber-200 mt-1">
                      {branding.customer_trade_name || branding.customer_name}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="mt-5 text-sm text-sky-100 max-w-md leading-relaxed">
            Unified operations for{" "}
            <span className="font-semibold text-amber-200">Sweet Shops</span>,{" "}
            <span className="font-semibold text-amber-200">Restaurants</span>,{" "}
            <span className="font-semibold text-amber-200">Hybrid Outlets</span>, and{" "}
            <span className="font-semibold text-amber-200">Central Mithai Factories</span>{" "}
            across CO, Franchised & DO networks.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3 text-xs">
          {[
            { icon: ScanBarcode, title: "3-Counter POS", desc: "Estimate → Cash → Delivery" },
            { icon: Factory, title: "Sweet Factory", desc: "BOM, 2-Stage WIP & QC" },
            { icon: UtensilsCrossed, title: "Multi-Station KOT", desc: "Floor Map & Live KDS" },
            { icon: Store, title: "SMS OTP Governance", desc: "FEFO & Anti-Tamper Controls" },
          ].map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-200 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">{f.title}</div>
                  <div className="text-[11px] text-sky-200">{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sign-In Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <img
                src={isDark ? "/annavya-badge-dark.png" : "/annavya-badge-light.png"}
                alt="Annavya Badge"
                className="w-11 h-11 object-contain shrink-0"
              />
              {branding?.customer_logo_url && (
                <>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <img
                    src={
                      isDark
                        ? branding.customer_logo_dark_url || branding.customer_logo_url
                        : branding.customer_logo_url
                    }
                    alt={branding.customer_name || "Customer Logo"}
                    style={{
                      height: `${Math.min(Math.max(branding.customer_logo_height_px || 44, 36), 54)}px`,
                    }}
                    className="w-auto max-w-[140px] object-contain drop-shadow-sm shrink-0"
                  />
                </>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold text-[#081F5C] dark:text-[#F8F3E6] truncate">
                  {branding?.customer_name || "Sign in to Annavya ERP"}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {branding?.brand_tagline || "Enterprise Multi-Outlet Food Retail ERP"}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Employee ID or Work Email
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="EMP-002 or meera.admin@annavya.in"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#0B1220] focus:outline-none focus:ring-2 focus:ring-[#1246A8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  4-Digit Quick ERP / POS PIN
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    required
                    type={showPin ? "text" : "password"}
                    maxLength={10}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm font-mono tracking-widest border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#0B1220] focus:outline-none focus:ring-2 focus:ring-[#1246A8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#081F5C] to-[#1246A8] hover:from-[#0D2E82] hover:to-[#1856C9] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <span>{loading ? "Verifying RBAC Session..." : "Sign In to Workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Staff Role Presets */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick-Fill Staff Credentials (PostgreSQL RBAC)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PERSONAS.map((p) => (
                  <button
                    key={p.empId}
                    type="button"
                    onClick={() => {
                      setIdentifier(p.empId);
                      setPin(p.pin);
                      setError(null);
                    }}
                    className={`text-left p-2.5 rounded-xl border text-xs transition ${
                      identifier.toUpperCase() === p.empId
                        ? "border-[#1246A8] bg-[#EBF4FF] dark:bg-blue-950/60 dark:border-sky-500"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162033] hover:border-[#1246A8]"
                    }`}
                  >
                    <div className="font-bold text-[#081F5C] dark:text-[#F8F3E6] truncate">
                      {p.role}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {p.empId} • PIN {p.pin}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            Annavya Food Retail Chain ERP • Containerized Microservices Cluster
          </div>
        </div>
      </div>
    </div>
  );
};

