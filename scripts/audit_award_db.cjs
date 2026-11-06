const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const awardTypes = await prisma.awardType.findMany();
    console.log('=== Current award_types rows ===');
    console.log(JSON.stringify(awardTypes, null, 2));

    const awards = await prisma.award.findMany({
      include: {
        awardType: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
      }
    });
    console.log('=== Current employee_awards rows ===');
    console.log(JSON.stringify(awards, null, 2));
  } catch (err) {
    console.error('Error during audit:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
