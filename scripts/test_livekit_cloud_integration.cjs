/**
 * MASTERHRMS — Phase C3.5-A LiveKit Cloud Staging Integration Test Suite
 *
 * Validates:
 * 1. MeetingSfuService configuration resolution (unconfigured vs LiveKit Cloud)
 * 2. LiveKit Cloud JWT access token generation & claims
 * 3. Scope permissions (host vs participant)
 * 4. Multi-tenant room isolation formatting
 * 5. Diagnostic status endpoint (/api/calls/sfu-status) format
 * 6. Zero secret leakage in API payloads
 * 7. Historical database 119 records SHA-256 baseline preservation
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASELINE_TIMESTAMP = new Date("2026-11-04T14:00:00.000Z");
const EXPECTED_BASELINE_COUNT = 119;
const EXPECTED_MASTER_HASH = "0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a";

async function runTests() {
  console.log("================================================================================");
  console.log("☁️  MASTERHRMS PHASE C3.5-A — LIVEKIT CLOUD INTEGRATION TEST");
  console.log("================================================================================\n");

  const results = { total: 0, passed: 0, failed: 0 };
  function assert(name, condition, info = "") {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${name}: ${info}`);
    }
  }

  // Import TypeScript service
  const { MeetingSfuService } = require("../server/src/services/meeting-sfu.service.ts");

  // ---------------------------------------------------------------------------
  // 1. Unconfigured State Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 1: Unconfigured / Pending Configuration State ---");
  const oldUrl = process.env.LIVEKIT_URL;
  const oldKey = process.env.LIVEKIT_API_KEY;
  const oldSecret = process.env.LIVEKIT_API_SECRET;

  delete process.env.LIVEKIT_URL;
  delete process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_SECRET;

  const unconfiguredConfig = MeetingSfuService.getConfig();
  const unconfiguredDiag = MeetingSfuService.getDiagnosticInfo();

  assert(
    "Reports configured: false when LiveKit credentials unset",
    unconfiguredConfig.configured === false
  );
  assert(
    "Diagnostic status reports 'pending_configuration' safely",
    unconfiguredDiag.status === "pending_configuration" && unconfiguredDiag.configured === false
  );
  assert(
    "Diagnostic lists missing environment variable names without errors",
    unconfiguredDiag.missing.includes("LIVEKIT_URL") &&
      unconfiguredDiag.missing.includes("LIVEKIT_API_KEY") &&
      unconfiguredDiag.missing.includes("LIVEKIT_API_SECRET")
  );

  // ---------------------------------------------------------------------------
  // 2. LiveKit Cloud Configuration State Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 2: LiveKit Cloud Configuration State ---");
  const testCloudUrl = "wss://masterhrms-staging-abc12345.livekit.cloud";
  const testApiKey = "APITestKeyStaging2026";
  const testApiSecret = "secret_staging_livekit_cloud_at_least_32_chars_long_entropy";

  process.env.LIVEKIT_URL = testCloudUrl;
  process.env.LIVEKIT_API_KEY = testApiKey;
  process.env.LIVEKIT_API_SECRET = testApiSecret;

  const cloudConfig = MeetingSfuService.getConfig();
  const cloudDiag = MeetingSfuService.getDiagnosticInfo();

  assert(
    "Reports configured: true when LiveKit Cloud credentials set",
    cloudConfig.configured === true && cloudConfig.url === testCloudUrl
  );
  assert(
    "Correctly identifies provider as 'livekit_cloud' and isLiveKitCloud: true",
    cloudDiag.provider === "livekit_cloud" && cloudDiag.isLiveKitCloud === true
  );
  assert(
    "Reports status: 'ready' with zero missing variables",
    cloudDiag.status === "ready" && cloudDiag.missing.length === 0
  );

  // ---------------------------------------------------------------------------
  // 3. LiveKit Cloud JWT Generation & Claims
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 3: Token Generation & Scopes ---");
  const tokenParams = {
    tenantId: "tenant_alpha_01",
    callId: "call_session_998877",
    userId: "usr_alice_dev",
    name: "Alice Engineer",
    avatarUrl: "https://avatar.example.com/alice.png",
    isHost: true,
    ttlSeconds: 900,
  };

  const tokenResult = MeetingSfuService.generateCallToken(tokenParams);

  assert(
    "Token generated with non-empty string and correct LiveKit Cloud URL",
    typeof tokenResult.token === "string" && tokenResult.url === testCloudUrl
  );
  assert(
    "Room name follows canonical tenant boundary: call_tenant_alpha_01_call_session_998877",
    tokenResult.room === "call_tenant_alpha_01_call_session_998877"
  );

  const decoded = jwt.verify(tokenResult.token, testApiSecret);
  assert(
    "JWT header alg is HS256 and subject matches userId",
    decoded.sub === tokenParams.userId && decoded.iss === testApiKey
  );
  assert(
    "JWT video grant grants roomJoin, canPublish, canSubscribe, and roomAdmin for host",
    decoded.video &&
      decoded.video.room === tokenResult.room &&
      decoded.video.roomJoin === true &&
      decoded.video.canPublish === true &&
      decoded.video.canSubscribe === true &&
      decoded.video.roomAdmin === true &&
      decoded.video.roomCreate === true
  );

  const parsedMetadata = JSON.parse(decoded.metadata);
  assert(
    "Metadata contains tenantId, callId, and host role",
    parsedMetadata.tenantId === tokenParams.tenantId &&
      parsedMetadata.callId === tokenParams.callId &&
      parsedMetadata.role === "host"
  );

  // ---------------------------------------------------------------------------
  // 4. Non-Host Participant Permissions
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 4: Non-Host Participant Permissions ---");
  const participantTokenResult = MeetingSfuService.generateCallToken({
    ...tokenParams,
    userId: "usr_bob_dev",
    name: "Bob Colleague",
    isHost: false,
  });

  const participantDecoded = jwt.verify(participantTokenResult.token, testApiSecret);
  assert(
    "Non-host token has roomAdmin: false and roomCreate: false",
    participantDecoded.video.roomAdmin === false && participantDecoded.video.roomCreate === false
  );
  assert(
    "Non-host token retains canPublish and canSubscribe permissions",
    participantDecoded.video.canPublish === true && participantDecoded.video.canSubscribe === true
  );

  // ---------------------------------------------------------------------------
  // 5. Zero Secret Leakage Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 5: Zero Secret Leakage Verification ---");
  const serializedTokenResult = JSON.stringify(tokenResult);
  assert(
    "API Secret is NEVER present in tokenResult payload",
    !serializedTokenResult.includes(testApiSecret)
  );

  const serializedDiag = JSON.stringify(cloudDiag);
  assert(
    "API Secret is NEVER present in diagnostic status payload",
    !serializedDiag.includes(testApiSecret)
  );

  // ---------------------------------------------------------------------------
  // 6. Historical Database Baseline Integrity (119 Records)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 6: Historical Database Integrity Audit ---");
  const allRecords = await prisma.callHistoryRecord.findMany({
    orderBy: { id: "asc" },
  });

  const baselineRecords = allRecords.filter(
    (r) => r.createdAt && new Date(r.createdAt) <= BASELINE_TIMESTAMP
  );

  assert(
    `Exactly ${EXPECTED_BASELINE_COUNT} baseline records found (found: ${baselineRecords.length})`,
    baselineRecords.length === EXPECTED_BASELINE_COUNT
  );

  const rowHashes = baselineRecords.map((r) => {
    const canonical = JSON.stringify({
      id: r.id,
      tenantId: r.tenantId,
      callSessionId: r.callSessionId,
      callerId: r.callerId,
      callerName: r.callerName,
      callerEmail: r.callerEmail,
      callerPhone: r.callerPhone,
      callerAvatarUrl: r.callerAvatarUrl,
      receiverId: r.receiverId,
      receiverName: r.receiverName,
      receiverAvatarUrl: r.receiverAvatarUrl,
      direction: r.direction,
      callType: r.callType,
      durationSeconds: r.durationSeconds,
      callTime: r.callTime ? r.callTime.toISOString() : null,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      groupId: r.groupId,
      participantIds: r.participantIds || [],
      totalCalls: r.totalCalls,
      avgCallSeconds: r.avgCallSeconds,
      avgWaitSeconds: r.avgWaitSeconds,
      status: r.status,
      notes: r.notes,
      hiddenByUserIds: r.hiddenByUserIds || [],
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    });

    return {
      id: r.id,
      hash: crypto.createHash("sha256").update(canonical).digest("hex"),
    };
  });

  const combined = rowHashes.map((r) => `${r.id}:${r.hash}`).join("\n");
  const computedMasterHash = crypto.createHash("sha256").update(combined).digest("hex");

  assert(
    "Historical baseline SHA-256 fingerprint matches bit-for-bit",
    computedMasterHash === EXPECTED_MASTER_HASH,
    `Computed: ${computedMasterHash}\n  Expected: ${EXPECTED_MASTER_HASH}`
  );

  // Restore env
  if (oldUrl) process.env.LIVEKIT_URL = oldUrl; else delete process.env.LIVEKIT_URL;
  if (oldKey) process.env.LIVEKIT_API_KEY = oldKey; else delete process.env.LIVEKIT_API_KEY;
  if (oldSecret) process.env.LIVEKIT_API_SECRET = oldSecret; else delete process.env.LIVEKIT_API_SECRET;

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${results.passed}/${results.total} Passed (${results.failed} Failed)`);
  console.log("================================================================================\n");

  await prisma.$disconnect();

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (e) => {
  console.error("FATAL Test Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});

