/**
 * MASTERHRMS — Phase F1 Database Migration Runner
 * 
 * Non-destructive extension of canonical MediaFile table
 * and creation of normalized FileStar & FileShare tables.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require(path.join(__dirname, "../server/node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function runMigration() {
  console.log("\n========================================================");
  console.log(" MASTERHRMS FILE MANAGER — PHASE F1 SCHEMA MIGRATION");
  console.log("========================================================\n");

  // Step 1: Pre-migration verification
  const preMediaCount = await prisma.mediaFile.count();
  const preUsageCount = await prisma.mediaUsage.count();
  console.log(`[PRE-CHECK] Existing MediaFile records: ${preMediaCount}`);
  console.log(`[PRE-CHECK] Existing MediaUsage records: ${preUsageCount}`);

  if (preMediaCount !== 149) {
    console.warn(`[WARNING] Expected 149 records, found ${preMediaCount}. Proceeding cautiously.`);
  }

  // Step 2: Apply idempotent SQL
  console.log("\n[MIGRATION] Applying non-destructive DDL statements...");

  const statements = [
    `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36);`,
    `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS is_folder BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Documents';`,
    `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS original_folder VARCHAR(100);`,
    `DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_files_parent') THEN
         ALTER TABLE media_files ADD CONSTRAINT fk_media_files_parent FOREIGN KEY (parent_id) REFERENCES media_files(id) ON DELETE CASCADE;
       END IF;
     END $$;`,
    `CREATE INDEX IF NOT EXISTS idx_media_files_tenant_parent ON media_files(tenant_id, parent_id);`,
    `CREATE INDEX IF NOT EXISTS idx_media_files_tenant_is_folder ON media_files(tenant_id, is_folder);`,
    `CREATE TABLE IF NOT EXISTS file_stars (
       id VARCHAR(36) PRIMARY KEY,
       file_id VARCHAR(36) NOT NULL,
       user_id VARCHAR(36) NOT NULL,
       tenant_id VARCHAR(36),
       created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT fk_file_stars_file FOREIGN KEY (file_id) REFERENCES media_files(id) ON DELETE CASCADE,
       CONSTRAINT uq_file_stars_file_user UNIQUE (file_id, user_id)
     );`,
    `CREATE INDEX IF NOT EXISTS idx_file_stars_user_tenant ON file_stars(user_id, tenant_id);`,
    `CREATE TABLE IF NOT EXISTS file_shares (
       id VARCHAR(36) PRIMARY KEY,
       file_id VARCHAR(36) NOT NULL,
       tenant_id VARCHAR(36),
       shared_with VARCHAR(36),
       shared_role VARCHAR(50),
       access_level VARCHAR(20) NOT NULL DEFAULT 'view',
       shared_by VARCHAR(36) NOT NULL,
       expires_at TIMESTAMP(3),
       revoked_at TIMESTAMP(3),
       created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT fk_file_shares_file FOREIGN KEY (file_id) REFERENCES media_files(id) ON DELETE CASCADE
     );`,
    `CREATE INDEX IF NOT EXISTS idx_file_shares_file_recipient ON file_shares(file_id, shared_with);`,
    `CREATE INDEX IF NOT EXISTS idx_file_shares_tenant_recipient ON file_shares(tenant_id, shared_with);`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    await prisma.$executeRawUnsafe(stmt);
    console.log(`  ✔ Step ${i + 1}/${statements.length} executed successfully.`);
  }

  // Step 3: Backfill category for existing files based on MIME types
  console.log("\n[BACKFILL] Backfilling categories for existing records...");
  await prisma.$executeRawUnsafe(`
    UPDATE media_files
    SET category = CASE
      WHEN mime_type LIKE 'image/%' THEN 'Images'
      WHEN mime_type LIKE 'audio/%' THEN 'Audio'
      WHEN mime_type LIKE 'video/%' THEN 'Videos'
      WHEN mime_type = 'application/pdf' THEN 'Documents'
      WHEN mime_type LIKE '%word%' OR mime_type LIKE '%document%' THEN 'Documents'
      WHEN mime_type LIKE '%excel%' OR mime_type LIKE '%spreadsheet%' THEN 'Documents'
      WHEN mime_type LIKE '%zip%' OR mime_type LIKE '%tar%' THEN 'Archives'
      ELSE 'Documents'
    END
    WHERE category = 'Documents' AND (mime_type LIKE 'image/%' OR mime_type LIKE 'audio/%' OR mime_type LIKE 'video/%');
  `);

  // Step 4: Post-migration integrity verification
  const postMediaCount = await prisma.mediaFile.count();
  const postUsageCount = await prisma.mediaUsage.count();
  console.log(`\n[POST-CHECK] MediaFile records after migration: ${postMediaCount} (Must be exactly ${preMediaCount})`);
  console.log(`[POST-CHECK] MediaUsage records after migration: ${postUsageCount} (Must be exactly ${preUsageCount})`);

  if (postMediaCount !== preMediaCount || postUsageCount !== preUsageCount) {
    throw new Error(`Integrity check failed! Record count changed from ${preMediaCount} to ${postMediaCount}`);
  }

  console.log("\n✔ Migration completed successfully with 100% data preservation!\n");
}

runMigration()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

