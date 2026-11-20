# Login Endpoints & Portal Routing Forensic Audit

**Document Reference:** `DOC-ARCH-ROUTE-005`  
**Endpoints Evaluated:** `POST /api/auth/login`, `POST /api/auth/super-login`, `/login`, `/super-06`, `/super06`  
**Frameworks:** Express.js 4 (Backend API) & TanStack Router / React 18 (Frontend)  

---

## 1. Authentication Endpoints Architecture

MASTERHRMS provides two strictly isolated authentication endpoints to service disparate security tiers:

```
[User Browser]
      |
      +---> Normal Sign-In:    /login   ---> POST /api/auth/login       (Tenant-Only)
      |
      +---> Super Admin Entry: /super-06 ---> POST /api/auth/super-login (Platform-Only)
```

### Detailed Handler Audit: `server/src/routes/auth.routes.ts`

#### 1. Public Tenant Login: `POST /api/auth/login`
- **Intended Scope:** Exclusively for tenant users (`tenantadmin@masterhrms.com`, `hr@masterhrms.com`, `employee@masterhrms.com`).
- **Audit Finding (Pre-Fix Vulnerability):**
  - When `isSuperPortal` was false, `loginHandler` verified the bcrypt password and issued a JWT token without checking whether the user was the platform Super Admin.
  - As a result, entering `admin@masterhrms.com` on `/login` succeeded and issued a JWT token with whatever tenant roles were attached, allowing Super Admin access through the normal tenant login flow.
- **Remediation Implemented:**
  - Added an explicit Super Admin rejection gate in `loginHandler`:
    ```typescript
    if (!isSuperPortal) {
      const isSuper = user.roles.some((r: any) => r.role === "super_admin") || user.email === "admin@masterhrms.com";
      if (isSuper) {
        // Return generic 401 to prevent account existence enumeration
        return res.status(401).json({ error: "Invalid email or password." });
      }
    }
    ```
  - **No Silent Redirect:** The endpoint returns standard 401 JSON and does NOT redirect the user to `/super-06`.

#### 2. Dedicated Super Admin Login: `POST /api/auth/super-login`
- **Intended Scope:** Exclusively for the designated platform Super Admin (`admin@masterhrms.com`).
- **Audit Finding (Pre-Fix Vulnerability):**
  - Checked `user.roles.some(r => r.role === "super_admin")`, but did not assert that the user was the singular designated Super Admin email (`admin@masterhrms.com`).
  - Returned distinct 403 errors (`"Only Super Administrators can log in through the Super Admin portal"`), leaking role details.
- **Remediation Implemented:**
  - Enforced exact identity matching:
    ```typescript
    if (isSuperPortal) {
      const isAuthorizedSuper = user.roles.some((r: any) => r.role === "super_admin") && user.email === "admin@masterhrms.com";
      if (!isAuthorizedSuper) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
    }
    ```

---

## 2. Frontend Portal Routing & Guard Evaluation

| Route Path | TanStack Router Guard | Allowed Identity | Failure Action |
| :--- | :--- | :--- | :--- |
| `/login` | `beforeLoad` redirect to `/auth` | Public (Tenant Users) | Redirect to `/auth` |
| `/super-06` | Dedicated entry route | Public (Super Admin only) | Concealed on tenant subdomains (`notFound()`) |
| `/super/*` | `_authenticated/route.tsx` | Platform Super Admin (`roles.includes("super_admin")`) | On tenant subdomains: `404 Not Found`.<br>On platform: redirect `/super-06` |
| `/tenant/*`| `_authenticated/tenant.tsx` | Tenant Admin (`roles.includes("tenant_admin")` or `workspace_admin`) | Redirect to `/403 Forbidden` |
| `/hr/*` | `_authenticated/hr.tsx` | HR Manager (`roles.includes("hr_admin")` or `hr`) | Redirect to `/403 Forbidden` |
| `/me/*` | `_authenticated/me.tsx` | Any authenticated employee in active workspace | Redirect to `/auth` |

### URL Tampering & Privilege Escalation Defenses
1. **Frontend-Only Modification Immunity:** If an employee modifies client state or changes the URL from `/me/dashboard` to `/tenant/settings`, the `beforeLoad` route guard in `src/routes/_authenticated/tenant.tsx` re-evaluates the verified token and redirects to `/403`.
2. **Server-Side Token Authority:** Even if a user bypasses client guards (e.g. via direct `curl` requests), all backend API routes under `/api/*` run `requireAuth`, `requireSuperAdmin`, or `requirePermission`. The server decodes and cryptographically verifies the JWT signature and active session ID in MySQL before executing any query.
3. **Session Revocation & Anti-Replay:** All issued tokens contain an authoritative `sessionId` backed by the `DeviceSession` database table. Revoking a session immediately invalidates all subsequent API requests across all portals.
