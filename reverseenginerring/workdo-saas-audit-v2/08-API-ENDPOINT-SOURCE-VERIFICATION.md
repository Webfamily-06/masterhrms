# 08 — API Endpoint Source Verification (Express AST Route Audit)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Express Router AST Extraction & Mount Point Mapping  
**Date:** November 19, 2026  
**Route Files Inspected:** 122 files in `server/src/routes/` + 8 files in `server/src/modules/` (130 total)  
**Historical Claim:** 1,629 REST and CRUD Endpoints  
**Audit Reality:** 2,084 Explicitly Declared Route Handlers across 157 Dual Mount Prefixes  

---

## 1. Executive Summary & Reconciliation of the 1,629 Metric

In the historical reverse engineering report (`docs/reverse-engineering/workdo-saas/29-COMPLETE-API-AND-CRUD-REGISTRY.md`), MASTERHRMS was claimed to expose **1,629 RESTful API endpoints**.

A forensic audit of the codebase reveals the origin and reality of this metric:
1. **The 1,629 Origin:** In `server/src/discovered_endpoints.json` (timestamped `Oct 20, 2026, 14:39`), an automated AST extraction generated an endpoint catalog totaling exactly 1,629 endpoints.
2. **Current Codebase Growth:** As of November 19, 2026, active feature development across Phase 2, Phase 3, and modular extensions expanded the backend route surface:
   - Route files in `server/src/routes/`: **122 files**.
   - Modular route files in `server/src/modules/`: **8 files**.
   - Total explicitly declared Express route handlers: **2,084 endpoints**.

---

## 2. HTTP Method Distribution of Declared Endpoints

AST inspection across all 130 Express route modules reveals the following distribution of HTTP verbs:

| HTTP Method Verb | Declared Route Handler Count | Percentage of API Surface | Primary Functional Scope |
|---|---|---|---|
| **`GET`** | 847 | 40.64% | Directory queries, detail retrievals, summary calculations, export downloads |
| **`POST`** | 801 | 38.44% | Record creation, batch actions, search/filter payloads, login/auth mutations |
| **`PUT`** | 196 | 9.40% | Full record updates, status transitions, profile modifications |
| **`DELETE`** | 171 | 8.21% | Record deletions, soft removals, token invalidations |
| **`PATCH`** | 64 | 3.07% | Partial record mutations, individual field edits |
| **`ALL`** | 5 | 0.24% | Wildcard forwarders, proxy gateways |
| **TOTAL** | **2,084** | **100.00%** | |

---

## 3. Dual Mounting Architecture in `server/src/index.ts`

A critical architectural discovery is that `server/src/index.ts` establishes **157 route mount statements** using `app.use()`. 

To maintain backward compatibility during migration from v1 to enterprise v2, major routers are mounted concurrently under both `/api/v1/...` and legacy `/api/...` prefixes. For example:
- `settingsRouter` is mounted at both `/api/v1/settings` and `/api/settings`.
- `mediaRouter` is mounted at both `/api/v1/media` and `/api/media`.
- `filesRouter` is mounted at both `/api/v1/files` and `/api/files`.
- `superStorageRouter` is mounted at both `/api/v1/super/storage` and `/api/super/storage`.
- `hrProfileChangesRouter` is mounted across 4 distinct prefixes: `/api/v1/hr/requests/profile-changes`, `/api/hr/requests/profile-changes`, `/api/v1/hr/profile-changes`, and `/api/hr/profile-changes`.

> **Forensic Distinction:** The existence of dual mount paths means that a single declared route handler (e.g. `router.get("/config")`) may be reachable via two or more runtime URLs (e.g. `/api/settings/config` and `/api/v1/settings/config`). While this increases reachable URLs, the canonical declared endpoint count is **2,084**.

---

## 4. Middleware Enforcement & Security Pipeline

Inspection of Express middleware chains confirms that API routes are guarded by a multi-tier interception pipeline:

```
Incoming Request
  │
  ▼
1. Host Scoping (`workspace-host.middleware.ts`)
   - Resolves subdomain from Host header (`{tenant}.masterhrms.com`)
   - Caches custom domain mapping
  │
  ▼
2. JWT Authentication (`requireAuth` / `auth.ts`)
   - Validates Bearer token in `Authorization` header
   - Rejects expired or malformed JWTs (401 Unauthorized)
   - Injects authenticated user payload (`req.user`)
  │
  ▼
3. Tenant Context Isolation (`tenant-context.middleware.ts`)
   - Enforces `tenantId` parity between Host header, JWT token, and route params
   - Binds tenant context to Node.js `AsyncLocalStorage` (`tenantStorage`)
   - Aborts on tenant mismatch (403 TENANT_MISMATCH)
  │
  ▼
4. Entitlement & Add-on Gating (`requireEntitlement`)
   - Checks if tenant has active subscription package for requested module
   - Rejects unpurchased add-on requests (402 PAYMENT_REQUIRED)
  │
  ▼
5. Route Handler Execution (Controller / Prisma Query)
   - Executes with automatic Prisma `where: { tenantId }` extension
```
