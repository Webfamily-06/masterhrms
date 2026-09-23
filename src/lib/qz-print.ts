/**
 * QZ-Tray Silent Thermal Receipt Printing & Cash Drawer Control Utility
 * Implements official Stocky v5.8 POS Hardware specifications
 */

export interface ThermalReceiptItem {
  id?: string;
  name: string;
  qty: number;
  price: number;
  total?: number;
  code?: string;
}

export interface ThermalReceiptStoreInfo {
  appName?: string;
  companyName?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  currency?: string;
  currencySymbol?: string;
  footerMessage?: string;
}

export interface ThermalReceiptData {
  receiptNo: string;
  date: string;
  cashier?: string;
  customer?: string;
  customerName?: string;
  customerGstin?: string;
  paymentMode: string;
  items: ThermalReceiptItem[];
  subtotal: number;
  discountAmt?: number;
  taxMode?: "igst" | "sgst_cgst";
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  paidAmount?: number;
  changeDue?: number;
}

let isQzConnected = false;

export async function initQz(
  certEndpoint = "/api/qz/certificate",
  signEndpoint = "/api/qz/sign"
): Promise<boolean> {
  try {
    const qz = (window as any).qz;
    if (!qz) {
      console.warn("QZ-Tray library not loaded on window. Standard browser printing fallback will be used.");
      return false;
    }

    qz.security.setCertificatePromise((resolve: any, reject: any) => {
      fetch(certEndpoint)
        .then((res) => res.text())
        .then(resolve)
        .catch(reject);
    });

    qz.security.setSignaturePromise((toSign: string) => (resolve: any, reject: any) => {
      fetch(signEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ request: toSign }),
      })
        .then((res) => res.text())
        .then(resolve)
        .catch(reject);
    });

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }

    isQzConnected = true;
    console.log("QZ-Tray hardware printing service connected successfully.");
    return true;
  } catch (err) {
    console.warn("QZ-Tray daemon connection bypassed (using browser print fallback):", err);
    isQzConnected = false;
    return false;
  }
}

/**
 * Generates clean, high-contrast, offline-first thermal receipt HTML
 * strictly formatted for 80mm or 58mm POS thermal printers.
 */
export function generateThermalReceiptHtml(
  receipt: ThermalReceiptData,
  store: ThermalReceiptStoreInfo = {},
  paperWidth: "80mm" | "58mm" = "80mm"
): string {
  const storeName = store.appName || store.companyName || "MASTER POS";
  const currency = store.currencySymbol || "₹";
  const is58 = paperWidth === "58mm";

  const itemRowsHtml = receipt.items
    .map((item) => {
      const lineAmt = (item.total ?? item.price * item.qty).toFixed(2);
      const rate = item.price.toFixed(2);
      return `
        <tr>
          <td colspan="4" style="padding-top: 3px; font-weight: bold; word-break: break-word;">${item.name}</td>
        </tr>
        <tr style="border-bottom: 1px dotted #ccc;">
          <td style="text-align: left; padding-bottom: 3px; font-size: ${is58 ? "9px" : "10px"}; color: #444;">
            ${item.qty} x ${currency}${rate}
          </td>
          <td colspan="3" style="text-align: right; font-weight: bold; padding-bottom: 3px;">
            ${currency}${lineAmt}
          </td>
        </tr>
      `;
    })
    .join("");

  const discountHtml =
    receipt.discountAmt && receipt.discountAmt > 0
      ? `<div style="display: flex; justify-content: space-between; color: #166534;">
          <span>Discount:</span>
          <span>-${currency}${receipt.discountAmt.toFixed(2)}</span>
        </div>`
      : "";

  const taxHtml =
    receipt.taxMode === "sgst_cgst"
      ? `
        <div style="display: flex; justify-content: space-between;">
          <span>CGST:</span>
          <span>${currency}${(receipt.cgst || 0).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>SGST:</span>
          <span>${currency}${(receipt.sgst || 0).toFixed(2)}</span>
        </div>
      `
      : `
        <div style="display: flex; justify-content: space-between;">
          <span>Tax / IGST:</span>
          <span>${currency}${(receipt.igst || 0).toFixed(2)}</span>
        </div>
      `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${receipt.receiptNo}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${paperWidth} !important;
            }
            .no-print {
              display: none !important;
            }
          }
          body {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: ${is58 ? "10px" : "11px"};
            line-height: 1.25;
            color: #000;
            background: #fff;
            width: ${paperWidth};
            margin: 0 auto;
            padding: ${is58 ? "2mm" : "4mm"};
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .dashed-divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .double-divider {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <!-- STORE HEADER -->
        <div class="center" style="margin-bottom: 6px;">
          <div style="font-weight: 900; font-size: ${is58 ? "13px" : "15px"}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${storeName}
          </div>
          ${store.address ? `<div style="font-size: ${is58 ? "9px" : "10px"}; margin-top: 1px;">${store.address}</div>` : ""}
          ${store.phone ? `<div style="font-size: ${is58 ? "9px" : "10px"};">Tel: ${store.phone}</div>` : ""}
          ${store.gstin ? `<div class="bold" style="font-size: ${is58 ? "9px" : "10px"}; margin-top: 2px;">GSTIN: ${store.gstin}</div>` : ""}
        </div>

        <div class="dashed-divider"></div>

        <!-- RECEIPT META -->
        <div style="font-size: ${is58 ? "9px" : "10px"}; margin: 4px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span class="bold">RC: ${receipt.receiptNo}</span>
            <span>${receipt.date}</span>
          </div>
          ${receipt.cashier ? `<div>Cashier: ${receipt.cashier}</div>` : ""}
          ${receipt.customer || receipt.customerName ? `<div>Customer: <strong>${receipt.customer || receipt.customerName}</strong></div>` : ""}
          ${receipt.customerGstin ? `<div>Cust GSTIN: ${receipt.customerGstin}</div>` : ""}
        </div>

        <div class="dashed-divider"></div>

        <!-- ITEMS TABLE -->
        <table style="width: 100%; border-collapse: collapse; font-size: ${is58 ? "9px" : "10px"}; margin: 4px 0;">
          <thead>
            <tr style="border-bottom: 1px solid #000; font-weight: bold;">
              <th style="text-align: left; padding-bottom: 2px;">ITEM & DETAILS</th>
              <th colspan="3" style="text-align: right; padding-bottom: 2px;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

        <div class="dashed-divider"></div>

        <!-- TOTALS & TAX BREAKDOWN -->
        <div style="font-size: ${is58 ? "9px" : "10px"}; space-y: 2px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${currency}${receipt.subtotal.toFixed(2)}</span>
          </div>
          ${discountHtml}
          ${taxHtml}

          <div class="double-divider" style="display: flex; justify-content: space-between; font-weight: 900; font-size: ${is58 ? "12px" : "14px"};">
            <span>GRAND TOTAL:</span>
            <span>${currency}${receipt.total.toFixed(2)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 3px;">
            <span>Paid via (${receipt.paymentMode}):</span>
            <span class="bold">${currency}${(receipt.paidAmount ?? receipt.total).toFixed(2)}</span>
          </div>

          ${
            receipt.changeDue && receipt.changeDue > 0
              ? `<div style="display: flex; justify-content: space-between;">
                  <span>Change Due:</span>
                  <span>${currency}${receipt.changeDue.toFixed(2)}</span>
                </div>`
              : ""
          }
        </div>

        <div class="dashed-divider"></div>

        <!-- FOOTER & BARCODE -->
        <div class="center" style="font-size: ${is58 ? "9px" : "10px"}; margin-top: 8px;">
          <div class="bold">THANK YOU FOR YOUR VISIT!</div>
          <div style="font-size: 8px; color: #555; margin-top: 2px;">
            ${store.footerMessage || "Terms: Returns accepted within 7 days with valid tax invoice."}
          </div>
          <div style="margin-top: 8px; font-family: monospace; letter-spacing: 2px; font-size: 11px;">
            *${receipt.receiptNo}*
          </div>
        </div>

        <!-- Paper feed for thermal cutter -->
        <div style="height: 12mm;"></div>
      </body>
    </html>
  `;
}

/**
 * Opens an isolated print window rendering solely the thermal receipt,
 * avoiding printing the rest of the POS application interface.
 */
export function openThermalPrintWindow(htmlContent: string, title = "Receipt Print"): void {
  const printWin = window.open("", "_blank", "width=420,height=650,menubar=no,toolbar=no,location=no,status=no");
  if (printWin) {
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 300);
  }
}

export async function printThermalReceipt(
  receiptOrHtml: string | ThermalReceiptData,
  storeInfo: ThermalReceiptStoreInfo = {},
  printerName = "Receipt Printer",
  kickDrawer = false,
  paperWidth: "80mm" | "58mm" = "80mm"
): Promise<boolean> {
  const htmlReceipt =
    typeof receiptOrHtml === "string"
      ? receiptOrHtml
      : generateThermalReceiptHtml(receiptOrHtml, storeInfo, paperWidth);

  const qz = (window as any).qz;

  if (qz && isQzConnected) {
    try {
      const config = qz.configs.create(printerName, { rasterize: false });
      const printData: any[] = [{ type: "html", format: "plain", data: htmlReceipt }];

      if (kickDrawer) {
        // ESC/POS Pin 2 pulse drawer kick: ESC p 0 25 250 (1B 70 00 19 FA)
        printData.push({ type: "raw", format: "hex", data: "1B700019FA" });
      }

      await qz.print(config, printData);
      return true;
    } catch (err) {
      console.error("QZ print failed, falling back to browser thermal window:", err);
    }
  }

  // Fallback: Open clean isolated thermal print window
  openThermalPrintWindow(htmlReceipt);
  return true;
}

export async function triggerCashDrawerKick(printerName = "Receipt Printer"): Promise<boolean> {
  const qz = (window as any).qz;
  if (qz && isQzConnected) {
    try {
      const config = qz.configs.create(printerName, { rasterize: false });
      await qz.print(config, [{ type: "raw", format: "hex", data: "1B700019FA" }]);
      return true;
    } catch (err) {
      console.warn("Could not trigger silent cash drawer kick:", err);
    }
  }
  return false;
}

