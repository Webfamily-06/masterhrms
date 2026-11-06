const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.approvalRequest.findUnique({
    where: { id: '64029434-3ebc-46a9-bfec-0546215cf915' },
    include: {
      workflow: {
        include: {
          steps: { orderBy: { stepOrder: 'asc' } }
        }
      },
      actions: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  console.log('ApprovalRequest:', JSON.stringify(req, null, 2));
}

main().finally(() => prisma.$disconnect());

