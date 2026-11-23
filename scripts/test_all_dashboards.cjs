const { chromium } = require('playwright');
const fs = require('fs');

async function testAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWVtcC0wMDEiLCJlbWFpbCI6ImVtcGxveWVlQG1hc3RlcmhybXMuY29tIiwidGVuYW50SWQiOiJ0ZW5hbnQtZGVmYXVsdC0wMDEiLCJyb2xlcyI6WyJlbXBsb3llZSJdLCJzZXNzaW9uSWQiOiJhNzg2MDI2Mi1lNjc4LTQ2YTMtODQ1Ni05MjRkYmY3YmY4NzIiLCJpYXQiOjE3OTU0MTIwOTYsImV4cCI6MTc5NjAxNjg5Nn0.mhLQvB_rRkseb1zBDTnClDydZ22_Z1uxy7s3l7bW9qc';

  await context.addInitScript((t) => {
    localStorage.setItem('hrms_auth_token', t);
  }, token);

  const page = await context.newPage();

  const routes = [
    '/tenant/dashboard',
    '/employee-dashboard',
    '/me/dashboard',
    '/deals-dashboard',
    '/leads-dashboard',
    '/hrm-dashboard',
    '/payroll-dashboard',
    '/attendance-dashboard',
    '/recruitment-dashboard',
    '/finance-dashboard',
    '/it-admin-dashboard',
    '/asset-dashboard',
    '/support-dashboard',
    '/inventory-dashboard',
    '/crm-dashboard',
    '/pos-dashboard',
    '/sales-dashboard',
    '/procurement-dashboard',
    '/project-dashboard'
  ];

  if (!fs.existsSync('CMS/public/test-screenshots')) {
    fs.mkdirSync('CMS/public/test-screenshots', { recursive: true });
  }

  console.log('Testing and capturing all ' + routes.length + ' dashboard pages with authentication...\n');

  for (const r of routes) {
    const url = 'http://localhost:3000' + r;
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000); // Allow React hydration and ApexCharts mount

      const chartsCount = await page.evaluate(() => {
        return document.querySelectorAll('.apexcharts-canvas, svg.apexcharts-svg').length;
      });

      const exportBtn = await page.$('.dropdown-toggle, button:has-text("Export"), a:has-text("Export")');
      let dropdownOpened = false;
      let hasSvg = false;
      if (exportBtn) {
        await exportBtn.click();
        await page.waitForTimeout(500);
        const status = await page.evaluate(() => {
          const menu = document.querySelector('.dropdown-menu.show, div.absolute:has(button:has-text("Export"))');
          if (!menu) return { open: false, svg: false };
          const imgs = menu.querySelectorAll('img[src*="pdf"], img[src*="excel"]');
          return { open: true, svg: imgs.length > 0 };
        });
        dropdownOpened = status.open;
        hasSvg = status.svg;
      }

      const slug = r.replace(/^\//, '').replace(/\//g, '_');
      await page.screenshot({ path: `CMS/public/test-screenshots/${slug}.png`, fullPage: false });

      console.log(`✅ ${r.padEnd(25)} | Charts: ${String(chartsCount).padStart(2)} | Dropdown: ${exportBtn ? (dropdownOpened ? (hasSvg ? 'OPEN + SVG ICONS' : 'OPEN') : 'NO OPEN') : 'N/A'} | Console Errors: ${errors.length}`);
    } catch (e) {
      console.log(`❌ ${r.padEnd(25)} | Error: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\n--- VERIFICATION COMPLETE ---');
}

testAll().catch(console.error);
