import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { crmRouter } from "../routes/crm.routes";

describe("W1-C1: Contacts CRM & Multi-Tenant Isolation", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w1_c1_tenant_alpha";
  const tenantBetaId = "w1_c1_tenant_beta";

  const alphaUserId = "w1_c1_alpha_user";
  const betaUserId = "w1_c1_beta_user";

  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@w1c1-crm.local",
    tenantId: tenantAlphaId,
    roles: ["hr_admin", "admin"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@w1c1-crm.local",
    tenantId: tenantBetaId,
    roles: ["hr_admin", "admin"],
  });

  let contactAId: string;

  beforeAll(async () => {
    // 1. Setup tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha CRM Tenant", slug: "alpha-crm-tenant" },
      update: { name: "Alpha CRM Tenant" },
    });

    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta CRM Tenant", slug: "beta-crm-tenant" },
      update: { name: "Beta CRM Tenant" },
    });

    // Register active tenants with TenantConnectionManager
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "Alpha CRM Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "Beta CRM Tenant",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // 2. Setup users, profiles, and roles
    await prisma.user.upsert({
      where: { id: alphaUserId },
      create: { id: alphaUserId, email: "alpha@w1c1-crm.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: alphaUserId },
      create: { userId: alphaUserId, email: "alpha@w1c1-crm.local", fullName: "Alpha Admin", tenantId: tenantAlphaId },
      update: { tenantId: tenantAlphaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: alphaUserId } });
    await prisma.userRole.create({
      data: { userId: alphaUserId, role: "hr_admin", tenantId: tenantAlphaId },
    });

    await prisma.user.upsert({
      where: { id: betaUserId },
      create: { id: betaUserId, email: "beta@w1c1-crm.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: betaUserId },
      create: { userId: betaUserId, email: "beta@w1c1-crm.local", fullName: "Beta Admin", tenantId: tenantBetaId },
      update: { tenantId: tenantBetaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: betaUserId } });
    await prisma.userRole.create({
      data: { userId: betaUserId, role: "hr_admin", tenantId: tenantBetaId },
    });

    // 3. Clear existing test contacts
    await prisma.crmContact.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });

    // 4. Spin up Express app
    const app = express();
    app.use(express.json());
    app.use("/api/crm", crmRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as any;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.crmContact.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.userRole.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [alphaUserId, betaUserId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });
  });

  it("1. Unauthenticated request to /api/crm/contacts returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts`);
    expect(res.status).toBe(401);
  });

  it("2. Tenant A can create a contact", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        name: "Test Contact A",
        email: "contact.a@acme.com",
        phone: "+1 555 0100",
        role: "Director of Procurement",
        company: "Acme Corp",
        city: "New York",
        country: "USA",
        rating: 4.8,
        status: "active",
        notes: "Confidential negotiation notes for Tenant A.",
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Test Contact A");
    expect(data.email).toBe("contact.a@acme.com");
    contactAId = data.id;
    expect(contactAId).toBeDefined();
  });

  it("3. Form validation: empty contact name returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        name: "",
        email: "empty@test.com",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("name is required");
  });

  it("4. Tenant B cannot see Tenant A's contact (Read Isolation)", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts`, {
      headers: {
        Authorization: `Bearer ${betaToken}`,
      },
    });

    expect(res.status).toBe(200);
    const list = await res.json();
    const found = list.find((c: any) => c.id === contactAId);
    expect(found).toBeUndefined();
  });

  it("5. Tenant B cannot update Tenant A's contact (Write Isolation)", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts/${contactAId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({
        name: "Hacked Contact",
      }),
    });

    expect(res.status).toBe(404);

    const contact = await prisma.crmContact.findUnique({ where: { id: contactAId } });
    expect(contact?.name).toBe("Test Contact A");
  });

  it("6. Tenant B cannot delete Tenant A's contact (Delete Isolation)", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts/${contactAId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${betaToken}`,
      },
    });

    expect(res.status).toBe(404);

    const contact = await prisma.crmContact.findUnique({ where: { id: contactAId } });
    expect(contact).not.toBeNull();
  });

  it("7. Tenant A can update own contact notes and activities", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts/${contactAId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        notes: "Updated confidential notes.",
        activities: [
          {
            type: "call",
            title: "Follow-up Strategy Call",
            date: new Date().toISOString(),
            notes: "Contract renewal discussion.",
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notes).toBe("Updated confidential notes.");
    expect(data.activities).toHaveLength(1);
    expect(data.activities[0].title).toBe("Follow-up Strategy Call");
  });

  it("8. Tenant A can delete own contact", async () => {
    const res = await fetch(`${baseUrl}/api/crm/contacts/${contactAId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${alphaToken}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const check = await prisma.crmContact.findUnique({ where: { id: contactAId } });
    expect(check).toBeNull();
  });
});
