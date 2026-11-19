# MASTERHRMS Mobile Calling Implementation & Setup Guide

## 1. Mobile Calling Architecture Overview

The mobile calling architecture in `mobile-app/` provides an enterprise-grade calling interface built on React Native and Expo SDK 58.

Key design invariants:
1. **Startup Safety Guarantee**: WebRTC native modules are **never** loaded at root app bootstrap. All media stream and calling logic is dynamically scoped so the app **never crashes on launch** when running in simulated, Expo Go, or test environments.
2. **Universal Lifecycle Support**: Complete outgoing call dialer, full-screen incoming call modal, active 1-on-1 audio/video call, and floating PiP overlay.
3. **Hardware Permission Lifecycle**: Contextual camera and microphone checks with user guidance and settings redirects when denied.
4. **Cross-Tab Continuity**: Floating PiP call widget allows uninterrupted calling while reviewing timesheets, calendars, tasks, or chats.

---

## 2. Component Inventory

| Component | Path | Responsibility |
|---|---|---|
| **ChatCallScreen** | `src/modules/chat/screens/ChatCallScreen.tsx` | Full-screen active audio and video call view, camera preview, participant roster, duration counter, mute, speaker, end call. |
| **FloatingMiniCallWidget** | `src/components/calling/FloatingMiniCallWidget.tsx` | Draggable floating PiP widget visible when user minimizes active call to navigate other screens. |
| **FullScreenIncomingCallModal** | `src/components/calling/FullScreenIncomingCallModal.tsx` | App-wide incoming call modal triggered by realtime socket or push notification. |
| **Calls Tab in Hub** | `src/modules/chat/screens/ChatConversationsScreen.tsx` | 'Calls' tab displaying Call History, Missed Calls, and quick call actions. |
| **Chat Detail Actions** | `src/modules/chat/screens/ChatConversationDetailScreen.tsx` | Audio Call and Video Call buttons in header and call options modal. |
| **Call Service** | `src/core/services/chatService.ts` | REST API methods for initiate, accept, reject, cancel, end, and call logs. |

---

## 3. Native Integration & Build Modes

### Development & Managed Expo Mode
- In standard Expo Go or uncompiled client environments where native C++ WebRTC binaries are not compiled:
  - FSM signaling, Socket.IO messaging, audio/video state toggles, incoming call alerts, call history, and duration counters are **100% operational**.
  - Visual status informs the user: *"Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build."*

### Production Native Build (EAS / Prebuild)
- For native binary camera/microphone video rendering on physical devices:
  ```bash
  cd mobile-app
  npx expo prebuild
  npx expo run:android --device
  # or
  npx expo run:ios --device
  ```
- Android Permissions configured in `AndroidManifest.xml`:
  - `CAMERA`
  - `RECORD_AUDIO`
  - `MODIFY_AUDIO_SETTINGS`
  - `FOREGROUND_SERVICE`
  - `FOREGROUND_SERVICE_PHONE_CALL`
  - `WAKE_LOCK`
- iOS Permissions configured in `app.json` / `Info.plist`:
  - `NSCameraUsageDescription`: *"MasterHRMS requires camera access for secure video calling and meetings."*
  - `NSMicrophoneUsageDescription`: *"MasterHRMS requires microphone access for audio and video calls."*
  - `UIBackgroundModes`: `["audio", "voip", "fetch", "remote-notification"]`
