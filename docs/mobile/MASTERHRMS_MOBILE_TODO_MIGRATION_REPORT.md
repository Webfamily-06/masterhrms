# MASTERHRMS MOBILE — TODO MIGRATION REPORT

**Date:** 2026-11-17  
**Module:** Unified Workspace Todo & Action Items  
**Source of Truth:** `CMS/src/components/todo/unified-todo-app.tsx` (2,516 lines) & `src/components/todo/unified-todo-app.tsx` (2,465 lines) + `server/src/routes/todos.routes.ts`  
**Mobile Implementation:**
- `mobile-app/src/components/workspace/WorkspaceModuleShell.tsx`
- `mobile-app/src/core/services/todoService.ts`
- `mobile-app/src/modules/todo/components/TodoSharedModals.tsx`
- `mobile-app/src/modules/todo/screens/TodoListScreen.tsx`

---

## 1. Architecture & Fidelity Summary

- **Single Shared Component & Modals:** `TodoListScreen`, `TodoTaskInspectorSheet`, `TodoTaskFormModal`, and `TodoCategoryManagerModal` are shared identically across `hr_admin`, `tenant_admin`, `employee`, and `manager` navigators.
- **Exact Backend Contract Alignment:** Reconciled mobile types with `server/src/routes/todos.routes.ts` (`completed: boolean`, `tag: string`, `priority: 'low'|'medium'|'high'|'urgent'`, `checklist[].done: boolean`, `comments[].author`, `activity[]`, `isCreator`, `isAssignee`).
- **Authoritative Ownership & Scope Enforcement:**
  - Employee sessions call `GET /api/todos` (creator + assignee tasks); non-creator assignees can toggle completion, star, checklist items, and post comments, while `Edit / Reschedule` and `Delete Task` are gated to `isCreator || isAdminPersona` matching `todos.routes.ts` lines 942–1412.
  - HR Admin & Tenant Admin sessions call `GET /api/todos?scope=all` and have full workspace task administration.
- **Two-Way Calendar Synchronization:** Task mutations invalidate both `['todos']` and `['calendar']` tenant-scoped React Query keys, and task detail provides 1-tap `View in Calendar` navigation.

---

## 2. Capability Verification Matrix (5-Tier Status)

| Capability | Implemented in Code | Unit Tested | API Contract Tested | Real-Device Tested | Not Tested / Blocked |
|---|---|---|---|---|---|
| 4 KPI Overview Cards (Deliverables, Pending, Done %, High/Urgent) | Yes (`TodoListScreen.tsx`) | Yes (`collaboration_shared_role_ui.test.tsx`) | Yes | No | Physical device / iOS Simulator blocked by sandbox |
| Search, Status tabs (`All`, `Pending`, `Done`), Priority, Category, Starred & Sort (`created`/`due`/`priority`/`progress`) + Reset | Yes (`TodoListScreen.tsx`) | Yes | Yes | No | Live device gesture not run |
| Create & Edit Task with `dueDate >= startDate` validation | Yes (`TodoTaskFormModal` in `TodoSharedModals.tsx`) | Covered in component & contract tests | Yes | No | Live device UI blocked by sandbox |
| Multi-assignee directory selector (`GET /api/todos/assignees` with Search, `Select All`, `Clear`) | Yes (`TodoTaskFormModal`) | Covered in service & component logic | Yes | No | Live device UI blocked by sandbox |
| Category CRUD (`GET/POST/PUT/DELETE /api/todos/categories` with `"internal"` delete guard) | Yes (`TodoCategoryManagerModal`) | Covered in service layer | Yes | No | Live device UI blocked by sandbox |
| Star / Favorite & Completion toggle (`0%` / `100%`) | Yes (`TodoListScreen.tsx` & `TodoTaskInspectorSheet`) | Yes | Yes | No | Live device UI blocked by sandbox |
| Task Detail Bottom Sheet: Checklist subtasks (add, toggle, delete + progress recalculation) | Yes (`TodoTaskInspectorSheet`) | Yes | Yes (`PATCH /checklist/:itemId`) | No | Live device UI blocked by sandbox |
| Task Detail Bottom Sheet: Comments & Activity audit stream | Yes (`TodoTaskInspectorSheet`) | Yes | Yes | No | Live device UI blocked by sandbox |
| Task deletion confirmation & ownership gating | Yes (`TodoTaskInspectorSheet`) | Yes (Employee assignee hidden vs HR Admin shown) | Yes | No | Live device UI blocked by sandbox |
| Explicit Error + Retry & Empty states | Yes (`WorkspaceErrorBlock`, `WorkspaceEmptyBlock`) | Yes (500/network rejection test) | Yes | No | Live device UI blocked by sandbox |

---

## 3. Visual Evidence

- HR Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/todo_hr_admin_390x844.png`
- Tenant Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/todo_tenant_admin_390x844.png`
- Employee (`390x844` mounted RN tree render): `docs/mobile/screenshots/todo_employee_390x844.png`
