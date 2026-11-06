const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%session%' OR table_name LIKE '%device%')"
  );
  console.log("Matching tables in public schema:", tables);
}

main().finally(() => prisma.$disconnect());

