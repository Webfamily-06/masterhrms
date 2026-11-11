const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const templates = await prisma.certificateTemplate.findMany({
    select: { id: true, name: true, category: true }
  });
  const categories = [...new Set(templates.map(t => t.category))];
  categories.forEach(cat => {
    const t = templates.find(item => item.category === cat);
    console.log(`"${cat}" -> ID: "${t.id}" | Name: "${t.name}"`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());

