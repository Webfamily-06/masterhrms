"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../socket");
const prisma_1 = require("../prisma");
const incoming_call_push_service_1 = require("../services/incoming-call-push.service");
const pusher_service_1 = require("../services/pusher.service");
const meeting_sfu_service_1 = require("../services/meeting-sfu.service");
const call_lifecycle_service_1 = require("../services/call-lifecycle.service");
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
        // 2. Authoritative PostgreSQL Call model check
        const pendingCall = await db.call.findFirst({
            where: {
                tenantId,
                status: "RINGING",
                ringingExpiresAt: { gt: new Date() },
                participants: {
                    some: {
                        userId,
                        state: "RINGING",
                    },
                },
            },
            include: {
                participants: true,
            },
            orderBy: { startedAt: "desc" },
        });
        if (pendingCall) {
            const callerUser = await db.user.findUnique({
                where: { id: pendingCall.startedBy },
                include: { profile: true },
            });
            return res.json({
                success: true,
                hasPendingCall: true,
                data: {
                    callId: pendingCall.roomKey || pendingCall.id,
                    callerId: pendingCall.startedBy,
                    callerName: callerUser?.profile?.fullName || callerUser?.email || "Colleague",
                    callerAvatar: callerUser?.profile?.avatarUrl || null,
                    callType: pendingCall.media.toLowerCase(),
                    threadId: pendingCall.threadId,
                    startedAt: pendingCall.startedAt,
                    tenantId: pendingCall.tenantId,
                    dbCallId: pendingCall.id,
                },
            });
        }
        // 3. Fallback to database CallHistoryRecord
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
        // 1. Authoritative CallSession creation (Atomic Call, CallParticipant, CallEvent, CallHistoryRecord)
        let lifecycleSession = null;
        try {
            lifecycleSession = await call_lifecycle_service_1.CallLifecycleService.createCallSession({
                tenantId,
                callerId,
                callerName,
                callerPhone: callerPhone || "Internal Call",
                callerEmail: callerUser?.email,
                callerAvatarUrl: callerAvatar,
                targetUserId: resolvedTargetId,
                targetName,
                targetAvatarUrl: targetAvatar,
                callType,
                threadId: finalThreadId,
                roomKey: callId,
            });
        }
        catch (err) {
            console.warn("[CallRoutes] Lifecycle session creation fallback:", err.message);
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
                    groupId: finalThreadId ? (finalThreadId.length <= 36 ? finalThreadId : finalThreadId.substring(0, 36)) : null,
                    notes: "Initiated " + callType + " call via Persistent Calls API",
                },
            });
        }
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
            dbCallId: lifecycleSession?.call?.id || callId,
            historyRecordId: lifecycleSession?.historyRecord?.id,
            timeoutTimer: setTimeout(async () => {
                const current = socket_1.activeCalls.get(callId);
                if (current && current.status === "ringing") {
                    socket_1.activeCalls.delete(callId);
                    try {
                        await call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                            tenantId: current.tenantId,
                            callId: current.dbCallId || current.callId,
                            actorId: "SYSTEM",
                            endReason: "TIMEOUT",
                            finalHistoryStatus: "missed",
                            notes: "Call missed: 60-second ringing timeout expired.",
                        });
                    }
                    catch { }
                    const io = (0, socket_1.getIO)();
                    io?.to("user:" + current.targetUserId).emit("call:timeout", { callId, cancelledBy: "system" });
                    io?.to("user:" + current.targetUserId).emit("call.timeout", { callId, cancelledBy: "system" });
                    io?.to("user:" + current.callerId).emit("call:timeout", { callId, cancelledBy: "system" });
                    io?.to("user:" + current.callerId).emit("call.timeout", { callId, cancelledBy: "system" });
                    void pusher_service_1.PusherService.triggerUserEvent(current.tenantId, current.targetUserId, "call:timeout", { callId, cancelledBy: "system" }).catch(() => { });
                    void pusher_service_1.PusherService.triggerUserEvent(current.tenantId, current.callerId, "call:timeout", { callId, cancelledBy: "system" }).catch(() => { });
                    void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                        tenantId: current.tenantId,
                        targetUserId: current.targetUserId,
                        callId,
                        reason: "timeout",
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
        // 2. Authoritative PostgreSQL Call model
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const dbCall = await db.call.findFirst({
            where: {
                tenantId,
                OR: [{ id: callId }, { roomKey: callId }],
            },
            include: {
                participants: true,
            },
        });
        if (dbCall) {
            const isParticipant = dbCall.participants.some((p) => p.userId === userId);
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: "Access denied: You are not a participant in this call." });
            }
            // Check for ringing expiration (> 60s)
            const now = new Date();
            let effectiveStatus = dbCall.status;
            if (dbCall.status === "RINGING" && dbCall.ringingExpiresAt && now >= dbCall.ringingExpiresAt) {
                effectiveStatus = "MISSED";
                void call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                    tenantId,
                    callId: dbCall.id,
                    actorId: "SYSTEM",
                    endReason: "TIMEOUT",
                    finalHistoryStatus: "missed",
                    notes: "Call missed (ringing timeout expired)",
                }).catch(() => { });
            }
            const callerPart = dbCall.participants.find((p) => p.role === "HOST") || dbCall.participants[0];
            const calleePart = dbCall.participants.find((p) => p.role !== "HOST") || dbCall.participants[1];
            return res.json({
                success: true,
                data: {
                    callId: dbCall.roomKey || dbCall.id,
                    dbCallId: dbCall.id,
                    status: effectiveStatus.toLowerCase(),
                    callType: dbCall.media.toLowerCase(),
                    callerId: callerPart?.userId || dbCall.startedBy,
                    targetUserId: calleePart?.userId,
                    threadId: dbCall.threadId,
                    startedAt: dbCall.startedAt,
                    answeredAt: dbCall.answeredAt,
                    endedAt: dbCall.endedAt,
                    isPending: effectiveStatus === "RINGING",
                    participants: dbCall.participants.map((p) => ({
                        userId: p.userId,
                        role: p.role,
                        state: p.state,
                        joinedAt: p.joinedAt,
                        leftAt: p.leftAt,
                        reconnectGraceExpiresAt: p.reconnectGraceExpiresAt,
                    })),
                },
            });
        }
        // 3. Fall back to persisted CallHistoryRecord (survives server restart and legacy records)
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
        let acceptResult = null;
        try {
            acceptResult = await call_lifecycle_service_1.CallLifecycleService.acceptCallTransaction({
                tenantId,
                callId,
                calleeId: userId,
                deviceId: req.headers["x-device-id"] || "rest_client",
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallConflictError) {
                return res.status(409).json({
                    success: false,
                    error: "Call was already answered or accepted on another device.",
                    code: err.code,
                });
            }
            if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({
                    success: false,
                    error: err.message,
                    code: err.code,
                });
            }
            if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                return res.status(404).json({
                    success: false,
                    error: err.message,
                    code: err.code,
                });
            }
            throw err;
        }
        // Update in-memory session
        let session = socket_1.activeCalls.get(callId);
        if (session) {
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
            answeredAt: acceptResult.call.answeredAt,
            timestamp: new Date().toISOString(),
        };
        const callerId = acceptResult.call.startedBy;
        io?.to(`user:${callerId}`).emit("call:accepted", acceptPayload);
        io?.to(`user:${callerId}`).emit("call.accepted", acceptPayload);
        io?.to(`user:${userId}`).emit("call:accepted", acceptPayload);
        io?.to(`user:${userId}`).emit("call.accepted", acceptPayload);
        // Multi-tab/device suppression: tell other devices of callee that call was answered
        io?.to(`user:${userId}`).emit("call.answered_elsewhere", {
            callId,
            answeredDeviceId: "rest_client",
        });
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, callerId, "call:accepted", acceptPayload).catch(() => { });
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, userId, "call:accepted", acceptPayload).catch(() => { });
        return res.json({
            success: true,
            message: "Call accepted successfully",
            data: {
                callId,
                status: "connected",
                threadId: acceptResult.call.threadId,
                answeredAt: acceptResult.call.answeredAt,
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
        let rejectedCall = null;
        try {
            rejectedCall = await call_lifecycle_service_1.CallLifecycleService.rejectCallTransaction({
                tenantId,
                callId,
                calleeId: userId,
                reason: reason || "declined",
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                return res.status(404).json({ success: false, error: err.message, code: err.code });
            }
            throw err;
        }
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "ended";
            socket_1.activeCalls.delete(callId);
        }
        const callerId = rejectedCall.startedBy || session?.callerId;
        const io = (0, socket_1.getIO)();
        const rejectPayload = {
            callId,
            rejectedBy: userId,
            reason: reason || "declined",
            timestamp: new Date().toISOString(),
        };
        if (callerId) {
            io?.to(`user:${callerId}`).emit("call:rejected", rejectPayload);
            io?.to(`user:${callerId}`).emit("call.rejected", rejectPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, callerId, "call:rejected", rejectPayload).catch(() => { });
        }
        io?.to(`user:${userId}`).emit("call:rejected", rejectPayload);
        io?.to(`user:${userId}`).emit("call.rejected", rejectPayload);
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
        let cancelledCall = null;
        try {
            cancelledCall = await call_lifecycle_service_1.CallLifecycleService.cancelCallTransaction({
                tenantId,
                callId,
                callerId: userId,
                reason: "Caller cancelled",
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                return res.status(404).json({ success: false, error: err.message, code: err.code });
            }
            throw err;
        }
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
        const targetUserId = session?.targetUserId;
        if (targetUserId) {
            io?.to(`user:${targetUserId}`).emit("call:cancelled", cancelPayload);
            io?.to(`user:${targetUserId}`).emit("call.cancelled", cancelPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:cancelled", cancelPayload).catch(() => { });
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                callId,
                tenantId,
                targetUserId,
                reason: "Caller cancelled",
            }).catch(() => { });
        }
        io?.to(`user:${userId}`).emit("call:cancelled", cancelPayload);
        io?.to(`user:${userId}`).emit("call.cancelled", cancelPayload);
        return res.json({
            success: true,
            message: "Call cancelled successfully",
        });
    }
    catch (error) {
        console.error("[CallRoutes] Cancel error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to cancel call" });
    }
});
// POST /api/calls/:callId/end - Authenticated ATOMIC call termination (caller or receiver)
exports.callRouter.post("/:callId/end", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const { reason, durationSeconds: reqDuration } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        let termResult = null;
        try {
            termResult = await call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                tenantId,
                callId,
                actorId: userId,
                endReason: reason || "USER_HANGUP",
                finalHistoryStatus: "completed",
            });
        }
        catch (err) {
            console.warn("[CallRoutes] Terminate transaction warning:", err.message);
        }
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            if (session.reconnectTimers) {
                for (const t of session.reconnectTimers.values()) {
                    clearTimeout(t);
                }
                session.reconnectTimers.clear();
            }
            session.status = "ended";
            socket_1.activeCalls.delete(callId);
        }
        const durationSeconds = termResult?.durationSeconds !== undefined
            ? termResult.durationSeconds
            : Math.max(0, Math.round(Number(reqDuration) || 0));
        const io = (0, socket_1.getIO)();
        const endPayload = {
            callId,
            endedBy: userId,
            reason: reason || "ended",
            durationSeconds,
            timestamp: new Date().toISOString(),
        };
        if (session) {
            const peerId = session.callerId === userId ? session.targetUserId : session.callerId;
            io?.to(`user:${peerId}`).emit("call:ended", endPayload);
            io?.to(`user:${peerId}`).emit("call.ended", endPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:ended", endPayload).catch(() => { });
        }
        io?.to(`user:${userId}`).emit("call:ended", endPayload);
        io?.to(`user:${userId}`).emit("call.ended", endPayload);
        return res.json({
            success: true,
            message: "Call ended successfully",
            data: {
                callId,
                durationSeconds,
            },
        });
    }
    catch (error) {
        console.error("[CallRoutes] End error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to end call" });
    }
});
// POST /api/calls/:callId/reconnect - Restore JOINED state within 30s grace window
exports.callRouter.post("/:callId/reconnect", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        let reconnResult = null;
        try {
            reconnResult = await call_lifecycle_service_1.CallLifecycleService.reconnectParticipantTransaction({
                tenantId,
                callId,
                userId,
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallConflictError) {
                return res.status(409).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                return res.status(404).json({ success: false, error: err.message, code: err.code });
            }
            throw err;
        }
        const session = socket_1.activeCalls.get(callId);
        if (session && session.reconnectTimers?.has(userId)) {
            clearTimeout(session.reconnectTimers.get(userId));
            session.reconnectTimers.delete(userId);
        }
        const io = (0, socket_1.getIO)();
        const joinedPayload = {
            callId,
            userId,
            reconnected: true,
            timestamp: new Date().toISOString(),
        };
        if (session) {
            const peerId = session.callerId === userId ? session.targetUserId : session.callerId;
            io?.to(`user:${peerId}`).emit("call.participant.joined", joinedPayload);
            io?.to(`user:${peerId}`).emit("call:participant:joined", joinedPayload);
        }
        return res.json({
            success: true,
            message: "Reconnected successfully",
            data: {
                callId,
                participant: reconnResult.participant,
            },
        });
    }
    catch (error) {
        console.error("[CallRoutes] Reconnect error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to reconnect" });
    }
});
// POST /api/calls/:callId/invite-colleague - Phase C2 In-Call Colleague Invitation
exports.callRouter.post("/:callId/invite-colleague", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const { targetUserId } = req.body;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!targetUserId) {
            return res.status(400).json({ success: false, error: "targetUserId is required" });
        }
        const resolvedTargetId = await resolveTargetUserId(tenantId, targetUserId);
        if (!resolvedTargetId) {
            return res.status(403).json({
                success: false,
                error: "Colleague not found or belongs to another organization",
                code: "CALL_FORBIDDEN",
            });
        }
        let result;
        try {
            result = await call_lifecycle_service_1.CallLifecycleService.addParticipantToActiveCall({
                tenantId,
                callId,
                inviterId: userId,
                targetUserId: resolvedTargetId,
                maxParticipantsLimit: 5,
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallConflictError) {
                return res.status(409).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                return res.status(404).json({ success: false, error: err.message, code: err.code });
            }
            throw err;
        }
        const io = (0, socket_1.getIO)();
        const inviterName = req.user?.profile?.fullName || req.user?.name || "Colleague";
        const inviterAvatar = req.user?.profile?.avatarUrl || null;
        const incomingPayload = {
            callId,
            callerId: userId,
            callerName: inviterName,
            callerAvatar: inviterAvatar,
            callType: result.callType || "video",
            isAdditionalParticipant: true,
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${resolvedTargetId}`).emit("call:incoming", incomingPayload);
        io?.to(`user:${resolvedTargetId}`).emit("call.incoming", incomingPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:incoming", incomingPayload).catch(() => { });
        // Broadcast to call peers that a colleague has been invited
        const peerNotice = {
            callId,
            participant: result.participant,
            invitedUser: result.invitedUser,
        };
        io?.to(`user:${userId}`).emit("call:participant_invited", peerNotice);
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            const peerId = session.callerId === userId ? session.targetUserId : session.callerId;
            io?.to(`user:${peerId}`).emit("call:participant_invited", peerNotice);
            // Phase C3: Broadcast SFU upgrade for 3+ participant calls
            const sfuRoom = meeting_sfu_service_1.MeetingSfuService.formatCallRoomName(tenantId, callId);
            io?.to(`user:${userId}`).emit("call:upgrade_to_sfu", { callId, room: sfuRoom });
            if (session) {
                io?.to(`user:${peerId}`).emit("call:upgrade_to_sfu", { callId, room: sfuRoom });
            }
        }
        return res.json({
            success: true,
            message: "Colleague invited successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("[CallRoutes] Invite colleague error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to invite colleague" });
    }
});
// POST /api/calls/:callId/accept-invitation - Phase C2 In-Call Colleague Accept
exports.callRouter.post("/:callId/accept-invitation", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const deviceId = req.body?.deviceId || "default";
        let result;
        try {
            result = await call_lifecycle_service_1.CallLifecycleService.acceptParticipantInvitation({
                tenantId,
                callId,
                userId,
                deviceId,
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallConflictError) {
                return res.status(409).json({ success: false, error: err.message, code: err.code });
            }
            if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                return res.status(404).json({ success: false, error: err.message, code: err.code });
            }
            throw err;
        }
        const io = (0, socket_1.getIO)();
        const joinedPayload = {
            callId,
            userId,
            user: result.user,
            participant: result.participant,
            timestamp: new Date().toISOString(),
        };
        // Broadcast to other participants
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            io?.to(`user:${session.callerId}`).emit("call:participant_joined", joinedPayload);
            io?.to(`user:${session.targetUserId}`).emit("call:participant_joined", joinedPayload);
        }
        io?.to(`group_call_${callId}`).emit("call:participant_joined", joinedPayload);
        return res.json({
            success: true,
            message: "Invitation accepted",
            data: result,
        });
    }
    catch (error) {
        console.error("[CallRoutes] Accept invitation error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to accept invitation" });
    }
});
// POST /api/calls/:callId/sfu-token - Phase C3 Scoped LiveKit SFU Token for Active Calls
exports.callRouter.post("/:callId/sfu-token", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        // 1. Verify Call exists and belongs to user's tenant
        const call = await db.call.findFirst({
            where: {
                OR: [{ id: callId }, { roomKey: callId }],
                tenantId,
            },
            include: {
                participants: true,
            },
        });
        if (!call) {
            return res.status(404).json({
                success: false,
                error: "Call session not found or unauthorized.",
                code: "CALL_NOT_FOUND",
            });
        }
        if (call.status !== "ACTIVE" && call.status !== "RINGING") {
            return res.status(409).json({
                success: false,
                error: "Call session is not active.",
                code: "CALL_INACTIVE",
            });
        }
        // 2. Verify requesting user is an active participant or invitee
        const participant = call.participants.find((p) => p.userId === userId);
        if (!participant || !["JOINED", "INVITED", "RINGING"].includes(participant.state)) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You are not an active participant in this call.",
                code: "CALL_FORBIDDEN",
            });
        }
        // 3. Check if SFU is configured
        const sfuConfig = meeting_sfu_service_1.MeetingSfuService.getConfig();
        if (!sfuConfig.configured) {
            return res.status(200).json({
                success: true,
                data: {
                    configured: false,
                    provider: "livekit",
                    message: "LiveKit SFU credentials are not configured on this server.",
                    iceServers: meeting_sfu_service_1.MeetingSfuService.getIceServers(userId),
                },
            });
        }
        // 4. Resolve user display name and avatar
        const userRecord = await db.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        const displayName = userRecord?.profile?.fullName || req.user?.name || req.user?.email || "Colleague";
        const avatarUrl = userRecord?.profile?.avatarUrl;
        // 5. Generate short-lived scoped LiveKit token (15-min TTL)
        const tokenResult = meeting_sfu_service_1.MeetingSfuService.generateCallToken({
            tenantId,
            callId: call.id,
            userId,
            name: displayName,
            avatarUrl,
            isHost: call.startedBy === userId || participant.role === "HOST",
            ttlSeconds: 900,
        });
        return res.json({
            success: true,
            data: {
                configured: true,
                ...tokenResult,
            },
        });
    }
    catch (error) {
        console.error("[CallRoutes] SFU token generation error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to generate SFU token" });
    }
});
/**
 * GET /api/calls/ice-servers
 * Returns server-authoritative ICE servers (STUN + RFC 7635 ephemeral Coturn TURN credentials)
 * Scoped to the authenticated user for P2P direct calls and NAT traversal.
 */
exports.callRouter.get("/ice-servers", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || "anonymous";
        const iceServers = meeting_sfu_service_1.MeetingSfuService.getIceServers(userId);
        return res.json({
            success: true,
            data: {
                iceServers,
            },
        });
    }
    catch (error) {
        console.error("[CallRoutes] Error resolving ICE servers:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to resolve ICE servers",
        });
    }
});
/**
 * GET /api/calls/sfu-status
 * Safe diagnostics endpoint for administrators and frontends to verify
 * whether LiveKit SFU (self-hosted or LiveKit Cloud) is configured.
 * Strictly never exposes API keys or secrets.
 */
exports.callRouter.get("/sfu-status", auth_1.requireAuth, async (req, res) => {
    try {
        const diagnosticInfo = meeting_sfu_service_1.MeetingSfuService.getDiagnosticInfo();
        return res.json({
            success: true,
            data: diagnosticInfo,
        });
    }
    catch (error) {
        console.error("[CallRoutes] Error fetching SFU status:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch SFU status",
        });
    }
});
