# MASTERHRMS — POST-PHASE 2 MASTER RISK REGISTER

> **Audit Identifier**: POST-PHASE-2-RISK-REGISTER  
> **Effective Date**: 2026-11-04  
> **Target System**: MASTERHRMS Production Deployment  
> **Deployment Commit SHA**: `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
> **Host**: Vercel (`bom1` / Mumbai) + Supabase PostgreSQL (`ap-south-1` / Mumbai)  

---

## 1. Executive Summary

This register consolidates the operational, infrastructural, and architectural risks identified following the completion of **Phase 2 (AUD-DEP-003 Vercel Production Deployment Verification)**.

While the cloud deployment is live, responding with low latency, and serving both Next.js CMS frontend and Express API backend, two core infrastructural blockers remain before initiating real monthly payroll execution:
1. **AUD-CONC-002**: Phase 1 distributed locking is not yet deployed, leaving finalization concurrency vulnerable on serverless runtimes.
2. **AUD-DB-001**: Remote database schema drift remains unaligned with `schema.prisma`.

---

## 2. Risk Register

| Risk ID | Title / Domain | Severity | Current Status | Description & Production Impact | Existing Safeguard / Mitigation | Recommended Permanent Resolution |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| **`AUD-DEP-003`** | Vercel Deployment & Runtime Health | **LOW** | **CONDITIONALLY VERIFIED** | Production deployment is live and healthy in `bom1`. Core routes return 200 OK. Direct CLI log drain is inaccessible due to unauthenticated CLI. | Probed via live HTTP requests and GitHub webhooks. | Supply project-scoped read-only Vercel token if CLI log streaming is required. |
| **`AUD-CONC-002`** | Finalization Mutex Serverless Inefficacy | **HIGH** | **UNRESOLVED IN PROD** | Deployed artifact uses in-memory `activeRunLocks = new Set<string>()`. On Vercel serverless, memory is not shared across Lambda instances; concurrent requests can bypass the lock. | Dual-approval gate (Tier 1 HR + Tier 2 Finance) limits who can trigger finalization. | Implement and deploy Phase 1 PostgreSQL-backed atomic conditional transition (`UPDATE ... WHERE status = 'APPROVED'`). |
| **`AUD-DB-001`** | Remote Database Schema Drift | **HIGH** | **UNRESOLVED** | Remote database lacks `_prisma_migrations`, `device_sessions`, and demographic columns (`father_or_spouse_name`, addresses). | Code uses defensive optional chaining (`(emp as any).permanentAddress ?? null`) to avoid Postgres 42703. | Execute direct baseline migration using dedicated non-pooled connection during maintenance window. |
| **`RSK-CRYPTO-01`** | PII Field-Level Encryption | **MEDIUM** | **DOCUMENTED** | PAN, Aadhaar, and Bank Accounts rely on database volume encryption (AWS KMS) and API masking rather than column-level envelope encryption. | Server-side masking (`field-security.ts`) redacts IDs in all public/staff responses. Strict HSTS enforced. | Evaluate whether application-layer envelope AES-256-GCM encryption is required by compliance policies. |
| **`RSK-RUN-001`** | Finalized Cycle Immutability | **LOW** | **SAFEGUARDED** | Risk of post-approval modifications to closed payroll runs. | Cryptographic SHA-256 ledger lock seals snapshots upon Stage 13 finalization. | Maintain immutable status checks and database constraints. |
| **`RSK-BILL-001`** | Contract Billing Reconciliation Drift | **LOW** | **SAFEGUARDED** | Divergence between frozen payroll snapshots and client invoice billing totals. | Automated reconciliation engine calculates variance and flags discrepancies with zero tolerance. | Preserve strict separation between employee salary liabilities and contractor commercial margins. |

---

## 3. Severity Distribution

```
HIGH SEVERITY   [ 2 ] : AUD-CONC-002 (Distributed Locking), AUD-DB-001 (Schema Drift)
MEDIUM SEVERITY [ 1 ] : RSK-CRYPTO-01 (Application-layer PII Envelope Encryption)
LOW SEVERITY    [ 3 ] : AUD-DEP-003 (Deployment Health), RSK-RUN-001, RSK-BILL-001
TOTAL RISKS     [ 6 ]
```

---

## 4. Phase 2 Conclusion & Next Steps

1. **AUD-DEP-003 Status**: Transitioned from Pending to **CONDITIONALLY VERIFIED**.
2. **Next Sequence**:
   - **Step 1**: Authorize Phase 1 (`AUD-CONC-002`) PostgreSQL-backed distributed locking implementation and deploy to `main`.
   - **Step 2**: Authorize `AUD-DB-001` database migration baseline verification and execution.

