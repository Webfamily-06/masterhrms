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

async function inspectProduction() {
  console.log('================================================================');
  console.log('MASTERHRMS — READ-ONLY SUPABASE PRODUCTION CATALOG AUDIT');
  console.log('Database URL Target: aws-0-ap-south-1.pooler.supabase.com:6543');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  // 1. Version
  const versionRes = await prisma.$queryRawUnsafe('SELECT version();');
  console.log('1. Supabase PostgreSQL Version:');
  console.log(versionRes[0].version, '\n');

  // 2. Migration Tracking Table (_prisma_migrations)
  const migrationTableExists = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name = '_prisma_migrations';
  `);
  console.log('2. _prisma_migrations Tracking Table:');
  if (migrationTableExists.length > 0) {
    const migrationRows = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name, finished_at, rolled_back_at, applied_steps_count 
      FROM _prisma_migrations ORDER BY finished_at ASC;
    `);
    console.log(`Found ${migrationRows.length} recorded migration(s):`);
    console.table(migrationRows);
  } else {
    console.log('_prisma_migrations table does NOT exist in production yet.\n');
  }

  // 3. device_sessions Existence
  const dsExists = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name = 'device_sessions';
  `);
  console.log('3. device_sessions Existence:');
  console.log(dsExists.length > 0 ? 'EXISTS' : 'DOES NOT EXIST (Expected prior to Migration 8)\n');

  // 4. employees Columns
  const empCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'employees' 
    ORDER BY ordinal_position;
  `);
  console.log(`4. employees Columns (${empCols.length} columns found):`);
  const empColNames = empCols.map(c => c.column_name);
  console.log(empColNames.join(', '));
  // Target columns in Prisma Employee model:
  const expectedCols = [
    'pan_number', 'aadhaar_number', 'uan_number', 'pf_number', 'esi_number',
    'bank_name', 'bank_account_no', 'bank_ifsc', 'bank_branch',
    'payment_mode', 'emergency_contact_name', 'emergency_contact_phone',
    'blood_group', 'marital_status', 'physically_challenged',
    'probation_period_months', 'notice_period_days'
  ];
  const missingCols = expectedCols.filter(c => !empColNames.includes(c));
  console.log(`Missing target columns (${missingCols.length}):`, missingCols.join(', '), '\n');

  // 5. branches Geofencing Columns
  const branchCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name IN ('latitude', 'longitude', 'geofence_radius');
  `);
  console.log('5. branches Geofencing Columns:');
  console.table(branchCols);
  console.log('');

  // 6. leave_requests days Physical Type and Count
  const leaveCol = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, numeric_precision, numeric_scale, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'days';
  `);
  const leaveCount = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM leave_requests;`);
  console.log('6. leave_requests.days Spec & Count:');
  console.table(leaveCol);
  console.log(`Row count: ${leaveCount[0].count} rows\n`);

  // 7. Financial Idempotency Indexes & Preflight Duplicate Checks
  const finIndexes = await prisma.$queryRawUnsafe(`
    SELECT c.relname as indexname, i.indisvalid, pg_get_indexdef(i.indexrelid) as indexdef
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname IN ('uq_journal_entries_tenant_payroll_run', 'uq_loan_installments_loan_payroll_run');
  `);
  console.log('7. Financial Idempotency Indexes (with indisvalid check):');
  console.log(`Found ${finIndexes.length} index(es):`);
  console.table(finIndexes);

  const glDups = await prisma.$queryRawUnsafe(`
    SELECT tenant_id, reference, count(*) as cnt
    FROM journal_entries 
    WHERE reference_type = 'payroll' AND reference IS NOT NULL 
    GROUP BY tenant_id, reference HAVING count(*) > 1;
  `);
  console.log(`Preflight GL Duplicates (reference_type='payroll'): ${glDups.length} duplicates found.`);

  const loanDups = await prisma.$queryRawUnsafe(`
    SELECT loan_id, payroll_run_id, count(*) as cnt
    FROM loan_installments 
    WHERE payroll_run_id IS NOT NULL 
    GROUP BY loan_id, payroll_run_id HAVING count(*) > 1;
  `);
  console.log(`Preflight Loan Duplicates (payroll_run_id IS NOT NULL): ${loanDups.length} duplicates found.\n`);

  // 8. RLS State for Core Tables
  const rlsState = await prisma.$queryRawUnsafe(`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname IN ('employees', 'leave_requests', 'journal_entries', 'loan_installments', 'branches', 'users', 'tenants')
    ORDER BY c.relname;
  `);
  console.log('8. Row Level Security (RLS) State:');
  console.table(rlsState);

  await prisma.$disconnect();
}

inspectProduction().catch(err => {
  console.error('Production audit error:', err);
  process.exit(1);
});
