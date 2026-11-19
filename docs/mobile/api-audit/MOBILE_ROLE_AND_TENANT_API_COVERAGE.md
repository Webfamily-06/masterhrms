# MasterHRMS Mobile — Role & Tenant API Coverage

## 1. Enterprise Multi-Tenant Architecture & Governance

MasterHRMS is a multi-tenant Enterprise HRMS SaaS platform. Multi-tenant isolation and strict role-based access control (RBAC) are foundational security requirements.

### Tenant Isolation Architecture
1. **Tenant Resolution**: Every user belongs to a specific tenant resolved at authentication (`tenantId`).
2. **Cryptographic JWT Scoping**: Every signed JWT access token contains the authoritative `tenantId` claim. The mobile application preserves this token in secure device storage (`Keychain`).
3. **Database-Level Row Scoping**: The backend database engine uses Prisma ORM with the `tenant-isolation.extension.ts` extension. Every query automatically injects:
   ```typescript
   where: { tenantId: req.user.tenantId, ... }
   ```
4. **Cross-Tenant Attack Prevention**: No tenant can inspect, alter, or delete employees, attendance records, leaves, payslips, files, or chat threads belonging to another workspace. Attempting to access foreign resource IDs fails with `404 Not Found` or `403 Forbidden`.

---

## 2. Super Administrator Mobile Access Prohibition Policy

### Architectural Policy Statement
> [!CAUTION]
> **SUPER ADMINISTRATOR MOBILE ACCESS IS STRICTLY PROHIBITED.**
> Super Administrator accounts operate at the SaaS platform infrastructure level, controlling cross-tenant provisioning, master database maintenance, root subscription invoicing, and platform telemetry. Under enterprise cybersecurity compliance policies, Super Admin credentials must never be unlocked or authenticated on mobile devices.

### Codebase Enforcement Proof
1. **Authentication Gate ([authService.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/auth/authService.ts#L69-L78))**:
   ```typescript
   // authService.ts: Lines 69-78
   const userRoles = successData.roles || successData.user?.roles || [];
   const hasSuperAdmin = userRoles.some(
     (r: any) => String(r).toLowerCase() === 'super_admin' || String(r).toLowerCase() === 'superadmin'
   );
   if (hasSuperAdmin) {
     throw new Error(
       'Access denied. Super Administrator accounts cannot log in to the mobile application. This mobile app is exclusively for Employees, HR, and Tenant Administrators.'
     );
   }
   ```
2. **Navigation Gate ([AppNavigator.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/navigation/AppNavigator.tsx#L1-L31))**:
   - `AppNavigator` explicitly does NOT mount `SuperAdminNavigator`.
   - Any attempt to render or transition into a super-admin stack automatically renders `AccessDeniedView reason="NO_VALID_ROLE"`.

---

## 3. Role-Based Module Access Matrix

The MasterHRMS platform supports four canonical mobile roles:
- **`employee`**: Individual contributor (Self-service features only)
- **`manager`**: People manager (Direct reports approvals, team roster, team projects)
- **`hr_admin`**: Human resources administrator (Org directory, attendance, leave & payroll management)
- **`tenant_admin`**: Workspace owner / administrator (Company settings, security policy, modules)

### Detailed Access Matrix by Role

| Functional Module | Employee | Manager | HR Admin | Tenant Admin | Backend Permission Required |
|---|---|---|---|---|---|
| **Authentication & Profile View** | View / Edit Contact | View / Edit Contact | View / Edit Contact | View / Edit Contact | `auth.authenticated` |
| **Attendance Punch In / Out** | Full Access | Full Access | Full Access | Full Access | `ess.attendance.punch` |
| **Attendance Regularization** | Submit / Withdraw | Approve / Reject Team | View / Approve All | View / Audit All | `ess.regularization.request` / `hrm.attendance.approve` |
| **Leave Application** | Submit / Cancel Own | Submit / Cancel Own | Submit / Cancel Own | Submit / Cancel Own | `ess.leaves.create` |
| **Leave Approval Queue** | No Access | Approve / Reject Direct Reports | Approve / Reject Tenant-wide | View / Audit | `hrm.leave.approve` |
| **Payslips & Salary Slip** | View / Download Own | View / Download Own | View / Download Own | View / Download Own | `ess.payslips.read` |
| **Payroll Processing / Cycles** | No Access | No Access | View / Run Cycles | View / Manage Budget | `hrm.payroll.read` / `hrm.payroll.manage` |
| **Salary Advance / Loan Request** | Submit Request | No Access | View / Approve Queue | View / Approve Queue | `ess.loans.request` / `hrm.payroll.loans` |
| **Expense Claims** | Submit / View Own | Approve Direct Reports | View / Reconcile All | View / Audit All | `ess.expenses.create` / `hrm.expenses.approve` |
| **Timesheet Tracking** | Create / Edit Own | Approve Team Timesheets | View / Export All | View / Export All | `ess.timesheets.create` / `prm.timesheets.approve` |
| **Shift Roster & Swaps** | View / Request Swap | View / Approve Swaps | Manage / Assign Shifts | Manage / Assign Shifts | `ess.shifts.view` / `hrm.shifts.manage` |
| **Employee Directory** | Contact Cards Only | Direct Reports Details | Full 360 Records | Full 360 Records | `hrm.employees.read` |
| **Documents Vault** | View Own / Request New | View Own / Request New | Issue / Manage All Docs | Manage Templates | `ess.documents.read` / `hrm.documents.manage` |
| **Performance Reviews & OKR** | View Goals / Check-in | Conduct Team Reviews | Manage Review Cycles | View Company Goals | `ess.performance.read` / `hrm.performance.manage` |
| **Realtime Chat & Calling** | Full Access | Full Access | Full Access | Full Access | `chat.access` |
| **Company Calendar** | View / RSVP / Create | View / RSVP / Create | Manage Rooms & Events | Manage Rooms & Events | `calendar.access` |
| **Tasks & To-Dos** | Create / Update Own | Manage Team Tasks | View All Tasks | View All Tasks | `todos.access` |
| **Workspace Settings** | No Access | No Access | View General | Update General & Security | `settings.update` |
| **Security & 2FA Policy** | Manage Own 2FA | Manage Own 2FA | View Policy | Enforce Tenant 2FA | `settings.security` |
| **Super Admin Platform** | **BLOCKED** | **BLOCKED** | **BLOCKED** | **BLOCKED** | **PROHIBITED ON MOBILE** |

---

## 4. Multi-Tenant Cross-Contamination Test Verification

The backend enforces tenant scoping on all API endpoints used by the mobile client:

1. **Chat Threads & Groups**:
   `POST /api/chat/messages` and `POST /api/chat/upload` verify that both the caller and recipient belong to the same `tenantId`. Attempting to message a user from a different tenant returns `403 CHAT_UNAUTHORIZED`.
2. **Attendance & Punch**:
   `POST /api/attendance/punch` binds the record to `req.user.tenantId` and `req.user.employeeId`. Device spoofing with another tenant's credentials is mathematically prevented by JWT signature verification.
3. **Payroll & Statutory Salary**:
   `GET /api/v1/me/payslips` scopes results by `employeeId` and `tenantId`. A user with tenant A cannot read payslips belonging to tenant B even if they guess the UUID.
4. **Files & Documents**:
   Uploaded files in `POST /api/chat/upload` and `POST /api/v1/me/documents/request` are stored with private access control lists (ACL) tied to `tenantId`.
