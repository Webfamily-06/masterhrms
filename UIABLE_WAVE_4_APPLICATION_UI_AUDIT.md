# UIABLE WAVE 4 — APPLICATION UI AUDIT
## STAGE A — READ-ONLY DISCOVERY & PRE-MIGRATION AUDIT

**Authoritative Project Baseline:** `UIABLE_MIGRATION_REGISTRY.md`, `DASHBOARD_PAGE_INVENTORY.md`, `COMPONENT_MASTER_REGISTRY.md`, `UIABLE_WAVE_3_SHELL_IMPLEMENTATION_REPORT.md`  
**Execution Mode:** STRICT READ-ONLY AUDIT (Source modifications: ZERO)  
**Status:** **STAGE A COMPLETE**  
**Date:** 2026-10-06  

---

## 1. Executive Summary

Wave 4 marks the transition from global foundation and layout infrastructure into application pages, dashboard content surfaces, and business UI workflows across MASTERHRMS.

In strict adherence to the project migration directives:
> **PRESERVE FUNCTIONALITY FIRST → IMPROVE UI SECOND → VERIFY EVERYTHING → PROCEED WAVE BY WAVE**

This audit was conducted in **100% read-only discovery mode**. Zero application source files, routes, schemas, backend controllers, or dependencies were altered.

### Core Architectural Finding: The Intermediate Component Vacuum
The audit reveals that while:
- **Wave 1** established robust, verified foundation primitives (`Button`, `Badge`, `Card`, `Input`, `Textarea`, `Empty`, `EmptyState`, `Table`, `Dialog`, `Tabs`),
- **Wave 2** established the standardized `DataTable` and complex listing surface, and
- **Wave 3** unified the global application shell (`DreamsSidebar`, `AppShell Topbar`, `DashboardHeader`, `SettingsNestedNav`, `SuperShell`),

The 212 application pages suffer from widespread **intermediate composite UI fragmentation**:
1. **Ad-Hoc Page Headers:** Over **70 route files** implement custom inline header blocks (`<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">`) with varying margins, inconsistent title font sizes, and haphazard action button alignments.
2. **Duplicated KPI / Metric Cards:** Over **50 route files** reimplement identical 4-column KPI metric card grids (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`). Some use legacy template classes (`bg-white dark:bg-slate-900 border-border-color rounded-md`), others use Wave 1 `<Card>`, resulting in jarring visual inconsistencies.
3. **Repeated Filter Toolbars:** Over **40 route files** copy-paste identical filter toolbars (`bg-muted/40 p-2 rounded-xl border flex flex-col sm:flex-row ...`) with search inputs, category dropdowns, and export buttons.
4. **Dangerous Confirmation Inconsistency:** Over **45 places** invoke native browser `window.confirm(...)` dialogs (which look unstyled, freeze the JavaScript event loop, and break mobile web experiences), while **55+ places** implement verbose, bespoke deletion dialogs.
5. **Dormant System States:** While `src/components/system-states/` contains high-quality `LoadingState` and `ErrorState` components, they are used only on a single demo page. **89 application files** continue to render raw inline `Loader2` spinners.

### Strategic Recommendation for Wave 4
Rather than attempting to migrate dozens of complex pages all at once, Wave 4 must adopt a **two-phase composite strategy**:
1. **Establish Reusable Page Composites:** Create canonical, design-token-harmonized adapters (`PageHeader`, `StatCard` / `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`) built exclusively upon Wave 1 primitives.
2. **Execute a Controlled Batch 1 Pilot (4–5 Pages):** Modernize low-risk, high-visibility entity management pages (`announcements.tsx`, `holidays.tsx`, `departments.tsx`, `designations.tsx`, `policies.tsx`) before touching complex business engines (Payroll, Accounting, Payments).

---

## 2. Current Application UI Baseline

The authoritative application baseline verified at the start of Wave 4 Stage A:

```text
================================================================================
                    MASTERHRMS APPLICATION ARCHITECTURAL BASELINE
================================================================================
Total Application Portals:                       10
Total Unique Route Files:                        212
Total Unique Pages:                              212
Protected Routes (Authenticated / Role-Gated):   172
Public / Unauthenticated Routes:                 40
Navigation-Visible Pages (Sidebar / Topbar):     147
Hidden / Modal / Direct / Parametric Routes:     65
Dynamic Parametric Routes (:id, :slug):          9
Total Cataloged Frontend Components:             584
  - Shared Components:                           305
  - Page-Specific Components:                    279
Total Icons Discovered (Lucide React):           245
TypeScript Verification (Frontend & Backend):    0 Errors (100% Clean)
Vite Production Bundle Build:                    Success (12.50s, 0 Errors)
Automated Live Browser QA Verification:          8 / 8 Tests Passed (Exit Code 0)
================================================================================
```

### Cumulative Wave Progress:
- **Wave 1 (Foundation UI):** 11 primitives migrated/created (`Button`, `Badge`, `Card`, `Input`, `Textarea`, `Empty`, `EmptyState`, `Table`, `Dialog`, `Tabs`, `DataTable`).
- **Wave 2 (Data Tables):** 5 table listings elevated with verified zero behavioral regressions.
- **Wave 3 (Navigation & Shell):** 5 core shell hosts and layout components modernized with verified 250px/72px collapse, hover expansion, mobile drawer, multi-persona trees, and zero horizontal page overflow.

---

## 3. Portal Inventory

The MASTERHRMS SaaS platform operates across **10 distinct application portals**:

| # | Portal | Base Route | Primary Layout | Page Count | Primary Personas | Business Sensitivity |
|---|---|---|---|---:|---|---|
| 1 | **Super Admin Portal** | `/super` | `SuperAdminLayout` | 29 | Platform Super Admin | **CRITICAL** (Platform tenant isolation, payments, SLA) |
| 2 | **Tenant Admin & Core ERP Portal** | `/_app` | `AppDashboardLayout` (`DreamsSidebar`) | 136 | Tenant Admin, HR Admin, Operations Manager | **HIGH** (Workforce, CRM, inventory, financial accounting) |
| 3 | **Employee Portal (ESS)** | `/employee` | `EmployeeLayout` | 2 | Employee | **MEDIUM** (Self-service attendance, leaves, personal payslip) |
| 4 | **Client / Customer Portal** | `/client` | `ClientLayout` | 2 | Client | **MEDIUM** (Invoices, project progress, proposal reviews) |
| 5 | **Client Document Portal** | `/portal` | `PublicClientLayout` | 3 | Public Client | **HIGH** (Public invoice viewer, proposal e-signing) |
| 6 | **Tenant Management** | `/tenant` | `TenantLayout` | 1 | Tenant User | **HIGH** (Tenant workspace switcher & resolver) |
| 7 | **Tenant Onboarding Portal** | `/onboarding` | `OnboardingLayout` | 1 | New Tenant Admin | **HIGH** (Initial workspace setup wizard) |
| 8 | **Authentication Portal** | `/auth` | `AuthLayout` | 6 | All Users | **CRITICAL** (Credentials, 2FA, session expiry, lock screen) |
| 9 | **Payment Gateway & Checkout Portal**| `/payment` | `PaymentLayout` | 3 | All Paying Users | **CRITICAL** (Razorpay, Stripe, Cashfree callbacks) |
| 10 | **Public Website & Marketing** | `/` | `MarketingLayout` | 28 | Public Visitors | **LOW** (Landing, product, pricing, docs, solutions) |

---

## 4. Page Inventory

Across the 212 application routes, pages fall into **10 distinct functional archetypes**:

### A. Dashboard Content Hubs (15 Pages)
- `/hrm-dashboard`: Core workforce metrics, attendance donuts, payroll preview, recent leave requests.
- `/super`: Platform tenant counts, MRR metrics, server health, active subscribers.
- `/super/analytics`: Global platform usage analytics, tenant growth curves, API traffic.
- `/crm-dashboard`: Lead conversion funnel, pipeline value, deal stages.
- `/finance-dashboard`: Revenue vs expenses, accounts receivable/payable, cash flow velocity.
- `/pos`: Point-of-Sale cash register terminal, quick product grid, cart drawer.
- `/inventory-dashboard`: Low stock alerts, inventory valuation, stock movements.
- `/projects-dashboard`: Active milestones, overdue deliverables, team allocation.
- `/analytics-dashboard`: Deep workforce analytics, turnover trends, departmental metrics.
- `/recruitment-dashboard`: Open positions, candidate pipeline, interview schedules.
- `/helpdesk-dashboard`: SLA compliance rates, open ticket queues, resolution times.
- `/asset-dashboard`: Hardware/software asset allocation, depreciations, warranties.
- `/leads-dashboard`: Marketing lead capture, lead scoring, campaign attribution.
- `/client-dashboard`: Client billing summaries, active deliverables.
- `/employee-dashboard`: Clock-in/out widget, leave balance cards, shift notices.

### B. Entity Management & Listing Pages (68 Pages)
- Workforce: `/employees`, `/departments`, `/designations`, `/holidays`, `/announcements`, `/warnings`, `/transfers`, `/promotions`, `/probation`, `/resignation`, `/termination`, `/policies`, `/awards`.
- Time & Attendance: `/attendance`, `/timesheets`, `/shifts`, `/shift-swap-requests`, `/work-from-home`, `/overtime`.
- Operations & Assets: `/assets`, `/training`, `/trainers`, `/tasks`, `/todo`, `/notes`, `/documents`.
- CRM & Sales: `/crm`, `/pipeline`, `/leads`, `/clients`, `/companies`, `/deals`, `/campaigns`.
- Inventory & Store: `/products`, `/categories`, `/units`, `/brands`, `/warehouses`, `/suppliers`, `/purchases`, `/adjustments`.

### C. Report & Analytics Pages (18 Pages)
- `/attendance-report`, `/leave-report`, `/payroll-report`, `/payslip-report`, `/employee-report`, `/expenses-report`, `/project-report`, `/daily-report`, `/payment-report`, `/ticket-reports`, `/audit-logs`.

### D. Complex Financial & Transactional Pages (24 Pages)
- `/payroll`, `/payroll-runs`, `/salary-settings`, `/accounting`, `/chart-of-accounts`, `/invoices`, `/invoice/:id`, `/recurring-invoices`, `/expenses`, `/super/transactions`, `/subscription`, `/bank-accounts`.

### E. Configuration & Settings Pages (16 Pages)
- `/settings`, `/super/settings`, `/ai-settings`, `/ai-configuration`, `/biometric`, `/whatsapp-alerts`, `/google-workspace`, `/razorpay-gateway`, `/tally-importer`, `/backup`, `/custom-domain-settings`, `/roles`.

### F. Marketing & Public Pages (28 Pages)
- `/`, `/about`, `/product`, `/solutions`, `/pricing`, `/addons`, `/addons/:slug`, `/docs`, `/developer`, `/careers`, `/contact`, `/blogs`, `/case-studies`, `/cms`, `/customer-display`.

### G. Authentication & Security Pages (6 Pages)
- `/auth`, `/login`, `/super-login`, `/verify-2fa`, `/lock-screen`, `/session-expired`.

### H. Client Document Reader Pages (3 Pages)
- `/portal`, `/portal/invoices/:id`, `/portal/proposals/:id`.

### I. Payment Callbacks (3 Pages)
- `/payment/success`, `/payment/pending`, `/payment/failed`.

### J. System & Error Pages (31 Pages)
- `/403`, `/404`, `/500`, `/error-404`, `/error-500`, `/maintenance`, `/offline`, `/system-states`, `/og-preview`, etc.

---

## 5. Reusable Component Inventory

Analysis of common UI patterns discovered across all audited pages:

| Pattern Name | Description | Current Occurrence | Current State | Reusable Target |
|---|---|---:|---|---|
| **PageHeader** | Breadcrumb navigation, title, icon badge, subtitle description, and action button group | 70+ pages | Inconsistent inline flex wrappers (`border-b pb-4`) | Standardized `PageHeader` composite |
| **StatCard / MetricCard** | KPI metric card with icon container, metric value, delta indicator badge, and subtitle | 50+ pages | Mixed legacy classes, custom cards, duplicate inline grids | Standardized `StatCard` & `StatsOverviewGrid` |
| **FilterToolbar** | Search input, filter selects, view mode toggles (List/Grid/Calendar), and export triggers | 40+ pages | Copy-pasted `bg-muted/40 p-2 rounded-xl border` containers | Standardized `FilterToolbar` composite |
| **ConfirmationDialog** | Accessible deletion/destructive action modal with warning copy and cancel/confirm buttons | 100+ pages | 45+ unstyled `window.confirm()` calls, 55+ bespoke inline Dialogs | Standardized `ConfirmationDialog` |
| **LoadingState** | Skeleton and spinner loading containers for tables, cards, and stat grids | 89 pages | Inline `Loader2` spinners; existing `LoadingState` ignored | Broad adoption of existing `LoadingState` |
| **ErrorState** | Formatted error card with message copy, trace toggle, and retry button | 60+ pages | Inconsistent toasts or silent failures; `ErrorState` ignored | Broad adoption of existing `ErrorState` |
| **FormSection / FormGrid** | Grouped form field containers with section headings and responsive column grids | 35+ modals | Inconsistent form spacing and label alignment | Standardized `FormSection` layout helper |

---

## 6. UIAble Compatibility Matrix

| Project UI Pattern | UIAble Equivalent Reference | UIAble Block / Category | Compatibility Classification | Implementation Strategy |
|---|---|---|---|---|
| **Page Header** | `@uiable/navbar`, `block-navbar` | `navbar` | **POSSIBLE_MATCH** | Create lightweight `PageHeader` using Wave 1 `Button`, `Badge`, and `Breadcrumb`. |
| **KPI Stat Card** | `@uiable/statistics`, `block-statistics-1` | `statistics` | **EXACT_MATCH** | Standardize `StatCard` using Wave 1 `Card`, `Badge`, and UIAble rounded elevation tokens. |
| **Filter Toolbar** | `@uiable/input-group`, `@uiable/field` | `component-layout` | **EXACT_MATCH** | Compose using Wave 1 `Input`, `Select`, `Button` with modern pill styling. |
| **Confirmation Modal** | `@uiable/alert-dialog` | `alert-dialog` | **EXACT_MATCH** | Build canonical `ConfirmationDialog` wrapper over `@radix-ui/react-alert-dialog`. |
| **Empty State** | `@uiable/empty` | `empty` | **EXACT_MATCH** | Already implemented in Wave 1 (`src/components/ui/empty.tsx`). Extend adoption across pages. |
| **Skeleton Loading** | `@uiable/skeleton`, `block-statistics` | `widgets` | **EXACT_MATCH** | Already implemented in `src/components/system-states/loading-state.tsx`. Wire into pages. |
| **Entity Cards** | `@uiable/card`, `block-bento` | `bento` | **EXACT_MATCH** | Standardize using Wave 1 `Card` with UIAble hover borders (`hover:border-primary/40`). |

---

## 7. Business Logic Protection Matrix

Every audited page and domain is classified under strict protection tiers:

| Tier | Domain | Core Protected Behaviors | Allowed Changes in Wave 4 |
|---|---|---|---|
| **TIER 1 (CRITICAL)** | **Payments & Transactions** (`/super/transactions`, `/subscription`, `/payment/*`) | Payment proof uploads, manual verify/reject RPC, Razorpay/Stripe webhooks, billing cycles, invoice PDF generation | **READ-ONLY AUDIT ONLY.** Zero structural or logic modifications. Visual polish only if explicitly isolated. |
| **TIER 2 (CRITICAL)** | **Payroll & Statutory** (`/payroll`, `/payroll-runs`, `/salary-settings`, workspaces) | Salary formulas, TDS/EPF/ESI statutory calculations, bank disbursement batches, official compliance tax forms | **LOCKED.** Must not be touched in Wave 4. Defer to future dedicated payroll wave. |
| **TIER 3 (HIGH)** | **Accounting & Ledgers** (`/accounting`, `/chart-of-accounts`, `/budgets`) | Double-entry journal balances, debit/credit integrity, tax rates, financial statements | **LOCKED.** Preserved under Wave 2 `DataTable` integration. |
| **TIER 4 (CRITICAL)** | **Security & Auth** (`/auth`, `/super-login`, `/verify-2fa`, RBAC checks) | Session cookie storage, JWT handling, email OTP verification, tenant domain isolation (`isTenantWorkspaceHost`) | **LOCKED.** Zero changes to route guards, session hooks, or auth pipelines. |
| **TIER 5 (LOW/MEDIUM)** | **Entity Listings & Operations** (`/announcements`, `/holidays`, `/departments`, `/designations`, `/policies`) | CRUD mutations, query invalidation, table listings, filters, modal forms | **SAFE FOR STAGE B.** Visual modernization, header standardization, stat card integration, responsive refinement. |

---

## 8. Form UI Audit

Audit of entity creation, editing, and setting forms across 35+ pages:

### Current Form Patterns
- Almost all forms are rendered inside modals via `<Dialog open={...} onOpenChange={...}>`.
- Form controls primarily consume Wave 1 primitives:
  - `<Input>` for text, dates, numbers, passwords.
  - `<Select>` for dropdown choices (departments, categories, priorities).
  - `<Textarea>` for multi-line notes, descriptions, policies.
  - `<Switch>` for boolean toggles (active status, mandatory flag).
- Submissions rely on `@tanstack/react-query` `useMutation` with `isPending` state handling.

### Identified Inconsistencies & Friction Points
1. **Inconsistent Grid Layouts:** Some forms use `space-y-4`, others use `grid grid-cols-1 sm:grid-cols-2 gap-3`, and others use raw inline flex containers.
2. **Missing Field Feedback:** Many forms only trigger sonner toasts upon failure without highlighting invalid inputs inline.
3. **Inconsistent Modal Footers:** Some dialogs place the submit button on the left, others on the right; some lack loading spinners on the submit button while mutations are pending.

---

## 9. Dashboard UI Audit

Audit of the 15 primary dashboard pages:

| Dashboard Route | Layout Architecture | Data Visualizations | KPI Cards | Table / Activity Displays | Responsive Status |
|---|---|---|---|---|---|
| `/hrm-dashboard` | 12-col desktop grid | ApexCharts Donut & Bar | 5 KPI cards (Total Workforce, Leave, Attendance, Openings, Payroll) | Attendance summary, quick employee table | **VERIFIED** — Needs card token normalization |
| `/super` | 12-col platform grid | Tenant MRR & Subscription trends | 4 Platform stat cards | Recent tenant signups, platform alerts | **VERIFIED** |
| `/crm-dashboard` | Multi-row card grid | Lead conversion funnel | 4 Lead/Pipeline cards | Deal stage Kanban, top accounts | **VERIFIED** |
| `/finance-dashboard` | Split summary cards | Cash flow line chart | 4 Revenue/Expense cards | Recent transactions, aging invoices | **VERIFIED** |
| `/pos` | Split terminal layout | Realtime cash totals | Category pill tabs | Live product grid + sticky right receipt cart | **VERIFIED** |
| `/inventory-dashboard` | KPI grid + alerts | Stock valuation chart | 4 Inventory KPI cards | Low stock warning table, recent purchases | **VERIFIED** |
| `/projects-dashboard` | Task velocity grid | Milestone progress bars | 4 Project health cards | Active project list, overdue tasks | **VERIFIED** |
| `/analytics-dashboard` | Multi-chart grid | Recharts Area & Bar | 4 Workforce analytics cards | Department distribution table | **VERIFIED** |
| `/recruitment-dashboard`| Split pipeline | Applicant trend line | 4 Job opening cards | Candidate stage board, upcoming interviews | **VERIFIED** |
| `/helpdesk-dashboard` | Ticket queue grid | SLA resolution chart | 4 Support metric cards | Open ticket priority table, agent activity | **VERIFIED** |

---

## 10. Payment / Billing UI Audit

Detailed audit of payment surfaces:
- **`/super/transactions`:** Hardened with 5 dedicated modal workflows (Details, Verification, Rejection Reason, Invoice PDF, Payment Proof Viewer). Preserved 100% of socket updates and verification modes (`AUTOMATIC` / `MANUAL`).
- **`/subscription`:** Multi-tiered subscription plan cards (`SubscriptionPlanCard`), current plan status pill, invoice history table, and addon marketplace links. Integrates `PaymentCheckoutModal`.
- **`/portal/invoices/:id`:** Public read-only client invoice viewer with instant payment trigger and PDF receipt download.
- **Verdict:** Highly sensitive financial domain. **LOCKED** against arbitrary visual churn.

---

## 11. Payroll UI Audit

Detailed audit of the payroll domain:
- **Routes:** `/payroll`, `/payroll-runs`, `/salary-settings`, `/payslip-report`.
- **Workspaces:**
  - `BankDisbursementWorkspace`: Direct NEFT/RTGS wire batch generation, bank account validation.
  - `StatutoryReturnsWorkspace`: Form 24Q, ESI returns, EPF electronic challan receipt generation.
  - `TaxVerificationWorkspace`: Section 80C, 80D, HRA proof inspection and tax regime toggles.
  - `FbpWorkspace`: Flexible benefits allocation and tax exemption limits.
- **Verdict:** 100% **BUSINESS_LOGIC_PROTECTED**. Must NOT be included in Wave 4 page migrations.

---

## 12. Accounting UI Audit

Detailed audit of accounting surfaces:
- **Routes:** `/accounting`, `/chart-of-accounts`, `/budgets`.
- **Components:** `chart-of-accounts-table.tsx`, `financial-statements-view.tsx`, `bank-accounts-manager.tsx`.
- **Verdict:** Highly sensitive general ledger data. Already integrated with elevated Wave 2 `DataTable`. **LOCKED**.

---

## 13. Responsive UI Audit

Evaluation across responsive viewports:

| Breakpoint | Viewport Width | Typical Layout State | Hazard Identified |
|---|---|---|---|
| **Large Desktop** | 1440px | Full 250px DreamsSidebar, multi-column dashboard grids | None. Generous spacing. |
| **Standard Desktop** | 1280px | Standard sidebar, 4-column KPI grids (`grid-cols-4`) | None. Clean alignment. |
| **Tablet Landscape** | 1024px | 2-column or 3-column adapted grids | Ensure stat card text does not truncate awkwardly. |
| **Tablet Portrait** | 768px | Off-canvas drawer, 2-column KPI grids (`sm:grid-cols-2`) | Filter toolbars must wrap into column flex layouts (`flex-col sm:flex-row`). |
| **Mobile** | 375px | Single-column stack, mobile drawer, sticky bars | Action button toolbars must use `flex-wrap` to avoid horizontal overflow. |

---

## 14. Visual Inconsistency Inventory

Specific inconsistencies documented across the current codebase:

1. **Header Rendering:**
   - Some pages use custom breadcrumbs with `<Link>` and Lucide `<ChevronRight>`, while others omit breadcrumbs entirely.
   - Some page titles use `text-2xl font-black`, others use `text-3xl font-bold`, and others use legacy `.page-title` CSS classes.
2. **KPI Stat Cards:**
   - `hrm-dashboard.tsx` uses legacy `bg-white dark:bg-slate-900 border border-border-color rounded-md`.
   - `announcements.tsx` uses `<Card className="p-3.5 border shadow-2xs bg-card space-y-1">`.
   - `holidays.tsx` uses `<Card className="p-4 border shadow-xs bg-card flex items-center gap-3">`.
   - Result: 3 completely different card styles for identical metric representations across adjacent pages!
3. **Filter Toolbars:**
   - Search inputs vary in height (`h-7`, `h-8`, `h-9`).
   - Some dropdowns use Wave 1 `<Select>`, others use raw HTML `<select>`, others use button groups.
4. **Delete Confirmations:**
   - Over 45 pages invoke raw browser `if (confirm("Delete this ...?")) deleteMut.mutate(...)`.
   - Breaks mobile web usability and provides no visual harmony.
5. **Loading States:**
   - 89 pages render unstyled inline spinners: `<div className="text-center p-8"><Loader2 className="animate-spin" /></div>`.
   - None leverage the pre-built `LoadingState` table or card skeleton variants.

---

## 15. Migration Priority Matrix

| Priority | Target Item | Type | Consumers | UIAble Match | Risk | Primary Reason |
|---|---|---|---:|---|---|---|
| **P0** | **Reusable `PageHeader` Component** | Composite Adapter | 70+ | `@uiable/navbar` | `LOW` | Eliminates massive layout duplication; establishes unified breadcrumb, title, and action bar styling across all pages. |
| **P0** | **Reusable `StatCard` & `StatsOverviewGrid`** | Composite Adapter | 50+ | `@uiable/statistics` | `LOW` | Replaces fragmented legacy card classes with unified UIAble-style metric cards and responsive 4-col grids. |
| **P0** | **Reusable `FilterToolbar` Component** | Composite Adapter | 40+ | `@uiable/input-group` | `LOW` | Standardizes search input, filter dropdowns, and export buttons across entity listing pages. |
| **P0** | **Reusable `ConfirmationDialog` Component** | Feedback Primitive | 100+ | `@uiable/alert-dialog` | `LOW` | Eradicates jarring native browser `window.confirm()` calls with accessible, styled destructive action dialogs. |
| **P0** | **`LoadingState` / `ErrorState` Integration** | System State Adapter | 89+ | `@uiable/skeleton` | `LOW` | Connects dormant system state primitives into page loading/error flows for smooth skeleton animations. |
| **P1** | **`announcements.tsx`** | Application Page | 1 | `block-bento` / `cards` | `LOW` | Company broadcasts page. High visibility, rich card UI, low business logic risk. Ideal Batch 1 pilot. |
| **P1** | **`holidays.tsx`** | Application Page | 1 | `cards` / `data-table` | `LOW` | Holiday calendar & list page. Uses KPI cards, list/calendar toggle, export CSV, and deletion. Ideal Batch 1 pilot. |
| **P1** | **`departments.tsx`** | Application Page | 1 | `cards` / `data-table` | `LOW` | Core organizational structure. Clean CRUD modal forms, department cards, division counts. |
| **P1** | **`designations.tsx`** | Application Page | 1 | `cards` / `data-table` | `LOW` | Job title & hierarchy management. Standard listing, search filter, creation modal. |
| **P1** | **`policies.tsx`** | Application Page | 1 | `doc-layout` / `cards` | `LOW` | Company policy viewer & acknowledgments. Document card grid, download triggers. |
| **P2** | `assets.tsx` / `asset-dashboard.tsx` | Pages & Dashboards | 2 | `cards` / `tables` | `MEDIUM` | Asset tracking, allocations, status badges. |
| **P2** | `training.tsx` / `trainers.tsx` | Application Pages | 2 | `cards` / `tables` | `LOW` | Training program enrollments, progress bars, trainer profiles. |
| **P2** | `warnings.tsx` / `transfers.tsx` | Application Pages | 2 | `tables` / `forms` | `MEDIUM` | Disciplinary warnings and departmental transfers. |
| **P2** | `todo.tsx` / `notes.tsx` | Personal Productivity | 2 | `widgets` / `bento` | `LOW` | Kanban task items, quick scratch notes. |
| **P3** | `/payroll` & Workspaces | Financial Engine | 5 | None | `CRITICAL` | Mission-critical salary, tax, and banking calculations. **DO NOT MIGRATE IN WAVE 4.** |
| **P3** | `/super/transactions` | Billing & Payments | 1 | `data-table-basic` | `CRITICAL` | Financial verification, manual approve/reject. **PRESERVED AS LOCKED.** |
| **P3** | `/subscription` | Checkout & Licenses | 1 | `block-pricing` | `CRITICAL` | Gateway checkout flows, subscription status. **PRESERVED AS LOCKED.** |
| **P3** | `/accounting` & Ledger Suites | Accounting Engine | 3 | `tables` | `HIGH` | Financial statements, GL chart of accounts. **PRESERVED AS LOCKED.** |
| **P3** | `/auth` & Authentication Suite | Security & Session | 6 | `login` / `auth` | `CRITICAL` | Session tokens, 2FA OTP, authentication flows. **PRESERVED AS LOCKED.** |

---

## 16. Recommended Wave 4 Stage B Scope

In accordance with Section 21 of the specification, **do not attempt dozens of simultaneous page migrations**.

We recommend a tightly controlled, high-leverage **Batch 1 (5 Targets)**:

### Target 1: Reusable Page Composites (`PageHeader`, `StatCard`, `FilterToolbar`, `ConfirmationDialog`)
1. **Why this target?** Solves 80% of the visual inconsistency across the application in a single stroke, enabling all subsequent page migrations to consume proven, tested building blocks.
2. **What visual improvement?** Unified typography hierarchy, consistent icon containers, sleek card elevation (`shadow-2xs border-border/70`), elegant pill badges, and accessible modal confirmation dialogs.
3. **How many consumers?** 70+ potential consumers for `PageHeader`, 50+ for `StatCard`, 40+ for `FilterToolbar`, 100+ for `ConfirmationDialog`.
4. **What UIAble pattern?** `@uiable/navbar`, `@uiable/statistics`, `@uiable/input-group`, `@uiable/alert-dialog`.
5. **What existing primitives?** Wave 1 `Button`, `Badge`, `Card`, `Input`, `Select`, and `@radix-ui/react-alert-dialog`.
6. **What business risk?** `LOW`. Pure visual/layout presentation layer with zero state side effects.
7. **What must remain untouched?** Consumer event handlers, query keys, and routing.
8. **How will it be tested?** Component unit tests + live headless browser QA across responsive breakpoints.

### Target 2: `announcements.tsx` (Company Announcements & Broadcasts)
1. **Why this target?** Highly visible social/operational hub with rich cards, priority badges, category filters, and modal creation. Zero complex backend financial calculations.
2. **What visual improvement?** Replace ad-hoc header with `PageHeader`, standardize 4 KPI metric cards with `StatCard`, harmonize search/filter toolbar, and replace inline dialogs with Wave 1 tokens.
3. **How many consumers?** 1 primary route (`/_app/announcements`), accessible by all tenant employees and admins.
4. **What UIAble pattern?** `block-bento`, `@uiable/card`, `@uiable/badge`.
5. **What existing primitives?** Wave 1 `Card`, `Button`, `Badge`, `Input`, `Textarea`, `Dialog`.
6. **What business risk?** `LOW`. Standard CRUD operations on announcements table.
7. **What must remain untouched?** Acknowledgement mutation (`/announcements/:id/acknowledge`), pinning logic, author resolution.
8. **How will it be tested?** Browser QA verifying announcement creation, filtering by category, search querying, and acknowledgement recording.

### Target 3: `holidays.tsx` (Holidays Management & Calendar)
1. **Why this target?** Clean representative of entity listing with KPI cards, List vs Calendar view modes, CSV export, and deletion.
2. **What visual improvement?** Unify header, convert 4 metric cards to `StatCard`, upgrade List/Calendar toggle buttons, replace browser `window.confirm` with `ConfirmationDialog`.
3. **How many consumers?** 1 primary route (`/_app/holidays`), consumed across HRM operations.
4. **What UIAble pattern?** `@uiable/statistics`, `@uiable/button-group`, `@uiable/table`.
5. **What existing primitives?** Wave 1 `Button`, `Badge`, `Card`, `Input`, `Dialog`, `Table`.
6. **What business risk?** `LOW`.
7. **What must remain untouched?** Date formatting, CSV export encoding, CRUD mutations.
8. **How will it be tested?** Browser QA testing holiday creation, CSV download trigger, List/Calendar toggle, and delete flow.

### Target 4: `departments.tsx` (Departments & Divisions)
1. **Why this target?** Foundational workforce structure page with department cards/table, division head badges, and employee count pills.
2. **What visual improvement?** Modernize top header and KPI summary cards, elevate department cards with subtle UIAble border hover effects, polish creation modal.
3. **How many consumers?** 1 primary route (`/_app/departments`).
4. **What UIAble pattern?** `@uiable/card`, `@uiable/statistics`.
5. **What existing primitives?** Wave 1 `Card`, `Badge`, `Button`, `Input`, `Dialog`.
6. **What business risk?** `LOW`.
7. **What must remain untouched?** Department parent-child relationships, employee count queries.
8. **How will it be tested?** Browser QA testing department listing, modal creation, and search filtering.

### Target 5: `designations.tsx` (Job Titles & Designations)
1. **Why this target?** Pair to `departments.tsx`. Simple, clean entity listing with search, category filters, and modal creation.
2. **What visual improvement?** Modernize page header, standardize KPI cards, refine table styling, replace inline deletion with `ConfirmationDialog`.
3. **How many consumers?** 1 primary route (`/_app/designations`).
4. **What UIAble pattern?** `@uiable/table`, `@uiable/statistics`, `@uiable/alert-dialog`.
5. **What existing primitives?** Wave 1 `Table`, `Badge`, `Button`, `Input`, `Dialog`.
6. **What business risk?** `LOW`.
7. **What must remain untouched?** Role associations, CRUD mutations.
8. **How will it be tested?** Browser QA verifying designation creation, search filtering, and deletion.

---

## 17. Out of Scope Findings

The following issues were observed during the read-only audit but are deliberately **OUT OF SCOPE** for Wave 4:
1. **Native `window.confirm()` Proliferation:** 45+ files invoke raw `window.confirm()`. While `ConfirmationDialog` will be introduced to solve this on modernized pages, a whole-app cleanup is out of scope.
2. **Dormant System State Adoption:** `LoadingState` and `ErrorState` are fully functional in `src/components/system-states/` but not yet wired into older routes. They will be integrated incrementally onto modernized pages.
3. **Legacy Dreams Template CSS:** Classes like `.page-title`, `.btn-sm`, `.bg-dark`, and `.border-border-color` linger in older template pages (e.g. `hrm-dashboard.tsx`). They do not cause runtime errors and must not be touched until their specific pages are scheduled for migration.
4. **SuperLoginPage Bundler Advisory:** Vite outputs an informational advisory regarding code-splitting for `SuperLoginPage` in `super-login.tsx`. Unrelated to page UI migration.
5. **Vitest `__dirname` Advisory:** Vitest outputs a native configLoader warning on `vitest.config.mjs`. Tests run cleanly.

---

## 18. Risk Assessment

| Scope | Risk Level | Justification |
|---|---|---|
| **Recommended Batch 1 (Composites + 4 Entity Pages)** | **LOW** | 100% presentation-layer modernization; no financial, statutory, or security data; standard CRUD queries only; validated against Wave 1 & Wave 2 primitives. |
| **Complex Dashboards (HRM, CRM, Analytics)** | **MEDIUM** | Rich data charts and multiple live API hooks. Safe if data fetching is strictly untouched. |
| **Financial & Accounting Pages** | **HIGH** | Double-entry balance integrity and ledger mutations. Protected under Wave 2 baseline. |
| **Payroll & Payments** | **CRITICAL** | Irreversible financial wires, tax compliance, and gateway transactions. Strictly **LOCKED**. |

---

## 19. Stage A Completion Gate

```text
[x] 212 application routes audited and cataloged across 10 distinct portals
[x] 584 components inventoried and mapped to UIAble equivalents
[x] Reusable page-level composite gaps identified (PageHeader, StatCard, FilterToolbar, ConfirmationDialog)
[x] Protection tiers established for Payments, Payroll, Accounting, and Security
[x] Form, Dashboard, Payment, Payroll, and Accounting UI audited in detail
[x] Visual inconsistencies documented (headers, cards, filters, confirm dialogs, loaders)
[x] Priority matrix established (P0, P1, P2, P3)
[x] Recommended Stage B Batch 1 defined (Composites + 4 low-risk entity pages)
[x] Out of scope findings recorded without cleanup
[x] Zero source code modifications made during Stage A
[x] Current TypeScript, build, and test baselines verified 100% clean
```

---

## Sign-Off

```text
WAVE 4 STAGE A COMPLETE
```
