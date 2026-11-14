# MASTERHRMS — Initial Chat Architecture, Security, Data & Parity Audit (`Phase C0`)

**Repository:** `Webfamily-06/masterhrms`  
**Branch:** `main` (`HEAD` at `53e4d7f0`, preserving uncommitted Leave Management & Organization Tree work in working tree)  
**Audit Timestamp:** `2026-11-14T14:05:00+05:30`  
**Mode:** Strictly Read-Only Baseline (`Phase C0` completed prior to any Chat/Call/Schema modifications)

---

## 1. Environment, Migration & Live Database Baseline

### 1.1 Environment & Provider Configuration Summary (Keys Only — Zero Secrets Exposed)

| Scope | File / Variable | Status | Architectural Impact |
| :--- | :--- | :--- | :--- |
| Root Frontend (`.env`) | `VITE_API_URL`, `DATABASE_URL` | `SET` | TanStack Start (`:5173`) proxies `/api` and `/socket.io` to Express (`:4000`). |
| Root Frontend (`.env`) | `VITE_PUSHER_APP_ID`, `VITE_PUSHER_KEY`, `VITE_PUSHER_CLUSTER`, `VITE_PUSHER_ENABLED` | `SET` | Frontend Pusher client config present; however backend `PUSHER_*` env keys are unset in `server/.env`. |
| Backend (`server/.env`) | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` | `SET` | Connected to Supabase PostgreSQL 17. |
| Backend (`server/.env`) | `STORAGE_PROVIDER` | `SET` (`local`) | `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **not set**; `storage.buckets` in Supabase is `[]` (empty). Files write to `server/uploads/`. |
| Backend (`server/.env`) | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `SET` | LiveKit Cloud SFU configured (`wss://masterhrms-yyz3p8qg.livekit.cloud`). Testable using isolated non-production room names. |
| Backend (`server/.env`) | `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET` | `NOT SET` | `PusherService.getConfig().enabled` evaluates `false` unless populated via DB `SettingsService`. Per Section 8, live writes against unverified production Pusher apps are prohibited. |
| Backend (`server/.env`) | `TURN_URLS` / `COTURN_*` | `NOT SET` | `MeetingSfuService.getIceServers()` falls back to STUN (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`) unless `TURN_*` env vars are supplied; LiveKit SFU manages its own embedded TURN over TLS/UDP for group meetings. |
| Backend (`server/.env`) | `REDIS_URL` | `NOT SET` | No Redis instance configured and no `redis`/`@socket.io/redis-adapter` package installed. Distributed coordination must leverage PostgreSQL (`Call`, `CallParticipant`, shared presence table + PostgreSQL `LISTEN/NOTIFY`) with optional Redis adapter hook when `REDIS_URL` is provided. |
| CMS (`CMS/.env*`) | `.env` / `.env.local` | `ABSENT` | Next.js 15 CMS (`:3000`) proxies `/api/*` and `/uploads/*` via `CMS/next.config.ts` to `http://localhost:4000`. |

### 1.2 Prisma Schema & Supabase PostgreSQL Migration Status

- **`_prisma_migrations` Table:** Does **not** exist (`42P01: relation "_prisma_migrations" does not exist`). Schema synchronization in this repository uses non-destructive `prisma db push` / additive idempotent SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **Physical Tables Verified (`32` Chat/Call/Media/Notification/HRMS tables, `112` PostgreSQL indexes):**
  - `chat_messages`, `chat_groups`, `chat_group_members`, `chat_read_receipts`, `chat_conversation_pins`
  - `calls`, `call_participants`, `call_events`, `call_history_records`
  - `media_files`, `file_acls`, `outbox_events`, `notifications`, `push_subscriptions`
  - `tenants`, `users`, `profiles`, `employees`, `departments`, `branches`, `workspace_roles`, `permissions`, `role_permissions`, `user_role_assignments`

### 1.3 Live Row-Count Baseline (Non-Negotiable Preservation Floor)

| Table / Model | Total Rows (All Tenants) | Default Tenant (`tenant-default-001`) |
| :--- | ---: | ---: |
| `ChatMessage` (`chat_messages`) | `541` | `536` |
| `ChatGroup` (`chat_groups`) | `2` | `2` |
| `ChatGroupMember` (`chat_group_members`) | `13` | `13` |
| `ChatReadReceipt` (`chat_read_receipts`) | `48` | `41` |
| `ChatConversationPin` (`chat_conversation_pins`) | `1` | `0` |
| `Call` (`calls`) | `17` | `10` |
| `CallParticipant` (`call_participants`) | `31` | — |
| `CallEvent` (`call_events`) | `34` | — |
| `CallHistoryRecord` (`call_history_records`) | `139` | `115` |
| `MediaFile` (`media_files`) | `284` | `99` |
| `FileAcl` (`file_acls`) | `16` | — |
| `OutboxEvent` (`outbox_events`) | `977` | — |
| `Notification` (`notifications`) | `1,023` | `934` |
| `Tenant` (`tenants`) | `265` | `1` |
| `User` (`users`) | `585` | — |
| `Employee` (`employees`) | `86` | `8` |

---

## 2. Existing Architecture Inventory

### 2.1 Frontend Architecture Inventory (TanStack Start `src/` & Next.js 15 `CMS/src/`)

| Component / Utility | TanStack Start (`src/`) | Next.js 15 CMS (`CMS/src/`) | Role & Current State |
| :--- | :--- | :--- | :--- |
| Main Chat Shell | `src/components/chat/unified-chat-app.tsx` (`5,358` lines) | `CMS/src/components/chat/unified-chat-app.tsx` (`5,358` lines) | Monolithic chat workspace: sidebar (`Personal`, `Groups`, `Calls` tabs), message timeline, composer, WebRTC 1:1 call modal, group dialogs, profile/info drawer. Byte-identical except framework router imports. |
| Socket Client | `src/lib/socket.ts` | `CMS/src/lib/socket.ts` | Connects to `io(API_ORIGIN, { auth: { token } })`. Missing automatic room re-subscription (`chat:join`) and missed-message catch-up upon reconnect. |
| Pusher Client | `src/lib/pusher-client.ts` | `CMS/src/lib/pusher-client.ts` | Subscribes to `private-tenant-${tenantId}` and `private-user-${userId}`, binding `chat:*` events on tenant-wide channel. |
| Group Meeting UI | `src/components/chat/multi-participant-meeting-dialog.tsx` | `CMS/src/components/chat/multi-participant-meeting-dialog.tsx` | LiveKit `Room` WebRTC SFU client + mesh fallback. Missing `<video>` element in remote screen-share banner and overwrites camera `videoTrack` on screen share. |
| Global Call Listener | `src/components/chat/global-incoming-call-listener.tsx` | `CMS/src/components/chat/global-incoming-call-listener.tsx` | Mounted in app root layout; rings and displays incoming call dialog even when `UnifiedChatApp` is also mounted on `/chat`, causing duplicate ringtones & modals. |
| Floating PiP Call Widget | `src/components/chat/floating-mini-call-widget.tsx` | `CMS/src/components/chat/floating-mini-call-widget.tsx` | Global PiP widget; uses unsafe `innerHTML`, calls `/cancel` instead of `/end` on hangup, and navigates via `window.location.href` (destroying active `RTCPeerConnection`). |
| Voice Note Player | `src/components/chat/voice-note-player.tsx` | `CMS/src/components/chat/voice-note-player.tsx` | Waveform audio player; uses `bg-primary` button inside `bg-primary` sender bubble (invisible play button). |
| Poll Card & Creator | `src/components/chat/poll-card.tsx`, `poll-creator-dialog.tsx` | `CMS/src/components/chat/poll-card.tsx`, `poll-creator-dialog.tsx` | Renders poll options, percentages, voter avatars, close poll action. |
| Emoji & Media Pickers | `src/components/chat/emoji-picker.tsx`, `media-picker-dialog.tsx` | `CMS/src/components/chat/emoji-picker.tsx`, `media-picker-dialog.tsx` | Fixed `w-80` (`320px`) emoji popover overflows `360px` mobile viewports. |
| Route Wrappers | `src/routes/_authenticated/{hr,me,tenant}/chat.tsx` (+ `.groups.tsx`, `.contacts.tsx`, `.calls.tsx`) | `CMS/src/app/(workspace)/{hr,me,tenant}/chat/**/page.tsx` | **Bug in TanStack Start:** `chat.tsx` renders `<UnifiedChatApp initialMode="chats" />` without `<Outlet />`, completely shadowing `/chat/groups`, `/chat/contacts`, and `/chat/calls`. |

### 2.2 Backend & Database Service Inventory (`server/src/`)

| File | Responsibility & Audit Findings |
| :--- | :--- |
| `server/src/routes/chat.routes.ts` (`3,730` lines) | 38 HTTP endpoints covering contacts, conversations, groups, pins, uploads, URL previews, messages, reactions, polls, read/delivery receipts, call history, and `/meetings/*`. Contains inline business logic duplicated from `socket.ts`, permissive `checkThreadAuthorization`, N+1 loops, `take: 200` caps, tenant-wide broadcasts, and `prisma.userProfile` crash on lines `3425` & `3557`. |
| `server/src/routes/call.routes.ts` (`1,246` lines) | 13 HTTP endpoints under `/api/calls` (`pending`, `invite`, `signal`, `status`, `accept`, `reject`, `cancel`, `end`, `reconnect`, `invite-colleague`, `accept-invitation`, `sfu-token`, `ice-servers`, `sfu-status`). Solid `CallLifecycleService` integration, but partially bypassed by `socket.ts`. |
| `server/src/socket.ts` (`~1,950` lines) | Socket.IO server: `chat:send`, `chat:typing`, `chat:read`, `chat:delivered`, `subscribe:record`, `call:*`, `group-call:*`. Joins every socket to `tenant:${tenantId}`, runs `chat:send`/`chat:read` outside `runWithTenantContext` without `checkThreadAuthorization`, registers duplicate `call:media-state` listener, and lacks `DeviceSession` revocation checks. |
| `server/src/services/call-lifecycle.service.ts` | Persist-first PostgreSQL state machine for `Call`, `CallParticipant`, and `CallEvent`. `recoverExpiredCalls` exists but is never scheduled; `markParticipantReconnecting` exists but is not called on socket disconnect. |
| `server/src/services/meeting-sfu.service.ts` | Generates HS256 LiveKit JWTs (`roomJoin`, `canPublish`, `canSubscribe`) and RFC 7635 TURN credentials. Non-host tokens set `roomCreate: false` (race condition if joiner connects before host). |
| `server/src/services/chat-system-events.service.ts` | Persists `isSystemEvent: true` rows in `ChatMessage` for group lifecycle events, but broadcasts them to `tenant:${tenantId}` instead of group members only. |
| `server/src/services/chat-folder.service.ts` | Creates `/Communication/Direct_Messages/...` and `/Communication/Groups/...` `MediaFile` folder nodes; only populates `aclUsers` for 1:1 DMs, not groups. |
| `server/src/services/media/media.service.ts` & `middleware/uploads-security.middleware.ts` | Local disk storage (`server/uploads/`). `uploadsSecurityMiddleware` omits `communication` from `SENSITIVE_DOCUMENT_FOLDERS` and ignores `FileAcl`; `.webm` magic-byte check has `|| buffer.length > 4` bug; `.svg` allowed inline; `writeFile` errors swallowed. |
| `server/src/services/url-preview.service.ts` | Fetches OpenGraph metadata; follows HTTP redirects (`redirect: "follow"`) without re-validating redirect target IPs against private ranges (SSRF). |
| `server/src/services/vapid.service.ts` & `incoming-call-push.service.ts` | Web Push notification sender; `VapidService.encryptPayload` omits `ua_public \|\| as_public` in RFC 8291 `"WebPush: info\0"` HKDF info. |

---

## 3. Complete Feature Status Matrix (`Section 1`)

| # | Feature | Status | Frontend Source | Backend Endpoint / Event | Root Cause / Gap Summary |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | Direct conversations | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/conversations/direct` | Works functionally, but `checkThreadAuthorization` allows `direct_<singleToken>` and `tenant_admin` snooping, and broadcasts DMs to `tenant:${tenantId}`. |
| 2 | Group chats | `PARTIAL` | `unified-chat-app.tsx` | `GET/POST /api/chat/groups`, `PATCH /groups/:id` | `POST /groups` skips member tenant validation (`F-07`) and has no max member cap; group events leak to `tenant:${tenantId}`. |
| 3 | Contact directory | `PARTIAL` | `unified-chat-app.tsx` | `GET /api/chat/contacts` | Hardcoded `take: 200` hides employees >200; search runs in JS after `take: 200`; `3*N` N+1 queries (`1,129ms` p50); missing branch & reporting manager metadata; `Contacts` tab button missing in UI & TanStack route shadowed. |
| 4 | Conversation list | `PARTIAL` | `unified-chat-app.tsx` | `GET /api/chat/conversations` | `take: 200` on `chatMessage.findMany` drops active conversations if 1 thread has 200 messages; `3*G + 4*D` N+1 queries (`1,340ms` p50); no server pagination or archive filter. |
| 5 | Message loading & pagination | `WORKING` | `unified-chat-app.tsx` | `GET /api/chat/messages/:threadId` (`before` cursor) | Cursor pagination (`before`, `limit`<=100) works; needs strict `checkThreadAuthorization` repair. |
| 6 | Sending messages | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/messages`, Socket `chat:send` | Dual diverging code paths (`chat.routes.ts` vs broken `socket.ts`); in-memory-only `clientTempId` cache; no UI Retry button on failed sends; broadcasts plaintext to `tenant:${tenantId}`. |
| 7 | Reactions | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/messages/:id/react` | Works for toggle, but non-atomic read-modify-write JSON race under concurrency and broadcasts to `tenant:${tenantId}`. |
| 8 | Replies | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/messages` (`replyToId`) | Denormalized `replyTo` snapshot is not redacted when target message is deleted for everyone; clicking reply quote does not scroll/load target message if off-screen. |
| 9 | Forwarding | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/messages/forward-batch` | Does not grant `FileAcl` on forwarded attachments for destination thread participants; broadcasts to `tenant:${tenantId}`. |
| 10 | Edit & delete | `PARTIAL` | `unified-chat-app.tsx` | `PATCH /api/chat/messages/:id`, `DELETE /api/chat/messages/:id` | Missing `checkThreadAuthorization` (ex-group members can edit/delete, non-participants can `deleteForMe`); no edit history (`editHistory` JSON); attachments remain accessible after delete-for-everyone. |
| 11 | Read receipts | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/messages/:threadId/read`, Socket `chat:read` | Missing `checkThreadAuthorization` on REST; group read marks `deliveryStatus = "read"` when just **1** member reads; no per-member "Seen by" breakdown UI. |
| 12 | Delivered status | `BROKEN` | `unified-chat-app.tsx` | `POST /api/chat/messages/delivered`, Socket `chat:delivered` | Missing `checkThreadAuthorization`; `deliveredToUserIds` column exists in DB (`chat_messages.delivered_to_user_ids`) but is unused; Socket `chat:delivered` does not persist to DB. |
| 13 | Typing indicators | `PARTIAL` | `unified-chat-app.tsx` | Socket `chat:typing` | Broadcasts `chat:typing` to entire `tenant:${tenantId}` without verifying thread membership. |
| 14 | Online/offline presence | `PARTIAL` | `unified-chat-app.tsx` | `GET /api/chat/presence`, Socket `user:online`/`offline` | Stored only in process memory (`onlineUsers` Map in `socket.ts`); lost across multi-instance nodes or server restarts. |
| 15 | Pins (Conversation & Message) | `PARTIAL` | `unified-chat-app.tsx` | `POST /conversations/:threadId/pin`, `POST /messages/:id/pin` | `POST /conversations/:threadId/pin` lacks `checkThreadAuthorization`; `ChatConversationPin` missing from `DIRECT_TENANT_MODELS`. |
| 16 | Mute, Archive & Unread Preferences | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/groups/:id/mute` | Mute exists **only** for groups (`ChatGroupMember.isMuted`); 1:1 DM mute, conversation archive/unarchive, mark-as-unread, and notification level preferences are `MISSING`. |
| 17 | Shared files panel | `PARTIAL` | `unified-chat-app.tsx` | `GET /api/chat/messages/:threadId/files` | Scans last 200 messages without cursor pagination; underlying `/uploads/Communication/...` URLs lack ACL enforcement. |
| 18 | Attachments | `PARTIAL` | `unified-chat-app.tsx` | `POST /api/chat/upload`, `/api/v1/media` | **Critical ACL bypass (`F-05`):** Any authenticated tenant user can download `/uploads/Communication/...` or list/delete `/api/v1/media`; `.svg` XSS & `.webm` magic-byte bugs; no signed download URLs. |
| 19 | Voice notes | `PARTIAL` | `voice-note-player.tsx`, `unified-chat-app.tsx` | `POST /api/chat/upload` + `POST /api/chat/messages` | Recording & upload work, but play button (`bg-primary` inside `bg-primary` bubble) is invisible for sender, and `.webm` magic-byte check is broken. |
| 20 | Polls | `PARTIAL` | `poll-card.tsx`, `poll-creator-dialog.tsx` | `POST /messages/:id/poll/vote`, `/poll/close` | Anonymous polls (`isAnonymous: true`) still return raw `voterIds` and `voters` names in API & Socket payloads! Non-atomic JSON vote updates. |
| 21 | URL previews | `PARTIAL` | `unified-chat-app.tsx` | `GET /api/chat/url-preview` | Redirect SSRF bypass in `UrlPreviewService`; `POST /messages` accepts arbitrary client-crafted `urlPreviews` (`javascript:` URLs); message body URLs are plain text unless previewed. |
| 22 | Group membership & roles | `PARTIAL` | `unified-chat-app.tsx` | `POST/DELETE/PATCH /groups/:id/members*` | Removed members are **not** evicted from Socket.IO rooms (`socketsLeave`); role hierarchy lacks `moderator` & announcement-only posting enforcement; invite links hardcoded to `403 PUBLIC_INVITE_DISABLED` despite `ChatGroup.inviteToken`/`inviteExpiresAt` columns in DB. |
| 23 | Group ownership & delete/archive | `PARTIAL` | `unified-chat-app.tsx` | `POST /groups/:id/transfer-ownership` | Ownership transfer works; group archive and owner group delete endpoints/UI are `MISSING`. |
| 24 | Call history | `PARTIAL` | `unified-chat-app.tsx` | `GET/POST/DELETE /api/chat/calls` | Works for 1:1/group logs, but `/api/crm/calls` leaks all internal call records across the tenant (`F-08`) and `groupId` (`VarChar(36)`) truncates `threadId`. |
| 25 | 1:1 Audio & Video calls | `PARTIAL` | `unified-chat-app.tsx`, `global-incoming-call-listener.tsx` | `/api/calls/*`, Socket `call:*` | Hardcoded Google STUN (ignores `/api/calls/ice-servers`); dual incoming modals/ringtones + dual PiP widgets; 0s socket disconnect kill (no 30s reconnect grace); `call:cancel` overwrites status to `missed`; leaked socket listeners. |
| 26 | Group meetings (LiveKit SFU) | `BROKEN` | `multi-participant-meeting-dialog.tsx` | `POST /api/chat/meetings/start`, `/:callId/token` | **Fatal HTTP 500 crash (`F-06`):** `prisma.userProfile.findUnique` (`TypeError: Cannot read properties of undefined`) crashes `/meetings/start` and `/meetings/:callId/token`! Also double `getUserMedia` capture, `setMeetingSfuConfig` clobber, and in-memory-only `activeMeetings` Map. |
| 27 | Screen sharing | `BROKEN` | `multi-participant-meeting-dialog.tsx` | LiveKit `Track.Source.ScreenShare` | Remote screen-share banner renders text `"{name} is presenting"` with **zero `<video>` element**, and `TrackSubscribed` overwrites camera track! |
| 28 | Push & In-App Notifications | `PARTIAL` | `pusher-client.ts`, `notification` UI | `OutboxService`, `VapidService`, `IncomingCallPushService` | `VapidService.encryptPayload` violates RFC 8291 HKDF info (`F-13`); muted threads still trigger notifications in some paths; Pusher uses tenant-wide channel. |
| 29 | Global & In-Thread Search | `PARTIAL` | `unified-chat-app.tsx` | `GET /api/chat/messages/:threadId/search` (`GET /api/chat/search` -> `404`) | In-thread search lacks pagination, sender filter, attachment filename search, and date range; **global cross-conversation search (`GET /api/chat/search`) is completely `MISSING` (`404`)**. |
| 30 | Mobile & Accessibility (`360px`–`1440px`) | `PARTIAL` | `unified-chat-app.tsx` & subcomponents | — | Hover action bar (`-left-28`/`-right-28`) overflows at `360px`; composer buttons cram input to `<90px` at `360px`; `EmojiPicker` overflows `360px`; tablet `768px`–`1279px` Info drawer toggle broken; dark-mode badge contrast collisions. |

---

## 4. Confirmed Security & Realtime Findings (`Section 2` & `Section 7`)

1. **`F-01` (`CRITICAL`) — Tenant-Wide Broadcast of Private 1:1 & Group Messages:** `socket.ts` and `chat.routes.ts` emit `chat:message`, `chat:typing`, `chat:read`, `chat:delivered`, `chat:message_edited`, `chat:message_deleted`, `chat:message_pinned`, `chat:message_reacted`, and `chat:poll_updated` to `tenant:${tenantId}` and `private-tenant-${tenantId}`. Every authenticated employee in the tenant receives plaintext payloads of private DMs and restricted groups.
2. **`F-02` (`CRITICAL`) — Arbitrary Cross-Tenant Socket Room Join (`subscribe:record`):** `socket.ts:143-153` allows any socket to join `record:${entityType}:${entityId}` without tenant prefix or ownership check, receiving `OutboxService` domain payloads across tenants.
3. **`F-03` (`CRITICAL`) — Unprotected Divergent `socket.ts` `chat:send` / `chat:read`:** Bypasses `checkThreadAuthorization` and `runWithTenantContext`, lacking validation, idempotency, and session revocation checks.
4. **`F-04` (`CRITICAL`) — Permissive `checkThreadAuthorization` & Unprotected Endpoints:** Accepts `direct_<singleToken>` and unknown thread prefixes (`return { authorized: true }`), allows `tenant_admin` to snoop private 1:1 DMs, skips verifying both DM participants belong to `tenantId`, and is omitted entirely on `/pin`, `PATCH /messages/:id`, `DELETE /messages/:id`, `/delivered`, `/read`, `/calls`, and `/meetings/:callId/participants`.
5. **`F-05` (`CRITICAL`) — Private Chat Attachment & Media Library Exposure:** `uploadsSecurityMiddleware` does not enforce `FileAcl` on `/uploads/Communication/...`, and `/api/v1/media` permits any tenant user to list, view, and delete any `MediaFile` in the tenant.
6. **`F-06` (`HIGH`) — `prisma.userProfile` Crash on Group Meetings:** `chat.routes.ts:3425, 3557` calls `prisma.userProfile` instead of `prisma.profile`, breaking LiveKit SFU meeting start and token issuance with HTTP 500.
7. **`F-07` (`HIGH`) — Cross-Tenant Group Member Injection:** `POST /api/chat/groups` inserts arbitrary `memberIds` without verifying they belong to `tenantId`.
8. **`F-08` (`HIGH`) — Internal Call History Leak & Hard-Delete via `/api/crm/calls`:** `crm.routes.ts:1521-1731` exposes and allows deletion of private employee WebRTC `CallHistoryRecord` rows.
9. **`F-09` (`MEDIUM`) — Anonymous Poll Voter Deanonymization:** `chat.routes.ts` returns `voterIds` and resolved voter names to clients even when `poll.isAnonymous === true`.
10. **`F-10` (`MEDIUM`) — Redirect SSRF & Unsanitized Client `urlPreviews`:** `UrlPreviewService` follows redirects to internal IPs, and `POST /messages` persists unsanitized client `urlPreviews`.
11. **`F-11` (`HIGH`) — Severe N+1 Queries & `take: 200` Data Truncation:** `GET /conversations` (`1,340ms` p50), `GET /groups` (`1,284ms` p50), and `GET /contacts` (`1,129ms` p50) execute `3*N` sequential round-trips to remote Supabase PostgreSQL and silently drop contacts/conversations beyond 200 rows.
12. **`F-12` (`MEDIUM`) — Media Upload Validation Flaws:** Broken `.webm` magic-byte check (`|| buffer.length > 4`), inline `.svg` script execution vector, uncapped `chatUpload.any()` file count, cross-thread SHA-256 `parentId` hijacking, and swallowed disk write errors.
13. **`F-13` (`MEDIUM`) — Broken Web Push Payload Encryption & Announcement Spoofing:** `VapidService` omits client/server public keys in RFC 8291 HKDF info; `announcements.routes.ts` lacks write RBAC and trusts `req.body.employeeId` on acknowledgments.

---

## 5. Empirical `Phase C0` Before-Performance Baseline

Measured against remote Supabase PostgreSQL using an isolated 20-employee, 3-group, 5-DM, 40-message benchmark fixture (cleaned up 100% post-run):

| Endpoint / Flow | HTTP Status | `p50` Latency | `p95` Latency | Mean Latency | Root Bottleneck |
| :--- | :---: | ---: | ---: | ---: | :--- |
| `GET /api/chat/contacts` | `200` | `1,129 ms` | `1,347 ms` | `1,164 ms` | `3 * N` N+1 per-employee queries (`chatReadReceipt`, `chatMessage.count`, `chatMessage.findFirst`) |
| `GET /api/chat/contacts?search=Bench` | `200` | `1,095 ms` | `1,329 ms` | `1,153 ms` | Loads 200 rows + `3 * N` queries before filtering in JS |
| `GET /api/chat/conversations` | `200` | `1,340 ms` | `1,444 ms` | `1,365 ms` | `3 * G + 4 * D` sequential DB queries + `take: 200` scan |
| `GET /api/chat/groups` | `200` | `1,284 ms` | `1,388 ms` | `1,312 ms` | `3 * G + 2 * G * M` per-group & per-member profile queries |
| `GET /api/chat/messages/:threadId` | `200` | `346 ms` | `449 ms` | `359 ms` | Sequential authorization + pin + message lookup |
| `GET /api/chat/search?q=keyword` | `404` | `110 ms` | `164 ms` | `116 ms` | Endpoint missing (`404 Not Found`) |
| `GET /api/chat/calls` | `200` | `221 ms` | `234 ms` | `225 ms` | Single query + profile lookup |
| `POST /api/chat/messages` | `201` | `231 ms` | `237 ms` | `231 ms` | Sequential sender lookup + insert + outbox |
| Browser Initial Load (`/hr/chat` on `:3000`) | `200` | `17,550 ms` | — | `29 API reqs` | Redundant initial fetches + separate Personal/Groups tabs |

---

## 6. Sequential Execution Plan (`C1` → `C10`)

- **`C1`:** Authoritative `ChatService` (`server/src/services/chat.service.ts`), strict `checkThreadAuthorization`, group creation tenant validation, edit/delete/pin/receipt authorization, `DeviceSession` socket validation, `subscribe:record` tenant/ACL lockdown, and `/api/crm/calls` isolation.
- **`C2`:** Conversation-specific Socket.IO rooms (`tenant:{tenantId}:chat:{threadId}`), immediate room eviction on member removal/leave, private user-scoped Pusher fallback (`private-user-${userId}`), DB-backed `(tenantId, senderId, clientTempId)` idempotency, and reconnect catch-up.
- **`C3` & `C4`:** Complete 1:1 & group lifecycle (1:1 mute, archive/unarchive, mark unread, notification prefs, internal expiring group invite links, role-based group permissions & announcement-only mode, group archive/delete, accurate `Pending -> Sent -> Delivered -> Seen -> Failed` states + per-member group Seen breakdown + UI Retry, global & in-thread paginated search `GET /api/chat/search`, edit history, anonymous poll privacy fix, reply redaction/jump, SSRF-hardened URL previews + linkifier).
- **`C5`:** Enforce `FileAcl` + chat thread authorization across `uploadsSecurityMiddleware`, `/api/v1/media`, and signed download URLs (`/api/chat/attachments/:id/download`); fix `.webm` magic bytes, block inline `.svg`, enforce file count limits, grant `FileAcl` on forwards, and paginate shared files.
- **`C6`:** Repair `prisma.userProfile` crash, persist group meetings in `Call`/`CallParticipant`, fix LiveKit room creation & remote screen-share `<video>` rendering, remove double `getUserMedia` capture, wire `/api/calls/ice-servers`, fix 30s reconnect grace & expired call sweeper, fix duplicate incoming call modals/PiP widgets, and fix RFC 8291 Web Push HKDF.
- **`C7`, `C8`, `C9`:** HRMS dynamic group creation helpers (Department, Branch, Project, Leadership, HR, Management), HR announcement integration & RBAC fixes, `chat.*` RBAC integration, N+1 elimination & PostgreSQL indexes + server pagination, PostgreSQL-backed distributed presence & `LISTEN/NOTIFY` cross-instance sync, TanStack route shadowing fix, full `src/` ↔ `CMS/src/` parity, and `360px`–`1440px` mobile/dark-mode/ARIA polish.
- **`C10`:** Full automated security, two-client realtime Socket/WebRTC/LiveKit SFU, mobile viewport, parity, and before/after performance acceptance suite + final reports.
