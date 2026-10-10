const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function runMigration() {
  console.log('Beginning Phase A3.6 Schema Migration (OD-1, OD-3, OD-10)...');

  await prisma.$executeRawUnsafe(`SET lock_timeout = '5s';`);

  // 1. Option 3A: Make BillingInvoice.subscriptionId nullable
  console.log('1. Altering billing_invoices.subscription_id to DROP NOT NULL...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" DROP NOT NULL;
  `);

  // 2. OD-10: Add scheduled plan transition columns to tenant_subscriptions
  console.log('2. Adding scheduled plan columns to tenant_subscriptions...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tenant_subscriptions"
      ADD COLUMN IF NOT EXISTS "scheduled_plan_id" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "scheduled_effective_date" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "scheduled_by_user_id" VARCHAR(36),
      ADD COLUMN IF NOT EXISTS "scheduled_seats" INTEGER;
  `);

  // 3. OD-1: Create commercial_price_schedules table for dynamic versioned pricing
  console.log('3. Creating commercial_price_schedules table and indexes...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "commercial_price_schedules" (
      "id" VARCHAR(36) NOT NULL,
      "product_slug" VARCHAR(100) NOT NULL,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "amount_monthly" DECIMAL(12,2) NOT NULL,
      "amount_annual" DECIMAL(12,2),
      "tax_percentage" DECIMAL(5,2) DEFAULT 18.00,
      "version" INTEGER NOT NULL DEFAULT 1,
      "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      "effective_from" TIMESTAMP(3) NOT NULL,
      "effective_to" TIMESTAMP(3),
      "created_by" VARCHAR(36),
      "approved_by" VARCHAR(36),
      "approved_at" TIMESTAMP(3),
      "published_by" VARCHAR(36),
      "published_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "commercial_price_schedules_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "commercial_price_schedules_product_slug_status_effective_from_idx"
      ON "commercial_price_schedules"("product_slug", "status", "effective_from");
  `);

  // Verification checks
  const colCheck = await prisma.$queryRawUnsafe(`
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'billing_invoices' AND column_name = 'subscription_id';
  `);
  console.log('Verified billing_invoices.subscription_id nullability:', colCheck);

  const subColCheck = await prisma.$queryRawUnsafe(`
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'tenant_subscriptions' AND column_name LIKE '%scheduled%';
  `);
  console.log('Verified tenant_subscriptions scheduled columns count:', subColCheck.length);

  const regclass = await prisma.$queryRawUnsafe(`
    SELECT to_regclass('public.commercial_price_schedules')::text as tbl;
  `);
  console.log('Verified commercial_price_schedules table:', regclass);

  console.log('Phase A3.6 Schema Migration completed successfully.');
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
