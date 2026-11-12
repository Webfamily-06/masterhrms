const fs = require('fs');

const lifecycleConfigs = [
  {
    prefix: 'promotions',
    itemVar: 'paginatedPromotions',
    idVar: 'visiblePromotionIds',
    title: 'Promotions & Career Progressions',
  },
  {
    prefix: 'resignations',
    itemVar: 'paginatedResignations',
    idVar: 'visibleResignationIds',
    title: 'Employee Resignations & Voluntary Departures',
  },
  {
    prefix: 'terminations',
    itemVar: 'paginatedTerminations',
    idVar: 'visibleTerminationIds',
    title: 'Involuntary Terminations & Departures',
  },
  {
    prefix: 'transfers',
    itemVar: 'paginatedTransfers',
    idVar: 'visibleTransferIds',
    title: 'Employee Transfers & Mobility',
  },
  {
    prefix: 'complaints',
    itemVar: 'paginatedComplaints',
    idVar: 'visibleComplaintIds',
    title: 'Grievances & Confidential Cases',
  },
  {
    prefix: 'warnings',
    itemVar: 'paginatedWarnings',
    idVar: 'visibleWarningIds',
    title: 'Disciplinary Warnings & Compliance',
  },
  {
    prefix: 'trips',
    itemVar: 'paginatedTrips',
    idVar: 'visibleTripIds',
    title: 'Business Travel & Expense Authorizations',
  },
];

for (const cfg of lifecycleConfigs) {
  const tanstackPath = `src/routes/_authenticated/hr/lifecycle/${cfg.prefix}.tsx`;
  const cmsPath = `CMS/src/app/(workspace)/hr/lifecycle/${cfg.prefix}/page.tsx`;

  for (const filePath of [tanstackPath, cmsPath]) {
    if (!fs.existsSync(filePath)) continue;
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. Ensure useMemo is imported
    if (!code.includes('useMemo')) {
      code = code.replace(/import\s*\{\s*useState\s*\}/, 'import { useState, useMemo }');
    }

    // 2. Remove any accidentally inserted visibleIds at the top
    const regexOldDecl = new RegExp(`const\\s+${cfg.idVar}\\s*=\\s*useMemo\\([\\s\\S]*?\\);\\r?\\n+`, 'g');
    code = code.replace(regexOldDecl, '');

    // 3. Replace formatter with format in ExportColumn
    code = code.replace(/formatter:\s*\(val\)\s*=>/g, 'format: (val: any) =>');

    // 4. selectedIds.includes -> selectedIds.has
    code = code.replace(/selectedIds\.includes\(([^)]+)\)/g, 'selectedIds.has($1)');

    // 5. fileName -> filename
    code = code.replace(/fileName:\s*`/g, 'filename: `');

    // 6. remove orientation: "landscape" or "portrait"
    code = code.replace(/orientation:\s*["'][a-zA-Z]+["'],?\r?\n/g, '');

    // 7. Add title to exportToExcel if missing
    code = code.replace(
      /await exportToExcel\(\{\s*columns:/g,
      `await exportToExcel({\n      title: "${cfg.title}",\n      columns:`
    );

    // 8. searchValue -> searchTerm
    code = code.replace(/searchValue=\{search\}/g, 'searchTerm={search}');

    // 9. Fix GlobalListActionToolbar props
    // onDeleteSelected -> onBulkDelete
    code = code.replace(/onDeleteSelected=\{[^}]+\}/g, `onBulkDelete={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}`);
    code = code.replace(/isDeleting=\{[^}]+\}/g, 'isActionLoading={bulkDeleteMutation.isPending}');
    code = code.replace(/deleteConfirmTitle="[^"]*"/g, '');
    code = code.replace(/deleteConfirmDescription=\{`[^`]*`\}/g, '');
    code = code.replace(/deleteConfirmDescription=\{[^}]+\}/g, '');
    code = code.replace(/\s*selected [^`]*`\}/g, '');

    // 10. Also ensure bulkDeleteMutation.mutate receives Array.from(selectedIds)
    code = code.replace(/bulkDeleteMutation\.mutate\(selectedIds\)/g, 'bulkDeleteMutation.mutate(Array.from(selectedIds))');

    // 11. Insert visibleIds declaration immediately AFTER paginated items declaration:
    const paginatedRegex = new RegExp(`(const\\s+${cfg.itemVar}\\s*=[^;]+;)`);
    if (!code.includes(`const ${cfg.idVar}`)) {
      code = code.replace(paginatedRegex, `$1\n\n  const ${cfg.idVar} = useMemo(() => ${cfg.itemVar}.map((x: any) => x.id), [${cfg.itemVar}]);`);
    }

    // 12. Fix Checkbox in TableHead:
    code = code.replace(
      /checked=\{isAllVisibleSelected(\([^)]*\))?\s*\?\s*true\s*:\s*isSomeVisibleSelected(\([^)]*\))?\s*\?\s*"indeterminate"\s*:\s*false\}/g,
      `checked={isAllVisibleSelected(${cfg.idVar}) ? true : isSomeVisibleSelected(${cfg.idVar}) ? "indeterminate" : false}`
    );
    code = code.replace(
      /onCheckedChange=\{selectAllVisible(\([^)]*\))?\}/g,
      `onCheckedChange={() => selectAllVisible(${cfg.idVar})}`
    );

    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Successfully updated:', filePath);
  }
}
