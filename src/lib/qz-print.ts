/**
 * QZ-Tray Silent Thermal Receipt Printing & Cash Drawer Control Utility
 * Implements official Stocky v5.8 POS Hardware specifications
 */

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

export async function printThermalReceipt(
  htmlReceipt: string,
  printerName = "Receipt Printer",
  kickDrawer = false
): Promise<boolean> {
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
      console.error("QZ print failed, falling back to browser print:", err);
    }
  }

  // Fallback: Invisible iframe printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt Print</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          ${htmlReceipt}
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
    return true;
  }

  return false;
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
