# MASTERHRMS — REGISTRATION & TENANT PROVISIONING AUDIT

## 1. Executive Summary

This audit report documents the architectural forensic inspection, security analysis, and implementation of the SaaS self-service registration and automated tenant provisioning lifecycle in **MASTERHRMS**.

Prior to this milestone, tenant workspace initialization was coupled to manual administrative seeding or partially automated onboarding scripts without self-service public registration (`/register`), cryptographic email verification, or atomic outbox event publishing.

The newly established registration and provisioning subsystem delivers:
1. Public new-user registration (`POST /api/auth/register`) with strict schema validation, input normalization, password strength requirements, and Cloudflare Turnstile bot deterrence.
2. Cryptographically secure email verification lifecycle (`POST /api/auth/verify-email`) utilizing 32-byte high-entropy single-use tokens hashed via SHA-256 in the database alongside expiring 6-digit numeric OTP codes.
3. Transactional, canonical tenant workspace provisioning (`provisionTenantWithTrial`) that seeds organization records, assigns Tenant Admin / Workspace Admin roles without privilege leakage, establishes standard charts of accounts (17 accounts), provisions central warehouses, attaches a 14-day free trial subscription, and logs idempotent outbox dispatch events.

---

## 2. Public Registration Endpoint Analysis (`POST /api/auth/register`)

### 2.1 Route & Schema Specification
- **Endpoint**: `POST /api/auth/register`
- **Controller**: `server/src/routes/auth.routes.ts`
- **Validation Schema**:
```typescript
const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().min(2, "Company name must be at least 2 characters long"),
  country: z.string().optional().default("India"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long"),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and privacy policy to continue",
  }),
  turnstileToken: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

### 2.2 Security Controls & Defenses
1. **Terms & Privacy Acceptance**: Mandatory boolean validation (`termsAccepted: true`). Non-compliance returns HTTP 400.
2. **Password Strength & Matching**: Enforces minimum 8 characters and strict equality comparison between `password` and `confirmPassword`.
3. **Email Normalization & Duplicate Detection**:
   - Emails are lowercased and trimmed.
   - Database lookup checks `prisma.user.findUnique({ where: { email: normalizedEmail } })`.
   - Existing accounts trigger HTTP 400/409 duplicate rejection.
4. **Tenant Slug Collision Resolution**:
   - `suggestWorkspaceSlug` generates kebab-case alphanumeric slugs.
   - Slug collision check inspects existing `prisma.tenant` and `workspaceSlugRedirect` records.
   - Duplicate slugs auto-increment deterministically (`acme`, `acme-2`, `acme-3`) to guarantee collision-free workspace isolation.
5. **Cryptographic Hashing**: Passwords hashed using bcrypt with work factor 10. Plaintext passwords never persist or log.

---

## 3. Email Verification Lifecycle (`POST /api/auth/verify-email`)

### 3.1 Token Generation & Persistence
When a registration occurs, the server generates two distinct verification credentials:
1. **Raw Token**: 32-byte cryptographic random string (`crypto.randomBytes(32).toString("hex")`).
2. **Hashed Token Persistence**: Hashed via SHA-256 and stored in `password_reset_tokens` with purpose prefix:
   ```sql
   INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
   VALUES ($1, $2, 'verify:' || $3, NOW() + INTERVAL '24 hours');
   ```
3. **Numeric OTP Code**: 6-digit cryptographic OTP code generated via `createOrReplaceOtp(user.id)` stored in `two_factor_otps` with an attempt limit of 5 and 60-minute expiration.

### 3.2 Verification Execution & Atomicity
When the user submits either the token link or 6-digit code:
- **Single-Use Enforcement**: The matched database record is immediately marked with `used_at = NOW()`.
- **Replay Protection**: Any subsequent request with the same token or OTP code is rejected with HTTP 400 (`code: "INVALID_VERIFICATION"`).
- **Workspace Activation**: If the user does not yet possess an active tenant workspace, `provisionTenantWithTrial` is invoked within the verification flow.

---

## 4. Canonical Tenant Provisioning Architecture (`provisionTenantWithTrial`)

### 4.1 Orchestration Sequence
Located in `server/src/lib/tenant-provisioning.ts`, `provisionTenantWithTrial` performs atomic multi-entity orchestration:

```
[Incoming Request]
        │
        ▼
[Check Existing User Tenant Linkage] ─── (Already Linked) ───► Return Existing Workspace
        │
        ▼ (New Provisioning)
[Generate Unique UUID & Verified Slug]
        │
        ▼
[Create Tenant Record] (isOnboarded: false)
        │
        ▼
[Create TenantSubscription] (status: "trialing", 14-day duration, standard quotas)
        │
        ▼
[Seed Default Chart of Accounts] (17 standard ERP accounts)
        │
        ▼
[Create Central Warehouse] (Central Distribution Hub)
        │
        ▼
[Assign AppRole hr_admin]
        │
        ▼
[Assign WorkspaceRole 'Workspace Admin'] (Linked via UserRoleAssignment)
        │
        ▼
[Publish Outbox Event: 'tenant.provisioned']
        │
        ▼
[Dispatch Welcome & Trial Activated Branded Emails]
```

### 4.2 Role & Privilege Boundary Protection
A critical requirement is that tenant administrators must NEVER receive platform-level `super_admin` permissions, nor be mistakenly scoped as basic `employee` users:
- `AppRole` assignment: `hr_admin` scoped to `tenantId`.
- `WorkspaceRoleAssignment`: Bound to `Workspace Admin` on the tenant.
- Resulting effective roles resolved by `resolveEffectiveUserRoles`:
  `["tenant_admin", "admin", "workspace_admin"]`.
- `super_admin` role count: **0**.
- Default landing portal: `/tenant/dashboard`.

---

## 5. Verification & Test Evidence

The native test suite `server/src/tests/onboarding-registration-lifecycle.test.ts` programmatically exercises all registration and provisioning pathways:

| Test ID | Description | Result | Execution Time |
|---|---|---|---|
| `REG-001.1` | Valid registration returns 201 with verification preview | **PASSED** | 2090 ms |
| `REG-001.2` | Rejects invalid email syntax (HTTP 400) | **PASSED** | 6.8 ms |
| `REG-001.3` | Rejects weak password < 8 characters (HTTP 400) | **PASSED** | 3.6 ms |
| `REG-001.4` | Rejects password and confirmPassword mismatch | **PASSED** | 2.1 ms |
| `REG-001.5` | Rejects missing terms & privacy acceptance | **PASSED** | 2.0 ms |
| `REG-001.6` | Rejects duplicate email registration (HTTP 400/409) | **PASSED** | 2032 ms |
| `REG-001.7` | Auto-increments slug on conflict for identical company names | **PASSED** | 9465 ms |
| `REG-002.1` | Token verification activates workspace and creates session | **PASSED** | 7905 ms |
| `REG-002.2` | Consumed token rejected on replay (HTTP 400) | **PASSED** | 4.2 ms |
| `REG-002.3` | Tampered token rejected (HTTP 400) | **PASSED** | 2162 ms |
| `REG-002.4` | 6-digit OTP code verification activates workspace | **PASSED** | 7496 ms |
| `TEN-001` | Creates dedicated tenant with unique ID and slug | **PASSED** | 102 ms |
| `TEN-002` | User assigned Tenant Admin; NOT Super Admin or Employee | **PASSED** | 221 ms |
| `TEN-003` | Cross-tenant data isolation strictly enforced | **PASSED** | 1700 ms |
| `TEN-004` | Existing default tenant (`tenant-default-001`) untouched | **PASSED** | 106 ms |

---

## 6. Security & Architectural Conformance

1. **Zero Password Leakage**: Passwords never appear in outbox payloads, log output, or error messages.
2. **Timing Attack Protection**: Password comparison uses constant-time bcrypt routines.
3. **Single-Use Verification**: Tokens immediately invalidated upon first successful consumption.
4. **Idempotent Workspace Creation**: Multiple concurrent verification calls for the same user safely resolve the identical tenant without record duplication.
