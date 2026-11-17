# MasterHRMS Mobile — Push Notification Architecture & Gap Report

**Repository**: `Webfamily-06/masterhrms`  
**Execution Timestamp**: 2026-11-18  
**Scope**: In-depth analysis of Web Push vs Mobile Device Push tokens, backend endpoints, and FCM integration requirements.  

---

## 1. Executive Summary

During our forensic audit of the push notification infrastructure across the MasterHRMS web and mobile codebases, a critical architectural distinction was identified:

1. **The Web Application** utilizes **Web Push VAPID** protocol via the browser `PushManager` API (`endpoint`, `keys.p256dh`, and `keys.auth`).
2. **The React Native Mobile App** requires **Firebase Cloud Messaging (FCM) / Apple Push Notification service (APNs)** native device tokens registered with the operating system.

This report documents the current implementation, client-side wiring, and the exact backend requirements to enable native VoIP/call wake-up in the background without modifying backend code at this stage.

---

## 2. Forensic Discovery of Notification Endpoints

### 2.1 Backend Push Endpoints in Express

Inspection of `server/src/routes/notifications.routes.ts` and `server/src/routes/push.routes.ts` reveals:

1. **Web Push Subscription**:
   - **Path**: `POST /api/notifications/push/subscribe`
   - **Expected Payload**:
     ```json
     {
       "endpoint": "https://fcm.googleapis.com/fcm/send/...",
       "keys": {
         "p256dh": "...",
         "auth": "..."
       }
     }
     ```
   - **Backend Storage**: Stored in `prisma.pushSubscription`.
   - **Dispatcher**: Uses `web-push` npm library configured with VAPID keys.

2. **Mobile Device Push Registration**:
   - **Path**: `POST /api/push/register`
   - **Expected Payload**:
     ```json
     {
       "token": "ExponentPushToken[xxxxxxxxxxxxxx]" or FCM Registration Token,
       "platform": "android" | "ios",
       "deviceId": "UUID"
     }
     ```
   - **Backend Storage**: Stored in `prisma.deviceToken` or `prisma.mobilePushToken`.

---

## 3. Client-Side Mobile Implementation

To support both native device tokens and fallback foreground push delivery:

1. **`pushNotificationService.ts`**:
   - Uses `expo-notifications` and `expo-device`.
   - Requests native OS notification permissions on app launch.
   - Retrieves the native device push token:
     ```ts
     const tokenData = await Notifications.getExpoPushTokenAsync({
       projectId: Constants.expoConfig?.extra?.eas?.projectId,
     });
     ```
   - Registers the token with `POST /api/push/register`.
   - Attaches notification handlers to display incoming banners and play sounds when the app is foregrounded:
     ```ts
     Notifications.setNotificationHandler({
       handleNotification: async () => ({
         shouldShowAlert: true,
         shouldShowBanner: true,
         shouldShowList: true,
         shouldPlaySound: true,
         shouldSetBadge: true,
       }),
     });
     ```

2. **Realtime Calling Push Fallback**:
   - Active calls and incoming rings are dispatched via Pusher channels:
     - Channel: `private-user-${userId}`
     - Event: `call:ringing`
   - When the user is active in the mobile app, `WorkspaceModuleShell.tsx` intercepts this event and opens the full-screen `ChatCallScreen` immediately.

---

## 4. Gap Analysis: Background VoIP & Call Delivery

| Scenario | Foreground (App Active) | Background (App Suspended) | Terminated (App Closed) |
|---|---|---|---|
| **Chat Message** | ✅ Delivered via Pusher + Local Notification Banner | ⚠️ Requires FCM payload dispatched by backend | ⚠️ Requires FCM payload dispatched by backend |
| **Incoming Call Alert** | ✅ Full-screen Ringing Screen opens via Pusher | ⚠️ Requires high-priority VoIP / Data FCM message | ⚠️ Requires high-priority VoIP / Data FCM message |
| **Task / Calendar Event** | ✅ Instant toast & list update | ⚠️ Standard OS Push Notification | ⚠️ Standard OS Push Notification |

### Detailed Gap Explanation:
When the user's mobile device is locked or the app is closed, WebSocket / Pusher connections are suspended by iOS and Android operating systems to conserve battery. 

For the mobile app to ring when closed, the Express backend must dispatch a **High-Priority FCM Data Message** directly to the registered device token using `firebase-admin` (Service Account JSON). 

Since we have a **strict rule prohibiting backend modifications**, the mobile client has been fully configured to register tokens and listen for incoming calls via Pusher while foregrounded. The gap for background calling wake-up is documented below for future backend deployment.

---

## 5. Required Future Backend Work (When Authorized)

When backend authorization is granted:
1. Provide `firebase-service-account.json` to `server/`.
2. Initialize `admin.initializeApp()` in `server/src/services/push.service.ts`.
3. In `server/src/routes/chat.routes.ts` (`POST /api/calls/initiate`):
   - In addition to `broadcastToUser(receiverId, 'call:ringing', ...)`, trigger:
     ```ts
     admin.messaging().send({
       token: recipientDeviceToken,
       data: {
         type: 'INCOMING_CALL',
         callId: call.id,
         callerName: caller.fullName,
         callType: call.type,
       },
       android: { priority: 'high' },
       apns: { headers: { 'apns-priority': '10' } },
     });
     ```
4. This will trigger Android `CallStyle` notifications and iOS `CallKit` when the app is terminated.
