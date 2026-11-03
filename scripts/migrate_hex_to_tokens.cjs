const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/routes/_authenticated/hr/meetings/types.tsx',
  'src/routes/_authenticated/_app/leave.tsx',
  'src/routes/_authenticated/_app/hrm-dashboard.tsx',
  'src/routes/_authenticated/_app/employee-dashboard.tsx',
  'src/routes/_authenticated/_app/finance-dashboard.tsx',
  'src/components/assets/asset-dashboard-view.tsx',
  'src/components/smart-dashboard/financial-section.tsx',
  'src/components/smart-dashboard/operational-section.tsx',
  'src/components/smart-dashboard/sales-section.tsx',
  'src/components/smart-reports/report-view.tsx',
  'src/components/plan-guard.tsx',
  'src/components/ai-content-generator-modal.tsx',
];

let totalReplacements = 0;

for (const rel of targetFiles) {
  if (!fs.existsSync(rel)) continue;
  let code = fs.readFileSync(rel, 'utf8');
  const initial = code;

  // Replace hardcoded primary brand colors
  code = code.replace(/#6366f1/gi, 'var(--primary)');
  code = code.replace(/#7367f0/gi, 'var(--primary)');
  
  // Replace dark mode unreadable dark text on cards in dashboard charts
  code = code.replace(/color:\s*["']#1E293B["']/gi, 'color: "var(--foreground)"');
  code = code.replace(/color:\s*["']#111827["']/gi, 'color: "var(--foreground)"');
  code = code.replace(/colors:\s*["']#94A3B8["']/gi, 'colors: "var(--muted-foreground)"');
  code = code.replace(/color:\s*["']#94A3B8["']/gi, 'color: "var(--muted-foreground)"');

  if (code !== initial) {
    fs.writeFileSync(rel, code, 'utf8');
    totalReplacements++;
    console.log(`Migrated hex tokens in ${rel}`);
  }
}

console.log(`Completed hex to token migration in ${totalReplacements} files`);

