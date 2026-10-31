# MASTERHRMS — PHASE 1: FUNCTION VERIFICATION MATRIX

**Project:** MasterHRMS Multi-Tenant SaaS  
**Phase:** 1 — Full Responsive Architecture Audit & Baseline (Read-Only)  
**Date:** October 31, 2026  
**Status:** AUDIT COMPLETE — MATRIX ESTABLISHED

---

## 1. Critical Module Function Inventory

The table below traces the exported and primary functions of the audited core modules, analyzing their API endpoints, state bindings, callers, and test verification status.

| Module | Function / Hook | Callers / Location | API Endpoint(s) | State Management | Test Verification Status | Responsive Defect / Gap |
|---|---|---|---|---|:---:|---|
| **Workspace Layout** | `WorkspaceShell` | `WorkspaceLayout` (`(workspace)/layout.tsx`) | `/api/auth/profile`, `/api/tenant/branding`, `/api/app-config` | React Query (`useCurrentProfile`), `useState(mobileOpen)` | ⚠️ **PARTIAL** (Desktop only) | Breakpoint mismatch at 992px–1023px causes simultaneous desktop & mobile controls. |
| **Workspace Layout** | `filterSearchItems` | CommandDialog (⌘K) | Local memory filter | `useState(searchOpen)` | ⚠️ **UNTESTED** | CommandDialog overflows on screens < 360px without max-height scroll limit. |
| **Super Shell** | `SuperShell` | `SuperLayout` (`super/layout.tsx`) | `/api/auth/profile`, `/api/super/tenants` | `useState(collapsed)`, `useState(mobileOpen)` | ⚠️ **PARTIAL** (Desktop only) | Duplicated sidebar implementation separate from `DreamsSidebar`. |
| **Calendar Engine** | `UnifiedCalendarApp` | `/calendar`, `/tenant/calendar`, `/hr/calendar`, `/me/calendar` | `/api/calendar/events`, `/api/calendar/categories` | React Query (`calendar-events`), `useState(viewMode, currentDate)` | ⚠️ **PARTIAL** (Desktop only) | Fixed 256px sidebar squashes 7-column month grid to ~15px per day on mobile. |
| **Calendar Engine** | `exportCalendarCSV` | Calendar Bottom Toolbar | Client-side CSV Blob synthesis | N/A | ⚠️ **UNTESTED** | Works on desktop; fails or freezes on mobile browsers without blob download handler. |
| **Calendar Engine** | `handleToday`, `handlePrev`, `handleNext` | Calendar Header Toolbar | N/A (date-fns arithmetic) | `useState(currentDate)` | ⚠️ **PARTIAL** | Buttons overlap month title on viewports < 480px. |
| **Chat Engine** | `UnifiedChatApp` | `/tenant/chat/*`, `/hr/chat/*`, `/me/chat/*` | `/api/chat/threads`, `/api/chat/messages`, `/api/chat/contacts` | Pusher JS (`ap2`), Socket.IO, `useState(activeThreadId, showInfo)` | ⚠️ **PARTIAL** (Desktop only) | `showInfo` defaults to `true`, covering message panel on mobile screens. |
| **Chat Engine** | `handleModeSelect` | Segmented switcher (`Personal`, `Group`, `Calls`) | N/A | `useState(mode)` | ⚠️ **PARTIAL** | When `mode === 'calls'`, aside is hidden on mobile, trapping user in Calls mode. |
| **Chat Engine** | `handleInitiateCall` | Chat header, Contact cards | WebRTC signaling over Socket.IO / Pusher | `useState(activeCall)` | ⚠️ **PARTIAL** | WebRTC overlay modal lacks viewport constraints on mobile landscape (844x390). |
| **File Manager** | `UnifiedFileManager` | `/tenant/files`, `/hr/files`, `/me/files`, `/super/files` | `/api/files`, `/api/files/folders`, `/api/files/storage/usage` | React Query (`files`), `useState(view, selectedIds)` | ⚠️ **PARTIAL** (Desktop only) | Details View table overflows horizontally on mobile; action buttons clipped. |
| **File Manager** | `handleFileUpload` | New folder dropdown, Drag-drop zone | `POST /api/files/upload` (Multer) | `useMutation` | ✅ **VERIFIED** | Upload modal works, but dropzone text wraps awkwardly on small phones. |
| **File Manager** | `renderInspectorInner` | Details inspector pane | `/api/files/:id/usages` | `useState(activeInspectorItem, showInspector)` | ⚠️ **PARTIAL** | Fixed width pane squashes file preview on tablet portrait (768px). |
| **Todo & Tasks** | `UnifiedTodoApp` | `/tenant/todo`, `/hr/todo`, `/me/todo` | `/api/todos`, `/api/todos/categories` | React Query (`todos`), `useState(viewMode, selectedTodo)` | ⚠️ **PARTIAL** (Desktop only) | Stat cards in `StatsOverviewGrid` wrap onto 4+ lines on screens < 400px. |
| **Gantt Engine** | `GanttTimelineView` | `/tenant/todo/gantt`, `/hr/todo/gantt` | `/api/todos` | `useState(timelineScale, timelineDates)` | ❌ **UNVERIFIED** on mobile | Hardcoded 700px min-width and 233px sticky column make Gantt unusable on mobile. |
| **Call History** | `CallHistoryPage` | `/call-history` | `/crm/calls` | React Query (`crm-calls`), `useState(callTypeFilter)` | ⚠️ **PARTIAL** (Desktop only) | `<Table className="min-w-[640px]">` forces severe horizontal overflow on mobile. |

---

## 2. Identified Dead Code & Duplications

1. **Duplicated Calendar Apps:**
   - [`CMS/src/components/calendar/unified-calendar-app.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/calendar/unified-calendar-app.tsx) (Authoritative).
   - [`CMS/src/components/apps/calendar/classic-calendar-app.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/apps/calendar/classic-calendar-app.tsx) (Historical dead component, 0 active callers).
2. **Duplicated Chat Apps:**
   - [`CMS/src/components/chat/unified-chat-app.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/chat/unified-chat-app.tsx) (Authoritative).
   - [`CMS/src/components/apps/chat/classic-chat-app.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/apps/chat/classic-chat-app.tsx) (Historical dead component, 0 active callers).
3. **Duplicated File Manager Apps:**
   - [`CMS/src/components/apps/file-manager/unified-file-manager.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/apps/file-manager/unified-file-manager.tsx) (Authoritative).
   - [`CMS/src/components/apps/file-manager/classic-file-manager-app.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/apps/file-manager/classic-file-manager-app.tsx) (Only used by legacy `/apps/file-manager/grid-view` redirector).

---

## 3. Functions Lacking Meaningful Automated Tests

The audit confirmed that the following critical responsive behaviors currently have **zero automated Playwright test assertions**:
1. `UnifiedCalendarApp`: Filter drawer opening/closing on viewports `< 1024px`.
2. `UnifiedChatApp`: Single-panel conversation-to-message transition and back navigation on viewports `< 768px`.
3. `UnifiedChatApp`: Inescapable Calls mode navigation recovery on viewports `< 768px`.
4. `UnifiedFileManager`: Details View column overflow and touch-based action menu opening.
5. `UnifiedTodoApp`: Gantt horizontal canvas touch panning and milestone bar clipping.
6. `CallHistoryPage`: Responsive card-view fallback rendering under 640px.

---
**Document Status:** Verified Complete — Proceed to Playwright Coverage Gap Report.

