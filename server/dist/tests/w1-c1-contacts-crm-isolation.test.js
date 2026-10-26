"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const jwt_1 = require("../lib/jwt");
const tenant_connection_manager_service_1 = require("../services/tenant-connection-manager.service");
const crm_routes_1 = require("../routes/crm.routes");
(0, vitest_1.describe)("W1-C1: Contacts CRM & Multi-Tenant Isolation", () => {
    let server;
    let baseUrl;
    const tenantAlphaId = "w1_c1_tenant_alpha";
    const tenantBetaId = "w1_c1_tenant_beta";
    const alphaUserId = "w1_c1_alpha_user";
    const betaUserId = "w1_c1_beta_user";
    const alphaToken = (0, jwt_1.generateToken)({
        userId: alphaUserId,
        email: "alpha@w1c1-crm.local",
        tenantId: tenantAlphaId,
        roles: ["hr_admin", "admin"],
    });
    const betaToken = (0, jwt_1.generateToken)({
        userId: betaUserId,
        email: "beta@w1c1-crm.local",
        tenantId: tenantBetaId,
        roles: ["hr_admin", "admin"],
    });
    let contactAId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Setup tenants
        await prisma_1.rawPrisma.tenant.upsert({
            where: { id: tenantAlphaId },
            create: { id: tenantAlphaId, name: "Alpha CRM Tenant", slug: "alpha-crm-tenant" },
            update: { name: "Alpha CRM Tenant" },
        });
        await prisma_1.rawPrisma.tenant.upsert({
            where: { id: tenantBetaId },
            create: { id: tenantBetaId, name: "Beta CRM Tenant", slug: "beta-crm-tenant" },
            update: { name: "Beta CRM Tenant" },
        });
        // Register active tenants with TenantConnectionManager
        tenant_connection_manager_service_1.TenantConnectionManager.getInstance().registerTenant({
            tenantId: tenantAlphaId,
            name: "Alpha CRM Tenant",
            strategy: "SHARED_SCHEMA",
            status: "ACTIVE",
        });
        tenant_connection_manager_service_1.TenantConnectionManager.getInstance().registerTenant({
            tenantId: tenantBetaId,
            name: "Beta CRM Tenant",
            strategy: "SHARED_SCHEMA",
            status: "ACTIVE",
        });
        // 2. Setup users, profiles, and roles
        await prisma_1.rawPrisma.user.upsert({
            where: { id: alphaUserId },
            create: { id: alphaUserId, email: "alpha@w1c1-crm.local", passwordHash: "dummy" },
            update: {},
        });
        await prisma_1.rawPrisma.profile.upsert({
            where: { userId: alphaUserId },
            create: { userId: alphaUserId, email: "alpha@w1c1-crm.local", fullName: "Alpha Admin", tenantId: tenantAlphaId },
            update: { tenantId: tenantAlphaId },
        });
        await prisma_1.rawPrisma.userRole.deleteMany({ where: { userId: alphaUserId } });
        await prisma_1.rawPrisma.userRole.create({
            data: { userId: alphaUserId, role: "hr_admin", tenantId: tenantAlphaId },
        });
        await prisma_1.rawPrisma.user.upsert({
            where: { id: betaUserId },
            create: { id: betaUserId, email: "beta@w1c1-crm.local", passwordHash: "dummy" },
            update: {},
        });
        await prisma_1.rawPrisma.profile.upsert({
            where: { userId: betaUserId },
            create: { userId: betaUserId, email: "beta@w1c1-crm.local", fullName: "Beta Admin", tenantId: tenantBetaId },
            update: { tenantId: tenantBetaId },
        });
        await prisma_1.rawPrisma.userRole.deleteMany({ where: { userId: betaUserId } });
        await prisma_1.rawPrisma.userRole.create({
            data: { userId: betaUserId, role: "hr_admin", tenantId: tenantBetaId },
        });
        // 3. Clear existing test contacts
        await prisma_1.rawPrisma.crmContact.deleteMany({
            where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
        });
        // 4. Spin up Express app
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api/crm", crm_routes_1.crmRouter);
        server = http_1.default.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    (0, vitest_1.afterAll)(async () => {
        if (server) {
            await new Promise((resolve) => server.close(() => resolve()));
        }
        await prisma_1.rawPrisma.crmContact.deleteMany({
            where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
        });
        await prisma_1.rawPrisma.userRole.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId] } } });
        await prisma_1.rawPrisma.profile.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId] } } });
        await prisma_1.rawPrisma.user.deleteMany({ where: { id: { in: [alphaUserId, betaUserId] } } });
        await prisma_1.rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });
    });
    (0, vitest_1.it)("1. Unauthenticated request to /api/crm/contacts returns 401", async () => {
        const res = await fetch(`${baseUrl}/api/crm/contacts`);
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)("2. Tenant A can create a contact", async () => {
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
        (0, vitest_1.expect)(res.status).toBe(201);
        const data = await res.json();
        (0, vitest_1.expect)(data.name).toBe("Test Contact A");
        (0, vitest_1.expect)(data.email).toBe("contact.a@acme.com");
        contactAId = data.id;
        (0, vitest_1.expect)(contactAId).toBeDefined();
    });
    (0, vitest_1.it)("3. Form validation: empty contact name returns 400", async () => {
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
        (0, vitest_1.expect)(res.status).toBe(400);
        const data = await res.json();
        (0, vitest_1.expect)(data.error).toContain("name is required");
    });
    (0, vitest_1.it)("4. Tenant B cannot see Tenant A's contact (Read Isolation)", async () => {
        const res = await fetch(`${baseUrl}/api/crm/contacts`, {
            headers: {
                Authorization: `Bearer ${betaToken}`,
            },
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        const list = await res.json();
        const found = list.find((c) => c.id === contactAId);
        (0, vitest_1.expect)(found).toBeUndefined();
    });
    (0, vitest_1.it)("5. Tenant B cannot update Tenant A's contact (Write Isolation)", async () => {
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
        (0, vitest_1.expect)(res.status).toBe(404);
        const contact = await prisma_1.rawPrisma.crmContact.findUnique({ where: { id: contactAId } });
        (0, vitest_1.expect)(contact?.name).toBe("Test Contact A");
    });
    (0, vitest_1.it)("6. Tenant B cannot delete Tenant A's contact (Delete Isolation)", async () => {
        const res = await fetch(`${baseUrl}/api/crm/contacts/${contactAId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${betaToken}`,
            },
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        const contact = await prisma_1.rawPrisma.crmContact.findUnique({ where: { id: contactAId } });
        (0, vitest_1.expect)(contact).not.toBeNull();
    });
    (0, vitest_1.it)("7. Tenant A can update own contact notes and activities", async () => {
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
        (0, vitest_1.expect)(res.status).toBe(200);
        const data = await res.json();
        (0, vitest_1.expect)(data.notes).toBe("Updated confidential notes.");
        (0, vitest_1.expect)(data.activities).toHaveLength(1);
        (0, vitest_1.expect)(data.activities[0].title).toBe("Follow-up Strategy Call");
    });
    (0, vitest_1.it)("8. Tenant A can delete own contact", async () => {
        const res = await fetch(`${baseUrl}/api/crm/contacts/${contactAId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${alphaToken}`,
            },
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        const data = await res.json();
        (0, vitest_1.expect)(data.success).toBe(true);
        const check = await prisma_1.rawPrisma.crmContact.findUnique({ where: { id: contactAId } });
        (0, vitest_1.expect)(check).toBeNull();
    });
});
