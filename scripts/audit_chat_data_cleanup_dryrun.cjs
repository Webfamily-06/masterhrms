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

async function main() {
  console.log("=== CHAT DATA AUDIT & DRY RUN ===");

  // 1. Audit ChatGroups
  const allGroups = await prisma.chatGroup.findMany({
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\nFound ${allGroups.length} total Chat Groups:`);
  allGroups.forEach((g) => {
    console.log(`- ID: ${g.id} | Name: "${g.name}" | Tenant: ${g.tenantId} | Members: ${g._count.members} | Created: ${g.createdAt.toISOString()}`);
  });

  // 2. Audit ChatMessages
  const threads = await prisma.chatMessage.groupBy({
    by: ["threadId", "tenantId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  console.log(`\nFound ${threads.length} total message threads:`);
  threads.slice(0, 15).forEach((t) => {
    console.log(`- Thread: ${t.threadId} | Tenant: ${t.tenantId} | Message Count: ${t._count.id}`);
  });

  // 3. Audit CallHistoryRecord
  const calls = await prisma.callHistoryRecord.findMany({
    take: 15,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      callSessionId: true,
      callerName: true,
      receiverName: true,
      status: true,
      durationSeconds: true,
      createdAt: true,
    },
  });

  console.log(`\nRecent CallHistoryRecords (${calls.length}):`);
  calls.forEach((c) => {
    console.log(`- Session: ${c.callSessionId} | Caller: ${c.callerName} -> ${c.receiverName} | Status: ${c.status} | Duration: ${c.durationSeconds}s`);
  });
}

main().finally(() => prisma.$disconnect());
