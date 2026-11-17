# MasterHRMS Mobile — Known Gaps, Platform Constraints & Recommendations

**Repository**: `Webfamily-06/masterhrms`  
**Execution Timestamp**: 2026-11-18  
**Scope**: Documented platform constraints, missing backend contracts, and technical boundaries (strictly respecting the rule prohibiting backend modification).  

---

## 1. Executive Summary

This report provides a transparent, empirical audit of known platform constraints, hardware requirements, and server dependencies. None of these items represent client code defects; rather, they reflect external platform boundaries and backend contract expectations that require separate explicit authorization.

---

## 2. Platform Constraints & External Dependencies

### 2.1 Native WebRTC Hardware Drivers (`react-native-webrtc`)
- **Current Status**: 
  - Complete REST signaling lifecycle is implemented and tested (`DIALING -> RINGING -> ACCEPTING -> CONNECTED -> ENDED`).
  - Active call screen gracefully detects `typeof RTCPeerConnection === 'undefined'` and informs the user:
    > *"Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build."*
- **Constraint**: Pure Expo Go or uncompiled JS environments do not include compiled C++ WebRTC native drivers.
- **Resolution Path**: Compile a custom development client build (`npx expo run:android` or `npx expo run:ios`) with `react-native-webrtc` when peer-to-peer raw RTP video streams are required in production testing.

### 2.2 Background VoIP Call Wake-Up via FCM Admin SDK
- **Current Status**:
  - The mobile app registers its FCM/APNs device token via `POST /api/push/register`.
  - Foreground calls are delivered immediately via Pusher WebSockets.
- **Constraint**:
  - When the device is locked or the app is killed, the OS terminates WebSocket sockets.
  - The Express backend (`server/`) currently dispatches Web Push (`web-push` npm with VAPID) for browsers, but lacks an initialized `firebase-admin` dispatcher to send high-priority data payloads to native device tokens.
- **Resolution Path**: When backend modifications are authorized, configure `firebase-admin` with the tenant service account to send high-priority data notifications on `POST /api/calls/initiate`.

### 2.3 Background Geolocation Tracking (Continuous Worker)
- **Current Status**:
  - Foreground GPS geolocation, reverse geocoding, and attendance clock-in/out geofencing validation are fully implemented via `expo-location`.
  - Realtime map view in `LiveLocationTrackingScreen.tsx` tracks position changes while the screen is open.
- **Constraint**:
  - Continuous 24/7 background location tracking when the app is minimized requires background location permissions (`ACCESS_BACKGROUND_LOCATION` on Android, `Always` on iOS) and background task definitions (`TaskManager.defineTask`).
- **Resolution Path**: Add background location task definition if company policy mandates background employee route tracking outside working hours.

### 2.4 Server-Side File Upload Size Limits
- **Current Status**:
  - `ChatService.uploadAttachments()` sends multipart files to `POST /api/chat/upload`.
  - Client side validates file sizes and displays progress indicators.
- **Constraint**:
  - Very large files (>50MB) require chunked uploads or direct S3 pre-signed upload URLs to avoid Express `body-parser` timeouts.
- **Resolution Path**: Backend should consider introducing an S3 presigned URL endpoint (`POST /api/storage/presigned-url`) for enterprise file sharing.

---

## 3. Strict Architecture Compliance

Per user instruction:
- **No Express backend files were modified**.
- **No Prisma schemas or migrations were altered**.
- **No mock workarounds were created to mask backend gaps**.
- All gaps are documented with empirical evidence for backend roadmap alignment.
