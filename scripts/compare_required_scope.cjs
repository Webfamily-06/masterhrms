const fs = require('fs');

const pages = JSON.parse(fs.readFileSync('scripts/audited_pages_full.json', 'utf8'));

// Build lookup map by route
const routeMap = new Map();
pages.forEach(p => {
  routeMap.set(p.route, p);
});

// Also helper to search by keyword/pattern
function findRoutes(pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  return pages.filter(p => re.test(p.route) || re.test(p.pageTitle) || re.test(p.file));
}

const requirements = {
  dashboards: [
    { name: 'HR Dashboard', expectedRoute: '/hrm-dashboard' },
    { name: 'Inventory Dashboard', expectedRoute: '/inventory-dashboard' },
    { name: 'CRM Dashboard', expectedRoute: '/crm-dashboard' },
    { name: 'POS Dashboard', expectedRoute: '/pos-dashboard' },
    { name: 'Finance Dashboard', expectedRoute: '/finance-dashboard' },
    { name: 'Sales Dashboard', expectedRoute: '/sales-dashboard' },
    { name: 'Procurement Dashboard', expectedRoute: '/procurement-dashboard' },
    { name: 'Project Dashboard', expectedRoute: '/project-dashboard' },
    { name: 'Support Dashboard', expectedRoute: '/support-dashboard' },
    { name: 'Tenant Dashboard', expectedRoute: '/tenant/dashboard' },
    { name: 'Employee Dashboard', expectedRoute: '/me/dashboard' },
    { name: 'Deals Dashboard', expectedRoute: '/deals-dashboard' },
    { name: 'Leads Dashboard', expectedRoute: '/leads-dashboard' },
    { name: 'Payroll Dashboard', expectedRoute: '/payroll-dashboard' },
    { name: 'Attendance Dashboard', expectedRoute: '/attendance-dashboard' },
    { name: 'IT Admin Dashboard', expectedRoute: '/it-admin-dashboard' },
    { name: 'Assets Dashboard', expectedRoute: '/asset-dashboard' },
  ],
  inventory: [
    { name: 'Products', keywords: ['/products', '/product-list', '/inventory/products'] },
    { name: 'Categories', keywords: ['/category', '/categories', '/product-categories'] },
    { name: 'Brands', keywords: ['/brands', '/brand'] },
    { name: 'Units', keywords: ['/units', '/unit'] },
    { name: 'Inventory', keywords: ['/inventory', '/inventory-management'] },
    { name: 'Suppliers', keywords: ['/suppliers', '/supplier'] },
    { name: 'Warehouse', keywords: ['/warehouse', '/warehouses'] },
    { name: 'Manage Stock', keywords: ['/stock', '/manage-stock'] },
    { name: 'Stock Adjustment', keywords: ['/stock-adjustment', '/adjustments'] },
    { name: 'Stock Transfer', keywords: ['/stock-transfer', '/transfers'] },
  ],
  sales: [
    { name: 'Customers', keywords: ['/customers', '/clients'] },
    { name: 'Sales Orders', keywords: ['/sales-orders', '/orders'] },
    { name: 'Recurring Invoices', keywords: ['/recurring-invoices', '/invoices/recurring'] },
    { name: 'Invoice Templates', keywords: ['/invoice-templates', '/templates/invoices'] },
    { name: 'Credit Notes', keywords: ['/credit-notes', '/creditnote'] },
    { name: 'Sales Quotes', keywords: ['/sales-quotes', '/quotes', '/estimates'] },
    { name: 'Cash Quotes', keywords: ['/cash-quotes'] },
    { name: 'Refunds', keywords: ['/refunds', '/refund'] },
    { name: 'Delivery Notes', keywords: ['/delivery-notes', '/delivery'] },
    { name: 'Sales Analytics', keywords: ['/sales-analytics', '/sales-report'] },
  ],
  billing: [
    { name: 'Estimates', keywords: ['/estimates', '/estimate'] },
    { name: 'Invoices', keywords: ['/invoices', '/invoice'] },
    { name: 'Payments', keywords: ['/payments', '/payment'] },
    { name: 'Expenses', keywords: ['/expenses', '/expense'] },
    { name: 'Provident Fund', keywords: ['/provident-fund', '/provident'] },
    { name: 'Taxes', keywords: ['/taxes', '/tax'] },
  ],
  accounting: [
    { name: 'Categories', keywords: ['/accounting/categories', '/account-categories'] },
    { name: 'Budget', keywords: ['/budget', '/budgets'] },
    { name: 'Budget Expenses', keywords: ['/budget-expenses', '/budget/expenses'] },
    { name: 'Budget Revenues', keywords: ['/budget-revenues', '/budget/revenues'] },
  ],
  procurement: [
    { name: 'Purchases', keywords: ['/purchases', '/purchase'] },
    { name: 'Purchase Orders', keywords: ['/purchase-orders', '/po'] },
    { name: 'Purchase Return', keywords: ['/purchase-returns', '/purchases/return'] },
    { name: 'Vendors', keywords: ['/vendors', '/vendor'] },
    { name: 'Procurement Analytics', keywords: ['/procurement-analytics', '/procurement-report'] },
  ],
  finance: [
    { name: 'Expenses', keywords: ['/expenses', '/finance/expenses'] },
    { name: 'Expense Category', keywords: ['/expense-category', '/expense-categories'] },
    { name: 'Payments', keywords: ['/payments', '/finance/payments'] },
    { name: 'Cashflow', keywords: ['/cashflow', '/cash-flow'] },
    { name: 'Budgeting', keywords: ['/budgeting', '/budget'] },
    { name: 'Taxes', keywords: ['/taxes', '/tax-rates'] },
    { name: 'Expense Summary', keywords: ['/expense-summary', '/reports/expense-summary'] },
    { name: 'Income Summary', keywords: ['/income-summary', '/reports/income-summary'] },
    { name: 'Profit & Loss', keywords: ['/profit-loss', '/reports/profit-loss'] },
    { name: 'Income vs Expense', keywords: ['/income-vs-expense'] },
    { name: 'Tax Summary', keywords: ['/tax-summary', '/reports/tax-summary'] },
  ],
  crm: [
    { name: 'Contacts', keywords: ['/contacts', '/crm/contacts'] },
    { name: 'Companies', keywords: ['/companies', '/crm/companies'] },
    { name: 'Leads', keywords: ['/leads', '/crm/leads'] },
    { name: 'Deals', keywords: ['/deals', '/crm/deals'] },
    { name: 'Pipeline', keywords: ['/pipeline', '/pipelines', '/crm/pipeline'] },
    { name: 'Campaigns', keywords: ['/campaigns', '/crm/campaigns'] },
    { name: 'Customer Feedback', keywords: ['/customer-feedback', '/feedback'] },
    { name: 'Customer Analytics', keywords: ['/customer-analytics', '/crm-analytics'] },
  ],
  projects: [
    { name: 'Projects', keywords: ['/projects', '/project-list'] },
    { name: 'Clients', keywords: ['/clients', '/client-list'] },
    { name: 'Tasks', keywords: ['/tasks', '/task-board', '/todo'] },
    { name: 'Timesheet', keywords: ['/timesheets', '/timesheet'] },
    { name: 'Milestones', keywords: ['/milestones', '/milestone'] },
    { name: 'Resource Allocation', keywords: ['/resource-allocation', '/resources'] },
    { name: 'Project Analytics', keywords: ['/project-analytics', '/project-reports'] },
  ],
  recruitment: [
    { name: 'Jobs', keywords: ['/jobs', '/job-list', '/job-openings'] },
    { name: 'Candidates', keywords: ['/candidates', '/candidate-list'] },
    { name: 'Referral', keywords: ['/referrals', '/referral'] },
    { name: 'Resume Parsing', keywords: ['/resume-parsing', '/resume-parser'] },
    { name: 'Campus Hiring', keywords: ['/campus-hiring', '/campus'] },
  ],
  pos: [
    { name: 'POS', keywords: ['/pos', '/pos-terminal'] },
    { name: 'POS Orders', keywords: ['/pos-orders', '/pos/orders'] },
    { name: 'Barcode Print', keywords: ['/barcode-print', '/barcode'] },
    { name: 'QR Code Print', keywords: ['/qrcode-print', '/qrcode', '/qr-code'] },
    { name: 'Print Settings', keywords: ['/print-settings', '/pos/settings'] },
  ],
  assets: [
    { name: 'Asset Register', keywords: ['/assets', '/asset-list'] },
    { name: 'Assets Category', keywords: ['/asset-categories', '/assets/categories'] },
    { name: 'Assignments', keywords: ['/asset-assignment', '/asset-assignments'] },
    { name: 'Depreciation', keywords: ['/asset-depreciation', '/depreciation'] },
    { name: 'Maintenance', keywords: ['/asset-maintenance', '/maintenance'] },
    { name: 'Disposal', keywords: ['/asset-disposal', '/disposal'] },
    { name: 'Asset Analytics', keywords: ['/asset-analytics', '/asset-reports'] },
  ],
  support: [
    { name: 'Contact Messages', keywords: ['/contact-messages', '/messages'] },
    { name: 'Tickets', keywords: ['/tickets', '/support-tickets'] },
    { name: 'Knowledge Base', keywords: ['/knowledgebase', '/knowledge-base'] },
    { name: 'SLA Management', keywords: ['/sla-management', '/sla'] },
  ],
  membership: [
    { name: 'Membership Plans', keywords: ['/membership-plans', '/plans', '/subscription-plans'] },
    { name: 'Membership Addons', keywords: ['/membership-addons', '/addons', '/marketplace'] },
    { name: 'Transactions', keywords: ['/transactions', '/payments-history'] },
  ],
  system: [
    { name: 'User Management', keywords: ['/users', '/user-management', '/tenant/users'] },
    { name: 'Roles & Permissions', keywords: ['/roles', '/permissions', '/tenant/roles'] },
    { name: 'Delete Requests', keywords: ['/delete-requests', '/data-delete-requests'] },
    { name: 'Settings', keywords: ['/settings', '/company-settings', '/general-settings'] },
  ],
  aiCenter: [
    { name: 'AI Attendance Insights', keywords: ['/ai-attendance-insights', '/addons/ai-assistant/usage'] },
    { name: 'AI Payroll Forecast', keywords: ['/ai-payroll-forecast', '/addons/ai-payroll'] },
    { name: 'AI Hiring Forecast', keywords: ['/ai-hiring-forecast', '/addons/ai-recruitment'] },
    { name: 'AI Team Performance', keywords: ['/ai-team-performance'] },
    { name: 'AI Configuration', keywords: ['/ai-configuration', '/addons/ai-assistant/settings'] },
  ]
};

const results = {};

for (const [section, items] of Object.entries(requirements)) {
  results[section] = items.map(item => {
    let matched = null;
    if (item.expectedRoute) {
      matched = routeMap.get(item.expectedRoute);
    }
    if (!matched && item.keywords) {
      for (const kw of item.keywords) {
        const found = pages.find(p => p.route === kw || p.route.startsWith(kw + '/') || p.route.endsWith(kw));
        if (found) {
          matched = found;
          break;
        }
      }
    }
    return {
      name: item.name,
      status: matched ? 'Implemented' : 'Missing',
      route: matched ? matched.route : (item.expectedRoute || item.keywords[0]),
      file: matched ? matched.file : 'None',
      pageId: matched ? matched.pageId : 'N/A',
      mappedInSidebar: matched ? matched.isMappedInSidebar : false,
      sidebarLabel: matched ? matched.sidebarLabel : null,
      componentName: matched ? matched.componentName : null
    };
  });
}

fs.writeFileSync('scripts/requirements_comparison.json', JSON.stringify(results, null, 2));
console.log('Requirements comparison complete. Saved to scripts/requirements_comparison.json');

// Count summary
for (const [sec, items] of Object.entries(results)) {
  const imp = items.filter(i => i.status === 'Implemented').length;
  console.log(`${sec}: ${imp}/${items.length} implemented`);
}
