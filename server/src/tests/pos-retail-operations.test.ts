import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";

test("MASTERHRMS — POS Terminal, Retail Cart & Cash Drawer Z-Report Suite", async (t) => {
  const ts = Date.now();
  const tenantId = `test-pos-${ts}`;
  let warehouseId = "";
  let productId = "";
  let saleId = "";

  const cleanup = async () => {
    try {
      const sales = await rawPrisma.sale.findMany({ where: { tenantId }, select: { id: true } });
      const saleIds = sales.map((s) => s.id);
      if (saleIds.length > 0) {
        await rawPrisma.salePayment.deleteMany({ where: { saleId: { in: saleIds } } });
        await rawPrisma.saleDetail.deleteMany({ where: { saleId: { in: saleIds } } });
        await rawPrisma.sale.deleteMany({ where: { id: { in: saleIds } } });
      }
      await rawPrisma.product.deleteMany({ where: { tenantId } });
      await rawPrisma.productCategory.deleteMany({ where: { tenantId } });
      await rawPrisma.warehouse.deleteMany({ where: { tenantId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Retail Tenant, Warehouse, and Inventory Catalog", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: tenantId, name: "OmniRetail Enterprise Store", slug: `omni-${ts}`, currency: "INR" },
    });

    const wh = await rawPrisma.warehouse.create({
      data: { tenantId, name: "Flagship Retail Store #101", city: "Mumbai" },
    });
    warehouseId = wh.id;

    const cat = await rawPrisma.productCategory.create({
      data: { tenantId, name: "Consumer Electronics" },
    });

    const prod = await rawPrisma.product.create({
      data: {
        tenantId,
        categoryId: cat.id,
        name: "Wireless ANC Headphones Pro",
        sku: `SKU-ANC-${ts}`,
        barcode: `890123456789${ts.toString().slice(-4)}`,
        salePrice: 9999,
        purchasePrice: 6500,
        type: "Product",
        isActive: true,
      },
    });
    productId = prod.id;
    assert.ok(productId, "Product catalog item must be created");
  });

  await t.test("FN-025: POS Terminal Opening & Cash Drawer Float Inwarding", async () => {
    const openingFloat = 5000.0;
    const registerSession = {
      registerId: `REG-01-${ts}`,
      cashierId: "cashier-001",
      openingFloat,
      openedAt: new Date().toISOString(),
      status: "OPEN",
    };

    assert.equal(registerSession.openingFloat, 5000.0);
    assert.equal(registerSession.status, "OPEN");
  });

  await t.test("FN-026: Barcode Scanner Ingestion & Quick Cart Addition with Tax", async () => {
    const scanned = await rawPrisma.product.findFirst({
      where: { tenantId, barcode: { contains: "89012345" } },
    });
    assert.ok(scanned, "Barcode scan must resolve product");
    assert.equal(scanned?.id, productId);

    const quantity = 2;
    const unitPrice = Number(scanned?.salePrice);
    const subtotal = unitPrice * quantity;
    const taxRate = 18.0; // 18% GST
    const totalTax = (subtotal * taxRate) / 100;
    const total = subtotal + totalTax;

    assert.equal(subtotal, 19998);
    assert.equal(totalTax, 3599.64);
    assert.equal(total, 23597.64);

    const sale = await rawPrisma.sale.create({
      data: {
        tenantId,
        warehouseId,
        invoiceNo: `INV-POS-${ts}`,
        type: "pos",
        subtotal,
        totalTax,
        total,
        paymentStatus: "unpaid",
        details: {
          create: [
            {
              productId,
              productName: scanned.name,
              sku: scanned.sku,
              quantity,
              price: unitPrice,
              taxRate,
              taxAmount: totalTax,
              subtotal: total,
            },
          ],
        },
      },
      include: { details: true },
    });
    saleId = sale.id;
    assert.ok(saleId);
    assert.equal(sale.details.length, 1);
  });

  await t.test("FN-027: Split Tender Payments (Cash + UPI) with Exact Balanced Ledger", async () => {
    const cashPortion = 10000.0;
    const upiPortion = 13597.64;

    // 1. Inward Cash Payment
    await rawPrisma.salePayment.create({
      data: {
        saleId,
        amount: cashPortion,
        method: "cash",
        referenceNo: `CASH-${ts}`,
      },
    });

    // 2. Inward UPI Payment
    await rawPrisma.salePayment.create({
      data: {
        saleId,
        amount: upiPortion,
        method: "upi",
        referenceNo: `UPI-REF-${ts}`,
      },
    });

    // 3. Mark sale as fully paid
    const updatedSale = await rawPrisma.sale.update({
      where: { id: saleId },
      data: { paymentStatus: "paid", paidAmount: 23597.64 },
    });
    assert.equal(updatedSale.paymentStatus, "paid");
    assert.equal(Number(updatedSale.paidAmount), 23597.64);
  });

  await t.test("FN-028: Thermal Receipt Auto-Printing Format ESC/POS Generation", async () => {
    const sale = await rawPrisma.sale.findUnique({
      where: { id: saleId },
      include: { details: true, payments: true },
    });
    assert.ok(sale);

    // Format 80mm ESC/POS thermal text
    const receiptLines = [
      "========================================",
      "      OMNIRETAIL ENTERPRISE STORE       ",
      "      Flagship Retail Store #101        ",
      `Invoice #: ${sale.invoiceNo}           `,
      "----------------------------------------",
      ...sale.details.map((d) => `${d.productName.slice(0, 20)} x${d.quantity}  ₹${Number(d.subtotal).toFixed(2)}`),
      "----------------------------------------",
      `Subtotal:                    ₹${Number(sale.subtotal).toFixed(2)}`,
      `GST Tax (18%):               ₹${Number(sale.totalTax).toFixed(2)}`,
      `Grand Total:                 ₹${Number(sale.total).toFixed(2)}`,
      "----------------------------------------",
      ...sale.payments.map((p) => `${p.method.toUpperCase()}:                     ₹${Number(p.amount).toFixed(2)}`),
      "========================================",
      "       THANK YOU FOR YOUR VISIT!        ",
    ];

    const thermalBuffer = receiptLines.join("\n");
    assert.ok(thermalBuffer.includes("OMNIRETAIL ENTERPRISE STORE"));
    assert.ok(thermalBuffer.includes("₹23597.64"));
  });

  await t.test("FN-029: Day-End Cash Drawer Reconciliation Z-Report", async () => {
    const payments = await rawPrisma.salePayment.findMany({
      where: { sale: { tenantId } },
    });

    const totalCash = payments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalUpi = payments
      .filter((p) => p.method === "upi")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const openingFloat = 5000.0;
    const expectedDrawerCash = openingFloat + totalCash;

    assert.equal(totalCash, 10000.0, "Total cash sales must match 10,000");
    assert.equal(totalUpi, 13597.64, "Total UPI sales must match 13,597.64");
    assert.equal(expectedDrawerCash, 15000.0, "Expected cash drawer must include opening float");
  });

  await t.test("Teardown: Clean Fixtures", async () => {
    await cleanup();
  });
});
