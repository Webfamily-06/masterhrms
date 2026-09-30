import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { salesRouter } from "../routes/sales.routes";
import { purchasesRouter } from "../routes/purchases.routes";
import { returnsRouter } from "../routes/returns.routes";
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

async function runStep36TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.6: SALES & PURCHASE RETURNS (CREDIT/DEBIT NOTES) SUITE");
  console.log("Coverage: Sales/Purchase Returns, Credit/Debit Notes, Atomic Stock, GL Posting, Overdraft Guards, Multi-Tenant Isolation");
  console.log("Runtime: Node.js 20 LTS | Prisma 5.22.0 | Express 4 | MySQL/MariaDB master_hrms_dev");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  app.use("/api/sales", salesRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/returns", returnsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Unique test tenants
  const tenantA = `step36_tenant_a_${Date.now()}`;
  const tenantB = `step36_tenant_b_${Date.now()}`;

  const userA = `user_a_${Date.now()}`;
  const userB = `user_b_${Date.now()}`;

  const tokenA = generateToken({
    userId: userA,
    email: "manager.a@enterprise.com",
    roles: ["admin"],
    tenantId: tenantA,
  });

  const tokenB = generateToken({
    userId: userB,
    email: "manager.b@enterprise.com",
    roles: ["admin"],
    tenantId: tenantB,
  });

  let warehouseA: any;
  let productA: any;
  let customerA: any;
  let supplierA: any;
  let saleA: any;
  let purchaseA: any;
  let salesReturn1: any;
  let purchaseReturn1: any;

  try {
    // 1. Seed Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantA, slug: tenantA, name: "Alpha Returns Corp" },
        { id: tenantB, slug: tenantB, name: "Beta Returns Corp" },
      ],
      skipDuplicates: true,
    });

    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantA,
      name: "Alpha Returns Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });
    TenantConnectionManager.getInstance().registerTenant({
      tenantId: tenantB,
      name: "Beta Returns Corp",
      strategy: "SHARED_SCHEMA",
      status: "ACTIVE",
    });

    // Create users, profiles, and roles
    await prisma.user.createMany({
      data: [
        { id: userA, email: "manager.a@enterprise.com", passwordHash: "dummy" },
        { id: userB, email: "manager.b@enterprise.com", passwordHash: "dummy" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: userA, email: "manager.a@enterprise.com", fullName: "Manager A", tenantId: tenantA },
        { userId: userB, email: "manager.b@enterprise.com", fullName: "Manager B", tenantId: tenantB },
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
        name: "Returns Central Warehouse",
        location: "Logistics Hub 1",
        isDefault: true,
      },
    });

    // Seed Product with 50 stock in warehouse
    productA = await prisma.product.create({
      data: {
        tenantId: tenantA,
        name: "Enterprise Noise Cancelling Headset",
        sku: `HD-${Date.now()}`,
        type: "Product",
        salePrice: 1000,
        purchasePrice: 600,
        warehouseStocks: {
          create: {
            warehouseId: warehouseA.id,
            quantity: 50,
          },
        },
      },
    });

    // Seed Customer for Tenant A
    customerA = await prisma.customer.create({
      data: {
        tenantId: tenantA,
        name: "Apex Global Solutions",
        email: "ap@apexsolutions.io",
        phone: "+91 9876543210",
        creditLimit: 200000,
      },
    });

    // Seed Supplier for Tenant A
    supplierA = await prisma.supplier.create({
      data: {
        tenantId: tenantA,
        name: "Global Audio Hardware Ltd",
        email: "orders@globalaudio.com",
        phone: "+91 9123456780",
      },
    });

    // Create initial Sale (5 units @ 1000 each = 5000 subtotal, 900 tax, 5900 total)
    saleA = await prisma.sale.create({
      data: {
        tenantId: tenantA,
        invoiceNo: `INV-RET-${Date.now()}`,
        date: new Date(),
        type: "pos",
        warehouseId: warehouseA.id,
        customerId: customerA.id,
        customerName: customerA.name,
        cashierName: "Manager A",
        subtotal: 5000,
        totalTax: 900,
        total: 5900,
        paidAmount: 5900,
        paymentStatus: "paid",
        paymentMethod: "Cash",
        details: {
          create: [
            {
              productId: productA.id,
              productName: productA.name,
              sku: productA.sku,
              quantity: 5,
              price: 1000,
              subtotal: 5000,
              taxRate: 18,
              taxAmount: 900,
            },
          ],
        },
      },
      include: { details: true },
    });

    // Create initial Purchase (10 units @ 600 each = 6000 subtotal, 1080 tax, 7080 total)
    purchaseA = await prisma.purchase.create({
      data: {
        tenantId: tenantA,
        purchaseNo: `PO-RET-${Date.now()}`,
        date: new Date(),
        status: "received",
        warehouseId: warehouseA.id,
        supplierId: supplierA.id,
        total: 7080,
        paidAmount: 7080,
        paymentStatus: "paid",
        details: {
          create: [
            {
              productId: productA.id,
              productName: productA.name,
              quantity: 10,
              cost: 600,
              subtotal: 6000,
              taxRate: 18,
            },
          ],
        },
      },
      include: { details: true },
    });

    // -------------------------------------------------------------------------
    // TEST 1: Partial Sales Return Creation & Returnable Calculation
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const saleDetail = saleA.details[0];

      const res = await fetch(`${baseUrl}/api/returns/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          saleId: saleA.id,
          warehouseId: warehouseA.id,
          reason: "Customer ordered excess units",
          items: [
            {
              productId: productA.id,
              originalDetailId: saleDetail.id,
              productName: productA.name,
              quantity: 2,
              unitPrice: 1000,
              taxRate: 18,
              isRestocked: true,
            },
          ],
        }),
      });

      const data = await res.json();
      const passed =
        res.status === 201 &&
        data.status === "draft" &&
        data.returnNumber?.startsWith("SR-") &&
        Number(data.subtotal) === 2000 &&
        Number(data.taxAmount) === 360 &&
        Number(data.totalAmount) === 2360 &&
        data.details?.length === 1;

      salesReturn1 = data;

      report.push({
        id: "T1",
        name: "Partial Sales Return creation & returnable quantity calculation",
        category: "Sales Returns",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Return: ${data.returnNumber} | Total: ${data.totalAmount} | Status: ${data.status}`,
      });
      console.log(`[T1] ${passed ? "PASS" : "FAIL"}: Sales Return Created (${data.returnNumber})`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Sales Return Approval -> Credit Note Auto-Generation
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/returns/sales/${salesReturn1.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const data = await res.json();
      const creditNote = data.creditNote;
      const passed =
        res.status === 200 &&
        data.return?.status === "approved" &&
        creditNote &&
        creditNote.noteNumber?.startsWith("CN-") &&
        Number(creditNote.amount) === 2360 &&
        Number(creditNote.balanceAmount) === 2360 &&
        creditNote.status === "active";

      report.push({
        id: "T2",
        name: "Sales Return Approval -> Credit Note auto-generation (CN-YYYY-XXXX)",
        category: "Credit Notes",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Credit Note: ${creditNote?.noteNumber} | Balance: ${creditNote?.balanceAmount}`,
      });
      console.log(`[T2] ${passed ? "PASS" : "FAIL"}: Credit Note Issued (${creditNote?.noteNumber})`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Sales Return Completion -> Atomic Restock & Balanced GL Auto-Posting
    // -------------------------------------------------------------------------
    {
      const start = Date.now();

      // Check stock before completion
      const stockBefore = await prisma.productWarehouse.findUnique({
        where: {
          productId_warehouseId: {
            productId: productA.id,
            warehouseId: warehouseA.id,
          },
        },
      });

      const res = await fetch(`${baseUrl}/api/returns/sales/${salesReturn1.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const data = await res.json();

      // Check stock after completion
      const stockAfter = await prisma.productWarehouse.findUnique({
        where: {
          productId_warehouseId: {
            productId: productA.id,
            warehouseId: warehouseA.id,
          },
        },
      });

      // Check GL journal entry
      const je = await prisma.journalEntry.findFirst({
        where: { tenantId: tenantA, reference: salesReturn1.id },
        include: { items: true },
      });

      let balanced = false;
      if (je && je.items.length >= 2) {
        const totalDebit = je.items.reduce((sum, item) => sum + Number(item.debit), 0);
        const totalCredit = je.items.reduce((sum, item) => sum + Number(item.credit), 0);
        balanced = Math.abs(totalDebit - totalCredit) < 0.01;
      }

      const restocked =
        Number(stockAfter?.quantity) === Number(stockBefore?.quantity) + 2;

      const passed =
        res.status === 200 &&
        data.status === "completed" &&
        restocked &&
        balanced;

      report.push({
        id: "T3",
        name: "Sales Return Completion -> Atomic restock via InventoryMovementService & balanced GL auto-posting",
        category: "Sales Returns",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Stock Restocked: +2 (Before: ${stockBefore?.quantity}, After: ${stockAfter?.quantity}) | JE ${je?.entryNumber} Balanced: ${balanced}`,
      });
      console.log(`[T3] ${passed ? "PASS" : "FAIL"}: Sales Return Completed, Stock +2 & GL Balanced`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Sales Return Quantity Overdraft Guard
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Sale had 5 units originally. 2 already returned. Only 3 remain returnable.
      // Attempting to return 4 units must fail with HTTP 400.
      const res = await fetch(`${baseUrl}/api/returns/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          saleId: saleA.id,
          warehouseId: warehouseA.id,
          items: [
            {
              productId: productA.id,
              originalDetailId: saleA.details[0].id,
              productName: productA.name,
              quantity: 4, // 4 > 3 remaining
              unitPrice: 1000,
            },
          ],
        }),
      });

      const data = await res.json();
      const passed = res.status === 400 && data.error?.includes("exceeds available");

      report.push({
        id: "T4",
        name: "Sales Return Quantity Overdraft Guard (Attempting to return more than sold -> 400)",
        category: "Validation Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Error: "${data.error}"`,
      });
      console.log(`[T4] ${passed ? "PASS" : "FAIL"}: Overdraft Rejected: ${data.error}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Full Sales Return & Second Return Rejection (Return Exhaustion Guard)
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Return remaining 3 units
      const res2 = await fetch(`${baseUrl}/api/returns/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          saleId: saleA.id,
          warehouseId: warehouseA.id,
          items: [
            {
              productId: productA.id,
              originalDetailId: saleA.details[0].id,
              productName: productA.name,
              quantity: 3,
              unitPrice: 1000,
            },
          ],
        }),
      });
      const data2 = await res2.json();

      // Now all 5 units are returned (2 + 3 = 5). Attempting to return even 1 more unit should fail with 400.
      const res3 = await fetch(`${baseUrl}/api/returns/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          saleId: saleA.id,
          warehouseId: warehouseA.id,
          items: [
            {
              productId: productA.id,
              originalDetailId: saleA.details[0].id,
              productName: productA.name,
              quantity: 1,
              unitPrice: 1000,
            },
          ],
        }),
      });

      const data3 = await res3.json();
      const passed = res2.status === 201 && res3.status === 400;

      report.push({
        id: "T5",
        name: "Full Sales Return & Second Return Rejection (Return exhaustion guard -> 400)",
        category: "Validation Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `Return 2 HTTP ${res2.status} | Return 3 HTTP ${res3.status} ("${data3.error}")`,
      });
      console.log(`[T5] ${passed ? "PASS" : "FAIL"}: Return Exhaustion Enforced (5/5 units returned)`);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Partial Purchase Return Creation & Returnable Calculation
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const poDetail = purchaseA.details[0];

      const res = await fetch(`${baseUrl}/api/returns/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          purchaseId: purchaseA.id,
          warehouseId: warehouseA.id,
          reason: "Defective batch from supplier",
          items: [
            {
              productId: productA.id,
              originalDetailId: poDetail.id,
              productName: productA.name,
              quantity: 3,
              unitCost: 600,
              taxRate: 18,
            },
          ],
        }),
      });

      const data = await res.json();
      const passed =
        res.status === 201 &&
        data.status === "draft" &&
        data.returnNumber?.startsWith("PR-") &&
        Number(data.subtotal) === 1800 &&
        Number(data.taxAmount) === 324 &&
        Number(data.totalAmount) === 2124 &&
        data.details?.length === 1;

      purchaseReturn1 = data;

      report.push({
        id: "T6",
        name: "Partial Purchase Return creation & returnable quantity calculation",
        category: "Purchase Returns",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Return: ${data.returnNumber} | Total: ${data.totalAmount} | Status: ${data.status}`,
      });
      console.log(`[T6] ${passed ? "PASS" : "FAIL"}: Purchase Return Created (${data.returnNumber})`);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Purchase Return Approval -> Debit Note Auto-Generation
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/returns/purchases/${purchaseReturn1.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const data = await res.json();
      const debitNote = data.debitNote;
      const passed =
        res.status === 200 &&
        data.return?.status === "approved" &&
        debitNote &&
        debitNote.noteNumber?.startsWith("DN-") &&
        Number(debitNote.amount) === 2124 &&
        Number(debitNote.balanceAmount) === 2124 &&
        debitNote.status === "active";

      report.push({
        id: "T7",
        name: "Purchase Return Approval -> Debit Note auto-generation (DN-YYYY-XXXX)",
        category: "Debit Notes",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Debit Note: ${debitNote?.noteNumber} | Balance: ${debitNote?.balanceAmount}`,
      });
      console.log(`[T7] ${passed ? "PASS" : "FAIL"}: Debit Note Issued (${debitNote?.noteNumber})`);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Purchase Return Completion -> Atomic Stock Decrement & Balanced GL
    // -------------------------------------------------------------------------
    {
      const start = Date.now();

      const stockBefore = await prisma.productWarehouse.findUnique({
        where: {
          productId_warehouseId: {
            productId: productA.id,
            warehouseId: warehouseA.id,
          },
        },
      });

      const res = await fetch(`${baseUrl}/api/returns/purchases/${purchaseReturn1.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const data = await res.json();

      const stockAfter = await prisma.productWarehouse.findUnique({
        where: {
          productId_warehouseId: {
            productId: productA.id,
            warehouseId: warehouseA.id,
          },
        },
      });

      const je = await prisma.journalEntry.findFirst({
        where: { tenantId: tenantA, reference: purchaseReturn1.id },
        include: { items: true },
      });

      let balanced = false;
      if (je && je.items.length >= 2) {
        const totalDebit = je.items.reduce((sum, item) => sum + Number(item.debit), 0);
        const totalCredit = je.items.reduce((sum, item) => sum + Number(item.credit), 0);
        balanced = Math.abs(totalDebit - totalCredit) < 0.01;
      }

      const decremented =
        Number(stockAfter?.quantity) === Number(stockBefore?.quantity) - 3;

      const passed =
        res.status === 200 &&
        data.status === "completed" &&
        decremented &&
        balanced;

      report.push({
        id: "T8",
        name: "Purchase Return Completion -> Atomic stock decrement via InventoryMovementService & balanced GL auto-posting",
        category: "Purchase Returns",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Stock Decremented: -3 (Before: ${stockBefore?.quantity}, After: ${stockAfter?.quantity}) | JE ${je?.entryNumber} Balanced: ${balanced}`,
      });
      console.log(`[T8] ${passed ? "PASS" : "FAIL"}: Purchase Return Completed, Stock -3 & GL Balanced`);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Purchase Return Overdraft Guard
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Original purchase had 10 units. 3 units returned. 7 remain returnable.
      // Requesting 8 units must fail with 400.
      const res = await fetch(`${baseUrl}/api/returns/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          purchaseId: purchaseA.id,
          warehouseId: warehouseA.id,
          items: [
            {
              productId: productA.id,
              originalDetailId: purchaseA.details[0].id,
              productName: productA.name,
              quantity: 8, // 8 > 7 remaining
              unitCost: 600,
            },
          ],
        }),
      });

      const data = await res.json();
      const passed = res.status === 400 && data.error?.includes("exceeds available");

      report.push({
        id: "T9",
        name: "Purchase Return Overdraft Guard (Attempting to return more than received -> 400)",
        category: "Validation Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Error: "${data.error}"`,
      });
      console.log(`[T9] ${passed ? "PASS" : "FAIL"}: Purchase Overdraft Guard: ${data.error}`);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Purchase Return Depleted Inventory Conflict Guard
    // -------------------------------------------------------------------------
    {
      const start = Date.now();

      // Create a draft return for 5 units
      const draftRes = await fetch(`${baseUrl}/api/returns/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          purchaseId: purchaseA.id,
          warehouseId: warehouseA.id,
          items: [
            {
              productId: productA.id,
              originalDetailId: purchaseA.details[0].id,
              productName: productA.name,
              quantity: 5,
              unitCost: 600,
            },
          ],
        }),
      });
      const draftData = await draftRes.json();

      // Manually deplete warehouse stock to 0 to simulate stock depletion conflict
      await prisma.productWarehouse.update({
        where: {
          productId_warehouseId: {
            productId: productA.id,
            warehouseId: warehouseA.id,
          },
        },
        data: { quantity: 0 },
      });

      // Now attempt to complete purchase return (which requires decreasing stock by 5)
      const completeRes = await fetch(`${baseUrl}/api/returns/purchases/${draftData.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const completeData = await completeRes.json();
      const passed =
        completeRes.status === 422 &&
        (completeData.code === "INSUFFICIENT_STOCK" || completeData.error?.includes("Insufficient stock"));

      // Restore stock for remaining tests
      await prisma.productWarehouse.update({
        where: {
          productId_warehouseId: {
            productId: productA.id,
            warehouseId: warehouseA.id,
          },
        },
        data: { quantity: 100 },
      });

      report.push({
        id: "T10",
        name: "Purchase Return Depleted Inventory Conflict Guard (422 Insufficient Stock)",
        category: "Validation Guards",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${completeRes.status} | Code: ${completeData.code} | Error: "${completeData.error}"`,
      });
      console.log(`[T10] ${passed ? "PASS" : "FAIL"}: Depleted Stock Conflict Rejected: ${completeData.code}`);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Multi-Tenant Isolation: Cross-Tenant Access Rejection
    // -------------------------------------------------------------------------
    {
      const start = Date.now();
      // Tenant B tries to access Tenant A's sales return
      const res1 = await fetch(`${baseUrl}/api/returns/sales/${salesReturn1.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      // Tenant B tries to approve Tenant A's sales return
      const res2 = await fetch(`${baseUrl}/api/returns/sales/${salesReturn1.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      // Tenant B tries to create return for Tenant A's sale
      const res3 = await fetch(`${baseUrl}/api/returns/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          saleId: saleA.id,
          items: [{ productId: productA.id, quantity: 1, unitPrice: 1000 }],
        }),
      });

      const passed = res1.status === 404 && res2.status === 404 && res3.status === 404;

      report.push({
        id: "T11",
        name: "Multi-Tenant Isolation: Cross-tenant return creation/approval rejection (404)",
        category: "Tenant Isolation",
        passed,
        durationMs: Date.now() - start,
        evidence: `GET /sales/:id HTTP ${res1.status} | POST /approve HTTP ${res2.status} | POST /sales HTTP ${res3.status}`,
      });
      console.log(`[T11] ${passed ? "PASS" : "FAIL"}: Cross-Tenant Isolation Verified (All 404)`);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Closed Fiscal Period Rejection Guard for Return Ledger Postings
    // -------------------------------------------------------------------------
    {
      const start = Date.now();

      // Configure a closed fiscal year and period for Tenant A covering today
      const now = new Date();
      const fyStart = new Date(now.getFullYear(), 0, 1);
      const fyEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      const fy = await prisma.fiscalYear.create({
        data: {
          tenantId: tenantA,
          name: `FY ${now.getFullYear()} Closed Test`,
          startDate: fyStart,
          endDate: fyEnd,
          status: "closed", // Entire fiscal year closed
        },
      });

      // Create a fresh sale for the closed-period return test
      const saleForT12 = await prisma.sale.create({
        data: {
          tenantId: tenantA,
          invoiceNo: `INV-FY-CLOSED-${Date.now()}`,
          date: new Date(),
          type: "pos",
          warehouseId: warehouseA.id,
          customerId: customerA.id,
          customerName: customerA.name,
          cashierName: "Manager A",
          subtotal: 1000,
          totalTax: 180,
          total: 1180,
          paidAmount: 1180,
          paymentStatus: "paid",
          details: {
            create: [
              {
                productId: productA.id,
                productName: productA.name,
                sku: productA.sku,
                quantity: 1,
                price: 1000,
                subtotal: 1000,
                taxRate: 18,
                taxAmount: 180,
              },
            ],
          },
        },
        include: { details: true },
      });

      // Create a draft sales return
      const draftRes = await fetch(`${baseUrl}/api/returns/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          saleId: saleForT12.id,
          warehouseId: warehouseA.id,
          items: [
            {
              productId: productA.id,
              originalDetailId: saleForT12.details[0].id,
              productName: productA.name,
              quantity: 1,
              unitPrice: 1000,
            },
          ],
        }),
      });
      const draftData = await draftRes.json();

      // Attempt to complete the sales return into the closed fiscal period
      const completeRes = await fetch(`${baseUrl}/api/returns/sales/${draftData.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const completeData = await completeRes.json();
      const passed =
        completeRes.status === 422 &&
        (completeData.code === "PERIOD_CLOSED" || completeData.error?.includes("closed"));

      // Clean up fiscal year
      await prisma.fiscalYear.delete({ where: { id: fy.id } });

      report.push({
        id: "T12",
        name: "Closed Fiscal Period Rejection Guard for Return Ledger Postings (422 PERIOD_CLOSED)",
        category: "Financial Compliance",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${completeRes.status} | Code: ${completeData.code} | Error: "${completeData.error}"`,
      });
      console.log(`[T12] ${passed ? "PASS" : "FAIL"}: Closed Period Guard: ${completeData.code}`);
    }

  } finally {
    // Teardown server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Cleanup Tenant A and B test records
    try {
      const testTenants = [tenantA, tenantB];
      const testUsers = [userA, userB];

      await prisma.salesReturnDetail.deleteMany({ where: { salesReturn: { tenantId: { in: testTenants } } } });
      await prisma.creditNote.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.salesReturn.deleteMany({ where: { tenantId: { in: testTenants } } });

      await prisma.purchaseReturnDetail.deleteMany({ where: { purchaseReturn: { tenantId: { in: testTenants } } } });
      await prisma.debitNote.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.purchaseReturn.deleteMany({ where: { tenantId: { in: testTenants } } });

      await prisma.journalItem.deleteMany({ where: { journalEntry: { tenantId: { in: testTenants } } } });
      await prisma.journalEntry.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.chartOfAccount.deleteMany({ where: { tenantId: { in: testTenants } } });

      await prisma.stockMovement.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.saleDetail.deleteMany({ where: { sale: { tenantId: { in: testTenants } } } });
      await prisma.salePayment.deleteMany({ where: { sale: { tenantId: { in: testTenants } } } });
      await prisma.sale.deleteMany({ where: { tenantId: { in: testTenants } } });

      await prisma.purchaseDetail.deleteMany({ where: { purchase: { tenantId: { in: testTenants } } } });
      await prisma.purchasePayment.deleteMany({ where: { purchase: { tenantId: { in: testTenants } } } });
      await prisma.purchase.deleteMany({ where: { tenantId: { in: testTenants } } });

      await prisma.productWarehouse.deleteMany({ where: { product: { tenantId: { in: testTenants } } } });
      await prisma.product.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.customer.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.supplier.deleteMany({ where: { tenantId: { in: testTenants } } });
      await prisma.warehouse.deleteMany({ where: { tenantId: { in: testTenants } } });

      await prisma.userRole.deleteMany({ where: { userId: { in: testUsers } } });
      await prisma.profile.deleteMany({ where: { userId: { in: testUsers } } });
      await prisma.user.deleteMany({ where: { id: { in: testUsers } } });
      await prisma.tenant.deleteMany({ where: { id: { in: testTenants } } });
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  // Summary
  console.log("\n================================================================================");
  console.log("STEP 3.6 SALES & PURCHASE RETURNS INTEGRATION TEST RESULTS");
  console.log("================================================================================");
  const total = report.length;
  const passed = report.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.error("❌ FAILED SCENARIOS:");
    for (const r of report.filter((r) => !r.passed)) {
      console.error(`- Scenario #${r.id} [${r.category}]: ${r.name}`);
      console.error(`  Evidence: ${r.evidence}`);
    }
    process.exit(1);
  } else {
    console.log("✅ ALL STEP 3.6 RETURNS & CREDIT/DEBIT NOTES INTEGRATION SCENARIOS PASSED PERFECTLY!");
  }
}

runStep36TestSuite().catch((err) => {
  console.error("Fatal Test Suite Error:", err);
  process.exit(1);
});
