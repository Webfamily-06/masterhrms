const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.deviceSession.deleteMany({ where: { user: { email: { startsWith: 'audit.emp.' } } } });
  await prisma.employee.deleteMany({ where: { email: { startsWith: 'audit.emp.' } } });
  await prisma.profile.deleteMany({ where: { user: { email: { startsWith: 'audit.emp.' } } } }).catch(() => {});
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: 'audit.emp.' } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: 'audit.emp.' } } });
  console.log('Cleanup done.');
}

clean().finally(() => prisma.$disconnect());

