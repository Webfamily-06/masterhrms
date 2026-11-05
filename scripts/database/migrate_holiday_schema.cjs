const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('--- Applying Additive Holiday & Holiday Types Migration ---');

  // 1. Add missing columns to `holidays`
  console.log('1. Checking and adding columns to `holidays` table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.holidays 
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active' NOT NULL,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(36),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(36);
  `);
  console.log('Columns added to `holidays`.');

  // Add index on tenant_id, year, status for high-speed calendar & list queries
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_holidays_tenant_status ON public.holidays (tenant_id, status);
  `);
  console.log('Index created on `holidays(tenant_id, status)`.');

  // 2. Create `holiday_types` table
  console.log('2. Creating `holiday_types` table if not exists...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.holiday_types (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(30) DEFAULT '#10b981' NOT NULL,
      status VARCHAR(20) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      created_by VARCHAR(36),
      updated_by VARCHAR(36)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_types_tenant_name ON public.holiday_types (tenant_id, LOWER(name));
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_holiday_types_tenant_status ON public.holiday_types (tenant_id, status);
  `);
  console.log('`holiday_types` table and indices verified.');

  // 3. Seed default holiday types for existing tenants
  console.log('3. Seeding default holiday types for tenants...');
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Found ${tenants.length} tenants to ensure default holiday types.`);

  const defaultTypes = [
    { name: 'Public Holiday', description: 'Statutory public and gazetted national holiday', color: '#10b981' },
    { name: 'National Holiday', description: 'Mandatory nationwide federal or state holiday', color: '#3b82f6' },
    { name: 'Religious Holiday', description: 'Cultural and religious festivals observed by the organization', color: '#8b5cf6' },
    { name: 'Optional Holiday', description: 'Floating or optional holiday selectable by employees', color: '#f59e0b' },
    { name: 'Company Holiday', description: 'Company annual day or founder milestone holiday', color: '#06b6d4' },
    { name: 'Restricted Holiday', description: 'Branch-specific or restricted regional holiday', color: '#ec4899' },
  ];

  for (const tenant of tenants) {
    for (const dt of defaultTypes) {
      const existing = await prisma.$queryRaw`
        SELECT id FROM public.holiday_types 
        WHERE tenant_id = ${tenant.id} AND LOWER(name) = ${dt.name.toLowerCase()}
        LIMIT 1;
      `;
      if (!existing || existing.length === 0) {
        const id = require('crypto').randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.holiday_types (id, tenant_id, name, description, color, status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
          id, tenant.id, dt.name, dt.description, dt.color
        );
        console.log(`  [${tenant.id}] Seeded: ${dt.name}`);
      }
    }
  }

  // 4. Verify columns and counts
  const typesCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM public.holiday_types;`;
  console.log(`\nTotal holiday types in database: ${typesCount[0].count}`);

  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name IN ('holidays', 'holiday_types')
    ORDER BY table_name, ordinal_position;
  `;
  console.log('Verified database columns:', cols.length);
  console.log('Migration Completed Successfully!');
}

runMigration()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

