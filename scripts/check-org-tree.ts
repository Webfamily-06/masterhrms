import { rawPrisma } from "../server/src/prisma.js";

async function main() {
  const tenantId = "tenant-default-001";
  const designations = await rawPrisma.designation.findMany({ where: { tenantId } });
  console.log("Designations:", designations.map(d => ({ id: d.id, name: d.name })));
  const emps = await rawPrisma.employee.findMany({
    where: { tenantId },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      position: true,
      managerId: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      branch: { select: { name: true } }
    }
  });
  console.log("Employees in tenant-default-001:", JSON.stringify(emps, null, 2));

  await rawPrisma.$disconnect();
}

main().catch(console.error);
