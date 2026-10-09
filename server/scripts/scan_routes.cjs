const fs = require('fs');
const path = require('path');

const serverDir = path.resolve(__dirname, '..');
const routesDir = path.join(serverDir, 'src/routes');
const indexFile = path.join(serverDir, 'src/index.ts');
const prismaSchemaFile = path.join(serverDir, 'prisma/schema.prisma');
const targetJsonFile = path.join(serverDir, 'src/discovered_endpoints.json');

const indexContent = fs.readFileSync(indexFile, 'utf8');
const prismaSchema = fs.readFileSync(prismaSchemaFile, 'utf8');

// 1. Map index.ts imports to router variable names and source files
const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/routes\/([^"']+)["']/g;
const routerToFile = {};
let im;
while ((im = importRegex.exec(indexContent)) !== null) {
  const ids = im[1].split(',').map(s => s.trim());
  const file = im[2] + '.routes.ts';
  for (const id of ids) {
    routerToFile[id] = file;
  }
}
const defImportRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+["']\.\/routes\/([^"']+)["']/g;
while ((im = defImportRegex.exec(indexContent)) !== null) {
  routerToFile[im[1]] = im[2] + '.routes.ts';
}

// 2. Map router mounts from index.ts
const mountRegex = /app\.use\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
const routerMounts = {};
let mm;
while ((mm = mountRegex.exec(indexContent)) !== null) {
  const mountPath = mm[1];
  const routerName = mm[2];
  if (!routerMounts[routerName]) routerMounts[routerName] = [];
  routerMounts[routerName].push(mountPath);
}

// Map platform-foundation.routes.ts sub-mounts
const pfPath = path.join(routesDir, 'platform-foundation.routes.ts');
if (fs.existsSync(pfPath)) {
  const pfContent = fs.readFileSync(pfPath, 'utf8');
  const pfImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/([^"']+)["']/g;
  const pfRouterToFile = {};
  while ((im = pfImportRegex.exec(pfContent)) !== null) {
    const ids = im[1].split(',').map(s => s.trim());
    const file = im[2] + '.routes.ts';
    for (const id of ids) {
      pfRouterToFile[id] = file;
    }
  }
  const pfMountRegex = /platformFoundationRouter\.use\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
  while ((mm = pfMountRegex.exec(pfContent)) !== null) {
    const subMount = mm[1];
    const rName = mm[2];
    if (!routerMounts[rName]) routerMounts[rName] = [];
    routerMounts[rName].push('/api/v1' + subMount);
    routerMounts[rName].push('/api' + subMount);
    if (pfRouterToFile[rName]) {
      routerToFile[rName] = pfRouterToFile[rName];
    }
  }
}

// 3. Scan all route files
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts'));
const allEndpoints = [];
const seenKey = new Set();

const moduleDisplayNames = {
  accounting: "Double-Entry Accounting",
  addons: "Add-on Marketplace",
  adjustments: "Inventory Adjustments",
  ai: "AI & Intelligence Services",
  alerts: "Alerts & Notifications",
  announcements: "Company Announcements",
  "app-config": "Application Configuration",
  assets: "Asset Management & QR Tracking",
  attendance: "Attendance & IoT Biometrics",
  auth: "Authentication & RBAC",
  awards: "Employee Awards & Recognition",
  "bank-disbursement": "Bank NACH / NEFT Disbursement",
  billing: "Billing & Subscriptions",
  biometric: "Biometric Hardware Sync (ZKTeco)",
  budgets: "Financial Budgets",
  calendar: "Company Calendar",
  campaigns: "CRM Marketing Campaigns",
  chat: "Internal Team Chat",
  client: "Client External Portal",
  cms: "Content Management & Pages",
  "company-profile": "Company Profile & GST",
  compliance: "Statutory Compliance Engine",
  crm: "CRM Sales Pipelines & Leads",
  "custom-fields": "Custom Dynamic Fields",
  customers: "Customer Master Data",
  dashboard: "Aggregated Analytics Dashboard",
  docs: "Developer Documentation & API Matrix",
  documents: "Document Vault & Policies",
  ecommerce: "E-Commerce Integrations",
  "employee-self-service": "Employee Self-Service (ESS)",
  employees: "Employee Directory & Core HR",
  expenses: "Expense Reimbursements",
  fbp: "Flexible Benefit Plan (FBP)",
  forms: "Custom Form Submissions",
  helpdesk: "Internal Helpdesk Ticketing",
  "hr-assets": "HR Asset Allocations",
  "hr-attendance": "HR Attendance Administration",
  "hr-collaboration": "HR Collaboration Hub",
  "hr-documents": "HR Document Records",
  "hr-employees": "HR Employee Management",
  "hr-leave": "HR Leave & PTO Admin",
  "hr-lifecycle": "HR Lifecycle Management",
  "hr-meetings": "HR Meeting Scheduler",
  "hr-payroll": "HR Statutory Payroll",
  "hr-performance": "HR Performance Reviews",
  "hr-recruitment": "HR Recruitment & ATS",
  "hr-training": "HR Training & LMS",
  "hrm-extensions": "HRM Extensions & Overtime",
  invoices: "B2B Invoices & Estimates",
  leave: "Leave & PTO Engine",
  "me-assets": "ESS My Custody Assets",
  "me-attendance": "ESS My Clock-in & Attendance",
  "me-collaboration": "ESS Team Collaboration",
  "me-documents": "ESS My Document Vault",
  "me-leave": "ESS My Leave Requests",
  "me-lifecycle": "ESS My Onboarding & Transitions",
  "me-meetings": "ESS My Scheduled Meetings",
  "me-payroll": "ESS My Payslips & Tax Declarations",
  "me-performance": "ESS My Performance Goals",
  "me-recruitment": "ESS Internal Job Openings",
  "me-training": "ESS My Learning & Courses",
  media: "Media Upload & Asset Storage",
  notes: "Private & Shared Notes",
  offboarding: "Offboarding & Exit Clearances (FnF)",
  okr: "OKR Goals & Objectives",
  organization: "Organization & Departments Master",
  payments: "Payment Gateways & Transactions",
  "payroll-phase1": "Payroll Phase 1 Processing",
  payroll: "Statutory Payroll & Tax Compliance",
  "platform-foundation": "Platform Foundation Services",
  "platform-support": "Platform Support Tickets",
  products: "Product & Inventory Catalog",
  projects: "Project Management & Kanban",
  purchases: "Purchases & Procurement",
  qz: "Thermal Receipt Printing (QZ Tray)",
  recruitment: "Recruitment & Candidate Tracking",
  returns: "Sales & Purchase Returns",
  sales: "POS & Sales Transactions",
  settings: "Platform Global & Tenant Settings",
  shifts: "Shift Rostering & Swaps",
  shopify: "Shopify Store Sync",
  "statutory-returns": "Statutory Tax Returns (16/24Q/EPF)",
  super: "Super Admin Platform Console",
  suppliers: "Vendor & Supplier Catalog",
  "tenant-domain": "Custom Domain White-Labeling",
  timesheets: "Project Timesheets",
  todos: "Tasks & To-Do Tracking",
  training: "Training & LMS Modules",
  transfers: "Warehouse Stock Transfers",
  warnings: "Employee Disciplinary Warnings",
  woocommerce: "WooCommerce Store Sync",
  workflows: "Automated Approval Workflows",
  "workspace-routing": "Tenant Workspace Host Routing",
  workspace: "Tenant Workspace Management",
};

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const baseName = file.replace('.routes.ts', '');
  const moduleName = moduleDisplayNames[baseName] || (baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/-/g, ' '));

  // Check file-level auth
  const fileHasAuth = content.includes('use(requireAuth)') || content.includes('use(requireEmployee');

  // Discover router names declared in this file
  const routerDeclarations = [];
  const declRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:express\.)?Router\(/g;
  let dm;
  while ((dm = declRegex.exec(content)) !== null) {
    routerDeclarations.push(dm[1]);
  }
  if (routerDeclarations.length === 0) {
    routerDeclarations.push('router');
  }

  // Iterate over declared routers
  for (const rName of routerDeclarations) {
    let mounts = routerMounts[rName] || [];
    if (mounts.length === 0) {
      if (baseName === 'accounting') mounts = ['/api/accounting'];
      else mounts = ['/api/' + baseName];
    }
    mounts = Array.from(new Set(mounts));

    const rPattern = rName === 'router' ? '(?:router)' : `(?:${rName}|router)`;
    const epRegex = new RegExp(`${rPattern}\\.(get|post|put|delete|patch)\\(\\s*["']([^"']+)["']([\\s\\S]*?)(?=\\n\\s*${rPattern}\\.(?:get|post|put|delete|patch)|\\n\\s*export|\\n\\s*module\\.exports|$)`, 'g');

    let epMatch;
    while ((epMatch = epRegex.exec(content)) !== null) {
      const method = epMatch[1].toUpperCase();
      const subpath = epMatch[2];
      const handlerBody = epMatch[3];

      const authRequired = fileHasAuth || handlerBody.includes('requireAuth') || handlerBody.includes('authenticate') || handlerBody.includes('requireEmployee');

      const roles = [];
      const roleMatch = handlerBody.match(/requireRole\(\s*\[?([^\]\)]+)\]?\s*\)/);
      if (roleMatch) {
        roles.push(...roleMatch[1].replace(/["']/g, '').split(',').map(s => s.trim()));
      }
      if (baseName === 'super' && roles.length === 0) {
        roles.push('super_admin');
      }

      const permissions = [];
      const permMatch = handlerBody.match(/requirePermission\(\s*["']([^"']+)["']\s*\)/);
      if (permMatch) {
        permissions.push(permMatch[1]);
      }

      let requiredAddon = null;
      const addonMatch = handlerBody.match(/requireAddon\(\s*["']([^"']+)["']\s*\)/);
      if (addonMatch) {
        requiredAddon = addonMatch[1];
      }

      const tenantScoped = handlerBody.includes('tenantId') || handlerBody.includes('req.user?.tenantId') || handlerBody.includes('req.tenantId') || handlerBody.includes('getTenantDb');

      const prismaModelMatches = handlerBody.match(/(?:prisma|db)\.([a-zA-Z0-9_]+)\./g) || [];
      const dbModels = Array.from(new Set(prismaModelMatches.map(m => m.replace(/^(prisma|db)\./, '').replace('.', '')))).filter(m => m !== '$queryRaw' && m !== '$executeRaw' && m !== '$transaction');

      const pathParams = (subpath.match(/:[a-zA-Z0-9_]+/g) || []).map(p => p.replace(':', ''));

      const queryMatches = handlerBody.match(/req\.query\.([a-zA-Z0-9_]+)/g) || [];
      const queryParams = Array.from(new Set(queryMatches.map(q => q.replace('req.query.', ''))));

      const reqBodyFields = [];
      const bodyMatches = handlerBody.match(/(?:const|let)\s*\{([^}]+)\}\s*=\s*req\.body/);
      if (bodyMatches) {
        reqBodyFields.push(...bodyMatches[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(f => f && !f.includes('\n')));
      }
      const directBodyMatches = handlerBody.match(/req\.body\.([a-zA-Z0-9_]+)/g) || [];
      reqBodyFields.push(...directBodyMatches.map(b => b.replace('req.body.', '')));

      for (const primaryMount of mounts) {
        const cleanSub = (subpath === '/' || subpath === '') ? '' : subpath;
        const fullPath = (primaryMount + cleanSub).replace(/\/+/g, '/');
        const key = `${method}_${fullPath}`;

        if (seenKey.has(key)) continue;
        seenKey.add(key);

        let status = 'WORKING';
        let description = `${method} endpoint for ${moduleName}`;

        if (handlerBody.includes('TODO') || handlerBody.includes('not implemented') || handlerBody.includes('res.status(501)')) {
          status = 'PARTIAL';
          description += ' (Incomplete stub/TODO detected)';
        } else if (handlerBody.includes('cmsPage.find') && ['pos', 'products', 'invoices', 'crm'].includes(baseName)) {
          status = 'PARTIAL';
          description += ' (CMS JSON compatibility bridge)';
        }

        allEndpoints.push({
          id: `${method}_${fullPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
          method,
          subpath,
          fullPath,
          module: moduleName,
          description,
          authRequired,
          requiredRoles: Array.from(new Set(roles)),
          requiredPermissions: Array.from(new Set(permissions)),
          requiredAddon,
          tenantScoped,
          databaseModels: dbModels,
          status,
          requestParams: pathParams,
          queryParams: Array.from(new Set(queryParams)),
          requestBodyFields: Array.from(new Set(reqBodyFields)),
        });
      }
    }
  }
}

// 4. Discover Prisma models
const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
const dbModelsList = [];
let modelMatch;
while ((modelMatch = modelRegex.exec(prismaSchema)) !== null) {
  const modelName = modelMatch[1];
  const body = modelMatch[2];
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@'));
  const hasTenantId = body.includes('tenantId') || body.includes('tenant_id');
  const relationLines = body.split('\n').filter(l => l.includes('@relation'));
  const relations = relationLines.map(l => l.trim().split(/\s+/)[0]);
  const indexLines = body.split('\n').filter(l => l.includes('@@index'));
  const indexes = indexLines.map(l => l.trim());

  dbModelsList.push({
    name: modelName,
    fieldsCount: lines.length,
    hasTenantId,
    relations,
    indexes,
  });
}

console.log(`Discovered ${allEndpoints.length} total active endpoints across ${routeFiles.length} files.`);
console.log(`Discovered ${dbModelsList.length} Prisma models.`);

const output = {
  endpoints: allEndpoints,
  models: dbModelsList,
};

fs.writeFileSync(targetJsonFile, JSON.stringify(output, null, 2), 'utf8');
console.log(`Successfully generated ${targetJsonFile}`);
