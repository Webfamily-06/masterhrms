# MasterHRMS — Chat, 1-on-1 WebRTC Calling & SFU Multi-Participant Meeting Architecture

## 1. Executive Summary & Capabilities

MasterHRMS provides an enterprise-grade real-time communications module supporting:
- **Direct 1-on-1 & Group Messaging**: Rich text formatting, file attachments, emoji reactions, polls, message pinning, and delivery/read receipts.
- **1-on-1 WebRTC Audio & Video Calling**: Low-latency direct peer-to-peer media with dynamic track negotiation, device switching, screen sharing, and non-destructive busy-call intimations.
- **SFU Multi-Participant Meetings (LiveKit Integration)**: High-concurrency group meetings utilizing Selective Forwarding Unit (SFU) architecture with server-authoritative room state, cryptographically signed short-lived JWT access tokens, dynamic active-speaker detection, and STUN/TURN traversal.
- **Dual-Transport Realtime Resilience**: Socket.IO as primary sub-50ms transport, paired with Pusher Channels for guaranteed background notification delivery and mobile sleep recovery with deterministic event deduplication.
- **Responsive Meeting Stage Layouts**: WhatsApp-inspired multi-viewport responsive design adapting seamlessly across desktop (1440px+), tablet (1024px), and mobile (390px), featuring equal-size video grids, speaker spotlights, screen sharing stages, in-meeting chat/participant drawers, and floating Picture-in-Picture (PiP).

---

## 2. Multi-Transport Realtime Topology

```
+-----------------------------------------------------------------------------------------+
|                                      CLIENT LAYER                                       |
|     (CMS Next.js App Router / Next.js SPA — UnifiedChatApp & MultiParticipantMeeting)   |
+-----------------------------------------------------------------------------------------+
                    |                                          |
                    | (Primary Transport: WebSocket)           | (Fallback: HTTP Long-Poll / SSE)
                    v                                          v
+---------------------------------------+  +----------------------------------------------+
|        SOCKET.IO REALTIME SERVER      |  |                PUSHER CHANNELS               |
|         (server/src/socket.ts)        |  |     (server/src/services/pusher.service.ts)  |
|---------------------------------------|  |----------------------------------------------|
| - Authenticated via JWT handshake     |  | - Subscriptions:                             |
| - Tenant-isolated rooms (tenant:id)   |  |   * private-user-{userId}                    |
| - User-isolated rooms (user:id)       |  |   * private-tenant-{tenantId}                |
| - 1-on-1 WebRTC SDP & ICE exchange    |  | - Fallback for incoming calls, group meeting |
| - SFU Multi-Party Meeting signaling   |  |   invitations, missed calls & notifications  |
| - Authoritative 60s ringing timer     |  | - Canonical eventId deduplication in client  |
| - Non-destructive busy concurrency    |  | - Client binds via window event "hrms:pusher"|
+---------------------------------------+  +----------------------------------------------+
                    |
                    | SFU Room Token & Lifecycle Sync
                    v
+-----------------------------------------------------------------------------------------+
|                              SFU MEDIA LAYER (LIVEKIT)                                  |
|                         (server/src/services/meeting-sfu.service.ts)                    |
|-----------------------------------------------------------------------------------------|
| - Selective Forwarding Unit (SFU) for multi-participant video/audio routing             |
| - Short-lived HMAC-SHA256 JWT tokens with grant permissions per participant             |
| - Enterprise STUN / TURN NAT traversal (UDP/TCP/TLS fallback on port 443)               |
| - Client-side fallback diagnostics and setup guides when SFU credentials unconfigured   |
+-----------------------------------------------------------------------------------------+
```

### Event Routing & Deduplication Invariant
- Every call invitation (both 1-on-1 and multi-participant) generates a deterministic `callId` and `eventId`.
- The server broadcasts simultaneously over:
  1. Socket.IO user room: `user:${targetUserId}`
  2. Pusher private channel: `private-user-${targetUserId}`
- **Deduplication Logic**: The client keeps an active set of recent received `eventId` and `callId` keys. If an event is delivered over both channels, only the first arrival triggers the dialog and audio chime. Subsequent arrivals within 10 seconds are cleanly ignored.

---

## 3. 1-on-1 WebRTC Call Signaling & Busy Concurrency

### 1-on-1 State Machine
1. **Initiation (`call:invite`)**:
   - Caller selects Audio or Video call.
   - Client requests media permissions and generates a unique `callId`.
   - Server checks active calls registry (`activeCalls`).
   - If either participant is already on an active call, the server rejects the attempt with `call:busy`.
   - If free, the server tracks the session with a 60-second timeout and emits `call:incoming`.
2. **Acceptance (`call:accept`)**:
   - Callee accepts call. Server clears the timeout and notifies the caller via `call:accepted`.
   - Caller initiates SDP Offer (`createOffer`) and emits `call:signal`.
3. **Signaling Exchange (`call:signal`)**:
   - Offer / Answer SDP exchange and ICE Candidate trickle.
   - Every signaling payload requires `callId`, `targetUserId`, and valid authentication. The server strictly enforces tenant isolation: cross-tenant signaling attempts are immediately blocked with `CALL_FORBIDDEN`.
4. **Busy-Call Non-Destructive Invariant**:
   - When User A calls User B while User B is already on a live call with User C:
     - User A receives `call:busy`: *"User is currently on another call."* User A's dialer resets cleanly.
     - User B receives an advisory toast: *"User A tried to call you, but you were on another call."*
     - **Critical Invariant**: User B's live call session with User C is **never** terminated or disrupted by incoming busy notifications (`callId !== activeCallId`).

---

## 4. Multi-Participant SFU Meeting Architecture

### Why SFU Over Mesh Topology
In a peer-to-peer mesh topology, each participant must encode and send their video stream to every other participant, requiring $N \times (N - 1)$ connections. For a 6-person meeting, this requires 30 concurrent media streams, saturating uplink bandwidth and causing mobile device throttling.
The Selective Forwarding Unit (SFU) architecture connects each participant to a centralized media server with a single upstream connection:
- **Upstream**: 1 audio track + 1 video track (or screen share) sent to SFU.
- **Downstream**: SFU forwards optimized, selectively forwarded tracks to each participant based on active layout and viewport size.

### Meeting Lifecycle & Socket Signaling
The server coordinates the multi-participant meeting room state in memory (`activeMeetings` map in `server/src/socket.ts`):

1. **Start Meeting (`group-call:start`)**:
   - Host initiates meeting for a chat group with `groupId`, `groupTitle`, `callType`, and optional initial `participantIds`.
   - Server creates `ActiveMeetingSession` containing meeting ID, host info, tenant ID, and participant roster.
   - Invitation is dispatched via Socket.IO and Pusher to all group members.
2. **Join Meeting (`group-call:join`)**:
   - Callee accepts incoming invitation or joins an ongoing meeting from the chat header.
   - Server validates tenant context and adds member to meeting session.
   - Server responds to joining client with full `group-call:state_sync` (complete participant roster and current media states).
   - Server notifies existing room members via `group-call:user_joined`.
3. **Media State Updates (`group-call:media_state`)**:
   - Participants broadcast their mute, camera off, or screen sharing status (`isMuted`, `isVideoOff`, `isScreenSharing`).
   - Server broadcasts `group-call:user_media_state` to all room sockets.
4. **Invite Colleagues (`group-call:invite_users`)**:
   - Host or participants can invite additional tenant members mid-meeting.
   - Server verifies invited users belong to the same tenant and delivers invitations.
5. **Leave Meeting (`group-call:leave`)**:
   - Individual participant leaves. Server removes them from session roster and emits `group-call:user_left`.
   - If the leaving user was the last remaining participant, the meeting automatically terminates and records call history.
6. **End Meeting for Everyone (`group-call:end`)**:
   - Host can terminate meeting for all attendees.
   - Server emits `group-call:ended` to the entire room, forcing clients to close the dialog.
   - Server creates a single, idempotent `CallHistoryRecord` with status `completed` within `runWithTenantContext`.

### LiveKit SFU REST API & Token Issuance
- **Config & Health Endpoint**: `GET /api/chat/meetings/config`
  - Returns SFU configuration status (`configured: boolean`), server URL, and STUN/TURN ICE server list.
- **JWT Token Endpoint**: `POST /api/chat/meetings/:callId/token`
  - Generates a cryptographically signed HMAC-SHA256 JWT using `livekit-server-sdk`.
  - Token embeds claims: `room: callId`, `identity: userId`, `name: userName`, `metadata: { tenantId }`, and grant permissions (`roomJoin`, `canPublish`, `canSubscribe`).
  - Short token lifetime (15 minutes) guarantees token hygiene.
- **Participants Endpoint**: `GET /api/chat/meetings/:callId/participants`
  - Returns current live participant list from server memory.
- **End Meeting Endpoint**: `POST /api/chat/meetings/:callId/end`
  - Allows authenticated host to terminate meeting via HTTP API.

### STUN / TURN NAT Traversal
- **STUN**: Public Google STUN servers (`stun:stun.l.google.com:19302`) provide zero-cost public IP discovery for standard NAT.
- **TURN Relay**: For strict symmetric enterprise NAT and restrictive mobile firewalls, credentials are provisioned via environment variables:
  ```env
  LIVEKIT_TURN_URL=turn:turn.masterhrms.com:3478?transport=udp
  LIVEKIT_TURN_USERNAME=hrms_turn_user
  LIVEKIT_TURN_CREDENTIAL=hrms_turn_secret_key
  ```
- Clients receive TURN configuration via `/api/chat/meetings/config` and pass them into the WebRTC / LiveKit connection options.

### Graceful Fallback & Diagnostics Mode
When LiveKit credentials (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`) are not yet provisioned in the hosting environment:
- The backend serves `configured: false` with complete diagnostic guidance.
- The UI renders an informative diagnostic badge on the meeting stage and header:
  > *"SFU Server in Local Standby — LiveKit credentials not provisioned in .env. Video tiles operate with local simulated tracks for development and testing."*
- Full UI controls, grid layouts, spotlight switching, screen share toggles, participant drawers, and chat remain 100% operational.

---

## 5. Responsive Meeting UI & Interaction Specification

### 1. Viewport Adaptation
| Feature | Desktop (1440x900) | Tablet (1024x768) | Mobile (390x844) |
|---|---|---|---|
| **Layout** | Full Dialog (100vw, 100vh) | Full Dialog | Full Screen Adaptive |
| **Grid View** | 2-4 cols (Responsive CSS Grid) | 2 cols | 1-2 cols |
| **Spotlight View** | Large center stage + bottom strip | Large stage + bottom strip | Vertical stage + top strip |
| **Drawers** | Side slide-over (320px width) | Side slide-over (280px) | Full-width bottom sheet |
| **Toolbar** | Floating centered pill with labels | Floating pill | Scrollable bottom bar |
| **Touch Targets** | 44x44px minimum (`shrink-0`) | 44x44px minimum (`shrink-0`) | 44x44px strict compliance |
| **PiP Mode** | Floating draggable widget (320px) | Floating widget | Compact corner pill |

### 2. Equal-Size Video Grid
- Dynamic CSS grid class based on participant count:
  - 1 participant: `grid-cols-1`
  - 2 participants: `grid-cols-1 md:grid-cols-2`
  - 3-4 participants: `grid-cols-2`
  - 5-6 participants: `grid-cols-2 md:grid-cols-3`
  - 7+ participants: `grid-cols-3 md:grid-cols-4`
- Every tile features:
  - Video stream element or high-contrast fallback avatar with initials.
  - Active speaker voice detection: Animated green border ring and subtle outer glow (`ring-2 ring-emerald-500 shadow-emerald-500/20`).
  - Name badge with host crown icon and role indicator.
  - Mute indicator badge (`MicOff` icon).
  - Network connection quality bars (Good, Fair, Poor).

### 3. Active-Speaker Spotlight & Screen Sharing
- **Spotlight Mode**: Dominant center stage renders the active speaker or pinned participant. All other participants appear in a smooth horizontal filmstrip at the bottom of the screen.
- **Screen Sharing**: When a user shares their screen (`isScreenSharing = true`), the stage automatically promotes the presentation track to the main viewport with a high-visibility `"Stop Sharing Screen"` toolbar button.

### 4. Meeting Controls & Slide-Over Drawers
- **Toolbar Buttons**: Microphone toggle, Camera toggle, Screen share, Layout mode toggle (Grid vs. Spotlight), Device settings popover, Participants drawer, Chat drawer, and Leave/End Call.
- **Device Settings Popover**: Instant switching between detected microphones, cameras, and audio output speakers.
- **Participants Drawer**: Live attendee roster, host status badges, mute indicators, and `"Invite Colleagues"` button to invite additional tenant staff.
- **In-Meeting Quick Chat Drawer**: Integrated messaging stream enabling participants to chat and share notes without leaving the video viewport.
- **Picture-in-Picture (PiP)**: Minimizes the meeting into a floating non-blocking widget, enabling users to browse other HRMS workspace modules while maintaining continuous audio and call controls.

---

## 6. Empirical Verification & Test Evidence

### 1. Multi-Participant SFU Backend Test Suite (`npm run test:meeting`)
- **Location**: `server/src/tests/multi-participant-meeting.test.ts`
- **Results**: 100% PASS
  - Generates signed LiveKit JWT tokens with valid claims.
  - Provides diagnostic configuration errors when environment variables are unset.
  - Multi-user socket lifecycle: `group-call:start`, `join`, `state_sync`, `media_state`, `invite_users`, `leave`, `end`.
  - Enforces cross-tenant and non-host permissions (`CALL_FORBIDDEN`).
  - Persists exactly one `CallHistoryRecord` with status `completed` upon meeting conclusion.

### 2. 1-on-1 WebRTC Calling 16-Test Suite (`npm run test:calling`)
- **Location**: `server/src/tests/chat-calling-verification.test.ts`
- **Results**: 16/16 PASSED (100% Success Rate)
  - Validates caller-callee authorization, tenant isolation, signal relay, media state transitions, busy call rejection, non-destructive intimations, multi-tab resilience, and deduplication.

### 3. Playwright E2E Multi-Participant Meeting Suite
- **Location**: `scripts/verify_multi_participant_meetings_e2e.cjs`
- **Results**: 20/20 CHECKS PASSED (100% Success Rate)
  - Desktop Viewport (1440x900): Incoming call modal, Join action, Equal-size 4-participant grid, Active-speaker ring, SFU diagnostics banner, Speaker spotlight, Participants roster, In-meeting colleague invitation modal, In-meeting chat drawer, PiP minimize/restore.
  - Tablet Viewport (1024x768): Responsive grid adaptation and layout scaling.
  - Mobile Viewport (390x844): Floating toolbar rendering, touch targets measuring $\ge$ 44x44px.
- **Visual Evidence**: Captured screenshots in `docs/Saas/screenshots/group-meeting-verification/`:
  1. `01_desktop_incoming_group_meeting.png`
  2. `02_desktop_meeting_grid_view.png`
  3. `03_desktop_meeting_speaker_spotlight.png`
  4. `04_desktop_invite_colleagues_dialog.png`
  5. `05_desktop_in_meeting_chat.png`
  6. `06_desktop_meeting_pip_widget.png`
  7. `07_tablet_meeting_grid.png`
  8. `08_mobile_meeting_layout.png`
