# MASTERHRMS MOBILE APP — PRE-REMEDIATION AUDIT REPORT

**Audit Date**: November 18, 2026  
**Auditor**: Senior React Native Architect & SaaS Security Lead  
**Repository**: `Webfamily-06/masterhrms`  
**Mobile Directory**: `mobile-app/`  
**Base Commit**: `4fac38926a14843256b2e14a5ef8b5e6fb3f9cc4`  
**Remediation Branch**: `fix/mobile-production-remediation`  

---

## 1. Executive Summary

This forensic pre-audit analyzes the current state of the MasterHRMS mobile application prior to applying production-grade remediations. All findings have been verified against the physical codebase and backend route declarations.

The core architecture uses **React Native 0.88.1**, **React 19.3.0**, and **Expo SDK 58.0.25**. The backend is an existing Express / Prisma Node.js monolith with zero permitted backend modifications.

---

## 2. Itemized Audit Findings

### Finding 1: Incomplete Native Expo Module Autolinking
- **File(s)**:
  - `mobile-app/ios/Podfile` (Lines 17–34)
  - `mobile-app/android/settings.gradle` (Lines 1–6)
  - `mobile-app/android/app/src/main/java/com/com.masterhrms.app/MainApplication.kt` (Lines 10–27)
  - `mobile-app/ios/MasterHRMS/AppDelegate.swift` (Lines 1–11)
- **Severity**: **Critical (P0)**
- **Reproduction**:
  Run `cd mobile-app/ios && pod install` or build Android natively without Expo Go. In bare builds, Expo packages (`expo-image-picker`, `expo-document-picker`, `expo-location`, `expo-notifications`, `expo-sharing`) fail at runtime with `NativeModule cannot be null` because `use_expo_modules!` is never called in `Podfile`, and `useExpoModules()` is omitted from `settings.gradle`.
- **Proposed Fix**:
  1. Add `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")` and `use_expo_modules!` to iOS `Podfile`.
  2. Configure Expo Gradle autolinking in `android/settings.gradle` and `android/app/build.gradle`.
  3. Wrap ReactHost with `ReactNativeHostWrapper` and integrate `ApplicationLifecycleDispatcher` in `MainApplication.kt`.

---

### Finding 2: Fabricated VAPID Keys & Non-Existent Push Endpoint Call
- **File(s)**:
  - `mobile-app/src/core/services/pushNotificationService.ts` (Lines 81–101)
- **Severity**: **High (P1)**
- **Reproduction**:
  During login or push registration, `pushNotificationService` attempts to:
  1. POST to `/api/push/register` (returns HTTP 404; route does not exist on Express server).
  2. POST to `/api/notifications/push/subscribe` with dummy keys:
     ```json
     {
       "endpoint": "<fcm/expo_token>",
       "keys": {
         "p256dh": "mobile-app-fcm-native",
         "auth": "mobile-app-fcm-auth"
       }
     }
     ```
  3. When `incoming-call-push.service.ts` or `notification.service.ts` attempts to dispatch a Web Push payload via `web-push`, cryptographic encryption fails due to invalid P-256 elliptic curve keys.
- **Proposed Fix**:
  1. Remove calls to non-existent `/api/push/register`.
  2. Do not send invalid placeholder VAPID keys (`mobile-app-fcm-native`).
  3. Accurately report push capability status on mobile.
  4. Document the backend requirement for native FCM/APNs registration without altering backend contracts.

---

### Finding 3: Hardcoded Static Chennai Coordinates and Fake Live Location
- **File(s)**:
  - `mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx` (Lines 523–527, 929, 935–938, 2341–2345)
- **Severity**: **High (P1)**
- **Reproduction**:
  - Tapping "Open in Maps" executes hardcoded `maps:13.0827,80.2707` regardless of the actual coordinates received.
  - The location modal displays static text: `"MasterHRMS Headquarters, Tech Park, Chennai"` and `"13.0827° N, 80.2707° E"`.
  - Selecting "Live Location" takes a single one-off GPS reading via `getCurrentPositionAsync()` and sends a message labeled `"🔴 Live Location"` with no active tracking, no timer, no background tracking, and no stop button.
- **Proposed Fix**:
  1. Parse the actual latitude and longitude from the received message content and pass real coordinates to Apple Maps / Google Maps.
  2. Display real device coordinates and geocoded addresses in the modal.
  3. Reframe the feature honestly as **"Share Current Location"** with real GPS timestamp, accuracy, and coordinates.

---

### Finding 4: Fabricated Default Attachment File Sizes
- **File(s)**:
  - `mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx` (Lines 324, 416)
- **Severity**: **Medium (P1)**
- **Reproduction**:
  Camera and gallery uploads inject fake fallback sizes: `asset.fileSize || 300000` and `asset.fileSize || 250000`.
- **Proposed Fix**:
  Query the actual file size from the device filesystem (`expo-file-system` `getInfoAsync`) when `asset.fileSize` is undefined. Never invent hardcoded byte values.

---

### Finding 5: Fake Avatar Generation in Audio/Video Call Screen
- **File(s)**:
  - `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx` (Lines 85–86, 100–101)
- **Severity**: **Medium (P1)**
- **Reproduction**:
  When avatar is missing, `ChatCallScreen` generates synthetic Dicebear cartoon avatars (`api.dicebear.com/7.x/avataaars`) rather than using real employee profile data or initials.
- **Proposed Fix**:
  1. Retrieve actual participant profile details via `ChatService.getParticipantProfile()`.
  2. Render the real photo if present; otherwise render the participant's initials with brand background. Remove synthetic avatar generation.

---

### Finding 6: Timesheet Add Modal Inaccessible & Edit Creates Duplicates
- **File(s)**:
  - `mobile-app/src/modules/ess/screens/TimesheetScreen.tsx` (Lines 36, 98–103, 112–130, 277)
- **Severity**: **High (P1)**
- **Reproduction**:
  - The modal visibility is bound to `visible={Boolean(editingEntry)}`.
  - Tapping "Add Time Entry" executes `setEditingEntry(null)`, meaning `Boolean(editingEntry)` is `false` and the modal NEVER opens!
  - When editing an entry, `handleSaveEntry` calls `AttendanceService.createTimesheet(...)`, creating a new record instead of updating the existing one.
- **Proposed Fix**:
  1. Implement explicit state: `isModalVisible: boolean`, `formMode: 'create' | 'edit'`, and `selectedEntry: TimesheetItem | null`.
  2. Verify if the backend allows employee timesheet edits. If disallowed, display a truthful explanation and disable edit for approved entries.
  3. Remove hardcoded Leave statistic (`0`).

---

### Finding 7: Shift Schedule Hardcoded Values & Simulated Swap Request
- **File(s)**:
  - `mobile-app/src/modules/ess/screens/ShiftScheduleScreen.tsx` (Lines 40–60, 62–71)
- **Severity**: **High (P1)**
- **Reproduction**:
  - Roster days use hardcoded strings: `"General Day Shift"`, `"09:00 AM – 06:00 PM"`, Saturday half-day, Sunday off.
  - Submitting a swap request runs `Alert.alert('Shift Swap Request Sent', ...)` without issuing any network request.
- **Proposed Fix**:
  1. Wire `ShiftScheduleScreen` to `GET /api/v1/me/attendance/shifts` for actual assigned shifts and swap status.
  2. Wire the swap request submission to `POST /api/shifts/swaps` with genuine error handling and real API responses.

---

## 3. Implementation Roadmap

| Step | Target Phase | Files Involved |
| :--- | :--- | :--- |
| 1 | Phase 1: Expo Native Autolinking | `ios/Podfile`, `android/settings.gradle`, `android/app/build.gradle`, `MainApplication.kt` |
| 2 | Phase 2: Push Notifications | `src/core/services/pushNotificationService.ts` |
| 3 | Phase 3: Chat Media & Real GPS | `src/modules/chat/screens/ChatConversationDetailScreen.tsx` |
| 4 | Phase 4: Calling & Avatar Initials | `src/modules/chat/screens/ChatCallScreen.tsx` |
| 5 | Phase 5: Timesheet Screen Fixes | `src/modules/ess/screens/TimesheetScreen.tsx` |
| 6 | Phase 6: Shift Schedule & Real Swap | `src/modules/ess/screens/ShiftScheduleScreen.tsx` |
| 7 | Phase 7: Verification & Security | Across touched mobile components |
| 8 | Phase 8: Testing & Builds | `npm run typecheck`, `npm test`, native checks |
| 9 | Phase 10: Final Reports | `docs/mobile/MOBILE_*_VERIFICATION.md` |
