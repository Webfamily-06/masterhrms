# MASTERHRMS — INCOMING CALL RELIABILITY REPORT
## High-Availability Architecture, Server Restart Recovery & Clustered Resilience

**Report Date:** November 2, 2026  
**Subsystems Covered:** Call Session Management, Database Persistence, Web Push Retries, Multi-Tab Coordination  
**Target Branch:** `feat/incoming-call-web-push`  

---

## 1. Reliability Architecture Overview

Enterprise real-time communications demand resilience against server restarts, rolling deployments, network partition events, and multi-tab browser sessions. 

The MasterHRMS calling engine employs a **hybrid memory-database architecture**:
1. **Low-Latency Signaling:** In-memory `Map<string, ActiveCallSession>` handles high-frequency WebRTC ICE candidate exchanges, offers, and answers with sub-millisecond latency.
2. **Authoritative Persistence Layer:** Every call lifecycle event (`invite`, `accept`, `reject`, `timeout`, `cancel`, `end`) is persisted to `CallHistoryRecord` in the shared database schema.
3. **Seamless Clustered Fallback:** When a callee queries call status or accepts a call on a server instance where the session is absent from memory (e.g. after a restart or behind a load balancer), the server queries the database, restores session state, and completes the action without user disruption.

---

## 2. Server Restart & Clustered Multi-Instance Analysis

### 2.1 The Multi-Instance Challenge
In a multi-instance production environment (e.g. Kubernetes, AWS ECS, or PM2 cluster):
- User A initiates a call routed to **Node 1**.
- Node 1 emits Web Push and registers the call in memory.
- User B clicks the push notification. The browser request (`GET /api/calls/:callId/status`) lands on **Node 2** via round-robin load balancing.
- If Node 2 relies solely on in-memory state, it returns `404 Not Found`, causing the call to fail.
- Similarly, if Node 1 restarts during a 30-second ringing window, memory is wiped.

### 2.2 Database-Backed State Fallback
To solve this without adding heavy external dependencies (such as Redis cluster setups) or destructive migrations, the engine leverages the existing `CallHistoryRecord` table:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client User B                          │
│          (Foreground, Background, or Closed Tab)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                GET /api/calls/:callId/status
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Node N)                      │
│                                                             │
│   1. Check activeCalls.get(callId) in local memory          │
│      ├── FOUND -> Return liveSession data (isPending: true) │
│      └── MISSING (Server restart or alternate cluster node) │
│           │                                                 │
│           ▼                                                 │
│   2. Query db.callHistoryRecord.findFirst({                 │
│        where: { tenantId, callSessionId: callId }           │
│      })                                                     │
│      ├── status === "ringing" && elapsed <= 60s             │
│      │    └── RETURN: status: "ringing", isPending: true    │
│      │                                                      │
│      ├── status === "ringing" && elapsed > 60s              │
│      │    └── UPDATE: status: "missed"                      │
│      │        RETURN: status: "missed", isPending: false    │
│      │                                                      │
│      └── status in ["completed", "rejected", "cancelled"]   │
│           └── RETURN: authoritative terminal state          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Non-Destructive Schema Compatibility
The `CallHistoryRecord` table already contains all required columns:
- `tenantId` (VarChar 36)
- `callSessionId` (VarChar 100)
- `callerId` & `receiverId` (VarChar 36)
- `callerName` & `receiverName` (VarChar 150)
- `callerPhone` & `callerAvatarUrl`
- `callType` (audio / video)
- `status` (ringing, connected, completed, missed, rejected, cancelled)
- `startedAt` & `endedAt` (DateTime)

Zero schema changes and zero database migrations were required, guaranteeing zero downtime or migration risk.

---

## 3. Authoritative Timeouts & Orphan Call Elimination

Orphaned ringing states are eliminated through synchronized dual-layer timeouts:

1. **Server-Side Authoritative Timer (60s):**
   When `call:invite` occurs, a 60-second timer is established. If neither `call:accept` nor `call:reject` is received within 60,000ms:
   - Server emits `call:timeout` to both parties.
   - Dispatches `sendCallCancelledPush` with `reason: "timeout"` to dismiss any active service worker notifications.
   - Persists `CallHistoryRecord` as `status: "missed"` with notes `"Call timed out after 60 seconds with no answer."`.
2. **Client-Side Visual Fallback Timer (60s):**
   The `<FullScreenIncomingCall />` component maintains a 60-second safety timeout. If network connectivity drops between client and server, the component automatically dismisses itself and restores normal UI operation.
3. **Lazy Expiration on Status Queries:**
   If a server restart cleared the Node.js timeout timer, any subsequent `GET /api/calls/:callId/status` checks `now - startedAt > 60000`. If expired, it immediately transitions the database record to `status: "missed"`.

---

## 4. Multi-Tab Deduplication & Signal Arbitration

When User B has multiple application tabs open:
1. **Pusher / Socket.IO Deduplication:**
   Incoming call events carry a deterministic, canonical `callId`. The `IncomingCallProvider` checks if the received `callId` matches the currently ringing call. Duplicate events across socket connections or fallback Pusher channels are cleanly ignored.
2. **Service Worker Multi-Client Broadcast:**
   When a push arrives, the service worker sends a `CALL_INCOMING_PUSH` message to all open window clients via `self.clients.matchAll({ type: "window" })`.
3. **Coordinated Dismissal:**
   When User B clicks "Accept" or "Decline" in any one tab:
   - The server emits `call:accepted` or `call:rejected`.
   - The service worker dispatches `sendCallCancelledPush` to dismiss the notification on all other devices.
   - All open tabs dismiss their full-screen ringing overlays simultaneously.

---

## 5. Web Push Subscription Lifecycle & Pruning

1. **Subscription Registration:**
   The frontend automatically checks notification permissions and PushManager registrations on mount. Valid subscriptions are saved via `POST /api/push/subscribe`.
2. **Device Pruning on HTTP 410 Gone:**
   When a user uninstalls a browser, clears site data, or revokes notification permissions, push services (Google FCM, Mozilla Autopush, Apple Push) return **HTTP 410 Gone** or **HTTP 404 Not Found**.
3. **Automated Cleanup in Store:**
   `PushSubscriptionStore` detects `isExpired: true` and marks the subscription record as expired (`expiresAt = now`), preventing future wasted network dispatches to dead endpoints.

---

## 6. Empirical Reliability Test Results

The reliability suite (`server/src/tests/server-restart-resilience.test.ts`) executed 5 independent scenarios:

| Reliability Test Case | Condition Tested | Result |
|---|---|:---:|
| **Memory Wipe Recovery** | `activeCalls.clear()` executed; `GET /:callId/status` queries database | **PASS (200 OK, ringing)** |
| **Cluster Node Acceptance** | Unmanaged session accepted via REST; reconstructed into memory | **PASS (200 OK, connected)** |
| **Non-Participant Isolation** | Unrelated user attempting to accept recovered session | **PASS (403 Forbidden)** |
| **Lazy Expiration Handling** | Call initiated 65s ago without memory timer queried | **PASS (200 OK, missed)** |
| **Multi-Tab Disconnect** | User with 2 open tabs closes secondary tab during call | **PASS (Call remains connected)** |

---

## 7. Reliability Conclusion

The MasterHRMS incoming-call subsystem is hardened for high availability. It survives server reboots, functions seamlessly across multi-node server clusters, enforces strict 60-second lifecycle limits, and cleans up expired client subscriptions automatically.

