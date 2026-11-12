const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const REPORT_DIR = 'C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-employee-audit';
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('🔍 EMPLOYEE DATA INTEGRITY & DUPLICATE AUDIT (MODE 1: DRY RUN)');
  console.log('====================================================\n');

  // Fetch all employees with related counts
  const allEmployees = await prisma.employee.findMany({
    select: {
      id: true,
      tenantId: true,
      employeeCode: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      userId: true,
      _count: {
        select: {
          attendance: true,
          leaveRequests: true,
          payslips: true,
          companyDocuments: true,
          awards: true,
          assignedAssets: true,
          employeeExits: true,
          transfers: true,
          promotionRecords: true,
          disciplinaryWarnings: true,
        },
      },
    },
  });

  console.log(`Total employees in database: ${allEmployees.length}\n`);

  // 1. Audit Employee Codes by Tenant
  const codeByTenantMap = new Map();
  // 2. Audit Emails by Tenant
  const emailByTenantMap = new Map();
  // 3. Audit Case-Insensitive Emails by Tenant
  const normEmailByTenantMap = new Map();
  // 4. Null or empty emails
  const emptyEmailList = [];

  for (const emp of allEmployees) {
    const tenantId = emp.tenantId;

    // Check code
    const codeKey = `${tenantId}:::${emp.employeeCode.trim()}`;
    if (!codeByTenantMap.has(codeKey)) codeByTenantMap.set(codeKey, []);
    codeByTenantMap.get(codeKey).push(emp);

    // Check email
    const rawEmail = (emp.email || '').trim();
    if (!rawEmail) {
      emptyEmailList.push(emp);
    } else {
      const emailKey = `${tenantId}:::${rawEmail}`;
      if (!emailByTenantMap.has(emailKey)) emailByTenantMap.set(emailKey, []);
      emailByTenantMap.get(emailKey).push(emp);

      const normKey = `${tenantId}:::${rawEmail.toLowerCase()}`;
      if (!normEmailByTenantMap.has(normKey)) normEmailByTenantMap.set(normKey, []);
      normEmailByTenantMap.get(normKey).push(emp);
    }
  }

  // Find Duplicate Code Groups
  const duplicateCodeGroups = [];
  for (const [key, emps] of codeByTenantMap.entries()) {
    if (emps.length > 1) {
      const [tenantId, code] = key.split(':::');
      duplicateCodeGroups.push({
        tenantId,
        field: 'employeeCode',
        value: code,
        count: emps.length,
        employees: emps.map(e => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          status: e.status,
          hasUserId: !!e.userId,
          createdAt: e.createdAt,
          relatedCounts: e._count,
        })),
      });
    }
  }

  // Find Duplicate Email Groups
  const duplicateEmailGroups = [];
  for (const [key, emps] of normEmailByTenantMap.entries()) {
    if (emps.length > 1) {
      const [tenantId, email] = key.split(':::');
      duplicateEmailGroups.push({
        tenantId,
        field: 'email (case-insensitive)',
        value: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Masked for privacy
        count: emps.length,
        employees: emps.map(e => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          status: e.status,
          hasUserId: !!e.userId,
          createdAt: e.createdAt,
          relatedCounts: e._count,
        })),
      });
    }
  }

  console.log(`Duplicate Employee Code Groups: ${duplicateCodeGroups.length}`);
  console.log(`Duplicate Email Groups: ${duplicateEmailGroups.length}`);
  console.log(`Empty / Null Email Count: ${emptyEmailList.length}\n`);

  if (duplicateCodeGroups.length > 0) {
    console.log('--- Duplicate Employee Code Groups Detail ---');
    duplicateCodeGroups.forEach((g, idx) => {
      console.log(`Group ${idx + 1} [Tenant: ${g.tenantId}] Code: '${g.value}' (${g.count} records):`);
      g.employees.forEach(e => {
        const totalRelated = Object.values(e.relatedCounts).reduce((a, b) => a + b, 0);
        console.log(`   - ID: ${e.id} | Name: ${e.name} | Status: ${e.status} | Created: ${e.createdAt.toISOString()} | Related Records: ${totalRelated} | HasUser: ${e.hasUserId}`);
      });
    });
  }

  if (duplicateEmailGroups.length > 0) {
    console.log('\n--- Duplicate Email Groups Detail ---');
    duplicateEmailGroups.forEach((g, idx) => {
      console.log(`Group ${idx + 1} [Tenant: ${g.tenantId}] Email: '${g.value}' (${g.count} records):`);
      g.employees.forEach(e => {
        const totalRelated = Object.values(e.relatedCounts).reduce((a, b) => a + b, 0);
        console.log(`   - ID: ${e.id} | Name: ${e.name} | Status: ${e.status} | Created: ${e.createdAt.toISOString()} | Related Records: ${totalRelated} | HasUser: ${e.hasUserId}`);
      });
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    totalEmployees: allEmployees.length,
    duplicateCodeGroupCount: duplicateCodeGroups.length,
    duplicateEmailGroupCount: duplicateEmailGroups.length,
    emptyEmailCount: emptyEmailList.length,
    duplicateCodeGroups,
    duplicateEmailGroups,
    emptyEmailIds: emptyEmailList.map(e => e.id),
  };

  const reportPath = path.join(REPORT_DIR, 'duplicate_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReconciliation audit report written to: ${reportPath}`);

  await prisma.$disconnect();
})();

