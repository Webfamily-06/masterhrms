const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function audit() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('MASTERHRMS CERTIFICATE STUDIO PRODUCTION AUDIT: DATA & INTEGRITY');
  console.log('══════════════════════════════════════════════════════════════════\n');

  // 1. Template Count
  const templateCount = await prisma.certificateTemplate.count();
  console.log(`[1] Total Certificate Templates in DB: ${templateCount}`);

  // 2. Published & Draft Versions
  const publishedTemplates = await prisma.certificateTemplate.count({
    where: { status: 'PUBLISHED' }
  });
  const draftTemplates = await prisma.certificateTemplate.count({
    where: { status: 'DRAFT' }
  });
  const versionCount = await prisma.certificateTemplateVersion.count();
  console.log(`[2] Published Templates: ${publishedTemplates}, Draft Templates: ${draftTemplates}, Total Immutable Versions: ${versionCount}`);

  // 3. Historical Certificates
  const certificateCount = await prisma.employeeAwardCertificate.count();
  const auditLogsCount = await prisma.certificateAuditLog.count();
  console.log(`[3] Total Issued Historical Certificates: ${certificateCount}, Total Certificate Audit Logs: ${auditLogsCount}`);

  // 4. Branding Assets (Logos, Seals, Signatures, Backgrounds)
  const brandingAssetCount = await prisma.organizationBrandingAsset.count();
  const signatoriesCount = await prisma.organizationSignatory.count();
  console.log(`[4] Branding Assets: ${brandingAssetCount}, Registered Signatories: ${signatoriesCount}`);

  // 5. Tenant Isolation Verification
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`[5] Active Tenants: ${tenants.length}`);
  for (const t of tenants) {
    const tTemplates = await prisma.certificateTemplate.count({ where: { tenantId: t.id } });
    console.log(`    - Tenant "${t.name}" (${t.id}): ${tTemplates} templates`);
  }

  // 6. Inspect Sample Template Elements Structure
  const sampleTemplate = await prisma.certificateTemplate.findFirst({
    where: { versions: { some: {} } },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });
  if (sampleTemplate && sampleTemplate.versions[0]) {
    const dj = sampleTemplate.versions[0].designJson;
    const parsed = typeof dj === 'string' ? JSON.parse(dj) : dj;
    console.log(`[6] Verified Template Snapshot ID "${sampleTemplate.id}":`);
    console.log(`    - Version: ${sampleTemplate.versions[0].versionNumber}`);
    console.log(`    - Elements count: ${parsed?.elements?.length || 0}`);
    console.log(`    - Orientation: ${sampleTemplate.orientation}`);
    console.log(`    - Status: ${sampleTemplate.status}`);
  }

  await prisma.$disconnect();
}

audit().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
