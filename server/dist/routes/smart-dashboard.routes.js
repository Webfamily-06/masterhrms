"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartDashboardRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const smart_dashboard_service_1 = require("../services/smart-dashboard.service");
exports.smartDashboardRouter = (0, express_1.Router)();
// Guard with Authentication, Tenant Context & Add-on Entitlement
exports.smartDashboardRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("smart-dashboard"));
// GET /api/smart-dashboard/capabilities
exports.smartDashboardRouter.get("/capabilities", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const capabilities = await smart_dashboard_service_1.SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
        return res.json({ success: true, capabilities });
    }
    catch (error) {
        console.error("SmartDashboard Capabilities Error:", error);
        return res.status(500).json({ error: error.message || "Failed to resolve workspace capabilities" });
    }
});
// GET /api/smart-dashboard/overview
exports.smartDashboardRouter.get("/overview", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const capabilities = await smart_dashboard_service_1.SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
        const data = await smart_dashboard_service_1.SmartDashboardService.getExecutiveOverview(tenantId, capabilities);
        return res.json({ success: true, capabilities, data });
    }
    catch (error) {
        console.error("SmartDashboard Overview Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch executive overview" });
    }
});
// GET /api/smart-dashboard/financial
exports.smartDashboardRouter.get("/financial", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const capabilities = await smart_dashboard_service_1.SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
        // Enforce capability authorization on backend
        if (!capabilities.financial && !capabilities.sales) {
            return res.status(403).json({
                error: "Product 'finance' is not included in this workspace's subscription.",
                code: "PRODUCT_NOT_SUBSCRIBED",
                key: "finance",
                requiresSubscription: true,
                status: "inactive",
            });
        }
        const data = await smart_dashboard_service_1.SmartDashboardService.getFinancialAnalytics(tenantId, capabilities);
        return res.json({ success: true, capabilities, data });
    }
    catch (error) {
        console.error("SmartDashboard Financial Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch financial analytics" });
    }
});
// GET /api/smart-dashboard/sales
exports.smartDashboardRouter.get("/sales", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const capabilities = await smart_dashboard_service_1.SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
        // Enforce capability authorization on backend
        if (!capabilities.sales && !capabilities.crm) {
            return res.status(403).json({
                error: "Product 'crm' is not included in this workspace's subscription.",
                code: "PRODUCT_NOT_SUBSCRIBED",
                key: "crm",
                requiresSubscription: true,
                status: "inactive",
            });
        }
        const data = await smart_dashboard_service_1.SmartDashboardService.getSalesCustomerAnalytics(tenantId, capabilities);
        return res.json({ success: true, capabilities, data });
    }
    catch (error) {
        console.error("SmartDashboard Sales Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch sales analytics" });
    }
});
// GET /api/smart-dashboard/operational
exports.smartDashboardRouter.get("/operational", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const capabilities = await smart_dashboard_service_1.SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
        // Enforce capability authorization on backend: must have at least one operational module
        if (!capabilities.inventory && !capabilities.pos && !capabilities.projects && !capabilities.purchases) {
            return res.status(403).json({
                error: "Operational modules (Inventory, POS, Projects, Procurement) are not included in this workspace's subscription.",
                code: "PRODUCT_NOT_SUBSCRIBED",
                key: "operational",
                requiresSubscription: true,
                status: "inactive",
            });
        }
        const data = await smart_dashboard_service_1.SmartDashboardService.getOperationalAnalytics(tenantId, capabilities);
        return res.json({ success: true, capabilities, data });
    }
    catch (error) {
        console.error("SmartDashboard Operational Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch operational analytics" });
    }
});
// GET /api/smart-dashboard/export
exports.smartDashboardRouter.get("/export", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const capabilities = await smart_dashboard_service_1.SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
        const section = req.query.section || "overview";
        if (section === "financial" && !capabilities.financial && !capabilities.sales) {
            return res.status(403).json({
                error: "Forbidden: Not authorized to export financial data.",
                code: "PRODUCT_NOT_SUBSCRIBED",
            });
        }
        if (section === "sales" && !capabilities.sales && !capabilities.crm) {
            return res.status(403).json({
                error: "Forbidden: Not authorized to export sales data.",
                code: "PRODUCT_NOT_SUBSCRIBED",
            });
        }
        if (section === "operational" &&
            !capabilities.inventory &&
            !capabilities.pos &&
            !capabilities.projects &&
            !capabilities.purchases) {
            return res.status(403).json({
                error: "Forbidden: Not authorized to export operational data.",
                code: "PRODUCT_NOT_SUBSCRIBED",
            });
        }
        let exportData = {};
        if (section === "financial") {
            exportData = await smart_dashboard_service_1.SmartDashboardService.getFinancialAnalytics(tenantId, capabilities);
        }
        else if (section === "sales") {
            exportData = await smart_dashboard_service_1.SmartDashboardService.getSalesCustomerAnalytics(tenantId, capabilities);
        }
        else if (section === "operational") {
            exportData = await smart_dashboard_service_1.SmartDashboardService.getOperationalAnalytics(tenantId, capabilities);
        }
        else {
            exportData = await smart_dashboard_service_1.SmartDashboardService.getExecutiveOverview(tenantId, capabilities);
        }
        res.setHeader("Content-Disposition", `attachment; filename="smart-dashboard-${section}-${Date.now()}.json"`);
        res.setHeader("Content-Type", "application/json");
        return res.send(JSON.stringify(exportData, null, 2));
    }
    catch (error) {
        console.error("SmartDashboard Export Error:", error);
        return res.status(500).json({ error: error.message || "Failed to export data" });
    }
});
