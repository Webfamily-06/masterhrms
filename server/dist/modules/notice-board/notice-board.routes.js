"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noticeBoardRouter = void 0;
const express_1 = require("express");
const notice_board_service_1 = require("./notice-board.service");
const auth_1 = require("../../middleware/auth");
exports.noticeBoardRouter = (0, express_1.Router)();
exports.noticeBoardRouter.use(auth_1.requireAuth);
// 1. Get Notice Board statistics
exports.noticeBoardRouter.get("/stats", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required" });
        const stats = await notice_board_service_1.NoticeBoardService.getNoticeStats(tenantId);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch notice board stats" });
    }
});
// 2. List notices with filters (mounts / and /notices)
const handleListNotices = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required" });
        const { category, priority, departmentId, search } = req.query;
        const notices = await notice_board_service_1.NoticeBoardService.listNotices(tenantId, {
            category: category ? String(category) : undefined,
            priority: priority ? String(priority) : undefined,
            departmentId: departmentId ? String(departmentId) : undefined,
            search: search ? String(search) : undefined,
        });
        res.json({ success: true, notices });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch notices" });
    }
};
exports.noticeBoardRouter.get("/", handleListNotices);
exports.noticeBoardRouter.get("/notices", handleListNotices);
// 3. Create a notice (mounts / and /notices)
const handleCreateNotice = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            return res.status(400).json({ error: "Tenant and user context required" });
        }
        const notice = await notice_board_service_1.NoticeBoardService.createNotice(tenantId, userId, req.body);
        res.status(201).json({ success: true, notice });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to create notice" });
    }
};
exports.noticeBoardRouter.post("/", handleCreateNotice);
exports.noticeBoardRouter.post("/notices", handleCreateNotice);
// 4. Get a single notice
exports.noticeBoardRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required" });
        const notice = await notice_board_service_1.NoticeBoardService.getNotice(tenantId, id);
        res.json({ notice });
    }
    catch (err) {
        res.status(404).json({ error: err.message || "Notice not found" });
    }
});
// 5. Acknowledge a notice
exports.noticeBoardRouter.post("/:id/acknowledge", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { id } = req.params;
        const { employeeId, comments } = req.body;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required" });
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required for acknowledgement" });
        }
        const ack = await notice_board_service_1.NoticeBoardService.acknowledgeNotice(tenantId, id, employeeId, comments);
        res.status(201).json({ success: true, acknowledgement: ack });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to acknowledge notice" });
    }
});
// 6. Delete a notice
exports.noticeBoardRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!tenantId || !userId) {
            return res.status(400).json({ error: "Tenant and user context required" });
        }
        await notice_board_service_1.NoticeBoardService.deleteNotice(tenantId, id, userId);
        res.json({ success: true, message: "Notice deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to delete notice" });
    }
});
