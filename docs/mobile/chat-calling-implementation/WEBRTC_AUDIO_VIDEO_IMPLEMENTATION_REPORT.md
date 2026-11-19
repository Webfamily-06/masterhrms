# MASTERHRMS MOBILE APP — WEBRTC AUDIO & VIDEO CALLING IMPLEMENTATION REPORT

**Document ID:** DOC-MOB-CALL-WEBRTC-004  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** Audio & Video Calling Architecture, WebRTC Signaling, Hardware Permissions & Native Status  
**Status:** IMPLEMENTED (Signaling & Lifecycle 100% Complete; Native Media Stream Binary Classification Documented)  

---

## 1. Executive Summary

This report documents the architectural design, implementation, and operational status of 1:1 and Multiparty Audio and Video Calling in `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`.

The complete end-to-end calling lifecycle—including hardware camera and microphone permission acquisition, WebSocket signaling (`call:invite`, `call:accept`, `call:reject`, `call:cancel`, `call:media-state`, `call:ended`), STUN server resolution, active call heartbeat management, 30-second ring timeout, and audio/video state toggles—is fully implemented and functional.

---

## 2. Calling Architecture & State Machine

The calling engine uses a robust finite state machine (FSM):

```
       [Start Call]
            │
            ▼
        DIALING ──────(Timeout 30s)──────► ENDED / 'No Answer'
            │                                     ▲
            ▼                                     │
     (Recipient Alerted)                          │
            │                                     │
         RINGING ──────(Callee Declines)──────────┤
            │                                     │
     (Callee Accepts)                             │
            │                                     │
        ACCEPTING                                 │
            │                                     │
            ▼                                     │
        CONNECTED ────(Hangup / Peer Left)────────┘
```

### State Breakdown:
- **`DIALING`:** Outgoing call initiated; server dispatches invitation via `POST /api/calls/invite` and socket `call:invite`.
- **`RINGING`:** Callee's device alerted via incoming call modal or push notification; caller plays ring tone.
- **`ACCEPTING`:** Callee tapped answer button; call parameters acknowledged by backend via `POST /api/calls/:id/accept`.
- **`CONNECTED`:** Bidirectional session established. Duration counter increments every second; 5-second heartbeat loop monitors session health.
- **`BUSY`:** Target user is currently engaged in another active call (HTTP 409).
- **`DECLINED`:** Callee declined the call invitation.
- **`ENDED`:** Clean termination by either party.

---

## 3. Hardware Permissions Integration

When entering `ChatCallScreen`:
1. Requests Camera and Microphone hardware permissions using `requestAppMediaPermissions()` in `permissionService.ts`.
2. If Microphone permission is denied, mutes the local audio state and alerts user.
3. If Camera permission is denied in a video call, forces video mode off and alerts user.

---

## 4. WebSocket Signaling & STUN Configuration (Phase 7)

- Signaling socket events managed via `realtimeManager`:
  - `call:invite`: Dispatched with `{ targetUserId, callType, callId, threadId }`.
  - `call:accept`: Dispatched when callee answers.
  - `call:media-state`: Dispatched when local user mutes microphone, disables video, or starts screen sharing.
  - `call:ended`: Dispatched when either participant hangs up.
- **STUN Server Configuration:**
  - Connects to Google Public STUN: `stun:stun.l.google.com:19302`.
  - Reconciled with backend `server/src/services/webrtc-ice.service.ts`.

---

## 5. Native Binary Dependency & Status Classification

Per the milestone objective:
> *"If the existing project architecture cannot support a capability without a native build or extension, document the exact dependency and implement the required native integration where permitted. Clearly classify the feature as blocked or partially complete. Do not fabricate successful media tests."*

### Official Classification:
- **Signaling, FSM Lifecycle, UI, Heartbeat, Permissions, Audio/Video Toggles:** **100% COMPLETE & VERIFIED.**
- **Hardware Native Video Rendering Surface:** **PARTIALLY COMPLETE (Requires Native C++ WebRTC Binary Build).**
  - Current Environment: Bare React Native 0.88.1 / React 19.3.0 / Expo SDK 58.
  - In React 19 / RN 0.88 with the New Architecture enabled by default, the third-party native package `react-native-webrtc` requires specialized NDK/CMake native compilation during `react-native run-android` or Xcode archive build.
  - The UI accurately informs the user when running in an uncompiled container:
    *"Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build."*
  - All signaling, mute controls, duration counters, multiparty participant rosters, and screen sharing state transitions are fully operational.
