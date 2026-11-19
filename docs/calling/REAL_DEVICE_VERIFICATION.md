# MASTERHRMS Cross-Platform Real-Device Calling Verification Runbook

## 1. Prerequisites for Real-Device Media Testing

1. **Physical Devices**:
   - Device A: Physical Android phone (Android 10+) or iPhone (iOS 15+).
   - Device B: Desktop / Laptop browser (Chrome, Edge, or Safari) or second physical mobile device.
2. **Network Requirements**:
   - Both devices connected to internet or local WiFi with access to backend server port 3000 / Socket.IO.
   - Outbound UDP port 19302 open for STUN NAT traversal (`stun:stun.l.google.com:19302`).
3. **User Accounts**:
   - Two distinct user accounts within the same tenant (e.g., `user_alice` and `user_bob`).

---

## 2. Test Verification Matrix

### Test 1: Mobile-to-Web 1-on-1 Video Call
- **Action**: From Mobile App, open direct chat with Web user. Tap `Video Call` icon.
- **Mobile State**: Displays Outgoing Call Screen (`DIALING` -> `RINGING`) with caller ringback tone.
- **Web State**: Web browser chimes with synthesized dual-tone ringtone; incoming call banner/modal displays mobile user's avatar and name.
- **Acceptance**: Web user clicks `Accept`.
- **Media Flow**:
  - Web mounts `RTCPeerConnection` with local camera stream.
  - Call transitions to `CONNECTED` on both devices.
  - Duration counter starts.
  - Audio and video streams flow bidirectionally.
- **Controls Check**:
  - Mobile mutes microphone -> Web displays muted badge on mobile participant.
  - Web turns off video -> Mobile displays avatar placeholder.
- **Termination**: Either user taps `End Call` (red phone icon).
  - Both screens transition to `ENDED` and return cleanly to chat.
  - Camera indicator LED on laptop turns off immediately.
  - Call record is saved in Call History with actual duration.

---

### Test 2: Web-to-Mobile 1-on-1 Audio Call
- **Action**: From Web Chat, click phone icon on contact.
- **Web State**: Outgoing call dialog shows `Calling...`
- **Mobile State**:
  - If app in foreground: Incoming call modal pops up with Accept and Decline buttons.
  - If app in background: High-priority push notification / call channel alert delivered.
- **Acceptance**: Mobile user taps `Accept`.
- **Media Flow**: Call connects; audio flows bidirectionally.
- **Minimization (PiP)**: Mobile user taps Minimize icon.
  - Call contracts into a draggable `FloatingMiniCallWidget`.
  - User navigates to Calendar, Timesheets, and Tasks while continuing conversation.
  - Tapping Floating Widget restores full-screen call.

---

### Test 3: Call Rejection & Busy Concurrency
- **Action**: User A calls User B. User B taps `Decline`.
- **Result**: User A's dialer immediately stops ringing, displays `Declined`, and returns to chat. Call is logged as `rejected`.
- **Action**: User A calls User B while User B is already connected in a live call with User C.
- **Result**:
  - User A receives `call:busy`: *"User is currently on another call."*
  - User B receives an unobtrusive in-call toast: *"User A attempted to call you."*
  - User B's ongoing call with User C is **not** interrupted.

---

### Test 4: 60-Second No-Answer Timeout
- **Action**: User A calls User B. User B does not answer.
- **Result**:
  - After exactly 60 seconds, server terminates the ringing session.
  - Caller receives `call:timeout` and screen displays `No Answer`.
  - Both users see a `missed` call entry in their Call History tab.

---

### Test 5: Multiparty Group Call
- **Action**: From group chat, tap `Group Video Call`.
- **Participants**: 3+ team members receive group meeting invitation.
- **Result**:
  - Members join the meeting room.
  - Adaptive video grid arranges participants dynamically.
  - Active speaker spotlight detects speaking participant.

---

## 3. Empirical Automated & Integration Test Verification Results

### Mobile App Test Execution (`mobile-app/`)
```bash
$ npm run typecheck
> tsc --noEmit
# Exit code: 0 (Zero type errors)

$ jest --runInBand --forceExit
Test Suites: 13 passed, 13 total
Tests:       156 passed, 156 total
Snapshots:   0 total
Time:        1.659 s
# Key calling suites verified:
# - __tests__/calling_and_webrtc_lifecycle.test.tsx (10 passed)
# - __tests__/collaboration_shared_role_ui.test.tsx (passed)
# - __tests__/chat_messages_and_attachments.test.ts (passed)
# - __tests__/fcm_native_push_registration.test.ts (passed)
```

### Backend Call Lifecycle Service Tests (`server/src/tests/call-lifecycle.test.ts`)
```text
================================================================================
🧪 TESTING CALL LIFECYCLE SERVICE: ROW-LOCKING, DUAL-WRITE & CONCURRENCY
================================================================================
▶ [Test 1] Creating authoritative call session with dual-write history link...
  ✔ Call session created successfully.
  ✔ Linked CallHistoryRecord ID created atomically.
▶ [Test 2] Testing concurrent acceptance race condition (Simultaneous Accept)...
  ✔ Exactly 1 accept succeeded and 1 was atomically rejected as duplicate.
▶ [Test 3] Testing 30-second disconnect grace window & reconnection...
  ✔ Participant transitioned to RECONNECTING and was restored to JOINED upon reconnect.
▶ [Test 4] Testing termination with authoritative duration & history sync...
  ✔ Call terminated with duration: 6s. History updated.
▶ [Test 5] Testing idempotent duplicate termination...
  ✔ Duplicate termination handled idempotently with zero side effects.
================================================================================
✅ ALL CALL LIFECYCLE SERVICE TESTS PASSED EMPIRICALLY!
================================================================================
```

### Backend 16-Suite Chat & Calling Verification Tests (`server/src/tests/chat-calling-verification.test.ts`)
```text
================================================================================
🧪 RUNNING COMPREHENSIVE 16-SUITE VERIFICATION: CHAT & WEBRTC CALLING MODULE
================================================================================
▶ [Case 1] Valid caller can invite same-tenant user: ✔ Verified.
▶ [Case 2] Cross-tenant invitation is rejected: ✔ Verified (CALL_FORBIDDEN).
▶ [Case 3] Only intended receiver can accept: ✔ Verified.
▶ [Case 4] Third user cannot accept an active call: ✔ Verified (CALL_FORBIDDEN).
▶ [Case 5] Only caller can cancel a ringing call: ✔ Verified.
▶ [Case 6] Only receiver can reject a ringing call: ✔ Verified.
▶ [Case 7] Third user cannot reject or hang up another call: ✔ Verified.
▶ [Case 8] Cross-tenant user cannot send signal: ✔ Verified (CALL_FORBIDDEN).
▶ [Case 9] Signal target must be actual peer: ✔ Verified.
▶ [Case 10] Invalid media-state is rejected: ✔ Verified.
▶ [Case 11] Busy receiver’s existing call remains connected: ✔ Verified.
▶ [Case 12] Genuine Pusher + Socket duplicate incoming call deduplication: ✔ Verified.
▶ [Case 13] One tab disconnect does not end call when second socket connected: ✔ Verified.
▶ [Case 14] Final socket disconnect ends call and informs peer: ✔ Verified.
▶ [Case 15] Non-member cannot join group call: ✔ Verified.
▶ [Case 16] Non-member cannot send group call signal: ✔ Verified.
================================================================================
✅ ALL 16 CHAT & CALLING VERIFICATION TEST CASES PASSED EMPIRICALLY!
================================================================================
```

### Backend Multi-Participant Mesh & ICE Tests (`server/src/tests/multi-participant-meeting.test.ts`)
```text
================================================================================
🧪 RUNNING MULTI-PARTICIPANT WEBRTC MESH MEETING & ICE TEST SUITE
================================================================================
▶ [Test 1] WebRtcIceService free STUN-only configuration (no TURN / paid relay)...
  ✔ Free STUN-only ICE configuration verified (zero TURN, zero credentials).
▶ [Test 3] Socket meeting lifecycle: start, join, state_sync, media_state, leave, end...
  ✔ Host received server acknowledgement.
  ✔ group-call:incoming received via Socket.IO with idempotent eventId.
  ✔ Pusher fallback event dispatched with matching eventId for client deduplication.
  ✔ Member joined, state_sync delivered roster, host received user_joined.
  ✔ Cross-tenant meeting join rejected with CALL_FORBIDDEN.
  ✔ Media state updates (mute, screenshare) relayed to room.
  ✔ In-meeting user invitation delivered to colleague.
  ✔ Non-host end-meeting attempt rejected with CALL_FORBIDDEN.
  ✔ Host ended meeting for everyone; CallHistoryRecord persisted once with completed status.
================================================================================
✅ ALL MULTI-PARTICIPANT MEETING TESTS PASSED EMPIRICALLY!
================================================================================
```

### Backend Native Push Registration & Dispatch Tests (`server/src/tests/native-push-registration.test.ts`)
```text
================================================================================
🧪 RUNNING COMPREHENSIVE VERIFICATION: NATIVE PUSH REGISTRATION & DISPATCH
================================================================================
👉 SUITE 1: NativePushStore Registration & Token Deduplication
   ✅ Expo device token registered successfully
   ✅ Native FCM token registered successfully
   ✅ Retrieved active device tokens count matches expected
   ✅ Strict tenant isolation confirmed (0 cross-tenant leaks)
   ✅ Token rotation and device deduplication verified
👉 SUITE 2: Device Revocation & Expiration Lifecycle
   ✅ Device token revocation upon logout verified
   ✅ Token expiration handling verified
👉 SUITE 3: NativePushDispatcher Formatting & Dispatch Pipeline
   ✅ Expo Push payload construction and ticket resolution verified
   ✅ NotificationService.dispatchNativePush end-to-end integration verified
================================================================================
🎉 ALL 9 NATIVE PUSH REGISTRATION & BACKEND TESTS PASSED!
================================================================================
```

