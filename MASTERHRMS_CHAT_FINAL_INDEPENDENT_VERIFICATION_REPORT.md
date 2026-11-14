# MASTERHRMS — Chat (C0–C9) Final Independent Verification & Release Sign-Off Report

**Audit Phase:** `C10` — Independent Final Verification & Production Release Gate  
**Audit Timestamp:** `2026-11-14T19:08:00+05:30` (`2026-11-14T13:38:00Z`)  
**Repository / Branch / HEAD:** `Webfamily-06/masterhrms` • `main` • `8eee32db7f9d38cd3de5f481ddae86f97f46a44c`  
**Evaluated Chat Commit:** `5f74d787c9b76bd9257872c2299663c5656b6bf4`  
**Live Runtimes Verified:** Express + Socket.IO (`http://localhost:4000`), Next.js 15 CMS (`http://localhost:3000`), TanStack Start + React 19 (`http://localhost:5173`), Supabase PostgreSQL 17 (`ap-south-1` pooler)

> [!CAUTION]
> **Explicit Release Verdict: `BLOCKED` (Pending 4 Pre-Deployment Configuration & Secret-Hygiene Gates)**
>
> While **100% of core Chat & Calling application code, TypeScript types (`3/3`), security & tenant-isolation checks (`16/16`), calling/meeting suites (`20/20`), cross-frontend Playwright E2E flows (`6/6`), responsive viewports (`12/12`), and Supabase PostgreSQL schema/data preservation (`0` row delta)** passed independent verification, **immediate production deployment as currently configured is BLOCKED** by four concrete empirical findings that contradict prior acceptance claims:
> 1. **[CRITICAL — Client-Bundle Secret Exposure]** Root `.env` defines `VITE_PUSHER_SECRET` and [settings.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/super/settings.tsx#L336) references `import.meta.env.VITE_PUSHER_SECRET`. Building TanStack Start for production with `VITE_PUSHER_SECRET` present inlines the server Pusher HMAC secret into public client JavaScript bundles, enabling forgery of `private-user-*` and `private-tenant-*` channel signatures.
> 2. **[HIGH — Broken Web Push VAPID Asymmetric Keypair]** `server/.env` sets `VAPID_PUBLIC_KEY` while leaving `VAPID_PRIVATE_KEY` unset. In [vapid.service.ts](file:///Users/apple/Documents/hrms/server/src/services/vapid.service.ts#L69-L77), missing `VAPID_PRIVATE_KEY` falls back to a `JWT_SECRET`-derived private scalar while retaining the unrelated `VAPID_PUBLIC_KEY` (`ecSignatureVerifiesAgainstConfiguredPub = false`), causing ES256 VAPID JWTs to fail verification (`401/403 VapidPkHashMismatch`) at browser push relays.
> 3. **[HIGH — Next.js CMS Production Socket.IO Disabled Without `NEXT_PUBLIC_SOCKET_URL`]** In [CMS/src/lib/socket.ts](file:///Users/apple/Documents/hrms/CMS/src/lib/socket.ts#L36-L40), `isSocketDisabled()` returns `true` whenever `NODE_ENV === "production"` and `NEXT_PUBLIC_SOCKET_URL` is unset. `CMS/.env.local` currently omits `NEXT_PUBLIC_SOCKET_URL`, which disables primary Socket.IO realtime transport in a production CMS build.
> 4. **[HIGH — Multiparty LiveKit SFU & TURN Credentials Unconfigured in Workspace `.env`]** Contrary to [MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md](file:///Users/apple/Documents/hrms/MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md), `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `TURN_*` are **unset** in `.env`, `server/.env`, and `CMS/.env.local` (`GET /api/chat/meetings/config` returns `configured: false, status: "pending_configuration"`). Multiparty meetings gracefully display the `"LiveKit SFU Notice"` banner and synchronize signaling/roster state, but cannot relay multiparty WebRTC audio/video media or traverse symmetric NATs until credentials are provisioned.

---

## 1. Git & Working-Tree Preservation Proof

### 1.1 Branch, HEAD & Commit Status
- **Active Branch:** `main` (tracking `origin/main`)
- **Current `HEAD`:** `8eee32db7f9d38cd3de5f481ddae86f97f46a44c`
- **Chat C0–C9 Implementation Commit:** `5f74d787c9b76bd9257872c2299663c5656b6bf4` (*committed in `main` history; `0` uncommitted Chat code changes exist in the working tree*).
- **Prohibited Git Operations Executed:** `0` (`git reset`, `git clean`, `git checkout`, `git stash`, `git commit`, `git push`, and `git merge` were strictly avoided).

### 1.2 Exact `git status --short` (Pre-Report Working Tree)
```text
 M CMS/src/app/(workspace)/hr/leave/applications/page.tsx
 M CMS/src/app/(workspace)/hr/leave/balances/page.tsx
 M CMS/src/app/(workspace)/hr/leave/policies/page.tsx
 M CMS/src/app/(workspace)/hr/leave/types/page.tsx
 M src/routes/_authenticated/hr/leave/applications.tsx
 M src/routes/_authenticated/hr/leave/balances.tsx
 M src/routes/_authenticated/hr/leave/policies.tsx
 M src/routes/_authenticated/hr/leave/types.tsx
?? scripts/capture-all-leave-screenshots.ts
?? scripts/inspect-database-chat.ts
```
All 8 uncommitted Leave Management files and pre-existing untracked scripts remained 100% untouched throughout this verification audit (only this report file `MASTERHRMS_CHAT_FINAL_INDEPENDENT_VERIFICATION_REPORT.md` was written to the repository root at completion).

### 1.3 Chat-Specific Committed File Inventory (`5f74d787c9b76bd9257872c2299663c5656b6bf4`)

| Layer | Committed Chat / Calling Files Verified |
|---|---|
| **Database & Migration (`2`)** | [schema.prisma](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma), [migration.sql](file:///Users/apple/Documents/hrms/server/prisma/migrations/20261114_chat_security_reliability_preferences/migration.sql) |
| **Backend Services & Config (`8`)** | [chat.service.ts](file:///Users/apple/Documents/hrms/server/src/services/chat.service.ts), [meeting-sfu.service.ts](file:///Users/apple/Documents/hrms/server/src/services/meeting-sfu.service.ts), [chat-system-events.service.ts](file:///Users/apple/Documents/hrms/server/src/services/chat-system-events.service.ts), [chat-folder.service.ts](file:///Users/apple/Documents/hrms/server/src/services/files/chat-folder.service.ts), [media.service.ts](file:///Users/apple/Documents/hrms/server/src/services/media/media.service.ts), [url-preview.service.ts](file:///Users/apple/Documents/hrms/server/src/services/url-preview.service.ts), [vapid.service.ts](file:///Users/apple/Documents/hrms/server/src/services/vapid.service.ts), [outbox.service.ts](file:///Users/apple/Documents/hrms/server/src/services/outbox.service.ts), [tenant-models.config.ts](file:///Users/apple/Documents/hrms/server/src/config/tenant-models.config.ts) |
| **Backend Routes, Socket & Middleware (`7`)** | [chat.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/chat.routes.ts), [call.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/call.routes.ts), [socket.ts](file:///Users/apple/Documents/hrms/server/src/socket.ts), [uploads-security.middleware.ts](file:///Users/apple/Documents/hrms/server/src/middleware/uploads-security.middleware.ts), [media.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/media.routes.ts), [announcements.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/announcements.routes.ts), [crm.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/crm.routes.ts) |
| **TanStack Start (`src/`) (`9`)** | [unified-chat-app.tsx](file:///Users/apple/Documents/hrms/src/components/chat/unified-chat-app.tsx), [multi-participant-meeting-dialog.tsx](file:///Users/apple/Documents/hrms/src/components/chat/multi-participant-meeting-dialog.tsx), [emoji-picker.tsx](file:///Users/apple/Documents/hrms/src/components/chat/emoji-picker.tsx), [floating-mini-call-widget.tsx](file:///Users/apple/Documents/hrms/src/components/calling/floating-mini-call-widget.tsx), [incoming-call-context.tsx](file:///Users/apple/Documents/hrms/src/context/incoming-call-context.tsx), [socket.ts](file:///Users/apple/Documents/hrms/src/lib/socket.ts), [hr/chat.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/hr/chat.tsx), [me/chat.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/me/chat.tsx), [tenant/chat.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/tenant/chat.tsx) |
| **Next.js 15 CMS (`CMS/src/`) (`6`)** | [unified-chat-app.tsx](file:///Users/apple/Documents/hrms/CMS/src/components/chat/unified-chat-app.tsx), [multi-participant-meeting-dialog.tsx](file:///Users/apple/Documents/hrms/CMS/src/components/chat/multi-participant-meeting-dialog.tsx), [emoji-picker.tsx](file:///Users/apple/Documents/hrms/CMS/src/components/chat/emoji-picker.tsx), [floating-mini-call-widget.tsx](file:///Users/apple/Documents/hrms/CMS/src/components/calling/floating-mini-call-widget.tsx), [incoming-call-context.tsx](file:///Users/apple/Documents/hrms/CMS/src/context/incoming-call-context.tsx), [socket.ts](file:///Users/apple/Documents/hrms/CMS/src/lib/socket.ts) |
| **Automated Calling & SFU Suites (`2`)** | [chat-calling-verification.test.ts](file:///Users/apple/Documents/hrms/server/src/tests/chat-calling-verification.test.ts), [multi-participant-meeting.test.ts](file:///Users/apple/Documents/hrms/server/src/tests/multi-participant-meeting.test.ts) |
| **Prior C0–C9 Reports Audited (`4`)** | [MASTERHRMS_CHAT_INITIAL_ARCHITECTURE_AUDIT.md](file:///Users/apple/Documents/hrms/MASTERHRMS_CHAT_INITIAL_ARCHITECTURE_AUDIT.md), [MASTERHRMS_CHAT_SECURITY_AND_REALTIME_REPAIR_REPORT.md](file:///Users/apple/Documents/hrms/MASTERHRMS_CHAT_SECURITY_AND_REALTIME_REPAIR_REPORT.md), [MASTERHRMS_CHAT_COMPLETE_IMPLEMENTATION_REPORT.md](file:///Users/apple/Documents/hrms/MASTERHRMS_CHAT_COMPLETE_IMPLEMENTATION_REPORT.md), [MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md](file:///Users/apple/Documents/hrms/MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md) |

---

## 2. File-Level Implementation & Dual-Frontend Parity Verification

### 2.1 Backend Architecture Verification
1. **Centralized Zero-Trust Domain Service ([chat.service.ts](file:///Users/apple/Documents/hrms/server/src/services/chat.service.ts)):**
   - `authorizeThread` (`L283–L460`) validates active tenant isolation (`tenantId`), canonical 1:1 DM participant membership (`direct_<minUserId>_<maxUserId>` with `allowAdminModeration: false` so workspace HR/Admins cannot read or write private 1:1 DMs), active `ChatGroupMember` membership for `group_<id>` threads, announcement write RBAC, and contextual HRMS entity threads.
   - `sendMessage` (`L840–L1045`) enforces `isAnnouncementOnly` group permissions, runs inside `prisma.$transaction` with `OutboxEvent` creation (`CHAT_NOTIFICATION`), and catches PostgreSQL unique constraint `P2002` on `(tenantId, senderId, clientTempId)` to guarantee idempotent single-row creation under concurrent retries.
   - `emitToAuthorizedThread` (`L468–L519`) emits exclusively to `chat:${tenantId}:${threadId}` and authorized `user:${uid}` rooms + `PusherService.triggerUserEvent`, supporting `perUserPayloadTransform` for viewer-scoped anonymous poll payloads.
   - `evictUserFromThreadRoom` (`L525–L541`) calls `io.in("user:" + targetUserId).socketsLeave(roomName)` and emits `chat:room_revoked` immediately upon group member removal or leave.
   - `signAttachmentDownloadUrl` / `verifyAttachmentSignature` / `authorizeChatMediaAccess` (`L546–L675`) enforce `HMAC-SHA256` URL signing (`3600s` default TTL) with `crypto.timingSafeEqual` AND re-verify live database `FileAcl` / thread membership on every download request.
2. **Tenant Isolation Model Registry ([tenant-models.config.ts](file:///Users/apple/Documents/hrms/server/src/config/tenant-models.config.ts)):**
   - Verified `ChatMessage`, `ChatGroup`, `ChatGroupMember`, `ChatReadReceipt`, `ChatConversationPin`, `ChatConversationPreference`, `ChatUserPresence`, `Call`, and `CallHistoryRecord` are registered in `TENANT_SCOPED_MODELS`.
3. **Media & Upload Hardening ([uploads-security.middleware.ts](file:///Users/apple/Documents/hrms/server/src/middleware/uploads-security.middleware.ts), [media.service.ts](file:///Users/apple/Documents/hrms/server/src/services/media/media.service.ts), [media.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/media.routes.ts)):**
   - Magic-byte verification enforced for images, PDFs, audio, MP4 (`ftyp`), and WebM (`0x1A 0x45 0xDF 0xA3` EBML header).
   - `.svg` / `image/svg+xml` and executable extensions are rejected with `HTTP 400` in chat uploads.
   - Private chat attachments are saved with `isPublic: false`, `systemModule: "chat"`, excluded from non-uploader `GET /api/v1/media` listings, blocked from non-uploader `DELETE /api/v1/media/:id` (`403`), and served with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; ... sandbox`.
4. **SSRF Link Preview Hardening ([url-preview.service.ts](file:///Users/apple/Documents/hrms/server/src/services/url-preview.service.ts)):**
   - Restricts schemes to `http:` / `https:`, resolves all A/AAAA records via `dns.lookup(..., { all: true })`, blocks loopback (`127.0.0.0/8`, `::1`), RFC1918, link-local / cloud IMDS (`169.254.0.0/16`), CGNAT, and IPv4-mapped IPv6 (`::ffff:127.0.0.1`), pins resolved IP in a custom HTTP/HTTPS agent to prevent DNS rebinding, re-validates up to 3 manual redirect hops, and caps response streams at `512 KB`.

### 2.2 Dual-Frontend Component Parity (`diff -u` Verification)

| Component / Module | TanStack Start (`src/`) | Next.js 15 CMS (`CMS/src/`) | `diff -u` Result |
|---|---|---|---|
| `unified-chat-app.tsx` | `11,961` lines | `11,961` lines | **0 byte diff (100% identical)** |
| `multi-participant-meeting-dialog.tsx` | `1,782` lines | `1,782` lines | **0 byte diff (100% identical)** |
| `floating-mini-call-widget.tsx` | `410` lines | `410` lines | **0 byte diff (100% identical)** |
| `incoming-call-context.tsx` | `772` lines | `772` lines | **0 byte diff (100% identical)** |
| `full-screen-incoming-call.tsx` | `278` lines | `278` lines | **Identical logic & markup** |
| `adaptive-video-grid.tsx`, `screen-share-stage.tsx`, `in-call-invite-modal.tsx` | Present | Present | **Identical logic (trailing newline only)** |
| Route Entry Points (`/hr/chat`, `/me/chat`, `/tenant/chat`) | Mounted (`<Outlet />` subroute guard for `/groups`, `/contacts`, `/calls`) | Mounted (`CMS/src/app/(workspace)/.../chat`) | **Full route parity verified** |
| Global Call Overlay Mount | [__root.tsx](file:///Users/apple/Documents/hrms/src/routes/__root.tsx#L183-L193) | [AppProviders.tsx](file:///Users/apple/Documents/hrms/CMS/src/components/providers/AppProviders.tsx#L26-L31) | **Both wrap app root with `IncomingCallProvider` + `FullScreenIncomingCall`** |

---

## 3. Security Verification Matrix & Cross-Report Naming Reconciliation

### 3.1 Independent Live Security Verification Matrix (`16 / 16 PASSED`)
Executed freshly via `node .../scratch/c10_security_harness.mjs` (`Exit Code 0`) against live Express (`:4000`), Socket.IO, and Supabase PostgreSQL:

| Check ID | Security Claim Tested | Fresh Empirical Evidence | Status |
|---|---|---|---|
| **SEC-01** | Zero tenant-wide private-message broadcasts (`tenant:{tenantId}` observer receives `0` DM events) | `POST=201, recipientReceived=true, tenantObserverReceived=0` | **PASS** |
| **SEC-02A** | Forged/invalid JWT rejected on Chat REST endpoints | `HTTP 401` | **PASS** |
| **SEC-02B** | Same-tenant non-participant (**including HR Admin**) & cross-tenant user blocked from 1:1 DM read/write | `sameTenantAdminRead=403, sameTenantAdminWrite=403, crossTenantRead=403` | **PASS** |
| **SEC-02C** | Non-member (**including HR Admin**) blocked from reading or posting to private group | `nonMemberRead=403, nonMemberWrite=403` | **PASS** |
| **SEC-03A** | Cross-tenant Socket.IO `join-tenant` room subscription blocked | `chat:error={"code":"TENANT_FORBIDDEN","error":"Cannot join foreign workspace room."}` | **PASS** |
| **SEC-03B** | Unauthorized Socket.IO `chat:join` to 1:1 DM rejected even for workspace admin | `chat:error={"ok":false,"code":"CHAT_UNAUTHORIZED"}` | **PASS** |
| **SEC-04** | Removed group member immediately evicted from Socket.IO room (`chat:room_revoked`), receives `0` post-removal messages, and loses HTTP + **unexpired signed attachment URL** access | `joinedBefore=true, revokedEvent=true, postRemovalMsgs=0, httpAfter=403, attBefore=200, attAfter=403` | **PASS** |
| **SEC-05** | Arbitrary/private entity (`ChatMessage`) & cross-tenant `Employee` `subscribe:record` Socket.IO subscriptions rejected | `chatEntity=RECORD_FORBIDDEN, crossTenantEmployee=RECORD_FORBIDDEN` | **PASS** |
| **SEC-06** | Cross-tenant group member injection (create & add-member) and cross-tenant invite-token join blocked | `createInject=403, addMemberInject=403, crossInviteJoin=404` | **PASS** |
| **SEC-07** | Unauthorized message edit/delete-for-all/read/delivered/pin blocked (`403`), author `editHistory` persisted (`len=1`), and `5x` concurrent duplicate `clientTempId` POSTs deduplicated to `1` DB row | `unauthEdit=403, editHistoryLen=1, unauthDelAll=403, unauthRead=403, unauthDeliv=403, unauthPin=403, concurrentIds=1, dbRows=1` | **PASS** |
| **SEC-08** | Anonymous poll strips voter IDs from HTTP responses and Socket.IO `chat:poll_updated` broadcasts while preserving counts | `voteStatus=200, leaksVoterId=false, optionVotesLen=0, voteCount=1` | **PASS** |
| **SEC-09** | `.svg` upload blocked (`400`), `isPublic=false`, `/uploads/*` blocks unauth (`401`) & HR Admin bystander (`403`), tampered HMAC sig blocked (`403`), valid signed URL serves `200` with `nosniff` & sandbox `CSP` | `svg=400, isPublic=false, unauthRaw=401, adminBystanderRaw=403, tamperedSig=403, validSigned=200, nosniff=nosniff` | **PASS** |
| **SEC-10** | Private chat attachments hidden from non-uploader `GET /api/v1/media`, `GET /api/v1/media/:id` (`403`), and `DELETE /api/v1/media/:id` (`403`) | `leakedInList=false, detailByNonMember=403, deleteByNonUploader=403` | **PASS** |
| **SEC-11** | `GET /api/chat/url-preview` blocks loopback (`127.0.0.1`), AWS/cloud IMDS (`169.254.169.254`), IPv4-mapped IPv6 (`[::ffff:127.0.0.1]`), and `file://` scheme | `loopback=400, imds=400, ipv6Mapped=400, fileScheme=400` | **PASS** |
| **SEC-12** | Announcement creation RBAC enforced (`employee=403`, `hr_admin=201`) and `employeeId` acknowledgment/view spoofing blocked (`403`) | `empCreate=403, hrCreate=201, spoofAck=403, spoofView=403` | **PASS** |
| **SEC-13** | CRM `/api/crm/calls` requires auth (`401`), isolates tenants, and excludes internal WebRTC call records | `unauth=401, internalExposedInCrm=false, crossTenantExposed=false` | **PASS** |

### 3.2 Unsafe Legacy Pattern & XSS Sink Search
Static inspection across `server/src/`, `src/`, and `CMS/src/` confirmed:
- **`0` occurrences** of `broadcastToTenant` or `PusherService.triggerTenantEvent` for any private chat message, reaction, poll, receipt, typing, 1:1 call, or group meeting event (CRM lead messages in [crm.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/crm.routes.ts#L502) were renamed to `crm:lead_message`).
- **`0` bindings** to `private-tenant-*` for `chat:*`, `call:*`, or `group-call:*` events in [src/lib/socket.ts](file:///Users/apple/Documents/hrms/src/lib/socket.ts) and [CMS/src/lib/socket.ts](file:///Users/apple/Documents/hrms/CMS/src/lib/socket.ts) (all bind strictly to `private-user-${currentUserId}`).
- **`0` occurrences** of `dangerouslySetInnerHTML` or `innerHTML` in any chat or calling component ([floating-mini-call-widget.tsx](file:///Users/apple/Documents/hrms/src/components/calling/floating-mini-call-widget.tsx#L140-L185) constructs Document Picture-in-Picture DOM strictly via `document.createElement` and `textContent`).

### 3.3 Reconciliation of Naming & Endpoint Drift Across Prior Reports
Independent code inspection identified multiple naming discrepancies in [MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md](file:///Users/apple/Documents/hrms/MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md) compared to actual production code:

| Artifact / Concept | Claimed in `FINAL_ACCEPTANCE_REPORT.md` | Claimed in `SECURITY_AND_REALTIME_REPAIR_REPORT.md` | **Actual Verified Production Code (`HEAD`)** |
|---|---|---|---|
| **Socket.IO Thread Room** | `tenant:${tenantId}:chat:${threadId}` | `chat:${tenantId}:${threadId}` | **`chat:${tenantId}:${threadId}`** ([chat.service.ts](file:///Users/apple/Documents/hrms/server/src/services/chat.service.ts#L465)) |
| **Socket.IO Join / Leave Events** | `chat:join_thread` / `chat:leave_thread` | `chat:join` / `chat:leave` | **`chat:join` / `chat:leave`** ([socket.ts](file:///Users/apple/Documents/hrms/server/src/socket.ts#L386-L426)) |
| **Pusher User Channel** | `user:${uid}` | `private-user-${tenantId}-${userId}` | **`private-user-${userId}`** (`PusherService.triggerUserEvent` & [src/lib/socket.ts](file:///Users/apple/Documents/hrms/src/lib/socket.ts#L156)) |
| **Presence Table Name** | `chat_user_presence` | `chat_user_presence` | **`chat_user_presences`** ([schema.prisma](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma#L2981)) |
| **Media Model / Table** | `MediaAsset` | `MediaFile` | **`MediaFile` (`media_files`)** |
| **PostgreSQL GIN FTS Index** | `idx_chat_messages_fts` | GIN FTS index | **`chat_messages_content_fts_idx`** ([migration.sql](file:///Users/apple/Documents/hrms/server/prisma/migrations/20261114_chat_security_reliability_preferences/migration.sql#L66)) |
| **Edit Message Endpoint** | `PUT /api/chat/messages/:id` | `PATCH /api/chat/messages/:id` | **`PATCH /api/chat/messages/:id`** ([chat.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/chat.routes.ts#L3860)) |
| **Reaction / Poll Vote Routes** | `/messages/:id/reactions`, `/polls/vote` | `/messages/:id/react`, `/poll/vote` | **`POST /messages/:id/react`** & **`POST /messages/:id/poll/vote`** |
| **Upload & Signed Download** | `POST /attachments` & `GET /attachments/file/...` (`15m` TTL) | `GET /attachments/:mediaId/download` | **`POST /api/chat/upload`** & **`GET /api/chat/attachments/:mediaId/download`** (`3600s` default TTL) |
| **Org-Unit Group Provisioning** | `POST /api/chat/hrms/create-org-group` | — | **`POST /api/chat/hrms/groups/from-org`** ([chat.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/chat.routes.ts#L1660)) |

*No duplicate or unsafe legacy handlers remain in runtime code; the discrepancies above are documentation drift in `MASTERHRMS_CHAT_FINAL_ACCEPTANCE_REPORT.md`.*

---

## 4. Database Schema, Migration & Preservation Reconciliation

### 4.1 Live Supabase PostgreSQL Schema & Index Verification
Read-only catalog queries against `information_schema.columns`, `pg_indexes`, and `pg_constraint` (`scratch/c10_db_and_provider_baseline.json`) verified **zero schema drift** between [schema.prisma](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma), [migration.sql](file:///Users/apple/Documents/hrms/server/prisma/migrations/20261114_chat_security_reliability_preferences/migration.sql), and live Supabase PostgreSQL across all 11 Chat & Calling tables:

1. **`chat_messages`:** Verified `client_temp_id` (`varchar`), `edit_history` (`jsonb`), `deleted_for_user_ids` (`jsonb`), `is_deleted_for_everyone` (`bool`), unique idempotency index `chat_messages_tenant_id_sender_id_client_temp_id_key` (`UNIQUE (tenant_id, sender_id, client_temp_id)`), timeline index `chat_messages_tenant_id_thread_id_created_at_idx`, and GIN full-text index `chat_messages_content_fts_idx` (`USING gin (to_tsvector('english'::regconfig, COALESCE(content, ''::text)))`).
   - *Technical Note:* Although `chat_messages_content_fts_idx` exists physically in PostgreSQL, `GET /api/chat/search` ([chat.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/chat.routes.ts#L3610)) currently queries via Prisma `{ content: { contains: q, mode: "insensitive" } }` (`ILIKE`), which performs a tenant/thread-filtered index scan rather than invoking `to_tsvector @@ plainto_tsquery` against the GIN index.
2. **`chat_groups` & `chat_group_members`:** Verified `category`, `department_id`, `is_announcement_only`, `is_archived`, `max_members` (default `500`), `invite_token` (`chat_groups_invite_token_key`), and `chat_group_members_group_id_user_id_key`.
3. **`chat_conversation_preferences`:** Verified physical table, `chat_conversation_preferences_tenant_id_user_id_thread_id_key` unique constraint, and columns (`is_muted`, `muted_until`, `is_archived`, `pinned_at`, `marked_unread_at`, `notification_level`, `draft_text`).
4. **`chat_user_presences`:** Verified physical table, `chat_user_presences_tenant_id_user_id_key` unique constraint, and `chat_user_presences_tenant_id_status_last_seen_at_idx`.
5. **`calls`, `call_participants`, `call_events`, `call_history_records`:** Verified all 4 calling tables, foreign keys (`ON DELETE CASCADE`), `calls_room_key_key`, and `call_history_records.thread_id` (`call_history_records_tenant_id_thread_id_started_at_idx`).
6. **`_prisma_migrations` Reconciliation:** `_prisma_migrations` does **not** exist in the public schema (`tableExists: false`); MASTERHRMS manages Supabase schema state via `prisma db push` + idempotent `IF NOT EXISTS` SQL scripts. Because [migration.sql](file:///Users/apple/Documents/hrms/server/prisma/migrations/20261114_chat_security_reliability_preferences/migration.sql) uses `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS` throughout, it is safe and idempotent.

### 4.2 Exact Before vs. After Database Row Counts (`0` Net Delta)

| Table Name | Pre-Verification Baseline (`12:57:20Z`) | Post-Verification Final (`13:33:00Z`) | Net Delta | Preservation Verdict |
|---|---:|---:|---:|---|
| `chat_messages` | `541` | `541` | `0` | **100% Preserved** |
| `chat_groups` | `2` | `2` | `0` | **100% Preserved** |
| `chat_group_members` | `13` | `13` | `0` | **100% Preserved** |
| `chat_read_receipts` | `48` | `48` | `0` | **100% Preserved** |
| `chat_conversation_pins` | `1` | `1` | `0` | **100% Preserved** |
| `chat_conversation_preferences` | `0` | `0` | `0` | **100% Preserved** |
| `chat_user_presences` | `1` | `1` | `0` | **100% Preserved** |
| `calls` | `17` | `17` | `0` | **100% Preserved** |
| `call_participants` | `31` | `31` | `0` | **100% Preserved** |
| `call_events` | `34` | `34` | `0` | **100% Preserved** |
| `call_history_records` | `139` | `139` | `0` | **100% Preserved** |
| `media_files` | `284` | `284` | `0` | **100% Preserved** |
| `file_acls` | `16` | `16` | `0` | **100% Preserved** |
| `outbox_events` | `977` | `977` | `0` | **100% Preserved** |
| `notifications` | `1,023` | `1,023` | `0` | **100% Preserved** |

---

## 5. Provider & Runtime Readiness Matrix (Zero Secret Exposure)

| Subsystem / Provider | Configured | Connected | Tested | Production-Ready | Evidence & Exact Operational Limitations |
|---|:---:|:---:|:---:|:---:|---|
| **Socket.IO Primary Realtime** | Partial | Yes (Dev) | Yes | **Blocked (`CMS` env)** | Live `:3000 <-> :4000 <-> :5173` bidirectional WebSocket verified. **Blocker:** [CMS/src/lib/socket.ts](file:///Users/apple/Documents/hrms/CMS/src/lib/socket.ts#L36-L40) disables Socket.IO when `NODE_ENV === "production"` unless `NEXT_PUBLIC_SOCKET_URL` is set (`CMS/.env.local` currently omits `NEXT_PUBLIC_SOCKET_URL`). |
| **Redis Socket.IO Adapter** | No | No | No | **Single-Node Only** | `REDIS_URL` is unset and `@socket.io/redis-adapter` / `redis` are not installed in `server/package.json`. Presence falls back to `chat_user_presences` in PostgreSQL, but Socket.IO room broadcasts, `evictUserFromThreadRoom`, `activeCalls`, and `activeGroupCalls` are single-process in-memory. |
| **Pusher Fallback Realtime** | Yes | Scoped | Yes | **Blocked (Bundle Leak)** | `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, and `PUSHER_CLUSTER` are set in `server/.env`. **Blocker:** Root `.env` defines `VITE_PUSHER_SECRET` and [settings.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/super/settings.tsx#L336) reads `import.meta.env.VITE_PUSHER_SECRET`, exposing the server HMAC secret to Vite client bundles. |
| **LiveKit Cloud SFU (Multiparty)** | **No** | **No** | Code + Fallback | **No (Env Unset)** | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are **unset** in `.env`, `server/.env`, and `CMS/.env.local`. `GET /api/chat/meetings/config` returns `status: "pending_configuration"`. Token signing (`MeetingSfuService`) passed unit suites (`4/4`) and UI cleanly displays the `"LiveKit SFU Notice"` banner, but live multiparty SFU media relay is inactive until credentials are set. |
| **1:1 WebRTC STUN / TURN** | STUN Only | STUN Only | Yes | **LAN / Non-Symmetric NAT Only** | `GET /api/calls/ice-servers` returns `200` with Google STUN (`stun:stun.l.google.com:19302`) and `hasTurn: false` (`TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`, `TURN_SHARED_SECRET` unset). 1:1 WebRTC media will fail across strict corporate symmetric NATs/firewalls without TURN. |
| **Private Attachment Storage** | Local Disk | Local Disk | Yes | **Single-Host Only** | `STORAGE_PROVIDER` defaults to local filesystem (`/Users/apple/Documents/hrms/uploads`, or ephemeral `/tmp/uploads` on `VERCEL`). Requires persistent volume on single-host deployments or S3/R2/Supabase Storage migration before multi-instance/serverless deployment. |
| **Web Push / VAPID (Offline Calls)** | **Mismatched** | No | Crypto Audited | **Blocked (Key Mismatch)** | `VAPID_PUBLIC_KEY` and `VAPID_SUBJECT` are set in `server/.env`, while `VAPID_PRIVATE_KEY` is **unset**. [vapid.service.ts](file:///Users/apple/Documents/hrms/server/src/services/vapid.service.ts#L69-L77) pairs the configured public key with an unrelated `JWT_SECRET`-derived private scalar (`ecSignatureVerifiesAgainstConfiguredPub = false`), guaranteeing push relay `401/403` rejection until a matching `VAPID_PRIVATE_KEY` is configured. |

---

## 6. Exact Test Commands, Exit Codes & Fresh Empirical Results

Every verification command below was executed freshly in this C10 audit session:

| # | Verification Suite | Exact Command Executed | Exit Code | Result Summary |
|---|---|---|:---:|---|
| 1 | TanStack Start TypeScript Check | `./node_modules/.bin/tsc --noEmit` | `0` | **PASS** (`0` type errors) |
| 2 | Next.js 15 CMS TypeScript Check | `./node_modules/.bin/tsc -p CMS/tsconfig.json --noEmit` | `0` | **PASS** (`0` type errors) |
| 3 | Express Backend TypeScript Check | `./server/node_modules/.bin/tsc -p server/tsconfig.json --noEmit` | `0` | **PASS** (`0` type errors) |
| 4 | 1:1 & Group Calling Security/Lifecycle Suite | `./server/node_modules/.bin/tsx server/src/tests/chat-calling-verification.test.ts` | `0` | **16 / 16 Suites PASSED** (cross-tenant invite block, third-party accept/cancel/end block, ringing media-state block, multi-tab survival, reconnect grace expiry, non-member group-call join/signal block) |
| 5 | Multiparty Meeting & LiveKit SFU Unit Suite | `./server/node_modules/.bin/tsx server/src/tests/multi-participant-meeting.test.ts` | `0` | **4 / 4 Suites PASSED** (`SfuConfigurationError` diagnostics, HS256 room-scoped token claims, host-only `CALL_FORBIDDEN` end guard, idempotent `CallHistoryRecord`, LiveKit SDK lifecycle) |
| 6 | C10 Live Security & Isolation Harness | `node .../scratch/c10_security_harness.mjs` | `0` | **16 / 16 Checks PASSED** (`SEC-01` through `SEC-13`) |
| 7 | C10 Multi-Browser E2E & Responsive Suite | `node .../scratch/c10_browser_e2e.mjs` | `0` | **6 / 6 Suites PASSED** (`E2E-01`–`E2E-06`, including `12 / 12` responsive viewport checks across `:3000` & `:5173`) |
| 8 | C10 Live Performance Benchmark | `node .../scratch/c10_perf_benchmark.mjs` | `0` | **Completed** (`8` API/WebSocket benchmarks + `2` browser load benchmarks recorded) |

### 6.1 Multi-Browser E2E & Responsive Breakdown (`c10_browser_e2e.mjs`)
- **`E2E-01` Cross-Frontend Bidirectional Messaging (`:3000 <-> :5173`):** **PASS** — Message sent in Next.js CMS (`:3000/hr/chat`) rendered live via Socket.IO in TanStack Start (`:5173/me/chat`) without reload, and reply from TanStack (`:5173`) rendered live in Next.js (`:3000`) with `Seen (1)` read receipt update.
- **`E2E-02` Offline Disconnect & Cursor Reconnect Catch-Up:** **PASS** — Disconnected `window.__socket` on `:5173`, dispatched message while offline, reconnected socket, and verified automatic `GET /api/chat/conversations/:threadId/messages?after=b11d4eec-8b67-4bfd-9b1e-a7d8914a3840&limit=50` delta fetch + live DOM render.
- **`E2E-03` Browser Private Attachment ACL:** **PASS** — Authorized group member browser `fetch` returned `HTTP 200`; same-tenant non-member bystander browser `fetch` returned `HTTP 403`.
- **`E2E-04` Cross-Frontend Multiparty Meeting, Roster & Screen-Share Stage:** **PASS** — Host on `:3000` started group video meeting (`[data-testid="multi-participant-meeting-dialog"]`), invitee on `:5173` received `[data-testid="incoming-group-meeting-dialog"]` and joined (`2 Active` roster synchronized across `:3000` and `:5173`), host toggled `getDisplayMedia` screen share (`[data-testid="meeting-screen-stage"]` rendered `"You are presenting"` on `:3000` and `"Tenant A Super Admin is presenting their screen"` on `:5173`), and UI truthfully displayed `"LiveKit SFU Notice"` (`sfuState = unconfigured-diagnostic-banner-shown`).
- **`E2E-05` Cross-Route 1:1 WebRTC Call Ringing Overlay, Accept & Hangup:** **PASS** — While employee was on `/me/leave/applications` (`:5173`), 1:1 call invite from `:3000` triggered global `[data-testid="incoming-call-dialog"]` (`FullScreenIncomingCall`), followed by clean `200` accept and `200` hangup teardown.
- **`E2E-06` Responsive Viewports (`0px` Horizontal Overflow Across All 12 Checks):**

| Viewport | Next.js 15 CMS (`:3000/hr/chat`) `scrollWidth / innerWidth` | TanStack Start (`:5173/hr/chat`) `scrollWidth / innerWidth` | Overflow |
|---|:---:|:---:|:---:|
| `360 x 800` | `360 / 360` | `360 / 360` | **`0px` (PASS)** |
| `390 x 844` | `390 / 390` | `390 / 390` | **`0px` (PASS)** |
| `430 x 932` | `430 / 430` | `430 / 430` | **`0px` (PASS)** |
| `768 x 1024` | `768 / 768` | `768 / 768` | **`0px` (PASS)** |
| `1024 x 768` | `1024 / 1024` | `1024 / 1024` | **`0px` (PASS)** |
| `1440 x 900` | `1440 / 1440` | `1440 / 1440` | **`0px` (PASS)** |

---

## 7. Performance Results (Prior Reported vs. Fresh Independent C10 Benchmark)

All fresh C10 measurements (`scratch/c10_perf_results.json`) were recorded from this macOS workstation over remote TLS to Supabase Pooler (`aws-0-ap-south-1.pooler.supabase.com:6543`):

| Workload / Endpoint | C0 Baseline `p50` *(Reported)* | C9 After `p50` *(Reported)* | **Fresh C10 `p50`** | **Fresh C10 `p95`** | **Fresh C10 `min` / `max`** | Independent Analysis |
|---|---:|---:|---:|---:|---:|---|
| `GET /api/chat/contacts` | `1,129 ms` | `426 ms` | **`1,300.4 ms`** | `1,751.2 ms` | `1,166.4 / 1,751.2 ms` | Zero N+1 SQL verified (`DISTINCT ON` + `GROUP BY`); total time dominated by sequential remote TLS DB hops (`~180ms` RTT/hop to `ap-south-1` across auth/subscription/directory queries). |
| `GET /api/chat/conversations` | `1,340 ms` | `588 ms` | **`1,375.9 ms`** | `1,572.1 ms` | `1,239.6 / 1,572.1 ms` | Constant query count regardless of conversation count (`fetchThreadSummariesBatch`). |
| `GET /api/chat/groups` | `1,284 ms` | `422 ms` | **`1,336.2 ms`** | `1,971.5 ms` | `1,235.5 / 1,971.5 ms` | Constant batch summary query; bounded by remote pooler RTT. |
| `GET /api/chat/conversations/:id/messages?limit=30` | `346 ms` | `676 ms` | **`1,886.2 ms`** | `2,427.0 ms` | `1,570.1 / 2,427.0 ms` | Executes `authorizeThread` + message fetch + `markThreadRead` upsert over remote TLS (`markRead` defaults to `true` unless `?markRead=false` is passed). |
| `POST /api/chat/messages` | `231 ms` | `469 ms` | **`1,214.5 ms`** | `1,432.9 ms` | `1,109.2 / 1,432.9 ms` | Executes `authorizeThread` + transactional `ChatMessage` & `OutboxEvent` insert over remote TLS. |
| `Socket.IO E2E Delivery (POST -> peer receive)` | N/A | `468 ms` | **`1,213.9 ms`** | `1,431.6 ms` | `1,108.4 / 1,431.6 ms` | **Socket.IO broker & WebSocket delivery overhead is `< 2 ms`** (peer receives `chat:message` before HTTP `POST` response finishes flushing). |
| `GET /api/chat/search?q=Leave` | `404` | `345 ms` | **`834.7 ms`** | `1,182.7 ms` | `744.8 / 1,182.7 ms` | Scoped strictly to authorized threads (`200 OK`). |
| `GET /api/chat/calls` | `221 ms` | `218 ms` | **`609.6 ms`** | `888.6 ms` | `560.4 / 888.6 ms` | Participant-scoped call history query. |
| **Next.js 15 CMS (`:3000/hr/chat`) Initial Load** | `17,550 ms` | `2,821 ms` | **`528.5 ms`** | `926.6 ms` | `491.1 / 926.6 ms` | **`-97.0%` vs C0 baseline** (warm Next.js App Router shell). |
| **TanStack Start (`:5173/hr/chat`) Initial Load** | *(unmounted)* | `3,026 ms` | **`2,679.2 ms`** | `3,257.6 ms` | `2,562.5 / 3,257.6 ms` | Vite dev-server unbundled module transform overhead; production bundle eliminates dev transform cost. |

*Note on API Latency:* Co-locating the Express backend in AWS `ap-south-1` alongside Supabase PostgreSQL (reducing per-query RTT from `~180 ms` WAN TLS to `< 2 ms` intra-region VPC) will reduce REST latencies by `~5x–8x` without code changes.

---

## 8. Remaining Limitations & Production Risks

### A. Blocking Pre-Deployment Security & Configuration Defects (Must Fix Before Release)
1. **Client-Side Pusher Secret Exposure (`VITE_PUSHER_SECRET`):**
   - Remove `VITE_PUSHER_SECRET` from `.env` (and any CI/Vercel frontend environment variables) and remove `import.meta.env.VITE_PUSHER_SECRET` from [settings.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/super/settings.tsx#L336), then rotate the compromised Pusher secret in the Pusher dashboard.
2. **Broken VAPID Asymmetric Keypair (`VAPID_PUBLIC_KEY` without `VAPID_PRIVATE_KEY`):**
   - Generate a matched P-256 VAPID keypair (`npx web-push generate-vapid-keys`) and set **both** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `server/.env`, and update [vapid.service.ts](file:///Users/apple/Documents/hrms/server/src/services/vapid.service.ts#L69-L77) so that if *either* key is missing in development, both `pub` and `priv` are derived from the same scalar rather than mixing an `.env` public key with a `JWT_SECRET`-derived private key.
3. **Next.js CMS Production Socket.IO Gate (`NEXT_PUBLIC_SOCKET_URL`):**
   - Set `NEXT_PUBLIC_SOCKET_URL` in CMS production environment variables so [CMS/src/lib/socket.ts](file:///Users/apple/Documents/hrms/CMS/src/lib/socket.ts#L36-L40) connects to the production Express Socket.IO origin when `NODE_ENV === "production"`.
4. **LiveKit Cloud SFU & TURN Credentials (`LIVEKIT_*` / `TURN_*`):**
   - Provision `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` (plus `TURN_SERVER_URL` / `TURN_SHARED_SECRET` or `TURN_USERNAME` + `TURN_CREDENTIAL` for 1:1 WebRTC calls across symmetric NATs) in the backend production environment and run a live 2-network WebRTC media smoke check.

### B. Documented Architectural & Operational Limitations (Non-Blocking for Single-Instance Stateful Deployment)
1. **Single-Instance Stateful Express Requirement (Until Redis + Object Storage Are Added):**
   - Because `@socket.io/redis-adapter` is not installed (`REDIS_URL` unset) and private chat attachments write to local disk (`/Users/apple/Documents/hrms/uploads`), Express must run as a **single stateful container/VM with a persistent `/uploads` volume** (not serverless / multi-replica) until Redis pub/sub and S3/R2/Supabase Storage are wired.
2. **Unused PostgreSQL GIN FTS Index in `/api/chat/search`:**
   - `chat_messages_content_fts_idx` is created in PostgreSQL, but `/api/chat/search` uses Prisma `contains` (`ILIKE`). Switching to `to_tsvector('english', coalesce(content, '')) @@ plainto_tsquery('english', $q)` is recommended once `chat_messages` grows beyond `100k+` rows.
3. **Prisma `db push` Workflow (`_prisma_migrations` Absent):**
   - Continue applying [migration.sql](file:///Users/apple/Documents/hrms/server/prisma/migrations/20261114_chat_security_reliability_preferences/migration.sql) via idempotent SQL execution or `prisma db push` (do **not** run `prisma migrate reset` or unbaselined `prisma migrate dev` against production).

---

## 9. Explicit Final Release Sign-Off Verdict

- **Verdict:** **`BLOCKED`**
- **Scope of Block:** Production deployment authorization is **withheld solely on the 4 pre-deployment secret-hygiene and provider-configuration gates in Section 8.A** (`VITE_PUSHER_SECRET` client-bundle leak, broken VAPID keypair mismatch, missing `NEXT_PUBLIC_SOCKET_URL` for CMS production builds, and unconfigured `LIVEKIT_*` / `TURN_*` credentials).
- **Code & Data Readiness:** All C0–C9 application security controls, tenant/thread isolation, private signed attachment ACLs, dual-frontend parity (`src/` & `CMS/src/`), responsive layouts (`360px`–`1440px`), and Supabase PostgreSQL schema/data integrity (`0` row delta) are **independently verified and passing**. Once the 4 items in Section 8.A are remediated and Express is deployed on a single stateful instance with persistent `/uploads` storage (or Redis + object storage), the release status upgrades directly to **`APPROVED WITH DOCUMENTED LIMITATIONS`**.
