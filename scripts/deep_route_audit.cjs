const fs = require('fs');
const path = require('path');

// 1. All CMS page files
function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        getFiles(full, files);
      }
    } else if (item.startsWith('page.') && (item.endsWith('.tsx') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.js'))) {
      files.push(full);
    }
  }
  return files;
}

const cmsFiles = getFiles('CMS/src/app');

function filePathToRoute(filePath) {
  let rel = filePath.replace(/\\/g, '/');
  rel = rel.replace(/^CMS\/src\/app/, '');
  rel = rel.replace(/\/page\.(tsx|jsx|ts|js)$/, '');
  const segments = rel.split('/').filter(s => s && !(s.startsWith('(') && s.endsWith(')')));
  return '/' + segments.join('/');
}

// Extract sidebar links and labels from dreams-sidebar.tsx
const sidebarCode = fs.readFileSync('CMS/src/components/dreams-sidebar.tsx', 'utf8');
const sidebarItems = [];

// Match Link tags with 'to' and their text
const linkRegex = /<Link\s+[^>]*to="([^"]+)"[^>]*>([\s\S]*?)<\/Link>/g;
let lm;
while ((lm = linkRegex.exec(sidebarCode)) !== null) {
  const route = lm[1];
  const label = lm[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  sidebarItems.push({ route, label, source: 'dreams-sidebar.tsx' });
}

// Also match <a> tags with href
const aRegex = /<a\s+[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
while ((lm = aRegex.exec(sidebarCode)) !== null) {
  const route = lm[1];
  const label = lm[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  sidebarItems.push({ route, label, source: 'dreams-sidebar.tsx' });
}

console.log('Total extracted sidebar items:', sidebarItems.length);
const sidebarRouteMap = new Map();
sidebarItems.forEach(item => {
  if (!sidebarRouteMap.has(item.route)) {
    sidebarRouteMap.set(item.route, item.label);
  }
});

// Also read registry.ts
const registryCode = fs.readFileSync('CMS/src/nav/registry.ts', 'utf8');
const regRegex = /{\s*id:\s*"([^"]+)",\s*portal:\s*"([^"]+)",\s*heading:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*path:\s*([^,\n]+)/g;
let rm;
const registryItems = [];
while ((rm = regRegex.exec(registryCode)) !== null) {
  registryItems.push({
    id: rm[1],
    portal: rm[2],
    heading: rm[3],
    label: rm[4],
    rawPath: rm[5].trim()
  });
}
console.log('Total structured registry items:', registryItems.length);

// Audit each CMS page
const auditedPages = cmsFiles.map((file, index) => {
  const relFile = file.replace(/\\/g, '/');
  const route = filePathToRoute(file);
  const content = fs.readFileSync(file, 'utf8');

  // Component Name
  const exportMatch = content.match(/export\s+default\s+function\s+([a-zA-Z0-9_]+)/) ||
                      content.match(/function\s+([a-zA-Z0-9_]+)\s*\(/) ||
                      content.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|function)/);
  const componentName = exportMatch ? exportMatch[1] : 'AnonymousPage';

  // Title / Heading in page
  const titleMatch = content.match(/title="([^"]+)"/) ||
                     content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/) ||
                     content.match(/<PageHeader[^>]*title="([^"]+)"/);
  const pageTitle = titleMatch ? titleMatch[1].trim() : path.basename(route);

  // Dynamic route check
  const isDynamic = route.includes('[') || route.includes('$');
  const routeType = isDynamic ? 'dynamic' : (route.split('/').length > 2 ? 'nested' : 'static');

  // Sidebar mapping
  const isMappedInSidebar = sidebarRouteMap.has(route);
  const sidebarLabel = isMappedInSidebar ? sidebarRouteMap.get(route) : null;

  // Access control evidence
  const hasSuperAdminCheck = content.includes('isSuperAdmin') || content.includes('isSuperAdminUser') || relFile.includes('/super/');
  const hasWorkspaceAdminCheck = content.includes('isWorkspaceAdmin') || content.includes('isWorkspaceAdminUser') || content.includes('isAdmin');
  const hasHrAdminCheck = content.includes('isHrAdmin') || content.includes('isHrAdminUser') || relFile.includes('/hr/');
  const hasEmployeeCheck = relFile.includes('/me/') || content.includes('isEmployeeOnly');
  const hasPermissionCall = content.includes('hasPermission');
  const hasAddonCheck = content.includes('isEntitled') || content.includes('moduleKey') || relFile.includes('/addons/');

  let roleRequirement = 'Authenticated User';
  if (hasSuperAdminCheck) roleRequirement = 'Super Admin';
  else if (hasWorkspaceAdminCheck) roleRequirement = 'Workspace Admin / Tenant Admin';
  else if (hasHrAdminCheck) roleRequirement = 'HR Admin';
  else if (hasEmployeeCheck) roleRequirement = 'Employee (Self-Service)';

  // API integrations
  const apiCalls = [...content.matchAll(/api\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g)].map(m => `${m[1].toUpperCase()} ${m[2]}`);
  const uniqueApiCalls = [...new Set(apiCalls)];

  return {
    pageId: '', // will be assigned by group
    file: relFile,
    route,
    routeType,
    componentName,
    pageTitle,
    isMappedInSidebar,
    sidebarLabel,
    roleRequirement,
    hasPermissionCall,
    hasAddonCheck,
    apiCalls: uniqueApiCalls,
    contentSize: content.length
  };
});

console.log('Audited pages count:', auditedPages.length);

// Grouping and ID assignment
let dashCount = 0;
let invCount = 0;
let salesCount = 0;
let billCount = 0;
let accCount = 0;
let procCount = 0;
let finCount = 0;
let crmCount = 0;
let projCount = 0;
let recCount = 0;
let posCount = 0;
let assetCount = 0;
let suppCount = 0;
let memCount = 0;
let sysCount = 0;
let aiCount = 0;
let hrCount = 0;
let otherCount = 0;

auditedPages.forEach(p => {
  const r = p.route.toLowerCase();
  if (r.includes('dashboard')) {
    dashCount++;
    p.pageId = `DASH-${String(dashCount).padStart(3, '0')}`;
    p.group = 'Dashboard';
  } else if (r.includes('inventory') || r.includes('product') || r.includes('brand') || r.includes('unit') || r.includes('warehouse') || r.includes('stock')) {
    invCount++;
    p.pageId = `INV-${String(invCount).padStart(3, '0')}`;
    p.group = 'Inventory';
  } else if (r.includes('sales') || r.includes('customer') || r.includes('estimate') || r.includes('order') || r.includes('delivery')) {
    salesCount++;
    p.pageId = `SALES-${String(salesCount).padStart(3, '0')}`;
    p.group = 'Sales';
  } else if (r.includes('invoice') || r.includes('billing') || r.includes('payment') || r.includes('tax')) {
    billCount++;
    p.pageId = `BILL-${String(billCount).padStart(3, '0')}`;
    p.group = 'Billing';
  } else if (r.includes('accounting') || r.includes('budget') || r.includes('ledger') || r.includes('chart-of-accounts')) {
    accCount++;
    p.pageId = `ACC-${String(accCount).padStart(3, '0')}`;
    p.group = 'Accounting';
  } else if (r.includes('purchase') || r.includes('vendor') || r.includes('procurement') || r.includes('supplier')) {
    procCount++;
    p.pageId = `PROC-${String(procCount).padStart(3, '0')}`;
    p.group = 'Procurement';
  } else if (r.includes('finance') || r.includes('expense') || r.includes('cashflow') || r.includes('profit-loss')) {
    finCount++;
    p.pageId = `FIN-${String(finCount).padStart(3, '0')}`;
    p.group = 'Finance';
  } else if (r.includes('crm') || r.includes('lead') || r.includes('deal') || r.includes('contact') || r.includes('company') || r.includes('pipeline') || r.includes('campaign')) {
    crmCount++;
    p.pageId = `CRM-${String(crmCount).padStart(3, '0')}`;
    p.group = 'CRM';
  } else if (r.includes('project') || r.includes('client') || r.includes('task') || r.includes('timesheet') || r.includes('milestone')) {
    projCount++;
    p.pageId = `PROJ-${String(projCount).padStart(3, '0')}`;
    p.group = 'Projects';
  } else if (r.includes('recruit') || r.includes('job') || r.includes('candidate') || r.includes('referral') || r.includes('resume')) {
    recCount++;
    p.pageId = `REC-${String(recCount).padStart(3, '0')}`;
    p.group = 'Recruitment';
  } else if (r.includes('pos') || r.includes('barcode') || r.includes('qrcode')) {
    posCount++;
    p.pageId = `POS-${String(posCount).padStart(3, '0')}`;
    p.group = 'POS';
  } else if (r.includes('asset')) {
    assetCount++;
    p.pageId = `ASSET-${String(assetCount).padStart(3, '0')}`;
    p.group = 'Assets';
  } else if (r.includes('support') || r.includes('ticket') || r.includes('contact-message') || r.includes('knowledge') || r.includes('sla')) {
    suppCount++;
    p.pageId = `SUPP-${String(suppCount).padStart(3, '0')}`;
    p.group = 'Support';
  } else if (r.includes('membership') || r.includes('plan') || r.includes('subscription')) {
    memCount++;
    p.pageId = `MEM-${String(memCount).padStart(3, '0')}`;
    p.group = 'Membership';
  } else if (r.includes('ai-') || r.includes('/ai') || r.includes('assistant') || r.includes('advisor') || r.includes('copilot')) {
    aiCount++;
    p.pageId = `AI-${String(aiCount).padStart(3, '0')}`;
    p.group = 'AI Center';
  } else if (r.includes('setting') || r.includes('user') || r.includes('role') || r.includes('permission') || r.includes('super') || r.includes('system')) {
    sysCount++;
    p.pageId = `SYS-${String(sysCount).padStart(3, '0')}`;
    p.group = 'System';
  } else if (r.includes('employee') || r.includes('attendance') || r.includes('leave') || r.includes('payroll') || r.includes('/hr') || r.includes('/me')) {
    hrCount++;
    p.pageId = `HR-${String(hrCount).padStart(3, '0')}`;
    p.group = 'HR Operations';
  } else {
    otherCount++;
    p.pageId = `PAGE-${String(otherCount).padStart(3, '0')}`;
    p.group = 'General / UI';
  }
});

console.log('Group counts:', {
  Dashboard: dashCount,
  Inventory: invCount,
  Sales: salesCount,
  Billing: billCount,
  Accounting: accCount,
  Procurement: procCount,
  Finance: finCount,
  CRM: crmCount,
  Projects: projCount,
  Recruitment: recCount,
  POS: posCount,
  Assets: assetCount,
  Support: suppCount,
  Membership: memCount,
  AICenter: aiCount,
  System: sysCount,
  HROperations: hrCount,
  GeneralUI: otherCount
});

fs.writeFileSync('scripts/audited_pages_full.json', JSON.stringify(auditedPages, null, 2));
console.log('Saved full audited pages to scripts/audited_pages_full.json');
