import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma, rawPrisma } from "./prisma";
import { runWithTenantContext } from "./context/tenant-context";
import { verifyToken } from "./lib/jwt";
import { assertWorkspaceActive, getWorkspacePolicy } from "./services/workspace-policy.service";
import { recordSystemEvent } from "./services/chat-system-events.service";
import { NotificationService } from "./services/notification.service";

let ioInstance: SocketIOServer | null = null;
const tenantPresence = new Map<string, Map<string, number>>();

interface ActiveCallSession {
  callId: string;
  tenantId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  targetUserId: string;
  targetName?: string;
  targetAvatar?: string | null;
  callType: "audio" | "video";
  threadId?: string;
  startedAt: Date;
  status: "ringing" | "connected" | "ended";
}
const activeCalls = new Map<string, ActiveCallSession>();

export function initSocket(server: HttpServer, allowedOrigins: string[]) {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
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
      const identity = verifyToken(socket.handshake.auth?.token || "");
      if ((identity as any).mfaPending) throw new Error("Complete two-factor verification");
      const user = await prisma.user.findUnique({ where: { id: identity.userId }, include: { profile: true, roles: true } });
      if (!user) throw new Error("Account not found");
      const isSuper = user.roles.some((role) => role.role === "super_admin");
      const tenantId = isSuper ? (identity.tenantId || null) : (user.profile?.tenantId || null);
      if (!isSuper && !tenantId) throw new Error("Workspace context required");
      let policy: any = null;
      if (tenantId) {
        policy = await getWorkspacePolicy(tenantId);
        if (!isSuper) assertWorkspaceActive(policy);
      }
      const tokenExpiry = Number((identity as any).exp) * 1000;
      const expiry = !isSuper && policy?.expiresAt ? Math.min(tokenExpiry, new Date(policy.expiresAt).getTime()) : tokenExpiry;
      socket.data = { tenantId, userId: user.id, name: user.profile?.fullName || user.email, avatar: user.profile?.avatarUrl, isSuper, expiry };
      next();
    } catch { next(new Error("Workspace authentication required")); }
  });

  ioInstance.on("connection", (socket: Socket) => {
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
        const tenantMap = tenantPresence.get(tId)!;
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
        verifyToken(socket.handshake.auth?.token || "");
        if (socket.data.tenantId && !socket.data.isSuper) {
          assertWorkspaceActive(await getWorkspacePolicy(socket.data.tenantId));
        }
        next();
      } catch { socket.disconnect(true); next(new Error("Workspace access expired")); }
    });

    // Join tenant room for isolated multi-tenant broadcasting
    socket.on("join-tenant", (tenantId: string) => {
      if (tenantId === socket.data.tenantId) {
        socket.join(`tenant:${tenantId}`);
        console.log(`⚡ [WebSocket] Socket ${socket.id} joined room tenant:${tenantId}`);
      }
    });

    // Subscribe to specific entity record rooms
    socket.on("subscribe:record", (payload: { entityType: string; entityId: string }) => {
      if (payload?.entityType && payload?.entityId) {
        socket.join(`record:${payload.entityType}:${payload.entityId}`);
      }
    });

    socket.on("unsubscribe:record", (payload: { entityType: string; entityId: string }) => {
      if (payload?.entityType && payload?.entityId) {
        socket.leave(`record:${payload.entityType}:${payload.entityId}`);
      }
    });


    // Handle real-time chat direct messages with DB persistence
    socket.on("chat:send", async (payload: { tenantId?: string; threadId: string; message: any }) => {
      try {
        const tenantId = socket.data.tenantId;
        const msg = payload.message || {};
        const saved = await prisma.chatMessage.create({
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
      } catch (err: any) {
        console.error("Socket chat:send DB error:", err.message);
        socket.emit("chat:error", { error: "Message could not be saved" });
      }
    });

    // Handle real-time chat typing indicator
    socket.on("chat:typing", (payload: { threadId: string; isTyping: boolean }) => {
      if (!socket.data.tenantId || !payload?.threadId) return;
      socket.to(`tenant:${socket.data.tenantId}`).emit("chat:typing", {
        threadId: payload.threadId,
        userId: socket.data.userId,
        name: socket.data.name,
        isTyping: !!payload.isTyping,
      });
    });

    // Handle real-time chat read receipt
    socket.on("chat:read", async (payload: { threadId: string }) => {
      if (!socket.data.tenantId || !payload?.threadId) return;
      const tId = socket.data.tenantId;
      const uId = socket.data.userId;
      try {
        await prisma.chatReadReceipt.upsert({
          where: { tenantId_threadId_userId: { tenantId: tId, threadId: payload.threadId, userId: uId } },
          create: { tenantId: tId, threadId: payload.threadId, userId: uId, lastReadAt: new Date() },
          update: { lastReadAt: new Date() },
        });
        ioInstance?.to(`tenant:${tId}`).emit("chat:read", {
          threadId: payload.threadId,
          userId: uId,
          readAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn("Socket chat:read error:", err.message);
      }
    });

    // Handle real-time message delivery acknowledgment
    socket.on("chat:delivered", async (payload: { messageIds: string[]; threadId: string }) => {
      if (!socket.data.tenantId || !payload?.messageIds?.length) return;
      const tId = socket.data.tenantId;
      const uId = socket.data.userId;
      ioInstance?.to(`tenant:${tId}`).emit("chat:delivered", {
        messageIds: payload.messageIds,
        threadId: payload.threadId,
        userId: uId,
        deliveredAt: new Date().toISOString(),
      });
    });

    // =========================================================================
    // WEBRTC CALL SIGNALING & LIFECYCLE (Audio, Video, Group Calls)
    // =========================================================================

    // 1. INITIATE CALL (1-on-1)
    socket.on("call:invite", async (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const callType = (payload?.callType || payload?.type || "audio").toLowerCase() as "audio" | "video";
      const callId = payload?.callId || `call_${Date.now()}`;
      const tenantId = socket.data.tenantId;

      if (!targetUserId || !tenantId) return;

      // Prevent calling self
      if (targetUserId === socket.data.userId) {
        socket.emit("call:error", { message: "Cannot initiate call to yourself." });
        return;
      }

      // Check if target user is in the same tenant
      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, profile: { tenantId } },
        include: { profile: true },
      });

      if (!targetUser) {
        socket.emit("call:error", { message: "Recipient user not found in this organization." });
        return;
      }

      // Check if target user is currently in an active ringing or connected call
      let isBusy = false;
      for (const [, session] of activeCalls) {
        if (
          session.tenantId === tenantId &&
          (session.status === "ringing" || session.status === "connected") &&
          (session.callerId === targetUserId || session.targetUserId === targetUserId)
        ) {
          isBusy = true;
          break;
        }
      }

      if (isBusy) {
        socket.emit("call:busy", {
          callId,
          targetUserId,
          reason: "User is currently on another call.",
        });
        return;
      }

      const callerName = socket.data.name || payload?.callerName || "Colleague";
      const callerAvatar = socket.data.avatar || payload?.callerAvatar || payload?.callerAvatarUrl || null;
      const targetName = targetUser.profile?.fullName || targetUser.email || "Colleague";
      const targetAvatar = targetUser.profile?.avatarUrl || null;
      const threadId = payload?.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;

      // Save in active calls registry
      activeCalls.set(callId, {
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
      });

      // Deliver incoming call signal to recipient with normalized contract aliases
      ioInstance?.to(`user:${targetUserId}`).emit("call:incoming", {
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
      });
    });

    // 2. ACCEPT CALL
    socket.on("call:accept", (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId || payload?.fromUserId;
      const callId = payload?.callId;
      if (!targetUserId || !callId) return;

      const session = activeCalls.get(callId);
      if (session) {
        session.status = "connected";
      }

      ioInstance?.to(`user:${targetUserId}`).emit("call:accepted", {
        callId,
        acceptedBy: socket.data.userId,
      });
    });

    // 3. REJECT CALL
    socket.on("call:reject", async (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId || payload?.fromUserId;
      const callId = payload?.callId;
      const tenantId = socket.data.tenantId;
      if (!targetUserId || !tenantId) return;

      const session = activeCalls.get(callId);
      const callType = session?.callType || payload?.callType || payload?.type || "audio";
      const threadId = session?.threadId || payload?.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;

      ioInstance?.to(`user:${targetUserId}`).emit("call:rejected", {
        callId,
        rejectedBy: socket.data.userId,
        reason: payload?.reason || "declined",
      });

      // Persist rejected call record
      try {
        await runWithTenantContext(
          {
            tenantId,
            userId: socket.data.userId,
            roles: [],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
            db: rawPrisma,
          },
          async () => {
            await prisma.callHistoryRecord.create({
              data: {
                tenantId,
                callSessionId: callId || `call_rej_${Date.now()}`,
                callerId: targetUserId,
                callerName: session?.callerName || payload?.callerName || "Colleague",
                callerPhone: "Internal Call",
                callerAvatarUrl: session?.callerAvatar || null,
                receiverId: socket.data.userId,
                receiverName: socket.data.name || "Colleague",
                receiverAvatarUrl: socket.data.avatar || null,
                direction: "incoming",
                callType,
                status: "rejected",
                durationSeconds: 0,
                callTime: new Date(),
                startedAt: session?.startedAt || new Date(),
                endedAt: new Date(),
                notes: "Call rejected by recipient.",
              },
            });

            // Record chat system event in direct conversation
            await recordSystemEvent(
              tenantId,
              threadId,
              socket.data.userId,
              "call_event",
              `${callType === "video" ? "Video" : "Audio"} call declined.`,
              { callType, status: "rejected", durationSeconds: 0 }
            );
          }
        );
      } catch (err: any) {
        console.warn("Failed to persist rejected call record:", err.message);
      }

      if (callId) activeCalls.delete(callId);
    });

    // 4. CANCEL / TIMEOUT CALL (Caller cancels or 30s ringing timeout)
    const handleCallCancelOrTimeout = async (payload: any, isTimeout = false) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const callId = payload?.callId;
      const tenantId = socket.data.tenantId;
      if (!targetUserId || !tenantId) return;

      const session = activeCalls.get(callId);
      const callType = session?.callType || payload?.callType || payload?.type || "audio";
      const threadId = session?.threadId || payload?.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;

      ioInstance?.to(`user:${targetUserId}`).emit(isTimeout ? "call:timeout" : "call:cancelled", {
        callId,
        cancelledBy: socket.data.userId,
      });

      // Persist missed call record for both parties
      try {
        await runWithTenantContext(
          {
            tenantId,
            userId: socket.data.userId,
            roles: [],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
            db: rawPrisma,
          },
          async () => {
            await prisma.callHistoryRecord.create({
              data: {
                tenantId,
                callSessionId: callId || `call_missed_${Date.now()}`,
                callerId: socket.data.userId,
                callerName: socket.data.name || session?.callerName || "Colleague",
                callerPhone: "Internal Call",
                callerAvatarUrl: socket.data.avatar || session?.callerAvatar || null,
                receiverId: targetUserId,
                receiverName: session?.targetName || payload?.targetName || "Colleague",
                receiverAvatarUrl: session?.targetAvatar || null,
                direction: "outgoing",
                callType,
                status: "missed",
                durationSeconds: 0,
                callTime: new Date(),
                startedAt: session?.startedAt || new Date(),
                endedAt: new Date(),
                notes: isTimeout ? "Call timed out with no answer." : "Caller cancelled before answer.",
              },
            });

            // Send In-App Notification to recipient (missed call)
            await NotificationService.createNotification({
              tenantId,
              recipientUserId: targetUserId,
              title: `Missed ${callType === "video" ? "Video" : "Audio"} Call`,
              message: `You missed a ${callType} call from ${socket.data.name || "a colleague"}.`,
              type: "chat_missed_call",
              actionUrl: `/chat?thread=${threadId}`,
              metadata: { callId, callerId: socket.data.userId, callType },
            });

            // Record chat system event in direct conversation
            await recordSystemEvent(
              tenantId,
              threadId,
              socket.data.userId,
              "call_event",
              `Missed ${callType === "video" ? "video" : "audio"} call.`,
              { callType, status: "missed", durationSeconds: 0 }
            );
          }
        );
      } catch (err: any) {
        console.warn("Failed to persist missed call notification/record:", err.message);
      }

      if (callId) activeCalls.delete(callId);
    };

    socket.on("call:cancel", (payload: any) => handleCallCancelOrTimeout(payload, false));
    socket.on("call:timeout", (payload: any) => handleCallCancelOrTimeout(payload, true));

    // 5. WEBRTC SIGNALING (SDP Offer / Answer & ICE Candidates)
    socket.on("call:signal", (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      if (!targetUserId || !payload?.signal) return;

      ioInstance?.to(`user:${targetUserId}`).emit("call:signal", {
        callId: payload?.callId,
        senderId: socket.data.userId,
        fromUserId: socket.data.userId,
        signal: payload.signal,
      });
    });

    // 6. HANGUP / END CALL
    socket.on("call:hangup", async (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const callId = payload?.callId;
      const tenantId = socket.data.tenantId;
      if (!targetUserId || !tenantId) return;

      const durationSeconds = Math.max(0, Math.round(Number(payload?.durationSeconds) || 0));
      const session = activeCalls.get(callId);
      const callType = session?.callType || payload?.callType || payload?.type || "audio";
      const threadId = session?.threadId || payload?.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;

      ioInstance?.to(`user:${targetUserId}`).emit("call:ended", {
        callId,
        endedBy: socket.data.userId,
        durationSeconds,
      });

      // Persist completed call record
      try {
        const callerId = session?.callerId || socket.data.userId;
        const receiverId = session?.targetUserId || targetUserId;
        const isCaller = callerId === socket.data.userId;

        await runWithTenantContext(
          {
            tenantId,
            userId: socket.data.userId,
            roles: [],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
            db: rawPrisma,
          },
          async () => {
            await prisma.callHistoryRecord.create({
              data: {
                tenantId,
                callSessionId: callId || `call_comp_${Date.now()}`,
                callerId,
                callerName: session?.callerName || (isCaller ? socket.data.name : "Colleague"),
                callerPhone: "Internal Call",
                callerAvatarUrl: session?.callerAvatar || (isCaller ? socket.data.avatar : null),
                receiverId,
                receiverName: session?.targetName || (!isCaller ? socket.data.name : "Colleague"),
                receiverAvatarUrl: session?.targetAvatar || (!isCaller ? socket.data.avatar : null),
                direction: isCaller ? "outgoing" : "incoming",
                callType,
                status: "completed",
                durationSeconds,
                callTime: new Date(),
                startedAt: session?.startedAt || new Date(Date.now() - durationSeconds * 1000),
                endedAt: new Date(),
                notes: `${callType === "video" ? "Video conference" : "Voice call"} session concluded.`,
              },
            });

            // Record chat system event in direct conversation
            const mins = Math.floor(durationSeconds / 60);
            const secs = durationSeconds % 60;
            const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

            await recordSystemEvent(
              tenantId,
              threadId,
              socket.data.userId,
              "call_event",
              `${callType === "video" ? "Video" : "Audio"} call (${durStr}).`,
              { callType, status: "completed", durationSeconds }
            );
          }
        );
      } catch (err: any) {
        console.warn("Failed to persist completed call record:", err.message);
      }

      if (callId) activeCalls.delete(callId);
    });

    // 7. GROUP AUDIO & VIDEO CALLS
    socket.on("group-call:start", async (payload: { groupId: string; callId: string; callType: "audio" | "video" }) => {
      const { groupId, callId, callType } = payload;
      const tenantId = socket.data.tenantId;
      if (!groupId || !callId || !tenantId) return;

      // Verify membership
      const group = await prisma.chatGroup.findFirst({
        where: { id: groupId, tenantId },
        include: { members: true },
      });

      if (!group || !group.members.some((m) => m.userId === socket.data.userId)) {
        socket.emit("call:error", { message: "Access denied to group call." });
        return;
      }

      socket.join(`group_call_${callId}`);

      // Broadcast incoming group call to all group members
      for (const m of group.members) {
        if (m.userId !== socket.data.userId) {
          ioInstance?.to(`user:${m.userId}`).emit("group-call:incoming", {
            groupId,
            groupName: group.name,
            groupAvatarUrl: group.avatarUrl,
            callId,
            callType: callType || "audio",
            callerId: socket.data.userId,
            callerName: socket.data.name,
            callerAvatar: socket.data.avatar,
          });
        }
      }

      // Record system event in group conversation
      await recordSystemEvent(
        tenantId,
        `group_${groupId}`,
        socket.data.userId,
        "group_call_started",
        `${socket.data.name} started a group ${callType} call.`,
        { groupId, callId, callType }
      );
    });

    socket.on("group-call:join", (payload: { callId: string; groupId: string }) => {
      const { callId } = payload;
      if (!callId) return;

      socket.join(`group_call_${callId}`);
      socket.to(`group_call_${callId}`).emit("group-call:user_joined", {
        callId,
        userId: socket.data.userId,
        name: socket.data.name,
        avatar: socket.data.avatar,
      });
    });

    socket.on("group-call:signal", (payload: { callId: string; targetUserId: string; signal: any }) => {
      if (!payload?.targetUserId || !payload?.signal) return;
      ioInstance?.to(`user:${payload.targetUserId}`).emit("group-call:signal", {
        callId: payload.callId,
        senderId: socket.data.userId,
        signal: payload.signal,
      });
    });

    socket.on("group-call:leave", async (payload: { callId: string; groupId: string; durationSeconds?: number; callType?: string }) => {
      const { callId, groupId } = payload;
      if (!callId) return;

      socket.leave(`group_call_${callId}`);
      socket.to(`group_call_${callId}`).emit("group-call:user_left", {
        callId,
        userId: socket.data.userId,
      });

      // If call session was active and duration recorded, persist group call record
      const tenantId = socket.data.tenantId;
      if (tenantId && groupId && payload.durationSeconds && payload.durationSeconds > 0) {
        try {
          await prisma.callHistoryRecord.create({
            data: {
              tenantId,
              callSessionId: callId,
              callerId: socket.data.userId,
              callerName: socket.data.name || "Colleague",
              callerPhone: "Group Call",
              callerAvatarUrl: socket.data.avatar || null,
              callType: payload.callType || "audio",
              status: "completed",
              durationSeconds: Math.round(payload.durationSeconds),
              callTime: new Date(),
              groupId,
              notes: `Group ${payload.callType || "audio"} call concluded.`,
            },
          });
        } catch (e: any) {
          console.warn("Failed to persist group call history:", e.message);
        }
      }
    });

    // Handle Dual-Screen Customer Display Cart Sync
    socket.on("pos:cart_update", (payload: any) => {
      const tenantId = socket.data.tenantId;
      socket.to(`tenant:${tenantId}`).emit("pos:cart_sync", { ...payload, tenantId });
    });

    // Handle biometric live punch streaming
    socket.on("punch:simulate", (payload: { tenantId?: string; punch: any }) => {
      if (socket.data.isSuper) ioInstance?.to(`tenant:${socket.data.tenantId}`).emit("punch:new", payload.punch);
    });

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      const tId = socket.data.tenantId;
      const uId = socket.data.userId;
      if (tId && uId && tenantPresence.has(tId)) {
        const tenantMap = tenantPresence.get(tId)!;
        const currentCount = tenantMap.get(uId) || 0;
        if (currentCount <= 1) {
          tenantMap.delete(uId);
          ioInstance?.to(`tenant:${tId}`).emit("presence:update", { userId: uId, status: "offline" });
        } else {
          tenantMap.set(uId, currentCount - 1);
        }
      }
      console.log(`⚡ [WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function getOnlineUsersForTenant(tenantId: string): string[] {
  const users = tenantPresence.get(tenantId);
  if (!users) return [];
  const online: string[] = [];
  for (const [userId, count] of users.entries()) {
    if (count > 0) online.push(userId);
  }
  return online;
}

export function broadcastToTenant(tenantId: string, event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.to(`tenant:${tenantId}`).emit(event, payload);
}

export function broadcastToUser(userId: string, event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

export function broadcastToPlatform(event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.to("platform:admin").emit(event, payload);
}

export function broadcastToAll(event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
}
