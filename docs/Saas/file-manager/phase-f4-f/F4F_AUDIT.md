# MASTERHRMS — PHASE F4-F PRE-IMPLEMENTATION FORENSIC AUDIT
## Enterprise Storage Retention Policy Automation & Legal Hold Architecture

**Document Version:** 1.0.0  
**Phase:** F4-F Only  
**Audit Timestamp:** 2026-10-30T17:51:00Z  
**Target Monorepo:** MASTERHRMS SaaS (Express Backend + Next.js App Router CMS)  
**Status:** APPROVED FOR IMPLEMENTATION

---

## 1. Executive Summary

Phase F4-F introduces **Enterprise Storage Retention Policy Automation** to MASTERHRMS, delivering automated, policy-driven lifecycle management for deleted trash items, historical file versions, expired public links, and abandoned upload reservations. The implementation is governed by uncompromising safety invariants:
1. **Active Files Are Never Deleted by Age Alone:** Business files (payroll, contracts, employee records, active projects) remain indefinitely preserved unless explicitly deleted by authorized users or regulated by distinct compliance modules.
2. **Explicit Legal Hold Exclusions:** Files or specific versions designated under active legal hold are strictly immutable and immune to all automatic retention jobs, batch purges, and manual permanent deletions.
3. **Safe-by-Default Configuration:** Every newly created retention policy is initialized in **Disabled** status and **Dry-Run** mode. No destructive background deletion can run without explicit administrative activation.
4. **Physical Object Deletion Before Reclaim:** Physical bytes are verified as purged from the underlying storage provider (`SupabaseStorageProvider` / `LocalStorageProvider`) before decrementing storage accounting or declaring storage reclaimed.
5. **Canonical SUCE Accounting:** No parallel storage accounting system is introduced; all storage reconciliations and counter updates execute through the canonical Phase F4-B Storage Usage Calculation Engine (SUCE) and Phase F4-C Quota Governance state machine.

---

## 2. Forensic Codebase Audit of Existing Foundations (F1 – F4-E)

### 2.1 Storage Provider Abstraction (F1)
- **Interface:** `server/src/services/storage/storage-provider.interface.ts` defines `IStorageProvider`:
  - `initiateUpload`, `verifyUpload`, `getSignedDownloadUrl`, `getSignedPreviewUrl`
  - `deleteObject(storageKey: string): Promise<boolean>`
  - `buildStorageKey(tenantId, fileId, versionNo)` creates canonical, unguessable storage keys (`tenant/:tenantId/:fileId/v:versionNo` or `platform/:fileId/v:versionNo`).
- **Implementations:** `SupabaseStorageProvider` (production multi-tenant S3/Supabase Storage) and `LocalStorageProvider` (local disk dev fallback).
- **Physical Delete Verification:** `storageProvider.deleteObject` returns boolean success. If an object is already missing from object storage (e.g. out-of-band cleanup), `deleteObject` handles 404 gracefully rather than aborting batch jobs.

### 2.2 Trash, Restore, and Purge Lifecycle (F2)
- **`MediaFile` Model:**
  - `status`: `"ACTIVE"` | `"TRASHED"`
  - `trashedAt`: `DateTime?` — canonical timestamp marking when the item entered trash.
  - `trashedBy`: `String?` (actor UUID).
  - `trashedByCascade`: `Boolean` — tracks recursive folder trash operations.
- **Service Layer (`server/src/services/files/files.service.ts`):**
  - `trashItems(options)`: Soft-deletes files/folders, verifies that `usages` and `fileLinks` are not in active use unless forced, and invokes `QuotaService.trashFileBytes(...)` to transfer quota from `usedBytes` to `trashBytes`.
  - `restoreItems(options)`: Restores files to active status, moves quota back to `usedBytes`.
  - `deleteItemPermanently(options)`:
    - Iterates all versions of the file and invokes `storageProvider.deleteObject(version.storageKey)`.
    - Invokes `QuotaService.purgeFileBytes(tx, tenantId, ownerId, sizeBytes, fromTrash)`.
    - Cascades DB deletions across `fileLinks`, `mediaUsages`, `fileStars`, `fileAcls`, `fileShares`, `fileRecents`, `fileActivities`, and `fileVersions`.
    - Emits Outbox event `file.deleted` and broadcasts Socket.IO event `file:deleted`.

### 2.3 Access Control, Business References & Dependencies (F3)
- **`FileAcl`:** Manages granular permissions and public share links (`principalType: 'LINK'`).
  - `expiresAt`: Timestamp for temporary share links. Expired links can be safely cleaned up without touching physical file data.
- **`MediaUsage`:** Tracks foreign entity associations across CRM, Attendance, Payroll, and Projects (`mediaId`, `entityType`, `entityId`, `fieldKey`).
  - **Invariant:** Any `MediaFile` with active `MediaUsage` records must be strictly protected from automatic retention deletion.
- **`FileLink`:** Tracks in-app document references. Files with active `FileLink` records must also be protected from automated retention purge.

### 2.4 Canonical Accounting & Reconciliation (F4-B & F4-C)
- **SUCE Engine (`storage-usage.engine.ts`):**
  - Canonical dimensions: `activeBytes`, `trashBytes`, `versionBytes`, `reservedBytes`, `fileCount`, `folderCount`.
  - Atomic incremental updates: `trashFile`, `restoreFile`, `purgeFile`, `createFileVersion`, `deleteFileVersion`, `reserveUpload`, `commitUpload`, `releaseReservation`.
- **Reconciliation Service (`storage-reconciliation.service.ts`):**
  - Detects counter drift between materialized `StorageUsage` rows and live sums of `MediaFile` and `FileVersion` rows.
  - Generates auditable drift reports and provides self-healing transactional repair.
- **Quota Governance (`quota-governance.service.ts`):**
  - State machine: `NORMAL` (0-79%), `WARNING` (80-89%), `CRITICAL` (90-99%), `EXCEEDED` (100%+).
  - Soft warnings, strict blocking on `EXCEEDED`, emergency buffer headroom (5%).

### 2.5 Real-Time Dashboards & Analytics (F4-D & F4-E)
- **Tenant Dashboard:** `/tenant/files/storage` provides storage overview, department breakdown, team allocations, and real-time activity timeline.
- **Super Admin Metrics:** `/super/tenant-usage-metrics` provides fleet-wide consumption, capacity forecasts, exhaustion watchlists, and anomaly detection.
- **Forecasting (`storage-forecast.service.ts`):** Daily snapshots in `StorageSnapshot` evaluate 30/60/90-day linear regression trends, days-to-exhaustion runways, and tenant growth velocities.

### 2.6 Legal Hold & Compliance Audit
- Forensic inspection of `server/prisma/schema.prisma` confirmed **zero existing object-storage legal hold models**. Existing compliance models (`ComplianceControl`, `ComplianceIncident`) relate to organizational HR and GDPR policy checklists, not binary file-level preservation locks.
- **Architectural Directive:** Introduce a minimal, explicit `StorageLegalHold` model with `tenantId`, `fileId`, `fileVersionId?`, `reason`, `holdScope`, `createdBy`, `createdAt`, `releasedAt`, `releaseReason`, and `releasedBy`.
- All retention engines and manual delete endpoints must strictly check for active legal holds before permitting file removal.

### 2.7 Scheduling & Background Job Infrastructure
- System utilizes centralized node-cron runners in `server/src/cron/` (e.g. `biometric-sync.ts`, `saas-billing.cron.ts`, `subscription-reminder.cron.ts`).
- Long-running workers are managed gracefully during process lifecycle (with shutdown signals in `server/src/index.ts`).
- Storage retention engine will support both scheduled background runs and authorized manual on-demand executions with transactional dry-run previews.

---

## 3. Storage Retention Engine Architecture (F4-F)

```mermaid
flowchart TD
    subgraph RetentionPolicy["Storage Retention Policy"]
        POL[Tenant / Platform Policy] -->|Configured Defaults| PARAMS[Trash: 30d | Versions: Max N / Age | Links: Expired]
        PARAMS --> DRY[Dry-Run Mode / Approval Guard]
    end

    subgraph CandidateSelection["Candidate Selection Pipeline"]
        MF[(MediaFile TRASHED)] -->|trashedAt < cutoff| CAND[Eligible Candidates]
        FV[(FileVersion Non-Current)] -->|Age / Version Limit| CAND
        FL[(FileAcl LINK)] -->|expiresAt < now| CAND
        FUS[(FileUploadSession)] -->|expiresAt < 24h ago| CAND
    end

    subgraph ProtectionFilter["Safety & Legal Hold Guards"]
        CAND --> HCK{Active Legal Hold?}
        HCK -- Yes --> SKIP_HOLD[Skip: LEGAL_HOLD_PROTECTED]
        HCK -- No --> UCK{Active MediaUsage / FileLink?}
        UCK -- Yes --> SKIP_REF[Skip: BUSINESS_REFERENCE_PROTECTED]
        UCK -- No --> SCK{System File / Module?}
        SCK -- Yes --> SKIP_SYS[Skip: SYSTEM_PROTECTED]
        SCK -- No --> RCK{Concurrent Move / Restore?}
        RCK -- Yes --> SKIP_RACE[Skip: CONCURRENT_MUTATION]
        RCK -- No --> READY[Ready for Deletion]
    end

    subgraph Execution["Bounded Safe Execution"]
        READY --> BATCH[Bounded Chunks: 25 items]
        BATCH --> S3[Physical Deletion via IStorageProvider]
        S3 --> TX[Prisma Transactional Cleanup]
        TX --> SUCE[SUCE Quota & Usage Reconciliation]
        SUCE --> OUTBOX[OutboxEvent & Socket.IO Notification]
        OUTBOX --> LOGS[(StorageRetentionJob Audit Trail)]
    end
```

---

## 4. Database Schema Specifications

### 4.1 `StorageRetentionPolicy`
```prisma
model StorageRetentionPolicy {
  id                     String    @id @default(uuid()) @db.VarChar(36)
  tenantId               String?   @unique @map("tenant_id") @db.VarChar(36) // null = platform default
  isEnabled              Boolean   @default(false) @map("is_enabled") // ALWAYS false on creation!
  isDryRun               Boolean   @default(true) @map("is_dry_run") // ALWAYS true on creation!
  trashRetentionDays     Int       @default(30) @map("trash_retention_days")
  versionRetentionDays   Int?      @map("version_retention_days") // null = keep all versions
  maxVersionsPerFile     Int?      @map("max_versions_per_file") // null = keep all versions
  cleanExpiredLinks      Boolean   @default(false) @map("clean_expired_links")
  cleanAbandonedSessions Boolean   @default(true) @map("clean_abandoned_sessions")
  requiresApproval       Boolean   @default(false) @map("requires_approval")
  excludedFolders        String[]  @default([]) @map("excluded_folders")
  policyVersion          Int       @default(1) @map("policy_version")
  updatedBy              String?   @map("updated_by") @db.VarChar(36)
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")

  @@index([tenantId])
  @@map("storage_retention_policies")
}
```

### 4.2 `StorageLegalHold`
```prisma
model StorageLegalHold {
  id            String    @id @default(uuid()) @db.VarChar(36)
  tenantId      String    @map("tenant_id") @db.VarChar(36)
  fileId        String    @map("file_id") @db.VarChar(36)
  fileVersionId String?   @map("file_version_id") @db.VarChar(36)
  reason        String    @db.VarChar(500)
  holdScope     String    @default("FILE") @map("hold_scope") @db.VarChar(20) // FILE | VERSION
  createdBy     String    @map("created_by") @db.VarChar(36)
  createdAt     DateTime  @default(now()) @map("created_at")
  releasedAt    DateTime? @map("released_at")
  releaseReason String?   @map("release_reason") @db.VarChar(500)
  releasedBy    String?   @map("released_by") @db.VarChar(36)

  file          MediaFile @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([tenantId, fileId, releasedAt])
  @@map("storage_legal_holds")
}
```

### 4.3 `StorageRetentionJob`
```prisma
model StorageRetentionJob {
  id             String    @id @default(uuid()) @db.VarChar(36)
  tenantId       String?   @map("tenant_id") @db.VarChar(36) // null = fleet
  policyId       String?   @map("policy_id") @db.VarChar(36)
  status         String    @default("PENDING") @db.VarChar(30) // PENDING | PENDING_APPROVAL | APPROVED | REJECTED | RUNNING | COMPLETED | FAILED | CANCELLED
  isDryRun       Boolean   @default(true) @map("is_dry_run")
  triggerType    String    @default("MANUAL") @map("trigger_type") @db.VarChar(20) // MANUAL | SCHEDULED
  eligibleCount  Int       @default(0) @map("eligible_count")
  eligibleBytes  BigInt    @default(0) @map("eligible_bytes")
  deletedCount   Int       @default(0) @map("deleted_count")
  deletedBytes   BigInt    @default(0) @map("deleted_bytes")
  skippedCount   Int       @default(0) @map("skipped_count")
  failedCount    Int       @default(0) @map("failed_count")
  detailsJson    Json?     @map("details_json")
  requestedBy    String?   @map("requested_by") @db.VarChar(36)
  approvedBy     String?   @map("approved_by") @db.VarChar(36)
  approvedAt     DateTime? @map("approved_at")
  rejectedReason String?   @map("rejected_reason") @db.VarChar(500)
  startedAt      DateTime? @map("started_at")
  completedAt    DateTime? @map("completed_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  @@index([tenantId, status, createdAt])
  @@map("storage_retention_jobs")
}
```

---

## 5. Implementation Roadmap & Verification Gates

1. **Schema Update:** Update `server/prisma/schema.prisma` with `StorageRetentionPolicy`, `StorageLegalHold`, and `StorageRetentionJob`, plus relation in `MediaFile`. Apply via safe schema push without schema divergence.
2. **Core Service (`StorageRetentionService`):**
   - Policy resolution (Tenant override fallback to platform default).
   - Legal hold placement, release, and active hold verification.
   - Candidate discovery with strict exclusion rules (active files, legal holds, media usages, active file links, system files).
   - Dry-run preview generator.
   - Bounded execution runner (25 files/chunk) with physical storage deletion confirmation before DB commit and SUCE adjustment.
3. **API Routing:**
   - Tenant routes in `server/src/routes/tenant-storage.routes.ts` (`/retention/policy`, `/retention/preview`, `/retention/execute`, `/retention/history`, `/retention/holds`, `/retention/holds/:id/release`).
   - Super admin routes in `server/src/routes/super-storage.routes.ts` (`/retention/fleet`, `/retention/history`).
4. **Tenant Admin UI:** Tab in `/tenant/files/storage` with Retention Policy settings, Dry-Run preview, Legal Hold table, and Execution Logs.
5. **Super Admin UI:** Fleet Retention overview card & job monitor in `/super/tenant-usage-metrics`.
6. **Automated Testing & Failure Injection:** `scripts/verify_file_manager_f4f_e2e.cjs` covering all policy, legal hold, business reference, failure injection, and regression tests.
7. **Playwright QA:** `scripts/verify_file_manager_f4f_browser_qa.cjs` generating full screenshot artifacts.
8. **Final Verification Report:** `docs/Saas/file-manager/phase-f4-f/F4F_VERIFICATION_REPORT.md`.

---
**Audit Complete:** Approved for immediate implementation of Phase F4-F.
