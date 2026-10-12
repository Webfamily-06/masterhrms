# MASTERHRMS — GOOGLE WORKSPACE & TALLY PRIME SYNC ENTITLEMENT FIX REPORT

**Document ID:** `DOC-SAAS-FIX-GWT-001`  
**Date:** 2026-10-12  
**Author:** Antigravity Agentic Pair Programmer  
**Status:** COMPLETED & EMPIRICALLY VERIFIED  
**Governing Standard:** `ADDON_PLATFORM_COMPLETION_AND_PERMANENT_IMPLEMENTATION_STANDARD`  

---

## 1. Executive Summary

In the MASTERHRMS tenant panel, tenants with configured or assigned add-ons for **Google Workspace** (`/google-workspace`) and **Tally Prime Sync** (`/tally-importer`) were encountering an unconditional upgrade gate:
- `Plan Restriction · GROWTH TIER`
- `Unlock Google Workspace SSO & Drive Module` / `Unlock Tally Prime Ledger Importer Module`
- `Upgrade your workspace plan`
- `Explore Addons Marketplace`

The functional integration dashboards were unreachable even though the add-ons were legitimately installed in `TenantAddon` and enabled in `TenantModule`.

Following the mandatory **TRACE → ROOT-CAUSE → FIX → VERIFY → REPORT** workflow:
1. **Reproduced Locally:** Replicated the exact upgrade lock screen in the real browser on `localhost:5173` using Playwright MCP before touching code.
2. **Root Cause Isolated:** Identified that `<PlanGuard>` in `src/components/plan-guard.tsx` evaluated only static plan hierarchy (`currentLevel < requiredLevel`), defaulting `currentPlan` to `"starter"` and possessing zero awareness of tenant add-on entitlements (`isEntitled`), Super Admin bypass, or dynamic workspace subscriptions.
3. **Architectural Remediation:** Wired `addonKey` and `useNavigationResolver` directly into `PlanGuard`, added dynamic subscription query resolution, added Super Admin bypass, and linked route-level entitlement maps to the guard. Fixed React anti-pattern in `google-workspace.tsx` where state setters ran inside TanStack Query `queryFn`.
4. **Empirical Browser Verification:** Verified that entitled tenants load the live Google Workspace OAuth/SSO/Drive dashboard and Tally Prime 4-step Ledger Importer, verify persistent credential saves, and confirmed that ineligible tenants remain strictly restricted with `HTTP 403 · License Entitlement (Product Not Subscribed)`.
5. **Automated Regression Suite:** Authored a dedicated 10-test suite (`src/tests/google-workspace-tally-entitlement.test.ts`) covering route mapping, alias resolution, backend 403 `ADDON_REQUIRED` enforcement, and multi-tenant isolation. Verified all 102 predecessor W1 tests, clean server `tsc --noEmit`, and clean production `npm run build`.

---

## 2. Catalog, Manifest, and Feature Identifiers Discovered

| Integration | Catalog ID | Manifest Key / Add-on Slug | Engine | Route | Backend Enforcing Endpoints | Normalized Aliases |
|---|---|---|---|---|---|---|
| **Google Workspace** | `AD-065` | `google-workspace-integration` | E12 Developer & Collaboration | `/google-workspace` | `GET /api/workspace/google/config`<br>`POST /api/workspace/google/config` | `google-workspace`, `google-workspace-integration`, `google_workspace` |
| **Tally Prime Sync** | `AD-011` | `tally-importer` | E2 Accounting & Ledgers | `/tally-importer` | `POST /api/accounting/tally/preview`<br>`POST /api/accounting/tally/import`<br>`POST /api/workspace/tally-import` | `tally`, `tally-importer`, `tally_importer`, `tally-prime` |
| **AI Invoice OCR** | `AD-042` | `ai-ocr` | E11 Intelligent Automation | `/ai-ocr` | `POST /api/workspace/ocr/parse` | `ai-ocr`, `ocr`, `ai-invoice-ocr` |

---

## 3. Root Cause Analysis

### 3.1 PlanGuard Static Tier Blindness (`src/components/plan-guard.tsx`)
`PlanGuard` evaluated:
```ts
const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 1;
const isLocked = currentLevel < requiredLevel;
```
If a tenant was on the Starter or Free tier (`currentLevel = 0`) but purchased or installed an add-on (such as Google Workspace or Tally Importer) from the Marketplace, `PlanGuard` unconditionally locked them out because `0 < 1`. It lacked:
- Any check for `isEntitled(addonKey)` from `useNavigationResolver`.
- Any check for Super Admin authority (`isSuperAdminUser(profile)`).
- Any dynamic resolution of the tenant's real subscription plan from `/workspace/subscription` when `currentPlan` prop was omitted.

### 3.2 Omission of `addonKey` in Integration Routes
Both `src/routes/_authenticated/_app/google-workspace.tsx` and `src/routes/_authenticated/_app/tally-importer.tsx` invoked `<PlanGuard requiredPlan="growth">` without specifying which add-on was guarding the page. Even if the tenant had an active `TenantAddon` record, `PlanGuard` could not evaluate whether the user owned the add-on entitlement.

### 3.3 React Anti-Pattern in `google-workspace.tsx`
`google-workspace.tsx` called component state setters (`setClientId`, `setSsoEnabled`, `setDriveEnabled`) inside TanStack Query's `queryFn`. This caused cascading render cycles, stale form state, and UI locking during entitlement updates.

---

## 4. Code Modifications

### 4.1 Enhanced `src/components/plan-guard.tsx`
- **Added `addonKey?: string`** to `PlanGuardProps`.
- **Integrated `useCurrentProfile()` and `useNavigationResolver()`**:
  Evaluates `isEntitled(effectiveAddonKey)` where `effectiveAddonKey` defaults to `addonKey || ROUTE_ENTITLEMENT_MAP[currentPath]`.
- **Added Super Admin Automatic Bypass**: Super Admins bypass plan gating unless explicit numerical quota limits (`limitReached`) are exceeded.
- **Added Authoritative Add-on Entitlement Bypass**:
  ```ts
  const hasAddonEntitlement = !!effectiveAddonKey && isEntitled(effectiveAddonKey);
  const isLocked = !hasAddonEntitlement && currentLevel < requiredLevel;
  ```
  If an add-on is active on the workspace, the plan restriction screen is bypassed immediately.
- **Dynamic Subscription Query Fallback**: If `explicitCurrentPlan` is omitted, `PlanGuard` dynamically fetches the real subscription plan from `/workspace/subscription`.

### 4.2 Updated `src/routes/_authenticated/_app/google-workspace.tsx`
- Added `addonKey="google-workspace-integration"` to `<PlanGuard>`.
- Replaced the unsafe `queryFn` side-effects with a clean `useEffect` synchronizer:
  ```tsx
  useEffect(() => {
    if (configData?.config) {
      setClientId(configData.config.clientId || "");
      setSsoEnabled(configData.config.ssoEnabled ?? false);
      setDriveEnabled(configData.config.driveEnabled ?? false);
    }
  }, [configData]);
  ```

### 4.3 Updated `src/routes/_authenticated/_app/tally-importer.tsx`
- Added `addonKey="tally-importer"` to `<PlanGuard requiredPlan="growth" addonKey="tally-importer">`.

### 4.4 Updated `src/routes/_authenticated/_app/ai-ocr.tsx`
- Added `addonKey="ai-ocr"` to `<PlanGuard requiredPlan="growth" addonKey="ai-ocr">`.

---

## 5. Empirical Browser Verification

Testing was conducted on `http://localhost:5173` using real Playwright browser automation with DOM and viewport inspection.

### 5.1 Verification Matrix

| Step | Test Condition | Expected Result | Actual Result | Status | Screenshot Artifact |
|---|---|---|---|---|---|
| **1** | Initial unpatched state | Upgrade lock screen displayed | Lock screen reproduced on `/google-workspace` & `/tally-importer` | **REPRODUCED** | `.playwright-mcp/page-2026-10-12T10-01-09-690Z.png`<br>`.playwright-mcp/page-2026-10-12T10-01-23-472Z.png` |
| **2** | Entitled Tenant on `/google-workspace` | Dashboard loads with OAuth & Accounts tabs | Dashboard rendered with OAuth Client ID, Secret, SSO/Drive toggles | **PASS** | `.playwright-mcp/page-2026-10-12T10-11-50-460Z.png`<br>`.playwright-mcp/page-2026-10-12T10-12-58-292Z.png` |
| **3** | Save Google Workspace configuration | Config persists to CMS page backing store | Saved Client ID `789...apps.googleusercontent.com`, SSO enabled | **PASS** | `.playwright-mcp/page-2026-10-12T10-08-49-723Z.png` |
| **4** | Entitled Tenant on `/tally-importer` | 4-step Ledger Importer wizard loads | Step 1 Upload File, Map Fields, Preview Data, Complete tabs visible | **PASS** | `.playwright-mcp/page-2026-10-12T10-13-21-091Z.png` |
| **5** | Ineligible Tenant on `/google-workspace` | License Entitlement restriction gate shown | Displays `HTTP 403 · License Entitlement (Product Not Subscribed)` with Return/Subscription CTAs | **PASS** | `.playwright-mcp/page-2026-10-12T10-14-06-674Z.png` |
| **6** | Ineligible Tenant on `/tally-importer` | License Entitlement restriction gate shown | Displays `HTTP 403 · License Entitlement (Product Not Subscribed)` with Return/Subscription CTAs | **PASS** | `.playwright-mcp/page-2026-10-12T10-14-24-688Z.png` |
| **7** | Page refresh & re-authentication | State persists across reload | Configuration and unlocked status preserved identically | **PASS** | Verified via browser reloads |
| **8** | Tenant isolation | Tenant Beta cannot access Tenant Alpha's settings | Tenant Beta receives 403 gate and cannot access Tenant Alpha's credentials | **PASS** | Verified in automated tests & browser |

---

## 6. Automated Regression Suites & Quality Gates

### 6.1 Focused Suite: `google-workspace-tally-entitlement.test.ts`
Command: `npx vitest run src/tests/google-workspace-tally-entitlement.test.ts`
- **Result:** 10/10 tests PASS (10.49s). Exit code: `0`.
- **Coverage:**
  1. Authoritative Route Entitlement Mapping: `/google-workspace` → `google-workspace-integration`.
  2. Authoritative Route Entitlement Mapping: `/tally-importer` → `tally-importer`.
  3. Client navigation resolver alias normalization.
  4. Entitled Tenant Alpha Google Workspace config retrieval (`200 OK`).
  5. Entitled Tenant Alpha Google Workspace config save (`200 OK`).
  6. Unentitled Tenant Beta Google Workspace rejection (`403 ADDON_REQUIRED`).
  7. Entitled Tenant Alpha Tally XML preview processing (`200 OK`).
  8. Unentitled Tenant Beta Tally XML rejection (`403 ADDON_REQUIRED`).
  9. Multi-tenant isolation between Tenant Alpha and Tenant Beta.
  10. Masked secret handling and unconfigured state verification.

### 6.2 Predecessor W1 Suite
Command: `npx vitest run src/tests/w1-`
- **Result:** 102/102 tests PASS across 12 files (27.55s). Exit code: `0`.

### 6.3 Backend TypeScript Verification
Command: `npx tsc --noEmit` (in `server/`)
- **Result:** 0 errors. Exit code: `0`.

### 6.4 Frontend Production Build
Command: `npm run build` (in root)
- **Result:** 0 errors. Exit code: `0` (built in 15.58s).

---

## 7. Operational Boundaries & External Dependencies

1. **Localhost Boundary Maintained:** All testing performed on `http://localhost:5173` and `http://localhost:4000`. No live cloud deployment attempted.
2. **Mock/Sandbox External Providers:**
   - Real Google OAuth authentication is not performed locally without live Google Cloud project credentials. When credentials are unconfigured or mocked, the UI shows a clean setup state without failing into plan restriction.
   - Tally Prime file ingestion parses local XML/CSV files directly via `POST /api/accounting/tally/preview` and `POST /api/workspace/tally-import` without live network calls to an on-premises Tally server.
3. **No Wave 2 Work Initiated:** Scope remained strictly within fixing the entitlement bug on existing modules.

---

## 8. Sign-off

| Criterion | Status | Notes |
|---|---|---|
| Root cause traced and documented | **PASS** | PlanGuard static tier comparison repaired with entitlement awareness. |
| Both integrations unlocked for entitled tenants | **PASS** | Empirically verified in real browser with screenshots. |
| Genuinely ineligible tenants restricted | **PASS** | Empirically verified; returns `Product Not Subscribed` / `403`. |
| Automated regression tests | **PASS** | 10/10 focused tests + 102/102 W1 tests pass. |
| Type check & production build | **PASS** | Both server `tsc` and frontend `vite build` clean. |
| Worklog updated | **PASS** | Appended to `docs/Saas/worklog.md`. |
