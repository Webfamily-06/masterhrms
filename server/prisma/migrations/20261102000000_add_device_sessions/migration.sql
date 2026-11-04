-- Migration: 20261102000000_add_device_sessions (PostgreSQL 17.11 compatible)
-- Creates the device_sessions table with strict Prisma schema parity and drift protection

-- Preflight: Guard against incompatible existing table
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_sessions') THEN
        SELECT COUNT(*) INTO col_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'device_sessions';
        
        IF col_count != 18 THEN
            RAISE EXCEPTION 'Schema conflict: table "device_sessions" already exists with % columns (expected 18). Aborting to prevent silent schema drift.', col_count;
        END IF;
    END IF;
END $$;

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
    -- Note on "updated_at": Prisma schema specifies @updatedAt which is handled application-side
    -- by Prisma Client on update operations. DEFAULT CURRENT_TIMESTAMP guarantees safe raw SQL inserts.
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- Preflight Index Def Checks: Ensure no conflicting incompatible indexes exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'device_sessions' 
          AND indexname = 'device_sessions_user_id_idx' 
          AND indexdef NOT LIKE '%(user_id)%'
    ) THEN
        RAISE EXCEPTION 'Conflicting index definition detected for "device_sessions_user_id_idx".';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'device_sessions' 
          AND indexname = 'device_sessions_user_id_revoked_idx' 
          AND indexdef NOT LIKE '%(user_id, revoked)%'
    ) THEN
        RAISE EXCEPTION 'Conflicting index definition detected for "device_sessions_user_id_revoked_idx".';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'device_sessions' 
          AND indexname = 'device_sessions_tenant_id_idx' 
          AND indexdef NOT LIKE '%(tenant_id)%'
    ) THEN
        RAISE EXCEPTION 'Conflicting index definition detected for "device_sessions_tenant_id_idx".';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'device_sessions' 
          AND indexname = 'device_sessions_refresh_token_hash_idx' 
          AND indexdef NOT LIKE '%(refresh_token_hash)%'
    ) THEN
        RAISE EXCEPTION 'Conflicting index definition detected for "device_sessions_refresh_token_hash_idx".';
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_idx" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_revoked_idx" ON "device_sessions"("user_id", "revoked");
CREATE INDEX IF NOT EXISTS "device_sessions_tenant_id_idx" ON "device_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "device_sessions_refresh_token_hash_idx" ON "device_sessions"("refresh_token_hash");

-- Foreign Keys (Strictly scoped to public.device_sessions and target tables)
DO $$
BEGIN
    -- Foreign Key 1: device_sessions_user_id_fkey -> users(id) ON DELETE CASCADE
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'device_sessions'
          AND c.conname = 'device_sessions_user_id_fkey'
          AND c.contype = 'f'
          AND c.confrelid = 'public.users'::regclass
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_user_id_fkey') THEN
            RAISE EXCEPTION 'Constraint "device_sessions_user_id_fkey" already exists with conflicting definition.';
        END IF;

        ALTER TABLE "device_sessions" 
            ADD CONSTRAINT "device_sessions_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign Key 2: device_sessions_tenant_id_fkey -> tenants(id) ON DELETE SET NULL
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'device_sessions'
          AND c.conname = 'device_sessions_tenant_id_fkey'
          AND c.contype = 'f'
          AND c.confrelid = 'public.tenants'::regclass
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_tenant_id_fkey') THEN
            RAISE EXCEPTION 'Constraint "device_sessions_tenant_id_fkey" already exists with conflicting definition.';
        END IF;

        ALTER TABLE "device_sessions" 
            ADD CONSTRAINT "device_sessions_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
