import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { activeCalls, getIO } from "../socket";
import { rawPrisma, prisma } from "../prisma";
import { IncomingCallPushService } from "../services/incoming-call-push.service";

export const callRouter = Router();

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

    // 2. Fall back to persisted CallHistoryRecord (survives server restart and multi-instance deployments)
    const db = rawPrisma || prisma;
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
    const db = rawPrisma || prisma;

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
      }).catch(() => {});
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
    let session = activeCalls.get(callId);
    if (!session) {
      session = {
        callId,
        tenantId,
        callerId: currentRecord.callerId || "",
        callerName: currentRecord.callerName,
        callerAvatar: currentRecord.callerAvatarUrl,
        targetUserId: userId,
        targetName: currentRecord.receiverName,
        callType: (currentRecord.callType as any) || "audio",
        status: "connected",
        startedAt: currentRecord.startedAt,
        timeoutTimer: null,
      };
      activeCalls.set(callId, session);
    } else {
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
    const db = rawPrisma || prisma;

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
    const rejectPayload = {
      callId,
      rejectedBy: userId,
      reason: reason || "declined",
      timestamp: new Date().toISOString(),
    };

    io?.to(`user:${currentRecord.callerId}`).emit("call:rejected", rejectPayload);
    io?.to(`user:${currentRecord.receiverId}`).emit("call:rejected", rejectPayload);

    // Cancel persistent push notifications on all callee devices
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
    const db = rawPrisma || prisma;

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

    if (currentRecord.receiverId) {
      io?.to(`user:${currentRecord.receiverId}`).emit("call:cancelled", cancelPayload);
    }
    io?.to(`user:${currentRecord.callerId}`).emit("call:cancelled", cancelPayload);

    if (currentRecord.receiverId) {
      void IncomingCallPushService.sendCallCancelledPush({
        callId,
        tenantId,
        targetUserId: currentRecord.receiverId,
        reason: "Caller cancelled",
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: "Call cancelled successfully",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to cancel call" });
  }
});
