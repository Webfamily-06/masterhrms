"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeGroupCalls = exports.activeCalls = void 0;
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.getOnlineUsersForTenant = getOnlineUsersForTenant;
exports.broadcastToTenant = broadcastToTenant;
exports.broadcastToUser = broadcastToUser;
exports.broadcastToPlatform = broadcastToPlatform;
exports.broadcastToAll = broadcastToAll;
const socket_io_1 = require("socket.io");
const prisma_1 = require("./prisma");
const tenant_context_1 = require("./context/tenant-context");
const jwt_1 = require("./lib/jwt");
const workspace_policy_service_1 = require("./services/workspace-policy.service");
const chat_system_events_service_1 = require("./services/chat-system-events.service");
const notification_service_1 = require("./services/notification.service");
const pusher_service_1 = require("./services/pusher.service");
const incoming_call_push_service_1 = require("./services/incoming-call-push.service");
let ioInstance = null;
const tenantPresence = new Map();
exports.activeCalls = new Map();
exports.activeGroupCalls = new Map();
function initSocket(server, allowedOrigins) {
    ioInstance = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
                    return callback(null, true);
                }
                return callback(new Error("Origin not allowed"));
            },
            credentials: true,
        },
    });
    ioInstance.use(async (socket, next) => {
        try {
            const identity = (0, jwt_1.verifyToken)(socket.handshake.auth?.token || "");
            if (identity.mfaPending)
                throw new Error("Complete two-factor verification");
            const user = await prisma_1.prisma.user.findUnique({ where: { id: identity.userId }, include: { profile: true, roles: true } });
            if (!user)
                throw new Error("Account not found");
            const isSuper = user.roles.some((role) => role.role === "super_admin");
            const tenantId = isSuper ? (identity.tenantId || null) : (user.profile?.tenantId || null);
            if (!isSuper && !tenantId)
                throw new Error("Workspace context required");
            let policy = null;
            if (tenantId) {
                policy = await (0, workspace_policy_service_1.getWorkspacePolicy)(tenantId);
                if (!isSuper)
                    (0, workspace_policy_service_1.assertWorkspaceActive)(policy);
            }
            const tokenExpiry = Number(identity.exp) * 1000;
            const expiry = !isSuper && policy?.expiresAt ? Math.min(tokenExpiry, new Date(policy.expiresAt).getTime()) : tokenExpiry;
            socket.data = { tenantId, userId: user.id, name: user.profile?.fullName || user.email, avatar: user.profile?.avatarUrl, isSuper, expiry };
            next();
        }
        catch {
            next(new Error("Workspace authentication required"));
        }
    });
    ioInstance.on("connection", (socket) => {
        console.log(`⚡ [WebSocket] Client connected: ${socket.id}`);
        if (socket.data.isSuper) {
            socket.join("platform:admin");
        }
        if (socket.data.tenantId) {
            socket.join(`tenant:${socket.data.tenantId}`);
            const tId = socket.data.tenantId;
            const uId = socket.data.userId;
            if (uId) {
                if (!tenantPresence.has(tId)) {
                    tenantPresence.set(tId, new Map());
                }
                const tenantMap = tenantPresence.get(tId);
                const prev = tenantMap.get(uId) || 0;
                tenantMap.set(uId, prev + 1);
                if (prev === 0) {
                    ioInstance?.to(`tenant:${tId}`).emit("presence:update", { userId: uId, status: "online" });
                }
            }
        }
        socket.join(`user:${socket.data.userId}`);
        const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, Math.min(socket.data.expiry - Date.now(), 2147483647)));
        expiryTimer.unref();
        socket.use(async (_packet, next) => {
            try {
                (0, jwt_1.verifyToken)(socket.handshake.auth?.token || "");
                if (socket.data.tenantId && !socket.data.isSuper) {
                    (0, workspace_policy_service_1.assertWorkspaceActive)(await (0, workspace_policy_service_1.getWorkspacePolicy)(socket.data.tenantId));
                }
                next();
            }
            catch {
                socket.disconnect(true);
                next(new Error("Workspace access expired"));
            }
        });
        // Join tenant room for isolated multi-tenant broadcasting
        socket.on("join-tenant", (tenantId) => {
            if (tenantId === socket.data.tenantId) {
                socket.join(`tenant:${tenantId}`);
                console.log(`⚡ [WebSocket] Socket ${socket.id} joined room tenant:${tenantId}`);
            }
        });
        // Subscribe to specific entity record rooms
        socket.on("subscribe:record", (payload) => {
            if (payload?.entityType && payload?.entityId) {
                socket.join(`record:${payload.entityType}:${payload.entityId}`);
            }
        });
        socket.on("unsubscribe:record", (payload) => {
            if (payload?.entityType && payload?.entityId) {
                socket.leave(`record:${payload.entityType}:${payload.entityId}`);
            }
        });
        // Handle real-time chat direct messages with DB persistence
        socket.on("chat:send", async (payload) => {
            try {
                const tenantId = socket.data.tenantId;
                const msg = payload.message || {};
                const saved = await prisma_1.prisma.chatMessage.create({
                    data: {
                        tenantId,
                        threadId: payload.threadId || "general",
                        senderId: socket.data.userId,
                        senderName: socket.data.name,
                        senderAvatar: socket.data.avatar || null,
                        content: msg.content || msg.text || "",
                        attachments: msg.attachments || null,
                        replyToId: msg.replyToId || null,
                        replyTo: msg.replyTo || null,
                        voiceNote: msg.voiceNote || null,
                        poll: msg.poll || null,
                        urlPreviews: msg.urlPreviews || null,
                    },
                });
                ioInstance?.to(`tenant:${tenantId}`).emit("chat:message", {
                    threadId: payload.threadId,
                    message: saved,
                });
            }
            catch (err) {
                console.error("Socket chat:send DB error:", err.message);
                socket.emit("chat:error", { error: "Message could not be saved" });
            }
        });
        // Handle real-time chat typing indicator
        socket.on("chat:typing", (payload) => {
            if (!socket.data.tenantId || !payload?.threadId)
                return;
            socket.to(`tenant:${socket.data.tenantId}`).emit("chat:typing", {
                threadId: payload.threadId,
                userId: socket.data.userId,
                name: socket.data.name,
                isTyping: !!payload.isTyping,
            });
            void pusher_service_1.PusherService.triggerTenantEvent(socket.data.tenantId, "chat:typing", {
                threadId: payload.threadId,
                userId: socket.data.userId,
                name: socket.data.name,
                isTyping: !!payload.isTyping,
            }).catch(() => { });
        });
        // Handle real-time chat read receipt
        socket.on("chat:read", async (payload) => {
            if (!socket.data.tenantId || !payload?.threadId)
                return;
            const tId = socket.data.tenantId;
            const uId = socket.data.userId;
            try {
                await prisma_1.prisma.chatReadReceipt.upsert({
                    where: { tenantId_threadId_userId: { tenantId: tId, threadId: payload.threadId, userId: uId } },
                    create: { tenantId: tId, threadId: payload.threadId, userId: uId, lastReadAt: new Date() },
                    update: { lastReadAt: new Date() },
                });
                ioInstance?.to(`tenant:${tId}`).emit("chat:read", {
                    threadId: payload.threadId,
                    userId: uId,
                    readAt: new Date().toISOString(),
                });
            }
            catch (err) {
                console.warn("Socket chat:read error:", err.message);
            }
        });
        // Handle real-time message delivery acknowledgment
        socket.on("chat:delivered", async (payload) => {
            if (!socket.data.tenantId || !payload?.messageIds?.length)
                return;
            const tId = socket.data.tenantId;
            const uId = socket.data.userId;
            ioInstance?.to(`tenant:${tId}`).emit("chat:delivered", {
                messageIds: payload.messageIds,
                threadId: payload.threadId,
                userId: uId,
                deliveredAt: new Date().toISOString(),
            });
            // Asynchronously persist delivery status in DB without blocking event loop
            (prisma_1.rawPrisma || prisma_1.prisma).chatMessage.updateMany({
                where: { id: { in: payload.messageIds }, tenantId: tId, senderId: { not: uId } },
                data: { deliveryStatus: "delivered" },
            }).catch(() => { });
        });
        // =========================================================================
        // WEBRTC CALL SIGNALING & LIFECYCLE (Audio, Video, Group Calls)
        // =========================================================================
        const emitCallForbidden = (sock) => {
            sock.emit("call:error", {
                code: "CALL_FORBIDDEN",
                message: "You are not allowed to modify this call.",
            });
        };
        const persistMissedCallRecord = async (params) => {
            const { tenantId, callId, session, callerId, targetUserId, isTimeout } = params;
            const callType = session?.callType || "audio";
            const threadId = session?.threadId || `direct_${[callerId, targetUserId].sort().join("_")}`;
            try {
                await (0, tenant_context_1.runWithTenantContext)({
                    tenantId,
                    userId: callerId,
                    roles: [],
                    status: "ACTIVE",
                    tenancyStrategy: "SHARED_SCHEMA",
                    db: prisma_1.rawPrisma,
                }, async () => {
                    if (callId) {
                        const existing = await prisma_1.prisma.callHistoryRecord.findFirst({
                            where: { tenantId, callSessionId: callId },
                        });
                        if (existing)
                            return;
                    }
                    await prisma_1.prisma.callHistoryRecord.create({
                        data: {
                            tenantId,
                            callSessionId: callId || `call_missed_${Date.now()}`,
                            callerId,
                            callerName: session?.callerName || "Colleague",
                            callerPhone: "Internal Call",
                            callerAvatarUrl: session?.callerAvatar || null,
                            receiverId: targetUserId,
                            receiverName: session?.targetName || "Colleague",
                            receiverAvatarUrl: session?.targetAvatar || null,
                            direction: "outgoing",
                            callType,
                            status: "missed",
                            durationSeconds: 0,
                            callTime: new Date(),
                            startedAt: session?.startedAt || new Date(),
                            endedAt: new Date(),
                            notes: isTimeout
                                ? "Call timed out after 60 seconds with no answer."
                                : "Caller cancelled before answer.",
                        },
                    });
                    // Send In-App Notification to recipient (missed call)
                    await notification_service_1.NotificationService.createNotification({
                        tenantId,
                        recipientUserId: targetUserId,
                        title: `Missed ${callType === "video" ? "Video" : "Audio"} Call`,
                        message: `You missed a ${callType} call from ${session?.callerName || "a colleague"}.`,
                        type: "chat_missed_call",
                        actionUrl: `/chat?thread=${threadId}`,
                        metadata: { callId, callerId, callType },
                    });
                    // Record chat system event in direct conversation
                    await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, threadId, callerId, "call_event", `Missed ${callType === "video" ? "video" : "audio"} call.`, { callType, status: "missed", durationSeconds: 0 });
                });
            }
            catch (err) {
                console.warn("Failed to persist missed call notification/record:", err.message);
            }
        };
        // 1. INITIATE CALL (1-on-1)
        socket.on("call:invite", async (payload) => {
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const callType = (payload?.callType || payload?.type || "audio").toLowerCase();
            const callId = payload?.callId || `call_${Date.now()}`;
            const tenantId = socket.data.tenantId;
            console.log(`[SOCKET_CALL_INVITE] from: ${socket.data.userId}, target: ${targetUserId}, tenant: ${tenantId}, callId: ${callId}`);
            if (!targetUserId || !tenantId) {
                console.warn(`[SOCKET_CALL_INVITE_REJECT] Missing targetUserId (${targetUserId}) or tenantId (${tenantId})`);
                return;
            }
            // Prevent calling self
            if (targetUserId === socket.data.userId) {
                emitCallForbidden(socket);
                return;
            }
            // Check if target user is in the same tenant
            const targetUser = await prisma_1.prisma.user.findFirst({
                where: { id: targetUserId, profile: { tenantId } },
                include: { profile: true },
            });
            if (!targetUser) {
                emitCallForbidden(socket);
                return;
            }
            // A user may be in only one live one-to-one call or group meeting. Check both sides here
            // instead of trusting client state, otherwise a caller could create concurrent peer connections.
            let busyUserId = null;
            for (const [, session] of exports.activeCalls) {
                if (session.tenantId === tenantId &&
                    (session.status === "ringing" || session.status === "connected") &&
                    (session.callerId === targetUserId || session.targetUserId === targetUserId ||
                        session.callerId === socket.data.userId || session.targetUserId === socket.data.userId)) {
                    busyUserId = session.callerId === targetUserId || session.targetUserId === targetUserId
                        ? targetUserId
                        : socket.data.userId;
                    break;
                }
            }
            if (!busyUserId) {
                for (const [, meeting] of exports.activeGroupCalls) {
                    if (meeting.tenantId === tenantId) {
                        if (meeting.participants.has(targetUserId)) {
                            busyUserId = targetUserId;
                            break;
                        }
                        else if (meeting.participants.has(socket.data.userId)) {
                            busyUserId = socket.data.userId;
                            break;
                        }
                    }
                }
            }
            if (busyUserId) {
                const busyPayload = {
                    callId,
                    targetUserId,
                    busyUserId,
                    reason: busyUserId === targetUserId
                        ? "User is currently on another call."
                        : "You are already in another call.",
                };
                socket.emit("call:busy", busyPayload);
                // When the recipient is the busy party, let their active client know
                // that another colleague attempted to reach them without interrupting
                // the current call.
                if (busyUserId === targetUserId) {
                    const recipientNotice = {
                        ...busyPayload,
                        requestedBy: socket.data.userId,
                        requestedByName: socket.data.name || "A colleague",
                        reason: "Another incoming call was blocked because you are already in a call.",
                    };
                    ioInstance?.to(`user:${targetUserId}`).emit("call:busy", recipientNotice);
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:busy", recipientNotice)
                        .catch(() => { });
                }
                return;
            }
            const callerName = socket.data.name || payload?.callerName || "Colleague";
            const callerAvatar = socket.data.avatar || payload?.callerAvatar || payload?.callerAvatarUrl || null;
            const targetName = targetUser.profile?.fullName || targetUser.email || "Colleague";
            const targetAvatar = targetUser.profile?.avatarUrl || null;
            const threadId = payload?.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;
            // Save in active calls registry with authoritative 60-second ringing timeout
            const callSession = {
                callId,
                tenantId,
                callerId: socket.data.userId,
                callerName,
                callerAvatar,
                targetUserId,
                targetName,
                targetAvatar,
                callType,
                threadId,
                startedAt: new Date(),
                status: "ringing",
                timeoutTimer: setTimeout(async () => {
                    const current = exports.activeCalls.get(callId);
                    if (current && current.status === "ringing") {
                        console.log(`[CALL_TIMEOUT_60S] Server-authoritative 60s timeout for call: ${callId}`);
                        if (current.timeoutTimer) {
                            clearTimeout(current.timeoutTimer);
                            current.timeoutTimer = null;
                        }
                        exports.activeCalls.delete(callId);
                        ioInstance?.to(`user:${current.targetUserId}`).emit("call:timeout", {
                            callId,
                            cancelledBy: "system",
                        });
                        ioInstance?.to(`user:${current.callerId}`).emit("call:timeout", {
                            callId,
                            cancelledBy: "system",
                        });
                        void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                            tenantId: current.tenantId,
                            targetUserId: current.targetUserId,
                            callId,
                            reason: "timeout",
                        }).catch(() => { });
                        await persistMissedCallRecord({
                            tenantId: current.tenantId,
                            callId,
                            session: current,
                            callerId: current.callerId,
                            targetUserId: current.targetUserId,
                            isTimeout: true,
                        });
                    }
                }, 60000), // Exactly 60 seconds
            };
            exports.activeCalls.set(callId, callSession);
            // Deliver incoming call signal to recipient with normalized contract aliases
            const incomingPayload = {
                callId,
                callType,
                type: callType,
                callerId: socket.data.userId,
                fromUserId: socket.data.userId,
                callerName,
                callerPhone: payload?.callerPhone || "Internal Call",
                callerEmail: socket.data.email || payload?.callerEmail,
                callerAvatar,
                callerAvatarUrl: callerAvatar,
                threadId,
                tenantId,
            };
            ioInstance?.to(`user:${targetUserId}`).emit("call:incoming", incomingPayload);
            // Pusher is a notification fallback, not the authoritative WebRTC
            // transport. The recipient still accepts/signals through Socket.IO.
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:incoming", incomingPayload)
                .catch(() => { });
            // Authoritative Web Push notification (critical for background / closed tab delivery)
            void incoming_call_push_service_1.IncomingCallPushService.sendIncomingCallPush({
                tenantId,
                targetUserId,
                callId,
                callerId: socket.data.userId,
                callerName,
                callerAvatar,
                callType,
                threadId,
            }).catch((err) => {
                console.warn(`[SOCKET_CALL_INVITE_PUSH_ERROR] Web Push dispatch failed for call ${callId}:`, err.message);
            });
        });
        // 2. ACCEPT CALL
        socket.on("call:accept", (payload) => {
            const callId = payload?.callId;
            const targetUserId = payload?.targetUserId || payload?.toUserId || payload?.fromUserId;
            if (!callId || !targetUserId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== socket.data.tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isParticipant = session.callerId === socket.data.userId ||
                session.targetUserId === socket.data.userId;
            if (!isParticipant) {
                emitCallForbidden(socket);
                return;
            }
            const expectedPeerId = session.callerId === socket.data.userId
                ? session.targetUserId
                : session.callerId;
            if (targetUserId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            // Legal transition: receiver only, only while ringing, target must be caller
            if (session.targetUserId !== socket.data.userId || session.status !== "ringing" || targetUserId !== session.callerId) {
                emitCallForbidden(socket);
                return;
            }
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "connected";
            ioInstance?.to(`user:${session.callerId}`).emit("call:accepted", {
                callId,
                acceptedBy: socket.data.userId,
            });
            // Dismiss any ringing Web Push notifications on other receiver devices
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                tenantId: session.tenantId,
                targetUserId: session.targetUserId,
                callId,
                reason: "accepted",
            }).catch(() => { });
        });
        // 3. REJECT CALL
        socket.on("call:reject", async (payload) => {
            const callId = payload?.callId;
            const targetUserId = payload?.targetUserId || payload?.toUserId || payload?.fromUserId;
            const tenantId = socket.data.tenantId;
            if (!callId || !targetUserId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isParticipant = session.callerId === socket.data.userId ||
                session.targetUserId === socket.data.userId;
            if (!isParticipant) {
                emitCallForbidden(socket);
                return;
            }
            const expectedPeerId = session.callerId === socket.data.userId
                ? session.targetUserId
                : session.callerId;
            if (targetUserId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            // Legal transition: receiver only, only while ringing, target must be caller
            if (session.targetUserId !== socket.data.userId || session.status !== "ringing" || targetUserId !== session.callerId) {
                emitCallForbidden(socket);
                return;
            }
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            exports.activeCalls.delete(callId);
            const callType = session.callType;
            const threadId = session.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;
            ioInstance?.to(`user:${session.callerId}`).emit("call:rejected", {
                callId,
                rejectedBy: socket.data.userId,
                reason: payload?.reason || "declined",
            });
            // Dismiss Web Push notifications
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                tenantId,
                targetUserId: session.targetUserId,
                callId,
                reason: "rejected",
            }).catch(() => { });
            // Persist rejected call record
            try {
                await (0, tenant_context_1.runWithTenantContext)({
                    tenantId,
                    userId: socket.data.userId,
                    roles: [],
                    status: "ACTIVE",
                    tenancyStrategy: "SHARED_SCHEMA",
                    db: prisma_1.rawPrisma,
                }, async () => {
                    await prisma_1.prisma.callHistoryRecord.create({
                        data: {
                            tenantId,
                            callSessionId: callId,
                            callerId: session.callerId,
                            callerName: session.callerName || "Colleague",
                            callerPhone: "Internal Call",
                            callerAvatarUrl: session.callerAvatar || null,
                            receiverId: socket.data.userId,
                            receiverName: socket.data.name || session.targetName || "Colleague",
                            receiverAvatarUrl: socket.data.avatar || session.targetAvatar || null,
                            direction: "incoming",
                            callType,
                            status: "rejected",
                            durationSeconds: 0,
                            callTime: new Date(),
                            startedAt: session.startedAt || new Date(),
                            endedAt: new Date(),
                            notes: "Call rejected by recipient.",
                        },
                    });
                    await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, threadId, socket.data.userId, "call_event", `${callType === "video" ? "Video" : "Audio"} call declined.`, { callType, status: "rejected", durationSeconds: 0 });
                });
            }
            catch (err) {
                console.warn("Failed to persist rejected call record:", err.message);
            }
        });
        // 4. CANCEL CALL (Caller cancels ringing call)
        socket.on("call:cancel", async (payload) => {
            const callId = payload?.callId;
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const tenantId = socket.data.tenantId || payload?.tenantId;
            if (!callId || !targetUserId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isParticipant = session.callerId === socket.data.userId ||
                session.targetUserId === socket.data.userId;
            if (!isParticipant) {
                emitCallForbidden(socket);
                return;
            }
            const expectedPeerId = session.callerId === socket.data.userId
                ? session.targetUserId
                : session.callerId;
            if (targetUserId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            // Legal transition: caller only, only while ringing, target must be receiver
            if (session.callerId !== socket.data.userId || session.status !== "ringing" || targetUserId !== session.targetUserId) {
                emitCallForbidden(socket);
                return;
            }
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            exports.activeCalls.delete(callId);
            ioInstance?.to(`user:${session.targetUserId}`).emit("call:cancelled", {
                callId,
                cancelledBy: socket.data.userId,
            });
            // Dismiss Web Push notifications on target device
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                tenantId,
                targetUserId: session.targetUserId,
                callId,
                reason: "cancelled",
            }).catch((err) => {
                console.warn(`[SOCKET_CALL_CANCEL_PUSH_ERROR] Failed to send cancel push for call ${callId}:`, err.message);
            });
            await persistMissedCallRecord({
                tenantId,
                callId,
                session,
                callerId: session.callerId,
                targetUserId: session.targetUserId,
                isTimeout: false,
            });
        });
        // 4.1 TIMEOUT CALL - Never trust client-triggered timeout as authoritative
        socket.on("call:timeout", () => {
            emitCallForbidden(socket);
        });
        // 5. WEBRTC SIGNALING (SDP Offer / Answer & ICE Candidates)
        socket.on("call:signal", (payload) => {
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const callId = payload?.callId;
            if (!callId || !targetUserId || !payload?.signal || typeof payload.signal !== "object") {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== socket.data.tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isParticipant = session.callerId === socket.data.userId ||
                session.targetUserId === socket.data.userId;
            if (!isParticipant) {
                emitCallForbidden(socket);
                return;
            }
            const expectedPeerId = session.callerId === socket.data.userId
                ? session.targetUserId
                : session.callerId;
            if (targetUserId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            if (session.status !== "ringing" && session.status !== "connected") {
                emitCallForbidden(socket);
                return;
            }
            ioInstance?.to(`user:${targetUserId}`).emit("call:signal", {
                callId,
                senderId: socket.data.userId,
                fromUserId: socket.data.userId,
                signal: payload.signal,
            });
        });
        // 5.1 MEDIA STATE NOTIFICATION (Screen Sharing, Cam/Mic toggles)
        socket.on("call:media-state", (payload) => {
            const callId = payload?.callId;
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            if (!callId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== socket.data.tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isParticipant = session.callerId === socket.data.userId ||
                session.targetUserId === socket.data.userId;
            if (!isParticipant) {
                emitCallForbidden(socket);
                return;
            }
            const expectedPeerId = session.callerId === socket.data.userId
                ? session.targetUserId
                : session.callerId;
            if (targetUserId && targetUserId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            if (session.status !== "connected") {
                emitCallForbidden(socket);
                return;
            }
            ioInstance?.to(`user:${expectedPeerId}`).emit("call:media-state", {
                callId,
                type: payload?.type || "screen-share",
                active: !!payload?.active,
                fromUserId: socket.data.userId,
            });
        });
        // 6. HANGUP / END CALL
        socket.on("call:hangup", async (payload) => {
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const callId = payload?.callId;
            const tenantId = socket.data.tenantId;
            if (!callId || !targetUserId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isParticipant = session.callerId === socket.data.userId ||
                session.targetUserId === socket.data.userId;
            if (!isParticipant) {
                emitCallForbidden(socket);
                return;
            }
            const expectedPeerId = session.callerId === socket.data.userId
                ? session.targetUserId
                : session.callerId;
            if (targetUserId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            // Legal lifecycle transition: caller or receiver only, only when call is connected
            if (session.status !== "connected") {
                emitCallForbidden(socket);
                return;
            }
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            exports.activeCalls.delete(callId);
            const isCaller = session.callerId === socket.data.userId;
            const durationSeconds = Math.max(0, Math.round(Number(payload?.durationSeconds) || 0));
            const callType = session.callType || payload?.callType || "audio";
            const threadId = session.threadId || `direct_${[session.callerId, session.targetUserId].sort().join("_")}`;
            ioInstance?.to(`user:${expectedPeerId}`).emit("call:ended", {
                callId,
                endedBy: socket.data.userId,
                durationSeconds,
            });
            // Persist completed call record
            try {
                const callerId = session.callerId;
                const receiverId = session.targetUserId;
                await (0, tenant_context_1.runWithTenantContext)({
                    tenantId,
                    userId: socket.data.userId,
                    roles: [],
                    status: "ACTIVE",
                    tenancyStrategy: "SHARED_SCHEMA",
                    db: prisma_1.rawPrisma,
                }, async () => {
                    const existing = await prisma_1.prisma.callHistoryRecord.findFirst({
                        where: { tenantId, callSessionId: callId },
                    });
                    if (existing) {
                        await prisma_1.prisma.callHistoryRecord.update({
                            where: { id: existing.id },
                            data: {
                                status: "completed",
                                durationSeconds: Math.max(existing.durationSeconds, durationSeconds),
                                endedAt: new Date(),
                                notes: `${callType === "video" ? "Video conference" : "Voice call"} session concluded.`,
                            },
                        });
                        return;
                    }
                    await prisma_1.prisma.callHistoryRecord.create({
                        data: {
                            tenantId,
                            callSessionId: callId,
                            callerId,
                            callerName: session.callerName || (isCaller ? socket.data.name : "Colleague"),
                            callerPhone: "Internal Call",
                            callerAvatarUrl: session.callerAvatar || (isCaller ? socket.data.avatar : null),
                            receiverId,
                            receiverName: session.targetName || (!isCaller ? socket.data.name : "Colleague"),
                            receiverAvatarUrl: session.targetAvatar || (!isCaller ? socket.data.avatar : null),
                            direction: isCaller ? "outgoing" : "incoming",
                            callType,
                            status: "completed",
                            durationSeconds,
                            callTime: new Date(),
                            startedAt: session.startedAt || new Date(Date.now() - durationSeconds * 1000),
                            endedAt: new Date(),
                            notes: `${callType === "video" ? "Video conference" : "Voice call"} session concluded.`,
                        },
                    });
                    // Record chat system event in direct conversation
                    const mins = Math.floor(durationSeconds / 60);
                    const secs = durationSeconds % 60;
                    const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, threadId, socket.data.userId, "call_event", `${callType === "video" ? "Video" : "Audio"} call (${durStr}).`, { callType, status: "completed", durationSeconds });
                });
            }
            catch (err) {
                console.warn("Failed to persist completed call record:", err.message);
            }
        });
        // 7. GROUP AUDIO & VIDEO CALLS & MULTI-PARTY MEETINGS
        socket.on("group-call:start", async (payload, acknowledge) => {
            const { groupId, callId, callType } = payload;
            const tenantId = socket.data.tenantId;
            if (!groupId || !callId || !tenantId) {
                acknowledge?.({ success: false, code: "CALL_FORBIDDEN", message: "Invalid meeting request." });
                emitCallForbidden(socket);
                return;
            }
            if (exports.activeGroupCalls.has(callId)) {
                acknowledge?.({ success: false, code: "CALL_CONFLICT", message: "This meeting ID is already active." });
                emitCallForbidden(socket);
                return;
            }
            // Verify group existence and membership within tenant
            const group = await (prisma_1.rawPrisma || prisma_1.prisma).chatGroup.findFirst({
                where: { id: groupId, tenantId },
                include: { members: true },
            });
            if (!group || !group.members.some((m) => m.userId === socket.data.userId)) {
                acknowledge?.({ success: false, code: "CALL_FORBIDDEN", message: "You cannot start a meeting for this group." });
                emitCallForbidden(socket);
                return;
            }
            // Check if host is already on an active 1-to-1 call
            for (const [, call] of exports.activeCalls) {
                if (call.tenantId === tenantId &&
                    (call.status === "ringing" || call.status === "connected") &&
                    (call.callerId === socket.data.userId || call.targetUserId === socket.data.userId)) {
                    socket.emit("call:busy", {
                        callId,
                        message: "You are already in an active call. Please end your current call first.",
                        busyUserId: socket.data.userId,
                    });
                    acknowledge?.({ success: false, code: "CALL_BUSY", message: "You are already in an active call." });
                    return;
                }
            }
            for (const [, meeting] of exports.activeGroupCalls) {
                if (meeting.tenantId === tenantId && meeting.participants.has(socket.data.userId)) {
                    socket.emit("call:busy", {
                        callId,
                        message: "You are already in another meeting. Leave it before starting a new one.",
                        busyUserId: socket.data.userId,
                    });
                    acknowledge?.({ success: false, code: "CALL_BUSY", message: "You are already in another meeting." });
                    return;
                }
            }
            const participants = new Map();
            participants.set(socket.data.userId, {
                userId: socket.data.userId,
                name: socket.data.name || "Host",
                avatar: socket.data.avatar || null,
                role: "host",
                joinedAt: new Date(),
                isMuted: false,
                isCameraOff: false,
                isScreenSharing: false,
                isSpeaking: false,
                socketIds: new Set([socket.id]),
            });
            const invitedUserIds = new Set();
            for (const m of group.members) {
                if (m.userId !== socket.data.userId) {
                    invitedUserIds.add(m.userId);
                }
            }
            exports.activeGroupCalls.set(callId, {
                callId,
                groupId,
                groupName: group.name,
                groupAvatarUrl: group.avatarUrl,
                tenantId,
                creatorId: socket.data.userId,
                callType: callType || "audio",
                startedAt: new Date(),
                participants,
                invitedUserIds,
                historyPersisted: false,
            });
            socket.join(`group_call_${callId}`);
            acknowledge?.({ success: true, callId });
            // Broadcast incoming group call to all group members with Pusher fallback
            for (const m of group.members) {
                if (m.userId !== socket.data.userId) {
                    const invitePayload = {
                        groupId,
                        groupName: group.name,
                        groupAvatarUrl: group.avatarUrl,
                        callId,
                        callType: callType || "audio",
                        callerId: socket.data.userId,
                        callerName: socket.data.name,
                        callerAvatar: socket.data.avatar,
                        eventId: `group_call_${callId}_${m.userId}`,
                    };
                    // Primary: Socket.IO
                    ioInstance?.to(`user:${m.userId}`).emit("group-call:incoming", invitePayload);
                    // Fallback: Pusher
                    pusher_service_1.PusherService.triggerUserEvent(tenantId, m.userId, "group-call:incoming", invitePayload).catch((err) => console.warn("Pusher group-call:incoming delivery warning:", err?.message || err));
                }
            }
            // Record system event in group conversation
            await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${groupId}`, socket.data.userId, "group_call_started", `${socket.data.name} started a group ${callType} meeting.`, { groupId, callId, callType });
        });
        socket.on("group-call:join", async (payload) => {
            const { callId } = payload;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeGroupCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const member = await (prisma_1.rawPrisma || prisma_1.prisma).chatGroupMember.findFirst({
                where: { groupId: session.groupId, userId: socket.data.userId },
            });
            if (!member && !session.invitedUserIds.has(socket.data.userId)) {
                emitCallForbidden(socket);
                return;
            }
            // Check if user is in an active 1-to-1 call
            for (const [, call] of exports.activeCalls) {
                if (call.tenantId === tenantId &&
                    (call.status === "ringing" || call.status === "connected") &&
                    (call.callerId === socket.data.userId || call.targetUserId === socket.data.userId)) {
                    socket.emit("call:busy", {
                        callId,
                        message: "You are already in an active 1-to-1 call. End it before joining the meeting.",
                        busyUserId: socket.data.userId,
                    });
                    return;
                }
            }
            for (const [, meeting] of exports.activeGroupCalls) {
                if (meeting.callId !== callId &&
                    meeting.tenantId === tenantId &&
                    meeting.participants.has(socket.data.userId)) {
                    socket.emit("call:busy", {
                        callId,
                        message: "You are already in another meeting. Leave it before joining this one.",
                        busyUserId: socket.data.userId,
                    });
                    return;
                }
            }
            socket.join(`group_call_${callId}`);
            // Maintain server-authoritative participant roster
            let participant = session.participants.get(socket.data.userId);
            if (!participant) {
                participant = {
                    userId: socket.data.userId,
                    name: socket.data.name || payload.name || "Participant",
                    avatar: socket.data.avatar || payload.avatar || null,
                    role: socket.data.userId === session.creatorId ? "host" : "participant",
                    joinedAt: new Date(),
                    isMuted: false,
                    isCameraOff: false,
                    isScreenSharing: false,
                    isSpeaking: false,
                    socketIds: new Set([socket.id]),
                };
                session.participants.set(socket.data.userId, participant);
            }
            else {
                participant.socketIds.add(socket.id);
            }
            // Notify other participants in room
            socket.to(`group_call_${callId}`).emit("group-call:user_joined", {
                callId,
                userId: socket.data.userId,
                name: participant.name,
                avatar: participant.avatar,
                role: participant.role,
                isMuted: participant.isMuted,
                isCameraOff: participant.isCameraOff,
            });
            // Synchronize full roster to joining user
            const roster = Array.from(session.participants.values()).map((p) => ({
                userId: p.userId,
                name: p.name,
                avatar: p.avatar,
                role: p.role,
                isMuted: p.isMuted,
                isCameraOff: p.isCameraOff,
                isScreenSharing: p.isScreenSharing,
                isSpeaking: p.isSpeaking,
            }));
            socket.emit("group-call:state_sync", {
                callId,
                groupId: session.groupId,
                callType: session.callType,
                creatorId: session.creatorId,
                participants: roster,
            });
        });
        socket.on("group-call:signal", async (payload) => {
            if (!payload?.callId || !payload?.targetUserId || !payload?.signal || typeof payload.signal !== "object") {
                emitCallForbidden(socket);
                return;
            }
            const tenantId = socket.data.tenantId;
            const session = exports.activeGroupCalls.get(payload.callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const members = await (prisma_1.rawPrisma || prisma_1.prisma).chatGroupMember.findMany({
                where: {
                    groupId: session.groupId,
                    userId: { in: [socket.data.userId, payload.targetUserId] },
                },
            });
            const senderIsMember = members.some((m) => m.userId === socket.data.userId);
            const targetIsMember = members.some((m) => m.userId === payload.targetUserId);
            if (!senderIsMember || !targetIsMember) {
                emitCallForbidden(socket);
                return;
            }
            ioInstance?.to(`user:${payload.targetUserId}`).emit("group-call:signal", {
                callId: payload.callId,
                senderId: socket.data.userId,
                signal: payload.signal,
            });
        });
        socket.on("group-call:media-state", async (payload) => {
            const { callId } = payload;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId)
                return;
            const session = exports.activeGroupCalls.get(callId);
            if (!session || session.tenantId !== tenantId)
                return;
            const participant = session.participants.get(socket.data.userId);
            if (!participant)
                return;
            if (typeof payload.isMuted === "boolean")
                participant.isMuted = payload.isMuted;
            if (typeof payload.isCameraOff === "boolean")
                participant.isCameraOff = payload.isCameraOff;
            if (typeof payload.isScreenSharing === "boolean")
                participant.isScreenSharing = payload.isScreenSharing;
            if (typeof payload.isSpeaking === "boolean")
                participant.isSpeaking = payload.isSpeaking;
            socket.to(`group_call_${callId}`).emit("group-call:media_state", {
                callId,
                userId: socket.data.userId,
                isMuted: participant.isMuted,
                isCameraOff: participant.isCameraOff,
                isScreenSharing: participant.isScreenSharing,
                isSpeaking: participant.isSpeaking,
            });
        });
        socket.on("group-call:media_state", (payload) => {
            // Alias for underscore event name
            const { callId } = payload;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId)
                return;
            const session = exports.activeGroupCalls.get(callId);
            if (!session || session.tenantId !== tenantId)
                return;
            const participant = session.participants.get(socket.data.userId);
            if (!participant)
                return;
            if (typeof payload.isMuted === "boolean")
                participant.isMuted = payload.isMuted;
            if (typeof payload.isCameraOff === "boolean")
                participant.isCameraOff = payload.isCameraOff;
            if (typeof payload.isScreenSharing === "boolean")
                participant.isScreenSharing = payload.isScreenSharing;
            if (typeof payload.isSpeaking === "boolean")
                participant.isSpeaking = payload.isSpeaking;
            socket.to(`group_call_${callId}`).emit("group-call:media_state", {
                callId,
                userId: socket.data.userId,
                isMuted: participant.isMuted,
                isCameraOff: participant.isCameraOff,
                isScreenSharing: participant.isScreenSharing,
                isSpeaking: participant.isSpeaking,
            });
        });
        socket.on("group-call:invite_users", async (payload) => {
            const { callId, userIds } = payload;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId || !Array.isArray(userIds) || userIds.length === 0) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeGroupCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            if (!session.participants.has(socket.data.userId)) {
                emitCallForbidden(socket);
                return;
            }
            const targetUsers = await (prisma_1.rawPrisma || prisma_1.prisma).user.findMany({
                where: {
                    id: { in: userIds },
                    profile: { tenantId },
                },
                select: { id: true, email: true },
            });
            for (const u of targetUsers) {
                if (!session.participants.has(u.id)) {
                    session.invitedUserIds.add(u.id);
                    // Check if invited user is already on another active call or meeting
                    let isUserBusy = false;
                    for (const [, call] of exports.activeCalls) {
                        if (call.tenantId === tenantId &&
                            (call.status === "ringing" || call.status === "connected") &&
                            (call.callerId === u.id || call.targetUserId === u.id)) {
                            isUserBusy = true;
                            break;
                        }
                    }
                    if (!isUserBusy) {
                        for (const [, meeting] of exports.activeGroupCalls) {
                            if (meeting.tenantId === tenantId && meeting.callId !== callId && meeting.participants.has(u.id)) {
                                isUserBusy = true;
                                break;
                            }
                        }
                    }
                    if (isUserBusy) {
                        const busyNotice = {
                            callId,
                            message: `You were invited to meeting '${session.groupName || "Group Meeting"}' while on another call.`,
                            requestedByName: socket.data.name || "A colleague",
                        };
                        ioInstance?.to(`user:${u.id}`).emit("call:busy", busyNotice);
                        void pusher_service_1.PusherService.triggerUserEvent(tenantId, u.id, "call:busy", busyNotice).catch(() => { });
                        continue;
                    }
                    const invitePayload = {
                        groupId: session.groupId,
                        groupName: session.groupName || "Group Meeting",
                        groupAvatarUrl: session.groupAvatarUrl || null,
                        callId,
                        callType: session.callType,
                        callerId: socket.data.userId,
                        callerName: socket.data.name,
                        callerAvatar: socket.data.avatar,
                        eventId: `group_call_${callId}_${u.id}_${Date.now()}`,
                    };
                    ioInstance?.to(`user:${u.id}`).emit("group-call:incoming", invitePayload);
                    pusher_service_1.PusherService.triggerUserEvent(tenantId, u.id, "group-call:incoming", invitePayload).catch((e) => console.warn("Pusher invite fallback error:", e?.message || e));
                }
            }
            socket.emit("group-call:invite_sent", {
                callId,
                invitedCount: targetUsers.length,
            });
        });
        socket.on("group-call:remove_participant", async (payload) => {
            const { callId, targetUserId } = payload;
            const tenantId = socket.data.tenantId;
            if (!callId || !targetUserId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeGroupCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            // Host or platform admin check
            const isHost = socket.data.userId === session.creatorId || socket.data.isSuper;
            if (!isHost) {
                socket.emit("call:error", { code: "CALL_FORBIDDEN", message: "Only the meeting host can remove participants." });
                return;
            }
            session.participants.delete(targetUserId);
            ioInstance?.to(`user:${targetUserId}`).emit("group-call:removed", {
                callId,
                removedBy: socket.data.userId,
                reason: "Removed from meeting by host",
            });
            ioInstance?.to(`group_call_${callId}`).emit("group-call:user_left", {
                callId,
                userId: targetUserId,
                reason: "removed_by_host",
            });
        });
        socket.on("group-call:leave", async (payload) => {
            const { callId } = payload;
            if (!callId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeGroupCalls.get(callId);
            const tenantId = socket.data.tenantId;
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            // Validate group membership
            const member = await (prisma_1.rawPrisma || prisma_1.prisma).chatGroupMember.findFirst({
                where: { groupId: session.groupId, userId: socket.data.userId },
            });
            if (!member) {
                emitCallForbidden(socket);
                return;
            }
            socket.leave(`group_call_${callId}`);
            const participant = session.participants.get(socket.data.userId);
            if (participant) {
                participant.socketIds.delete(socket.id);
                if (participant.socketIds.size === 0) {
                    session.participants.delete(socket.data.userId);
                }
            }
            socket.to(`group_call_${callId}`).emit("group-call:user_left", {
                callId,
                userId: socket.data.userId,
            });
            const room = ioInstance?.sockets.adapter.rooms.get(`group_call_${callId}`);
            if (!room || room.size === 0 || session.participants.size === 0) {
                exports.activeGroupCalls.delete(callId);
                // Persist group call history once
                if (tenantId && session.groupId && !session.historyPersisted) {
                    session.historyPersisted = true;
                    const duration = payload.durationSeconds && payload.durationSeconds > 0
                        ? Math.round(payload.durationSeconds)
                        : Math.max(1, Math.round((Date.now() - session.startedAt.getTime()) / 1000));
                    try {
                        await (0, tenant_context_1.runWithTenantContext)({
                            tenantId,
                            userId: socket.data.userId || session.creatorId,
                            roles: [],
                            status: "ACTIVE",
                            tenancyStrategy: "SHARED_SCHEMA",
                            db: prisma_1.rawPrisma,
                        }, async () => {
                            await (prisma_1.rawPrisma.callHistoryRecord || prisma_1.prisma.callHistoryRecord).create({
                                data: {
                                    tenantId,
                                    callSessionId: callId,
                                    callerId: session.creatorId,
                                    callerName: socket.data.name || "Colleague",
                                    callerPhone: "Group Meeting",
                                    callerAvatarUrl: socket.data.avatar || null,
                                    callType: payload.callType || session.callType || "audio",
                                    status: "completed",
                                    durationSeconds: duration,
                                    callTime: new Date(),
                                    groupId: session.groupId,
                                    notes: `Group ${payload.callType || session.callType || "audio"} meeting concluded.`,
                                },
                            });
                        });
                    }
                    catch (e) {
                        console.warn("Failed to persist group call history:", e.message);
                    }
                }
            }
        });
        socket.on("group-call:end", async (payload) => {
            const { callId } = payload;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeGroupCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const isHost = socket.data.userId === session.creatorId || socket.data.isSuper;
            if (!isHost) {
                socket.emit("call:error", { code: "CALL_FORBIDDEN", message: "Only the meeting host can end the meeting for everyone." });
                return;
            }
            ioInstance?.to(`group_call_${callId}`).emit("group-call:ended", {
                callId,
                endedBy: socket.data.userId,
                reason: "Meeting ended by host",
            });
            if (!session.historyPersisted) {
                session.historyPersisted = true;
                const duration = payload.durationSeconds && payload.durationSeconds > 0
                    ? Math.round(payload.durationSeconds)
                    : Math.max(1, Math.round((Date.now() - session.startedAt.getTime()) / 1000));
                try {
                    const participantIds = Array.from(session.participants.keys());
                    await (0, tenant_context_1.runWithTenantContext)({
                        tenantId,
                        userId: socket.data.userId || session.creatorId,
                        roles: [],
                        status: "ACTIVE",
                        tenancyStrategy: "SHARED_SCHEMA",
                        db: prisma_1.rawPrisma,
                    }, async () => {
                        await (prisma_1.rawPrisma.callHistoryRecord || prisma_1.prisma.callHistoryRecord).create({
                            data: {
                                tenantId,
                                callSessionId: callId,
                                callerId: session.creatorId,
                                callerName: socket.data.name || "Meeting Host",
                                callerPhone: "Group Meeting",
                                callerAvatarUrl: socket.data.avatar || null,
                                callType: session.callType || "audio",
                                status: "completed",
                                durationSeconds: duration,
                                callTime: new Date(),
                                groupId: session.groupId,
                                participantIds: participantIds.length > 0 ? participantIds : [session.creatorId],
                                notes: `Group meeting ended by host (${socket.data.name}).`,
                            },
                        });
                    });
                }
                catch (e) {
                    console.warn("Failed to persist group meeting history on end:", e.message);
                }
            }
            exports.activeGroupCalls.delete(callId);
        });
        // Handle Dual-Screen Customer Display Cart Sync
        socket.on("pos:cart_update", (payload) => {
            const tenantId = socket.data.tenantId;
            socket.to(`tenant:${tenantId}`).emit("pos:cart_sync", { ...payload, tenantId });
        });
        // Handle biometric live punch streaming
        socket.on("punch:simulate", (payload) => {
            if (socket.data.isSuper)
                ioInstance?.to(`tenant:${socket.data.tenantId}`).emit("punch:new", payload.punch);
        });
        socket.on("disconnect", () => {
            clearTimeout(expiryTimer);
            const tId = socket.data.tenantId;
            const uId = socket.data.userId;
            if (tId && uId) {
                // Step 1: Decrement user socket count first using existing presence map
                let remainingSocketCount = 0;
                if (tenantPresence.has(tId)) {
                    const tenantMap = tenantPresence.get(tId);
                    const currentCount = tenantMap.get(uId) || 0;
                    if (currentCount <= 1) {
                        tenantMap.delete(uId);
                        remainingSocketCount = 0;
                        ioInstance?.to(`tenant:${tId}`).emit("presence:update", { userId: uId, status: "offline" });
                    }
                    else {
                        remainingSocketCount = currentCount - 1;
                        tenantMap.set(uId, remainingSocketCount);
                    }
                }
                // Also check if any other socket exists in the user room
                const userRoom = ioInstance?.sockets.adapter.rooms.get(`user:${uId}`);
                const userRoomSize = userRoom ? userRoom.size : 0;
                // ONLY end active calls if no other authenticated socket remains for this user in this tenant
                if (remainingSocketCount === 0 && userRoomSize === 0) {
                    for (const [callId, session] of exports.activeCalls) {
                        if (session.tenantId === tId && (session.callerId === uId || session.targetUserId === uId)) {
                            if (session.timeoutTimer) {
                                clearTimeout(session.timeoutTimer);
                                session.timeoutTimer = null;
                            }
                            const peerId = session.callerId === uId ? session.targetUserId : session.callerId;
                            ioInstance?.to(`user:${peerId}`).emit("call:ended", {
                                callId,
                                endedBy: uId,
                                reason: "peer_disconnected",
                            });
                            exports.activeCalls.delete(callId);
                        }
                    }
                }
            }
            console.log(`⚡ [WebSocket] Client disconnected: ${socket.id}`);
        });
    });
    return ioInstance;
}
function getIO() {
    return ioInstance;
}
function getOnlineUsersForTenant(tenantId) {
    const users = tenantPresence.get(tenantId);
    if (!users)
        return [];
    const online = [];
    for (const [userId, count] of users.entries()) {
        if (count > 0)
            online.push(userId);
    }
    return online;
}
function broadcastToTenant(tenantId, event, payload) {
    if (!ioInstance)
        return;
    ioInstance.to(`tenant:${tenantId}`).emit(event, payload);
    // Forward storage, file, and quota events to Super Admin platform room
    if (event.startsWith("file:") ||
        event.startsWith("file.") ||
        event.startsWith("storage:") ||
        event.startsWith("storage.") ||
        event.startsWith("quota:") ||
        event.startsWith("quota.")) {
        ioInstance.to("platform:admin").emit("storage:platform:update", {
            tenantId,
            event,
            payload,
            timestamp: new Date().toISOString(),
        });
        ioInstance.to("platform:admin").emit(event, { tenantId, ...payload });
    }
}
function broadcastToUser(userId, event, payload) {
    if (!ioInstance)
        return;
    ioInstance.to(`user:${userId}`).emit(event, payload);
}
function broadcastToPlatform(event, payload) {
    if (!ioInstance)
        return;
    ioInstance.to("platform:admin").emit(event, payload);
}
function broadcastToAll(event, payload) {
    if (!ioInstance)
        return;
    ioInstance.emit(event, payload);
}
