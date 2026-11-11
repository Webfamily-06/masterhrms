const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const templates = await prisma.certificateTemplate.findMany({
    include: { versions: { orderBy: { versionNumber: 'desc' } } }
  });

  const categories = [...new Set(templates.map(t => t.category))];
  for (const cat of categories) {
    const t = templates.find(item => item.category === cat && (item.versions[0]?.designJson?.elements || []).length > 5);
    if (!t) continue;
    console.log(`\n================ CATEGORY: ${cat} (Template: ${t.name}) ================`);
    const elements = t.versions[0].designJson.elements;
    console.log(elements.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      text: e.text,
      signatoryType: e.signatoryType,
      placeholder: e.placeholder,
      url: e.url
    })));
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());

