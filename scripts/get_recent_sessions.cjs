const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.deviceSession.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent sessions:', sessions);
  await prisma.$disconnect();
}
main();

