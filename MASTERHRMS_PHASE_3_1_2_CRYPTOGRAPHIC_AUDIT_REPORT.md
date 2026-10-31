# MASTERHRMS — PHASE 3.1.2 COMPLETE CRYPTOGRAPHIC SECRET AUDIT REPORT

**Repository:** `Webfamily-06/masterhrms`  
**Execution Branch:** `fix/phase-3-1-2-security-hardening`  
**Base Branch:** `fix/phase-2-wave-1-responsive-foundation`  
**Audit Scope:** Full backend repository (`server/`) search for hardcoded secrets, predictable salts, fallback signing keys, and crypto usage.  
**Date:** November 1, 2026  
**Status:** AUDIT COMPLETED & REMEDIATED

---

## 1. Executive Summary

A comprehensive, deep static analysis of `server/src/` was conducted to identify all occurrences of hardcoded cryptographic keys, default fallback secrets, weak salts, and missing authorization checks.

Beyond the six initial concern locations identified in Phase 3.1, three additional cryptographic vulnerabilities were discovered:
1. `server/src/services/settings/settings.service.ts`: Hardcoded fallback key for system and tenant settings AES-256-GCM encryption.
2. `server/src/services/ai-assistant.service.ts`: Hardcoded fallback key for AI provider API key AES-256-CBC encryption.
3. `server/src/routes/files.routes.ts`: `PUT /uploads/:id/binary` lacked verification of the HMAC upload authorization token generated during `initiateUpload`.

All nine findings have been systematically remediated with centralized key management, fail-closed production guards, constant-time equality comparisons, and transparent legacy fallback decryption rings.

---

## 2. Complete Inventory of Cryptographic Findings

| # | Location (File & Line) | Purpose | Cryptographic Algorithm | Data Protected | Impact if Compromised | Potential Prior Usage | Remediation Approach | Backward Compatibility Guarantee |
|---|---|---|---|---|---|---|---|---|
| **1** | `server/src/lib/jwt.ts:4` | Primary API authentication & MFA token signing | HMAC-SHA256 (JWT) | User authentication sessions, RBAC claims, MFA tokens | Critical (Complete account takeover & privilege escalation) | Potential in unconfigured environments | Centralized fail-closed validation via `getJwtSecret()`; production requires non-empty secret $\ge$ 32 chars | 100% compatible: existing token signatures & payloads unaltered |
| **2** | `server/src/services/storage/local-storage.provider.ts:13` | Upload & Stream URL signatures | HMAC-SHA256 | Local file uploads, download streams, and inline previews | High (Unauthorized file access & forged binary uploads) | Potential in dev/test | Replaced with `getFileSigningSecret()` and `timingSafeEqualHex`; added `verifyUploadToken` | In-flight URLs supported via legacy secret ring |
| **3** | `server/src/services/storage/local-encrypted-storage.service.ts:48` | Disk storage file encryption | AES-256-GCM (scrypt 32-byte key) | Stored sensitive tenant documents and attachments | High (Decryption of at-rest document files on disk) | High (if custom key was unset) | Replaced with `getStorageEncryptionKeys()`; active key prioritized | Key ring automatically appends legacy scrypt keys for seamless decryption |
| **4** | `server/src/services/storage/external-connectors.service.ts:18` | Cloud OAuth token encryption (GDrive, OneDrive, Dropbox) | AES-256-GCM | External cloud storage OAuth access and refresh tokens | High (Unauthorized access to integrated third-party cloud drives) | High in development | Dedicated `CONNECTOR_ENCRYPTION_KEY` support with `getConnectorEncryptionKeys()` | Multi-key decryption fallback tries active key then legacy scrypt keys |
| **5** | `server/src/services/files/files.service.ts:14` | Signed URL secret reference | HMAC-SHA256 | Signed file downloads | Medium (Unused local reference; delegated to provider) | None (delegated) | Updated to import `getFileSigningSecret()` | Fully aligned with storage provider |
| **6** | `server/src/services/email/user-email-crypto.service.ts:9` | Personal user email credentials encryption | AES-256-GCM (scrypt 32-byte key) | User SMTP/IMAP passwords | High (Compromise of employee personal/work email mailboxes) | High in dev | Dedicated `EMAIL_CRYPTO_SECRET` support with `getEmailCryptoKeys()` | Multi-key decryption fallback tries active key then legacy scrypt keys |
| **7** | `server/src/services/settings/settings.service.ts:24` | System & tenant settings secret encryption | AES-256-GCM (scrypt 32-byte key) | Payment gateway API keys, webhook secrets, OAuth client secrets, SMS API keys | Critical (Compromise of platform and tenant payment/SMS credentials) | High in dev | Dedicated `SETTINGS_ENCRYPTION_KEY` with `getSettingsEncryptionKeys()` | Multi-key decryption fallback tries active key then legacy scrypt keys |
| **8** | `server/src/services/ai-assistant.service.ts:233` | Tenant AI provider credentials | AES-256-CBC (SHA256 key) | OpenAI, Anthropic, Gemini API keys | High (Unauthorized consumption of tenant AI billing quotas) | High in dev | Dedicated `AI_ENCRYPTION_KEY` support with `getAiEncryptionKeys()` | Multi-key decryption fallback tries active key then legacy key |
| **9** | `server/src/routes/files.routes.ts:423` | Direct binary upload verification | HMAC-SHA256 | Uploaded physical binary files | High (Tampered file writes to local disk storage) | Exploitable if direct route hit | Added `storageProvider.verifyUploadToken(key, exp, token)` using constant-time comparison | Legitimate uploads with valid token succeed; unauthorized rejected |

---

## 3. CWE Risk Classifications

- **CWE-798: Use of Hard-coded Credentials**
  - Remediated in `server/src/lib/jwt.ts`, `settings.service.ts`, `user-email-crypto.service.ts`, `ai-assistant.service.ts`, `external-connectors.service.ts`, `local-storage.provider.ts`.
- **CWE-321: Use of Hard-coded Cryptographic Key**
  - Remediated by decoupling keys into discrete environment variables with fail-closed production guards.
- **CWE-208: Observable Timing Discrepancy**
  - Remediated in signed URL and token verification by implementing `timingSafeEqualHex` and `timingSafeEqualString` with defensive length checks.
- **CWE-306: Missing Authentication for Critical Function**
  - Remediated in `server/src/routes/files.routes.ts` `/uploads/:id/binary` by enforcing upload token validation.

---

## 4. Key Derivation & Algorithm Verification

```
┌──────────────────────────┬───────────────────────┬────────────────────────────────┬──────────────────────────────┐
│ Cryptographic Service    │ Algorithm             │ Key Derivation Mechanism       │ Salt Specification           │
├──────────────────────────┼───────────────────────┼────────────────────────────────┼──────────────────────────────┤
│ JWT Authentication       │ HS256 (HMAC-SHA256)   │ Direct UTF-8 secret string     │ N/A (Standard JWT)           │
│ Storage File Encryption  │ AES-256-GCM           │ scrypt (N=16384, r=8, p=1, 32) │ master-hrms-storage-salt-v1  │
│ Signed File URLs         │ HMAC-SHA256           │ Direct UTF-8 secret string     │ N/A (HMAC)                   │
│ External Connectors      │ AES-256-GCM           │ scrypt (N=16384, r=8, p=1, 32) │ master-hrms-connector-salt-v1│
│ User Email Credentials   │ AES-256-GCM           │ scrypt (N=16384, r=8, p=1, 32) │ master-hrms-user-email-salt-v1│
│ Settings Secrets         │ AES-256-GCM           │ scrypt (N=16384, r=8, p=1, 32) │ master-hrms-settings-salt-v1 │
│ AI Provider Secrets      │ AES-256-CBC           │ SHA-256 hash digest            │ N/A                          │
└──────────────────────────┴───────────────────────┴────────────────────────────────┴──────────────────────────────┘
```

---

## 5. Backward Compatibility & Migration Assessment

To prevent service disruption or data loss for existing deployments:
1. **Zero Session Disruption:** The signing algorithm (HS256) and payload structure are untouched. Existing production deployments configured with `JWT_SECRET` continue verifying active user tokens without re-login.
2. **Multi-Key Decryption Fallback:** When decrypting stored settings, OAuth tokens, or email passwords, the active dedicated key is attempted first. If authentication fails, the legacy key (derived from `JWT_SECRET` or the legacy string) is automatically attempted. If successful, the plaintext is returned cleanly.
3. **Key Rotation Ring:** Local disk storage files can be rotated incrementally using `STORAGE_ENCRYPTION_KEY_RING` without bulk re-encryption downtime.
