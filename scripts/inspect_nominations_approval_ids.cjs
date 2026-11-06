const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const nominations = await prisma.awardNomination.findMany({
    select: {
      id: true,
      nominationNumber: true,
      status: true,
      approvalRequestId: true,
      currentStep: true,
      submittedAt: true,
    },
    take: 10,
  });

  console.log("Nominations in DB:", nominations);
}

main().finally(() => prisma.$disconnect());

