const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const templates = await prisma.certificateTemplate.findMany({
    include: {
      versions: { orderBy: { versionNumber: 'desc' } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Auditing ${templates.length} templates...\n`);

  const categoryStats = {};
  const issues = [];

  templates.forEach((t, i) => {
    const cat = t.category || 'Uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = {
        total: 0,
        hasEmployee: 0,
        hasAward: 0,
        hasOrg: 0,
        hasQr: 0,
        hasLogo: 0,
        hasSeal: 0,
        hasSig: 0,
        templates: []
      };
    }

    const stat = categoryStats[cat];
    stat.total++;

    const version = t.versions?.[0];
    if (!version || !version.designJson) {
      issues.push({ id: t.id, name: t.name, issue: 'No version or designJson' });
      return;
    }

    const elements = version.designJson.elements || [];
    let hasEmp = false;
    let hasAward = false;
    let hasOrg = false;
    let hasQr = false;
    let hasLogo = false;
    let hasSeal = false;
    let hasSig = false;

    elements.forEach(el => {
      if (el.type === 'text') {
        const txt = el.text || '';
        if (txt.includes('{{employee.name}}')) hasEmp = true;
        if (txt.includes('{{award.title}}') || txt.includes('{{award.name}}')) hasAward = true;
        if (txt.includes('{{organization.name}}')) hasOrg = true;
      }
      if (el.type === 'qrcode') hasQr = true;
      if (el.type === 'logo' || el.isLogo || el.id?.includes('logo')) hasLogo = true;
      if (el.type === 'seal' || el.isSeal || el.id?.includes('seal')) hasSeal = true;
      if (el.type === 'signature' || el.id?.includes('sig')) hasSig = true;
    });

    if (hasEmp) stat.hasEmployee++;
    if (hasAward) stat.hasAward++;
    if (hasOrg) stat.hasOrg++;
    if (hasQr) stat.hasQr++;
    if (hasLogo) stat.hasLogo++;
    if (hasSeal) stat.hasSeal++;
    if (hasSig) stat.hasSig++;

    stat.templates.push({
      id: t.id,
      name: t.name,
      hasEmp,
      hasAward,
      hasOrg,
      hasQr,
      hasLogo,
      hasSeal,
      hasSig,
      elementCount: elements.length
    });
  });

  console.log('--- CATEGORY BREAKDOWN ---');
  for (const [cat, data] of Object.entries(categoryStats)) {
    console.log(`\nCategory: "${cat}" (Total: ${data.total})`);
    console.log(`  - With Employee: ${data.hasEmployee} / ${data.total}`);
    console.log(`  - With Award:    ${data.hasAward} / ${data.total}`);
    console.log(`  - With Org:      ${data.hasOrg} / ${data.total}`);
    console.log(`  - With QR:       ${data.hasQr} / ${data.total}`);
    console.log(`  - With Logo:     ${data.hasLogo} / ${data.total}`);
    console.log(`  - With Seal:     ${data.hasSeal} / ${data.total}`);
    console.log(`  - With Sig:      ${data.hasSig} / ${data.total}`);
  }

  console.log('\n--- TEMPLATES WITHOUT VERSIONS ---');
  console.log(issues);
}

run().finally(() => prisma['$disconnect'] && prisma['$disconnect']());

