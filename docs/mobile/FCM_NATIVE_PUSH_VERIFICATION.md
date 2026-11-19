# MasterHRMS Native Push Notification (FCM / APNs) Implementation & Real-Device Verification Guide

## Executive Summary

MasterHRMS previously only supported Web Push VAPID subscriptions (`/api/notifications/push/subscribe` requiring browser P-256 keys `p256dh` and `auth`). Native mobile device tokens (`ExponentPushToken[...]` or native Android FCM tokens) had no backend registration endpoint or dispatch pathway.

This milestone establishes end-to-end native mobile push notification support for the MasterHRMS ecosystem:
1. **Zero-Migration Database Storage**: Persists device tokens with multi-tenant isolation via Prisma's `Setting` table (`scope: 'USER'`, `group: 'native_push'`).
2. **Unified High-Reliability Dispatcher**: Dispatches native notifications via Expo Push Gateway (`https://exp.host/--/api/v2/push/send`) or direct FCM (`https://fcm.googleapis.com/fcm/send`) with automatic ticket parsing and dead-token expiration handling.
3. **Concurrent Notification Pipeline**: `NotificationService` dispatches simultaneously to Web Push subscriptions and Native Mobile devices in non-blocking background tasks.
4. **Mobile Client Lifecycle Management**: Seamless token acquisition on physical devices, automatic backend registration, foreground tray presentation, and token revocation on logout.

---

## 1. Architectural Overview

```
                                  ┌─────────────────────────────┐
                                  │      MasterHRMS Server      │
                                  └──────────────┬──────────────┘
                                                 │
                                 NotificationService.notify()
                                                 │
                      ┌──────────────────────────┴──────────────────────────┐
                      ▼                                                     ▼
           dispatchWebPush()                                     dispatchNativePush()
                      │                                                     │
           Web Push (VAPID / RFC 8291)                            NativePushDispatcher
                      │                                                     │
         ┌────────────┴────────────┐                     ┌──────────────────┴──────────────────┐
         ▼                         ▼                     ▼                                     ▼
     Web Browsers           PWA Clients            Expo Push API                         Direct FCM API
(Chrome/Edge/Firefox)   (Service Workers)   (https://exp.host/.../send)           (https://fcm.googleapis.com)
                                                         │                                     │
                                                         ▼                                     ▼
                                              APNs (Apple) / FCM (Google)             Android Native Devices
                                                         │
                                                         ▼
                                            Physical iOS & Android Devices
```

---

## 2. Backend Infrastructure Implementation

### 2.1 Storage Layer (`server/src/services/native-push.store.ts`)
- **Model**: Prisma `Setting` with `scope: "USER"`, `scopeId: userId`, `group: "native_push"`, `key: "native_push_${tokenHash}"`.
- **Zero Schema Migrations**: Avoids database downtime or breaking changes.
- **In-Memory Cache**: Fast in-memory map (`inMemoryDeviceTokens`) with periodic 2-second database reconciliation on warm serverless instances.
- **Device Deduplication & Rotation**: Replacing an existing device's push token automatically purges old tokens for that `deviceId` across both in-memory cache and PostgreSQL.
- **Tenant Isolation**: Active device retrieval strictly asserts `tenantId === currentTenantId`.

### 2.2 Dispatcher Service (`server/src/services/native-push-dispatcher.service.ts`)
- Automatically inspects token format:
  - `ExponentPushToken[...]`: Routes through Expo Push Service with chunked batching (up to 100 messages per request).
  - Alphanumeric (152+ characters): Routes directly through Google FCM (`https://fcm.googleapis.com/fcm/send`).
- Handles response tickets and errors:
  - When Expo returns `DeviceNotRegistered` or FCM returns `NotRegistered` / `InvalidRegistration`, the token is immediately marked expired in `NativePushStore` to prevent wasted future dispatches.
- Configures high-priority Android channels (`masterhrms_default_channel`), sound, badges, and arbitrary routing metadata in `data`.

### 2.3 Notification Pipeline Integration (`server/src/services/notification.service.ts`)
- `NotificationService.send()` invokes:
  ```ts
  trackBackgroundTask(
    Promise.allSettled([
      this.dispatchWebPush(tenantId, recipientId, payload),
      this.dispatchNativePush(tenantId, recipientId, payload),
    ])
  );
  ```
- Guaranteed non-blocking background execution safe for long-running and serverless deployments.

### 2.4 Dedicated REST Endpoints (`server/src/routes/push.routes.ts`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notifications/push/device-token` | Registers an active native device push token with deviceId, platform, and app version |
| `DELETE` | `/api/notifications/push/device-token` | Revokes a device token upon user logout |
| `GET` | `/api/notifications/push/device-tokens` | Lists active registered mobile devices for the authenticated user |
| `GET` | `/api/notifications/push/status` | Reports active Web Push and Native Mobile registration statistics |
| `POST` | `/api/notifications/push/test` | Sends a test notification to `target: "all" \| "web" \| "mobile"` |

---

## 3. Mobile Client Implementation

### 3.1 Push Notification Service (`mobile-app/src/core/services/pushNotificationService.ts`)
- **Physical Device Detection**: Automatically skips push registration in simulator/emulator environments with a clear diagnostic reason.
- **Permission Flow**: Requests notification permissions via `Notifications.requestPermissionsAsync()`.
- **Token Acquisition**: Fetches Expo push token via `Notifications.getExpoPushTokenAsync()`.
- **Backend Registration**: Posts token to `/api/notifications/push/device-token`.
- **Local Presentation**: Presents foreground notifications using sound, priority levels, and vibration patterns.

### 3.2 Authentication & Logout Lifecycle (`mobile-app/src/store/authStore.ts`)
- On user logout:
  ```ts
  await PushNotificationService.unregisterDeviceToken().catch((err) =>
    console.warn('[AuthStore] Failed to unregister device token on logout:', err)
  );
  ```
- Ensures old device tokens do not receive subsequent notifications once the session terminates.

### 3.3 Foreground Notification Bridge (`mobile-app/src/components/notification/NotificationRealtimeBridge.tsx`)
- Listens to realtime socket events (`chat:message`, `notification:new`).
- Suppresses notifications if the user is already viewing that exact chat thread.
- Suppresses self-authored messages.
- Invokes `PushNotificationService.presentLocalNotification()` with sound and deep-linking metadata.

---

## 4. Real-Device Verification Runbook

### Step 1: Prerequisites
1. **Android Physical Device**:
   - Android 8.0+ (API 26+) with Google Play Services.
   - Developer options and USB debugging enabled.
   - For native production APKs: Place `google-services.json` inside `mobile-app/android/app/`.
2. **iOS Physical Device**:
   - iPhone running iOS 14.0+.
   - Apple Developer Team ID and Push Notification capability enabled in provisioning profile.
3. **Backend Service**:
   - Backend running on accessible network IP or public HTTPS URL (e.g., `https://api.masterhrms.com`).
   - Set `EXPO_ACCESS_TOKEN` in server `.env` (optional, for enhanced Expo API rate limits).

### Step 2: Build & Launch Mobile App
For Expo Development Client on a physical device:
```bash
cd mobile-app
npx expo run:android --device
# or
npx expo run:ios --device
```

### Step 3: Login & Verify Device Token Registration
1. Open MasterHRMS app on the physical device.
2. Log in with test user credentials (e.g. employee role).
3. Grant notification permissions when prompted.
4. Verify console output or query backend diagnostics:
   ```bash
   curl -X GET "http://localhost:3000/api/notifications/push/status" \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -H "X-Tenant-Id: <TENANT_ID>"
   ```
   **Expected Response**:
   ```json
   {
     "success": true,
     "data": {
       "webPush": { "activeCount": 0 },
       "nativePush": {
         "activeCount": 1,
         "tokens": [
           {
             "id": "dtoken_abc123",
             "platform": "android",
             "tokenType": "expo",
             "deviceId": "Pixel 7 Pro",
             "status": "active"
           }
         ]
       }
     }
   }
   ```

### Step 4: Dispatch End-to-End Test Push
Send a test push to the mobile device:
```bash
curl -X POST "http://localhost:3000/api/notifications/push/test" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-Tenant-Id: <TENANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "mobile",
    "title": "MasterHRMS Test Push",
    "body": "Verification of FCM / Expo native push delivery",
    "data": { "route": "notifications", "id": "test-123" }
  }'
```

**Verification Checkpoints**:
- **App in Background / Phone Locked**: Notification appears in Android notification shade / iOS Notification Center with sound and vibration.
- **Tapping Notification**: Opens MasterHRMS and navigates to the target screen.
- **App in Foreground**: Local notification banner is presented with high priority.

### Step 5: Verify Real-World Notification Triggers
1. **Chat Message**: Have another user send a message to the test user.
   - Verify push notification received with sender name, preview message, and avatar.
2. **Task Assignment / Leave Request**: Approve or assign a task from web admin.
   - Verify push notification received instantly.

### Step 6: Verify Revocation on Logout
1. Log out from the mobile app settings.
2. Re-query `/api/notifications/push/device-tokens`.
3. Verify that `activeCount` is decremented and the token is revoked.
4. Send another test push from the backend; verify that the device does **not** receive the notification.

---

## 5. Verification & Test Suite Summary

### Backend Test Suite (`server/src/tests/native-push-registration.test.ts`)
Run: `npx tsx src/tests/native-push-registration.test.ts`
- ✅ Expo device token registered successfully
- ✅ Native FCM token registered successfully
- ✅ Retrieved active device tokens count matches expected
- ✅ Strict tenant isolation confirmed (0 cross-tenant leaks)
- ✅ Token rotation and device deduplication verified
- ✅ Device token revocation upon logout verified
- ✅ Token expiration handling verified
- ✅ Expo Push payload construction and ticket resolution verified
- ✅ `NotificationService.dispatchNativePush` end-to-end integration verified
**Result**: 9/9 tests passed (0 failures).

### Mobile Test Suite (`mobile-app`)
Run: `npm test -- --runInBand --forceExit`
- ✅ `collaboration_shared_role_ui.test.tsx` (11 tests passed)
- ✅ `notifications_and_query_isolation.test.tsx` (10 tests passed)
- ✅ `App.test.tsx` (4 tests passed)
- ✅ `fcm_native_push_registration.test.ts` (4 tests passed)
- ✅ `services_and_integration.test.ts` (22 tests passed)
- ✅ `auth.test.ts` (14 tests passed)
- ✅ `chat_image_album_and_theme.test.tsx` (12 tests passed)
- ✅ `collaboration_contracts_and_security.test.ts` (18 tests passed)
- ✅ `permission_and_navigation.test.ts` (10 tests passed)
- ✅ `foundation.test.ts` (12 tests passed)
- ✅ `chat_messages_and_attachments.test.ts` (15 tests passed)
- ✅ `environment_configuration.test.ts` (14 tests passed)
**Result**: 12/12 suites passed (146 total tests passed, 0 failures).

### Typecheck Audits
- Mobile: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**
- Server: `npx tsc --noEmit` -> **0 errors**
