const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, 'bundles', 'app-BEKn0bFF.js');
const s = fs.readFileSync(bundlePath, 'utf8');

console.log('Length:', s.length);
console.log('Contains hrm/employees:', s.includes('hrm/employees'));
console.log('Contains /api/:', s.includes('/api/'));
console.log('Contains /roles:', s.includes('/roles'));

const idx = s.indexOf('hrm/employees');
if (idx !== -1) {
  console.log('Snippet around hrm/employees:\n', s.slice(Math.max(0, idx - 150), idx + 250));
}

// Find occurrences of route definitions:
const urlMatches = s.match(/(?:https?:\/\/[^\s"'`]+|\/[a-zA-Z0-9_\-\/]{3,})/g) || [];
console.log('Total URL-like matches:', urlMatches.length);

const uniquePaths = new Set(urlMatches.filter(u => u.startsWith('/') && !u.startsWith('//') && !u.includes('/*')));
console.log('Unique relative paths:', uniquePaths.size);

const hrmPaths = Array.from(uniquePaths).filter(u => u.includes('hrm') || u.includes('employee') || u.includes('attendance') || u.includes('leave') || u.includes('payroll') || u.includes('role') || u.includes('user'));
console.log('HRM & User related paths count:', hrmPaths.length);
console.log('Sample HRM paths:', hrmPaths.slice(0, 30));
