# MASTERHRMS — SUPER ADMIN "RUN AS COMPANY" (IMPERSONATION) FLOW SPECIFICATION

**Document Version:** 1.0.0  
**Effective Date:** 2026-11-20  
**Classification:** Security Architecture & Authorization Standard  

---

## 1. PURPOSE & ARCHITECTURAL BOUNDARY

The **Super Admin** identity (`admin@masterhrms.com`) belongs exclusively to the **Platform Security Boundary** and authenticates only through `/super-06`.

To support platform-level customer support, compliance audits, and tenant onboarding troubleshooting, the platform provides a controlled **"Run as Company"** (Impersonation) capability.

### Strict Security Rules:
1. Super Admin impersonation must land directly on **`/tenant/dashboard`** (Company Admin Workspace), **NOT** on HR operations (`/hr/*` or `/hrm-dashboard`) and **NOT** on employee self-service (`/me/*`).
2. When impersonating, the view is strictly scoped to the target company's tenant workspace.
3. Impersonation must display a prominent, persistent **Impersonation Banner** (`ImpersonationBanner`) across the top of every tenant page.
4. The banner must provide a 1-click **"Return to Super Admin"** action that immediately terminates the impersonation context and returns the administrator to `/super/tenants`.
5. Impersonation is strictly unidirectional: **Tenant users cannot elevate or impersonate platform Super Admins.**

---

## 2. END-TO-END FLOW SEQUENCE

```
+----------------------------------------------------------------------------------------------------+
| 1. Super Admin Portal (/super/tenants)                                                             |
|    - Super Admin browses registered tenant list                                                    |
|    - Selects tenant (e.g. 'tenant-default-001' / 'default-tenant')                                  |
|    - Clicks "Run as Company" action button                                                         |
+----------------------------------------------------------------------------------------------------+
                                             |
                                             v
+----------------------------------------------------------------------------------------------------+
| 2. Impersonation Context Initialization                                                            |
|    - API: POST /api/super/impersonate/:tenantId (Records server-side audit log)                     |
|    - Session: Sets `hrms_impersonating_tenant` in localStorage / Auth Context                       |
|    - Navigation: `navigate({ to: "/tenant/dashboard" })`                                           |
+----------------------------------------------------------------------------------------------------+
                                             |
                                             v
+----------------------------------------------------------------------------------------------------+
| 3. Route Guard & Access Resolution (src/lib/route-guards.ts)                                       |
|    - Target: /tenant/*                                                                             |
|    - Guard check: `allowed = auth.isTenantAdmin || (auth.isSuperAdmin && isImpersonating)`         |
|    - Target validation: PASS. Tenant Workspace renders.                                            |
+----------------------------------------------------------------------------------------------------+
                                             |
                                             v
+----------------------------------------------------------------------------------------------------+
| 4. Tenant Workspace Rendering                                                                      |
|    - Renders 11-Group Tenant Sidebar (Company Admin workspace only, 0 HR/Employee links)           |
|    - Displays persistent Amber Impersonation Banner at top:                                        |
|      "⚠️ Viewing as Company: Default Company (tenant-default-001) [Return to Super Admin]"        |
|    - All workspace API calls pass `X-Tenant-Id: tenant-default-001` or use impersonated JWT       |
+----------------------------------------------------------------------------------------------------+
                                             |
                                             v
+----------------------------------------------------------------------------------------------------+
| 5. Exit Impersonation Context                                                                      |
|    - Administrator clicks "Return to Super Admin" on the Impersonation Banner                      |
|    - Client clears `hrms_impersonating_tenant` key                                                 |
|    - API: Optional termination audit log                                                           |
|    - Redirect: Immediately returns to `/super/tenants`                                             |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. CODE IMPLEMENTATION DETAILS

### 3.1 Initiating Impersonation (`src/routes/_authenticated/super/tenants.tsx`)

```tsx
const handleLoginAsTenant = async (tenant: Tenant) => {
  try {
    localStorage.setItem("hrms_impersonating_tenant", JSON.stringify({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timestamp: Date.now(),
    }));
    toast.info(`Entering workspace for ${tenant.name}...`);
    // CRITICAL FIX: Directs to /tenant/dashboard, NOT /hrm-dashboard
    navigate({ to: "/tenant/dashboard" as any });
  } catch (err: any) {
    toast.error(err?.message || "Failed to enter tenant workspace.");
  }
};
```

### 3.2 Route Guarding (`src/lib/route-guards.ts`)

```typescript
const isImpersonating = typeof window !== "undefined" && !!localStorage.getItem("hrms_impersonating_tenant");

if (targetPortal === "tenant") {
  // Super Admin is granted access ONLY when actively impersonating a tenant
  const allowed = auth.isTenantAdmin || (auth.isSuperAdmin && isImpersonating);
  if (!allowed) {
    return {
      allowed: false,
      redirectUrl: auth.isSuperAdmin ? "/super/dashboard" : "/hr/dashboard",
      reason: "Tenant admin privileges or active tenant impersonation required.",
    };
  }
}
```

### 3.3 Default Route Resolution (`src/lib/auth-navigation.ts`)

```typescript
export function getDefaultRouteForRole(roles: string[]): string {
  const isImpersonating = typeof window !== "undefined" && !!localStorage.getItem("hrms_impersonating_tenant");
  
  // Impersonating Super Admin lands on Tenant Dashboard
  if (isImpersonating) {
    return "/tenant/dashboard";
  }

  if (roles.includes("super_admin")) {
    return "/super/dashboard";
  }

  if (roles.includes("tenant_admin") || roles.includes("admin")) {
    return "/tenant/dashboard";
  }

  if (roles.includes("hr_admin") || roles.includes("hr") || roles.includes("hr_manager")) {
    return "/hr/dashboard";
  }

  return "/me/dashboard";
}
```

### 3.4 Persistent Impersonation Banner (`src/components/impersonation-banner.tsx`)

The banner provides visual assurance of elevated context:
- Distinctive warning styling (`bg-amber-500 text-white`).
- Clear identification of the impersonated tenant (`name` and `id`).
- Prominent exit button that safely clears state.

---

## 4. AUDIT LOGGING & COMPLIANCE

All impersonation actions trigger audit events recorded in `AuditLog`:
- **Action:** `SUPER_ADMIN_IMPERSONATION_START`
  - `actorId`: Super Admin user ID (`user-admin-001`)
  - `targetTenantId`: Selected tenant ID (`tenant-default-001`)
  - `ipAddress`: Client IP address
  - `timestamp`: UTC ISO timestamp
- **Action:** `SUPER_ADMIN_IMPERSONATION_END`
  - `actorId`: Super Admin user ID
  - `targetTenantId`: Impersonated tenant ID
  - `durationSeconds`: Total duration of the impersonation session

---

## 5. SUMMARY

By enforcing server-side authorization checks, route guard verification, direct landing on `/tenant/dashboard`, and strict clearance upon exit, MasterHRMS ensures that the platform Super Admin can perform administrative and support actions safely without breaching tenant isolation boundaries or leaking cross-portal routes.
