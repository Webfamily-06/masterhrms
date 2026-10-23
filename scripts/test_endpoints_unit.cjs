const path = require('path');
const jwt = require(path.join(process.cwd(), 'server/node_modules/jsonwebtoken'));
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';

function generateToken(userId, tenantId, email, roles = ['hr_admin']) {
  return jwt.sign(
    { userId, id: userId, tenantId, email, roles },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method: options.method || 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('=== TESTING CALENDAR ENHANCEMENTS BACKEND ===\n');

  // 1. Test eligible-recipients endpoint
  const hrToken = generateToken('user-hr-001', 'tenant-default-001', 'hr@masterhrms.com');
  console.log('[1] Testing GET /api/calendar/eligible-recipients for tenant-default-001...');
  const res1 = await request('/api/calendar/eligible-recipients', {
    headers: { 'Authorization': `Bearer ${hrToken}` }
  });
  console.log('Status:', res1.status);
  console.log('Recipients found:', res1.data?.data?.length);
  const sample = res1.data?.data?.slice(0, 3);
  console.log('Sample recipients:', JSON.stringify(sample, null, 2));

  // Check search filter ?q=Alex
  console.log('\n[2] Testing GET /api/calendar/eligible-recipients?q=Alex...');
  const res2 = await request('/api/calendar/eligible-recipients?q=Alex', {
    headers: { 'Authorization': `Bearer ${hrToken}` }
  });
  console.log('Status:', res2.status);
  console.log('Alex search results:', JSON.stringify(res2.data?.data, null, 2));

  // 3. Test cross-tenant isolation on eligible-recipients
  console.log('\n[3] Testing eligible-recipients tenant isolation (tenant B)...');
  const tenantBToken = generateToken('user-b-001', 'tenant-isolated-xyz', 'userb@xyz.com');
  const res3 = await request('/api/calendar/eligible-recipients', {
    headers: { 'Authorization': `Bearer ${tenantBToken}` }
  });
  console.log('Status:', res3.status);
  console.log('Tenant B recipients count (should be 0 or only tenant B):', res3.data?.data?.length);

  // 4. Test Birthday projection in /hr/calendar/events
  console.log('\n[4] Testing Birthday projection via GET /api/v1/hr/calendar/events...');
  const res4 = await request('/api/v1/hr/calendar/events?startDate=2026-01-01&endDate=2026-12-31', {
    headers: { 'Authorization': `Bearer ${hrToken}` }
  });
  console.log('Status:', res4.status);
  const birthdays = (Array.isArray(res4.data) ? res4.data : []).filter(e => e.category === 'birthday');
  console.log('Total birthday events projected for 2026:', birthdays.length);
  console.log('Sample birthdays:', JSON.stringify(birthdays.slice(0, 3), null, 2));

  // 5. Check privacy: ensure no full DOB or age in birthday projections
  if (birthdays.length > 0) {
    const b = birthdays[0];
    const hasBirthYear = /19\d\d|200\d/.test(b.title) || /19\d\d|200\d/.test(b.description || '');
    console.log('Does title/desc expose birth year?:', hasBirthYear ? 'FAIL (Exposed!)' : 'PASS (Safe, only annual occurrence)');
  }
}

run().catch(console.error);
