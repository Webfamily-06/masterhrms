# MASTERHRMS MOBILE APP — MOBILE NATIVE CONFIGURATION REPORT

**Document ID:** DOC-MOB-NAT-CFG-007  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** AndroidManifest.xml, Info.plist, Permissions, Audio/Video Background Modes  
**Status:** AUDITED & VERIFIED  

---

## 1. Executive Summary

This report documents the native mobile configurations and runtime permissions required for MasterHRMS Chat, Attachments, Audio Calling, Video Calling, Screen Sharing, and Notifications across Android and iOS platforms.

---

## 2. Android Native Configuration (`mobile-app/android/`)

### 2.1 Android Manifest Permissions (`app/src/main/AndroidManifest.xml`)
The following hardware and runtime permissions are configured:
- `android.permission.INTERNET`: Required for API requests, WebSocket signaling, and media streams.
- `android.permission.ACCESS_NETWORK_STATE`: Required for network connectivity monitoring.
- `android.permission.RECORD_AUDIO`: Required for microphone access, voice messages, and voice/video calling.
- `android.permission.CAMERA`: Required for taking photos, recording videos, and video calling camera feed.
- `android.permission.READ_EXTERNAL_STORAGE`: Required for picking documents, audio files, and images (API < 33).
- `android.permission.READ_MEDIA_IMAGES`: Required for picking images and photos (API >= 33).
- `android.permission.READ_MEDIA_VIDEO`: Required for video selection (API >= 33).
- `android.permission.READ_MEDIA_AUDIO`: Required for audio selection (API >= 33).
- `android.permission.POST_NOTIFICATIONS`: Required for incoming call alerts, message push notifications, and background status (API >= 33).
- `android.permission.VIBRATE`: Required for incoming call and message notification haptics.
- `android.permission.WAKE_LOCK`: Required to keep the CPU awake during active audio/video calls.
- `android.permission.FOREGROUND_SERVICE`: Required for ongoing background call management.
- `android.permission.FOREGROUND_SERVICE_MICROPHONE`: Required for foreground voice call recording.
- `android.permission.FOREGROUND_SERVICE_CAMERA`: Required for foreground video call streaming.

### 2.2 Picture-in-Picture Activity Flag
In `AndroidManifest.xml` under `<activity android:name=".MainActivity"`:
- `android:supportsPictureInPicture="true"`: Enables OS-level Picture-in-Picture capability.
- `android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|smallestScreenSize|uiMode"`: Prevents activity restart when entering/exiting PiP mode.

---

## 3. iOS Native Configuration (`mobile-app/ios/`)

### 3.1 Info.plist Permissions Keys
The following privacy usage descriptions are declared:
- `NSCameraUsageDescription`: *"MasterHRMS requires access to your camera for video calls, profile photos, and document scanning."*
- `NSMicrophoneUsageDescription`: *"MasterHRMS requires access to your microphone for voice calls, video calls, and voice messages."*
- `NSPhotoLibraryUsageDescription`: *"MasterHRMS requires access to your photo library to select and send photo and video attachments."*
- `NSPhotoLibraryAddUsageDescription`: *"MasterHRMS requires access to save downloaded photos to your photo library."*
- `UIBackgroundModes`:
  - `audio`: Enables continuous audio calling and voice notes when the app is minimized or the screen is locked.
  - `voip`: Enables VoIP push notifications for incoming call wake-up.
  - `fetch`: Enables background message synchronization.
  - `remote-notification`: Enables push notification delivery.

---

## 4. Runtime Permission Service (`permissionService.ts`)

Hardware permissions are requested proactively before initiating or receiving media actions via `requestAppMediaPermissions()`:
1. `requestCameraPermissionsAsync()` via Expo ImagePicker/Camera.
2. `requestMicrophonePermission()` via Expo Audio.
3. `Notifications.requestPermissionsAsync()` via Expo Notifications.

If a permission is denied by the user, the app gracefully degrades (e.g. video call switches to audio-only with video disabled; user is notified with actionable settings alerts rather than crashing).
