# MASTERHRMS — UIAble Migration
## Wave 4: Application Pages & Business UI
### Batch 3 — Stage A: Read-Only Application UI Discovery & Pre-Migration Audit

---

## 1. Executive Summary

This document represents the formal **Stage A: Read-Only Discovery, Risk Classification & Pre-Migration Audit** for **Wave 4 Batch 3** of the MASTERHRMS Enterprise Modernization initiative. Following the mandatory architectural doctrine:

> **"PRESERVE FUNCTIONALITY FIRST → IMPROVE UI SECOND → VERIFY EVERYTHING → STOP"**

This phase audits the next set of candidate application surfaces across the enterprise HRMS/ERP platform. In strict accordance with the **Absolute Execution Rule**, this is an **AUDIT-ONLY** phase:
- **Zero source code modifications** were made (no `.tsx`, `.ts`, `.css`, configuration, routing, schema, or API files modified).
- **Zero dependencies** were added or removed.
- **Zero business logic, queries, mutations, RBAC, tenant isolation, accounting, inventory calculations, or payroll logic** were touched.
- All evaluations derive from direct AST inspection, line-by-line review of the active codebase, and live test verifications.

### Strategic Key Findings
1. **Architectural Verification of Non-Existent Pages**:
   - `policies.tsx` does **not** exist as an independent route. Company policy documents and e-Signatures reside in [documents.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/documents.tsx) (Category `"Company Policy"` with canvas signature pad and IP audit certificates). Platform SLA policies reside at [sla-policies.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/super/sla-policies.tsx).
   - `trainers.tsx` does **not** exist as a standalone page; it is embedded as **Tab 4 (`trainers`)** within [training.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/training.tsx).
   - `audit-logs.tsx` does **not** exist as a standalone route; audit trails are embedded contextual drawers and tab engines.
2. **Evaluation of Primary Targets**:
   - **`assets.tsx` (2,178 lines)**: **DEFERRED**. Contains 7 enterprise sub-tabs, 8 modals, `useAddon("asset-management")` billing/trial monetization gating, and financial asset disposal scrap accounting.
   - **`asset-dashboard.tsx` (1,117 lines)**: **DEFERRED**. A dedicated analytics dashboard rendering dynamic ApexCharts (`react-apexcharts`) area and bar trends. Reserved for a future specialized `Wave 4 Dashboard Modernization` phase.
   - **`training.tsx` (1,678 lines)**: **DEFERRED**. Comprehensive LMS with 6 internal tabs (including Trainers directory), course passports, digital verified certificate viewer, and multi-step curriculum builder.
   - **`transfers.tsx` (844 lines)**: **DEFERRED / HIGH-RISK PROTECTED**. Multi-warehouse stock movement with physical inventory ledger mutations, stock availability assertions, in-transit dispatch, and warehouse balance recalculations.
   - **`resignation.tsx` (797 lines)**: **GROUP B (CONTROLLED CANDIDATE)**. Tracks employee voluntary resignations, notice periods, and clearance statuses. High compatibility with `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`, but requires strict isolation of offboarding/FnF hooks.
3. **Identification of Safer Alternative Candidates (Group A)**:
   - [probation.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/probation.tsx) (410 lines): Employee probation periods and performance evaluations. Zero financial, payroll, or inventory risk.
   - [work-from-home.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/work-from-home.tsx) (416 lines): Remote work requests and approvals. Clean CRUD with zero financial coupling.
   - [shift-swap-requests.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/shift-swap-requests.tsx) (541 lines): Peer shift exchange workflow. Completely isolated operational scheduling.
   - [call-history.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/call-history.tsx) (553 lines): Telephony communication registry. Read-only log with metadata inspection.

---

## 2. Audit Scope

The Stage A audit systematically analyzed the active codebase across multiple dimensions:
- **Component File Sizes & AST Depth**: Line counts, cyclomatic complexity, component nesting.
- **Enterprise Tabs & Routing State**: Tab triggers, persistent query parameters, route guards.
- **Data Query & Mutation Dependencies**: React Query keys, cache invalidation graphs, optimistic updates, payload structures.
- **Modals & Overlay State**: Dialog triggers, sheet drawers, alert confirmation bindings.
- **Business Logic Protection Boundaries**: Tenant isolation, RBAC role checks, addon entitlement licensing, inventory balances, financial scrap accounting.
- **UIAble Composite Compatibility**: Assessment against canonical Wave 4 composites (`PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`).
- **Multi-Device Responsive Breakpoints**: 1440px (Desktop Large), 1280px (Desktop), 1024px (Tablet Landscape), 768px (Tablet Portrait), 375px (Mobile Portrait).

---

## 3. Previous Wave Baseline

The enterprise system has successfully completed and verified:
- **Wave 1 (Foundation UI Primitives)**: 11 components modernized and unified ([button.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/button.tsx), [badge.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/badge.tsx), [card.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/card.tsx), [input.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/input.tsx), [textarea.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/textarea.tsx), [table.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/table.tsx), [dialog.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dialog.tsx), [tabs.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/tabs.tsx), [empty.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/empty.tsx), [empty-state.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/system-states/empty-state.tsx), [data-table.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/data-table.tsx)).
- **Wave 2 (Data Tables & Complex Displays)**: DataTable backward compatibility, pagination, responsive overflow wrappers.
- **Wave 3 (Navigation & Shell Layouts)**: Modernized [dreams-sidebar.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/dreams-sidebar.tsx), [dashboard-header.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/dashboard-header.tsx), [settings-nested-nav.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/settings/settings-nested-nav.tsx), AppShell (`_app/route.tsx`), Super Admin Shell (`super/route.tsx`).
- **Wave 4 Batch 1 (P0 Application UI)**: Created canonical composites (`PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`) and migrated 4 core pages: `announcements.tsx`, `holidays.tsx`, `departments.tsx`, `designations.tsx`.
- **Wave 4 Batch 2 (P2 Low-Risk Application UI)**: Migrated 6 pages: `todo.tsx`, `notes.tsx`, `daily-report.tsx`, `promotions.tsx`, `awards.tsx`, `warnings.tsx`.
- **Canonical Media Gallery & Settings Architecture**: Dedicated media library routes, tenant-isolated media service, and 16/16 passing vitest tests.

---

## 4. Current Repository Baseline

Exact filesystem and Git metrics verified at the start of Batch 3 Stage A:
- **Portals / Dashboards**: 10 distinct portals/dashboards.
- **Active Route Files**: 215 route files in `src/routes/`.
- **Tenant Application Routes (`_app/*.tsx`)**: 105 distinct enterprise application pages.
- **Frontend Components**: 584 catalogued components in `src/components/`.
- **Wave 1–4 Cumulative Registry Entries**: 59 evaluated and categorized items.
- **Automated Test Health**: 8/8 CMS tenant host isolation tests passing, 16/16 canonical media gallery tests passing.
- **Working Tree Cleanliness**: 100% clean on `origin/main` commit `9a5488441`.

---

## 5. Target Inventory

| Page File | Route URI | Source Path | Lines | Dominant Responsibility |
|---|---|---|---:|---|
| **assets.tsx** | `/_app/assets` | `src/routes/_authenticated/_app/assets.tsx` | 2,178 | Enterprise Hardware & IT Asset Lifecycle Management |
| **asset-dashboard.tsx** | `/_app/asset-dashboard` | `src/routes/_authenticated/_app/asset-dashboard.tsx` | 1,117 | Asset Register Analytics, Depreciation & ApexCharts |
| **training.tsx** | `/_app/training` | `src/routes/_authenticated/_app/training.tsx` | 1,678 | LMS Courses, Enrollments, Trainers & Digital Certificates |
| **transfers.tsx** | `/_app/transfers` | `src/routes/_authenticated/_app/transfers.tsx` | 844 | Multi-Warehouse Stock Transfers & In-Transit Ledger |
| **resignation.tsx** | `/_app/resignation` | `src/routes/_authenticated/_app/resignation.tsx` | 797 | Voluntary Resignations, Notice Periods & Separation |
| **probation.tsx** | `/_app/probation` | `src/routes/_authenticated/_app/probation.tsx` | 410 | Employee Probation Tracking & Evaluations (Alternative) |
| **work-from-home.tsx** | `/_app/work-from-home` | `src/routes/_authenticated/_app/work-from-home.tsx` | 416 | Remote Work Attendance Requests & Approvals (Alternative) |
| **shift-swap-requests.tsx** | `/_app/shift-swap-requests` | `src/routes/_authenticated/_app/shift-swap-requests.tsx` | 541 | Peer-to-Peer Shift Exchange Requests (Alternative) |
| **call-history.tsx** | `/_app/call-history` | `src/routes/_authenticated/_app/call-history.tsx` | 553 | Telephony Communication Records & CRM Calls (Alternative) |
| **setup-notes.tsx** | `/_app/setup-notes` | `src/routes/_authenticated/_app/setup-notes.tsx` | 247 | Static 2FA Login & Security Setup Guide (Alternative) |

---

## 6. `assets.tsx` Audit

### 6.1 Architectural Complexity
- **Source**: [assets.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/assets.tsx) (2,178 lines).
- **Tabs (7)**:
  1. `my-assets`: Employee Self-Service allocated equipment and hardware request form.
  2. `inventory`: Registered asset inventory, batch lots, location tagging, and status filters.
  3. `requests`: Pending equipment requisitions with admin approval/rejection.
  4. `categories`: Category management with straight-line depreciation rate definitions.
  5. `disposals`: Write-off batches, disposal committee minutes, and salvage book values.
  6. `reports`: 4 pre-calculated operational reports (Asset Register, Depreciation, Disposal, Warranty).
  7. `audit`: Asset audit events and chronological activity ledger.
- **Modals & Dialogs (8)**:
  1. `isRegisterModalOpen`: New asset registration with lot quantity support.
  2. `isAssignModalOpen`: Employee/department equipment handover.
  3. `isReturnModalOpen`: Equipment return with condition inspection.
  4. `isMaintModalOpen`: Maintenance scheduling and vendor repair cost logging.
  5. `isCategoryModalOpen`: Category configuration with depreciation percentage.
  6. `isRequestModalOpen`: Administrative approval of employee requests.
  7. `isDisposalModalOpen`: Scrap disposal batch creation with financial book values.
  8. `isDisposalMinutesOpen`: Formal disposal committee minutes and certification.
- **Entitlement & Addon Gating**:
  - Gated by `useAddon("asset-management")`.
  - Non-entitled tenants receive a full-page promotional upgrade/trial barrier (`startTrial`, `subscribe` billing triggers).
  - Dual persona logic: `isEmployeeOnly` dynamically alters default tab and view modes.
- **Queries & Mutations**:
  - 11 `useQuery` hooks: `my-assets-portal`, `system-config`, `asset-categories`, `assets-list`, `asset-requests`, `asset-disposals`, `asset-reports`, `asset-audit-logs`, `employees-list`, `departments-list`.
  - 10 `useMutation` hooks: `submitMyRequestMutation`, `registerMutation`, `assignMutation`, `returnMutation`, `createCategoryMutation`, `deleteCategoryMutation`, `submitRequestMutation`, `reviewRequestMutation`, `createDisposalMutation`, `approveDisposalMutation`.
- **Financial & Accounting Coupling**:
  - Asset disposal executes accounting write-offs (`bookValue`, `disposalMethod`) hitting `/addons/assets/disposals/:id/approve`.
- **Audit Verdict**: **DEFER — HIGH RISK & COMPLEXITY**.
  - Surface area (2,178 lines) exceeds safe batch limits. Addon entitlement gating and financial scrap write-offs demand dedicated phase treatment.

---

## 7. `asset-dashboard.tsx` Audit

### 7.1 Architectural Complexity
- **Source**: [asset-dashboard.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/asset-dashboard.tsx) (1,117 lines).
- **Primary Domain**: Visual analytics, equipment utilization, and depreciation schedule dashboard.
- **Third-Party Chart Engine**:
  - Uses dynamic lazy-loaded ApexCharts: `const Chart = lazy(() => import("react-apexcharts"))`.
  - Renders 2 complex charts:
    1. Monthly Asset Value & Depreciation Trend (2025–2026 Area Chart).
    2. Deployment by Department (Bar Chart).
- **KPI Summary Cards**:
  - 4 metric cards: Total Assets, Total Valuation ($), Accumulated Depreciation ($ Straight-Line Amortization), Active Utilization Rate (%).
- **Interactive Controls**:
  - Date range picker (`01 Jan 26 - 31 Dec 26`), category filters, view mode toggle (`all` vs. `analytics`), CSV/PDF export.
  - Subordinate asset register table with pagination and CRUD modals.
- **Dashboard Separation Imperative**:
  - In accordance with architectural guidelines, dashboards containing chart libraries (ApexCharts/Chart.js) must **not** be grouped with standard application page migrations.
- **Audit Verdict**: **DEFER — DASHBOARD / CHART ENGINE**.
  - Recommended for inclusion in a standalone `Wave 4 Dashboard Modernization` phase, preserving chart options, series calculations, and responsive SVG wrappers.

---

## 8. `training.tsx` Audit

### 8.1 Architectural Complexity
- **Source**: [training.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/training.tsx) (1,678 lines).
- **Primary Domain**: Corporate Learning Management System (LMS), Compliance Certifications, Trainer Directory.
- **Internal Tabs (6)**:
  1. `courses`: Course catalog, multi-module syllabus, passing score thresholds, mandatory compliance flags.
  2. `my-trainings`: Employee self-service training desk, active progress bars, video links.
  3. `enrollments`: Employee enrollment directory with attendance status and certificate references.
  4. `trainers`: Internal and external trainer profiles (phone, email, bio) — **Subsumes `trainers.tsx`**.
  5. `types`: Training category taxonomy and delivery mode settings.
  6. `analytics`: Department completion percentages, trained hours, compliance scores.
- **Modals & Dialogs (7)**:
  1. `isAddCourseOpen`: Multi-step form with dynamic nested `modules: [...]` curriculum array.
  2. `isEnrollOpen`: Department or employee batch enrollment selector.
  3. `selectedCoursePassport`: Course curriculum and module breakdown inspector.
  4. `selectedCertificate`: **Digital Verified Certificate of Completion Viewer** (with unique certificate ID, score, verification timestamp, and download trigger).
  5. `isUpdateProgressOpen`: Progress percentage and examination score update modal.
  6. `isAddTrainerOpen`: New trainer onboarding dialog.
  7. `isAddTypeOpen`: Training category creation dialog.
- **Legal / Compliance Evidence**:
  - Mandatory training certificates serve as statutory compliance evidence (security awareness, workplace conduct).
  - Certificate generation and verification modal must remain completely untouched.
- **Audit Verdict**: **DEFER — WORKFLOW & LMS COMPLEXITY**.
  - Surface area (1,678 lines) spans 6 enterprise tabs and 7 modals. Best deferred to a dedicated Learning & Development wave.

---

## 9. `transfers.tsx` Audit

### 9.1 Architectural Complexity
- **Source**: [transfers.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/transfers.tsx) (844 lines).
- **Primary Domain**: Supply Chain & Multi-Warehouse Stock Transfers.
- **Physical Inventory Ledger Mutation**:
  - Manages stock movement between source warehouse (`fromWarehouseId`) and target warehouse (`toWarehouseId`).
  - Implements multi-line transfer items (`transferItems: [{ productId, quantity }]`).
  - Calls `getAvailableStock(prodId, whId)` to perform live client-side warehouse stock balance checks.
  - Formats inventory-specific errors via `formatInventoryError(err)` when backend ledger rejects due to stock exhaustion.
- **Status Lifecycle & Ledger Actions**:
  - `pending` → `approved` (Manager approval)
  - `approved` → `in_transit` (Physical goods dispatched from source warehouse)
  - `in_transit` → `completed` (Destination warehouse receives goods, increasing target warehouse stock)
  - `pending` → `rejected` (Order cancellation)
- **Extensive Cache Invalidation Graph**:
  - Invalidates 7 query keys on every mutation:
    `["stock-transfers"]`, `["transfers-warehouse-summary"]`, `["products-for-transfer"]`, `["catalog-items-v2"]`, `["product-movements"]`, `["dashboard-inventory-products"]`, `["dashboard-inventory-metrics"]`.
- **Audit Verdict**: **DEFER — INVENTORY / LEDGER PROTECTED**.
  - While visual wrappers (`PageHeader`, `StatCard`, `FilterToolbar`) fit cleanly, the risk of perturbing supply chain ledger mutations and warehouse balances is high. Must remain protected.

---

## 10. `resignation.tsx` Audit

### 10.1 Architectural Complexity
- **Source**: [resignation.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/resignation.tsx) (797 lines).
- **Primary Domain**: Voluntary Employee Resignations, Notice Period Monitoring, Separation Registry.
- **Dual Persona Workflows**:
  1. **Employee Self-Service**:
     - Dedicated query `["my-resignation-status"]` (`/api/v1/me/resignation`).
     - Self-service resignation submission modal (`isSelfResignOpen`).
     - Persistent personal separation tracker banner displaying exit reference, last working day, notice period countdown, and clearance status.
  2. **HR / Administrative Desk**:
     - Query `["exits", "resignation", tenantId, statusFilter]`.
     - Administrative exit record creation modal (`isAddOpen`).
     - Edit resignation details modal (`editingRecord`).
     - Status badges: `serving_notice`, `clearance_pending`, `fnf_settled`, `completed`.
- **Coupling to Payroll & Offboarding**:
  - Links directly to `/offboarding` for Full & Final Settlement (FnF) and multi-department clearance handover.
  - Does **not** compute payroll or accounting vouchers directly inside this file.
- **Composite Compatibility**:
  - `PageHeader`: EXACT FIT (replaces inline breadcrumbs and title).
  - `StatsOverviewGrid` + `StatCard`: EXACT FIT (standardizes the 4 KPI boxes: Total, Serving Notice, Clearance Pending, Settled).
  - `FilterToolbar`: EXACT FIT (unifies search input and status select).
  - `ConfirmationDialog`: EXACT FIT (replaces native delete alert for `deleteTargetId`).
- **Audit Verdict**: **GROUP B — CONTROLLED CANDIDATE**.
  - Eligible for visual modernization only with strict architectural locks: preserve self-service separation banner, exitCode generation, and `/offboarding` navigation links.

---

## 11. Alternative Low-Risk Candidate Discovery

Because four of the five primary targets (`assets.tsx`, `asset-dashboard.tsx`, `training.tsx`, `transfers.tsx`) involve heavy complexity, addon monetization, charts, or physical inventory balance mutations, a comprehensive survey of the remaining 105 `_app` routes was performed to locate safer, lower-risk candidates.

### 11.1 `probation.tsx` (410 lines)
- **Domain**: Employee Probation & Confirmation Management.
- **Architecture**:
  - Evaluates new hires approaching probation end date.
  - Statuses: `active`, `passed`, `extended`, `terminated`.
  - Metrics: Total, Active, Passed, Extended, Terminated.
  - Modals: Add Probation Record, Update Evaluation/Rating.
- **Risk**: **LOW**. Zero financial, payroll, or stock mutation coupling.
- **Composite Fit**: 100% fit for `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`.

### 11.2 `work-from-home.tsx` (416 lines)
- **Domain**: Remote Work & WFH Request Management.
- **Architecture**:
  - Employee attendance request for work-from-home days.
  - Statuses: `pending`, `approved`, `rejected`, `completed`.
  - Metrics: Total Requests, Approved, Pending, Rejected.
  - Modals: Request WFH, Review Request (Manager remarks).
- **Risk**: **LOW**. Self-contained attendance operation.
- **Composite Fit**: 100% fit for `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`.

### 11.3 `shift-swap-requests.tsx` (541 lines)
- **Domain**: Peer-to-Peer Shift Exchange Requests.
- **Architecture**:
  - Allows staff to request shift exchanges with eligible colleagues.
  - Statuses: `pending`, `approved`, `rejected`.
  - Metrics: Total Requests, Pending, Approved, Rejected.
  - Modals: New Swap Request Dialog, approve/reject direct actions.
- **Risk**: **LOW**. Operational scheduling without monetary or statutory effects.
- **Composite Fit**: 100% fit for `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, and `ConfirmationDialog`.

### 11.4 `call-history.tsx` (553 lines)
- **Domain**: Telephony Communication Records & CRM Activity Log.
- **Architecture**:
  - Tabulated log of inbound/outbound calls, duration, agents, recording links.
  - Statuses: `completed`, `missed`, `voicemail`.
  - Read-only registry with filter toolbar and audio preview modal.
- **Risk**: **LOW**. Pure communication logging.
- **Composite Fit**: 100% fit for `PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`.

### 11.5 `setup-notes.tsx` (247 lines)
- **Domain**: 2FA Setup & Login Security Guide.
- **Architecture**:
  - Informational walkthrough explaining Email OTP and 2FA login verification.
  - Static 4-step sequence cards.
- **Risk**: **LOW**. Static informational page.
- **Composite Fit**: Simple fit for `PageHeader`, but lacks dynamic tables/filters.

---

## 12. UIAble Composite Compatibility Matrix

| Page Candidate | `PageHeader` | `StatCard` | `StatsOverviewGrid` | `FilterToolbar` | `ConfirmationDialog` | `LoadingState` / `EmptyState` | Decision |
|---|---|---|---|---|---|---|---|
| **assets.tsx** | PARTIAL FIT | PARTIAL FIT | PARTIAL FIT | PARTIAL FIT | SAFE ADAPTER | SAFE ADAPTER | **DEFER (Too Complex)** |
| **asset-dashboard.tsx** | SAFE ADAPTER | EXACT FIT | EXACT FIT | SAFE ADAPTER | N/A | SAFE ADAPTER | **DEFER (Dashboard Wave)** |
| **training.tsx** | SAFE ADAPTER | EXACT FIT | EXACT FIT | SAFE ADAPTER | SAFE ADAPTER | SAFE ADAPTER | **DEFER (LMS / Certs)** |
| **transfers.tsx** | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | SAFE ADAPTER | EXACT FIT | **DEFER (Inventory Stock)** |
| **resignation.tsx** | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | **GROUP B (Controlled)** |
| **probation.tsx** | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | **GROUP A (Safe)** |
| **work-from-home.tsx** | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | **GROUP A (Safe)** |
| **shift-swap-requests.tsx**| EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | **GROUP A (Safe)** |
| **call-history.tsx** | EXACT FIT | EXACT FIT | EXACT FIT | EXACT FIT | SAFE ADAPTER | EXACT FIT | **GROUP A (Safe)** |

---

## 13. Business Logic Protection Matrix

| Business Area | Invariant Protection Requirement | Risk Level | Status in Batch 3 |
|---|---|---|---|
| **Authentication & 2FA** | OTP generation, session resolution, JWT tokens, tenant host binding | `CRITICAL` | **LOCKED / DO NOT TOUCH** |
| **RBAC & Persona Trees** | Super Admin, Client, Tenant ERP Admin, Employee Self-Service | `CRITICAL` | **LOCKED / PRESERVED** |
| **Tenant Isolation** | Multi-tenant host domain validation, tenantId scoping | `CRITICAL` | **LOCKED / PRESERVED** |
| **Payment & Billing Gateways** | Subscription checkouts, transaction verifications, invoice generations | `CRITICAL` | **LOCKED / DO NOT TOUCH** |
| **Addon Monetization Licensing**| `useAddon` hook, feature entitlement gates, trial day limits | `HIGH` | **PROTECTED (`assets.tsx` deferred)** |
| **Statutory Payroll** | Salary structure calculation, tax deductions, bank disbursements | `CRITICAL` | **LOCKED / DO NOT TOUCH** |
| **Accounting Ledger** | Chart of Accounts, fiscal journals, debits/credits | `CRITICAL` | **LOCKED / DO NOT TOUCH** |
| **Physical Stock Ledger** | Warehouse balance additions/deductions, inventory movement logs | `HIGH` | **PROTECTED (`transfers.tsx` deferred)** |
| **Asset Scrap / Disposal** | Book value amortization, scrap disposal minutes | `HIGH` | **PROTECTED (`assets.tsx` deferred)** |
| **Legal Certificates & Signatures**| Canvas signing, cryptographic vault, verified certificate IDs | `HIGH` | **PROTECTED (`training.tsx` & `documents.tsx` deferred)** |
| **Employee Separation (FnF)** | Full & final settlement vouchers, offboarding clearance | `HIGH` | **PROTECTED (`resignation.tsx` controlled)** |
| **Employee Self-Service Forms** | Personal resignation tracking, WFH requests, shift swaps | `MEDIUM` | **SAFE WITH PRESERVED MUTATIONS** |
| **Standard Entity Listings** | Filtered data display, status badges, view toggles | `LOW` | **SAFE FOR MODERNIZATION** |

---

## 14. Query / Mutation Audit

### 14.1 Primary Targets
| Target | Queries | Query Keys | Mutations | Critical Side Effects |
|---|---|---|---|---|
| **assets.tsx** | 11 | `["assets-list"]`, `["asset-requests"]`, `["asset-disposals"]`, etc. | 10 | Asset allocation, scrap write-offs, trial billing triggers |
| **asset-dashboard.tsx** | 1 | `["assets"]` | 0 | Chart series calculations |
| **training.tsx** | 6 | `["training-courses"]`, `["training-enrollments"]`, `["training-summary"]`, etc. | 4 | Course syllabus generation, certificate issuance |
| **transfers.tsx** | 4 | `["stock-transfers"]`, `["transfers-warehouse-summary"]`, `["products-for-transfer"]`, etc. | 2 | Physical warehouse stock mutations, inventory balance shifts |
| **resignation.tsx** | 3 | `["exits", "resignation"]`, `["my-resignation-status"]`, `["employees-list"]` | 4 | Exit code generation, notice period calculation, offboarding link |

### 14.2 Alternative Low-Risk Candidates
| Candidate | Queries | Query Keys | Mutations | Critical Side Effects |
|---|---|---|---|---|
| **probation.tsx** | 1 | `["probation", statusFilter, search]` | 3 (`create`, `update`, `delete`) | Employee probation status flag update |
| **work-from-home.tsx** | 2 | `["wfh", statusFilter, search]`, `["employees-mini"]` | 3 (`create`, `review`, `delete`) | Attendance record status update |
| **shift-swap-requests.tsx**| 2 | `["shift-swap-requests"]`, `["employees-list-mini"]` | 3 (`create`, `approve`, `reject`) | Shift schedule assignment exchange |
| **call-history.tsx** | 2 | `["call-history"]`, `["call-metrics"]` | 1 (`delete`) | Communication log record deletion |

---

## 15. RBAC & Tenant Isolation Audit

All audited pages consume tenant context through canonical hooks:
- `useCurrentProfile()`: Supplies `tenant_id` and user roles (`admin`, `super_admin`, `tenant_admin`, `hr_admin`, `manager`, `employee`).
- **Role Guards Verified**:
  - `probation.tsx`: `isAdmin` guard restricts Add, Update Rating, and Delete actions.
  - `work-from-home.tsx`: `isAdmin` restricts Review (Approve/Reject) dialog.
  - `shift-swap-requests.tsx`: `isManagerOrAdmin` restricts approval buttons.
  - `resignation.tsx`: Differentiates between administrative exit logging and employee self-service resignation.
- **Tenant Scoping Verified**:
  - All query endpoints pass `tenantId` explicitly or rely on server-side session JWT header resolution.
  - Zero cross-tenant data leakage risks found in these candidate pages.

---

## 16. Responsive Audit

| Breakpoint | Primary Targets (`assets`, `training`, `transfers`) | Alternative Candidates (`probation`, `wfh`, `shift-swap`) |
|---|---|---|
| **1440px (Desktop Large)** | High-density multi-column grids and wide tables render cleanly. | Spacious, clean layout with ample table margin. |
| **1280px (Desktop)** | Minor table column crunching; horizontal scroll triggered in wide tabs. | Table columns fit comfortably without horizontal scroll. |
| **1024px (Tablet Landscape)** | Multi-tab bars require horizontal scroll; dialogs with 2-column forms begin vertical stretching. | Summary cards wrap to 2 columns; table remains readable. |
| **768px (Tablet Portrait)** | Multi-tab triggers clip; complex modals overflow screen height. | Summary cards collapse cleanly; `FilterToolbar` wraps gracefully. |
| **375px (Mobile Portrait)** | **HIGH RISK OVERFLOW**: 7-tab bar, 8 modals with multi-column inputs, and dynamic module rows break container bounds. | **ZERO OVERFLOW**: `StatsOverviewGrid` collapses to 1 column; `FilterToolbar` stacks cleanly; table uses `overflow-x-auto`. |

---

## 17. Duplicate UI Pattern Audit

Across the audited pages, the following ad-hoc duplicate patterns were identified:
1. **Ad-Hoc Page Headers**:
   - `probation.tsx`, `work-from-home.tsx`, `shift-swap-requests.tsx`, and `resignation.tsx` each implement custom breadcrumb links, title `<h1>`, subtitle `<p>`, and flex action button wrappers.
   - **Modernization Opportunity**: Standardize using canonical `PageHeader`.
2. **Duplicate KPI / Summary Boxes**:
   - Each page manually constructs 4 separate `<Card>` elements with hardcoded colors (`bg-yellow-100`, `bg-blue-100`, `bg-green-100`) and disparate icon wrappers.
   - **Modernization Opportunity**: Standardize using canonical `StatsOverviewGrid` and `StatCard`.
3. **Disparate Filter Rows**:
   - Custom `<input className="...">` and `<Select>` instances with varying heights (32px, 36px, 38px).
   - **Modernization Opportunity**: Standardize using canonical `FilterToolbar`.
4. **Native Alert Dialogs / Custom Delete Prompts**:
   - Unstyled delete confirmation prompts or bespoke dialog overlays.
   - **Modernization Opportunity**: Standardize using canonical `ConfirmationDialog`.

---

## 18. Risk Classification

Every candidate has been assigned exactly one architectural risk classification:

- **CRITICAL**:
  - `accounting.tsx`, `payroll.tsx`, `/super/transactions`, `documents.tsx` (canvas signatures / IP audit certificates).
  - **Verdict**: Completely excluded from normal UI migration.
- **HIGH**:
  - `assets.tsx`: 2,178 lines, 7 tabs, 8 modals, addon billing monetization gating, financial scrap write-offs.
  - `transfers.tsx`: 844 lines, supply chain physical warehouse inventory ledger mutations.
  - `asset-dashboard.tsx`: 1,118 lines, ApexCharts area/bar analytics engine.
  - `training.tsx`: 1,678 lines, LMS curriculum, digital verified certificate generator.
  - **Verdict**: DEFERRED to dedicated specialized waves.
- **MEDIUM**:
  - `resignation.tsx`: 797 lines, employee separation workflow and offboarding linkages.
  - **Verdict**: GROUP B (Controlled Candidate requiring strict behavioral locks).
- **LOW**:
  - `probation.tsx`: 410 lines, self-contained probation tracker.
  - `work-from-home.tsx`: 416 lines, self-contained attendance requests.
  - `shift-swap-requests.tsx`: 541 lines, self-contained shift exchanges.
  - `call-history.tsx`: 553 lines, self-contained communication registry.
  - **Verdict**: GROUP A (Safe for Batch 3).

---

## 19. Group A — Safe Candidates

These pages represent the safest, highest-value targets for visual modernization using canonical UIAble composites:

1. [probation.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/probation.tsx) (410 lines)
   - Scope: Replace ad-hoc header with `PageHeader`, 4 metric boxes with `StatsOverviewGrid` + `StatCard`, search/select with `FilterToolbar`, and delete prompt with `ConfirmationDialog`.
2. [work-from-home.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/work-from-home.tsx) (416 lines)
   - Scope: Standardize header, 4 KPI cards, filter toolbar, and confirmation dialog. Preserves WFH request and review mutation logic 100%.
3. [shift-swap-requests.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/shift-swap-requests.tsx) (541 lines)
   - Scope: Standardize header, 4 KPI cards, filter toolbar, and confirmation dialog. Preserves colleague shift exchange mutations 100%.
4. [call-history.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/call-history.tsx) (553 lines)
   - Scope: Standardize header, telephony summary cards, search filter toolbar, and audio player modal wrapper.

---

## 20. Group B — Controlled Candidates

1. [resignation.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/resignation.tsx) (797 lines)
   - **Conditions for Modernization**:
     - Modernize only the outer `PageHeader`, `StatsOverviewGrid`, `StatCard`, and `FilterToolbar`.
     - Replace `deleteTargetId` confirmation with `ConfirmationDialog`.
     - **MANDATORY INVARIANT LOCKS**:
       - Retain the personal separation status banner (`myResignation`) in its entirety.
       - Retain employee self-service resignation submission modal (`isSelfResignOpen`).
       - Retain all exit record fields (`exitCode`, `noticePeriodDays`, `lastWorkingDay`).
       - Retain explicit navigation link to `/offboarding`.

---

## 21. Group C — Deferred Candidates

1. **`assets.tsx` (2,178 lines)**:
   - Reason: Excessively large, 7 tabs, 8 modals, `useAddon` monetization licensing, financial disposal write-offs.
   - Recommended Future Wave: Dedicated Enterprise Hardware & Assets Wave.
2. **`asset-dashboard.tsx` (1,117 lines)**:
   - Reason: Third-party ApexCharts dependency, area/bar series math.
   - Recommended Future Wave: Dedicated Wave 4 Dashboard Modernization Wave.
3. **`training.tsx` (1,678 lines)**:
   - Reason: LMS course curriculum builder, digital verified certificate viewer, embedded trainers directory.
   - Recommended Future Wave: Dedicated Learning & Development Wave.

---

## 22. Group D — Protected Candidates

1. **`transfers.tsx` (844 lines)**:
   - Reason: Physical inventory balance mutations, warehouse stock deductions, and dispatch lifecycle.
2. **Financial, Payroll & Legal Modules**:
   - `/super/transactions`, `payroll.tsx`, `employee-payslips.tsx`, `accounting.tsx`, `documents.tsx` (Company Policy / e-Signatures), `sla-policies.tsx`.
   - Reason: Legally, financially, and compliance-sensitive operations.

---

## 23. Recommended Batch 3 Scope

In alignment with the required maximum batch size of **3–6 pages**, the recommended Batch 3 scope is:

### Option 1 (Recommended — High Safety & Cohesion: 4 Pages)
Modernize the 4 Group A candidates:
1. `probation.tsx` (410 lines)
2. `work-from-home.tsx` (416 lines)
3. `shift-swap-requests.tsx` (541 lines)
4. `call-history.tsx` (553 lines)

*Total footprint*: ~1,920 lines. Perfectly sized, completely zero financial/inventory risk, 100% testable via automated browser QA.

### Option 2 (Extended Scope — 5 Pages)
Include the 4 Group A candidates + 1 Group B candidate:
1. `probation.tsx`
2. `work-from-home.tsx`
3. `shift-swap-requests.tsx`
4. `call-history.tsx`
5. `resignation.tsx` (under strict controlled invariants)

*Total footprint*: ~2,717 lines.

---

## 24. Explicitly Deferred Areas

The following surfaces are formally excluded from Wave 4 Batch 3:
- Enterprise Assets (`assets.tsx`)
- Asset Analytics Dashboard (`asset-dashboard.tsx`)
- LMS & Training System (`training.tsx`)
- Warehouse Stock Transfers (`transfers.tsx`)
- Company Policy Document Vault & Canvas e-Signatures (`documents.tsx`)
- SLA Escalation Policies (`super/sla-policies.tsx`)
- All Payment, Billing, Accounting, and Statutory Payroll modules.

---

## 25. Regression Risks

| Risk Scenario | Potential Impact | Stage A Mitigation |
|---|---|---|
| **Inventory Stock Corruption** | Negative warehouse balances, stock transfer miscalculations | **DEFERRED `transfers.tsx` from Batch 3** |
| **Addon Monetization Bypass** | Unauthorized asset register access without active license | **DEFERRED `assets.tsx` from Batch 3** |
| **Chart Rendering Failure** | Broken ApexCharts SVG canvas on mobile or dark mode | **DEFERRED `asset-dashboard.tsx` from Batch 3** |
| **Certificate Verification Loss** | Inability to verify employee LMS compliance certificates | **DEFERRED `training.tsx` from Batch 3** |
| **Separation Workflow Severing** | Broken notice period tracking or lost offboarding link | **Classified `resignation.tsx` as Group B with invariant locks** |

---

## 26. Required Stage B Controls (For Future Implementation)

If approved to proceed to Stage B implementation:
1. **Zero Logic Rewrites**: Retain 100% of existing query hooks, mutation callbacks, and state variables.
2. **Prop Transparency**: Map data values directly into `PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, and `ConfirmationDialog`.
3. **No Database / Server Alterations**: Zero schema changes, zero endpoint changes.
4. **Automated Verification**: Every modified page must pass TypeScript check, production build, and automated live browser QA.

---

## 27. Verification Requirements

Any subsequent implementation of Batch 3 must satisfy:
1. `npx tsc --noEmit` / `npm run build` exits 0.
2. `npm run test:cms-isolation` exits 0 (8/8 passed).
3. `npx --prefix server vitest run src/tests/canonical-media-gallery-architecture.test.ts` exits 0 (16/16 passed).
4. Automated Live Browser QA script validating page headers, KPI cards, filter toolbars, dialogs, and 375px mobile responsiveness with full CDP visual screenshots.

---

## 28. Final Recommendation

1. **Formally approve Option 1 (4 Group A pages)** or **Option 2 (4 Group A + 1 Group B page)** for Wave 4 Batch 3.
2. **Formally defer** `assets.tsx`, `asset-dashboard.tsx`, `training.tsx`, and `transfers.tsx` to dedicated specialized phases.
3. **Maintain strict read-only boundary** until the user issues explicit authorization to enter Stage B.

---

## 29. Final Candidate Summary Table

| Page | Complexity | Business Risk | UIAble Fit | Responsive Risk | Recommendation |
|---|---:|:---:|:---:|:---:|:---:|
| **assets.tsx** | High (2,178 lines) | High (Addon/Financial) | Partial Fit | High (8 Modals/7 Tabs) | **DEFER (Group C)** |
| **asset-dashboard.tsx** | Medium (1,117 lines) | Medium (Charts) | Safe Adapter (Cards) | Medium (ApexCharts) | **DEFER (Group C — Dashboard)** |
| **training.tsx** | High (1,678 lines) | High (LMS/Certs) | Safe Adapter | Medium (6 Tabs/7 Modals) | **DEFER (Group C)** |
| **transfers.tsx** | Medium (844 lines) | High (Stock Ledger) | Exact Fit (Shell) | Low-Medium | **DEFER (Group D — Protected)** |
| **resignation.tsx** | Medium (797 lines) | Medium (Lifecycle) | Exact Fit | Low | **CONTROLLED (Group B)** |
| **probation.tsx** | Low (410 lines) | Low | Exact Fit | Low (Mobile Zero Overflow)| **SAFE (Group A)** |
| **work-from-home.tsx** | Low (416 lines) | Low | Exact Fit | Low (Mobile Zero Overflow)| **SAFE (Group A)** |
| **shift-swap-requests.tsx**| Low (541 lines) | Low | Exact Fit | Low (Mobile Zero Overflow)| **SAFE (Group A)** |
| **call-history.tsx** | Low (553 lines) | Low | Exact Fit | Low (Mobile Zero Overflow)| **SAFE (Group A)** |
| **setup-notes.tsx** | Low (247 lines) | Low | Safe Adapter | Low (Static Guide) | **ALTERNATIVE (Optional)** |

---

## 30. Stage A Gate & Hard Stop Declaration

### Stage A Verification Gate
- [x] No application source files modified
- [x] No route files modified
- [x] No backend files modified
- [x] No Prisma/database changes
- [x] No dependencies added or removed
- [x] No business logic changed
- [x] No payment logic changed
- [x] No payroll logic changed
- [x] No accounting logic changed
- [x] No inventory mutation changed
- [x] No authentication/RBAC changed
- [x] No tenant isolation changed
- [x] No legal/certificate workflow changed
- [x] No Company Policy workflow changed
- [x] No standalone `policies.tsx` assumed or created
- [x] No standalone `trainers.tsx` assumed or created
- [x] No standalone `audit-logs.tsx` assumed or created
- [x] Five primary targets audited (`assets`, `asset-dashboard`, `training`, `transfers`, `resignation`)
- [x] Alternative low-risk candidates investigated (`probation`, `work-from-home`, `shift-swap-requests`, `call-history`, `setup-notes`)
- [x] UIAble composite compatibility assessed
- [x] Risk classification completed
- [x] Responsive behavior assessed across 5 breakpoints
- [x] Query/mutation dependencies documented
- [x] Protected areas documented
- [x] Recommended Batch 3 scope defined (4–5 pages)
- [x] `UIABLE_WAVE_4_BATCH_3_APPLICATION_UI_AUDIT.md` created
- [x] **Zero Stage B implementation started**

---

### HARD STOP DECLARATION
**WAVE 4 BATCH 3 — STAGE A COMPLETE — HARD STOP**

All discovery, risk classification, and pre-migration architectural audits are complete. No source code has been altered. Awaiting explicit user approval before proceeding to Stage B.
