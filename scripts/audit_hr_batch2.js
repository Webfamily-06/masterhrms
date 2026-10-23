async (page) => {
  const baseUrl = 'http://master.localhost:3000';
  const items = [
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

  return { batch: 2, total: results.length, ok: results.filter(r => r.outcome === 'OK').length, results };
}
