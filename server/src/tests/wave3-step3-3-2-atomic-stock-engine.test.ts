import dotenv from "dotenv";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  InventoryMovementService,
  InvalidQuantityError,
  InsufficientStockError,
  ProductNotFoundError,
  WarehouseNotFoundError,
  StockConcurrencyError,
  STOCK_MOVEMENT_TYPES,
} from "../services/inventory-movement.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const prisma = new PrismaClient();

interface TestAssertion {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const assertions: TestAssertion[] = [];

function record(id: string, category: string, name: string, passed: boolean, details: string) {
  assertions.push({ id, category, name, passed, details });
  const tag = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${tag}] ${id}: ${name}`);
  if (!passed || process.env.VERBOSE) {
    console.log(`       Details: ${details}`);
  }
}

async function runStep332TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 3 — STEP 3.3.2: CENTRALIZED ATOMIC STOCK ENGINE TEST SUITE");
  console.log("Verifying: Decimal Precision, Atomicity, Concurrency Guards, Ledger & Multi-Tenancy");
  console.log("================================================================================\n");

  const tenantAlpha = `test_tenant_step332_a_${Date.now()}`;
  const tenantBeta = `test_tenant_step332_b_${Date.now()}`;

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: UNIT VALIDATIONS (Quantity validation & precision)
    // -------------------------------------------------------------------------
    console.log("--- SECTION 1: Quantity Parsing & Validation Unit Tests ---");

    // 1A: Rejects zero quantity
    let zeroRejected = false;
    try {
      InventoryMovementService.validateAndParseQuantity(0);
    } catch (e: any) {
      zeroRejected = e instanceof InvalidQuantityError;
    }
    record("TEST-1A", "Unit Validation", "Rejects zero quantity (qty must be > 0)", zeroRejected, "Tested qty=0");

    // 1B: Rejects negative quantity
    let negRejected = false;
    try {
      InventoryMovementService.validateAndParseQuantity(-5);
    } catch (e: any) {
      negRejected = e instanceof InvalidQuantityError;
    }
    record("TEST-1B", "Unit Validation", "Rejects negative quantity", negRejected, "Tested qty=-5");

    // 1C: Rejects quantity exceeding 3 decimal places
    let scaleRejected = false;
    try {
      InventoryMovementService.validateAndParseQuantity("10.1234");
    } catch (e: any) {
      scaleRejected = e instanceof InvalidQuantityError;
    }
    record("TEST-1C", "Unit Validation", "Rejects precision exceeding 3 decimal places", scaleRejected, "Tested qty=10.1234");

    // 1D: Rejects non-numeric input
    let nonNumRejected = false;
    try {
      InventoryMovementService.validateAndParseQuantity("invalid-qty" as any);
    } catch (e: any) {
      nonNumRejected = e instanceof InvalidQuantityError;
    }
    record("TEST-1D", "Unit Validation", "Rejects non-numeric strings / NaN", nonNumRejected, "Tested qty='invalid-qty'");

    // 1E: Correctly parses valid 3-decimal string and integer
    const parsedValid = InventoryMovementService.validateAndParseQuantity("123.456");
    const parsedInt = InventoryMovementService.validateAndParseQuantity(50);
    const validMath = parsedValid.toString() === "123.456" && parsedInt.toString() === "50";
    record("TEST-1E", "Unit Validation", "Accurately parses valid 3-decimal strings and integers", validMath, `Parsed 123.456=${parsedValid.toString()}, 50=${parsedInt.toString()}`);

    // -------------------------------------------------------------------------
    // SECTION 2: FIXTURE SETUP
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: Setting up Isolated Database Fixtures ---");
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlpha, name: "Step332 Alpha Corp", slug: `slug-${tenantAlpha}` },
        { id: tenantBeta, name: "Step332 Beta Corp", slug: `slug-${tenantBeta}` },
      ],
    });

    const [prodA1, prodA2, prodB1] = await Promise.all([
      prisma.product.create({
        data: {
          tenantId: tenantAlpha,
          name: "Alpha Widget Standard",
          sku: `SKU-A1-${Date.now()}`,
          salePrice: new Prisma.Decimal("100.00"),
          purchasePrice: new Prisma.Decimal("60.00"),
        },
      }),
      prisma.product.create({
        data: {
          tenantId: tenantAlpha,
          name: "Alpha Widget Premium",
          sku: `SKU-A2-${Date.now()}`,
          salePrice: new Prisma.Decimal("250.00"),
          purchasePrice: new Prisma.Decimal("150.00"),
        },
      }),
      prisma.product.create({
        data: {
          tenantId: tenantBeta,
          name: "Beta Gadget",
          sku: `SKU-B1-${Date.now()}`,
          salePrice: new Prisma.Decimal("80.00"),
          purchasePrice: new Prisma.Decimal("40.00"),
        },
      }),
    ]);

    const [whA1, whA2, whB1] = await Promise.all([
      prisma.warehouse.create({
        data: { tenantId: tenantAlpha, name: "Alpha Central Warehouse" },
      }),
      prisma.warehouse.create({
        data: { tenantId: tenantAlpha, name: "Alpha Branch Warehouse" },
      }),
      prisma.warehouse.create({
        data: { tenantId: tenantBeta, name: "Beta Main Warehouse" },
      }),
    ]);

    // -------------------------------------------------------------------------
    // SECTION 3: DATABASE INTEGRATION TESTS
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: Database Integration Tests ---");

    // 3A: Stock Increase updates balance & creates 1 StockMovement
    const incRes = await InventoryMovementService.increaseStock({
      tenantId: tenantAlpha,
      productId: prodA1.id,
      warehouseId: whA1.id,
      quantity: "50.000",
      movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT,
      referenceType: "PURCHASE",
      referenceId: "PO-TEST-001",
      notes: "Initial receipt from supplier",
    });

    const pwAfterInc = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA1.id } },
    });
    const smInc = await prisma.stockMovement.findUnique({ where: { id: incRes.movementId } });

    const incValid =
      pwAfterInc !== null &&
      new Prisma.Decimal(pwAfterInc.quantity).equals(new Prisma.Decimal("50.000")) &&
      smInc !== null &&
      new Prisma.Decimal(smInc.quantity).equals(new Prisma.Decimal("50.000")) &&
      new Prisma.Decimal(smInc.beforeQuantity).equals(new Prisma.Decimal("0.000")) &&
      new Prisma.Decimal(smInc.afterQuantity).equals(new Prisma.Decimal("50.000")) &&
      smInc.movementType === STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT;

    record("TEST-2A", "Stock Increase", "increaseStock updates balance and creates append-only StockMovement", incValid, `Balance=${pwAfterInc?.quantity}, SM before=${smInc?.beforeQuantity}, after=${smInc?.afterQuantity}`);

    // 3B: Stock Decrease updates balance & creates 1 StockMovement (outbound negative delta)
    const decRes = await InventoryMovementService.decreaseStock({
      tenantId: tenantAlpha,
      productId: prodA1.id,
      warehouseId: whA1.id,
      quantity: "15.500",
      movementType: STOCK_MOVEMENT_TYPES.POS_SALE,
      referenceType: "POS_SALE",
      referenceId: "REC-TEST-100",
      notes: "In-store checkout sale",
    });

    const pwAfterDec = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA1.id } },
    });
    const smDec = await prisma.stockMovement.findUnique({ where: { id: decRes.movementId } });

    const decValid =
      pwAfterDec !== null &&
      new Prisma.Decimal(pwAfterDec.quantity).equals(new Prisma.Decimal("34.500")) &&
      smDec !== null &&
      new Prisma.Decimal(smDec.quantity).equals(new Prisma.Decimal("-15.500")) &&
      new Prisma.Decimal(smDec.beforeQuantity).equals(new Prisma.Decimal("50.000")) &&
      new Prisma.Decimal(smDec.afterQuantity).equals(new Prisma.Decimal("34.500"));

    record("TEST-2B", "Stock Decrease", "decreaseStock deducts balance atomically and creates outbound StockMovement", decValid, `Balance=${pwAfterDec?.quantity}, SM qty=${smDec?.quantity}, after=${smDec?.afterQuantity}`);

    // 3C: Insufficient stock deduction throws InsufficientStockError and leaves balance intact
    let insufficientCaught = false;
    try {
      await InventoryMovementService.decreaseStock({
        tenantId: tenantAlpha,
        productId: prodA1.id,
        warehouseId: whA1.id,
        quantity: "100.000", // currently has 34.500
        movementType: STOCK_MOVEMENT_TYPES.SALES_INVOICE,
      });
    } catch (e: any) {
      insufficientCaught = e instanceof InsufficientStockError;
    }

    const pwAfterInsufficient = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA1.id } },
    });
    const unchanged =
      insufficientCaught &&
      pwAfterInsufficient !== null &&
      new Prisma.Decimal(pwAfterInsufficient.quantity).equals(new Prisma.Decimal("34.500"));

    record("TEST-2C", "Insufficient Stock", "decreaseStock rejects oversell and leaves warehouse balance unchanged", unchanged, `Caught error=${insufficientCaught}, Balance=${pwAfterInsufficient?.quantity}`);

    // 3D: Transaction Rollback: error during larger operation rolls back balance and movements
    let rollbackSuccess = false;
    const preRollbackMovementsCount = await prisma.stockMovement.count({
      where: { productId: prodA1.id, warehouseId: whA1.id },
    });

    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Perform increase
        await InventoryMovementService.increaseStock({
          tenantId: tenantAlpha,
          productId: prodA1.id,
          warehouseId: whA1.id,
          quantity: "20.000",
          movementType: STOCK_MOVEMENT_TYPES.OPENING_STOCK,
          tx,
        });

        // Step 2: Simulate failure in business transaction
        throw new Error("__SIMULATED_TRANSACTION_ABORT__");
      });
    } catch (e: any) {
      if (e.message === "__SIMULATED_TRANSACTION_ABORT__") {
        rollbackSuccess = true;
      }
    }

    const pwAfterRollback = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA1.id } },
    });
    const postRollbackMovementsCount = await prisma.stockMovement.count({
      where: { productId: prodA1.id, warehouseId: whA1.id },
    });

    const rollbackValid =
      rollbackSuccess &&
      pwAfterRollback !== null &&
      new Prisma.Decimal(pwAfterRollback.quantity).equals(new Prisma.Decimal("34.500")) &&
      postRollbackMovementsCount === preRollbackMovementsCount;

    record("TEST-2D", "Atomicity & Rollback", "Failed transaction rolls back balance changes and movement records", rollbackValid, `Movements pre=${preRollbackMovementsCount}, post=${postRollbackMovementsCount}, balance=${pwAfterRollback?.quantity}`);

    // 3E: Accurate fractional decimal math (3 decimal places)
    await InventoryMovementService.increaseStock({
      tenantId: tenantAlpha,
      productId: prodA2.id,
      warehouseId: whA1.id,
      quantity: "10.500",
      movementType: STOCK_MOVEMENT_TYPES.OPENING_STOCK,
    });
    await InventoryMovementService.decreaseStock({
      tenantId: tenantAlpha,
      productId: prodA2.id,
      warehouseId: whA1.id,
      quantity: "3.250",
      movementType: STOCK_MOVEMENT_TYPES.POS_SALE,
    });
    await InventoryMovementService.decreaseStock({
      tenantId: tenantAlpha,
      productId: prodA2.id,
      warehouseId: whA1.id,
      quantity: "2.125",
      movementType: STOCK_MOVEMENT_TYPES.POS_SALE,
    });

    const pwFractional = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA2.id, warehouseId: whA1.id } },
    });
    // 10.500 - 3.250 - 2.125 = 5.125
    const fractionalAccurate =
      pwFractional !== null &&
      new Prisma.Decimal(pwFractional.quantity).equals(new Prisma.Decimal("5.125"));

    record("TEST-2E", "Fractional Precision", "Fractional operations (10.500 - 3.250 - 2.125) equal exactly 5.125", fractionalAccurate, `Computed balance=${pwFractional?.quantity}`);

    // 3F: Multi-Warehouse Transfer (transferStock)
    const transferRes = await InventoryMovementService.transferStock({
      tenantId: tenantAlpha,
      fromWarehouseId: whA1.id,
      toWarehouseId: whA2.id,
      productId: prodA2.id,
      quantity: "2.125", // transferring from the 5.125 balance
      referenceType: "TRANSFER",
      referenceId: "TRF-TEST-999",
      notes: "Inter-branch restocking",
    });

    const pwWhA1 = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA2.id, warehouseId: whA1.id } },
    });
    const pwWhA2 = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA2.id, warehouseId: whA2.id } },
    });

    const smOut = await prisma.stockMovement.findUnique({ where: { id: transferRes.outMovement.movementId } });
    const smIn = await prisma.stockMovement.findUnique({ where: { id: transferRes.inMovement.movementId } });

    // whA1: 5.125 - 2.125 = 3.000
    // whA2: 0 + 2.125 = 2.125
    const transferValid =
      pwWhA1 !== null &&
      new Prisma.Decimal(pwWhA1.quantity).equals(new Prisma.Decimal("3.000")) &&
      pwWhA2 !== null &&
      new Prisma.Decimal(pwWhA2.quantity).equals(new Prisma.Decimal("2.125")) &&
      smOut?.movementType === STOCK_MOVEMENT_TYPES.TRANSFER_OUT &&
      smIn?.movementType === STOCK_MOVEMENT_TYPES.TRANSFER_IN;

    record("TEST-2F", "Multi-Warehouse Transfer", "transferStock coordinates atomic source deduction and destination addition", transferValid, `WH1=${pwWhA1?.quantity}, WH2=${pwWhA2?.quantity}, SM Out=${smOut?.quantity}, SM In=${smIn?.quantity}`);

    // 3G: Insufficient stock transfer fails and leaves BOTH warehouses unchanged
    let transferFailed = false;
    try {
      await InventoryMovementService.transferStock({
        tenantId: tenantAlpha,
        fromWarehouseId: whA1.id,
        toWarehouseId: whA2.id,
        productId: prodA2.id,
        quantity: "50.000", // WH1 only has 3.000
      });
    } catch (e: any) {
      transferFailed = e instanceof InsufficientStockError;
    }

    const pwWhA1After = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA2.id, warehouseId: whA1.id } },
    });
    const pwWhA2After = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA2.id, warehouseId: whA2.id } },
    });

    const transferBothUntouched =
      transferFailed &&
      new Prisma.Decimal(pwWhA1After!.quantity).equals(new Prisma.Decimal("3.000")) &&
      new Prisma.Decimal(pwWhA2After!.quantity).equals(new Prisma.Decimal("2.125"));

    record("TEST-2G", "Transfer Protection", "Insufficient stock transfer fails and leaves both warehouses unchanged", transferBothUntouched, `WH1=${pwWhA1After?.quantity}, WH2=${pwWhA2After?.quantity}`);

    // 3H: Cross-Tenant Isolation Enforcement
    let crossProductBlocked = false;
    let crossWarehouseBlocked = false;

    // Tenant Alpha attempts to manipulate Tenant Beta's product
    try {
      await InventoryMovementService.increaseStock({
        tenantId: tenantAlpha,
        productId: prodB1.id, // Beta's product
        warehouseId: whA1.id,
        quantity: "5.000",
        movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
      });
    } catch (e: any) {
      crossProductBlocked = e instanceof ProductNotFoundError;
    }

    // Tenant Alpha attempts to manipulate Tenant Beta's warehouse
    try {
      await InventoryMovementService.increaseStock({
        tenantId: tenantAlpha,
        productId: prodA1.id,
        warehouseId: whB1.id, // Beta's warehouse
        quantity: "5.000",
        movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
      });
    } catch (e: any) {
      crossWarehouseBlocked = e instanceof WarehouseNotFoundError;
    }

    record("TEST-2H", "Tenant Isolation", "Cross-tenant product and warehouse access is rejected", crossProductBlocked && crossWarehouseBlocked, `Blocked product=${crossProductBlocked}, Blocked warehouse=${crossWarehouseBlocked}`);

    // 3I: High-Concurrency Simultaneous Deductions (Race Condition Prevention)
    console.log("\n--- Executing 10-Client High Concurrency Race Test ---");
    // Seed initial stock to exactly 5.000
    await prisma.productWarehouse.upsert({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA2.id } },
      update: { quantity: new Prisma.Decimal("5.000") },
      create: { productId: prodA1.id, warehouseId: whA2.id, quantity: new Prisma.Decimal("5.000") },
    });

    // Fire 10 simultaneous deduction requests for 1.000 unit each
    const simultaneousCount = 10;
    const concurrencyPromises = Array.from({ length: simultaneousCount }, (_, idx) => {
      return InventoryMovementService.decreaseStock({
        tenantId: tenantAlpha,
        productId: prodA1.id,
        warehouseId: whA2.id,
        quantity: "1.000",
        movementType: STOCK_MOVEMENT_TYPES.POS_SALE,
        referenceType: "POS_RACE",
        referenceId: `RACE-${idx}`,
      })
        .then(() => ({ success: true, error: null }))
        .catch((err) => ({ success: false, error: err }));
    });

    const results = await Promise.all(concurrencyPromises);
    const successes = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success).length;

    const pwAfterRace = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA2.id } },
    });

    const raceMovements = await prisma.stockMovement.count({
      where: {
        tenantId: tenantAlpha,
        productId: prodA1.id,
        warehouseId: whA2.id,
        referenceType: "POS_RACE",
      },
    });

    // Exactly 5 should succeed, exactly 5 should fail, stock balance must be exactly 0.000 (never negative)
    const raceSafe =
      successes === 5 &&
      failures === 5 &&
      pwAfterRace !== null &&
      new Prisma.Decimal(pwAfterRace.quantity).equals(new Prisma.Decimal("0.000")) &&
      raceMovements === 5;

    record("TEST-2I", "Concurrency & Atomic Deductions", "High concurrency simultaneous checkout prevents oversell and negative stock", raceSafe, `Successes=${successes}, Failures=${failures}, Final balance=${pwAfterRace?.quantity}, Movements created=${raceMovements}`);

    // 3J: Stock Adjustment Helper (adjustStock)
    const adjAdd = await InventoryMovementService.adjustStock({
      tenantId: tenantAlpha,
      productId: prodA1.id,
      warehouseId: whA2.id,
      direction: "addition",
      quantity: "8.000",
      reason: "Cycle count surplus",
    });

    const adjSub = await InventoryMovementService.adjustStock({
      tenantId: tenantAlpha,
      productId: prodA1.id,
      warehouseId: whA2.id,
      direction: "subtraction",
      quantity: "3.000",
      reason: "Damaged packaging write-off",
    });

    const pwAfterAdj = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: prodA1.id, warehouseId: whA2.id } },
    });

    // 0 + 8 - 3 = 5.000
    const adjValid =
      adjAdd.movementType === STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN &&
      adjSub.movementType === STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT &&
      pwAfterAdj !== null &&
      new Prisma.Decimal(pwAfterAdj.quantity).equals(new Prisma.Decimal("5.000"));

    record("TEST-2J", "Stock Adjustment", "adjustStock routes addition and subtraction correctly with ledger entries", adjValid, `Balance after adjustments=${pwAfterAdj?.quantity}`);

  } catch (err: any) {
    console.error("Fatal error during Step 3.3.2 test execution:", err);
  } finally {
    // Clean up isolated test fixtures
    console.log("\n--- Cleaning up Isolated Test Fixtures ---");
    try {
      await prisma.stockMovement.deleteMany({
        where: { tenantId: { in: [tenantAlpha, tenantBeta] } },
      });
      await prisma.productWarehouse.deleteMany({
        where: { product: { tenantId: { in: [tenantAlpha, tenantBeta] } } },
      });
      await prisma.product.deleteMany({
        where: { tenantId: { in: [tenantAlpha, tenantBeta] } },
      });
      await prisma.warehouse.deleteMany({
        where: { tenantId: { in: [tenantAlpha, tenantBeta] } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantAlpha, tenantBeta] } },
      });
    } catch (cleanupErr) {
      console.warn("Fixture cleanup warning:", cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log("STEP 3.3.2 TEST RESULTS SUMMARY");
  console.log("================================================================================");
  const total = assertions.length;
  const passed = assertions.filter((a) => a.passed).length;
  const failed = total - passed;
  console.log(`TOTAL ASSERTIONS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runStep332TestSuite();
