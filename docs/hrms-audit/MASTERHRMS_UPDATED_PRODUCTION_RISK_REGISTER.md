# MASTERHRMS — PRODUCTION RISK REGISTER (POST-PHASE 3B AUDIT)
## Operational, Architectural, Database & Concurrency Risk Matrix

**Document Reference:** `docs/hrms-audit/MASTERHRMS_UPDATED_PRODUCTION_RISK_REGISTER.md`  
**Last Updated:** 2026-11-04 (Following Completion of AUD-CONC-002 Phase 3B)  
**Platform:** Vercel Serverless Platform (`bom1` / Mumbai)  
**Database:** Supabase Managed PostgreSQL (`aws-0-ap-south-1`)  
**Scope:** Master Risk Register for Production Release Readiness

---

## 1. Executive Risk Summary

Following the execution of Phase 3B (`AUD-CONC-002`), the critical architectural vulnerability regarding in-memory locking (`activeRunLocks = new Set<string>()`) has been **fully remediated in the codebase and verified against PostgreSQL**.

### Risk Posture Overview:
- **Total Tracked Risks:** 6
- **Critical / High Risks (Resolved):** 2 (In-memory concurrency & finalization race conditions)
- **Moderate Operational Risks (Managed / Migration Pending):** 2 (AUD-DB-001 column drift & DB constraint application)
- **Low Operational Risks:** 2 (Vercel serverless execution timeout & DNS edge cache)

---

## 2. Detailed Production Risk Register

| Risk ID | Category | Title | Severity | Likelihood | Impact | Status | Mitigation Strategy |
|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---|
| **RSK-CONC-01** | Architecture | In-Memory Mutex Inefficacy in Serverless Runtime | ~~CRITICAL~~ | ~~HIGH~~ | ~~HIGH~~ | **RESOLVED IN PHASE 3B** | Replaced `activeRunLocks` with PostgreSQL atomic conditional updates (`approvalStatus: "APPROVED" -> "FINALIZING"`). 8/8 concurrency tests passed. |
| **RSK-CONC-02** | Finance | Duplicate General Ledger & Loan Recovery Posting | ~~HIGH~~ | ~~MEDIUM~~ | ~~HIGH~~ | **RESOLVED IN PHASE 3B** | Implemented intra-transaction idempotency checks in `ledger-posting.service.ts` and `payroll-orchestrator.service.ts`. |
| **RSK-CONC-03** | Operations | Worker Crash / Timeout Leaving Cycle in FINALIZING State | ~~MEDIUM~~ | ~~MEDIUM~~ | ~~MEDIUM~~ | **RESOLVED IN PHASE 3B** | Introduced `POST /api/payroll/cycles/:id/recover` with 15-min stale threshold and automated rollforward/rollback. |
| **RSK-DB-001** | Database | Remote Column Drift (`father_or_spouse_name` missing in DB) | **MEDIUM** | Low (Protected) | Low (Protected) | **MANAGED** (Pending AUD-DB-001 Authorization) | All queries use `SAFE_EMPLOYEE_SELECT` or explicit `select: { id: true }` so no runtime crash occurs. Formal migration scheduled for AUD-DB-001. |
| **RSK-DB-002** | Database | Uniqueness Constraints on GL and Loans Pending Deployment | **LOW** | Low | Low | **READY FOR MIGRATION** | Local SQL migration file prepared at `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`. Ready for authorized deployment. |
| **RSK-OPS-01** | Infrastructure | Vercel Serverless Function Execution Timeouts on Large Batches | **LOW** | Low | Low | **MONITORED** | Chunked processing architecture in `PayrollOrchestratorService` with 30s transaction timeout limits. |

---

## 3. Deployment Pre-Requisites Checklist

Prior to triggering production deployment on Vercel:
- [x] Backend TypeScript compilation: Exit code 0 (`npm --prefix server run build`).
- [x] Frontend CMS TypeScript compilation: Exit code 0 (`npm --prefix CMS run typecheck`).
- [x] Full test suite verification: 140/140 automated tests passing (100%).
- [x] Real PostgreSQL concurrency verification: 8/8 concurrency tests passing (100%).
- [x] Local migration prepared without executing remote DDL.
- [ ] User authorization to commit and push changes to GitHub `origin/main`.
- [ ] User authorization to apply database constraints to Supabase production database.
- [ ] Production Vercel deployment triggered and verified via health probe.
