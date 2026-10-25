# MASTERHRMS — Todo Task Dates Synchronization with Assigner and Assignee Calendars
## Comprehensive Architectural Specification, Integration, and Verification Report

**Date:** October 26, 2026  
**System:** MASTERHRMS Enterprise SaaS  
**Module:** Unified Calendar & Unified Todo Task Synchronization  
**Status:** IMPLEMENTED AND VERIFIED (All 15 Acceptance Criteria Passed)  
**Execution Environment:** Dual-Workspace (`src/` TanStack Start Vite + `CMS/` Next.js 15) & Express/Prisma Backend  

---

## 1. Executive Summary

This report documents the architectural design, implementation, and automated empirical verification of the Todo & Tasks scheduling synchronization with the unified MASTERHRMS Calendar system across `/hr/calendar`, `/me/calendar`, and `/tenant/calendar`.

Whenever a task in `prisma.workspaceTodo` has a valid start date and/or due/end date, it is dynamically projected into:
1. The **task assigner's** calendar (creator/author).
2. The **assigned employee's** calendar (`assigneeId`).
3. Every **additional authorized assignee's** calendar (`assignees` JSON array for multi-assignee support).

Rather than creating synthetic, duplicate `CalendarEvent` rows in the database (which causes data drift, N+1 bloat, and dual notifications), the integration employs a high-performance, read-only, tenant-isolated **task-to-calendar projection engine** directly within `CalendarService.getEvents` and `calendarRouter.get("/events")`.

---

## 2. Source of Truth for Task Dates

The authoritative persistence model for task dates is the `prisma.workspaceTodo` table (`workspace_todos` in PostgreSQL):

| Field / Property | Storage Mechanism | Schema / Format | Description |
| :--- | :--- | :--- | :--- |
| **Due / End Date** | Native column `due_date` | `TIMESTAMPTZ` / `Date` | Database column storing the task deadline. |
| **Start Date** | Metadata envelope `<!--TODO_META:...-->` inside `description` | ISO 8601 string (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`) | Key `startDate` inside JSON metadata comment. |
| **Progress** | Metadata envelope `<!--TODO_META:...-->` inside `description` | Integer (`0`–`100`) | Task completion percentage, editable via Gantt timeline or detail view. |
| **Multi-Assignees** | Metadata envelope `<!--TODO_META:...-->` inside `description` | Array of strings (`string[]`) | Secondary assignees authorized to participate in the task. |
| **Assignee ID** | Native column `assignee_id` | `VARCHAR(36)` | Primary assigned employee ID. |
| **Creator ID** | Native column `user_id` | `VARCHAR(36)` | User ID of the assigner / author. |
| **Tenant ID** | Native column `tenant_id` | `VARCHAR(36)` | Tenant isolation boundary key. |

### Strict Server-Side Validation
In `server/src/routes/todos.routes.ts`:
- **Invalid Date Formats:** `POST /` and `PUT /:id` reject malformed date strings with HTTP 400 (`INVALID_DATE`).
- **Reversed Date Ranges:** When both `startDate` and `dueDate` are supplied, the server strictly validates that `new Date(startDate) <= new Date(dueDate)`. If reversed (`startDate > dueDate`), the server immediately rejects the request with HTTP 400 (`INVALID_DATE_RANGE`), preventing dirty or reversed scheduling data.

---

## 3. Read-Only Task-to-Calendar Projection Architecture

### Why Read-Only Projection Over Duplicate Events?
Creating separate `CalendarEvent` database records for every task creates substantial architectural liabilities:
- **Synchronization Drift:** Modifying a task in Gantt or the Todo list requires multi-table transactional cascading updates.
- **Duplicate Reminders:** Independent `CalendarEventReminder` records would fire redundant push/email notifications alongside Todo reminders.
- **Garbage & Orphan Records:** Deleting a task without deleting the duplicate calendar event leaves phantom records.

### Projection Specification
Under `CalendarService.getEvents`, `prisma.workspaceTodo` records are queried and transformed into `NormalizedCalendarEvent` objects in-flight:

```typescript
// Deterministic and stable projection ID
id: `todo-${task.id}`

// Type identification
sourceDomain: "todo"
eventType: "todo"
categoryId: "todo"
category: "Todo & Tasks"

// Temporal coordinates
startDate: taskStartDate.toISOString()
endDate: taskEndDate.toISOString()
allDay: true // or false if specific time boundaries are set

// Participation & Authorization
userPermission: isAssigner ? "edit" : "view"
isExternal: true
```

### Unscheduled & Point-in-Time Tasks
- **Tasks with No Schedule:** If a task has neither `startDate` nor `dueDate`, it produces **zero** calendar entries. No fabricated or synthetic dates are ever invented.
- **Due-Date-Only Tasks:** If a task has a `dueDate` but no `startDate`, the projection maps `startDate === endDate`, cleanly rendering as an all-day point-in-time task entry on the due date.

---

## 4. Participant Calendar Visibility and Tenant Isolation

Server-side authorization is strictly enforced on every calendar query:

1. **Tenant Isolation:**
   - All queries filter by `tenantId = activeTenantId`.
   - The Prisma query proxy enforces `runWithTenantContext` boundary constraints. Cross-tenant queries return zero task records.
2. **Assigner Calendar Visibility:**
   - The user who created the task (`task.userId === viewerId`) sees the task on their calendar.
3. **Primary Assignee Calendar Visibility:**
   - The assigned employee (`task.assigneeId === viewerId`) sees the task on their calendar.
4. **Additional Assignees Visibility:**
   - Any user listed in `meta.assignees` (`meta.assignees.includes(viewerId)`) sees the task on their calendar.
5. **Non-Participant Employee Denial:**
   - Unrelated employees belonging to the same tenant cannot see private tasks.
6. **Dynamic Reassignment Access Transfer:**
   - When a task is reassigned from User B to User C, User B's calendar query automatically and immediately excludes the task, while User C immediately gains access.

---

## 5. UI Integration and Navigation

Both frontend implementations (`src/components/calendar/unified-calendar-app.tsx` and `CMS/src/components/calendar/unified-calendar-app.tsx` with 100% parity) distinguish projected tasks from ordinary events:

1. **Visual Styling:**
   - Distinctive Sky-500 palette (`#0ea5e9`, badge `bg-sky-500/15 text-sky-700 border-sky-500/30`).
   - Square checkbox icon (`CheckSquare`) replaces generic calendar pin or clock icons across Month, Week, Day, Agenda, and Upcoming lists.
2. **Dedicated Task Dialog Details:**
   - Clicking a task in the calendar opens a specialized task inspection card showing task status (`pending`, `in_progress`, `completed`), priority (`low`, `medium`, `high`, `urgent`), assignee, schedule range, and live progress bar (`0%–100%`).
3. **Action Isolation:**
   - Event-only actions (RSVP, event cancellation, recurrence rules, attendee invitations, audit logs) are hidden for projected tasks.
4. **Role-Preserving Deep-Links:**
   - **"Open in Todo" button:** Directs the user to the authoritative Todo module, preserving the active workspace namespace and pre-selecting the task:
     - HR: `/hr/todo?taskId=${task.id}`
     - Employee: `/me/todo?taskId=${task.id}`
     - Tenant Admin: `/tenant/todo?taskId=${task.id}`
   - **"View in Gantt" button:** Directs the user to `/hr/todo/gantt?taskId=${task.id}`, `/me/todo/gantt?taskId=${task.id}`, or `/tenant/todo/gantt?taskId=${task.id}`.
5. **Auto-Select on Navigation:**
   - `UnifiedTodoApp` inspects `window.location.search` for `taskId` upon mounting, automatically selecting the task in the detail pane.
6. **Reactive Cache Invalidation:**
   - Mutations in `UnifiedTodoApp` (`createMutation`, `updateMutation`, `deleteMutation`) automatically invalidate both `["calendar-events"]` and `["hr-calendar-composite-events"]`, ensuring immediate calendar updates when switching views.

---

## 6. RFC 5545 iCalendar (.ics) Export

The calendar export system (`CalendarExportService.generateIcs` and `calendarRouter.get("/export/ics")`) natively incorporates projected Todo tasks into exported calendar files:
- Task titles are formatted as `SUMMARY:Task: <Title>`.
- Dates and descriptions are preserved according to RFC 5545 conventions.

---

## 7. Modified Files and Components

| Component / File | Purpose & Modifications | Parity |
| :--- | :--- | :--- |
| `server/src/routes/todos.routes.ts` | Exported `parseTodoMeta`/`serializeTodoMeta`. Added date validation & reversed-date rejection (`INVALID_DATE_RANGE`). | Server |
| `server/src/services/calendar.service.ts` | Implemented Section 10 Todo projection in `CalendarService.getEvents` with tenant scoping, date-window filtering, and participant authorization. | Server |
| `server/src/routes/calendar.routes.ts` | Added `todo` system category to `SYSTEM_CATEGORIES`. Projected tasks into `calendarRouter.get("/events")` and `.ics` export. | Server |
| `src/components/calendar/unified-calendar-app.tsx` | Added task category styles, `CheckSquare` icon, dedicated task dialog, role-preserving deep-links, and `.ics` download. | 100% |
| `CMS/src/components/calendar/unified-calendar-app.tsx` | Identical updates as above for Next.js 15 CMS application. | 100% |
| `src/components/todo/unified-todo-app.tsx` | Added query client invalidation for calendar queries on mutations, plus `taskId` auto-select effect. | 100% |
| `CMS/src/components/todo/unified-todo-app.tsx` | Identical updates as above for Next.js 15 CMS application. | 100% |
| `scripts/test_todo_calendar_integration.cjs` | Comprehensive automated test suite testing all 15 specification criteria. | Test |
| `package.json` | Added `test:todo-calendar` npm run script. | Root |

---

## 8. Schema Migrations and Rollback Procedure

- **Schema Changes:** ZERO database schema changes were required. The integration uses existing columns (`due_date`, `assignee_id`, `user_id`, `tenant_id`) and the existing metadata envelope inside `description`.
- **Migration Safety:** No migrations were run, eliminating risk of migration deadlocks or database downtime.
- **Rollback Procedure:** If rollback is ever required, reverting `server/src/services/calendar.service.ts` and `server/src/routes/calendar.routes.ts` instantly removes task projections without touching any persisted task or calendar data.

---

## 9. Automated Verification Results

All tests were executed against the active database with automated cleanup.

### Verification Matrix (15 / 15 Criteria Passed)

```
================================================================
 MASTERHRMS TODO TASK DATES CALENDAR SYNCHRONIZATION TEST SUITE
================================================================

--- Criterion 1: Task Appears on Assigner & Assignee Calendars ---
  ✔ [Criterion 1/15] Task appears on assigner User A calendar
  ✔ [Criterion 1/15] Assigner calendar has correct start date
  ✔ [Criterion 1/15] Assigner calendar has correct due/end date
  ✔ [Criterion 1/15] Task appears on assignee User B calendar
  ✔ [Criterion 1/15] Assignee calendar has identical start date
  ✔ [Criterion 1/15] Assignee calendar has identical due/end date

--- Criterion 2: Single Unique Projection Per User ---
  ✔ [Criterion 2/15] Task appears exactly once in User A calendar projection
  ✔ [Criterion 2/15] Task appears exactly once in User B calendar projection

--- Criterion 3: Task Date Synchronization ---
  ✔ [Criterion 3/15] User A calendar reflects updated start date
  ✔ [Criterion 3/15] User A calendar reflects updated due date
  ✔ [Criterion 3/15] User B calendar reflects updated start date
  ✔ [Criterion 3/15] User B calendar reflects updated due date

--- Criterion 4: Title Synchronization ---
  ✔ [Criterion 4/15] User A calendar reflects updated task title
  ✔ [Criterion 4/15] User B calendar reflects updated task title

--- Criterion 5: Dynamic Reassignment Access Transfer ---
  ✔ [Criterion 5/15] Previous assignee User B no longer has calendar visibility for reassigned task
  ✔ [Criterion 5/15] New assignee User C gains immediate calendar visibility
  ✔ [Criterion 5/15] Assigner User A retains authorized calendar visibility

--- Criterion 6: No Fabricated Dates for Unscheduled Tasks ---
  ✔ [Criterion 6/15] Task with no valid schedule generates no fabricated calendar entry
  ✔ [Criterion 6/15] Task with only dueDate projects successfully
  ✔ [Criterion 6/15] Due-only task maps startDate === endDate (allDay point in time)

--- Criterion 7: Completion Status Preservation ---
  ✔ [Criterion 7/15] Completed task projects status === "completed"
  ✔ [Criterion 7/15] Completed task preserves boolean completed === true flag

--- Criterion 8: Tenant Scoping & Isolation ---
  ✔ [Criterion 8/15] Cross-tenant query cannot access task outside authorized tenant boundary

--- Criterion 9: Non-Participant Employee Access Denial ---
  ✔ [Criterion 9/15] Unrelated employee User D cannot see non-participant task

--- Criterion 10: Date Window Filtering ---
  ✔ [Criterion 10/15] Task is excluded when query date window does not overlap
  ✔ [Criterion 10/15] Task is included when query date window overlaps

--- Criterion 11: Task Identity Stability Across Refreshes ---
  ✔ [Criterion 11/15] Task projection ID is deterministic and stable across requests

--- Criterion 12: Role-Specific Navigation URL Resolution ---
  ✔ [Criterion 12/15] HR calendar viewer receives /hr/todo?taskId=... link
  ✔ [Criterion 12/15] Employee calendar viewer receives /me/todo?taskId=... link

--- Criterion 13: Core Calendar System Integrity ---
  ✔ [Criterion 13/15] Both standard calendar events and projected Todo tasks co-exist harmoniously

--- Criterion 14: Zero Duplicate Reminders or Synthetic Events ---
  ✔ [Criterion 14/15] Zero synthetic calendarEventReminder records generated for projected task
  ✔ [Criterion 14/15] No duplicate CalendarEvent row created in database (pure read-only projection)

--- Criterion 15: Gantt Timeline Edit Reflection in Calendar ---
  ✔ [Criterion 15/15] Assigner calendar reflects Gantt timeline start date
  ✔ [Criterion 15/15] Assigner calendar reflects Gantt timeline due date
  ✔ [Criterion 15/15] Assigner calendar reflects Gantt execution progress (75%)
  ✔ [Criterion 15/15] Assignee calendar reflects Gantt timeline start date
  ✔ [Criterion 15/15] Assignee calendar reflects Gantt timeline due date
  ✔ [Criterion 15/15] Assignee calendar reflects Gantt execution progress (75%)

--- Verification of RFC 5545 iCalendar (.ics) Export ---
  ✔ [Criterion 13/15] ICS generator outputs valid RFC 5545 envelope
  ✔ [Criterion 13/15] ICS export includes projected task title

================================================================
 ALL 15 CRITERIA PASSED: 40/40 assertions verified
 Evaluated Criteria Count: 15/15
================================================================
```

### Full Regression Test Summary
- **Server TypeScript Build:** Passed (`npm --prefix server run build` exit code 0).
- **CMS Typecheck:** Clean (`npm run cms:typecheck` exit code 0, 0 errors).
- **TanStack Vite Build:** Clean (`npm run build:vite` exit code 0 in 9.38s).
- **Todo & Tasks Consolidation Suite:** 34/34 assertions passed (`npm run test:todo-consolidation` exit code 0).
- **Workspace Routing Architecture Suite:** 46/46 assertions passed (`npm run test:workspace-routing` exit code 0).
- **Todo Calendar Integration Suite:** 40/40 assertions passed (`npm run test:todo-calendar` exit code 0).

---

## 10. Production Readiness & Gaps

- **Production Deployment Status:** Local implementation complete and verified with 100% test passing rate across server and dual frontends. Live remote production deployment remains `IMPLEMENTED — VERIFICATION PENDING` until staging release is deployed.
- **Identified Gaps / Future Work:**
  - Realtime WebSockets: When a task is updated, the frontend currently invalidates React Query caches on view navigation. If instant push updates across different browser sessions are desired in the future, emitting a `TODO_UPDATED` socket event to the active tenant room will trigger calendar invalidations on remote clients without user interaction.
