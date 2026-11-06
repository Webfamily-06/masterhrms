const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const JWT_SECRET = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ PASS [${totalTests}]: ${message}`);
  } else {
    console.error(`  ✖ FAIL [${totalTests}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_manager', 'hr_admin'],
      permissions: user.permissions || ['*'],
      sessionId,
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

async function createTestSession(userId, tenantId) {
  const sessId = 'sess-tpl-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Template Library Test Suite',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  return sessId;
}

async function runTemplateLibrarySuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: 50+ CERTIFICATE TEMPLATE LIBRARY TEST SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let user = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  const hrSessionId = await createTestSession(user.id, tenantId);
  const hrToken = makeToken({ id: user.id, email: user.email, tenantId }, hrSessionId);

  // Other tenant user
  let otherTenant = await prisma.tenant.findFirst({ where: { id: { not: tenantId } } });
  if (!otherTenant) {
    otherTenant = await prisma.tenant.create({
      data: { id: 'tenant-tpl-isolated-' + Date.now(), name: 'Isolated Tpl Tenant', slug: 'isolated-tpl-' + Date.now() }
    });
  }
  const otherUser = await prisma.user.create({
    data: { id: 'user-tpl-' + Date.now(), email: `tpl-${Date.now()}@example.com`, passwordHash: 'hash' }
  });
  // Create employee for otherUser in otherTenant so onboarding check passes
  await prisma.employee.create({
    data: {
      id: 'emp-tpl-' + Date.now(),
      userId: otherUser.id,
      tenantId: otherTenant.id,
      employeeCode: 'EMP-TPL-' + Math.floor(Math.random() * 1000),
      firstName: 'Other',
      lastName: 'User',
      email: otherUser.email,
      status: 'active'
    }
  });
  const otherSessionId = await createTestSession(otherUser.id, otherTenant.id);
  const otherToken = makeToken({ id: otherUser.id, email: otherUser.email, tenantId: otherTenant.id }, otherSessionId);

  try {
    // 1. Total System Template Count Verification
    console.log('--- 1. 50+ Persisted Template Count Verification ---');
    const listRes = await fetch(`${BASE_URL}/certificate-studio/templates`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(listRes.status === 200, 'GET /certificate-studio/templates returns 200 OK');
    const listJson = await listRes.json();
    assert(listJson.count >= 50, `At least 50 templates exist (Found: ${listJson.count})`);

    // 2. Strict Category Distribution Verification
    console.log('\n--- 2. Required Category Distribution Verification ---');
    const categoriesMap = {};
    for (const t of listJson.templates) {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + 1;
    }

    assert(categoriesMap['Employee Appreciation'] >= 8, `Employee Appreciation >= 8 (Found: ${categoriesMap['Employee Appreciation']})`);
    assert(categoriesMap['Employee Excellence'] >= 8, `Employee Excellence >= 8 (Found: ${categoriesMap['Employee Excellence']})`);
    assert(categoriesMap['Leadership & Performance'] >= 6, `Leadership & Performance >= 6 (Found: ${categoriesMap['Leadership & Performance']})`);
    assert(categoriesMap['Long Service Recognition'] >= 6, `Long Service Recognition >= 6 (Found: ${categoriesMap['Long Service Recognition']})`);
    assert(categoriesMap['Training & Development Completion'] >= 6, `Training & Development >= 6 (Found: ${categoriesMap['Training & Development Completion']})`);
    assert(categoriesMap['Innovation & Special Recognition'] >= 6, `Innovation & Special Recognition >= 6 (Found: ${categoriesMap['Innovation & Special Recognition']})`);
    assert(categoriesMap['Team Achievement'] >= 5, `Team Achievement >= 5 (Found: ${categoriesMap['Team Achievement']})`);
    assert(categoriesMap['Corporate / Special Achievement'] >= 5, `Corporate / Special Achievement >= 5 (Found: ${categoriesMap['Corporate / Special Achievement']})`);

    // 3. Search and Filtering by Category and Orientation
    console.log('\n--- 3. Search and Category Filtering ---');
    const searchRes = await fetch(`${BASE_URL}/certificate-studio/templates?category=Employee%20Excellence`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const searchJson = await searchRes.json();
    assert(searchJson.templates.every(t => t.category === 'Employee Excellence'), 'Category filter returns only matching category templates');

    const orientRes = await fetch(`${BASE_URL}/certificate-studio/templates?orientation=PORTRAIT`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const orientJson = await orientRes.json();
    assert(orientJson.templates.length > 0 && orientJson.templates.every(t => t.orientation === 'PORTRAIT'), 'Orientation filter returns only PORTRAIT templates');

    // 4. Detail & Preview Loading
    console.log('\n--- 4. Template Detail & Design JSON Loading ---');
    const firstTpl = listJson.templates[0];
    const detailRes = await fetch(`${BASE_URL}/certificate-studio/templates/${firstTpl.id}`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(detailRes.status === 200, 'GET /certificate-studio/templates/:id returns 200');
    const detailJson = await detailRes.json();
    assert(detailJson.template.activeVersion != null, 'Active version loaded');
    assert(detailJson.template.activeVersion.designJson?.elements?.length > 0, 'Design JSON contains structured vector elements');

    // 5. System Template Immutability Guard
    console.log('\n--- 5. System Template Immutability Guard ---');
    const mutateRes = await fetch(`${BASE_URL}/certificate-studio/templates/${firstTpl.id}/save-design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ designJson: { mutated: true } })
    });
    assert(mutateRes.status === 400, 'Direct mutation of system template rejected with 400 Bad Request');

    // 6. Template Duplication to Custom Tenant Draft
    console.log('\n--- 6. Template Duplication to Custom Tenant Draft ---');
    const dupRes = await fetch(`${BASE_URL}/certificate-studio/templates/${firstTpl.id}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ customName: 'My Custom Company Award' })
    });
    assert(dupRes.status === 201, 'Duplication returns 201 Created');
    const dupJson = await dupRes.json();
    const customTemplateId = dupJson.template.id;
    assert(dupJson.template.isSystem === false, 'Duplicated template is non-system (tenant owned)');
    assert(dupJson.template.status === 'DRAFT', 'Duplicated template starts in DRAFT status');
    assert(dupJson.template.name === 'My Custom Company Award', 'Custom name assigned accurately');

    // 7. Tenant Custom Template Isolation
    console.log('\n--- 7. Tenant Custom Template Isolation ---');
    const otherTplRes = await fetch(`${BASE_URL}/certificate-studio/templates`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    const otherTplJson = await otherTplRes.json();
    const leaked = (otherTplJson.templates || []).some(t => t.id === customTemplateId);
    assert(!leaked, 'Custom template owned by Tenant A is strictly invisible to Tenant B');

    // 8. Publish Tenant Template
    console.log('\n--- 8. Publish Tenant Custom Template ---');
    const pubRes = await fetch(`${BASE_URL}/certificate-studio/templates/${customTemplateId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(pubRes.status === 200, 'POST /certificate-studio/templates/:id/publish returns 200');
    const pubJson = await pubRes.json();
    assert(pubJson.template.status === 'PUBLISHED', 'Template status updated to PUBLISHED');

    console.log('\n================================================================');
    console.log(` ALL TEMPLATE LIBRARY TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTemplateLibrarySuite();
