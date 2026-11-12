const fs = require('fs');

const files = [
  {
    path: 'src/routes/_authenticated/hr/lifecycle/complaints.tsx',
    itemVar: 'paginatedComplaints',
    idVar: 'visibleComplaintIds',
    title: 'Grievances & Confidential Cases',
  },
  {
    path: 'CMS/src/app/(workspace)/hr/lifecycle/complaints/page.tsx',
    itemVar: 'paginatedComplaints',
    idVar: 'visibleComplaintIds',
    title: 'Grievances & Confidential Cases',
  },
  {
    path: 'src/routes/_authenticated/hr/lifecycle/warnings.tsx',
    itemVar: 'paginatedWarnings',
    idVar: 'visibleWarningIds',
    title: 'Disciplinary Warnings & Compliance',
  },
  {
    path: 'CMS/src/app/(workspace)/hr/lifecycle/warnings/page.tsx',
    itemVar: 'paginatedWarnings',
    idVar: 'visibleWarningIds',
    title: 'Disciplinary Warnings & Compliance',
  },
  {
    path: 'src/routes/_authenticated/hr/lifecycle/trips.tsx',
    itemVar: 'paginatedTrips',
    idVar: 'visibleTripIds',
    title: 'Business Travel & Expense Authorizations',
  },
  {
    path: 'CMS/src/app/(workspace)/hr/lifecycle/trips/page.tsx',
    itemVar: 'paginatedTrips',
    idVar: 'visibleTripIds',
    title: 'Business Travel & Expense Authorizations',
  },
];

for (const f of files) {
  if (!fs.existsSync(f.path)) continue;
  let code = fs.readFileSync(f.path, 'utf8');

  // Ensure useMemo is imported
  if (!code.includes('useMemo')) {
    code = code.replace(/import\s*\{\s*useState\s*\}/, 'import { useState, useMemo }');
  }

  // Replace formatter with format
  code = code.replace(/formatter:\s*\(val\)\s*=>/g, 'format: (val: any) =>');

  // selectedIds.includes -> selectedIds.has
  code = code.replace(/selectedIds\.includes\(([^)]+)\)/g, 'selectedIds.has($1)');

  // fileName -> filename
  code = code.replace(/fileName:\s*`/g, 'filename: `');

  // remove orientation: "landscape"
  code = code.replace(/orientation:\s*["']landscape["'],?\r?\n/g, '');

  // Add title to exportToExcel if missing
  code = code.replace(
    /await exportToExcel\(\{\s*columns:/g,
    `await exportToExcel({\n      title: "${f.title}",\n      columns:`
  );

  // searchValue -> searchTerm in GlobalListActionToolbar
  code = code.replace(/searchValue=\{search\}/g, 'searchTerm={search}');

  // bulkDeleteMutation.mutate(selectedIds) -> Array.from(selectedIds)
  code = code.replace(/bulkDeleteMutation\.mutate\(selectedIds\)/g, 'bulkDeleteMutation.mutate(Array.from(selectedIds))');

  // Insert const visibleIds = useMemo(...) right before useGlobalListSelection
  const visibleDecl = `const ${f.idVar} = useMemo(() => ${f.itemVar}.map((x: any) => x.id), [${f.itemVar}]);\n\n  const {`;
  if (!code.includes(f.idVar)) {
    code = code.replace(`const {`, visibleDecl);
  }

  // Replace Checkbox in TableHead:
  // checked={isAllVisibleSelected ? true : isSomeVisibleSelected ? "indeterminate" : false}
  // onCheckedChange={selectAllVisible}
  code = code.replace(
    /checked=\{isAllVisibleSelected\s*\?\s*true\s*:\s*isSomeVisibleSelected\s*\?\s*"indeterminate"\s*:\s*false\}/g,
    `checked={isAllVisibleSelected(${f.idVar}) ? true : isSomeVisibleSelected(${f.idVar}) ? "indeterminate" : false}`
  );
  code = code.replace(
    /onCheckedChange=\{selectAllVisible\}/g,
    `onCheckedChange={() => selectAllVisible(${f.idVar})}`
  );

  fs.writeFileSync(f.path, code, 'utf8');
  console.log('Fixed lifecycle list file:', f.path);
}

