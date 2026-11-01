import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma, rawPrisma } from "./prisma";
import { runWithTenantContext } from "./context/tenant-context";
import { verifyToken } from "./lib/jwt";
import { assertWorkspaceActive, getWorkspacePolicy } from "./services/workspace-policy.service";
import { recordSystemEvent } from "./services/chat-system-events.service";
import { NotificationService } from "./services/notification.service";
import { PusherService } from "./services/pusher.service";

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
  timeoutTimer?: NodeJS.Timeout | null;
}
const activeCalls = new Map<string, ActiveCallSession>();

interface ActiveGroupCallSession {
  callId: string;
  groupId: string;
  tenantId: string;
  creatorId: string;
  callType: "audio" | "video";
  startedAt: Date;
}
const activeGroupCalls = new Map<string, ActiveGroupCallSession>();

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
      void PusherService.triggerTenantEvent(socket.data.tenantId, "chat:typing", {
        threadId: payload.threadId,
        userId: socket.data.userId,
        name: socket.data.name,
        isTyping: !!payload.isTyping,
      }).catch(() => {});
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
      // Asynchronously persist delivery status in DB without blocking event loop
      (rawPrisma || prisma).chatMessage.updateMany({
        where: { id: { in: payload.messageIds }, tenantId: tId, senderId: { not: uId } },
        data: { deliveryStatus: "delivered" },
      }).catch(() => {});
    });

    // =========================================================================
    // WEBRTC CALL SIGNALING & LIFECYCLE (Audio, Video, Group Calls)
    // =========================================================================

    const persistMissedCallRecord = async (params: {
      tenantId: string;
      callId: string;
      session?: ActiveCallSession;
      callerId: string;
      targetUserId: string;
      isTimeout: boolean;
    }) => {
      const { tenantId, callId, session, callerId, targetUserId, isTimeout } = params;
      const callType = session?.callType || "audio";
      const threadId = session?.threadId || `direct_${[callerId, targetUserId].sort().join("_")}`;

      try {
        await runWithTenantContext(
          {
            tenantId,
            userId: callerId,
            roles: [],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
            db: rawPrisma,
          },
          async () => {
            if (callId) {
              const existing = await prisma.callHistoryRecord.findFirst({
                where: { tenantId, callSessionId: callId },
              });
              if (existing) return;
            }

            await prisma.callHistoryRecord.create({
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
            await NotificationService.createNotification({
              tenantId,
              recipientUserId: targetUserId,
              title: `Missed ${callType === "video" ? "Video" : "Audio"} Call`,
              message: `You missed a ${callType} call from ${session?.callerName || "a colleague"}.`,
              type: "chat_missed_call",
              actionUrl: `/chat?thread=${threadId}`,
              metadata: { callId, callerId, callType },
            });

            // Record chat system event in direct conversation
            await recordSystemEvent(
              tenantId,
              threadId,
              callerId,
              "call_event",
              `Missed ${callType === "video" ? "video" : "audio"} call.`,
              { callType, status: "missed", durationSeconds: 0 }
            );
          }
        );
      } catch (err: any) {
        console.warn("Failed to persist missed call notification/record:", err.message);
      }
    };

    // 1. INITIATE CALL (1-on-1)
    socket.on("call:invite", async (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const callType = (payload?.callType || payload?.type || "audio").toLowerCase() as "audio" | "video";
      const callId = payload?.callId || `call_${Date.now()}`;
      const tenantId = socket.data.tenantId;

      console.log(`[SOCKET_CALL_INVITE] from: ${socket.data.userId}, target: ${targetUserId}, tenant: ${tenantId}, callId: ${callId}`);
      if (!targetUserId || !tenantId) {
        console.warn(`[SOCKET_CALL_INVITE_REJECT] Missing targetUserId (${targetUserId}) or tenantId (${tenantId})`);
        return;
      }

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

      // A user may be in only one live one-to-one call. Check both sides here
      // instead of trusting client state, otherwise a caller could create two
      // concurrent peer connections from different tabs.
      let busyUserId: string | null = null;
      for (const [, session] of activeCalls) {
        if (
          session.tenantId === tenantId &&
          (session.status === "ringing" || session.status === "connected") &&
          (session.callerId === targetUserId || session.targetUserId === targetUserId ||
            session.callerId === socket.data.userId || session.targetUserId === socket.data.userId)
        ) {
          busyUserId = session.callerId === targetUserId || session.targetUserId === targetUserId
            ? targetUserId
            : socket.data.userId;
          break;
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
          void PusherService.triggerUserEvent(tenantId, targetUserId, "call:busy", recipientNotice)
            .catch(() => {});
        }
        return;
      }

      const callerName = socket.data.name || payload?.callerName || "Colleague";
      const callerAvatar = socket.data.avatar || payload?.callerAvatar || payload?.callerAvatarUrl || null;
      const targetName = targetUser.profile?.fullName || targetUser.email || "Colleague";
      const targetAvatar = targetUser.profile?.avatarUrl || null;
      const threadId = payload?.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;

      // Save in active calls registry with authoritative 60-second ringing timeout
      const callSession: ActiveCallSession = {
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
          const current = activeCalls.get(callId);
          if (current && current.status === "ringing") {
            console.log(`[CALL_TIMEOUT_60S] Server-authoritative 60s timeout for call: ${callId}`);
            if (current.timeoutTimer) {
              clearTimeout(current.timeoutTimer);
              current.timeoutTimer = null;
            }
            activeCalls.delete(callId);

            ioInstance?.to(`user:${current.targetUserId}`).emit("call:timeout", {
              callId,
              cancelledBy: "system",
            });
            ioInstance?.to(`user:${current.callerId}`).emit("call:timeout", {
              callId,
              cancelledBy: "system",
            });

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
      activeCalls.set(callId, callSession);

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
      void PusherService.triggerUserEvent(tenantId, targetUserId, "call:incoming", incomingPayload)
        .catch(() => {});
    });

    // 2. ACCEPT CALL
    socket.on("call:accept", (payload: any) => {
      const callId = payload?.callId;
      const targetUserId = payload?.targetUserId || payload?.toUserId || payload?.fromUserId;
      if (!callId || !targetUserId) {
        socket.emit("call:error", { message: "Invalid call payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== socket.data.tenantId) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      // Only the designated callee (targetUserId) can accept the call
      if (session.targetUserId !== socket.data.userId) {
        socket.emit("call:error", { message: "Only the call recipient can accept the call." });
        return;
      }

      // Target must match original caller
      if (session.callerId !== targetUserId) {
        socket.emit("call:error", { message: "Invalid call participant." });
        return;
      }

      // Transition only valid from 'ringing'
      if (session.status !== "ringing") {
        socket.emit("call:error", { message: "Call is not in ringing state." });
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
    });

    // 3. REJECT CALL
    socket.on("call:reject", async (payload: any) => {
      const callId = payload?.callId;
      const targetUserId = payload?.targetUserId || payload?.toUserId || payload?.fromUserId;
      const tenantId = socket.data.tenantId;

      if (!callId || !targetUserId || !tenantId) {
        socket.emit("call:error", { message: "Invalid call payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== tenantId) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      // Only the callee can reject a call
      if (session.targetUserId !== socket.data.userId) {
        socket.emit("call:error", { message: "Only the call recipient can reject the call." });
        return;
      }

      // Target must match original caller
      if (session.callerId !== targetUserId) {
        socket.emit("call:error", { message: "Invalid call participant." });
        return;
      }

      if (session.status !== "ringing") {
        socket.emit("call:error", { message: "Call is not in ringing state." });
        return;
      }

      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      activeCalls.delete(callId);

      const callType = session.callType;
      const threadId = session.threadId || `direct_${[socket.data.userId, targetUserId].sort().join("_")}`;

      ioInstance?.to(`user:${session.callerId}`).emit("call:rejected", {
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
    });

    // 4. CANCEL CALL (Caller cancels ringing call)
    socket.on("call:cancel", async (payload: any) => {
      const callId = payload?.callId;
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const tenantId = socket.data.tenantId || payload?.tenantId;

      if (!callId || !targetUserId || !tenantId) {
        socket.emit("call:error", { message: "Invalid call payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== tenantId) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      // ONLY the caller can cancel a ringing call
      if (session.callerId !== socket.data.userId) {
        socket.emit("call:error", { message: "Only the call initiator can cancel the call." });
        return;
      }

      if (session.targetUserId !== targetUserId) {
        socket.emit("call:error", { message: "Invalid call participant." });
        return;
      }

      if (session.status !== "ringing") {
        socket.emit("call:error", { message: "Call is not in ringing state." });
        return;
      }

      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      activeCalls.delete(callId);

      ioInstance?.to(`user:${session.targetUserId}`).emit("call:cancelled", {
        callId,
        cancelledBy: socket.data.userId,
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

    // 4.1 TIMEOUT CALL
    socket.on("call:timeout", async (payload: any) => {
      const callId = payload?.callId;
      const tenantId = socket.data.tenantId || payload?.tenantId;
      if (!callId || !tenantId) {
        socket.emit("call:error", { message: "Invalid call payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== tenantId) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      if (session.callerId !== socket.data.userId && session.targetUserId !== socket.data.userId) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      if (session.status !== "ringing") {
        socket.emit("call:error", { message: "Call is not in ringing state." });
        return;
      }

      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      activeCalls.delete(callId);

      ioInstance?.to(`user:${session.targetUserId}`).emit("call:timeout", {
        callId,
        cancelledBy: "system",
      });
      ioInstance?.to(`user:${session.callerId}`).emit("call:timeout", {
        callId,
        cancelledBy: "system",
      });

      await persistMissedCallRecord({
        tenantId,
        callId,
        session,
        callerId: session.callerId,
        targetUserId: session.targetUserId,
        isTimeout: true,
      });
    });

    // 5. WEBRTC SIGNALING (SDP Offer / Answer & ICE Candidates)
    socket.on("call:signal", (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const callId = payload?.callId;
      if (!callId || !targetUserId || !payload?.signal || typeof payload.signal !== "object") {
        socket.emit("call:error", { message: "Invalid signaling payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== socket.data.tenantId) {
        socket.emit("call:error", { message: "Unauthorized signaling action." });
        return;
      }

      const isCaller = session.callerId === socket.data.userId;
      const isTarget = session.targetUserId === socket.data.userId;
      if (!isCaller && !isTarget) {
        socket.emit("call:error", { message: "Unauthorized signaling action." });
        return;
      }

      const expectedPeerId = isCaller ? session.targetUserId : session.callerId;
      if (targetUserId !== expectedPeerId) {
        socket.emit("call:error", { message: "Invalid call participant." });
        return;
      }

      // Signaling is only legal when call is ringing (initial offer/answer) or connected
      if (session.status !== "ringing" && session.status !== "connected") {
        socket.emit("call:error", { message: "Call session is not active." });
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
    socket.on("call:media-state", (payload: any) => {
      const callId = payload?.callId;
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      if (!callId) {
        socket.emit("call:error", { message: "Invalid media state payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== socket.data.tenantId) {
        socket.emit("call:error", { message: "Unauthorized media state action." });
        return;
      }

      const isCaller = session.callerId === socket.data.userId;
      const isTarget = session.targetUserId === socket.data.userId;
      if (!isCaller && !isTarget) {
        socket.emit("call:error", { message: "Unauthorized media state action." });
        return;
      }

      const expectedPeerId = isCaller ? session.targetUserId : session.callerId;
      if (targetUserId && targetUserId !== expectedPeerId) {
        socket.emit("call:error", { message: "Invalid call participant." });
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
    socket.on("call:hangup", async (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.toUserId;
      const callId = payload?.callId;
      const tenantId = socket.data.tenantId;

      if (!callId || !targetUserId || !tenantId) {
        socket.emit("call:error", { message: "Invalid call payload." });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call session not found." });
        return;
      }

      if (session.tenantId !== tenantId) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      const isCaller = session.callerId === socket.data.userId;
      const isTarget = session.targetUserId === socket.data.userId;
      if (!isCaller && !isTarget) {
        socket.emit("call:error", { message: "Unauthorized call action." });
        return;
      }

      const expectedPeerId = isCaller ? session.targetUserId : session.callerId;
      if (targetUserId !== expectedPeerId) {
        socket.emit("call:error", { message: "Invalid call participant." });
        return;
      }

      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      activeCalls.delete(callId);

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
            const existing = await prisma.callHistoryRecord.findFirst({
              where: { tenantId, callSessionId: callId },
            });
            if (existing) {
              await prisma.callHistoryRecord.update({
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

            await prisma.callHistoryRecord.create({
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
    });

    // 7. GROUP AUDIO & VIDEO CALLS
    socket.on("group-call:start", async (payload: { groupId: string; callId: string; callType: "audio" | "video" }) => {
      const { groupId, callId, callType } = payload;
      const tenantId = socket.data.tenantId;
      if (!groupId || !callId || !tenantId) {
        socket.emit("call:error", { message: "Invalid group call payload." });
        return;
      }

      // Verify membership
      const group = await (rawPrisma || prisma).chatGroup.findFirst({
        where: { id: groupId, tenantId },
        include: { members: true },
      });

      if (!group || !group.members.some((m) => m.userId === socket.data.userId)) {
        socket.emit("call:error", { message: "Access denied to group call." });
        return;
      }

      activeGroupCalls.set(callId, {
        callId,
        groupId,
        tenantId,
        creatorId: socket.data.userId,
        callType: callType || "audio",
        startedAt: new Date(),
      });

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

    socket.on("group-call:join", async (payload: { callId: string; groupId?: string }) => {
      const { callId } = payload;
      const tenantId = socket.data.tenantId;
      if (!callId || !tenantId) {
        socket.emit("call:error", { message: "Invalid group call payload." });
        return;
      }

      const session = activeGroupCalls.get(callId);
      if (!session) {
        socket.emit("call:error", { message: "Group call session not found." });
        return;
      }

      if (session.tenantId !== tenantId) {
        socket.emit("call:error", { message: "Access denied to group call." });
        return;
      }

      const member = await (rawPrisma || prisma).chatGroupMember.findFirst({
        where: { groupId: session.groupId, userId: socket.data.userId },
      });

      if (!member) {
        socket.emit("call:error", { message: "Not a member of this group." });
        return;
      }

      socket.join(`group_call_${callId}`);
      socket.to(`group_call_${callId}`).emit("group-call:user_joined", {
        callId,
        userId: socket.data.userId,
        name: socket.data.name,
        avatar: socket.data.avatar,
      });
    });

    socket.on("group-call:signal", async (payload: { callId: string; targetUserId: string; signal: any; groupId?: string }) => {
      if (!payload?.callId || !payload?.targetUserId || !payload?.signal || typeof payload.signal !== "object") {
        socket.emit("call:error", { message: "Invalid group signaling payload." });
        return;
      }
      const tenantId = socket.data.tenantId;
      const session = activeGroupCalls.get(payload.callId);
      if (!session || session.tenantId !== tenantId) {
        socket.emit("call:error", { message: "Unauthorized group signaling action." });
        return;
      }

      const members = await (rawPrisma || prisma).chatGroupMember.findMany({
        where: {
          groupId: session.groupId,
          userId: { in: [socket.data.userId, payload.targetUserId] },
        },
      });

      const senderIsMember = members.some((m) => m.userId === socket.data.userId);
      const targetIsMember = members.some((m) => m.userId === payload.targetUserId);

      if (!senderIsMember || !targetIsMember) {
        socket.emit("call:error", { message: "Participant is not a member of this group call." });
        return;
      }

      ioInstance?.to(`user:${payload.targetUserId}`).emit("group-call:signal", {
        callId: payload.callId,
        senderId: socket.data.userId,
        signal: payload.signal,
      });
    });

    socket.on("group-call:leave", async (payload: { callId: string; groupId?: string; durationSeconds?: number; callType?: string }) => {
      const { callId } = payload;
      if (!callId) return;

      const session = activeGroupCalls.get(callId);
      const tenantId = socket.data.tenantId;
      if (session && session.tenantId !== tenantId) return;

      socket.leave(`group_call_${callId}`);
      socket.to(`group_call_${callId}`).emit("group-call:user_left", {
        callId,
        userId: socket.data.userId,
      });

      const room = ioInstance?.sockets.adapter.rooms.get(`group_call_${callId}`);
      if (!room || room.size === 0) {
        activeGroupCalls.delete(callId);
      }

      const groupId = session?.groupId || payload.groupId;
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
              callType: payload.callType || session?.callType || "audio",
              status: "completed",
              durationSeconds: Math.round(payload.durationSeconds),
              callTime: new Date(),
              groupId,
              notes: `Group ${payload.callType || session?.callType || "audio"} call concluded.`,
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
      if (tId && uId) {
        // Multi-tab check: Check presence count for this user
        const tenantMap = tenantPresence.get(tId);
        const currentPresenceCount = tenantMap ? (tenantMap.get(uId) || 0) : 0;
        const userRoom = ioInstance?.sockets.adapter.rooms.get(`user:${uId}`);
        const remainingSockets = userRoom ? userRoom.size : 0;
        const hasOtherSockets = currentPresenceCount > 1 || remainingSockets > 0;

        // ONLY clean up active calls if the user has NO remaining active sockets
        if (!hasOtherSockets) {
          for (const [callId, session] of activeCalls) {
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
              activeCalls.delete(callId);
            }
          }
        }

        if (tenantPresence.has(tId)) {
          const tMap = tenantPresence.get(tId)!;
          const currentCount = tMap.get(uId) || 0;
          if (currentCount <= 1) {
            tMap.delete(uId);
            ioInstance?.to(`tenant:${tId}`).emit("presence:update", { userId: uId, status: "offline" });
          } else {
            tMap.set(uId, currentCount - 1);
          }
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
  // Forward storage, file, and quota events to Super Admin platform room
  if (
    event.startsWith("file:") ||
    event.startsWith("file.") ||
    event.startsWith("storage:") ||
    event.startsWith("storage.") ||
    event.startsWith("quota:") ||
    event.startsWith("quota.")
  ) {
    ioInstance.to("platform:admin").emit("storage:platform:update", {
      tenantId,
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
    ioInstance.to("platform:admin").emit(event, { tenantId, ...payload });
  }
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
