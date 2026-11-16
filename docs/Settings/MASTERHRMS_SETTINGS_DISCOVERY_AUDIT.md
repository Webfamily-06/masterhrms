# MASTERHRMS — SETTINGS DISCOVERY AUDIT (S0 BASELINE)
## Comprehensive State Discovery & Gap Analysis of the Role-Based Settings Platform

**Document Version:** 1.0.0  
**Audit Date:** November 2026  
**Repository:** `Webfamily-06/masterhrms`  
**Branch:** `main`  
**Database:** Supabase PostgreSQL (`ofzbhbcnizyegroggkxl`, ap-south-1)  
**Execution Phase:** S0 Baseline Discovery Audit  

---

### Executive Summary

A comprehensive, read-only discovery audit of the MASTERHRMS repository, database schema, backend services, and dual frontend architectures (TanStack Start and Next.js CMS) was conducted to evaluate the readiness of the application's role-based settings platform.

The audit examined four primary operational scopes:
1. **Super Admin / Platform Settings** (`/super/settings`)
2. **Tenant / Company Workspace Settings** (`/tenant/settings`)
3. **HR Administration Settings** (`/hr/settings`)
4. **Employee / Personal Settings** (`/me/settings`)

The system possesses a robust backend infrastructure centered around `SettingsService`, `SETTINGS_REGISTRY`, `RuntimeLifecycleService`, AES-256-GCM encrypted `SettingSecret` storage, and an immutable `SettingAudit` log. However, several critical gaps were identified across frontend routing, user-level preference registration, and permission boundaries, notably the complete absence of a dedicated `/me/settings` route in both frontend workspaces.

---

### 1. Database Architecture & Schema Verification

Inspection of `server/prisma/schema.prisma` confirmed the following core models and enums:

#### 1.1 `SettingScope` Enum (Lines 6848–6852)
```prisma
enum SettingScope {
  PLATFORM
  TENANT
  USER
}
```
The database natively supports all three core scopes: `PLATFORM`, `TENANT`, and `USER`.

#### 1.2 `Setting` Model (`settings` Table, Lines 5397–5415)
- **Columns:**
  - `id` (CUID, Primary Key)
  - `scope` (`SettingScope` enum)
  - `scopeId` (`String?` — `null` for PLATFORM, `tenantId` for TENANT, `userId` for USER)
  - `group` (`String` — e.g., `branding`, `locale`, `email`, `security`, `user`)
  - `key` (`String` — e.g., `branding.app_name`, `user.theme`)
  - `valueJson` (`String` — text/JSON representation)
  - `valueType` (`String` — `string`, `number`, `boolean`, `color`, `media`, `secret`, `json`)
  - `isSecret` (`Boolean` — default `false`)
  - `version` (`Int` — optimistic concurrency counter)
  - `updatedBy` (`String?` — User ID of modifier)
  - `createdAt`, `updatedAt` (`DateTime`)
- **Indexes & Constraints:**
  - `@@unique([scope, scopeId, key])` — Enforces atomic single-key uniqueness per scope.
  - `@@index([scope, scopeId, group])` — Fast group queries.

#### 1.3 `SettingSecret` Model (`setting_secrets` Table, Lines 5417–5428)
- Stores AES-256-GCM encrypted secrets for credentials (SMTP passwords, OAuth secrets, payment private keys, API tokens).
- Fields: `id`, `scope`, `scopeId`, `key`, `ciphertext` (`Bytes`), `iv` (`String`, 12-byte hex), `authTag` (`String`, 16-byte hex), `keyVersion` (`Int`).

#### 1.4 `SettingAudit` Model (`setting_audits` Table, Lines 5430–5445)
- Immutable audit ledger recording every configuration modification.
- Fields: `id`, `scope`, `scopeId`, `key`, `oldValueMasked`, `newValueMasked`, `changedBy`, `ipAddress`, `userAgent`, `createdAt`.

---

### 2. Backend Engine & API Audit

#### 2.1 Settings Registry (`server/src/services/settings/settings-registry.ts`)
The registry defines typed configuration metadata, validation schemas, and real-time broadcast topics:
- **Current Total Keys:** 83 keys across 12 groups:
  - `branding` (7 keys): `app_name`, `support_email`, `primary_color`, `logo_light_id`, `logo_dark_id`, `favicon_id`, `tagline`
  - `locale` (5 keys): `timezone`, `date_format`, `time_format`, `default_currency`, `default_language`
  - `integration` (7 keys): Webhook URLs, external sync flags
  - `messaging` (4 keys): SMS provider credentials, Pusher/Soketi configuration
  - `ai` (1 key): Platform AI enablement
  - `email` (10 keys): SMTP host, port, encryption, authentication credentials, sender headers
  - `oauth` (10 keys): Google, Apple, Microsoft, GitHub client IDs and encrypted secrets
  - `storage` (8 keys): Local, AWS S3, Cloudflare R2, MinIO storage configurations
  - `security` (9 keys): Session timeouts, 2FA enforcement, password policies, IP whitelisting
  - `payments` (13 keys): Razorpay, Stripe, PayPal API keys and webhook secrets
  - `system` (3 keys): Maintenance mode, system announcements, debug telemetry
  - `hr` (6 keys): Employee ID generation pattern, branch prefixes, sequence numbering
- **Current Scope Distribution:**
  - `PLATFORM, TENANT`: 64 keys
  - `TENANT`: 9 keys
  - `PLATFORM`: 7 keys
  - `PLATFORM, TENANT, USER`: 3 keys (`locale.timezone`, `locale.date_format`, `locale.time_format`)

#### 2.2 Settings Service & Inheritance (`server/src/services/settings/settings.service.ts`)
- **Inheritance Chain:** Fully implemented hierarchical fallback:
  $$\text{Resolved Value} = \text{USER} \xrightarrow{\text{fallback}} \text{TENANT} \xrightarrow{\text{fallback}} \text{PLATFORM} \xrightarrow{\text{fallback}} \text{Registry Default}$$
- **Secret Protection:** Secrets are masked by default (`{ set: true }`) unless explicitly requested with `{ decryptSecrets: true }` in trusted server contexts.
- **Cache Management:** In-memory TTL caching (`CACHE_TTL_MS = 60000`) with immediate invalidation upon atomic writes.

#### 2.3 Runtime Lifecycle Service (`server/src/services/settings/runtime-lifecycle.service.ts`)
- Coordinates atomic persistence, encryption, audit trail generation, cache clearing, and runtime factory reloads:
  - `MailerFactory.reload()`
  - `StorageFactory.reload()`
  - `OAuthFactory.reload()`
  - `SmsFactory.reload()`

#### 2.4 API Routes (`server/src/routes/settings.routes.ts`)
Mounted at `/api/v1/settings`:
- `GET /:scope/:group` — Reads masked settings.
- `PUT /:scope/:group` — Atomic updates with validation.
- `POST /:scope/:group/test` — Live health probes (`email`, `storage`, `sms`, `oauth`, `payments`).
- `DELETE /:scope/:group/:key` — Removes scope-level override, reverting to fallback.
- `POST /:scope/:group/reset` — Resets an entire group to defaults.
- `GET /:scope/:group/history` — Audit log retrieval.

---

### 3. Dual-Frontend Settings Route Audit

| Scope | TanStack Start Route (`src/`) | Next.js CMS Route (`CMS/src/app/`) | Status | Parity |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `src/routes/_authenticated/super/settings.tsx` (3,485 lines) | `CMS/src/app/super/settings/page.tsx` (161 KB) | **Complete** | 100% |
| **Tenant Admin** | `src/routes/_authenticated/tenant/settings.tsx` (`SharedSettingsShell`) | `CMS/src/app/(workspace)/tenant/settings/page.tsx` (`SharedSettingsShell`) | **Complete** | 100% |
| **HR Admin** | `src/routes/_authenticated/hr/settings.tsx` (2,775 lines) | `CMS/src/app/(workspace)/hr/settings/page.tsx` (126 KB) | **Complete** | 100% |
| **Employee** | `src/routes/_authenticated/me/settings.tsx` (**MISSING**) | `CMS/src/app/(workspace)/me/settings/page.tsx` (**MISSING**) | **MISSING** | 0% (CRITICAL GAP) |

#### Detailed Frontend Route Observations:
1. **Super Admin (`/super/settings`):**
   - High degree of maturity. Features 4 major categories: Brand & Identity, Currency & Payments, Comms & Integrations, Platform Operations.
   - Includes real-time test connection buttons and interactive secret masking.
2. **Tenant Admin (`/tenant/settings`):**
   - Uses `SharedSettingsShell` with `scope="TENANT"`.
   - Manages General, Email, OAuth, Storage, Security, Payments, and System tabs.
3. **HR Admin (`/hr/settings`):**
   - Extensive enterprise configuration suite containing 15 operational sections: Workspace Roles, Workspace Branding, Company Profile & GST, Office Timing & Policy, S3 Gateways, Leave Types & Quotas, Departments & Teams, Approval Workflows, Salary & Statutory, Invoice & Billing, Config Hub, Dynamic Custom Fields, AI Engine Settings, Security & 2FA, and Email Accounts.
4. **Employee Personal Settings (`/me/settings`):**
   - **CRITICAL GAP:** The route `/me/settings` does not exist in either frontend. Employees currently only have `/me/profile` and `/me/account` (which merely aliases `/me/profile`). There is no interface for employees to manage their personal appearance, theme mode, notification triggers, quiet hours, or personal email accounts.

---

### 4. Categorized Audit Matrix

| Category / Component | Status | Verified Functionality | Gaps Identified |
| :--- | :--- | :--- | :--- |
| **Database Schema** | **COMPLETE** | `Setting`, `SettingSecret`, `SettingAudit` models with proper unique constraints and indexes. | None. |
| **Secret Encryption** | **COMPLETE** | AES-256-GCM encryption with IV and AuthTag. | None. |
| **Audit Logging** | **COMPLETE** | Masked old/new values recorded in `SettingAudit`. | None. |
| **Inheritance Resolver** | **COMPLETE** | `USER` -> `TENANT` -> `PLATFORM` -> Registry default hierarchy functioning in `SettingsService`. | Needs broader registration of `USER` keys. |
| **Runtime Factories** | **COMPLETE** | Mailer, Storage, SMS, and OAuth factories reload dynamically. | AI and notification consumer reloads should be expanded. |
| **Super Admin UI** | **COMPLETE** | Full coverage across 4 categories in TanStack and Next.js CMS. | Needs unified SEO and cookie consent tab links. |
| **Tenant Admin UI** | **PARTIALLY VERIFIED** | `SharedSettingsShell` handles 7 core groups. | Needs clear inheritance indicators ("Inherited from Platform" vs "Overridden"). |
| **HR Admin UI** | **COMPLETE** | 15 tabs covering operational, statutory, and workflow controls. | RBAC must strictly block non-admin writes to sensitive tenant keys. |
| **Employee UI** | **MISSING** | None. | `/me/settings` completely missing in both frontends. |
| **Personal Email Integration** | **PARTIALLY VERIFIED** | `UserEmailAccount` model exists; component exists in `src/components/settings/user-email-accounts-settings.tsx`. | Not integrated into Employee settings. |

---

### 5. Prioritized Remediation Roadmap (S1 to S9)

- [ ] **S1 — Settings Registry Expansion:** Register `user.*` personal preferences, `seo.*` platform metadata, `appearance.*` UI preferences, and `invoicing.*` defaults.
- [ ] **S2 — Security & RBAC Enforcement:** Restrict `TENANT` mutations to administrative roles; secure `USER` scope strictly to authenticated user's `userId`.
- [ ] **S3 — Tenant Settings UI Refinement:** Enhance `SharedSettingsShell` with platform inheritance visual cues and restore-default actions.
- [ ] **S4 — HR Settings Audit & Hardening:** Ensure strict privilege separation between HR operational controls and platform configuration.
- [ ] **S5 — Employee Settings Implementation:** Create `/me/settings` in TanStack Start and Next.js CMS with full personal preference and email account management.
- [ ] **S6 — Runtime Consumer Integration:** Validate live theme, branding, mailer, and localization updates across active sessions.
- [ ] **S7 — Live Connection Probes:** Verify test connection endpoints for SMTP, storage, and payment gateways.
- [ ] **S8 — Automated Testing & Verification:** Execute unit and integration tests for inheritance, encryption, and route resolution.
- [ ] **S9 — Deliverable Compilation:** Finalize all remaining technical documentation in `docs/Settings/`.
