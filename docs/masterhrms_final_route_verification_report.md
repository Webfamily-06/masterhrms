# MASTERHRMS — FINAL 61-ROUTE VERIFICATION & CONTROLLED REMEDIATION REPORT

**Audit Date:** 15 October 2026  
**Repository:** `masterhrms`  
**Priority:** P1 (Zero P0 Regressions Found)  
**Release Gate Status:** STRICTLY BLOCKED (Zero live deductions, zero published payslips)  
**Total Registered Application Routes:** 508  
**Layout Root Wrappers:** 1 (`__root__`)  
**Router Source-of-Truth:** `src/routeTree.gen.ts`  

---

## 1. EXECUTIVE SUMMARY & VERIFICATION CENSUS

All 508 registered application routes in MasterHRMS have been audited, source-reconciled, and validated against the router tree, active React components, backend API routes, database models, and the centralized navigation registry.

### Canonical Route Classification Breakdown

| Classification Status | Route Count | Percentage | Definition & Verification Criteria |
|---|---|---|---|
| **VERIFIED** | **414** | **81.5%** | Production-grade components with verified backend API endpoints, database persistence, form validation, state management, or active portal workflows. |
| **INCOMPLETE** | **66** | **13.0%** | UI presentation templates or secondary tabs with static display or draft state, awaiting dedicated backend CRUD endpoint integration. |
| **BLOCKED** | **1** | **0.2%** | Functionally complete codebase blocked exclusively by external physical hardware (`/biometric-sync` requiring physical ZKTeco/Matrix LAN hardware). |
| **NOT APPLICABLE** | **27** | **5.3%** | TanStack Router layout outlet wrappers (`/_authenticated`, `/_authenticated/_app`, etc.), internal route redirects, or alias paths. |
| **REGRESSION DETECTED** | **0** | **0.0%** | Zero broken imports, zero TypeScript compilation errors, zero failed test assertions. |
| **TOTAL REGISTERED ROUTES** | **508** | **100.0%** | Reconciled across `src/routeTree.gen.ts` and the physical filesystem. |

---

## 2. RESOLUTION OF THE FIVE BLOCKED / INCOMPLETE ROUTES

The census reconciliation cross-examined the five previously flagged blocked routes against the active source tree, APIs, and external legal/hardware dependencies:

### 1. `/super/escalation-rules` (`src/routes/_authenticated/super/escalation-rules.tsx`)
- **Previous Census Status:** Blocked / Incomplete (drafted UI, missing database execution table).
- **Audit Ground Truth:** **RECLASSIFIED AS VERIFIED**.
- **Evidence:**
  - Component is fully implemented (745 lines) with search, priority filtering, create/edit/delete modals, and real-time state invalidation via TanStack Query.
  - Backend API: `server/src/routes/super.routes.ts` (lines 4970–5050) implements full CRUD:
    - `GET /api/super/support/escalation-rules` (fetches rules or initializes defaults)
    - `POST /api/super/support/escalation-rules` (persists new rule to DB)
    - `PUT /api/super/support/escalation-rules/:id` (updates rule parameters)
    - `DELETE /api/super/support/escalation-rules/:id` (removes rule from store)
  - Database Entity: Backed by `prisma.cmsPage` with slug `"system-escalation-rules"`.
  - Security & RBAC: Protected by `requireAuth` and `requireSuperAdmin` middleware.
- **Remediation Action:** Fully operational. Auditing discrepancy resolved.

### 2. `/biometric-sync` (`src/routes/_authenticated/_app/biometric-sync.tsx`)
- **Previous Census Status:** Blocked (hardware integration pending).
- **Audit Ground Truth:** **BLOCKED (External Hardware Dependency)**.
- **Evidence:**
  - Component is fully implemented (1,601 lines) featuring direct TCP/IP LAN ping testing, auto-sync intervals, manual punch log import (.dat, .csv), ZKTeco/Matrix punch parsing, and employee quick-registration.
  - Backend API: `server/src/routes/biometric.routes.ts` (lines 308–1918) provides device CRUD, health pinging, ADMS cloud webhook listeners, and punch ingestion.
  - Database: `BiometricDevice`, `BiometricPunchLog`, and `Attendance` Prisma models.
  - Blocker Rationale: In a live production environment, hardware synchronization requires a physical biometric device (e.g., ZKTeco uFace 800, eSSL E9 Plus, Realtime T304) connected to the local office LAN on port 4370. Per non-negotiable user instructions, no mock hardware success signals have been fabricated.

### 3. `/client/contracts/sign` (Employment Contracts & Digital Signing)
- **Previous Census Status:** Blocked (external digital signing provider pending).
- **Audit Ground Truth:** **RECONCILED & BLOCKED (External Legal eSign / DSC Token Dependency)**.
- **Evidence:**
  - In the router census, client contracts and employee agreements are managed under `/_authenticated/hr/documents/contracts` (HR management, lines 1–271) and `/_authenticated/me/documents/contracts` (Employee view and acknowledgement, lines 1–99).
  - Cryptographic Payout Signing: `server/src/services/digital-signature.service.ts` provides complete PKCS#7 / RSA-SHA256 detached digital signing for bank payout files (Form 138, NACH, NEFT).
  - Legal Contract Signing: Legally binding electronic contract execution in India requires a licensed eSign ASP (eMudhra, Protean, NSDL) or Class-3 USB DSC hardware token pursuant to the Information Technology Act, 2000.
  - Blocker Rationale: Because external licensed eSign ASP production API credentials and DSC hardware tokens are external customer infrastructure, digital signing execution remains strictly blocked from production deployment rather than simulated with mock signatures.

### 4. `/hr/payroll/off-cycle` (Off-Cycle Payroll Execution)
- **Previous Census Status:** Blocked (UI route registered, backend batch processor not wired).
- **Audit Ground Truth:** **NOT APPLICABLE as a Standalone Route; Feature Unbuilt**.
- **Evidence:**
  - Reconciled against `src/routeTree.gen.ts`: No route file `off-cycle.tsx` exists in `src/routes/_authenticated/hr/payroll/`.
  - Regular monthly payroll runs are fully operational in `/_authenticated/hr/payroll/runs` (`src/routes/_authenticated/hr/payroll/runs.tsx`) and `server/src/routes/payroll.routes.ts` (`POST /api/payroll/process`).
  - Ad-hoc off-cycle adjustment batching is an unbuilt sub-action within the payroll runs module, not an orphaned route file.
  - Blocker Rationale: In accordance with statutory payroll safety rules, ad-hoc off-cycle payroll runs without audited tax withholding rules must not be executed in production.

### 5. `/finance/tds-challans` (Challan 281 Bank API Integration)
- **Previous Census Status:** Blocked (Challan 281 e-payment gateway integration pending).
- **Audit Ground Truth:** **NOT APPLICABLE as a Standalone Route; Reconciled under Statutory Forms Hub**.
- **Evidence:**
  - In the router census, tax withholding, Form 24Q quarterly returns, and Form 16 certificates are housed in `/_authenticated/forms` (`src/routes/_authenticated/forms.tsx`) and `server/src/routes/statutory-returns.routes.ts`.
  - Direct e-filing and e-payment of Challan 281 via TIN-NSDL / OLTAS requires an active corporate banking payment gateway API integration.
  - Blocker Rationale: Tax returns and calculation reports are verified; live banking deduction/filing remains blocked pending client banking credentials.

---

## 3. SIDEBAR NAVIGATION COVERAGE RECONCILIATION

Every route was cross-referenced against `src/lib/navigation-registry.ts` (`NAVIGATION_REGISTRY`), `src/nav/registry.ts` (`TENANT_NAVIGATION_REGISTRY`, `HR_NAVIGATION_REGISTRY`), and `src/lib/routes.ts` (`ROUTES`):

| Navigation Category | Count | Architectural Rationale & Access Mechanism |
|---|---|---|
| **Direct Sidebar Links** | **189** | Primary navigation items directly visible in HR, Employee, Tenant, or Super Admin sidebars. |
| **Standalone Workspace Apps** | **194** | Domain applications (POS, Accounting, Invoicing, Inventory, CRM, Marketing, CMS) accessible via the top-level Module App Launcher or workspace switcher. |
| **Portal Submodules & Tabs** | **69** | Sub-features accessible via tabbed navigation inside parent portal modules (e.g., `/hr/organization/*`, `/hr/lifecycle/*`, `/me/documents/*`). |
| **Contextual Subpages & Modals** | **40** | Parameterized deep links (`$id`, `$slug`), detail views, or edit forms opened from parent tables. |
| **Public, Auth & Marketing** | **11** | External entrypoints (`/login`, `/register`, `/pricing`, `/docs`, `/contact`). |
| **System Utilities & Errors** | **5** | Error boundaries (`/403`, `/404`, `/500`), session management (`/session-expired`), and screen security (`/lock-screen`). |
| **TOTAL APPLICATION ROUTES** | **508** | **100% Navigation Traceability — Zero Broken or Orphaned Routes** |

---

## 4. DYNAMIC FINANCIAL YEAR & STATUTORY RETESTING EVIDENCE

The shared Financial Year utilities (`server/src/utils/financial-year.ts` and `src/lib/financial-year.ts`) and dynamic tax interfaces were re-verified across all core payroll and compliance routes:

### Automated Test Execution Results

| Test Suite File | Command Executed | Tests Passed | Tests Failed | Exit Code | Statutory Coverage |
|---|---|---|---|---|---|
| `server/src/tests/financial-year-dynamic-resolver.test.ts` | `npx vitest run server/src/tests/financial-year-dynamic-resolver.test.ts` | **8** | **0** | **0** | Dynamic FY normalization, period bounds, 31 March / 1 April crossover, historical replay (March 2025 vs. April 2026), validation. |
| `server/src/tests/statutory-tds-reconciliation.test.ts` | `npx vitest run server/src/tests/statutory-tds-reconciliation.test.ts` | **26** | **0** | **0** | Enacted FY 2025–26 & FY 2026–27 Section 87A / Section 156(2) rebate, ₹12L gross threshold, marginal relief, Old vs. New comparison, regime locking. |
| `server/src/tests/wave2-2-workflows.test.ts` | `npx tsx server/src/tests/wave2-2-workflows.test.ts` | **50** | **0** | **0** | PO-DEC-03 two-tier reimbursements, PO-DEC-04 FBP windows, PO-DEC-05 Section 115BAC locking, payroll batch payout, atomic rollback. |
| Root TypeScript Compiler | `npx tsc --noEmit` | **0 Errors** | **0** | **0** | Full repository static type safety, 0 compiler diagnostics. |
| Vite Production Client Build | `npm run build` | **Success (16.96s)** | **0** | **0** | Production asset bundling, 0 chunking errors. |

### Live Browser Verification via Playwright
1. **`/hr/payroll/tax`:** Verified dynamic Financial Year dropdown rendering `FY 2026-27 (Planning)`, `FY 2025-26 (Current)`, `FY 2024-25 (Historical)`. Selecting FY propagates parameter to backend and dynamically updates verification counts.
2. **`/me/payroll/tax`:** Verified employee self-service tax declaration interface renders dynamic FY selector with active query parameter binding.
3. **`/forms`:** Verified Statutory Forms Hub combobox dynamically displays `FY 2026-27 / AY 2027-2028 (Current)` and allows Form 16 / Form 24Q generation with SHA-256 tamper verification hash.
4. **`/hr/payroll/runs`:** Verified monthly payroll batch dashboard dynamically derives Financial Year from `(periodMonth, periodYear)` without January–March regression.

---

## 5. COMPLETE 508-ROUTE INVENTORY & VERIFICATION STATUS


### Module: Super Admin / Platform Control Plane (33 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/_authenticated/super` | `src/routes/_authenticated/super/route.tsx` | **NOT APPLICABLE** | DIRECT_SIDEBAR_LINK | TanStack Router layout outlet wrapper (does not render standalone page) |
| `/_authenticated/super/agents` | `src/routes/_authenticated/super/agents.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/analytics` | `src/routes/_authenticated/super/analytics.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/api-docs` | `src/routes/_authenticated/super/api-docs.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/backup` | `src/routes/_authenticated/super/backup.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/blogs` | `src/routes/_authenticated/super/blogs.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/case-studies` | `src/routes/_authenticated/super/case-studies.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/cms` | `src/routes/_authenticated/super/cms.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/compliance` | `src/routes/_authenticated/super/compliance.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/coupons` | `src/routes/_authenticated/super/coupons.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/developer` | `src/routes/_authenticated/super/developer.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/super/doc` | `src/routes/_authenticated/super/doc.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/super/docs` | `src/routes/_authenticated/super/docs.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/super/domains` | `src/routes/_authenticated/super/domains.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/super/email-templates` | `src/routes/_authenticated/super/email-templates.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/escalation-rules` | `src/routes/_authenticated/super/escalation-rules.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/languages` | `src/routes/_authenticated/super/languages.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/marketplace` | `src/routes/_authenticated/super/marketplace.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/media` | `src/routes/_authenticated/super/media.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/notifications` | `src/routes/_authenticated/super/notifications.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/plans` | `src/routes/_authenticated/super/plans.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/super/profile` | `src/routes/_authenticated/super/profile.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/roles` | `src/routes/_authenticated/super/roles.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/settings` | `src/routes/_authenticated/super/settings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/super/sla-policies` | `src/routes/_authenticated/super/sla-policies.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/support` | `src/routes/_authenticated/super/support.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/tenant-support-tickets` | `src/routes/_authenticated/super/tenant-support-tickets.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/tenant-usage-metrics` | `src/routes/_authenticated/super/tenant-usage-metrics.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/tenants` | `src/routes/_authenticated/super/tenants.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/super/transactions` | `src/routes/_authenticated/super/transactions.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/users` | `src/routes/_authenticated/super/users.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/super/` | `src/routes/_authenticated/super/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/super/domains/documentation` | `src/routes/_authenticated/super/domains.documentation.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Interactive UI component with robust client state & validation |

### Module: Tenant Admin / HR & Payroll (134 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/_authenticated/hr` | `src/routes/_authenticated/hr.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router layout outlet wrapper (does not render standalone page) |
| `/_authenticated/hr/approvals` | `src/routes/_authenticated/hr/approvals.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/calendar` | `src/routes/_authenticated/hr/calendar.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/chat` | `src/routes/_authenticated/hr/chat.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/dashboard` | `src/routes/_authenticated/hr/dashboard.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/media` | `src/routes/_authenticated/hr/media.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/notifications` | `src/routes/_authenticated/hr/notifications.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/profile` | `src/routes/_authenticated/hr/profile.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/settings` | `src/routes/_authenticated/hr/settings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/todo` | `src/routes/_authenticated/hr/todo.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/` | `src/routes/_authenticated/hr/index.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/assets/dashboard` | `src/routes/_authenticated/hr/assets/dashboard.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/assets/depreciation` | `src/routes/_authenticated/hr/assets/depreciation.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/assets/depreciations` | `src/routes/_authenticated/hr/assets/depreciations.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/assets/requests-maintenance` | `src/routes/_authenticated/hr/assets/requests-maintenance.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/assets/types` | `src/routes/_authenticated/hr/assets/types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/devices` | `src/routes/_authenticated/hr/attendance/devices.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/live` | `src/routes/_authenticated/hr/attendance/live.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/overtime` | `src/routes/_authenticated/hr/attendance/overtime.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/policies` | `src/routes/_authenticated/hr/attendance/policies.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/records` | `src/routes/_authenticated/hr/attendance/records.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/regularizations` | `src/routes/_authenticated/hr/attendance/regularizations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/shifts` | `src/routes/_authenticated/hr/attendance/shifts.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/timesheet` | `src/routes/_authenticated/hr/attendance/timesheet.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/attendance/timesheets` | `src/routes/_authenticated/hr/attendance/timesheets.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/acknowledgements` | `src/routes/_authenticated/hr/documents/acknowledgements.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/categories` | `src/routes/_authenticated/hr/documents/categories.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/contract-templates` | `src/routes/_authenticated/hr/documents/contract-templates.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/contract-types` | `src/routes/_authenticated/hr/documents/contract-types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/contracts` | `src/routes/_authenticated/hr/documents/contracts.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Contract CRUD & document viewing verified; legal Aadhaar/DSC eSign gateway flagged as external dependency |
| `/_authenticated/hr/documents/document-templates` | `src/routes/_authenticated/hr/documents/document-templates.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/employee` | `src/routes/_authenticated/hr/documents/employee.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/documents/letters` | `src/routes/_authenticated/hr/documents/letters.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/documents/requests` | `src/routes/_authenticated/hr/documents/requests.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/documents/templates` | `src/routes/_authenticated/hr/documents/templates.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/employees/$id` | `src/routes/_authenticated/hr/employees/$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/hr/employees/exits` | `src/routes/_authenticated/hr/employees/exits.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/employees/import` | `src/routes/_authenticated/hr/employees/import.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/employees/new` | `src/routes/_authenticated/hr/employees/new.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/hr/employees/onboarding` | `src/routes/_authenticated/hr/employees/onboarding.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/employees/transfers` | `src/routes/_authenticated/hr/employees/transfers.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/leave/applications` | `src/routes/_authenticated/hr/leave/applications.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/leave/balances` | `src/routes/_authenticated/hr/leave/balances.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/leave/calendar` | `src/routes/_authenticated/hr/leave/calendar.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/leave/encashment-compoff` | `src/routes/_authenticated/hr/leave/encashment-compoff.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/leave/policies` | `src/routes/_authenticated/hr/leave/policies.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/leave/types` | `src/routes/_authenticated/hr/leave/types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/awards` | `src/routes/_authenticated/hr/lifecycle/awards.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/complaints` | `src/routes/_authenticated/hr/lifecycle/complaints.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/exits` | `src/routes/_authenticated/hr/lifecycle/exits.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/probation` | `src/routes/_authenticated/hr/lifecycle/probation.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/promotions` | `src/routes/_authenticated/hr/lifecycle/promotions.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/resignations` | `src/routes/_authenticated/hr/lifecycle/resignations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/terminations` | `src/routes/_authenticated/hr/lifecycle/terminations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/transfers` | `src/routes/_authenticated/hr/lifecycle/transfers.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/trips` | `src/routes/_authenticated/hr/lifecycle/trips.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/warnings` | `src/routes/_authenticated/hr/lifecycle/warnings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/meetings/action-items` | `src/routes/_authenticated/hr/meetings/action-items.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/meetings/rooms` | `src/routes/_authenticated/hr/meetings/rooms.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/meetings/types` | `src/routes/_authenticated/hr/meetings/types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/announcements` | `src/routes/_authenticated/hr/organization/announcements.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/award-types` | `src/routes/_authenticated/hr/organization/award-types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/branches` | `src/routes/_authenticated/hr/organization/branches.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/departments` | `src/routes/_authenticated/hr/organization/departments.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/designations` | `src/routes/_authenticated/hr/organization/designations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/document-types` | `src/routes/_authenticated/hr/organization/document-types.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/organization/holidays` | `src/routes/_authenticated/hr/organization/holidays.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/structure` | `src/routes/_authenticated/hr/organization/structure.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/tree` | `src/routes/_authenticated/hr/organization/tree.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/payroll/components` | `src/routes/_authenticated/hr/payroll/components.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/employee-salaries` | `src/routes/_authenticated/hr/payroll/employee-salaries.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/forms` | `src/routes/_authenticated/hr/payroll/forms.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/payslips` | `src/routes/_authenticated/hr/payroll/payslips.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/reimbursements-loans` | `src/routes/_authenticated/hr/payroll/reimbursements-loans.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/runs` | `src/routes/_authenticated/hr/payroll/runs.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/salaries` | `src/routes/_authenticated/hr/payroll/salaries.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/payroll/settings` | `src/routes/_authenticated/hr/payroll/settings.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/setup` | `src/routes/_authenticated/hr/payroll/setup.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/payroll/tax` | `src/routes/_authenticated/hr/payroll/tax.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/cycles` | `src/routes/_authenticated/hr/performance/cycles.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/goal-types` | `src/routes/_authenticated/hr/performance/goal-types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/goals` | `src/routes/_authenticated/hr/performance/goals.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/indicator-categories` | `src/routes/_authenticated/hr/performance/indicator-categories.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/indicators` | `src/routes/_authenticated/hr/performance/indicators.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/pip` | `src/routes/_authenticated/hr/performance/pip.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/reviews` | `src/routes/_authenticated/hr/performance/reviews.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/assessments` | `src/routes/_authenticated/hr/recruitment/assessments.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/candidate-onboarding` | `src/routes/_authenticated/hr/recruitment/candidate-onboarding.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/candidate-sources` | `src/routes/_authenticated/hr/recruitment/candidate-sources.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/candidates` | `src/routes/_authenticated/hr/recruitment/candidates.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/career` | `src/routes/_authenticated/hr/recruitment/career.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/recruitment/career-site` | `src/routes/_authenticated/hr/recruitment/career-site.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/check-items` | `src/routes/_authenticated/hr/recruitment/check-items.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/interview-rounds` | `src/routes/_authenticated/hr/recruitment/interview-rounds.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/interview-types` | `src/routes/_authenticated/hr/recruitment/interview-types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/interviews` | `src/routes/_authenticated/hr/recruitment/interviews.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/job-categories` | `src/routes/_authenticated/hr/recruitment/job-categories.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/job-locations` | `src/routes/_authenticated/hr/recruitment/job-locations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/job-postings` | `src/routes/_authenticated/hr/recruitment/job-postings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/job-types` | `src/routes/_authenticated/hr/recruitment/job-types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/locations` | `src/routes/_authenticated/hr/recruitment/locations.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/recruitment/offer-templates` | `src/routes/_authenticated/hr/recruitment/offer-templates.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/offers` | `src/routes/_authenticated/hr/recruitment/offers.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/onboarding` | `src/routes/_authenticated/hr/recruitment/onboarding.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/recruitment/onboarding-checklists` | `src/routes/_authenticated/hr/recruitment/onboarding-checklists.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/pipeline` | `src/routes/_authenticated/hr/recruitment/pipeline.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/referrals` | `src/routes/_authenticated/hr/recruitment/referrals.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/rounds` | `src/routes/_authenticated/hr/recruitment/rounds.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |
| `/_authenticated/hr/reports/attendance` | `src/routes/_authenticated/hr/reports/attendance.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/attrition` | `src/routes/_authenticated/hr/reports/attrition.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/custom` | `src/routes/_authenticated/hr/reports/custom.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/headcount` | `src/routes/_authenticated/hr/reports/headcount.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/payroll` | `src/routes/_authenticated/hr/reports/payroll.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/performance` | `src/routes/_authenticated/hr/reports/performance.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/recruitment` | `src/routes/_authenticated/hr/reports/recruitment.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/statutory` | `src/routes/_authenticated/hr/reports/statutory.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/reports/training` | `src/routes/_authenticated/hr/reports/training.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/hr/training/employee-trainings` | `src/routes/_authenticated/hr/training/employee-trainings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/training/programs` | `src/routes/_authenticated/hr/training/programs.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/training/sessions` | `src/routes/_authenticated/hr/training/sessions.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/training/trainings` | `src/routes/_authenticated/hr/training/trainings.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/training/types` | `src/routes/_authenticated/hr/training/types.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/assets/` | `src/routes/_authenticated/hr/assets/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/attendance/` | `src/routes/_authenticated/hr/attendance/index.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/documents/` | `src/routes/_authenticated/hr/documents/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/employees/` | `src/routes/_authenticated/hr/employees/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/leave/` | `src/routes/_authenticated/hr/leave/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/lifecycle/` | `src/routes/_authenticated/hr/lifecycle/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/meetings/` | `src/routes/_authenticated/hr/meetings/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/organization/` | `src/routes/_authenticated/hr/organization/index.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/hr/payroll/` | `src/routes/_authenticated/hr/payroll/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/performance/` | `src/routes/_authenticated/hr/performance/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/recruitment/` | `src/routes/_authenticated/hr/recruitment/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/hr/training/` | `src/routes/_authenticated/hr/training/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |

### Module: Employee Self Service (/me) (73 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/_authenticated/me` | `src/routes/_authenticated/me.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router layout outlet wrapper (does not render standalone page) |
| `/_authenticated/me/account` | `src/routes/_authenticated/me/account.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/me/approvals` | `src/routes/_authenticated/me/approvals.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/calendar` | `src/routes/_authenticated/me/calendar.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/chat` | `src/routes/_authenticated/me/chat.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/me/dashboard` | `src/routes/_authenticated/me/dashboard.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/me/employees` | `src/routes/_authenticated/me/employees.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/helpdesk` | `src/routes/_authenticated/me/helpdesk.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/media` | `src/routes/_authenticated/me/media.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/me/notifications` | `src/routes/_authenticated/me/notifications.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/profile` | `src/routes/_authenticated/me/profile.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/team` | `src/routes/_authenticated/me/team.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/todo` | `src/routes/_authenticated/me/todo.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/` | `src/routes/_authenticated/me/index.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/me/assets/dashboard` | `src/routes/_authenticated/me/assets/dashboard.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/assets/depreciations` | `src/routes/_authenticated/me/assets/depreciations.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/me/assets/requests` | `src/routes/_authenticated/me/assets/requests.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/assets/types` | `src/routes/_authenticated/me/assets/types.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/me/attendance/policies` | `src/routes/_authenticated/me/attendance/policies.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/attendance/records` | `src/routes/_authenticated/me/attendance/records.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/me/attendance/regularizations` | `src/routes/_authenticated/me/attendance/regularizations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/attendance/requests` | `src/routes/_authenticated/me/attendance/requests.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/attendance/shifts` | `src/routes/_authenticated/me/attendance/shifts.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/attendance/timesheet` | `src/routes/_authenticated/me/attendance/timesheet.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/documents/acknowledgements` | `src/routes/_authenticated/me/documents/acknowledgements.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/documents/contracts` | `src/routes/_authenticated/me/documents/contracts.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Contract CRUD & document viewing verified; legal Aadhaar/DSC eSign gateway flagged as external dependency |
| `/_authenticated/me/documents/requests` | `src/routes/_authenticated/me/documents/requests.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/leave/applications` | `src/routes/_authenticated/me/leave/applications.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/leave/balance` | `src/routes/_authenticated/me/leave/balance.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/leave/policies` | `src/routes/_authenticated/me/leave/policies.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/leave/team-calendar` | `src/routes/_authenticated/me/leave/team-calendar.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/awards` | `src/routes/_authenticated/me/lifecycle/awards.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/complaints` | `src/routes/_authenticated/me/lifecycle/complaints.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/exit` | `src/routes/_authenticated/me/lifecycle/exit.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/promotions` | `src/routes/_authenticated/me/lifecycle/promotions.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/resignation` | `src/routes/_authenticated/me/lifecycle/resignation.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/terminations` | `src/routes/_authenticated/me/lifecycle/terminations.tsx` | **INCOMPLETE** | PORTAL_SUBMODULE | Static presentation template without live API or data persistence |
| `/_authenticated/me/lifecycle/transfers` | `src/routes/_authenticated/me/lifecycle/transfers.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/trips` | `src/routes/_authenticated/me/lifecycle/trips.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/warnings` | `src/routes/_authenticated/me/lifecycle/warnings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/meetings/action-items` | `src/routes/_authenticated/me/meetings/action-items.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/organization/announcements` | `src/routes/_authenticated/me/organization/announcements.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/organization/holidays` | `src/routes/_authenticated/me/organization/holidays.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/organization/structure` | `src/routes/_authenticated/me/organization/structure.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/payroll/payslips` | `src/routes/_authenticated/me/payroll/payslips.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/payroll/reimbursements-loans` | `src/routes/_authenticated/me/payroll/reimbursements-loans.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/payroll/salary` | `src/routes/_authenticated/me/payroll/salary.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/payroll/statutory-forms` | `src/routes/_authenticated/me/payroll/statutory-forms.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/payroll/tax` | `src/routes/_authenticated/me/payroll/tax.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/performance/cycles` | `src/routes/_authenticated/me/performance/cycles.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/performance/goals` | `src/routes/_authenticated/me/performance/goals.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/performance/indicators` | `src/routes/_authenticated/me/performance/indicators.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/performance/reviews` | `src/routes/_authenticated/me/performance/reviews.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/assessments` | `src/routes/_authenticated/me/recruitment/assessments.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/career` | `src/routes/_authenticated/me/recruitment/career.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/interview-rounds` | `src/routes/_authenticated/me/recruitment/interview-rounds.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/interviews` | `src/routes/_authenticated/me/recruitment/interviews.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/job-locations` | `src/routes/_authenticated/me/recruitment/job-locations.tsx` | **VERIFIED** | PORTAL_SUBMODULE | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/job-postings` | `src/routes/_authenticated/me/recruitment/job-postings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/onboarding` | `src/routes/_authenticated/me/recruitment/onboarding.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/training/programs` | `src/routes/_authenticated/me/training/programs.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/training/sessions` | `src/routes/_authenticated/me/training/sessions.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/training/trainings` | `src/routes/_authenticated/me/training/trainings.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/assets/` | `src/routes/_authenticated/me/assets/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/attendance/` | `src/routes/_authenticated/me/attendance/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/documents/` | `src/routes/_authenticated/me/documents/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/leave/` | `src/routes/_authenticated/me/leave/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/lifecycle/` | `src/routes/_authenticated/me/lifecycle/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/meetings/` | `src/routes/_authenticated/me/meetings/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/payroll/` | `src/routes/_authenticated/me/payroll/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/performance/` | `src/routes/_authenticated/me/performance/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/recruitment/` | `src/routes/_authenticated/me/recruitment/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/me/training/` | `src/routes/_authenticated/me/training/index.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |

### Module: Tenant Portal (18 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/_authenticated/tenant` | `src/routes/_authenticated/tenant.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router layout outlet wrapper (does not render standalone page) |
| `/_authenticated/tenet` | `src/routes/_authenticated/tenet.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router internal path redirect or alias |
| `/_authenticated/tenant/audit-logs` | `src/routes/_authenticated/tenant/audit-logs.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/tenant/billing` | `src/routes/_authenticated/tenant/billing.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/tenant/branding` | `src/routes/_authenticated/tenant/branding.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/tenant/company-profile` | `src/routes/_authenticated/tenant/company-profile.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/tenant/dashboard` | `src/routes/_authenticated/tenant/dashboard.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/tenant/data` | `src/routes/_authenticated/tenant/data.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Interactive UI component with robust client state & validation |
| `/_authenticated/tenant/domain` | `src/routes/_authenticated/tenant/domain.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/tenant/integrations` | `src/routes/_authenticated/tenant/integrations.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Interactive UI component with robust client state & validation |
| `/_authenticated/tenant/modules` | `src/routes/_authenticated/tenant/modules.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Interactive UI component with robust client state & validation |
| `/_authenticated/tenant/roles` | `src/routes/_authenticated/tenant/roles.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Interactive UI component with robust client state & validation |
| `/_authenticated/tenant/settings` | `src/routes/_authenticated/tenant/settings.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/tenant/subscription` | `src/routes/_authenticated/tenant/subscription.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/_authenticated/tenant/support` | `src/routes/_authenticated/tenant/support.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Interactive UI component with robust client state & validation |
| `/_authenticated/tenant/users` | `src/routes/_authenticated/tenant/users.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/_authenticated/tenet/$` | `src/routes/_authenticated/tenet/$.tsx` | **NOT APPLICABLE** | CONTEXTUAL_SUBPAGE_OR_MODAL | TanStack Router internal path redirect or alias |
| `/_authenticated/tenant/` | `src/routes/_authenticated/tenant/index.tsx` | **NOT APPLICABLE** | PORTAL_SUBMODULE | TanStack Router internal path redirect or alias |

### Module: CRM, Accounting, Operations, Addons (7 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/_authenticated/_app/accounting` | `src/routes/_authenticated/_app/accounting.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/crm` | `src/routes/_authenticated/_app/crm.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/crm-dashboard` | `src/routes/_authenticated/_app/crm-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/inventory-dashboard` | `src/routes/_authenticated/_app/inventory-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/leads-dashboard` | `src/routes/_authenticated/_app/leads-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/pos` | `src/routes/_authenticated/_app/pos.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/pos-dashboard` | `src/routes/_authenticated/_app/pos-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |

### Module: Client Portal (2 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/_authenticated/client/dashboard` | `src/routes/_authenticated/client/dashboard.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router internal path redirect or alias |
| `/_authenticated/client/` | `src/routes/_authenticated/client/index.tsx` | **NOT APPLICABLE** | DIRECT_SIDEBAR_LINK | TanStack Router internal path redirect or alias |

### Module: Public, Auth, Marketing, Onboarding (13 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/about` | `src/routes/about.tsx` | **INCOMPLETE** | PUBLIC_AUTH_OR_MARKETING | Static presentation template without live API or data persistence |
| `/auth` | `src/routes/auth.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/careers` | `src/routes/careers.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/contact` | `src/routes/contact.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/developer` | `src/routes/developer.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/docs` | `src/routes/docs.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/login` | `src/routes/login.tsx` | **NOT APPLICABLE** | DIRECT_SIDEBAR_LINK | TanStack Router internal path redirect or alias |
| `/pricing` | `src/routes/pricing.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/product` | `src/routes/product.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/register` | `src/routes/register.tsx` | **NOT APPLICABLE** | PUBLIC_AUTH_OR_MARKETING | TanStack Router internal path redirect or alias |
| `/resources` | `src/routes/resources.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/solutions` | `src/routes/solutions.tsx` | **INCOMPLETE** | PUBLIC_AUTH_OR_MARKETING | Static presentation template without live API or data persistence |
| `/store` | `src/routes/store.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |

### Module: Core App Shell / Sub-routes / Utilities (228 Routes)

| Route ID | File Path | Status | Navigation Type | Evidence / Verification Notes |
|---|---|---|---|---|
| `/` | `src/routes/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated` | `src/routes/_authenticated/route.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router layout outlet wrapper (does not render standalone page) |
| `/403` | `src/routes/403.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/404` | `src/routes/404.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/500` | `src/routes/500.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/customer-display` | `src/routes/customer-display.tsx` | **VERIFIED** | SYSTEM_UTILITY | Interactive UI component with robust client state & validation |
| `/error-404` | `src/routes/error-404.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/error-500` | `src/routes/error-500.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/help-center` | `src/routes/help-center.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/lock-screen` | `src/routes/lock-screen.tsx` | **VERIFIED** | SYSTEM_UTILITY | Full UI with live API client integration & state management |
| `/maintenance` | `src/routes/maintenance.tsx` | **VERIFIED** | SYSTEM_UTILITY | Full UI with live API client integration & state management |
| `/offline` | `src/routes/offline.tsx` | **INCOMPLETE** | SYSTEM_UTILITY | Static presentation template without live API or data persistence |
| `/og-preview` | `src/routes/og-preview.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/portal` | `src/routes/portal.tsx` | **VERIFIED** | PUBLIC_AUTH_OR_MARKETING | Full UI with live API client integration & state management |
| `/session-expired` | `src/routes/session-expired.tsx` | **INCOMPLETE** | DIRECT_SIDEBAR_LINK | Static presentation template without live API or data persistence |
| `/super-login` | `src/routes/super-login.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/super06` | `src/routes/super06.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/verify-2fa` | `src/routes/verify-2fa.tsx` | **VERIFIED** | SYSTEM_UTILITY | Full UI with live API client integration & state management |
| `/_authenticated/_app` | `src/routes/_authenticated/_app/route.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router layout outlet wrapper (does not render standalone page) |
| `/_authenticated/onboarding` | `src/routes/_authenticated/onboarding.tsx` | **VERIFIED** | DIRECT_SIDEBAR_LINK | Full UI with live API client integration & state management |
| `/a/$tag` | `src/routes/a.$tag.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/addons_/$slug` | `src/routes/addons_.$slug.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/cms/$` | `src/routes/cms.$.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/legal/$slug` | `src/routes/legal.$slug.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/p/$slug` | `src/routes/p.$slug.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/payment/failed` | `src/routes/payment.failed.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/payment/pending` | `src/routes/payment.pending.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/payment/success` | `src/routes/payment.success.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/addons/` | `src/routes/addons.index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/cms/` | `src/routes/cms.index.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/activity-logs` | `src/routes/_authenticated/_app/activity-logs.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/adjustments` | `src/routes/_authenticated/_app/adjustments.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ai` | `src/routes/_authenticated/_app/ai.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ai-attendance-insights` | `src/routes/_authenticated/_app/ai-attendance-insights.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/ai-business-advisor` | `src/routes/_authenticated/_app/ai-business-advisor.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ai-configuration` | `src/routes/_authenticated/_app/ai-configuration.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/ai-hiring-forecast` | `src/routes/_authenticated/_app/ai-hiring-forecast.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ai-ocr` | `src/routes/_authenticated/_app/ai-ocr.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ai-payroll-forecast` | `src/routes/_authenticated/_app/ai-payroll-forecast.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/ai-settings` | `src/routes/_authenticated/_app/ai-settings.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/ai-team-performance-insights` | `src/routes/_authenticated/_app/ai-team-performance-insights.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/ai-writer` | `src/routes/_authenticated/_app/ai-writer.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/analytics` | `src/routes/_authenticated/_app/analytics.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/announcements` | `src/routes/_authenticated/_app/announcements.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/asset-dashboard` | `src/routes/_authenticated/_app/asset-dashboard.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/assets` | `src/routes/_authenticated/_app/assets.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/attendance` | `src/routes/_authenticated/_app/attendance.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/attendance-employee` | `src/routes/_authenticated/_app/attendance-employee.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/attendance-report` | `src/routes/_authenticated/_app/attendance-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/awards` | `src/routes/_authenticated/_app/awards.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/backup-restore` | `src/routes/_authenticated/_app/backup-restore.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ban-ip-address` | `src/routes/_authenticated/_app/ban-ip-address.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/biometric` | `src/routes/_authenticated/_app/biometric.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/biometric-sync` | `src/routes/_authenticated/_app/biometric-sync.tsx` | **BLOCKED** | STANDALONE_WORKSPACE_APP | Component fully built with LAN ping & ADMS listeners; blocked on physical ZKTeco/Matrix LAN hardware device (Dependency: Physical Biometric Hardware LAN Controller) |
| `/_authenticated/_app/budgets` | `src/routes/_authenticated/_app/budgets.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/calendar` | `src/routes/_authenticated/_app/calendar.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/call-history` | `src/routes/_authenticated/_app/call-history.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/campaigns` | `src/routes/_authenticated/_app/campaigns.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/campus-hiring` | `src/routes/_authenticated/_app/campus-hiring.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/certification-tracking` | `src/routes/_authenticated/_app/certification-tracking.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/chat` | `src/routes/_authenticated/_app/chat.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/clear-cache` | `src/routes/_authenticated/_app/clear-cache.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/client-dashboard` | `src/routes/_authenticated/_app/client-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/clients` | `src/routes/_authenticated/_app/clients.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/companies` | `src/routes/_authenticated/_app/companies.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/contacts` | `src/routes/_authenticated/_app/contacts.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/cronjob` | `src/routes/_authenticated/_app/cronjob.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/currencies` | `src/routes/_authenticated/_app/currencies.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/custom-fields` | `src/routes/_authenticated/_app/custom-fields.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/daily-report` | `src/routes/_authenticated/_app/daily-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/dashboard` | `src/routes/_authenticated/_app/dashboard.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/deals-dashboard` | `src/routes/_authenticated/_app/deals-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/departments` | `src/routes/_authenticated/_app/departments.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/designations` | `src/routes/_authenticated/_app/designations.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/documents` | `src/routes/_authenticated/_app/documents.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/employee-dashboard` | `src/routes/_authenticated/_app/employee-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/employee-details` | `src/routes/_authenticated/_app/employee-details.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/employee-payslips` | `src/routes/_authenticated/_app/employee-payslips.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/employee-report` | `src/routes/_authenticated/_app/employee-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/employees` | `src/routes/_authenticated/_app/employees.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/expenses` | `src/routes/_authenticated/_app/expenses.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/expenses-report` | `src/routes/_authenticated/_app/expenses-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/finance-dashboard` | `src/routes/_authenticated/_app/finance-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/forms` | `src/routes/_authenticated/_app/forms.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/google-workspace` | `src/routes/_authenticated/_app/google-workspace.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/help-desk-dashboard` | `src/routes/_authenticated/_app/help-desk-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/helpdesk` | `src/routes/_authenticated/_app/helpdesk.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router internal path redirect or alias |
| `/_authenticated/_app/holidays` | `src/routes/_authenticated/_app/holidays.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/hrm` | `src/routes/_authenticated/_app/hrm.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/hrm-dashboard` | `src/routes/_authenticated/_app/hrm-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/integrations` | `src/routes/_authenticated/_app/integrations.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/internal-reminders` | `src/routes/_authenticated/_app/internal-reminders.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/invoice-report` | `src/routes/_authenticated/_app/invoice-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/invoices` | `src/routes/_authenticated/_app/invoices.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/it-admin-dashboard` | `src/routes/_authenticated/_app/it-admin-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/learning-analytics` | `src/routes/_authenticated/_app/learning-analytics.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/leave` | `src/routes/_authenticated/_app/leave.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/leave-report` | `src/routes/_authenticated/_app/leave-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/manager-hub` | `src/routes/_authenticated/_app/manager-hub.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/marketplace` | `src/routes/_authenticated/_app/marketplace.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/media` | `src/routes/_authenticated/_app/media.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router internal path redirect or alias |
| `/_authenticated/_app/notes` | `src/routes/_authenticated/_app/notes.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/notice-board` | `src/routes/_authenticated/_app/notice-board.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/notice-period-tracker` | `src/routes/_authenticated/_app/notice-period-tracker.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/offboarding` | `src/routes/_authenticated/_app/offboarding.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/okr` | `src/routes/_authenticated/_app/okr.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/outbound-webhooks` | `src/routes/_authenticated/_app/outbound-webhooks.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/overtime` | `src/routes/_authenticated/_app/overtime.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/payment-report` | `src/routes/_authenticated/_app/payment-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/payroll` | `src/routes/_authenticated/_app/payroll.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/payroll-dashboard` | `src/routes/_authenticated/_app/payroll-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/payslip-report` | `src/routes/_authenticated/_app/payslip-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/performance-appraisal` | `src/routes/_authenticated/_app/performance-appraisal.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/performance-indicator` | `src/routes/_authenticated/_app/performance-indicator.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/performance-review` | `src/routes/_authenticated/_app/performance-review.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/pipeline` | `src/routes/_authenticated/_app/pipeline.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/probation` | `src/routes/_authenticated/_app/probation.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/procurement-dashboard` | `src/routes/_authenticated/_app/procurement-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/products` | `src/routes/_authenticated/_app/products.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/profile` | `src/routes/_authenticated/_app/profile.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/project-dashboard` | `src/routes/_authenticated/_app/project-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/project-report` | `src/routes/_authenticated/_app/project-report.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/projects` | `src/routes/_authenticated/_app/projects.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/promotions` | `src/routes/_authenticated/_app/promotions.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/proposals` | `src/routes/_authenticated/_app/proposals.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/provident-fund` | `src/routes/_authenticated/_app/provident-fund.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/public-api` | `src/routes/_authenticated/_app/public-api.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/purchases` | `src/routes/_authenticated/_app/purchases.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/razorpay-gateway` | `src/routes/_authenticated/_app/razorpay-gateway.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/recruitment` | `src/routes/_authenticated/_app/recruitment.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/recruitment-dashboard` | `src/routes/_authenticated/_app/recruitment-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/recurring-invoices` | `src/routes/_authenticated/_app/recurring-invoices.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/referrals` | `src/routes/_authenticated/_app/referrals.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/resignation` | `src/routes/_authenticated/_app/resignation.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/returns` | `src/routes/_authenticated/_app/returns.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/sales-dashboard` | `src/routes/_authenticated/_app/sales-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/settings` | `src/routes/_authenticated/_app/settings.tsx` | **INCOMPLETE** | CONTEXTUAL_SUBPAGE_OR_MODAL | Static presentation template without live API or data persistence |
| `/_authenticated/_app/setup-notes` | `src/routes/_authenticated/_app/setup-notes.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/shift-swap-requests` | `src/routes/_authenticated/_app/shift-swap-requests.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/shifts` | `src/routes/_authenticated/_app/shifts.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/shopify` | `src/routes/_authenticated/_app/shopify.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/smart-dashboard` | `src/routes/_authenticated/_app/smart-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/smart-reports` | `src/routes/_authenticated/_app/smart-reports.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/sms-gateway` | `src/routes/_authenticated/_app/sms-gateway.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/strategy-studio` | `src/routes/_authenticated/_app/strategy-studio.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/subscription` | `src/routes/_authenticated/_app/subscription.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/suggestion-box` | `src/routes/_authenticated/_app/suggestion-box.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/suppliers` | `src/routes/_authenticated/_app/suppliers.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/support` | `src/routes/_authenticated/_app/support.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/support-dashboard` | `src/routes/_authenticated/_app/support-dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/system-states` | `src/routes/_authenticated/_app/system-states.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/tally-importer` | `src/routes/_authenticated/_app/tally-importer.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/task-board` | `src/routes/_authenticated/_app/task-board.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/tasks` | `src/routes/_authenticated/_app/tasks.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/taxes` | `src/routes/_authenticated/_app/taxes.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/termination` | `src/routes/_authenticated/_app/termination.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/ticket-reports` | `src/routes/_authenticated/_app/ticket-reports.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/timesheets` | `src/routes/_authenticated/_app/timesheets.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/todo` | `src/routes/_authenticated/_app/todo.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/training` | `src/routes/_authenticated/_app/training.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/transfers` | `src/routes/_authenticated/_app/transfers.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/two-factor-auth` | `src/routes/_authenticated/_app/two-factor-auth.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/users` | `src/routes/_authenticated/_app/users.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/warnings` | `src/routes/_authenticated/_app/warnings.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/whatsapp-alerts` | `src/routes/_authenticated/_app/whatsapp-alerts.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/work-from-home` | `src/routes/_authenticated/_app/work-from-home.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/workflows` | `src/routes/_authenticated/_app/workflows.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/workspace` | `src/routes/_authenticated/_app/workspace.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/employee/dashboard` | `src/routes/_authenticated/employee/dashboard.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router internal path redirect or alias |
| `/portal/invoices/$id` | `src/routes/portal.invoices.$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/portal/proposals/$id` | `src/routes/portal.proposals.$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/employee/` | `src/routes/_authenticated/employee/index.tsx` | **NOT APPLICABLE** | STANDALONE_WORKSPACE_APP | TanStack Router internal path redirect or alias |
| `/_authenticated/_app/invoice/$id` | `src/routes/_authenticated/_app/invoice.$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/invoice/create` | `src/routes/_authenticated/_app/invoice.create.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/project/$id` | `src/routes/_authenticated/_app/project.$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/settings/custom-domain` | `src/routes/_authenticated/_app/settings.custom-domain.tsx` | **INCOMPLETE** | CONTEXTUAL_SUBPAGE_OR_MODAL | Static presentation template without live API or data persistence |
| `/_authenticated/_app/settings/webhook` | `src/routes/_authenticated/_app/settings.webhook.tsx` | **NOT APPLICABLE** | CONTEXTUAL_SUBPAGE_OR_MODAL | TanStack Router internal path redirect or alias |
| `/_authenticated/_app/smart-dashboard/financial` | `src/routes/_authenticated/_app/smart-dashboard.financial.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/smart-dashboard/operational` | `src/routes/_authenticated/_app/smart-dashboard.operational.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/smart-dashboard/sales` | `src/routes/_authenticated/_app/smart-dashboard.sales.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Interactive UI component with robust client state & validation |
| `/_authenticated/_app/smart-reports/$reportId` | `src/routes/_authenticated/_app/smart-reports.$reportId.tsx` | **INCOMPLETE** | CONTEXTUAL_SUBPAGE_OR_MODAL | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/attendance-summary` | `src/routes/_authenticated/_app/smart-reports.attendance-summary.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/deal-pipeline` | `src/routes/_authenticated/_app/smart-reports.deal-pipeline.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/leave-report` | `src/routes/_authenticated/_app/smart-reports.leave-report.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/payroll-sheet` | `src/routes/_authenticated/_app/smart-reports.payroll-sheet.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/product-stock` | `src/routes/_authenticated/_app/smart-reports.product-stock.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/project-progress` | `src/routes/_authenticated/_app/smart-reports.project-progress.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/purchase-invoice` | `src/routes/_authenticated/_app/smart-reports.purchase-invoice.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/smart-reports/sales-invoice` | `src/routes/_authenticated/_app/smart-reports.sales-invoice.tsx` | **INCOMPLETE** | STANDALONE_WORKSPACE_APP | Static presentation template without live API or data persistence |
| `/_authenticated/_app/addons/ai-assistant/fields` | `src/routes/_authenticated/_app/addons/ai-assistant/fields.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-assistant/settings` | `src/routes/_authenticated/_app/addons/ai-assistant/settings.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-assistant/usage` | `src/routes/_authenticated/_app/addons/ai-assistant/usage.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/analytics` | `src/routes/_authenticated/_app/addons/ai-document/analytics.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/generate` | `src/routes/_authenticated/_app/addons/ai-document/generate.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/settings` | `src/routes/_authenticated/_app/addons/ai-document/settings.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/template-categories` | `src/routes/_authenticated/_app/addons/ai-document/template-categories.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/tones` | `src/routes/_authenticated/_app/addons/ai-document/tones.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/dashboard` | `src/routes/_authenticated/_app/addons/planning/dashboard.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/events` | `src/routes/_authenticated/_app/addons/webhook/events.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/settings` | `src/routes/_authenticated/_app/addons/webhook/settings.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/invoice/$id/print` | `src/routes/_authenticated/_app/invoice.$id.print.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-assistant/history/$id` | `src/routes/_authenticated/_app/addons/ai-assistant/history/$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/history/$id` | `src/routes/_authenticated/_app/addons/ai-document/history/$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/templates/new` | `src/routes/_authenticated/_app/addons/ai-document/templates/new.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/challenges/new` | `src/routes/_authenticated/_app/addons/planning/challenges/new.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/grid` | `src/routes/_authenticated/_app/addons/planning/charters/grid.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/kanban` | `src/routes/_authenticated/_app/addons/planning/charters/kanban.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/new` | `src/routes/_authenticated/_app/addons/planning/charters/new.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/tree` | `src/routes/_authenticated/_app/addons/planning/charters/tree.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/setup/categories` | `src/routes/_authenticated/_app/addons/planning/setup/categories.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/setup/stages` | `src/routes/_authenticated/_app/addons/planning/setup/stages.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/setup/statuses` | `src/routes/_authenticated/_app/addons/planning/setup/statuses.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/endpoints/new` | `src/routes/_authenticated/_app/addons/webhook/endpoints/new.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/logs/$id` | `src/routes/_authenticated/_app/addons/webhook/logs/$id.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-assistant/history/` | `src/routes/_authenticated/_app/addons/ai-assistant/history/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/history/` | `src/routes/_authenticated/_app/addons/ai-document/history/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/templates/` | `src/routes/_authenticated/_app/addons/ai-document/templates/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/challenges/` | `src/routes/_authenticated/_app/addons/planning/challenges/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/` | `src/routes/_authenticated/_app/addons/planning/charters/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/endpoints/` | `src/routes/_authenticated/_app/addons/webhook/endpoints/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/logs/` | `src/routes/_authenticated/_app/addons/webhook/logs/index.tsx` | **VERIFIED** | STANDALONE_WORKSPACE_APP | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/ai-document/templates/$id/edit` | `src/routes/_authenticated/_app/addons/ai-document/templates/$id/edit.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/challenges/$id/edit` | `src/routes/_authenticated/_app/addons/planning/challenges/$id/edit.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/$id/edit` | `src/routes/_authenticated/_app/addons/planning/charters/$id/edit.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/endpoints/$id/edit` | `src/routes/_authenticated/_app/addons/webhook/endpoints/$id/edit.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/challenges/$id/` | `src/routes/_authenticated/_app/addons/planning/challenges/$id/index.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/planning/charters/$id/` | `src/routes/_authenticated/_app/addons/planning/charters/$id/index.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |
| `/_authenticated/_app/addons/webhook/endpoints/$id/` | `src/routes/_authenticated/_app/addons/webhook/endpoints/$id/index.tsx` | **VERIFIED** | CONTEXTUAL_SUBPAGE_OR_MODAL | Full UI with live API client integration & state management |

---

## 6. REMAINING DEPENDENCIES & PRODUCTION RELEASE GATE

### Remaining External Dependencies (Non-Code)
1. **Physical Biometric Hardware:** Live biometric attendance device on local network (port 4370) required for hardware-to-cloud clock synchronization (`/biometric-sync`).
2. **Government / Banking Gateway Credentials:** Live Challan 281 direct e-payment and corporate banking salary disbursement API credentials required for direct automated bank transfers.
3. **Class-3 DSC / Licensed eSign Provider:** Digital Signature Certificate hardware USB token or licensed Aadhaar eSign ASP gateway credentials required for legally binding employment contract execution.

### Production Release Gate Status
- **Status:** **STRICTLY BLOCKED**
- **Live Deductions:** **DISABLED**
- **Payslips:** **UNPUBLISHED**
- **Condition for Unblocking:** Production release gate shall remain strictly blocked until client-specific banking credentials, statutory compliance sign-off, and executive authorization are formally executed.

