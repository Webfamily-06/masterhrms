# Supabase Migration Audit: Master HRMS / ERP

## 1. Executive Summary
This document provides a comprehensive audit of the database infrastructure across the Master HRMS / ERP platform prior to and during migration from legacy MySQL to **Supabase PostgreSQL**.

- **Target Database**: Supabase PostgreSQL (AWS `ap-south-1`)
- **Connection Mode**: 
  - Transaction Pooler (Port 6543, IPv4-only, PgBouncer transaction mode): `DATABASE_URL`
  - Session Pooler / Direct Connection (Port 5432, direct session mode for migrations and DDL): `DIRECT_URL`
- **ORM / Client**: Prisma ORM 5.22.0 (`@prisma/client`) with dynamic multi-tenant proxy facade (`TenantConnectionManager` + `tenant-isolation.extension`)
- **Isolation Model**: Multi-tenant single-schema isolation with strict `tenant_id` scoping enforced at the Prisma Client extension layer + support for dedicated tenant database routing.

---

## 2. Workspace Database Footprint

| Layer | Component | Status / Location | Details |
| :--- | :--- | :--- | :--- |
| **Backend API** | Node.js Express Server | `server/src/` | Express 4.19.2, TypeScript 5.5.2 |
| **ORM Client** | Prisma Client | `server/src/prisma.ts` | Dynamically wrapped with `prismaProxy` |
| **Datasource Definition** | Prisma Schema | `server/prisma/schema.prisma` | 3,956 lines, 161 models, 0 raw MySQL types |
| **Frontend Web App** | TanStack Start (React 19) | `src/` | Client-side and SSR data fetchers via REST API (`/api/*`) |
| **Storage / OCR** | Local & S3 Storage + Tesseract | `server/storage/`, `server/src/services/ocr/` | StoredDocument metadata in PostgreSQL |
| **Backups** | Native Backup Service | `server/src/services/backup.service.ts` | Dual-engine: `pg_dump` with Prisma JSON table fallback |
| **Seed Infrastructure** | Seed Scripts | `server/scripts/seed.js`, `server/prisma/seed-dynamic-data.ts` | Automated tenant, super admin, HR, staff, plans & CRM seeding |

---

## 3. Database Driver & Package Audit

1. **`mysql2`**:
   - Previously declared in `server/package.json` (`^3.24.2`).
   - Audit found 0 application imports in `server/src/`.
   - **Action**: Completely uninstalled and removed from `server/package.json` and `server/package-lock.json`.
2. **`@prisma/client`**:
   - Version `5.22.0`.
   - Configured with `provider = "postgresql"`, `url = env("DATABASE_URL")`, and `directUrl = env("DIRECT_URL")`.
   - Generates native PostgreSQL client binary for Darwin ARM64, Windows, and Linux.

---

## 4. Schema Conversion Audit

### MySQL to PostgreSQL Dialect Adaptations
1. **Datasource Provider**:
   - Old: `provider = "mysql"`
   - New: `provider = "postgresql"` with `directUrl = env("DIRECT_URL")`.
2. **Unsupported Text Types**:
   - `longDescription` in `MarketplaceAddon`: Converted from `@db.LongText` to `@db.Text`.
   - `signatureDataUrl` in `DocumentSignature`: Converted from `@db.LongText` to `@db.Text`.
   - `signatureData` in `EmployeeContract`: Converted from `@db.LongText` to `@db.Text`.
3. **Primary Keys & Defaults**:
   - All models use UUID primary keys (`@default(uuid()) @db.VarChar(36)`), eliminating MySQL auto-increment dependency.
4. **Timestamps & Dates**:
   - Converted `DATETIME(3)` and `NOW(3)` to standard PostgreSQL `DateTime @default(now())` with millisecond precision.

---

## 5. Security & Multi-Tenancy Architecture
- **Tenant Context Injection**: `resolveTenantContext` middleware attaches tenant metadata to `AsyncLocalStorage` (`tenantStorage`).
- **Autoscoping Engine**: `tenant-isolation.extension.ts` automatically injects `tenantId` into every `findMany`, `findFirst`, `findUnique`, `update`, `delete`, and `create` call.
- **Fail-Closed Guarantee**: Any attempt to access a tenant-scoped model without an active tenant context throws a `403 TenantContextRequiredError`.
- **Global Models**: System-wide models (`User`, `SubscriptionPlan`, `Addon`, `CmsPage`) are explicitly routed to global access without tenantId injection.

---

## 6. Audit Verdict
The workspace architecture is completely decoupled from MySQL engine internals. The query layer exclusively uses Prisma ORM without raw MySQL queries, making Supabase PostgreSQL migration 100% clean, non-destructive, and verified.
