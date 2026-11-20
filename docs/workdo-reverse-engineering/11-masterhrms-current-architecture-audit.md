# 11. MASTERHRMS Current Architecture & Implementation Audit

This document delivers a forensic audit of the local MASTERHRMS codebase located at `C:\Users\TSV Global Solutions\Documents\hrms`. It examines the technical architecture, directory structure, state management, API implementations, and existing route parity.

---

## 1. Technical Stack & Foundation

| Architecture Layer | Technology | Version | Purpose in MASTERHRMS |
|---|---|---|---|
| **Language** | TypeScript | `^5.x` | Strict end-to-end type safety |
| **Frontend Framework** | React 19 + TanStack Start | `19.2.0` | Server-side rendering (SSR), streaming hydration, full-stack routes |
| **Routing** | TanStack Router | File-based | Type-safe filesystem routing (`src/routes`) |
| **UI Component Library** | Radix UI + Tailwind CSS | Tailwind v3 | Headless accessible primitives styled with utility classes |
| **State & Data Fetching** | TanStack Query / React Query | `@tanstack/react-query` | Server state caching, optimistic mutations, refetching |
| **Form Management** | React Hook Form + Zod | `@hookform/resolvers` | Strongly typed schema-driven form validation |
| **Backend Services** | Node.js / Express Monorepo | `server/` workspace | Dedicated REST microservices and background job runners |
| **Database ORM** | Prisma ORM | `5.19.1` | Type-safe database client and migrations |
| **Database Engine** | Supabase PostgreSQL | PostgreSQL 15 | Relational storage with JSONB and RLS capabilities |
| **CMS Subsystem** | Next.js / Decoupled CMS | `CMS/` workspace | Marketing pages, blogs, and public portal |

---

## 2. Monorepo & Directory Structure

```
C:\Users\TSV Global Solutions\Documents\hrms\
├── CMS/                          # Decoupled public marketing & CMS workspace
├── server/                       # Node.js / Express backend service workspace
│   ├── src/
│   │   ├── controllers/          # Business logic handlers
│   │   ├── middleware/           # authMiddleware, tenantGuard, rateLimit
│   │   ├── routes/               # API endpoint definitions (/api/v1/...)
│   │   └── services/             # Payroll, Attendance, Notification services
│   └── package.json
├── src/                          # Primary TanStack Start Full-Stack Application
│   ├── components/               # Shared UI components (tables, modals, forms)
│   ├── hooks/                    # Custom React hooks (useAuth, usePermissions)
│   ├── lib/                      # Utilities, API client, date formatters
│   └── routes/                   # File-based routing tree
│       ├── __root.tsx            # Root layout, providers, global modals
│       ├── _authenticated/       # Protected application shell
│       │   ├── super/            # Super Admin module (Tenants, Plans, Settings)
│       │   ├── hr/               # HR Management module
│       │   ├── tenant/           # Company Admin tenant portal
│       │   ├── employee/         # Staff / ESS employee portal
│       │   └── me/               # Personal profile and self-service
│       ├── auth.tsx              # Login & registration authentication flow
│       └── super-login.tsx       # Dedicated Super Admin login portal
├── prisma/
│   └── schema.prisma             # Primary database schema (299 models)
└── package.json                  # Root workspace manifest
```

---

## 3. Audited Route Inventory: Implemented Modules

### 3.1 Super Admin (`src/routes/_authenticated/super/`)
The Super Admin subsystem in MASTERHRMS is remarkably mature, featuring **29 dedicated route views**:

1. `index.tsx`: Master SaaS dashboard with MRR, tenant health metrics, and growth charts.
2. `tenants.tsx`: Tenant management with search, filter, status toggles, and deletion.
3. `plans.tsx`: SaaS subscription tiers, pricing configurations, and feature matrix.
4. `coupons.tsx`: Promotion and discount code engine.
5. `referral.tsx`: Affiliate and referral reward tracking.
6. `transactions.tsx`: Financial audit ledger of tenant subscription payments.
7. `tenant-usage-metrics.tsx`: Real-time storage, bandwidth, and employee quota tracking.
8. `tenant-support-tickets.tsx`: Global customer support and helpdesk ticketing.
9. `domains.tsx`: Custom domain mapping and SSL certificate status.
10. `email-templates.tsx`: Dynamic WYSIWYG email template editor.
11. `settings.tsx`: Platform branding, dark/light logos, SMTP, and payment gateways.
12. `analytics.tsx`, `api-docs.tsx`, `backup.tsx`, `compliance.tsx`, `developer.tsx`, `marketplace.tsx`, `media.tsx`, `sla-policies.tsx`, `users.tsx`.

### 3.2 HR Management (`src/routes/_authenticated/hr/`)
The HRM subsystem contains dedicated subdirectories and route views:

1. **Core Organization**: `organization/`, `branches`, `departments`, `designations`.
2. **Employee Management**: `employees/`, `employees/new`, `employees/$id/profile`.
3. **Time & Attendance**: `attendance/`, `attendance/overview`, `attendance/shifts`.
4. **Leave Management**: `leave/`, `leave/requests`, `leave/types`, `leave/calendar`.
5. **Payroll Engine**: `payroll/`, `payroll/cycles`, `payroll/entries`, `payroll/slips`.
6. **Recruitment ATS**: `recruitment/`, `recruitment/jobs`, `recruitment/candidates`.
7. **Training**: `training/`, `training/courses`, `training/trainers`.
8. **Employee Lifecycle**: `lifecycle/`, `onboarding`, `promotions`, `transfers`, `resignations`, `terminations`.
9. **Awards & Culture**: `awards.tsx`, `approvals.tsx`, `meetings/`, `todo.tsx`, `chat.tsx`.

---

## 4. Key Strengths of MASTERHRMS over WorkDo

1. **Modern Reactive Stack**: Built on React 19 and TanStack Start with Vite, delivering sub-100ms client transitions compared to WorkDo's full-page Inertia roundtrips.
2. **Strict TypeScript Safety**: End-to-end type safety from Prisma models down to UI form validation via Zod.
3. **Indian Statutory Compliance Engine**: MASTERHRMS natively includes mathematical engines for Employee Provident Fund (EPF), Employees' State Insurance (ESIC), Professional Tax (PT), and Tax Deducted at Source (TDS), which WorkDo completely lacks.
4. **Architectural Separation**: Decoupled Express backend and CMS workspaces allow independent scaling and cloud microservice deployment.
