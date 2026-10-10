const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

/**
 * MASTERHRMS — Phase A3.6 Reversible Migration Rollback Tool
 * 
 * Safety Rules:
 * 1. Requires explicit --force flag to execute destructive DDL if data exists.
 * 2. Supports --dry-run mode to audit preconditions without mutating database.
 * 3. Enforces 5s lock_timeout to prevent blocking production connection pool.
 * 4. Verifies whether standalone invoices (subscription_id IS NULL) exist before
 *    attempting to reinstate NOT NULL constraints.
 */
async function runRollback() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForced = args.includes('--force');

  console.log('=================================================================');
  console.log(' MASTERHRMS — Phase A3.6 Schema Migration Rollback');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Audit only, no DDL executed)' : 'EXECUTE ROLLBACK'}`);
  console.log('=================================================================\n');

  try {
    await prisma.$executeRawUnsafe(`SET lock_timeout = '5s';`);
  } catch (err) {
    console.warn('Note: Could not set lock_timeout (non-PostgreSQL engine or permissions):', err.message);
  }

  // Precondition Check 1: Standalone invoices with NULL subscription_id
  let nullInvoiceCount = 0;
  try {
    const res = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM billing_invoices WHERE subscription_id IS NULL;
    `);
    nullInvoiceCount = res[0]?.count || 0;
    console.log(`[Check 1] Standalone invoices with NULL subscription_id: ${nullInvoiceCount}`);
  } catch (err) {
    console.log('[Check 1] billing_invoices table or subscription_id column check skipped:', err.message);
  }

  // Precondition Check 2: Scheduled plan transitions in tenant_subscriptions
  let scheduledSubCount = 0;
  try {
    const res = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM tenant_subscriptions WHERE scheduled_plan_id IS NOT NULL;
    `);
    scheduledSubCount = res[0]?.count || 0;
    console.log(`[Check 2] Active scheduled plan transitions: ${scheduledSubCount}`);
  } catch (err) {
    console.log('[Check 2] scheduled_plan_id column check skipped (column may not exist)');
  }

  // Precondition Check 3: Commercial price schedules table data
  let priceScheduleCount = 0;
  let tableExists = false;
  try {
    const regRes = await prisma.$queryRawUnsafe(`
      SELECT to_regclass('public.commercial_price_schedules')::text as tbl;
    `);
    tableExists = Boolean(regRes[0]?.tbl);
    if (tableExists) {
      const countRes = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count FROM commercial_price_schedules;
      `);
      priceScheduleCount = countRes[0]?.count || 0;
      console.log(`[Check 3] commercial_price_schedules rows present: ${priceScheduleCount}`);
    } else {
      console.log('[Check 3] commercial_price_schedules table does not exist.');
    }
  } catch (err) {
    console.log('[Check 3] commercial_price_schedules check skipped:', err.message);
  }

  // Evaluate Data Loss Risks
  const hasData = nullInvoiceCount > 0 || scheduledSubCount > 0 || priceScheduleCount > 0;

  if (hasData && !isForced && !isDryRun) {
    console.error('\n[ABORTED] Rollback halted to protect data integrity:');
    if (nullInvoiceCount > 0) {
      console.error(` - ${nullInvoiceCount} standalone invoice(s) exist. Re-enforcing NOT NULL will corrupt data.`);
    }
    if (scheduledSubCount > 0) {
      console.error(` - ${scheduledSubCount} active scheduled plan transition(s) exist. Dropping columns will lose state.`);
    }
    if (priceScheduleCount > 0) {
      console.error(` - ${priceScheduleCount} price schedule record(s) exist in commercial_price_schedules.`);
    }
    console.error('\nTo force rollback despite data loss, pass --force.');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('\n--- DRY-RUN ACTIONS SUMMARY ---');
    console.log('1. DROP INDEX IF EXISTS "commercial_price_schedules_product_slug_status_effective_from_idx"');
    console.log('2. DROP TABLE IF EXISTS "commercial_price_schedules"');
    console.log('3. ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "scheduled_plan_id", "scheduled_at", "scheduled_effective_date", "scheduled_by_user_id", "scheduled_seats"');
    if (nullInvoiceCount === 0) {
      console.log('4. ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" SET NOT NULL');
    } else {
      console.log('4. SKIP setting subscription_id NOT NULL (null rows exist)');
    }
    console.log('\nDry run completed successfully. Zero changes were made to the database.');
    return;
  }

  console.log('\nExecuting rollback statements...');

  // 1. Drop commercial_price_schedules table & index
  if (tableExists) {
    console.log('1. Dropping commercial_price_schedules table and indexes...');
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "commercial_price_schedules_product_slug_status_effective_from_idx";
    `);
    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS "commercial_price_schedules";
    `);
  }

  // 2. Drop scheduled plan columns from tenant_subscriptions
  console.log('2. Dropping scheduled columns from tenant_subscriptions...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tenant_subscriptions"
      DROP COLUMN IF EXISTS "scheduled_plan_id",
      DROP COLUMN IF EXISTS "scheduled_at",
      DROP COLUMN IF EXISTS "scheduled_effective_date",
      DROP COLUMN IF EXISTS "scheduled_by_user_id",
      DROP COLUMN IF EXISTS "scheduled_seats";
  `);

  // 3. Reinstate NOT NULL on billing_invoices.subscription_id if safe
  if (nullInvoiceCount === 0) {
    console.log('3. Reinstating NOT NULL on billing_invoices.subscription_id...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" SET NOT NULL;
    `);
  } else {
    console.warn(`3. Warning: Skipping SET NOT NULL on billing_invoices.subscription_id because ${nullInvoiceCount} rows have NULL values.`);
  }

  console.log('\nRollback completed successfully.');
}

runRollback()
  .catch((err) => {
    console.error('Rollback error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
