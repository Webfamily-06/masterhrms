# Panel Mapping — Platform vs Tenant Boundaries
**Project:** Master HRMS / ERP SaaS
**Date:** 2026-10-01
**Status:** FINAL — Corrected and Verified

---

## CRITICAL DISTINCTION

> **Platform Super Admin is NOT Tenant IT Admin.**
> These are two separate security domains with separate routes, layouts, middleware, and data scopes.

---

## Panel 1 — Platform Super Admin

| Property | Value |
|---|---|
| Route Prefix | `/super/*` |
| Frontend Layout | `SuperShell` (`src/routes/_authenticated/super/route.tsx`) |
| Backend Router | `superRouter` mounted at `/api/super` |
| Backend Middleware | `requireAuth` + `requireSuperAdmin` on EVERY endpoint |
| Required Role | `super_admin` ONLY |
| Data Scope | Cross-tenant, platform-wide |
| Login Page | `/super-login` |

### Routes in this Panel

| Route | Component | Description |
|---|---|---|
| `/super` | `super/index.tsx` | Platform dashboard |
| `/super/tenants` | `super/tenants.tsx` | Tenant workspace management |
| `/super/tenant-usage-metrics` | `super/tenant-usage-metrics.tsx` | Tenant usage analytics |
| `/super/plans` | `super/plans.tsx` | Subscription plans |
| `/super/transactions` | `super/transactions.tsx` | Platform billing transactions |
| `/super/domains` | `super/domains.tsx` | Custom domain management |
| `/super/roles` | `super/roles.tsx` | Platform RBAC matrix |
| `/super/users` | `super/users.tsx` | Platform user management |
| `/super/marketplace` | `super/marketplace.tsx` | Addons marketplace |
| `/super/cms` | `super/cms.tsx` | Visual CMS Studio |
| `/super/blogs` | `super/blogs.tsx` | Blog management |
| `/super/case-studies` | `super/case-studies.tsx` | Case studies |
| `/super/media` | `super/media.tsx` | Platform media library |
| `/super/tenant-support-tickets` | `super/tenant-support-tickets.tsx` | Cross-tenant support tickets |
| `/super/agents` | `super/agents.tsx` | Support agents |
| `/super/sla-policies` | `super/sla-policies.tsx` | Platform SLA policies |
| `/super/escalation-rules` | `super/escalation-rules.tsx` | Escalation rules |
| `/super/support` | `super/support.tsx` | Global support desk |
| `/super/email-templates` | `super/email-templates.tsx` | Platform email templates |
| `/super/notifications` | `super/notifications.tsx` | Broadcast alerts |
| `/super/settings` | `super/settings.tsx` | Platform settings (SMTP, platform name) |
| `/super/analytics` | `super/analytics.tsx` | Platform analytics |
| `/super/languages` | `super/languages.tsx` | i18n / localization |
| `/super/backup` | `super/backup.tsx` | Database backups |
| `/super/api-docs` | `super/api-docs.tsx` | API reference |
| `/super/profile` | `super/profile.tsx` | Super admin profile |

### What This Panel Does NOT Include
- Tenant employee records
- Tenant leave/attendance/payroll
- Tenant IT Admin dashboard (`/it-admin-dashboard` — see Panel 3)
- Tenant-level settings, departments, or roles

---

## Panel 2 — Tenant Administration

| Property | Value |
|---|---|
| Route Prefix | `/_authenticated/_app/*` (selected admin routes) |
| Frontend Layout | `AppShell` (`src/routes/_authenticated/_app/route.tsx`) |
| Backend Routers | Multiple: `workspaceRouter`, `employeesRouter`, etc. |
| Backend Middleware | `requireAuth` + tenant context + `requirePermission` |
| Required Roles | `admin`, `hr_admin`, `Workspace Admin` |
| Data Scope | Single tenant only |

### Key Admin Routes

| Route | Required Role | Description |
|---|---|---|
| `/settings` | admin, hr_admin, manager | Organization settings, workspace config |
| `/users` | admin, Workspace Admin | Tenant user management (guarded) |
| `/it-admin-dashboard` | admin, Workspace Admin | Tenant IT/security dashboard (guarded) |
| `/ban-ip-address` | admin, Workspace Admin | Tenant IP ban management (guarded) |
| `/finance-dashboard` | admin, finance_admin, payroll_manager | Finance analytics (guarded) |

---

## Panel 3 — Tenant IT Administration (Separate from Platform Super Admin)

| Property | Value |
|---|---|
| Route | `/it-admin-dashboard` |
| Layout | `AppShell` |
| Scope | Single tenant — IT security monitoring |
| Required Role | `admin`, `Workspace Admin` (tenant-level) |
| NOT accessible by | `super_admin` via this route (super admin has own platform panel) |

> This page monitors **tenant-level** security: login activity, banned IPs, session management.
> It does NOT provide platform-wide visibility across tenants.
> It does NOT have access to platform settings, billing, or subscription management.

---

## Panel 4 — HR Administration

| Required Roles | `hr_admin`, `super_admin` |
| Routes | `/employees`, `/leave`, `/attendance`, `/payroll`, etc. |
| Scope | Tenant employees within authenticated tenant |

---

## Panel 5 — Manager Panel

| Required Roles | `manager` |
| Routes | Team leave approvals, team attendance, team performance |
| Scope | Manager's direct reports only |

---

## Panel 6 — Employee Self-Service (ESS)

| Required Roles | `employee` |
| Routes | Own profile, own leave, own attendance, own payslips |
| Scope | Own records only (JWT-enforced server-side) |

---

## Panel 7 — Finance / Payroll

| Required Roles | `finance_admin`, `payroll_manager`, `admin`, `hr_admin` |
| Routes | `/finance-dashboard`, `/payroll/*`, `/invoices/*` |
| Scope | Tenant financial data |

---

## Panel 8 — Client Portal

| Required Roles | `client` |
| Routes | `/client/*` |
| Scope | Own invoices, project status, documents shared by tenant |

---

## Impersonation (Super Admin → Tenant Context)

When `super_admin` uses the Impersonate workflow (`/super/tenants` → Impersonate button):
1. `POST /api/super/impersonate/:tenantId` issues a new JWT: `roles: ["super_admin", "admin", "hr_admin"]` + `isImpersonating: true`
2. Super admin is redirected to `/dashboard` (Tenant App shell)
3. Super admin has admin-level access to THAT tenant
4. "Leave Impersonation" button calls `POST /api/super/leave-impersonation` → restores original super admin JWT
5. This is an **explicit, auditable support workflow** — not automatic promotion
