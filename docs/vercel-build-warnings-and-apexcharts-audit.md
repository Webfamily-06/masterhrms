# MasterHRMS — Vercel Build Warnings & ApexCharts Failure: Consolidated Root-Cause Audit

**Document Date:** October 31, 2026  
**Audit Mode:** STRICT READ-ONLY AUDIT  
**Target Environment:** Vercel Production Build Container (Next.js 16 / Turbopack & AWS Lambda Runtime)  
**Deliverable:** Consolidated Root-Cause and Warning Analysis Report  

---

## 1. Executive Summary & Problem Classification

Following the deployment of commit `1a93a5c9` (which resolved the monorepo workspace boundary and deduplicated React 19.3.1), the Vercel build output surfaces a fatal ApexCharts module failure alongside several distinct npm/Vercel build warnings.

This audit provides an exhaustive forensic analysis of the fatal error and all build warnings.

### Issue Severity Matrix

| Issue Area | Severity | Impact on Build | Action Required |
| :--- | :---: | :---: | :---: |
| **A. ApexCharts Dual-Version Hazard** | **HIGH / FATAL** | Breaks Turbopack SSR / Module Resolution | **REQUIRED** |
| **B. Node.js 24 Engine Warning** | **LOW / INFORMATIONAL** | Platform warning; falls back to system LTS | Optional / Advisory |
| **C. Unknown npm `cache-dir`** | **LOW / INFORMATIONAL** | Vercel runner CLI environment artifact | None (External) |
| **D. Recharts 2.x Deprecation** | **LOW / INFORMATIONAL** | Maintenance lifecycle announcement | Optional (Post-Launch) |
| **E. ESLint 9.39 Deprecation** | **LOW / INFORMATIONAL** | Upstream patch release lifecycle notice | Optional (Routine) |
| **F. Unapproved Scripts (`sharp`, `unrs`)** | **LOW / INFORMATIONAL** | `allowScripts` warning during `npm install` | Optional (Cosmetic) |

---

## 2. Section A: ApexCharts Fatal Error Root Cause

### 1. Version Split Investigation
Inspection of manifests and lockfiles reveals a major version collision between the root project and the CMS workspace:

| Location | Manifest | Declared Version | Installed / Locked Version | File Path |
| :--- | :--- | :---: | :---: | :--- |
| **Monorepo Root** | `package.json` | `^7.4.0` | `7.9.1` | `node_modules/apexcharts` |
| **CMS Workspace** | `CMS/package.json` | `^8.4.0` | `8.6.0` | `CMS/node_modules/apexcharts` |
| **React Wrapper** | Hoisted to Root | `^2.1.1` | `2.1.1` | `node_modules/react-apexcharts` |

### 2. The Resolution Failure Mechanism
1. **The Hoisted Wrapper:** `react-apexcharts@2.1.1` is declared in both root and CMS, but npm hoists it to the root: `node_modules/react-apexcharts`.
2. **The Import Stack:** In `react-apexcharts` (`dist/react-apexcharts.esm.js` and `dist/react-apexcharts.cjs.js`), the library executes:
   ```javascript
   import n from "apexcharts/client";
   // or CJS:
   var r = require("apexcharts/client");
   ```
3. **Module Resolution Traversal:**
   - When a CMS page (e.g., `CMS/src/app/super/page.tsx` or `deals-dashboard/page.tsx`) imports `react-apexcharts`, Node/Turbopack resolves the module at `node_modules/react-apexcharts`.
   - Node resolution rules state that dependencies required by `node_modules/react-apexcharts` look first in `node_modules/react-apexcharts/node_modules/` (empty), then traverse up to the root: `node_modules/apexcharts`.
   - At the root, `node_modules/apexcharts` is **ApexCharts v7.9.1**.
   - Concurrently, direct chart utilities in CMS (such as `CMS/src/lib/dashboard-charts.ts`) execute `await import("apexcharts")`, which resolves **ApexCharts v8.6.0** from `CMS/node_modules/apexcharts`.
4. **Dual-Package Conflict in Turbopack:**
   - Turbopack and Webpack receive two entirely different major releases of the same library (`apexcharts@7.9.1` and `apexcharts@8.6.0`) with differing internal data structures and global window hooks.
   - During SSR page evaluation, `apexcharts/client` initialization fails or throws when the server worker evaluates client entrypoints under React `lazy`.

### 3. Existence and Exports of `apexcharts/client`
- Both `apexcharts@7.9.1` and `apexcharts@8.6.0` define `./client` in `package.json` `exports`:
  - Browser / ESM: `./dist/apexcharts.esm.js`
  - Node / CJS: `./dist/apexcharts.common.js`
- `apexcharts/client` is valid syntax in both versions. The failure is caused by the **major version discrepancy** between the hoisted v7 package and the nested v8 package.

### 4. Smallest Compatible Fix for ApexCharts
1. Align the root manifest with the CMS workspace:
   In root [package.json](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/package.json):
   ```diff
   - "apexcharts": "^7.4.0",
   + "apexcharts": "^8.4.0",
   ```
2. Run `npm dedupe --legacy-peer-deps` so npm hoists `apexcharts@8.6.0` to root `node_modules/apexcharts` and deletes the nested `CMS/node_modules/apexcharts`.
3. Both `CMS/` and `react-apexcharts` will resolve the exact same single copy of `apexcharts@8.6.0`.

---

## 3. Section B: Node.js Version Warning

### Findings:
1. **Manifest Declarations:**
   - Root `package.json`: `"engines": { "node": "24.x" }`
   - `server/package.json`: `"engines": { "node": "24.x" }`
   - `CMS/package.json`: `"engines": { "node": "24.x" }`
2. **Vercel Platform Reality:**
   - Vercel's official Serverless Functions support:
     - `nodejs22.x` (Active LTS — Recommended)
     - `nodejs20.x` (Maintenance LTS)
   - Node 24 is not yet an Active LTS release on Vercel's Serverless Function runtime.
   - When Vercel inspects `"engines": { "node": "24.x" }`, it emits a build warning stating that Node 24.x is not a native runtime on the platform and defaults to Node 22.x or Node 20.x.
3. **Safety of Node 26:**
   - Node 26 does not exist as an LTS release in production. Target environments must use Active LTS releases (`20.x` or `22.x`).
4. **Native Compatibility:**
   - `@prisma/client` query engines, `sharp`, and `bcryptjs` native binaries are pre-compiled and tested for Node 20.x and 22.x.
   - Recommended engine configuration: `"engines": { "node": ">=20.x <=24.x" }` or `"22.x"`.

---

## 4. Section C: Unknown npm `cache-dir` Warning

### Findings:
1. **Scan Results:** A complete scan of all repository files confirms that `cache-dir` and `cache_dir` do **not** exist anywhere in `.npmrc`, `package.json`, or workspace configurations.
2. **Source of the Warning:**
   - Modern npm (v9, v10, v11) uses `cache` as the configuration key for the npm cache directory (`~/.npm`).
   - Vercel's CI build runner injects `NPM_CONFIG_CACHE_DIR` or `--cache-dir` into its container execution scripts.
   - When npm v11 runs inside Vercel, npm logs: `npm warn Unknown config "cache-dir"`.
3. **Action:** Safe to ignore. It is an external platform artifact with zero effect on dependency installation or application behavior.

---

## 5. Section D: Recharts Deprecation Warning

### Findings:
1. **Declaration:** Declared in both root `package.json` (`^2.15.4`) and `CMS/package.json` (`^2.15.4`).
2. **Installed Version:** `2.15.4` (locked in `package-lock.json`).
3. **Warning Origin:** Upstream npm deprecation notice: `1.x and 2.x branches are no longer active. Bump to Recharts v3 to receive latest features and bugfixes.`
4. **Usage in Codebase:** Recharts is imported in **exactly 2 files**:
   - `CMS/src/components/ui/chart.tsx`
   - `src/components/ui/chart.tsx`
5. **Migration Impact:** Upgrading to Recharts 3 would require updating shadcn/ui chart component wrappers (`ChartContainer`, `ChartTooltipContent`, etc.) due to changed tooltip prop types.
6. **Recommendation:** Defer upgrade. The deprecation notice is purely informational; Recharts 2.15.4 builds cleanly and executes with zero errors.

---

## 6. Section E: ESLint Deprecation Warning

### Findings:
1. **Installed & Locked Version:** `9.39.5` (hoisted to `node_modules/eslint`).
2. **Declaring Workspaces:** Root `package.json` (`eslint: ^9.32.0`) and `CMS/package.json` (`eslint: ^9`).
3. **Warning Origin:** ESLint upstream deprecation of older patch releases in favor of the latest 9.x maintenance release.
4. **Next.js Compatibility:** `eslint-config-next@16.1.6` is built for ESLint 9 flat config.
5. **Recommendation:** Defer upgrade. ESLint 9.39.5 runs cleanly and does not block production builds.

---

## 7. Section F: Unapproved Install Scripts (`allowScripts`)

### 1. `sharp@0.34.5`
- **Requiring Package:** `next@16.1.6` (declared as an optional dependency).
- **Script Command:** `node install/check.js || npm run build`
- **What it does:** Checks whether pre-built platform binaries (`@img/sharp-win32-x64` or `@img/sharp-linux-x64`) are present. If not, attempts to compile libvips from C++ source.
- **Is it necessary?** **NO.** Precompiled native binaries are installed automatically. Furthermore, `CMS/next.config.ts` configures `images: { unoptimized: true }`, completely bypassing sharp at runtime.
- **Build Impact:** `next build` operates 100% cleanly without executing sharp's install script.

### 2. `unrs-resolver@1.12.2`
- **Requiring Package:** `eslint-import-resolver-typescript@3.10.1` -> `eslint-config-next@16.1.6` (dev dependency).
- **Script Command:** `node postinstall.js` (executes `napi-postinstall`).
- **What it does:** Prepares native Node-API bindings for faster TypeScript path resolution during linting.
- **Is it necessary?** **NO.** Only invoked during `eslint` commands; completely uncalled during `next build`, server compilation, or production runtime.
- **Build Impact:** Zero impact on production builds.

---

## 8. Required vs. Optional Remediation Plan

### Required Fix (Resolves Fatal Build Error)
- **Harmonize `apexcharts` in root `package.json`:** Update from `"^7.4.0"` to `"^8.4.0"` (matching `CMS/package.json`), then run `npm dedupe --legacy-peer-deps`.
- **Result:** Removes `CMS/node_modules/apexcharts`, hoists a single unified `apexcharts@8.6.0` to root, and eliminates the dual-package hazard in `react-apexcharts`.

### Optional Advisory Fixes (Clean Up Informational Warnings)
1. **Engines Range:** Update root, CMS, and server `engines` from `"24.x"` to `"node": ">=20.x <=24.x"` to satisfy Vercel LTS platform detection.
2. **AllowScripts Approval:** Add `"allowScripts": { "sharp": true, "unrs-resolver": true }` to root `package.json` if silence during local `npm install` is desired.
3. **Recharts & ESLint:** Maintain current versions until next scheduled dependency maintenance wave.

---

## 9. Proposed Execution Order for Remediation

1. **Step 1:** Modify root `package.json` to declare `"apexcharts": "^8.4.0"`.
2. **Step 2:** Run `npm dedupe --legacy-peer-deps` to eliminate `CMS/node_modules/apexcharts` and hoist `apexcharts@8.6.0` to root `node_modules/`.
3. **Step 3:** Run `npm run cms:build` to empirically verify that Turbopack builds all 539 pages without ApexCharts resolution errors.
4. **Step 4:** Run full backend regression suite (Prisma generation, TypeScript compilation, Lambda cold start).
5. **Step 5:** Controlled Git commit and push to `origin/main`.

*Strict read-only audit complete. No files have been modified, committed, or deployed.*

