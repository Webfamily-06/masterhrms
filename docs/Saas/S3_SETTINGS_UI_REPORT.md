# MASTERHRMS — S-Track Step S3: Settings UI for Super Admin and Tenant Admin Report

- **Document ID**: `DOC-SAAS-S3-001`
- **Version**: `1.0.0`
- **Date**: `2026-10-12`
- **Status**: `COMPLETED & VERIFIED`
- **Scope**: Localhost Only (Zero VPS/DNS/Staging dependencies, zero live credentials)
- **Authoritative Plan**: `docs/Saas/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md`
- **Previous Reports**:
  - `docs/Saas/S0_FORENSIC_AUDIT_REPORT.md`
  - `docs/Saas/S1_SETTINGS_CORE_AND_REALTIME_REPORT.md`
  - `docs/Saas/S2_RUNTIME_FACTORIES_REPORT.md`

---

## 1. Executive Summary

In S-Track Step S3, we implemented and verified the unified, production-grade **Settings Interface** for both **Super Admin** (`PLATFORM` scope) and **Tenant Admin** (`TENANT` scope), backed by real database persistence via `SettingsService`, validation via `SETTINGS_REGISTRY`, and dynamic execution via the Step S1/S2 runtime factories (`RuntimeLifecycleService`, `MailerFactory`, `OAuthFactory`, `StorageFactory`, `SmsFactory`).

### Key Accomplishments
1. **Zero Mock Fallbacks**: Completely replaced the old non-persisting `useState` mock in `/tenant/settings` with the canonical `<SharedSettingsShell scope="TENANT" />`. All forms load saved settings from `GET /api/v1/settings/:scope/:group` and persist atomically to `PUT /api/v1/settings/:scope/:group`.
2. **Canonical 9-Category Shell (`SharedSettingsShell`)**: Implemented a responsive settings architecture covering *General, Branding, Communication, Authentication, Payments, Storage, Security, Integrations, and System* with strict role-based visibility and backend authorization.
3. **Secret-Field UX (`SecretField`)**: Implemented write-only masked display (`••••••••••••••••`), "Saved & Encrypted" badge, explicit "Replace" workflow, cancellation without wiping existing secrets, and zero plaintext exposure across GET payloads, browser storage, and `SettingAudit` logs.
4. **Provider Cards & Inline Connection Testing (`ProviderCard`)**: Implemented active provider cards with toggle switches, status badges, read-only copyable callback URLs, and inline **Test Connection** actions calling `POST /api/v1/settings/:scope/:group/test` backed by real S2 factory probes with latency measurements.
5. **Live Previews Dock (`LivePreviewDock`)**: Built a multi-tab preview dock (*Branding, Locale/Currency, Invoice, Email Template*) that dynamically reflects unsaved form state in real time.
6. **Realtime Synchronization**: Wired client-side Socket.io room listeners (`platform:admin` vs `tenant:${tenantId}`) for `settings.updated` events, alerting users to remote modifications without overwriting dirty form edits.
7. **Dual Razorpay Architecture Preservation**: Maintained strict isolation between Super Admin platform subscription billing (`system-platform-settings`, `PLATFORM`) and Tenant invoicing (`system-razorpay-gateway-${tenantId}`, `TENANT`).
8. **100% Automated Test Pass Rate**: Authored and passed 18/18 tests in `s3-settings-ui-and-crud.test.ts`, verified 47/47 regression tests across S1, S2, and private `/uploads` security (65/65 total tests green), verified 0 TypeScript compiler errors (`tsc --noEmit`), and achieved a clean Vite production build in 6.93s.

---

## 2. Component Architecture & UI Deliverables

### 2.1 Reusable Settings Components
All components were built following the existing MASTERHRMS design system (Tailwind CSS, Radix UI, Lucide icons, Inter typography) without emojis, duplicated headers, or non-functional mock buttons:

| Component | Path | Responsibility |
|---|---|---|
| `SharedSettingsShell` | `src/components/settings/shared-settings-shell.tsx` | Master 9-category shell with tab routing, dirty tracking, section-level Save/Cancel, sticky unsaved changes bar, and realtime socket subscription. |
| `SecretField` | `src/components/settings/secret-field.tsx` | Secure input for passwords/keys: masks saved values as `••••••••••••••••`, reveals plaintext only upon explicit "Replace" entry, and discards on cancel. |
| `ProviderCard` | `src/components/settings/provider-card.tsx` | Card container for third-party integrations (SMTP, SMS, OAuth, Razorpay, S3 Storage): includes toggle switch, status badge, copyable callback URL, and inline "Test Connection" button. |
| `LivePreviewDock` | `src/components/settings/live-preview-dock.tsx` | Interactive 4-tab preview panel (Brand identity, Locale format sample, Invoice layout, Transactional email) reflecting unsaved form state. |
| `UnsavedChangesBar` | `src/components/settings/shared-settings-shell.tsx` | Sticky floating bar appearing at the viewport bottom when `isDirty === true` with Save, Discard, and loading spinner. |

### 2.2 Re-homed and Unified Route Pages
The legacy and disconnected settings pages were consolidated to use the new canonical shell:

1. **Tenant Admin Settings (`/tenant/settings`)**:
   - File: `src/routes/_authenticated/tenant/settings.tsx`
   - Replaced dummy `useState` mock with `<SharedSettingsShell scope="TENANT" tenantId={session?.tenantId} />`.
   - Category filtering: Automatically hides platform-only OAuth apps, platform payment gateways, and system maintenance mode.
2. **HR Admin Settings (`/hr/settings`)**:
   - File: `src/routes/_authenticated/hr/settings.tsx`
   - Added canonical `Settings & Gateways (S3)` navigation item mounting `SharedSettingsShell` for tenant administration.
3. **Super Admin Platform Settings (`/super/settings`)**:
   - File: `src/routes/_authenticated/super/settings.tsx`
   - Added canonical `S3 Runtime Settings` tab mounting `<SharedSettingsShell scope="PLATFORM" />` for global SaaS control plane management.

---

## 3. Real Settings CRUD & API Mapping

Every settings category was mapped to verified backend routes backed by `SETTINGS_REGISTRY` and `RuntimeLifecycleService`:

| Settings Category | Sub-Groups / Scope | API Endpoint | Persistence Model | Runtime Consumer |
|---|---|---|---|---|
| **General & Branding** | `branding`, `locale` (PLATFORM & TENANT) | `GET /api/v1/settings/:scope/branding`<br>`PUT /api/v1/settings/:scope/branding` | `Setting` table (JSON) | `useAppConfig`, Headers, PDFs, Invoices |
| **Communication** | `email`, `messaging` (PLATFORM & TENANT) | `GET /api/v1/settings/:scope/email`<br>`PUT /api/v1/settings/:scope/email` | `Setting` + `SettingSecret` (AES-256-GCM) | `MailerFactory`, `SmsFactory` |
| **Authentication** | `oauth` (PLATFORM only) | `GET /api/v1/settings/PLATFORM/oauth`<br>`PUT /api/v1/settings/PLATFORM/oauth` | `Setting` + `SettingSecret` (AES-256-GCM) | `OAuthFactory`, Login Buttons |
| **Payments** | `payments` (PLATFORM & TENANT isolated) | `GET /api/v1/settings/:scope/payments`<br>`PUT /api/v1/settings/:scope/payments` | `Setting` + `SettingSecret` (AES-256-GCM) | Platform Checkout / Tenant Invoicing |
| **Storage** | `storage` (PLATFORM & TENANT) | `GET /api/v1/settings/:scope/storage`<br>`PUT /api/v1/settings/:scope/storage` | `Setting` + `SettingSecret` (AES-256-GCM) | `StorageFactory` (Local / S3) |
| **Security** | `security` (PLATFORM & TENANT) | `GET /api/v1/settings/:scope/security`<br>`PUT /api/v1/settings/:scope/security` | `Setting` table (JSON) | `auth.ts`, Session Middleware |
| **Integrations** | `integration` (TENANT) | `GET /api/v1/settings/TENANT/integration`<br>`PUT /api/v1/settings/TENANT/integration` | `Setting` table (JSON) | Integration Hub, Tally Importer |
| **System** | `system` (PLATFORM only) | `GET /api/v1/settings/PLATFORM/system`<br>`PUT /api/v1/settings/PLATFORM/system` | `Setting` table (JSON) | Maintenance Mode Gateways |

---

## 4. Provider Cards & Connection Test Endpoints

We implemented `POST /api/v1/settings/:scope/:group/test` in `server/src/routes/settings.routes.ts` connecting directly to the real runtime factories developed in Step S2:

1. **Email / SMTP Test (`POST /email/test`)**:
   - Executes `MailerFactory.verifyConnection(scope, scopeId)`.
   - Runs genuine SMTP socket handshake with timing verification.
   - Masks passwords in all verification telemetry.
2. **Storage Driver Test (`POST /storage/test`)**:
   - Executes `StorageFactory.testConnection(scope, scopeId)`.
   - Verifies driver accessibility (local disk write/stat or S3 bucket HEAD probe).
   - Returns provider name, status, and roundtrip latency in milliseconds.
3. **SMS Gateway Test (`POST /sms/test`)**:
   - Executes `SmsFactory.testConnection(tenantId)`.
   - Tests sandbox verification safely without sending billable carrier SMS or leaking credentials.
4. **OAuth Provider Verification (`POST /oauth/test`)**:
   - Enforces `PLATFORM` scope requirement (HTTP 403 for Tenant Admin).
   - Verifies client ID format, provider credentials, and cryptographic CSRF state token generation.
5. **Payment Gateway Test (`POST /payments/test`)**:
   - Validates Razorpay Key ID and Key Secret formats.
   - Enforces fail-closed rejection of `rzp_live_*` credentials in non-production environments (`HTTP 400`).
   - Verifies HMAC signature generation and credential structure.

---

## 5. Secret-Field UX & Zero-Leakage Masking

1. **GET Masking Contract**:
   When reading settings via `GET /api/v1/settings/:scope/:group`, secret fields stored in `SettingSecret` are never returned in plaintext. Instead, they return `{ isSecret: true, set: true }`.
2. **Frontend Masked State**:
   The `SecretField` component recognizes `{ isSecret: true, set: true }` and displays an obfuscated `••••••••••••••••` mask with an green "Saved & Encrypted" security badge.
3. **Preservation on Partial Update**:
   If an administrator saves a form without touching the secret field, the client sends `undefined` for that key. The backend updates the unsecret fields without overwriting or wiping the existing ciphertext.
4. **Zero Plaintext in Audit Logs**:
   The `SettingAudit` table writes `newValueMasked = "[MASKED SECRET]"` and `oldValueMasked = "[MASKED SECRET]"` to ensure database logs never leak credentials.

---

## 6. Empirical Verification & Test Results

### 6.1 Automated Test Suite (`s3-settings-ui-and-crud.test.ts`)
Run command: `npx vitest run server/src/tests/s3-settings-ui-and-crud.test.ts`

```
 ✓ server/src/tests/s3-settings-ui-and-crud.test.ts (18 tests) 70967ms
   ✓ S-Track Step S3: Settings UI, Real CRUD & Connection Test Endpoints (18)
     ✓ 1. Scope Authorization & RBAC Enforcement (5)
       ✓ 1.1 Super Admin can access PLATFORM scope settings (1738ms)
       ✓ 1.2 Tenant Admin is rejected with HTTP 403 when requesting PLATFORM scope (1524ms)
       ✓ 1.3 Tenant Admin cannot modify PLATFORM scope settings (1416ms)
       ✓ 1.4 Tenant Admin can read and update their own TENANT scope settings (6414ms)
       ✓ 1.5 Tenant A cannot mutate or observe Tenant B scope settings (3627ms)
     ✓ 2. Schema Validation & Atomic Persistence via RuntimeLifecycleService (3)
       ✓ 2.1 PUT validates input fields against SETTINGS_REGISTRY (rejects invalid values) (1425ms)
       ✓ 2.2 PUT rejects unknown or malicious setting keys (1702ms)
       ✓ 2.3 Successful PUT creates an immutable SettingAudit trail record (6306ms)
     ✓ 3. Secret-Field UX & Zero-Leakage Masking (3)
       ✓ 3.1 Secret field returns masked contract { isSecret: true, set: true } on GET (7484ms)
       ✓ 3.2 Partial update preserving secret does not overwrite or wipe stored secret (3544ms)
       ✓ 3.3 SettingAudit trail masks secrets and prevents plaintext log leakage (271ms)
     ✓ 4. Provider Connection Test Endpoints (Zero-Mock Backed by S2 Factories) (5)
       ✓ 4.1 POST /test for email executes real MailerFactory connection verification (4095ms)
       ✓ 4.2 POST /test for storage validates driver configuration and returns status (3928ms)
       ✓ 4.3 POST /test for sms executes test probe in sandbox mode safely (2128ms)
       ✓ 4.4 POST /test for oauth requires PLATFORM scope and verifies CSRF tokens (6844ms)
       ✓ 4.5 POST /test for payments validates key format and rejects live credentials in sandbox (8293ms)
     ✓ 5. Architectural Invariance & Safety Boundaries (2)
       ✓ 5.1 Dual Razorpay architecture remains strictly isolated (5860ms)
       ✓ 5.2 Unauthenticated requests to settings API return HTTP 401 Unauthorized (3ms)

 Test Files  1 passed (1)
      Tests  18 passed (18)
```

### 6.2 Predecessor Regression Suites
Run command: `npx vitest run server/src/tests/s1-settings-core-and-realtime-engine.test.ts server/src/tests/s2-runtime-factories-and-hot-updates.test.ts server/src/tests/security-uploads-isolation.test.ts`

```
 ✓ server/src/tests/security-uploads-isolation.test.ts (6 tests)
 ✓ server/src/tests/s1-settings-core-and-realtime-engine.test.ts (20 tests)
 ✓ server/src/tests/s2-runtime-factories-and-hot-updates.test.ts (21 tests)

 Test Files  3 passed (3)
      Tests  47 passed (47)
   Duration  34.70s
```

### 6.3 Build & Typecheck Verification
- **Backend Typecheck**: `cd server && npx tsc --noEmit` -> **Exited with code 0 (0 errors)**.
- **Frontend Production Build**: `npm run build` -> **Built in 6.93s with code 0 (0 errors)**.

---

## 7. Next Step in S-Track Roadmap

With Step S3 complete, the settings interface is fully implemented and backed by real database persistence and runtime factories.

**Next Milestone**: **Step S4: App-wide Consumption of Settings**
- Connect consumers across the application to dynamic settings resolved from `SettingsService` and `useAppConfig`:
  - Branding repaints (logos, headers, app title, accent color) across all layout shells.
  - Number, currency, and date formatters across tables, charts, payslips, and invoices.
  - Dynamic invoice prefixes, GSTIN, and company addresses in invoice rendering.
  - Dynamic social login buttons on `/auth` based on configured and tested OAuth providers.
  - Payment checkout options reflecting enabled platform and tenant gateways.
