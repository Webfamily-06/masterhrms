"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustmentsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const inventory_movement_service_1 = require("../services/inventory-movement.service");
const inventory_movement_errors_1 = require("../services/inventory-movement.errors");
const ledger_posting_service_1 = require("../services/ledger-posting.service");
const socket_1 = require("../socket");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const entitlements_1 = require("../middleware/entitlements");
exports.adjustmentsRouter = (0, express_1.Router)();
// Enforce Request-Scoped Tenant Context and Product POS Entitlement on all stock adjustment endpoints
exports.adjustmentsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("product_pos"));
/**
 * GET /api/adjustments
 * List physical stock adjustments for the tenant with aggregated metrics (Stocky Rule 0)
 */
exports.adjustmentsRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 25);
        const { warehouseId, type } = req.query;
        const where = { tenantId };
        if (warehouseId && warehouseId !== "all") {
            where.warehouseId = String(warehouseId);
        }
        if (type && type !== "all") {
            where.type = String(type);
        }
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
                                    unit: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { [sortField]: pagination.sortType },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        // Compute summary metrics
        let totalAdditionsCount = 0;
        let totalSubtractionsCount = 0;
        let totalAddedUnits = 0;
        let totalSubtractedUnits = 0;
        let totalValuationImpact = 0;
        for (const adj of adjustments) {
            const isAdd = adj.type.toLowerCase() === "addition";
            if (isAdd) {
                totalAdditionsCount++;
            }
            else {
                totalSubtractionsCount++;
            }
            for (const d of adj.details) {
                const qty = Number(d.quantity || 0);
                const price = Number(d.product?.purchasePrice || 0);
                if (isAdd) {
                    totalAddedUnits += qty;
                }
                else {
                    totalSubtractedUnits += qty;
                }
                totalValuationImpact += qty * price;
            }
        }
        const metrics = {
            totalCount: total,
            totalAdditionsCount,
            totalSubtractionsCount,
            totalAddedUnits,
            totalSubtractedUnits,
            netUnitsAdjusted: totalAddedUnits - totalSubtractedUnits,
            totalValuationImpact,
        };
        if (pagination.isPaginated) {
            const envelope = (0, pagination_1.formatPaginatedResponse)(adjustments, total, pagination);
            return res.json({ ...envelope, metrics });
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json({
            data: adjustments,
            metrics,
        });
    }
    catch (err) {
        console.error("GET /api/adjustments error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch stock adjustments" });
    }
});
/**
 * GET /api/adjustments/:id
 * Retrieve single physical adjustment details
 */
exports.adjustmentsRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const adjustment = await prisma_1.prisma.stockAdjustment.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                warehouse: true,
                details: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        if (!adjustment) {
            return res.status(404).json({ error: "Stock adjustment record not found" });
        }
        return res.json({ data: adjustment });
    }
    catch (err) {
        console.error("GET /api/adjustments/:id error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch adjustment details" });
    }
});
/**
 * POST /api/adjustments
 * Record a new physical stock adjustment or physical inventory audit reconciliation
 */
exports.adjustmentsRouter.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { warehouseId, type, reason, details, counts, mode } = req.body;
        if (!warehouseId) {
            return res.status(400).json({ error: "Target warehouse is required" });
        }
        // Verify warehouse exists
        const warehouse = await prisma_1.prisma.warehouse.findFirst({
            where: { id: warehouseId, tenantId },
        });
        if (!warehouse) {
            return res.status(404).json({ error: "Selected warehouse does not exist or unauthorized" });
        }
        // Physical count audit reconciliation mode
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
            if (adjustment) {
                // Auto-post to GL
                let totalValuation = 0;
                for (const d of adjustment.details) {
                    const product = await prisma_1.prisma.product.findUnique({
                        where: { id: d.productId },
                        select: { purchasePrice: true },
                    });
                    totalValuation += Number(d.quantity) * Number(product?.purchasePrice || 0);
                }
                await (0, ledger_posting_service_1.autoPostStockAdjustmentToLedger)({
                    tenantId,
                    adjustmentId: adjustment.id,
                    warehouseName: warehouse.name,
                    type: adjustment.type,
                    totalValue: Math.round(totalValuation * 100) / 100,
                    reason: adjustment.reason || "Physical Audit Reconciliation",
                });
                (0, socket_1.broadcastToTenant)(tenantId, "stock:adjusted", {
                    adjustmentId: adjustment.id,
                    warehouseId,
                    type: adjustment.type,
                });
            }
            return res.status(200).json({
                data: adjustment,
                message: adjustment
                    ? `Physical stock audit reconciliation recorded and ledger posted successfully`
                    : "Stock counts already match system records. No adjustments needed.",
            });
        }
        if (!type || !["addition", "subtraction"].includes(type)) {
            return res.status(400).json({ error: 'Adjustment type must be either "addition" or "subtraction"' });
        }
        if (!details || !Array.isArray(details) || details.length === 0) {
            return res.status(400).json({ error: "At least one product item line is required for adjustment" });
        }
        // Execute atomic balance movements
        const adjustment = await inventory_movement_service_1.InventoryMovementService.recordAdjustment({
            tenantId,
            warehouseId,
            type,
            reason,
            details: details.map((d) => ({
                productId: d.productId,
                quantity: d.quantity !== undefined ? d.quantity : 1,
            })),
        });
        // Calculate valuation for double-entry GL auto-posting
        let totalValuation = 0;
        const productIds = details.map((d) => d.productId);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, purchasePrice: true },
        });
        const priceMap = new Map();
        products.forEach((p) => priceMap.set(p.id, Number(p.purchasePrice || 0)));
        for (const d of details) {
            const qty = Number(d.quantity || 1);
            const cost = priceMap.get(d.productId) || 0;
            totalValuation += qty * cost;
        }
        // Auto-post to General Ledger
        await (0, ledger_posting_service_1.autoPostStockAdjustmentToLedger)({
            tenantId,
            adjustmentId: adjustment.id,
            warehouseName: warehouse.name,
            type,
            totalValue: Math.round(totalValuation * 100) / 100,
            reason,
        });
        // Real-time broadcast
        (0, socket_1.broadcastToTenant)(tenantId, "stock:adjusted", {
            adjustmentId: adjustment.id,
            warehouseId,
            type,
        });
        return res.status(201).json({
            data: adjustment,
            message: `Stock adjustment (${type.toUpperCase()}) recorded and ledger posted successfully`,
        });
    }
    catch (err) {
        console.error("POST /api/adjustments error:", err);
        if (err instanceof inventory_movement_errors_1.InsufficientStockError || err.code === "INSUFFICIENT_STOCK" || err.message?.includes("Insufficient stock")) {
            return res.status(409).json({ error: err.message, code: "INSUFFICIENT_STOCK" });
        }
        if (err instanceof inventory_movement_errors_1.InvalidQuantityError || err.code === "INVALID_QUANTITY") {
            return res.status(400).json({ error: err.message, code: "INVALID_QUANTITY" });
        }
        return res.status(400).json({ error: err.message || "Failed to record stock adjustment" });
    }
});
