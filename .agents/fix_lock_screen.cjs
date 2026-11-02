const fs = require('fs');
const p = 'CMS/src/app/lock-screen/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('title: "Lock Screen | Dreams ERP"', 'title: "Session Locked — MasterHRMS"');
c = c.replace(
  '{ name: "description", content: "Session locked for security. Enter your password to resume." },',
  '{ name: "description", content: "Session locked for security. Enter your password to resume." },\n      { name: "robots", content: "noindex, nofollow" },'
);
fs.writeFileSync(p, c);
console.log('Successfully updated lock-screen/page.tsx');

