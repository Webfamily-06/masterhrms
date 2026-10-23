const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gowtham = await prisma.user.findFirst({
    where: { email: 'gowthamtooquik@gmail.com' },
    include: { profile: true, roles: true, employees: true }
  });
  console.log('Gowtham:', JSON.stringify(gowtham, null, 2));

  const targetTenantId = gowtham?.profile?.tenantId || 'tenant-default-001';
  console.log('Target Tenant ID:', targetTenantId);

  const tenantUsers = await prisma.user.findMany({
    where: { profile: { tenantId: targetTenantId } },
    include: { profile: true, roles: true, employees: true }
  });
  console.log('Users in target tenant:', tenantUsers.map(u => ({ id: u.id, email: u.email, roles: u.roles.map(r => r.role) })));

  const employees = await prisma.employee.findMany({
    where: { tenantId: targetTenantId },
    select: { id: true, userId: true, firstName: true, lastName: true, email: true, position: true }
  });
  console.log('\nEmployees in target tenant:', JSON.stringify(employees, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
