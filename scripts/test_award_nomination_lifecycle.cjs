const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Read server .env for JWT_SECRET
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

async function runLifecycleTestSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS STEP 3: AWARD NOMINATION & APPROVAL LIFECYCLE SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Setup / identify test tenants, employees, and award types
    console.log('1. Setting up Test Fixtures in Database...');

    const tenantA = await prisma.tenant.findUnique({
      where: { id: 'tenant-default-001' }
    });
    if (!tenantA) {
      throw new Error('Default tenant tenant-default-001 not found');
    }

    const tenantB = await prisma.tenant.findFirst({
      where: { id: { not: tenantA.id } }
    });

    console.log(`   Tenant A: ${tenantA.name} (${tenantA.id})`);
    if (tenantB) console.log(`   Tenant B: ${tenantB.name} (${tenantB.id})`);

    // Ensure Award Types with varying policies exist for Tenant A
    let approvalAwardType = await prisma.awardType.findFirst({
      where: { tenantId: tenantA.id, status: 'active', requiresApproval: true }
    });
    if (!approvalAwardType) {
      approvalAwardType = await prisma.awardType.create({
        data: {
          tenantId: tenantA.id,
          name: 'Leadership Excellence Medal',
          description: 'Recognizes exceptional leadership and project delivery requiring committee approval',
          status: 'active',
          requiresApproval: true,
          allowPeerNomination: true,
          allowSelfNomination: false
        }
      });
    }

    let noSelfAwardType = await prisma.awardType.findFirst({
      where: { tenantId: tenantA.id, status: 'active', allowSelfNomination: false }
    });
    if (!noSelfAwardType) {
      noSelfAwardType = approvalAwardType;
    }

    // Real active employees in tenant-default-001
    // Manager: Devon Lane (a5278075-a350-47ff-8b7e-7ce68d2be9eb), user: c728f71f-5b0e-41a0-9520-f9553da1e818
    // Nominee: Sarah Connor (emp-bday-avatar-001), user: user-emp-001
    // Peer: Marcus Vance (07268c41-2493-4229-a9f2-3388d3428b9b), user: 5a61c806-46a9-4dd5-954c-7ec77e1b2141
    const manager = await prisma.employee.findUnique({
      where: { id: 'a5278075-a350-47ff-8b7e-7ce68d2be9eb' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true, managerId: true, status: true }
    });

    const nominee = await prisma.employee.findUnique({
      where: { id: 'emp-bday-avatar-001' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true, managerId: true, status: true }
    });

    const peer = await prisma.employee.findUnique({
      where: { id: '07268c41-2493-4229-a9f2-3388d3428b9b' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true, managerId: true, status: true }
    });

    const inactiveEmployee = await prisma.employee.findUnique({
      where: { id: '5f3b4a4e-5ed8-4613-9971-8e0e8508b475' },
      select: { id: true, firstName: true, lastName: true, email: true, userId: true, tenantId: true, managerId: true, status: true }
    });

    // Ensure reporting hierarchy: nominee.managerId = manager.id
    await prisma.$executeRawUnsafe(`
      UPDATE employees SET manager_id = '${manager.id}' WHERE id = '${nominee.id}'
    `);

    // Clean up any leftover test awards and nominations for clean lifecycle execution
    await prisma.award.deleteMany({
      where: {
        tenantId: tenantA.id,
        employeeId: { in: [nominee.id, peer.id, manager.id] },
        nominationId: { not: null }
      }
    });
    await prisma.awardNomination.deleteMany({
      where: {
        tenantId: tenantA.id,
        employeeId: { in: [nominee.id, peer.id, manager.id] }
      }
    });

    console.log(`   Manager: ${manager.firstName} ${manager.lastName} (${manager.id})`);
    console.log(`   Nominee: ${nominee.firstName} ${nominee.lastName} (${nominee.id}) -> reports to Manager`);
    console.log(`   Peer: ${peer.firstName} ${peer.lastName} (${peer.id})`);

    // Prepare auth tokens using registered user accounts
    const hrToken = makeToken({
      id: 'user-hr-001',
      email: 'hr@masterhrms.com',
      tenantId: tenantA.id,
      roles: ['hr_admin'],
      permissions: ['*']
    });

    const managerToken = makeToken({
      id: manager.userId,
      email: manager.email,
      tenantId: tenantA.id,
      roles: ['manager', 'employee'],
      permissions: ['nominations:submit', 'nominations:approve']
    });

    const peerToken = makeToken({
      id: peer.userId,
      email: peer.email,
      tenantId: tenantA.id,
      roles: ['employee'],
      permissions: ['nominations:submit', 'awards:view']
    });

    const nomineeToken = makeToken({
      id: nominee.userId,
      email: nominee.email,
      tenantId: tenantA.id,
      roles: ['employee'],
      permissions: ['nominations:submit', 'awards:view']
    });

    // 2. TEST: Submit HR Direct Nomination
    console.log('\n2. Testing HR Nomination Submission (POST /api/awards/nominations)...');
    const hrNomRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: '/api/awards/nominations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        }
      },
      {
        nomineeId: nominee.id,
        awardTypeId: approvalAwardType.id,
        nominationSource: 'HR',
        justification: 'Consistently exceptional technical excellence and core architectural design under heavy deadlines.',
        impactStatement: 'Reduced system latency by 45% and mentored 5 junior engineers.',
        recommendedReward: '₹25,000 spot bonus & citation plaque'
      }
    );
    if (hrNomRes.status !== 201) console.log('    [DEBUG] hrNomRes status:', hrNomRes.status, 'body:', hrNomRes.body);

    assert(hrNomRes.status === 201, `HR nomination returns 201 Created (got ${hrNomRes.status})`);
    assert(hrNomRes.body && hrNomRes.body.success === true, 'Response body indicates success');
    const createdNom1 = hrNomRes.body && hrNomRes.body.data;
    assert(createdNom1 && createdNom1.id, `Received valid nomination ID: ${createdNom1 ? createdNom1.id : 'none'}`);
    assert(createdNom1 && createdNom1.nominationNumber && createdNom1.nominationNumber.startsWith('NOM-'), `Nomination number format valid: ${createdNom1 ? createdNom1.nominationNumber : 'none'}`);
    assert(createdNom1 && createdNom1.status === 'PENDING', `Initial workflow status is PENDING (got ${createdNom1 ? createdNom1.status : 'none'})`);

    // 3. TEST: Policy Guard - Self Nomination Prevention
    console.log('\n3. Testing Self-Nomination Guard (Disallowed by Policy)...');
    const selfNomRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: '/api/awards/nominations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nomineeToken}`
        }
      },
      {
        nomineeId: nominee.id,
        awardTypeId: noSelfAwardType.id,
        nominationSource: 'SELF',
        justification: 'Self-nomination for leadership excellence.',
        impactStatement: 'Self appraisal claims.',
      }
    );
    assert(selfNomRes.status === 400, `Self-nomination is rejected with 400 Bad Request (got ${selfNomRes.status})`);

    // 4. TEST: Segregation of Duties - Nominator Cannot Approve Own Nomination
    console.log('\n4. Testing Segregation of Duties (Nominator Cannot Self-Approve)...');
    // Manager submits nomination for nominee 2 (Marcus / peer) so it's not a duplicate
    const mgrNomRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: '/api/awards/nominations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${managerToken}`
        }
      },
      {
        employeeId: peer.id,
        awardTypeId: approvalAwardType.id,
        nominationSource: 'MANAGER',
        reason: 'Manager nomination for outstanding client delivery and stakeholder management.',
        achievementDescription: 'Turned around high-risk account into enterprise renewal.'
      }
    );
    if (mgrNomRes.status !== 201) console.log('    [DEBUG] mgrNomRes status:', mgrNomRes.status, 'body:', mgrNomRes.body);
    const mgrNomId = mgrNomRes.body && mgrNomRes.body.data && mgrNomRes.body.data.id;

    // Manager attempts to approve their own submitted nomination without HR override
    const selfApproveRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${mgrNomId}/approve`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${managerToken}`
        }
      },
      { comment: 'Self approving my own submission' }
    );
    assert(selfApproveRes.status === 400, `Nominator self-approval is rejected with 400 Bad Request (got ${selfApproveRes.status})`);

    // 5. TEST: Segregation of Duties - Nominee Cannot Approve Own Nomination
    console.log('\n5. Testing Segregation of Duties (Nominee Cannot Self-Approve)...');
    const nomineeApproveRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${createdNom1.id}/approve`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nomineeToken}`
        }
      },
      { comment: 'Approving my own award' }
    );
    assert(nomineeApproveRes.status === 400 || nomineeApproveRes.status === 403, `Nominee self-approval is blocked with 400/403 (got ${nomineeApproveRes.status})`);

    // 6. TEST: Request Changes Workflow
    console.log('\n6. Testing Request Changes Workflow (POST /api/awards/nominations/:id/request-changes)...');
    const reqChangesRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${mgrNomId}/request-changes`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        }
      },
      { comment: 'Please attach metrics confirming client renewal value and specific quarter deliverables.' }
    );
    if (reqChangesRes.status !== 200) console.log('    [DEBUG] reqChangesRes status:', reqChangesRes.status, 'body:', reqChangesRes.body);
    assert(reqChangesRes.status === 200, `Request changes returns 200 OK (got ${reqChangesRes.status})`);
    assert(reqChangesRes.body && reqChangesRes.body.data && reqChangesRes.body.data.status === 'CHANGES_REQUESTED', `Nomination status transitioned to CHANGES_REQUESTED (got ${reqChangesRes.body?.data?.status})`);

    // 7. TEST: Rejection Workflow (Terminal State)
    console.log('\n7. Testing Rejection Workflow (POST /api/awards/nominations/:id/reject)...');
    const rejectRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${mgrNomId}/reject`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        }
      },
      { comment: 'Nomination criteria not met for this evaluation cycle.' }
    );
    if (rejectRes.status !== 200) console.log('    [DEBUG] rejectRes status:', rejectRes.status, 'body:', rejectRes.body);
    assert(rejectRes.status === 200, `Reject returns 200 OK (got ${rejectRes.status})`);
    assert(rejectRes.body && rejectRes.body.data && rejectRes.body.data.status === 'REJECTED', `Nomination status transitioned to REJECTED (got ${rejectRes.body?.data?.status})`);

    // Cannot issue award from rejected nomination
    const rejectIssueRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${mgrNomId}/issue`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        }
      },
      { awardDate: new Date().toISOString() }
    );
    assert(rejectIssueRes.status === 400, `Issuing from REJECTED nomination is rejected with 400 (got ${rejectIssueRes.status})`);

    // 8. TEST: Approval Workflow
    console.log('\n8. Testing Approval Progression (POST /api/awards/nominations/:id/approve)...');
    const approveRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${createdNom1.id}/approve`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${managerToken}`
        }
      },
      { comment: 'Approved by Executive Recognition Committee. Outstanding contributions verified.' }
    );
    if (approveRes.status !== 200) console.log('    [DEBUG] approveRes status:', approveRes.status, 'body:', approveRes.body);
    assert(approveRes.status === 200, `Approve returns 200 OK (got ${approveRes.status})`);
    assert(approveRes.body && approveRes.body.data && approveRes.body.data.status === 'APPROVED', `Nomination transitioned to APPROVED (got ${approveRes.body?.data?.status})`);

    // 9. TEST: Official Award Issuance (Conferment)
    console.log('\n9. Testing Official Award Issuance from Approved Nomination (POST /api/awards/nominations/:id/issue)...');
    const issueRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${createdNom1.id}/issue`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        }
      },
      {
        awardDate: new Date().toISOString(),
        giftValue: 25000,
        rewardPoints: 500,
        notes: 'Officially conferred following committee review and Step 3 automated verification.'
      }
    );
    if (issueRes.status !== 201) console.log('    [DEBUG] issueRes status:', issueRes.status, 'body:', issueRes.body);
    assert(issueRes.status === 201, `Official award issuance returns 201 Created (got ${issueRes.status})`);
    const issuedData = issueRes.body && issueRes.body.data;
    const returnedCert = issuedData && (issuedData.certificateNo || issuedData.certificateNumber);
    assert(Boolean(returnedCert), `Generated certificate number: ${returnedCert || 'none'}`);
    assert(issuedData && issuedData.nominationId === createdNom1.id, `Award links back to nominationId: ${issuedData ? issuedData.nominationId : 'none'}`);

    // Verify physical database state
    const dbAward = await prisma.award.findFirst({
      where: { nominationId: createdNom1.id }
    });
    assert(dbAward !== null, `Database has employee_awards record linked to nomination (${dbAward ? dbAward.id : 'none'})`);
    const dbCert = dbAward && (dbAward.certificateNo || dbAward.certificateNumber);
    assert(dbCert === returnedCert, 'Database certificateNumber matches API response');

    const dbNom = await prisma.awardNomination.findUnique({
      where: { id: createdNom1.id }
    });
    assert(dbNom && dbNom.status === 'AWARD_ISSUED', `AwardNomination database status is AWARD_ISSUED (got ${dbNom ? dbNom.status : 'none'})`);

    // 10. TEST: Idempotency Protection
    console.log('\n10. Testing Idempotency (Cannot Double-Issue Same Nomination)...');
    const doubleIssueRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: `/api/awards/nominations/${createdNom1.id}/issue`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        }
      },
      { awardDate: new Date().toISOString() }
    );
    assert(doubleIssueRes.status === 400 || doubleIssueRes.status === 409, `Repeated issuance on already issued nomination is rejected (got ${doubleIssueRes.status})`);

    // Verify count did not increase
    const awardCount = await prisma.award.count({
      where: { nominationId: createdNom1.id }
    });
    assert(awardCount === 1, `Exactly 1 award record exists in database for this nomination (got ${awardCount})`);

    // 11. TEST: Direct Award Override Policy
    console.log('\n11. Testing Direct Award Creation with Approval Policy...');
    // When requiresApproval = true, direct award without bypass permission should be guarded
    const nonHrEmployeeToken = makeToken({
      id: peer.userId || 'peer-user-001',
      email: peer.email,
      tenantId: tenantA.id,
      roles: ['employee'],
      permissions: ['awards:view']
    });
    const directAwardDeniedRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: '/api/awards',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nonHrEmployeeToken}`
        }
      },
      {
        employeeId: nominee.id,
        awardTypeId: approvalAwardType.id,
        awardDate: new Date().toISOString(),
        reason: 'Direct award without HR permission'
      }
    );
    assert(directAwardDeniedRes.status === 403, `Non-HR user cannot issue direct award (got ${directAwardDeniedRes.status})`);

    // 12. TEST: Multi-Tenant Boundary Isolation
    if (tenantB) {
      console.log('\n12. Testing Multi-Tenant Isolation (Tenant B cannot access Tenant A)...');
      const tenantBToken = makeToken({
        id: 'user-tenant-b-001',
        email: 'admin@tenantb.test',
        tenantId: tenantB.id,
        roles: ['hr_admin'],
        permissions: ['*']
      });

      // Tenant B queries nominations
      const tenantBNomsRes = await request({
        host: 'localhost',
        port: 4000,
        path: '/api/awards/nominations',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tenantBToken}` }
      });
      assert(tenantBNomsRes.status === 200, `Tenant B listing returns 200 OK (got ${tenantBNomsRes.status})`);
      const tenantBList = (tenantBNomsRes.body && tenantBNomsRes.body.data && tenantBNomsRes.body.data.nominations) || [];
      const leaked = tenantBList.some(n => n.tenantId === tenantA.id || n.id === createdNom1.id);
      assert(!leaked, 'Tenant B nominations list does NOT contain Tenant A nominations (0 cross-tenant leaks)');

      // Tenant B tries to approve Tenant A's nomination
      const crossApproveRes = await request(
        {
          host: 'localhost',
          port: 4000,
          path: `/api/awards/nominations/${createdNom1.id}/approve`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tenantBToken}`
          }
        },
        { comment: 'Cross tenant attempt' }
      );
      assert(crossApproveRes.status === 404, `Cross-tenant approval is rejected with 404 Not Found (got ${crossApproveRes.status})`);
    }

    // 13. TEST: Employee Self-Service Nominations API
    console.log('\n13. Testing Employee Self-Service API (GET & POST /api/me/awards/nominations)...');
    const essListRes = await request({
      host: 'localhost',
      port: 4000,
      path: '/api/me/awards/nominations',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${nomineeToken}` }
    });
    if (essListRes.status !== 200) console.log('    [DEBUG] essListRes status:', essListRes.status, 'body:', essListRes.body);
    assert(essListRes.status === 200, `ESS nominations list returns 200 OK (got ${essListRes.status})`);

    // Employee submits peer nomination for Marcus
    const peerSubmitRes = await request(
      {
        host: 'localhost',
        port: 4000,
        path: '/api/me/awards/nominations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nomineeToken}`
        }
      },
      {
        nomineeId: peer.id,
        awardTypeId: approvalAwardType.id,
        nominationSource: 'PEER',
        justification: 'Peer recognition for supportive mentorship during our cloud migration sprint.',
        impactStatement: 'Always unblocks team members with calm patience and deep guidance.'
      }
    );
    if (peerSubmitRes.status !== 201) console.log('    [DEBUG] peerSubmitRes status:', peerSubmitRes.status, 'body:', peerSubmitRes.body);
    assert(peerSubmitRes.status === 201, `ESS peer nomination submission returns 201 Created (got ${peerSubmitRes.status})`);

    console.log('\n================================================================');
    console.log(`LIFECYCLE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLifecycleTestSuite();
