const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Migrating award_types to add workflow_id (Additive) ---');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE award_types 
      ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(36) REFERENCES workflow_definitions(id) ON DELETE SET NULL;
    `);
    console.log('Successfully ensured workflow_id column on award_types.');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_award_types_tenant_workflow 
      ON award_types(tenant_id, workflow_id);
    `);
    console.log('Successfully ensured idx_award_types_tenant_workflow index.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

