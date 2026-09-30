# PHASE C — WAVE 1: GAP REPORT
## Core SaaS Control Plane Parity & Future Wave Readiness

**Migration Wave:** Wave 1 (Core SaaS Control Plane)  
**Status:** ZERO Wave 1 Gaps Remaining  
**Target Platform:** React 18 + Node.js/Express + Prisma 5  
**Source Baseline:** WorkDo Enterprise SaaS ERP (`main-file/`)  

---

## 1. Wave 1 Parity Status

| Feature Item | Laravel Baseline | Node.js / React Target | Parity Status | Evidence |
| :--- | :--- | :--- | :---: | :--- |
| **Super Admin Impersonation** | Session-based switch via `CompanyController@loginWithCompany` | Cryptographic JWT token (`isImpersonating`, `impersonatorUserId`) + persistent amber exit banner | **COMPLETE (100%)** | Test Scenario 1 & 2 passed |
| **Leave Impersonation** | `Session::forget('impersonator_id')` | `POST /api/super/leave-impersonation` restoring original Super Admin token | **COMPLETE (100%)** | Test Scenario 2 & 3 passed |
| **Tenant Status Lifecycle** | Database flag + middleware abort | `PATCH /api/super/tenants/:id/status` + live WebSocket disconnect (`disconnectSockets(true)`) | **COMPLETE (100%)** | Test Scenario 5 passed |
| **Subscription Plans CRUD** | `PlanController` CRUD + Plan model | Relational `SubscriptionPlan` model with `maxEmployees`, `maxUsers`, and deletion protection | **COMPLETE (100%)** | Test Scenario 6 passed |
| **Addon Catalog & Entitlements** | `AddonController` + enabled flag | Master Addon catalog CRUD + `TenantAddon` per-tenant override toggle | **COMPLETE (100%)** | Test Scenario 7 passed |
| **Platform Settings** | Super Admin settings view | `GET/PUT /api/super/settings` (`system-platform-settings` CMS page) | **COMPLETE (100%)** | Test Scenario 8 passed |
| **Tenant Settings & Branding** | `SettingController` per-tenant key-value | `GET/PUT /api/workspace/settings/brand` & `/company` with strict tenant isolation | **COMPLETE (100%)** | Test Scenario 9 & 10 passed |

---

## 2. Identified Technical Nuances & Solutions

1. **Session vs. Stateless JWT Impersonation:**
   - *Laravel:* Uses server-side PHP session state (`Session::put('impersonator_id')`).
   - *Target:* Being a modern React SPA + stateless Express backend, session cookies cannot be assumed. We embedded cryptographically signed claims (`isImpersonating`, `impersonatorUserId`, `impersonatorEmail`) directly in the JWT payload, backed by local storage state for UI reactivity. This delivers complete functional parity without introducing stateful session servers.
2. **Platform Control Plane vs. Tenant-Scoped Autoscoping:**
   - *Issue Identified:* The Dynamic Prisma Proxy Facade strictly fails closed with `403 TENANT_CONTEXT_REQUIRED` when tenant models are queried without a tenant context.
   - *Solution:* Global Super Admin operations (tenant management, global subscriptions, global addon catalog, workspace policy verification during `requireAuth`) explicitly utilize `rawPrisma`, preserving constitutional separation of Platform vs Tenant. All tenant-scoped operations (`workspaceRouter`, `employeesRouter`, etc.) continue using auto-scoped `prisma` with `resolveTenantContext`.

---

## 3. Strict Wave Boundary Compliance

* **Wave 2 (Core HRMS, Employees, Attendance, Leave, Payroll):** NOT STARTED. Zero modifications made to employee statutory fields or tax calculation logic.
* **Wave 3 (ERP, Accounting, POS, Inventory, Sales Returns):** NOT STARTED.
* **Wave 4 (CRM, Projects, Helpdesk):** NOT STARTED.
* **Wave 5 (E-Commerce, Hardware Biometrics, Alerts):** NOT STARTED.

All work in Phase C was strictly restricted to Wave 1.
