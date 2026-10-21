import { prisma } from '../src/prisma';

async function run() {
  const footer = await prisma.cmsPage.findUnique({
    where: { slug: 'footer' }
  });
  console.log('Footer content:');
  console.log(JSON.stringify(footer, null, 2));
  await prisma.$disconnect();
}

run().catch(console.error);
