import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { accountingRouter } from "../routes/accounting.routes";
import { salesRouter } from "../routes/sales.routes";
import { purchasesRouter } from "../routes/purchases.routes";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

interface TestReportItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
}

const report: TestReportItem[] = [];

async function runStep37TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.7: GL VOIDING, CONTRA REVERSALS & REAL FINANCIAL REPORTS");
  console.log("Coverage: Void Contra Numbering, Reversal Guards, Fiscal Periods, TB, P&L, BS, Real Aging");
  console.log("Runtime: Node.js 20 LTS | Prisma 5.22.0 | Express 4 | MySQL/MariaDB master_hrms_dev");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  app.use("/api/accounting", accountingRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/purchases", purchasesRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const tenantA = `step37_tenant_a_${Date.now()}`;
  const tenantB = `step37_tenant_b_${Date.now()}`;

  const userA = `user_a_${Date.now()}`;
  const userB = `user_b_${Date.now()}`;

  const tokenA = generateToken({
    userId: userA,
    email: "controller.a@enterprise.com",
    roles: ["admin"],
    tenantId: tenantA,
  });

  const tokenB = generateToken({
    userId: userB,
    email: "controller.b@enterprise.com",
    roles: ["admin"],
    tenantId: tenantB,
  });

  let cashAccountA: any;
  let revenueAccountA: any;
  let receivableAccountA: any;
  let payableAccountA: any;
  let testJournalA: any;
  let testJournalA2: any;
  let contraEntryA: any;
  let customerA: any;
  let supplierA: any;
  let fiscalYearA: any;
  let fiscalPeriodA: any;

  try {
    // 1. Seed Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantA, slug: tenantA, name: "Alpha GL Financial Corp" },
        { id: tenantB, slug: tenantB, name: "Beta GL Financial Corp" },
      ],
      skipDuplicates: true,
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantA,
      name: "Alpha GL Financial Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantB,
      name: "Beta GL Financial Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // Create users, profiles, and roles
    await prisma.user.createMany({
      data: [
        { id: userA, email: "controller.a@enterprise.com", passwordHash: "dummy" },
        { id: userB, email: "controller.b@enterprise.com", passwordHash: "dummy" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: userA, email: "controller.a@enterprise.com", fullName: "Controller A", tenantId: tenantA },
        { userId: userB, email: "controller.b@enterprise.com", fullName: "Controller B", tenantId: tenantB },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: userA, role: "hr_admin", tenantId: tenantA },
        { userId: userB, role: "hr_admin", tenantId: tenantB },
      ],
    });

    // Seed COA for Tenant A
    cashAccountA = await prisma.chartOfAccount.create({
      data: {
        tenantId: tenantA,
        accountCode: "1010",
        accountName: "Primary Operating Bank",
        accountType: "asset",
        category: "Current Assets",
        balance: 50000,
        currency: "USD",
        status: "active",
      },
    });

    receivableAccountA = await prisma.chartOfAccount.create({
      data: {
        tenantId: tenantA,
        accountCode: "1200",
        accountName: "Accounts Receivable",
        accountType: "asset",
        category: "Current Assets",
        balance: 0,
        currency: "USD",
        status: "active",
      },
    });

    payableAccountA = await prisma.chartOfAccount.create({
      data: {
        tenantId: tenantA,
        accountCode: "2010",
        accountName: "Accounts Payable",
        accountType: "liability",
        category: "Current Liabilities",
        balance: 0,
        currency: "USD",
        status: "active",
      },
    });

    revenueAccountA = await prisma.chartOfAccount.create({
      data: {
        tenantId: tenantA,
        accountCode: "4010",
        accountName: "Sales Revenue",
        accountType: "revenue",
        category: "Operating Revenue",
        balance: 0,
        currency: "USD",
        status: "active",
      },
    });

    // Seed Customer & Supplier for Tenant A
    customerA = await prisma.customer.create({
      data: {
        tenantId: tenantA,
        name: "Acme Industrial Corp",
        email: "billing@acme.com",
        phone: "+1-555-0100",
      },
    });

    supplierA = await prisma.supplier.create({
      data: {
        tenantId: tenantA,
        name: "Apex Global Supplies",
        email: "orders@apex.com",
        phone: "+1-555-0200",
      },
    });

    console.log("✅ Prerequisites & baseline entities seeded successfully.\n");

    // --------------------------------------------------------------------------
    // TEST 1: GAAP Journal Voiding & Contra Reversal (JE-YYYY-REV-XXXX)
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 1: Journal Entry Voiding & Paired Contra Reversal Creation...");

      // Create a posted journal entry: Debit Cash $10,000, Credit Revenue $10,000
      testJournalA = await prisma.journalEntry.create({
        data: {
          tenantId: tenantA,
          entryNumber: "JE-2026-0001",
          entryDate: new Date(),
          reference: "MANUAL-001",
          referenceType: "manual",
          description: "Initial consulting service revenue",
          totalAmount: 10000,
          status: "posted",
          items: {
            create: [
              {
                accountId: cashAccountA.id,
                type: "debit",
                debit: 10000,
                credit: 0,
                notes: "Consulting fee deposit",
              },
              {
                accountId: revenueAccountA.id,
                type: "credit",
                debit: 0,
                credit: 10000,
                notes: "Consulting revenue earned",
              },
            ],
          },
        },
      });

      // Update balances to reflect the posted journal
      await prisma.chartOfAccount.update({
        where: { id: cashAccountA.id },
        data: { balance: { increment: 10000 } },
      });
      await prisma.chartOfAccount.update({
        where: { id: revenueAccountA.id },
        data: { balance: { increment: 10000 } },
      });

      // Call Void Endpoint
      const res = await fetch(`${baseUrl}/api/accounting/journal-entries/${testJournalA.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ reason: "Duplicate client invoicing error" }),
      });

      const body = await res.json();
      const status = res.status;

      // Verify original status
      const updatedOriginal = await prisma.journalEntry.findUnique({
        where: { id: testJournalA.id },
      });

      // Verify contra voucher
      contraEntryA = body.data;
      const contraItems = await prisma.journalItem.findMany({
        where: { journalEntryId: contraEntryA?.id },
      });

      const debitItem = contraItems.find((i) => Number(i.debit) > 0);
      const creditItem = contraItems.find((i) => Number(i.credit) > 0);

      const isNumberingValid = /^JE-\d{4}-REV-\d{4}$/.test(contraEntryA?.entryNumber || "");
      const isOriginalVoided = updatedOriginal?.status === "voided";
      const isReferenceCorrect = contraEntryA?.reference === testJournalA.id && contraEntryA?.referenceType === "contra_reversal";
      const isInvertedCorrectly =
        debitItem?.accountId === revenueAccountA.id &&
        Number(debitItem?.debit) === 10000 &&
        creditItem?.accountId === cashAccountA.id &&
        Number(creditItem?.credit) === 10000;

      const passed = status === 200 && isNumberingValid && isOriginalVoided && isReferenceCorrect && isInvertedCorrectly;

      report.push({
        id: "T1",
        name: "GAAP Journal Voiding & Contra Reversal (JE-YYYY-REV-XXXX)",
        category: "GL Voiding & Audit Trails",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Contra Number: ${contraEntryA?.entryNumber} | Inverted: Rev Debit $${debitItem?.debit} & Cash Credit $${creditItem?.credit} | Orig Status: ${updatedOriginal?.status}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Contra entry ${contraEntryA?.entryNumber} created with inverted items\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 2: Symmetrical Account Balance Rollback
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 2: Symmetrical Account Balance Rollback Verification...");

      const cashAfterVoid = await prisma.chartOfAccount.findUnique({ where: { id: cashAccountA.id } });
      const revAfterVoid = await prisma.chartOfAccount.findUnique({ where: { id: revenueAccountA.id } });

      // Originally cash was 50000, incremented by 10000 -> 60000, after contra reversal (cash credited 10000) -> 50000
      // Originally revenue was 0, incremented by 10000 -> 10000, after contra reversal (revenue debited 10000) -> 0
      const isCashRestored = Number(cashAfterVoid?.balance) === 50000;
      const isRevenueRestored = Number(revAfterVoid?.balance) === 0;

      const passed = isCashRestored && isRevenueRestored;

      report.push({
        id: "T2",
        name: "Symmetrical Account Balance Rollback",
        category: "Double-Entry Balance Integrity",
        passed,
        durationMs: Date.now() - start,
        evidence: `Cash Balance: $${cashAfterVoid?.balance} (expected 50000) | Revenue Balance: $${revAfterVoid?.balance} (expected 0)`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Account balances symmetrically restored\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 3: Guard Against Double Voiding
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 3: Guard Against Double Voiding (Rejection of Voided Entry)...");

      const res = await fetch(`${baseUrl}/api/accounting/journal-entries/${testJournalA.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ reason: "Attempting duplicate void" }),
      });

      const body = await res.json();
      const status = res.status;
      const passed = status === 400 && body.error?.includes("already voided");

      report.push({
        id: "T3",
        name: "Guard Against Double Voiding",
        category: "GL Validation Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Error: ${body.error}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Double void correctly rejected with HTTP 400\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 4: Guard Against Voiding Contra Reversal Entry
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 4: Guard Against Voiding Contra Reversal Entry...");

      const res = await fetch(`${baseUrl}/api/accounting/journal-entries/${contraEntryA.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ reason: "Attempting to void contra reversal" }),
      });

      const body = await res.json();
      const status = res.status;
      const passed = status === 400 && body.error?.includes("Cannot void a contra reversal entry");

      report.push({
        id: "T4",
        name: "Guard Against Voiding Contra Reversal Entry",
        category: "GL Validation Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Error: ${body.error}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Voiding contra reversal correctly rejected with HTTP 400\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 5: Closed Fiscal Period Guard (422 PERIOD_CLOSED)
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 5: Closed Fiscal Period Guard Verification...");

      // Create a second test journal entry to void
      testJournalA2 = await prisma.journalEntry.create({
        data: {
          tenantId: tenantA,
          entryNumber: "JE-2026-0002",
          entryDate: new Date(),
          reference: "MANUAL-002",
          referenceType: "manual",
          description: "Office equipment purchase",
          totalAmount: 2500,
          status: "posted",
          items: {
            create: [
              { accountId: cashAccountA.id, type: "credit", debit: 0, credit: 2500 },
              { accountId: revenueAccountA.id, type: "debit", debit: 2500, credit: 0 },
            ],
          },
        },
      });

      // Create a fiscal year and closed accounting period covering today
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      fiscalYearA = await prisma.fiscalYear.create({
        data: {
          tenantId: tenantA,
          name: `FY-${now.getFullYear()}`,
          startDate: yearStart,
          endDate: yearEnd,
          status: "open",
        },
      });

      fiscalPeriodA = await prisma.accountingPeriod.create({
        data: {
          tenantId: tenantA,
          fiscalYearId: fiscalYearA.id,
          name: `Period-${now.getMonth() + 1}`,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
          status: "closed", // Locked period!
        },
      });

      // Attempt to void testJournalA2 in the locked period
      const res = await fetch(`${baseUrl}/api/accounting/journal-entries/${testJournalA2.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ reason: "Void in closed period" }),
      });

      const body = await res.json();
      const status = res.status;
      const passed = status === 422 && body.code === "PERIOD_CLOSED";

      report.push({
        id: "T5",
        name: "Closed Fiscal Period Guard (422 PERIOD_CLOSED)",
        category: "Fiscal Governance & Period Locking",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Error Code: ${body.code} | Message: ${body.error}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Voiding blocked in closed period with HTTP 422 PERIOD_CLOSED\n`);

      // Reopen period for subsequent tests
      await prisma.accountingPeriod.update({
        where: { id: fiscalPeriodA.id },
        data: { status: "open" },
      });
    }

    // --------------------------------------------------------------------------
    // TEST 6: Trial Balance Mathematical Equality (Sum Debits === Sum Credits)
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 6: Trial Balance Mathematical Equality Verification...");

      // Seed balanced accounts: Cash (Asset) = 50,000 Debit, Payable (Liability) = 15,000 Credit, Revenue = 35,000 Credit
      // Debits = 50,000, Credits = 50,000
      await prisma.chartOfAccount.update({
        where: { id: payableAccountA.id },
        data: { balance: 15000 },
      });
      await prisma.chartOfAccount.update({
        where: { id: revenueAccountA.id },
        data: { balance: 35000 },
      });
      await prisma.chartOfAccount.update({
        where: { id: cashAccountA.id },
        data: { balance: 50000 },
      });

      const res = await fetch(`${baseUrl}/api/accounting/reports/trial-balance`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      const status = res.status;
      const data = body.data;

      const isBalanced = data?.isBalanced === true;
      const diffBelowPenny = Number(data?.difference) < 0.01;
      const accountsCount = Array.isArray(data?.accounts) && data.accounts.length > 0;
      const passed = status === 200 && isBalanced && diffBelowPenny && accountsCount;

      report.push({
        id: "T6",
        name: "Trial Balance Mathematical Equality (Sum Debits === Sum Credits)",
        category: "GAAP Financial Statements",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Debits: $${data?.totalDebits} | Credits: $${data?.totalCredits} | Diff: $${data?.difference} | isBalanced: ${isBalanced}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Trial Balance balanced with difference $${data?.difference}\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 7: Real Dynamic Profit & Loss Statement (P&L)
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 7: Real Dynamic Profit & Loss Calculation...");

      // Create an expense account
      const expenseAcc = await prisma.chartOfAccount.create({
        data: {
          tenantId: tenantA,
          accountCode: "5010",
          accountName: "Cost of Goods Sold",
          accountType: "expense",
          category: "Cost of Sales",
          balance: 8000,
          currency: "USD",
          status: "active",
        },
      });

      // Update revenue account to 20000
      await prisma.chartOfAccount.update({
        where: { id: revenueAccountA.id },
        data: { balance: 20000 },
      });

      const res = await fetch(`${baseUrl}/api/accounting/reports/financial-statements`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      const status = res.status;
      const pnl = body.data?.profitAndLoss;

      const expectedNetProfit = 20000 - 8000; // 12000
      const isNetProfitAccurate = Math.abs(Number(pnl?.netProfit) - expectedNetProfit) < 0.01;
      const isMarginAccurate = pnl?.profitMarginPct === "60.0"; // 12000/20000 = 60.0%

      const passed = status === 200 && isNetProfitAccurate && isMarginAccurate;

      report.push({
        id: "T7",
        name: "Real Dynamic Profit & Loss Statement (P&L)",
        category: "GAAP Financial Statements",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Total Rev: $${pnl?.totalRevenue} | Total Exp: $${pnl?.totalExpenses} | Net Profit: $${pnl?.netProfit} | Margin: ${pnl?.profitMarginPct}%`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: P&L Net Profit $${pnl?.netProfit} with margin ${pnl?.profitMarginPct}%\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 8: Real Dynamic Balance Sheet Equality (Assets = Liab + Equity + Net Profit)
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 8: Real Dynamic Balance Sheet Equality...");

      // Update equity account so Assets = Liab + Equity + Net Profit
      // Assets = 65000 (Cash)
      // Liab = 15000 (Payable)
      // Net Profit = 12000
      // Equity needed = 65000 - (15000 + 12000) = 38000
      await prisma.chartOfAccount.create({
        data: {
          tenantId: tenantA,
          accountCode: "3010",
          accountName: "Owner's Equity",
          accountType: "equity",
          category: "Equity",
          balance: 38000,
          currency: "USD",
          status: "active",
        },
      });

      // Update cash to 65000
      await prisma.chartOfAccount.update({
        where: { id: cashAccountA.id },
        data: { balance: 65000 },
      });

      const res = await fetch(`${baseUrl}/api/accounting/reports/financial-statements`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      const status = res.status;
      const bs = body.data?.balanceSheet;

      const isBalanced = bs?.isBalanced === true;
      const diff = Math.abs(Number(bs?.totalAssets) - Number(bs?.balancedTotalLiabEquity));
      const passed = status === 200 && isBalanced && diff < 0.01;

      report.push({
        id: "T8",
        name: "Real Dynamic Balance Sheet Equality",
        category: "GAAP Financial Statements",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Total Assets: $${bs?.totalAssets} | Liab+Equity+NetProfit: $${bs?.balancedTotalLiabEquity} | Balanced: ${isBalanced}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Balance Sheet balanced: Assets $${bs?.totalAssets} === Liab+Equity+NetProfit $${bs?.balancedTotalLiabEquity}\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 9: Accounts Receivable (AR) Invoice Aging Buckets
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 9: Accounts Receivable (AR) Invoice Aging Buckets...");

      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      // Seed 4 unpaid sales with different due dates across all 4 aging buckets
      // Bucket 1: Current (0-30 days) -> Due today
      // Bucket 2: 31-60 days -> Due 40 days ago
      // Bucket 3: 61-90 days -> Due 70 days ago
      // Bucket 4: 90+ days -> Due 110 days ago
      await prisma.sale.createMany({
        data: [
          {
            tenantId: tenantA,
            invoiceNo: "INV-AGE-01",
            customerId: customerA.id,
            customerName: customerA.name,
            total: 1000,
            paidAmount: 0,
            paymentStatus: "unpaid",
            date: new Date(now.getTime() - 5 * dayMs),
            dueDate: new Date(now.getTime() - 2 * dayMs), // Overdue 2 days -> days30 bucket
          },
          {
            tenantId: tenantA,
            invoiceNo: "INV-AGE-02",
            customerId: customerA.id,
            customerName: customerA.name,
            total: 2000,
            paidAmount: 500, // Partial: remaining 1500
            paymentStatus: "partial",
            date: new Date(now.getTime() - 50 * dayMs),
            dueDate: new Date(now.getTime() - 40 * dayMs), // Overdue 40 days -> days60 bucket
          },
          {
            tenantId: tenantA,
            invoiceNo: "INV-AGE-03",
            customerId: customerA.id,
            customerName: customerA.name,
            total: 3000,
            paidAmount: 0,
            paymentStatus: "unpaid",
            date: new Date(now.getTime() - 80 * dayMs),
            dueDate: new Date(now.getTime() - 70 * dayMs), // Overdue 70 days -> days90 bucket
          },
          {
            tenantId: tenantA,
            invoiceNo: "INV-AGE-04",
            customerId: customerA.id,
            customerName: customerA.name,
            total: 4000,
            paidAmount: 0,
            paymentStatus: "unpaid",
            date: new Date(now.getTime() - 120 * dayMs),
            dueDate: new Date(now.getTime() - 110 * dayMs), // Overdue 110 days -> days90Plus bucket
          },
        ],
      });

      const res = await fetch(`${baseUrl}/api/accounting/reports/aging`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      const status = res.status;
      const invoiceAging = body.data?.invoiceAging || body.invoiceAging || [];

      const customerRow = invoiceAging.find((r: any) => r.customerId === customerA.id);

      const hasBucket30 = Number(customerRow?.days30) >= 1000;
      const hasBucket60 = Number(customerRow?.days60) >= 1500;
      const hasBucket90 = Number(customerRow?.days90) >= 3000;
      const hasBucket90Plus = Number(customerRow?.days90Plus) >= 4000;
      const hasTotal = Number(customerRow?.total) >= 9500;

      const passed = status === 200 && customerRow && hasBucket30 && hasBucket60 && hasBucket90 && hasBucket90Plus && hasTotal;

      report.push({
        id: "T9",
        name: "Accounts Receivable (AR) Invoice Aging Buckets",
        category: "Real Aging Analytics",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Customer: ${customerRow?.customer} | 1-30d: $${customerRow?.days30} | 31-60d: $${customerRow?.days60} | 61-90d: $${customerRow?.days90} | 90+d: $${customerRow?.days90Plus} | Total: $${customerRow?.total}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: AR Aging computed across 4 buckets: Total $${customerRow?.total}\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 10: Accounts Payable (AP) Vendor Bill Aging Buckets
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 10: Accounts Payable (AP) Vendor Bill Aging Buckets...");

      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      // Seed 3 purchases across aging buckets
      await prisma.purchase.createMany({
        data: [
          {
            tenantId: tenantA,
            purchaseNo: "PO-AGE-01",
            supplierId: supplierA.id,
            total: 2500,
            paidAmount: 0,
            paymentStatus: "unpaid",
            status: "received",
            date: new Date(now.getTime() - 10 * dayMs), // Overdue 10 days -> days30 bucket
          },
          {
            tenantId: tenantA,
            purchaseNo: "PO-AGE-02",
            supplierId: supplierA.id,
            total: 5000,
            paidAmount: 1000, // Partial: remaining 4000
            paymentStatus: "partial",
            status: "received",
            date: new Date(now.getTime() - 45 * dayMs), // Overdue 45 days -> days60 bucket
          },
          {
            tenantId: tenantA,
            purchaseNo: "PO-AGE-03",
            supplierId: supplierA.id,
            total: 7500,
            paidAmount: 0,
            paymentStatus: "unpaid",
            status: "received",
            date: new Date(now.getTime() - 95 * dayMs), // Overdue 95 days -> days90Plus bucket
          },
        ],
      });

      const res = await fetch(`${baseUrl}/api/accounting/reports/aging`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      const status = res.status;
      const billAging = body.data?.billAging || body.billAging || [];

      const supplierRow = billAging.find((r: any) => r.supplierId === supplierA.id);

      const hasBucket30 = Number(supplierRow?.days30) >= 2500;
      const hasBucket60 = Number(supplierRow?.days60) >= 4000;
      const hasBucket90Plus = Number(supplierRow?.days90Plus) >= 7500;
      const hasTotal = Number(supplierRow?.total) >= 14000;

      const passed = status === 200 && supplierRow && hasBucket30 && hasBucket60 && hasBucket90Plus && hasTotal;

      report.push({
        id: "T10",
        name: "Accounts Payable (AP) Vendor Bill Aging Buckets",
        category: "Real Aging Analytics",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${status} | Supplier: ${supplierRow?.supplier} | 1-30d: $${supplierRow?.days30} | 31-60d: $${supplierRow?.days60} | 90+d: $${supplierRow?.days90Plus} | Total: $${supplierRow?.total}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: AP Aging computed across buckets: Total $${supplierRow?.total}\n`);
    }

    // --------------------------------------------------------------------------
    // TEST 11: Cross-Tenant Isolation Enforcement
    // --------------------------------------------------------------------------
    {
      const start = Date.now();
      console.log("Executing Test 11: Cross-Tenant Isolation Enforcement on Voiding & Reports...");

      // Tenant B tries to void Tenant A's journal entry
      const voidRes = await fetch(`${baseUrl}/api/accounting/journal-entries/${testJournalA2.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ reason: "Malicious cross-tenant void" }),
      });

      const voidBody = await voidRes.json();
      const isVoidBlocked = voidRes.status === 404;

      // Tenant B queries aging reports
      const agingRes = await fetch(`${baseUrl}/api/accounting/reports/aging`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      const agingBody = await agingRes.json();
      const bInvoiceAging = agingBody.data?.invoiceAging || agingBody.invoiceAging || [];
      const bBillAging = agingBody.data?.billAging || agingBody.billAging || [];

      // Ensure no Tenant A customers or suppliers leaked to Tenant B
      const leakedCustomer = bInvoiceAging.some((r: any) => r.customerId === customerA.id);
      const leakedSupplier = bBillAging.some((r: any) => r.supplierId === supplierA.id);

      const passed = isVoidBlocked && !leakedCustomer && !leakedSupplier;

      report.push({
        id: "T11",
        name: "Cross-Tenant Isolation Enforcement",
        category: "Multi-Tenant Security",
        passed,
        durationMs: Date.now() - start,
        evidence: `Cross-Tenant Void: HTTP ${voidRes.status} (${voidBody.error}) | Leaked Customer: ${leakedCustomer} | Leaked Supplier: ${leakedSupplier}`,
      });
      console.log(`  -> ${passed ? "PASS" : "FAIL"}: Cross-tenant void blocked (404) and reports strictly isolated\n`);
    }

  } catch (err: any) {
    console.error("FATAL SUITE ERROR:", err);
  } finally {
    // Teardown HTTP server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Clean up test data
    try {
      await prisma.journalItem.deleteMany({ where: { journalEntry: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.journalEntry.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.accountingPeriod.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.fiscalYear.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.purchase.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.supplier.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.chartOfAccount.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.userRole.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.profile.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  // --------------------------------------------------------------------------
  // Summary & Print Table
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("PHASE C · WAVE 3 · STEP 3.7 TEST SUITE EXECUTION SUMMARY");
  console.log("================================================================================");
  console.table(
    report.map((r) => ({
      ID: r.id,
      Category: r.category,
      Name: r.name,
      Status: r.passed ? "✅ PASS" : "❌ FAIL",
      Duration: `${r.durationMs}ms`,
      Evidence: r.evidence.slice(0, 75) + (r.evidence.length > 75 ? "..." : ""),
    }))
  );

  const EXPECTED_TEST_COUNT = 11;
  const passedCount = report.filter((r) => r.passed).length;
  const totalCount = report.length;
  console.log(`\nFinal Result: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}% success rate)`);

  if (passedCount !== EXPECTED_TEST_COUNT || totalCount !== EXPECTED_TEST_COUNT) {
    console.error(`❌ Expected ${EXPECTED_TEST_COUNT} tests to pass, but got ${passedCount}/${totalCount}. Please review the output above.`);
    process.exit(1);
  } else {
    console.log("🎉 ALL 11 TESTS PASSED SUCCESSFULLY! Ready for Step 3.8 parity lock.");
    process.exit(0);
  }
}

runStep37TestSuite();
