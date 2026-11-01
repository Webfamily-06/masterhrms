/**
 * MASTERHRMS — REAL DATABASE RESTART & MULTI-INSTANCE CONCURRENCY INTEGRATION TEST
 * 
 * Tests against the LIVE database (aws-0-ap-south-1.pooler.supabase.com) without mocks:
 * 1. SCENARIO A: Server Process Restart & Cluster Recovery
 *    - Real database record inserted in 'ringing' status.
 *    - In-memory activeCalls Map purged (simulating complete server restart or multi-instance routing).
 *    - GET /api/calls/:callId/status queries database and retrieves authoritative session.
 *    - POST /api/calls/:callId/accept recovers session from database, updates status atomically to 'connected', and restores memory state.
 * 
 * 2. SCENARIO B: Concurrent Multi-Instance Acceptance Race
 *    - Real database record inserted in 'ringing' status.
 *    - Two concurrent acceptance requests (e.g. Device 1 & Device 2) hit the endpoint simultaneously via Promise.all.
 *    - PostgreSQL atomic conditional update (status == 'ringing' -> 'connected') ensures exactly ONE succeeds (200 OK).
 *    - The second concurrent request receives HTTP 409 Conflict.
 * 
 * 3. SCENARIO C: Device-Level Logout & Session Revocation
 *    - Push subscription registered for Device 1 and Device 2.
 *    - Device 1 logs out: only Device 1's subscription is marked revoked.
 *    - Device 2 remains active and receives subsequent calls.
 */

import assert from "node:assert";
import { rawPrisma } from "../prisma";
import { activeCalls } from "../socket";
import { callRouter } from "../routes/call.routes";
import { PushSubscriptionStore } from "../services/push-subscription.store";

async function runRealDatabaseIntegrationTest() {
  console.log("================================================================================");
  console.log("🏛️ RUNNING REAL DATABASE RESTART & MULTI-INSTANCE CONCURRENCY SUITE");
  console.log("   Target: Live Supabase PostgreSQL Instance");
  console.log("================================================================================\n");

  const tenantRecord = await rawPrisma.tenant.findFirst();
  assert(tenantRecord, "A tenant record must exist in PostgreSQL");
  const tenantId = tenantRecord.id;
  const callerId = `user_caller_${Date.now()}`;
  const calleeId = `user_callee_${Date.now()}`;
  const callIdA = `call_restart_${Date.now()}`;
  const callIdB = `call_race_${Date.now()}`;

  const createdRecords: string[] = [];

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO A: REAL SERVER RESTART RECOVERY
    // ──────────────────────────────────────────────────────────────────────────
    console.log("👉 SCENARIO A: Real Server Restart & Cache Wipe Recovery");
    console.log("   1. Inserting real CallHistoryRecord into PostgreSQL with status 'ringing'...");
    const recordA = await rawPrisma.callHistoryRecord.create({
      data: {
        tenantId,
        callSessionId: callIdA,
        callerId,
        callerName: "Priya Chandran (Lead)",
        callerPhone: "+91 98765 43210",
        callerAvatarUrl: "https://avatar.iran.liara.run/public/girl",
        receiverId: calleeId,
        receiverName: "Bob Dev",
        callType: "audio",
        status: "ringing",
        startedAt: new Date(),
      },
    });
    createdRecords.push(recordA.id);
    console.log(`      Created real DB record ID: ${recordA.id} for session: ${callIdA}`);

    // Purge in-memory activeCalls
    activeCalls.clear();
    assert.strictEqual(activeCalls.size, 0, "activeCalls in-memory Map must be completely empty");
    console.log("   2. Purged in-memory activeCalls Map (simulating process restart)");

    // Test GET /:callId/status handler
    const getStatusHandler = callRouter.stack.find(
      (layer: any) => layer.route?.path === "/:callId/status" && layer.route?.methods?.get
    )?.route?.stack[1]?.handle;
    assert(getStatusHandler, "GET /:callId/status handler must exist");

    let statusStatusCode = 0;
    let statusBody: any = null;
    await getStatusHandler(
      { params: { callId: callIdA }, user: { userId: calleeId, tenantId } },
      {
        status: (c: number) => { statusStatusCode = c; return { json: (d: any) => { statusBody = d; } }; },
        json: (d: any) => { statusStatusCode = 200; statusBody = d; },
      }
    );

    assert.strictEqual(statusStatusCode, 200, "Must return HTTP 200");
    assert.strictEqual(statusBody.success, true);
    assert.strictEqual(statusBody.data.status, "ringing");
    assert.strictEqual(statusBody.data.isPending, true);
    assert.strictEqual(statusBody.data.callerName, "Priya Chandran (Lead)");
    console.log("   3. ✅ Database fallback successfully retrieved authoritative 'ringing' call state after restart");

    // Test POST /:callId/accept handler
    const postAcceptHandler = callRouter.stack.find(
      (layer: any) => layer.route?.path === "/:callId/accept" && layer.route?.methods?.post
    )?.route?.stack[1]?.handle;
    assert(postAcceptHandler, "POST /:callId/accept handler must exist");

    let acceptStatusCode = 0;
    let acceptBody: any = null;
    await postAcceptHandler(
      { params: { callId: callIdA }, user: { userId: calleeId, tenantId } },
      {
        status: (c: number) => { acceptStatusCode = c; return { json: (d: any) => { acceptBody = d; } }; },
        json: (d: any) => { acceptStatusCode = 200; acceptBody = d; },
      }
    );

    assert.strictEqual(acceptStatusCode, 200, "Must return HTTP 200");
    assert.strictEqual(acceptBody.success, true);
    assert.strictEqual(acceptBody.data.status, "connected");

    // Verify database record has updated to connected
    const updatedDbRecord = await rawPrisma.callHistoryRecord.findUnique({
      where: { id: recordA.id },
    });
    assert.strictEqual(updatedDbRecord?.status, "connected", "Database status must be 'connected'");
    assert(activeCalls.has(callIdA), "In-memory activeCalls map must have restored the active call session");
    console.log("   4. ✅ Restored call session to memory and transitioned PostgreSQL status to 'connected'");

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO B: CONCURRENT MULTI-INSTANCE ACCEPTANCE RACE (ATOMIC RESOLUTION)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n👉 SCENARIO B: Concurrent Multi-Instance Acceptance Race");
    console.log("   1. Inserting second real CallHistoryRecord with status 'ringing'...");
    const recordB = await rawPrisma.callHistoryRecord.create({
      data: {
        tenantId,
        callSessionId: callIdB,
        callerId,
        callerName: "Priya Chandran (Lead)",
        callerPhone: "+91 98765 43210",
        callerAvatarUrl: "https://avatar.iran.liara.run/public/girl",
        receiverId: calleeId,
        receiverName: "Bob Dev",
        callType: "audio",
        status: "ringing",
        startedAt: new Date(),
      },
    });
    createdRecords.push(recordB.id);
    console.log(`      Created real DB record ID: ${recordB.id} for session: ${callIdB}`);

    // Fire two simultaneous acceptance requests (Device 1 vs Device 2)
    console.log("   2. Firing two concurrent accept requests simultaneously via Promise.all...");
    let req1Status = 0;
    let req1Body: any = null;
    let req2Status = 0;
    let req2Body: any = null;

    const acceptRequest1 = postAcceptHandler(
      { params: { callId: callIdB }, user: { userId: calleeId, tenantId } },
      {
        status: (c: number) => { req1Status = c; return { json: (d: any) => { req1Body = d; } }; },
        json: (d: any) => { req1Status = 200; req1Body = d; },
      }
    );

    const acceptRequest2 = postAcceptHandler(
      { params: { callId: callIdB }, user: { userId: calleeId, tenantId } },
      {
        status: (c: number) => { req2Status = c; return { json: (d: any) => { req2Body = d; } }; },
        json: (d: any) => { req2Status = 200; req2Body = d; },
      }
    );

    await Promise.all([acceptRequest1, acceptRequest2]);

    const statuses = [req1Status, req2Status];
    console.log(`      Response statuses: Request 1 = ${req1Status}, Request 2 = ${req2Status}`);

    // Exactly one must be 200, and the racing one must be 409 Conflict
    const has200 = statuses.includes(200);
    const has409 = statuses.includes(409);
    assert.strictEqual(has200, true, "First arrival must succeed with HTTP 200");
    assert.strictEqual(has409, true, "Concurrent second arrival must be rejected with HTTP 409 Conflict");
    console.log("   3. ✅ Atomic conditional SQL/Prisma update prevented race: 1 accepted (200), 1 conflicted (409)");

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO C: DEVICE-LEVEL LOGOUT & SESSION REVOCATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n👉 SCENARIO C: Device-Level Push Subscription & Session Security");
    const device1Id = `device_desktop_${Date.now()}`;
    const device2Id = `device_mobile_${Date.now()}`;

    // Register Device 1
    await PushSubscriptionStore.saveSubscription({
      tenantId,
      userId: calleeId,
      subscription: {
        endpoint: `https://fcm.googleapis.com/fcm/send/token_${device1Id}`,
        keys: { p256dh: "key1", auth: "auth1" },
      },
      deviceId: device1Id,
      platform: "desktop",
      sessionTokenId: "session_tok_1",
    });

    // Register Device 2
    await PushSubscriptionStore.saveSubscription({
      tenantId,
      userId: calleeId,
      subscription: {
        endpoint: `https://fcm.googleapis.com/fcm/send/token_${device2Id}`,
        keys: { p256dh: "key2", auth: "auth2" },
      },
      deviceId: device2Id,
      platform: "mobile",
      sessionTokenId: "session_tok_2",
    });

    let activeSubs = await PushSubscriptionStore.getActiveSubscriptions(tenantId, calleeId);
    assert.strictEqual(activeSubs.length, 2, "Callee must initially have 2 active subscriptions");
    console.log("   1. Registered Device 1 (desktop) and Device 2 (mobile)");

    // Device 1 logs out
    const revoked = await PushSubscriptionStore.revokeDeviceSubscription(tenantId, calleeId, device1Id);
    assert.strictEqual(revoked, true, "Device 1 subscription revocation must return true");
    console.log("   2. Device 1 executed logout -> revoked subscription for Device 1 only");

    activeSubs = await PushSubscriptionStore.getActiveSubscriptions(tenantId, calleeId);
    assert.strictEqual(activeSubs.length, 1, "Only 1 active subscription must remain after Device 1 logout");
    assert.strictEqual(activeSubs[0].deviceId, device2Id, "Active subscription must belong exclusively to Device 2");
    console.log("   3. ✅ Device 2 remains fully active with non-revoked session; Device 1 cannot receive calls");

    console.log("\n================================================================================");
    console.log("🎉 ALL REAL DATABASE INTEGRATION & MULTI-INSTANCE TESTS PASSED");
    console.log("================================================================================\n");

  } finally {
    // Clean up test records
    console.log("🧹 Cleaning up test records from PostgreSQL...");
    for (const id of createdRecords) {
      try {
        await rawPrisma.callHistoryRecord.delete({ where: { id } });
      } catch {}
    }
    console.log("   Cleaned up test records.\n");
  }
}

runRealDatabaseIntegrationTest().catch((err) => {
  console.error("❌ Real database test failed:", err);
  process.exit(1);
});
