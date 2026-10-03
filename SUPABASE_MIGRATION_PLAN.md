# Supabase Migration Plan: Master HRMS / ERP

## 1. Migration Strategy & Objectives
The platform transition moves the relational database storage engine from MySQL to **Supabase PostgreSQL** in AWS `ap-south-1`.

### Key Directives:
1. **Preserve Application Logic**: Zero rewrites of business logic, controllers, or route endpoints.
2. **Preserve Authentication**: Retain the existing JWT, bcrypt, 2FA, session, and role-based access control architecture without replacing it with external Supabase Auth.
3. **Preserve Multi-Tenancy**: Maintain tenant isolation through `tenant_id` query scoping via Prisma proxy extensions.
4. **Resilience & High Availability**: Employ Supabase's shared transaction pooler (`pgbouncer=true` on port `6543`) for high-concurrency API requests, and direct connection (`5432`) for schema synchronization and migrations.

---

## 2. Execution Phases & Milestones

```
[Phase 1: Workspace Audit] ➔ COMPLETED
  - Audited dependencies, schema, configs, test suites, and services.
  - Authored audit reports.

[Phase 2: Supabase Architecture] ➔ COMPLETED
  - Dual-mode connection pooling (port 6543 transaction mode, 5432 session mode).
  - Maintained tenant-context and bcrypt/JWT authentication layers.

[Phase 3: Schema Migration] ➔ COMPLETED
  - Adjusted schema.prisma (provider = "postgresql", directUrl configured).
  - Replaced MySQL-specific @db.LongText with @db.Text.
  - Pushed 161 models to Supabase via `prisma db push`.

[Phase 4: Complete Data Migration & Seeding] ➔ COMPLETED
  - Seeded default tenant ("tenant-default-001"), Super Admin, HR Admin, Employee demo staff.
  - Seeded 3-tier subscription plans (Starter, Growth, Enterprise).
  - Seeded 6 ecosystem addons.
  - Seeded dynamic CMS landing page content, 10 corporate designations, and CRM companies & contacts.

[Phase 5: Application Database Integration] ➔ COMPLETED
  - Verified Express API routes against Supabase PostgreSQL.
  - Verified Prisma proxy facade and TenantConnectionManager.
  - Updated backup service with native pg_dump support.

[Phase 6: Security & Multi-Tenant Validation] ➔ COMPLETED
  - Empirically verified tenant isolation (Tenant Alpha vs Tenant Beta).
  - Proved cross-tenant read, write, and delete prevention.

[Phase 7: Environment & Deployment Migration] ➔ COMPLETED
  - Updated server/.env, .env, server/.env.example, and .env.example.

[Phase 8: Legacy Database Removal] ➔ COMPLETED
  - Removed mysql2 package from server/package.json.
  - Cleaned up node_modules and regenerated Prisma Client.

[Phase 9: Testing & Verification] ➔ COMPLETED
  - autoscoping-extension.test.ts (10/10 PASS)
  - tenant-context-pilot.test.ts (12/12 PASS)
  - prisma-proxy-facade.test.ts (12/12 PASS)
  - w1-c1-contacts-crm-isolation.test.ts (8/8 PASS)
  - w1-c2-invoice-details-isolation.test.ts (13/13 PASS)

[Phase 10: Final Documentation & Signoff] ➔ IN PROGRESS
```

---

## 3. Rollback & Contingency Plan
1. **Snapshots**: If required, a full SQL dump can be captured using `server/src/services/backup.service.ts` or `pg_dump`.
2. **Environment Switch**: If an emergency rollback to an external database is needed, updating `DATABASE_URL` in `server/.env` and restarting the server restores the target connection within seconds.
