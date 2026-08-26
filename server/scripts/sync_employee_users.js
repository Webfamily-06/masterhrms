const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("=== 🚀 PROVISIONING USER LOGIN ACCOUNTS FOR ALL EMPLOYEES ===");

  const defaultPassword = "Password@123";
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);

  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      tenant: true,
    },
  });

  console.log(`Processing ${employees.length} employees...`);
  let createdCount = 0;
  let linkedCount = 0;

  for (const emp of employees) {
    const email = emp.email.toLowerCase().trim();

    // Check if a user already exists with this email
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, roles: true },
    });

    if (!user) {
      // Create fresh user account
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPasswordHash,
          profile: {
            create: {
              fullName: `${emp.firstName} ${emp.lastName}`.trim() || email,
              email,
              phone: emp.phone || null,
              tenantId: emp.tenantId,
            },
          },
          roles: {
            create: {
              role: "employee",
              tenantId: emp.tenantId,
            },
          },
        },
        include: { profile: true, roles: true },
      });
      createdCount++;
      console.log(`✅ [CREATED] User account for ${emp.firstName} ${emp.lastName} (${email})`);
    } else {
      // Ensure user has role and profile linked to tenant
      if (user.roles.length === 0) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            role: "employee",
            tenantId: emp.tenantId,
          },
        });
      }
      if (!user.profile) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            fullName: `${emp.firstName} ${emp.lastName}`.trim() || email,
            email,
            phone: emp.phone || null,
            tenantId: emp.tenantId,
          },
        });
      }
    }

    // Link employee to user
    if (emp.userId !== user.id) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: user.id },
      });
      linkedCount++;
    }
  }

  console.log("\n=======================================================");
  console.log(`🎉 SUCCESS! Provisioned ${createdCount} new user accounts.`);
  console.log(`🔗 Linked ${linkedCount} employee records to their user accounts.`);
  console.log(`🔑 All employee accounts can now login with password: "${defaultPassword}"`);
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("❌ Error provisioning users:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
