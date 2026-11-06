const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConstraints() {
  const constraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'employees'
    ORDER BY tc.constraint_name, kcu.ordinal_position;
  `);

  console.log("Employees table constraints in PostgreSQL:");
  console.table(constraints);

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'employees'
    ORDER BY indexname;
  `);

  console.log("\nEmployees table indexes in PostgreSQL:");
  console.table(indexes);
}

checkConstraints().finally(() => prisma.$disconnect());

