# WebRTC Source Removal & Codebase Decoupling Report

**Milestone:** Complete Mobile WebRTC Removal & Startup Crash Remediation  
**Scope:** Source Code Cleanup & Architectural Decoupling  
**Date:** 2026-11-19  

---

## 1. Overview of Removed Files & Architecture Decoupling

To eliminate all code pathways leading to WebRTC native module lookups, obsolete calling components, screens, and stores were completely deleted rather than commented out or masked with try/catch blocks.

### Deleted Obsolete Calling Files
1. `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx` (Deleted)
   - Contained WebRTC peer connection management, `RTCPeerConnection`, `RTCView`, media stream acquisition (`mediaDevices.getUserMedia`, `mediaDevices.getDisplayMedia`), signaling handlers, audio/video controls, and call timers.
2. `mobile-app/src/components/chat/FloatingCallPiP.tsx` (Deleted)
   - Contained floating Picture-in-Picture window for active call sessions with drag gestures and mini `RTCView`.
3. `mobile-app/src/store/callStore.ts` (Deleted)
   - Zustand store tracking active call state, peer ID, call status, duration, and minimized PiP state.
4. `mobile-app/__tests__/webrtc_calling_and_permissions.test.tsx` (Deleted)
   - Unit tests dedicated to WebRTC call rendering and mock `RTCView`.

---

## 2. Navigation Decoupling

All navigation stacks previously statically linked `ChatCallScreen`:
- [RootNavigator.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/app/navigation/RootNavigator.tsx):
  - Removed `FloatingCallPiP` import and root-level overlay mounting.
- [HrAdminNavigator.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/modules/navigation/HrAdminNavigator.tsx):
  - Removed `ChatCallScreen` import and `<Stack.Screen name="ChatCall" component={ChatCallScreen} />`.
- [TenantAdminNavigator.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/modules/navigation/TenantAdminNavigator.tsx):
  - Removed `ChatCallScreen` import and `<Stack.Screen name="ChatCall" component={ChatCallScreen} />`.
- [ManagerNavigator.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/modules/navigation/ManagerNavigator.tsx):
  - Removed `ChatCallScreen` import and `<Stack.Screen name="ChatCall" component={ChatCallScreen} />`.
- [EmployeeNavigator.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/modules/navigation/EmployeeNavigator.tsx):
  - Removed `ChatCallScreen` import and `<Stack.Screen name="ChatCall" component={ChatCallScreen} />`.
- [navigation.types.ts](file:///Users/apple/Documents/hrms/mobile-app/src/types/navigation.types.ts):
  - Removed `ChatCall` route definition from `SharedCollaborationModuleParamList`.

---

## 3. UI Component & Screen Cleanups

### Workspace Shell ([WorkspaceModuleShell.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/components/workspace/WorkspaceModuleShell.tsx))
- Removed incoming call listeners (`call:incoming`, `group-call:incoming`, `call:accepted`, etc.).
- Removed incoming call polling fallback loop.
- Removed floating incoming call banner and fullscreen `<Modal>` for call acceptance/rejection.
- Removed unused imports and styles.

### Chat Conversation Detail Screen ([ChatConversationDetailScreen.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx))
- Removed Audio Call (`Phone`) and Video Call (`Video`) action buttons from the chat header.
- Removed Call buttons from the Contact Details side drawer modal.
- Removed `activeGroupCallId` state, meeting banner, and group meeting listeners.
- Preserved all messaging features: text input, WhatsApp-style multi-image album, document attachments, voice notes playback, replies, reactions, pins, and deletion.

### Chat Conversations Screen ([ChatConversationsScreen.tsx](file:///Users/apple/Documents/hrms/mobile-app/src/modules/chat/screens/ChatConversationsScreen.tsx))
- Changed workspace switcher from 4 tabs (`Personal | Groups | Contacts | Call Logs`) to 3 tabs (`Personal | Groups | Contacts`).
- Removed `callsQuery` React Query hook and `deleteCallMutation`.
- Removed Call Logs KPI cards, call status filters (`All | Completed | Missed`), call records list, and call detail action modal.
- Removed audio/video call quick-action buttons from contact cards in the Contacts tab (retaining direct message button).
- Cleaned up obsolete styles (`callFiltersRow`, `kpiGrid`, `callDetailActions`, etc.).

---

## 4. Core Services & Realtime Cleanups

### Chat Service ([chatService.ts](file:///Users/apple/Documents/hrms/mobile-app/src/core/services/chatService.ts))
- Removed `CallLogItem` interface.
- Removed calling API methods: `initiateCall`, `getCallStatus`, `acceptCall`, `rejectCall`, `cancelCall`, `endCall`, `sendCallHeartbeat`, `getIceServers`, `sendCallSignal`, `updateCallMediaState`, `syncMediaState`, `inviteColleagueToCall`, `startGroupMeeting`, `joinGroupMeeting`, `getGroupMeetingParticipants`, `updateGroupMeetingMediaState`, `inviteUsersToGroupMeeting`, `removeGroupMeetingParticipant`, `leaveGroupMeeting`, `endGroupMeetingForAll`, `getCalls`, `deleteCallLog`.
- Retained full messaging suite: conversations list, direct chat creation, group chats, announcements, attachment upload, pinned messages, reactions, message deletion, search, and polling.

### Realtime Manager ([realtimeManager.ts](file:///Users/apple/Documents/hrms/mobile-app/src/core/realtime/realtimeManager.ts))
- Removed `IncomingCallSignal` interface.
- Removed call signal event deduplication and call event normalization (`call.incoming -> call:incoming`).

### Permission Service ([permissionService.ts](file:///Users/apple/Documents/hrms/mobile-app/src/core/services/permissionService.ts))
- Removed `CallPermissionsResult` interface and `canFallbackToAudio`.
- Removed `requestCallMediaPermissions`.
- Simplified `requestAppMediaPermissions`.
- Updated camera permission rationale from "video calling and taking photos" to "taking profile & attachment photos".
- Updated microphone permission rationale from "voice calling and recording audio" to "recording voice notes".
