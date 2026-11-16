# MASTERHRMS — SETTINGS & WORKSPACE GAPS, RISKS & CODE FORENSICS
**Detailed Audit of Architectural Vulnerabilities, Legacy Stubs & Divergences**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. Summary of Identified Gaps

| # | Severity | Category | Description | Source File Reference |
| :-: | :---: | :--- | :--- | :--- |
| **G1** | **HIGH** | Legacy Mock Stub | Standalone `/tenant/integrations` uses hardcoded mock API key and toast-only `handleSave` without database persistence | `src/routes/_authenticated/tenant/integrations.tsx` (lines 103–130) |
| **G2** | **MEDIUM** | UI-Only State | `/tenant/modules` uses local `useState` toggle without persisting to `TenantAddon` or subscription tables | `src/routes/_authenticated/tenant/modules.tsx` (lines 22–41) |
| **G3** | **MEDIUM** | Mocked Action | `/tenant/data` data export button runs a fake `setTimeout` toast without calling a backend bulk export endpoint | `src/routes/_authenticated/tenant/data.tsx` (lines 19–25) |
| **G4** | **LOW** | Missing Page | No dedicated `/me/settings` page exists despite `USER` scopes defined in `SETTINGS_REGISTRY` | `src/routes/_authenticated/me/` |
| **G5** | **LOW** | Multi-Process Sync | In-memory cache invalidation is process-local; multi-container horizontal scale requires Redis Pub/Sub | `server/src/services/settings/runtime-lifecycle.service.ts` (lines 160–171) |

---

## 2. In-Depth Forensic Analysis of Findings

### G1: Standalone `/tenant/integrations` vs Unified `SharedSettingsShell`
- **Location**: `src/routes/_authenticated/tenant/integrations.tsx` and `CMS/src/app/(workspace)/tenant/integrations/page.tsx`.
- **Finding**:
  ```tsx
  // integrations.tsx, lines 103-126
  const [apiKey] = useState("hrms_live_sec_99a8b7c6d5e4f3a2b1c0");

  const handleSave = () => {
    toast.success("SMTP configuration updated successfully");
  };
  ```
  This file is an early frontend prototype stub. It presents an SMTP configuration form, but saving only fires a Sonner toast. Furthermore, it displays a static hardcoded API key string.
- **Authoritative Counterpart**: The real, fully functional SMTP engine is in `/tenant/settings?tab=communication` via `<SharedSettingsShell scope="TENANT" />`, which encrypts passwords with AES-256-GCM in PostgreSQL and hot-reloads `MailerFactory`.
- **Remediation**: Redirect `/tenant/integrations` to `/tenant/settings?tab=communication` or `/tenant/settings?tab=integrations` to avoid user confusion.

---

### G2: `/tenant/modules` Local State Divergence
- **Location**: `src/routes/_authenticated/tenant/modules.tsx` and `CMS/src/app/(workspace)/tenant/modules/page.tsx`.
- **Finding**:
  ```tsx
  // modules.tsx, lines 32-41
  const toggleModule = (key: string) => {
    if (key === "hrm") {
      toast.info("Core HRM module is required and cannot be disabled.");
      return;
    }
    setEnabledKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    toast.success(`Module state updated.`);
  };
  ```
  Switching a module toggle modifies local React state (`enabledKeys`) and displays a success toast, but does not execute `api.post('/api/tenant/modules/toggle')` or write to `TenantAddon`.
- **Remediation**: Wire `toggleModule` to an Express route updating `TenantAddon` in Prisma, or disable editing if module entitlements are managed exclusively by Super Admin via billing subscription plans.

---

### G3: `/tenant/data` Mock Export Action
- **Location**: `src/routes/_authenticated/tenant/data.tsx` and `CMS/src/app/(workspace)/tenant/data/page.tsx`.
- **Finding**:
  ```tsx
  // data.tsx, lines 19-25
  const handleExport = (type: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      toast.success(`${type} export package generated and downloaded.`);
    }, 1200);
  };
  ```
  Clicking "Export All Data (.ZIP)" displays a 1.2-second loading spinner and triggers a toast, but does not download an actual archive.
- **Remediation**: Wire to backend bulk export streaming endpoint (`GET /api/v1/workspace/export`).

---

### G4: Employee Settings UX Architecture
- **Location**: `src/routes/_authenticated/me/`
- **Finding**: While `SETTINGS_REGISTRY` in `server/src/services/settings/settings-registry.ts` includes `USER` scope support for `locale.timezone`, `locale.date_format`, and `locale.time_format`, the frontend has no `/me/settings` page.
- **Current Behavior**: Personal details are managed cleanly through `/me/profile` and `/me/account`.
- **Remediation**: Either create a clean `/me/settings` personal preferences tab or keep personal preferences consolidated in `/me/account`.

---

### G5: Horizontal Scaling / Clustered Cache Invalidation
- **Location**: `server/src/services/settings/runtime-lifecycle.service.ts`
- **Finding**:
  ```typescript
  // runtime-lifecycle.service.ts, lines 165-170
  static getProcessSyncInfo() {
    return {
      mode: "single-process-in-memory",
      clusterSynchronized: false,
      description: "Settings cache invalidation operates within local Node.js memory. In multi-container deployments, a Redis Pub/Sub message bus is required..."
    };
  }
  ```
  In single-server setups (or local dev), `cacheStore` (60s TTL) works with microsecond latency. If deployed across multiple load-balanced containers without sticky sessions, setting updates in Container A would take up to 60 seconds to reflect in Container B unless Redis Pub/Sub is configured.

---

## 3. High-Confidence Architectural Strengths Verified
1. **Zero Secret Leaks**: All 8 secrets are encrypted via AES-256-GCM. The API strictly masks secrets as `{ isSecret: true, set: true }` on client reads.
2. **Strict Host & Session Isolation**: `workspaceHostMiddleware` prevents `{tenant}.masterhrms.com/super` from ever accessing Super Admin (returns HTTP 404). `resolveTenantContext` rejects cross-workspace JWT session mismatches with HTTP 403 `HOST_TENANT_MISMATCH`.
3. **Audited Persistence**: Every change through `SettingsService.setGroup` automatically generates an audit record in `prisma.settingAudit` with actor ID, IP address, user agent, and timestamp.
4. **Hot Re-instantiation**: SMTP, S3, and SMS factories dynamically invalidate and re-instantiate cached connection pools upon save without requiring server restarts.
