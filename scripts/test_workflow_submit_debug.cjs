const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  const user = await prisma.user.findFirst();
  console.log("Testing WorkflowService submit with tenant:", tenant.id, "user:", user.id);

  // Replicate WorkflowService.submit logic directly
  try {
    let workflow = await prisma.workflowDefinition.findFirst({
      where: {
        tenantId: tenant.id,
        entityType: "AWARD_NOMINATION",
        isActive: true,
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    if (!workflow) {
      console.log("No existing workflow found. Creating default...");
      workflow = await prisma.workflowDefinition.create({
        data: {
          tenantId: tenant.id,
          module: "AWARDS",
          entityType: "AWARD_NOMINATION",
          name: "Default AWARD_NOMINATION Workflow",
          isActive: true,
          steps: {
            create: [
              {
                stepOrder: 1,
                name: "Manager Approval",
                approverType: "MANAGER",
              },
            ],
          },
        },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      });
      console.log("Default workflow created:", workflow.id);
    }

    const request = await prisma.approvalRequest.create({
      data: {
        tenantId: tenant.id,
        workflowId: workflow.id,
        entityType: "AWARD_NOMINATION",
        entityId: "TEST-NOM-001",
        requesterId: user.id,
        status: "PENDING",
        currentStep: 1,
        payloadJson: {},
        actions: {
          create: {
            tenantId: tenant.id,
            stepNumber: 1,
            actorId: user.id,
            action: "SUBMIT",
            comment: "Request submitted for approval",
          },
        },
      },
      include: {
        workflow: { include: { steps: true } },
        actions: true,
      },
    });

    console.log("Created approval request successfully:", request.id);

    // Clean up test records
    await prisma.approvalAction.deleteMany({ where: { requestId: request.id } });
    await prisma.approvalRequest.delete({ where: { id: request.id } });
    await prisma.workflowStep.deleteMany({ where: { workflowId: workflow.id } });
    await prisma.workflowDefinition.delete({ where: { id: workflow.id } });
    console.log("Cleaned up successfully.");
  } catch (err) {
    console.error("Workflow submit failed with error:", err);
  }
}

main().finally(() => prisma.$disconnect());

