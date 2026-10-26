"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineSaleReplayError = exports.salesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const alert_notification_service_1 = require("../services/alert-notification.service");
const ecommerce_sync_service_1 = require("../services/ecommerce-sync.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const socket_1 = require("../socket");
const ledger_posting_service_1 = require("../services/ledger-posting.service");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const inventory_movement_service_1 = require("../services/inventory-movement.service");
const inventory_movement_types_1 = require("../services/inventory-movement.types");
const inventory_movement_errors_1 = require("../services/inventory-movement.errors");
const entitlements_1 = require("../middleware/entitlements");
exports.salesRouter = (0, express_1.Router)();
/**
 * Step 3.3.5 — Offline sale replay guard.
 * Thrown inside the sale-creation transaction when a stable offline identifier has
 * already been synchronized for the tenant. Application-level signal only — true
 * duplicate prevention is enforced by the tenant-scoped unique index on
 * sales.invoice_no (migration wave3_step3_3_5_offline_replay_key).
 */
class OfflineSaleReplayError extends Error {
    offlineId;
    saleId;
    constructor(offlineId, saleId = null) {
        super(`Offline sale ${offlineId} has already been synchronized (UNIQUE_REPLAY_KEY).`);
        this.name = "OfflineSaleReplayError";
        this.offlineId = offlineId;
        this.saleId = saleId;
    }
}
exports.OfflineSaleReplayError = OfflineSaleReplayError;
// Enforce Request-Scoped Tenant Context & Product POS Entitlement on all sales & POS endpoints
exports.salesRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("product_pos"));
// GET /api/sales - List sales & POS receipts (Stocky Rule 0: Universal Query Contract)
exports.salesRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 30);
        const { type, paymentStatus, customerId, warehouseId, startDate, endDate } = req.query;
        const whereClause = { tenantId };
        if (type && type !== "all") {
            whereClause.type = String(type);
        }
        if (paymentStatus && paymentStatus !== "all") {
            whereClause.paymentStatus = String(paymentStatus);
        }
        if (customerId && customerId !== "all") {
            whereClause.customerId = String(customerId);
        }
        if (warehouseId && warehouseId !== "all") {
            whereClause.warehouseId = String(warehouseId);
        }
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate)
                whereClause.date.gte = new Date(String(startDate));
            if (endDate)
                whereClause.date.lte = new Date(String(endDate));
        }
        if (pagination.search) {
            whereClause.OR = [
                { invoiceNo: { contains: pagination.search } },
                { customerName: { contains: pagination.search } },
                { cashierName: { contains: pagination.search } },
            ];
        }
        const sortField = ["createdAt", "date", "total", "invoiceNo"].includes(pagination.sortField)
            ? pagination.sortField
            : "createdAt";
        const [total, sales] = await Promise.all([
            prisma_1.prisma.sale.count({ where: whereClause }),
            prisma_1.prisma.sale.findMany({
                where: whereClause,
                include: {
                    customer: true,
                    warehouse: true,
                    details: {
                        include: {
                            product: true,
                        },
                    },
                    payments: true,
                },
                orderBy: { [sortField]: pagination.sortType },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        const formatted = sales.map((s) => ({
            id: s.id,
            receiptNo: s.invoiceNo,
            invoiceNo: s.invoiceNo,
            type: s.type,
            customer: s.customerName || s.customer?.name || "Walk-in Customer",
            customerName: s.customerName || s.customer?.name || "Walk-in Customer",
            customerGstin: s.customerGstin || s.customer?.gstin || "",
            customerId: s.customerId,
            warehouseId: s.warehouseId,
            warehouseName: s.warehouse?.name || "Main Central Warehouse",
            cashier: s.cashierName || "System Cashier",
            date: s.date.toISOString(),
            completedAt: s.createdAt.toISOString(),
            subtotal: Number(s.subtotal),
            discountPct: s.discountPct ? Number(s.discountPct) : 0,
            discountAmt: Number(s.discountAmt),
            taxMode: s.taxMode || "sgst_cgst",
            cgst: Number(s.cgst),
            sgst: Number(s.sgst),
            igst: Number(s.igst),
            totalTax: Number(s.totalTax),
            total: Number(s.total),
            amount: Number(s.total),
            paidAmount: Number(s.paidAmount),
            paymentStatus: s.paymentStatus,
            paymentMode: s.paymentMethod,
            notes: s.notes || "",
            items: s.details.map((d) => ({
                id: d.productId,
                name: d.productName,
                sku: d.sku || "",
                hsn_sac: d.hsnSac || "",
                unit: d.unit || "Pcs",
                price: Number(d.price),
                qty: d.quantity,
                quantity: d.quantity,
                taxRate: Number(d.taxRate),
                gst_rate: Number(d.taxRate),
                taxAmount: Number(d.taxAmount),
                discount: Number(d.discount),
                subtotal: Number(d.subtotal),
            })),
            payments: s.payments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                method: p.method,
                referenceNo: p.referenceNo,
                paidAt: p.paidAt.toISOString(),
            })),
        }));
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(formatted, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(formatted);
    }
    catch (err) {
        console.error("Sales GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch sales" });
    }
});
// POST /api/sales - Checkout POS sale / Create Invoice
exports.salesRouter.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const body = req.body;
        const items = body.items || [];
        if (items.length === 0) {
            return res.status(400).json({ error: "Cannot create sale with empty cart items." });
        }
        // Determine default warehouse
        let warehouseId = body.warehouseId;
        if (!warehouseId) {
            const defaultWh = await prisma_1.prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
            warehouseId = defaultWh ? defaultWh.id : (await prisma_1.prisma.warehouse.findFirst({ where: { tenantId } }))?.id;
        }
        // Idempotency check: if a sale with this invoiceNo/receiptNo already exists, return it
        const idempotencyKey = body.receiptNo || body.invoiceNo;
        if (idempotencyKey) {
            const existingSale = await prisma_1.prisma.sale.findFirst({
                where: { tenantId, invoiceNo: idempotencyKey },
                include: { details: true, payments: true },
            });
            if (existingSale) {
                return res.json({
                    success: true,
                    message: "Sale already exists (idempotent)",
                    sale: existingSale,
                    receiptNo: existingSale.invoiceNo,
                    isDuplicate: true,
                });
            }
        }
        // Generate unique invoice number
        const count = await prisma_1.prisma.sale.count({ where: { tenantId } });
        const prefix = body.type === "invoice" ? "INV" : "REC";
        const year = new Date().getFullYear();
        const entropy = Math.floor(1000 + Math.random() * 9000);
        const invoiceNo = body.receiptNo || body.invoiceNo || `${prefix}-${year}-${String(count + 1).padStart(4, "0")}-${entropy}`;
        // Atomic transaction: Create Sale, Create SaleDetails, Create Payment, Decrement Warehouse Stock
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const sale = await tx.sale.create({
                data: {
                    tenantId,
                    invoiceNo,
                    type: body.type || "pos",
                    customerId: body.customerId || null,
                    customerName: body.customer || body.customerName || "Walk-in Customer",
                    customerGstin: body.customerGstin || "",
                    warehouseId: warehouseId || null,
                    cashierId: req.user?.userId || null,
                    cashierName: body.cashier || req.user?.email || "Cashier",
                    subtotal: Number(body.subtotal || 0),
                    discountPct: body.discountPct !== undefined ? Number(body.discountPct) : null,
                    discountAmt: Number(body.discountAmt || 0),
                    taxMode: body.taxMode || "sgst_cgst",
                    cgst: Number(body.cgst || 0),
                    sgst: Number(body.sgst || 0),
                    igst: Number(body.igst || 0),
                    totalTax: Number((body.cgst || 0) + (body.sgst || 0) + (body.igst || 0)),
                    total: Number(body.total || 0),
                    paidAmount: Number(body.paidAmount !== undefined ? body.paidAmount : body.total || 0),
                    paymentStatus: body.paymentStatus || "paid",
                    paymentMethod: body.paymentMode || body.paymentMethod || "Cash",
                    notes: body.notes || "",
                    date: body.date ? new Date(body.date) : new Date(),
                },
            });
            // Insert SaleDetails & decrement stock
            for (const item of items) {
                const productId = item.productId || item.id;
                const lineQty = Number(item.qty || item.quantity || 1);
                const linePrice = Number(item.unitPrice !== undefined ? item.unitPrice : item.price || 0);
                const taxRate = Number(item.gst_rate !== undefined ? item.gst_rate : item.taxRate || 0);
                const lineTax = Number(item.taxAmount || (linePrice * lineQty * (taxRate / 100)));
                const lineSubtotal = Number((linePrice * lineQty) + lineTax);
                await tx.saleDetail.create({
                    data: {
                        saleId: sale.id,
                        productId,
                        productName: item.name || "Product Item",
                        sku: item.sku || null,
                        hsnSac: item.hsn_sac || item.hsnSac || null,
                        unit: item.unit || "Pcs",
                        price: linePrice,
                        quantity: lineQty,
                        taxRate,
                        taxAmount: lineTax,
                        discount: Number(item.discount || 0),
                        subtotal: lineSubtotal,
                    },
                });
                // Atomic warehouse stock decrement with centralized engine & concurrency safety
                if (warehouseId && productId) {
                    const product = await tx.product.findUnique({
                        where: { id: productId },
                        select: { id: true, name: true, type: true },
                    });
                    const isService = product?.type?.toLowerCase() === "service";
                    if (!isService) {
                        await inventory_movement_service_1.InventoryMovementService.decreaseStock({
                            tenantId,
                            productId,
                            warehouseId,
                            quantity: lineQty,
                            movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.POS_SALE,
                            referenceType: "SALE",
                            referenceId: sale.id,
                            createdById: req.user?.userId || req.user?.id,
                            notes: `POS sale checkout (${invoiceNo})`,
                            tx,
                        });
                    }
                }
            }
            // Create Payment record
            const paidAmt = Number(body.paidAmount !== undefined ? body.paidAmount : body.total || 0);
            const payMethod = body.paymentMode || body.paymentMethod || "Cash";
            await tx.salePayment.create({
                data: {
                    saleId: sale.id,
                    amount: paidAmt,
                    method: payMethod,
                    referenceNo: body.referenceNo || invoiceNo,
                },
            });
            // Update open cash register shift if active
            const openShift = await tx.registerShift.findFirst({
                where: { tenantId, status: "open" },
            });
            if (openShift) {
                const mode = payMethod.toLowerCase();
                const updateData = {};
                if (mode.includes("cash")) {
                    updateData.cashSales = { increment: paidAmt };
                    updateData.expectedCash = { increment: paidAmt };
                }
                else if (mode.includes("card")) {
                    updateData.cardSales = { increment: paidAmt };
                }
                else {
                    updateData.upiSales = { increment: paidAmt };
                }
                await tx.registerShift.update({
                    where: { id: openShift.id },
                    data: updateData,
                });
            }
            return sale;
        });
        // ⚡ Realtime Broadcasts: Notify customer display, POS history, and live inventory decrements
        try {
            (0, alert_notification_service_1.notifySaleCompleted)({ receiptNo: result.invoiceNo, total: Number(result.total), customer: body.customerName, paymentMode: body.paymentMode });
        }
        catch { }
        try {
            const itemProductIds = Array.from(new Set(items.map((it) => it.id).filter(Boolean)));
            if (itemProductIds.length && warehouseId) {
                Promise.all([
                    prisma_1.prisma.product.findMany({ where: { id: { in: itemProductIds } } }),
                    prisma_1.prisma.productWarehouse.findMany({ where: { productId: { in: itemProductIds }, warehouseId } }),
                ]).then(([products, productWarehouses]) => {
                    const pwMap = new Map(productWarehouses.map((pw) => [pw.productId, pw.quantity]));
                    for (const prd of products) {
                        const qty = pwMap.get(prd.id);
                        if (qty !== undefined)
                            (0, ecommerce_sync_service_1.pushStockToRemoteStores)(tenantId, prd.sku, Number(qty));
                    }
                }).catch(() => { });
            }
        }
        catch { }
        (0, socket_1.broadcastToTenant)(tenantId, "pos:sale_created", {
            sale: result,
            receiptNo: result.invoiceNo,
            items: items.map((i) => ({
                productId: i.id,
                quantity: Number(i.qty || i.quantity || 1),
            })),
        });
        (0, socket_1.broadcastToTenant)(tenantId, "inventory:stock_updated", {
            warehouseId,
            items: items.map((i) => ({
                productId: i.id,
                quantityDecremented: Number(i.qty || i.quantity || 1),
            })),
        });
        // ⚡ Auto-post to Double-Entry General Ledger
        (0, ledger_posting_service_1.autoPostSaleToLedger)({
            tenantId,
            saleId: result.id,
            invoiceNo: result.invoiceNo,
            total: Number(result.total),
            subtotal: Number(result.subtotal),
            totalTax: Number(result.totalTax || 0),
            paymentMode: body.paymentMode || body.paymentMethod || "Cash",
            isPaid: (body.paymentStatus || "paid") === "paid",
        }).catch((e) => console.error("Auto-post sale to ledger error:", e));
        return res.status(201).json({
            success: true,
            message: "Sale processed successfully",
            sale: result,
            receiptNo: result.invoiceNo,
        });
    }
    catch (err) {
        console.error("Sales POST checkout error:", err);
        if (err instanceof inventory_movement_errors_1.InsufficientStockError || err.code === "INSUFFICIENT_STOCK") {
            return res.status(409).json({
                error: err.message,
                code: "INSUFFICIENT_STOCK",
                productId: err.productId,
                warehouseId: err.warehouseId,
            });
        }
        if (err instanceof inventory_movement_errors_1.StockConcurrencyError || err.code === "STOCK_CONCURRENCY_CONFLICT") {
            return res.status(409).json({
                error: err.message,
                code: "STOCK_CONCURRENCY_CONFLICT",
            });
        }
        return res.status(500).json({ error: err.message || "Failed to process sale" });
    }
});
// GET /api/sales/held - Retrieve held orders for POS
exports.salesRouter.get("/held", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const held = await prisma_1.prisma.heldOrder.findMany({
            where: { tenantId },
            orderBy: { heldAt: "desc" },
        });
        const formatted = held.map((h) => ({
            id: h.id,
            label: h.label || "Held Order",
            name: h.label || "Held Order",
            customer: h.customerName || "Walk-in Customer",
            customerName: h.customerName || "Walk-in Customer",
            savedAt: h.heldAt.toISOString(),
            heldAt: h.heldAt.toISOString(),
            cart: h.cartData,
            items: h.cartData,
        }));
        return res.json(formatted);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/sales/held - Save a held order
exports.salesRouter.post("/held", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const body = req.body;
        const held = await prisma_1.prisma.heldOrder.create({
            data: {
                tenantId,
                label: body.label || body.name || "Held Order",
                customerName: body.customer || body.customerName || "Walk-in Customer",
                cartData: body.cart || body.items || [],
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "pos:held_updated", { action: "created", id: held.id });
        return res.status(201).json(held);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/sales/held/:id - Remove held order upon recall/clear
exports.salesRouter.delete("/held/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        await prisma_1.prisma.heldOrder.deleteMany({
            where: { id, tenantId },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "pos:held_updated", { action: "deleted", id });
        return res.json({ success: true, message: "Held order cleared" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ==========================================
// POS CASH REGISTER & SHIFT SESSIONS
// ==========================================
// GET /api/sales/register/current - Check if shift is open
exports.salesRouter.get("/register/current", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        // Ensure default terminal exists
        let register = await prisma_1.prisma.cashRegister.findFirst({ where: { tenantId } });
        if (!register) {
            register = await prisma_1.prisma.cashRegister.create({
                data: {
                    tenantId,
                    name: "Main POS Counter #1",
                    status: "closed",
                },
            });
        }
        const openShift = await prisma_1.prisma.registerShift.findFirst({
            where: { tenantId, status: "open" },
            include: { register: true },
            orderBy: { openedAt: "desc" },
        });
        if (!openShift) {
            return res.json({ isOpen: false, register });
        }
        return res.json({
            isOpen: true,
            shift: {
                id: openShift.id,
                registerId: openShift.registerId,
                registerName: openShift.register.name,
                cashierName: openShift.cashierName,
                openingFloat: Number(openShift.openingFloat),
                cashSales: Number(openShift.cashSales),
                cardSales: Number(openShift.cardSales),
                upiSales: Number(openShift.upiSales),
                cashIn: Number(openShift.cashIn),
                cashOut: Number(openShift.cashOut),
                expectedCash: Number(openShift.expectedCash),
                openedAt: openShift.openedAt.toISOString(),
                notes: openShift.notes || "",
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/sales/register/open - Open register shift with starting float
exports.salesRouter.post("/register/open", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { registerId, openingFloat, notes } = req.body;
        // Check if already open
        const active = await prisma_1.prisma.registerShift.findFirst({
            where: { tenantId, status: "open" },
        });
        if (active) {
            return res.status(400).json({ error: "A register shift is already open." });
        }
        let targetRegisterId = registerId;
        if (!targetRegisterId) {
            let reg = await prisma_1.prisma.cashRegister.findFirst({ where: { tenantId } });
            if (!reg) {
                reg = await prisma_1.prisma.cashRegister.create({
                    data: {
                        tenantId,
                        name: "Main POS Counter #1",
                        status: "closed",
                    },
                });
            }
            targetRegisterId = reg.id;
        }
        const floatAmt = Number(openingFloat || 0);
        const shift = await prisma_1.prisma.registerShift.create({
            data: {
                tenantId,
                registerId: targetRegisterId,
                cashierId: req.user?.userId || null,
                cashierName: req.user?.email ? req.user.email.split("@")[0] : "Cashier",
                openingFloat: floatAmt,
                expectedCash: floatAmt,
                status: "open",
                notes: notes || "Shift opened",
            },
        });
        await prisma_1.prisma.cashRegister.update({
            where: { id: targetRegisterId },
            data: { status: "open" },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "pos:register_opened", { shiftId: shift.id });
        return res.status(201).json({ success: true, shift });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/sales/register/drop - Cash In / Cash Out drawer drops
exports.salesRouter.post("/register/drop", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { type, amount, reason } = req.body; // type: "in" | "out"
        const dropAmt = Number(amount);
        if (isNaN(dropAmt) || dropAmt <= 0)
            return res.status(400).json({ error: "Invalid amount" });
        const openShift = await prisma_1.prisma.registerShift.findFirst({
            where: { tenantId, status: "open" },
        });
        if (!openShift)
            return res.status(400).json({ error: "No open register shift found." });
        const updateData = {};
        if (type === "in") {
            updateData.cashIn = { increment: dropAmt };
            updateData.expectedCash = { increment: dropAmt };
        }
        else {
            updateData.cashOut = { increment: dropAmt };
            updateData.expectedCash = { decrement: dropAmt };
        }
        const updated = await prisma_1.prisma.registerShift.update({
            where: { id: openShift.id },
            data: updateData,
        });
        return res.json({ success: true, shift: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/sales/register/close - Close shift with cash drawer count & variance
exports.salesRouter.post("/register/close", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { actualCash, notes } = req.body;
        const countedCash = Number(actualCash || 0);
        const openShift = await prisma_1.prisma.registerShift.findFirst({
            where: { tenantId, status: "open" },
            include: { register: true },
        });
        if (!openShift)
            return res.status(400).json({ error: "No open register shift found." });
        const expected = Number(openShift.expectedCash);
        const variance = countedCash - expected;
        const closed = await prisma_1.prisma.registerShift.update({
            where: { id: openShift.id },
            data: {
                actualCash: countedCash,
                variance,
                status: "closed",
                closedAt: new Date(),
                notes: notes || openShift.notes,
            },
        });
        await prisma_1.prisma.cashRegister.update({
            where: { id: openShift.registerId },
            data: { status: "closed" },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "pos:register_closed", {
            shiftId: closed.id,
            variance,
            actualCash: countedCash,
        });
        return res.json({
            success: true,
            message: `Shift closed. Variance: ${variance >= 0 ? "+" : ""}${variance}`,
            shift: closed,
            report: {
                openingFloat: Number(closed.openingFloat),
                cashSales: Number(closed.cashSales),
                cardSales: Number(closed.cardSales),
                upiSales: Number(closed.upiSales),
                cashIn: Number(closed.cashIn),
                cashOut: Number(closed.cashOut),
                expectedCash: expected,
                actualCash: countedCash,
                variance,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// -------------------------------------------------------------
// OFFLINE POS ZERO-DOWNTIME CART SYNC & STOCK RECONCILIATION
// -------------------------------------------------------------
// POST /api/sales/sync-offline
exports.salesRouter.post("/sync-offline", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const rawList = Array.isArray(req.body) ? req.body : req.body.sales || req.body.orders || [];
        if (!Array.isArray(rawList) || rawList.length === 0) {
            return res.status(400).json({ error: "Expected an array of offline sales in 'sales'." });
        }
        const syncedSales = [];
        let duplicatesSkipped = 0;
        const errors = [];
        // Fallback warehouse
        let defaultWarehouse = await prisma_1.prisma.warehouse.findFirst({
            where: { tenantId },
        });
        if (!defaultWarehouse) {
            defaultWarehouse = await prisma_1.prisma.warehouse.create({
                data: { tenantId, name: "Main Store Warehouse", location: "Default Location" },
            });
        }
        for (let i = 0; i < rawList.length; i++) {
            const order = rawList[i];
            const offlineId = String(order.offlineId || order.id || `offline-${Date.now()}-${i}`);
            // 1. Idempotency Check: Avoid double-charging or duplicate stock deduction
            const existing = await prisma_1.prisma.sale.findFirst({
                where: {
                    tenantId,
                    notes: { contains: `[OfflineID:${offlineId}]` },
                },
            });
            if (existing) {
                duplicatesSkipped++;
                syncedSales.push({
                    offlineId,
                    saleId: existing.id,
                    invoiceNo: existing.invoiceNo,
                    status: "ALREADY_SYNCED",
                });
                continue;
            }
            const warehouseId = order.warehouseId || defaultWarehouse.id;
            const items = Array.isArray(order.items) ? order.items : [];
            const totalAmount = Number(order.total || order.grandTotal || 0);
            try {
                const createdSale = await prisma_1.prisma.$transaction(async (tx) => {
                    // Generate sequential invoice number
                    const saleCount = await tx.sale.count({ where: { tenantId } });
                    const invoiceNo = `POS-OFF-${Date.now().toString().slice(-4)}-${saleCount + 1}`;
                    // Idempotency hardening (Step 3.3.5): replayed offline queue items MUST be
                    // rejected inside the transaction that creates the sale. The stable client
                    // identifier (offlineId) is enforced through a tenant-scoped unique index on
                    // the sales.invoice_no column (UNIQUE_REPLAY_KEY), so a replay attempt raises
                    // Prisma P2002 and rolls back the entire transaction (sale + stock deduction)
                    // instead of silently creating a duplicate physical stock movement.
                    const replayKey = `[OfflineID:${offlineId}]`;
                    const replayConflict = await tx.sale.findFirst({
                        where: { tenantId, invoiceNo: replayKey },
                        select: { id: true, invoiceNo: true },
                    });
                    if (replayConflict) {
                        throw new OfflineSaleReplayError(offlineId, replayConflict.id);
                    }
                    const sale = await tx.sale.create({
                        data: {
                            tenantId,
                            invoiceNo,
                            warehouseId,
                            customerId: order.customerId || null,
                            customerName: order.customerName || "Walk-in Customer",
                            cashierName: order.cashierName || req.user?.email || "Offline Terminal",
                            type: "pos",
                            paymentStatus: "paid",
                            paymentMethod: order.paymentMethod || "cash",
                            subtotal: totalAmount,
                            totalTax: Number(order.tax || 0),
                            discountAmt: Number(order.discount || 0),
                            total: totalAmount,
                            paidAmount: totalAmount,
                            notes: `[OfflineID:${offlineId}] [UNIQUE_REPLAY_KEY] Sync at ${new Date().toISOString()}`,
                            date: order.offlineTimestamp ? new Date(order.offlineTimestamp) : new Date(),
                            details: {
                                create: items.map((it) => ({
                                    productId: it.productId || it.id,
                                    productName: it.productName || it.name || "Item",
                                    quantity: Number(it.quantity || 1),
                                    price: Number(it.unitPrice || it.price || 0),
                                    taxAmount: Number(it.tax || 0),
                                    discount: Number(it.discount || 0),
                                    subtotal: Number(it.subtotal || (Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0))),
                                })),
                            },
                        },
                        include: { details: true },
                    });
                    // Atomically deduct inventory stock
                    for (const item of items) {
                        const pid = item.productId || item.id;
                        const qty = Number(item.quantity || 1);
                        if (pid && warehouseId) {
                            const product = await tx.product.findUnique({
                                where: { id: pid },
                                select: { id: true, name: true, type: true },
                            });
                            const isService = product?.type?.toLowerCase() === "service";
                            if (!isService) {
                                try {
                                    await inventory_movement_service_1.InventoryMovementService.decreaseStock({
                                        tenantId,
                                        productId: pid,
                                        warehouseId,
                                        quantity: qty,
                                        movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.POS_SALE,
                                        referenceType: "SALE_OFFLINE",
                                        referenceId: sale.id,
                                        createdById: req.user?.userId || req.user?.id,
                                        notes: `Offline sync sale (${order.invoiceNo || offlineId})`,
                                        tx,
                                    });
                                }
                                catch (stockErr) {
                                    console.warn(`[Offline Sync] Stock deduction warning for product ${pid}:`, stockErr.message);
                                }
                            }
                        }
                    }
                    return sale;
                });
                // 3. Post to General Ledger
                try {
                    await (0, ledger_posting_service_1.autoPostSaleToLedger)({
                        tenantId,
                        saleId: createdSale.id,
                        invoiceNo: createdSale.invoiceNo,
                        total: totalAmount,
                        subtotal: totalAmount,
                        totalTax: Number(order.tax || 0),
                        paymentMode: order.paymentMethod || "Cash",
                        isPaid: true,
                    });
                }
                catch (ledgerErr) {
                    console.warn("Offline sale ledger auto-post warning:", ledgerErr);
                }
                syncedSales.push({
                    offlineId,
                    saleId: createdSale.id,
                    invoiceNo: createdSale.invoiceNo,
                    total: Number(createdSale.total),
                    status: "SYNCED",
                });
            }
            catch (err) {
                // Idempotent replay (Step 3.3.5): a queue item that was already synchronized
                // (OfflineSaleReplayError or Prisma P2002 on the unique replay key) is reported
                // as ALREADY_SYNCED rather than a failure, so clients never retry it forever.
                const isReplay = err instanceof OfflineSaleReplayError ||
                    err.code === "P2002" ||
                    (err.message || "").includes("UNIQUE_REPLAY_KEY");
                if (isReplay) {
                    duplicatesSkipped++;
                    syncedSales.push({
                        offlineId,
                        saleId: err instanceof OfflineSaleReplayError ? err.saleId : null,
                        invoiceNo: `[OfflineID:${offlineId}]`,
                        status: "ALREADY_SYNCED",
                    });
                    continue;
                }
                errors.push({ offlineId, error: err.message || "Failed to process offline sale" });
            }
        }
        (0, socket_1.broadcastToTenant)(tenantId, "pos:offline_batch_synced", {
            syncedCount: syncedSales.filter((s) => s.status === "SYNCED").length,
            duplicatesSkipped,
        });
        return res.json({
            success: true,
            totalReceived: rawList.length,
            syncedCount: syncedSales.filter((s) => s.status === "SYNCED").length,
            duplicatesSkipped,
            failedCount: errors.length,
            sales: syncedSales,
            errors: errors.length > 0 ? errors : undefined,
            message: `Offline synchronization complete. ${syncedSales.length} orders processed.`,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error during offline sync" });
    }
});
// GET /api/sales/:id - Retrieve single sale / receipt with details & payment history
exports.salesRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id, tenantId },
            include: {
                customer: true,
                warehouse: true,
                details: {
                    include: {
                        product: true,
                    },
                },
                payments: {
                    orderBy: { paidAt: "asc" },
                },
            },
        });
        if (!sale) {
            return res.status(404).json({ error: "Sale not found" });
        }
        const formatted = {
            id: sale.id,
            receiptNo: sale.invoiceNo,
            invoiceNo: sale.invoiceNo,
            type: sale.type,
            customer: sale.customerName || sale.customer?.name || "Walk-in Customer",
            customerName: sale.customerName || sale.customer?.name || "Walk-in Customer",
            customerGstin: sale.customerGstin || sale.customer?.gstin || "",
            customerId: sale.customerId,
            warehouseId: sale.warehouseId,
            warehouseName: sale.warehouse?.name || "Main Warehouse",
            cashier: sale.cashierName || "Cashier",
            date: sale.date.toISOString(),
            completedAt: sale.createdAt.toISOString(),
            subtotal: Number(sale.subtotal),
            discountPct: sale.discountPct ? Number(sale.discountPct) : 0,
            discountAmt: Number(sale.discountAmt),
            taxMode: sale.taxMode || "sgst_cgst",
            cgst: Number(sale.cgst),
            sgst: Number(sale.sgst),
            igst: Number(sale.igst),
            totalTax: Number(sale.totalTax),
            total: Number(sale.total),
            amount: Number(sale.total),
            paidAmount: Number(sale.paidAmount),
            remainingBalance: Math.max(0, Number(sale.total) - Number(sale.paidAmount)),
            paymentStatus: sale.paymentStatus,
            paymentMode: sale.paymentMethod,
            notes: sale.notes || "",
            items: sale.details.map((d) => ({
                id: d.productId,
                name: d.productName,
                sku: d.sku || "",
                hsn_sac: d.hsnSac || "",
                unit: d.unit || "Pcs",
                price: Number(d.price),
                qty: d.quantity,
                quantity: d.quantity,
                taxRate: Number(d.taxRate),
                taxAmount: Number(d.taxAmount),
                discount: Number(d.discount),
                subtotal: Number(d.subtotal),
            })),
            payments: sale.payments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                method: p.method,
                referenceNo: p.referenceNo,
                notes: p.notes || "",
                paidAt: p.paidAt.toISOString(),
            })),
        };
        return res.json(formatted);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch sale" });
    }
});
// GET /api/sales/:id/payments - List all payment installments for a sale
exports.salesRouter.get("/:id/payments", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id, tenantId },
            select: { id: true, invoiceNo: true, total: true, paidAmount: true, paymentStatus: true },
        });
        if (!sale) {
            return res.status(404).json({ error: "Sale not found" });
        }
        const payments = await prisma_1.prisma.salePayment.findMany({
            where: { saleId: id },
            orderBy: { paidAt: "asc" },
        });
        return res.json({
            saleId: sale.id,
            invoiceNo: sale.invoiceNo,
            total: Number(sale.total),
            paidAmount: Number(sale.paidAmount),
            remainingBalance: Math.max(0, Number(sale.total) - Number(sale.paidAmount)),
            paymentStatus: sale.paymentStatus,
            payments: payments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                method: p.method,
                referenceNo: p.referenceNo,
                notes: p.notes || "",
                idempotencyKey: p.idempotencyKey || null,
                paidAt: p.paidAt.toISOString(),
            })),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch sale payments" });
    }
});
// GET /api/sales/:id/returns - List returns for a specific sale
exports.salesRouter.get("/:id/returns", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });
        if (!sale) {
            return res.status(404).json({ error: "Sale not found" });
        }
        const returns = await prisma_1.prisma.salesReturn.findMany({
            where: { saleId: id, tenantId },
            include: {
                details: { include: { product: true } },
                creditNote: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(returns);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch sale returns" });
    }
});
// POST /api/sales/:id/payments - Record customer payment / AR settlement with concurrency & overpayment guards
exports.salesRouter.post("/:id/payments", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const body = req.body;
        const paymentAmount = Number(body.amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: "Payment amount must be greater than 0" });
        }
        const method = body.method || body.paymentMethod || body.paymentMode || "Bank Transfer";
        const referenceNo = body.referenceNo || body.referenceNumber || `PAY-${Date.now()}`;
        const notes = body.notes || "";
        const idempotencyKey = body.idempotencyKey || null;
        // Idempotency check
        if (idempotencyKey) {
            const existingPayment = await prisma_1.prisma.salePayment.findFirst({
                where: {
                    saleId: id,
                    idempotencyKey,
                },
            });
            if (existingPayment) {
                return res.status(409).json({
                    error: "A payment with this idempotency key has already been recorded",
                    code: "DUPLICATE_PAYMENT",
                    payment: existingPayment,
                });
            }
        }
        const { payment, updatedSale } = await prisma_1.prisma.$transaction(async (tx) => {
            // Re-read sale within transaction
            const sale = await tx.sale.findFirst({
                where: { id, tenantId },
            });
            if (!sale) {
                throw new Error("NOT_FOUND");
            }
            const total = Number(sale.total);
            const currentPaid = Number(sale.paidAmount);
            const remainingBalance = Math.round((total - currentPaid) * 100) / 100;
            if (paymentAmount > remainingBalance + 0.001) {
                throw new Error(`OVERPAYMENT: Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`);
            }
            // Concurrency check: optimistic lock via updateMany
            const newPaidAmount = Math.round((currentPaid + paymentAmount) * 100) / 100;
            const newPaymentStatus = newPaidAmount >= total - 0.001 ? "paid" : "partial";
            const updateCount = await tx.sale.updateMany({
                where: {
                    id,
                    tenantId,
                    paidAmount: sale.paidAmount, // optimistic locking guard against race condition
                },
                data: {
                    paidAmount: newPaidAmount,
                    paymentStatus: newPaymentStatus,
                    paymentMethod: method,
                },
            });
            if (updateCount.count === 0) {
                throw new Error("PAYMENT_RACE: Concurrent payment detected. Please retry.");
            }
            const newPayment = await tx.salePayment.create({
                data: {
                    saleId: id,
                    amount: paymentAmount,
                    method,
                    referenceNo,
                    notes,
                    idempotencyKey,
                    paidAt: body.date ? new Date(body.date) : new Date(),
                    createdById: req.user?.userId || req.user?.id,
                },
            });
            // Update open cash register shift if active
            const openShift = await tx.registerShift.findFirst({
                where: { tenantId, status: "open" },
            });
            if (openShift) {
                const mode = method.toLowerCase();
                const updateData = {};
                if (mode.includes("cash")) {
                    updateData.cashSales = { increment: paymentAmount };
                    updateData.expectedCash = { increment: paymentAmount };
                }
                else if (mode.includes("card")) {
                    updateData.cardSales = { increment: paymentAmount };
                }
                else {
                    updateData.upiSales = { increment: paymentAmount };
                }
                await tx.registerShift.update({
                    where: { id: openShift.id },
                    data: updateData,
                });
            }
            const freshSale = await tx.sale.findUnique({
                where: { id },
                include: { customer: true, details: true, payments: true },
            });
            return { payment: newPayment, updatedSale: freshSale };
        });
        // ⚡ Auto-post to Double-Entry General Ledger (AR Clearance)
        try {
            await (0, ledger_posting_service_1.autoPostCustomerPaymentToLedger)({
                tenantId,
                paymentId: payment.id,
                saleId: id,
                invoiceNo: updatedSale?.invoiceNo || id,
                amount: paymentAmount,
                method,
                customerName: updatedSale?.customerName || updatedSale?.customer?.name,
            });
        }
        catch (glErr) {
            console.error("Auto-post customer payment to ledger error:", glErr);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "sales:payment_recorded", {
            saleId: id,
            invoiceNo: updatedSale?.invoiceNo,
            paymentId: payment.id,
            amount: paymentAmount,
            paidAmount: Number(updatedSale?.paidAmount),
            paymentStatus: updatedSale?.paymentStatus,
        });
        return res.status(201).json({
            success: true,
            message: `Payment of ${paymentAmount} recorded successfully`,
            payment: {
                id: payment.id,
                amount: Number(payment.amount),
                method: payment.method,
                referenceNo: payment.referenceNo,
                notes: payment.notes || "",
                paidAt: payment.paidAt.toISOString(),
            },
            sale: {
                id: updatedSale?.id,
                invoiceNo: updatedSale?.invoiceNo,
                total: Number(updatedSale?.total),
                paidAmount: Number(updatedSale?.paidAmount),
                remainingBalance: Math.max(0, Number(updatedSale?.total) - Number(updatedSale?.paidAmount)),
                paymentStatus: updatedSale?.paymentStatus,
            },
        });
    }
    catch (err) {
        console.error("Customer payment error:", err);
        if (err.message === "NOT_FOUND") {
            return res.status(404).json({ error: "Sale not found" });
        }
        if (err.message?.startsWith("OVERPAYMENT")) {
            return res.status(400).json({ error: err.message, code: "OVERPAYMENT" });
        }
        if (err.message?.startsWith("PAYMENT_RACE")) {
            return res.status(409).json({ error: err.message, code: "PAYMENT_RACE" });
        }
        if (err instanceof ledger_posting_service_1.PeriodPostingError || err.code === "PERIOD_CLOSED_FOR_POSTING") {
            return res.status(400).json({ error: err.message, code: "PERIOD_CLOSED_FOR_POSTING" });
        }
        return res.status(500).json({ error: err.message || "Failed to record customer payment" });
    }
});
