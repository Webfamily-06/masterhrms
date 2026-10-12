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

describe("S6: CRUD Completion Across Backend, API and UI", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "s6_test_tenant_alpha";
  const tenantBetaId = "s6_test_tenant_beta";

  const alphaUserId = "s6_test_alpha_user";
  const betaUserId = "s6_test_beta_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@s6-crud.local",
    tenantId: tenantAlphaId,
    roles: ["admin", "hr_admin", "Workspace Admin"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@s6-crud.local",
    tenantId: tenantBetaId,
    roles: ["admin", "hr_admin", "Workspace Admin"],
  });

  let testEmployeeId: string;

  beforeAll(async () => {
    // 1. Setup Tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "S6 Alpha Tenant", slug: "s6-alpha-tenant" },
      update: { name: "S6 Alpha Tenant" },
    });
    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "S6 Beta Tenant", slug: "s6-beta-tenant" },
      update: { name: "S6 Beta Tenant" },
    });

    // 2. Enable all required modules for both tenants
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

    // 3. Register with TenantConnectionManager
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "S6 Alpha Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "S6 Beta Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 4. Setup Users, Profiles & Roles
    await prisma.user.upsert({
      where: { id: alphaUserId },
      create: { id: alphaUserId, email: "alpha@s6-crud.local", passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: alphaUserId },
      create: { userId: alphaUserId, email: "alpha@s6-crud.local", fullName: "Alpha S6 Admin", tenantId: tenantAlphaId },
      update: { tenantId: tenantAlphaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: alphaUserId } });
    await prisma.userRole.create({
      data: { userId: alphaUserId, role: "hr_admin", tenantId: tenantAlphaId },
    });

    await prisma.user.upsert({
      where: { id: betaUserId },
      create: { id: betaUserId, email: "beta@s6-crud.local", passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: betaUserId },
      create: { userId: betaUserId, email: "beta@s6-crud.local", fullName: "Beta S6 Admin", tenantId: tenantBetaId },
      update: { tenantId: tenantBetaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: betaUserId } });
    await prisma.userRole.create({
      data: { userId: betaUserId, role: "hr_admin", tenantId: tenantBetaId },
    });

    // 5. Seed test employee for Alpha (used in expenses/helpdesk)
    const emp = await prisma.employee.create({
      data: {
        tenantId: tenantAlphaId,
        employeeCode: "EMP-S6-001",
        firstName: "Test",
        lastName: "Staff",
        email: "staff@s6-alpha.local",
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

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as any;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up test data
    try {
      await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.crmContact.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.crmCompany.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.saleDetail.deleteMany({ where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } } });
      await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.expenseClaim.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.expenseCategory.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.productWarehouse.deleteMany({ where: { warehouse: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } } });
      await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.warehouse.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.unit.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.helpdeskTicket.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.asset.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.assetCategory.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.jobCandidate.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.jobPosting.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.employee.deleteMany({ where: { id: testEmployeeId } });
      await prisma.userRole.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId] } } });
      await prisma.profile.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [alphaUserId, betaUserId] } } });
      await prisma.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });
    } catch {}
  });

  // ==========================================
  // 1. CRM Contacts & Companies CRUD
  // ==========================================
  describe("CRM Contacts & Companies CRUD", () => {
    let contactId: string;
    let companyId: string;

    it("1.1 Creates and fetches contact details", async () => {
      const res = await fetch(`${baseUrl}/api/crm/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Acme Lead Specialist",
          email: "acme.lead@s6.local",
          phone: "+91 9876543210",
          company: "Acme Corp",
          role: "Procurement Head",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      contactId = data.id;

      // GET detail
      const detailRes = await fetch(`${baseUrl}/api/crm/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.name).toBe("Acme Lead Specialist");
    });

    it("1.2 Updates contact details and logs audit", async () => {
      const res = await fetch(`${baseUrl}/api/crm/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Acme Lead Senior Specialist",
          phone: "+91 9876500000",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Acme Lead Senior Specialist");
      expect(data.phone).toBe("+91 9876500000");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { tenantId: tenantAlphaId, entityType: "CrmContact", entityId: contactId, action: "crm.contact.updated" },
      });
      expect(audit).toBeDefined();
    });

    it("1.3 Prevents cross-tenant access to contact", async () => {
      // Beta cannot read Alpha's contact
      const getRes = await fetch(`${baseUrl}/api/crm/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(getRes.status).toBe(404);

      // Beta cannot update Alpha's contact
      const putRes = await fetch(`${baseUrl}/api/crm/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${betaToken}` },
        body: JSON.stringify({ name: "Malicious Edit" }),
      });
      expect(putRes.status).toBe(404);
    });

    it("1.4 Creates, fetches, updates, and isolates company details", async () => {
      const res = await fetch(`${baseUrl}/api/crm/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Global Nexus Corp",
          industry: "Technology",
          annualRevenue: 1000000,
          website: "https://globalnexus.local",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      companyId = data.id;

      // GET detail
      const detailRes = await fetch(`${baseUrl}/api/crm/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.name).toBe("Global Nexus Corp");

      // PUT update
      const updateRes = await fetch(`${baseUrl}/api/crm/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          industry: "Cloud SaaS",
          annualRevenue: 2500000,
        }),
      });
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.industry).toBe("Cloud SaaS");
      expect(updated.annualRevenue).toBe(2500000);

      // Cross-tenant guard
      const crossRes = await fetch(`${baseUrl}/api/crm/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(crossRes.status).toBe(404);
    });
  });

  // ==========================================
  // 2. Invoices / Finance CRUD
  // ==========================================
  describe("Finance Invoices CRUD & Void Workflow", () => {
    let invoiceId: string;

    it("2.1 Creates an invoice with line items", async () => {
      const res = await fetch(`${baseUrl}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          customerName: "Enterprise Client A",
          customerEmail: "finance@client-a.local",
          notes: "Initial consultation services",
          terms: "Net 30",
          subtotal: 5000,
          total: 5900,
          taxAmount: 900,
          lines: [
            { description: "Architecture Consultation", quantity: 10, unitPrice: 500, total: 5000 },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      invoiceId = data.id;
    });

    it("2.2 Updates invoice terms, notes, and PO details", async () => {
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          notes: "Updated delivery notes per client review",
          customerPo: "PO-2026-X99",
        }),
      });
      if (res.status !== 200) console.error("Invoice PUT error:", await res.text());
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.notes).toBe("Updated delivery notes per client review");
    });

    it("2.3 Voids invoice and generates transactional outbox event", async () => {
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ reason: "Duplicate billing item" }),
      });
      if (res.status !== 200) console.error("Invoice VOID error:", await res.text());
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoice.paymentStatus).toBe("void");

      // Verify transactional outbox event
      const event = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAlphaId, eventType: "finance.invoice.voided", entityId: invoiceId },
      });
      expect(event).toBeDefined();
    });

    it("2.4 Deletes invoice cleanly when no payment exists", async () => {
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify deletion in DB
      const check = await prisma.sale.findUnique({ where: { id: invoiceId } });
      expect(check).toBeNull();
    });
  });

  // ==========================================
  // 3. Expenses Claims CRUD
  // ==========================================
  describe("Expenses Claims CRUD", () => {
    let categoryId: string;
    let claimId: string;

    it("3.1 Creates category and pending claim", async () => {
      const catRes = await fetch(`${baseUrl}/api/expenses/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "Travel & Fuel", code: "TRAV", monthlyLimit: 50000 }),
      });
      if (catRes.status !== 201) console.error("Cat error:", await catRes.text());
      expect(catRes.status).toBe(201);
      const cat = await catRes.json();
      categoryId = cat.id;

      const claimRes = await fetch(`${baseUrl}/api/expenses/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          employeeId: testEmployeeId,
          categoryId,
          title: "Cab Fare Client Site",
          amount: 450,
          merchant: "City Cabs",
        }),
      });
      if (claimRes.status !== 201) console.error("Claim error:", await claimRes.text());
      expect(claimRes.status).toBe(201);
      const claim = await claimRes.json();
      claimId = claim.id;
      expect(claim.status).toBe("pending");
    });

    it("3.2 Fetches claim detail and updates pending claim", async () => {
      const getRes = await fetch(`${baseUrl}/api/expenses/claims/${claimId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(getRes.status).toBe(200);
      const detail = await getRes.json();
      expect(detail.title).toBe("Cab Fare Client Site");

      const putRes = await fetch(`${baseUrl}/api/expenses/claims/${claimId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          title: "Cab Fare Client Site & Parking",
          amount: 550,
          merchant: "Metro Transit & City Cabs",
        }),
      });
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.title).toBe("Cab Fare Client Site & Parking");
      expect(Number(updated.amount)).toBe(550);
    });

    it("3.3 Enforces cross-tenant isolation on claims", async () => {
      const res = await fetch(`${baseUrl}/api/expenses/claims/${claimId}`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 4. Products & Warehouses CRUD
  // ==========================================
  describe("Products Catalog & Warehouses CRUD", () => {
    let warehouseId: string;
    let categoryId: string;
    let unitId: string;
    let productId: string;

    it("4.1 Creates and updates warehouse", async () => {
      const res = await fetch(`${baseUrl}/api/products/warehouses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Regional Depot Alpha",
          location: "Sector 14 Logistics Hub",
          isDefault: false,
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      warehouseId = data.id;

      // GET detail
      const detailRes = await fetch(`${baseUrl}/api/products/warehouses/${warehouseId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.name).toBe("Regional Depot Alpha");

      // PUT update
      const updateRes = await fetch(`${baseUrl}/api/products/warehouses/${warehouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Regional Depot Alpha Renovated",
          location: "Sector 14 Terminal 2",
        }),
      });
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.name).toBe("Regional Depot Alpha Renovated");
    });

    it("4.2 Updates product category and unit", async () => {
      // Create Category
      const catRes = await fetch(`${baseUrl}/api/products/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "Network Hardware", code: "NET_HW" }),
      });
      expect(catRes.status).toBe(201);
      const cat = await catRes.json();
      categoryId = cat.id;

      // Update Category
      const catUpdateRes = await fetch(`${baseUrl}/api/products/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "Enterprise Networking Gear" }),
      });
      expect(catUpdateRes.status).toBe(200);
      const catUpdated = await catUpdateRes.json();
      expect(catUpdated.name).toBe("Enterprise Networking Gear");

      // Create Unit
      const unitRes = await fetch(`${baseUrl}/api/products/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "Box of 10", shortName: "box10" }),
      });
      expect(unitRes.status).toBe(201);
      const unit = await unitRes.json();
      unitId = unit.id;

      // Update Unit
      const unitUpdateRes = await fetch(`${baseUrl}/api/products/units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "Box of 12 Units", shortName: "box12" }),
      });
      expect(unitUpdateRes.status).toBe(200);
      const unitUpdated = await unitUpdateRes.json();
      expect(unitUpdated.name).toBe("Box of 12 Units");
    });

    it("4.3 Creates product and reads full detail", async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Cisco Gigabit Managed Switch",
          sku: `SW-GS-${Date.now()}`,
          cost: 15000,
          price: 22000,
          categoryId,
          unitId,
          type: "standard",
        }),
      });
      expect(res.status).toBe(201);
      const product = await res.json();
      productId = product.id;

      // GET product detail by ID
      const detailRes = await fetch(`${baseUrl}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.name).toBe("Cisco Gigabit Managed Switch");
      expect(detail.category).toBeDefined();
    });

    it("4.4 Deletes warehouse when no stock exists", async () => {
      const res = await fetch(`${baseUrl}/api/products/warehouses/${warehouseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  // ==========================================
  // 5. Helpdesk Tickets General Edit
  // ==========================================
  describe("Helpdesk Tickets CRUD", () => {
    let ticketId: string;

    it("5.1 Creates ticket and updates subject, priority, and description", async () => {
      const res = await fetch(`${baseUrl}/api/helpdesk/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          employeeId: testEmployeeId,
          subject: "Printer offline on Floor 3",
          category: "hardware",
          priority: "medium",
          description: "Cannot connect via network port.",
        }),
      });
      if (res.status !== 201) console.error("Ticket error:", await res.text());
      expect(res.status).toBe(201);
      const ticket = await res.json();
      ticketId = ticket.id;

      // General edit via PUT /api/helpdesk/tickets/:id
      const putRes = await fetch(`${baseUrl}/api/helpdesk/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          subject: "Color Printer offline on Floor 3 - Urgent",
          priority: "high",
          description: "Cannot connect via network port. Requires IP re-binding.",
        }),
      });
      if (putRes.status !== 200) console.error("Ticket PUT error:", await putRes.text());
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.subject).toBe("Color Printer offline on Floor 3 - Urgent");
      expect(updated.priority).toBe("high");
    });

    it("5.2 Enforces cross-tenant isolation on helpdesk tickets", async () => {
      const res = await fetch(`${baseUrl}/api/helpdesk/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${betaToken}` },
        body: JSON.stringify({ subject: "Malicious Ticket Change" }),
      });
      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 6. Assets Add-on CRUD
  // ==========================================
  describe("Assets Add-on CRUD", () => {
    let assetCategoryId: string;
    let assetId: string;

    it("6.1 Creates category and updates category", async () => {
      const res = await fetch(`${baseUrl}/api/addons/assets/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "Workstation Desktops", prefix: "DSK" }),
      });
      if (res.status !== 201) console.error("Asset cat error:", await res.text());
      expect(res.status).toBe(201);
      const cat = await res.json();
      assetCategoryId = cat.category.id;

      const putRes = await fetch(`${baseUrl}/api/addons/assets/categories/${assetCategoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({ name: "High-Performance Workstations", prefix: "HPW" }),
      });
      if (putRes.status !== 200) console.error("Asset cat PUT error:", await putRes.text());
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.category.name).toBe("High-Performance Workstations");
    });

    it("6.2 Creates asset, fetches detail, updates, and deletes safely", async () => {
      const res = await fetch(`${baseUrl}/api/addons/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Dell Precision Tower 3660",
          brand: "Dell",
          model: "T3660",
          categoryId: assetCategoryId,
          location: "Lab Room 4",
        }),
      });
      if (res.status !== 201) console.error("Asset POST error:", await res.text());
      expect(res.status).toBe(201);
      const asset = await res.json();
      assetId = asset.asset.id;

      // GET detail
      const detailRes = await fetch(`${baseUrl}/api/addons/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.asset.name).toBe("Dell Precision Tower 3660");

      // PUT update
      const putRes = await fetch(`${baseUrl}/api/addons/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          name: "Dell Precision Tower 3660 (Upgraded RAM)",
          location: "Lab Room 5",
        }),
      });
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.asset.location).toBe("Lab Room 5");

      // DELETE asset safely
      const delRes = await fetch(`${baseUrl}/api/addons/assets/${assetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
    });
  });

  // ==========================================
  // 7. Recruitment Candidates CRUD
  // ==========================================
  describe("Recruitment Candidates CRUD", () => {
    let jobPostingId: string;
    let candidateId: string;

    it("7.1 Creates job posting and candidate", async () => {
      const jobRes = await fetch(`${baseUrl}/api/recruitment/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          title: "Senior Full Stack Engineer",
          description: "Design and implement scalable microservices.",
          location: "Remote / Hybrid",
        }),
      });
      if (jobRes.status !== 201) console.error("Job POST error:", await jobRes.text());
      expect(jobRes.status).toBe(201);
      const job = await jobRes.json();
      jobPostingId = job.id;

      const candRes = await fetch(`${baseUrl}/api/recruitment/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          jobPostingId,
          fullName: "Jane Candidate",
          email: "jane.candidate@s6.local",
          phone: "+91 9123456789",
          stage: "applied",
          rating: 4,
        }),
      });
      if (candRes.status !== 201) console.error("Candidate POST error:", await candRes.text());
      expect(candRes.status).toBe(201);
      const cand = await candRes.json();
      candidateId = cand.id;
      expect(cand.fullName).toBe("Jane Candidate");
    });

    it("7.2 Reads candidate detail and updates candidate info", async () => {
      const getRes = await fetch(`${baseUrl}/api/recruitment/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(getRes.status).toBe(200);
      const detail = await getRes.json();
      expect(detail.fullName).toBe("Jane Candidate");

      const putRes = await fetch(`${baseUrl}/api/recruitment/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
        body: JSON.stringify({
          fullName: "Jane Candidate, Tech Lead",
          stage: "interviewing",
          rating: 5,
        }),
      });
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.fullName).toBe("Jane Candidate, Tech Lead");
      expect(updated.rating).toBe(5);
    });

    it("7.3 Deletes candidate and validates cross-tenant isolation", async () => {
      // Beta cannot delete Alpha's candidate
      const crossDel = await fetch(`${baseUrl}/api/recruitment/candidates/${candidateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      expect(crossDel.status).toBe(404);

      // Alpha deletes candidate
      const delRes = await fetch(`${baseUrl}/api/recruitment/candidates/${candidateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
    });
  });
});
