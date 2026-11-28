# Phase 14–22 — Reconciled Remediation Execution Board (14-Agent Allocation)

> **Branch:** `remediation/qa-stabilization-p14-p21` (`c4a62045`, base `main` @ `677676f9`)  
> **Phase 22 Traceability Reconciliation:** `REM-001`–`REM-013` addressed **Wave 2 Gokul QA Defects (`W2-DEFECT-001`–`W2-DEFECT-020`)** and are hereby reclassified as **Supplementary Wave-2 Remediations (`SREM-001`–`SREM-013`)** so they do NOT falsely close unrelated Wave-1 (`W1-DEFECT-001`–`W1-DEFECT-037`) defects. See [phase22-defect-traceability-audit.md](../test-results/phase22/phase22-defect-traceability-audit.md) and [phase22-remediation-reverification.md](../test-results/phase22/phase22-remediation-reverification.md).

## 1. Supplementary Wave-2 Remediations (`SREM-001` – `SREM-013`)

| Reclassified ID (Orig. REM) | Linked Wave-2 Defect | Wave-1 Overlap | Severity | Owner / Reviewer | Phase 22 Independent Re-Verification Evidence | Reconciled Status |
|---|---|---|---|---|---|---|
| **`SREM-001`** (`REM-001`) | `W2-DEFECT-016` *(NOT `W1-DEFECT-016`)* | None | **Critical (P0)** | Agent 14 + 11 / Agent 05 | Runtime revocation verified (`EMP12_ACTIVE: 0, REVOKED: 5`); fixed `newData` → `details` at `hr-lifecycle.routes.ts:1228` (`npm run build:server` Exit `0`) | **Verified** |
| **`SREM-002`** (`REM-002`) | `W2-DEFECT-011` *(NOT `W1-DEFECT-011`)* | None | **Critical (P0)** | Agent 06 / Agent 04 + 05 | Fresh nomination (`201`), negative emp self-approve blocked (`400`), HR approve (`200`), HR issue (`201`), `leaksPath: false` | **Verified** |
| **`SREM-003`** (`REM-003`) | `W2-DEFECT-020` *(NOT `W1-DEFECT-020`)* | None | **High (P1)** | Agent 05 + 06 / Agent 11 | HR `view=org` → `200`, negative Employee `view=org` → `403`, `/hr/files` `0` console errors | **Verified** |
| **`SREM-004`** (`REM-004`) | `W2-DEFECT-019` *(NOT `W1-DEFECT-019`)* | None | **High (P1)** | Agent 10 + 09 / Agent 05 | Emp HR trips API → `403`, Emp ME trips API → `200`, `/me/lifecycle/trips` & `/me/files` `0` errors | **Verified** |
| **`SREM-005`** (`REM-005`) | `W2-DEFECT-017` *(NOT `W1-DEFECT-017`)* | None | **Critical (P0)** | Agent 06 + 11 / Agent 02 | HR meetings work (`201` + RSVP + status); fixed `newData` → `details` at `hr-meetings.routes.ts:823` (`build:server` Exit `0`) AND added HR/Admin guard (`emp1` `403`, HR `201`) | **Verified** |
| **`SREM-006`** (`REM-006`) | `W2-DEFECT-015` | **Partial `W1-DEFECT-009`** | **High (P1)** | Agent 12 + 13 / Agent 05 | Subdomain `/tenant/dashboard` renders impersonation banner cleanly; stripped `super_admin` during impersonation (`auth.ts` & `super.routes.ts`): cross-tenant file `404`, `/v1/super/tenants` `403`, re-impersonate `403`, `/leave-impersonation` `200` | **Verified** |
| **`SREM-007`** (`REM-007`) | `W2-DEFECT-018` *(NOT `W1-DEFECT-018`)* | None | **High (P1)** | Agent 11 + 10 / Agent 07 | Live toggle `pending → false`, `completed → true` in DB; `/hr/todo` KPI `Completed: 10, Pending: 0` | **Verified** |
| **`SREM-008`** (`REM-008`) | `W2-DEFECT-012` *(NOT `W1-DEFECT-012`)* | None | **High (P1)** | Agent 06 / Agent 05 | Missing, invalid, and inverted trip dates all return clean `400`, zero stack trace | **Verified** |
| **`SREM-009`** (`REM-009`) | `W2-DEFECT-013` *(NOT `W1-DEFECT-013`)* | None | **Medium (P2)** | Agent 06 / Agent 07 | `"file"` → `201`, `"files"` → `201`, `"bogus_field"` → `400` | **Verified** |
| **`SREM-010`** (`REM-010`) | `W2-DEFECT-003` *(NOT `W1-DEFECT-003`)* | None | **High (P1)** | Agent 09 + 03 / Agent 11 + 13 | Live DOM sidebar scan: `deadLinks: []` | **Verified** |
| **`SREM-011`** (`REM-011`) | `W2-DEFECT-009` *(NOT `W1-DEFECT-009`)* | None | **Medium (P2)** | Agent 06 / Agent 04 | Postgres `auditDelta: +1`, `notifDelta: +1` verified; fixed `hr-meetings.routes.ts:823` (`build:server` Exit `0`) | **Verified** |
| **`SREM-012`** (`REM-012`) | `W2-DEFECT-001` *(NOT `W1-DEFECT-001`)* | None | **High (P1)** | Agent 06 + 12 / Agent 05 | Super `200`, Impersonated Super `403`, Real Owner `403`, HR `403`, Emp `403`, Anon `401` | **Verified** |
| **`SREM-013`** (`REM-013`) | `W2-DEFECT-005` *(NOT `W1-DEFECT-005`)* | None | **High (P1)** | Agent 09 + 06 / Agent 08 | `0` duplicate APIs on 9/11 audited sub-pages; backend 55 dual mounts & prod-build initial-load check still pending | **Verified (Scoped)** |

## 2. Newly Opened Phase 22 Release-Blocking Tasks

| Task ID | Linked Finding | Severity | Required Action | Status |
|---|---|---|---|---|
| **`REM-P22-01`** | `P22-BUILD-001` | **Critical (P0)** | Fixed `newData:` → `details:` in `hr-lifecycle.routes.ts:1228` & `hr-meetings.routes.ts:823`, fixed `typecheck:server`, verified `npm run build:server` (`Exit 0`) | **Verified** |
| **`REM-P22-02`** | `P22-SEC-001` (`W1-DEFECT-009`, `W1-DEFECT-032`) | **High (P1)** | Stripped `super_admin` from impersonation JWTs & `requireAuth`; verified cross-tenant file `404`, `/v1/super/tenants` `403`, re-impersonate `403`, `/leave-impersonation` `200` | **Verified** |
| **`REM-P22-03`** | `P22-SEC-002` | **High (P1)** | Added HR/Admin role guard on mutating `hr-meetings.routes.ts` endpoints; verified `emp1` `403` vs HR `201` | **Verified** |
| **`REM-P22-04`** | `P22-AUTH-001` (`BLOCK-001`) | **High (P1)** | Set `TURNSTILE_ENFORCEMENT_MODE="enforce"` on staging/production and complete 4-persona human Turnstile UAT | **Open (Blocks Staging UAT & Prod)** |
| **`REM-P22-05`** | Wave-1 Unverified (15) + Playwright (7/7) | **Critical/High** | Execute 7-test Playwright suite + runtime-verify 15 unverified Wave-1 defects on isolated staging production build | **Open (Blocks Prod)** |

## 3. Deferred / Architectural Backlog (Explicit Risk — Waiver Required for Production)

| Defect ID | Severity | Actual Risk Summary |
|---|---|---|
| `W2-DEFECT-004` + `W1-DEFECT-011` | **High (P1)** | **Partially Mitigated (Wave-3):** All 15 dead nav/storefront routes eliminated (`DEFECT-040` + `npm run validate:routes`), and unconditional `/tenant/biometric-sync`, `/activity-logs`, `/backup-restore` tenant sidebar links gated behind `isSuperAdmin \|\| isEntitled(...)`. Full 4-way nav registry consolidation remains deferred architectural backlog. |
| `W2-DEFECT-008` | **High (P1)** | 3-table storage fragmentation (`MediaFile: 334`, `CompanyDocument: 11`, `StoredDocument: 6`) causes quota bypass & inconsistent retention/deletion. |
| `W2-DEFECT-006` | Medium (P2) | Existing customer `hr@kovaitextails.com` has legacy `["employee"]` vs `["Workspace Admin"]` (runtime-mitigated via `auth.ts` `DEFECT-019` unification); requires customer-approved ops reconciliation. |
| `W2-DEFECT-007` | Low (P3) | **Code Implemented (Phase 25 — `PARTIAL-006`):** Added `async headers()` in `CMS/next.config.ts` with Turnstile (`challenges.cloudflare.com`) & Razorpay (`checkout.razorpay.com`) compatible `Content-Security-Policy-Report-Only`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. Remaining gate: verify under staging production `next start` with Turnstile `enforce` mode before switching CSP to enforce. |
| `W2-DEFECT-002`, `P22-HYG-001` | Low / High | `W2-002` not reproduced (`200` on `/super/compliance` in Phase 22 & Wave-3); `P22-HYG-001` rotate GitHub PAT embedded in local git remote. *(`W2-DEFECT-010` **CLOSED in Wave-3**: cleaned 18 broken package scripts + added `validate:routes`, `test:e2e`, `test:server` + Vitest `hr-rbac.test.ts`.)* |

## 4. Phase 23 / Wave-3 Gap Audit & Remediation Closures (2026-11-28)

| Task / Defect ID | Severity | Summary & Files Fixed | Verification Evidence | Status |
|---|---|---|---|---|
| **`DEFECT-038`** | **Critical (P0)** | Fixed `/super/languages` uncaught client `TypeError` (`currentLang && currentLang.code !== "en"`) & mutation unwraps (`CMS/src/app/super/languages/page.tsx`) | `wave3_gap_verification.json` (`status=200, pageErrs=0, consoleErrs=0`), `VERIFY_11_super_languages_zero_crash.png` | **Verified** |
| **`DEFECT-039`** | **High (P1)** | Replaced 82 raw `return res.data;` React Query v5 unwraps & hardened error handlers across 63 CMS files (`/me/*`, `/hr/*`, `/super/cms`, ERP workspace) | `npm run cms:typecheck` Exit `0` + `10/10` sampled routes HTTP `200`, `0` errors (`VERIFY_12_me_regularizations_clean.png`) | **Verified** |
| **`DEFECT-040`** | **High (P1)** | Fixed 15 dead 404 routes in `tenant-addon-storefront.tsx`, `nav/registry.ts`, `lib/navigation-registry.ts`, `lib/routes.ts` + added `scripts/validate_routes_integrity.cjs` | `npm run validate:routes` (`528/528` targets / `720` pages, `0` dead) + `13/13` live remapped targets HTTP `200` | **Verified** |
| **`DEFECT-041`** | **High (P1)** | Added shared `server/src/middleware/hr-rbac.middleware.ts` across 8 HR routers (`hr-dashboard`, `hr-mail-templates`, `hr-collaboration`, `hr-zoom-meetings`, `hr-recruitment`, `hr-documents`, `hr-performance`, `hr-training`) with self-service allowlists & ownership checks | `npm run test:server` (`5/5` Vitest passed in `hr-rbac.test.ts`) + `11/11` live `401` auth boundaries + `typecheck:server` & `tsc` Exit `0` | **Verified** |
| **`W2-DEFECT-010`** | Medium (P2) | Cleaned 18 broken `package.json` / `server/package.json` test scripts & created missing `test-results/phase22/*.md` reports | `npm run validate:routes`, `npm run test:server`, `npm run test:e2e:list` all Exit `0`; `0` broken links across `test-results/` & `remediation/` | **Verified** |
