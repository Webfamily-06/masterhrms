const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  const duplicates = await prisma.$queryRawUnsafe(`
    SELECT user_id, COUNT(*) as count
    FROM employees
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1;
  `);

  console.log("Duplicate user_id in employees table:", duplicates);

  const totalEmployeesWithUser = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM employees WHERE user_id IS NOT NULL;
  `);
  console.log("Total employees with user_id:", totalEmployeesWithUser);

  const nullUserEmployees = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM employees WHERE user_id IS NULL;
  `);
  console.log("Total employees with NULL user_id:", nullUserEmployees);
}

checkDuplicates().finally(() => prisma.$disconnect());

