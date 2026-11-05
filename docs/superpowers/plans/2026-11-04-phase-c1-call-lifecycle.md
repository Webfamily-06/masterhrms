# Phase C1: Authoritative Call State Machine & Lifecycle Implementation Plan (FINAL PRE-MIGRATION)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform 1-on-1 calling into a PostgreSQL-backed, transactional state machine with a 30-second disconnect grace period, multi-tab conflict suppression (`answered_elsewhere`), deterministic 1-to-1 `CallHistoryRecord` mapping via `historyRecordId`, and an authoritative call summary screen, preserving all existing calling flows and the exact 119 historical records.

**Architecture:** Database-authoritative state (`Call`, `CallParticipant`, `CallEvent`) managed via Prisma interactive transactions with two-level row locking (`SELECT ... FOR UPDATE` on `calls` then `call_participants`). Ephemeral in-memory timers provide instant socket notifications, backed by persisted timestamps and a bounded sweeper (LIMIT 25) for multi-worker recovery. Dual-write updates `CallHistoryRecord` by primary key `id`. Dual-event emission preserves backwards compatibility with existing UI.

**Tech Stack:** Node.js 24, TypeScript 5.5, Prisma 5.22, PostgreSQL (Supabase), Socket.IO 4.8, React / TanStack Start, Next.js CMS.

**Spec:** `docs/superpowers/specs/2026-11-04-call-state-machine-lifecycle-design.md`

---

## Global Constraints

- Never drop, delete, or rewrite existing `CallHistoryRecord` rows. The cryptographic baseline hash (`0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`) must remain strictly identical.
- Never persist ephemeral media states (`audioOn`, `videoOn`, `screenOn`) in `CallParticipant`.
- Multi-device suppression must use database transaction checks, not only ephemeral socket IDs.
- All database state transitions must be tenant-isolated and participant-authorized.
- No LiveKit, SFU, or guest invitations in Phase C1.
- Colon-notated socket events (`call:incoming`, `call:accepted`, `call:ended`) must remain fully functional alongside dot-notated events.
- Never fabricate connection quality or call duration.
- Never execute `DROP TABLE ... CASCADE` automatically. Default rollback is non-destructive forward-fix.

---

## Review Focus

1. **Simultaneous Acceptance Race:** If two tabs click Accept simultaneously, only one must succeed (first commit wins); the second must be suppressed gracefully without error via `call.answered_elsewhere`.
2. **Socket Flicker Grace Period:** When Wi-Fi roams or a page refreshes, the call must enter `RECONNECTING` and resume upon reconnection within 30s without tearing down the peer connection.
3. **Grace Expiration While Offline:** If a user disconnects and never returns, the 30s timer (or lazy DB query) must mark the call `ENDED` exactly once and inform the remaining peer.
4. **Independent Participant Exit:** When participant A leaves or disconnects, participant B must not have their active screen vanished; B sees the call summary screen and can choose "Back to Chat" or "Call Again".
5. **Cross-Tenant Isolation Breach:** Any call invite, accept, signal, or hangup attempt involving a non-tenant user ID must fail closed with `CALL_FORBIDDEN`.

---

## Implementation Tasks

### Task 1: Prisma Schema Expansion & Migration Execution (Pending Approval)

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20261104_phase_c1_authoritative_calls/migration.sql`

**Interfaces:**
- Produces: `Call`, `CallParticipant`, `CallEvent` models in Prisma Client.

- [ ] **Step 1: Baseline Historical Record Cryptographic Audit**
  - Run `node scripts/verify_historical_call_records.cjs` verifying 119 records and hash `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`.
- [ ] **Step 2: Update schema.prisma**
  - Add `calls Call[]` to `Tenant` model.
  - Add `Call` (including `historyRecordId` and `ringingExpiresAt`), `CallParticipant` (including `reconnectGraceExpiresAt`), `CallEvent` models.
- [ ] **Step 3: Execute Additive Migration SQL**
  - Execute additive migration SQL on Supabase PostgreSQL.
- [ ] **Step 4: Run Prisma generate**
  - Execute `npm --prefix server run prisma:generate`.
- [ ] **Step 5: Post-Migration Cryptographic Audit**
  - Re-run `node scripts/verify_historical_call_records.cjs` ensuring 100% hash identity.

---

### Task 2: CallLifecycleService with Two-Level Row Locking & 1-to-1 Dual-Write

**Files:**
- Create: `server/src/services/call-lifecycle.service.ts`
- Test: `server/src/tests/call-lifecycle.test.ts`

**Interfaces:**
- Produces:
  - `createCallSession(tenantId, callerId, targetUserId, type, media)`
  - `acceptCallTransaction(tenantId, callId, calleeId, deviceId)`
  - `disconnectParticipant(tenantId, userId, socketId)`
  - `reconnectParticipant(tenantId, callId, userId)`
  - `terminateCallTransaction(tenantId, callId, actorId, reason, status)`
  - `recoverExpiredCalls(tenantId?)`

- [ ] **Step 1: Write unit tests for CallLifecycleService**
  - Test transactional call creation, conditional two-level row-locked acceptance, 30s reconnect grace timestamping, and bounded recovery.
- [ ] **Step 2: Implement CallLifecycleService**
  - Implement atomic `$transaction` queries with uniform `SELECT ... FOR UPDATE` order (`calls` then `call_participants`) and primary key dual-write synchronization with `CallHistoryRecord`.
- [ ] **Step 3: Verify all tests pass**

---

### Task 3: Socket.IO Gateway & REST Endpoints Integration

**Files:**
- Modify: `server/src/socket.ts`
- Modify: `server/src/routes/call.routes.ts`
- Test: `server/src/tests/chat-calling-verification.test.ts`

**Interfaces:**
- Consumes: `CallLifecycleService`
- Produces:
  - Emits `call.participant.reconnecting`, `call.participant.joined`, `call.answered_elsewhere`, `call.ended`.
  - Maintains `call:incoming`, `call:accepted`, `call:rejected`, `call:cancelled`, `call:ended`.

- [ ] **Step 1: Update `socket.ts` disconnect handler**
  - Verify remaining tenant sockets for user before initiating 30s grace.
  - Schedule 30s in-memory timer and persist `reconnect_grace_expires_at`.
- [ ] **Step 2: Update `socket.ts` accept and hangup handlers**
  - Route through `CallLifecycleService` with two-level row-locked atomic acceptance.
  - Emit `call.answered_elsewhere` to callee's other tabs.
- [ ] **Step 3: Update `call.routes.ts`**
  - Update `GET /pending`, `POST /:id/accept`, `POST /:id/end`, add `POST /:id/reconnect`.
- [ ] **Step 4: Run existing 16-suite test**
  - Run `npm --prefix server run test:calling` ensuring 100% pass rate.

---

### Task 4: Client Reconnecting Banner, Multi-Tab Suppression & Call Summary Screen

**Files:**
- Modify: `CMS/src/components/chat/unified-chat-app.tsx`
- Modify: `src/components/chat/unified-chat-app.tsx`
- Modify: `CMS/src/context/incoming-call-context.tsx`
- Modify: `src/context/incoming-call-context.tsx`

**Interfaces:**
- Consumes: `call.participant.reconnecting`, `call.participant.joined`, `call.answered_elsewhere`, `call.ended`.
- Produces:
  - Reconnecting banner with countdown.
  - Call Summary View on call end with real duration, timestamps, "Call Again", "Back to Chat".

- [ ] **Step 1: Update IncomingCallContext**
  - Listen for `call.answered_elsewhere` and silence ringing on inactive tabs.
- [ ] **Step 2: Implement Reconnecting Banner in UnifiedChatApp**
  - Display non-intrusive status banner when remote peer is in `RECONNECTING` state.
- [ ] **Step 3: Implement Call Summary View in UnifiedChatApp**
  - Prevent modal from closing immediately on `call:ended`.
  - Render duration, join/leave timestamps, end reason, "Call Again", and "Back to Chat".
- [ ] **Step 4: Mirror changes to both `CMS/src` and `src` trees**

---

### Task 5: Authenticated User A/B Browser Testing & Implementation Report

**Files:**
- Create: `MASTERHRMS_CHAT_CALLING_PHASE_C1_IMPLEMENTATION_REPORT.md`

- [ ] **Step 1: Authenticated User A and User B browser sessions verification**
  - Real browser verification: A calls B $\rightarrow$ incoming call appears $\rightarrow$ accept $\rightarrow$ active call.
  - B disconnects $\rightarrow$ A sees reconnecting banner $\rightarrow$ B reconnects $\rightarrow$ call resumes.
  - B disconnects and stays offline $\rightarrow$ 30s expires $\rightarrow$ call ends $\rightarrow$ summary screen.
  - Multi-tab test: Tab 1 accepts $\rightarrow$ Tab 2 silences.
- [ ] **Step 2: Cryptographic Historical Integrity Audit**
  - Run `node scripts/verify_historical_call_records.cjs` verifying 100% hash match on 119 records.
- [ ] **Step 3: Write comprehensive implementation report**
