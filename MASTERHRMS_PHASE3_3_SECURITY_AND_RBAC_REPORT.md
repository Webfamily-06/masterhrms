# MASTERHRMS — PHASE 3.3
# SECURITY, RBAC & SEGREGATION OF DUTIES REPORT

**Document Version:** 1.0.0  
**Phase:** 3.3  
**Status:** COMPLETE  

---

## 1. Security Architecture Overview

Phase 3.3 implements defense-in-depth security principles across all probation and contract automation features:
1. Multi-Tenant Boundary Enforcement
2. Role-Based Access Control (RBAC)
3. Segregation of Duties (SoD)
4. Anti-Self-Review and Anti-Self-Confirmation Controls
5. Audit Logging & Non-Repudiation

---

## 2. Segregation of Duties Matrix

| Actor / Role | Submit Manager Review | Confirm Probation | Extend Probation | View Team Probations | Renew Contract | Issue Contract |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Employee (Self)** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **Direct Manager** | ✅ Direct Reports Only | ❌ Blocked | ❌ Blocked | ✅ Direct Reports | ❌ Blocked | ❌ Blocked |
| **Skip-Level Manager**| ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **HR Admin** | ✅ Any Subordinate (Override) | ✅ Approved | ✅ (Max 180 Days) | ✅ All Records | ✅ Approved | ✅ Approved |
| **Super Admin** | ✅ Approved | ✅ Approved | ✅ (Max 180 Days) | ✅ All Records | ✅ Approved | ✅ Approved |

### 2.1 Anti-Self-Review Enforcement
- In `ProbationService.submitManagerReview`:
  ```ts
  if (probation.employee?.userId === actorUserId || probation.employeeId === actorUserId) {
    throw new Error("Forbidden: Employees cannot review their own probation.");
  }
  ```
- Evaluated and verified in automated test suite (Test 3.1).

### 2.2 Reporting Line Enforcement
- A manager attempting to review an employee who does not report to them (`reportsToId !== managerId`) is rejected with:
  `Forbidden: You can only submit probation reviews for your direct reports (or as an HR Admin).`
- Evaluated and verified in automated test suite (Test 3.2).

---

## 3. Multi-Tenant Isolation

1. **Context Scoping:** All database queries are filtered with explicit `tenantId` constraints in addition to the Prisma middleware / RLS tenant context.
2. **Cross-Tenant Attack Resistance:** Passing a `probationId` or `contractId` from another tenant produces an immediate `404 Not Found` or `Probation record not found in current tenant context` error, without disclosing record existence across tenants.

---

## 4. Contract Overlap Defense

To prevent fraudulent or erroneous double-contracting, `ContractLifecycleService.renewContract` enforces an active contract non-overlap rule:
```ts
const conflictingContracts = await db.employeeContract.findMany({
  where: {
    tenantId,
    employeeId: predecessor.employeeId,
    id: { not: predecessor.id },
    status: "active",
    AND: [
      { startDate: { lte: endDate || new Date("2099-12-31") } },
      { OR: [{ endDate: null }, { endDate: { gte: startDate } }] },
    ],
  },
});
```
If an active agreement already exists that overlaps with the proposed renewal start and end dates, renewal execution is blocked with HTTP `400 Bad Request`.

---

## 5. Audit Logging & Tamper Resistance

Every sensitive lifecycle transition emits an immutable `AuditService.logMutation` record:
- `PROBATION_MANAGER_REVIEW_SUBMITTED`: Stamped with manager identity, ratings, recommendations, and remarks.
- `PROBATION_CONFIRMED`: Stamped with HR approval authority, rating, and issued letter serial number.
- `PROBATION_EXTENDED`: Stamped with extension days, new cumulative duration, and justification.
- `CONTRACT_RENEWED`: Stamped with predecessor ID, successor ID, and updated CTC.

