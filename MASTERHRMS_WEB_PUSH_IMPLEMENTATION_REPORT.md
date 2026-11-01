# MASTERHRMS — WEB PUSH IMPLEMENTATION REPORT
## Pure Node.js RFC 8292 & RFC 8291 Implementation, Service Worker Push Architecture & Subscription Management

**Document ID:** `MH-WPR-2026-001`  
**Author:** Principal WebRTC & Systems Architect  
**Feature Branch:** `feat/incoming-call-web-push`  
**Classification:** Authoritative Technical Delivery Report  
**Date:** November 2026  

---

## 1. Executive Summary

This report documents the architectural design, algorithmic implementation, and empirical verification of the MasterHRMS Web Push notification system for incoming audio/video calls.

Prior to this remediation, call invitations (`call:invite`) were delivered exclusively through ephemeral in-app WebSocket channels (`call:incoming` via Socket.IO) and Pusher fallback. Because the Socket.IO listener was bound exclusively within `UnifiedChatApp`, incoming calls were silently dropped whenever the callee navigated away from `/chat` (e.g., to `/me/dashboard`, `/hr/payroll`, `/calendar`) or when the browser was closed or minimized.

To achieve carrier-grade call delivery without introducing fragile external npm dependencies in hardened serverless/sandboxed environments, we engineered a native, zero-dependency Node.js implementation of:
1. **RFC 8292 (VAPID):** Voluntary Application Server Identification for Web Push on NIST Curve P-256 (`prime256v1`) using pure `node:crypto`.
2. **RFC 8291 (Message Encryption):** AES-128-GCM payload encryption with HKDF key derivation context for push services.
3. **Multi-Tenant Subscription Store:** Authoritative subscription directory integrated with the MasterHRMS tenant isolation model.
4. **Service Worker Push & Action Handlers:** Complete PWA lifecycle in `public/sw.js` and `CMS/public/sw.js` with `requireInteraction: true`, repeating call vibration cadence, and notification action deep-linking.

---

## 2. Cryptographic Architecture & Standards Adherence

### 2.1 RFC 8292 — VAPID on NIST P-256

The VAPID protocol allows push services (such as Google FCM, Mozilla autopush, and Apple APNs Web Push) to authenticate that push messages originate from the legitimate application server without requiring third-party provider accounts or SDK bloat.

- **Curve:** NIST P-256 (`prime256v1` / `secp256r1`).
- **Public Key Encoding:** 65-byte uncompressed EC point starting with `0x04`, URL-safe base64 encoded.
- **Private Key Encoding:** 32-byte big-endian scalar, URL-safe base64 encoded.
- **JWT Header:**
  ```json
  { "typ": "JWT", "alg": "ES256" }
  ```
- **JWT Claims:**
  - `aud`: Origin of the push service endpoint (e.g., `https://fcm.googleapis.com`).
  - `exp`: Epoch expiration timestamp (default 24 hours, refreshed per request).
  - `sub`: Authoritative application mailto URI (`mailto:security@masterhrms.com`).
- **Signature:** IEEE P1363 (64-byte raw `r || s`) converted from ASN.1 DER ECDSA signatures produced by `node:crypto.createSign("SHA256")`.

### 2.2 RFC 8291 — Web Push Message Encryption (`aes128gcm`)

Every Web Push notification payload must be encrypted end-to-end between the application server and the recipient's browser. The push service cannot read or tamper with the payload:

```
+-------------------------------------------------------------------+
|  1. Generate Server Ephemeral Keypair (P-256 ECDH)                |
|  2. SharedSecret = ECDH(ServerPrivKey, UserPubKey)                |
|  3. PRK = HKDF-Extract(UserAuthSecret, SharedSecret, "WebPush...")|
|  4. CEK (16 bytes) = HKDF-Expand(PRK, Salt, "aes128gcm", 16)      |
|  5. Nonce (12 bytes) = HKDF-Expand(PRK, Salt, "nonce", 12)       |
|  6. Ciphertext = AES-128-GCM-Encrypt(CEK, Nonce, Plaintext || 02) |
+-------------------------------------------------------------------+
| Envelope: Salt (16B) || rs (4B=4096) || idlen (1B) || Key (65B)   |
|           || Ciphertext || AuthTag (16B)                          |
+-------------------------------------------------------------------+
```

- **Encryption Algorithm:** `aes-128-gcm`
- **Plaintext Delimiter:** `0x02` (RFC 8291 Section 2 padding indicator)
- **Zero-Dependency Guarantee:** Built entirely on Node.js built-ins (`crypto.createECDH`, `crypto.hkdfSync`, `crypto.createCipheriv`).

---

## 3. Implementation Inventory

### 3.1 Backend Components

| File | Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| `server/src/services/vapid.service.ts` | VAPID & Web Push Cryptography | Keypair generation, VAPID JWT creation, RFC 8291 encryption, HTTP/2 push dispatch |
| `server/src/services/push-subscription.store.ts` | Multi-Tenant Subscription Storage | Tenant-isolated user subscription persistence, LRU in-memory cache, stale subscription pruning |
| `server/src/services/incoming-call-push.service.ts` | Incoming Call Push Dispatcher | High-urgency push dispatch, TTL (45s) enforcement, collapse topic (`call_${callId}`), cancellation notifications |
| `server/src/routes/push.routes.ts` | Web Push REST Endpoints | `/api/notifications/push/status`, `/subscribe`, `/unsubscribe`, `/test` |
| `server/src/routes/call.routes.ts` | Call Session State & Fallback Endpoints | `/api/calls/:callId/status`, `/accept`, `/reject`, `/cancel` |
| `server/src/socket.ts` | Realtime Socket Wiring | Emits Web Push on `call:invite`, emits cancellation pushes on `call:timeout`, `call:reject`, `call:cancel`, `call:accept` |

### 3.2 Service Worker Components

| File | Scope | Handlers Implemented |
| :--- | :--- | :--- |
| `public/sw.js` | SaaS Web App (`/`) | `push` (CALL_INCOMING, CALL_CANCELLED), `notificationclick` (accept, reject, navigate), `notificationclose` |
| `CMS/public/sw.js` | CMS / Marketing Portal (`/`) | Full parity with SaaS service worker push and notification click handling |

### 3.3 Frontend Global Components

| File | Component | Functionality |
| :--- | :--- | :--- |
| `src/context/incoming-call-context.tsx` | `IncomingCallProvider` | Global incoming call listener (Socket.IO + Pusher + Service Worker `postMessage`), Web Audio API ringtone synthesizer, push subscription registration |
| `src/components/calling/full-screen-incoming-call.tsx` | `FullScreenIncomingCall` | Accessible full-screen overlay dialog (`z-[99999]`), radiating sound waves, caller avatar, Accept (`Enter`) / Decline (`Escape`) buttons |
| `src/routes/__root.tsx` | Root Route Provider | Mounts `IncomingCallProvider` and `<FullScreenIncomingCall />` globally across all application pages |
| `src/components/chat/unified-chat-app.tsx` | Unified Chat & Calling UI | Integrates global call accepted event, checks query params (`?callId=...&autoAccept=true`), renders desktop push notification enablement banner |

---

## 4. Verification Evidence

### 4.1 Automated Unit & Integration Test Results

Test Suite: `server/src/tests/incoming-call-push.test.ts`

```
================================================================================
🧪 RUNNING COMPREHENSIVE VERIFICATION: WEB PUSH NOTIFICATIONS & INCOMING CALLS
================================================================================

👉 SUITE 1: VAPID Key Generation & Identity Specification
   ✅ VAPID ECDSA P-256 keypair validated (RFC 8292 uncompressed point)

👉 SUITE 2: RFC 8292 VAPID Authorization Token
   ✅ VAPID JWT generation & ES256 signature verification passed

👉 SUITE 3: RFC 8291 Payload Encryption (aes128gcm & HKDF Key Derivation)
   ✅ RFC 8291 encryption and round-trip decryption validated

👉 SUITE 4: Multi-Tenant Push Subscription Persistence & Scope Isolation
   ✅ Multi-tenant push subscription isolation and management verified

👉 SUITE 5: Incoming Call Push Service & Dismissal Lifecycle
   ✅ Incoming call high-urgency push & cancellation dispatch verified

👉 SUITE 6: Active Call Session State & Cancellation Guardrails
   ✅ Authoritative call session lifecycle verified

================================================================================
🎉 ALL 6/6 SUITES PASSED — 26 ASSERTIONS VERIFIED
================================================================================
```

### 4.2 Playwright Browser E2E Results

Test Suite: `scripts/verify_incoming_call_push_playwright.cjs`

```
================================================================================
🚀 STARTING PLAYWRIGHT BROWSER SUITE: WEB PUSH & FULL-SCREEN INCOMING CALLS
================================================================================

👉 TEST 1: Foreground Full-Screen Incoming Audio Call on /me/dashboard
   ✅ Full-screen overlay visible on /me/dashboard
   ✅ Caller Name displayed: "Alice Architect"
   ✅ 'Incoming Audio Call' badge displayed
   ✅ Accept & Decline action buttons present
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/01-foreground-incoming-audio-call.png

👉 TEST 2: Full-Screen Incoming Video Call Variant
   ✅ 'Incoming Video Call' badge displayed with Video icon
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/02-foreground-incoming-video-call.png

👉 TEST 3: Decline Call Action (Closes Overlay & Restores Dashboard)
   ✅ Full-screen incoming call overlay cleanly dismissed after decline
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/04-declined-call-dismissed.png

👉 TEST 4: Accept Call Action Flow
   ✅ Clicked Accept button
   ✅ Successfully navigated to: http://localhost:3000/chat?callId=...&autoAccept=true
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/03-accepted-call-connected.png

👉 TEST 5: Desktop Push Enablement Banner in Chat View
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/05-desktop-push-banner-prompt.png

👉 TEST 6: Service Worker Push Notification Engine & Click Handler
   ✅ Service Worker Push Notification Simulation: {
     success: true,
     notificationCount: 1,
     title: 'Incoming Video Call',
     tag: 'call_call_sw_...',
     requireInteraction: true,
     actionsCount: 2
   }
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/06-service-worker-push-simulation.png

👉 TEST 7: Notification Click Deep-Link Simulation
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/07-notification-click-navigation.png

👉 TEST 8: Caller Cancelled Web Push & Overlay Dismissal
   ✅ Call overlay visible for cancellation test
   ✅ Call overlay dismissed automatically on caller cancellation
   📸 Saved screenshot: docs/Saas/screenshots/incoming-call-web-push/08-caller-cancelled-push-dismissal.png

================================================================================
🎉 ALL PLAYWRIGHT BROWSER VERIFICATIONS PASSED WITH COMPLETE SCREENSHOT EVIDENCE!
================================================================================
```

---

## 5. Security & Isolation Safeguards

1. **Zero Secret Leakage:** No VAPID private keys or Web Push auth secrets are emitted in logs, reports, or frontend bundles. The client receives solely the VAPID public key.
2. **Multi-Tenant Protection:** Subscriptions are strictly isolated by `tenantId` and `userId`. A user in Tenant A cannot be contacted through subscriptions registered in Tenant B.
3. **Endpoint Revocation on 410 Gone:** When a browser revokes notification permission, push services return HTTP 410 Gone. The `PushSubscriptionStore` automatically flags the record as expired, preventing wasted network calls.
4. **Authoritative Server Timeouts:** A hard 60-second timer on the server cancels ringing calls, guaranteeing that orphaned ringing sessions cannot persist.

