# MASTERHRMS — TENANT SETTINGS DEEP DIVE SPECIFICATION
**Source-Level Forensic Analysis of the Authoritative Settings Engine**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. Overview & Architectural Role

The Tenant Settings Engine is responsible for configuring workspace-level behavior, corporate branding, transactional email delivery, object storage, payment gateways, and security constraints without modifying application source code.

Settings are governed by an authoritative backend engine (`SettingsService` & `RuntimeLifecycleService`), validated against a centralized schema dictionary (`SETTINGS_REGISTRY`), and managed through a unified frontend component (`SharedSettingsShell`).

---

## 2. Step-by-Step 23-Point Execution Flow

### 1. How `/tenant/settings` Loads
- **Frontend Route**: `src/routes/_authenticated/tenant/settings.tsx` (TanStack) and `CMS/src/app/(workspace)/tenant/settings/page.tsx` (Next.js CMS).
- **Route Parameters**: Supports URL search query `?tab={tab}` validated via `validateSearch: (search) => ({ tab: search.tab })`.
- **Component**: Mounts `<SharedSettingsShell scope="TENANT" tenantId={...} initialTab={search.tab || "general"} />`.

### 2. How `useCurrentProfile()` Works
- **File**: `src/lib/session.ts` (and `CMS/src/lib/session.ts`).
- **Hook Implementation**: Executes `useQuery({ queryKey: ["current-session-user"], queryFn: () => api.get("/auth/me") })`.
- **Payload**: Returns the current user profile, roles, assigned tenant object (`{ id, name, slug, logoUrl }`), and employee record.

### 3. How Tenant ID is Obtained
- In `tenant/settings.tsx` (line 40):
  ```typescript
  tenantId={profile?.tenant_id || profile?.tenant?.id}
  ```
  If profile is still loading, React Query delays dependent queries until `tenantId` is defined.

### 4. How `SharedSettingsShell` Receives TENANT Scope
- **File**: `src/components/settings/shared-settings-shell.tsx` (lines 51–65).
- Props passed: `scope="TENANT"`, `tenantId="tenant-default-001"`.
- Based on `scope === "TENANT"`, the component automatically hides platform-only tabs:
  - `authentication` (OAuth social sign-in credentials)
  - `system` (Platform maintenance mode & bypass tokens)

### 5. How Settings Categories are Defined
- In `shared-settings-shell.tsx` (lines 307–428), `SETTINGS_CATEGORIES` declares the 9 canonical categories:
  1. `general`: General & Locale (Application name, support email, time zone, currency).
  2. `branding`: Branding & Identity (Light/dark logos, favicon, primary accent color, footer text).
  3. `communication`: Communication (SMTP host, port, username, password, from address, SMS provider).
  4. `authentication`: Authentication (OAuth 2.0 social sign-in; hidden for TENANT).
  5. `payments`: Payments (Razorpay key ID, secret, bank settlement).
  6. `storage`: Storage (Local disk vs AWS S3 / Wasabi buckets).
  7. `security`: Security (Password length, 2FA enforcement, session timeout, IP allowlist).
  8. `integrations`: Integrations (Pusher, webhooks, Slack sync).
  9. `system`: System & Operations (Maintenance mode; hidden for TENANT).

### 6. How Each Group is Loaded
- In `shared-settings-shell.tsx` (lines 79–156):
  Each group issues an independent, cached React Query call:
  - `GET /api/v1/settings/TENANT/branding?tenantId={tenantId}`
  - `GET /api/v1/settings/TENANT/locale?tenantId={tenantId}`
  - `GET /api/v1/settings/TENANT/email?tenantId={tenantId}`
  - `GET /api/v1/settings/TENANT/storage?tenantId={tenantId}`
  - `GET /api/v1/settings/TENANT/security?tenantId={tenantId}`
  - `GET /api/v1/settings/TENANT/payments?tenantId={tenantId}`
- Results are consolidated via `useMemo` into `persistedSettings` (lines 159–169).

### 7. How Values are Validated
- **Frontend**: Validation hints and regex patterns are checked as user types.
- **Backend Authoritative Validation**: In `RuntimeLifecycleService.validatePayload` (`runtime-lifecycle.service.ts`, line 43) calling `validateSettingValue(key, val, scope)` (`settings-registry.ts`, line 1118):
  - Enforces `def.scopes.includes(scope)` (prevents configuring platform-only keys in tenant scope).
  - Validates types (`string`, `number`, `boolean`, `color`, `email`, `url`, `json`).
  - Executes key-specific validators (e.g. `hexColorRegex` for `branding.primary_color`, port range 1–65535 for `email.smtp_port`).

### 8. How Inherited Values are Resolved
- In `SettingsService.getGroup` (`settings.service.ts`, lines 298–391):
  1. Pre-populates all keys with `def.default` from `SETTINGS_REGISTRY` (`source: "DEFAULT"`).
  2. For `TENANT` scope, queries `prisma.setting.findMany({ where: { scope: "PLATFORM" } })` to overlay platform settings as base fallback (`source: "PLATFORM"`).
  3. Queries `prisma.setting.findMany({ where: { scope: "TENANT", scopeId: tenantId } })`. If a tenant row exists, it overrides the value (`source: "TENANT"`, `hasTenantOverride: true`).
  4. Returns `platformFallbacks` so the UI can show the inherited default next to tenant override controls.

### 9. How Form State is Initialized
- In `shared-settings-shell.tsx` (lines 171–182):
  Once queries finish loading (`!isQueriesLoading && !initialFormLoaded`), `setForm(persistedSettings)` initializes the local state.

### 10. How Dirty Fields are Detected
- In `shared-settings-shell.tsx` (lines 205–226):
  `isDirty` compares `form[k]` against `persistedSettings[k]`.
  - Secrets that were already set (`{ isSecret: true, set: true }`) are ignored unless the user enters a non-empty string.
  - An unsaved changes bar (`UnsavedChangesBar`) docks at the bottom when `isDirty === true`.

### 11. How Secrets are Masked
- In `SettingsService.getGroup` (lines 344–358):
  Unless explicitly queried with `{ decryptSecrets: true }` (used only internally by factory connections), secrets are never sent to the browser:
  ```json
  { "email.smtp_password": { "isSecret": true, "set": true } }
  ```
- Component `SecretField` (`src/components/settings/secret-field.tsx`) renders a placeholder `••••••••••••` with a "Change Secret" lock button.

### 12. How Save Operations are Grouped
- In `saveMutation` (lines 233–266):
  Dirty keys are grouped by prefix before the dot:
  `branding.primary_color` ➔ group `branding`.
  `email.smtp_host` ➔ group `email`.

### 13. How PUT Requests are Generated
- For each modified group, the frontend dispatches:
  `PUT /api/v1/settings/TENANT/:group?tenantId={tenantId}` with the changed key-value pairs as JSON payload.

### 14. How Backend Scope is Resolved
- In `server/src/routes/settings.routes.ts` (`resolveScopeAndId`, line 15):
  - Validates `normScope = "TENANT"`.
  - Determines tenant ID:
    ```typescript
    const tenantId = isSuper && req.query.tenantId ? String(req.query.tenantId) : req.user?.tenantId;
    ```
    **Security Check**: Regular tenant users CANNOT override `tenantId` via query parameter; `req.user.tenantId` from verified JWT is strictly enforced.

### 15. How Tenant Authorization is Enforced
- `requireAuth` ensures valid JWT.
- `resolveTenantContext` verifies host-to-tenant alignment.
- Route checks `req.user.roles.includes("hr_admin") || req.user.roles.includes("super_admin")`. Non-admin employees receive HTTP 403.

### 16. How Settings are Stored in PostgreSQL
- In `SettingsService.setGroup` (`settings.service.ts`, lines 410–540):
  Executed inside a Prisma interactive transaction (`prisma.$transaction`):
  1. Plain values are stored in `prisma.setting` (`valueJson` JSONB column, `scope: "TENANT"`, `scopeId: tenantId`).
  2. Secret values (`isSecret: true`) are encrypted using **AES-256-GCM** with a random 96-bit IV and 128-bit auth tag. The ciphertext, IV, auth tag, and key version are stored in `prisma.settingSecret` (`settings.service.ts`, line 25).

### 17. How Audit Records are Generated
- Inside the same transaction (`settings.service.ts`, line 512):
  Creates a record in `prisma.settingAudit`:
  - `scope: "TENANT"`
  - `scopeId: tenantId`
  - `key`: setting key
  - `oldValue`: previous value (or `"[SECRET]"` if secret)
  - `newValue`: updated value (or `"[SECRET]"` if secret)
  - `userId`: `req.user.userId`
  - `ipAddress`: client IP
  - `userAgent`: browser user agent
  - `version`: incremented version number

### 18. How Cache Invalidation Works
- Local process memory cache (`cacheStore` in `settings.service.ts`) is cleared for the modified group via `SettingsService.invalidateCache("TENANT", tenantId, group)` (`runtime-lifecycle.service.ts`, line 103).

### 19. How Runtime Configuration is Activated
- In `RuntimeLifecycleService.updateSettingsGroup` (lines 109–135):
  Immediately refreshes server factories without restarting the Node.js process:
  - If `email`: `MailerFactory.invalidate("TENANT", tenantId)` drops cached SMTP transporters.
  - If `storage`: `StorageFactory.invalidate("TENANT", tenantId)` drops cached S3 client connections.
  - If `sms`: `SmsFactory.invalidate(tenantId)` drops SMS provider clients.
  - If `system`: `invalidateMaintenanceCache()` updates platform maintenance status.

### 20. How Realtime Updates Reach the UI
- In `RealtimeFactory.broadcastSettingsUpdate` (`realtime.factory.ts`, line 35):
  Emits Socket.IO event `'settings:updated'` to room `tenant:${tenantId}`.
- In `shared-settings-shell.tsx` (lines 286–304):
  Client listens to `'settings-updated'` window event:
  - If user has no unsaved changes (`!isDirty`), calls `qc.invalidateQueries({ queryKey: ["settings", scope] })` for automatic hot-reloading.
  - If user has unsaved edits, surfaces a banner: *"Remote changes detected for group '...'. Save your edits or refresh."*

### 21. How Errors are Surfaced
- Validation errors return HTTP 400 with `{ error, validationErrors: [...] }`.
- Frontend displays toast notifications (`toast.error(msg)`) and highlights errored form inputs.

### 22. How Resetting a Tenant Override Works
- **Route**: `DELETE /api/v1/settings/TENANT/:group/:key?tenantId={tenantId}`.
- Deletes the specific row from `prisma.setting` and `prisma.settingSecret`.
- Logs a `REVERT` entry to `prisma.settingAudit`.
- Future reads immediately inherit from `PLATFORM` scope or `SETTINGS_REGISTRY` defaults.

### 23. How Tenant Branding Inherits Platform Branding
- In `BrandingResolverService.resolveForTenant(tenantId)` (`branding-resolver.service.ts`):
  1. Fetches tenant branding settings.
  2. If any asset is missing (e.g. `branding.logo_dark_id` is null), automatically falls back to the platform logo.
  3. Returns resolved `{ appName, supportEmail, primaryColor, logoLightUrl, logoDarkUrl, faviconUrl, footerText }` to both SSR layouts and client hydration trees.
