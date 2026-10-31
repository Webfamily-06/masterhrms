/**
 * MASTERHRMS — Phase F5 Database Migration Runner
 * 
 * Non-destructive additions:
 * - is_public column on media_files
 * - indexing for file_links
 * - backfill of legacy media_usages into file_links
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require(path.join(__dirname, "../server/node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function runMigration() {
  console.log("\n========================================================");
  console.log(" MASTERHRMS FILE MANAGER — PHASE F5 SCHEMA MIGRATION");
  console.log("========================================================\n");

  try {
    console.log("[MIGRATION] Applying non-destructive DDL statements...");

    const ddl = [
      `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;`,
      `CREATE INDEX IF NOT EXISTS idx_media_files_tenant_is_public ON media_files(tenant_id, is_public);`,
      `CREATE INDEX IF NOT EXISTS idx_media_files_system_module ON media_files(tenant_id, system_module, system_page);`,
      `CREATE INDEX IF NOT EXISTS idx_file_links_file_id ON file_links(file_id);`,
      `CREATE INDEX IF NOT EXISTS idx_file_links_entity ON file_links(entity_type, entity_id);`,
    ];

    for (const sql of ddl) {
      await prisma.$executeRawUnsafe(sql);
      console.log(`  ✓ Executed: ${sql.split("\n")[0]}`);
    }

    // Step 2: Backfill existing media_usages into file_links if not already linked
    console.log("\n[BACKFILL] Synchronizing legacy media_usages into file_links...");
    const usages = await prisma.mediaUsage.findMany({
      include: { media: true },
    });

    console.log(`  Found ${usages.length} existing MediaUsage records.`);
    let backfilledCount = 0;

    for (const usage of usages) {
      if (!usage.media) continue;

      const existingLink = await prisma.fileLink.findFirst({
        where: {
          fileId: usage.mediaId,
          entityType: usage.entityType,
          entityId: usage.entityId,
          fieldKey: usage.fieldKey,
        },
      });

      if (!existingLink) {
        // Derive module and page from entityType
        let moduleName = "core";
        let pageKey = "general";
        if (usage.entityType.includes("chat")) {
          moduleName = "chat";
          pageKey = "messages";
        } else if (usage.entityType.includes("profile") || usage.entityType.includes("avatar")) {
          moduleName = "profile";
          pageKey = "avatars";
        } else if (usage.entityType.includes("brand") || usage.entityType.includes("setting")) {
          moduleName = "settings";
          pageKey = "branding";
        } else if (usage.entityType.includes("expense")) {
          moduleName = "expenses";
          pageKey = "claims";
        } else if (usage.entityType.includes("document") || usage.entityType.includes("employee")) {
          moduleName = "employees";
          pageKey = "documents";
        }

        await prisma.fileLink.create({
          data: {
            fileId: usage.mediaId,
            entityType: usage.entityType,
            entityId: usage.entityId,
            fieldKey: usage.fieldKey,
            module: moduleName,
            pageKey,
            linkedBy: usage.media.uploadedBy || "system",
            linkedAt: usage.createdAt,
          },
        });
        backfilledCount++;
      }
    }

    console.log(`  ✓ Successfully backfilled ${backfilledCount} new file_links.`);

    // If branding assets exist, mark them is_public = true
    await prisma.$executeRawUnsafe(`
      UPDATE media_files 
      SET is_public = true 
      WHERE folder LIKE '%branding%' OR 'branding' = ANY(tags) OR folder LIKE '%public%';
    `);
    console.log("  ✓ Updated public flags for branding and marketing assets.");

    console.log("\n========================================================");
    console.log("🎉 PHASE F5 DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

