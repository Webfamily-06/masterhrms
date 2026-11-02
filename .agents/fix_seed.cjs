const fs = require('fs');
const p = 'server/scripts/seed-canonical-cms-pages.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('title: "Home — Next-Gen Automation SaaS"', 'title: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management"');
c = c.replace('metaDescription: "Automate your workflows, eliminate manual tasks, and connect enterprise tools with Nexsas."', 'metaDescription: "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform."');
c = c.replace('tag: "About Nexsas"', 'tag: "About MasterHRMS"');
c = c.replace('subtitle: "Join over 2,000+ growing teams delivering higher velocity with Master HRMS and Nexsas."', 'subtitle: "Join over 2,000+ growing teams delivering higher velocity with MasterHRMS."');
c = c.replace('metaDescription: "Learn how Nexsas began and the mission that drives our enterprise software innovation."', 'metaDescription: "Learn how MasterHRMS began and the mission that drives our enterprise workforce platform."');
c = c.replace('title: "How Nexsas began"', 'title: "How MasterHRMS began"');
c = c.replace('metaDescription: "Meet the minds behind Nexsas and Master HRMS."', 'metaDescription: "Meet the leadership and engineering team behind MasterHRMS."');
c = c.replace('title: "The minds behind Nexsas"', 'title: "The minds behind MasterHRMS"');
fs.writeFileSync(p, c);
console.log('Successfully updated server/scripts/seed-canonical-cms-pages.ts');

