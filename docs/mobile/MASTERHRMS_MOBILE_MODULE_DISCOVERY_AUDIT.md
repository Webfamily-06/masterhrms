# MasterHRMS Mobile — Phase 0 Forensic Source Discovery Audit
## Modules: Chat, Calendar, Todo & Gantt Timeline

**Generated**: 2026-11-17  
**Scope**: Read-only forensic source inspection across `src/` (TanStack SPA), `CMS/src/` (Next.js App Router), `server/src/` (Express + Prisma + Socket.IO + Pusher), and `mobile-app/src/` (React Native CLI + TypeScript + Expo SDK 58).

---

## 0. Executive Parity Summary (`src/` vs `CMS/src/` vs Pre-Migration `mobile-app/src/`)

### 0.1 Web Source Trees (`src/` vs `CMS/src/`)
| Source File | `src/` Lines | `CMS/src/` Lines | Diff Status | Authoritative Baseline Notes |
|---|---:|---:|---|---|
| `components/chat/unified-chat-app.tsx` | 14,040 | 14,040 | **0 diff lines** | 100% byte-for-byte identical. Single source of truth for Chat, Group Admin, Calling & Call History. |
| `components/chat/multi-participant-meeting-dialog.tsx` | 1,995 | 1,995 | **0 diff lines** | 100% identical WebRTC mesh multiparty meeting UI. |
| `components/chat/emoji-picker.tsx` & `emoji-data.ts` | 248 / 709 | 248 / 709 | **0 diff lines** | 100% identical categorized emoji picker & catalog. |
| `context/incoming-call-context.tsx` | 792 | 792 | **0 diff lines** | Global incoming call state, `/api/calls/pending` recovery, ringtone & Realtime sync. |
| `components/calendar/unified-calendar-app.tsx` | 3,302 | 3,450 | **Responsive UI diff only** | Queries, mutations & business logic are 100% identical. `CMS/src/` adds mobile `<Sheet>` filter drawer, `List` default on `<640px`, sticky modal footers & `data-testid`s. |
| `components/calendar/organization-member-selector.tsx` | 384 | 384 | **0 diff lines** | 100% identical debounced org directory search + `view`/`edit` share selector. |
| `components/todo/unified-todo-app.tsx` | 2,465 | 2,516 | **Bugfix & mobile Sheet diff** | Queries, mutations & API contracts 100% identical. `CMS/src/` fixes Gantt task inspector drawer (`<Sheet>`) and sticky left column on touch viewports. |
| `components/todo/gantt-timeline-view.tsx` | 16 | 16 | **0 diff lines** | Thin wrapper `<UnifiedTodoApp initialView="gantt" title="Todo Gantt Timeline" />`. |

### 0.2 Pre-Existing `mobile-app/src/` Baseline Audit (Before Migration)
Inspection of `mobile-app/src/` revealed early prototype/skeleton screens that do **not** yet satisfy web parity or strict non-fabrication rules:
- `mobile-app/src/modules/chat/screens/ChatConversationsScreen.tsx`, `ChatConversationDetailScreen.tsx`, `ChatCallScreen.tsx` & `chatService.ts`:
  - Missing realtime Socket.IO / Pusher subscriptions, presence polling, typing indicators, read/delivery ticks, cursor pagination, message search, forward-batch, delete-for-me vs delete-for-everyone, group admin/roles/invite-links/announcement-only lock, org group templates, attachment uploads/signed-URL downloads, voice notes, poll creation/closing, call logs tab, and multiparty meetings.
  - **Defect found**: `ChatCallScreen.tsx` (lines 22–25) contained `setTimeout(() => setCallState('CONNECTED'), 2000)` simulated call connection without calling `/api/calls/*` — must be replaced with real backend `/api/calls/*` lifecycle & signaling.
  - **Defect found**: `ChatConversationDetailScreen.tsx` (line 311) showed a static `Alert.alert('Attachment', ...)` placeholder instead of real upload/attachment handling.
- `mobile-app/src/modules/calendar/screens/CalendarMainScreen.tsx` & `calendarService.ts`:
  - **Defect found**: Hardcoded `new Date(2026, 10, 16)` and fixed 30-day `2026-11-XX` array instead of real calendar math.
  - Missing Day view, real Week hourly grid, HR/Employee/Todo composite projections (`/api/hr/calendar/events` & `/api/me/calendar/events`), custom category creation, `OrganizationMemberSelector` view/edit sharing, recurrence RRULE (`DAILY|WEEKLY|MONTHLY|YEARLY` + scope prompt `this_occurrence` vs `all`), multi-reminder config, conflict warning modal (`409 SCHEDULING_CONFLICT`), audit trail modal (`/audit-logs`), and `.ics` export/share.
- `mobile-app/src/modules/todo/screens/TodoListScreen.tsx`, `GanttTimelineScreen.tsx` & `todoService.ts`:
  - **Defect found**: Mismatched backend schema (`status: 'PENDING'|'COMPLETED'` in mobile service vs backend `completed: boolean`, `tag: string`, `checklist[].done: boolean`, `comments[].author`).
  - **Defect found**: `GanttTimelineScreen.tsx` hardcoded `left: 2 * CELL_WIDTH, width: Math.max(CELL_WIDTH * 2, CELL_WIDTH * (rowIdx + 2))` instead of computing bar geometry from `startDate` and `dueDate`!
  - Missing KPI overview stats, category CRUD manager (`POST/PUT/DELETE /api/todos/categories`), star/favorite toggle, sort options, task edit modal, checklist item delete, activity audit tab, and task deletion confirmation.
- `mobile-app/src/store/tenantStore.ts`:
  - `setTenant` and `clearTenant` must invoke `purgeQueryCache()` (cancel in-flight queries + clear React Query cache) and tear down active realtime subscriptions on workspace change.

---

## 1. Complete Screen, View, Drawer & Modal Inventory

### Module 1: Chat (`UnifiedChatApp` + Calling & Meetings)
1. **Shared Conversations Workspace (`ChatConversationsScreen`)**:
   - Mode tabs: **Personal (Direct)**, **Groups**, **Contacts (Org Directory)**, **Call Logs**.
   - Search bar (`>= 2` chars triggers global `/api/chat/search` across messages & files in Personal/Groups, or filters Contacts/Call Logs).
   - Archive filter toggle (`Show Archived`), Pinned conversations strip (up to 6 pinned threads).
   - **Call Logs View**: 4 KPI summary cards (`Total`, `Completed`, `Missed/Rejected`, `In/Out`), search + type/status/date-range/sort filters, paginated call history rows, Caller Details modal, Call-back (Audio/Video), and Hide/Delete call record (`DELETE /api/chat/calls/:id`).
2. **Active Conversation Thread (`ChatConversationDetailScreen`)**:
   - Thread header with online status / typing indicator / member count, Audio Call, Video Call, In-thread Search bar, Pin conversation toggle, and Info Drawer trigger.
   - Active Group Meeting join banner when a group call is live.
   - Collapsible Pinned Messages banner (cycles through pinned messages + unpin).
   - Paginated message list (`limit=25`, `before=<cursor>` load-older, `after=<lastId>` reconnect catch-up), date separators, system event pills, message bubbles (sender avatar/name, forwarded badge, quoted reply jump, image/PDF/video/document attachments with authenticated preview/download, voice note player with `1x/1.5x/2x` rate & waveform bars, interactive Poll widget with vote/close, `edited` tag, emoji reactions, single/double delivery & read checkmarks).
   - Announcement-only read-only banner (when `isAnnouncementOnly` and caller is neither group `owner` nor `admin`).
   - Composer with Reply/Edit bar, staged attachments, `@mention` member picker (groups), Emoji reaction/composer picker, Poll creator trigger, Voice Note recorder (native hardware graceful capability check), and offline-resilient send queue with Retry/Discard.
3. **Chat Modals & Drawers**:
   - **New Direct Chat / Contacts Picker Modal**
   - **Create Group Modal** (Tab 1: Custom Group w/ Announcement-Only switch; Tab 2: Org Templates — Department / Branch / Project / Cohort via `/api/chat/hrms/group-templates` & `/api/chat/hrms/groups/from-org`)
   - **Contact Info Bottom Sheet / Drawer** (DM participant profile via `/api/chat/participant/:id`, mute/notification level preferences, shared media/files/links)
   - **Group Info & Administration Sheet / Drawer** (Edit name/description/avatar, Announcement-Only switch, Invite Link generate/copy/revoke, Member list with search + Add Members + Promote/Demote Admin/Moderator + Remove Member + Transfer Ownership, Activity feed `/api/chat/groups/:id/activity`, Archive/Unarchive, Leave Group)
   - **Create Poll Modal** (question, 2–6 options, allowMultiple, isAnonymous)
   - **Forward Message Modal** (multi-thread batch forward `/api/chat/messages/forward-batch`)
   - **Message Action Sheet & Delete Scope Dialog** (`Reply`, `React`, `Forward`, `Pin/Unpin`, `Edit` within 24h, `Delete for me` vs `Delete for everyone`)
   - **Attachment Lightbox / Safe Preview Modal**
   - **Schedule Meeting Modal** (creates shared event via `POST /api/calendar/events`)
4. **Calling & Multiparty Meeting Screens (`ChatCallScreen` + Global Incoming Call Banner)**:
   - Global incoming 1:1 & group call detector (`/api/calls/pending` + Socket/Pusher `call:incoming` & `group-call:incoming`) with Accept / Decline.
   - 1:1 & Mesh Call Screen (`/api/calls/invite`, `/accept`, `/reject`, `/cancel`, `/end`, `/heartbeat`, `/media-state`, `/signal`, `/invite-colleague`, `/accept-invitation`) with real backend state transitions (`ringing` -> `connected` -> `ended`), mute/video/speaker/hold controls, colleague invite modal, and clear native WebRTC media bridge status when running inside Expo Go vs native WebRTC build.
   - Multiparty Group Meeting mode (`/api/chat/meetings/start`, `/join`, `/leave`, `/end`, `/media-state`, `/invite`, `/remove`, `/participants`) with participant roster, host mute/remove/end-for-all controls, and in-meeting group chat sheet.

### Module 2: Calendar (`CalendarMainScreen`)
1. **Shared Calendar Workspace**:
   - Primary phone-friendly **Agenda (List)** view + **Month**, **Week** (7-day x 24h scrollable grid), and **Day** (24h timeline) switcher.
   - Date navigation (`Previous`, `Today`, `Next`), interactive Mini-Calendar date jump picker, real-time search bar, and Category Filter drawer/sheet with custom category creation (`POST /api/calendar/categories`) and edit/delete (`PUT/DELETE /api/calendar/categories/:id`).
   - Composite domain projections merged seamlessly (Company Holidays, Birthdays, Work Anniversaries, Leaves, Trainings, Interviews, and read-only Todo task projections with one-tap navigation to Todo / Gantt).
   - Toolbar `.ICS` calendar export (`GET /api/calendar/export/ics` shared via native `Share` sheet).
2. **Calendar Modals & Sheets**:
   - **Create / Edit Event Bottom Sheet**: Title, Category picker, All-Day toggle, Start/End Date & Time inputs with validation, Meeting Room selector (`/api/calendar/rooms`), Physical Location, Meeting Link URL, Timezone selector, Recurrence configurator (`NONE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` + `UNTIL` / `COUNT` + preview via `/api/calendar/recurrence/preview`), Visibility (`private`, `team`/`shared`, `organization`), `OrganizationMemberSelector` (`GET /api/calendar/eligible-recipients?q=`) with per-member `view`/`edit` permission, Reminders builder (up to 5 reminders: `5m/15m/30m/1h/1d` x `in_app`/`email`/`both`), Description.
   - **Event Details Bottom Sheet**: Badges (`Category`, `Cancelled`, `Read-Only` for non-calendar projections), formatted schedule & recurrence summary, room & meeting link, Invitee RSVP bar (`Accept`, `Tentative`, `Decline` via `POST /api/calendar/events/:id/rsvp`), live Share management (`POST/DELETE /api/calendar/events/:id/share`), single-event `.ICS` export, `Audit Trail`, `Edit Event`, `Cancel Event`, `Delete`, and for Todo projections: `Open in Todo` & `View in Gantt`.
   - **Scheduling Conflict Warning Modal** (on HTTP `409 SCHEDULING_CONFLICT` or `/api/calendar/check-conflicts`: `Change Time` vs `Save Anyway` with `ignoreConflicts: true` for authorized roles).
   - **Recurrence Scope Prompt Modal** (`This occurrence only` vs `All events in series` on recurring edit/cancel).
   - **Event Audit History Modal** (`GET /api/calendar/events/:id/audit-logs`).

### Module 3: Todo (`TodoListScreen`)
1. **Shared Todo Workspace**:
   - Header with `Tasks | Gantt` switcher, `Categories` manager trigger, and `+ Create Task` CTA.
   - **4 KPI Stat Cards**: *Total Deliverables*, *Pending Actions*, *Completed (% rate)*, *High Priority / Urgent*.
   - **Search, Filter & Sort Toolbar**: Keyword search (`title`, `description`, `assignees`), Status tabs (`All`, `Pending`, `Completed` with live counts), Priority filter (`all`, `urgent`, `high`, `medium`, `low`), Category filter (`all` + dynamic categories), Sort selector (`Newest`, `Due Date`, `Priority`, `Progress`), Starred filter toggle, and `Reset` button.
   - **Task Cards**: Status accent bar (emerald completed, rose overdue, indigo active), completion checkbox, star/favorite toggle, title, category & priority badges, description snippet, due date + `(Overdue)` indicator, stacked multi-assignee avatars, checklist counter (`done/total`), comment counter, and mini progress bar + `%`.
2. **Todo Modals & Drawers**:
   - **Task Detail Bottom Sheet / Drawer**: Task ID badge, Complete toggle, Edit & Delete triggers, Priority/Category/Dates/Progress summary, assigned members list, Description, and 3 interactive tabs:
     1. `Checklist (N)` — add subtask, toggle `done`, delete subtask with instant progress recalculation.
     2. `Comments (N)` — chronological comments + post new comment.
     3. `Activity` — chronological audit log from `todo.activity`.
   - **Create / Edit Task Modal**: Title, Description, Priority, Category (with inline Manage trigger), `MultiAssigneeSelector` (searchable tenant directory from `GET /api/todos/assignees` with `Select All` & `Clear`), `Start Date`, `Due Date` (with `dueDate >= startDate` validation).
   - **Category Manager Modal**: Create, inline rename/recolor (8 palette presets), and delete categories (`"internal"` protected).
   - **Delete Task Confirmation Dialog**.

### Module 4: Gantt Timeline (`GanttTimelineScreen`)
1. **Shared Gantt Workspace**:
   - Header with `Tasks | Gantt` switcher and `+ Create Task` CTA.
   - **Timeline Controls Bar**: `Previous` (`-7d`), `Today` (`today - 2d`), `Next` (`+7d`) navigation + `14 Days` / `28 Days` scale toggle + search/status/priority/category filters shared with Todo.
   - **Pinned Left Column + Horizontally Scrollable Timeline Grid**:
     - Left pinned task column (`Task & Assignees` with priority color dot, title, assignee initials, and progress `%`).
     - Right horizontally scrollable `14`- or `28`-day grid with weekday + date headers, **weekend shading** (Sat/Sun columns), **Today marker** (highlighted header + vertical indicator line), **priority/status-coded task bars** positioned accurately from `startDate` through `dueDate`, internal **progress fill bar**, and tap-to-inspect.
   - **Shared Task Detail Bottom Sheet & Edit/Reschedule Modal**: Selecting any task row or timeline bar opens the exact same Task Detail Bottom Sheet (Complete toggle, Reschedule/Edit dates, Delete confirmation, Checklist, Comments, Activity).

---

## 2. Exact Web Route & Component Mapping

| Module | HR Admin Web Route | Employee (`/me`) Web Route | Tenant Admin Web Route | Web Source Component | Shared Mobile Screen(s) |
|---|---|---|---|---|---|
| **Chat — Direct** | `/hr/chat` | `/me/chat` | `/tenant/chat` | `UnifiedChatApp` (`initialMode="chats"`) | `ChatConversationsScreen` + `ChatConversationDetailScreen` |
| **Chat — Groups** | `/hr/chat/groups` | `/me/chat/groups` | `/tenant/chat/groups` | `UnifiedChatApp` (`initialMode="groups"`) | `ChatConversationsScreen` (`tab="groups"`) + `ChatConversationDetailScreen` |
| **Chat — Contacts** | `/hr/chat/contacts` | `/me/chat/contacts` | `/tenant/chat/contacts` | `UnifiedChatApp` (`initialMode="contacts"`) | `ChatConversationsScreen` (`tab="contacts"`) |
| **Chat — Call Logs** | `/hr/chat/calls` | `/me/chat/calls` | `/tenant/chat/calls` | `UnifiedChatApp` (`initialMode="calls"`) | `ChatConversationsScreen` (`tab="calls"`) + `ChatCallScreen` |
| **Calendar** | `/hr/calendar` | `/me/calendar` | `/tenant/calendar` | `UnifiedCalendarApp` | `CalendarMainScreen` |
| **Todo List** | `/hr/todo` | `/me/todo` | `/tenant/todo` | `UnifiedTodoApp` (`initialView="list"`) | `TodoListScreen` |
| **Gantt Timeline** | `/hr/todo/gantt` | `/me/todo/gantt` | `/tenant/todo/gantt` | `UnifiedTodoApp` (`initialView="gantt"`) / `GanttTimelineView` | `GanttTimelineScreen` |

*All four mobile modules are registered identically across `EmployeeNavigator`, `HrAdminNavigator`, `TenantAdminNavigator`, and `ManagerNavigator` using the exact same shared screen components.*

---

## 3 & 4. Authoritative Backend Endpoint Inventory (Non-Inflated) + Payloads & Response Types

### Endpoint Count Summary (Distinct Handlers vs Aliases)
| Backend Router | Source File | Canonical Mount | Distinct Endpoints | Intra-Router / Mount Aliases |
|---|---|---|---:|---|
| Chat (incl. Call History & Meetings) | `server/src/routes/chat.routes.ts` | `/api/chat` | **62** | +7 intra-router path/method aliases (no `/api/v1` alias) |
| 1:1 & Mesh Calls | `server/src/routes/call.routes.ts` | `/api/calls` | **14** | 0 aliases |
| Pusher Realtime Auth | `server/src/routes/pusher.routes.ts` | `/api/pusher` | **3** | 0 aliases |
| Push Subscriptions | `server/src/routes/push.routes.ts` | `/api/notifications/push` | **5** | +1 method alias (`POST /unsubscribe`) |
| Calendar (Primary) | `server/src/routes/calendar.routes.ts` | `/api/calendar` | **22** | 0 aliases |
| HR / ESS Collaboration Projections | `hr-collaboration.routes.ts` & `me-collaboration.routes.ts` | `/api/v1/hr`, `/api/v1/me` | **16** | Mounted at both `/api/v1/{hr,me}` and `/api/{hr,me}` |
| Todos (Primary) | `server/src/routes/todos.routes.ts` | `/api/todos` | **13** | 0 aliases |
| Projects & Kanban | `server/src/routes/projects.routes.ts` | `/api/projects` | **22** | 0 aliases |
| Shared Media Upload | `server/src/routes/media.routes.ts` | `/api/v1/media` | **4** | Alias `/api/media` |

### 3.1 Chat Endpoints (`/api/chat` — 62 Distinct)
| # | Method | Canonical Path (Aliases Noted) | Request Query / Body | Response Shape |
|---:|---|---|---|---|
| 1 | `GET` | `/api/chat/attachments/:mediaId/download` | Query: `sig?, uid?, tid?, exp?, inline?` or Bearer | Binary stream (`200`/`206`) |
| 2 | `GET` | `/api/chat/file-policy` | — | `{ prohibitedExtensions, maxFileSizeBytes: 31457280, maxAttachmentsPerMessage: 10, allowedCategories }` |
| 3 | `GET` | `/api/chat/presence` | Query: `passive?: "1"\|"true"` | `{ onlineUserIds: string[] }` |
| 4 | `POST` | `/api/chat/presence` | `{ status?: "online"\|"offline" }` | `{ ok: true, status, onlineUserIds: string[] }` |
| 5 | `GET` | `/api/chat/participant/:id` | — | `{ id, userId, employeeId, employeeCode, name, email, phone, department, branch, designation, reportingManager, avatarUrl, isOnline, employmentType, joinedAt, bio }` |
| 6 | `GET` | `/api/chat/contacts` | Query: `search?, departmentId?, branchId?, paginated?, page?, limit?` | `ContactItem[]` or `{ contacts, total, page, limit, totalPages }` |
| 7 | `GET` | `/api/chat/conversations` | Query: `filter?, includeArchived?, paginated?, page?, limit?` | `ConversationItem[]` or `{ conversations, total, page, limit, totalPages }` |
| 8 | `POST` | `/api/chat/conversations/direct` | `{ targetUserId }` | `{ threadId, targetUserId, otherParticipantId, title, name, avatarUrl, email, department, designation }` |
| 9 | `GET` | `/api/chat/conversations/preferences` | — | `{ preferences: ChatConversationPreference[] }` |
| 10 | `PATCH` | `/api/chat/conversations/:threadId/preferences` *(alias: `POST`)* | `{ isMuted?, durationHours?, mutedUntil?, isArchived?, markedUnread?, notificationLevel? }` | `{ success: true, threadId, preference, isMuted, mutedUntil, isArchived, markedUnread, notificationLevel }` |
| 11 | `POST` | `/api/chat/conversations/:threadId/pin` | `{}` | `{ isPinned: boolean, message: string }` |
| 12 | `GET` | `/api/chat/conversations/pinned` | — | `string[]` |
| 13 | `GET` | `/api/chat/groups` | Query: `search?, includeArchived?` | `EnrichedGroup[]` |
| 14 | `POST` | `/api/chat/groups` | `{ name, description?, avatarUrl?, memberIds?, category?, isAnnouncementOnly?, maxMembers? }` | `ChatGroup` (`201`) |
| 15 | `GET` | `/api/chat/hrms/group-templates` | — | `{ departments, branches, projects, cohorts, special, templates }` |
| 16 | `POST` | `/api/chat/hrms/groups/from-org` | `{ templateType, sourceEntityId?, name?, description?, syncMembers?, isAnnouncementOnly? }` | `{ created, syncedAddedCount, group: ChatGroup }` |
| 17 | `GET` | `/api/chat/groups/:id` | — | `{ ...group, ownerId, inviteToken?, inviteExpiresAt?, members: RichMember[] }` |
| 18 | `GET` | `/api/chat/groups/:id/members` | Query: `search?, page?, limit?` | `{ members, total, totalGroupMembers, page, limit, totalPages }` |
| 19 | `PATCH` | `/api/chat/groups/:id` | `{ name?, description?, avatarUrl?, isAnnouncementOnly?, maxMembers? }` | `ChatGroup` |
| 20 | `POST` | `/api/chat/groups/:id/archive` | `{ isArchived?: boolean }` | `{ success: true, isArchived, group }` |
| 21 | `DELETE` | `/api/chat/groups/:id` | — | `{ success: true, mode: "archived"\|"deleted", message }` |
| 22 | `POST` | `/api/chat/groups/:id/members` | `{ memberIds?: string[], userId?: string }` | `{ success: true, addedCount, addedMemberIds, group }` |
| 23 | `DELETE` | `/api/chat/groups/:id/members/:userId` | — | `{ success: true, message }` |
| 24 | `PATCH` | `/api/chat/groups/:id/members/:userId/role` | `{ role: "owner"\|"admin"\|"moderator"\|"member" }` | `{ success: true, message, newRole }` |
| 25 | `POST` | `/api/chat/groups/:id/transfer-ownership` | `{ newOwnerId: string }` | `{ success: true, message, newOwnerId }` |
| 26 | `POST` | `/api/chat/groups/:id/leave` | `{}` | `{ success: true, message }` |
| 27 | `POST` | `/api/chat/groups/:id/mute` | `{ isMuted?: boolean, durationHours?: number }` | `{ success: true, isMuted, mutedUntil, message }` |
| 28 | `POST` | `/api/chat/groups/:id/invite-link` *(alias: `.../invite`)* | `{ expiresInHours?: number }` | `{ success: true, groupId, inviteToken, inviteExpiresAt, scope }` |
| 29 | `DELETE` | `/api/chat/groups/:id/invite-link` *(alias: `.../invite`)* | — | `{ success: true, message }` |
| 30 | `POST` | `/api/chat/groups/join-by-invite` *(alias: `/invite/:inviteCode`)* | `{ inviteToken: string }` | `{ success: true, alreadyMember, group }` |
| 31 | `GET` | `/api/chat/groups/:id/activity` | — | `ChatMessage[]` (system events) |
| 32 | `POST` | `/api/chat/upload` | `multipart/form-data`: `files`, `threadId?` | `{ files: SavedFile[], url, signedDownloadUrl, signedPreviewUrl, id, mediaId }` |
| 33 | `GET` | `/api/chat/url-preview` | Query: `url` | `{ preview }` |
| 34 | `GET` | `/api/chat/messages/:threadId` *(alias: `/conversations/:threadId/messages`)* | Query: `limit?, before?, after?, markRead?` | `{ messages: SanitizedChatMessage[], nextCursor, hasMore, seenBy? }` |
| 35 | `GET` | `/api/chat/messages/:threadId/pinned` | — | `SanitizedChatMessage[]` |
| 36 | `GET` | `/api/chat/messages/:threadId/files` | Query: `type?, search?, paginated?, page?, limit?` | `ThreadFile[]` or `{ files, total, page, limit, totalPages }` |
| 37 | `GET` | `/api/chat/search` | Query: `q, senderId?, threadId?, hasAttachment?, page?, limit?` | `{ results, messages, files, total, page, limit, totalPages }` |
| 38 | `GET` | `/api/chat/messages/:threadId/search` | Query: `q, senderId?, hasAttachment?, page?, limit?` | `SanitizedChatMessage[]` or paginated object |
| 39 | `POST` | `/api/chat/messages` | `{ threadId, content?, attachments?, replyToId?, voiceNote?, poll?, clientTempId?, mentions? }` | `SanitizedChatMessage` (`201` / `200`) |
| 40 | `PATCH` | `/api/chat/messages/:id` | `{ content: string }` | `SanitizedChatMessage` |
| 41 | `POST` | `/api/chat/messages/forward-batch` | `{ messageId: string, targetThreadIds: string[] }` | `{ success: true, forwardedCount, failedCount, messages, failedThreads }` |
| 42 | `POST` | `/api/chat/messages/:id/pin` | `{}` | `SanitizedChatMessage` |
| 43 | `POST` | `/api/chat/messages/:id/react` | `{ emoji: string }` | `SanitizedChatMessage` |
| 44 | `POST` | `/api/chat/messages/:id/poll/vote` | `{ optionId: string\|number }` | `{ success: true, poll }` |
| 45 | `POST` | `/api/chat/messages/:id/poll/close` | `{}` | `{ success: true, poll }` |
| 46 | `POST` | `/api/chat/messages/delivered` | `{ messageIds: string[], threadId?: string }` | `{ success: true, acknowledgedIds, deliveredAt }` |
| 47 | `POST` | `/api/chat/messages/:threadId/read` *(aliases: `/conversations/:threadId/read`, `/threads/:threadId/read`)* | `{}` | `{ success: true, lastReadAt, seenBy? }` |
| 48 | `DELETE` | `/api/chat/messages/:id` | Query/Body: `mode?: "me"\|"everyone"`, `forEveryone?: boolean` | `{ success: true, id, mode, message }` |
| 49 | `GET` | `/api/chat/calls` | Query: `search?, callType?, direction?, status?, startDate?, endDate?, page?, limit?, sort?` | `{ calls: EnrichedCallHistoryRecord[], total, page, limit, totalPages }` |
| 50 | `POST` | `/api/chat/calls` | `{ callSessionId, callerId?, receiverId?, callType?, status?, durationSeconds?, groupId?, threadId? }` | `CallHistoryRecord` |
| 51 | `DELETE` | `/api/chat/calls/:id` | — | `{ success: true, message }` |
| 52 | `POST` | `/api/chat/calls/bulk-delete` | `{ ids: string[] }` | `{ success: true, count }` |
| 53 | `GET` | `/api/chat/meetings/config` | — | `{ transport, mode, configured, iceServers }` |
| 54 | `POST` | `/api/chat/meetings/start` | `{ groupId, callId, callType?: "audio"\|"video", invitedUserIds?: string[] }` | `{ success: true, callId, status, iceServers }` |
| 55 | `POST` | `/api/chat/meetings/:callId/join` | `{ groupId?: string }` | `{ success: true, callId, groupId, callType, creatorId, isHost, iceServers, participants }` |
| 56 | `POST` | `/api/chat/meetings/:callId/signal` | `{ targetUserId, signal }` | `{ success: true, delivered: true }` |
| 57 | `POST` | `/api/chat/meetings/:callId/media-state` | `{ isMuted?, isCameraOff?, isVideoOff?, isScreenSharing?, isSpeaking? }` | `{ success: true }` |
| 58 | `POST` | `/api/chat/meetings/:callId/invite` | `{ userIds: string[] }` | `{ success: true, invitedCount, invitedUserIds }` |
| 59 | `POST` | `/api/chat/meetings/:callId/leave` | `{}` | `{ success: true }` |
| 60 | `POST` | `/api/chat/meetings/:callId/remove` | `{ targetUserId: string }` | `{ success: true }` |
| 61 | `GET` | `/api/chat/meetings/:callId/participants` | — | `{ callId, groupId, groupName, callType, creatorId, startedAt, participants }` |
| 62 | `POST` | `/api/chat/meetings/:callId/end` | `{}` | `{ success: true, message }` |

### 3.2 Direct & Mesh Call Endpoints (`/api/calls` — 14 Distinct) & Pusher (`/api/pusher` — 3 Distinct)
| # | Method | Canonical Path | Request Body / Query | Response Shape |
|---:|---|---|---|---|
| 63 | `GET` | `/api/calls/pending` | — | `{ success, hasPendingCall, data, hasPendingGroupCall?, groupCallData? }` |
| 64 | `POST` | `/api/calls/invite` | `{ targetUserId, callType?: "audio"\|"video", callId?, callerPhone?, threadId? }` | `{ success, data: { callId, status, targetUserId, targetName, callType, threadId } }` or `409` `{ busy: true }` |
| 65 | `POST` | `/api/calls/:callId/signal` | `{ toUserId, signal }` | `{ success: true, delivered: true }` |
| 66 | `POST` | `/api/calls/:callId/media-state` | `{ type, active, targetUserId? }` | `{ success: true, delivered }` |
| 67 | `GET` | `/api/calls/:callId/status` | — | `{ success: true, data: { callId, status, callType, callerId, targetUserId, startedAt, answeredAt?, participants? } }` |
| 68 | `POST` | `/api/calls/:callId/accept` | `{}` | `{ success: true, data: { callId, status: "connected", threadId, answeredAt, activeParticipants? } }` |
| 69 | `POST` | `/api/calls/:callId/reject` | `{ reason?: string }` | `{ success: true, message }` |
| 70 | `POST` | `/api/calls/:callId/cancel` | `{}` | `{ success: true, message }` |
| 71 | `POST` | `/api/calls/:callId/end` | `{ reason?, durationSeconds? }` | `{ success: true, data: { callId, durationSeconds, leftOnly? } }` |
| 72 | `POST` | `/api/calls/:callId/reconnect` | `{}` | `{ success: true, data: { callId, participant } }` |
| 73 | `POST` | `/api/calls/:callId/heartbeat` | `{}` | `{ success: true, active, status, peerLeft?, livePeerCount? }` |
| 74 | `POST` | `/api/calls/:callId/invite-colleague` | `{ targetUserId: string }` | `{ success: true, data: { callId, callType, participant, invitedUser } }` |
| 75 | `POST` | `/api/calls/:callId/accept-invitation` | `{ deviceId?: string }` | `{ success: true, data: { call, participant, activeParticipants } }` |
| 76 | `GET` | `/api/calls/ice-servers` | — | `{ success: true, data: { iceServers, mode } }` |
| 77 | `POST` | `/api/pusher/auth` | `{ socket_id, channel_name }` | `{ auth, channel_data? }` |
| 78 | `GET` | `/api/pusher/config` | — | `{ success: true, data: { appId, key, cluster, enabled } }` |
| 79 | `POST` | `/api/pusher/test` | `{ appId?, key?, secret?, cluster? }` | `{ success: true, message, data }` |

### 3.3 Calendar Endpoints (`/api/calendar` — 22 Distinct + Composite Projections)
| # | Method | Canonical Path | Request Query / Body | Response Shape |
|---:|---|---|---|---|
| 80 | `GET` | `/api/calendar/categories` | — | `{ success: true, data: Category[] }` |
| 81 | `POST` | `/api/calendar/categories` | `{ name, color?, description? }` | `{ success: true, data: Category }` |
| 82 | `PUT` | `/api/calendar/categories/:id` | `{ name?, color?, description? }` | `{ success: true, data: Category }` |
| 83 | `DELETE` | `/api/calendar/categories/:id` | — | `{ success: true, message }` |
| 84 | `GET` | `/api/calendar/eligible-recipients` | Query: `q?` | `{ success: true, data: Recipient[] }` |
| 85 | `GET` | `/api/calendar/events` | Query: `startDate?, endDate?, category?, visibility?, status?, search?, roomId?` | `{ success: true, data: FormattedCalendarEvent[] }` |
| 86 | `POST` | `/api/calendar/events` | `{ title, startDate, endDate?, allDay?, category?, location?, meetingLink?, visibility?, timezone?, sharedWith?, reminders?, recurrenceRule?, recurrenceUntil?, roomId?, ignoreConflicts? }` | `{ success: true, data: Event }` or `409 SCHEDULING_CONFLICT` `{ conflicts }` |
| 87 | `PUT` | `/api/calendar/events/:id` | Same as POST + `{ recurrenceScope?: "this_occurrence"\|"all", occurrenceDate? }` | `{ success: true, data: Event }` or `409` `{ conflicts }` |
| 88 | `POST` | `/api/calendar/events/:id/cancel` | `{ recurrenceScope?: "this_occurrence", occurrenceDate? }` | `{ success: true, message, data: Event }` |
| 89 | `POST` | `/api/calendar/events/:id/rsvp` | `{ rsvpStatus: "pending"\|"accepted"\|"declined"\|"tentative" }` | `{ success: true, message, data: CalendarEventShare }` |
| 90 | `DELETE` | `/api/calendar/events/:id` | — | `{ success: true, message }` |
| 91 | `POST` | `/api/calendar/events/:id/share` | `{ recipientId, permission?: "view"\|"edit" }` | `{ success: true, message, shares }` |
| 92 | `DELETE` | `/api/calendar/events/:id/share/:recipientId` | — | `{ success: true, message, shares }` |
| 93 | `GET` | `/api/calendar/rooms` | — | `{ success: true, data: MeetingRoom[] }` |
| 94 | `POST` | `/api/calendar/check-conflicts` | `{ startDate, endDate, attendeeIds?, roomId?, excludeEventId? }` | `{ success: true, data: { hasConflict, attendeeConflicts, roomConflict } }` |
| 95 | `POST` | `/api/calendar/recurrence/preview` | `{ startDate, recurrenceRule, recurrenceEndType?, recurrenceCount?, recurrenceUntil? }` | `{ success: true, data: { occurrences, count } }` |
| 96 | `GET` | `/api/calendar/events/:id/audit-logs` | — | `{ success: true, data: AuditLog[] }` |
| 97 | `GET` | `/api/calendar/export/ics` | Query: `startDate?, endDate?, category?` | `text/calendar` `.ics` payload |
| 98 | `GET` | `/api/calendar/events/:id/export/ics` | — | `text/calendar` `.ics` payload |
| 99 | `POST` | `/api/calendar/reminders/process-due` | `{}` | `{ success: true, data: { evaluatedCount, dispatchedCount, details } }` |
| 100 | `POST` | `/api/calendar/google-sync` | `{}` | `{ success: true, message }` (entitlement placeholder) |
| 101 | `GET` | `/api/calendar/google-sync/status` | — | `{ success: true, status, lastSyncedAt }` (placeholder) |
| C1 | `GET` | `/api/v1/hr/calendar/events` *(alias `/api/hr/calendar/events`)* | Query: `startDate?, endDate?, category?` | `NormalizedCalendarEvent[]` (HR composite projections: leaves, holidays, birthdays, anniversaries, interviews, trainings, todos) |
| C2 | `GET` | `/api/v1/me/calendar/events` *(alias `/api/me/calendar/events`)* | Query: `startDate?, endDate?, category?` | `NormalizedCalendarEvent[]` (Employee-scoped composite projections) |

### 3.4 Todo Endpoints (`/api/todos` — 13 Distinct) & Projects (`/api/projects` — 22 Distinct)
| # | Method | Canonical Path | Request Query / Body | Response Shape |
|---:|---|---|---|---|
| 102 | `GET` | `/api/todos/categories` | — | `{ success: true, data: TodoCategory[] }` |
| 103 | `POST` | `/api/todos/categories` | `{ name, color?, bg? }` | `{ success: true, data: TodoCategory }` |
| 104 | `PUT` | `/api/todos/categories/:id` | `{ name?, color?, bg? }` | `{ success: true, data: TodoCategory }` |
| 105 | `DELETE` | `/api/todos/categories/:id` | — | `{ success: true, message }` (reassigns referencing tasks to `"internal"`) |
| 106 | `GET` | `/api/todos/assignees` | — | `{ success: true, data: Array<{ id, userId, name, email, type, role, department?, avatar }> }` |
| 107 | `GET` | `/api/todos` | Query: `priority?, tag?, completed?, search?, scope?, starred?` | `{ success: true, data: FormattedTodo[] }` |
| 108 | `POST` | `/api/todos` | `{ title, description?, priority?, tag?, startDate?, dueDate?, completed?, assignees?, assigneeId?, assignedTo?, progress?, starred?, checklist? }` | `{ success: true, data: FormattedTodo }` |
| 109 | `PUT` | `/api/todos/:id` | Partial/Full `Todo` fields | `{ success: true, data: FormattedTodo }` |
| 110 | `POST` | `/api/todos/:id/checklist` | `{ text: string }` | `{ success: true, data: TodoMeta }` |
| 111 | `PATCH` | `/api/todos/:id/checklist/:itemId` | `{ done?: boolean, text?: string }` | `{ success: true, data: { checklist, progress, completed } }` |
| 112 | `DELETE` | `/api/todos/:id/checklist/:itemId` | — | `{ success: true, data: { checklist, progress } }` |
| 113 | `POST` | `/api/todos/:id/comments` | `{ text: string }` | `{ success: true, data: TodoCommentItem, comments }` |
| 114 | `DELETE` | `/api/todos/:id` | — | `{ success: true, message }` |

*(Note: `server/src/routes/projects.routes.ts` exposes 22 separate Kanban/Project/Milestone/Invoice endpoints under `/api/projects`, which are NOT used by `UnifiedTodoApp` or `GanttTimelineView` — both Todo and Gantt persist exclusively through `/api/todos/*`.)*

---

## 5. Interactive UI Controls & Real Backend Actions

| Module | UI Control | Exact Action & Persistence |
|---|---|---|
| **Chat** | Conversation / Group / Contacts / Call Logs Tabs | Switches active mode; loads `/api/chat/conversations`, `/api/chat/groups`, `/api/chat/contacts`, or `/api/chat/calls`. |
| **Chat** | Global Search Input (`>=2` chars) | Calls `GET /api/chat/search?q=...` and renders matching messages & shared files; tapping jumps into thread. |
| **Chat** | Pin / Mute / Archive / Mark Unread | Calls `POST /api/chat/conversations/:threadId/pin` or `PATCH /api/chat/conversations/:threadId/preferences`. |
| **Chat** | New Direct Chat / Create Custom or Org Group | Calls `POST /api/chat/conversations/direct`, `POST /api/chat/groups`, or `POST /api/chat/hrms/groups/from-org`. |
| **Chat** | Send Text / Attachment / Voice Note / Poll | Uploads files via `POST /api/chat/upload`, posts message via `POST /api/chat/messages` with `clientTempId` deduplication. |
| **Chat** | Reply / Forward / Edit / Delete / Pin / React | `replyToId` on send; `POST /forward-batch`; `PATCH /messages/:id` (`<=24h`); `DELETE /messages/:id?mode=me\|everyone`; `POST /pin`; `POST /react`. |
| **Chat** | Poll Vote & Poll Close | `POST /api/chat/messages/:id/poll/vote` & `POST /api/chat/messages/:id/poll/close`. |
| **Chat** | Group Admin Controls | Edit metadata (`PATCH /groups/:id`), Invite Link (`POST/DELETE /invite-link`), Add/Remove/Role (`POST/DELETE/PATCH /members`), Transfer Ownership, Archive, Leave. |
| **Chat** | 1:1 Call & Multiparty Meeting Controls | `POST /api/calls/invite`, `/accept`, `/reject`, `/cancel`, `/end`, `/heartbeat`, `/media-state`, `/invite-colleague`; Group: `POST /api/chat/meetings/start`, `/join`, `/leave`, `/end`, `/remove`. |
| **Calendar** | Month / Week / Day / Agenda Switcher & Date Nav | Switches layout; fetches 3-month window from `GET /api/calendar/events` + composite `/api/{hr\|me}/calendar/events`. |
| **Calendar** | Category Filter & Custom Category Manager | Filters visible events; creates/edits/deletes tenant categories via `POST/PUT/DELETE /api/calendar/categories`. |
| **Calendar** | Create / Edit / Cancel / Delete Event | `POST /api/calendar/events`, `PUT /api/calendar/events/:id` (with `recurrenceScope` & `409` conflict prompt), `POST /cancel`, `DELETE /:id`. |
| **Calendar** | Member Sharing & Invitee RSVP | `GET /eligible-recipients?q=`, `POST/DELETE /events/:id/share`, `POST /events/:id/rsvp`. |
| **Calendar** | Audit History & ICS Export | `GET /events/:id/audit-logs`; `GET /export/ics` & `GET /events/:id/export/ics` shared via native `Share`. |
| **Todo** | Search, Status, Priority, Category & Sort Controls | Filters & sorts workspace tasks; invalidates `["todos"]` + calendar queries on mutations. |
| **Todo** | Create / Edit / Complete / Star / Delete Task | `POST /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id`. |
| **Todo** | Checklist Add / Toggle / Delete & Comments | `POST /api/todos/:id/checklist`, `PATCH /checklist/:itemId`, `DELETE /checklist/:itemId`, `POST /comments`. |
| **Gantt** | `Tasks | Gantt` Toggle, `14d | 28d` Scale & `Prev | Today | Next` | Shifts timeline window `-7d` / `0` / `+7d`; renders pinned task column + proportional date bars; opens shared Task Detail Sheet for reschedule/edit/complete/delete/checklist/comments. |

---

## 6. Realtime Socket.IO & Pusher Event Contracts

### 6.1 Transport & Authentication
- **Socket.IO (`/socket.io/?EIO=4&transport=websocket`)**: Authenticated via `handshake.auth.token` (JWT) verified against active `DeviceSession` and active workspace policy on connect and every packet. Auto-joins `user:{userId}` and `tenant:{tenantId}`; joins `tenant:{tenantId}:chat:{threadId}` on `chat:join`.
- **Pusher (`/api/pusher/config` + `POST /api/pusher/auth`)**: Subscribes strictly to `private-user-{userId}` and `private-tenant-{tenantId}`. Large payloads (`>9KB`) arrive gzipped in `{ __gz }`.
- **Cleanup Requirement**: On screen unmount, thread switch, tenant switch, or logout, client emits `chat:leave`, unsubscribes channels, clears heartbeat timers, and disconnects sockets cleanly.

### 6.2 Event Matrix
| Direction | Event Name(s) | Channel / Room | Consumer Module |
|---|---|---|---|
| Client -> Server | `join-tenant`, `chat:join`, `chat:leave`, `chat:typing`, `chat:delivered`, `chat:read` | Socket.IO | Chat |
| Server -> Client | `chat:message`, `chat:message_edited`, `chat:message_deleted`, `chat:message_pinned`, `chat:reaction`, `chat:poll_updated`, `chat:delivered`, `chat:read`, `chat:typing`, `chat:group_created`, `chat:group_updated`, `chat:room_revoked`, `presence:update` | Socket.IO + Pusher `private-user-*` / `private-tenant-*` | Chat |
| Both | `call:invite`, `call:incoming`, `call:accepted`, `call:answered_elsewhere`, `call:rejected`, `call:cancelled`, `call:busy`, `call:timeout`, `call:signal`, `call:media-state`, `call:ended`, `call:participant_invited`, `call:participant_joined`, `call:participant_left` | Socket.IO + Pusher `private-user-*` | Chat Calling |
| Both | `group-call:start`, `group-call:incoming`, `group-call:join`, `group-call:user_joined`, `group-call:user_left`, `group-call:media_state`, `group-call:state_sync`, `group-call:signal`, `group-call:removed`, `group-call:ended` | Socket.IO + Pusher `private-user-*` | Group Meetings |
| Server -> Client | `calendar:reminder-due`, `calendar:event-shared`, `calendar:event-updated`, `calendar:event-cancelled`, `calendar:event-deleted`, `calendar:rsvp-updated` | Pusher `private-user-*` | Calendar (invalidates queries) |
| Server -> Client | `notification:new` | Socket.IO + Pusher `private-user-*` | Global / Todo / Calendar |

---

## 7 & 9. Permission, Ownership & Role-Specific Data Scope Matrix

**Super Admin Exclusion**: `super_admin` is blocked from mobile login (`403 SUPER_ADMIN_MOBILE_ACCESS_DENIED`) and has no mobile persona.  
**Shared UI Rule**: `hr_admin`, `tenant_admin`, and `employee` (plus `manager`) render the **exact same screen components**. Only backend-returned data scope and authoritative permission/ownership flags vary:

| Capability / Scope | Employee (`employee`) | HR Admin (`hr_admin`) | Tenant Admin (`tenant_admin`) |
|---|---|---|---|
| **Chat 1:1 DMs** | Own 1:1 threads only (`direct_<a>_<b>` zero-trust participant guard). | Own 1:1 threads only (cannot read others' DMs). | Own 1:1 threads only (cannot read others' DMs). |
| **Chat Groups** | Member groups only. Can create custom groups (`chat.create_group`). Read-only in `isAnnouncementOnly` groups unless group `owner`/`admin`. | Member groups for reading; can create `announcement` groups (`chat.announcements`) and moderate group settings/members/messages across workspace groups. | Same as HR Admin + host override on poll close (`POST /poll/close`) and meeting end/remove (`POST /meetings/:id/end`, `/remove`). |
| **Call Logs (`GET /api/chat/calls`)** | Own calls only (`callerId`/`receiverId`/`participantIds`). | Own calls only. | All tenant call records (`isAdmin` in `chat.routes.ts:4625`). |
| **Calendar (`GET /api/calendar/events` + Composite)** | Own events, `organization` visibility events, shared events (`view`/`edit`), own todos, own/dept approved leaves, company holidays/birthdays (`/api/me/calendar/events`). Cannot override room conflicts (`403`). | Above + HR composite projections (`/api/hr/calendar/events`: all tenant leaves, interviews, onboarding, trainings), cancel events, view audit logs, override room conflicts (`ignoreConflicts: true`). | All tenant calendar events (`isSystemAdmin`), full edit/delete/cancel/audit, HR composite projections, override room conflicts. |
| **Todo & Gantt (`/api/todos`)** | Tasks where user is **creator** (`isCreator`) or **assignee** (`isAssignee`). Assignees can toggle complete, star, checklist, comments, description, but **cannot** edit `title`/`priority`/`tag`/`dueDate`/`assignees` or `DELETE` task (`isCreator` required). | Calling `GET /api/todos?scope=all` returns all tenant tasks; full create/edit/reassign/delete across tenant tasks. | Calling `GET /api/todos?scope=all` returns all tenant tasks; full create/edit/reassign/delete across tenant tasks. |

---

## 8. Empty, Loading, Error & Success States

- **Loading**: Branded `ActivityIndicator` skeleton/loading states on initial query fetch, top spinner on cursor history pagination, button-level loading indicators on every mutation (`Send`, `Create`, `Save`, `RSVP`, `Delete`, `Upload`).
- **Empty**: Contextual empty states with actionable primary CTA (e.g. *No conversations yet -> Start New Chat*, *No events scheduled for this period -> Create Event*, *No tasks match criteria -> Create Task* / *Reset Filters*, *No tasks in timeline window*).
- **Error & Retry**: Explicit error banners with `Retry` button when network/API queries fail (never silently masking query failures as empty states without retry), inline message `Retry` / `Discard` queue on failed chat sends, HTTP `409` Conflict resolution modal in Calendar, and `Alert` / toast feedback surfacing authoritative `ApiError` messages on `400`/`403`/`413`.
- **Success**: Immediate optimistic/invalidated cache refresh across linked modules (e.g., Todo mutations invalidate both `todos` and `calendar` query keys) and clear confirmation feedback.

---

## 10. Reference Web Screenshots & Mobile Adaptation Evidence

### Original Web Source Reference Screenshots (Repository Baseline)
- **Chat**:
  - HR Admin: `docs/Saas/screenshots/phase-1-1-security-regression/hr_admin_chat-direct.png`
  - Tenant Admin: `docs/Saas/screenshots/phase-1-1-security-regression/tenant_admin_chat-direct.png`
  - Employee: `docs/Saas/screenshots/phase-1-1-security-regression/employee_tester_chat-direct.png`
  - Responsive Web Mobile (`390x844`): `docs/Saas/screenshots/responsive_audit/04_personal_chat_mobile_390x844.png`, `05_group_chat_mobile_390x844.png`, `06_chat_calls_mobile_390x844.png`
- **Calendar**:
  - HR Admin: `docs/Saas/screenshots/phase-1-1-security-regression/hr_admin_calendar.png`
  - Tenant Admin: `docs/Saas/screenshots/phase-1-1-security-regression/tenant_admin_calendar.png`
  - Employee: `docs/Saas/screenshots/phase-1-1-security-regression/employee_tester_calendar.png`
  - Mobile Filter Drawer (`390x844`): `docs/Saas/screenshots/wave1_verification/hr_calendar_390x844_drawer_opened.png`
- **Todo & Gantt**:
  - HR Admin: `docs/Saas/screenshots/phase-1-1-security-regression/hr_admin_todo-list.png`, `hr_admin_todo-gantt.png`
  - Tenant Admin: `docs/Saas/screenshots/phase-1-1-security-regression/tenant_admin_todo-list.png`, `tenant_admin_todo-gantt.png`
  - Employee: `docs/Saas/screenshots/phase-1-1-security-regression/employee_tester_todo-list.png`, `employee_tester_todo-gantt.png`
  - Responsive Web Mobile (`390x844`): `docs/Saas/screenshots/responsive_audit/02_todo_mobile_390x844.png`, `03_gantt_mobile_390x844.png`

### Mobile Adaptation Screenshots
- Mobile verification screenshots across HR Admin, Tenant Admin, and Employee sessions are captured during Phase 7 testing and cataloged in `docs/mobile/screenshots/` and `MASTERHRMS_MOBILE_SHARED_ROLE_UI_VERIFICATION.md`.

---

## 11. Known Gaps, Native Hardware Constraints & Backend Dependencies

1. **Native WebRTC Media Engine (`react-native-webrtc`)**:
   - `mobile-app/package.json` does not currently link `react-native-webrtc` (and standard Expo Go client does not bundle custom WebRTC C++ native binaries).
   - **Mobile Adaptation**: All call signaling, incoming call detection (`/api/calls/pending` + Socket/Pusher `call:incoming` / `group-call:incoming`), accept/reject/cancel/end/heartbeat, mid-call colleague invites, group meeting room join/leave/end/roster/chat, and call history logging work **100% against the real backend APIs** without any fake timers. When `RTCPeerConnection` is present (in a custom dev build with WebRTC), WebRTC SDP/ICE signaling runs natively; when absent (e.g. Expo Go), the Call UI transparently surfaces `"Signaling connected — Native WebRTC media stream requires a custom native build"` while maintaining real server session state & call controls.
2. **Native File Picker & Voice Recording Modules**:
   - `expo-document-picker`, `expo-image-picker`, and `expo-av` are not currently installed in `mobile-app/node_modules`.
   - **Mobile Adaptation**: Attachment and voice-note services dynamically detect optional native picker/recorder modules at runtime (zero crash if absent), support sharing/opening signed URLs via React Native `Linking` / `Share`, enforce the backend's 30 MB & 55-extension chat security policy client-side before `POST /api/chat/upload`, and render full playback/preview UI for all existing and incoming attachments & voice notes.
3. **Authenticated `.ICS` Export on Mobile**:
   - Web uses `window.open("/api/calendar/export/ics")`, which relies on browser cookies and fails in mobile native browsers where JWT lives in Keychain/memory.
   - **Mobile Adaptation**: Mobile fetches `GET /api/calendar/export/ics` and `GET /api/calendar/events/:id/export/ics` through `apiClient` (with `Authorization: Bearer <token>` and `x-tenant-id`) and shares the real RFC 5545 `VCALENDAR` text via React Native's native `Share.share()` sheet.
4. **Known Backend Behaviors Preserved Without Backend Edits**:
   - `calendar.routes.ts` `POST /events` rejects `startDate` earlier than today (`400 EVENT_DATE_IN_PAST`); mobile Create Event form defaults to today/future dates and surfaces backend validation errors cleanly.
   - `calendar.routes.ts` `/events/:id/share` checks `["super_admin", "admin", "hr_admin"]` + event owner (`userId`); mobile checks ownership + permissions and handles `403` gracefully.
   - `hr-collaboration.routes.ts` `/api/hr/calendar/events` has no server-side role check; mobile strictly calls `/api/me/calendar/events` when `activeRole === 'employee'` and `/api/hr/calendar/events` only when user has HR/Tenant Admin permissions (`hrm.dashboard.view` / `hrm.manage`), preventing over-fetching on employee persona.

---

## 12. API Reuse Matrix (Zero New Backend Routes Created)

| Mobile Feature | Existing Backend Endpoint(s) Reused | Employee | HR Admin | Tenant Admin | New Route Needed? |
|---|---|---|---|---|---|
| Chat Conversations, Pin, Prefs | `GET /api/chat/conversations`, `POST /:id/pin`, `PATCH /:id/preferences` | Yes | Yes | Yes | **No** |
| Direct Chat & Participant Info | `POST /api/chat/conversations/direct`, `GET /api/chat/contacts`, `GET /api/chat/participant/:id` | Yes | Yes | Yes | **No** |
| Groups, Templates & Admin | `GET/POST /api/chat/groups`, `PATCH/DELETE /:id`, `/members`, `/invite-link`, `/hrms/group-templates`, `/hrms/groups/from-org` | Yes (member/create) | Yes (+ announcement & mod) | Yes (+ announcement & mod) | **No** |
| Messages, Polls, Reactions, Forward | `GET /api/chat/messages/:threadId`, `POST /api/chat/messages`, `PATCH/DELETE /:id`, `/pin`, `/react`, `/poll/vote`, `/poll/close`, `/forward-batch`, `/read`, `/delivered` | Yes | Yes | Yes | **No** |
| Global & Thread Search | `GET /api/chat/search`, `GET /api/chat/messages/:threadId/search` | Yes | Yes | Yes | **No** |
| Chat Upload & Signed Download | `GET /api/chat/file-policy`, `POST /api/chat/upload`, `GET /api/chat/attachments/:mediaId/download` | Yes | Yes | Yes | **No** |
| Presence & Realtime Auth | `GET/POST /api/chat/presence`, `GET /api/pusher/config`, `POST /api/pusher/auth`, Socket.IO `/socket.io` | Yes | Yes | Yes | **No** |
| 1:1 Calls, Mesh & Call History | `GET /api/calls/pending`, `POST /api/calls/invite`, `/:id/accept\|reject\|cancel\|end\|heartbeat\|signal\|media-state\|invite-colleague`, `GET/POST/DELETE /api/chat/calls` | Yes (own logs) | Yes (own logs) | Yes (tenant logs) | **No** |
| Multiparty Group Meetings | `POST /api/chat/meetings/start`, `/:callId/join\|leave\|end\|signal\|media-state\|invite\|remove`, `GET /:callId/participants` | Yes | Yes | Yes (+ host override) | **No** |
| Calendar Categories & Rooms | `GET/POST/PUT/DELETE /api/calendar/categories`, `GET /api/calendar/rooms`, `GET /api/calendar/eligible-recipients` | Yes | Yes | Yes | **No** |
| Calendar Events, Recurrence & Conflicts | `GET/POST /api/calendar/events`, `PUT/DELETE /:id`, `POST /:id/cancel`, `POST /:id/rsvp`, `POST/DELETE /:id/share`, `POST /check-conflicts`, `POST /recurrence/preview`, `GET /:id/audit-logs`, `GET /export/ics` | Yes | Yes | Yes | **No** |
| HR / Employee Composite Projections | `GET /api/me/calendar/events` (Employee) / `GET /api/hr/calendar/events` (HR & Tenant Admin) | `/api/me/...` | `/api/hr/...` | `/api/hr/...` | **No** |
| Todo List, Categories & Assignees | `GET/POST /api/todos`, `PUT/DELETE /api/todos/:id`, `GET/POST/PUT/DELETE /api/todos/categories`, `GET /api/todos/assignees` | Own/Assigned | `?scope=all` | `?scope=all` | **No** |
| Todo Subtasks & Comments | `POST /api/todos/:id/checklist`, `PATCH/DELETE /:id/checklist/:itemId`, `POST /api/todos/:id/comments` | Yes | Yes | Yes | **No** |
| Gantt Timeline | `GET /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id` + checklist/comment endpoints | Own/Assigned | `?scope=all` | `?scope=all` | **No** |
