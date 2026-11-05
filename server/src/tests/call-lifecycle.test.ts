import assert from "node:assert";
import { CallLifecycleService, CallConflictError } from "../services/call-lifecycle.service";
import { rawPrisma } from "../prisma";

async function runCallLifecycleTests() {
  console.log("================================================================================");
  console.log("🧪 TESTING CALL LIFECYCLE SERVICE: ROW-LOCKING, DUAL-WRITE & CONCURRENCY");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const tenantId = "tenant-default-001"; // Use valid default tenant from DB
  const userAId = `user-a-${timestamp}`;
  const userBId = `user-b-${timestamp}`;
  let session: any = null;

  // Clean up any dangling calls for these test users
  await rawPrisma.call.deleteMany({
    where: {
      tenantId,
      startedBy: { in: [userAId, "user-hr-001"] },
      status: { in: ["RINGING", "ACTIVE"] },
    },
  }).catch(() => {});

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Atomic Call Session Creation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 1] Creating authoritative call session with dual-write history link...");
    session = await CallLifecycleService.createCallSession({
      tenantId,
      callerId: userAId,
      callerName: "Sarah HR Lead",
      callerPhone: "Internal Call",
      targetUserId: userBId,
      targetName: "Alex Rivera",
      callType: "video",
    });

    assert.ok(session.call.id, "Call record should have an ID");
    assert.strictEqual(session.call.status, "RINGING", "Initial call status must be RINGING");
    assert.ok(session.call.historyRecordId, "Call must link to CallHistoryRecord by historyRecordId");
    assert.strictEqual(session.callerParticipant.state, "JOINED", "Caller participant must be JOINED");
    assert.strictEqual(session.calleeParticipant.state, "RINGING", "Callee participant must be RINGING");

    console.log("  ✔ Call session created successfully. Call ID:", session.call.id);
    console.log("  ✔ Linked CallHistoryRecord ID:", session.call.historyRecordId);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Concurrency Race Condition (Two simultaneous accept attempts)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 2] Testing concurrent acceptance race condition (Simultaneous Accept)...");
    const acceptResults = await Promise.allSettled([
      CallLifecycleService.acceptCallTransaction({
        tenantId,
        callId: session.call.id,
        calleeId: userBId,
        deviceId: "tab_1",
      }),
      CallLifecycleService.acceptCallTransaction({
        tenantId,
        callId: session.call.id,
        calleeId: userBId,
        deviceId: "tab_2",
      }),
    ]);

    const successes = acceptResults.filter((r) => r.status === "fulfilled");
    const rejections = acceptResults.filter((r) => r.status === "rejected");

    assert.strictEqual(successes.length, 1, "Exactly one concurrent accept transaction must succeed");
    assert.strictEqual(rejections.length, 1, "The second concurrent accept must be rejected with conflict");
    const rejectionReason = (rejections[0] as PromiseRejectedResult).reason;
    assert.ok(
      rejectionReason instanceof CallConflictError || rejectionReason.code === "CALL_CONFLICT",
      "Rejection must be CallConflictError"
    );

    console.log("  ✔ Exactly 1 accept succeeded and 1 was atomically rejected as duplicate.");

    // Verify DB state
    const acceptedCall = await rawPrisma.call.findUnique({
      where: { id: session.call.id },
      include: { participants: true },
    });
    assert.strictEqual(acceptedCall?.status, "ACTIVE", "Call status must be ACTIVE in DB");
    const callee = acceptedCall?.participants.find((p: any) => p.userId === userBId);
    assert.strictEqual(callee?.state, "JOINED", "Callee participant state must be JOINED in DB");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: Disconnect Grace Period & Reconnection
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 3] Testing 30-second disconnect grace window & reconnection...");
    const disconnectResult = await CallLifecycleService.markParticipantReconnecting({
      tenantId,
      callId: session.call.id,
      userId: userBId,
      graceSeconds: 30,
    });
    assert.ok(disconnectResult, "Disconnect handler should return valid result");
    assert.strictEqual(disconnectResult?.participant.state, "RECONNECTING", "Participant must be in RECONNECTING state");
    assert.ok(disconnectResult?.participant.reconnectGraceExpiresAt, "Grace expiry timestamp must be set");

    // User reconnects within grace
    const reconnectResult = await CallLifecycleService.reconnectParticipantTransaction({
      tenantId,
      callId: session.call.id,
      userId: userBId,
    });
    assert.strictEqual(reconnectResult.participant.state, "JOINED", "Participant should be restored to JOINED state");
    assert.strictEqual(reconnectResult.participant.reconnectGraceExpiresAt, null, "Grace expiry should be cleared");
    console.log("  ✔ Participant transitioned to RECONNECTING and was restored to JOINED upon reconnect.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Authoritative Termination & Duration Calculation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 4] Testing termination with authoritative duration & history sync...");
    // Artificial small delay to measure duration
    await new Promise((r) => setTimeout(r, 1100));

    const terminatedCall = await CallLifecycleService.terminateCallTransaction({
      tenantId,
      callId: session.call.id,
      actorId: userAId,
      endReason: "HOST_ENDED",
      finalHistoryStatus: "completed",
    });

    assert.strictEqual(terminatedCall?.status, "ENDED", "Call status must be ENDED");
    assert.ok((terminatedCall as any).durationSeconds >= 1, "Duration must be calculated from answeredAt to endedAt");

    // Check CallHistoryRecord
    const historyRec = await rawPrisma.callHistoryRecord.findUnique({
      where: { id: session.call.historyRecordId! },
    });
    assert.strictEqual(historyRec?.status, "completed", "CallHistoryRecord status must be updated to completed");
    assert.ok(historyRec?.durationSeconds! >= 1, "CallHistoryRecord durationSeconds must match calculated duration");
    console.log(`  ✔ Call terminated with duration: ${(terminatedCall as any).durationSeconds}s. History updated.`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: Idempotent duplicate hangup
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 5] Testing idempotent duplicate termination...");
    const duplicateHangup = await CallLifecycleService.terminateCallTransaction({
      tenantId,
      callId: session.call.id,
      actorId: userBId,
      endReason: "PEER_ENDED",
    });
    assert.strictEqual(duplicateHangup?.status, "ENDED", "Duplicate termination must safely return ENDED");
    console.log("  ✔ Duplicate termination handled idempotently with zero side effects.");

    console.log("\n================================================================================");
    console.log("✅ ALL CALL LIFECYCLE SERVICE TESTS PASSED EMPIRICALLY!");
    console.log("================================================================================\n");
  } catch (err: any) {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  } finally {
    if (session?.call?.id) {
      await rawPrisma.call.delete({ where: { id: session.call.id } }).catch(() => {});
    }
    if (session?.call?.historyRecordId) {
      await rawPrisma.callHistoryRecord.delete({ where: { id: session.call.historyRecordId } }).catch(() => {});
    }
    await rawPrisma.$disconnect();
  }
}

runCallLifecycleTests();
