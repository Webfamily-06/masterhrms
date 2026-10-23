import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const BASE_CMS_URL = 'http://localhost:3000';
const TENANT_CMS_URL = 'http://master.localhost:3000';

const superAdminPayload = {
  userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
  email: 'super-admin@masterhrms.local',
  tenantId: null,
  roles: ['super_admin']
};

const hrAdminPayload = {
  userId: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['tenant_admin', 'hr_admin']
};

const employeePayload = {
  userId: 'user-emp-001',
  email: 'employee@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['employee']
};

const superToken = jwt.sign(superAdminPayload, JWT_SECRET, { expiresIn: '12h' });
const hrToken = jwt.sign(hrAdminPayload, JWT_SECRET, { expiresIn: '12h' });
const empToken = jwt.sign(employeePayload, JWT_SECRET, { expiresIn: '12h' });

// 1. Super Admin Nav Items (from SuperShell.tsx)
const superNavItems = [
  // Core Orchestration
  { group: 'Super Admin: Core Orchestration', label: 'Dashboard', path: '/super' },
  { group: 'Super Admin: Core Orchestration', label: 'Tenant Workspaces', path: '/super/tenants' },
  { group: 'Super Admin: Core Orchestration', label: 'Tenant Usage Metrics', path: '/super/tenant-usage-metrics' },
  { group: 'Super Admin: Core Orchestration', label: 'Subscription Plans', path: '/super/plans' },
  { group: 'Super Admin: Core Orchestration', label: 'Discount Coupons', path: '/super/coupons' },
  { group: 'Super Admin: Core Orchestration', label: 'Purchase Transactions', path: '/super/transactions' },
  { group: 'Super Admin: Core Orchestration', label: 'Roles & RBAC Matrix', path: '/super/roles' },
  { group: 'Super Admin: Core Orchestration', label: 'Statutory Compliance', path: '/super/compliance' },
  // Extensions & Add-ons
  { group: 'Super Admin: Extensions & Add-ons', label: 'Addons Marketplace', path: '/super/marketplace' },
  { group: 'Super Admin: Extensions & Add-ons', label: 'App Integrations', path: '/super/integrations' },
  { group: 'Super Admin: Extensions & Add-ons', label: 'Custom Domains', path: '/super/domains' },
  { group: 'Super Admin: Extensions & Add-ons', label: 'Domain Documentation', path: '/super/domains/documentation' },
  // Marketing & CMS
  { group: 'Super Admin: Marketing & CMS', label: 'Visual CMS Studio', path: '/super/cms' },
  { group: 'Super Admin: Marketing & CMS', label: 'All Articles', path: '/super/blogs' },
  { group: 'Super Admin: Marketing & CMS', label: 'Blog Categories', path: '/super/blogs/categories' },
  { group: 'Super Admin: Marketing & CMS', label: 'Blog Tags', path: '/super/blogs/tags' },
  { group: 'Super Admin: Marketing & CMS', label: 'Case Studies', path: '/super/case-studies' },
  { group: 'Super Admin: Marketing & CMS', label: 'Media Library', path: '/super/media' },
  // Communications
  { group: 'Super Admin: Communications', label: 'Tenant Support Tickets', path: '/super/tenant-support-tickets' },
  { group: 'Super Admin: Communications', label: 'Support Agents', path: '/super/agents' },
  { group: 'Super Admin: Communications', label: 'SLA Policies', path: '/super/sla-policies' },
  { group: 'Super Admin: Communications', label: 'Escalation Rules', path: '/super/escalation-rules' },
  { group: 'Super Admin: Communications', label: 'Global Support Desk', path: '/super/support' },
  { group: 'Super Admin: Communications', label: 'Email Templates', path: '/super/email-templates' },
  { group: 'Super Admin: Communications', label: 'Broadcast Alerts', path: '/super/notifications' },
  // System Controls
  { group: 'Super Admin: System Controls', label: 'Cron Automations', path: '/cronjob' },
  { group: 'Super Admin: System Controls', label: 'Cache & Maintenance', path: '/clear-cache' },
  { group: 'Super Admin: System Controls', label: 'Platform Settings', path: '/super/settings' },
  { group: 'Super Admin: System Controls', label: 'Platform Analytics', path: '/super/analytics' },
  { group: 'Super Admin: System Controls', label: 'Localization (i18n)', path: '/super/languages' },
  { group: 'Super Admin: System Controls', label: 'Database Backups', path: '/super/backup' },
  { group: 'Super Admin: System Controls', label: 'API Reference', path: '/super/api-docs' },
  { group: 'Super Admin: System Controls', label: 'Developer & Web APIs', path: '/super/developer' },
  { group: 'Super Admin: System Controls', label: 'Documentation Portal', path: '/super/docs' },
];

// 2. HR Admin Nav Items (from hr-sidebar.ts)
const hrNavItems = [
  // 01. Overview
  { group: 'HR Admin: Overview', label: 'Dashboard', path: '/hr/dashboard' },
  { group: 'HR Admin: Overview', label: 'Calendar', path: '/hr/calendar' },
  { group: 'HR Admin: Overview', label: 'My Tasks', path: '/hr/todo' },
  { group: 'HR Admin: Overview', label: 'Team Chat', path: '/hr/chat' },
  { group: 'HR Admin: Overview', label: 'Approvals', path: '/hr/approvals' },
  { group: 'HR Admin: Overview', label: 'Notifications', path: '/hr/notifications' },
  // 02. Workspace Management
  { group: 'HR Admin: Workspace Management', label: 'Employees', path: '/hr/employees' },
  { group: 'HR Admin: Organization', label: 'Departments', path: '/hr/organization/departments' },
  { group: 'HR Admin: Organization', label: 'Designations', path: '/hr/organization/designations' },
  { group: 'HR Admin: Organization', label: 'Branches', path: '/hr/organization/branches' },
  { group: 'HR Admin: Organization', label: 'Holidays', path: '/hr/organization/holidays' },
  { group: 'HR Admin: Organization', label: 'Announcements', path: '/hr/organization/announcements' },
  { group: 'HR Admin: Organization', label: 'Organization Tree', path: '/hr/organization/tree' },
  { group: 'HR Admin: Organization', label: 'Award Types', path: '/hr/organization/award-types' },
  { group: 'HR Admin: Organization', label: 'Document Types', path: '/hr/organization/document-types' },
  { group: 'HR Admin: Attendance', label: 'Attendance Records', path: '/hr/attendance/records' },
  { group: 'HR Admin: Attendance', label: 'Timesheets', path: '/hr/attendance/timesheets' },
  { group: 'HR Admin: Attendance', label: 'Regularizations', path: '/hr/attendance/regularizations' },
  { group: 'HR Admin: Attendance', label: 'Shifts', path: '/hr/attendance/shifts' },
  { group: 'HR Admin: Attendance', label: 'Attendance Policies', path: '/hr/attendance/policies' },
  { group: 'HR Admin: Attendance', label: 'Overtime', path: '/hr/attendance/overtime' },
  { group: 'HR Admin: Attendance', label: 'Live Attendance', path: '/hr/attendance/live' },
  { group: 'HR Admin: Attendance', label: 'Device Sync', path: '/hr/attendance/devices' },
  { group: 'HR Admin: Leave Management', label: 'Leave Applications', path: '/hr/leave/applications' },
  { group: 'HR Admin: Leave Management', label: 'Leave Balances', path: '/hr/leave/balances' },
  { group: 'HR Admin: Leave Management', label: 'Leave Policies', path: '/hr/leave/policies' },
  { group: 'HR Admin: Leave Management', label: 'Leave Types', path: '/hr/leave/types' },
  { group: 'HR Admin: Leave Management', label: 'Leave Calendar', path: '/hr/leave/calendar' },
  { group: 'HR Admin: Leave Management', label: 'Encashment & Comp-off', path: '/hr/leave/encashment-compoff' },
  // 03. Talent & Growth
  { group: 'HR Admin: Recruitment', label: 'Job Postings', path: '/hr/recruitment/job-postings' },
  { group: 'HR Admin: Recruitment', label: 'Candidates', path: '/hr/recruitment/candidates' },
  { group: 'HR Admin: Recruitment', label: 'Recruitment Pipeline', path: '/hr/recruitment/pipeline' },
  { group: 'HR Admin: Recruitment', label: 'Interviews', path: '/hr/recruitment/interviews' },
  { group: 'HR Admin: Recruitment', label: 'Assessments', path: '/hr/recruitment/assessments' },
  { group: 'HR Admin: Recruitment', label: 'Careers Portal', path: '/hr/recruitment/career' },
  { group: 'HR Admin: Recruitment', label: 'Hiring Locations', path: '/hr/recruitment/job-locations' },
  { group: 'HR Admin: Recruitment', label: 'Interview Rounds', path: '/hr/recruitment/interview-rounds' },
  { group: 'HR Admin: Recruitment', label: 'Job Offers', path: '/hr/recruitment/offers' },
  { group: 'HR Admin: Recruitment', label: 'Candidate Onboarding', path: '/hr/recruitment/candidate-onboarding' },
  { group: 'HR Admin: Recruitment', label: 'Employee Referrals', path: '/hr/recruitment/referrals' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Awards', path: '/hr/lifecycle/awards' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Promotions', path: '/hr/lifecycle/promotions' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Transfers', path: '/hr/lifecycle/transfers' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Warnings', path: '/hr/lifecycle/warnings' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Resignations', path: '/hr/lifecycle/resignations' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Terminations', path: '/hr/lifecycle/terminations' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Business Travel', path: '/hr/lifecycle/trips' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Grievances', path: '/hr/lifecycle/complaints' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Probation', path: '/hr/lifecycle/probation' },
  { group: 'HR Admin: Employee Lifecycle', label: 'Exit Management', path: '/hr/lifecycle/exits' },
  { group: 'HR Admin: Performance', label: 'Performance Reviews', path: '/hr/performance/reviews' },
  { group: 'HR Admin: Performance', label: 'Goals', path: '/hr/performance/goals' },
  { group: 'HR Admin: Performance', label: 'Review Cycles', path: '/hr/performance/cycles' },
  { group: 'HR Admin: Performance', label: 'Indicators', path: '/hr/performance/indicators' },
  { group: 'HR Admin: Performance', label: 'Performance PIP', path: '/hr/performance/pip' },
  { group: 'HR Admin: Performance', label: 'Goal Types', path: '/hr/performance/goal-types' },
  { group: 'HR Admin: Performance', label: 'Indicator Categories', path: '/hr/performance/indicator-categories' },
  { group: 'HR Admin: Training', label: 'Employee Training', path: '/hr/training/employee-trainings' },
  { group: 'HR Admin: Training', label: 'Sessions', path: '/hr/training/sessions' },
  { group: 'HR Admin: Training', label: 'Programs', path: '/hr/training/programs' },
  { group: 'HR Admin: Training', label: 'Training Catalog', path: '/hr/training/trainings' },
  { group: 'HR Admin: Training', label: 'Training Types', path: '/hr/training/types' },
  // 04. Finance & Assets
  { group: 'HR Admin: Payroll', label: 'Payroll Runs', path: '/hr/payroll/runs' },
  { group: 'HR Admin: Payroll', label: 'Payslips', path: '/hr/payroll/payslips' },
  { group: 'HR Admin: Payroll', label: 'Salary Structures', path: '/hr/payroll/salaries' },
  { group: 'HR Admin: Payroll', label: 'Components', path: '/hr/payroll/components' },
  { group: 'HR Admin: Payroll', label: 'Employee Salaries', path: '/hr/payroll/employee-salaries' },
  { group: 'HR Admin: Payroll', label: 'Tax Declarations', path: '/hr/payroll/tax' },
  { group: 'HR Admin: Payroll', label: 'Reimbursements & Loans', path: '/hr/payroll/reimbursements-loans' },
  { group: 'HR Admin: Payroll', label: 'Statutory Forms', path: '/hr/payroll/forms' },
  { group: 'HR Admin: Assets', label: 'Assets Dashboard', path: '/hr/assets/dashboard' },
  { group: 'HR Admin: Assets', label: 'Asset Register', path: '/hr/assets' },
  { group: 'HR Admin: Assets', label: 'Depreciation', path: '/hr/assets/depreciation' },
  { group: 'HR Admin: Assets', label: 'Asset Types', path: '/hr/assets/types' },
  { group: 'HR Admin: Assets', label: 'Maintenance & Requests', path: '/hr/assets/requests-maintenance' },
  // 05. Communications & Content
  { group: 'HR Admin: Meetings', label: 'Meetings List', path: '/hr/meetings' },
  { group: 'HR Admin: Meetings', label: 'Action Items', path: '/hr/meetings/action-items' },
  { group: 'HR Admin: Meetings', label: 'Meeting Rooms', path: '/hr/meetings/rooms' },
  { group: 'HR Admin: Meetings', label: 'Meeting Types', path: '/hr/meetings/types' },
  { group: 'HR Admin: Company Documents', label: 'Document Repository', path: '/hr/documents' },
  { group: 'HR Admin: Company Documents', label: 'Employee Contracts', path: '/hr/documents/contracts' },
  { group: 'HR Admin: Company Documents', label: 'Letters & Requests', path: '/hr/documents/letters' },
  { group: 'HR Admin: Company Documents', label: 'Acknowledgements', path: '/hr/documents/acknowledgements' },
  { group: 'HR Admin: Company Documents', label: 'Document Templates', path: '/hr/documents/templates' },
  { group: 'HR Admin: Company Documents', label: 'Contract Templates', path: '/hr/documents/contract-templates' },
  { group: 'HR Admin: Company Documents', label: 'Document Categories', path: '/hr/documents/categories' },
  { group: 'HR Admin: Media & Profile', label: 'Media Library', path: '/hr/media' },
  { group: 'HR Admin: Media & Profile', label: 'My Profile', path: '/hr/profile' },
  // 06. Reports & Analytics
  { group: 'HR Admin: Reports', label: 'Headcount Report', path: '/hr/reports/headcount' },
  { group: 'HR Admin: Reports', label: 'Attrition Report', path: '/hr/reports/attrition' },
  { group: 'HR Admin: Reports', label: 'Attendance Report', path: '/hr/reports/attendance' },
  { group: 'HR Admin: Reports', label: 'Payroll Report', path: '/hr/reports/payroll' },
  { group: 'HR Admin: Reports', label: 'Recruitment Report', path: '/hr/reports/recruitment' },
  { group: 'HR Admin: Reports', label: 'Performance Report', path: '/hr/reports/performance' },
  { group: 'HR Admin: Reports', label: 'Training Report', path: '/hr/reports/training' },
  { group: 'HR Admin: Reports', label: 'Statutory Report', path: '/hr/reports/statutory' },
  { group: 'HR Admin: Reports', label: 'Custom Reports', path: '/hr/reports/custom' },
  // 07. Add-ons & Integrations
  { group: 'HR Admin: Add-ons', label: 'Strategic Planning', path: '/addons/planning/dashboard' },
  { group: 'HR Admin: Add-ons', label: 'Challenges', path: '/addons/planning/challenges' },
  { group: 'HR Admin: Add-ons', label: 'Initiative Charters', path: '/addons/planning/charters' },
  { group: 'HR Admin: Add-ons', label: 'Planning Kanban', path: '/addons/planning/charters/kanban' },
  { group: 'HR Admin: Add-ons', label: 'OKRs', path: '/okr' },
  { group: 'HR Admin: Add-ons', label: 'Learning Analytics', path: '/learning-analytics' },
  { group: 'HR Admin: Add-ons', label: 'Biometric Sync', path: '/biometric-sync' },
  { group: 'HR Admin: Add-ons', label: 'Notice Board', path: '/notice-board' },
  { group: 'HR Admin: Add-ons', label: 'AI Assistant Usage', path: '/addons/ai-assistant/usage' },
  { group: 'HR Admin: Add-ons', label: 'AI Document Generator', path: '/addons/ai-document/generate' },
  { group: 'HR Admin: Add-ons', label: 'Webhook Endpoints', path: '/addons/webhook/endpoints' },
];

// 3. Employee Portal Nav Items (from employee-sidebar.ts)
const employeeNavItems = [
  // 01. Overview & Profile
  { group: 'Employee: Overview', label: 'Dashboard', path: '/me/dashboard' },
  { group: 'Employee: Overview', label: 'Calendar', path: '/me/calendar' },
  { group: 'Employee: Overview', label: 'Todo Tasks', path: '/me/todo' },
  { group: 'Employee: Overview', label: 'Chat', path: '/me/chat' },
  { group: 'Employee: Overview', label: 'Notifications', path: '/me/notifications' },
  { group: 'Employee: Overview', label: 'My Profile', path: '/me/profile' },
  { group: 'Employee: Overview', label: 'Employee Directory', path: '/me/employees' },
  { group: 'Employee: Organization', label: 'Org Structure', path: '/me/organization/structure' },
  { group: 'Employee: Organization', label: 'Holidays', path: '/me/organization/holidays' },
  { group: 'Employee: Organization', label: 'Announcements', path: '/me/organization/announcements' },
  // 02. Attendance & Time
  { group: 'Employee: Attendance', label: 'Attendance Records', path: '/me/attendance/records' },
  { group: 'Employee: Attendance', label: 'Timesheet', path: '/me/attendance/timesheet' },
  { group: 'Employee: Attendance', label: 'Regularizations', path: '/me/attendance/regularizations' },
  { group: 'Employee: Attendance', label: 'My Shifts', path: '/me/attendance/shifts' },
  { group: 'Employee: Attendance', label: 'Attendance Policies', path: '/me/attendance/policies' },
  { group: 'Employee: Attendance', label: 'Overtime & Requests', path: '/me/attendance/requests' },
  // 03. Leave Management
  { group: 'Employee: Leave', label: 'Leave Applications', path: '/me/leave/applications' },
  { group: 'Employee: Leave', label: 'Leave Balance', path: '/me/leave/balance' },
  { group: 'Employee: Leave', label: 'Leave Policies', path: '/me/leave/policies' },
  { group: 'Employee: Leave', label: 'Team Calendar', path: '/me/leave/team-calendar' },
  // 04. Recruitment & Career
  { group: 'Employee: Recruitment', label: 'Internal Job Postings', path: '/me/recruitment/job-postings' },
  { group: 'Employee: Recruitment', label: 'My Referrals', path: '/me/recruitment/career' },
  { group: 'Employee: Recruitment', label: 'Assigned Interviews', path: '/me/recruitment/interviews' },
  { group: 'Employee: Recruitment', label: 'Candidate Assessments', path: '/me/recruitment/assessments' },
  // 05. Lifecycle
  { group: 'Employee: Lifecycle', label: 'My Awards', path: '/me/lifecycle/awards' },
  { group: 'Employee: Lifecycle', label: 'My Promotions', path: '/me/lifecycle/promotions' },
  { group: 'Employee: Lifecycle', label: 'My Transfers', path: '/me/lifecycle/transfers' },
  { group: 'Employee: Lifecycle', label: 'Travel Requests', path: '/me/lifecycle/trips' },
  { group: 'Employee: Lifecycle', label: 'Complaints / Grievances', path: '/me/lifecycle/complaints' },
  { group: 'Employee: Lifecycle', label: 'Resignation Submission', path: '/me/lifecycle/resignation' },
  // 06. Performance
  { group: 'Employee: Performance', label: 'My Goals', path: '/me/performance/goals' },
  { group: 'Employee: Performance', label: 'Performance Reviews', path: '/me/performance/reviews' },
  { group: 'Employee: Performance', label: 'Performance Indicators', path: '/me/performance/indicators' },
  // 07. Training
  { group: 'Employee: Training', label: 'My Trainings', path: '/me/training/trainings' },
  { group: 'Employee: Training', label: 'Training Sessions', path: '/me/training/sessions' },
  { group: 'Employee: Training', label: 'Training Programs', path: '/me/training/programs' },
  // 08. Payroll & Finance
  { group: 'Employee: Payroll', label: 'My Payslips', path: '/me/payroll/payslips' },
  { group: 'Employee: Payroll', label: 'Salary Structure', path: '/me/payroll/salary' },
  { group: 'Employee: Payroll', label: 'Tax Computation', path: '/me/payroll/tax' },
  { group: 'Employee: Payroll', label: 'Reimbursements & Claims', path: '/me/payroll/reimbursements-loans' },
  { group: 'Employee: Payroll', label: 'Statutory Forms', path: '/me/payroll/statutory-forms' },
  // 09. Assets
  { group: 'Employee: Assets', label: 'Assigned Assets', path: '/me/assets' },
  { group: 'Employee: Assets', label: 'Asset Requests', path: '/me/assets/requests' },
  // 10. Meetings
  { group: 'Employee: Meetings', label: 'My Meetings', path: '/me/meetings' },
  { group: 'Employee: Meetings', label: 'Assigned Action Items', path: '/me/meetings/action-items' },
  // 11. Documents
  { group: 'Employee: Documents', label: 'My Documents', path: '/me/documents' },
  { group: 'Employee: Documents', label: 'Signed Contracts', path: '/me/documents/contracts' },
  { group: 'Employee: Documents', label: 'Document Acknowledgements', path: '/me/documents/acknowledgements' },
  { group: 'Employee: Documents', label: 'Request Letter / Document', path: '/me/documents/requests' },
];

async function verifySection(browser, sectionName, baseUrl, token, items, userObj) {
  console.log(`\n==================================================`);
  console.log(`STARTING AUDIT: ${sectionName} (${items.length} links)`);
  console.log(`Target Host: ${baseUrl}`);
  console.log(`==================================================`);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Pre-seed authentication in localStorage
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.evaluate(({ token, userObj }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('hrms_user', JSON.stringify(userObj));
  }, { token, userObj });

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const targetUrl = `${baseUrl}${item.path}`;
    const consoleErrors = [];

    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('favicon')) {
          consoleErrors.push(text);
        }
      }
    };
    page.on('console', onConsole);

    let status = null;
    let finalUrl = '';
    let title = '';
    let hasMain = false;
    let has404 = false;
    let hasCrash = false;
    let crashMessage = '';

    try {
      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      status = response ? response.status() : 200;
      finalUrl = page.url();
      title = await page.title();

      // Check DOM state
      const domCheck = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const is404Text = text.includes('404') && (text.includes('Page Not Found') || text.includes('This page could not be found'));
        const isWorkspaceUnavailable = text.includes('Workspace Unavailable');
        const isErrorCrash = text.includes('Application error') || text.includes('Unhandled Runtime Error');
        const mainEl = document.querySelector('main') || document.querySelector('#main-content') || document.querySelector('.main-wrapper') || document.querySelector('.page-wrapper');
        const tableOrCards = document.querySelector('table') || document.querySelector('.card') || document.querySelector('form') || document.querySelector('h1') || document.querySelector('h2');
        
        return {
          hasMain: !!mainEl,
          hasContent: !!tableOrCards,
          is404: is404Text || isWorkspaceUnavailable,
          isCrash: isErrorCrash,
          bodySnippet: text.slice(0, 150).replace(/\s+/g, ' ')
        };
      });

      hasMain = domCheck.hasMain || domCheck.hasContent;
      has404 = domCheck.is404 || status === 404;
      hasCrash = domCheck.isCrash;
      if (hasCrash) {
        crashMessage = domCheck.bodySnippet;
      }

      // Check if redirected to auth login
      const redirectedToAuth = finalUrl.includes('/auth') || finalUrl.includes('/login');

      let outcome = 'OK';
      if (hasCrash) {
        outcome = 'CRASH';
      } else if (has404) {
        outcome = '404_NOT_FOUND';
      } else if (redirectedToAuth) {
        outcome = 'REDIRECT_AUTH';
      } else if (status >= 400) {
        outcome = `HTTP_${status}`;
      }

      const result = {
        group: item.group,
        label: item.label,
        path: item.path,
        targetUrl,
        finalUrl,
        status,
        title,
        outcome,
        hasMain,
        consoleErrorsCount: consoleErrors.length,
        consoleErrors: consoleErrors.slice(0, 3)
      };

      results.push(result);

      const symbol = outcome === 'OK' ? '✓' : outcome === 'REDIRECT_AUTH' ? '⇥' : '✗';
      console.log(`[${i + 1}/${items.length}] ${symbol} ${outcome.padEnd(14)} | ${item.label.padEnd(28)} | ${item.path}`);

    } catch (err) {
      console.log(`[${i + 1}/${items.length}] ✗ TIMEOUT/ERROR | ${item.label.padEnd(28)} | ${item.path} (${err.message.slice(0, 60)})`);
      results.push({
        group: item.group,
        label: item.label,
        path: item.path,
        targetUrl,
        finalUrl: page.url(),
        status: 0,
        title: '',
        outcome: 'TIMEOUT_OR_NET_ERR',
        error: err.message,
        hasMain: false,
        consoleErrorsCount: consoleErrors.length,
        consoleErrors
      });
    }

    page.off('console', onConsole);
  }

  await context.close();
  return results;
}

async function main() {
  console.log('Initializing Playwright Headless Browser...');
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const superResults = await verifySection(
      browser,
      'Super Admin Sidebar Menus',
      BASE_CMS_URL,
      superToken,
      superNavItems,
      superAdminPayload
    );

    const hrResults = await verifySection(
      browser,
      'HR Admin Sidebar Menus',
      TENANT_CMS_URL,
      hrToken,
      hrNavItems,
      hrAdminPayload
    );

    const employeeResults = await verifySection(
      browser,
      'Employee Portal Sidebar Menus',
      TENANT_CMS_URL,
      empToken,
      employeeNavItems,
      employeePayload
    );

    const allResults = {
      timestamp: new Date().toISOString(),
      summary: {
        superAdmin: {
          total: superResults.length,
          ok: superResults.filter(r => r.outcome === 'OK').length,
          notFound: superResults.filter(r => r.outcome === '404_NOT_FOUND').length,
          redirectAuth: superResults.filter(r => r.outcome === 'REDIRECT_AUTH').length,
          crashes: superResults.filter(r => r.outcome === 'CRASH').length,
          timeouts: superResults.filter(r => r.outcome === 'TIMEOUT_OR_NET_ERR').length,
        },
        hrAdmin: {
          total: hrResults.length,
          ok: hrResults.filter(r => r.outcome === 'OK').length,
          notFound: hrResults.filter(r => r.outcome === '404_NOT_FOUND').length,
          redirectAuth: hrResults.filter(r => r.outcome === 'REDIRECT_AUTH').length,
          crashes: hrResults.filter(r => r.outcome === 'CRASH').length,
          timeouts: hrResults.filter(r => r.outcome === 'TIMEOUT_OR_NET_ERR').length,
        },
        employee: {
          total: employeeResults.length,
          ok: employeeResults.filter(r => r.outcome === 'OK').length,
          notFound: employeeResults.filter(r => r.outcome === '404_NOT_FOUND').length,
          redirectAuth: employeeResults.filter(r => r.outcome === 'REDIRECT_AUTH').length,
          crashes: employeeResults.filter(r => r.outcome === 'CRASH').length,
          timeouts: employeeResults.filter(r => r.outcome === 'TIMEOUT_OR_NET_ERR').length,
        }
      },
      superResults,
      hrResults,
      employeeResults
    };

    const outputPath = path.resolve('docs/Saas/sidebar_menus_verification_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf8');
    console.log(`\nVerification data saved to: ${outputPath}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
