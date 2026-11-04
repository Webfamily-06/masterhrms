const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readFile(p) {
  return fs.readFileSync(path.resolve(p), 'utf8');
}

function getSha256(p) {
  const buf = fs.readFileSync(path.resolve(p));
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function extractModel(modelName) {
  const schema = readFile('server/prisma/schema.prisma');
  const reg = new RegExp('model ' + modelName + ' \\{([\\s\\S]*?)\\n\\}');
  const match = schema.match(reg);
  return match ? match[0] : 'Model ' + modelName + ' not found';
}

function buildBundle() {
  console.log('Generating PHASE4B6_SOURCE_EVIDENCE_BUNDLE.md...');

  let doc = `# MASTERHRMS — PHASE 4B.6
# COMPLETE SOURCE CODE & AUDIT EVIDENCE BUNDLE FOR INDEPENDENT REVIEW

**Document Reference:** \`docs/hrms-audit/PHASE4B6_SOURCE_EVIDENCE_BUNDLE.md\`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** \`Webfamily-06/masterhrms\`  
**Baseline HEAD Commit:** \`9e8749bfe0275f4bf684d23edf3763fd1e9c74c0\`  
**Target Platform:** Supabase Managed PostgreSQL 17 (\`aws-0-ap-south-1.pooler.supabase.com\`, project \`ofzbhbcnizyegroggkxl\`)  
**Package Scope:** Complete source code of migrations, test harnesses, schema models, and Phase 4B.5.4 audit reports.  
**Notice:** COMPILED STRICTLY FOR INDEPENDENT EXTERNAL REVIEW. DOES NOT AUTHORIZE PRODUCTION EXECUTION.

---

## TABLE OF CONTENTS
1. [Prisma Schema Excerpts & Migration SQL Mappings](#1-prisma-schema-excerpts--migration-sql-mappings)
   - 1.1 DeviceSession Model & Migration 8
   - 1.2 Branch Model & Migration 9
   - 1.3 Employee Model & 17-Column Schema DDL
   - 1.4 LeaveRequest Model & Days Numeric DDL
   - 1.5 JournalEntry Model & Partial Index DDL
   - 1.6 LoanInstallment Model & Partial Index DDL
2. [Complete Migration SQL Files](#2-complete-migration-sql-files)
   - 2.1 Migration 8: \`20261102000000_add_device_sessions/migration.sql\`
   - 2.2 Migration 9: \`20261103000002_add_branch_geofencing/migration.sql\`
   - 2.3 Migration 10: \`20261104100000_aud_conc_002_idempotency_constraints/migration.sql\`
3. [Complete Verification Scripts](#3-complete-verification-scripts)
   - 3.1 \`scripts/pg17_container_certification.cjs\`
   - 3.2 \`scripts/verify_migrations_1_7.cjs\`
4. [Complete Phase 4B.5.4 Audit Documents](#4-complete-phase-4b54-audit-documents)
   - 4.1 \`PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md\`
   - 4.2 \`PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md\`
   - 4.3 \`PHASE4B5_4_PRISMA_BASELINE_MATRIX.md\`
   - 4.4 \`PHASE4B5_4_DATABASE_PR_MANIFEST.md\`
   - 4.5 \`PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md\`
   - 4.6 \`PHASE4B5_4_FINAL_GATE_REPORT.md\`

---

## 1. Prisma Schema Excerpts & Migration SQL Mappings

### 1.1 DeviceSession Model & Migration 8

#### Prisma Model Definition (\`server/prisma/schema.prisma\`):
\`\`\`prisma
${extractModel('DeviceSession')}
\`\`\`

#### Corresponding PostgreSQL 17 Migration SQL (\`server/prisma/migrations/20261102000000_add_device_sessions/migration.sql\`):
\`\`\`sql
${readFile('server/prisma/migrations/20261102000000_add_device_sessions/migration.sql')}
\`\`\`

---

### 1.2 Branch Model & Migration 9

#### Prisma Model Definition (\`server/prisma/schema.prisma\`):
\`\`\`prisma
${extractModel('Branch')}
\`\`\`

#### Corresponding PostgreSQL 17 Migration SQL (\`server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql\`):
\`\`\`sql
${readFile('server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql')}
\`\`\`

---

### 1.3 Employee Model & 17-Column Schema DDL

#### Prisma Model Definition (\`server/prisma/schema.prisma\`):
\`\`\`prisma
${extractModel('Employee')}
\`\`\`

#### Corresponding PostgreSQL 17 Atomic DDL Statement:
\`\`\`sql
-- Atomic addition of 17 lifecycle and statutory columns
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS father_or_spouse_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS worker_age_classification VARCHAR(20) NOT NULL DEFAULT 'Adult',
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS present_address TEXT,
  ADD COLUMN IF NOT EXISTS permanent_address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
  ADD COLUMN IF NOT EXISTS permanent_employment_date DATE,
  ADD COLUMN IF NOT EXISTS completion_480_days_date DATE,
  ADD COLUMN IF NOT EXISTS maternity_nomination_date DATE;
\`\`\`

---

### 1.4 LeaveRequest Model & Days Numeric DDL

#### Prisma Model Definition (\`server/prisma/schema.prisma\`):
\`\`\`prisma
${extractModel('LeaveRequest')}
\`\`\`

#### Corresponding PostgreSQL 17 Decimal Conversion DDL:
\`\`\`sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
ALTER TABLE leave_requests ALTER COLUMN days TYPE NUMERIC(4, 1) USING days::NUMERIC(4, 1);
ALTER TABLE leave_requests ALTER COLUMN days SET DEFAULT 1.0;
\`\`\`

---

### 1.5 JournalEntry Model & Partial Index DDL

#### Prisma Model Definition (\`server/prisma/schema.prisma\`):
\`\`\`prisma
${extractModel('JournalEntry')}
\`\`\`

#### Corresponding PostgreSQL 17 Partial Unique Index DDL:
\`\`\`sql
CREATE UNIQUE INDEX IF NOT EXISTS "uq_journal_entries_tenant_payroll_run"
ON "journal_entries" ("tenant_id", "reference")
WHERE "reference" IS NOT NULL AND "reference_type" = 'payroll';
\`\`\`

---

### 1.6 LoanInstallment Model & Partial Index DDL

#### Prisma Model Definition (\`server/prisma/schema.prisma\`):
\`\`\`prisma
${extractModel('LoanInstallment')}
\`\`\`

#### Corresponding PostgreSQL 17 Partial Unique Index DDL:
\`\`\`sql
CREATE UNIQUE INDEX IF NOT EXISTS "uq_loan_installments_loan_payroll_run"
ON "loan_installments" ("loan_id", "payroll_run_id")
WHERE "payroll_run_id" IS NOT NULL;
\`\`\`

---

## 2. Complete Migration SQL Files

### 2.1 Migration 8: \`server/prisma/migrations/20261102000000_add_device_sessions/migration.sql\`
- **SHA-256 Checksum:** \`${getSha256('server/prisma/migrations/20261102000000_add_device_sessions/migration.sql')}\`
- **File Contents:**
\`\`\`sql
${readFile('server/prisma/migrations/20261102000000_add_device_sessions/migration.sql')}
\`\`\`

---

### 2.2 Migration 9: \`server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql\`
- **SHA-256 Checksum:** \`${getSha256('server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql')}\`
- **File Contents:**
\`\`\`sql
${readFile('server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql')}
\`\`\`

---

### 2.3 Migration 10: \`server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql\`
- **SHA-256 Checksum:** \`${getSha256('server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql')}\`
- **File Contents:**
\`\`\`sql
${readFile('server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql')}
\`\`\`

---

## 3. Complete Verification Scripts

### 3.1 \`scripts/pg17_container_certification.cjs\`
- **SHA-256 Checksum:** \`${getSha256('scripts/pg17_container_certification.cjs')}\`
- **File Contents:**
\`\`\`javascript
${readFile('scripts/pg17_container_certification.cjs')}
\`\`\`

---

### 3.2 \`scripts/verify_migrations_1_7.cjs\`
- **SHA-256 Checksum:** \`${getSha256('scripts/verify_migrations_1_7.cjs')}\`
- **File Contents:**
\`\`\`javascript
${readFile('scripts/verify_migrations_1_7.cjs')}
\`\`\`

---

## 4. Complete Phase 4B.5.4 Audit Documents

### 4.1 \`docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md\`
- **SHA-256 Checksum:** \`${getSha256('docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md')}\`

${readFile('docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md')}

---

### 4.2 \`docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md\`
- **SHA-256 Checksum:** \`${getSha256('docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md')}\`

${readFile('docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md')}

---

### 4.3 \`docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md\`
- **SHA-256 Checksum:** \`${getSha256('docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md')}\`

${readFile('docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md')}

---

### 4.4 \`docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md\`
- **SHA-256 Checksum:** \`${getSha256('docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md')}\`

${readFile('docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md')}

---

### 4.5 \`docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md\`
- **SHA-256 Checksum:** \`${getSha256('docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md')}\`

${readFile('docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md')}

---

### 4.6 \`docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md\`
- **SHA-256 Checksum:** \`${getSha256('docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md')}\`

${readFile('docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md')}
`;

  const outputPath = path.resolve('docs/hrms-audit/PHASE4B6_SOURCE_EVIDENCE_BUNDLE.md');
  fs.writeFileSync(outputPath, doc, 'utf8');
  console.log('Successfully generated ' + outputPath + ' (' + doc.length + ' bytes)');
}

buildBundle();

