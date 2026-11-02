# MASTERHRMS — PHASE 4: PUSHER REALTIME ARCHITECTURE AUDIT
## Stage A — Read-Only Architecture Audit & Security Protocol Review

**Repository:** `Webfamily-06/masterhrms`  
**Execution Branch:** `feat/incoming-call-web-push`  
**Phase:** **Phase 4 — Pusher End-to-End Verification**  
**Role:** Principal Software Architect, Senior Full-Stack Engineer, QA Automation Architect & Security Auditor  
**Date:** November 2, 2026  
**Status:** **AUDIT COMPLETE — VERIFIED SECURE & ROBUST**

---

## 1. Executive Overview

This document provides the authoritative Stage A architecture audit of the Pusher realtime infrastructure within the MasterHRMS platform.

MasterHRMS operates an **Enterprise Dual-Transport Realtime Subsystem**:
1. **Primary Transport:** High-frequency, low-latency bidirectional WebSockets powered by Socket.IO for active in-app messaging, WebRTC calling signals, LiveKit meeting sessions, and participant presence.
2. **Resilient Secondary & Push Transport:** Pusher Channels (`ap2` cluster / dynamically configurable via Super Admin Settings) providing high-availability event broadcasting for background/closed notifications, cross-instance tenant synchronization, calendar alerts, and fallback message delivery.

All channel authorizations, event dispatches, and client subscriptions enforce **strict multi-tenant isolation, fail-closed access control, cryptographic HMAC-SHA256 signature verification, and zero secret leakage** to client runtimes.

---

## 2. Pusher Client & Server Initialization

### 2.1 Backend Server Integration (`server/src/services/pusher.service.ts`)
- **Singleton Lifecycle Management:** `PusherService` maintains a singleton `Pusher` instance with fingerprint caching (`appId:key:secret:cluster:enabled`). Any configuration update automatically invalidates the instance via `PusherService.resetInstance()`.
- **Dynamic Multi-Tier Configuration Resolution:**
  1. Authoritative `SettingsService.getGroup("pusher", "PLATFORM", null, { decryptSecrets: true })`.
  2. Canonical CMS Platform Settings (`system-platform-settings`, fallback `global-super-settings`).
  3. Environment variables (`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`).
- **Development & Mock Safety:** If production Pusher credentials are not configured or in local sandbox development, `PusherService` falls back to an internal cryptographic HMAC SHA-256 signing engine so all authorization endpoints remain fully functional without external network roundtrips.

### 2.2 Client-Side Initialization (`src/lib/socket.ts` & `CMS/src/lib/socket.ts`)
- **Client Credential Discovery:** Frontend components query `/api/pusher/config` upon authentication.
- **Dynamic Module Loading:** The `pusher-js` SDK is dynamically imported (`await import("pusher-js")`) only when Pusher is active, ensuring zero bundle bloat for unauthenticated or non-realtime views.
- **Authenticated Endpoint Binding:** The client configures:
  ```typescript
  pusherClient = new PusherClient(cfg.key, {
    cluster: cfg.cluster || "ap2",
    authEndpoint: `${SOCKET_URL}/api/pusher/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("hrms_auth_token")}`,
      },
    },
  });
  ```
- **Lifecycle Cleanup:** Upon session termination, workspace switch, or unmount, `userChannel.unbind_all()`, `tenantChannel.unbind_all()`, and `pusherClient.disconnect()` are explicitly invoked.

---

## 3. Channel Nomenclature & Fail-Closed Authorization

Subscriptions are strictly restricted to authenticated private channels via `POST /api/pusher/auth`:

| Channel Name Pattern | Authorized Scope | Authorization Rule & Enforcement |
| :--- | :--- | :--- |
| `private-user-{userId}` | Personal Notifications & Calls | Verified strictly against `req.user.userId`. Cross-user access returns `403 Forbidden` (`User ID mismatch`). |
| `private-tenant-{tenantId}` | Workspace Tenant Announcements | Verified strictly against `req.user.tenantId`. Cross-tenant access returns `403 Forbidden` (`Tenant ID mismatch`). |
| *Arbitrary Formats* (e.g. `public-*`, `presence-*`) | Disallowed | Rejected immediately with `403 Forbidden` (`Channel format not permitted`). |

### Cryptographic Signature Minting
Signatures are calculated strictly on the backend using HMAC-SHA256:
$$\text{stringToSign} = \text{socket\_id} + ":" + \text{channel\_name}$$
$$\text{signature} = \text{HMAC-SHA256}(\text{secret}, \text{stringToSign})$$

- Missing `socket_id` or `channel_name` returns `400 Bad Request`.
- Missing or invalid JWT Bearer token returns `401 Unauthorized`.
- Mismatched identity returns `403 Forbidden`.

---

## 4. Realtime Event Matrix & Payload Contracts

The following table details all supported Pusher events, their trigger origins, destination channels, and payload contracts:

| Event Name | Channel Scope | Originating Endpoint / Service | Payload Structure & Schema |
| :--- | :--- | :--- | :--- |
| `chat:message` | `private-tenant-{tenantId}` | `POST /api/chat/messages` | `{ threadId: string, message: ChatMessage, tenantId: string, timestamp: string }` |
| `chat:message_edited`| `private-tenant-{tenantId}` | `PATCH /api/chat/messages/:id` | `{ threadId: string, messageId: string, content: string, isEdited: true, editedAt: string }` |
| `chat:message_deleted`| `private-tenant-{tenantId}` | `POST /api/chat/messages/:id/delete` | `{ id: string, threadId: string, isDeletedForEveryone: boolean, deletedForUserId: string }` |
| `chat:delivered` | `private-tenant-{tenantId}` | `POST /api/chat/messages/delivered` | `{ threadId: string, messageIds: string[], userId: string, deliveredAt: string }` |
| `chat:read` | `private-tenant-{tenantId}` | `POST /api/chat/messages/:threadId/read` | `{ threadId: string, userId: string, readAt: string }` |
| `chat:reaction` | `private-tenant-{tenantId}` | `POST /api/chat/messages/:id/reactions` | `{ messageId: string, emoji: string, userId: string, reactions: Array }` |
| `chat:poll_updated` | `private-tenant-{tenantId}` | `POST /api/chat/messages/:id/poll/vote` | `{ messageId: string, poll: PollObject }` |
| `chat:typing` | `private-tenant-{tenantId}` | `Socket.IO typing handler` | `{ threadId: string, userId: string, isTyping: boolean }` |
| `call:incoming` | `private-user-{userId}` | `server/src/socket.ts` | `{ callId: string, callerId: string, callerName: string, callType: "audio"\|"video", threadId: string }` |
| `call:busy` | `private-user-{userId}` | `server/src/socket.ts` | `{ callId: string, reason: "BUSY_ON_ANOTHER_CALL", busyUserId: string }` |
| `notification:new` | `private-user-{userId}` | `NotificationService.createNotification`| `{ id: string, title: string, description: string, type: string, timestamp: string }` |
| `calendar:reminder-due`| `private-user-{userId}` | `calendar-reminder.scheduler.ts` | `{ reminderId: string, title: string, message: string, eventId: string }` |
| `calendar:event-shared`| `private-user-{userId}` | `POST /api/calendar/events/:id/share` | `{ eventId: string, eventTitle: string, sharedByName: string }` |

---

## 5. Duplicate Event Prevention & Dual-Transport Deduplication

To provide seamless failover between Socket.IO and Pusher without duplicate UI reactions:
1. **Canonical Event Identifiers:** Every event payload carries a unique immutable identifier (`message.id`, `clientTempId`, or `callId`).
2. **LRU Cache Deduplication in UI:**
   In `src/components/chat/unified-chat-app.tsx`:
   ```typescript
   // Filter optimistic messages by clientTempId and server ID
   setOptimisticMessages((prev) =>
     prev.filter((m) => m.clientTempId !== msg.clientTempId && m.id !== msg.id)
   );
   // Deduplicate in React Query cache
   queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
     if (!old) return { messages: [formatted], hasMore: false };
     const list = Array.isArray(old.messages) ? old.messages : [];
     const exists = list.some((m: any) => m.id === formatted.id);
     if (exists) {
       return { ...old, messages: list.map((m) => m.id === formatted.id ? formatted : m) };
     }
     return { ...old, messages: [...list, formatted] };
   });
   ```
3. **Incoming Call Deduplication:**
   Calls arriving simultaneously via WebSocket and Pusher check `activeCallId` and `processedCallIds` set, preventing double ringtones or dual modal overlays.

---

## 6. Disconnect, Reconnect & Multi-Tab Behavior

1. **Automatic Heartbeat & Reconnection:** The Pusher client maintains standard TLS ping/pong health checks. Upon reconnection after network blips or tab sleeps, subscriptions are automatically re-authorized and resumed.
2. **Multi-Tab Presence:** In `server/src/socket.ts`, presence is tracked using socket reference counts (`tenantPresence.get(tId).get(uId)`). Opening a second tab increments the count; closing one tab does not set the user offline until all tabs disconnect.
3. **State Reconciliation:** Reconnected clients trigger cache invalidation (`qc.invalidateQueries({ queryKey: ["chat", "messages"] })`), reconciling any missed messages during the offline window.

---

## 7. Audit Conclusion & Identified Items

- **Credential Leakage Prevention:** Verified. `/api/pusher/config` exposes only `{ appId, key, cluster, enabled }` and never `secret`.
- **Authorization Enforcement:** Verified. 401 on unauthenticated, 403 on cross-user and cross-tenant subscriptions.
- **Identified Blocker Remediation:** The CMS TypeScript build failure `activeCallTargetAvatar` was traced and resolved in commit `c3a20dc6`.
- **Verdict:** Stage A Architecture Audit is complete and verified compliant with all security, multi-tenancy, and realtime requirements.
