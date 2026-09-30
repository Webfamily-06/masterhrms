# Authentication, RBAC & Multi-Tenant Isolation Forensic Flow

## 1. Authentication Architecture
The platform utilizes stateless JWT Bearer tokens signed with HMAC SHA-256 (`jsonwebtoken`) and password hashing via `bcryptjs` (10 rounds).

### 1.1. Login Routes & Token Payloads
* **Tenant & Employee Login**: `POST /api/auth/login` (`server/src/routes/auth.routes.ts`)
  * Payload: `{ id, email, role, tenantId, employeeId? }`
  * Frontend Storage: `localStorage.getItem("hrms_auth_token")`
* **Super Admin Login**: `POST /api/auth/super-login` (`server/src/routes/auth.routes.ts`)
  * Payload: `{ id, email, role: "super_admin", isRoot: true }`
  * Frontend Storage: `localStorage.getItem("hrms_auth_token")`

---

## 2. Multi-Tier Protected API Execution Pipeline
Every request to a protected API endpoint traverses a strict 6-stage middleware pipeline in `server/src/middleware/`:

```
Request 
  ──> [1. requireAuth] 
  ──> [2. Tenant Isolation Verification] 
  ──> [3. requireRole / requirePermission] 
  ──> [4. requireAddon Entitlement Engine] 
  ──> [5. Business Logic Validation (Zod)] 
  ──> [6. Database Transaction & Audit Log]
```

1. **`requireAuth`**: Verifies JWT signature and expiration. Attaches `req.user` to the Express request context.
2. **Tenant Isolation Verification**: For all non-Super-Admin routes, extracts `tenantId` from `req.user.tenantId`. Verifies that `x-tenant-id` header matches or defaults to the authenticated tenant. Rejects mismatch with HTTP 403.
3. **`requireRole(roles)`**: Checks if `req.user.role` is in the allowed role array.
4. **`requirePermission(permissionKey)`**: Resolves user's assigned permissions and verifies key.
5. **`requireAddon(addonSlug)`**: Queries `TenantAddon` table to verify that the tenant has an active entitlement to paid modules (e.g. `assets`, `pos-billing`, `double-entry-accounting`).
6. **Audit Trail**: Mutating operations log user ID, tenant ID, action, IP address, and payload diff to `AuditLog`.

---

## 3. Role Hierarchy & Access Boundaries

| Role Name | Authority Scope | Isolation Rule | Prohibited Actions |
| :--- | :--- | :--- | :--- |
| **`super_admin`** | Platform-Wide (Root) | Unbounded (No tenant_id constraint) | Cannot access tenant payroll/bank records without audit trail |
| **`tenant_admin`** | Single Organization | Strict `tenant_id` mandatory on all queries | Cannot access other tenants; cannot modify global platform plans |
| **`hr_manager`** | Single Organization | Strict `tenant_id` | Cannot access accounting ledger; cannot finalize monthly payroll |
| **`accountant`** | Single Organization | Strict `tenant_id` | Cannot modify employee core profiles; cannot access recruitment |
| **`cashier`** | Single Organization / Counter | Scoped to active POS register & warehouse | Cannot view profit margins, general ledger, or employee compensation |
| **`employee`** | Single User Record | Scoped to `employee_id` matching JWT | Cannot view colleagues' attendance, leaves, salaries, or tickets |
| **`client`** | Single Client Account | Scoped to `client_id` matching JWT | Cannot access internal ERP, HRM, inventory costs, or vendor bills |
