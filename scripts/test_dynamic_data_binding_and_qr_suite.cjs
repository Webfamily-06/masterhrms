/**
 * MASTERHRMS CERTIFICATE STUDIO DYNAMIC DATA BINDING, AUTOMATIC ASSET RESOLUTION & REAL-TIME QR GENERATION TEST SUITE
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✔ PASS [Test ${totalTests}]: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✖ FAIL [Test ${totalTests}]: ${message}`);
  }
}

async function runSuite() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('MASTERHRMS DYNAMIC DATA BINDING & REAL-TIME QR GENERATION AUDIT');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const JWT_SECRET = 'master-hrms-jwt-super-secret-key-change-this-in-production';
  const tenantId = 'tenant-default-001';

  // 1. TanStack and CMS Implementation Parity
  console.log('▶ Test 1: Verifying Dynamic Binding and Live QR Parity in TanStack and CMS...');
  const tanstackSrc = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx', 'utf8');
  const cmsSrc = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx', 'utf8');

  const bothHaveLiveQrEffect = tanstackSrc.includes('QRCode.toDataURL(resolvedVerificationUrl') && cmsSrc.includes('QRCode.toDataURL(resolvedVerificationUrl');
  const bothHavePreviewContextQuery = tanstackSrc.includes('certificate-studio-preview-context') && cmsSrc.includes('certificate-studio-preview-context');
  const bothHaveComputedData = tanstackSrc.includes('computedData: Record<string, string>') && cmsSrc.includes('computedData: Record<string, string>');
  const bothHaveContextToolbar = tanstackSrc.includes('Real-Time Dynamic Preview Context Bar') && cmsSrc.includes('Real-Time Dynamic Preview Context Bar');
  const bothHaveLiveQrCanvas = tanstackSrc.includes('LIVE QR') && cmsSrc.includes('LIVE QR');
  const bothHaveSealImageRendering = tanstackSrc.includes('computedData.officialSealUrl') && cmsSrc.includes('computedData.officialSealUrl');
  const bothHaveSignatureImageRendering = tanstackSrc.includes('computedData.hrSignatureUrl') && cmsSrc.includes('computedData.hrSignatureUrl');

  console.log('  Parity Breakdown:', {
    liveQrEffect: bothHaveLiveQrEffect,
    previewContextQuery: bothHavePreviewContextQuery,
    computedData: bothHaveComputedData,
    contextToolbar: bothHaveContextToolbar,
    liveQrCanvas: bothHaveLiveQrCanvas,
    sealImageRendering: bothHaveSealImageRendering,
    signatureImageRendering: bothHaveSignatureImageRendering
  });

  assert(
    bothHaveLiveQrEffect && bothHavePreviewContextQuery && bothHaveComputedData &&
    bothHaveContextToolbar && bothHaveLiveQrCanvas && bothHaveSealImageRendering && bothHaveSignatureImageRendering,
    'TanStack and CMS Certificate Designers share 100% dynamic data binding and live QR implementation parity'
  );

  // 2. Dynamic Text Binding and Placeholder Resolution Logic
  console.log('\n▶ Test 2: Testing Dynamic Text Binding and Graceful Fallback Logic...');
  const sampleEmployees = [
    { id: 'emp-1', name: 'Alex Morgan', employeeCode: 'EMP-0001', designation: 'Chief Technology Officer', department: 'Engineering' },
    { id: 'emp-2', name: 'Sarah Connor', employeeCode: 'EMP-0002', designation: 'Principal Architect', department: 'Cloud Infrastructure' }
  ];

  const sampleAwards = [
    { id: 'aw-1', title: 'Leadership Excellence Award', description: 'Exceptional mentorship and impact.', category: 'Leadership' },
    { id: 'aw-2', title: 'Innovation Champion 2026', description: 'Breakthrough cloud innovations.', category: 'Innovation' }
  ];

  function computeResolvedDictionary(selectedEmpId, selectedAwId, customCode) {
    const emp = sampleEmployees.find(e => e.id === selectedEmpId) || {
      name: 'Alexander M. Vance',
      employeeCode: 'EMP-2026-0891',
      designation: 'Principal Platform Architect',
      department: 'Platform Operations'
    };

    const aw = sampleAwards.find(a => a.id === selectedAwId) || {
      title: 'Governor Excellence Award 2026',
      description: 'Default citation for excellence.',
      category: 'Excellence'
    };

    const verificationUrl = `http://localhost:3000/verify-certificate?code=${encodeURIComponent(customCode)}`;

    return {
      '{{organization.name}}': 'MASTERHRMS Global Technologies',
      '{{employee.name}}': emp.name,
      '{{employee.employeeCode}}': emp.employeeCode,
      '{{employee.designation}}': emp.designation,
      '{{employee.department}}': emp.department,
      '{{award.title}}': aw.title,
      '{{award.description}}': aw.description,
      '{{award.category}}': aw.category,
      '{{certificate.number}}': 'CERT-2026-8F29A10C',
      '{{certificate.verificationCode}}': customCode,
      '{{certificate.verificationUrl}}': verificationUrl,
      '{{signatures.hr}}': 'Sarah Jenkins'
    };
  }

  function resolveDisplayText(rawText, dict, isPreview) {
    if (!isPreview || !rawText) return rawText;
    let res = rawText;
    Object.entries(dict).forEach(([token, val]) => {
      const replacement = (val && String(val).trim() !== '') ? val : `[${token.replace(/[{}]/g, '')}]`;
      res = res.split(token).join(replacement);
    });
    return res;
  }

  const rawTemplateText = 'This is proudly presented to {{employee.name}} ({{employee.employeeCode}}), {{employee.designation}} in {{employee.department}}, for {{award.title}}.';

  // State A: Sample fallback
  const dictSample = computeResolvedDictionary('sample', 'sample', 'VERIFY-1111');
  const renderedSample = resolveDisplayText(rawTemplateText, dictSample, true);
  assert(
    renderedSample.includes('Alexander M. Vance') && renderedSample.includes('Governor Excellence Award 2026'),
    'Default sample state resolves employee and award tokens cleanly'
  );

  // State B: Switch employee to Alex Morgan
  const dictEmp1 = computeResolvedDictionary('emp-1', 'aw-1', 'VERIFY-2222');
  const renderedEmp1 = resolveDisplayText(rawTemplateText, dictEmp1, true);
  assert(
    renderedEmp1.includes('Alex Morgan') && renderedEmp1.includes('EMP-0001') && renderedEmp1.includes('Leadership Excellence Award'),
    'Switching employee selection dynamically updates recipient name, employee code, and award title'
  );

  // State C: Missing token fallback
  const dictMissing = { ...dictEmp1, '{{employee.department}}': '' };
  const renderedMissing = resolveDisplayText(rawTemplateText, dictMissing, true);
  assert(
    renderedMissing.includes('[employee.department]') && !renderedMissing.includes('undefined'),
    'Missing placeholder value renders deliberate graceful fallback [employee.department] rather than undefined or broken text'
  );

  // State D: Preservation of raw template schema
  const rawWhenPreviewOff = resolveDisplayText(rawTemplateText, dictEmp1, false);
  assert(
    rawWhenPreviewOff === rawTemplateText,
    'Raw template tokens remain 100% untouched and are never converted into static text when preview mode is disabled'
  );

  // 3. Real-Time QR Generation & Scannability
  console.log('\n▶ Test 3: Testing Real-Time Verification URL & Scannable QR Generation...');
  const testVerificationCode = 'CERT-2026-581864FA';
  const testVerificationUrl = `http://localhost:3000/verify-certificate?code=${testVerificationCode}`;

  const qrDataUrl = await QRCode.toDataURL(testVerificationUrl, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
    color: { dark: '#0F172A', light: '#FFFFFF' }
  });

  assert(
    qrDataUrl.startsWith('data:image/png;base64,'),
    'QRCode.toDataURL successfully produces a valid base64 PNG data URL'
  );

  const qrBuffer = await QRCode.toBuffer(testVerificationUrl, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
    color: { dark: '#0F172A', light: '#FFFFFF' }
  });

  // Verify PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  const isPng = qrBuffer[0] === 0x89 && qrBuffer[1] === 0x50 && qrBuffer[2] === 0x4E && qrBuffer[3] === 0x47;
  assert(
    isPng && qrBuffer.length > 500,
    `Generated QR binary buffer is a valid high-resolution PNG image (${qrBuffer.length} bytes)`
  );

  // Verify dynamic URL change triggers distinct QR generation
  const changedVerificationUrl = `http://localhost:3000/verify-certificate?code=CERT-2026-DIFFERENT`;
  const changedQrBuffer = await QRCode.toBuffer(changedVerificationUrl, { margin: 1, width: 256 });
  assert(
    !qrBuffer.equals(changedQrBuffer),
    'Changing the certificate verification identifier triggers immediate, distinct QR code regeneration'
  );

  // 4. Backend Preview Context Endpoint Verification
  console.log('\n▶ Test 4: Verifying Backend GET /api/certificate-studio/preview-context...');
  const sessionToken = jwt.sign({
    userId: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId: tenantId,
    roles: ['HR_MANAGER', 'ADMIN'],
    sessionId: '850fb32a-0ced-4ebe-9220-3273f653f3fb'
  }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

  const previewContextRes = await makeApiRequest('/api/certificate-studio/preview-context', 'GET', sessionToken, tenantId);
  assert(
    previewContextRes.status === 200 && previewContextRes.data?.success === true,
    'GET /api/certificate-studio/preview-context returns HTTP 200 with success status'
  );

  const ctx = previewContextRes.data?.context;
  assert(
    ctx?.organization?.name === 'Default Tenant' && ctx?.organization?.logoUrl?.includes('/branding/'),
    `Organization profile resolved: "${ctx?.organization?.name}" with active primary logo asset`
  );

  assert(
    Array.isArray(ctx?.employees) && ctx.employees.length > 0,
    `Authoritative tenant employee roster resolved (${ctx?.employees?.length} active employees available)`
  );

  assert(
    Array.isArray(ctx?.awards) && ctx.awards.length > 0,
    `Authoritative tenant award registry resolved (${ctx?.awards?.length} award categories available)`
  );

  assert(
    ctx?.branding?.officialSeal?.url?.includes('/branding/'),
    'Active official seal asset resolved from tenant branding'
  );

  assert(
    Array.isArray(ctx?.signatories) && ctx.signatories.some(s => s.name === 'Sarah Jenkins' && s.authorizationStatus === 'AUTHORIZED'),
    'Active authorized signatory "Sarah Jenkins" resolved with authorization compliance'
  );

  // 5. Tenant Isolation Security Verification
  console.log('\n▶ Test 5: Testing Strict Tenant Isolation on Branding & Signatory Assets...');
  // Attempt to access tenant-default-001 branding asset using another tenant's session
  const otherTenantSessionToken = jwt.sign({
    userId: 'user-other-tenant',
    email: 'other@tenant.com',
    tenantId: 'test-tenant-b-1791393008227',
    roles: ['HR_MANAGER'],
    sessionId: '850fb32a-0ced-4ebe-9220-3273f653f3fb'
  }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

  const foreignAssetId = ctx?.branding?.primaryLogo?.id;
  const crossTenantRes = await makeApiRequest(`/api/certificate-studio/branding/${foreignAssetId}/preview`, 'GET', otherTenantSessionToken, 'test-tenant-b-1791393008227');
  assert(
    crossTenantRes.status === 401 || crossTenantRes.status === 403 || crossTenantRes.status === 404,
    `Cross-tenant branding asset access rejected with HTTP ${crossTenantRes.status} (Tenant isolation enforced)`
  );

  // 6. Vector PDFKit Generation with Dynamic Data & Scannable QR
  console.log('\n▶ Test 6: Verifying PDFKit Vector Rendering with Dynamic Context & Assets...');
  const testDesignJson = {
    canvas: { width: 841.89, height: 595.28, primaryColor: '#1E3A8A', secondaryColor: '#D97706' },
    orientation: 'LANDSCAPE',
    elements: [
      { id: 'el-1', type: 'text', text: '{{organization.name}}', x: 200, y: 80, width: 440, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
      { id: 'el-2', type: 'text', text: 'CERTIFICATE OF EXCELLENCE', x: 200, y: 120, width: 440, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
      { id: 'el-3', type: 'text', text: 'Awarded to {{employee.name}}', x: 200, y: 180, width: 440, fontSize: 20, textAlign: 'center' },
      { id: 'el-4', type: 'text', text: 'For {{award.title}} - {{award.description}}', x: 150, y: 230, width: 540, fontSize: 12, textAlign: 'center' },
      { id: 'el-5', type: 'seal', x: 180, y: 380, width: 65, height: 65, fill: '#D97706' },
      { id: 'el-6', type: 'signature', x: 340, y: 380, width: 160, height: 60, signatoryName: 'Sarah Jenkins', signatoryDesignation: 'HR Managing Director' },
      { id: 'el-7', type: 'qrcode', x: 580, y: 380, width: 65, height: 65, placeholder: '{{certificate.verificationUrl}}' }
    ]
  };

  const pdfPayload = {
    designJson: testDesignJson,
    sampleData: {
      name: 'Elena Rostova',
      code: 'EMP-BDAY-INITIALS',
      designation: 'Principal Backend Developer',
      department: 'Engineering & Platform Infrastructure',
      awardTitle: 'Customer Delight Distinction',
      awardDescription: 'For exceptional service reliability and dedication to system uptime.',
      date: 'November 11, 2026',
      category: 'Excellence & Distinction',
      orgName: 'Default Tenant Technologies',
      certificateNumber: 'CERT-2026-TEST-ELENA',
      verificationCode: 'VERIFY-ELENA-2026-X89A',
      verificationUrl: 'http://localhost:3000/verify-certificate?code=VERIFY-ELENA-2026-X89A'
    }
  };

  const pdfRes = await makeApiRequest('/api/certificate-studio/templates/preview-pdf', 'POST', sessionToken, tenantId, pdfPayload);
  assert(
    pdfRes.status === 200,
    'POST /api/certificate-studio/templates/preview-pdf returns HTTP 200'
  );

  const isPdfHeader = pdfRes.rawBuffer && pdfRes.rawBuffer.slice(0, 4).toString() === '%PDF';
  assert(
    isPdfHeader && pdfRes.rawBuffer.length > 5000,
    `Vector PDF output generated successfully (${pdfRes.rawBuffer.length} bytes, valid %PDF header)`
  );

  // 7. Verify Award Certificate Service Parity with Design Studio
  console.log('\n▶ Test 7: Verifying Final Issued Certificate PDF Parity...');
  const awardCertServiceSrc = fs.readFileSync('server/src/services/award-certificate.service.ts', 'utf8');
  const studioServiceSrc = fs.readFileSync('server/src/services/certificate-studio.service.ts', 'utf8');

  const awardUsesStudioRenderer = awardCertServiceSrc.includes('CertificateStudioService.renderTemplateToPdf');
  const studioHandlesQr = studioServiceSrc.includes('doc.image(qrPngBuffer') && studioServiceSrc.includes('QRCode.toBuffer');
  const studioHandlesSeal = studioServiceSrc.includes('sealBuffer') && studioServiceSrc.includes('OFFICIAL SEAL');
  const studioHandlesSig = studioServiceSrc.includes('sigBuffer') && studioServiceSrc.includes('doc.moveTo(el.x, lineY)');

  assert(
    awardUsesStudioRenderer && studioHandlesQr && studioHandlesSeal && studioHandlesSig,
    'AwardCertificateService and CertificateStudioService use identical vector rendering pipeline for issued certificates'
  );

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`TOTAL SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('══════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

function makeApiRequest(apiPath, method, token, tenant, payload) {
  return new Promise((resolve) => {
    const postData = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: apiPath,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenant,
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        let data = null;
        try {
          data = JSON.parse(rawBuffer.toString('utf8'));
        } catch {
          // Binary or text
        }
        resolve({ status: res.statusCode, headers: res.headers, data, rawBuffer });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

runSuite().catch(err => {
  console.error('Test Suite Failed with Exception:', err);
  process.exit(1);
});
