import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { invoicesRouter } from "../routes/invoices.routes";

describe("W1-C2: Invoice Details Passport & Multi-Tenant Isolation", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w1_c2_tenant_alpha";
  const tenantBetaId = "w1_c2_tenant_beta";

  const alphaUserId = "w1_c2_alpha_user";
  const betaUserId = "w1_c2_beta_user";
  const unprivilegedUserId = "w1_c2_noperm_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@w1c2-invoices.local",
    tenantId: tenantAlphaId,
    roles: ["admin", "hr_admin"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@w1c2-invoices.local",
    tenantId: tenantBetaId,
    roles: ["admin", "hr_admin"],
  });

  const unprivilegedToken = generateToken({
    userId: unprivilegedUserId,
    email: "noperm@w1c2-invoices.local",
    tenantId: tenantAlphaId,
    roles: ["employee"], // regular employee lacking finance.invoices.view
  });

  let alphaInvoiceId: string;
  let betaInvoiceId: string;
  const alphaInvoiceNo = "INV-2026-ALPHA-01";
  const betaInvoiceNo = "INV-2026-BETA-01";

  beforeAll(async () => {
    // 1. Setup tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha Invoice Tenant", slug: "alpha-invoice-tenant" },
      update: { name: "Alpha Invoice Tenant" },
    });

    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta Invoice Tenant", slug: "beta-invoice-tenant" },
      update: { name: "Beta Invoice Tenant" },
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "Alpha Invoice Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "Beta Invoice Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 2. Setup users, profiles, and roles
    for (const u of [
      { id: alphaUserId, email: "alpha@w1c2-invoices.local", tenantId: tenantAlphaId, role: "hr_admin" as const },
      { id: betaUserId, email: "beta@w1c2-invoices.local", tenantId: tenantBetaId, role: "hr_admin" as const },
      { id: unprivilegedUserId, email: "noperm@w1c2-invoices.local", tenantId: tenantAlphaId, role: "employee" as const },
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

    // 3. Clear existing test data
    await prisma.salePayment.deleteMany({
      where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.saleDetail.deleteMany({
      where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.sale.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.product.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.warehouse.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.customer.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });

    // 4. Create customers & warehouses for Alpha & Beta
    const customerAlpha = await prisma.customer.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Alpha Client Corp",
        email: "client@alpha.local",
        phone: "+91 9876543210",
        gstin: "29AAAAA0000A1Z5",
        address: "Alpha High-Tech Campus, BLR",
      },
    });

    const customerBeta = await prisma.customer.create({
      data: {
        tenantId: tenantBetaId,
        name: "Beta Client Ltd",
        email: "client@beta.local",
        phone: "+91 9123456789",
        gstin: "27BBBBB1111B1Z6",
        address: "Beta Tower, BOM",
      },
    });

    const whAlpha = await prisma.warehouse.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Alpha Main Warehouse",
        location: "Bengaluru",
      },
    });

    const whBeta = await prisma.warehouse.create({
      data: {
        tenantId: tenantBetaId,
        name: "Beta Main Warehouse",
        location: "Mumbai",
      },
    });

    // 5. Create products
    const prodAlpha1 = await prisma.product.create({
      data: {
        tenantId: tenantAlphaId,
        name: "UX Strategy Consulting",
        sku: "SKU-UX-A",
        salePrice: 1000,
        purchasePrice: 500,
        isActive: true,
      },
    });

    const prodAlpha2 = await prisma.product.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Design System Architecture",
        sku: "SKU-DS-A",
        salePrice: 4000,
        purchasePrice: 2000,
        isActive: true,
      },
    });

    // 6. Create Alpha Invoice: Subtotal 5000, Tax 250 (5%), Total 5250, Paid 0
    const saleAlpha = await prisma.sale.create({
      data: {
        tenantId: tenantAlphaId,
        invoiceNo: alphaInvoiceNo,
        type: "invoice",
        customerId: customerAlpha.id,
        customerName: customerAlpha.name,
        customerGstin: customerAlpha.gstin,
        warehouseId: whAlpha.id,
        subtotal: 5000,
        discountPct: 0,
        discountAmt: 0,
        taxMode: "sgst_cgst",
        cgst: 125,
        sgst: 125,
        igst: 0,
        totalTax: 250,
        total: 5250,
        paidAmount: 0,
        paymentStatus: "unpaid",
        notes: "Alpha Project Milestone 1",
        date: new Date("2026-09-25T00:00:00Z"),
        dueDate: new Date("2026-10-10T00:00:00Z"),
        details: {
          create: [
            {
              productId: prodAlpha1.id,
              productName: prodAlpha1.name,
              sku: prodAlpha1.sku,
              hsnSac: "998313",
              unit: "Hours",
              price: 1000,
              quantity: 1,
              taxRate: 5,
              taxAmount: 50,
              discount: 0,
              subtotal: 1000,
            },
            {
              productId: prodAlpha2.id,
              productName: prodAlpha2.name,
              sku: prodAlpha2.sku,
              hsnSac: "998314",
              unit: "Hours",
              price: 4000,
              quantity: 1,
              taxRate: 5,
              taxAmount: 200,
              discount: 0,
              subtotal: 4000,
            },
          ],
        },
      },
    });
    alphaInvoiceId = saleAlpha.id;

    // 7. Create Beta Invoice
    const saleBeta = await prisma.sale.create({
      data: {
        tenantId: tenantBetaId,
        invoiceNo: betaInvoiceNo,
        type: "invoice",
        customerId: customerBeta.id,
        customerName: customerBeta.name,
        warehouseId: whBeta.id,
        subtotal: 2000,
        totalTax: 100,
        total: 2100,
        paidAmount: 0,
        paymentStatus: "unpaid",
        date: new Date(),
      },
    });
    betaInvoiceId = saleBeta.id;

    // 8. Spin up Express app
    const app = express();
    app.use(express.json());
    app.use("/api/invoices", invoicesRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean test data
    await prisma.salePayment.deleteMany({
      where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.saleDetail.deleteMany({
      where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.sale.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
  });

  it("1. Rejects unauthenticated request with 401", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}`);
    expect(res.status).toBe(401);
  });

  it("2. Rejects request without finance.invoices.view permission with 403", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}`, {
      headers: { Authorization: `Bearer ${unprivilegedToken}` },
    });
    expect(res.status).toBe(403);
  });

  it("3. Returns 404 for invalid/non-existent invoice ID", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/non-existent-uuid-999`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Invoice not found");
  });

  it("4. Retrieves valid invoice details by UUID for Tenant Alpha with full line items", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.id).toBe(alphaInvoiceId);
    expect(body.invoiceNo).toBe(alphaInvoiceNo);
    expect(body.client).toBe("Alpha Client Corp");
    expect(body.clientGstin).toBe("29AAAAA0000A1Z5");
    expect(body.subtotal).toBe(5000);
    expect(body.totalGst).toBe(250);
    expect(body.cgst).toBe(125);
    expect(body.sgst).toBe(125);
    expect(body.total).toBe(5250);
    expect(body.paidAmount).toBe(0);
    expect(body.remainingBalance).toBe(5250);
    expect(body.status).toBe("sent");
    expect(body.lines).toHaveLength(2);
    const descList = body.lines.map((l: any) => l.description);
    expect(descList).toContain("UX Strategy Consulting");
    expect(descList).toContain("Design System Architecture");
  });

  it("5. Retrieves valid invoice details by invoiceNo (friendly URL slug)", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceNo}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(alphaInvoiceId);
    expect(body.invoiceNo).toBe(alphaInvoiceNo);
  });

  it("6. Multi-Tenant Isolation: Tenant Beta cannot access Tenant Alpha's invoice (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("7. Multi-Tenant Isolation: Tenant Beta cannot access Tenant Alpha's invoice by invoiceNo (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceNo}`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("8. Multi-Tenant Isolation: Tenant Alpha cannot access Tenant Beta's invoice (returns 404)", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${betaInvoiceId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("9. Multi-Tenant Isolation: Tenant Beta cannot post payment to Tenant Alpha's invoice (returns 404/500 NOT_FOUND)", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({
        amount: 1000,
        method: "Bank Transfer",
        referenceNo: "HACK-PAY-01",
      }),
    });
    expect([404, 500]).toContain(res.status);
    const body = await res.json();
    expect(body.error).toMatch(/Invoice not found|NOT_FOUND/);
  });

  it("10. Payment Validation: Rejects invalid or negative amounts with 400", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        amount: -500,
        method: "Bank Transfer",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Payment amount must be greater than 0");
  });

  it("11. Payment Validation: Rejects overpayment exceeding remaining balance", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        amount: 999999, // Exceeds 5250
        method: "Bank Transfer",
      }),
    });
    expect([400, 500]).toContain(res.status);
    const body = await res.json();
    expect(body.error).toContain("OVERPAYMENT");
  });

  it("12. Partial Payment: Records partial payment, updates remaining balance and transitions status to 'partial'", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        amount: 2000,
        method: "Bank Transfer",
        referenceNo: "UTR-ALPHA-PART-01",
        notes: "First installment",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.payment.amount).toBe(2000);
    expect(body.invoice.paidAmount).toBe(2000);
    expect(body.invoice.remainingBalance).toBe(3250);
    expect(body.invoice.paymentStatus).toBe("partial");

    // Verify invoice get returns partial
    const getRes = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const invoice = await getRes.json();
    expect(invoice.paidAmount).toBe(2000);
    expect(invoice.remainingBalance).toBe(3250);
    expect(invoice.status).toBe("partial");
    expect(invoice.payments).toHaveLength(1);
    expect(invoice.payments[0].referenceNo).toBe("UTR-ALPHA-PART-01");
  });

  it("13. Full Payment: Records final payment and transitions status to 'paid'", async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        amount: 3250, // exact remaining balance
        method: "UPI",
        referenceNo: "UPI-ALPHA-FINAL-02",
        notes: "Final settlement",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.invoice.paidAmount).toBe(5250);
    expect(body.invoice.remainingBalance).toBe(0);
    expect(body.invoice.paymentStatus).toBe("paid");

    // Verify invoice get returns paid
    const getRes = await fetch(`${baseUrl}/api/invoices/${alphaInvoiceId}`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const invoice = await getRes.json();
    expect(invoice.status).toBe("paid");
    expect(invoice.remainingBalance).toBe(0);
    expect(invoice.payments).toHaveLength(2);
  });
});
