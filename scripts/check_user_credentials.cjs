const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "gowtham", mode: "insensitive" } },
        { email: { contains: "hr@", mode: "insensitive" } },
        { email: { contains: "employee", mode: "insensitive" } },
      ],
    },
    include: {
      profile: true,
      roles: true,
      employees: {
        include: {
          tenant: true,
        },
      },
    },
  });

  console.log("=== USERS FOUND:", users.length, "===");
  for (const u of users) {
    console.log("--------------------------------------------------");
    console.log("ID:", u.id);
    console.log("Email:", u.email);
    console.log("Password Hash:", u.passwordHash ? u.passwordHash.substring(0, 20) + "..." : "NONE");
    console.log("Direct User.tenantId:", u.tenantId);
    console.log("Profile:", u.profile ? { id: u.profile.id, fullName: u.profile.fullName, tenantId: u.profile.tenantId } : "NO PROFILE");
    console.log("Roles:", u.roles.map((r) => ({ role: r.role, tenantId: r.tenantId })));
    console.log("Employees:", u.employees.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      tenantName: e.tenant?.name,
      employeeNumber: e.employeeNumber,
      status: e.employmentStatus,
    })));
  }

  const defaultTenant = await prisma.tenant.findUnique({
    where: { id: "tenant-default-001" },
    include: {
      subscription: { include: { plan: true } },
      companyProfile: true,
      employees: true,
    },
  });
  console.log("\n=== TENANT: tenant-default-001 ===");
  console.log(defaultTenant);

  await prisma.$disconnect();
}

check().catch(console.error);
