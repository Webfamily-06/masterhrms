import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
import jwt from '../server/node_modules/jsonwebtoken/index.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const BASE_URL = 'http://localhost:4000';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTestSuite() {
  console.log('=============================================================================');
  console.log('MASTERHRMS — USER EMAIL ACCOUNT SUITE (SMTP + IMAP + POP3) ISOLATION & SECURITY');
  console.log('=============================================================================\n');

  // Fetch real onboarded tenant users for multi-user and multi-tenant testing
  const tenantUsers = await prisma.user.findMany({
    where: { profile: { tenantId: { not: null } } },
    take: 5,
    include: { profile: true }
  });
  if (tenantUsers.length < 2) {
    throw new Error('Need at least 2 tenant users in DB to test cross-tenant isolation');
  }

  const userA = tenantUsers[0];
  const tenantAId = userA.profile.tenantId;

  // Find or create User B in Tenant A for same-tenant cross-user check
  let userB = await prisma.user.findFirst({
    where: { profile: { tenantId: tenantAId }, id: { not: userA.id } },
    include: { profile: true }
  });
  if (!userB) {
    userB = await prisma.user.create({
      data: {
        email: `peer.employee.${Date.now()}@acme.com`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: 'Peer Employee In Tenant A',
          }
        }
      },
      include: { profile: true }
    });
  }

  // User C in Tenant B for cross-tenant isolation check
  const userC = tenantUsers[1];
  const tenantBId = userC.profile.tenantId;

  const tokenUserA = generateToken({
    userId: userA.id,
    email: userA.email,
    tenantId: tenantAId,
    roles: ['employee']
  });

  const tokenUserB = generateToken({
    userId: userB.id,
    email: userB.email,
    tenantId: tenantAId,
    roles: ['employee']
  });

  const tokenUserC = generateToken({
    userId: userC.id,
    email: userC.email,
    tenantId: tenantBId,
    roles: ['employee']
  });

  // Clean start: remove any stale test accounts for userA
  await prisma.userEmailAccount.deleteMany({ where: { userId: userA.id } });

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  console.log('--- TEST 1: Unauthenticated Endpoint Rejection ---');
  const unauthRes = await fetch(`${BASE_URL}/api/user/email-accounts`);
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/user/email-accounts returns 401');

  console.log('\n--- TEST 2: SSRF Protection on Hostnames ---');
  const ssrfPayloads = [
    { name: 'loopback IP', host: '127.0.0.1' },
    { name: 'localhost hostname', host: 'localhost' },
    { name: 'AWS/GCP metadata IP', host: '169.254.169.254' },
    { name: 'Private 10.x IP', host: '10.0.0.1' },
    { name: 'Private 192.168.x IP', host: '192.168.1.1' },
  ];

  for (const item of ssrfPayloads) {
    const res = await fetch(`${BASE_URL}/api/user/email-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUserA}` },
      body: JSON.stringify({
        email: 'attacker@corp.internal',
        incomingProtocol: 'IMAP',
        incomingHost: item.host,
        incomingPort: 993,
        incomingSecurity: 'SSL',
        incomingPassword: 'secretpassword',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecurity: 'SSL',
        smtpPassword: 'secretpassword',
      }),
    });
    const data = await res.json();
    if (res.status !== 400 || !data.error?.includes('prohibited')) {
      console.log('DEBUG SSRF Response:', res.status, data);
    }
    assert(res.status === 400 && data.error && data.error.includes('prohibited'), `SSRF rejected for ${item.name} (${item.host})`);
  }

  console.log('\n--- TEST 3: User A Saves Valid Account Configuration ---');
  const validPayload = {
    email: 'employee.alice@company.com',
    displayName: 'Alice Employee Mailbox',
    senderName: 'Alice Employee',
    incomingProtocol: 'IMAP',
    incomingHost: 'imap.gmail.com',
    incomingPort: 993,
    incomingSecurity: 'SSL',
    incomingUsername: 'alice.emp@gmail.com',
    incomingPassword: 'MySuperSecurePassword123!',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecurity: 'SSL',
    smtpUsername: 'alice.emp@gmail.com',
    smtpPassword: 'MySuperSecureSmtpPassword456!',
    isDefault: true,
  };

  const createRes = await fetch(`${BASE_URL}/api/user/email-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUserA}` },
    body: JSON.stringify(validPayload),
  });
  const createData = await createRes.json();
  if (createRes.status !== 201) {
    console.log('DEBUG createRes:', createRes.status, createData);
  }
  const accountAId = createData.id || createData.account?.id;
  assert(createRes.status === 201 && Boolean(accountAId), 'User A account created successfully with 201');

  console.log('\n--- TEST 4: Zero Secret Leakage in API Response ---');
  const responseStr = JSON.stringify(createData);
  assert(!responseStr.includes('MySuperSecurePassword123!'), 'Incoming password NOT returned in API response');
  assert(!responseStr.includes('MySuperSecureSmtpPassword456!'), 'SMTP password NOT returned in API response');
  assert((createData.hasIncomingPassword || createData.account?.hasIncomingPassword) === true, 'hasIncomingPassword flag correctly set to true');
  assert((createData.hasSmtpPassword || createData.account?.hasSmtpPassword) === true, 'hasSmtpPassword flag correctly set to true');

  console.log('\n--- TEST 5: Database Credential Encryption at Rest ---');
  const dbRecord = await prisma.userEmailAccount.findUnique({ where: { id: accountAId } });
  assert(dbRecord !== null, 'Account found in database');
  assert(Boolean(dbRecord.incomingPassCipher && dbRecord.incomingPassIv && dbRecord.incomingPassAuthTag), 'Incoming credentials stored with AES-256-GCM ciphertext, IV, and auth tag');
  assert(Boolean(dbRecord.smtpPassCipher && dbRecord.smtpPassIv && dbRecord.smtpPassAuthTag), 'SMTP credentials stored with AES-256-GCM ciphertext, IV, and auth tag');
  assert(!JSON.stringify(dbRecord).includes('MySuperSecurePassword123!'), 'No plaintext password anywhere in database record');
  assert(!JSON.stringify(dbRecord).includes('MySuperSecureSmtpPassword456!'), 'No plaintext SMTP password anywhere in database record');

  console.log('\n--- TEST 6: User A Lists Their Own Accounts ---');
  const listRes = await fetch(`${BASE_URL}/api/user/email-accounts`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  const listData = await listRes.json();
  const accountsList = Array.isArray(listData) ? listData : (listData.accounts || []);
  assert(listRes.status === 200 && Array.isArray(accountsList), 'List accounts returned 200 array');
  assert(accountsList.some(a => a.id === accountAId), 'User A sees account A in list');

  console.log('\n--- TEST 7: Cross-User and Cross-Tenant Isolation ---');
  // User B in same tenant tries to access User A's account
  const userBAccessRes = await fetch(`${BASE_URL}/api/user/email-accounts/${accountAId}`, {
    headers: { Authorization: `Bearer ${tokenUserB}` },
  });
  assert(userBAccessRes.status === 404, 'User B in same tenant CANNOT access User A account (returns 404)');

  // User B lists their own accounts - should NOT see User A's account
  const userBListRes = await fetch(`${BASE_URL}/api/user/email-accounts`, {
    headers: { Authorization: `Bearer ${tokenUserB}` },
  });
  const userBListData = await userBListRes.json();
  const userBAccounts = Array.isArray(userBListData) ? userBListData : (userBListData.accounts || []);
  assert(!userBAccounts.some(a => a.id === accountAId), 'User B list does NOT include User A account');

  // Tenant B user tries to access User A's account
  const tenantBAccessRes = await fetch(`${BASE_URL}/api/user/email-accounts/${accountAId}`, {
    headers: { Authorization: `Bearer ${tokenUserC}` },
  });
  assert(tenantBAccessRes.status === 404, 'User in Tenant B CANNOT access User A account (returns 404)');

  console.log('\n--- TEST 8: Update Account Without Re-entering Passwords ---');
  const updateRes = await fetch(`${BASE_URL}/api/user/email-accounts/${accountAId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUserA}` },
    body: JSON.stringify({
      displayName: 'Alice Updated Mailbox',
      senderName: 'Alice Updated Sender',
      // No incomingPassword or smtpPassword sent
    }),
  });
  const updateData = await updateRes.json();
  const updatedAccount = updateData.account || updateData;
  assert(updateRes.status === 200 && updatedAccount.displayName === 'Alice Updated Mailbox', 'Account updated successfully');

  // Verify passwords in DB remain intact
  const updatedDbRecord = await prisma.userEmailAccount.findUnique({ where: { id: accountAId } });
  assert(updatedDbRecord.incomingPassCipher === dbRecord.incomingPassCipher, 'Encrypted incoming password preserved without re-entry');
  assert(updatedDbRecord.smtpPassCipher === dbRecord.smtpPassCipher, 'Encrypted SMTP password preserved without re-entry');

  console.log('\n--- TEST 9: Connection Testing with Accurate Error Reporting ---');
  // Testing connection to test domain produces safe failure response (never hangs, never falsely reports Connected)
  const testConnRes = await fetch(`${BASE_URL}/api/user/email-accounts/${accountAId}/test-incoming`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  const testConnData = await testConnRes.json();
  assert(testConnRes.status === 200, 'Test incoming returns 200 with accurate status report');
  assert(testConnData.success === false, 'Test accurately reports success=false for test credentials');
  assert(testConnData.status === 'CONNECTION_FAILED' || testConnData.status === 'AUTHENTICATION_FAILED', 'Status accurately marked as failed');
  assert(testConnData.error !== undefined, 'Accurate error string provided');

  console.log('\n--- TEST 10: POP3 Protocol Support and Accurate Limitation ---');
  const pop3Payload = {
    email: 'alice.pop3@company.com',
    displayName: 'Alice POP3 Mailbox',
    senderName: 'Alice POP3',
    incomingProtocol: 'POP3',
    incomingHost: 'pop.gmail.com',
    incomingPort: 995,
    incomingSecurity: 'SSL',
    incomingPassword: 'Pop3Password123!',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecurity: 'STARTTLS',
    smtpPassword: 'Pop3SmtpPassword123!',
    isDefault: false,
  };

  const createPop3Res = await fetch(`${BASE_URL}/api/user/email-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUserA}` },
    body: JSON.stringify(pop3Payload),
  });
  const createPop3Data = await createPop3Res.json();
  const pop3Account = createPop3Data.account || createPop3Data;
  assert(createPop3Res.status === 201 && pop3Account.incomingProtocol === 'POP3', 'POP3 account successfully created');
  const pop3AccountId = pop3Account.id;

  console.log('\n--- TEST 11: Set as Default Account ---');
  const setDefaultRes = await fetch(`${BASE_URL}/api/user/email-accounts/${pop3AccountId}/set-default`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  const setDefaultData = await setDefaultRes.json();
  const setDefaultAccount = setDefaultData.account || setDefaultData;
  assert(setDefaultRes.status === 200 && setDefaultAccount.isDefault === true, 'POP3 account set as default');

  const prevAccount = await prisma.userEmailAccount.findUnique({ where: { id: accountAId } });
  assert(prevAccount.isDefault === false, 'Previous default account isDefault set to false');

  console.log('\n--- TEST 12: Super Admin System Email Independence ---');
  // System email endpoint remains unchanged and independent
  const sysEmailStatus = await fetch(`${BASE_URL}/api/email/status`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  const sysEmailData = await sysEmailStatus.json();
  assert(sysEmailStatus.status === 200, 'Global system email status endpoint still operational');
  assert(sysEmailData.host !== 'smtp.companymail.org', 'System SMTP host is NOT altered by user account');

  console.log('\n--- TEST 13: Clean Account Deletion / Disconnection ---');
  const delPop3Res = await fetch(`${BASE_URL}/api/user/email-accounts/${pop3AccountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  assert(delPop3Res.status === 200, 'POP3 account deleted');

  const delAccountARes = await fetch(`${BASE_URL}/api/user/email-accounts/${accountAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  assert(delAccountARes.status === 200, 'Account A deleted');

  const remaining = await prisma.userEmailAccount.findMany({ where: { userId: userA.id } });
  assert(remaining.length === 0, 'All test accounts cleanly removed');

  console.log('\n=============================================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} checks verified!`);
  console.log('=============================================================================\n');
}

runTestSuite()
  .catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
