import { prisma, rawPrisma } from "../prisma";
import { Prisma } from "@prisma/client";

export class CallError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 400, code = "CALL_ERROR") {
    super(message);
    this.name = "CallError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class CallForbiddenError extends CallError {
  constructor(message = "Call forbidden") {
    super(message, 403, "CALL_FORBIDDEN");
  }
}

export class CallConflictError extends CallError {
  constructor(message = "Call state conflict") {
    super(message, 409, "CALL_CONFLICT");
  }
}

export class CallNotFoundError extends CallError {
  constructor(message = "Call not found") {
    super(message, 404, "CALL_NOT_FOUND");
  }
}

export class CallLifecycleService {
  private static db() {
    return rawPrisma || prisma;
  }

  /**
   * 1. INITIATE CALL (Atomic 1-on-1 direct session creation)
   */
  static async createCallSession(params: {
    tenantId: string;
    callerId: string;
    callerName: string;
    callerPhone?: string;
    callerEmail?: string;
    callerAvatarUrl?: string | null;
    targetUserId: string;
    targetName?: string;
    targetAvatarUrl?: string | null;
    callType: "audio" | "video";
    threadId?: string;
    roomKey?: string;
    metadata?: any;
  }) {
    const {
      tenantId,
      callerId,
      callerName,
      callerPhone = "Internal Call",
      callerEmail,
      callerAvatarUrl = null,
      targetUserId,
      targetName = "Colleague",
      targetAvatarUrl = null,
      callType,
      threadId = `direct_${[callerId, targetUserId].sort().join("_")}`,
      roomKey = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      metadata = null,
    } = params;

    const db = this.db();

    // Check if either party is already in an active/ringing call in this tenant
    const busyCall = await db.call.findFirst({
      where: {
        tenantId,
        status: { in: ["RINGING", "ACTIVE"] },
        participants: {
          some: {
            userId: { in: [callerId, targetUserId] },
            state: { in: ["RINGING", "JOINED", "RECONNECTING"] },
          },
        },
      },
      include: { participants: true },
    });

    if (busyCall) {
      const busyParticipant = busyCall.participants.find(
        (p) => (p.userId === callerId || p.userId === targetUserId) && ["RINGING", "JOINED", "RECONNECTING"].includes(p.state)
      );
      const busyUserId = busyParticipant?.userId || targetUserId;
      throw new CallConflictError(
        busyUserId === targetUserId ? "User is currently on another call." : "You are already in another call."
      );
    }

    const startedAt = new Date();
    const ringingExpiresAt = new Date(startedAt.getTime() + 60000); // Authoritative 60-second timeout

    return await db.$transaction(async (tx) => {
      // Step A: Dual-write create initial CallHistoryRecord
      const historyRecord = await tx.callHistoryRecord.create({
        data: {
          tenantId,
          callSessionId: roomKey,
          callerId,
          callerName,
          callerPhone,
          callerEmail: callerEmail || null,
          callerAvatarUrl,
          receiverId: targetUserId,
          receiverName: targetName,
          receiverAvatarUrl: targetAvatarUrl,
          direction: "outgoing",
          callType,
          status: "ringing",
          durationSeconds: 0,
          callTime: startedAt,
          startedAt,
          groupId: threadId ? (threadId.length <= 36 ? threadId : threadId.substring(0, 36)) : null,
          notes: `Initiated ${callType} call via Authoritative Lifecycle Engine`,
        },
      });

      // Step B: Create Authoritative Call model linked by historyRecordId
      const call = await tx.call.create({
        data: {
          tenantId,
          type: "DIRECT",
          media: callType.toUpperCase(),
          status: "RINGING",
          startedBy: callerId,
          roomKey,
          threadId,
          historyRecordId: historyRecord.id,
          startedAt,
          ringingExpiresAt,
          metadata: metadata || Prisma.JsonNull,
        },
      });

      // Step C: Create caller participant (HOST, JOINED)
      const callerParticipant = await tx.callParticipant.create({
        data: {
          callId: call.id,
          userId: callerId,
          role: "HOST",
          state: "JOINED",
          joinedAt: startedAt,
        },
      });

      // Step D: Create callee participant (PARTICIPANT, RINGING)
      const calleeParticipant = await tx.callParticipant.create({
        data: {
          callId: call.id,
          userId: targetUserId,
          role: "PARTICIPANT",
          state: "RINGING",
        },
      });

      // Step E: Create immutable audit trail event
      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: callerId,
          eventType: "CALL_INITIATED",
          metadata: { callType, targetUserId, historyRecordId: historyRecord.id },
          createdAt: startedAt,
        },
      });

      return {
        call,
        callerParticipant,
        calleeParticipant,
        historyRecord,
      };
    });
  }

  /**
   * 2. ACCEPT CALL (Row-Locked Atomic State Transition)
   */
  static async acceptCallTransaction(params: {
    tenantId: string;
    callId: string;
    calleeId: string;
    deviceId?: string;
  }) {
    const { tenantId, callId, calleeId, deviceId = "default" } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      // LEVEL 1 LOCK: Lock Call row FOR UPDATE
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;

      if (!calls || calls.length === 0) {
        throw new CallNotFoundError("Call not found or unauthorized");
      }
      const call = calls[0];

      if (call.status !== "RINGING") {
        throw new CallConflictError("CALL_ALREADY_ANSWERED_OR_ENDED");
      }

      if (new Date() >= new Date(call.ringing_expires_at)) {
        throw new CallConflictError("CALL_RINGING_EXPIRED");
      }

      // LEVEL 2 LOCK: Lock intended participant row FOR UPDATE
      const participants = await tx.$queryRaw<any[]>`
        SELECT * FROM "call_participants"
        WHERE "call_id" = ${call.id} AND "user_id" = ${calleeId}
        FOR UPDATE
      `;

      if (!participants || participants.length === 0) {
        throw new CallForbiddenError("Authenticated user is not a participant in this call");
      }
      const participant = participants[0];

      if (participant.state !== "RINGING") {
        throw new CallConflictError("CALLEE_NOT_IN_RINGING_STATE");
      }

      const answeredAt = new Date();

      // Update Call state
      const updatedCall = await tx.call.update({
        where: { id: call.id },
        data: {
          status: "ACTIVE",
          answeredAt,
        },
      });

      // Update participant state
      const updatedParticipant = await tx.callParticipant.update({
        where: { id: participant.id },
        data: {
          state: "JOINED",
          joinedAt: answeredAt,
        },
      });

      // Record audit event
      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: calleeId,
          eventType: "CALL_ACCEPTED",
          metadata: { answeredBy: calleeId, deviceId },
          createdAt: answeredAt,
        },
      });

      // Dual-write update to CallHistoryRecord by Primary Key
      if (call.history_record_id) {
        await tx.callHistoryRecord.update({
          where: { id: call.history_record_id },
          data: { status: "connected" },
        });
      }

      return {
        call: updatedCall,
        participant: updatedParticipant,
      };
    });
  }

  /**
   * 3. REJECT CALL (Atomic callee rejection)
   */
  static async rejectCallTransaction(params: {
    tenantId: string;
    callId: string;
    calleeId: string;
    reason?: string;
  }) {
    const { tenantId, callId, calleeId, reason = "declined" } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      // LEVEL 1 LOCK: Lock Call
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) throw new CallNotFoundError();
      const call = calls[0];

      if (call.status !== "RINGING") {
        // Idempotency: If already rejected or ended, return existing call
        return call;
      }

      // LEVEL 2 LOCK: Lock Participant
      const participants = await tx.$queryRaw<any[]>`
        SELECT * FROM "call_participants"
        WHERE "call_id" = ${call.id} AND "user_id" = ${calleeId}
        FOR UPDATE
      `;
      if (!participants || participants.length === 0) throw new CallForbiddenError();
      const participant = participants[0];

      const endedAt = new Date();

      const updatedCall = await tx.call.update({
        where: { id: call.id },
        data: {
          status: "REJECTED",
          endedAt,
          endReason: reason,
        },
      });

      await tx.callParticipant.update({
        where: { id: participant.id },
        data: {
          state: "DECLINED",
          leftAt: endedAt,
          leaveReason: reason,
        },
      });

      await tx.callParticipant.updateMany({
        where: { callId: call.id, userId: { not: calleeId }, state: "JOINED" },
        data: { state: "LEFT", leftAt: endedAt, leaveReason: "PEER_REJECTED" },
      });

      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: calleeId,
          eventType: "CALL_REJECTED",
          metadata: { reason },
          createdAt: endedAt,
        },
      });

      if (call.history_record_id) {
        await tx.callHistoryRecord.update({
          where: { id: call.history_record_id },
          data: {
            status: "rejected",
            endedAt,
            notes: `Rejected: ${reason}`,
          },
        });
      }

      return updatedCall;
    });
  }

  /**
   * 4. CANCEL CALL (Atomic caller cancellation while ringing)
   */
  static async cancelCallTransaction(params: {
    tenantId: string;
    callId: string;
    callerId: string;
    reason?: string;
  }) {
    const { tenantId, callId, callerId, reason = "caller_cancelled" } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      // LEVEL 1 LOCK: Lock Call
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) throw new CallNotFoundError();
      const call = calls[0];

      if (call.status !== "RINGING") {
        return call; // Idempotent return
      }

      if (call.started_by !== callerId) {
        throw new CallForbiddenError("Only the call initiator can cancel a ringing call");
      }

      const endedAt = new Date();

      const updatedCall = await tx.call.update({
        where: { id: call.id },
        data: {
          status: "CANCELLED",
          endedAt,
          endReason: reason,
        },
      });

      await tx.callParticipant.updateMany({
        where: { callId: call.id },
        data: {
          state: "LEFT",
          leftAt: endedAt,
          leaveReason: reason,
        },
      });

      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: callerId,
          eventType: "CALL_CANCELLED",
          metadata: { reason },
          createdAt: endedAt,
        },
      });

      if (call.history_record_id) {
        await tx.callHistoryRecord.update({
          where: { id: call.history_record_id },
          data: {
            status: "cancelled",
            endedAt,
            notes: "Call cancelled by caller before answered.",
          },
        });
      }

      return updatedCall;
    });
  }

  /**
   * 5. PARTICIPANT DISCONNECT (Start 30-Second Reconnect Grace Window)
   */
  static async markParticipantReconnecting(params: {
    tenantId: string;
    callId: string;
    userId: string;
    graceSeconds?: number;
  }) {
    const { tenantId, callId, userId, graceSeconds = 30 } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) return null;
      const call = calls[0];

      if (call.status !== "ACTIVE") {
        return null;
      }

      const participants = await tx.$queryRaw<any[]>`
        SELECT * FROM "call_participants"
        WHERE "call_id" = ${call.id} AND "user_id" = ${userId}
        FOR UPDATE
      `;
      if (!participants || participants.length === 0) return null;
      const participant = participants[0];

      if (participant.state !== "JOINED") {
        return null;
      }

      const now = new Date();
      const reconnectGraceExpiresAt = new Date(now.getTime() + graceSeconds * 1000);

      const updatedParticipant = await tx.callParticipant.update({
        where: { id: participant.id },
        data: {
          state: "RECONNECTING",
          reconnectGraceExpiresAt,
        },
      });

      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: userId,
          eventType: "PARTICIPANT_DISCONNECTED",
          metadata: { graceSeconds, reconnectGraceExpiresAt },
          createdAt: now,
        },
      });

      return {
        call,
        participant: updatedParticipant,
        graceSecondsRemaining: graceSeconds,
      };
    });
  }

  /**
   * 6. RECONNECT PARTICIPANT (Restore JOINED state within grace period)
   */
  static async reconnectParticipantTransaction(params: {
    tenantId: string;
    callId: string;
    userId: string;
  }) {
    const { tenantId, callId, userId } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) throw new CallNotFoundError();
      const call = calls[0];

      if (call.status !== "ACTIVE") {
        throw new CallConflictError("CALL_NOT_ACTIVE");
      }

      const participants = await tx.$queryRaw<any[]>`
        SELECT * FROM "call_participants"
        WHERE "call_id" = ${call.id} AND "user_id" = ${userId}
        FOR UPDATE
      `;
      if (!participants || participants.length === 0) throw new CallForbiddenError();
      const participant = participants[0];

      if (participant.state === "JOINED") {
        return { call, participant }; // Idempotent success
      }

      if (participant.state !== "RECONNECTING") {
        throw new CallConflictError("PARTICIPANT_NOT_IN_RECONNECTING_STATE");
      }

      if (new Date() >= new Date(participant.reconnect_grace_expires_at)) {
        throw new CallConflictError("RECONNECT_GRACE_EXPIRED");
      }

      const updatedParticipant = await tx.callParticipant.update({
        where: { id: participant.id },
        data: {
          state: "JOINED",
          reconnectGraceExpiresAt: null,
        },
      });

      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: userId,
          eventType: "PARTICIPANT_RECONNECTED",
          metadata: { reconnectedAt: new Date() },
          createdAt: new Date(),
        },
      });

      return {
        call,
        participant: updatedParticipant,
      };
    });
  }

  /**
   * 7. TERMINATE CALL (Hangup / Expiry Finalization with Authoritative Duration)
   */
  static async terminateCallTransaction(params: {
    tenantId: string;
    callId: string;
    actorId: string;
    endReason: string;
    finalHistoryStatus?: "completed" | "missed" | "cancelled" | "rejected";
    notes?: string;
  }) {
    const {
      tenantId,
      callId,
      actorId,
      endReason,
      finalHistoryStatus = "completed",
      notes,
    } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) return null;
      const call = calls[0];

      if (["ENDED", "CANCELLED", "REJECTED", "MISSED"].includes(call.status)) {
        return call; // Idempotently return already terminated call
      }

      const endedAt = new Date();
      const durationSeconds = call.answered_at
        ? Math.max(0, Math.round((endedAt.getTime() - new Date(call.answered_at).getTime()) / 1000))
        : 0;

      const targetStatus = finalHistoryStatus === "completed" ? "ENDED" : finalHistoryStatus.toUpperCase();

      const updatedCall = await tx.call.update({
        where: { id: call.id },
        data: {
          status: targetStatus,
          endedAt,
          endReason,
        },
      });

      await tx.callParticipant.updateMany({
        where: {
          callId: call.id,
          state: { in: ["JOINED", "RINGING", "INVITED", "RECONNECTING"] },
        },
        data: {
          state: "LEFT",
          leftAt: endedAt,
          leaveReason: endReason,
          reconnectGraceExpiresAt: null,
        },
      });

      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId,
          eventType: `CALL_${targetStatus}`,
          metadata: { endReason, durationSeconds },
          createdAt: endedAt,
        },
      });

      if (call.history_record_id) {
        await tx.callHistoryRecord.update({
          where: { id: call.history_record_id },
          data: {
            status: finalHistoryStatus,
            endedAt,
            durationSeconds,
            notes: notes || `Call ended (${endReason}). Duration: ${durationSeconds}s`,
          },
        });
      }

      return {
        ...updatedCall,
        durationSeconds,
      };
    });
  }

  /**
   * 8. DISTRIBUTED BOUNDED EXPIRY RECOVERY (No high-frequency unbounded polling)
   */
  static async recoverExpiredCalls(tenantId?: string): Promise<{ expiredRinging: number; expiredReconnecting: number }> {
    const db = this.db();
    const now = new Date();
    let expiredRinging = 0;
    let expiredReconnecting = 0;

    // 1. Recover expired ringing calls (LIMIT 25)
    const ringingQuery = tenantId
      ? db.call.findMany({
          where: { tenantId, status: "RINGING", ringingExpiresAt: { lte: now } },
          select: { id: true, tenantId: true },
          take: 25,
        })
      : db.call.findMany({
          where: { status: "RINGING", ringingExpiresAt: { lte: now } },
          select: { id: true, tenantId: true },
          take: 25,
        });

    const expiredRingingCalls = await ringingQuery;

    for (const c of expiredRingingCalls) {
      try {
        await this.terminateCallTransaction({
          tenantId: c.tenantId,
          callId: c.id,
          actorId: "SYSTEM_RECOVERY",
          endReason: "TIMEOUT",
          finalHistoryStatus: "missed",
          notes: "Call missed (authoritative 60-second ringing timeout expired)",
        });
        expiredRinging++;
      } catch {}
    }

    // 2. Recover expired reconnecting participants (LIMIT 25)
    const reconnectingParticipants = await db.callParticipant.findMany({
      where: {
        state: "RECONNECTING",
        reconnectGraceExpiresAt: { lte: now },
      },
      select: {
        id: true,
        callId: true,
        userId: true,
        call: { select: { tenantId: true, type: true } },
      },
      take: 25,
    });

    for (const p of reconnectingParticipants) {
      try {
        // Direct call requires both participants; if one expires reconnect grace, direct call ends
        if (p.call.type === "DIRECT") {
          await this.terminateCallTransaction({
            tenantId: p.call.tenantId,
            callId: p.callId,
            actorId: "SYSTEM_RECOVERY",
            endReason: "PEER_DISCONNECTED",
            finalHistoryStatus: "completed",
            notes: "Call ended: participant failed to reconnect within 30-second grace window",
          });
        } else {
          // Group call: only mark this participant LEFT
          await db.callParticipant.update({
            where: { id: p.id },
            data: { state: "LEFT", leftAt: now, leaveReason: "TIMEOUT" },
          });
        }
        expiredReconnecting++;
      } catch {}
    }

    return { expiredRinging, expiredReconnecting };
  }

  /**
   * 9. ADD PARTICIPANT TO ACTIVE CALL (Phase C2 In-Call Colleague Invitation)
   */
  static async addParticipantToActiveCall(params: {
    tenantId: string;
    callId: string;
    inviterId: string;
    targetUserId: string;
    maxParticipantsLimit?: number;
  }) {
    const { tenantId, callId, inviterId, targetUserId, maxParticipantsLimit = 5 } = params;
    const db = this.db();

    // Prevent self-invitation
    if (inviterId === targetUserId) {
      throw new CallConflictError("Cannot invite yourself to an active call.");
    }

    return await db.$transaction(async (tx) => {
      // 1. Lock Call row FOR UPDATE
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) {
        throw new CallNotFoundError("Call session not found or unauthorized.");
      }
      const call = calls[0];

      // Must be ACTIVE or RINGING
      if (call.status !== "ACTIVE" && call.status !== "RINGING") {
        throw new CallConflictError("Cannot add participants to an inactive or ended call.");
      }

      // 2. Verify inviter is an active participant in this call
      const inviterParticipants = await tx.$queryRaw<any[]>`
        SELECT * FROM "call_participants"
        WHERE "call_id" = ${call.id} AND "user_id" = ${inviterId}
        FOR UPDATE
      `;
      if (!inviterParticipants || inviterParticipants.length === 0 || !["JOINED", "RINGING"].includes(inviterParticipants[0].state)) {
        throw new CallForbiddenError("Only active participants can invite colleagues to this call.");
      }

      // 3. Verify target user belongs to the same tenant
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, profile: { tenantId } },
        include: { profile: true },
      });
      if (!targetUser) {
        throw new CallForbiddenError("User not found or does not belong to your organization.");
      }

      // 4. Check current participant count against maxParticipantsLimit (Mesh upper bound: 5)
      const currentParticipants = await tx.callParticipant.findMany({
        where: {
          callId: call.id,
          state: { in: ["INVITED", "RINGING", "JOINED", "RECONNECTING"] },
        },
      });

      if (currentParticipants.length >= maxParticipantsLimit) {
        throw new CallConflictError(`Maximum participant limit (${maxParticipantsLimit} peers for P2P mesh) reached.`);
      }

      // 5. Check if target user is already in this call
      const existing = currentParticipants.find((p) => p.userId === targetUserId);
      if (existing) {
        if (existing.state === "JOINED") {
          throw new CallConflictError("User is already in this call.");
        }
        if (existing.state === "INVITED" || existing.state === "RINGING") {
          throw new CallConflictError("User has already been invited to this call.");
        }
      }

      // 6. Check if target user is currently busy on another active call in this tenant
      const busyCall = await tx.call.findFirst({
        where: {
          tenantId,
          status: { in: ["RINGING", "ACTIVE"] },
          id: { not: call.id },
          participants: {
            some: {
              userId: targetUserId,
              state: { in: ["RINGING", "JOINED", "RECONNECTING"] },
            },
          },
        },
      });
      if (busyCall) {
        throw new CallConflictError("Colleague is currently on another call.");
      }

      // 7. Upsert or create participant row with state 'INVITED'
      const participant = await tx.callParticipant.upsert({
        where: {
          callId_userId: {
            callId: call.id,
            userId: targetUserId,
          },
        },
        create: {
          callId: call.id,
          userId: targetUserId,
          role: "PARTICIPANT",
          state: "INVITED",
        },
        update: {
          state: "INVITED",
          role: "PARTICIPANT",
          leftAt: null,
          leaveReason: null,
          reconnectGraceExpiresAt: null,
        },
      });

      // 8. If call was direct, upgrade call type to 'GROUP' and maxParticipants to maxParticipantsLimit
      if (call.type === "DIRECT" || call.max_participants < maxParticipantsLimit) {
        await tx.call.update({
          where: { id: call.id },
          data: {
            type: "GROUP",
            maxParticipants: maxParticipantsLimit,
          },
        });
      }

      // 9. Record audit event
      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: inviterId,
          eventType: "PARTICIPANT_INVITED",
          metadata: {
            invitedUserId: targetUserId,
            invitedUserName: targetUser.profile?.fullName || targetUser.email,
          },
          createdAt: new Date(),
        },
      });

      return {
        callId: call.id,
        roomKey: call.room_key,
        callType: call.media.toLowerCase(),
        participant,
        invitedUser: {
          id: targetUser.id,
          name: targetUser.profile?.fullName || targetUser.email,
          avatarUrl: targetUser.profile?.avatarUrl,
          email: targetUser.email,
        },
      };
    });
  }

  /**
   * 10. ACCEPT PARTICIPANT INVITATION (Phase C2 In-Call Colleague Acceptance)
   */
  static async acceptParticipantInvitation(params: {
    tenantId: string;
    callId: string;
    userId: string;
    deviceId?: string;
  }) {
    const { tenantId, callId, userId, deviceId = "default" } = params;
    const db = this.db();

    return await db.$transaction(async (tx) => {
      // 1. Lock Call row FOR UPDATE
      const calls = await tx.$queryRaw<any[]>`
        SELECT * FROM "calls"
        WHERE ("id" = ${callId} OR "room_key" = ${callId}) AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      if (!calls || calls.length === 0) {
        throw new CallNotFoundError("Call not found or unauthorized");
      }
      const call = calls[0];

      if (call.status !== "ACTIVE" && call.status !== "RINGING") {
        throw new CallConflictError("CALL_ALREADY_ENDED");
      }

      // 2. Lock participant row FOR UPDATE
      const participants = await tx.$queryRaw<any[]>`
        SELECT * FROM "call_participants"
        WHERE "call_id" = ${call.id} AND "user_id" = ${userId}
        FOR UPDATE
      `;
      if (!participants || participants.length === 0) {
        throw new CallForbiddenError("User was not invited to this call");
      }
      const participant = participants[0];

      if (participant.state !== "INVITED" && participant.state !== "RINGING") {
        if (participant.state === "JOINED") {
          return { call, participant, alreadyJoined: true };
        }
        throw new CallConflictError(`Participant state is ${participant.state}, cannot accept`);
      }

      const joinedAt = new Date();

      // If call is still RINGING, transition to ACTIVE
      let updatedCall = call;
      if (call.status === "RINGING") {
        updatedCall = await tx.call.update({
          where: { id: call.id },
          data: { status: "ACTIVE", answeredAt: joinedAt },
        });
      }

      // Update participant to JOINED
      const updatedParticipant = await tx.callParticipant.update({
        where: { id: participant.id },
        data: {
          state: "JOINED",
          joinedAt,
        },
      });

      // Record audit event
      await tx.callEvent.create({
        data: {
          callId: call.id,
          actorId: userId,
          eventType: "PARTICIPANT_JOINED",
          metadata: { joinedBy: userId, deviceId },
          createdAt: joinedAt,
        },
      });

      // User details for broadcast
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      return {
        call: updatedCall,
        participant: updatedParticipant,
        user: {
          id: user?.id || userId,
          name: user?.profile?.fullName || user?.email || "Colleague",
          avatarUrl: user?.profile?.avatarUrl || null,
        },
      };
    });
  }
}
