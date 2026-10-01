import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { employees: true } },
    },
  });

  console.log('--- Tenants in Database ---');
  for (const t of tenants) {
    console.log(`Tenant ID: ${t.id} | Slug: ${t.slug} | Name: ${t.name} | Employees: ${t._count.employees}`);
  }

  const allEmployees = await prisma.employee.count();
  console.log(`Total employees in DB: ${allEmployees}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
