# Phase 14 — Remediation Baseline Freeze & Inventory Reconciliation

- **Freeze Timestamp**: 2026-11-27T23:51 IST
- **Baseline Git Commit (`main`)**: `677676f9` (`fix(build): resolve CMS assetTag and server auth/super-integrations TypeScript errors for Vercel deploy`)
- **Prior Remediation Commit on `main`**: `b95a7b80` (`fix(hrms): remediate all 37 QA defects across backend, workspace shell, RBAC, PII security, and E2E suite`)
- **Dedicated Remediation Branch**: `remediation/qa-stabilization-p14-p21`
- **Recoverable Dev DB Snapshot**: [dev-db-baseline-snapshot.json](./backups/dev-db-baseline-snapshot.json) (`tenants: 77`, `users: 703`, `profiles: 382`, `employees: 78`, `workspaceTodos: 13`, `leaveRequests: 12`, `holidays: 3`, `meetings: 1`, `awards: 7`, `employeeTrips: 2`, `employeeExits: 7`, `notifications: 1008`, `auditLogs: 812`)
- **Preserved Original QA Evidence**: All files under `test-results/**`, `tests/e2e/masterhrms-critical-workflows.spec.ts`, and `playwright.e2e.config.ts` remain untouched.

---

## 1. Baseline Reconciliation (Route & API Count Definitions)

| Metric | Phase 0 Discovery (HEAD `677676f9`) | Earlier Phase 13 Reference | Reconciled Authoritative Definition |
|---|---:|---:|---|
| **Active Next.js UI Pages** | **720** `page.tsx` files | 717 pages | Exact filesystem count on `677676f9` is **720** `page.tsx` + **4** `route.ts` API handlers = **724** Next.js App Router files (+ 1 `not-found.tsx`). The +3 delta reflects pages added between the earlier Phase 13 snapshot and `677676f9`. |
| **Legacy Frontend Routes** | **549** `src/routes/**/*.tsx` | Not counted in CMS | Co-located legacy TanStack Start routes not served by Next.js on port 3000; excluded from active CMS route totals and tracked separately for retirement. |
| **Backend Express Surface** | **151** route files / **2,423** route handlers / **217** `app.use` mounts | 210 API mounts | `server/src/routes/*.ts` defines **2,423** individual HTTP verb handlers across **151** files, mounted via **217** Express `app.use(...)` statements in `server/src/index.ts` (including 55 dual-mounted `/api/v1/*` + `/api/*` routers, `awardsRouter` mounted 6x, `organizationRouter` mounted 4x). The +7 mount delta reflects recent routers added prior to `677676f9`. |

---

## 2. Playwright 7-Test Regression Suite Baseline Verification
- Executed `npx playwright test --list -c playwright.e2e.config.ts` -> **7 / 7 tests discovered cleanly** (`SA-001 & ENV-008`, `HR-CRUD-01`, `LEAVE-001`, `TASK-001 & GANTT-001`, `CHAT-001`, `ADDON-001`, `ISO-001`).

---

## 3. Dual Defect Catalog Reconciliation
1. **Prior 37-Defect Kovai Textails Catalog** (roadmap §4–6): Addressed on `main` in commit `b95a7b80` (verified in our live QA: e.g., original `DEFECT-027` employee PII stripping and original `DEFECT-001` Razorpay sandbox downgrade are active on `677676f9`).
2. **Active 19 Open Defects Verified Live on `677676f9`** ([test-results/defect-register.md](../test-results/defect-register.md)): Newly uncovered or regressed P0–P3 defects on `677676f9` (including **3 P0 blockers**: `DEFECT-016` terminated session still active, `DEFECT-017` HR meetings 100% broken, `DEFECT-011` award nomination Prisma crash + stack trace leak; plus **10 P1 defects**: `DEFECT-001`, `DEFECT-003`, `DEFECT-004`, `DEFECT-005`, `DEFECT-008`, `DEFECT-012`, `DEFECT-015`, `DEFECT-018`, `DEFECT-019`, `DEFECT-020`).
