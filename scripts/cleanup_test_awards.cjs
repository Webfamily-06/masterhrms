const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  const deletedAwards = await prisma.award.deleteMany({
    where: {
      OR: [
        { giftItem: { startsWith: 'Excellence Badge' } },
        { giftItem: { startsWith: 'Presidential' } },
        { awardType: { name: { startsWith: 'Presidential' } } },
      ],
    },
  });
  console.log('Cleaned up test awards:', deletedAwards.count);

  const deletedTypes = await prisma.awardType.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'Excellence Badge' } },
        { name: { startsWith: 'Presidential' } },
      ],
    },
  });
  console.log('Cleaned up test award types:', deletedTypes.count);

  await prisma.$disconnect();
}

cleanup();
