# Audit Report: Super Admin Tenants / Companies (/super/tenants)

## 1. Executive Summary & Page Inventory

The `/super/tenants` route is the primary multi-tenant management command center within the Super Admin portal (`/_authenticated/super/tenants`). It allows Super Admins to oversee all tenant workspaces, monitor company metrics, manage subscription quotas, provision new workspaces, edit company profiles, suspend/reactivate tenants, delete workspaces, and perform 1-click administrative impersonation into company workspaces.

### File & Component Inventory

| Component / Layer | File Path | Status | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Page Route** | `src/routes/_authenticated/super/tenants.tsx` | Partial / Mock Data Found | Main route component with breadcrumbs, KPI cards, filter toolbar, company table, pagination, modals |
| **Workspace Policy Modal** | `src/components/workspace-policy-dialog.tsx` | Functional with Gaps | Edits tenant plan, employee/user quotas, and billing cycle |
| **Super Admin Shell** | `src/routes/_authenticated/super/route.tsx` | Functional | Root layout and guard enforcing `requireSuperAdmin` |
| **Backend Router** | `server/src/routes/super.routes.ts` | Functional with Gaps | Express endpoints under `/api/super/*` for tenants, policies, stats, domains, impersonation |
| **Policy Service** | `server/src/services/workspace-policy.service.ts` | Functional | Resolves plan, quota limits, and revenue metrics |
| **Database ORM** | `server/prisma/schema.prisma` | PostgreSQL (Supabase) | Defines `Tenant`, `TenantSubscription`, `SubscriptionPlan`, `TenantDomain`, `Employee`, `Profile`, `Warehouse`, `Branch` |

---

## 2. Hardcoded, Mock, and Placeholder Business Data Identified

During the forensic audit of `src/routes/_authenticated/super/tenants.tsx` and related services, the following fake, hardcoded, or broken implementations were identified:

### 2.1. Top KPI Summary Cards
1. **Total Companies**: Calculated only in browser memory using `tenants.length` from the initial list, rather than an authoritative database counter.
2. **Active Companies**: Filtered client-side (`t.policy?.status !== "suspended"`), ignoring actual subscription status and expiration dates.
3. **Inactive Companies**: Derived as `totalCount - activeCount` on the client without differentiating suspended, expired, or trialing tenants.
4. **Company Location**: Calculated via a completely fabricated formula:
   ```ts
   const locationCount = Math.max(1, Math.min(totalCount, 12)); // FAKE HARDCODED VALUE
   ```
5. **Card Sparklines**: Four SVG sparkline charts render static hardcoded number sequences:
   - Total: `[10, 15, 12, 18, 20, 24, 28]`
   - Active: `[12, 14, 18, 16, 22, 25, 30]`
   - Inactive: `[8, 6, 7, 5, 4, 3, 2]`
   - Location: `[5, 7, 9, 8, 11, 14, 16]`
6. **No Skeleton Loading States**: Summary cards do not render skeleton placeholders while data is being fetched or refreshed, causing layout shift.

### 2.2. Companies Table & Field Fallbacks
1. **Company Logo / Profile Image**:
   - Rotates through dummy assets `company-01.svg` to `company-05.svg` based on index:
     ```ts
     logo_url: t.logoUrl || t.logo_url || `/ui-assets/company/company-0${(idx % 5) + 1}.svg`
     ```
   - Lacks an image error fallback handler when an image fails to load.
2. **Created Date**:
   - Contains a hardcoded fallback string:
     ```ts
     created_at: t.createdAt ? new Date(t.createdAt)... : "14 Jan 2024" // FAKE DATE FALLBACK
     ```
3. **Subscription Plan**:
   - Contains a hardcoded fallback string `"Basic (Monthly)"` if unassigned, instead of the requirement to show `"Unassigned"`.
4. **Account URL**:
   - Renders `${tenant.slug}.mastererp.cloud` exclusively without checking whether the tenant has an approved custom domain in `tenant_domains` table.
5. **Pagination**:
   - The pagination UI at the bottom of the table is completely static and non-functional:
     ```tsx
     <button disabled>Previous</button>
     <button>1</button>
     <button disabled>Next</button>
     ```
   - Server-side pagination parameters (`page`, `limit`) are not supported by the current frontend or backend endpoint.
6. **Search & Filter Dropdowns**:
   - Search by company name, plan filter ("All Plans", "Basic", "Advanced", "Enterprise"), and status filter ("All Status", "Active", "Inactive") operate solely in memory over the loaded array.
   - Plan options in the dropdown ("Basic", "Advanced", "Enterprise") are hardcoded and do not reflect actual subscription plans in the Supabase database (`starter`, `growth`, `sovereign`).

### 2.3. Actions & Modals
1. **Edit Company**:
   - In `handleUpdateCompany`, the form collects `formName`, but the mutation sends a payload to `/super/tenants/:id/policy` with quota fields and **never updates the tenant's name or logo** in the `Tenant` table:
     ```ts
     await api.put(`/super/tenants/${targetTenant.id}/policy`, {
       status: targetTenant.policy?.status || "active",
       ...
     }); // BUG: Name is ignored and never saved!
     ```
2. **Add Company**:
   - Form only takes Name, Slug, Logo URL. It does not allow assigning an initial Subscription Plan from the real database catalog.
   - Backend `POST /api/super/tenants` does not create an initial `tenantSubscription` record or validate slug uniqueness before throwing a database error.
3. **Delete Company**:
   - Backend had two conflicting declarations of `superRouter.delete("/tenants/:id")` (line 400 and line 1688).
4. **Cache Invalidation**:
   - `WorkspacePolicyDialog` invalidates `["super-tenants"]` instead of `["super-tenants-list"]`, causing the companies table to display stale plan data until a manual page reload.

---

## 3. Database Schema & Field Mapping (Supabase PostgreSQL)

| UI Display Field | Source Table | Database Column(s) / Relation | Business Rule / Transformation |
| :--- | :--- | :--- | :--- |
| **Total Companies** | `tenants` | `COUNT(id)` | Total non-deleted tenants registered |
| **Active Companies** | `tenant_subscriptions` + `tenants` | `status = 'active'` AND (`expires_at IS NULL` OR `expires_at > NOW()`) | Authoritative active status from subscription |
| **Inactive Companies** | `tenant_subscriptions` + `tenants` | `status = 'suspended'` OR (`expires_at <= NOW()`) | Total non-active or suspended workspaces |
| **Company Location** | `tenants`, `branches`, `warehouses` | `branches` count + `warehouses` count OR tenants with configured location | Real count of configured company physical branches/locations |
| **Company Logo** | `tenants` | `tenants.logo_url` | Render image; if null or broken, show clean initials avatar fallback |
| **Company Name** | `tenants` | `tenants.name` | Real organization name from DB |
| **Employee Count** | `employees` | `COUNT(employees.id)` where `tenant_id = tenant.id` | Count of real employees under this tenant |
| **User Count** | `profiles` | `COUNT(profiles.id)` where `tenant_id = tenant.id` | Count of unique user accounts assigned to this workspace |
| **Account URL** | `tenant_domains` + `tenants` | `tenant_domains.domain` (where `is_primary = true` AND `status = 'approved'`) OR `${slug}.mastererp.cloud` | Uses verified custom domain if active, else tenant subdomain |
| **Subscription Plan** | `subscription_plans` | `subscription_plans.name` via `tenant_subscriptions.plan_id` | Shows real plan name ("Starter Cloud", "Growth Enterprise", etc.) or "Unassigned" |
| **Created Date** | `tenants` | `tenants.created_at` | Formatted real timestamp (e.g., "02 Oct 2026") |
| **Status** | `tenant_subscriptions` | `tenant_subscriptions.status` | Badges: Active (green), Suspended / Inactive (red), Trialing (blue) |

---

## 4. API Endpoints Mapping & Action Matrix

| UI Action / Component | Existing Endpoint | Required Action | Auth / Security Guard |
| :--- | :--- | :--- | :--- |
| **Fetch Stats (Cards)** | `GET /api/super/stats` or `GET /api/super/tenants/stats` | Ensure endpoint returns `totalTenants`, `activeTenants`, `inactiveTenants`, `locationCount`, and real 6-month growth sparkline data | `requireAuth`, `requireSuperAdmin` |
| **Fetch Companies List** | `GET /api/super/tenants` | Add server-side query params: `page`, `limit`, `search`, `plan`, `status`. Return paginated records and counts | `requireAuth`, `requireSuperAdmin` |
| **Fetch Available Plans** | `GET /api/super/plans` | Fetch real database plans for dropdown filter and creation modal | `requireAuth`, `requireSuperAdmin` |
| **Enter Company (Impersonate)** | `POST /api/super/impersonate/:tenantId` | Already implemented securely with JWT impersonation claims | `requireAuth`, `requireSuperAdmin` |
| **Add Company** | `POST /api/super/tenants` | Accept `name`, `slug`, `logoUrl`, `planId`. Transactionally create `Tenant` and `TenantSubscription`. Validate slug. | `requireAuth`, `requireSuperAdmin` |
| **Edit Company Profile** | `PUT /api/super/tenants/:id` | Update `name`, `logoUrl` in `Tenant` table and persist | `requireAuth`, `requireSuperAdmin` |
| **Change Plan / Quotas** | `PUT /api/super/tenants/:id/policy` | Persist plan, employee limit, user limit, billing cycle, expiry date | `requireAuth`, `requireSuperAdmin` |
| **Toggle Status (Suspend/Activate)** | `PUT /api/super/tenants/:id/status` | Update `TenantSubscription.status` to `active` or `suspended` and disconnect active sockets if suspended | `requireAuth`, `requireSuperAdmin` |
| **Delete Company** | `DELETE /api/super/tenants/:id` | Cascading delete of tenant and disconnect sockets | `requireAuth`, `requireSuperAdmin` |
| **Export Companies** | Client / Server CSV | Export actual filtered company dataset without sensitive credentials | `requireAuth`, `requireSuperAdmin` |

---

## 5. Implementation Roadmap

1. **Phase 2 & 7**: Enhance backend endpoints in `server/src/routes/super.routes.ts`:
   - Extend `GET /api/super/tenants` to support pagination (`page`, `limit`), search (`search`), plan filter (`plan`), status filter (`status`), and primary custom domain lookup.
   - Provide summary statistics (`stats`) including total, active, inactive, locations count, and trend sparklines.
   - Fix `PUT /api/super/tenants/:id` to properly update company name and logo.
   - Clean up duplicate `DELETE /api/super/tenants/:id` handler.
   - Enhance `POST /api/super/tenants` with slug pre-validation and plan assignment.
2. **Phase 2**: Update KPI summary cards with real database metrics and skeleton loaders.
3. **Phase 3**: Update Companies List table to render authentic database data, fallback initials for logos without mock images, real plan names, custom/subdomain URLs, and verified user/employee counts.
4. **Phase 4 & 5**: Fix edit company workflow, add company workflow, and ensure policy cache invalidation works.
5. **Phase 6**: Wire dynamic plans into filter dropdown, wire status filter, implement server-side pagination controls, and ensure CSV export uses real data.
6. **Phase 8 & 9**: Implement TanStack Query real-time refetching on mutations, skeleton loaders, and error states.
7. **Phase 10**: Execute automated verification tests against the Supabase database.
