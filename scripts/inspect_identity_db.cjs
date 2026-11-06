const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const rawCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employees' AND column_name IN ('user_id', 'tenant_id')
    `);
    console.log('Employee columns:', rawCols);

    const dupUsers = await prisma.$queryRawUnsafe(`
      SELECT tenant_id, user_id, COUNT(*) as cnt
      FROM employees
      WHERE user_id IS NOT NULL
      GROUP BY tenant_id, user_id
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicate (tenant_id, user_id):', dupUsers);

    const dupGlobalUsers = await prisma.$queryRawUnsafe(`
      SELECT user_id, COUNT(*) as cnt
      FROM employees
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicate global user_id:', dupGlobalUsers);

    const totalEmps = await prisma.employee.count();
    const empsWithUserId = await prisma.employee.count({ where: { userId: { not: null } } });
    const empsWithoutUserId = await prisma.employee.count({ where: { userId: null } });
    console.log({ totalEmps, empsWithUserId, empsWithoutUserId });

    const existingIndices = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'employees' AND indexdef ILIKE '%user_id%'
    `);
    console.log('Existing employees user_id indices:', existingIndices);

    const deviceSessionCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'device_sessions'
    `);
    console.log('device_sessions columns count:', deviceSessionCols.length);

    const sessionIndices = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'device_sessions'
    `);
    console.log('device_sessions indices:', sessionIndices);

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();

