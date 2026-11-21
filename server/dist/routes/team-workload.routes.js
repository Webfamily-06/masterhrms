"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamWorkloadRouter = void 0;
const express_1 = require("express");
const team_workload_service_1 = require("../services/team-workload.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.teamWorkloadRouter = (0, express_1.Router)();
exports.teamWorkloadRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/team-workload/summary
 * Aggregated team workload with task & timesheet utilization
 */
exports.teamWorkloadRouter.get("/summary", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { departmentId, startDate, endDate } = req.query;
        const summary = await team_workload_service_1.TeamWorkloadService.getWorkloadSummary(tenantId, {
            departmentId: departmentId ? String(departmentId) : undefined,
            startDate: startDate ? new Date(String(startDate)) : undefined,
            endDate: endDate ? new Date(String(endDate)) : undefined,
        });
        return res.json({ summary });
    }
    catch (err) {
        console.error("[team-workload:summary] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load team workload summary." });
    }
});
/**
 * GET /api/team-workload/employee/:employeeId
 * Specific employee workload details
 */
exports.teamWorkloadRouter.get("/employee/:employeeId", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const workload = await team_workload_service_1.TeamWorkloadService.getEmployeeWorkload(tenantId, req.params.employeeId);
        if (!workload) {
            return res.status(404).json({ error: "Employee workload not found." });
        }
        return res.json({ workload });
    }
    catch (err) {
        console.error("[team-workload:employee] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load employee workload." });
    }
});
