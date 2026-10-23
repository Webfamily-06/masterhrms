async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  
  // Set auth token on tenant host
  await page.goto(`${baseUrl}/hr/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  
  const hrItems = [
    // 01. Overview
    { group: 'Overview', label: 'Dashboard', path: '/hr/dashboard' },
    { group: 'Overview', label: 'Calendar', path: '/hr/calendar' },
    { group: 'Overview', label: 'My Tasks', path: '/hr/todo' },
    { group: 'Overview', label: 'Team Chat', path: '/hr/chat' },
    { group: 'Overview', label: 'Approvals', path: '/hr/approvals' },
    { group: 'Overview', label: 'Notifications', path: '/hr/notifications' },

    // 02. Workspace Management - Organization
    { group: 'Workspace Management', label: 'Employees', path: '/hr/employees' },
    { group: 'Organization', label: 'Departments', path: '/hr/organization/departments' },
    { group: 'Organization', label: 'Designations', path: '/hr/organization/designations' },
    { group: 'Organization', label: 'Branches', path: '/hr/organization/branches' },
    { group: 'Organization', label: 'Holidays', path: '/hr/organization/holidays' },
    { group: 'Organization', label: 'Announcements', path: '/hr/organization/announcements' },
    { group: 'Organization', label: 'Organization Tree', path: '/hr/organization/tree' },
    { group: 'Organization', label: 'Award Types', path: '/hr/organization/award-types' },
    { group: 'Organization', label: 'Document Types', path: '/hr/organization/document-types' },

    // 02. Workspace Management - Attendance
    { group: 'Attendance', label: 'Attendance Records', path: '/hr/attendance/records' },
    { group: 'Attendance', label: 'Timesheets', path: '/hr/attendance/timesheets' },
    { group: 'Attendance', label: 'Regularizations', path: '/hr/attendance/regularizations' },
    { group: 'Attendance', label: 'Shifts', path: '/hr/attendance/shifts' },
    { group: 'Attendance', label: 'Attendance Policies', path: '/hr/attendance/policies' },
    { group: 'Attendance', label: 'Overtime', path: '/hr/attendance/overtime' },
    { group: 'Attendance', label: 'Live Attendance', path: '/hr/attendance/live' },
    { group: 'Attendance', label: 'Device Sync', path: '/hr/attendance/devices' },

    // 02. Workspace Management - Leave Management
    { group: 'Leave Management', label: 'Leave Applications', path: '/hr/leave/applications' },
    { group: 'Leave Management', label: 'Leave Balances', path: '/hr/leave/balances' },
    { group: 'Leave Management', label: 'Leave Policies', path: '/hr/leave/policies' },
    { group: 'Leave Management', label: 'Leave Types', path: '/hr/leave/types' },
    { group: 'Leave Management', label: 'Leave Calendar', path: '/hr/leave/calendar' },
    { group: 'Leave Management', label: 'Encashment & Comp-off', path: '/hr/leave/encashment-compoff' },

    // 03. Talent & Growth - Recruitment
    { group: 'Recruitment', label: 'Job Postings', path: '/hr/recruitment/job-postings' },
    { group: 'Recruitment', label: 'Candidates', path: '/hr/recruitment/candidates' },
    { group: 'Recruitment', label: 'Recruitment Pipeline', path: '/hr/recruitment/pipeline' },
    { group: 'Recruitment', label: 'Interviews', path: '/hr/recruitment/interviews' },
    { group: 'Recruitment', label: 'Assessments', path: '/hr/recruitment/assessments' },
    { group: 'Recruitment', label: 'Careers Portal', path: '/hr/recruitment/career' },
    { group: 'Recruitment', label: 'Hiring Locations', path: '/hr/recruitment/job-locations' },
    { group: 'Recruitment', label: 'Interview Rounds', path: '/hr/recruitment/interview-rounds' },
    { group: 'Recruitment', label: 'Job Offers', path: '/hr/recruitment/offers' },
    { group: 'Recruitment', label: 'Candidate Onboarding', path: '/hr/recruitment/candidate-onboarding' },
    { group: 'Recruitment', label: 'Employee Referrals', path: '/hr/recruitment/referrals' },

    // 03. Talent & Growth - Employee Lifecycle
    { group: 'Employee Lifecycle', label: 'Awards', path: '/hr/lifecycle/awards' },
    { group: 'Employee Lifecycle', label: 'Promotions', path: '/hr/lifecycle/promotions' },
    { group: 'Employee Lifecycle', label: 'Transfers', path: '/hr/lifecycle/transfers' },
    { group: 'Employee Lifecycle', label: 'Warnings', path: '/hr/lifecycle/warnings' },
    { group: 'Employee Lifecycle', label: 'Resignations', path: '/hr/lifecycle/resignations' },
    { group: 'Employee Lifecycle', label: 'Terminations', path: '/hr/lifecycle/terminations' },
    { group: 'Employee Lifecycle', label: 'Business Travel', path: '/hr/lifecycle/trips' },
    { group: 'Employee Lifecycle', label: 'Grievances', path: '/hr/lifecycle/complaints' },
    { group: 'Employee Lifecycle', label: 'Probation', path: '/hr/lifecycle/probation' },
    { group: 'Employee Lifecycle', label: 'Exit Management', path: '/hr/lifecycle/exits' },

    // 03. Talent & Growth - Performance
    { group: 'Performance', label: 'Performance Reviews', path: '/hr/performance/reviews' },
    { group: 'Performance', label: 'Goals', path: '/hr/performance/goals' },
    { group: 'Performance', label: 'Review Cycles', path: '/hr/performance/cycles' },
    { group: 'Performance', label: 'Indicators', path: '/hr/performance/indicators' },
    { group: 'Performance', label: 'Performance PIP', path: '/hr/performance/pip' },
    { group: 'Performance', label: 'Goal Types', path: '/hr/performance/goal-types' },
    { group: 'Performance', label: 'Indicator Categories', path: '/hr/performance/indicator-categories' },

    // 03. Talent & Growth - Training
    { group: 'Training', label: 'Employee Training', path: '/hr/training/employee-trainings' },
    { group: 'Training', label: 'Sessions', path: '/hr/training/sessions' },
    { group: 'Training', label: 'Programs', path: '/hr/training/programs' },
    { group: 'Training', label: 'Training Catalog', path: '/hr/training/trainings' },
    { group: 'Training', label: 'Training Types', path: '/hr/training/types' },

    // 04. Finance & Assets - Payroll
    { group: 'Payroll', label: 'Payroll Runs', path: '/hr/payroll/runs' },
    { group: 'Payroll', label: 'Payslips', path: '/hr/payroll/payslips' },
    { group: 'Payroll', label: 'Salary Structures', path: '/hr/payroll/salaries' },
    { group: 'Payroll', label: 'Components', path: '/hr/payroll/components' },
    { group: 'Payroll', label: 'Employee Salaries', path: '/hr/payroll/employee-salaries' },
    { group: 'Payroll', label: 'Tax Declarations', path: '/hr/payroll/tax' },
    { group: 'Payroll', label: 'Reimbursements & Loans', path: '/hr/payroll/reimbursements-loans' },
    { group: 'Payroll', label: 'Statutory Forms', path: '/hr/payroll/forms' },

    // 04. Finance & Assets - Assets
    { group: 'Assets', label: 'Assets Dashboard', path: '/hr/assets/dashboard' },
    { group: 'Assets', label: 'Asset Register', path: '/hr/assets' },
    { group: 'Assets', label: 'Depreciation', path: '/hr/assets/depreciation' },
    { group: 'Assets', label: 'Asset Types', path: '/hr/assets/types' },
    { group: 'Assets', label: 'Maintenance & Requests', path: '/hr/assets/requests-maintenance' },

    // 05. Communications & Content - Meetings
    { group: 'Meetings', label: 'Meetings List', path: '/hr/meetings' },
    { group: 'Meetings', label: 'Action Items', path: '/hr/meetings/action-items' },
    { group: 'Meetings', label: 'Meeting Rooms', path: '/hr/meetings/rooms' },
    { group: 'Meetings', label: 'Meeting Types', path: '/hr/meetings/types' },

    // 05. Communications & Content - Company Documents
    { group: 'Company Documents', label: 'Document Repository', path: '/hr/documents' },
    { group: 'Company Documents', label: 'Employee Contracts', path: '/hr/documents/contracts' },
    { group: 'Company Documents', label: 'Letters & Requests', path: '/hr/documents/letters' },
    { group: 'Company Documents', label: 'Acknowledgements', path: '/hr/documents/acknowledgements' },
    { group: 'Company Documents', label: 'Document Templates', path: '/hr/documents/templates' },
    { group: 'Company Documents', label: 'Contract Templates', path: '/hr/documents/contract-templates' },
    { group: 'Company Documents', label: 'Document Categories', path: '/hr/documents/categories' },
    { group: 'Communications', label: 'Media Library', path: '/hr/media' },
    { group: 'Communications', label: 'My Profile', path: '/hr/profile' },

    // 06. Reports & Analytics
    { group: 'Reports & Analytics', label: 'Headcount Report', path: '/hr/reports/headcount' },
    { group: 'Reports & Analytics', label: 'Attrition Report', path: '/hr/reports/attrition' },
    { group: 'Reports & Analytics', label: 'Attendance Report', path: '/hr/reports/attendance' },
    { group: 'Reports & Analytics', label: 'Payroll Report', path: '/hr/reports/payroll' },
    { group: 'Reports & Analytics', label: 'Recruitment Report', path: '/hr/reports/recruitment' },
    { group: 'Reports & Analytics', label: 'Performance Report', path: '/hr/reports/performance' },
    { group: 'Reports & Analytics', label: 'Training Report', path: '/hr/reports/training' },
    { group: 'Reports & Analytics', label: 'Statutory Report', path: '/hr/reports/statutory' },
    { group: 'Reports & Analytics', label: 'Custom Reports', path: '/hr/reports/custom' },

    // 07. Add-ons & Integrations
    { group: 'Add-ons & Integrations', label: 'Strategic Planning', path: '/addons/planning/dashboard' },
    { group: 'Add-ons & Integrations', label: 'Challenges', path: '/addons/planning/challenges' },
    { group: 'Add-ons & Integrations', label: 'Initiative Charters', path: '/addons/planning/charters' },
    { group: 'Add-ons & Integrations', label: 'Planning Kanban', path: '/addons/planning/charters/kanban' },
    { group: 'Add-ons & Integrations', label: 'OKRs', path: '/okr' },
    { group: 'Add-ons & Integrations', label: 'Learning Analytics', path: '/learning-analytics' },
    { group: 'Add-ons & Integrations', label: 'Biometric Sync', path: '/biometric-sync' },
    { group: 'Add-ons & Integrations', label: 'Notice Board', path: '/notice-board' },
    { group: 'Add-ons & Integrations', label: 'AI Assistant Usage', path: '/addons/ai-assistant/usage' },
    { group: 'Add-ons & Integrations', label: 'AI Document Generator', path: '/addons/ai-document/generate' },
    { group: 'Add-ons & Integrations', label: 'Webhook Endpoints', path: '/addons/webhook/endpoints' },
  ];

  const results = [];

  for (const item of hrItems) {
    const targetUrl = `${baseUrl}${item.path}`;
    let status = 200;
    let finalUrl = '';
    let title = '';
    let outcome = 'OK';
    let details = {};

    try {
      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      if (response) {
        status = response.status();
      }
      finalUrl = page.url();
      title = await page.title();

      // Check DOM content
      details = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const is404 = (text.includes('404') && (text.includes('This page could not be found') || text.includes('Page Not Found'))) || text.includes('Workspace Unavailable');
        const isCrash = text.includes('Application error') || text.includes('Unhandled Runtime Error');
        const hasMain = !!(document.querySelector('main') || document.querySelector('#main-content') || document.querySelector('.main-wrapper') || document.querySelector('.sidebar'));
        const firstHeading = document.querySelector('h1, h2')?.innerText?.trim() || '';

        return {
          is404,
          isCrash,
          hasMain,
          firstHeading,
          bodySnippet: text.slice(0, 100).replace(/\s+/g, ' ')
        };
      });

      if (details.isCrash) {
        outcome = 'CRASH';
      } else if (details.is404 || status === 404) {
        outcome = '404_NOT_FOUND';
      } else if (finalUrl.includes('/auth') || finalUrl.includes('/login')) {
        outcome = 'REDIRECT_AUTH';
      } else if (status >= 400) {
        outcome = `HTTP_${status}`;
      } else {
        outcome = 'OK';
      }

    } catch (err) {
      outcome = 'TIMEOUT_OR_ERROR';
      details = { error: err.message };
    }

    results.push({
      group: item.group,
      label: item.label,
      path: item.path,
      status,
      finalUrl,
      title,
      outcome,
      firstHeading: details.firstHeading || ''
    });
  }

  return {
    section: 'HR Admin Sidebar',
    total: results.length,
    ok: results.filter(r => r.outcome === 'OK').length,
    notFound: results.filter(r => r.outcome === '404_NOT_FOUND').length,
    redirectAuth: results.filter(r => r.outcome === 'REDIRECT_AUTH').length,
    crashes: results.filter(r => r.outcome === 'CRASH').length,
    timeouts: results.filter(r => r.outcome === 'TIMEOUT_OR_ERROR').length,
    results
  };
}
