async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  const items = [
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
  ];

  const results = [];
  for (const item of items) {
    const targetUrl = `${baseUrl}${item.path}`;
    let status = 200;
    let finalUrl = '';
    let title = '';
    let outcome = 'OK';
    let firstHeading = '';

    try {
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
      if (response) status = response.status();
      finalUrl = page.url();
      title = await page.title();

      const details = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const is404 = text.includes('404') && (text.includes('This page could not be found') || text.includes('Page Not Found'));
        const isCrash = text.includes('Application error') || text.includes('Unhandled Runtime Error');
        const h = document.querySelector('h1, h2')?.innerText?.trim() || '';
        return { is404, isCrash, h };
      });

      firstHeading = details.h;
      if (details.isCrash) outcome = 'CRASH';
      else if (details.is404 || status === 404) outcome = '404_NOT_FOUND';
      else if (finalUrl.includes('/auth') || finalUrl.includes('/login')) outcome = 'REDIRECT_AUTH';
      else if (status >= 400) outcome = `HTTP_${status}`;
      else outcome = 'OK';
    } catch (err) {
      outcome = 'TIMEOUT_OR_ERROR';
    }

    results.push({
      group: item.group,
      label: item.label,
      path: item.path,
      status,
      finalUrl,
      title,
      outcome,
      firstHeading
    });
  }

  return { batch: 1, total: results.length, ok: results.filter(r => r.outcome === 'OK').length, results };
}
