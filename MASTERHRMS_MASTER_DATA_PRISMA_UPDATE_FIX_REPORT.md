# MASTERHRMS — Master Data Generic Prisma Update Schema Fix Report

## Executive Summary
This document provides empirical verification and an audit trail for fixing the runtime Prisma error (`Unknown argument updatedBy`) during activation, de-activation, and editing of Designations, Departments, and Branches via `server/src/blueprints/master-data.blueprint.ts`.

---

## 1. Exact Root Cause Analysis
In `server/src/blueprints/master-data.blueprint.ts`, the generic `PUT /:id` update handler previously executed:
```typescript
const payload = { ...req.body };
delete payload.id;
delete payload.tenantId;
delete payload.createdAt;
if (req.user?.userId) {
  payload.updatedBy = req.user.userId;
}

const updated = await tx[modelName].update({
  where: { id: req.params.id },
  data: payload,
  select: select || undefined,
});
```

### Issues Identified:
1. **Schema Mismatch**: Neither `Designation`, `Department`, nor `Branch` in `server/prisma/schema.prisma` or PostgreSQL defines an `updatedBy` column. Assigning `payload.updatedBy = req.user.userId` caused Prisma Client to reject the invocation with `Unknown argument updatedBy`.
2. **Missing Input Allowlisting**: Unvalidated client request bodies were passed into `tx[modelName].update()` and `tx[modelName].create()`. Any extra or relation fields triggered Prisma schema validation errors.
3. **Actor Attribution Separation**: Actor attribution was conflated with entity column mutations. Actor attribution is already authoritatively tracked in the `AuditLog` table via `AuditService.logMutation()`.

---

## 2. Actual Prisma & Database Model Fields Supported

### Database Verification (`information_schema.columns`):
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('branches', 'departments', 'designations');
```

| Model | Database Table | Physical Scalar Columns | Has `updatedBy`? | Has `updatedAt`? |
| :--- | :--- | :--- | :--- | :--- |
| **Branch** | `branches` | `id`, `tenant_id`, `name`, `code`, `address`, `phone`, `email`, `status`, `created_at`, `updated_at`, `latitude`, `longitude`, `geofence_radius` | **NO** | **YES** (`updated_at`) |
| **Department** | `departments` | `id`, `tenant_id`, `branch_id`, `name`, `description`, `status`, `created_at` | **NO** | **NO** |
| **Designation** | `designations` | `id`, `tenant_id`, `department_id`, `name`, `description`, `status`, `created_at`, `updated_at` | **NO** | **YES** (`updated_at`) |

---

## 3. Architecture & Code Changes

### File Changed:
`server/src/blueprints/master-data.blueprint.ts`

### Key Remediations:
1. **Explicit Field Allowlist Matrix**:
   Defined `MASTER_DATA_ALLOWED_FIELDS` specifying the valid updatable/creatable scalar fields for each master data model:
   - `branch`: `["name", "code", "address", "phone", "email", "latitude", "longitude", "geofenceRadius", "status"]`
   - `department`: `["name", "description", "branchId", "status"]`
   - `designation`: `["name", "description", "departmentId", "status"]`
   - `awardType`: `["name", "icon", "description"]`
   - `holiday`: `["name", "date", "type", "year", "description", "branchIds", "stateCodes", "status"]`
   - `holidayType`: `["name", "description", "color", "status"]`
2. **Dynamic DMMF Fallback Resolver**:
   Implemented `resolveModelAllowedFields(modelName, configAllowed)` to inspect custom config or fallback to Prisma DMMF scalar fields (stripping `id`, `tenantId`, `createdAt`, `updatedAt`).
3. **Safe Payload Filtering**:
   Implemented `buildModelSafePayload(rawBody, allowedFields)` to strip unsupported or malicious attributes from incoming payloads.
4. **Clean Update Handler (`PUT /:id`)**:
   - Removed unconditional `payload.updatedBy = req.user.userId`.
   - Validates that the filtered payload contains at least one updatable field, returning `HTTP 400` on empty/invalid input.
   - Updates `tx[modelName].update()` using only model-safe data.
   - Automatically maintains Prisma `@updatedAt` behavior for models with `updatedAt`.
5. **Clean Create Handler (`POST /`)**:
   - Uses `buildModelSafePayload(req.body, allowedFields)`.
   - Only assigns `createdBy` or `updatedBy` if the model's allowlist explicitly includes them.
6. **Defensive Bulk Archive (`POST /bulk-archive`)**:
   - Filters `ids` to non-empty strings, preventing `Null` argument errors in Prisma `where: { id: { in: validIds } }`.
7. **Actor Attribution Preservation**:
   - Preserves transactional audit logging via `AuditService.logMutation(..., tx)` with `actorId: req.user?.userId`, `tenantId`, `action: ${ENTITY}_UPDATE`, and full `oldState` / `newState` snapshots.

---

## 4. Empirical API Verification Results

Executed via `scripts/verify_all_lifecycle_operations_phase3.cjs` against local API server (`port 4000`) and live PostgreSQL database:

### Designation Lifecycle
| Operation | HTTP Request | HTTP Status | Database Verification | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Create (Inactive)** | `POST /api/organization/designations` | `201 Created` | `status = 'inactive'` | **PASSED** |
| **Activate** | `PUT /api/organization/designations/:id` `{ status: "active" }` | `200 OK` | `status = 'active'` | **PASSED** |
| **De-activate** | `PUT /api/organization/designations/:id` `{ status: "inactive" }` | `200 OK` | `status = 'inactive'` | **PASSED** |
| **Edit** | `PUT /api/organization/designations/:id` `{ name: "...", description: "..." }` | `200 OK` | Name & description updated | **PASSED** |
| **Delete** | `DELETE /api/organization/designations/:id` | `200 OK` | Record removed | **PASSED** |

### Department Lifecycle
| Operation | HTTP Request | HTTP Status | Database Verification | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Create (Active)** | `POST /api/organization/departments` | `201 Created` | `status = 'active'` | **PASSED** |
| **De-activate** | `PUT /api/organization/departments/:id` `{ status: "inactive" }` | `200 OK` | `status = 'inactive'` | **PASSED** |
| **Re-activate** | `PUT /api/organization/departments/:id` `{ status: "active" }` | `200 OK` | `status = 'active'` | **PASSED** |
| **Edit** | `PUT /api/organization/departments/:id` `{ name: "..." }` | `200 OK` | Name updated | **PASSED** |
| **Delete** | `DELETE /api/organization/departments/:id` | `200 OK` | Record removed | **PASSED** |

### Branch Lifecycle
| Operation | HTTP Request | HTTP Status | Database Verification | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Create (Active)** | `POST /api/organization/branches` | `201 Created` | `status = 'active'` | **PASSED** |
| **De-activate** | `PUT /api/organization/branches/:id` `{ status: "inactive" }` | `200 OK` | `status = 'inactive'` | **PASSED** |
| **Re-activate** | `PUT /api/organization/branches/:id` `{ status: "active" }` | `200 OK` | `status = 'active'` | **PASSED** |
| **Edit** | `PUT /api/organization/branches/:id` `{ address: "...", phone: "..." }` | `200 OK` | Address & phone updated | **PASSED** |
| **Delete** | `DELETE /api/organization/branches/:id` | `200 OK` | Record removed | **PASSED** |

### Input Validation & Security Guards
| Test Scenario | Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Duplicate Name Guard** | `PUT` existing department name | `HTTP 400 Bad Request` | `HTTP 400: 'A Department with this name already exists'` | **PASSED** |
| **Invalid Fields Rejection** | `PUT` `{ maliciousField: "foo" }` | `HTTP 400 Bad Request` | `HTTP 400: 'No valid updatable fields provided'` | **PASSED** |
| **Unsupported Field Stripping** | `PUT` `{ status: "active", updatedBy: "hacker" }` | `HTTP 200 OK` | `status = 'active'`, `updatedBy` stripped, no error | **PASSED** |
| **Cross-Tenant Update** | Tenant A token updates Tenant B ID | `HTTP 404 Not Found` | `HTTP 404: 'Designation not found'` | **PASSED** |
| **Cross-Tenant Delete** | Tenant A token deletes Tenant B ID | `HTTP 404 Not Found` | `HTTP 404: 'Department not found'` | **PASSED** |
| **Dependency Guard Delete** | `DELETE` department with employees | `HTTP 409 Conflict` | `HTTP 409: 'Cannot delete Department because 2 employee(s) are assigned'` | **PASSED** |

### Audit Trail Verification in Database
```sql
SELECT id, tenant_id, actor_id, action, entity_type, entity_id, created_at 
FROM audit_logs 
WHERE entity_id = '<testDesigId>';
```
- Verified: Rows inserted into `audit_logs` table with `actor_id = 'user-hr-001'`, `action = 'DESIGNATION_UPDATE'`, `entity_type = 'Designation'`.

---

## 5. Automated Regression & Acceptance Test Results

### 1. Server Unit & Blueprint Regression Suite
**Command:** `./server/node_modules/.bin/tsx server/src/tests/master-data-blueprint.test.ts`
- `resolveModelAllowedFields returns strictly validated scalar fields without updatedBy`: **PASSED**
- `buildModelSafePayload strips unsupported fields (updatedBy, createdBy, etc.)`: **PASSED**
- `PUT /designations/:id updates status to inactive without passing updatedBy to Prisma`: **PASSED**
- `Department lifecycle activation and de-activation succeeds`: **PASSED**
- `Branch lifecycle update accepts valid fields without updatedBy`: **PASSED**
- `Rejects update request containing only invalid fields with HTTP 400`: **PASSED**
- `Cross-tenant update returns HTTP 404 (strictly rejected)`: **PASSED**
- `Transaction safely rolls back and reports HTTP 400 on database failure`: **PASSED**
- `Prevents duplicate name update within same tenant`: **PASSED**
- **Total: 9 passed, 0 failed (100% pass rate)**

### 2. End-to-End API Lifecycle Suite
**Command:** `node scripts/verify_all_lifecycle_operations_phase3.cjs`
- **Total: 25 passed, 0 failed (100% pass rate)**

### 3. Organization Master Data API Acceptance Suite
**Command:** `node scripts/verify_organization_master_data_acceptance.cjs`
- **Result:** Completed with `0` errors. All department, designation, and branch operations passed.

### 4. Playwright End-to-End Browser Tests
**Command:** `node scripts/verify_organization_master_data_playwright.cjs`
- **Viewports Tested:** Desktop (`1440x900`), Tablet (`768x1024`), Mobile (`390x844`).
- **Interactive UI Lifecycle Test:** Tested status toggle directly in the UI with confirmation modal dialogs:
  - Designation de-activated via UI dialog without schema error.
  - Designation re-activated via UI dialog without schema error.
- **Evidence Screenshots Generated:**
  - `docs/hrms-audit/evidence/org-master-data/departments_desktop.png`
  - `docs/hrms-audit/evidence/org-master-data/departments_tablet.png`
  - `docs/hrms-audit/evidence/org-master-data/departments_mobile.png`
  - `docs/hrms-audit/evidence/org-master-data/departments_add_modal_desktop.png`
  - `docs/hrms-audit/evidence/org-master-data/designations_desktop.png`
  - `docs/hrms-audit/evidence/org-master-data/designations_tablet.png`
  - `docs/hrms-audit/evidence/org-master-data/designations_mobile.png`
  - `docs/hrms-audit/evidence/org-master-data/branches_desktop.png`
  - `docs/hrms-audit/evidence/org-master-data/branches_tablet.png`
  - `docs/hrms-audit/evidence/org-master-data/branches_mobile.png`

### 5. TypeScript Verifications
| Scope | Command | Result |
| :--- | :--- | :--- |
| **Server** | `npm --prefix server run build` (`prisma generate && tsc`) | **0 Errors (Exit Code 0)** |
| **CMS** | `npm run cms:typecheck` (`tsc --noEmit`) | **0 Errors (Exit Code 0)** |
| **Root Workspace** | `npm run typecheck` (`tsc --noEmit`) | **0 Errors (Exit Code 0)** |

---

## 6. Constraints Adherence Verification
- [x] Did not use `as any` to bypass Prisma validation.
- [x] Did not add `updatedBy` or non-standard columns to Prisma models or PostgreSQL.
- [x] Preserved tenant isolation and authorization checks.
- [x] Did not reset, truncate, or delete existing database records.
- [x] Did not run destructive migrations.
- [x] Did not change production configuration.
- [x] Did not commit or push.
- [x] Every test reported was actually executed and logged.

---

## 7. Remaining Blockers
- **None.** All lifecycle operations (create, activate, de-activate, edit, bulk archive, delete) for Designations, Departments, and Branches function correctly without runtime Prisma schema errors.

