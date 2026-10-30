# MASTERHRMS — FILE MANAGER PHASE F3 IMPLEMENTATION PLAN
## File Manager: Sharing & Collaboration

**Document ID:** `FILE_MANAGER_F3_IMPLEMENTATION_PLAN.md`  
**Phase:** F3 — Sharing, Collaboration, Team Folders & Public Links  
**Status:** PLAN APPROVED — READY FOR IMPLEMENTATION  
**Date:** 2026-10-30  
**Target Environment:** MasterHRMS Multi-Tenant Platform (`server/`, `CMS/`, `src/`)  
**Baseline:** F1 independently verified (14/14 PASS); F2 UI core & browser QA reported PASS (20/20 PASS)  

---

## 1. EXECUTIVE SUMMARY & AUTHORIZATION SCOPE

Phase F3 implements end-to-end secure file collaboration within the MasterHRMS File Manager, extending the canonical `MediaFile` architecture and F2 Windows 11 File Explorer UI without creating secondary storage systems.

### Core Objectives
1. **Server-Enforced ACL Management:** Fine-grained permissions (`OWNER`, `MANAGER`, `EDITOR`, `VIEWER`) on files and folders with deterministic upward inheritance and privacy-by-default isolation.
2. **Internal Sharing:** Role-, Department-, Team-, and User-scoped grants strictly bound to tenant boundaries with typeahead principal resolution.
3. **Team Folders:** Collaborative team workspace directories governed by `FileTeam` and `FileTeamMember`, with immediate membership-change access propagation and non-destructive folder preservation upon team deletion.
4. **Cryptographically Secure External Links:** Token-hashed (`SHA-256`), optional password-protected (bcrypt), time-limited public links issuing short-lived signed download URLs via the storage provider with zero persistent plaintext storage.
5. **Windows 11 Collaboration UI:** Ribbon bar "Share", context menu "Share...", modal sharing dialog with "Invite" and "Public Link" tabs, Manage Access panel, and sidebar navigation filters for "Shared with Me" and "Team Folders".
6. **Audit & Realtime Outbox:** Transactional outbox event persistence (`OutboxEvent`), immutable `FileActivity` logging, and non-blocking Socket.IO tenant room broadcasts.

---

## 2. PRE-IMPLEMENTATION AUDIT FINDINGS

| Component / Model | Current Code State | F3 Implementation Requirement |
| :--- | :--- | :--- |
| **`FileAcl`** | Schema exists with 0 rows; fields for `fileId`, `principalType`, `principalId`, `permission`, `inherit`, `expiresAt`, `linkTokenHash`, `linkPasswordHash`, `linkScope`. | Full implementation: CRUD operations, inheritance evaluation, token hashing, password verification. |
| **`FileShare`** | Legacy table with 0 rows; direct `sharedWith` checks in `files.service.ts`. | Maintain backward compatibility aliases; route new grants through normalized `FileAcl`. |
| **`FileTeam` & `FileTeamMember`** | Schema models exist in PostgreSQL; 0 rows. | Implement team creation, member management, root folder linkage, and permission mapping. |
| **Permission Inheritance** | Only direct file checks (`fileId === id`) implemented in `files.service.ts`. | Implement recursive ancestor check via `parentId` and `materializedPath` with `inherit === true`. |
| **Public Links** | No public link endpoints exist; direct access requires JWT. | Implement `POST /api/v1/files/:id/public-link`, `GET /api/v1/public/files/link/:token`, `POST /api/v1/public/files/link/:token/download`. |
| **Tenant Isolation** | Strict `tenantId` enforcement on all queries. | Retain strict isolation: principals must be validated against `tenantId`; cross-tenant grants return 400. |
| **Outbox & Socket.io** | `OutboxService.createOutboxEvent` active for F1 mutations. | Integrate Outbox events: `file:acl:created`, `file:acl:updated`, `file:acl:revoked`, `file:team:created`, `file:team:member_added`, `file:team:member_removed`. |

---

## 3. SERVER-ENFORCED ACL PERMISSION MATRIX & INHERITANCE ENGINE

### 3.1 Permission Matrix

| Capability / Action | Viewer | Editor | Manager | Owner |
| :--- | :---: | :---: | :---: | :---: |
| **View Metadata & Details** | Yes | Yes | Yes | Yes |
| **Generate Signed Preview URL** | Yes | Yes | Yes | Yes |
| **Generate Signed Download URL** | Yes (if enabled) | Yes | Yes | Yes |
| **Upload File into Shared Folder** | No | Yes | Yes | Yes |
| **Create Subfolder in Shared Folder** | No | Yes | Yes | Yes |
| **Rename File or Subfolder** | No | Yes | Yes | Yes |
| **Move Item (within shared scope)** | No | Yes | Yes | Yes |
| **Move to Recycle Bin / Trash** | No | Yes | Yes | Yes |
| **Restore from Recycle Bin** | No | Yes | Yes | Yes |
| **Permanent Delete / Purge** | No | No | Yes | Yes |
| **Manage Access / Share** | No | No | Yes | Yes |
| **Create / Revoke Public Links** | No | No | Yes | Yes |
| **Transfer Ownership** | No | No | No | Yes |

### 3.2 Permission Resolution & Inheritance Algorithm
When evaluating user $U$ accessing file or folder $F$ in tenant $T$:
1. **Super Admin / Tenant Admin Override:** If $U$ has `super_admin` or `tenant_admin` (or `files.admin.view_all`), grant `OWNER` / full access.
2. **Direct Ownership:** If $F.\text{ownerId} === U$ or $F.\text{uploadedBy} === U$, grant `OWNER`.
3. **Direct File ACL Check:** Check `FileAcl` where `fileId === F.id` and active (`expiresAt == null || expiresAt > now`):
   - Match $U$ directly (`principalType === "USER" && principalId === U`).
   - Match any `FileTeam` where $U$ is a member (`principalType === "TEAM" && principalId IN U.teams`).
   - Match $U$'s department (`principalType === "DEPARTMENT" && principalId === U.departmentId`).
   - Match $U$'s roles (`principalType === "ROLE" && principalId IN U.roles`).
   - If match found, resolve highest permission (`MANAGER > EDITOR > VIEWER`).
4. **Ancestor Folder Inheritance:** If no direct ACL on $F$ and $F.\text{parentId} \neq \text{null}$:
   - Traverse ancestor folders via `materializedPath` or parent chain.
   - For each ancestor folder $A$, check for active `FileAcl` with `inherit === true`.
   - The nearest ancestor with an active ACL governs the item.
5. **Privacy by Default:** If no matching ownership, admin permission, direct ACL, or inherited ACL is found, return `404 Not Found` (never leaking existence).

---

## 4. TEAM FOLDERS & MEMBERSHIP ARCHITECTURE

### 4.1 Team Data Model
- **`FileTeam`**: Represents a collaborative department or project unit within tenant $T$.
  - `rootFolderId`: A designated `MediaFile` folder record with `isFolder: true`, `category: "Team"`, and `ownerType: "TEAM"`.
- **`FileTeamMember`**: Binds user $U$ to team with a designated team role:
  - `MANAGER` $\rightarrow$ grants `MANAGER` ACL on team folder hierarchy.
  - `CONTRIBUTOR` $\rightarrow$ grants `EDITOR` ACL on team folder hierarchy.
  - `VIEWER` $\rightarrow$ grants `VIEWER` ACL on team folder hierarchy.

### 4.2 Team Lifecycle Rules
- **Creation:** `POST /api/v1/files/teams` creates the team and its dedicated root folder simultaneously in a transaction, adding the creator as `MANAGER`.
- **Membership Updates:** Adding or removing team members immediately modifies access without needing folder re-indexing.
- **Team Deletion:** When a team is deleted, underlying files and folders are **never** deleted. The root folder is transferred to the tenant administrator or team creator with an audit record.

---

## 5. EXTERNAL PUBLIC LINKS SECURITY DESIGN

### 5.1 Unguessable Token & Secure Hash Storage
- Raw public token is generated using `crypto.randomBytes(32).toString('hex')` (256-bit entropy, 64 hex characters).
- The raw token is **never stored in plaintext** in the database.
- Database persists `FileAcl.linkTokenHash = SHA-256(rawToken)`.
- When an external visitor accesses `/public/share/:token`, the server computes `SHA-256(:token)` and queries `FileAcl` by hash.

### 5.2 Password Protection & Expiration
- If password protection is configured, the password is encrypted using a salted hash (`FileAcl.linkPasswordHash`).
- Unverified access to `GET /api/v1/public/files/link/:token` returns `{ requiresPassword: true, allowDownload: false }` without exposing sensitive file metadata.
- Visitor must submit the plaintext password via `POST /api/v1/public/files/link/:token/verify` with `{ password: string }`.
- Upon successful password verification, the server responds with `{ verified: true, file: PublicFileMetadata, allowDownload: boolean }`, unlocking file metadata for the guest UI.
- For download authorization, `POST /api/v1/public/files/link/:token/download` requires `{ password?: string }` in the payload, ensuring protected files verify password authorization before issuing the short-lived signed download URL.
- If `expiresAt` is configured and `expiresAt <= now`, the link is rejected with `404 Not Found`.
- Trashed or deleted files (`deletedAt != null || status === "TRASHED"`) automatically invalidate public links.

### 5.3 Storage URL Isolation
- Public link resolution returns sanitized file metadata only.
- Raw storage keys or permanent storage URLs are never exposed.
- A download request issues a short-lived (60-second) signed download URL via `StorageProvider.getSignedDownloadUrl()`.
- HTTP headers enforce `X-Robots-Tag: noindex, nofollow, noarchive`.

---

## 6. BACKEND API ENDPOINTS SPECIFICATION

### 6.1 ACL & Sharing Endpoints
- `GET /api/v1/files/:id/acls`: Retrieves all direct and inherited ACL grants for a file or folder. (Requires `MANAGER` or `OWNER`).
- `POST /api/v1/files/:id/acls`: Grants or updates an ACL for a user, team, department, or role. (Requires `MANAGER` or `OWNER`).
- `DELETE /api/v1/files/:id/acls/:aclId`: Revokes an ACL. (Requires `MANAGER` or `OWNER`).
- `GET /api/v1/files/shared-with-me`: Lists all files and folders shared with the authenticated user directly or via team/department/role.
- `GET /api/v1/files/principals/search`: Search tenant users, teams, and departments for sharing picker.

### 6.2 Team Folder Endpoints
- `GET /api/v1/files/teams`: Lists all teams in the tenant where the user is a member (or all teams for admin).
- `POST /api/v1/files/teams`: Creates a new team and its root folder.
- `GET /api/v1/files/teams/:id`: Retrieves team details, members, and root folder.
- `POST /api/v1/files/teams/:id/members`: Adds a member to a team.
- `DELETE /api/v1/files/teams/:id/members/:userId`: Removes a member from a team.
- `DELETE /api/v1/files/teams/:id`: Deletes a team safely without purging underlying files.

### 6.3 Public Link Endpoints
- `POST /api/v1/files/:id/public-link`: Generates or updates a public link for a file (returns raw token once).
- `DELETE /api/v1/files/:id/public-link`: Revokes the active public link.
- `GET /api/v1/public/files/link/:token`: Public anonymous endpoint to get link status and preview metadata (restricted when password required).
- `POST /api/v1/public/files/link/:token/verify`: Public verification endpoint validating `{ password: string }`, returning unlocked metadata and download authorization.
- `POST /api/v1/public/files/link/:token/download`: Public anonymous endpoint to get short-lived signed download URL (validates `{ password?: string }` payload for protected links).

---

## 7. UI EXTENSIONS SPECIFICATION

1. **Navigation Sidebar:**
   - Add **"Shared with Me"** (`category === "Shared"`) with icon `/FILE-MANAGER/Folder%20Favourites.ico` or Lucide `Users`.
   - Add **"Team Folders"** (`category === "Teams"`) with icon `/FILE-MANAGER/Folder%20Documents.ico` or Lucide `Users`.
2. **Command Ribbon & Context Menu:**
   - "Share" button in Ribbon Bar and Context Menu (`Share2` icon).
   - "Manage Access" item in Ribbon and Context Menu.
3. **Sharing Dialog Modal (`ShareModal`):**
   - **Internal Sharing Tab:**
     - Search input with tenant principal autocomplete (Users, Teams, Departments).
     - Role dropdown (`Viewer`, `Editor`, `Manager`).
     - Optional message textarea.
     - "Invite" button.
     - List of users/teams with current access, avatar, role dropdown, and "Remove" button.
   - **Public Link Tab:**
     - Enable/Disable public link switch.
     - Password protection toggle and input.
     - Expiry selector (1 day, 7 days, 30 days, Custom, Never).
     - Download permission toggle (`allowDownload`).
     - "Copy Public Link" button with toast notification.
     - "Revoke Link" button with confirmation.
4. **Public Link Guest View (`/share/[token]`):**
   - Standalone clean page with MasterHRMS styling.
   - Password prompt modal if link is password-protected.
   - File details, preview thumbnail, and Download button.

---

## 8. TEST & VERIFICATION STRATEGY

### 8.1 Automated Integration Tests
- ACL permission matrix tests (`VIEWER`, `EDITOR`, `MANAGER`, `OWNER`).
- Inheritance tests: child file inherits permissions from parent folder.
- Team folder access: team member can access files; removing member revokes access.
- Cross-tenant rejection: attempting to share with user from another tenant fails with 400.
- Public link token security: raw token verified, password verified, expired/revoked link returns 404.
- Download authorization: public link download issues valid signed URL only when authorized.

### 8.2 Browser QA Verification
- Dual-session testing (HR Admin & Employee) verifying sharing flow, permission changes, team folders, and public link access in an incognito session.

---

## 9. ACCEPTANCE GATE CHECKLIST

- [ ] `FileAcl` and `FileTeam` services implemented and compiling with 0 errors.
- [ ] Server-enforced permissions on all file endpoints (view, download, upload, rename, move, delete, share).
- [ ] Cross-tenant sharing strictly rejected.
- [ ] Team folder creation and membership enforcement verified.
- [ ] Public links use SHA-256 token hashing, password protection, and expiry.
- [ ] Automated regression tests pass.
- [ ] Dual-workspace synchronization verified (`CMS/src/...` $\leftrightarrow$ `src/...`).

