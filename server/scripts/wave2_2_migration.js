const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying non-destructive Wave 2.2 schema additions...');

  // 1. fbp_declarations table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fbp_declarations (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      employee_id VARCHAR(36) NOT NULL,
      financial_year VARCHAR(20) NOT NULL,
      total_fbp_annual DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      submitted_at DATETIME(3) NULL,
      approved_at DATETIME(3) NULL,
      approved_by VARCHAR(150) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_fbp_tenant_emp_fy (tenant_id, employee_id, financial_year),
      INDEX idx_fbp_tenant_status (tenant_id, status),
      INDEX idx_fbp_tenant_emp (tenant_id, employee_id),
      CONSTRAINT fk_fbp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_fbp_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✔ fbp_declarations table ready');

  // 2. fbp_declaration_items table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fbp_declaration_items (
      id VARCHAR(36) PRIMARY KEY,
      declaration_id VARCHAR(36) NOT NULL,
      component_code VARCHAR(50) NOT NULL,
      component_name VARCHAR(150) NOT NULL,
      monthly_declared DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      annual_declared DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      max_annual_cap DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      requires_proof BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE KEY uq_fbp_item_decl_code (declaration_id, component_code),
      INDEX idx_fbp_item_decl (declaration_id),
      CONSTRAINT fk_fbp_item_decl FOREIGN KEY (declaration_id) REFERENCES fbp_declarations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✔ fbp_declaration_items table ready');

  // 3. Columns for expense_claims
  const expenseClaimCols = [
    ['approved_by', 'VARCHAR(150) NULL'],
    ['finance_approved_by', 'VARCHAR(150) NULL'],
    ['finance_approved_at', 'DATETIME(3) NULL'],
    ['payroll_run_id', 'VARCHAR(36) NULL'],
  ];

  for (const [col, def] of expenseClaimCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE expense_claims ADD COLUMN ${col} ${def};`);
      console.log('✔ Added expense_claims column', col);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log('ℹ expense_claims column already exists:', col);
      } else {
        console.warn('expense_claims column notice:', col, e.message);
      }
    }
  }

  // 4. Columns for employee_tax_declarations
  const taxDeclCols = [
    ['is_regime_locked', 'BOOLEAN NOT NULL DEFAULT FALSE'],
    ['regime_locked_at', 'DATETIME(3) NULL'],
    ['regime_lock_reason', 'VARCHAR(100) NULL'],
  ];

  for (const [col, def] of taxDeclCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE employee_tax_declarations ADD COLUMN ${col} ${def};`);
      console.log('✔ Added employee_tax_declarations column', col);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log('ℹ employee_tax_declarations column already exists:', col);
      } else {
        console.warn('employee_tax_declarations column notice:', col, e.message);
      }
    }
  }

  // 5. Columns for tax_declaration_proofs
  const proofCols = [
    ['stored_document_id', 'VARCHAR(36) NULL'],
  ];

  for (const [col, def] of proofCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE tax_declaration_proofs ADD COLUMN ${col} ${def};`);
      console.log('✔ Added tax_declaration_proofs column', col);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log('ℹ tax_declaration_proofs column already exists:', col);
      } else {
        console.warn('tax_declaration_proofs column notice:', col, e.message);
      }
    }
  }

  console.log('✔ All Wave 2.2 schema migrations applied non-destructively.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
