"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const ecommerce_sync_service_1 = require("../services/ecommerce-sync.service");
const prisma_1 = require("../prisma");
const tenant_1 = require("../lib/tenant");
exports.ecommerceRouter = (0, express_1.Router)();
// Enforce authentication and tenant context across all eCommerce endpoints
exports.ecommerceRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/ecommerce/status - Fetch integration settings, status, & product counts
exports.ecommerceRouter.get("/status", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const isSuperAdmin = req.user?.roles?.includes("super_admin") || false;
        const [wooEnt, shopifyEnt] = await Promise.all([
            (0, entitlements_1.checkTenantEntitlement)(tenantId, "woocommerce-sync", isSuperAdmin),
            (0, entitlements_1.checkTenantEntitlement)(tenantId, "shopify-sync", isSuperAdmin),
        ]);
        if (!wooEnt.entitled && !shopifyEnt.entitled) {
            return res.status(403).json({
                error: "Access denied. An E-Commerce add-on (WooCommerce or Shopify Sync) must be installed and active for this workspace.",
                code: "ADDON_REQUIRED",
            });
        }
        const config = await (0, ecommerce_sync_service_1.getTenantEcommerceConfig)(tenantId);
        // Query live synced products count from DB
        const [wooCount, shopifyCount, totalCount] = await Promise.all([
            prisma_1.prisma.product.count({
                where: {
                    tenantId,
                    sku: { startsWith: "WC-" },
                },
            }),
            prisma_1.prisma.product.count({
                where: {
                    tenantId,
                    sku: { startsWith: "SH-" },
                },
            }),
            prisma_1.prisma.product.count({
                where: { tenantId },
            }),
        ]);
        res.json({
            success: true,
            channels: {
                wooCommerce: wooEnt.entitled
                    ? {
                        ...config.wooCommerce,
                        syncedProductsCount: wooCount,
                        isEntitled: true,
                    }
                    : { enabled: false, isEntitled: false },
                shopify: shopifyEnt.entitled
                    ? {
                        ...config.shopify,
                        syncedProductsCount: shopifyCount,
                        isEntitled: true,
                    }
                    : { enabled: false, isEntitled: false },
            },
            totalCatalogCount: totalCount,
            recentLogs: (0, ecommerce_sync_service_1.getSyncLogs)().slice(0, 20),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch eCommerce status: " + err.message });
    }
});
// POST /api/ecommerce/test/woocommerce - Test handshake against user-provided WooCommerce credentials
exports.ecommerceRouter.post("/test/woocommerce", (0, entitlements_1.requireEntitlement)("woocommerce-sync"), async (req, res) => {
    const { storeUrl, consumerKey, consumerSecret } = req.body;
    if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({
            ok: false,
            message: "Please provide Store URL, Consumer Key, and Consumer Secret.",
        });
    }
    const result = await (0, ecommerce_sync_service_1.testWooCommerceConnection)({ storeUrl, consumerKey, consumerSecret });
    return res.json(result);
});
// POST /api/ecommerce/test/shopify - Test handshake against user-provided Shopify credentials
exports.ecommerceRouter.post("/test/shopify", (0, entitlements_1.requireEntitlement)("shopify-sync"), async (req, res) => {
    const { storeDomain, accessToken, apiVersion } = req.body;
    if (!storeDomain || !accessToken) {
        return res.status(400).json({
            ok: false,
            message: "Please provide Shopify Store Domain and Admin API Access Token.",
        });
    }
    const result = await (0, ecommerce_sync_service_1.testShopifyConnection)({ storeDomain, accessToken, apiVersion });
    return res.json(result);
});
// POST /api/ecommerce/save-config - Permanently persist credentials to DB
exports.ecommerceRouter.post("/save-config", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const isSuperAdmin = req.user?.roles?.includes("super_admin") || false;
        const body = req.body || {};
        // Validate entitlement per configured channel
        if (body.wooCommerce || body.storeUrl || body.consumerKey) {
            const wooEnt = await (0, entitlements_1.checkTenantEntitlement)(tenantId, "woocommerce-sync", isSuperAdmin);
            if (!wooEnt.entitled) {
                return res.status(403).json({
                    error: "Forbidden: WooCommerce Sync add-on is not installed or enabled for this workspace.",
                    code: "ADDON_REQUIRED",
                    requiredAddon: "woocommerce-sync",
                });
            }
        }
        if (body.shopify || body.storeDomain || body.accessToken) {
            const shopifyEnt = await (0, entitlements_1.checkTenantEntitlement)(tenantId, "shopify-sync", isSuperAdmin);
            if (!shopifyEnt.entitled) {
                return res.status(403).json({
                    error: "Forbidden: Shopify Sync add-on is not installed or enabled for this workspace.",
                    code: "ADDON_REQUIRED",
                    requiredAddon: "shopify-sync",
                });
            }
        }
        const updated = await (0, ecommerce_sync_service_1.saveTenantEcommerceConfig)(tenantId, req.body);
        res.json({
            success: true,
            message: "eCommerce store credentials successfully saved to database.",
            config: updated,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to save configuration: " + err.message });
    }
});
// POST /api/ecommerce/sync/woocommerce - Trigger WooCommerce Catalog Sync
exports.ecommerceRouter.post("/sync/woocommerce", (0, entitlements_1.requireEntitlement)("woocommerce-sync"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const result = await (0, ecommerce_sync_service_1.syncWooCommerce)(tenantId);
        res.json({
            success: true,
            message: `WooCommerce catalog synchronized! ${result.addedCount} added, ${result.updatedCount} updated.`,
            result,
        });
    }
    catch (err) {
        res.status(500).json({ error: "WooCommerce sync failed: " + err.message });
    }
});
// POST /api/ecommerce/sync/shopify - Trigger Shopify Catalog Sync
exports.ecommerceRouter.post("/sync/shopify", (0, entitlements_1.requireEntitlement)("shopify-sync"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const result = await (0, ecommerce_sync_service_1.syncShopify)(tenantId);
        res.json({
            success: true,
            message: `Shopify catalog synchronized! ${result.addedCount} added, ${result.updatedCount} updated.`,
            result,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Shopify sync failed: " + err.message });
    }
});
// POST /api/ecommerce/sync/all - Trigger Omnichannel Sync
exports.ecommerceRouter.post("/sync/all", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const isSuperAdmin = req.user?.roles?.includes("super_admin") || false;
        const [wooEnt, shopifyEnt] = await Promise.all([
            (0, entitlements_1.checkTenantEntitlement)(tenantId, "woocommerce-sync", isSuperAdmin),
            (0, entitlements_1.checkTenantEntitlement)(tenantId, "shopify-sync", isSuperAdmin),
        ]);
        if (!wooEnt.entitled && !shopifyEnt.entitled) {
            return res.status(403).json({
                error: "Access denied. An E-Commerce add-on must be installed and active.",
                code: "ADDON_REQUIRED",
            });
        }
        const tasks = [];
        if (wooEnt.entitled)
            tasks.push((0, ecommerce_sync_service_1.syncWooCommerce)(tenantId));
        if (shopifyEnt.entitled)
            tasks.push((0, ecommerce_sync_service_1.syncShopify)(tenantId));
        const results = await Promise.all(tasks);
        res.json({
            success: true,
            message: "Omnichannel catalog synchronization completed for all active connected stores!",
            results,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Omnichannel sync failed: " + err.message });
    }
});
