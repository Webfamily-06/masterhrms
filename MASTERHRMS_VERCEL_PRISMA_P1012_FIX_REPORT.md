# MASTERHRMS — VERCEL PRISMA P1012 UTF-8 BOM BUILD FIX REPORT

**Date:** November 2, 2026  
**Repository:** `Webfamily-06/masterhrms`  
**Branch:** `hotfix/prisma-p1012-utf8-bom`  
**Target:** Vercel deployment build step (`npm --prefix server run prisma:generate`)  
**Status:** RESOLVED & LOCALLY VERIFIED  

---

## 1. Executive Summary

During Vercel production deployment, the build failed during the `npm --prefix server run prisma:generate` step with Prisma error `P1012`:

```
Error: Prisma schema validation - (validate wasm)
Error code: P1012
error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  --> server/prisma/schema.prisma:1
   | 
 1 | ﻿generator client {
```

The root cause was identified as a 3-byte invisible **UTF-8 Byte Order Mark (BOM: `0xEF 0xBB 0xBF`)** prepended to `server/prisma/schema.prisma`. Prisma's WebAssembly parser expects schema files to begin immediately with valid ASCII/UTF-8 keywords. The invisible `U+FEFF` character caused Prisma's parser to fail to recognize `generator client`.

The leading UTF-8 BOM was removed cleanly at the binary level. No models, field definitions, indexes, or relations were altered. Schema validation, Prisma Client generation, and full TypeScript typechecks now succeed with **zero errors**. A lightweight pre-build validator and CI workflow have been added to prevent any future recurrence.

---

## 2. Root Cause & Origin

- **File:** `server/prisma/schema.prisma`
- **Initial Byte Sequence:** `ef bb bf 67 65 6e 65 72 61 74 6f 72 20 63 6c 69`
- **Decoded Leading Character:** `\uFEFF` (Zero Width No-Break Space / UTF-8 BOM)
- **Origin Commit:** Introduced in commit `58bd86da` when appending the `DeviceSession` model via a Windows editor/tool that prepended a UTF-8 BOM.
- **Migration Files Status:** All SQL migration files in `server/prisma/migrations/` were audited and confirmed clean without BOM (started with standard ASCII comments `2d 2d 20`).

---

## 3. Exact Changed Files

| File | Change Description |
|---|---|
| `server/prisma/schema.prisma` | Stripped leading 3-byte UTF-8 BOM (`0xEF 0xBB 0xBF`). File size reduced from 341,105 to 341,102 bytes. Preserved all 6,474 CRLF lines, models, and relations. |
| `server/src/routes/auth.routes.ts` | Stripped leading BOM, added explicit `Request` import from `express`, and resolved variable scope in the 2FA-disabled fallback. |
| `server/package.json` | Updated `"prisma:generate"` to run `validate_schema_encoding.cjs` pre-flight, and added `"validate:encoding"`. |
| `package.json` | Added `"validate:schema-encoding"` script. |
| `scripts/validate_schema_encoding.cjs` | Lightweight validation utility ensuring all `.prisma` files are clean UTF-8 without BOM. |
| `.github/workflows/verify-prisma-schema.yml` | Automated GitHub Actions CI workflow to validate schema encoding on push/PR. |

---

## 4. Byte Verification (Before vs After)

### Before (Failed with P1012):
```
Hex (16 bytes):  ef bb bf 67 65 6e 65 72 61 74 6f 72 20 63 6c 69
ASCII:           ...generator cli
Size:            341,105 bytes
Has UTF-8 BOM:   true
```

### After (Clean UTF-8):
```
Hex (16 bytes):  67 65 6e 65 72 61 74 6f 72 20 63 6c 69 65 6e 74
ASCII:           generator client
Size:            341,102 bytes
Has UTF-8 BOM:   false
```

---

## 5. Verification & Test Results

### 1. Prisma Schema Validation
```bash
$ npx prisma validate --schema prisma/schema.prisma
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```
**Exit Code:** `0` (Success)

### 2. Prisma Client Generation
```bash
$ npm --prefix server run prisma:generate

> hrms-server@1.0.0 prisma:generate
> node ../scripts/validate_schema_encoding.cjs && prisma generate

[Schema Encoding] PASS: server\prisma\schema.prisma (Clean UTF-8, no BOM)
[Schema Encoding] All 1 Prisma schema file(s) verified successfully.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\..\node_modules\@prisma\client in 7.35s
```
**Exit Code:** `0` (Success)

### 3. TypeScript Typecheck Results
| Target | Command | Result |
|---|---|---|
| Server Backend | `npx tsc --noEmit --project server/tsconfig.json` | **PASSED** (0 errors) |
| CMS Next.js Frontend | `npm run typecheck --prefix CMS` | **PASSED** (0 errors) |
| Root Frontend | `npx tsc --noEmit` | **PASSED** (0 errors) |

### 4. Security & Integration Suites
| Suite | Command | Result |
|---|---|---|
| Device Session & Concurrency | `npx --prefix server tsx server/src/tests/device-session.test.ts` | **11/11 PASSED** |
| Turnstile Verification & Enforcement | `npx --prefix server tsx server/src/tests/turnstile-runner.test.ts` | **13/13 PASSED** |
| Branding & SEO Nexsas Removal Guard | `npx --prefix server tsx server/src/tests/branding-seo-nexsas-guard.test.ts` | **8/8 PASSED** |

---

## 6. Schema & Migration Integrity

- **`DeviceSession` Model:** Verified present at line 6,438 of `server/prisma/schema.prisma` with all 19 attributes, foreign keys (`User`, `Tenant`), and indexes intact.
- **Migration File:** `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql` remains completely untouched (1,564 bytes, 0 git diff).
- **Prisma Client APIs:** `prisma.deviceSession` exports all standard methods (`findUnique`, `create`, `updateMany`, `delete`, etc.).
- **Production Guardrail:** No migrations were executed against any database; no environment variables were altered.

---

## 7. Recurrence Prevention Architecture

To prevent future PRs or local edits on Windows/macOS from re-introducing a UTF-8 BOM into Prisma schemas:

1. **Pre-Generation Hook:** `npm --prefix server run prisma:generate` executes `scripts/validate_schema_encoding.cjs` before invoking Prisma CLI.
2. **Synthetic BOM Guard:** The validator scans all `.prisma` files in the repository and immediately exits with code 1 if `0xEF 0xBB 0xBF` is detected.
3. **CI Pipeline:** `.github/workflows/verify-prisma-schema.yml` runs on every push and PR modifying `server/prisma/**`, validating encoding and running `prisma validate` on Ubuntu runners before deployment.

---

## 8. Git Diff Summary

```diff
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -1,4 +1,4 @@
-﻿generator client {
+generator client {
   provider      = "prisma-client-js"
   binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x", "debian-openssl-3.0.x", "darwin-arm64", "windows"]
 }

diff --git a/server/src/routes/auth.routes.ts b/server/src/routes/auth.routes.ts
--- a/server/src/routes/auth.routes.ts
+++ b/server/src/routes/auth.routes.ts
@@ -1,7 +1,7 @@
-﻿import { sendTwoFactorOtpEmail, sendPasswordResetEmail } from "../lib/email";
+import { sendTwoFactorOtpEmail, sendPasswordResetEmail } from "../lib/email";
 import { createOrReplaceOtp, verifyOtpCode, checkResendEligibility, maskEmail } from "../lib/otp";
 import { ERP_MODULES } from "../lib/erp-modules";
-import { Router, Response } from "express";
+import { Router, Request, Response } from "express";
 import crypto from "crypto";
@@ -635,7 +635,7 @@ const loginHandler = async (req: any, res: Response) => {
         const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
         sessionResult = await createDeviceSession({
           userId: user.id,
-          tenantId: effectiveTenantId || userTenantId || null,
+          tenantId: userTenantId || null,
           ipAddress: clientIp,
           userAgent: req.headers["user-agent"] as string,
         });

diff --git a/server/package.json b/server/package.json
--- a/server/package.json
+++ b/server/package.json
@@ -19,1 +19,2 @@
-    "prisma:generate": "prisma generate",
+    "prisma:generate": "node ../scripts/validate_schema_encoding.cjs && prisma generate",
+    "validate:encoding": "node ../scripts/validate_schema_encoding.cjs",

diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -27,1 +27,2 @@
     "postinstall": "npm --prefix server run prisma:generate",
+    "validate:schema-encoding": "node scripts/validate_schema_encoding.cjs",
```

---

## 9. Conclusion & Release Readiness

The P1012 build failure has been resolved locally on branch `hotfix/prisma-p1012-utf8-bom`. The fix is ready for commit and deployment upon user review and approval.
