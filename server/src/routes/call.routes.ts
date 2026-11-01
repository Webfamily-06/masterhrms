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

// POST /api/calls/:callId/accept - Authenticated call acceptance (explicit user click mandatory)
callRouter.post("/:callId/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const db = rawPrisma || prisma;

    let session = activeCalls.get(callId);

    // Database fallback if server restarted or activeCalls memory cleared
    if (!session || session.tenantId !== tenantId) {
      const history = await db.callHistoryRecord.findFirst({
        where: { tenantId, callSessionId: callId },
      });
      if (history && history.status === "ringing") {
        const now = Date.now();
        const started = history.startedAt ? new Date(history.startedAt).getTime() : now;
        if (now - started <= 60000) {
          session = {
            callId,
            tenantId,
            callerId: history.callerId || "",
            callerName: history.callerName,
            callerAvatar: history.callerAvatarUrl,
            targetUserId: history.receiverId || "",
            targetName: history.receiverName,
            callType: (history.callType as any) || "audio",
            status: "ringing",
            startedAt: history.startedAt,
            timeoutTimer: null,
          };
          activeCalls.set(callId, session);
        }
      }
    }

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

    // Update persisted DB record
    await db.callHistoryRecord.updateMany({
      where: { tenantId, callSessionId: callId },
      data: { status: "connected" },
    }).catch(() => {});

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

// POST /api/calls/:callId/reject - Authenticated call rejection
callRouter.post("/:callId/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body || {};
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const db = rawPrisma || prisma;

    let session = activeCalls.get(callId);

    // If server restarted, handle via DB
    if (!session || session.tenantId !== tenantId) {
      const history = await db.callHistoryRecord.findFirst({
        where: { tenantId, callSessionId: callId },
      });
      if (history) {
        if (history.receiverId && history.receiverId !== userId) {
          return res.status(403).json({ success: false, error: "Only the designated recipient may reject this call." });
        }
        await db.callHistoryRecord.update({
          where: { id: history.id },
          data: { status: "rejected", endedAt: new Date(), notes: reason || "Declined via REST" },
        }).catch(() => {});
        return res.json({ success: true, message: "Call rejected successfully" });
      }
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
    activeCalls.delete(callId);

    // Update persisted DB record
    await db.callHistoryRecord.updateMany({
      where: { tenantId, callSessionId: callId },
      data: { status: "rejected", endedAt: new Date(), notes: reason || "Declined via REST" },
    }).catch(() => {});

    const io = getIO();
    const rejectPayload = {
      callId,
      rejectedBy: userId,
      reason: reason || "declined",
      timestamp: new Date().toISOString(),
    };

    io?.to(`user:${session.callerId}`).emit("call:rejected", rejectPayload);
    io?.to(`user:${session.targetUserId}`).emit("call:rejected", rejectPayload);

    // Also cancel any persistent push notifications on the client
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

// POST /api/calls/:callId/cancel - Caller cancellation
callRouter.post("/:callId/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;
    const db = rawPrisma || prisma;

    let session = activeCalls.get(callId);

    if (!session || session.tenantId !== tenantId) {
      const history = await db.callHistoryRecord.findFirst({
        where: { tenantId, callSessionId: callId },
      });
      if (history) {
        if (history.callerId && history.callerId !== userId) {
          return res.status(403).json({ success: false, error: "Only the caller may cancel this call." });
        }
        await db.callHistoryRecord.update({
          where: { id: history.id },
          data: { status: "cancelled", endedAt: new Date(), notes: "Cancelled via REST" },
        }).catch(() => {});
        return res.json({ success: true, message: "Call cancelled successfully" });
      }
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
    activeCalls.delete(callId);

    await db.callHistoryRecord.updateMany({
      where: { tenantId, callSessionId: callId },
      data: { status: "cancelled", endedAt: new Date(), notes: "Cancelled via REST" },
    }).catch(() => {});

    const io = getIO();
    const cancelPayload = {
      callId,
      cancelledBy: userId,
      reason: "Caller cancelled",
      timestamp: new Date().toISOString(),
    };

    io?.to(`user:${session.targetUserId}`).emit("call:cancelled", cancelPayload);
    io?.to(`user:${session.callerId}`).emit("call:cancelled", cancelPayload);

    void IncomingCallPushService.sendCallCancelledPush({
      callId,
      tenantId,
      targetUserId: session.targetUserId,
      reason: "Caller cancelled",
    }).catch(() => {});

    return res.json({
      success: true,
      message: "Call cancelled successfully",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to cancel call" });
  }
});
