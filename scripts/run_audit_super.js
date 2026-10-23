async (page) => {
  const baseUrl = 'http://localhost:3000';
  const superItems = [
    // Core Orchestration
    { group: 'Core Orchestration', label: 'Dashboard', path: '/super' },
    { group: 'Core Orchestration', label: 'Tenant Workspaces', path: '/super/tenants' },
    { group: 'Core Orchestration', label: 'Tenant Usage Metrics', path: '/super/tenant-usage-metrics' },
    { group: 'Core Orchestration', label: 'Subscription Plans', path: '/super/plans' },
    { group: 'Core Orchestration', label: 'Discount Coupons', path: '/super/coupons' },
    { group: 'Core Orchestration', label: 'Purchase Transactions', path: '/super/transactions' },
    { group: 'Core Orchestration', label: 'Roles & RBAC Matrix', path: '/super/roles' },
    { group: 'Core Orchestration', label: 'Statutory Compliance', path: '/super/compliance' },

    // Extensions & Add-ons
    { group: 'Extensions & Add-ons', label: 'Addons Marketplace', path: '/super/marketplace' },
    { group: 'Extensions & Add-ons', label: 'App Integrations', path: '/super/integrations' },
    { group: 'Extensions & Add-ons', label: 'Custom Domains', path: '/super/domains' },
    { group: 'Extensions & Add-ons', label: 'Domain Documentation', path: '/super/domains/documentation' },

    // Marketing & CMS
    { group: 'Marketing & CMS', label: 'Visual CMS Studio', path: '/super/cms' },
    { group: 'Marketing & CMS', label: 'All Articles', path: '/super/blogs' },
    { group: 'Marketing & CMS', label: 'Categories', path: '/super/blogs/categories' },
    { group: 'Marketing & CMS', label: 'Tags', path: '/super/blogs/tags' },
    { group: 'Marketing & CMS', label: 'Case Studies', path: '/super/case-studies' },
    { group: 'Marketing & CMS', label: 'Media Library', path: '/super/media' },

    // Communications
    { group: 'Communications', label: 'Tenant Support Tickets', path: '/super/tenant-support-tickets' },
    { group: 'Communications', label: 'Support Agents', path: '/super/agents' },
    { group: 'Communications', label: 'SLA Policies', path: '/super/sla-policies' },
    { group: 'Communications', label: 'Escalation Rules', path: '/super/escalation-rules' },
    { group: 'Communications', label: 'Global Support Desk', path: '/super/support' },
    { group: 'Communications', label: 'Email Templates', path: '/super/email-templates' },
    { group: 'Communications', label: 'Broadcast Alerts', path: '/super/notifications' },

    // System Controls
    { group: 'System Controls', label: 'Cron Automations', path: '/cronjob' },
    { group: 'System Controls', label: 'Cache & Maintenance', path: '/clear-cache' },
    { group: 'System Controls', label: 'Platform Settings', path: '/super/settings' },
    { group: 'System Controls', label: 'Platform Analytics', path: '/super/analytics' },
    { group: 'System Controls', label: 'Localization (i18n)', path: '/super/languages' },
    { group: 'System Controls', label: 'Database Backups', path: '/super/backup' },
    { group: 'System Controls', label: 'API Reference', path: '/super/api-docs' },
    { group: 'System Controls', label: 'Developer & Web APIs', path: '/super/developer' },
    { group: 'System Controls', label: 'Documentation Portal', path: '/super/docs' },
  ];

  // Navigate to /super first to ensure session is active
  await page.goto(`${baseUrl}/super`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});

  const results = [];

  for (const item of superItems) {
    const targetUrl = `${baseUrl}${item.path}`;
    const consoleErrors = [];
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('Failed to load resource') && !t.includes('favicon')) {
          consoleErrors.push(t.slice(0, 100));
        }
      }
    };
    page.on('console', onConsole);

    let status = 200;
    let finalUrl = '';
    let title = '';
    let outcome = 'OK';
    let details = {};

    try {
      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 8000,
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
        const hasTable = !!document.querySelector('table');
        const hasCards = !!document.querySelector('.card, [class*="card"]');
        const hasHeadings = !!document.querySelector('h1, h2, h3');
        const firstHeading = document.querySelector('h1, h2')?.innerText?.trim() || '';

        return {
          is404,
          isCrash,
          hasMain,
          hasTable,
          hasCards,
          hasHeadings,
          firstHeading,
          bodySnippet: text.slice(0, 120).replace(/\s+/g, ' ')
        };
      });

      if (details.isCrash) {
        outcome = 'CRASH';
      } else if (details.is404 || status === 404) {
        outcome = '404_NOT_FOUND';
      } else if (finalUrl.includes('/auth') || finalUrl.includes('/login') || finalUrl.includes('/super-login')) {
        outcome = 'REDIRECT_AUTH';
      } else if (status >= 400) {
        outcome = `HTTP_${status}`;
      } else {
        outcome = 'OK';
      }

    } catch (err) {
      outcome = 'TIMEOUT_OR_ERROR';
      details = { error: err.message };
    } finally {
      page.off('console', onConsole);
    }

    results.push({
      group: item.group,
      label: item.label,
      path: item.path,
      status,
      finalUrl,
      title,
      outcome,
      firstHeading: details.firstHeading || '',
      consoleErrorsCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 2)
    });
  }

  return {
    section: 'Super Admin Sidebar',
    total: results.length,
    ok: results.filter(r => r.outcome === 'OK').length,
    notFound: results.filter(r => r.outcome === '404_NOT_FOUND').length,
    redirectAuth: results.filter(r => r.outcome === 'REDIRECT_AUTH').length,
    crashes: results.filter(r => r.outcome === 'CRASH').length,
    results
  };
}
