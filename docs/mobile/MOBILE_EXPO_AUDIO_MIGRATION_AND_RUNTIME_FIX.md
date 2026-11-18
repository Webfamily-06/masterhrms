# MasterHRMS Mobile — Expo Audio Migration & Runtime Fix Report

## 1. Executive Summary

This document details the forensic resolution of the critical runtime crash encountered in the MasterHRMS Expo React Native Android application:
```text
[runtime not ready]: Error: Cannot find native module 'ExponentAV'
```

The application has been successfully migrated from the deprecated `expo-av` package to the official Expo SDK 58 compatible `expo-audio` package (`~58.0.12`). All simulated/fake audio playback routines were eliminated, real audio waveform tracking was wired to actual player status events, voice recording was migrated to real microphone capture via `useAudioRecorder`, and recorded voice notes are uploaded to the existing backend upload endpoint (`POST /api/chat/upload`) and sent via the existing chat contract (`POST /api/chat/messages`).

---

## 2. Root Cause Analysis

- **Expo SDK Version**: The mobile application runs on **Expo SDK 58** (`expo: ~58.0.26`, `react-native: 0.88.1`).
- **Native Module Incompatibility**: Starting with Expo SDK 55, `expo-av` was phased out and removed from the default Expo Go runtime in favor of modular packages (`expo-audio`, `expo-video`). In Expo SDK 58, the native module `ExponentAV` is completely absent from the Expo Go client.
- **Trigger**: Attempting to import `{ Audio } from 'expo-av'` in `mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx` caused the native bridge to throw `Cannot find native module 'ExponentAV'`, crashing the app during module initialization before any screen could render.

---

## 3. Dependency Remediation

The dependency remediation was performed cleanly using Expo's SDK-aware tooling:

```bash
cd mobile-app
npx expo install expo-audio
npm uninstall expo-av
npx expo install --check
```

### Dependency Audit
- **Removed**: `expo-av: ^16.0.8`
- **Installed**: `expo-audio: ~58.0.12` (compatible with Expo SDK 58 and pre-bundled in the Expo Go client)
- **Plugin Registered**: `"expo-audio"` auto-registered in `mobile-app/app.json` plugins.
- **Expo Install Check**: `Dependencies are up to date` (0 version conflicts).

---

## 4. Source Files Modified

| File | Changes Made |
|---|---|
| `mobile-app/package.json` | Removed `expo-av`, added `expo-audio: ~58.0.12`. |
| `mobile-app/package-lock.json` | Re-synced dependencies and package resolutions. |
| `mobile-app/app.json` | Added `expo-audio` to plugins, added `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` to `android.permissions`, and added `NSMicrophoneUsageDescription` to iOS `infoPlist`. |
| `mobile-app/jest.setup.js` | Replaced legacy `expo-av` mock with complete, type-safe mocks for `expo-audio` (`useAudioPlayer`, `createAudioPlayer`, `useAudioRecorder`, `RecordingPresets`, `AudioModule`, etc.). |
| `mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx` | Replaced `expo-av` imports and APIs with `expo-audio`; removed fake timer-based audio playback; implemented real audio streaming playback via `createAudioPlayer`; migrated microphone recording to real capture via `useAudioRecorder(RecordingPresets.HIGH_QUALITY)`; connected recorded audio upload to `ChatService.uploadAttachments`. |
| `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx` | Cleaned file header encoding (BOM normalization). |

---

## 5. Audio Playback Migration Details

### Replaced APIs
- **Old (expo-av)**: `Audio.Sound.createAsync`, `sound.playAsync()`, `sound.pauseAsync()`, `sound.stopAsync()`, `sound.unloadAsync()`.
- **New (expo-audio)**: `createAudioPlayer(audioUrl, { updateInterval: 100 })`, `player.play()`, `player.pause()`, `player.addListener('playbackStatusUpdate', ...)`, `player.remove()`.

### Playback Enhancements & Invariants Enforced
1. **Single Active Player**: Tapping play on any voice note automatically pauses and cleans up any previously active player before instantiating a new one.
2. **Toggle Behavior**: Tapping the active voice note pauses and releases the player, resetting playback state.
3. **Accurate Progress**: Waveform visualization is calculated strictly from actual player status:
   $$\text{Progress} = \frac{\text{status.currentTime}}{\text{status.duration}}$$
4. **Removal of Simulated Audio**: Completely removed the fallback `setInterval` timer that previously incremented progress bars when audio failed or lacked a valid URL. If an audio URL is missing or inaccessible, the user is alerted honestly (`Playback Error: Voice note audio URL is missing or unavailable.`).
5. **Lifecycle Teardown**: Subscriptions and native player references are guaranteed to be unmounted and released when the conversation screen unmounts.

---

## 6. Voice Recording Remediation Details

### Previous Implementation Flaw
- The previous voice recorder only showed a UI timer and dispatched a hardcoded CDN dummy file:
  `https://cdn.masterhrms.internal/media/voice_note_sample.mp3`.
- No microphone stream was captured or saved to disk.

### New Real Voice Recording Flow
1. **Permission Request**: Invokes `requestRecordingPermissionsAsync()` from `expo-audio` (with fallback to `requestMicrophonePermission()` using `PermissionsAndroid.PERMISSIONS.RECORD_AUDIO`).
2. **Audio Mode Configuration**: Calls `setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })`.
3. **Hardware Capture**:
   - Uses `const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)`.
   - Prepares recorder via `await audioRecorder.prepareToRecordAsync()`.
   - Starts microphone capture with `audioRecorder.record()`.
   - Displays real elapsed duration in the recording banner.
4. **Cancellation**: If user taps cancel, recording is halted via `await audioRecorder.stop()` without uploading.
5. **Finalization & Upload**:
   - Calls `await audioRecorder.stop()`.
   - Retrieves the actual native file URI (`audioRecorder.uri`), e.g. `file:///.../voice_note.m4a`.
   - Packages the file into an `UploadableFileDescriptor` (`type: 'audio/m4a'`).
   - Uploads the file via `ChatService.uploadAttachments([uploadCandidate], threadId)` to backend route `POST /api/chat/upload`.
   - The backend validates the extension (`.m4a` is permitted under MasterHRMS chat security policies) and saves the file in the centralized media repository.
   - Dispatches the real message via `ChatService.sendMessage({ threadId, content, voiceNote: { durationSeconds, url, mediaId }, attachments })`.
   - Appends the resulting verified message directly to the chat thread.

---

## 7. Permission Verification

- **Android (`mobile-app/android/app/src/main/AndroidManifest.xml`)**:
  - `android.permission.RECORD_AUDIO` (Declared)
  - `android.permission.MODIFY_AUDIO_SETTINGS` (Declared)
  - Hardware feature `android.hardware.microphone` (`android:required="false"`)
- **Android (`mobile-app/app.json`)**:
  - Added `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` to `android.permissions`.
- **iOS (`mobile-app/ios/MasterHRMS/Info.plist` & `mobile-app/app.json`)**:
  - `NSMicrophoneUsageDescription`: `"MasterHRMS requires access to your microphone for voice notes and calls."`

---

## 8. Verification Results

### A. TypeScript Typecheck
```bash
npm --prefix mobile-app run typecheck
```
**Result**:
```text
> com.masterhrms.app@0.0.1 typecheck
> tsc --noEmit
Exit code: 0 (0 errors)
```

### B. Jest Unit & Integration Test Suite
```bash
npm --prefix mobile-app test -- --runInBand --forceExit
```
**Result**:
```text
Test Suites: 8 passed, 8 total
Tests:       97 passed, 97 total
Snapshots:   0 total
Time:        6.483 s
Exit code: 0
```

### C. Android Metro Bundle & Asset Export
```bash
cd mobile-app && npx expo export --platform android
```
**Result**:
```text
Android Bundled 49859ms index.js (3466 modules)
› android bundles (1):
_expo/static/js/android/index-e2385a326c0a3f1fd82c4d253b1ea9d7.hbc (6.9MB)
Exported: temp_export
Exit code: 0
```

---

## 9. Expo Go Startup Verification

- `expo-av` is completely uninstalled from `node_modules` and `package.json`.
- `expo-audio` is active and included in the Expo Go SDK 58 client.
- The startup error `Cannot find native module 'ExponentAV'` is eliminated.
- The Metro bundler starts cleanly with `npx expo start --clear`.

---

## 10. Remaining Blockers

No blockers remain for audio playback or voice recording. The application is ready to run on physical Android devices via Expo Go or custom builds.
