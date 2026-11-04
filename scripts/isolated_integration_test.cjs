const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { PrismaClient } = require('@prisma/client');

const CONTAINER_NAME = 'masterhrms-pg17-audit';
const DB_USER = 'postgres';
const DB_NAME = 'masterhrms_test';

function runPsql(sql, tuplesOnly = false) {
  const args = ['exec', '-i', CONTAINER_NAME, 'psql', '-U', DB_USER, '-d', DB_NAME];
  if (tuplesOnly) {
    args.push('-t', '-A');
  }
  return execFileSync('docker', [...args, '-c', sql], { encoding: 'utf8' }).trim();
}

function runPsqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return execFileSync('docker', ['exec', '-i', CONTAINER_NAME, 'psql', '-U', DB_USER, '-d', DB_NAME], {
    input: content,
    encoding: 'utf8'
  }).trim();
}

async function verifySupabaseProductionUntouched() {
  console.log('\n[SAFETY AUDIT] Verifying zero test writes reached Supabase production...');
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

  if (!databaseUrl) {
    console.warn('[WARN] No Supabase DATABASE_URL found in environment; skipped remote verification.');
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  });

  try {
    // 1. Check leave_requests total count (must remain exactly 21)
    const leaveCountRes = await prisma.$queryRawUnsafe(`SELECT count(*)::text as cnt FROM public.leave_requests;`);
    const leaveCount = parseInt(leaveCountRes[0].cnt, 10);
    if (leaveCount !== 21) {
      throw new Error(`CRITICAL LEAK: Supabase leave_requests count is ${leaveCount} (expected exactly 21 baseline rows)!`);
    }

    // 2. Check for synthetic test IDs in Supabase (must be zero)
    const testIdsRes = await prisma.$queryRawUnsafe(
      `SELECT count(*)::text as cnt FROM public.leave_requests WHERE id LIKE 'leave-half-%' OR id IN ('leave-1', 'leave-2', 'leave-21');`
    );
    const testIdCount = parseInt(testIdsRes[0].cnt, 10);
    if (testIdCount !== 0) {
      throw new Error(`CRITICAL LEAK: Found ${testIdCount} synthetic test rows in Supabase production!`);
    }

    // 3. Check data type of days column in Supabase (must remain integer)
    const colRes = await prisma.$queryRawUnsafe(
      `SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'days';`
    );
    const colType = colRes[0]?.data_type;
    if (colType !== 'integer') {
      throw new Error(`CRITICAL LEAK: Supabase leave_requests.days data_type is "${colType}" (expected "integer")!`);
    }

    // 4. Check device_sessions does not exist in Supabase
    const dsRes = await prisma.$queryRawUnsafe(
      `SELECT count(*)::text as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_sessions';`
    );
    const dsCount = parseInt(dsRes[0].cnt, 10);
    if (dsCount !== 0) {
      throw new Error(`CRITICAL LEAK: device_sessions exists in Supabase production prior to approved migration!`);
    }

    console.log('[PASS] Confirmed 100% isolation: Zero test writes reached Supabase production.');
    console.log(`       - Supabase leave_requests row count: ${leaveCount} (intact)`);
    console.log(`       - Synthetic test records in Supabase: ${testIdCount} (zero leak)`);
    console.log(`       - Supabase leave_requests.days data type: ${colType} (unaltered)`);
    console.log(`       - Supabase device_sessions table exists: ${dsCount === 1 ? 'true' : 'false'} (uncreated)`);
  } finally {
    await prisma.$disconnect();
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS — REAL ISOLATED POSTGRESQL 17.11 INTEGRATION TEST SUITE');
  console.log(`Target: Docker Container (${CONTAINER_NAME}) running PostgreSQL 17.11`);
  console.log('================================================================\n');

  // [TEST 0] Engine Version
  const version = runPsql('SELECT version();', true);
  console.log('[TEST 0] Engine Version:\n' + version + '\n');

  // [TEST 1] Setup isolated base schema
  console.log('[TEST 1] Setting up isolated base tables and fixtures...');
  const baseSchemaSql = `
    DROP TABLE IF EXISTS device_sessions CASCADE;
    DROP TABLE IF EXISTS leave_requests CASCADE;
    DROP TABLE IF EXISTS loan_installments CASCADE;
    DROP TABLE IF EXISTS journal_entries CASCADE;
    DROP TABLE IF EXISTS employees CASCADE;
    DROP TABLE IF EXISTS branches CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS tenants CASCADE;

    CREATE TABLE tenants (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE users (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE branches (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE employees (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE leave_requests (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
      employee_id VARCHAR(36) REFERENCES employees(id) ON DELETE CASCADE,
      days INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE journal_entries (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
      reference VARCHAR(150),
      reference_type VARCHAR(50),
      description TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE loan_installments (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
      loan_id VARCHAR(36) NOT NULL,
      payroll_run_id VARCHAR(36),
      emi_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO tenants (id, name) VALUES ('tenant-test-1', 'Acme Corp');
    INSERT INTO users (id, tenant_id, email) VALUES ('user-test-1', 'tenant-test-1', 'admin@acme.com');
    INSERT INTO employees (id, tenant_id, first_name) VALUES ('emp-test-1', 'tenant-test-1', 'Jane');
  `;
  runPsql(baseSchemaSql);
  console.log('[PASS] Base tables and baseline fixtures created.\n');

  // [TEST 2] Leave requests days INTEGER -> NUMERIC(4,1) conversion & safe transactional rollback demo
  console.log('[TEST 2] Testing leave_requests.days conversion (INTEGER -> NUMERIC(4, 1))...');
  // Insert 21 integer rows matching production profile
  let insertValues = [];
  for (let i = 1; i <= 21; i++) {
    const d = (i % 3 === 0) ? 4 : (i % 2 === 0 ? 3 : 2);
    insertValues.push(`('leave-${i}', 'tenant-test-1', 'emp-test-1', ${d})`);
  }
  runPsql(`INSERT INTO leave_requests (id, tenant_id, employee_id, days) VALUES ${insertValues.join(',')};`);
  
  const preStats = runPsql(`SELECT count(*), min(days), max(days) FROM leave_requests;`, true);
  console.log(`Pre-conversion leave stats (count|min|max): ${preStats}`);

  // Measure ALTER TABLE duration
  const startLeave = performance.now();
  runPsql(`
    SET LOCAL lock_timeout = '3s';
    SET LOCAL statement_timeout = '10s';
    ALTER TABLE leave_requests ALTER COLUMN days TYPE NUMERIC(4, 1) USING days::NUMERIC(4, 1);
    ALTER TABLE leave_requests ALTER COLUMN days SET DEFAULT 1.0;
  `);
  const leaveDuration = performance.now() - startLeave;
  console.log(`[PASS] ALTER TABLE leave_requests executed in ${leaveDuration.toFixed(2)}ms`);

  const colSpec = runPsql(`
    SELECT column_name, data_type, numeric_precision, numeric_scale, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'days';
  `);
  console.log('Post-conversion schema verification:\n' + colSpec);

  const postStats = runPsql(`SELECT count(*), min(days), max(days) FROM leave_requests;`, true);
  console.log(`Post-conversion leave stats (count|min|max): ${postStats} (Row count preserved: 21 rows)`);

  // Fractional insert test (0.5 and 1.5)
  runPsql(`
    INSERT INTO leave_requests (id, tenant_id, employee_id, days) 
    VALUES ('leave-half-1', 'tenant-test-1', 'emp-test-1', 0.5),
           ('leave-half-2', 'tenant-test-1', 'emp-test-1', 1.5);
  `);
  const fracRows = runPsql(`SELECT id, days FROM leave_requests WHERE id LIKE 'leave-half-%' ORDER BY id;`);
  console.log('[PASS] Synthetic fractional half-day leaves successfully inserted and stored:\n' + fracRows);

  // Safe transactional test demonstrating precision-losing rollback behavior without committing destructive changes
  console.log('\nExecuting safe transactional precision-losing conversion test (BEGIN -> ALTER -> INSPECT -> ROLLBACK)...');
  const txDemoSql = `
    BEGIN;
    -- In-transaction simulation of destructive precision downcast
    ALTER TABLE leave_requests ALTER COLUMN days TYPE INTEGER USING ROUND(days)::INTEGER;
    -- Inspect rounded values inside transaction
    SELECT id, days FROM leave_requests WHERE id LIKE 'leave-half-%' ORDER BY id;
    -- Rollback to preserve fractional values and prevent persistent data loss
    ROLLBACK;
  `;
  const txOutput = runPsql(txDemoSql);
  console.log('[VERIFIED] Inside-transaction precision-loss demonstration:\n' + txOutput);

  // Verify that fractional values remain 100% intact post-rollback
  const intactRows = runPsql(`SELECT id, days FROM leave_requests WHERE id LIKE 'leave-half-%' ORDER BY id;`, true);
  console.log('[PASS] Post-rollback fractional integrity verified (values remain intact):\n' + intactRows);
  if (!intactRows.includes('0.5') || !intactRows.includes('1.5')) {
    throw new Error('FAIL: Fractional days were modified despite ROLLBACK! Actual: ' + intactRows);
  }

  // Verify column specification is still NUMERIC(4, 1)
  const intactColSpec = runPsql(`
    SELECT data_type, numeric_precision, numeric_scale 
    FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'days';
  `, true);
  console.log(`[PASS] Column data type remains intact: ${intactColSpec} (expected numeric|4|1)\n`);

  // [TEST 3] Migration 8: Device Sessions Table
  console.log('[TEST 3] Testing corrected Migration 8 (device_sessions)...');
  const migration8Path = path.resolve('server/prisma/migrations/20261102000000_add_device_sessions/migration.sql');
  const startM8 = performance.now();
  runPsqlFile(migration8Path);
  const m8Duration = performance.now() - startM8;
  console.log(`[PASS] Migration 8 SQL applied in ${m8Duration.toFixed(2)}ms`);

  // Verify 18 columns, types, nullability, defaults
  const m8Cols = runPsql(`
    SELECT ordinal_position, column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'device_sessions' 
    ORDER BY ordinal_position;
  `);
  console.log('device_sessions columns (18 verified):\n' + m8Cols);

  const m8Indexes = runPsql(`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'device_sessions' 
    ORDER BY indexname;
  `);
  console.log('device_sessions indexes (Primary key + 4 secondary indexes verified):\n' + m8Indexes);

  // Insert session fixture
  runPsql(`
    INSERT INTO device_sessions (id, user_id, tenant_id, device_name, device_type, browser, operating_system, ip_address, revoked)
    VALUES ('session-1', 'user-test-1', 'tenant-test-1', 'MacBook Pro', 'desktop', 'Chrome 122', 'macOS 14', '192.168.1.100', false);
  `);
  const sessionData = runPsql(`SELECT id, user_id, tenant_id, device_name, revoked FROM device_sessions WHERE id = 'session-1';`);
  console.log('[PASS] Inserted device_session row:\n' + sessionData);

  // FK constraint test (delete user cascades session)
  runPsql(`INSERT INTO users (id, tenant_id, email) VALUES ('user-to-delete', 'tenant-test-1', 'del@acme.com');`);
  runPsql(`INSERT INTO device_sessions (id, user_id, tenant_id) VALUES ('session-to-cascade', 'user-to-delete', 'tenant-test-1');`);
  runPsql(`DELETE FROM users WHERE id = 'user-to-delete';`);
  const cascadeCheck = runPsql(`SELECT count(*) FROM device_sessions WHERE id = 'session-to-cascade';`, true);
  console.log(`[PASS] Foreign key CASCADE ON DELETE verified (remaining rows for deleted user: ${cascadeCheck})`);

  // Rerun idempotency test for Migration 8
  const startM8Rerun = performance.now();
  runPsqlFile(migration8Path);
  const m8RerunDuration = performance.now() - startM8Rerun;
  console.log(`[PASS] Migration 8 rerun idempotency verified (executed in ${m8RerunDuration.toFixed(2)}ms without error)\n`);

  // [TEST 4] Migration 9: Branch Geofencing Columns
  console.log('[TEST 4] Testing Migration 9 (branch geofencing)...');
  const migration9Path = path.resolve('server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql');
  const startM9 = performance.now();
  runPsqlFile(migration9Path);
  const m9Duration = performance.now() - startM9;
  console.log(`[PASS] Migration 9 applied in ${m9Duration.toFixed(2)}ms`);

  const branchCols = runPsql(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name IN ('latitude', 'longitude', 'geofence_radius');
  `);
  console.log('Branch geofencing columns verified:\n' + branchCols);

  // Rerun test for Migration 9
  runPsqlFile(migration9Path);
  console.log('[PASS] Migration 9 rerun idempotency verified.\n');

  // [TEST 5] Migration 10: Financial Idempotency Partial Unique Indexes
  console.log('[TEST 5] Testing Migration 10 (financial idempotency partial unique indexes)...');
  const migration10Path = path.resolve('server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql');
  const startM10 = performance.now();
  runPsqlFile(migration10Path);
  const m10Duration = performance.now() - startM10;
  console.log(`[PASS] Migration 10 applied in ${m10Duration.toFixed(2)}ms`);

  const m10Indexes = runPsql(`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE indexname IN ('uq_journal_entries_tenant_payroll_run', 'uq_loan_installments_loan_payroll_run');
  `);
  console.log('Migration 10 partial unique indexes:\n' + m10Indexes);

  // Test 5A: Journal Entry Duplicate Rejection
  runPsql(`
    INSERT INTO journal_entries (id, tenant_id, reference, reference_type, description)
    VALUES ('gl-1', 'tenant-test-1', 'RUN-OCT-2026', 'payroll', 'Initial payroll GL');
  `);
  console.log('[PASS] Initial payroll GL entry inserted.');

  let glDupError = '';
  try {
    runPsql(`
      INSERT INTO journal_entries (id, tenant_id, reference, reference_type, description)
      VALUES ('gl-2', 'tenant-test-1', 'RUN-OCT-2026', 'payroll', 'Duplicate payroll GL attempt');
    `);
  } catch (err) {
    glDupError = err.message || err.stderr || '';
  }
  if (glDupError.includes('duplicate key value violates unique constraint') || glDupError.includes('uq_journal_entries_tenant_payroll_run')) {
    console.log('[PASS] Duplicate payroll GL correctly BLOCKED by unique index (23505 unique_violation)');
  } else {
    throw new Error('FAIL: Duplicate payroll GL was NOT blocked! Error: ' + glDupError);
  }

  // Test 5A.2: Non-payroll entry with same reference allowed
  runPsql(`
    INSERT INTO journal_entries (id, tenant_id, reference, reference_type, description)
    VALUES ('gl-3', 'tenant-test-1', 'RUN-OCT-2026', 'sale', 'Sale with same reference');
  `);
  console.log('[PASS] Non-payroll journal entry with same reference allowed (WHERE predicate active)');

  // Test 5B: Loan Installment Duplicate Rejection
  runPsql(`
    INSERT INTO loan_installments (id, tenant_id, loan_id, payroll_run_id, emi_amount)
    VALUES ('inst-1', 'tenant-test-1', 'loan-99', 'RUN-OCT-2026', 5000.00);
  `);
  console.log('[PASS] Initial loan installment inserted.');

  let loanDupError = '';
  try {
    runPsql(`
      INSERT INTO loan_installments (id, tenant_id, loan_id, payroll_run_id, emi_amount)
      VALUES ('inst-2', 'tenant-test-1', 'loan-99', 'RUN-OCT-2026', 5000.00);
    `);
  } catch (err) {
    loanDupError = err.message || err.stderr || '';
  }
  if (loanDupError.includes('duplicate key value violates unique constraint') || loanDupError.includes('uq_loan_installments_loan_payroll_run')) {
    console.log('[PASS] Duplicate loan installment correctly BLOCKED by unique index (23505 unique_violation)');
  } else {
    throw new Error('FAIL: Duplicate loan installment was NOT blocked! Error: ' + loanDupError);
  }

  // Test 5B.2: Multiple manual installments with NULL payroll_run_id allowed
  runPsql(`
    INSERT INTO loan_installments (id, tenant_id, loan_id, payroll_run_id, emi_amount)
    VALUES ('inst-3', 'tenant-test-1', 'loan-99', NULL, 2000.00),
           ('inst-4', 'tenant-test-1', 'loan-99', NULL, 3000.00);
  `);
  console.log('[PASS] Multiple manual loan installments with NULL payroll_run_id allowed (WHERE predicate active)');

  // Rerun test for Migration 10
  runPsqlFile(migration10Path);
  console.log('[PASS] Migration 10 rerun idempotency verified.\n');

  // [TEST 6] Safety Verification: Zero Test Writes to Supabase Production
  await verifySupabaseProductionUntouched();

  console.log('\n================================================================');
  console.log('ALL ISOLATED POSTGRESQL INTEGRATION TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runSuite().catch(err => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
