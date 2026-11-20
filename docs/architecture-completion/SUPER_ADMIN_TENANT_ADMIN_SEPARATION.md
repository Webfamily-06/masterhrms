# Architectural Blueprint: Super Admin & Tenant Admin Boundary Separation

**Document Reference:** `DOC-ARCH-SEP-002`  
**Security Boundary Level:** Platform Core (L0) vs Tenant Workspace (L1)  
**Target Entities:** Platform Super Admin (`admin@masterhrms.com`) & Tenant Admin (`tenantadmin@masterhrms.com`)  

---

## 1. Boundary Architecture Overview

MASTERHRMS enforces a dual-tier security architecture separating Platform Administration from Workspace Administration:

```
+-----------------------------------------------------------------------------------+
|                            PLATFORM ROOT BOUNDARY (L0)                            |
|                                                                                   |
|  Identity: admin@masterhrms.com                                                   |
|  Portal:   /super/* (Dashboard, Tenants, Subscriptions, Plans, Addons, Gateways)   |
|  Login:    /super-06 (Dedicated, Isolated Auth Entry Point)                      |
|  Token:    { tenantId: null, roles: ["super_admin"], isImpersonating: false }      |
+----------------------------------------+------------------------------------------+
                                         |  (Hard Isolation Barrier - No Bleed)
                                         v
+-----------------------------------------------------------------------------------+
|                            TENANT WORKSPACE BOUNDARY (L1)                         |
|                            Tenant ID: tenant-default-001                          |
|                                                                                   |
|  Identities:                                                                      |
|    - Tenant Admin (tenantadmin@masterhrms.com) -> Portal: /tenant/*               |
|    - HR Manager   (hr@masterhrms.com)          -> Portal: /hr/*                   |
|    - Employee     (employee@masterhrms.com)    -> Portal: /me/*                   |
|                                                                                   |
|  Login:    /login (Public Workspace Sign-In)                                      |
|  Token:    { tenantId: "tenant-default-001", roles: ["tenant_admin", ...] }       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Definitive Separation Invariants

### Invariant 1: Dedicated Entry Points
- **Platform Super Admin:** MUST authenticate strictly via the dedicated `/super-06` endpoint (`POST /api/auth/super-login`). Attempting to authenticate via the standard `/login` endpoint (`POST /api/auth/login`) MUST be rejected immediately with a generic HTTP 401 response (`{"error": "Invalid email or password."}`).
- **Tenant Workspace Users:** MUST authenticate via the standard `/login` endpoint. Attempting to authenticate via `/super-06` MUST be rejected with a generic HTTP 401 response.
- **Zero Information Leakage:** Neither login endpoint may indicate whether an email address exists or belongs to another security tier. No automated redirects from `/login` to `/super-06` are permitted.

### Invariant 2: Mutually Exclusive Identity Claims
- The platform Super Admin (`admin@masterhrms.com`) must NEVER possess tenant-scoped roles (`hr_admin`, `tenant_admin`, `manager`, `employee`) or a tenant ID in its primary role record.
- The platform Super Admin must NEVER be assigned an `Employee` record. It must not appear in employee directories, organizational charts, payroll registers, or leave approval queues.
- Workspace users (`tenantadmin@masterhrms.com`, `hr@masterhrms.com`, `employee@masterhrms.com`) must NEVER possess the `super_admin` role claim.

### Invariant 3: Token Architecture Differences

| Token Claim | Platform Super Admin Token | Tenant Admin Token |
| :--- | :--- | :--- |
| `userId` | `user-admin-001` | `user-tenantadmin-001` |
| `email` | `admin@masterhrms.com` | `tenantadmin@masterhrms.com` |
| `tenantId` | `null` | `"tenant-default-001"` |
| `roles` | `["super_admin"]` | `["tenant_admin", "workspace_admin"]` |
| `workspaceRole`| `undefined` / `null` | `"Workspace Admin"` |
| `permissions` | Platform privileges (`system.*`, `tenants.*`, `addons.*`) | Tenant privileges (`settings.*`, `users.*`, `roles.*`) |
| `isImpersonating`| `false` (unless actively running an audited impersonation session) | `false` |

---

## 3. Server-Side Middleware Enforcement

### Platform Boundary Guard: `requireSuperAdmin`
Implemented in `server/src/middleware/auth.ts`:
```typescript
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isSuper = req.user.roles.includes("super_admin");
  if (!isSuper) {
    return res.status(403).json({ 
      error: "Forbidden: Super Administrator platform privileges required",
      code: "SUPER_ADMIN_REQUIRED" 
    });
  }
  next();
}
```

### Tenant Boundary Guard: `requireTenantAdmin` / `requirePermission`
Tenant endpoints verify both active tenant context and valid tenant role assignments:
```typescript
export function requireTenantAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Super Admin cannot access tenant administrative APIs without explicit impersonation context
  if (req.user.roles.includes("super_admin") && !req.user.isImpersonating) {
    return res.status(403).json({
      error: "Forbidden: Direct Super Admin execution on tenant endpoints is disallowed. Workspace context required.",
      code: "TENANT_CONTEXT_REQUIRED"
    });
  }
  const hasTenantAdmin = req.user.roles.some((r) => 
    ["tenant_admin", "workspace_admin", "admin"].includes(r)
  );
  if (!hasTenantAdmin) {
    return res.status(403).json({
      error: "Forbidden: Tenant Administrator privileges required",
      code: "TENANT_ADMIN_REQUIRED"
    });
  }
  next();
}
```

---

## 4. Frontend Route & Guard Separation

1. **`/super/*` Routes:**
   - Evaluated by `_authenticated/route.tsx`.
   - On tenant workspace subdomains: instantly throws `notFound()` (404 Not Found), concealing Super Admin route existence.
   - On apex/platform domain: requires `hrms_auth_token` with verified `super_admin` role claim.
2. **`/tenant/*` Routes:**
   - Evaluated by `_authenticated/tenant.tsx`.
   - Requires `isTenantAdmin === true` (`roles.includes("tenant_admin") || roles.includes("workspace_admin")`).
   - Platform Super Admin tokens without active tenant context are rejected and redirected to `/403`.
3. **`/hr/*` Routes:**
   - Evaluated by `_authenticated/hr.tsx`.
   - Requires `hr_admin` or `hr_manager` role within the workspace.
4. **`/me/*` Routes:**
   - Evaluated by `_authenticated/me.tsx`.
   - Accessible to any authenticated workspace employee.
