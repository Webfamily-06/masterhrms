/**
 * MASTERHRMS — Phase F6 Database Migration Runner
 * 
 * Non-destructive additions:
 * - Scan and quarantine columns on media_files
 * - document_annotations table
 * - document_annotation_replies table
 * - file_scan_jobs table
 * - dlp_policies table
 * - dlp_findings table
 * - external_storage_connections table
 * - external_sync_conflicts table
 * - archive_jobs table
 * - webdav_tokens table
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require(path.join(__dirname, "../server/node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function runMigration() {
  console.log("\n========================================================");
  console.log(" MASTERHRMS FILE MANAGER — PHASE F6 SCHEMA MIGRATION");
  console.log("========================================================\n");

  try {
    console.log("[MIGRATION] Applying non-destructive DDL statements...");

    const ddl = [
      // 1. media_files extensions
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS scan_status VARCHAR(30) NOT NULL DEFAULT 'CLEAN';`,
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS scan_engine VARCHAR(50);`,
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMP WITH TIME ZONE;`,
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMP WITH TIME ZONE;`,
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;`,
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS quarantine_released_by VARCHAR(36);`,
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS quarantine_released_at TIMESTAMP WITH TIME ZONE;`,
      `CREATE INDEX IF NOT EXISTS idx_media_files_scan_status ON media_files(tenant_id, scan_status);`,

      // 2. document_annotations
      `CREATE TABLE IF NOT EXISTS document_annotations (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        file_id VARCHAR(36) NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        file_version INT NOT NULL DEFAULT 1,
        page_number INT NOT NULL DEFAULT 1,
        coordinates JSONB NOT NULL,
        content TEXT NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT '#FFEB3B',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_doc_annot_file ON document_annotations(tenant_id, file_id, file_version);`,
      `CREATE INDEX IF NOT EXISTS idx_doc_annot_author ON document_annotations(tenant_id, created_by);`,

      // 3. document_annotation_replies
      `CREATE TABLE IF NOT EXISTS document_annotation_replies (
        id VARCHAR(36) PRIMARY KEY,
        annotation_id VARCHAR(36) NOT NULL REFERENCES document_annotations(id) ON DELETE CASCADE,
        tenant_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_doc_annot_replies_annot ON document_annotation_replies(annotation_id);`,
      `CREATE INDEX IF NOT EXISTS idx_doc_annot_replies_user ON document_annotation_replies(tenant_id, user_id);`,

      // 4. file_scan_jobs
      `CREATE TABLE IF NOT EXISTS file_scan_jobs (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        file_id VARCHAR(36) NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        engine VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        result VARCHAR(30),
        threat_name VARCHAR(255),
        details JSONB,
        attempts INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_file_scan_jobs_file ON file_scan_jobs(tenant_id, file_id);`,
      `CREATE INDEX IF NOT EXISTS idx_file_scan_jobs_status ON file_scan_jobs(tenant_id, status);`,

      // 5. dlp_policies
      `CREATE TABLE IF NOT EXISTS dlp_policies (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        policy_type VARCHAR(50) NOT NULL,
        pattern TEXT,
        severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
        action VARCHAR(30) NOT NULL DEFAULT 'BLOCK',
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_dlp_policies_tenant ON dlp_policies(tenant_id, is_enabled);`,

      // 6. dlp_findings
      `CREATE TABLE IF NOT EXISTS dlp_findings (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        file_id VARCHAR(36) NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        policy_id VARCHAR(36) NOT NULL REFERENCES dlp_policies(id) ON DELETE CASCADE,
        finding_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        redacted_match TEXT NOT NULL,
        location VARCHAR(100),
        action_taken VARCHAR(30) NOT NULL,
        reviewed_by VARCHAR(36),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_dlp_findings_file ON dlp_findings(tenant_id, file_id);`,
      `CREATE INDEX IF NOT EXISTS idx_dlp_findings_status ON dlp_findings(tenant_id, status);`,
      `CREATE INDEX IF NOT EXISTS idx_dlp_findings_sev ON dlp_findings(tenant_id, severity);`,

      // 7. external_storage_connections
      `CREATE TABLE IF NOT EXISTS external_storage_connections (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        connection_name VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED',
        encrypted_access_token TEXT NOT NULL,
        encrypted_refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        account_email VARCHAR(255),
        account_id VARCHAR(255),
        remote_root_folder_id VARCHAR(255),
        local_folder_id VARCHAR(36),
        sync_mode VARCHAR(30) NOT NULL DEFAULT 'BIDIRECTIONAL',
        last_synced_at TIMESTAMP WITH TIME ZONE,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_ext_conn_prov ON external_storage_connections(tenant_id, provider);`,
      `CREATE INDEX IF NOT EXISTS idx_ext_conn_status ON external_storage_connections(tenant_id, status);`,

      // 8. external_sync_conflicts
      `CREATE TABLE IF NOT EXISTS external_sync_conflicts (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        connection_id VARCHAR(36) NOT NULL REFERENCES external_storage_connections(id) ON DELETE CASCADE,
        file_id VARCHAR(36) REFERENCES media_files(id) ON DELETE SET NULL,
        remote_item_id VARCHAR(255) NOT NULL,
        remote_item_name VARCHAR(255) NOT NULL,
        conflict_type VARCHAR(50) NOT NULL,
        resolution VARCHAR(30) NOT NULL DEFAULT 'UNRESOLVED',
        resolved_by VARCHAR(36),
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_sync_conflicts_conn ON external_sync_conflicts(tenant_id, connection_id);`,
      `CREATE INDEX IF NOT EXISTS idx_sync_conflicts_res ON external_sync_conflicts(tenant_id, resolution);`,

      // 9. archive_jobs
      `CREATE TABLE IF NOT EXISTS archive_jobs (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
        file_count INT NOT NULL DEFAULT 0,
        total_bytes BIGINT NOT NULL DEFAULT 0,
        download_token VARCHAR(64) UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_archive_jobs_user ON archive_jobs(tenant_id, user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_archive_jobs_token ON archive_jobs(download_token);`,

      // 10. webdav_tokens
      `CREATE TABLE IF NOT EXISTS webdav_tokens (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        token_name VARCHAR(100) NOT NULL,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        prefix VARCHAR(10) NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_webdav_tokens_user ON webdav_tokens(tenant_id, user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_webdav_tokens_hash ON webdav_tokens(token_hash);`
    ];

    for (const sql of ddl) {
      await prisma.$executeRawUnsafe(sql);
      const firstLine = sql.trim().split("\n")[0];
      console.log(`  ✓ ${firstLine}`);
    }

    // Step 2: Seed initial default DLP Policies if not present
    console.log("\n[SEED] Checking default tenant DLP policies...");
    const sampleTenants = await prisma.$queryRawUnsafe(`SELECT id FROM tenants LIMIT 1`);
    const sampleTenant = sampleTenants[0];
    if (sampleTenant) {
      const defaultPolicies = [
        {
          name: "Credit Card Data Protection",
          description: "Detects Visa, Mastercard, AMEX numbers using regex and Luhn validation",
          policyType: "PII_CREDIT_CARD",
          pattern: `\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b`,
          severity: "CRITICAL",
          action: "BLOCK",
        },
        {
          name: "Tax & National ID Protection",
          description: "Detects standard SSN / National Tax Identifier formats",
          policyType: "PII_SSN",
          pattern: `\\b\\d{3}-\\d{2}-\\d{4}\\b`,
          severity: "HIGH",
          action: "WARN",
        },
        {
          name: "Bulk Email Address Disclosure",
          description: "Detects unencrypted employee or customer email addresses in files",
          policyType: "PII_EMAIL",
          pattern: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}`,
          severity: "MEDIUM",
          action: "LOG",
        },
        {
          name: "Phone Number Disclosure",
          description: "Detects international and domestic phone number patterns",
          policyType: "PII_PHONE",
          pattern: `\\b(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b`,
          severity: "LOW",
          action: "LOG",
        }
      ];

      for (const pol of defaultPolicies) {
        const countRes = await prisma.$queryRawUnsafe(
          `SELECT count(*) FROM dlp_policies WHERE tenant_id = $1 AND policy_type = $2`,
          sampleTenant.id, pol.policyType
        );
        const count = parseInt(countRes[0]?.count || "0", 10);
        if (count === 0) {
          const { randomUUID } = require("crypto");
          await prisma.$executeRawUnsafe(
            `INSERT INTO dlp_policies (id, tenant_id, name, description, policy_type, pattern, severity, action, is_enabled, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            randomUUID(), sampleTenant.id, pol.name, pol.description, pol.policyType, pol.pattern, pol.severity, pol.action
          );
          console.log(`  + Seeded default policy: ${pol.name}`);
        }
      }
    }

    console.log("\n========================================================");
    console.log(" PHASE F6 DATABASE SCHEMA MIGRATION COMPLETED SUCCESSFULLY");
    console.log("========================================================\n");
  } catch (err) {
    console.error("[MIGRATION ERROR]", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
