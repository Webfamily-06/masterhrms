# MASTERHRMS — Master Data Schema Parity & Architecture Audit Report

**Date:** November 5, 2026  
**Auditor Role:** Senior Prisma & PostgreSQL Backend Auditor  
**Audit Scope:** `Branch`, `Department`, `Designation` (and Master Data Blueprint Entities)  
**Database Target:** Supabase PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com:6543`, `public` schema)  
**ORM / Client:** Prisma 6.4.1 / `@prisma/client`  
**API Engine:** Express.js 5.1.0-alpha.1 (`master-data.blueprint.ts`)  

---

## 1. Executive Summary & Audit Methodology

An independent technical audit was conducted across the schema, ORM mapping layer, and physical PostgreSQL database to verify parity and identify the structural origin of the `Unknown argument updatedBy` failure previously encountered in `server/src/blueprints/master-data.blueprint.ts`.

The audit inspected and cross-referenced four architectural layers:
1. **Physical Relational Layer:** PostgreSQL 15 `information_schema.columns`, `pg_constraint`, and `pg_indexes` queried directly via `pg.Pool`.
2. **Prisma Schema Definition:** `server/prisma/schema.prisma` AST declarations for models `Branch`, `Department`, and `Designation`.
3. **Generated Prisma Client DMMF:** `@prisma/client` runtime Data Model Meta Format (`Prisma.dmmf.datamodel.models`) scalar and relation field descriptors.
4. **API Request/Response Wire Mapping:** `master-data.blueprint.ts` serializer and controller allowlists.

---

## 2. Model-by-Model Schema Comparison Matrix

### 2.1 Branch (`branches`)

| Field Name (Prisma) | Physical Column (`public.branches`) | PostgreSQL Data Type | Nullable | Default Value | Prisma Type | Field Mapping (`@map`) | Parity Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| `id` | `id` | `character varying` | `NO` | *None* | `String` (ID) | Identity | **MATCH** |
| `tenantId` | `tenant_id` | `character varying` | `NO` | *None* | `String` | `@map("tenant_id")` | **MATCH** |
| `name` | `name` | `character varying` | `NO` | *None* | `String` | Identity | **MATCH** |
| `code` | `code` | `character varying` | `YES` | *None* | `String?` | Identity | **MATCH** |
| `address` | `address` | `text` | `YES` | *None* | `String?` | Identity | **MATCH** |
| `phone` | `phone` | `character varying` | `YES` | *None* | `String?` | Identity | **MATCH** |
| `email` | `email` | `character varying` | `YES` | *None* | `String?` | Identity | **MATCH** |
| `latitude` | `latitude` | `double precision` | `YES` | *None* | `Float?` | Identity | **MATCH** |
| `longitude` | `longitude` | `double precision` | `YES` | *None* | `Float?` | Identity | **MATCH** |
| `geofenceRadius` | `geofence_radius` | `integer` | `YES` | `500` | `Int?` | `@map("geofence_radius")` | **MATCH** |
| `status` | `status` | `character varying(20)` | `NO` | `'active'::varchar`| `String` | Identity | **MATCH** |
| `createdAt` | `created_at` | `timestamp without time zone` | `NO` | `CURRENT_TIMESTAMP` | `DateTime` | `@map("created_at")` | **MATCH** |
| `updatedAt` | `updated_at` | `timestamp without time zone` | `NO` | *None* | `DateTime` (`@updatedAt`) | `@map("updated_at")` | **MATCH** |

- **Foreign Keys & Constraints:**
  - `branches_pkey` (PRIMARY KEY: `id`)
  - `branches_tenant_id_fkey` (FOREIGN KEY: `tenant_id` REFERENCES `tenants(id)` ON UPDATE CASCADE ON DELETE CASCADE)
- **Indexes:**
  - `branches_pkey` (UNIQUE btree on `id`)
- **Audit Field Check:**
  - Physical `updated_by` / Prisma `updatedBy`: **ABSENT** from both PostgreSQL and Prisma.
  - Physical `created_by` / Prisma `createdBy`: **ABSENT** from both PostgreSQL and Prisma.

---

### 2.2 Department (`departments`)

| Field Name (Prisma) | Physical Column (`public.departments`) | PostgreSQL Data Type | Nullable | Default Value | Prisma Type | Field Mapping (`@map`) | Parity Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| `id` | `id` | `character varying` | `NO` | *None* | `String` (ID) | Identity | **MATCH** |
| `tenantId` | `tenant_id` | `character varying` | `NO` | *None* | `String` | `@map("tenant_id")` | **MATCH** |
| `branchId` | `branch_id` | `character varying` | `YES` | *None* | `String?` | `@map("branch_id")` | **MATCH** |
| `name` | `name` | `character varying` | `NO` | *None* | `String` | Identity | **MATCH** |
| `description` | `description` | `text` | `YES` | *None* | `String?` | Identity | **MATCH** |
| `status` | `status` | `character varying(20)` | `NO` | `'active'::varchar`| `String` | Identity | **MATCH** |
| `createdAt` | `created_at` | `timestamp without time zone` | `NO` | `CURRENT_TIMESTAMP` | `DateTime` | `@map("created_at")` | **MATCH** |

- **Foreign Keys & Constraints:**
  - `departments_pkey` (PRIMARY KEY: `id`)
  - `departments_tenant_id_fkey` (FOREIGN KEY: `tenant_id` REFERENCES `tenants(id)` ON UPDATE CASCADE ON DELETE CASCADE)
  - `departments_branch_id_fkey` (FOREIGN KEY: `branch_id` REFERENCES `branches(id)` ON UPDATE CASCADE ON DELETE SET NULL)
- **Indexes:**
  - `departments_pkey` (UNIQUE btree on `id`)
- **Audit Field Check:**
  - Physical `updated_at` / Prisma `updatedAt`: **ABSENT** from both PostgreSQL and Prisma.
  - Physical `updated_by` / Prisma `updatedBy`: **ABSENT** from both PostgreSQL and Prisma.
  - Physical `created_by` / Prisma `createdBy`: **ABSENT** from both PostgreSQL and Prisma.

---

### 2.3 Designation (`designations`)

| Field Name (Prisma) | Physical Column (`public.designations`) | PostgreSQL Data Type | Nullable | Default Value | Prisma Type | Field Mapping (`@map`) | Parity Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| `id` | `id` | `character varying` | `NO` | *None* | `String` (ID) | Identity | **MATCH** |
| `tenantId` | `tenant_id` | `character varying` | `NO` | *None* | `String` | `@map("tenant_id")` | **MATCH** |
| `departmentId` | `department_id` | `character varying` | `YES` | *None* | `String?` | `@map("department_id")` | **MATCH** |
| `name` | `name` | `character varying` | `NO` | *None* | `String` | Identity | **MATCH** |
| `description` | `description` | `text` | `YES` | *None* | `String?` | Identity | **MATCH** |
| `status` | `status` | `character varying(20)` | `NO` | `'active'::varchar`| `String` | Identity | **MATCH** |
| `createdAt` | `created_at` | `timestamp without time zone` | `NO` | `CURRENT_TIMESTAMP` | `DateTime` | `@map("created_at")` | **MATCH** |
| `updatedAt` | `updated_at` | `timestamp without time zone` | `NO` | *None* | `DateTime` (`@updatedAt`) | `@map("updated_at")` | **MATCH** |

- **Foreign Keys & Constraints:**
  - `designations_pkey` (PRIMARY KEY: `id`)
  - `designations_tenant_id_fkey` (FOREIGN KEY: `tenant_id` REFERENCES `tenants(id)` ON UPDATE CASCADE ON DELETE CASCADE)
  - `designations_department_id_fkey` (FOREIGN KEY: `department_id` REFERENCES `departments(id)` ON UPDATE CASCADE ON DELETE SET NULL)
- **Indexes:**
  - `designations_pkey` (UNIQUE btree on `id`)
  - `designations_tenant_id_idx` (btree on `tenant_id`)
- **Audit Field Check:**
  - Physical `updated_by` / Prisma `updatedBy`: **ABSENT** from both PostgreSQL and Prisma.
  - Physical `created_by` / Prisma `createdBy`: **ABSENT** from both PostgreSQL and Prisma.

---

## 3. Explicit Investigative Answers

### 1. Does `Designation` physically and logically support `status`?
**YES.**  
- **Physical PostgreSQL:** Column `status` exists in table `designations` with type `character varying(20)`, `NOT NULL`, default `'active'::character varying`.
- **Prisma Schema:** `status String @default("active")` is declared in `model Designation`.
- **Logical Behavior:** The runtime allows setting `"active"` and `"inactive"`. The UI renders the status pill, and queries filter correctly by status.

### 2. Does `Department` support `updatedAt` / `updated_at`?
**NO.**  
- **Physical PostgreSQL:** Table `departments` has exactly 7 columns: `id`, `tenant_id`, `branch_id`, `name`, `description`, `status`, and `created_at`. No `updated_at` column exists.
- **Prisma Schema:** Model `Department` intentionally omits `updatedAt`.
- **Runtime Consequence:** Injecting `updatedAt: new Date()` into `tx.department.update()` will throw a Prisma runtime client validation error (`Unknown argument updatedAt`). The generic master data blueprint correctly handles this by never forcing `updatedAt` on models that do not define it in their scalar allowlist.

### 3. Does `Branch` support `updatedAt` / `updated_at`?
**YES.**  
- **Physical PostgreSQL:** Column `updated_at` exists in table `branches` with type `timestamp without time zone`, `NOT NULL`.
- **Prisma Schema:** Declared as `updatedAt DateTime @updatedAt @map("updated_at")`.
- **Logical Behavior:** Prisma automatically manages this field on update transactions via its `@updatedAt` decorator.

### 4. Are `@map` mappings correct?
**YES.** Every snake_case physical column corresponds exactly to camelCase Prisma fields:
- `tenant_id` $\rightarrow$ `tenantId` (All 3 models)
- `branch_id` $\rightarrow$ `branchId` (Department)
- `department_id` $\rightarrow$ `departmentId` (Designation)
- `geofence_radius` $\rightarrow$ `geofenceRadius` (Branch)
- `created_at` $\rightarrow$ `createdAt` (All 3 models)
- `updated_at` $\rightarrow$ `updatedAt` (Branch, Designation)

### 5. Are any fields present in Prisma but absent from PostgreSQL?
**NO.** Zero phantom fields (`inPrismaNotInDb: []` across all models).

### 6. Are any fields present in PostgreSQL but absent from Prisma?
**NO.** Zero unmapped physical columns (`inDbNotInPrisma: []` across all models).

### 7. Schema Integrity Guarantee
**Zero modifications were made to the database schema or Prisma schema.** No columns (`updatedBy`, `updated_at`, etc.) were silently added. The system achieves 100% parity by aligning the TypeScript API application layer to the physical truth of PostgreSQL.

---

## 4. Architectural Summary

```
+---------------------------------------------------------------------------------------+
|                                    PostgreSQL 15                                      |
|                                                                                       |
|   +--------------------------+  +--------------------------+  +---------------------+ |
|   |         branches         |  |       departments        |  |    designations     | |
|   +--------------------------+  +--------------------------+  +---------------------+ |
|   | id (PK)                  |  | id (PK)                  |  | id (PK)             | |
|   | tenant_id (FK)           |  | tenant_id (FK)           |  | tenant_id (FK)      | |
|   | name                     |  | branch_id (FK)           |  | department_id (FK)  | |
|   | code, address, phone...  |  | name                     |  | name                | |
|   | status (default 'active')|  | description              |  | description         | |
|   | created_at               |  | status (default 'active')|  | status ('active')   | |
|   | updated_at               |  | created_at               |  | created_at          | |
|   | (NO updated_by)          |  | (NO updated_at)          |  | updated_at          | |
|   +--------------------------+  +--------------------------+  +---------------------+ |
+---------------------------------------------------------------------------------------+
                                            ^
                                            | (Strict Parity Mappings)
+---------------------------------------------------------------------------------------+
|                               Prisma Client DMMF Models                               |
|                                                                                       |
|   Branch:      [id, tenantId, name, code, address, phone, email, lat, lng, radius,   |
|                 status, createdAt, updatedAt]                                         |
|   Department:  [id, tenantId, branchId, name, description, status, createdAt]         |
|   Designation: [id, tenantId, departmentId, name, description, status, createdAt,     |
|                 updatedAt]                                                            |
+---------------------------------------------------------------------------------------+
                                            ^
                                            | (Allowlist Resolution & Sanitization)
+---------------------------------------------------------------------------------------+
|                 master-data.blueprint.ts: buildModelSafePayload()                     |
|                                                                                       |
|   - Strips `updatedBy`, `createdBy`, `id`, `tenantId`, and relation navigators        |
|   - Validates scalar allowlist per model                                              |
|   - Actor attribution routed cleanly to `audit_logs` table                            |
+---------------------------------------------------------------------------------------+
```

---
**Auditor Conclusion:** All 3 models achieve flawless physical-to-logical parity. No schema drift exists.

