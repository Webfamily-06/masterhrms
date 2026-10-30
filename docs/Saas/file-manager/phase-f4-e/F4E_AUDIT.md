# MASTERHRMS — PHASE F4-E PRE-IMPLEMENTATION AUDIT
## Fleet Analytics & Storage Capacity Forecasting Engine

**Date:** October 30, 2026  
**Module:** Enterprise File Manager — Phase F4-E  
**Audit Status:** COMPLETE & VERIFIED  
**Scope Boundary:** Phase F4-E ONLY (Fleet Analytics & Capacity Forecasting). No F4-F (Retention Automation) or F5.

---

## 1. Executive Summary

This forensic audit establishes the technical foundation for **Phase F4-E (Fleet Analytics & Storage Capacity Forecasting)**. It inspects all pre-existing storage calculation engines, database schemas, quota governance layers, real-time messaging pipelines, and user interfaces delivered in Phases F1 through F4-D.

### Key Audit Findings:
1. **Authoritative Single Source of Truth:**
   - The canonical **Storage Usage Calculation Engine (SUCE)** (`StorageUsageEngine` in `server/src/services/files/storage-usage.engine.ts`) and **Quota Service** (`QuotaService` in `server/src/services/files/quota.service.ts`) maintain materialized counters in `storage_usages` (`usedBytes`, `trashBytes`, `reservedBytes`, `fileCount`).
   - The **Quota Governance Service** (`QuotaGovernanceService` in `server/src/services/files/quota-governance.service.ts`) resolves effective 4-tier quotas (Platform Ceiling $\rightarrow$ Tenant Plan/Subscription/Override $\rightarrow$ Department $\rightarrow$ Team $\rightarrow$ User).
   - In Phase F4-D, `/super/tenant-usage-metrics` was successfully refactored from legacy document approximations to canonical database counters with 8 Fleet Summary KPI cards and multi-dimensional table columns.

2. **Snapshot Infrastructure State:**
   - The database model `StorageSnapshot` exists in `server/prisma/schema.prisma` with fields: `id`, `tenantId` (nullable for platform), `usedBytes`, `trashBytes`, `versionBytes`, `reservedBytes`, `fileCount`, `folderCount`, `quotaBytes`, `snapshotDate` (`@db.Date`), and `createdAt`.
   - Constraints: `@@unique([tenantId, snapshotDate])` and `@@index([snapshotDate])`.
   - Inspection of live database records shows 2 existing snapshots (`tenant-default-001` and `platform`).
   - `StorageAdminService.takeDailySnapshot()` already supports capturing daily snapshots with upsert idempotency, but was missing `versionBytes` assignment (defaulted to 0).
   - `StorageAdminService.calculateCapacityForecast()` contained a rudimentary hardcoded fallback baseline (`10 MB/day`) which violates the F4-E requirement of strict empirical grounding and `INSUFFICIENT_DATA` handling.

3. **Reusability & Anti-Duplication Directives:**
   - **Do NOT create a parallel snapshot table.** Reuse and extend `StorageSnapshot`.
   - **Do NOT create a parallel calculation engine.** All live calculations must route through SUCE and QuotaService.
   - **Do NOT fabricate data.** When fewer than 2 snapshots exist, return `forecastStatus: 'INSUFFICIENT_DATA'`, `confidence: 'INSUFFICIENT_DATA'`, and null exhaustion dates.

---

## 2. Forensic Inspection of Pre-Existing Components

### 2.1 Storage Usage Calculation Engine (SUCE) & Quota Service
- **File:** `server/src/services/files/storage-usage.engine.ts`
- **Capabilities:**
  - Real-time atomic usage calculations via `recalculateTenantStorage()`.
  - Multi-dimensional aggregation:
    - Active Logical Bytes: sum of non-trashed, active `MediaFile.sizeBytes`.
    - Trash Retention Bytes: sum of soft-deleted (`status = 'TRASHED'`) `MediaFile.sizeBytes`.
    - Version History Bytes: sum of non-current (`isCurrent = false`) `FileVersion.sizeBytes`.
    - In-Flight Reserved Bytes: sum of uncommitted `FileUploadSession.fileSize`.
    - Billable / Physical Bytes: Active + Trash + Versions (1:1 local encrypted/Supabase mapping).
  - Department breakdown calculation: maps employees to departments and aggregates collective file sizes.

### 2.2 Quota Governance & State Machine
- **File:** `server/src/services/files/quota-governance.service.ts` & `server/src/services/files/quota.service.ts`
- **State Machine Tiers:**
  - `NORMAL`: $< 80\%$ quota utilization. Full read/write access.
  - `WARNING`: $80\% \le \text{utilization} < 90\%$. Quota warning banner and notifications.
  - `CRITICAL`: $90\% \le \text{utilization} < 100\%$. Critical ceiling alert.
  - `LOCKED`: $\ge 100\%$ quota utilization. Write freeze on file uploads, session reservations, and version creation.
- **Hierarchy:**
  - Platform Ceiling: default 1 TB (`1,099,511,627,776 bytes`).
  - Tenant Quota: Subscription limit $\rightarrow$ Plan default $\rightarrow$ Explicit override in `storage_quotas`.
  - Department Quotas: soft ceilings for collective division tracking.
  - Team Folders: shared workspaces consuming from tenant pool.
  - User Overrides: personal allocations (default 5 GB).

### 2.3 Super Admin Metrics & Dashboard
- **Backend Service:** `server/src/services/tenant-usage-metrics.service.ts`
- **API Endpoints:**
  - `GET /api/super/tenant-usage-metrics`: Returns `fleetSummary` (total allocated, active, trash, versions, reserved, physical, billable, approaching quota, locked) and `data` (tenant usage records).
  - `GET /api/super/tenant-usage-metrics/:id`: Returns deep tenant detail with profile, multi-dimensional storage counters, department breakdown, team folders, top users, recent `FileActivity` records, and module telemetry.
- **Frontend Page:** `CMS/src/app/super/tenant-usage-metrics/page.tsx`
  - Real-time Socket.IO live sync (`platform:admin` room).
  - 8 Fleet KPI cards.
  - Table and Grid modes with multi-dimensional storage columns and threshold state badges.
  - Deep Inspection Modal with 6 sub-navigation tabs.

### 2.4 Tenant Storage Administration Dashboard
- **Backend Service:** `server/src/services/files/storage-admin.service.ts`
- **API Endpoints:**
  - `GET /api/v1/tenant/storage/summary`: Canonical storage dimensions and categories.
  - `GET /api/v1/tenant/storage/quotas`: 4-tier governance hierarchy.
  - `GET /api/v1/tenant/storage/activity`: Recent `FileActivity` audit timeline.
  - `GET /api/v1/tenant/storage/analytics`: Historical growth snapshots and capacity forecast.
  - `POST /api/v1/tenant/storage/reconcile`: Self-healing dry run and repair.
- **Frontend Page:** `CMS/src/app/(workspace)/tenant/files/storage/page.tsx`
  - Real-time Socket.IO live sync pill.
  - Multi-dimensional storage composition bar.
  - Tabs: Overview, Users, Teams, Governance, Analytics, Activity, Reconcile.

### 2.5 Database Schema & Historical StorageSnapshot Inspection
- **Prisma Model:**
```prisma
model StorageSnapshot {
  id            String   @id @default(uuid()) @db.VarChar(36)
  tenantId      String?  @map("tenant_id") @db.VarChar(36) // null or 'platform' = fleet aggregate
  usedBytes     BigInt   @map("used_bytes")
  trashBytes    BigInt   @map("trash_bytes")
  versionBytes  BigInt   @default(0) @map("version_bytes")
  reservedBytes BigInt   @default(0) @map("reserved_bytes")
  fileCount     Int      @default(0) @map("file_count")
  folderCount   Int      @default(0) @map("folder_count")
  quotaBytes    BigInt   @map("quota_bytes")
  snapshotDate  DateTime @map("snapshot_date") @db.Date
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([tenantId, snapshotDate])
  @@index([snapshotDate])
  @@map("storage_snapshots")
}
```
- **Index Evaluation:**
  - PostgreSQL automatically provisions a composite unique index on `(tenant_id, snapshot_date)` for the `@@unique([tenantId, snapshotDate])` constraint.
  - Queries filtering by `tenantId` and ordering by `snapshotDate` are optimally indexed.
  - Queries filtering fleet-wide by `snapshotDate` leverage the `@@index([snapshotDate])`.
  - No new DDL migration is required; the schema is fully capable of supporting F4-E.

### 2.6 Real-Time Messaging & Outbox Architecture
- **Socket.IO:** `server/src/socket.ts`
  - In F4-D, `broadcastToTenant()` was upgraded so that every storage event (`file:*`, `storage:*`, `quota:*`) is dispatched to `tenant:${tenantId}` and forwarded to `platform:admin`.
- **Outbox Service:** `server/src/services/outbox.service.ts`
  - Processes pending transactional events and relays them via Socket.IO.

---

## 3. Gap Analysis for Phase F4-E

| Requirement | Current State | F4-E Implementation Plan |
|---|---|---|
| **Dedicated Forecasting Service** | Rudimentary calculation inside `StorageAdminService` with 10 MB/day fallback. | Create `StorageForecastService` (`server/src/services/files/storage-forecast.service.ts`) with linear regression, daily delta calculation, and `INSUFFICIENT_DATA` handling. |
| **Fleet-Wide Analytics API** | Basic summary and tenants list. No growth history or utilization distribution API. | Implement `GET /api/v1/super/storage/analytics/fleet`, `GET /api/v1/super/storage/analytics/growth`, `GET /api/v1/super/storage/analytics/watchlist`, and `GET /api/v1/super/storage/analytics/anomalies`. |
| **Configurable Lookback Windows** | Hardcoded 30/90 days in certain queries. | Support configurable `lookbackDays: 7 | 30 | 90` with strict date boundaries. |
| **Forecast Output Format** | Basic `estimatedDaysToExhaustion`. | Return canonical schema: `currentUsageBytes`, `quotaBytes`, `utilizationPercent`, `averageDailyGrowthBytes`, `projectedUsageBytes`, `projectedExhaustionDate`, `projectedDaysRemaining`, `lookbackDays`, `dataPoints`, `confidence`, `forecastStatus`. |
| **Insufficient History Handling** | Fallback to hardcoded 10 MB/day. | Return `forecastStatus: 'INSUFFICIENT_DATA'`, `confidence: 'INSUFFICIENT_DATA'`, and null exhaustion date when snapshots $< 2$. |
| **Super Admin UI** | Fleet KPI cards and table only. No growth trend chart or exhaustion watchlist. | Add dedicated Analytics & Forecasting section on `/super/tenant-usage-metrics` with ApexCharts growth trend, quota distribution histogram, watchlist table, and anomaly alerts. |
| **Tenant Admin UI** | Basic growth chart with dummy projected points. | Wire `CMS/src/app/(workspace)/tenant/files/storage/page.tsx` Analytics tab to `StorageForecastService` with clear observed vs projected visual indicators. |
| **Socket.IO Cache Invalidation** | Storage events invalidate summary and activity. | Invalidate `super-storage-analytics`, `super-storage-growth`, `super-storage-watchlist`, and `tenant-storage-analytics` on mutation. |

---

## 4. Architectural Blueprint for Phase F4-E

```mermaid
flowchart TD
    subgraph Data Layer
        SS[StorageSnapshot Table]
        SU[StorageUsage Table]
        FA[FileActivity Audit Table]
        SQ[StorageQuota Table]
    end

    subgraph Core Engine
        SFS[StorageForecastService]
        SS -->|Historical Lookback 7/30/90d| SFS
        SU -->|Current Active Usage| SFS
        SQ -->|Effective Quotas| SFS
        FA -->|Deletion / Reclaimed Tracking| SFS
    end

    subgraph Business Logic & Calculations
        SFS -->|Daily Deltas & Linear Regression| FC[Capacity Forecast & Confidence]
        SFS -->|Trend Aggregation| FG[Fleet & Tenant Growth Curves]
        SFS -->|Threshold Scans| WL[Exhaustion Watchlist]
        SFS -->|Spike Detection| AN[Storage Anomalies]
    end

    subgraph API Routing Layer
        FC --> S_API[/api/v1/super/storage/analytics/*]
        FG --> S_API
        WL --> S_API
        AN --> S_API
        FC --> T_API[/api/v1/tenant/storage/analytics]
        FG --> T_API
    end

    subgraph User Experience
        S_API --> SA_PAGE[/super/tenant-usage-metrics]
        T_API --> TA_PAGE[/tenant/files/storage]
    end
```

---

## 5. Mathematical & Forecasting Formulation

### 5.1 Snapshot Normalization & Deduplication
1. Snapshots are ordered chronologically by `snapshotDate` ascending.
2. If multiple snapshots exist for the same day, the latest entry is retained.
3. Daily deltas:
   $$\Delta_i = U_i - U_{i-1}$$
   where $U_i$ is `usedBytes` at snapshot $i$.

### 5.2 Average Daily Growth Rate
For a window of $N$ consecutive snapshots over $D$ elapsed days:
$$\text{AverageDailyGrowth} = \frac{U_N - U_1}{D}$$
where $D = \max\left(1, \frac{t_N - t_1}{86,400,000}\right)$.

### 5.3 Least-Squares Linear Regression (for $N \ge 3$)
Slope ($m$) and intercept ($c$) representing daily growth trend:
$$m = \frac{N \sum (x_i y_i) - \sum x_i \sum y_i}{N \sum x_i^2 - (\sum x_i)^2}$$
where $x_i$ represents the elapsed day index ($0, 1, \dots, D$) and $y_i$ is `usedBytes`.

### 5.4 Capacity Runway & Quota Exhaustion
Given available runway $R = \max(0, \text{QuotaBytes} - \text{CurrentUsedBytes})$:
- If $\text{CurrentUsedBytes} \ge \text{QuotaBytes}$:
  - `forecastStatus: 'EXCEEDED'`
  - `projectedDaysRemaining: 0`
  - `projectedExhaustionDate: today`
  - `confidence: 'HIGH'`
- If $\text{AverageDailyGrowth} \le 0$:
  - `forecastStatus: 'STABLE_OR_DECLINING'`
  - `projectedDaysRemaining: null`
  - `projectedExhaustionDate: null`
  - `confidence: N >= 7 ? 'HIGH' : 'MEDIUM'`
- If $\text{AverageDailyGrowth} > 0$:
  - `projectedDaysRemaining`: $\lfloor R / \text{AverageDailyGrowth} \rfloor$
  - `projectedExhaustionDate`: $\text{Date.now()} + (\text{projectedDaysRemaining} \times 86,400,000)$
  - `confidence`:
    - $N \ge 14 \implies \text{'HIGH'}$
    - $7 \le N < 14 \implies \text{'MEDIUM'}$
    - $2 \le N < 7 \implies \text{'LOW'}$
    - $N < 2 \implies \text{'INSUFFICIENT\_DATA'}$

---

## 6. Verification & Implementation Strategy

1. **Step 1:** Implement `StorageForecastService` in `server/src/services/files/storage-forecast.service.ts`.
2. **Step 2:** Wire API endpoints in `super-storage.routes.ts`, `tenant-storage.routes.ts`, and `super.routes.ts`.
3. **Step 3:** Implement Snapshot Scheduler capture method in `StorageForecastService.captureDailySnapshots()`.
4. **Step 4:** Upgrade Super Admin UI (`CMS/src/app/super/tenant-usage-metrics/page.tsx`) with dedicated Analytics & Forecasting section.
5. **Step 5:** Upgrade Tenant Admin UI (`CMS/src/app/(workspace)/tenant/files/storage/page.tsx`) Analytics tab with live forecast and `INSUFFICIENT_DATA` state.
6. **Step 6:** Create comprehensive automated test suite (`scripts/verify_file_manager_f4e_e2e.cjs`).
7. **Step 7:** Run Playwright browser QA across all personas (`scripts/verify_file_manager_f4e_browser_qa.cjs`).
8. **Step 8:** Generate `docs/Saas/file-manager/phase-f4-e/F4E_VERIFICATION_REPORT.md` and STOP.
