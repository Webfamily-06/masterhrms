# React UI/UX Implementation Roadmap
**Structured Remediation Plan for Laravel-to-React Visual and Functional Parity**

**Document Version:** 1.0.0  
**Audit Reference:** `LARAVEL_TO_REACT_VISUAL_PARITY_AUDIT.md` & `PORTAL_SCREEN_BY_SCREEN_GAP_MATRIX.md`  
**Execution Objective:** Bring the React application to 100% visual and functional parity with the Laravel reference while preserving the React + TypeScript + Node.js + Prisma multi-tenant architecture.

---

## 1. Roadmap Architecture & Priority Tiers

| Priority Tier | Focus Area | Impact & Rationale | Scope |
| :--- | :--- | :--- | :--- |
| **Tier 1 (P0)** | **Critical Portal Integrity & Defect Resolution** | Resolves broken routes, mock data elimination, security gaps, and portal landing redirects. | Super Admin mock removal, `/employee-details` re-export fix, role-based landing resolution. |
| **Tier 2 (P1)** | **Design System & Component Unification** | Establishes the reusable shadcn/ui visual tokens, standardized `DataTable`, card gradients, and line-item repeaters. | 5 shared UI components, uniform table pagination, breadcrumb integration. |
| **Tier 3 (P1)** | **Core Module Parity (HRM, Finance, POS, CRM, Projects)** | De-monoliths monolithic pages into clean modular sub-routes matching Laravel's exact directory hierarchy. | 12 core ERP modules, dedicated Create/Edit modals, print views. |
| **Tier 4 (P2)** | **Extended Workflows & Template Parity** | Implements secondary template screens from `ui/` and `ui-2/` (Shift Swaps, Notice Tracker, Client Milestones). | 4 missing template screens, enhanced interactive widgets. |

---

## 2. Tier 1 (P0): Critical Portal Integrity & Defect Resolution

### Group 1.1: Super Admin Mock Data Replacement
- **Laravel Source Screen:** `main-file/resources/js/pages/SuperAdminDashboard.tsx`, `orders/index.tsx`
- **Target React File & Route:**
  - `src/routes/_authenticated/super/transactions.tsx` (`/super/transactions`)
  - `src/routes/_authenticated/super/domains.tsx` (`/super/domains`)
  - `src/routes/_authenticated/super/analytics.tsx` (`/super/analytics`)
- **UI Components to Reuse/Create:**
  - Standard `Card`, `Badge`, `DataTable` with status filter dropdown.
- **Existing API Endpoints & Dependencies:**
  - `GET /super/stats` (Tenants, users, revenue)
  - `GET /super/tenants` (Active tenant list)
- **Missing Backend Functionality:**
  - `GET /api/super/transactions`: Needs Prisma query over `PaymentGatewayTransaction` table.
  - `GET /api/super/domains`: Needs `custom_domains` Prisma model with CNAME verification status.
  - `GET /api/super/telemetry`: Needs MySQL aggregation query for tenant database record counts and storage.
- **Implementation Priority:** **P0** (High Customer Visibility)
- **Dependencies & Regression Risks:**
  - Low risk. Does not alter tenant data isolation; affects only Super Admin platform level.

---

### Group 1.2: Employee Profile Passport (`/employee-details`)
- **Laravel Source Screen:** `ui-2/profile.html`, `main-file/packages/workdo/Hrm/src/Resources/js/Pages/Employees/Show.tsx`
- **Target React File & Route:**
  - `src/routes/_authenticated/_app/employee-details.tsx` (`/employee-details`)
- **UI Components to Reuse/Create:**
  - Profile Passport view: Employee avatar, designation banner, emergency contacts card, bank details card, document attachments list.
- **Existing API Endpoints & Dependencies:**
  - `GET /api/employees/me` or `GET /api/employees/:id`
- **Defect to Fix:**
  - Currently, `/employee-details.tsx` simply does `export default Employees;`, which re-renders the admin directory table! Replace with genuine employee personal passport view.
- **Implementation Priority:** **P0** (Defect Fix)
- **Dependencies & Regression Risks:**
  - Zero regression risk; isolated to personal profile route.

---

### Group 1.3: Employee & Client Navigation Scoping
- **Laravel Source Screen:** `main-file/resources/js/layouts/authenticated-layout.tsx` (Role-based menu filtering via `getCoreMenuItems`)
- **Target React File & Route:**
  - `src/components/dreams-sidebar.tsx`
  - `src/routes/_authenticated/_app/route.tsx`
- **UI Components to Reuse/Create:**
  - Persona navigation guards: Render only ESS links for employees, and billing/deliverables links for clients.
- **Existing API Endpoints & Dependencies:**
  - `useCurrentProfile()` session data (`roles`).
- **Implementation Priority:** **P0** (Security & UX Hygiene)
- **Dependencies & Regression Risks:**
  - Must ensure Tenant Admins and Super Admins retain full unrestricted access.

---

## 3. Tier 2 (P1): Design System & Component Unification

### Group 2.1: Reusable Standardized `DataTable` Component
- **Laravel Source Component:** `main-file/resources/js/components/ui/data-table.tsx`
- **Target React Path:** `src/components/ui/data-table.tsx`
- **Key Capabilities to Port:**
  - Card container with integrated search bar (`searchPlaceholder`).
  - Column sort triggers (`ArrowUpDown`, `ArrowUp`, `ArrowDown`).
  - Standardized bottom pagination bar (`pageSize`, `totalPages`, items-per-page selector, record range label).
  - Built-in empty state rendering `<NoRecordsFound message="..." />`.
- **Pages to Refactor:**
  - `src/routes/_authenticated/_app/employees.tsx`
  - `src/routes/_authenticated/_app/invoices.tsx`
  - `src/routes/_authenticated/_app/purchases.tsx`
  - `src/routes/_authenticated/_app/suppliers.tsx`
  - `src/routes/_authenticated/_app/products.tsx`
- **Implementation Priority:** **P1**
- **Dependencies & Regression Risks:**
  - Refactoring existing tables must preserve column keys, action buttons, and modal triggers.

---

### Group 2.2: Dynamic Line-Item `Repeater` Component
- **Laravel Source Component:** `main-file/resources/js/components/ui/repeater.tsx`
- **Target React Path:** `src/components/ui/repeater.tsx`
- **Key Capabilities to Port:**
  - Multi-row line-item table for Invoices, Quotations, and Purchase Orders.
  - Item selector dropdown (Products & Services from inventory).
  - Quantity input, unit price input, tax percentage select, discount input.
  - Real-time client-side calculation of line item subtotal, tax amount, and invoice grand total.
  - "Add Item" button and row-level delete button (`Trash2`).
- **Pages to Refactor:**
  - `src/routes/_authenticated/_app/invoices.tsx`
  - `src/routes/_authenticated/_app/purchases.tsx`
  - `src/routes/_authenticated/_app/proposals.tsx`
- **Implementation Priority:** **P1**

---

### Group 2.3: Visual Palette & Pastel Card Gradients
- **Laravel Source CSS:** `main-file/resources/css/app.css` & `components/ui/card.tsx`
- **Target React Path:** `src/styles.css` & `src/components/ui/card.tsx`
- **Key Tokens to Standardize:**
  - Stat Card Blue: `bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300`
  - Stat Card Green: `bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300`
  - Stat Card Orange: `bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300`
  - Stat Card Purple: `bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300`
- **Implementation Priority:** **P1**

---

## 4. Tier 3 (P1): Core Module Parity & De-monolithing

### Group 3.1: Accounting Suite Modularization
- **Laravel Source Directory:** `main-file/packages/workdo/Account/src/Resources/js/Pages/`
- **Current React Monolith:** `src/routes/_authenticated/_app/accounting.tsx` (1,757 lines)
- **Target Modular Sub-Routes:**
  - `/accounting/chart-of-accounts` (`ChartOfAccounts/Index.tsx`, `Create.tsx`, `Edit.tsx`)
  - `/accounting/bank-accounts` (`BankAccounts/Index.tsx`, `BankTransfers/Index.tsx`)
  - `/accounting/reports/profit-loss` (`Reports/ProfitLoss.tsx`)
  - `/accounting/reports/balance-sheet` (`Reports/BalanceSheet.tsx`)
  - `/accounting/reports/trial-balance` (`Reports/TrialBalance.tsx`)
- **Existing API Endpoints:**
  - `GET /accounting/accounts`, `POST /accounting/accounts`
  - `GET /accounting/journal-entries`, `POST /accounting/journal-entries`
  - `GET /accounting/reports/profit-loss`, `GET /accounting/reports/balance-sheet`, `GET /accounting/reports/trial-balance`
- **Implementation Priority:** **P1**

---

### Group 3.2: Sales Invoicing & Printable Document Layouts
- **Laravel Source Files:** `main-file/resources/js/pages/Sales/Index.tsx`, `Create.tsx`, `Print.tsx`
- **Current React Files:** `src/routes/_authenticated/_app/invoices.tsx`, `src/routes/_authenticated/_app/invoice.$id.tsx`
- **Enhancements to Port:**
  - Dedicated full-page invoice creator with `<Repeater />` line-item component.
  - Standardized tax calculation supporting Indian GST (CGST/SGST vs IGST) based on customer state code.
  - Dedicated print layout (`/invoice/$id/print`) matching Laravel `Print.tsx`.
- **Implementation Priority:** **P1**

---

### Group 3.3: CRM Leads & Deals Kanban Polish
- **Laravel Source Files:** `main-file/packages/workdo/Lead/src/Resources/js/Pages/Leads/Kanban.tsx`, `Deals/Kanban.tsx`
- **Current React File:** `src/routes/_authenticated/_app/crm.tsx`
- **Enhancements to Port:**
  - Dedicated Lead and Deal stage header cards showing total deal value per column.
  - "Convert Lead to Deal" modal workflow with pipeline selection.
  - Probability percentage slider on deal creation.
- **Implementation Priority:** **P1**

---

### Group 3.4: POS Cashier & Thermal Receipt Workflow
- **Laravel Source Files:** `main-file/packages/workdo/Pos/src/Resources/js/Pages/Pos/Create.tsx`, `PosOrder/Index.tsx`
- **Current React File:** `src/routes/_authenticated/_app/pos.tsx`
- **Enhancements to Port:**
  - Full-screen distraction-free cashier view (auto-collapsing sidebar upon entering POS mode).
  - Quick cashier switch modal.
  - Thermal receipt reprint from completed orders history table.
- **Implementation Priority:** **P1**

---

## 5. Tier 4 (P2): Extended Workflows & Template Parity

### Group 4.1: Peer Shift Swap Requests
- **Source Template:** `ui-2/shift-swap-requests.html`
- **Target React File:** `src/routes/_authenticated/_app/shifts.tsx` (Dedicated Tab or Route `/shift-swaps`)
- **Components:** Shift Swap Request Dialog, Peer Approval card, Manager Override button.
- **Backend Model:** `shift_swap_requests` table (already exists in schema!).
- **API Endpoints to Connect:**
  - `GET /api/shifts/swap-requests`
  - `POST /api/shifts/swap-requests`
  - `PUT /api/shifts/swap-requests/:id/peer-approve`
  - `PUT /api/shifts/swap-requests/:id/manager-approve`
- **Implementation Priority:** **P2**

---

### Group 4.2: Notice Period & Resignation Tracker
- **Source Template:** `ui-2/notice-period-tracker.html`
- **Target React File:** `src/routes/_authenticated/_app/offboarding.tsx` (Tab 2)
- **Components:** Timeline progress bar (days served vs days remaining), handover tasks checklist, successor employee dropdown.
- **Backend Model:** `employee_exits` and `exit_checklist_items` (already exists in schema!).
- **API Endpoints to Connect:**
  - `GET /api/offboarding/tracker`
  - `POST /api/offboarding/checklist-item/toggle`
- **Implementation Priority:** **P2**

---

### Group 4.3: Client Project Milestone Deliverable Sign-Off
- **Source Screen:** `main-file/packages/workdo/Taskly/src/Resources/js/Pages/Dashboard/ClientDashboard.tsx` & `ui/project-details.html`
- **Target React File:** `src/routes/_authenticated/_app/client-dashboard.tsx`
- **Components:** Milestone deliverable card, "Approve Milestone & Release Billing" dialog, feedback input.
- **Backend Model:** `project_milestones` (table exists!).
- **API Endpoints to Connect:**
  - `POST /api/client/milestones/:id/approve`
- **Implementation Priority:** **P2**

---

## 6. Phased Implementation Timeline & Execution Status

```
Phase 1: Tier 1 (P0) — Critical Portal Integrity [COMPLETED]
├── [DONE] Eliminate mock data in Super Admin (/super/transactions, /super/domains, /super/analytics)
├── [DONE] Fix /employee-details.tsx with full Employee Profile Passport (5 tabs, live APIs)
├── [DONE] Restyle Auth layout (/auth) with high-fidelity glassmorphism, dynamic tenant logo
└── [DONE] Validate persona-specific sidebar filtering for Super Admin, Tenant Admin, Employees, and Clients

Phase 2: Core UI & Multi-Tenant Branding [COMPLETED]
├── [DONE] Dynamic tenant branding hook (useTenantBranding) querying /api/workspace/settings & resolve
├── [DONE] DreamsSidebar dynamic branding replacing hardcoded logos without cross-tenant leak
└── [DONE] Role-specific navigation routing (Super Admin, Vendor Admin, Employee ESS, Client Portal)

Phase 3: Missing HRMS Screens & Extended Workflows [COMPLETED]
├── [DONE] Shift Swap Requests (/shift-swap-requests) with peer-to-peer and manager authorization
├── [DONE] Notice Period Tracker (/notice-period-tracker) with 4-way clearance checklist modal
├── [DONE] Employee Attendance Matrix (/attendance-employee) with regularization request flow
├── [DONE] Personal My Tasks Board (/tasks) with 4-column Kanban board and live task modal
└── [DONE] Client Milestone Deliverable sign-off modal and Pay Now action in Client Portal (/client-dashboard)

Phase 4: Honors, Disciplinary & Self-Service Lifecycle [COMPLETED]
├── [DONE] Awards & Recognitions (/awards) with recognition wall, directory table, and digital certificate generator
├── [DONE] Disciplinary Warnings (/warnings) with severity tiers, formal notice document preview, and acknowledgment sign-off
└── [DONE] Employee Leave Cancellation in /employee-dashboard and /leave with automatic attendance rollback upon approved cancellation

Phase 5: Wave 1 Group C — CRM Contacts & Details Pages [COMPLETED]
├── [DONE] W1-C1: CRM Contacts (/contacts) with dual Grid/Table view, Executive metrics, Add Contact modal, CSV export, and 5-tab Contact Passport modal (Activity, Notes, Calls, Files, Social)
├── [DONE] W1-C2: Invoice Details Passport (/invoice/$id) with company tax header, status badge, line items breakdown, live Payment Ledger, and interactive Record Client Payment modal with GL/AR posting
└── [DONE] W1-C3: Project Details Passport (/project/$id) with left metadata sidebar, countdown timer, hero card, interactive task toggle with live progress %, and Add Task, Upload Document, and Add Note modals with Prisma MySQL persistence
```

---
*End of REACT_UI_UX_IMPLEMENTATION_ROADMAP.md*
