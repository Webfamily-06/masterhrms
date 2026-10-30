const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 10,
    include: { profile: true, roles: true }
  });
  users.forEach(u => console.log(u.id, u.email, u.profile?.tenantId, u.roles.map(r => r.role)));
  await prisma.$disconnect();
}
main();
