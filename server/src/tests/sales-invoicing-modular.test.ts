import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { invoicesRouter } from "../routes/invoices.routes";

describe("Tier 3 (P1) Group 3.2: Sales Invoicing & GST Modular Isolation", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w3_inv_tenant_alpha";
  const tenantBetaId = "w3_inv_tenant_beta";

  const alphaUserId = "w3_inv_alpha_user";
  const betaUserId = "w3_inv_beta_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@w3-inv.local",
    tenantId: tenantAlphaId,
    roles: ["admin"],
    permissions: ["finance.invoices.view", "finance.invoices.create", "finance.invoices.edit"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@w3-inv.local",
    tenantId: tenantBetaId,
    roles: ["admin"],
    permissions: ["finance.invoices.view", "finance.invoices.create"],
  });

  let intraStateInvoiceId: string;
  let interStateInvoiceId: string;

  beforeAll(async () => {
    // 1. Setup tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha Enterprise SaaS", slug: "alpha-inv-saas" },
      update: { name: "Alpha Enterprise SaaS" },
    });
    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta Enterprise SaaS", slug: "beta-inv-saas" },
      update: { name: "Beta Enterprise SaaS" },
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "Alpha Enterprise SaaS",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "Beta Enterprise SaaS",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 2. Setup users & roles
    for (const u of [
      { id: alphaUserId, email: "alpha@w3-inv.local", tenantId: tenantAlphaId, role: "hr_admin" as const },
      { id: betaUserId, email: "beta@w3-inv.local", tenantId: tenantBetaId, role: "hr_admin" as const },
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

    // Clean prior sales data
    const existingSales = await prisma.sale.findMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      select: { id: true },
    });
    const saleIds = existingSales.map((s) => s.id);
    if (saleIds.length > 0) {
      await prisma.saleDetail.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.salePayment.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
    }

    // Start Express app with invoicesRouter
    const app = express();
    app.use(express.json());
    app.use("/api/invoices", invoicesRouter);

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
    const existingSales = await prisma.sale.findMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      select: { id: true },
    });
    const saleIds = existingSales.map((s) => s.id);
    if (saleIds.length > 0) {
      await prisma.saleDetail.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.salePayment.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
    }
  });

  it("1. Creates an Intra-State sales invoice with CGST + SGST split and relational line items", async () => {
    const res = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        client: "Bangalore Digital Works Pvt Ltd",
        client_gstin: "29ABCDE1234F1Z5", // State 29 (Karnataka)
        customerState: "29",
        companyState: "29",
        date: "2026-09-30",
        dueDate: "2026-10-30",
        lines: [
          {
            name: "Cloud Server Hosting & Maintenance",
            hsn_sac: "998313",
            qty: 2,
            rate: 10000,
            gst_rate: 18,
          },
          {
            name: "Database Security Audit",
            hsn_sac: "998314",
            qty: 1,
            rate: 20000,
            gst_rate: 18,
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    intraStateInvoiceId = body.id;

    expect(body.id).toBeDefined();
    expect(body.number).toMatch(/^INV-/);
    expect(body.tax_mode).toBe("sgst_cgst");

    // Subtotal: 2 * 10000 + 1 * 20000 = 40000
    expect(body.subtotal).toBe(40000);

    // Total tax at 18%: 40000 * 0.18 = 7200
    // CGST: 3600, SGST: 3600, IGST: 0
    expect(body.total_gst).toBe(7200);
    expect(body.cgst).toBe(3600);
    expect(body.sgst).toBe(3600);
    expect(body.igst).toBe(0);
    expect(body.total).toBe(47200);

    // Verify lines in response
    expect(body.lines).toHaveLength(2);
    expect(body.lines[0].description).toBe("Cloud Server Hosting & Maintenance");
    expect(body.lines[0].rate).toBe(10000);
    expect(body.lines[0].qty).toBe(2);

    // Verify lines persisted to MySQL database
    const dbDetails = await prisma.saleDetail.findMany({
      where: { saleId: intraStateInvoiceId },
      orderBy: { price: "asc" },
    });
    expect(dbDetails).toHaveLength(2);
    expect(dbDetails[0].productName).toBe("Cloud Server Hosting & Maintenance");
    expect(Number(dbDetails[0].price)).toBe(10000);
    expect(dbDetails[0].quantity).toBe(2);
    expect(dbDetails[1].productName).toBe("Database Security Audit");
    expect(Number(dbDetails[1].price)).toBe(20000);
  });

  it("2. Creates an Inter-State sales invoice with 100% IGST applied", async () => {
    const res = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        client: "Mumbai Enterprise Logistics",
        client_gstin: "27AABCM5678K1Z2", // State 27 (Maharashtra)
        customerState: "27",
        companyState: "29", // Company in Karnataka (29)
        date: "2026-09-30",
        dueDate: "2026-10-30",
        lines: [
          {
            name: "Enterprise ERP Annual License",
            hsn_sac: "997331",
            qty: 1,
            rate: 50000,
            gst_rate: 18,
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    interStateInvoiceId = body.id;

    expect(body.tax_mode).toBe("igst");
    expect(body.subtotal).toBe(50000);
    // IGST: 50000 * 0.18 = 9000
    expect(body.igst).toBe(9000);
    expect(body.cgst).toBe(0);
    expect(body.sgst).toBe(0);
    expect(body.total_gst).toBe(9000);
    expect(body.total).toBe(59000);
  });

  it("3. Retrieves invoice details for printing with all persisted line items and customer information", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${intraStateInvoiceId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.id).toBe(intraStateInvoiceId);
    expect(body.client).toBe("Bangalore Digital Works Pvt Ltd");
    expect(body.client_gstin).toBe("29ABCDE1234F1Z5");
    expect(body.lines).toHaveLength(2);
    expect(body.subtotal).toBe(40000);
    expect(body.cgst).toBe(3600);
    expect(body.sgst).toBe(3600);
    expect(body.total).toBe(47200);
  });

  it("4. Enforces strict Multi-Tenant Isolation: Tenant Beta cannot access Tenant Alpha's invoice for viewing or printing", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${intraStateInvoiceId}`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("5. Tenant Beta creates their own isolated invoice without cross-tenant interference", async () => {
    const betaCreateRes = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({
        client: "Beta Isolated Client Ltd",
        client_gstin: "33AABCT9999M1Z0",
        date: "2026-09-30",
        lines: [
          {
            name: "Beta Specialized Software",
            qty: 1,
            rate: 15000,
            gst_rate: 18,
          },
        ],
      }),
    });
    expect(betaCreateRes.status).toBe(201);
    const betaBody = await betaCreateRes.json();
    const betaInvoiceId = betaBody.id;

    // Tenant Alpha cannot access Beta's invoice
    const alphaAccessRes = await fetch(`${baseUrl}/api/invoices/${betaInvoiceId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(alphaAccessRes.status).toBe(404);

    // Tenant Beta can access their own invoice
    const betaAccessRes = await fetch(`${baseUrl}/api/invoices/${betaInvoiceId}`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(betaAccessRes.status).toBe(200);
    const betaData = await betaAccessRes.json();
    expect(betaData.client).toBe("Beta Isolated Client Ltd");
    expect(betaData.lines).toHaveLength(1);
  });
});
