# UIABLE MIGRATION REGISTRY
**MASTERHRMS Enterprise System — Component Evaluation & Migration Registry**
*Wave 1: Foundation UI System*

---

## 1. Registry Overview

This registry tracks every evaluated component across the MASTERHRMS frontend architecture, recording its classification, UIAble match candidate, migration decision, current migration status, and associated architectural risk.

### Decision Taxonomy:
- **`EXACT_MATCH`**: Direct 1-to-1 equivalent exists in the UIAble design system / primitive catalog.
- **`POSSIBLE_MATCH`**: Conceptual or block-level composite match available in UIAble blocks.
- **`KEEP_EXISTING`**: Existing implementation is already high quality, appropriate, or tightly integrated.
- **`CUSTOM_REQUIRED`**: Bespoke domain component requiring dedicated application-level styling.
- **`BUSINESS_LOGIC_PROTECTED`**: Mission-critical workflow component whose behavior, state, and API contracts must be strictly preserved.

---

## 2. Wave 1 Foundation Components Evaluated

| Existing Component | Category | Source Path | UIAble Match | Decision | Migration Status | Risk |
|---|---|---|---|---|---|---|
| **Button** | Forms / Action | `src/components/ui/button.tsx` | `@uiable/button` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Badge** | Data Display | `src/components/ui/badge.tsx` | `@uiable/badge` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Card** | Layout / Container | `src/components/ui/card.tsx` | `@uiable/card` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Input** | Forms | `src/components/ui/input.tsx` | `@uiable/input` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Textarea** | Forms | `src/components/ui/textarea.tsx` | `@uiable/textarea` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Empty** | Feedback / Display | `src/components/ui/empty.tsx` | `@uiable/empty` | `EXACT_MATCH` | **CREATED (Wave 1)** | `LOW` |
| **EmptyState** | Feedback / Display | `src/components/system-states/empty-state.tsx` | `@uiable/empty` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Table** | Data Display | `src/components/ui/table.tsx` | `@uiable/table` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Dialog** | Feedback / Overlay | `src/components/ui/dialog.tsx` | `@uiable/dialog` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Tabs** | Navigation | `src/components/ui/tabs.tsx` | `@uiable/tabs` | `EXACT_MATCH` | **MIGRATED (Wave 1)** | `LOW` |
| **Avatar** | Data Display | `src/components/ui/avatar.tsx` | `@uiable/avatar` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Label** | Forms | `src/components/ui/label.tsx` | `@uiable/label` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Tooltip** | Feedback / Overlay | `src/components/ui/tooltip.tsx` | `@uiable/tooltip` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Popover** | Feedback / Overlay | `src/components/ui/popover.tsx` | `@uiable/popover` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Separator** | Layout | `src/components/ui/separator.tsx` | `@uiable/separator` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Sheet** | Feedback / Overlay | `src/components/ui/sheet.tsx` | `@uiable/sheet` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Drawer** | Feedback / Overlay | `src/components/ui/drawer.tsx` | `@uiable/drawer` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Select** | Forms | `src/components/ui/select.tsx` | `@uiable/select` | `KEEP_EXISTING` | **PRESERVED** | `MEDIUM` |
| **DropdownMenu** | Navigation | `src/components/ui/dropdown-menu.tsx` | `@uiable/dropdown-menu` | `KEEP_EXISTING` | **PRESERVED** | `MEDIUM` |
| **Calendar** | Forms / Date | `src/components/ui/calendar.tsx` | `@uiable/calendar` | `KEEP_EXISTING` | **PRESERVED** | `MEDIUM` |
| **Switch** | Forms | `src/components/ui/switch.tsx` | `@uiable/switch` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Checkbox** | Forms | `src/components/ui/checkbox.tsx` | `@uiable/checkbox` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **RadioGroup** | Forms | `src/components/ui/radio-group.tsx` | `@uiable/radio-group` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Slider** | Forms | `src/components/ui/slider.tsx` | `@uiable/slider` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Progress** | Feedback | `src/components/ui/progress.tsx` | `@uiable/progress` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |
| **Skeleton** | Feedback | `src/components/ui/skeleton.tsx` | `@uiable/skeleton` | `KEEP_EXISTING` | **PRESERVED** | `LOW` |

---

## 3. High-Level Composite & Business Components (Protected)

| Existing Component | Category | Source Path | UIAble Match | Decision | Migration Status | Risk |
|---|---|---|---|---|---|---|
| **DataTable** | Data Display | `src/components/ui/data-table.tsx` | `@uiable/data-table` | `POSSIBLE_MATCH` | **MIGRATED (Wave 2)** | `LOW` |
| **DreamsSidebar** | Navigation / Layout | `src/components/dreams-sidebar.tsx` | `block-dashboard-layout` | `BUSINESS_LOGIC_PROTECTED` | **PRESERVED** | `CRITICAL` |
| **DashboardHeader** | Layout | `src/components/dashboard-header.tsx` | `block-navbar` | `BUSINESS_LOGIC_PROTECTED` | **PRESERVED** | `HIGH` |
| **SettingsNestedNav**| Navigation | `src/components/settings/settings-nested-nav.tsx` | `block-dashboard-layout` | `BUSINESS_LOGIC_PROTECTED` | **PRESERVED** | `HIGH` |
| **CompanyProfileSettings**| Business | `src/components/settings/company-profile-settings.tsx` | None | `BUSINESS_LOGIC_PROTECTED` | **LOCKED / PRESERVED** | `CRITICAL` |
| **MediaImageUploader**| Business / Media | `src/components/settings/media-image-uploader.tsx` | None | `BUSINESS_LOGIC_PROTECTED` | **LOCKED / PRESERVED** | `CRITICAL` |
| **BankDisbursementWorkspace**| Business / Payroll | `src/components/payroll/bank-disbursement-workspace.tsx` | None | `BUSINESS_LOGIC_PROTECTED` | **LOCKED / PRESERVED** | `CRITICAL` |
| **SubscriptionCheckoutModal**| Business / Billing | `src/components/subscription/subscription-checkout-modal.tsx` | None | `BUSINESS_LOGIC_PROTECTED` | **LOCKED / PRESERVED** | `CRITICAL` |

---

## 4. Wave 2 Data Tables & Complex Displays Evaluated

| Existing Component | Category | Source Path | UIAble Match | Decision | Migration Status | Risk | Compatibility Notes |
|---|---|---|---|---|---|---|---|
| **DataTable** | Data Display | `src/components/ui/data-table.tsx` | `@uiable/data-table` | `POSSIBLE_MATCH` | **MIGRATED (Wave 2)** | `LOW` | 100% backward compatible API. Upgraded with UIAble design tokens, subtle borders, EmptyState integration, and responsive horizontal overflow. |
| **ChartOfAccountsTable** | Accounting / Display | `src/components/accounting/chart-of-accounts-table.tsx` | `table-orders` | `CUSTOM_REQUIRED` | **PRESERVED / COMPATIBLE** | `LOW` | Consumes `DataTable` seamlessly; displays GL statements, account codes, and badges. |
| **SuperPurchaseTransactionsPage** | Billing / Transactions | `src/routes/_authenticated/super/transactions.tsx` | `data-table-basic` | `BUSINESS_LOGIC_PROTECTED` | **PRESERVED** | `LOW` | Mission-critical payment gateway & manual approval workflow. Verified all 5 dialogs, payment proof view, manual approve/reject actions. |
| **EmployeeTable** | Core ERP | `src/routes/_authenticated/_app/employees.tsx` | `table-users` | `BUSINESS_LOGIC_PROTECTED` | **PRESERVED** | `LOW` | Multi-tenant employee registry with branch/department filters. Verified 100% rendering. |
| **Pagination** | Data Display | `src/components/ui/pagination.tsx` | `@uiable/pagination` | `EXACT_MATCH` | **PRESERVED** | `LOW` | Standard accessible pagination primitive. Compatible with UIAble navigation tokens. |

---

---

## 6. Wave 3 Stage B Navigation & Shell Components Modernized

| Existing Component | Category | Source Path | UIAble Reference | Decision | Migration Status | Risk | Architectural Invariants & Compatibility Notes |
|---|---|---|---|---|---|---|---|
| **DreamsSidebar** | Navigation / Layout | `src/components/dreams-sidebar.tsx` | `block-dashboard-layout` | `BUSINESS_LOGIC_PROTECTED` | **MODERNIZED (Wave 3 Stage B)** | `LOW` | Preserved all 4 persona trees (Super Admin, Client, Employee, Tenant ERP Admin), module entitlement guards (`isModuleAllowed`), route paths, 250px/72px collapse rail, hover expansion, and mobile drawer. Visually modernized with UIAble tokens (`border-border/70`, `bg-card/95 backdrop-blur-md`, `shadow-2xs`). |
| **AppShell Topbar** | Layout / Shell Host | `src/routes/_authenticated/_app/route.tsx` | `block-navbar` | `BUSINESS_LOGIC_PROTECTED` | **MODERNIZED (Wave 3 Stage B)** | `LOW` | Preserved active tenant resolution, impersonation banners, profile resolution, 2FA status, fullscreen API, POS/Customer Display routing, and logout workflows. Upgraded topbar header bar (`border-border/60 bg-background/80 backdrop-blur-md`), workspace trigger card, `⌘K` command search badge, uniform quick action icons, and user profile dropdown. |
| **DashboardHeader** | Layout / Data Display | `src/components/dashboard-header.tsx` | `block-navbar` | `BUSINESS_LOGIC_PROTECTED` | **MODERNIZED (Wave 3 Stage B)** | `LOW` | Integrated Wave 1 `Button` and `Badge`, modern rounded card banner (`rounded-2xl border-border/60 bg-card/75`), enhanced calendar date-range popover, and preserved 100% of date presets (Today, 7D, 30D, Month, 90D) and CSV/PDF export workflows. |
| **SettingsNestedNav** | Navigation | `src/components/settings/settings-nested-nav.tsx` | `block-dashboard-layout` | `BUSINESS_LOGIC_PROTECTED` | **MODERNIZED (Wave 3 Stage B)** | `LOW` | Elevated desktop sticky container and mobile selector bar with UIAble tokens (`border-border/70 bg-card/90 backdrop-blur-md shadow-2xs`), refined active pill styling, modernized search input and accordion lines. Dual consumer compatibility preserved (`/_app/settings.tsx` and `/super/settings.tsx`). |
| **SuperShell & SuperSidebar** | Platform Shell / Host | `src/routes/_authenticated/super/route.tsx` | `block-dashboard-layout` | `BUSINESS_LOGIC_PROTECTED` | **MODERNIZED (Wave 3 Stage B)** | `LOW` | Structurally isolated platform control plane. Preserved 100% of `isTenantWorkspaceHost()` host domain guards, Super Admin role verifications, and platform route trees. Aligned visual tokens for platform header and SuperSidebar. |

---

---

## 8. Wave 4 Stage B P0 Composites & Batch 1 Application Pages Modernized

| Existing / New Component | Category | Source Path | UIAble Reference | Decision | Migration Status | Risk | Architectural Invariants & Compatibility Notes |
|---|---|---|---|---|---|---|---|
| **PageHeader** | Layout / Navigation | `src/components/ui/page-header.tsx` | `block-page-header` | `EXACT_MATCH` | **CREATED (Wave 4 Stage B)** | `LOW` | Canonical in-page content header with breadcrumb navigation, title, optional icon/badge, subtitle/description, and responsive action slot. Built on Wave 1 `Button` and `Badge`. Distinct from `DashboardHeader`. |
| **StatCard** | Data Display | `src/components/ui/stat-card.tsx` | `card-metric` | `EXACT_MATCH` | **CREATED (Wave 4 Stage B)** | `LOW` | Standardized KPI card with label, value, icon, description, badge, trend delta, and loading skeleton. Leverages Wave 1 `Card` and `Badge`. |
| **StatsOverviewGrid** | Layout / Container | `src/components/ui/stats-overview-grid.tsx` | `grid-stats` | `EXACT_MATCH` | **CREATED (Wave 4 Stage B)** | `LOW` | Responsive grid container supporting 1 to 5 columns with mobile (1 col), tablet (2 col), and desktop (configurable) breakpoints. Zero horizontal overflow at 375px. |
| **FilterToolbar** | Forms / Action | `src/components/ui/filter-toolbar.tsx` | `toolbar-filter` | `EXACT_MATCH` | **CREATED (Wave 4 Stage B)** | `LOW` | Standardized responsive search/filter bar with input, filter select slot, view mode toggle slot, export slot, and custom actions slot. |
| **ConfirmationDialog** | Feedback / Overlay | `src/components/ui/confirmation-dialog.tsx` | `dialog-confirm` | `EXACT_MATCH` | **CREATED (Wave 4 Stage B)** | `LOW` | Accessible destructive confirmation dialog wrapping Radix Alert Dialog. Consumer owns mutation; zero business logic or mutation rewrite inside the component. |
| **Announcements Page** | Application Page | `src/routes/_authenticated/_app/announcements.tsx` | `page-announcements` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Stage B)** | `LOW` | Replaced ad-hoc header, KPI summaries, and search row with `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`. Preserved 100% of acknowledgement mutations, pinning, and author resolution. |
| **Holidays Page** | Application Page | `src/routes/_authenticated/_app/holidays.tsx` | `page-holidays` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Stage B)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar` (with List/Calendar toggle), and `ConfirmationDialog`. Preserved date calculations, CSV export, and CRUD mutations. |
| **Departments Page** | Application Page | `src/routes/_authenticated/_app/departments.tsx` | `page-departments` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Stage B)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog` (with staff reassignment warning). Preserved parent-child hierarchy, staff counts, and CRUD logic. |
| **Designations Page** | Application Page | `src/routes/_authenticated/_app/designations.tsx` | `page-designations` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Stage B)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`. Preserved role associations, employee assignments, and CRUD logic. |

---

## 10. Wave 4 Batch 2 Application Pages Modernized

| Existing Component | Category | Source Path | UIAble Reference | Decision | Migration Status | Risk | Architectural Invariants & Compatibility Notes |
|---|---|---|---|---|---|---|---|
| **Todo Page** | Application Page | `src/routes/_authenticated/_app/todo.tsx` | `page-tasks` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Batch 2)** | `LOW` | Modernized personal task & action tracker with `PageHeader`, `StatsOverviewGrid` (4 cols), `StatCard`, `FilterToolbar`, `ConfirmationDialog`, and `LoadingState`/`EmptyState`. Preserved 100% of task CRUD, status transitions, priority levels, tag associations, and query invalidation. |
| **Notes Page** | Application Page | `src/routes/_authenticated/_app/notes.tsx` | `page-notes` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Batch 2)** | `LOW` | Modernized workspace notes & documentation area with `PageHeader`, `StatsOverviewGrid` (4 cols), `StatCard`, `FilterToolbar`, `ConfirmationDialog`, and `LoadingState`/`EmptyState`. Preserved All, Starred, and Trash folder navigation, pin/star toggles, soft-delete, permanent delete, text export, and query invalidation. |
| **Daily Report Page** | Application Page (Read-Only) | `src/routes/_authenticated/_app/daily-report.tsx` | `page-reports` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Batch 2)** | `LOW` | Modernized read-only daily attendance & operations report with `PageHeader` (with CSV export & Refresh actions), `StatsOverviewGrid` (4 cols), `StatCard`, attendance trend card, `FilterToolbar` (date picker, status select, sort), and `LoadingState`/`EmptyState`. Zero write operations introduced; 100% preserved date aggregation and CSV export encoding. |
| **Promotions Page** | Application Page | `src/routes/_authenticated/_app/promotions.tsx` | `page-promotions` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Batch 2)** | `LOW` | Modernized employee career progression workspace with `PageHeader`, `StatsOverviewGrid` (3 cols), `StatCard`, `FilterToolbar`, `ConfirmationDialog`, and `LoadingState`/`EmptyState`. Preserved promotion, demotion, lateral movement classification, employee association, dialog form mutation, and query invalidation. |
| **Awards Page** | Application Page | `src/routes/_authenticated/_app/awards.tsx` | `page-awards` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Batch 2)** | `LOW` (Enhanced QA) | Modernized employee recognition hub with `PageHeader`, `StatsOverviewGrid` (4 cols), `StatCard`, `FilterToolbar` with Wall/Directory view toggle, `ConfirmationDialog`, and `LoadingState`/`EmptyState`. Preserved both Wall (Grid) and Directory (Table) views, full Digital Certificate of Recognition modal, issue award mutation, category creation, and query invalidation. |
| **Warnings Page** | Application Page | `src/routes/_authenticated/_app/warnings.tsx` | `page-warnings` | `POSSIBLE_MATCH` | **MIGRATED (Wave 4 Batch 2)** | `MEDIUM` | Modernized formal disciplinary incident tracker with `PageHeader`, `StatsOverviewGrid` (4 cols), `StatCard`, `FilterToolbar` with Table/Cards view toggle, `ConfirmationDialog` for deletion and incident resolution, and `LoadingState`/`EmptyState`. Preserved 100% of formal disciplinary notice preview, employee sign-off & statement acknowledgment mutation, infraction types, and severity badges. |

---

## 11. Cumulative Migration Summary (Waves 1, 2, 3, Wave 4 Batch 1, Batch 2, Batch 3 & Batch 4)

- **Total Evaluated Primitives, Tables, Shell & Business UI Items**: 67
- **Foundation Components Migrated / Enhanced (Wave 1)**: 11 (`Button`, `Badge`, `Card`, `Input`, `Textarea`, `Empty`, `EmptyState`, `Table`, `Dialog`, `Tabs`, `DataTable`)
- **Data Tables & Listing UI Modernized (Wave 2)**: 5 (`DataTable`, `ChartOfAccountsTable`, `SuperPurchaseTransactionsPage`, `EmployeeTable`, `Pagination`)
- **Navigation & Shell Components Modernized (Wave 3 Stage B)**: 5 (`DreamsSidebar`, `AppShell Topbar`, `DashboardHeader`, `SettingsNestedNav`, `SuperShell`)
- **P0 Reusable Composite Components Implemented (Wave 4 Stage B)**: 5 (`PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`)
- **Wave 4 Batch 1 Application Pages Migrated**: 4 (`announcements`, `holidays`, `departments`, `designations`)
- **Wave 4 Batch 2 Application Pages Migrated**: 6 (`todo`, `notes`, `daily-report`, `promotions`, `awards`, `warnings`)
- **Wave 4 Batch 3 Application Pages Migrated**: 4 (`probation`, `work-from-home`, `shift-swap-requests`, `call-history`)
- **Wave 4 Batch 4 Application Pages Migrated**: 4 (`overtime`, `ban-ip-address`, `ticket-reports`, `leave-report`)
- **Wave 4 Batch 5 Application Pages Migrated**: 4 (`attendance-report`, `employee-report`, `project-report`, `setup-notes`)
- **Components Preserved (Quality Primitives & Custom Tables)**: 19
- **Components Protected (Business Logic & Core ERP Workflows)**: 9 (Retained strict business invariant boundaries)
- **Zero Behavioral Regressions**: 100% backward-compatibility across all component props, callbacks, routing structures, and responsive states.
- **Backend Changes**: NONE.
- **Dependencies Added**: NONE.
- **Verification Gates**: Frontend tsc 0 errors, Backend tsc 0 errors, Production build exit 0, CMS isolation 8/8, Media gallery 16/16, git scope clean.

---

## 12. Wave 4 Batch 3 Application Pages Migrated

### Group A — Implemented (Stage B, Commit `d0e657ca7`)

| Candidate Page | Category | Source Path | UIAble Match | Decision | Current Status | Risk | Implementation Notes |
|---|---|---|---|---|---|---|---|
| **Probation Page** | Core HR Operations | `src/routes/_authenticated/_app/probation.tsx` | `page-probation` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 3)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid` (4 cols: Total Records, Active, Passed, Extended), `StatCard`, `FilterToolbar` (search + status select), `ConfirmationDialog` (delete). Preserved all query keys, GET/POST/PUT/DELETE mutations, RBAC `isAdmin` guards, `qc.invalidateQueries`, auto end-date calculation, and Update Status modal. |
| **Work From Home Page** | HR / Attendance Requests | `src/routes/_authenticated/_app/work-from-home.tsx` | `page-wfh` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 3)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid` (4 cols: Pending, Approved, Rejected, Completed), `StatCard`, `FilterToolbar` (search + status select), `ConfirmationDialog` (delete). Preserved WFH create mutation, review PUT (`/wfh/${id}/review`), delete mutation, RBAC `isAdmin` guard, approve/reject/complete workflows, and `qc.invalidateQueries`. |
| **Shift Swap Requests** | Workforce Operations | `src/routes/_authenticated/_app/shift-swap-requests.tsx` | `page-shift-swap` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 3)** | `LOW` | Modernized with `PageHeader` (with description), `StatsOverviewGrid` (3 cols: Pending Peer Review, Awaiting Manager Approval, Approved & Executed), `StatCard`, `FilterToolbar` (search + status select). Preserved POST `/shifts/swaps`, PUT `/shifts/swaps/${id}/peer-action`, PUT `/shifts/swaps/${id}/manager-action`, employee selection, RBAC `isManagerOrAdmin` guard, and all action strings (`accept`/`decline`/`approve`/`reject`). |
| **Call History Page** | Telephony / CRM Log | `src/routes/_authenticated/_app/call-history.tsx` | `page-call-history` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 3)** | `LOW` | Modernized with `PageHeader` (with description), `FilterToolbar` (search + call type select + sort order select), `ConfirmationDialog` ×2 (single delete + bulk delete). Preserved query key `["crm-calls", search, callTypeFilter, sortOrder]`, GET `/crm/calls`, DELETE `/crm/calls/${id}`, POST `/crm/calls/bulk-delete`, `selectedIds` select-all/select-one state, caller details modal, and `qc.invalidateQueries`. |

### Group B — Deferred (Not Implemented)

| Candidate Page | Category | Source Path | UIAble Match | Decision | Current Status | Risk | Audit Notes |
|---|---|---|---|---|---|---|---|
| **Assets Page** | Enterprise Hardware / LifeCycle | `src/routes/_authenticated/_app/assets.tsx` | `page-assets` | `DEFER` | **AUDIT ONLY — NOT IMPLEMENTED** | `HIGH` | 2,178 lines. 7 tabs, 8 modals, `useAddon` monetization gating, and financial scrap disposal write-offs. Deferred to specialized enterprise wave. |
| **Asset Dashboard** | Analytics / Charts | `src/routes/_authenticated/_app/asset-dashboard.tsx` | `dashboard-analytics` | `DEFER` | **AUDIT ONLY — NOT IMPLEMENTED** | `MEDIUM` | 1,117 lines. Renders dynamic ApexCharts. Deferred to dedicated Wave 4 Dashboard Modernization wave. |
| **Training Page** | LMS / Compliance Certifications | `src/routes/_authenticated/_app/training.tsx` | `page-training` | `DEFER` | **AUDIT ONLY — NOT IMPLEMENTED** | `HIGH` | 1,678 lines. 6 tabs (includes embedded `trainers`), multi-module curriculum, and verified digital completion certificates. Deferred to LMS wave. |
| **Transfers Page** | Supply Chain / Inventory Ledger | `src/routes/_authenticated/_app/transfers.tsx` | `page-transfers` | `DEFER` | **AUDIT ONLY — NOT IMPLEMENTED** | `HIGH` | 844 lines. Physical multi-warehouse stock mutations, in-transit dispatch, and inventory ledger balance shifts. Mission-critical supply chain protected. |
| **Resignation Page** | HR / Separation Lifecycle | `src/routes/_authenticated/_app/resignation.tsx` | `page-resignation` | `CONTROLLED_ADAPTER` | **AUDIT ONLY — NOT IMPLEMENTED** | `MEDIUM` | 797 lines. Classified as Group B. Fits composites, but requires strict preservation of personal separation banner, exitCode generation, and offboarding links. |
| **Taxes Page** | Finance / Payroll Tax Rules | `src/routes/_authenticated/_app/taxes.tsx` | `page-tax` | `DEFER` | **AUDIT ONLY — NOT IMPLEMENTED** | `HIGH` | Financial tax bracket ledger and statutory withholding matrices. Deferred. |

---

## 13. Wave 4 Batch 4 Application Pages Modernized

### Option B (Balanced) — Implemented (Stage B)

| Candidate Page | Category | Source Path | UIAble Match | Decision | Current Status | Risk | Implementation & Verification Notes |
|---|---|---|---|---|---|---|---|
| **Overtime Page** | Attendance Operations | `src/routes/_authenticated/_app/overtime.tsx` | `page-overtime` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 4)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid` (4 cols: Total Requests, Approved, Pending, Rejected), `StatCard`, `FilterToolbar` (search + status select), `ConfirmationDialog` (delete). Preserved all query keys (`["overtime-stats"]`, `["overtime", statusFilter, search]`, `["employees-mini"]`), endpoints (`POST /overtime`, `PUT /overtime/${id}/review`, `DELETE /overtime/${id}`), invalidation keys, and RBAC `isAdmin` set (`admin`, `super_admin`, `tenant_admin`, `hr_admin`, `manager`). |
| **Ban IP Address Page** | Security Access Control | `src/routes/_authenticated/_app/ban-ip-address.tsx` | `page-security` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 4)** | `LOW` | Modernized with `PageHeader`, `StatsOverviewGrid` (4 cols: Total Blocked IPs, Active Enforcement, WAF Rule Status, Protocol Support), `StatCard`, `FilterToolbar` (search + Grid/Table toggle slot), `ConfirmationDialog` (delete). Preserved query key `["banned-ips", search]`, endpoints (`POST /banned-ips`, `PUT /banned-ips/${id}`, `DELETE /banned-ips/${id}`), Add/Edit dialog workflows, and `isWorkspaceAdminUser(profile)` / `<AccessDenied />` firewall guard. |
| **Ticket Reports Page** | Helpdesk Analytical Report | `src/routes/_authenticated/_app/ticket-reports.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 4)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Tickets, Open Tickets, In Progress, Resolved), `StatCard`, `FilterToolbar` (search + status combobox + priority combobox), Table. Strictly READ-ONLY (0 mutations). Preserved query keys `["helpdesk-tickets-report", tenantId]` and `["helpdesk-stats-report", tenantId]`, tenant scoping, and CSV export. |
| **Leave Report Page** | Attendance / Leave Analytics | `src/routes/_authenticated/_app/leave-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 4)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Applications, Approved Leaves, Pending Approval, Rejected / Cancelled), `StatCard`, `FilterToolbar` (search + leave type combobox + status combobox), Table. Strictly READ-ONLY (0 mutations). Preserved query keys `["leave-types", tenantId]` and `["leave-report", tenantId, selectedStatus, selectedType]`, tenant scoping, avatar resolution, and CSV export. |

---

## 14. Wave 4 Batch 5 Application Pages Modernized

### Option B (Balanced) — Implemented (Stage B)

| Candidate Page | Category | Source Path | UIAble Match | Decision | Current Status | Risk | Implementation & Verification Notes |
|---|---|---|---|---|---|---|---|
| **Attendance Report Page** | Workforce Attendance Analytics | `src/routes/_authenticated/_app/attendance-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 5)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Working Days, Present Days, Absent Days, Attendance Rate), `StatCard`, `FilterToolbar` (search + month picker + department select + status select), Table. Strictly READ-ONLY (0 mutations). Preserved query keys `["attendance-report", tenantId, selectedMonth, selectedDept]` and `["departments", tenantId]`, tenant resolution `profile?.tenant_id`, employee avatar, attendance progress indicator, and CSV export. |
| **Employee Report Page** | Workforce Demographic Analytics | `src/routes/_authenticated/_app/employee-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 5)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Active Staff, Full-Time Employees, Contract/Intern Staff, Departments Count), `StatCard`, `FilterToolbar` (search + department select + employment type select + status select), Table. Strictly READ-ONLY (0 mutations). Preserved query keys `["employee-report", tenantId, filters]` and `["departments", tenantId]`, tenant scoping, designation, joining date, employee navigation link, and CSV export. |
| **Project Report Page** | Enterprise Portfolio Delivery | `src/routes/_authenticated/_app/project-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 5)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Projects, Completed Projects, In Progress, Critical Priority), `StatCard`, `FilterToolbar` (search + priority select + status select), Table, progress bars, client names, due dates, priority/status badges. Strictly READ-ONLY (0 mutations). Preserved query key `["project-reports", tenantId]`, tenant scoping, and CSV export. |
| **Setup Notes Page** | Security & Authentication Guide | `src/routes/_authenticated/_app/setup-notes.tsx` | `page-guide` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 5)** | `LOW` | Modernized static informational 2FA/login guide with `PageHeader`, responsive step cards with `Badge`, security best practices list, troubleshooting guide, and security notice callout. Zero queries, zero mutations. 100% preserved instructional text and credential guidance. |

---

## 15. Wave 4 Batch 6 Application Pages Modernized

### Option A (Pure Financial Reports Suite) — Implemented & Certified (Stage B)

| Candidate Page | Category | Source Path | UIAble Match | Decision | Current Status | Risk | Implementation & Verification Notes |
|---|---|---|---|---|---|---|---|
| **Expenses Report Page** | Finance / Expense Analytics | `src/routes/_authenticated/_app/expenses-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 6)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Expenses, Approved / Settled, Pending Review, Rejected Claims), `StatCard`, `FilterToolbar` (search + category select + status select), Table. Strictly READ-ONLY (0 mutations). Preserved query keys `["realtime-platform-settings"]`, `["expense-categories", tenantId]`, `["expense-claims", tenantId, statusFilter, categoryFilter]`, and `["expenses-summary", tenantId]`, tenant scoping, and CSV export. |
| **Invoice Report Page** | Finance / Invoicing Analytics | `src/routes/_authenticated/_app/invoice-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 6)** | `LOW` | Modernized with `PageHeader` (with CSV export + Manage Invoices action), `StatsOverviewGrid` (5 cols: Total Invoices, Paid Invoices, Overdue Invoices, Pending Payments, Total Revenue), `StatCard`, `FilterToolbar` (search + status select), Table, and Invoice Detail Passport Dialog. Strictly READ-ONLY (0 mutations). Preserved query key `["invoices-report", tenantId]`, calculations, modal copy-link action, and CSV export. |
| **Payment Report Page** | Finance / Payment Settlements | `src/routes/_authenticated/_app/payment-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 6)** | `LOW` | Modernized with `PageHeader` (with CSV export), `StatsOverviewGrid` (4 cols: Total Collected, Settled Invoices, Failed Gateway Attempts, Success Rate), `StatCard`, Payments By Method distribution breakdown card, `FilterToolbar` (search + payment method select), Table. Strictly READ-ONLY (0 mutations). Preserved query keys `["realtime-platform-settings"]`, `["payments-report", tenantId, methodFilter]`, and `["payments-gateway-metrics", tenantId]`, tenant scoping, and CSV export. |
| **Payslip Report Page** | Payroll / Compensation Audit | `src/routes/_authenticated/_app/payslip-report.tsx` | `page-reports` | `EXACT_MATCH` | **MIGRATED (Wave 4 Batch 6)** | `LOW` | Modernized with `PageHeader` (with CSV export + Run Payroll action), `StatsOverviewGrid` (4 cols: Total Gross Payroll, Total Deductions, Disbursed Net Pay, Allowances & Perks), `StatCard`, Annual Net Payroll Distribution 12-month bar trend card, `FilterToolbar` (search + year select + month select + status select), Table, and Payslip Breakdown Passport Dialog. Strictly READ-ONLY (0 mutations). Preserved query keys `["departments", tenantId]` and `["payslips-report", tenantId, selectedYear, selectedMonth]`, employee avatar resolution, calculations, print action, and CSV export. |

---

## 16. Wave 4 Program Closure Summary

**Wave 4 is officially CLOSED and CERTIFIED.**

- **Total Wave 4 Batches:** 6 Batches (Batches 1–6)
- **Cumulative Migrated Application Pages:** Exactly **26 Pages** (~14,965 LOC)
  - Batch 1 (4): `announcements.tsx`, `holidays.tsx`, `departments.tsx`, `designations.tsx`
  - Batch 2 (6): `todo.tsx`, `notes.tsx`, `daily-report.tsx`, `promotions.tsx`, `awards.tsx`, `warnings.tsx`
  - Batch 3 (4): `probation.tsx`, `work-from-home.tsx`, `shift-swap-requests.tsx`, `call-history.tsx`
  - Batch 4 (4): `overtime.tsx`, `ban-ip-address.tsx`, `ticket-reports.tsx`, `leave-report.tsx`
  - Batch 5 (4): `attendance-report.tsx`, `employee-report.tsx`, `project-report.tsx`, `setup-notes.tsx`
  - Batch 6 (4): `expenses-report.tsx`, `invoice-report.tsx`, `payment-report.tsx`, `payslip-report.tsx`
- **Verification Gates:**
  - Frontend TypeScript: PASS (0 errors)
  - Backend TypeScript: PASS (0 errors)
  - Production Build: PASS (exit code 0)
  - CMS Isolation Suite: PASS (8/8)
  - Media Architecture Suite: PASS (16/16)
  - Browser CDP & Live QA: PASS (0 console errors)
  - Responsive QA: PASS (5 viewports across all pages, 0 document-level overflow)
  - Business & Financial Logic: 100% Preserved
  - Protected Boundaries: ZERO modifications outside authorized scope



