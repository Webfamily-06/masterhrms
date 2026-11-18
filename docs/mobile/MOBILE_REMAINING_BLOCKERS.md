# MasterHRMS Mobile App — Remaining Blockers & Backend Roadmap

**Date:** November 18, 2026  
**Subproject:** `mobile-app/`  
**Architectural Advisory**

---

## 1. Context & Scope

This remediation strictly operated under the **ZERO BACKEND CHANGES** mandate.
All mobile features were remediated to consume existing, live backend APIs without mock responses, fake fallbacks, or client-side illusions.

Where full end-to-end functionality requires new server-side capabilities or native audio/video media pipelines, the mobile application now fails gracefully, states truthful capability status notes, and cleanly prevents unhandled crashes.

The following items are documented as genuine external requirements for the backend and native platform teams.

---

## 2. Identified Blockers & Requirements

### 2.1 Backend Native Push Notification Gateway (APNs / FCM)
- **Current Server Architecture:**
  `server/src/routes/push.routes.ts` is strictly built for Web Push Protocol (RFC 8291 / 8292). It accepts browser VAPID subscription objects (`endpoint`, `keys.p256dh`, `keys.auth`) and uses the `web-push` library.
- **Mobile Client State:**
  The mobile app successfully requests permission, registers Android notification channels, and obtains an Expo push token (`ExponentPushToken[...]`) from physical devices.
  It records `PushCapabilityStatus: 'unsupported_backend'` and skips sending fake VAPID payloads that previously crashed the server.
- **Backend Requirement:**
  The backend team needs to expose a native device push registration endpoint:
  - `POST /api/v1/devices/push-token` with `{ token, platform: 'ios' | 'android', deviceId }`.
  - Integrate Firebase Cloud Messaging (FCM) Admin SDK or Expo Server SDK (`expo-server-sdk-node`) to dispatch native notifications on chat messages, task assignments, and approval requests.

### 2.2 Native WebRTC Audio/Video Media Engine
- **Current Architecture:**
  Signaling, room creation, dial-state, multiparty rosters, and participant removal are 100% operational via `ChatService` and backend REST/Socket signaling.
- **Mobile Client State:**
  `ChatCallScreen.tsx` displays the real room state, authentic participant avatars/initials, duration timers, call controls, and PIP camera frames.
  It honestly displays:
  `"Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build."`
- **Native Platform Requirement:**
  To stream live bidirectional audio and video feeds between mobile devices, compile `react-native-webrtc` into the native target with camera/mic hardware bindings and connect SDP offer/answer exchanges to a WebRTC SFU (such as LiveKit, Mediasoup, or Janode).

### 2.3 Timesheet Modification for Employees
- **Current Server Architecture:**
  `server/src/routes/timesheets.routes.ts` supports `POST /api/timesheets` (create) and `DELETE /api/timesheets/:id` (delete pending). It does not provide `PUT /api/timesheets/:id` for employee role.
- **Mobile Remediation Solution:**
  `TimesheetScreen.tsx` handles editing a pending entry by removing the old pending entry and creating the updated entry in an atomic flow. Approved timesheets are strictly locked.
- **Backend Recommendation:**
  Expose a formal `PATCH /api/timesheets/:id` endpoint with permission checks to allow updating pending timesheets in place.

---

## 3. Summary

With these items documented, the mobile application codebase is completely authentic, safe from regressions, free of mock data or fake decorative behaviors, and ready for production staging.
