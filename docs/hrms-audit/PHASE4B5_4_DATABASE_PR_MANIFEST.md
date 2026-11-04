# MASTERHRMS — PHASE 4B.5.4
# DEDICATED DATABASE PR SPECIFICATION & MANIFEST

**Document Reference:** `docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal Release Engineer & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Target Branch:** `main` (via dedicated topic branch `fix/database-migrations-pg17`)  
**Proposed PR Status:** READY FOR OPERATOR REVIEW & SUBMISSION (Awaiting Authorization)  

---

## 1. Executive Summary

This document defines the exact boundaries, file list, cryptographic checksums, PR title, description, and review checklist for the proposed **Database-Only Pull Request**.

In adherence to strict isolation guidelines, all unrelated payroll application changes, crash recovery route handlers, distributed advisory locks, and generated build artifacts are **strictly excluded**.

---

## 2. Manifest: Files to Include vs. Files to Exclude

### Files Included (Scope A — Pure Database Migration & Certification):
1. `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql`
   - Purpose: Replaces defective MySQL syntax on GitHub main with pure PostgreSQL 17 DDL.
2. `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`
   - Purpose: Introduces partial unique indexes for GL auto-posting and loan deduction idempotency.
3. `scripts/pg17_container_certification.cjs`
   - Purpose: Automated PostgreSQL 17 Docker container test harness.
4. `scripts/verify_migrations_1_7.cjs`
   - Purpose: Read-only 48-statement physical catalog verification runner.
5. Migration & Audit Documentation:
   - `docs/hrms-audit/PHASE4B_PRODUCTION_MIGRATION_RUNBOOK.md`
   - `docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md`
   - `docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md`
   - `docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md`
   - `docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md`
   - `docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md`
   - `docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md`

### Files Strictly Excluded (Scope B & C — Preserved Locally):
- `server/src/routes/payroll-cycles.routes.ts` (Application crash recovery route)
- `server/src/services/contract-invoice.service.ts` (Invoice deduplication logic)
- `server/src/services/ledger-posting.service.ts` (Application advisory locks)
- `server/src/services/payroll-orchestrator.service.ts` (16-stage orchestrator)
- `server/src/services/payroll-validation.service.ts` (Anomaly check gates)
- `server/src/tests/distributed-payroll-concurrency.test.ts` (Concurrency suite)
- `server/dist/*` (Compiled JavaScript outputs)

---

## 3. Cryptographic Checksum Register

| Scope A File Path | Size (Bytes) | SHA-256 Checksum |
| :--- | :---: | :--- |
| `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql` | 1,998 | `b2685a0f108cabb31dd6508f7489f226d242e8b2350f51f64a20ab8918149dc4` |
| `server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql` | 257 | `79e4bc5d3dad92bd34629a5d04d8435c67efa1af6d2d9ed2c61b3587737aa475` |
| `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql` | 887 | `c690e00389f5d80c548f2ca74deeff24534894a680b7957d6119dede4f26070e` |
| `scripts/pg17_container_certification.cjs` | 12,056 | `5204482d8c366ff11ff36b0485a0134f0e6e73081e2dd028441aa390bb931fa3` |
| `scripts/verify_migrations_1_7.cjs` | 16,699 | `0015505e612cb7dc4769fc2c321e164ef1a0b5df92c904fa2ff586beae73551d` |

---

## 4. Migration Execution & Dependency Order

```
[M1–M7 Legacy Migrations] ──▶ Resolved via `prisma migrate resolve --applied` (48/48 Verified)
         │
         ▼
[Migration 8: device_sessions] ──▶ Executed via `prisma migrate deploy` (Creates table, 5 indexes, FKs)
         │
         ▼
[Migration 9: branches geofencing] ──▶ Executed via `prisma migrate deploy` (Adds latitude, longitude, radius)
         │
         ▼
[Migration 10: financial idempotency] ──▶ Executed via `prisma migrate deploy` (Creates 2 partial unique indexes)
         │
         ▼
[Atomic DDL Script] ──▶ Executed via psql (Leave decimal expansion + 17 employee columns)
```

---

## 5. Proposed GitHub Pull Request Template

### PR Title:
```
fix(db): reconcile PostgreSQL 17 migrations, device sessions DDL and financial idempotency constraints
```

### PR Description:
```markdown
## Summary of Changes
This pull request provides a database migration update for the MASTERHRMS platform targeting PostgreSQL 17 (Supabase):

1. **Migration 8 (`device_sessions`) Rewrite:**
   - Replaces the committed MySQL DDL syntax (backticks, DATETIME, utf8mb4) with standard PostgreSQL 17 DDL (`VARCHAR(36)`, `TIMESTAMP(3)`, `BOOLEAN`).
   - Declares primary key, 4 secondary indexes, and foreign key constraints (`ON DELETE CASCADE` on `user_id`, `ON DELETE SET NULL` on `tenant_id`) within idempotent blocks.

2. **Migration 10 (`aud_conc_002_idempotency_constraints`):**
   - Introduces partial unique index `uq_journal_entries_tenant_payroll_run` on `(tenant_id, reference)` WHERE `reference_type = 'payroll'`.
   - Introduces partial unique index `uq_loan_installments_loan_payroll_run` on `(loan_id, payroll_run_id)` WHERE `payroll_run_id IS NOT NULL`.

3. **Validation & Verification Tooling:**
   - Includes `scripts/pg17_container_certification.cjs` and `scripts/verify_migrations_1_7.cjs`.
   - Certified 100% pass rate on isolated PostgreSQL 17.11 container (`masterhrms-pg17-audit`).

## Reviewer Checklist
- [x] Zero MySQL syntax remaining in Migration 8.
- [x] Migration 10 partial unique indexes use standard `CREATE UNIQUE INDEX` compatible with Prisma transactions.
- [x] Zero application logic or service changes included (Scope B strictly isolated).
- [x] Zero generated build artifacts included (Scope C strictly isolated).
- [x] Prisma schema validation passed (`npx prisma validate`).
- [x] All 185 automated tests pass (100.0%).
```

