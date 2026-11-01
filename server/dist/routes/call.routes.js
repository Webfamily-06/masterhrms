"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../socket");
const prisma_1 = require("../prisma");
const incoming_call_push_service_1 = require("../services/incoming-call-push.service");
exports.callRouter = (0, express_1.Router)();
// GET /api/calls/:callId/status - Fetch authoritative call session state
exports.callRouter.get("/:callId/status", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        // 1. Check in-memory live call registry
        const liveSession = socket_1.activeCalls.get(callId);
        if (liveSession && liveSession.tenantId === tenantId) {
            const isParticipant = liveSession.callerId === userId || liveSession.targetUserId === userId;
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: "Access denied: You are not a participant in this call." });
            }
            return res.json({
                success: true,
                data: {
                    callId: liveSession.callId,
                    status: liveSession.status,
                    callType: liveSession.callType,
                    callerId: liveSession.callerId,
                    callerName: liveSession.callerName,
                    callerAvatar: liveSession.callerAvatar,
                    targetUserId: liveSession.targetUserId,
                    targetName: liveSession.targetName,
                    threadId: liveSession.threadId,
                    startedAt: liveSession.startedAt,
                    isPending: liveSession.status === "ringing",
                },
            });
        }
        // 2. Fall back to persisted CallHistoryRecord
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const history = await db.callHistoryRecord.findFirst({
            where: {
                tenantId,
                callSessionId: callId,
            },
        });
        if (history) {
            return res.json({
                success: true,
                data: {
                    callId,
                    status: history.status, // "completed", "missed", "rejected", "cancelled"
                    callType: history.callType,
                    callerId: history.callerId,
                    callerName: history.callerName,
                    callerAvatar: history.callerAvatarUrl,
                    targetUserId: history.receiverId,
                    targetName: history.receiverName,
                    startedAt: history.startedAt,
                    isPending: false,
                },
            });
        }
        return res.status(404).json({ success: false, error: "Call not found or expired" });
    }
    catch (error) {
        console.error("[CallRoutes] Fetch status error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to fetch call status" });
    }
});
// POST /api/calls/:callId/accept - Authenticated call acceptance
exports.callRouter.post("/:callId/accept", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const session = socket_1.activeCalls.get(callId);
        if (!session || session.tenantId !== tenantId) {
            return res.status(404).json({ success: false, error: "Call session not found or already ended." });
        }
        if (session.targetUserId !== userId) {
            return res.status(403).json({ success: false, error: "Only the designated recipient may accept this call." });
        }
        if (session.status !== "ringing") {
            return res.status(409).json({ success: false, error: `Call is in status ${session.status} and cannot be accepted.` });
        }
        // Clear ringing timeout
        if (session.timeoutTimer) {
            clearTimeout(session.timeoutTimer);
            session.timeoutTimer = null;
        }
        session.status = "connected";
        const io = (0, socket_1.getIO)();
        const acceptPayload = {
            callId,
            acceptedBy: userId,
            status: "connected",
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${session.callerId}`).emit("call:accepted", acceptPayload);
        io?.to(`user:${session.targetUserId}`).emit("call:accepted", acceptPayload);
        return res.json({
            success: true,
            message: "Call accepted successfully",
            data: {
                callId,
                status: "connected",
                threadId: session.threadId,
            },
        });
    }
    catch (error) {
        console.error("[CallRoutes] Accept error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to accept call" });
    }
});
// POST /api/calls/:callId/reject - Authenticated call rejection
exports.callRouter.post("/:callId/reject", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const { reason } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const session = socket_1.activeCalls.get(callId);
        if (!session || session.tenantId !== tenantId) {
            return res.status(404).json({ success: false, error: "Call session not found or already ended." });
        }
        if (session.targetUserId !== userId) {
            return res.status(403).json({ success: false, error: "Only the designated recipient may reject this call." });
        }
        if (session.timeoutTimer) {
            clearTimeout(session.timeoutTimer);
            session.timeoutTimer = null;
        }
        session.status = "ended";
        socket_1.activeCalls.delete(callId);
        const io = (0, socket_1.getIO)();
        const rejectPayload = {
            callId,
            rejectedBy: userId,
            reason: reason || "declined",
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${session.callerId}`).emit("call:rejected", rejectPayload);
        io?.to(`user:${session.targetUserId}`).emit("call:rejected", rejectPayload);
        // Also cancel any persistent push notifications on the client
        void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
            callId,
            tenantId,
            targetUserId: userId,
            reason: "declined",
        }).catch(() => { });
        return res.json({
            success: true,
            message: "Call rejected successfully",
        });
    }
    catch (error) {
        console.error("[CallRoutes] Reject error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to reject call" });
    }
});
// POST /api/calls/:callId/cancel - Caller cancellation
exports.callRouter.post("/:callId/cancel", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const session = socket_1.activeCalls.get(callId);
        if (!session || session.tenantId !== tenantId) {
            return res.status(404).json({ success: false, error: "Call session not found or already ended." });
        }
        if (session.callerId !== userId) {
            return res.status(403).json({ success: false, error: "Only the caller may cancel this call." });
        }
        if (session.timeoutTimer) {
            clearTimeout(session.timeoutTimer);
            session.timeoutTimer = null;
        }
        session.status = "ended";
        socket_1.activeCalls.delete(callId);
        const io = (0, socket_1.getIO)();
        const cancelPayload = {
            callId,
            cancelledBy: userId,
            reason: "Caller cancelled",
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${session.targetUserId}`).emit("call:cancelled", cancelPayload);
        io?.to(`user:${session.callerId}`).emit("call:cancelled", cancelPayload);
        void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
            callId,
            tenantId,
            targetUserId: session.targetUserId,
            reason: "Caller cancelled",
        }).catch(() => { });
        return res.json({
            success: true,
            message: "Call cancelled successfully",
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to cancel call" });
    }
});
