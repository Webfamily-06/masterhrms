const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING WORKFLOW DEFINITIONS & STEPS ===");

  const definitions = await prisma.workflowDefinition.findMany({
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  console.log(`Found ${definitions.length} workflow definitions:`);
  for (const def of definitions) {
    console.log(`- ID: ${def.id}, Tenant: ${def.tenantId}, Module: ${def.module}, EntityType: ${def.entityType}, Name: "${def.name}", Steps: ${def.steps.length}`);
    for (const step of def.steps) {
      console.log(`   Step ${step.stepOrder}: ${step.name} (ApproverType: ${step.approverType}, SpecificRole: ${step.specificRole}, SpecificUserId: ${step.specificUserId})`);
    }
  }

  const approvalRequests = await prisma.approvalRequest.findMany({
    where: { entityType: "AWARD_NOMINATION" },
    include: {
      actions: true,
      workflow: { include: { steps: true } },
    },
    take: 5,
  });

  console.log(`\nFound ${approvalRequests.length} approval requests for AWARD_NOMINATION:`);
  for (const req of approvalRequests) {
    console.log(`- ReqID: ${req.id}, Status: ${req.status}, CurrentStep: ${req.currentStep}, TotalSteps: ${req.workflow?.steps?.length || 0}`);
    for (const act of req.actions) {
      console.log(`   Action: ${act.action} by ${act.actorId} at step ${act.stepNumber} (Comment: ${act.comment})`);
    }
  }
}

main().finally(() => prisma.$disconnect());

