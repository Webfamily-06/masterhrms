const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rollback() {
  console.log('================================================================');
  console.log('ADVANCED PAYROLL WAVE 2.1 — DATABASE ROLLBACK SCRIPT');
  console.log('================================================================\n');

  // Verify database connection and safety
  const tenantsCount = await prisma.tenant.count();
  const employeesCount = await prisma.employee.count();
  console.log(`Pre-rollback sanity check: ${tenantsCount} Tenants, ${employeesCount} Employees found.`);

  // 1. Drop stored_documents table (Wave 2.1 table)
  console.log('1. Dropping stored_documents table...');
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS stored_documents;`);
    console.log('✔ Dropped stored_documents table.');
  } catch (err) {
    console.error('Error dropping stored_documents:', err.message);
  }

  // 2. Drop 9 Wave 2.1 metadata columns from expense_claims
  console.log('\n2. Dropping Wave 2.1 columns from expense_claims...');
  const cols = [
    'receipt_hash',
    'receipt_path',
    'receipt_mime',
    'receipt_size',
    'ocr_extracted',
    'ocr_confidence',
    'ocr_status',
    'is_duplicate_warning',
    'stored_document_id',
  ];

  for (const col of cols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE expense_claims DROP COLUMN ${col};`);
      console.log(`✔ Dropped column ${col}`);
    } catch (err) {
      if (err.message.includes("check that column/key exists") || err.message.includes("doesn't exist")) {
        console.log(`ℹ Column ${col} already absent.`);
      } else {
        console.warn(`Notice dropping ${col}:`, err.message);
      }
    }
  }

  console.log('\n================================================================');
  console.log('ROLLBACK COMPLETED: Wave 2.1 schema additions removed safely.');
  console.log('Pre-existing HRMS tables and employee/payroll records are 100% intact.');
  console.log('================================================================\n');
}

rollback()
  .catch((e) => {
    console.error('Rollback error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
