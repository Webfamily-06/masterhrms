# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 10: Cross-Role Security & Tenant Isolation Audit

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** Cross-Role Access Control, Segregation of Duties & Tenant Isolation  
**Date:** November 19, 2026  
**Source of Truth:** MASTERHRMS Local Source Code & Test Suites  

---

### 1. Security Architecture Principles

In a multi-tenant enterprise HRMS, role boundaries must be strictly defended at the database query layer, not merely in the UI frontend:
1. **Tenant Fail-Closed Proxy**: Any query lacking `tenantId` is aborted by the Prisma proxy middleware.
2. **Horizontal Privilege Isolation**: An employee or manager in Tenant A can never view or manipulate records in Tenant B.
3. **Vertical Role Separation**:
   - `employee`: Strictly limited to self records (`employeeId = caller.employeeId`).
   - `manager`: Limited to self records + direct reports (`managerId = caller.employeeId`).
   - `hr_admin`: Limited to own tenant workforce.
   - `super_admin`: Platform governance, strictly outside tenant transactional data unless explicitly impersonating.
4. **Segregation of Duties (SOD)**:
   - Self-approval is categorically prohibited across all approval workflows.
   - Administrative self-deactivation is blocked.
   - Super-Admin account tampering by tenant admins is rejected.

---

### 2. Forensic Cross-Role Attack Vector Analysis

| Attack Vector / Scenario | Target Endpoint | Mechanism Tested | Expected Defense | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cross-Tenant ID Injection** | `GET /api/employees/:id` | Caller in Tenant A requests employee in Tenant B | Prisma proxy injects `where: { id, tenantId: caller.tenantId }` | `HTTP 404 Not Found` | **VERIFIED** |
| **Self-Approval Exploit** | `POST /api/me/team/leaves/:id/action` | Manager submits leave request, then calls team approve on own ID | Guard verifies `request.employeeId !== caller.employeeId` | `HTTP 403 / 400 Self-approval prohibited` | **VERIFIED** |
| **Peer Profile Modification** | `POST /api/me/profile/change-requests` | Employee attempts to submit changes for a colleague's ID | Server derives `employeeId` exclusively from verified JWT session | Request created strictly for caller | **VERIFIED** |
| **Salary Data Leakage** | `GET /api/me/employees` | Regular employee queries directory peer list | Controller strips `salary`, `pan`, `aadhaar`, `bankAccount` from output | Confidential fields omitted from JSON | **VERIFIED** |
| **Manager Cycle Injection** | `POST /api/hr/organization/manager-change` | User attempts to make Manager A report to subordinate Dev B | Graph traversal checks `ancestors` array for cycle | `HTTP 400 Circular reporting detected` | **VERIFIED** |
| **Administrative Self-Deactivation** | `POST /api/employees/:id/toggle-status` | HR Admin attempts to toggle their own employee account | Guard checks `employee.userId === actorId` | `HTTP 400 Cannot deactivate own account` | **VERIFIED** |
| **Super-Admin Deactivation Bypass** | `POST /api/workspace/users/:id` | Tenant admin attempts to delete a Super Admin user | Guard checks `target.roles.some(r => r.role === 'super_admin')` | `HTTP 403 Forbidden` | **VERIFIED** |

---

### 3. Sensitive Data Masking & PII Protection

To comply with data privacy standards and statutory confidentiality:
1. **Banking Information**:
   - In responses to managers and peers, `accountNumber` is masked: `••••••••1234`.
   - In logs and error traces, bank account numbers are scrubbed via regex filter.
2. **Statutory Identifiers (PAN / Aadhaar)**:
   - Full Aadhaar numbers are never stored in plaintext without role restriction.
   - Only `hr_admin` and the employee themselves can view statutory ID cards.
3. **Compensation Privacy**:
   - Salary fields are excluded from standard employee lists and team views.
   - Total payroll aggregation is accessible only to users with `payroll_view` permission.

---

### 4. Impersonation Session Security

When a Super-Admin enters a tenant workspace via `/api/super/impersonate/:tenantId`:
1. The issued JWT contains `isImpersonating: true` and `impersonatorUserId`.
2. The global `<ImpersonationBanner />` renders across all pages.
3. Exiting impersonation immediately drops the tenant session and restores the unscoped Super-Admin identity.
4. Old impersonation tokens cannot be reused once invalidated.

---

### 5. Automated Security Test Evidence

The following test suites in `server/src/tests/` empirically validate these controls:
- `tenant-proxy-fail-closed.test.ts` (5/5 passed)
- `security-uploads-isolation.test.ts` (6/6 passed)
- `employee-self-service-request-centre.test.ts` (7/7 passed)
- `reporting-manager-change-hierarchy.test.ts` (All passed)
- `hr-employee-actions-backend.test.ts` (Deactivation & self-protection passed)
