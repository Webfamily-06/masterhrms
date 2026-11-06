const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- MIGRATION: Add partial unique index on employees(tenant_id, user_id) ---');
  try {
    // 1. Verify data cleanliness before creating index
    const duplicates = await prisma.$queryRawUnsafe(`
      SELECT tenant_id, user_id, COUNT(*) as cnt
      FROM employees
      WHERE user_id IS NOT NULL
      GROUP BY tenant_id, user_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.error('ABORT: Found duplicate (tenant_id, user_id) records:', duplicates);
      process.exit(1);
    }
    console.log('[PASS] Data is clean. Zero duplicate (tenant_id, user_id) rows found.');

    // 2. Execute additive partial unique index creation
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_tenant_user_id
      ON employees (tenant_id, user_id)
      WHERE user_id IS NOT NULL;
    `);
    console.log('[PASS] Executed: CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_tenant_user_id ON employees (tenant_id, user_id) WHERE user_id IS NOT NULL;');

    // 3. Verify index exists physically in PostgreSQL
    const createdIndex = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'employees' AND indexname = 'uq_employees_tenant_user_id'
    `);
    console.log('Physical index verification in PostgreSQL:', createdIndex);

    if (createdIndex.length === 1) {
      console.log('[PASS] Partial unique index uq_employees_tenant_user_id is active in PostgreSQL!');
    } else {
      console.error('[FAIL] Could not verify index creation in pg_indexes.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

