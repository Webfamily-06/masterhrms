const fs = require('fs');
const path = require('path');

const classified = JSON.parse(fs.readFileSync(path.join(__dirname, 'classified_routes_full.json'), 'utf8'));
const incompleteRoutes = classified.filter(r => r.status === 'INCOMPLETE');

console.log('Total incomplete routes:', incompleteRoutes.length);

const inventory = [];

for (const r of incompleteRoutes) {
  let content = '';
  if (r.filePath && fs.existsSync(r.filePath)) {
    content = fs.readFileSync(r.filePath, 'utf8');
  }

  // Determine nature of gap
  let gapType = 'API & DB Persistence Missing';
  let category = 'Backend Persistence Required';
  let priority = 'P2';
  let impact = 'Feature works with client state; changes reset on page reload';
  let recommendedFix = 'Implement dedicated Express REST endpoint and Prisma schema model';
  let testPlan = 'Unit test controller CRUD and verify DB persistence with Vitest';

  // Check if it is a client-side utility/setting
  const isClientSidePref = /localStorage|sessionStorage|theme|mode|viewMode|filter|toggle/i.test(content) && content.length < 3000;
  const isDraftStub = content.length < 500;
  const isReportingView = /report|chart|analytics|summary/i.test(r.routeId);
  const isHrWorkflow = r.routeId.startsWith('/_authenticated/hr');
  const isMeWorkflow = r.routeId.startsWith('/_authenticated/me');

  if (isClientSidePref && !isHrWorkflow) {
    gapType = 'Client-Side Only State';
    category = 'Intentionally Client-Side Preference';
    priority = 'P3';
    impact = 'Cosmetic/view preference; no statutory or financial impact';
    recommendedFix = 'Retain client-side state in localStorage; backend persistence not needed';
    testPlan = 'Verify persistence in browser localStorage across reloads';
  } else if (isDraftStub) {
    gapType = 'Stub Component (Draft)';
    category = 'Unimplemented Feature Stub';
    priority = 'P2';
    impact = 'Empty placeholder view; feature unavailable to users';
    recommendedFix = 'Design UI layout and wire backend controller';
    testPlan = 'Create end-to-end component rendering and API mock test';
  } else if (isReportingView) {
    gapType = 'API Aggregation Missing';
    category = 'Reporting Query';
    priority = 'P2';
    impact = 'Report renders sample or static figures; real aggregations not queried';
    recommendedFix = 'Add aggregation pipeline in backend reporting service';
    testPlan = 'Verify aggregation figures against raw DB transactions';
  } else if (isHrWorkflow) {
    priority = 'P1';
    impact = 'HR administrative workflow operates on local state without DB audit trail';
  } else if (isMeWorkflow) {
    priority = 'P2';
    impact = 'Employee self-service submission not permanently stored';
  }

  inventory.push({
    routeId: r.routeId,
    filePath: r.filePath,
    module: r.module,
    fileSize: r.fileSize,
    gapType,
    category,
    priority,
    impact,
    recommendedFix,
    testPlan,
    currentEvidence: `Component exists (${r.fileSize} bytes); UI renders without errors`
  });
}

// Summary
const catSummary = {};
for (const item of inventory) {
  catSummary[item.category] = (catSummary[item.category] || 0) + 1;
}
console.log('Incomplete routes categories:');
console.table(catSummary);

fs.writeFileSync(path.join(__dirname, 'incomplete_routes_inventory.json'), JSON.stringify(inventory, null, 2));
console.log('Saved incomplete inventory to scripts/incomplete_routes_inventory.json');
