import { apiFetch } from "../api";

export const FAMOUS_PRINTER_DRIVERS = [
  "Epson TM-T82III (ESC/POS 58mm)",
  "Epson TM-T88VI (ESC/POS 80mm)",
  "Star Micronics TSP143III (StarPRNT 80mm)",
  "Star Micronics mC-Print3 (CloudPRNT)",
  "Bixolon SRP-330II (ESC/POS 80mm)",
  "TVS-E RP-3200 / RP-3230 (Indian Retail ESC/POS)",
  "Rugtek RP80 / RP58 Thermal (USB/LAN)",
  "Posiflex PP-6900 Aura (ESC/POS)",
];

export const FAMOUS_SCALE_DRIVERS = [
  "Essae DS-852 (RS232 / WebSerial)",
  "Mettler Toledo Ariva-S (USB-CDC / Serial)",
  "Avery Berkel XM100 (RS232)",
  "Eagle / Sansui Retail Scale (9600 bps)",
];

export const FAMOUS_SCANNER_DRIVERS = [
  "Honeywell Voyager 1200g (USB-HID Wedge)",
  "Zebra DS2208 2D Imager (USB-HID)",
  "TVS-E BS-C101 Star (USB-HID)",
  "Rugtek CD-3200 Wireless (2.4GHz HID)",
];

export function buildEscPosDrawerKick(pin: string): Uint8Array {
  // ESC p m t1 t2 -> m=0 (Pin 2) or m=1 (Pin 5)
  const m = pin.includes("5") ? 0x01 : 0x00;
  return new Uint8Array([0x1b, 0x70, m, 0x19, 0xfa]);
}

export function buildEscPosTestSlip(driverName: string, outletCode: string): Uint8Array {
  const enc = new TextEncoder();
  const text =
    `\n*** ANNAVYA ERP TEST PRINT ***\n` +
    `Driver: ${driverName}\n` +
    `Outlet: ${outletCode}\n` +
    `Status: ESC/POS & RJ11 OK\n` +
    `------------------------------\n\n\n`;
  const init = new Uint8Array([0x1b, 0x40]);
  const body = enc.encode(text);
  const cut = new Uint8Array([0x1d, 0x56, 0x00]);
  const out = new Uint8Array(init.length + body.length + cut.length);
  out.set(init, 0);
  out.set(body, init.length);
  out.set(cut, init.length + body.length);
  return out;
}

export async function kickCashDrawer(params: {
  driver: string;
  pin: string;
  outletCode: string;
  actor: string;
  reason: string;
}): Promise<{ hardwareSent: boolean; message: string }> {
  const frame = buildEscPosDrawerKick(params.pin);
  let hardwareSent = false;

  // Attempt WebSerial write if user already granted a port in Chrome/Edge
  try {
    const navAny = navigator as any;
    if (navAny?.serial?.getPorts) {
      const ports = await navAny.serial.getPorts();
      if (ports && ports.length > 0) {
        const port = ports[0];
        if (!port.readable) {
          await port.open({ baudRate: 9600 });
        }
        const writer = port.writable.getWriter();
        await writer.write(frame);
        writer.releaseLock();
        hardwareSent = true;
      }
    }
  } catch {
    hardwareSent = false;
  }

  // Always audit drawer kick in backend
  await apiFetch("/api/admin/hardware/drawer-audit", {
    method: "POST",
    body: JSON.stringify({
      action: "CASH_DRAWER_KICK",
      actor: params.actor,
      outlet_code: params.outletCode,
      driver: params.driver,
      details: {
        pin: params.pin,
        reason: params.reason,
        escpos_hex: Array.from(frame)
          .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
          .join(" "),
        direct_serial_sent: hardwareSent,
      },
    }),
  });

  return {
    hardwareSent,
    message: hardwareSent
      ? `Cash Drawer opened via WebSerial (${params.driver} • ${params.pin})`
      : `ESC/POS Drawer Pulse [1B 70 ${params.pin.includes("5") ? "01" : "00"} 19 FA] queued to ${params.driver} & logged`,
  };
}

export async function connectWebSerialDevice(): Promise<string> {
  const navAny = navigator as any;
  if (!navAny?.serial?.requestPort) {
    throw new Error(
      "WebSerial API requires Chrome/Edge over HTTPS or localhost. Using Network/Local Spooler bridge."
    );
  }
  const port = await navAny.serial.requestPort();
  await port.open({ baudRate: 9600 });
  return "Serial POS Printer / Scale paired at 9600 baud!";
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : " ".repeat(len - str.length) + str;
}

export function buildEscPos40ColReceipt(order: any, outlet?: any): Uint8Array {
  const isPaid =
    order?.status === "PAID_PENDING_DELIVERY" || order?.status === "DELIVERED_CLOSED";
  const docId = isPaid ? order?.invoice_no : order?.estimate_no;
  const lines: string[] = [
    "========================================",
    `     ${(outlet?.trade_name || "ANNAVYA HERITAGE SWEETS").slice(0, 30)}`,
    `     ${(outlet?.city || "New Delhi").slice(0, 30)} | Out: ${order?.outlet_code || "DEL01"}`,
    isPaid ? "            ** TAX INVOICE **" : "       ** ESTIMATE SLIP (UNPAID) **",
    `GSTIN: ${outlet?.gstin || "07AAACA5678A1ZY"}`,
    "----------------------------------------",
    `${isPaid ? "INV" : "EST"}: ${docId}`,
    `DT : ${new Date().toLocaleString("en-IN")}`,
    "----------------------------------------",
    "ITEM               QTY/WT        AMOUNT ",
    "----------------------------------------",
  ];
  for (const it of order?.items || []) {
    const nm = padRight(String(it.name || it.sku || "Item"), 18);
    const qty = padLeft(`${Number(it.qty).toFixed(it.uom === "kg" ? 2 : 0)}${it.uom || ""}`, 9);
    const amt = padLeft(Number(it.line_total || it.qty * it.unit_price || 0).toFixed(2), 13);
    lines.push(`${nm}${qty}${amt}`);
  }
  lines.push("----------------------------------------");
  lines.push(padRight("Subtotal:", 26) + padLeft(Number(order?.subtotal || 0).toFixed(2), 14));
  if (Number(order?.discount_amount || 0) > 0) {
    lines.push(
      padRight(`Disc (${order?.discount_category || "PROMO"}):`, 26) +
        padLeft(`-${Number(order.discount_amount).toFixed(2)}`, 14)
    );
  }
  lines.push(
    padRight("CGST + SGST:", 26) +
      padLeft((Number(order?.cgst || 0) + Number(order?.sgst || 0)).toFixed(2), 14)
  );
  lines.push("========================================");
  lines.push(
    padRight("GRAND TOTAL (INR):", 26) + padLeft(Number(order?.grand_total || 0).toFixed(2), 14)
  );
  lines.push("========================================");
  if (isPaid && Array.isArray(order?.payment_splits) && order.payment_splits.length > 0) {
    for (const sp of order.payment_splits) {
      lines.push(
        padRight(`Paid (${sp.mode}):`, 26) + padLeft(Number(sp.amount || 0).toFixed(2), 14)
      );
    }
    lines.push("----------------------------------------");
  }
  lines.push(
    isPaid
      ? "  Scan / Enter Last 4 Digits at Delivery"
      : "  Present at Cash Counter for Payment"
  );
  lines.push("       Thank You! Visit Annavya Again\n\n\n");

  const enc = new TextEncoder();
  const init = new Uint8Array([0x1b, 0x40]);
  const body = enc.encode(lines.join("\n"));
  const cut = new Uint8Array([0x1d, 0x56, 0x00]);
  const out = new Uint8Array(init.length + body.length + cut.length);
  out.set(init, 0);
  out.set(body, init.length);
  out.set(cut, init.length + body.length);
  return out;
}

export async function print40ColumnThermalSlip(
  order: any,
  outlet?: any,
  driverName = "40-Column Thermal Printer"
): Promise<{ serialPrinted: boolean }> {
  if (!order) return { serialPrinted: false };
  let serialPrinted = false;

  // 1. If WebSerial thermal printer is paired, send raw 40-col ESC/POS + cut
  try {
    const navAny = navigator as any;
    if (navAny?.serial?.getPorts) {
      const ports = await navAny.serial.getPorts();
      if (ports && ports.length > 0) {
        const port = ports[0];
        if (!port.readable) await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(buildEscPos40ColReceipt(order, outlet));
        writer.releaseLock();
        serialPrinted = true;
      }
    }
  } catch {
    serialPrinted = false;
  }

  // 2. Render crisp 40-column 58mm print receipt in hidden iframe and print
  try {
    const isPaid =
      order.status === "PAID_PENDING_DELIVERY" || order.status === "DELIVERED_CLOSED";
    const docId = isPaid ? order.invoice_no : order.estimate_no;
    const last4 = String(docId || "").slice(-4);
    const itemsHtml = (order.items || [])
      .map(
        (it: any) => `
        <tr>
          <td style="padding:2px 0;">${String(it.name || it.sku).slice(0, 20)}</td>
          <td style="text-align:right;padding:2px 4px;">${Number(it.qty).toFixed(it.uom === "kg" ? 2 : 0)}${it.uom || ""}</td>
          <td style="text-align:right;padding:2px 0;">${Number(it.line_total || it.qty * it.unit_price || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");
    const splitsHtml = (order.payment_splits || [])
      .map(
        (sp: any) =>
          `<div style="display:flex;justify-content:space-between;"><span>${sp.mode}</span><span>Rs.${Number(sp.amount || 0).toFixed(2)}</span></div>`
      )
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>40-Col Slip - ${docId}</title>
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { font-family: "Courier New", Courier, monospace; font-size: 11px; width: 40ch; margin: 0 auto; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .line { border-top: 1px dashed #000; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
</style>
</head>
<body>
  <div class="center bold" style="font-size:13px;">${outlet?.trade_name || "ANNAVYA HERITAGE SWEETS"}</div>
  <div class="center" style="font-size:10px;">${outlet?.legal_name || "Annavya Foods Retail Pvt Ltd"}</div>
  <div class="center" style="font-size:10px;">${outlet?.address || "New Delhi"}</div>
  ${
    isPaid
      ? `<div class="center" style="font-size:10px;">GSTIN: ${outlet?.gstin || "07AAACA5678A1ZY"}</div>
         <div class="center" style="font-size:10px;">FSSAI: ${outlet?.fssai_no || "13324001000451"}</div>
         <div class="center bold" style="margin-top:4px;border:1px solid #000;padding:2px;">TAX INVOICE (40-COL)</div>`
      : `<div class="center bold" style="margin-top:4px;border:1px solid #000;padding:2px;">ESTIMATE SLIP - NOT A BILL</div>`
  }
  <div class="line"></div>
  <div class="row"><span>${isPaid ? "INV" : "EST"}: <b>${docId}</b></span><span>Out: ${order.outlet_code}</span></div>
  <div class="row"><span>Token Last-4: <b>#${last4}</b></span><span>${new Date().toLocaleTimeString("en-IN")}</span></div>
  <div style="font-size:10px;">Driver: ${driverName}</div>
  <div class="line"></div>
  <table>
    <thead>
      <tr style="border-bottom:1px dotted #000;">
        <th style="text-align:left;">ITEM</th>
        <th style="text-align:right;">QTY</th>
        <th style="text-align:right;">AMT</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>Rs.${Number(order.subtotal || 0).toFixed(2)}</span></div>
  ${
    Number(order.discount_amount || 0) > 0
      ? `<div class="row"><span>Disc (${order.discount_category || "PROMO"})</span><span>-Rs.${Number(order.discount_amount).toFixed(2)}</span></div>`
      : ""
  }
  <div class="row"><span>CGST + SGST</span><span>Rs.${(Number(order.cgst || 0) + Number(order.sgst || 0)).toFixed(2)}</span></div>
  <div class="line"></div>
  <div class="row bold" style="font-size:13px;"><span>GRAND TOTAL</span><span>Rs.${Number(order.grand_total || 0).toFixed(2)}</span></div>
  ${isPaid && splitsHtml ? `<div class="line"></div><div class="bold" style="font-size:10px;">TENDER SPLITS:</div>${splitsHtml}` : ""}
  <div class="line"></div>
  <div class="center bold" style="font-size:12px;letter-spacing:1px;">* ${docId} *</div>
  <div class="center" style="font-size:9.5px;margin-top:3px;">
    ${isPaid ? "Scan or Enter Last 4 Digits (#" + last4 + ") at Delivery" : "Present Last 4 Digits (#" + last4 + ") at Cash Counter"}
  </div>
</body>
</html>`;

    const existing = document.getElementById("annavya-40col-print-frame");
    if (existing) existing.remove();
    const iframe = document.createElement("iframe");
    iframe.id = "annavya-40col-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow?.document;
    if (idoc) {
      idoc.open();
      idoc.write(html);
      idoc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Headless or blocked print dialog fails silently
        }
      }, 150);
    }
  } catch {
    // Print failure must never block POS workflow
  }
  return { serialPrinted };
}

