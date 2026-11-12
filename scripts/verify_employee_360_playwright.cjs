const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runVerification() {
  console.log('--- STARTING EMPLOYEE 360 EXTENDED TABS VERIFICATION ---');

  // Authenticate via backend API
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gowthamtooquik@gmail.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const authToken = loginData.token;
  const userObj = {
    ...loginData.user,
    tenantId: loginData.user?.profile?.tenantId || '02bf4113-b100-4711-af94-d81165e9a2e1',
    isSuperAdmin: true,
    isTenantAdmin: true,
    workspaceStatus: 'ACTIVE',
  };

  // Find an employee in the same tenant or any active employee
  let employee = await prisma.employee.findFirst({
    where: { tenantId: userObj.tenantId, status: 'active' },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, tenantId: true }
  });
  if (!employee) {
    employee = await prisma.employee.findFirst({
      where: { status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, tenantId: true }
    });
  }

  console.log(`Using Employee: ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) [${employee.id}]`);

  const browser = await chromium.launch({ headless: true });
  const evidenceDir = path.join(
    'C:', 'Users', 'TSV Global Solutions', '.gemini', 'antigravity', 'brain',
    'a577d1c0-e728-48a2-b5e2-4bfe07f028cd', 'evidence-employee-audit'
  );
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const results = {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    tanstack: {},
    cms: {}
  };

  const expectedTabs = [
    'Basic Info', 'Employment', 'Contact', 'Banking', 'Certifications', 'Documents Vault',
    'Lifecycle', 'Attendance', 'Leave & Balances', 'Payroll & Payslips', 'Assigned Assets',
    'Training & Courses', 'Qualifications & Exp', 'Family & Dependents', 'Audit Trail'
  ];

  // 1. TanStack Verification (Port 5173)
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(({ token, u }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('hrms_user', JSON.stringify(u));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
    }, { token: authToken, u: userObj });

    const page = await ctx.newPage();
    const targetUrl = `http://localhost:5173/hr/employees/${employee.id}`;
    console.log(`Navigating TanStack to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const tabElements = await page.locator('[role="tab"]').all();
    const foundTabs = [];
    for (const t of tabElements) {
      const txt = (await t.innerText()).trim();
      foundTabs.push(txt);
    }
    console.log(`TanStack: Found ${foundTabs.length} tabs:`, foundTabs);

    // Click through each tab
    for (const t of tabElements) {
      await t.click();
      await page.waitForTimeout(150);
    }

    // Switch to Documents Vault
    const docsTab = await page.locator('[role="tab"]:has-text("Documents")').first();
    if (await docsTab.isVisible()) {
      await docsTab.click();
      await page.waitForTimeout(400);
    }

    const hasCompliance = (await page.locator('text=Document Compliance Status').count()) > 0;
    const tanShotPath = path.join(evidenceDir, 'tanstack_360_extended_tabs.png');
    await page.screenshot({ path: tanShotPath, fullPage: true });

    results.tanstack = {
      verified: true,
      url: page.url(),
      tabCount: foundTabs.length,
      tabs: foundTabs,
      hasComplianceBanner: hasCompliance,
      screenshot: tanShotPath
    };
    await ctx.close();
  } catch (err) {
    console.error('TanStack verification error:', err.message);
    results.tanstack = { verified: false, error: err.message };
  }

  // 2. Next.js CMS Verification (Port 3000)
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(({ token, u }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('hrms_user', JSON.stringify(u));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
    }, { token: authToken, u: userObj });

    const page = await ctx.newPage();
    const targetUrl = `http://localhost:3000/hr/employees/${employee.id}`;
    console.log(`Navigating CMS to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const tabElements = await page.locator('[role="tab"]').all();
    const foundTabs = [];
    for (const t of tabElements) {
      const txt = (await t.innerText()).trim();
      foundTabs.push(txt);
    }
    console.log(`CMS: Found ${foundTabs.length} tabs:`, foundTabs);

    for (const t of tabElements) {
      await t.click();
      await page.waitForTimeout(150);
    }

    const docsTab = await page.locator('[role="tab"]:has-text("Documents")').first();
    if (await docsTab.isVisible()) {
      await docsTab.click();
      await page.waitForTimeout(400);
    }

    const hasCompliance = (await page.locator('text=Document Compliance Status').count()) > 0;
    const cmsShotPath = path.join(evidenceDir, 'cms_360_extended_tabs.png');
    await page.screenshot({ path: cmsShotPath, fullPage: true });

    results.cms = {
      verified: true,
      url: page.url(),
      tabCount: foundTabs.length,
      tabs: foundTabs,
      hasComplianceBanner: hasCompliance,
      screenshot: cmsShotPath
    };
    await ctx.close();
  } catch (err) {
    console.error('CMS verification error:', err.message);
    results.cms = { verified: false, error: err.message };
  }

  await browser.close();
  await prisma.$disconnect();

  const summaryPath = path.join(evidenceDir, 'extended_360_verification_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('--- VERIFICATION COMPLETE. Summary written to:', summaryPath);
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
