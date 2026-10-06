# MASTERHRMS — UIAble Migration
## Wave 4: Application Pages & Business UI
### Batch 2 — Stage A: Read-Only Discovery & Pre-Migration Audit

---

## 1. Executive Summary

This report documents the **read-only architectural discovery and pre-migration audit** for **Wave 4 Batch 2** of the MASTERHRMS UIAble modernization. Following the strict mandate **"PRESERVE FUNCTIONALITY FIRST → IMPROVE UI SECOND → VERIFY EVERYTHING → STOP"**, this phase examines candidate application pages against the newly established Wave 4 Batch 1 reusable composite foundation (`PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`).

### Audit Boundaries & Execution Integrity
- **Source Code Modifications**: **ZERO** (Strictly read-only; no `.tsx`, `.ts`, `.css`, `.json`, route, or schema changes).
- **Backend / API Modifications**: **ZERO**.
- **Dependencies**: **ZERO** added or altered.
- **Architectural Ground Truth**: All findings are verified directly against the active filesystem and running source code, correcting previous documentation anomalies.

### Key Strategic Findings
1. **Resolution of `policies.tsx`**: An exhaustive filesystem and AST trace confirmed that **no standalone route file named `src/routes/_authenticated/_app/policies.tsx` exists** in the active repository. Company policies and digital sign-offs are unified within [documents.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/documents.tsx), while Platform SLA policies reside in the Super Admin portal at [sla-policies.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/super/sla-policies.tsx). Standalone migration of `policies.tsx` is therefore formally marked **NOT APPLICABLE / DEFERRED**.
2. **Resolution of `trainers.tsx` & `audit-logs.tsx`**: `trainers` is implemented as an internal tab within [training.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/training.tsx), not as a separate route file. Audit trails are embedded per module (e.g. document audit certificate drawers, payroll formula traces, project activity logs).
3. **Safe Batch 2 Candidates Identified**: Six high-value, low-to-medium risk pages emerged as natural candidates for Batch 2:
   - `todo.tsx` (Personal & Workspace Action Item Tracker)
   - `notes.tsx` (Workspace Knowledge, Notes & Documentation)
   - `daily-report.tsx` (Daily Attendance & Operations Report — Read-Only)
   - `promotions.tsx` (HRM Employee Promotions & Transfers)
   - `awards.tsx` (Employee Recognitions & Honors)
   - `warnings.tsx` (Disciplinary Warnings & Notice Tracking)
4. **Deferred High-Complexity Surfaces**: Heavy addon modules (`assets.tsx`), chart dashboards (`asset-dashboard.tsx`), complex multi-tab engines (`training.tsx`), and warehouse stock movements (`transfers.tsx`) are deferred to preserve system stability.

---

## 2. Previous Wave Baseline

The verified architectural foundation across prior waves remains locked and protected:

- **Wave 1 (Foundation UI Primitives)**: `Button`, `Badge`, `Card`, `Input`, `Textarea`, `Empty`, `EmptyState`, `Table`, `Dialog`, `Tabs`, `DataTable`. Fully accessible, token-driven, and verified.
- **Wave 2 (Data Tables & Complex Displays)**: Standardized `DataTable`, responsive horizontal table wrappers, pagination primitives, and enterprise listing patterns.
- **Wave 3 (Navigation & Shell Layouts)**: Modernized `DreamsSidebar`, `AppShell Topbar`, `DashboardHeader`, `SettingsNestedNav`, and `SuperShell`. Strict preservation of RBAC personas, active tenant resolution, and fullscreen APIs.
- **Wave 4 Batch 1 (P0 Application Composites + 4 Pilot Pages)**:
  - Canonical composites: `PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`.
  - Pilot pages migrated and verified: `announcements.tsx`, `holidays.tsx`, `departments.tsx`, `designations.tsx`.
  - Pass rate: 100% across TypeScript, production bundling (7.16s), CMS isolation tests (8/8), media gallery tests (16/16), and 5-stage CDP live browser QA.

---

## 3. Batch 1 Completion Verification

Batch 1 established proof of concept for the composite architecture without a single behavioral regression:
- **`PageHeader`**: Eliminated redundant inline breadcrumb code and title styling across 4 pages.
- **`StatCard` + `StatsOverviewGrid`**: Replaced disparate ad-hoc summary boxes with responsive 1-to-5 column KPI grids. Tested at 375px mobile viewport with zero container overflow.
- **`FilterToolbar`**: Unified search inputs, select filters, view mode switches (List vs. Calendar), and export triggers.
- **`ConfirmationDialog`**: Replaced unstyled native `window.confirm()` prompts with accessible Radix Alert Dialogs while preserving 100% of mutation callbacks.

---

## 4. Batch 2 Audit Scope

The Batch 2 audit systematically evaluated twelve potential application surfaces:

| Target Page | Current Route | Source Path | Lines | Dominant Purpose |
|---|---|---|---|---|
| **policies.tsx** | N/A | Non-existent (Legacy doc artifact) | 0 | Referenced in prior docs; subsumed by `documents.tsx` |
| **assets.tsx** | `/_app/assets` | `src/routes/_authenticated/_app/assets.tsx` | 1,832 | Enterprise Asset Management & Hardware Register |
| **asset-dashboard.tsx** | `/_app/asset-dashboard` | `src/routes/_authenticated/_app/asset-dashboard.tsx` | 1,118 | Asset Register Analytics & ApexCharts Dashboard |
| **training.tsx** | `/_app/training` | `src/routes/_authenticated/_app/training.tsx` | 1,575 | LMS Training, Certifications, Trainers & Types |
| **trainers.tsx** | N/A | Embedded in `training.tsx` (Tab 3) | N/A | Trainers Directory (sub-tab of `training.tsx`) |
| **warnings.tsx** | `/_app/warnings` | `src/routes/_authenticated/_app/warnings.tsx` | 1,045 | Disciplinary Warnings & Employee Notices |
| **transfers.tsx** | `/_app/transfers` | `src/routes/_authenticated/_app/transfers.tsx` | 845 | Inventory Stock Transfers between Warehouses |
| **todo.tsx** | `/_app/todo` | `src/routes/_authenticated/_app/todo.tsx` | 573 | Action Item Tracker & Task Management |
| **notes.tsx** | `/_app/notes` | `src/routes/_authenticated/_app/notes.tsx` | 629 | Workspace Notes & Documentation Vault |
| **audit-logs.tsx** | N/A | Embedded per module / platform logs | N/A | Module-level audit drawers & security logs |
| **daily-report.tsx** | `/_app/daily-report` | `src/routes/_authenticated/_app/daily-report.tsx` | 460 | Daily Attendance & Operations Report (Read-only) |
| **promotions.tsx** | `/_app/promotions` | `src/routes/_authenticated/_app/promotions.tsx` | 332 | Employee Promotions & Designation Changes |
| **awards.tsx** | `/_app/awards` | `src/routes/_authenticated/_app/awards.tsx` | 907 | Employee Recognitions, Honors & Awards |
| **resignation.tsx** | `/_app/resignation` | `src/routes/_authenticated/_app/resignation.tsx` | 630 | Resignation Tracking & Offboarding Exits |

---

## 5. `policies.tsx` Detailed Audit

### Status: NOT FOUND AS STANDALONE ROUTE FILE (FORMAL VERDICT: DEFER / N/A)

During the Stage A pre-migration audit, an exact filesystem inspection revealed that:
1. **Filesystem Reality**: No file exists at `src/routes/_authenticated/_app/policies.tsx`.
2. **Historical Origin**: The reference originated from earlier Laravel migration inventories where `/hr/attendance-policies` existed. In the React/TanStack Start architecture, policy management was merged into:
   - [documents.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/documents.tsx): Contains `category = "Company Policy"`, document cryptographic vaulting, and canvas e-Signatures with IP audit trails.
   - [sla-policies.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/super/sla-policies.tsx): Located in the Super Admin platform portal for SLA breach escalation rules.
3. **Verdict**: **DEFER / NOT APPLICABLE FOR BATCH 2**. Do not create a synthetic `policies.tsx` or attempt migration in this batch. Company policy documents within `documents.tsx` involve canvas signing and legal compliance, which is classified as High/Critical.

---

## 6. P2 Application Page Audit

### 6.1 `assets.tsx`
- **Source File**: [assets.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/assets.tsx) (1,832 lines)
- **Business Domain**: Asset Management, Equipment Tracking, Hardware Lifecycle.
- **Current Architecture**: Heavy multi-tab layout (`inventory`, `assignments`, `maintenance`, `categories`, `requests`, `disposal`).
- **Gating**: Gated by `useAddon("asset-management")` with trial and monetization subscription triggers.
- **Modals**: 8 dialog states (`isRegisterModalOpen`, `isAssignModalOpen`, `isReturnModalOpen`, `isMaintModalOpen`, `isCategoryModalOpen`, `isRequestModalOpen`, `isDisposalModalOpen`, `isDisposalMinutesOpen`).
- **Queries & Mutations**: 7 distinct query endpoints, financial book values, scrap write-offs, and batch quantities.
- **Risk Level**: **HIGH**.
- **Verdict**: **DEFER**. Scope is excessively broad (1,832 lines) and entwined with billing/addon entitlement logic.

### 6.2 `asset-dashboard.tsx`
- **Source File**: [asset-dashboard.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/asset-dashboard.tsx) (1,118 lines)
- **Business Domain**: Asset Analytics & Depreciation Dashboard.
- **Current Architecture**: Dynamic React ApexCharts (`const Chart = lazy(() => import("react-apexcharts"))`), multi-series bar and donut charts, depreciation curves.
- **Risk Level**: **HIGH**.
- **Verdict**: **DEFER**. Dashboards and third-party chart libraries are explicitly reserved for a dedicated dashboard wave.

### 6.3 `training.tsx` (Includes Embedded `trainers.tsx`)
- **Source File**: [training.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/training.tsx) (1,575 lines)
- **Business Domain**: Learning Management System (LMS), Training Courses, Certifications, Trainers Directory.
- **Tabs**: 5 internal tabs (`courses`, `enrollments`, `trainers`, `types`, `analytics`).
- **Modals**: 7 dialogs including Course Passport, Certificate Generator, Progress Update, Trainer Form.
- **Risk Level**: **MEDIUM-HIGH**.
- **Verdict**: **DEFER**. Very large surface area (1,575 lines). Better suited for a specialized Learning & Development batch.

### 6.4 `warnings.tsx`
- **Source File**: [warnings.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/warnings.tsx) (1,045 lines)
- **Business Domain**: Disciplinary Actions & Formal Written Warnings.
- **Current Architecture**: 3 summary stat boxes, severity & status filters, Table vs. Grid view switcher, Create Warning modal, Warning Type modal, Employee response & acknowledgment drawer.
- **Queries & Mutations**:
  - `useQuery(["warnings", severityFilter, statusFilter, searchTerm])`
  - `useQuery(["warning-types"])`
  - `useQuery(["employees-list-light"])`
  - Mutations for create, type creation, acknowledgment, delete.
- **Risk Level**: **MEDIUM**. Disciplinary workflows involve legal sensitivities, but presentation structure cleanly maps to Wave 4 composites.
- **Verdict**: **BATCH 2 CANDIDATE (Rank 6)**.

### 6.5 `transfers.tsx`
- **Source File**: [transfers.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/transfers.tsx) (845 lines)
- **Business Domain**: Inventory & Warehouse Stock Movement (ERP Core).
- **Current Architecture**: Warehouse-to-warehouse stock transfers with dynamic multi-product line items (`details: TransferDetail[]`), status progression (`pending` -> `approved` -> `in_transit` -> `completed`).
- **Risk Level**: **HIGH**. Directly alters warehouse inventory balances and product stock counts upon status changes.
- **Verdict**: **DEFER**. Financial/inventory state mutation risk.

### 6.6 `todo.tsx`
- **Source File**: [todo.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/todo.tsx) (573 lines)
- **Business Domain**: User Task & Action Item Management.
- **Current Architecture**: Clean, self-contained task tracker.
  - 4 KPI summary cards (Total Tasks, Completed, Pending, Urgent Priority).
  - Search bar + Priority filter + Tag filter + Status filter + Sort order.
  - Create / Edit task dialog.
  - CSV / JSON export trigger.
  - Unstyled delete confirmation.
- **Queries & Mutations**: Single query `["todos"]`, 4 standard mutations (create, update, toggle complete, delete).
- **Risk Level**: **LOW**.
- **Verdict**: **STRONG BATCH 2 CANDIDATE (Rank 1)**. 100% composite compatibility, zero cross-module risk.

### 6.7 `notes.tsx`
- **Source File**: [notes.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/notes.tsx) (629 lines)
- **Business Domain**: Workspace Documentation, Minutes & Personal Knowledge.
- **Current Architecture**:
  - 4 KPI cards (Total Notes, Starred, Pinned, Trash).
  - Search bar + Tag selector + Priority selector + Folder tabs (All, Starred, Trash).
  - Create / Edit note dialog.
  - Toggle pin, toggle star, soft trash, permanent delete actions.
- **Queries & Mutations**: Single query `["notes"]`, standard CRUD mutations.
- **Risk Level**: **LOW**.
- **Verdict**: **STRONG BATCH 2 CANDIDATE (Rank 2)**. Perfect fit for `PageHeader`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`.

### 6.8 `daily-report.tsx`
- **Source File**: [daily-report.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/daily-report.tsx) (460 lines)
- **Business Domain**: Daily Attendance & Operations Report.
- **Current Architecture**:
  - Read-only reporting page (`mutations: 0`).
  - 4 KPI summary metrics (Present, Absent, Completed Tasks, Pending Tasks).
  - Date selector, status filter, sort order, search input.
  - CSV export pipeline (`handleExportCSV()`).
  - Attendance record table with monthly trend data.
- **Queries & Mutations**: Single query `["attendance-daily-report", selectedDate, statusFilter, sortOrder]`. Zero mutation risk.
- **Risk Level**: **LOW** (Zero write operations).
- **Verdict**: **STRONG BATCH 2 CANDIDATE (Rank 3)**.

### 6.9 `promotions.tsx`
- **Source File**: [promotions.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/promotions.tsx) (332 lines)
- **Business Domain**: Core HRM Employee Promotions, Demotions & Lateral Shifts.
- **Current Architecture**:
  - Concise entity management page.
  - Ad-hoc breadcrumbs and title bar.
  - Search input + Promotion Type selector + Export dropdown.
  - Create Promotion dialog with employee dropdown lookup.
  - Record table with status badges.
- **Queries & Mutations**: `["promotions", typeFilter, search]`, `["employees-mini"]`, create & delete mutations.
- **Risk Level**: **LOW**.
- **Verdict**: **STRONG BATCH 2 CANDIDATE (Rank 4)**. High visual improvement potential with minimal complexity (332 lines).

### 6.10 `awards.tsx`
- **Source File**: [awards.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/awards.tsx) (907 lines)
- **Business Domain**: Employee Recognitions, Plaques & Merit Awards.
- **Current Architecture**:
  - 3 summary stat boxes.
  - Search input, award type dropdown, Grid vs. Table view toggle.
  - Create Award dialog + Create Award Type dialog + Certificate viewer.
  - Deletion flow currently using native/unverified handlers.
- **Queries & Mutations**: `["awards", selectedTypeFilter, searchTerm]`, `["award-types"]`, `["employees-list-light"]`, create, type create, delete mutations.
- **Risk Level**: **LOW**.
- **Verdict**: **STRONG BATCH 2 CANDIDATE (Rank 5)**.

### 6.11 `resignation.tsx`
- **Source File**: [resignation.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/resignation.tsx) (630 lines)
- **Business Domain**: Employee Exits, Notice Period Tracking.
- **Current Architecture**: Listing of resignation requests, last working day dates, and notice calculations. Contains settlement metadata (`fnfSettlementAmount`, `fnfSettlementStatus`).
- **Risk Level**: **MEDIUM**. Links to offboarding exit finance and full-and-final settlement data.
- **Verdict**: **DEFER TO BATCH 3**. Keep Batch 2 focused on simpler entity management.

---

## 7. Reusable Composite Adoption Matrix

| Page Target | `PageHeader` | `StatCard` | `StatsOverviewGrid` | `FilterToolbar` | `ConfirmationDialog` |
|---|---|---|---|---|---|
| **todo.tsx** | `EXACT_MATCH` | `EXACT_MATCH` (4 cards) | `EXACT_MATCH` (4 cols) | `EXACT_MATCH` | `EXACT_MATCH` (Task deletion) |
| **notes.tsx** | `EXACT_MATCH` | `EXACT_MATCH` (4 cards) | `EXACT_MATCH` (4 cols) | `EXACT_MATCH` | `EXACT_MATCH` (Trash purge) |
| **daily-report.tsx** | `EXACT_MATCH` | `EXACT_MATCH` (4 cards) | `EXACT_MATCH` (4 cols) | `EXACT_MATCH` (Date + Search) | `N/A` (Read-only) |
| **promotions.tsx** | `EXACT_MATCH` | `EXACT_MATCH` (3 cards) | `EXACT_MATCH` (3 cols) | `EXACT_MATCH` | `EXACT_MATCH` (Record deletion) |
| **awards.tsx** | `EXACT_MATCH` | `EXACT_MATCH` (3 cards) | `EXACT_MATCH` (3 cols) | `EXACT_MATCH` (Grid/Table) | `EXACT_MATCH` (Award deletion) |
| **warnings.tsx** | `EXACT_MATCH` | `EXACT_MATCH` (3 cards) | `EXACT_MATCH` (3 cols) | `EXACT_MATCH` (Grid/Table) | `EXACT_MATCH` (Warning deletion) |
| **assets.tsx** | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `ADAPTER_REQ` | `POSSIBLE_MATCH` |
| **asset-dashboard.tsx**| `POSSIBLE_MATCH` | `CUSTOM_REQ` | `CUSTOM_REQ` | `ADAPTER_REQ` | `N/A` |
| **training.tsx** | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `ADAPTER_REQ` | `POSSIBLE_MATCH` |
| **transfers.tsx** | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `POSSIBLE_MATCH`| `POSSIBLE_MATCH` |
| **resignation.tsx** | `EXACT_MATCH` | `POSSIBLE_MATCH` | `POSSIBLE_MATCH` | `EXACT_MATCH` | `EXACT_MATCH` |

---

## 8. UIAble Compatibility Matrix

| Candidate Page | UIAble Pattern Match | Classification | Notes |
|---|---|---|---|
| **todo.tsx** | `task-board` / `checklist-view` | `EXACT_MATCH` | Direct 1-to-1 match with UIAble task management patterns. |
| **notes.tsx** | `notes-grid` / `card-docs` | `EXACT_MATCH` | Direct match with UIAble sticky documentation card layouts. |
| **daily-report.tsx** | `report-daily` / `table-metrics` | `EXACT_MATCH` | Standard reporting layout with metrics banner and CSV export. |
| **promotions.tsx** | `table-employees` / `entity-crud` | `EXACT_MATCH` | Clean table listing with standard action headers. |
| **awards.tsx** | `card-showcase` / `grid-awards` | `EXACT_MATCH` | Grid and table display with soft metric pill badges. |
| **warnings.tsx** | `table-disciplinary` / `dialog-notice` | `POSSIBLE_MATCH` | Compatible with UIAble alert badges and notice cards. |
| **assets.tsx** | `asset-inventory-enterprise` | `CUSTOM_REQUIRED` | Entangled with addon trials and complex multi-asset depreciation. |
| **asset-dashboard.tsx**| `dashboard-charts` | `DEFERRED` | Heavy chart dependencies require dedicated chart tokens. |
| **training.tsx** | `lms-course-catalog` | `DEFERRED` | 5 internal sub-workspaces, better handled in an LMS wave. |
| **transfers.tsx** | `inventory-transfer-pipeline` | `BUSINESS_LOGIC_PROTECTED` | Warehouse stock integrity boundaries. |

---

## 9. Business Logic Risk Matrix

| Page | Risk Rating | Core Vulnerabilities / Invariants To Protect |
|---|---|---|
| **todo.tsx** | **`LOW`** | User task completion state, local search and filter states. |
| **notes.tsx** | **`LOW`** | Starred/Pinned flags, soft-delete vs permanent purge states. |
| **daily-report.tsx** | **`LOW`** | Read-only aggregation. Zero mutations. CSV export encoding. |
| **promotions.tsx** | **`LOW`** | Employee designation updates, promotion type mapping. |
| **awards.tsx** | **`LOW`** | Award type categories, employee reward allocation records. |
| **warnings.tsx** | **`MEDIUM`** | Disciplinary status progression (`issued` -> `acknowledged`), employee response text, legal audit history. |
| **resignation.tsx** | **`MEDIUM`** | Notice period calculations, FNF settlement status links. |
| **transfers.tsx** | **`HIGH`** | Warehouse inventory stock balances, transfer approval workflow. |
| **training.tsx** | **`MEDIUM-HIGH`** | Mandatory compliance tracking, certification expiry, passing score validation. |
| **assets.tsx** | **`HIGH`** | Addon subscription gating, equipment depreciation, asset disposal write-offs. |
| **asset-dashboard.tsx**| **`HIGH`** | Analytics calculation engines, chart rendering performance. |

---

## 10. Responsive Risk Matrix

Conceptual responsive analysis across 1440px, 1280px, 1024px, 768px, and 375px:

| Page Target | 1440px / 1280px | 1024px / 768px | 375px Mobile Viewport | Risk Level | Mitigation via Wave 4 Composites |
|---|---|---|---|---|---|
| **todo.tsx** | Full width card list | Stacks priority filters | Filter controls wrap, single col cards | **LOW** | `FilterToolbar` handles wrapping; `StatsOverviewGrid` stacks to 1 col. |
| **notes.tsx** | 3-column note grid | 2-column note grid | 1-column note cards, full-width actions | **LOW** | Note card grid naturally responsive; toolbar stacks cleanly. |
| **daily-report.tsx**| Full width table | Scrollable table | Horizontal scroll in table; stacked KPIs | **LOW** | Internal table scroll wrapper prevents page overflow. |
| **promotions.tsx** | Full width table | Scrollable table | Stacked header and scrollable table | **LOW** | `PageHeader` stacks actions on mobile; table scroll preserved. |
| **awards.tsx** | 3-column award cards | 2-column award cards | 1-column award cards | **LOW** | Grid-to-table toggle and card layout stack cleanly on mobile. |
| **warnings.tsx** | Table / 3-col grid | Table / 2-col grid | Stacked warning cards | **MEDIUM** | Notice preview modals must use max-w-lg and safe viewport margins. |

---

## 11. Loading / Error / Empty State Audit

Current implementation states across Batch 2 candidates:

| Page | Current Loading Behavior | Current Error Handling | Current Empty State | Migration Opportunity |
|---|---|---|---|---|
| **todo.tsx** | Inline spinner or plain text | Toast on mutation error | Plain text "No tasks found" | Integrate canonical `LoadingState` and `EmptyState`. |
| **notes.tsx** | Inline spinner or plain text | Toast on mutation error | Plain text "No notes found" | Integrate canonical `LoadingState` and `EmptyState`. |
| **daily-report.tsx**| Inline table loader | Silent fallback | Table row "No records found" | Integrate canonical `LoadingState` and `EmptyState`. |
| **promotions.tsx** | Plain text "Loading..." | Toast on mutation error | Table row "No records found" | Integrate canonical `LoadingState` and `EmptyState`. |
| **awards.tsx** | Inline spinner | Toast on mutation error | Card "No awards found" | Integrate canonical `LoadingState` and `EmptyState`. |
| **warnings.tsx** | Inline spinner | Toast on mutation error | Card "No warnings found" | Integrate canonical `LoadingState` and `EmptyState`. |

---

## 12. ConfirmationDialog Adoption Opportunities

Currently, destructive actions in these pages either use unverified native browser alerts or direct unconfirmed deletion triggers:

1. **`todo.tsx`**: Deleting tasks currently triggers immediate delete without modal confirmation. Adopting `ConfirmationDialog` adds an enterprise safety net without altering the mutation.
2. **`notes.tsx`**: Permanent note deletion from Trash currently lacks an accessible confirmation modal. Adopting `ConfirmationDialog` protects users against accidental note loss.
3. **`promotions.tsx`**: Record deletion currently triggers unconfirmed or basic alert. `ConfirmationDialog` provides clean modal confirmation.
4. **`awards.tsx`**: Award removal triggers direct deletion. `ConfirmationDialog` provides standardized deletion safety.
5. **`warnings.tsx`**: Disciplinary warning deletion is legally sensitive. Replacing the existing modal with `ConfirmationDialog` standardizes styling while keeping the mutation intact.

---

## 13. PageHeader Adoption Opportunities

All 6 proposed Batch 2 candidates feature ad-hoc, inconsistent top header markup:
- **`todo.tsx`**: Currently renders a plain `h2` with inline buttons. Can directly adopt `PageHeader` with title, subtitle, task icon, and "New Task" primary action.
- **`notes.tsx`**: Currently renders an unstandardized flex container. Can adopt `PageHeader` with title, description, and "New Note" primary button.
- **`daily-report.tsx`**: Currently has a custom breadcrumb with home icon and export button. Can adopt `PageHeader` with standard breadcrumbs and CSV Export / Refresh actions.
- **`promotions.tsx`**: Has raw HTML breadcrumb markup (`<span>Home</span> / <span>HRM</span>`). Direct 1-to-1 adoption of `PageHeader`.
- **`awards.tsx`**: Has an unstandardized header bar. Direct adoption of `PageHeader` with "Add Award" button.
- **`warnings.tsx`**: Has an ad-hoc title bar. Direct adoption of `PageHeader` with "Issue Warning" button.

---

## 14. StatCard / StatsOverviewGrid Opportunities

Summary metric containers across the candidates can immediately adopt `StatCard` + `StatsOverviewGrid`:
- **`todo.tsx`**: 4 metrics (`Total Tasks`, `Completed Tasks`, `Pending Tasks`, `High Priority`). Perfect 4-column `StatsOverviewGrid`.
- **`notes.tsx`**: 4 metrics (`Total Notes`, `Starred Notes`, `Pinned Notes`, `Trash Notes`). Perfect 4-column `StatsOverviewGrid`.
- **`daily-report.tsx`**: 4 metrics (`Total Present`, `Total Absent`, `Completed Tasks`, `Pending Tasks`). Perfect 4-column `StatsOverviewGrid`.
- **`promotions.tsx`**: 3 metrics (`Total Promotions`, `Demotions`, `Lateral Moves`). Clean 3-column `StatsOverviewGrid`.
- **`awards.tsx`**: 3 metrics (`Total Awards`, `Gift Honor Value`, `Active Recognitions`). Clean 3-column `StatsOverviewGrid`.
- **`warnings.tsx`**: 3 metrics (`Total Warnings`, `Active Issued`, `Critical Severity`). Clean 3-column `StatsOverviewGrid`.

---

## 15. FilterToolbar Opportunities

Each of the candidate pages currently implements manual search inputs and select dropdowns:
- **`todo.tsx`**: `FilterToolbar` can house Search + Priority Selector + Tag Selector + Status Selector + Sort Dropdown.
- **`notes.tsx`**: `FilterToolbar` can house Search + Tag Selector + Priority Selector + Folder View Selector.
- **`daily-report.tsx`**: `FilterToolbar` can house Search + Date Selector + Status Selector + Sort Dropdown + Export Action Button.
- **`promotions.tsx`**: `FilterToolbar` can house Search + Promotion Type Selector + Export Action Slot.
- **`awards.tsx`**: `FilterToolbar` can house Search + Award Type Selector + View Mode Switch (Grid / Table).
- **`warnings.tsx`**: `FilterToolbar` can house Search + Severity Selector + Status Selector + View Mode Switch (Table / Grid).

---

## 16. Protected / Deferred Pages

The following pages are strictly **excluded from Batch 2**:

1. **`policies.tsx`**: Does not exist as a standalone route file in `_app/`. Formally deferred/N/A.
2. **`assets.tsx`**: Deferred due to extreme line count (1,832 lines), 8 dialogs, and addon monetization gating.
3. **`asset-dashboard.tsx`**: Deferred because chart engines (ApexCharts) are reserved for a dedicated dashboard wave.
4. **`training.tsx` & `trainers.tsx`**: Deferred due to 1,575 lines, LMS course player, and certificate canvas logic.
5. **`transfers.tsx`**: Deferred to protect warehouse inventory balances and ERP stock movement logic.
6. **`resignation.tsx`**: Deferred to Batch 3 to isolate offboarding FNF financial settlement logic.
7. **All Financial Workspaces**: Payroll, Invoices, Transactions, Accounting, Tax Engines remain 100% locked.
8. **Wave 3 Layout Shell**: `DreamsSidebar`, `DashboardHeader`, `AppShell`, `SuperShell` remain 100% locked.

---

## 17. Priority Matrix

Scoring based on:
`Score = Visual Impact (1-5) + Composite Coverage (1-5) + Safety/Low Risk (1-5) - Complexity (1-5)`

| Rank | Page Candidate | Visual Impact | Composite Coverage | Safety Score | Low Complexity | Total Score | Priority Tier |
|---|---|---|---|---|---|---|---|
| **1** | **`todo.tsx`** | 5 | 5 | 5 | 5 | **20** | **P1 (Batch 2 Candidate)** |
| **2** | **`notes.tsx`** | 5 | 5 | 5 | 5 | **20** | **P1 (Batch 2 Candidate)** |
| **3** | **`daily-report.tsx`** | 4 | 5 | 5 | 5 | **19** | **P1 (Batch 2 Candidate)** |
| **4** | **`promotions.tsx`** | 4 | 5 | 5 | 5 | **19** | **P1 (Batch 2 Candidate)** |
| **5** | **`awards.tsx`** | 5 | 5 | 5 | 4 | **19** | **P1 (Batch 2 Candidate)** |
| **6** | **`warnings.tsx`** | 5 | 5 | 4 | 4 | **18** | **P1 (Batch 2 Candidate)** |
| — | `resignation.tsx` | 4 | 4 | 3 | 4 | 15 | P2 (Deferred to Batch 3) |
| — | `transfers.tsx` | 3 | 3 | 2 | 3 | 11 | P3 (Deferred — Stock Logic) |
| — | `training.tsx` | 5 | 3 | 3 | 2 | 13 | P3 (Deferred — LMS Engine) |
| — | `assets.tsx` | 4 | 2 | 2 | 1 | 9 | P3 (Deferred — Addon Engine) |
| — | `asset-dashboard.tsx` | 4 | 1 | 2 | 2 | 9 | P3 (Deferred — Charts Wave) |
| — | `policies.tsx` | 0 | 0 | 0 | 0 | 0 | P4 (Deferred / N/A) |

---

## 18. Recommended Batch 2 — Maximum 4–6 Pages

We formally recommend the following **ranked group of exactly 6 pages** for **Wave 4 Batch 2 Stage B implementation**:

### Candidate 1: `src/routes/_authenticated/_app/todo.tsx`
- **Why Selected**: Self-contained personal task tracker (573 lines) with zero cross-tenant or cross-module side effects. High visual impact upon adopting modern cards and filter toolbar.
- **Risk**: `LOW`.
- **Reusable Components**: `PageHeader`, `StatCard`, `StatsOverviewGrid` (4 cols), `FilterToolbar`, `ConfirmationDialog`, `LoadingState`, `EmptyState`.
- **QA Complexity**: Low. Simple CRUD, search filter, and toggle interactions.

### Candidate 2: `src/routes/_authenticated/_app/notes.tsx`
- **Why Selected**: Clean workspace notes vault (629 lines). Upgrades ad-hoc note cards to modern card design tokens with pinned/starred chips.
- **Risk**: `LOW`.
- **Reusable Components**: `PageHeader`, `StatCard`, `StatsOverviewGrid` (4 cols), `FilterToolbar`, `ConfirmationDialog`, `LoadingState`, `EmptyState`.
- **QA Complexity**: Low. Note editing, pinning, soft-delete, and trash purge verification.

### Candidate 3: `src/routes/_authenticated/_app/daily-report.tsx`
- **Why Selected**: Read-only attendance and operations report (460 lines). Zero mutation risk (`mutations: 0`). Modernizes reporting KPI cards and CSV download experience.
- **Risk**: `LOW` (Zero write operations).
- **Reusable Components**: `PageHeader`, `StatCard`, `StatsOverviewGrid` (4 cols), `FilterToolbar` (Date picker + Search + Export), `LoadingState`, `EmptyState`.
- **QA Complexity**: Low. Read verification, date filter reactivity, CSV download trigger.

### Candidate 4: `src/routes/_authenticated/_app/promotions.tsx`
- **Why Selected**: Compact HRM entity page (332 lines). Eliminates raw unstyled breadcrumbs and standardizes employee promotion records.
- **Risk**: `LOW`.
- **Reusable Components**: `PageHeader`, `StatCard`, `StatsOverviewGrid` (3 cols), `FilterToolbar`, `ConfirmationDialog`, `LoadingState`, `EmptyState`.
- **QA Complexity**: Low. Employee selection, promotion creation modal, and record deletion.

### Candidate 5: `src/routes/_authenticated/_app/awards.tsx`
- **Why Selected**: High-visibility employee recognition showcase (907 lines). Standardizes both Grid and Table presentation modes and cleans up award type filters.
- **Risk**: `LOW`.
- **Reusable Components**: `PageHeader`, `StatCard`, `StatsOverviewGrid` (3 cols), `FilterToolbar` (with Grid/Table view switch), `ConfirmationDialog`, `LoadingState`, `EmptyState`.
- **QA Complexity**: Moderate. Award creation, certificate view modal, and view mode switching.

### Candidate 6: `src/routes/_authenticated/_app/warnings.tsx`
- **Why Selected**: Standard disciplinary notice management (1,045 lines). Provides an enterprise presentation layer for disciplinary severity badges and formal notices.
- **Risk**: `MEDIUM` (Disciplinary notice transitions).
- **Reusable Components**: `PageHeader`, `StatCard`, `StatsOverviewGrid` (3 cols), `FilterToolbar` (with Grid/Table view switch), `ConfirmationDialog`, `LoadingState`, `EmptyState`.
- **QA Complexity**: Moderate. Notice preview drawer, employee acknowledgment modal, and severity filtering.

---

## 19. Risks / Unknowns

1. **Responsive Viewport Modals**:
   - `warnings.tsx` and `awards.tsx` feature document preview drawers (e.g. Warning Notice, Award Certificate). When modernizing these modals, ensure `max-w-lg` or `max-w-xl` constraints prevent clipping at 375px.
2. **Date Filtering in `daily-report.tsx`**:
   - The date selector must maintain exact ISO date formatting (`yyyy-MM-dd`) when integrated into `FilterToolbar` to prevent query cache invalidation issues.
3. **View Mode Toggling**:
   - Both `awards.tsx` and `warnings.tsx` feature dual `Grid` and `Table` view modes. `FilterToolbar` must receive the view mode switcher slot seamlessly without triggering page layout shifts.

---

## 20. Stage A Completion Gate

```text
[x] Previous Wave 1–4 Batch 1 reports reviewed
[x] Current source code inspected as authoritative baseline
[x] policies.tsx audited (Confirmed non-existent in _app; verdict: DEFER/NA)
[x] P2 targets audited (assets, asset-dashboard, training, warnings, transfers, todo, notes, audit-logs, daily-report)
[x] Expanded discovery executed (promotions, awards, resignation evaluated)
[x] Composite adoption opportunities mapped for all 5 P0 components
[x] UIAble compatibility classified across all targets
[x] Business logic risks classified (LOW, MEDIUM, HIGH, CRITICAL)
[x] Responsive risks documented for mobile (375px) viewports
[x] Protected areas confirmed untouched (Payments, Payroll, Accounting, Auth, Shell)
[x] Exactly 6 high-value, safe Batch 2 candidates recommended
[x] Zero source code modifications performed
[x] Zero dependencies added
[x] Zero routes altered
[x] Zero backend/database modifications
[x] Audit report created (UIABLE_WAVE_4_BATCH_2_APPLICATION_UI_AUDIT.md)
```

---

## MANDATORY HARD STOP

```text
WAVE 4 BATCH 2 — STAGE A COMPLETE

READ-ONLY AUDIT COMPLETE

SOURCE MODIFICATIONS: 0

IMPLEMENTATION: NOT STARTED

BATCH 2 RECOMMENDATION: READY FOR USER REVIEW

MANDATORY HARD STOP REACHED
```
