# MASTERHRMS — Final Next.js Migration Forensic Acceptance Audit

**Date of Audit:** 2026-10-21  
**Auditor Mode:** Read-Only Forensic Acceptance Audit  
**Audited Target:** MASTERHRMS Next.js App Router (`CMS/`) & Express Authoritative Backend (`server/`)  
**Final Status:** **ACCEPTED_WITH_LIMITATIONS**  

---

## Executive Summary

A comprehensive, read-only forensic audit of the MASTERHRMS repository was conducted to verify the claims made in the migration completion report. The audit inspected root and workspace configuration, process listening states, route tree mappings between Vite (`src/routes/`) and Next.js (`CMS/src/app/`), authentication mechanisms, role enforcement, database integrity, and freshly executed automated test suites.

### Key Audit Findings
1. **Runtime Verification:** Next.js App Router (port 3000) and Express (port 4000) are the active listening processes. Vite (port 5173) is confirmed terminated (`ECONNREFUSED`).
2. **Route Tree Discrepancy:** While the previous report claimed migration of all 508 routes, forensic reconciliation reveals **432 routes matched** and **75 routes missing** from `CMS/src/app/`. The primary missing cluster is the 36 sub-routes under `_authenticated/_app/addons/` which were skipped during directory traversal.
3. **Hardcoded Port 5173 Finding:** `CMS/src/app/super/settings/page.tsx` (lines 1384 & 1605) hardcodes `http://${selectedTenant.slug}.localhost:5173/settings`.
4. **Authentication & Security:** Real database authentication operates as claimed. `admin@masterhrms.com` and `gowthamtooquik@gmail.com` authenticate with real JWTs and roles. Backend middleware strictly enforces 401/403 access control independently of frontend UX guards.
5. **Fresh Test Execution:** 6 backend regression suites (60 tests total), full TypeScript typecheck (`tsc --noEmit`), and Next.js Turbopack production build were freshly executed and passed with 0 failures.

---

## 1. Actual Architecture & Runtime Status

### Process & Port Status (Empirical `netstat` Verification)
```
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       PID: 33340 (Next.js App Router)
  TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       PID: 40236 (Express API Backend)
  Port 5173: NOT LISTENING (ECONNREFUSED)
```

### Configuration & Startup Scripts
- **Root `package.json`:**
  - `"dev": "concurrently \"npm run cms:dev\" \"npm run server:dev\""` (Launches Next.js on port 3000 and Express on port 4000).
  - `"build": "npm --prefix CMS run build"` (Runs Next.js production build).
  - Rollback scripts preserved: `"dev:vite"`, `"build:vite"`, `"preview:vite"`.
- **`CMS/package.json`:**
  - `"dev": "next dev -p 3000 --webpack"`
  - `"build": "next build"`
  - `"start": "next start -p 3000"`
  - `"typecheck": "tsc --noEmit"`
- **`CMS/next.config.ts`:**
  - Direct API proxy rewrite: `/api/:path*` -> `http://localhost:4000/api/:path*`.
- **`server/.env`:**
  - `APP_URL="http://localhost:3000"`
  - `FRONTEND_PORT="3000"`
- **`server/src/lib/workspace-host.ts`:**
  - `getWorkspaceUrl()` and `getRootUrl()` resolve `defaultDevPort = process.env.FRONTEND_PORT ? parseInt(process.env.FRONTEND_PORT, 10) : 3000`.

### Port 5173 Defect in Next.js Codebase
A grep audit for `5173` across `CMS/` uncovered two active occurrences in `CMS/src/app/super/settings/page.tsx`:
- **Line 1384:** `href={`http://${selectedTenant.domain || `${selectedTenant.slug}.localhost:5173`}/settings`}`
- **Line 1605:** `http://{selectedTenant?.slug}.localhost:5173/settings`  
*Remediation Required:* Update both lines to reference `process.env.NEXT_PUBLIC_BASE_PORT || 3000`.

---

## 2. Route Inventory Reconciliation

Forensic script `scratch/parse-routetree.cjs` extracted all 507 routes declared in `src/routeTree.gen.ts` and compared them to actual `page.tsx` files under `CMS/src/app/`:

| Classification | Count | Description |
|---|---|---|
| **COMPLETED_AND_FUNCTIONAL** | **432** | Authenticated HRMS, Employee Self-Service (`/me/*`), Super Admin (`/super/*`), Tenant Admin (`/tenant/*`), Core POS/CRM/Finance/Invoices/Projects, and Public CMS pages. |
| **MISSING** | **75** | Routes present in `src/routeTree.gen.ts` with no corresponding `page.tsx` in `CMS/src/app/`. |
| **PARTIALLY_MIGRATED** | **0** | All existing Next.js pages export valid components and build cleanly. |
| **BLOCKED** | **0** | No routes are blocked by backend or protocol dependencies. |

### Complete List of 75 Missing Routes

#### Cluster A: Addons Modular Workflows (36 routes)
*Origin: `src/routes/_authenticated/_app/addons/...`*
1. `/addons/` (`src/routes/addons.index`)
2. `/addons/$slug` (`src/routes/addons_.$slug`)
3. `/addons/ai-assistant/fields`
4. `/addons/ai-assistant/settings`
5. `/addons/ai-assistant/usage`
6. `/addons/ai-assistant/history/`
7. `/addons/ai-assistant/history/$id`
8. `/addons/ai-document/analytics`
9. `/addons/ai-document/generate`
10. `/addons/ai-document/settings`
11. `/addons/ai-document/template-categories`
12. `/addons/ai-document/tones`
13. `/addons/ai-document/history/`
14. `/addons/ai-document/history/$id`
15. `/addons/ai-document/templates/`
16. `/addons/ai-document/templates/new`
17. `/addons/ai-document/templates/$id/edit`
18. `/addons/planning/dashboard`
19. `/addons/planning/challenges/`
20. `/addons/planning/challenges/new`
21. `/addons/planning/challenges/$id/`
22. `/addons/planning/challenges/$id/edit`
23. `/addons/planning/charters/`
24. `/addons/planning/charters/grid`
25. `/addons/planning/charters/kanban`
26. `/addons/planning/charters/new`
27. `/addons/planning/charters/tree`
28. `/addons/planning/charters/$id/`
29. `/addons/planning/charters/$id/edit`
30. `/addons/planning/setup/categories`
31. `/addons/planning/setup/stages`
32. `/addons/planning/setup/statuses`
33. `/addons/webhook/events`
34. `/addons/webhook/settings`
35. `/addons/webhook/endpoints/`
36. `/addons/webhook/endpoints/new`
37. `/addons/webhook/endpoints/$id/`
38. `/addons/webhook/endpoints/$id/edit`

#### Cluster B: Error, Status & Maintenance Pages (9 routes)
*Origin: `src/routes/*.tsx`*
39. `/403` (`src/routes/403.tsx`)
40. `/404` (`src/routes/404.tsx` — Next.js uses `not-found.tsx`, but explicit URL missing)
41. `/500` (`src/routes/500.tsx` — Next.js uses `error.tsx`, but explicit URL missing)
42. `/error-404` (`src/routes/error-404.tsx`)
43. `/error-500` (`src/routes/error-500.tsx`)
44. `/maintenance` (`src/routes/maintenance.tsx`)
45. `/offline` (`src/routes/offline.tsx`)
46. `/session-expired` (`src/routes/session-expired.tsx`)
47. `/lock-screen` (`src/routes/lock-screen.tsx`)

#### Cluster C: Public Marketing, Content & Documentation (10 routes)
*Origin: `src/routes/*.tsx`*
48. `/careers` (`src/routes/careers.tsx`)
49. `/developer` (`src/routes/developer.tsx`)
50. `/docs` (`src/routes/docs.tsx`)
51. `/help-center` (`src/routes/help-center.tsx`)
52. `/og-preview` (`src/routes/og-preview.tsx`)
53. `/product` (`src/routes/product.tsx`)
54. `/resources` (`src/routes/resources.tsx`)
55. `/solutions` (`src/routes/solutions.tsx`)
56. `/store` (`src/routes/store.tsx`)
57. `/customer-display` (`src/routes/customer-display.tsx` — POS Dual-screen customer display)

#### Cluster D: Dynamic Links & External Client Portals (11 routes)
*Origin: `src/routes/*.tsx`*
58. `/a/$tag` (`src/routes/a.$tag.tsx`)
59. `/cms/` (`src/routes/cms.index.tsx`)
60. `/cms/$` (`src/routes/cms.$.tsx`)
61. `/legal/$slug` (`src/routes/legal.$slug.tsx`)
62. `/p/$slug` (`src/routes/p.$slug.tsx`)
63. `/payment/failed` (`src/routes/payment.failed.tsx`)
64. `/payment/pending` (`src/routes/payment.pending.tsx`)
65. `/payment/success` (`src/routes/payment.success.tsx`)
66. `/portal` (`src/routes/portal.tsx`)
67. `/portal/invoices/$id` (`src/routes/portal.invoices.$id.tsx`)
68. `/portal/proposals/$id` (`src/routes/portal.proposals.$id.tsx`)

#### Cluster E: Legacy Tenant & Client Route Aliases (7 routes)
*Origin: `src/routes/_authenticated/...`*
69. `/onboarding` (`src/routes/_authenticated/onboarding.tsx`)
70. `/tenet` (`src/routes/_authenticated/tenet.tsx`)
71. `/tenet/$` (`src/routes/_authenticated/tenet/$.tsx`)
72. `/client/` (`src/routes/_authenticated/client/index.tsx`)
73. `/client/dashboard` (`src/routes/_authenticated/client/dashboard.tsx`)
74. `/employee/` (`src/routes/_authenticated/employee/index.tsx`)
75. `/employee/dashboard` (`src/routes/_authenticated/employee/dashboard.tsx`)

---

## 3. Authentication & Security Verification

### Real Implementation Inspection
1. **Frontend Authentication Components:**
   - `CMS/src/components/auth/UnifiedAuthPage.tsx`: Powers `/login`, `/auth`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
   - `CMS/src/components/auth/Super06AuthPage.tsx`: Dedicated security portal powering `/super06` and `/super-login`.
2. **Session Persistence & Synchronization:**
   - `CMS/src/lib/session.ts` and `api.ts`: Auth tokens stored in `localStorage` (`hrms_auth_token`) and mirrored to cookies (`path=/; SameSite=Lax`).
   - Cross-tab synchronization handled via window events (`storage`, `auth-token-changed`).
   - Token refresh and cache eviction handled automatically via TanStack Query on HTTP 401.
3. **Backend Enforcement vs. Frontend Guards:**
   - Frontend UX guard in `SuperShell.tsx`:
     ```tsx
     if (profile && !isSuperAdmin) {
       return <ForbiddenView requiredRole="super_admin" ... />;
     }
     ```
   - Authoritative Express Middleware in `server/src/middleware/auth.ts`:
     ```typescript
     export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
       if (!req.user || !req.user.roles.includes("super_admin")) {
         return res.status(403).json({ error: "Forbidden: Super Admin access required" });
       }
       next();
     }
     ```
   - Tested empirically: Even with direct API calls bypassing the Next.js UI, `server/src/routes/super.routes.ts` strictly rejects Tenant Admin tokens with HTTP 403.
4. **Cloudflare Turnstile Verification:**
   - Server-side verification enforced in `server/src/routes/auth.routes.ts` via `requireTurnstile()`.
   - Frontend widget in `turnstile-widget.tsx` verified to fall back cleanly in local development when enforcement is set to `off`.

---

## 4. Business Workflow Verification

Real database backend tests were executed to verify core business operations:

### 1. Employee Directory & List Tallies
- **Suite:** `server/src/tests/hr-employee-directory-backend.test.ts`
- **Result:** 6 passed (8.41s)
- **Verified Operations:**
  - Real database queries with tenant scoping
  - Pagination (page sizes 10, 20, 30)
  - Profile enrichment (`loginStatus`, `avatarUrl`, organization relations)
  - Filtering by status, branch, department, designation, and employment type
  - Cross-tenant data isolation (Tenant A cannot see Tenant B employees)

### 2. Employee Creation, Editing & Field-Level Security
- **Suite:** `server/src/tests/hr-employee-edit-backend.test.ts`
- **Result:** 17 passed (36.94s)
- **Verified Operations:**
  - Updating personal & employment information
  - Password preservation when blank, password hash update when provided
  - Duplicate employee code & email rejection within tenant
  - Cross-tenant branch reference rejection
  - Field-level security: Salary/banking modification denied to Tenant Admin without explicit sensitive permission (HTTP 403)
  - Document verification and deletion restricted to HR Admin
  - Cross-tenant document isolation (HTTP 404)
  - Employee ID immutability

---

## 5. Build & Test Results Summary

| Test Suite / Command | Scope | Freshly Executed? | Exit Code | Result |
|---|---|---|---|---|
| `npm --prefix CMS run typecheck` | Next.js Frontend TypeScript | Yes | 0 | 0 errors |
| `npm --prefix CMS run build` | Next.js Turbopack Production Build | Yes | 0 | 431 pages prerendered |
| `npm run test:cms-isolation` | CMS Host & Tenant Isolation | Yes | 0 | 8 passed (8) |
| `super-admin-authorization-guard.test.ts` | Super Admin RBAC & Route Guard | Yes | 0 | 11 passed (11) |
| `tenant-proxy-fail-closed.test.ts` | Tenant Fail-Closed Security | Yes | 0 | 5 passed (5) |
| `turnstile-verification.test.ts` | Turnstile Bot Verification | Yes | 0 | 13 passed (13) |
| `hr-employee-directory-backend.test.ts` | HR Employee Directory & Scoping | Yes | 0 | 6 passed (6) |
| `hr-employee-edit-backend.test.ts` | HR Employee Edit Wizard & Security | Yes | 0 | 17 passed (17) |
| `scratch/test-acceptance-suite.cjs` | Full Port 3000 -> 4000 Integration | Yes | 0 | 43 passed (43) |

---

## 6. Contradictions Between Migration Report & Current Repository

1. **Route Parity Claim:**  
   - *Report Claim:* "All 508 Vite routes across 7 clusters migrated."  
   - *Forensic Finding:* Exactly **432 routes** were matched in Next.js; **75 routes are missing**.
2. **"No Workflow Requires Port 5173" Claim:**  
   - *Report Claim:* "Vite on port 5173 is retired and no workflow requires it."  
   - *Forensic Finding:* Port 5173 is indeed stopped, but `CMS/src/app/super/settings/page.tsx` still contains hardcoded links to `localhost:5173`.
3. **Addons Module Omission:**  
   - *Report Claim:* All enterprise add-on modules were migrated.  
   - *Forensic Finding:* The folder `CMS/src/app/(workspace)/addons` does not exist; all 36 AI-assistant, AI-document, Planning, and Webhook sub-routes were omitted during the batch script copy.

---

## 7. Prioritized Defect Register & Remediation Plan

### Defect 1 (Severity: High) — Missing 36 Addon Sub-routes
- **Impact:** Navigating to `/addons/ai-document/*`, `/addons/planning/*`, or `/addons/webhook/*` returns 404 in Next.js.
- **Root Cause:** Subdirectories inside `src/routes/_authenticated/_app/addons/` were omitted when flattening `_app/*.tsx`.
- **Proposed Remediation:** Recursively copy `src/routes/_authenticated/_app/addons/` into `CMS/src/app/(workspace)/addons/`, normalize dynamic folder names to Next.js `[param]` syntax, and replace TanStack Router imports with `@/src/lib/router-compat`.

### Defect 2 (Severity: Medium) — Missing External Client Portals & Payment Callbacks
- **Impact:** Routes `/portal/invoices/[id]`, `/portal/proposals/[id]`, `/payment/success`, `/payment/failed` return 404.
- **Root Cause:** Dot-notation routes (`portal.invoices.$id.tsx`) were not converted to Next.js route segments.
- **Proposed Remediation:** Create `CMS/src/app/portal/invoices/[id]/page.tsx`, `CMS/src/app/portal/proposals/[id]/page.tsx`, and `CMS/src/app/payment/success/page.tsx`.

### Defect 3 (Severity: Medium) — Missing Standalone Marketing & Customer Display Pages
- **Impact:** Public pages `/careers`, `/docs`, `/product`, `/resources`, `/solutions`, and POS dual-screen `/customer-display` are missing.
- **Proposed Remediation:** Migrate the corresponding `.tsx` files from `src/routes/` to `CMS/src/app/`.

### Defect 4 (Severity: Low) — Hardcoded Port 5173 in `super/settings/page.tsx`
- **Impact:** Clicking tenant settings from the Super Admin table links to dead port 5173.
- **Proposed Remediation:** In `CMS/src/app/super/settings/page.tsx` lines 1384 & 1605, replace `:5173` with `:3000`.

---

## 8. Final Forensic Status

### Status: **ACCEPTED_WITH_LIMITATIONS**

**Justification:**
1. **Accepted:** The core HRMS application, authentication architecture, Employee Self-Service portal, Super Admin control center, and tenant administrative workflows operate natively through Next.js on port 3000 and connect to Express on port 4000. All 60 database regression tests and full TypeScript validation pass without errors. Vite on port 5173 is retired from normal operation.
2. **Limitations:** 75 secondary routes (primarily modular Addons, External Client Invoicing portals, and standalone marketing pages) were omitted during the initial copy and must be populated in a subsequent remediation task.
