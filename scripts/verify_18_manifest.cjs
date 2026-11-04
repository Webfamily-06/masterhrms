const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

const files = [
  'server/prisma/migrations/20261102000000_add_device_sessions/migration.sql',
  'server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql',
  'scripts/pg17_container_certification.cjs',
  'scripts/verify_migrations_1_7.cjs',
  'scripts/isolated_integration_test.cjs',
  'docs/hrms-audit/PHASE4B_PRODUCTION_MIGRATION_RUNBOOK.md',
  'docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md',
  'docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md',
  'docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md',
  'docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md',
  'docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md',
  'docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md',
  'docs/hrms-audit/PHASE4B6_SOURCE_EVIDENCE_BUNDLE.md',
  'docs/hrms-audit/PHASE4B6_SHA256_MANIFEST.txt',
  'docs/hrms-audit/PHASE4B6_PG17_CERTIFICATION_EVIDENCE.md',
  'docs/hrms-audit/PHASE4B6_M1_M7_BASELINE_EVIDENCE.md',
  'docs/hrms-audit/PHASE4B6_DATABASE_PR_FILE_MANIFEST.md',
  'docs/hrms-audit/PHASE4B6_OPEN_ISSUES.md'
];

console.log('================================================================');
console.log('MASTERHRMS — 18-FILE MANIFEST WORKING TREE AUDIT');
console.log('================================================================');

files.forEach((f, idx) => {
  if (!fs.existsSync(f)) {
    console.log(`${idx + 1}. [MISSING] ${f}`);
    return;
  }
  const buf = fs.readFileSync(f);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  let gitStat = '';
  try {
    gitStat = execSync(`git status --porcelain "${f}"`, { encoding: 'utf8' }).trim();
  } catch (e) {
    gitStat = 'ERROR';
  }
  console.log(`${idx + 1}. ${f}`);
  console.log(`   Size: ${buf.length} bytes | Hash: ${hash} | Git: [${gitStat || 'Tracked/Unmodified'}]`);
});

