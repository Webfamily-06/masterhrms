const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.workspaceRole.findUnique({
    where: { id: '1b83a967-178d-4abe-94ff-b54c7c297d57' }
  });
  console.log('gowtham role:', role);
  const tenantDefault = await prisma.tenant.findUnique({
    where: { id: 'tenant-default-001' }
  });
  console.log('tenantDefault:', tenantDefault);

  const tenants = await prisma.tenant.findMany({
    take: 5,
    select: { id: true, name: true, slug: true }
  });
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
