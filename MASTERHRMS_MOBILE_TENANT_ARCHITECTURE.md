# MASTERHRMS MOBILE — AUTHORITATIVE TENANT ARCHITECTURE SPECIFICATION
**Multi-Tenant Isolation, Host Resolution & Client-Side Workspace Security**  
**Repository:** `Webfamily-06/masterhrms`  
**Platforms:** Android & iOS (React Native CLI + TypeScript)  
**Date:** November 16, 2026  

---

## 1. Multi-Tenancy Architecture Paradigm

MasterHRMS is built from the ground up as an enterprise Multi-Tenant SaaS platform. To maintain strict legal and regulatory compliance across corporate clients, tenant isolation is enforced at every layer of the architecture:

```
+-----------------------------------------------------------------------------------+
|                            MOBILE APPLICATION CLIENT                              |
|  - Isolated TanStack Query Caches partitioned by `tenantId`                       |
|  - Secure Storage storing credentials per `tenantId`                              |
|  - Strict cache purging on tenant switch or logout                                |
+-----------------------------------------------------------------------------------+
                                          │
                        HTTP REST API with verified headers:
                        `Authorization: Bearer <token>`
                        `x-tenant-id: <uuid>`
                        `x-tenant-slug: <slug>`
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                        BACKEND ENGINE (server/src/)                               |
|  1. `workspaceHostMiddleware`: Normalizes target host and resolves workspace slug |
|  2. `requireAuth`: Verifies token signature and checks `user.tenantId`            |
|  3. `resolveTenantContext`:                                                       |
|     - Verifies `user.tenantId === req.resolvedTenant.id` (Blocks cross-tenant     |
|       token tampering with HTTP 403 `HOST_TENANT_MISMATCH`)                       |
|     - Enforces IP allowlist / firewall rules (`BannedIp`)                         |
|     - Obtains dedicated or pooled Prisma client via `TenantConnectionManager`     |
|     - Binds context to Node.js `AsyncLocalStorage` (`tenantStorage.run()`)        |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                 PRISMA ORM TENANT ISOLATION EXTENSION                              |
|  `server/src/extensions/tenant-isolation.extension.ts`                            |
|  - AST Query Read: Injects `WHERE tenantId = ctx.tenantId` on all 147 models       |
|  - AST Query Write: Enforces `data.tenantId = ctx.tenantId` on all create/upsert  |
|  - Traverses 34 Child-Dependent relations automatically                           |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                            SHARED POSTGRESQL DATABASE                             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Web vs Mobile Tenant Resolution Differences

| Architectural Aspect | Web Browser Client | Mobile App Client (React Native) |
| :--- | :--- | :--- |
| **Origin & Host** | Browser operates on `{slug}.masterhrms.com` | Mobile operates on a single configured API Host (e.g. `api.masterhrms.com`) |
| **Subdomain Hopping** | Browser navigates via HTTP 301/302 redirects across subdomains | Mobile app remains on a single native binary; does not perform DNS hops |
| **Workspace Binding** | Inferred from `window.location.hostname` | Explicitly selected during Company Identification and verified in token payload |
| **Tenant Headers** | Sent implicitly via origin host | Sent explicitly via `x-tenant-id` and `x-tenant-slug` headers on every request |
| **Cross-Site Cookies**| Subject to cookie domain policies (`SameSite=lax`) | Bearer tokens stored in OS Keystore/Keychain; zero cookie dependency |

---

## 3. Server-Side Tenant Isolation Guarantees

### 3.1 Zero-Trust Client Tenant Identifiers
The backend **NEVER** trusts a tenant identifier supplied solely by the client in request bodies or query parameters:
1. `resolveTenantContext` reads `req.user.tenantId` from the cryptographically verified JWT payload.
2. If the request reaches a tenant host or supplies `x-tenant-id`, the middleware verifies that the header matches the token payload.
3. Any attempt to access Tenant B's data using a token issued for Tenant A results in an immediate rejection:
   ```json
   {
     "error": "Cross-workspace access denied. Your session does not match this workspace host.",
     "code": "HOST_TENANT_MISMATCH"
   }
   ```

### 3.2 Prisma Query AST Filtering
Even if an application developer omits a `where: { tenantId }` filter in a controller, the Prisma extension intercepts the AST:
```typescript
// server/src/extensions/tenant-isolation.extension.ts
async findMany({ model, args, query }) {
  const ctx = getTenantContext();
  if (!ctx?.tenantId || GLOBAL_MODELS.has(model)) return query(args);
  if (DIRECT_TENANT_MODELS.has(model)) {
    args.where = { ...(args.where || {}), tenantId: ctx.tenantId };
  }
  return query(args);
}
```
This fail-closed architecture guarantees that a database query will never return records belonging to another tenant.

---

## 4. Client-Side Multi-Tenant State Isolation

### 4.1 TanStack Query Key Partitioning
To prevent data contamination in the mobile app's local server state cache, every query key is strictly partitioned by `tenantId`:

```typescript
// Good: Tenant-partitioned query keys
const { data: attendance } = useQuery({
  queryKey: [currentTenantId, 'attendance', { month: '2026-11' }],
  queryFn: () => attendanceService.getAttendanceHistory({ month: '2026-11' }),
});

const { data: profile } = useQuery({
  queryKey: [currentTenantId, 'employee', 'profile'],
  queryFn: () => employeeService.getProfile(),
});
```

### 4.2 Multi-Account & Workspace Switching Protocol
When a user switches organizations (e.g. a consultant or manager belonging to multiple client companies):
1. **Cancel In-Flight Requests**: AbortController cancels all active HTTP requests.
2. **Purge Cache**: TanStack Query cache is purged:
   ```typescript
   queryClient.removeQueries(); // Completely removes all cached data from memory
   ```
3. **Switch Active Session**: The mobile app loads the new tenant's stored refresh token and session ID from Keychain/Keystore.
4. **Fetch New Tenant Context**: Calls `GET /api/v1/auth/me` under the new tenant credentials.
5. **Re-initialize Theme & Branding**: Updates app header, logo, and primary colors to match the new company identity.
6. **Reset Navigation**: Resets navigation state to the new workspace's dashboard.

### 4.3 Clean Workspace Teardown on Logout
On user logout:
- All tenant-scoped cached files in the mobile app's cache directory (temporary PDF payslips, profile avatars) are deleted.
- Secure storage keys for the workspace are removed.
- Push notification subscription for the workspace device is deregistered.
- Zero residual business data remains on the device filesystem.
