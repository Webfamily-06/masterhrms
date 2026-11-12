const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 'user-hr-001' },
    select: { id: true, email: true, roles: true, profile: true, employees: true }
  });
  console.log('HR User:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}
main();
