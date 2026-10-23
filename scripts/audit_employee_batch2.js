async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  const items = [
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

  return { batch: 'employee-2', total: results.length, ok: results.filter(r => r.outcome === 'OK').length, results };
}
