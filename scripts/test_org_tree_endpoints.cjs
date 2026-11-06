const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

const token = jwt.sign(
  {
    userId: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId: 'tenant-default-001',
    roles: ['hr_admin'],
    permissions: ['*']
  },
  jwtSecret,
  { algorithm: 'HS256', expiresIn: '2h' }
);

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api${path}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing Org Tree endpoints against localhost:4000...');
  try {
    const summary = await request('/hr/organization/tree/summary');
    console.log('Summary response status:', summary.statusCode);
    console.log('Summary data:', summary.data);

    const employees = await request('/hr/organization/tree/employees?includeInactive=true');
    console.log('Employees tree response status:', employees.statusCode);
    if (employees.data?.data) {
      console.log('OrgChart top nodes:', employees.data.data.orgChart?.length);
      console.log('Unassigned nodes:', employees.data.data.unassigned?.length);
      console.log('Total returned:', employees.data.data.totalEmployees);
    }

    const depts = await request('/hr/organization/tree/departments');
    console.log('Departments tree response status:', depts.statusCode);
    if (depts.data?.data) {
      console.log('Departments count:', depts.data.data.departments?.length);
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

run();

