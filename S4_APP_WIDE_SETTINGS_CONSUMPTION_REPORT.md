# MASTERHRMS — S-Track Step S4: App-wide Consumption of Persisted Settings Report

- **Document ID**: `DOC-SAAS-S4-001`
- **Version**: `1.0.0`
- **Date**: `2026-10-12`
- **Status**: `COMPLETED & VERIFIED`
- **Scope**: Localhost Only (Zero VPS/DNS/Staging dependencies, zero live credentials)
- **Authoritative Plan**: `docs/Saas/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md`
- **Previous Reports**:
  - `docs/Saas/S0_FORENSIC_AUDIT_REPORT.md`
  - `docs/Saas/S1_SETTINGS_CORE_AND_REALTIME_REPORT.md`
  - `docs/Saas/S2_RUNTIME_FACTORIES_REPORT.md`
  - `docs/Saas/S3_SETTINGS_UI_REPORT.md`

---

## 1. Executive Summary

In S-Track Step S4, we connected every in-scope frontend and backend application consumer to real persisted platform and tenant settings via `SettingsService`, `useAppConfig`, and the Step S2 runtime factories (`MailerFactory`, `OAuthFactory`, `StorageFactory`, `SmsFactory`). Hardcoded configuration and dummy fallbacks were eliminated without breaking bootstrap configuration, security controls, or multi-tenant isolation.

### Key Accomplishments
1. **Dynamic Public App Configuration**: Connected `useAppConfig` and `GET /api/v1/public/app-config` with real persisted platform and tenant identity settings. Platform branding, dynamic page title, logos, favicon link, and primary accent theme variables (`--primary`, `--ring`, `--sidebar-primary`) update without server restarts.
2. **Dynamic Social Login Button Grid**: Extended `GET /api/auth/oauth/config` and `/auth` page to dynamically discover enabled OAuth providers (Google, GitHub, Microsoft, Apple, LinkedIn, Facebook). When Super Admin configures and enables an OAuth provider in S3 settings, its login button immediately appears on the login screen; when disabled, it disappears. Client secrets remain strictly server-side.
3. **Emergency Maintenance Mode Consumer**: Connected `system.maintenance_mode` and `system.maintenance_message` from `SettingsService` into Express `maintenanceMiddleware` and public app-config. When Super Admin enables emergency maintenance mode, regular traffic is rejected with `HTTP 503 Service Unavailable`, public health and app-config endpoints remain accessible, a persistent banner renders across all client routes, and authorized Super Admins bypass maintenance mode seamlessly.
4. **Global Dynamic Currency & Locale Formatting**: Enhanced `src/lib/currency.ts` and `useAppConfig` so that over 300 call sites across the frontend calling `formatSystemAmount(amount)` automatically format amounts according to the active tenant/platform persisted currency (`locale.default_currency`, `locale.currency_symbol`), eliminating hardcoded `"USD"` or `"INR"` defaults while maintaining safe initial bootstrap fallbacks.
5. **Runtime Storage Driver Consumption**: Connected `server/src/routes/documents.routes.ts` and `server/src/routes/expenses.routes.ts` to `StorageFactory.getDriver("TENANT", tenantId)`. File uploads, downloads, and OCR streaming now dynamically resolve the tenant's active storage driver (local encrypted repository vs cloud S3) while maintaining fail-closed safety and strict private-document authorization.
6. **Architectural Invariance Preserved**:
   - Private document authorization (`/uploads` security guard) remains fully enforced (HTTP 401 unauthenticated, HTTP 403 cross-tenant).
   - Dual Razorpay architecture remains strictly isolated: platform subscription billing and tenant invoicing maintain independent keys, scopes, and webhook listeners.
7. **100% Automated Test Pass Rate**: Authored and passed 14/14 tests in `s4-app-wide-consumption.test.ts`. Verified 73/73 tests across all four S-Track test suites (S1: 20/20, S2: 21/21, S3: 18/18, S4: 14/14), verified `security-uploads-isolation.test.ts` (6/6), verified 0 TypeScript compiler errors (`tsc --noEmit`), and achieved a clean Vite production build in 6.59s.

---

## 2. Configuration Inventory and Classification

An inventory of frontend and backend configuration consumers was conducted to classify all settings, environment variables, and constants:

| Finding / Consumer | Location | Classification | Rationale & Status |
|---|---|---|---|
| `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `PORT` | `server/.env` | **Bootstrap-Critical Environment Configuration** | Essential for server startup, database connection, token signing, and encryption. Preserved in `.env`. |
| `branding.app_name`, `branding.primary_color`, `branding.footer_text` | `SettingsService` (`PLATFORM` & `TENANT`) | **Platform & Tenant-Scoped Persisted Setting** | Consumed dynamically by `GET /api/v1/public/app-config` and `useAppConfig`. Updates reflect immediately. |
| `locale.default_currency`, `locale.currency_symbol`, `locale.date_format` | `SettingsService` (`PLATFORM` & `TENANT`) | **Platform & Tenant-Scoped Persisted Setting** | Consumed dynamically by `formatSystemAmount` and `useAppConfig`. Updates reflect immediately. |
| `oauth.*` (Google, GitHub, Microsoft, Apple, LinkedIn, Facebook) | `SettingsService` (`PLATFORM`) | **Platform-Scoped Persisted Setting** | Consumed by `OAuthFactory` and `GET /api/auth/oauth/config`. Controls login button visibility. |
| `system.maintenance_mode`, `system.maintenance_message` | `SettingsService` (`PLATFORM`) | **Platform-Scoped Persisted Setting** | Consumed by `maintenanceMiddleware` and `app-config`. Enforces HTTP 503 and banner display. |
| `storage.provider`, `storage.s3_*` | `SettingsService` (`PLATFORM` & `TENANT`) | **Platform & Tenant-Scoped Persisted Setting** | Consumed dynamically by `StorageFactory.getDriver`. Enforces driver isolation per tenant. |
| `email.smtp_*`, `email.from_*` | `SettingsService` (`PLATFORM` & `TENANT`) | **Platform & Tenant-Scoped Persisted Setting** | Consumed dynamically by `MailerFactory.resolveSettings` and `email.ts`. |
| `messaging.gateway.config` | `SettingsService` (`TENANT`) | **Tenant-Scoped Persisted Setting** | Consumed by `SmsFactory` and `MessagingGatewayService`. |
| `DEFAULT_APP_CONFIG`, `DEFAULT_CURRENCY_SETTINGS` | `src/lib/useAppConfig.ts`, `src/lib/currency.ts` | **Legitimate Safe Bootstrap Default** | Fallback structure while network requests resolve or in disconnected offline modes. Never conceals server errors. |
| Hardcoded 2-provider button grid (`Google`, `Apple`) | `src/routes/auth.tsx` | **Confirmed Unwanted Hardcoded Runtime Dependency** | **ELIMINATED**. Replaced with dynamic `enabledProviders` grid mapping active OAuth providers. |
| Static `storageService` in document/expense routes | `documents.routes.ts`, `expenses.routes.ts` | **Disconnected Static Driver** | **ELIMINATED**. Replaced with `StorageFactory.getDriver("TENANT", tenantId)`. |
| Hardcoded `"USD"` in table/invoice formatters | Frontend views | **Confirmed Unwanted Hardcoded Value** | **ELIMINATED**. Replaced by global reactive state in `formatSystemAmount` connected to `useAppConfig`. |

---

## 3. Files and Modules Changed

| File | Change Category | Description |
|---|---|---|
| `server/src/routes/auth.routes.ts` | Backend OAuth Consumer | Extended `GET /api/auth/oauth/config` to expose `github` and `microsoft` status; implemented GitHub and Microsoft redirect URLs in `GET /api/auth/oauth/:provider` and token exchange in `handleOAuthCallback`. |
| `server/src/middleware/maintenance.ts` | Backend Maintenance Consumer | Connected `getPlatformMaintenanceConfig()` to `SettingsService.get("PLATFORM", null, "system.maintenance_mode")`; whitelisted public `/api/v1/public/app-config` endpoints. |
| `server/src/services/settings/runtime-lifecycle.service.ts` | Backend Runtime Lifecycle | Hooked `invalidateMaintenanceCache()` into runtime lifecycle whenever `system` settings group is updated. |
| `server/src/routes/app-config.routes.ts` | Backend App Config Consumer | Added `maintenance: { active: boolean, message: string \| null }` to `/app-config` bootstrap payload. |
| `server/src/routes/documents.routes.ts` | Backend Storage Consumer | Replaced static `storageService.getStream` with dynamic `StorageFactory.getDriver("TENANT", tenantId)`. |
| `server/src/routes/expenses.routes.ts` | Backend Storage Consumer | Replaced static `storageService.save` and `getBuffer` with dynamic `StorageFactory.getDriver("TENANT", tenantId)`. |
| `src/lib/currency.ts` | Frontend Currency Consumer | Added global reactive currency state (`updateGlobalCurrencySettings`, `getActiveCurrencySettings`, `CURRENCY_SYMBOLS`), enabling dynamic formatting across 300+ call sites. |
| `src/lib/useAppConfig.ts` | Frontend App Config Hook | Added `maintenance` property to `AppConfig`; added dynamic currency synchronization on config receipt. |
| `src/routes/auth.tsx` | Frontend Auth Page | Dynamically renders all enabled OAuth providers (`google`, `github`, `microsoft`, `apple`, `linkedin`, `facebook`) in responsive grid; hides disabled providers. |
| `src/components/system-states/maintenance-banner.tsx` | Frontend Maintenance UI | Created new real-time `MaintenanceBanner` displaying emergency maintenance notices from `useAppConfig`. |
| `src/components/system-states/index.ts` | Frontend Exports | Exported `MaintenanceBanner`. |
| `src/routes/__root.tsx` | Frontend Root Component | Mounted `<MaintenanceBanner />` alongside `<OfflineBanner />`. |
| `server/src/tests/s4-app-wide-consumption.test.ts` | Automated Test Suite | Authored 14 comprehensive tests verifying dynamic consumption, tenant isolation, maintenance mode, OAuth buttons, and factory execution. |

---

## 4. Settings-to-Runtime Mappings

```
┌─────────────────────────────────┐
│     Persisted Setting (DB)      │
└─────────────────────────────────┘
                 │
                 ├── branding.app_name, primary_color, logo_*, favicon_*
                 │   └──> GET /api/v1/public/app-config
                 │        └──> useAppConfig()
                 │             ├── document.title
                 │             ├── <link rel="icon">
                 │             └── document.documentElement.style.setProperty("--primary", ...)
                 │
                 ├── locale.default_currency, currency_symbol, date_format
                 │   └──> GET /api/v1/public/app-config
                 │        └──> updateGlobalCurrencySettings()
                 │             └──> formatSystemAmount(val) (300+ call sites)
                 │
                 ├── oauth.github_enabled, oauth.microsoft_enabled, etc.
                 │   └──> OAuthFactory.resolveConfig()
                 │        └──> GET /api/auth/oauth/config
                 │             └──> auth.tsx (Dynamic Social Login Buttons)
                 │
                 ├── system.maintenance_mode, system.maintenance_message
                 │   └──> maintenanceMiddleware
                 │        ├── HTTP 503 for non-super-admins
                 │        ├── Super Admin bypass with Bearer token
                 │        └── MaintenanceBanner in __root.tsx
                 │
                 └── storage.provider, storage.s3_*
                     └──> StorageFactory.getDriver("TENANT", tenantId)
                          ├── documents.routes.ts (/api/documents/:id/stream)
                          └── expenses.routes.ts (/api/expenses/receipt/upload)
```

---

## 5. Security and Tenant Isolation Evidence

1. **Zero Secret Leakage**:
   - `GET /api/v1/public/app-config` inspected: zero `clientSecret`, `apiSecret`, `smtp_password`, or `s3SecretKey` fields present.
   - `GET /api/auth/oauth/config` inspected: only public flags `{ enabled: boolean, configured: boolean }` returned; client secrets remain server-side.
2. **Multi-Tenant Brand & Setting Isolation**:
   - Setting Tenant A custom branding (`branding.app_name`, `primary_color`, `default_currency: "EUR"`) updates `app-config` for Tenant A requests only.
   - Platform branding (`"Apex Global ERP"`, `"USD"`) remains untouched.
   - Tenant B requests receive platform defaults or Tenant B's own overrides without cross-tenant contamination.
3. **Private Document Guard**:
   - `security-uploads-isolation.test.ts` verified (6/6 passing): unauthenticated requests receive HTTP 401; Tenant B cross-tenant document requests receive HTTP 403; path traversal attacks blocked.
4. **Dual Razorpay Preservation**:
   - Platform Razorpay configuration in `PLATFORM` scope remains isolated from Tenant-level payment gateway configurations (`TENANT` scope).
   - Tenant requests fall back to platform settings only for general values, while payment credentials remain strictly separated.

---

## 6. Verification and Test Results

### 6.1 S-Track Test Suites Summary

| Test Suite | File | Tests Passed | Failures | Status |
|---|---|---|---|---|
| **S1 — Settings Core & Realtime Engine** | `s1-settings-core-and-realtime-engine.test.ts` | 20 / 20 | 0 | **PASSED** |
| **S2 — Runtime Factories & Dynamic Consumers** | `s2-runtime-factories-and-hot-updates.test.ts` | 21 / 21 | 0 | **PASSED** |
| **S3 — Settings UI, Real CRUD & Connection Tests** | `s3-settings-ui-and-crud.test.ts` | 18 / 18 | 0 | **PASSED** |
| **S4 — App-wide Consumption & Runtime Integration** | `s4-app-wide-consumption.test.ts` | 14 / 14 | 0 | **PASSED** |
| **Uploads Security Isolation Guard** | `security-uploads-isolation.test.ts` | 6 / 6 | 0 | **PASSED** |
| **Total** | | **79 / 79** | **0** | **100% PASS** |

### 6.2 Build and Typecheck Verification

- **Backend Typecheck**:
  ```bash
  cd server && npx tsc --noEmit
  # Output: 0 errors (Exit code: 0)
  ```
- **Frontend Production Build**:
  ```bash
  npm run build
  # Output: built in 6.59s (Exit code: 0)
  ```

---

## 7. Known Limitations & Next Roadmap Step

### Known Limitations
- Localhost environment: Real external third-party OAuth callbacks (Google, GitHub, Microsoft) and SMTP delivery require live public DNS and callback URLs, which are intentionally mocked/sandboxed in accordance with localhost safety boundaries.
- Staging deployment, VPS provisioning, public TLS issuance, and custom DNS routing remain deferred until a server is available.

### Next Roadmap Step
With S1, S2, S3, and S4 fully complete and verified, the next step on the authoritative roadmap is:
- **Step S5: Hardening, Documentation & Staging Readiness**
  - Final end-to-end audit of all settings groups.
  - Verification of zero orphaned mock routes or unused settings keys.
  - Finalization of Staging/Production deployment checklists.
