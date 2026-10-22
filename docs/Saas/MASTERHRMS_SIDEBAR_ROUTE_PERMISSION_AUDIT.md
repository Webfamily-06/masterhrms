# MASTERHRMS — Sidebar, Route Mapping & Role Permission Audit

**Date:** October 22, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Environment:** Frontend `http://localhost:5173` | Backend `http://localhost:4000`  
**Status:** PASS — Complete Synchronization & Zero Broken Links

---

## 1. Executive Summary

This audit evaluates the navigation hierarchy, sidebar structure, route mapping, and role-based access across all 15 organization-wide application routes in MasterHRMS. The sidebar configuration in `classic/src/layout/Sidebar/SidebarMenu.jsx` was audited and synchronized against authoritative router definitions in `classic/src/routes/Route.jsx`.

All discrepancies (including the previously misaligned `/apps/integrations/integration` path) have been reconciled to the exact routes. Direct URL navigation, page reloads, browser history (back/forward), and active state highlighting were verified across 4 distinct tenant/employee roles plus Super Admin.

---

## 2. Complete Navigation Hierarchy & Route Mapping

The primary sidebar organizes Organization Applications under the "Apps" parent section using Tabler/Feather icon primitives. Below is the verified menu hierarchy:

```
[Sidebar Root]
└── Applications ("Apps")
    ├── Chat (Icon: MessageSquare)
    │   ├── Chats ──────────────────────────> /apps/chat/chats
    │   ├── Chat Groups ────────────────────> /apps/chat/chat-groups
    │   └── Contact ────────────────────────> /apps/chat/chat-contact
    ├── Calendar (Icon: Calendar) ──────────> /apps/calendar
    ├── Email (Icon: Inbox) ────────────────> /apps/email
    ├── Scrumboard (Icon: Layout)
    │   ├── Projects Board ─────────────────> /apps/taskboard/projects-board
    │   ├── Kanban Board ───────────────────> /apps/taskboard/kanban-board
    │   └── Pipeline ───────────────────────> /apps/taskboard/pipeline
    ├── File Manager (Icon: Folder)
    │   ├── List View ──────────────────────> /apps/file-manager/list-view
    │   └── Grid View ──────────────────────> /apps/file-manager/grid-view
    ├── To-do & Gantt (Icon: CheckSquare)
    │   ├── Tasklist ───────────────────────> /apps/todo/task-list
    │   └── Gantt ──────────────────────────> /apps/todo/gantt
    └── Integrations (Icon: Grid)
        ├── All Apps ───────────────────────> /apps/integrations/all-apps
        ├── Active Integrations ────────────> /apps/integrations/integrations
        └── Integration Details ────────────> /apps/integrations/integrations-detail
```

---

## 3. Sidebar Synchronization Verification Matrix

| Application | Sidebar Label | Target Route | Menu Parent | Router Match | Direct URL Load | Active Highlight | Status |
|---|---|---|---|---|---|---|---|
| **Chat** | Chats | `/apps/chat/chats` | Chat | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Chat** | Chat Groups | `/apps/chat/chat-groups` | Chat | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Chat** | Contact | `/apps/chat/chat-contact` | Chat | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Calendar** | Calendar | `/apps/calendar` | Apps Root | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Email** | Email | `/apps/email` | Apps Root | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Scrumboard** | Projects Board | `/apps/taskboard/projects-board` | Scrumboard | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Scrumboard** | Kanban Board | `/apps/taskboard/kanban-board` | Scrumboard | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Scrumboard** | Pipeline | `/apps/taskboard/pipeline` | Scrumboard | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **File Manager**| List View | `/apps/file-manager/list-view` | File Manager | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **File Manager**| Grid View | `/apps/file-manager/grid-view` | File Manager | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **To-do** | Tasklist | `/apps/todo/task-list` | Todo | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **To-do** | Gantt | `/apps/todo/gantt` | Todo | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Integrations**| All Apps | `/apps/integrations/all-apps` | Integrations | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Integrations**| Integrations | `/apps/integrations/integrations` | Integrations | Yes | 200 OK | Yes (`.active`) | **PASS** |
| **Integrations**| App Details | `/apps/integrations/integrations-detail` | Integrations | Yes | 200 OK | Yes (`.active`) | **PASS** |

---

## 4. Role-Based Navigation & Server Authorization Matrix

Hiding a link in the UI is insufficient security. In MasterHRMS, every private API endpoint verifies `requireAuth` and scopes data by `tenantId`. Below is the audit across all five test personas:

| Route | Super Admin | Tenant Admin | HR Admin | Employee | Cross-Tenant User | Server Enforcement Method |
|---|---|---|---|---|---|---|
| `/apps/chat/*` | Full Access | Full Access | Full Access | Full Access | Isolated to Tenant B | Tenant-filtered in `/api/chat/messages` |
| `/apps/calendar` | Full Access | Full Access | Full Access | Full Access | Isolated to Tenant B | Tenant-filtered in `/api/calendar/events` |
| `/apps/email` | Full Access | Full Access | Full Access | Full Access | Isolated to Tenant B | Outbound SMTP tenant config scope |
| `/apps/taskboard/*` | Full Access | Full Access | Full Access | Full Access | Isolated to Tenant B | Tenant-scoped CmsPage + Projects |
| `/apps/file-manager/*` | Full Access | Full Access | Full Access | Read/Own | Isolated to Tenant B | Token-protected static downloads & DB |
| `/apps/todo/*` | Full Access | Full Access | Full Access | Full Access | Isolated to Tenant B | Tenant-filtered in `/api/todos` |
| `/apps/integrations/*` | Catalog & Global | Workspace Admin | Workspace Admin | View Allowed | Isolated to Tenant B | 403 on unentitled feature APIs |

---

## 5. Direct Deep Linking & Browser History

- **Direct URL Loads:** Navigating directly to any route (e.g., `http://localhost:5173/apps/todo/gantt`) bypasses the home dashboard and renders the target page cleanly with its corresponding sidebar parent automatically expanded.
- **Deep Query Parameters:** Sub-routes accepting parameters (e.g., `/apps/integrations/integrations-detail?slug=outbound-webhooks`) resolve query parameters correctly and load the dedicated profile page.
- **Browser Back/Forward:** Client-side React Router navigation maintains history without triggering full page reloads or losing authentication state.

---

## 6. Audit Verdict

**VERDICT: PASS**  
All 15 routes are correctly linked, visually active, synchronized between router and sidebar, and backed by authenticated multi-tenant backend controls.
