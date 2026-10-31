# MasterHRMS — Controlled React Dependency Deduplication Report

**Document Date:** October 31, 2026
**Implementation Status:** DEDUPLICATION COMPLETE & EMPIRICALLY VERIFIED (PENDING USER COMMIT/PUSH APPROVAL)
**Scope:** Monorepo React & React DOM dependency deduplication across root and CMS workspaces
**Affected Artifacts:** [CMS/package.json](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/package.json), [CMS/next.config.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/next.config.ts), [package-lock.json](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/package-lock.json)

---

## 1. Root Cause Summary

When npm workspaces was first initialized in commit `71ac8e3c`, `CMS/package.json` had exact `"react": "19.2.3"`, while the root `package.json` declared `"react": "^19.2.0"`. Because `^19.2.0` resolved to `19.3.0` at the root, npm could not deduplicate React into the root `node_modules/`. Instead, npm generated a nested entry in `package-lock.json` under `packages["CMS/node_modules/react"]`.

When `CMS/package.json` was subsequently updated to `"^19.2.0"`, running `npm install` alone did not remove the nested entry because npm's conservative lockfile algorithm treats existing locked versions as valid constraints if they satisfy the declared range (`19.2.3` satisfies `^19.2.0`). Consequently, the lockfile remained split between root `19.3.0` and CMS `19.2.3`.

---

## 2. Deduplication Changes Applied

Executing standard npm deduplication from the monorepo root:

```bash
npm dedupe --legacy-peer-deps
```

- Evaluated all workspace manifests and hoisted packages whose constraints are satisfied by the root installation.
- Removed all 9 nested packages previously nested in `CMS/node_modules/` (including `CMS/node_modules/react`, `CMS/node_modules/react-dom`, and `CMS/node_modules/scheduler`).
- Unified the entire monorepo dependency tree onto a single hoisted copy of React `19.3.1` and React DOM `19.3.1` in root `node_modules/`.

---

## 3. Before and After Dependency Tree Comparison

### Before Deduplication (`npm explain react`):
```text
react@19.2.3
CMS/node_modules/react
  react@"^19.2.0" from automation-saas-ns-next@1.0.0

react@19.3.0
node_modules/react
  react@"^19.2.0" from the root project
```

### After Deduplication (`npm explain react`):
```text
react@19.3.1
node_modules/react
  react@"^19.2.0" from automation-saas-ns-next@1.0.0
  CMS
    automation-saas-ns-next@1.0.0
    node_modules/automation-saas-ns-next
      workspace CMS from the root project
  react@"^19.2.0" from the root project
```

### Module Resolution Paths
- **Root Context:** `node_modules/react/index.js` (v19.3.1)
- **CMS Workspace Context:** `node_modules/react/index.js` (v19.3.1 — resolved directly from root!)
- **Disk Verification:** `CMS/node_modules/react` on-disk existence: **`false`** (deleted).

---

## 4. Lockfile Changes Analysis

```text
git diff --stat package-lock.json
 package-lock.json | 247 +++++++++++++++++++----------------------------------
 1 file changed, 85 insertions(+), 162 deletions(-)
```

- **Removed Entries:**
  - `packages["CMS/node_modules/react"]`
  - `packages["CMS/node_modules/react-dom"]`
  - `packages["CMS/node_modules/scheduler"]`
  - All nested redundant sub-dependencies inside `CMS/node_modules/`.
- **Preserved Declarations:**
  - Root `package.json` and `CMS/package.json` both cleanly declare `"react": "^19.2.0"` and `"react-dom": "^19.2.0"`.
  - Zero unrelated dependency semver ranges modified.

---

## 5. Clean Installation Verification (`npm ci`)

In an isolated disposable sandbox with zero local caches:

```bash
npm ci --legacy-peer-deps
```

- **Exit Code:** `0` (Success)
- **React Resolution in Sandbox:** `node_modules/react/index.js`
- **Next.js Resolution in Sandbox:** `node_modules/next/dist/server/next.js`
- **Nested `CMS/node_modules/react` created:** **`false`**
- **Conclusion:** On Vercel CI/CD, `npm ci` will cleanly install React to root `node_modules/` without generating nested duplicate React copies.

---

## 6. Regression Testing Suite Results

| # | Test | Command | Result | Details |
|---|---|---|:---:|---|
| 1 | **CMS Production Build** | `npm run cms:build` | **PASSED** | Turbopack compiled and generated **all 539 pages** in **10.7s** with exit code 0. |
| 2 | **Backend Prisma Generation** | `npx --workspace=server prisma generate` | **PASSED** | Generated to root `node_modules/@prisma/client` in 7.9s. |
| 3 | **Backend TypeScript Compilation** | `npx --workspace=server tsc` | **PASSED** | Compiled cleanly to `server/dist/index.js` with 0 errors. |
| 4 | **Backend Runtime Dependency Resolution** | Module resolution check | **PASSED** | All 7 backend packages (`express`, `cors`, `compression`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`, `zod`) resolved. |
| 5 | **Lambda Cold-Start Simulation** | `server/index.js` require test | **PASSED** | Exported function `typeof handler === 'function'` with `dotenv` bypassed under `VERCEL=1`. |

---

## 7. Current Git Working Tree Status

```text
git status --short
 M CMS/next.config.ts
 M CMS/package.json
 M package-lock.json
?? docs/cms-react-runtime-dependency-audit.md
?? docs/cms-workspace-boundary-fix-report.md
?? docs/final-git-push-readiness-report.md
?? docs/react-workspace-deduplication-report.md
```

- **Application code modified:** 0 files.
- **Git commits / pushes executed:** 0 (awaiting user review).
