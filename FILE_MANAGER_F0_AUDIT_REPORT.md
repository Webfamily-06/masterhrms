# PHASE F0: FILE MANAGER & MEDIA LIBRARY MIGRATION AUDIT REPORT

**Date**: October 30, 2026  
**Auditor**: Lead Implementer / Antigravity Agent  
**Scope**: Media Library inventory, application-wide file upload points, storage engine architecture, Vercel serverless execution constraints, schema diff, and migration plan.

---

## 1. Inventory of Current Media Library

### 1.1 Database Models
The current implementation in `server/prisma/schema.prisma` contains the foundation for media assets and preliminary folder extensions:

1. **`media_files` (`MediaFile`)** (154 active rows in DB):
   - Primary key: `id` (UUID v4)
   - Tenant scoping: `tenant_id` (nullable for Super Admin platform assets, populated for tenant workspaces)
   - Storage fields: `storage_disk` (currently `"LOCAL"`), `file_path` (`VarChar(500)`), `url` (`VarChar(500)`)
   - Metadata: `file_name`, `mime_type`, `file_size`, `width`, `height`, `checksum_sha`, `folder`, `tags` (`String[]`), `uploaded_by`
   - Hierarchy & status extensions: `parent_id`, `is_folder` (`Boolean`), `category` (`VarChar(50)`), `original_folder`, `deleted_at`, `created_at`, `updated_at`
   - Relations: self-referential `parent` / `children`, `stars` (`FileStar[]`), `shares` (`FileShare[]`), `usages` (`MediaUsage[]`).
2. **`media_usages` (`MediaUsage`)** (78 active rows in DB):
   - Maps files to consuming entities: `media_id`, `entity_type`, `entity_id`, `field_key`, `created_at`.
   - Unique compound index: `[media_id, entity_type, entity_id, field_key]`. Prevents deleting files currently in use by settings, branding, or documents.
3. **`file_stars` (`FileStar`)**:
   - User-specific favorite flags: `file_id`, `user_id`, `tenant_id`, `created_at`. Unique on `[file_id, user_id]`.
4. **`file_shares` (`FileShare`)**:
   - Direct file shares: `file_id`, `tenant_id`, `shared_with`, `shared_role`, `access_level` (`"view"|"edit"`), `shared_by`, `expires_at`, `revoked_at`.

### 1.2 Backend Routes & Services
- **`server/src/routes/media.routes.ts`**:
  - `POST /api/v1/media/upload`: Single multipart file upload via `multer.memoryStorage()`, 30 MB limit. Calls `MediaService.uploadMedia(...)`.
  - `GET /api/v1/media`: Lists tenant media filtered by folder with usage relations.
  - `GET /api/v1/media/:id`: Strict tenant isolation check (403 on cross-tenant access).
  - `DELETE /api/v1/media/:id`: Validates `media_usages` (returns 409 `MEDIA_IN_USE` unless `?force=true`).
- **`server/src/routes/files.routes.ts`**:
  - Early implementation of file manager endpoints: `/stats`, `/`, `/upload`, `/folder`, `/:id/rename`, `/:id/move`, `/:id/star`, `/trash`, `/restore`, `/:id/signed-url`, `/:id/stream`.
- **`server/src/services/media/media.service.ts`**:
  - `getUploadsRoot()` resolves to local disk (`uploads/` or `/tmp/uploads` on Vercel).
  - Validates magic byte headers for PNG, JPEG, WebP, GIF, ICO, SVG, PDF, DOCX, XLSX, PPTX, audio, CSV. Computes SHA-256 integrity checksums.
- **`server/src/services/storage/local-encrypted-storage.service.ts`**:
  - AES-256-GCM local encrypted storage engine with tenant directory isolation (`storage/tenants/{tenantId}/...`).

### 1.3 UI Pages and Components
- **Routes**:
  - `/hr/media`: `src/routes/_authenticated/hr/media.tsx` & `CMS/src/app/(workspace)/hr/media/page.tsx` rendering `TenantMediaPage`.
  - `/me/media`: `src/routes/_authenticated/me/media.tsx` & `CMS/src/app/(workspace)/me/media/page.tsx`.
  - `/super/media`: `src/routes/_authenticated/super/media.tsx` & `CMS/src/app/super/media/page.tsx`.
  - `/tenant/files`, `/hr/files`, `/me/files`: `CMS/src/app/(workspace)/.../files/page.tsx` rendering `UnifiedFileManager`.
- **Key Components**:
  - `UnifiedFileManager` (`src/components/apps/file-manager/unified-file-manager.tsx`): 1638-line component with left sidebar navigation (Quick Access, Categories, Storage Bar), breadcrumbs, top toolbar, list/grid view toggles, search, upload dialog, and context menus.
  - `TenantMediaPage` (`src/components/media/tenant-media-page.tsx`): Legacy folder/asset manager with usage links and copy URL functionality.
  - `MediaPickerModal` (`src/components/media/media-picker-modal.tsx`): Modal dialog to pick existing media or upload new files.
  - `MediaImageUploader` (`src/components/settings/media-image-uploader.tsx`): Dedicated image uploader with preview and crop.

---

## 2. Application-Wide Upload Points Inventory Table

Every location in the application where files are uploaded, attached, or ingested:

| # | Module | Page / View | Component / File | Current Endpoint & Storage | Entity & Field Stored | Visibility / Authorization | Target System Folder (F5) |
|---|---|---|---|---|---|---|---|
| **1** | **Chat** | `/hr/chat`, `/me/chat`, `/tenant/chat` | `src/components/chat/unified-chat-app.tsx` | `POST /api/chat/upload` (Multer -> MediaService local disk) | `ChatMessage.attachments`, `ChatMessage.voiceNote`, `MediaUsage(chat_message, id, 'attachment')` | Thread & channel participants only | `App Files/Chat/Attachments` & `App Files/Chat/Voice Notes` |
| **2** | **Settings & Branding** | `/tenant/company-profile`, `/super/settings`, `/onboarding` | `MediaImageUploader`, `onboarding.tsx` | `POST /api/v1/media/upload` (folder: `system/branding` local disk) | `Tenant.logoUrl`, `Setting[workspace.branding_logo]`, `Setting[workspace.branding_favicon]` | All tenant users & public login screen | `App Files/Settings/Branding` |
| **3** | **Profile** | `/me/profile`, `/hr/profile`, `/super/profile` | `src/routes/_authenticated/me/profile.tsx` | `POST /api/v1/media/upload` (local disk) | `Profile.avatarUrl`, `MediaUsage(profile, id, 'avatar')` | Tenant organization members | `App Files/Profile/Avatars` |
| **4** | **Core HR & Employees** | `/hr/employees/$id.edit`, `/me/documents`, `/hr/documents` | `src/routes/_authenticated/hr/employees/$id.edit.tsx` | `POST /api/documents` (JSON linking), `POST /api/v1/media/upload` | `CompanyDocument.fileUrl`, `EmployeeChangeRequest.proofMediaId` | Employee, Reporting Manager, HR Admin, Tenant Admin | `App Files/Employees/Documents` |
| **5** | **Expenses** | `/expenses`, `/me/expenses` | `src/routes/_authenticated/_app/expenses.tsx` | `POST /api/expenses/claims/upload-receipt` (Multer -> memory) | `ExpenseClaim.receiptUrl` | Claim owner, Approving Manager, Finance Admin | `App Files/Expenses/Receipts` |
| **6** | **Helpdesk & Support** | `/helpdesk`, `/me/support` | `SupportTicketModal`, `helpdesk.routes.ts` | `POST /api/helpdesk/tickets` | `SupportTicket.attachments` (JSON array of URLs) | Ticket creator, Assigned Support Agent, Admins | `App Files/Support/Tickets` |
| **7** | **Recruitment** | `/recruitment/candidates`, `/jobs/$id/apply` | `CandidateModal`, `recruitment.routes.ts` | `POST /api/recruitment/candidates` | `Candidate.resumeUrl`, `CandidateOffer.signedContractUrl` | Candidate, Interviewers, HR Admin | `App Files/Recruitment/Resumes` |
| **8** | **Leave Management** | `/me/leave`, `/hr/leave` | `LeaveApplyModal`, `hr-leave.routes.ts` | `POST /api/leave/requests` | `LeaveRequest.attachmentUrl` (Medical certs) | Requester, Approver/Manager, HR Admin | `App Files/Leave/Medical Proofs` |
| **9** | **Asset Management** | `/assets` | `src/components/assets/asset-dashboard-view.tsx` | `POST /api/assets` | `Asset.imageUrl`, `Asset.invoiceUrl` | Asset Manager, IT Admin, Tenant Admin | `App Files/Assets/Inventory` |
| **10** | **Billing & Payments** | `/tenant/billing`, `/super/transactions` | `src/components/payment-checkout-modal.tsx` | `POST /api/commerce/checkout/proof` | `PaymentProof.receiptUrl` | Tenant Admin, Super Admin (audited) | `App Files/Billing/Payment Proofs` |
| **11** | **AI OCR & Imports** | `/ai-ocr`, `/tally-importer` | `src/routes/_authenticated/_app/ai-ocr.tsx`, `tally-importer.tsx` | `POST /api/ai/ocr/extract`, `POST /api/accounting/tally/preview` | Transient buffer / `OcrJob.documentUrl` | Uploading accountant / Finance user | `App Files/Accounting/Imports` |
| **12** | **CMS & Marketing** | `/super/blogs`, `/super/case-studies`, `/super/marketplace` | `super/blogs.tsx`, `marketplace.tsx` | `POST /api/v1/media/upload` (tenantId: null) | `BlogPost.thumbnailUrl`, `CaseStudy.coverUrl`, `Addon.iconUrl` | Public CDN-safe URLs | `App Files/CMS/Public Assets` |

---

## 3. Storage Configuration, Plans, and Org Structures

### 3.1 Existing Storage Configuration
In `server/src/services/settings/settings-registry.ts`, the `storage` settings group already provides the key definitions:
- `storage.provider`: `'local' | 's3' | 'gcs' | 'r2'` (default: `'local'`)
- `storage.s3_bucket`, `storage.s3_region`, `storage.s3_access_key`, `storage.s3_secret_key` (encrypted with AES-256-GCM in `setting_secrets`), `storage.s3_endpoint`, `storage.encryption_enabled`, `storage.max_file_size_mb`.

### 3.2 Subscription Plans & Storage Limits
The database models already include `storageLimitGb`:
- **`SubscriptionPlan`**:
  - `starter`: `maxUsers: 10`, `storageLimitGb: null` (defaults to 10 GB)
  - `growth`: `maxUsers: 50`, `storageLimitGb: 25` (25 GB)
  - `sovereign`: `maxUsers: 250`, `storageLimitGb: 100` (100 GB)
  - `custom-flex`: `maxUsers: 100000`, `storageLimitGb: 500` (500 GB)
- **`TenantSubscription`**:
  - Holds `tenantId`, `planId`, `status`, and `storageLimitGb` (per-tenant override).

### 3.3 Organizations, Teams, Departments, and Roles
- **Users & Employees**: `User` represents login credentials (`id`, `email`, `tenantId`); `Employee` represents HR profile (`id`, `userId`, `departmentId`, `managerId`).
- **Departments**: `Department` (`id`, `tenantId`, `name`). Available for team folder and sharing inheritance.
- **Roles & Permissions**: `WorkspaceRole`, `RolePermission`, `Permission`, `UserRoleAssignment`. Allows sharing files with role principals (e.g. `ROLE:hr_admin`, `ROLE:manager`).
- **Entitlements**: `requireEntitlement("files")` gates file manager access.

---

## 4. Vercel Execution Constraints Analysis

| Capability | Local Development | Vercel Production Environment | File Manager Solution |
|---|---|---|---|
| **Filesystem Access** | Read/Write (`/uploads`, `/storage`) | **Read-only** root filesystem; `/tmp` is ephemeral and lost across cold starts | **Object Storage Only** (S3, Cloudflare R2, Supabase Storage, Wasabi). No local disk dependencies in production. |
| **Request Body Limit** | Configurable (50 MB+) | **Hard limit of ~4.5 MB** on Serverless Functions | **Direct-from-browser presigned multipart uploads**. File chunks stream directly to storage, completely bypassing Vercel functions. |
| **Upload Execution Duration** | Unlimited | Serverless function timeout (10s – 60s) | Presigned chunk upload runs between browser and S3; server only handles lightweight init (100 ms) and complete (200 ms). |
| **Downloads & Streaming** | Node `fs.createReadStream` | Streaming large files exhausts serverless memory & timeout | **Short-lived signed GET URLs** generated after server-side permission check. Browser downloads directly from storage. |

---

## 5. Migration Plan: Schema Diff, Backfill, and Feature Flags

### 5.1 Schema Evolution (Tables for Phase F1)

To respect Rule 1 (*"Evolve the Media Library into the File Manager. Do NOT create a second storage system"*), `media_files` evolves into `file_node` (preserving old foreign keys and API contracts), accompanied by new relational tables:

```prisma
// file_node (evolved from media_files)
model FileNode {
  id                  String             @id @default(uuid()) @db.VarChar(36)
  tenantId            String             @map("tenant_id") @db.VarChar(36)
  parentId            String?            @map("parent_id") @db.VarChar(36)
  type                FileNodeType       @default(FILE) // FILE | FOLDER
  name                String             @db.VarChar(255)
  nameKey             String             @map("name_key") @db.VarChar(255) // lowercase for case-insensitive uniqueness
  ownerType           FileOwnerType      @default(USER) @map("owner_type") // USER | TEAM | ORG | SYSTEM
  ownerId             String             @map("owner_id") @db.VarChar(36)
  mimeType            String             @default("application/octet-stream") @map("mime_type") @db.VarChar(100)
  extension           String             @default("") @db.VarChar(30)
  category            FileCategory       @default(OTHER) // IMAGE | VIDEO | AUDIO | DOCUMENT | ARCHIVE | OTHER
  sizeBytes           BigInt             @default(0) @map("size_bytes")
  storageKey          String             @default("") @map("storage_key") @db.VarChar(500)
  checksumSha256      String?            @map("checksum_sha256") @db.VarChar(64)
  currentVersionId    String?            @map("current_version_id") @db.VarChar(36)
  thumbnailKey        String?            @map("thumbnail_key") @db.VarChar(500)
  status              FileStatus         @default(ACTIVE) // PENDING_UPLOAD | ACTIVE | TRASHED | QUARANTINED | PURGED
  trashedAt           DateTime?          @map("trashed_at")
  trashedBy           String?            @map("trashed_by") @db.VarChar(36)
  originalParentId    String?            @map("original_parent_id") @db.VarChar(36)
  trashedByCascade    Boolean            @default(false) @map("trashed_by_cascade")
  systemModule        String?            @map("system_module") @db.VarChar(50)
  systemPage          String?            @map("system_page") @db.VarChar(50)
  materializedPath    String             @default("/") @map("materialized_path") @db.VarChar(1000)
  depth               Int                @default(0)
  version             Int                @default(1)
  createdBy           String             @map("created_by") @db.VarChar(36)
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")

  parent              FileNode?          @relation("NodeTree", fields: [parentId], references: [id], onDelete: Cascade)
  children            FileNode[]         @relation("NodeTree")
  versions            FileVersion[]
  acls                FileAcl[]
  links               FileLink[]
  favorites           FileFavorite[]
  recentAccesses      FileRecent[]
  activities          FileActivity[]

  @@unique([tenantId, parentId, nameKey, status])
  @@index([tenantId, ownerId, status])
  @@index([tenantId, category, status])
  @@index([tenantId, materializedPath])
  @@map("file_nodes")
}

model FileVersion {
  id          String   @id @default(uuid()) @db.VarChar(36)
  nodeId      String   @map("node_id") @db.VarChar(36)
  versionNo   Int      @map("version_no")
  storageKey  String   @map("storage_key") @db.VarChar(500)
  sizeBytes   BigInt   @map("size_bytes")
  checksum    String   @db.VarChar(64)
  createdBy   String   @map("created_by") @db.VarChar(36)
  createdAt   DateTime @default(now()) @map("created_at")
  isCurrent   Boolean  @default(true) @map("is_current")
  node        FileNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@unique([nodeId, versionNo])
  @@map("file_versions")
}

model FileAcl {
  id               String          @id @default(uuid()) @db.VarChar(36)
  nodeId           String          @map("node_id") @db.VarChar(36)
  principalType    AclPrincipal    @map("principal_type") // USER | TEAM | ROLE | ORG | LINK
  principalId      String?         @map("principal_id") @db.VarChar(36)
  permission       FilePermission  // VIEWER | EDITOR | MANAGER
  inherit          Boolean         @default(true)
  expiresAt        DateTime?       @map("expires_at")
  linkTokenHash    String?         @map("link_token_hash") @db.VarChar(64)
  linkPasswordHash String?         @map("link_password_hash") @db.VarChar(255)
  linkScope        LinkScope?      @map("link_scope") // INTERNAL | EXTERNAL
  createdBy        String          @map("created_by") @db.VarChar(36)
  createdAt        DateTime        @default(now()) @map("created_at")
  node             FileNode        @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@index([nodeId, principalType, principalId])
  @@map("file_acls")
}

model FileTeam {
  id          String           @id @default(uuid()) @db.VarChar(36)
  tenantId    String           @map("tenant_id") @db.VarChar(36)
  name        String           @db.VarChar(100)
  description String?          @db.VarChar(255)
  rootNodeId  String           @map("root_node_id") @db.VarChar(36)
  quotaBytes  BigInt?          @map("quota_bytes")
  createdBy   String           @map("created_by") @db.VarChar(36)
  createdAt   DateTime         @default(now()) @map("created_at")
  members     FileTeamMember[]

  @@map("file_teams")
}

model FileTeamMember {
  teamId    String       @map("team_id") @db.VarChar(36)
  userId    String       @map("user_id") @db.VarChar(36)
  role      TeamRole     @default(VIEWER) // MANAGER | CONTRIBUTOR | VIEWER
  createdAt DateTime     @default(now()) @map("created_at")
  team      FileTeam     @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
  @@map("file_team_members")
}

model FileLink {
  id         String   @id @default(uuid()) @db.VarChar(36)
  nodeId     String   @map("node_id") @db.VarChar(36)
  module     String   @db.VarChar(50)
  pageKey    String   @map("page_key") @db.VarChar(50)
  entityType String   @map("entity_type") @db.VarChar(50)
  entityId   String   @map("entity_id") @db.VarChar(36)
  fieldKey   String   @map("field_key") @db.VarChar(50)
  linkedBy   String   @map("linked_by") @db.VarChar(36)
  linkedAt   DateTime @default(now()) @map("linked_at")
  node       FileNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@unique([nodeId, entityType, entityId, fieldKey])
  @@index([entityType, entityId])
  @@map("file_links")
}

model FileFavorite {
  userId    String   @map("user_id") @db.VarChar(36)
  nodeId    String   @map("node_id") @db.VarChar(36)
  createdAt DateTime @default(now()) @map("created_at")
  node      FileNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@id([userId, nodeId])
  @@map("file_favorites")
}

model FileRecent {
  userId     String   @map("user_id") @db.VarChar(36)
  nodeId     String   @map("node_id") @db.VarChar(36)
  accessedAt DateTime @default(now()) @map("accessed_at")
  node       FileNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@id([userId, nodeId])
  @@map("file_recents")
}

model FileActivity {
  id        String   @id @default(uuid()) @db.VarChar(36)
  nodeId    String   @map("node_id") @db.VarChar(36)
  actorId   String   @map("actor_id") @db.VarChar(36)
  action    String   @db.VarChar(50) // create | upload | rename | move | trash | restore | share
  metaJson  Json?    @map("meta_json")
  ip        String?  @db.VarChar(45)
  userAgent String?  @map("user_agent") @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  node      FileNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@index([nodeId, createdAt])
  @@map("file_activities")
}

model FileUploadSession {
  id               String       @id @default(uuid()) @db.VarChar(36)
  tenantId         String       @map("tenant_id") @db.VarChar(36)
  userId           String       @map("user_id") @db.VarChar(36)
  nodeId           String       @map("node_id") @db.VarChar(36)
  parentId         String?      @map("parent_id") @db.VarChar(36)
  name             String       @db.VarChar(255)
  sizeBytes        BigInt       @map("size_bytes")
  mimeType         String       @map("mime_type") @db.VarChar(100)
  providerUploadId String?      @map("provider_upload_id") @db.VarChar(255)
  partsJson        Json?        @map("parts_json")
  status           UploadStatus @default(INITIATED) // INITIATED | UPLOADING | COMPLETED | ABORTED | EXPIRED
  expiresAt        DateTime     @map("expires_at")
  createdAt        DateTime     @default(now()) @map("created_at")

  @@index([tenantId, userId, status])
  @@map("file_upload_sessions")
}

model StorageQuota {
  id         String      @id @default(uuid()) @db.VarChar(36)
  tenantId   String      @map("tenant_id") @db.VarChar(36)
  userId     String?     @map("user_id") @db.VarChar(36) // null = tenant level
  quotaBytes BigInt      @map("quota_bytes")
  source     QuotaSource @default(DEFAULT) // PLAN | DEFAULT | OVERRIDE | PACK
  updatedBy  String?     @map("updated_by") @db.VarChar(36)
  updatedAt  DateTime    @updatedAt @map("updated_at")

  @@unique([tenantId, userId])
  @@map("storage_quotas")
}

model StorageUsage {
  id         String   @id @default(uuid()) @db.VarChar(36)
  tenantId   String   @map("tenant_id") @db.VarChar(36)
  userId     String?  @map("user_id") @db.VarChar(36) // null = tenant level
  usedBytes  BigInt   @default(0) @map("used_bytes")
  trashBytes BigInt   @default(0) @map("trash_bytes")
  fileCount  Int      @default(0) @map("file_count")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, userId])
  @@map("storage_usages")
}
```

### 5.2 Backfill Strategy (Non-Destructive)
1. **Backfill Script (`scripts/migrate_media_to_file_manager.cjs`)**:
   - Queries all 154 rows from `media_files`.
   - Creates corresponding `file_nodes` records with `status = ACTIVE`, preserving identical IDs.
   - For every file, creates an initial `file_versions` record (Version 1) pointing to `filePath`.
   - Copies all 78 `media_usages` records directly into `file_links`.
   - Aggregates file sizes per tenant and populates `storage_usages`.
   - Creates default user quotas (5 GB) in `storage_quotas`.
2. **Backwards Compatibility**:
   - Legacy routes `/api/v1/media/*` remain active as thin proxies calling the new `FilesService`.
   - `/hr/media` and `/me/media` routes redirect smoothly to `/hr/files` and `/me/files`.

### 5.3 Feature Flag & Rollback Strategy
- **Feature Flag**: `Setting[files.v2_enabled] = true` / `FILE_MANAGER_V2=true`.
- **Rollback Safety**:
  - `media_files` table is preserved.
  - If the flag is set to false, frontend and API fall back immediately to legacy media endpoints.

---

## 6. Open Decisions for Approval Before Phase F1

Please review and confirm the following 9 decisions so Phase F1 data modeling and storage core can commence:

1. **Plan Storage Capacities**:
   - Starter: **10 GB**
   - Growth: **50 GB**
   - Sovereign / Enterprise: **100 GB**
   - Custom Enterprise Flex: **500 GB**
   *(Please confirm if these numbers align with your business tiers).*
2. **Admin Organization View**:
   - Default: **ON** with audited read-only logging and a prominent user-facing disclosure notice in the File Manager footer: *"Administrators of your organization can view files stored in the File Manager"*.
3. **External Public Link Sharing**:
   - Default: **OFF** (internal organization links only; public links gated behind setting/admin approval).
4. **Limits & Retention**:
   - Max file size: **100 MB** (configurable up to 500 MB in Settings).
   - Default user quota: **5 GB** (with overcommit allowed against tenant pool).
   - Recycle bin retention: **30 days** before automatic purge job.
5. **Organization View Roles**:
   - Tenant Admin only (HR Admin can be granted via explicit `files.admin.view_all` permission).
6. **Offboarding Policy**:
   - When an employee is deactivated, default transfer prompt assigns files to their reporting manager.
7. **Storage Provider for Vercel**:
   - S3-compatible driver (Cloudflare R2, AWS S3, Wasabi, or Supabase Storage). Local storage adapter used for offline/local development.
8. **Client Portal Users**:
   - Client portal users do NOT get File Manager access (strictly internal tenant users & employees).
9. **UI Tabs Rule Compliance**:
   - Tabs are strictly restricted to dialogs (e.g. FilePicker tabs: "Upload New" vs "From File Manager"). Top-level navigation uses distinct URL routes (`/files/folder/:id`, `/files/trash`, `/files/shared-with-me`).

---

### Request for Approval
Phase F0 Audit is complete. Please provide your decisions on the items above and approve proceeding to **PHASE F1: DATA MODEL, STORAGE, QUOTA CORE, API**.

