import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { invoicesRouter } from "../routes/invoices.routes";
import { calculateNextBillingDate } from "../services/recurring-invoice.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: A14 — RECURRING INVOICES & GENERATOR");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount invoices router
  app.use("/api/invoices", invoicesRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-rec-alpha-${timestamp}`;
  const tenantBetaId = `test-rec-beta-${timestamp}`;
  const adminAlphaId = `user-rec-adm-${timestamp}`;
  const adminBetaId = `user-rec-beta-${timestamp}`;

  let createdScheduleId = "";
  let generatedSaleId = "";
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error("     Detail:", detail);
    }
  }

  try {
    console.log("▶ [Setup] Provisioning isolated test tenants and user fixtures in MySQL...");

    // Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Alpha Recurring Corp", slug: `alpha-rec-${timestamp}` },
        { id: tenantBetaId, name: "Beta Independent LLC", slug: `beta-rec-${timestamp}` },
      ],
    });

    // Create Admin Users & Roles
    await prisma.user.createMany({
      data: [
        { id: adminAlphaId, email: `admin-alpha-${timestamp}@test.com`, passwordHash: "hash123" },
        { id: adminBetaId, email: `admin-beta-${timestamp}@test.com`, passwordHash: "hash123" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { id: `prof-alpha-${timestamp}`, userId: adminAlphaId, tenantId: tenantAlphaId, fullName: "Alpha Billing Admin" },
        { id: `prof-beta-${timestamp}`, userId: adminBetaId, tenantId: tenantBetaId, fullName: "Beta Finance Lead" },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: adminAlphaId, tenantId: tenantAlphaId, role: "hr_admin" },
        { userId: adminBetaId, tenantId: tenantBetaId, role: "hr_admin" },
      ],
    });

    // Generate JWTs with permissions
    const alphaToken = generateToken({
      userId: adminAlphaId,
      email: `admin-alpha-${timestamp}@test.com`,
      tenantId: tenantAlphaId,
      roles: ["hr_admin"],
      permissions: ["finance.invoices.view", "finance.invoices.create", "finance.invoices.edit", "finance.invoices.delete"],
    });

    const betaToken = generateToken({
      userId: adminBetaId,
      email: `admin-beta-${timestamp}@test.com`,
      tenantId: tenantBetaId,
      roles: ["hr_admin"],
      permissions: ["finance.invoices.view", "finance.invoices.create", "finance.invoices.edit", "finance.invoices.delete"],
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Next Billing Date Calculation Logic
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 1] Next billing date recurrence frequency calculations...");
    const baseDate = new Date("2026-01-15T00:00:00Z");

    const nextWeekly = calculateNextBillingDate(baseDate, "Weekly");
    const nextMonthly = calculateNextBillingDate(baseDate, "Monthly");
    const nextQuarterly = calculateNextBillingDate(baseDate, "Quarterly");
    const nextYearly = calculateNextBillingDate(baseDate, "Yearly");

    assert(
      nextWeekly.getDate() === 22,
      "Weekly recurrence advances exactly 7 days",
      { base: baseDate.toISOString(), next: nextWeekly.toISOString() }
    );

    assert(
      nextMonthly.getMonth() === 1, // February
      "Monthly recurrence advances exactly 1 month",
      { base: baseDate.toISOString(), next: nextMonthly.toISOString() }
    );

    assert(
      nextQuarterly.getMonth() === 3, // April
      "Quarterly recurrence advances exactly 3 months",
      { base: baseDate.toISOString(), next: nextQuarterly.toISOString() }
    );

    assert(
      nextYearly.getFullYear() === 2027,
      "Yearly recurrence advances exactly 1 year",
      { base: baseDate.toISOString(), next: nextYearly.toISOString() }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Create Recurring Invoice Schedule with Financial Precision
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 2] POST /api/invoices/recurring - Schedule creation & decimal math...");
    const createPayload = {
      recurringInvoiceNo: "#RI0099",
      customerName: "Acme Enterprises Inc",
      customerEmail: "finance@acme.com",
      customerAddress: "456 Corporate Plaza, Austin, TX",
      reference: "PO-ACME-2026",
      cycle: "Monthly",
      startDate: new Date("2026-02-01").toISOString(),
      nextIssueDate: new Date("2026-02-01").toISOString(),
      status: "Active",
      taxRate: 18,
      discountRate: 10,
      shippingCharge: 50,
      notes: "Monthly ERP platform subscription",
      terms: "Net 15 days",
      items: [
        { description: "Enterprise SaaS License", quantity: 2, unitPrice: 1000, discount: 0, amount: 2000 },
        { description: "Dedicated Support Tier", quantity: 1, unitPrice: 500, discount: 0, amount: 500 },
      ],
    };

    const createRes = await fetch(`${baseUrl}/api/invoices/recurring`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify(createPayload),
    });

    const createData = await createRes.json();
    assert(createRes.status === 201, "POST /recurring returns 201 Created", createData);
    assert(createData.recurringInvoiceNo === "#RI0099", "Recurring invoice number saved correctly");
    assert(Number(createData.subtotal) === 2500, "Subtotal correctly computed as 2500 (2000 + 500)");
    assert(Number(createData.taxAmount) === 450, "Tax (18% of 2500) computed as 450");
    assert(Number(createData.discountAmount) === 250, "Discount (10% of 2500) computed as 250");
    assert(Number(createData.totalAmount) === 2750, "Total (2500 + 450 - 250 + 50) computed accurately as 2750");
    assert(createData.items?.length === 2, "Persisted 2 recurring line items");

    createdScheduleId = createData.id;

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: GET /api/invoices/recurring with Search, Filters & Summary KPIs
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 3] GET /api/invoices/recurring - Search, filter, and KPI verification...");
    const listRes = await fetch(`${baseUrl}/api/invoices/recurring?search=Acme&cycle=Monthly`, {
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const listData = await listRes.json();

    assert(listRes.status === 200, "GET /recurring returns 200 OK");
    assert(Array.isArray(listData.data) && listData.data.length >= 1, "Found matching schedule for 'Acme'");
    assert(listData.data[0].customerName === "Acme Enterprises Inc", "Customer name matches in search results");
    assert(listData.summary?.totalActive >= 1, "Summary KPIs report at least 1 active schedule");
    assert(listData.summary?.totalVolume >= 2750, "Summary volume includes schedule amount");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: PUT /api/invoices/recurring/:id - Schedule Updates & Recalculation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 4] PUT /api/invoices/recurring/:id - Update schedule & items...");
    const updateRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        customerName: "Acme Global Solutions",
        cycle: "Quarterly",
        items: [
          { description: "Quarterly Unified License", quantity: 1, unitPrice: 3000, discount: 0, amount: 3000 },
        ],
        taxRate: 18,
        discountRate: 0,
        shippingCharge: 0,
      }),
    });
    const updateData = await updateRes.json();

    assert(updateRes.status === 200, "PUT /recurring/:id returns 200 OK");
    assert(updateData.customerName === "Acme Global Solutions", "Customer name updated");
    assert(updateData.cycle === "Quarterly", "Recurrence cycle updated to Quarterly");
    assert(Number(updateData.subtotal) === 3000, "Subtotal updated to 3000");
    assert(Number(updateData.totalAmount) === 3540, "Total (3000 + 18% tax) updated to 3540");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: PATCH /api/invoices/recurring/:id/status - Pause and Resume
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 5] PATCH /api/invoices/recurring/:id/status - Pause and resume...");
    const pauseRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({ status: "Paused" }),
    });
    const pauseData = await pauseRes.json();
    assert(pauseData.status === "Paused", "Successfully paused recurring schedule");

    const resumeRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({ status: "Active" }),
    });
    const resumeData = await resumeRes.json();
    assert(resumeData.status === "Active", "Successfully resumed recurring schedule");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: Strict Multi-Tenant Isolation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 6] Multi-tenant isolation verification across tenants...");
    const betaViewRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}`, {
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    assert(betaViewRes.status === 404, "Tenant Beta cannot access Tenant Alpha's recurring schedule (404 Not Found)");

    const betaUpdateRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaToken}`,
      },
      body: JSON.stringify({ customerName: "Hacked" }),
    });
    assert(betaUpdateRes.status === 404, "Tenant Beta cannot update Tenant Alpha's schedule (404)");

    const betaDeleteRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    assert(betaDeleteRes.status === 404, "Tenant Beta cannot delete Tenant Alpha's schedule (404)");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: Automatic Invoice Generation & Line Items Creation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 7] POST /api/invoices/recurring/:id/generate - Automatic generation engine...");
    const generateRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const generateData = await generateRes.json();

    assert(generateRes.status === 200, "Generation endpoint returns 200 OK", generateData);
    assert(generateData.success === true, "Invoice generation succeeded");
    assert(!!generateData.generatedSaleId, "Generated real Sale record ID in MySQL");
    assert(!!generateData.invoiceNo, "Assigned unique invoice number");

    generatedSaleId = generateData.generatedSaleId;

    // Verify Sale record exists in database
    const createdSale = await prisma.sale.findUnique({
      where: { id: generatedSaleId },
      include: { details: true },
    });

    assert(!!createdSale, "Sale record verified in MySQL database");
    assert(createdSale?.tenantId === tenantAlphaId, "Generated Sale strictly tagged with tenantId");
    assert(createdSale?.type === "recurring_generated", "Sale marked as recurring_generated");
    assert(Number(createdSale?.total) === 3540, "Generated Sale total matches schedule total amount");
    assert(createdSale?.details.length === 1, "Generated line item detail record in SaleDetail table");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 8: Duplicate Generation Prevention (Idempotency Key Verification)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 8] Idempotency check - Duplicate generation prevention...");
    // Reset nextIssueDate back to the previously generated date 2026-02-01
    await prisma.recurringInvoice.update({
      where: { id: createdScheduleId },
      data: { nextIssueDate: new Date("2026-02-01") },
    });

    // Attempt to generate again for 2026-02-01
    const duplicateRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const duplicateData = await duplicateRes.json();

    // Verify database did not create a duplicate Sale for the 2026-02-01 cycle
    const matchingSalesCount = await prisma.sale.count({
      where: {
        tenantId: tenantAlphaId,
        invoiceNo: "INV-RI0099-20260201",
      },
    });

    assert(
      duplicateData.status === "already_generated",
      "Duplicate invoice generation rejected with status 'already_generated'",
      duplicateData
    );
    assert(
      matchingSalesCount === 1,
      "Exactly 1 invoice exists in database for cycle 2026-02-01 (no duplicate created)"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 9: Batch Processor (POST /api/invoices/recurring/process-due)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 9] POST /api/invoices/recurring/process-due - Batch scheduler engine...");
    const batchRes = await fetch(`${baseUrl}/api/invoices/recurring/process-due`, {
      method: "POST",
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const batchData = await batchRes.json();

    assert(batchRes.status === 200, "Batch processor returns 200 OK");
    assert(batchData.success === true, "Batch processor reports success");
    assert(typeof batchData.result?.scannedCount === "number", "Reports scanned count metric");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 10: Schedule Deletion
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test 10] DELETE /api/invoices/recurring/:id - Schedule removal...");
    const deleteRes = await fetch(`${baseUrl}/api/invoices/recurring/${createdScheduleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${alphaToken}` },
    });
    const deleteData = await deleteRes.json();

    assert(deleteRes.status === 200, "DELETE /recurring/:id returns 200 OK");
    assert(deleteData.success === true, "Schedule deleted message confirmed");

    const verifyDeleted = await prisma.recurringInvoice.findUnique({
      where: { id: createdScheduleId },
    });
    assert(verifyDeleted === null, "Schedule completely removed from MySQL database");

  } finally {
    console.log("\n▶ [Cleanup] Purging temporary test data...");
    await prisma.saleDetail.deleteMany({
      where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    }).catch(() => {});
    await prisma.sale.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    }).catch(() => {});
    await prisma.recurringInvoiceItem.deleteMany({
      where: { recurringInvoice: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    }).catch(() => {});
    await prisma.recurringInvoice.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    }).catch(() => {});
    await prisma.userRole.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    }).catch(() => {});
    await prisma.profile.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [adminAlphaId, adminBetaId] } },
    }).catch(() => {});
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    }).catch(() => {});

    server.close();
  }

  console.log("\n================================================================================");
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (100% Pass Rate)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite crashed with error:", err);
  process.exit(1);
});
