import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { clientRouter } from "../routes/client.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

/**
 * Server-side replica of frontend auth-navigation logic to verify role mapping
 */
function resolveDefaultRoute(
  roles: string[] = [],
  redirect?: string | null,
  options?: { isImpersonating?: boolean }
): string {
  if (
    redirect &&
    redirect !== "/" &&
    redirect !== "/auth" &&
    redirect !== "/login" &&
    redirect !== "/super-login" &&
    !redirect.startsWith("/auth")
  ) {
    return redirect;
  }

  if (options?.isImpersonating) {
    return "/hrm-dashboard";
  }

  if (roles.includes("super_admin")) {
    return "/super";
  }

  if (roles.includes("client")) {
    return "/client-dashboard";
  }

  if (roles.includes("employee")) {
    return "/employee-dashboard";
  }

  return "/hrm-dashboard";
}

async function runClientPortalIsolationTests() {
  console.log("================================================================================");
  console.log("PRE-WAVE 4.1 · CRITICAL PORTAL REMEDIATION & CLIENT ISOLATION TEST SUITE");
  console.log("Testing: Role Redirection, Session Customer Scoping, Multi-Tenant Isolation");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/client", clientRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const ts = Date.now();
  const tenantAlpha = `c_alpha_${ts}`;
  const tenantBeta = `c_beta_${ts}`;

  // Client A (Tenant Alpha)
  const userClientA = `usr_cl_a_${ts}`;
  const emailClientA = `client_a_${ts}@alphacorp.com`;

  // Client B (Same Tenant Alpha)
  const userClientB = `usr_cl_b_${ts}`;
  const emailClientB = `client_b_${ts}@alphacorp.com`;

  // Client C (Different Tenant Beta)
  const userClientC = `usr_cl_c_${ts}`;
  const emailClientC = `client_c_${ts}@betacorp.com`;

  // Unlinked Client (Valid user in Tenant Alpha, but no matching Customer ledger record)
  const userUnlinked = `usr_unlinked_${ts}`;
  const emailUnlinked = `unlinked_${ts}@alphacorp.com`;

  // Tokens
  const tokenClientA = generateToken({
    userId: userClientA,
    email: emailClientA,
    roles: ["client"],
    tenantId: tenantAlpha,
  });

  const tokenClientB = generateToken({
    userId: userClientB,
    email: emailClientB,
    roles: ["client"],
    tenantId: tenantAlpha,
  });

  const tokenClientC = generateToken({
    userId: userClientC,
    email: emailClientC,
    roles: ["client"],
    tenantId: tenantBeta,
  });

  const tokenUnlinked = generateToken({
    userId: userUnlinked,
    email: emailUnlinked,
    roles: ["client"],
    tenantId: tenantAlpha,
  });

  let invoiceAId: string;
  let invoiceBId: string;
  let invoiceCId: string;
  let projectAId: string;
  let projectBId: string;

  try {
    // --------------------------------------------------------------------------
    // Test 1: Verify Role-Based Redirection Logic (All 4 Portal Roles)
    // --------------------------------------------------------------------------
    console.log("▶ [Test 1] Verifying role-based portal landing redirection...");
    
    // Super admin
    const superRoute = resolveDefaultRoute(["super_admin"]);
    if (superRoute !== "/super") throw new Error(`Expected super_admin to land on /super, got: ${superRoute}`);
    
    // Client
    const clientRoute = resolveDefaultRoute(["client"]);
    if (clientRoute !== "/client-dashboard") throw new Error(`Expected client to land on /client-dashboard, got: ${clientRoute}`);
    
    // Employee
    const employeeRoute = resolveDefaultRoute(["employee"]);
    if (employeeRoute !== "/employee-dashboard") throw new Error(`Expected employee to land on /employee-dashboard, got: ${employeeRoute}`);
    
    // Admin / HR Admin
    const adminRoute = resolveDefaultRoute(["admin"]);
    if (adminRoute !== "/hrm-dashboard") throw new Error(`Expected admin to land on /hrm-dashboard, got: ${adminRoute}`);
    
    // Impersonation preservation
    const impersonatedRoute = resolveDefaultRoute(["super_admin", "admin"], null, { isImpersonating: true });
    if (impersonatedRoute !== "/hrm-dashboard") throw new Error(`Expected impersonating admin to land on /hrm-dashboard, got: ${impersonatedRoute}`);

    console.log("  -> PASS: All four roles and impersonation route with 100% precision.\n");

    // --------------------------------------------------------------------------
    // Provision Database Fixtures
    // --------------------------------------------------------------------------
    console.log("▶ Provisioning isolated multi-tenant and customer fixtures...");

    await prisma.tenant.createMany({
      data: [
        { id: tenantAlpha, slug: tenantAlpha, name: "Alpha Enterprise Corp" },
        { id: tenantBeta, slug: tenantBeta, name: "Beta Enterprise Corp" },
      ],
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantAlpha,
      name: "Alpha Enterprise Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantBeta,
      name: "Beta Enterprise Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // Create users & profiles
    await prisma.user.createMany({
      data: [
        { id: userClientA, email: emailClientA, passwordHash: "dummy" },
        { id: userClientB, email: emailClientB, passwordHash: "dummy" },
        { id: userClientC, email: emailClientC, passwordHash: "dummy" },
        { id: userUnlinked, email: emailUnlinked, passwordHash: "dummy" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: userClientA, email: emailClientA, fullName: "Client Alpha A", tenantId: tenantAlpha },
        { userId: userClientB, email: emailClientB, fullName: "Client Alpha B", tenantId: tenantAlpha },
        { userId: userClientC, email: emailClientC, fullName: "Client Beta C", tenantId: tenantBeta },
        { userId: userUnlinked, email: emailUnlinked, fullName: "Unlinked User", tenantId: tenantAlpha },
      ],
    });

    // Create Customer records linked by email + tenantId
    const customerA = await prisma.customer.create({
      data: {
        tenantId: tenantAlpha,
        name: "Acme Logistics A",
        email: emailClientA,
        phone: "+91 9876543210",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        tenantId: tenantAlpha,
        name: "Zenith Retail B",
        email: emailClientB,
        phone: "+91 9876543211",
      },
    });

    const customerC = await prisma.customer.create({
      data: {
        tenantId: tenantBeta,
        name: "Beta Industries C",
        email: emailClientC,
        phone: "+91 9876543212",
      },
    });

    // Create Products for sale details
    const prodA = await prisma.product.create({
      data: {
        tenantId: tenantAlpha,
        sku: `SKU-A-${ts}`,
        name: "Cloud ERP License A",
        salePrice: 5000.0,
      },
    });

    const prodB = await prisma.product.create({
      data: {
        tenantId: tenantAlpha,
        sku: `SKU-B-${ts}`,
        name: "Hardware Gateway B",
        salePrice: 12000.0,
      },
    });

    const prodC = await prisma.product.create({
      data: {
        tenantId: tenantBeta,
        sku: `SKU-C-${ts}`,
        name: "Beta Custom Module C",
        salePrice: 8500.0,
      },
    });

    // Create Invoices (Sale records)
    const saleA = await prisma.sale.create({
      data: {
        tenantId: tenantAlpha,
        invoiceNo: `INV-A-${ts}`,
        customerId: customerA.id,
        customerName: customerA.name,
        subtotal: 5000.0,
        totalTax: 900.0,
        total: 5900.0,
        paidAmount: 5900.0,
        paymentStatus: "paid",
        details: {
          create: [{ productId: prodA.id, productName: "Cloud ERP License A", price: 5000.0, quantity: 1 }],
        },
      },
    });
    invoiceAId = saleA.id;

    const saleB = await prisma.sale.create({
      data: {
        tenantId: tenantAlpha,
        invoiceNo: `INV-B-${ts}`,
        customerId: customerB.id,
        customerName: customerB.name,
        subtotal: 12000.0,
        totalTax: 2160.0,
        total: 14160.0,
        paidAmount: 0.0,
        paymentStatus: "unpaid",
        details: {
          create: [{ productId: prodB.id, productName: "Hardware Gateway B", price: 12000.0, quantity: 1 }],
        },
      },
    });
    invoiceBId = saleB.id;

    const saleC = await prisma.sale.create({
      data: {
        tenantId: tenantBeta,
        invoiceNo: `INV-C-${ts}`,
        customerId: customerC.id,
        customerName: customerC.name,
        subtotal: 8500.0,
        totalTax: 1530.0,
        total: 10030.0,
        paidAmount: 10030.0,
        paymentStatus: "paid",
        details: {
          create: [{ productId: prodC.id, productName: "Beta Custom Module C", price: 8500.0, quantity: 1 }],
        },
      },
    });
    invoiceCId = saleC.id;

    // Create Projects
    const projA = await prisma.project.create({
      data: {
        tenantId: tenantAlpha,
        name: "Project Titan for Acme A",
        clientName: customerA.name,
        status: "in_progress",
        progress: 65,
      },
    });
    projectAId = projA.id;

    const projB = await prisma.project.create({
      data: {
        tenantId: tenantAlpha,
        name: "Project Zenith for Retail B",
        clientName: customerB.name,
        status: "in_progress",
        progress: 40,
      },
    });
    projectBId = projB.id;

    console.log("  -> Fixtures established cleanly.\n");

    // --------------------------------------------------------------------------
    // Test 2: Client A can access Client A's invoice
    // --------------------------------------------------------------------------
    console.log("▶ [Test 2] Client A accessing Client A's invoices via GET /api/client/my-invoices...");
    const resA = await fetch(`${baseUrl}/api/client/my-invoices`, {
      headers: { Authorization: `Bearer ${tokenClientA}` },
    });
    if (!resA.ok) throw new Error(`Client A failed to fetch my-invoices: ${resA.statusText}`);
    const invoicesA: any[] = await resA.json();

    const hasInvoiceA = invoicesA.some((inv) => inv.id === invoiceAId);
    if (!hasInvoiceA) throw new Error("Client A did not find their own invoice");
    console.log(`  -> PASS: Client A successfully retrieved invoice ${saleA.invoiceNo}.\n`);

    // --------------------------------------------------------------------------
    // Test 3: Client A CANNOT access Client B's invoice (Same Tenant isolation)
    // --------------------------------------------------------------------------
    console.log("▶ [Test 3] Verifying Client A cannot access Client B's invoice (Same-tenant Customer Isolation)...");
    const leaksClientBInvoice = invoicesA.some((inv) => inv.id === invoiceBId || inv.invoiceNumber === saleB.invoiceNo);
    if (leaksClientBInvoice) {
      throw new Error("SECURITY FAILURE: Client A retrieved Client B's invoice in the same tenant!");
    }
    console.log("  -> PASS: Verified Client B's invoices are completely hidden from Client A.\n");

    // --------------------------------------------------------------------------
    // Test 4: Cross-Tenant Isolation (Client A cannot access Tenant Beta invoices)
    // --------------------------------------------------------------------------
    console.log("▶ [Test 4] Verifying Client A cannot access Tenant Beta's invoices (Cross-Tenant Isolation)...");
    const leaksTenantBetaInvoice = invoicesA.some((inv) => inv.id === invoiceCId || inv.invoiceNumber === saleC.invoiceNo);
    if (leaksTenantBetaInvoice) {
      throw new Error("SECURITY FAILURE: Client A retrieved Tenant Beta's invoice!");
    }

    // Verify Tenant Beta Client retrieves only Tenant Beta invoice
    const resC = await fetch(`${baseUrl}/api/client/my-invoices`, {
      headers: { Authorization: `Bearer ${tokenClientC}` },
    });
    if (!resC.ok) throw new Error(`Client C failed to fetch my-invoices: ${resC.statusText}`);
    const invoicesC: any[] = await resC.json();
    if (!invoicesC.some((inv) => inv.id === invoiceCId)) throw new Error("Client C did not find their own invoice");
    if (invoicesC.some((inv) => inv.id === invoiceAId || inv.id === invoiceBId)) {
      throw new Error("SECURITY FAILURE: Tenant Beta Client received Tenant Alpha invoices!");
    }
    console.log("  -> PASS: Strict cross-tenant isolation confirmed.\n");

    // --------------------------------------------------------------------------
    // Test 5: Client A CANNOT access Client B's project
    // --------------------------------------------------------------------------
    console.log("▶ [Test 5] Verifying Client A project isolation via GET /api/client/my-projects...");
    const resProjA = await fetch(`${baseUrl}/api/client/my-projects`, {
      headers: { Authorization: `Bearer ${tokenClientA}` },
    });
    if (!resProjA.ok) throw new Error(`Client A failed to fetch my-projects: ${resProjA.statusText}`);
    const projectsA: any[] = await resProjA.json();

    const hasProjectA = projectsA.some((p) => p.id === projectAId);
    const leaksProjectB = projectsA.some((p) => p.id === projectBId);

    if (!hasProjectA) throw new Error("Client A did not receive their own project");
    if (leaksProjectB) throw new Error("SECURITY FAILURE: Client A received Client B's project!");
    console.log("  -> PASS: Client A receives only their contracted project.\n");

    // --------------------------------------------------------------------------
    // Test 6: Missing Customer Linkage Fails Closed Safely (403)
    // --------------------------------------------------------------------------
    console.log("▶ [Test 6] Verifying missing customer linkage fails closed (403 CUSTOMER_NOT_LINKED)...");
    const resUnlinked = await fetch(`${baseUrl}/api/client/my-invoices`, {
      headers: { Authorization: `Bearer ${tokenUnlinked}` },
    });

    if (resUnlinked.status !== 403) {
      throw new Error(`Expected 403 for unlinked customer, got: ${resUnlinked.status}`);
    }
    const errPayload = await resUnlinked.json();
    if (errPayload.code !== "CUSTOMER_NOT_LINKED") {
      throw new Error(`Expected code CUSTOMER_NOT_LINKED, got: ${errPayload.code}`);
    }
    console.log("  -> PASS: Unlinked client is safely denied with 403 CUSTOMER_NOT_LINKED.\n");

    // --------------------------------------------------------------------------
    // Test 7: Tampering Resistance (Query param ?customerId=... is ignored)
    // --------------------------------------------------------------------------
    console.log("▶ [Test 7] Verifying query parameter tampering (?customerId=...) is strictly ignored...");
    const resTamper = await fetch(`${baseUrl}/api/client/my-invoices?customerId=${customerB.id}`, {
      headers: { Authorization: `Bearer ${tokenClientA}` },
    });
    if (!resTamper.ok) throw new Error("Tamper test request failed");
    const tamperInvoices: any[] = await resTamper.json();
    if (tamperInvoices.some((inv) => inv.id === invoiceBId)) {
      throw new Error("SECURITY FAILURE: Attacker accessed Client B's invoices via query param tampering!");
    }
    console.log("  -> PASS: Customer ID in query params was completely ignored; server resolved exclusively from session.\n");

    console.log("================================================================================");
    console.log("✅ ALL PRE-WAVE 4.1 PORTAL REMEDIATION & ISOLATION TESTS PASSED (7/7)");
    console.log("================================================================================\n");
  } finally {
    // Teardown test fixtures
    console.log("Cleaning up test records...");
    await prisma.saleDetail.deleteMany({ where: { saleId: { in: [invoiceAId, invoiceBId, invoiceCId].filter(Boolean) } } });
    await prisma.sale.deleteMany({ where: { id: { in: [invoiceAId, invoiceBId, invoiceCId].filter(Boolean) } } });
    await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projectAId, projectBId].filter(Boolean) } } });
    await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAlpha, tenantBeta] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [userClientA, userClientB, userClientC, userUnlinked] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userClientA, userClientB, userClientC, userUnlinked] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlpha, tenantBeta] } } });

    server.close();
  }
}

runClientPortalIsolationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
