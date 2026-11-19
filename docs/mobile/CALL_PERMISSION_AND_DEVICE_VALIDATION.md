# MASTERHRMS — CALL PERMISSION & DEVICE VALIDATION REPORT

## 1. Executive Summary

This report documents the granular permissions and hardware device validation implemented in `mobile-app/src/core/services/permissionService.ts` and `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`.

Prior to this remediation, permission requests lacked strict separation between voice and video calls, and iOS permission checks returned `true` unconditionally without verifying system authorization status.

---

## 2. Granular Permission Rules & Architecture

### 2.1 Voice Call Permission Flow (`requestCallMediaPermissions('audio')`)
- **Strict Microphone Only**: Voice calls request **strictly and exclusively** microphone access (`PermissionsAndroid.PERMISSIONS.RECORD_AUDIO` on Android, `expo-audio`'s `requestRecordingPermissionsAsync()` on iOS).
- **Zero Camera Probing**: Under no circumstance is camera permission checked, requested, or prompted during a voice-only call.
- If microphone access is denied: The user is notified that microphone access is required for calls, and the call is cancelled gracefully without entering a broken state.

### 2.2 Video Call Permission Flow (`requestCallMediaPermissions('video')`)
- Requests both microphone and camera permissions natively.
- **Graceful Audio Fallback**:
  - If both microphone and camera permissions are granted: Video call proceeds with camera preview and full WebRTC video stream.
  - If microphone is granted but camera permission is denied or blocked:
    - The app flags `canFallbackToAudio: true`.
    - `ChatCallScreen` presents an informational prompt: `"Camera permission was not granted. Continuing as voice-only call."`
    - The session seamlessly downgrades to voice-only calling (`callType = 'audio'`, `isVideoEnabled = false`), acquiring an audio-only stream and rendering the centered monogram avatar rather than failing or terminating the call.
  - If microphone permission is denied: The call cannot proceed and the user is alerted to update device settings.

### 2.3 Elimination of iOS Blind Returns
- Previously, `checkCameraPermission()` and `checkMicrophonePermission()` returned `true` whenever `Platform.OS === 'ios'`.
- This has been remediated with genuine native verification:
  - iOS Camera: Calls `ImagePicker.getCameraPermissionsAsync()`.
  - iOS Microphone: Calls `expo-audio`'s `getRecordingPermissionsAsync()`.
  - Both safely verify `status === 'granted'` and `granted === true`.

---

## 3. Native Manifest & Application Configuration

The following permissions are fully configured in `mobile-app/app.json`, `mobile-app/android/app/src/main/AndroidManifest.xml`, and `mobile-app/ios/MasterHRMS/Info.plist`:

### Android Manifest (`AndroidManifest.xml` & `app.json`):
- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`
- `android.permission.MODIFY_AUDIO_SETTINGS`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.BLUETOOTH_CONNECT`
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_MICROPHONE`
- `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION`

### iOS Configuration (`Info.plist` & `app.json`):
- `NSCameraUsageDescription`: "MasterHRMS requires access to your camera for video calls and profile photo uploads."
- `NSMicrophoneUsageDescription`: "MasterHRMS requires access to your microphone for voice notes and calls."
- `NSPhotoLibraryUsageDescription`: "MasterHRMS requires access to your photo library to select and upload photos."

---

## 4. Verification & Automated Test Coverage

The permissions architecture is validated by automated test suite `mobile-app/__tests__/webrtc_calling_and_permissions.test.tsx`:
- `✓ voice-only calls strictly request ONLY microphone and NEVER camera`
- `✓ video calls request BOTH microphone and camera permissions`
- `✓ gracefully offers audio-only fallback when camera is denied but mic is granted`
- `✓ checkCameraPermission and checkMicrophonePermission return boolean status`
