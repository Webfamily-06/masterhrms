# MASTERHRMS Calling REST API Contract

All calling endpoints require Bearer JWT authentication and enforce strict multi-tenant isolation. Client-supplied tenant IDs are rejected; tenant identity is derived solely from the verified session context.

---

## 1. Call Lifecycle Endpoints (`/api/calls`)

### 1.1 Initiate Call / Invite
- **Path**: `POST /api/calls/invite`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "targetUserId": "usr_998877",
    "callType": "audio" | "video",
    "callId": "call_171000111222",
    "threadId": "th_445566"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "callId": "call_171000111222",
      "status": "ringing",
      "targetUserId": "usr_998877",
      "callType": "video",
      "startedAt": "2026-11-19T02:00:00.000Z"
    }
  }
  ```
- **Conflict Response (`409 Conflict`)**:
  ```json
  {
    "success": false,
    "code": "CALL_BUSY",
    "error": "User is currently on another call."
  }
  ```

---

### 1.2 Accept Call
- **Path**: `POST /api/calls/:callId/accept`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{}`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "callId": "call_171000111222",
      "status": "connected",
      "acceptedAt": "2026-11-19T02:00:05.000Z"
    }
  }
  ```

---

### 1.3 Reject Call
- **Path**: `POST /api/calls/:callId/reject`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "reason": "declined" | "busy" | "unavailable"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Call rejected successfully."
  }
  ```

---

### 1.4 Cancel Call (Caller before answer)
- **Path**: `POST /api/calls/:callId/cancel`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{}`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Call cancelled by caller."
  }
  ```

---

### 1.5 End Call (Active session termination)
- **Path**: `POST /api/calls/:callId/end`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "durationSeconds": 145
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Call ended successfully."
  }
  ```

---

### 1.6 WebRTC Signal Forwarding (REST Fallback)
- **Path**: `POST /api/calls/:callId/signal`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "targetUserId": "usr_998877",
    "signal": {
      "type": "offer" | "answer" | "candidate",
      "sdp": "v=0...",
      "candidate": { ... }
    }
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true
  }
  ```

---

### 1.7 Media State Synchronization
- **Path**: `POST /api/calls/:callId/media-state`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "type": "audio-mute" | "video-mute" | "screen-share",
    "active": true
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true
  }
  ```

---

### 1.8 Call Heartbeat
- **Path**: `POST /api/calls/:callId/heartbeat`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{}`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "active": true,
    "status": "connected",
    "peerLeft": false
  }
  ```

---

### 1.9 Check Pending Ringing Calls (App Resume Recovery)
- **Path**: `GET /api/calls/pending`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "hasPendingCall": true,
    "data": {
      "callId": "call_171000111222",
      "callerId": "usr_112233",
      "callerName": "Jane Smith",
      "callerAvatar": "https://...",
      "callType": "video",
      "threadId": "th_445566",
      "startedAt": "2026-11-19T02:00:00.000Z",
      "isAdditionalParticipant": false
    }
  }
  ```

---

### 1.10 Fetch STUN / TURN ICE Servers
- **Path**: `GET /api/calls/ice-servers`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" }
      ],
      "mode": "webrtc_mesh"
    }
  }
  ```

---

## 2. Call History & Missed Calls (`/api/chat/calls`)

### 2.1 Query Call History
- **Path**: `GET /api/chat/calls`
- **Query Parameters**:
  - `page`: default `1`
  - `limit`: default `50`
  - `callType`: `"all" | "audio" | "video"`
  - `status`: `"all" | "completed" | "missed" | "rejected" | "busy"`
  - `direction`: `"all" | "incoming" | "outgoing"`
  - `search`: search by contact name, email, or phone
- **Success Response (`200 OK`)**:
  ```json
  {
    "calls": [
      {
        "id": "rec_001",
        "callSessionId": "call_171000111222",
        "callerId": "usr_112233",
        "callerName": "Jane Smith",
        "callerAvatarUrl": "https://...",
        "receiverId": "usr_998877",
        "receiverName": "John Doe",
        "receiverAvatarUrl": "https://...",
        "callType": "video",
        "direction": "incoming",
        "status": "completed",
        "durationSeconds": 145,
        "callTime": "2026-11-19T02:00:00.000Z",
        "contactName": "Jane Smith",
        "contactAvatarUrl": "https://..."
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
  ```

---

### 2.2 Delete Call Record
- **Path**: `DELETE /api/chat/calls/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Call record deleted successfully"
  }
  ```
