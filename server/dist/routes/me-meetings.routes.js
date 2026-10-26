"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meMeetingsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
const meeting_service_js_1 = require("../services/meeting.service.js");
exports.meMeetingsRouter = (0, express_1.Router)();
async function resolveEmployee(req) {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    const userId = user.userId || user.id;
    const db = (0, tenant_context_js_1.getTenantDb)();
    return await db.employee.findFirst({
        where: { tenantId, userId },
    });
}
// My Meetings
exports.meMeetingsRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const meetings = await meeting_service_js_1.MeetingService.getEmployeeMeetings(tenantId, employee.id);
        return res.json(meetings);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// RSVP to a Meeting
exports.meMeetingsRouter.post("/:id/rsvp", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const result = await meeting_service_js_1.MeetingService.respondRsvp(tenantId, req.params.id, employee.id, req.body.rsvpStatus);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// My Action Items
exports.meMeetingsRouter.get("/action-items", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const items = await meeting_service_js_1.MeetingService.getEmployeeActionItems(tenantId, employee.id);
        return res.json(items);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Update Action Item Status
exports.meMeetingsRouter.patch("/action-items/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const updated = await meeting_service_js_1.MeetingService.updateActionItemStatus(tenantId, req.params.id, req.body.status);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
