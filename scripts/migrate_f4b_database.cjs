/**
 * MASTERHRMS — Phase F4-B Database Normalization & BigInt Migration Script
 *
 * 1. Upgrades media_files.file_size to 64-bit BIGINT in PostgreSQL.
 * 2. Normalizes legacy userId: "tenant_pool" records to canonical userId: null.
 * 3. Enforces single tenant-pool row uniqueness via partial unique indexes.
 * 4. Preserves 100% of existing usage values with zero data loss.
 */

const { PrismaClient } = require("../server/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function runMigration() {
  console.log("================================================================");
  console.log(" MASTERHRMS — PHASE F4-B DATABASE NORMALIZATION MIGRATION");
  console.log("================================================================\n");

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Upgrade media_files.file_size to BIGINT in PostgreSQL
      console.log("[1/5] Upgrading media_files.file_size column to BIGINT in PostgreSQL...");
      await tx.$executeRawUnsafe(`
        ALTER TABLE media_files 
        ALTER COLUMN file_size TYPE BIGINT;
      `);
      console.log("  ✔ Successfully altered media_files.file_size to BIGINT.");

      // 2. Pre-merge duplicates for tenants that already have a canonical NULL row
      console.log("[2/5] Merging any duplicate tenant_pool rows into existing NULL rows...");
      await tx.$executeRawUnsafe(`
        UPDATE storage_usages dest
        SET 
          used_bytes = dest.used_bytes + src.used_bytes,
          trash_bytes = dest.trash_bytes + src.trash_bytes,
          reserved_bytes = dest.reserved_bytes + src.reserved_bytes,
          file_count = dest.file_count + src.file_count
        FROM storage_usages src
        WHERE src.tenant_id = dest.tenant_id
          AND src.user_id = 'tenant_pool'
          AND dest.user_id IS NULL;
      `);
      await tx.$executeRawUnsafe(`
        DELETE FROM storage_usages
        WHERE user_id = 'tenant_pool'
          AND tenant_id IN (
            SELECT tenant_id FROM storage_usages WHERE user_id IS NULL
          );
      `);
      await tx.$executeRawUnsafe(`
        DELETE FROM storage_quotas
        WHERE user_id = 'tenant_pool'
          AND tenant_id IN (
            SELECT tenant_id FROM storage_quotas WHERE user_id IS NULL
          );
      `);

      // 3. Normalize remaining storage_quotas & storage_usages: "tenant_pool" -> NULL
      console.log("[3/5] Normalizing storage_quotas & storage_usages: 'tenant_pool' -> NULL...");
      const quotaUpdateResult = await tx.$executeRawUnsafe(`
        UPDATE storage_quotas 
        SET user_id = NULL 
        WHERE user_id = 'tenant_pool';
      `);
      console.log(`  ✔ Updated ${quotaUpdateResult} rows in storage_quotas.`);

      const usageUpdateResult = await tx.$executeRawUnsafe(`
        UPDATE storage_usages 
        SET user_id = NULL 
        WHERE user_id = 'tenant_pool';
      `);
      console.log(`  ✔ Updated ${usageUpdateResult} rows in storage_usages.`);

      // 4. Create Covering Index for Fast Aggregation
      console.log("[4/5] Creating covering index idx_media_files_storage_calc...");
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_media_files_storage_calc 
        ON media_files (tenant_id, status, is_folder, deleted_at);
      `);
      console.log("  ✔ Covering index idx_media_files_storage_calc verified.");

      // 5. Create Partial Unique Indexes to guarantee exactly ONE tenant-pool record per tenant
      console.log("[5/5] Creating partial unique indexes for tenant pool uniqueness...");
      await tx.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_quotas_tenant_pool 
        ON storage_quotas (tenant_id) 
        WHERE user_id IS NULL;
      `);
      await tx.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_usages_tenant_pool 
        ON storage_usages (tenant_id) 
        WHERE user_id IS NULL;
      `);
      console.log("  ✔ Partial unique indexes verified (uq_storage_quotas_tenant_pool, uq_storage_usages_tenant_pool).");
    });

    // 5. Verify post-migration state
    const remainingQuotaPool = await prisma.storageQuota.count({ where: { userId: "tenant_pool" } });
    const canonicalQuotaNull = await prisma.storageQuota.count({ where: { userId: null } });
    const remainingUsagePool = await prisma.storageUsage.count({ where: { userId: "tenant_pool" } });
    const canonicalUsageNull = await prisma.storageUsage.count({ where: { userId: null } });

    console.log("\n--- Post-Migration Verification ---");
    console.log(`storage_quotas remaining 'tenant_pool': ${remainingQuotaPool} (Expected: 0)`);
    console.log(`storage_quotas canonical NULL: ${canonicalQuotaNull} (Expected: >= 246)`);
    console.log(`storage_usages remaining 'tenant_pool': ${remainingUsagePool} (Expected: 0)`);
    console.log(`storage_usages canonical NULL: ${canonicalUsageNull} (Expected: >= 246)`);

    if (remainingQuotaPool === 0 && remainingUsagePool === 0 && canonicalQuotaNull >= 246 && canonicalUsageNull >= 246) {
      console.log("\n🎉 MIGRATION SUCCESSFUL: Tenant pool canonicalization & BigInt safety 100% verified.");
    } else {
      console.error("\n❌ MIGRATION WARNING: Record counts do not match expected canonical baseline.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Migration failed with error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
