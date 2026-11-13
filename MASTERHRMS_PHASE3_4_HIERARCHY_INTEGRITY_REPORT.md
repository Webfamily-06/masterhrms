# MASTERHRMS — Phase 3.4: Hierarchy Integrity Report

## 1. Overview
The organizational reporting tree in MASTERHRMS is a directed acyclic graph (DAG) where each active employee points to at most one reporting manager (`managerId`), terminating at top-level executive nodes (`managerId === null`).

Preventing circular reporting and maintaining mathematical hierarchy integrity is critical to avoid infinite loops during recursive org-tree generation, broken approval chains, and orphaned organizational units.

---

## 2. Hierarchy Validation Engine (`validateReportingHierarchy`)

Validation is implemented in `OrganizationTreeService.validateReportingHierarchy(tenantId, employeeId, proposedManagerId, dbOverride)`.

### 2.1 Constraint 1: Self-Reporting Prevention
- **Rule:** An employee cannot report to themselves.
- **Check:** `if (employeeId === proposedManagerId)`
- **Result:** `isValid: false`, reason: `"An employee cannot be their own reporting manager."`

### 2.2 Constraint 2: Direct Circular Loop Prevention
- **Rule:** If employee A reports to manager B, manager B cannot be reassigned to report to employee A.
- **Check:** Before assigning employee A to manager B, the engine inspects manager B's manager line. If `managerB.managerId === employeeA`, circular loop detected.
- **Result:** `isValid: false`, reason: `"Cannot assign employee to their own subordinate. Circular reporting detected."`

### 2.3 Constraint 3: Deep Circular Loop Prevention (N-Level Traversal)
- **Rule:** If employee A is an ancestor of proposed manager Z at any depth ($A \rightarrow B \rightarrow C \rightarrow \dots \rightarrow Z$), assigning $A$ to report to $Z$ would create a cycle ($A \rightarrow B \rightarrow \dots \rightarrow Z \rightarrow A$).
- **Algorithm:**
  ```ts
  let currentManagerId: string | null = proposedManagerId;
  const visited = new Set<string>();

  while (currentManagerId) {
    if (currentManagerId === employeeId) {
      return {
        isValid: false,
        reason: "Cannot assign employee to their own subordinate. Deep circular reporting detected in hierarchy traversal.",
      };
    }

    if (visited.has(currentManagerId)) {
      return {
        isValid: false,
        reason: "Pre-existing cycle detected in the organization hierarchy traversal.",
      };
    }

    visited.add(currentManagerId);
    const mgr = await db.employee.findUnique({
      where: { id: currentManagerId },
      select: { id: true, managerId: true },
    });
    currentManagerId = mgr ? mgr.managerId : null;
  }
  ```
- **Cycle Guard:** Guarded by `visited` set to safely break out and flag pre-existing cycles without entering an infinite loop.

### 2.4 Constraint 4: Cross-Tenant Isolation
- **Rule:** An employee in Tenant A cannot be managed by an employee in Tenant B.
- **Check:** `if (proposedManager.tenantId !== tenantId)`
- **Result:** `isValid: false`, reason: `"Proposed reporting manager belongs to a different tenant or organization."`

### 2.5 Constraint 5: Inactive Manager Rejection
- **Rule:** Inactive, terminated, or suspended employees cannot accept new direct reports.
- **Check:** `if (proposedManager.status !== 'active')`
- **Result:** `isValid: false`, reason: `"Cannot assign an inactive employee as a reporting manager."`

### 2.6 Constraint 6: Top Executive / Null Manager Support
- **Rule:** Clearing a reporting manager (`newManagerId: null` or `""`) is permitted for C-level executives or organizational heads who report to the Board of Directors.
- **Check:** When `proposedManagerId` is null or empty, the check succeeds immediately (`isValid: true`).

---

## 3. Pre-Application Revalidation (Race Condition Defense)

A manager change request may be created on Day 1 and approved or scheduled for execution on Day 30. During the intervening period, the organizational chart may have evolved (e.g., intermediate managers promoted, transferred, or reassigned).

To guarantee absolute integrity:
- **Immediate Review:** `validateReportingHierarchy` is executed both at request submission and again immediately prior to applying the change.
- **Scheduler Execution:** The daily cron job re-runs `validateReportingHierarchy` immediately before applying any future-dated transfer.
- If a cycle would now be created due to intermediate graph changes, the application is blocked, error logged, and flagged for HR intervention rather than corrupting the database graph.

---

## 4. Verification Evidence

In automated test suite `server/src/tests/reporting-manager-change-hierarchy.test.ts`:
- **Suite 1.1:** Self-reporting (`emp-dev -> emp-dev`) rejected with 100% accuracy.
- **Suite 1.2:** Direct subordinate assignment (`emp-lead -> emp-dev`) rejected.
- **Suite 1.3:** 3-level deep cycle (`emp-ceo -> emp-dev` where `emp-dev -> emp-lead -> emp-vp -> emp-ceo`) successfully detected and rejected.
- **Suite 1.4:** Cross-tenant manager assignment (`emp-dev [Tenant A] -> emp-foreign [Tenant B]`) rejected.
- **Suite 1.5:** Inactive manager assignment (`emp-dev -> emp-inactive`) rejected.
- **Suite 1.6:** Clearing manager to `null` or `""` for top executives accepted.
- **Suite 1.7:** Valid horizontal and vertical reporting transitions accepted.

