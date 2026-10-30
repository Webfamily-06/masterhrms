# MasterHRMS File Manager — Phase F4-A
# Report 5: Storage Administration & Quota Governance API Architecture

**Project:** MasterHRMS  
**Module:** Enterprise File Manager  
**Phase:** F4-A (Read-Only Forensic Audit)  
**Document:** `PHASE_F4A_API_ARCHITECTURE.md`  
**Status:** COMPLETE & INDEPENDENTLY AUDITED  
**Date:** October 30, 2026  

---

## 1. Executive Summary

This document audits the existing File Manager API surface in [`server/src/routes/files.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/files.routes.ts) and establishes the complete RESTful API contract specifications for the **Phase F4 Storage Administration, Quota Management, Analytics, and Maintenance Engine**.

### API Architecture Highlights
1. **Clean Route Namespace Partitioning:**
   - User / Workspace Scope: `/api/v1/files/*`
   - Tenant Administration Scope: `/api/v1/tenant/storage/*`
   - Super-Admin Fleet Scope: `/api/v1/super/storage/*`
2. **Strict RBAC Authorization:**
   - User Scope: `requireAuth` + tenant membership validation.
   - Tenant Storage Admin Scope: `requireAuth` + `requireTenantAdmin` (or HR Admin with `manage_storage` capability).
   - Super-Admin Fleet Scope: `requireAuth` + `requireSuperAdmin`.
3. **High-Performance Aggregation Contracts:** Lightweight, cacheable payloads for high-frequency dashboard polling with sub-50ms response targets.
4. **Idempotent Maintenance Operations:** POST endpoints for reconciliation and bulk cleanup support dry-run previews and deterministic execution.

---

## 2. Inventory of Existing File Manager Endpoints (Phases F1–F3)

The existing route definitions audited in `server/src/routes/files.routes.ts` comprise:

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/files/usage/me` | User | Personal 5 GB storage usage and file count. |
| `GET` | `/api/v1/files/usage/tenant` | Tenant Admin / User | Tenant pool storage usage against subscription plan. |
| `GET` | `/api/v1/files/stats` | User / Admin | Total files, folders, category breakdown, percent used. |
| `GET` | `/api/v1/files/nodes` | User | Windows 11 Explorer file/folder tree listing. |
| `GET` | `/api/v1/files/nodes/:id` | User | Single file or folder metadata with ACLs and links. |
| `GET` | `/api/v1/files/nodes/:id/path` | User | Breadcrumb segment resolution from root. |
| `GET` | `/api/v1/files/nodes/:id/download` | User / Public Link | Signed download URL generation (attachment mode). |
| `GET` | `/api/v1/files/nodes/:id/preview` | User / Public Link | Signed preview URL generation (inline streaming). |
| `GET` | `/api/v1/files/stream` | HMAC Signed | Binary streaming endpoint with HTTP 206 range requests. |
| `POST` | `/api/v1/files/uploads` | User | Initiates upload session with atomic quota reservation. |
| `POST` | `/api/v1/files/uploads/:id/complete` | User | Verifies storage binary and commits quota bytes. |
| `POST` | `/api/v1/files/uploads/:id/abort` | User | Cancels session and releases reserved quota bytes. |
| `POST` | `/api/v1/files/folders` | User | Creates directory node in current folder. |
| `PATCH` | `/api/v1/files/nodes/:id` | User | Updates file name, parent folder, or metadata. |
| `POST` | `/api/v1/files/trash` | User | Soft-deletes files/folders to recycle bin; adjusts quota. |
| `POST` | `/api/v1/files/restore` | User | Restores items from recycle bin; re-claims active quota. |
| `POST` | `/api/v1/files/purge` | User / Admin | Permanently purges items and deletes physical objects. |
| `GET` | `/api/v1/files/:id/acls` | Manager / Owner | Retrieves granular file ACL entries. |
| `POST` | `/api/v1/files/:id/acls` | Manager / Owner | Grants ACL permission to User, Team, Role, or Dept. |
| `DELETE`| `/api/v1/files/:id/acls/:aclId` | Manager / Owner | Revokes specific ACL permission. |
| `POST` | `/api/v1/files/:id/public-link` | Manager / Owner | Generates cryptographically secure public link. |
| `DELETE`| `/api/v1/files/:id/public-link` | Manager / Owner | Revokes public link access. |
| `GET` | `/api/v1/files/teams` | User | Lists accessible Team Folders. |
| `POST` | `/api/v1/files/teams` | Admin / Manager | Creates collaborative Team Folder with dedicated root. |

---

## 3. Phase F4 Storage Administration API Specifications

### 3.1 Tenant Storage Admin API Surface (`/api/v1/tenant/storage/*`)

#### 1. `GET /api/v1/tenant/storage/summary`
Returns the authoritative, multi-dimensional storage summary for the authenticated tenant.
- **Access:** `requireTenantAdmin`
- **Response Contract (200 OK):**
```json
{
  "tenantId": "c1f7b8d0-9a3b-4c2e-8f1a-5d6e7f8a9b0c",
  "plan": {
    "planId": "growth",
    "name": "Growth Cloud",
    "storageLimitBytes": 26843545600,
    "formattedLimit": "25 GB"
  },
  "usage": {
    "activeBytes": 14280540160,
    "formattedActive": "13.3 GB",
    "trashBytes": 1610612736,
    "formattedTrash": "1.5 GB",
    "versionBytes": 2147483648,
    "formattedVersions": "2.0 GB",
    "reservedBytes": 52428800,
    "formattedReserved": "50 MB",
    "totalBillableBytes": 18038636544,
    "formattedTotalBillable": "16.8 GB",
    "remainingBytes": 8804909056,
    "formattedRemaining": "8.2 GB",
    "percentUsed": 67.2,
    "fileCount": 14250,
    "folderCount": 1180
  },
  "healthStatus": "HEALTHY",
  "thresholdState": "NORMAL"
}
```

---

#### 2. `GET /api/v1/tenant/storage/breakdown`
Returns categorical, MIME-type, and extension distribution for treemaps and donut charts.
- **Query Params:** `scope=active|trash|all`
- **Response Contract (200 OK):**
```json
{
  "categories": [
    { "category": "Documents", "bytes": 7516192768, "formatted": "7.0 GB", "count": 8200, "percentage": 52.6 },
    { "category": "Images", "bytes": 4294967296, "formatted": "4.0 GB", "count": 4500, "percentage": 30.1 },
    { "category": "Videos", "bytes": 2147483648, "formatted": "2.0 GB", "count": 150, "percentage": 15.0 },
    { "category": "Archives", "bytes": 322122547, "formatted": "307 MB", "count": 40, "percentage": 2.3 }
  ],
  "topExtensions": [
    { "extension": "pdf", "bytes": 5368709120, "count": 5100 },
    { "extension": "docx", "bytes": 2147483648, "count": 3100 },
    { "extension": "mp4", "bytes": 2147483648, "count": 150 },
    { "extension": "png", "bytes": 2684354560, "count": 3200 }
  ]
}
```

---

#### 3. `GET /api/v1/tenant/storage/departments`
Aggregates storage consumption by organizational department.
- **Query Params:** `sortBy=bytes_desc|name_asc`, `page=1`, `limit=20`
- **Response Contract (200 OK):**
```json
{
  "departments": [
    {
      "departmentId": "dept-01",
      "name": "Human Resources",
      "allocatedQuotaBytes": 10737418240,
      "formattedAllocated": "10 GB",
      "usedBytes": 4294967296,
      "formattedUsed": "4.0 GB",
      "percentUsed": 40.0,
      "employeeCount": 18,
      "fileCount": 3200
    },
    {
      "departmentId": "dept-02",
      "name": "Sales & Marketing",
      "allocatedQuotaBytes": 10737418240,
      "formattedAllocated": "10 GB",
      "usedBytes": 8589934592,
      "formattedUsed": "8.0 GB",
      "percentUsed": 80.0,
      "employeeCount": 25,
      "fileCount": 6100
    }
  ],
  "unassignedBytes": 1395638272,
  "totalDepartments": 8
}
```

---

#### 4. `GET /api/v1/tenant/storage/users/leaderboard`
Ranks top storage consumers within the organization for administrative auditing.
- **Query Params:** `sortBy=bytes_desc`, `page=1`, `limit=25`, `search=`
- **Response Contract (200 OK):**
```json
{
  "users": [
    {
      "userId": "usr-101",
      "name": "Sarah Connor",
      "email": "s.connor@masterhrms.com",
      "departmentName": "Sales & Marketing",
      "role": "Marketing Director",
      "usedBytes": 4831838208,
      "formattedUsed": "4.5 GB",
      "quotaBytes": 5368709120,
      "formattedQuota": "5.0 GB",
      "percentUsed": 90.0,
      "fileCount": 1280,
      "hasCustomQuota": false
    }
  ],
  "totalUsersCount": 142
}
```

---

#### 5. `GET /api/v1/tenant/storage/heavy-files`
Detects files larger than a specified threshold (e.g., > 20 MB) or untouched for > 90 days.
- **Query Params:** `minSizeBytes=20971520`, `inactiveDays=90`, `limit=50`
- **Response Contract (200 OK):**
```json
{
  "heavyFiles": [
    {
      "id": "file-8899",
      "fileName": "Annual_Company_Retreat_4K.mp4",
      "fileSize": 1073741824,
      "formattedSize": "1.0 GB",
      "mimeType": "video/mp4",
      "category": "Videos",
      "uploadedBy": "John Doe",
      "ownerName": "John Doe",
      "createdAt": "2025-11-12T10:00:00Z",
      "lastAccessedAt": "2025-12-01T15:30:00Z",
      "daysSinceAccess": 333,
      "versionCount": 1,
      "status": "ACTIVE"
    }
  ],
  "potentialSavingsBytes": 5368709120,
  "formattedPotentialSavings": "5.0 GB"
}
```

---

#### 6. `PUT /api/v1/tenant/storage/quotas/users/:userId`
Configures a custom storage quota override for a specific user.
- **Payload:**
```json
{
  "quotaBytes": 10737418240,
  "reason": "Executive video asset creation workflow"
}
```
- **Response Contract (200 OK):** Returns updated quota record.

---

#### 7. `POST /api/v1/tenant/storage/maintenance/reconcile`
Executes an authoritative reconciliation between database records and materialized counters.
- **Payload:** `{ "dryRun": false }`
- **Response Contract (200 OK):**
```json
{
  "success": true,
  "reconciledAt": "2026-10-30T12:00:00.000Z",
  "discrepanciesFound": 1,
  "adjustments": {
    "usedBytesBefore": 14280540160,
    "usedBytesAfter": 14280540160,
    "trashBytesBefore": 1600000000,
    "trashBytesAfter": 1610612736,
    "deltaBytes": 10612736
  }
}
```

---

#### 8. `POST /api/v1/tenant/storage/maintenance/empty-trash`
Permanently purges all items currently in the Recycle Bin for the tenant.
- **Payload:** `{ "olderThanDays": 0, "confirmText": "PURGE_TRASH" }`
- **Response Contract (200 OK):**
```json
{
  "success": true,
  "purgedFileCount": 142,
  "reclaimedBytes": 1610612736,
  "formattedReclaimed": "1.5 GB"
}
```

---

### 3.2 Super-Admin Fleet Storage API Surface (`/api/v1/super/storage/*`)

#### 1. `GET /api/v1/super/storage/fleet-overview`
Global multi-tenant storage statistics across the entire MasterHRMS SaaS deployment.
- **Access:** `requireSuperAdmin`
- **Response Contract (200 OK):**
```json
{
  "platform": {
    "totalTenants": 246,
    "totalSubscribedStorageBytes": 12884901888000,
    "formattedSubscribed": "12.0 TB",
    "totalConsumedStorageBytes": 5905580032000,
    "formattedConsumed": "5.5 TB",
    "globalUtilizationPct": 45.8,
    "totalFilesAcrossFleet": 1420500,
    "physicalStorageProvider": "Supabase Object Storage"
  },
  "tenantsAtRisk": [
    {
      "tenantId": "t-101",
      "name": "Acme Global HR",
      "plan": "Starter",
      "limitBytes": 10737418240,
      "usedBytes": 10200547328,
      "percentUsed": 95.0,
      "thresholdState": "CRITICAL"
    }
  ]
}
```

---

## 4. Error State Specifications

All endpoints conform to standard MasterHRMS error envelope formats:

| HTTP Status | Error Code | Example Scenario |
| :--- | :--- | :--- |
| **400 Bad Request** | `INVALID_QUOTA_VALUE` | Attempting to assign negative bytes or string values. |
| **403 Forbidden** | `QUOTA_EXCEEDED` | Attempting to upload when storage pool is locked at 100%. |
| **403 Forbidden** | `FORBIDDEN_STORAGE_ADMIN` | Non-admin attempting to access tenant storage analytics. |
| **404 Not Found** | `TENANT_NOT_FOUND` | Specified tenant UUID does not exist. |
| **409 Conflict** | `MEDIA_IN_USE` | Attempting to purge a file actively linked to HR documents. |
| **422 Unprocessable** | `CONFIRMATION_MISMATCH` | Bulk empty-trash missing exact confirmation token. |

---
*Report 5 completed under strict read-only audit protocol.*

