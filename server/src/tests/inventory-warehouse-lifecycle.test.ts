import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { rawPrisma as prisma } from "../prisma";
import { InventoryMovementService } from "../services/inventory-movement.service";
import { STOCK_MOVEMENT_TYPES } from "../services/inventory-movement.types";
import { InsufficientStockError, ProductNotFoundError } from "../services/inventory-movement.errors";

describe("Inventory & Multi-Warehouse Lifecycle Verification (Node Native)", () => {
  const tenantAId = `inv_tenant_a_${Date.now()}`;
  const tenantBId = `inv_tenant_b_${Date.now()}`;
  const userAId = `inv_user_a_${Date.now()}`;

  let productAId: string;
  let warehouseA1Id: string;
  let warehouseA2Id: string;
  let warehouseBId: string;

  before(async () => {
    // 1. Create tenants
    await prisma.tenant.upsert({
      where: { id: tenantAId },
      create: { id: tenantAId, name: "Inventory Tenant Alpha", slug: `inv-alpha-${Date.now()}` },
      update: {},
    });
    await prisma.tenant.upsert({
      where: { id: tenantBId },
      create: { id: tenantBId, name: "Inventory Tenant Beta", slug: `inv-beta-${Date.now()}` },
      update: {},
    });

    // 2. Create warehouses for Tenant Alpha
    const wh1 = await prisma.warehouse.create({
      data: {
        tenantId: tenantAId,
        name: "Central Logistics Hub",
        location: "100 Industrial Boulevard, Zone A",
        city: "Bangalore",
      },
    });
    warehouseA1Id = wh1.id;

    const wh2 = await prisma.warehouse.create({
      data: {
        tenantId: tenantAId,
        name: "North Satellite Depot",
        location: "400 Terminal Way, Bay 3",
        city: "Mumbai",
      },
    });
    warehouseA2Id = wh2.id;

    // 3. Create warehouse for Tenant Beta
    const whB = await prisma.warehouse.create({
      data: {
        tenantId: tenantBId,
        name: "Beta Regional Depot",
        location: "99 Outbound Way",
        city: "Chennai",
      },
    });
    warehouseBId = whB.id;

    // 4. Create product under Tenant Alpha
    const prod = await prisma.product.create({
      data: {
        tenantId: tenantAId,
        name: "Industrial Core Router 10Gbps",
        sku: `SKU-RTR-${Date.now()}`,
        barcode: "8901234567890",
        type: "Product",
        purchasePrice: 25000,
        salePrice: 35000,
        lowStockThreshold: 5,
      },
    });
    productAId = prod.id;
  });

  after(async () => {
    // Cleanup stock movements, product warehouses, products, warehouses, and tenants
    await prisma.stockMovement.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await prisma.productWarehouse.deleteMany({
      where: { warehouseId: { in: [warehouseA1Id, warehouseA2Id, warehouseBId] } },
    }).catch(() => {});
    await prisma.product.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await prisma.warehouse.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
  });

  it("1. Increases stock upon Purchase receipt into Warehouse A1 (FN-031, FN-034)", async () => {
    const result = await InventoryMovementService.increaseStock({
      tenantId: tenantAId,
      productId: productAId,
      warehouseId: warehouseA1Id,
      quantity: 50,
      movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT,
      referenceType: "PURCHASE_ORDER",
      referenceId: "PO-2026-001",
      notes: "Initial supplier shipment receipt",
      createdById: userAId,
    });

    assert.equal(result.beforeQuantity.toNumber(), 0);
    assert.equal(result.afterQuantity.toNumber(), 50);

    // Verify database record
    const pw = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: productAId, warehouseId: warehouseA1Id } },
    });
    assert.ok(pw !== null);
    assert.equal(new Prisma.Decimal(pw!.quantity).toNumber(), 50);
  });

  it("2. Atomically decreases stock upon Customer Sale fulfillment and verifies balance (ADDON-050)", async () => {
    const result = await InventoryMovementService.decreaseStock({
      tenantId: tenantAId,
      productId: productAId,
      warehouseId: warehouseA1Id,
      quantity: 15,
      movementType: STOCK_MOVEMENT_TYPES.SALES_INVOICE,
      referenceType: "SALES_INVOICE",
      referenceId: "INV-2026-001",
      notes: "Direct sale fulfillment",
      createdById: userAId,
    });

    assert.equal(result.beforeQuantity.toNumber(), 50);
    assert.equal(result.afterQuantity.toNumber(), 35);

    const pw = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: productAId, warehouseId: warehouseA1Id } },
    });
    assert.equal(new Prisma.Decimal(pw!.quantity).toNumber(), 35);
  });

  it("3. Enforces atomic protection against negative stock (InsufficientStockError)", async () => {
    await assert.rejects(
      async () => {
        await InventoryMovementService.decreaseStock({
          tenantId: tenantAId,
          productId: productAId,
          warehouseId: warehouseA1Id,
          quantity: 100, // Available: 35
          movementType: STOCK_MOVEMENT_TYPES.SALES_INVOICE,
        });
      },
      InsufficientStockError
    );

    // Verify balance remains completely unchanged
    const pw = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: productAId, warehouseId: warehouseA1Id } },
    });
    assert.equal(new Prisma.Decimal(pw!.quantity).toNumber(), 35);
  });

  it("4. Executes inter-warehouse stock transfer from Hub (A1) to Satellite (A2) (FN-032)", async () => {
    const transfer = await InventoryMovementService.transferStock({
      tenantId: tenantAId,
      fromWarehouseId: warehouseA1Id,
      toWarehouseId: warehouseA2Id,
      productId: productAId,
      quantity: 10,
      referenceType: "TRANSFER",
      referenceId: "TRF-2026-001",
      notes: "Replenish satellite stock",
      createdById: userAId,
    });

    assert.equal(transfer.outMovement.afterQuantity.toNumber(), 25); // 35 - 10 = 25
    assert.equal(transfer.inMovement.afterQuantity.toNumber(), 10);  // 0 + 10 = 10

    // Verify destination warehouse in DB
    const pwA2 = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: productAId, warehouseId: warehouseA2Id } },
    });
    assert.ok(pwA2 !== null);
    assert.equal(new Prisma.Decimal(pwA2!.quantity).toNumber(), 10);
  });

  it("5. Rejects transfer when source and destination warehouse are identical (FN-032)", async () => {
    await assert.rejects(
      async () => {
        await InventoryMovementService.transferStock({
          tenantId: tenantAId,
          fromWarehouseId: warehouseA1Id,
          toWarehouseId: warehouseA1Id, // Same warehouse!
          productId: productAId,
          quantity: 5,
        });
      },
      /cannot be the same/i
    );
  });

  it("6. Rejects transfer if source warehouse has insufficient stock (FN-032)", async () => {
    await assert.rejects(
      async () => {
        await InventoryMovementService.transferStock({
          tenantId: tenantAId,
          fromWarehouseId: warehouseA1Id,
          toWarehouseId: warehouseA2Id,
          productId: productAId,
          quantity: 50, // Only 25 available
        });
      },
      InsufficientStockError
    );
  });

  it("7. Executes stock adjustment for write-off/damaged inventory (FN-033)", async () => {
    const adj = await InventoryMovementService.adjustStock({
      tenantId: tenantAId,
      productId: productAId,
      warehouseId: warehouseA1Id,
      direction: "subtraction",
      quantity: 5, // Subtract 5 damaged/missing units
      reason: "Physical cycle count variance write-off",
      createdById: userAId,
    });

    assert.equal(adj.beforeQuantity.toNumber(), 25);
    assert.equal(adj.afterQuantity.toNumber(), 20);
    assert.equal(adj.quantityDelta.toNumber(), -5);

    const pw = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId: productAId, warehouseId: warehouseA1Id } },
    });
    assert.equal(new Prisma.Decimal(pw!.quantity).toNumber(), 20);
  });

  it("8. Verifies complete append-only audit trail in StockMovement ledger (FN-031)", async () => {
    const movements = await prisma.stockMovement.findMany({
      where: { tenantId: tenantAId, productId: productAId },
      orderBy: { createdAt: "asc" },
    });

    // 1: purchase (+50)
    // 2: sale (-15)
    // 3: transfer_out (-10)
    // 4: transfer_in (+10)
    // 5: adjustment (-5)
    assert.ok(movements.length >= 5);
    const types = movements.map((m) => m.movementType);
    assert.ok(types.includes(STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT));
    assert.ok(types.includes(STOCK_MOVEMENT_TYPES.SALES_INVOICE));
    assert.ok(types.includes(STOCK_MOVEMENT_TYPES.TRANSFER_OUT));
    assert.ok(types.includes(STOCK_MOVEMENT_TYPES.TRANSFER_IN));
    assert.ok(types.includes(STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT));
  });

  it("9. Enforces strict Multi-Tenant Boundary: Tenant B cannot manipulate Tenant A inventory (FN-031)", async () => {
    // Tenant B attempts to increase stock on Tenant A's product in Tenant B's warehouse
    await assert.rejects(
      async () => {
        await InventoryMovementService.increaseStock({
          tenantId: tenantBId,
          productId: productAId, // Belongs to Tenant A!
          warehouseId: warehouseBId,
          quantity: 20,
          movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT,
        });
      },
      ProductNotFoundError
    );

    // Tenant B attempts to transfer stock out of Tenant A's warehouse
    await assert.rejects(
      async () => {
        await InventoryMovementService.transferStock({
          tenantId: tenantBId,
          fromWarehouseId: warehouseA1Id, // Belongs to Tenant A!
          toWarehouseId: warehouseBId,
          productId: productAId,
          quantity: 10,
        });
      },
      ProductNotFoundError
    );
  });
});
