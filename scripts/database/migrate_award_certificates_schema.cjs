const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('=== RUNNING ADDITIVE MIGRATION FOR EMPLOYEE AWARD CERTIFICATES ===');

  try {
    // 1. Create employee_award_certificates table
    console.log('1. Creating employee_award_certificates table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS employee_award_certificates (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        award_id VARCHAR(36) NOT NULL,
        nomination_id VARCHAR(36),
        employee_id VARCHAR(36) NOT NULL,
        certificate_number VARCHAR(100) NOT NULL UNIQUE,
        verification_code VARCHAR(64) NOT NULL UNIQUE,
        storage_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
        file_size INT NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        metadata JSONB NOT NULL,
        issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE,
        revoked_by VARCHAR(36),
        revocation_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✔ employee_award_certificates table verified/created.');

    // 2. Create indexes
    console.log('2. Creating indexes for employee_award_certificates...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cert_tenant_award ON employee_award_certificates(tenant_id, award_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cert_tenant_employee ON employee_award_certificates(tenant_id, employee_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cert_verification_code ON employee_award_certificates(verification_code);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cert_certificate_number ON employee_award_certificates(certificate_number);`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS uq_award_cert_active_tenant ON employee_award_certificates(tenant_id, award_id) WHERE status = 'ACTIVE';`);
    console.log('   ✔ Indexes verified/created.');

    // 3. Add foreign keys if possible
    console.log('3. Checking foreign keys...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_cert_tenant'
          ) THEN
            ALTER TABLE employee_award_certificates
            ADD CONSTRAINT fk_cert_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_cert_award'
          ) THEN
            ALTER TABLE employee_award_certificates
            ADD CONSTRAINT fk_cert_award
            FOREIGN KEY (award_id) REFERENCES employee_awards(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_cert_employee'
          ) THEN
            ALTER TABLE employee_award_certificates
            ADD CONSTRAINT fk_cert_employee
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);
      console.log('   ✔ Foreign key constraints verified/added.');
    } catch (fkErr) {
      console.warn('   ⚠ Foreign key constraint check note:', fkErr.message);
    }

    console.log('=== ADDITIVE MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

