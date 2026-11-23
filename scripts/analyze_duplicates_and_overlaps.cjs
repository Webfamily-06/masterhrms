const fs = require('fs');

const pages = JSON.parse(fs.readFileSync('scripts/audited_pages_full.json', 'utf8'));
const routeSet = new Set(pages.map(p => p.route));

// Sidebar links
const sidebarCode = fs.readFileSync('CMS/src/components/dreams-sidebar.tsx', 'utf8');
const sidebarLinkMatches = [...sidebarCode.matchAll(/to="([^"]+)"/g)].map(m => m[1]);
const sidebarHrefMatches = [...sidebarCode.matchAll(/href="([^"#][^"]*)"/g)].map(m => m[1]);
const allSidebarLinks = [...new Set([...sidebarLinkMatches, ...sidebarHrefMatches])];

// Check broken links (in sidebar but no page.tsx)
const brokenSidebarLinks = [];
allSidebarLinks.forEach(link => {
  // normalize link (strip query params)
  const clean = link.split('?')[0];
  // check direct match
  if (!routeSet.has(clean)) {
    // check if dynamic match
    const hasDynamic = pages.some(p => {
      if (!p.route.includes('[')) return false;
      const base = p.route.split('[')[0];
      return clean.startsWith(base);
    });
    if (!hasDynamic) {
      brokenSidebarLinks.push(link);
    }
  }
});

console.log('Total broken sidebar links:', brokenSidebarLinks.length);
console.log('Broken sidebar links sample:', brokenSidebarLinks.slice(0, 20));

// Find unmapped pages (page.tsx exists, but not in sidebar)
const unmappedPages = pages.filter(p => !allSidebarLinks.includes(p.route));
console.log('Total unmapped pages in CMS:', unmappedPages.length);

// Find duplicates (same business function across routes)
const duplicates = [
  {
    feature: 'Employee Dashboard',
    routes: ['/employee-dashboard', '/me/dashboard'],
    analysis: 'Both routes implement identical SmartHR employee self-service dashboards. /me/dashboard is the portal convention, /employee-dashboard is the root alias.'
  },
  {
    feature: 'HR Dashboard',
    routes: ['/hrm-dashboard', '/hr/dashboard'],
    analysis: 'hrm-dashboard is the SmartHR root clone; /hr/dashboard is the legacy WorkDo HR operations dashboard.'
  },
  {
    feature: 'Tenant / Admin Dashboard',
    routes: ['/tenant/dashboard', '/tenant'],
    analysis: '/tenant redirects to /tenant/dashboard.'
  },
  {
    feature: 'Support / Help Desk Dashboard',
    routes: ['/support-dashboard', '/help-desk-dashboard'],
    analysis: '/support-dashboard is the active SmartHR route; /help-desk-dashboard was legacy alias.'
  },
  {
    feature: 'Invoices & Billing',
    routes: ['/invoices', '/accounting/invoices', '/recurring-invoices'],
    analysis: '/invoices is general sales invoices; /recurring-invoices handles subscription schedules; /accounting/invoices overlaps.'
  },
  {
    feature: 'Expenses',
    routes: ['/expenses', '/finance/expenses', '/accounting/expenses'],
    analysis: 'Multiple expense trackers across modules without a single ledger integration.'
  },
  {
    feature: 'Payments',
    routes: ['/payments', '/finance/payments'],
    analysis: 'Payments appear under both Sales/Billing and Finance.'
  },
  {
    feature: 'Taxes',
    routes: ['/taxes', '/accounting/taxes'],
    analysis: 'Tax rates defined in both Billing and Accounting settings.'
  },
  {
    feature: 'Projects & Tasks',
    routes: ['/projects', '/tasks', '/todo', '/scrumboard', '/gantt'],
    analysis: 'Five different task/planning representations across modules.'
  }
];

const analysisOutput = {
  brokenSidebarLinksCount: brokenSidebarLinks.length,
  brokenSidebarLinks,
  unmappedPagesCount: unmappedPages.length,
  mappedPagesCount: pages.length - unmappedPages.length,
  duplicates
};

fs.writeFileSync('scripts/duplicates_and_broken.json', JSON.stringify(analysisOutput, null, 2));
console.log('Saved analysis to scripts/duplicates_and_broken.json');
