# MASTERHRMS — Independent Original UI vs Current Workspace Migration Audit
## MCP Browser Verification, Sidebar Coverage, API-to-Database Validation & Evidence-Based Report

**Audit Date:** October 22, 2026  
**Auditor:** Independent Autonomous System Inspector  
**Runtimes Evaluated:**
- **Current Workspace Frontend:** `http://localhost:5173` (TanStack Start + React 19 + Tailwind CSS v4 + Radix UI)
- **Original Reference UI:** `http://localhost:5174` (React Jampack Classic — Bootstrap 5.3 + React-Bootstrap + SCSS)
- **Backend API Server:** `http://localhost:4000` (Node.js Express + Prisma ORM + Supabase PostgreSQL)
- **Public CMS / Super Admin Studio:** `http://localhost:3000` (Next.js 16 Turbopack)

**Primary Test Evidence Repository:** `docs/Saas/screenshots/migration-audit/`  
**Raw Test Execution Data:** `scripts/migration_audit_results.json`

---

## A. Executive Summary

### 1. Overall Audit Verdict: **REJECTED (CRITICAL MIGRATION & UI SYNCHRONIZATION GAPS)**

This independent audit confirms that the user's suspicion is **100% accurate and factual**: **recent backend features, APIs, and original UI pages are NOT reflected in the current running workspace UI (`http://localhost:5173`).**

The forensic code and browser investigation revealed the architectural root cause:
1. **Architectural Schism (Two Parallel Frontends):** The workspace contains two distinct, un-unified frontend codebases:
   - **`classic/` (React Jampack Classic):** The original Bootstrap 5 / React-Bootstrap reference application added in commit `39fd8039`.
   - **`src/` (Master HRMS):** The actual workspace application running on `http://localhost:5173` using TanStack Start, React 19, Tailwind CSS v4, and Radix UI.
2. **Features Implemented in the Wrong Application:**
   - In commit `de6e0531` (`feat(email): per-user email accounts (SMTP, IMAP, POP3) with encryption & isolation`), the backend Express endpoints (`/api/user/email-accounts`) and database models (`UserEmailAccount`) were implemented and tested.
   - However, the frontend UI was built **exclusively inside `classic/src/views/Settings/EmailAccounts/index.jsx` (919 lines of React-Bootstrap) and `classic/src/views/Email/`**.
   - **Zero components, zero routes, and zero sidebar links were added to the active workspace (`src/`)**. When navigating to `/settings/email-accounts` or `/apps/email` on `http://localhost:5173`, the workspace returns **`404 NOT_FOUND`**.
3. **Missing Features in Primary Workspace:**
   - **User Email Accounts (SMTP/IMAP/POP3):** 100% missing from the workspace UI.
   - **Outbound/Inbound Mailbox Client:** 100% missing from the workspace UI.
   - **Interactive Gantt Timeline:** Present in `classic/src/views/Todo/Gantt/` (using `frappe-gantt`), but completely absent from `src/`.
4. **Divergent Implementations:**
   - Other domains (Chat, Calendar, Taskboard, File Manager, Integrations, Invoices) exist in the current workspace under `/hr/*` and `/me/*`, but they are **completely different implementations** (e.g. WhatsApp-style Chat instead of Jampack Chat) and do NOT use the original Jampack Classic components or layout.

### 2. High-Level Inventory & Statistics

| Metric | Measured Value | Notes |
| :--- | :--- | :--- |
| **Total Classic Routes Audited** | **17 Routes** | All 15 organization app routes + 2 email/settings routes |
| **Classic App Route Availability (`:5174`)** | **17 / 17 (100% Load)** | All loaded with HTTP 200 in `classic/` |
| **Direct Classic Routes in Workspace (`:5173`)** | **0 / 17 (0% Available)** | **All 17 direct routes returned 404 NOT_FOUND** |
| **Canonical Workspace Routes Available (`:5173`)** | **14 / 17 (82.3%)** | Mapped to separate Tailwind/Radix components |
| **Completely Missing From Workspace UI** | **3 / 17 (17.6%)** | Email Client, User Email Accounts, Gantt Chart |
| **Active Workspace Sidebar Links Discovered** | **173+ Routes** | 55 `/me/*` routes, 118+ `/hr/*` routes, 164 `_app` routes |
| **Backend API Endpoints Verified** | **36+ Endpoints** | Auth, Email Accounts, Chat, Calendar, Tasks, Media |
| **Database Models Verified** | **12 Models** | `UserEmailAccount`, `ChatMessage`, `CalendarEvent`, etc. |

---

## B. Dynamic Sidebar and Route Inventory

The sidebar was dynamically inspected across both applications rather than relying on predefined lists.

### 1. Current Workspace Sidebar Structure (`http://localhost:5173`)
The workspace layout is governed by `AppShell` (`src/routes/_authenticated/_app/route.tsx`) rendering `DreamsSidebar` (`src/components/dreams-sidebar.tsx`).

#### 1.1. HR Management Portal (`/hr/*`) — Derived from `src/nav/hr-sidebar.ts`
- **01. Overview:**
  - Dashboard: `/hr/dashboard`
  - Calendar: `/hr/calendar`
  - My Tasks: `/hr/todo`
  - Team Chat: `/hr/chat`
  - Approvals: `/hr/approvals`
  - Notifications: `/hr/notifications`
- **02. Workspace Management:**
  - Employees: `/hr/employees`
  - Organization: Departments (`/hr/organization/departments`), Designations, Branches, Holidays, Announcements, Org Tree, Award Types, Document Types
  - Attendance: Daily Attendance (`/hr/attendance`), Overtime, Shifts, Policies, Biometrics
  - Leave Management: Applications (`/hr/leave/applications`), Balance, Policies
- **03. Talent & Growth:**
  - Recruitment (ATS): Job Postings, Candidates, Interviews, Offers, Onboarding
  - Employee Lifecycle: Promotions, Transfers, Warnings, Complaints, Resignations, Terminations
  - Performance: Goals, Reviews, Indicators
  - Training: Programs, Sessions, Employee Trainings
- **04. Finance & Assets:**
  - Payroll: Runs, Structure, Payslips, Tax Declarations
  - Assets: Registry, Requests, Categories
- **05. Communications & Content:**
  - Meetings: Rooms, Schedules
  - Company Documents: Vault, Templates
  - Media Library: `/hr/media`
- **06. Reports & Analytics:**
  - Headcount, Attrition, Attendance, Payroll, Performance, Statutory
- **07. Add-ons & Integrations:**
  - Marketplace (`/marketplace`), Integrations (`/integrations`), Biometric Sync, OKRs

#### 1.2. Employee Self-Service Portal (`/me/*`) — Derived from `src/nav/employee-sidebar.ts`
- **11 Canonical Sections (55 Routes):**
  - Overview: `/me/dashboard`, `/me/calendar`, `/me/todo`, `/me/chat`, `/me/notifications`, `/me/profile`, `/me/employees`
  - Attendance: `/me/attendance/records`, `/me/attendance/requests`, `/me/attendance/shifts`, `/me/attendance/timesheet`
  - Leave: `/me/leave/applications`, `/me/leave/balance`, `/me/leave/team-calendar`
  - Payroll: `/me/payroll/payslips`, `/me/payroll/salary`, `/me/payroll/reimbursements-loans`, `/me/payroll/tax`
  - Documents: `/me/documents/contracts`, `/me/documents/acknowledgements`

#### 1.3. Super Admin Shell (`/super/*`) — Derived from `CMS/src/components/layout/SuperShell.tsx`
- **Core Orchestration:** Dashboard (`/super`), Tenants (`/super/tenants`), Usage (`/super/tenant-usage-metrics`), Plans (`/super/plans`), Coupons, Transactions, Roles, Compliance
- **Extensions & Addons:** Marketplace (`/super/marketplace`), Domains (`/super/domains`)
- **Marketing & CMS:** CMS Studio (`/super/cms`), Blog Insights (`/super/blogs`), Email Templates (`/super/email-templates`)

### 2. Original Reference Sidebar Structure (`classic/src/layout/Sidebar/SidebarMenu.jsx`)
- **Apps Group:**
  - Chat: `/apps/chat/chats`, `/apps/chat/chat-groups`, `/apps/chat/chat-contact`
  - Chat Popup: `/apps/chat-bot/chatpopup`, `/apps/chat-bot/chatbot`
  - Calendar: `/apps/calendar`
  - Email: `/apps/email`
  - Scrumboard: `/apps/taskboard/projects-board`, `/apps/taskboard/kanban-board`, `/apps/taskboard/pipeline`
  - Contact: `/apps/contacts/contact-cards`, `/apps/contacts/contact-list`
  - File Manager: `/apps/file-manager/list-view`, `/apps/file-manager/grid-view`
  - Todo: `/apps/todo/task-list`, `/apps/todo/gantt`
  - Integrations: `/apps/integrations/all-apps`, `/apps/integrations/integrations`, `/apps/integrations/integrations-detail`
  - Invoices: `/apps/invoices/invoice-list`, `/apps/invoices/invoice-templates`, `/apps/invoices/create-invoice`
- **Pages & Settings:**
  - Settings: `/settings/email-accounts` (User personal email configuration)

---

## C. Original UI vs Workspace UI Comparison Matrix

| Domain & Feature | Original Route (`:5174`) | Direct Route in Workspace (`:5173`) | Canonical Workspace Route | Parity Verdict | Evidence & Defect Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Email Accounts (SMTP/IMAP/POP3)** | `/settings/email-accounts` (HTTP 200) | `/settings/email-accounts` (**404**) | `/hr/settings?tab=email` (No tab) | **MISSING IN WORKSPACE** | Built in `classic/src/views/Settings/EmailAccounts/index.jsx` using React-Bootstrap. Completely absent from `src/routes/` and `src/components/settings/`. |
| **Outbound/Inbound Mailbox** | `/apps/email` (HTTP 200) | `/apps/email` (**404**) | *None* (**404**) | **MISSING IN WORKSPACE** | Mailbox UI with folder tree, reading pane, and compose drawer exists in `classic/src/views/Email/`. Zero mailbox routes exist in `src/routes/`. |
| **Interactive Gantt Timeline** | `/apps/todo/gantt` (HTTP 200) | `/apps/todo/gantt` (**404**) | *None* (**404**) | **MISSING IN WORKSPACE** | `frappe-gantt` view exists only in `classic/src/views/Todo/Gantt/`. Root workspace `todo.tsx` only has a task checklist table. |
| **Personal & Direct Chat** | `/apps/chat/chats` (HTTP 200) | `/apps/chat/chats` (**404**) | `/hr/chat` (HTTP 200) | **DIVERGENT IMPLEMENTATION** | Jampack Chat not ported. Workspace uses WhatsApp-style `TeamWhatsAppChatAddon` (3,502 lines). |
| **Chat Channels & Groups** | `/apps/chat/chat-groups` (HTTP 200) | `/apps/chat/chat-groups` (**404**) | `/hr/chat` (HTTP 200) | **DIVERGENT IMPLEMENTATION** | Channels are handled inside `TeamWhatsAppChatAddon` tabs rather than separate Jampack group routes. |
| **Chat Contact Directory** | `/apps/chat/chat-contact` (HTTP 200) | `/apps/chat/chat-contact` (**404**) | `/hr/employees` (HTTP 200) | **PARTIALLY MIGRATED** | Employee directory at `/hr/employees` provides list/grid view, but lacks the quick-chat drawer from Jampack. |
| **Calendar Application** | `/apps/calendar` (HTTP 200) | `/apps/calendar` (**404**) | `/hr/calendar` (HTTP 200) | **DIVERGENT IMPLEMENTATION** | `classic/` uses FullCalendar React with category sidebar. `src/` uses a custom Tailwind calendar (`calendar.tsx`, 694 lines). |
| **All Project Boards** | `/apps/taskboard/projects-board` (HTTP 200) | `/apps/taskboard/projects-board` (**404**) | `/projects` (HTTP 200) | **PARTIALLY MIGRATED** | Workspace `/projects` displays projects grid, but lacks Jampack Scrumboard header controls and board creation wizard. |
| **Project Kanban Board** | `/apps/taskboard/kanban-board` (HTTP 200) | `/apps/taskboard/kanban-board` (**404**) | `/task-board` (HTTP 200) | **DIVERGENT IMPLEMENTATION** | Workspace has independent Kanban at `/task-board` (1,092 lines). Layout and styling are Tailwind, not Jampack Bootstrap. |
| **Pipeline Kanban** | `/apps/taskboard/pipeline` (HTTP 200) | `/apps/taskboard/pipeline` (**404**) | `/pipeline` (HTTP 200) | **DIVERGENT IMPLEMENTATION** | `classic/` has horizontal drag-and-drop deal columns. `src/` has a tabular deal stage breakdown. |
| **File Manager Table View** | `/apps/file-manager/list-view` (HTTP 200) | `/apps/file-manager/list-view` (**404**) | `/hr/media` (HTTP 200) | **PARTIALLY MIGRATED** | Workspace `TenantMediaPage` supports grid/list toggle, uploading, and tag filtering, but lacks Jampack tree explorer. |
| **File Manager Grid View** | `/apps/file-manager/grid-view` (HTTP 200) | `/apps/file-manager/grid-view` (**404**) | `/hr/media` (HTTP 200) | **PARTIALLY MIGRATED** | Grid view supported in `TenantMediaPage`, but styled with Radix cards rather than Bootstrap cards. |
| **To-do Task List** | `/apps/todo/task-list` (HTTP 200) | `/apps/todo/task-list` (**404**) | `/hr/todo` (HTTP 200) | **PARTIALLY MIGRATED** | Workspace `/hr/todo` has full CRUD, priority filters, and search. Does not use Jampack's `TaskListData.js`. |
| **Add-on Catalog / Marketplace** | `/apps/integrations/all-apps` (HTTP 200) | `/apps/integrations/all-apps` (**404**) | `/marketplace` (HTTP 200) | **PARTIALLY MIGRATED** | Dynamic catalog rendered from `/api/cms/pages` in `marketplace.tsx` (80KB). Jampack static template not used. |
| **Connected Integrations** | `/apps/integrations/integrations` (HTTP 200) | `/apps/integrations/integrations` (**404**) | `/integrations` (HTTP 200) | **PARTIALLY MIGRATED** | Workspace has dedicated connection pages for WooCommerce, Shopify, Google Workspace, Tally, and Webhooks. |
| **Invoices Table & History** | `/apps/invoices/invoice-list` (HTTP 200) | `/apps/invoices/invoice-list` (**404**) | `/invoices` (HTTP 200) | **PARTIALLY MIGRATED** | Workspace `/invoices` is fully connected to backend `invoicesRouter` with PDF export. |
| **Create Invoice Builder** | `/apps/invoices/create-invoice` (HTTP 200) | `/apps/invoices/create-invoice` (**404**) | `/invoice/create` (HTTP 200) | **PARTIALLY MIGRATED** | Workspace `/invoice/create` connects to real clients and tax rules. |

---

## D. Frontend-to-Backend Traceability Matrix

| Feature / Domain | UI Component File | Registered Route | API Client Call | Backend Router & File | Database Model | Persistence Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Per-User Email Accounts** | `classic/src/views/Settings/EmailAccounts/index.jsx` | `classic/` only (`/settings/email-accounts`) | `api.get('/user/email-accounts')` | `userEmailAccountsRouter` (`user-email-accounts.routes.ts`) | `prisma.userEmailAccount` | **DISCONNECTED IN WORKSPACE** (API & DB exist; Workspace UI missing) |
| **Outbound Email Send** | `classic/src/views/Email/ComposeEmail.jsx` | `classic/` only (`/apps/email`) | `api.post('/user/email-accounts/:id/send')` | `emailRouter` (`email.routes.ts`) | Nodemailer SMTP Transport | **DISCONNECTED IN WORKSPACE** (API exists; Workspace UI missing) |
| **Team Chat** | `src/components/chat/team-whatsapp-chat-addon.tsx` | `/hr/chat`, `/me/chat` | `api.get('/chat/messages')`, Socket.io | `chatRouter` (`chat.routes.ts`) | `prisma.chatMessage` | **PERSISTED (PostgreSQL)** |
| **Calendar Events** | `src/routes/_authenticated/_app/calendar.tsx` | `/hr/calendar`, `/me/calendar` | `api.get('/calendar/events')`, `POST`, `DELETE` | `calendarRouter` (`calendar.routes.ts`) | `prisma.calendarEvent` | **PERSISTED (PostgreSQL)** |
| **Taskboard & Kanban** | `src/routes/_authenticated/_app/task-board.tsx` | `/task-board` | `api.get('/projects/tasks')`, `PATCH` | `projectsRouter` (`projects.routes.ts`) | `prisma.projectTask` | **PERSISTED (PostgreSQL)** |
| **Media / File Manager** | `src/components/media/tenant-media-page.tsx` | `/hr/media`, `/me/media` | `api.get('/v1/media')`, `/v1/media/upload` | `mediaRouter` (`media.routes.ts`) | `prisma.mediaFile` | **PERSISTED (PostgreSQL + Disk Storage)** |
| **Personal To-dos** | `src/routes/_authenticated/_app/todo.tsx` | `/hr/todo`, `/me/todo` | `api.get('/todos')`, `POST`, `PATCH` | `todosRouter` (`todos.routes.ts`) | `prisma.workspaceTodo` | **PERSISTED (PostgreSQL)** |
| **Interactive Gantt** | `classic/src/views/Todo/Gantt/index.jsx` | `classic/` only (`/apps/todo/gantt`) | Local State (`GanttData.jsx`) | *None* | `prisma.projectTask` | **IN-MEMORY ONLY (Not migrated)** |
| **Addon Marketplace** | `src/routes/_authenticated/_app/marketplace.tsx` | `/marketplace` | `api.get('/cms/pages')`, `/addons/entitlements` | `cmsRouter`, `addonsRouter` | `prisma.cmsPage`, `tenantAddon` | **PERSISTED (PostgreSQL)** |
| **Invoices** | `src/routes/_authenticated/_app/invoices.tsx` | `/invoices`, `/invoice/create` | `api.get('/invoices')`, `POST /invoices` | `invoicesRouter` (`invoices.routes.ts`) | `prisma.invoice` | **PERSISTED (PostgreSQL)** |

---

## E. Database Persistence & Scope Matrix

| Feature | Storage Layer Observed | Persistence Scope | Real Data vs Mock Data |
| :--- | :--- | :--- | :--- |
| **User Email Accounts** | Supabase PostgreSQL (`user_email_accounts`) | Per-User + Tenant-Scoped (`userId`, `tenantId`) | Real AES-256-GCM encrypted credentials in DB. |
| **Super Admin System Mail** | Server Environment / Config (`mail.masterhrms.com`) | System-Wide Global | Real transactional SMTP credentials. |
| **Chat Messages** | Supabase PostgreSQL (`chat_messages`) | Tenant-Scoped (`tenantId`) | Real messages persisted via Express API. |
| **Calendar Events** | Supabase PostgreSQL (`calendar_events`) | Tenant-Scoped + User Filter | Real events in database. |
| **Project Tasks** | Supabase PostgreSQL (`project_tasks`) | Tenant-Scoped (`tenantId`) | Real project task records in database. |
| **To-do Items** | Supabase PostgreSQL (`workspace_todos`) | User-Specific (`userId`, `tenantId`) | Real todos persisted in database. |
| **Gantt Chart** | In-Memory (`classic/src/views/Todo/Gantt/GanttData.jsx`) | Ephemeral / Lost on Refresh | **Hardcoded Mock Data** in `classic/`; absent in `src/`. |
| **Media Files** | Supabase PostgreSQL (`media_files`) + Uploads Folder | Tenant-Scoped (`tenantId`) | Real uploaded files with metadata. |
| **Installed Addons** | Supabase PostgreSQL (`cms_pages`, `tenant_addons`) | Tenant-Scoped (`tenantId`) | Real entitlements and dynamic CMS page configurations. |

---

## F. Defect Register

### Defect 1: User Email Accounts UI Completely Missing from Primary Workspace
- **Severity:** **CRITICAL (Blocker)**
- **Affected Route:** `http://localhost:5173/settings/email-accounts` (Returns 404)
- **Source Files:**
  - `classic/src/views/Settings/EmailAccounts/index.jsx` (Exists in `classic/` only)
  - `src/routes/_authenticated/hr/settings.tsx` (Lacks Email Accounts tab)
  - `src/components/settings/settings-nested-nav.tsx` (Lacks navigation entry)
- **Root Cause:** Commit `de6e0531` implemented the UI inside the Bootstrap 5 `classic/` folder instead of porting it to the Tailwind/Radix `src/` workspace.
- **Expected Behavior:** An authenticated user can navigate to Settings -> Email Accounts in the workspace, add their personal SMTP/IMAP/POP3 account, test the connection, and view configured accounts.
- **Actual Behavior:** 404 Not Found on direct URL; no link exists in sidebar or settings navigation.
- **Recommended Minimal Fix:** Port the Email Accounts UI into a Tailwind/Radix component (`src/components/settings/user-email-accounts-settings.tsx`) and register it as a tab in `src/routes/_authenticated/hr/settings.tsx` and in `/me/account`.

### Defect 2: Outbound & Inbound Email Mailbox App Missing from Workspace
- **Severity:** **HIGH**
- **Affected Route:** `http://localhost:5173/apps/email` (Returns 404)
- **Source Files:**
  - `classic/src/views/Email/*` (Exists in `classic/` only)
  - `src/routes/_authenticated/_app/email.tsx` (Does not exist)
- **Root Cause:** The Email app was developed and updated inside `classic/` without a corresponding route in `src/routes/_authenticated/_app/` or `src/routes/_authenticated/hr/`.
- **Expected Behavior:** Users with email entitlements can view their inbox, read emails, switch between configured personal accounts, and send emails via personal SMTP.
- **Actual Behavior:** Route returns 404; no email client exists in the main workspace.
- **Recommended Minimal Fix:** Create `src/routes/_authenticated/_app/email.tsx` porting the mailbox reading and composition logic to Radix UI / Tailwind, or register an iframe/microfrontend proxy to the classic view.

### Defect 3: Interactive Gantt Chart Timeline Missing from Workspace
- **Severity:** **HIGH**
- **Affected Route:** `http://localhost:5173/apps/todo/gantt` (Returns 404)
- **Source Files:**
  - `classic/src/views/Todo/Gantt/index.jsx` (Exists in `classic/` only)
  - `src/routes/_authenticated/_app/todo.tsx` (Only has task list)
- **Root Cause:** Gantt was implemented in `classic/` using `frappe-gantt`. The workspace `todo.tsx` was never updated to include the Gantt view mode.
- **Expected Behavior:** Users can switch between List View and Gantt Timeline View on the Tasks/To-do page.
- **Actual Behavior:** Route returns 404; workspace has list view only.
- **Recommended Minimal Fix:** Add a "Timeline / Gantt" tab to `src/routes/_authenticated/_app/todo.tsx` and integrate `frappe-gantt` or an SVG timeline linked to `prisma.projectTask`.

### Defect 4: Direct URL Incompatibility for Organization Apps
- **Severity:** **MEDIUM**
- **Affected Routes:** `/apps/chat/chats`, `/apps/calendar`, `/apps/taskboard/*`, `/apps/file-manager/*`, `/apps/todo/task-list`, `/apps/integrations/*`
- **Source Files:** `src/routeTree.gen.ts` (Missing `/apps/*` route prefixes)
- **Root Cause:** The workspace routes were reorganized into `/hr/*`, `/me/*`, and `/_app/*`, breaking direct compatibility with the canonical `/apps/*` URLs from the reference design.
- **Expected Behavior:** Direct URL entry of `/apps/*` routes should cleanly redirect to their canonical equivalents (`/hr/chat`, `/hr/calendar`, `/task-board`, `/hr/media`, etc.).
- **Actual Behavior:** 404 Not Found.
- **Recommended Minimal Fix:** Add lightweight redirect route files under `src/routes/_authenticated/_app/apps/` mapping incoming `/apps/*` URLs to their canonical portal locations.

---

## G. Empirical Test Evidence & Screenshots

All screenshots were generated during the audit using Playwright at matching viewport dimensions (1440x900) and saved to disk:

### 1. Side-by-Side Visual Comparison Evidence

| Feature Domain | Classic Reference Screenshot (`:5174`) | Current Workspace Screenshot (`:5173`) |
| :--- | :--- | :--- |
| **Email Accounts** | `docs/Saas/screenshots/migration-audit/classic_user_email_accounts_configuration__smtp_imap_pop3_.png` | `docs/Saas/screenshots/migration-audit/workspace_direct_user_email_accounts_configuration__smtp_imap_pop3_.png` (404 Error Screen) |
| **Email Mailbox** | `docs/Saas/screenshots/migration-audit/classic_outbound___inbound_email_app.png` | `docs/Saas/screenshots/migration-audit/workspace_direct_outbound___inbound_email_app.png` (404 Error Screen) |
| **Gantt Chart** | `docs/Saas/screenshots/migration-audit/classic_interactive_frappe_gantt_chart.png` | `docs/Saas/screenshots/migration-audit/workspace_direct_interactive_frappe_gantt_chart.png` (404 Error Screen) |
| **Chat Application** | `docs/Saas/screenshots/migration-audit/classic_direct_messaging___conversations.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_direct_messaging___conversations.png` |
| **Calendar** | `docs/Saas/screenshots/migration-audit/classic_interactive_fullcalendar___event_schedule.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_interactive_fullcalendar___event_schedule.png` |
| **Kanban Board** | `docs/Saas/screenshots/migration-audit/classic_interactive_kanban_board.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_interactive_kanban_board.png` |
| **Pipeline Stages** | `docs/Saas/screenshots/migration-audit/classic_pipeline_kanban___deal_stages.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_pipeline_kanban___deal_stages.png` |
| **File Manager List** | `docs/Saas/screenshots/migration-audit/classic_file_manager_table_view.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_file_manager_table_view.png` |
| **Addon Catalog** | `docs/Saas/screenshots/migration-audit/classic_add_on_catalog___marketplace.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_add_on_catalog___marketplace.png` |
| **Invoices Builder** | `docs/Saas/screenshots/migration-audit/classic_create_invoice_builder.png` | `docs/Saas/screenshots/migration-audit/workspace_canon_create_invoice_builder.png` |

---

## H. Final Verdict & Recommended Next Actions

### Final Verdict: **REJECTED**

The original application UI has **NOT** been fully migrated into the current Master HRMS workspace. 

Although the backend APIs and database schemas were successfully implemented and verified, the user-facing UI for **User Email Accounts (SMTP/IMAP/POP3)**, **Email Mailbox**, and **Gantt Timeline** was committed into a separate subproject (`classic/`) that is never served or linked in the actual running application at `http://localhost:5173`. Furthermore, the 14 organization applications that exist in the workspace are divergent rewrites rather than true migrations of the original Jampack Classic components.

### Recommended Implementation Roadmap (Upon User Authorization)

1. **Step 1: Port Email Accounts UI to Workspace Settings (Immediate Priority)**
   - Create `src/components/settings/user-email-accounts-settings.tsx` using Tailwind CSS and Radix UI components (matching `src/` design system).
   - Wire it to `GET /api/user/email-accounts`, `POST /api/user/email-accounts`, `DELETE`, and `POST /api/user/email-accounts/:id/test-incoming`.
   - Add the "Email Accounts" tab into `src/routes/_authenticated/hr/settings.tsx` and `src/components/settings/settings-nested-nav.tsx`.
2. **Step 2: Port Mailbox Client Route (`/apps/email` or `/hr/email`)**
   - Create `src/routes/_authenticated/_app/email.tsx` allowing users to view messages and compose personal emails via their configured `UserEmailAccount`.
   - Add "Email" to `src/nav/hr-sidebar.ts` and `src/nav/employee-sidebar.ts`.
3. **Step 3: Integrate Gantt Timeline View into `/hr/todo` & `/me/todo`**
   - Add a "Timeline (Gantt)" view switcher tab to `src/routes/_authenticated/_app/todo.tsx` powered by `prisma.projectTask`.
4. **Step 4: Add `/apps/*` Route Forwarding Aliases**
   - Implement route redirects for `/apps/chat/*`, `/apps/calendar`, `/apps/taskboard/*`, `/apps/file-manager/*`, and `/apps/integrations/*` so direct URL entries and legacy bookmarks seamlessly resolve to their canonical locations.
