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
| `W2-DEFECT-004` + `W1-DEFECT-011` | **High (P1)** | 4-way nav registry drift + unentitled paid modules (`Payroll`, `Recruitment`, etc.) still shown on Starter Cloud tenant sidebar (`67` links). |
| `W2-DEFECT-008` | **High (P1)** | 3-table storage fragmentation (`MediaFile: 334`, `CompanyDocument: 11`, `StoredDocument: 6`) causes quota bypass & inconsistent retention/deletion. |
| `W2-DEFECT-006` | Medium (P2) | Existing customer `hr@kovaitextails.com` has legacy `["employee"]` vs `["Workspace Admin"]`; requires customer-approved ops reconciliation. |
| `W2-DEFECT-007` | Low (P3) | Verify Turnstile CSP headers under production `next start` with `enforce` mode so real users are not locked out. |
| `W2-DEFECT-002`, `W2-DEFECT-010`, `P22-HYG-001` | Low / High | `W2-002` not reproduced (`0` 404s on `/super/compliance`); `W2-010` broken root scripts + missing local `vitest`; `P22-HYG-001` rotate GitHub PAT embedded in local git remote. |
