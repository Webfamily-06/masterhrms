"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.woocommerceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const woocommerce_sync_service_1 = require("../services/woocommerce-sync.service");
const prisma_1 = require("../prisma");
const entitlements_1 = require("../middleware/entitlements");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.woocommerceRouter = (0, express_1.Router)();
// Enforce authentication, tenant context, and WooCommerce Sync entitlement
exports.woocommerceRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("woocommerce-sync"));
// Helper to get active tenantId
function getTenantId(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
        res.status(403).json({ ok: false, error: "Forbidden: Valid workspace context is required." });
        return null;
    }
    return tenantId;
}
// GET /api/woocommerce/settings
exports.woocommerceRouter.get("/settings", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const settings = await (0, woocommerce_sync_service_1.getWooCommerceSettings)(tenantId);
        res.json({
            settings,
            sync_options: settings.sync_options || {},
            sync_options_meta: woocommerce_sync_service_1.SYNC_OPTIONS_META,
            ok: true,
        });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// POST /api/woocommerce/settings
exports.woocommerceRouter.post("/settings", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const updated = await (0, woocommerce_sync_service_1.saveWooCommerceSettings)(tenantId, req.body);
        res.json({
            ok: true,
            message: "WooCommerce settings successfully updated",
            settings: updated,
        });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// POST /api/woocommerce/test-connection
exports.woocommerceRouter.post("/test-connection", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const result = await (0, woocommerce_sync_service_1.testWooCommerceConnection)(tenantId, req.body);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// GET /api/woocommerce/status
exports.woocommerceRouter.get("/status", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const settings = await (0, woocommerce_sync_service_1.getWooCommerceSettings)(tenantId);
        const [totalProducts, wooProducts, totalOrders] = await Promise.all([
            prisma_1.prisma.product.count({ where: { tenantId } }),
            prisma_1.prisma.product.count({
                where: { tenantId, sku: { startsWith: "WC-" } },
            }),
            prisma_1.prisma.sale.count({
                where: { tenantId, invoiceNo: { startsWith: "SO_WOO_" } },
            }),
        ]);
        const unsyncedCount = Math.max(0, totalProducts - wooProducts);
        res.json({
            ok: true,
            connectionOk: settings.last_connection_status === "connected",
            status: settings.last_connection_status,
            totalProducts,
            syncedProducts: wooProducts,
            unsyncedCount,
            totalOrders,
            lastSyncAt: settings.last_sync_at,
            settings: {
                store_url: settings.store_url,
                consumer_key: settings.consumer_key,
                wp_username: settings.wp_username,
            },
        });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// GET /api/woocommerce/unsynced-count
exports.woocommerceRouter.get("/unsynced-count", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const total = await prisma_1.prisma.product.count({ where: { tenantId } });
        const synced = await prisma_1.prisma.product.count({
            where: { tenantId, sku: { startsWith: "WC-" } },
        });
        res.json({ total, unsynced: Math.max(0, total - synced) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/woocommerce/sync/products
exports.woocommerceRouter.post("/sync/products", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const mode = req.body?.mode || "pull";
        const result = await (0, woocommerce_sync_service_1.syncWooCommerceProducts)(tenantId, mode);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// POST /api/woocommerce/products/auto-link
exports.woocommerceRouter.post("/products/auto-link", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const result = await (0, woocommerce_sync_service_1.autoLinkProductsBySku)(tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// POST /api/woocommerce/sync/stock
exports.woocommerceRouter.post("/sync/stock", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const result = await (0, woocommerce_sync_service_1.syncWooCommerceStock)(tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// GET /api/woocommerce/stock-metrics
exports.woocommerceRouter.get("/stock-metrics", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const settings = await (0, woocommerce_sync_service_1.getWooCommerceSettings)(tenantId);
        const inStock = await prisma_1.prisma.productWarehouse.count({
            where: { product: { tenantId }, quantity: { gt: 0 } },
        });
        const outStock = await prisma_1.prisma.productWarehouse.count({
            where: { product: { tenantId }, quantity: { lte: 0 } },
        });
        res.json({
            in_stock: inStock,
            out_stock: outStock,
            last_sync: settings.last_sync_at,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/woocommerce/sync/orders
exports.woocommerceRouter.post("/sync/orders", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const result = await (0, woocommerce_sync_service_1.syncWooCommerceOrders)(tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// GET /api/woocommerce/orders
exports.woocommerceRouter.get("/orders", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const sales = await prisma_1.prisma.sale.findMany({
            where: { tenantId, invoiceNo: { startsWith: "SO_WOO_" } },
            include: { customer: true },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        res.json({
            ok: true,
            orders: sales.map((s) => ({
                id: s.id,
                number: s.invoiceNo.replace("SO_WOO_", ""),
                reference: s.invoiceNo,
                customer_name: s.customerName || s.customer?.name || "WooCommerce Client",
                total: s.total,
                status: s.paymentStatus || "PAID",
                date: s.createdAt,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// GET /api/woocommerce/logs
exports.woocommerceRouter.get("/logs", auth_1.requireAuth, async (_req, res) => {
    res.json({ ok: true, logs: (0, woocommerce_sync_service_1.getWooLogs)() });
});
// DELETE /api/woocommerce/logs
exports.woocommerceRouter.delete("/logs", auth_1.requireAuth, async (_req, res) => {
    (0, woocommerce_sync_service_1.clearWooLogs)();
    res.json({ ok: true, message: "WooCommerce logs cleared" });
});
// POST /api/woocommerce/reset-sync
exports.woocommerceRouter.post("/reset-sync", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        await (0, woocommerce_sync_service_1.saveWooCommerceSettings)(tenantId, {
            last_sync_at: null,
            last_connection_status: "unknown",
            last_connection_message: null,
        });
        res.json({ ok: true, message: "WooCommerce sync cache and status reset" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
