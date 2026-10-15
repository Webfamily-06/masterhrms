const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, profile: true },
    take: 5
  });
  console.log('Users in DB:');
  users.forEach(u => console.log(' ', u.email, u.profile?.fullName, u.profile?.tenantId));
}

main().catch(console.error).finally(() => prisma.$disconnect());
