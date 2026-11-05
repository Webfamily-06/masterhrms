import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { activeCalls, getIO, ActiveCallSession } from "../socket";
import { rawPrisma, prisma } from "../prisma";
import { IncomingCallPushService } from "../services/incoming-call-push.service";
import { PusherService } from "../services/pusher.service";
import { CallLifecycleService, CallError, CallForbiddenError, CallConflictError, CallNotFoundError } from "../services/call-lifecycle.service";

export const callRouter = Router();

// Target user ID resolution helper (supports direct user.id or employee.id)
async function resolveTargetUserId(tenantId: string, targetId: string): Promise<string | null> {
  const db = rawPrisma || prisma;
  const directUser = await db.user.findFirst({
    where: { id: targetId, profile: { tenantId } },
    select: { id: true },
  });
  if (directUser) return directUser.id;

  const employee = await db.employee.findFirst({
    where: { id: targetId, tenantId },
    select: { userId: true },
  });
  if (employee?.userId) {
    const empUser = await db.user.findFirst({
      where: { id: employee.userId, profile: { tenantId } },
      select: { id: true },
    });
    if (empUser) return empUser.id;
  }
  return null;
}

// GET /api/calls/pending - Recover active ringing incoming call for callee
callRouter.get("/pending", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const db = rawPrisma || prisma;
    const now = Date.now();

    // 1. Check in-memory active calls first
    for (const [, session] of activeCalls) {
      if (
        session.tenantId === tenantId &&
        session.targetUserId === userId &&
        session.status === "ringing" &&
        now - new Date(session.startedAt).getTime() < 60000
      ) {
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
  } catch (error: any) {
    console.error("[CallRoutes] Pending call lookup error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to check pending calls" });
  }
});

// POST /api/calls/invite - Persistent Calls API invitation (REST fallback & serverless support)
callRouter.post("/invite", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const { targetUserId: rawTargetId, callType: rawCallType, callId: passedCallId, callerPhone, threadId } = req.body || {};
    const callType: "audio" | "video" = rawCallType === "video" ? "video" : "audio";

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

    const db = rawPrisma || prisma;
    const now = Date.now();
    const sixtySecondsAgo = new Date(now - 60000);

    // Busy check: in-memory and database
    let busyUserId: string | null = null;
    for (const [, session] of activeCalls) {
      if (
        session.tenantId === tenantId &&
        (session.status === "ringing" || session.status === "connected") &&
        (session.callerId === resolvedTargetId || session.targetUserId === resolvedTargetId ||
         session.callerId === callerId || session.targetUserId === callerId)
      ) {
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

      const io = getIO();
      if (busyUserId === resolvedTargetId) {
        const recipientNotice = {
          ...busyPayload,
          requestedBy: callerId,
          requestedByName: req.user!.email || "A colleague",
          reason: "Another incoming call was blocked because you are already in a call.",
        };
        io?.to("user:" + resolvedTargetId).emit("call:busy", recipientNotice);
        void PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:busy", recipientNotice).catch(() => {});
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
    let lifecycleSession: any = null;
    try {
      lifecycleSession = await CallLifecycleService.createCallSession({
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
    } catch (err: any) {
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
    const session: ActiveCallSession = {
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
        const current = activeCalls.get(callId);
        if (current && current.status === "ringing") {
          activeCalls.delete(callId);
          try {
            await CallLifecycleService.terminateCallTransaction({
              tenantId: current.tenantId,
              callId: current.dbCallId || current.callId,
              actorId: "SYSTEM",
              endReason: "TIMEOUT",
              finalHistoryStatus: "missed",
              notes: "Call missed: 60-second ringing timeout expired.",
            });
          } catch {}

          const io = getIO();
          io?.to("user:" + current.targetUserId).emit("call:timeout", { callId, cancelledBy: "system" });
          io?.to("user:" + current.targetUserId).emit("call.timeout", { callId, cancelledBy: "system" });
          io?.to("user:" + current.callerId).emit("call:timeout", { callId, cancelledBy: "system" });
          io?.to("user:" + current.callerId).emit("call.timeout", { callId, cancelledBy: "system" });
          void PusherService.triggerUserEvent(current.tenantId, current.targetUserId, "call:timeout", { callId, cancelledBy: "system" }).catch(() => {});
          void PusherService.triggerUserEvent(current.tenantId, current.callerId, "call:timeout", { callId, cancelledBy: "system" }).catch(() => {});
          void IncomingCallPushService.sendCallCancelledPush({
            tenantId: current.tenantId,
            targetUserId: current.targetUserId,
            callId,
            reason: "timeout",
          }).catch(() => {});
        }
      }, 60000),
    };
    activeCalls.set(callId, session);

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

    const io = getIO();
    io?.to("user:" + resolvedTargetId).emit("call:incoming", incomingPayload);
    void PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:incoming", incomingPayload).catch(() => {});
    void IncomingCallPushService.sendIncomingCallPush({
      tenantId,
      targetUserId: resolvedTargetId,
      callId,
      callerId,
      callerName,
      callerAvatar,
      callType: callType,
      threadId: finalThreadId,
    }).catch(() => {});

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
  } catch (error) {
    console.error("[CallRoutes] Invite error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to initiate call" });
  }
});

// POST /api/calls/:callId/signal - HTTP WebRTC signaling relay fallback (Pusher + Socket)
callRouter.post("/:callId/signal", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const { toUserId, signal } = req.body || {};

    if (!toUserId || !signal) {
      return res.status(400).json({ success: false, error: "toUserId and signal are required" });
    }

    const db = rawPrisma || prisma;
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

    const io = getIO();
    io?.to("user:" + toUserId).emit("call:signal", signalPayload);
    void PusherService.triggerUserEvent(tenantId, toUserId, "call:signal", signalPayload).catch(() => {});

    return res.json({ success: true, delivered: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to relay signal" });
  }
});


// GET /api/calls/:callId/status - Fetch authoritative call session state (memory + DB fallback)
callRouter.get("/:callId/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    // 1. Check in-memory live call registry
    const liveSession = activeCalls.get(callId);
    if (liveSession && liveSession.tenantId === tenantId) {
      const isParticipant =
        liveSession.callerId === userId || liveSession.targetUserId === userId;

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
    const db = rawPrisma || prisma;
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
      const isParticipant = dbCall.participants.some((p: any) => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ success: false, error: "Access denied: You are not a participant in this call." });
      }

      // Check for ringing expiration (> 60s)
      const now = new Date();
      let effectiveStatus = dbCall.status;
      if (dbCall.status === "RINGING" && dbCall.ringingExpiresAt && now >= dbCall.ringingExpiresAt) {
        effectiveStatus = "MISSED";
        void CallLifecycleService.terminateCallTransaction({
          tenantId,
          callId: dbCall.id,
          actorId: "SYSTEM",
          endReason: "TIMEOUT",
          finalHistoryStatus: "missed",
          notes: "Call missed (ringing timeout expired)",
        }).catch(() => {});
      }

      const callerPart = dbCall.participants.find((p: any) => p.role === "HOST") || dbCall.participants[0];
      const calleePart = dbCall.participants.find((p: any) => p.role !== "HOST") || dbCall.participants[1];

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
          participants: dbCall.participants.map((p: any) => ({
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
      const isParticipant =
        history.callerId === userId || history.receiverId === userId;

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
        }).catch(() => {});
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
  } catch (error: any) {
    console.error("[CallRoutes] Fetch status error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch call status" });
  }
});

// POST /api/calls/:callId/accept - Authenticated ATOMIC call acceptance
callRouter.post("/:callId/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    let acceptResult: any = null;
    try {
      acceptResult = await CallLifecycleService.acceptCallTransaction({
        tenantId,
        callId,
        calleeId: userId,
        deviceId: (req.headers["x-device-id"] as string) || "rest_client",
      });
    } catch (err: any) {
      if (err instanceof CallConflictError) {
        return res.status(409).json({
          success: false,
          error: "Call was already answered or accepted on another device.",
          code: err.code,
        });
      }
      if (err instanceof CallForbiddenError) {
        return res.status(403).json({
          success: false,
          error: err.message,
          code: err.code,
        });
      }
      if (err instanceof CallNotFoundError) {
        return res.status(404).json({
          success: false,
          error: err.message,
          code: err.code,
        });
      }
      throw err;
    }

    // Update in-memory session
    let session = activeCalls.get(callId);
    if (session) {
      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      session.status = "connected";
    }

    const io = getIO();
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

    void PusherService.triggerUserEvent(tenantId, callerId, "call:accepted", acceptPayload).catch(() => {});
    void PusherService.triggerUserEvent(tenantId, userId, "call:accepted", acceptPayload).catch(() => {});

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
  } catch (error: any) {
    console.error("[CallRoutes] Accept error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to accept call" });
  }
});

// POST /api/calls/:callId/reject - Authenticated ATOMIC call rejection
callRouter.post("/:callId/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body || {};
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    let rejectedCall: any = null;
    try {
      rejectedCall = await CallLifecycleService.rejectCallTransaction({
        tenantId,
        callId,
        calleeId: userId,
        reason: reason || "declined",
      });
    } catch (err: any) {
      if (err instanceof CallForbiddenError) {
        return res.status(403).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallNotFoundError) {
        return res.status(404).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    const session = activeCalls.get(callId);
    if (session) {
      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      session.status = "ended";
      activeCalls.delete(callId);
    }

    const callerId = rejectedCall.startedBy || session?.callerId;
    const io = getIO();
    const rejectPayload = {
      callId,
      rejectedBy: userId,
      reason: reason || "declined",
      timestamp: new Date().toISOString(),
    };

    if (callerId) {
      io?.to(`user:${callerId}`).emit("call:rejected", rejectPayload);
      io?.to(`user:${callerId}`).emit("call.rejected", rejectPayload);
      void PusherService.triggerUserEvent(tenantId, callerId, "call:rejected", rejectPayload).catch(() => {});
    }
    io?.to(`user:${userId}`).emit("call:rejected", rejectPayload);
    io?.to(`user:${userId}`).emit("call.rejected", rejectPayload);

    void IncomingCallPushService.sendCallCancelledPush({
      callId,
      tenantId,
      targetUserId: userId,
      reason: "declined",
    }).catch(() => {});

    return res.json({
      success: true,
      message: "Call rejected successfully",
    });
  } catch (error: any) {
    console.error("[CallRoutes] Reject error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to reject call" });
  }
});

// POST /api/calls/:callId/cancel - Caller ATOMIC cancellation
callRouter.post("/:callId/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    let cancelledCall: any = null;
    try {
      cancelledCall = await CallLifecycleService.cancelCallTransaction({
        tenantId,
        callId,
        callerId: userId,
        reason: "Caller cancelled",
      });
    } catch (err: any) {
      if (err instanceof CallForbiddenError) {
        return res.status(403).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallNotFoundError) {
        return res.status(404).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    const session = activeCalls.get(callId);
    if (session) {
      if (session.timeoutTimer) {
        clearTimeout(session.timeoutTimer);
        session.timeoutTimer = null;
      }
      session.status = "ended";
      activeCalls.delete(callId);
    }

    const io = getIO();
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
      void PusherService.triggerUserEvent(tenantId, targetUserId, "call:cancelled", cancelPayload).catch(() => {});
      void IncomingCallPushService.sendCallCancelledPush({
        callId,
        tenantId,
        targetUserId,
        reason: "Caller cancelled",
      }).catch(() => {});
    }

    io?.to(`user:${userId}`).emit("call:cancelled", cancelPayload);
    io?.to(`user:${userId}`).emit("call.cancelled", cancelPayload);

    return res.json({
      success: true,
      message: "Call cancelled successfully",
    });
  } catch (error: any) {
    console.error("[CallRoutes] Cancel error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to cancel call" });
  }
});

// POST /api/calls/:callId/end - Authenticated ATOMIC call termination (caller or receiver)
callRouter.post("/:callId/end", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const { reason, durationSeconds: reqDuration } = req.body || {};
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    let termResult: any = null;
    try {
      termResult = await CallLifecycleService.terminateCallTransaction({
        tenantId,
        callId,
        actorId: userId,
        endReason: reason || "USER_HANGUP",
        finalHistoryStatus: "completed",
      });
    } catch (err: any) {
      console.warn("[CallRoutes] Terminate transaction warning:", err.message);
    }

    const session = activeCalls.get(callId);
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
      activeCalls.delete(callId);
    }

    const durationSeconds = termResult?.durationSeconds !== undefined
      ? termResult.durationSeconds
      : Math.max(0, Math.round(Number(reqDuration) || 0));

    const io = getIO();
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
      void PusherService.triggerUserEvent(tenantId, peerId, "call:ended", endPayload).catch(() => {});
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
  } catch (error: any) {
    console.error("[CallRoutes] End error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to end call" });
  }
});

// POST /api/calls/:callId/reconnect - Restore JOINED state within 30s grace window
callRouter.post("/:callId/reconnect", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    let reconnResult: any = null;
    try {
      reconnResult = await CallLifecycleService.reconnectParticipantTransaction({
        tenantId,
        callId,
        userId,
      });
    } catch (err: any) {
      if (err instanceof CallConflictError) {
        return res.status(409).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallForbiddenError) {
        return res.status(403).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallNotFoundError) {
        return res.status(404).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    const session = activeCalls.get(callId);
    if (session && session.reconnectTimers?.has(userId)) {
      clearTimeout(session.reconnectTimers.get(userId)!);
      session.reconnectTimers.delete(userId);
    }

    const io = getIO();
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
  } catch (error: any) {
    console.error("[CallRoutes] Reconnect error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to reconnect" });
  }
});

// POST /api/calls/:callId/invite-colleague - Phase C2 In-Call Colleague Invitation
callRouter.post("/:callId/invite-colleague", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

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
      result = await CallLifecycleService.addParticipantToActiveCall({
        tenantId,
        callId,
        inviterId: userId,
        targetUserId: resolvedTargetId,
        maxParticipantsLimit: 5,
      });
    } catch (err: any) {
      if (err instanceof CallForbiddenError) {
        return res.status(403).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallConflictError) {
        return res.status(409).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallNotFoundError) {
        return res.status(404).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    const io = getIO();
    const inviterName = (req.user as any)?.profile?.fullName || (req.user as any)?.name || "Colleague";
    const inviterAvatar = (req.user as any)?.profile?.avatarUrl || null;

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
    void PusherService.triggerUserEvent(tenantId, resolvedTargetId, "call:incoming", incomingPayload).catch(() => {});

    // Broadcast to call peers that a colleague has been invited
    const peerNotice = {
      callId,
      participant: result.participant,
      invitedUser: result.invitedUser,
    };
    io?.to(`user:${userId}`).emit("call:participant_invited", peerNotice);
    const session = activeCalls.get(callId);
    if (session) {
      const peerId = session.callerId === userId ? session.targetUserId : session.callerId;
      io?.to(`user:${peerId}`).emit("call:participant_invited", peerNotice);
    }

    return res.json({
      success: true,
      message: "Colleague invited successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[CallRoutes] Invite colleague error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to invite colleague" });
  }
});

// POST /api/calls/:callId/accept-invitation - Phase C2 In-Call Colleague Accept
callRouter.post("/:callId/accept-invitation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const deviceId = req.body?.deviceId || "default";

    let result;
    try {
      result = await CallLifecycleService.acceptParticipantInvitation({
        tenantId,
        callId,
        userId,
        deviceId,
      });
    } catch (err: any) {
      if (err instanceof CallForbiddenError) {
        return res.status(403).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallConflictError) {
        return res.status(409).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof CallNotFoundError) {
        return res.status(404).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    const io = getIO();
    const joinedPayload = {
      callId,
      userId,
      user: result.user,
      participant: result.participant,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to other participants
    const session = activeCalls.get(callId);
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
  } catch (error: any) {
    console.error("[CallRoutes] Accept invitation error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to accept invitation" });
  }
});
