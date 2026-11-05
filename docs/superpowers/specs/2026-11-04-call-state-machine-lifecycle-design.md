# Phase C1 Design Specification: Authoritative Call State Machine & Lifecycle (FINAL PRE-MIGRATION)

**Date:** 2026-11-04  
**Revision:** 3.0 (Final Pre-Migration Review)  
**Author:** Antigravity Architect & Senior Reliability Engineer  
**Status:** COMPLETE DESIGN SPECIFICATION — AWAITING MIGRATION AUTHORIZATION  
**Reference Document:** `MASTERHRMS_CHAT_CALLING_C0_ROOT_CAUSE_AUDIT.md`  

---

## 1. System Architecture & Corrected Design Decisions

This final specification incorporates all requirements from the pre-migration architectural review:
1. **Deterministic 1-to-1 Mapping to CallHistoryRecord:** Added `historyRecordId String? @map("history_record_id") @db.VarChar(36)` to `Call`. The `CallHistoryRecord` row is created/linked upon call initiation, ensuring all subsequent transitions (acceptance, rejection, cancel, timeout, hangup) update the exact history record by primary key `id`. No ambiguous `call_session_id` lookups or unique index additions are required, safely tolerating legacy duplicates.
2. **Explicit Two-Level Row-Level Locking:** All transactional transitions lock the `calls` row first (`SELECT ... FOR UPDATE`), followed immediately by the `call_participants` row (`SELECT ... FOR UPDATE`). This uniform lock order eliminates any possibility of PostgreSQL deadlocks.
3. **Cryptographic Historical Data Integrity:** Deterministic canonical serialization and SHA-256 hashing verifies all 119 pre-existing `CallHistoryRecord` rows (`0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`) before and after migration.
4. **Distributed Expiry Recovery (Zero High-Frequency Polling):** Persisted `ringing_expires_at` and `reconnect_grace_expires_at` with bounded batch processing (LIMIT 25) prevent duplicate finalization across multi-instance clusters.
5. **Peer Disconnect UX Isolation:** Participant B disconnecting never closes Participant A's window unexpectedly. It displays a 30-second reconnecting banner; upon grace expiry, it transitions cleanly to the **Call Summary Screen** with explicit user actions ("Call Again" / "Back to Chat").
6. **Reliable Post-Commit Event Delivery:** Socket.IO / Pusher events are dispatched strictly after database transaction commits. Client deduplication and server status polling (`GET /status`) guarantee resilience against process drops without an unneeded transactional outbox.

---

## 2. Final Prisma Schema Specification

```prisma
// Authoritative Active Call Session (Phase C1)
model Call {
  id               String            @id @default(uuid()) @db.VarChar(36)
  tenantId         String            @map("tenant_id") @db.VarChar(36)
  type             String            @default("DIRECT") @db.VarChar(20) // DIRECT, GROUP
  media            String            @default("AUDIO") @db.VarChar(20)  // AUDIO, VIDEO
  status           String            @default("RINGING") @db.VarChar(20) // RINGING, ACTIVE, ENDED, MISSED, CANCELLED, REJECTED
  startedBy        String            @map("started_by") @db.VarChar(36)
  roomKey          String            @unique @map("room_key") @db.VarChar(100)
  groupId          String?           @map("group_id") @db.VarChar(36)
  threadId         String?           @map("thread_id") @db.VarChar(100)
  historyRecordId  String?           @map("history_record_id") @db.VarChar(36) // Deterministic 1-to-1 link to CallHistoryRecord
  startedAt        DateTime          @default(now()) @map("started_at")
  ringingExpiresAt DateTime          @map("ringing_expires_at") // Persisted 60-second timeout
  answeredAt       DateTime?         @map("answered_at")
  endedAt          DateTime?         @map("ended_at")
  endReason        String?           @map("end_reason") @db.VarChar(50) // ALL_LEFT, HOST_ENDED, TIMEOUT, CANCELLED, REJECTED, PEER_DISCONNECTED
  maxParticipants  Int               @default(2) @map("max_participants")
  metadata         Json?             @db.JsonB

  participants     CallParticipant[]
  events           CallEvent[]
  tenant           Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, status])
  @@index([tenantId, startedAt])
  @@index([status, ringingExpiresAt])
  @@map("calls")
}

// Authoritative Participant Membership (Phase C1)
// Note: audioOn, videoOn, screenOn kept in ephemeral realtime layer per mandatory adjustment.
model CallParticipant {
  id                      String    @id @default(uuid()) @db.VarChar(36)
  callId                  String    @map("call_id") @db.VarChar(36)
  userId                  String    @map("user_id") @db.VarChar(36)
  state                   String    @default("INVITED") @db.VarChar(20) // INVITED, RINGING, JOINED, RECONNECTING, LEFT, DECLINED, MISSED
  role                    String    @default("PARTICIPANT") @db.VarChar(20) // HOST, PARTICIPANT
  joinedAt                DateTime? @map("joined_at")
  leftAt                  DateTime? @map("left_at")
  leaveReason             String?   @map("leave_reason") @db.VarChar(50)
  reconnectGraceExpiresAt DateTime? @map("reconnect_grace_expires_at") // Persisted 30-second grace window

  call                    Call      @relation(fields: [callId], references: [id], onDelete: Cascade)

  @@unique([callId, userId])
  @@index([userId, state])
  @@index([state, reconnectGraceExpiresAt])
  @@map("call_participants")
}

// Immutable Call Audit Trail (Phase C1)
model CallEvent {
  id        String   @id @default(uuid()) @db.VarChar(36)
  callId    String   @map("call_id") @db.VarChar(36)
  actorId   String   @map("actor_id") @db.VarChar(36)
  eventType String   @map("event_type") @db.VarChar(50) // CALL_INITIATED, CALL_ACCEPTED, PARTICIPANT_DISCONNECTED, RECONNECTED, CALL_ENDED
  metadata  Json?    @db.JsonB
  createdAt DateTime @default(now()) @map("created_at")

  call      Call     @relation(fields: [callId], references: [id], onDelete: Cascade)

  @@index([callId, createdAt])
  @@map("call_events")
}
```

---

## 3. Revised Additive Migration SQL

```sql
-- Phase C1: Authoritative Call State Machine & Lifecycle (Additive & Reversible)
-- Preserves existing call_history_records and all prior tables.

CREATE TABLE IF NOT EXISTS "calls" (
    "id" VARCHAR(36) NOT NULL,
    "tenant_id" VARCHAR(36) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'DIRECT',
    "media" VARCHAR(20) NOT NULL DEFAULT 'AUDIO',
    "status" VARCHAR(20) NOT NULL DEFAULT 'RINGING',
    "started_by" VARCHAR(36) NOT NULL,
    "room_key" VARCHAR(100) NOT NULL,
    "group_id" VARCHAR(36),
    "thread_id" VARCHAR(100),
    "history_record_id" VARCHAR(36),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringing_expires_at" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "end_reason" VARCHAR(50),
    "max_participants" INTEGER NOT NULL DEFAULT 2,
    "metadata" JSONB,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calls_room_key_key" ON "calls"("room_key");
CREATE INDEX IF NOT EXISTS "calls_tenant_id_status_idx" ON "calls"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "calls_tenant_id_started_at_idx" ON "calls"("tenant_id", "started_at");
CREATE INDEX IF NOT EXISTS "calls_status_ringing_expires_at_idx" ON "calls"("status", "ringing_expires_at");

CREATE TABLE IF NOT EXISTS "call_participants" (
    "id" VARCHAR(36) NOT NULL,
    "call_id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'INVITED',
    "role" VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "leave_reason" VARCHAR(50),
    "reconnect_grace_expires_at" TIMESTAMP(3),

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "call_participants_call_id_user_id_key" ON "call_participants"("call_id", "user_id");
CREATE INDEX IF NOT EXISTS "call_participants_user_id_state_idx" ON "call_participants"("user_id", "state");
CREATE INDEX IF NOT EXISTS "call_participants_state_reconnect_grace_expires_at_idx" ON "call_participants"("state", "reconnect_grace_expires_at");

CREATE TABLE IF NOT EXISTS "call_events" (
    "id" VARCHAR(36) NOT NULL,
    "call_id" VARCHAR(36) NOT NULL,
    "actor_id" VARCHAR(36) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_events_call_id_created_at_idx" ON "call_events"("call_id", "created_at");

-- Safe Foreign Key Attachment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'calls_tenant_id_fkey'
    ) THEN
        ALTER TABLE "calls" ADD CONSTRAINT "calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'call_participants_call_id_fkey'
    ) THEN
        ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'call_events_call_id_fkey'
    ) THEN
        ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

---

## 4. Participant Locking & Race-Condition Pseudocode

### A. Two-Level Locking Acceptance Transaction
```typescript
export async function acceptCallTransaction(params: {
  tenantId: string;
  callId: string;
  calleeId: string; // Authenticated from JWT
  deviceId: string;
}): Promise<{ call: Call; participant: CallParticipant }> {
  const { tenantId, callId, calleeId, deviceId } = params;

  return await prisma.$transaction(async (tx) => {
    // LEVEL 1 LOCK: Lock Call row FOR UPDATE
    const calls = await tx.$queryRaw<Call[]>`
      SELECT * FROM "calls"
      WHERE "id" = ${callId} AND "tenant_id" = ${tenantId}
      FOR UPDATE
    `;

    if (!calls || calls.length === 0) {
      throw new CallError("CALL_NOT_FOUND", 404);
    }
    const currentCall = calls[0];

    // Check pre-conditions under lock
    if (currentCall.status !== "RINGING") {
      throw new CallConflictError("CALL_ALREADY_ANSWERED_OR_ENDED");
    }
    if (new Date() >= new Date(currentCall.ringingExpiresAt)) {
      throw new CallConflictError("CALL_RINGING_EXPIRED");
    }

    // LEVEL 2 LOCK: Lock intended participant row FOR UPDATE
    const participants = await tx.$queryRaw<CallParticipant[]>`
      SELECT * FROM "call_participants"
      WHERE "call_id" = ${callId} AND "user_id" = ${calleeId}
      FOR UPDATE
    `;

    if (!participants || participants.length === 0) {
      throw new CallForbiddenError("CALLEE_NOT_PARTICIPANT");
    }
    const participant = participants[0];

    if (participant.state !== "RINGING") {
      throw new CallForbiddenError("CALLEE_NOT_IN_RINGING_STATE");
    }

    // Conditional atomic update
    const answeredAt = new Date();
    const updatedCall = await tx.call.update({
      where: { id: callId },
      data: { status: "ACTIVE", answeredAt },
    });

    const updatedParticipant = await tx.callParticipant.update({
      where: { id: participant.id },
      data: { state: "JOINED", joinedAt: answeredAt },
    });

    // Record immutable audit event
    await tx.callEvent.create({
      data: {
        callId,
        actorId: calleeId,
        eventType: "CALL_ACCEPTED",
        metadata: { answeredBy: calleeId, deviceId },
      },
    });

    // Authoritative 1-to-1 update of CallHistoryRecord by Primary Key
    if (currentCall.historyRecordId) {
      await tx.callHistoryRecord.update({
        where: { id: currentCall.historyRecordId },
        data: { status: "connected" },
      });
    }

    return { call: updatedCall, participant: updatedParticipant };
  });
}
```

---

## 5. Peer Disconnect UX: Direct vs Group Calls

| Dimension | 1-on-1 Direct Calling (Phase C1) | Multiparty Group Calling (Phase C3 Preview) |
|---|---|---|
| **Participant Count** | Exactly 2 participants (Caller & Callee) | 3 to 20+ participants |
| **Drop Trigger** | User B socket count drops to 0 in tenant | Any single participant drops |
| **Backend State** | B $\rightarrow$ `RECONNECTING`, `reconnectGraceExpiresAt: now + 30s` | B $\rightarrow$ `RECONNECTING`, `reconnectGraceExpiresAt: now + 30s` |
| **Active Screen A** | **DOES NOT CLOSE.** Displays non-intrusive banner: *"User B reconnecting... (30s)"* | **DOES NOT CLOSE.** B's grid tile shows *"Reconnecting"*. Other participants continue conversing. |
| **Reconnection Outcome** | B reconnects $\rightarrow$ `JOINED`, ICE restart resumes video | B reconnects $\rightarrow$ `JOINED`, publishes stream to room |
| **30s Grace Expiry** | B $\rightarrow$ `LEFT` (`TIMEOUT`), Call $\rightarrow$ `ENDED`. A's screen switches to **Call Summary Screen** with real duration, timestamps, "Call Again" and "Back to Chat". | B $\rightarrow$ `LEFT` (`TIMEOUT`). Call remains `ACTIVE` for remaining $N-1$ users. Only ends when host terminates or all leave. |
| **Remaining User Action** | Clicking "Back to Chat" closes modal locally without firing redundant `call:hangup` | Clicking "Leave" exits user without terminating room for others |

---

## 6. Historical Data Integrity Snapshot

Deterministic SHA-256 baseline computed across all 119 records:
- **Baseline Count:** `119`
- **Master SHA-256 Fingerprint:** `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`
- **Audit Tool:** `scripts/verify_historical_call_records.cjs`
- **Verification Guarantee:** Re-executed immediately after migration, after test runs, and after browser testing to verify zero deviation in pre-existing records.
