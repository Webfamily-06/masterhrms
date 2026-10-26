"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryMovementService = exports.InventoryMovementService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const inventory_movement_types_1 = require("./inventory-movement.types");
const inventory_movement_errors_1 = require("./inventory-movement.errors");
__exportStar(require("./inventory-movement.types"), exports);
__exportStar(require("./inventory-movement.errors"), exports);
class InventoryMovementService {
    /**
     * Helper: Parse, validate, and convert a quantity input into a safe Prisma.Decimal
     * Enforces: finite, positive (> 0), maximum 3 decimal places.
     */
    static validateAndParseQuantity(rawQuantity, fieldName = "quantity") {
        if (rawQuantity === null || rawQuantity === undefined) {
            throw new inventory_movement_errors_1.InvalidQuantityError(`${fieldName} is required and cannot be null or undefined.`);
        }
        let decimal;
        try {
            if (rawQuantity instanceof client_1.Prisma.Decimal) {
                decimal = rawQuantity;
            }
            else {
                decimal = new client_1.Prisma.Decimal(rawQuantity.toString());
            }
        }
        catch {
            throw new inventory_movement_errors_1.InvalidQuantityError(`${fieldName} must be a valid numeric quantity.`);
        }
        if (!decimal.isFinite() || decimal.isNaN()) {
            throw new inventory_movement_errors_1.InvalidQuantityError(`${fieldName} must be a finite number.`);
        }
        if (!decimal.greaterThan(0)) {
            throw new inventory_movement_errors_1.InvalidQuantityError(`${fieldName} must be greater than zero. Received: ${decimal.toString()}`);
        }
        // Verify maximum 3 decimal places supported by DECIMAL(15, 3)
        if (decimal.decimalPlaces() > 3) {
            throw new inventory_movement_errors_1.InvalidQuantityError(`${fieldName} cannot exceed 3 decimal places. Received: ${decimal.toString()} (${decimal.decimalPlaces()} decimal places)`);
        }
        return decimal;
    }
    /**
     * Internal helper to verify tenant ownership of product and warehouse
     */
    static async verifyTenantEntities(client, tenantId, productId, warehouseId) {
        const db = client;
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
            throw new inventory_movement_errors_1.ProductNotFoundError(productId, tenantId);
        }
        if (!warehouse) {
            throw new inventory_movement_errors_1.WarehouseNotFoundError(warehouseId, tenantId);
        }
        return { product, warehouse };
    }
    /**
     * ATOMIC STOCK INCREASE (Inbound Stock)
     * Upserts the ProductWarehouse record, calculates before/after quantities,
     * and creates an append-only StockMovement audit record within the transaction.
     */
    static async increaseStock(params, clientTx) {
        const { tenantId, productId, warehouseId, quantity, movementType, referenceType, referenceId, notes, createdById, tx, } = params;
        const effectiveTx = clientTx || tx;
        const validQty = this.validateAndParseQuantity(quantity, "increase quantity");
        const executeOperation = async (client) => {
            await this.verifyTenantEntities(client, tenantId, productId, warehouseId);
            // Read current balance inside transaction boundary
            const existingPw = await client.productWarehouse.findUnique({
                where: {
                    productId_warehouseId: { productId, warehouseId },
                },
            });
            const beforeQuantity = existingPw
                ? new client_1.Prisma.Decimal(existingPw.quantity)
                : new client_1.Prisma.Decimal("0.000");
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
        return await prisma_1.rawPrisma.$transaction(async (innerTx) => {
            return await executeOperation(innerTx);
        });
    }
    /**
     * ATOMIC STOCK DECREASE (Outbound Stock)
     * Validates sufficient stock, applies conditional atomic decrement (preventing negative stock),
     * and creates an append-only StockMovement audit record within the transaction.
     */
    static async decreaseStock(params, clientTx) {
        const { tenantId, productId, warehouseId, quantity, movementType, referenceType, referenceId, notes, createdById, tx, } = params;
        const effectiveTx = clientTx || tx;
        const validQty = this.validateAndParseQuantity(quantity, "decrease quantity");
        const executeOperation = async (client) => {
            await this.verifyTenantEntities(client, tenantId, productId, warehouseId);
            // Fetch current balance
            const existingPw = await client.productWarehouse.findUnique({
                where: {
                    productId_warehouseId: { productId, warehouseId },
                },
            });
            const beforeQuantity = existingPw
                ? new client_1.Prisma.Decimal(existingPw.quantity)
                : new client_1.Prisma.Decimal("0.000");
            if (beforeQuantity.lessThan(validQty)) {
                throw new inventory_movement_errors_1.InsufficientStockError(productId, warehouseId, validQty.toString(), beforeQuantity.toString());
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
                throw new inventory_movement_errors_1.StockConcurrencyError(productId, warehouseId);
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
        return await prisma_1.rawPrisma.$transaction(async (innerTx) => {
            return await executeOperation(innerTx);
        });
    }
    /**
     * ATOMIC STOCK ADJUSTMENT
     * Routes to increaseStock or decreaseStock based on adjustment direction.
     */
    static async adjustStock(params, clientTx) {
        const { tenantId, productId, warehouseId, direction, quantity, reason, referenceType, referenceId, createdById, tx, } = params;
        const effectiveTx = clientTx || tx;
        if (direction === "addition") {
            return await this.increaseStock({
                tenantId,
                productId,
                warehouseId,
                quantity,
                movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
                referenceType: referenceType || "ADJUSTMENT",
                referenceId,
                notes: reason || null,
                createdById,
                tx: effectiveTx,
            });
        }
        else if (direction === "subtraction") {
            return await this.decreaseStock({
                tenantId,
                productId,
                warehouseId,
                quantity,
                movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT,
                referenceType: referenceType || "ADJUSTMENT",
                referenceId,
                notes: reason || null,
                createdById,
                tx: effectiveTx,
            });
        }
        else {
            throw new inventory_movement_errors_1.InventoryDomainError(`Invalid adjustment direction: ${direction}. Must be 'addition' or 'subtraction'.`, "INVALID_ADJUSTMENT_DIRECTION", 400);
        }
    }
    /**
     * ATOMIC WAREHOUSE TRANSFER
     * Atomically decrements source warehouse and increments destination warehouse,
     * creating corresponding TRANSFER_OUT and TRANSFER_IN movement records.
     */
    static async transferStock(params, clientTx) {
        const { tenantId, fromWarehouseId, toWarehouseId, productId, quantity, referenceType, referenceId, notes, createdById, tx, } = params;
        const effectiveTx = clientTx || tx;
        if (fromWarehouseId === toWarehouseId) {
            throw new inventory_movement_errors_1.InventoryDomainError("Source and destination warehouses cannot be the same.", "INVALID_TRANSFER_WAREHOUSES", 400);
        }
        const validQty = this.validateAndParseQuantity(quantity, "transfer quantity");
        const executeOperation = async (client) => {
            // Step 1: Decrement from source warehouse (fails atomically if insufficient stock)
            const outResult = await this.decreaseStock({
                tenantId,
                productId,
                warehouseId: fromWarehouseId,
                quantity: validQty,
                movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.TRANSFER_OUT,
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
                movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.TRANSFER_IN,
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
        return await prisma_1.rawPrisma.$transaction(async (innerTx) => {
            return await executeOperation(innerTx);
        });
    }
    /**
     * Helper: Get current stock balance for a product in a warehouse
     */
    static async getProductStock(tenantId, productId, warehouseId) {
        const pw = await prisma_1.rawPrisma.productWarehouse.findFirst({
            where: {
                productId,
                warehouseId,
                product: { tenantId },
            },
        });
        return pw ? new client_1.Prisma.Decimal(pw.quantity) : new client_1.Prisma.Decimal("0.000");
    }
    /**
     * Helper: Retrieve chronological stock movements for audit and ledger display
     */
    static async getStockMovements(params) {
        const { tenantId, productId, warehouseId, referenceType, referenceId, limit = 50, offset = 0 } = params;
        const where = { tenantId };
        if (productId)
            where.productId = productId;
        if (warehouseId)
            where.warehouseId = warehouseId;
        if (referenceType)
            where.referenceType = referenceType;
        if (referenceId)
            where.referenceId = referenceId;
        const [items, total] = await Promise.all([
            prisma_1.prisma.stockMovement.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true, sku: true } },
                    warehouse: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma_1.prisma.stockMovement.count({ where }),
        ]);
        return { items, total, limit, offset };
    }
    // ===========================================================================
    // PRESERVED WORKFLOW METHODS (Updated to create StockMovement records)
    // ===========================================================================
    /**
     * Create a new Multi-Warehouse Transfer request
     */
    static async createTransfer(params) {
        const { tenantId, fromWarehouseId, toWarehouseId, notes, items } = params;
        if (fromWarehouseId === toWarehouseId) {
            throw new Error("Source and destination warehouses cannot be the same");
        }
        if (!items || items.length === 0) {
            throw new Error("Transfer must include at least one product item");
        }
        // Verify both warehouses exist and belong to the active tenant
        const [fromWh, toWh] = await Promise.all([
            prisma_1.prisma.warehouse.findFirst({ where: { id: fromWarehouseId, tenantId } }),
            prisma_1.prisma.warehouse.findFirst({ where: { id: toWarehouseId, tenantId } }),
        ]);
        if (!fromWh || !toWh) {
            throw new Error("One or both warehouses not found or do not belong to tenant");
        }
        // Verify stock availability at source warehouse (batched)
        const productIds = Array.from(new Set(items.map((i) => i.productId)));
        const [stocks, products] = await Promise.all([
            prisma_1.prisma.productWarehouse.findMany({
                where: { warehouseId: fromWarehouseId, productId: { in: productIds } },
            }),
            prisma_1.prisma.product.findMany({
                where: { id: { in: productIds }, tenantId },
            }),
        ]);
        if (products.length !== productIds.length) {
            throw new Error("One or more products not found or unauthorized for tenant");
        }
        const stockMap = new Map(stocks.map((s) => [s.productId, new client_1.Prisma.Decimal(s.quantity)]));
        const productMap = new Map(products.map((p) => [p.id, p.name]));
        for (const item of items) {
            const parsedQty = this.validateAndParseQuantity(item.quantity, "item quantity");
            const currentQty = stockMap.get(item.productId) ?? new client_1.Prisma.Decimal("0.000");
            if (currentQty.lessThan(parsedQty)) {
                const prodName = productMap.get(item.productId) || item.productId;
                throw new Error(`Insufficient stock for "${prodName}". Available: ${currentQty.toString()}, Requested: ${parsedQty.toString()}`);
            }
        }
        const transferNo = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const transfer = await prisma_1.prisma.stockTransfer.create({
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
            await prisma_1.prisma.stockTransferDetail.create({
                data: {
                    transferId: transfer.id,
                    productId: item.productId,
                    quantity: this.validateAndParseQuantity(item.quantity),
                },
            });
        }
        return await prisma_1.prisma.stockTransfer.findUnique({
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
    static async updateTransferStatus(params) {
        const { transferId, newStatus, tenantId } = params;
        const transfer = await prisma_1.prisma.stockTransfer.findFirst({
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
        await prisma_1.prisma.$transaction(async (tx) => {
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
                throw new Error(`Stock transfer status changed concurrently (expected '${currentStatus}', found '${statusNow}'). No stock movement was applied; please retry.`);
            }
            // 1. When entering in_transit, atomically deduct quantity from source warehouse
            if (newStatus === "in_transit" && currentStatus !== "in_transit" && currentStatus !== "completed") {
                for (const item of transfer.details) {
                    await this.decreaseStock({
                        tenantId,
                        productId: item.productId,
                        warehouseId: transfer.fromWarehouseId,
                        quantity: new client_1.Prisma.Decimal(item.quantity),
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.TRANSFER_OUT,
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
                            quantity: new client_1.Prisma.Decimal(item.quantity),
                            movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.TRANSFER_OUT,
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
                        quantity: new client_1.Prisma.Decimal(item.quantity),
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.TRANSFER_IN,
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
                        quantity: new client_1.Prisma.Decimal(item.quantity),
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.TRANSFER_IN,
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
                throw new Error(`Stock transfer status changed concurrently (expected '${currentStatus}'). Transaction rolled back with no stock movement applied.`);
            }
        });
        return await prisma_1.prisma.stockTransfer.findUnique({
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
    static async recordAdjustment(params) {
        const { tenantId, warehouseId, type, reason, details } = params;
        return await prisma_1.prisma.$transaction(async (tx) => {
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
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT,
                        referenceType: "ADJUSTMENT",
                        referenceId: adjustment.id,
                        notes: reason || "Stock Adjustment Subtraction",
                        tx,
                    });
                }
                else {
                    await this.increaseStock({
                        tenantId,
                        productId: item.productId,
                        warehouseId,
                        quantity: itemQty,
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
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
    static async reconcilePhysicalStock(params) {
        const { tenantId, warehouseId, reason, counts } = params;
        return await prisma_1.prisma.$transaction(async (tx) => {
            const adjustmentLines = [];
            let overallType = "addition";
            let netDiff = new client_1.Prisma.Decimal("0.000");
            // Batch fetch system quantities for all reconciliation counts
            const countProductIds = Array.from(new Set(counts.map((c) => c.productId)));
            const existingStocks = await tx.productWarehouse.findMany({
                where: { warehouseId, productId: { in: countProductIds } },
            });
            const stockMap = new Map(existingStocks.map((s) => [s.productId, new client_1.Prisma.Decimal(s.quantity)]));
            for (const c of counts) {
                const physicalQty = this.validateAndParseQuantity(c.physicalQuantity, "physicalQuantity");
                const systemQty = stockMap.get(c.productId) ?? new client_1.Prisma.Decimal("0.000");
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
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.RECONCILIATION,
                        referenceType: "ADJUSTMENT",
                        referenceId: adjustment.id,
                        notes: `Physical reconciliation count surplus (+${line.quantity.toString()})`,
                        tx,
                    });
                }
                else {
                    // Physical is less than system: Decrease stock
                    await this.decreaseStock({
                        tenantId,
                        productId: line.productId,
                        warehouseId,
                        quantity: line.quantity,
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.RECONCILIATION,
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
    static async getWarehouseStockSummary(tenantId, warehouseId) {
        const where = { tenantId };
        if (warehouseId)
            where.id = warehouseId;
        const warehouses = await prisma_1.prisma.warehouse.findMany({
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
            const valuation = wh.stocks.reduce((acc, s) => acc + Number(s.quantity) * Number(s.product.purchasePrice || 0), 0);
            const lowStockCount = wh.stocks.filter((s) => Number(s.quantity) <= (s.product.lowStockThreshold || 5)).length;
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
exports.InventoryMovementService = InventoryMovementService;
exports.inventoryMovementService = InventoryMovementService;
