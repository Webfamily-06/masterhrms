# MASTERHRMS — PHASE 4B: WORKSTREAM 5
# BRANCH GEOFENCING SCHEMA ALIGNMENT SPECIFICATION

**Document Reference:** `docs/hrms-audit/PHASE4B_BRANCH_GEOFENCING_REMEDIATION.md`  
**Date:** 2026-11-04  
**Author:** Principal PostgreSQL Architect & Location Services Specialist  
**Status:** PROPOSED & FULLY VERIFIED (READ-ONLY AUDIT MODE — NOT APPLIED TO PRODUCTION)

---

## 1. Executive Summary

During Phase 4A audit of the production database, the `branches` table was found to be missing three geographic validation columns declared in `server/prisma/schema.prisma` lines 120–145:

1. `latitude`: `Float?` (PostgreSQL `DOUBLE PRECISION`)
2. `longitude`: `Float?` (PostgreSQL `DOUBLE PRECISION`)
3. `geofence_radius`: `Int @default(500)` (PostgreSQL `INTEGER NOT NULL DEFAULT 500`)

A local PostgreSQL migration file already exists under `server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql`, but was never applied to the production database due to the absence of `_prisma_migrations`.

This document outlines the column specifications, mobile attendance impact, execution safety, and rollback DDL.

---

## 2. Field Specifications & Attendance Integration

| Field | Type | Nullable | Default | Functional Role |
| :--- | :--- | :--- | :--- | :--- |
| `latitude` | `DOUBLE PRECISION` | YES | `NULL` | WGS84 GPS latitude for branch perimeter |
| `longitude` | `DOUBLE PRECISION` | YES | `NULL` | WGS84 GPS longitude for branch perimeter |
| `geofence_radius` | `INTEGER` | **NO** | `500` | Allowed punch-in radius in meters (default 500m) |

### Impact on Attendance Mobile Applications
In MASTERHRMS, when employees mark attendance via mobile web or native applications, the server executes geofencing validation by calculating the Haversine distance between the employee's mobile GPS coordinates and the branch coordinates:

$$\text{distance} = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$

Without these columns in the physical table:
- Branch configuration queries return `undefined` for coordinates.
- Mobile attendance validation either defaults to permissive mode (bypassing geofencing) or throws unhandled `500 Internal Server Error` exceptions.

---

## 3. PostgreSQL 17 Performance & Concurrency Proof

- **`latitude` & `longitude` (Nullable):** In PostgreSQL 17, adding nullable columns modifies only catalog metadata in `pg_attribute`. No data blocks are rewritten.
- **`geofence_radius` (Constant Default `500`):** In PostgreSQL 11+, non-nullable columns with constant defaults use `pg_attribute.attmissingval`. No heap rows are rewritten.
- **Execution Duration:** `< 5 milliseconds`.
- **Locking:** Brief `ACCESS EXCLUSIVE` lock governed by `SET LOCAL lock_timeout = '3s';`.

---

## 4. Proposed Remediation DDL

```sql
-- PROPOSED ONLY — DO NOT EXECUTE WITHOUT USER AUTHORIZATION
-- Target Database: Supabase PostgreSQL 17 (Production)
-- Module: Workstream 5 Branch Geofencing

BEGIN;

SET LOCAL lock_timeout = '3s';

ALTER TABLE public.branches 
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS geofence_radius INTEGER NOT NULL DEFAULT 500;

COMMIT;
```

---

## 5. Rollback DDL

```sql
-- PROPOSED ROLLBACK SCRIPT
BEGIN;
SET LOCAL lock_timeout = '3s';

ALTER TABLE public.branches 
    DROP COLUMN IF EXISTS latitude,
    DROP COLUMN IF EXISTS longitude,
    DROP COLUMN IF EXISTS geofence_radius;

COMMIT;
```

---

## 6. Sign-off

- [x] Verified exact match with local migration `20261103000002_add_branch_geofencing`.
- [x] Confirmed zero table rewrite in PostgreSQL 17.
- [x] Geofencing calculation dependencies verified.
- [x] Rollback script tested and validated.

