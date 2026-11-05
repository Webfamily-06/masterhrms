# MASTERHRMS — HOLIDAY MANAGEMENT & ORGANIZATION CALENDAR INTEGRATION
## PHASE 0: READ-ONLY ARCHITECTURE, DATABASE & CALENDAR AUDIT REPORT

**Audit Date**: November 5, 2026  
**Auditor**: Senior SaaS HRMS Architect & Full-Stack Systems Engineer  
**Scope**: Holiday Management (`/hr/organization/holidays`), HR Calendar (`/hr/calendar`), Employee Calendar (`/me/calendar`), Backend APIs, Database Models, and Calendar Event Projections.

---

## 1. EXISTING DATABASE MODELS & SUPABASE TABLES

### A. The `holidays` Table
- **Table Name**: `public.holidays` (mapped in `server/prisma/schema.prisma` lines 5691-5707).
- **Physical PostgreSQL Schema**:
  | Column Name | Data Type | Nullable | Default | Notes |
  | :--- | :--- | :---: | :--- | :--- |
  | `id` | `character varying(36)` | NO | UUID | Primary Key |
  | `tenant_id` | `character varying(36)` | NO | None | Multi-tenant isolation |
  | `name` | `character varying(255)` | NO | None | Holiday title/name |
  | `date` | `timestamp without time zone` | NO | None | Holiday date |
  | `type` | `character varying(50)` | NO | `'public'` | Holiday type string |
  | `year` | `integer` | NO | None | Year index |
  | `description` | `text` | YES | None | Optional description |
  | `branch_ids` | `ARRAY text[]` | YES | `ARRAY[]::text[]` | Facility applicability |
  | `state_codes` | `ARRAY text[]` | YES | `ARRAY[]::text[]` | Regional applicability |
  | `created_at` | `timestamp without time zone` | NO | `now()` | Audit timestamp |
  | `updated_at` | `timestamp without time zone` | NO | None | Audit timestamp |
- **Current Row Count**: `0` rows (clean baseline).
- **Missing Domain Field**:
  - `status`: Currently absent in physical table and Prisma model. Must be added additively: `status varchar(30) DEFAULT 'active'`.

### B. The `holiday_types` Table
- **Current State**: Does **NOT** exist as a physical table. Holiday types have historically been loose string literals (e.g. `'public'`).
- **Phase 1 Requirement**: Create an additive `holiday_types` table to support HR custom type management:
  - `id`: `varchar(36) PRIMARY KEY`
  - `tenant_id`: `varchar(36) NOT NULL`
  - `name`: `varchar(100) NOT NULL`
  - `description`: `text NULL`
  - `color`: `varchar(30) DEFAULT '#10b981'`
  - `status`: `varchar(20) DEFAULT 'active'`
  - `created_at` & `updated_at`
  - `@@unique([tenantId, name])`
  - Default seeded types: *Public Holiday, National Holiday, Religious Holiday, Optional Holiday, Company Holiday, Restricted Holiday*.

### C. The `calendar_events` Table
- **Table Name**: `public.calendar_events` (mapped in `server/prisma/schema.prisma` lines 4816-4856).
- Supports ad-hoc events, recurrence rules, visibility (`team`, `organization`, `private`), and category (`general`, `holiday`, `meeting`, etc.).

---

## 2. EXISTING CALENDAR INTEGRATION MECHANISM

Inspection of `server/src/services/calendar.service.ts` reveals a sophisticated **Composite Projection Engine**:
```typescript
/**
 * Projects a composite view of events across authoritative domain tables:
 * 1. Meetings (Phase P7)
 * 2. Training Sessions (Phase P7)
 * 3. Approved Leave Requests (Phase P3)
 * 4. Official Holidays (Phase P2)
 * 5. Ad-Hoc Calendar Events
 */
```
- **How Holidays are Projected**:
  In `CalendarService.getEvents(tenantId, options)` (lines 214–245):
  ```typescript
  const holidays = await db.holiday.findMany({
    where: {
      tenantId,
      date: { gte: startFilter, lte: endFilter },
    },
    take: 50,
  });
  ```
  Each holiday is projected with:
  - `id`: `holiday-${h.id}` (stable deterministic composite ID)
  - `title`: `Holiday: ${h.name}`
  - `category`: `"holiday"`
  - `sourceDomain`: `"organization"`
  - `sourceId`: `h.id`
  - `allDay`: `true`
  - `linkTo`: `isHR ? '/hr/organization/holidays' : '/me/organization/holidays'`
  - `badgeColor`: `"bg-emerald-500/15 text-emerald-700 border-emerald-500/30"`
- **Critical Findings & Deficiencies**:
  1. `CalendarService` currently projects all holidays without checking `status === "active"`. Deactivated holidays would erroneously appear on the calendar.
  2. The calendar endpoints `/api/v1/hr/calendar/events` and `/api/v1/me/calendar/events` delegate to `CalendarService.getEvents()`.
  3. `server/src/routes/calendar.routes.ts` (`/api/calendar/events`) queries `CalendarEvent` directly, but also needs either to include the projected holidays or let `CalendarService` supply the unified feed.

---

## 3. EXISTING BACKEND ROUTES & API ENDPOINTS

1. **Organization Master Data Holidays**:
   - `server/src/routes/organization.routes.ts`:
     ```typescript
     organizationRouter.use(
       "/holidays",
       holidayDateNormalizer,
       createMasterDataRouter({
         modelName: "holiday",
         entityName: "Holiday",
         searchFields: ["name", "description", "type"],
         uniqueFields: [],
       })
     );
     ```
   - Routes exposed:
     - `GET /api/v1/hr/organization/holidays` (with pagination, sort, search, filters)
     - `POST /api/v1/hr/organization/holidays` (create holiday)
     - `GET /api/v1/hr/organization/holidays/:id` (fetch single)
     - `PUT /api/v1/hr/organization/holidays/:id` (update holiday / status toggle)
     - `DELETE /api/v1/hr/organization/holidays/:id` (delete holiday)
     - `POST /api/v1/hr/organization/holidays/bulk-archive` (bulk de-activate)
2. **Workspace Legacy Endpoint**:
   - `server/src/routes/workspace.routes.ts`:
     - `GET /api/workspace/holidays`
3. **Collaboration / Calendar Endpoints**:
   - `server/src/routes/hr-collaboration.routes.ts`: `GET /api/v1/hr/calendar/events`
   - `server/src/routes/me-collaboration.routes.ts`: `GET /api/v1/me/calendar/events`

---

## 4. EXISTING FRONTEND WORKSPACE IMPLEMENTATIONS

1. **HR Workspace**:
   - TanStack: `src/routes/_authenticated/hr/organization/holidays.tsx`
   - Next.js CMS: `CMS/src/app/(workspace)/hr/organization/holidays/page.tsx`
   - **Current UI State**:
     - Basic KPI cards (Total Holidays, Public Holidays, Upcoming).
     - Standard table displaying name, date, day of week, type, and actions.
     - Add Holiday dialog with fields: Title, Date, Type, Description.
     - Lacks: Advanced 3-card colorful KPI redesign, De-activate/Activate confirmation modals, Holiday Type management drawer/dialog, duplicate-date warning, branch applicability selectors.
2. **Employee Workspace**:
   - TanStack: `src/routes/_authenticated/me/organization/holidays.tsx`
   - Next.js CMS: `CMS/src/app/(workspace)/me/organization/holidays/page.tsx`
   - Read-only calendar and holiday list for authenticated employee.
3. **Calendar Views**:
   - HR Calendar: `src/routes/_authenticated/hr/calendar.tsx` & `CMS/.../hr/calendar/page.tsx`
   - Employee Calendar: `src/routes/_authenticated/me/calendar.tsx` & `CMS/.../me/calendar/page.tsx`

---

## 5. SECURITY & ROLE-BASED ACCESS CONTROL (RBAC)

- **HR Roles**: `["hr_admin", "super_admin", "tenant_admin"]`
  - Full CRUD on `/api/v1/hr/organization/holidays` and `/api/v1/hr/organization/holiday-types`.
- **Employee Roles**: `["employee", "manager"]`
  - Read-only access to active holidays for their tenant & branch.
  - Strictly blocked from `POST`, `PUT`, `DELETE` operations via server-side `requireRoles(["hr_admin", "super_admin", "tenant_admin"])`.
- **Tenant Context**:
  - Enforced via `resolveTenantContext` and `req.user.tenantId`. All queries strictly scoped to `tenantId`.

---

## 6. IMPLEMENTATION PLAN

1. **Database Schema Enhancements (Phase 1)**:
   - Add additive column `status varchar(30) DEFAULT 'active'` to `holidays` table in PostgreSQL and update `server/prisma/schema.prisma`.
   - Create additive table `holiday_types` (`id`, `tenant_id`, `name`, `description`, `color`, `status`, `created_at`, `updated_at`).
   - Seed default tenant holiday types idempotently.
2. **Backend API Enhancements (Phase 2 & 3)**:
   - Update `organization.routes.ts`:
     - Add `holidayDateNormalizer` with duplicate date/type checking and year auto-assignment.
     - Add dedicated `holiday-types.routes.ts` mounted under `/api/v1/hr/organization/holiday-types`.
   - Update `CalendarService.getEvents()`:
     - Filter only `status = 'active'` holidays.
     - Include holiday type color dynamically.
3. **Frontend Holiday Management Refinement (Phase 2, 6, 7, 8)**:
   - Modernize `/hr/organization/holidays` in both `src/` and `CMS/src/`:
     - Remove heading icons.
     - Redesign 3 KPI Cards (`StatsOverviewGrid columns={3}`): Total Holidays (Blue), Public/Mandatory (Emerald), Optional/Restricted (Amber).
     - De-activate / Activate confirmation dialogs (purging "Archive").
     - Search, status filter, type filter, year filter, 10/25/50/100 pagination.
     - Holiday Types manager (dialog/tab to create and edit types).
4. **Calendar Integration & Employee Verification (Phase 4, 5, 9, 10)**:
   - Verify that holidays appear in `/hr/calendar` and `/me/calendar` as distinct emerald holiday badges with details popover.
   - Verify employee read-only restrictions and absence of unauthorized edit controls.
   - Run complete Playwright E2E and write all required phase reports.

