# UI/UX Parity & Regression Risk Report
**Risk Assessment, Technical Debt, Multi-Tenant Security, and Mitigation Strategy**

**Document Version:** 1.0.0  
**Audit Reference:** `LARAVEL_TO_REACT_VISUAL_PARITY_AUDIT.md`, `PORTAL_SCREEN_BY_SCREEN_GAP_MATRIX.md`, `REACT_UI_UX_IMPLEMENTATION_ROADMAP.md`  
**Scope:** Risk Analysis across UI/UX Changes, Multi-Tenant Data Isolation, Frontend State, Performance, and Rollback Procedures.

---

## 1. Executive Summary

Migrating an enterprise multi-tenant ERP from a Laravel Inertia application to a React Single Page Application (SPA) involves significant interface, state, and security risks. 

While the database schema and API layer enforce strict multi-tenant scoping (`tenant_id`), frontend UI changes can inadvertently introduce data leaks, broken navigation, performance regressions, or state desynchronization.

This document identifies the critical risks associated with achieving full Laravel-to-React UI/UX parity and outlines preventative architectural safeguards.

---

## 2. Risk Matrix & Severity Classification

| Risk ID | Risk Title | Category | Severity | Likelihood | Impact Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **RSK-01** | Multi-Tenant Data Leakage via Client Portal | Security | **CRITICAL** | Low (Mitigated) | If client portal queries general admin endpoints without session customer scoping, customer A could view customer B's invoices or projects. |
| **RSK-02** | Large Dataset Browser Freeze (Client-side Pagination) | Performance | **HIGH** | Medium | Large tenants with >10,000 employees, invoices, or punch logs experience slow rendering when all rows are fetched to the browser and sliced locally. |
| **RSK-03** | Monolithic File Regressions during Modularization | Code Stability | **HIGH** | Medium | De-monolithing 3,000+ line files (e.g., `employees.tsx`, `accounting.tsx`) into sub-routes could break shared modals, tab states, or query keys. |
| **RSK-04** | React Rules of Hooks Violations on Re-render | Runtime Crash | **MEDIUM** | Low (Mitigated) | Declaring state hooks (`useState`, `useEffect`) after early return guards causes white-screen 500 errors on state transition. |
| **RSK-05** | Double-Entry Ledger Desynchronization in UI Forms | Financial Integrity | **HIGH** | Low | If line-item repeaters in Invoice/PO creation fail to balance debits and credits, journal vouchers will fail transaction posting. |
| **RSK-06** | Mobile Viewport Table Truncation | Usability | **MEDIUM** | High | Tables with 8+ columns become unreadable on mobile screens (< 768px) without adaptive column prioritization or card transformation. |
| **RSK-07** | Mock Data Left in Production Routes | Data Integrity | **MEDIUM** | High (Identified) | Screens using mock arrays (`INITIAL_TRANSACTIONS`, `INITIAL_DOMAINS`) display fictitious data to administrators, misleading operational reviews. |

---

## 3. In-Depth Risk Analysis & Mitigation Strategies

### 3.1. RSK-01: Multi-Tenant Data Leakage via Client Portal
- **The Risk:** In multi-tenant B2B architectures, external clients must be strictly isolated to their own customer ID within the tenant. If a frontend component queries `GET /api/invoices` or `GET /api/projects` rather than dedicated customer-scoped endpoints (`/api/client/my-invoices`), cross-customer data leakage occurs.
- **Mitigation Strategy:**
  1. Frontend Client Portal routes (`/client-dashboard`, `/portal/*`) MUST query dedicated `/api/client/*` endpoints only.
  2. The server middleware resolves `customerId` exclusively from the verified JWT session, completely ignoring client-supplied query parameters (`?customerId=...`).
  3. Continuous automated integration tests (such as `client-portal-isolation.test.ts`) must run on every build to verify that Customer A cannot read Customer B's records.

---

### 3.2. RSK-02: Large Dataset Browser Freeze (Client-Side Pagination)
- **The Risk:** Several React screens currently fetch full array datasets (`const { data = [] } = useQuery(...)`) and slice them locally (`data.slice(start, end)`). While performant for demo databases, real enterprise tenants with 15,000 transactions or 50,000 biometric punch logs will suffer memory exhaustion and multi-second UI freezes.
- **Mitigation Strategy:**
  1. Standardize all backend list endpoints to accept standard pagination parameters (`?page=1&limit=25&search=...&sortBy=...&sortDir=...`).
  2. The new `<DataTable />` component will bind its page state directly to TanStack Query parameters (`useQuery({ queryKey: [resource, page, limit, search] })`), keeping server responses below 50KB per page.

---

### 3.3. RSK-03: Monolithic File Regressions during Modularization
- **The Risk:** Splitting `accounting.tsx` (1,757 lines) or `employees.tsx` (3,500 lines) into separate route files (`/accounting/chart-of-accounts.tsx`, `/accounting/reports.tsx`) carries a risk of breaking route transitions, active breadcrumb highlights, or modal context.
- **Mitigation Strategy:**
  1. Use TanStack Router's nested route structure (`_authenticated/_app/accounting/route.tsx` with `<Outlet />`).
  2. Create shared sub-components in `src/components/accounting/` rather than duplicating state.
  3. Validate TypeScript type-checking (`npx tsc --noEmit`) and production bundling (`npm run build`) before and after every file split.

---

### 3.4. RSK-04: React Rules of Hooks Violations
- **The Risk:** In complex pages with loading spinners or error screens, declaring `useState` or `useEffect` after conditional early returns (`if (loading) return <Spinner />`) causes React to crash with:
  `Error: Rendered more hooks than during the previous render.`
- **Mitigation Strategy:**
  1. Enforce strict linting: ESLint rule `react-hooks/rules-of-hooks: "error"`.
  2. Architectural rule: All hook declarations (`useQuery`, `useState`, `useMemo`, `useCallback`, `useNavigate`) MUST be placed unconditionally at the very top of the functional component, strictly before any `if` statements or return blocks.

---

### 3.5. RSK-05: Double-Entry Ledger Desynchronization in UI Forms
- **The Risk:** In manual journal entries and automated invoice posting, if frontend form math rounds cents differently from the backend Decimal engine, journal entries will fail with `UnbalancedJournalEntryError` (debits != credits).
- **Mitigation Strategy:**
  1. Use high-precision decimal formatting (`decimal.js` or integer cents) for currency calculations.
  2. The frontend form displays real-time validation showing `Difference: Total Debit - Total Credit`. The Submit button remains disabled until `Difference === 0.00`.
  3. The backend MySQL transaction verifies balanced debits and credits atomically before committing.

---

### 3.6. RSK-06: Mobile Viewport Table Truncation
- **The Risk:** High-density ERP tables with 7 to 10 columns (e.g. Employee Directory, Stock Transfers, Trial Balance) break layouts on screens `< 768px` without horizontal scrolling or card transformations.
- **Mitigation Strategy:**
  1. On mobile viewports, wrap tables in `overflow-x-auto` with sticky action columns.
  2. Implement an adaptive card view toggle (`<ListGridToggle />`) allowing mobile users to view records as stacked cards rather than horizontal tables.

---

### 3.7. RSK-07: Elimination of Mock Data in Super Admin
- **The Risk:** Super Admin screens `/super/transactions.tsx`, `/super/domains.tsx`, and `/super/analytics.tsx` currently contain hardcoded mock arrays. Leaving mock arrays in production leads to confusion and false operational telemetry.
- **Mitigation Strategy:**
  1. Connect `/super/transactions.tsx` to the `PaymentGatewayTransaction` Prisma model.
  2. Connect `/super/domains.tsx` to a new `custom_domains` schema table.
  3. Connect `/super/analytics.tsx` to live aggregation queries calculating total tenant users, storage size, and active sessions.

---

## 4. Verification Gates Before Marking Parity Complete

To prevent regressions, every module undergoing UI/UX parity remediation must pass through five mandatory verification gates:

```
[Gate 1: Schema & Isolation Verification]
  └── Table verified in schema.prisma, tenantId scoping confirmed, zero raw SQL injection risks.

[Gate 2: TypeScript & Static Analysis]
  └── cd server && npx tsc --noEmit (Exit 0)
  └── npx tsc --noEmit (Exit 0, 0 linter errors)

[Gate 3: Automated Integration Tests]
  └── Automated test suite verifying CRUD, RBAC, tenant isolation, and error sanitization.

[Gate 4: Production Build Verification]
  └── npm run build (Client bundle + SSR bundle + Nitro worker bundle packaged without errors).

[Gate 5: Live Browser Workflow Verification]
  └── Playwright or manual browser verification confirming the rendered layout, responsive behavior, 
      form submissions, and error states match the original Laravel design.
```

---

## 5. Rollback & Fail-Safe Strategy

1. **Atomic Branch Isolation**: All remediation work must be executed on isolated feature branches or in atomic phase commits.
2. **Database Backward-Compatibility**: No destructive migrations, dropping of columns, or renaming of existing live fields. All schema additions must be strictly additive with default values.
3. **Safe Error Fallback**: If an optional add-on or sub-module fails to load, render the `<WorkspaceUnavailableView />` or a non-blocking toast alert rather than crashing the entire AppShell.

---
*End of UI_UX_PARITY_RISK_REPORT.md*
