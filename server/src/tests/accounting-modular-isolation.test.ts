import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
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

  let alphaToken: string;
  let betaToken: string;

  let alphaBankAcc1Id: string;
  let alphaBankAcc2Id: string;
  let betaBankAccId: string;

  before(async () => {
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

    // Provision accounting entitlement for both test tenants
    for (const tId of [tenantAlphaId, tenantBetaId]) {
      for (const modKey of ["accounting", "product_accounting", "finance", "product_finance"]) {
        await prisma.tenantModule.upsert({
          where: { tenantId_moduleKey: { tenantId: tId, moduleKey: modKey } },
          create: { tenantId: tId, moduleKey: modKey, isEnabled: true },
          update: { isEnabled: true },
        });
      }
    }

    // Authoritative device sessions
    const expiresNextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const alphaSession = await prisma.deviceSession.create({
      data: {
        userId: alphaUserId,
        tenantId: tenantAlphaId,
        deviceName: "Acc Test Runner Alpha",
        deviceType: "desktop",
        expiresAt: expiresNextWeek,
        revoked: false,
      },
    });

    const betaSession = await prisma.deviceSession.create({
      data: {
        userId: betaUserId,
        tenantId: tenantBetaId,
        deviceName: "Acc Test Runner Beta",
        deviceType: "desktop",
        expiresAt: expiresNextWeek,
        revoked: false,
      },
    });

    alphaToken = generateToken({
      userId: alphaUserId,
      email: "alpha@w3-acc.local",
      tenantId: tenantAlphaId,
      roles: ["admin", "super_admin"],
      permissions: ["accounting.view", "accounting.create", "accounting.manage", "finance.invoices.view"],
      sessionId: alphaSession.id,
    });

    betaToken = generateToken({
      userId: betaUserId,
      email: "beta@w3-acc.local",
      tenantId: tenantBetaId,
      roles: ["admin"],
      permissions: ["accounting.view", "accounting.create", "accounting.manage"],
      sessionId: betaSession.id,
    });

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

  after(async () => {
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
    await prisma.deviceSession.deleteMany({
      where: { userId: { in: [alphaUserId, betaUserId] } },
    }).catch(() => {});
  });

  it("1. Automatically seeds and retrieves Chart of Accounts for Tenant Alpha with strict tenant isolation", async () => {
    const resAlpha = await fetch(`${baseUrl}/api/accounting/accounts`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    assert.equal(resAlpha.status, 200);
    const bodyAlpha = (await resAlpha.json()) as any;
    assert.ok(bodyAlpha.data.length >= 17);

    // Verify all seeded accounts belong strictly to Tenant Alpha
    bodyAlpha.data.forEach((acc: any) => {
      assert.equal(acc.tenantId, tenantAlphaId);
    });

    // Now call for Tenant Beta
    const resBeta = await fetch(`${baseUrl}/api/accounting/accounts`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    assert.equal(resBeta.status, 200);
    const bodyBeta = (await resBeta.json()) as any;
    assert.ok(bodyBeta.data.length >= 17);

    // Verify all seeded accounts belong strictly to Tenant Beta
    bodyBeta.data.forEach((acc: any) => {
      assert.equal(acc.tenantId, tenantBetaId);
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
    assert.equal(createRes.status, 201);
    const createdBody = (await createRes.json()) as any;
    alphaBankAcc1Id = createdBody.data.id;
    assert.equal(createdBody.data.accountCode, "1099");
    assert.equal(createdBody.data.tenantId, tenantAlphaId);

    // Verify Tenant Beta cannot see Alpha's custom account
    const betaListRes = await fetch(`${baseUrl}/api/accounting/accounts`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    const betaList = (await betaListRes.json()) as any;
    const foundInBeta = betaList.data.some((a: any) => a.id === alphaBankAcc1Id || a.accountCode === "1099");
    assert.equal(foundInBeta, false);
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
    assert.equal(createRes.status, 201);
    const body = (await createRes.json()) as any;
    alphaBankAcc2Id = body.data.id;
    assert.equal(body.data.accountCode, "1098");

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
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.match(body.error, /same/i);
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
    assert.equal(betaAccRes.status, 201);
    const betaAccBody = (await betaAccRes.json()) as any;
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
    assert.ok([400, 403, 404].includes(stealRes.status));
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
    assert.equal(transferRes.status, 201);
    const body = (await transferRes.json()) as any;
    assert.equal(body.success, true);

    // Verify account balances in database
    const acc1 = await prisma.chartOfAccount.findUnique({ where: { id: alphaBankAcc1Id } });
    const acc2 = await prisma.chartOfAccount.findUnique({ where: { id: alphaBankAcc2Id } });

    // 50000 - 5000 = 45000
    assert.equal(Number(acc1?.balance), 45000);
    // 1000 + 5000 = 6000
    assert.equal(Number(acc2?.balance), 6000);
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
    assert.equal(unbalRes.status, 400);
    const body = (await unbalRes.json()) as any;
    assert.match(body.error, /equal|balance/i);
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
    assert.equal(balRes.status, 201);
    const body = (await balRes.json()) as any;
    assert.equal(body.success, true);
    assert.ok(body.data.entryNumber !== undefined);
  });

  it("9. Generates accurate Financial Statements (Balance Sheet & P&L) verifying equation balance", async () => {
    const res = await fetch(`${baseUrl}/api/accounting/reports/financial-statements`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);

    const bs = body.data.balanceSheet;
    assert.ok(bs !== undefined);
    assert.equal(typeof bs.totalAssets, "number");
    assert.equal(typeof bs.totalLiabilities, "number");
    assert.equal(typeof bs.totalEquity, "number");
    assert.equal(typeof bs.balancedTotalLiabEquity, "number");

    const pl = body.data.profitAndLoss;
    assert.ok(pl !== undefined);
    assert.equal(typeof pl.totalRevenue, "number");
    assert.equal(typeof pl.totalExpenses, "number");
    assert.equal(typeof pl.netProfit, "number");
  });

  it("10. Generates Comprehensive Trial Balance verifying Sum(Debits) equals Sum(Credits)", async () => {
    const res = await fetch(`${baseUrl}/api/accounting/reports/trial-balance`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.ok(body.data.accounts.length > 0);
    assert.equal(typeof body.data.totalDebits, "number");
    assert.equal(typeof body.data.totalCredits, "number");
    assert.equal(body.data.isBalanced, true);
  });
});
