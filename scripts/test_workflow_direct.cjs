const { tenantStorage } = require('../server/dist/context/tenant-context.js');
const { WorkflowService } = require('../server/dist/services/workflow.service.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const ctx = {
    tenantId: 'tenant-default-001',
    userId: 'user-hr-001',
    roles: ['hr_admin'],
    status: 'ACTIVE',
    tenancyStrategy: 'SHARED_SCHEMA',
    db: prisma
  };

  try {
    const res = await tenantStorage.run(ctx, async () => {
      return await WorkflowService.submit({
        tenantId: 'tenant-default-001',
        module: 'AWARDS',
        entityType: 'AWARD_NOMINATION',
        entityId: 'TEST-NOM-001',
        requesterId: 'user-hr-001',
        payloadSnapshot: { test: true }
      });
    });
    console.log('WorkflowService.submit SUCCESS:', res.id);
  } catch (err) {
    console.error('WorkflowService.submit ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();

