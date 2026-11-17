# MASTERHRMS MOBILE — GANTT MIGRATION REPORT

**Date:** 2026-11-17  
**Module:** Unified Gantt Timeline  
**Source of Truth:** `CMS/src/components/todo/unified-todo-app.tsx` (`viewMode === "gantt"`, lines 2060–2300) & `src/components/todo/gantt-timeline-view.tsx` + `server/src/routes/todos.routes.ts`  
**Mobile Implementation:**
- `mobile-app/src/components/workspace/WorkspaceModuleShell.tsx`
- `mobile-app/src/core/services/todoService.ts`
- `mobile-app/src/modules/todo/components/TodoSharedModals.tsx`
- `mobile-app/src/modules/todo/screens/GanttTimelineScreen.tsx`

---

## 1. Architecture & Fidelity Summary

- **Single Shared Component:** `GanttTimelineScreen` is reused identically across `hr_admin`, `tenant_admin`, `employee`, and `manager` navigators.
- **Accurate Date-Driven Bar Geometry:** Replaced the prototype's fabricated `left: 2 * CELL_WIDTH` bar placement and hardcoded `2026-11-16` base date with real millisecond span math over `todo.startDate` and `todo.dueDate` clamped to the active `14`- or `28`-day window (`today - 2 days + offset * 7 days`).
- **Phone & Tablet Ergonomics:** Implements a horizontally scrollable timeline grid paired with a **pinned left task column** (`148px` on phone, `210px` on tablet), weekend shading on Saturday/Sunday columns, a highlighted Today header + vertical Today marker line, priority/status-coded bars, and internal progress fill bars.
- **Full Inspector Parity (`CMS/src/` Fix Preserved):** Tapping any pinned task row or Gantt bar opens `TodoTaskInspectorSheet` with complete support for task completion, rescheduling (`startDate`/`dueDate` via `TodoTaskFormModal`), deletion, checklist subtasks, comments, and activity history — all persisted via `/api/todos/*`.
- **Zero Invented Project Features:** Does not invent task dependency arrows, critical-path calculations, or resource leveling that do not exist in the web source application.

---

## 2. Capability Verification Matrix (5-Tier Status)

| Capability | Implemented in Code | Unit Tested | API Contract Tested | Real-Device Tested | Not Tested / Blocked |
|---|---|---|---|---|---|
| `List` <-> `Gantt` switching & shared 4-module bar | Yes (`GanttTimelineScreen.tsx`, `TodoListScreen.tsx`) | Yes (`collaboration_shared_role_ui.test.tsx`) | Yes | No | Physical device / iOS Simulator blocked by sandbox |
| `14d` & `28d` timeline scales + `Prev` / `Today` / `Next` week navigation | Yes (`GanttTimelineScreen.tsx`) | Yes (scale switch & `Next week` interaction test) | N/A (client window math) | No | Live device gesture not run |
| Pinned left task column + horizontally scrollable date grid | Yes (`GanttTimelineScreen.tsx`) | Yes | Yes | No | Live touch horizontal pan not run on physical device |
| Weekend shading & Today header/vertical line marker | Yes (`isWeekend`, `isToday`, `todayVerticalLine`) | Yes | N/A | No | Live device UI blocked by sandbox |
| Priority/status-coded task bars & progress `%` fill display | Yes (`GanttTimelineScreen.tsx`) | Yes | Yes | No | Live device UI blocked by sandbox |
| Task selection -> shared `TodoTaskInspectorSheet` (reschedule/edit, complete, delete, checklist, comments, activity) | Yes (`TodoSharedModals.tsx`) | Yes | Yes | No | Live device UI blocked by sandbox |

---

## 3. Visual Evidence

- HR Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/gantt_hr_admin_390x844.png`
- Tenant Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/gantt_tenant_admin_390x844.png`
- Employee (`390x844` mounted RN tree render): `docs/mobile/screenshots/gantt_employee_390x844.png`
