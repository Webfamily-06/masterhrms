async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  const items = [
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

  return { batch: 3, total: results.length, ok: results.filter(r => r.outcome === 'OK').length, results };
}
