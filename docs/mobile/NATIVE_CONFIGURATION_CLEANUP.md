# Native Configuration & Permissions Cleanup Report

**Milestone:** Complete Mobile WebRTC Removal & Startup Crash Remediation  
**Scope:** Android Manifest, iOS Info.plist, and Expo App Configuration  
**Date:** 2026-11-19  

---

## 1. Android Native Configuration

### File: `mobile-app/android/app/src/main/AndroidManifest.xml`
The following WebRTC/calling permissions were removed:
- `android.permission.MODIFY_AUDIO_SETTINGS`: Previously used for audio routing between earpiece and speaker during calls.
- `android.permission.BLUETOOTH_CONNECT`: Previously used for Bluetooth headset routing during calls.
- `android.permission.FOREGROUND_SERVICE`: Previously used for holding foreground call services.
- `android.permission.FOREGROUND_SERVICE_MICROPHONE`: Previously required by Android 14+ for active VoIP mic capture in the background.
- `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION`: Previously required for screen-sharing foreground service.

### Preserved Android Permissions
All permissions necessary for core HRMS and standard chat features remain active:
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.CAMERA` (Used for taking avatar photos and chat image attachments)
- `android.permission.RECORD_AUDIO` (Used for recording chat voice notes via `expo-audio`)
- `android.permission.POST_NOTIFICATIONS` (Used for push notifications)
- `android.permission.READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` (Used for media selection)
- `android.permission.ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (Used for attendance check-ins)

---

## 2. Expo Configuration (`mobile-app/app.json`)

### Android Permissions Array
Updated `expo.android.permissions` to include only:
- `android.permission.RECEIVE_BOOT_COMPLETED`
- `android.permission.VIBRATE`
- `android.permission.POST_NOTIFICATIONS`
- `android.permission.USE_EXACT_ALARM`
- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`

### iOS Usage Descriptions (`infoPlist`)
Updated privacy rationale descriptions to eliminate calling references:
- **`NSCameraUsageDescription`**: Updated to `"MasterHRMS requires access to your camera for profile photo and attachment uploads."` (previously referenced "video calls").
- **`NSMicrophoneUsageDescription`**: Updated to `"MasterHRMS requires access to your microphone for recording voice notes."` (previously referenced "voice notes and calls").
- **`NSPhotoLibraryUsageDescription`**: Retained for gallery image picking.

### Schema Normalization
- Removed invalid top-level keys `entryPoint` and `newArchEnabled` under the `expo` object according to Expo SDK 58 schema recommendations.
- Added peer dependency `expo-asset` required by `expo-audio`.

---

## 3. Native Integrity Checklist

| Item | Target | Status | Verification Note |
|---|---|---|---|
| Native WebRTC Pods | `mobile-app/ios` | Verified Clean | No WebRTC pods or header references |
| Gradle dependencies | `mobile-app/android` | Verified Clean | No WebRTC native dependencies |
| Firebase / FCM | Android & iOS | 100% Preserved | `googleServicesFile` and push configuration untouched |
| Audio recording | Android & iOS | 100% Preserved | `expo-audio` configuration fully intact |
| Camera / Photo gallery | Android & iOS | 100% Preserved | `expo-image-picker` and camera permissions intact |
