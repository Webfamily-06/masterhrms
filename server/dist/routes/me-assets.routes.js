"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meAssetsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
const asset_service_js_1 = require("../services/asset.service.js");
exports.meAssetsRouter = (0, express_1.Router)();
async function resolveEmployee(req) {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    const userId = user.userId || user.id;
    const db = (0, tenant_context_js_1.getTenantDb)();
    return await db.employee.findFirst({
        where: { tenantId, userId },
    });
}
// My Assets Dashboard
exports.meAssetsRouter.get("/dashboard", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json({ totalAssigned: 0, pendingAcknowledgement: 0, requestsCount: 0 });
        const assignments = await asset_service_js_1.AssetService.getEmployeeAssets(tenantId, employee.id);
        const requests = await asset_service_js_1.AssetService.getEmployeeRequests(tenantId, employee.id);
        const pendingAck = assignments.filter((a) => !a.acknowledgedAt).length;
        return res.json({
            totalAssigned: assignments.filter((a) => a.status === 'active').length,
            pendingAcknowledgement: pendingAck,
            requestsCount: requests.length,
            recentAssignments: assignments.slice(0, 5),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// My Assets List
exports.meAssetsRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const assignments = await asset_service_js_1.AssetService.getEmployeeAssets(tenantId, employee.id);
        return res.json(assignments);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Acknowledge Assignment
exports.meAssetsRouter.post("/assignments/:id/acknowledge", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const result = await asset_service_js_1.AssetService.acknowledgeAsset(tenantId, req.params.id, employee.id, req.body.signatureDataUrl || "DIGITALLY_SIGNED");
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// My Requests
exports.meAssetsRouter.get("/requests", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const requests = await asset_service_js_1.AssetService.getEmployeeRequests(tenantId, employee.id);
        return res.json(requests);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.meAssetsRouter.post("/requests", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const request = await asset_service_js_1.AssetService.requestAsset(tenantId, employee.id, req.body);
        return res.status(201).json(request);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
