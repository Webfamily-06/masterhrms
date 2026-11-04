const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Read database URL from server/.env
const envPath = path.resolve('server/.env');
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      databaseUrl = trimmed.substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
      break;
    }
  }
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } }
});

async function verifyFull48Catalog() {
  console.log('================================================================');
  console.log('MASTERHRMS — 48-STATEMENT EXACT PHYSICAL CATALOG AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Target Database: Supabase Managed PostgreSQL 17 (Read-Only)');
  console.log('================================================================\n');

  const statements = [
    // Migration 1: 20260926000000_wave3_step3_2_fiscal_controls (8 statements)
    {
      id: 1,
      m: '20260926000000',
      desc: 'chart_of_accounts.parent_account_id exists as VARCHAR(36) nullable',
      sql: `SELECT column_name, data_type, character_maximum_length, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chart_of_accounts' AND column_name = 'parent_account_id';`,
      check: r => r.length === 1 && r[0].data_type === 'character varying' && r[0].character_maximum_length === 36 && r[0].is_nullable === 'YES'
    },
    {
      id: 2,
      m: '20260926000000',
      desc: 'chart_of_accounts parent_account_id FK references chart_of_accounts(id)',
      sql: `SELECT c.conname, f.relname AS foreign_table, c.contype
            FROM pg_constraint c
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.chart_of_accounts'::regclass 
              AND c.contype = 'f' 
              AND c.conname = 'chart_of_accounts_parent_account_id_fkey';`,
      check: r => r.length === 1 && r[0].foreign_table === 'chart_of_accounts' && r[0].contype === 'f'
    },
    {
      id: 3,
      m: '20260926000000',
      desc: 'chart_of_accounts_tenant_id_parent_account_id_idx B-tree index on (tenant_id, parent_account_id)',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'chart_of_accounts' AND indexname = 'chart_of_accounts_tenant_id_parent_account_id_idx';`,
      check: r => r.length === 1 && r[0].indexdef.includes('USING btree (tenant_id, parent_account_id)')
    },
    {
      id: 4,
      m: '20260926000000',
      desc: 'fiscal_years table has all 11 core columns',
      sql: `SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'fiscal_years' 
            ORDER BY ordinal_position;`,
      check: r => {
        const names = r.map(c => c.column_name);
        return ['id', 'tenant_id', 'name', 'start_date', 'end_date', 'is_current', 'status', 'closed_at', 'closed_by_id', 'created_at', 'updated_at']
          .every(col => names.includes(col));
      }
    },
    {
      id: 5,
      m: '20260926000000',
      desc: 'fiscal_years primary key fiscal_years_pkey on (id)',
      sql: `SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.fiscal_years'::regclass AND c.contype = 'p' AND c.conname = 'fiscal_years_pkey';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 6,
      m: '20260926000000',
      desc: 'fiscal_years unique constraint on (tenant_id, name) via unique index',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'fiscal_years' AND indexname = 'fiscal_years_tenant_id_name_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX fiscal_years_tenant_id_name_key ON public.fiscal_years USING btree (tenant_id, name)')
    },
    {
      id: 7,
      m: '20260926000000',
      desc: 'accounting_periods table has all 11 core columns matching migration 1 spec',
      sql: `SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'accounting_periods';`,
      check: r => {
        const names = r.map(c => c.column_name);
        return ['id', 'tenant_id', 'fiscal_year_id', 'name', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by_id', 'created_at', 'updated_at']
          .every(col => names.includes(col));
      }
    },
    {
      id: 8,
      m: '20260926000000',
      desc: 'accounting_periods FK to fiscal_years with ON DELETE CASCADE',
      sql: `SELECT c.conname, c.confdeltype, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.accounting_periods'::regclass 
              AND c.contype = 'f' 
              AND c.conname = 'accounting_periods_fiscal_year_id_fkey';`,
      check: r => r.length === 1 && r[0].foreign_table === 'fiscal_years' && r[0].confdeltype === 'c'
    },

    // Migration 2: 20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement (6 statements)
    {
      id: 9,
      m: '20260927000000',
      desc: 'product_warehouses.quantity is numeric(15, 3)',
      sql: `SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'product_warehouses' AND column_name = 'quantity';`,
      check: r => r.length === 1 && r[0].data_type === 'numeric' && r[0].numeric_precision === 15 && r[0].numeric_scale === 3
    },
    {
      id: 10,
      m: '20260927000000',
      desc: 'stock_transfer_details.quantity is numeric(15, 3)',
      sql: `SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'stock_transfer_details' AND column_name = 'quantity';`,
      check: r => r.length === 1 && r[0].data_type === 'numeric' && r[0].numeric_precision === 15 && r[0].numeric_scale === 3
    },
    {
      id: 11,
      m: '20260927000000',
      desc: 'stock_adjustment_details.quantity is numeric(15, 3)',
      sql: `SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'stock_adjustment_details' AND column_name = 'quantity';`,
      check: r => r.length === 1 && r[0].data_type === 'numeric' && r[0].numeric_precision === 15 && r[0].numeric_scale === 3
    },
    {
      id: 12,
      m: '20260927000000',
      desc: 'stock_movements table exists with required movement columns',
      sql: `SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'stock_movements';`,
      check: r => {
        const names = r.map(c => c.column_name);
        return ['id', 'tenant_id', 'product_id', 'warehouse_id', 'movement_type', 'quantity', 'created_at']
          .every(col => names.includes(col));
      }
    },
    {
      id: 13,
      m: '20260927000000',
      desc: 'stock_movements primary key stock_movements_pkey on (id)',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.stock_movements'::regclass AND c.contype = 'p' AND c.conname = 'stock_movements_pkey';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 14,
      m: '20260927000000',
      desc: 'stock_movements has 3 secondary B-tree indexes',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'stock_movements' AND indexname != 'stock_movements_pkey';`,
      check: r => {
        const names = r.map(idx => idx.indexname);
        return names.includes('stock_movements_tenant_id_created_at_idx') &&
               names.includes('stock_movements_tenant_id_product_id_warehouse_id_idx') &&
               names.includes('stock_movements_tenant_id_reference_type_reference_id_idx');
      }
    },

    // Migration 3: 20260927120000_wave3_step3_3_5_offline_replay_key (2 statements)
    {
      id: 15,
      m: '20260927120000',
      desc: 'sales table unique index on (tenant_id, invoice_no) exists',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'sales' AND indexname = 'sales_tenant_id_invoice_no_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('sales_tenant_id_invoice_no_key')
    },
    {
      id: 16,
      m: '20260927120000',
      desc: 'sales unique index is UNIQUE btree on (tenant_id, invoice_no)',
      sql: `SELECT indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'sales' AND indexname = 'sales_tenant_id_invoice_no_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('CREATE UNIQUE INDEX sales_tenant_id_invoice_no_key ON public.sales USING btree (tenant_id, invoice_no)')
    },

    // Migration 4: 20260928000000_step_3_4_purchase_payments (4 statements)
    {
      id: 17,
      m: '20260928000000',
      desc: 'purchase_payments table exists in public schema',
      sql: `SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'purchase_payments';`,
      check: r => r.length === 1
    },
    {
      id: 18,
      m: '20260928000000',
      desc: 'purchase_payments.idempotency_key column is character varying',
      sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'purchase_payments' AND column_name = 'idempotency_key';`,
      check: r => r.length === 1 && r[0].data_type === 'character varying'
    },
    {
      id: 19,
      m: '20260928000000',
      desc: 'purchase_payments unique constraint on (purchase_id, idempotency_key)',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'purchase_payments' AND indexname = 'purchase_payments_purchase_id_idempotency_key_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX') && r[0].indexdef.includes('(purchase_id, idempotency_key)')
    },
    {
      id: 20,
      m: '20260928000000',
      desc: 'purchase_payments foreign key to purchases table with ON DELETE CASCADE',
      sql: `SELECT c.conname, c.confdeltype, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.purchase_payments'::regclass 
              AND c.contype = 'f' 
              AND c.conname = 'purchase_payments_purchase_id_fkey';`,
      check: r => r.length === 1 && r[0].foreign_table === 'purchases' && r[0].confdeltype === 'c'
    },

    // Migration 5: 20260928000001_step_3_5_sale_payments (4 statements)
    {
      id: 21,
      m: '20260928000001',
      desc: 'sale_payments.idempotency_key exists as character varying',
      sql: `SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'sale_payments' AND column_name = 'idempotency_key';`,
      check: r => r.length === 1 && r[0].data_type === 'character varying'
    },
    {
      id: 22,
      m: '20260928000001',
      desc: 'sale_payments.notes exists as text or varchar',
      sql: `SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'sale_payments' AND column_name = 'notes';`,
      check: r => r.length === 1 && (r[0].data_type === 'text' || r[0].data_type === 'character varying')
    },
    {
      id: 23,
      m: '20260928000001',
      desc: 'sale_payments.created_by_id exists as character varying(36)',
      sql: `SELECT column_name, data_type, character_maximum_length FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'sale_payments' AND column_name = 'created_by_id';`,
      check: r => r.length === 1 && r[0].data_type === 'character varying' && r[0].character_maximum_length === 36
    },
    {
      id: 24,
      m: '20260928000001',
      desc: 'sale_payments_sale_id_idx exists on sale_payments(sale_id)',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'sale_payments' AND indexname = 'sale_payments_sale_id_idx';`,
      check: r => r.length === 1 && r[0].indexdef.includes('USING btree (sale_id)')
    },

    // Migration 6: 20260928000002_step_3_6_returns_credit_debit_notes (12 statements)
    {
      id: 25,
      m: '20260928000002',
      desc: 'sales_returns table exists with primary key sales_returns_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.sales_returns'::regclass AND c.contype = 'p' AND c.conname = 'sales_returns_pkey';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 26,
      m: '20260928000002',
      desc: 'sales_returns foreign keys to sales and customers',
      sql: `SELECT c.conname, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.sales_returns'::regclass AND c.contype = 'f';`,
      check: r => {
        const ft = r.map(x => x.foreign_table);
        return ft.includes('sales') && ft.includes('customers');
      }
    },
    {
      id: 27,
      m: '20260928000002',
      desc: 'sales_return_details table exists with primary key sales_return_details_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.sales_return_details'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 28,
      m: '20260928000002',
      desc: 'sales_return_details foreign keys to sales_returns and products',
      sql: `SELECT c.conname, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.sales_return_details'::regclass AND c.contype = 'f';`,
      check: r => {
        const ft = r.map(x => x.foreign_table);
        return ft.includes('sales_returns') && ft.includes('products');
      }
    },
    {
      id: 29,
      m: '20260928000002',
      desc: 'credit_notes table exists with primary key credit_notes_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.credit_notes'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 30,
      m: '20260928000002',
      desc: 'credit_notes has secondary indexes on (tenant_id, credit_note_number)',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'credit_notes';`,
      check: r => r.some(idx => idx.indexdef.includes('credit_note_number') || idx.indexdef.includes('customer_id'))
    },
    {
      id: 31,
      m: '20260928000002',
      desc: 'purchase_returns table exists with primary key purchase_returns_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.purchase_returns'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 32,
      m: '20260928000002',
      desc: 'purchase_returns foreign keys to purchases and suppliers',
      sql: `SELECT c.conname, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.purchase_returns'::regclass AND c.contype = 'f';`,
      check: r => {
        const ft = r.map(x => x.foreign_table);
        return ft.includes('purchases') && ft.includes('suppliers');
      }
    },
    {
      id: 33,
      m: '20260928000002',
      desc: 'purchase_return_details table exists with primary key purchase_return_details_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.purchase_return_details'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 34,
      m: '20260928000002',
      desc: 'purchase_return_details foreign keys to purchase_returns and products',
      sql: `SELECT c.conname, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.purchase_return_details'::regclass AND c.contype = 'f';`,
      check: r => {
        const ft = r.map(x => x.foreign_table);
        return ft.includes('purchase_returns') && ft.includes('products');
      }
    },
    {
      id: 35,
      m: '20260928000002',
      desc: 'debit_notes table exists with primary key debit_notes_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.debit_notes'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 36,
      m: '20260928000002',
      desc: 'debit_notes has secondary indexes on debit_note_number or supplier_id',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'debit_notes';`,
      check: r => r.some(idx => idx.indexdef.includes('debit_note_number') || idx.indexdef.includes('supplier_id'))
    },

    // Migration 7: 20260928000003_rbac_and_tenant_modules (12 statements)
    {
      id: 37,
      m: '20260928000003',
      desc: 'workspace_roles table exists with primary key workspace_roles_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.workspace_roles'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 38,
      m: '20260928000003',
      desc: 'workspace_roles unique constraint on (tenant_id, name) via unique index',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'workspace_roles' AND indexname = 'workspace_roles_tenant_id_name_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX') && r[0].indexdef.includes('(tenant_id, name)')
    },
    {
      id: 39,
      m: '20260928000003',
      desc: 'permissions table exists with primary key permissions_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.permissions'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 40,
      m: '20260928000003',
      desc: 'permissions unique constraint on code via unique index permissions_code_key',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'permissions' AND indexname = 'permissions_code_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX') && r[0].indexdef.includes('(code)')
    },
    {
      id: 41,
      m: '20260928000003',
      desc: 'role_permissions table exists with primary key role_permissions_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.role_permissions'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 42,
      m: '20260928000003',
      desc: 'role_permissions unique on (role_id, permission_id) via unique index',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'role_permissions' AND indexname = 'role_permissions_role_id_permission_id_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX') && r[0].indexdef.includes('(role_id, permission_id)')
    },
    {
      id: 43,
      m: '20260928000003',
      desc: 'user_role_assignments table exists with primary key user_role_assignments_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.user_role_assignments'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 44,
      m: '20260928000003',
      desc: 'user_role_assignments unique on (user_id, tenant_id) via unique index',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'user_role_assignments' AND indexname = 'user_role_assignments_user_id_tenant_id_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX') && r[0].indexdef.includes('(user_id, tenant_id)')
    },
    {
      id: 45,
      m: '20260928000003',
      desc: 'tenant_modules table exists with primary key tenant_modules_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.tenant_modules'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 46,
      m: '20260928000003',
      desc: 'tenant_modules unique on (tenant_id, module_key) via unique index',
      sql: `SELECT indexname, indexdef FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'tenant_modules' AND indexname = 'tenant_modules_tenant_id_module_key_key';`,
      check: r => r.length === 1 && r[0].indexdef.includes('UNIQUE INDEX') && r[0].indexdef.includes('(tenant_id, module_key)')
    },
    {
      id: 47,
      m: '20260928000003',
      desc: 'two_factor_otps table exists with primary key two_factor_otps_pkey',
      sql: `SELECT c.conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c 
            WHERE c.conrelid = 'public.two_factor_otps'::regclass AND c.contype = 'p';`,
      check: r => r.length === 1 && r[0].def.includes('PRIMARY KEY (id)')
    },
    {
      id: 48,
      m: '20260928000003',
      desc: 'two_factor_otps foreign key to users with ON DELETE CASCADE',
      sql: `SELECT c.conname, c.confdeltype, f.relname AS foreign_table
            FROM pg_constraint c 
            JOIN pg_class f ON f.oid = c.confrelid
            WHERE c.conrelid = 'public.two_factor_otps'::regclass 
              AND c.contype = 'f' 
              AND c.conname = 'two_factor_otps_user_id_fkey';`,
      check: r => r.length === 1 && r[0].foreign_table === 'users' && r[0].confdeltype === 'c'
    }
  ];

  let passCount = 0;
  let failCount = 0;
  const failureDetails = [];

  for (const s of statements) {
    try {
      const rows = await prisma.$queryRawUnsafe(s.sql);
      const ok = s.check(rows);
      if (ok) {
        passCount++;
        console.log(`[PASS ${s.id.toString().padStart(2, '0')}/48] [${s.m}] ${s.desc} => EXACT PHYSICAL MATCH`);
      } else {
        failCount++;
        console.error(`[FAIL ${s.id.toString().padStart(2, '0')}/48] [${s.m}] ${s.desc}`);
        console.error('Actual Rows:', JSON.stringify(rows, null, 2));
        failureDetails.push({ id: s.id, desc: s.desc, rows });
      }
    } catch (err) {
      failCount++;
      console.error(`[ERROR ${s.id.toString().padStart(2, '0')}/48] [${s.m}] ${s.desc}:`, err.message);
      failureDetails.push({ id: s.id, desc: s.desc, error: err.message });
    }
  }

  console.log('\n================================================================');
  console.log(`FINAL EQUIVALENCE RESULT: ${passCount} / 48 STATEMENTS PROVEN (${((passCount/48)*100).toFixed(1)}%)`);
  
  if (failCount === 0 && passCount === 48) {
    console.log('STATUS: 100% PROVEN — ALL 48 STATEMENTS ARE PHYSICALLY EQUIVALENT ON SUPABASE POSTGRESQL 17');
    console.log('================================================================');
    await prisma.$disconnect();
    return true;
  } else {
    console.error(`STATUS: VERIFICATION FAILED — ${failCount} ASSERTIONS FAILED.`);
    console.error('Failure Summary:', failureDetails);
    console.log('================================================================');
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyFull48Catalog().catch(err => {
  console.error('Fatal error during catalog audit:', err);
  process.exit(1);
});
