# MasterHRMS File Manager — Phase F4-A
# Report 2: Forensic Audit of Database Schema, Models & Indexing Architecture

**Project:** MasterHRMS  
**Module:** Enterprise File Manager  
**Phase:** F4-A (Read-Only Forensic Audit)  
**Document:** `PHASE_F4A_DATABASE_SCHEMA_AUDIT.md`  
**Status:** COMPLETE & INDEPENDENTLY AUDITED  
**Date:** October 30, 2026  

---

## 1. Executive Summary

This forensic report performs an exhaustive, read-only analysis of the database schema supporting the MasterHRMS Enterprise File Manager in [`server/prisma/schema.prisma`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma). It audits relational structures, column definitions, index coverage, transaction safety, and identifies specific schema bottlenecks and gaps that must be resolved to support Phase F4's enterprise storage governance.

### Core Audit Discoveries
1. **Existing Quota Tables:** The schema already contains foundational models for `StorageQuota` (line 5064) and `StorageUsage` (line 5077) with `BigInt` byte counters and `@@unique([tenantId, userId])` constraints.
2. **The Int vs. BigInt Sizing Hazard:** `MediaFile.fileSize` is typed as Prisma `Int` (signed 32-bit integer, maximum 2,147,483,647 bytes ≈ 2.14 GB). Conversely, `FileVersion.sizeBytes`, `FileUploadSession.sizeBytes`, `StorageQuota.quotaBytes`, and `StorageUsage.usedBytes` are typed as `BigInt` (64-bit integer). In Phase F4, storing large video or database archives (> 2.14 GB) will cause integer overflow exceptions on `MediaFile`.
3. **Tenant Pool Key Polymorphism Collision:** `StorageUsage` defines `tenantId String` and `userId String?`. In `QuotaService.reserveUploadBytes`, tenant-level usage is tracked under `{ tenantId, userId: null }`. In `files.routes.ts` (line 89), tenant-level usage is queried under `{ tenantId, userId: "tenant_pool" }`. Because PostgreSQL treats `null` and `"tenant_pool"` as separate unique keys, tenant quota metrics diverge into two separate records.
4. **Missing Departmental & Team Quota Entities:** While `FileTeam` (line 4999) has an inline `quotaBytes BigInt?` column, there is no normalized `DepartmentQuota` model, nor an automated mechanism to roll up usage by department or team.
5. **Missing Alert & Threshold Configuration:** There are no schema fields to configure soft-quota warning percentages (e.g. 80%, 90%), nor a table to log quota breach events.

---

## 2. Comprehensive Inventory of Current File & Storage Models

### 2.1 `MediaFile` (Table: `media_files`)
Lines 4852–4913 of `schema.prisma`. Primary file and folder metadata record.

| Column | Type | Nullable | Default | Description / Forensic Finding |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (VarChar 36)` | No | `uuid()` | Primary Key. UUID v4. |
| `tenantId` | `String? (VarChar 36)` | Yes | `null` | Multi-tenant isolation. Null for system platform assets. |
| `storageDisk` | `String (VarChar 30)` | No | `"LOCAL"` | Storage driver (`"LOCAL"`, `"SUPABASE"`, `"S3"`). |
| `filePath` | `String (VarChar 500)` | No | - | Storage path or bucket key. |
| `url` | `String (VarChar 500)` | No | - | Public or stream URL reference. |
| `fileName` | `String (VarChar 255)` | No | - | Display name of the file or folder. |
| `mimeType` | `String (VarChar 100)` | No | - | MIME type (e.g., `application/pdf`, `folder`). |
| `fileSize` | `Int` | No | - | **CRITICAL:** 32-bit integer (max ~2.14 GB). Discrepancy with `FileVersion.sizeBytes`. |
| `folder` | `String (VarChar 100)` | No | `"general"` | Legacy flat folder tag. |
| `parentId` | `String? (VarChar 36)` | Yes | `null` | Self-referencing FK to `MediaFile.id` for folder hierarchy. |
| `isFolder` | `Boolean` | No | `false` | Distinguishes directories from leaf files. |
| `category` | `String (VarChar 50)` | No | `"Documents"` | Category classification (`Documents`, `Images`, etc.). |
| `ownerType` | `String (VarChar 20)` | No | `"USER"` | Owner identity type (`USER`, `TEAM`). |
| `ownerId` | `String? (VarChar 36)` | Yes | `null` | UUID of owner (User ID or Team ID). |
| `status` | `String (VarChar 20)` | No | `"ACTIVE"` | Lifecycle status (`ACTIVE`, `TRASHED`). |
| `deletedAt` | `DateTime?` | Yes | `null` | Soft deletion timestamp. |
| `trashedAt` | `DateTime?` | Yes | `null` | Explicit trash bin entry timestamp. |
| `trashedBy` | `String? (VarChar 36)` | Yes | `null` | User ID who moved the item to trash. |
| `trashedByCascade` | `Boolean` | No | `false` | True if trashed because a parent folder was trashed. |
| `materializedPath` | `String (VarChar 1000)`| No | `"/"` | Breadcrumb hierarchy path (e.g., `/root-uuid/folder-uuid/`). |
| `depth` | `Int` | No | `0` | Tree depth level. |
| `version` | `Int` | No | `1` | Current version sequence counter. |
| `currentVersionId` | `String? (VarChar 36)`| Yes | `null` | Pointer to active `FileVersion.id`. |

#### Current Indexes on `media_files`:
- `@@index([tenantId, folder])`
- `@@index([tenantId, parentId])`
- `@@index([tenantId, isFolder])`
- `@@index([tenantId, parentId, nameKey])`
- `@@index([tenantId, status])`
- `@@index([tenantId, ownerId])`

---

### 2.2 `FileVersion` (Table: `file_versions`)
Lines 4963–4978 of `schema.prisma`. Tracks immutable version history for files.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (VarChar 36)` | PK | UUID v4. |
| `fileId` | `String (VarChar 36)` | FK -> `media_files.id` | Cascades on delete. |
| `versionNo` | `Int` | Not Null | 1-based version number. |
| `storageKey` | `String (VarChar 500)`| Not Null | Physical storage blob path. |
| `sizeBytes` | `BigInt` | Not Null | 64-bit precise size in bytes. |
| `checksum` | `String? (VarChar 64)`| Nullable | SHA-256 binary hash. |
| `createdBy` | `String (VarChar 36)` | Not Null | User ID who uploaded version. |
| `createdAt` | `DateTime` | Default `now()` | Version timestamp. |
| `isCurrent` | `Boolean` | Default `true` | True if active head version. |

#### Indexes on `file_versions`:
- `@@unique([fileId, versionNo])`
- `@@index([fileId, isCurrent])`

---

### 2.3 `StorageQuota` (Table: `storage_quotas`)
Lines 5064–5075 of `schema.prisma`. Stores configured quota allocations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (VarChar 36)` | PK | UUID v4. |
| `tenantId` | `String (VarChar 36)` | Not Null | Tenant context. |
| `userId` | `String? (VarChar 36)` | Nullable | Null = tenant pool quota; Non-null = user allocation. |
| `quotaBytes` | `BigInt` | Not Null | Quota ceiling in bytes. |
| `source` | `String (VarChar 20)` | Default `"DEFAULT"` | `"PLAN"`, `"DEFAULT"`, `"OVERRIDE"`, `"PACK"`. |
| `updatedBy` | `String? (VarChar 36)` | Nullable | Admin User ID who modified quota. |
| `updatedAt` | `DateTime` | `@updatedAt` | Last modification time. |

#### Indexes on `storage_quotas`:
- `@@unique([tenantId, userId])`

---

### 2.4 `StorageUsage` (Table: `storage_usages`)
Lines 5077–5089 of `schema.prisma`. Materialized fast-lookup counters for storage accounting.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (VarChar 36)` | PK | UUID v4. |
| `tenantId` | `String (VarChar 36)` | Not Null | Tenant context. |
| `userId` | `String? (VarChar 36)` | Nullable | Null = tenant pool usage; Non-null = user usage. |
| `usedBytes` | `BigInt` | Default `0` | Active logical file bytes consumed. |
| `reservedBytes` | `BigInt` | Default `0` | In-flight upload bytes reserved. |
| `trashBytes` | `BigInt` | Default `0` | Bytes occupied by items in recycle bin. |
| `fileCount` | `Int` | Default `0` | Total number of active files. |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp. |

#### Indexes on `storage_usages`:
- `@@unique([tenantId, userId])`

---

## 3. High-Cardinality Indexing Analysis & Bottlenecks

### Bottleneck 1: `media_files` Size Aggregation Without Filter Index
When calculating real-time storage breakdowns via SQL `SUM(file_size)`, the query filters by:
```sql
WHERE tenant_id = :tid 
  AND status = 'ACTIVE' 
  AND deleted_at IS NULL 
  AND is_folder = false;
```
Currently, the existing composite index is `@@index([tenantId, status])`. The database must perform a secondary heap scan or bitmap index scan to filter out `deletedAt` and `isFolder`.

**Proposed Composite Index:**
```sql
-- For an Index-Only Scan in PostgreSQL covering byte summations and category groupings:
CREATE INDEX idx_media_files_storage_calc 
ON media_files (tenant_id, status, is_folder, deleted_at) 
INCLUDE (file_size, category);
```
Covering the filter predicates (`tenantId`, `status`, `isFolder`, `deletedAt`) along with the aggregation payload (`file_size`, `category`) avoids heap lookups during high-frequency storage summations.

### Bottleneck 2: Category Breakdown Aggregation
The storage dashboard requires grouping by `category` to display file-type distribution.
```sql
SELECT category, SUM(file_size) as total_bytes, COUNT(id) as total_count
FROM media_files
WHERE tenant_id = :tid AND status = 'ACTIVE' AND deleted_at IS NULL AND is_folder = false
GROUP BY category;
```
Adding `category` to the storage index creates a fully covering index for category breakdown analytics.

---

## 4. Proposed Database Schema Blueprint for Phase F4 (Proposal Only)

To satisfy the full requirements of Phase F4 (Departmental Quotas, Team Quotas, Alert Thresholds, and Storage Audit Logging), the following schema additions are architecturally proposed. **Note: As required by Phase F4-A strict read-only execution, these are specifications for future phases; NO DDL is executed now.**

### Proposed Model 1: `StoragePolicy`
Configures tenant-wide quota rules, warning thresholds, and auto-purge retention policies.

```prisma
model StoragePolicy {
  id                   String   @id @default(uuid()) @db.VarChar(36)
  tenantId             String   @unique @map("tenant_id") @db.VarChar(36)
  warningThresholdPct  Int      @default(80) @map("warning_threshold_pct") // e.g. 80%
  criticalThresholdPct Int      @default(90) @map("critical_threshold_pct") // e.g. 90%
  hardLimitEnforced    Boolean  @default(true) @map("hard_limit_enforced")
  defaultUserQuotaBytes BigInt  @default(5368709120) @map("default_user_quota_bytes") // 5 GB
  trashRetentionDays   Int      @default(30) @map("trash_retention_days")
  maxVersionsPerFile   Int      @default(5) @map("max_versions_per_file")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  @@map("storage_policies")
}
```

### Proposed Model 2: Extension to `StorageQuota`
Support hierarchical quota assignments across Users, Teams, and Departments.

```prisma
// Extension proposal for StorageQuota
model StorageQuota {
  id           String   @id @default(uuid()) @db.VarChar(36)
  tenantId     String   @map("tenant_id") @db.VarChar(36)
  entityType   String   @default("TENANT") @map("entity_type") @db.VarChar(20) // TENANT | USER | TEAM | DEPARTMENT
  entityId     String?  @map("entity_id") @db.VarChar(36) // userId, teamId, or departmentId
  quotaBytes   BigInt   @map("quota_bytes")
  source       String   @default("DEFAULT") @db.VarChar(20) // PLAN | DEFAULT | OVERRIDE | PACK
  updatedBy    String?  @map("updated_by") @db.VarChar(36)
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, entityType, entityId])
  @@index([tenantId, entityType])
  @@map("storage_quotas")
}

// Partial unique index ensuring tenant-level rows cannot duplicate when entity_id is null:
// CREATE UNIQUE INDEX uq_storage_quotas_tenant_pool ON storage_quotas (tenant_id, entity_type) WHERE entity_id IS NULL;
```

### Proposed Model 3: `StorageAlertLog`
Logs warnings, critical threshold crossings, and automated lockout notifications.

```prisma
model StorageAlertLog {
  id         String   @id @default(uuid()) @db.VarChar(36)
  tenantId   String   @map("tenant_id") @db.VarChar(36)
  alertType  String   @map("alert_type") @db.VarChar(30) // WARNING_80 | CRITICAL_90 | LIMIT_100
  targetType String   @map("target_type") @db.VarChar(20) // TENANT | USER | TEAM | DEPARTMENT
  targetId   String?  @map("target_id") @db.VarChar(36)
  usedBytes  BigInt   @map("used_bytes")
  quotaBytes BigInt   @map("quota_bytes")
  message    String   @db.VarChar(255)
  resolvedAt DateTime? @map("resolved_at")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([tenantId, alertType, createdAt])
  @@map("storage_alert_logs")
}
```

---

## 5. Migration Safety & Rollback Blueprint

When schema updates are implemented in Phase F4-B:
1. **Zero Downtime Migration:** All new columns must have defaults or be nullable.
2. **Type Widening Strategy:** To widen `MediaFile.fileSize` from `Int` to `BigInt`:
   ```sql
   ALTER TABLE "media_files" ALTER COLUMN "file_size" TYPE BIGINT;
   ```
   In PostgreSQL, altering an integer column to bigint is a metadata-only rewrite on PostgreSQL 9.2+ if the table has no conflicting foreign key constraints on that column, taking sub-second execution time.
3. **Data Backfill:** An idempotent reconciliation script will calculate departmental and team usage aggregates without mutating primary file records.

---
*Report 2 completed under strict read-only audit protocol.*

