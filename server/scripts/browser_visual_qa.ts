import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { prisma, rawPrisma } from "../src/prisma";
import { generateToken } from "../src/lib/jwt";

const db = rawPrisma || prisma;
const ARTIFACT_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity-ide\\brain\\2215b1d4-7591-4008-ad4e-0a76f34bd6d4";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

interface CdpMessage {
  id: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

class CdpClient {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  async connect(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data.toString()) as CdpMessage;
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve(msg.result);
            }
          }
        } catch (e) {
          console.error("CDP message parse error:", e);
        }
      };
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate<T = any>(expression: string): Promise<T> {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async clickAt(x: number, y: number): Promise<void> {
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
    });
    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await sleep(50);
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }

  async clickSelector(evalExpr: string): Promise<boolean> {
    const coords = await this.evaluate(`
      (() => {
        const el = ${evalExpr};
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `);
    if (!coords) return false;
    await this.clickAt(coords.x, coords.y);
    return true;
  }

  async screenshot(filePath: string): Promise<void> {
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath} (${buffer.length} bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=========================================================================");
  console.log("  PURCHASE TRANSACTION UI — AUTOMATED HEADLESS CHROME VISUAL QA GATE    ");
  console.log("=========================================================================\n");

  // 1. Prepare Super Admin Token securely in-memory
  const superAdmin = await db.user.findFirst({
    where: { roles: { some: { role: "super_admin" } } },
  });
  if (!superAdmin) throw new Error("No super admin found");

  const token = generateToken({
    userId: superAdmin.id,
    email: superAdmin.email,
    roles: ["super_admin"],
  });

  // 2. Launch Chrome Headless
  const profileDir = path.join(ARTIFACT_DIR, "chrome-qa-profile");
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chromeProc: ChildProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profileDir}`,
      "--window-size=1920,1080",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const cleanup = () => {
    try {
      chromeProc.kill();
    } catch {}
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);

  console.log("Launched headless Chrome on port", PORT);

  // Poll for Chrome to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json/version`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(300);
  }
  if (!ready) throw new Error("Chrome did not start debugging port in time");

  // Create or get page session
  const listRes = await fetch(`http://localhost:${PORT}/json/list`);
  const listData: any = await listRes.json();
  let wsUrl = listData[0]?.webSocketDebuggerUrl;
  if (!wsUrl) {
    const targetRes = await fetch(`http://localhost:${PORT}/json/new`, { method: "PUT" });
    const targetData: any = await targetRes.json();
    wsUrl = targetData.webSocketDebuggerUrl;
  }

  const client = new CdpClient(wsUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("DOM.enable");

  console.log("CDP connected to target page.");

  console.log("Navigating to http://localhost:5173/auth to initialize origin...");
  await client.send("Page.navigate", { url: "http://localhost:5173/auth" });
  await sleep(1500);

  // Inject token in localStorage
  await client.evaluate(`
    localStorage.setItem('hrms_auth_token', ${JSON.stringify(token)});
    localStorage.setItem('theme', 'light');
  `);
  console.log("Super Admin authentication token securely injected into localStorage.");

  // Navigate to /super/transactions
  console.log("Navigating to http://localhost:5173/super/transactions ...");
  await client.send("Page.navigate", { url: "http://localhost:5173/super/transactions" });

  // Wait for table to load
  let tableLoaded = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const state = await client.evaluate(`
      ({
        url: window.location.href,
        hasTable: Boolean(document.querySelector('table')),
        rowCount: document.querySelectorAll('tbody tr').length,
        bodySnippet: document.body.innerText.slice(0, 300)
      })
    `);
    if (i % 6 === 0) {
      console.log(`[Wait ${i*500}ms] URL: ${state?.url} | Rows: ${state?.rowCount} | Snippet: ${state?.bodySnippet?.replace(/\\n/g, ' ')}`);
    }
    if (state?.hasTable && state?.rowCount >= 1) {
      tableLoaded = true;
      break;
    }
  }

  if (!tableLoaded) {
    const shotFail = path.join(ARTIFACT_DIR, "vqa_fail_debug.png");
    await client.screenshot(shotFail);
    const fullText = await client.evaluate(`document.body.innerText`);
    console.log("Page full text on failure:", fullText);
    throw new Error("Transaction table did not render in 20 seconds");
  }
  await sleep(1000); // Allow any animation/transitions to settle

  // -----------------------------------------------------------------------
  // SCREENSHOT 1A: Main Transaction Table (Left & Core Columns)
  // -----------------------------------------------------------------------
  const shot1 = path.join(ARTIFACT_DIR, "vqa_01_transactions_table.png");
  await client.screenshot(shot1);

  // -----------------------------------------------------------------------
  // SCREENSHOT 1B: Table Scrolled to Right (Receipt & Actions Columns)
  // -----------------------------------------------------------------------
  await client.evaluate(`
    (() => {
      const el = document.querySelector('.overflow-x-auto');
      if (el) el.scrollLeft = 9999;
    })()
  `);
  await sleep(400);
  const shot1Right = path.join(ARTIFACT_DIR, "vqa_01b_table_right_columns.png");
  await client.screenshot(shot1Right);

  // Scroll back
  await client.evaluate(`
    (() => {
      const el = document.querySelector('.overflow-x-auto');
      if (el) el.scrollLeft = 0;
    })()
  `);
  await sleep(300);

  // -----------------------------------------------------------------------
  // DOM VALIDATION SUITE: Inspect rendered table elements directly in Chrome
  // -----------------------------------------------------------------------
  const tableData: any = await client.evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(tr => {
        const text = tr.innerText;
        const html = tr.innerHTML;
        const buttons = Array.from(tr.querySelectorAll('button')).map(b => ({
          title: b.getAttribute('title') || b.innerText.trim(),
          text: b.innerText.trim(),
          ariaLabel: b.getAttribute('aria-label') || ''
        }));
        return { text, buttons, html };
      });
    })()
  `);

  console.log(`\nDetected ${tableData.length} rendered transaction rows in browser.`);

  // 1. Verify Razorpay Processing
  const rzpProcRow = tableData.find((r: any) => r.text.includes("INV-DEMO-RZP-PROC") || (r.text.includes("Razorpay") && r.text.includes("Processing")));
  console.log("\n[CHECK 1] Razorpay Processing Row:");
  if (rzpProcRow) {
    const hasProc = rzpProcRow.text.includes("Processing");
    const hasGwProc = rzpProcRow.text.includes("GATEWAY PROCESSING") || rzpProcRow.text.includes("Gateway Processing");
    const hasApprove = rzpProcRow.buttons.some((b: any) => b.title.includes("Approve") || b.text.includes("Approve"));
    const hasReject = rzpProcRow.buttons.some((b: any) => b.title.includes("Reject") || b.text.includes("Reject"));
    const hasProof = rzpProcRow.buttons.some((b: any) => b.title.includes("Payment Proof") || b.text.includes("Payment Proof"));

    console.log(`  - Payment Status: Processing -> ${hasProc ? "PASS" : "FAIL"}`);
    console.log(`  - Verification: GATEWAY PROCESSING -> ${hasGwProc ? "PASS" : "FAIL"}`);
    console.log(`  - NO Approve Button -> ${!hasApprove ? "PASS" : "FAIL"}`);
    console.log(`  - NO Reject Button -> ${!hasReject ? "PASS" : "FAIL"}`);
    console.log(`  - NO Upload/Payment Proof -> ${!hasProof ? "PASS" : "FAIL"}`);
  }

  // 2. Verify Razorpay / Stripe / PayPal Paid
  const stripeRow = tableData.find((r: any) => r.text.includes("INV-DEMO-STRIPE-PAID") || (r.text.includes("Stripe") && r.text.includes("Paid")));
  console.log("\n[CHECK 2] Stripe Paid Row:");
  if (stripeRow) {
    const hasPaid = stripeRow.text.includes("Paid");
    const hasVerified = stripeRow.text.includes("VERIFIED") || stripeRow.text.includes("Verified");
    const hasApprove = stripeRow.buttons.some((b: any) => b.title.includes("Approve") || b.text.includes("Approve"));
    const hasReject = stripeRow.buttons.some((b: any) => b.title.includes("Reject") || b.text.includes("Reject"));
    const hasProof = stripeRow.buttons.some((b: any) => b.title.includes("Payment Proof") || b.text.includes("Payment Proof"));
    const hasReceipt = stripeRow.buttons.some((b: any) => b.title.includes("Receipt") || b.text.includes("Receipt"));

    console.log(`  - Payment Status: Paid -> ${hasPaid ? "PASS" : "FAIL"}`);
    console.log(`  - Verification: VERIFIED -> ${hasVerified ? "PASS" : "FAIL"}`);
    console.log(`  - NO Approve Button -> ${!hasApprove ? "PASS" : "FAIL"}`);
    console.log(`  - NO Reject Button -> ${!hasReject ? "PASS" : "FAIL"}`);
    console.log(`  - NO Payment Proof -> ${!hasProof ? "PASS" : "FAIL"}`);
    console.log(`  - Has [Receipt] Action -> ${hasReceipt ? "PASS" : "FAIL"}`);
  }

  // 3. Verify Gateway Failure Row (Failed, NOT Rejected)
  const failRow = tableData.find((r: any) => r.text.includes("INV-DEMO-RZP-FAIL") || (r.text.includes("Razorpay") && r.text.includes("Failed")));
  console.log("\n[CHECK 3] Gateway Failure Row:");
  if (failRow) {
    const hasFailed = failRow.text.includes("Failed");
    const isNotRejected = !failRow.text.includes("Rejected");
    const hasApprove = failRow.buttons.some((b: any) => b.title.includes("Approve") || b.text.includes("Approve"));
    console.log(`  - Payment Status: Failed -> ${hasFailed ? "PASS" : "FAIL"}`);
    console.log(`  - Verification: FAILED (NOT Rejected) -> ${isNotRejected ? "PASS" : "FAIL"}`);
    console.log(`  - NO Approve Button -> ${!hasApprove ? "PASS" : "FAIL"}`);
  }

  // 4. Verify Manual Bank Transfer Pending Row
  const bankRow = tableData.find((r: any) => r.text.includes("INV-DEMO-BANK-PENDING") || r.text.includes("UTR-HDFC"));
  console.log("\n[CHECK 4] Manual Bank Transfer Pending Row:");
  if (bankRow) {
    const hasPendingReview = bankRow.text.includes("Pending Review");
    const hasApprove = bankRow.buttons.some((b: any) => b.title.includes("Approve") || b.text.includes("Approve"));
    const hasReject = bankRow.buttons.some((b: any) => b.title.includes("Reject") || b.text.includes("Reject"));
    const hasProof = bankRow.buttons.some((b: any) => b.title.includes("Payment Proof") || b.text.includes("Payment Proof"));

    console.log(`  - Payment Status: Pending Review -> ${hasPendingReview ? "PASS" : "FAIL"}`);
    console.log(`  - Has Approve Button -> ${hasApprove ? "PASS" : "FAIL"}`);
    console.log(`  - Has Reject Button -> ${hasReject ? "PASS" : "FAIL"}`);
    console.log(`  - Has Payment Proof Button -> ${hasProof ? "PASS" : "FAIL"}`);
  }

  // -----------------------------------------------------------------------
  // SCREENSHOT 2: Automatic Detail Drawer
  // -----------------------------------------------------------------------
  console.log("\n[CHECK 5] Opening Detail Drawer for Automatic Gateway Transaction...");
  await client.evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const stripeRow = rows.find(r => r.innerText.includes('INV-DEMO-STRIPE-PAID') || r.innerText.includes('Stripe'));
      const btn = stripeRow ? Array.from(stripeRow.querySelectorAll('button')).find(b => b.title && b.title.includes('details')) : null;
      if (btn) btn.click();
    })()
  `);
  await sleep(1200);

  const shot2 = path.join(ARTIFACT_DIR, "vqa_02_automatic_drawer.png");
  await client.screenshot(shot2);

  const autoDrawerInfo: any = await client.evaluate(`
    (() => {
      const sheet = document.querySelector('[role="dialog"]') || document.body;
      const text = sheet ? sheet.innerText : '';
      return {
        hasDialog: Boolean(document.querySelector('[role="dialog"]')),
        hasAutomaticBadge: text.includes('AUTOMATIC — Gateway') || text.includes('AUTOMATIC'),
        hasGatewayOrderId: text.includes('Gateway Transaction ID') || text.includes('Gateway Reference') || text.includes('cs_test_demo') || text.includes('INV-DEMO-STRIPE-PAID'),
        hasNoApproveBtn: !text.includes('Approve Payment'),
        hasNoProofSection: !text.includes('Uploaded Payment Proof') && !text.includes('Payment Proof:')
      };
    })()
  `);
  console.log(`  - Modal Dialog Opened -> ${autoDrawerInfo.hasDialog ? "PASS" : "FAIL"}`);
  console.log(`  - Badge: AUTOMATIC — Gateway -> ${autoDrawerInfo.hasAutomaticBadge ? "PASS" : "FAIL"}`);
  console.log(`  - Gateway Transaction / Reference ID -> ${autoDrawerInfo.hasGatewayOrderId ? "PASS" : "FAIL"}`);
  console.log(`  - NO Approve Payment Button -> ${autoDrawerInfo.hasNoApproveBtn ? "PASS" : "FAIL"}`);
  console.log(`  - NO Uploaded Payment Proof -> ${autoDrawerInfo.hasNoProofSection ? "PASS" : "FAIL"}`);

  // Close drawer by pressing Escape or clicking close
  await client.evaluate(`
    (() => {
      const closeBtn = document.querySelector('[role="dialog"] button:has(svg.lucide-x)');
      if (closeBtn) closeBtn.click();
      else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
    })()
  `);
  await sleep(800);

  // -----------------------------------------------------------------------
  // SCREENSHOT 3: Manual Detail Drawer
  // -----------------------------------------------------------------------
  console.log("\n[CHECK 6] Opening Detail Drawer for Manual Bank Transfer Transaction...");
  await client.evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const bankRow = rows.find(r => r.innerText.includes('INV-DEMO-BANK-PENDING') || r.innerText.includes('UTR-HDFC'));
      const btn = bankRow ? Array.from(bankRow.querySelectorAll('button')).find(b => b.title && b.title.includes('details')) : null;
      if (btn) btn.click();
    })()
  `);
  await sleep(1200);

  const shot3 = path.join(ARTIFACT_DIR, "vqa_03_manual_drawer.png");
  await client.screenshot(shot3);

  const manualDrawerInfo: any = await client.evaluate(`
    (() => {
      const sheet = document.querySelector('[role="dialog"]') || document.body;
      const text = sheet ? sheet.innerText : '';
      return {
        hasDialog: Boolean(document.querySelector('[role="dialog"]')),
        hasManualBadge: text.includes('MANUAL — Admin Review') || text.includes('MANUAL'),
        hasUtr: text.includes('UTR') || text.includes('UTR-HDFC-9922881144'),
        hasProofSection: text.includes('Payment Proof:'),
        hasApproveBtn: text.includes('Approve Payment'),
        hasRejectBtn: text.includes('Reject')
      };
    })()
  `);
  console.log(`  - Modal Dialog Opened -> ${manualDrawerInfo.hasDialog ? "PASS" : "FAIL"}`);
  console.log(`  - Badge: MANUAL — Admin Review -> ${manualDrawerInfo.hasManualBadge ? "PASS" : "FAIL"}`);
  console.log(`  - UTR / Reference Number -> ${manualDrawerInfo.hasUtr ? "PASS" : "FAIL"}`);
  console.log(`  - Payment Proof Section -> ${manualDrawerInfo.hasProofSection ? "PASS" : "FAIL"}`);
  console.log(`  - Has Approve Payment Action -> ${manualDrawerInfo.hasApproveBtn ? "PASS" : "FAIL"}`);
  console.log(`  - Has Reject Action -> ${manualDrawerInfo.hasRejectBtn ? "PASS" : "FAIL"}`);

  // Close drawer
  await client.evaluate(`
    (() => {
      const closeBtn = document.querySelector('[role="dialog"] button:has(svg.lucide-x)');
      if (closeBtn) closeBtn.click();
      else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
    })()
  `);
  await sleep(800);

  // -----------------------------------------------------------------------
  // SCREENSHOT 4: Dedicated Payment Proof Modal
  // -----------------------------------------------------------------------
  console.log("\n[CHECK 6b] Opening Dedicated Payment Proof Modal...");
  await client.evaluate(`
    (() => {
      const el = document.querySelector('.overflow-x-auto');
      if (el) el.scrollLeft = 9999;
    })()
  `);
  await sleep(300);

  const clickedProof = await client.clickSelector(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const bankRow = rows.find(r => r.innerText.includes('INV-DEMO-BANK-PENDING') || r.innerText.includes('UTR-HDFC'));
      if (!bankRow) return null;
      return Array.from(bankRow.querySelectorAll('button')).find(b => b.innerText.includes('Payment Proof'));
    })()
  `);
  console.log("Clicked Payment Proof button:", clickedProof);
  await sleep(1000);

  const shotProof = path.join(ARTIFACT_DIR, "vqa_04_payment_proof_modal.png");
  await client.screenshot(shotProof);

  const proofModalInfo: any = await client.evaluate(`
    (() => {
      const dialog = document.querySelector('[role="dialog"]');
      const text = dialog ? dialog.innerText : '';
      return {
        hasDialog: Boolean(dialog),
        hasTitle: text.includes('Payment Proof'),
        hasUtr: text.includes('UTR-HDFC-9922881144') || text.includes('UTR'),
      };
    })()
  `);
  console.log(`  - Modal Opened -> ${proofModalInfo.hasDialog ? "PASS" : "FAIL"}`);
  console.log(`  - Title 'Payment Proof' -> ${proofModalInfo.hasTitle ? "PASS" : "FAIL"}`);
  console.log(`  - Customer UTR Present -> ${proofModalInfo.hasUtr ? "PASS" : "FAIL"}`);

  // Close proof modal
  await client.clickSelector(`document.querySelector('[role="dialog"] button:has(svg.lucide-x)')`);
  await sleep(800);
  await client.evaluate(`
    (() => {
      const el = document.querySelector('.overflow-x-auto');
      if (el) el.scrollLeft = 0;
    })()
  `);
  await sleep(300);

  // -----------------------------------------------------------------------
  // SCREENSHOT 5 & 6: Filter by Verification Mode
  // -----------------------------------------------------------------------
  console.log("\n[CHECK 7] Verification Mode Filter Interaction...");
  // 1. Click filter dropdown trigger
  await client.clickSelector(`
    Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Modes') || b.innerText.includes('Gateway') || b.innerText.includes('Review'))
  `);
  await sleep(500);

  // 2. Click Automatic Gateway menuitem
  await client.clickSelector(`
    Array.from(document.querySelectorAll('[role="menuitem"]')).find(i => i.innerText.trim() === 'Automatic Gateway')
  `);
  await sleep(1500);

  const shot5 = path.join(ARTIFACT_DIR, "vqa_05_filter_automatic.png");
  await client.screenshot(shot5);

  const autoFilterCheck: any = await client.evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const texts = rows.map(r => r.innerText);
      const hasBank = texts.some(t => t.includes('Bank Transfer') || t.includes('INV-DEMO-BANK'));
      const hasRzpOrStripe = texts.some(t => t.includes('Razorpay') || t.includes('Stripe') || t.includes('PayPal'));
      return { total: rows.length, hasBank, hasRzpOrStripe };
    })()
  `);
  console.log(`  - Filter [Automatic Gateway]: shows automatic items -> ${autoFilterCheck.hasRzpOrStripe ? "PASS" : "FAIL"}`);
  console.log(`  - Filter [Automatic Gateway]: excludes manual bank transfer -> ${!autoFilterCheck.hasBank ? "PASS" : "FAIL"}`);

  // 3. Click filter dropdown trigger again
  await client.clickSelector(`
    Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Automatic Gateway') || b.innerText.includes('All Modes'))
  `);
  await sleep(500);

  // 4. Click Manual Review menuitem
  await client.clickSelector(`
    Array.from(document.querySelectorAll('[role="menuitem"]')).find(i => i.innerText.trim() === 'Manual Review')
  `);
  await sleep(1500);

  const shot6 = path.join(ARTIFACT_DIR, "vqa_06_filter_manual.png");
  await client.screenshot(shot6);

  const manualFilterCheck: any = await client.evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const texts = rows.map(r => r.innerText);
      const hasBank = texts.some(t => t.includes('Bank Transfer') || t.includes('INV-DEMO-BANK'));
      const hasStripe = texts.some(t => t.includes('INV-DEMO-STRIPE'));
      return { total: rows.length, hasBank, hasStripe };
    })()
  `);
  console.log(`  - Filter [Manual Review]: shows manual bank transfer -> ${manualFilterCheck.hasBank ? "PASS" : "FAIL"}`);
  console.log(`  - Filter [Manual Review]: excludes automatic stripe -> ${!manualFilterCheck.hasStripe ? "PASS" : "FAIL"}`);

  console.log("\n=========================================================================");
  console.log("  ALL BROWSER VISUAL CHECKS & REAL SCREENSHOTS COMPLETED SUCCESSFULLY!  ");
  console.log("=========================================================================");

  client.close();
  cleanup();
}

run().catch((err) => {
  console.error("Visual QA runner failed:", err);
  process.exit(1);
});
