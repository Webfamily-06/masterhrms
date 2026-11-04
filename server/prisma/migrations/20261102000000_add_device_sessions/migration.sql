-- Migration: 20261102000000_add_device_sessions (PostgreSQL 17.11 compatible)
-- Creates the device_sessions table with strict Prisma schema parity and exhaustive drift protection

-- Preflight: Comprehensive validation of existing table, columns, PK, indexes, and FKs
DO $$
DECLARE
    rec RECORD;
    v_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_sessions') THEN
        -- 1. Check total column count
        SELECT COUNT(*) INTO v_count 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'device_sessions';
        
        IF v_count != 18 THEN
            RAISE EXCEPTION 'Schema conflict: table "device_sessions" already exists with % columns (expected 18). Aborting to prevent silent schema drift.', v_count;
        END IF;

        -- 2. Validate all 18 column names, ordinal positions, types, lengths, nullability, and defaults
        FOR rec IN (
            WITH expected(ord, col, dt, max_len, dt_prec, nullable, def_val) AS (
                VALUES
                (1,  'id',                 'character varying',           36,   NULL, 'NO',  NULL),
                (2,  'user_id',            'character varying',           36,   NULL, 'NO',  NULL),
                (3,  'tenant_id',          'character varying',           36,   NULL, 'YES', NULL),
                (4,  'device_name',        'character varying',           255,  NULL, 'YES', NULL),
                (5,  'device_type',        'character varying',           50,   NULL, 'NO',  '''desktop''::character varying'),
                (6,  'browser',            'character varying',           100,  NULL, 'YES', NULL),
                (7,  'operating_system',   'character varying',           100,  NULL, 'YES', NULL),
                (8,  'ip_address',         'character varying',           45,   NULL, 'YES', NULL),
                (9,  'country',            'character varying',           100,  NULL, 'YES', NULL),
                (10, 'city',               'character varying',           100,  NULL, 'YES', NULL),
                (11, 'user_agent',         'text',                        NULL, NULL, 'YES', NULL),
                (12, 'refresh_token_hash', 'character varying',           255,  NULL, 'YES', NULL),
                (13, 'last_active_at',     'timestamp without time zone', NULL, 3,    'YES', NULL),
                (14, 'expires_at',         'timestamp without time zone', NULL, 3,    'YES', NULL),
                (15, 'revoked_at',         'timestamp without time zone', NULL, 3,    'YES', NULL),
                (16, 'revoked',            'boolean',                     NULL, NULL, 'NO',  'false'),
                (17, 'created_at',         'timestamp without time zone', NULL, 3,    'NO',  'CURRENT_TIMESTAMP'),
                (18, 'updated_at',         'timestamp without time zone', NULL, 3,    'NO',  'CURRENT_TIMESTAMP')
            )
            SELECT 
                e.ord, e.col,
                c.column_name, c.data_type, c.character_maximum_length, c.datetime_precision, c.is_nullable, c.column_default,
                e.dt AS exp_dt, e.max_len AS exp_len, e.dt_prec AS exp_prec, e.nullable AS exp_null, e.def_val AS exp_def
            FROM expected e
            LEFT JOIN information_schema.columns c 
              ON c.table_schema = 'public' 
             AND c.table_name = 'device_sessions' 
             AND c.ordinal_position = e.ord
        ) LOOP
            IF rec.column_name IS NULL OR rec.column_name != rec.col THEN
                RAISE EXCEPTION 'Schema conflict: column at position % is "%" (expected "%").', rec.ord, rec.column_name, rec.col;
            END IF;
            IF rec.data_type != rec.exp_dt THEN
                RAISE EXCEPTION 'Schema conflict: column "%" data_type is "%" (expected "%").', rec.col, rec.data_type, rec.exp_dt;
            END IF;
            IF rec.exp_len IS NOT NULL AND rec.character_maximum_length != rec.exp_len THEN
                RAISE EXCEPTION 'Schema conflict: column "%" character_maximum_length is % (expected %).', rec.col, rec.character_maximum_length, rec.exp_len;
            END IF;
            IF rec.exp_prec IS NOT NULL AND rec.datetime_precision != rec.exp_prec THEN
                RAISE EXCEPTION 'Schema conflict: column "%" datetime_precision is % (expected %).', rec.col, rec.datetime_precision, rec.exp_prec;
            END IF;
            IF rec.is_nullable != rec.exp_null THEN
                RAISE EXCEPTION 'Schema conflict: column "%" is_nullable is "%" (expected "%").', rec.col, rec.is_nullable, rec.exp_null;
            END IF;
            IF rec.exp_def IS NOT NULL AND (rec.column_default IS NULL OR rec.column_default != rec.exp_def) THEN
                RAISE EXCEPTION 'Schema conflict: column "%" column_default is "%" (expected "%").', rec.col, rec.column_default, rec.exp_def;
            END IF;
        END LOOP;

        -- 3. Validate Primary Key
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON true
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = u.attnum
            WHERE n.nspname = 'public' 
              AND t.relname = 'device_sessions'
              AND c.conname = 'device_sessions_pkey'
              AND c.contype = 'p'
              AND a.attname = 'id'
              AND u.attposition = 1
        ) THEN
            RAISE EXCEPTION 'Schema conflict: primary key "device_sessions_pkey" on (id) is missing or incompatible.';
        END IF;

        -- 4. Validate Secondary Indexes (if they exist)
        FOR rec IN (
            WITH expected_idx(name, cols, is_uniq) AS (
                VALUES
                ('device_sessions_user_id_idx',            'user_id',            false),
                ('device_sessions_user_id_revoked_idx',    'user_id, revoked',    false),
                ('device_sessions_tenant_id_idx',          'tenant_id',          false),
                ('device_sessions_refresh_token_hash_idx', 'refresh_token_hash', false)
            )
            SELECT 
                e.name AS exp_name, e.cols AS exp_cols, e.is_uniq AS exp_uniq,
                ci.relname AS act_name,
                am.amname AS act_am,
                i.indisunique AS act_uniq,
                i.indisvalid AS act_valid,
                i.indisready AS act_ready,
                string_agg(a.attname, ', ' ORDER BY u.attposition) AS act_cols
            FROM expected_idx e
            LEFT JOIN pg_class ci ON ci.relname = e.name
            LEFT JOIN pg_index i ON i.indexrelid = ci.oid
            LEFT JOIN pg_class ct ON ct.oid = i.indrelid
            LEFT JOIN pg_am am ON am.oid = ci.relam
            LEFT JOIN pg_namespace n ON n.oid = ct.relnamespace AND n.nspname = 'public'
            LEFT JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS u(attnum, attposition) ON true
            LEFT JOIN pg_attribute a ON a.attrelid = ct.oid AND a.attnum = u.attnum
            GROUP BY e.name, e.cols, e.is_uniq, ci.relname, am.amname, i.indisunique, i.indisvalid, i.indisready
        ) LOOP
            IF rec.act_name IS NOT NULL THEN
                IF rec.act_am != 'btree' THEN
                    RAISE EXCEPTION 'Index conflict for "%": access method is "%" (expected "btree").', rec.exp_name, rec.act_am;
                END IF;
                IF rec.act_uniq != rec.exp_uniq THEN
                    RAISE EXCEPTION 'Index conflict for "%": indisunique is % (expected %).', rec.exp_name, rec.act_uniq, rec.exp_uniq;
                END IF;
                IF NOT rec.act_valid THEN
                    RAISE EXCEPTION 'Index conflict for "%": indisvalid is false (invalid index).', rec.exp_name;
                END IF;
                IF NOT rec.act_ready THEN
                    RAISE EXCEPTION 'Index conflict for "%": indisready is false (not ready).', rec.exp_name;
                END IF;
                IF rec.act_cols != rec.exp_cols THEN
                    RAISE EXCEPTION 'Index conflict for "%": indexed columns are "%" (expected "%").', rec.exp_name, rec.act_cols, rec.exp_cols;
                END IF;
            END IF;
        END LOOP;

        -- 5. Validate Foreign Keys (if they exist)
        -- Foreign Key 1: device_sessions_user_id_fkey
        IF EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public' AND t.relname = 'device_sessions'
              AND c.conname = 'device_sessions_user_id_fkey'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint c
                JOIN pg_class cl_source ON cl_source.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = cl_source.relnamespace
                JOIN pg_class cl_target ON cl_target.oid = c.confrelid
                JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, attpos) ON true
                JOIN pg_attribute att_src ON att_src.attrelid = c.conrelid AND att_src.attnum = u.attnum
                JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS uf(attnum, attpos) ON u.attpos = uf.attpos
                JOIN pg_attribute att_tgt ON att_tgt.attrelid = c.confrelid AND att_tgt.attnum = uf.attnum
                WHERE n.nspname = 'public'
                  AND cl_source.relname = 'device_sessions'
                  AND c.conname = 'device_sessions_user_id_fkey'
                  AND c.contype = 'f'
                  AND cl_target.relname = 'users'
                  AND att_src.attname = 'user_id'
                  AND att_tgt.attname = 'id'
                  AND c.confdeltype = 'c'
                  AND c.confupdtype = 'c'
            ) THEN
                RAISE EXCEPTION 'Constraint conflict: existing "device_sessions_user_id_fkey" does not match exact specification (source=user_id, target=users.id, ON DELETE CASCADE, ON UPDATE CASCADE).';
            END IF;
        END IF;

        -- Foreign Key 2: device_sessions_tenant_id_fkey
        IF EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public' AND t.relname = 'device_sessions'
              AND c.conname = 'device_sessions_tenant_id_fkey'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint c
                JOIN pg_class cl_source ON cl_source.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = cl_source.relnamespace
                JOIN pg_class cl_target ON cl_target.oid = c.confrelid
                JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, attpos) ON true
                JOIN pg_attribute att_src ON att_src.attrelid = c.conrelid AND att_src.attnum = u.attnum
                JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS uf(attnum, attpos) ON u.attpos = uf.attpos
                JOIN pg_attribute att_tgt ON att_tgt.attrelid = c.confrelid AND att_tgt.attnum = uf.attnum
                WHERE n.nspname = 'public'
                  AND cl_source.relname = 'device_sessions'
                  AND c.conname = 'device_sessions_tenant_id_fkey'
                  AND c.contype = 'f'
                  AND cl_target.relname = 'tenants'
                  AND att_src.attname = 'tenant_id'
                  AND att_tgt.attname = 'id'
                  AND c.confdeltype = 'n'
                  AND c.confupdtype = 'c'
            ) THEN
                RAISE EXCEPTION 'Constraint conflict: existing "device_sessions_tenant_id_fkey" does not match exact specification (source=tenant_id, target=tenants.id, ON DELETE SET NULL, ON UPDATE CASCADE).';
            END IF;
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
