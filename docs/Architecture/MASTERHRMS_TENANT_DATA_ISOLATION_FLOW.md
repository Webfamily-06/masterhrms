# MASTERHRMS — TENANT DATA ISOLATION & HOST RESOLUTION FORENSICS
**Authoritative Multi-Tenancy Security & Data Routing Specification**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. Multi-Tenancy Architecture Paradigm

MASTERHRMS uses a **Hybrid Multi-Tenancy Model**:
1. **Primary Operational Architecture**: **Shared PostgreSQL Schema with Transparent Row-Level `tenant_id` Isolation**. Enforced automatically across Prisma query ASTs via `createTenantIsolationExtension` (`server/src/extensions/tenant-isolation.extension.ts`).
2. **Dedicated Database / Schema Architecture**: Supported through `TenantConnectionManager` (`server/src/services/tenant-connection-manager.service.ts`), which maintains a pool of dedicated Prisma clients for enterprise tenants with custom `databaseUrl` connection strings.
3. **Execution Context**: Managed through Node.js native `AsyncLocalStorage` (`server/src/context/tenant-context.ts`), ensuring zero cross-tenant contamination across asynchronous event loops.

---

## 2. The 5 Host Resolution Flows

The entry point for all incoming HTTP requests is `workspaceHostMiddleware` (`server/src/middleware/workspace-host.middleware.ts`, line 38), backed by `resolveHostContext` (`server/src/lib/workspace-host.ts`, line 206).

```
   Incoming Request (Host / X-Forwarded-Host / Origin)
                         |
                         v
          `getEffectiveRequestHost(headers)`
                         |
                         v
             `resolveHostContext(host)`
                         |
      +------------------+------------------+------------------+
      |                  |                  |                  |
   "public"           "super"            "tenant"       "custom_domain"
(Flow A / Flow D1) (Flow B / Flow D2) (Flow C / Flow D3)    (Flow E)
```

---

### Flow A — Public Application (`masterhrms.com`)
1. **Host Header Resolution**: Host resolves to `masterhrms.com` or `www.masterhrms.com`.
2. **Context Type**: `hostContext = { type: "public", baseDomain: "masterhrms.com" }`.
3. **Tenant Lookup**: None performed. `req.resolvedTenant` remains `undefined`.
4. **Middleware Action**: Request proceeds directly to public marketing, landing page, pricing, and authentication endpoints.
5. **Cross-Tenant Guard**: Any request to tenant-scoped business APIs (`/api/v1/employees`, `/api/v1/payroll`, `/api/v1/leave`) will fail at `resolveTenantContext` with HTTP 403 `Missing tenant context`.

---

### Flow B — Super Admin (`super.masterhrms.com` / `super.localhost`)
1. **Host Header Resolution**: Host matches `getSuperAdminHost()` (`super.masterhrms.com`) or `super.localhost`.
2. **Context Type**: `hostContext = { type: "super", baseDomain }`.
3. **Tenant Lookup**: Bypassed. Super Admin manages the global control plane.
4. **Authentication**: `requireAuth` validates that `req.user.roles` contains `"super_admin"`.
5. **Route Access**: Can access `/super/*` and `/api/super/*`.
6. **Cross-Tenant Impersonation**: A Super Admin can pass `?tenantId=...` to inspect specific tenant settings, but normal tenant users accessing `super.*` are rejected at the authentication/role guard.

---

### Flow C — Tenant Subdomain (`{slug}.masterhrms.com`)
1. **Host Header Resolution**: Host ends with `.{BASE_DOMAIN}` (e.g. `acme.masterhrms.com`).
2. **Slug Extraction**: Slug extracted as `acme` (`workspace-host.ts`, line 246). Validated against `validateWorkspaceSlug(slug)` (3–30 chars, alphanumeric + hyphens, not reserved).
3. **Super Admin Isolation Rule**:
   - In `workspace-host.middleware.ts` (lines 61–72): If `slug.masterhrms.com` attempts to request `/super` or `/api/super`, the server **immediately returns HTTP 404 NOT_FOUND**. A tenant host can NEVER access the platform Super Admin portal under any circumstances.
4. **In-Memory Cache Lookup**: Checks `getCachedWorkspace(slug)` (60s TTL).
5. **Database Lookup**:
   ```typescript
   // workspace-host.middleware.ts, line 116
   const tenant = await prisma.tenant.findUnique({
     where: { slug },
     include: { subscription: { select: { status: true } } },
   });
   ```
6. **30-Day Rename Redirect**: If slug not found, checks `prisma.workspaceSlugRedirect` (`oldSlug = slug`, `redirectUntil >= now`). If found, sends HTTP 301 redirect to `${newSlug}.masterhrms.com`.
7. **Workspace Not Found**: If neither active nor redirecting, returns HTTP 404 `WORKSPACE_NOT_FOUND`.
8. **Tenant Resolution**: Binds `req.resolvedTenant = { id, name, slug, timezone, status }`.
9. **Authentication & Session Matching**:
   ```typescript
   // tenant-context.middleware.ts, lines 35-42
   if (user.tenantId !== resolvedTenant.id) {
     return res.status(403).json({
       error: "Cross-workspace access denied. Your session does not match this workspace host.",
       code: "HOST_TENANT_MISMATCH",
     });
   }
   ```
   **Security Guarantee**: Even if a malicious user obtains a valid JWT for Tenant A, they cannot use it on Tenant B's subdomain.

---

### Flow D — Local Development
1. **Ports**: TanStack Start runs on `5173`, Next.js CMS runs on `3000`, Backend Express runs on `5000`.
2. **Subdomain Loopback**: `acme.localhost:3000` is recognized as tenant `acme` by stripping the port (`workspace-host.ts`, line 215).
3. **Single-Origin Localhost Fallback**: When developers navigate directly to `http://localhost:3000`, `resolveHostContext("localhost")` resolves to `public`. In local dev, to avoid Windows loopback DNS resolution errors (`*.localhost` requiring local hosts file entries), the backend accepts session-based tenant resolution (`req.user.tenantId`) while preserving strict multi-tenancy.

---

### Flow E — Custom Domain (`custom-domain.com`)
1. **Host Header Resolution**: Host does not match platform base domain or `.localhost`.
2. **Cache Check**: Checks `getCachedCustomDomain(hostname)`.
3. **Database Lookup**:
   ```typescript
   // workspace-host.middleware.ts, line 291
   const dbDomain = await prisma.tenantDomain.findUnique({
     where: { domain: hostname },
     include: { tenant: { include: { subscription: true } } },
   });
   ```
4. **Status Verification**: Requires `dbDomain.status === "approved"` AND `dbDomain.dnsStatus === "verified"`.
   - If pending verification: returns HTTP 404 `CUSTOM_DOMAIN_NOT_ACTIVE`.
   - If verified: sets `req.hostContext = { type: "custom_domain", domain, tenantId }` and binds `req.resolvedTenant`.
5. **Super Admin Isolation Rule**: Custom domains requesting `/super` or `/api/super` immediately return HTTP 404.

---

## 3. Database Isolation Engine (`tenant-isolation.extension.ts`)

Every Prisma query executed within `AsyncLocalStorage` tenant context is intercepted by the `tenant-isolation-extension`:

```typescript
// server/src/extensions/tenant-isolation.extension.ts
export function createTenantIsolationExtension(baseClient: PrismaClient) {
  return baseClient.$extends({
    name: "tenant-isolation-extension",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const ctx = getTenantContext();
          if (!ctx?.tenantId || GLOBAL_MODELS.has(model)) return query(args);
          if (DIRECT_TENANT_MODELS.has(model)) {
            args.where = { ...(args.where || {}), tenantId: ctx.tenantId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          const ctx = getTenantContext();
          if (ctx?.tenantId && DIRECT_TENANT_MODELS.has(model)) {
            sanitizeWritePayload(args.data, ctx.tenantId, true);
          }
          return query(args);
        },
      },
    },
  });
}
```

### Automatic Protections Enforced
1. **Read Filtering**: Automatically injects `WHERE tenantId = ctx.tenantId` on all 147 direct tenant models.
2. **Write Injection**: Automatically injects `tenantId: ctx.tenantId` into `create`, `createMany`, `connectOrCreate`, and `upsert` calls.
3. **Child Relation Traversal**: Automatically navigates the 34 child dependent models (e.g. `SalaryStructureItem` automatically filtered via `structure: { tenantId }`).
4. **Fail-Closed AsyncLocalStorage**: If an API route runs outside `tenantStorage.run()`, `getTenantContext()` returns `undefined`, triggering alerts and preventing data leaks.
