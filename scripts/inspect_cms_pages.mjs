import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const pages = await prisma.cmsPage.findMany({
    where: {
      NOT: [
        { slug: { startsWith: 'tenant-' } },
        { slug: { startsWith: 'system-workspace-' } },
      ]
    },
    select: { id: true, slug: true, title: true, published: true, content: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' }
  });
  console.log(`CMS / Content / Config pages: ${pages.length}`);
  pages.forEach(p => {
    console.log(`[${p.id}] ${p.slug} => "${p.title}" (published: ${p.published})`);
  });
  await prisma.$disconnect();
}

check().catch(console.error);
