import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const SCREENSHOT_DIR = path.resolve('docs/Saas/screenshots/consolidated-audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const employeeUser = {
  name: 'Employee',
  payload: {
    userId: 'user-emp-001',
    email: 'employee@masterhrms.com',
    tenantId: 'tenant-default-001',
    roles: ['employee']
  }
};

async function safeGoto(page, url, timeoutMs = 30000) {
  try {
    return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  } catch (firstErr) {
    console.log(`    (Compiling/Retrying ${url}...)`);
    await page.waitForTimeout(1500);
    return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  }
}

async function runEmployeeAudit() {
  console.log('--- Crawling Employee Portal Sidebar (/me/*) on localhost:3000 ---');
  const empToken = jwt.sign(employeeUser.payload, JWT_SECRET, { expiresIn: '1d' });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-proxy-server', '--disable-gpu', '--no-sandbox']
  });

  const empContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await empContext.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
    document.cookie = `auth_token=${t}; path=/`;
  }, { t: empToken, p: employeeUser.payload });

  const empPage = await empContext.newPage();
  const empConsoleErrors = [];
  empPage.on('console', msg => {
    if (msg.type() === 'error') empConsoleErrors.push(msg.text());
  });

  await safeGoto(empPage, 'http://localhost:3000/me/dashboard', 30000);

  // Poll until .sidebar-menu a is hydrated
  let empLinks = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    empLinks = await empPage.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('.sidebar-menu a'));
      return anchors.map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute('href'),
        parentHeader: a.closest('ul')?.previousElementSibling?.innerText?.trim() || 'Employee Menu'
      })).filter(l => l.href && !l.href.startsWith('#'));
    });
    if (empLinks.length > 0) break;
    await empPage.waitForTimeout(1000);
  }

  console.log(`  Discovered ${empLinks.length} dynamic sidebar links for Employee.`);

  const employeeAudit = [];

  for (let i = 0; i < empLinks.length; i++) {
    const link = empLinks[i];
    const targetUrl = link.href.startsWith('http') ? link.href : `http://localhost:3000${link.href}`;
    const result = {
      index: i + 1,
      role: 'Employee',
      label: link.text,
      group: link.parentHeader,
      targetHref: link.href,
      targetUrl,
      httpStatus: 'UNKNOWN',
      rendered: false,
      hasMainContent: false,
      controlsCount: 0,
      activeHighlighted: false,
      consoleErrors: 0,
      screenshot: null,
      verdict: 'FAIL'
    };

    try {
      const resp = await safeGoto(empPage, targetUrl, 25000);
      result.httpStatus = resp ? resp.status() : 200;
      await empPage.waitForTimeout(600);

      const metrics = await empPage.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const is403 = bodyText.includes('403') && bodyText.includes('Forbidden');
        const is404 = bodyText.includes('404') && (bodyText.includes('Not Found') || bodyText.includes('could not be found'));
        const isCrash = bodyText.includes('Application error') || bodyText.includes('Unhandled Runtime Error');
        const hasContent = !!(document.querySelector('table, .card, form, h1, h2, h3, canvas, svg'));
        const controls = document.querySelectorAll('button, input, select, textarea').length;
        const activeLink = document.querySelector('.sidebar-menu a.active, .sidebar-menu li.active');

        return {
          is403,
          is404,
          isCrash,
          hasContent,
          controls,
          hasActiveHighlight: !!activeLink,
          bodySnippet: bodyText.slice(0, 100).replace(/\n/g, ' ')
        };
      });

      result.hasMainContent = metrics.hasContent && !metrics.is403 && !metrics.is404 && !metrics.isCrash;
      result.controlsCount = metrics.controls;
      result.activeHighlighted = metrics.hasActiveHighlight;
      result.consoleErrors = empConsoleErrors.length;

      const safeName = `emp_${i + 1}_${link.text.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      const imgPath = path.join(SCREENSHOT_DIR, safeName);
      await empPage.screenshot({ path: imgPath });
      result.screenshot = `docs/Saas/screenshots/consolidated-audit/${safeName}`;

      if (result.httpStatus === 200 && result.hasMainContent && !metrics.is403 && !metrics.is404) {
        result.verdict = 'PASS';
      } else if (metrics.is403) {
        result.verdict = 'BLOCKED_403';
      } else if (metrics.is404) {
        result.verdict = 'FAIL_404';
      } else {
        result.verdict = 'PARTIAL';
      }

      console.log(`  [Employee ${i + 1}/${empLinks.length}] ${link.text} (${link.href}) -> ${result.verdict} (${result.controlsCount} controls)`);
    } catch (err) {
      result.verdict = 'ERROR';
      result.details = err.message;
      console.log(`  [Employee ${i + 1}/${empLinks.length}] ${link.text} -> ERROR: ${err.message}`);
    }
    employeeAudit.push(result);
  }

  await browser.close();

  // Merge into existing json
  const jsonPath = 'scripts/consolidated_audit_results.json';
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    data.employeeAudit = employeeAudit;

    const totalSuper = data.superAdminAudit.length;
    const passSuper = data.superAdminAudit.filter(r => r.verdict === 'PASS').length;

    const totalHr = data.hrAdminAudit.length;
    const passHr = data.hrAdminAudit.filter(r => r.verdict === 'PASS').length;

    const totalEmp = data.employeeAudit.length;
    const passEmp = data.employeeAudit.filter(r => r.verdict === 'PASS').length;

    const totalAudited = totalSuper + totalHr + totalEmp;
    const totalPassed = passSuper + passHr + passEmp;

    data.summary = {
      totalAudited,
      totalPassed,
      passRate: ((totalPassed / totalAudited) * 100).toFixed(1) + '%',
      superAdmin: { total: totalSuper, passed: passSuper },
      hrAdmin: { total: totalHr, passed: passHr },
      employee: { total: totalEmp, passed: passEmp },
      knownGapsCount: data.gapAudit.length,
      securityPassCount: data.securityAudit.filter(s => s.result.startsWith('PASS')).length
    };

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`\nSuccessfully updated scripts/consolidated_audit_results.json!`);
    console.log(`Summary: Total Audited: ${totalAudited} | Passed: ${totalPassed} (${data.summary.passRate})`);
    console.log(`  - Super Admin: ${passSuper}/${totalSuper}`);
    console.log(`  - HR Admin: ${passHr}/${totalHr}`);
    console.log(`  - Employee: ${passEmp}/${totalEmp}`);
  }
}

runEmployeeAudit().catch(err => {
  console.error('EMPLOYEE AUDIT ERROR:', err);
  process.exit(1);
});
