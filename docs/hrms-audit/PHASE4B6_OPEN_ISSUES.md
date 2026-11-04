# MASTERHRMS — PHASE 4B.6
# OPEN ISSUES, RECONCILIATION ANOMALIES & PRE-DEPLOYMENT GATES

**Document Reference:** `docs/hrms-audit/PHASE4B6_OPEN_ISSUES.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal Systems Architect & Reliability Auditor  
**Repository:** `Webfamily-06/masterhrms`  
**Status:** EVIDENCE COMPILED FOR EXTERNAL REVIEW ONLY  
**Review Boundary:** Non-Production, Read-Only Audit  

---

## 1. Mismatch Analysis: Working Tree vs. Checksums vs. Manifest

A rigorous reconciliation between the local working copy, filesystem hashes, and the proposed PR manifest was performed:

| Check Item | Local Working Copy State | Proposed PR Manifest Target | Discrepancy / Mismatch Observed |
| :--- | :--- | :--- | :---: |
| **Migration 8 Checksum** | `b2685a0f108cabb31dd6508f7489f226d242e8b2350f51f64a20ab8918149dc4` | `b2685a0f108cabb31dd6508f7489f226d242e8b2350f51f64a20ab8918149dc4` | **ZERO MISMATCH** (Exact match) |
| **Migration 9 Checksum** | `79e4bc5d3dad92bd34629a5d04d8435c67efa1af6d2d9ed2c61b3587737aa475` | `79e4bc5d3dad92bd34629a5d04d8435c67efa1af6d2d9ed2c61b3587737aa475` | **ZERO MISMATCH** (Exact match) |
| **Migration 10 Checksum**| `c690e00389f5d80c548f2ca74deeff24534894a680b7957d6119dede4f26070e` | `c690e00389f5d80c548f2ca74deeff24534894a680b7957d6119dede4f26070e` | **ZERO MISMATCH** (Exact match) |
| **Working Tree Cleanliness** | 11 tracked files modified, 77 untracked files present | Database PR must contain Scope A only | **CONTROLLED (Resolved by Scope Separation)** |
| **Prisma Baseline Tracking** | Production lacks `public._prisma_migrations` table | Required `prisma migrate resolve --applied` (M1–M7) | **CONTROLLED (Operator Runbook Gated)** |

---

## 2. Technical & Operational Open Issues

### Issue 1: Migration 8 Git Origin Discrepancy
- **Observation:** The currently committed HEAD of `origin/main` (`9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`) still contains the legacy MySQL version of Migration 8.
- **Impact:** Any developer cloning `main` fresh without this PR will fail if running `prisma migrate dev` or `prisma migrate deploy` against PostgreSQL 17.
- **Remediation Gate:** The database-only PR must be reviewed and merged into `main` before any downstream deployments.

### Issue 2: Partial Index Creation vs. Prisma Migration Transactions
- **Observation:** In PostgreSQL, `CREATE INDEX CONCURRENTLY` cannot execute inside a transaction block (`ERROR 25001`). Prisma wraps every migration in a transaction block.
- **Remediation Applied:** Migration 10 uses standard `CREATE UNIQUE INDEX IF NOT EXISTS`. In container testing, execution took **85.54 ms** and acquired a brief `SHARE` lock.
- **Gating Prerequisite:** Migration 10 must be applied during a scheduled maintenance window when write traffic is paused, avoiding any lock queue buildup.

### Issue 3: Leave Requests Rollback Precision Loss
- **Observation:** Altering `leave_requests.days` from `INTEGER` to `NUMERIC(4, 1)` allows fractional leaves (e.g., 0.5). If an operator attempts a rollback using `ROUND(days)::INTEGER`, fractional leaves are permanently truncated/rounded (`0.5 -> 1`).
- **Remediation Gate:** Rollback via DDL is strictly prohibited once fractional records are inserted. Physical restoration from the pre-migration `pg_dump` snapshot is the only valid disaster recovery method.

### Issue 4: Live Production Backup Restore Status
- **Observation:** While the backup command syntax (`pg_dump "$DIRECT_URL" -F c ...`) is verified, a restore drill against the live production cluster has **NOT** been performed, as production mutations are unauthorized.
- **Status:** **MARKED `NOT VERIFIED` ON PRODUCTION CLUSTER**. (Restore was verified only in isolated container `masterhrms-pg17-audit`).

---

## 3. Pre-Deployment Gating Checklist for Independent Reviewers

- [ ] Confirm independent peer review of the proposed PR manifest in [`PHASE4B6_DATABASE_PR_FILE_MANIFEST.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/hrms-audit/PHASE4B6_DATABASE_PR_FILE_MANIFEST.md).
- [ ] Verify that all 11 Scope B application files remain isolated from the database migration commit.
- [ ] Confirm scheduled maintenance window with stakeholders before running DDL on Supabase.
- [ ] Confirm `DIRECT_URL` (direct PostgreSQL connection on port 5432) is used instead of transaction pooler port 6543.
- [ ] Confirm full compressed database backup (`pg_dump`) is taken and verified before running `prisma migrate resolve` or `prisma migrate deploy`.

---

## 4. Governance Declaration

> [!IMPORTANT]
> **GOVERNANCE NOTICE:**  
> This document and the associated Phase 4B.6 evidence package are prepared strictly for **independent external review**.  
> This document does **NOT** declare production readiness, does **NOT** authorize production execution, and does **NOT** claim independent sign-off.

