import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { prismaProxy, TenantContextRequiredError } from "../facade/prisma-proxy.facade";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";

// Import all 9 hardened Wave 3 routers
import { accountingRouter } from "../routes/accounting.routes";
import { productsRouter } from "../routes/products.routes";
import { purchasesRouter } from "../routes/purchases.routes";
import { salesRouter } from "../routes/sales.routes";
import { adjustmentsRouter } from "../routes/adjustments.routes";
import { transfersRouter } from "../routes/transfers.routes";
import { customersRouter } from "../routes/customers.routes";
import { suppliersRouter } from "../routes/suppliers.routes";
import { invoicesRouter } from "../routes/invoices.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

interface TestReportItem {
  id: number;
  scenario: string;
  category: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
}

const report: TestReportItem[] = [];

async function runStep31TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.1: TENANT ISOLATION & RBAC HARDENING TEST SUITE");
  console.log("Coverage: 9 Hardened Routers, Fail-Closed Security, Cross-Tenant Isolation, Public Routes");
  console.log("Runtime: Node.js 20 LTS | Prisma 5.19.1 | Express 4 | MySQL/MariaDB 10.11");
  console.log("================================================================================\n");

  // Spin up an ephemeral Express test server
  const app = express();
  app.use(express.json());

  // Mount all 9 Wave 3 routers
  app.use("/api/accounting", accountingRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/adjustments", adjustmentsRouter);
  app.use("/api/transfers", transfersRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/suppliers", suppliersRouter);
  app.use("/api/invoices", invoicesRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Ephemeral test API running on ${baseUrl}\n`);

  // Fixture IDs
  const tenantAlphaId = "w3_test_tenant_alpha";
  const tenantBetaId = "w3_test_tenant_beta";
  const suspendedTenantId = "w3_test_tenant_suspended";

  const alphaUserId = "w3_alpha_user";
  const betaUserId = "w3_beta_user";
  const suspendedUserId = "w3_suspended_user";
  const noTenantUserId = "w3_notenant_user";

  // Pre-generate tokens
  const alphaToken = generateToken({
    userId: alphaUserId,
    email: "alpha@wave3-test.local",
    tenantId: tenantAlphaId,
    roles: ["tenant_admin", "admin"],
  });

  const betaToken = generateToken({
    userId: betaUserId,
    email: "beta@wave3-test.local",
    tenantId: tenantBetaId,
    roles: ["tenant_admin", "admin"],
  });

  const suspendedToken = generateToken({
    userId: suspendedUserId,
    email: "suspended@wave3-test.local",
    tenantId: suspendedTenantId,
    roles: ["tenant_admin", "admin"],
  });

  const noTenantToken = generateToken({
    userId: noTenantUserId,
    email: "notenant@wave3-test.local",
    tenantId: null as any,
    roles: ["tenant_admin", "admin"],
  });

  // Setup test fixtures in database
  try {
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha Wave 3 Corp", slug: "alpha-wave3-test" },
      update: { name: "Alpha Wave 3 Corp" },
    });

    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta Wave 3 Corp", slug: "beta-wave3-test" },
      update: { name: "Beta Wave 3 Corp" },
    });

    await prisma.tenant.upsert({
      where: { id: suspendedTenantId },
      create: { id: suspendedTenantId, name: "Suspended Wave 3 Corp", slug: "suspended-wave3-test" },
      update: { name: "Suspended Wave 3 Corp" },
    });

    // Create TenantSubscription for suspended tenant to trigger workspace policy suspension
    await prisma.tenantSubscription.upsert({
      where: { tenantId: suspendedTenantId },
      create: {
        id: `sub_${suspendedTenantId}`,
        tenantId: suspendedTenantId,
        status: "suspended",
        billingCycle: "monthly",
      },
      update: { status: "suspended" },
    });

    // Register suspended tenant with TenantConnectionManager
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: suspendedTenantId,
      name: "Suspended Wave 3 Corp",
      strategy: "SHARED_SCHEMA",
      status: "SUSPENDED",
    });

    // Register Alpha & Beta as ACTIVE
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlphaId,
      name: "Alpha Wave 3 Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBetaId,
      name: "Beta Wave 3 Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // Create users, profiles, and roles
    await prisma.user.upsert({
      where: { id: alphaUserId },
      create: { id: alphaUserId, email: "alpha@wave3-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: alphaUserId },
      create: { userId: alphaUserId, email: "alpha@wave3-test.local", fullName: "Alpha Admin", tenantId: tenantAlphaId },
      update: { tenantId: tenantAlphaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: alphaUserId } });
    await prisma.userRole.create({
      data: { userId: alphaUserId, role: "hr_admin", tenantId: tenantAlphaId },
    });

    await prisma.user.upsert({
      where: { id: betaUserId },
      create: { id: betaUserId, email: "beta@wave3-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: betaUserId },
      create: { userId: betaUserId, email: "beta@wave3-test.local", fullName: "Beta Admin", tenantId: tenantBetaId },
      update: { tenantId: tenantBetaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: betaUserId } });
    await prisma.userRole.create({
      data: { userId: betaUserId, role: "hr_admin", tenantId: tenantBetaId },
    });

    await prisma.user.upsert({
      where: { id: suspendedUserId },
      create: { id: suspendedUserId, email: "suspended@wave3-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: suspendedUserId },
      create: { userId: suspendedUserId, email: "suspended@wave3-test.local", fullName: "Suspended Admin", tenantId: suspendedTenantId },
      update: { tenantId: suspendedTenantId },
    });
    await prisma.userRole.deleteMany({ where: { userId: suspendedUserId } });
    await prisma.userRole.create({
      data: { userId: suspendedUserId, role: "hr_admin", tenantId: suspendedTenantId },
    });

    await prisma.user.upsert({
      where: { id: noTenantUserId },
      create: { id: noTenantUserId, email: "notenant@wave3-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: noTenantUserId },
      create: { userId: noTenantUserId, email: "notenant@wave3-test.local", fullName: "No Tenant User", tenantId: null },
      update: { tenantId: null },
    });
    await prisma.userRole.deleteMany({ where: { userId: noTenantUserId } });
    await prisma.userRole.create({
      data: { userId: noTenantUserId, role: "hr_admin", tenantId: null },
    });
  } catch (err: any) {
    console.error("Fixture setup warning:", err.message);
  }

  let scenarioCounter = 1;

  async function executeTest(
    scenario: string,
    category: string,
    fn: () => Promise<{ passed: boolean; evidence: string }>
  ) {
    const id = scenarioCounter++;
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      report.push({
        id,
        scenario,
        category,
        passed: result.passed,
        durationMs,
        evidence: result.evidence,
      });
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} [${id.toString().padStart(2, "0")}] [${category}] ${scenario} (${durationMs}ms)`);
      if (!result.passed) {
        console.error(`   Failure Evidence: ${result.evidence}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - start;
      report.push({
        id,
        scenario,
        category,
        passed: false,
        durationMs,
        evidence: err.stack || err.message,
      });
      console.error(`❌ [${id.toString().padStart(2, "0")}] [${category}] ${scenario} EXCEPTION (${durationMs}ms)`);
      console.error(`   ${err.message}`);
    }
  }

  // ============================================================================
  // GROUP 1: UNAUTHENTICATED ACCESS REJECTION (401) ON ALL 9 WAVE 3 ROUTERS
  // ============================================================================
  const unauthEndpoints = [
    { name: "Accounting Router", path: "/api/accounting/accounts" },
    { name: "Products Router", path: "/api/products" },
    { name: "Purchases Router", path: "/api/purchases" },
    { name: "Sales Router", path: "/api/sales" },
    { name: "Adjustments Router", path: "/api/adjustments" },
    { name: "Transfers Router", path: "/api/transfers" },
    { name: "Customers Router", path: "/api/customers" },
    { name: "Suppliers Router", path: "/api/suppliers" },
    { name: "Invoices Router", path: "/api/invoices" },
  ];

  for (const ep of unauthEndpoints) {
    await executeTest(
      `Unauthenticated GET ${ep.path} fails with 401 Unauthorized`,
      "AUTH_ENFORCEMENT",
      async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, { method: "GET" });
        const text = await res.text();
        const passed = res.status === 401;
        return {
          passed,
          evidence: `Status: ${res.status}, Body: ${text.slice(0, 150)}`,
        };
      }
    );
  }

  // ============================================================================
  // GROUP 2: MISSING TENANT & SUSPENDED TENANT REJECTION (403)
  // ============================================================================
  await executeTest(
    "Authenticated user with missing tenantId fails with 403 Forbidden",
    "TENANT_CONTEXT_VALIDATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${noTenantToken}` },
      });
      const data = await res.json();
      const passed = res.status === 403 && (data.error?.includes("workspace") || data.error?.includes("tenant"));
      return {
        passed,
        evidence: `Status: ${res.status}, Error: ${JSON.stringify(data)}`,
      };
    }
  );

  await executeTest(
    "Authenticated user belonging to SUSPENDED workspace fails with 403 (suspended)",
    "TENANT_LIFECYCLE_PROTECTION",
    async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${suspendedToken}` },
      });
      const data = await res.json();
      const passed = res.status === 403 && (data.code === "WORKSPACE_SUSPENDED" || data.error?.toLowerCase().includes("suspended"));
      return {
        passed,
        evidence: `Status: ${res.status}, Body: ${JSON.stringify(data)}`,
      };
    }
  );

  // ============================================================================
  // GROUP 3: PUBLIC INVOICES PORTAL ACCESS (BYPASS AUTHENTICATION)
  // ============================================================================
  await executeTest(
    "Public statement endpoint /api/invoices/public/client/statement is accessible without Bearer token",
    "PUBLIC_PORTAL_ROUTING",
    async () => {
      const res = await fetch(`${baseUrl}/api/invoices/public/client/statement?clientId=nonexistent_client`);
      // Should not be 401 or 500 TenantContextRequiredError
      const passed = res.status !== 401;
      const text = await res.text();
      return {
        passed,
        evidence: `Status: ${res.status}, Response: ${text.slice(0, 150)}`,
      };
    }
  );

  await executeTest(
    "Public invoice lookup /api/invoices/public/:id returns 404 for invalid ID without 401 Unauthorized",
    "PUBLIC_PORTAL_ROUTING",
    async () => {
      const res = await fetch(`${baseUrl}/api/invoices/public/nonexistent_invoice_12345`);
      const data = await res.json();
      const passed = res.status === 404 && data.error?.toLowerCase().includes("invoice not found");
      return {
        passed,
        evidence: `Status: ${res.status}, Response: ${JSON.stringify(data)}`,
      };
    }
  );

  // ============================================================================
  // GROUP 4: FAIL-CLOSED DIRECT PRISMA PROXY ACCESS
  // ============================================================================
  await executeTest(
    "Direct prismaProxy.product.findMany() outside AsyncLocalStorage throws TenantContextRequiredError",
    "FAIL_CLOSED_SECURITY",
    async () => {
      try {
        await prismaProxy.product.findMany();
        return { passed: false, evidence: "Direct call should have thrown TenantContextRequiredError" };
      } catch (err: any) {
        const passed = err instanceof TenantContextRequiredError || err.name === "TenantContextRequiredError" || err.code === "TENANT_CONTEXT_REQUIRED";
        return {
          passed,
          evidence: `Caught expected error: ${err.name} - ${err.message}`,
        };
      }
    }
  );

  await executeTest(
    "Direct prismaProxy.chartOfAccount.findMany() outside AsyncLocalStorage throws TenantContextRequiredError",
    "FAIL_CLOSED_SECURITY",
    async () => {
      try {
        await prismaProxy.chartOfAccount.findMany();
        return { passed: false, evidence: "Direct call should have thrown TenantContextRequiredError" };
      } catch (err: any) {
        const passed = err instanceof TenantContextRequiredError || err.name === "TenantContextRequiredError" || err.code === "TENANT_CONTEXT_REQUIRED";
        return {
          passed,
          evidence: `Caught expected error: ${err.name} - ${err.message}`,
        };
      }
    }
  );

  // ============================================================================
  // GROUP 5: CROSS-TENANT DATA ISOLATION (PRODUCTS, CUSTOMERS, SUPPLIERS, ACCOUNTS)
  // ============================================================================
  let alphaProductId: string = "";
  let alphaCustomerId: string = "";
  let alphaSupplierId: string = "";
  let alphaAccountId: string = "";

  // 1. Create test records in Alpha's tenant using rawPrisma
  try {
    const p = await prisma.product.create({
      data: {
        id: `p_alpha_${Date.now()}`,
        tenantId: tenantAlphaId,
        sku: `SKU-A-${Date.now()}`,
        name: "Alpha Exclusive Widget",
        type: "Product",
        purchasePrice: 50,
        salePrice: 100,
      },
    });
    alphaProductId = p.id;

    const c = await prisma.customer.create({
      data: {
        id: `c_alpha_${Date.now()}`,
        tenantId: tenantAlphaId,
        name: "Alpha VIP Customer",
        email: "vip@alpha.local",
        phone: "1234567890",
      },
    });
    alphaCustomerId = c.id;

    const s = await prisma.supplier.create({
      data: {
        id: `s_alpha_${Date.now()}`,
        tenantId: tenantAlphaId,
        name: "Alpha Primary Supplier",
        email: "supplier@alpha.local",
        phone: "0987654321",
      },
    });
    alphaSupplierId = s.id;

    const a = await prisma.chartOfAccount.create({
      data: {
        id: `acc_alpha_${Date.now()}`,
        tenantId: tenantAlphaId,
        accountCode: `1001-${Date.now()}`,
        accountName: "Alpha Operating Bank",
        accountType: "asset",
        category: "current_asset",
        currency: "INR",
      },
    });
    alphaAccountId = a.id;
  } catch (err: any) {
    console.error("Error creating Alpha fixtures:", err);
  }

  await executeTest(
    "Tenant Alpha can list its own products via /api/products",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const data = await res.json();
      const products = Array.isArray(data) ? data : data.data || [];
      const found = products.some((item: any) => item.id === alphaProductId);
      return {
        passed: res.status === 200 && found,
        evidence: `Status: ${res.status}, Product count: ${products.length}, Contains Alpha Product: ${found}`,
      };
    }
  );

  await executeTest(
    "Tenant Beta CANNOT see Tenant Alpha's product in GET /api/products",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      const data = await res.json();
      const products = Array.isArray(data) ? data : data.data || [];
      const leaked = products.some((item: any) => item.id === alphaProductId);
      return {
        passed: res.status === 200 && !leaked,
        evidence: `Status: ${res.status}, Beta product count: ${products.length}, Leaked: ${leaked}`,
      };
    }
  );

  await executeTest(
    "Tenant Beta CANNOT fetch Tenant Alpha's product by ID via GET /api/products/:id (returns 404)",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/products/${alphaProductId}`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      const passed = res.status === 404;
      const text = await res.text();
      return {
        passed,
        evidence: `Status: ${res.status}, Body: ${text.slice(0, 150)}`,
      };
    }
  );

  await executeTest(
    "Tenant Beta CANNOT update Tenant Alpha's product via PUT /api/products/:id (returns 404/403)",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/products/${alphaProductId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${betaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hacked Product Name" }),
      });
      const passed = res.status === 404 || res.status === 403;
      const text = await res.text();
      return {
        passed,
        evidence: `Status: ${res.status}, Body: ${text.slice(0, 150)}`,
      };
    }
  );

  await executeTest(
    "Tenant Alpha can list its own customers via /api/customers",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      const found = list.some((item: any) => item.id === alphaCustomerId);
      return {
        passed: res.status === 200 && found,
        evidence: `Status: ${res.status}, Count: ${list.length}, Contains Alpha Customer: ${found}`,
      };
    }
  );

  await executeTest(
    "Tenant Beta CANNOT see Tenant Alpha's customer in GET /api/customers",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      const leaked = list.some((item: any) => item.id === alphaCustomerId);
      return {
        passed: res.status === 200 && !leaked,
        evidence: `Status: ${res.status}, Count: ${list.length}, Leaked: ${leaked}`,
      };
    }
  );

  await executeTest(
    "Tenant Beta CANNOT see Tenant Alpha's supplier in GET /api/suppliers",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/suppliers`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      const leaked = list.some((item: any) => item.id === alphaSupplierId);
      return {
        passed: res.status === 200 && !leaked,
        evidence: `Status: ${res.status}, Count: ${list.length}, Leaked: ${leaked}`,
      };
    }
  );

  await executeTest(
    "Tenant Beta CANNOT see Tenant Alpha's chart of accounts in GET /api/accounting/accounts",
    "CROSS_TENANT_ISOLATION",
    async () => {
      const res = await fetch(`${baseUrl}/api/accounting/accounts`, {
        headers: { Authorization: `Bearer ${betaToken}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      const leaked = list.some((item: any) => item.id === alphaAccountId);
      return {
        passed: res.status === 200 && !leaked,
        evidence: `Status: ${res.status}, Count: ${list.length}, Leaked: ${leaked}`,
      };
    }
  );

  // ============================================================================
  // GROUP 6: TRANSACTION MODULES TENANT CONTEXT EXECUTION
  // ============================================================================
  await executeTest(
    "Tenant Alpha accesses GET /api/sales successfully under tenant context",
    "TRANSACTION_MODULE_EXECUTION",
    async () => {
      const res = await fetch(`${baseUrl}/api/sales`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const passed = res.status === 200;
      return {
        passed,
        evidence: `Status: ${res.status}`,
      };
    }
  );

  await executeTest(
    "Tenant Alpha accesses GET /api/purchases successfully under tenant context",
    "TRANSACTION_MODULE_EXECUTION",
    async () => {
      const res = await fetch(`${baseUrl}/api/purchases`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const passed = res.status === 200;
      return {
        passed,
        evidence: `Status: ${res.status}`,
      };
    }
  );

  await executeTest(
    "Tenant Alpha accesses GET /api/adjustments successfully under tenant context",
    "TRANSACTION_MODULE_EXECUTION",
    async () => {
      const res = await fetch(`${baseUrl}/api/adjustments`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const passed = res.status === 200;
      return {
        passed,
        evidence: `Status: ${res.status}`,
      };
    }
  );

  await executeTest(
    "Tenant Alpha accesses GET /api/transfers successfully under tenant context",
    "TRANSACTION_MODULE_EXECUTION",
    async () => {
      const res = await fetch(`${baseUrl}/api/transfers`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const passed = res.status === 200;
      return {
        passed,
        evidence: `Status: ${res.status}`,
      };
    }
  );

  await executeTest(
    "Tenant Alpha accesses GET /api/invoices successfully under tenant context",
    "TRANSACTION_MODULE_EXECUTION",
    async () => {
      const res = await fetch(`${baseUrl}/api/invoices`, {
        headers: { Authorization: `Bearer ${alphaToken}` },
      });
      const passed = res.status === 200;
      return {
        passed,
        evidence: `Status: ${res.status}`,
      };
    }
  );

  // Close server and cleanup test records
  server.close();
  try {
    if (alphaProductId) await prisma.product.deleteMany({ where: { id: alphaProductId } });
    if (alphaCustomerId) await prisma.customer.deleteMany({ where: { id: alphaCustomerId } });
    if (alphaSupplierId) await prisma.supplier.deleteMany({ where: { id: alphaSupplierId } });
    if (alphaAccountId) await prisma.chartOfAccount.deleteMany({ where: { id: alphaAccountId } });
    await prisma.userRole.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId, suspendedUserId, noTenantUserId] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId, suspendedUserId, noTenantUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [alphaUserId, betaUserId, suspendedUserId, noTenantUserId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: suspendedTenantId } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId, suspendedTenantId] } } });
  } catch (err: any) {
    // ignore cleanup errors
  }

  // Print Summary Table
  console.log("\n================================================================================");
  console.log("STEP 3.1 TEST RESULTS SUMMARY");
  console.log("================================================================================");
  const total = report.length;
  const passed = report.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.error("❌ FAILED SCENARIOS:");
    for (const r of report.filter((r) => !r.passed)) {
      console.error(`- Scenario #${r.id} [${r.category}]: ${r.scenario}`);
      console.error(`  Evidence: ${r.evidence}`);
    }
    process.exit(1);
  } else {
    console.log("✅ ALL STEP 3.1 TENANT ISOLATION & RBAC TEST SCENARIOS PASSED PERFECTLY!");
    process.exit(0);
  }
}

runStep31TestSuite().catch((err) => {
  console.error("Test runner execution failed:", err);
  process.exit(1);
});
