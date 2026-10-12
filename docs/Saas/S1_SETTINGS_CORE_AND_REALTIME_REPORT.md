# MASTERHRMS — S-Track Step S1 Implementation & Security Triage Report

**Report ID:** `DOC-SAAS-S1-001`  
**Date:** 2026-10-11  
**Status:** **PASSED & VERIFIED (100% COMPLETE)**  
**Authoritative Plan:** `docs/Saas/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md`  
**Preceding Audit:** `docs/Saas/S0_FORENSIC_AUDIT_REPORT.md`  
**Worklog Reference:** `docs/Saas/worklog.md` (Decisions `D-041`, `D-042`)

---

## 1. Executive Summary

This report documents the completion of **Step S1 (Settings Core & Real-time Engine)** along with **Phase 0 Security Triage** for the MASTERHRMS SaaS platform.

All work was completed strictly on **localhost** without modifying external infrastructure or deploying to remote VPS/DNS environments.

### Key Milestones Achieved:
1. **Phase 0 — Security Triage Remediated:** Identified and patched an unauthenticated static file exposure vulnerability on `/uploads` in `server/src/index.ts` using `uploadsSecurityMiddleware`. Private documents now require valid JWT authentication and enforce strict tenant boundary checks. Whitelisted public branding and addons remain accessible. Verified via dedicated regression tests (6/6 passing).
2. **Phase 1 — Baseline Preserved:** Retained the existing PostgreSQL schema and Dual Razorpay architecture (`system-platform-settings` for Platform Billing vs `system-razorpay-gateway-${tenantId}` for Tenant POS/Invoicing).
3. **Phase 2 — Dynamic Settings Registry:** Expanded `SETTINGS_REGISTRY` in `server/src/services/settings/settings-registry.ts` with validated, typed schemas, defaults, and scope controls for `email`, `oauth`, `storage`, and `security`.
4. **Phase 3 — In-Memory TTL Cache & DB Fallback:** Implemented a scope-aware in-memory cache with 60-second TTL, automatic DB fallback on cache misses, safe degradation on DB read errors, and targeted cache invalidation upon setting updates.
5. **Phase 4 — Authenticated AES-256-GCM Encryption:** Hardened credential encryption using AES-256-GCM with 96-bit random IVs and 128-bit authentication tags. Tampered payloads and invalid tags fail closed. Secret masking enforced across API responses, audit trails (`SettingAudit`), and error logs.
6. **Phase 5 — Segregated Socket.io Real-time Propagation:** Secured WebSocket rooms server-side (`platform:admin` for platform administrators, `tenant:${tenantId}` for tenant users). Updates emit `settings.updated` with safe metadata only (zero credential exposure).
7. **Phase 6 — Dynamic Runtime Consumers:** Upgraded `server/src/lib/email.ts` and `server/src/routes/auth.routes.ts` to dynamically resolve configurations from `SettingsService` at runtime, while preserving `.env` fallbacks for bootstrap values.
8. **Phase 7 — Empirical Verification:** Verified all deliverables with **55 passing automated tests** across 3 test suites, clean TypeScript compilation (`tsc --noEmit`, exit 0), and clean frontend production build (`npm run build`, exit 0 in 7.00s).

---

## 2. Phase 0 — Security Triage: Static File Exposure Vulnerability

### 2.1 Vulnerability Description & Forensic Evidence
In `server/src/index.ts`, the static uploads directory was mounted unauthenticated before tenant identification or authentication middleware:
```typescript
// Previous implementation:
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
```
**Forensic Verification:**
A live test file `uploads/documents/1791314198762-cea2feb4.pdf` was queried without authentication:
```bash
curl -i http://localhost:4000/uploads/documents/1791314198762-cea2feb4.pdf
```
**Result:** HTTP 200 OK — Sensitive tenant employee documents and contracts were publicly accessible to unauthenticated callers.

### 2.2 Remediation Implemented
Created `server/src/middleware/uploads-security.middleware.ts` and mounted it immediately prior to the static handler:
- **Public Assets Whitelist:** Requests targeting public directories (`branding/`, `system/branding/`, `addons/`, `media/icons/`) bypass authentication so landing pages, tenant logos, and public marketplace icons render without auth tokens.
- **Private Documents Gate:** Requests targeting private folders (`documents/`, `contracts/`, `payroll/`, `resumes/`, `kyc/`) require a valid Bearer JWT.
- **Tenant Isolation Check:** Queries the `MediaFile` database record by stored path. If the requesting user's tenant ID does not match the file's tenant owner (and the user is not a platform Super Admin), access is denied with `HTTP 403 Forbidden` (`ACCESS_DENIED`).
- **Unauthenticated Handling:** Unauthenticated requests to private documents return `HTTP 401 Unauthorized` (`UPLOAD_AUTH_REQUIRED`).

### 2.3 Empirical Verification
Authored `server/src/tests/security-uploads-isolation.test.ts`:
```bash
npx tsx --test server/src/tests/security-uploads-isolation.test.ts
```
**Output:**
```
✔ Public assets (branding) allow unauthenticated access (HTTP 200)
✔ Private documents reject unauthenticated requests with HTTP 401
✔ Private documents accept valid authenticated requests for the owner tenant (HTTP 200)
✔ Private documents reject cross-tenant requests with HTTP 403 Forbidden
✔ Super admin can access documents across tenants (HTTP 200)
✔ Non-existent private document returns HTTP 404 for authorized tenant
ℹ tests 6 | pass 6 | fail 0 | cancelled 0 | skipped 0 | todo 0
```
Live curl test confirmed:
```
HTTP/1.1 401 Unauthorized
{"success":false,"error":{"code":"UPLOAD_AUTH_REQUIRED","message":"Authentication required to access private documents"}}
```

---

## 3. Phase 1 & 2 — Dynamic Settings Registry

The settings registry (`server/src/services/settings/settings-registry.ts`) was expanded to define strict JSON schemas, types, validation functions, default values, sensitivity flags, and scopes for all four core configuration groups:

### 3.1 Email / SMTP Group (`email`)
| Key | Type | Scope | Sensitive | Validation / Constraints |
|---|---|---|---|---|
| `email.provider_type` | enum | BOTH | No | `smtp`, `sendgrid`, `mailgun`, `postmark`, `ses` |
| `email.smtp_host` | string | BOTH | No | Valid hostname / IP |
| `email.smtp_port` | number | BOTH | No | 1 – 65535 |
| `email.smtp_user` | string | BOTH | No | String |
| `email.smtp_password` | string | BOTH | **Yes** | AES-256-GCM encrypted in DB |
| `email.smtp_encryption` | enum | BOTH | No | `none`, `ssl`, `tls` |
| `email.from_name` | string | BOTH | No | String (max 100) |
| `email.from_email` | string | BOTH | No | Valid RFC email |
| `email.reply_to` | string | BOTH | No | Valid RFC email |
| `email.ignore_tls` | boolean | BOTH | No | Boolean |

### 3.2 OAuth Group (`oauth`)
| Key | Type | Scope | Sensitive | Validation / Constraints |
|---|---|---|---|---|
| `oauth.google_enabled` | boolean | BOTH | No | Boolean |
| `oauth.google_client_id` | string | BOTH | No | String |
| `oauth.google_client_secret` | string | BOTH | **Yes** | AES-256-GCM encrypted in DB |
| `oauth.github_enabled` | boolean | **PLATFORM** | No | Super Admin platform only |
| `oauth.github_client_id` | string | **PLATFORM** | No | Platform OAuth client ID |
| `oauth.github_client_secret` | string | **PLATFORM** | **Yes** | AES-256-GCM encrypted in DB |
| `oauth.microsoft_enabled` | boolean | BOTH | No | Boolean |
| `oauth.microsoft_client_id` | string | BOTH | No | String |
| `oauth.microsoft_client_secret` | string | BOTH | **Yes** | AES-256-GCM encrypted in DB |
| `oauth.microsoft_tenant_id` | string | BOTH | No | String |

### 3.3 Storage Group (`storage`)
| Key | Type | Scope | Sensitive | Validation / Constraints |
|---|---|---|---|---|
| `storage.provider` | enum | BOTH | No | `local`, `s3`, `gcs`, `r2` |
| `storage.s3_bucket` | string | BOTH | No | Valid bucket name |
| `storage.s3_region` | string | BOTH | No | Valid region format |
| `storage.s3_access_key` | string | BOTH | No | String |
| `storage.s3_secret_key` | string | BOTH | **Yes** | AES-256-GCM encrypted in DB |
| `storage.s3_endpoint` | string | BOTH | No | Optional S3/R2 custom URL |
| `storage.encryption_enabled` | boolean | BOTH | No | Client-side/bucket encryption |
| `storage.max_file_size_mb` | number | BOTH | No | 1 – 100 MB |

### 3.4 Security Group (`security`)
| Key | Type | Scope | Sensitive | Validation / Constraints |
|---|---|---|---|---|
| `security.mfa_enforced` | boolean | BOTH | No | Enforces MFA |
| `security.session_timeout_minutes`| number | BOTH | No | 5 – 10,080 minutes (7 days) |
| `security.max_login_attempts` | number | BOTH | No | 3 – 20 attempts |
| `security.lockout_duration_minutes`| number | BOTH | No | 1 – 1,440 minutes |
| `security.password_min_length` | number | BOTH | No | 8 – 128 characters |
| `security.password_require_special`| boolean | BOTH | No | Boolean |
| `security.password_expiry_days` | number | BOTH | No | 0 – 365 days (0 = disabled) |
| `security.ip_allowlist` | string | BOTH | No | Comma-separated IP / CIDR |
| `security.rate_limit_rpm` | number | **PLATFORM** | No | 10 – 10,000 RPM (Platform only) |

---

## 4. Phase 3 & 4 — In-Memory TTL Cache & AES-256-GCM Credential Protection

### 4.1 In-Memory TTL Cache (`SettingsService`)
Implemented high-performance in-memory caching directly inside `SettingsService`:
- **Cache Key Namespacing:** `PLATFORM:ALL:group` or `TENANT:${scopeId}:group`.
- **TTL Duration:** 60,000 ms (60 seconds). Expired entries trigger fresh database reads.
- **Secret Safety in Cache:** Cached group objects only hold masked representations of secrets (`{ isSecret: true, set: true }`), preventing in-memory secret extraction from standard cache dumps.
- **Fail-Safe DB Error Handling:** If the database connection encounters a transient read error or disconnect, `SettingsService.getGroup` falls back to the existing cached value or default registry values, logging a structured warning without crashing.
- **Targeted Cache Invalidation:** Updating settings via `setGroup` automatically purges the specific tenant cache key. Updating a `PLATFORM` scope setting automatically clears all cached tenant settings to refresh platform inheritance.

### 4.2 AES-256-GCM Authenticated Encryption
- **Algorithm:** Authenticated `aes-256-gcm`.
- **IV / Nonce:** 96-bit (12-byte) cryptographically secure random bytes generated via `crypto.randomBytes(12)` per encryption.
- **Authentication Tag:** 128-bit (16-byte) GCM authentication tag obtained via `cipher.getAuthTag()`.
- **Storage Format:** Versioned composite string: `v1:<hex_iv>:<hex_tag>:<hex_ciphertext>`.
- **Tamper Protection:** Decryption calls `decipher.setAuthTag(tag)`. If the ciphertext, IV, or authentication tag is tampered with or modified by even a single bit, the GCM engine throws an authentication failure error (`Unsupported state or unable to authenticate data`).
- **Secret Masking:**
  - Standard API reads return `{ isSecret: true, set: true }` without disclosing ciphertext or plaintext.
  - Audit logging (`SettingAudit`) records the event with `valueJson: "[MASKED SECRET]"`.
  - Logging and errors explicitly sanitize sensitive fields.

---

## 5. Phase 5 — Real-time Socket.io Propagation

WebSocket event propagation is implemented in `server/src/socket.ts` and triggered in `SettingsService.setGroup`:

### 5.1 Server-Side Room Authorization
- **Super Admin Sockets:** Sockets authenticated with `role: "super_admin"` join the dedicated room `platform:admin`.
- **Tenant User Sockets:** Sockets authenticated with a valid tenant identity join the room `tenant:${tenantId}`.
- Cross-tenant socket joining is strictly rejected.

### 5.2 Segregated Broadcasting & Safe Payloads
When `SettingsService.setGroup` completes a successful database transaction:
- **Public Platform Settings** (`branding`, `locale`) are broadcast to all connected clients (`broadcastToAll`).
- **Private Platform Settings** (`email`, `oauth`, `storage`, `security`) are broadcast exclusively to `platform:admin` (`broadcastToPlatform`).
- **Tenant Settings** are broadcast exclusively to `tenant:${scopeId}` (`broadcastToTenant`).
- **Payload Sanitization:** Sockets receive only safe notification metadata:
  ```json
  {
    "scope": "TENANT",
    "tenantId": "tenant-uuid-1234",
    "group": "email",
    "keys": ["email.from_name", "email.smtp_port"],
    "version": 2,
    "timestamp": "2026-10-11T04:30:00.000Z"
  }
  ```
  **Zero secrets, passwords, tokens, or ciphertexts are ever emitted over WebSocket.**

---

## 6. Phase 6 — Dynamic Runtime Consumers

Updated existing application runtime consumers to prioritize database-driven settings with graceful fallback to environment variables:

### 6.1 Dynamic Email Consumer (`server/src/lib/email.ts`)
The `getDynamicEmailConfig(tenantId?)` helper resolves configuration in real-time:
1. Queries `SettingsService.getGroup("TENANT", tenantId, "email", { decryptSecrets: true })` if `tenantId` is supplied.
2. Falls back to `SettingsService.getGroup("PLATFORM", null, "email", { decryptSecrets: true })`.
3. Falls back to `SettingService.getPlatformSettings()` / `cmsPage` record.
4. Falls back to bootstrap `process.env.SMTP_*` variables.
5. Constructs and caches active Nodemailer transports dynamically per configuration version.

### 6.2 Dynamic OAuth Consumer (`server/src/routes/auth.routes.ts`)
The `getPlatformOAuthConfig()` helper resolves OAuth configuration in real-time:
1. Queries `SettingsService.getGroup("PLATFORM", null, "oauth", { decryptSecrets: true })`.
2. Decrypts `oauth.google_client_secret` securely.
3. Falls back to `cmsPage` record (`system-platform-settings`).
4. Falls back to bootstrap `process.env.GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

---

## 7. Empirical Verification & Test Results

### 7.1 Test Execution Summary

| Test Suite | Purpose | Tests | Result | Duration |
|---|---|---|---|---|
| `security-uploads-isolation.test.ts` | Phase 0 `/uploads` static file authentication & tenant isolation | 6 | **6/6 PASS** | 0.45s |
| `s1-settings-core-and-realtime-engine.test.ts` | Phase 1–6 Registry schemas, cache, AES-256-GCM, masking, Socket.io, consumers | 20 | **20/20 PASS** | 1.12s |
| `a8-production-hardening-and-resilience.test.ts` | Predecessor regression test: Razorpay dual architecture, tenant isolation, quotas | 29 | **29/29 PASS** | 3.41s |
| **Total Automated Tests** | | **55** | **55/55 PASS** | **100%** |

### 7.2 Backend TypeScript Compilation
```bash
npm run typecheck  # (cd server && npx tsc --noEmit)
```
**Output:**
```
Exit code: 0 (Zero errors, zero warnings)
```

### 7.3 Frontend Production Build
```bash
npm run build
```
**Output:**
```
vite v6.2.1 building for production...
transforming...
✓ 4001 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   3.19 kB │ gzip:   1.14 kB
dist/assets/index-D7Ue3F3u.css   214.32 kB │ gzip:  34.81 kB
dist/assets/index-CS_62GzM.js   3,842.11 kB │ gzip: 982.15 kB
✓ built in 7.00s
Exit code: 0
```

---

## 8. Files Changed & Artifacts

### 8.1 Files Modified & Created
1. `server/src/index.ts`: Integrated `uploadsSecurityMiddleware` onto `/uploads`, added `NODE_ENV !== "test"` guards around listener and background cron jobs.
2. `server/src/middleware/uploads-security.middleware.ts` *(New)*: Enforces public asset whitelist, JWT authentication for private assets, and `MediaFile` tenant isolation check.
3. `server/src/services/settings/settings-registry.ts`: Added complete schema definitions for `email`, `oauth`, `storage`, and `security`.
4. `server/src/services/settings/settings.service.ts`: Implemented authenticated AES-256-GCM encryption, in-memory TTL caching, cache invalidation, secret masking, and real-time Socket.io propagation.
5. `server/src/socket.ts`: Added `broadcastToPlatform`, authorized Super Admin connections to `platform:admin`.
6. `server/src/lib/email.ts`: Updated `getDynamicEmailConfig` to consume dynamic settings from `SettingsService`.
7. `server/src/routes/auth.routes.ts`: Updated `getPlatformOAuthConfig` to dynamically read Google OAuth credentials from `SettingsService`.
8. `server/src/tests/security-uploads-isolation.test.ts` *(New)*: 6 automated tests validating `/uploads` security.
9. `server/src/tests/s1-settings-core-and-realtime-engine.test.ts` *(New)*: 20 automated tests validating S1 functionality.
10. `docs/Saas/worklog.md`: Recorded Decisions `D-041` and `D-042`.
11. `docs/Saas/S1_SETTINGS_CORE_AND_REALTIME_REPORT.md` *(New)*: This comprehensive report.

### 8.2 Environment Variables Required
No new environment variables required. Existing encryption key `SETTINGS_ENCRYPTION_KEY` or `ENCRYPTION_KEY` is utilized for AES-256-GCM. If omitted on localhost, a deterministic 32-byte fallback key is generated with an explicit log warning.

---

## 9. Next Steps (Roadmap Progression)

With Step S1 signed off and verified, the project proceeds to:

- **Next Step:** **Step S2 — Runtime Factories & Dynamic Consumers** per `docs/Saas/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md`.
  - Rebuilding dynamic client factories for Mailer, OAuth providers, Storage disks, Real-time push, and SMS.
  - Ensuring zero server-restart requirement when settings are modified.
  - Continuing to protect the Dual Razorpay architecture and tenant isolation boundaries.
