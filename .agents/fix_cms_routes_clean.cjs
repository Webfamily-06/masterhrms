const fs = require('fs');
const p = 'server/src/routes/cms.routes.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'title: "Home",',
  'title: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management",'
);
c = c.replace(
  'metaDescription: "Master HRMS & Enterprise ERP — automate your workforce management.",',
  'metaDescription: "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Successfully updated cms.routes.ts fallback metadata');

