import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { tenantId: "tenant-default-001" },
  });
  if (!emp) {
    throw new Error("No employee found in tenant-default-001");
  }

  // 1. Award
  const award = await prisma.award.create({
    data: {
      tenantId: "tenant-default-001",
      employeeId: emp.id,
      awardDate: new Date(),
      giftItem: "Spotlight Excellence Trophy",
      giftAmount: 15000,
      description: "Outstanding platform performance and security audit lead",
      presentedBy: "Chief Technology Officer",
      certificateNo: "CERT-SPOT-2026-001",
      status: "awarded",
    },
  });
  console.log("SEEDED_AWARD:", award.id, award.giftItem);

  // 2. Disciplinary Warning
  const warning = await prisma.disciplinaryWarning.create({
    data: {
      tenantId: "tenant-default-001",
      employeeId: emp.id,
      warningDate: new Date(),
      subject: "Unscheduled Infrastructure Migration Attempt",
      severity: "moderate",
      description: "Attempted infrastructure reboot outside approved maintenance window.",
      warningBy: "VP of Engineering",
      status: "issued",
    },
  });
  console.log("SEEDED_WARNING:", warning.id, warning.subject);

  // 3. Complaint
  const complaint = await prisma.employeeComplaint.create({
    data: {
      tenantId: "tenant-default-001",
      ticketCode: `GRV-${Date.now().toString(36).toUpperCase()}`,
      complainantId: emp.id,
      category: "workplace_environment",
      severity: "medium",
      subject: "HVAC Temperature Calibration in Engineering Bay 3",
      description: "Excessive cooling in Bay 3 causing health concerns.",
      incidentDate: new Date(),
      status: "under_review",
    },
  });
  console.log("SEEDED_COMPLAINT:", complaint.id, complaint.ticketCode);
}

main().finally(() => prisma.$disconnect());
