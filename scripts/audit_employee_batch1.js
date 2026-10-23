async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  const items = [
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
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
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

  return { batch: 'employee-1', total: results.length, ok: results.filter(r => r.outcome === 'OK').length, results };
}
