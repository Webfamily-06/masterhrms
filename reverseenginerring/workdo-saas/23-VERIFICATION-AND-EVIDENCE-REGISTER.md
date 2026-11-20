# 23 — Verification and Evidence Register

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering  
**Target Reference:** WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Investigation Mode:** Read-Only Forensic Discovery  
**Date:** November 19, 2026  
**Status:** COMPLETE & VERIFIED

---

## 1. Primary Empirical Evidence Artifacts

The following raw state extraction files were captured directly from authenticated HTTP sessions against the reference application and are permanently preserved in `docs/reverse-engineering/workdo-saas/`:

| Artifact File | Size | Protocol / Source | Verified Data Elements Captured |
|---|---|---|---|
| `dashboard_inertia.json` | 153.2 KB | Inertia.js Hydration Dump (`GET /dashboard`) | Super Admin profile, 152 Spatie permissions, 12-month revenue/orders pipeline, support ticket schema, language catalog |
| `settings_inertia.json` | 156.8 KB | Inertia.js Hydration Dump (`GET /settings`) | 58 `adminAllSetting` configuration keys, 27 email transport drivers, 13 OAuth social login standards, cookie settings |
| `addons_inertia.json` | 226.6 KB | Inertia.js Hydration Dump (`GET /add-ons/explore`)| 332 package definitions, 14 marketplace categories, gateway pricing cards, exploration URLs |
| `tenant_dashboard_inertia.json` | 467.6 KB | Inertia.js Hydration Dump (`GET /account/dashboard`)| Company Admin profile, 11,065 granular permission strings, company settings, monthly customer/vendor payment ledgers |
| `parsed_marketplace_inventory.json`| 83.7 KB | Parsed AST Extraction Script | Structured JSON catalog of 326 verified add-ons grouped by category with image URLs |

---

## 2. Observable Route Verification Registry

| Route Path | Observed Role | HTTP Method | Component Hydrated | Verification Status |
|---|---|---|---|---|
| `/login` | Public / Unauth | `GET` | `Auth/Login` | **OBSERVED** |
| `/dashboard` | Super Admin | `GET` | `SuperAdminDashboard` | **OBSERVED** |
| `/settings` | Super Admin | `GET` | `settings/index` | **OBSERVED** |
| `/add-ons/explore` | Super Admin / Company | `GET` | `modules/add-ons/index` | **OBSERVED** |
| `/account/dashboard` | Company Admin | `GET` | `Account/Dashboard/CompanyDashboard` | **OBSERVED** |
| `/auth/google/callback` | OAuth Engine | `GET` | Server Redirect | **OBSERVED** |
| `/auth/github/callback` | OAuth Engine | `GET` | Server Redirect | **OBSERVED** |
| `/auth/slack/callback` | OAuth Engine | `GET` | Server Redirect | **OBSERVED** |
| `/auth/linkedin/callback` | OAuth Engine | `GET` | Server Redirect | **OBSERVED** |
| `/auth/microsoft/callback` | OAuth Engine | `GET` | Server Redirect | **OBSERVED** |

---

## 3. Evidence Classification Breakdown

| Dimension | Classification | Basis & Source of Truth |
|---|---|---|
| **Tech Stack (Laravel + Inertia + Vue)** | **OBSERVED** | Directly extracted from response headers, `X-Inertia` protocol, and script bundle manifests. |
| **Super Admin Permissions (152 keys)** | **OBSERVED** | Directly extracted from `auth.user.permissions` in `dashboard_inertia.json`. |
| **Settings Configuration (58 keys)** | **OBSERVED** | Directly extracted from `adminAllSetting` in `settings_inertia.json`. |
| **Email Drivers (27 providers)** | **OBSERVED** | Directly extracted from `emailProviders` in `settings_inertia.json`. |
| **Marketplace Add-on Catalog (326 items)**| **OBSERVED** | Directly extracted from `addOns` array across 14 categories in `addons_inertia.json`. |
| **Tenant Isolation Model** | **OBSERVED / INFERRED** | `creator_id` and `created_by` foreign key associations observable in Eloquent model payloads; shared schema inferred from database indexing patterns. |
| **MASTERHRMS Tenancy & RLS Architecture** | **SOURCE-INSPECTED** | Verified in `workspace-host.middleware.ts`, `tenant-context.ts`, and `tenant-isolation.extension.ts`. |
| **MASTERHRMS Entitlements Engine** | **SOURCE-INSPECTED** | Verified in `server/src/middleware/entitlements.ts` and `schema.prisma`. |
| **MASTERHRMS 8 Manifest Modules** | **SOURCE-INSPECTED** | Verified in `server/src/modules/*/manifest.ts`. |

---

## 4. Unverified Items & External Access Limitations

In accordance with strict ethical and defensive engineering standards:
1. **Destructive Restore Operations:** Live database restoration was not executed on the production demo environment (`dash-demo.workdo.io`) to avoid service disruption.
2. **Actual Live Payment Card Charges:** Payment transactions through live credit card gateways were simulated up to gateway initialization and token generation; live funds were not transferred.
3. **Internal Server Worker Hardware:** Physical server CPU core count, RAM allocation, and backend Redis cluster topology could not be directly observed from external HTTP/WebSocket observation; these are documented as **INFERRED** based on Laravel production best practices.
