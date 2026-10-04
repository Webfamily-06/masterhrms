# Legacy Database Reference Report

## 1. Summary of Legacy Database Artifacts
Prior to migration, the workspace contained various legacy configuration references to local MySQL (`localhost:3306`) and aaPanel remote MySQL instances. This report details all locations where legacy references existed and the corrective actions taken.

---

## 2. Configuration & Environment Files

| File | Legacy State | Remediated State |
| :--- | :--- | :--- |
| `server/.env` | `DATABASE_URL="mysql://root@127.0.0.1:3306/master_hrms_dev"` | Configured with Supabase transaction pooler (`6543`) and direct connection (`5432`) |
| `.env` (root) | `DATABASE_URL="mysql://root@127.0.0.1:3306/master_hrms_dev"` | Configured with Supabase transaction pooler (`6543`) and direct connection (`5432`) |
| `server/.env.example` | Template with `mysql://root:password@localhost:3306/master_hrms` | Updated with Supabase PostgreSQL connection strings |
| `.env.example` (root) | Template with `# MySQL Backend API URL` | Updated with Supabase PostgreSQL configuration template |
| `server/package.json` | Contained `"mysql2": "^3.24.2"` dependency | Package removed from dependencies; `npm install` executed |

---

## 3. Schema & Model Dialect Corrections

| Model | Field | Legacy MySQL Definition | Remediated PostgreSQL Definition |
| :--- | :--- | :--- | :--- |
| `MarketplaceAddon` | `longDescription` | `@db.LongText` | `@db.Text` |
| `DocumentSignature` | `signatureDataUrl` | `@db.LongText` | `@db.Text` |
| `EmployeeContract` | `signatureData` | `@db.LongText` | `@db.Text` |
| `schema.prisma` | Datasource | `provider = "mysql"` | `provider = "postgresql"` + `directUrl` |

---

## 4. Backup & Maintenance Services

| Service | Legacy Implementation | Remediated Implementation |
| :--- | :--- | :--- |
| `backup.service.ts` | Invoked `mysqldump` with `.my.cnf` temp file | Dual-engine: detects PostgreSQL and executes `pg_dump --clean --if-exists`, with structured Prisma JSON exporter fallback |
| `verify_db_counts.js` | Header printed "LIVE MYSQL DATABASE RECORD INTEGRITY AUDIT" | Updated to "LIVE SUPABASE POSTGRESQL DATABASE RECORD INTEGRITY AUDIT" |

---

## 5. UI Comments and User-Facing Strings
Historical code comments (e.g. `// Query stored in MySQL Database`) in documentation or UI views remain informative of previous milestones but have no impact on runtime database execution, as all queries route through the unified `apiClient` / `PrismaClient` to Supabase.
