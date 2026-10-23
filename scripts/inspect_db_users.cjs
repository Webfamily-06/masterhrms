const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    take: 10
  });
  console.log('--- TENANTS ---');
  console.log(JSON.stringify(tenants, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      workspaceRoleAssignments: { select: { role: { select: { name: true } } } },
      employees: { select: { id: true, tenantId: true, firstName: true, lastName: true, position: true } }
    },
    take: 20
  });
  console.log('\n--- USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const roles = await prisma.workspaceRole.findMany({
    select: { id: true, tenantId: true, name: true },
    take: 10
  });
  console.log('\n--- ROLES ---');
  console.log(JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
