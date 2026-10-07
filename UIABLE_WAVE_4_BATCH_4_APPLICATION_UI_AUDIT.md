# UIABLE Wave 4 Batch 4 — Stage A: Read-Only Application UI Discovery & Pre-Migration Audit

**MASTERHRMS Enterprise System**  
**Audit Phase:** Wave 4 Batch 4 — Stage A (Discovery & Pre-Migration Audit)  
**Baseline Commit:** `d0e657ca7`  
**Date:** 2026-10-07  
**Execution Mode:** STRICT READ-ONLY AUDIT (Zero application code modifications)

---

## 1. Executive Summary

Following the formal approval and closure of **Wave 4 Batch 3** (`probation.tsx`, `work-from-home.tsx`, `shift-swap-requests.tsx`, `call-history.tsx`), this document establishes the fresh, empirical discovery census and risk evaluation for **Wave 4 Batch 4**.

Wave 4 has progressively modernized 14 application pages across Batch 1 (4 pages), Batch 2 (6 pages), and Batch 3 (4 pages). Every prior wave maintained a 100% backward-compatibility standard with zero business logic regressions, zero compiler errors, and zero alterations to backend, database, or protected enterprise suites.

This Stage A audit conducts a fresh, ground-up inspection of the current repository state (215 route files, 138 `_app` pages). It classifies remaining application pages into three distinct risk tiers:
- **Group A (Recommended for Controlled Batch 4 Migration):** 4–6 low-risk operational and analytical pages with straightforward queries, self-contained workflows, and clean alignment with canonical UIAble composites.
- **Group B (Controlled Future Waves):** Workflow-heavy, clearance, or multi-modal pages requiring dedicated verification protocols (e.g., notice period tracker, termination, provident fund).
- **Group C (Strictly Protected / Deferred):** Financial ledger, core payroll, physical inventory mutation, fixed assets lifecycle, and chart-heavy dashboards.

**Strict Doctrine Enforced:** This is an audit-only phase. Zero implementation has been performed.

---

## 2. Current Repository Baseline

An empirical inspection of the repository was conducted:

| Parameter | Value / Status |
|---|---|
| **Branch** | `main` |
| **HEAD Commit** | `d0e657ca7` (`feat(ui): Wave 4 Batch 3 Stage B — modernize probation, WFH, shift-swap, call-history with canonical composites`) |
| **Working Tree** | Clean (documentation files only: `UIABLE_MIGRATION_REGISTRY.md`, `UIABLE_WAVE_4_BATCH_3_IMPLEMENTATION_REPORT.md`) |
| **Frontend Compiler** | `npx tsc --noEmit` → Exit code 0 (0 errors) |
| **Backend Compiler** | `npx --prefix server tsc --noEmit` → Exit code 0 (0 errors) |
| **Production Build** | `npm run build` → Exit code 0 (13.20s compilation) |
| **CMS Isolation** | 8/8 automated tests passed |
| **Media Architecture** | 16/16 automated tests passed |

---

## 3. Previous Wave Completion State

A total of 14 core application pages have been successfully modernized in Wave 4 with zero defects:

### Wave 4 Batch 1 (P0 Application UI) — Certified & Closed
1. `announcements.tsx` — Enterprise announcements, pinned broadcasts, priority badges.
2. `holidays.tsx` — Public & regional holiday calendar with year selector.
3. `departments.tsx` — Department organizational hierarchy master.
4. `designations.tsx` — Position taxonomy and departmental assignment master.

### Wave 4 Batch 2 (P2 Low-Risk Application UI) — Certified & Closed
5. `todo.tsx` — Personal action items & checklist tracker.
6. `notes.tsx` — Rich-text personal scratchpad & pinned memos.
7. `daily-report.tsx` — Employee daily timesheet submission & verification.
8. `promotions.tsx` — Promotion history, designation upgrades, salary increment log.
9. `awards.tsx` — Employee recognition & corporate award ledger.
10. `warnings.tsx` — Disciplinary incidents & written warning tracker.

### Wave 4 Batch 3 (Low-Risk Operations) — Certified & Closed
11. `probation.tsx` — Probation status review, duration countdown, rating records.
12. `work-from-home.tsx` — Remote work requests, manager review, date range filters.
13. `shift-swap-requests.tsx` — Colleague shift exchange workflows, manager approval.
14. `call-history.tsx` — Omnichannel telephony records, caller metadata sheet dialog.

All 14 pages are now **STRICTLY PROTECTED FROM RE-MIGRATION**.

---

## 4. Fresh Application Census

A fresh recursive inventory of the routing architecture was executed:

| Route Directory / Portal | Total Route Files | Characteristics |
|---|---|---|
| `src/routes/` (Root & Public) | 42 | Landing page, auth, public storefront, QR asset tracking, documentation |
| `src/routes/_authenticated/_app/` | 138 | Main ERP & HRMS operational application suite |
| `src/routes/_authenticated/super/` | 29 | Super Admin tenant management, subscriptions, licensing |
| `src/routes/_authenticated/client/` | 2 | External client invoices & proposal viewing portal |
| `src/routes/_authenticated/employee/` | 2 | Dedicated employee self-service hub |
| `src/routes/_authenticated/tenant/` | 1 | Tenant workspace onboarding |
| **Total Route Files** | **215** | Comprehensive enterprise system route tree |

### Census of `src/routes/_authenticated/_app/` (138 files)
- **Already Migrated (Wave 4 Batches 1–3):** 14 pages
- **Route Redirects / Micro-stubs:** 3 pages (`dashboard.tsx`, `invoice.create.tsx`, `settings.custom-domain.tsx`)
- **Dashboards (Deferred to dedicated Dashboard Modernization wave):** 18 pages (`hrm-dashboard`, `finance-dashboard`, `sales-dashboard`, `pos-dashboard`, `inventory-dashboard`, etc.)
- **Core Enterprise Monoliths & Protected Ledgers:** 12 pages (`accounting`, `payroll`, `pos`, `employees`, `chat`, `biometric`, `products`, `settings`, `expenses`, etc.)
- **Specialized / Group B Complex Workflows:** 45 pages (`notice-period-tracker`, `termination`, `provident-fund`, `referrals`, `campaigns`, `okr`, `recruitment`, `shifts`, etc.)
- **Remaining Low-Risk Operational / Reporting Candidates:** 46 pages

---

## 5. Remaining Non-Migrated Candidates (Focus Pool)

From the remaining non-migrated pages in `_app`, eight high-suitability candidates under 700 lines of code were subjected to in-depth analysis:

| Page | Route | LOC | Category | Primary Feature |
|---|---|---|---|---|
| `overtime.tsx` | `/_authenticated/_app/overtime` | 485 | Attendance Operations | Employee overtime requests, hours tally, manager approval |
| `ban-ip-address.tsx` | `/_authenticated/_app/ban-ip-address` | 496 | Security Access Control | Firewall blocked IP management, CIDR rules, active toggle |
| `ticket-reports.tsx` | `/_authenticated/_app/ticket-reports` | 449 | Analytical Reports | Helpdesk ticket analytics, priority metrics, CSV export |
| `leave-report.tsx` | `/_authenticated/_app/leave-report` | 445 | Analytical Reports | Workforce leave consumption, type breakdown, CSV export |
| `taxes.tsx` | `/_authenticated/_app/taxes` | 483 | Finance Settings | Tax rates & GST slabs lookup configuration |
| `setup-notes.tsx` | `/_authenticated/_app/setup-notes` | 248 | Security Guide | 2FA Email OTP setup instructions, troubleshooting steps |
| `clear-cache.tsx` | `/_authenticated/_app/clear-cache` | 280 | System Maintenance | Query cache flushing, memory buffer optimization |
| `currencies.tsx` | `/_authenticated/_app/currencies` | 551 | System Settings | Currency symbol & code configuration (touches CMS API) |

---

## 6. UI Pattern Census

An audit of the non-migrated candidates identified extensive ad-hoc and duplicated UI patterns that can be standardized using canonical Wave 4 composites:

| UI Pattern | Current Ad-Hoc Implementation | Canonical UIAble Replacement | Value & Consistency Gain |
|---|---|---|---|
| **Page Headers** | Inconsistent breadcrumb navigation, ad-hoc flex rows, duplicate title/description tags | `PageHeader` | Enforces uniform enterprise header styling, standardized breadcrumbs, action button slots. |
| **Metric / KPI Cards** | Inline hardcoded cards with differing padding (`pt-4 pb-4`, `p-3.5`, `p-4`), inconsistent badge colors | `StatCard` + `StatsOverviewGrid` | Curated HSL color palettes, responsive grid columns (2, 3, or 4 cols), consistent typography. |
| **Filter Toolbars** | Wrapped inputs in cards or raw flex rows with differing heights (`h-8`, `h-9`, `h-10`) | `FilterToolbar` | Standardized search input, clean combobox triggers, unified responsive layout. |
| **Deletion Confirmation** | Mixed use of raw `window.confirm()` and custom modal dialogs | `ConfirmationDialog` | Non-blocking accessible modal with `destructive` action variant and spinner state. |
| **Table Wrappers** | Custom table headers, inconsistent empty state heights | `Table` + `EmptyState` | Standardized padding, unified zebra-striping/hover effects, accessible row semantics. |

---

## 7. Deep Candidate Analysis

### 7.1 `overtime.tsx`
- **Source Path:** `src/routes/_authenticated/_app/overtime.tsx` (485 lines)
- **Module:** Attendance Operations
- **Current UI:** Ad-hoc breadcrumb row, 4 stat cards (`Overtime Employee`, `Overtime Hours`, `Pending Request`, `Rejected`), Search + Status select, table with employee avatars, Add Overtime dialog, Review modal, Delete action.
- **Business Logic Sensitivity:** LOW. Self-contained attendance sub-feature. Zero financial ledger or payroll mutation.
- **Queries & Mutations:**
  - `useQuery({ queryKey: ["overtime-stats"] })`
  - `useQuery({ queryKey: ["overtime", statusFilter, search] })`
  - `useQuery({ queryKey: ["employees-mini"] })`
  - `useMutation({ mutationFn: (p) => api.post("/overtime", p) })`
  - `useMutation({ mutationFn: ({ id, status, remarks }) => api.put("/overtime/${id}/review", ...) })`
  - `useMutation({ mutationFn: (id) => api.delete("/overtime/${id}") })`
  - Preserved: Invalidation of `["overtime"]` and `["overtime-stats"]`.
- **RBAC:** `isAdmin` evaluates `["admin", "super_admin", "tenant_admin", "hr_admin", "manager"]`.
- **UIAble Fit:** Excellent. Direct equivalent of `work-from-home.tsx`.
- **Risk:** LOW.

### 7.2 `ban-ip-address.tsx`
- **Source Path:** `src/routes/_authenticated/_app/ban-ip-address.tsx` (496 lines)
- **Module:** Security Access Control
- **Current UI:** Header with title and security subtitle, View Mode toggle (Grid / Table), 4 metric cards (`Total Blocked IPs`, `Active Enforcement`, `WAF Rule Status`, `Protocol Support`), Card-wrapped search bar, Add IP Dialog, Edit Dialog, Delete confirmation dialog.
- **Business Logic Sensitivity:** LOW. Isolated security IP table.
- **Queries & Mutations:**
  - `useQuery({ queryKey: ["banned-ips", search] })`
  - `useMutation({ mutationFn: (data) => api.post("/banned-ips", data) })`
  - `useMutation({ mutationFn: ({ id, data }) => api.put("/banned-ips/${id}", data) })`
  - `useMutation({ mutationFn: (id) => api.delete("/banned-ips/${id}") })`
  - Preserved: Invalidation of `["banned-ips"]`.
- **RBAC:** `isAdmin` check with `<AccessDenied />` fallback.
- **UIAble Fit:** Excellent (`PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, `ConfirmationDialog`).
- **Risk:** LOW.

### 7.3 `ticket-reports.tsx`
- **Source Path:** `src/routes/_authenticated/_app/ticket-reports.tsx` (449 lines)
- **Module:** Helpdesk / Analytical Reports
- **Current UI:** Breadcrumb/header, 4 KPI cards (`Total Tickets`, `Open Tickets`, `In Progress`, `Resolved / Closed`), Search + Status select + Priority select, Table with priority/status badges, CSV export button.
- **Business Logic Sensitivity:** LOW (READ-ONLY). Zero mutations.
- **Queries & Mutations:**
  - `useQuery({ queryKey: ["helpdesk-tickets-report", tenantId] })`
  - `useQuery({ queryKey: ["helpdesk-stats-report", tenantId] })`
  - Mutations: 0 (Zero risk of data corruption).
- **RBAC:** Authenticated staff access.
- **UIAble Fit:** Excellent (`PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`).
- **Risk:** LOW.

### 7.4 `leave-report.tsx`
- **Source Path:** `src/routes/_authenticated/_app/leave-report.tsx` (445 lines)
- **Module:** Attendance & Leave Reports
- **Current UI:** Breadcrumb/header, 4 KPI cards (`Total Requests`, `Approved Leaves`, `Pending Approvals`, `Rejected Requests`), Search + Leave Type select + Status select, Table with employee avatar and date ranges, CSV export button.
- **Business Logic Sensitivity:** LOW (READ-ONLY). Zero mutations.
- **Queries & Mutations:**
  - `useQuery({ queryKey: ["leave-types", tenantId] })`
  - `useQuery({ queryKey: ["leave-report", tenantId, selectedStatus, selectedType] })`
  - Mutations: 0 (Zero risk of data corruption).
- **RBAC:** Authenticated HR/staff access.
- **UIAble Fit:** Excellent (`PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`).
- **Risk:** LOW.

### 7.5 `taxes.tsx`
- **Source Path:** `src/routes/_authenticated/_app/taxes.tsx` (483 lines)
- **Module:** Finance Settings
- **Current UI:** Breadcrumb row, 4 KPI cards (`Total Tax Rates`, `Default Checkout Tax`, `Zero-Rated / Exempt`, `Standard GST Brackets`), Search bar, Table with rate percentages and default badges, Add/Edit dialog, Delete confirmation.
- **Business Logic Sensitivity:** LOW. Lookup table storing tax percentage brackets (e.g. 5%, 12%, 18%). Does not process ledger vouchers.
- **Queries & Mutations:**
  - `useQuery({ queryKey: ["taxes", tenantId] })`
  - `useMutation({ mutationFn: (body) => api.post("/api/products/taxes", body) })`
  - `useMutation({ mutationFn: ({ id, body }) => api.put("/api/products/taxes/${id}", body) })`
  - `useMutation({ mutationFn: (id) => api.delete("/api/products/taxes/${id}") })`
- **RBAC:** Finance / Admin access.
- **UIAble Fit:** Excellent (`PageHeader`, `StatsOverviewGrid`, `StatCard`, `FilterToolbar`, `ConfirmationDialog`).
- **Risk:** LOW.

### 7.6 `setup-notes.tsx`
- **Source Path:** `src/routes/_authenticated/_app/setup-notes.tsx` (248 lines)
- **Module:** Security Guide
- **Current UI:** Breadcrumb, 4-step sequence cards for 2FA Email OTP login, Security tips checklist, Troubleshooting advice.
- **Business Logic Sensitivity:** ZERO. Completely static educational guide.
- **Queries & Mutations:** ZERO queries, ZERO mutations.
- **RBAC:** Public authenticated guide.
- **UIAble Fit:** Good (`PageHeader`).
- **Risk:** LOW.

---

## 8. Query / Mutation Audit Summary

| Page | Queries | Mutations | Invalidation Keys | Risk Profile |
|---|---|---|---|---|
| `overtime.tsx` | 3 | 3 (`POST`, `PUT review`, `DELETE`) | `["overtime"]`, `["overtime-stats"]` | Low (CRUD) |
| `ban-ip-address.tsx` | 1 | 3 (`POST`, `PUT`, `DELETE`) | `["banned-ips"]` | Low (CRUD) |
| `ticket-reports.tsx` | 2 | 0 (READ-ONLY) | None | Zero mutation risk |
| `leave-report.tsx` | 2 | 0 (READ-ONLY) | None | Zero mutation risk |
| `taxes.tsx` | 1 | 3 (`POST`, `PUT`, `DELETE`) | `["taxes"]` | Low (CRUD) |
| `setup-notes.tsx` | 0 | 0 (STATIC) | None | Zero API risk |

---

## 9. RBAC Audit

All candidate pages have well-defined RBAC boundaries:
- `overtime.tsx`: Role guard `isAdmin` inspecting `profile?.roles` (`admin`, `super_admin`, `tenant_admin`, `hr_admin`, `manager`). Guards review and delete actions.
- `ban-ip-address.tsx`: Strict firewall access check using `isWorkspaceAdminUser(profile)` and `<AccessDenied moduleName="Security Firewall" />`.
- `ticket-reports.tsx` & `leave-report.tsx`: Scoped by `tenant_id` from session profile.
- `taxes.tsx`: Scoped by `tenant_id`.

**Rule:** All RBAC role definitions and conditional button renders must be preserved verbatim in any future implementation.

---

## 10. Tenant Isolation Audit

All candidate pages operate safely within tenant boundaries:
- Queries utilize session tenant ID or tenant-scoped API routes (`/overtime`, `/banned-ips`, `/api/products/taxes`).
- No candidate makes unauthenticated or cross-tenant global calls.
- `currencies.tsx` was flagged because it calls `/api/cms/pages/system-currencies`. To avoid touching CMS-related endpoints, `currencies.tsx` is excluded from Group A.

---

## 11. Responsive Risk Audit

Source-level inspection across all candidates:
- All candidates use standard responsive Tailwind utility classes (`sm:`, `md:`, `lg:`, `xl:`).
- Tables are wrapped in scrollable containers (`overflow-x-auto`).
- Stat cards adapt between 2 columns on mobile and 4 columns on large screens.
- Modals utilize responsive widths (`max-w-md`, `max-w-lg`).
- Responsive risk across all Group A candidates is **LOW**.

---

## 12. UIAble Compatibility Matrix

| Candidate Page | `PageHeader` | `StatCard` | `StatsOverviewGrid` | `FilterToolbar` | `ConfirmationDialog` | Suitability Score |
|---|---|---|---|---|---|---|
| `overtime.tsx` | ✅ Direct | ✅ 4 cards | ✅ 4 cols | ✅ Search + Status | ✅ Delete confirm | **Excellent** |
| `ban-ip-address.tsx` | ✅ Direct | ✅ 4 cards | ✅ 4 cols | ✅ Search bar | ✅ Delete confirm | **Excellent** |
| `ticket-reports.tsx` | ✅ Direct | ✅ 4 cards | ✅ 4 cols | ✅ Search + Status + Priority | N/A (Read-only) | **Excellent** |
| `leave-report.tsx` | ✅ Direct | ✅ 4 cards | ✅ 4 cols | ✅ Search + Type + Status | N/A (Read-only) | **Excellent** |
| `taxes.tsx` | ✅ Direct | ✅ 4 cards | ✅ 4 cols | ✅ Search bar | ✅ Delete confirm | **Excellent** |
| `setup-notes.tsx` | ✅ Direct | N/A | N/A | N/A | N/A | **Good** |

---

## 13. Protected / Deferred Review

The five pages highlighted in previous audit mandates were thoroughly re-inspected:

1. **`assets.tsx` (2,061 lines):**
   - 7 tabs, 8 modals, scrap write-offs, financial depreciation calculations, `useAddon` monetization gating.
   - **Status: REMAINS HIGH RISK — DEFERRED TO SPECIALIZED ASSETS WAVE.**

2. **`asset-dashboard.tsx` (1,061 lines):**
   - ApexCharts visual canvas, hardware lifecycle depreciation graphs.
   - **Status: REMAINS MEDIUM-HIGH RISK — DEFERRED TO DASHBOARD WAVE.**

3. **`training.tsx` (1,557 lines):**
   - 6 tabs, LMS curriculum, digital certificates, trainer master matrix.
   - **Status: REMAINS HIGH RISK — DEFERRED TO LMS WAVE.**

4. **`transfers.tsx` (800 lines):**
   - Physical warehouse multi-site stock dispatch, inventory balance mutation.
   - **Status: REMAINS HIGH RISK — DEFERRED TO SUPPLY CHAIN WAVE.**

5. **`resignation.tsx` (755 lines):**
   - Employee exit code generation, FnF settlement links, separation banner.
   - **Status: REMAINS MEDIUM-HIGH RISK — DEFERRED TO SEPARATION / OFFBOARDING WAVE.**

---

## 14. Candidate Grouping

### Group A — Recommended Batch 4 Candidates
Safe, low-risk operational, security, and analytical reporting pages:
1. `src/routes/_authenticated/_app/overtime.tsx` (485 lines) — Attendance overtime operations
2. `src/routes/_authenticated/_app/ban-ip-address.tsx` (496 lines) — Security firewall access control
3. `src/routes/_authenticated/_app/ticket-reports.tsx` (449 lines) — Helpdesk analytical report (read-only)
4. `src/routes/_authenticated/_app/leave-report.tsx` (445 lines) — Leave analytical report (read-only)
5. `src/routes/_authenticated/_app/taxes.tsx` (483 lines) — Tax rates & GST slabs master
6. `src/routes/_authenticated/_app/setup-notes.tsx` (248 lines) — 2FA guide & security tips

### Group B — Controlled Future Waves (Medium Risk)
Pages with complex workflows, departmental clearances, or sensitive metadata:
- `notice-period-tracker.tsx` (681 lines) — Departmental clearance & exit tracking
- `termination.tsx` (667 lines) — Disciplinary termination & exit records
- `resignation.tsx` (755 lines) — Separation lifecycle & exitCode handling
- `provident-fund.tsx` (793 lines) — Statutory PF deduction percentages
- `referrals.tsx` (841 lines) — Recruitment referrals & bonus payouts
- `custom-fields.tsx` (775 lines) — Multi-module schema metadata extension
- `tasks.tsx` (469 lines) — Project Kanban board layout
- `currencies.tsx` (551 lines) — System currency settings (calls CMS API)
- `companies.tsx` (753 lines) — Multi-entity corporate setup
- `cronjob.tsx` (783 lines) — Scheduled system background jobs

### Group C — Deferred / Strictly Protected (High Risk & Monoliths)
- `assets.tsx` (2,061 lines) — Fixed assets ledger
- `asset-dashboard.tsx` (1,061 lines) — ApexCharts dashboard
- `training.tsx` (1,557 lines) — LMS & compliance certificates
- `transfers.tsx` (800 lines) — Supply chain inventory transfer ledger
- `accounting.tsx` (1,327 lines) — Core accounting suite
- `payroll.tsx` (2,134 lines) — Core payroll processing engine
- `pos.tsx` (2,058 lines) — Point of Sale terminal
- `chat.tsx` (3,257 lines) — Real-time websocket chat engine
- `employees.tsx` (3,401 lines) — Employee master records
- `expenses.tsx` (2,113 lines) — Expense reimbursement ledger
- `products.tsx` (2,316 lines) — Inventory product SKU master
- `settings.tsx` (2,409 lines) — Enterprise root configuration console

---

## 15. Priority Ranking for Group A Candidates

1. **Priority P0: `overtime.tsx`**
   - Directly complements `work-from-home.tsx` and `probation.tsx` from Batch 3.
   - Completes the attendance operational requests sub-suite.
   - Clean 4-card KPI grid and standardized modal review workflow.
2. **Priority P1: `ban-ip-address.tsx`**
   - High visual impact for security settings.
   - Standard CRUD structure with clean grid/table views.
3. **Priority P1: `ticket-reports.tsx`**
   - First report page migration in Wave 4.
   - Zero mutation risk (read-only query).
4. **Priority P1: `leave-report.tsx`**
   - Establishes the canonical UIAble reporting pattern for HR analytics.
   - Zero mutation risk (read-only query).
5. **Priority P2: `taxes.tsx`**
   - Clean lookup table for tax percentages; simple dialog workflows.
6. **Priority P2: `setup-notes.tsx`**
   - Lightweight informational guide (248 lines), zero backend interaction.

---

## 16. Recommended Batch 4 Scope Options

### Option A — Minimal Risk (3 Pages, ~1,229 LOC)
- `overtime.tsx`
- `ban-ip-address.tsx`
- `setup-notes.tsx`
*Rationale:* Absolute lowest risk footprint; covers 1 attendance workflow, 1 security page, 1 guide.

### Option B — Balanced (Recommended: 4 Pages, ~1,875 LOC)
- `overtime.tsx` (Attendance operations)
- `ban-ip-address.tsx` (Security access control)
- `ticket-reports.tsx` (Helpdesk report — read-only)
- `leave-report.tsx` (Leave report — read-only)
*Rationale:* **Best value-to-risk ratio.** Completes the attendance request suite, modernizes the security firewall console, and introduces the canonical UIAble analytical reporting pattern across two read-only reporting pages with zero mutation risk. All 4 pages are under 500 lines of code.

### Option C — Comprehensive (6 Pages, ~2,606 LOC)
- `overtime.tsx`
- `ban-ip-address.tsx`
- `ticket-reports.tsx`
- `leave-report.tsx`
- `taxes.tsx`
- `setup-notes.tsx`
*Rationale:* Maximum modernization velocity; requires broader review scope.

### **RECOMMENDED OPTION: OPTION B (Balanced — 4 Pages)**

---

## 17. Risk Matrix for Option B

| Risk Dimension | Score | Mitigation Strategy |
|---|---|---|
| **Compilation Regression** | 0 / Very Low | `npx tsc --noEmit` validation before any commit. |
| **Business Logic Regression** | Low | Preserve all query keys, mutation functions, and payload structures verbatim. |
| **Reporting Accuracy** | Zero | Read-only report pages execute untouched API endpoints. |
| **RBAC / Security Breach** | Zero | Preserve all `isAdmin` checks and `<AccessDenied />` components. |
| **Responsive Overflow** | Low | Canonical `FilterToolbar` and `StatsOverviewGrid` are pre-tested for 375px–1440px. |
| **Protected Modules** | Zero | Zero changes to `assets`, `training`, `transfers`, `resignation`, `payroll`, `accounting`. |

---

## 18. Preconditions for Stage B Implementation

Before Stage B implementation may commence:
1. Explicit human user approval of this Stage A audit and selection of Batch 4 scope (Option A, B, or C).
2. Clean working tree confirmed.
3. Verification that dev server is operational.
4. Commitment to the PRESERVE FUNCTIONALITY FIRST → IMPROVE UI SECOND doctrine.

---

## 19. Wave 4 Batch 4 Stage A Verdict

### Current Baseline
- **14 Application Pages Migrated** across Waves 4 Batches 1, 2, and 3.
- **0 Compile Errors**, **0 Test Failures**, **0 Code Modifications** in Stage A.

### Recommended Group A Candidates
- `src/routes/_authenticated/_app/overtime.tsx`
- `src/routes/_authenticated/_app/ban-ip-address.tsx`
- `src/routes/_authenticated/_app/ticket-reports.tsx`
- `src/routes/_authenticated/_app/leave-report.tsx`
*(Optional extensions: `taxes.tsx`, `setup-notes.tsx`)*

### Group B (Controlled Future Waves)
- `notice-period-tracker.tsx`, `termination.tsx`, `resignation.tsx`, `provident-fund.tsx`, `referrals.tsx`, `custom-fields.tsx`, `tasks.tsx`, `currencies.tsx`, `companies.tsx`, `cronjob.tsx`.

### Group C (Protected / Deferred)
- `assets.tsx`, `asset-dashboard.tsx`, `training.tsx`, `transfers.tsx`, `accounting.tsx`, `payroll.tsx`, `pos.tsx`, `chat.tsx`, `employees.tsx`, `expenses.tsx`, `products.tsx`, `settings.tsx`.

### Recommended Batch Scope
**OPTION B (Balanced — 4 Pages: `overtime`, `ban-ip-address`, `ticket-reports`, `leave-report`)**

### Implementation Readiness
**READY WITH CONDITIONS**

### Conditions
- Await explicit user review and scope confirmation.
- Maintain absolute preservation of all API calls, query keys, mutations, and RBAC guards.
- Implement pages sequentially in Stage B with zero side effects.

---

## 20. HARD STOP

**Stage A Discovery & Pre-Migration Audit is complete.**  
**Zero implementation has been performed.**  
**Awaiting user instructions.**
