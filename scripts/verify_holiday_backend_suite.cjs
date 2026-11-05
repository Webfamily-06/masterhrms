const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: ['*']
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const hrUser = {
  id: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['hr_admin']
};
const hrToken = makeToken(hrUser);

const employeeUser = {
  id: 'user-emp-001',
  email: 'emp@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['employee']
};
const employeeToken = makeToken(employeeUser);

const BASE_URL = 'http://localhost:4000/api/v1';

async function request(url, options = {}, token = hrToken) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runSuite() {
  console.log('========================================================');
  console.log('MASTERHRMS HOLIDAY & CALENDAR BACKEND API TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. List Holiday Types
  console.log('--- Test 1: List Holiday Types ---');
  const typesRes = await request('/hr/organization/holiday-types');
  assert(typesRes.status === 200, `GET /holiday-types returns HTTP 200 (Got ${typesRes.status})`);
  assert(Array.isArray(typesRes.data?.data) && typesRes.data.data.length >= 6, `Default holiday types seeded (Count: ${typesRes.data?.data?.length})`);

  // 2. Create Custom Holiday Type
  console.log('\n--- Test 2: Create Custom Holiday Type ---');
  const typeName = `Special Jubilee ${Date.now()}`;
  const createTypeRes = await request('/hr/organization/holiday-types', {
    method: 'POST',
    body: JSON.stringify({
      name: typeName,
      description: 'Special annual corporate jubilee holiday',
      color: '#8b5cf6'
    })
  });
  assert(createTypeRes.status === 201, `POST /holiday-types created custom type (Status: ${createTypeRes.status})`);
  const createdTypeId = createTypeRes.data?.id;

  // 3. Employee Creation Rejection (RBAC)
  console.log('\n--- Test 3: Employee Mutation Rejection (RBAC) ---');
  const empCreateRes = await request('/hr/organization/holidays', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Unauthorized Holiday',
      date: '2026-12-25',
      type: 'Public Holiday'
    })
  }, employeeToken);
  assert(empCreateRes.status === 403, `Employee POST /holidays rejected with HTTP 403 (Got ${empCreateRes.status})`);

  // 4. Create Valid Holiday as HR
  console.log('\n--- Test 4: Create Valid Holiday as HR ---');
  const testDate = '2026-11-20';
  const createHolRes = await request('/hr/organization/holidays', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Founder Foundation Day',
      date: testDate,
      type: typeName,
      description: 'Annual corporate founding observance across all facilities.',
      status: 'active'
    })
  });
  assert(createHolRes.status === 201, `POST /holidays created holiday (Status: ${createHolRes.status})`);
  const holidayId = createHolRes.data?.id;
  assert(createHolRes.data?.name === 'Founder Foundation Day', 'Holiday title/name properly saved');
  assert(createHolRes.data?.year === 2026, 'Year automatically extracted and populated');

  // 5. Duplicate Date Rejection
  console.log('\n--- Test 5: Duplicate Date Validation ---');
  const dupRes = await request('/hr/organization/holidays', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Another Holiday Same Date',
      date: testDate,
      type: 'National Holiday'
    })
  });
  assert(dupRes.status === 400, `Duplicate holiday date rejected with HTTP 400 (Got ${dupRes.status})`);
  assert(dupRes.data?.error?.includes('already scheduled'), `Proper duplicate message: "${dupRes.data?.error}"`);

  // 6. Delete Holiday Type Guard (409 Conflict)
  console.log('\n--- Test 6: Holiday Type Dependency Guard (HTTP 409) ---');
  const delTypeRes = await request(`/hr/organization/holiday-types/${createdTypeId}`, {
    method: 'DELETE'
  });
  assert(delTypeRes.status === 409, `Referenced holiday type deletion blocked with HTTP 409 (Got ${delTypeRes.status})`);
  assert(delTypeRes.data?.error?.includes('assigned to'), `Helpful explanation: "${delTypeRes.data?.error}"`);

  // 7. List Holidays with Search, Status, and Custom Counts
  console.log('\n--- Test 7: List Holidays, Filters & Custom Counts ---');
  const listRes = await request('/hr/organization/holidays?status=all&year=2026');
  assert(listRes.status === 200, `GET /holidays returns HTTP 200`);
  assert(listRes.data?.total >= 1, `Total holidays >= 1 (Found: ${listRes.data?.total})`);
  assert(listRes.data?.counts?.total !== undefined, `KPI count 'total' present (${listRes.data?.counts?.total})`);
  assert(listRes.data?.counts?.active !== undefined, `KPI count 'active' present (${listRes.data?.counts?.active})`);
  assert(listRes.data?.counts?.public !== undefined, `KPI count 'public' present (${listRes.data?.counts?.public})`);
  assert(listRes.data?.counts?.optional !== undefined, `KPI count 'optional' present (${listRes.data?.counts?.optional})`);

  // 8. Calendar Projection of Active Holiday
  console.log('\n--- Test 8: Calendar Projection of Active Holiday ---');
  const calResActive = await request(`/hr/calendar/events?startDate=2026-11-01T00:00:00.000Z&endDate=2026-11-30T23:59:59.999Z`);
  assert(calResActive.status === 200, `GET /hr/calendar/events returns HTTP 200`);
  const activeProj = calResActive.data?.find(e => e.id === `holiday-${holidayId}`);
  assert(!!activeProj, `Active holiday appears in calendar events projection (Found: ${activeProj?.title})`);
  assert(activeProj?.category === 'holiday', `Event category is 'holiday'`);
  assert(activeProj?.allDay === true, `Event allDay is true`);

  // 9. De-activate Holiday (Status toggle to 'inactive')
  console.log('\n--- Test 9: De-activate Holiday (Lifecycle) ---');
  const deactRes = await request(`/hr/organization/holidays/${holidayId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'inactive' })
  });
  assert(deactRes.status === 200, `PUT /holidays/:id de-activated holiday (Status: ${deactRes.status})`);
  assert(deactRes.data?.status === 'inactive', 'Holiday status is now inactive');

  // 10. Calendar Projection Excludes Inactive Holiday
  console.log('\n--- Test 10: Inactive Holiday Removed from Calendar Projection ---');
  const calResInactive = await request(`/hr/calendar/events?startDate=2026-11-01T00:00:00.000Z&endDate=2026-11-30T23:59:59.999Z`);
  const inactiveProj = calResInactive.data?.find(e => e.id === `holiday-${holidayId}`);
  assert(!inactiveProj, `Inactive holiday correctly EXCLUDED from calendar projection`);

  // 11. Re-activate Holiday
  console.log('\n--- Test 11: Re-activate Holiday ---');
  const reactRes = await request(`/hr/organization/holidays/${holidayId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'active' })
  });
  assert(reactRes.status === 200 && reactRes.data?.status === 'active', 'Holiday successfully re-activated to active');

  // 12. Cleanup Test Holiday and Type
  console.log('\n--- Test 12: Delete Test Holiday and Unused Type ---');
  const delHolRes = await request(`/hr/organization/holidays/${holidayId}`, {
    method: 'DELETE'
  });
  assert(delHolRes.status === 200, `DELETE /holidays/:id deleted test holiday`);

  const delUnusedTypeRes = await request(`/hr/organization/holiday-types/${createdTypeId}`, {
    method: 'DELETE'
  });
  assert(delUnusedTypeRes.status === 200, `DELETE /holiday-types/:id now succeeds after unassigning`);

  console.log('\n========================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

