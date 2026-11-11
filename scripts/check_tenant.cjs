const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const t = await prisma.tenant.findFirst();
  console.log('First tenant:', t?.id, t?.name);
}

run().catch(console.error).finally(() => prisma.$disconnect());

