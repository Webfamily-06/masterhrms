const fs = require('fs');
const path = require('path');

const pairs = [
  {
    tanstack: 'src/routes/_authenticated/hr/organization/departments.tsx',
    cms: 'CMS/src/app/(workspace)/hr/organization/departments/page.tsx',
    name: 'Departments'
  },
  {
    tanstack: 'src/routes/_authenticated/hr/organization/designations.tsx',
    cms: 'CMS/src/app/(workspace)/hr/organization/designations/page.tsx',
    name: 'Designations'
  },
  {
    tanstack: 'src/routes/_authenticated/hr/organization/branches.tsx',
    cms: 'CMS/src/app/(workspace)/hr/organization/branches/page.tsx',
    name: 'Branches'
  },
  {
    tanstack: 'src/hooks/use-master-list.ts',
    cms: 'CMS/src/hooks/use-master-list.ts',
    name: 'useMasterList Hook'
  }
];

const requiredFeatures = [
  { name: 'Server Authoritative Counts', pattern: 'counts' },
  { name: 'Live Search with Debounce/Reset', pattern: 'setSearch' },
  { name: 'Status Filter (All/Active/Inactive)', pattern: 'statusFilter' },
  { name: 'Multi-Row Selection Checkboxes', pattern: 'selectedIds' },
  { name: 'Bulk Archive Action Bar', pattern: 'bulkArchive' },
  { name: 'Pagination Page Size Selector (10/25/50/100)', pattern: 'setLimit' },
  { name: 'Create/Edit Modal Dialog Form', pattern: 'isDialogOpen' },
  { name: 'Edit Mode & Pre-filled Values', pattern: 'isEditMode' },
  { name: 'Dependency Guard Confirmation Dialog', pattern: 'Dependency Guard' }
];

console.log('--- WORKSPACE PARITY AUDIT ---');
let allPassed = true;

for (const pair of pairs) {
  const tanstackContent = fs.readFileSync(path.resolve(__dirname, '..', pair.tanstack), 'utf-8');
  const cmsContent = fs.readFileSync(path.resolve(__dirname, '..', pair.cms), 'utf-8');

  console.log(`\nVerifying parity for ${pair.name}:`);
  if (pair.name.includes('Hook')) {
    const hasCountsTanstack = tanstackContent.includes('counts: data?.counts');
    const hasCountsCMS = cmsContent.includes('counts: data?.counts');
    console.log(`  - Counts extraction in TanStack: ${hasCountsTanstack ? 'YES' : 'NO'}`);
    console.log(`  - Counts extraction in CMS: ${hasCountsCMS ? 'YES' : 'NO'}`);
    if (!hasCountsTanstack || !hasCountsCMS) allPassed = false;
    continue;
  }

  for (const feat of requiredFeatures) {
    const inTanstack = tanstackContent.includes(feat.pattern);
    const inCMS = cmsContent.includes(feat.pattern);
    const match = inTanstack && inCMS;
    if (!match) allPassed = false;
    console.log(`  - ${feat.name}: TanStack=${inTanstack ? 'OK' : 'MISSING'}, CMS=${inCMS ? 'OK' : 'MISSING'} -> ${match ? 'PARITY VERIFIED' : 'MISMATCH'}`);
  }
}

console.log('\nFINAL PARITY RESULT:', allPassed ? '100% PARITY CERTIFIED' : 'PARITY DEFECTS DETECTED');
