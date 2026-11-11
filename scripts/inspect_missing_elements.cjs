const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const templates = await prisma.certificateTemplate.findMany({
    include: { versions: { orderBy: { versionNumber: 'desc' } } }
  });

  const empty = templates.filter(t => (t.versions[0]?.designJson?.elements || []).length === 0);
  console.log(`Empty element templates (${empty.length}):`);
  empty.forEach(t => console.log(` - ${t.id} | ${t.name} (${t.category})`));

  const missingOrg = templates.filter(t => {
    const els = t.versions[0]?.designJson?.elements || [];
    return els.length > 0 && !els.some(e => (e.text || '').includes('{{organization.name}}'));
  });
  console.log(`\nMissing Org Name (${missingOrg.length}):`);
  missingOrg.forEach(t => console.log(` - ${t.id} | ${t.name} (${t.category}) [Count: ${t.versions[0]?.designJson?.elements?.length}]`));

  // Let's also inspect one of the missingOrg templates to see what elements it actually has
  if (missingOrg.length > 0) {
    console.log('\nSample elements from missingOrg template:', missingOrg[0].name);
    console.log(JSON.stringify(missingOrg[0].versions[0].designJson.elements, null, 2));
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());

