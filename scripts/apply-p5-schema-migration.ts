import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying P5 Schema Migrations ---');

  // 1. Employees table extensions
  await prisma.$executeRawUnsafe(`
    ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS employment_category VARCHAR(50) DEFAULT 'permanent';
  `);
  console.log('✓ Added employment_category to employees');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(36) NULL REFERENCES suppliers(id) ON DELETE SET NULL;
  `);
  console.log('✓ Added supplier_id to employees');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_employees_supplier_id ON employees(supplier_id);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_employees_employment_category ON employees(employment_category);
  `);
  console.log('✓ Created indexes on employees');

  // 2. Employee contracts table extensions
  const contractMigrations = [
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50) NULL;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'direct_contract';`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS payment_workflow VARCHAR(30) DEFAULT 'PAYROLL';`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(36) NULL REFERENCES suppliers(id) ON DELETE SET NULL;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12, 2) NULL;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS billing_frequency VARCHAR(50) DEFAULT 'monthly';`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS amendment_number INTEGER DEFAULT 0;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS converted_to_permanent BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_employee_contracts_supplier_id ON employee_contracts(supplier_id);`,
    `CREATE INDEX IF NOT EXISTS idx_employee_contracts_category ON employee_contracts(category);`,
    `CREATE INDEX IF NOT EXISTS idx_employee_contracts_contract_number ON employee_contracts(contract_number);`,
  ];

  for (const sql of contractMigrations) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('✓ Applied all employee_contracts migrations and indexes');

  // Verify columns
  const empCols = await prisma.$queryRawUnsafe<any[]>(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name IN ('employment_category', 'supplier_id');
  `);
  console.log('Verified Employee columns:', empCols);

  const contractCols = await prisma.$queryRawUnsafe<any[]>(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employee_contracts' AND column_name IN ('contract_number', 'category', 'payment_workflow', 'supplier_id', 'hourly_rate', 'billing_frequency', 'notice_period_days', 'auto_renew', 'amendment_number', 'converted_to_permanent', 'converted_at');
  `);
  console.log('Verified EmployeeContract columns count:', contractCols.length);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
