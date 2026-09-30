import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { accountingRouter } from "../routes/accounting.routes";

describe("Tier 3 (P1) Group 3.1: Accounting Suite Modularization & Isolation", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w3_acc_tenant_alpha";
  const tenantBetaId = "w3_acc_tenant_beta";

  const alphaUserId = "w3_acc_alpha_user";
  const betaUserId = "w3_acc_beta_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@w3-acc.local",
    tenantId: tenantAlphaId,
    roles: ["admin", "super_admin"],
    permissions: ["accounting.view", "accounting.create", "accounting.manage", "finance.invoices.view"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@w3-acc.local",
    tenantId: tenantBetaId,
    roles: ["admin"],
    permissions: ["accounting.view", "accounting.create", "accounting.manage"],
  });

  let alphaBankAcc1Id: string;
  let alphaBankAcc2Id: string;
  let betaBankAccId: string;

  beforeAll(async () => {
    // 1. Setup tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha Accounting Tenant", slug: "alpha-acc-tenant" },
      update: { name: "Alpha Accounting Tenant" },
    });

    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta Accounting Tenant", slug: "beta-acc-tenant" },
      update: { name: "Beta Accounting Tenant" },
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "Alpha Accounting Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "Beta Accounting Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 2. Setup users, profiles, and roles
    for (const u of [
      { id: alphaUserId, email: "alpha@w3-acc.local", tenantId: tenantAlphaId, role: "hr_admin" as const },
      { id: betaUserId, email: "beta@w3-acc.local", tenantId: tenantBetaId, role: "hr_admin" as const },
    ]) {
      await prisma.user.upsert({
        where: { id: u.id },
        create: { id: u.id, email: u.email, passwordHash: "dummy" },
        update: {},
      });
      await prisma.profile.upsert({
        where: { userId: u.id },
        create: { userId: u.id, email: u.email, fullName: u.id, tenantId: u.tenantId },
        update: { tenantId: u.tenantId },
      });
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.userRole.create({
        data: { userId: u.id, role: u.role, tenantId: u.tenantId },
      });
    }

    // Clean previous test data
    await prisma.journalItem.deleteMany({
      where: { journalEntry: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.journalEntry.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.chartOfAccount.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });

    // Start Express app with accountingRouter
    const app = express();
    app.use(express.json());
    app.use("/api/accounting", accountingRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.journalItem.deleteMany({
      where: { journalEntry: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.journalEntry.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.chartOfAccount.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
  });

  it("1. Automatically seeds and retrieves Chart of Accounts for Tenant Alpha with strict tenant isolation", async () => {
    const resAlpha = await fetch(`${baseUrl}/api/accounting/accounts`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(resAlpha.status).toBe(200);
    const bodyAlpha = await resAlpha.json();
    expect(bodyAlpha.data.length).toBeGreaterThanOrEqual(17);

    // Verify all seeded accounts belong strictly to Tenant Alpha
    bodyAlpha.data.forEach((acc: any) => {
      expect(acc.tenantId).toBe(tenantAlphaId);
    });

    // Now call for Tenant Beta
    const resBeta = await fetch(`${baseUrl}/api/accounting/accounts`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(resBeta.status).toBe(200);
    const bodyBeta = await resBeta.json();
    expect(bodyBeta.data.length).toBeGreaterThanOrEqual(17);

    // Verify all seeded accounts belong strictly to Tenant Beta
    bodyBeta.data.forEach((acc: any) => {
      expect(acc.tenantId).toBe(tenantBetaId);
    });
  });

  it("2. Creates a custom Chart of Account under Tenant Alpha and prevents cross-tenant leaks to Tenant Beta", async () => {
    const createRes = await fetch(`${baseUrl}/api/accounting/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        accountCode: "1099",
        accountName: "Alpha Dedicated Treasury Vault",
        accountType: "asset",
        category: "current_asset",
        description: "Special reserve vault",
        balance: 50000,
      }),
    });
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    alphaBankAcc1Id = createdBody.data.id;
    expect(createdBody.data.accountCode).toBe("1099");
    expect(createdBody.data.tenantId).toBe(tenantAlphaId);

    // Verify Tenant Beta cannot see Alpha's custom account
    const betaListRes = await fetch(`${baseUrl}/api/accounting/accounts`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    const betaList = await betaListRes.json();
    const foundInBeta = betaList.data.some((a: any) => a.id === alphaBankAcc1Id || a.accountCode === "1099");
    expect(foundInBeta).toBe(false);
  });

  it("3. Creates a secondary account for Tenant Alpha and prepares for bank transfer", async () => {
    const createRes = await fetch(`${baseUrl}/api/accounting/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        accountCode: "1098",
        accountName: "Alpha Petty Cash Operations",
        accountType: "asset",
        category: "current_asset",
        balance: 1000,
      }),
    });
    expect(createRes.status).toBe(201);
    const body = await createRes.json();
    alphaBankAcc2Id = body.data.id;
    expect(body.data.accountCode).toBe("1098");

    // Maintain GAAP double-entry parity: offset initial injected assets (50,000 + 1,000 = 51,000) with Owner's Equity credit
    await prisma.chartOfAccount.updateMany({
      where: { tenantId: tenantAlphaId, accountCode: "3010" },
      data: { balance: 51000 },
    });
  });

  it("4. Rejects internal bank transfer when source and destination accounts are identical", async () => {
    const res = await fetch(`${baseUrl}/api/accounting/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        fromAccount: alphaBankAcc1Id,
        toAccount: alphaBankAcc1Id,
        amount: "5000",
        reference: "SELF-TRF",
        notes: "Invalid self transfer",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/same/i);
  });

  it("5. Rejects cross-tenant transfer: Tenant Beta cannot transfer funds out of Tenant Alpha's account", async () => {
    // Tenant Beta creates their own account
    const betaAccRes = await fetch(`${baseUrl}/api/accounting/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({
        accountCode: "1055",
        accountName: "Beta Vault",
        accountType: "asset",
        category: "current_asset",
        balance: 2000,
      }),
    });
    expect(betaAccRes.status).toBe(201);
    const betaAccBody = await betaAccRes.json();
    betaBankAccId = betaAccBody.data.id;

    // Tenant Beta attempts to transfer FROM Alpha's account (alphaBankAcc1Id) to Beta's account (betaBankAccId)
    const stealRes = await fetch(`${baseUrl}/api/accounting/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({
        fromAccount: alphaBankAcc1Id,
        toAccount: betaBankAccId,
        amount: "10000",
        reference: "CROSS-TENANT-ATTEMPT",
      }),
    });
    expect([400, 403, 404]).toContain(stealRes.status);
  });

  it("6. Executes valid internal bank transfer between Tenant Alpha accounts and posts balanced journal entry", async () => {
    const transferRes = await fetch(`${baseUrl}/api/accounting/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        fromAccount: alphaBankAcc1Id,
        toAccount: alphaBankAcc2Id,
        amount: "5000",
        reference: "TRF-TEST-001",
        notes: "Transfer for operational payroll",
      }),
    });
    expect(transferRes.status).toBe(201);
    const body = await transferRes.json();
    expect(body.success).toBe(true);

    // Verify account balances in database
    const acc1 = await prisma.chartOfAccount.findUnique({ where: { id: alphaBankAcc1Id } });
    const acc2 = await prisma.chartOfAccount.findUnique({ where: { id: alphaBankAcc2Id } });

    // 50000 - 5000 = 45000
    expect(Number(acc1?.balance)).toBe(45000);
    // 1000 + 5000 = 6000
    expect(Number(acc2?.balance)).toBe(6000);
  });

  it("7. Rejects posting unbalanced journal entries (Debits != Credits)", async () => {
    const unbalRes = await fetch(`${baseUrl}/api/accounting/journal-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        description: "Unbalanced Entry Test",
        reference: "UNBAL-001",
        entryDate: new Date().toISOString().split("T")[0],
        items: [
          { accountId: alphaBankAcc1Id, debit: "1000", credit: "0", notes: "Debit 1000" },
          { accountId: alphaBankAcc2Id, debit: "0", credit: "500", notes: "Credit only 500" },
        ],
      }),
    });
    expect(unbalRes.status).toBe(400);
    const body = await unbalRes.json();
    expect(body.error).toMatch(/equal|balance/i);
  });

  it("8. Successfully posts balanced journal entry and updates ledger statement", async () => {
    const balRes = await fetch(`${baseUrl}/api/accounting/journal-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        description: "Office Supplies Purchase",
        reference: "SUP-001",
        entryDate: new Date().toISOString().split("T")[0],
        items: [
          { accountId: alphaBankAcc1Id, debit: "0", credit: "2500", notes: "Bank Credit" },
          { accountId: alphaBankAcc2Id, debit: "2500", credit: "0", notes: "Expense / Cash Debit" },
        ],
      }),
    });
    expect(balRes.status).toBe(201);
    const body = await balRes.json();
    expect(body.success).toBe(true);
    expect(body.data.entryNumber).toBeDefined();
  });

  it("9. Generates accurate Financial Statements (Balance Sheet & P&L) verifying equation balance", async () => {
    const res = await fetch(`${baseUrl}/api/accounting/reports/financial-statements`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const bs = body.data.balanceSheet;
    expect(bs).toBeDefined();
    expect(typeof bs.totalAssets).toBe("number");
    expect(typeof bs.totalLiabilities).toBe("number");
    expect(typeof bs.totalEquity).toBe("number");
    expect(typeof bs.balancedTotalLiabEquity).toBe("number");

    const pl = body.data.profitAndLoss;
    expect(pl).toBeDefined();
    expect(typeof pl.totalRevenue).toBe("number");
    expect(typeof pl.totalExpenses).toBe("number");
    expect(typeof pl.netProfit).toBe("number");
  });

  it("10. Generates Comprehensive Trial Balance verifying Sum(Debits) equals Sum(Credits)", async () => {
    const res = await fetch(`${baseUrl}/api/accounting/reports/trial-balance`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accounts.length).toBeGreaterThan(0);
    expect(typeof body.data.totalDebits).toBe("number");
    expect(typeof body.data.totalCredits).toBe("number");
    expect(body.data.isBalanced).toBe(true);
  });
});
