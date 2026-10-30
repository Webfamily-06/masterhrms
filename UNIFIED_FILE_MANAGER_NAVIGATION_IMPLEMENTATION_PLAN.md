# MASTERHRMS — UNIFIED FILE MANAGER NAVIGATION & ORGANIZATION CHAT FOLDER INTEGRATION
## Comprehensive Implementation Plan

**Module:** Enterprise File Manager  
**Phase:** Unified Navigation & Organization Chat Integration  
**Execution Mode:** Audit → Plan → Implement → Test → Browser QA → Report → STOP  
**Target Date:** October 2026  

---

## 1. Executive Summary & Architectural Goals

MasterHRMS previously had fragmented file experiences across workspaces:
- Redundant and confusing routes: `/super/media` vs `/super/files/storage`, `/hr/media` vs `/hr/files` vs `/apps/file-manager/list-view` vs `/apps/file-manager/grid-view`, and `/me/media` vs `/me/files`.
- Duplicate sidebar entries: "Media Library", "File Manager", "List View", "Grid View", and "Shared Files & My Files".
- Disjointed storage paradigms: The Super Admin "Platform Media Gallery" operated as a separate card interface while the Workspace "Unified File Manager" offered Windows 11 Explorer views.
- Chat attachments were stored with basic string paths (`Chat/Images`, `Chat/Documents`) without an organizational folder hierarchy, ACL isolation, or integration into the canonical File Manager.

### Core Objectives
1. **One Canonical File Manager Per Workspace**:
   - Super Admin: `/super/files` (with legacy redirect from `/super/media`)
   - Tenant Admin: `/tenant/files`
   - HR Admin: `/hr/files` (with legacy redirects from `/hr/media`, `/apps/file-manager`, etc.)
   - Employee: `/me/files` (with legacy redirect from `/me/media`)
2. **Elimination of Sidebar Duplication**: Exactly one "File Manager" entry per workspace. Remove all separate "Media Library", "Grid View", and "List View" submenu entries.
3. **In-Page View Switcher**: Instant switching between **Details View**, **Grid View (Tiles)**, and **Compact List View** via toolbar controls without URL route changes, preserving folder, search, filter, and selections.
4. **Super Admin Platform Media Consolidation**: Retain 100% of the platform media gallery capabilities (branding assets, in-use protection, tag filtering, copy URL, image previews) inside the canonical Super Admin File Manager (`tenantId = null`).
5. **Organization File Manager for Tenant Admin**: Full organizational file governance: Organization Files (`view=org`), My Files (`view=my`), Department Folders, Team Folders, Shared with Me, Starred, Recent, and Recycle Bin.
6. **Organization Chat Folder Structure & ACL Integration**:
   ```text
   Organization Files/
   └── Communication/
       └── Organization Chat/
           ├── General/
           │   └── Attachments/
           ├── Departments/
           │   ├── HR/
           │   │   └── Attachments/
           │   └── ...
           ├── Teams/
           │   └── {Team Name}/
           │       └── Attachments/
           └── Direct Conversations/
               └── Attachments/
   ```
   Ensuring private direct conversations are not exposed in organization-wide browsing, channel attachments respect channel membership and ACL rules, and chat message references and `MediaUsage` links are preserved.

---

## 2. Forensic Audit of Existing Routes & Navigation

| Route | Current Implementation | Workspace | Status / Action |
| :--- | :--- | :--- | :--- |
| `/super/files` | Missing `page.tsx` (only `/super/files/storage` exists) | Super Admin | **Create canonical `page.tsx`** embedding `UnifiedFileManager` with `role="super"`. |
| `/super/media` | `PlatformMediaGallery` in `CMS/src/app/super/media/page.tsx` | Super Admin | **Redirect to `/super/files`** while preserving legacy bookmarks and API compatibility. |
| `/super/files/storage` | Storage Administration Dashboard (Phase F4) | Super Admin | **Retain as Storage Administration** under System Controls. |
| `/tenant/files` | `TenantFilesPage` in `CMS/src/app/(workspace)/tenant/files/page.tsx` | Tenant Admin | **Canonical Tenant File Manager**; enhance with organization tree navigation. |
| `/tenant/files/storage` | Tenant Storage Governance Dashboard (Phase F4) | Tenant Admin | **Retain as Storage Administration** under Settings. |
| `/hr/files` | `HrFilesPage` in `CMS/src/app/(workspace)/hr/files/page.tsx` | HR Admin | **Canonical HR File Manager**. |
| `/hr/media` | `TenantMediaPage` in `CMS/src/app/(workspace)/hr/media/page.tsx` | HR Admin | **Redirect to `/hr/files`**. |
| `/me/files` | `MeFilesPage` in `CMS/src/app/(workspace)/me/files/page.tsx` | Employee | **Canonical Employee File Manager**. |
| `/me/media` | `TenantMediaPage` in `CMS/src/app/(workspace)/me/media/page.tsx` | Employee | **Redirect to `/me/files`**. |
| `/apps/file-manager/list-view` | `FileManagerListPage` | Core Apps | **Redirect to `/hr/files`**. |
| `/apps/file-manager/grid-view` | `FileManagerGridPage` | Core Apps | **Redirect to `/hr/files`**. |
| `/apps/file-manager` | Redirect/missing | Core Apps | **Redirect to `/hr/files`**. |
| `/media` | Redirect to `/hr/media` | Global | **Redirect to `/tenant/files` by default (dynamically routed to `/hr/files` for HR sessions and `/me/files` for employee sessions)**. |

---

## 3. Sidebar Navigation Cleanup Plan

### 3.1 Super Admin Sidebar (`SuperShell.tsx`)
- **Current**:
  - Marketing & CMS: `{ to: '/super/media', label: 'Media Library', iconClass: 'ph-image' }`
  - System Controls: `{ to: '/super/files/storage', label: 'Storage Administration', iconClass: 'ph-hard-drive' }`
- **Updated**:
  - Replace `/super/media` with:
    `{ to: '/super/files', label: 'File Manager', iconClass: 'ph-folder-notch-open', group: 'Marketing & CMS' }`
  - Retain `/super/files/storage` as Storage Administration under System Controls.
  - Zero duplicate media links.

### 3.2 HR Admin Sidebar (`hr-sidebar.ts` & `registry.ts`)
- **Current**:
  - Applications $\rightarrow$ File Manager $\rightarrow$ Submenus: "List View" (`/apps/file-manager/list-view`) and "Grid View" (`/apps/file-manager/grid-view`).
  - Communication & Content $\rightarrow$ "Media Library" (`/hr/media`).
- **Updated**:
  - Applications $\rightarrow$ File Manager: Direct single link to `/hr/files` (no submenus).
  - Remove "Media Library" from Communication & Content.

### 3.3 Employee Sidebar (`employee-sidebar.ts` & `registry.ts`)
- **Current**:
  - Documents & Files $\rightarrow$ "Shared Files & My Files" (`/me/media`).
  - Communication & Content $\rightarrow$ "Media Library" (`/me/media`).
- **Updated**:
  - Documents & Files $\rightarrow$ "File Manager": Direct single link to `/me/files`.
  - Remove duplicate "Media Library" links.

### 3.4 Tenant Admin Sidebar (`registry.ts` & `dreams-sidebar.tsx`)
- **Current**:
  - No direct File Manager link under Workspace.
- **Updated**:
  - Add `{ id: "tenant-files", portal: "tenant", heading: "Workspace", label: "File Manager", path: "/tenant/files", icon: "FolderLock", order: 19 }`.

---

## 4. In-Page View Switcher Architecture (Grid / List / Details)

In `UnifiedFileManager`:
1. Provide a segmented toolbar control with three view modes:
   - **Details View** (`TableIcon`): Full Windows Explorer table with Name, Type, Size, Last Modified, Owner, Actions.
   - **Grid View** (`LayoutGrid`): Card tiles with visual thumbnails, badges for in-use platform files, and quick actions.
   - **List View** (`ListIcon`): Dense row list optimized for rapid file scanning.
2. State Management:
   - State `view: FileManagerView` stored in local component state.
   - Initial state restored from `localStorage.getItem("master_hrms_file_view") || initialView || "details"`.
   - On change, updates both `view` and `localStorage.setItem("master_hrms_file_view", newView)`.
   - No route navigation or page reloads.
   - `currentFolder`, `searchQuery`, `category`, and `selectedIds` are completely preserved across view switches.

---

## 5. Super Admin Platform Media Consolidation

In `CMS/src/app/super/files/page.tsx`:
1. Render `<UnifiedFileManager initialView="grid" role="super" baseRoute="/super/files" />`.
2. Backend Scoping:
   - In `FilesService.listFiles`: When `options.isSuper && !options.tenantId`, strictly enforce `where.tenantId = null`.
   - Platform files (`tenantId = null`) are isolated from tenant files.
   - Branding assets, system templates, and public platform media are displayed.
   - Cards in Grid View display "In Use" tags when `usages.length > 0` and copy URL buttons.
3. Legacy Compatibility:
   - `/super/media` redirects to `/super/files` using Next.js client redirect and server redirect.

---

## 6. Organization File Manager (Tenant Admin)

For Tenant Admin (`role="tenant"` at `/tenant/files`):
1. **Root Organization Files View (`view=org`)**:
   - Access to organization-wide root folders: `Company Documents`, `Departments`, `Communication`, `Policies`, `Team Folders`.
   - Full search across tenant files.
2. **Left Explorer Navigation**:
   - Organization Files
   - My Files (`view=my`)
   - Department Folders
   - Team Folders (`category=Teams`)
   - Shared with Me (`view=shared-with-me`)
   - Starred & Recent
   - Recycle Bin
   - Storage Administration link (`/tenant/files/storage`)

---

## 7. Organization Chat Folder Integration Architecture

### 7.1 Folder Hierarchy in `MediaFile`
We define canonical system folders under each tenant:
```text
Root (tenant-level)
└── Communication (folder)
    └── Organization Chat (folder)
        ├── General (folder)
        │   └── Attachments (folder)
        ├── Departments (folder)
        │   ├── HR (folder)
        │   │   └── Attachments (folder)
        │   ├── Finance (folder)
        │   │   └── Attachments (folder)
        │   └── ...
        ├── Teams (folder)
        │   └── ...
        └── Direct Conversations (folder)
            └── Attachments (folder)
```

### 7.2 Chat Upload Routing (`POST /api/chat/upload`)
When a file is uploaded via `POST /api/chat/upload`:
1. Parse optional `threadId` or `channelId` parameter:
   - If `threadId.startsWith("group_")`:
     - Lookup `ChatGroup` by `groupId`.
     - Determine group type (General, Department group, or Team).
     - Target folder: `Communication/Organization Chat/{GroupName}/Attachments`.
   - If `threadId.startsWith("direct_")`:
     - Target folder: `Communication/Organization Chat/Direct Conversations/Attachments`.
   - Default: `Communication/Organization Chat/General/Attachments`.
2. Folder Auto-Creation & Node Linking:
   - Ensure the folder path hierarchy exists in `MediaFile` (`isFolder: true`).
   - Store the uploaded file as a child of the respective `Attachments` folder (`parentId = attachmentsFolder.id`).
3. Access Control & Privacy:
   - For direct conversations: mark `ownerId = currentUserId`, and create `FileAcl` entries for the chatting participants.
   - For channel/group conversations: create `FileAcl` with `principalType = "TEAM"` or grant permission to group members.
   - In `FilesService.listFiles(view="org")`:
     Filter out Direct Conversations from general organization browsing unless the user is a participant or owner!

### 7.3 Backfill Migration
A non-destructive script `server/src/scripts/backfill_chat_attachments_to_folders.ts` will:
- Discover all existing `ChatMessage` records containing attachments.
- Resolve their `MediaFile` records.
- Ensure the `Communication/Organization Chat/...` folder hierarchy exists in the tenant.
- Link the attachment `MediaFile` records to their respective chat folders without altering original URLs, file paths, or `MediaUsage` records.

---

## 8. Implementation Steps & Verification Plan

1. **Backend Enhancements**:
   - Update `FilesService.listFiles` to strictly isolate platform files when `isSuper && !tenantId` (`where.tenantId = null`).
   - Implement `ChatFolderService` to manage canonical chat folders and upload routing.
   - Update `chatRouter.post("/upload")` to route files to canonical chat folder nodes.
   - Run chat attachment backfill migration.
2. **Frontend Route & Canonical Consolidation**:
   - Create canonical `CMS/src/app/super/files/page.tsx`.
   - Update `/super/media/page.tsx`, `/hr/media/page.tsx`, `/me/media/page.tsx`, `/media/page.tsx`, and `/apps/file-manager/*` with clean redirects.
   - Update `CMS/src/lib/routes.ts` with canonical routes and legacy redirect mappings.
3. **Sidebar Updates**:
   - Update `SuperShell.tsx`: File Manager (`/super/files`).
   - Update `hr-sidebar.ts`: Single File Manager (`/hr/files`).
   - Update `employee-sidebar.ts`: Single File Manager (`/me/files`).
   - Update `registry.ts`: Register canonical File Manager entries, remove duplicate media entries.
   - Update `dreams-sidebar.tsx` to reflect consolidated navigation.
4. **Unified File Manager Enhancements**:
   - Add segmented 1-click in-page view switcher buttons (Grid, List, Details) in the toolbar.
   - Add "Organization Chat" / "Chat Attachments" filter in Quick Access / Categories.
   - Support `role="super"` platform media browsing.
5. **Testing & QA**:
   - Automated regression test suite covering all consolidated endpoints, redirects, chat attachment upload, and ACL isolation.
   - End-to-end browser QA across all 4 roles (Super Admin, Tenant Admin, HR Admin, Employee).

