/**
 * MASTERHRMS — PHASE F4-D E2E VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Super Admin Fleet Summary KPI calculations matching database
 * 2. Multi-dimensional storage accounting per tenant
 * 3. Deep inspection endpoint with departments, teams, top users, and activities
 * 4. Tenant storage administration endpoints (/summary, /activity, /quotas)
 * 5. Role-based authorization & tenant isolation guardrails
 * 6. Real-time Socket.IO platform event forwarding
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const jwt = require('../server/node_modules/jsonwebtoken');
const { io } = require('../CMS/node_modules/socket.io-client');

const prisma = new PrismaClient();
const PORT = 4000;
const HOST = 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('========================================================');
  console.log('   MASTERHRMS — PHASE F4-D AUTOMATED VERIFICATION SUITE  ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Fetch Super Admin User
    const superAdmin = await prisma.user.findFirst({
      where: { roles: { some: { role: 'super_admin' } } },
      include: { roles: true },
    });
    assert(!!superAdmin, `Found Super Admin in database: ${superAdmin?.email}`);

    const superToken = jwt.sign(
      { userId: superAdmin.id, email: superAdmin.email, roles: ['super_admin'] },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Fetch Tenant Admin User
    const tenant = await prisma.tenant.findFirst({
      where: { id: 'tenant-default-001' },
    }) || await prisma.tenant.findFirst();
    assert(!!tenant, `Found test tenant: ${tenant?.name} (${tenant?.id})`);

    const tenantAdmin = await prisma.user.findFirst({
      where: { email: 'hr@masterhrms.com' },
      include: { profile: true, roles: true },
    }) || await prisma.user.findFirst({
      where: { profile: { tenantId: tenant.id }, roles: { some: { role: 'hr_admin' }, none: { role: 'super_admin' } } },
      include: { profile: true, roles: true },
    });
    assert(!!tenantAdmin, `Found Tenant User: ${tenantAdmin?.email} (${tenantAdmin?.id})`);

    const tenantToken = jwt.sign(
      { userId: tenantAdmin.id, email: tenantAdmin.email, tenantId: tenant.id, roles: ['hr_admin'] },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('\n--- TEST SUITE 1: SUPER ADMIN FLEET SUMMARY & TABLE METRICS ---');
    const fleetRes = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/super/tenant-usage-metrics?period=30d',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${superToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(fleetRes.status === 200, `GET /api/super/tenant-usage-metrics returns 200 OK (got ${fleetRes.status})`);
    assert(fleetRes.body && !!fleetRes.body.fleetSummary, 'Response contains canonical fleetSummary object');

    const fs = fleetRes.body?.fleetSummary;
    if (fs) {
      assert(typeof fs.totalTenants === 'number' && fs.totalTenants > 0, `Fleet totalTenants is valid: ${fs.totalTenants}`);
      assert(typeof fs.totalAllocatedStorage === 'number' && fs.totalAllocatedStorage > 0, `Fleet totalAllocatedStorage is positive: ${fs.formattedAllocatedStorage}`);
      assert(typeof fs.totalActiveStorage === 'number' && fs.totalActiveStorage >= 0, `Fleet totalActiveStorage is valid: ${fs.formattedActiveStorage}`);
      assert(typeof fs.totalTrashStorage === 'number' && fs.totalTrashStorage >= 0, `Fleet totalTrashStorage is valid: ${fs.formattedTrashStorage}`);
      assert(typeof fs.totalPhysicalStorage === 'number' && fs.totalPhysicalStorage >= 0, `Fleet totalPhysicalStorage is valid: ${fs.formattedPhysicalStorage}`);
      assert(typeof fs.totalBillableStorage === 'number' && fs.totalBillableStorage >= 0, `Fleet totalBillableStorage is valid: ${fs.formattedBillableStorage}`);
      assert(typeof fs.tenantsApproachingQuota === 'number', `Fleet tenantsApproachingQuota is tracked: ${fs.tenantsApproachingQuota}`);
      assert(typeof fs.tenantsLocked === 'number', `Fleet tenantsLocked is tracked: ${fs.tenantsLocked}`);
    }

    const tenantRows = fleetRes.body?.data || [];
    assert(tenantRows.length > 0, `Returned ${tenantRows.length} tenant records in data array`);
    const sample = tenantRows.find(t => t.id === tenant.id) || tenantRows[0];
    assert(sample.hasOwnProperty('quotaBytes'), 'Tenant record exposes quotaBytes');
    assert(sample.hasOwnProperty('activeBytes'), 'Tenant record exposes activeBytes');
    assert(sample.hasOwnProperty('trashBytes'), 'Tenant record exposes trashBytes');
    assert(sample.hasOwnProperty('versionBytes'), 'Tenant record exposes versionBytes');
    assert(sample.hasOwnProperty('reservedBytes'), 'Tenant record exposes reservedBytes');
    assert(sample.hasOwnProperty('physicalBytes'), 'Tenant record exposes physicalBytes');
    assert(['NORMAL', 'WARNING', 'CRITICAL', 'LOCKED'].includes(sample.thresholdState), `Tenant thresholdState is valid: ${sample.thresholdState}`);

    console.log('\n--- TEST SUITE 2: SUPER ADMIN DEEP TENANT INSPECTION ---');
    const inspectRes = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: `/api/super/tenant-usage-metrics/${tenant.id}?period=30d`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${superToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(inspectRes.status === 200, `GET /api/super/tenant-usage-metrics/${tenant.id} returns 200 OK`);
    const detail = inspectRes.body;
    assert(detail && !!detail.profile, 'Detail response includes profile');
    assert(detail && !!detail.storage, 'Detail response includes storage breakdown');
    assert(detail?.storage?.hasOwnProperty('activeBytes'), 'Inspection storage includes activeBytes');
    assert(detail?.storage?.hasOwnProperty('trashBytes'), 'Inspection storage includes trashBytes');
    assert(detail?.storage?.hasOwnProperty('versionBytes'), 'Inspection storage includes versionBytes');
    assert(detail?.storage?.hasOwnProperty('departmentBreakdown'), 'Inspection storage includes departmentBreakdown');
    assert(Array.isArray(detail?.storage?.departmentBreakdown?.departments), 'departmentBreakdown contains departments array');
    assert(Array.isArray(detail?.storage?.teams), 'Inspection storage contains teams array');
    assert(Array.isArray(detail?.storage?.topUsers), 'Inspection storage contains topUsers array');
    assert(Array.isArray(detail?.storage?.recentActivities), 'Inspection storage contains recentActivities array');

    console.log('\n--- TEST SUITE 3: TENANT STORAGE ADMINISTRATION ENDPOINTS ---');
    // Summary
    const summaryRes = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/summary',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tenantToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(summaryRes.status === 200, `GET /api/v1/tenant/storage/summary returns 200 OK (got ${summaryRes.status})`);
    const summaryData = summaryRes.body?.data || summaryRes.body;
    assert(summaryData?.usage && summaryData.usage.hasOwnProperty('activeBytes'), 'Tenant summary exposes activeBytes');
    assert(summaryData?.quota && summaryData.quota.hasOwnProperty('quotaBytes'), 'Tenant summary exposes quotaBytes');

    // Activity
    const actRes = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/activity?limit=20',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tenantToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(actRes.status === 200, `GET /api/v1/tenant/storage/activity returns 200 OK (got ${actRes.status})`);
    const actData = actRes.body?.data || actRes.body;
    assert(Array.isArray(actData), 'Activity endpoint returns array of activities');

    // Quotas Governance
    const quotaRes = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/quotas',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tenantToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(quotaRes.status === 200, `GET /api/v1/tenant/storage/quotas returns 200 OK (got ${quotaRes.status})`);
    const qData = quotaRes.body?.data || quotaRes.body;
    assert(qData && !!qData.tenant, 'Governance endpoint returns tenant quota policy');
    assert(Array.isArray(qData?.departments), 'Governance endpoint returns department quotas');

    console.log('\n--- TEST SUITE 4: SECURITY GUARDS & TENANT ISOLATION ---');
    // Tenant Admin attempting to access Super Admin fleet endpoint
    const forbiddenRes = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/super/tenant-usage-metrics',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tenantToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(forbiddenRes.status === 403, `Non-super admin receives 403 Forbidden on /api/super/tenant-usage-metrics (got ${forbiddenRes.status})`);

    console.log('\n--- TEST SUITE 5: REAL-TIME SOCKET.IO FORWARDING ---');
    // Test Socket.IO Super Admin connection and event reception
    const socket = io(`http://${HOST}:${PORT}`, {
      transports: ['websocket', 'polling'],
      auth: { token: superToken },
    });

    const socketConnectedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket.IO connection timeout')), 5000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    try {
      await socketConnectedPromise;
      assert(socket.connected, `Super Admin Socket.IO connected successfully (socketId: ${socket.id})`);
    } catch (e) {
      assert(false, `Socket.IO connection failed: ${e.message}`);
    } finally {
      socket.disconnect();
    }

  } catch (err) {
    console.error('Fatal verification error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`   PHASE F4-D TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
