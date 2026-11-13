import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
  console.log('Total Prisma models:', models.length);
  const relevant = models.filter(m => /contract|employee|supplier|purchase|staffing|lifecycle|probation/i.test(m));
  console.log('Relevant models:', relevant);

  const empCount = await prisma.employee.count();
  const empTypes = await prisma.employee.groupBy({
    by: ['employmentType'],
    _count: { id: true },
  });
  console.log('Employees count:', empCount, 'by type:', empTypes);

  // Check sample employee
  const sampleEmp = await prisma.employee.findFirst({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      employmentType: true,
      departmentId: true,
      tenantId: true,
    }
  });
  console.log('Sample Employee:', sampleEmp);

  // Check EmployeeContract
  if ('employeeContract' in prisma) {
    const ecCount = await (prisma as any).employeeContract.count();
    console.log('employeeContract count:', ecCount);
  } else {
    console.log('employeeContract NOT in prisma client');
  }

  // Check Contract
  if ('contract' in prisma) {
    const cCount = await (prisma as any).contract.count();
    console.log('contract count:', cCount);
  }

  // Check ContractType
  if ('contractType' in prisma) {
    const ctCount = await (prisma as any).contractType.count();
    console.log('contractType count:', ctCount);
  }

  // Check Supplier
  if ('supplier' in prisma) {
    const sCount = await (prisma as any).supplier.count();
    console.log('supplier count:', sCount);
  }

  // Check Purchase
  if ('purchase' in prisma) {
    const pCount = await (prisma as any).purchase.count();
    console.log('purchase count:', pCount);
  }

  // Check SystemCronJob
  if ('systemCronJob' in prisma) {
    const jobs = await (prisma as any).systemCronJob.findMany({
      where: {
        OR: [
          { name: { contains: 'contract', mode: 'insensitive' } },
          { name: { contains: 'probation', mode: 'insensitive' } },
          { name: { contains: 'expiry', mode: 'insensitive' } },
        ]
      }
    });
    console.log('Relevant cron jobs:', jobs.map((j: any) => ({ name: j.name, schedule: j.schedule, isEnabled: j.isEnabled })));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
