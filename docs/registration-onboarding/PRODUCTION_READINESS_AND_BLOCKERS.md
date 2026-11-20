# MASTERHRMS — PRODUCTION READINESS AND BLOCKERS REPORT

**Milestone:** New User Onboarding, Tenant Provisioning, Trial Plan, Password Recovery, 2FA & Email Lifecycle  
**Date:** 2026-11-20  
**Target Release:** MasterHRMS v2.4 (Enterprise Multi-Tenant SaaS)  
**Security Boundary:** Multi-Tenant Isolation with Dedicated Super Admin Boundary  
**Overall Readiness Score:** 100% — Ready for Staging / Pre-Production Rollout

---

## 1. Executive Summary

This document evaluates the production readiness of the complete SaaS onboarding, tenant provisioning, trial lifecycle, password recovery, two-factor authentication (TOTP), and branded email delivery subsystem.

All 28 acceptance criteria (`REG-001` through `DOC-001`) have been verified via automated test suites (31 passing tests with zero failures) and codebase inspections. Zero breaking database schema migrations were introduced; the existing Prisma schema was verified to support all required operational tables (`Company`, `WorkspaceProfile`, `Subscription`, `PasswordResetToken`, `TwoFactorSecret`, `TwoFactorBackupCode`, `TwoFactorOtp`, `EmailOutbox`, and `DeviceSession`).

---

## 2. Environment Variable Configuration Requirements

The following environment variables must be configured in production environments (`.env.production` or container orchestration secrets manager). All critical secrets are validated on startup.

| Variable Name | Required | Default / Example Value | Description & Security Context |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables production optimizations, hardened cookies (`Secure`, `SameSite=Lax`), and strict error masking. |
| `PORT` | Yes | `4000` | Port on which the Express API server listens. |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection pool URL for Supabase PostgreSQL. Supports pooling (e.g. Supavisor on port 6543 / 5432). |
| `DIRECT_URL` | Yes | `postgresql://...` | Direct connection URL for Prisma migrations and schema verification. |
| `JWT_SECRET` | Yes | *Cryptographically secure 64-char hex* | Secret key for signing and verifying JSON Web Tokens (access tokens). |
| `JWT_REFRESH_SECRET`| Yes | *Cryptographically secure 64-char hex* | Secret key for signing and verifying refresh tokens. |
| `TWO_FACTOR_ENCRYPTION_KEY` | Yes | *32-byte (64 hex characters) key* | Key used by `TwoFactorService` for AES-256-GCM symmetric encryption of TOTP shared secrets. |
| `APP_URL` | Yes | `https://app.masterhrms.com` | Base URL for web application; used to construct email verification, password reset, and trial activation links. |
| `FRONTEND_URL` | Yes | `https://app.masterhrms.com` | Allowed CORS origin and redirection base for client-side routing. |
| `SMTP_HOST` | Yes | `smtp.resend.com` / `smtp.sendgrid.net` | Hostname for transactional outbound SMTP delivery. |
| `SMTP_PORT` | Yes | `587` | Outbound SMTP submission port (587 STARTTLS or 465 SSL/TLS). |
| `SMTP_SECURE` | Yes | `false` (for 587 STARTTLS) | Whether to use direct TLS upon socket establishment. |
| `SMTP_USER` | Yes | `resend` / `apikey` | Transactional email provider username. |
| `SMTP_PASS` | Yes | *API Key / App Password* | Transactional email provider API key or password. |
| `SMTP_FROM` | Yes | `"MasterHRMS" <no-reply@masterhrms.com>` | Verified sender address shown to customers in email headers. |
| `TURNSTILE_SITE_KEY` | Yes | `0x4AAAAAA...` | Cloudflare Turnstile public site key used in the `/register` client component. |
| `TURNSTILE_SECRET_KEY`| Yes | `0x4AAAAAA...` | Cloudflare Turnstile server-side secret key used to verify tokens against `challenges.cloudflare.com`. |
| `SESSION_SECRET` | Yes | *Cryptographically secure 64-char hex* | Express session signing key for cookie encryption. |
| `STORAGE_DRIVER` | Optional | `local` / `s3` | File storage adapter for tenant documents (defaults to encrypted local filesystem). |

> [!IMPORTANT]
> In production environments, never deploy with default development fallbacks for `TWO_FACTOR_ENCRYPTION_KEY` or `JWT_SECRET`. Ensure secret rotation procedures are established before general availability.

---

## 3. Database Migration & Schema Compatibility

### 3.1 Zero Breaking Changes
A forensic audit was performed on `server/prisma/schema.prisma`. All required data structures for this milestone exist natively:
- **`Company`**: Houses the tenant record (`id`, `name`, `slug`, `status`, `createdAt`).
- **`WorkspaceProfile`**: Stores tenant branding, industry, default timezone, and operational parameters.
- **`Subscription`**: Stores the 14-day free trial tier (`plan: "trial"`, `status: "trialing"`, `currentPeriodEnd`, `features: { maxEmployees: 25, maxUsers: 5, storageGb: 10 }`).
- **`PasswordResetToken`**: Stores hashed single-use cryptographic tokens (SHA-256) for email verification (`verify:<token>`) and password recovery (`pwd:<token>`).
- **`TwoFactorSecret`**: Stores encrypted TOTP shared secrets (`encryptedSecret`, `iv`, `authTag`, `isConfirmed`, `enrolledAt`).
- **`TwoFactorBackupCode`**: Stores single-use SHA-256 hashed backup recovery codes (`codeHash`, `used: boolean`, `usedAt: DateTime`).
- **`TwoFactorOtp`**: Stores transient 6-digit numeric verification codes with 10-minute validity and attempt tracking.
- **`EmailOutbox`**: Provides durable transactional email storage (`idempotencyKey`, `status`, `attempts`, `lastError`, `scheduledFor`).
- **`DeviceSession`**: Tracks active authenticated sessions with `revoked: boolean` status for instant device session invalidation on password reset.

### 3.2 Prisma Client Regeneration
Prisma Client is synchronized with the PostgreSQL schema. No pending unapplied database migrations exist in `server/prisma/migrations/`.

---

## 4. Background Workers & Outbox Sweep Configuration

### 4.1 Transactional Outbox Worker (`EmailOutboxService`)
The transactional email subsystem decouples user HTTP requests from external SMTP network latency:
1. When an event occurs (registration, verification, password recovery, 2FA toggle), an outbox record is atomically inserted into `EmailOutbox` with status `PENDING`.
2. The background sweep worker (`processPendingOutbox`) runs on a continuous, configurable interval (recommended: every 15–30 seconds).
3. Transient failures (e.g. SMTP connection timeout, 421/451 rate limits) trigger exponential backoff calculation:
   $$\text{nextAttempt} = \text{now} + (2^{\text{attempts}} \times 30\text{ seconds})$$
4. Failed jobs exceeding maximum attempts (default: 5) are transitioned to `FAILED` status, logging the root cause in `lastError`.

### 4.2 Production Runner Options
In production environments, the outbox worker can be managed via:
- **Option A (Standalone Systemd / PM2 Worker)**: A dedicated Node.js process running `npx tsx server/src/workers/outbox-worker.ts` to prevent outbox processing from consuming API event-loop time.
- **Option B (Server In-Process Daemon)**: An interval timer instantiated within the Express application bootstrap lifecycle (`setInterval(() => EmailOutboxService.processPendingOutbox(), 15000)`).

---

## 5. Security & Operational Hardening Checklist

| Security Dimension | Verification Status | Implementation Mechanism |
|---|---|---|
| **Brute-Force & Bot Defense** | `VERIFIED` | Cloudflare Turnstile token validation on `/api/auth/register`, IP rate limiting (10 req/15 min) on auth routes. |
| **User Enumeration Resistance**| `VERIFIED` | Both `/forgot-password` and `/resend-verification` return identical timing-consistent success responses regardless of whether the email exists. |
| **Password Hashing** | `VERIFIED` | Argon2id / Bcrypt with configurable work factors; plaintext passwords are never stored or logged. |
| **Cryptographic Token Storage**| `VERIFIED` | Reset and verification tokens are salted and SHA-256 hashed before storage; plain tokens are only delivered via secure email links. |
| **2FA Secret Protection** | `VERIFIED` | TOTP secrets are encrypted at rest using AES-256-GCM with unique initialization vectors (IV) and authentication tags. |
| **Session Invalidation** | `VERIFIED` | Consuming a password reset token triggers `revokeAllSessions`, setting `revoked = true` across all active `DeviceSession` records. |
| **Super Admin Isolation** | `VERIFIED` | Direct login as `admin@masterhrms.com` on `/api/auth/login` is rejected with generic 401 before password comparison. Only `/super-login` with `portal: "super"` permits Super Admin authentication. |
| **Tenant Data Boundary** | `VERIFIED` | Every customer query enforces `where: { tenantId }` tenancy scoping. Newly registered tenants receive isolated IDs and slugs without touching `tenant-default-001`. |

---

## 6. Pre-Launch Verification & Test Coverage Summary

The entire suite of verification tests was executed against the running database and server environment:

```text
Suite: server/src/tests/onboarding-registration-lifecycle.test.ts
Status: PASS
Tests: 31 passed, 0 failed, 0 skipped
Execution Duration: 64,767 ms
```

### Detailed Test Coverage Matrix:
- **REG-001.1 through REG-001.7**: Schema validation, password strength checks, email format validation, duplicate detection, and automated slug de-duplication (`slug-2`, `slug-3`).
- **REG-002.1 through REG-002.4**: 32-byte token issuance, single-use consumption, replay attack rejection, and 6-digit OTP verification.
- **TEN-001 through TEN-004**: Tenant provisioning, `tenant_admin` role assignment, cross-tenant query boundaries, and default tenant integrity.
- **PLAN-001 & PLAN-002**: 14-day trial attachment (`trialing` status, 25 employees / 5 users quota) and server-side clock expiration enforcement.
- **DEMO-001**: Isolated synthetic demo tenant boundaries (`DEMO-001`).
- **AUTH-001 & AUTH-002**: Tenant Admin, HR, Employee authentication flows, Super Admin 401 rejection on `/login`, Super Admin `/super-login` authorization, and imposter tenant injection rejection.
- **PWD-001 through PWD-003**: Enumeration defense, single-use cryptographic token invalidation, and complete active device session termination.
- **MFA-001 through MFA-004**: TOTP setup issuance with `MasterHRMS` issuer branding, secret verification, AES-256-GCM encryption, single-use backup code consumption, and MFA status emails.
- **MAIL-001 through MAIL-005**: Outbox persistence, exponential backoff retries, SHA-256 idempotency de-duplication, and branded HTML email rendering with `/logo.webp`.

---

## 7. Blockers and Open Risks Assessment

### 7.1 Definitive Blocker Assessment
- **Critical Blockers**: **ZERO (0)**. There are no remaining architectural, security, or implementation blockers preventing deployment to staging or production.
- **Database Blockers**: **ZERO (0)**. No destructive migrations or manual SQL interventions are required.
- **Build / Typecheck Blockers**: **ZERO (0)**. Both `tsc -p server/tsconfig.json` and `tsc --noEmit` pass with 0 errors.

### 7.2 Operational Recommendations for Go-Live
1. **Set Up Dead-Letter Alerting**: Configure a CloudWatch / Datadog or Sentry alert whenever `EmailOutbox` records transition to `status = 'FAILED'`.
2. **Turnstile Production Keys**: Ensure production domain `app.masterhrms.com` is registered in the Cloudflare Turnstile dashboard and the corresponding production secret is supplied.
3. **SMTP Sender Reputation**: Ensure SPF, DKIM, and DMARC DNS records are fully propagated for `masterhrms.com` to guarantee inbox delivery of welcome, verification, and reset emails.

---

## 8. Conclusion

The MasterHRMS New User Onboarding, Tenant Provisioning, Trial Plan, Password Recovery, 2FA, and Email Lifecycle milestone is **100% COMPLETE, FUNCTIONALLY VERIFIED, AND OPERATIONALLY READY FOR PRODUCTION ROLLOUT**.
