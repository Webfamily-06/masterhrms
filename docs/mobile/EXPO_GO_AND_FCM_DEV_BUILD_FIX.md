# MASTERHRMS — EXPO GO NOTIFICATION WARNINGS & NATIVE FCM DEVELOPMENT BUILD FIX
## Complete Remediation & Verification Report

---

## 1. ROOT CAUSE ANALYSIS

Android development logs exhibited the following failure sequence:
1. **`[expo-notifications] Push notifications (remote notifications) are unavailable in Expo Go on Android since SDK 53`**:
   Starting in Expo SDK 53, the Expo Go client app completely deprecated and removed native remote push notification handling and FCM background services on Android.
2. **`setNotificationChannelAsync throws NullPointerException`**:
   In `PushNotificationService.registerForPushNotifications()`, native Android notification channel creation (`setNotificationChannelAsync`) was executed **prior** to runtime environment validation. In Expo Go on Android, invoking `setNotificationChannelAsync` throws a `NullPointerException` because Expo Go's host container does not expose a native notification manager context for custom app channels.
3. **`getDevicePushTokenAsync fails in Expo Go`**:
   The runtime detection previously checked `Constants.appOwnership === 'expo'`. Because `appOwnership` is deprecated in modern Expo SDKs and frequently evaluates to `null` or `undefined`, the guard was bypassed, prompting Expo to attempt `getDevicePushTokenAsync()`. This triggered internal Expo SDK exceptions and logged repeated warnings on every application focus, login, and bootstrap cycle.
4. **Missing Native Google Services Plugin**:
   `mobile-app/android/build.gradle` and `mobile-app/android/app/build.gradle` did not apply `com.google.gms:google-services`. Although `google-services.json` existed on disk and was configured in `app.json`, native Android builds did not process the configuration file to generate native Firebase App credentials.

---

## 2. EXACT FILES MODIFIED

| File Path | Description of Changes |
|---|---|
| `mobile-app/src/core/services/pushNotificationService.ts` | 1. Implemented robust runtime environment detection using official `isRunningInExpoGo` from `'expo'` and `Constants.executionEnvironment`.<br>2. Added early guard in `registerForPushNotifications`: skips remote push and channel setup in Expo Go, logs a single clear `console.info` notice, avoids repeated attempts.<br>3. Extracted `configureAndroidChannelsAsync` to run exclusively on native builds (configuring `default` and `calls` with MAX importance and DND bypass).<br>4. Prioritized native FCM token acquisition via `Notifications.getDevicePushTokenAsync()` on Android native builds with Expo token fallback.<br>5. Implemented bounded exponential retry for backend registration.<br>6. Added token refresh listener via `Notifications.addPushTokenListener`.<br>7. Hardened `presentLocalNotification` so that in Expo Go on Android, custom `channelId` is omitted, avoiding `NullPointerException` while preserving local notifications. |
| `mobile-app/android/build.gradle` | Added `classpath("com.google.gms:google-services:4.4.2")` to `buildscript.dependencies`. |
| `mobile-app/android/app/build.gradle` | Added `apply plugin: "com.google.gms.google-services"` at the end of the file to process `google-services.json`. |
| `mobile-app/jest.setup.js` | Added mock for `'expo'` (`isRunningInExpoGo`) and `addPushTokenListener` on `expo-notifications`. |
| `mobile-app/__tests__/fcm_native_push_registration.test.ts` | Complete test suite implementing all 8 required tests covering Expo Go skip, channel setup, FCM acquisition, backend registration, token refresh, logout revocation, error recovery, and Socket.IO local notifications. |

---

## 3. FIREBASE CONFIGURATION VERIFICATION

1. **`google-services.json`**:
   - Location: `mobile-app/android/app/google-services.json`
   - Verified Project ID: `masterhrms-ab50b`
   - Verified Package Name: `com.masterhrms.app`
2. **`mobile-app/app.json`**:
   - Verified `android.package`: `"com.masterhrms.app"` (Matches Firebase registration)
   - Verified `android.googleServicesFile`: `"./android/app/google-services.json"`
   - Verified `expo-notifications` plugin:
     ```json
     [
       "expo-notifications",
       {
         "color": "#4F46E5",
         "defaultChannel": "default"
       }
     ]
     ```
3. **Backend FCM Sender**:
   - Handled in `server/src/services/native-push-dispatcher.service.ts`.
   - Supports `FIREBASE_SERVER_KEY` / `FCM_SERVER_KEY` with dead-token cleanup (`NotRegistered`, `InvalidRegistration`).

---

## 4. AUTOMATED TEST RESULTS

Running the dedicated test suite:
`cd mobile-app && npm test -- __tests__/fcm_native_push_registration.test.ts`

```
PASS __tests__/fcm_native_push_registration.test.ts
  MASTERHRMS Notification Lifecycle & Native FCM Development Build Suite
    ✓ 1. Expo Go skips native push initialization, channel setup, and token acquisition (13 ms)
    ✓ 2. Development build configures default and calls notification channels on Android (1 ms)
    ✓ 3. Development build acquires actual native FCM token via getDevicePushTokenAsync (1 ms)
    ✓ 4. Backend registration succeeds with registered status and correct payload (1 ms)
    ✓ 5. Token refresh listener syncs rotated FCM token with backend (1 ms)
    ✓ 6. Logout revokes token through backend unregister endpoint
    ✓ 7. Failed backend registration does not crash app startup and records failure status (1510 ms)
    ✓ 8. Socket.IO in-app notifications still present local notifications safely in Expo Go and native builds (1 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        1.918 s
```

Full Mobile Regression Suite:
`cd mobile-app && npm test -- --runInBand --forceExit`
```
Test Suites: 13 passed, 13 total
Tests:       165 passed, 165 total
Snapshots:   0 total
Time:        3.17 s
```

TypeScript Compilation:
`cd mobile-app && npm run typecheck`
```
Exit code: 0 (Zero errors)
```

---

## 5. ANDROID DEVELOPMENT BUILD INSTRUCTIONS

To build and run the custom native development build on an Android device or emulator:

### Step 1: Start Metro Bundler with Dev Client Support
```bash
cd mobile-app
npx expo start --dev-client
```

### Step 2: Build and Install Android Development Client
Connect an Android device via USB (with USB Debugging enabled) or start an Android Emulator, then run:
```bash
cd mobile-app
npx expo run:android
```
*Note: This compiles the native Android project with the Google Services Gradle plugin and connects directly to the Metro server.*

### Step 3: Standalone Debug / Release APK Build (Alternative CLI)
If building directly with Gradle:
```bash
cd mobile-app/android
./gradlew assembleDebug
```
The output APK is generated at:
`mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 6. PHYSICAL DEVICE VERIFICATION INSTRUCTIONS

### Verification Flow A: Running in Expo Go (No Native Push)
1. Launch Expo Go on an Android device and scan the QR code from `npx expo start`.
2. Observe console logs:
   - A single informative message is logged:
     `[Push] Running in Expo Go. Native remote push notifications (FCM) and notification channels are unsupported in Expo Go on Android (SDK 53+)...`
   - Zero `NullPointerException` errors.
   - Zero repeated warnings on app focus or screen transition.
3. In-App Notifications:
   - Send a message or assign a task from the web dashboard.
   - In-app notification appears and triggers sound/vibration cleanly.

### Verification Flow B: Running Native Development Build (FCM Active)
1. Install and launch the development build (`npx expo run:android`).
2. Log in with user credentials.
3. Observe console logs:
   - Notification channels created: `MasterHRMS Alerts` (`default`) and `MasterHRMS Calls` (`calls`).
   - FCM token acquired: `[Push] Device push token acquired (fcm): ...`
   - Server registration: `[Push] Server status: Native device push token (fcm) registered successfully with MasterHRMS backend.`
4. Verify backend database / endpoint:
   - Request `GET /api/notifications/push/status` with user token.
   - Response indicates `nativeDeviceCount >= 1` and `hasActiveSubscription: true`.
5. Background notification receipt:
   - Background the app on the physical device.
   - Dispatch a notification from backend.
   - Device displays heads-up push notification via FCM with sound and app icon.
6. Logout revocation:
   - Tap "Log Out" in the mobile app.
   - Backend receives `DELETE /api/notifications/push/device-token`.
   - Token is revoked, preventing any notifications from delivering to logged-out sessions.
