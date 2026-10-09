const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function runMigration() {
  console.log('Beginning Phase A3.3 CommerceOrder DDL migration with lock_timeout = 5s...');
  
  await prisma.$executeRawUnsafe(`SET lock_timeout = '5s';`);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "CommerceOrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "CommerceFulfillmentStatus" AS ENUM ('UNFULFILLED', 'FULFILLED', 'FAILED', 'REVERSED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "commerce_orders" (
      "id" VARCHAR(36) NOT NULL,
      "order_number" VARCHAR(50) NOT NULL,
      "tenant_id" VARCHAR(36) NOT NULL,
      "user_id" VARCHAR(36),
      "status" "CommerceOrderStatus" NOT NULL DEFAULT 'DRAFT',
      "fulfillment_status" "CommerceFulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "subtotal" DECIMAL(12,2) NOT NULL,
      "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "taxable_amount" DECIMAL(12,2) NOT NULL,
      "total_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "total_amount" DECIMAL(12,2) NOT NULL,
      "amount_in_paise" INTEGER NOT NULL,
      "price_snapshot" JSONB NOT NULL,
      "coupon_code" VARCHAR(50),
      "idempotency_key" VARCHAR(100),
      "idempotency_payload_hash" VARCHAR(64),
      "version" INTEGER NOT NULL DEFAULT 1,
      "is_simulated" BOOLEAN NOT NULL DEFAULT false,
      "simulation_notes" VARCHAR(255),
      "paid_at" TIMESTAMP(3),
      "fulfilled_at" TIMESTAMP(3),
      "cancelled_at" TIMESTAMP(3),
      "expires_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
    );
  `);

  // Foreign keys
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "commerce_orders"
        ADD CONSTRAINT "commerce_orders_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "commerce_orders"
        ADD CONSTRAINT "commerce_orders_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Indexes
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_order_number_key"
    ON "commerce_orders"("order_number");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_tenant_id_idempotency_key_key"
    ON "commerce_orders"("tenant_id", "idempotency_key");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "commerce_orders_tenant_id_status_created_at_idx"
    ON "commerce_orders"("tenant_id", "status", "created_at");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "commerce_orders_tenant_id_expires_at_idx"
    ON "commerce_orders"("tenant_id", "expires_at");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "commerce_orders_user_id_idx"
    ON "commerce_orders"("user_id");
  `);

  const regclass = await prisma.$queryRawUnsafe(`SELECT to_regclass('public.commerce_orders')::text as tbl;`);
  console.log('Migration verification check:', regclass);
  console.log('Phase A3.3 CommerceOrder DDL migration completed successfully.');
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
