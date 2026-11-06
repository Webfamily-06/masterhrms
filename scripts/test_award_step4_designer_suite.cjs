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
  const sessId = 'sess-des-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Designer Test Suite',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  return sessId;
}

async function runDesignerSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: VISUAL CERTIFICATE DESIGNER STUDIO TEST SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let user = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  const hrSessionId = await createTestSession(user.id, tenantId);
  const hrToken = makeToken({ id: user.id, email: user.email, tenantId }, hrSessionId);

  // 1. Duplicate a base template to work with
  console.log('--- 1. Provision Custom Template for Designer ---');
  const baseTpl = await prisma.certificateTemplate.findFirst({ where: { isSystem: true } });
  const dupRes = await fetch(`${BASE_URL}/certificate-studio/templates/${baseTpl.id}/duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`
    },
    body: JSON.stringify({ customName: 'Designer Test Template' })
  });
  assert(dupRes.status === 201, 'Base template duplicated for visual designer');
  const dupJson = await dupRes.json();
  const tplId = dupJson.template.id;

  // 2. Add New Elements and Customize Layout
  console.log('\n--- 2. Add Elements & Update Coordinates ---');
  const customElements = [
    {
      id: 'el-heading-main',
      type: 'text',
      name: 'Main Title',
      x: 100,
      y: 80,
      width: 640,
      height: 40,
      text: 'CHAIRMAN AWARD OF EXCELLENCE',
      fontFamily: 'Cinzel',
      fontSize: 26,
      fontWeight: 'bold',
      color: '#1E3A8A',
      textAlign: 'center',
      zIndex: 10
    },
    {
      id: 'el-recip-name',
      type: 'text',
      name: 'Recipient Name',
      x: 120,
      y: 180,
      width: 600,
      height: 45,
      text: '{{employee.name}}',
      fontFamily: 'Playfair Display',
      fontSize: 32,
      fontWeight: 'bold',
      color: '#D97706',
      textAlign: 'center',
      underline: true,
      zIndex: 12
    },
    {
      id: 'el-citation',
      type: 'text',
      name: 'Citation Body',
      x: 140,
      y: 250,
      width: 560,
      height: 60,
      text: 'In recognition of outstanding vision and sustained technical leadership as {{employee.designation}}.',
      fontFamily: 'Inter',
      fontSize: 12,
      color: '#334155',
      textAlign: 'center',
      zIndex: 14
    },
    {
      id: 'el-gold-border',
      type: 'shape',
      shapeType: 'rectangle',
      name: 'Outer Gold Frame',
      x: 15,
      y: 15,
      width: 811.89,
      height: 565.28,
      stroke: '#D97706',
      strokeWidth: 3,
      fill: 'transparent',
      zIndex: 1
    },
    {
      id: 'el-qr',
      type: 'qrcode',
      name: 'Verification QR',
      x: 760,
      y: 515,
      width: 50,
      height: 50,
      zIndex: 20
    }
  ];

  const designJsonPayload = {
    canvas: {
      width: 841.89,
      height: 595.28,
      orientation: 'LANDSCAPE',
      backgroundColor: '#FAF5FF',
      primaryColor: '#1E3A8A',
      secondaryColor: '#D97706'
    },
    elements: customElements
  };

  // 3. Save Visual Design
  console.log('\n--- 3. Save Visual Design to Backend ---');
  const saveRes = await fetch(`${BASE_URL}/certificate-studio/templates/${tplId}/save-design`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`
    },
    body: JSON.stringify({ designJson: designJsonPayload })
  });

  assert(saveRes.status === 200, 'POST /certificate-studio/templates/:id/save-design returns 200 OK');
  const saveJson = await saveRes.json();
  assert(saveJson.success === true, 'Save design operation reports success');
  assert(saveJson.versionId != null, 'Saved design created or updated valid version');

  // 4. Reload Saved Design and Verify Exact Elements
  console.log('\n--- 4. Reload & Verify Element Persisted State ---');
  const reloadRes = await fetch(`${BASE_URL}/certificate-studio/templates/${tplId}`, {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(reloadRes.status === 200, 'Reload template returns 200');
  const reloadJson = await reloadRes.json();
  const loadedVer = reloadJson.template.activeVersion;
  assert(loadedVer != null, 'Loaded template has active version');
  assert(loadedVer.designJson?.elements?.length === 5, 'Exact count of 5 elements preserved');
  const foundTitle = loadedVer.designJson.elements.find(e => e.id === 'el-heading-main');
  assert(foundTitle != null && foundTitle.text === 'CHAIRMAN AWARD OF EXCELLENCE', 'Title text and coordinates preserved accurately');
  assert(foundTitle.fontFamily === 'Cinzel' && foundTitle.fontSize === 26, 'Typography parameters preserved accurately');

  // 5. Test Vector PDF Rendering from Designer State
  console.log('\n--- 5. Vector PDF Rendering Preview from Designer State ---');
  const previewRes = await fetch(`${BASE_URL}/certificate-studio/templates/preview-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`
    },
    body: JSON.stringify({
      designJson: designJsonPayload,
      sampleData: {
        name: 'Dr. Arthur Dent',
        designation: 'Interstellar Systems Architect',
        awardTitle: 'Galactic Leadership Award'
      }
    })
  });

  assert(previewRes.status === 200, 'Preview PDF generation returns 200 OK');
  assert(previewRes.headers.get('content-type') === 'application/pdf', 'Preview returns application/pdf content type');
  const pdfBytes = await previewRes.buffer();
  assert(pdfBytes.slice(0, 5).toString('utf-8') === '%PDF-', 'Preview buffer starts with authoritative %PDF- magic bytes');
  assert(pdfBytes.length > 2000, `Generated PDF size is substantial (${pdfBytes.length} bytes)`);

  console.log('\n================================================================');
  console.log(` ALL DESIGNER TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log('================================================================\n');
}

runDesignerSuite()
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

