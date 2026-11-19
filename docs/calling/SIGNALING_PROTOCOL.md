# MASTERHRMS WebRTC Signaling Protocol Specification

The real-time signaling protocol enables low-latency connection establishment, state synchronization, ICE candidate exchange, and error handling over WebSocket connections managed by Socket.IO (`server/src/socket.ts`).

---

## 1. Socket Authentication & Rooms

- Every client connection authenticates via Bearer JWT in the handshake query or `auth` payload:
  `socket = io(SERVER_URL, { auth: { token: ACCESS_TOKEN } });`
- Upon validation, the socket joins:
  - `user:${userId}` — private direct message and call signaling channel.
  - `tenant:${tenantId}` — tenant-wide broadcasts.
- For active group meetings, sockets join room:
  - `group_call_${callId}`.

---

## 2. 1-on-1 Call Signaling Flow

```
Caller (Client A)                 Server (Socket.IO)                  Callee (Client B)
       |                                   |                                   |
       |------- 1. call:invite ----------->|                                   |
       |        {targetUserId, callType}   |                                   |
       |                                   |------- 2. call:incoming --------->|
       |<------ 3. call:ringing -----------|        {callerId, callType}       |
       |                                   |                                   |
       |                                   |<------ 4. call:accept ------------|
       |<------ 5. call:accepted ----------|        {callId}                   |
       |        {callId}                   |                                   |
       |                                   |                                   |
       |------- 6. call:signal (Offer) --->|                                   |
       |        {signal: {sdp}}            |------- 7. call:signal (Offer) --->|
       |                                   |                                   |
       |                                   |<------ 8. call:signal (Answer) ---|
       |<------ 9. call:signal (Answer) ---|        {signal: {sdp}}            |
       |                                   |                                   |
       |<====== 10. ICE Candidates (Trickle exchanged bidirectionally) =======>|
       |                                   |                                   |
       |<======================= 11. MEDIA CONNECTED =========================>|
       |                                   |                                   |
       |------- 12. call:media-state ----->|                                   |
       |        {type, active}             |------- 13. call:media-state ----->|
       |                                   |                                   |
       |------- 14. call:ended ----------->|                                   |
       |        {durationSeconds}          |------- 15. call:ended ----------->|
```

---

## 3. Detailed Event Schemas

### 3.1 Initiation (`call:invite`)
- **Sender**: Caller
- **Payload**:
  ```ts
  {
    callId: string;
    targetUserId: string;
    callType: "audio" | "video";
    threadId?: string;
  }
  ```
- **Server Action**:
  - Checks if caller or callee is currently in `activeCalls`.
  - If busy, emits `call:busy` to caller.
  - If free, tracks call in memory with 60-second timeout, dispatches `call:incoming` to `user:${targetUserId}`, sends Web Push / FCM notifications.

---

### 3.2 Incoming Call (`call:incoming`)
- **Recipient**: Callee
- **Payload**:
  ```ts
  {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    callType: "audio" | "video";
    threadId?: string;
    tenantId: string;
  }
  ```

---

### 3.3 Acceptance (`call:accept`)
- **Sender**: Callee
- **Payload**:
  ```ts
  {
    callId: string;
    targetUserId: string; // The caller's user ID
  }
  ```
- **Server Action**: Clears 60-second timeout; transitions state to `connected`; emits `call:accepted` to caller.

---

### 3.4 Signal Forwarding (`call:signal`)
- **Sender**: Caller or Callee
- **Payload**:
  ```ts
  {
    callId: string;
    targetUserId: string;
    signal: {
      type?: "offer" | "answer";
      sdp?: string;
      candidate?: RTCIceCandidateInit;
    };
  }
  ```
- **Server Action**:
  - Validates tenant isolation.
  - Forwards directly to `user:${targetUserId}` as `call:signal`.

---

### 3.5 Media State Sync (`call:media-state`)
- **Sender**: Either peer
- **Payload**:
  ```ts
  {
    callId: string;
    type: "audio-mute" | "video-mute" | "screen-share";
    active: boolean;
  }
  ```
- **Server Action**: Forwards to peer to update remote UI badges and indicators.

---

### 3.6 Reconnection Grace Window (`call:participant:reconnecting`)
- When a socket abruptly disconnects during a live call:
  - The server holds a **30-second reconnect grace timer**.
  - Emits `call:participant:reconnecting` with `{ callId, userId, graceSecondsRemaining: 30 }` to the remaining peer.
  - If the disconnected client reconnects within 30 seconds and calls `/api/calls/:callId/reconnect`, the session is restored without teardown.
  - If the timer expires, the server tears down the call and emits `call:ended`.

---

## 4. Group Multiparty Events (`group-call:*`)

- `group-call:start` — `{ callId, groupId, groupTitle, callType, participantIds }`
- `group-call:join` — `{ callId }`
- `group-call:leave` — `{ callId, durationSeconds }`
- `group-call:end` — `{ callId }` (Host only)
- `group-call:media_state` — `{ callId, isMuted, isVideoOff, isScreenSharing }`
- `group-call:invite` — `{ callId, targetUserIds }`
- `group-call:kick` — `{ callId, targetUserId }` (Host only)
