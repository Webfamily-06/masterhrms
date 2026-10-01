const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Rolling back Wave 2.2 schema additions...');

  // 1. Drop tables
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS fbp_declaration_items;`);
  console.log('✔ Dropped fbp_declaration_items table');

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS fbp_declarations;`);
  console.log('✔ Dropped fbp_declarations table');

  // 2. Drop columns from expense_claims
  const expenseClaimCols = ['approved_by', 'finance_approved_by', 'finance_approved_at', 'payroll_run_id'];
  for (const col of expenseClaimCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE expense_claims DROP COLUMN ${col};`);
      console.log('✔ Dropped expense_claims column', col);
    } catch (e) {
      console.warn('Drop column notice:', col, e.message);
    }
  }

  // 3. Drop columns from employee_tax_declarations
  const taxDeclCols = ['is_regime_locked', 'regime_locked_at', 'regime_lock_reason'];
  for (const col of taxDeclCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE employee_tax_declarations DROP COLUMN ${col};`);
      console.log('✔ Dropped employee_tax_declarations column', col);
    } catch (e) {
      console.warn('Drop column notice:', col, e.message);
    }
  }

  // 4. Drop columns from tax_declaration_proofs
  const proofCols = ['stored_document_id'];
  for (const col of proofCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE tax_declaration_proofs DROP COLUMN ${col};`);
      console.log('✔ Dropped tax_declaration_proofs column', col);
    } catch (e) {
      console.warn('Drop column notice:', col, e.message);
    }
  }

  console.log('✔ Wave 2.2 rollback complete.');
}

main()
  .catch((e) => {
    console.error('Rollback failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
