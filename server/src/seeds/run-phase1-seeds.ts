import { PrismaClient } from '@prisma/client';
import { seedStateUTMaster } from './state-master.seed';
import { seedStatutoryRules } from './statutory-rules.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding State/UT Master (all 36 States/UTs)...');
  await seedStateUTMaster(prisma);

  // Discover all tenants in the system
  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants in database.`);

  const { seedPayrollFormulas } = await import('../services/formula-engine/standard-formulas');
  const { PayrollExportService } = await import('../services/payroll-export.service');
  const exportService = new PayrollExportService(prisma);

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    console.log(`\n--- Seeding for Tenant: ${tenant.name} (${tenantId}) ---`);

    // 1. Seed Statutory Rules
    await seedStatutoryRules(prisma, tenantId);

    // 2. Seed Section 9A Payroll Formulas
    await seedPayrollFormulas(prisma, tenantId);

    // 3. Seed Default 7-Group Export Template
    await exportService.seedDefaultTemplate(tenantId);

    // 4. Seed Default Establishment
    let establishment = await prisma.establishment.findFirst({
      where: { tenantId, stateCode: 'TN' },
    });
    if (!establishment) {
      establishment = await prisma.establishment.create({
        data: {
          tenantId,
          name: `${tenant.name} - Chennai Headquarters`,
          code: 'EST-CHN-01',
          stateCode: 'TN',
          address: '42 Anna Salai, Guindy, Chennai, Tamil Nadu 600032',
          epfCode: 'TN/MAS/0098765/000',
          esicCode: '51000987650000101',
          ptRegistrationNo: 'TN-PT-CH-2026-9812',
          lwfRegistrationNo: 'TN-LWF-2026-4411',
          clraLicenceNo: 'CLRA/TN/2026/0042',
          status: 'active',
        },
      });
      console.log(`  Created default establishment: ${establishment.name}`);
    }

    // 5. Seed Default Staffing Client
    let client = await prisma.staffingClient.findFirst({
      where: { tenantId, code: 'CLI-APEX' },
    });
    if (!client) {
      client = await prisma.staffingClient.create({
        data: {
          tenantId,
          name: 'Apex Enterprise Technologies Ltd',
          code: 'CLI-APEX',
          gstin: '33AABCA9876A1Z5',
          billingStateCode: 'TN',
          address: 'IT Expressway, Sholinganallur, OMR, Chennai 600119',
          serviceChargePct: 10.0,
          serviceChargeBase: 'earned_gross_plus_statutory',
          status: 'active',
        },
      });
      console.log(`  Created default staffing client: ${client.name}`);
    }

    // 6. Ensure Default Salary Structure
    let structure = await prisma.salaryStructure.findFirst({
      where: { tenantId, isDefault: true },
    });
    if (!structure) {
      structure = await prisma.salaryStructure.findFirst({
        where: { tenantId },
      });
    }

    // 7. Seed/Update Active Employee Salary Assignments & KYC fields
    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'active' },
      include: {
        salaryAssignments: { where: { isCurrent: true } },
      },
    });

    if (employees.length > 0 && structure) {
      console.log(`  Ensuring salary assignments for ${employees.length} employees under structure "${structure.name}"...`);
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];

        // Ensure valid KYC & Bank details
        const padIndex = String(i + 1).padStart(4, '0');
        const updateData: any = {};
        if (!emp.bankAccount) updateData.bankAccount = `918200${padIndex}4491`;
        if (!emp.bankIfsc) updateData.bankIfsc = 'HDFC0001234';
        if (!emp.bankName) updateData.bankName = 'HDFC Bank';
        if (!emp.pan) updateData.pan = `ABCDE${padIndex}F`;
        if (!emp.uan) updateData.uan = `1012${padIndex}7890`;
        if (!emp.esiNumber) updateData.esiNumber = `5100${padIndex}00101`;
        if (!emp.workStateCode) updateData.workStateCode = 'TN';
        if (!emp.establishmentId && establishment) updateData.establishmentId = establishment.id;
        if (!emp.clientId && client) updateData.clientId = client.id;

        if (Object.keys(updateData).length > 0) {
          await prisma.employee.update({
            where: { id: emp.id },
            data: updateData,
          });
        }

        // Create assignment if none currently exists
        if (emp.salaryAssignments.length === 0) {
          const monthlyCtc = Number(emp.salary || 35000);
          await prisma.employeeSalaryAssignment.create({
            data: {
              tenantId,
              employeeId: emp.id,
              structureId: structure.id,
              ctcMonthly: monthlyCtc,
              ctcAnnual: monthlyCtc * 12,
              effectiveFrom: new Date('2026-01-01'),
              isCurrent: true,
              taxRegime: emp.taxRegime || 'new',
              remarks: 'Auto-seeded Phase 1 salary assignment',
            },
          });
        }
      }
      console.log(`  Salary assignments and KYC verified for ${employees.length} employees.`);
    }
  }

  // Summary counts
  const stateCount = await prisma.stateUTMaster.count();
  const ruleCount = await prisma.statutoryRule.count();
  const formulaCount = await prisma.payrollFormula.count();
  const templateCount = await prisma.payrollExportTemplate.count();
  const estCount = await prisma.establishment.count();
  const clientCount = await prisma.staffingClient.count();
  const assignCount = await prisma.employeeSalaryAssignment.count();

  console.log(`\n=============================================================`);
  console.log(`PHASE 1 SEED VERIFICATION SUMMARY:`);
  console.log(`- State/UT Master records : ${stateCount}`);
  console.log(`- Statutory Rules         : ${ruleCount}`);
  console.log(`- Payroll Formulas (9A)   : ${formulaCount}`);
  console.log(`- Export Templates        : ${templateCount}`);
  console.log(`- Establishments          : ${estCount}`);
  console.log(`- Staffing Clients        : ${clientCount}`);
  console.log(`- Salary Assignments      : ${assignCount}`);
  console.log(`=============================================================`);
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
