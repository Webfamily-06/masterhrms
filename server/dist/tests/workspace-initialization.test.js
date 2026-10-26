"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const jwt_1 = require("../lib/jwt");
const auth_routes_1 = require("../routes/auth.routes");
const workspace_routes_1 = require("../routes/workspace.routes");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config();
async function runWorkspaceInitializationTests() {
    console.log("================================================================================");
    console.log("POST-LOGIN WORKSPACE INITIALIZATION & RBAC VERIFICATION SUITE");
    console.log("Testing: /api/auth/me, TenantModule Entitlements, Workspace Roles, Error Sanitization");
    console.log("================================================================================\n");
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use("/api/auth", auth_routes_1.authRouter);
    app.use("/api/workspace", workspace_routes_1.workspaceRouter);
    const server = http_1.default.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const ts = Date.now();
    const testTenantId = `init_test_t_${ts}`;
    const testUserId = `init_test_u_${ts}`;
    const testEmail = `admin_${ts}@testinit.local`;
    try {
        // --------------------------------------------------------------------------
        // Test 1: Setup Tenant, User, Profile, Modules, and RBAC
        // --------------------------------------------------------------------------
        console.log("▶ [Test 1] Provisioning test tenant and verifying RBAC baseline...");
        await prisma_1.rawPrisma.tenant.create({
            data: {
                id: testTenantId,
                slug: testTenantId,
                name: "Workspace Init Test Corp",
            },
        });
        await prisma_1.rawPrisma.user.create({
            data: {
                id: testUserId,
                email: testEmail,
                passwordHash: "dummyHash",
            },
        });
        await prisma_1.rawPrisma.profile.create({
            data: {
                userId: testUserId,
                email: testEmail,
                fullName: "Test Admin",
                tenantId: testTenantId,
            },
        });
        await prisma_1.rawPrisma.userRole.create({
            data: {
                userId: testUserId,
                tenantId: testTenantId,
                role: "hr_admin",
            },
        });
        // Create Workspace Admin role and seed permissions
        const adminRole = await prisma_1.rawPrisma.workspaceRole.create({
            data: {
                tenantId: testTenantId,
                name: "Workspace Admin",
                description: "Full workspace administrative access",
                isActive: true,
                isSystem: true,
            },
        });
        // Enable 9 default ERP modules
        const modules = ["hrm", "pos", "inventory", "crm", "finance", "project", "support", "procurement", "analytics"];
        for (const modKey of modules) {
            await prisma_1.rawPrisma.tenantModule.create({
                data: {
                    tenantId: testTenantId,
                    moduleKey: modKey,
                    isEnabled: true,
                },
            });
        }
        console.log("  -> PASS: Test tenant, user, modules, and workspace role seeded.\n");
        // --------------------------------------------------------------------------
        // Test 2: Call /api/auth/me and Verify Successful Workspace Initialization
        // --------------------------------------------------------------------------
        console.log("▶ [Test 2] Calling GET /api/auth/me to verify workspace initialization...");
        const token = (0, jwt_1.generateToken)({
            userId: testUserId,
            email: testEmail,
            tenantId: testTenantId,
            roles: ["admin", "hr_admin"],
        });
        const res = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`GET /api/auth/me failed with HTTP ${res.status}: ${errBody}`);
        }
        const payload = await res.json();
        if (!payload.id || payload.id !== testUserId) {
            throw new Error(`Expected user ID ${testUserId}, got: ${payload.id}`);
        }
        if (!payload.profile?.tenantId || payload.profile.tenantId !== testTenantId) {
            throw new Error(`Expected tenant ID ${testTenantId}, got: ${payload.profile?.tenantId}`);
        }
        if (!Array.isArray(payload.enabledModules) || payload.enabledModules.length !== 9) {
            throw new Error(`Expected 9 enabled modules, got: ${payload.enabledModules?.length}`);
        }
        if (!payload.workspaceRole || payload.workspaceRole.name !== "Workspace Admin") {
            throw new Error(`Expected workspaceRole 'Workspace Admin', got: ${payload.workspaceRole?.name}`);
        }
        console.log(`  -> PASS: User initialized successfully with Workspace Admin role and ${payload.enabledModules.length} modules.\n`);
        // --------------------------------------------------------------------------
        // Test 3: Module Disabling & Dynamic Entitlements Check
        // --------------------------------------------------------------------------
        console.log("▶ [Test 3] Verifying disabled modules are excluded from enabledModules...");
        // Disable 'pos' module
        await prisma_1.rawPrisma.tenantModule.update({
            where: { tenantId_moduleKey: { tenantId: testTenantId, moduleKey: "pos" } },
            data: { isEnabled: false },
        });
        const resDisabled = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const payloadDisabled = await resDisabled.json();
        if (payloadDisabled.enabledModules.includes("pos")) {
            throw new Error("Disabled 'pos' module was unexpectedly included in enabledModules");
        }
        if (payloadDisabled.enabledModules.length !== 8) {
            throw new Error(`Expected 8 enabled modules, got: ${payloadDisabled.enabledModules.length}`);
        }
        console.log("  -> PASS: Disabled module 'pos' properly excluded from user session.\n");
        // --------------------------------------------------------------------------
        // Test 4: Error Sanitization (Zero technical leakage on failure)
        // --------------------------------------------------------------------------
        console.log("▶ [Test 4] Verifying error sanitization prevents SQL/Prisma technical leakage...");
        // Call /api/auth/me with an invalid user token
        const ghostToken = (0, jwt_1.generateToken)({
            userId: "non-existent-user-id",
            email: "ghost@domain.local",
            tenantId: testTenantId,
            roles: ["employee"],
        });
        const resGhost = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${ghostToken}` },
        });
        if (resGhost.status !== 401 && resGhost.status !== 404) {
            throw new Error(`Expected 401 or 404 for ghost user, got: ${resGhost.status}`);
        }
        const ghostBody = await resGhost.json();
        if (ghostBody.error.includes("prisma") || ghostBody.error.includes("SELECT") || ghostBody.error.includes(".ts")) {
            throw new Error("SECURITY FAILURE: Raw technical diagnostic leaked in error payload!");
        }
        console.log("  -> PASS: Error response is fully sanitized and user-friendly.\n");
        console.log("================================================================================");
        console.log("✅ ALL WORKSPACE INITIALIZATION & RBAC TESTS PASSED (4/4)");
        console.log("================================================================================\n");
    }
    finally {
        console.log("Cleaning up test fixtures...");
        await prisma_1.rawPrisma.userRoleAssignment.deleteMany({ where: { tenantId: testTenantId } });
        await prisma_1.rawPrisma.rolePermission.deleteMany({ where: { role: { tenantId: testTenantId } } });
        await prisma_1.rawPrisma.workspaceRole.deleteMany({ where: { tenantId: testTenantId } });
        await prisma_1.rawPrisma.tenantModule.deleteMany({ where: { tenantId: testTenantId } });
        await prisma_1.rawPrisma.userRole.deleteMany({ where: { userId: testUserId } });
        await prisma_1.rawPrisma.profile.deleteMany({ where: { userId: testUserId } });
        await prisma_1.rawPrisma.user.deleteMany({ where: { id: testUserId } });
        await prisma_1.rawPrisma.tenant.deleteMany({ where: { id: testTenantId } });
        server.close();
    }
}
runWorkspaceInitializationTests()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
});
