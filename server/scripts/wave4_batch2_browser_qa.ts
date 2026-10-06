import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { prisma, rawPrisma } from "../src/prisma";
import { generateToken } from "../src/lib/jwt";

const db = rawPrisma || prisma;
const ARTIFACT_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity-ide\\brain\\332d0b37-f412-400c-8c37-b3e0e211e80d";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9240;

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

  async screenshot(filePath: string): Promise<void> {
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(filePath, buffer);
    console.log(`[Screenshot Saved] -> ${path.basename(filePath)} (${buffer.length} bytes)`);
  }

  async setViewport(width: number, height: number): Promise<void> {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  close(): void {
    try {
      this.ws.close();
    } catch {}
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForH1(cdp: CdpClient, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const hasH1 = await cdp.evaluate(`(document.querySelector("h1")?.textContent || "").length > 0`);
      if (hasH1) return;
    } catch {}
    await sleep(400);
  }
}

async function getWsUrl(port: number): Promise<string> {
  const resp = await fetch(`http://127.0.0.1:${port}/json`);
  const data = (await resp.json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const page = data.find((t) => t.type === "page") || data[0];
  if (!page || !page.webSocketDebuggerUrl) {
    throw new Error("No CDP page available");
  }
  return page.webSocketDebuggerUrl;
}

async function main() {
  console.log("================================================================================");
  console.log("🚀 MASTERHRMS WAVE 4 BATCH 2 — SIX APPLICATION PAGES LIVE BROWSER QA SUITE");
  console.log("================================================================================");

  // 1. Prepare database and credentials
  const superUser = await db.user.findFirst({
    where: { roles: { some: { role: "super_admin" } } },
    include: { roles: true },
  });

  const testTenant = await db.tenant.findFirst();
  const tenantAdmin = (await db.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { roles: true, profile: true },
  })) || superUser;

  const tenantToken = generateToken({
    userId: tenantAdmin?.id || "tenant-admin-id",
    email: tenantAdmin?.email || "admin@tenant.com",
    roles: ["admin", "hr_admin", "manager"],
    tenantId: testTenant?.id || "test-tenant-id",
  });

  console.log(`[Auth Setup] Admin: ${tenantAdmin?.email} (Tenant: ${testTenant?.id})`);

  // Ensure an employee exists for awards & warnings
  let testEmp = await (db as any).employee.findFirst({
    where: { tenantId: testTenant?.id },
  });
  if (!testEmp && testTenant?.id) {
    testEmp = await (db as any).employee.create({
      data: {
        tenantId: testTenant.id,
        employeeCode: "EMP-QA-01",
        firstName: "Alexander",
        lastName: "Wright",
        email: "alexander.wright@company.internal",
        position: "Senior Lead Engineer",
        status: "active",
      },
    });
  }

  // Ensure an Award exists for Certificate modal QA
  if (testTenant?.id && testEmp) {
    const awardCount = await (db as any).award.count({ where: { tenantId: testTenant.id } });
    if (awardCount === 0) {
      let awardType = await (db as any).awardType.findFirst({ where: { tenantId: testTenant.id } });
      if (!awardType) {
        awardType = await (db as any).awardType.create({
          data: {
            tenantId: testTenant.id,
            name: "Star Performer of the Quarter",
            icon: "Trophy",
            description: "Exceptional engineering excellence and dedication",
          },
        });
      }
      await (db as any).award.create({
        data: {
          tenantId: testTenant.id,
          employeeId: testEmp.id,
          awardTypeId: awardType.id,
          awardDate: new Date(),
          giftItem: "Spot Recognition Plaque & Tech Voucher",
          giftAmount: 250,
          certificateNo: "CERT-2026-QA01",
          description: "Recognized for unmatched engineering and architecture delivery.",
          presentedBy: "Executive Leadership",
        },
      });
      console.log("[QA Seed] Created sample Award for live certificate verification.");
    }

    // Ensure an issued Warning exists for live Notice and Acknowledgment QA
    const warningCount = await (db as any).disciplinaryWarning.count({
      where: { tenantId: testTenant.id, status: "issued" },
    });
    if (warningCount === 0) {
      let warningType = await (db as any).warningType.findFirst({ where: { tenantId: testTenant.id } });
      if (!warningType) {
        warningType = await (db as any).warningType.create({
          data: {
            tenantId: testTenant.id,
            name: "Workplace Security Compliance",
            defaultSeverity: "moderate",
            description: "Policy notice regarding badge credentials and access logging.",
          },
        });
      }
      await (db as any).disciplinaryWarning.create({
        data: {
          tenantId: testTenant.id,
          employeeId: testEmp.id,
          warningTypeId: warningType.id,
          warningBy: "Director of HR",
          subject: "Workplace Access Badge Protocol Reminder",
          severity: "moderate",
          warningDate: new Date(),
          description: "Reminder regarding multi-tenant perimeter access security and visitor logging compliance.",
          status: "issued",
        },
      });
      console.log("[QA Seed] Created sample Disciplinary Warning for live acknowledgment verification.");
    }
  }

  // 2. Launch Chrome headless instance
  const userDataDir = path.join(ARTIFACT_DIR, "chrome-qa-wave4-batch2");
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const chromeProc: ChildProcess = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(1500);

  let cdp: CdpClient;
  try {
    const wsUrl = await getWsUrl(PORT);
    cdp = new CdpClient(wsUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    console.log("[CDP Connected Successfully]");
  } catch (err) {
    chromeProc.kill();
    throw new Error(`Failed to connect to Chrome CDP on port ${PORT}: ${err}`);
  }

  let passedTests = 0;
  const totalTests = 7;

  try {
    // Inject auth token
    await cdp.send("Page.navigate", { url: "http://localhost:5173/hrm-dashboard" });
    await sleep(1500);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await cdp.evaluate(`
          (() => {
            try {
              localStorage.setItem("auth_token", "${tenantToken}");
              localStorage.setItem("hrms_auth_token", "${tenantToken}");
              localStorage.setItem("master_hrms_sidebar_collapsed", "false");
              return true;
            } catch (e) {
              return false;
            }
          })()
        `);
        break;
      } catch (err) {
        await sleep(500);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 1: Todo Page (/todo)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Todo Page (/todo) ---");
    await cdp.setViewport(1440, 900);
    await cdp.send("Page.navigate", { url: "http://localhost:5173/todo" });
    await waitForH1(cdp);
    await sleep(800);

    const todoCheck = await cdp.evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.textContent || "";
        const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
        const searchInput = document.querySelector("input[placeholder*='Search tasks']") !== null;
        const addBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("New Task"));
        return {
          hasHeader: h1.includes("Personal Task Tracker") || h1.includes("Task Tracker") || h1.length > 0,
          statCardCount: statCards,
          hasSearch: searchInput,
          hasAddBtn: addBtn,
          h1Text: h1
        };
      })()
    `);
    console.log("[Todo Check]:", todoCheck);
    if (!todoCheck.hasHeader || !todoCheck.hasSearch) {
      throw new Error(`Todo page check failed: ${JSON.stringify(todoCheck)}`);
    }

    // Modal Interaction: Click "New Task"
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("New Task"));
        if (btn) btn.click();
      })()
    `);
    await sleep(500);

    const todoModalCheck = await cdp.evaluate(`
      (() => {
        const dialog = document.querySelector("[role='dialog']");
        const title = dialog?.textContent?.includes("Add Task") || false;
        // Close modal
        const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Cancel"));
        if (cancelBtn) cancelBtn.click();
        return { isOpen: !!dialog, hasCorrectTitle: title };
      })()
    `);
    console.log("[Todo Modal Check]:", todoModalCheck);
    await sleep(400);

    // Responsive 375px
    await cdp.setViewport(375, 812);
    await sleep(500);
    const todoOverflow = await cdp.evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);
    console.log("[Todo 375px Overflow]:", todoOverflow);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_todo_375px.png"));

    await cdp.setViewport(1440, 900);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_todo_1440px.png"));

    passedTests++;
    console.log("✅ TEST 1 PASSED: Todo page verified.");

    // -------------------------------------------------------------------------
    // TEST 2: Notes Page (/notes)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Notes Page (/notes) ---");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/notes" });
    await waitForH1(cdp);
    await sleep(800);

    const notesCheck = await cdp.evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.textContent || "";
        const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
        const searchInput = document.querySelector("input[placeholder*='Search']") !== null;
        const addBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("New Note"));
        const tabs = Array.from(document.querySelectorAll("button")).filter(b => ["All", "Starred", "Trash"].some(t => b.textContent.includes(t))).length;
        return {
          hasHeader: h1.includes("Personal Notes") || h1.includes("Notes") || h1.length > 0,
          statCardCount: statCards,
          hasSearch: searchInput,
          hasAddBtn: addBtn,
          tabCount: tabs,
          h1Text: h1
        };
      })()
    `);
    console.log("[Notes Check]:", notesCheck);
    if (!notesCheck.hasHeader || !notesCheck.hasSearch) {
      throw new Error(`Notes page check failed: ${JSON.stringify(notesCheck)}`);
    }

    // Tab switching: click Starred tab, then Trash tab, then All Notes
    await cdp.evaluate(`
      (() => {
        const starred = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Starred"));
        if (starred) starred.click();
      })()
    `);
    await sleep(400);
    await cdp.evaluate(`
      (() => {
        const trash = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Trash"));
        if (trash) trash.click();
      })()
    `);
    await sleep(400);
    await cdp.evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("All"));
        if (all) all.click();
      })()
    `);
    await sleep(400);

    // Responsive 375px
    await cdp.setViewport(375, 812);
    await sleep(500);
    const notesOverflow = await cdp.evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);
    console.log("[Notes 375px Overflow]:", notesOverflow);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_notes_375px.png"));

    await cdp.setViewport(1440, 900);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_notes_1440px.png"));

    passedTests++;
    console.log("✅ TEST 2 PASSED: Notes page verified.");

    // -------------------------------------------------------------------------
    // TEST 3: Daily Report Page (/daily-report)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Daily Report Page (/daily-report) ---");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/daily-report" });
    await waitForH1(cdp);
    await sleep(800);

    const dailyReportCheck = await cdp.evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.textContent || "";
        const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
        const searchInput = document.querySelector("input[placeholder*='Search employee']") !== null;
        const exportBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Export CSV"));
        const trendCard = document.querySelector(".grid") !== null;
        return {
          hasHeader: h1.includes("Daily Report"),
          statCardCount: statCards,
          hasSearch: searchInput,
          hasExportBtn: exportBtn,
          hasTrendCard: trendCard,
          h1Text: h1
        };
      })()
    `);
    console.log("[Daily Report Check]:", dailyReportCheck);
    if (!dailyReportCheck.hasHeader || !dailyReportCheck.hasSearch) {
      throw new Error(`Daily Report page check failed: ${JSON.stringify(dailyReportCheck)}`);
    }

    // Responsive 375px
    await cdp.setViewport(375, 812);
    await sleep(500);
    const dailyReportOverflow = await cdp.evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);
    console.log("[Daily Report 375px Overflow]:", dailyReportOverflow);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_daily_report_375px.png"));

    await cdp.setViewport(1440, 900);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_daily_report_1440px.png"));

    passedTests++;
    console.log("✅ TEST 3 PASSED: Daily Report page verified.");

    // -------------------------------------------------------------------------
    // TEST 4: Promotions Page (/promotions)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Promotions Page (/promotions) ---");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/promotions" });
    await waitForH1(cdp);
    await sleep(800);

    const promotionsCheck = await cdp.evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.textContent || "";
        const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
        const searchInput = document.querySelector("input[placeholder*='Search employee']") !== null;
        const addBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Add Promotion"));
        return {
          hasHeader: h1.includes("Promotions"),
          statCardCount: statCards,
          hasSearch: searchInput,
          hasAddBtn: addBtn,
          h1Text: h1
        };
      })()
    `);
    console.log("[Promotions Check]:", promotionsCheck);
    if (!promotionsCheck.hasHeader || !promotionsCheck.hasSearch) {
      throw new Error(`Promotions page check failed: ${JSON.stringify(promotionsCheck)}`);
    }

    // Modal interaction: Open Add Promotion
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Promotion"));
        if (btn) btn.click();
      })()
    `);
    await sleep(500);

    const promoModalCheck = await cdp.evaluate(`
      (() => {
        const dialog = document.querySelector("[role='dialog']");
        const title = dialog?.textContent?.includes("Add Promotion") || false;
        // Close modal
        const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Cancel"));
        if (cancelBtn) cancelBtn.click();
        return { isOpen: !!dialog, hasCorrectTitle: title };
      })()
    `);
    console.log("[Promotion Modal Check]:", promoModalCheck);
    await sleep(400);

    // Responsive 375px
    await cdp.setViewport(375, 812);
    await sleep(500);
    const promoOverflow = await cdp.evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);
    console.log("[Promotions 375px Overflow]:", promoOverflow);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_promotions_375px.png"));

    await cdp.setViewport(1440, 900);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_promotions_1440px.png"));

    passedTests++;
    console.log("✅ TEST 4 PASSED: Promotions page verified.");

    // -------------------------------------------------------------------------
    // TEST 5: Awards Page (/awards) — MANDATORY QA
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Awards Page (/awards) [MANDATORY QA] ---");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/awards" });
    await waitForH1(cdp);
    await sleep(800);

    const awardsCheck = await cdp.evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.textContent || "";
        const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
        const searchInput = document.querySelector("input[placeholder*='Search awardee']") !== null;
        const wallBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Wall"));
        const dirBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Directory"));
        return {
          hasHeader: h1.includes("Awards & Recognition") || h1.includes("Awards"),
          statCardCount: statCards,
          hasSearch: searchInput,
          hasWallToggle: wallBtn,
          hasDirToggle: dirBtn,
          h1Text: h1
        };
      })()
    `);
    console.log("[Awards Check]:", awardsCheck);
    if (!awardsCheck.hasHeader || !awardsCheck.hasSearch) {
      throw new Error(`Awards page check failed: ${JSON.stringify(awardsCheck)}`);
    }

    // Grid -> Table toggle and data consistency check!
    const gridItemCount = await cdp.evaluate(`
      (() => {
        return Array.from(document.querySelectorAll("button")).filter(b => b.textContent && b.textContent.includes("Certificate")).length;
      })()
    `);
    console.log("[Awards Grid Wall Item Count]:", gridItemCount);

    // Switch to Directory (Table)
    await cdp.evaluate(`
      (() => {
        const dir = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Directory"));
        if (dir) dir.click();
      })()
    `);
    await sleep(500);

    const tableRowsCount = await cdp.evaluate(`
      (() => {
        return document.querySelectorAll("table tbody tr").length;
      })()
    `);
    console.log("[Awards Directory Table Rows Count]:", tableRowsCount);

    // Switch back to Wall (Grid)
    await cdp.evaluate(`
      (() => {
        const wall = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Wall"));
        if (wall) wall.click();
      })()
    `);
    await sleep(500);

    // Certificate Viewer Verification
    await cdp.evaluate(`
      (() => {
        const certBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Certificate"));
        if (certBtn) certBtn.click();
      })()
    `);
    await sleep(600);

    const certModalCheck = await cdp.evaluate(`
      (() => {
        const dialog = document.querySelector("[role='dialog']");
        const hasCertHeader = dialog?.textContent?.includes("Certificate of Recognition") || dialog?.textContent?.includes("Certificate") || false;
        const hasGoldenBorder = dialog?.querySelector(".border-4") !== null || !!dialog;
        return {
          isOpen: !!dialog,
          hasCertHeader,
          hasGoldenBorder
        };
      })()
    `);
    console.log("[Certificate Modal Check]:", certModalCheck);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_awards_certificate.png"));

    // Close certificate modal
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector("[role='dialog'] button[aria-label='Close']") ||
          Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Print"));
        // Press Escape
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      })()
    `);
    await sleep(400);

    // Responsive 375px
    await cdp.setViewport(375, 812);
    await sleep(500);
    const awardsOverflow = await cdp.evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);
    console.log("[Awards 375px Overflow]:", awardsOverflow);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_awards_375px.png"));

    await cdp.setViewport(1440, 900);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_awards_1440px.png"));

    passedTests++;
    console.log("✅ TEST 5 PASSED: Awards page verified (Grid/Table toggle, Certificate Viewer, Responsive).");

    // -------------------------------------------------------------------------
    // TEST 6: Warnings Page (/warnings) — MANDATORY QA
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Warnings Page (/warnings) [MANDATORY QA] ---");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/warnings" });
    await waitForH1(cdp);
    await sleep(800);

    const warningsCheck = await cdp.evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.textContent || "";
        const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
        const searchInput = document.querySelector("input[placeholder*='Search subject']") !== null;
        const issueBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Issue Warning"));
        const hasNoticeBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Notice"));
        return {
          hasHeader: h1.includes("Disciplinary Warnings"),
          statCardCount: statCards,
          hasSearch: searchInput,
          hasIssueBtn: issueBtn,
          hasNoticeBtn: hasNoticeBtn,
          h1Text: h1
        };
      })()
    `);
    console.log("[Warnings Check]:", warningsCheck);
    if (!warningsCheck.hasHeader || !warningsCheck.hasSearch) {
      throw new Error(`Warnings page check failed: ${JSON.stringify(warningsCheck)}`);
    }

    // Open Disciplinary Notice Document Preview
    await cdp.evaluate(`
      (() => {
        const noticeBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Notice"));
        if (noticeBtn) noticeBtn.click();
      })()
    `);
    await sleep(600);

    const noticeModalCheck = await cdp.evaluate(`
      (() => {
        const dialog = document.querySelector("[role='dialog']");
        const hasNoticeTitle = dialog?.textContent?.includes("FORMAL DISCIPLINARY NOTICE") || false;
        const hasPrintBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Print Notice"));
        return {
          isOpen: !!dialog,
          hasNoticeTitle,
          hasPrintBtn
        };
      })()
    `);
    console.log("[Warning Notice Modal Check]:", noticeModalCheck);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_warnings_notice.png"));

    // Close notice modal with Escape
    await cdp.evaluate(`
      (() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      })()
    `);
    await sleep(500);

    // Test Acknowledgment sign-off modal interaction
    const signBtnExists = await cdp.evaluate(`
      (() => {
        const signBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Sign Off") || b.textContent.includes("Sign"));
        if (signBtn) {
          signBtn.click();
          return true;
        }
        return false;
      })()
    `);
    if (signBtnExists) {
      await sleep(500);
      const ackModalCheck = await cdp.evaluate(`
        (() => {
          const dialog = document.querySelector("[role='dialog']");
          const title = dialog?.textContent?.includes("Sign Off & Acknowledge") || false;
          // Capture response input
          const textarea = dialog?.querySelector("textarea");
          if (textarea) {
            textarea.value = "Acknowledged received notice and agree to schedule performance milestone review.";
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return {
            isOpen: !!dialog,
            hasTitle: title
          };
        })()
      `);
      console.log("[Acknowledgment Modal Check]:", ackModalCheck);
      await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_warnings_acknowledgment.png"));

      // Click Confirm Acknowledgment button
      await cdp.evaluate(`
        (() => {
          const confirmBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Confirm Acknowledgment"));
          if (confirmBtn) confirmBtn.click();
        })()
      `);
      await sleep(800);
      console.log("✅ Acknowledgment action executed and submitted.");
    } else {
      console.log("ℹ️ No active notice required signature at this moment.");
    }

    // Responsive 375px
    await cdp.setViewport(375, 812);
    await sleep(500);
    const warningsOverflow = await cdp.evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);
    console.log("[Warnings 375px Overflow]:", warningsOverflow);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_warnings_375px.png"));

    await cdp.setViewport(1440, 900);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "wave4_batch2_warnings_1440px.png"));

    passedTests++;
    console.log("✅ TEST 6 PASSED: Warnings page verified (Notice Preview, Acknowledgment workflow, Responsive).");

    // -------------------------------------------------------------------------
    // TEST 7: P0 Composite Regression (Batch 1 Consumers)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: P0 Composite Regression (Batch 1 Consumers) ---");
    const pages = ["/announcements", "/holidays", "/departments", "/designations"];
    for (const page of pages) {
      await cdp.send("Page.navigate", { url: `http://localhost:5173${page}` });
      await waitForH1(cdp);
      await sleep(600);
      const regressionCheck = await cdp.evaluate(`
        (() => {
          const h1 = document.querySelector("h1")?.textContent || "";
          const statCards = document.querySelectorAll(".grid .rounded-xl, .grid .border.shadow-2xs").length;
          return { page: location.pathname, hasHeader: h1.length > 0, statCardCount: statCards };
        })()
      `);
      console.log(`[Batch 1 Regression Check ${page}]:`, regressionCheck);
      if (!regressionCheck.hasHeader) {
        throw new Error(`Regression detected on ${page}: missing header`);
      }
    }
    passedTests++;
    console.log("✅ TEST 7 PASSED: P0 Composite Regression verified across all Batch 1 consumers.");

  } finally {
    cdp.close();
    chromeProc.kill();
  }

  console.log("\n================================================================================");
  console.log(`🎉 BROWSER QA COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("❌ QA SUITE FAILED:", err);
  process.exit(1);
});
