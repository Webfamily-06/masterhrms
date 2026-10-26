"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_ROLES = exports.smartReportsRouter = void 0;
exports.getUserRoles = getUserRoles;
exports.checkReportAuthorization = checkReportAuthorization;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const smart_reports_service_1 = require("../services/smart-reports.service");
exports.smartReportsRouter = (0, express_1.Router)();
// Guard all report routes with Authentication, Tenant Context & Add-on Entitlement
exports.smartReportsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("smart-reports"));
/**
 * Role-Based Access Control configuration for Smart Reports
 * Implements least privilege per report domain:
 * - Payroll: HR/Payroll Administrators only
 * - Finance (Sales & Purchases): Finance/Accounting roles only
 * - HR & Operations (Attendance & Leave): HR, Management, Operations
 * - Commercial & Logistics (Deals, Stock, Projects): Domain-appropriate roles
 */
exports.REPORT_ROLES = {
    "attendance-summary": ["super_admin", "admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "operations_manager"],
    "payroll-sheet": ["super_admin", "admin", "tenant_admin", "hr_admin", "payroll_admin", "hr_manager"],
    "leave-report": ["super_admin", "admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "operations_manager"],
    "sales-invoice": ["super_admin", "admin", "tenant_admin", "accountant", "finance_manager", "finance_admin"],
    "purchase-invoice": ["super_admin", "admin", "tenant_admin", "accountant", "finance_manager", "finance_admin"],
    "deal-pipeline": ["super_admin", "admin", "tenant_admin", "sales_admin", "sales_manager", "crm_manager", "sales_rep", "manager"],
    "product-stock": ["super_admin", "admin", "tenant_admin", "inventory_manager", "warehouse_manager", "operations_manager", "manager"],
    "project-progress": ["super_admin", "admin", "tenant_admin", "project_manager", "operations_manager", "manager", "team_lead"],
};
function getUserRoles(req) {
    if (req.user?.roles && Array.isArray(req.user.roles) && req.user.roles.length > 0) {
        return req.user.roles;
    }
    if (req.user?.role) {
        return [req.user.role];
    }
    return ["employee"];
}
function checkReportAuthorization(reportId, userRoles) {
    if (reportId === "catalogue")
        return true;
    const allowed = exports.REPORT_ROLES[reportId];
    if (!allowed)
        return false;
    return userRoles.some((r) => allowed.includes(r));
}
function requireReportRole(reportId) {
    return (req, res, next) => {
        const roles = getUserRoles(req);
        if (!checkReportAuthorization(reportId, roles)) {
            return res.status(403).json({
                error: `Forbidden: Insufficient permissions for '${reportId}'. Required roles: ${exports.REPORT_ROLES[reportId]?.join(", ")}`,
            });
        }
        next();
    };
}
async function fetchReportData(reportId, tenantId, query) {
    switch (reportId) {
        case "attendance-summary":
            return smart_reports_service_1.SmartReportsService.getAttendanceSummary(tenantId, query);
        case "payroll-sheet":
            return smart_reports_service_1.SmartReportsService.getPayrollSheet(tenantId, query);
        case "leave-report":
            return smart_reports_service_1.SmartReportsService.getLeaveReport(tenantId, query);
        case "sales-invoice":
            return smart_reports_service_1.SmartReportsService.getSalesInvoiceReport(tenantId, query);
        case "purchase-invoice":
            return smart_reports_service_1.SmartReportsService.getPurchaseInvoiceReport(tenantId, query);
        case "deal-pipeline":
            return smart_reports_service_1.SmartReportsService.getDealPipelineReport(tenantId, query);
        case "product-stock":
            return smart_reports_service_1.SmartReportsService.getProductStockReport(tenantId, query);
        case "project-progress":
            return smart_reports_service_1.SmartReportsService.getProjectProgressReport(tenantId, query);
        case "catalogue":
            return smart_reports_service_1.SmartReportsService.getCatalogueOverview(tenantId);
        default:
            return null;
    }
}
// GET /api/smart-reports/catalogue
exports.smartReportsRouter.get("/catalogue", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getCatalogueOverview(tenantId);
        return res.json({ success: true, data });
    }
    catch (error) {
        console.error("SmartReports Catalogue Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch catalogue" });
    }
});
// Dedicated report endpoints with granular role protection
exports.smartReportsRouter.get("/attendance-summary", requireReportRole("attendance-summary"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getAttendanceSummary(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch attendance summary" });
    }
});
exports.smartReportsRouter.get("/payroll-sheet", requireReportRole("payroll-sheet"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getPayrollSheet(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch payroll sheet" });
    }
});
exports.smartReportsRouter.get("/leave-report", requireReportRole("leave-report"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getLeaveReport(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch leave report" });
    }
});
exports.smartReportsRouter.get("/sales-invoice", requireReportRole("sales-invoice"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getSalesInvoiceReport(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch sales invoice report" });
    }
});
exports.smartReportsRouter.get("/purchase-invoice", requireReportRole("purchase-invoice"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getPurchaseInvoiceReport(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch purchase invoice report" });
    }
});
exports.smartReportsRouter.get("/deal-pipeline", requireReportRole("deal-pipeline"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getDealPipelineReport(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch deal pipeline report" });
    }
});
exports.smartReportsRouter.get("/product-stock", requireReportRole("product-stock"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getProductStockReport(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch product stock report" });
    }
});
exports.smartReportsRouter.get("/project-progress", requireReportRole("project-progress"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const data = await smart_reports_service_1.SmartReportsService.getProjectProgressReport(tenantId, req.query);
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch project progress report" });
    }
});
// GET /api/smart-reports/export (query param: ?report=...&format=csv|json)
exports.smartReportsRouter.get("/export", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const report = req.query.report || "catalogue";
        const format = (req.query.format || "json").toLowerCase();
        // Enforce identical least-privilege authorization on exports
        const userRoles = getUserRoles(req);
        if (!checkReportAuthorization(report, userRoles)) {
            return res.status(403).json({
                error: `Forbidden: Insufficient permissions to export '${report}'. Required roles: ${exports.REPORT_ROLES[report]?.join(", ")}`,
            });
        }
        const exportData = await fetchReportData(report, tenantId, req.query);
        if (!exportData) {
            return res.status(404).json({ error: `Report '${report}' not found.` });
        }
        if (format === "csv") {
            const csv = smart_reports_service_1.SmartReportsService.generateCsv(report, exportData);
            res.setHeader("Content-Disposition", `attachment; filename="${report}-${Date.now()}.csv"`);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            return res.send(csv);
        }
        res.setHeader("Content-Disposition", `attachment; filename="${report}-${Date.now()}.json"`);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.send(JSON.stringify(exportData, null, 2));
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to export report" });
    }
});
// GET /api/smart-reports/report/:reportId (alias compatibility)
exports.smartReportsRouter.get("/report/:reportId", async (req, res) => {
    const { reportId } = req.params;
    const tenantId = req.user?.tenantId || req.tenantId || "default";
    try {
        if (!exports.REPORT_ROLES[reportId] && reportId !== "catalogue") {
            return res.status(404).json({ error: `Report '${reportId}' not found.` });
        }
        const userRoles = getUserRoles(req);
        if (!checkReportAuthorization(reportId, userRoles)) {
            return res.status(403).json({
                error: `Forbidden: Insufficient permissions for '${reportId}'. Required roles: ${exports.REPORT_ROLES[reportId]?.join(", ")}`,
            });
        }
        const data = await fetchReportData(reportId, tenantId, req.query);
        if (!data) {
            return res.status(404).json({ error: `Report '${reportId}' not found.` });
        }
        return res.json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch report" });
    }
});
// GET /api/smart-reports/export/:reportId (alias compatibility with ?format=csv|json)
exports.smartReportsRouter.get("/export/:reportId", async (req, res) => {
    const { reportId } = req.params;
    const tenantId = req.user?.tenantId || req.tenantId || "default";
    const format = (req.query.format || "json").toLowerCase();
    try {
        if (!exports.REPORT_ROLES[reportId] && reportId !== "catalogue") {
            return res.status(404).json({ error: `Report '${reportId}' not found.` });
        }
        const userRoles = getUserRoles(req);
        if (!checkReportAuthorization(reportId, userRoles)) {
            return res.status(403).json({
                error: `Forbidden: Insufficient permissions to export '${reportId}'. Required roles: ${exports.REPORT_ROLES[reportId]?.join(", ")}`,
            });
        }
        const exportData = await fetchReportData(reportId, tenantId, req.query);
        if (!exportData) {
            return res.status(404).json({ error: `Report '${reportId}' not found.` });
        }
        if (format === "csv") {
            const csv = smart_reports_service_1.SmartReportsService.generateCsv(reportId, exportData);
            res.setHeader("Content-Disposition", `attachment; filename="${reportId}-${Date.now()}.csv"`);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            return res.send(csv);
        }
        res.setHeader("Content-Disposition", `attachment; filename="${reportId}-${Date.now()}.json"`);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.send(JSON.stringify(exportData, null, 2));
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to export report" });
    }
});
