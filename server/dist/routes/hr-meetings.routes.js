"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrMeetingsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const meeting_service_js_1 = require("../services/meeting.service.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
exports.hrMeetingsRouter = (0, express_1.Router)();
// Overview
exports.hrMeetingsRouter.get("/overview", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const overview = await meeting_service_js_1.MeetingService.getOverview(tenantId);
        return res.json(overview);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load meetings overview" });
    }
});
// Rooms
exports.hrMeetingsRouter.get("/rooms", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rooms = await meeting_service_js_1.MeetingService.listRooms(tenantId);
        return res.json(rooms);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.post("/rooms", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const room = await meeting_service_js_1.MeetingService.createRoom(tenantId, req.body);
        return res.status(201).json(room);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.put("/rooms/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const db = (0, tenant_context_js_1.getTenantDb)();
        const room = await db.meetingRoom.update({
            where: { id: req.params.id },
            data: req.body,
        });
        return res.json(room);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.delete("/rooms/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const db = (0, tenant_context_js_1.getTenantDb)();
        await db.meetingRoom.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Meeting Types
exports.hrMeetingsRouter.get("/types", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const types = await meeting_service_js_1.MeetingService.listTypes(tenantId);
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.post("/types", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const type = await meeting_service_js_1.MeetingService.createType(tenantId, req.body);
        return res.status(201).json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.put("/types/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const db = (0, tenant_context_js_1.getTenantDb)();
        const type = await db.meetingTypeMaster.update({
            where: { id: req.params.id },
            data: req.body,
        });
        return res.json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.delete("/types/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const db = (0, tenant_context_js_1.getTenantDb)();
        await db.meetingTypeMaster.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Meetings Management (Conflict Engine Enforcement)
exports.hrMeetingsRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const meetings = await meeting_service_js_1.MeetingService.listMeetings(tenantId, {
            roomId: req.query.roomId,
            typeId: req.query.typeId,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        return res.json(meetings);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.post("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const organizerId = req.body.organizerId || req.user?.userId;
        const meeting = await meeting_service_js_1.MeetingService.createMeeting(tenantId, organizerId, req.body);
        return res.status(201).json(meeting);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.get("/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const meeting = await db.meeting.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                room: true,
                type: true,
                attendees: { include: { employee: true } },
                actionItems: { include: { assignee: true } },
            },
        });
        if (!meeting)
            return res.status(404).json({ error: "Meeting not found" });
        return res.json(meeting);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.post("/:id/cancel", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const cancelled = await meeting_service_js_1.MeetingService.updateMeetingStatus(tenantId, req.params.id, "cancelled");
        return res.json(cancelled);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Action Items
exports.hrMeetingsRouter.get("/action-items", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const items = await meeting_service_js_1.MeetingService.listActionItems(tenantId, req.query.meetingId, req.query.status);
        return res.json(items);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.post("/action-items", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const creatorId = req.user?.userId || "system";
        const item = await meeting_service_js_1.MeetingService.createActionItem(tenantId, creatorId, req.body);
        return res.status(201).json(item);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrMeetingsRouter.patch("/action-items/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updated = await meeting_service_js_1.MeetingService.updateActionItemStatus(tenantId, req.params.id, req.body.status);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
