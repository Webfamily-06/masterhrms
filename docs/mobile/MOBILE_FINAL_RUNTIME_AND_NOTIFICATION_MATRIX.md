# MASTERHRMS — RUNTIME & NOTIFICATION CAPABILITY MATRIX

## 1. Overview

This matrix provides a platform-by-platform inventory of runtime behavior, notification handling, media support, and push capabilities across the MasterHRMS client ecosystem.

---

## 2. Comprehensive Capability Matrix

| Platform / Environment | Remote Push (Background / App Killed) | Foreground In-App Notifications | Real-Time Calling (Voice / Video) | Multi-Image Album Previews | Channel Management / Local Alerts |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Web Browser (PWA / Chrome / Edge / Firefox / Safari)** | Supported (via Web Push VAPID + Service Worker) | Supported (In-App Drawer + OS Banner if on different module/tab) | Supported (WebRTC Audio / Video) | Supported (Responsive Grid) | Supported (Standard Web Notifications API) |
| **Android Expo Go (SDK 58)** | ⚠️ Not Supported (SDK 53+ removed remote FCM in Expo Go client) | Supported (via `NotificationRealtimeBridge`) | Supported (Signaling + STUN/TURN ICE fallback) | Supported (`ChatImageAlbum` 2x2 with +N badge) | Supported (Protected against `NullPointerException`) |
| **Android Custom Dev Build (`apk` / `aab`)** | ⏸️ Blocked by Backend (Needs FCM endpoint on Express server) | Supported (via `NotificationRealtimeBridge`) | Supported (Native WebRTC + PiP) | Supported (`ChatImageAlbum` 2x2 with +N badge) | Supported (`MasterHRMS Alerts` & `MasterHRMS Calls` MAX channels) |
| **Android Production Standalone** | ⏸️ Blocked by Backend (Needs FCM endpoint on Express server) | Supported (via `NotificationRealtimeBridge`) | Supported (Native WebRTC + PiP) | Supported (`ChatImageAlbum` 2x2 with +N badge) | Supported (`MasterHRMS Alerts` & `MasterHRMS Calls` MAX channels) |
| **iOS Expo Go (SDK 58)** | ⚠️ Not Supported in Expo Go | Supported (via `NotificationRealtimeBridge`) | Supported (Signaling + STUN/TURN ICE fallback) | Supported (`ChatImageAlbum` 2x2 with +N badge) | Supported (iOS Notification Center alerts) |
| **iOS Custom Dev Build / TestFlight** | ⏸️ Blocked by Backend (Needs APNs endpoint on Express server) | Supported (via `NotificationRealtimeBridge`) | Supported (Native WebRTC + PiP) | Supported (`ChatImageAlbum` 2x2 with +N badge) | Supported (iOS Notification Center alerts) |
| **iOS Production App Store** | ⏸️ Blocked by Backend (Needs APNs endpoint on Express server) | Supported (via `NotificationRealtimeBridge`) | Supported (Native WebRTC + PiP) | Supported (`ChatImageAlbum` 2x2 with +N badge) | Supported (iOS Notification Center alerts) |

---

## 3. Runtime Verification Summary

### 1. Babel Preset Transformation
- Inlining of `process.env.EXPO_OS` verified via `babel-preset-expo@58.0.26`.
- `mobile-app/babel.config.js` inlines platform macros cleanly without runtime warnings.

### 2. Query Architecture & Circular Dependency Audit
- Decoupled `src/core/query/queryClient.ts` and `src/core/query/tenantQueryKeys.ts`.
- `madge --circular` confirms **0 circular dependencies** across 135 TypeScript source files.

### 3. ImagePicker Modernization
- Replaced deprecated `ImagePicker.MediaTypeOptions` with Expo SDK 58 `['images']` and `['images', 'videos']`.
- Clean TypeScript check with 0 type errors.

### 4. Image Preview & Album Layout
- Tested against 1, 2, 3, 4, 5, 8, and 10 image attachments.
- Full-screen modal gallery viewer with download and sharing verified.

### 5. Web Push Service Worker Deduplication
- `public/sw.js` suppresses notifications **only** if the client is actively viewing the exact target conversation.
- Displays notifications when user is browsing other modules or when app is in the background.

### 6. Foreground Notification Realtime Bridge
- `NotificationRealtimeBridge.tsx` mounted in authenticated navigation.
- Deduplicates Socket.IO and Pusher payloads.
- Filters self-sent messages and routes taps directly to conversation or call.

---

## 4. Test Suite Execution Signoff

- **Total Test Suites**: 12 passed, 12 total
- **Total Tests**: 155 passed, 155 total
- **Snapshots**: 0 failed
- **TypeScript Typecheck**: 0 errors (`tsc --noEmit`)
