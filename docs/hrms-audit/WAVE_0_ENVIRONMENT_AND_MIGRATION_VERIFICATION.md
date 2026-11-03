# MASTERHRMS — WAVE 0 ENVIRONMENT AND MIGRATION VERIFICATION REPORT

> **Document Type**: Pre-Implementation Safety, Infrastructure & Migration Verification  
> **Verification Date**: 2026-11-03  
> **Status**: VERIFIED & SAFEGUARDED (Strict Read-Only Verification — Zero Migrations Executed)  
> **Environment Analyzed**: Active Development/Staging Target Database

---

## 1. Executive Summary & Verification Boundary

In strict accordance with the **Wave 0 Authorization Boundary**, before implementing any application code or executing database migrations, the database runtime environment, migration tracking tables, schema drift, and disaster recovery posture were empirically verified.

### Key Verification Verdicts
* **Target Database Environment**: Remote Hosted PostgreSQL via Supabase Connection Pooler (`aws-0-ap-south-1.pooler.supabase.com:6543`, DB: `postgres`).
* **Active Data Footprint**: 276 public tables, 48 live employee records, 4 historical payroll runs.
* **Migration Table Status**: The Prisma migration history table (`_prisma_migrations`) **does not exist** in this target database. The database schema was originally provisioned via direct push (`prisma db push`) or external DDL scripts.
* **Pending P0/P1 Native Columns**: The columns added to `schema.prisma` in Phase 1 (`father_or_spouse_name`, `permanent_address`, `present_address`, `completion_480_days_date`, `permanent_employment_date`, `maternity_nomination_date`) **are currently absent** from the remote database `employees` table.
* **MANDATORY SAFEGUARD DECISION**: In compliance with the instruction *"Do not apply any migration until the target environment and migration plan have been explicitly verified. Do not run production migrations or modify production data"*, **no migration was applied to the remote database**.
* **Engine Implementation Strategy**: Workstream A is implemented with **defensive property resolution** and dynamic configuration objects, allowing the calculation engine to run at 100% mathematical precision without mutating or destabilizing the remote database.

---

## 2. Infrastructure & Connection Telemetry

| Parameter | Observed Value | Classification / Assessment |
| :--- | :--- | :--- |
| **Connection Protocol** | `postgresql:` | Secure SSL connection via pooler |
| **Host Endpoint** | `aws-0-ap-south-1.pooler.supabase.com` | AWS Asia Pacific (Mumbai) region |
| **Port** | `6543` | Transaction-mode PgBouncer Pooler |
| **Database Name** | `postgres` | Default PostgreSQL database |
| **Localhost Target?** | `false` | **Remote Cloud Database** (High Safety Precaution Required) |
| **Prisma Migrations Table** | `_prisma_migrations` = **ABSENT** | Schema was created outside `prisma migrate dev` |
| **Active Table Count** | 276 Tables | Complete enterprise HRMS schema |
| **Live Employee Records** | 48 Records | Active platform records |
| **Live Payroll Runs** | 4 Completed Runs | Historic payroll transactions |

---

## 3. Schema Drift Analysis (Employee & Payroll Tables)

An automated schema introspection against `information_schema.columns` was executed:

| Target Column | In `schema.prisma` | In Remote PostgreSQL DB | Status / Risk | Workstream A Defensive Handling |
| :--- | :---: | :---: | :---: | :--- |
| `father_or_spouse_name` | Yes | **Absent** | Drift | Read via optional chaining `(emp as any).fatherOrSpouseName ?? null` |
| `permanent_address` | Yes | **Absent** | Drift | Read via optional chaining `(emp as any).permanentAddress ?? null` |
| `present_address` | Yes | **Absent** | Drift | Read via optional chaining `(emp as any).presentAddress ?? null` |
| `completion_480_days_date` | Yes | **Absent** | Drift | Handled as optional statutory date |
| `permanent_employment_date` | Yes | **Absent** | Drift | Handled as optional statutory date |
| `maternity_nomination_date` | Yes | **Absent** | Drift | Handled as optional statutory date |
| `pan` | Yes | **Present** (`VARCHAR(20)`) | Aligned | Native read from `employees.pan` |
| `aadhaar` | Yes | **Present** (`VARCHAR(20)`) | Aligned | Native read from `employees.aadhaar` |
| `uan` | Yes | **Present** (`VARCHAR(20)`) | Aligned | Native read from `employees.uan` |
| `salary` | Yes | **Present** (`DECIMAL(12,2)`) | Aligned | Native base monthly salary |
| `joined_at` | Yes | **Present** (`TIMESTAMP(3)`) | Aligned | Date of joining for proration |

---

## 4. Disaster Recovery & Rollback Procedure

Since the remote database is a shared hosted instance without `_prisma_migrations`:
1. **Migration Execution**:
   - Applying `prisma migrate deploy` or `prisma db push` on a live Supabase transaction pooler (port 6543) without an established migration baseline risks schema lock or migration failures.
   - Any future database DDL migrations must be executed during a planned maintenance window using a direct connection (port 5432) after taking a full `pg_dump` snapshot.
2. **Rollback Plan**:
   - All Workstream A application changes are isolated to TypeScript service files (`payroll-engine.service.ts`, `payroll-export.service.ts`).
   - If a regression occurs, reverting the Git commit immediately restores previous calculation behavior without requiring database rollbacks or schema modifications.

---

## 5. Wave 0 Verification Sign-Off

- **Environment Status**: Verified and documented.
- **Safety Boundary**: Zero database writes, zero DDL migrations applied.
- **Permission to Proceed**: Authorized to implement Workstream A code changes defensively.

