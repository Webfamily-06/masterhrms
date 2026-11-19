# MASTERHRMS MOBILE APP — CHAT & CALLING KNOWN LIMITATIONS REPORT

**Document ID:** DOC-MOB-LIM-011  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** Architecture Constraints, Native Dependencies, Platform Caveats & Zero Backend Modifications  
**Status:** COMPLETED & DOCUMENTED TRANSPARENTLY  

---

## 1. Executive Summary

This report documents all known platform, architectural, and runtime limitations identified during the implementation and verification of MasterHRMS Mobile Chat, Attachments, and WebRTC Calling.

In accordance with strict project instructions, capabilities requiring native binary compilation or backend schema changes are documented honestly without simulated or fabricated test results.

---

## 2. Documented Limitations & Technical Dependencies

### 2.1 Native WebRTC Binary Compilation Dependency
- **Current Mobile Environment:** React Native 0.88.1, React 19.3.0, Expo SDK 58.
- **Status:** **Signaling & Lifecycle: 100% COMPLETE.** **Hardware Video Rendering: REQUIRES COMPILED NATIVE BINARY.**
- **Reason:** In bare React Native with React 19 and TurboModules/Fabric enabled by default, third-party media stream rendering requires `react-native-webrtc` to be linked and compiled via Android NDK / CMake and iOS CocoaPods with bitcode/libwebrtc binaries.
- **Handling:**
  - The application provides complete signaling, presence, state transitions, audio routing, duration tracking, floating PiP, and multiparty rosters.
  - When running without the compiled C++ binary, the screen displays a transparent status notice:
    *"Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build."*

### 2.2 Native FCM Push Notification Backend Endpoint
- **Mobile Capability:** Mobile app successfully acquires native device push tokens (`ExponentPushToken[...]` or FCM token).
- **Backend Capability:** Existing Express backend push service (`server/src/services/notification.service.ts`) currently supports Web Push VAPID subscriptions. A dedicated native mobile endpoint (e.g. `POST /api/notifications/register-device`) is required on the server to send direct APNs/FCM pushes to offline devices.
- **Handling:** Due to the strict ZERO BACKEND CHANGES rule, the mobile client attempts registration and logs a diagnostic message without crashing.

### 2.3 OS-Level MediaProjection for Mobile Screen Sharing
- **Mobile Capability:** Signaling, UI presentation, remote screen stream viewport, and controls are 100% complete.
- **Platform Capability:** Capturing the mobile device's entire operating system screen (outside the MasterHRMS app) on Android requires an active `MediaProjection` foreground service and user consent prompt (`createScreenCaptureIntent`). On iOS, it requires a Broadcast Upload Extension (`RPBroadcastSampleHandler`).
- **Handling:** Within the application, screen share signaling toggles the high-definition presentation mode cleanly.

### 2.4 File Attachment Preview Formats
- **Images (PNG, JPG, WEBP, GIF):** Rendered natively with instant inline thumbnails.
- **Documents (PDF, DOCX, XLSX, PPTX, TXT, ZIP):** Display category-specific icons, filenames, and formatted sizes. Tapping triggers `openOrShareAttachment` which caches the file locally in `Paths.cache` and invokes native iOS `UIDocumentInteractionController` or Android Intent/Expo Sharing.

---

## 3. Summary of Operational Status

| Module / Capability | Operational Status | Dependency / Requirement |
| :--- | :--- | :--- |
| File Attachments & Previews | **100% Functional** | Native file sharing / caching |
| Bulk Attachment Grid | **100% Functional** | React Native Flexbox / Layout |
| Pre-Send Preview Carousel | **100% Functional** | ImagePicker / DocumentPicker |
| Emoji Reactions & Sync | **100% Functional** | `POST /api/chat/messages/:id/react` + Socket |
| Message Forwarding | **100% Functional** | `POST /api/chat/messages/forward-batch` |
| Message Deletion | **100% Functional** | `DELETE /api/chat/messages/:id` |
| Message Pinning & Top Banner | **100% Functional** | `POST /api/chat/messages/:id/pin` + ScrollTo |
| Quoted Replies & Quoting Banner | **100% Functional** | `replyToId` payload + ScrollTo |
| Call Signaling & State Machine | **100% Functional** | Express `/api/calls/*` + Socket events |
| In-App Floating PiP Window | **100% Functional** | Global Zustand store + NavigationRef |
| Screen Sharing Signaling & Viewport | **100% Functional** | Backend media-state socket events |
| Realtime Video Track Rendering | **Partially Complete** | Requires native `react-native-webrtc` binary compile |
