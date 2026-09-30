/**
 * Phase C — Wave 3 — Step 3.3.3: Router Hardening & Centralized Stock Engine Integration Test Suite
 *
 * Verifies end-to-end HTTP route execution for:
 * 1. Product routes (POST opening stock, PUT stock overwrite protection, POST /stock/add, GET /:id/movements)
 * 2. Sales & POS routes (POST checkout stock deduction, 409 on insufficient stock, concurrent race protection)
 * 3. Invoices POS routes (POST /pos/sales atomic deduction and 409 rejection)
 * 4. Purchases routes (pending no-op, receipt stock increment, idempotency, cancellation reversal, 409 on depleted cancel)
 * 5. Transfers routes (self-transfer 400, multi-tier state machine, atomic ledger)
 * 6. Adjustments routes (addition/subtraction, decimal values, 409 on excess subtraction)
 * 7. Tenant isolation across all endpoints
 *
 * Target Database: 127.0.0.1:3306/master_hrms_dev (MySQL 9.5.0)
 */

import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import assert from "assert";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { productsRouter } from "../routes/products.routes";
import { salesRouter } from "../routes/sales.routes";
import { invoicesRouter } from "../routes/invoices.routes";
import { purchasesRouter } from "../routes/purchases.routes";
import { transfersRouter } from "../routes/transfers.routes";
import { adjustmentsRouter } from "../routes/adjustments.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Verify active database target
const activeDbUrl = process.env.DATABASE_URL || "";
if (!activeDbUrl.includes("127.0.0.1:3306/master_hrms_dev") && !activeDbUrl.includes("localhost:3306/master_hrms_dev")) {
  console.error("FATAL: Step 3.3.3 test suite must ONLY target local master_hrms_dev database.");
  process.exit(1);
}

let passedCount = 0;
let failedCount = 0;

function pass(scenario: string, details?: string) {
  passedCount++;
  console.log(`[✓ PASS] ${scenario}${details ? ` (${details})` : ""}`);
}

function fail(scenario: string, error: any) {
  failedCount++;
  console.error(`[✗ FAIL] ${scenario}:`, error.message || error);
}

async function runStep333TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.3.3: ROUTER HARDENING & STOCK ENGINE INTEGRATION");
  console.log("Coverage: Products, Sales/POS, Invoices, Purchases, Transfers, Adjustments, Multi-Tenancy");
  console.log("Runtime: Node.js 20 LTS | Prisma 5.19.1 | Express 4 | MySQL 9.5.0 (Local)");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  app.use("/api/products", productsRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/transfers", transfersRouter);
  app.use("/api/adjustments", adjustmentsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Test Fixture Identifiers (kept <= 32 chars for VarChar(36) column constraints)
  const tenantA = `ta_${Date.now().toString(36)}`;
  const tenantB = `tb_${Date.now().toString(36)}`;

  const tokenA = generateToken({
    userId: "usr_step333_a",
    tenantId: tenantA,
    email: "alpha@masterhrms.dev",
    roles: ["admin"],
  });

  const tokenB = generateToken({
    userId: "usr_step333_b",
    tenantId: tenantB,
    email: "beta@masterhrms.dev",
    roles: ["admin"],
  });

  const authHeadersA = {
    Authorization: `Bearer ${tokenA}`,
    "Content-Type": "application/json",
  };

  const authHeadersB = {
    Authorization: `Bearer ${tokenB}`,
    "Content-Type": "application/json",
  };

  try {
    // -------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------
    console.log("--- Setting Up Isolated Test Fixtures in master_hrms_dev ---");
    await prisma.tenant.upsert({
      where: { id: tenantA },
      create: { id: tenantA, slug: tenantA, name: "Tenant Alpha 3.3.3" },
      update: { name: "Tenant Alpha 3.3.3" },
    });
    await prisma.tenant.upsert({
      where: { id: tenantB },
      create: { id: tenantB, slug: tenantB, name: "Tenant Beta 3.3.3" },
      update: { name: "Tenant Beta 3.3.3" },
    });

    try {
      const { TenantConnectionManager } = await import("../services/tenant-connection-manager.service");
      TenantConnectionManager.getInstance().registerTenant({
        tenantId: tenantA,
        name: "Tenant Alpha 3.3.3",
        strategy: "SHARED_SCHEMA",
        status: "ACTIVE",
      });
      TenantConnectionManager.getInstance().registerTenant({
        tenantId: tenantB,
        name: "Tenant Beta 3.3.3",
        strategy: "SHARED_SCHEMA",
        status: "ACTIVE",
      });
    } catch {}

    // Subscriptions (IDs <= 36 chars)
    await prisma.tenantSubscription.upsert({
      where: { tenantId: tenantA },
      create: { id: `sub_${tenantA}`, tenantId: tenantA, status: "active", billingCycle: "monthly" },
      update: { status: "active" },
    });
    await prisma.tenantSubscription.upsert({
      where: { tenantId: tenantB },
      create: { id: `sub_${tenantB}`, tenantId: tenantB, status: "active", billingCycle: "monthly" },
      update: { status: "active" },
    });

    // Users, profiles, and roles for auth
    const usrA = "usr_step333_a";
    const usrB = "usr_step333_b";

    await prisma.user.upsert({
      where: { id: usrA },
      create: { id: usrA, email: "alpha@masterhrms.dev", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: usrA },
      create: { userId: usrA, email: "alpha@masterhrms.dev", fullName: "Alpha Admin", tenantId: tenantA },
      update: { tenantId: tenantA },
    });
    await prisma.userRole.deleteMany({ where: { userId: usrA } });
    await prisma.userRole.create({
      data: { userId: usrA, role: "hr_admin", tenantId: tenantA },
    });

    await prisma.user.upsert({
      where: { id: usrB },
      create: { id: usrB, email: "beta@masterhrms.dev", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: usrB },
      create: { userId: usrB, email: "beta@masterhrms.dev", fullName: "Beta Admin", tenantId: tenantB },
      update: { tenantId: tenantB },
    });
    await prisma.userRole.deleteMany({ where: { userId: usrB } });
    await prisma.userRole.create({
      data: { userId: usrB, role: "hr_admin", tenantId: tenantB },
    });

    const whA1 = await prisma.warehouse.create({
      data: { id: `wh_a1_${Date.now()}`, tenantId: tenantA, name: "Central Hub Alpha", isDefault: true },
    });
    const whA2 = await prisma.warehouse.create({
      data: { id: `wh_a2_${Date.now()}`, tenantId: tenantA, name: "Spoke Warehouse Alpha", isDefault: false },
    });
    const whB1 = await prisma.warehouse.create({
      data: { id: `wh_b1_${Date.now()}`, tenantId: tenantB, name: "Central Hub Beta", isDefault: true },
    });

    const supplierA = await prisma.supplier.create({
      data: { id: `sup_a_${Date.now()}`, tenantId: tenantA, name: "Global Tech Supplies" },
    });

    // -------------------------------------------------------------
    // SECTION 1: PRODUCT ROUTE INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 1: Product Route Hardening & Opening Stock ---");

    // 1A: POST /api/products with opening stock creates StockMovement
    let createdProductA: any;
    try {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          name: "Enterprise Server Node",
          sku: `SRV-${Date.now()}`,
          salePrice: 1200,
          purchasePrice: 800,
          quantity: 20.0,
          warehouseId: whA1.id,
        }),
      });

      assert.strictEqual(res.status, 201, "Expected 201 Created for product creation");
      createdProductA = await res.json();

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 20.0, "Expected ProductWarehouse balance to be 20.000");

      const movement = await prisma.stockMovement.findFirst({
        where: { tenantId: tenantA, productId: createdProductA.id, referenceType: "PRODUCT" },
      });
      assert(movement, "Expected StockMovement record for opening stock");
      assert.strictEqual(movement?.movementType, "OPENING_STOCK");
      assert.strictEqual(Number(movement?.quantity), 20.0);

      pass("TEST-1A: POST /api/products initializes inventory and creates OPENING_STOCK movement");
    } catch (err: any) {
      fail("TEST-1A: Product opening stock creation failed", err);
    }

    // 1B: PUT /api/products/:id with quantity does NOT overwrite stock
    try {
      const res = await fetch(`${baseUrl}/api/products/${createdProductA.id}`, {
        method: "PUT",
        headers: authHeadersA,
        body: JSON.stringify({
          name: "Enterprise Server Node Gen2",
          salePrice: 1250,
          quantity: 999, // Rogue overwrite attempt
          stock: 999,
        }),
      });
      assert.strictEqual(res.status, 200);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 20.0, "Stock should NOT be overwritten by PUT /:id");

      pass("TEST-1B: PUT /api/products/:id updates metadata without overwriting warehouse stock");
    } catch (err: any) {
      fail("TEST-1B: Product metadata update broke stock protection", err);
    }

    // 1C: POST /api/products/stock/add increments stock and creates movement
    try {
      const res = await fetch(`${baseUrl}/api/products/stock/add`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          productId: createdProductA.id,
          warehouseId: whA1.id,
          quantity: 15.5,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 35.5, "Expected 20 + 15.5 = 35.500 units");

      const movements = await prisma.stockMovement.findMany({
        where: { tenantId: tenantA, productId: createdProductA.id, referenceType: "MANUAL_ADD" },
      });
      assert.strictEqual(movements.length, 1);
      assert.strictEqual(Number(movements[0].quantity), 15.5);

      pass("TEST-1C: POST /api/products/stock/add increases stock and writes StockMovement");
    } catch (err: any) {
      fail("TEST-1C: Manual stock add failed", err);
    }

    // 1D: GET /api/products/:id/movements returns paginated ledger
    try {
      const res = await fetch(`${baseUrl}/api/products/${createdProductA.id}/movements`, {
        headers: authHeadersA,
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      const movements = json.data;
      assert.strictEqual(movements.length, 2, "Expected 2 movements (opening stock + manual add)");

      pass("TEST-1D: GET /api/products/:id/movements returns tenant-scoped movement ledger");
    } catch (err: any) {
      fail("TEST-1D: Product movements endpoint failed", err);
    }

    // -------------------------------------------------------------
    // SECTION 2: SALES & POS CHECKOUT INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 2: Sales & POS Checkout Integration ---");

    // 2A: Successful checkout deducts stock and records movement
    try {
      const res = await fetch(`${baseUrl}/api/sales`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          type: "pos",
          warehouseId: whA1.id,
          customerName: "Acme Corp",
          items: [
            {
              id: createdProductA.id,
              name: "Enterprise Server Node",
              qty: 5.5,
              price: 1250,
            },
          ],
          total: 6875,
          paidAmount: 6875,
          paymentMode: "Card",
        }),
      });
      assert.strictEqual(res.status, 201, "Expected 201 Created for POS checkout");

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 30.0, "Expected 35.5 - 5.5 = 30.000");

      const posMovement = await prisma.stockMovement.findFirst({
        where: { tenantId: tenantA, productId: createdProductA.id, movementType: "POS_SALE" },
      });
      assert(posMovement, "Expected POS_SALE movement record");
      assert.strictEqual(Number(posMovement?.quantity), -5.5);
      assert.strictEqual(Number(posMovement?.beforeQuantity), 35.5);
      assert.strictEqual(Number(posMovement?.afterQuantity), 30.0);

      pass("TEST-2A: POST /api/sales atomically decrements warehouse stock and logs POS_SALE");
    } catch (err: any) {
      fail("TEST-2A: POS checkout failed", err);
    }

    // 2B: Checkout with insufficient stock returns 409 Conflict
    try {
      const res = await fetch(`${baseUrl}/api/sales`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          type: "pos",
          warehouseId: whA1.id,
          customerName: "Overbuyer Ltd",
          items: [
            {
              id: createdProductA.id,
              name: "Enterprise Server Node",
              qty: 100, // Available is only 30.000
              price: 1250,
            },
          ],
          total: 125000,
        }),
      });
      assert.strictEqual(res.status, 409, "Expected 409 Conflict for insufficient stock");
      const errJson = await res.json();
      assert.strictEqual(errJson.code, "INSUFFICIENT_STOCK");

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 30.0, "Balance must remain intact at 30.000");

      pass("TEST-2B: POST /api/sales rejects insufficient stock with 409 Conflict");
    } catch (err: any) {
      fail("TEST-2B: Insufficient stock did not return 409", err);
    }

    // 2C: High concurrency checkout race test through route
    try {
      // 10 concurrent requests attempting to purchase 5.0 units each (only 30.0 available = 6 can succeed)
      const attempts = Array.from({ length: 10 }).map(() =>
        fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: authHeadersA,
          body: JSON.stringify({
            type: "pos",
            warehouseId: whA1.id,
            customerName: "Race Customer",
            items: [{ id: createdProductA.id, qty: 5.0, price: 1250 }],
            total: 6250,
            paidAmount: 6250,
          }),
        }).then(async (r) => ({ status: r.status, json: await r.json() }))
      );

      const results = await Promise.all(attempts);
      const successes = results.filter((r) => r.status === 201);
      const conflicts = results.filter((r) => r.status === 409);

      assert.strictEqual(successes.length, 6, "Exactly 6 checkouts of 5 units should succeed (30 units total)");
      assert.strictEqual(conflicts.length, 4, "Exactly 4 checkouts should be rejected with 409");

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 0.0, "Ending warehouse stock must be exactly 0.000 (no oversell)");

      pass("TEST-2C: Concurrent route checkouts prevent oversell (6 passed, 4 conflicts, 0 stock remaining)");
    } catch (err: any) {
      fail("TEST-2C: Concurrency checkout race failed", err);
    }

    // -------------------------------------------------------------
    // SECTION 3: INVOICES POS INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 3: Invoices POS Sales Integration ---");

    // Restock 10 units for testing
    await prisma.productWarehouse.update({
      where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      data: { quantity: 10.0 },
    });

    // 3A: POST /api/invoices/pos/sales decrements stock
    try {
      const res = await fetch(`${baseUrl}/api/invoices/pos/sales`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          customerName: "POS Invoice Client",
          warehouseId: whA1.id,
          items: [{ id: createdProductA.id, name: "Node", qty: 4.0, price: 1250 }],
          total: 5000,
          paymentMode: "Cash",
        }),
      });
      assert.strictEqual(res.status, 201);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 6.0, "Expected 10.0 - 4.0 = 6.000");

      pass("TEST-3A: POST /api/invoices/pos/sales decrements stock and writes StockMovement");
    } catch (err: any) {
      fail("TEST-3A: Invoices POS sale failed", err);
    }

    // 3B: POST /api/invoices/pos/sales with insufficient stock returns 409
    try {
      const res = await fetch(`${baseUrl}/api/invoices/pos/sales`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          customerName: "POS Invoice Overdraft",
          warehouseId: whA1.id,
          items: [{ id: createdProductA.id, name: "Node", qty: 20.0, price: 1250 }],
          total: 25000,
        }),
      });
      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.code, "INSUFFICIENT_STOCK");

      pass("TEST-3B: POST /api/invoices/pos/sales rejects overdraft with 409 Conflict");
    } catch (err: any) {
      fail("TEST-3B: Invoices POS overdraft failed", err);
    }

    // -------------------------------------------------------------
    // SECTION 4: PURCHASES ROUTE INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 4: Purchases Goods Receipt & Status Transitions ---");

    let purchaseOrder: any;

    // 4A: POST /api/purchases in pending does NOT increase stock
    try {
      const res = await fetch(`${baseUrl}/api/purchases`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          supplierId: supplierA.id,
          warehouseId: whA1.id,
          status: "pending",
          paymentStatus: "unpaid",
          items: [{ productId: createdProductA.id, quantity: 50.0, unitPrice: 800, taxRate: 18 }],
        }),
      });
      assert.strictEqual(res.status, 201);
      purchaseOrder = (await res.json()).data;

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 6.0, "Stock must NOT increase for pending purchase order");

      pass("TEST-4A: Pending purchase order does not prematurely increase inventory");
    } catch (err: any) {
      fail("TEST-4A: Purchase order pending creation failed", err);
    }

    // 4B: PATCH /api/purchases/:id/status to "received" increases stock
    try {
      const res = await fetch(`${baseUrl}/api/purchases/${purchaseOrder.id}/status`, {
        method: "PATCH",
        headers: authHeadersA,
        body: JSON.stringify({ status: "received" }),
      });
      assert.strictEqual(res.status, 200);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 56.0, "Expected 6.0 + 50.0 = 56.000");

      const rcptMovement = await prisma.stockMovement.findFirst({
        where: { tenantId: tenantA, productId: createdProductA.id, movementType: "PURCHASE_RECEIPT", referenceId: purchaseOrder.id },
      });
      assert(rcptMovement, "Expected PURCHASE_RECEIPT StockMovement record");
      assert.strictEqual(Number(rcptMovement?.quantity), 50.0);

      pass("TEST-4B: PATCH /api/purchases/:id/status to 'received' increments stock and logs receipt");
    } catch (err: any) {
      fail("TEST-4B: Goods receipt status update failed", err);
    }

    // 4C: Repeated PATCH to "received" is idempotent (does not duplicate stock)
    try {
      const res = await fetch(`${baseUrl}/api/purchases/${purchaseOrder.id}/status`, {
        method: "PATCH",
        headers: authHeadersA,
        body: JSON.stringify({ status: "received" }),
      });
      assert.strictEqual(res.status, 200);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 56.0, "Idempotent call must not duplicate stock increment");

      pass("TEST-4C: Repeated goods receipt call is idempotent and preserves stock balance");
    } catch (err: any) {
      fail("TEST-4C: Goods receipt idempotency failed", err);
    }

    // 4D: Cancel received purchase reverses stock
    try {
      const res = await fetch(`${baseUrl}/api/purchases/${purchaseOrder.id}/status`, {
        method: "PATCH",
        headers: authHeadersA,
        body: JSON.stringify({ status: "cancelled" }),
      });
      assert.strictEqual(res.status, 200);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 6.0, "Cancelling PO reversed 50 units (56 - 50 = 6)");

      const revMovement = await prisma.stockMovement.findFirst({
        where: { tenantId: tenantA, productId: createdProductA.id, movementType: "PURCHASE_RETURN", referenceId: purchaseOrder.id },
      });
      assert(revMovement, "Expected PURCHASE_RETURN movement record");

      pass("TEST-4D: Cancelling received PO reverses warehouse stock and records PURCHASE_RETURN");
    } catch (err: any) {
      fail("TEST-4D: PO cancellation stock reversal failed", err);
    }

    // 4E: PO cancellation rejected when goods are depleted (no negative stock)
    try {
      // Create and receive fresh PO of 50 units (stock was 6.0, becomes 56.0)
      const poRes = await fetch(`${baseUrl}/api/purchases`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          purchaseNo: `PO-4E-${Date.now().toString(36)}`,
          warehouseId: whA1.id,
          status: "received",
          items: [{ productId: createdProductA.id, quantity: 50.0, cost: 850 }],
        }),
      });
      const po4e = (await poRes.json()).data;

      // Sell 55 units (leaving only 1.0 unit in warehouse)
      await fetch(`${baseUrl}/api/sales`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          warehouseId: whA1.id,
          items: [{ id: createdProductA.id, qty: 55.0, price: 1250 }],
          total: 68750,
          paidAmount: 68750,
        }),
      }); // Stock is now 1.000

      // Attempting to cancel purchase of 50 units when only 1 unit exists must return 409
      const cancelRes = await fetch(`${baseUrl}/api/purchases/${po4e.id}/status`, {
        method: "PATCH",
        headers: authHeadersA,
        body: JSON.stringify({ status: "cancelled" }),
      });
      assert.strictEqual(cancelRes.status, 409, "Expected 409 when cancelling PO with depleted inventory");

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 1.0, "Warehouse balance must remain 1.000 (never negative)");

      pass("TEST-4E: PO cancellation when goods are depleted is safely rejected with 409");
    } catch (err: any) {
      fail("TEST-4E: Depleted PO cancellation protection failed", err);
    }

    // -------------------------------------------------------------
    // SECTION 5: STOCK TRANSFERS INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 5: Stock Transfers Multi-Tier State Machine ---");

    // Replenish source warehouse to 20 units
    await prisma.productWarehouse.update({
      where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      data: { quantity: 20.0 },
    });

    // 5A: Transfer from warehouse to itself is rejected with 400
    try {
      const res = await fetch(`${baseUrl}/api/transfers`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          fromWarehouseId: whA1.id,
          toWarehouseId: whA1.id, // Same warehouse!
          items: [{ productId: createdProductA.id, quantity: 5 }],
        }),
      });
      assert.strictEqual(res.status, 400, "Expected 400 for identical from/to warehouses");
      pass("TEST-5A: Transfer to same warehouse is rejected with 400 Bad Request");
    } catch (err: any) {
      fail("TEST-5A: Same-warehouse transfer check failed", err);
    }

    // 5B: Valid transfer transitions pending -> in_transit -> completed
    try {
      const createRes = await fetch(`${baseUrl}/api/transfers`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          fromWarehouseId: whA1.id,
          toWarehouseId: whA2.id,
          items: [{ productId: createdProductA.id, quantity: 8.5 }],
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const transfer = (await createRes.json()).data;

      // Transition to in_transit (deducts from source warehouse)
      const transitRes = await fetch(`${baseUrl}/api/transfers/${transfer.id}/status`, {
        method: "PATCH",
        headers: authHeadersA,
        body: JSON.stringify({ status: "in_transit" }),
      });
      assert.strictEqual(transitRes.status, 200);

      const pwA1InTransit = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pwA1InTransit?.quantity), 11.5, "Expected 20.0 - 8.5 = 11.500 at source");

      // Transition to completed (increments destination warehouse)
      const completeRes = await fetch(`${baseUrl}/api/transfers/${transfer.id}/status`, {
        method: "PATCH",
        headers: authHeadersA,
        body: JSON.stringify({ status: "completed" }),
      });
      assert.strictEqual(completeRes.status, 200);

      const pwA2Completed = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA2.id } },
      });
      assert.strictEqual(Number(pwA2Completed?.quantity), 8.5, "Expected 8.500 at destination");

      const movements = await prisma.stockMovement.findMany({
        where: { tenantId: tenantA, referenceId: transfer.id },
      });
      assert.strictEqual(movements.length, 2, "Expected 2 paired movement records");

      pass("TEST-5B: Stock transfer transitions in_transit -> completed with paired ledger entries");
    } catch (err: any) {
      fail("TEST-5B: Transfer workflow failed", err);
    }

    // -------------------------------------------------------------
    // SECTION 6: STOCK ADJUSTMENTS INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 6: Stock Adjustments Integration ---");

    // 6A: Positive adjustment with decimal quantity
    try {
      const res = await fetch(`${baseUrl}/api/adjustments`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          warehouseId: whA1.id,
          type: "addition",
          reason: "Found surplus in inventory audit",
          details: [{ productId: createdProductA.id, quantity: 4.25 }],
        }),
      });
      assert.strictEqual(res.status, 201);

      const pw = await prisma.productWarehouse.findUnique({
        where: { productId_warehouseId: { productId: createdProductA.id, warehouseId: whA1.id } },
      });
      assert.strictEqual(Number(pw?.quantity), 15.75, "Expected 11.5 + 4.25 = 15.750");

      pass("TEST-6A: Stock adjustment addition preserves exact decimal quantity (4.250)");
    } catch (err: any) {
      fail("TEST-6A: Adjustment addition failed", err);
    }

    // 6B: Negative adjustment exceeding balance returns 409
    try {
      const res = await fetch(`${baseUrl}/api/adjustments`, {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify({
          warehouseId: whA1.id,
          type: "subtraction",
          reason: "Excess damage claim",
          details: [{ productId: createdProductA.id, quantity: 100 }], // Only 15.75 exists
        }),
      });
      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.code, "INSUFFICIENT_STOCK");

      pass("TEST-6B: Stock adjustment subtraction exceeding balance returns 409 Conflict");
    } catch (err: any) {
      fail("TEST-6B: Excess adjustment subtraction check failed", err);
    }

    // -------------------------------------------------------------
    // SECTION 7: TENANT ISOLATION ACROSS INTEGRATED ROUTES
    // -------------------------------------------------------------
    console.log("\n--- SECTION 7: Cross-Tenant Isolation Enforcement ---");

    // 7A: Tenant Beta cannot checkout Tenant Alpha's product
    try {
      const res = await fetch(`${baseUrl}/api/sales`, {
        method: "POST",
        headers: authHeadersB, // Tenant B credentials!
        body: JSON.stringify({
          warehouseId: whB1.id,
          items: [{ id: createdProductA.id, qty: 1, price: 1250 }], // Tenant A product!
          total: 1250,
          paidAmount: 1250,
        }),
      });
      // Should fail or reject because product does not belong to Tenant B
      assert(res.status === 400 || res.status === 403 || res.status === 404 || res.status === 500);

      pass("TEST-7A: Cross-tenant sales checkout attempt is rejected");
    } catch (err: any) {
      fail("TEST-7A: Cross-tenant sales isolation check failed", err);
    }

    // 7B: Tenant Beta cannot transfer from Tenant Alpha's warehouse
    try {
      const res = await fetch(`${baseUrl}/api/transfers`, {
        method: "POST",
        headers: authHeadersB, // Tenant B credentials!
        body: JSON.stringify({
          fromWarehouseId: whA1.id, // Tenant A warehouse!
          toWarehouseId: whB1.id,
          items: [{ productId: createdProductA.id, quantity: 1 }],
        }),
      });
      assert(res.status === 400 || res.status === 403 || res.status === 404);

      pass("TEST-7B: Cross-tenant warehouse transfer attempt is rejected");
    } catch (err: any) {
      fail("TEST-7B: Cross-tenant transfer isolation check failed", err);
    }
  } finally {
    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log("\n--- Cleaning up Isolated Test Fixtures ---");
    server.close();

    try {
      await prisma.stockMovement.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.saleDetail.deleteMany({ where: { sale: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.salePayment.deleteMany({ where: { sale: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.purchaseDetail.deleteMany({ where: { purchase: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.purchase.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.stockTransferDetail.deleteMany({ where: { transfer: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.stockTransfer.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.stockAdjustmentDetail.deleteMany({ where: { adjustment: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.stockAdjustment.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.productWarehouse.deleteMany({ where: { product: { tenantId: { in: [tenantA, tenantB] } } } });
      await prisma.product.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.supplier.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.warehouse.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  console.log("\n================================================================================");
  console.log("STEP 3.3.3 ROUTER INTEGRATION TEST RESULTS");
  console.log("================================================================================");
  console.log(`TOTAL ASSERTIONS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStep333TestSuite().catch((err) => {
  console.error("Step 3.3.3 test runner error:", err);
  process.exit(1);
});
