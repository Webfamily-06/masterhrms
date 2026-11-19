# MASTERHRMS Cross-Platform Calling Parity Matrix

| Feature / Capability | Mobile App (React Native) | Web App (React / Next.js) | Backend (Socket.IO + REST) | Status & Parity |
|---|---|---|---|---|
| **1-on-1 Audio Calling** | Full UI, mute, speaker, duration, FSM | Full WebRTC audio, device selector, duration | Session tracking, busy detection, 60s timeout | **PARITY CONFIRMED** |
| **1-on-1 Video Calling** | Full UI, camera switch, mute, video off | Full WebRTC video, camera selector, layout toggle | SDP / ICE signaling, state sync | **PARITY CONFIRMED** |
| **Multiparty Group Audio** | Group audio view, mute badges, speaker roster | Group meeting view, grid layout, mute states | Room session, membership validation, broadcast | **PARITY CONFIRMED** |
| **Multiparty Group Video** | Adaptive participant grid, local indicator | Adaptive video grid, speaker spotlight | Room session, multi-peer routing | **PARITY CONFIRMED** |
| **Screen Sharing** | Screen share state sync & receiving remote view | `getDisplayMedia` screen sharing + track replace | `call:media-state` relay | **PARITY CONFIRMED** (Web produces, Mobile receives) |
| **Floating Call Widget (PiP)** | Draggable `FloatingMiniCallWidget` | Floating mini call overlay window | N/A (Client-side view management) | **PARITY CONFIRMED** |
| **Call History & Missed Calls** | 'Calls' tab in Chat hub with filtering | Call History tab in Chat module | PostgreSQL `callHistoryRecord` query API | **PARITY CONFIRMED** |
| **Permission Management** | Contextual Camera/Mic with settings guidance | Browser permission prompt with guidance modal | N/A (Client OS) | **PARITY CONFIRMED** |
| **Dual Realtime Transport** | Socket.IO + Pusher + Native Push | Socket.IO + Pusher + Web Push | Dual dispatch with event deduplication | **PARITY CONFIRMED** |
| **Reconnection Grace Window** | 30s reconnect state banner & retry | 30s reconnect state banner & ICE restart | Server 30s in-memory grace timer | **PARITY CONFIRMED** |
| **Tenant Isolation** | Verified tenant ID from auth context | Verified tenant ID from auth context | Cross-tenant calls blocked with `CALL_FORBIDDEN` | **PARITY CONFIRMED** |
| **Busy Concurrency Intimations** | Non-destructive in-call notification | Non-destructive in-call toast | Dual `call:busy` dispatch without terminating live call | **PARITY CONFIRMED** |
