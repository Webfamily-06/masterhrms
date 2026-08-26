const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.update({
    where: { email: "admin@masterhrms.com" },
    data: { passwordHash: hash },
  });
  console.log("Admin password updated to 'admin123'");
}

main().finally(() => prisma.$disconnect());
