async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  const items = [
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

  return { batch: 4, total: results.length, ok: results.filter(r => r.outcome === 'OK').length, results };
}
