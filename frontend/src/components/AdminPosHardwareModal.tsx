import React, { useState, useEffect } from "react";
import {
  Printer,
  Scale,
  Barcode,
  CheckCircle2,
  X,
  Zap,
  Save,
  RefreshCw,
  Sliders,
  FileText,
  DollarSign,
  Laptop,
} from "lucide-react";
import { print40ColumnThermalSlip, kickCashDrawer } from "../utils/posHardware";
import { formatINR } from "../api";

export interface PosHardwareSettings {
  thermalPrinter: {
    paperWidth: "40_COL" | "80_MM";
    interfaceType: "SERIAL_USB" | "NETWORK_RAW" | "BROWSER_SPOOLER";
    ipAddress: string;
    port: number;
    baudRate: number;
    autoCut: boolean;
    cashDrawerKick: boolean;
    printBarcodeOnBill: boolean;
    printUpiQrOnBill: boolean;
    printCounterDetails: boolean;
    printCashierDetails: boolean;
    printTerminalIp: boolean;
    headerLine1: string;
    headerLine2: string;
    footerTagline: string;
  };
  labelPrinter: {
    enabled: boolean;
    brand: string;
    barcodeType: "CODE128" | "EAN13";
    labelWidthMm: number;
    labelHeightMm: number;
    printTareWeight: boolean;
  };
  weighingScale: {
    enabled: boolean;
    brand: string;
    baudRate: number;
    defaultTareGrams: number;
    autoReadMode: boolean;
  };
}

export const DEFAULT_HARDWARE_SETTINGS: PosHardwareSettings = {
  thermalPrinter: {
    paperWidth: "40_COL",
    interfaceType: "BROWSER_SPOOLER",
    ipAddress: "192.168.1.201",
    port: 9100,
    baudRate: 9600,
    autoCut: true,
    cashDrawerKick: true,
    printBarcodeOnBill: true,
    printUpiQrOnBill: true,
    printCounterDetails: true,
    printCashierDetails: true,
    printTerminalIp: true,
    headerLine1: "BIKANERVALA",
    headerLine2: "SWEETS • RESTAURANT • CHAAT • NAMKEEN",
    footerTagline: "Taste of Tradition • Fresh Thinking",
  },
  labelPrinter: {
    enabled: true,
    brand: "TVS / TSC Thermal Barcode",
    barcodeType: "CODE128",
    labelWidthMm: 50,
    labelHeightMm: 30,
    printTareWeight: true,
  },
  weighingScale: {
    enabled: true,
    brand: "Essae Teraoka / CAS Digital Scale",
    baudRate: 9600,
    defaultTareGrams: 50,
    autoReadMode: false,
  },
};

interface AdminPosHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOutlet: string;
  outletName?: string;
  actorName?: string;
}

export const AdminPosHardwareModal: React.FC<AdminPosHardwareModalProps> = ({
  isOpen,
  onClose,
  activeOutlet,
  outletName = "Bikanervala Karol Bagh Flagship",
  actorName = "Super Admin",
}) => {
  const [settings, setSettings] = useState<PosHardwareSettings>(DEFAULT_HARDWARE_SETTINGS);
  const [activeTab, setActiveTab] = useState<"thermal" | "label" | "scale">("thermal");
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("annavya_pos_hardware_config");
      if (stored) {
        setSettings({ ...DEFAULT_HARDWARE_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn("Could not read hardware settings:", e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showStatus = (ok: boolean, text: string) => {
    setStatusMsg({ ok, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleSave = () => {
    localStorage.setItem("annavya_pos_hardware_config", JSON.stringify(settings));
    showStatus(true, "Hardware and Printer configurations saved successfully!");
  };

  const handleTestThermalPrint = () => {
    const sampleOrder = {
      estimate_no: `EST-${activeOutlet}-TEST`,
      invoice_no: `INV-${activeOutlet}-9999`,
      outlet_code: activeOutlet,
      status: "PAID_PENDING_DELIVERY",
      counter_id: "CNT-01",
      counter_name: "Mithai Counter 1 (Test)",
      cashier_id: "CSH-001",
      cashier_name: actorName,
      terminal_ip: "127.0.0.1",
      items: [
        {
          name: "Royal Silver-Leaf Kaju Katli",
          qty: 1.0,
          uom: "kg",
          unit_price: 1180,
          gross_wt_g: 1050,
          tare_wt_g: 50,
          net_wt_g: 1000,
          line_total: 1180,
        },
        {
          name: "Spongy White Rasgulla",
          qty: 0.5,
          uom: "kg",
          unit_price: 480,
          gross_wt_g: 545,
          tare_wt_g: 45,
          net_wt_g: 500,
          line_total: 240,
        },
      ],
      subtotal: 1420,
      discount_amount: 142,
      discount_category: "ADMIN TEST 10%",
      cgst: 31.95,
      sgst: 31.95,
      grand_total: 1341.9,
      payment_splits: [{ mode: "UPI", amount: 1341.9, ref: "TEST-UPI-99128" }],
    };

    const outletObj = {
      code: activeOutlet,
      trade_name: "Bikanervala Heritage Sweets",
      legal_name: "Bikanervala Foods Pvt. Ltd.",
      address: "10181/82 Gurudwara Road, Bikanervala Chowk, Arya Samaj Rd, Karol Bagh, New Delhi, Delhi 110005",
      gstin: "07AAAFB0115B1ZJ",
      fssai_no: "13324001000451",
    };

    print40ColumnThermalSlip(sampleOrder, outletObj);
    showStatus(true, "Test 40-Column Receipt queued to Thermal Slip Printer!");
  };

  const handleTestCashDrawer = async () => {
    try {
      const res = await kickCashDrawer({
        driver: "40-Column Thermal Receipt / RJ-11 Drawer",
        pin: "2",
        outletCode: activeOutlet || "DEL01",
        actor: actorName || "Admin",
        reason: "Hardware Diagnostic Test Pulse",
      });
      showStatus(true, res.message || "Cash Drawer Kick pulse [1B 70 00 19 FA] triggered!");
    } catch (e: any) {
      showStatus(false, e.message);
    }
  };

  const handleTestBarcodePrint = () => {
    const dummyWindow = window.open("", "_blank", "width=400,height=300");
    if (dummyWindow) {
      dummyWindow.document.write(`
        <html>
          <head><title>Test Barcode Label</title></head>
          <body style="font-family: monospace; text-align: center; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold;">BIKANERVALA SWEETS</div>
            <div style="font-size: 13px; font-weight: bold; margin: 4px 0;">Kaju Katli (500g Box)</div>
            <div style="font-size: 10px;">Net: 0.500 kg | Rate: ₹1,180/kg</div>
            <div style="font-size: 14px; font-weight: bold; margin: 4px 0;">MRP: ₹590.00</div>
            <div style="margin: 8px 0; font-family: monospace; font-size: 16px; letter-spacing: 3px;">|||| | ||||| ||| |||||||</div>
            <div style="font-size: 10px; font-weight: bold;">* FG-KAJU-01 *</div>
            <div style="font-size: 8px; color: #555;">Pkd: ${new Date().toLocaleDateString("en-IN")} • Use within 15 days</div>
            <script>window.print(); setTimeout(() => window.close(), 1000);</script>
          </body>
        </html>
      `);
      dummyWindow.document.close();
      showStatus(true, "Test Barcode sticker sent to Label Printer!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#081F5C] via-[#0C2E85] to-[#1442B5] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">Printer & Hardware Configuration</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#081F5C] font-black text-[10px] uppercase">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Configure 40-Col thermal slips, label printers, cash drawer pulses & scales for {activeOutlet}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex gap-2">
          {[
            { id: "thermal", label: "Thermal Receipt / Slip Printer (40-Col)", icon: Printer },
            { id: "label", label: "Barcode & Label Printer", icon: Barcode },
            { id: "scale", label: "Electronic Weighing Scale", icon: Scale },
          ].map((t) => {
            const isActive = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isActive
                    ? "bg-[#081F5C] text-white shadow-md dark:bg-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Toast Banner */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 ${
              statusMsg.ok
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-800 dark:text-slate-200">
          {/* TAB 1: Thermal Slip Printer */}
          {activeTab === "thermal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Paper Width Format
                  </label>
                  <select
                    value={settings.thermalPrinter.paperWidth}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thermalPrinter: {
                          ...settings.thermalPrinter,
                          paperWidth: e.target.value as any,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-semibold"
                  >
                    <option value="40_COL">40-Column Standard Retail (58mm Thermal Slip)</option>
                    <option value="80_MM">80mm High-Speed Receipt (Extended 48-Column)</option>
                  </select>
                  <span className="text-[10px] text-slate-500">
                    Standard 40-column format matches Bikanervala counter printers (EPSON TM-T82 / TVS / Citizen).
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Printer Interface & Communication
                  </label>
                  <select
                    value={settings.thermalPrinter.interfaceType}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thermalPrinter: {
                          ...settings.thermalPrinter,
                          interfaceType: e.target.value as any,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-semibold"
                  >
                    <option value="BROWSER_SPOOLER">Browser System Spooler / USB Driver (Universal)</option>
                    <option value="SERIAL_USB">WebSerial Direct ESC/POS (USB Serial 9600 Baud)</option>
                    <option value="NETWORK_RAW">Raw Network TCP Socket (IP:Port 9100)</option>
                  </select>
                </div>
              </div>

              {/* IP / Baud settings if network / serial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">
                    Printer Network IP Address
                  </label>
                  <input
                    type="text"
                    value={settings.thermalPrinter.ipAddress}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thermalPrinter: {
                          ...settings.thermalPrinter,
                          ipAddress: e.target.value,
                        },
                      })
                    }
                    placeholder="192.168.1.201"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">
                    RAW Port / Baud Rate
                  </label>
                  <input
                    type="number"
                    value={settings.thermalPrinter.port}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thermalPrinter: {
                          ...settings.thermalPrinter,
                          port: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Toggles for Slip Information */}
              <div className="space-y-2">
                <div className="font-extrabold text-slate-700 dark:text-slate-300">
                  Slip Output Details & Features
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: "printCounterDetails", label: "Print Cash Counter ID & Name on Bill" },
                    { key: "printCashierDetails", label: "Print Cashier ID & Name on Bill" },
                    { key: "printTerminalIp", label: "Print Workstation Terminal IP on Slip" },
                    { key: "printBarcodeOnBill", label: "Print Scannable Barcode for Handover" },
                    { key: "printUpiQrOnBill", label: "Print Dynamic UPI QR Code for Payment" },
                    { key: "autoCut", label: "Send Auto Paper-Cut Command (ESC i)" },
                    { key: "cashDrawerKick", label: "Auto Cash Drawer Pulse on Cash Settle" },
                  ].map((tg) => (
                    <label
                      key={tg.key}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer font-bold hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={(settings.thermalPrinter as any)[tg.key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            thermalPrinter: {
                              ...settings.thermalPrinter,
                              [tg.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span>{tg.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Testing */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTestThermalPrint}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ Test 40-Col Slip Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestCashDrawer}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center gap-2 shadow"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Test Cash Drawer Kick</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Label Printer */}
          {activeTab === "label" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Barcode Label Printer Model
                  </label>
                  <input
                    type="text"
                    value={settings.labelPrinter.brand}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        labelPrinter: {
                          ...settings.labelPrinter,
                          brand: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Barcode Symbology Standard
                  </label>
                  <select
                    value={settings.labelPrinter.barcodeType}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        labelPrinter: {
                          ...settings.labelPrinter,
                          barcodeType: e.target.value as any,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-semibold"
                  >
                    <option value="CODE128">Code 128 (Alphanumeric SKU & Weight)</option>
                    <option value="EAN13">EAN-13 (Standard Retail Barcode)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">
                    Label Width (mm)
                  </label>
                  <input
                    type="number"
                    value={settings.labelPrinter.labelWidthMm}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        labelPrinter: {
                          ...settings.labelPrinter,
                          labelWidthMm: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">
                    Label Height (mm)
                  </label>
                  <input
                    type="number"
                    value={settings.labelPrinter.labelHeightMm}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        labelPrinter: {
                          ...settings.labelPrinter,
                          labelHeightMm: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleTestBarcodePrint}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold flex items-center gap-2 shadow"
                >
                  <Barcode className="w-4 h-4" />
                  <span>🏷️ Test Barcode Label Print</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Weighing Scale */}
          {activeTab === "scale" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Electronic Scale Protocol & Brand
                  </label>
                  <input
                    type="text"
                    value={settings.weighingScale.brand}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weighingScale: {
                          ...settings.weighingScale,
                          brand: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                    Default Sweet Box Tare Weight (Grams)
                  </label>
                  <input
                    type="number"
                    value={settings.weighingScale.defaultTareGrams}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weighingScale: {
                          ...settings.weighingScale,
                          defaultTareGrams: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070E1C] font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">
                    Bikanervala standard tare: 50g (Half Kg Box), 70g (1 Kg Box). Auto deducted from gross weight.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Hardware settings are persisted locally for this cashier terminal.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 font-bold"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              <span>Save Hardware Config</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
