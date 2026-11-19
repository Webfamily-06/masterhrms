# MASTERHRMS Cross-Platform Audio & Video Calling Architecture

## 1. System Topology & Overview

MasterHRMS delivers a cross-platform real-time calling system connecting Mobile (React Native / Expo), Web (React / Next.js SPA), and Backend (Node.js / Express / Socket.IO / Prisma / PostgreSQL).

```
+----------------------------------------------------------------------------------------------------+
|                                            CLIENT LAYER                                            |
|   +-----------------------------------------------+    +---------------------------------------+   |
|   |         MASTERHRMS Web Application            |    |       MASTERHRMS Mobile App           |   |
|   |  - UnifiedChatApp                             |    |  - ChatConversationsScreen ('calls')  |   |
|   |  - DreamsVideoCallScreen                      |    |  - ChatConversationDetailScreen       |   |
|   |  - DreamsVoiceCallScreen                      |    |  - ChatCallScreen                     |   |
|   |  - FullScreenIncomingCall                     |    |  - FloatingMiniCallWidget             |   |
|   |  - FloatingMiniCallWidget                     |    |  - FullScreenIncomingCallModal        |   |
|   |  - IncomingCallContext (Synthesized Ringtone) |    |  - NotificationRealtimeBridge         |   |
|   +-----------------------------------------------+    +---------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
                                    |                                    |
                                    | WebSocket (Sub-50ms) / HTTP REST   |
                                    v                                    v
+----------------------------------------------------------------------------------------------------+
|                                    MASTERHRMS BACKEND SERVER                                       |
|                                                                                                    |
|   +---------------------------------------------+    +-----------------------------------------+   |
|   |          REST API LAYER (/api/calls)        |    |          REALTIME SIGNALING LAYER       |   |
|   |  - POST /api/calls/invite                   |    |            (server/src/socket.ts)        |   |
|   |  - POST /api/calls/:callId/accept           |    |  - call:invite / call:incoming          |   |
|   |  - POST /api/calls/:callId/reject           |    |  - call:accept / call:accepted          |   |
|   |  - POST /api/calls/:callId/cancel           |    |  - call:signal (SDP Offer/Answer/ICE)   |   |
|   |  - POST /api/calls/:callId/end              |    |  - call:media-state (Mute/Video/Screen) |   |
|   |  - POST /api/calls/:callId/signal           |    |  - call:ended / call:timeout / call:busy|   |
|   |  - POST /api/calls/:callId/media-state      |    |  - group-call:start / join / leave / end|   |
|   |  - POST /api/calls/:callId/heartbeat        |    +-----------------------------------------+   |
|   |  - GET  /api/calls/pending                  |                                                  |
|   |  - GET  /api/calls/ice-servers              |    +-----------------------------------------+   |
|   |  - GET  /api/chat/calls (History & Missed)  |    |         NOTIFICATION DISPATCH LAYER     |   |
|   +---------------------------------------------+    |  - IncomingCallPushService (Web Push)   |   |
|                                                      |  - NativePushDispatcher (Expo / FCM)    |   |
|   +---------------------------------------------+    |  - PusherService (Fallback Channel)     |   |
|   |      POSTGRESQL / PRISMA PERSISTENCE        |    +-----------------------------------------+   |
|   |  - Call model & CallParticipant model       |                                                  |
|   |  - CallHistoryRecord model                  |                                                  |
|   +---------------------------------------------+                                                  |
+----------------------------------------------------------------------------------------------------+
                                    |                                    |
                     Direct P2P WebRTC / SFU Media Streams (UDP/TCP/TLS) 
                                    v                                    v
+----------------------------------------------------------------------------------------------------+
|                                        MEDIA LAYER (WEBRTC)                                        |
|   - 1-on-1 Calls: Direct WebRTC PeerConnection with STUN/TURN NAT traversal (Google Public STUN)   |
|   - Multiparty Calls: WebRTC Mesh topology with dynamic track management & SFU integration hooks   |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Core Call Lifecycle State Machine

Both Mobile and Web enforce a deterministic finite state machine (FSM):

```
       [User initiates call]
                 |
                 v
             INITIATING
                 |
                 v
          PERMISSION_CHECK
                 |
                 +----(Permission Denied)----> PERMISSION_DENIED / ENDED
                 |
                 v
          REQUESTING_MEDIA
                 |
                 v
             SIGNALING
                 |
                 v
              RINGING <------------------(Incoming Call from Peer)
                 |                                    |
                 +----(Timeout 60s)----> MISSED       +----(User Declines)----> REJECTED
                 |                                    |
                 |                                    v
                 |                                ACCEPTING
                 |                                    |
                 +----------------(Peer Accepts)------+
                 |
                 v
            CONNECTING (SDP Offer / Answer & ICE Candidate Trickle)
                 |
                 v
             CONNECTED <============================================+
                 |                                                  |
                 +----(Network Drop)----> RECONNECTING (30s window) +
                 |                             |
                 |                             +--(Exhausted)--> FAILED
                 v
               ENDED (Clean termination by either peer)
```

### Lifecycle States:
- `IDLE`: No active call session.
- `INITIATING`: Generating call ID, validating target user, preparing session parameters.
- `PERMISSION_CHECK`: Contextually requesting Microphone (Audio Call) or Camera + Microphone (Video Call).
- `REQUESTING_MEDIA`: Acquiring local media streams (`getUserMedia` or native media tracks).
- `SIGNALING`: Emitting `call:invite` over Socket.IO and verifying peer availability.
- `RINGING`: Callee's devices are alerted; caller hears outgoing ringback tone. 60-second server-enforced timeout.
- `INCOMING`: Callee receives incoming call alert with caller avatar, name, and call type.
- `ACCEPTING`: User tapped Answer button; acknowledging session with backend.
- `CONNECTING`: WebRTC `RTCPeerConnection` exchanging SDP offer, answer, and ICE candidates.
- `CONNECTED`: Media tracks flowing; duration timer active; 5-second heartbeat loop monitoring connection health.
- `RECONNECTING`: Network interruption detected; 30-second server grace window allows automatic ICE restart without tearing down session.
- `NETWORK_DEGRADED`: High packet loss / RTT detected; visual banner alerts user.
- `ENDED`: Session terminated cleanly by either participant.
- `REJECTED`: Callee explicitly declined call invitation.
- `MISSED`: 60-second ringing timer expired with no response.
- `BUSY`: Target user is engaged in another active call (HTTP 409).
- `FAILED`: Media negotiation failed or reconnection window expired.

---

## 3. Media Architecture: 1-on-1 vs. Group Calls

### 1-on-1 Calls: Direct WebRTC PeerConnection
- **Topology**: Peer-to-peer (P2P).
- **Audio Codec**: Opus (48 kHz, high-fidelity speech).
- **Video Codec**: VP8 / H.264 (720p / 30 fps adaptive bitrate).
- **NAT Traversal**: STUN server resolution (`stun:stun.l.google.com:19302`) via `WebRtcIceService`.

### Group Multiparty Calls: Adaptive Mesh & SFU Hook
- **Topology**: Multi-peer WebRTC mesh for teams up to 6 participants.
- **Roster Synchronization**: Server-authoritative meeting state in `server/src/socket.ts` (`activeGroupCalls` / `activeMeetings`).
- **Media State**: In-call mute, camera off, and screen share synchronized across all participants via `group-call:media_state`.
- **SFU Integration**: Server includes architecture hooks for LiveKit SFU when concurrency demands exceed mesh capacity.

---

## 4. Multi-Transport Realtime Signaling & Push Notifications

To ensure calls are never missed regardless of client state:

1. **Foreground (Sub-50ms)**:
   - Primary transport is Socket.IO (`user:${userId}`).
   - Instant visual incoming call modal + synthesized ringtone chime.
2. **Background / Minimized**:
   - Web Push (VAPID RFC 8291) dispatches high-urgency push to service workers.
   - Native Mobile Push (FCM / APNs / Expo) triggers high-priority heads-up notification channel (`channelId: 'calls'`).
3. **Pusher Fallback**:
   - Secondary realtime socket channel (`private-user-${userId}`) with 10-second deduplication cache (`eventId` / `callId`) ensures recovery if primary WebSocket is reconnecting.
