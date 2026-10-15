const fs = require('fs');
const c = fs.readFileSync('server/src/routes/hr-lifecycle.routes.ts', 'utf8');

const regex = /hrLifecycleRouter\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
let m;
console.log('Routes in hr-lifecycle.routes.ts:');
while ((m = regex.exec(c)) !== null) {
  console.log(' ', m[1].toUpperCase(), m[2]);
}
