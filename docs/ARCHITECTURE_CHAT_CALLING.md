# MasterHRMS — Chat & Real-Time Calling Architecture

## 1. Executive Summary & Capabilities

MasterHRMS features an integrated real-time communications module supporting:
- Direct 1-on-1 and Group instant messaging with rich attachments, emoji reactions, polls, and delivery/read receipts.
- Peer-to-Peer (P2P) WebRTC 1-on-1 Voice and Video Calling.
- Screen sharing with prioritized remote layout and compact self-preview.
- Responsive WhatsApp-style 3-screen navigation on mobile, dual-pane on tablet, and 3-pane on desktop.
- Dual-transport resilience: Socket.IO as primary low-latency transport, and Pusher as secondary notification and fallback transport.

---

## 2. Multi-Transport Realtime Topology

```
+-----------------------------------------------------------------------------------------+
|                                      CLIENT LAYER                                       |
|  (CMS Next.js App Router & Vite SPA Clients — UnifiedChatApp & useRealtimeSocket)        |
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
| - WebRTC SDP & ICE Candidate exchange |  | - Fallback for incoming calls, missed calls, |
| - Authoritative 60s ringing timer     |  |   chat messages, and system notifications    |
| - Call state machine & concurrency    |  | - Client binds via window event "hrms:pusher"|
+---------------------------------------+  +----------------------------------------------+
```

### Event Routing & Deduplication
- **Socket.IO** is the primary transport for signaling and active session management.
- **Pusher** delivers events as a fallback (e.g. when mobile browser throttles background WebSockets or during network transitions).
- Incoming call events share a canonical `callId`. The client deduplicates invitations by tracking `incomingCall.callId`: identical incoming invitations from both transports are deduplicated so only one modal dialog and ringtone are activated.

---

## 3. WebRTC Call Signaling Lifecycle & Concurrency Invariants

### State Machine
1. **Initiation (`call:invite`)**:
   - Caller emits `call:invite` with `targetUserId`, `callType` ("audio" | "video"), and generated `callId`.
   - Server checks active calls registry (`activeCalls`).
   - If either caller or callee is in an active/ringing call, server rejects with `call:busy`.
   - If available, server starts authoritative 60-second timeout and delivers `call:incoming` via Socket.IO and Pusher.
2. **Acceptance (`call:accept`)**:
   - Callee accepts call. Server cancels timeout, marks session as `connected`, and informs caller via `call:accepted`.
   - Caller creates SDP Offer (`createOffer`) and emits `call:signal`.
3. **Signaling Exchange (`call:signal`)**:
   - SDP Offer -> Callee sets remote description -> Callee creates SDP Answer -> Caller sets remote description.
   - Trickle ICE candidates are queued until remote description is set, then drained.
   - Every signaling packet contains `callId`, `senderId`, `targetUserId`, and the payload.
   - The server cryptographically validates tenant membership and verifies both users belong to the active call session before forwarding signals.
4. **Busy-Call Semantics & Non-Destructive Invariant**:
   - If user A calls user B, and user B is currently on a live call:
     - User A receives `call:busy` with explanation: *"User is currently on another call."* User A's dialer resets.
     - User B receives an advisory intimation (`call:busy` with `requestedByName`): *"Another incoming call was blocked because you are already in a call."*
     - **Critical Invariant**: User B's active call is NEVER terminated, cleaned up, or disrupted by the incoming busy event (`callId !== activeCallId`).

---

## 4. Hardware Constraints & Media Device Preservation

### Audio Constraints
```ts
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  deviceId: selectedAudioInputId ? { exact: selectedAudioInputId } : undefined,
}
```

### Video Constraints
```ts
video: {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 30 },
  deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined,
}
```

### DOM Mounting & Stream Attachment
- Radix UI Dialog components mount DOM elements lazily upon opening.
- Video stream attachment uses dual-layer binding:
  1. Callback refs (`ref={(el) => { if (el && stream) el.srcObject = stream; }}`) ensure zero-latency stream attachment the exact microtask the element is created.
  2. A reactive `useEffect` handles track state changes (camera toggles, screen sharing, device switches).

---

## 5. Architectural Boundaries & Future Roadmap

### 1. Peer-to-Peer 1-on-1 vs Group Calling (SFU Requirement)
- Current calling implementation uses **1-on-1 direct RTCPeerConnection**.
- P2P mesh topology does NOT scale for group calls: N participants require $N \times (N - 1)$ video streams, rapidly overwhelming client uplink bandwidth and mobile CPU.
- In-call participant invitation is disabled with an explicit requirement disclosure:
  > *"Multi-participant calls require LiveKit/mediasoup SFU and TURN deployment. This call will remain one-to-one."*

- **Future Architecture Requirements for Production Multi-Party Calling**:
  1. **LiveKit or mediasoup SFU**: Deploy a dedicated Selective Forwarding Unit cluster for selective track forwarding, simulcast, and dynacast bitrate adaptation.
  2. **TURN Service**: Dedicated coturn or managed Cloudflare Calls/Twilio TURN relay for strict symmetric NAT and corporate firewall traversal.
  3. **CallRoom and CallParticipant Persistence**: Schema models to track room states, participant join/leave timestamps, media permissions, and bandwidth stats.
  4. **Short-Lived Media Tokens**: Cryptographically signed JWT tokens (TTL: 5-15 minutes) authorizing participant connection to a specific SFU room.
  5. **Server-Authoritative Participant Membership**: Centralized server-side participant admission, mute enforcement, kick, and host controls.
  6. **Multi-Stream Participant Layouts**: Adaptive grid, active-speaker spotlight mode, and pagination for 10+ concurrent video streams.
  7. **Active Speaker Detection**: Server-side or client VAD (Voice Activity Detection) and audio level indicators with dynamic speaker switching.
  8. **Simultaneous Screen-Share Plus Camera Tracks**: Multi-track publishing enabling concurrent presentation and presenter face-cam.

### 2. NAT Traversal & Production Relay (STUN vs TURN)
- Current setup configures public Google STUN servers (`stun:stun.l.google.com:19302`) for direct P2P hole punching.
- In symmetric NAT environments (corporate firewalls, strict enterprise Wi-Fi, certain cellular carriers), direct P2P connections cannot traverse NAT.
- **Production Recommendation**:
  - Deploy a TURN relay server (e.g., **coturn**, **Twilio Network Traversal Service**, or **Cloudflare Calls**).
  - Add TURN credentials to `RTCIceServer` configuration in `server/src/socket.ts` and client `peerConnectionRef`.

### 3. Mobile Picture-in-Picture (PiP) & Background Audio
- Web browsers on iOS and Android enforce strict power-saving and background execution policies.
- HTML5 Video Picture-in-Picture (`video.requestPictureInPicture()`) is enabled where supported by mobile browser engines.
- True OS-level background calls (CallKit on iOS, ConnectionService on Android) with persistent lockscreen controls require a native mobile application container (React Native or Flutter) utilizing the WebRTC Native SDK.

