# MasterHRMS Mobile App — Push Notification Verification Report

**Date:** November 18, 2026  
**Subproject:** `mobile-app/src/core/services/pushNotificationService.ts`  
**Backend Comparison:** `server/src/routes/push.routes.ts`

---

## 1. Problem Diagnosis

In previous revisions, `PushNotificationService` had two critical defects:
1. **Calling Non-Existent API Endpoint:** It attempted to register native push tokens by calling `POST /api/push/register`, which returned HTTP `404 Not Found` because the Express backend does not have `/api/push/register`.
2. **Injecting Dummy VAPID Keys:** It called `POST /api/push/subscribe` and passed hardcoded dummy strings:
   ```ts
   keys: {
     p256dh: 'mobile-app-fcm-native',
     auth: 'mobile-app-token',
   }
   ```
   The backend's push router exclusively implements the W3C Web Push Protocol via the `web-push` NPM library using elliptic-curve crypto (`P-256`). When a web notification is triggered, passing `'mobile-app-fcm-native'` caused `web-push` crypto routines to throw fatal decryption errors on the server.

---

## 2. Remediation Strategy

Since the user rule strictly enforces **ZERO BACKEND CHANGES**, the mobile application must:
1. **Never send fake VAPID tokens** or attempt to trick Web Push libraries into handling native APNs/FCM tokens.
2. **Never call 404 endpoints** (`/api/push/register`).
3. **Truthfully record and expose push capability status:**
   - On physical devices where an Expo push token is obtained, the service records status `'unsupported_backend'` and logs:
     `"Native device push token obtained successfully. Express backend requires native FCM/APNs registration endpoint; current server push pipeline only supports Web Push VAPID subscriptions."`
4. **Preserve working client-side push infrastructure:**
   - Foreground notification handlers (`Notifications.setNotificationHandler`) remain fully functional.
   - Android notification channels (`masterhrms-alerts`, `masterhrms-chat`, `masterhrms-calls`) are properly initialized with high importance, vibration patterns, and custom light colors.
   - Notification response listeners and received listeners continue to handle incoming payload routing without crashing.

---

## 3. Code Modifications Applied

In `mobile-app/src/core/services/pushNotificationService.ts`:
- Defined `PushCapabilityStatus` interface:
  ```ts
  export interface PushCapabilityStatus {
    isPhysicalDevice: boolean;
    permissionGranted: boolean;
    pushToken: string | null;
    tokenType: 'expo' | 'fcm' | 'apns' | 'none';
    serverRegistrationStatus: 'unsupported_backend' | 'registered' | 'failed' | 'not_attempted' | 'not_registered';
    statusReason: string;
  }
  ```
- Removed `POST /api/push/register` invocation.
- Removed dummy `p256dh: 'mobile-app-fcm-native'` object payload.
- Added `getCapabilityStatus()` method for runtime inspection by debugging panels and health checks.

---

## 4. Empirical Verification

- Unit test in `mobile-app/__tests__/services_and_integration.test.ts` verified that `PushNotificationService.getCapabilityStatus()` returns:
  ```json
  {
    "isPhysicalDevice": false,
    "permissionGranted": false,
    "pushToken": null,
    "serverRegistrationStatus": "not_attempted",
    "statusReason": "Push registration not yet initialized",
    "tokenType": "none"
  }
  ```
- Zero unhandled network promise rejections or 404 logs are emitted.
- All 7 Jest test suites pass cleanly.
