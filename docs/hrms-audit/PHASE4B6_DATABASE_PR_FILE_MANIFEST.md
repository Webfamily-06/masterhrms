# MASTERHRMS — PHASE 4B.6
# DATABASE-ONLY PR FILE MANIFEST & SCOPE SEPARATION SPECIFICATION

**Document Reference:** `docs/hrms-audit/PHASE4B6_DATABASE_PR_FILE_MANIFEST.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal Release Engineer & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Proposed Branch:** `fix/database-migrations-pg17` (Branching from `main` @ `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`)  
**Proposed PR Status:** Awaiting Human Operator Authorization (Zero Git Mutations Executed)  

---

## 1. Scope Boundary Rules

1. **Database Only:** Only PostgreSQL DDL migrations, automated migration test harnesses, and migration audit documentation may be staged into this PR.
2. **Zero Application Contamination:** All unrelated payroll orchestrator changes, crash recovery route handlers, distributed advisory locks, and statutory service enhancements must remain excluded.
3. **Zero Generated Artifacts:** All files in `server/dist/` are generated build outputs and must remain excluded.

---

## 2. Exhaustive File Manifest

### A. Files to Include (Scope A — Database Migration PR):
| # | File Path | Status | Size (Bytes) | SHA-256 Checksum | Architectural Purpose |
| :-: | :--- | :---: | :---: | :--- | :--- |
| **1** | `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql` | Modified | 1,998 | `b2685a0f108cabb31dd6508f7489f226d242e8b2350f51f64a20ab8918149dc4` | Pure PostgreSQL 17 rewrite of `device_sessions` table |
| **2** | `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql` | Untracked | 887 | `c690e00389f5d80c548f2ca74deeff24534894a680b7957d6119dede4f26070e` | Migration 10: Financial partial unique indexes (GL & loan) |
| **3** | `scripts/pg17_container_certification.cjs` | Untracked | 17,039 | `37d47c054ffab51d403f15249da214e60e4f45300a2909d318c18ad490440a26` | Automated Docker PostgreSQL 17 container certification test runner |
| **4** | `scripts/verify_migrations_1_7.cjs` | Untracked | 16,699 | `f21ed173deec71227c1afcadb160741da193cccf47170c1d0257bba88027169f` | Read-only 48-statement physical catalog equivalence checker |
| **5** | `scripts/isolated_integration_test.cjs` | Untracked | 11,540 | `901f68172c72b22bbbb331fcba879c7cb324b1057e0f340801a65d50201d4a0f` | Local PostgreSQL integration test harness |
| **6** | `docs/hrms-audit/PHASE4B_PRODUCTION_MIGRATION_RUNBOOK.md` | Untracked | 14,820 | `9e0e5ea4e84b7fcf7c7c0db6be4617cb0fe719463cfa5d447fbb3c70f61ce7b4` | Step-by-step operator execution runbook |
| **7** | `docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md` | Untracked | 8,395 | `425a9601c4532b622cbb078795dc89b6e127b6403fb2c507c6f9a2f568084f4c` | Working tree audit and scope separation document |
| **8** | `docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md` | Untracked | 10,899 | `d0d584e7004c2c44e2b1a05a7cf03ccfcbeaa34374968c6c6cdcd761a18b659e` | Source code reconciliation across M8, M9, M10 |
| **9** | `docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md` | Untracked | 8,016 | `8547f0d897efa9ba4b4ac96d8f8d024e9d92b8accf32a3656e8c5bab34fdacd9` | Baseline matrix for M1–M7 |
| **10**| `docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md` | Untracked | 6,025 | `f06d9cadcc7714ea11aa8eac41274649fd78d7750b383cfd91032a9776c620b9` | Preliminary PR manifest |
| **11**| `docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md` | Untracked | 5,558 | `d8f22e03dd6343e5d2e9ec72bfb965a60e3d8869f265a554dff18964110bc196` | Backup and restore readiness runbook |
| **12**| `docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md` | Untracked | 7,322 | `c16b4271025b3d070db01e1ec977dfdbd3ec78605cf423fb11e5842bed9917d2` | Final gate verdict report |
| **13**| `docs/hrms-audit/PHASE4B6_SOURCE_EVIDENCE_BUNDLE.md` | Untracked | ~40 KB | (Self-referential deliverable) | Complete source code bundle of all 11 files |
| **14**| `docs/hrms-audit/PHASE4B6_SHA256_MANIFEST.txt` | Untracked | 2,850 | `b99e710243438992e54eb8be34262ae3fe5fba52cfce9fc97519ff085ca95995` | Raw recalculation of all file hashes |
| **15**| `docs/hrms-audit/PHASE4B6_PG17_CERTIFICATION_EVIDENCE.md` | Untracked | ~10 KB | (Self-referential deliverable) | Full PG17 container test logs |
| **16**| `docs/hrms-audit/PHASE4B6_M1_M7_BASELINE_EVIDENCE.md` | Untracked | ~12 KB | (Self-referential deliverable) | 48-statement baseline evidence table |
| **17**| `docs/hrms-audit/PHASE4B6_DATABASE_PR_FILE_MANIFEST.md` | Untracked | ~8 KB | (This document) | Final PR scope and manifest specification |
| **18**| `docs/hrms-audit/PHASE4B6_OPEN_ISSUES.md` | Untracked | ~6 KB | (Self-referential deliverable) | Open risks, gating items, and prerequisites |

---

### B. Files Strictly Excluded (Scope B & C — Preserved Locally):
| File Path | Classification | Justification for Exclusion |
| :--- | :---: | :--- |
| `server/src/routes/payroll-cycles.routes.ts` | Scope B | Application route adding `POST /:id/recover` crash recovery handler |
| `server/src/services/contract-invoice.service.ts` | Scope B | Application service implementing invoice generation idempotency |
| `server/src/services/ledger-posting.service.ts` | Scope B | Application service implementing transaction-level advisory locks |
| `server/src/services/payroll-orchestrator.service.ts` | Scope B | Application service implementing atomic claim-check & lifecycle rollback |
| `server/src/services/payroll-validation.service.ts` | Scope B | Application service adding preflight variance checks & blocker gates |
| `server/src/tests/distributed-payroll-concurrency.test.ts` | Scope B | Application test suite for distributed recovery and concurrency |
| `server/dist/index.js` | Scope C | Generated build artifact |
| `server/dist/services/contract-invoice.service.js` | Scope C | Generated build artifact |
| `server/dist/services/ledger-posting.service.js` | Scope C | Generated build artifact |
| `server/dist/services/payroll-validation.service.js` | Scope C | Generated build artifact |
| `server/dist/services/statutory-form-data.service.js`| Scope C | Generated build artifact |
| `server/dist/routes/payroll-cycles.routes.js` | Scope C | Generated build artifact |
| `server/dist/routes/statutory-registers.routes.js` | Scope C | Generated build artifact |
| `server/dist/services/payroll-orchestrator.service.js`| Scope C | Generated build artifact |
| `server/dist/services/statutory/*` | Scope C | Generated build artifacts |

---

## 3. Pull Request Submission Specification

### Target Branch:
`main`

### Proposed Source Branch:
`fix/database-migrations-pg17`

### Proposed PR Title:
```
fix(db): reconcile PostgreSQL 17 migrations, device sessions DDL and financial idempotency constraints
```

### Proposed PR Body:
```markdown
## Summary
This pull request contains database migration reconciliations for the MASTERHRMS platform targeting PostgreSQL 17 (Supabase):

1. **Migration 8 (`device_sessions`):**
   - Replaces committed MySQL syntax on `main` with pure PostgreSQL 17 DDL (`VARCHAR(36)`, `TIMESTAMP(3)`, `BOOLEAN`, double-quoted identifiers).
   - Establishes primary key, 4 secondary indexes, and idempotent foreign key constraints (`ON DELETE CASCADE` for user, `ON DELETE SET NULL` for tenant).

2. **Migration 10 (`aud_conc_002_idempotency_constraints`):**
   - Creates partial unique index `uq_journal_entries_tenant_payroll_run` on `(tenant_id, reference)` WHERE `reference_type = 'payroll'`.
   - Creates partial unique index `uq_loan_installments_loan_payroll_run` on `(loan_id, payroll_run_id)` WHERE `payroll_run_id IS NOT NULL`.

3. **Automated Verification Harnesses & Evidence:**
   - Includes `scripts/pg17_container_certification.cjs` and `scripts/verify_migrations_1_7.cjs`.
   - All tests certified 100% PASS on isolated PostgreSQL 17.11 container (`masterhrms-pg17-audit`).
   - M1–M7 48-statement physical equivalence verified against Supabase PostgreSQL 17.

## Scope Boundary Guarantee
- Zero application code, route changes, or service logic are included in this PR.
- Zero build artifacts (`server/dist`) are included in this PR.
- All unrelated payroll work remains preserved in separate application branches.
```

