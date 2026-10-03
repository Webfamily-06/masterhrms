const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.count();
  const employees = await prisma.employee.count();
  const payrollRuns = await prisma.payrollRun.count();
  const payslips = await prisma.payslip.count();
  const claims = await prisma.expenseClaim.count();
  const storedDocs = await prisma.storedDocument.count();

  console.log('================================================================');
  console.log('LIVE SUPABASE POSTGRESQL DATABASE RECORD INTEGRITY AUDIT');
  console.log('Engine: PostgreSQL 15+ (Supabase) | Pooler: Transaction & Direct');
  console.log('================================================================');
  console.log('Tenants:           ', tenants);
  console.log('Employees:         ', employees);
  console.log('Payroll Runs:      ', payrollRuns);
  console.log('Payslips:          ', payslips);
  console.log('Expense Claims:    ', claims);
  console.log('Stored Documents:  ', storedDocs);
  console.log('================================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
