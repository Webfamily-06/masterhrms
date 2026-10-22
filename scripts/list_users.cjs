const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    take: 10,
    select: {
      id: true,
      email: true,
      profile: { select: { fullName: true, tenantId: true } },
      roles: true,
    },
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

run().catch(console.error);
