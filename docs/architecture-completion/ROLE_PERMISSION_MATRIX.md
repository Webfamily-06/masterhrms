# Role & Permission Matrix: MASTERHRMS Enterprise Architecture

**Document Reference:** `DOC-ARCH-PERM-003`  
**Compliance Standard:** Principle of Least Privilege (PoLP) & Multi-Tenant Separation  
**Scope:** Default Company `tenant-default-001` & Root Platform  

---

## 1. Definitive Role Taxonomy

The MASTERHRMS platform architecture defines strictly separated role scopes. For the default company, exactly three tenant roles and one platform role are recognized:

```
[PLATFORM SCOPE]
  └── Platform Super Admin (super_admin)

[TENANT SCOPE: tenant-default-001]
  ├── 1. Tenant Administrator (tenant_admin / Workspace Admin)
  ├── 2. HR Operations Lead   (hr_admin / HR Manager)
  └── 3. Workspace Employee   (employee / Employee)
```

### Disallowed Default Identity: Department Head / Manager
- **Policy:** As agreed, **no default Department Head or Manager account is created or advertised**.
- **Architectural Reality:** Manager capabilities in MASTERHRMS are handled organically via:
  1. **Reporting Structure:** The `managerId` relational field on the `Employee` table (an employee designated as manager over other employees automatically gains approval authority for their direct reports' leaves, timesheets, and appraisals).
  2. **Workspace Role Assignments:** Custom roles created by Tenant Admins as needed, with granular permissions.
- **Remediation Action:** The seeded account `depthead@masterhrms.com` is retired from default documentation, deactivated in standard seeding, and excluded from default credential tables.

---

## 2. Comprehensive Role-Permission Matrix

The following matrix delineates granular permission codes across the four authorized roles:

| Domain / Module | Permission Code | Super Admin | Tenant Admin | HR Lead | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Platform: Tenants** | `platform.tenants.view` | ✅ | ❌ | ❌ | ❌ |
| | `platform.tenants.create` | ✅ | ❌ | ❌ | ❌ |
| | `platform.tenants.manage` | ✅ | ❌ | ❌ | ❌ |
| **Platform: Plans** | `platform.plans.manage` | ✅ | ❌ | ❌ | ❌ |
| **Platform: Addons** | `platform.addons.manage` | ✅ | ❌ | ❌ | ❌ |
| **Platform: Gateways** | `platform.gateways.configure` | ✅ | ❌ | ❌ | ❌ |
| **Platform: System Logs**| `platform.logs.view` | ✅ | ❌ | ❌ | ❌ |
| **Tenant: Company Info** | `tenant.company.view` | ❌ | ✅ | ✅ | ❌ |
| | `tenant.company.manage` | ❌ | ✅ | ❌ | ❌ |
| **Tenant: Subscriptions**| `tenant.billing.manage` | ❌ | ✅ | ❌ | ❌ |
| | `tenant.billing.view` | ❌ | ✅ | ❌ | ❌ |
| **Tenant: Addon Store** | `tenant.modules.browse` | ❌ | ✅ | ✅ | ❌ |
| | `tenant.modules.enable` | ❌ | ✅ | ❌ | ❌ |
| **Tenant: User Mgmt** | `tenant.users.manage` | ❌ | ✅ | ❌ | ❌ |
| | `tenant.roles.manage` | ❌ | ✅ | ❌ | ❌ |
| **HR: Employee Directory**| `hr.employees.read` | ❌ | ✅ | ✅ | ❌ |
| | `hr.employees.write` | ❌ | ✅ | ✅ | ❌ |
| | `hr.employees.delete` | ❌ | ✅ | ❌ | ❌ |
| **HR: Sensitive Info** | `hr.sensitive.view` | ❌ | ✅ | ✅ | ❌ |
| | `hr.sensitive.edit` | ❌ | ✅ | ❌ | ❌ |
| **HR: Attendance** | `hr.attendance.manage` | ❌ | ✅ | ✅ | ❌ |
| | `hr.biometric.sync` | ❌ | ✅ | ✅ | ❌ |
| **HR: Leaves** | `hr.leaves.manage` | ❌ | ✅ | ✅ | ❌ |
| | `hr.leaves.approve` | ❌ | ✅ | ✅ | ❌ |
| **HR: Payroll** | `hr.payroll.calculate` | ❌ | ✅ | ✅ | ❌ |
| | `hr.payroll.approve` | ❌ | ✅ | ❌ | ❌ |
| | `hr.payroll.statutory` | ❌ | ✅ | ✅ | ❌ |
| **HR: Lifecycle / Exits** | `hr.lifecycle.manage` | ❌ | ✅ | ✅ | ❌ |
| | `hr.exits.approve` | ❌ | ✅ | ✅ | ❌ |
| **Self-Service: Profile**| `me.profile.view` | ❌ | ✅ | ✅ | ✅ |
| | `me.profile.edit_request` | ❌ | ✅ | ✅ | ✅ |
| **Self-Service: Punch** | `me.attendance.punch` | ❌ | ✅ | ✅ | ✅ |
| | `me.timesheet.view` | ❌ | ✅ | ✅ | ✅ |
| **Self-Service: Leaves** | `me.leaves.request` | ❌ | ✅ | ✅ | ✅ |
| | `me.leaves.balance` | ❌ | ✅ | ✅ | ✅ |
| **Self-Service: Payslips**| `me.payslips.download` | ❌ | ✅ | ✅ | ✅ |
| | `me.tax_forms.download` | ❌ | ✅ | ✅ | ✅ |
| **Self-Service: Resign** | `me.exit.submit` | ❌ | ✅ | ✅ | ✅ |
| | `me.relieving_letter.view`| ❌ | ✅ | ✅ | ✅ |

---

## 3. Data Scopes & Relational Boundaries

1. **Platform Scope:**
   - Evaluated without tenant filter (`WHERE tenantId IS NULL` or tenant administration across any tenant).
   - Enforced by server middleware: `requireSuperAdmin`.
2. **Tenant Workspace Scope (`tenant-default-001`):**
   - Automatically injected by tenant resolution middleware on all queries.
   - Enforced by server middleware: `requireAuth`, `requireTenantAdmin`, `requirePermission`.
3. **Personal Self-Service Scope:**
   - Evaluated strictly using `req.user.userId` and the associated `Employee.id`.
   - An employee can never read another employee's compensation, documents, or appraisal reviews.
