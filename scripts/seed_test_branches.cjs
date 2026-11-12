const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = '02bf4113-b100-4711-af94-d81165e9a2e1';

  // Seed 3 branches if 0
  const branchCount = await prisma.branch.count({ where: { tenantId } });
  if (branchCount === 0) {
    await prisma.branch.createMany({
      data: [
        {
          id: 'br-hq-001',
          tenantId,
          name: 'Global Headquarters',
          code: 'HQ-01',
          phone: '+1 555-0199',
          email: 'hq@masterhrms.com',
          address: '100 Corporate Plaza, Suite 800, New York, NY',
          status: 'active'
        },
        {
          id: 'br-lon-002',
          tenantId,
          name: 'London Regional Office',
          code: 'LON-02',
          phone: '+44 20 7946 0991',
          email: 'london@masterhrms.com',
          address: '25 Bank Street, Canary Wharf, London',
          status: 'active'
        },
        {
          id: 'br-sgp-003',
          tenantId,
          name: 'Singapore Innovation Center',
          code: 'SGP-03',
          phone: '+65 6789 0123',
          email: 'singapore@masterhrms.com',
          address: '10 Marina Boulevard, Tower 2, Singapore',
          status: 'active'
        }
      ]
    });
    console.log('Seeded 3 test branches for tenant', tenantId);
  } else {
    console.log('Tenant already has branches:', branchCount);
  }

  await prisma.$disconnect();
}
main();

