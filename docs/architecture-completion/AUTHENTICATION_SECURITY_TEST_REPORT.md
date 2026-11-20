# Authentication & Security Test Suite Report

**Document Reference:** `DOC-ARCH-TEST-007`  
**Test Suite File:** `server/src/tests/auth-super-tenant-separation.test.ts`  
**Target Coverage:** Security Invariants, Boundary Verification, Token Tampering Resistance  

---

## 1. Security Verification Test Matrix

The following 8 mandatory security verification scenarios are codified to prevent regression:

| Test ID | Test Scenario | Request Endpoint & Payload | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Platform Super Admin Authentication | `POST /api/auth/super-login`<br>`{ email: "admin@masterhrms.com", password: "..." }` | HTTP 200 OK | Token issued with `roles: ["super_admin"]`, `tenantId: null`, access to `/super/*` permitted. |
| **SEC-02** | Platform Super Admin Rejection on Normal Login | `POST /api/auth/login`<br>`{ email: "admin@masterhrms.com", password: "..." }` | HTTP 401 Unauthorized | Generic response `{"error": "Invalid email or password."}`. Zero redirect, zero role disclosure. |
| **SEC-03** | Tenant Admin Authentication on Normal Login | `POST /api/auth/login`<br>`{ email: "tenantadmin@masterhrms.com", password: "..." }` | HTTP 200 OK | Token issued for `tenant-default-001` with `roles: ["tenant_admin", "workspace_admin"]`. |
| **SEC-04** | Tenant Admin Rejection on Dedicated Super Login | `POST /api/auth/super-login`<br>`{ email: "tenantadmin@masterhrms.com", password: "..." }` | HTTP 401 Unauthorized | Generic response `{"error": "Invalid email or password."}`. No access granted to `/super/*`. |
| **SEC-05** | HR Lead Authorization & Boundary Isolation | `POST /api/auth/login`<br>`{ email: "hr@masterhrms.com", password: "..." }` | HTTP 200 OK | Access to `/hr/*` allowed; attempts to call `/super/*` return 404/403; attempts to call `/tenant/*` return 403. |
| **SEC-06** | Employee Authorization & Boundary Isolation | `POST /api/auth/login`<br>`{ email: "employee@masterhrms.com", password: "..." }` | HTTP 200 OK | Access to `/me/*` allowed; attempts to access `/super/*`, `/tenant/*`, or `/hr/*` return 403 Forbidden. |
| **SEC-07** | Cryptographic Token Tampering Defense | Tampered JWT payload (`roles: ["super_admin"]` signed with random key) | HTTP 401 Unauthorized | Backend `jwt.verify` rejects invalid cryptographic signature before executing any business logic. |
| **SEC-08** | Navigation Registry Role Leakage Defense | Evaluate `getNavigationForPortal()` across all 4 portal keys | Clean Array Output | 0 super items in tenant/hr/me;<br>0 tenant items in hr/me;<br>0 hr items in me. |

---

## 2. Test Execution Architecture

### Automated Integration Test Harness
Tests are implemented using Jest / Supertest against the live Express router:

```typescript
describe("SEC-01 & SEC-02: Super Admin Dedicated Entry vs Normal Login Rejection", () => {
  it("rejects admin@masterhrms.com on POST /api/auth/login with generic 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@masterhrms.com", password: "correct-password" });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
    expect(res.body.token).toBeUndefined();
  });

  it("authenticates admin@masterhrms.com on POST /api/auth/super-login", async () => {
    const res = await request(app)
      .post("/api/auth/super-login")
      .send({ email: "admin@masterhrms.com", password: "correct-password" });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const payload = decodeJwt(res.body.token);
    expect(payload.roles).toEqual(["super_admin"]);
    expect(payload.tenantId).toBeNull();
  });
});
```

---

## 3. Cryptographic Tampering Simulation

### Test Scenario: Client Claim Manipulation
1. An attacker obtains a valid Employee token for `employee@masterhrms.com`.
2. The attacker decodes the token payload, alters `"roles": ["employee"]` to `"roles": ["super_admin"]`, and re-encodes the JWT base64 segments.
3. The forged token is dispatched to `GET /api/super/tenants`.
4. **Result:** `server/src/middleware/auth.ts` invokes `verifyToken(token)` using the server's private secret. The HMAC SHA-256 signature mismatch triggers `JsonWebTokenError: invalid signature`. The request is rejected with `HTTP 401 Unauthorized: Token expired or invalid` before reaching any controller or database query.
