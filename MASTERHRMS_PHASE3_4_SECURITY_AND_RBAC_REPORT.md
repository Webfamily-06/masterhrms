# MASTERHRMS — Phase 3.4: Security, RBAC & Segregation of Duties Report

## 1. Overview
Organizational reporting lines govern enterprise approval routing, payroll authorization, leave reviews, and performance evaluations. Unauthorized or unverified manager changes represent a severe privilege escalation vector.

Phase 3.4 implements defense-in-depth security, strict multi-tenant boundaries, and comprehensive segregation of duties.

---

## 2. Segregation of Duties & Anti-Self-Approval

### 2.1 The Vulnerability
If an employee could approve their own reporting manager change request, an employee could unilaterally assign themselves to report to a permissive manager or clear their manager to avoid supervisory oversight.

### 2.2 Enforcement Mechanism
In `ReportingManagerChangeService.reviewRequest`:
```ts
const reviewerEmployee = await db.employee.findFirst({
  where: { tenantId, userId: actorUserId },
  select: { id: true, userId: true },
});

if (
  (reviewerEmployee && reviewerEmployee.id === transfer.employeeId) ||
  actorUserId === transfer.employee.userId
) {
  throw new Error("Forbidden: Employees cannot approve or review their own reporting manager change request.");
}
```
- **Validation 1:** Reviewer employee ID cannot match target employee ID.
- **Validation 2:** Reviewer user account ID (`actorUserId`) cannot match the target employee's linked system user account.
- **Result:** Any attempt by an employee to approve, reject, or alter their own manager change is rejected with HTTP 403 Forbidden.

---

## 3. Multi-Tenant Boundary Isolation

### 3.1 Tenant Scope Enforcement
- All queries and mutations in `ReportingManagerChangeService`, `OrganizationTreeService`, and `organization.routes.ts` require an authoritative `tenantId` resolved from the verified session context (`req.tenantId` / `getTenantDb()`).
- In addition:
  - The target employee must belong to `tenantId`.
  - The proposed manager must belong to `tenantId`.
  - Any cross-tenant attempt is blocked before database execution:
    `"Proposed reporting manager belongs to a different tenant or organization."`

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint | Role / Scope | Permission Required | Enforced Rule |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/organization/manager-change-request` | HR Admin / Super Admin | `organization:manage` \| `hr:write` | Full creation across tenant |
| `POST /api/v1/organization/manager-changes/:id/action` | HR Admin / Super Admin | `organization:manage` \| `hr:write` | Full review; Anti-self-approval |
| `GET /api/v1/organization/manager-changes` | HR Admin / Super Admin | `organization:read` \| `hr:read` | Scoped to tenant |
| `GET /api/v1/organization/manager-changes/overview` | HR Admin / Super Admin | `organization:read` \| `hr:read` | Summary metrics for tenant |
| `POST /api/v1/me/organization/manager-change-request` | Authenticated Employee / Manager | `employee:self` | Restricted submission |
| `POST /api/v1/me/team/manager-changes/:id/action` | Line Manager | `team:manage` | Subordinate changes only; Anti-self-approval |
| `GET /api/v1/organization/tree/employee/:id/manager-history` | HR / Manager / Self | `organization:read` \| `employee:self` | HR, Line Manager, or Self-lookup only |
| `POST /api/system/cronjobs/run-reporting-manager-changes` | System / Super Admin | System Key / Cron Auth | Trigger automated batch execution |

---

## 5. Audit Trail & Outbox Integration
Every state transition produces tamper-evident audit records:
- **Audit Logs:** Logged via `AuditService.logMutation` with action names `REPORTING_MANAGER_CHANGE_REQUEST_CREATED`, `REPORTING_MANAGER_CHANGE_REQUEST_REVIEWED`, and `REPORTING_MANAGER_CHANGE_APPLIED`.
- **Outbox Events:** Published via `OutboxService.createOutboxEvent` with event type `ORGANIZATION_REPORTING_MANAGER_CHANGED` to ensure reliable eventual consistency across downstream notification engines and message brokers.

