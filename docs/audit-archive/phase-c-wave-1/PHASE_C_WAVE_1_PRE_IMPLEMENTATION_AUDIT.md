# PHASE C — WAVE 1: PRE-IMPLEMENTATION AUDIT REPORT

**Target Scope:** Core SaaS Control Plane (Super Admin Hub & Impersonation, Subscription Plans, Addon Engine & Entitlements, Settings & Branding)  
**Source Truth:** WorkDo Laravel SaaS ERP (`main-file/`)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 Multi-Tenant SaaS (`/`)  
**Auditor:** Antigravity Deep Forensic Agent  
**Date:** September 26, 2026  
**Status:** Audit Complete — Ready for Controlled Implementation  

---

## 1. EXECUTIVE SUMMARY & WAVE 1 SCOPE

Phase C Wave 1 focuses exclusively on the **Core SaaS Control Plane**. This foundation is required before any domain ERP module (HRMS, Accounting, POS, CRM) can be safely migrated.

### Wave 1 Feature Boundaries:
1. **Super Admin Hub & Tenant Impersonation:**
   - Multi-tenant overview, tenant admin hub, password resets, status toggles, seamless one-click impersonation with cryptographic JWT preservation, and secure impersonation exit.
2. **Subscription Plans & Monetization Engine:**
   - Master subscription plans catalog, plan feature entitlements, tenant subscription assignment, limit enforcement (users, employees, storage), trial period handling.
3. **Add-on Engine & Entitlement Enforcement:**
   - Marketplace catalog, tenant-level add-on activation/toggling, 14-day free trials, and server-side `requireAddon` middleware guards.
4. **Settings & Branding:**
   - Platform-wide Super Admin settings (Platform title, default currency, SMTP emailer, Pusher WebSockets) and Tenant-scoped settings (Company branding, logo/favicon, timezone, address).

---

## 2. FEATURE-BY-FEATURE FORENSIC AUDIT & GAP ANALYSIS

### Feature 1: Super Admin Hub & Tenant Impersonation

#### Laravel Source Implementation:
* **Controllers & Models:**
  - `main-file/app/Http/Controllers/UserController.php`:
    - `impersonate(User $user)` (lines 194–210): Requires `impersonate-users` permission and `type === 'superadmin'`. Saves `Session::put('impersonator_id', Auth::id())`, logs in as `$user`, redirects to dashboard.
    - `leaveImpersonation()` (lines 212–230): Validates `Session::has('impersonator_id')`, restores original super admin session, redirects to `users.index`.
    - `adminHub(User $user)` (lines 232–277): Displays company users, count of active/inactive users, roles, active plan name.
    - `toggleStatus(User $user)` (lines 279–295): Toggles `is_enable_login` / `is_disable`.
* **Frontend UI:**
  - `main-file/resources/js/pages/users/admin-hub.tsx` & `main-file/resources/js/pages/users/index.tsx`.
  - Floating top banner across all pages whenever `impersonator_id` is active.

#### Target Platform Current State:
* `server/src/routes/super.routes.ts`:
  - Has `POST /api/super/impersonate/:tenantId` (lines 129–170), which switches Profile tenantId and returns a tenant-scoped JWT.
* **Gaps Identified in Target:**
  1. No `POST /api/super/leave-impersonation` endpoint to restore original Super Admin JWT and profile context.
  2. The issued JWT during impersonation lacks explicit `isImpersonated: true` and `impersonatorUserId` claims.
  3. Frontend AppShell (`src/routes/_authenticated/_app/route.tsx`) lacks the sticky visual Impersonation Banner displaying `"Currently Impersonating Workspace [Name] — [Exit Impersonation Button]"`.
  4. Missing tenant toggle status endpoint (`PATCH /api/super/tenants/:id/status`) to suspend/activate workspaces.

---

### Feature 2: Subscription Plans & Monetization Engine

#### Laravel Source Implementation:
* **Controllers & Models:**
  - `main-file/app/Http/Controllers/PlanController.php`:
    - `index()`: Lists plans, subscriber counts, enabled add-ons, trial info.
    - `store()` / `update()`: Manages plan name, monthly/annual price, max users, max employees, storage limit, included modules, trial days.
    - `assignPlan()`: Assigns plan to company user with custom override counters (`user_counter`, `storage_limit`, `modules`), logs zero-cost order record.
    - `startTrial()`: Activates 14-day trial, sets `is_trial_done = 1`.
  - Models: `main-file/app/Models/Plan.php`, `Order.php`.

#### Target Platform Current State:
* `server/prisma/schema.prisma`:
  - `model SubscriptionPlan`: Contains `id`, `name`, `priceMonthly`, `priceAnnual`, `maxEmployees`, `maxUsers`, `features`, `includedAddonIds`, `isPopular`.
  - `model TenantSubscription`: Contains `tenantId`, `planId`, `status`, `billingCycle`, `maxEmployees`, `maxUsers`, `expiresAt`.
  - `model SubscriptionPolicyAudit`: Immutable audit trail for plan changes.
* `server/src/routes/super.routes.ts`:
  - `PUT /api/super/tenants/:id/policy`: Assigns plan and updates `TenantSubscription`.
* **Gaps Identified in Target:**
  1. Missing direct RESTful CRUD endpoints for `SubscriptionPlan` (`GET /api/super/plans`, `POST /api/super/plans`, `PUT /api/super/plans/:id`, `DELETE /api/super/plans/:id`) querying the relational `SubscriptionPlan` model directly via `prisma.subscriptionPlan`.
  2. Missing self-service trial activation endpoint for tenants (`POST /api/workspace/subscription/trial`).

---

### Feature 3: Add-on Engine & Entitlement Enforcement

#### Laravel Source Implementation:
* **Controllers & Models:**
  - `main-file/app/Http/Controllers/ModuleController.php`:
    - `index()`: Lists installed packages and marketplace directory.
    - `enable()`: Checks module dependencies, runs migrations/seeds, updates `AddOn` model, enables module.
    - `getUserActiveModules()`: Returns active modules for current tenant.
  - Models: `main-file/app/Models/AddOn.php`, `UserActiveModule.php`.

#### Target Platform Current State:
* `server/prisma/schema.prisma`:
  - `model Addon`: Global marketplace catalog (`id`, `name`, `slug`, `category`, `priceMonthly`, `features`, `version`, `status`).
  - `model TenantAddon`: Tenant-isolated entitlements (`tenantId`, `addonSlug`, `status`, `plan`, `trialEndsAt`, `renewsAt`).
* `server/src/routes/addons.routes.ts`:
  - `GET /api/addons/entitlements`: Returns tenant's active add-ons.
  - `POST /api/addons/:addonSlug/trial`: 14-day free trial.
  - `POST /api/addons/:addonSlug/subscribe`: Activates paid subscription.
* `server/src/middleware/auth.ts`:
  - `requireAddon(addonSlug)`: Server-side middleware blocking unauthorized access with 403 `ADDON_ENTITLEMENT_REQUIRED`.
* **Gaps Identified in Target:**
  1. Missing Super Admin CRUD endpoints (`GET /api/super/addons`, `POST /api/super/addons`, `PUT /api/super/addons/:id`, `DELETE /api/super/addons/:id`) to manage master add-on catalog.
  2. Missing super admin endpoint to toggle addon for a specific tenant (`POST /api/super/tenants/:id/addons/:addonSlug/toggle`).

---

### Feature 4: Settings & Branding

#### Laravel Source Implementation:
* **Controllers & Models:**
  - `main-file/app/Http/Controllers/SettingController.php`:
    - `updateBrandSettings()`: Dark logo, light logo, favicon, titleText, footerText, themeColor, customColor.
    - `updateCompanySettings()`: Name, address, city, state, zipcode, country, telephone.
    - `updateSystemSettings()`: Language, timezone, currency format.
    - `updateEmailSettings()`: SMTP host, port, username, password, encryption, from address.
    - `testEmail()`: Dispatches test verification email.
    - `updatePusherSettings()`: Pusher app ID, key, secret, cluster.

#### Target Platform Current State:
* `server/src/routes/super.routes.ts`:
  - Has `POST /api/super/smtp/test-otp-email` for SMTP testing.
  - Has `Tenant` model (`name`, `slug`, `logoUrl`, `timezone`).
* **Gaps Identified in Target:**
  1. Missing dedicated tenant settings endpoints:
     - `GET /api/workspace/settings`: Returns company info, branding, currency, timezone.
     - `PUT /api/workspace/settings/brand`: Updates logo, title, favicon for tenant.
     - `PUT /api/workspace/settings/company`: Updates company contact and location details.
  2. Missing Super Admin platform settings endpoint (`GET /api/super/settings` and `PUT /api/super/settings`) to persist global system defaults.

---

## 3. TARGET CODEBASE IMPACT & FILES TO BE MODIFIED

| Target File Path | Planned Action | Description of Modifications |
| :--- | :---: | :--- |
| `server/src/routes/super.routes.ts` | **Modify** | Add `leave-impersonation`, tenant status toggle, relational `SubscriptionPlan` CRUD, and Super Admin `Addon` management endpoints. |
| `server/src/routes/workspace.routes.ts` | **Modify** | Add tenant-scoped settings endpoints (`GET /api/workspace/settings`, `PUT /api/workspace/settings/brand`, `PUT /api/workspace/settings/company`). |
| `server/src/routes/addons.routes.ts` | **Modify** | Ensure `addonsRouter` supports full listing and tenant toggle compatibility with `prismaProxy`. |
| `src/routes/_authenticated/_app/route.tsx` | **Modify** | Inject floating Impersonation Banner when `user.isImpersonated` is true with one-click `Exit Impersonation` action. |
| `src/lib/session.ts` or `src/lib/api.ts` | **Modify** | Support storing original token during impersonation and restoring upon exit. |
| `server/src/tests/wave1-core-saas.test.ts` | **Create** | Comprehensive automated test suite for all Wave 1 functionality. |

---

## 4. DEPENDENCIES & PREREQUISITES

* **Dynamic Prisma Proxy Facade:** Verified in Phase 1 Step 4 (`server/src/facade/prisma-proxy.facade.ts`). All tenant-owned operations will use `getTenantDb()` and `prismaProxy`.
* **JWT Token Engine:** `server/src/lib/jwt.ts` (`generateToken`, `verifyToken`).
* **Authentication Middleware:** `server/src/middleware/auth.ts` (`requireAuth`, `requireSuperAdmin`, `requireAddon`).

---

## 5. SECURITY CONSIDERATIONS

1. **Impersonation Token Isolation:**
   - Impersonation tokens must include cryptographic proof of the original `impersonatorUserId`.
   - Tenant users must never be allowed to call the impersonation endpoint (guarded strictly by `requireSuperAdmin`).
2. **Strict Multi-Tenant Isolation for Settings:**
   - A tenant updating their brand settings must ONLY update their own row (`tenantId = req.user.tenantId`).
   - Cross-tenant mutations are blocked by the Prisma Proxy Facade.
3. **Password & Credential Sanitization:**
   - SMTP passwords and secret keys must be redacted in API responses.
   - User password hashes must never be exposed.

---

## 6. AUTOMATED TEST PLAN (10 SCENARIOS)

1. Super Admin impersonates tenant admin -> verifies scoped token & active tenant ID.
2. Super Admin exits impersonation -> verifies original Super Admin identity restored.
3. Non-super admin attempts impersonation -> blocked with HTTP 403 Forbidden.
4. Tenant status toggle -> suspended tenant login blocked with HTTP 403 `WORKSPACE_SUSPENDED`.
5. SubscriptionPlan CRUD -> Super admin creates, updates, and reads relational plans.
6. Tenant subscription policy assignment -> updates limits (`maxEmployees`, `maxUsers`) with audit log.
7. Addon trial activation -> tenant activates 14-day trial; verifies `TenantAddon` record.
8. Addon entitlement middleware guard (`requireAddon`) -> permits active addon, blocks disabled addon.
9. Tenant branding settings update -> tenant updates logo and title; verifies zero cross-tenant contamination.
10. Super Admin platform settings read and update -> platform defaults persisted safely.

---

## 7. ROLLBACK PLAN

All Wave 1 modifications are additive API endpoints and UI components:
* If any regression occurs, individual route files can be reverted to git `HEAD`.
* No database DDL migrations are executed in Wave 1. Existing Prisma models (`SubscriptionPlan`, `TenantSubscription`, `Addon`, `TenantAddon`, `Tenant`, `User`) are reused directly.
* Token format remains backward compatible.
