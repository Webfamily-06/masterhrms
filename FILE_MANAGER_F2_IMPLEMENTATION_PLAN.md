# MASTERHRMS — FILE MANAGER PHASE F2 IMPLEMENTATION PLAN
## UI Core: Windows 11 File Explorer Experience

**Document ID:** `FILE_MANAGER_F2_IMPLEMENTATION_PLAN.md`  
**Phase:** F2 — UI Core Implementation Plan  
**Target:** MasterHRMS File Manager (`CMS/src/` and `src/`)  
**Baseline:** F1 independently verified (14/14 PASS)  
**Date:** 2026-10-30  

---

## 1. PRE-IMPLEMENTATION AUDIT SUMMARY

### 1.1 Existing Architecture & Assets
- **F1 Backend Foundation:** Express `/api/v1/files/*` and `/api/v1/media/*` endpoints fully functional and independently verified. Quotas, invariants, storage providers, ACLs, and realtime Outbox notifications are active.
- **Canonical UI Component:** `UnifiedFileManager` (`CMS/src/components/apps/file-manager/unified-file-manager.tsx` and `src/components/apps/file-manager/unified-file-manager.tsx`). Currently renders list and grid views with basic action dialogs.
- **Role Routes Active:**
  - `/me/files` (Employee personal files)
  - `/hr/files` (HR workspace files)
  - `/tenant/files` (Tenant Administrator organization files)
  - `/apps/file-manager/list-view` & `/apps/file-manager/grid-view` (Legacy portal routes)
- **Shared Utilities & UI Primitives:**
  - Shadcn/UI primitives: `Button`, `Input`, `Dialog`, `DropdownMenu`, `Select`, `Badge`, `Progress`, `Tooltip`.
  - Iconography: `lucide-react` (matching Windows 11 command and file glyphs).
  - Toast Notifications: `sonner`.
  - Network & Query Client: `@tanstack/react-query`, `@/lib/api`.

### 1.2 Identified UI/UX Gaps in Current Implementation
1. **Ribbon / Command Bar:** Current top bar is an ad-hoc toolbar rather than a structured Windows 11 Explorer Ribbon with contextual states (`New Folder`, `Upload`, `Rename`, `Move to`, `Delete / Recycle Bin`, `Restore`, `Sort`, `View Switcher`, `Details Pane Toggle`).
2. **Multi-Selection & Batch Actions:** Currently only single-item click selection exists. Missing Ctrl+click, Shift+click, "Select All", and batch operations (batch delete, batch restore).
3. **Right-Click Context Menu:** Context menu is currently hidden behind a 3-dots button. Missing genuine right-click (`onContextMenu`) at cursor coordinates.
4. **Three Distinct Explorer Views:**
   - **Details View:** Tabular layout with column sorting (Name, Date Modified, Type, Size, Status).
   - **Grid / Icon View:** Large preview tiles with thumbnail badges and clear selection halos.
   - **List View:** Compact multi-column or single-column dense list rows for fast scanning.
5. **Keyboard Shortcuts:** Missing Windows 11 conventions (`Ctrl+A`, `Delete`, `F2` for rename, `Enter` to open, `Escape` to deselect, arrow navigation).
6. **Address / Breadcrumb Bar:** Needs Windows 11 style pill navigation with root and deep hierarchy traversal.
7. **Details / Preview Pane:** Needs toggleable collapsible right pane with signed image/document preview and sanitized metadata.

---

## 2. COMPONENTS TO REUSE, MODIFY, OR CREATE

### 2.1 Existing Components to Reuse
- `@/components/ui/*`: `button`, `input`, `dialog`, `dropdown-menu`, `select`, `badge`, `progress`, `tooltip`.
- `@/lib/api`: Authenticated Axios/fetch wrapper with automatic token management.
- `@/lib/socket`: Socket.IO client for live mutation synchronization (`file:created`, `file:updated`, `file:trashed`, `file:restored`, `file:deleted`).
- `@/lib/session`: Current user, tenant, and role resolution (`useSession`, `useCurrentProfile`).

### 2.2 Components to Refactor and Modernize
- **`UnifiedFileManager` (`CMS/src/components/apps/file-manager/unified-file-manager.tsx`):**
  - Refactor into a modular Windows 11 File Explorer composed of:
    - `ExplorerRibbon`: Command bar with disabled/enabled states based on selection.
    - `ExplorerAddressBar`: Breadcrumbs with folder icons, search, and refresh.
    - `ExplorerSidebar`: Quick access (`Home`, `My Files`, `Recent`, `Starred`, `Recycle Bin`) + storage quota widget.
    - `ExplorerDetailsView`: Full table with sortable column headers.
    - `ExplorerGridView`: Card grid with preview thumbnails and selection borders.
    - `ExplorerListView`: Compact dense rows.
    - `ExplorerContextMenu`: Native-feeling right-click menu at cursor coordinates.
    - `ExplorerPreviewPane`: Collapsible details inspector with signed preview rendering.

---

## 3. ROUTE AND PORTAL INTEGRATION

All portals render the unified component parameterized by `role` and `baseRoute`:

| Route | Role Parameter | Accessible Views | Default Root Filter |
|---|---|---|---|
| `/me/files` | `me` | My Files, Recent, Starred, Trash | User's personal files (`ownerId = userId`) |
| `/hr/files` | `hr` | Workspace, Categories, Starred, Trash | HR tenant workspace |
| `/tenant/files` | `tenant` | All Files, Org View, Storage, Trash | Tenant administrator org-wide view (`view=org`) |
| `/apps/file-manager/list-view` | `admin` | Full explorer (Default: List) | Tenant workspace |
| `/apps/file-manager/grid-view` | `admin` | Full explorer (Default: Grid) | Tenant workspace |

All route wrappers remain 100% synchronized across `CMS/src/` and `src/`.

---

## 4. API CONTRACT & INTEGRATION

F2 will strictly consume existing verified F1 endpoints:

- `GET /api/v1/files`: Query nodes (`parentId`, `category`, `starred`, `trashed`, `view`, `search`, `sortBy`, `sortOrder`, `page`, `limit`).
- `GET /api/v1/files/stats`: Storage capacity, quota used, percentage, category breakdown.
- `POST /api/v1/files/folders`: Create folder with Windows 11 filename validation.
- `PATCH /api/v1/files/nodes/:id`: Rename file or folder.
- `PATCH /api/v1/files/:id/move`: Relocate file or folder with cycle prevention.
- `POST /api/v1/files/:id/star`: Toggle user star state.
- `POST /api/v1/files/trash`: Batch move items to Recycle Bin (`ids: string[]`).
- `POST /api/v1/files/restore`: Batch restore items from Recycle Bin (`ids: string[]`).
- `GET /api/v1/files/nodes/:id/download`: Fetch authorized signed download URL.
- `GET /api/v1/files/nodes/:id/preview`: Fetch authorized signed inline preview URL.
- `POST /api/v1/files/upload`: Multipart upload fallback with quota verification.
- Direct uploads via `/api/v1/files/uploads` when supported.

---

## 5. KEYBOARD AND ACCESSIBILITY SPECIFICATION

- **Keyboard Shortcuts:**
  - `Ctrl + A` / `Cmd + A`: Select all visible items in the current view.
  - `Delete`: Move selected item(s) to Recycle Bin (with confirmation modal for destructive action).
  - `F2`: Initiate rename for currently focused/selected item.
  - `Enter`: Navigate into selected folder, or open preview for selected file.
  - `Escape`: Clear active selection, close context menu, or close preview pane.
  - `ArrowUp` / `ArrowDown`: Step selection through list and details view.
- **Accessibility (a11y):**
  - ARIA table semantics (`role="grid"`, `aria-selected`, `aria-sort`).
  - High-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).
  - Screen reader announcements for upload progress, item count, and deletion confirmations.

---

## 6. TEST & VERIFICATION STRATEGY

1. **Automated Unit & Integration Verification:**
   - Execute `server/src/tests/file-manager-f1.verify.ts` (19/19 checks must remain green).
   - Execute `scripts/verify_file_manager_f1_e2e.cjs` (22/22 checks must remain green).
   - Run Server & CMS TypeScript compilation (`npx tsc --noEmit`).
2. **Browser QA with Playwright:**
   - Dual-session verification:
     - Session 1: HR Administrator (`/hr/files`).
     - Session 2: Employee (`/me/files`).
   - Test all 18 specified QA items:
     - Ribbon commands & state disabling.
     - Sidebar navigation (`Home`, `My Files`, `Recent`, `Starred`, `Recycle Bin`).
     - Breadcrumb clicking and navigation.
     - View switching: Details, Grid, List.
     - Multi-selection (Ctrl+click, Shift+click, Ctrl+A).
     - Right-click context menu positioning and actions.
     - Folder creation, rename, move, star/unstar.
     - Trash and restore.
     - Preview and collapsible details pane.
     - Keyboard shortcuts.
     - Responsive mobile/desktop behavior.
     - Dark mode and light mode visual quality.
     - Cross-tenant security isolation.
     - Zero browser console errors.
3. **Report Generation:**
   - Compile `FILE_MANAGER_F2_IMPLEMENTATION_REPORT.md` and present completion summary.

