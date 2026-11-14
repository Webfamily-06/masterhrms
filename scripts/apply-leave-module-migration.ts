import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Applying Additive Leave Module Schema Migrations ---");

  // 1. Leave Types extensions
  const leaveTypeMigrations = [
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS description TEXT NULL;`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
  ];
  for (const sql of leaveTypeMigrations) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ Applied leave_types extensions");

  // 2. Leave Policies extensions
  const leavePolicyMigrations = [
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS leave_type_id VARCHAR(36) NULL REFERENCES leave_types(id) ON DELETE SET NULL;`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS carry_forward_enabled BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS max_carry_forward_days INTEGER DEFAULT 0;`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS effective_to DATE NULL;`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS accrual_frequency VARCHAR(20) DEFAULT 'yearly';`,
    `ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS probation_allowed BOOLEAN DEFAULT TRUE;`,
    `CREATE INDEX IF NOT EXISTS idx_leave_policies_leave_type_id ON leave_policies(leave_type_id);`,
    `CREATE INDEX IF NOT EXISTS idx_leave_policies_status ON leave_policies(status);`,
  ];
  for (const sql of leavePolicyMigrations) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ Applied leave_policies extensions and indexes");

  // 3. Leave Requests extensions
  const leaveRequestMigrations = [
    `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day_session VARCHAR(20) NULL;`,
    `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) NULL;`,
    `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;`,
  ];
  for (const sql of leaveRequestMigrations) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ Applied leave_requests extensions");

  console.log("All leave module additive migrations completed successfully.");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

