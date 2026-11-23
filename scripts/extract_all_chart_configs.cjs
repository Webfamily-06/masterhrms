const fs = require('fs');

const apexJs = fs.readFileSync('SMARTHR/assets/plugins/apexchart/chart-data.js', 'utf8');
const chartJs = fs.readFileSync('SMARTHR/assets/plugins/chartjs/chart-data.js', 'utf8');

const allCharts = [
  'pipeline_chart', 'deal_chart',
  'heat_chart', 'donut-chart-2', 'donut-chart-3',
  'status-chart', 'leave-chart', 'attendance-chart', 'deduction-chart', 'payroll-chart', 'training-chart',
  'distribution-chart', 'process-chart', 'chart-trend', 'insurence-chart', 'contribution-chart', 'health-chart',
  'attendancetrend-chart', 'office-chart', 'violation-chart',
  'cost_chart', 'reimbrusement-chart', 'headcount-chart', 'budget-chart', 'finance-chart',
  'uptime-chart', 'api-chart', 'tickets-chart', 'jobs-chart', 'storages-chart', 'mfa-chart',
  'purchase-trend', 'asset-categories-chart',
  'ticket-trends', 'ticket-status', 'sla-compliance', 'backlog-growth', 'ticket-category'
];

const found = {};

for (const id of allCharts) {
  // check apex
  let idx = apexJs.indexOf(`'#${id}'`);
  if (idx === -1) idx = apexJs.indexOf(`"#${id}"`);
  if (idx === -1) idx = apexJs.indexOf(id);

  if (idx !== -1) {
    found[id] = { source: 'apex', snippet: apexJs.slice(Math.max(0, idx - 200), idx + 200).replace(/\s+/g, ' ') };
  } else {
    // check chartjs
    let idx2 = chartJs.indexOf(id);
    if (idx2 !== -1) {
      found[id] = { source: 'chartjs', snippet: chartJs.slice(Math.max(0, idx2 - 100), idx2 + 200).replace(/\s+/g, ' ') };
    } else {
      found[id] = { source: 'none' };
    }
  }
}

console.log(JSON.stringify(found, null, 2));
