const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 5,
    include: { roles: true, profile: true },
  });
  console.log("Users found:", users.map(u => ({ id: u.id, email: u.email, tenantId: u.profile?.tenantId, roles: u.roles.map(r => r.role) })));
}

main().finally(() => prisma.$disconnect());

