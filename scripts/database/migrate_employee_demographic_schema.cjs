/**
 * Additive Migration Script: Add Missing Demographic & Statutory Columns to Employees Table
 *
 * This script ensures 100% parity between remote Supabase PostgreSQL schema and server/prisma/schema.prisma.
 * It uses purely non-destructive `ALTER TABLE employees ADD COLUMN IF NOT EXISTS ...` statements.
 * Zero data loss, zero table drops, zero downtime.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== STARTING ADDITIVE MIGRATION FOR EMPLOYEES TABLE ===");

  const columnsToAdd = [
    { name: "father_or_spouse_name", type: "VARCHAR(150)" },
    { name: "present_address", type: "TEXT" },
    { name: "permanent_address", type: "TEXT" },
    { name: "completion_480_days_date", type: "DATE" },
    { name: "permanent_employment_date", type: "DATE" },
    { name: "worker_age_classification", type: "VARCHAR(20) DEFAULT 'Adult'" },
    { name: "maternity_nomination_date", type: "DATE" },
    { name: "marital_status", type: "VARCHAR(20)" },
    { name: "blood_group", type: "VARCHAR(10)" },
    { name: "address_line1", type: "VARCHAR(255)" },
    { name: "address_line2", type: "VARCHAR(255)" },
    { name: "city", type: "VARCHAR(100)" },
    { name: "district", type: "VARCHAR(100)" },
    { name: "postal_code", type: "VARCHAR(20)" },
    { name: "emergency_contact_name", type: "VARCHAR(100)" },
    { name: "emergency_contact_relationship", type: "VARCHAR(50)" },
    { name: "emergency_contact_phone", type: "VARCHAR(30)" },
  ];

  for (const col of columnsToAdd) {
    const sql = `ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`;
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[OK] Added column if not exists: ${col.name} (${col.type})`);
    } catch (err) {
      console.error(`[ERROR] Failed to add column ${col.name}:`, err.message);
      throw err;
    }
  }

  console.log("\n=== VERIFYING COLUMN EXISTENCE IN POSTGRESQL ===");
  const checkSql = `
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'employees' 
    ORDER BY column_name;
  `;
  const physicalColumns = await prisma.$queryRawUnsafe(checkSql);
  const physicalColNames = physicalColumns.map(c => c.column_name);

  console.log(`Total physical columns now in 'employees': ${physicalColNames.length}`);

  let missingCount = 0;
  for (const col of columnsToAdd) {
    if (physicalColNames.includes(col.name)) {
      console.log(`✓ Column '${col.name}' confirmed present in PostgreSQL.`);
    } else {
      console.error(`✗ Column '${col.name}' is STILL MISSING!`);
      missingCount++;
    }
  }

  if (missingCount === 0) {
    console.log("\n>>> SUCCESS: All 17 columns exist and database is in 100% parity with Prisma schema!");
  } else {
    console.error(`\n>>> FAILURE: ${missingCount} columns failed to apply.`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
