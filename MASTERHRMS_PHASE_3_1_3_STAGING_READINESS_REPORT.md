# MASTERHRMS — PHASE 3.1.3 STAGING READINESS REPORT
## Deployment Checklist, Environment Configuration & Staging Smoke Test Plan

**Repository:** `Webfamily-06/masterhrms`  
**Execution Branch:** `fix/phase-3-1-3-critical-remediation`  
**Base Commit:** `5dca806e2325372337d45f3c96570aa617fb0063`  
**Date:** November 1, 2026  
**Final Status Verdict:** **READY FOR STAGING VALIDATION**  

---

## 1. Staging Readiness Checklist

- [x] **Zero Hardcoded Production Fallbacks**: All fallback keys removed from new encryption paths in `server/src/lib/crypto-config.ts`.
- [x] **Legacy Decryption Compatibility Verified**: Transparent recovery verified for storage blobs, OAuth tokens, mailbox credentials, tenant settings, and AI provider keys.
- [x] **JWT Fail-Closed Behavior Verified**: Process startup terminates immediately if `JWT_SECRET` is unset, whitespace, or shorter than 32 characters in production. Explicit `HS256` enforced.
- [x] **Dedicated Key Validation Verified**: Strict formatting and length validation enforced for all 7 cryptographic domains.
- [x] **File Upload Authorization Verified**: Anti-path traversal, route ID to storage key matching, HMAC upload token validation, and tenant session boundary checks enforced in `/uploads/:id/binary`.
- [x] **Tenant Isolation Verified**: Invariant checks ensure cross-tenant token and storage tampering fails with 403 Forbidden.
- [x] **Backend TypeScript Passes**: `npx tsc --noEmit --project server/tsconfig.json` completes with 0 errors.
- [x] **Frontend TypeScript Passes**: `npm --prefix CMS run typecheck` completes with 0 errors.
- [x] **Backend Production Build Passes**: `npm --prefix server run build` (`prisma generate && tsc`) completes with 0 errors.
- [x] **Compiled Artifacts are Consistent**: Root cause `.gitignore` exclusion resolved (`!server/dist/`); `server/dist/` contains all compiled JavaScript modules matching current TypeScript source.
- [x] **Runtime Startup Verified**: `node dist/index.js` startup verified with simulated production environment variables.
- [x] **Crypto Tests Pass**: 43/43 automated cryptographic tests passing (100%).
- [x] **Regression Tests Pass**: 40/40 calendar responsive tests (527 assertions) and 36/36 dialog tests (246 assertions) passing (100%).
- [x] **No Secrets Committed**: Working tree audited; zero `.env` files, private keys, or passwords staged.
- [x] **No Production DB Writes**: Zero migrations, zero schema modifications, zero seeds, and zero database mutations executed.
- [x] **Staging Environment Variables Documented**: Comprehensive environment matrix prepared.
- [x] **Staging Smoke Test Plan Prepared**: Step-by-step validation guide established.

---

## 2. Staging Environment Variable Configuration Matrix

Before deploying to the staging cluster, configure the following environment variables in the staging deployment environment (e.g. AWS ECS / Kubernetes Secrets / Vercel Dashboard):

| Variable Name | Staging Value Format | Minimum Length | Sample Generation Command |
|---|---|---|---|
| `NODE_ENV` | `production` | N/A | Literal `production` |
| `DATABASE_URL` | Staging DB Connection String | N/A | `mysql://...` |
| `JWT_SECRET` | 64-char Hex String | 32 chars | `crypto.randomBytes(32).toString('hex')` |
| `STORAGE_ENCRYPTION_KEY` | 64-char Hex String | 64 hex / 32 chars | `crypto.randomBytes(32).toString('hex')` |
| `FILE_SIGNING_SECRET` | 64-char Hex String | 32 chars | `crypto.randomBytes(32).toString('hex')` |
| `CONNECTOR_ENCRYPTION_KEY` | 64-char Hex String | 64 hex / 32 chars | `crypto.randomBytes(32).toString('hex')` |
| `EMAIL_CRYPTO_SECRET` | 64-char Hex String | 32 chars | `crypto.randomBytes(32).toString('hex')` |
| `SETTINGS_ENCRYPTION_KEY` | 64-char Hex String | 32 chars | `crypto.randomBytes(32).toString('hex')` |
| `AI_ENCRYPTION_KEY` | 64-char Hex String | 32 chars | `crypto.randomBytes(32).toString('hex')` |

---

## 3. Staging Smoke Test Plan

Once deployed to staging, perform the following verification steps:

### Test Step 1: Healthcheck & Startup Log Inspection
- **Action**: Check server container logs immediately upon deployment.
- **Expected Output**:
  - No `MODULE_NOT_FOUND` errors.
  - Startup passes with `validateStartupCryptoConfig()`.
  - Zero plaintext secrets or keys appear in the container logs.

### Test Step 2: Authentication & Session Token Issuance
- **Action**: Log in with staging test credentials (`/api/auth/login`).
- **Expected Output**:
  - JWT token returned with `HS256` header.
  - Successful navigation to `/me/calendar` and `/tenant/calendar`.

### Test Step 3: Historical Data Read Test (Zero-Data-Loss Verification)
- **Action**: Request existing encrypted files and previously connected email/OAuth accounts migrated from the staging database dump.
- **Expected Output**:
  - Existing files stream without decryption errors (legacy key ring resolution).
  - Existing OAuth connectors show valid connected state.

### Test Step 4: New Encryption Write Test
- **Action**: Upload a new file attachment and configure a new tenant setting.
- **Expected Output**:
  - File is encrypted on disk with the active `STORAGE_ENCRYPTION_KEY`.
  - Setting is encrypted in the database with the active `SETTINGS_ENCRYPTION_KEY`.

### Test Step 5: Upload Route Tampering & Invariant Test
- **Action**: Attempt binary upload with a mismatched `:id` in URL vs `storageKey` in payload.
- **Expected Output**: HTTP 400 Bad Request (`Route ID does not match target file identity`).

---

## 4. Final Verdict

**READY FOR STAGING VALIDATION**

All code, compiled artifacts, documentation, and test evidence have been completed, verified, and reconciled. The codebase is ready for peer code review and staged rollout in the staging environment.
