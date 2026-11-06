# MASTERHRMS — AWARD TYPES & EMPLOYEE RECOGNITION ARCHITECTURE AUDIT (PHASE 0)
**Date:** 2026-11-06  
**Auditor:** Master HRMS Architecture & Engineering  
**Scope:** `/hr/organization/award-types`, `/hr/employees/:employeeId`, `server/`, `src/`, and `CMS/`

---

## 1. Executive Summary

This architecture and database audit examines the current state of Award Types, Employee Recognition, Media Uploads, and Employee Profile integrations across both the TanStack (`src/`) and Next.js (`CMS/`) frontend applications, the Express backend (`server/`), the Prisma schema, and the physical Supabase PostgreSQL database.

The audit confirms:
1. **Physical Database Tables Exist**: Both `award_types` and `employee_awards` exist in the database with existing tenant records (6 award types and 3 historical employee awards).
2. **Schema Enhancements Needed (Additive Only)**: `award_types` lacks `status`, `image_url`, `image_storage_path`, `created_by`, and `updated_by` columns. Adding these will enable custom image/icon uploads, lifecycle management (active/inactive), and audit attribution without breaking existing rows.
3. **Backend Master-Data Framework Exists**: `server/src/blueprints/master-data.blueprint.ts` and `organization.routes.ts` already mount `/award-types`. However, `awardType` was missing `status`, `imageUrl`, and `imageStoragePath` from its allowed field list, and lacks an award reference `dependencyCheck`.
4. **Media Upload Infrastructure Exists**: `MediaService` (`server/src/services/media/media.service.ts`) already provides server-authoritative MIME validation (checking magic bytes for PNG, JPEG, WebP, SVG), SHA-256 deduplication, and tenant-scoped storage. A dedicated endpoint `/api/hr/organization/award-types/upload` can leverage this infrastructure.
5. **Employee Master Profile Integration Exists but Needs UI Elevation**: `EmployeeService.getEmployee360` already includes `awards: { include: { awardType: true } }`. The frontend profiles in both `src/` and `CMS/` render a basic awards list in Tab 5, but lack award badges/images, citation details, issuer attribution, and an in-profile "Award Employee" assignment action.
6. **Workspace Parity**: `src/` (TanStack) and `CMS/` (Next.js) have twin architectures and can share the exact same UI/UX design, typography (`--font-sans`), and API contracts.

---

## 2. Detailed Audit Findings

### 2.1 Database & Prisma Inspection
- **Table `award_types`**:
  - Existing physical columns: `id`, `tenant_id`, `name`, `icon`, `description`, `created_at`, `updated_at`.
  - Missing columns to be added additively:
    - `status` (`VARCHAR(30) DEFAULT 'active' NOT NULL`)
    - `image_url` (`VARCHAR(500)`)
    - `image_storage_path` (`VARCHAR(500)`)
    - `created_by` (`VARCHAR(36)`)
    - `updated_by` (`VARCHAR(36)`)
  - Index to be added: `idx_award_types_tenant_status` ON (`tenant_id`, `status`).

- **Table `employee_awards`**:
  - Existing physical columns: `id`, `tenant_id`, `employee_id`, `award_type_id`, `award_date`, `gift_item`, `gift_amount`, `certificate_url`, `certificate_no`, `description`, `presented_by`, `status`, `created_at`, `updated_at`.
  - Foreign key: `award_type_id` references `award_types(id)`.
  - Indexes: `idx_employee_awards_tenant_emp` ON (`tenant_id`, `employee_id`), `idx_employee_awards_tenant_date` ON (`tenant_id`, `award_date`).

### 2.2 Backend API Architecture
- **Route 1: `/api/hr/organization/award-types`** (via `createMasterDataRouter`):
  - Handles GET (paginated, search, status filter), POST, GET `/:id`, PUT `/:id`, DELETE `/:id`, POST `/bulk-archive`.
  - Action items:
    - Add `imageUrl`, `imageStoragePath`, `status`, `title` (alias to `name`) to `MASTER_DATA_ALLOWED_FIELDS.awardType`.
    - Configure `dependencyCheck` to block deletion if `db.award.count({ where: { awardTypeId: id, tenantId } }) > 0`.
    - Configure `customCounts` to aggregate `totalAwardsIssued` from `employee_awards` and `activeTypes` from `award_types`.
    - Provide `POST /api/hr/organization/award-types/upload` for multipart image uploads.
- **Route 2: `/api/awards` and `/api/hr/lifecycle/awards`** (via `awardsRouter`):
  - Handles award assignment (`POST /`), award listing (`GET /`), award update (`PUT /:id`), award revocation (`DELETE /:id`).
  - Action items:
    - Ensure `awardsRouter` is mounted at both `/api/awards` and `/api/hr/lifecycle/awards` so both routing paradigms work seamlessly.
    - Validate that `awardTypeId` assigned belongs to the current tenant and has `status = 'active'`.

### 2.3 Upload & Media Infrastructure
- Storage path standard: `tenants/{tenantId}/award-types/{awardTypeId || 'temp'}/{fileName}`
- Supported MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
- Strict file size limit: 5MB for icons/badges.
- Security: Magic byte header inspection; rejection of executables/scripts; zero storage of base64 in database.

### 2.4 Frontend Pages & Parity
- **Award Types Master**:
  - `src/routes/_authenticated/hr/organization/award-types.tsx`
  - `CMS/src/app/(workspace)/hr/organization/award-types/page.tsx`
  - Action items:
    - Remove decorative icon immediately preceding `Employee Award Types` heading.
    - Display 3 accurate KPI cards: `Total Award Categories`, `Active Award Types`, `Total Awards Issued`.
    - Responsive table with custom image thumbnail, title, description, active/inactive badge, usage count, and actions.
    - Polished Add/Edit modal with drag & drop image upload, live preview, removal, and icon fallback.
    - "Assign Award" modal triggerable from header and row actions.
- **Employee Master Profile**:
  - `src/routes/_authenticated/hr/employees/$id.tsx`
  - `CMS/src/app/(workspace)/hr/employees/[id]/page.tsx`
  - Action items:
    - Upgrade the **Awards & Recognition** section in Tab 5 (Certifications & Recognition).
    - Render image badges, titles, dates, citations, issuer, status.
    - Add "Assign Award" action for HR administrators.

---

## 3. Implementation Plan & Wave Sequencing

- **Wave 1**: Database Migration & Prisma Schema Update (additive columns on `award_types`).
- **Wave 2**: Backend Master Data Blueprint, Award Type Upload Route, and Dependency Check.
- **Wave 3**: Award Assignment API Validation & Lifecycle Router Mounting.
- **Wave 4**: Award Types Page UI in TanStack & Next.js CMS (Table, Upload, Modal, KPI, Lifecycle).
- **Wave 5**: Employee Master Profile Awards & Recognition UI Elevation & Assignment Modal.
- **Wave 6**: Comprehensive Backend, Database, and Playwright E2E Suite with Evidence Screenshots.

