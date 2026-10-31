# MasterHRMS — Controlled Next.js Workspace Boundary Fix Report

**Document Date:** October 31, 2026
**Implementation Status:** IMPLEMENTED & EMPIRICALLY VERIFIED (PENDING USER COMMIT/PUSH APPROVAL)
**Target Environment:** Vercel Next.js 16 (Turbopack) & Serverless Function Runtime
**Affected Service:** CMS (`CMS/`)

---

## 1. Executive Summary

Following the diagnostic audit of the production Vercel build error (`unhandledRejection Error: Cannot find module 'react'`), the verified workspace boundary fix and React version harmonization have been implemented and validated across both workspaces.

The implementation achieved two targeted objectives:
1. **Restored Monorepo Boundary in Next.js:** Configured `outputFileTracingRoot` and `turbopack.root` in `CMS/next.config.ts` to reference the monorepo root (`path.resolve(__dirname, '..')`), enabling Next.js and Turbopack to compile and resolve hoisted dependencies from the root `node_modules/`.
2. **Harmonized React Versions:** Aligned `CMS/package.json` React and React DOM dependencies to `"^19.2.0"`, matching the root manifest and eliminating version fragmentation in `package-lock.json`.

Full end-to-end verification confirms:
- **Clean `npm ci`:** Succeeded with exit code 0 in an isolated clean sandbox.
- **CMS Production Build (`next build`):** Succeeded with exit code 0 using Turbopack, compiling all 539 routes in 10.5 seconds.
- **Backend Regression Suite:** 100% passed (Prisma Client generation, TypeScript compilation, all 7 direct backend runtime dependencies resolved, and Express serverless cold-start simulation verified).

---

## 2. Exact Files Changed

Three files were modified in this fix:

1. [CMS/next.config.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/next.config.ts)
2. [CMS/package.json](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/package.json)
3. [package-lock.json](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/package-lock.json)

Zero application source code files in `server/src/` or `CMS/src/` were modified.

---

## 3. Configuration Before and After

### A. `CMS/next.config.ts`

```diff
--- a/CMS/next.config.ts
+++ b/CMS/next.config.ts
@@ -21,9 +21,9 @@ const nextConfig: NextConfig = {
       },
     ],
   },
-  outputFileTracingRoot: path.resolve(__dirname),
+  outputFileTracingRoot: path.resolve(__dirname, '..'),
   turbopack: {
-    root: path.resolve(__dirname),
+    root: path.resolve(__dirname, '..'),
   },
   async rewrites() {
     const rawBackend = process.env.SERVER_URL || process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
```

**Impact:** Next.js and Turbopack now recognize `/vercel/path0` (the monorepo root) as the compilation and module boundary, resolving packages hoisted into `/vercel/path0/node_modules/`.

---

### B. `CMS/package.json`

```diff
--- a/CMS/package.json
+++ b/CMS/package.json
@@ -61,10 +61,10 @@
     "lucide-react": "^1.60.0",
     "next": "16.1.6",
     "pusher-js": "^8.6.0",
-    "react": "19.2.3",
+    "react": "^19.2.0",
     "react-apexcharts": "^2.1.1",
     "react-day-picker": "^9.14.0",
-    "react-dom": "19.2.3",
+    "react-dom": "^19.2.0",
     "react-fast-marquee": "^1.6.5",
     "react-hook-form": "^7.90.0",
     "react-leaflet": "^5.0.0",
```

**Impact:** React is now version-harmonized with the root manifest (`^19.2.0`), allowing npm to deduplicate and hoist React into a single unified version.

---

### C. `package-lock.json`

```diff
--- a/package-lock.json
+++ b/package-lock.json
@@ -158,10 +158,10 @@
         "lucide-react": "^1.60.0",
         "next": "16.1.6",
         "pusher-js": "^8.6.0",
-        "react": "19.2.3",
+        "react": "^19.2.0",
         "react-apexcharts": "^2.1.1",
         "react-day-picker": "^9.14.0",
-        "react-dom": "19.2.3",
+        "react-dom": "^19.2.0",
         "react-fast-marquee": "^1.6.5",
         "react-hook-form": "^7.90.0",
         "react-leaflet": "^5.0.0",
```

---

## 4. Test Suite Execution & Results

### Test 1: Clean Sandbox `npm ci`
- **Context:** Isolated temporary sandbox with no local caches or existing `node_modules/`.
- **Command:** `npm ci --legacy-peer-deps`
- **Result:** **PASSED (Exit Code 0)**
- **Verification:** Both React and Next.js resolved cleanly from within the workspace without errors.

### Test 2: CMS Production Next.js Build
- **Command:** `npm run cms:build` (`next build` with Turbopack)
- **Result:** **PASSED (Exit Code 0)**
- **Summary:**
  - Turbopack compilation: Completed in 10.5s.
  - TypeScript validation: Passed.
  - Page generation: Generated 539 static and dynamic routes in 1,282.9ms.
  - Turbopack errors: **0 errors**.

### Test 3: Backend Prisma Client Generation
- **Command:** `npx --workspace=server prisma generate`
- **Result:** **PASSED (Exit Code 0)**
- **Output:** Client generated cleanly to `node_modules/@prisma/client`.

### Test 4: Backend TypeScript Compilation
- **Command:** `npx --workspace=server tsc`
- **Result:** **PASSED (Exit Code 0)**
- **Output:** Output verified in `server/dist/index.js`.

### Test 5: Backend Runtime Dependency Resolution
- **Evaluated Dependencies:** `express`, `cors`, `compression`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`, `zod`.
- **Result:** **100% RESOLVED** from `server` execution context.

### Test 6: Backend Serverless Cold-Start Simulation
- **Environment Flags:** `VERCEL="1"`, `NODE_ENV="production"`, `LAMBDA_TASK_ROOT="/var/task"`.
- **Target:** `require('./server/index.js')`.
- **Result:** **PASSED** (`typeof handler === 'function'`). Unconditional `dotenv` loading remained completely bypassed.

---

## 5. Vercel Packaging & Deployment Readiness

| Requirement | Audit Finding | Status |
| :--- | :--- | :---: |
| **Turbopack Workspace Root** | Configured to `path.resolve(__dirname, '..')` | **READY** |
| **Next.js Output File Tracing Root** | Configured to `path.resolve(__dirname, '..')` | **READY** |
| **React Hoisting & Deduplication** | Aligned with root `^19.2.0` | **READY** |
| **Clean `npm ci` Execution** | Exit code 0 verified in isolated sandbox | **READY** |
| **Production Build Execution** | 539 pages built in 10.5s with exit code 0 | **READY** |
| **Backend Express Availability** | Hoisted to root `node_modules/` | **READY** |
| **Backend Serverless Handler** | Cold-start passes cleanly in serverless simulation | **READY** |

---

## 6. Remaining Risks & Safeguards

- **Dependency Upgrades:** No unrelated packages were updated; semver stability is preserved.
- **Backend Isolation:** The changes are strictly isolated to `CMS/next.config.ts` and `CMS/package.json`; no server source files were modified.
- **Development daemons:** Both the CMS frontend daemon and the backend server daemon have been restarted and are running normally.
