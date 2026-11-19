# MASTERHRMS MOBILE APP — API & SIGNALING CONTRACT VERIFICATION REPORT

**Document ID:** DOC-MOB-SIG-API-008  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** REST API Verification, WebSocket Signaling Contracts, STUN Configuration & Event Payloads  
**Status:** COMPLETED & VERIFIED (Zero Backend Changes Guaranteed)  

---

## 1. Executive Summary

This report documents the rigorous verification of all mobile REST endpoints and WebSocket signaling events utilized by the MasterHRMS chat, attachment, reaction, forwarding, deletion, calling, and screen sharing modules.

In accordance with strict safety rules:
- **ZERO modifications were made to `server/`, Prisma schemas, database migrations, or database tables.**
- All mobile client requests were designed to match existing, authoritative backend contracts established in `server/src/routes/chat.routes.ts` and `server/src/socket.ts`.

---

## 2. Verified REST API Contracts

| Route / Method | Mobile Caller Function | Request Payload / Query | Backend Response Contract | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/chat/messages/:id/react` | `ChatService.reactToMessage` | `{ emoji: string }` | `{ id, reactions: [...] }` | **VERIFIED** |
| `POST /api/chat/messages/:id/pin` | `ChatService.pinMessage` | `{}` | `{ id, isPinned: boolean }` | **VERIFIED** |
| `GET /api/chat/messages/:threadId/pinned` | `ChatService.getPinnedMessages` | None | `Array<ChatMessage>` | **VERIFIED** |
| `POST /api/chat/messages/forward-batch` | `ChatService.forwardMessageBatch` | `{ messageId: string, targetThreadIds: string[] }` | `{ forwardedCount: number }` | **VERIFIED** |
| `DELETE /api/chat/messages/:id` | `ChatService.deleteMessage` | `?mode=me` or `?mode=everyone&forEveryone=true` | `{ mode: 'me' \| 'everyone' }` | **VERIFIED** |
| `POST /api/chat/messages` | `ChatService.sendMessage` | `{ threadId, content, replyToId, attachments, ... }` | `{ message: ChatMessage }` | **VERIFIED** |
| `POST /api/chat/upload` | `ChatService.uploadAttachments` | `FormData` with `files` & `threadId` | `{ files: Array<ChatAttachment> }` | **VERIFIED** |
| `POST /api/calls/invite` | `ChatService.initiateCall` | `{ targetUserId, callType, callId, threadId }` | `{ data: { callId, status } }` | **VERIFIED** |
| `POST /api/calls/:id/accept` | `ChatService.acceptCall` | `{}` | `{ data: { status: 'connected' } }` | **VERIFIED** |
| `POST /api/calls/:id/reject` | `ChatService.rejectCall` | `{ reason: string }` | `{ ok: true }` | **VERIFIED** |
| `POST /api/calls/:id/cancel` | `ChatService.cancelCall` | `{}` | `{ ok: true }` | **VERIFIED** |
| `POST /api/calls/:id/end` | `ChatService.endCall` | `{ durationSeconds: number }` | `{ ok: true }` | **VERIFIED** |
| `POST /api/calls/:id/heartbeat` | `ChatService.sendCallHeartbeat` | `{}` | `{ active: boolean, status, peerLeft }` | **VERIFIED** |
| `POST /api/calls/:id/media-state` | `ChatService.updateCallMediaState` | `{ type: string, active: boolean }` | `{ ok: true }` | **VERIFIED** |
| `POST /api/chat/meetings/:id/media-state` | `ChatService.updateGroupMeetingMediaState`| `{ isMuted, isVideoOff, isScreenSharing }` | `{ ok: true }` | **VERIFIED** |

---

## 3. Verified WebSocket Signaling Events (`server/src/socket.ts`)

| Event Name | Direction | Payload Structure | Triggering Action / Effect |
| :--- | :--- | :--- | :--- |
| `call:invite` | Client -> Server -> Client | `{ callId, targetUserId, callType, threadId }` | Triggers callee incoming call notification / alert |
| `call:accepted` | Server -> Caller | `{ callId }` | Caller transitions from `RINGING` to `CONNECTED` |
| `call:rejected` | Server -> Caller | `{ callId, reason }` | Caller transitions to `DECLINED` |
| `call:busy` | Server -> Caller | `{ callId }` | Caller transitions to `BUSY` |
| `call:cancelled` | Server -> Callee | `{ callId }` | Dismisses callee ringing modal |
| `call:timeout` | Server -> Caller & Callee | `{ callId }` | Ends ringing after 30s no-answer |
| `call:ended` | Bidirectional | `{ callId }` | Both peers transition to `ENDED`, unmount PiP |
| `call:media-state` | Bidirectional | `{ callId, type: 'audio-mute' \| 'screen-share', active: boolean }` | Synchronizes mute and screen sharing between peers |
| `call:signal` | Bidirectional | `{ callId, targetUserId, signal: { sdp, candidate } }` | Exchanges WebRTC SDP offer/answer and ICE candidates |
| `group-call:media_state` | Broadcast | `{ callId, isMuted, isVideoOff, isScreenSharing }` | Updates multiparty meeting participant status |
| `chat:message_updated` | Broadcast | `{ threadId, message }` | Realtime emoji reaction updates |
| `chat:message_pinned` | Broadcast | `{ threadId, id, isPinned }` | Realtime pinned message updates |
| `chat:message_deleted` | Broadcast | `{ threadId, id, isDeletedForEveryone }` | Realtime message deletion updates |

---

## 4. STUN Configuration Verification

- Backend service: `server/src/services/webrtc-ice.service.ts`.
- Mobile configuration: STUN server defined as `stun:stun.l.google.com:19302`.
- Validated that mobile peer connection configuration requests STUN resolution from Google's high-availability STUN cluster when NAT traversal is required.
