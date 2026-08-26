const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { roles: true },
  });
  console.log(users.map(u => ({ email: u.email, roles: u.roles.map(r => r.role) })));
}

main().finally(() => prisma.$disconnect());
