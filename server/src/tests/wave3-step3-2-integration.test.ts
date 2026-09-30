import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import assert from "node:assert/strict";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { accountingRouter } from "../routes/accounting.routes";
import {
  autoPostSaleToLedger,
  autoPostPurchaseToLedger,
  autoPostPayrollToLedger,
  autoPostExpenseToLedger,
  autoPostStockAdjustmentToLedger,
} from "../services/ledger-posting.service";
import { PeriodPostingError } from "../services/fiscal-period.service";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { tenantStorage } from "../context/tenant-context";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

interface TestReportItem {
  id: number;
  scenario: string;
  category: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
}

const report: TestReportItem[] = [];

async function recordScenario(
  id: number,
  category: string,
  scenario: string,
  fn: () => Promise<string>
) {
  const start = Date.now();
  try {
    const evidence = await fn();
    const durationMs = Date.now() - start;
    report.push({ id, category, scenario, passed: true, durationMs, evidence });
    console.log(`✅ [${String(id).padStart(2, "0")}] [${category}] ${scenario} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    report.push({ id, category, scenario, passed: false, durationMs, evidence: err.message || String(err) });
    console.error(`❌ [${String(id).padStart(2, "0")}] [${category}] ${scenario} (${durationMs}ms)`);
    console.error(`   Error: ${err.message || err}`);
  }
}

async function runStep32IntegrationTests() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.2: DATABASE-BACKED INTEGRATION TEST SUITE");
  console.log("Target Database: master_hrms_dev (127.0.0.1:3306)");
  console.log("Coverage: COA Hierarchy, Fiscal Periods, 9 Posting Guards, Accounting Integrity");
  console.log("================================================================================\n");

  // Verify target is strictly local master_hrms_dev
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost")) {
    throw new Error(`CRITICAL: Test aborted! DATABASE_URL points to non-local host: ${dbUrl}`);
  }
  if (!dbUrl.includes("master_hrms_dev")) {
    throw new Error(`CRITICAL: Test aborted! DATABASE_URL does not target master_hrms_dev: ${dbUrl}`);
  }

  // Spin up ephemeral Express server
  const app = express();
  app.use(express.json());
  app.use("/api/accounting", accountingRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Ephemeral accounting API running on ${baseUrl}\n`);

  // Fixtures
  const tenantAlpha = "w3_s32_tenant_alpha";
  const tenantBeta = "w3_s32_tenant_beta";
  const tenantLegacy = "w3_s32_tenant_legacy";

  const userAlphaId = "w3_s32_user_alpha";
  const userBetaId = "w3_s32_user_beta";
  const userLegacyId = "w3_s32_user_legacy";

  // Register with connection manager
  const manager = TenantConnectionManager.getInstance();
  manager.registerTenant({
    tenantId: tenantAlpha,
    name: "Step 3.2 Alpha Corp",
    strategy: "SHARED_SCHEMA",
    status: "ACTIVE",
  });
  manager.registerTenant({
    tenantId: tenantBeta,
    name: "Step 3.2 Beta Corp",
    strategy: "SHARED_SCHEMA",
    status: "ACTIVE",
  });
  manager.registerTenant({
    tenantId: tenantLegacy,
    name: "Step 3.2 Legacy Corp",
    strategy: "SHARED_SCHEMA",
    status: "ACTIVE",
  });

  // Auth tokens
  const alphaToken = generateToken({
    userId: userAlphaId,
    email: "alpha@s32-test.local",
    tenantId: tenantAlpha,
    roles: ["admin", "tenant_admin"],
  });

  const betaToken = generateToken({
    userId: userBetaId,
    email: "beta@s32-test.local",
    tenantId: tenantBeta,
    roles: ["admin", "tenant_admin"],
  });

  const legacyToken = generateToken({
    userId: userLegacyId,
    email: "legacy@s32-test.local",
    tenantId: tenantLegacy,
    roles: ["admin", "tenant_admin"],
  });

  // Helper for running within tenant context
  async function runInTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const { client, strategy, status } = await manager.getClientForTenant(tenantId);
    return tenantStorage.run(
      {
        tenantId,
        userId: `user_${tenantId}`,
        roles: ["admin"],
        status,
        tenancyStrategy: strategy,
        db: client,
      },
      fn
    );
  }

  // Track created fixtures for clean teardown
  let createdFyId = "";
  let aprilPeriodId = "";
  let currentPeriodId = "";
  let parentAccId = "";
  let childAccId = "";
  let bankAccId = "";
  let expenseAccId = "";

  try {
    const testTenants = [tenantAlpha, tenantBeta, tenantLegacy];
    const testUsers = [userAlphaId, userBetaId, userLegacyId];
    await prisma.journalItem.deleteMany({ where: { journalEntry: { tenantId: { in: testTenants } } } });
    await prisma.journalEntry.deleteMany({ where: { tenantId: { in: testTenants } } });
    await prisma.accountingPeriod.deleteMany({ where: { tenantId: { in: testTenants } } });
    await prisma.fiscalYear.deleteMany({ where: { tenantId: { in: testTenants } } });
    await prisma.chartOfAccount.updateMany({ where: { tenantId: { in: testTenants } }, data: { parentAccountId: null } });
    await prisma.chartOfAccount.deleteMany({ where: { tenantId: { in: testTenants } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: testUsers } } });
    await prisma.profile.deleteMany({ where: { userId: { in: testUsers } } });
    await prisma.user.deleteMany({ where: { id: { in: testUsers } } });
    await prisma.tenant.deleteMany({ where: { id: { in: testTenants } } });

    // Upsert tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlpha },
      create: { id: tenantAlpha, name: "Step 3.2 Alpha Corp", slug: "s32-alpha" },
      update: { name: "Step 3.2 Alpha Corp" },
    });
    await prisma.tenant.upsert({
      where: { id: tenantBeta },
      create: { id: tenantBeta, name: "Step 3.2 Beta Corp", slug: "s32-beta" },
      update: { name: "Step 3.2 Beta Corp" },
    });
    await prisma.tenant.upsert({
      where: { id: tenantLegacy },
      create: { id: tenantLegacy, name: "Step 3.2 Legacy Corp", slug: "s32-legacy" },
      update: { name: "Step 3.2 Legacy Corp" },
    });

    // Upsert users, profiles, and roles
    for (const [uid, tid, mail] of [
      [userAlphaId, tenantAlpha, "alpha@s32-test.local"],
      [userBetaId, tenantBeta, "beta@s32-test.local"],
      [userLegacyId, tenantLegacy, "legacy@s32-test.local"],
    ]) {
      await prisma.user.upsert({
        where: { id: uid },
        create: { id: uid, email: mail, passwordHash: "mock_hash" },
        update: { email: mail },
      });
      await prisma.profile.upsert({
        where: { userId: uid },
        create: { id: `prof_${uid}`, userId: uid, tenantId: tid, fullName: `User ${uid}` },
        update: { tenantId: tid },
      });
      await prisma.userRole.deleteMany({ where: { userId: uid } });
      await prisma.userRole.create({
        data: { userId: uid, tenantId: tid, role: "hr_admin" },
      });
    }

    // Helper for HTTP requests
    async function apiRequest(endpoint: string, options: { method?: string; token?: string; body?: any }) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    }

    // =========================================================================
    // SECTION 1: CHART OF ACCOUNTS HIERARCHY & PROTECTION
    // =========================================================================

    await recordScenario(1, "COA_HIERARCHY", "Create parent and child accounts with parentAccountId", async () => {
      const parentRes = await apiRequest("/api/accounting/accounts", {
        method: "POST",
        token: alphaToken,
        body: {
          accountCode: "1000",
          accountName: "Current Assets Group",
          accountType: "asset",
          category: "current_asset",
          description: "Parent asset group",
        },
      });
      assert.equal(parentRes.status, 201, `Failed to create parent: ${JSON.stringify(parentRes.data)}`);
      parentAccId = parentRes.data.data.id;

      const childRes = await apiRequest("/api/accounting/accounts", {
        method: "POST",
        token: alphaToken,
        body: {
          accountCode: "1010",
          accountName: "Petty Cash Account",
          accountType: "asset",
          category: "current_asset",
          description: "Child cash account",
          parentAccountId: parentAccId,
        },
      });
      assert.equal(childRes.status, 201, `Failed to create child: ${JSON.stringify(childRes.data)}`);
      childAccId = childRes.data.data.id;
      assert.equal(childRes.data.data.parentAccountId, parentAccId);

      return `Parent ${parentAccId} created; Child ${childAccId} linked via parentAccountId.`;
    });

    await recordScenario(2, "COA_PROTECTION", "Reject self-referencing parentAccountId on account update", async () => {
      const res = await apiRequest(`/api/accounting/accounts/${parentAccId}`, {
        method: "PUT",
        token: alphaToken,
        body: { parentAccountId: parentAccId },
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes("own parent"));
      return `Self-parenting rejected with 400: "${res.data.error}"`;
    });

    await recordScenario(3, "COA_PROTECTION", "Reject circular hierarchy on account update", async () => {
      const res = await apiRequest(`/api/accounting/accounts/${parentAccId}`, {
        method: "PUT",
        token: alphaToken,
        body: { parentAccountId: childAccId },
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes("Circular"));
      return `Circular hierarchy rejected with 400: "${res.data.error}"`;
    });

    await recordScenario(4, "COA_PROTECTION", "Reject deletion of parent account when children exist", async () => {
      const res = await apiRequest(`/api/accounting/accounts/${parentAccId}`, {
        method: "DELETE",
        token: alphaToken,
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes("child accounts"));
      return `Deletion blocked with 400: "${res.data.error}"`;
    });

    // =========================================================================
    // SECTION 2: FISCAL YEAR & ACCOUNTING PERIOD CRUD
    // =========================================================================

    const now = new Date();
    const fyStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const fyEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString();

    await recordScenario(5, "FISCAL_CRUD", "Create and list fiscal year with date boundary validation", async () => {
      const createRes = await apiRequest("/api/accounting/fiscal-years", {
        method: "POST",
        token: alphaToken,
        body: {
          name: `FY ${now.getFullYear()}`,
          startDate: fyStart,
          endDate: fyEnd,
          isCurrent: true,
        },
      });
      assert.equal(createRes.status, 201, `Failed to create FY: ${JSON.stringify(createRes.data)}`);
      createdFyId = createRes.data.data.id;
      assert.equal(createRes.data.data.name, `FY ${now.getFullYear()}`);

      const listRes = await apiRequest("/api/accounting/fiscal-years", { token: alphaToken });
      assert.equal(listRes.status, 200);
      const found = listRes.data.data.find((f: any) => f.id === createdFyId);
      assert.ok(found);

      return `Fiscal Year ${createdFyId} created and listed successfully.`;
    });

    await recordScenario(6, "FISCAL_VALIDATION", "Reject overlapping fiscal years within same tenant", async () => {
      const res = await apiRequest("/api/accounting/fiscal-years", {
        method: "POST",
        token: alphaToken,
        body: {
          name: "FY Overlap",
          startDate: new Date(now.getFullYear(), 5, 1).toISOString(),
          endDate: new Date(now.getFullYear(), 11, 31).toISOString(),
        },
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes("cannot overlap"));
      return `Overlapping FY rejected with 400: "${res.data.error}"`;
    });

    await recordScenario(7, "PERIOD_CRUD", "Create monthly accounting periods within fiscal year", async () => {
      // 1. April period (historical)
      const aprilRes = await apiRequest(`/api/accounting/fiscal-years/${createdFyId}/periods`, {
        method: "POST",
        token: alphaToken,
        body: {
          name: `Period 04 - April ${now.getFullYear()}`,
          startDate: new Date(now.getFullYear(), 3, 1).toISOString(),
          endDate: new Date(now.getFullYear(), 3, 30, 23, 59, 59, 999).toISOString(),
        },
      });
      assert.equal(aprilRes.status, 201, `Failed to create April period: ${JSON.stringify(aprilRes.data)}`);
      aprilPeriodId = aprilRes.data.data.id;

      // 2. Current Month period
      const curStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const curRes = await apiRequest(`/api/accounting/fiscal-years/${createdFyId}/periods`, {
        method: "POST",
        token: alphaToken,
        body: {
          name: `Period ${now.getMonth() + 1} - Current Month`,
          startDate: curStart,
          endDate: curEnd,
        },
      });
      assert.equal(curRes.status, 201, `Failed to create Current period: ${JSON.stringify(curRes.data)}`);
      currentPeriodId = curRes.data.data.id;

      return `April period (${aprilPeriodId}) and Current Month period (${currentPeriodId}) created in status 'open'.`;
    });

    await recordScenario(8, "PERIOD_VALIDATION", "Reject period creation outside fiscal year boundaries", async () => {
      const res = await apiRequest(`/api/accounting/fiscal-years/${createdFyId}/periods`, {
        method: "POST",
        token: alphaToken,
        body: {
          name: "Out of Bounds Period",
          startDate: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
          endDate: new Date(now.getFullYear() - 1, 0, 31).toISOString(),
        },
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes("boundaries"));
      return `Out of bounds period rejected with 400: "${res.data.error}"`;
    });

    await recordScenario(9, "PERIOD_LIFECYCLE", "Close accounting period and verify audit attribution", async () => {
      const res = await apiRequest(`/api/accounting/periods/${aprilPeriodId}/close`, {
        method: "POST",
        token: alphaToken,
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.data.status, "closed");
      assert.ok(res.data.data.closedAt);
      assert.equal(res.data.data.closedById, userAlphaId);
      return `Period closed by ${userAlphaId} at ${res.data.data.closedAt}`;
    });

    await recordScenario(10, "TENANT_ISOLATION", "Cross-tenant period manipulation rejected", async () => {
      const res = await apiRequest(`/api/accounting/periods/${aprilPeriodId}/reopen`, {
        method: "POST",
        token: betaToken,
      });
      assert.equal(res.status, 404);
      return `Cross-tenant period reopen rejected with 404 Not Found`;
    });

    // =========================================================================
    // SECTION 3: FISCAL-PERIOD POSTING GUARD (ALL 9 WIRED PATHS)
    // =========================================================================

    // Setup additional ledger accounts for Alpha
    const bankRes = await apiRequest("/api/accounting/accounts", {
      method: "POST",
      token: alphaToken,
      body: {
        accountCode: "1020",
        accountName: "Primary Bank Account",
        accountType: "asset",
        category: "current_asset",
      },
    });
    bankAccId = bankRes.data.data?.id || bankRes.data.id;

    const expRes = await apiRequest("/api/accounting/accounts", {
      method: "POST",
      token: alphaToken,
      body: {
        accountCode: "5010",
        accountName: "Office Expense Account",
        accountType: "expense",
        category: "indirect_expense",
      },
    });
    expenseAccId = expRes.data.data?.id || expRes.data.id;

    const bank2Res = await apiRequest("/api/accounting/accounts", {
      method: "POST",
      token: alphaToken,
      body: {
        accountCode: "1025",
        accountName: "Secondary Bank",
        accountType: "asset",
        category: "current_asset",
      },
    });
    const bank2Id = bank2Res.data.data?.id || bank2Res.data.id;

    const closedAprilDate = new Date(now.getFullYear(), 3, 15).toISOString();

    await recordScenario(11, "POSTING_GUARD", "Path 1: Manual journal entry rejected in closed period", async () => {
      const res = await apiRequest("/api/accounting/journal-entries", {
        method: "POST",
        token: alphaToken,
        body: {
          entryDate: closedAprilDate,
          description: "Test manual entry in closed April period",
          items: [
            { accountId: expenseAccId, debit: 500, credit: 0 },
            { accountId: bankAccId, debit: 0, credit: 500 },
          ],
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.code, "PERIOD_CLOSED_FOR_POSTING");
      return `Manual JE rejected with 400: ${res.data.error} (${res.data.code})`;
    });

    await recordScenario(12, "POSTING_GUARD", "Path 2: Bank transfer rejected when target period is closed", async () => {
      // Temporarily close current period to test transfer guard
      await apiRequest(`/api/accounting/periods/${currentPeriodId}/close`, { method: "POST", token: alphaToken });

      const res = await apiRequest("/api/accounting/transfers", {
        method: "POST",
        token: alphaToken,
        body: {
          fromAccount: bankAccId,
          toAccount: bank2Id,
          amount: 250,
          reference: "TRF-TEST-001",
        },
      });

      // Transfer guard catches PeriodPostingError; verifies transaction is rejected
      assert.ok([400, 500].includes(res.status));
      assert.ok(res.data.error.includes("closed"));

      // Reopen current period
      await apiRequest(`/api/accounting/periods/${currentPeriodId}/reopen`, { method: "POST", token: alphaToken });

      return `Transfer successfully rejected by fiscal guard: "${res.data.error}"`;
    });

    await recordScenario(13, "POSTING_GUARD", "Path 3: Tally import rejected in closed period", async () => {
      const res = await apiRequest("/api/accounting/tally/import", {
        method: "POST",
        token: alphaToken,
        body: {
          rows: [
            {
              date: closedAprilDate,
              ledger: "Office Expense Account",
              debit: 300,
              credit: 0,
              narration: "Tally import during closed period",
            },
          ],
        },
      });
      assert.ok(res.status >= 400);
      assert.ok(res.data.error.includes("closed"));
      return `Tally import rejected with ${res.status}: "${res.data.error}"`;
    });

    await recordScenario(14, "POSTING_GUARD", "Path 4: Bank reconciliation auto-posting rejected in closed period", async () => {
      const res = await apiRequest("/api/accounting/bank-reconciliation/match", {
        method: "POST",
        token: alphaToken,
        body: {
          accountId: bankAccId,
          transactions: [
            {
              date: closedAprilDate,
              description: "Unmatched bank charge in closed period",
              amount: 150,
              type: "withdrawal",
            },
          ],
          autoPostUnmatched: true,
          suspenseAccountId: expenseAccId,
        },
      });
      const entries = await prisma.journalEntry.findMany({
        where: { tenantId: tenantAlpha, referenceType: "bank_reconcile" },
      });
      assert.equal(entries.length, 0);
      return `Bank recon auto-post safely skipped: 0 journal entries created.`;
    });

    // Close current period to test services that post at new Date()
    await apiRequest(`/api/accounting/periods/${currentPeriodId}/close`, { method: "POST", token: alphaToken });

    await recordScenario(15, "POSTING_GUARD", "Path 5: Sales auto-posting rejected in closed period", async () => {
      await assert.rejects(
        () =>
          runInTenant(tenantAlpha, () =>
            autoPostSaleToLedger({
              tenantId: tenantAlpha,
              saleId: "test_sale_closed_001",
              invoiceNo: "INV-CLOSED-001",
              total: 1200,
              subtotal: 1000,
              totalTax: 200,
            })
          ),
        (err: any) => err instanceof PeriodPostingError && err.code === "PERIOD_CLOSED_FOR_POSTING"
      );
      return "autoPostSaleToLedger threw PeriodPostingError(PERIOD_CLOSED_FOR_POSTING)";
    });

    await recordScenario(16, "POSTING_GUARD", "Path 6: Purchase auto-posting rejected in closed period", async () => {
      await assert.rejects(
        () =>
          runInTenant(tenantAlpha, () =>
            autoPostPurchaseToLedger({
              tenantId: tenantAlpha,
              purchaseId: "test_po_closed_001",
              purchaseNo: "PO-CLOSED-001",
              total: 3500,
            })
          ),
        (err: any) => err instanceof PeriodPostingError && err.code === "PERIOD_CLOSED_FOR_POSTING"
      );
      return "autoPostPurchaseToLedger threw PeriodPostingError(PERIOD_CLOSED_FOR_POSTING)";
    });

    await recordScenario(17, "POSTING_GUARD", "Path 7: Payroll auto-posting rejected in closed period", async () => {
      await assert.rejects(
        () =>
          runInTenant(tenantAlpha, () =>
            autoPostPayrollToLedger({
              tenantId: tenantAlpha,
              payrollRunId: "test_pr_closed_001",
              period: "Current",
              totalGross: 50000,
              totalNet: 45000,
              totalDeductions: 5000,
            })
          ),
        (err: any) => err instanceof PeriodPostingError && err.code === "PERIOD_CLOSED_FOR_POSTING"
      );
      return "autoPostPayrollToLedger threw PeriodPostingError(PERIOD_CLOSED_FOR_POSTING)";
    });

    await recordScenario(18, "POSTING_GUARD", "Path 8: Expense auto-posting rejected in closed period", async () => {
      await assert.rejects(
        () =>
          runInTenant(tenantAlpha, () =>
            autoPostExpenseToLedger({
              tenantId: tenantAlpha,
              claimId: "test_exp_closed_001",
              title: "Client Dinner",
              amount: 450,
            })
          ),
        (err: any) => err instanceof PeriodPostingError && err.code === "PERIOD_CLOSED_FOR_POSTING"
      );
      return "autoPostExpenseToLedger threw PeriodPostingError(PERIOD_CLOSED_FOR_POSTING)";
    });

    await recordScenario(19, "POSTING_GUARD", "Path 9: Stock adjustment auto-posting rejected in closed period", async () => {
      await assert.rejects(
        () =>
          runInTenant(tenantAlpha, () =>
            autoPostStockAdjustmentToLedger({
              tenantId: tenantAlpha,
              adjustmentId: "test_adj_closed_001",
              warehouseName: "Main Warehouse",
              type: "addition",
              totalValue: 800,
            })
          ),
        (err: any) => err instanceof PeriodPostingError && err.code === "PERIOD_CLOSED_FOR_POSTING"
      );
      return "autoPostStockAdjustmentToLedger threw PeriodPostingError(PERIOD_CLOSED_FOR_POSTING)";
    });

    // Reopen current period and April period
    await apiRequest(`/api/accounting/periods/${currentPeriodId}/reopen`, { method: "POST", token: alphaToken });
    await apiRequest(`/api/accounting/periods/${aprilPeriodId}/reopen`, { method: "POST", token: alphaToken });

    await recordScenario(20, "POSTING_SUCCESS", "Path 1 & 5-9: All posting paths succeed when period is OPEN", async () => {
      // 1. Manual JE in April
      const jeRes = await apiRequest("/api/accounting/journal-entries", {
        method: "POST",
        token: alphaToken,
        body: {
          entryDate: closedAprilDate,
          description: "Manual entry after reopening April period",
          items: [
            { accountId: expenseAccId, debit: 600, credit: 0 },
            { accountId: bankAccId, debit: 0, credit: 600 },
          ],
        },
      });
      assert.equal(jeRes.status, 201);

      // 2. Sales
      await runInTenant(tenantAlpha, () =>
        autoPostSaleToLedger({
          tenantId: tenantAlpha,
          saleId: "test_sale_open_001",
          invoiceNo: "INV-OPEN-001",
          total: 1000,
          subtotal: 900,
          totalTax: 100,
        })
      );

      // 3. Purchases
      await runInTenant(tenantAlpha, () =>
        autoPostPurchaseToLedger({
          tenantId: tenantAlpha,
          purchaseId: "test_po_open_001",
          purchaseNo: "PO-OPEN-001",
          total: 2000,
        })
      );

      // 4. Payroll
      await runInTenant(tenantAlpha, () =>
        autoPostPayrollToLedger({
          tenantId: tenantAlpha,
          payrollRunId: "test_pr_open_001",
          period: "Current",
          totalGross: 30000,
          totalNet: 27000,
          totalDeductions: 3000,
        })
      );

      // 5. Expense
      await runInTenant(tenantAlpha, () =>
        autoPostExpenseToLedger({
          tenantId: tenantAlpha,
          claimId: "test_exp_open_001",
          title: "Travel Fuel",
          amount: 350,
        })
      );

      // 6. Stock adjustment
      await runInTenant(tenantAlpha, () =>
        autoPostStockAdjustmentToLedger({
          tenantId: tenantAlpha,
          adjustmentId: "test_adj_open_001",
          warehouseName: "Main Hub",
          type: "addition",
          totalValue: 750,
        })
      );

      return "All 6 posting operations succeeded without errors in open periods.";
    });

    await recordScenario(21, "LEGACY_FALLBACK", "Missing fiscal configuration retains legacy posting behavior", async () => {
      const fyCount = await prisma.fiscalYear.count({ where: { tenantId: tenantLegacy } });
      assert.equal(fyCount, 0);

      const legBank = await prisma.chartOfAccount.create({
        data: {
          tenantId: tenantLegacy,
          accountCode: "1020",
          accountName: "Legacy Bank",
          accountType: "asset",
          category: "current_asset",
        },
      });
      const legExp = await prisma.chartOfAccount.create({
        data: {
          tenantId: tenantLegacy,
          accountCode: "5010",
          accountName: "Legacy Expense",
          accountType: "expense",
          category: "indirect_expense",
        },
      });

      const res = await apiRequest("/api/accounting/journal-entries", {
        method: "POST",
        token: legacyToken,
        body: {
          entryDate: "2026-08-15T00:00:00.000Z",
          description: "Legacy unconfigured tenant posting",
          items: [
            { accountId: legExp.id, debit: 1200, credit: 0 },
            { accountId: legBank.id, debit: 0, credit: 1200 },
          ],
        },
      });
      assert.equal(res.status, 201);

      await runInTenant(tenantLegacy, () =>
        autoPostSaleToLedger({
          tenantId: tenantLegacy,
          saleId: "legacy_sale_001",
          invoiceNo: "LEG-INV-001",
          total: 500,
          subtotal: 500,
          totalTax: 0,
        })
      );

      return "Legacy tenant with 0 fiscal years posted entries successfully without restriction.";
    });

    // =========================================================================
    // SECTION 4: ACCOUNTING INTEGRITY & ATOMICITY
    // =========================================================================

    await recordScenario(22, "ATOMIC_ROLLBACK", "Failed transactions leave zero partial records", async () => {
      const jeCountBefore = await prisma.journalEntry.count({ where: { tenantId: tenantAlpha } });
      const jiCountBefore = await prisma.journalItem.count({
        where: { journalEntry: { tenantId: tenantAlpha } },
      });

      const res = await apiRequest("/api/accounting/journal-entries", {
        method: "POST",
        token: alphaToken,
        body: {
          entryDate: new Date().toISOString(),
          description: "Unbalanced corrupt transaction attempt",
          items: [
            { accountId: expenseAccId, debit: 500, credit: 0 },
            { accountId: bankAccId, debit: 0, credit: 400 },
          ],
        },
      });
      assert.equal(res.status, 400);

      const jeCountAfter = await prisma.journalEntry.count({ where: { tenantId: tenantAlpha } });
      const jiCountAfter = await prisma.journalItem.count({
        where: { journalEntry: { tenantId: tenantAlpha } },
      });

      assert.equal(jeCountBefore, jeCountAfter);
      assert.equal(jiCountBefore, jiCountAfter);

      return `Atomicity verified: 0 partial journal entries or items written on failure.`;
    });

    await recordScenario(23, "LEDGER_BALANCE", "All posted journal entries maintain balanced debits and credits", async () => {
      const entries = await prisma.journalEntry.findMany({
        where: { tenantId: tenantAlpha },
        include: { items: true },
      });

      assert.ok(entries.length > 0);
      for (const entry of entries) {
        const totalDebit = entry.items.reduce((sum, item) => sum + Number(item.debit), 0);
        const totalCredit = entry.items.reduce((sum, item) => sum + Number(item.credit), 0);
        assert.ok(
          Math.abs(totalDebit - totalCredit) < 0.001,
          `JE ${entry.entryNumber} is unbalanced! Debits: ${totalDebit}, Credits: ${totalCredit}`
        );
      }
      return `All ${entries.length} posted entries mathematically verified: Debit === Credit.`;
    });

    await recordScenario(24, "CONTRA_REVERSAL", "Void/contra-posting creates balanced symmetrical reversal", async () => {
      // Find a posted manual entry to void (posted in open current period)
      // Create a specific entry with new Date() to void
      const toVoidRes = await apiRequest("/api/accounting/journal-entries", {
        method: "POST",
        token: alphaToken,
        body: {
          entryDate: new Date().toISOString(),
          description: "Entry to be voided via contra reversal",
          items: [
            { accountId: expenseAccId, debit: 420, credit: 0 },
            { accountId: bankAccId, debit: 0, credit: 420 },
          ],
        },
      });
      assert.equal(toVoidRes.status, 201);
      const originalId = toVoidRes.data.data.id;

      const res = await apiRequest(`/api/accounting/journal-entries/${originalId}/void`, {
        method: "POST",
        token: alphaToken,
        body: { reason: "Mistaken double entry" },
      });
      assert.equal(res.status, 200);

      const updatedOriginal = await prisma.journalEntry.findUnique({ where: { id: originalId } });
      assert.equal(updatedOriginal?.status, "voided");

      const contra = await prisma.journalEntry.findFirst({
        where: { tenantId: tenantAlpha, reference: originalId, referenceType: "contra_reversal" },
        include: { items: true },
      });
      assert.ok(contra);
      assert.equal(Number(contra.totalAmount), Number(updatedOriginal!.totalAmount));
      assert.equal(contra.entryNumber, `CNTR-${updatedOriginal!.entryNumber}`);

      const contraDebit = contra.items.reduce((s, i) => s + Number(i.debit), 0);
      const contraCredit = contra.items.reduce((s, i) => s + Number(i.credit), 0);
      assert.ok(Math.abs(contraDebit - contraCredit) < 0.001);

      return `Original ${updatedOriginal!.entryNumber} voided; Contra ${contra.entryNumber} created with balanced reversal.`;
    });

  } finally {
    // Teardown test server and test fixtures cleanly
    await new Promise<void>((resolve) => server.close(() => resolve()));

    try {
      const testTenants = [tenantAlpha, tenantBeta, tenantLegacy];
      const testUsers = [userAlphaId, userBetaId, userLegacyId];

      await prisma.journalItem.deleteMany({
        where: { journalEntry: { tenantId: { in: testTenants } } },
      });
      await prisma.journalEntry.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.accountingPeriod.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.fiscalYear.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.chartOfAccount.updateMany({
        where: { tenantId: { in: testTenants } },
        data: { parentAccountId: null },
      });
      await prisma.chartOfAccount.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: testUsers } } });
      await prisma.profile.deleteMany({ where: { userId: { in: testUsers } } });
      await prisma.user.deleteMany({ where: { id: { in: testUsers } } });
      await prisma.tenant.deleteMany({ where: { id: { in: testTenants } } });
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  // Summary
  console.log("\n================================================================================");
  console.log("STEP 3.2 DATABASE INTEGRATION TEST RESULTS");
  console.log("================================================================================");
  const total = report.length;
  const passed = report.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.error("❌ FAILED SCENARIOS:");
    for (const r of report.filter((r) => !r.passed)) {
      console.error(`- Scenario #${r.id} [${r.category}]: ${r.scenario}`);
      console.error(`  Evidence: ${r.evidence}`);
    }
    process.exit(1);
  } else {
    console.log("✅ ALL STEP 3.2 DATABASE INTEGRATION TEST SCENARIOS PASSED PERFECTLY!");
    process.exit(0);
  }
}

runStep32IntegrationTests().catch((err) => {
  console.error("Fatal test runner execution failure:", err);
  process.exit(1);
});
