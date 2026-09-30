import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { authRouter } from "../routes/auth.routes";
import { workspaceRouter } from "../routes/workspace.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runWorkspaceInitializationTests() {
  console.log("================================================================================");
  console.log("POST-LOGIN WORKSPACE INITIALIZATION & RBAC VERIFICATION SUITE");
  console.log("Testing: /api/auth/me, TenantModule Entitlements, Workspace Roles, Error Sanitization");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.use("/api/workspace", workspaceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
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

    await prisma.tenant.create({
      data: {
        id: testTenantId,
        slug: testTenantId,
        name: "Workspace Init Test Corp",
      },
    });

    await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        passwordHash: "dummyHash",
      },
    });

    await prisma.profile.create({
      data: {
        userId: testUserId,
        email: testEmail,
        fullName: "Test Admin",
        tenantId: testTenantId,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: testUserId,
        tenantId: testTenantId,
        role: "hr_admin",
      },
    });

    // Create Workspace Admin role and seed permissions
    const adminRole = await prisma.workspaceRole.create({
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
      await prisma.tenantModule.create({
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

    const token = generateToken({
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
    await prisma.tenantModule.update({
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
    const ghostToken = generateToken({
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
  } finally {
    console.log("Cleaning up test fixtures...");
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: testTenantId } } });
    await prisma.workspaceRole.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenantModule.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.userRole.deleteMany({ where: { userId: testUserId } });
    await prisma.profile.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    server.close();
  }
}

runWorkspaceInitializationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
