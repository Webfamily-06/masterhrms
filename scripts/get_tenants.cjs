const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log('Tenants:', tenants.slice(0, 5));
  await prisma.$disconnect();
}
main();

