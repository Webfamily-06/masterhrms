# MasterHRMS Cryptographic Configuration & Secret Management Guide

**Document Version:** 1.0.0 (Phase 3.1.3 Critical Security Remediation)  
**Security Classification:** Confidential / Operational Reference  
**Scope:** MasterHRMS Production and Staging Environments  

---

## 1. Overview & Architectural Principles

MasterHRMS enforces strict cryptographic domain separation, zero-data-loss backward compatibility, and fail-closed runtime security across all storage, authentication, and integration microservices.

### Core Architectural Security Principles:
1. **Domain Isolation**: Distinct cryptographic keys are mandatory for each security boundary. Reusing `JWT_SECRET` for file encryption, OAuth token storage, or HMAC URL signing is strictly prohibited in production.
2. **Fail-Closed Execution**: If a required cryptographic secret is missing, empty, or fails entropy validation (minimum 32 characters or 64 hex characters), the relevant service refuses to perform encryption or start.
3. **Decoupled Legacy Decryption**: To prevent data loss during key rotation or migrations, encryption paths always use the active configured key, while decryption paths support registered historical candidate keys.
4. **Timing Attack Resistance**: All cryptographic comparisons (HMAC signatures, upload tokens, webhook hashes) use constant-time comparison algorithms (`crypto.timingSafeEqual`) to prevent side-channel timing leaks.
5. **Secret Sanitization**: Error messages, logging frameworks, and startup diagnostic reports must never echo, log, or leak secret values or plaintext encryption keys.

---

## 2. Key Inventory & Requirements Matrix

| Environment Variable | Cryptographic Purpose | Required Condition | Format & Entropy | Algorithm / KDF |
|---|---|---|---|---|
| `JWT_SECRET` | User session JWT & MFA challenge signing | Always (Mandatory for server startup) | High-entropy string, minimum 32 characters | HMAC-SHA256 (HS256) |
| `STORAGE_ENCRYPTION_KEY` | Local encrypted file storage at rest | Mandatory if local encrypted storage provider is enabled | 64-char Hex (32 bytes raw) or >= 32-char passphrase | AES-256-GCM |
| `FILE_SIGNING_SECRET` | HMAC signature for secure file download & upload URLs | Mandatory if signed local storage routes are active | High-entropy string, minimum 32 characters | HMAC-SHA256 |
| `CONNECTOR_ENCRYPTION_KEY` | OAuth tokens & external connector credentials | Mandatory if external OAuth connectors are used | 64-char Hex (32 bytes raw) or >= 32-char passphrase | AES-256-GCM |
| `EMAIL_CRYPTO_SECRET` | User SMTP/IMAP mailbox passwords at rest | Mandatory if personal email integrations are enabled | High-entropy string, minimum 32 characters | AES-256-GCM |
| `SETTINGS_ENCRYPTION_KEY` | Tenant configuration & payment gateway secrets | Mandatory if encrypted tenant/system settings are stored | High-entropy string, minimum 32 characters | AES-256-GCM |
| `AI_ENCRYPTION_KEY` | Provider API keys (OpenAI, Anthropic, Gemini) | Mandatory if AI Assistant module is enabled | High-entropy string, minimum 32 characters | AES-256-GCM |

---

## 3. Detailed Specification by Cryptographic Domain

### 3.1 `JWT_SECRET`
- **Purpose**: Signs user authentication tokens, tenant claims, and time-limited 2FA/MFA challenge tokens.
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**:
  - In production (`NODE_ENV === "production"`): Refuses to start if missing, whitespace-only, or length < 32 characters.
  - Development fallback: `dev-only-insecure-jwt-secret-for-testing-only-change-me` (strictly disallowed in production).
- **Algorithm**: Enforces explicit `{ algorithm: "HS256" }` on token creation and `{ algorithms: ["HS256"] }` on token verification to prevent algorithm confusion attacks (`"none"` or asymmetric public-key injection).
- **Rotation Strategy**: Rolling dual-key verification or controlled user re-authentication. Rotating `JWT_SECRET` invalidates all active user sessions without data loss.

### 3.2 `STORAGE_ENCRYPTION_KEY`
- **Purpose**: Encrypts files, document attachments, and chat media stored on disk via `LocalEncryptedStorageService`.
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**: Accepts either a 64-character hexadecimal string (parsed directly into a 32-byte binary key) or a minimum 32-character string derived using `scrypt` with a dedicated salt (`masterhrms-storage-kdf-salt-v1`).
- **Legacy Compatibility**: Reads existing encrypted files using legacy candidate keys (including historical `scrypt` derivations and candidate fallbacks).
- **Failure Behavior**: When absent in production, new write operations fail closed with `CryptoConfigurationError`. Decryption operations attempt legacy candidate recovery.

### 3.3 `FILE_SIGNING_SECRET`
- **Purpose**: Signs pre-authenticated file download URLs and upload tokens with expirations, preventing URL tampering and tenant path traversal.
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**: In production, requires a dedicated string of at least 32 characters.
- **Legacy Compatibility**: Maintains a legacy candidate list (including historical fallback derivations) during rolling deployments so in-flight download URLs issued right before key configuration remain valid until their natural expiration.
- **Failure Behavior**: Rejects URL signing and verification if unconfigured in production.

### 3.4 `CONNECTOR_ENCRYPTION_KEY`
- **Purpose**: Secures third-party OAuth access/refresh tokens (Google Workspace, Microsoft 365, Slack, GitHub) at rest.
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**: Minimum 32-character passphrase or 64-character hex key.
- **Legacy Compatibility**: Automatically falls back to historical scrypt derivations for existing database records (`ExternalConnectorCredentials`).
- **Failure Behavior**: Throws an unhandled configuration error on token encryption if absent in production.

### 3.5 `EMAIL_CRYPTO_SECRET`
- **Purpose**: Encrypts personal mailbox passwords, custom SMTP credentials, and IMAP authentication data.
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**: Minimum 32 characters.
- **Legacy Compatibility**: Decryption attempts the dedicated key first, then falls back to legacy candidate keys with historical salts.
- **Failure Behavior**: Throws `CryptoConfigurationError` when trying to save new email accounts if unconfigured.

### 3.6 `SETTINGS_ENCRYPTION_KEY`
- **Purpose**: Encrypts sensitive tenant configuration entries (e.g. Stripe webhook secrets, payment gateway keys, custom integration credentials).
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**: Minimum 32 characters.
- **Legacy Compatibility**: Supports candidate decryption for previously stored tenant settings.
- **Failure Behavior**: Tenant settings updates fail closed if absent.

### 3.7 `AI_ENCRYPTION_KEY`
- **Purpose**: Encrypts organizational and personal AI API keys (OpenAI, Anthropic, Gemini, DeepSeek) at rest.
- **Generation**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Validation**: Minimum 32 characters.
- **Legacy Compatibility**: Supports legacy candidate keys for decrypting previously configured AI keys.
- **Failure Behavior**: AI provider setup fails closed if absent.

---

## 4. Secure Key Generation & Provisioning

Production administrators must generate cryptographically strong pseudo-random keys and inject them via secure hosting provider environment dashboards (e.g., AWS Secrets Manager, Vercel Environment Variables, Kubernetes Secrets, or Docker Compose secret mounts).

### Recommended Key Generation Script (Bash + Node.js)
```bash
#!/usr/bin/env bash
# Generate high-entropy secrets for MasterHRMS
echo "JWT_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
echo "STORAGE_ENCRYPTION_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
echo "FILE_SIGNING_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
echo "CONNECTOR_ENCRYPTION_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
echo "EMAIL_CRYPTO_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
echo "SETTINGS_ENCRYPTION_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
echo "AI_ENCRYPTION_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
```

> [!CAUTION]
> Never commit `.env` or production secrets to source control. Never embed raw cryptographic keys in application source code or build Docker images containing production keys.

---

## 5. Key Rotation & Zero-Data-Loss Migration Policy

When rotating any encryption key:
1. **Pre-flight**: Keep the existing key active and deploy the new key as the active key while ensuring the old key is placed in the legacy candidate array.
2. **Re-encryption**: Use the offline re-encryption script (`scripts/reencrypt_production_records.ts`) to read records with candidate keys and re-write them with the active key.
3. **Deprecation**: Once all database records and stored files have been re-encrypted with the new key, remove the old key from the legacy candidate list.

---

## 6. Startup Validation Behavior

During startup (`server/dist/index.js` or `server/src/index.ts`):
1. `validateStartupCryptoConfig()` is invoked.
2. It performs strict validation of `JWT_SECRET`. If invalid or absent, the process terminates immediately with an exit code of 1.
3. For optional services (`STORAGE_ENCRYPTION_KEY`, `FILE_SIGNING_SECRET`, etc.), it logs informative configuration warnings if they are unset, allowing the server to boot for unrelated features (e.g., HR, attendance, payroll) while guaranteeing that attempting to use those specific services will fail closed securely.

