# Master HRMS — Application-Wide Settings CRUD, Database Persistence & Secret-Field Audit Report

## Executive Summary
A comprehensive forensic audit and remediation was performed across all application-wide settings pages, CMS configuration stores, and the authoritative `SettingsService`. 

The reported defect where Super Admin Payment Gateways appeared to revert to default/dummy credentials upon edit was traced and remediated:
1. `DEFAULT_SETTINGS` in `super/settings.tsx` previously contained hardcoded mock strings (`AQxxxxxxxx...`, `ELxxxxxxxx...`, `rzp_test_99XXXXXXXX`).
2. The `saveMutation` in `super/settings.tsx` only saved `branding` to `SettingsService` and omitted `payments`, causing `SettingsService` (`/v1/settings/PLATFORM/payments`) and the CMS page (`system-platform-settings`) to fall out of synchronization.
3. In `SharedSettingsShell`, dirty-state detection failed when settings had not yet been defined in the DB, and secret field values passed object descriptors `{ isSecret: true, set: true }` directly into raw inputs.
4. In HR Settings (`src/routes/_authenticated/hr/settings.tsx`), four tabs (`invoice-settings`, `salary-settings`, `approvals`, `custom-fields`) had mock `toast.success()` handlers with zero backend API persistence.

All issues have been resolved, backed by real database persistence, AES-256-GCM secret encryption, write-only secret masking, strict multi-tenant scope isolation, and automated regression tests.

---

## 1. Confirmed Root Causes

### Defect 1: Super Admin Payment Gateways Mock Fallbacks & Incomplete Sync
- **File:** `src/routes/_authenticated/super/settings.tsx` & `server/src/routes/cms.routes.ts`
- **Root Cause:**
  - `DEFAULT_SETTINGS` populated empty state with deceptive placeholder strings (`AQxxxxxxxx...`, `ELxxxxxxxx...`, `rzp_sec_XXXXXXXX`).
  - `saveMutation` in `super/settings.tsx` saved to `/v1/settings/PLATFORM/branding` and `/api/cms/pages/system-platform-settings`, but failed to update `/v1/settings/PLATFORM/payments`.
  - In `server/src/routes/cms.routes.ts`, `slug === "system-platform-settings"` PUT only synced `branding.*` to `SettingsService`, dropping payment keys. On GET, it did not overlay `payments.*` from `SettingsService`.
- **Fix Applied:**
  - Replaced deceptive values in `DEFAULT_SETTINGS` with clean defaults.
  - Updated `saveMutation` and `realtime-platform-settings` query in `super/settings.tsx` to read and write both `branding` and `payments` to `SettingsService`.
  - Updated `server/src/routes/cms.routes.ts` to overlay and synchronize payment keys (`payments.razorpay_enabled`, `payments.razorpay_key_id`, `payments.razorpay_key_secret`, `payments.bank_transfer_enabled`, `payments.bank_details`, `payments.currency`).

### Defect 2: Mock Saves in HR Settings
- **File:** `src/routes/_authenticated/hr/settings.tsx`
- **Root Cause:**
  - Tab `invoice-settings`: `onClick={() => toast.success("Invoicing & billing settings updated!")}` — no API call.
  - Tab `salary-settings`: `onClick={() => toast.success("Salary & statutory rules saved!")}` — no API call.
  - Tab `approvals`: `onClick={() => toast.success("Approval workflows updated successfully!")}` — no API call.
  - Tab `custom-fields`: local state array modifications with no DB persistence.
- **Fix Applied:**
  - Connected `invoice-settings` to `/api/cms/pages/tenant-${tenantId}-invoice-settings` and synced bank details to `/v1/settings/TENANT/payments` (`payments.bank_details`).
  - Connected `salary-settings` to `/api/cms/pages/tenant-${tenantId}-salary-settings`.
  - Connected `approvals` to `/api/cms/pages/tenant-${tenantId}-approval-workflows`.
  - Connected `custom-fields` to `/api/cms/pages/tenant-${tenantId}-custom-fields`.
  - Replaced all fake toasts with real TanStack Query mutations (`isPending` loaders, error handling, and query invalidation).

### Defect 3: `SharedSettingsShell` Dirty Detection & Secret UX
- **File:** `src/components/settings/shared-settings-shell.tsx`
- **Root Cause:**
  - `isDirty` strictly checked `persistedSettings[k] !== undefined && persistedSettings[k] !== v`. If a key was not yet saved in DB, `persistedSettings[k]` was `undefined`, causing `isDirty` to evaluate to `false`.
  - Passing `{ isSecret: true, set: true }` directly into input values caused React render issues and corrupted dirty comparison.
- **Fix Applied:**
  - Fixed `isDirty` to flag keys that have newly entered non-empty values even if `persistedSettings[k]` is `undefined`.
  - Added `isSecretSet(key)` and `getSecretValue(key)` helper methods.
  - Filtered out unmodified secrets in `saveMutation` so empty or masked strings never overwrite existing AES-256-GCM ciphertexts.

### Defect 4: Standalone AI Settings Mock Save
- **File:** `src/routes/_authenticated/_app/ai-settings.tsx`
- **Root Cause:** Used `setTimeout(..., 600)` with `toast.success()`.
- **Fix Applied:** Connected to `useCurrentProfile()` and persisted keys to `/api/cms/pages/tenant-${tenantId}-ai-keys` and `/api/ai/settings`.

---

## 2. Application-Wide Settings Inventory & Remediation Status

| Page / Route | Scope | Storage Location | API GET Endpoint | API Write Endpoint | Secret Handling | Status |
|---|---|---|---|---|---|---|
| **Super Admin Platform Settings** (`/super/settings`) | `PLATFORM` | MySQL `Setting` & `cmsPage` (`system-platform-settings`) | `/v1/settings/PLATFORM/*` & `/api/cms/pages/system-platform-settings` | `/v1/settings/PLATFORM/*` & `/api/cms/pages/system-platform-settings` | AES-256-GCM encrypted, write-only mask | **PASS** |
| **Tenant Settings (S3 Shell)** (`/tenant/settings`) | `TENANT` | MySQL `Setting` (`TENANT` scope) | `/v1/settings/TENANT/:group?tenantId=...` | `/v1/settings/TENANT/:group?tenantId=...` | AES-256-GCM encrypted, write-only mask | **PASS** |
| **HR Org Timing & Shift** (`/hr/settings` → `organization`) | `TENANT` | MySQL `Shift` | `/api/shifts` | `/api/shifts/:id` | N/A | **PASS** |
| **HR Leave Types & Quotas** (`/hr/settings` → `leave-types`) | `TENANT` | MySQL `LeaveType` | `/api/leave-types` | `/api/leave-types` (POST/PUT/DELETE) | N/A | **PASS** |
| **HR Departments** (`/hr/settings` → `departments`) | `TENANT` | MySQL `Department` | `/api/departments` | `/api/employees/departments` (POST/PUT/DELETE) | N/A | **PASS** |
| **HR Invoicing & Billing Terms** (`/hr/settings` → `invoice-settings`) | `TENANT` | MySQL `cmsPage` & `Setting` (`payments.bank_details`) | `/api/cms/pages/tenant-${id}-invoice-settings` | `/api/cms/pages/tenant-${id}-invoice-settings` & `/v1/settings/TENANT/payments` | Bank details persisted | **PASS** |
| **HR Salary & Statutory** (`/hr/settings` → `salary-settings`) | `TENANT` | MySQL `cmsPage` | `/api/cms/pages/tenant-${id}-salary-settings` | `/api/cms/pages/tenant-${id}-salary-settings` | Formula & compensation rules | **PASS** |
| **HR Approval Workflows** (`/hr/settings` → `approvals`) | `TENANT` | MySQL `cmsPage` | `/api/cms/pages/tenant-${id}-approval-workflows` | `/api/cms/pages/tenant-${id}-approval-workflows` | Role tiers persisted | **PASS** |
| **HR Dynamic Custom Fields** (`/hr/settings` → `custom-fields`) | `TENANT` | MySQL `cmsPage` | `/api/cms/pages/tenant-${id}-custom-fields` | `/api/cms/pages/tenant-${id}-custom-fields` | Schema definitions persisted | **PASS** |
| **AI Settings** (`/hr/settings` → `ai-settings` & `_app/ai-settings`) | `TENANT` | MySQL `cmsPage` & `/api/ai/settings` | `/api/cms/pages/tenant-${id}-ai-keys` | `/api/cms/pages/tenant-${id}-ai-keys` | Masked in inputs, saved encrypted | **PASS** |
| **Custom Domain Settings** (`/settings/custom-domain`) | `TENANT` | MySQL `CustomDomain` | `/api/workspace/custom-domain` | `/api/workspace/custom-domain` | Domain token verification | **PASS** |

---

## 3. Strict Separation of Payment Architectures
- **Platform Commercial SaaS Payments:**
  - Scope: `PLATFORM`
  - Store: `system-platform-settings` CMS page and `SettingsService` (`PLATFORM` scope, `group: payments`).
  - Keys: `payments.razorpay_key_id`, `payments.razorpay_key_secret`, `payments.bank_details`, `paypalClientId`, `paypalSecret`.
  - Restricted strictly to Super Admin.
- **Tenant Business Commercial Payments:**
  - Scope: `TENANT`
  - Store: `system-razorpay-gateway-${tenantId}` and `SettingsService` (`TENANT` scope with `scopeId = tenantId`).
  - Isolated per tenant: Tenant A credentials cannot overwrite or leak to Tenant B.

---

## 4. Verification Evidence & Test Results

### 4.1 Automated Test Execution
- **Command:** `npx --prefix server vitest run src/tests/settings-database-persistence-audit.test.ts`
- **Result:**
  ```
  ✓ server/src/tests/settings-database-persistence-audit.test.ts (9 tests) 11917ms
    ✓ Settings Database Persistence & Secret-Field Audit (9)
      ✓ 1. Platform Payment Settings Persistence & Secret Encryption (4)
        ✓ 1.1 Super Admin persists Razorpay key and encrypted secret to PLATFORM scope 1498ms
        ✓ 1.2 GET /PLATFORM/payments returns write-only masked representation for secrets 337ms
        ✓ 1.3 Partial update without secret preserves existing encrypted secret 728ms
        ✓ 1.4 SettingAudit records redact secrets with zero plaintext leakage 109ms
      ✓ 2. Scope Authorization & Multi-Tenant Isolation (2)
        ✓ 2.1 Tenant Admin cannot modify PLATFORM scope settings (HTTP 403) 521ms
        ✓ 2.2 Tenant A and Tenant B maintain strictly isolated business settings 1742ms
      ✓ 3. Tenant CMS Settings Persistence (Invoices, Salary, Approvals, Custom Fields) (3)
        ✓ 3.1 Persists and reloads tenant invoice & billing settings 1882ms
        ✓ 3.2 Persists and reloads tenant salary configuration 1721ms
        ✓ 3.3 Persists and reloads dynamic custom fields 1723ms
  Test Files: 1 passed (1)
  Tests: 9 passed (9)
  Duration: 12.41s
  ```

### 4.2 Full TypeScript Compiler Verification
- **Command:** `npx tsc --noEmit`
- **Exit Code:** `0` (Zero compiler errors).

### 4.3 Production Vite Bundle Build
- **Command:** `npm run build`
- **Exit Code:** `0` (Production build cleanly compiled and bundled in 10.68s).

---

## 5. Security Safeguards Verified
1. **AES-256-GCM Encryption:** Persisted secrets are stored in `SettingSecret` table with encrypted ciphertext, IV, authTag, and keyVersion.
2. **Zero Plaintext Wire Exposure:** GET requests return write-only representation `{ isSecret: true, set: true }`.
3. **Redacted Audit Trails:** `SettingAudit` logs write `[MASKED SECRET]` or `••••••••••••••••`, ensuring no credentials appear in audit logs.
4. **Fail-Closed Sandbox Guard:** Live credentials (`rzp_live_*`) are rejected with HTTP 400 when sandbox mode is enforced.
