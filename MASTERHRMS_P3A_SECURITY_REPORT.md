# MASTERHRMS — P3-A: Leave Encashment & Comp-Off Security, RBAC & Tenant Isolation Report

**Project:** MASTERHRMS (`Webfamily-06/masterhrms`)  
**Branch:** `main`  
**Scope:** Backend API, Service Layer, Database Access, Payroll Integration & Dual Frontends

---

## 1. Authentication & Multi-Tenant Isolation

1. **Mandatory JWT & Tenant Context Enforcement:**
   - Every `/api/v1/hr/leave/encashment-compoff/*` and `/api/v1/me/leave/*` endpoint is mounted behind `authenticateToken` and `tenantContextMiddleware`.
   - `tenantId` is sourced **exclusively** from the verified server-side auth/tenant context (`req.tenantId`), never from client-supplied request bodies or query parameters.
2. **Cross-Tenant Query & Foreign-Key Verification:**
   - Every Prisma query (`findMany`, `findFirst`, `count`, `aggregate`, `update`, and raw `SELECT ... FOR UPDATE`) scopes by `tenantId`.
   - Cross-entity references (`employeeId`, `leaveTypeId`, `branchId`, `departmentId`, `payrollComponentId`, `payrollRunId`, `payrollCycleId`, `attendanceId`, `overtimeRequestId`) are explicitly verified to belong to the caller's `tenantId` before persistence; cross-tenant IDs are rejected with `403`/`404`.
3. **Export &Summary Isolation:**
   - `GET /summary` and `GET /transactions/export` aggregate and stream strictly within `req.tenantId` and further apply subordinate scope filtering when invoked by a non-HR Reporting Manager.

---

## 2. Role-Based Access Control (RBAC) Matrix

`LeaveEncashmentCompOffService.resolveCallerProfile(tenantId, actor)` resolves both JWT roles/permissions and database `UserRoleAssignment` -> `WorkspaceRole` -> `RolePermission` records, plus `Employee.managerId` and active `ApprovalDelegation` records.

| Capability / Operation | Employee (ESS) | Reporting Manager | HR Manager | Payroll Role | HR Admin / Tenant Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Submit / Edit / Cancel Own Request (when ESS enabled) | Allowed | Allowed | Allowed | Allowed (via ESS) | Allowed |
| View Own Balances, Lots, Payroll Status & Timeline | Allowed | Allowed | Allowed | Allowed | Allowed |
| View Direct-Report Requests | Denied (`403`) | Allowed (Salary Redacted) | Allowed | Encashment Only | Allowed |
| Approve / Reject Direct-Report Request | Denied (`403`) | Allowed | Allowed | Denied (`403`) | Allowed |
| Approve / Reject Own Request (**Self-Approval**) | **Blocked (`403`)** | **Blocked (`403`)** | **Blocked (`403`)** | **Blocked (`403`)** | **Blocked (`403`)** |
| Create Request on Behalf of Another Employee | Denied (`403`) | Denied (`403`) | Allowed | Denied (`403`) | Allowed |
| View Employee Salary Basis & Encashment Payouts | Own Only | **Redacted (`null`)** | Allowed | Allowed | Allowed |
| Queue Encashment for Payroll / Mark Failed / Reconcile Paid | Denied (`403`) | Denied (`403`) | Denied (`403`) | Allowed (`!= self`) | Allowed (`!= self`) |
| Reverse Approved Encashment & Restore Ledger | Denied (`403`) | Denied (`403`) | Denied (`403`) | Denied (`403`) | **Allowed (`!= self`)** |
| Create / Update / Deactivate Policy Configurations | Denied (`403`) | Denied (`403`) | Read-Only (`403` on write) | Read-Only (`403` on write) | **Allowed** |
| Trigger Tenant Comp-Off Expiry Sweep | Denied (`403`) | Denied (`403`) | Denied (`403`) | Denied (`403`) | **Allowed** |

---

## 3. Financial, Ledger & Concurrency Safeguards

1. **Strict Self-Approval & Self-Disbursement Prevention (`SELF_APPROVAL_FORBIDDEN`):**
   - `assertNotSelfApproval` checks both `profile.employeeId === targetEmployee.id` and `profile.userId === targetEmployee.userId` across `decideEncashmentRequest`, `decideCompOffRequest`, `processEncashmentToPayroll`, `reconcileEncashmentPaid`, and `reverseEncashment`, returning HTTP `403`.
2. **Pessimistic Row-Level Locking & Transaction Atomicity:**
   - Balance debits, Comp-Off credits, FIFO lot reservations, payroll queueing, reversals, and expiry sweeps execute inside `rawPrisma.$transaction(...)` with `SELECT id, status FROM leave_encashment_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE` (and employee-level lock on submission), preventing double-approval, double-credit, double-payroll inclusion, and concurrent balance over-encashment.
3. **Zero Trust in Frontend Calculations:**
   - Frontend preview values are never persisted directly. `createEncashmentRequest`, `updateEncashmentRequest`, and `decideEncashmentRequest` recompute authoritative balances via `LeaveService.getEmployeeBalance` and recalculate salary basis, divisor, daily rate, and net payable on the server using `decimal.js`.
4. **Verified Payroll Disbursement Gate:**
   - `reconcileEncashmentPaid` refuses to transition an encashment to `PAID` unless linked to a verified finalized `PayrollCycle` (`FINALIZED`/`LOCKED`/`PAID`), a published `PayrollRun` (`published`/`locked`/`paid`), or an explicit external disbursement voucher reference.
5. **Salary Confidentiality Redaction:**
   - Non-HR/Payroll Reporting Managers viewing subordinate requests via `/api/v1/hr/leave/encashment-compoff/*` or `/api/v1/me/leave/team-encashment-compoff` receive `salaryBasisAmount: null`, `dailyRate: null`, `netPayableAmount: null`, `totalAmount: null`, and `calculationSnapshot: null`.
6. **Immutable Audit Trail:**
   - Every state transition records an immutable `LeaveEncashmentCompOffEvent` (actor ID, name, role, previous/new status, metadata JSON) and a tenant `AuditLog` entry via `AuditService.log`.
