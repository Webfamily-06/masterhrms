const fs = require('fs');
const p = 'server/src/routes/cms.routes.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'title: "Home",\n        metaDescription: "Master HRMS & Enterprise ERP — automate your workforce management.",',
  'title: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management",\n        metaDescription: "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",'
);
c = c.replace(
  'title: "Automate your workflows, eliminate manual tasks.",\n            subtitle:\n              "Connect your tools, design smart workflows, and automate repetitive work — so your business runs on autopilot."',
  'title: "Automate your workforce management and payroll operations.",\n            subtitle:\n              "Manage employee records, automated payroll, biometric attendance, and global compliance — built for high-performing enterprises."'
);
fs.writeFileSync(p, c);
console.log('Successfully updated cms.routes.ts');

