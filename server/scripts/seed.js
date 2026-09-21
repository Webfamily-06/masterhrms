const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial tenant and admin user...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: { name: "Master Enterprise ERP" },
    create: {
      id: "tenant-default-001",
      name: "Master Enterprise ERP",
      slug: "default",
      logoUrl: "/logo.webp",
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@masterhrms.com" },
    update: { passwordHash },
    create: {
      id: "user-admin-001",
      email: "admin@masterhrms.com",
      passwordHash,
      twoFactorEnabled: false,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { fullName: "Super Administrator" },
    create: {
      id: "profile-admin-001",
      userId: user.id,
      email: "admin@masterhrms.com",
      fullName: "Super Administrator",
      avatarUrl: "/favicon.webp",
      tenantId: tenant.id,
    },
  });

  const existingRole = await prisma.userRole.findFirst({
    where: { userId: user.id, role: "super_admin" },
  });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        id: "role-admin-001",
        userId: user.id,
        role: "super_admin",
        tenantId: tenant.id,
      },
    });
  }

  console.log("Seeding complete: admin@masterhrms.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
