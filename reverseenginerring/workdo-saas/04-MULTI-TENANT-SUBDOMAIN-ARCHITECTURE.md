# 04 — MASTERHRMS Multi-Tenant Subdomain Architecture
> Status: **IMPLEMENTED** | Evidence from actual codebase audit

---

## 1. Overview

MASTERHRMS uses a **shared PostgreSQL schema** multi-tenancy strategy. All tenant data lives in a single database, isolated by `tenant_id` foreign keys. Tenant workspaces are routed via subdomain (`{slug}.{BASE_DOMAIN}`) with optional custom domain support.

---

## 2. Host Resolution Pipeline

**File:** `server/src/lib/workspace-host.ts`  
**File:** `server/src/middleware/workspace-host.middleware.ts`

### 2.1 HostContext Types (5 possible states)

```typescript
export type HostContext =
  | { type: "public"; baseDomain: string }
  | { type: "super"; baseDomain: string }
  | { type: "tenant"; slug: string; baseDomain: string }
  | { type: "custom_domain"; domain: string; tenantId: string; baseDomain: string }
  | { type: "unknown"; host: string; baseDomain: string };
```

### 2.2 Resolution Order (`resolveHostContext`)

1. Strip port from `Host` header
2. Check if hostname matches `{BASE_DOMAIN}` or `www.{BASE_DOMAIN}` → `public`
3. Check if hostname matches `super.{BASE_DOMAIN}` → `super`
4. Check if hostname ends with `.{BASE_DOMAIN}` → `tenant` (extract slug)
5. Check if hostname ends with `.localhost` (dev) → `tenant`
6. Check in-memory custom domain cache → `custom_domain`
7. Otherwise → `unknown`

### 2.3 Effective Request Host Priority

```typescript
export function getEffectiveRequestHost(headers):
  1. X-Forwarded-Host (set by Nginx/Cloudflare)
  2. Host header
  3. X-App-Host (custom frontend header)
  4. Origin / Referer fallback
```

### 2.4 workspaceHostMiddleware Flow

**File:** `server/src/middleware/workspace-host.middleware.ts`

For `type === "tenant"`:
1. Check 60s in-memory routing cache (`workspaceCache`)
2. Query `tenants` table by `slug` (unique index)
3. Check `workspace_slug_redirects` table (30-day redirect for renamed slugs)
4. If not found → HTTP 404 `WORKSPACE_NOT_FOUND`

For `type === "unknown"`:
1. Check custom domain cache
2. Query `tenant_domains` table by `domain`
3. If `status === "approved" && dnsStatus === "verified"` → resolve as custom domain
4. Otherwise → HTTP 404 `CUSTOM_DOMAIN_NOT_ACTIVE`

**Security Isolation:**
- Tenant host + `/super` path → HTTP 404 (super admin routes NEVER exposed on tenant subdomain)
- Tenant host + `/api/cms` path → HTTP 404 (CMS APIs isolated to platform host)
- Custom domain + `/super` path → HTTP 404

---

## 3. Tenant Context Middleware

**File:** `server/src/middleware/tenant-context.middleware.ts`  
**File:** `server/src/context/tenant-context.ts`

### 3.1 TenantContext Interface

```typescript
export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  status: WorkspaceStatus; // "ACTIVE" | "SUSPENDED" | "TRIAL" | "EXPIRED"
  tenancyStrategy: TenancyStrategy; // "SHARED_SCHEMA" | "SCHEMA_PER_TENANT" | "DEDICATED_DB"
  db: PrismaClient;
}
```

### 3.2 `resolveTenantContext` Middleware Flow

1. Requires authenticated `req.user`
2. Extracts `tenantId` from JWT
3. **Host Isolation Check**: If `hostContext.type === "tenant"`, validates `user.tenantId === resolvedTenant.id`. Cross-workspace access → HTTP 403 `HOST_TENANT_MISMATCH`
4. Calls `TenantConnectionManager.getClientForTenant(tenantId)` to get Prisma client
5. **IP Firewall Check**: Checks `banned_ips` table (60s cache), returns 403 `IP_BANNED` on match
6. Runs remaining middleware via `AsyncLocalStorage.run(context, next)`

### 3.3 AsyncLocalStorage Pattern

```typescript
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function getTenantDb(req?: any): PrismaClient {
  const ctx = getTenantContext();
  if (ctx?.db) return ctx.db;
  if (req?.tenantContext?.db) return req.tenantContext.db;
  return sharedPrisma; // fallback
}
```

---

## 4. Prisma-Level Tenant Isolation Extension

**File:** `server/src/extensions/tenant-isolation.extension.ts`  
**File:** `server/src/config/tenant-models.config.ts`

### 4.1 Extension Mechanism

A Prisma Client Extension (`$extends`) automatically injects `tenantId` filters into ALL database operations:

```typescript
export function createTenantIsolationExtension(baseClient: PrismaClient) {
  return baseClient.$extends({
    name: "tenant-isolation-extension",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const context = getTenantContext();
          if (!context?.tenantId || GLOBAL_MODELS.has(model)) return query(args);
          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...args.where, tenantId: context.tenantId };
          }
          return query(args);
        },
        // Same for findFirst, findUnique, count, create, createMany, update,
        // updateMany, delete, deleteMany, upsert
      }
    }
  });
}
```

### 4.2 Model Classification

| Category | Behavior | Example Models |
|----------|----------|----------------|
| `GLOBAL_MODELS` | No tenant filter injected | `User`, `Permission`, `SubscriptionPlan`, `Addon`, `CmsPage` |
| `DIRECT_TENANT_MODELS` | `tenantId` injected into all ops | `Employee`, `Attendance`, `LeaveRequest`, `BillingInvoice`, `TenantAddon` |
| `CHILD_DEPENDENT_MODELS` | Filter via parent relation | `PayslipItem`, `SaleItem`, etc. |
| `ROOT_TENANT_MODEL` | Filter by `id = tenantId` | `Tenant` |

### 4.3 `sanitizeWritePayload` Function

Recursively walks create/update payloads and injects `tenantId` into:
- Nested `create` operations
- Nested `createMany.data` arrays
- Nested `connectOrCreate.create` payloads
- Nested `upsert.create` payloads

---

## 5. Workspace Slug System

**File:** `server/src/lib/workspace-host.ts`

### 5.1 Validation Rules

- Length: 3–30 characters
- Pattern: `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`
- No consecutive hyphens (`--`)
- Must be lowercase

### 5.2 Reserved Slugs (Blocked)

```
www, app, api, admin, super, mail, smtp, ftp,
status, docs, cdn, static, assets, billing, support, help, blog, portal, dashboard, developer,
login, auth, signup, register, logout, oauth, sso,
dev, test, staging, demo, sandbox, default, localhost, root
```

### 5.3 Slug Rename with 30-Day Redirect

**Model:** `WorkspaceSlugRedirect` — `old_slug`, `new_slug`, `redirect_until`, `tenant_id`  
Middleware checks this table when a slug is not found in the `tenants` table.

---

## 6. URL Structure

| Context | URL Pattern |
|---------|-------------|
| Public/marketing site | `https://{BASE_DOMAIN}` |
| Super Admin console | `https://{BASE_DOMAIN}/super` |
| Tenant workspace | `https://{slug}.{BASE_DOMAIN}` |
| Custom domain | `https://{custom-domain}` |
| Dev tenant (local) | `http://{slug}.localhost:3000` |

**Function:** `getBaseDomain()` — reads `BASE_DOMAIN` env var, defaults to `"localhost"` in dev, `"masterhrms.com"` in production.

---

## 7. Custom Domain Support

**File:** `server/src/middleware/workspace-host.middleware.ts`  
**Model:** `TenantDomain` — `domain`, `tenant_id`, `status`, `dns_status`, `ssl_status`, `is_primary`

**Status:** IMPLEMENTED — Full Flow 2 custom domain resolution including:
- DNS verification (`dns_status === "verified"`)
- Admin approval (`status === "approved"`)
- 60s in-memory cache (`customDomainCache`)
- Super admin route isolation on custom domains

---

## 8. Routing Cache

| Cache | TTL | Store |
|-------|-----|-------|
| `workspaceCache` (slug→tenant) | 60 seconds | Node.js in-memory Map |
| `customDomainCache` (domain→tenant) | 60 seconds | Node.js in-memory Map |
| `subscriptionCache` (tenantId→sub) | 60 seconds | Node.js in-memory Map |
| `bannedIpCache` (tenantId→rules) | 60 seconds | Node.js in-memory Map |

> [!NOTE] All caches are process-local. In multi-process deployments (PM2 cluster), cache invalidation is not cross-process. `invalidateWorkspaceCache(slug)` and `invalidateCustomDomainCache(domain)` are callable on-demand.

---

## 9. Tenancy Strategy

**Current:** `SHARED_SCHEMA` — Single PostgreSQL database, all tenants share tables, isolated by `tenant_id` column.  
**Architecture supports:** `SCHEMA_PER_TENANT`, `DEDICATED_DB` (defined in `TenancyStrategy` type, managed by `TenantConnectionManager`).

> [!IMPORTANT] The `TenantConnectionManager` service abstracts the connection strategy, meaning MASTERHRMS can theoretically migrate to per-tenant databases without changing route/service code.
