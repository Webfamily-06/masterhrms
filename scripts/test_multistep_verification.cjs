const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_admin'],
      permissions: user.permissions || ['*']
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runMultiStepAudit() {
  console.log('================================================================');
  console.log('EMPIRICAL AUDIT: MULTI-LEVEL WORKFLOW CAPABILITY TEST');
  console.log('================================================================\n');

  const tenantId = 'tenant-default-001';

  // 1. Fetch test users
  const manager = await prisma.employee.findUnique({
    where: { id: 'a5278075-a350-47ff-8b7e-7ce68d2be9eb' },
    select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true }
  });

  const nominee = await prisma.employee.findUnique({
    where: { id: 'emp-bday-avatar-001' },
    select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true }
  });

  const peer = await prisma.employee.findUnique({
    where: { id: '07268c41-2493-4229-a9f2-3388d3428b9b' },
    select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true }
  });

  // Ensure nominee reports to manager
  await prisma.$executeRawUnsafe(`UPDATE employees SET manager_id = '${manager.id}' WHERE id = '${nominee.id}'`);

  // Tokens
  const hrAdminToken = makeToken({
    id: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId,
    roles: ['hr_admin'],
    permissions: ['*']
  });

  const managerToken = makeToken({
    id: manager.userId,
    email: manager.email,
    tenantId,
    roles: ['manager', 'employee'],
    permissions: ['nominations:submit', 'nominations:approve']
  });

  const peerToken = makeToken({
    id: peer.userId,
    email: peer.email,
    tenantId,
    roles: ['employee'],
    permissions: ['nominations:submit', 'awards:view']
  });

  // 2. Set up a 4-step workflow for AWARD_NOMINATION
  console.log('1. Configuring 4-stage WorkflowDefinition in database...');
  await prisma.workflowDefinition.updateMany({
    where: { tenantId, entityType: 'AWARD_NOMINATION' },
    data: { isActive: false }
  });

  const workflow = await prisma.workflowDefinition.create({
    data: {
      tenantId,
      module: 'AWARDS',
      entityType: 'AWARD_NOMINATION',
      name: '4-Stage Corporate Award Approval Workflow',
      version: 3,
      isActive: true,
      steps: {
        create: [
          { stepOrder: 1, name: 'Reporting Manager Review', approverType: 'MANAGER' },
          { stepOrder: 2, name: 'Department Head Approval', approverType: 'ROLE', approverValue: 'department_head' },
          { stepOrder: 3, name: 'HR Manager Review', approverType: 'ROLE', approverValue: 'hr_manager' },
          { stepOrder: 4, name: 'HR Admin Final Sanction', approverType: 'ROLE', approverValue: 'hr_admin' }
        ]
      }
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } }
  });
  console.log(`   Created workflow ID: ${workflow.id} with ${workflow.steps.length} steps.`);

  // 3. Find an active award type with requiresApproval = true
  const awardType = await prisma.awardType.findFirst({
    where: { tenantId, status: 'active', requiresApproval: true }
  });

  // Clean prior test nominations for nominee
  await prisma.awardNomination.deleteMany({
    where: { tenantId, employeeId: nominee.id }
  });

  // 4. Submit Nomination via Peer
  console.log('\n2. Submitting Peer Nomination (Marcus nominating Sarah)...');
  const submitRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/api/awards/nominations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${peerToken}`
      }
    },
    {
      nomineeId: nominee.id,
      awardTypeId: awardType.id,
      nominationSource: 'PEER',
      reason: 'Outstanding teamwork and leadership on Q4 deliverables',
      achievementDescription: 'Refactored backend microservices'
    }
  );

  console.log(`   Submit response status: ${submitRes.status}`);
  const nomData = submitRes.body?.data;
  console.log(`   Nomination ID: ${nomData?.id}, Number: ${nomData?.nominationNumber}`);
  console.log(`   ApprovalRequestId: ${nomData?.approvalRequestId}, Status: ${nomData?.status}`);

  if (!nomData || !nomData.id) {
    console.error('Failed to submit nomination. Stopping test.');
    return;
  }

  // 5. Test Step 1: Reporting Manager approves Step 1
  console.log('\n3. Testing Step 1: Reporting Manager approves Step 1...');
  const mgrApproveRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: `/api/awards/nominations/${nomData.id}/approve`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      }
    },
    { comment: 'Manager endorses nomination' }
  );
  console.log(`   Manager approve status: ${mgrApproveRes.status}, body:`, JSON.stringify(mgrApproveRes.body));

  // Check state after Step 1
  const nomAfterStep1 = await prisma.awardNomination.findUnique({
    where: { id: nomData.id }
  });
  console.log(`   Nomination status after Step 1: ${nomAfterStep1?.status} (Expected PENDING, currentStep: ${nomAfterStep1?.currentStep})`);

  const reqAfterStep1 = await prisma.approvalRequest.findUnique({
    where: { id: nomData.approvalRequestId },
    include: { actions: true }
  });
  console.log(`   ApprovalRequest status after Step 1: ${reqAfterStep1?.status}, currentStep: ${reqAfterStep1?.currentStep}, actions count: ${reqAfterStep1?.actions.length}`);

  // 6. Test Step 2: Can Manager approve Step 2 again? (Should be Department Head only!)
  console.log('\n4. Testing Step 2: Can Reporting Manager approve Step 2 again? (Should be Department Head only)');
  const mgrStep2Res = await request(
    {
      host: 'localhost',
      port: 4000,
      path: `/api/awards/nominations/${nomData.id}/approve`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      }
    },
    { comment: 'Manager approves Step 2 again' }
  );
  console.log(`   Manager step 2 status: ${mgrStep2Res.status}, body:`, JSON.stringify(mgrStep2Res.body));

  const nomAfterStep2 = await prisma.awardNomination.findUnique({
    where: { id: nomData.id }
  });
  console.log(`   Nomination status after Step 2: ${nomAfterStep2?.status}, currentStep: ${nomAfterStep2?.currentStep}`);

  const reqAfterStep2 = await prisma.approvalRequest.findUnique({
    where: { id: nomData.approvalRequestId },
    include: { actions: true }
  });
  console.log(`   ApprovalRequest status after Step 2: ${reqAfterStep2?.status}, currentStep: ${reqAfterStep2?.currentStep}, actions count: ${reqAfterStep2?.actions.length}`);

  // 7. Test Premature Issuance: Can award be issued before all 4 steps finish?
  console.log('\n5. Testing Premature Issuance before all 4 steps finish...');
  const prematureIssueRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: `/api/awards/nominations/${nomData.id}/issue`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hrAdminToken}`
      }
    },
    { presentedBy: 'HR Admin' }
  );
  console.log(`   Premature issue status: ${prematureIssueRes.status} (Expected 400 rejection: ${prematureIssueRes.status === 400 ? 'PASS' : 'FAIL'})`);

  // Clean up
  await prisma.workflowStep.deleteMany({ where: { workflowId: workflow.id } });
  await prisma.workflowDefinition.delete({ where: { id: workflow.id } });
  await prisma.workflowDefinition.updateMany({
    where: { tenantId, entityType: 'AWARD_NOMINATION', name: 'Default AWARD_NOMINATION Workflow' },
    data: { isActive: true }
  });
  console.log('\nCleanup completed.');
}

runMultiStepAudit().finally(() => prisma.$disconnect());
