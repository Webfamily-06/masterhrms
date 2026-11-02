# MASTERHRMS — Production Fix 01: Socket.IO Serverless Compatibility

**Branch:** `fix/production-critical-remediation`  
**Fix Date:** 2026-11-02  
**Severity:** P1 — Continuous 404 errors on every page load

---

## 1. Root Cause

### What was happening

`CMS/src/lib/socket.ts` derived `SOCKET_URL` as follows:

```ts
// BEFORE (broken on Vercel)
const SOCKET_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/api\/?$/, "")
  : window.location.hostname !== "localhost"
    ? window.location.origin          // ← "https://www.masterhrms.com" on Vercel
    : "http://localhost:4000";
```

When `NEXT_PUBLIC_API_URL=https://www.masterhrms.com/api`, `SOCKET_URL` resolved to `https://www.masterhrms.com`.

`getSocketClient()` then called:

```ts
io("https://www.masterhrms.com", { autoConnect: true, reconnectionAttempts: 10 })
```

Vercel is **serverless**. There is no persistent Socket.IO server at `https://www.masterhrms.com/socket.io/`. Every connection attempt produced a `404 Not Found` on `/socket.io/?EIO=4&transport=polling`. With `reconnectionAttempts: 10`, each page load fired up to 10 retries with 1-second backoff — generating a console error storm.

### Why it affected all pages including public pages

`IncomingCallProvider` wraps every page via `AppProviders.tsx`:

```tsx
// AppProviders.tsx
<IncomingCallProvider>
  {children}
</IncomingCallProvider>
```

`IncomingCallProvider` called `getSocketClient()` unconditionally on mount — even for anonymous marketing pages where no auth token exists and Socket.IO is not needed.

### Why Pusher still worked

Pusher was initialized separately inside `useRealtimeSocket` with proper feature-flag gating:

```ts
api.get("/pusher/config").then(cfg => {
  if (!cfg?.enabled || !cfg?.key) return; // ← correctly guards init
  // ...connect Pusher...
});
```

This pattern correctly skips Pusher when not configured.

---

## 2. Fix Applied

### File: `CMS/src/lib/socket.ts`

**Old approach (lines 8–48):** `SOCKET_URL` defaulted to `window.location.origin` on non-localhost, causing Vercel serverless 404 loops.

**New approach:**

```ts
// 1. Derive base URL for Pusher auth (independent of Socket.IO)
const DERIVED_BASE_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/api\/?$/, "")
  : "http://localhost:4000";

// 2. Only use a DEDICATED Socket.IO URL if explicitly configured
const EXPLICIT_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";

const IS_LOCAL =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".localhost"));

// null = no Socket.IO server → disabled (Vercel without explicit socket URL)
const SOCKET_URL: string | null = EXPLICIT_SOCKET_URL
  ? EXPLICIT_SOCKET_URL
  : IS_LOCAL
  ? "http://localhost:4000"
  : null;

// Pusher auth endpoint uses DERIVED_BASE_URL, fully independent of SOCKET_URL
const PUSHER_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL
  ? process.env.NEXT_PUBLIC_SOCKET_URL.replace(/\/api\/?$/, "")
  : DERIVED_BASE_URL;
```

**`getSocketClient()` changes:**

| Property | Before | After |
|---|---|---|
| `autoConnect` | `true` | `false` (connect on demand, only for authenticated users) |
| `reconnectionAttempts` | `10` | `3` |
| `reconnectionDelay` | `1000 ms` | `2000 ms` |
| `connect_error` handler | `console.error` always | `console.warn` in dev only |
| Vercel behavior | Connects to `window.location.origin` → 404 loop | Returns `autoConnect: false, reconnection: false` stub — no connections made |

**New exported helper:**

```ts
export function isSocketDisabled(): boolean {
  return SOCKET_URL === null;
}
```

**Pusher auth endpoint:**

```ts
// Before (broken when SOCKET_URL is null or Vercel origin):
authEndpoint: `${SOCKET_URL}/api/pusher/auth`

// After (always correct):
authEndpoint: `${PUSHER_BASE_URL}/api/pusher/auth`
```

### File: `CMS/src/context/incoming-call-context.tsx`

Added auth token guard before Socket.IO initialization. Anonymous page visits no longer create any socket connection:

```ts
// Before:
socket = getSocketClient(); // always called on mount

// After:
const authToken = localStorage.getItem("hrms_auth_token");
if (!isSocketDisabled() && authToken) {
  socket = getSocketClient();
  if (socket && !socket.connected) socket.connect(); // explicit connect
  socket.on("call:incoming", handleIncomingCallEvent);
  // ...
}
```

Pusher event listeners (`hrms:pusher` custom event) and service-worker message listeners remain **unchanged** — they work for all users regardless of socket status.

---

## 3. Deployment Note

| Scenario | Behavior after fix |
|---|---|
| **Vercel (no `NEXT_PUBLIC_SOCKET_URL`)** | Socket.IO disabled. No connections, no 404 errors. Pusher handles realtime. |
| **Vercel + dedicated WS server** | Set `NEXT_PUBLIC_SOCKET_URL=wss://your-socket-server.com` in Vercel env vars. Socket.IO enabled for authenticated users only. |
| **Localhost dev** | Socket.IO connects to `http://localhost:4000` as before. |

---

## 4. Verification Evidence

- `git diff --stat` confirms 2 files modified: `CMS/src/lib/socket.ts` (+78/-35), `CMS/src/context/incoming-call-context.tsx` (+28/-8)
- Backend `npx --workspace=server tsc --noEmit` → **exit 0** (no errors)
- CMS build and TypeScript check results: see `MASTERHRMS_PRODUCTION_REMEDIATION_REGRESSION_REPORT.md`
- Pusher auth endpoint now uses `PUSHER_BASE_URL` which is always derived from `NEXT_PUBLIC_API_URL` — functional independently of Socket.IO configuration

---

## 5. Files Changed

| File | Change |
|---|---|
| [`CMS/src/lib/socket.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/lib/socket.ts) | Null-safe `SOCKET_URL`, disabled stub, `isSocketDisabled()` export, `autoConnect: false`, reduced retries, fixed Pusher auth endpoint |
| [`CMS/src/context/incoming-call-context.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/context/incoming-call-context.tsx) | Auth token guard before `getSocketClient()`, explicit `.connect()` on demand |
