const path = require("path");
let PrismaClient;
try {
  PrismaClient = require(path.resolve(__dirname, "../server/node_modules/@prisma/client")).PrismaClient;
} catch {
  PrismaClient = require("@prisma/client").PrismaClient;
}
const crypto = require("crypto");

const prisma = new PrismaClient();

// The authoritative baseline snapshot threshold (recorded Nov 4, 2026 prior to Phase C1 migration)
const BASELINE_TIMESTAMP = new Date("2026-11-04T14:00:00.000Z");
const EXPECTED_BASELINE_COUNT = 119;
const EXPECTED_MASTER_HASH = "0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a";

async function runHistoricalIntegrityCheck() {
  try {
    // 1. Fetch total current records in call_history_records
    const allRecords = await prisma.callHistoryRecord.findMany({
      orderBy: { id: "asc" },
    });

    // 2. Filter strictly the 119 pre-existing historical baseline records
    const baselineRecords = allRecords.filter(
      (r) => r.createdAt && new Date(r.createdAt) <= BASELINE_TIMESTAMP
    );

    const additiveRecords = allRecords.filter(
      (r) => !r.createdAt || new Date(r.createdAt) > BASELINE_TIMESTAMP
    );

    // 3. Compute deterministic cryptographic fingerprint over the 119 baseline records
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
    const masterHash = crypto.createHash("sha256").update(combined).digest("hex");

    const baselineCountMatches = baselineRecords.length === EXPECTED_BASELINE_COUNT;
    const baselinePreserved = masterHash === EXPECTED_MASTER_HASH;

    console.log("================================================================================");
    console.log("🔒 CALL_HISTORY_RECORD HISTORICAL INTEGRITY AUDIT");
    console.log("================================================================================");
    console.log(`- Pre-Existing Baseline Records: ${baselineRecords.length} (Expected: ${EXPECTED_BASELINE_COUNT})`);
    console.log(`- Baseline Count Satisfied: ${baselineCountMatches ? "VERIFIED PASS" : "FAILED"}`);
    console.log(`- Additive Post-Migration Records: ${additiveRecords.length}`);
    console.log(`- Total Records in Database: ${allRecords.length}`);
    console.log(`- Baseline Expected SHA-256: ${EXPECTED_MASTER_HASH}`);
    console.log(`- Computed Master SHA-256:   ${masterHash}`);
    console.log(`- Baseline Fingerprint Match: ${baselinePreserved ? "VERIFIED PASS (100% IDENTICAL)" : "MISMATCH"}`);

    if (!baselineCountMatches || !baselinePreserved) {
      console.error("❌ INTEGRITY VIOLATION: Pre-existing historical records were modified or corrupted!");
      process.exit(1);
    } else {
      console.log("✅ All 119 pre-existing call history records are cryptographically intact.");
    }
  } catch (err) {
    console.error("Audit query error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHistoricalIntegrityCheck();
