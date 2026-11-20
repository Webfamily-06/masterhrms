# Default Account & Seeding Architecture Audit

**Document Reference:** `DOC-ARCH-SEED-006`  
**Target Tenant:** `tenant-default-001` (Slug: `default-tenant`)  
**Seed Files Inspected:** `server/prisma/seed.ts`, `server/src/lib/tenant-provisioning.ts`, `server/src/routes/auth.routes.ts`  

---

## 1. Default Tenant Architecture

MASTERHRMS operates a dedicated default workspace instance for demonstrations, integration tests, and out-of-the-box company deployments:
- **Tenant ID:** `tenant-default-001`
- **Tenant Slug:** `default-tenant`
- **Tenant Name:** Default Workspace / Company

**Architectural Rule Compliance:**
- The tenant ID `tenant-default-001` is strictly preserved.
- All existing entity relationships (employees, departments, designations, shifts, attendance, payroll) remain rooted in `tenant-default-001`.
- No secondary or duplicate default tenant is created during reconciliation or seeding.

---

## 2. Seed Code & Provisioning Analysis

### A. `server/prisma/seed.ts`
- **Historical Defect:**
  In earlier versions of `seed.ts`, the platform administrator user was created as:
  ```typescript
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@masterhrms.com" },
    create: {
      id: "user-admin-001",
      email: "admin@masterhrms.com",
      roles: {
        create: [
          { role: "super_admin", tenantId: "tenant-default-001" }, // WRONG: attached tenant ID!
          { role: "hr_admin", tenantId: "tenant-default-001" },    // WRONG: gave HR role!
        ],
      },
    },
  });
  ```
  Additionally, the demo employee `emp-demo-001` was linked to `user-admin-001`:
  ```typescript
  await prisma.employee.create({
    data: {
      id: "emp-demo-001",
      tenantId: "tenant-default-001",
      userId: adminUser.id, // WRONG: linked Super Admin as an employee!
      position: "Chief Technology Officer",
      ...
    }
  });
  ```
- **Remediation:**
  The seed script and database state must decouple `user-admin-001` from any `tenantId` and any `employee` record.

### B. `server/src/routes/auth.routes.ts` (`GET /api/auth/public/tenant/credentials`)
- Lines 206-322 query the database to display default demo credentials on the login screen.
- Currently, it queries:
  1. `tenantAdmin`: queries `Workspace Admin` or `tenant_admin` for the tenant.
  2. `hrAdmin`: queries `hr_admin` excluding `admin@masterhrms.com`.
  3. `employee`: queries `employee`.
- It **does NOT** advertise `depthead@masterhrms.com` or `admin@masterhrms.com` on the tenant login screen, aligning with business rules.

---

## 3. Account Reconciliation Specification

The reconciliation process applies non-destructive relational updates in MySQL:

### 1. Platform Super Admin (`admin@masterhrms.com` / `user-admin-001`)
- **Action:**
  - Delete `role-admin-hr_admin` (`role: "hr_admin"`).
  - Delete `fa6b61c5-1b12-472a-9bb2-678a89ad719e` (`role: "manager"`).
  - Update `role-admin-super_admin` (`role: "super_admin"`) setting `tenantId = NULL`.
  - Update `profile-admin-001` setting `tenantId = NULL`.
  - Update `emp-demo-001` setting `userId = NULL` (or reassigning to a dedicated demo employee), leaving `user-admin-001` with zero employee associations.
- **Result:** `user-admin-001` becomes a pure platform-level identity with zero tenant footprints.

### 2. Tenant Administrator (`tenantadmin@masterhrms.com` / `user-tenantadmin-001`)
- **Action:**
  - Retain `role-tenantadmin-001` with `role: "tenant_admin"` (or `hr_admin` + `Workspace Admin` system role).
  - Retain `Workspace Admin` workspace role assignment (`1b83a967-178d-4abe-94ff-b54c7c297d57`) on `tenant-default-001`.
- **Result:** Fully functional Tenant Admin with full governance permissions over `tenant-default-001`.

### 3. HR Operations Lead (`hr@masterhrms.com` / `user-hr-001`)
- **Action:**
  - Retain `role-hr-001` with `role: "hr_admin"` on `tenant-default-001`.
  - Retain `HR Manager` workspace role assignment on `tenant-default-001`.
  - Retain employee link to `EMP-7J9F` ("Sarah HR Lead", HR Operations Director).
- **Result:** Dedicated HR identity managing workforce, attendance, leave, and payroll.

### 4. Workspace Employee (`employee@masterhrms.com` / `user-emp-001`)
- **Action:**
  - Retain `role-emp-001` with `role: "employee"` on `tenant-default-001`.
  - Retain `Employee` workspace role assignment on `tenant-default-001`.
  - Retain employee link to `EMP-BDAY-AVATAR` ("Sarah Connor", Frontend Developer).
- **Result:** Dedicated Employee identity for self-service portal interactions.

### 5. Department Head (`depthead@masterhrms.com` / `user-depthead-001`)
- **Action:**
  - Mark status as deactivated or remove from default seeding and documentation.
  - Do not present or advertise as a default company role.

### 6. Legacy Super Admin (`admin@hrms.local`)
- **Action:**
  - Decommission from active usage so `admin@masterhrms.com` is established as the sole authoritative platform Super Admin.
