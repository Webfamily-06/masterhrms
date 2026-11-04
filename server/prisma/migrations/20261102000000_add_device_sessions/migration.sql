-- Migration: 20261102000000_add_device_sessions (PostgreSQL 17 compatible)
-- Creates the device_sessions table with Prisma schema parity

CREATE TABLE IF NOT EXISTS "device_sessions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "tenant_id" VARCHAR(36),
    "device_name" VARCHAR(255),
    "device_type" VARCHAR(50) NOT NULL DEFAULT 'desktop',
    "browser" VARCHAR(100),
    "operating_system" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "user_agent" TEXT,
    "refresh_token_hash" VARCHAR(255),
    "last_active_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_idx" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_revoked_idx" ON "device_sessions"("user_id", "revoked");
CREATE INDEX IF NOT EXISTS "device_sessions_tenant_id_idx" ON "device_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "device_sessions_refresh_token_hash_idx" ON "device_sessions"("refresh_token_hash");

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_user_id_fkey') THEN
        ALTER TABLE "device_sessions" 
            ADD CONSTRAINT "device_sessions_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_tenant_id_fkey') THEN
        ALTER TABLE "device_sessions" 
            ADD CONSTRAINT "device_sessions_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
