# MASTERHRMS — WORKSTREAM D SECURITY & TENANT ISOLATION AUDIT
## Multi-Tenant Guardrails, Request Scoping, PII Masking & Cryptographic Proofs

> **Workstream**: D — Security & Isolation Architecture  
> **Date**: November 3, 2026  
> **Status**: AUDITED & COMPLIANT  

---

## 1. Multi-Tenant Isolation

All endpoints under `/api/payroll/cycles` enforce mandatory tenant isolation middleware:

```typescript
payrollCyclesRouter.use(requireAuth, resolveTenantContext);
```

Every query executed by `PayrollOrchestratorService` strictly filters by `tenantId`. No tenant can query, calculate, view, approve, or finalize payroll cycles belonging to another tenant.

Furthermore, internal ledger posting and contract invoice calls are executed within `runWithTenantContext(tenantCtx, ...)` in Node's `AsyncLocalStorage`, ensuring that even background workers and database facades enforce fail-closed tenant scoping.

---

## 2. Anti-Collusion Governance Enforcement

The system implements automated separation of duties:
1. `submitForReview` records the submitter's identity (`submittedById`, `submittedBy`).
2. `approvePayroll` compares the approver's credentials against the submitter.
3. If `approver.id === submitter.id` or `approver.email === submitter.email`, the transaction throws a hard `403 Forbidden` error.

This satisfies corporate governance compliance mandates and eliminates internal fraud risk.

---

## 3. PII & Sensitive Financial Data Protection

1. **Masked Bank Exports**: The `generateBankDisbursementExport` service supports account number masking (`*********1234`), ensuring that preview screens and lower-privilege users cannot view unmasked employee banking details.
2. **KYC Masking**: Aadhaar numbers are masked to show only the last 4 digits (`XXXXXXXX1234`) across all exported statutory records.
3. **Role Restrictions**: Commercial markup (MMU margins) is restricted to Finance and Admin roles; employees querying their own ESS payslips never see client billing data or agency margins.

---

## 4. Immutability & Tamper-Evident SHA-256 Digest

During finalization, a 64-character SHA-256 hash is computed over all snapshot records and persisted in `PayrollRun.statutoryManifest.cryptographicHash`. This provides verifiable proof of financial integrity for statutory labor audits and tax compliance inspectors.
