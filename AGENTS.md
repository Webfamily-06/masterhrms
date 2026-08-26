# Master Workspace — Global ERP SaaS Architecture & Module Development Constitution

This project is a multi-tenant enterprise ERP & HRMS SaaS platform built with:
- **Frontend**: React + TypeScript + Vite + TanStack Router & Query + TailwindCSS + Radix UI
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + WebSockets
- **Database**: MySQL (Single Schema Multi-Tenant with strict `tenant_id` isolation)

---

# 1. ABSOLUTE CONSTITUTIONAL RULES

Before implementing any new module, feature, or route:
1. **Audit First**: Inspect existing database schema (`prisma/schema.prisma`), shared services, APIs, tenant isolation, and UI design system. Never immediately start coding.
2. **Never Invent a Second Architecture**: Reuse centralized auth (`requireAuth`), tenant isolation (`tenant_id`), RBAC (`requireRole`/`requirePermission`), Add-on entitlement engine (`requireAddon` / `useAddon`), billing/invoices, audit logs, file storage, notifications, and UI components.
3. **Strict Multi-Tenant Isolation**: All tenant-owned tables MUST include `tenant_id`. Enforce isolation at Backend, Query Layer, API, Exports, Search, and WebSockets.
4. **Separation of Platform vs Tenant**:
   - **Super Admin**: Platform-wide controls (tenants, subscriptions, plans, payment gateways, marketplace add-ons, global CMS, system audit logs).
   - **Tenant Admin / Employees**: Organization-level operations (HRMS, OKRs, Assets, ERP modules).
5. **No Mock / Hardcoded Logic**: Real Prisma MySQL transactions, real calculated values, real RBAC checks, dynamic tenant currency formatting (`formatSystemAmount`).
6. **Module Lifecycle Standard**:
   `Audit -> Requirements & Gaps -> DB Architecture -> API Specs -> Backend -> UI -> RBAC -> Addon Entitlement -> Integration & Audit -> Testing -> Verification & Lock`.

---

# 2. STANDARDIZED DATA & API PATTERNS

- **Database Tables**: `snake_case` (e.g. `employees`, `asset_assignments`, `okr_objectives`, `tenant_addons`).
- **Primary & Foreign Keys**: `id` (UUID or CUID), `tenant_id`, `employee_id`, `user_id`.
- **Protected API Execution Order**:
  `requireAuth` -> `Tenant Isolation Verification` -> `requirePermission / requireRole` -> `requireAddon (if paid add-on)` -> `Business Logic Validation` -> `Audit Activity Log`.
- **UI Design System**: Compact, high-information-density corporate ERP aesthetic. Consistent tables (search, filter, pagination, export), modal dialogs, drawer passports, and zero dummy/hardcoded mock data.
