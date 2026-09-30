const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial tenant and accounts...");

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

  // 1. Super Admin (with both super_admin and hr_admin access)
  const adminUser = await prisma.user.upsert({
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
    where: { userId: adminUser.id },
    update: { fullName: "Super Administrator", tenantId: tenant.id },
    create: {
      id: "profile-admin-001",
      userId: adminUser.id,
      email: "admin@masterhrms.com",
      fullName: "Super Administrator",
      avatarUrl: "/favicon.webp",
      tenantId: tenant.id,
    },
  });

  // Assign both super_admin and hr_admin roles
  const adminRoles = ["super_admin", "hr_admin"];
  for (const role of adminRoles) {
    const existing = await prisma.userRole.findFirst({
      where: { userId: adminUser.id, role },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: {
          id: `role-admin-${role}`,
          userId: adminUser.id,
          role,
          tenantId: tenant.id,
        },
      });
    }
  }

  // 2. HR Admin Account (hr@masterhrms.com / admin123)
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@masterhrms.com" },
    update: { passwordHash },
    create: {
      id: "user-hr-001",
      email: "hr@masterhrms.com",
      passwordHash,
      twoFactorEnabled: false,
    },
  });

  await prisma.profile.upsert({
    where: { userId: hrUser.id },
    update: { fullName: "Sarah Jenkins (HR Director)", tenantId: tenant.id },
    create: {
      id: "profile-hr-001",
      userId: hrUser.id,
      email: "hr@masterhrms.com",
      fullName: "Sarah Jenkins (HR Director)",
      avatarUrl: "/favicon.webp",
      tenantId: tenant.id,
    },
  });

  const existingHrRole = await prisma.userRole.findFirst({
    where: { userId: hrUser.id, role: "hr_admin" },
  });
  if (!existingHrRole) {
    await prisma.userRole.create({
      data: {
        id: "role-hr-001",
        userId: hrUser.id,
        role: "hr_admin",
        tenantId: tenant.id,
      },
    });
  }

  // 3. Employee Account (employee@masterhrms.com / admin123)
  const empUser = await prisma.user.upsert({
    where: { email: "employee@masterhrms.com" },
    update: { passwordHash },
    create: {
      id: "user-emp-001",
      email: "employee@masterhrms.com",
      passwordHash,
      twoFactorEnabled: false,
    },
  });

  await prisma.profile.upsert({
    where: { userId: empUser.id },
    update: { fullName: "Alex Morgan (Staff)", tenantId: tenant.id },
    create: {
      id: "profile-emp-001",
      userId: empUser.id,
      email: "employee@masterhrms.com",
      fullName: "Alex Morgan (Staff)",
      avatarUrl: "/favicon.webp",
      tenantId: tenant.id,
    },
  });

  const existingEmpRole = await prisma.userRole.findFirst({
    where: { userId: empUser.id, role: "employee" },
  });
  if (!existingEmpRole) {
    await prisma.userRole.create({
      data: {
        id: "role-emp-001",
        userId: empUser.id,
        role: "employee",
        tenantId: tenant.id,
      },
    });
  }

  // Link employee table record
  const existingEmpRecord = await prisma.employee.findFirst({
    where: { email: "employee@masterhrms.com" },
  });
  if (!existingEmpRecord) {
    await prisma.employee.create({
      data: {
        id: "emp-demo-001",
        tenantId: tenant.id,
        userId: empUser.id,
        employeeCode: "EMP-0001",
        firstName: "Alex",
        lastName: "Morgan",
        email: "employee@masterhrms.com",
        position: "Senior Full Stack Engineer",
        employmentType: "full_time",
        status: "active",
        salary: 85000,
        joinedAt: new Date("2024-01-15"),
      },
    });
  }

  console.log("✅ Seeding complete:");
  console.log("  👑 Super Admin: admin@masterhrms.com / admin123");
  console.log("  🏢 HR Admin:    hr@masterhrms.com    / admin123");
  console.log("  👤 Employee:    employee@masterhrms.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
