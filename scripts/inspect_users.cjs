require('dotenv').config({ path: './server/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        isSuperAdmin: true,
        isActive: true,
        tenantId: true,
      },
      take: 20
    });
    console.log("DB Users count:", users.length);
    console.log(JSON.stringify(users, null, 2));

    const companies = await prisma.company.findMany({
      select: { id: true, name: true, domain: true },
      take: 5
    });
    console.log("Companies:", JSON.stringify(companies, null, 2));
  } catch (err) {
    console.error("Error connecting to DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

