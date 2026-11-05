# MASTERHRMS — ORGANIZATION MASTER DATA DATABASE VERIFICATION
**Supabase PostgreSQL Authoritative Audit**
**Date: 2026-11-05**

---

## 1. Executive Summary

This report delivers the verified findings from the Supabase PostgreSQL database hosting the MASTERHRMS platform. It documents table schemas, exact tenant-scoped record counts, database indexes, constraints, foreign key dependencies, and row-level security (RLS) configuration across `departments`, `designations`, and `branches`.

---

## 2. Verified Database Record Counts by Tenant

The database was queried directly via Prisma Client with read-only operations.

| Table Name | Default Tenant (`tenant-default-001`) | Isolated Test Tenant (`tenant_e2e_a_1791569819098`) | Cross-Tenant Total | Active Records | Inactive Records |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `public.departments` | **5** | **1** | **6** | 6 | 0 |
| `public.designations` | **10** | **0** | **10** | 10 | 0 |
| `public.branches` | **1** | **0** | **1** | 1 | 0 |

### Detailed Baseline Listing:

#### 1. Departments (`tenant-default-001`):
1. `Engineering` (ID: `909b60c2-3b81-43dd-919e-ff51d0e41797`, Branch: `TSV Global Solutions `, Status: `active`)
2. `Human Resources` (ID: `856b3866-baa4-4846-9626-3965cb965d2b`, Branch: `TSV Global Solutions `, Status: `active`)
3. `Finance & Accounting` (ID: `51fae104-bbed-4936-90ce-85494003fe59`, Branch: `TSV Global Solutions `, Status: `active`)
4. `Product & Design` (ID: `8f7f7836-4a42-4ed6-924f-520b92bba337`, Branch: `TSV Global Solutions `, Status: `active`)
5. `Sales & Marketing` (ID: `1edeb656-51ac-43f8-9f13-3db429e15daf`, Branch: `TSV Global Solutions `, Status: `active`)

*Note: The 6th record (`Engineering Test Dept`, ID: `40197a0d-f470-4f28-b0e0-f8599acf1d4d`) belongs to `tenant_e2e_a_1791569819098` and must strictly be hidden from default tenant queries.*

#### 2. Designations (`tenant-default-001`):
1. `Chief Technology Officer` (`0d0cb81f-f074-49f0-a9ea-ca4a7beccb64`)
2. `Senior Full Stack Engineer` (`005b416f-8dbb-4f98-9591-b3ace47f4a72`)
3. `Frontend Developer` (`b42da3f8-bd3f-4ab8-bb25-5ce177c7cf91`)
4. `Backend Developer` (`914fcfd2-4ebf-411a-80b7-51b371b603cd`)
5. `DevOps Architect` (`51ae0f82-b996-4a17-92a1-b648307a4e3e`)
6. `Product Manager` (`f82db22a-7740-43ea-a9a4-e7ff5616c06b`)
7. `HR Operations Director` (`9535951a-54ab-4253-b316-701df324d0c0`)
8. `Financial Controller` (`1b2075b7-e271-4505-b603-a127f57b1743`)
9. `Sales Account Executive` (`e6a997a1-6884-4c3b-add6-c06608ea08e1`)
10. `QA Automation Lead` (`e4f143b5-4f00-4451-84c8-cabb2da53da7`)

#### 3. Branches (`tenant-default-001`):
1. `TSV Global Solutions ` (Code: `CHN`, ID: `19ff6702-2a04-4202-af8d-72153a02fb45`, Status: `active`)

---

## 3. Physical Schema, Indexes & Constraints

Inspected via PostgreSQL system catalogs (`pg_class`, `pg_indexes`, `information_schema.table_constraints`):

### A. Indexes
- **`branches`**:
  - `branches_pkey` (UNIQUE, `id`)
  - `branches_tenant_id_idx` (`tenant_id`)
- **`departments`**:
  - `departments_pkey` (UNIQUE, `id`)
- **`designations`**:
  - `designations_pkey` (UNIQUE, `id`)
  - `designations_tenant_id_idx` (`tenant_id`)

### B. Foreign Keys & Integrity Constraints
- `departments.tenant_id` -> `tenants.id` (ON DELETE CASCADE)
- `departments.branch_id` -> `branches.id` (NO ACTION / RESTRICT)
- `designations.tenant_id` -> `tenants.id` (ON DELETE CASCADE)
- `designations.department_id` -> `departments.id` (NO ACTION / RESTRICT)
- `branches.tenant_id` -> `tenants.id` (ON DELETE CASCADE)

### C. Active Downstream Dependencies (Employee References)
- `departments.id = '909b60c2-3b81-43dd-919e-ff51d0e41797'` has **2 active employees**.
- `designations.id = '005b416f-8dbb-4f98-9591-b3ace47f4a72'` has **1 active employee**.
- `designations.id = 'e4f143b5-4f00-4451-84c8-cabb2da53da7'` has **1 active employee**.
- `branches.id = '19ff6702-2a04-4202-af8d-72153a02fb45'` has **2 active employees** and **5 active departments**.

---

## 4. Row-Level Security (RLS) vs Application-Level Isolation

- **Database RLS Flag**: `relrowsecurity = false` on all three tables.
- **Architectural Analysis**:
  1. The browser NEVER communicates directly with Supabase via Supabase client SDK or service-role keys.
  2. All data access is mediated by the Express API server via `requireAuth` and `resolveTenantContext` middleware.
  3. The server resolves the authenticated user's `tenantId` from cryptographically verified session JWTs and injects `where: { tenantId }` into all Prisma queries.
  4. Cross-tenant isolation is strictly enforced at the application/API layer. Enabling database RLS without migrating connection pooling to user-session JWTs would break connection poolers and server transactions. Therefore, maintaining application-level tenant isolation is the safe and intended architecture.

---

## 5. Deletion vs Archive Strategy

Because active employees and departments have foreign keys referencing these master records:
- Hard deletion throws foreign key constraint violations (`P2003: Foreign key constraint failed`).
- Hard deletion would orphan employee organizational data.
- **Authoritative Resolution**: The system provides an **Archive / Deactivate** action that updates `status` to `"inactive"`. If a hard delete is explicitly requested on an unreferenced record, it may proceed; if the record is referenced by employees or departments, the system blocks deletion and prompts the user to archive the record instead.

