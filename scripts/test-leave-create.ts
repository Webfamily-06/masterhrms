import { rawPrisma } from '../server/src/prisma.js';

async function test() {
  await rawPrisma.$executeRawUnsafe(`ALTER TABLE leave_requests ALTER COLUMN days TYPE numeric(4, 1);`);
  console.log('Altered leave_requests.days to numeric(4, 1)');
  
  const t = await rawPrisma.tenant.findFirst();
  const e = await rawPrisma.employee.findFirst({ where: { tenantId: t?.id } });
  
  const lr = await rawPrisma.leaveRequest.create({
    data: {
      tenantId: t!.id,
      employeeId: e!.id,
      startDate: new Date('2026-08-07T00:00:00.000Z'),
      endDate: new Date('2026-08-07T00:00:00.000Z'),
      days: 1.0,
      status: 'approved',
      reason: 'test'
    }
  });
  console.log('Successfully created leave request:', lr.id);
  await rawPrisma.leaveRequest.delete({ where: { id: lr.id } });
  console.log('Successfully deleted test leave request');
}

test().catch(console.error);
