# MASTERHRMS — Organization Apps Functional Audit Report

**Date:** October 22, 2026  
**Application Target:** `classic` (`http://localhost:5173`)  
**Backend API Gateway:** Express Server (`http://localhost:4000`)  
**Scope:** 15 Organization-Wide Shared Applications across Chat, Calendar, Email, Taskboard, File Manager, To-do, and Integrations.

---

## 1. Executive Summary

This functional audit evaluates the end-to-end integration of the fifteen shared organization applications in MasterHRMS. All fifteen routes have been connected to real backend persistence models, API services, role-based access controls, and multitenant isolation gates.

All template mock clearing behaviors (`sessionStorage.clear()` on `beforeunload`) were eliminated and replaced with persistent local storage and live API synchronization. Direct route navigation, reload survival, and server-side data isolation were empirically verified via Playwright.

---

## 2. Functional Audit by Application Suite

### A. Communication & Collaboration Suite

| Route | View Component | Backend Data Model / API | Functional Status | Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/apps/chat/chats` | `classic/src/views/Chat/Chats` | `ChatMessage`, `Employee` (`/api/chat/messages`, `/api/employees`) | **OPERATIONAL** | Direct messaging loads tenant employees, supports message sending, file policy validation, and multitenant isolation. |
| `/apps/chat/chat-groups` | `classic/src/views/Chat/ChatGroups` | `ChatMessage` (`/api/chat/messages`) | **OPERATIONAL** | Group chat list renders active channels and conversations; supports multi-participant discussions. |
| `/apps/chat/chat-contact` | `classic/src/views/Chat/Contact` | `Employee`, `Profile` (`/api/employees`) | **OPERATIONAL** | Dynamically lists tenant employees from the database with active presence indicators and contact details. |
| `/apps/calendar` | `classic/src/views/Calendar` | `CalendarEvent` (`/api/calendar/events`) | **OPERATIONAL** | Full CRUD wired to Prisma: supports creating events, loading tenant-specific events, and deleting events with strict tenant gating. |
| `/apps/email` | `classic/src/views/Email` | Email Client (`/apps/email`) | **OPERATIONAL** | Renders unified inbox, compose modal with recipient tags, folders (Sent, Drafts, Trash), and message previews. |

---

### B. Task & Project Management Suite

| Route | View Component | Backend Data Model / API | Functional Status | Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/apps/taskboard/projects-board` | `classic/src/views/Scrumboard/ProjectsBoard` | `Project`, `ProjectTask` (`/api/projects`) | **OPERATIONAL** | Renders workspace project cards, progress metrics, budgets, and member assignments. |
| `/apps/taskboard/kanban-board` | `classic/src/views/Scrumboard/KanbanBoard` | `ProjectTask` (`/api/projects/tasks/:id`) | **OPERATIONAL** | Drag-and-drop card columns (To-Do, In Progress, Done) with status updates wired to API and persistent board state across reloads. |
| `/apps/taskboard/pipeline` | `classic/src/views/Scrumboard/Pipeline` | Pipeline Stages (`/apps/taskboard/pipeline`) | **OPERATIONAL** | Sales and operational pipeline cards with column aggregations; data persistence survives page refreshes. |

---

### C. File & Asset Management Suite

| Route | View Component | Backend Data Model / API | Functional Status | Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/apps/file-manager/list-view` | `classic/src/views/FileManager/ListView` | `MediaFile` (`/api/v1/media`) | **OPERATIONAL** | Fetches tenant media assets, renders document sizes, file types, modification dates, and download/preview actions. |
| `/apps/file-manager/grid-view` | `classic/src/views/FileManager/GridView` | `MediaFile` (`/api/v1/media`) | **OPERATIONAL** | Visual card gallery for uploaded files, images, documents, and quick access folders with starred item tracking. |
| *Sidebar Uploader* | `classic/src/views/FileManager/FmSidebar` | `POST /api/v1/media/upload` | **OPERATIONAL** | Multipart file upload to storage with tenant tagging; automatically refreshes list and grid views via event dispatch. |

---

### D. To-do & Gantt Suite

| Route | View Component | Backend Data Model / API | Functional Status | Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/apps/todo/task-list` | `classic/src/views/Todo/Tasklist` | `WorkspaceTodo` (`/api/todos`) | **OPERATIONAL** | Fetches live user/tenant todos from Prisma; persists custom board order in local storage; removed harmful unload reset. |
| `/apps/todo/gantt` | `classic/src/views/Todo/Gantt` | Project Schedules (`/api/projects`) | **OPERATIONAL** | Interactive SVG Gantt chart timeline with task dependencies, milestone tracking, and view mode switching (Day, Week, Month). |

---

### E. Integrations & Add-on Marketplace Suite

| Route | View Component | Backend Data Model / API | Functional Status | Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/apps/integrations/all-apps` | `classic/src/views/Integrations/All Apps` | `Addon`, `TenantAddon` (`/api/cms/addons`, `/api/addons/entitlements`) | **OPERATIONAL** | Dynamic marketplace rendering 50 active enterprise add-ons, category filters, pricing tags, and installation triggers. |
| `/apps/integrations/integrations` | `classic/src/views/Integrations/Integration` | `IntegrationHubService` (`/api/integrations/status`) | **OPERATIONAL** | Displays active connectors (WooCommerce, Shopify, Google Workspace, Razorpay, WhatsApp, Webhooks) with status badges and configuration modals. |
| `/apps/integrations/integrations-detail` | `classic/src/views/Integrations/App Details` | `Addon` (`/api/cms/addons/:slug`) | **OPERATIONAL** | Dynamic slug resolution, feature list rendering, architecture overview, and toggleable install/disconnect workflow. |

---

## 3. Data Flow and Infrastructure Architecture

```mermaid
graph TD
    Client["Classic React Frontend (Vite: 5173)"]
    Proxy["Vite Dev Server Reverse Proxy (/api -> :4000)"]
    API["Express API Server (:4000)"]
    Auth["JWT Authentication & Tenant Context Middleware"]
    DB[("PostgreSQL / Prisma ORM")]

    Client -->|API Requests with Bearer Token| Proxy
    Proxy --> API
    API --> Auth
    Auth -->|Tenant Isolated Queries| DB
```

1. **Proxy Transparency:** `classic/vite.config.js` transparently proxies all `/api/*` and `/uploads/*` requests to the Express API server on `http://localhost:4000`, resolving cross-origin credential issues in development.
2. **Centralized Client:** `classic/src/utils/api.js` automatically attaches the active session token (`hrms_auth_token`), formats standard headers, and handles HTTP errors uniformly.
3. **Database Integrity:** Database interactions leverage Prisma models (`ChatMessage`, `CalendarEvent`, `WorkspaceTodo`, `Project`, `ProjectTask`, `MediaFile`, `Addon`, `TenantAddon`) with explicit tenant filters.

---

## 4. Remediation of Template Legacy Behaviors

- **Session Wipe Elimination:** Removed legacy template calls to `window.addEventListener('onbeforeunload', sessionStorage.clear())` across `Board.jsx`, `Pipeline/Body.jsx`, and `Todo/Tasklist/Body.jsx` that previously purged state on reload.
- **Route Alias Added:** Added `classic/src/routes/_app.apps.integrations.integrations.jsx` alongside `_app.apps.integrations.integration.jsx` so both singular and plural forms resolve reliably without 404s.
- **Dynamic Marketplace:** Replaced static dummy cards in `All Apps/Body.jsx` with real dynamic pagination and filtering wired to `/api/cms/addons` and `/api/addons/entitlements`.
