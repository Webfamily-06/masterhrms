# MASTERHRMS — PHASE F5 FORENSIC AUDIT
## Module Integration, Universal FilePicker, System Folders & Storage Migration

- **Project:** MASTERHRMS SaaS
- **Phase:** F5 ONLY
- **Module:** Enterprise File Manager — Module Integration & Universal Ingestion
- **Auditor / Lead Implementer:** Lead Core Systems Engineer
- **Date:** October 31, 2026
- **Status:** **APPROVED & AUTHORITATIVE BASELINE ESTABLISHED**

---

## 1. Authoritative F5 Scope

The authoritative specification for **Phase F5: Module Integration (Automatic Folders + Picker + Migration)** is derived directly from the canonical File Manager Execution Blueprint (Master Prompt Step 654) and pre-implementation architecture audits (`FILE_MANAGER_F0_AUDIT_REPORT.md` and `FILE_MANAGER_F1_IMPLEMENTATION_REPORT.md`).

### The 6 Core Pillars of Phase F5:
1. **System Folder Hierarchy Convention (`App Files / {Module name} / {Page name}`):**
   - Standardized system folder tree automatically provisioned on first upload or through `POST /api/v1/files/system-folders/ensure`.
   - Folder display names are dynamically mapped from the Centralized Navigation Registry (`NAVIGATION_REGISTRY` in `CMS/src/lib/navigation-registry.ts`) and module manifests rather than hardcoded strings.
   - Folders are marked system (`systemModule`, `systemPage`, `ownerType: "SYSTEM"`), strictly preventing users from renaming, moving, or deleting them (`403 Forbidden`).
   - Files uploaded from any application page land in the corresponding system folder, owned by the uploader, linked to the target entity (`FileLink`), and visible to others only via entity-level permissions or Tenant Admin audited Organization view.
2. **Universal Shared `FilePicker` Component:**
   - Universal dual-tab modal dialog replacing raw `<input type="file">` elements across all modules.
   - **Tab 1: "Upload New"** — Drag-and-drop zone, file type validation, chunked direct-to-storage upload, real-time progress indicator.
   - **Tab 2: "From File Manager"** — Embedded File Explorer in selection mode, filtered by `accept` mime types and max file sizes, supporting single/multi-select.
   - **Zero Duplicate Bytes:** Selecting an existing file creates a `FileLink` record instead of re-uploading bytes or cloning files.
   - **Privacy Notice:** Prominently alerts the user when linking an existing personal file: *"This file will be visible to people who can view this record."*
   - Field displays file thumbnail/icon, filename, formatted size, "Open in File Manager" deep link, and "Remove" (which unlinks without deleting the underlying physical file).
3. **Application-Wide Upload Points Migration:**
   - Migrate key module upload interfaces identified in the F0 inventory (Expenses, HR Employees/KYC/Documents, Settings & Branding, Chat, Billing, AI OCR/Imports) to the new FilePicker and system folder backend.
   - Preserve backward compatibility by maintaining thin proxy aliases for legacy endpoints (`/api/v1/media/upload`, etc.).
4. **Module Permission Delegation Engine (`canAccessFile` via `FileLink`):**
   - Access control resolution in `FileAclService` evaluates `FileLink` relationships: if a user is authorized to view a business record (e.g., an Expense Claim, Support Ticket, or Employee Profile), they are automatically granted `VIEWER` permission to files linked to that record.
   - Deleting a linked business record unlinks the `FileLink`; the underlying physical file is preserved if owned or linked elsewhere.
5. **Public vs. Private Asset Segregation:**
   - Private business records (employee passports, KYC, contracts, medical certificates, receipts, salary slips) are strictly private, served via authenticated, short-lived signed URLs.
   - Public assets (company logos, workspace branding, job board banners, public marketing assets) support a public flag (`isPublic: true`) and are served via public CDN/cache-friendly routes (`/api/v1/public/files/*`).
6. **Local-to-Object Storage Migration Engine:**
   - Resumable background migration service to transition legacy files stored on local/ephemeral disk (`storage_disk: 'LOCAL'`) to configured object storage (Supabase Storage).
   - Generates an auditable verification report detailing migrated counts, bytes transferred, and SHA-256 checksum integrity.

---

## 2. Existing Requirements & Acceptance Criteria

| Requirement ID | Capability | Acceptance Criteria |
| :--- | :--- | :--- |
| **REQ-F5-1** | System Folder Auto-Provisioning | `POST /api/v1/files/system-folders/ensure` creates `App Files / {Module} / {Page}` if missing. Idempotent. Returns folder IDs. Marked `systemModule` / `systemPage`. |
| **REQ-F5-2** | System Folder Immutability | Sibling rename, trash, or delete requests on system folders return `403 Forbidden: System folders and files cannot be renamed/moved to trash`. |
| **REQ-F5-3** | Universal `FilePicker` Component | Dual tabs: "Upload New" & "From File Manager". Filtered by `accept` mime types and max size. Single/multi-selection. |
| **REQ-F5-4** | Zero-Byte Linking via `FileLink` | Selecting an existing file creates a `FileLink` entry with `fileId`, `entityType`, `entityId`, `fieldKey`, `module`, `pageKey`. Zero new storage bytes consumed. |
| **REQ-F5-5** | Visibility Warning Dialog | Warning banner displayed when selecting an existing file: *"This file will be visible to people who can view this record."* |
| **REQ-F5-6** | Entity Permission Delegation | `FileAclService.resolvePermission` checks `FileLink` entries. If user has entity access, returns `VIEWER`. |
| **REQ-F5-7** | Unlink on Business Delete | Removing a file attachment removes `FileLink` record only; underlying `MediaFile` is preserved unless explicitly purged by owner. |
| **REQ-F5-8** | Public vs. Private Asset Routing | Public files (`isPublic: true` / public branding) served without authentication via public routes; private files require authenticated signed URLs. |
| **REQ-F5-9** | Storage Migration Engine | Resumable service reads `storage_disk: 'LOCAL'`, uploads to active `StorageProvider`, verifies SHA-256, and updates `storage_disk` to `'SUPABASE'`. |
| **REQ-F5-10** | Legacy Backward Compatibility | Existing endpoints (`POST /api/v1/media/upload`, `GET /api/v1/media`) continue to work seamlessly via thin adapters. |

---

## 3. Dependencies on F1–F4-F

Phase F5 builds directly on the completed and verified architecture of earlier phases:
- **Phase F1 (Storage Core & Data Model):** Reuses `MediaFile` (canonical file node), `FileVersion`, `FileLink`, `StorageUsage`, `StorageQuota`, and `StorageProviderFactory` (`SupabaseStorageProvider`, `LocalStorageProvider`).
- **Phase F2 (Unified Explorer & Trash):** Reuses Windows 11 Explorer components, folder navigation, list/grid views, and trash lifecycle.
- **Phase F3 (ACL & Sharing):** Reuses `FileAclService`, `FileShare`, and permission resolution hierarchy.
- **Phase F4-B (SUCE Reconciliation):** Reuses multi-dimensional storage usage accounting (`activeBytes`, `trashBytes`, `versionBytes`) and ensures zero counter drift during linking and migrations.
- **Phase F4-C (Quota Governance):** Enforces user and tenant quota reservation during new uploads in `FilePicker`.
- **Phase F4-D (Storage Admin Dashboard):** Visualizes system folders and storage breakdowns by module.
- **Phase F4-E (Capacity Analytics):** Forecasts system folder storage growth.
- **Phase F4-F (Retention Automation):** Guarantees files referenced in `FileLink` and `MediaUsage` are shielded from automated purge sweeps.

---

## 4. Existing Reusable Components and Services

### Backend:
- `FilesService` (`server/src/services/files/files.service.ts`): File CRUD, node tree navigation, trash/restore, signed URLs.
- `FileAclService` (`server/src/services/files/file-acl.service.ts`): Multi-tier ACL and permission evaluation.
- `FileInvariantsService` (`server/src/services/files/file-invariants.service.ts`): Case-insensitive name key hashing, path materialized calculations.
- `QuotaService` (`server/src/services/files/quota.service.ts`): User and tenant quota allocation and reservation.
- `StorageProviderFactory` (`server/src/services/storage/storage-provider.factory.ts`): Multi-cloud object storage driver.
- `MediaService` (`server/src/services/media/media.service.ts`): Magic byte validation, MIME sniffing, SHA-256 integrity calculation.
- `OutboxService` (`server/src/services/outbox.service.ts`): Transactional event broadcasting via Socket.IO.

### Frontend:
- `CMS/src/lib/navigation-registry.ts`: Authoritative module registry defining labels, routes, and icons.
- `CMS/src/components/media/media-picker-modal.tsx`: Precursor modal; provides structural foundation for the universal `FilePicker`.
- `CMS/src/components/apps/file-manager/unified-file-manager.tsx`: Full Explorer component for browsing existing files.
- UI Primitives: `@/components/ui/dialog`, `@/components/ui/tabs`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/progress`.

---

## 5. Database Changes Required

- **`media_files` Table:**
  - Already contains: `id`, `tenant_id`, `file_name`, `file_size`, `mime_type`, `checksum_sha`, `parent_id`, `is_folder`, `system_module`, `system_page`, `materialized_path`, `owner_type`, `owner_id`.
  - Add column: `is_public BOOLEAN NOT NULL DEFAULT false` to explicitly distinguish public CDN assets from private encrypted/authenticated files.
- **`file_links` Table:**
  - Already contains: `id`, `file_id`, `module`, `page_key`, `entity_type`, `entity_id`, `field_key`, `linked_by`, `linked_at`.
  - Add index: `@@index([fileId])` and `@@index([tenantId])` if needed for fast cascade resolution.
- **Migration Script:**
  - Author idempotent migration script: `scripts/migrate_file_manager_f5.cjs`.

---

## 6. API Changes Required

New and enhanced REST endpoints in Express:

| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/files/system-folders/ensure` | `POST` | Authenticated | Ensures system folder hierarchy exists for a given module and page. Returns target folder ID. |
| `/api/v1/files/system-folders` | `GET` | Authenticated | Lists all system folders for current tenant, organized by module. |
| `/api/v1/files/links` | `POST` | Authenticated | Creates a `FileLink` between a file and a business entity. Validates caller permissions. |
| `/api/v1/files/links` | `GET` | Authenticated | Retrieves files linked to a specific entity (`?entityType=...&entityId=...`). |
| `/api/v1/files/links/:id` | `DELETE` | Authenticated | Unlinks a file from an entity. Does not delete underlying file. |
| `/api/v1/files/picker/selectable` | `GET` | Authenticated | Returns candidate files the user has permission to link, filtered by MIME type and search query. |
| `/api/v1/super/storage/migrate-local` | `POST` | `super_admin` | Triggers resumable background migration of local disk files to object storage. |
| `/api/v1/super/storage/migrate-local/status` | `GET` | `super_admin` | Returns current status and telemetry of the storage migration job. |

---

## 7. Frontend Changes Required

1. **Universal `FilePicker` Component:**
   - File: `CMS/src/components/files/file-picker.tsx`.
   - Dual-tab interface ("Upload New" vs "From File Manager").
   - Integrated visibility warning callout.
   - Realtime upload progress bar.
   - Selected file pill with thumbnail, filename, size, "Open in File Manager", and "Remove".
2. **Module Integration:**
   - Integrate `FilePicker` into:
     - `CMS/src/app/(workspace)/expenses/page.tsx` (Expense receipts).
     - `CMS/src/app/(workspace)/hr/employees/[id]/edit/page.tsx` (Employee documents & KYC).
     - `CMS/src/components/settings/media-image-uploader.tsx` (Settings & Branding).
     - `CMS/src/app/(workspace)/ai-ocr/page.tsx` (AI OCR document ingestion).
     - `CMS/src/components/payment-checkout-modal.tsx` (Payment proof).

---

## 8. Security & Tenant-Isolation Implications

- **Strict Tenant Context:** System folders are scoped to `tenantId`. A tenant cannot view or write into another tenant's `App Files`.
- **System Folder Immutability:** Renaming, moving, or trashing system folders is rejected at the API layer with `403 Forbidden`.
- **Permission Delegation Security:** `canAccessFile` checks user access to the linked entity before granting file access via `FileLink`. An employee cannot access another employee's private resume or KYC document simply by guessing a file ID.
- **Zero Byte Leakage:** Selecting a file verifies the caller has active read permissions (`VIEWER` or higher) on that file before allowing them to link it.
- **Public vs. Private Segregation:** Private files are never accessible via static unauthenticated URLs. Direct access without valid auth returns `401 Unauthorized` / `403 Forbidden`.

---

## 9. Performance Considerations

- **Single Query Folder Resolution:** `ensureSystemFolder` leverages caching and single-trip query paths to prevent N+1 folder creation delays.
- **Zero Duplicate Bytes:** Reusing files creates lightweight relational rows (`file_links`) rather than copying gigabytes of duplicate files, drastically reducing object storage costs.
- **Direct-to-Storage Uploads:** FilePicker uploads stream directly to object storage via presigned URLs, bypassing Vercel serverless request limits (~4.5 MB).
- **Indexed Entity Lookups:** Lookups on `file_links(entity_type, entity_id)` use compound B-tree indexes for sub-millisecond retrieval.

---

## 10. Migration & Rollback Risks

- **Risk 1: Existing MediaFile Links Broken:**
  - *Mitigation:* `file_links` runs alongside `media_usages`. Backfill copies existing references into `file_links` without deleting legacy rows.
- **Risk 2: Migration Job Interrupted:**
  - *Mitigation:* Local-to-object migration job is 100% idempotent and resumable. It checks if the object already exists in Supabase Storage and verifies SHA-256 before marking `storage_disk: 'SUPABASE'`.
- **Risk 3: Frontend Component Replacement Regressions:**
  - *Mitigation:* `FilePicker` implements a drop-in API compatible with existing upload triggers.

---

## 11. Test & Browser QA Strategy

1. **Automated E2E Suite (`scripts/verify_file_manager_f5_e2e.cjs`):**
   - System folder creation & naming from Navigation Registry.
   - System folder immutability (rename/trash rejection).
   - Universal FilePicker API (upload new vs select existing).
   - File linking (`FileLink`) and zero-byte duplicate validation.
   - Module permission delegation (`canAccessFile` via entity link).
   - Unlinking without physical file deletion.
   - Public vs. private asset URL segregation.
   - Local-to-object storage migration job and checksum verification.
   - Full regression suite execution across F1, F2, F3, F4-B, F4-C, F4-D, F4-E, F4-F.
2. **Playwright Browser Visual QA (`scripts/verify_file_manager_f5_browser_qa.cjs`):**
   - Capture 6 canonical high-resolution screenshots in `docs/Saas/screenshots/files_f5/`:
     1. `01_universal_file_picker_upload_tab.png` — Drag & drop upload tab.
     2. `02_universal_file_picker_explorer_tab.png` — File Manager selection tab.
     3. `03_file_linking_visibility_warning.png` — Warning dialog on linking existing file.
     4. `04_module_integrated_file_attachment.png` — Attached file preview in Expense/HR form.
     5. `05_system_folders_explorer_view.png` — Explorer displaying `App Files / Module / Page`.
     6. `06_super_admin_storage_migration_modal.png` — Super Admin migration tool & telemetry.

