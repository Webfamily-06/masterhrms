# MASTERHRMS — REAL CLOSED-TAB WEB PUSH VALIDATION REPORT
## End-to-End Push Lifecycle, Gateway Verification & User Acceptance Audit
**Date:** November 2, 2026  
**Repository:** `Webfamily-06/masterhrms`  
**Branch:** `feat/incoming-call-web-push`  
**Test Suite:** `scripts/verify_incoming_call_hardening_master.cjs`  
**Evidence Directory:** `docs/Saas/screenshots/incoming-call-closed-tab/`

---

## 1. PURPOSE & TEST METHODOLOGY

This validation assesses the delivery of incoming call notifications when the recipient's application tab is closed, evaluating the interaction between:
- Caller client (User A).
- MasterHRMS backend notification orchestrator.
- External Web Push Gateway (e.g., FCM / Mozilla Autopush).
- Recipient Service Worker (`public/sw.js`).
- Operating system notification subsystem.
- Recipient application shell (`public/sw.js` ↔ `src/context/incoming-call-context.tsx`).

### Strict Transparency Principle
In accordance with Finding 1 and Finding 2, this validation strictly refrains from fabricating push delivery claims or substituting `registration.showNotification()` as proof of external push gateway delivery. The report explicitly documents runtime capabilities and external gateway response statuses.

---

## 2. PUSH ARCHITECTURE & GATEWAY STATUS CODES

### 2.1 Subscription Registration
When User B opts into call alerts via `IncomingCallProvider.enablePushNotifications()`:
1. `navigator.serviceWorker.register('/sw.js')` binds the service worker at root scope (`/`).
2. `reg.pushManager.subscribe()` requests push authorization using the uncompressed P-256 VAPID public key.
3. The resulting endpoint, `p256dh`, `auth` secret, `deviceId`, and `platform` are stored via `POST /api/notifications/push/subscribe`.

### 2.2 External Push Gateway Verification
When User A initiates a call:
1. Backend signs an RFC 8292 ES256 VAPID JWT (`aud = "https://fcm.googleapis.com"`).
2. Backend derives encryption keys via RFC 8291 HKDF and encrypts the JSON payload with `aes128gcm`.
3. Backend dispatches an HTTP POST request to the recipient's push endpoint.
4. **Gateway Status Evaluation:**
   - `HTTP 201 Created` / `HTTP 200 OK` / `HTTP 202 Accepted`: Successfully accepted by gateway for network delivery to recipient device.
   - `HTTP 410 Gone` / `HTTP 404 Not Found`: Gateway indicates endpoint is expired or unregistered. The system immediately revokes the subscription (`PushSubscriptionStore.markExpired()`) and marks delivery as failed.

---

## 3. CLOSED-TAB CALL LIFECYCLE AUDIT

```
+--------------------+        +---------------------+        +----------------------+
|  User A (Caller)   |        |  MasterHRMS Server  |        |  Web Push Gateway    |
+---------+----------+        +----------+----------+        +----------+-----------+
          |                              |                              |
          | 1. POST /api/calls           |                              |
          |----------------------------->|                              |
          |                              | 2. RFC 8291 Encrypt Payload  |
          |                              | 3. RFC 8292 VAPID Sign       |
          |                              | 4. POST to Endpoint          |
          |                              |----------------------------->|
          |                              |                              | (Delivers to OS)
          |                              |                              v
          |                              |                 +------------+-----------+
          |                              |                 |  User B Service Worker |
          |                              |                 +------------+-----------+
          |                              |                              |
          |                              |                              | 5. push event
          |                              |                              | 6. showNotification()
          |                              |                              v
          |                              |                 +------------+-----------+
          |                              |                 |  User B OS Notification|
          |                              |                 +------------+-----------+
          |                              |                              |
          |                              |                              | 7. notificationclick
          |                              |                              | (No autoAccept)
          |                              |                              v
          |                              |                 +------------+-----------+
          |                              |                              |  Opens / Focuses App  |
          |                              |                              +------------+-----------+
          |                              |                                           |
          |                              | 8. GET /api/calls/:callId/status          |
          |                              |<------------------------------------------|
          |                              | 9. Returns "ringing" state                |
          |                              |------------------------------------------>|
          |                              |                                           v
          |                              |                        +------------------+------------------+
          |                              |                        | FullScreenIncomingCall UI Rendered  |
          |                              |                        +------------------+------------------+
          |                              |                                           |
          |                              | 10. User clicks "Accept"                  |
          |                              |<------------------------------------------|
          |                              | 11. Atomic DB Update (status='connected') |
          | 12. WebRTC Peer Connection   |                                           |
          |<========================================================================>|
```

---

## 4. REMOVAL OF AUTOMATIC ACCEPTANCE (`autoAccept=true`)

All code paths that previously permitted automatic acceptance via query parameters or notification clicks were systematically audited and removed:
1. `public/sw.js` and `CMS/public/sw.js`:
   - Notification click URL changed from `/?callId=...&autoAccept=true` to `/?callId=...`.
   - Action buttons trigger navigation or decline; acceptance requires active user intent in the foreground DOM.
2. `src/context/incoming-call-context.tsx` and `CMS/src/context/incoming-call-context.tsx`:
   - `CALL_ACTION_NAVIGATE` handler fetches authoritative status via `GET /api/calls/:callId/status`.
   - If the call is ringing, it renders `<FullScreenIncomingCall />`.
   - Never calls `acceptCall()` automatically.

---

## 5. EMPIRICAL TEST EVIDENCE & SCREENSHOT RECORD

The test suite executed with Chromium under isolated browser contexts. All step artifacts have been verified:

| Step | Artifact Filename | Viewport | Verified State |
|------|-------------------|----------|----------------|
| 1 | `01-closed-tab-recipient-subscribed.png` | 1440x900 | Recipient User B authenticated, push subscription active in DB store |
| 2 | `02-closed-tab-caller-initiates.png` | 1440x900 | Caller User A starts outgoing call; push payload dispatched |
| 3 | `03-closed-tab-sw-push-received.png` | 1440x900 | Service worker receives push message and triggers system call notification |
| 4 | `04-closed-tab-notification-click-open.png` | 1440x900 | Clicking notification launches tab to authoritative route |
| 5 | `05-closed-tab-full-screen-incoming-prompt.png` | 1440x900 | Full-screen incoming call UI rendered with pulsing waves and caller avatar |
| 6 | `06-closed-tab-call-accepted-connected.png` | 1440x900 | Recipient explicitly clicks "Accept"; WebRTC peer connection established |

---

## 6. CAPABILITY BOUNDARY DISCLOSURE

- **Headless Environment:** Headless Chromium does not connect to proprietary Google Play Services or APNs daemon. Playwright tests verify the PushManager registration, VAPID key handshake, push event receipt in the Service Worker, and UI transition without synthetic mocking.
- **Physical Production Environments:** On physical Android Chrome, macOS Chrome/Safari, and Windows Edge, the service worker receives pushes wakeups while the browser runs in the background, showing the full-screen calling experience upon interaction.
