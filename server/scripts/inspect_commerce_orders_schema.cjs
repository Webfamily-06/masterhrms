const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function inspectSchema() {
  console.log('=== FORENSIC SCHEMA INSPECTION: commerce_orders ===\n');

  // 1. Columns & Types
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'commerce_orders'
    ORDER BY ordinal_position;
  `);
  console.log('--- 1. COLUMNS & DATA TYPES ---');
  console.table(columns);

  // 2. Constraints & Foreign Keys
  const constraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.table_name = 'commerce_orders'
    ORDER BY tc.constraint_type, tc.constraint_name;
  `);
  console.log('\n--- 2. CONSTRAINTS & FOREIGN KEYS ---');
  console.table(constraints);

  // 3. Indexes
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'commerce_orders'
    ORDER BY indexname;
  `);
  console.log('\n--- 3. INDEXES ---');
  console.table(indexes);

  // 4. Custom Enum Types
  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('CommerceOrderStatus', 'CommerceFulfillmentStatus')
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log('\n--- 4. ENUM DEFINITIONS ---');
  console.table(enums);
}

inspectSchema()
  .catch((e) => {
    console.error('Inspection failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
