"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopifyRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const shopify_sync_service_1 = require("../services/shopify-sync.service");
const entitlements_1 = require("../middleware/entitlements");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.shopifyRouter = (0, express_1.Router)();
// Enforce authentication, tenant context, and Shopify Sync entitlement
exports.shopifyRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("shopify-sync"));
function getTenantId(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
        res.status(403).json({ ok: false, error: "Forbidden: Valid workspace context is required." });
        return null;
    }
    return tenantId;
}
// GET /api/shopify/dashboard
exports.shopifyRouter.get("/dashboard", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const data = await (0, shopify_sync_service_1.getShopifyDashboardData)(tenantId);
        res.json({ ok: true, ...data });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to load dashboard data" });
    }
});
// GET /api/shopify/stores
exports.shopifyRouter.get("/stores", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const stores = await (0, shopify_sync_service_1.getShopifyStores)(tenantId);
        const warehouses = await prisma_1.prisma.warehouse.findMany({ where: { tenantId } });
        res.json({ ok: true, stores, warehouses });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to load stores" });
    }
});
// POST /api/shopify/stores
exports.shopifyRouter.post("/stores", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const store = await (0, shopify_sync_service_1.saveShopifyStore)(tenantId, req.body);
        res.json({ ok: true, store, message: "Shopify store saved successfully" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to save store" });
    }
});
// DELETE /api/shopify/stores/:id
exports.shopifyRouter.delete("/stores/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        await (0, shopify_sync_service_1.deleteShopifyStore)(tenantId, req.params.id);
        res.json({ ok: true, message: "Store disconnected successfully" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to delete store" });
    }
});
// POST /api/shopify/test-connection
exports.shopifyRouter.post("/test-connection", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const result = await (0, shopify_sync_service_1.testShopifyConnection)(tenantId, req.body);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Connection test failed" });
    }
});
// POST /api/shopify/sync/products
exports.shopifyRouter.post("/sync/products", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const storeId = req.body?.store_id;
        const mode = req.body?.mode || "pull";
        const result = await (0, shopify_sync_service_1.syncShopifyProducts)(tenantId, storeId, mode);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Product sync failed" });
    }
});
// POST /api/shopify/sync/stock
exports.shopifyRouter.post("/sync/stock", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const storeId = req.body?.store_id;
        const result = await (0, shopify_sync_service_1.syncShopifyStock)(tenantId, storeId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Stock sync failed" });
    }
});
// POST /api/shopify/sync/orders
exports.shopifyRouter.post("/sync/orders", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const storeId = req.body?.store_id;
        const result = await (0, shopify_sync_service_1.syncShopifyOrders)(tenantId, storeId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Order sync failed" });
    }
});
// POST /api/shopify/sync/customers
exports.shopifyRouter.post("/sync/customers", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const storeId = req.body?.store_id;
        const result = await (0, shopify_sync_service_1.syncShopifyCustomers)(tenantId, storeId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Customer sync failed" });
    }
});
// GET /api/shopify/locations
exports.shopifyRouter.get("/locations", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = getTenantId(req, res);
        if (!tenantId)
            return;
        const storeId = req.query.store_id;
        const result = await (0, shopify_sync_service_1.getShopifyLocations)(tenantId, storeId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to load locations" });
    }
});
// GET /api/shopify/logs
exports.shopifyRouter.get("/logs", auth_1.requireAuth, async (_req, res) => {
    try {
        const logs = (0, shopify_sync_service_1.getShopifyLogs)();
        res.json({ ok: true, logs });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to load logs" });
    }
});
// POST /api/shopify/logs/clear
exports.shopifyRouter.post("/logs/clear", auth_1.requireAuth, async (_req, res) => {
    try {
        (0, shopify_sync_service_1.clearShopifyLogs)();
        res.json({ ok: true, message: "Logs cleared" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message || "Failed to clear logs" });
    }
});
