const { WorkflowService } = require("../server/dist/services/workflow.service.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  const user = await prisma.user.findFirst();

  try {
    const res = await WorkflowService.submit({
      tenantId: tenant.id,
      module: "AWARDS",
      entityType: "AWARD_NOMINATION",
      entityId: "TEST-NOM-LIVE-001",
      requesterId: user.id,
      payloadSnapshot: { test: true },
    });
    console.log("WorkflowService.submit SUCCESS:", res.id);
  } catch (err) {
    console.error("WorkflowService.submit FAILED:", err);
  }
}

main().finally(() => prisma.$disconnect());

