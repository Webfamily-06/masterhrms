# MasterHRMS Mobile — Realtime Events & Cache Verification Report

**Repository**: `Webfamily-06/masterhrms`  
**Execution Timestamp**: 2026-11-18  
**Scope**: Pusher Channels, Socket.IO fallbacks, React Query cache invalidation, and realtime event subscriptions.  

---

## 1. Executive Summary

Realtime communication in MasterHRMS is architected around **Pusher Channels** with graceful fallback to SSE and HTTP polling.

The mobile client manages:
1. **Tenant Broadcast Channel**: `private-tenant-${tenantId}`
2. **User Private Alert Channel**: `private-user-${userId}`
3. **Active Call Presence Channel**: `presence-call-${callId}`

Every incoming event immediately invalidates or updates the corresponding React Query cache, ensuring the mobile UI reflects updates in sub-second time without manual pull-to-refresh.

---

## 2. Event Subscription Matrix

| Event Name | Pusher Channel | Trigger Source | Mobile Action / Cache Invalidation |
|---|---|---|---|
| `message:created` | `private-tenant-${tenantId}` | Colleague sends chat message | Appends message to conversation; updates thread preview. |
| `message:reaction` | `private-tenant-${tenantId}` | Message emoji reaction | Mutates reaction count in active thread cache. |
| `call:ringing` | `private-user-${userId}` | Incoming voice / video call | Opens incoming ringing modal in `WorkspaceModuleShell.tsx`. |
| `call:accepted` | `presence-call-${callId}` | Callee accepts call | Transitions caller from `RINGING` -> `CONNECTED`. |
| `call:ended` | `presence-call-${callId}` | Peer hangs up call | Closes call screen and releases audio session. |
| `call:peer_muted` | `presence-call-${callId}` | Peer toggles microphone | Displays "Peer microphone is muted" banner. |
| `todo:created` | `private-tenant-${tenantId}` | New task assigned | Invalidates `['todos']` and `['todos', 'stats']` query keys. |
| `todo:updated` | `private-tenant-${tenantId}` | Status / priority change | Invalidates `['todos', id]` and Kanban board caches. |
| `calendar:event_created`| `private-tenant-${tenantId}` | New meeting scheduled | Invalidates `['calendar', 'events']` query key. |
| `attendance:punched` | `private-user-${userId}` | Successful punch in/out | Refetches `['dashboard', 'summary']` and attendance history. |
| `timesheet:submitted` | `private-tenant-${tenantId}` | Timesheet submitted | Invalidates `['timesheets']` query key. |
| `timesheet:approved` | `private-user-${userId}` | Timesheet approved by HR | Updates approval status badge in `TimesheetScreen.tsx`. |

---

## 3. Cache Invalidation & Tenant Scoping

To guarantee strict tenant isolation and avoid cross-tenant cache contamination:
- All React Query cache keys are generated using `createTenantQueryKey(['module', ...args])`.
- Example key: `['tenant:tenant_abc123', 'chat', 'threads']`.
- When switching active tenants in `WorkspaceModuleShell.tsx`, `queryClient.cancelQueries()` and `queryClient.clear()` are executed to purge all cached state belonging to the previous tenant.

---

## 4. Heartbeat & Connection Health

During connected 1:1 calls or multiparty group conferences:
1. A recurring timer fires every **5000ms**:
   `POST /api/calls/:callId/heartbeat`
2. If 3 consecutive heartbeats fail (15s of network loss), the UI displays a "Reconnecting..." notice.
3. If the server detects no heartbeat for 30s, the call is automatically transitioned to `ENDED` to prevent orphan call sessions on the server.
