# 10. SaaS ERP Architecture Master Plan

Mode: **PLANNING ONLY.** No code is generated or run from this pack. Companion files: `11_Marketplace_CMS_and_Billing_Flow.md` (public CMS, cart, checkout, tenant and super-admin add-on pages) and `12_Addon_Catalog_and_Engines.md` (all add-ons grouped into reusable engines, manifests, build waves). The HRMS pack (`hrms-plan/00` to `04`) remains the detailed spec for the HR and Employee apps.

Stack (from your `docs.tsx`): React 18 + TypeScript + Vite, TanStack Router (file-based) and Query, shadcn/Tailwind; Node 20 + Express + Prisma + MySQL 8; Socket.io; Razorpay; single schema with `tenant_id` on every tenant table.

---

## 1. What your current app already has (read from `docs.tsx`)

| Area | Current state | Gap for the new architecture |
|---|---|---|
| Portals | Super Admin `/super/*` (login `/super-login`); Vendor/Company Admin `/_authenticated/_app/*` (login `/auth`); Employee `/employee-dashboard`; Client `/client-dashboard` | One shared "company admin" shell holds HRMS, CRM, POS, Projects, Accounting, etc. mixed together. No per-product portal, no app launcher |
| Tenant resolution | Login sends `tenantSlug` in the request body; JWT carries `tenant_id` | Tenant is not taken from the host/subdomain; no custom-domain flow; a token can be replayed on a different workspace URL |
| Commercial layer | Plans, `TenantAddon` table, `requireAddon('slug')`, `useAddon('slug')`, `/marketplace`, Razorpay subscribe + webhook | Only 4 add-ons (assets, okr, ai-studio, biometric-sync); no catalog model (categories, media, reviews, versions, bundles), no cart/coupon/checkout/order/invoice pipeline, no public CMS storefront |
| Isolation | `WHERE tenant_id` injected by middleware | Needs automated tests and a second guard (see section 9) |
| Docs page | Public `/docs` calling `/docs/metadata` and `/docs/execute` (API tester) | Contains claims like "100% core completion, 0 missing" and fixed counts (117 routes, 421 endpoints) that go stale; should be gated and generated from the registries below |

Reading: the **business modules exist**; what is missing is the **platform layer** (domains, entitlements, marketplace, portals, registries). That layer is what this plan defines.

---

## 2. Architecture overview

```
                       ┌────────────────────────── {BASE_DOMAIN} (root) ──────────────────────────┐
                       │ CMS site · /pricing · /addons (marketplace storefront) · cart · checkout │
                       │ signup · workspace finder · docs · status                                │
                       └───────────────┬───────────────────────────────────────────┬──────────────┘
                                       │ signup / purchase                          │ staff
                          ┌────────────▼───────────┐                   ┌────────────▼───────────┐
                          │ {workspace}.{BASE}     │                   │ admin.{BASE}           │
                          │ (or custom domain)     │                   │ Super Admin console    │
                          │ Tenant platform shell  │                   │ tenants · plans ·      │
                          │ App launcher           │                   │ add-on manager · CMS · │
                          └─┬───────────────────┬──┘                   │ orders · domains       │
          /tenant (admin)   │                   │ Product apps         └────────────────────────┘
          marketplace,      │   /hr  /me  /crm  /finance  /inventory  /pos  /projects  /support  /it  /client
          add-ons, billing  │   (each gated by entitlement + permission, sidebar from registry)
                            ▼
              ONE API (`/api/v1/*`, tenant from host) · ONE DB schema (`tenant_id`) · Redis · Socket.io · jobs
```

Layers (build in this order): **(1) Platform core** (domains, auth/session, tenants, entitlements, registries) -> **(2) Commerce** (catalog, cart, orders, billing, marketplace UIs) -> **(3) Product apps** (HRMS, CRM, Finance, Inventory, POS, Projects, Support, IT) -> **(4) Add-on engines** (integration hub, SMS gateway, AI service, strategy studio, social login, storage connectors, backup) -> **(5) CMS and growth**.

---

## 3. Product, plan, add-on and entitlement model

### 3.1 Vocabulary
| Term | Meaning | Examples |
|---|---|---|
| **Product (app)** | A sellable suite with its own portal prefix and sidebar | HRMS (`/hr`, `/me`), CRM (`/crm`), Finance (`/finance`), Inventory (`/inventory`), POS (`/pos`), Projects (`/projects`), Support (`/support`), IT Admin (`/it`) |
| **Module** | A group of pages inside a product, enabled by plan | Attendance, Leave, Payroll, Recruitment |
| **Add-on** | A purchasable extension of a product or the platform | Biometric Attendance, SWOT, MSG91 SMS, Backup and Restore |
| **Plan** | A bundle: base products + included modules + quotas + included add-ons | Starter, Business, Enterprise |
| **Entitlement** | The resolved right of a tenant to use something | `hrms.core`, `addon.biometric`, `quota.employees=200` |

### 3.2 Entitlement resolution (single source of truth)
`Tenant entitlements = Plan inclusions + purchased add-ons + trials + super-admin grants/overrides - suspensions`.

- Stored as `TenantEntitlement` rows (`key`, `source` plan/purchase/trial/grant, `status`, `startsAt`, `endsAt`, `seats`, `quota`), recomputed on every commerce event and cached per tenant.
- Enforced in **four** places, always from the same data: (1) backend `requireEntitlement(key)` on every route; (2) frontend navigation registry hides locked items and shows an "Upgrade/Buy" state; (3) quota services (max employees, storage, SMS credits, AI credits); (4) scheduler jobs skip unentitled tenants.
- Existing `TenantAddon` and `requireAddon()` become a thin wrapper over entitlements (no breaking change).
- Lifecycle: `TRIAL -> ACTIVE -> PAST_DUE (grace) -> SUSPENDED -> CANCELLED`; on removal, data is kept read-only for N days then archived; reinstall restores.
- Realtime: `entitlement.changed` pushes to the tenant room so menus update without reload.

### 3.3 Manifest-driven modules and add-ons (the "proper way")
Every product module and add-on ships a **manifest** (data, versioned in the repo and mirrored in the DB catalog): `slug, name, category, type, version, requires[], conflicts[], provides{ nav items, routes, permissions, settings groups, jobs, webhook events, widgets, seed data, DB models }, entitlementKey, pricing, regions`. A registry loads manifests at boot and **derives** the sidebar, permission catalog, settings screens, job schedule, and the marketplace listing. Adding an add-on = adding a manifest plus its pages and endpoints. Details in file 12.

---

## 4. Domain and subdomain architecture

### 4.1 Hosts
| Host | Purpose | App |
|---|---|---|
| `{BASE}` and `www.{BASE}` | Marketing CMS, `/pricing`, `/addons` marketplace storefront, cart, checkout, signup, docs | Public site |
| `admin.{BASE}` | Super Admin console (separate cookie jar, optional IP allow-list, mandatory 2FA) | Super admin |
| `{workspace}.{BASE}` | A tenant workspace (all portals) | Tenant platform |
| Custom domain `hr.customer.com` | Same workspace on the customer's domain | Tenant platform |
| `api.{BASE}` (optional) | Public API for integrations (API-key auth); the web apps call **same-origin `/api`** so the host identifies the tenant | API |
| `auth.{BASE}` | Central OAuth/SSO callback (one redirect URI per provider for all tenants) | Auth |
| `status.{BASE}`, `docs.{BASE}` | Status page and public developer docs | Public |

Reserved workspace slugs: `www, admin, api, auth, app, mail, status, docs, super, hr, me, tenant, cdn, static, assets` and brand names.

### 4.2 Host resolution (every request, first middleware)
1. Read `X-Forwarded-Host` (proxy sets it). Classify:
   - root/www -> public site
   - `admin.` -> super admin context (no tenant)
   - `{slug}.{BASE}` -> lookup tenant by slug
   - anything else -> lookup `TenantDomain` (verified custom domain) -> tenant
   - none -> "Workspace not found" page (HTTP 404)
2. Attach `req.tenant`; check tenant status (`suspended` -> suspended page; `cancelled` -> export-only page; `trial_expired` -> upgrade page).
3. **Token binding:** JWT carries `tenantId`; reject if it differs from the host tenant. Super admin tokens never work on tenant hosts and vice versa.
4. Dev mode only: `{workspace}.localhost` or an `X-Workspace` header fallback.

Replace `tenantSlug` in the login body with host resolution (keep it only as a dev fallback).

### 4.3 Sessions and cookies
Host-only httpOnly, Secure, SameSite=Lax cookies; short-lived access token (15 to 30 min) + rotating refresh token (the current 7-day single token is too long); logout everywhere; 2FA (TOTP) enforceable per tenant; impersonation tokens flagged and time-limited.

### 4.4 Workspace creation (signup flow)
1. Visitor chooses a plan or add-on on the public site (cart may already hold items).
2. Signup form: company, owner name, email, phone, password, **workspace slug** (live availability check, reserved list, profanity filter), country/currency/timezone.
3. Create `Tenant`, owner `User` (role Tenant Admin), default company profile, plan entitlements/trial, seed roles/permissions/menus/master data (leave types, holidays template by state, etc.).
4. Email verification, then redirect to `https://{slug}.{BASE}/login` (or auto-login with a one-time code).
5. If the cart contained paid items: checkout continues inside the new workspace (section 11 flow in file 11).

### 4.5 Custom domain flow
1. Tenant Admin `/tenant/domain` -> "Add domain" (`hr.customer.com`).
2. System shows DNS instructions: `CNAME hr -> {tenant-slug}.{BASE}` (or A record) and a TXT verification token.
3. Background verifier checks DNS (retry with backoff, status: Pending, Verifying, Verified, Failed, with reasons).
4. On verification, TLS certificate is issued automatically (on-demand TLS: Caddy or a certificate manager with an "ask" endpoint that only approves verified domains).
5. Tenant picks **primary domain**; other hosts 301 to it; sessions are bound per host.
6. Plan gating: custom domains are an entitlement (`feature.custom_domain`).
7. Removal: release the domain, revoke certificate, redirect to the default subdomain.

### 4.6 OAuth/SSO with many tenants
Use **one central callback** `https://auth.{BASE}/oauth/callback/{provider}` registered once per provider. The `state` carries `{tenantId, nonce, returnTo, codeVerifier ref}`; after the provider responds, the auth service redirects to the tenant host with a short-lived one-time code that the tenant host exchanges for its own session. Tenants may supply their own OAuth app (client id/secret) as an add-on feature; the same central callback still applies. This avoids registering thousands of redirect URIs and works with custom domains.

---

## 5. Identity, roles and portals

### 5.1 Identity model
- **User** (login identity per tenant; email unique within the tenant) with many **roles**; types: `STAFF`, `CLIENT` (external), `VENDOR` (external), `CANDIDATE` (public career-site accounts, optional).
- **Employee** profile is optional and linked to a staff user (`userId`). A Tenant Admin/Owner may also have an Employee profile so `/me` works for them.
- **Super Admin users** live in a separate table and a separate host.

### 5.2 Apps (portals) and who uses them
| App | URL prefix | Typical roles | Entitlement key |
|---|---|---|---|
| Tenant Admin | `/tenant/*` | Tenant Owner/Admin | always |
| HR | `/hr/*` | HR Admin/Manager, Recruiter, Payroll | `hrms.core` |
| Employee | `/me/*` | every employee | `hrms.core` |
| Finance | `/finance/*` | Finance Manager, Accountant | `finance.core` |
| Sales and CRM | `/crm/*` | Sales Manager, Sales Rep | `crm.core` |
| Inventory | `/inventory/*` | Inventory Manager, Storekeeper | `inventory.core` |
| POS | `/pos/*` | Cashier, Store Manager | `pos.core` |
| Projects | `/projects/*` | Project Manager, Member | `projects.core` |
| Support/Helpdesk | `/support/*` | Support Agent, Lead | `support.core` (also an add-on) |
| IT Admin | `/it/*` | IT Admin (assets, accounts, access, devices) | `it.core` |
| Client | `/client/*` | Client contacts (projects, invoices, tickets) | `client.portal` |

Rules:
- After login the system computes `portals[]` from roles + entitlements. One portal -> go there. Several -> **App Launcher** (grid of app tiles, last-used remembered). Tenant Admin sees all entitled apps plus locked/preview tiles linking to the marketplace.
- Every app has: its own layout route, guard (auth -> entitlement -> permission -> data scope), sidebar from the Navigation Registry, header with app switcher, notifications, command search.
- Cross-app deep links use `linkTo(entityType, id)`.

### 5.3 Navigation Registry (extended)
Registry items carry `app`, `heading`, `label`, `path`, `permission`, `entitlementKey`, `addonSlug?`, `badgeSource`. Locked items (not entitled) render greyed with "Add-on" chip and open the add-on detail page in the marketplace instead of a 403.

---

## 6. Page structure by surface

### 6.1 Public CMS site (root host)
`/` Home · `/pricing` · `/addons` (marketplace) · `/addons/:slug` · `/cart` · `/checkout` · `/checkout/success` · `/features/:product` · `/solutions/:industry` · `/blog`, `/blog/:slug` · `/about` · `/contact` · `/faq` · `/docs` (public docs) · `/legal/{terms,privacy,refund,cookies}` · `/signup` · `/find-workspace` · `/login` (workspace finder redirect) · `/status`. All page content, menus, SEO and banners are managed in Super Admin CMS (section 6.2). Details in file 11.

### 6.2 Super Admin (`admin.{BASE}` or `/super/*` during transition)
| Group | Pages |
|---|---|
| Overview | Dashboard (MRR, ARR, signups, churn, trials ending, failed payments), Activity |
| Tenants | List, Tenant detail (tabs: profile, plan and entitlements, add-ons, usage and quotas, domains, users, invoices, audit, support), Provision tenant, Suspend/Reactivate, **Impersonate (audited, time-limited)** |
| Commerce | Plans, **Add-on Manager** (catalog), Add-on Categories, Bundles, Pricing, Coupons, Orders, Payments, Subscriptions, Invoices, Refunds, Tax rates |
| Marketplace content | Reviews moderation, Comments moderation, Add-on support threads |
| CMS | Pages, Sections/blocks, Menus, Blog, FAQ, Testimonials, Media, SEO, Redirects, Banners/Announcements |
| Domains | Custom domain queue (status, errors, certificate), Reserved slugs |
| Platform | System Settings (per `MasterHRMS_System_Settings_Platform_Plan`), Email templates, Integrations and connectors catalog, Feature flags, Jobs, Backups, Health |
| Support | Platform tickets, Knowledge base |
| Security | Super staff users and roles, Audit logs, Impersonation log, IP allow-list |
| Analytics | Revenue, Cohorts, Add-on adoption, Usage, Geography |

### 6.3 Tenant Admin (`{workspace}/tenant/*`)
Dashboard · Company Profile · Users · Roles and Permissions · **Apps and Modules** · **Marketplace** (`/tenant/marketplace`, `/tenant/marketplace/:slug`) · **My Add-ons** (`/tenant/addons`) · **Cart and Checkout** (`/tenant/cart`, `/tenant/checkout`) · Subscription and Usage · Billing and Invoices · Branding · Settings · **Domain** · Integrations · Data (import, export, backup and restore) · Audit Logs · Support · plus the **HR Panel group** (entire HR menu) and links to every other entitled app.

### 6.4 Product apps
- **HRMS (`/hr`, `/me`):** specified in `hrms-plan/01`, `02`, `04`.
- **Finance (`/finance`):** Dashboard, Chart of Accounts, Journal (double entry), Invoices, Bills, Payments, Banking and reconciliation, Taxes (GST), Expenses, Budgets, Reports (P&L, balance sheet, cash flow, trial balance), Fixed assets (if add-on).
- **CRM (`/crm`):** Dashboard, Leads, Contacts, Companies, Deals/Pipeline (kanban), Quotations, Activities, Calendar, Campaigns, Forms, Reports.
- **Inventory (`/inventory`):** Dashboard, Products, Categories, Warehouses, Stock movements, Adjustments, Transfers, Purchase orders, Suppliers, Reorder rules, Reports.
- **POS (`/pos`):** Register, Orders, Returns, Customers, Shifts, Cash management, Receipts and printers, Reports.
- **Projects (`/projects`):** Dashboard, Projects, Tasks (board/list/Gantt), Milestones, Timesheets, Files, Budget, Clients, Reports.
- **Support (`/support`):** Dashboard, Tickets, Categories, SLA policies, Canned replies, Knowledge base, Reports; also feeds the Client portal.
- **IT Admin (`/it`):** Dashboard, Assets and licenses, Devices, Accounts and access requests, Software inventory, Incidents, Backups, Integrations health.
- **Client (`/client`):** Dashboard, Projects, Invoices and payments, Tickets, Documents, Profile.

Each product gets its own spec file later (same format as the HRMS pack); the order is in section 10.

---

## 7. Cross-cutting platform services (build once)

1. **Entitlement and quota service** (section 3).
2. **Navigation, permission and manifest registries** (sections 3.3, 5.3).
3. **Commerce services:** catalog, cart, coupon, order, payment (Razorpay, plus gateways from System Settings), invoice (GST/VAT), subscription, dunning.
4. **Domain service:** host resolution, custom domains, certificates.
5. **Identity service:** sessions, refresh, 2FA, social login (central callback), impersonation, API keys.
6. **Notification, realtime, audit, media, search, jobs** (as defined in `hrms-plan/00`).
7. **Integration Hub, SMS gateway, AI service, Strategy Studio, Storage connectors, Backup service** (file 12).
8. **Settings service** (System Settings plan) with platform, tenant and user scopes.
9. **Observability:** structured logs with `tenantId`, metrics per tenant, error tracking, usage metering (API calls, storage, SMS and AI credits).

---

## 8. Data model additions (summary)

| Group | Tables |
|---|---|
| Tenancy | Tenant, TenantDomain (host, type, status, verifiedAt, primary, certStatus), TenantSettings, TenantStatusHistory |
| Catalog | Product, Module, Addon, AddonCategory, AddonVersion, AddonMedia, AddonBenefit, AddonDependency, Bundle, BundleItem, Plan, PlanItem, PlanQuota, Price (monthly, yearly, one-time, per-user, usage), Region/TaxRate |
| Commerce | Cart, CartItem, Coupon, CouponRule, CouponRedemption, Order, OrderItem, Payment, PaymentEvent (webhooks), Refund, Invoice, InvoiceLine, Subscription, SubscriptionItem, DunningAttempt |
| Entitlements | TenantEntitlement, EntitlementOverride, UsageRecord, QuotaCounter, AddonInstall (status, version, installedBy, logs) |
| Community | AddonReview, AddonComment, AddonSupportThread (links to Ticket) |
| CMS | CmsPage, CmsBlock, CmsMenu, BlogPost, Faq, Testimonial, Redirect, Banner |
| Identity | User (type), Role, Permission, UserRole, Session, RefreshToken, ApiKey, ImpersonationLog, SuperUser |
| Platform | Manifest (mirrored), FeatureFlag, IntegrationConnection, WebhookEndpoint/Delivery, BackupJob, AuditLog |

Every tenant table: `tenant_id` + composite indexes starting with it; commerce and catalog tables are platform-scoped (no tenant) except Cart/Order/Invoice/Subscription which carry `tenantId` (nullable for guest carts).

---

## 9. Security and isolation hardening (from your current setup)

1. Add a **database-layer guard**: a Prisma client extension that automatically injects and verifies `tenantId` on every query for tenant models; fail closed when missing. Keep route-level middleware as the second layer.
2. Automated tests: every endpoint called with Tenant A token against Tenant B ids returns 404; token/host mismatch returns 401; super admin token on a tenant host is rejected.
3. Replace the 7-day JWT with short access + refresh tokens in httpOnly cookies; add token revocation on password change, role change, tenant suspension.
4. Gate `/docs` metadata and `/docs/execute` (API tester): require authentication and a role in production; the public docs site shows only curated content.
5. Rate limits per tenant and per IP; payment webhook signature checks; idempotent order/payment handlers.
6. Impersonation: reason required, time limit, banner, read-only default, full audit.
7. Secrets for integrations encrypted at rest (settings plan); never in logs or realtime payloads.
8. Add-on uninstall must not leave orphaned webhooks, jobs or API keys.

---

## 10. Roadmap (phases and gates)

| Phase | Name | Scope | Gate | Status |
|---|---|---|---|---|
| A0 | Audit and decisions | Reconcile `docs.tsx` claims with reality (page-by-page status), confirm decisions in section 11, produce gap list and estimates | Owner approves plan | **Complete (Approved)** |
| A1 | Platform core | Host/subdomain resolution, token binding, refresh sessions, tenant status pages, app launcher, Navigation/Permission/Manifest registries, entitlement service wrapping `TenantAddon`, reserved slugs, signup + workspace creation, tenant login | Two-tenant isolation tests pass; each host resolves correctly | **Complete (Approved)** |
| A2 | Portals re-homing | Move existing pages into `/tenant`, `/hr`, `/me`, `/crm`, `/finance`, `/inventory`, `/pos`, `/projects`, `/support`, `/it`, `/client` (see `hrms-plan/04`); sidebars from registry; legacy redirects | Every sidebar link opens a real page | **Complete (Approved — 26/26 tests passed)** |
| A3 | Commerce core | Catalog models, add-on manager (super admin), cart, coupons, orders, Razorpay + webhooks, invoices, entitlement activation, subscription lifecycle | Buy an add-on end to end; entitlement toggles menu live | **Complete (Approved — 67/67 tests passed; A3.6 policy aligned)** |
| A4 | Marketplace UIs | Public CMS `/addons`, detail page, cart, checkout; tenant marketplace and My Add-ons; reviews/comments/support tabs | Guest-to-purchase and in-tenant purchase both pass | **In Progress (Current Flow)** |
| A5 | Domains | Custom domain add/verify/certificate/primary/redirect; central OAuth callback | Custom domain works with login and OAuth | **Partial / In Progress** |
| A6 | Add-on engines | Integration Hub, SMS gateway, AI service, Strategy Studio, social login, storage connectors, backup/restore (file 12) | Each engine ships with at least 2 add-ons using it | Not started |
| A7 | Add-on waves | Roll out add-ons by wave (file 12 section 6) | Per add-on Definition of Done | Not started |
| A8 | CMS and growth | CMS manager, blog, SEO, banners, analytics, referral/affiliate (optional) | Marketing site editable without code | Not started |

Each phase updates `docs/Saas/worklog.md` ("SaaS Platform Track") and has acceptance tests.

---

## 11. Decisions

### 11.0 Owner answers received (2026-10-09)
- **Pricing:** mixed (monthly/yearly, one-time, per-user, usage-based). A0 inventories each path separately (file 13).
- **Packaging:** hybrid HRMS. A0 proposes core / optional add-on / undecided per capability; nothing is enforced during A0.
- **CRM:** treated as standalone candidate; dependencies on HRMS documented, independence not assumed.
- **Domains:** subdomains first (`{workspace}.{BASE_DOMAIN}`, tenant-bound auth in A1). Custom domains are a later phase (A5); no domain provisioning in A0.
- Still open: questions 4 to 10 below (payments and tax regions, trials, marketplace reviews, `admin.` host, merges, white label, hosting).

### Original list
(questions) (also in worklog Open Questions)

1. **Pricing model:** subscription per plan + per add-on (monthly/yearly), one-time purchase, per-user pricing, or a mix?
2. **Core vs add-on:** which HRMS capabilities are in the base plan and which are add-ons? (Today you list Recruitment, Training, Performance, Assets, Timesheet, Biometric, Support Ticket as add-ons, but they already exist as core pages.)
3. **Product packaging:** is CRM sold as a separate product (own plan) or only as an add-on inside HRMS? Can a tenant buy CRM without HRMS?
4. **Payments:** Razorpay only, or Stripe/PayPal too? Currencies and tax (GST India only, or VAT/other regions such as the EU e-invoice and ZATCA add-ons)?
5. **Trials:** free trial length, credit card required, which add-ons can be trialed?
6. **Marketplace data:** reviews/comments only from verified buyers? Moderation?
7. **Domains:** is `admin.{BASE}` acceptable for Super Admin, and do you want custom domains in launch scope?
8. **Add-on duplicates** (file 12 section 5): confirm merges and removals.
9. **White label:** can tenants remove your branding (plan feature)?
10. **Hosting:** where does production run (single server, Kubernetes, managed)? Needed for wildcard TLS and on-demand certificates.

---

## 12. Prompt to paste to your agent

> You are the lead architect for our multi-tenant SaaS ERP (React + TanStack Router/Query, Express, Prisma, MySQL). We are in **planning mode: do not write or run code and do not modify files.** Read `10_SaaS_Architecture_Master_Plan.md`, `11_Marketplace_CMS_and_Billing_Flow.md`, `12_Addon_Catalog_and_Engines.md` and our `docs.tsx`. Step 1 (read-only audit): for each portal and module in the codebase, list route, status, whether it checks tenant from the host, and whether entitlements are enforced; list how `TenantAddon`, `requireAddon`, `useAddon`, plans and `/marketplace` work today; list where login reads `tenantSlug`. Step 2 (deliver): (a) target architecture diagram and host resolution rules, (b) Prisma schema diff for tenancy, catalog, commerce, entitlements, CMS (as tables), (c) manifest format and registries design, (d) full route map per app and the Navigation Registry data, (e) API list for catalog, cart, checkout, orders, entitlements, domains, (f) state machines for order, payment, subscription, domain, add-on install, (g) migration plan from the current routes (`/_authenticated/_app/*`, `/employee-dashboard`, `/client-dashboard`, `/marketplace`) to the new structure with backward-compatible redirects, (h) phased tasks with estimates and acceptance tests, (i) risks and answers to section 11. Rules: tenant is resolved from the host; entitlements are the single source of truth for access; add-ons are manifest-driven; secrets never in logs; no hardcoded lists. Ask me before assuming.
