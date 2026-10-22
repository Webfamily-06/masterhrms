# MASTERHRMS — Organization-Wide Application Integration Route Audit

**Audit Timestamp:** 2026-10-22  
**Target Repository Scope:** `c:\Users\TSV Global Solutions\Documents\hrms\classic` & MASTERHRMS Server/Database Integration  
**Audit Purpose:** Comprehensive inventory and integration audit of shared organization applications (Chat, Calendar, Email, Taskboard, File Manager, To-do, Gantt, and Integrations/Add-on catalog) across roles (Super Admin, Tenant Admin, HR, Employee).

---

## 1. Executive Summary & Inventory Overview

A forensic inspection of `classic` (`react-jampack-classic`) and the core backend (`server/src/routes`, Prisma schema, and role-based authentication) was conducted. 

Key architectural baseline:
1. **Frontend Architecture:** The 15 requested routes are formally registered in TanStack Router in `classic/src/routes/_app.apps.*.jsx`, rendered with the classic Jampack responsive layout (`classic/src/layout/MainLayout/ClassicLayout.jsx`), and styled using Bootstrap 5 + SCSS (`classic/src/styles/scss/style.scss`).
2. **Current Implementation Gap:** The views in `classic/src/views/` were originally scaffolded as static/demo templates that bind to in-memory datasets (`contact-list.jsx`, `Events.jsx`, `KanbanDatas.js`, `Data.js`, `TableData.jsx`, static cards in `All Apps/Body.jsx`) and local Redux actions (`classic/src/redux/action/`), without communicating with the running MASTERHRMS Express backend on port 4000.
3. **Backend & Database Readiness:** The Express backend (`http://localhost:4000/api`) and Prisma database schema already possess full tenant-scoped models and APIs for:
   - Chat (`prisma.chatMessage`, `chat.routes.ts`)
   - Calendar (`prisma.calendarEvent`, `calendar.routes.ts`)
   - Taskboard / Projects / Pipelines (`prisma.project`, `prisma.projectTask`, `projects.routes.ts`)
   - File Manager (`prisma.mediaFile`, `media.routes.ts`, `media.service.ts`)
   - To-do & Gantt (`prisma.workspaceTodo`, `todos.routes.ts`, `prisma.projectTask`)
   - Add-on Catalog & Integrations (`prisma.addon`, `prisma.tenantAddon`, `cms.routes.ts`, `addons.routes.ts`, `integration.routes.ts`)
4. **Integration Imperative:** Replace in-memory mock fixtures with authenticated, tenant-isolated API client calls respecting the authenticated user's `hrms_auth_token`, role permissions, and tenant scoping.

---

## 2. Route Inventory & Integration Audit Matrix

| # | Route | Route Exists? | Page Loads? | Implementing View Component | Backend API & DB Model | UI Controls State | Data Persisted? | Allowed Roles | Tenant Isolation Status | Gaps & Defects |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | `/apps/chat/chats` | YES (`_app.apps.chat.chats.jsx`) | YES | `classic/src/views/Chat/Chats/index.jsx` | `server/src/routes/chat.routes.ts` (`prisma.chatMessage`) | In-memory Redux messaging only | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId`; Frontend does not pass auth token | Uses static `contact-list.jsx`; messages not synced to `/api/chat/messages`; no user thread selection |
| **2** | `/apps/chat/chat-groups` | YES (`_app.apps.chat.chat-groups.jsx`) | YES | `classic/src/views/Chat/Groups/index.jsx` | `server/src/routes/chat.routes.ts` (`prisma.chatMessage`) | Static group list | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId`; Frontend disconnected | Hardcoded group list; group creation does not call backend; membership not validated |
| **3** | `/apps/chat/chat-contact` | YES (`_app.apps.chat.chat-contact.jsx`) | YES | `classic/src/views/Chat/Contact/index.jsx` | `server/src/routes/employees.routes.ts` (`prisma.employee`, `prisma.user`) | Static contact list | NO (read-only mock) | Tenant Admin, HR, Employee | Not enforced in UI (hardcoded mock users) | Cross-tenant employee enumeration risk if unauthenticated; must fetch tenant directory from `/api/employees` |
| **4** | `/apps/calendar` | YES (`_app.apps.calendar.jsx`) | YES | `classic/src/views/Calendar/index.jsx` | `server/src/routes/calendar.routes.ts` (`prisma.calendarEvent`) | FullCalendar controls render, local modal works | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId` & `userId`; Frontend uses mock `Events.jsx` | Create/edit/delete events do not persist to `/api/calendar/events`; category filter is purely local |
| **5** | `/apps/email` | YES (`_app.apps.email.jsx`) | YES | `classic/src/views/Email/index.jsx` | `server/src/services/factories/mailer.factory.ts`, `server/src/lib/email.ts` | Compose modal, inbox folder switching | NO (mock data) | Tenant Admin, HR | External SMTP or internal messaging not bound | UI relies on template mock emails; send action does not submit to server; SMTP connection status not verified |
| **6** | `/apps/taskboard/projects-board` | YES (`_app.apps.taskboard.projects-board.jsx`) | YES | `classic/src/views/Scrumboard/ProjectsBoard/index.jsx` | `server/src/routes/projects.routes.ts` (`prisma.project`) | Add board modal, board card clicks | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId`; Frontend not connected | Hardcoded project cards; new board action does not call `POST /api/projects` |
| **7** | `/apps/taskboard/kanban-board` | YES (`_app.apps.taskboard.kanban-board.jsx`) | YES | `classic/src/views/Scrumboard/KanbanBoard/Index.jsx` | `server/src/routes/projects.routes.ts` (`prisma.projectTask`) | Drag-and-drop works locally via `@hello-pangea/dnd` | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId`; Frontend uses `KanbanDatas.js` | Column movements not saved via `PUT /api/projects/tasks/:id`; tasks not loaded from real database |
| **8** | `/apps/taskboard/pipeline` | YES (`_app.apps.taskboard.pipeline.jsx`) | YES | `classic/src/views/Scrumboard/Pipeline/index.jsx` | `server/src/routes/projects.routes.ts` (`prisma.projectTask` / pipeline) | Drag-and-drop works in local state | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId`; Frontend uses `Data.js` | Pipeline stages not bound to tenant pipeline configuration; stage transitions not persisted |
| **9** | `/apps/file-manager/list-view` | YES (`_app.apps.file-manager.list-view.jsx`) | YES | `classic/src/views/FileManager/ListView/index.jsx` | `server/src/routes/media.routes.ts` (`prisma.mediaFile`) | Table sorting, row actions render | NO (hardcoded `TableData.jsx`) | Tenant Admin, HR, Employee | Backend has strict tenant check; Frontend uses mock | Upload does not post to `/api/v1/media/upload`; delete does not call `DELETE /api/v1/media/:id` |
| **10** | `/apps/file-manager/grid-view` | YES (`_app.apps.file-manager.grid-view.jsx`) | YES | `classic/src/views/FileManager/GridView/index.jsx` | `server/src/routes/media.routes.ts` (`prisma.mediaFile`) | Grid card preview, search input | NO (hardcoded files) | Tenant Admin, HR, Employee | Backend has strict tenant check; Frontend uses mock | Shares state only with mock data; views do not sync to same live tenant media items |
| **11** | `/apps/todo/task-list` | YES (`_app.apps.todo.task-list.jsx`) | YES | `classic/src/views/Todo/Tasklist/index.jsx` | `server/src/routes/todos.routes.ts` (`prisma.workspaceTodo`) | Task creation modal, complete checkboxes | NO (lost on refresh) | Tenant Admin, HR, Employee | Backend enforces `tenantId` & `userId`; Frontend uses `TaskListData.js` | Task creation, status toggle, delete do not hit `/api/todos` |
| **12** | `/apps/todo/gantt` | YES (`_app.apps.todo.gantt.jsx`) | YES | `classic/src/views/Todo/Gantt/index.jsx` | `server/src/routes/projects.routes.ts` (`prisma.projectTask`) | `frappe-gantt` renders timeline | NO (mock `GanttData.jsx`) | Tenant Admin, HR, Employee | Backend enforces `tenantId`; Frontend uses mock | Tasks in Gantt do not align with Task List or real database project tasks; drag date updates not saved |
| **13** | `/apps/integrations/all-apps` | YES (`_app.apps.integrations.all-apps.jsx`) | YES | `classic/src/views/Integrations/All Apps/index.jsx` | `server/src/routes/cms.routes.ts` (`GET /api/cms/addons`, `prisma.addon`) | Connect buttons, category tabs render | NO (hardcoded template cards) | Super Admin, Tenant Admin | Catalog is global active addons; entitlement is tenant-scoped | Hardcoded cards ("Intercom", etc.); does not load dynamic catalog from `/api/cms/addons`; purchase status missing |
| **14** | `/apps/integrations/integrations` | YES (aliases `_app.apps.integrations.integration.jsx`) | YES | `classic/src/views/Integrations/Integration/index.jsx` | `server/src/routes/addons.routes.ts` (`GET /api/addons/entitlements`, `prisma.tenantAddon`), `integration.routes.ts` | Connect toggle, settings button | NO (hardcoded list) | Super Admin, Tenant Admin | Server enforces `tenantId` & active subscription | Does not distinguish between available, purchased, configured, and connected states; mock integrations |
| **15** | `/apps/integrations/integrations-detail` | YES (`_app.apps.integrations.integrations-detail.jsx`) | YES | `classic/src/views/Integrations/App Details/index.jsx` | `server/src/routes/cms.routes.ts` (`GET /api/cms/addons/:slug`), `addons.routes.ts` | Review modal, connect/install button | NO (hardcoded Intercom page) | Super Admin, Tenant Admin | Server checks entitlement before granting config | Static content; does not load selected add-on by slug/ID parameter; no dynamic entitlement checks |

---

## 3. Deep-Dive Findings by Application Domain

### A. Chat, Calendar, and Email
1. **Personal Chat (`/apps/chat/chats`):**
   - Implemented by `classic/src/views/Chat/Chats/index.jsx`.
   - Currently imports `contacts` from `./contact-list.jsx` with static users (e.g. Morgan Freeman).
   - Messaging dispatches to `redux/action/Chat.js` (`sentMsg`) which merely pushes strings into local Redux state (`state.msg.push(...)`).
   - The server has a full `chat.routes.ts` with WebSocket broadcasting (`broadcastToTenant`), file extension policy filtering, and database persistence in `chat_messages` table.
   - **Remediation:** Wire `ContactList` to load authorized tenant users via `/api/employees`, initialize/join the conversation thread, fetch history via `GET /api/chat/messages/:threadId`, and send messages via `POST /api/chat/messages`.

2. **Chat Groups (`/apps/chat/chat-groups`):**
   - Implemented by `classic/src/views/Chat/Groups/index.jsx`.
   - Uses hardcoded group mock list.
   - **Remediation:** Scope group channels to the authenticated tenant (e.g., `tenant-general`, `tenant-hr`, `tenant-projects`), enforce server-side membership, and persist messages to `chat_messages` with group thread IDs.

3. **Chat Contacts (`/apps/chat/chat-contact`):**
   - Implemented by `classic/src/views/Chat/Contact/index.jsx`.
   - Currently exposes static dummy contact cards.
   - **Remediation:** Query `/api/employees` to show only coworkers belonging to the authenticated tenant. Clicking a contact switches the active chat thread directly to a direct message channel (`dm_${userId1}_${userId2}`) with that employee.

4. **Calendar (`/apps/calendar`):**
   - Implemented by `classic/src/views/Calendar/index.jsx`.
   - Uses `@fullcalendar/react` with `dayGrid`, `timeGrid`, `list`, and `interaction` plugins.
   - All events are loaded from `Events.jsx`. Clicking "Create New Event" adds an event to FullCalendar's local ref without persisting.
   - The server has `calendar.routes.ts` with full CRUD (`/api/calendar/events`) and Google Calendar sync endpoints, scoped to `tenantId` and `userId`.
   - **Remediation:** Replace `Events.jsx` with an API query to `/api/calendar/events`. Wire `CreateNewEvent` to submit `POST /api/calendar/events`, and deletion/updates to `PUT` / `DELETE /api/calendar/events/:id`.

5. **Email (`/apps/email`):**
   - Implemented by `classic/src/views/Email/index.jsx`.
   - Currently shows mock inbox with static emails and attachments.
   - The backend contains a robust Mailer factory (`server/src/services/factories/mailer.factory.ts`) and email sender (`server/src/lib/email.ts`) that reads tenant SMTP settings.
   - **Remediation:** Connect the inbox list to persisted messages or system notifications; when composing an email, send through `/api/app-config` or SMTP endpoints, and report `BLOCKED` with clear UI messaging if the tenant SMTP gateway is unconfigured.

---

### B. Taskboard (`/apps/taskboard/*`)
1. **Projects Board (`/apps/taskboard/projects-board`):**
   - Implemented by `classic/src/views/Scrumboard/ProjectsBoard/index.jsx`.
   - Contains cards for boards with hardcoded avatars and progress bars.
   - The server has `GET /api/projects` in `projects.routes.ts` returning real database records from `prisma.project`.
   - **Remediation:** Fetch projects from `GET /api/projects`. Wire the "Add Board" modal to `POST /api/projects`.

2. **Kanban Board (`/apps/taskboard/kanban-board`):**
   - Implemented by `classic/src/views/Scrumboard/KanbanBoard/Index.jsx`.
   - Uses `@hello-pangea/dnd` with columns defined in `KanbanDatas.js` ("To Do", "In Progress", "Review", "Done").
   - Dragging a task updates React state only; reloading reverts all task positions.
   - The server supports `ProjectTask` updates via `PUT /api/projects/tasks/:id` with `status` updates.
   - **Remediation:** Bind the Kanban board to live tasks from `GET /api/projects`. On drag end (`onDragEnd`), send a `PUT /api/projects/tasks/:taskId` request with the new column status to guarantee persistence.

3. **Pipeline (`/apps/taskboard/pipeline`):**
   - Implemented by `classic/src/views/Scrumboard/Pipeline/index.jsx`.
   - Uses `Data.js` with lead/deal stages.
   - **Remediation:** Bind to live project pipeline/deals API from `server/src/routes/projects.routes.ts` or `crm.routes.ts`, persisting stage movements to the server.

---

### C. File Manager (`/apps/file-manager/*`)
1. **List View (`/apps/file-manager/list-view`) & Grid View (`/apps/file-manager/grid-view`):**
   - Implemented by `classic/src/views/FileManager/ListView/index.jsx` and `classic/src/views/FileManager/GridView/index.jsx`.
   - Currently show hardcoded lists of documents and images with fake file sizes.
   - The backend has `server/src/routes/media.routes.ts` backed by `prisma.mediaFile` and `MediaService`. It supports:
     - Multipart upload (`POST /api/v1/media/upload`) with strict tenant isolation and mime-type verification.
     - Tenant-scoped listing (`GET /api/v1/media`).
     - Safe deletion (`DELETE /api/v1/media/:id`) with usage tracking.
   - **Remediation:** Wire both List View and Grid View to fetch from `GET /api/v1/media`. Both views will reflect the exact same persisted tenant files. Implement file upload via `POST /api/v1/media/upload` and file deletion via `DELETE /api/v1/media/:id`.

---

### D. To-do & Gantt (`/apps/todo/*`)
1. **Task List (`/apps/todo/task-list`):**
   - Implemented by `classic/src/views/Todo/Tasklist/index.jsx`.
   - Currently binds to `TaskListData.js`.
   - The backend provides `server/src/routes/todos.routes.ts` with `GET /api/todos`, `POST /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id` on model `WorkspaceTodo`.
   - **Remediation:** Query `GET /api/todos`. Connect task completion toggle to `PUT /api/todos/:id { completed: true/false }`, creation to `POST /api/todos`, and deletion to `DELETE /api/todos/:id`.

2. **Gantt (`/apps/todo/gantt`):**
   - Implemented by `classic/src/views/Todo/Gantt/index.jsx`.
   - Uses `frappe-gantt` with hardcoded tasks in `GanttData.jsx`.
   - **Remediation:** Map live tasks from `GET /api/projects` (which contain `startDate`, `dueDate`, `progress`, and `title`) into Frappe Gantt's input format. Ensure consistent scoping between Taskboard and Gantt.

---

### E. Integrations & Add-on Catalog (`/apps/integrations/*`)
1. **All Apps (`/apps/integrations/all-apps`):**
   - Implemented by `classic/src/views/Integrations/All Apps/index.jsx`.
   - Currently displays static template cards ("Intercom", "Jampack template", etc.).
   - The authoritative Super Admin add-on catalog is exposed at `GET /api/cms/addons` with categories at `GET /api/cms/addons/categories`.
   - Tenant purchase and entitlement records are in `TenantAddon` and queried via `GET /api/addons/entitlements`.
   - **Remediation:** Dynamically fetch all active add-ons from `GET /api/cms/addons`. Cross-reference with `GET /api/addons/entitlements` to display real status badges (Installed, Available, Free, Price/month) and provide "View Details" and "Install/Connect" actions.

2. **Integrations Listing (`/apps/integrations/integrations`):**
   - Implemented by `classic/src/views/Integrations/Integration/index.jsx`.
   - Displays tenant integration statuses.
   - Server provides `GET /api/integrations/status` (via `IntegrationHubService`) and `GET /api/addons/entitlements`.
   - **Remediation:** Render tenant connectors (Google Workspace, WooCommerce, Shopify, Razorpay, Biometric Sync, etc.) with real connection states: Unpurchased, Entitled/Purchased, Configured, Connected, or Disconnected.

3. **Integrations Detail (`/apps/integrations/integrations-detail`):**
   - Implemented by `classic/src/views/Integrations/App Details/index.jsx`.
   - Shows static hardcoded detail page for "Intercom".
   - **Remediation:** Accept search query parameter `?slug=...` or route param. Fetch authoritative details from `GET /api/cms/addons/:slug` and tenant entitlement from `GET /api/addons/entitlements`. Show accurate configuration fields, installation actions, and upgrade options for that tenant only.

---

## 4. Authentication, Tenant Isolation & RBAC Architecture

1. **Authentication Token Persistence:**
   - In MASTERHRMS, authenticated sessions store the JWT in `localStorage.getItem("hrms_auth_token")`.
   - `classic` must initialize an Axios or Fetch API client that injects `Authorization: Bearer <token>` on all requests.
   - If no valid token exists, redirect unauthenticated users to `/auth/login` or the tenant login screen.

2. **Tenant Scoping:**
   - All backend APIs (`chat.routes.ts`, `calendar.routes.ts`, `todos.routes.ts`, `projects.routes.ts`, `media.routes.ts`, `addons.routes.ts`, `integration.routes.ts`) resolve `tenantId` from the verified JWT (`req.user.tenantId`) or session cookie.
   - Tenant isolation is strictly enforced server-side: no tenant can read or mutate another tenant's records, even if guessing IDs.

3. **Role-Based Access Control (RBAC):**
   - **Super Admin (`super_admin`):** Full visibility over all add-on definitions, platform configurations, and tenant subscriptions.
   - **Tenant Admin (`tenant_admin`, `admin`):** Full CRUD for organization calendar, taskboard, media library, and integration settings within their own tenant scope.
   - **HR User (`hr`, `hr_admin`):** Access to shared chats, company calendar, employee directory, assigned projects, and files.
   - **Employee (`employee`):** Access to personal chat, permitted group chats, personal and organization calendar events, assigned project tasks, personal to-dos, and tenant media files.

---

## 5. Phase 1 Audit Conclusion & Action Plan

All 15 target routes are accounted for, present in the router, and render their visual UI layouts properly. However, they currently operate in isolation with mock datasets.

The phased implementation plan will systematically connect each application to the running MASTERHRMS backend, enforce role and tenant context, persist state to PostgreSQL/Prisma, verify every interactive control, and validate the complete matrix via Playwright MCP.
