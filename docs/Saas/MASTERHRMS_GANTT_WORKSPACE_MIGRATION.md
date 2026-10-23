# MASTERHRMS — Interactive Gantt Timeline Workspace Migration Report

## Executive Summary

This report documents the migration and verification of **Gap 3: Interactive Gantt Timeline** from the Jampack Classic reference application (`classic/src/routes/_app.apps.todo.gantt.jsx`) into the authoritative MASTERHRMS workspace under `src/` and `CMS/src/`.

The Gantt Timeline replaces the previous static/mock timeline representation with a live, persistent, SVG-based timeline view integrated directly into the workspace task management area. The component connects to the existing `/api/todos` and `/api/projects` backend routes, supports interactive date rescheduling and progress updating, persists all mutations to Supabase PostgreSQL, and includes seamless view switching between the classic List View and the Gantt Timeline View.

---

## 1. Actual Files Changed & Created

| Component / Layer | File Path | Purpose / Description |
|---|---|---|
| **Frontend Core Component** | `src/components/todo/gantt-timeline-view.tsx` | Interactive SVG timeline renderer supporting 14-day and 28-day scales, day/week stepping, search and priority filtering, interactive reschedule/edit dialogs, task addition, and real-time backend mutations calling `PUT /api/todos/:id` and `POST /api/todos`. |
| **Frontend TanStack Route (Apps)** | `src/routes/_authenticated/_app/apps.todo.gantt.tsx` | Dedicated canonical route for `/apps/todo/gantt`. |
| **Frontend Workspace View (HR)** | `src/routes/_authenticated/hr/todo.tsx` | Integrated view switcher (`[List View] \| [Gantt Timeline]`) in `PageHeader` actions, rendering `GanttTimelineView` conditionally. |
| **Frontend Workspace View (Employee)** | `src/routes/_authenticated/me/todo.tsx` | Integrated view switcher (`[List View] \| [Gantt Timeline]`) for personal tasks. |
| **Frontend CMS Component** | `CMS/src/components/todo/gantt-timeline-view.tsx` | Client-hydrated Next.js component parity. |
| **Frontend CMS Route (Apps)** | `CMS/src/app/(workspace)/apps/todo/gantt/page.tsx` | Next.js App Router workspace page for `/apps/todo/gantt`. |
| **Frontend CMS Workspace View** | `CMS/src/app/(workspace)/todo/page.tsx` | Integrated view switcher in `PageHeader` rendering `GanttTimelineView`. |
| **Navigation Manifest (HR)** | `src/nav/hr-sidebar.ts` & `CMS/src/nav/hr-sidebar.ts` | Added `Gantt Timeline` (`/apps/todo/gantt`) under `01. Overview`. |
| **Navigation Manifest (Employee)** | `src/nav/employee-sidebar.ts` & `CMS/src/nav/employee-sidebar.ts` | Updated `Todo & Gantt` (`/me/todo`) under `01. Overview & Profile`. |
| **Sidebar Navigation UI** | `CMS/src/components/dreams-sidebar.tsx` | Added `Interactive Gantt` link under `Applications`. |
| **Backend API Route** | `server/src/routes/todos.routes.ts` | Endpoints `GET /api/todos`, `POST /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id`. |
| **Backend Database Model** | `server/prisma/schema.prisma` | Underlying Prisma model `WorkspaceTodo` scoped by `userId` and `tenantId`. |
| **Verification Suite** | `scratch/verify_three_gaps.cjs` | Automated test suite validating Gantt task creation, date mutation, status update, reload persistence, and tenant isolation. |

---

## 2. Canonical Routes and Legacy Aliases

| Route | Environment | Type | Status | Description |
|---|---|---|---|---|
| `/apps/todo/gantt` | TanStack (5173) & Next.js (3000) | Canonical Route | **PASS** | Dedicated standalone Gantt timeline screen matching Classic path. |
| `/todo` | Next.js (3000) | Canonical Workspace Area | **PASS** | Todo workspace with built-in `[List View] \| [Gantt Timeline]` switcher. |
| `/hr/todo` | TanStack (5173) & Next.js (3000) | Canonical HR Area | **PASS** | HR Todo area with built-in Gantt view switcher. |
| `/me/todo` | TanStack (5173) & Next.js (3000) | Canonical Employee Area | **PASS** | Employee personal todo area with Gantt view switcher. |

---

## 3. Underlying Model & Persistence Contract

### Prisma Model: `WorkspaceTodo`
Located in `server/prisma/schema.prisma`:
```prisma
model WorkspaceTodo {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  title       String
  description String?
  completed   Boolean  @default(false)
  priority    String   @default("medium") // "low", "medium", "high", "urgent"
  tag         String   @default("projects")
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId, userId])
}
```

### Mutating Endpoints & Persistence Behavior

1. **Task Fetching (`GET /api/todos`):**
   - Retrieves all active tasks for the current user within their tenant context.
   - Computes dynamic Gantt bar positions:
     - `startDate`: Derived from `createdAt` or default 3 days prior to due date.
     - `dueDate`: Mapped from `dueDate` (defaults to 7 days from creation if unset).
     - `progress`: `100%` if `completed === true`, otherwise calculated as percentage of elapsed time between start and due date.
2. **Rescheduling & Progress Updates (`PUT /api/todos/:id`):**
   - Users can update due date deadlines and mark items complete directly from the Gantt bar or modal dialog.
   - The backend validates ownership: `where: { id, userId, tenantId }`.
   - Mutations immediately invalidate React Query cache (`['todos']`, `['hr-todo-items']`, `['me-todo-items']`).
   - Mutations persist across browser reloads.
3. **Task Creation (`POST /api/todos`):**
   - Allows creating new timeline deliverables with custom priority, category tag, and target completion date.

---

## 4. UI Capabilities & View Switcher

- **Dual View Modes:**
  Users can seamlessly toggle between **List View** and **Gantt Timeline** via the segmented pill buttons in `PageHeader`. The state is preserved during the active session.
- **Time Window Navigation:**
  - Scale toggle: **14 Days** vs **28 Days**.
  - Offset controls: **Previous Period**, **Today (Reset)**, **Next Period**.
- **Interactive SVG Timeline:**
  - Date grid lines with weekend shading (Saturday/Sunday).
  - "Today" indicator line rendered in primary indigo.
  - Priority-coded gradient task bars (Red for High/Urgent, Amber for Medium, Blue for Low).
  - Progress fill bar showing task completion percentage.
  - Quick action buttons on hover: **Edit/Reschedule**, **Toggle Done**, and **Delete**.

---

## 5. Automated Verification Results

Test execution from `scratch/verify_three_gaps.cjs`:

```
--- 3. Gap 3: Interactive Gantt Timeline ---
[PASS] GET /api/todos loads persistent tasks for Gantt timeline
[PASS] POST /api/todos creates new task for Gantt timeline
[PASS] PUT /api/todos/:id mutates task due date & progress successfully
[PASS] Persistence: Mutated Gantt task properties persist across database reloads
[PASS] Authorization: Cross-tenant cannot update task (returns 403/404)
[PASS] DELETE /api/todos/:id cleans up test Gantt task
```

---

## 6. Playwright Screenshots

- **Dedicated Gantt Route (`/apps/todo/gantt`):**
  `docs/Saas/screenshots/migration-audit/migrated_todo_gantt_timeline.png`
- **Integrated View Switcher in Todo Area (`/todo`):**
  `docs/Saas/screenshots/migration-audit/migrated_todo_switcher_gantt.png`

---

## 7. Status Classification

| Workflow | Classification | Evidence |
|---|---|---|
| Route `/apps/todo/gantt` Loading | **PASS** | HTTP 200, Playwright screenshot verified |
| View Switcher in `/todo`, `/hr/todo`, `/me/todo` | **PASS** | Interactive toggle verified and captured |
| Persistent Task Fetching | **PASS** | Loads real `WorkspaceTodo` records from PostgreSQL |
| Date Rescheduling Mutation | **PASS** | `PUT /api/todos/:id` updates `dueDate` in DB |
| Progress & Completion Mutation | **PASS** | `PUT /api/todos/:id` sets `completed: true` |
| Database Reload Persistence | **PASS** | Verified values persist across subsequent `GET` requests |
| Tenant & User Authorization Scoping | **PASS** | Cross-tenant update blocked with HTTP 404 |
| Real-time React Query Invalidation | **PASS** | Live UI reflects mutation immediately |
