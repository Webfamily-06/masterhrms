import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { purchasesRouter } from "../routes/purchases.routes";
import { projectsRouter } from "../routes/projects.routes";
import { getModelClassification, DIRECT_TENANT_MODELS } from "../config/tenant-models.config";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runStep40ReadinessTests() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 4 · STEP 4.0: CODEBASE CLEANUP & READINESS TEST SUITE");
  console.log("Testing: PurchasePayment Tenant Classification, Isolation, and Project Invoicing");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/projects", projectsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const tenantAlpha = `s40_alpha_${Date.now()}`;
  const tenantBeta = `s40_beta_${Date.now()}`;
  const userAlpha = `usr_s40_a_${Date.now()}`;
  const userBeta = `usr_s40_b_${Date.now()}`;

  const tokenAlpha = generateToken({
    userId: userAlpha,
    email: "controller@alpha.com",
    roles: ["admin"],
    tenantId: tenantAlpha,
  });

  const tokenBeta = generateToken({
    userId: userBeta,
    email: "controller@beta.com",
    roles: ["admin"],
    tenantId: tenantBeta,
  });

  let purchaseAlpha: any;
  let projectAlpha: any;
  let paymentAlphaId: string;

  try {
    // --------------------------------------------------------------------------
    // Test 1: PurchasePayment Model Classification in Config
    // --------------------------------------------------------------------------
    console.log("▶ [Test 1] Verifying PurchasePayment model registration in tenant-models.config.ts...");
    const isDirectTenant = DIRECT_TENANT_MODELS.has("PurchasePayment");
    const classification = getModelClassification("PurchasePayment");

    if (!isDirectTenant || classification !== "DIRECT_TENANT") {
      throw new Error(`Expected PurchasePayment to be DIRECT_TENANT, but got ${classification}`);
    }
    console.log("  -> PASS: PurchasePayment is confirmed registered as DIRECT_TENANT.\n");

    // --------------------------------------------------------------------------
    // Provision Tenants and Fixtures
    // --------------------------------------------------------------------------
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlpha, slug: tenantAlpha, name: "Alpha Step 4.0 Corp" },
        { id: tenantBeta, slug: tenantBeta, name: "Beta Step 4.0 Corp" },
      ],
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlpha,
      name: "Alpha Step 4.0 Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBeta,
      name: "Beta Step 4.0 Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    const emailAlpha = `controller_${Date.now()}@alpha.com`;
    const emailBeta = `controller_${Date.now()}@beta.com`;

    await prisma.user.createMany({
      data: [
        { id: userAlpha, email: emailAlpha, passwordHash: "dummy" },
        { id: userBeta, email: emailBeta, passwordHash: "dummy" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: userAlpha, email: emailAlpha, fullName: "Alpha Controller", tenantId: tenantAlpha },
        { userId: userBeta, email: emailBeta, fullName: "Beta Controller", tenantId: tenantBeta },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: userAlpha, role: "hr_admin", tenantId: tenantAlpha },
        { userId: userBeta, role: "hr_admin", tenantId: tenantBeta },
      ],
    });

    const supplierAlpha = await prisma.supplier.create({
      data: { tenantId: tenantAlpha, name: "Global Components Ltd" },
    });

    const warehouseAlpha = await prisma.warehouse.create({
      data: { tenantId: tenantAlpha, name: "Central Tech Hub", location: "Dock 1" },
    });

    const productAlpha = await prisma.product.create({
      data: {
        tenantId: tenantAlpha,
        name: "Microprocessor Unit X1",
        sku: `MCU-X1-${Date.now()}`,
        purchasePrice: 100,
        salePrice: 150,
      },
    });

    purchaseAlpha = await prisma.purchase.create({
      data: {
        tenantId: tenantAlpha,
        purchaseNo: `PO-${Date.now()}`,
        supplierId: supplierAlpha.id,
        warehouseId: warehouseAlpha.id,
        total: 1000,
        status: "received",
        paymentStatus: "unpaid",
        paidAmount: 0,
        details: {
          create: [
            {
              productId: productAlpha.id,
              productName: productAlpha.name,
              quantity: 10,
              cost: 100,
              subtotal: 1000,
            },
          ],
        },
      },
    });

    // --------------------------------------------------------------------------
    // Test 2: PurchasePayment Recording & Tenant Isolation
    // --------------------------------------------------------------------------
    console.log("▶ [Test 2] Recording PurchasePayment under Tenant Alpha...");
    const payRes = await fetch(`${baseUrl}/api/purchases/${purchaseAlpha.id}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAlpha}`,
      },
      body: JSON.stringify({
        amount: 400,
        method: "Bank Transfer",
        idempotencyKey: `pay-s40-${Date.now()}`,
        referenceNo: "REF-S40-001",
      }),
    });

    if (payRes.status !== 201) {
      const err = await payRes.text();
      throw new Error(`Failed to record purchase payment: ${payRes.status} ${err}`);
    }
    const payData = await payRes.json();
    paymentAlphaId = payData.data.payment.id;
    console.log(`  -> PASS: Payment ${paymentAlphaId} recorded for purchase ${purchaseAlpha.id}.`);

    // Verify direct tenantId column persistence in DB
    const dbPayment = await prisma.purchasePayment.findUnique({
      where: { id: paymentAlphaId },
    });
    if (!dbPayment || dbPayment.tenantId !== tenantAlpha) {
      throw new Error(`DB PurchasePayment has invalid tenantId: ${dbPayment?.tenantId}`);
    }
    console.log("  -> PASS: Database verification confirms tenantId isolation on PurchasePayment.\n");

    // --------------------------------------------------------------------------
    // Test 3: Cross-Tenant Access to Purchase Payments Strictly Blocked
    // --------------------------------------------------------------------------
    console.log("▶ [Test 3] Verifying Tenant Beta CANNOT access Tenant Alpha's Purchase Payments...");
    const crossFetchRes = await fetch(`${baseUrl}/api/purchases/${purchaseAlpha.id}/payments`, {
      headers: { Authorization: `Bearer ${tokenBeta}` },
    });

    if (crossFetchRes.status !== 404) {
      throw new Error(`Expected cross-tenant payments fetch to return 404, got ${crossFetchRes.status}`);
    }

    const crossPayRes = await fetch(`${baseUrl}/api/purchases/${purchaseAlpha.id}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenBeta}`,
      },
      body: JSON.stringify({
        amount: 200,
        method: "Cash",
      }),
    });

    if (crossPayRes.status !== 404) {
      throw new Error(`Expected cross-tenant payment POST to return 404, got ${crossPayRes.status}`);
    }
    console.log("  -> PASS: Cross-tenant reads and mutations rejected with 404 Not Found.\n");

    // --------------------------------------------------------------------------
    // Test 4: Project Timesheet Invoicing (Testing Fix in projects.routes.ts)
    // --------------------------------------------------------------------------
    console.log("▶ [Test 4] Verifying Project Invoice Generation (Step 4.0 fix in projects.routes.ts)...");
    projectAlpha = await prisma.project.create({
      data: {
        tenantId: tenantAlpha,
        name: "Enterprise Architecture Upgrade",
        clientName: "Acme Industrial Corp",
        budget: 50000,
        status: "in_progress",
        tasks: {
          create: [
            { tenantId: tenantAlpha, title: "Database Cleanup & Tenant Indexing", status: "done" },
            { tenantId: tenantAlpha, title: "TypeScript Interface Verification", status: "done" },
          ],
        },
      },
    });

    const invRes = await fetch(`${baseUrl}/api/projects/${projectAlpha.id}/generate-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAlpha}`,
      },
      body: JSON.stringify({
        customHours: 16,
        hourlyRate: 150,
        taxPercent: 18,
        dueDateDays: 14,
        notes: "Milestone 1 Completion",
      }),
    });

    if (invRes.status !== 201) {
      const err = await invRes.text();
      throw new Error(`Failed to generate project invoice: ${invRes.status} ${err}`);
    }

    const invData = await invRes.json();
    console.log(`  -> PASS: Invoice ${invData.invoice.invoiceNo} successfully generated!`);
    console.log(`  -> Details: Subtotal $${invData.invoice.subtotal}, Tax $${invData.invoice.tax}, Total $${invData.invoice.total}, Status: ${invData.invoice.status}\n`);

    // Verify persisted invoice in database
    const dbInvoice = await prisma.sale.findUnique({
      where: { id: invData.invoice.id },
      include: { details: true },
    });

    if (!dbInvoice || dbInvoice.details.length === 0) {
      throw new Error("Persisted project invoice or details missing in database");
    }
    if (dbInvoice.tenantId !== tenantAlpha) {
      throw new Error(`Project invoice tenantId mismatch: expected ${tenantAlpha}, got ${dbInvoice.tenantId}`);
    }
    console.log("  -> PASS: Sale and SaleDetail persisted cleanly with service product and tenant isolation.\n");

    console.log("================================================================================");
    console.log("🏆 ALL STEP 4.0 CODEBASE READINESS ASSERTIONS PASSED PERFECTLY!");
    console.log("================================================================================");
  } catch (err: any) {
    console.error("❌ STEP 4.0 TEST FAILURE:", err);
    process.exit(1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      await prisma.purchasePayment.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.saleDetail.deleteMany({ where: { sale: { tenantId: { in: [tenantAlpha, tenantBeta] } } } });
      await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.purchaseDetail.deleteMany({ where: { purchase: { tenantId: { in: [tenantAlpha, tenantBeta] } } } });
      await prisma.purchase.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.projectTask.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.warehouse.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.supplier.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.userRole.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.profile.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userAlpha, userBeta] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlpha, tenantBeta] } } });
    } catch {}
  }
}

runStep40ReadinessTests();
