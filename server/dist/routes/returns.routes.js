"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const ledger_posting_service_1 = require("../services/ledger-posting.service");
const inventory_movement_service_1 = require("../services/inventory-movement.service");
const inventory_movement_types_1 = require("../services/inventory-movement.types");
const inventory_movement_errors_1 = require("../services/inventory-movement.errors");
exports.returnsRouter = (0, express_1.Router)();
// Enforce auth + tenant on all routes
exports.returnsRouter.use((req, res, next) => {
    return (0, auth_1.requireAuth)(req, res, () => {
        return (0, tenant_context_middleware_1.resolveTenantContext)(req, res, next);
    });
});
// ==========================================
// SALES RETURNS (Credit Notes)
// ==========================================
/**
 * GET /api/returns/sales
 * List all sales returns for tenant with pagination & filters
 */
exports.returnsRouter.get("/sales", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.view"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        const status = req.query.status;
        const saleId = req.query.saleId;
        const customerId = req.query.customerId;
        const where = { tenantId };
        if (status)
            where.status = status;
        if (saleId)
            where.saleId = saleId;
        if (customerId)
            where.customerId = customerId;
        const [returns, total] = await Promise.all([
            prisma_1.prisma.salesReturn.findMany({
                where,
                include: {
                    sale: { select: { invoiceNo: true, date: true } },
                    customer: { select: { name: true, email: true } },
                    details: { include: { product: { select: { name: true, sku: true } } } },
                    creditNote: true,
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.salesReturn.count({ where }),
        ]);
        res.json({ returns, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/returns/sales/:id
 */
exports.returnsRouter.get("/sales/:id", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.view"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const sr = await prisma_1.prisma.salesReturn.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                sale: { select: { invoiceNo: true, date: true, paymentMethod: true, total: true } },
                customer: true,
                warehouse: { select: { id: true, name: true } },
                details: { include: { product: { select: { name: true, sku: true } }, originalDetail: true } },
                creditNote: true,
            },
        });
        if (!sr)
            return res.status(404).json({ error: "Sales return not found" });
        res.json(sr);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/returns/sales
 * Create a draft sales return with strict returnable quantity verification
 */
exports.returnsRouter.post("/sales", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.edit"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const createdById = req.user?.userId;
        const { saleId, warehouseId, reason, notes, items } = req.body;
        if (!saleId)
            return res.status(400).json({ error: "saleId is required" });
        if (!Array.isArray(items) || items.length === 0)
            return res.status(400).json({ error: "At least one return item is required" });
        // Verify sale belongs to tenant
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id: saleId, tenantId },
            include: { customer: true, details: true },
        });
        if (!sale)
            return res.status(404).json({ error: "Sale not found" });
        // Calculate already returned quantities across existing non-cancelled returns for this sale
        const existingReturns = await prisma_1.prisma.salesReturn.findMany({
            where: { saleId, tenantId, status: { not: "cancelled" } },
            include: { details: true },
        });
        const returnedQuantities = new Map();
        for (const ret of existingReturns) {
            for (const d of ret.details) {
                const key = d.originalDetailId || d.productId;
                returnedQuantities.set(key, (returnedQuantities.get(key) || 0) + Number(d.quantity));
            }
        }
        // Validate each item
        for (const item of items) {
            const detail = sale.details.find((d) => (item.originalDetailId && d.id === item.originalDetailId) ||
                d.productId === item.productId);
            if (!detail) {
                return res.status(400).json({ error: `Product ${item.productId} was not part of original sale` });
            }
            const key = detail.id;
            const alreadyReturned = returnedQuantities.get(key) || returnedQuantities.get(detail.productId) || 0;
            const available = Number(detail.quantity) - alreadyReturned;
            const reqQty = Number(item.quantity);
            if (reqQty <= 0) {
                return res.status(400).json({ error: "Return quantity must be greater than zero" });
            }
            if (reqQty > available) {
                return res.status(400).json({
                    error: `Requested return quantity (${reqQty}) exceeds available quantity (${available}) for product ${detail.productId}`,
                });
            }
            returnedQuantities.set(key, alreadyReturned + reqQty);
        }
        // Generate return number
        const count = await prisma_1.prisma.salesReturn.count({ where: { tenantId } });
        const returnNumber = `SR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
        // Calculate totals from items
        let subtotal = 0;
        let taxAmount = 0;
        const details = items.map((item) => {
            const qty = Number(item.quantity) || 1;
            const unitPrice = Number(item.unitPrice) || 0;
            const taxRate = Number(item.taxRate) || 0;
            const itemSubtotal = qty * unitPrice;
            const itemTax = (itemSubtotal * taxRate) / 100;
            const itemTotal = itemSubtotal + itemTax;
            subtotal += itemSubtotal;
            taxAmount += itemTax;
            return {
                productId: item.productId,
                originalDetailId: item.originalDetailId || null,
                productName: item.productName || "Product",
                quantity: qty,
                unitPrice,
                taxRate,
                taxAmount: itemTax,
                subtotal: itemSubtotal,
                total: itemTotal,
                isRestocked: item.isRestocked !== false,
            };
        });
        const totalAmount = subtotal + taxAmount;
        const sr = await prisma_1.prisma.salesReturn.create({
            data: {
                tenantId,
                saleId,
                customerId: sale.customerId,
                warehouseId: warehouseId || sale.warehouseId,
                returnNumber,
                reason,
                notes,
                subtotal,
                taxAmount,
                totalAmount,
                status: "draft",
                createdById,
                details: { create: details },
            },
            include: { details: true },
        });
        res.status(201).json(sr);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Handle Sales Return Approval → Generates Credit Note
 */
async function handleSalesReturnApprove(req, res) {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const sr = await prisma_1.prisma.salesReturn.findFirst({
            where: { id: req.params.id, tenantId },
            include: { details: true, sale: true, creditNote: true },
        });
        if (!sr)
            return res.status(404).json({ error: "Sales return not found" });
        if (sr.status !== "draft" && sr.status !== "approved") {
            return res.status(409).json({ error: "Only draft returns can be approved" });
        }
        // Generate Credit Note if not already created
        let creditNote = sr.creditNote;
        let updatedReturn = sr;
        if (!creditNote) {
            const cnCount = await prisma_1.prisma.creditNote.count({ where: { tenantId } });
            const noteNumber = `CN-${new Date().getFullYear()}-${String(cnCount + 1).padStart(4, "0")}`;
            const [uReturn, cNote] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.salesReturn.update({
                    where: { id: sr.id },
                    data: { status: "approved" },
                }),
                prisma_1.prisma.creditNote.create({
                    data: {
                        tenantId,
                        returnId: sr.id,
                        saleId: sr.saleId,
                        customerId: sr.customerId,
                        noteNumber,
                        amount: Number(sr.totalAmount),
                        allocatedAmount: 0,
                        balanceAmount: Number(sr.totalAmount),
                        status: "active",
                        reason: sr.reason,
                    },
                }),
            ]);
            updatedReturn = uReturn;
            creditNote = cNote;
        }
        res.json({ return: updatedReturn, creditNote });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
exports.returnsRouter.patch("/sales/:id/approve", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.edit"), handleSalesReturnApprove);
exports.returnsRouter.post("/sales/:id/approve", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.edit"), handleSalesReturnApprove);
/**
 * Handle Sales Return Completion → Restocks goods via InventoryMovementService & Auto-posts balanced GL
 */
async function handleSalesReturnComplete(req, res) {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const sr = await prisma_1.prisma.salesReturn.findFirst({
            where: { id: req.params.id, tenantId },
            include: { details: true, sale: true, creditNote: true },
        });
        if (!sr)
            return res.status(404).json({ error: "Sales return not found" });
        if (sr.status === "completed") {
            return res.json(sr);
        }
        // Auto-approve and create credit note if not already approved
        if (sr.status === "draft" && !sr.creditNote) {
            const cnCount = await prisma_1.prisma.creditNote.count({ where: { tenantId } });
            const noteNumber = `CN-${new Date().getFullYear()}-${String(cnCount + 1).padStart(4, "0")}`;
            await prisma_1.prisma.creditNote.create({
                data: {
                    tenantId,
                    returnId: sr.id,
                    saleId: sr.saleId,
                    customerId: sr.customerId,
                    noteNumber,
                    amount: Number(sr.totalAmount),
                    allocatedAmount: 0,
                    balanceAmount: Number(sr.totalAmount),
                    status: "active",
                    reason: sr.reason,
                },
            });
        }
        // Restock items in warehouse
        const warehouseId = sr.warehouseId || sr.sale.warehouseId;
        if (warehouseId) {
            for (const detail of sr.details) {
                if (detail.isRestocked) {
                    await inventory_movement_service_1.InventoryMovementService.increaseStock({
                        tenantId,
                        productId: detail.productId,
                        warehouseId,
                        quantity: Number(detail.quantity),
                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.SALES_RETURN,
                        referenceId: sr.id,
                        notes: `Sales Return ${sr.returnNumber}`,
                    });
                }
            }
        }
        // Auto-post to General Ledger
        await (0, ledger_posting_service_1.autoPostSalesReturnToLedger)({
            tenantId,
            returnId: sr.id,
            returnNumber: sr.returnNumber,
            totalAmount: Number(sr.totalAmount),
            taxAmount: Number(sr.taxAmount),
            originalPaymentMode: sr.sale.paymentMethod || "Cash",
        });
        const updated = await prisma_1.prisma.salesReturn.update({
            where: { id: sr.id },
            data: { status: "completed" },
            include: { details: true, creditNote: true },
        });
        res.json(updated);
    }
    catch (err) {
        if (err instanceof ledger_posting_service_1.PeriodPostingError)
            return res.status(422).json({ error: err.message, code: "PERIOD_CLOSED" });
        if (err instanceof inventory_movement_errors_1.InsufficientStockError)
            return res.status(422).json({ error: err.message, code: "INSUFFICIENT_STOCK" });
        res.status(500).json({ error: err.message });
    }
}
exports.returnsRouter.patch("/sales/:id/complete", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.edit"), handleSalesReturnComplete);
exports.returnsRouter.post("/sales/:id/complete", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.edit"), handleSalesReturnComplete);
// ==========================================
// CREDIT NOTES
// ==========================================
/**
 * GET /api/returns/credit-notes
 */
exports.returnsRouter.get("/credit-notes", auth_1.requireAuth, (0, auth_1.requirePermission)("finance.invoices.view"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const status = req.query.status;
        const customerId = req.query.customerId;
        const where = { tenantId };
        if (status)
            where.status = status;
        if (customerId)
            where.customerId = customerId;
        const notes = await prisma_1.prisma.creditNote.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                salesReturn: { select: { returnNumber: true } },
                sale: { select: { invoiceNo: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(notes);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// PURCHASE RETURNS (Debit Notes)
// ==========================================
/**
 * GET /api/returns/purchases
 */
exports.returnsRouter.get("/purchases", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.view"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        const status = req.query.status;
        const purchaseId = req.query.purchaseId;
        const supplierId = req.query.supplierId;
        const where = { tenantId };
        if (status)
            where.status = status;
        if (purchaseId)
            where.purchaseId = purchaseId;
        if (supplierId)
            where.supplierId = supplierId;
        const [returns, total] = await Promise.all([
            prisma_1.prisma.purchaseReturn.findMany({
                where,
                include: {
                    purchase: { select: { purchaseNo: true, date: true } },
                    supplier: { select: { name: true } },
                    details: { include: { product: { select: { name: true, sku: true } } } },
                    debitNote: true,
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.purchaseReturn.count({ where }),
        ]);
        res.json({ returns, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/returns/purchases/:id
 */
exports.returnsRouter.get("/purchases/:id", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.view"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pr = await prisma_1.prisma.purchaseReturn.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                purchase: { select: { purchaseNo: true, date: true, total: true } },
                supplier: true,
                warehouse: { select: { id: true, name: true } },
                details: { include: { product: { select: { name: true, sku: true } }, originalDetail: true } },
                debitNote: true,
            },
        });
        if (!pr)
            return res.status(404).json({ error: "Purchase return not found" });
        res.json(pr);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/returns/purchases
 * Create a draft purchase return with strict returnable quantity verification
 */
exports.returnsRouter.post("/purchases", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.create"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const createdById = req.user?.userId;
        const { purchaseId, warehouseId, reason, notes, items } = req.body;
        if (!purchaseId)
            return res.status(400).json({ error: "purchaseId is required" });
        if (!Array.isArray(items) || items.length === 0)
            return res.status(400).json({ error: "At least one return item is required" });
        const purchase = await prisma_1.prisma.purchase.findFirst({
            where: { id: purchaseId, tenantId },
            include: { supplier: true, details: true },
        });
        if (!purchase)
            return res.status(404).json({ error: "Purchase not found" });
        // Calculate already returned quantities across existing non-cancelled returns for this purchase
        const existingReturns = await prisma_1.prisma.purchaseReturn.findMany({
            where: { purchaseId, tenantId, status: { not: "cancelled" } },
            include: { details: true },
        });
        const returnedQuantities = new Map();
        for (const ret of existingReturns) {
            for (const d of ret.details) {
                const key = d.originalDetailId || d.productId;
                returnedQuantities.set(key, (returnedQuantities.get(key) || 0) + Number(d.quantity));
            }
        }
        for (const item of items) {
            const detail = purchase.details.find((d) => (item.originalDetailId && d.id === item.originalDetailId) ||
                d.productId === item.productId);
            if (!detail) {
                return res.status(400).json({ error: `Product ${item.productId} was not part of original purchase` });
            }
            const key = detail.id;
            const alreadyReturned = returnedQuantities.get(key) || returnedQuantities.get(detail.productId) || 0;
            const available = Number(detail.quantity) - alreadyReturned;
            const reqQty = Number(item.quantity);
            if (reqQty <= 0) {
                return res.status(400).json({ error: "Return quantity must be greater than zero" });
            }
            if (reqQty > available) {
                return res.status(400).json({
                    error: `Requested return quantity (${reqQty}) exceeds available quantity (${available}) for product ${detail.productId}`,
                });
            }
            returnedQuantities.set(key, alreadyReturned + reqQty);
        }
        const count = await prisma_1.prisma.purchaseReturn.count({ where: { tenantId } });
        const returnNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
        let subtotal = 0;
        let taxAmount = 0;
        const details = items.map((item) => {
            const qty = Number(item.quantity) || 1;
            const unitCost = Number(item.unitCost) || 0;
            const taxRate = Number(item.taxRate) || 0;
            const itemSubtotal = qty * unitCost;
            const itemTax = (itemSubtotal * taxRate) / 100;
            const itemTotal = itemSubtotal + itemTax;
            subtotal += itemSubtotal;
            taxAmount += itemTax;
            return {
                productId: item.productId,
                originalDetailId: item.originalDetailId || null,
                productName: item.productName || "Product",
                quantity: qty,
                unitCost,
                taxRate,
                taxAmount: itemTax,
                subtotal: itemSubtotal,
                total: itemTotal,
            };
        });
        const totalAmount = subtotal + taxAmount;
        const pr = await prisma_1.prisma.purchaseReturn.create({
            data: {
                tenantId,
                purchaseId,
                supplierId: purchase.supplierId,
                warehouseId: warehouseId || purchase.warehouseId,
                returnNumber,
                reason,
                notes,
                subtotal,
                taxAmount,
                totalAmount,
                status: "draft",
                createdById,
                details: { create: details },
            },
            include: { details: true },
        });
        res.status(201).json(pr);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Handle Purchase Return Approval → Generates Debit Note
 */
async function handlePurchaseReturnApprove(req, res) {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pr = await prisma_1.prisma.purchaseReturn.findFirst({
            where: { id: req.params.id, tenantId },
            include: { details: true, purchase: true, debitNote: true },
        });
        if (!pr)
            return res.status(404).json({ error: "Purchase return not found" });
        if (pr.status !== "draft" && pr.status !== "approved") {
            return res.status(409).json({ error: "Only draft returns can be approved" });
        }
        let debitNote = pr.debitNote;
        let updatedReturn = pr;
        if (!debitNote) {
            const dnCount = await prisma_1.prisma.debitNote.count({ where: { tenantId } });
            const noteNumber = `DN-${new Date().getFullYear()}-${String(dnCount + 1).padStart(4, "0")}`;
            const [uReturn, dNote] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.purchaseReturn.update({
                    where: { id: pr.id },
                    data: { status: "approved" },
                }),
                prisma_1.prisma.debitNote.create({
                    data: {
                        tenantId,
                        returnId: pr.id,
                        purchaseId: pr.purchaseId,
                        supplierId: pr.supplierId,
                        noteNumber,
                        amount: Number(pr.totalAmount),
                        allocatedAmount: 0,
                        balanceAmount: Number(pr.totalAmount),
                        status: "active",
                        reason: pr.reason,
                    },
                }),
            ]);
            updatedReturn = uReturn;
            debitNote = dNote;
        }
        res.json({ return: updatedReturn, debitNote });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
exports.returnsRouter.patch("/purchases/:id/approve", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.edit"), handlePurchaseReturnApprove);
exports.returnsRouter.post("/purchases/:id/approve", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.edit"), handlePurchaseReturnApprove);
/**
 * Handle Purchase Return Completion → Decrements inventory via InventoryMovementService & Auto-posts balanced GL
 */
async function handlePurchaseReturnComplete(req, res) {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pr = await prisma_1.prisma.purchaseReturn.findFirst({
            where: { id: req.params.id, tenantId },
            include: { details: true, purchase: true, debitNote: true },
        });
        if (!pr)
            return res.status(404).json({ error: "Purchase return not found" });
        if (pr.status === "completed") {
            return res.json(pr);
        }
        // Auto-approve and create debit note if not already generated
        if (pr.status === "draft" && !pr.debitNote) {
            const dnCount = await prisma_1.prisma.debitNote.count({ where: { tenantId } });
            const noteNumber = `DN-${new Date().getFullYear()}-${String(dnCount + 1).padStart(4, "0")}`;
            await prisma_1.prisma.debitNote.create({
                data: {
                    tenantId,
                    returnId: pr.id,
                    purchaseId: pr.purchaseId,
                    supplierId: pr.supplierId,
                    noteNumber,
                    amount: Number(pr.totalAmount),
                    allocatedAmount: 0,
                    balanceAmount: Number(pr.totalAmount),
                    status: "active",
                    reason: pr.reason,
                },
            });
        }
        // Decrement stock from warehouse (items returned to supplier)
        const warehouseId = pr.warehouseId || pr.purchase.warehouseId;
        if (warehouseId) {
            for (const detail of pr.details) {
                await inventory_movement_service_1.InventoryMovementService.decreaseStock({
                    tenantId,
                    productId: detail.productId,
                    warehouseId,
                    quantity: Number(detail.quantity),
                    movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.PURCHASE_RETURN,
                    referenceId: pr.id,
                    notes: `Purchase Return ${pr.returnNumber}`,
                });
            }
        }
        // Auto-post to GL
        await (0, ledger_posting_service_1.autoPostPurchaseReturnToLedger)({
            tenantId,
            returnId: pr.id,
            returnNumber: pr.returnNumber,
            totalAmount: Number(pr.totalAmount),
            taxAmount: Number(pr.taxAmount),
        });
        const updated = await prisma_1.prisma.purchaseReturn.update({
            where: { id: pr.id },
            data: { status: "completed" },
            include: { details: true, debitNote: true },
        });
        res.json(updated);
    }
    catch (err) {
        if (err instanceof ledger_posting_service_1.PeriodPostingError)
            return res.status(422).json({ error: err.message, code: "PERIOD_CLOSED" });
        if (err instanceof inventory_movement_errors_1.InsufficientStockError)
            return res.status(422).json({ error: err.message, code: "INSUFFICIENT_STOCK" });
        res.status(500).json({ error: err.message });
    }
}
exports.returnsRouter.patch("/purchases/:id/complete", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.edit"), handlePurchaseReturnComplete);
exports.returnsRouter.post("/purchases/:id/complete", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.edit"), handlePurchaseReturnComplete);
// ==========================================
// DEBIT NOTES
// ==========================================
/**
 * GET /api/returns/debit-notes
 */
exports.returnsRouter.get("/debit-notes", auth_1.requireAuth, (0, auth_1.requirePermission)("purchase.view"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const status = req.query.status;
        const supplierId = req.query.supplierId;
        const where = { tenantId };
        if (status)
            where.status = status;
        if (supplierId)
            where.supplierId = supplierId;
        const notes = await prisma_1.prisma.debitNote.findMany({
            where,
            include: {
                supplier: { select: { name: true } },
                purchaseReturn: { select: { returnNumber: true } },
                purchase: { select: { purchaseNo: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(notes);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
