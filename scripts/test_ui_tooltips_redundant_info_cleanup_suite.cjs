const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: MASTERHRMS UI TOOLTIP & REDUNDANT INFORMATION CLEANUP ===\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

// 1. Verify "Protected System Folder Hierarchy Active" removed from UI
it('Certificate branding screens must not contain internal system storage banners', () => {
  const tanstackBranding = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-branding.tsx', 'utf8');
  const cmsBranding = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-branding/page.tsx', 'utf8');

  assert.strictEqual(tanstackBranding.includes('Protected System Folder Hierarchy Active'), false, 'TanStack branding should not contain system storage banner');
  assert.strictEqual(cmsBranding.includes('Protected System Folder Hierarchy Active'), false, 'CMS branding should not contain system storage banner');
  assert.strictEqual(tanstackBranding.includes('System Storage Indicator Banner'), false);
  assert.strictEqual(cmsBranding.includes('System Storage Indicator Banner'), false);
});

// 2. Verify File Manager system badge cleanup
it('File Manager system badges must not contain redundant hover tooltips', () => {
  const tanstackFm = fs.readFileSync('src/components/apps/file-manager/unified-file-manager.tsx', 'utf8');
  const cmsFm = fs.readFileSync('CMS/src/components/apps/file-manager/unified-file-manager.tsx', 'utf8');

  assert.strictEqual(tanstackFm.includes('title="Protected System Folder"'), false, 'TanStack File Manager should not have redundant title on system badge');
  assert.strictEqual(cmsFm.includes('title="Protected System Folder"'), false, 'CMS File Manager should not have redundant title on system badge');
  assert.strictEqual(tanstackFm.includes('aria-label="Move to folder"'), true, 'TanStack FM Move button should have aria-label');
  assert.strictEqual(cmsFm.includes('aria-label="Move to folder"'), true, 'CMS FM Move button should have aria-label');
});

// 3. Verify Marketplace tooltips removed
it('Marketplace summary counters and badges must not have redundant Tooltip wrappers', () => {
  const tanstackMp = fs.readFileSync('src/routes/_authenticated/_app/marketplace.tsx', 'utf8');
  const cmsMp = fs.readFileSync('CMS/src/app/(workspace)/marketplace/page.tsx', 'utf8');

  assert.strictEqual(tanstackMp.includes('Not currently installed; purchase or eligibility may be required.'), false);
  assert.strictEqual(cmsMp.includes('Not currently installed; purchase or eligibility may be required.'), false);
  assert.strictEqual(tanstackMp.includes('This add-on is installed in your workspace.'), false);
  assert.strictEqual(cmsMp.includes('This add-on is installed in your workspace.'), false);
  assert.strictEqual((tanstackMp.match(/<Tooltip\b/g) || []).length, 0);
  assert.strictEqual((cmsMp.match(/<Tooltip\b/g) || []).length, 0);
});

// 4. Verify internal implementation details removed from Employees screen
it('Employees screen must not expose internal code names like (Dreams UI-2)', () => {
  const tanstackEmp = fs.readFileSync('src/routes/_authenticated/_app/employees.tsx', 'utf8');
  const cmsEmp = fs.readFileSync('CMS/src/app/(workspace)/employees/page.tsx', 'utf8');

  assert.strictEqual(tanstackEmp.includes('(Dreams UI-2)'), false);
  assert.strictEqual(cmsEmp.includes('(Dreams UI-2)'), false);
  assert.strictEqual(tanstackEmp.includes('title="View Full Profile Details" aria-label="View Full Profile Details"'), true);
  assert.strictEqual(cmsEmp.includes('title="View Full Profile Details" aria-label="View Full Profile Details"'), true);
});

// 5. Verify Org Tree redundant button label tooltips removed
it('Org Tree must not have redundant title="Filters" when button visibly says Filters', () => {
  const tanstackTree = fs.readFileSync('src/components/organization/interactive-org-tree.tsx', 'utf8');
  const cmsTree = fs.readFileSync('CMS/src/components/organization/interactive-org-tree.tsx', 'utf8');

  assert.strictEqual(tanstackTree.includes('title="Filters"'), false);
  assert.strictEqual(cmsTree.includes('title="Filters"'), false);
  assert.strictEqual(tanstackTree.includes('aria-label="Open Filters"'), true);
  assert.strictEqual(cmsTree.includes('aria-label="Open Filters"'), true);
});

// 6. Verify Awards screen accessible names & redundant tooltip cleanup
it('Awards screen must have clean accessible names without redundant button tooltips', () => {
  const tanstackAwards = fs.readFileSync('src/routes/_authenticated/hr/awards.tsx', 'utf8');
  const cmsAwards = fs.readFileSync('CMS/src/app/(workspace)/hr/awards/page.tsx', 'utf8');

  assert.strictEqual(tanstackAwards.includes('title="Download Official PDF Certificate"'), false);
  assert.strictEqual(cmsAwards.includes('title="Download Official PDF Certificate"'), false);
  assert.strictEqual(tanstackAwards.includes('aria-label="Download Official PDF Certificate"'), true);
  assert.strictEqual(cmsAwards.includes('aria-label="Download Official PDF Certificate"'), true);
  assert.strictEqual(tanstackAwards.includes('aria-label="Grid View"'), true);
  assert.strictEqual(cmsAwards.includes('aria-label="Grid View"'), true);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
