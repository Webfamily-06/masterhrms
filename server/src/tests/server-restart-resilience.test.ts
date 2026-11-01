/**
 * MASTERHRMS — SERVER RESTART & MULTI-INSTANCE RESILIENCE TEST
 * 
 * Verifies Requirement 5:
 * 1. Active call initiated on Node Server Instance A
 * 2. In-memory activeCalls Map cleared (simulating server restart / crash / cluster node switch)
 * 3. GET /api/calls/:callId/status queries persisted database record and returns pending ringing state
 * 4. POST /api/calls/:callId/accept restores session state from database, updates status to connected, and informs participants
 * 5. Expired calls (>60s) automatically transition to missed
 */

import assert from "node:assert";
import { activeCalls } from "../socket";
import { callRouter } from "../routes/call.routes";
import { rawPrisma, prisma } from "../prisma";

async function runRestartResilienceTest() {
  console.log("================================================================================");
  console.log("🔄 RUNNING SERVER RESTART & MULTI-INSTANCE RESILIENCE TEST");
  console.log("================================================================================\n");

  const db = rawPrisma || prisma;
  const tenantId = `tenant_cluster_test_${Date.now()}`;
  const callerId = `user_caller_${Date.now()}`;
  const targetUserId = `user_callee_${Date.now()}`;
  const callId = `call_persist_${Date.now()}`;

  // 1. Setup mock CallHistoryRecord in database with status "ringing"
  console.log("👉 Test 1: In-Memory Wiped Simulation (Server Restart / Multi-Instance)");
  activeCalls.clear();
  assert.strictEqual(activeCalls.size, 0, "activeCalls in-memory Map must be completely empty");

  // Mock db record
  let simulatedDbRecord: any = {
    id: `rec_${Date.now()}`,
    tenantId,
    callSessionId: callId,
    callerId,
    callerName: "Dr. Alice Architect",
    callerPhone: "Internal Call",
    callerAvatarUrl: "/assets/avatar.png",
    receiverId: targetUserId,
    receiverName: "Bob Callee",
    callType: "audio",
    status: "ringing",
    startedAt: new Date(),
    endedAt: null,
  };

  // Mock rawPrisma/prisma.callHistoryRecord for test environment
  const originalFindFirst = db.callHistoryRecord.findFirst;
  const originalUpdate = db.callHistoryRecord.update;
  const originalUpdateMany = db.callHistoryRecord.updateMany;

  db.callHistoryRecord.findFirst = async ({ where }: any) => {
    if (where.tenantId === tenantId && where.callSessionId === callId) {
      return simulatedDbRecord;
    }
    return null;
  };

  db.callHistoryRecord.update = async ({ where, data }: any) => {
    if (simulatedDbRecord && simulatedDbRecord.id === where.id) {
      Object.assign(simulatedDbRecord, data);
      return simulatedDbRecord;
    }
    return null;
  };

  db.callHistoryRecord.updateMany = async ({ where, data }: any) => {
    if (simulatedDbRecord && simulatedDbRecord.tenantId === where.tenantId && simulatedDbRecord.callSessionId === where.callSessionId) {
      Object.assign(simulatedDbRecord, data);
      return { count: 1 };
    }
    return { count: 0 };
  };

  try {
    // 2. Simulate GET /api/calls/:callId/status when memory is empty
    console.log("👉 Test 2: Status Query Resolution via Persisted Record");
    let statusResponseData: any = null;
    let statusStatusCode = 200;

    const mockReqStatus: any = {
      params: { callId },
      user: { userId: targetUserId, tenantId },
    };
    const mockResStatus: any = {
      status: (code: number) => {
        statusStatusCode = code;
        return mockResStatus;
      },
      json: (data: any) => {
        statusResponseData = data;
        return mockResStatus;
      },
    };

    // Find route handler for GET /:callId/status
    const getStatusHandler = callRouter.stack.find((layer: any) => layer.route?.path === "/:callId/status" && layer.route?.methods?.get)?.route?.stack[1]?.handle;
    assert(getStatusHandler, "GET /:callId/status route handler must exist");

    await getStatusHandler(mockReqStatus, mockResStatus);

    assert.strictEqual(statusStatusCode, 200);
    assert.strictEqual(statusResponseData.success, true);
    assert.strictEqual(statusResponseData.data.status, "ringing");
    assert.strictEqual(statusResponseData.data.isPending, true);
    assert.strictEqual(statusResponseData.data.callerName, "Dr. Alice Architect");
    console.log("   ✅ GET /:callId/status successfully resolved ringing call from database fallback without memory");

    // 3. Simulate POST /api/calls/:callId/accept when memory is empty
    console.log("\n👉 Test 3: Authenticated Acceptance Restores Session & Persists Status");
    let acceptResponseData: any = null;
    let acceptStatusCode = 200;

    const mockReqAccept: any = {
      params: { callId },
      user: { userId: targetUserId, tenantId },
    };
    const mockResAccept: any = {
      status: (code: number) => {
        acceptStatusCode = code;
        return mockResAccept;
      },
      json: (data: any) => {
        acceptResponseData = data;
        return mockResAccept;
      },
    };

    const postAcceptHandler = callRouter.stack.find((layer: any) => layer.route?.path === "/:callId/accept" && layer.route?.methods?.post)?.route?.stack[1]?.handle;
    assert(postAcceptHandler, "POST /:callId/accept route handler must exist");

    await postAcceptHandler(mockReqAccept, mockResAccept);

    assert.strictEqual(acceptStatusCode, 200);
    assert.strictEqual(acceptResponseData.success, true);
    assert.strictEqual(acceptResponseData.data.status, "connected");
    assert.strictEqual(simulatedDbRecord.status, "connected", "Database record must be updated to connected");
    assert(activeCalls.has(callId), "Call session must be restored in memory activeCalls registry");
    console.log("   ✅ POST /:callId/accept successfully recovered ringing session from database and transitioned to connected");

    // 4. Verification that non-participant cannot accept
    console.log("\n👉 Test 4: Security Verification - Non-Participant Cannot Accept");
    let forbiddenStatusCode = 200;
    const mockReqForbidden: any = {
      params: { callId },
      user: { userId: "intruder_user_999", tenantId },
    };
    const mockResForbidden: any = {
      status: (code: number) => {
        forbiddenStatusCode = code;
        return mockResForbidden;
      },
      json: () => mockResForbidden,
    };

    await postAcceptHandler(mockReqForbidden, mockResForbidden);
    assert.strictEqual(forbiddenStatusCode, 403, "Non-participant accept must return HTTP 403 Forbidden");
    console.log("   ✅ Non-participant acceptance blocked with HTTP 403 Forbidden");

    // 5. Verification of 60s timeout expiration
    console.log("\n👉 Test 5: Call Timeout Expiration Fallback");
    const expiredCallId = `call_expired_${Date.now()}`;
    const expiredDbRecord = {
      id: `rec_exp_${Date.now()}`,
      tenantId,
      callSessionId: expiredCallId,
      callerId,
      callerName: "Dr. Alice Architect",
      callerPhone: "Internal Call",
      receiverId: targetUserId,
      receiverName: "Bob Callee",
      callType: "audio",
      status: "ringing",
      startedAt: new Date(Date.now() - 65000), // 65 seconds ago
      endedAt: null,
    };

    db.callHistoryRecord.findFirst = async ({ where }: any) => {
      if (where.callSessionId === expiredCallId) return expiredDbRecord;
      return null;
    };

    let expiredResponseData: any = null;
    await getStatusHandler({ params: { callId: expiredCallId }, user: { userId: targetUserId, tenantId } }, {
      status: () => ({ json: (d: any) => { expiredResponseData = d; } }),
      json: (d: any) => { expiredResponseData = d; },
    });

    assert.strictEqual(expiredResponseData.data.status, "missed");
    assert.strictEqual(expiredResponseData.data.isPending, false);
    console.log("   ✅ Calls older than 60s automatically reported as missed (expired)");

    console.log("\n================================================================================");
    console.log("🎉 ALL SERVER RESTART & MULTI-INSTANCE RESILIENCE TESTS PASSED");
    console.log("================================================================================\n");
  } finally {
    db.callHistoryRecord.findFirst = originalFindFirst;
    db.callHistoryRecord.update = originalUpdate;
    db.callHistoryRecord.updateMany = originalUpdateMany;
  }
}

runRestartResilienceTest().catch((err) => {
  console.error("❌ Server restart resilience test failed:", err);
  process.exit(1);
});

