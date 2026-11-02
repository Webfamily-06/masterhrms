# MASTERHRMS — PRODUCTION STORAGE ENCRYPTION REMEDIATION PLAN
**Repository:** `Webfamily-06/masterhrms`  
**Production Domain:** `www.masterhrms.com`  
**Target Environment:** Production (Vercel Project Settings) & Staging  
**Associated Audit Report:** [`MASTERHRMS_PRODUCTION_STORAGE_ENCRYPTION_AUDIT.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/MASTERHRMS_PRODUCTION_STORAGE_ENCRYPTION_AUDIT.md)  
**Status:** REMEDIATION SPECIFICATION — SAFE & READY FOR OPERATOR PROVISIONING

---

## 1. PURPOSE & REMEDIATION SCOPE

This remediation plan outlines the exact, safe procedure to:
1. Explain the architectural role of `STORAGE_ENCRYPTION_KEY` and distinguish advisory warnings from active failures.
2. Outline key backup, recovery, and escrow requirements before key generation.
3. Provide step-by-step guidance for platform operators to provision the key in Vercel.
4. Guarantee zero downtime, zero data loss, and zero impact on active production sessions.

> [!CAUTION]
> **PERMANENT DATA LOSS WARNING:**
> Cryptographic keys are non-recoverable if lost. Losing `STORAGE_ENCRYPTION_KEY` without a secure backup will render any files encrypted with that key permanently unrecoverable. Never generate a key without simultaneously recording it in an encrypted corporate password/secret vault.

> [!NOTE]
> **Advisory Warning vs. Encryption Failure:**
> `STORAGE_ENCRYPTION_KEY is unset in production` is an **advisory startup notice** emitted unconditionally by `validateStartupCryptoConfig()`. It does **not** indicate a server crash or a security vulnerability. If local disk storage is not utilized (e.g. cloud S3/R2 is configured or file attachments are not enabled), **do not modify production environment variables solely to silence the warning**.

---

## 2. PROVISIONING SPECIFICATIONS

### 2.1 Key Requirements
- **Key Name:** `STORAGE_ENCRYPTION_KEY`
- **Format:** 64-character hexadecimal string (representing 32 raw cryptographically secure bytes / 256 bits).
- **Entropy Requirement:** Must be generated via a cryptographically secure pseudo-random number generator (CSPRNG).
- **Target Environments:**
  - Production (Vercel Project Settings)
  - Preview / Staging (Vercel Project Settings)
- **Encryption Algorithm:** AES-256-GCM (scrypt-derived with salt `master-hrms-storage-salt-v1`).

---

## 3. KEY BACKUP & DISASTER RECOVERY POLICY

Before provisioning `STORAGE_ENCRYPTION_KEY`, the platform security team must establish:
1. **Secret Vault Escrow:** Store the generated 64-character key in an encrypted enterprise secret manager (e.g., AWS Secrets Manager, 1Password Teams, HashiCorp Vault, or Google Secret Manager).
2. **Access Control:** Restrict key visibility to authorized DevOps and Security Administrators with MFA enabled.
3. **Disaster Recovery Plan:** Document the key ID and environment association in the internal operations disaster recovery playbook.

---

## 4. STEP-BY-STEP PROVISIONING PROCEDURE

> [!IMPORTANT]
> **Safety Rule:** Production keys must be generated and applied by authorized platform operators directly in the hosting provider dashboard (e.g. Vercel / AWS). Agents and automated tools must never print or persist secret values in git or unencrypted chat logs.

### Step 1: Generate a Cryptographically Secure 256-bit Hex Key
The authorized operator should generate the key in an offline terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
*Expected output format:* A 64-character alphanumeric hexadecimal string (e.g., `a1b2c3d4e5f6...`).

### Step 2: Store Key in Enterprise Vault
Save the generated key into your enterprise secret vault under `MASTERHRMS_STORAGE_ENCRYPTION_KEY_PROD`.

### Step 3: Add to Vercel Environment Variables
1. Log in to the [Vercel Dashboard](https://vercel.com).
2. Navigate to: **Project Settings** → **Environment Variables**.
3. Click **Add New Variable**:
   - **Key:** `STORAGE_ENCRYPTION_KEY`
   - **Value:** `<PASTE_THE_64_CHAR_HEX_GENERATED_IN_STEP_1>`
   - **Environment:** Select **Production**, **Preview**, and **Development** (as appropriate).
4. Save the variable.

### Step 4: Verify Zero-Downtime Redeployment
- Redeploy the production deployment (or trigger a promotion from the verified branch).
- Inspect the runtime logs on server boot.

---

## 5. STAGING VERIFICATION & ACCEPTANCE CHECKLIST

Before promoting the configuration to production, verify the behavior in a local or staging environment:

### Test 1: Verify Startup Audit Score
Run the crypto validation check:
```bash
npx tsx -e "
import { validateStartupCryptoConfig } from './server/src/lib/crypto-config';
const res = validateStartupCryptoConfig({ checkAllServices: true });
console.log('Valid:', res.valid, 'Errors:', res.errors, 'Warnings:', res.warnings);
"
```
**Acceptance Criteria:**
- `Valid: true`
- `Errors: []`
- `Warnings: []`
- `Score: 100/100`

### Test 2: Execute Cryptographic Security Test Suite
```bash
npx tsx server/src/tests/crypto-security-hardening.test.ts
```
**Acceptance Criteria:**
- `✓ [StorageCrypto] Storage encryption round-trip with dedicated 256-bit key` PASSES.
- `✓ [ProductionEnforcement] Fails closed in production if STORAGE_ENCRYPTION_KEY is unset` PASSES.
- Total count: `43/43 PASSED`.

### Test 3: Local Storage Upload & Integrity Verification
Using an authenticated test tenant session in staging:
1. Upload a test document: `POST /api/documents/upload`
2. Download and verify integrity: `GET /api/documents/:id/verify`
3. Confirm that file is saved with `isEncrypted: true` and `encryptionAlgo: 'aes-256-gcm'`.

---

## 6. OPTIONAL: KEY ROTATION ARCHITECTURE

MasterHRMS features built-in zero-downtime key rotation via the `STORAGE_ENCRYPTION_KEY_RING` environment variable.

### Rotation Procedure:
1. When rotating the primary storage key:
   - Move the current `STORAGE_ENCRYPTION_KEY` into `STORAGE_ENCRYPTION_KEY_RING` (comma-separated if multiple historical keys exist).
   - Set the newly generated 64-char hex key as `STORAGE_ENCRYPTION_KEY`.
2. **Result:**
   - All newly uploaded files are encrypted with the new primary key.
   - All historical files remain fully readable through the rotation ring.
   - Run the included offline rotation CLI to re-encrypt old files incrementally if desired:
     ```bash
     node server/scripts/rotate_storage_keys.js
     ```

---

## 7. RISK ASSESSMENT & ROLLBACK PLAN

| Risk Category | Severity | Mitigation / Rollback |
|:---|:---|:---|
| **Impact on Core ERP / Database** | None (0%) | Core HR, Payroll, Attendance, and Auth do not read or write storage files. |
| **Impact on Existing Data** | None (0%) | `getStorageDecryptionKeys()` maintains fallback to legacy keys and `JWT_SECRET` derivations. |
| **Rollback Plan** | Trivial | If needed, removing or modifying the variable takes effect on the next cold start with zero database schema changes. |
