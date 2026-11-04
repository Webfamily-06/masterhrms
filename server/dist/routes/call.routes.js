"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../socket");
const prisma_1 = require("../prisma");
const incoming_call_push_service_1 = require("../services/incoming-call-push.service");
const pusher_service_1 = require("../services/pusher.service");
exports.callRouter = (0, express_1.Router)();
// Target user ID resolution helper (supports direct user.id or employee.id)
async function resolveTargetUserId(tenantId, targetId) {
    const db = prisma_1.rawPrisma || prisma_1.prisma;
    const directUser = await db.user.findFirst({
        where: { id: targetId, profile: { tenantId } },
        select: { id: true },
    });
    if (directUser)
        return directUser.id;
    const employee = await db.employee.findFirst({
        where: { id: targetId, tenantId },
        select: { userId: true },
    });
    if (employee?.userId) {
        const empUser = await db.user.findFirst({
            where: { id: employee.userId, profile: { tenantId } },
            select: { id: true },
        });
        if (empUser)
            return empUser.id;
    }
    return null;
}
// GET /api/calls/pending - Recover active ringing incoming call for callee
exports.callRouter.get("/pending", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const now = Date.now();
        // 1. Check in-memory active calls first
        for (const [, session] of socket_1.activeCalls) {
            if (session.tenantId === tenantId &&
                session.targetUserId === userId &&
                session.status === "ringing" &&
                now - new Date(session.startedAt).getTime() < 60000) {
                return res.json({
                    success: true,
                    hasPendingCall: true,
                    data: {
                        callId: session.callId,
                        callerId: session.callerId,
                        callerName: session.callerName,
                        callerAvatar: session.callerAvatar,
                        callType: session.callType,
                        threadId: session.threadId,
                        startedAt: session.startedAt,
                        tenantId: session.tenantId,
                    },
                });
            }
        }
        // 2. Fallback to database CallHistoryRecord
        const sixtySecondsAgo = new Date(now - 60000);
        const pendingRecord = await db.callHistoryRecord.findFirst({
            where: {
                tenantId,
                receiverId: userId,
                status: "ringing",
                startedAt: { gte: sixtySecondsAgo },
            },
            orderBy: { startedAt: "desc" },
        });
        if (pendingRecord) {
            return res.json({
                success: true,
                hasPendingCall: true,
                data: {
                    callId: pendingRecord.callSessionId,
                    callerId: pendingRecord.callerId,
                    callerName: pendingRecord.callerName,
                    callerAvatar: pendingRecord.callerAvatarUrl,
                    callType: pendingRecord.callType,
                    threadId: pendingRecord.groupId,
                    startedAt: pendingRecord.startedAt,
                    tenantId: pendingRecord.tenantId,
                },
            });
        }
        return res.json({
            success: true,
            hasPendingCall: false,
            data: null,
        });
    }
    catch (error) {
        console.error("[CallRoutes] Pending call lookup error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to check pending calls" });
    }
});
// POST /api/calls/invite - Persistent Calls API invitation (REST fallback & serverless support)
exports.callRouter.post("/invite", auth_1.requireAuth, async (req, res) => {
    try {
        const callerId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const { targetUserId: rawTargetId, callType: rawCallType, callId: passedCallId, callerPhone, threadId } = req.body || {};
        const callType = rawCallType === "video" ? "video" : "audio";
        if (!rawTargetId) {
            return res.status(400).json({ success: false, error: "targetUserId is required" });
        }
        const resolvedTargetId = await resolveTargetUserId(tenantId, rawTargetId);
        if (!resolvedTargetId) {
            return res.status(403).json({ success: false, error: "Target user not found or not in your workspace." });
        }
        if (resolvedTargetId === callerId) {
            return res.status(400).json({ success: false, error: "Cannot call yourself." });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const now = Date.now();
        const sixtySecondsAgo = new Date(now - 60000);
        // Busy check: in-memory and database
        let busyUserId = null;
        for (const [, session] of socket_1.activeCalls) {
            if (session.tenantId === tenantId &&
                (session.status === "ringing" || session.status === "connected") &&
                (session.callerId === resolvedTargetId || session.targetUserId === resolvedTargetId ||
                    session.callerId === callerId || session.targetUserId === callerId)) {
                busyUserId = (session.callerId === resolvedTargetId || session.targetUserId === resolvedTargetId)
                    ? resolvedTargetId
                    : callerId;
                break;
            }
        }
        if (!busyUserId) {
            const activeDbCall = await db.callHistoryRecord.findFirst({
                where: {
                    tenantId,
                    status: { in: ["ringing", "connected"] },
                    startedAt: { gte: sixtySecondsAgo },
                    OR: [
                        { callerId: resolvedTargetId },
                        { receiverId: resolvedTargetId },
                        { callerId },
                        { receiverId: callerId },
                    ],
                },
            });
            if (activeDbCall) {
                busyUserId = (activeDbCall.callerId === resolvedTargetId || activeDbCall.receiverId === resolvedTargetId)
                    ? resolvedTargetId
                    : callerId;
            }
        }
        const callId = passedCallId || "call_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        if (busyUserId) {
            const busyPayload = {
                callId,
                targetUserId: resolvedTargetId,
                busyUserId,
                reason: busyUserId === resolvedTargetId
                    ? "User is currently on another call."
                    : "You are already in another call.",
            };
            const io = (0, socket_1.getIO)();
            if (busyUserId === resolvedTargetId) {
                const recipientNotice = {
                    ...busyPayload,
                    requestedBy: callerId,
                    requestedByName: req.user.email || "A colleague",
                    reason: "Another incoming call was blocked because you are already in a call.",
                };
                io?.to("user:" + resolvedTargetId).emit("call:busy", recipientNotice);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:busy", recipientNotice).catch(() => { });
            }
            return res.status(409).json({
                success: false,
                busy: true,
                busyUserId,
                error: busyPayload.reason,
            });
        }
        // Lookup caller and target profiles for display
        const [callerUser, targetUser] = await Promise.all([
            db.user.findUnique({ where: { id: callerId }, include: { profile: true } }),
            db.user.findUnique({ where: { id: resolvedTargetId }, include: { profile: true } }),
        ]);
        const callerName = callerUser?.profile?.fullName || callerUser?.email || "Colleague";
        const callerAvatar = callerUser?.profile?.avatarUrl || null;
        const targetName = targetUser?.profile?.fullName || targetUser?.email || "Colleague";
        const targetAvatar = targetUser?.profile?.avatarUrl || null;
        const finalThreadId = threadId || "direct_" + [callerId, resolvedTargetId].sort().join("_");
        // 1. Persist CallHistoryRecord with status "ringing"
        await db.callHistoryRecord.create({
            data: {
                tenantId,
                callSessionId: callId,
                callerId,
                callerName,
                callerPhone: callerPhone || "Internal Call",
                callerAvatarUrl: callerAvatar,
                receiverId: resolvedTargetId,
                receiverName: targetName,
                direction: "outgoing",
                callType: callType,
                status: "ringing",
                durationSeconds: 0,
                callTime: new Date(),
                startedAt: new Date(),
                groupId: finalThreadId,
                notes: "Initiated " + callType + " call via Persistent Calls API",
            },
        });
        // 2. Register in activeCalls with authoritative 60s timeout
        const session = {
            callId,
            tenantId,
            callerId,
            callerName,
            callerAvatar,
            targetUserId: resolvedTargetId,
            targetName,
            targetAvatar,
            callType: callType,
            threadId: finalThreadId,
            startedAt: new Date(),
            status: "ringing",
            timeoutTimer: setTimeout(async () => {
                const current = socket_1.activeCalls.get(callId);
                if (current && current.status === "ringing") {
                    socket_1.activeCalls.delete(callId);
                    const io = (0, socket_1.getIO)();
                    io?.to("user:" + current.targetUserId).emit("call:timeout", { callId, cancelledBy: "system" });
                    io?.to("user:" + current.callerId).emit("call:timeout", { callId, cancelledBy: "system" });
                    void pusher_service_1.PusherService.triggerUserEvent(current.tenantId, current.targetUserId, "call:timeout", { callId, cancelledBy: "system" }).catch(() => { });
                    void pusher_service_1.PusherService.triggerUserEvent(current.tenantId, current.callerId, "call:timeout", { callId, cancelledBy: "system" }).catch(() => { });
                    void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                        tenantId: current.tenantId,
                        targetUserId: current.targetUserId,
                        callId,
                        reason: "timeout",
                    }).catch(() => { });
                    await db.callHistoryRecord.updateMany({
                        where: { tenantId: current.tenantId, callSessionId: callId, status: "ringing" },
                        data: { status: "missed", endedAt: new Date(), notes: "Call timed out after 60 seconds." },
                    }).catch(() => { });
                }
            }, 60000),
        };
        socket_1.activeCalls.set(callId, session);
        // 3. Multi-Transport Outbox Dispatch (Socket.IO + Pusher + Web Push)
        const incomingPayload = {
            callId,
            callType,
            type: callType,
            callerId,
            fromUserId: callerId,
            callerName,
            callerPhone: callerPhone || "Internal Call",
            callerEmail: callerUser?.email,
            callerAvatar,
            callerAvatarUrl: callerAvatar,
            threadId: finalThreadId,
            tenantId,
            timestamp: new Date().toISOString(),
        };
        const io = (0, socket_1.getIO)();
        io?.to("user:" + resolvedTargetId).emit("call:incoming", incomingPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:incoming", incomingPayload).catch(() => { });
        void incoming_call_push_service_1.IncomingCallPushService.sendIncomingCallPush({
            tenantId,
            targetUserId: resolvedTargetId,
            callId,
            callerId,
            callerName,
            callerAvatar,
            callType: callType,
            threadId: finalThreadId,
        }).catch(() => { });
        return res.status(201).json({
            success: true,
            message: "Call initiated successfully",
            data: {
                callId,
                status: "ringing",
                targetUserId: resolvedTargetId,
                targetName,
                callType,
                threadId: finalThreadId,
            },
        });
    }
    catch (error) {
        console.error("[CallRoutes] Invite error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to initiate call" });
    }
});
// POST /api/calls/:callId/signal - HTTP WebRTC signaling relay fallback (Pusher + Socket)
exports.callRouter.post("/:callId/signal", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const { toUserId, signal } = req.body || {};
        if (!toUserId || !signal) {
            return res.status(400).json({ success: false, error: "toUserId and signal are required" });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const record = await db.callHistoryRecord.findFirst({
            where: { tenantId, callSessionId: callId },
        });
        if (!record) {
            return res.status(404).json({ success: false, error: "Call not found" });
        }
        const isParticipant = (record.callerId === userId && record.receiverId === toUserId) ||
            (record.receiverId === userId && record.callerId === toUserId);
        if (!isParticipant) {
            return res.status(403).json({ success: false, error: "Unauthorized call signaling peer" });
        }
        const signalPayload = {
            callId,
            fromUserId: userId,
            senderId: userId,
            signal,
        };
        const io = (0, socket_1.getIO)();
        io?.to("user:" + toUserId).emit("call:signal", signalPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, toUserId, "call:signal", signalPayload).catch(() => { });
        return res.json({ success: true, delivered: true });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to relay signal" });
    }
});
// GET /api/calls/:callId/status - Fetch authoritative call session state (memory + DB fallback)
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
        // 2. Fall back to persisted CallHistoryRecord (survives server restart and multi-instance deployments)
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const history = await db.callHistoryRecord.findFirst({
            where: {
                tenantId,
                callSessionId: callId,
            },
        });
        if (history) {
            const isParticipant = history.callerId === userId || history.receiverId === userId;
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: "Access denied: You are not a participant in this call." });
            }
            // Check if ringing call has timed out (> 60s)
            const now = Date.now();
            const started = history.startedAt ? new Date(history.startedAt).getTime() : now;
            const isRinging = history.status === "ringing";
            const isExpired = isRinging && now - started > 60000;
            const effectiveStatus = isExpired ? "missed" : history.status;
            if (isExpired && history.status === "ringing") {
                await db.callHistoryRecord.update({
                    where: { id: history.id },
                    data: { status: "missed", endedAt: new Date(), notes: "Call timed out after 60 seconds." },
                }).catch(() => { });
            }
            return res.json({
                success: true,
                data: {
                    callId,
                    status: effectiveStatus,
                    callType: history.callType,
                    callerId: history.callerId,
                    callerName: history.callerName,
                    callerAvatar: history.callerAvatarUrl,
                    targetUserId: history.receiverId,
                    targetName: history.receiverName,
                    startedAt: history.startedAt,
                    isPending: effectiveStatus === "ringing",
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
// POST /api/calls/:callId/accept - Authenticated ATOMIC call acceptance
exports.callRouter.post("/:callId/accept", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        // 1. Verify existence & designated recipient ownership before transition
        const currentRecord = await db.callHistoryRecord.findFirst({
            where: { tenantId, callSessionId: callId },
        });
        if (!currentRecord) {
            return res.status(404).json({ success: false, error: "Call session not found or already ended." });
        }
        if (currentRecord.receiverId !== userId) {
            return res.status(403).json({ success: false, error: "Only the designated recipient may accept this call." });
        }
        // 2. Validate timeout / expiration guardrail (60 seconds)
        const now = Date.now();
        const started = currentRecord.startedAt ? new Date(currentRecord.startedAt).getTime() : now;
        if (now - started > 60000) {
            await db.callHistoryRecord.updateMany({
                where: { tenantId, callSessionId: callId, status: "ringing" },
                data: { status: "missed", endedAt: new Date(), notes: "Call timed out after 60 seconds with no answer." },
            }).catch(() => { });
            return res.status(409).json({ success: false, error: "Call has timed out and expired." });
        }
        // 3. ATOMIC DATABASE-LEVEL STATE TRANSITION:
        // UPDATE CallHistoryRecord SET status = 'connected' WHERE tenantId = ? AND callSessionId = ? AND receiverId = ? AND status = 'ringing'
        const updateResult = await db.callHistoryRecord.updateMany({
            where: {
                tenantId,
                callSessionId: callId,
                receiverId: userId,
                status: "ringing",
            },
            data: {
                status: "connected",
            },
        });
        // 4. Concurrency Guard: If affected rows is 0, another device/request won the race or call is no longer ringing
        if (updateResult.count === 0) {
            const recheck = await db.callHistoryRecord.findFirst({ where: { tenantId, callSessionId: callId } });
            if (recheck?.status === "connected") {
                return res.status(409).json({
                    success: false,
                    error: "Call was already answered or accepted on another device.",
                    data: {
                        callId,
                        status: "connected",
                        threadId: recheck.groupId || undefined,
                    },
                });
            }
            return res.status(409).json({
                success: false,
                error: `Call cannot be accepted because it is in '${recheck?.status || "unknown"}' state.`,
            });
        }
        // 5. ATOMIC SUCCESS: Now and only now update in-memory session and emit signaling events
        let session = socket_1.activeCalls.get(callId);
        if (!session) {
            session = {
                callId,
                tenantId,
                callerId: currentRecord.callerId || "",
                callerName: currentRecord.callerName,
                callerAvatar: currentRecord.callerAvatarUrl,
                targetUserId: userId,
                targetName: currentRecord.receiverName,
                callType: currentRecord.callType || "audio",
                status: "connected",
                startedAt: currentRecord.startedAt,
                timeoutTimer: null,
            };
            socket_1.activeCalls.set(callId, session);
        }
        else {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "connected";
        }
        const io = (0, socket_1.getIO)();
        const acceptPayload = {
            callId,
            acceptedBy: userId,
            status: "connected",
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${session.callerId}`).emit("call:accepted", acceptPayload);
        io?.to(`user:${session.targetUserId}`).emit("call:accepted", acceptPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, session.callerId, "call:accepted", acceptPayload).catch(() => { });
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, session.targetUserId, "call:accepted", acceptPayload).catch(() => { });
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
// POST /api/calls/:callId/reject - Authenticated ATOMIC call rejection
exports.callRouter.post("/:callId/reject", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const { reason } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        // 1. Verify existence and recipient ownership
        const currentRecord = await db.callHistoryRecord.findFirst({
            where: { tenantId, callSessionId: callId },
        });
        if (!currentRecord) {
            return res.status(404).json({ success: false, error: "Call session not found or already ended." });
        }
        if (currentRecord.receiverId !== userId) {
            return res.status(403).json({ success: false, error: "Only the designated recipient may reject this call." });
        }
        // 2. ATOMIC DATABASE-LEVEL STATE TRANSITION:
        const updateResult = await db.callHistoryRecord.updateMany({
            where: {
                tenantId,
                callSessionId: callId,
                receiverId: userId,
                status: "ringing",
            },
            data: {
                status: "rejected",
                endedAt: new Date(),
                notes: reason || "Declined via REST",
            },
        });
        if (updateResult.count === 0) {
            const recheck = await db.callHistoryRecord.findFirst({ where: { tenantId, callSessionId: callId } });
            if (recheck?.status === "rejected") {
                return res.json({ success: true, message: "Call already rejected" });
            }
            return res.status(409).json({
                success: false,
                error: `Call cannot be rejected because it is in '${recheck?.status || "unknown"}' state.`,
            });
        }
        // 3. Clear memory and notify participants
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "ended";
            socket_1.activeCalls.delete(callId);
        }
        const io = (0, socket_1.getIO)();
        const rejectPayload = {
            callId,
            rejectedBy: userId,
            reason: reason || "declined",
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${currentRecord.callerId}`).emit("call:rejected", rejectPayload);
        io?.to(`user:${currentRecord.receiverId}`).emit("call:rejected", rejectPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, currentRecord.callerId, "call:rejected", rejectPayload).catch(() => { });
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, currentRecord.receiverId, "call:rejected", rejectPayload).catch(() => { });
        // Cancel persistent push notifications on all callee devices
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
// POST /api/calls/:callId/cancel - Caller ATOMIC cancellation
exports.callRouter.post("/:callId/cancel", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        // 1. Verify existence and caller ownership
        const currentRecord = await db.callHistoryRecord.findFirst({
            where: { tenantId, callSessionId: callId },
        });
        if (!currentRecord) {
            return res.status(404).json({ success: false, error: "Call session not found or already ended." });
        }
        if (currentRecord.callerId !== userId) {
            return res.status(403).json({ success: false, error: "Only the caller may cancel this call." });
        }
        // 2. ATOMIC DATABASE-LEVEL STATE TRANSITION:
        const updateResult = await db.callHistoryRecord.updateMany({
            where: {
                tenantId,
                callSessionId: callId,
                callerId: userId,
                status: "ringing",
            },
            data: {
                status: "cancelled",
                endedAt: new Date(),
                notes: "Cancelled via REST",
            },
        });
        if (updateResult.count === 0) {
            const recheck = await db.callHistoryRecord.findFirst({ where: { tenantId, callSessionId: callId } });
            if (recheck?.status === "cancelled") {
                return res.json({ success: true, message: "Call already cancelled" });
            }
            return res.status(409).json({
                success: false,
                error: `Call cannot be cancelled because it is in '${recheck?.status || "unknown"}' state.`,
            });
        }
        // 3. Clear memory and notify participants
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "ended";
            socket_1.activeCalls.delete(callId);
        }
        const io = (0, socket_1.getIO)();
        const cancelPayload = {
            callId,
            cancelledBy: userId,
            reason: "Caller cancelled",
            timestamp: new Date().toISOString(),
        };
        if (currentRecord.receiverId) {
            io?.to(`user:${currentRecord.receiverId}`).emit("call:cancelled", cancelPayload);
        }
        io?.to(`user:${currentRecord.callerId}`).emit("call:cancelled", cancelPayload);
        if (currentRecord.receiverId)
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, currentRecord.receiverId, "call:cancelled", cancelPayload).catch(() => { });
        if (currentRecord.receiverId) {
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                callId,
                tenantId,
                targetUserId: currentRecord.receiverId,
                reason: "Caller cancelled",
            }).catch(() => { });
        }
        return res.json({
            success: true,
            message: "Call cancelled successfully",
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to cancel call" });
    }
});
// POST /api/calls/:callId/end - Authenticated ATOMIC call termination (caller or receiver)
exports.callRouter.post("/:callId/end", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const { reason } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const currentRecord = await db.callHistoryRecord.findFirst({
            where: { tenantId, callSessionId: callId },
        });
        if (!currentRecord) {
            return res.status(404).json({ success: false, error: "Call session not found." });
        }
        if (currentRecord.callerId !== userId && currentRecord.receiverId !== userId) {
            return res.status(403).json({ success: false, error: "Only call participants may end this call." });
        }
        await db.callHistoryRecord.updateMany({
            where: {
                tenantId,
                callSessionId: callId,
                status: { in: ["ringing", "connected"] },
            },
            data: {
                status: "ended",
                endedAt: new Date(),
                notes: reason || "Ended",
            },
        });
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "ended";
            socket_1.activeCalls.delete(callId);
        }
        const io = (0, socket_1.getIO)();
        const endPayload = {
            callId,
            endedBy: userId,
            reason: reason || "ended",
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${currentRecord.callerId}`).emit("call:ended", endPayload);
        if (currentRecord.receiverId) {
            io?.to(`user:${currentRecord.receiverId}`).emit("call:ended", endPayload);
        }
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, currentRecord.callerId, "call:ended", endPayload).catch(() => { });
        if (currentRecord.receiverId) {
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, currentRecord.receiverId, "call:ended", endPayload).catch(() => { });
        }
        return res.json({
            success: true,
            message: "Call ended successfully",
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to end call" });
    }
});
