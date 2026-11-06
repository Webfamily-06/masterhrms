const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('=== RUNNING ADDITIVE MIGRATION FOR AWARD NOMINATIONS ===');

  try {
    // 1. Create award_nominations table
    console.log('1. Creating award_nominations table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS award_nominations (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        nomination_number VARCHAR(36) NOT NULL,
        employee_id VARCHAR(36) NOT NULL,
        award_type_id VARCHAR(36) NOT NULL,
        nominated_by_user_id VARCHAR(36) NOT NULL,
        nominated_by_employee_id VARCHAR(36),
        nomination_source VARCHAR(30) NOT NULL DEFAULT 'HR',
        reason TEXT NOT NULL,
        achievement_description TEXT,
        supporting_doc_url VARCHAR(500),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        current_step INTEGER NOT NULL DEFAULT 1,
        approval_request_id VARCHAR(36),
        issued_award_id VARCHAR(36),
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✔ award_nominations table verified/created.');

    // 2. Create indexes individually
    console.log('2. Creating indexes for award_nominations...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_award_nominations_tenant_status ON award_nominations(tenant_id, status)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_award_nominations_tenant_emp ON award_nominations(tenant_id, employee_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_award_nominations_nominator ON award_nominations(tenant_id, nominated_by_user_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_award_nominations_req_id ON award_nominations(tenant_id, approval_request_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_award_nominations_award_type ON award_nominations(tenant_id, award_type_id)`);
    console.log('   ✔ Indexes verified/created.');

    // 3. Add nomination_id column to employee_awards if missing
    console.log('3. Ensuring nomination_id in employee_awards...');
    await prisma.$executeRawUnsafe(`ALTER TABLE employee_awards ADD COLUMN IF NOT EXISTS nomination_id VARCHAR(36)`);
    console.log('   ✔ employee_awards.nomination_id verified.');

    // 4. Add policy columns to award_types if missing
    console.log('4. Ensuring policy columns in award_types...');
    await prisma.$executeRawUnsafe(`ALTER TABLE award_types ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT TRUE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE award_types ADD COLUMN IF NOT EXISTS allow_peer_nomination BOOLEAN DEFAULT TRUE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE award_types ADD COLUMN IF NOT EXISTS allow_self_nomination BOOLEAN DEFAULT FALSE`);
    console.log('   ✔ award_types policy columns verified.');

    console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
