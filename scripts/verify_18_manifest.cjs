const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Master Package File Manifest Definition (Exact expected sizes and SHA-256 hashes)
const expectedManifest = [
  {
    id: 1,
    path: 'server/prisma/migrations/20261102000000_add_device_sessions/migration.sql',
    expectedSize: 5677,
    expectedSha256: '03e303b01a753c8d1c948ebeaf4717923e4ae2247ec0b6a0c34db04f7f6376c9'
  },
  {
    id: 2,
    path: 'server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql',
    expectedSize: 257,
    expectedSha256: '79e4bc5d3dad92bd34629a5d04d8435c67efa1af6d2d9ed2c61b3587737aa475'
  },
  {
    id: 3,
    path: 'server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql',
    expectedSize: 2862,
    expectedSha256: 'd63409c253e5496064094211478305df9f2f448ea26e1b9e68763b2718a790bf'
  },
  {
    id: 4,
    path: 'scripts/pg17_container_certification.cjs',
    expectedSize: 18154,
    expectedSha256: '8733cee2402f8a1744b7962bb2bd7e91f4a1a6f529f642a36bdb3fb57feaaba2'
  },
  {
    id: 5,
    path: 'scripts/verify_migrations_1_7.cjs',
    expectedSize: 25286,
    expectedSha256: '945284e88f514474550c092f61d9edefdba329a2ca3a70f508cc133b103b0f73'
  },
  {
    id: 6,
    path: 'scripts/isolated_integration_test.cjs',
    expectedSize: 14051,
    expectedSha256: 'cd5a74c0f0944a73d957fcafa2647ba7d1f3d969539c8d43cbb2dbe31f3968db'
  },
  {
    id: 7,
    path: 'scripts/inspect_supabase_production.cjs',
    expectedSize: 6234,
    expectedSha256: '0f523adb5045e2df487d3c9fd86da83b4df8b88ace5f75ef5aed1672d885e64c'
  },
  {
    id: 8,
    path: 'docs/hrms-audit/PHASE4B_PRODUCTION_MIGRATION_RUNBOOK.md',
    expectedSize: 10848,
    expectedSha256: '3b06989718bf2c72b87d27b297d4ed0438d53f2740f70c6ca435de15256ff5ce'
  },
  {
    id: 9,
    path: 'docs/hrms-audit/PHASE4B5_4_REPOSITORY_CHANGE_INVENTORY.md',
    expectedSize: 8395,
    expectedSha256: '425a9601c4532b622cbb078795dc89b6e127b6403fb2c507c6f9a2f568084f4c'
  },
  {
    id: 10,
    path: 'docs/hrms-audit/PHASE4B5_4_MIGRATION_SOURCE_RECONCILIATION.md',
    expectedSize: 10899,
    expectedSha256: 'd0d584e7004c2c44e2b1a05a7cf03ccfcbeaa34374968c6c6cdcd761a18b659e'
  },
  {
    id: 11,
    path: 'docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md',
    expectedSize: 8016,
    expectedSha256: '8547f0d897efa9ba4b4ac96d8f8d024e9d92b8accf32a3656e8c5bab34fdacd9'
  },
  {
    id: 12,
    path: 'docs/hrms-audit/PHASE4B5_4_DATABASE_PR_MANIFEST.md',
    expectedSize: 6025,
    expectedSha256: 'f06d9cadcc7714ea11aa8eac41274649fd78d7750b383cfd91032a9776c620b9'
  },
  {
    id: 13,
    path: 'docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md',
    expectedSize: 5558,
    expectedSha256: 'd8f22e03dd6343e5d2e9ec72bfb965a60e3d8869f265a554dff18964110bc196'
  },
  {
    id: 14,
    path: 'docs/hrms-audit/PHASE4B5_4_FINAL_GATE_REPORT.md',
    expectedSize: 7322,
    expectedSha256: 'c16b4271025b3d070db01e1ec977dfdbd3ec78605cf423fb11e5842bed9917d2'
  },
  {
    id: 15,
    path: 'docs/hrms-audit/PHASE4B6_SHA256_MANIFEST.txt',
    expectedSize: 4378,
    expectedSha256: 'e87d26803a675b8c432204f9fc87a632356f7937c2c6f385fb8bb0463660a477'
  },
  {
    id: 16,
    path: 'docs/hrms-audit/PHASE4B6_SOURCE_EVIDENCE_BUNDLE.md',
    expectedSize: 109657,
    expectedSha256: 'd6e8e436d32af0d89f727909a10dae9fbae8054e674ff9bab16283a17b5b59aa'
  },
  {
    id: 17,
    path: 'docs/hrms-audit/PHASE4B6_PG17_CERTIFICATION_EVIDENCE.md',
    expectedSize: 11834,
    expectedSha256: '977510207450faabe63715eddad3f4a1c6e6e6f460627ae88c0ec26bd1920a38'
  },
  {
    id: 18,
    path: 'docs/hrms-audit/PHASE4B6_M1_M7_BASELINE_EVIDENCE.md',
    expectedSize: 10640,
    expectedSha256: '3cf3a9c7cd72852772fbb981c1de133c80534a5e8376d0095fba65922c6128cb'
  },
  {
    id: 19,
    path: 'docs/hrms-audit/PHASE4B6_DATABASE_PR_FILE_MANIFEST.md',
    expectedSize: 8182,
    expectedSha256: 'e39376a952b126b1ad9e443b8a516debad99be3787cc14d2200d877184d38b97'
  },
  {
    id: 20,
    path: 'docs/hrms-audit/PHASE4B6_OPEN_ISSUES.md',
    expectedSize: 4860,
    expectedSha256: '05735881ae3285725a6a05aa21f5913f94ee64e1473921e3f077f1093a49a4ee'
  },
  {
    id: 21,
    path: 'docs/hrms-audit/PHASE4B8_FINAL_SOURCE_LEVEL_REVIEW.md',
    expectedSize: 29538,
    expectedSha256: 'f1a4818f8fbda5fef8bc010fc705b1a58cd5cf132d9590a5ea9075bcfa4c3ca6'
  },
  {
    id: 22,
    path: 'docs/hrms-audit/PHASE4B9_FINAL_DATABASE_MIGRATION_PACKAGE.md',
    expectedSize: 30721,
    expectedSha256: 'ad489449baa4d503285957a0147c60487e49d9c70056cfec9678cb8586c5cfa5'
  }
];

console.log('================================================================');
console.log('MASTERHRMS — STRICT CRYPTOGRAPHIC MANIFEST AUDIT');
console.log('Timestamp:', new Date().toISOString());
console.log('Checking expected sizes & SHA-256 hashes against actual filesystem...');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
const failureDetails = [];

expectedManifest.forEach(item => {
  if (!fs.existsSync(item.path)) {
    failCount++;
    console.error(`[FAIL ${item.id.toString().padStart(2, '0')}] MISSING: ${item.path}`);
    failureDetails.push({ path: item.path, error: 'FILE_MISSING' });
    return;
  }

  const buf = fs.readFileSync(item.path);
  const actualSize = buf.length;
  const actualHash = crypto.createHash('sha256').update(buf).digest('hex');

  const sizeOk = actualSize === item.expectedSize;
  const hashOk = actualHash === item.expectedSha256;

  if (sizeOk && hashOk) {
    passCount++;
    console.log(`[PASS ${item.id.toString().padStart(2, '0')}] ${item.path}`);
    console.log(`        Size: ${actualSize} bytes (MATCH) | SHA-256: ${actualHash} (MATCH)`);
  } else {
    failCount++;
    console.error(`[FAIL ${item.id.toString().padStart(2, '0')}] MISMATCH: ${item.path}`);
    if (!sizeOk) {
      console.error(`        Expected Size: ${item.expectedSize} | Actual Size: ${actualSize}`);
    }
    if (!hashOk) {
      console.error(`        Expected Hash: ${item.expectedSha256}`);
      console.error(`        Actual Hash:   ${actualHash}`);
    }
    failureDetails.push({
      path: item.path,
      sizeOk,
      hashOk,
      expectedSize: item.expectedSize,
      actualSize,
      expectedSha256: item.expectedSha256,
      actualSha256: actualHash
    });
  }
});

console.log('\n================================================================');
console.log(`FINAL MANIFEST RESULT: ${passCount} / ${expectedManifest.length} FILES VERIFIED (${((passCount/expectedManifest.length)*100).toFixed(1)}%)`);

if (failCount === 0 && passCount === expectedManifest.length) {
  console.log('STATUS: 100% CRYPTOGRAPHIC PARITY — ALL EXPECTED FILES MATCH EXACT SIZES AND HASHES');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`STATUS: MANIFEST VERIFICATION FAILED — ${failCount} FILES MISMATCHED OR MISSING.`);
  console.error('Failure Summary:', JSON.stringify(failureDetails, null, 2));
  console.log('================================================================');
  process.exit(1);
}
