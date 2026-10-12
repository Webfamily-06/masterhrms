import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { requireAuth } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

import { crmRouter } from "../routes/crm.routes";
import { invoicesRouter } from "../routes/invoices.routes";
import { expensesRouter } from "../routes/expenses.routes";
import { productsRouter } from "../routes/products.routes";
import { helpdeskRouter } from "../routes/helpdesk.routes";
import { assetsRouter } from "../routes/assets.routes";
import { recruitmentRouter } from "../routes/recruitment.routes";
import { settingsRouter } from "../routes/settings.routes";

describe("S7: Verification and Hardening Test Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "s7_test_tenant_alpha";
  const tenantBetaId = "s7_test_tenant_beta";

  const alphaUserId = "s7_test_alpha_user";
  const betaUserId = "s7_test_beta_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@s7-hardening.local",
    tenantId: tenantAlphaId,
    roles: ["admin", "hr_admin", "Workspace Admin"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@s7-hardening.local",
    tenantId: tenantBetaId,
    roles: ["admin", "hr_admin", "Workspace Admin"],
  });

  let testEmployeeId: string;

  beforeAll(async () => {
    // 1. Setup Tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "S7 Alpha Tenant", slug: "s7-alpha-tenant" },
      update: { name: "S7 Alpha Tenant" },
    });
    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "S7 Beta Tenant", slug: "s7-beta-tenant" },
      update: { name: "S7 Beta Tenant" },
    });

    // 2. Enable Modules
    const modulesToEnable = [
      "crm",
      "finance",
      "invoices",
      "expenses",
      "products",
      "pos",
      "product_pos",
      "helpdesk",
      "assets",
      "asset-management",
      "recruitment",
    ];

    for (const mod of modulesToEnable) {
      await prisma.tenantModule.upsert({
        where: { tenantId_moduleKey: { tenantId: tenantAlphaId, moduleKey: mod } },
        create: { tenantId: tenantAlphaId, moduleKey: mod, isEnabled: true },
        update: { isEnabled: true },
      });
      await prisma.tenantModule.upsert({
        where: { tenantId_moduleKey: { tenantId: tenantBetaId, moduleKey: mod } },
        create: { tenantId: tenantBetaId, moduleKey: mod, isEnabled: true },
        update: { isEnabled: true },
      });
    }

    // 3. Register Connection Manager
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "S7 Alpha Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "S7 Beta Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 4. Setup Users, Profiles & Roles
    await prisma.user.upsert({
      where: { id: alphaUserId },
      create: { id: alphaUserId, email: "alpha@s7-hardening.local", passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: alphaUserId },
      create: { userId: alphaUserId, email: "alpha@s7-hardening.local", fullName: "Alpha S7 Admin", tenantId: tenantAlphaId },
      update: { tenantId: tenantAlphaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: alphaUserId } });
    await prisma.userRole.create({
      data: { userId: alphaUserId, role: "hr_admin", tenantId: tenantAlphaId },
    });

    await prisma.user.upsert({
      where: { id: betaUserId },
      create: { id: betaUserId, email: "beta@s7-hardening.local", passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: betaUserId },
      create: { userId: betaUserId, email: "beta@s7-hardening.local", fullName: "Beta S7 Admin", tenantId: tenantBetaId },
      update: { tenantId: tenantBetaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: betaUserId } });
    await prisma.userRole.create({
      data: { userId: betaUserId, role: "hr_admin", tenantId: tenantBetaId },
    });

    // 5. Seed test employee for Alpha
    const emp = await prisma.employee.create({
      data: {
        tenantId: tenantAlphaId,
        employeeCode: "EMP-S7-001",
        firstName: "Hardened",
        lastName: "Staff",
        email: "staff@s7-alpha.local",
        status: "active",
      },
    });
    testEmployeeId = emp.id;

    // 6. Mount Express application
    const app = express();
    app.use(express.json());
    app.use(async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        return requireAuth(req as any, res, () => {
          return resolveTenantContext(req as any, res, next);
        });
      }
      next();
    });

    app.use("/api/crm", crmRouter);
    app.use("/api/invoices", invoicesRouter);
    app.use("/api/expenses", expensesRouter);
    app.use("/api/products", productsRouter);
    app.use("/api/helpdesk", helpdeskRouter);
    app.use("/api/addons/assets", assetsRouter);
    app.use("/api/recruitment", recruitmentRouter);
    app.use("/api/settings", settingsRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
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
    // Clean up test tenants
    try {
      await prisma.productWarehouse.deleteMany({ where: { product: { tenantId: tenantAlphaId } } });
      await prisma.product.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.productCategory.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.unit.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.warehouse.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.asset.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.assetCategory.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.saleDetail.deleteMany({ where: { sale: { tenantId: tenantAlphaId } } });
      await prisma.salePayment.deleteMany({ where: { sale: { tenantId: tenantAlphaId } } });
      await prisma.sale.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.jobCandidate.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.jobPosting.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.employee.deleteMany({ where: { tenantId: tenantAlphaId } });
      await prisma.userRole.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.profile.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [alphaUserId, betaUserId] } } });
      await prisma.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });
    } catch (_) {}
  });

  // ==========================================
  // 1. Cross-Tenant Authorization & IDOR Hardening
  // ==========================================
  describe("1. Cross-Tenant Authorization & IDOR Defense", () => {
    let alphaAssetCatId: string;
    let alphaProductCatId: string;
    let alphaUnitId: string;
    let alphaWarehouseId: string;

    beforeAll(async () => {
      // Create Alpha asset category
      const assetCat = await prisma.assetCategory.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Alpha Secure Laptops",
          slug: "alpha-secure-laptops",
          prefix: "ASL",
        },
      });
      alphaAssetCatId = assetCat.id;

      // Create Alpha product category
      const prodCat = await prisma.productCategory.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Alpha Enterprise Hardware",
        },
      });
      alphaProductCatId = prodCat.id;

      // Create Alpha unit
      const unit = await prisma.unit.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Kilogram-Alpha",
          shortName: "KGA",
        },
      });
      alphaUnitId = unit.id;

      // Create Alpha warehouse
      const wh = await prisma.warehouse.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Alpha High-Security Hub",
          isDefault: false,
        },
      });
      alphaWarehouseId = wh.id;
    });

    it("1.1 Rejects cross-tenant deletion and modification of Asset Category", async () => {
      // Beta cannot DELETE Alpha's asset category (must 404)
      const delRes = await fetch(`${baseUrl}/api/addons/assets/categories/${alphaAssetCatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(delRes.status).toBe(404);

      // Beta cannot PUT Alpha's asset category (must 404)
      const putRes = await fetch(`${baseUrl}/api/addons/assets/categories/${alphaAssetCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${betaToken}` },
        body: JSON.stringify({ name: "Malicious Rename" }),
      });
      expect(putRes.status).toBe(404);
    });

    it("1.2 Rejects cross-tenant deletion and modification of Product Category", async () => {
      // Beta cannot DELETE Alpha's product category (must 404)
      const delRes = await fetch(`${baseUrl}/api/products/categories/${alphaProductCatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(delRes.status).toBe(404);

      // Beta cannot PUT Alpha's product category (must 404)
      const putRes = await fetch(`${baseUrl}/api/products/categories/${alphaProductCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${betaToken}` },
        body: JSON.stringify({ name: "Malicious Category" }),
      });
      expect(putRes.status).toBe(404);
    });

    it("1.3 Rejects cross-tenant deletion and modification of Unit", async () => {
      // Beta cannot DELETE Alpha's unit (must 404)
      const delRes = await fetch(`${baseUrl}/api/products/units/${alphaUnitId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(delRes.status).toBe(404);

      // Beta cannot PUT Alpha's unit (must 404)
      const putRes = await fetch(`${baseUrl}/api/products/units/${alphaUnitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${betaToken}` },
        body: JSON.stringify({ name: "Malicious Unit" }),
      });
      expect(putRes.status).toBe(404);
    });

    it("1.4 Rejects cross-tenant deletion and modification of Warehouse", async () => {
      // Beta cannot DELETE Alpha's warehouse (must 404)
      const delRes = await fetch(`${baseUrl}/api/products/warehouses/${alphaWarehouseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(delRes.status).toBe(404);

      // Beta cannot PUT Alpha's warehouse (must 404)
      const putRes = await fetch(`${baseUrl}/api/products/warehouses/${alphaWarehouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${betaToken}` },
        body: JSON.stringify({ name: "Malicious Warehouse" }),
      });
      expect(putRes.status).toBe(404);
    });
  });

  // ==========================================
  // 2. Data Integrity & Constraint Hardening
  // ==========================================
  describe("2. Data Integrity & Business Constraint Hardening", () => {
    it("2.1 Blocks deletion of Asset Category when associated assets exist", async () => {
      const cat = await prisma.assetCategory.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Monitored Laptops",
          slug: "monitored-laptops",
          prefix: "MLP",
        },
      });

      const asset = await prisma.asset.create({
        data: {
          tenantId: tenantAlphaId,
          categoryId: cat.id,
          name: "MacBook Pro M3",
          assetTag: "MLP-001",
        },
      });

      // Try deleting category while asset is attached -> 400 Bad Request
      const delRes = await fetch(`${baseUrl}/api/addons/assets/categories/${cat.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delRes.status).toBe(400);
      const err = await delRes.json();
      expect(err.error).toContain("associated assets");

      // Cleanup asset then verify category deletion succeeds
      await prisma.asset.delete({ where: { id: asset.id } });
      const delOk = await fetch(`${baseUrl}/api/addons/assets/categories/${cat.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delOk.status).toBe(200);
    });

    it("2.2 Blocks deletion of Product Category when associated products exist", async () => {
      const cat = await prisma.productCategory.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Electronics Active",
        },
      });

      const prod = await prisma.product.create({
        data: {
          tenantId: tenantAlphaId,
          categoryId: cat.id,
          name: "Precision Soldering Station",
          sku: "PSS-001",
        },
      });

      // Try deleting category while product is attached -> 400 Bad Request
      const delRes = await fetch(`${baseUrl}/api/products/categories/${cat.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delRes.status).toBe(400);
      const err = await delRes.json();
      expect(err.error).toContain("associated products");

      // Cleanup product then verify category deletion succeeds
      await prisma.product.delete({ where: { id: prod.id } });
      const delOk = await fetch(`${baseUrl}/api/products/categories/${cat.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delOk.status).toBe(200);
    });

    it("2.3 Blocks deletion of Unit when associated products exist", async () => {
      const unit = await prisma.unit.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Drum Container",
          shortName: "DRM",
        },
      });

      const prod = await prisma.product.create({
        data: {
          tenantId: tenantAlphaId,
          unitId: unit.id,
          name: "Coolant Liquid Drum",
          sku: "CLD-001",
        },
      });

      // Try deleting unit while product is attached -> 400 Bad Request
      const delRes = await fetch(`${baseUrl}/api/products/units/${unit.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delRes.status).toBe(400);
      const err = await delRes.json();
      expect(err.error).toContain("associated products");

      // Cleanup product then verify unit deletion succeeds
      await prisma.product.delete({ where: { id: prod.id } });
      const delOk = await fetch(`${baseUrl}/api/products/units/${unit.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delOk.status).toBe(200);
    });

    it("2.4 Blocks deletion of default warehouse and warehouse with positive inventory", async () => {
      // Default warehouse check
      const defaultWh = await prisma.warehouse.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Central Default Hub",
          isDefault: true,
        },
      });
      const delDefRes = await fetch(`${baseUrl}/api/products/warehouses/${defaultWh.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delDefRes.status).toBe(400);
      const defErr = await delDefRes.json();
      expect(defErr.error).toContain("default warehouse");

      // Positive stock check
      const whWithStock = await prisma.warehouse.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Transit Storage Yard",
          isDefault: false,
        },
      });
      const prod = await prisma.product.create({
        data: {
          tenantId: tenantAlphaId,
          name: "Steel Rods",
          sku: "SR-001",
        },
      });
      await prisma.productWarehouse.create({
        data: {
          productId: prod.id,
          warehouseId: whWithStock.id,
          quantity: 25,
        },
      });

      const delStockRes = await fetch(`${baseUrl}/api/products/warehouses/${whWithStock.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delStockRes.status).toBe(400);
      const stockErr = await delStockRes.json();
      expect(stockErr.error).toContain("positive stock inventory");

      // Cleanup
      await prisma.productWarehouse.deleteMany({ where: { warehouseId: whWithStock.id } });
      await prisma.product.delete({ where: { id: prod.id } });
      await prisma.warehouse.delete({ where: { id: whWithStock.id } });
      await prisma.warehouse.delete({ where: { id: defaultWh.id } });
    });

    it("2.5 Blocks voiding and deletion of invoices with recorded payments", async () => {
      // Create invoice
      const sale = await prisma.sale.create({
        data: {
          tenantId: tenantAlphaId,
          invoiceNo: "INV-HARD-001",
          customerName: "Settled Enterprise Corp",
          date: new Date(),
          subtotal: 10000,
          total: 11800,
          paidAmount: 5000,
          paymentStatus: "partial",
        },
      });

      await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          amount: 5000,
          method: "bank_transfer",
          referenceNo: "TXN-BANK-001",
        },
      });

      // Void attempt -> 400 Bad Request
      const voidRes = await fetch(`${baseUrl}/api/invoices/${sale.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ reason: "Cannot void settled invoice" }),
      });
      expect(voidRes.status).toBe(400);
      const voidErr = await voidRes.json();
      expect(voidErr.error).toContain("Cannot void an invoice with recorded payments");

      // Delete attempt -> 400 Bad Request
      const delRes = await fetch(`${baseUrl}/api/invoices/${sale.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delRes.status).toBe(400);
      const delErr = await delRes.json();
      expect(delErr.error).toContain("Cannot delete an invoice with recorded payments");

      // Cleanup
      await prisma.salePayment.deleteMany({ where: { saleId: sale.id } });
      await prisma.sale.delete({ where: { id: sale.id } });
    });
  });

  // ==========================================
  // 3. Platform Scope Protection & Dual Razorpay Hardening
  // ==========================================
  describe("3. Scope RBAC & Architectural Guarantees", () => {
    it("3.1 Rejects Tenant Admin attempts to manipulate PLATFORM settings", async () => {
      const res = await fetch(`${baseUrl}/api/settings/platform/general`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ platformName: "Hacked Platform Name" }),
      });
      expect(res.status).toBe(403);
    });

    it("3.2 Verifies audit logs record deletions and redact sensitive credentials", async () => {
      const audits = await prisma.auditLog.findMany({
        where: { tenantId: tenantAlphaId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      expect(audits.length).toBeGreaterThan(0);
      for (const log of audits) {
        expect(log.actorEmail).toBeDefined();
        // Zero secret leak guarantee
        const logStr = JSON.stringify(log);
        expect(logStr).not.toContain("passwordHash");
        expect(logStr).not.toContain("clientSecret");
        expect(logStr).not.toContain("webhookSecret");
      }
    });
  });
});
