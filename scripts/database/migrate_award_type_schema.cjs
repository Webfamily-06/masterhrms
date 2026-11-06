const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('--- Applying Additive Award Types Migration ---');

  // 1. Add missing columns to `award_types`
  console.log('1. Checking and adding columns to `award_types` table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.award_types 
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active' NOT NULL,
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS image_storage_path VARCHAR(500),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(36),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(36);
  `);
  console.log('Columns added to `award_types`.');

  // 2. Add index on tenant_id, status
  console.log('2. Adding index on `award_types(tenant_id, status)`...');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_award_types_tenant_status ON public.award_types (tenant_id, status);
  `);
  console.log('Index created on `award_types(tenant_id, status)`.');

  // 3. Ensure any existing rows have status = 'active'
  await prisma.$executeRawUnsafe(`
    UPDATE public.award_types SET status = 'active' WHERE status IS NULL;
  `);
  console.log('Existing award_types verified active.');

  // 4. Verify columns
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'award_types' 
    ORDER BY ordinal_position
  `);
  console.log('Updated columns in `award_types`:');
  console.table(cols);

  await prisma.$disconnect();
  console.log('--- Migration completed successfully ---');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

