# MASTERHRMS — MOBILE NOTIFICATION RUNTIME & CRASH REMEDIATION

## 1. Overview & Objectives

In previous iterations, running on Android Expo Go triggered runtime warnings and native exceptions:
1. `java.lang.NullPointerException` when calling Android notification channel managers in Expo Go.
2. Incomplete handling of Expo Go vs Custom Development Builds (`expo-constants`).
3. Calling nonexistent backend endpoints (`/api/push/register`, `/api/notifications/register`).
4. Boot-time invasive camera and microphone permission prompts.

This document details the complete remediation across `pushNotificationService.ts`, `notificationService.ts`, and `AppBootstrap.tsx`.

---

## 2. Notification Channel & Expo Go Safety (`pushNotificationService.ts`)

### Root Cause
Expo Go SDK 53+ removed remote push notification support on Android due to Google Play and FCM restrictions. Invoking `Notifications.setNotificationChannelAsync` or `Notifications.getExpoPushTokenAsync` in Android Expo Go can trigger `NullPointerException` or unhandled promise rejections.

### Remediation
1. **Expo Go Detection**:
   Imported `Constants, { ExecutionEnvironment }` from `expo-constants` and created `isExpoGoEnvironment()`:
   ```typescript
   export const isExpoGoEnvironment = (): boolean => {
     return (
       Constants?.appOwnership === 'expo' ||
       Constants?.executionEnvironment === ExecutionEnvironment.StoreClient
     );
   };
   ```

2. **Isolated Channel Creation**:
   Every `Notifications.setNotificationChannelAsync` call is wrapped in its own isolated `try/catch` block. If the platform channel manager fails or is restricted, the error is safely caught and logged as a debug warning without terminating runtime execution:
   ```typescript
   if (Platform.OS === 'android') {
     try {
       if (typeof Notifications.setNotificationChannelAsync === 'function') {
         await Notifications.setNotificationChannelAsync('default', {
           name: 'MasterHRMS Alerts',
           importance: Notifications.AndroidImportance.MAX,
           vibrationPattern: [0, 250, 250, 250],
           lightColor: '#4F46E5',
           enableVibrate: true,
           showBadge: true,
           enableLights: true,
         });
       }
     } catch (chanErr) {
       console.warn('[Push] Could not configure default notification channel:', chanErr);
     }
     // calls channel isolated identically
   }
   ```

3. **Honest Expo Go Capability Handling**:
   When detected on Android Expo Go, the service gracefully skips remote token acquisition and sets a transparent capability status:
   ```typescript
   if (isExpoGo && Platform.OS === 'android') {
     this.currentStatus = {
       isPhysicalDevice: Boolean(Device.isDevice),
       permissionGranted: true,
       tokenType: 'none',
       pushToken: null,
       serverRegistrationStatus: 'unsupported_backend',
       statusReason:
         'Expo Go on Android does not support remote push notifications (SDK 53+). Local notifications and foreground bridges are active. Custom development build required for native FCM.',
     };
     return null;
   }
   ```

---

## 3. Removal of Nonexistent Endpoints (`notificationService.ts`)

### Audit Finding
`NotificationService.registerDeviceToken` previously attempted POST requests to:
- `/api/push/register`
- `/api/notifications/register`

Neither endpoint exists on the MasterHRMS Express backend (the backend exclusively supports Web Push VAPID endpoints at `/api/notifications/push/subscribe`). Attempting these requests generated repeated 404 noise and network error logs.

### Remediation
The nonexistent calls were removed. `registerDeviceToken` now returns `false` safely without attempting network requests:
```typescript
static async registerDeviceToken(_token: string, _platform: 'android' | 'ios'): Promise<boolean> {
  // Non-existent routes (/api/push/register, /api/notifications/register) removed
  // to prevent 404 noise and network failures.
  return false;
}
```

---

## 4. Permission Prompt Deferral (`AppBootstrap.tsx`)

### Audit Finding
Previously, `AppBootstrap.tsx` called `void requestAppMediaPermissions()` upon cold boot. This immediately prompted the user for Camera and Microphone access as soon as the app launched, causing severe UX friction and violating platform app review guidelines.

### Remediation
1. Removed `void requestAppMediaPermissions()` from `AppBootstrap.tsx`.
2. Hardware permissions (Camera & Microphone) are now strictly requested **on-demand** when the user initiates a call (`ChatCallScreen`) or chooses to take a photo (`ImagePicker.launchCameraAsync`).
3. Boot-time initialization is strictly confined to session restoration, biometrics (if configured), and push notification channel setup.
