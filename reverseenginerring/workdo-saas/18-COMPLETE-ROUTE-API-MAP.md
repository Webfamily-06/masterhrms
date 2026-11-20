# 18 — MASTERHRMS Complete Route & API Map
> Status: **IMPLEMENTED** | Evidence from Codebase Audit

---

## 1. Backend Express API Route Map

All routes are mounted in `server/src/index.ts`. All `/api/*` endpoints (except explicit safe routes like `/api/auth`, `/api/billing`, `/api/health`, `/api/super`) pass through `requireActiveSubscription`.

### 1.1 Platform Core, Super Admin & Identity

| Route Prefix / Path | Router File | Guard Middleware | Key Capabilities |
|---------------------|-------------|------------------|------------------|
| `/api/auth`, `/api/v1/auth` | `routes/auth.routes.ts` | `authRateLimiter` | Login, Register, Forgot Password, Reset Password, 2FA Verification, Token Refresh |
| `/api/super` | `routes/super.routes.ts` | `requireAuth`, `requireSuperAdmin` | Platform management, workspace policies, plan configuration, multilingual packs, config audit, system backups |
| `/api/super/compliance` | `routes/compliance-control.routes.ts` | `requireSuperAdmin` | Compliance Control Center, audit trail enforcement |
| `/api/super/storage` | `routes/super-storage.routes.ts` | `requireSuperAdmin` | Platform-wide storage quotas and assets |
| `/api/workspace` | `routes/workspace.routes.ts`, `routes/workspace-routing.routes.ts` | Varies | Workspace verification, slug availability check, onboarding setup |
| `/api/workspace/custom-domain` | `routes/tenant-domain.routes.ts` | `requireAuth`, `resolveTenantContext` | Domain registration, DNS record provisioning, DNS CNAME verification |
| `/api/cms` | `routes/cms.routes.ts` | Public / `requireSuperAdmin` | Public landing pages, blog articles, pricing definitions, platform legal docs |

### 1.2 SaaS Monetization, Billing & Subscriptions

| Route Prefix | Router File | Guard Middleware | Key Capabilities |
|--------------|-------------|------------------|------------------|
| `/api/billing` | `routes/billing.routes.ts` | Public / `requireAuth` | `/public-plans`, `/checkout`, `/verify`, `/durations`, `/invoices`, Razorpay/Stripe webhooks |
| `/api/commerce` | `routes/commerce.routes.ts` | `requireAuth`, `resolveTenantContext` | Addon and plan cart, order checkout, order simulation |
| `/api/addons` | `routes/addons.routes.ts` | `requireAuth`, `resolveTenantContext` | `/entitlements`, `/:addonSlug/trial`, `/:addonSlug/subscribe`, `/:addonSlug/cancel` |

### 1.3 Enterprise Modular ERP Suites

| Route Prefix | Router File | Entitlement / Role Guard | Capabilities |
|--------------|-------------|--------------------------|--------------|
| `/api/employees`, `/api/hr/employees` | `routes/employees.routes.ts` | `resolveTenantContext`, `requireProduct("hrms")` | Employee registry, contracts, bank details, salary structures |
| `/api/attendance` | `routes/attendance.routes.ts` | `requireProduct("hrms")` | Check-in/out, punch logs, regularization, shift roster |
| `/api/leave`, `/api/leaves` | `routes/leave.routes.ts` | `requireProduct("hrms")` | Leave ledger, leave balances, leave approval workflow |
| `/api/payroll`, `/api/payroll/cycles` | `routes/payroll.routes.ts`, `routes/payroll-cycles.routes.ts` | `requireProduct("hrms")` | Payroll cycles, salary assignment, payslips, execution traces |
| `/api/crm` | `routes/crm.routes.ts` | `requireProduct("crm")` | Lead pipeline, customers, deals, quotation builder |
| `/api/products` | `routes/products.routes.ts` | `requireProduct("inventory")` | Catalog items, SKUs, inventory tracking, warehouses |
| `/api/sales` | `routes/sales.routes.ts` | `requireProduct("sales")` | Sales orders, customer invoices, payments |
| `/api/purchases` | `routes/purchases.routes.ts` | `requireProduct("purchases")` | Vendor purchase orders, goods receipt notes |
| `/api/accounting` | `routes/accounting.routes.ts` | `requireProduct("finance")` | Chart of accounts, journal entries, balance sheet, P&L |
| `/api/projects` | `routes/projects.routes.ts` | `requireProduct("projects")` | Projects, sprint tasks, Kanban boards, milestones |

### 1.4 Add-on Modules & Integration APIs

| Route Prefix | Router File | Entitlement Guard | Capabilities |
|--------------|-------------|-------------------|--------------|
| `/api/addons/okr` | `routes/okr.routes.ts` | `requireAddon("okr")` | OKR cycles, quarterly objectives, key results check-ins |
| `/api/addons/assets` | `routes/assets.routes.ts` | `requireAddon("assets")` | IT & physical assets, depreciation schedules, custody logs |
| `/api/v1/backup-restore` | `modules/backup-restore/backup-restore.routes.ts` | `requireAddon("backup-restore")` | JSON snapshots, dry-run restore, retention policy |
| `/api/v1/activity-logs` | `modules/activity-logs/activity-logs.routes.ts` | `requireAddon("activity-logs")` | System audit trail, RFC 4180 CSV export |
| `/api/v1/outbound-webhooks` | `modules/outbound-webhooks/outbound-webhooks.routes.ts` | `requireAddon("outbound-webhooks")` | Webhook endpoints, HMAC-SHA256 signing, delivery logs |
| `/api/v1/sms-gateway` | `modules/sms-gateway/sms-gateway.routes.ts` | `requireAddon("sms-gateway")` | Multi-provider SMS gateway (Twilio, MSG91, Fast2SMS) |
| `/api/v1/two-factor-auth` | `modules/two-factor-auth/two-factor.routes.ts` | `requireAddon("two-factor-auth")` | TOTP setup, backup codes, 2FA challenge verification |
| `/api/v1/public-api` | `modules/public-api/public-api.routes.ts` | `requireAddon("public-api")` | Developer API key management, OpenAPI v3 spec |
| `/api/recruitment` | `routes/recruitment.routes.ts` | `requireAddon("recruitment")` | Job postings, applicant tracker, candidate evaluations |
| `/api/biometric` | `routes/biometric.routes.ts` | `requireAddon("biometric")` | Biometric device manager, eSSL/ZKTeco sync, push protocol |

---

## 2. Frontend TanStack Router Map

**Directory:** `src/routes/`

### 2.1 Public & Authentication Routes

- `/` (`src/routes/index.tsx`) — Public SaaS marketing landing page
- `/login` (`src/routes/login.tsx`) — Workspace / platform user sign-in
- `/register` (`src/routes/register.tsx`) — New tenant organization onboarding registration
- `/super-login` (`src/routes/super-login.tsx`) — Super Admin authentication
- `/addons` (`src/routes/addons.index.tsx`) — Addon marketplace catalog
- `/addons/:slug` (`src/routes/addons_.$slug.tsx`) — Addon product detail page
- `/docs` (`src/routes/docs.tsx`) — Developer documentation portal
- `/verify-2fa` (`src/routes/verify-2fa.tsx`) — TOTP challenge entry
- `/verify-certificate` (`src/routes/verify-certificate.tsx`) — Public certificate verification resolver

### 2.2 Super Admin Console (`src/routes/_authenticated/super/`)

- `/super` (`index.tsx`) — Executive dashboard, tenant counts, monthly revenue
- `/super/tenants` (`tenants.tsx`) — Tenant workspace registry, policy overrides, suspension toggles
- `/super/plans` (`plans.tsx`) — Subscription plan builder, feature matrices, pricing intervals
- `/super/coupons` (`coupons.tsx`) — Discount promo codes management
- `/super/transactions` (`transactions.tsx`) — Global payment audit trail, invoice viewer
- `/super/domains` (`domains.tsx`) — Custom domain approvals, DNS diagnostics
- `/super/email-templates` (`email-templates.tsx`) — System HTML email template editor
- `/super/backup` (`backup.tsx`) — Platform database snapshots, disposable restore testing
- `/super/marketplace` (`marketplace.tsx`) — Addon registry, pricing, featured status
- `/super/languages` (`languages.tsx`) — Multilingual phrase dictionary editor
- `/super/compliance` (`compliance.tsx`) — Compliance Control Center
- `/super/settings` (`settings.tsx`) — Global SMTP, payment gateway credentials, platform branding

### 2.3 Tenant Administration (`src/routes/_authenticated/tenant/`)

- `/tenant/dashboard` (`dashboard.tsx`) — Tenant admin overview
- `/tenant/subscription` (`subscription.tsx`) — Current plan, renewal status, seat limits
- `/tenant/billing` (`billing.tsx`) — Payment history, invoice PDF downloads
- `/tenant/domain` (`domain.tsx`) — Custom domain configuration & DNS instructions
- `/tenant/branding` (`branding.tsx`) — Workspace white-label branding (logo, colors, app name)
- `/tenant/modules` (`modules.tsx`) — Enabled ERP module toggles
- `/tenant/integrations` (`integrations.tsx`) — Addon marketplace & active integrations
- `/tenant/roles` (`roles.tsx`) — RBAC role builder & permission assignments
- `/tenant/users` (`users.tsx`) — User management & seat utilization
- `/tenant/data` (`data.tsx`) — Tenant backup snapshot exports & guarded restores
- `/tenant/audit-logs` (`audit-logs.tsx`) — Workspace security audit log viewer

### 2.4 Human Resources & ERP Modules (`src/routes/_authenticated/hr/`)

- `/hr/dashboard` (`dashboard.tsx`) — HR dashboard metrics
- `/hr/employees/*` (`employees/`) — Employee profiles, documents, contracts, bank info
- `/hr/attendance/*` (`attendance/`) — Real-time attendance, biometric punches, regularizations, shifts
- `/hr/leave/*` (`leave/`) — Leave balances, policy rules, leave approvals
- `/hr/payroll/*` (`payroll/`) — Salary structures, payroll runs, payslip generation, tax deductions
- `/hr/recruitment/*` (`recruitment/`) — Job vacancies, candidate pipeline, offer letters
- `/hr/performance/*` (`performance/`) — KPI indicators, appraisals, OKR objective tracking
- `/hr/assets/*` (`assets/`) — Asset custody, depreciation calculations
- `/hr/calendar` (`calendar.tsx`) — Company events & automated reminders
- `/hr/todo` (`todo.tsx`, `todo.gantt.tsx`) — Task management & Gantt view
- `/hr/chat/*` (`chat.tsx`, `chat.calls.tsx`) — Real-time messaging, WebRTC audio/video calls

### 2.5 Employee Self-Service (ESS) (`src/routes/_authenticated/me/`)

- `/me` (`index.tsx`) — Employee personal portal
- `/me/attendance` — Personal punch records, attendance regularization requests
- `/me/leave` — Personal leave balance, leave applications
- `/me/payroll` — Personal payslip downloads, tax declarations
- `/me/documents` — Employee document upload & acknowledgement
- `/me/requests/profile-changes` — Personal info change requests (address, bank details)
