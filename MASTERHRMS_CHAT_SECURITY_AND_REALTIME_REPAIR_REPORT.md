# MASTERHRMS — CHAT SECURITY & REALTIME REPAIR REPORT

**Project:** `Webfamily-06/masterhrms` (`main`)
**Database:** Supabase PostgreSQL 17 + Prisma v5.22.0
**Deliverable:** `2 of 4` (`MASTERHRMS_CHAT_SECURITY_AND_REALTIME_REPAIR_REPORT.md`)
**Status:** Phases `C1` – `C8` Backend Security, Realtime Isolation, Media Hardening & Query Optimization Complete

---

## 1. Executive Summary

All critical security, tenant-isolation, authorization, realtime-leakage, file-exposure, and reliability vulnerabilities identified during the Phase `C0` Initial Architecture Audit have been remediated in the authoritative Express + Socket.IO + Prisma backend without resetting or altering any historical chat messages (`541` rows) or call history records (`139` rows).

Key outcomes verified:
- **Zero tenant-wide chat/call broadcasts:** Every `broadcastToTenant(...)` and `PusherService.triggerTenantEvent(...)` call in `server/src/routes/chat.routes.ts` and `server/src/socket.ts` for private conversations, group threads, reactions, polls, system events, and meetings has been eliminated (`0` occurrences remain).
- **Single authoritative authorization gate (`ChatService`):** All REST endpoints and Socket.IO handlers now route through `ChatService.authorizeThread`, `ChatService.sendMessage`, `ChatService.acknowledgeDelivered`, `ChatService.markThreadRead`, `ChatService.editMessage`, `ChatService.deleteMessage`, `ChatService.authorizeChatMediaAccess`, and `ChatService.emitToAuthorizedThread`.
- **Database-enforced idempotency & preferences:** Additive migration `20261114_chat_security_reliability_preferences` applied to Supabase PostgreSQL adds `@@unique([tenantId, senderId, clientTempId])` on `chat_messages`, `edit_history`, PostgreSQL GIN full-text search index, `chat_conversation_preferences`, `chat_user_presence`, and `ChatGroup` enterprise lifecycle columns.

---

## 2. Remediated Security Vulnerabilities Matrix

| ID | Severity | Vulnerability Found in C0 Audit | Authoritative Remediation Implemented | Files Changed |
|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | `broadcastToTenant` & `PusherService.triggerTenantEvent` leaked every 1:1 DM, group message, edit, delete, reaction, poll vote, typing indicator, and meeting end to every user in the workspace. | Replaced with `ChatService.emitToAuthorizedThread(...)` emitting exclusively to verified `chat:<tenantId>:<threadId>` socket rooms + per-participant `user:<userId>` / `private-user-<tenantId>-<userId>` channels. | `server/src/services/chat.service.ts`, `server/src/routes/chat.routes.ts`, `server/src/socket.ts` |
| **SEC-02** | **CRITICAL** | Missing authorization on `POST /messages/delivered`, `POST /messages/:threadId/read`, `POST /messages/:id/react`, `POST /messages/:id/poll/vote`, `POST /conversations/:threadId/pin`, and `GET /meetings/:callId/participants`. | Added mandatory `ChatService.authorizeThread(...)` + `SELECT ... FOR UPDATE` row-level locking on reactions and poll votes; non-participants receive `403 CHAT_UNAUTHORIZED`. | `server/src/services/chat.service.ts`, `server/src/routes/chat.routes.ts` |
| **SEC-03** | **CRITICAL** | Arbitrary Socket.IO room subscription (`chat:join` did not exist or was unguarded; removed group members stayed subscribed). | Implemented server-verified `chat:join` / `chat:leave` in `socket.ts` using `ChatService.authorizeThread`, plus `ChatService.evictUserFromThreadRoom(...)` immediately removing sockets and emitting `chat:room_revoked` on member removal or leave. | `server/src/socket.ts`, `server/src/services/chat.service.ts`, `server/src/routes/chat.routes.ts` |
| **SEC-04** | **HIGH** | Anonymous polls (`isAnonymous: true`) stored and returned `votedUserIds` in `GET /messages/:threadId`, `POST /poll/vote`, and socket broadcasts. | Implemented `ChatService.sanitizePollForViewer(poll, viewerUserId)` and `ChatService.sanitizeMessageForViewer(...)` which strip `votedUserIds` while preserving `hasVoted` boolean per authenticated viewer (including per-user socket payload transforms). | `server/src/services/chat.service.ts`, `server/src/routes/chat.routes.ts` |
| **SEC-05** | **HIGH** | Private chat attachments under `/uploads/Communication/...` were accessible to any same-tenant user (and HR/Admins for private 1:1 DMs), lacked signed download URLs, and leaked via `GET /api/v1/media`. | Added `GET /api/chat/attachments/:mediaId/download` with HMAC-SHA256 signed URLs (`?tid=&uid=&exp=&sig=`) + live `ChatService.authorizeChatMediaAccess` DB verification; enforced `authorizeChatMediaAccess` in `uploadsSecurityMiddleware` and `media.routes.ts`; added `X-Content-Type-Options: nosniff` and sandbox `CSP`. | `server/src/services/chat.service.ts`, `server/src/routes/chat.routes.ts`, `server/src/middleware/uploads-security.middleware.ts`, `server/src/routes/media.routes.ts` |
| **SEC-06** | **HIGH** | `MediaService.validateImageBuffer` bypassed EBML magic-byte validation whenever `.webm` extension was declared, rejected `.mp4` videos, allowed `.svg` XSS vectors in chat, and deduplicated private files across separate threads. | Enforced strict `0x1A 0x45 0xDF 0xA3` EBML header check for `.webm`, added ISO `ftyp` `video/mp4` & `video/quicktime` support, blocked `.svg` in chat uploads and `<foreignobject` / `on*=` globally, disabled cross-thread deduplication for chat media, and restricted `ChatFolderService` `FileAcl` to direct conversation folders (`parts.length === 2`). | `server/src/services/media/media.service.ts`, `server/src/services/files/chat-folder.service.ts` |
| **SEC-07** | **HIGH** | SSRF in `POST /api/chat/url-preview` via DNS rebinding, redirect chains to `127.0.0.1` / `169.254.169.254` / RFC1918 IPs, and unbounded response bodies. | Implemented `UrlPreviewService` (`server/src/services/url-preview.service.ts`) performing `dns.lookup(..., { all: true })` private-IP blocking on every hop (max 3 manual redirects), custom pinned lookup agent, `http:`/`https:` scheme whitelist, and 512 KB stream cap. | `server/src/services/url-preview.service.ts`, `server/src/routes/chat.routes.ts` |
| **SEC-08** | **HIGH** | `POST /groups` and `POST /groups/:id/members` allowed cross-tenant user IDs to be inserted into `ChatGroupMember`. | Validated every candidate member via `ChatService.resolveParticipantUserInTenant(tenantId, id)` and rejected cross-tenant IDs with `403 CROSS_TENANT_MEMBER_REJECTED`. | `server/src/routes/chat.routes.ts`, `server/src/services/chat.service.ts` |
| **SEC-09** | **HIGH** | `announcements.routes.ts` allowed any authenticated employee to create/update/delete company announcements and forge compliance acknowledgements (`req.body.employeeId`) for other employees. | Enforced `ChatService.hasChatPermission(req.user, "chat.announcements")` on all mutating/analytics announcement routes and bound `POST /:id/view` & `POST /:id/acknowledge` to the caller's JWT `userId` employee record (`403 ANNOUNCEMENT_ACK_SPOOF_FORBIDDEN` on spoofing attempts). | `server/src/routes/announcements.routes.ts` |
| **SEC-10** | **MEDIUM** | `crm.routes.ts` `POST /outbox/:id/retry` lacked tenant filter (`where: { id }` allowed cross-tenant outbox retry); `OutboxService` lacked `CHAT_NOTIFICATION` handler. | Scoped retry query to `findFirst({ where: { id, tenantId } })` and implemented `CHAT_NOTIFICATION` delivery with preference mute suppression in `OutboxService`. | `server/src/routes/crm.routes.ts`, `server/src/services/outbox.service.ts` |
| **SEC-11** | **MEDIUM** | `VapidService.encryptPayload` omitted `userPublicKey` and `localPublicKey` from HKDF `authInfo` (RFC 8291 Section 3.3), causing browsers to drop encrypted Web Push payloads. | Updated `authInfo` to `Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), userPublicKey, localPublicKey])` per RFC 8291 Section 3.3. | `server/src/services/vapid.service.ts` |

---

## 3. Realtime Architecture & Reliability Repairs

### 3.1 Scoped Room & User Channel Topology
1. **Socket.IO Rooms:**
   - `user:<userId>`: Authenticated personal channel joined automatically upon JWT + active `DeviceSession` handshake verification.
   - `chat:<tenantId>:<threadId>`: Conversation-scoped room joined only via `socket.emit("chat:join", { threadId })` after `ChatService.authorizeThread` succeeds.
   - Immediate eviction: Removing a member or leaving a group invokes `ChatService.evictUserFromThreadRoom(tenantId, threadId, userId)` across all active sockets for that user and emits `chat:room_revoked`.
2. **Distributed Multi-Node Support:**
   - `server/src/socket.ts` dynamically attaches `@socket.io/redis-adapter` whenever `REDIS_URL` is configured, and persists authoritative presence heartbeats to PostgreSQL `chat_user_presence` (`ChatUserPresence`) so online status and `lastSeenAt` survive single-node restarts and multi-instance deployments even without Redis.
   - Active group meetings (`activeGroupCalls`) are dual-persisted to PostgreSQL `calls` + `call_participants` (`roomKey: "group_meeting:<callId>"`) and transparently recovered via `resolveOrRecoverGroupMeeting(callId, tenantId)`.
   - LiveKit SFU rooms are pre-created server-side via `MeetingSfuService.ensureRoomCreated(...)` (`Twirp RoomService/CreateRoom`) and closed on host hangup via `MeetingSfuService.closeRoom(...)` (`Twirp RoomService/DeleteRoom`).

### 3.2 Message Delivery State Machine & Idempotency
- **Idempotency:** `@@unique([tenantId, senderId, clientTempId])` on `chat_messages` + `P2002` catch-and-return in `ChatService.sendMessage` guarantees zero duplicate messages across parallel retries or offline reconnects.
- **Monotonic Status:** `sent` -> `delivered` (via `POST /api/chat/messages/delivered` or `socket` `chat:delivered`, never triggered by the sender's own client) -> `read` (via `POST /api/chat/messages/:threadId/read` or `socket` `chat:read`, updating `ChatReadReceipt` and resetting `ChatConversationPreference.markedUnreadAt`).
- **Edit Audit Trail:** `PATCH /api/chat/messages/:id` appends `{ content, editedAt, editedBy }` to `ChatMessage.editHistory` before updating content and `editedAt`.
- **Delete Semantics:**
  - `Delete for me`: Appends viewer's `userId` to `deletedBy` array without mutating content for other participants.
  - `Delete for everyone`: Permitted for sender or authorized group admin/owner (`allowAdminModeration: true`); scrubs content/attachments/voiceNote/poll in DB, soft-deletes unreferenced chat `MediaFile` records so signed download URLs immediately revoke, and broadcasts sanitized tombstone to thread participants.

---

## 4. Verification Evidence Executed in Phase C1–C6

- **TypeScript Compilation (`npx tsc --noEmit`):** `0` errors across all modified chat, socket, media, SFU, VAPID, outbox, and announcement modules.
- **16-Suite Calling & Signaling Security Verification (`npm run test:calling`):** **16 / 16 PASSED** (cross-tenant invite rejection, third-party accept/cancel/end rejection, ringing media-state rejection, multi-tab survival, reconnect grace expiry, non-member group-call join/signal rejection).
- **Multi-Participant Meeting & LiveKit SFU Verification (`npm run test:meeting`):** **4 / 4 Suites PASSED** (`SfuConfigurationError` diagnostics, HS256 room-scoped JWT claims, socket `group-call:*` state sync & non-host `CALL_FORBIDDEN` end protection, `CallHistoryRecord` idempotent persistence, LiveKit Client SDK room lifecycle).
