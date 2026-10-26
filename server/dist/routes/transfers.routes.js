"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transfersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const inventory_movement_service_1 = require("../services/inventory-movement.service");
const inventory_movement_errors_1 = require("../services/inventory-movement.errors");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const entitlements_1 = require("../middleware/entitlements");
exports.transfersRouter = (0, express_1.Router)();
// Enforce Request-Scoped Tenant Context and Product POS Entitlement on all stock transfer endpoints
exports.transfersRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("product_pos"));
/**
 * GET /api/transfers
 * List all stock transfers for the tenant (Stocky Rule 0: Universal Query Contract)
 */
exports.transfersRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 25);
        const status = req.query.status;
        const where = { tenantId };
        if (status && status !== "all") {
            where.status = status;
        }
        if (pagination.search) {
            where.OR = [
                { transferNo: { contains: pagination.search } },
                { notes: { contains: pagination.search } },
                { fromWarehouse: { name: { contains: pagination.search } } },
                { toWarehouse: { name: { contains: pagination.search } } },
            ];
        }
        const sortField = ["transferNo", "createdAt", "updatedAt", "status"].includes(pagination.sortField)
            ? pagination.sortField
            : "createdAt";
        const [total, transfers] = await Promise.all([
            prisma_1.prisma.stockTransfer.count({ where }),
            prisma_1.prisma.stockTransfer.findMany({
                where,
                include: {
                    fromWarehouse: true,
                    toWarehouse: true,
                    details: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    salePrice: true,
                                    purchasePrice: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { [sortField]: pagination.sortType },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(transfers, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json({ data: transfers });
    }
    catch (err) {
        console.error("Failed to list transfers:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch transfers" });
    }
});
/**
 * POST /api/transfers
 * Create a new stock transfer request
 */
exports.transfersRouter.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
        if (!fromWarehouseId || !toWarehouseId) {
            return res.status(400).json({ error: "Source and destination warehouses are required" });
        }
        if (fromWarehouseId === toWarehouseId) {
            return res.status(400).json({ error: "Source and destination warehouses cannot be the same" });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "At least one product item is required" });
        }
        const transfer = await inventory_movement_service_1.InventoryMovementService.createTransfer({
            tenantId,
            fromWarehouseId,
            toWarehouseId,
            notes,
            items,
        });
        return res.status(201).json({ data: transfer, message: "Transfer request created successfully" });
    }
    catch (err) {
        console.error("Failed to create transfer:", err);
        if (err instanceof inventory_movement_errors_1.InsufficientStockError || err.code === "INSUFFICIENT_STOCK" || err.message?.includes("Insufficient stock")) {
            return res.status(409).json({ error: err.message, code: "INSUFFICIENT_STOCK" });
        }
        return res.status(400).json({ error: err.message || "Transfer creation failed" });
    }
});
/**
 * PATCH /api/transfers/:id/status
 * Multi-Tier approval state transition (pending -> approved -> in_transit -> completed | rejected)
 */
exports.transfersRouter.patch("/:id/status", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const transferId = req.params.id;
        const { status } = req.body;
        if (!["approved", "in_transit", "completed", "rejected"].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be one of: "approved", "in_transit", "completed", "rejected"',
            });
        }
        const updated = await inventory_movement_service_1.InventoryMovementService.updateTransferStatus({
            transferId,
            newStatus: status,
            tenantId,
        });
        return res.json({ data: updated, message: `Transfer marked as ${status}` });
    }
    catch (err) {
        console.error("Failed to update transfer status:", err);
        if (err instanceof inventory_movement_errors_1.InsufficientStockError || err.code === "INSUFFICIENT_STOCK" || err.message?.includes("Insufficient stock")) {
            return res.status(409).json({ error: err.message, code: "INSUFFICIENT_STOCK" });
        }
        return res.status(400).json({ error: err.message || "Status transition failed" });
    }
});
/**
 * GET /api/transfers/warehouses/summary
 * Live stock valuations and levels across all warehouses
 */
exports.transfersRouter.get("/warehouses/summary", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const summary = await inventory_movement_service_1.InventoryMovementService.getWarehouseStockSummary(tenantId);
        return res.json({ data: summary });
    }
    catch (err) {
        console.error("Failed to get warehouse summary:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch summary" });
    }
});
/**
 * GET /api/transfers/adjustments
 * List stock adjustments for the tenant (Stocky Rule 0: Universal Query Contract)
 */
exports.transfersRouter.get("/adjustments", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 25);
        const warehouseId = req.query.warehouseId;
        const type = req.query.type;
        const where = { tenantId };
        if (warehouseId && warehouseId !== "all")
            where.warehouseId = warehouseId;
        if (type && type !== "all")
            where.type = type;
        if (pagination.search) {
            where.OR = [
                { reason: { contains: pagination.search } },
                { warehouse: { name: { contains: pagination.search } } },
                { details: { some: { product: { name: { contains: pagination.search } } } } },
            ];
        }
        const sortField = ["createdAt", "updatedAt", "type"].includes(pagination.sortField)
            ? pagination.sortField
            : "createdAt";
        const [total, adjustments] = await Promise.all([
            prisma_1.prisma.stockAdjustment.count({ where }),
            prisma_1.prisma.stockAdjustment.findMany({
                where,
                include: {
                    warehouse: true,
                    details: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    purchasePrice: true,
                                    salePrice: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { [sortField]: pagination.sortType },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(adjustments, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json({ data: adjustments });
    }
    catch (err) {
        console.error("Failed to list adjustments:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch adjustments" });
    }
});
/**
 * POST /api/transfers/adjustments
 * Record stock adjustment (waste, audit correction, damage) or physical stock reconciliation
 */
exports.transfersRouter.post("/adjustments", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { warehouseId, type, reason, details, counts, mode } = req.body;
        if (!warehouseId) {
            return res.status(400).json({ error: "Warehouse is required" });
        }
        // Physical audit reconciliation mode
        if (mode === "reconcile" || (counts && Array.isArray(counts))) {
            if (!counts || counts.length === 0) {
                return res.status(400).json({ error: "Physical counts list is required for reconciliation" });
            }
            const adjustment = await inventory_movement_service_1.InventoryMovementService.reconcilePhysicalStock({
                tenantId,
                warehouseId,
                reason,
                counts,
            });
            return res.status(200).json({
                data: adjustment,
                message: adjustment
                    ? "Physical stock reconciliation recorded successfully"
                    : "Stock counts already match system records. No adjustments needed.",
            });
        }
        if (!type || !details || details.length === 0) {
            return res.status(400).json({ error: "Adjustment type and details are required" });
        }
        const adjustment = await inventory_movement_service_1.InventoryMovementService.recordAdjustment({
            tenantId,
            warehouseId,
            type,
            reason,
            details,
        });
        return res.status(201).json({ data: adjustment, message: "Adjustment recorded successfully" });
    }
    catch (err) {
        console.error("Failed to record adjustment:", err);
        return res.status(400).json({ error: err.message || "Adjustment failed" });
    }
});
