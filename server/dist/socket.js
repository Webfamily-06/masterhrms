"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeGroupCalls = exports.activeCalls = void 0;
exports.getActiveCallParticipantIds = getActiveCallParticipantIds;
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.getOnlineUsersForTenant = getOnlineUsersForTenant;
exports.recordRestUserPresence = recordRestUserPresence;
exports.getOnlineUsersForTenantAsync = getOnlineUsersForTenantAsync;
exports.broadcastToTenant = broadcastToTenant;
exports.broadcastToUser = broadcastToUser;
exports.broadcastToPlatform = broadcastToPlatform;
exports.broadcastToAll = broadcastToAll;
const crypto_1 = __importDefault(require("crypto"));
const socket_io_1 = require("socket.io");
const prisma_1 = require("./prisma");
const tenant_context_1 = require("./context/tenant-context");
const jwt_1 = require("./lib/jwt");
const workspace_policy_service_1 = require("./services/workspace-policy.service");
const chat_system_events_service_1 = require("./services/chat-system-events.service");
const notification_service_1 = require("./services/notification.service");
const pusher_service_1 = require("./services/pusher.service");
const incoming_call_push_service_1 = require("./services/incoming-call-push.service");
const call_lifecycle_service_1 = require("./services/call-lifecycle.service");
const chat_service_1 = require("./services/chat.service");
let ioInstance = null;
const tenantPresence = new Map();
const SOCKET_INSTANCE_ID = `node_${crypto_1.default.randomUUID().slice(0, 12)}`;
const sessionStatusCache = new Map();
const distributedPresenceCache = new Map();
let callSweeperInterval = null;
const ALLOWED_RECORD_ENTITY_MAP = {
    LeaveRequest: { model: "leaveRequest" },
    AttendanceRecord: { model: "attendanceRecord" },
    ExpenseClaim: { model: "expenseClaim" },
    HelpdeskTicket: { model: "helpdeskTicket" },
    Project: { model: "project" },
    ProjectTask: { model: "projectTask" },
    CrmLead: { model: "crmLead" },
    CrmDeal: { model: "crmDeal" },
    Employee: { model: "employee", ownerField: "userId" },
};
async function verifyActiveDeviceSession(sessionId, expectedUserId) {
    if (!sessionId)
        return true;
    const cached = sessionStatusCache.get(sessionId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.valid;
    }
    const db = prisma_1.rawPrisma || prisma_1.prisma;
    if (!db.deviceSession?.findUnique)
        return true;
    const session = await db.deviceSession
        .findUnique({
        where: { id: sessionId },
        select: { userId: true, revoked: true, expiresAt: true },
    })
        .catch(() => null);
    const isValid = Boolean(session &&
        !session.revoked &&
        session.userId === expectedUserId &&
        (!session.expiresAt || new Date(session.expiresAt).getTime() > Date.now()));
    sessionStatusCache.set(sessionId, { valid: isValid, expiresAt: Date.now() + 5000 });
    return isValid;
}
async function syncDistributedPresence(tenantId, userId, localCount) {
    try {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        if (!db.chatUserPresence?.upsert)
            return;
        const now = new Date();
        await db.chatUserPresence.upsert({
            where: { tenantId_userId: { tenantId, userId } },
            create: {
                tenantId,
                userId,
                status: localCount > 0 ? "online" : "offline",
                activeConnections: Math.max(0, localCount),
                instanceId: SOCKET_INSTANCE_ID,
                lastSeenAt: now,
            },
            update: {
                status: localCount > 0 ? "online" : "offline",
                activeConnections: Math.max(0, localCount),
                instanceId: SOCKET_INSTANCE_ID,
                lastSeenAt: now,
            },
        });
        distributedPresenceCache.delete(tenantId);
    }
    catch {
        // Non-fatal in unit test environments
    }
}
exports.activeCalls = new Map();
function getActiveCallParticipantIds(session) {
    const ids = new Set([session.callerId, session.targetUserId]);
    if (session.extraParticipantIds) {
        for (const id of session.extraParticipantIds) {
            if (id)
                ids.add(id);
        }
    }
    return Array.from(ids);
}
exports.activeGroupCalls = new Map();
function initSocket(server, allowedOrigins) {
    ioInstance = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*") || process.env.NODE_ENV === "development") {
                    return callback(null, true);
                }
                return callback(new Error("Origin not allowed"));
            },
            credentials: true,
        },
    });
    if (process.env.REDIS_URL && ioInstance) {
        void (async () => {
            try {
                const redisAdapterPkgName = "@socket.io/redis-adapter";
                const redisPkgName = "redis";
                const [{ createAdapter }, { createClient }] = await Promise.all([
                    Promise.resolve(`${redisAdapterPkgName}`).then(s => __importStar(require(s))),
                    Promise.resolve(`${redisPkgName}`).then(s => __importStar(require(s))),
                ]);
                const pubClient = createClient({ url: process.env.REDIS_URL });
                const subClient = pubClient.duplicate();
                await Promise.all([pubClient.connect(), subClient.connect()]);
                ioInstance?.adapter(createAdapter(pubClient, subClient));
                console.log("⚡ [WebSocket] Attached Socket.IO Redis distributed adapter.");
            }
            catch (err) {
                console.warn("⚡ [WebSocket] REDIS_URL set but Redis adapter unavailable; falling back to PostgreSQL presence:", err?.message);
            }
        })();
    }
    if (!callSweeperInterval) {
        callSweeperInterval = setInterval(() => {
            void call_lifecycle_service_1.CallLifecycleService.recoverExpiredCalls()
                .then((res) => {
                if (res.expiredRinging > 0 || res.expiredReconnecting > 0) {
                    console.log(`[CallSweeper] Recovered ${res.expiredRinging} timed-out & ${res.expiredReconnecting} grace-expired calls.`);
                }
            })
                .catch(() => { });
        }, 15_000);
        callSweeperInterval.unref();
    }
    ioInstance.use(async (socket, next) => {
        try {
            const identity = (0, jwt_1.verifyToken)(socket.handshake.auth?.token || "");
            if (identity.mfaPending)
                throw new Error("Complete two-factor verification");
            const userId = identity.userId || identity.id;
            if (!userId)
                throw new Error("Invalid token identity");
            if (process.env.NODE_ENV === "production" && !identity.sessionId) {
                throw new Error("Active device session required");
            }
            if (identity.sessionId) {
                const sessionOk = await verifyActiveDeviceSession(String(identity.sessionId), userId);
                if (!sessionOk)
                    throw new Error("Session revoked or expired");
            }
            const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, include: { profile: true, roles: true } });
            if (!user)
                throw new Error("Account not found");
            const roleNames = Array.isArray(user.roles) ? user.roles.map((role) => role.role) : [];
            const isSuper = roleNames.includes("super_admin");
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
            socket.data = {
                tenantId,
                userId: user.id,
                email: user.email,
                name: user.profile?.fullName || user.email,
                avatar: user.profile?.avatarUrl,
                roles: roleNames,
                sessionId: identity.sessionId || null,
                isSuper,
                expiry,
            };
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
                const nextCount = prev + 1;
                tenantMap.set(uId, nextCount);
                void syncDistributedPresence(tId, uId, nextCount);
                if (prev === 0) {
                    ioInstance?.to(`tenant:${tId}`).emit("presence:update", { userId: uId, status: "online" });
                }
            }
        }
        socket.join(`user:${socket.data.userId}`);
        const presenceHeartbeat = setInterval(() => {
            if (socket.data.tenantId && socket.data.userId) {
                const currentCount = tenantPresence.get(socket.data.tenantId)?.get(socket.data.userId) || 1;
                void syncDistributedPresence(socket.data.tenantId, socket.data.userId, currentCount);
            }
        }, 45_000);
        presenceHeartbeat.unref();
        const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, Math.min(socket.data.expiry - Date.now(), 2147483647)));
        expiryTimer.unref();
        socket.use(async (_packet, next) => {
            try {
                (0, jwt_1.verifyToken)(socket.handshake.auth?.token || "");
                if (socket.data.sessionId) {
                    const sessionOk = await verifyActiveDeviceSession(socket.data.sessionId, socket.data.userId);
                    if (!sessionOk)
                        throw new Error("Session revoked");
                }
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
        socket.on("join-tenant", (tenantId) => {
            if (tenantId && tenantId === socket.data.tenantId) {
                socket.join(`tenant:${tenantId}`);
            }
            else {
                socket.emit("chat:error", { code: "TENANT_FORBIDDEN", error: "Cannot join foreign workspace room." });
            }
        });
        socket.on("subscribe:record", async (payload, acknowledge) => {
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            const entityType = typeof payload?.entityType === "string" ? payload.entityType.trim() : "";
            const entityId = typeof payload?.entityId === "string" ? payload.entityId.trim() : "";
            if (!tenantId || !userId || !entityType || !entityId || entityId.length > 64 || /[^a-zA-Z0-9_-]/.test(entityId)) {
                const errPayload = { ok: false, code: "RECORD_FORBIDDEN", error: "Invalid record subscription parameters." };
                socket.emit("record:error", errPayload);
                acknowledge?.(errPayload);
                return;
            }
            const allowCfg = ALLOWED_RECORD_ENTITY_MAP[entityType];
            if (!allowCfg) {
                const errPayload = { ok: false, code: "RECORD_FORBIDDEN", error: `Entity type '${entityType}' is not permitted for live record subscription.` };
                socket.emit("record:error", errPayload);
                acknowledge?.(errPayload);
                return;
            }
            try {
                const db = prisma_1.rawPrisma || prisma_1.prisma;
                const delegate = db[allowCfg.model];
                const record = delegate?.findFirst
                    ? await delegate.findFirst({ where: { id: entityId, tenantId } })
                    : null;
                if (!record) {
                    const errPayload = { ok: false, code: "RECORD_FORBIDDEN", error: "Record not found in your workspace." };
                    socket.emit("record:error", errPayload);
                    acknowledge?.(errPayload);
                    return;
                }
                const isAdminOrHr = (socket.data.roles || []).some((r) => ["super_admin", "tenant_admin", "hr_admin", "manager"].includes(r));
                if (!isAdminOrHr && allowCfg.ownerField && record[allowCfg.ownerField] && record[allowCfg.ownerField] !== userId) {
                    const errPayload = { ok: false, code: "RECORD_FORBIDDEN", error: "Insufficient permissions for this record." };
                    socket.emit("record:error", errPayload);
                    acknowledge?.(errPayload);
                    return;
                }
                const qualifiedRoom = `tenant:${tenantId}:record:${entityType}:${entityId}`;
                socket.join(qualifiedRoom);
                acknowledge?.({ ok: true, room: qualifiedRoom });
            }
            catch {
                const errPayload = { ok: false, code: "RECORD_FORBIDDEN", error: "Failed to authorize record subscription." };
                socket.emit("record:error", errPayload);
                acknowledge?.(errPayload);
            }
        });
        socket.on("unsubscribe:record", (payload) => {
            const tenantId = socket.data.tenantId;
            if (tenantId && payload?.entityType && payload?.entityId) {
                socket.leave(`tenant:${tenantId}:record:${payload.entityType}:${payload.entityId}`);
            }
        });
        socket.on("chat:join", async (payload, acknowledge) => {
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            const threadId = typeof payload?.threadId === "string" ? payload.threadId.trim() : "";
            if (!tenantId || !userId || !threadId) {
                const err = { ok: false, code: "CHAT_UNAUTHORIZED", error: "Valid threadId and workspace session required." };
                socket.emit("chat:error", err);
                acknowledge?.(err);
                return;
            }
            const authCheck = await chat_service_1.ChatService.authorizeThread({
                threadId,
                tenantId,
                userId,
                roles: socket.data.roles || [],
                allowAdminModeration: false,
            });
            if (!authCheck.authorized) {
                const err = {
                    ok: false,
                    code: authCheck.code || "CHAT_UNAUTHORIZED",
                    error: authCheck.reason || "Access denied to conversation room.",
                };
                socket.emit("chat:error", { ...err, threadId });
                acknowledge?.(err);
                return;
            }
            const room = chat_service_1.ChatService.getThreadRoomName(tenantId, threadId);
            socket.join(room);
            acknowledge?.({ ok: true, room });
        });
        socket.on("chat:leave", (payload) => {
            const tenantId = socket.data.tenantId;
            const threadId = typeof payload?.threadId === "string" ? payload.threadId.trim() : "";
            if (tenantId && threadId) {
                socket.leave(chat_service_1.ChatService.getThreadRoomName(tenantId, threadId));
            }
        });
        socket.on("chat:send", async (payload, acknowledge) => {
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            const msgInput = payload?.message || payload || {};
            const clientTempId = msgInput.clientTempId || payload?.clientTempId || null;
            try {
                if (!tenantId || !userId) {
                    throw new Error("Workspace context required");
                }
                const result = await chat_service_1.ChatService.sendMessage({
                    tenantId,
                    userId,
                    roles: socket.data.roles || [],
                    senderNameHint: socket.data.name,
                    senderAvatarHint: socket.data.avatar,
                    senderEmailHint: socket.data.email,
                    threadId: payload?.threadId || msgInput.threadId,
                    content: msgInput.content ?? msgInput.text ?? "",
                    attachments: msgInput.attachments,
                    replyToId: msgInput.replyToId,
                    replyTo: msgInput.replyTo,
                    voiceNote: msgInput.voiceNote,
                    poll: msgInput.poll,
                    urlPreviews: msgInput.urlPreviews,
                    clientTempId,
                    mentions: msgInput.mentions,
                });
                const okPayload = {
                    ok: true,
                    clientTempId,
                    message: result.message,
                    deduplicated: result.deduplicated,
                };
                socket.emit("chat:send:ack", okPayload);
                acknowledge?.(okPayload);
            }
            catch (err) {
                const code = err?.code || "CHAT_SEND_FAILED";
                const errorMsg = err?.message || "Message could not be saved";
                socket.emit("chat:error", { code, error: errorMsg, clientTempId, threadId: payload?.threadId });
                acknowledge?.({ ok: false, code, error: errorMsg });
            }
        });
        socket.on("chat:typing", async (payload) => {
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            const threadId = typeof payload?.threadId === "string" ? payload.threadId.trim() : "";
            if (!tenantId || !userId || !threadId)
                return;
            const authCheck = await chat_service_1.ChatService.authorizeThread({
                threadId,
                tenantId,
                userId,
                roles: socket.data.roles || [],
                allowAdminModeration: false,
            });
            if (!authCheck.authorized) {
                socket.emit("chat:error", { code: "CHAT_UNAUTHORIZED", threadId, error: "Unauthorized typing event." });
                return;
            }
            await chat_service_1.ChatService.emitToAuthorizedThread({
                tenantId,
                threadId,
                event: "chat:typing",
                payload: {
                    threadId,
                    userId,
                    name: socket.data.name,
                    isTyping: Boolean(payload.isTyping),
                },
                participantUserIds: authCheck.participantUserIds,
                excludeUserId: userId,
            });
        });
        socket.on("chat:read", async (payload) => {
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            const threadId = typeof payload?.threadId === "string" ? payload.threadId.trim() : "";
            if (!tenantId || !userId || !threadId)
                return;
            try {
                await chat_service_1.ChatService.markThreadRead({
                    tenantId,
                    userId,
                    roles: socket.data.roles || [],
                    threadId,
                });
            }
            catch (err) {
                socket.emit("chat:error", {
                    code: err?.code || "CHAT_UNAUTHORIZED",
                    threadId,
                    error: err?.message || "Failed to update read receipt.",
                });
            }
        });
        socket.on("chat:delivered", async (payload) => {
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            const threadId = typeof payload?.threadId === "string" ? payload.threadId.trim() : "";
            if (!tenantId || !userId || !threadId || !Array.isArray(payload?.messageIds) || payload.messageIds.length === 0) {
                return;
            }
            try {
                await chat_service_1.ChatService.acknowledgeDelivered({
                    tenantId,
                    userId,
                    roles: socket.data.roles || [],
                    threadId,
                    messageIds: payload.messageIds,
                });
            }
            catch (err) {
                socket.emit("chat:error", {
                    code: err?.code || "CHAT_UNAUTHORIZED",
                    threadId,
                    error: err?.message || "Failed to acknowledge delivery.",
                });
            }
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
                    const finalStatus = isTimeout ? "missed" : "cancelled";
                    if (callId) {
                        const existing = await prisma_1.prisma.callHistoryRecord.findFirst({
                            where: { tenantId, callSessionId: callId },
                        });
                        if (existing) {
                            await prisma_1.prisma.callHistoryRecord.update({
                                where: { id: existing.id },
                                data: {
                                    status: finalStatus,
                                    endedAt: new Date(),
                                    notes: isTimeout
                                        ? "Call timed out after 60 seconds with no answer."
                                        : "Caller cancelled before answer.",
                                },
                            });
                            return;
                        }
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
                            status: finalStatus,
                            durationSeconds: 0,
                            callTime: new Date(),
                            startedAt: session?.startedAt || new Date(),
                            endedAt: new Date(),
                            threadId,
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
            let targetUserId = payload?.targetUserId || payload?.toUserId;
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
            // Check if target user is in the same tenant (with employeeId resolution)
            let targetUser = await prisma_1.prisma.user.findFirst({
                where: { id: targetUserId, profile: { tenantId } },
                include: { profile: true },
            });
            if (!targetUser) {
                const emp = await (prisma_1.rawPrisma || prisma_1.prisma).employee.findFirst({
                    where: { id: targetUserId, tenantId },
                    select: { userId: true },
                });
                if (emp?.userId) {
                    targetUser = await prisma_1.prisma.user.findFirst({
                        where: { id: emp.userId, profile: { tenantId } },
                        include: { profile: true },
                    });
                }
            }
            if (!targetUser) {
                emitCallForbidden(socket);
                return;
            }
            targetUserId = targetUser.id;
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
            // Create authoritative database-backed Call session with dual-write link
            let lifecycleSession = null;
            try {
                lifecycleSession = await call_lifecycle_service_1.CallLifecycleService.createCallSession({
                    tenantId,
                    callerId: socket.data.userId,
                    callerName,
                    callerPhone: payload?.callerPhone || "Internal Call",
                    callerEmail: socket.data.email || payload?.callerEmail,
                    callerAvatarUrl: callerAvatar || null,
                    targetUserId,
                    targetName,
                    targetAvatarUrl: targetAvatar || null,
                    callType,
                    threadId,
                    roomKey: callId,
                });
            }
            catch (err) {
                console.warn(`[SOCKET_CALL_INVITE_LIFECYCLE_WARN] Failed to create CallLifecycle session:`, err?.message);
            }
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
                dbCallId: lifecycleSession?.call?.id || callId,
                historyRecordId: lifecycleSession?.historyRecord?.id,
                timeoutTimer: setTimeout(async () => {
                    const current = exports.activeCalls.get(callId);
                    if (current && current.status === "ringing") {
                        console.log(`[CALL_TIMEOUT_60S] Server-authoritative 60s timeout for call: ${callId}`);
                        if (current.timeoutTimer) {
                            clearTimeout(current.timeoutTimer);
                            current.timeoutTimer = null;
                        }
                        exports.activeCalls.delete(callId);
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
                        ioInstance?.to(`user:${current.targetUserId}`).emit("call:timeout", {
                            callId,
                            cancelledBy: "system",
                        });
                        ioInstance?.to(`user:${current.targetUserId}`).emit("call.timeout", {
                            callId,
                            cancelledBy: "system",
                        });
                        ioInstance?.to(`user:${current.callerId}`).emit("call:timeout", {
                            callId,
                            cancelledBy: "system",
                        });
                        ioInstance?.to(`user:${current.callerId}`).emit("call.timeout", {
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
            // Persist fallback call history record if not already created
            if (!lifecycleSession) {
                try {
                    await (0, tenant_context_1.runWithTenantContext)({
                        tenantId,
                        userId: socket.data.userId,
                        roles: [],
                        status: "ACTIVE",
                        tenancyStrategy: "SHARED_SCHEMA",
                        db: prisma_1.rawPrisma,
                    }, async () => {
                        const db = prisma_1.rawPrisma || prisma_1.prisma;
                        const existing = await db.callHistoryRecord.findFirst({
                            where: { tenantId, callSessionId: callId },
                        });
                        if (existing) {
                            await db.callHistoryRecord.update({
                                where: { id: existing.id },
                                data: { status: "ringing", startedAt: new Date() },
                            });
                        }
                        else {
                            await db.callHistoryRecord.create({
                                data: {
                                    tenantId,
                                    callSessionId: callId,
                                    callerId: socket.data.userId,
                                    callerName,
                                    callerPhone: payload?.callerPhone || "Internal Call",
                                    callerAvatarUrl: callerAvatar || null,
                                    receiverId: targetUserId,
                                    receiverName: targetName || "Colleague",
                                    direction: "outgoing",
                                    callType,
                                    status: "ringing",
                                    durationSeconds: 0,
                                    callTime: new Date(),
                                    startedAt: new Date(),
                                    notes: `Initiated ${callType} call via Socket.IO`,
                                },
                            });
                        }
                    });
                }
                catch (e) {
                    console.warn(`[SOCKET_CALL_INVITE_DB_WARN] Failed to persist ringing call record:`, e?.message);
                }
            }
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
        socket.on("call:accept", async (payload) => {
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
            // ATOMIC DATABASE-LEVEL STATE TRANSITION (With two-level row locking):
            let atomicSuccess = true;
            let acceptResult = null;
            try {
                acceptResult = await call_lifecycle_service_1.CallLifecycleService.acceptCallTransaction({
                    tenantId: session.tenantId,
                    callId: session.dbCallId || session.callId,
                    calleeId: socket.data.userId,
                    deviceId: socket.id,
                });
            }
            catch (err) {
                if (err?.code === "CALL_CONFLICT") {
                    socket.emit("call.answered_elsewhere", { callId, answeredDeviceId: socket.id });
                    return;
                }
                // Fallback for isolated test harness with mocked DB
                try {
                    await (0, tenant_context_1.runWithTenantContext)({
                        tenantId: session.tenantId,
                        userId: socket.data.userId,
                        roles: [],
                        status: "ACTIVE",
                        tenancyStrategy: "SHARED_SCHEMA",
                        db: prisma_1.rawPrisma,
                    }, async () => {
                        const db = prisma_1.rawPrisma || prisma_1.prisma;
                        const res = await db.callHistoryRecord.updateMany({
                            where: {
                                tenantId: session.tenantId,
                                callSessionId: callId,
                                receiverId: socket.data.userId,
                                status: "ringing",
                            },
                            data: { status: "connected" },
                        });
                        if (res.count === 0) {
                            atomicSuccess = false;
                        }
                    });
                }
                catch {
                    atomicSuccess = true;
                }
            }
            if (!atomicSuccess) {
                emitCallForbidden(socket);
                return;
            }
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            session.status = "connected";
            const acceptPayload = {
                callId,
                acceptedBy: socket.data.userId,
                acceptedByName: socket.data.name || "Colleague",
                answeredAt: acceptResult?.call?.answeredAt || new Date(),
            };
            ioInstance?.to(`user:${session.callerId}`).emit("call:accepted", acceptPayload);
            ioInstance?.to(`user:${session.callerId}`).emit("call.accepted", acceptPayload);
            void pusher_service_1.PusherService.triggerUserEvent(session.tenantId, session.callerId, "call:accepted", acceptPayload).catch(() => { });
            void pusher_service_1.PusherService.triggerUserEvent(session.tenantId, session.callerId, "call.accepted", acceptPayload).catch(() => { });
            // Multi-device / multi-tab suppression: silence ringing on other tabs of callee
            socket.to(`user:${session.targetUserId}`).emit("call.answered_elsewhere", {
                callId,
                answeredDeviceId: socket.id,
            });
            socket.to(`user:${session.targetUserId}`).emit("call:answered_elsewhere", {
                callId,
                answeredDeviceId: socket.id,
            });
            void pusher_service_1.PusherService.triggerUserEvent(session.tenantId, session.targetUserId, "call.answered_elsewhere", {
                callId,
                answeredDeviceId: socket.id,
            }).catch(() => { });
            void pusher_service_1.PusherService.triggerUserEvent(session.tenantId, session.targetUserId, "call:answered_elsewhere", {
                callId,
                answeredDeviceId: socket.id,
            }).catch(() => { });
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
            const rejectPayload = {
                callId,
                rejectedBy: socket.data.userId,
                rejectedByName: socket.data.name || "Colleague",
                reason: payload?.reason || "declined",
            };
            ioInstance?.to(`user:${session.callerId}`).emit("call:rejected", rejectPayload);
            ioInstance?.to(`user:${session.callerId}`).emit("call.rejected", rejectPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, session.callerId, "call:rejected", rejectPayload).catch(() => { });
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, session.callerId, "call.rejected", rejectPayload).catch(() => { });
            // Dismiss Web Push notifications
            void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                tenantId,
                targetUserId: session.targetUserId,
                callId,
                reason: "rejected",
            }).catch(() => { });
            // Authoritative database rejection transition
            void call_lifecycle_service_1.CallLifecycleService.rejectCallTransaction({
                tenantId,
                callId: session.dbCallId || session.callId,
                calleeId: socket.data.userId,
                reason: payload?.reason || "declined",
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
                    const db = prisma_1.rawPrisma || prisma_1.prisma;
                    const existing = await db.callHistoryRecord.findFirst({
                        where: { tenantId, callSessionId: callId },
                    });
                    if (existing) {
                        await db.callHistoryRecord.update({
                            where: { id: existing.id },
                            data: {
                                status: "rejected",
                                endedAt: new Date(),
                                notes: payload?.reason ? `Rejected: ${payload.reason}` : "Call rejected by recipient.",
                            },
                        });
                    }
                    else {
                        await db.callHistoryRecord.create({
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
                    }
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
            let resolvedTargetId = targetUserId;
            if (resolvedTargetId !== expectedPeerId) {
                const resolved = await chat_service_1.ChatService.resolveParticipantUserInTenant(tenantId, String(targetUserId)).catch(() => null);
                if (resolved?.userId)
                    resolvedTargetId = resolved.userId;
            }
            if (resolvedTargetId !== expectedPeerId) {
                emitCallForbidden(socket);
                return;
            }
            // Legal transition: caller while ringing, or connected call ended while client UI was still transitioning
            if (session.callerId !== socket.data.userId || (session.status !== "ringing" && session.status !== "connected") || resolvedTargetId !== session.targetUserId) {
                emitCallForbidden(socket);
                return;
            }
            if (session.timeoutTimer) {
                clearTimeout(session.timeoutTimer);
                session.timeoutTimer = null;
            }
            exports.activeCalls.delete(callId);
            const cancelPayload = {
                callId,
                cancelledBy: socket.data.userId,
                cancelledByName: socket.data.name || "Colleague",
            };
            for (const peerId of getActiveCallParticipantIds(session)) {
                if (peerId !== socket.data.userId) {
                    ioInstance?.to(`user:${peerId}`).emit("call:cancelled", cancelPayload);
                    ioInstance?.to(`user:${peerId}`).emit("call.cancelled", cancelPayload);
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:cancelled", cancelPayload).catch(() => { });
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call.cancelled", cancelPayload).catch(() => { });
                }
            }
            // Authoritative database cancellation transition
            void call_lifecycle_service_1.CallLifecycleService.cancelCallTransaction({
                tenantId,
                callId: session.dbCallId || session.callId,
                callerId: socket.data.userId,
                reason: "cancelled",
            }).catch(() => { });
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
        // 5. WEBRTC SIGNALING (SDP Offer / Answer & ICE Candidates — supports 1:1 & multi-peer mesh)
        socket.on("call:signal", async (payload) => {
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const callId = payload?.callId;
            const tenantId = socket.data.tenantId;
            if (!callId || !targetUserId || !tenantId || !payload?.signal || typeof payload.signal !== "object") {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            let authorized = false;
            if (session && session.tenantId === tenantId && (session.status === "ringing" || session.status === "connected")) {
                const participants = getActiveCallParticipantIds(session);
                authorized = participants.includes(socket.data.userId) && participants.includes(targetUserId);
            }
            if (!authorized) {
                try {
                    const db = prisma_1.rawPrisma || prisma_1.prisma;
                    const dbCall = await db.call.findFirst({
                        where: {
                            tenantId,
                            OR: [{ id: callId }, { roomKey: callId }],
                            status: { in: ["RINGING", "ACTIVE"] },
                        },
                        include: { participants: true },
                    });
                    if (dbCall) {
                        const validStates = new Set(["RINGING", "INVITED", "JOINED", "RECONNECTING"]);
                        const hasSender = dbCall.participants.some((p) => p.userId === socket.data.userId && validStates.has(p.state));
                        const hasTarget = dbCall.participants.some((p) => p.userId === targetUserId && validStates.has(p.state));
                        authorized = hasSender && hasTarget;
                    }
                }
                catch {
                    authorized = false;
                }
            }
            if (!authorized) {
                emitCallForbidden(socket);
                return;
            }
            const signalPayload = {
                callId,
                senderId: socket.data.userId,
                fromUserId: socket.data.userId,
                senderName: socket.data.name || "Colleague",
                signal: payload.signal,
            };
            ioInstance?.to(`user:${targetUserId}`).emit("call:signal", signalPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:signal", signalPayload).catch(() => { });
        });
        // 5.1 MEDIA STATE NOTIFICATION (Screen Sharing, Cam/Mic toggles — supports 1:1 & multi-peer mesh)
        socket.on("call:media-state", (payload) => {
            const callId = payload?.callId;
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const participants = getActiveCallParticipantIds(session);
            if (!participants.includes(socket.data.userId)) {
                emitCallForbidden(socket);
                return;
            }
            if (targetUserId && !participants.includes(targetUserId)) {
                emitCallForbidden(socket);
                return;
            }
            if (session.status !== "connected") {
                emitCallForbidden(socket);
                return;
            }
            const mediaPayload = {
                callId,
                type: payload?.type || "screen-share",
                active: !!payload?.active,
                fromUserId: socket.data.userId,
                fromUserName: socket.data.name || "Colleague",
            };
            const recipients = targetUserId
                ? [targetUserId]
                : participants.filter((id) => id !== socket.data.userId);
            for (const peerId of recipients) {
                ioInstance?.to(`user:${peerId}`).emit("call:media-state", mediaPayload);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:media-state", mediaPayload).catch(() => { });
            }
        });
        // 6. HANGUP / END CALL
        socket.on("call:hangup", async (payload) => {
            const targetUserId = payload?.targetUserId || payload?.toUserId;
            const callId = payload?.callId;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== tenantId) {
                emitCallForbidden(socket);
                return;
            }
            const participants = getActiveCallParticipantIds(session);
            if (!participants.includes(socket.data.userId)) {
                emitCallForbidden(socket);
                return;
            }
            if (targetUserId) {
                let resolvedTargetId = targetUserId;
                if (!participants.includes(resolvedTargetId)) {
                    const resolved = await chat_service_1.ChatService.resolveParticipantUserInTenant(tenantId, String(targetUserId)).catch(() => null);
                    if (resolved?.userId)
                        resolvedTargetId = resolved.userId;
                }
                if (!participants.includes(resolvedTargetId)) {
                    emitCallForbidden(socket);
                    return;
                }
            }
            // Legal lifecycle transition: caller or participant when connected or transitioning
            if (session.status !== "connected" && session.status !== "ringing") {
                emitCallForbidden(socket);
                return;
            }
            const otherParticipants = participants.filter((id) => id !== socket.data.userId);
            const actorName = socket.data.name || "Colleague";
            // If 3+ participants are in the call and a non-host extra participant leaves while >=2 remain, keep call alive for remaining peers
            if (session.extraParticipantIds &&
                session.extraParticipantIds.has(socket.data.userId) &&
                otherParticipants.length >= 2) {
                session.extraParticipantIds.delete(socket.data.userId);
                const leftPayload = {
                    callId,
                    userId: socket.data.userId,
                    userName: actorName,
                    timestamp: new Date().toISOString(),
                };
                for (const peerId of otherParticipants) {
                    ioInstance?.to(`user:${peerId}`).emit("call:participant_left", leftPayload);
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:participant_left", leftPayload).catch(() => { });
                }
                try {
                    const db = prisma_1.rawPrisma || prisma_1.prisma;
                    await db.callParticipant.updateMany({
                        where: {
                            userId: socket.data.userId,
                            call: { tenantId, OR: [{ id: callId }, { roomKey: callId }] },
                        },
                        data: { state: "LEFT", leftAt: new Date(), leaveReason: "PARTICIPANT_LEFT" },
                    });
                }
                catch { }
                return;
            }
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
            exports.activeCalls.delete(callId);
            const isCaller = session.callerId === socket.data.userId;
            let durationSeconds = Math.max(0, Math.round(Number(payload?.durationSeconds) || 0));
            const callType = session.callType || payload?.callType || "audio";
            const threadId = session.threadId || `direct_${[session.callerId, session.targetUserId].sort().join("_")}`;
            // Authoritative database termination
            try {
                const term = await call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                    tenantId,
                    callId: session.dbCallId || session.callId,
                    actorId: socket.data.userId,
                    endReason: isCaller ? "HOST_ENDED" : "PEER_ENDED",
                    finalHistoryStatus: "completed",
                });
                if (term && term.durationSeconds !== undefined) {
                    durationSeconds = term.durationSeconds;
                }
            }
            catch (err) {
                console.warn("[SOCKET_HANGUP_LIFECYCLE_WARN]", err?.message);
            }
            const endedPayload = {
                callId,
                endedBy: socket.data.userId,
                endedByName: actorName,
                durationSeconds,
            };
            for (const peerId of otherParticipants) {
                ioInstance?.to(`user:${peerId}`).emit("call:ended", endedPayload);
                ioInstance?.to(`user:${peerId}`).emit("call.ended", endedPayload);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:ended", endedPayload).catch(() => { });
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call.ended", endedPayload).catch(() => { });
            }
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
        // 6.1 RECONNECT PARTICIPANT (Restore JOINED state within 30s grace window)
        const handleReconnect = async (payload) => {
            const callId = payload?.callId;
            const tenantId = socket.data.tenantId;
            if (!callId || !tenantId)
                return;
            const session = exports.activeCalls.get(callId);
            if (!session || session.tenantId !== tenantId)
                return;
            // Clear any pending grace timer for this user
            if (session.reconnectTimers?.has(socket.data.userId)) {
                clearTimeout(session.reconnectTimers.get(socket.data.userId));
                session.reconnectTimers.delete(socket.data.userId);
            }
            try {
                await call_lifecycle_service_1.CallLifecycleService.reconnectParticipantTransaction({
                    tenantId,
                    callId: session.dbCallId || session.callId,
                    userId: socket.data.userId,
                });
            }
            catch (e) {
                console.warn("[SOCKET_RECONNECT_WARN]", e?.message);
            }
            const joinedPayload = {
                callId,
                userId: socket.data.userId,
                reconnected: true,
            };
            for (const peerId of getActiveCallParticipantIds(session)) {
                if (peerId !== socket.data.userId) {
                    ioInstance?.to(`user:${peerId}`).emit("call.participant.joined", joinedPayload);
                    ioInstance?.to(`user:${peerId}`).emit("call:participant:joined", joinedPayload);
                }
            }
            socket.emit("call.reconnected", { callId });
        };
        socket.on("call:reconnect", handleReconnect);
        socket.on("call.reconnect", handleReconnect);
        // 6.2 IN-CALL COLLEAGUE INVITATION (WebRTC P2P Mesh Direct Ringing)
        const handleInviteColleague = async (payload, acknowledge) => {
            const { callId, targetUserId: rawTargetUserId } = payload || {};
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            if (!callId || !rawTargetUserId || !tenantId) {
                acknowledge?.({ success: false, error: "Invalid invite parameters", code: "CALL_FORBIDDEN" });
                return;
            }
            try {
                let targetUserId = rawTargetUserId;
                const resolved = await chat_service_1.ChatService.resolveParticipantUserInTenant(tenantId, String(rawTargetUserId)).catch(() => null);
                if (resolved?.userId)
                    targetUserId = resolved.userId;
                const result = await call_lifecycle_service_1.CallLifecycleService.addParticipantToActiveCall({
                    tenantId,
                    callId,
                    inviterId: userId,
                    targetUserId,
                    maxParticipantsLimit: 6,
                });
                const session = exports.activeCalls.get(callId);
                if (session) {
                    if (!session.extraParticipantIds)
                        session.extraParticipantIds = new Set();
                    session.extraParticipantIds.add(targetUserId);
                }
                const inviterName = socket.data.name || "Colleague";
                const resolvedCallType = result.callType === "video" ? "video" : "audio";
                const incomingPayload = {
                    callId,
                    callerId: userId,
                    fromUserId: userId,
                    callerName: inviterName,
                    callerAvatar: socket.data.avatar || null,
                    callerAvatarUrl: socket.data.avatar || null,
                    callType: resolvedCallType,
                    type: resolvedCallType,
                    isAdditionalParticipant: true,
                    tenantId,
                    timestamp: new Date().toISOString(),
                };
                ioInstance?.to(`user:${targetUserId}`).emit("call:incoming", incomingPayload);
                ioInstance?.to(`user:${targetUserId}`).emit("call.incoming", incomingPayload);
                void pusher_service_1.PusherService.triggerUserEvent(tenantId, targetUserId, "call:incoming", incomingPayload).catch(() => { });
                void incoming_call_push_service_1.IncomingCallPushService.sendIncomingCallPush({
                    tenantId,
                    targetUserId,
                    callId,
                    callerId: userId,
                    callerName: inviterName,
                    callerAvatar: socket.data.avatar || null,
                    callType: resolvedCallType,
                }).catch(() => { });
                // Broadcast to all existing call peers
                const peerNotice = {
                    callId,
                    participant: result.participant,
                    invitedUser: result.invitedUser,
                };
                if (session) {
                    for (const peerId of getActiveCallParticipantIds(session)) {
                        if (peerId !== targetUserId) {
                            ioInstance?.to(`user:${peerId}`).emit("call:participant_invited", peerNotice);
                            void pusher_service_1.PusherService.triggerUserEvent(tenantId, peerId, "call:participant_invited", peerNotice).catch(() => { });
                        }
                    }
                }
                else {
                    socket.emit("call:participant_invited", peerNotice);
                }
                acknowledge?.({ success: true, data: result });
            }
            catch (err) {
                const code = err.code || "INVITE_FAILED";
                acknowledge?.({ success: false, error: err.message, code });
                socket.emit("call:error", { code, message: err.message });
            }
        };
        socket.on("call:invite_colleague", handleInviteColleague);
        socket.on("call.invite_colleague", handleInviteColleague);
        // 6.3 IN-CALL COLLEAGUE ACCEPTANCE (WebRTC P2P Mesh Join)
        const handleAcceptInvitation = async (payload, acknowledge) => {
            const { callId, deviceId = "default" } = payload || {};
            const tenantId = socket.data.tenantId;
            const userId = socket.data.userId;
            if (!callId || !tenantId) {
                acknowledge?.({ success: false, error: "Invalid accept parameters", code: "CALL_FORBIDDEN" });
                return;
            }
            try {
                const result = await call_lifecycle_service_1.CallLifecycleService.acceptParticipantInvitation({
                    tenantId,
                    callId,
                    userId,
                    deviceId,
                });
                const session = exports.activeCalls.get(callId);
                if (session) {
                    if (!session.extraParticipantIds)
                        session.extraParticipantIds = new Set();
                    session.extraParticipantIds.add(userId);
                }
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
                    for (const id of getActiveCallParticipantIds(session))
                        targetIds.add(id);
                }
                if (Array.isArray(result.activeParticipants)) {
                    for (const p of result.activeParticipants) {
                        if (p?.userId)
                            targetIds.add(p.userId);
                    }
                }
                for (const pid of targetIds) {
                    ioInstance?.to(`user:${pid}`).emit("call:participant_joined", joinedPayload);
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, pid, "call:participant_joined", joinedPayload).catch(() => { });
                }
                void incoming_call_push_service_1.IncomingCallPushService.sendCallCancelledPush({
                    tenantId,
                    targetUserId: userId,
                    callId,
                    reason: "accepted",
                }).catch(() => { });
                acknowledge?.({ success: true, data: result });
            }
            catch (err) {
                const code = err.code || "ACCEPT_FAILED";
                acknowledge?.({ success: false, error: err.message, code });
                socket.emit("call:error", { code, message: err.message });
            }
        };
        socket.on("call:accept_invitation", handleAcceptInvitation);
        socket.on("call.accept_invitation", handleAcceptInvitation);
        // 7. GROUP AUDIO & VIDEO CALLS & MULTI-PARTY MEETINGS
        socket.on("group-call:start", async (payload, acknowledge) => {
            // TRY_WRAPPER_GROUP_CALL_START
            try {
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
                        // Fallback: Pusher + OS Web Push
                        pusher_service_1.PusherService.triggerUserEvent(tenantId, m.userId, "group-call:incoming", invitePayload).catch((err) => console.warn("Pusher group-call:incoming delivery warning:", err?.message || err));
                        void incoming_call_push_service_1.IncomingCallPushService.sendIncomingCallPush({
                            tenantId,
                            targetUserId: m.userId,
                            callId,
                            callerId: socket.data.userId,
                            callerName: `${socket.data.name || "Colleague"} (${group.name})`,
                            callerAvatar: group.avatarUrl || socket.data.avatar,
                            callType: callType || "audio",
                            threadId: `group_${groupId}`,
                        }).catch(() => { });
                    }
                }
                // Record system event in group conversation
                await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${groupId}`, socket.data.userId, "group_call_started", `${socket.data.name} started a group ${callType} meeting.`, { groupId, callId, callType });
            }
            catch (err) {
                console.error("[Socket] group-call:start error:", err);
                acknowledge?.({ success: false, code: "CALL_ERROR", message: err?.message || "Failed to start meeting." });
            }
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
            const joinedPayload = {
                callId,
                userId: socket.data.userId,
                name: participant.name,
                avatar: participant.avatar,
                role: participant.role,
                isMuted: participant.isMuted,
                isCameraOff: participant.isCameraOff,
            };
            // Notify other participants in room (Socket.IO + Pusher)
            socket.to(`group_call_${callId}`).emit("group-call:user_joined", joinedPayload);
            for (const pid of session.participants.keys()) {
                if (pid !== socket.data.userId) {
                    void pusher_service_1.PusherService.triggerUserEvent(tenantId, pid, "group-call:user_joined", joinedPayload).catch(() => { });
                }
            }
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
            const senderIsMember = members.some((m) => m.userId === socket.data.userId) ||
                session.invitedUserIds.has(socket.data.userId) ||
                session.participants.has(socket.data.userId);
            const targetIsMember = members.some((m) => m.userId === payload.targetUserId) ||
                session.invitedUserIds.has(payload.targetUserId) ||
                session.participants.has(payload.targetUserId);
            if (!senderIsMember || !targetIsMember) {
                emitCallForbidden(socket);
                return;
            }
            const grpSignalPayload = {
                callId: payload.callId,
                senderId: socket.data.userId,
                fromUserId: socket.data.userId,
                signal: payload.signal,
            };
            ioInstance?.to(`user:${payload.targetUserId}`).emit("group-call:signal", grpSignalPayload);
            void pusher_service_1.PusherService.triggerUserEvent(tenantId, payload.targetUserId, "group-call:signal", grpSignalPayload).catch(() => { });
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
                    void incoming_call_push_service_1.IncomingCallPushService.sendIncomingCallPush({
                        tenantId,
                        targetUserId: u.id,
                        callId,
                        callerId: socket.data.userId,
                        callerName: `${socket.data.name || "Colleague"} (${session.groupName || "Group Meeting"})`,
                        callerAvatar: session.groupAvatarUrl || socket.data.avatar,
                        callType: session.callType,
                        threadId: `group_${session.groupId}`,
                    }).catch(() => { });
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
            // Validate group membership or explicit meeting invitation
            const member = await (prisma_1.rawPrisma || prisma_1.prisma).chatGroupMember.findFirst({
                where: { groupId: session.groupId, userId: socket.data.userId },
            });
            if (!member && !session.invitedUserIds.has(socket.data.userId) && !session.participants.has(socket.data.userId)) {
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
            clearInterval(presenceHeartbeat);
            const tId = socket.data.tenantId;
            const uId = socket.data.userId;
            if (tId && uId) {
                let remainingSocketCount = 0;
                if (tenantPresence.has(tId)) {
                    const tenantMap = tenantPresence.get(tId);
                    const currentCount = tenantMap.get(uId) || 0;
                    if (currentCount <= 1) {
                        tenantMap.delete(uId);
                        remainingSocketCount = 0;
                        void syncDistributedPresence(tId, uId, 0);
                        ioInstance?.to(`tenant:${tId}`).emit("presence:update", { userId: uId, status: "offline" });
                    }
                    else {
                        remainingSocketCount = currentCount - 1;
                        tenantMap.set(uId, remainingSocketCount);
                        void syncDistributedPresence(tId, uId, remainingSocketCount);
                    }
                }
                // Also check if any other socket exists in the user room
                const userRoom = ioInstance?.sockets.adapter.rooms.get(`user:${uId}`);
                const userRoomSize = userRoom ? userRoom.size : 0;
                // ONLY handle disconnect if no other authenticated socket remains for this user in this tenant
                if (remainingSocketCount === 0 && userRoomSize === 0) {
                    const graceWindowMs = Number(process.env.CALL_RECONNECT_GRACE_MS) || 30000;
                    for (const [callId, session] of exports.activeCalls) {
                        if (session.tenantId === tId && (session.callerId === uId || session.targetUserId === uId)) {
                            if (session.status === "ringing") {
                                if (session.timeoutTimer) {
                                    clearTimeout(session.timeoutTimer);
                                    session.timeoutTimer = null;
                                }
                                const peerId = session.callerId === uId ? session.targetUserId : session.callerId;
                                ioInstance?.to(`user:${peerId}`).emit("call:cancelled", {
                                    callId,
                                    cancelledBy: uId,
                                });
                                ioInstance?.to(`user:${peerId}`).emit("call.cancelled", {
                                    callId,
                                    cancelledBy: uId,
                                });
                                exports.activeCalls.delete(callId);
                                void call_lifecycle_service_1.CallLifecycleService.cancelCallTransaction({
                                    tenantId: tId,
                                    callId: session.dbCallId || session.callId,
                                    callerId: uId,
                                }).catch(() => { });
                                continue;
                            }
                            // Connected call: 30-second reconnect grace window!
                            if (session.status === "connected") {
                                const peerId = session.callerId === uId ? session.targetUserId : session.callerId;
                                // If peer is already disconnected/reconnecting, both participants have disconnected -> finalize call
                                if (session.reconnectTimers?.has(peerId)) {
                                    console.log(`[CALL_ALL_DISCONNECTED] Both participants disconnected for call ${callId}`);
                                    clearTimeout(session.reconnectTimers.get(peerId));
                                    session.reconnectTimers.delete(peerId);
                                    exports.activeCalls.delete(callId);
                                    void call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                                        tenantId: tId,
                                        callId: session.dbCallId || session.callId,
                                        actorId: "SYSTEM",
                                        endReason: "ALL_DISCONNECTED",
                                        finalHistoryStatus: "completed",
                                    }).catch(() => { });
                                    continue;
                                }
                                // Mark participant RECONNECTING in DB
                                void call_lifecycle_service_1.CallLifecycleService.markParticipantReconnecting({
                                    tenantId: tId,
                                    callId: session.dbCallId || session.callId,
                                    userId: uId,
                                    graceSeconds: Math.round(graceWindowMs / 1000),
                                }).catch(() => { });
                                // Notify peer that uId is reconnecting
                                const reconnPayload = {
                                    callId,
                                    userId: uId,
                                    graceSecondsRemaining: Math.round(graceWindowMs / 1000),
                                };
                                ioInstance?.to(`user:${peerId}`).emit("call.participant.reconnecting", reconnPayload);
                                ioInstance?.to(`user:${peerId}`).emit("call:participant:reconnecting", reconnPayload);
                                // Schedule grace timer in memory
                                if (!session.reconnectTimers)
                                    session.reconnectTimers = new Map();
                                if (session.reconnectTimers.has(uId)) {
                                    clearTimeout(session.reconnectTimers.get(uId));
                                }
                                session.reconnectTimers.set(uId, setTimeout(async () => {
                                    const currentSession = exports.activeCalls.get(callId);
                                    if (currentSession && currentSession.status === "connected") {
                                        console.log(`[CALL_RECONNECT_EXPIRED] Participant ${uId} failed to reconnect within grace for call ${callId}`);
                                        let termResult = null;
                                        try {
                                            termResult = await call_lifecycle_service_1.CallLifecycleService.terminateCallTransaction({
                                                tenantId: tId,
                                                callId: currentSession.dbCallId || currentSession.callId,
                                                actorId: "SYSTEM",
                                                endReason: "PEER_DISCONNECTED",
                                                finalHistoryStatus: "completed",
                                            });
                                        }
                                        catch { }
                                        const duration = termResult?.durationSeconds || 0;
                                        const endedPayload = {
                                            callId,
                                            endedBy: uId,
                                            reason: "peer_disconnected",
                                            durationSeconds: duration,
                                        };
                                        ioInstance?.to(`user:${peerId}`).emit("call:ended", endedPayload);
                                        ioInstance?.to(`user:${peerId}`).emit("call.ended", endedPayload);
                                        exports.activeCalls.delete(callId);
                                    }
                                }, graceWindowMs));
                            }
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
const restPresenceMap = new Map();
const REST_PRESENCE_TTL_MS = 75_000;
function getOnlineUsersForTenant(tenantId) {
    const localSet = new Set();
    const nowMs = Date.now();
    const users = tenantPresence.get(tenantId);
    if (users) {
        for (const [userId, count] of users.entries()) {
            if (count > 0)
                localSet.add(userId);
        }
    }
    const restUsers = restPresenceMap.get(tenantId);
    if (restUsers) {
        for (const [userId, expiresAt] of restUsers.entries()) {
            if (expiresAt > nowMs) {
                localSet.add(userId);
            }
            else {
                restUsers.delete(userId);
            }
        }
    }
    const cached = distributedPresenceCache.get(tenantId);
    if (cached && cached.expiresAt > nowMs) {
        for (const uid of cached.userIds)
            localSet.add(uid);
    }
    return Array.from(localSet);
}
async function recordRestUserPresence(tenantId, userId, status = "online") {
    if (!tenantId || tenantId === "default" || !userId)
        return;
    let tenantMap = restPresenceMap.get(tenantId);
    if (!tenantMap) {
        tenantMap = new Map();
        restPresenceMap.set(tenantId, tenantMap);
    }
    if (status === "online") {
        tenantMap.set(userId, Date.now() + REST_PRESENCE_TTL_MS);
    }
    else {
        tenantMap.delete(userId);
    }
    distributedPresenceCache.delete(tenantId);
    try {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        if (!db.chatUserPresence?.upsert)
            return;
        const now = new Date();
        await db.chatUserPresence.upsert({
            where: {
                tenantId_userId: {
                    tenantId,
                    userId,
                },
            },
            create: {
                tenantId,
                userId,
                status,
                activeConnections: status === "online" ? 1 : 0,
                instanceId: SOCKET_INSTANCE_ID,
                lastSeenAt: now,
            },
            update: {
                status,
                ...(status === "offline" ? { activeConnections: 0 } : {}),
                instanceId: SOCKET_INSTANCE_ID,
                lastSeenAt: now,
            },
        });
        distributedPresenceCache.delete(tenantId);
    }
    catch {
        // Non-fatal presence update; restPresenceMap already tracks in-process state
    }
}
async function getOnlineUsersForTenantAsync(tenantId) {
    const onlineSet = new Set(getOnlineUsersForTenant(tenantId));
    const cached = distributedPresenceCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        for (const uid of cached.userIds)
            onlineSet.add(uid);
        return Array.from(onlineSet);
    }
    try {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        if (db.chatUserPresence?.findMany) {
            const freshCutoff = new Date(Date.now() - 60 * 1000);
            const rows = await db.chatUserPresence.findMany({
                where: {
                    tenantId,
                    status: "online",
                    lastSeenAt: { gte: freshCutoff },
                },
                select: { userId: true },
            });
            const dbIds = rows.map((r) => String(r.userId));
            distributedPresenceCache.set(tenantId, { userIds: dbIds, expiresAt: Date.now() + 3000 });
            for (const uid of dbIds)
                onlineSet.add(uid);
        }
    }
    catch {
        // Fallback to local map
    }
    return Array.from(onlineSet);
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
