const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const manifest = [];

function getFolderSize(d) {
  let total = 0;
  try {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) total += getFolderSize(full);
      else if (ent.isFile()) total += fs.statSync(full).size;
    }
  } catch (e) {}
  return total;
}

function removeDirectory(dirPath, category, reason) {
  const norm = dirPath.replace(/\\/g, '/');
  if (!fs.existsSync(dirPath)) {
    console.log(`[SKIP] Directory does not exist: ${norm}`);
    return;
  }
  const size = getFolderSize(dirPath);
  console.log(`[REMOVING DIR] ${norm} (${(size / (1024 * 1024)).toFixed(2)} MB)...`);
  fs.rmSync(dirPath, { recursive: true, force: true });
  manifest.push({
    path: norm,
    type: 'directory',
    sizeBytes: size,
    sizeMB: Number((size / (1024 * 1024)).toFixed(2)),
    category,
    reason
  });
}

function removeFile(filePath, category, reason, isTracked = false) {
  const norm = filePath.replace(/\\/g, '/');
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] File does not exist: ${norm}`);
    return;
  }
  const size = fs.statSync(filePath).size;
  console.log(`[REMOVING FILE] ${norm} (${(size / 1024).toFixed(1)} KB)...`);
  if (isTracked) {
    try {
      cp.execSync(`git rm -f "${filePath}"`, { stdio: 'pipe' });
    } catch (e) {
      fs.unlinkSync(filePath);
    }
  } else {
    fs.unlinkSync(filePath);
  }
  manifest.push({
    path: norm,
    type: 'file',
    sizeBytes: size,
    sizeMB: Number((size / (1024 * 1024)).toFixed(4)),
    category,
    reason
  });
}

console.log('=== STARTING SAFE CLEANUP EXECUTION ===');

// 1. Untracked Next.js Cache & Build Outputs
removeDirectory('CMS/.next', 'Category C: Generated Artifact', 'Untracked Next.js webpack cache and dev builds; regenerated cleanly by next build.');
removeDirectory('.next', 'Category C: Generated Artifact', 'Untracked root legacy Next.js build cache.');
removeDirectory('dist', 'Category C: Generated Artifact', 'Untracked root Vite build output; regenerated cleanly by npm run build:vite.');

// 2. Untracked Temporary Folders
removeDirectory('node_modules_cms_temp', 'Category A: Unused / Temporary', 'Untracked temporary backup copy of CMS node_modules from prior dependency restructuring.');
removeDirectory('docs/Addon/extracted', 'Category A: Unused / Temporary', 'Untracked temporary zip extraction artifacts from legacy addon inspection.');

// 3. Stale Prisma query engine .tmp DLLs
const findTmpPrisma = (dir) => {
  let list = [];
  if (!fs.existsSync(dir)) return list;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) list = list.concat(findTmpPrisma(full));
    else if (ent.name.includes('.tmp')) list.push(full);
  }
  return list;
};

const tmpPrismaFiles = findTmpPrisma('node_modules/.prisma').concat(findTmpPrisma('server/node_modules/.prisma'));
console.log(`Found ${tmpPrismaFiles.length} Prisma query_engine temporary DLL files.`);
for (const tmpFile of tmpPrismaFiles) {
  removeFile(tmpFile, 'Category C: Generated Artifact', 'Stale temporary query_engine DLL copy generated during Windows prisma generate with locked handles.');
}

// 4. Duplicate Media File (Tracked)
removeFile('CMS/public/video/hero-video.mp4', 'Category B: Duplicate Asset', 'Exact SHA-256 byte duplicate of canonical CMS/public/videos/hero-video.mp4 referenced in CMS/src/components/home/hero.tsx', true);
if (fs.existsSync('CMS/public/video') && fs.readdirSync('CMS/public/video').length === 0) {
  fs.rmdirSync('CMS/public/video');
}

// 5. Obsolete JSON Audit Dumps in scripts/
const obsoleteJsonDumps = [
  'census_diff.json',
  'chat_call_flow_results.json',
  'chat_final_acceptance_results.json',
  'chat_final_staging_evidence.json',
  'chat_functional_audit_results.json',
  'chat_realtime_performance_results.json',
  'chat_ui_group_activity_acceptance_results.json',
  'chat_webrtc_deep_audit_results.json',
  'classified_routes_full.json',
  'consolidated_audit_results.json',
  'detailed_66_analysis.json',
  'email_acceptance_results.json',
  'extracted_payroll_metadata.json',
  'full_discovered_route_inventory.json',
  'incomplete_routes_deep_audit.json',
  'incomplete_routes_inventory.json',
  'independent_acceptance_results.json',
  'media_baseline.json',
  'migration_audit_results.json',
  'navigation_reconciliation.json',
  'reexports_analysis.json',
  'route_deep_audit.json',
  'webrtc_calling_and_group_members_results.json'
];

for (const jsonFile of obsoleteJsonDumps) {
  const target = path.join('scripts', jsonFile);
  removeFile(target, 'Category D: Obsolete Test / Debug Artifact', 'One-off static JSON audit report from prior migration tasks; not referenced in package.json or CI.', true);
}

// Calculate totals
const totalBytes = manifest.reduce((sum, item) => sum + item.sizeBytes, 0);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(3);

console.log('=== CLEANUP SUMMARY ===');
console.log(`Total items cleaned: ${manifest.length}`);
console.log(`Total space freed: ${totalMB} MB (${totalGB} GB)`);

// Write manifest
const manifestDir = path.join(__dirname, '../docs/hrms-audit');
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true });
}

fs.writeFileSync(
  path.join(manifestDir, 'DELETION_MANIFEST.json'),
  JSON.stringify({ totalItems: manifest.length, totalBytes, totalMB, totalGB, manifest }, null, 2)
);

let mdReport = '# MASTERHRMS — REPOSITORY CLEANUP DELETION MANIFEST\n\n';
mdReport += `Generated on: ${new Date().toISOString()}\n`;
mdReport += `Total Items Removed: **${manifest.length}**\n`;
mdReport += `Total Space Recovered: **${totalMB} MB (${totalGB} GB)**\n\n`;
mdReport += '| Path | Type | Size (MB) | Category | Justification |\n';
mdReport += '| :--- | :--- | :--- | :--- | :--- |\n';
for (const item of manifest) {
  mdReport += `| \`${item.path}\` | ${item.type} | ${item.sizeMB} | ${item.category} | ${item.reason} |\n`;
}

fs.writeFileSync(path.join(manifestDir, 'DELETION_MANIFEST.md'), mdReport);
console.log(`Manifest written to ${path.join(manifestDir, 'DELETION_MANIFEST.md')}`);

