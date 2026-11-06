const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_admin'],
      permissions: user.permissions || ['*'],
      sessionId,
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Host': 'localhost',
      'Content-Type': 'application/json'
    };
    const mergedHeaders = Object.assign({}, defaultHeaders, options.headers || {});
    const reqOptions = Object.assign({}, options, {
      host: 'localhost',
      headers: mergedHeaders
    });

    const req = http.request(reqOptions, (res) => {
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

async function runStep31RemediationSuite() {
  console.log('========================================================================');
  console.log('MASTERHRMS — STEP 3.1: AWARD APPROVAL SECURITY & GOVERNANCE TEST SUITE');
  console.log('========================================================================\n');

  const tenantId = 'tenant-default-001';
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    console.log('[Setup] Ensuring test personas in database...');

    // Nominee
    const nominee = await prisma.employee.findUnique({
      where: { id: 'emp-bday-avatar-001' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true }
    });

    // Manager
    const manager = await prisma.employee.findUnique({
      where: { id: 'a5278075-a350-47ff-8b7e-7ce68d2be9eb' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true }
    });

    // Nominator (Peer)
    const peer = await prisma.employee.findUnique({
      where: { id: '07268c41-2493-4229-a9f2-3388d3428b9b' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true }
    });

    // Ensure nominee reports to manager
    await prisma.$executeRawUnsafe(`UPDATE employees SET manager_id = '${manager.id}' WHERE id = '${nominee.id}'`);

    // Ensure dedicated users for Department Head and HR Manager
    const deptHeadUser = await prisma.user.upsert({
      where: { id: 'user-depthead-001' },
      update: {},
      create: {
        id: 'user-depthead-001',
        email: 'depthead@masterhrms.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        profile: { create: { tenantId, fullName: 'Department Head' } }
      }
    });

    const hrMgrUser = await prisma.user.upsert({
      where: { id: 'user-hrmgr-001' },
      update: {},
      create: {
        id: 'user-hrmgr-001',
        email: 'hrmgr@masterhrms.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        profile: { create: { tenantId, fullName: 'HR Manager' } }
      }
    });

    // Ensure WorkspaceRoles exist
    const deptHeadRole = await prisma.workspaceRole.upsert({
      where: { tenantId_name: { tenantId, name: 'Department Head' } },
      update: {},
      create: { tenantId, name: 'Department Head', description: 'Department leadership role' }
    });
    const hrMgrRole = await prisma.workspaceRole.upsert({
      where: { tenantId_name: { tenantId, name: 'HR Manager' } },
      update: {},
      create: { tenantId, name: 'HR Manager', description: 'HR management role' }
    });

    // Assign WorkspaceRoles
    await prisma.userRoleAssignment.upsert({
      where: { userId_tenantId: { userId: deptHeadUser.id, tenantId } },
      update: { roleId: deptHeadRole.id },
      create: { userId: deptHeadUser.id, roleId: deptHeadRole.id, tenantId }
    });
    await prisma.userRoleAssignment.upsert({
      where: { userId_tenantId: { userId: hrMgrUser.id, tenantId } },
      update: { roleId: hrMgrRole.id },
      create: { userId: hrMgrUser.id, roleId: hrMgrRole.id, tenantId }
    });

    // Also ensure UserRole records for auth middleware
    await prisma.userRole.upsert({
      where: { userId_role_tenantId: { userId: deptHeadUser.id, role: 'manager', tenantId } },
      update: {},
      create: { userId: deptHeadUser.id, role: 'manager', tenantId }
    });
    await prisma.userRole.upsert({
      where: { userId_role_tenantId: { userId: hrMgrUser.id, role: 'hr_admin', tenantId } },
      update: {},
      create: { userId: hrMgrUser.id, role: 'hr_admin', tenantId }
    });

    // Ensure Device Sessions for test personas
    async function createTestSession(userId) {
      const s = await prisma.deviceSession.create({
        data: {
          userId,
          tenantId,
          deviceType: 'desktop',
          browser: 'Test',
          revoked: false,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      return s.id;
    }
    const hrAdminSessionId = await createTestSession('user-hr-001');
    const managerSessionId = await createTestSession(manager.userId);
    const peerSessionId = await createTestSession(peer.userId);
    const deptHeadSessionId = await createTestSession(deptHeadUser.id);
    const hrMgrSessionId = await createTestSession(hrMgrUser.id);
    const nomineeSessionId = await createTestSession(nominee.userId);

    // Prepare Persona Tokens
    const hrAdminToken = makeToken({
      id: 'user-hr-001',
      email: 'hr@masterhrms.com',
      tenantId,
      roles: ['hr_admin'],
      permissions: ['*']
    }, hrAdminSessionId);

    const managerToken = makeToken({
      id: manager.userId,
      email: manager.email,
      tenantId,
      roles: ['manager'],
      permissions: ['nominations:submit', 'nominations:approve']
    }, managerSessionId);

    const peerToken = makeToken({
      id: peer.userId,
      email: peer.email,
      tenantId,
      roles: ['employee'],
      permissions: ['nominations:submit', 'awards:view']
    }, peerSessionId);

    const deptHeadToken = makeToken({
      id: deptHeadUser.id,
      email: deptHeadUser.email,
      tenantId,
      roles: ['department_head', 'manager'],
      permissions: ['hrm.awards.view', 'hrm.awards.manage']
    }, deptHeadSessionId);

    const hrManagerToken = makeToken({
      id: hrMgrUser.id,
      email: hrMgrUser.email,
      tenantId,
      roles: ['hr_manager'],
      permissions: ['hrm.awards.view', 'hrm.awards.manage']
    }, hrMgrSessionId);

    const nomineeToken = makeToken({
      id: nominee.userId,
      email: nominee.email,
      tenantId,
      roles: ['employee'],
      permissions: ['hrm.awards.view']
    }, nomineeSessionId);

    // Clean prior test nominations for nominee
    await prisma.awardNomination.deleteMany({
      where: { tenantId, employeeId: nominee.id }
    });

    // -------------------------------------------------------------------------
    // PHASE A: PER-AWARD-TYPE WORKFLOW BINDING & BLUEPRINT ALLOWLIST (GAP-DATA-01/02)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE A: Award Type Governance CRUD & Allowlist Verification ---');

    // 1. Create a 3-step configurable workflow
    const maxVersion = await prisma.workflowDefinition.aggregate({
      where: { tenantId, entityType: 'AWARD_NOMINATION' },
      _max: { version: true }
    });
    const nextVersion = (maxVersion._max.version || 0) + 1;

    const wfName = `Step31 MultiStage Governance ${Date.now()}`;
    const wf = await prisma.workflowDefinition.create({
      data: {
        tenantId,
        module: 'AWARDS',
        entityType: 'AWARD_NOMINATION',
        name: wfName,
        version: nextVersion,
        isActive: true,
        steps: {
          create: [
            { stepOrder: 1, name: 'Stage 1: Direct Manager', approverType: 'MANAGER' },
            { stepOrder: 2, name: 'Stage 2: Department Head', approverType: 'DEPARTMENT_HEAD' },
            { stepOrder: 3, name: 'Stage 3: HR Manager', approverType: 'ROLE', approverValue: 'hr_manager' }
          ]
        }
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });

    assert(wf && wf.steps.length === 3, 'Successfully created 3-step workflow definition');

    // 2. Create custom Award Type with governance fields via API
    const awardTypeName = `Governor Excellence ${Date.now().toString().slice(-4)}`;
    const createTypeRes = await request(
      {
        port: 4000,
        path: '/api/awards/types',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrAdminToken}`
        }
      },
      {
        name: awardTypeName,
        icon: 'Crown',
        description: 'Testing governance fields allowlist and workflow binding',
        requiresApproval: true,
        allowPeerNomination: true,
        allowSelfNomination: false,
        workflowId: wf.id
      }
    );

    assert(createTypeRes.status === 201, `POST /api/awards/types responded with 201 Created (got ${createTypeRes.status})`);
    const createdType = createTypeRes.body;
    assert(createdType.requiresApproval === true, 'requiresApproval was persisted as true');
    assert(createdType.allowPeerNomination === true, 'allowPeerNomination was persisted as true');
    assert(createdType.allowSelfNomination === false, 'allowSelfNomination was persisted as false');
    assert(createdType.workflowId === wf.id, `workflowId was bound to workflow ${wf.id}`);
    assert(createdType.workflow?.id === wf.id, 'Populated workflow relation returned in response');

    // 3. Update Award Type via PUT /api/awards/types/:id
    const updateTypeRes = await request(
      {
        port: 4000,
        path: `/api/awards/types/${createdType.id}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${hrAdminToken}`
        }
      },
      {
        allowSelfNomination: true,
        description: 'Updated criteria description'
      }
    );

    assert(updateTypeRes.status === 200, `PUT /api/awards/types/:id responded with 200 OK (got ${updateTypeRes.status})`);
    assert(updateTypeRes.body.allowSelfNomination === true, 'Updated allowSelfNomination persisted as true');

    // 4. Test GET /api/awards/workflows
    const getWorkflowsRes = await request({
      port: 4000,
      path: '/api/awards/workflows',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${hrAdminToken}` }
    });
    assert(getWorkflowsRes.status === 200, 'GET /api/awards/workflows returned 200 OK');
    const workflowsList = getWorkflowsRes.body?.data || [];
    assert(workflowsList.some(w => w.id === wf.id), 'Active workflow appears in award workflows endpoint');

    // -------------------------------------------------------------------------
    // PHASE B: NULL APPROVALREQUEST BYPASS DEFENSE (GAP-SEC-03)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE B: Null ApprovalRequest Bypass Defense Verification ---');

    // Create a mock nomination that requires approval but has approvalRequestId = null
    const corruptNomination = await prisma.awardNomination.create({
      data: {
        tenantId,
        nominationNumber: `NOM-BYPASS-TEST-${Date.now().toString().slice(-4)}`,
        employeeId: nominee.id,
        awardTypeId: createdType.id,
        nominatedByUserId: peer.userId,
        nominatedByEmployeeId: peer.id,
        nominationSource: 'peer',
        reason: 'Testing approval bypass defense',
        status: 'PENDING',
        approvalRequestId: null // Deliberately null to test bypass closure
      }
    });

    const bypassAttemptRes = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${corruptNomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrAdminToken}`
        }
      },
      { comment: 'Attempting bypass approval' }
    );

    assert(bypassAttemptRes.status === 400, `Null approvalRequestId was rejected with HTTP 400 (got ${bypassAttemptRes.status})`);
    assert(
      bypassAttemptRes.body.error?.includes('missing or corrupted'),
      `Correct error message returned: "${bypassAttemptRes.body.error}"`
    );

    // Verify nomination remains PENDING in database
    const verifyCorruptNom = await prisma.awardNomination.findUnique({ where: { id: corruptNomination.id } });
    assert(verifyCorruptNom.status === 'PENDING', 'Nomination status was preserved as PENDING');

    // Clean up corrupt test record
    await prisma.awardNomination.delete({ where: { id: corruptNomination.id } });

    // -------------------------------------------------------------------------
    // PHASE C: STEP-SPECIFIC APPROVER AUTHORIZATION (GAP-SEC-01)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE C: Step-Specific Approver Authorization Verification ---');

    // Submit legitimate nomination bound to the 3-step workflow
    const submitRes = await request(
      {
        port: 4000,
        path: '/api/awards/nominations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${peerToken}`
        }
      },
      {
        employeeId: nominee.id,
        awardTypeId: createdType.id,
        reason: 'Outstanding contribution to platform architecture',
        source: 'peer'
      }
    );

    assert(submitRes.status === 201, `Nomination submission succeeded (status ${submitRes.status})`);
    const nomination = submitRes.body?.data;
    assert(nomination && nomination.approvalRequestId, 'Nomination created with bound approvalRequestId');

    const approvalReq = await prisma.approvalRequest.findUnique({
      where: { id: nomination.approvalRequestId },
      include: { workflow: { include: { steps: true } } }
    });
    assert(approvalReq.currentStep === 1, 'ApprovalRequest initialized at step 1');

    // 1. Nominee Self-Approval Attempt -> Must Fail
    const nomineeSelfApproveRes = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nomineeToken}`
        }
      },
      { comment: 'Self approval' }
    );
    assert(nomineeSelfApproveRes.status === 400, `Nominee self-approval rejected with HTTP 400 (got ${nomineeSelfApproveRes.status})`);
    assert(nomineeSelfApproveRes.body.error?.includes('their own'), 'Correct self-approval error message');

    // 2. Nominator Self-Approval Attempt -> Must Fail
    const nominatorSelfApproveRes = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${peerToken}`
        }
      },
      { comment: 'Nominator approval' }
    );
    assert(nominatorSelfApproveRes.status === 400, `Nominator self-approval rejected with HTTP 400 (got ${nominatorSelfApproveRes.status})`);
    assert(nominatorSelfApproveRes.body.error?.includes('submitted'), 'Correct nominator approval error message');

    // 3. Dept Head attempts to approve Stage 1 (MANAGER) -> Must Fail with HTTP 403 Forbidden
    const deptHeadStage1Res = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deptHeadToken}`
        }
      },
      { comment: 'Dept Head jumping in on Stage 1' }
    );
    assert(deptHeadStage1Res.status === 403, `Dept Head out-of-turn approval rejected with HTTP 403 (got ${deptHeadStage1Res.status})`);
    assert(deptHeadStage1Res.body.error?.includes('not authorized to approve step 1'), 'Message explicitly specifies Step 1 unauthorized');

    // 4. HR Manager attempts to approve Stage 1 (MANAGER) -> Must Fail with HTTP 403 Forbidden
    const hrMgrStage1Res = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrManagerToken}`
        }
      },
      { comment: 'HR Manager jumping in on Stage 1' }
    );
    assert(hrMgrStage1Res.status === 403, `HR Manager out-of-turn approval rejected with HTTP 403 (got ${hrMgrStage1Res.status})`);

    // 5. Direct Reporting Manager approves Stage 1 -> Must Succeed
    const managerStage1Res = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`
        }
      },
      { comment: 'Manager endorsement: Excellent leadership' }
    );
    assert(managerStage1Res.status === 200, `Direct Manager approved Stage 1 with HTTP 200 (got ${managerStage1Res.status})`);
    assert(managerStage1Res.body?.data?.status === 'PENDING', 'Nomination status remains PENDING for stage 2');

    const reqAfterStage1 = await prisma.approvalRequest.findUnique({ where: { id: nomination.approvalRequestId } });
    assert(reqAfterStage1.currentStep === 2, `Workflow currentStep advanced to 2 (got ${reqAfterStage1.currentStep})`);

    // -------------------------------------------------------------------------
    // PHASE D: SAME-ACTOR RE-APPROVAL PREVENTION (GAP-SEC-02)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE D: Same-Actor Re-Approval Prevention Verification ---');

    // 1. Manager attempts to approve Stage 2 (DEPARTMENT_HEAD) again -> Must Fail with HTTP 400 Segregation of duties
    const managerReapproveRes = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`
        }
      },
      { comment: 'Manager trying to approve stage 2 as well' }
    );
    assert(managerReapproveRes.status === 400, `Same-actor re-approval rejected with HTTP 400 (got ${managerReapproveRes.status})`);
    assert(managerReapproveRes.body.error?.includes('already approved a step'), 'Correct segregation-of-duties error message');

    // 2. HR Manager attempts to approve Stage 2 (DEPARTMENT_HEAD) -> Must Fail with HTTP 403
    const hrMgrStage2Res = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrManagerToken}`
        }
      },
      { comment: 'HR Manager jumping into stage 2' }
    );
    assert(hrMgrStage2Res.status === 403, `HR Manager approval of Stage 2 rejected with HTTP 403 (got ${hrMgrStage2Res.status})`);

    // 3. Department Head approves Stage 2 -> Must Succeed
    const deptHeadStage2Res = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deptHeadToken}`
        }
      },
      { comment: 'Department Head approval confirmed' }
    );
    assert(deptHeadStage2Res.status === 200, `Department Head approved Stage 2 with HTTP 200 (got ${deptHeadStage2Res.status})`);

    const reqAfterStage2 = await prisma.approvalRequest.findUnique({ where: { id: nomination.approvalRequestId } });
    assert(reqAfterStage2.currentStep === 3, `Workflow currentStep advanced to 3 (got ${reqAfterStage2.currentStep})`);

    // -------------------------------------------------------------------------
    // PHASE E: FINAL STAGE APPROVAL & OFFICIAL AWARD CONVERSION
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE E: Final Stage Approval & Official Award Issuance ---');

    // 1. Dept Head attempts to approve Stage 3 -> Must Fail (already approved stage 2)
    const deptHeadReapproveRes = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deptHeadToken}`
        }
      },
      { comment: 'Dept Head trying to approve stage 3' }
    );
    assert(deptHeadReapproveRes.status === 400, `Dept Head re-approval rejected with HTTP 400 (got ${deptHeadReapproveRes.status})`);

    // 2. HR Manager approves Stage 3 (Final Stage) -> Must Succeed and complete workflow
    const hrMgrStage3Res = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/approve`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrManagerToken}`
        }
      },
      { comment: 'HR Manager final sign-off: Award officially cleared' }
    );
    assert(hrMgrStage3Res.status === 200, `HR Manager approved Stage 3 with HTTP 200 (got ${hrMgrStage3Res.status})`);
    assert(hrMgrStage3Res.body?.data?.status === 'APPROVED', 'Nomination status transitioned to APPROVED');

    const reqFinal = await prisma.approvalRequest.findUnique({ where: { id: nomination.approvalRequestId } });
    assert(reqFinal.status === 'APPROVED', 'ApprovalRequest status transitioned to APPROVED');

    // 3. Issue Official Award from Approved Nomination
    const issueAwardRes = await request(
      {
        port: 4000,
        path: `/api/awards/nominations/${nomination.id}/issue`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrAdminToken}`
        }
      },
      {
        giftItem: 'Crystal Trophy & Tech Voucher',
        giftAmount: 500,
        presentedBy: 'Chief Executive Officer'
      }
    );

    assert(issueAwardRes.status === 201, `Official award issued with HTTP 201 (got ${issueAwardRes.status})`);
    const issuedAward = issueAwardRes.body?.data;
    assert(issuedAward && issuedAward.id, 'Award record was created in database');
    assert(issuedAward.employeeId === nominee.id, 'Award belongs to nominee');
    assert(issuedAward.certificateNo && issuedAward.certificateNo.startsWith('AWD-'), 'Certificate number generated');

    const finalNomination = await prisma.awardNomination.findUnique({ where: { id: nomination.id } });
    assert(finalNomination.status === 'AWARD_ISSUED', 'Nomination status finalized as AWARD_ISSUED');

    // -------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup Test Fixtures ---');
    if (issuedAward?.id) {
      await prisma.award.delete({ where: { id: issuedAward.id } });
    }
    await prisma.awardNomination.delete({ where: { id: nomination.id } });
    await prisma.approvalAction.deleteMany({ where: { requestId: nomination.approvalRequestId } });
    await prisma.approvalRequest.delete({ where: { id: nomination.approvalRequestId } });
    await prisma.awardType.delete({ where: { id: createdType.id } });
    await prisma.workflowStep.deleteMany({ where: { workflowId: wf.id } });
    await prisma.workflowDefinition.delete({ where: { id: wf.id } });

    console.log('Test fixtures cleaned up successfully.');

    console.log('\n========================================================================');
    console.log(`ALL TESTS PASSED: ${passedCount} / ${totalTests} assertions confirmed`);
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n[SUITE ERROR]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep31RemediationSuite();
