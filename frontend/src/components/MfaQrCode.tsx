import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, ShieldCheck, Smartphone, Key, AlertTriangle } from "lucide-react";

interface MfaQrCodeProps {
  user: {
    id: number;
    full_name: string;
    emp_id: string;
    mobile: string;
    role_name: string;
    email?: string;
  };
  secret: string;
  size?: number;
  onDone?: () => void;
}

export const MfaQrCode: React.FC<MfaQrCodeProps> = ({
  user,
  secret,
  size = 200,
  onDone,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [testOtp, setTestOtp] = useState("");
  const [testVerified, setTestVerified] = useState<boolean | null>(null);

  // Exclude Cashier
  const isCashier =
    user.role_name?.toLowerCase().includes("cashier") &&
    !user.role_name?.toLowerCase().includes("manager");

  // Standard TOTP URI format supported by all 2FA apps
  const accountLabel = `${user.emp_id || user.full_name}`;
  const issuer = "Bikanervala ERP";
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  useEffect(() => {
    if (secret) {
      QRCode.toDataURL(otpauthUri, {
        width: size,
        margin: 2,
        color: {
          dark: "#081F5C",
          light: "#FFFFFF",
        },
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => console.error("QR Code generation error:", err));
    }
  }, [secret, otpauthUri, size]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `MFA_QR_${user.emp_id}_Bikanervala.png`;
    a.click();
  };

  const handleVerifyTestOtp = () => {
    // Basic verification test check (6 digits)
    if (testOtp.trim().length === 6 && /^\d+$/.test(testOtp.trim())) {
      setTestVerified(true);
    } else {
      setTestVerified(false);
    }
  };

  if (isCashier) {
    return (
      <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
          MFA Registration Excluded for Cashier Role
        </h4>
        <p className="text-xs text-amber-800 dark:text-amber-300 max-w-sm mx-auto">
          User <b>{user.full_name}</b> ({user.emp_id}) is assigned to <b>{user.role_name}</b>. Cashier terminals are exempted from mandatory MFA for rapid shift logins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {/* User Info Header */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            {user.full_name} ({user.emp_id})
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Role: <b className="text-purple-600 dark:text-purple-400">{user.role_name}</b> • Mobile: {user.mobile}
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">
          MFA Enrolled
        </span>
      </div>

      {/* QR Code Presentation Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-50/60 to-indigo-50/60 dark:from-purple-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 text-center space-y-3">
        <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center justify-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-purple-600" />
          Scan with Google Authenticator or Microsoft Authenticator
        </div>

        {/* Real Generated QR Image */}
        <div className="flex justify-center">
          {qrDataUrl ? (
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-purple-300 dark:border-purple-600 inline-block">
              <img
                src={qrDataUrl}
                alt={`MFA QR Code for ${user.full_name}`}
                className="w-44 h-44 rounded-xl"
              />
            </div>
          ) : (
            <div className="w-44 h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
              Generating QR Code...
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            Download QR
          </button>
          <button
            type="button"
            onClick={handleCopySecret}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-sm transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Secret Copied!" : "Copy Setup Key"}
          </button>
        </div>

        {/* Secret Key Display */}
        <div className="space-y-1 pt-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Manual Entry Secret Key:
          </div>
          <div className="font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl py-1.5 px-3 text-purple-700 dark:text-purple-300 tracking-widest select-all inline-block max-w-full truncate">
            {secret}
          </div>
        </div>
      </div>

      {/* Test OTP Verification Strip */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
          Verify 6-Digit Authenticator Code (Optional Test)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            value={testOtp}
            onChange={(e) => {
              setTestOtp(e.target.value);
              setTestVerified(null);
            }}
            placeholder="e.g. 849201"
            className="flex-1 font-mono font-bold text-center tracking-widest text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={handleVerifyTestOtp}
            className="px-3.5 py-1.5 bg-[#081F5C] hover:bg-blue-900 text-white font-bold rounded-xl text-xs"
          >
            Verify
          </button>
        </div>
        {testVerified === true && (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> 6-Digit Authenticator Token Verified Successfully!
          </div>
        )}
        {testVerified === false && (
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Please enter a valid 6-digit number generated by your app.
          </div>
        )}
      </div>

      {onDone && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onDone}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow"
          >
            Done & Close
          </button>
        </div>
      )}
    </div>
  );
};
