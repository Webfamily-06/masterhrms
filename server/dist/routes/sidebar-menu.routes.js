"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sidebarMenuRouter = void 0;
const express_1 = require("express");
const sidebar_menu_service_1 = require("../services/sidebar-menu.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.sidebarMenuRouter = (0, express_1.Router)();
exports.sidebarMenuRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/sidebar-menu
 * Get customized navigation menu tree
 */
exports.sidebarMenuRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const userRole = req.query.role || req.user?.workspaceRole || "admin";
        const navigation = await sidebar_menu_service_1.SidebarMenuService.getNavigation(tenantId, userRole);
        return res.json({ navigation });
    }
    catch (err) {
        console.error("[sidebar-menu:get] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load sidebar navigation." });
    }
});
/**
 * POST /api/sidebar-menu/items
 * Add custom sidebar navigation item
 */
exports.sidebarMenuRouter.post("/items", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { title, path, icon, roles, sortOrder } = req.body;
        if (!title || !path) {
            return res.status(400).json({ error: "Title and path are required." });
        }
        const item = await sidebar_menu_service_1.SidebarMenuService.addCustomMenuItem(tenantId, {
            title,
            path,
            icon,
            roles,
            sortOrder: sortOrder ? Number(sortOrder) : undefined,
        });
        return res.status(201).json({ item });
    }
    catch (err) {
        console.error("[sidebar-menu:item:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create menu item." });
    }
});
/**
 * PUT /api/sidebar-menu/items/:itemId/toggle
 * Toggle menu item visibility
 */
exports.sidebarMenuRouter.put("/items/:itemId/toggle", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { isEnabled } = req.body;
        const item = await sidebar_menu_service_1.SidebarMenuService.toggleMenuItem(tenantId, req.params.itemId, Boolean(isEnabled));
        return res.json({ item });
    }
    catch (err) {
        console.error("[sidebar-menu:item:toggle] error:", err);
        return res.status(500).json({ error: err.message || "Failed to toggle menu item." });
    }
});
/**
 * PUT /api/sidebar-menu/reorder
 * Reorder menu items
 */
exports.sidebarMenuRouter.put("/reorder", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ error: "orderedIds array is required." });
        }
        const items = await sidebar_menu_service_1.SidebarMenuService.reorderMenuItems(tenantId, orderedIds);
        return res.json({ items });
    }
    catch (err) {
        console.error("[sidebar-menu:reorder] error:", err);
        return res.status(500).json({ error: err.message || "Failed to reorder menu items." });
    }
});
