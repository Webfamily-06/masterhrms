const fs = require('fs');
const p = 'CMS/src/app/blog/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/export const metadata: Metadata = \{[\s\S]*?\};/, `export const metadata: Metadata = {
  ...generateMetadata(
    'Workforce & HR Insights Blog — MasterHRMS',
    'Expert guidance on statutory payroll compliance, HR automation, employee engagement, and modern workforce operations.',
    'https://www.masterhrms.com/blog'
  ),
};`);
fs.writeFileSync(p, c, 'utf8');
console.log('Updated blog/page.tsx');

