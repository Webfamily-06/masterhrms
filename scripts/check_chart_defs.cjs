const fs = require('fs');

const chartDataJs = fs.readFileSync('SMARTHR/assets/plugins/apexchart/chart-data.js', 'utf8');

const targetCharts = [
  'sales-income', 'mySemiDonutChart', 'leaves_chart', 'performance_chart2',
  'pipeline_chart', 'deal_chart', 'heat_chart', 'leads_stage', 'donut-chart-2', 'donut-chart-3',
  'status-chart', 'leave-chart', 'attendance-chart', 'training-chart', 'deduction-chart', 'payroll-chart',
  'imageChart', 'imageChartWeek', 'imageChartMonth', 'imageChartYear',
  'distribution-chart', 'process-chart', 'chart-trend', 'insurence-chart', 'contribution-chart', 'health-chart',
  'attendancetrend-chart', 'office-chart', 'violation-chart', 'arrival-chart-1', 'arrival-chart-2', 'arrival-chart-3', 'arrival-chart-4',
  'reimbrusement-chart', 'headcount-chart', 'cost_chart', 'budget-chart', 'finance-chart',
  'uptime-chart', 'api-chart', 'tickets-chart', 'jobs-chart', 'storages-chart', 'mfa-chart', 'logactivity-chart',
  'Usage-chart', 'failed-chart', 'alerts-chart', 'blocked-chart', 'error-chart',
  'asset-categories-chart'
];

for (const id of targetCharts) {
  const has = chartDataJs.includes(`'${id}'`) || chartDataJs.includes(`"${id}"`) || chartDataJs.includes(`#${id}`);
  console.log(id, has ? 'FOUND' : 'NOT FOUND');
}
