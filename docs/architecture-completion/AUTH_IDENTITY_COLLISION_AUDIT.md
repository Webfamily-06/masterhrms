# Forensic Audit Report: MASTERHRMS Authentication & Identity Collision

**Audit Date:** November 20, 2026  
**Auditor:** MASTERHRMS Forensic Security Engineering & Architecture Group  
**Target Environment:** MASTERHRMS Production / Staging  
**Primary Database Schema:** Prisma MySQL Engine  
**Tenant Under Audit:** Default Company `tenant-default-001` (`default-tenant`)  

---

## 1. Executive Summary

A forensic security audit was conducted on MASTERHRMS authentication, identity management, user seeding, routing guards, and role resolution. The investigation was initiated following the observation of critical identity collisions in system documentation and seeding routines:

1. `admin@masterhrms.com` was simultaneously operating as the **Platform Super Admin** and a **Tenant-Level Administrator / Employee** within `tenant-default-001`.
2. The same account possessed conflicting role records across both platform scope (`tenantId: null`) and tenant scope (`tenantId: "tenant-default-001"`).
3. Super Admin authentication was not strictly restricted to the dedicated `/super-06` portal; the public `/login` endpoint accepted the Super Admin identity, leaking tenant-level roles.
4. An extraneous default account (`depthead@masterhrms.com`) was seeded as a default company role despite authoritative business policy defining only three tenant roles: **Tenant Admin**, **HR**, and **Employee**.
5. A legacy platform account (`admin@hrms.local`) existed from early bootstrap scripts, creating confusion around the authoritative Super Admin identity.

### Data Model Assessment Gate
> [!IMPORTANT]
> **Data Model Feasibility Confirmation:**
> The underlying Prisma schema **CAN safely separate platform and tenant identities without structural modifications or migrations**.
> 
> Tenancy is not modeled as a hardcoded non-nullable foreign key on the `User` table; rather:
> - `UserRole.tenantId` is nullable (allowing platform-scoped roles when `null`, and tenant-scoped roles when set).
> - `Profile.tenantId` is nullable.
> - `Employee` records are strictly tenant-scoped and contain optional `userId` references.
> - `WorkspaceRoleAssignment` is strictly tenant-scoped.
> 
> The identity collisions observed were caused entirely by **legacy seeding logic**, **unconstrained role resolution**, and **insufficient boundary checks in the `/login` handler**.

---

## 2. Account Identity Forensic Matrix

The table below catalogs every target account inspected directly from the database. In adherence to strict security guidelines, all hashes, tokens, session cookies, and credentials have been completely omitted.

| User ID | Email | Scope / Tenant ID | Assigned Roles (`UserRole` & `WorkspaceRole`) | Attached Employee | Designated Auth Endpoint | Authorized Portal Access | Seed Source / Genesis | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `user-admin-001` | `admin@masterhrms.com` | **COLLISION**<br>- Platform (`null`)<br>- `tenant-default-001` | 1. `super_admin` (`tenant-default-001`)<br>2. `hr_admin` (`tenant-default-001`)<br>3. `manager` (`null`) | `emp-demo-001`<br>(Alex Morgan, CTO) | Dedicated `/super-06` (*Authoritative*) | Platform Super Admin `/super/*` | Initial bootstrap seed | **CRITICAL COLLISION** (Needs role & employee decoupling) |
| `user-tenantadmin-001` | `tenantadmin@masterhrms.com` | `tenant-default-001` | 1. `hr_admin`<br>2. `Workspace Admin` (System Role) | *None* | Normal `/login` | Tenant Admin `/tenant/*` | Provisioning script | **ACTIVE / VALID** (Requires normalization to `tenant_admin`) |
| `user-hr-001` | `hr@masterhrms.com` | `tenant-default-001` | 1. `hr_admin`<br>2. `HR Manager` (Workspace Role) | `EMP-7J9F`<br>(Sarah HR Lead, HR Operations Director) | Normal `/login` | HR Portal `/hr/*` | Initial bootstrap seed | **ACTIVE / VALID** |
| `user-emp-001` | `employee@masterhrms.com` | `tenant-default-001` | 1. `employee`<br>2. `Employee` (Workspace Role) | `EMP-BDAY-AVATAR`<br>(Sarah Connor, Frontend Dev) | Normal `/login` | Self-Service `/me/*` | Initial bootstrap seed | **ACTIVE / VALID** |
| `user-depthead-001` | `depthead@masterhrms.com` | `tenant-default-001` | 1. `manager`<br>2. `Department Head` (Workspace Role) | *None* | Normal `/login` | Management `/hr/*` | Department head seed | **DISALLOWED DEFAULT ROLE** (Must be de-advertised / removed from seed) |
| `32255e7f-42d6-46ac-af56-29d7f57e9bd4` | `admin@hrms.local` | Platform (`null`) | 1. `super_admin` (`null`) | *None* | Legacy `/super-login` | Platform Super Admin `/super/*` | Legacy mock seed | **LEGACY IDENTITY** (To be decommissioned in favor of `admin@masterhrms.com`) |

---

## 3. Root Cause Analysis

### A. Accidental Multi-Role Assignment on `admin@masterhrms.com`
During initial environment bootstrapping, seed scripts populated `user-admin-001` with multiple roles:
- `role-admin-super_admin` was inserted with `tenantId: "tenant-default-001"` instead of `tenantId: null`.
- `role-admin-hr_admin` was inserted for the same user under `tenant-default-001`.
- A later update added `role: "manager"` with `tenantId: null`.

When `resolveEffectiveUserRoles()` ran:
```typescript
// server/src/routes/auth.routes.ts
export async function resolveEffectiveUserRoles(user, tenantId) {
  const baseRoles = (user.roles || []).map((r) => String(r.role || r));
  if (baseRoles.includes("super_admin")) return baseRoles; // Returned ["super_admin", "hr_admin", "manager"]
  ...
}
```
Because the user had both `super_admin` and `hr_admin`, the JWT token was issued containing `roles: ["super_admin", "hr_admin", "manager"]`.

### B. Employee Linkage Collision
In `server/prisma/seed.ts`, the demo CTO employee record `emp-demo-001` ("Alex Morgan") was linked to `user-admin-001` via `userId: "user-admin-001"`. 
Furthermore, the employee record had `email: "employee@masterhrms.com"`, but pointed to `user-admin-001`'s ID rather than `user-emp-001`! This caused:
1. Super Admin being counted as a company employee in attendance and payroll metrics.
2. The employee profile and emergency contact details leaking into the Super Admin session.
3. Violation of Business Rule 2.A.9: *"The Super Admin must not be counted as a tenant employee or tenant administrator."*

### C. Public Login Endpoint Lacked Super Admin Rejection Gate
In `server/src/routes/auth.routes.ts` (`loginHandler`):
- When logging in via the Super Portal (`isSuperPortal === true`), non-super admins were rejected with a 403.
- **However, when logging in via the standard `/login` route (`isSuperPortal === false`), there was NO check rejecting Super Admins.**
- Any user entering `admin@masterhrms.com` on `/login` authenticated successfully, received a tenant-scoped session, and was redirected to tenant routes. This directly violated Business Rule 2.A.3 & 2.A.4.

### D. Client-Side Route Guard Role Bleed
In `src/lib/auth-navigation.ts` and `src/lib/route-guards.ts`:
```typescript
const isSuperAdmin = roles.includes("super_admin") || ...;
const isTenantAdmin = isSuperAdmin || ...; // Inherited tenant admin privileges!
const isHrAdmin = isTenantAdmin || ...;    // Inherited HR privileges!
```
This hierarchical assumption caused any user with `super_admin` in their token to automatically pass tenant-level guards (`/tenant/*` and `/hr/*`), breaking boundary isolation.

### E. Disallowed Default Role (`depthead@masterhrms.com`)
A dedicated user `depthead@masterhrms.com` was seeded with a "Department Head" role. Business Rule 2.B explicitly mandates:
> *"For the current default company, the only agreed default company roles are: 1. Tenant Admin, 2. HR, 3. Employee. Do not create a default Department Head / Manager account."*
Manager responsibilities in MASTERHRMS exist as an organizational hierarchy (the `managerId` foreign key on the `Employee` model) and granular permissions, not as a required separate default seed identity.

---

## 4. Controlled Remediation Plan

To restore strict security boundaries and resolve the collision without service disruption:

1. **Database Relational Reconciliation Script:**
   - Update `user-admin-001`: Retain only `role: "super_admin"` with `tenantId: null`. Remove `role-admin-hr_admin` and `manager` assignments.
   - Disassociate `emp-demo-001` from `user-admin-001` by clearing `userId` or re-assigning it to a designated demo employee, ensuring `user-admin-001` has zero employee records.
   - Update `user-tenantadmin-001`: Ensure primary role is `tenant_admin` with `Workspace Admin` role assignment in `tenant-default-001`.
   - Update `user-hr-001`: Confirm clean attachment to `EMP-7J9F` and `hr_admin` role in `tenant-default-001`.
   - Update `user-emp-001`: Confirm clean attachment to `EMP-BDAY-AVATAR` and `employee` role in `tenant-default-001`.
   - De-advertise `depthead@masterhrms.com` from default credentials documentation and remove it from standard seed logic.
   - Disentangle `admin@hrms.local` so `admin@masterhrms.com` is established as the sole authoritative platform Super Admin.

2. **Backend Authentication Hardening (`server/src/routes/auth.routes.ts`):**
   - In `loginHandler`, if `!isSuperPortal` and the authenticating user is a platform Super Admin (`user.email === "admin@masterhrms.com"` or only has `super_admin` role), immediately reject with generic HTTP 401: `Invalid email or password.` (never expose account existence, never redirect to `/super-06`).
   - In `loginHandler`, if `isSuperPortal === true`, verify that ONLY `admin@masterhrms.com` with `super_admin` role can authenticate. Reject all tenant users with generic 401.
   - In `resolveEffectiveUserRoles()`, if user is Super Admin, return strictly `["super_admin"]` with zero tenant roles.

3. **Frontend Route & Navigation Alignment:**
   - Create dedicated route alias `/super-06` mapping to the Super Admin portal login.
   - Refactor `src/lib/route-guards.ts` and `src/lib/auth-navigation.ts` to eliminate `isTenantAdmin = isSuperAdmin || ...`. Ensure strict portal separation.
   - Verify sidebar registries across all 4 portals (`/super/*`, `/tenant/*`, `/hr/*`, `/me/*`).

4. **Security Regression Tests:**
   - Implement automated tests verifying all 8 boundary scenarios defined in Section 7 of the specification.
