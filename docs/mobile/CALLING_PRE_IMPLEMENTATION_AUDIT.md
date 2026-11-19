# MASTERHRMS — CALLING & UI QUALITY PRE-IMPLEMENTATION AUDIT

## 1. Executive Summary

This pre-implementation audit documents the architectural baseline, backend API contracts, native configuration, and UI issues across the MasterHRMS mobile application prior to implementing real WebRTC media streams, draggable Picture-in-Picture (PiP), granular permissions, and application-wide text clipping fixes.

- **Repository**: `Webfamily-06/masterhrms`
- **Mobile Directory**: `mobile-app/`
- **Active Branch**: `fix/mobile-production-remediation`
- **Baseline Git Commit**: `4092bef55cbfef7d8badb2480056db6e609a1e6a`
- **Architectural Policy**: Strictly ZERO backend modifications (`server/`, Prisma, migrations, or database schemas remain untouched). Mobile-first genuine native implementations.

---

## 2. Current Call Implementation Audit (`mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`)

### Findings:
1. **Signaling-Only Architecture**:
   - `ChatCallScreen.tsx` previously established signaling channels (`POST /api/calls/invite`, `POST /api/calls/:callId/accept`, `POST /api/calls/:callId/signal`) and state sync (`call:status`, `call:signal`), but did not attach live audio/video media tracks to an `RTCPeerConnection`.
   - The UI rendered simulated stream placeholders (mock audio waveforms, mock video canvas with blur and status indicators) instead of genuine WebRTC streams rendered through `<RTCView>`.

2. **Technical Clutter in Header / Active Call View**:
   - The active call header rendered debug-like strings: `"SECURE VIDEO CALL"`, `"Signaling connected via Socket.io / Pusher"`, and diagnostic connection quality tags (`"HD 1080p · 60fps"`, `"Latency 12ms"`).
   - A floating settings gear icon occupied screen space with redundant bitrate / codec selectors that confused end users during active calls.

3. **Avatar and Monogram Clipping**:
   - The caller avatar container exhibited text clipping on the 2-letter monogram (e.g., `SA`, `JD`) on Android devices due to missing `includeFontPadding: false` and rigid container height constraints.

4. **Picture-in-Picture (PiP)**:
   - A static PiP placeholder existed in the top-right corner without fluid `PanResponder` dragging, screen edge boundary clamping, or double-tap swap functionality between the local preview and remote peer streams.

5. **Screen Share & Group Call Layouts**:
   - Group calls rendered a fixed list or 2-column fallback without adaptive grid sizing based on participant count (1:1, 3-4, 5-8, 8+).
   - Screen sharing lacked the standard conferencing layout (~80% primary content stage and ~20% horizontal participant camera strip).

---

## 3. Native & Permission Architecture Audit

### 3.1 Permissions Audit (`mobile-app/src/core/services/permissionService.ts`):
- **iOS Blind Returns**:
  - `checkCameraPermission()` and `checkMicrophonePermission()` previously returned `true` immediately when `Platform.OS === 'ios'` without invoking native permission APIs.
- **Granular Separation**:
  - Audio/Voice calls must ONLY request microphone permissions (`android.permission.RECORD_AUDIO`, `expo-audio` recording permission). Under no circumstance should a voice-only call trigger camera authorization.
  - Video calls must request both camera and microphone permissions. If camera permission is denied or blocked while microphone is granted, the app must gracefully offer the user an audio-only fallback rather than crashing or terminating the call.

### 3.2 Native Manifests and App Configuration:
- `mobile-app/app.json`:
  - Needs explicit native permissions for camera, microphone, bluetooth connect, foreground services, and audio recording.
  - Needs `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` in `ios.infoPlist`.
- `mobile-app/android/app/src/main/AndroidManifest.xml`:
  - Verify inclusion of:
    - `android.permission.CAMERA`
    - `android.permission.RECORD_AUDIO`
    - `android.permission.MODIFY_AUDIO_SETTINGS`
    - `android.permission.BLUETOOTH_CONNECT`
    - `android.permission.FOREGROUND_SERVICE`
    - `android.permission.FOREGROUND_SERVICE_MICROPHONE`
    - `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION`

---

## 4. Backend Call API Contract Verification (Read-Only)

Backend inspection of `server/src/routes/call.routes.ts` and `server/src/controllers/call.controller.ts` reveals the following existing endpoints:

| Endpoint | Method | Payload / Response | Verification Status |
| :--- | :--- | :--- | :--- |
| `/api/calls/invite` | `POST` | `{ calleeId, conversationId, type: 'audio' \| 'video', isGroup? }` | Active & Verified |
| `/api/calls/:callId/accept` | `POST` | `{}` $\rightarrow$ Returns updated call status `accepted` | Active & Verified |
| `/api/calls/:callId/reject` | `POST` | `{ reason? }` $\rightarrow$ Returns status `rejected` | Active & Verified |
| `/api/calls/:callId/cancel` | `POST` | `{}` $\rightarrow$ Returns status `cancelled` | Active & Verified |
| `/api/calls/:callId/end` | `POST` | `{ duration? }` $\rightarrow$ Returns status `ended` | Active & Verified |
| `/api/calls/:callId/heartbeat` | `POST` | `{}` $\rightarrow$ Keeps call session alive | Active & Verified |
| `/api/calls/:callId/signal` | `POST` | `{ toUserId, signal }` $\rightarrow$ Relays SDP Offer/Answer/ICE via WebSocket | Active & Verified |
| `/api/calls/:callId/media-state` | `POST` | `{ type, active, targetUserId }` $\rightarrow$ Broadcasts media toggles | Active & Verified |
| `/api/calls/ice-servers` | `GET` | Returns `{ iceServers: [...] }` | Active & Verified |

### ICE Infrastructure Assessment:
- The backend `WebRtcIceService.getIceServers(userId)` endpoint returns public Google STUN servers:
  - `stun:stun.l.google.com:19302`
  - `stun:stun1.l.google.com:19302`
  - `stun:stun2.l.google.com:19302`
- **Crucial Finding**: The backend operates in `webrtc_mesh` mode with zero TURN relay servers configured. Pure P2P STUN works across direct/NAT networks, but symmetric NAT / enterprise firewall scenarios will require mobile WebRTC to gracefully handle connection timeouts and notify users if direct peer media fails to traverse.

---

## 5. Application-Wide Text Clipping & Layout Overflow Audit

An audit across `mobile-app/src/` identifies common patterns causing text truncation and layout overflow:
1. **`Text.tsx` & Typography (`mobile-app/src/theme/typography.ts`)**:
   - `includeFontPadding: false` was omitted on Android typography styles, causing descenders (g, y, p, q, j) and accents to clip on large font sizes.
   - Fixed heights (e.g., `height: 20`, `height: 48`) on containers holding dynamic text without `minHeight` or `flexShrink: 1`.
2. **Dashboard Cards & Badges**:
   - Status badges with fixed widths (e.g. `width: 70`) clipping longer status labels such as `"COMPLETED"`, `"IN PROGRESS"`, or localized strings.
3. **Todo, Gantt & Chat Conversation Lists**:
   - Multi-line titles and message previews clipping when user font scaling is enabled (Android Display Size / iOS Dynamic Type).
   - Avatar monograms (initials) offset vertically due to line-height mismatch.

---

## 6. Implementation Action Plan

1. **Native WebRTC Integration**: Install and link `react-native-webrtc`, add Android & iOS manifests/permissions.
2. **Permission Service**: Fix iOS permission checks and implement strict media permission separation (`requestAppMediaPermissions`).
3. **Chat Service Extensions**: Add `getIceServers()`, `sendCallSignal()`, and `syncMediaState()` to `ChatService`.
4. **ChatCallScreen Overhaul**:
   - Real `RTCPeerConnection` with local/remote `RTCView`.
   - Draggable PiP with clamping and double-tap swap.
   - Screen sharing layout (~80% content, ~20% camera strip).
   - Adaptive group call grid.
   - WhatsApp/FaceTime style compact circular controls.
   - Clean UI header and centered avatar monogram.
5. **Text & Typography Remediation**: Universal Android font padding fix and layout overflow protections.
6. **Verification & Testing**: Unit test suite expansion and full verification reports.
