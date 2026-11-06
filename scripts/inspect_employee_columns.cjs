const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'employees'
    ORDER BY ordinal_position;
  `);

  console.log(`Total physical columns in employees table: ${cols.length}`);
  const colNames = cols.map(c => c.column_name);
  console.log('Columns:');
  console.log(colNames.join(', '));

  // Check specific columns from Prisma schema
  const schemaExpectedCols = [
    'id', 'tenant_id', 'user_id', 'department_id', 'branch_id', 'designation_id',
    'manager_id', 'employee_code', 'first_name', 'last_name', 'email', 'phone',
    'position', 'employment_type', 'status', 'salary', 'joined_at', 'pan', 'aadhaar',
    'uan', 'esi_number', 'bank_name', 'bank_account', 'bank_ifsc', 'bank_branch',
    'created_at', 'updated_at', 'avatar',
    // Demographic / Form columns in schema.prisma:
    'father_or_spouse_name', 'worker_age_classification', 'marital_status',
    'permanent_address', 'present_address', 'completion_480_days_date',
    'permanent_employment_date', 'maternity_nomination_date', 'staffing_client_id'
  ];

  console.log('\nChecking schema expected columns:');
  for (const c of schemaExpectedCols) {
    const exists = colNames.includes(c);
    console.log(`  ${c}: ${exists ? 'EXISTS' : 'MISSING'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

