import { Prisma } from "@prisma/client";
import { prisma, rawPrisma } from "../prisma";
import {
  DecimalValue,
  StockMovementType,
  STOCK_MOVEMENT_TYPES,
  IncreaseStockParams,
  DecreaseStockParams,
  AdjustStockParams,
  TransferStockParams,
  StockOperationResult,
  TransferStockResult,
  TransferItemInput,
} from "./inventory-movement.types";
import {
  InventoryDomainError,
  InvalidQuantityError,
  InsufficientStockError,
  ProductNotFoundError,
  WarehouseNotFoundError,
  StockConcurrencyError,
  TenantIsolationError,
} from "./inventory-movement.errors";

export * from "./inventory-movement.types";
export * from "./inventory-movement.errors";

export class InventoryMovementService {
  /**
   * Helper: Parse, validate, and convert a quantity input into a safe Prisma.Decimal
   * Enforces: finite, positive (> 0), maximum 3 decimal places.
   */
  public static validateAndParseQuantity(
    rawQuantity: DecimalValue,
    fieldName = "quantity"
  ): Prisma.Decimal {
    if (rawQuantity === null || rawQuantity === undefined) {
      throw new InvalidQuantityError(`${fieldName} is required and cannot be null or undefined.`);
    }

    let decimal: Prisma.Decimal;
    try {
      if (rawQuantity instanceof Prisma.Decimal) {
        decimal = rawQuantity;
      } else {
        decimal = new Prisma.Decimal(rawQuantity.toString());
      }
    } catch {
      throw new InvalidQuantityError(`${fieldName} must be a valid numeric quantity.`);
    }

    if (!decimal.isFinite() || decimal.isNaN()) {
      throw new InvalidQuantityError(`${fieldName} must be a finite number.`);
    }

    if (!decimal.greaterThan(0)) {
      throw new InvalidQuantityError(`${fieldName} must be greater than zero. Received: ${decimal.toString()}`);
    }

    // Verify maximum 3 decimal places supported by DECIMAL(15, 3)
    if (decimal.decimalPlaces() > 3) {
      throw new InvalidQuantityError(
        `${fieldName} cannot exceed 3 decimal places. Received: ${decimal.toString()} (${decimal.decimalPlaces()} decimal places)`
      );
    }

    return decimal;
  }

  /**
   * Internal helper to verify tenant ownership of product and warehouse
   */
  private static async verifyTenantEntities(
    client: Prisma.TransactionClient | typeof prisma,
    tenantId: string,
    productId: string,
    warehouseId: string
  ): Promise<{ product: any; warehouse: any }> {
    const db = client as any;
    const [product, warehouse] = await Promise.all([
      db.product.findFirst({
        where: { id: productId, tenantId },
        select: { id: true, name: true, sku: true, tenantId: true },
      }),
      db.warehouse.findFirst({
        where: { id: warehouseId, tenantId },
        select: { id: true, name: true, tenantId: true },
      }),
    ]);

    if (!product) {
      throw new ProductNotFoundError(productId, tenantId);
    }

    if (!warehouse) {
      throw new WarehouseNotFoundError(warehouseId, tenantId);
    }

    return { product, warehouse };
  }

  /**
   * ATOMIC STOCK INCREASE (Inbound Stock)
   * Upserts the ProductWarehouse record, calculates before/after quantities,
   * and creates an append-only StockMovement audit record within the transaction.
   */
  public static async increaseStock(
    params: IncreaseStockParams,
    clientTx?: Prisma.TransactionClient
  ): Promise<StockOperationResult> {
    const {
      tenantId,
      productId,
      warehouseId,
      quantity,
      movementType,
      referenceType,
      referenceId,
      notes,
      createdById,
      tx,
    } = params;

    const effectiveTx = clientTx || tx;
    const validQty = this.validateAndParseQuantity(quantity, "increase quantity");

    const executeOperation = async (client: Prisma.TransactionClient): Promise<StockOperationResult> => {
      await this.verifyTenantEntities(client, tenantId, productId, warehouseId);

      // Read current balance inside transaction boundary
      const existingPw = await client.productWarehouse.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      });

      const beforeQuantity = existingPw
        ? new Prisma.Decimal(existingPw.quantity)
        : new Prisma.Decimal("0.000");
      const afterQuantity = beforeQuantity.add(validQty);

      // Upsert ProductWarehouse balance
      await client.productWarehouse.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        update: {
          quantity: { increment: validQty },
        },
        create: {
          productId,
          warehouseId,
          quantity: validQty,
        },
      });

      // Insert append-only StockMovement ledger record
      const movement = await client.stockMovement.create({
        data: {
          tenantId,
          productId,
          warehouseId,
          movementType,
          quantity: validQty, // Positive for inbound
          beforeQuantity,
          afterQuantity,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          notes: notes || null,
          createdById: createdById || null,
        },
      });

      return {
        movementId: movement.id,
        tenantId,
        productId,
        warehouseId,
        movementType,
        quantityDelta: validQty,
        beforeQuantity,
        afterQuantity,
      };
    };

    if (effectiveTx) {
      return await executeOperation(effectiveTx);
    }

    return await rawPrisma.$transaction(async (innerTx) => {
      return await executeOperation(innerTx);
    });
  }

  /**
   * ATOMIC STOCK DECREASE (Outbound Stock)
   * Validates sufficient stock, applies conditional atomic decrement (preventing negative stock),
   * and creates an append-only StockMovement audit record within the transaction.
   */
  public static async decreaseStock(
    params: DecreaseStockParams,
    clientTx?: Prisma.TransactionClient
  ): Promise<StockOperationResult> {
    const {
      tenantId,
      productId,
      warehouseId,
      quantity,
      movementType,
      referenceType,
      referenceId,
      notes,
      createdById,
      tx,
    } = params;

    const effectiveTx = clientTx || tx;
    const validQty = this.validateAndParseQuantity(quantity, "decrease quantity");

    const executeOperation = async (client: Prisma.TransactionClient): Promise<StockOperationResult> => {
      await this.verifyTenantEntities(client, tenantId, productId, warehouseId);

      // Fetch current balance
      const existingPw = await client.productWarehouse.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      });

      const beforeQuantity = existingPw
        ? new Prisma.Decimal(existingPw.quantity)
        : new Prisma.Decimal("0.000");

      if (beforeQuantity.lessThan(validQty)) {
        throw new InsufficientStockError(
          productId,
          warehouseId,
          validQty.toString(),
          beforeQuantity.toString()
        );
      }

      // Safe atomic conditional decrement: ensures stock cannot drop below zero even under concurrency
      const updateResult = await client.productWarehouse.updateMany({
        where: {
          productId,
          warehouseId,
          quantity: { gte: validQty },
        },
        data: {
          quantity: { decrement: validQty },
        },
      });

      if (updateResult.count === 0) {
        // Concurrency conflict: another simultaneous request depleted the stock
        throw new StockConcurrencyError(productId, warehouseId);
      }

      const afterQuantity = beforeQuantity.sub(validQty);

      // Insert append-only StockMovement ledger record (negative delta for outbound)
      const movement = await client.stockMovement.create({
        data: {
          tenantId,
          productId,
          warehouseId,
          movementType,
          quantity: validQty.negated(),
          beforeQuantity,
          afterQuantity,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          notes: notes || null,
          createdById: createdById || null,
        },
      });

      return {
        movementId: movement.id,
        tenantId,
        productId,
        warehouseId,
        movementType,
        quantityDelta: validQty.negated(),
        beforeQuantity,
        afterQuantity,
      };
    };

    if (effectiveTx) {
      return await executeOperation(effectiveTx);
    }

    return await rawPrisma.$transaction(async (innerTx) => {
      return await executeOperation(innerTx);
    });
  }

  /**
   * ATOMIC STOCK ADJUSTMENT
   * Routes to increaseStock or decreaseStock based on adjustment direction.
   */
  public static async adjustStock(
    params: AdjustStockParams,
    clientTx?: Prisma.TransactionClient
  ): Promise<StockOperationResult> {
    const {
      tenantId,
      productId,
      warehouseId,
      direction,
      quantity,
      reason,
      referenceType,
      referenceId,
      createdById,
      tx,
    } = params;

    const effectiveTx = clientTx || tx;

    if (direction === "addition") {
      return await this.increaseStock({
        tenantId,
        productId,
        warehouseId,
        quantity,
        movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
        referenceType: referenceType || "ADJUSTMENT",
        referenceId,
        notes: reason || null,
        createdById,
        tx: effectiveTx,
      });
    } else if (direction === "subtraction") {
      return await this.decreaseStock({
        tenantId,
        productId,
        warehouseId,
        quantity,
        movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT,
        referenceType: referenceType || "ADJUSTMENT",
        referenceId,
        notes: reason || null,
        createdById,
        tx: effectiveTx,
      });
    } else {
      throw new InventoryDomainError(
        `Invalid adjustment direction: ${direction}. Must be 'addition' or 'subtraction'.`,
        "INVALID_ADJUSTMENT_DIRECTION",
        400
      );
    }
  }

  /**
   * ATOMIC WAREHOUSE TRANSFER
   * Atomically decrements source warehouse and increments destination warehouse,
   * creating corresponding TRANSFER_OUT and TRANSFER_IN movement records.
   */
  public static async transferStock(
    params: TransferStockParams,
    clientTx?: Prisma.TransactionClient
  ): Promise<TransferStockResult> {
    const {
      tenantId,
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity,
      referenceType,
      referenceId,
      notes,
      createdById,
      tx,
    } = params;

    const effectiveTx = clientTx || tx;

    if (fromWarehouseId === toWarehouseId) {
      throw new InventoryDomainError(
        "Source and destination warehouses cannot be the same.",
        "INVALID_TRANSFER_WAREHOUSES",
        400
      );
    }

    const validQty = this.validateAndParseQuantity(quantity, "transfer quantity");

    const executeOperation = async (client: Prisma.TransactionClient): Promise<TransferStockResult> => {
      // Step 1: Decrement from source warehouse (fails atomically if insufficient stock)
      const outResult = await this.decreaseStock({
        tenantId,
        productId,
        warehouseId: fromWarehouseId,
        quantity: validQty,
        movementType: STOCK_MOVEMENT_TYPES.TRANSFER_OUT,
        referenceType: referenceType || "TRANSFER",
        referenceId,
        notes: notes ? `Transfer Out: ${notes}` : "Transfer Out to " + toWarehouseId,
        createdById,
        tx: client,
      });

      // Step 2: Increment at destination warehouse
      const inResult = await this.increaseStock({
        tenantId,
        productId,
        warehouseId: toWarehouseId,
        quantity: validQty,
        movementType: STOCK_MOVEMENT_TYPES.TRANSFER_IN,
        referenceType: referenceType || "TRANSFER",
        referenceId,
        notes: notes ? `Transfer In: ${notes}` : "Transfer In from " + fromWarehouseId,
        createdById,
        tx: client,
      });

      return {
        outMovement: outResult,
        inMovement: inResult,
        fromWarehouseBalanceAfter: outResult.afterQuantity,
        toWarehouseBalanceAfter: inResult.afterQuantity,
      };
    };

    if (effectiveTx) {
      return await executeOperation(effectiveTx);
    }

    return await rawPrisma.$transaction(async (innerTx) => {
      return await executeOperation(innerTx);
    });
  }

  /**
   * Helper: Get current stock balance for a product in a warehouse
   */
  public static async getProductStock(
    tenantId: string,
    productId: string,
    warehouseId: string
  ): Promise<Prisma.Decimal> {
    const pw = await rawPrisma.productWarehouse.findFirst({
      where: {
        productId,
        warehouseId,
        product: { tenantId },
      },
    });

    return pw ? new Prisma.Decimal(pw.quantity) : new Prisma.Decimal("0.000");
  }

  /**
   * Helper: Retrieve chronological stock movements for audit and ledger display
   */
  public static async getStockMovements(params: {
    tenantId: string;
    productId?: string;
    warehouseId?: string;
    referenceType?: string;
    referenceId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { tenantId, productId, warehouseId, referenceType, referenceId, limit = 50, offset = 0 } = params;

    const where: Prisma.StockMovementWhereInput = { tenantId };
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (referenceType) where.referenceType = referenceType;
    if (referenceId) where.referenceId = referenceId;

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  // ===========================================================================
  // PRESERVED WORKFLOW METHODS (Updated to create StockMovement records)
  // ===========================================================================

  /**
   * Create a new Multi-Warehouse Transfer request
   */
  static async createTransfer(params: {
    tenantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    notes?: string;
    items: TransferItemInput[];
  }) {
    const { tenantId, fromWarehouseId, toWarehouseId, notes, items } = params;

    if (fromWarehouseId === toWarehouseId) {
      throw new Error("Source and destination warehouses cannot be the same");
    }

    if (!items || items.length === 0) {
      throw new Error("Transfer must include at least one product item");
    }

    // Verify both warehouses exist and belong to the active tenant
    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: fromWarehouseId, tenantId } }),
      prisma.warehouse.findFirst({ where: { id: toWarehouseId, tenantId } }),
    ]);
    if (!fromWh || !toWh) {
      throw new Error("One or both warehouses not found or do not belong to tenant");
    }

    // Verify stock availability at source warehouse (batched)
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const [stocks, products] = await Promise.all([
      prisma.productWarehouse.findMany({
        where: { warehouseId: fromWarehouseId, productId: { in: productIds } },
      }),
      prisma.product.findMany({
        where: { id: { in: productIds }, tenantId },
      }),
    ]);

    if (products.length !== productIds.length) {
      throw new Error("One or more products not found or unauthorized for tenant");
    }

    const stockMap = new Map(stocks.map((s) => [s.productId, new Prisma.Decimal(s.quantity)]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    for (const item of items) {
      const parsedQty = this.validateAndParseQuantity(item.quantity, "item quantity");
      const currentQty = stockMap.get(item.productId) ?? new Prisma.Decimal("0.000");
      if (currentQty.lessThan(parsedQty)) {
        const prodName = productMap.get(item.productId) || item.productId;
        throw new Error(
          `Insufficient stock for "${prodName}". Available: ${currentQty.toString()}, Requested: ${parsedQty.toString()}`
        );
      }
    }

    const transferNo = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId,
        transferNo,
        fromWarehouseId,
        toWarehouseId,
        status: "pending",
        notes: notes || null,
      },
    });

    for (const item of items) {
      await prisma.stockTransferDetail.create({
        data: {
          transferId: transfer.id,
          productId: item.productId,
          quantity: this.validateAndParseQuantity(item.quantity),
        },
      });
    }

    return await prisma.stockTransfer.findUnique({
      where: { id: transfer.id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        details: {
          include: {
            product: true,
          },
        },
      },
    });

    return transfer;
  }

  /**
   * Process State Transitions for Multi-Tier Approval Workflow
   * States: pending -> approved -> in_transit -> completed | rejected
   */
  static async updateTransferStatus(params: {
    transferId: string;
    newStatus: "approved" | "in_transit" | "completed" | "rejected";
    tenantId: string;
  }) {
    const { transferId, newStatus, tenantId } = params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { details: true },
    });

    if (!transfer) {
      throw new Error("Stock transfer not found or unauthorized");
    }

    const currentStatus = transfer.status.toLowerCase();

    if (currentStatus === newStatus) {
      return transfer;
    }

    if (currentStatus === "completed" || currentStatus === "rejected") {
      throw new Error(`Cannot change status of an already-${currentStatus} stock transfer`);
    }

    // Execute atomic balance movements depending on state transition
    await prisma.$transaction(async (tx) => {
      // Step 3.3.5 concurrency guard: re-read the CURRENT status inside the transaction
      // and apply a conditional UPDATE (status = currentStatus). Two simultaneous
      // completion requests cannot both execute the paired TRANSFER_OUT/TRANSFER_IN
      // movements — the loser updates 0 rows and the whole transaction rolls back.
      const currentInTx = await tx.stockTransfer.findFirst({
        where: { id: transferId, tenantId },
        select: { status: true },
      });
      if (!currentInTx) {
        throw new Error("Stock transfer not found or unauthorized");
      }
      const statusNow = currentInTx.status.toLowerCase();
      if (statusNow !== currentStatus) {
        throw new Error(
          `Stock transfer status changed concurrently (expected '${currentStatus}', found '${statusNow}'). No stock movement was applied; please retry.`
        );
      }

      // 1. When entering in_transit, atomically deduct quantity from source warehouse
      if (newStatus === "in_transit" && currentStatus !== "in_transit" && currentStatus !== "completed") {
        for (const item of transfer.details) {
          await this.decreaseStock({
            tenantId,
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: new Prisma.Decimal(item.quantity),
            movementType: STOCK_MOVEMENT_TYPES.TRANSFER_OUT,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            notes: `Transfer dispatched in transit (${transfer.transferNo})`,
            tx,
          });
        }
      }

      // 2. When completed, ensure source was deducted, then add quantity to destination warehouse
      if (newStatus === "completed") {
        if (currentStatus !== "in_transit") {
          // If jumped straight from pending/approved to completed, deduct source first with atomic guard
          for (const item of transfer.details) {
            await this.decreaseStock({
              tenantId,
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              quantity: new Prisma.Decimal(item.quantity),
              movementType: STOCK_MOVEMENT_TYPES.TRANSFER_OUT,
              referenceType: "TRANSFER",
              referenceId: transfer.id,
              notes: `Transfer completed direct (${transfer.transferNo})`,
              tx,
            });
          }
        }

        // Add to destination
        for (const item of transfer.details) {
          await this.increaseStock({
            tenantId,
            productId: item.productId,
            warehouseId: transfer.toWarehouseId,
            quantity: new Prisma.Decimal(item.quantity),
            movementType: STOCK_MOVEMENT_TYPES.TRANSFER_IN,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            notes: `Transfer received at destination (${transfer.transferNo})`,
            tx,
          });
        }
      }

      // 3. When rejected after in_transit, restore stock back to source warehouse
      if (newStatus === "rejected" && currentStatus === "in_transit") {
        for (const item of transfer.details) {
          await this.increaseStock({
            tenantId,
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: new Prisma.Decimal(item.quantity),
            movementType: STOCK_MOVEMENT_TYPES.TRANSFER_IN,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            notes: `Transfer rejected in transit - stock restored to source (${transfer.transferNo})`,
            tx,
          });
        }
      }

      // Update transfer status with conditional guard (0 rows = concurrent mutation)
      const statusUpdate = await tx.stockTransfer.updateMany({
        where: { id: transferId, tenantId, status: transfer.status },
        data: { status: newStatus },
      });
      if (statusUpdate.count === 0) {
        throw new Error(
          `Stock transfer status changed concurrently (expected '${currentStatus}'). Transaction rolled back with no stock movement applied.`
        );
      }
    });

    return await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        details: { include: { product: true } },
      },
    });
  }

  /**
   * Record Stock Adjustment (Addition / Subtraction / Damage) with concurrency checks
   */
  static async recordAdjustment(params: {
    tenantId: string;
    warehouseId: string;
    type: "addition" | "subtraction";
    reason?: string;
    details: { productId: string; quantity: DecimalValue }[];
  }) {
    const { tenantId, warehouseId, type, reason, details } = params;

    return await prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          warehouseId,
          type,
          reason: reason || null,
        },
      });

      for (const d of details) {
        await tx.stockAdjustmentDetail.create({
          data: {
            adjustmentId: adjustment.id,
            productId: d.productId,
            quantity: this.validateAndParseQuantity(d.quantity),
          },
        });
      }

      // Update warehouse stock levels with atomic boundary validation and record movements
      for (const item of details) {
        const itemQty = this.validateAndParseQuantity(item.quantity);
        if (type === "subtraction") {
          await this.decreaseStock({
            tenantId,
            productId: item.productId,
            warehouseId,
            quantity: itemQty,
            movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT,
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            notes: reason || "Stock Adjustment Subtraction",
            tx,
          });
        } else {
          await this.increaseStock({
            tenantId,
            productId: item.productId,
            warehouseId,
            quantity: itemQty,
            movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            notes: reason || "Stock Adjustment Addition",
            tx,
          });
        }
      }

      return await tx.stockAdjustment.findUniqueOrThrow({
        where: { id: adjustment.id },
        include: {
          warehouse: true,
          details: { include: { product: true } },
        },
      });
    });
  }

  /**
   * Reconcile Physical Stock (Physical Count Audit)
   * Calculates difference between physical count and system stock,
   * records corresponding adjustment, and updates stock to exact physical count.
   */
  static async reconcilePhysicalStock(params: {
    tenantId: string;
    warehouseId: string;
    reason?: string;
    counts: { productId: string; physicalQuantity: DecimalValue }[];
  }) {
    const { tenantId, warehouseId, reason, counts } = params;

    return await prisma.$transaction(async (tx) => {
      const adjustmentLines: { productId: string; quantity: Prisma.Decimal; diff: Prisma.Decimal }[] = [];
      let overallType: "addition" | "subtraction" = "addition";
      let netDiff = new Prisma.Decimal("0.000");

      // Batch fetch system quantities for all reconciliation counts
      const countProductIds = Array.from(new Set(counts.map((c) => c.productId)));
      const existingStocks = await tx.productWarehouse.findMany({
        where: { warehouseId, productId: { in: countProductIds } },
      });
      const stockMap = new Map(existingStocks.map((s) => [s.productId, new Prisma.Decimal(s.quantity)]));

      for (const c of counts) {
        const physicalQty = this.validateAndParseQuantity(c.physicalQuantity, "physicalQuantity");
        const systemQty = stockMap.get(c.productId) ?? new Prisma.Decimal("0.000");
        const diff = physicalQty.sub(systemQty);

        if (!diff.isZero()) {
          const absDiff = diff.abs();
          adjustmentLines.push({
            productId: c.productId,
            quantity: absDiff,
            diff,
          });
          netDiff = netDiff.add(diff);
        }
      }

      if (adjustmentLines.length === 0) {
        return null;
      }

      overallType = netDiff.gte(0) ? "addition" : "subtraction";

      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          warehouseId,
          type: overallType,
          reason: reason || "Physical Inventory Audit Reconciliation",
        },
      });

      for (const l of adjustmentLines) {
        await tx.stockAdjustmentDetail.create({
          data: {
            adjustmentId: adjustment.id,
            productId: l.productId,
            quantity: l.quantity,
          },
        });
      }

      // Execute atomic stock delta and movements
      for (const line of adjustmentLines) {
        if (line.diff.greaterThan(0)) {
          // Physical is more than system: Increase stock
          await this.increaseStock({
            tenantId,
            productId: line.productId,
            warehouseId,
            quantity: line.quantity,
            movementType: STOCK_MOVEMENT_TYPES.RECONCILIATION,
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            notes: `Physical reconciliation count surplus (+${line.quantity.toString()})`,
            tx,
          });
        } else {
          // Physical is less than system: Decrease stock
          await this.decreaseStock({
            tenantId,
            productId: line.productId,
            warehouseId,
            quantity: line.quantity,
            movementType: STOCK_MOVEMENT_TYPES.RECONCILIATION,
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            notes: `Physical reconciliation count deficit (-${line.quantity.toString()})`,
            tx,
          });
        }
      }

      return await tx.stockAdjustment.findUniqueOrThrow({
        where: { id: adjustment.id },
        include: {
          warehouse: true,
          details: { include: { product: true } },
        },
      });
    });
  }

  /**
   * Get warehouse stock summary with total units and estimated inventory valuation
   */
  static async getWarehouseStockSummary(tenantId: string, warehouseId?: string) {
    const where: any = { tenantId };
    if (warehouseId) where.id = warehouseId;

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                purchasePrice: true,
                lowStockThreshold: true,
              },
            },
          },
        },
      },
    });

    return warehouses.map((wh) => {
      const totalUnits = wh.stocks.reduce((acc, s) => acc + Number(s.quantity), 0);
      const valuation = wh.stocks.reduce(
        (acc, s) => acc + Number(s.quantity) * Number(s.product.purchasePrice || 0),
        0
      );
      const lowStockCount = wh.stocks.filter(
        (s) => Number(s.quantity) <= (s.product.lowStockThreshold || 5)
      ).length;

      return {
        id: wh.id,
        name: wh.name,
        location: wh.location,
        isDefault: wh.isDefault,
        totalUnits,
        valuation,
        lowStockCount,
        stockItems: wh.stocks.map((s) => ({
          productId: s.productId,
          productName: s.product.name,
          sku: s.product.sku,
          quantity: Number(s.quantity),
          purchasePrice: Number(s.product.purchasePrice || 0),
          salePrice: Number(s.product.salePrice || 0),
          isLowStock: Number(s.quantity) <= (s.product.lowStockThreshold || 5),
        })),
      };
    });
  }
}

export const inventoryMovementService = InventoryMovementService;
