const fs = require('fs');
const path = require('path');

console.log('--- STARTING COMPREHENSIVE DASHBOARD CHART & LAYOUT WIRING ---');

// 1. TENANT DASHBOARD (tenant/dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/tenant/dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const optionsToAdd = `
  const salesIncomeChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 290,
        type: 'bar',
        stacked: true,
        toolbar: { show: false }
      },
      colors: ['#FF6F28', '#E5E7EB'],
      plotOptions: {
        bar: {
          columnWidth: '60%',
          borderRadius: 5,
          borderRadiusWhenStacked: 'all',
          horizontal: false,
        },
      },
      series: [
        { name: 'Income', data: [40, 30, 45, 80, 85, 90, 80, 80, 80, 85, 20, 80] },
        { name: 'Expenses', data: [60, 70, 55, 20, 15, 10, 20, 20, 20, 15, 80, 20] }
      ],
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '13px',
          }
        }
      },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  const salesIncomeSeries = useMemo(() => [
    { name: 'Income', data: [40, 30, 45, 80, 85, 90, 80, 80, 80, 85, 20, 80] },
    { name: 'Expenses', data: [60, 70, 55, 20, 15, 10, 20, 20, 20, 15, 80, 20] }
  ], []);

  const empDepartmentOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 220,
        type: 'bar',
        toolbar: { show: false }
      },
      colors: ['#FF6F28'],
      plotOptions: {
        bar: {
          borderRadius: 5,
          horizontal: true,
          barHeight: '35%',
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['UI/UX', 'Development', 'Management', 'HR', 'Testing', 'Marketing'],
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '12px',
          }
        }
      },
      grid: {
        borderColor: '#E5E7EB',
        strokeDashArray: 4,
      }
    }),
    []
  );

  const empDepartmentSeries = useMemo(() => [{
    name: 'Employees',
    data: [80, 110, 80, 20, 60, 100]
  }], []);
`;

  if (!content.includes('salesIncomeChartOptions')) {
    content = content.replace('return (', optionsToAdd + '\n  return (');
  }

  // Attendance Canvas Replacement
  const oldAttendancePattern = /<div className="chartjs-wrapper-demo position-relative mb-4">\s*<canvas id="attendance"[^>]*><\/canvas>[\s\S]*?<\/div>\s*<\/div>/;
  const newAttendance = `<div className="position-relative mb-4 d-flex justify-content-center">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 200 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={attendanceChartOptions} series={attendanceChartSeries} type="donut" height={200} />
      </Suspense>
    )}
    <div className="position-absolute text-center" style={{ top: '65px', left: 0, right: 0, pointerEvents: 'none' }}>
      <p className="fs-13 mb-0 text-muted">Total Attendance</p>
      <h3 className="mb-0 fw-bold">120</h3>
    </div>
  </div>`;
  content = content.replace(oldAttendancePattern, newAttendance);

  // emp-department replacement
  content = content.replace('<div id="emp-department"></div>', `<div id="emp-department">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 220 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={empDepartmentOptions} series={empDepartmentSeries} type="bar" height={220} />
      </Suspense>
    )}
  </div>`);

  // sales-income replacement
  content = content.replace('<div id="sales-income"></div>', `<div id="sales-income">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 290 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={salesIncomeChartOptions} series={salesIncomeSeries} type="bar" height={290} />
      </Suspense>
    )}
  </div>`);

  // mySemiDonutChart replacement
  const oldSemiDonutPattern = /<div className="chartjs-wrapper-demo position-relative mb-4">\s*<canvas id="mySemiDonutChart"[^>]*><\/canvas>[\s\S]*?<\/div>\s*<\/div>/;
  const newSemiDonut = `<div className="position-relative mb-4 d-flex justify-content-center">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 190 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={projectChartOptions} series={projectChartSeries} type="donut" height={190} />
      </Suspense>
    )}
    <div className="position-absolute text-center" style={{ top: '60px', left: 0, right: 0, pointerEvents: 'none' }}>
      <p className="fs-13 mb-0 text-muted">Total Projects</p>
      <h3 className="mb-0 fw-bold">90</h3>
    </div>
  </div>`;
  content = content.replace(oldSemiDonutPattern, newSemiDonut);

  fs.writeFileSync(file, content);
  console.log('✅ Updated tenant/dashboard/page.tsx');
}

// 2. RECRUITMENT DASHBOARD (recruitment-dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/recruitment-dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Replace <canvas id="recruitment"></canvas>
  content = content.replace('<canvas id="recruitment"></canvas>', `{isMounted && (
    <Suspense fallback={<div style={{ height: 220 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
      <Chart options={recruitmentChartOptions} series={[68]} type="radialBar" height={220} />
    </Suspense>
  )}`);

  // Replace <canvas id="avghiretime"></canvas>
  content = content.replace('<canvas id="avghiretime"></canvas>', `{isMounted && (
    <Suspense fallback={<div style={{ height: 220 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
      <Chart options={avgHireTimeOptions} series={[{ name: "Applied", data: [2, 4, 3] }, { name: "Shortlisted", data: [5, 2, 4] }, { name: "Hired", data: [2, 3, 1] }]} type="bar" height={220} />
    </Suspense>
  )}`);

  fs.writeFileSync(file, content);
  console.log('✅ Updated recruitment-dashboard/page.tsx');
}

// 3. DEALS DASHBOARD (deals-dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/deals-dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const optionsToAdd = `
  const dealsStageOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 310,
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
      },
      colors: ['#FF6F28', '#E5E7EB'],
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: false,
          columnWidth: '55%',
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Inpipeline', 'Follow Up', 'Schedule', 'Conversion'],
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '13px',
          }
        }
      },
      legend: { show: false },
    }),
    []
  );

  const dealsStageSeries = useMemo(() => [
    { name: 'Income', data: [80, 40, 100, 20] },
    { name: 'Expenses', data: [100, 100, 100, 100] }
  ], []);
`;

  if (!content.includes('dealsStageOptions')) {
    content = content.replace('return (', optionsToAdd + '\n  return (');
  }

  content = content.replace('<div id="deals_stage"></div>', `<div id="deals_stage">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 310 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={dealsStageOptions} series={dealsStageSeries} type="bar" height={310} />
      </Suspense>
    )}
  </div>`);

  fs.writeFileSync(file, content);
  console.log('✅ Updated deals-dashboard/page.tsx');
}

// 4. LEADS DASHBOARD (leads-dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/leads-dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const optionsToAdd = `
  const revenueIncomeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 280,
        type: 'bar',
        stacked: true,
        toolbar: { show: false }
      },
      colors: ['#f26522', '#0c4b5e', '#1b84ff', '#E5E7EB'],
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '55%',
          horizontal: false,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: {
          style: { colors: '#6B7280', fontSize: '12px' }
        }
      },
      legend: { show: false },
    }),
    []
  );

  const revenueIncomeSeries = useMemo(() => [
    { name: 'Step 1', data: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 20, 25] },
    { name: 'Step 2', data: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 20, 25] },
    { name: 'Step 3', data: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 20, 25] },
    { name: 'Step 4', data: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 20, 25] },
  ], []);

  const leadsStageOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 345,
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
      },
      colors: ['#FF6F28', '#E5E7EB'],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '55%',
          horizontal: false,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Closed Won', 'Contacted', 'Qualified', 'Lost'],
        labels: {
          style: { colors: '#6B7280', fontSize: '13px' }
        }
      },
      legend: { show: false },
    }),
    []
  );

  const leadsStageSeries = useMemo(() => [
    { name: 'Income', data: [80, 40, 60, 40] },
    { name: 'Expenses', data: [100, 100, 100, 100] }
  ], []);
`;

  if (!content.includes('revenueIncomeOptions')) {
    content = content.replace('return (', optionsToAdd + '\n  return (');
  }

  content = content.replace('<div id="revenue-income"></div>', `<div id="revenue-income">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 280 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={revenueIncomeOptions} series={revenueIncomeSeries} type="bar" height={280} />
      </Suspense>
    )}
  </div>`);

  content = content.replace('<div id="leads_stage"></div>', `<div id="leads_stage">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 345 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={leadsStageOptions} series={leadsStageSeries} type="bar" height={345} />
      </Suspense>
    )}
  </div>`);

  fs.writeFileSync(file, content);
  console.log('✅ Updated leads-dashboard/page.tsx');
}

// 5. HRM DASHBOARD (hrm-dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/hrm-dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const optionsToAdd = `
  const empDistributionOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 340,
        type: 'bar',
        toolbar: { show: false },
      },
      colors: ['#FF7129'],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '45%',
          horizontal: false,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: {
          style: { colors: '#6B7280', fontSize: '12px' }
        }
      },
      grid: {
        borderColor: '#E5E7EB',
        strokeDashArray: 4,
      }
    }),
    []
  );

  const empDistributionSeries = useMemo(() => [{
    name: 'Employees',
    data: [40, 50, 60, 70, 80, 90, 100, 80, 70, 60, 50, 40]
  }], []);
`;

  if (!content.includes('empDistributionOptions')) {
    content = content.replace('return (', optionsToAdd + '\n  return (');
  }

  content = content.replace('<div id="employee-distribution"></div>', `<div id="employee-distribution">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 340 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={empDistributionOptions} series={empDistributionSeries} type="bar" height={340} />
      </Suspense>
    )}
  </div>`);

  fs.writeFileSync(file, content);
  console.log('✅ Updated hrm-dashboard/page.tsx');
}

// 6. FINANCE DASHBOARD (finance-dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/finance-dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const optionsToAdd = `
  const payrollPaymentOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        height: 45,
        stacked: true,
        stackType: '100%',
        toolbar: { show: false },
        sparkline: { enabled: true }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '100%',
          borderRadius: 4,
        },
      },
      colors: ['#FF6F28', '#E5E7EB'],
      tooltip: { enabled: true },
    }),
    []
  );

  const payrollPaymentSeries = useMemo(() => [
    { name: 'Payroll', data: [600] },
    { name: 'Remaining', data: [1000] },
  ], []);
`;

  if (!content.includes('payrollPaymentOptions')) {
    content = content.replace('return (', optionsToAdd + '\n  return (');
  }

  content = content.replace('<div id="payroll-payment"></div>', `<div id="payroll-payment">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 45 }} className="d-flex align-items-center justify-content-center text-muted">Loading...</div>}>
        <Chart options={payrollPaymentOptions} series={payrollPaymentSeries} type="bar" height={45} />
      </Suspense>
    )}
  </div>`);

  fs.writeFileSync(file, content);
  console.log('✅ Updated finance-dashboard/page.tsx');
}

// 7. ASSET DASHBOARD (asset-dashboard/page.tsx)
{
  const file = 'CMS/src/app/(workspace)/asset-dashboard/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const optionsToAdd = `
  const assetDeptOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 296,
        type: 'bar',
        toolbar: { show: false },
      },
      colors: ['#0C4B5E'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: true,
          barHeight: '35%',
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['UI/UX', 'Development', 'Management', 'HR', 'Testing', 'Marketing'],
        labels: { style: { colors: '#6B7280', fontSize: '12px' } }
      },
      grid: { borderColor: '#E5E7EB', strokeDashArray: 4 }
    }),
    []
  );

  const assetDeptSeries = useMemo(() => [{
    name: 'Assets',
    data: [80, 110, 80, 20, 60, 100]
  }], []);

  const sparklineBarOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        height: 116,
        toolbar: { show: false },
        sparkline: { enabled: true },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '70%',
        }
      },
      colors: ['#FF6F28'],
      tooltip: { enabled: true }
    }),
    []
  );

  const sparklineBarSeries = useMemo(() => [{
    name: 'Assets',
    data: [14, 18, 12, 22, 16, 24, 28, 15, 20, 14, 18, 11, 13, 23, 25, 26, 17, 14, 12, 24, 16, 12, 10, 20, 18, 15, 12, 18]
  }], []);

  const assetValueOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        height: 65,
        toolbar: { show: false },
        sparkline: { enabled: true }
      },
      plotOptions: {
        bar: {
          borderRadius: 3,
          columnWidth: '55%',
        }
      },
      colors: ['#0C4B5E'],
      tooltip: { enabled: false }
    }),
    []
  );

  const assetValueSeries = useMemo(() => [{
    name: 'Value',
    data: [1, 1, 1, 1, 1, 1.6, 1, 1, 1, 1, 1, 1.2, 1, 1, 1.8, 1, 1, 1]
  }], []);
`;

  if (!content.includes('assetDeptOptions')) {
    content = content.replace('return (', optionsToAdd + '\n  return (');
  }

  content = content.replace('<div id="assets-department"></div>', `<div id="assets-department">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 296 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={assetDeptOptions} series={assetDeptSeries} type="bar" height={296} />
      </Suspense>
    )}
  </div>`);

  content = content.replace('<div id="total-assets"></div>', `<div id="total-assets">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 116 }}>Loading...</div>}>
        <Chart options={sparklineBarOptions} series={sparklineBarSeries} type="bar" height={116} />
      </Suspense>
    )}
  </div>`);

  content = content.replace('<div id="assets-assigned"></div>', `<div id="assets-assigned">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 116 }}>Loading...</div>}>
        <Chart options={sparklineBarOptions} series={sparklineBarSeries} type="bar" height={116} />
      </Suspense>
    )}
  </div>`);

  content = content.replace('<div id="assets-available"></div>', `<div id="assets-available">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 116 }}>Loading...</div>}>
        <Chart options={sparklineBarOptions} series={sparklineBarSeries} type="bar" height={116} />
      </Suspense>
    )}
  </div>`);

  content = content.replace('<div id="asset-value"></div>', `<div id="asset-value">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 65 }}>Loading...</div>}>
        <Chart options={assetValueOptions} series={assetValueSeries} type="bar" height={65} />
      </Suspense>
    )}
  </div>`);

  content = content.replace('<div id="depreciated-value"></div>', `<div id="depreciated-value">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 60 }}>Loading...</div>}>
        <Chart options={assetValueOptions} series={assetValueSeries} type="bar" height={60} />
      </Suspense>
    )}
  </div>`);

  fs.writeFileSync(file, content);
  console.log('✅ Updated asset-dashboard/page.tsx');
}

console.log('--- ALL DASHBOARD CHARTS SUCCESSFULLY WIRED ---');
