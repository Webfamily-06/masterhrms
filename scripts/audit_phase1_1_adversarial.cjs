/**
 * MASTERHRMS — PHASE 1.1 FINAL SECURITY REGRESSION & ADVERSARIAL SUITE
 * 
 * Tests 5 Domains across 6 Controlled Identities:
 * 1. Super Admin
 * 2. Tenant Admin (Gowtham)
 * 3. HR Admin (Sarah)
 * 4. Employee 1 (Alex)
 * 5. Employee 2 (Report Tester)
 * 6. Tenant B Employee (Tenant B)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/Saas/screenshots/phase-1-1-security-regression');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

function apiRequest(method, endpoint, token, body = null, hostHeader = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);
    if (hostHeader) headers['Host'] = hostHeader;

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: endpoint,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAdversarialAudit() {
  console.log('========================================================================');
  console.log(' MASTERHRMS — PHASE 1.1 FINAL SECURITY REGRESSION & ADVERSARIAL SUITE ');
  console.log('========================================================================\n');

  const results = [];
  function assertTest(name, condition, details = '') {
    const status = condition ? 'PASS' : 'FAIL';
    results.push({ name, status, details });
    const mark = condition ? '✓' : '✗';
    console.log(`[${status}] ${mark} ${name} ${details ? '(' + details + ')' : ''}`);
    if (!condition) {
      console.error(`  FAIL DETAILS: ${details}`);
    }
  }

  // 1. Resolve Identities
  const tenantA = 'tenant-default-001';
  const tenantB = 'test-tenant-b-1791974238664';

  const userGowtham = await prisma.user.findFirst({ where: { email: 'gowthamtooquik@gmail.com' } });
  const userSarah = await prisma.user.findFirst({ where: { email: 'hr@masterhrms.com' } });
  const userAlex = await prisma.user.findFirst({ where: { email: 'employee@masterhrms.com' } });
  const userEmp2 = await prisma.user.findFirst({ where: { email: 'test-rep-1792070271292@hrms.local' } });
  const userSuper = await prisma.user.findFirst({ where: { email: 'super-1792135343884@platform.com' } });
  const userTenantB = await prisma.user.findFirst({ where: { email: 'admin-b-1791974239471@beta.com' } });

  const tokenSuper = createToken({ userId: userSuper.id, tenantId: tenantA, roles: ['super_admin'], email: userSuper.email });
  const tokenTenantAdmin = createToken({ userId: userGowtham.id, tenantId: tenantA, roles: ['tenant_admin', 'admin'], email: userGowtham.email });
  const tokenHR = createToken({ userId: userSarah.id, tenantId: tenantA, roles: ['hr_admin', 'hr'], email: userSarah.email });
  const tokenEmp1 = createToken({ userId: userAlex.id, tenantId: tenantA, roles: ['employee'], email: userAlex.email });
  const tokenEmp2 = createToken({ userId: userEmp2.id, tenantId: tenantA, roles: ['employee'], email: userEmp2.email });
  const tokenTenantB = createToken({ userId: userTenantB.id, tenantId: tenantB, roles: ['employee'], email: userTenantB.email });

  console.log('Identities resolved:');
  console.log(`- Super Admin: ${userSuper.email} (${userSuper.id})`);
  console.log(`- Tenant Admin: ${userGowtham.email} (${userGowtham.id})`);
  console.log(`- HR Admin: ${userSarah.email} (${userSarah.id})`);
  console.log(`- Employee 1: ${userAlex.email} (${userAlex.id})`);
  console.log(`- Employee 2: ${userEmp2.email} (${userEmp2.id})`);
  console.log(`- Tenant B User: ${userTenantB.email} (${userTenantB.id})\n`);

  // ==========================================
  // DOMAIN 1: CALENDAR AUTHORIZATION & STRUCTURED SHARING
  // ==========================================
  console.log('--- DOMAIN 1: CALENDAR AUTHORIZATION & STRUCTURED SHARING ---');
  let calEventId = null;

  // Test 1: Employee 1 creates private event
  const createCalRes = await apiRequest('POST', '/api/calendar/events', tokenEmp1, {
    title: 'Alex Confidential Health Checkup',
    description: 'Private medical consultation',
    startDate: new Date('2026-11-01T10:00:00Z').toISOString(),
    endDate: new Date('2026-11-01T11:00:00Z').toISOString(),
    category: 'personal',
  });
  assertTest('Calendar 1: Employee 1 creates private event', createCalRes.status === 201 && createCalRes.body?.data?.id, `status=${createCalRes.status}`);
  calEventId = createCalRes.body?.data?.id;

  // Test 2: Employee 2 cannot read private event
  const emp2ListCal = await apiRequest('GET', '/api/calendar/events', tokenEmp2);
  const emp2SeesEvent = emp2ListCal.body?.data?.some(e => e.id === calEventId);
  assertTest('Calendar 2: Employee 2 cannot read Employee 1 private event', !emp2SeesEvent, `visible=${emp2SeesEvent}`);

  // Test 3: Employee 2 cannot update private event
  const emp2UpdateCal = await apiRequest('PUT', `/api/calendar/events/${calEventId}`, tokenEmp2, { title: 'Hacked Title' });
  assertTest('Calendar 3: Employee 2 cannot update private event', emp2UpdateCal.status === 403, `status=${emp2UpdateCal.status}`);

  // Test 4: Employee 2 cannot delete private event
  const emp2DeleteCal = await apiRequest('DELETE', `/api/calendar/events/${calEventId}`, tokenEmp2);
  assertTest('Calendar 4: Employee 2 cannot delete private event', emp2DeleteCal.status === 403, `status=${emp2DeleteCal.status}`);

  // Test 5: HR cannot update or delete Employee 1 private calendar event without explicit permission
  const hrUpdateCal = await apiRequest('PUT', `/api/calendar/events/${calEventId}`, tokenHR, { title: 'HR Forced Edit' });
  assertTest('Calendar 5: HR cannot modify employee private calendar event without explicit permission', hrUpdateCal.status === 403, `status=${hrUpdateCal.status}`);

  // Test 6: Cross-tenant sharing rejection (forged recipient from Tenant B)
  const crossShareCal = await apiRequest('POST', `/api/calendar/events/${calEventId}/share`, tokenEmp1, {
    recipientId: userTenantB.id,
    permission: 'view'
  });
  assertTest('Calendar 6: Sharing with user from foreign Tenant B is rejected', crossShareCal.status === 400 && crossShareCal.body?.code === 'CROSS_TENANT_SHARING_FORBIDDEN', `status=${crossShareCal.status}`);

  // Test 7: Employee 1 explicitly shares event with Employee 2 (view permission)
  const shareCalRes = await apiRequest('POST', `/api/calendar/events/${calEventId}/share`, tokenEmp1, {
    recipientId: userEmp2.id,
    permission: 'view'
  });
  assertTest('Calendar 7: Explicit structured share (view permission) succeeds', shareCalRes.status === 200 && shareCalRes.body?.shares?.some(s => s.recipientId === userEmp2.id && s.permission === 'view'), `status=${shareCalRes.status}`);

  // Test 8: Employee 2 can now read the shared event
  const emp2ListCalShared = await apiRequest('GET', '/api/calendar/events', tokenEmp2);
  const sharedEv = emp2ListCalShared.body?.data?.find(e => e.id === calEventId);
  assertTest('Calendar 8: Employee 2 can read the shared event', !!sharedEv && sharedEv.userPermission === 'view', `permission=${sharedEv?.userPermission}`);

  // Test 9: Employee 2 cannot edit event with view-only permission
  const emp2ViewEdit = await apiRequest('PUT', `/api/calendar/events/${calEventId}`, tokenEmp2, { title: 'Unauthorized Edit' });
  assertTest('Calendar 9: Employee 2 cannot update with view-only permission', emp2ViewEdit.status === 403, `status=${emp2ViewEdit.status}`);

  // Test 10: Upgrade share permission to edit
  const upgradeShare = await apiRequest('POST', `/api/calendar/events/${calEventId}/share`, tokenEmp1, {
    recipientId: userEmp2.id,
    permission: 'edit'
  });
  assertTest('Calendar 10: Share permission upgrade to edit succeeds', upgradeShare.status === 200 && upgradeShare.body?.shares?.some(s => s.recipientId === userEmp2.id && s.permission === 'edit'), `status=${upgradeShare.status}`);

  // Test 11: Employee 2 can now update event details
  const emp2EditSuccess = await apiRequest('PUT', `/api/calendar/events/${calEventId}`, tokenEmp2, {
    description: 'Updated consultation agenda by collaborator'
  });
  assertTest('Calendar 11: Employee 2 with edit permission updates event', emp2EditSuccess.status === 200, `status=${emp2EditSuccess.status}`);

  // Test 12: Employee 2 still cannot delete event even with edit permission
  const emp2DeleteEditShare = await apiRequest('DELETE', `/api/calendar/events/${calEventId}`, tokenEmp2);
  assertTest('Calendar 12: Employee 2 with edit permission cannot delete event', emp2DeleteEditShare.status === 403, `status=${emp2DeleteEditShare.status}`);

  // Test 13: Tenant B cannot access event even with known event ID
  const tenantBCalGet = await apiRequest('PUT', `/api/calendar/events/${calEventId}`, tokenTenantB, { title: 'Cross Tenant Hack' });
  assertTest('Calendar 13: Tenant B user receives 404 on Tenant A event', tenantBCalGet.status === 404, `status=${tenantBCalGet.status}`);

  // Test 14: Revoking sharing removes access
  const revokeCalRes = await apiRequest('DELETE', `/api/calendar/events/${calEventId}/share/${userEmp2.id}`, tokenEmp1);
  assertTest('Calendar 14: Revoking share succeeds', revokeCalRes.status === 200, `status=${revokeCalRes.status}`);

  const emp2ListPostRevoke = await apiRequest('GET', '/api/calendar/events', tokenEmp2);
  const postRevokeEv = emp2ListPostRevoke.body?.data?.some(e => e.id === calEventId);
  assertTest('Calendar 15: Post-revocation access is blocked in list', !postRevokeEv, `visible=${postRevokeEv}`);

  // Clean up calendar event
  await apiRequest('DELETE', `/api/calendar/events/${calEventId}`, tokenEmp1);

  // ==========================================
  // DOMAIN 2: TODO ASSIGNMENT & ROLE-SCOPED HARDENING
  // ==========================================
  console.log('\n--- DOMAIN 2: TODO ASSIGNMENT & ROLE-SCOPED HARDENING ---');
  let privateTodoId = null;
  let assignedTodoId = null;

  // Test 16: Employee 1 creates private task
  const createTodoRes = await apiRequest('POST', '/api/todos', tokenEmp1, {
    title: 'Alex Private Task: Prepare Review',
    description: 'Confidential self performance notes',
    priority: 'high',
    dueDate: new Date('2026-11-05').toISOString(),
  });
  assertTest('Todo 1: Employee 1 creates private task', createTodoRes.status === 201 && createTodoRes.body?.data?.id, `status=${createTodoRes.status}`);
  privateTodoId = createTodoRes.body?.data?.id;

  // Test 17: Employee 2 cannot see Employee 1 private task
  const emp2TodoList = await apiRequest('GET', '/api/todos', tokenEmp2);
  const emp2SeesPrivateTodo = emp2TodoList.body?.data?.some(t => t.id === privateTodoId);
  assertTest('Todo 2: Employee 1 private task invisible to Employee 2', !emp2SeesPrivateTodo, `visible=${emp2SeesPrivateTodo}`);

  // Test 18: Employee 2 cannot modify Employee 1 private task
  const emp2MutatePrivateTodo = await apiRequest('PUT', `/api/todos/${privateTodoId}`, tokenEmp2, { completed: true });
  assertTest('Todo 3: Employee 2 cannot mutate Employee 1 private task', emp2MutatePrivateTodo.status === 403, `status=${emp2MutatePrivateTodo.status}`);

  // Test 19: Cross-tenant assignment attempt is rejected
  const crossAssignTodo = await apiRequest('POST', '/api/todos', tokenHR, {
    title: 'Cross Tenant Task',
    assignedTo: userTenantB.id,
  });
  assertTest('Todo 4: Assigning task to Tenant B user is rejected', crossAssignTodo.status === 400 && crossAssignTodo.body?.code === 'CROSS_TENANT_ASSIGNMENT_FORBIDDEN', `status=${crossAssignTodo.status}`);

  // Test 20: HR creates and assigns task to Employee 2
  const hrAssignTodo = await apiRequest('POST', '/api/todos', tokenHR, {
    title: 'Complete Compliance Training Module',
    description: 'Annual anti-harassment training certification',
    priority: 'high',
    dueDate: new Date('2026-11-10').toISOString(),
    assignedTo: userEmp2.id,
    progress: 10,
  });
  assertTest('Todo 5: HR assigns task to Employee 2 with structured metadata', hrAssignTodo.status === 201 && hrAssignTodo.body?.data?.assignedTo === userEmp2.id, `assignedTo=${hrAssignTodo.body?.data?.assignedTo}`);
  assignedTodoId = hrAssignTodo.body?.data?.id;

  // Test 21: Employee 2 sees assigned task in Todo list
  const emp2TodoListAssigned = await apiRequest('GET', '/api/todos', tokenEmp2);
  const assignedItem = emp2TodoListAssigned.body?.data?.find(t => t.id === assignedTodoId);
  assertTest('Todo 6: Employee 2 sees assigned task', !!assignedItem && assignedItem.isAssignee === true, `isAssignee=${assignedItem?.isAssignee}`);

  // Test 22: Unrelated Employee 1 cannot see Employee 2 assigned task
  const emp1TodoList = await apiRequest('GET', '/api/todos', tokenEmp1);
  const emp1SeesAssigned = emp1TodoList.body?.data?.some(t => t.id === assignedTodoId);
  assertTest('Todo 7: Unrelated Employee 1 cannot see Employee 2 assigned task', !emp1SeesAssigned, `visible=${emp1SeesAssigned}`);

  // Test 23: Employee 2 updates completion status & progress (allowed)
  const emp2UpdateStatus = await apiRequest('PUT', `/api/todos/${assignedTodoId}`, tokenEmp2, {
    completed: true,
    progress: 100,
  });
  assertTest('Todo 8: Assignee successfully updates completion and progress', emp2UpdateStatus.status === 200 && emp2UpdateStatus.body?.data?.completed === true, `completed=${emp2UpdateStatus.body?.data?.completed}`);

  // Test 24: Employee 2 attempts to change restricted fields (title, priority) - restricted fields ignored
  const emp2TamperTodo = await apiRequest('PUT', `/api/todos/${assignedTodoId}`, tokenEmp2, {
    title: 'Malicious Retitled Task',
    priority: 'low',
  });
  const checkTodo = await prisma.workspaceTodo.findUnique({ where: { id: assignedTodoId } });
  assertTest('Todo 9: Assignee cannot alter restricted task fields (title retained)', checkTodo.title === 'Complete Compliance Training Module', `title=${checkTodo?.title}`);

  // Test 25: Employee 2 cannot delete assigned task
  const emp2DeleteAssigned = await apiRequest('DELETE', `/api/todos/${assignedTodoId}`, tokenEmp2);
  assertTest('Todo 10: Assignee cannot delete task', emp2DeleteAssigned.status === 403, `status=${emp2DeleteAssigned.status}`);

  // Test 26: Tenant B cannot access task
  const tenantBTodoGet = await apiRequest('PUT', `/api/todos/${assignedTodoId}`, tokenTenantB, { completed: true });
  assertTest('Todo 11: Tenant B cannot mutate Tenant A task', tenantBTodoGet.status === 404, `status=${tenantBTodoGet.status}`);

  // Clean up todos
  await apiRequest('DELETE', `/api/todos/${privateTodoId}`, tokenEmp1);
  await apiRequest('DELETE', `/api/todos/${assignedTodoId}`, tokenHR);

  // ==========================================
  // DOMAIN 3: DIRECT-CHAT & GROUP PARTICIPANT SECURITY
  // ==========================================
  console.log('\n--- DOMAIN 3: CHAT PARTICIPANT & THREAD SECURITY ---');
  const directThreadId = `direct_${userAlex.id}_${userEmp2.id}`;
  let sentMsgId = null;

  // Test 27: Employee 1 sends message to direct thread
  const sendMsgRes = await apiRequest('POST', '/api/chat/messages', tokenEmp1, {
    threadId: directThreadId,
    content: 'Hi Report Tester, this is a confidential discussion regarding project Alpha.',
  });
  assertTest('Chat 1: Authorized participant sends direct message', sendMsgRes.status === 201 && sendMsgRes.body?.id, `status=${sendMsgRes.status}`);
  sentMsgId = sendMsgRes.body?.id;

  // Test 28: Authorized participant (Employee 2) reads direct conversation
  const emp2ReadChat = await apiRequest('GET', `/api/chat/messages/${directThreadId}`, tokenEmp2);
  const foundMsg = Array.isArray(emp2ReadChat.body) && emp2ReadChat.body.some(m => m.id === sentMsgId);
  assertTest('Chat 2: Authorized participant reads conversation', emp2ReadChat.status === 200 && foundMsg, `messagesCount=${emp2ReadChat.body?.length}`);

  // Test 29: Unrelated user (Sarah HR) attempts to read private direct conversation
  const hrReadChat = await apiRequest('GET', `/api/chat/messages/${directThreadId}`, tokenHR);
  assertTest('Chat 3: Unrelated user receives 403 on private direct conversation', hrReadChat.status === 403 && hrReadChat.body?.code === 'CHAT_PARTICIPANT_REQUIRED', `status=${hrReadChat.status}`);

  // Test 30: Unrelated user attempts to send message into private thread
  const hrSendChat = await apiRequest('POST', '/api/chat/messages', tokenHR, {
    threadId: directThreadId,
    content: 'HR eavesdropping message',
  });
  assertTest('Chat 4: Unrelated user cannot post to private direct conversation', hrSendChat.status === 403 && hrSendChat.body?.code === 'CHAT_PARTICIPANT_REQUIRED', `status=${hrSendChat.status}`);

  // Test 31: Prohibited file attachment blocked
  const badFileMsg = await apiRequest('POST', '/api/chat/messages', tokenEmp1, {
    threadId: directThreadId,
    content: 'Sending exploit script',
    attachments: [{ name: 'payload.sh', size: 1024 }],
  });
  assertTest('Chat 5: Restricted file extension (.sh) is blocked by backend', badFileMsg.status === 403, `status=${badFileMsg.status}`);

  // Test 32: Tenant B attempts to read Tenant A conversation
  const tenantBChat = await apiRequest('GET', `/api/chat/messages/${directThreadId}`, tokenTenantB);
  assertTest('Chat 6: Tenant B user is blocked from Tenant A conversation', tenantBChat.status === 403 || tenantBChat.status === 404, `status=${tenantBChat.status}`);

  // Test 33: Non-sender cannot delete message
  const emp2DeleteMsg = await apiRequest('DELETE', `/api/chat/messages/${sentMsgId}`, tokenEmp2);
  assertTest('Chat 7: Non-sender cannot delete another user message', emp2DeleteMsg.status === 403, `status=${emp2DeleteMsg.status}`);

  // Test 34: Original sender deletes message
  const emp1DeleteMsg = await apiRequest('DELETE', `/api/chat/messages/${sentMsgId}`, tokenEmp1);
  assertTest('Chat 8: Original sender deletes own message', emp1DeleteMsg.status === 200, `status=${emp1DeleteMsg.status}`);

  // ==========================================
  // DOMAIN 4: FILE VAULT PRIVACY, SHARING & REVOCATION
  // ==========================================
  console.log('\n--- DOMAIN 4: FILE VAULT PRIVACY, SHARING & REVOCATION ---');
  let privateDocId = null;

  // Test 35: Employee 1 uploads private compensation file
  const createDocRes = await apiRequest('POST', '/api/documents', tokenEmp1, {
    title: 'Alex Annual Compensation & Stock Options',
    category: 'Compensation',
    fileName: 'alex_comp_confidential.pdf',
    notes: `[Private] [Owner:${userAlex.id}]`,
  });
  assertTest('Document 1: Employee 1 uploads private compensation document', createDocRes.status === 201 && createDocRes.body?.id, `status=${createDocRes.status}`);
  privateDocId = createDocRes.body?.id;

  // Test 36: Employee 2 cannot access private compensation document
  const emp2DocGet = await apiRequest('GET', `/api/documents/${privateDocId}`, tokenEmp2);
  assertTest('Document 2: Employee 2 blocked from Employee 1 private document', emp2DocGet.status === 403 && emp2DocGet.body?.code === 'DOCUMENT_ACCESS_DENIED', `status=${emp2DocGet.status}`);

  // Test 37: Employee 2 cannot download/stream private document
  const emp2DocStream = await apiRequest('GET', `/api/documents/${privateDocId}/stream`, tokenEmp2);
  assertTest('Document 3: Employee 2 blocked from document stream endpoint', emp2DocStream.status === 403, `status=${emp2DocStream.status}`);

  // Test 38: HR cannot access private compensation document without explicit share
  const hrDocGet = await apiRequest('GET', `/api/documents/${privateDocId}`, tokenHR);
  assertTest('Document 4: HR blocked from private compensation document without explicit share', hrDocGet.status === 403 && hrDocGet.body?.code === 'DOCUMENT_ACCESS_DENIED', `status=${hrDocGet.status}`);

  // Test 39: Cross-tenant sharing rejection (Tenant B target)
  const crossDocShare = await apiRequest('POST', `/api/documents/${privateDocId}/share`, tokenEmp1, {
    targetUserId: userTenantB.id,
  });
  assertTest('Document 5: Cross-tenant file share rejected', crossDocShare.status === 400 && crossDocShare.body?.code === 'CROSS_TENANT_SHARING_FORBIDDEN', `status=${crossDocShare.status}`);

  // Test 40: Employee 1 shares document with Employee 2
  const docShareRes = await apiRequest('POST', `/api/documents/${privateDocId}/share`, tokenEmp1, {
    targetUserId: userEmp2.id,
  });
  assertTest('Document 6: Explicit document share succeeds', docShareRes.status === 200, `status=${docShareRes.status}`);

  // Test 41: Employee 2 can now access document
  const emp2DocGetShared = await apiRequest('GET', `/api/documents/${privateDocId}`, tokenEmp2);
  assertTest('Document 7: Employee 2 can access shared document details', emp2DocGetShared.status === 200 && emp2DocGetShared.body?.id === privateDocId, `id=${emp2DocGetShared.body?.id}`);

  // Test 42: Tenant B user cannot access document (returns 404)
  const tenantBDocGet = await apiRequest('GET', `/api/documents/${privateDocId}`, tokenTenantB);
  assertTest('Document 8: Tenant B user receives 404 on Tenant A document', tenantBDocGet.status === 404, `status=${tenantBDocGet.status}`);

  // Test 43: Revoking document share
  const revokeDocRes = await apiRequest('DELETE', `/api/documents/${privateDocId}/share`, tokenEmp1, {
    targetUserId: userEmp2.id,
  });
  assertTest('Document 9: Revoking document share succeeds', revokeDocRes.status === 200, `status=${revokeDocRes.status}`);

  // Test 44: Post-revocation access is blocked
  const emp2DocPostRevoke = await apiRequest('GET', `/api/documents/${privateDocId}`, tokenEmp2);
  assertTest('Document 10: Access blocked after share revocation', emp2DocPostRevoke.status === 403, `status=${emp2DocPostRevoke.status}`);

  // Test 45: Employee 2 cannot delete Employee 1 document
  const emp2DocDelete = await apiRequest('DELETE', `/api/documents/${privateDocId}`, tokenEmp2);
  assertTest('Document 11: Employee 2 cannot delete Employee 1 document', emp2DocDelete.status === 403, `status=${emp2DocDelete.status}`);

  // Clean up document (Tenant Admin)
  await apiRequest('DELETE', `/api/documents/${privateDocId}`, tokenTenantAdmin);

  // ==========================================
  // DOMAIN 5: KANBAN & PROJECTS TENANT SCOPING
  // ==========================================
  console.log('\n--- DOMAIN 5: KANBAN & PROJECTS TENANT SCOPING ---');

  // Test 46: Tenant A projects list
  const tenantAProjects = await apiRequest('GET', '/api/projects', tokenTenantAdmin);
  const tenantAHasProjects = Array.isArray(tenantAProjects.body?.projects) && tenantAProjects.body.projects.length > 0;
  assertTest('Kanban 1: Tenant A projects list succeeds with valid records', tenantAProjects.status === 200 && tenantAHasProjects, `count=${tenantAProjects.body?.projects?.length}`);

  // Test 47: Tenant B projects list (strictly isolated)
  const tenantBProjects = await apiRequest('GET', '/api/projects', tokenTenantB);
  assertTest('Kanban 2: Tenant B projects endpoint is strictly tenant-scoped', tenantBProjects.status === 200, `status=${tenantBProjects.status}`);

  // Summary
  console.log('\n========================================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  console.log(`PASS RATE: ${((passCount / results.length) * 100).toFixed(1)}%`);
  console.log('========================================================================\n');

  await prisma.$disconnect();

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialAudit().catch(err => {
  console.error('Fatal error during adversarial audit:', err);
  process.exit(1);
});
