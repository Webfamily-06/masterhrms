const fs = require('fs');

function fixAnnouncements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Deduplicate Checkbox import
  let count = 0;
  content = content.replace(/import\s*\{\s*Checkbox\s*\}\s*from\s*["']@\/components\/ui\/checkbox["'];?\r?\n/g, (match) => {
    count++;
    return count === 1 ? match : '';
  });

  // Fix announcementExportColumns
  content = content.replace(
    /\{ header: "Target Scope", key: "branchId"[\s\S]*?\{ header: "Status", key: "status", format: \(v\) => \(v === "active" \? "Active" : "Inactive"\) \},/,
    `{ header: "Target Scope", key: "targetType", format: (v) => v || "All Organization" },\n    { header: "Priority", key: "priority" },\n    { header: "Start Date", key: "publishDate", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },\n    { header: "End Date", key: "expiryDate", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },\n    { header: "Status", key: "priority", format: (_v) => "Active" },`
  );

  // Fix queryClient invalidation
  content = content.replace(/queryClient\.invalidateQueries\(\{ queryKey: \["announcements-list"\] \}\);/g, 'qc.invalidateQueries({ queryKey: ["hr-announcements"] });');

  // Fix empty actions={} on PageHeader
  content = content.replace(/actions=\{\s*\}/g, '');

  // Fix total in GlobalListActionToolbar
  content = content.replace(/totalFilteredCount=\{total\}/g, 'totalFilteredCount={announcements.length}');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed:', filePath);
}

fixAnnouncements('src/routes/_authenticated/hr/organization/announcements.tsx');
fixAnnouncements('CMS/src/app/(workspace)/hr/organization/announcements/page.tsx');
