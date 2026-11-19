# MASTERHRMS — NATIVE BACKGROUND REMOTE PUSH NOTIFICATION BLOCKER REPORT

## 1. Executive Summary

This report documents the architectural gap between the MasterHRMS backend push infrastructure and native iOS/Android background remote push notifications.

- **Current Mobile State**: Ready for native push tokens (Expo push tokens, Firebase Cloud Messaging FCM tokens, Apple Push Notification service APNs tokens). Local foreground notifications are 100% operational.
- **Current Backend State**: Exclusively configured for Web Push VAPID subscriptions (`web-push` library with P-256 elliptic keys).
- **Core Blocker**: The Express backend contains **no endpoint** to register native device tokens and **no background sender service** (Firebase Admin SDK or APNs provider) to dispatch remote payloads to killed or backgrounded mobile devices.

---

## 2. Technical Root Cause Analysis

### Backend Endpoint Inventory
Inspection of `server/src/routes/` and controllers reveals:
- `/api/notifications/push/vapid-public-key` (Returns VAPID public key for browser push)
- `/api/notifications/push/subscribe` (Accepts browser subscription object `{ endpoint, keys: { p256dh, auth } }`)
- `/api/notifications/push/unsubscribe`

There are **zero native registration endpoints**:
- ❌ `/api/push/register` does not exist.
- ❌ `/api/notifications/register` does not exist.
- ❌ `/api/push/token` does not exist.

### Database Schema Constraint
The Prisma database schema contains `PushSubscription` storing browser VAPID credentials:
- `endpoint: String`
- `p256dh: String`
- `auth: String`

Native mobile device tokens (FCM tokens: 152+ character alphanumeric strings; APNs tokens: 64-hex strings; or Expo tokens: `ExponentPushToken[...]`) cannot be sent to the `web-push` NPM package without throwing invalid P-256 key exceptions.

---

## 3. Strict Compliance Policy

Per MasterHRMS Enterprise Security and Architecture rules:
1. **Zero Fake Functionality**: The mobile application does **not** manufacture dummy VAPID keys to trick the web push endpoint.
2. **Zero Fake Endpoints**: The mobile application does **not** call non-existent `/api/push/register` routes.
3. **Honest Capability Reporting**: `PushNotificationService.getCapabilityStatus()` transparently returns:
   - `serverRegistrationStatus: 'unsupported_backend'`
   - `statusReason`: `'Native device push token obtained successfully. Express backend requires native FCM/APNs registration endpoint; current server push pipeline only supports Web Push VAPID subscriptions.'`

---

## 4. Backend Remediation Roadmap (Out of Scope for Mobile-Only Task)

To enable native background push notifications when the mobile app is closed or in the background:
1. **Prisma Schema Update**:
   Add a `DeviceToken` table:
   ```prisma
   model DevicePushToken {
     id        String   @id @default(uuid())
     userId    String
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     token     String   @unique
     platform  String   // 'android' | 'ios'
     tokenType String   // 'fcm' | 'apns' | 'expo'
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```
2. **Backend Endpoints**:
   Implement `POST /api/push/device-token` and `DELETE /api/push/device-token`.
3. **Dispatch Pipeline**:
   Integrate `firebase-admin` (FCM) or Expo Server SDK (`expo-server-sdk-node`) in `server/src/services/notificationService.ts` to dispatch messages to both Web Push and Native Device tokens concurrently.
