const http = require('http');

async function testEndpoint(port, path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- API FOUNDATION VERIFICATION ---');

  const routes = [
    { name: 'GET /api/auth/me (Legacy Auth)', path: '/api/auth/me', expected: 401 },
    { name: 'GET /api/employees (Legacy Route)', path: '/api/employees', expected: 401 },
    { name: 'GET /api/attendance (Legacy Route)', path: '/api/attendance', expected: 401 },
    { name: 'GET /api/leaves (Legacy Route)', path: '/api/leaves', expected: 401 },
    { name: 'GET /api/v1/shared/events (P1 Realtime Catchup)', path: '/api/v1/shared/events', expected: 401 },
    { name: 'GET /api/v1/shared/notifications (P1 Notifications)', path: '/api/v1/shared/notifications', expected: 401 },
    { name: 'GET /api/v1/hr/workflows (P1 Workflows)', path: '/api/v1/hr/workflows', expected: 401 },
    { name: 'GET /api/v1/hr/approvals (P1 Approval Inbox)', path: '/api/v1/hr/approvals', expected: 401 },
    { name: 'GET /api/v1/me/approvals (P1 My Approvals)', path: '/api/v1/me/approvals', expected: 401 },
    { name: 'GET /api/v1/hr/masters/departments (P1 Master Blueprint)', path: '/api/v1/hr/masters/departments', expected: 401 },
    { name: 'GET /api/v1/hr/masters/branches (P1 Master Blueprint)', path: '/api/v1/hr/masters/branches', expected: 401 },
  ];

  let passed = 0;
  for (const r of routes) {
    try {
      const res = await testEndpoint(4000, r.path);
      const ok = res.status === r.expected;
      if (ok) passed++;
      console.log(`[${ok ? 'PASS' : 'FAIL'}] ${r.name}: Status ${res.status} (expected ${r.expected})`);
    } catch (err) {
      console.log(`[ERROR] ${r.name}: ${err.message}`);
    }
  }

  console.log(`\nResult: ${passed}/${routes.length} endpoints verified.`);
}

run();
