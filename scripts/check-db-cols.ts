import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const empCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name IN ('employment_category', 'supplier_id');
  `);
  console.log('Employee columns:', empCols);

  const contractCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employee_contracts' AND column_name IN ('contract_number', 'category', 'payment_workflow', 'supplier_id', 'hourly_rate', 'billing_frequency', 'notice_period_days', 'auto_renew', 'amendment_number', 'converted_to_permanent', 'converted_at');
  `);
  console.log('EmployeeContract columns:', contractCols);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

