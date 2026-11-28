"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../socket");
const prisma_1 = require("../prisma");
const incoming_call_push_service_1 = require("../services/incoming-call-push.service");
const pusher_service_1 = require("../services/pusher.service");
const webrtc_ice_service_1 = require("../services/webrtc-ice.service");
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
        if (!tenantId) {
            return res.json({ success: true, hasPendingCall: false, data: null });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const now = Date.now();
        // 1. Check in-memory active calls first (1:1 ringing or 3rd+ invited colleague)
        for (const [, session] of socket_1.activeCalls) {
            const isDirectCallee = session.targetUserId === userId &&
                session.status === "ringing" &&
                now - new Date(session.startedAt).getTime() < 60000;
            if (session.tenantId === tenantId && isDirectCallee) {
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
                        isAdditionalParticipant: false,
                    },
                });
            }
        }
        // 2. Authoritative PostgreSQL Call model check (covers both initial RINGING and in-call INVITED colleagues)
        const sixtySecondsAgo = new Date(now - 60000);
        const pendingCall = await db.call.findFirst({
            where: {
                tenantId,
                OR: [
                    {
                        status: "RINGING",
                        ringingExpiresAt: { gt: new Date() },
                        participants: {
                            some: {
                                userId,
                                state: { in: ["RINGING", "INVITED"] },
                            },
                        },
                    },
                    {
                        status: "ACTIVE",
                        startedAt: { gte: new Date(now - 3600000) },
                        participants: {
                            some: {
                                userId,
                                state: "INVITED",
                            },
                        },
                    },
                ],
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
                    isAdditionalParticipant: pendingCall.status === "ACTIVE",
                },
            });
        }
        // 3. Fallback to database CallHistoryRecord
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
                    isAdditionalParticipant: false,
                },
            });
        }
        // 4. Check active group call invitations (last 60s)
        for (const [, grpSession] of socket_1.activeGroupCalls) {
            if (grpSession.tenantId === tenantId &&
                grpSession.invitedUserIds.has(userId) &&
                !grpSession.participants.has(userId) &&
                now - new Date(grpSession.startedAt).getTime() < 60000) {
                const host = grpSession.participants.get(grpSession.creatorId);
                return res.json({
                    success: true,
                    hasPendingCall: false,
                    hasPendingGroupCall: true,
                    groupCallData: {
                        groupId: grpSession.groupId,
                        groupName: grpSession.groupName || "Group Meeting",
                        groupAvatarUrl: grpSession.groupAvatarUrl || null,
                        callId: grpSession.callId,
                        callType: grpSession.callType,
                        callerId: grpSession.creatorId,
                        callerName: host?.name || "Colleague",
                        callerAvatar: host?.avatar || null,
                    },
                    data: null,
                });
            }
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
        // Idempotency guard: if Socket.IO `call:invite` already registered this exact `callId`, do not create a duplicate DB session
        if (passedCallId) {
            const existingActive = socket_1.activeCalls.get(passedCallId);
            if (existingActive && existingActive.tenantId === tenantId && existingActive.callerId === callerId) {
                return res.status(200).json({
                    success: true,
                    deduplicated: true,
                    callId: passedCallId,
                    status: existingActive.status,
                });
            }
            const existingHistory = await db.callHistoryRecord.findFirst({
                where: { tenantId, callSessionId: passedCallId },
                select: { id: true, status: true },
            });
            if (existingHistory) {
                return res.status(200).json({
                    success: true,
                    deduplicated: true,
                    callId: passedCallId,
                    status: existingHistory.status,
                });
            }
        }
        const callId = passedCallId || "call_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
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
        // 1. Authoritative CallSession creation (Atomic Call, CallParticipant, CallEvent, CallHistoryRecord).
        // The lifecycle service reaps zombie sessions (lost hang-ups / frozen serverless timers) and then performs
        // the authoritative database busy check. In-memory registries are NOT trusted for busy detection because
        // serverless instances never share or expire them reliably.
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
            if (err instanceof call_lifecycle_service_1.CallConflictError) {
                const busyUserId = /You are already/i.test(err.message) ? callerId : resolvedTargetId;
                const busyPayload = {
                    callId,
                    targetUserId: resolvedTargetId,
                    busyUserId,
                    reason: err.message,
                };
                if (busyUserId === resolvedTargetId) {
                    const recipientNotice = {
                        ...busyPayload,
                        requestedBy: callerId,
                        requestedByName: callerName,
                        reason: "Another incoming call was blocked because you are already in a call.",
                    };
                    (0, socket_1.getIO)()?.to("user:" + resolvedTargetId).emit("call:busy", recipientNotice);
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:busy", recipientNotice).catch(() => { });
                }
                return res.status(409).json({
                    success: false,
                    busy: true,
                    busyUserId,
                    error: err.message,
                });
            }
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
// POST /api/calls/:callId/signal - HTTP WebRTC signaling relay fallback (Pusher + Socket, 1:1 & Mesh)
exports.callRouter.post("/:callId/signal", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const rawToUserId = req.body?.toUserId || req.body?.targetUserId;
        const signal = req.body?.signal;
        if (!rawToUserId || !signal) {
            return res.status(400).json({ success: false, error: "toUserId and signal are required" });
        }
        const toUserId = (await resolveTargetUserId(tenantId, String(rawToUserId))) || String(rawToUserId);
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        let authorized = false;
        // 1. Check in-memory active call session (supports 1:1 + 3rd+ mesh peers)
        const liveSession = socket_1.activeCalls.get(callId);
        if (liveSession && liveSession.tenantId === tenantId) {
            const pids = (0, socket_1.getActiveCallParticipantIds)(liveSession);
            if (pids.includes(userId) && pids.includes(toUserId)) {
                authorized = true;
            }
        }
        // 2. Check authoritative PostgreSQL Call + CallParticipant rows
        if (!authorized) {
            const dbCall = await db.call.findFirst({
                where: {
                    tenantId,
                    OR: [{ id: callId }, { roomKey: callId }],
                },
                include: { participants: true },
            });
            if (dbCall) {
                const validStates = new Set(["RINGING", "INVITED", "JOINED", "RECONNECTING"]);
                const hasSender = dbCall.participants.some((p) => p.userId === userId && validStates.has(p.state));
                const hasTarget = dbCall.participants.some((p) => p.userId === toUserId && validStates.has(p.state));
                if (hasSender && hasTarget)
                    authorized = true;
            }
        }
        // 3. Fallback to CallHistoryRecord
        if (!authorized) {
            const record = await db.callHistoryRecord.findFirst({
                where: { tenantId, callSessionId: callId },
            });
            if (record &&
                ((record.callerId === userId && record.receiverId === toUserId) ||
                    (record.receiverId === userId && record.callerId === toUserId))) {
                authorized = true;
            }
        }
        // 4. Check activeGroupCalls if called with a group meeting callId
        if (!authorized) {
            const grp = socket_1.activeGroupCalls.get(callId);
            if (grp && grp.tenantId === tenantId) {
                const hasSender = grp.participants.has(userId) || grp.invitedUserIds.has(userId);
                const hasTarget = grp.participants.has(toUserId) || grp.invitedUserIds.has(toUserId);
                if (hasSender && hasTarget)
                    authorized = true;
            }
        }
        if (!authorized) {
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
// POST /api/calls/:callId/media-state - HTTP media state sync (screen-share, video-off, audio-mute, call-hold)
exports.callRouter.post("/:callId/media-state", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const { type = "screen-share", active = false, targetUserId } = req.body || {};
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const recipientIds = new Set();
        const actorUser = await db.user
            .findUnique({ where: { id: userId }, include: { profile: true } })
            .catch(() => null);
        const fromUserName = actorUser?.profile?.fullName ||
            req.user?.profile?.fullName ||
            req.user?.name ||
            actorUser?.email ||
            "Colleague";
        const liveSession = socket_1.activeCalls.get(callId);
        if (liveSession && liveSession.tenantId === tenantId) {
            const pids = (0, socket_1.getActiveCallParticipantIds)(liveSession);
            if (!pids.includes(userId)) {
                return res.status(403).json({ success: false, error: "Not a participant in this call" });
            }
            for (const id of pids) {
                if (id !== userId)
                    recipientIds.add(id);
            }
        }
        else {
            const dbCall = await db.call.findFirst({
                where: {
                    tenantId,
                    OR: [{ id: callId }, { roomKey: callId }, { roomKey: `group_meeting:${callId}` }],
                },
                include: { participants: true },
            });
            if (dbCall && dbCall.participants.some((p) => p.userId === userId)) {
                for (const p of dbCall.participants) {
                    if (p.userId !== userId && ["JOINED", "RINGING", "INVITED", "RECONNECTING"].includes(p.state)) {
                        recipientIds.add(p.userId);
                    }
                }
            }
            else {
                const hist = await db.callHistoryRecord.findFirst({ where: { tenantId, callSessionId: callId } }).catch(() => null);
                if (!hist || (hist.callerId !== userId && hist.receiverId !== userId)) {
                    return res.status(403).json({ success: false, error: "Call not found or unauthorized" });
                }
                const peer = hist.callerId === userId ? hist.receiverId : hist.callerId;
                if (peer)
                    recipientIds.add(peer);
            }
        }
        const targets = targetUserId && recipientIds.has(targetUserId) ? [targetUserId] : Array.from(recipientIds);
        const mediaPayload = {
            callId,
            type,
            active: Boolean(active),
            fromUserId: userId,
            fromUserName,
        };
        const io = (0, socket_1.getIO)();
        for (const pid of targets) {
            io?.to(`user:${pid}`).emit("call:media-state", mediaPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, pid, "call:media-state", mediaPayload).catch(() => { });
        }
        return res.json({ success: true, delivered: targets.length });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to sync media state" });
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
            const pids = (0, socket_1.getActiveCallParticipantIds)(liveSession);
            const isParticipant = pids.includes(userId);
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
// POST /api/calls/:callId/accept - Authenticated ATOMIC call acceptance (supports 1:1 & 3rd+ invited peer)
exports.callRouter.post("/:callId/accept", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const deviceId = req.headers["x-device-id"] || "rest_client";
        let acceptResult = null;
        let isAdditionalParticipantJoin = false;
        try {
            acceptResult = await call_lifecycle_service_1.CallLifecycleService.acceptCallTransaction({
                tenantId,
                callId,
                calleeId: userId,
                deviceId,
            });
        }
        catch (err) {
            if (err instanceof call_lifecycle_service_1.CallConflictError && err.message === "CALL_ALREADY_ANSWERED_OR_ENDED") {
                // Check if this user is an INVITED 3rd+ participant on an already ACTIVE call
                try {
                    acceptResult = await call_lifecycle_service_1.CallLifecycleService.acceptParticipantInvitation({
                        tenantId,
                        callId,
                        userId,
                        deviceId,
                    });
                    isAdditionalParticipantJoin = true;
                }
                catch (inviteErr) {
                    return res.status(409).json({
                        success: false,
                        error: "Call was already answered or accepted on another device.",
                        code: inviteErr.code || err.code,
                    });
                }
            }
            else if (err instanceof call_lifecycle_service_1.CallConflictError) {
                return res.status(409).json({
                    success: false,
                    error: "Call was already answered or accepted on another device.",
                    code: err.code,
                });
            }
            else if (err instanceof call_lifecycle_service_1.CallForbiddenError) {
                return res.status(403).json({
                    success: false,
                    error: err.message,
                    code: err.code,
                });
            }
            else if (err instanceof call_lifecycle_service_1.CallNotFoundError) {
                // Legacy / degraded sessions that only exist as a CallHistoryRecord: still connect the call so
                // the caller receives `call:accepted` and starts WebRTC negotiation instead of hanging forever.
                const db = prisma_1.rawPrisma || prisma_1.prisma;
                const hist = await db.callHistoryRecord
                    .findFirst({ where: { tenantId, callSessionId: callId } })
                    .catch(() => null);
                if (!hist || hist.receiverId !== userId || !["ringing", "connected"].includes(String(hist.status))) {
                    return res.status(404).json({
                        success: false,
                        error: err.message,
                        code: err.code,
                    });
                }
                const answeredAt = new Date();
                await db.callHistoryRecord
                    .update({ where: { id: hist.id }, data: { status: "connected", answeredAt } })
                    .catch(() => db.callHistoryRecord.update({ where: { id: hist.id }, data: { status: "connected" } }).catch(() => { }));
                acceptResult = { call: { startedBy: hist.callerId, answeredAt, threadId: hist.groupId } };
            }
            else {
                throw err;
            }
        }
        const io = (0, socket_1.getIO)();
        const session = socket_1.activeCalls.get(callId);
        if (isAdditionalParticipantJoin) {
            if (session) {
                if (!session.extraParticipantIds)
                    session.extraParticipantIds = new Set();
                session.extraParticipantIds.add(userId);
            }
            const joinedPayload = {
                callId,
                userId,
                user: acceptResult.user,
                participant: acceptResult.participant,
                activeParticipants: acceptResult.activeParticipants || [],
                timestamp: new Date().toISOString(),
            };
            const targetIds = new Set([userId]);
            if (session) {
                for (const id of (0, socket_1.getActiveCallParticipantIds)(session))
                    targetIds.add(id);
            }
            if (Array.isArray(acceptResult.activeParticipants)) {
                for (const p of acceptResult.activeParticipants) {
                    if (p?.userId)
                        targetIds.add(p.userId);
                }
            }
            for (const pid of targetIds) {
                io?.to(`user:${pid}`).emit("call:participant_joined", joinedPayload);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, pid, "call:participant_joined", joinedPayload).catch(() => { });
            }
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                tenantId,
                targetUserId: userId,
                callId,
                reason: "accepted",
            }).catch(() => { });
            return res.json({
                success: true,
                message: "Joined active call successfully",
                data: {
                    callId,
                    status: "connected",
                    isAdditionalParticipant: true,
                    activeParticipants: acceptResult.activeParticipants || [],
                },
            });
        }
        // Update in-memory session for 1:1 call
        if (session) {
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "connected";
        }
        const acceptPayload = {
            callId,
            acceptedBy: userId,
            status: "connected",
            answeredAt: acceptResult.call.answeredAt,
            timestamp: new Date().toISOString(),
        };
        const callerId = acceptResult.call.startedBy || session?.callerId;
        if (callerId) {
            io?.to(`user:${callerId}`).emit("call:accepted", acceptPayload);
            io?.to(`user:${callerId}`).emit("call.accepted", acceptPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, callerId, "call:accepted", acceptPayload).catch(() => { });
        }
        io?.to(`user:${userId}`).emit("call:accepted", acceptPayload);
        io?.to(`user:${userId}`).emit("call.accepted", acceptPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, userId, "call:accepted", acceptPayload).catch(() => { });
        // Multi-tab/device suppression: tell other devices of callee that call was answered
        io?.to(`user:${userId}`).emit("call.answered_elsewhere", {
            callId,
            answeredDeviceId: deviceId,
        });
        void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
            tenantId,
            targetUserId: userId,
            callId,
            reason: "accepted",
        }).catch(() => { });
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
        if (!tenantId) {
            return res.status(403).json({ error: "Tenant context required." });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        // Check if rejecting an in-call 3rd+ invitation on an ACTIVE call (do NOT terminate the active call!)
        const existingDbCall = await db.call.findFirst({
            where: { tenantId, OR: [{ id: callId }, { roomKey: callId }] },
            include: { participants: true },
        });
        if (existingDbCall && existingDbCall.status === "ACTIVE") {
            await db.callParticipant.updateMany({
                where: { callId: existingDbCall.id, userId },
                data: { state: "DECLINED", leftAt: new Date(), leaveReason: reason || "declined" },
            });
            const session = socket_1.activeCalls.get(callId);
            session?.extraParticipantIds?.delete(userId);
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                callId,
                tenantId,
                targetUserId: userId,
                reason: "declined",
            }).catch(() => { });
            return res.json({ success: true, message: "Call invitation declined" });
        }
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
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        // Resolve every peer from the authoritative database BEFORE state changes (serverless instances do not
        // share the in-memory registry, so relying on it meant callees were never told the caller hung up).
        const peerTargetSet = new Set();
        const session = socket_1.activeCalls.get(callId);
        if (session && session.tenantId === tenantId) {
            for (const id of (0, socket_1.getActiveCallParticipantIds)(session))
                if (id !== userId)
                    peerTargetSet.add(id);
        }
        const dbCallBefore = await db.call
            .findFirst({ where: { tenantId, OR: [{ id: callId }, { roomKey: callId }] }, include: { participants: true } })
            .catch(() => null);
        if (dbCallBefore) {
            for (const p of dbCallBefore.participants) {
                if (p.userId !== userId && ["JOINED", "RINGING", "INVITED", "RECONNECTING"].includes(p.state))
                    peerTargetSet.add(p.userId);
            }
        }
        else {
            const hist = await db.callHistoryRecord.findFirst({ where: { tenantId, callSessionId: callId } }).catch(() => null);
            if (hist) {
                if (hist.callerId && hist.callerId !== userId)
                    peerTargetSet.add(hist.callerId);
                if (hist.receiverId && hist.receiverId !== userId)
                    peerTargetSet.add(hist.receiverId);
                if (hist.status === "ringing" || hist.status === "connected") {
                    await db.callHistoryRecord
                        .update({ where: { id: hist.id }, data: { status: "cancelled", endedAt: new Date() } })
                        .catch(() => { });
                }
            }
        }
        const peerTargets = Array.from(peerTargetSet);
        let cancelledCall = null;
        let terminatedActiveCall = false;
        const actorUser = await db.user
            .findUnique({ where: { id: userId }, include: { profile: true } })
            .catch(() => null);
        const endedByName = actorUser?.profile?.fullName ||
            actorUser?.email ||
            req.user?.name ||
            "Colleague";
        if (dbCallBefore) {
            if (dbCallBefore.status === "ACTIVE") {
                terminatedActiveCall = true;
                await call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                    tenantId,
                    callId,
                    actorId: userId,
                    endReason: "USER_HANGUP",
                    finalHistoryStatus: "completed",
                }).catch(() => { });
            }
            else {
                try {
                    cancelledCall = await call_lifecycle_service_1.CallLifecycleService.cancelCallTransaction({
                        tenantId,
                        callId,
                        callerId: userId,
                        reason: "Caller cancelled",
                    });
                }
                catch (err) {
                    if (err instanceof call_lifecycle_service_1.CallForbiddenError && !peerTargets.length) {
                        return res.status(403).json({ success: false, error: err.message, code: err.code });
                    }
                    // Call already answered (ACTIVE) or otherwise not cancellable: terminate it instead so both sides close cleanly.
                    terminatedActiveCall = true;
                    await call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                        tenantId,
                        callId,
                        actorId: userId,
                        endReason: "USER_HANGUP",
                        finalHistoryStatus: "completed",
                    }).catch(() => { });
                }
            }
        }
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
            cancelledByName: endedByName,
            endedBy: userId,
            endedByName,
            reason: terminatedActiveCall ? "ended" : "Caller cancelled",
            timestamp: new Date().toISOString(),
        };
        const endPayload = {
            callId,
            endedBy: userId,
            endedByName,
            reason: "ended",
            timestamp: new Date().toISOString(),
        };
        for (const targetUserId of peerTargets) {
            io?.to(`user:${targetUserId}`).emit("call:cancelled", cancelPayload);
            io?.to(`user:${targetUserId}`).emit("call.cancelled", cancelPayload);
            io?.to(`user:${targetUserId}`).emit("call:ended", endPayload);
            io?.to(`user:${targetUserId}`).emit("call.ended", endPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:cancelled", cancelPayload).catch(() => { });
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:ended", endPayload).catch(() => { });
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
        if (!tenantId) {
            return res.status(403).json({ error: "Tenant context required." });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const actorUser = await db.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        }).catch(() => null);
        const endedByName = actorUser?.profile?.fullName || actorUser?.email || req.user?.name || "Colleague";
        // Gather all call participants BEFORE termination so everyone receives call:ended even across serverless instances
        const recipientIds = new Set();
        const session = socket_1.activeCalls.get(callId);
        if (session && session.tenantId === tenantId) {
            for (const id of (0, socket_1.getActiveCallParticipantIds)(session)) {
                if (id !== userId)
                    recipientIds.add(id);
            }
        }
        const dbCallBefore = await db.call.findFirst({
            where: { tenantId, OR: [{ id: callId }, { roomKey: callId }] },
            include: { participants: true },
        }).catch(() => null);
        if (dbCallBefore) {
            for (const p of dbCallBefore.participants) {
                if (p.userId !== userId && ["JOINED", "RINGING", "INVITED", "RECONNECTING"].includes(p.state)) {
                    recipientIds.add(p.userId);
                }
            }
        }
        else if (recipientIds.size === 0) {
            const hist = await db.callHistoryRecord.findFirst({
                where: { tenantId, callSessionId: callId },
            }).catch(() => null);
            if (hist) {
                if (hist.callerId && hist.callerId !== userId)
                    recipientIds.add(hist.callerId);
                if (hist.receiverId && hist.receiverId !== userId)
                    recipientIds.add(hist.receiverId);
            }
        }
        const io = (0, socket_1.getIO)();
        // If 3+ participants are in the call and an extra non-host participant leaves while >=2 remain, keep call alive
        const isHost = (session && session.callerId === userId) || (dbCallBefore && dbCallBefore.startedBy === userId);
        if (!isHost && recipientIds.size >= 2) {
            session?.extraParticipantIds?.delete(userId);
            if (dbCallBefore) {
                await db.callParticipant.updateMany({
                    where: { callId: dbCallBefore.id, userId },
                    data: { state: "LEFT", leftAt: new Date(), leaveReason: "PARTICIPANT_LEFT" },
                }).catch(() => { });
            }
            const leftPayload = {
                callId,
                userId,
                userName: endedByName,
                timestamp: new Date().toISOString(),
            };
            for (const peerId of recipientIds) {
                io?.to(`user:${peerId}`).emit("call:participant_left", leftPayload);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:participant_left", leftPayload).catch(() => { });
            }
            return res.json({
                success: true,
                message: "Left call successfully",
                data: { callId, leftOnly: true },
            });
        }
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
        const endPayload = {
            callId,
            endedBy: userId,
            endedByName,
            reason: reason || "ended",
            durationSeconds,
            timestamp: new Date().toISOString(),
        };
        for (const peerId of recipientIds) {
            io?.to(`user:${peerId}`).emit("call:ended", endPayload);
            io?.to(`user:${peerId}`).emit("call.ended", endPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:ended", endPayload).catch(() => { });
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call.ended", endPayload).catch(() => { });
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                callId,
                tenantId,
                targetUserId: peerId,
                reason: "ended",
            }).catch(() => { });
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
            for (const peerId of (0, socket_1.getActiveCallParticipantIds)(session)) {
                if (peerId !== userId) {
                    io?.to(`user:${peerId}`).emit("call.participant.joined", joinedPayload);
                    io?.to(`user:${peerId}`).emit("call:participant:joined", joinedPayload);
                }
            }
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
// POST /api/calls/:callId/heartbeat - Participant liveness (direct calls & group meetings) for
// serverless-safe busy detection and zombie session reaping.
exports.callRouter.post("/:callId/heartbeat", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const result = await call_lifecycle_service_1.CallLifecycleService.recordHeartbeat({ tenantId, callId, userId });
        return res.json({ success: true, ...result });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to record heartbeat" });
    }
});
// POST /api/calls/:callId/invite-colleague - In-Call Colleague Direct Ringing (WebRTC P2P Mesh)
exports.callRouter.post("/:callId/invite-colleague", auth_1.requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const { targetUserId } = req.body;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: "Tenant context required." });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
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
                maxParticipantsLimit: 6,
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
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (!session.extraParticipantIds)
                session.extraParticipantIds = new Set();
            session.extraParticipantIds.add(resolvedTargetId);
        }
        const inviterUser = await db.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        }).catch(() => null);
        const inviterName = inviterUser?.profile?.fullName ||
            req.user?.profile?.fullName ||
            req.user?.name ||
            inviterUser?.email ||
            "Colleague";
        const inviterAvatar = inviterUser?.profile?.avatarUrl || req.user?.profile?.avatarUrl || null;
        const resolvedCallType = result.callType === "video" ? "video" : "audio";
        const io = (0, socket_1.getIO)();
        const incomingPayload = {
            callId,
            callerId: userId,
            fromUserId: userId,
            callerName: inviterName,
            callerAvatar: inviterAvatar,
            callerAvatarUrl: inviterAvatar,
            callType: resolvedCallType,
            type: resolvedCallType,
            isAdditionalParticipant: true,
            tenantId,
            timestamp: new Date().toISOString(),
        };
        io?.to(`user:${resolvedTargetId}`).emit("call:incoming", incomingPayload);
        io?.to(`user:${resolvedTargetId}`).emit("call.incoming", incomingPayload);
        void pusher_service_1.PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:incoming", incomingPayload).catch(() => { });
        void incoming_call_push_service_1.IncomingCallPushService.sendIncomingCallPush({
            tenantId,
            targetUserId: resolvedTargetId,
            callId,
            callerId: userId,
            callerName: inviterName,
            callerAvatar: inviterAvatar,
            callType: resolvedCallType,
        }).catch(() => { });
        // Broadcast to all existing call peers that a colleague has been invited
        const peerNotice = {
            callId,
            participant: result.participant,
            invitedUser: result.invitedUser,
        };
        const existingPeers = session ? (0, socket_1.getActiveCallParticipantIds)(session) : [userId];
        for (const pid of existingPeers) {
            if (pid !== resolvedTargetId) {
                io?.to(`user:${pid}`).emit("call:participant_invited", peerNotice);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, pid, "call:participant_invited", peerNotice).catch(() => { });
            }
        }
        return res.json({
            success: true,
            message: "Colleague invited and ringing",
            data: result,
        });
    }
    catch (error) {
        console.error("[CallRoutes] Invite colleague error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to invite colleague" });
    }
});
// POST /api/calls/:callId/accept-invitation - In-Call Colleague Accept (WebRTC P2P Mesh)
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
        const session = socket_1.activeCalls.get(callId);
        if (session) {
            if (!session.extraParticipantIds)
                session.extraParticipantIds = new Set();
            session.extraParticipantIds.add(userId);
        }
        const io = (0, socket_1.getIO)();
        const joinedPayload = {
            callId,
            userId,
            user: result.user,
            participant: result.participant,
            activeParticipants: result.activeParticipants || [],
            timestamp: new Date().toISOString(),
        };
        const targetIds = new Set([userId]);
        if (session) {
            for (const id of (0, socket_1.getActiveCallParticipantIds)(session))
                targetIds.add(id);
        }
        if (Array.isArray(result.activeParticipants)) {
            for (const p of result.activeParticipants) {
                if (p?.userId)
                    targetIds.add(p.userId);
            }
        }
        for (const pid of targetIds) {
            io?.to(`user:${pid}`).emit("call:participant_joined", joinedPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, pid, "call:participant_joined", joinedPayload).catch(() => { });
        }
        io?.to(`group_call_${callId}`).emit("call:participant_joined", joinedPayload);
        void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
            tenantId,
            targetUserId: userId,
            callId,
            reason: "accepted",
        }).catch(() => { });
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
/**
 * GET /api/calls/ice-servers
 * Returns free public STUN ICE servers (no TURN relay, no third-party provider)
 * Scoped to the authenticated user for WebRTC P2P & Mesh calls.
 */
exports.callRouter.get("/ice-servers", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || "anonymous";
        const iceServers = webrtc_ice_service_1.WebRtcIceService.getIceServers(userId);
        return res.json({
            success: true,
            data: {
                iceServers,
                mode: "webrtc_mesh",
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
