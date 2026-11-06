const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('================================================================');
  console.log('MASTERHRMS: CERTIFICATE FILE MANAGER INTEGRATION ADDITIVE MIGRATION');
  console.log('================================================================\n');

  try {
    // 1. Add file_id to organization_branding_assets
    console.log('1. Adding file_id to organization_branding_assets...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "organization_branding_assets"
      ADD COLUMN IF NOT EXISTS "file_id" VARCHAR(36) REFERENCES "media_files"("id") ON DELETE SET NULL;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_branding_file_id"
      ON "organization_branding_assets"("tenant_id", "file_id");
    `);
    console.log('   ✓ file_id added to organization_branding_assets');

    // 2. Add file_id to employee_award_certificates
    console.log('2. Adding file_id to employee_award_certificates...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "employee_award_certificates"
      ADD COLUMN IF NOT EXISTS "file_id" VARCHAR(36) REFERENCES "media_files"("id") ON DELETE SET NULL;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_cert_file_id"
      ON "employee_award_certificates"("tenant_id", "file_id");
    `);
    console.log('   ✓ file_id added to employee_award_certificates');

    console.log('\n================================================================');
    console.log('CERTIFICATE FILE MANAGER MIGRATION COMPLETED SUCCESSFULLY');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
