const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@hrms.local';
  const password = 'Password123!';
  const hash = await bcrypt.hash(password, 10);
  
  let user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, roles: true }
  });

  if (!user) {
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: 'Demo Workspace', slug: 'demo' }
      });
    }
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        profile: {
          create: {
            fullName: 'Admin User',
            tenantId: tenant.id
          }
        },
        roles: {
          create: [
            { role: 'hr_admin', tenantId: tenant.id },
            { role: 'super_admin' }
          ]
        }
      },
      include: { profile: true, roles: true }
    });
    console.log('Created admin user:', user.email);
  } else {
    // Ensure password hash is set
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash }
    });
    console.log('Updated existing admin password hash for:', user.email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
