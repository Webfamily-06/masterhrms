import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { salesRouter } from "../routes/sales.routes";
import { invoicesRouter } from "../routes/invoices.routes";
import { customersRouter } from "../routes/customers.routes";
import { productsRouter } from "../routes/products.routes";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

interface TestReportItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
}

const report: TestReportItem[] = [];

async function runStep35TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.5: SALES, POS REGISTERS & ACCOUNTS RECEIVABLE TEST SUITE");
  console.log("Coverage: POS Checkout, Stock Engine, AR Invoicing, Customer Payments, GL Journals, Shifts");
  console.log("Runtime: Node.js 20 LTS | Prisma 5.22.0 | Express 4 | MySQL/MariaDB master_hrms_dev");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  app.use("/api/sales", salesRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/products", productsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Unique test tenants
  const tenantA = `step35_tenant_a_${Date.now()}`;
  const tenantB = `step35_tenant_b_${Date.now()}`;

  const userA = `user_a_${Date.now()}`;
  const userB = `user_b_${Date.now()}`;

  const tokenA = generateToken({
    userId: userA,
    email: "cashier.a@enterprise.com",
    roles: ["admin"],
    tenantId: tenantA,
    permissions: [
      "sales.invoices.view",
      "sales.invoices.create",
      "sales.invoices.update",
      "sales.invoices.pay",
      "finance.invoices.view",
      "finance.invoices.create",
      "finance.invoices.update",
      "finance.invoices.pay",
      "inventory.products.view",
      "inventory.products.manage",
    ],
  });

  const tokenB = generateToken({
    userId: userB,
    email: "cashier.b@enterprise.com",
    roles: ["admin"],
    tenantId: tenantB,
    permissions: ["sales.invoices.view", "sales.invoices.create", "finance.invoices.view"],
  });

  let warehouseA: any;
  let productA: any;
  let customerA: any;

  try {
    // 1. Seed Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantA, slug: tenantA, name: "Alpha Retail Corporation" },
        { id: tenantB, slug: tenantB, name: "Beta Enterprise Holdings" },
      ],
      skipDuplicates: true,
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantA,
      name: "Alpha Retail Corporation",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantB,
      name: "Beta Enterprise Holdings",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // Create users, profiles, and roles
    await prisma.user.createMany({
      data: [
        { id: userA, email: "cashier.a@enterprise.com", passwordHash: "dummy" },
        { id: userB, email: "cashier.b@enterprise.com", passwordHash: "dummy" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: userA, email: "cashier.a@enterprise.com", fullName: "Cashier A", tenantId: tenantA },
        { userId: userB, email: "cashier.b@enterprise.com", fullName: "Cashier B", tenantId: tenantB },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: userA, role: "hr_admin", tenantId: tenantA },
        { userId: userB, role: "hr_admin", tenantId: tenantB },
      ],
    });


    // Seed Warehouse for Tenant A
    warehouseA = await prisma.warehouse.create({
      data: {
        tenantId: tenantA,
        name: "Central Retail Hub A",
        location: "Floor 1, Terminal Terminal A",
        isDefault: true,
      },
    });

    // Seed Product with 100 stock
    productA = await prisma.product.create({
      data: {
        tenantId: tenantA,
        name: "Ergonomic Mechanical Keyboard",
        sku: `KB-${Date.now()}`,
        type: "Product",
        salePrice: 2000,
        purchasePrice: 1200,
        warehouseStocks: {
          create: {
            warehouseId: warehouseA.id,
            quantity: 100,
          },
        },
      },
    });


    // Seed Customer for Tenant A
    customerA = await prisma.customer.create({
      data: {
        tenantId: tenantA,
        name: "Starlight Technologies Ltd",
        email: "finance@starlight.io",
        phone: "+91 9988776655",
        gstin: "27AABCS1429B1Z1",
        creditLimit: 100000,
      },
    });

    // -------------------------------------------------------------------------
    // TEST 1: POS Sale Checkout & Centralized Stock Decrement & GL Posting
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const posPayload = {
        type: "pos",
        receiptNo: `REC-POS-${Date.now()}`,
        warehouseId: warehouseA.id,
        customerId: customerA.id,
        customerName: customerA.name,
        paymentMode: "Cash",
        paymentStatus: "paid",
        subtotal: 4000,
        taxMode: "sgst_cgst",
        cgst: 360,
        sgst: 360,
        igst: 0,
        totalTax: 720,
        total: 4720,
        paidAmount: 4720,
        items: [
          {
            id: productA.id,
            name: productA.name,
            qty: 2,
            price: 2000,
            taxRate: 18,
            taxAmount: 720,
            subtotal: 4720,
          },
        ],
      };

      const res = await fetch(`${baseUrl}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(posPayload),
      });

      const body = await res.json();
      const passed = res.status === 201 && body.success === true && !!body.sale?.id;

      // Verify stock was decremented from 100 to 98
      const pw = await prisma.productWarehouse.findFirst({
        where: { productId: productA.id, warehouseId: warehouseA.id },
      });
      const stockOk = Number(pw?.quantity) === 98;

      // Verify GL Journal Entry auto-posted
      // Give async worker 300ms
      await new Promise((r) => setTimeout(r, 300));
      const je = await prisma.journalEntry.findFirst({
        where: { tenantId: tenantA, reference: body.sale?.id },
        include: { items: { include: { account: true } } },
      });

      const totalDebit = je?.items.reduce((s, i) => s + Number(i.debit), 0) || 0;
      const totalCredit = je?.items.reduce((s, i) => s + Number(i.credit), 0) || 0;
      const glBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit === 4720;

      report.push({
        id: "T1",
        name: "POS Sale Checkout, Atomic Stock Decrement & Balanced GL Auto-Posting",
        category: "POS Billing",
        passed: passed && stockOk && glBalanced,
        durationMs: Date.now() - start,
        evidence: `Sale ID: ${body.sale?.id}, Stock: ${pw?.quantity} (decremented 2 units), GL Balanced: ${glBalanced} (Debit ${totalDebit} = Credit ${totalCredit})`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Credit Sale / Unpaid B2B Invoice & Accounts Receivable Ledger Posting
    // -------------------------------------------------------------------------
    let invoiceId = "";
    {
      const start = Date.now();
      const invoicePayload = {
        number: `INV-2026-${Date.now().toString().slice(-4)}`,
        client: customerA.name,
        clientGstin: customerA.gstin,
        status: "sent",
        subtotal: 10000,
        taxMode: "sgst_cgst",
        cgst: 900,
        sgst: 900,
        igst: 0,
        total: 11800,
        amount: 11800,
        lines: [
          {
            description: "Enterprise ERP Software License",
            hsn_sac: "998314",
            qty: 1,
            unit: "Pcs",
            rate: 10000,
            gst_rate: 18,
            amount: 10000,
            gst_amount: 1800,
          },
        ],
      };

      const res = await fetch(`${baseUrl}/api/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(invoicePayload),
      });

      const body = await res.json();
      invoiceId = body.id;
      const passed = res.status === 201 && !!invoiceId;

      await new Promise((r) => setTimeout(r, 300));
      const je = await prisma.journalEntry.findFirst({
        where: { tenantId: tenantA, reference: invoiceId },
        include: { items: { include: { account: true } } },
      });

      // Credit sale debits Accounts Receivable (1030)
      const arItem = je?.items.find((i) => i.account.accountCode === "1030");
      const revItem = je?.items.find((i) => i.account.accountCode === "4010");
      const taxItem = je?.items.find((i) => i.account.accountCode === "2020");

      const arOk = Number(arItem?.debit) === 11800;
      const revOk = Number(revItem?.credit) === 10000;
      const taxOk = Number(taxItem?.credit) === 1800;

      report.push({
        id: "T2",
        name: "Credit Sale / Unpaid B2B Invoice & Accounts Receivable Ledger Posting",
        category: "Invoicing & AR",
        passed: passed && arOk && revOk && taxOk,
        durationMs: Date.now() - start,
        evidence: `Invoice: ${body.number}, AR (1030) Dr: ${arItem?.debit}, Rev (4010) Cr: ${revItem?.credit}, Tax (2020) Cr: ${taxItem?.credit}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Partial Customer Payment Settlement (Dr Bank 1020, Cr AR 1030)
    // -------------------------------------------------------------------------
    let payment1Id = "";
    {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amount: 5000,
          method: "Bank Transfer",
          referenceNo: `UTR-${Date.now()}`,
          notes: "First installment via NEFT",
        }),
      });

      const body = await res.json();
      payment1Id = body.payment?.id;

      const statusPassed =
        res.status === 201 &&
        body.invoice?.paidAmount === 5000 &&
        body.invoice?.paymentStatus === "partial" &&
        body.invoice?.remainingBalance === 6800;

      await new Promise((r) => setTimeout(r, 300));
      const je = await prisma.journalEntry.findFirst({
        where: { tenantId: tenantA, reference: `pay-sale-${payment1Id}` },
        include: { items: { include: { account: true } } },
      });

      const bankItem = je?.items.find((i) => i.account.accountCode === "1020");
      const arItem = je?.items.find((i) => i.account.accountCode === "1030");

      const glPassed =
        Number(bankItem?.debit) === 5000 && Number(arItem?.credit) === 5000;

      report.push({
        id: "T3",
        name: "Partial Customer Payment Recording & AR Clearance GL Posting",
        category: "Accounts Receivable",
        passed: statusPassed && glPassed,
        durationMs: Date.now() - start,
        evidence: `Paid: 5000, Status: ${body.invoice?.paymentStatus}, Remaining: ${body.invoice?.remainingBalance}, GL: Dr Bank (1020) ${bankItem?.debit} / Cr AR (1030) ${arItem?.credit}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Second Payment Settlement Completes Payment (unpaid -> partial -> paid)
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/sales/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amount: 6800,
          method: "Bank Transfer",
          referenceNo: `UTR-FINAL-${Date.now()}`,
          notes: "Final settlement installment",
        }),
      });

      const body = await res.json();
      const passed =
        res.status === 201 &&
        body.sale?.paidAmount === 11800 &&
        body.sale?.paymentStatus === "paid" &&
        body.sale?.remainingBalance === 0;

      // Verify payment stream shows both installments
      const streamRes = await fetch(`${baseUrl}/api/invoices/${invoiceId}/payments`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const streamBody = await streamRes.json();
      if (!streamBody.payments) {
        console.log("DEBUG streamRes status:", streamRes.status, "body:", streamBody);
      }
      const streamPassed =
        streamBody.payments?.length === 2 &&
        streamBody.paidAmount === 11800 &&
        streamBody.paymentStatus === "paid";


      report.push({
        id: "T4",
        name: "Full Settlement Transition & Payment History Stream",
        category: "Accounts Receivable",
        passed: passed && streamPassed,
        durationMs: Date.now() - start,
        evidence: `Final Paid: ${body.sale?.paidAmount}, Status: ${body.sale?.paymentStatus}, Stream Count: ${streamBody.payments?.length}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Overpayment Guard
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Invoice is now fully paid (balance 0), attempting to record 100 should fail
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amount: 100,
          method: "Cash",
        }),
      });

      const body = await res.json();
      const passed = res.status === 400 && body.code === "OVERPAYMENT";

      report.push({
        id: "T5",
        name: "Overpayment Guard (Rejection of Payment > Remaining Balance)",
        category: "Integrity Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status}, Error: "${body.error}", Code: ${body.code}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 6: Zero / Negative Amount Rejection
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/sales/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ amount: -50 }),
      });

      const passed = res.status === 400;

      report.push({
        id: "T6",
        name: "Zero / Negative Payment Amount Rejection Guard",
        category: "Input Validation",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} rejected negative payment`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7: Idempotency Key Guard
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Create a fresh test sale to test idempotency
      const testSale = await prisma.sale.create({
        data: {
          tenantId: tenantA,
          invoiceNo: `IDEMP-SALE-${Date.now()}`,
          total: 5000,
          paidAmount: 0,
          paymentStatus: "unpaid",
        },
      });

      const idemKey = `idem-sale-pay-${Date.now()}`;
      const res1 = await fetch(`${baseUrl}/api/sales/${testSale.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amount: 2000,
          idempotencyKey: idemKey,
          method: "UPI",
        }),
      });

      const res2 = await fetch(`${baseUrl}/api/sales/${testSale.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amount: 2000,
          idempotencyKey: idemKey,
          method: "UPI",
        }),
      });

      const body2 = await res2.json();
      const passed = res1.status === 201 && res2.status === 409 && body2.code === "DUPLICATE_PAYMENT";

      report.push({
        id: "T7",
        name: "Payment Idempotency Key Guard (Duplicate Prevention)",
        category: "Idempotency",
        passed,
        durationMs: Date.now() - start,
        evidence: `1st request: HTTP ${res1.status}, 2nd request: HTTP ${res2.status} (${body2.code})`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 8: Cross-Tenant Isolation
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Tenant B attempts to record payment on Tenant A's invoice
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`, // Tenant B credentials!
        },
        body: JSON.stringify({ amount: 100 }),
      });

      const passed = res.status === 404;

      // Tenant B attempts to get Tenant A's invoice payments
      const resGet = await fetch(`${baseUrl}/api/invoices/${invoiceId}/payments`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const getPassed = resGet.status === 404;

      report.push({
        id: "T8",
        name: "Strict Multi-Tenant Isolation (Cross-Tenant Access Rejection)",
        category: "Multi-Tenant Security",
        passed: passed && getPassed,
        durationMs: Date.now() - start,
        evidence: `Cross-tenant POST: HTTP ${res.status}, Cross-tenant GET: HTTP ${resGet.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 9: Cash Register Shift Lifecycle & Variance Reconciliation
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // 1. Open shift with float of 500
      const openRes = await fetch(`${baseUrl}/api/sales/register/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          openingFloat: 500,
          notes: "Morning Shift Opening",
        }),
      });
      const openBody = await openRes.json();
      const openPassed = openRes.status === 201 && Number(openBody.shift?.openingFloat) === 500;

      // 2. Perform cash in drawer drop of 200
      const dropRes = await fetch(`${baseUrl}/api/sales/register/drop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          type: "in",
          amount: 200,
          reason: "Add small change",
        }),
      });
      const dropBody = await dropRes.json();
      const dropPassed = dropRes.status === 200 && Number(dropBody.shift?.expectedCash) === 700;

      // 3. Close shift with physical cash drawer count of 690 (variance -10)
      const closeRes = await fetch(`${baseUrl}/api/sales/register/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          actualCash: 690,
          notes: "End of shift count. ₹10 shortage.",
        }),
      });
      const closeBody = await closeRes.json();
      const closePassed =
        closeRes.status === 200 &&
        closeBody.report?.expectedCash === 700 &&
        closeBody.report?.actualCash === 690 &&
        closeBody.report?.variance === -10;

      report.push({
        id: "T9",
        name: "POS Cash Register Shift Lifecycle & Discrepancy Variance Calculation",
        category: "POS Terminal",
        passed: openPassed && dropPassed && closePassed,
        durationMs: Date.now() - start,
        evidence: `Opened float: 500, Drop in: 200, Expected: ${closeBody.report?.expectedCash}, Actual: ${closeBody.report?.actualCash}, Variance: ${closeBody.report?.variance}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 10: Customer Accounts Receivable (AR) Analytics & Stream
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Tenant-wide AR summary
      const arRes = await fetch(`${baseUrl}/api/customers/ar-summary`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const arBody = await arRes.json();
      const arSummaryPassed =
        arRes.status === 200 &&
        arBody.data?.totalInvoiced > 0 &&
        arBody.data?.totalCollected > 0;

      // Customer payments stream
      const custPayRes = await fetch(`${baseUrl}/api/customers/${customerA.id}/payments`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const custPayBody = await custPayRes.json();
      const custPayPassed =
        custPayRes.status === 200 && Array.isArray(custPayBody.data);

      report.push({
        id: "T10",
        name: "Customer Accounts Receivable Metrics & Payment History Stream",
        category: "Analytics & AR",
        passed: arSummaryPassed && custPayPassed,
        durationMs: Date.now() - start,
        evidence: `Tenant Total Invoiced: ${arBody.data?.totalInvoiced}, Total Collected: ${arBody.data?.totalCollected}, Customer Payments Count: ${custPayBody.data?.length}`,
      });
    }
  } finally {
    // Teardown
    await new Promise((resolve) => server.close(resolve));
    await prisma.salePayment.deleteMany({ where: { sale: { tenantId: { in: [tenantA, tenantB] } } } });
    await prisma.saleDetail.deleteMany({ where: { sale: { tenantId: { in: [tenantA, tenantB] } } } });
    await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.registerShift.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.cashRegister.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.journalItem.deleteMany({ where: { journalEntry: { tenantId: { in: [tenantA, tenantB] } } } });
    await prisma.journalEntry.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.productWarehouse.deleteMany({ where: { warehouse: { tenantId: { in: [tenantA, tenantB] } } } });
    await prisma.product.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.warehouse.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  }

  // Print results
  console.log("\n--------------------------------------------------------------------------------");
  console.log("TEST RESULTS MATRIX:");
  console.log("--------------------------------------------------------------------------------");
  let passedCount = 0;
  for (const item of report) {
    if (item.passed) passedCount++;
    const icon = item.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${icon} [${item.id}] [${item.category}] ${item.name} (${item.durationMs}ms)`);
    console.log(`       Evidence: ${item.evidence}`);
  }
  console.log("--------------------------------------------------------------------------------");
  console.log(`TOTAL: ${report.length} | PASSED: ${passedCount} | FAILED: ${report.length - passedCount}`);
  console.log("================================================================================\n");

  if (passedCount !== report.length) {
    process.exit(1);
  }
}

runStep35TestSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
