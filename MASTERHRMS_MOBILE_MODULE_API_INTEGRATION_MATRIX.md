# MASTERHRMS MOBILE — MODULE API & REALTIME INTEGRATION MATRIX

**Date:** 2026-11-17  
**Backend Modification Policy:** **0 backend routes added or modified.** All mobile collaboration modules integrate strictly with existing Express routes in `server/src/routes/{chat,call,pusher,calendar,todos,hr-collaboration,me-collaboration}.routes.ts` and existing Socket.IO / Pusher channels.  
**Transport & Auth:** Every HTTP call traverses `mobile-app/src/core/api/apiClient.ts` (`Authorization: Bearer <token>`, `X-Tenant-ID: <activeTenantId>`, automatic 401 refresh queue).

---

## 1. Chat & Organization Groups (`ChatService` — `mobile-app/src/core/services/chatService.ts`)

| Method | Distinct Backend Endpoint | Mobile Service Method | Consuming Screen(s) | Implemented | Unit Tested | API Contract Tested | Real-Device Tested |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/chat/presence` | `ChatService.getPresence` | `ChatConversationsScreen`, `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/presence` | `ChatService.updatePresence` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/conversations` | `ChatService.getConversations` | `ChatConversationsScreen`, `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/conversations/direct` | `ChatService.createDirectConversation` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/conversations/:threadId/pin` | `ChatService.pinConversation` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `PATCH` | `/api/chat/conversations/:threadId/preferences` | `ChatService.updateConversationPreferences` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/contacts` | `ChatService.getContacts` | `ChatConversationsScreen`, `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/participant/:userId` | `ChatService.getParticipantProfile` | `ChatConversationsScreen`, `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/groups` | `ChatService.getGroups` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups` | `ChatService.createGroup` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/groups/:groupId` | `ChatService.getGroupDetails` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `PATCH` | `/api/chat/groups/:groupId` | `ChatService.updateGroup` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/:groupId/archive` | `ChatService.archiveGroup` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/:groupId/mute` | `ChatService.muteGroup` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/:groupId/leave` | `ChatService.leaveGroup` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/:groupId/transfer-ownership` | `ChatService.transferGroupOwnership` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/:groupId/members` | `ChatService.addGroupMembers` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `PATCH` | `/api/chat/groups/:groupId/members/:userId/role` | `ChatService.updateGroupMemberRole` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `DELETE` | `/api/chat/groups/:groupId/members/:userId` | `ChatService.removeGroupMember` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/:groupId/invite-link` | `ChatService.generateGroupInviteLink` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `DELETE` | `/api/chat/groups/:groupId/invite-link` | `ChatService.revokeGroupInviteLink` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/groups/join-by-invite` | `ChatService.joinGroupByInvite` | `ChatConversationsScreen` | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/groups/:groupId/activity` | `ChatService.getGroupActivity` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/hrms/group-templates` | `ChatService.getOrgGroupTemplates` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/hrms/groups/from-org` | `ChatService.createGroupFromOrg` | `ChatConversationsScreen` | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/messages/:threadId` | `ChatService.getMessagesPage` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/messages/:threadId/files` | `ChatService.getThreadFiles` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/search` | `ChatService.searchGlobal` | `ChatConversationsScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/upload` | `ChatService.uploadAttachments` | `ChatConversationDetailScreen` | Yes | Yes (validation gate) | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages` | `ChatService.sendMessage` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `PATCH` | `/api/chat/messages/:id` | `ChatService.editMessage` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `DELETE` | `/api/chat/messages/:id` | `ChatService.deleteMessage` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/:id/pin` | `ChatService.pinMessage` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/:id/react` | `ChatService.reactToMessage` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/forward-batch` | `ChatService.forwardMessageBatch` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/:id/poll/vote` | `ChatService.votePoll` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/:id/poll/close` | `ChatService.closePoll` | `ChatConversationDetailScreen` | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/delivered` | `ChatService.markDelivered` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/messages/:threadId/read` | `ChatService.markThreadRead` | `ChatConversationDetailScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/calls` | `ChatService.getCalls` | `ChatConversationsScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `DELETE` | `/api/chat/calls/:id` | `ChatService.deleteCallLog` | `ChatConversationsScreen` | Yes | No | Yes | Blocked (sandbox) |

---

## 2. Audio/Video Calls, Multiparty Meetings & Realtime Auth (`ChatService` & `realtimeManager`)

| Method | Distinct Backend Endpoint | Mobile Consumer | Purpose | Implemented | Unit Tested | API Contract Tested | Real-Device Tested |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/calls/pending` | `WorkspaceModuleShell` | Global pending incoming 1:1 & group call recovery | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/invite` | `ChatService.initiateCall` | Start 1:1 audio/video call | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/calls/:callId/status` | `ChatService.getCallStatus` | Authoritative call session polling | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/accept` | `ChatService.acceptCall` | Accept incoming 1:1 call | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/reject` | `ChatService.rejectCall` | Decline incoming 1:1 call | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/cancel` | `ChatService.cancelCall` | Cancel outgoing ringing call | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/end` | `ChatService.endCall` | End active 1:1 call with duration | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/heartbeat` | `ChatService.sendCallHeartbeat` | Active call keepalive & peer-drop detection | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/media-state` | `ChatService.updateCallMediaState` | Sync mute / video / hold state | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/calls/:callId/invite-colleague` | `ChatService.inviteColleagueToCall` | Escalate 1:1 call to colleague | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/start` | `ChatService.startGroupMeeting` | Start multiparty group meeting | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/:callId/join` | `ChatService.joinGroupMeeting` | Join multiparty group meeting | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/chat/meetings/:callId/participants` | `ChatService.getGroupMeetingParticipants` | List live meeting participants | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/:callId/media-state` | `ChatService.updateGroupMeetingMediaState` | Sync meeting mic/camera state | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/:callId/invite` | `ChatService.inviteUsersToGroupMeeting` | Invite members into live meeting | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/:callId/remove` | `ChatService.removeGroupMeetingParticipant` | Host/admin remove participant | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/:callId/leave` | `ChatService.leaveGroupMeeting` | Leave group meeting | Yes | No | Yes | Blocked (sandbox) |
| `POST` | `/api/chat/meetings/:callId/end` | `ChatService.endGroupMeetingForAll` | Host/admin end meeting for all | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/pusher/config` | `realtimeManager` | Fetch tenant/server Pusher key & cluster | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/pusher/auth` | `realtimeManager` | Authorize `private-user-{uid}` & `private-tenant-{tid}` | Yes | Yes | Yes | Blocked (sandbox) |

---

## 3. Calendar & Composite HR / Employee Projections (`CalendarService` — `mobile-app/src/core/services/calendarService.ts`)

| Method | Distinct Backend Endpoint | Mobile Service Method | Purpose | Implemented | Unit Tested | API Contract Tested | Real-Device Tested |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/calendar/categories` | `CalendarService.getCategories` | List default + custom categories | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/categories` | `CalendarService.createCategory` | Create custom category | Yes | Yes | Yes | Blocked (sandbox) |
| `PUT` | `/api/calendar/categories/:id` | `CalendarService.updateCategory` | Update custom category | Yes | No | Yes | Blocked (sandbox) |
| `DELETE` | `/api/calendar/categories/:id` | `CalendarService.deleteCategory` | Delete custom category | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/calendar/events` | `CalendarService.getEvents` | Range-bounded events + recurrence expansion + Todo projections | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/v1/hr/calendar/events` | `CalendarService.getCompositeEvents('hr')` | Read-only HR projections (holidays, leaves, birthdays, interviews) | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/v1/me/calendar/events` | `CalendarService.getCompositeEvents('me')` | Read-only ESS projections (holidays, own leaves, tasks) | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/events` | `CalendarService.createEvent` | Create event (RRULE, room, reminders, shares, `ignoreConflicts`) | Yes | Yes | Yes | Blocked (sandbox) |
| `PUT` | `/api/calendar/events/:id` | `CalendarService.updateEvent` | Update single occurrence (`this_occurrence`) or series (`all`) | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/events/:id/cancel` | `CalendarService.cancelEvent` | Soft-cancel occurrence or series | Yes | Yes | Yes | Blocked (sandbox) |
| `DELETE` | `/api/calendar/events/:id` | `CalendarService.deleteEvent` | Hard-delete owned event | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/events/:id/rsvp` | `CalendarService.rsvpEvent` | Invitee RSVP (`accepted`/`declined`/`tentative`) | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/events/:id/share` | `CalendarService.shareEvent` | Grant `view`/`edit` share to colleague | Yes | Yes | Yes | Blocked (sandbox) |
| `DELETE` | `/api/calendar/events/:id/share/:recipientId` | `CalendarService.revokeEventShare` | Revoke colleague share | Yes | No | Yes | Blocked (sandbox) |
| `GET` | `/api/calendar/rooms` | `CalendarService.getRooms` | List tenant meeting rooms | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/check-conflicts` | `CalendarService.checkConflicts` | Pre-save room & attendee conflict check | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/calendar/recurrence/preview` | `CalendarService.previewRecurrence` | Preview next recurring occurrences | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/calendar/eligible-recipients` | `CalendarService.getEligibleRecipients` | Tenant-scoped share directory | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/calendar/events/:id/audit-logs` | `CalendarService.getEventAuditLogs` | Event audit history timeline | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/calendar/export/ics` | `CalendarService.exportCalendarIcs` | Authenticated `.ics` feed export + native `Share` | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/calendar/events/:id/export/ics` | `CalendarService.exportSingleEventIcs` | Single event `.ics` export + native `Share` | Yes | Yes | Yes | Blocked (sandbox) |

---

## 4. Todo & Gantt Timeline (`TodoService` — `mobile-app/src/core/services/todoService.ts`)

Both **Todo (`TodoListScreen`)** and **Gantt Timeline (`GanttTimelineScreen`)** share 100% of the same `/api/todos/*` endpoints and React Query cache keys (`['todos']`, `['todo-categories']`, `['todo-assignees']`):

| Method | Distinct Backend Endpoint | Mobile Service Method | Consuming Screen(s) | Implemented | Unit Tested | API Contract Tested | Real-Device Tested |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/todos` | `TodoService.getTodos` | `TodoListScreen`, `GanttTimelineScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/todos` | `TodoService.createTodo` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskFormModal`) | Yes | Yes | Yes | Blocked (sandbox) |
| `PUT` | `/api/todos/:id` | `TodoService.updateTodo` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskInspectorSheet` & `TodoTaskFormModal`) | Yes | Yes | Yes | Blocked (sandbox) |
| `DELETE` | `/api/todos/:id` | `TodoService.deleteTodo` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskInspectorSheet`) | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/todos/:id/checklist` | `TodoService.addChecklistItem` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskInspectorSheet`) | Yes | Yes | Yes | Blocked (sandbox) |
| `PATCH` | `/api/todos/:id/checklist/:itemId` | `TodoService.toggleChecklistItem` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskInspectorSheet`) | Yes | Yes | Yes | Blocked (sandbox) |
| `DELETE` | `/api/todos/:id/checklist/:itemId` | `TodoService.deleteChecklistItem` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskInspectorSheet`) | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/todos/:id/comments` | `TodoService.addComment` | `TodoListScreen`, `GanttTimelineScreen` (`TodoTaskInspectorSheet`) | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/todos/assignees` | `TodoService.getAssignees` | `TodoTaskFormModal` (Todo & Gantt) | Yes | Yes | Yes | Blocked (sandbox) |
| `GET` | `/api/todos/categories` | `TodoService.getCategories` | `TodoListScreen`, `GanttTimelineScreen` | Yes | Yes | Yes | Blocked (sandbox) |
| `POST` | `/api/todos/categories` | `TodoService.createCategory` | `TodoCategoryManagerModal` | Yes | Yes | Yes | Blocked (sandbox) |
| `PUT` | `/api/todos/categories/:id` | `TodoService.updateCategory` | `TodoCategoryManagerModal` | Yes | No | Yes | Blocked (sandbox) |
| `DELETE` | `/api/todos/categories/:id` | `TodoService.deleteCategory` | `TodoCategoryManagerModal` | Yes | No | Yes | Blocked (sandbox) |

---

## 5. Realtime WebSocket Protocol Matrix (`mobile-app/src/core/realtime/realtimeManager.ts`)

| Transport | Endpoint / Channel | Client Emits | Subscribed Server Events | Cleanup Guarantee |
|---|---|---|---|---|
| **Socket.IO v4 (Engine.IO v4 WebSocket)** | `ws(s)://<host>/socket.io/?EIO=4&transport=websocket` (`40{"token":"<JWT>"}`) | `join-tenant`, `chat:join`, `chat:leave`, `chat:typing`, `chat:stop-typing`, Engine.IO pong `3` | `chat:message`, `chat:message-edited`, `chat:message-deleted`, `chat:message-pinned`, `chat:message-reaction`, `chat:poll-updated`, `chat:delivered`, `chat:read`, `chat:conversation-updated`, `chat:typing`, `chat:stop-typing`, `chat:presence`, `chat:group-created`, `chat:group-updated`, `chat:group-member-added`, `chat:group-member-removed`, `chat:group-member-role-updated`, `call:incoming`, `call:accepted`, `call:rejected`, `call:ended`, `call:cancelled`, `call:busy`, `call:media-state`, `group-call:incoming`, `group-call:participant-joined`, `group-call:participant-left`, `group-call:ended`, `calendar:event-created`, `calendar:event-updated`, `calendar:event-cancelled`, `calendar:event-deleted`, `calendar:event-shared`, `calendar:share-revoked`, `calendar:rsvp-updated`, `calendar:reminder`, `notification:new` | Ref-counted `joinThread()` emits `chat:leave` on screen unmount/thread switch; `disconnectAll()` closes socket & clears listeners/timers on tenant switch and logout |
| **Pusher v7 WebSocket** | `private-user-{userId}`, `private-tenant-{tenantId}` (authorized via `POST /api/pusher/auth`) | `pusher:subscribe`, `pusher:ping` | Dual-transport Chat, Call (`call.incoming` normalized to `call:incoming`), Group Meeting, Calendar, and Notification events deduplicated against Socket.IO within a 4s window | Closed & cleared by `disconnectAll()` on tenant switch and logout |
