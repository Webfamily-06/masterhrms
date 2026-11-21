"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restaurantMenuRouter = void 0;
const express_1 = require("express");
const restaurant_menu_service_1 = require("../services/restaurant-menu.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.restaurantMenuRouter = (0, express_1.Router)();
// Public QR menu endpoint (no auth required for customer digital dining)
exports.restaurantMenuRouter.get("/public/:tenantId", async (req, res) => {
    try {
        const { tenantId } = req.params;
        const menu = await restaurant_menu_service_1.RestaurantMenuService.getMenu(tenantId);
        return res.json({ menu });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load public menu." });
    }
});
exports.restaurantMenuRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/restaurant-menu
 * Get menu catalog
 */
exports.restaurantMenuRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const menu = await restaurant_menu_service_1.RestaurantMenuService.getMenu(tenantId);
        return res.json({ menu });
    }
    catch (err) {
        console.error("[restaurant-menu:get] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load restaurant menu." });
    }
});
/**
 * POST /api/restaurant-menu/categories
 * Add category
 */
exports.restaurantMenuRouter.post("/categories", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const category = await restaurant_menu_service_1.RestaurantMenuService.addCategory(tenantId, req.body);
        return res.status(201).json({ category });
    }
    catch (err) {
        console.error("[restaurant-menu:category:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create category." });
    }
});
/**
 * POST /api/restaurant-menu/categories/:categoryId/items
 * Add item to category
 */
exports.restaurantMenuRouter.post("/categories/:categoryId/items", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const item = await restaurant_menu_service_1.RestaurantMenuService.addItem(tenantId, req.params.categoryId, req.body);
        return res.status(201).json({ item });
    }
    catch (err) {
        console.error("[restaurant-menu:item:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create menu item." });
    }
});
/**
 * POST /api/restaurant-menu/items/:itemId/availability
 * Toggle item availability
 */
exports.restaurantMenuRouter.post("/items/:itemId/availability", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const item = await restaurant_menu_service_1.RestaurantMenuService.toggleAvailability(tenantId, req.params.itemId, Boolean(req.body.isAvailable));
        return res.json({ item });
    }
    catch (err) {
        console.error("[restaurant-menu:item:availability] error:", err);
        return res.status(500).json({ error: err.message || "Failed to toggle availability." });
    }
});
/**
 * POST /api/restaurant-menu/qr
 * Generate QR code digital payload
 */
exports.restaurantMenuRouter.post("/qr", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const result = await restaurant_menu_service_1.RestaurantMenuService.generateQrPayload(tenantId, req.body.domain);
        return res.json(result);
    }
    catch (err) {
        console.error("[restaurant-menu:qr] error:", err);
        return res.status(500).json({ error: err.message || "Failed to generate QR payload." });
    }
});
