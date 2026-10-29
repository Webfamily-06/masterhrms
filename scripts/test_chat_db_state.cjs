const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { PrismaClient } = require(path.join(__dirname, '../server/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.chatGroup.findMany({
    select: { id: true, name: true, tenantId: true, _count: { select: { members: true } } }
  });
  console.log('ACTIVE GROUPS in DB:');
  console.table(groups);

  const directMsgs = await prisma.chatMessage.count({ where: { threadId: { startsWith: 'direct_' } } });
  const groupMsgs = await prisma.chatMessage.count({ where: { threadId: { startsWith: 'group_' } } });
  console.log('DIRECT MESSAGES:', directMsgs, 'GROUP MESSAGES:', groupMsgs);

  const calls = await prisma.callHistoryRecord.count();
  console.log('CALL HISTORY RECORDS:', calls);
}

main().finally(() => prisma.$disconnect());
