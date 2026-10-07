# MASTERHRMS — PHASE P2 PRE-IMPLEMENTATION DISCOVERY REPORT

**Phase:** P2 Organization & Employees  
**Date:** October 7, 2026  
**Status:** DISCOVERY COMPLETE — READY FOR EXECUTION  
**Execution Doctrine:** PRESERVE FOUNDATION → IMPLEMENT P2 → VERIFY → HARD STOP  

---

## 1. EXECUTIVE OVERVIEW

Following the successful completion and approval of Phase P1 (Platform Foundation), this discovery audit assesses all existing assets, schemas, services, and endpoints relevant to **Phase P2: Organization & Employees**.

Phase P2 establishes the core organizational masters (Branches, Departments, Designations, Holidays, Announcements, Award Types, Org Structure) and full employee lifecycle operations (Directory, 8-Step Creation Wizard, Employee 360, CSV/Excel Import, Employee Self-Service Directory & Profile with approval workflow).

---

## 2. EXISTING DATA MODELS AUDIT

An inspection of `server/prisma/schema.prisma` confirms the status of P2-relevant models:

| Model | Schema Status | Mapping & Notes |
| :--- | :--- | :--- |
| `Branch` | **Present** (`branches`) | `id`, `tenantId`, `name`, `code`, `address`, `phone`, `email`, `status`. Relations: `departments`, `employees`. |
| `Department` | **Present** (`departments`) | `id`, `tenantId`, `branchId`, `name`, `description`, `status`. Relations: `branch`, `employees`, `designations`. |
| `Designation` | **Present** (`designations`) | `id`, `tenantId`, `departmentId`, `name`, `description`, `status`. Relations: `department`, `employees`. |
| `Employee` | **Present** (`employees`) | Comprehensive schema with statutory fields (`pan`, `aadhaar`, `uan`, `esiNumber`, `bankAccount`, etc.), relations to `Branch`, `Department`, `Designation`, `User`, `manager`/`subordinates`. |
| `Announcement` | **Present** (`announcements`) | `id`, `tenantId`, `title`, `summary`, `content`, `category`, `priority`, `targetType`, `targetDepartmentId`, `isPinned`, `publishDate`, `authorId`, `acknowledgementRequired`. |
| `AnnouncementAcknowledgement` | **Present** (`announcement_acknowledgements`) | `id`, `announcementId`, `employeeId`, `tenantId`, `acknowledgedAt`. Unique on `[announcementId, employeeId]`. |
| `AwardType` | **Present** (`award_types`) | `id`, `tenantId`, `name`, `icon`, `description`. Unique on `[tenantId, name]`. |
| `EmployeeChangeRequest` | **Present** (`employee_change_requests`) | `id`, `tenantId`, `employeeId`, `requestType`, `currentValue`, `proposedValue`, `reason`, `status`, `reviewedBy`, `reviewedAt`, `rejectionReason`. |
| `Holiday` | ❌ **MISSING** | Currently only mocked on the frontend (`_app/holidays.tsx` calls non-existent `/workspace/holidays`). Must be added to `schema.prisma` and registered in `tenant-models.config.ts`. |

### Database Action Required:
1. Add `Holiday` model to `server/prisma/schema.prisma`:
   ```prisma
   model Holiday {
     id          String    @id @default(uuid()) @db.VarChar(36)
     tenantId    String    @map("tenant_id") @db.VarChar(36)
     name        String    @db.VarChar(255)
     date        DateTime
     type        String    @default("public") @db.VarChar(50) // public, national, company, optional
     year        Int
     description String?   @db.Text
     branchIds   String[]  @default([]) @map("branch_ids")
     stateCodes  String[]  @default([]) @map("state_codes")
     createdAt   DateTime  @default(now()) @map("created_at")
     updatedAt   DateTime  @updatedAt @map("updated_at")

     tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

     @@index([tenantId, year])
     @@map("holidays")
   }
   ```
2. Add `holidays Holiday[]` relation to `Tenant` model.
3. Register `Holiday` in `DIRECT_TENANT_MODELS` in `server/src/config/tenant-models.config.ts`.
4. Run `npx prisma db push` and `npx prisma generate`.

---

## 3. EXISTING APIS AUDIT

| Endpoint Pattern | File | Current Capability | P2 Action |
| :--- | :--- | :--- | :--- |
| `/api/v1/hr/masters/departments` | `platform-foundation.routes.ts` | P1 Master Blueprint CRUD | Expose alias `/api/v1/hr/organization/departments` |
| `/api/v1/hr/masters/branches` | `platform-foundation.routes.ts` | P1 Master Blueprint CRUD | Expose alias `/api/v1/hr/organization/branches` |
| `/api/v1/hr/masters/designations` | `platform-foundation.routes.ts` | P1 Master Blueprint CRUD | Expose alias `/api/v1/hr/organization/designations` |
| `/api/employees` | `employees.routes.ts` | Legacy employee search, CRUD, PII masking | Keep legacy intact; implement `/api/v1/hr/employees` with data scope & `allowedActions[]` |
| `/api/announcements` | `announcements.routes.ts` | Legacy announcement endpoints | Expose clean `/api/v1/hr/organization/announcements` and `/api/v1/me/organization/announcements` |
| `/api/employee-self-service/profile` | `employee-self-service.routes.ts` | ESS profile read & update | Expose clean `/api/v1/me/profile` connecting to `WorkflowService` for sensitive fields |
| `/api/v1/hr/organization/holidays` | — | Non-existent | Implement using `createMasterDataRouter` with year/branch filter support |
| `/api/v1/me/organization/holidays` | — | Non-existent | Implement employee-scoped holiday view |
| `/api/v1/hr/organization/award-types` | — | Non-existent | Implement using `createMasterDataRouter` |
| `/api/v1/hr/organization/structure` | — | Non-existent | Implement hierarchy aggregation endpoint (tree of Branch -> Department -> Designation -> Employee) |
| `/api/v1/me/organization/structure` | — | Non-existent | Implement employee-safe organization tree (FLS applied) |
| `/api/v1/hr/employees/import` | — | Legacy `/bulk-import` lacks dry-run | Implement dry-run validation report + confirm commit |

---

## 4. EXISTING LEGACY UI & MAPPING

The existing flat routes in `src/routes/_authenticated/_app/` remain 100% operational:
- `employees.tsx`: Flat directory and modal edit.
- `employee-details.tsx`: Flat employee details view.
- `departments.tsx`, `designations.tsx`: Legacy management tables.
- `holidays.tsx`: Frontend UI with calendar and list modes.
- `announcements.tsx`: Legacy announcement board.

In P2, clean, authoritative routes are created under:
- `src/routes/_authenticated/hr/`:
  - `organization/structure.tsx` (and `organization/tree.tsx`)
  - `organization/branches.tsx`
  - `organization/departments.tsx`
  - `organization/designations.tsx`
  - `organization/holidays.tsx`
  - `organization/announcements.tsx`
  - `organization/award-types.tsx`
  - `employees/index.tsx`
  - `employees/new.tsx` (8-step wizard)
  - `employees/$id.tsx` (Employee 360)
  - `employees/import.tsx` (Dry-run import)
- `src/routes/_authenticated/me/`:
  - `employees.tsx` (Company Directory)
  - `organization/structure.tsx`
  - `organization/holidays.tsx`
  - `organization/announcements.tsx`
  - `profile.tsx` (Self-service profile with change request workflow)

---

## 5. REUSABLE P1 FOUNDATION SERVICES

All P2 implementations will strictly consume the proven P1 foundation:
1. **Tenant Isolation:** `getTenantDb()` via `prisma-proxy.facade.ts` ensuring zero cross-tenant leakage.
2. **Master Data Blueprint:** `createMasterDataRouter({ modelName, entityName, searchFields, uniqueFields })` for uniform master CRUD.
3. **Data Scope Engine:** `resolveUserSecurityContext()` and `buildDataScopePrismaFilter()` supporting `SELF`, `TEAM_DIRECT`, `TEAM_ALL`, `DEPARTMENT`, `BRANCH`, `ALL`.
4. **Field-Level Security:** `applyFieldSecurityMask()` ensuring sensitive statutory details (Aadhaar, PAN, Bank Account) are only exposed to authorized roles.
5. **Allowed Actions:** `attachAllowedActions()` server-side computation based on record state and user permissions.
6. **Transactional Outbox & Realtime:** `OutboxService.queueEvent()` emitting:
   - `employee.created`, `employee.updated`, `employee.organization_changed`
   - `announcement.created`, `announcement.published`
   - `holiday.created`, `holiday.updated`
   - `profile.change_requested`, `profile.change_approved`, `profile.change_rejected`
7. **Workflow Engine:** `WorkflowService.submitRequest()` for approval-required employee profile edits (`EmployeeChangeRequest`).
8. **Notification Engine:** `NotificationService.send()` for announcements and approval notifications.
9. **Audit Trail:** `AuditService.recordLog()` logging all mutations without logging raw sensitive PII values.
10. **Shared UI Hooks:** `useMasterList()`, `useMasterForm()`, and `MediaPickerModal`.

---

## 6. SECURITY & GOVERNANCE CONSIDERATIONS

1. **Fail-Closed Tenant Isolation:** Every query must enforce `tenantId` derived from verified JWT session, never frontend input.
2. **Statutory PII Protection:**
   - Raw values of PAN, Aadhaar, Bank Account, Salary are NEVER exposed to non-HR roles.
   - Audits log field changes (e.g. `pan: [CHANGED]`) rather than plaintext values.
3. **Profile Modification Boundary:**
   - Direct edit allowed: `phone`, `personalEmail`, `profilePhoto`, `skills`.
   - Approval required via Workflow: `legalName`, `dob`, `bankAccount`, `pan`, `aadhaar`, `address`.

---

## 7. REALTIME EVENT SPECIFICATION

All mutations enqueue outbox events:
- `hr:employee:created` -> room `tenant:${tenantId}:hr`
- `hr:employee:updated` -> room `tenant:${tenantId}:hr` and `tenant:${tenantId}:user:${userId}`
- `hr:announcement:published` -> room `tenant:${tenantId}:general`
- `hr:holiday:updated` -> room `tenant:${tenantId}:general`
- `hr:profile:change_requested` -> room `tenant:${tenantId}:hr`

---

## 8. TEST PLAN & MATRIX

1. **Database & Isolation:**
   - Verify `Holiday` model schema push and fail-closed proxy interception.
2. **Organization Masters:**
   - Branch, Department, Designation, Holiday, AwardType CRUD + duplicate checks.
3. **Employee Wizard Transaction:**
   - Verify 8-step creation executes atomically: Employee + User + Outbox + Audit.
   - Rollback test: simulated failure rolls back all created entities.
4. **Employee Directory & Scope:**
   - Verify `SELF`, `DEPARTMENT`, `ALL` filters and PII masking.
5. **Employee Import:**
   - Validate invalid headers, duplicate codes, missing foreign keys in dry-run stage.
6. **Profile Workflow:**
   - Direct edit succeeds immediately; approval-required field submits workflow request.
7. **Frontend Production Build:**
   - `npm run build` succeeds with zero TypeScript/lint errors.

---

## 9. OPEN QUESTIONS

None. The schema, specifications (`00_Architecture_and_Conventions.md`, `01_HR_Panel_Spec.md`, `02_Employee_Portal_Spec.md`), and P1 baseline provide complete, unambiguous guidance.

---

## 10. IMPLEMENTATION SEQUENCE

```text
[Step 1] Add Holiday model to schema.prisma + update tenant-models.config.ts + push & generate
[Step 2] Organization Master APIs (/api/v1/hr/organization/*) + Org Structure aggregation
[Step 3] Frontend Organization Master Pages (/hr/organization/* and /me/organization/*)
[Step 4] Employee Backend Service (/api/v1/hr/employees, 8-step wizard transaction, import dry-run)
[Step 5] Employee Directory UI (/hr/employees) & Employee 360 UI (/hr/employees/$id)
[Step 6] 8-Step Employee Wizard UI (/hr/employees/new)
[Step 7] Employee Import UI (/hr/employees/import)
[Step 8] Employee Self-Service UI (/me/employees, /me/profile with workflow modal)
[Step 9] Automated Test Suites & Verification
[Step 10] Production Build + Final P2 Report + Worklog Update -> HARD STOP
```
