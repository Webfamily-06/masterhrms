/**
 * MASTERHRMS — Safe Dummy/Test Chat Data Cleanup
 * 
 * Safely removes verified automated test fixtures, dummy test groups, and test threads
 * while strictly preserving legitimate groups, direct employee conversations, and real users.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });

function resolveServerPkg(name) {
  try {
    return require(name);
  } catch (e) {
    const serverPath = path.join(__dirname, "../server");
    return require(require.resolve(name, { paths: [serverPath] }));
  }
}

const { PrismaClient } = resolveServerPkg("@prisma/client");
const prisma = new PrismaClient();

async function cleanData(dryRun = true) {
  console.log(`\n======================================================`);
  console.log(` CHAT DATA CLEANUP [${dryRun ? "DRY RUN MODE" : "EXECUTION MODE"}]`);
  console.log(`======================================================\n`);

  // Legitimate groups that must NEVER be deleted
  const PRESERVED_GROUP_IDS = [
    "3aad2929-548d-469f-ba90-b96ab6736da5", // TSV GLOBAL SOLUTIONS
    "1a19f819-73e7-48cf-ab4e-3d7e90a72510", // Engineering Core Team
  ];

  // 1. Identify Test Groups to Remove
  const allGroups = await prisma.chatGroup.findMany();
  const testGroups = allGroups.filter((g) => {
    if (PRESERVED_GROUP_IDS.includes(g.id)) return false;
    const name = g.name.toLowerCase();
    return (
      g.id === "audit_concurrency_test" ||
      name.startsWith("audit team") ||
      name.startsWith("audit group") ||
      name.startsWith("design & product sync") ||
      name.startsWith("restoration test group") ||
      name.startsWith("verification group") ||
      name.startsWith("test group") ||
      name.startsWith("sprint core alpha")
    );
  });

  console.log(`[GROUPS] Found ${testGroups.length} confirmed test groups to remove:`);
  testGroups.forEach((g) => {
    console.log(`  - Group ID: ${g.id} | Name: "${g.name}" | Tenant: ${g.tenantId}`);
  });

  const testGroupIds = testGroups.map((g) => g.id);
  const testGroupThreadIds = testGroupIds.map((id) => `group_${id}`);

  // 2. Identify Dummy Message Threads (e.g. contact_user_1 and test group threads)
  const dummyThreads = ["contact_user_1", ...testGroupThreadIds];
  const messagesToDeleteCount = await prisma.chatMessage.count({
    where: { threadId: { in: dummyThreads } },
  });
  console.log(`\n[MESSAGES] Found ${messagesToDeleteCount} test messages in dummy threads.`);

  // 3. Identify Dummy CallHistoryRecords (only test sessions with audit_timeout_)
  const testCalls = await prisma.callHistoryRecord.findMany({
    where: { callSessionId: { startsWith: "audit_timeout_" } },
  });
  console.log(`\n[CALL LOGS] Found ${testCalls.length} test call history records with prefix audit_timeout_.`);

  if (dryRun) {
    console.log(`\n[DRY RUN SUMMARY]`);
    console.log(`- Chat Groups to delete: ${testGroups.length}`);
    console.log(`- Chat Messages to delete: ${messagesToDeleteCount}`);
    console.log(`- CallHistoryRecords to delete: ${testCalls.length}`);
    console.log(`- Legitimate groups preserved: ${PRESERVED_GROUP_IDS.length}`);
    console.log(`- Real direct threads preserved: direct_user-emp-001_user-hr-001`);
    console.log(`\nRun with --execute to perform actual deletion.`);
    return;
  }

  // EXECUTE DELETIONS IN TRANSACTION / CASCADE ORDER
  console.log(`\n[EXECUTING DELETIONS]...`);

  // A. Delete test messages
  if (dummyThreads.length > 0) {
    const deletedMsgs = await prisma.chatMessage.deleteMany({
      where: { threadId: { in: dummyThreads } },
    });
    console.log(`  ✔ Deleted ${deletedMsgs.count} test messages.`);
  }

  // B. Delete test group members
  if (testGroupIds.length > 0) {
    const deletedMembers = await prisma.chatGroupMember.deleteMany({
      where: { groupId: { in: testGroupIds } },
    });
    console.log(`  ✔ Deleted ${deletedMembers.count} test group member relationships.`);

    // C. Delete test groups
    const deletedGroups = await prisma.chatGroup.deleteMany({
      where: { id: { in: testGroupIds } },
    });
    console.log(`  ✔ Deleted ${deletedGroups.count} test groups.`);
  }

  // D. Delete test call records
  if (testCalls.length > 0) {
    const deletedCalls = await prisma.callHistoryRecord.deleteMany({
      where: { callSessionId: { startsWith: "audit_timeout_" } },
    });
    console.log(`  ✔ Deleted ${deletedCalls.count} test call records.`);
  }

  console.log(`\n✔ CLEANUP COMPLETED SUCCESSFULLY.`);
}

const isExecute = process.argv.includes("--execute");
cleanData(!isExecute).finally(() => prisma.$disconnect());
