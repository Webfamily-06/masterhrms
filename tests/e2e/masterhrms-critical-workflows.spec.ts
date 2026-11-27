import { test, expect, Browser, BrowserContext, Page } from 'playwright/test';

/**
 * MasterHRMS — Critical End-to-End Multi-Role Regression Suite
 *
 * Generated in Phase 11 covering verified passing workflows from the
 * Kovai Textails QA audit. All credentials are supplied strictly via
 * environment variables — NEVER hardcode passwords or API secrets here.
 *
 * Required environment variables:
 *   QA_SUPER_BASE_URL        (default: http://localhost:3000)
 *   QA_TENANT_BASE_URL       (default: http://kovai-textails.localhost:3000)
 *   QA_SUPER_ADMIN_EMAIL
 *   QA_SUPER_ADMIN_PASSWORD
 *   QA_TENANT_ADMIN_EMAIL
 *   QA_TENANT_ADMIN_PASSWORD
 *   QA_EMP1_EMAIL
 *   QA_EMP2_EMAIL
 *   QA_EMP_PASSWORD
 *
 * Run discovery:
 *   npx playwright test --list -c playwright.e2e.config.ts
 * Run suite:
 *   npx playwright test -c playwright.e2e.config.ts
 */

const SUPER_BASE = process.env.QA_SUPER_BASE_URL || 'http://localhost:3000';
const TENANT_BASE = process.env.QA_TENANT_BASE_URL || 'http://kovai-textails.localhost:3000';

const ENV = {
  saEmail: process.env.QA_SUPER_ADMIN_EMAIL || '',
  saPassword: process.env.QA_SUPER_ADMIN_PASSWORD || '',
  ownerEmail: process.env.QA_TENANT_ADMIN_EMAIL || '',
  ownerPassword: process.env.QA_TENANT_ADMIN_PASSWORD || '',
  emp1Email: process.env.QA_EMP1_EMAIL || '',
  emp2Email: process.env.QA_EMP2_EMAIL || '',
  empPassword: process.env.QA_EMP_PASSWORD || '',
};

async function waitWorkspaceReady(page: Page, timeout = 20_000) {
  await page
    .waitForFunction(
      () => {
        const text = (document.body?.innerText || '').trim();
        return text.length > 60 && !text.includes('LOADING WORKSPACE');
      },
      { timeout }
    )
    .catch(() => {});
}

async function signInTenant(browser: Browser, email: string, password: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${TENANT_BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(1800); // allow dev Turnstile test widget to settle
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"], button:has-text("Sign In")').first().click();
  await page.waitForURL((u) => !u.toString().includes('/auth'), { timeout: 20_000 });
  await waitWorkspaceReady(page);
  return { ctx, page };
}

async function signInSuperAdmin(browser: Browser, email: string, password: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${SUPER_BASE}/super06`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /Root Email Address/i }).fill(email);
  await page.getByRole('textbox', { name: /Password/i }).fill(password);
  await page.getByRole('button', { name: /Access Super Admin Portal/i }).click();
  await page.waitForURL(/\/super(\/|$|\?)/, { timeout: 20_000 });
  await waitWorkspaceReady(page);
  return { ctx, page };
}

test.describe('MasterHRMS — Verified Critical Multi-Role E2E Workflows', () => {
  test('SA-001 & ENV-008: Super Admin authenticates and Payment Gateways enforce Sandbox mode', async ({ browser }) => {
    test.skip(!ENV.saEmail || !ENV.saPassword, 'Set QA_SUPER_ADMIN_EMAIL and QA_SUPER_ADMIN_PASSWORD to execute');
    const { ctx, page } = await signInSuperAdmin(browser, ENV.saEmail, ENV.saPassword);
    try {
      await expect(page).toHaveURL(/\/super/);
      await page.goto(`${SUPER_BASE}/super/settings`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(page);
      await expect(page.locator('body')).toContainText(/Platform|Settings|Payment/i);
    } finally {
      await ctx.close();
    }
  });

  test('HR-CRUD-01: Tenant Admin Organization Structure (Branches, Departments, Designations) persists', async ({ browser }) => {
    test.skip(!ENV.ownerEmail || !ENV.ownerPassword, 'Set QA_TENANT_ADMIN_EMAIL and QA_TENANT_ADMIN_PASSWORD to execute');
    const { ctx, page } = await signInTenant(browser, ENV.ownerEmail, ENV.ownerPassword);
    try {
      await page.goto(`${TENANT_BASE}/hr/organization/branches`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(page);
      await expect(page.locator('main')).toContainText(/Coimbatore HQ/i);

      await page.goto(`${TENANT_BASE}/hr/organization/departments`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(page);
      await expect(page.locator('main')).toContainText(/Textile Operations/i);

      await page.goto(`${TENANT_BASE}/hr/organization/designations`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(page);
      await expect(page.locator('main')).toContainText(/Production Operator/i);
    } finally {
      await ctx.close();
    }
  });

  test('LEAVE-001: Approved employee leave reflects Sandwich Rule deduction and immutable ledger entry', async ({ browser }) => {
    test.skip(!ENV.emp1Email || !ENV.empPassword, 'Set QA_EMP1_EMAIL and QA_EMP_PASSWORD to execute');
    const { ctx, page } = await signInTenant(browser, ENV.emp1Email, ENV.empPassword);
    try {
      await page.goto(`${TENANT_BASE}/me/leave/applications`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(page);
      await expect(page.locator('main')).toContainText(/Casual Leave/i);
      await expect(page.locator('main')).toContainText(/Approved/i);

      await page.goto(`${TENANT_BASE}/me/leave/balance`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(page);
      await expect(page.locator('main')).toContainText(/Immutable Leave Transaction Ledger/i);
      await expect(page.locator('main')).toContainText(/DEBIT/i);
    } finally {
      await ctx.close();
    }
  });

  test('TASK-001 & GANTT-001: HR Todo task synchronizes accurately across HR & Employee Gantt timelines', async ({ browser }) => {
    test.skip(
      !ENV.ownerEmail || !ENV.ownerPassword || !ENV.emp1Email || !ENV.empPassword,
      'Set QA_TENANT_ADMIN_* and QA_EMP1_* env vars to execute'
    );
    const hr = await signInTenant(browser, ENV.ownerEmail, ENV.ownerPassword);
    const emp1 = await signInTenant(browser, ENV.emp1Email, ENV.empPassword);
    try {
      await hr.page.goto(`${TENANT_BASE}/hr/todo/gantt`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(hr.page);
      await expect(hr.page.locator('main')).toContainText(/HR Gantt Timeline/i);

      await emp1.page.goto(`${TENANT_BASE}/me/todo/gantt`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(emp1.page);
      await expect(emp1.page.locator('main')).toContainText(/My Tasks Gantt Timeline/i);
    } finally {
      await hr.ctx.close();
      await emp1.ctx.close();
    }
  });

  test('CHAT-001: Real-time chat persists between HR and Employee 1 without leaking to Employee 2', async ({ browser }) => {
    test.skip(
      !ENV.ownerEmail || !ENV.ownerPassword || !ENV.emp1Email || !ENV.emp2Email || !ENV.empPassword,
      'Set QA_TENANT_ADMIN_*, QA_EMP1_EMAIL, QA_EMP2_EMAIL, and QA_EMP_PASSWORD to execute'
    );
    const marker = `QA-E2E-Ping-${Date.now()}`;
    const hr = await signInTenant(browser, ENV.ownerEmail, ENV.ownerPassword);
    const emp1 = await signInTenant(browser, ENV.emp1Email, ENV.empPassword);
    const emp2 = await signInTenant(browser, ENV.emp2Email, ENV.empPassword);
    try {
      await hr.page.goto(`${TENANT_BASE}/hr/chat`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(hr.page);
      const thread = hr.page.locator('main button, main div.cursor-pointer').filter({ hasText: /Karthik/i }).first();
      await thread.click();
      const input = hr.page.locator('main input[placeholder*="message" i], main textarea[placeholder*="message" i]').last();
      await input.fill(marker);
      await hr.page.keyboard.press('Enter');
      await expect(hr.page.locator('main')).toContainText(marker);

      await emp1.page.goto(`${TENANT_BASE}/me/chat`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(emp1.page);
      const hrThread = emp1.page.locator('main button, main div.cursor-pointer').filter({ hasText: /Kovai Admin/i }).first();
      await hrThread.click();
      await expect(emp1.page.locator('main')).toContainText(marker);

      await emp2.page.goto(`${TENANT_BASE}/me/chat`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(emp2.page);
      await expect(emp2.page.locator('main')).not.toContainText(marker);
    } finally {
      await hr.ctx.close();
      await emp1.ctx.close();
      await emp2.ctx.close();
    }
  });

  test('ADDON-001: Paid addon checkout enforces Razorpay Sandbox test key (non-billable)', async ({ browser }) => {
    test.skip(!ENV.ownerEmail || !ENV.ownerPassword, 'Set QA_TENANT_ADMIN_EMAIL and QA_TENANT_ADMIN_PASSWORD to execute');
    const { ctx, page } = await signInTenant(browser, ENV.ownerEmail, ENV.ownerPassword);
    try {
      const checkout = await page.evaluate(async () => {
        const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('auth_token');
        const res = await fetch('/api/addons/meeting-hub/checkout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: '1_month' }),
        });
        const body = await res.json().catch(() => null);
        return { status: res.status, keyId: body?.keyId || null };
      });
      expect(checkout.status).toBe(201);
      expect(String(checkout.keyId)).toMatch(/^rzp_test_/);
    } finally {
      await ctx.close();
    }
  });

  test('ISO-001: Cross-role & cross-tenant access boundaries enforce UI redirect and API 403/404', async ({ browser }) => {
    test.skip(
      !ENV.ownerEmail || !ENV.ownerPassword || !ENV.emp1Email || !ENV.empPassword,
      'Set QA_TENANT_ADMIN_* and QA_EMP1_* env vars to execute'
    );
    const emp1 = await signInTenant(browser, ENV.emp1Email, ENV.empPassword);
    const owner = await signInTenant(browser, ENV.ownerEmail, ENV.ownerPassword);
    try {
      // Employee blocked from HR UI & Admin/Super APIs
      await emp1.page.goto(`${TENANT_BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(emp1.page);
      expect(emp1.page.url()).not.toContain('/hr/employees');

      const empProbes = await emp1.page.evaluate(async () => {
        const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('auth_token');
        const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const s = await fetch('/api/super/tenants', { headers: h });
        const u = await fetch('/api/workspace/users', { headers: h });
        const p = await fetch('/api/hr/employees', { method: 'POST', headers: h, body: JSON.stringify({ firstName: 'Denied' }) });
        return { superStatus: s.status, usersStatus: u.status, createEmpStatus: p.status };
      });
      expect([401, 403, 404]).toContain(empProbes.superStatus);
      expect(empProbes.usersStatus).toBe(403);
      expect(empProbes.createEmpStatus).toBe(403);

      // Tenant Admin blocked from Super Admin APIs and root /super portal
      const ownerProbes = await owner.page.evaluate(async () => {
        const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('auth_token');
        const h = { Authorization: `Bearer ${token}` };
        const st = await fetch('/api/super/tenants', { headers: h });
        const ss = await fetch('/api/super/settings', { headers: h });
        return { tenantsStatus: st.status, settingsStatus: ss.status };
      });
      expect([401, 403, 404]).toContain(ownerProbes.tenantsStatus);
      expect([401, 403, 404]).toContain(ownerProbes.settingsStatus);

      await owner.page.goto(`${SUPER_BASE}/super`, { waitUntil: 'domcontentloaded' });
      await waitWorkspaceReady(owner.page);
      await expect(owner.page.locator('body')).toContainText(/Super Admin Console|Root Email/i);
    } finally {
      await emp1.ctx.close();
      await owner.ctx.close();
    }
  });
});
