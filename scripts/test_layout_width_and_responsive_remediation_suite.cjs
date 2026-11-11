const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: MASTERHRMS CONTENT WIDTH & RESPONSIVE LAYOUT REMEDIATION ===\n');

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

// 1. Certificate Branding Width & Grid
it('Certificate Branding must utilize full workspace width with adaptive 5-col grid', () => {
  const tanstack = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-branding.tsx', 'utf8');
  const cms = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-branding/page.tsx', 'utf8');

  assert.strictEqual(tanstack.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cms.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(tanstack.includes('w-full min-w-0 space-y-6'), true);
  assert.strictEqual(cms.includes('w-full min-w-0 space-y-6'), true);
  assert.strictEqual(tanstack.includes('2xl:grid-cols-5'), true);
  assert.strictEqual(cms.includes('2xl:grid-cols-5'), true);
});

// 2. Certificate Templates Width & Grid
it('Certificate Templates must utilize full workspace width with adaptive 5-col grid', () => {
  const tanstack = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-templates.tsx', 'utf8');
  const cms = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-templates/page.tsx', 'utf8');

  assert.strictEqual(tanstack.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cms.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(tanstack.includes('w-full min-w-0 space-y-6'), true);
  assert.strictEqual(cms.includes('w-full min-w-0 space-y-6'), true);
  assert.strictEqual(tanstack.includes('2xl:grid-cols-5'), true);
  assert.strictEqual(cms.includes('2xl:grid-cols-5'), true);
});

// 3. Awards Management Width & Grid
it('Awards Management must utilize full workspace width with adaptive 4-col grid', () => {
  const tanstack = fs.readFileSync('src/routes/_authenticated/hr/awards.tsx', 'utf8');
  const cms = fs.readFileSync('CMS/src/app/(workspace)/hr/awards/page.tsx', 'utf8');

  assert.strictEqual(tanstack.includes('max-w-[1600px] mx-auto'), false);
  assert.strictEqual(cms.includes('max-w-[1600px] mx-auto'), false);
  assert.strictEqual(tanstack.includes('w-full min-w-0 space-y-6 pb-16'), true);
  assert.strictEqual(cms.includes('w-full min-w-0 space-y-6 pb-16'), true);
  assert.strictEqual(tanstack.includes('xl:grid-cols-4'), true);
  assert.strictEqual(cms.includes('xl:grid-cols-4'), true);
});

// 4. Employee 360 Profile Width
it('Employee 360 profile must utilize full workspace width', () => {
  const tanstack = fs.readFileSync('src/routes/_authenticated/hr/employees/$id.tsx', 'utf8');
  const cms = fs.readFileSync('CMS/src/app/(workspace)/hr/employees/[id]/page.tsx', 'utf8');

  assert.strictEqual(tanstack.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cms.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(tanstack.includes('w-full min-w-0 space-y-6 pb-12'), true);
  assert.strictEqual(cms.includes('w-full min-w-0 space-y-6 pb-12'), true);
});

// 5. Tasks Kanban & Projects & Users Width
it('Data-dense workspace pages (Tasks, Projects, Users, Reports) must be fluid and unconstrained', () => {
  const tanstackTasks = fs.readFileSync('src/routes/_authenticated/_app/tasks.tsx', 'utf8');
  const cmsTasks = fs.readFileSync('CMS/src/app/(workspace)/tasks/page.tsx', 'utf8');
  const tanstackUsers = fs.readFileSync('src/routes/_authenticated/_app/users.tsx', 'utf8');
  const cmsUsers = fs.readFileSync('CMS/src/app/(workspace)/users/page.tsx', 'utf8');
  const tanstackProject = fs.readFileSync('src/routes/_authenticated/_app/project.$id.tsx', 'utf8');
  const cmsProject = fs.readFileSync('CMS/src/app/(workspace)/project/[id]/page.tsx', 'utf8');

  assert.strictEqual(tanstackTasks.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cmsTasks.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(tanstackUsers.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cmsUsers.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(tanstackProject.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cmsProject.includes('max-w-7xl mx-auto'), false);
});

// 6. Duplicate page-wrapper elimination
it('Pages must not contain duplicate nested page-wrapper classes', () => {
  const tanstackCampaigns = fs.readFileSync('src/routes/_authenticated/_app/campaigns.tsx', 'utf8');
  const cmsCampaigns = fs.readFileSync('CMS/src/app/(workspace)/campaigns/page.tsx', 'utf8');
  const tanstackCustomFields = fs.readFileSync('src/routes/_authenticated/_app/custom-fields.tsx', 'utf8');
  const cmsCustomFields = fs.readFileSync('CMS/src/app/(workspace)/custom-fields/page.tsx', 'utf8');

  assert.strictEqual(tanstackCampaigns.includes('className="page-wrapper'), false);
  assert.strictEqual(cmsCampaigns.includes('className="page-wrapper'), false);
  assert.strictEqual(tanstackCustomFields.includes('className="page-wrapper'), false);
  assert.strictEqual(cmsCustomFields.includes('className="page-wrapper'), false);
});

// 7. Core Dashboards and HR Management Fluidity
it('Dashboards and operational HR pages must use full fluid width', () => {
  const tanstackDash = fs.readFileSync('src/routes/_authenticated/_app/smart-dashboard.tsx', 'utf8');
  const cmsDash = fs.readFileSync('CMS/src/app/(workspace)/smart-dashboard/page.tsx', 'utf8');
  const tanstackPayroll = fs.readFileSync('src/routes/_authenticated/_app/payroll.tsx', 'utf8');
  const cmsPayroll = fs.readFileSync('CMS/src/app/(workspace)/payroll/page.tsx', 'utf8');

  assert.strictEqual(tanstackDash.includes('max-w-[1600px] mx-auto'), false);
  assert.strictEqual(cmsDash.includes('max-w-[1600px] mx-auto'), false);
  assert.strictEqual(tanstackPayroll.includes('max-w-7xl mx-auto'), false);
  assert.strictEqual(cmsPayroll.includes('max-w-7xl mx-auto'), false);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}

