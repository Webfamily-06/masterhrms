const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../server/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { profile: { tenantId: 'tenant-default-001' } },
    select: { 
      id: true, 
      email: true, 
      profile: { select: { fullName: true, avatarUrl: true } },
      employees: { 
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          position: true, 
          dateOfBirth: true, 
          status: true,
          department: { select: { name: true } }
        } 
      }
    },
    take: 10
  });
  console.log('Sample Users:');
  console.log(JSON.stringify(users, null, 2));

  const allEmployees = await prisma.employee.findMany({
    where: { tenantId: 'tenant-default-001' },
    select: { 
      id: true, 
      userId: true, 
      firstName: true, 
      lastName: true, 
      email: true, 
      dateOfBirth: true, 
      status: true,
      department: { select: { name: true } }
    },
    take: 15
  });
  console.log('\nSample Employees:');
  console.log(JSON.stringify(allEmployees, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
