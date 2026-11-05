# MASTERHRMS — PUSH NOTIFICATION ARCHITECTURE AUDIT & ROOT-CAUSE ANALYSIS

## Executive Summary
This audit inspects the complete end-to-end push notification pipeline across MASTERHRMS (backend Express server, TanStack frontend, CMS Next.js workspace, and root service worker).

---

## 1. Selected Architecture: Standard Web Push (VAPID + Service Worker)

Following exhaustive codebase inspection:
- **Firebase Cloud Messaging (FCM)**: `src/lib/firebase.ts` and `CMS/src/lib/firebase.ts` contain stub configuration helpers. However, zero Firebase API credentials or FCM private service account keys exist in any `.env` file.
- **VAPID Web Push**: `server/src/services/vapid.service.ts` contains a fully functional, self-contained RFC 8291 / RFC 8292 cryptographic engine implemented using native Node.js `crypto` (P-256 curve ECDH, HKDF-SHA256, and AES-128-GCM).
- **Service Worker**: `public/sw.js` and `CMS/public/sw.js` implement standard W3C Push API listeners (`self.addEventListener("push", ...)`) and notification click handlers.
- **Subscription Store**: `server/src/services/push-subscription.store.ts` manages device-level Web Push subscriptions (`{ endpoint, keys: { p256dh, auth } }`) with user and tenant isolation.
- **Conclusion**: **MASTERHRMS natively uses Standard Web Push using VAPID and a root-scoped Service Worker (Architecture B).**

---

## 2. Inventory of Existing Notification & Push Components

| Component | File Path | Responsibilities & Current State |
| :--- | :--- | :--- |
| **VAPID Engine** | `server/src/services/vapid.service.ts` | Generates P-256 keypairs, signs ES256 VAPID JWTs, performs RFC 8291 payload encryption, and dispatches HTTP requests to push endpoints (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`). **Status: Cryptographically verified and operational.** |
| **Subscription Store** | `server/src/services/push-subscription.store.ts` | Manages device subscriptions, tenant scoping, database persistence (`Setting` table with `USER` scope), and device revocation. **Status: Functional.** |
| **Push API Routes** | `server/src/routes/push.routes.ts` | Exposes `/status`, `/subscribe`, `/unsubscribe`, and `/test` mounted at `/api/notifications/push`. **Status: Mounted and active.** |
| **Notification Service** | `server/src/services/notification.service.ts` | Creates notification DB records and dispatches to Socket.IO and Pusher. **CRITICAL DEFECT: Never invoked `VapidService.sendNotification()` for general alerts.** |
| **Incoming Call Push** | `server/src/services/incoming-call-push.service.ts` | Dispatches high-urgency Web Push notifications for incoming audio/video calls. **Status: Implemented.** |
| **Service Worker** | `public/sw.js` & `CMS/public/sw.js` | Listens for `push` events, invokes `showNotification()`, handles `notificationclick`. **CRITICAL DEFECT: Action URL routing defaulted to `/chat?callId=` for general notifications.** |
| **Frontend Socket Listener** | `src/lib/socket.ts` & `CMS/src/lib/socket.ts` | Receives `notification:new`, updates in-app drawer, triggers Sonner toast. **CRITICAL DEFECT: Only displayed in-DOM toast. If tab was unfocused or in another window, zero OS notification was shown.** |
| **Device Registration** | `src/context/incoming-call-context.tsx` | Contained `enablePushNotifications()` callback, but was never triggered automatically upon login or route hydration. |

---

## 3. Root Cause Analysis of Reported Failure Modes

### Failure 1: No Notifications Outside Active MASTERHRMS Tab (Background / Closed Tab)
- **Root Cause**: In `server/src/services/notification.service.ts`, `NotificationService.createNotification()` inserted a database record and emitted to Socket.IO and Pusher rooms. It completely omitted Web Push dispatch!
- **Impact**: When the user navigated away, closed the tab, or closed the browser, Socket.IO and Pusher connections terminated. The backend never pushed to the browser's registered push subscription.

### Failure 2: No Notifications When Active in Another Chrome Tab or Window
- **Root Cause**: In `src/lib/socket.ts`, the `onNotification()` handler only invoked Sonner `toast(title, { description })`.
- **Impact**: In-DOM toasts render inside the tab's viewport. If the tab is hidden or backgrounded (`document.visibilityState === "hidden"`), the toast is invisible to the user. No desktop/OS notification was emitted via `self.registration.showNotification()` or the Web Notification API.

### Failure 3: Automatic Device Registration Not Triggered
- **Root Cause**: `enablePushNotifications()` existed in `IncomingCallProvider`, but was only exposed as a context function. It did not automatically subscribe existing authenticated sessions when `Notification.permission === "granted"`.
- **Impact**: Even if the user permitted notifications during login, their subscription endpoint was never registered with the backend.

### Failure 4: Notification Click Misdirection in Service Worker
- **Root Cause**: Line 278 of `sw.js` computed `targetPath = (data.actionUrl || `/chat?callId=${encodeURIComponent(callId || "")}`)`.
- **Impact**: General alerts (e.g. Leave Approval, Payroll slip, Calendar event) with `linkTo: "/hr/leave-requests"` defaulted to `/chat?callId=` instead of navigating to the intended target URL.

---

## 4. Planned Engineering Rectification (Phases 1–9)
1. **Device Registration Hook & Lifecycle**:
   - Create unified `usePushRegistration` hook that verifies permission, registers `/sw.js`, obtains `PushSubscription` with VAPID key, and synchronizes with `/api/notifications/push/subscribe`.
2. **Backend Notification Service Web Push Integration**:
   - Extend `NotificationService.createNotification()` to automatically dispatch RFC 8291 Web Push via `VapidService` to all active subscriptions of the recipient user.
3. **Foreground / Background Deduplication**:
   - If the tab is visible and focused (`document.visibilityState === "visible"`), display in-app toast and update drawer.
   - If the tab is backgrounded (`document.visibilityState === "hidden"`), trigger OS desktop notification.
   - In the Service Worker, query `self.clients.matchAll()` to avoid duplicate OS alerts if a focused window is already active.
4. **Service Worker Click Router**:
   - Update `sw.js` to correctly resolve `data.linkTo`, `data.actionUrl`, or `data.url`, handling role-aware routes (`/hr/*`, `/me/*`, `/tenant/*`, `/super/*`).
5. **Real-Browser Playwright & Diagnostics Suite**:
   - Implement diagnostic test endpoint and automated Playwright tests verifying background push, multi-device registration, and OS notification states.

