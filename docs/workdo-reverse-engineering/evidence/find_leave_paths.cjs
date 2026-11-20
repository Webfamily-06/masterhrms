const fs = require('fs');
const path = 'docs/workdo-reverse-engineering/evidence/bundles/app-BEKn0bFF.js';
const code = fs.readFileSync(path, 'utf8');

const matches = new Set();
const reg = /["'`](\/hrm\/[a-zA-Z0-9_\-\/]+)["'`]/g;
let m;
while ((m = reg.exec(code)) !== null) {
  matches.add(m[1]);
}

console.log('All /hrm/* paths:', Array.from(matches).sort());

// Also search for leave in general
const leaveMatches = new Set();
const reg2 = /["'`](\/[a-zA-Z0-9_\-\/]*leave[a-zA-Z0-9_\-\/]*)["'`]/gi;
while ((m = reg2.exec(code)) !== null) {
  leaveMatches.add(m[1]);
}
console.log('All leave paths:', Array.from(leaveMatches).sort());
