# 16 — MASTERHRMS Backup & Restore Architecture
> Status: **IMPLEMENTED** | Evidence from Codebase Audit

---

## 1. Overview & Dual Backup Strategy

MASTERHRMS provides a two-tiered backup and disaster recovery architecture:

1. **Platform / Super Admin Level (`server/src/services/backup.service.ts`)**:
   - Creates full PostgreSQL database dumps (`pg_dump`) with gzip compression.
   - Manages physical snapshot files on the server (`backups/*.sql.gz`).
   - Supports automated pre-flight integrity verification and disposable dry-run restoration into temporary schemas.
2. **Tenant Workspace / Add-on Level (`server/src/modules/backup-restore/`)**:
   - Tenant-scoped portable JSON snapshot bundles (`manifest.json` + structured relational data).
   - Guarded by tenant entitlement (`requireEntitlement("backup-restore")`).
   - Strict tenant boundary isolation, cryptographic checksum validation (SHA-256), and typed phrase confirmation for restoration.

---

## 2. Super Admin Platform Database Backup

**File:** `server/src/services/backup.service.ts`  
**File:** `server/src/routes/super.routes.ts`

### 2.1 Snapshot Generation Pipeline

- Function: `generateDatabaseBackup(options)`
- Command: Executes `pg_dump` with `--clean --if-exists --no-owner --no-privileges` piped directly into `gzip`.
- Storage: Dedicated server path `backups/database/masterhrms_backup_<timestamp>_<uuid>.sql.gz`.
- Manifest Logging: Records snapshot metadata into `backup_history` or audit logs with size, record counts, and SHA-256 hash.

### 2.2 Super Admin Backup REST API Endpoints

| Endpoint | Method | Security | Description |
|----------|--------|----------|-------------|
| `/api/super/backup/generate` | `POST` | `requireSuperAdmin` | Triggers immediate full PostgreSQL database snapshot generation. |
| `/api/super/backups` | `GET` | `requireSuperAdmin` | Lists all platform backup snapshots with file sizes, timestamps, and checksums. |
| `/api/super/backup/:filename/download` | `GET` | `requireSuperAdmin` | Streams `.sql.gz` archive to authorized Super Admin with path traversal protection. |
| `/api/super/backup/:filename` | `DELETE` | `requireSuperAdmin` | Deletes a backup snapshot file safely. |
| `/api/super/backup/:filename/verify` | `POST` | `requireSuperAdmin` | Performs automated disposable dry-run restore into a sandboxed schema to verify restore integrity without affecting production data. |

---

## 3. Tenant-Scoped Workspace Backup & Restore

**File:** `server/src/modules/backup-restore/backup-restore.service.ts`  
**File:** `server/src/modules/backup-restore/backup-restore.routes.ts`

### 3.1 Tenant Backup Bundle Specification

```typescript
export interface BackupManifest {
  version: string;
  backupId: string;
  tenantId: string;
  workspaceSlug: string;
  createdAt: string;
  createdByUserId?: string;
  modulesIncluded: string[];
  modelCounts: Record<string, number>;
  checksumSha256: string;
  totalRecords: number;
}

export interface BackupBundle {
  manifest: BackupManifest;
  data: Record<string, any[]>;
}
```

### 3.2 Tenant Backup Workflow

1. **Export Snapshot (`POST /api/backup-restore/backups`)**:
   - Queries all direct tenant tables (`employees`, `departments`, `attendance`, `leave_requests`, `crm_leads`, `invoices`, `products`, `projects`, etc.).
   - Redacts critical secrets (hashed passwords, encryption salts, API keys).
   - Generates SHA-256 checksum across data payloads.
   - Saves bundle as `tenant_<tenantId>_<timestamp>.json` under permissions `0o700`.
2. **Download Snapshot (`GET /api/backup-restore/backups/:id/download`)**:
   - Strict tenant-scoped streaming preventing access to other workspaces.
3. **Integrity Validation (`POST /api/backup-restore/validate`)**:
   - Recalculates SHA-256 hash to ensure bundle is untampered.
   - Verifies schema version and compatibility with current database migration version.
4. **Dry-Run Simulation (`POST /api/backup-restore/dry-run`)**:
   - Simulates restore operation in memory.
   - Returns a `DryRunReport` detailing record counts to insert/update, detected foreign key conflicts, and estimated duration.
5. **Guarded Restoration (`POST /api/backup-restore/restore`)**:
   - Requires explicit typed confirmation phrase (e.g. `"RESTORE <WORKSPACE-SLUG>"`).
   - Executes inside an interactive Prisma database transaction (`$transaction`).
   - Dispatches audit logs and invalidates workspace caches upon completion.

### 3.3 Backup Policy & Retention Automation

- Configurable via `PUT /api/backup-restore/policy`:
  - `retentionDays`: Snapshot retention window (default 30 days).
  - `frequency`: `manual` | `daily` | `weekly`.
  - `autoDeleteExpired`: Automated purge of snapshots exceeding retention period.
