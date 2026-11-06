const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (
        table_name LIKE '%certif%' 
        OR table_name LIKE '%brand%' 
        OR table_name LIKE '%signat%'
        OR table_name LIKE '%template%'
      )
    ORDER BY table_name;
  `);
  console.log('Matching tables:', tables);

  const awardTypes = await prisma.awardType.findMany({ take: 3 });
  console.log('Sample Award Types:', awardTypes.map(a => ({ id: a.id, name: a.name, tenantId: a.tenantId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
