# MASTERHRMS — PHASE 3.1: JWT SECURITY REVIEW & FALLBACK REMEDIATION AUDIT

**Repository:** `Webfamily-06/masterhrms`  
**Execution Branch:** `fix/phase-3-calendar-responsive`  
**Base Branch:** `fix/phase-2-wave-1-responsive-foundation`  
**Date:** November 1, 2026  
**Auditor:** Antigravity Verification Engine  
**Classification:** Security Audit & Test Hardening

---

## 1. Executive Summary

During Phase 3.1, an automated security review was conducted on the test runner and backend token issuance mechanisms. 

The test runner `scripts/verify_phase3_calendar_responsive.cjs` was identified as having previously contained a fallback hardcoded development JWT secret string (`"master-hrms-jwt-super-secret-key-change-this-in-production"`). This fallback has been completely excised and replaced with a **fail-closed** environment resolver that immediately halts execution if `JWT_SECRET` is unset, empty, or unconfigured.

A deeper static audit of the backend repository uncovered **6 additional production/service files** where default fallback secret strings are used when `process.env.JWT_SECRET` is missing. This report details the implemented test runner fix, analyzes the vulnerability risk according to CWE standards, and provides immediate, non-breaking remediation recommendations.

---

## 2. Test Runner Hardening (Task B Implemented)

### 2.1. Fallback Removal & Fail-Closed Implementation
In `scripts/verify_phase3_calendar_responsive.cjs`, the previous insecure ternary fallback was replaced with a strict environment check:

```javascript
// ─── 1. ENVIRONMENT & SECURE JWT SECRET RESOLUTION (TASK B) ───
const serverEnvPath = path.join(__dirname, "../server/.env");
const rootEnvPath = path.join(__dirname, "../.env");

if (fs.existsSync(serverEnvPath)) {
  require("../server/node_modules/dotenv").config({ path: serverEnvPath });
}
if (!process.env.JWT_SECRET && fs.existsSync(rootEnvPath)) {
  require("../server/node_modules/dotenv").config({ path: rootEnvPath });
}

// Fail-closed validation: Hard-coded fallback JWT secrets are strictly prohibited
if (!process.env.JWT_SECRET || typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.trim().length === 0) {
  console.error("================================================================================");
  console.error("FATAL [Security Check]: JWT_SECRET environment variable is missing, empty, or unconfigured.");
  console.error("Halting test runner immediately: Hard-coded fallback JWT secrets are strictly prohibited.");
  console.error("Please configure JWT_SECRET in server/.env or your local test environment.");
  console.error("================================================================================");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET.trim();
```

### 2.2. Zero Secret Exposure Guarantee
- No JWT secret values, raw tokens, or private authorization headers are logged to terminal `stdout`/`stderr` or saved into test output JSON reports (`docs/Saas/screenshots/calendar-phase-3-responsive/phase-3-1/report.json`).
- Screenshots are sanitized and capture only rendered UI elements.
- Local `.env` files are verified in `.gitignore` and are not staged for commit.

---

## 3. Production Server JWT Fallback Audit

A comprehensive grep across `server/src` revealed that multiple production services default to hardcoded secret strings if `process.env.JWT_SECRET` is undefined at runtime:

### 3.1. Identified Occurrences in Production Source Code

| # | File Path | Line | Insecure Fallback String | Risk Level |
|---|---|---|---|---|
| **1** | `server/src/lib/jwt.ts` | 4 | `"master-hrms-jwt-super-secret-key-change-this-in-production"` | **CRITICAL** |
| **2** | `server/src/services/storage/local-storage.provider.ts` | 13 | `"local-storage-secret-signing-key"` | **HIGH** |
| **3** | `server/src/services/storage/local-encrypted-storage.service.ts` | 48 | `'master-hrms-default-storage-encryption-key-salt'` | **HIGH** |
| **4** | `server/src/services/storage/external-connectors.service.ts` | 20 | `"masterhrms-token-key-salt"` | **HIGH** |
| **5** | `server/src/services/files/files.service.ts` | 14 | `"masterhrms-file-download-secret-signing-key"` | **HIGH** |
| **6** | `server/src/services/email/user-email-crypto.service.ts` | 10 | `"master-hrms-default-secret-salt-key"` | **HIGH** |

### 3.2. Detailed Vulnerability Analysis

#### Finding 1: Core Session Authentication (`server/src/lib/jwt.ts`)
```typescript
// server/src/lib/jwt.ts:4
const getJwtSecret = () => process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
```
- **Vulnerability:** **CWE-798: Use of Hard-coded Credentials**
- **Impact:** If an operator deploys the application in a production environment where `JWT_SECRET` is inadvertently unset in the container environment or deployment manifest, the backend will quietly sign and verify tokens using the publicly known string. An attacker could forge arbitrarily privileged tokens (e.g., `roles: ["super_admin"]`, `tenantId: "*"`) and completely bypass authentication across all tenants.

#### Finding 2 & 5: Signed File Download URLs (`local-storage.provider.ts`, `files.service.ts`)
```typescript
// server/src/services/storage/local-storage.provider.ts:13
const SIGNED_URL_SECRET = process.env.JWT_SECRET || "local-storage-secret-signing-key";
```
- **Vulnerability:** **CWE-321: Use of Hard-coded Cryptographic Key**
- **Impact:** Signed URLs for secure file attachments and tenant documents are validated using HMAC. If the default fallback is used, any user could craft valid signatures to download private tenant payroll sheets, identity documents, and resumes.

#### Finding 3 & 4: Storage & External Connector Encryption Keys
```typescript
// server/src/services/storage/local-encrypted-storage.service.ts:48
const secret = process.env.JWT_SECRET || 'master-hrms-default-storage-encryption-key-salt';
```
- **Impact:** Encryption at rest for local storage chunks and OAuth tokens uses the JWT secret as salt. A hardcoded default compromises data confidentiality.

---

## 4. Remediation Recommendations

To resolve these vulnerabilities safely without breaking development environments, the following changes should be applied in an upcoming backend security wave:

### Recommendation 1: Fail Closed in Production Environments
In `server/src/lib/jwt.ts`, enforce a strict fail-closed check when running in production (`process.env.NODE_ENV === "production"`):

```typescript
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL [Security Configuration]: JWT_SECRET environment variable is missing in production. Server refused to start."
      );
    }
    console.warn("WARNING: Using default development JWT secret. Do not use in production.");
    return "master-hrms-jwt-super-secret-key-change-this-in-production";
  }
  return secret.trim();
};
```

### Recommendation 2: Dedicated Key Separation
Currently, `JWT_SECRET` is overloaded to perform:
1. User session token signing
2. Storage chunk encryption
3. File download URL signing
4. Email credential encryption

**Remediation:** Introduce dedicated cryptographic keys:
- `JWT_SECRET` — exclusively for API authentication tokens.
- `STORAGE_ENCRYPTION_KEY` — 256-bit key for local chunk encryption.
- `FILE_SIGNING_SECRET` — for ephemeral signed download URLs.
- `EMAIL_CRYPTO_SECRET` — for SMTP/IMAP stored password encryption.

### Recommendation 3: Startup Health Guard
In `server/src/index.ts`, add a startup sanity check that validates key entropy (e.g., minimum 32 characters, no predictable patterns) before binding the HTTP listener.

---

## 5. Conclusion

The verification test runner is now strictly secure and fail-closed. No hardcoded credentials remain in the test framework. The production backend fallback vulnerabilities are clearly identified and scheduled for remediation in the backend security enhancement phase.

