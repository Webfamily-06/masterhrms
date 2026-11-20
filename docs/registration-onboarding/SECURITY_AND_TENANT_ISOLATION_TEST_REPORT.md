# MASTERHRMS — SECURITY & TENANT ISOLATION TEST REPORT

## 1. Executive Summary

This security evaluation details the defense-in-depth mechanisms, tenant isolation boundaries, and role-based access control (RBAC) enforcement across **MASTERHRMS**.

Specific focus is given to:
1. Strict separation of the platform **Super Admin** identity (`admin@masterhrms.com`) from normal tenant authentication flows.
2. Cross-tenant data isolation and preventing cross-workspace leakage.
3. Authenticated symmetric encryption of two-factor authentication secrets at rest (AES-256-GCM).
4. Prevention of privilege escalation during self-service public registration.

---

## 2. Super Admin Separation Security Audit (`AUTH-002`)

### 2.1 Security Boundary Rules
The platform Super Admin identity belongs exclusively to the global platform boundary and must never authenticate through normal tenant portals or count as a tenant user.

| Security Assertion | Implementation Enforcement | Test Verification Status |
|---|---|---|
| **Login through `/login` rejected** | Normal `/api/auth/login` checks if user is platform Super Admin. If true, immediately returns generic HTTP 401 without verifying password. | **PASSED (AUTH-002.1)** |
| **Zero Identity Leakage** | Returns identical `"Invalid email or password."` generic error to prevent probing. | **PASSED (AUTH-002.1)** |
| **No Silent Redirection** | Never automatically redirects from `/login` to `/super-06`. | **PASSED (AUTH-002.1)** |
| **Dedicated Super Portal** | Authentication accepted ONLY when request explicitly carries `portal: "super"` or `x-auth-portal: "super"`. | **PASSED (AUTH-002.2)** |
| **Unauthorized User Imposter Rejection** | Non-super users attempting to submit `portal: "super"` are rejected with HTTP 403 (`code: "SUPER_ADMIN_ONLY"`). | **PASSED (AUTH-002.3)** |
| **Mobile Access Prohibition** | Super Administrator logins are strictly blocked from mobile clients (`code: "SUPER_ADMIN_MOBILE_ACCESS_DENIED"`). | **PASSED (Source Inspection)** |

### 2.2 Server-Side Code Enforcement
In `server/src/routes/auth.routes.ts`:
```typescript
if (!isSuperPortal) {
  const isPlatformSuperAdmin = user.roles.some((r: any) => r.role === "super_admin" && !r.tenantId);
  if (isPlatformSuperAdmin) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
}

if (isSuperPortal) {
  const isSuper = user.roles.some((r: any) => r.role === "super_admin");
  if (!isSuper || user.email !== "admin@masterhrms.com") {
    return res.status(403).json({
      error: "Access denied. Only the designated Super Administrator can log in through this portal.",
      code: "SUPER_ADMIN_ONLY",
    });
  }
}
```

---

## 3. Cross-Tenant Data Isolation (`TEN-003`, `TEN-004`)

### 3.1 Tenant Context Binding
All authenticated requests carry a verified `tenantId` claim inside the signed JWT.
- Middleware `requireAuth` validates the `tenantId` against the user's active profile and role assignments in the database.
- Any request originating from User A (Tenant A) requesting resources belonging to Tenant B is denied with HTTP 403 / 404 or filtered out at the query level (`where: { tenantId }`).

### 3.2 Default Tenant Protection
The platform's default tenant (`tenant-default-001`, `master`) is protected:
- Automated registration generates unique, random UUIDs and distinct slugs.
- Seed data and default company configurations are never mutated or polluted during new tenant onboarding.
- Test `TEN-004` verifies that `tenant-default-001` remains intact after arbitrary tenant registrations.

---

## 4. Cryptographic Security & Privilege Escalation Defenses

### 4.1 Zero Privilege Escalation on Registration
When a public visitor registers on `/register`:
- They cannot supply role claims in the request body (schema ignores unexpected fields).
- Provisioning strictly assigns `hr_admin` AppRole and `Workspace Admin` WorkspaceRole.
- Verified test `TEN-002` confirms:
  - `super_admin` role count: **0**.
  - `employee` role count: **0** (user is workspace admin, not self-service employee).

### 4.2 AES-256-GCM Secret Encryption
- TOTP secrets are encrypted via AES-256-GCM before database insertion.
- Database inspection confirms `twoFactorSecret` does not contain the plaintext base32 string.
- Backup codes are hashed via SHA-256; raw codes are never stored in the database.

---

## 5. Security Test Suite Summary

Executed via `npx tsx --test server/src/tests/onboarding-registration-lifecycle.test.ts`:

```
  ▶ AUTH-001 & AUTH-002: Authentication Flow Preservation & Super Admin Separation
    ✔ AUTH-001: Normal login succeeds for tenant user (1215 ms)
    ✔ AUTH-002.1: Super Admin rejected on normal /login with generic 401 (265 ms)
    ✔ AUTH-002.2: Super Admin authenticates when portal is specified as 'super' (508 ms)
    ✔ AUTH-002.3: Non-super user attempting 'super' portal is rejected with 403 SUPER_ADMIN_ONLY (501 ms)
  ✔ AUTH-001 & AUTH-002 (PASSED)

  ▶ TEN-001 through TEN-004: Tenant Provisioning, Role Boundaries & Tenant Isolation
    ✔ TEN-001: Creates dedicated tenant with unique ID and slug (102 ms)
    ✔ TEN-002: User is assigned Tenant Admin; NOT Super Admin or Employee (221 ms)
    ✔ TEN-003: Cross-tenant data isolation strictly enforced (1700 ms)
    ✔ TEN-004: Existing default tenant (tenant-default-001) is protected (106 ms)
  ✔ TEN-001 through TEN-004 (PASSED)
```
