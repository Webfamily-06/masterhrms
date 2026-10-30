const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== F3 AUDIT: TABLE ROW COUNTS ===');
  try { console.log('FileAcl:', await prisma.fileAcl.count()); } catch (e) { console.log('FileAcl error:', e.message); }
  try { console.log('FileShare:', await prisma.fileShare.count()); } catch (e) { console.log('FileShare error:', e.message); }
  try { console.log('FileTeam:', await prisma.fileTeam.count()); } catch (e) { console.log('FileTeam error:', e.message); }
  try { console.log('FileTeamMember:', await prisma.fileTeamMember.count()); } catch (e) { console.log('FileTeamMember error:', e.message); }
  try { console.log('FileLink:', await prisma.fileLink.count()); } catch (e) { console.log('FileLink error:', e.message); }
  try { console.log('FileActivity:', await prisma.fileActivity.count()); } catch (e) { console.log('FileActivity error:', e.message); }
  try { console.log('User:', await prisma.user.count()); } catch (e) { console.log('User error:', e.message); }
  try { console.log('Department:', await prisma.department.count()); } catch (e) { console.log('Department error:', e.message); }
  try { console.log('Tenant:', await prisma.tenant.count()); } catch (e) { console.log('Tenant error:', e.message); }

  console.log('\n=== SAMPLE USERS ===');
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true, name: true, tenantId: true, role: true, departmentId: true },
  });
  console.log(users);

  console.log('\n=== SAMPLE DEPARTMENTS ===');
  const depts = await prisma.department.findMany({
    take: 5,
    select: { id: true, name: true, tenantId: true },
  });
  console.log(depts);
}

check()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
