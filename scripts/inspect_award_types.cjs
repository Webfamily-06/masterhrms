const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.awardType.findMany({
    where: { tenantId: 'tenant-default-001' }
  });
  console.log(types.map(t => ({
    id: t.id,
    name: t.name,
    requiresApproval: t.requiresApproval,
    allowPeerNomination: t.allowPeerNomination,
    allowSelfNomination: t.allowSelfNomination,
    status: t.status
  })));
}

main().finally(() => prisma.$disconnect());

