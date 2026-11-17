# MASTERHRMS MOBILE — CHAT MIGRATION REPORT

**Date:** 2026-11-17  
**Module:** Chat, Group Collaboration, Calling & Multiparty Meetings  
**Source of Truth:** `src/components/chat/unified-chat-app.tsx` & `CMS/src/components/chat/unified-chat-app.tsx` (14,040 lines, 100% identical) + `server/src/routes/chat.routes.ts` & `call.routes.ts`  
**Mobile Implementation:**
- `mobile-app/src/components/workspace/WorkspaceModuleShell.tsx`
- `mobile-app/src/core/realtime/realtimeManager.ts`
- `mobile-app/src/core/storage/attachmentHelper.ts`
- `mobile-app/src/core/services/chatService.ts`
- `mobile-app/src/modules/chat/screens/ChatConversationsScreen.tsx`
- `mobile-app/src/modules/chat/screens/ChatConversationDetailScreen.tsx`
- `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`

---

## 1. Architecture & Non-Negotiable Rules Compliance

- **Single Shared UI:** `ChatConversationsScreen`, `ChatConversationDetailScreen`, and `ChatCallScreen` are mounted identically in `EmployeeNavigator`, `HrAdminNavigator`, `TenantAdminNavigator`, and `ManagerNavigator`. Zero role-duplicated Chat screens exist.
- **Zero Backend Modifications:** Reuses existing `/api/chat/*`, `/api/calls/*`, and `/api/pusher/*` endpoints without adding or altering any Express route, Prisma model, or database record.
- **Zero Simulated Delivery / Fake Timers:** Removed the prototype's simulated 2-second call connection timer and fake optimistic fallback messages. Failed message sends now enter an explicit `Not delivered` Retry/Discard queue, and calls transition strictly on real `/api/calls/*` and Socket.IO/Pusher events.
- **Tenant-Scoped Realtime & Cache Isolation:** Socket.IO (`/socket.io/?EIO=4&transport=websocket` with `40{"token":"<JWT>"}`) and Pusher (`private-user-{uid}`, `private-tenant-{tid}`) subscriptions join/leave rooms with reference counting (`chat:join` / `chat:leave`) and disconnect + purge React Query cache on tenant switch or logout.

---

## 2. Capability Verification Matrix (5-Tier Status)

| Capability | Implemented in Code | Unit Tested | API Contract Tested | Real-Device Tested | Not Tested / Blocked |
|---|---|---|---|---|---|
| Conversation list, unread badges, pin, mute, mark unread & archive | Yes (`ChatConversationsScreen.tsx`, `ChatService.getConversations`, `pinConversation`, `updateConversationPreferences`) | Yes (`collaboration_shared_role_ui.test.tsx`) | Yes (`collaboration_contracts_and_security.test.ts`) | No | Physical device / iOS Simulator blocked by sandbox `CoreSimulator` & local proxy |
| Direct messaging & participant info drawer | Yes (`ChatService.createDirectConversation`, `getParticipantProfile`) | Yes | Yes | No | Live device UI blocked by sandbox |
| Custom groups, Org-synced groups (`/hrms/group-templates`) & Announcement-only channels | Yes (`ChatConversationsScreen.tsx`, `ChatConversationDetailScreen.tsx` composer lock) | Yes (Employee locked vs HR Admin unlocked) | Yes | No | Live device UI blocked by sandbox |
| Contacts & organization directory | Yes (`activeTab === 'contacts'` with quick DM/Audio/Video) | Yes | Yes | No | Live device UI blocked by sandbox |
| Online presence & typing indicator | Yes (`GET/POST /api/chat/presence`, `presence:update`, `chat:typing`) | Yes (Engine.IO + dedup tests) | Yes | No | Multi-device live typing not run on physical handsets |
| Delivery (`✓✓`) & read receipts | Yes (`chat:delivered`, `chat:read`, `POST /messages/delivered`, `POST /messages/:threadId/read`) | Yes | Yes | No | Multi-device live receipt not run on physical handsets |
| Cursor pagination (`limit=25`, `before`) & thread/global search | Yes (`getMessagesPage`, `searchGlobal`, in-thread filter) | Yes | Yes | No | Live device scroll not run |
| Reply, batch forward, edit (`<=24h`), delete (`me` vs `everyone`), pin & emoji reactions | Yes (`ChatConversationDetailScreen.tsx`, `ChatService`) | Yes | Yes (`forwardMessageBatch`, `deleteMessage`) | No | Live device gesture not run |
| Attachment security policy, safe preview & authenticated download | Yes (`attachmentHelper.ts` blocks 55 exts, SVG/HTML, >30 MB, `javascript:`/`data:`/`file:`) | Yes (`collaboration_contracts_and_security.test.ts`) | Yes | No | Native OS file picker (`expo-document-picker`) not linked in bare `node_modules`; runtime guard surfaces clear notice |
| Voice notes playback & hardware guard | Yes (playback via `openOrShareAttachment`; honest hardware module check for mic capture) | Yes | Yes | No | Native audio recorder binary (`expo-av`) not linked in `mobile-app/package.json` |
| Interactive polls (create, vote, close) | Yes (`ChatConversationDetailScreen.tsx`, `votePoll`, `closePoll`) | Yes (poll vote interaction test) | Yes | No | Live device UI blocked by sandbox |
| Group membership, roles (`admin`/`moderator`/`member`), ownership transfer & invite links | Yes (`ChatConversationDetailScreen.tsx` Info Drawer) | Covered via service & role permission logic | Yes | No | Live device UI blocked by sandbox |
| 1:1 calls, mid-call colleague invite, multiparty meetings & Call Logs | Yes (`ChatCallScreen.tsx`, `WorkspaceModuleShell.tsx` incoming banner, Call Logs KPI & filters) | Yes | Yes | No | Native WebRTC media stream (`react-native-webrtc`) not linked; signaling & session APIs run against real backend with transparent UI notice |

---

## 3. Visual Evidence

- HR Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/chat_hr_admin_390x844.png`
- Tenant Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/chat_tenant_admin_390x844.png`
- Employee (`390x844` mounted RN tree render): `docs/mobile/screenshots/chat_employee_390x844.png`
