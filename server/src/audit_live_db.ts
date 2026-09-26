import { prisma } from './prisma';

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
  console.log('ALL TENANTS IN DATABASE:', JSON.stringify(tenants, null, 2));

  for (const t of tenants) {
    const empCount = await prisma.employee.count({ where: { tenantId: t.id } });
    const employees = await prisma.employee.findMany({
      where: { tenantId: t.id },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, salary: true, status: true }
    });
    const salaryAssCount = await prisma.employeeSalaryAssignment.count({ where: { tenantId: t.id } });
    const runCount = await prisma.payrollRun.count({ where: { tenantId: t.id } });
    const runs = await prisma.payrollRun.findMany({
      where: { tenantId: t.id },
      include: {
        _count: { select: { payslips: true, snapshots: true } },
        snapshots: {
          select: {
            id: true,
            employeeId: true,
            grossEarned: true,
            totalDeductions: true,
            netPay: true,
            periodMonth: true,
            periodYear: true
          }
        },
        payslips: {
          select: {
            id: true,
            employeeId: true,
            grossSalary: true,
            deductions: true,
            netSalary: true
          }
        }
      }
    });
    const snapshotCount = await prisma.payrollSnapshot.count({ where: { tenantId: t.id } });
    const payslipCount = await prisma.payslip.count({ where: { tenantId: t.id } });
    
    console.log(`\n========================================`);
    console.log(`TENANT: ${t.name} (id: ${t.id}, slug: ${t.slug})`);
    console.log(`========================================`);
    console.log(`Total Employees in DB: ${empCount}`);
    console.log(`Employees list:`, employees);
    console.log(`Total Salary Assignments: ${salaryAssCount}`);
    console.log(`Total Payroll Runs: ${runCount}`);
    console.log(`Runs Details:`, JSON.stringify(runs, null, 2));
    console.log(`Total Snapshots in DB: ${snapshotCount}`);
    console.log(`Total Payslips in DB: ${payslipCount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
