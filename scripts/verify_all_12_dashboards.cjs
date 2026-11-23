const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DASHBOARD_ROUTES = [
  { name: 'Admin Dashboard', path: '/tenant/dashboard', file: 'tenant-dashboard' },
  { name: 'Employee Dashboard', path: '/employee-dashboard', file: 'employee-dashboard' },
  { name: 'Me Dashboard', path: '/me/dashboard', file: 'me-dashboard' },
  { name: 'Deals Dashboard', path: '/deals-dashboard', file: 'deals-dashboard' },
  { name: 'Leads Dashboard', path: '/leads-dashboard', file: 'leads-dashboard' },
  { name: 'HR Dashboard', path: '/hrm-dashboard', file: 'hrm-dashboard' },
  { name: 'Payroll Dashboard', path: '/payroll-dashboard', file: 'payroll-dashboard' },
  { name: 'Recruitment Dashboard', path: '/recruitment-dashboard', file: 'recruitment-dashboard' },
  { name: 'Attendance Dashboard', path: '/attendance-dashboard', file: 'attendance-dashboard' },
  { name: 'Finance Dashboard', path: '/finance-dashboard', file: 'finance-dashboard' },
  { name: 'IT Admin Dashboard', path: '/it-admin-dashboard', file: 'it-admin-dashboard' },
  { name: 'Asset Dashboard', path: '/asset-dashboard', file: 'asset-dashboard' },
  { name: 'Support Dashboard', path: '/support-dashboard', file: 'support-dashboard' }
];

const screenshotsDir = path.join(__dirname, '../.playwright-mcp/audit-12');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWVtcC0wMDEiLCJlbWFpbCI6ImVtcGxveWVlQG1hc3RlcmhybXMuY29tIiwidGVuYW50SWQiOiJ0ZW5hbnQtZGVmYXVsdC0wMDEiLCJyb2xlcyI6WyJlbXBsb3llZSJdLCJzZXNzaW9uSWQiOiJhNzg2MDI2Mi1lNjc4LTQ2YTMtODQ1Ni05MjRkYmY3YmY4NzIiLCJpYXQiOjE3OTU0MTIwOTYsImV4cCI6MTc5NjAxNjg5Nn0.mhLQvB_rRkseb1zBDTnClDydZ22_Z1uxy7s3l7bW9qc";
  await context.addInitScript((tok) => {
    localStorage.setItem("hrms_auth_token", tok);
    localStorage.setItem("auth_token", tok);
  }, token);

  const page = await context.newPage();

  console.log('--- STARTING 12 DASHBOARDS PLAYWRIGHT AUDIT ---');
  const results = [];

  for (const d of DASHBOARD_ROUTES) {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const url = 'http://localhost:3000' + d.path;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const metrics = await page.evaluate(() => {
        const scope = document.querySelector('.dashboard-scope');
        const cards = Array.from(document.querySelectorAll('.dashboard-scope .card'));
        const firstCard = cards[0];
        const cardBg = firstCard ? window.getComputedStyle(firstCard).backgroundColor : null;
        const cardBorder = firstCard ? window.getComputedStyle(firstCard).border : null;
        const rows = Array.from(document.querySelectorAll('.dashboard-scope .row'));
        const charts = Array.from(document.querySelectorAll('.apexcharts-canvas, canvas, .chart-canvas-wrapper'));

        return {
          hasScope: !!scope,
          scopeWidth: scope ? scope.offsetWidth : 0,
          cardCount: cards.length,
          cardBg,
          cardBorder,
          rowCount: rows.length,
          chartCount: charts.length,
          currentUrl: window.location.pathname
        };
      });

      const shotPath = path.join(screenshotsDir, `${d.file}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      results.push({
        name: d.name,
        path: d.path,
        status: metrics.hasScope ? 'OK' : 'MISSING_SCOPE',
        redirected: metrics.currentUrl !== d.path ? metrics.currentUrl : null,
        metrics,
        errorCount: errors.length,
        errors: errors.slice(0, 3)
      });
      console.log(`[PASS] ${d.name} (${d.path}) -> ${metrics.cardCount} cards, ${metrics.chartCount} charts, bg: ${metrics.cardBg}, errors: ${errors.length}`);
    } catch (err) {
      results.push({
        name: d.name,
        path: d.path,
        status: 'FAILED',
        error: err.message
      });
      console.error(`[FAIL] ${d.name} (${d.path}) -> ${err.message}`);
    }
  }

  await browser.close();
  fs.writeFileSync('scripts/audit_12_results.json', JSON.stringify(results, null, 2));
  console.log('Audit complete! Results saved to scripts/audit_12_results.json');
})();
