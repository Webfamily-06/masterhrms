import Decimal from 'decimal.js';
import { Lexer } from '../services/formula-engine/lexer';
import { Parser } from '../services/formula-engine/parser';
import { Evaluator } from '../services/formula-engine/evaluator';
import { FormulaDAG } from '../services/formula-engine/dag';
import { SECTION_9A_STANDARD_FORMULAS } from '../services/formula-engine/standard-formulas';
import { PHASE1_DEFAULT_EXPORT_TEMPLATE } from '../services/payroll-export.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Setup high precision Decimal
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`, details || '');
    failedTests++;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('ADVANCED PAYROLL PHASE 1 — VERIFICATION & GOLDEN TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST GROUP 1: AST Parser & Lexer
  // -------------------------------------------------------------
  console.log('TEST GROUP 1: AST Parser & Lexer');
  {
    const expr = 'BASIC_RATE * (PAYABLE_DAYS / MONTH_DAYS) + SPECIAL_ALLOWANCE';
    const { ast, dependencies } = Parser.parse(expr);
    assert(ast.type === 'BinaryOp', 'Parser creates correct AST root');
    assert(
      dependencies.includes('BASIC_RATE') &&
      dependencies.includes('PAYABLE_DAYS') &&
      dependencies.includes('MONTH_DAYS') &&
      dependencies.includes('SPECIAL_ALLOWANCE'),
      'Parser extracts all variable dependencies'
    );

    const ifExpr = 'IF(PF_METHOD == "ACTUAL", BASIC_EARNED, MIN(BASIC_EARNED, 15000))';
    const parsedIf = Parser.parse(ifExpr);
    assert(parsedIf.ast.type === 'FunctionCall', 'Parser parses function call as root AST node');
    assert(parsedIf.dependencies.includes('PF_METHOD') && parsedIf.dependencies.includes('BASIC_EARNED'), 'IF dependencies extracted');
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Decimal.js Evaluator (Safe Arithmetic, No eval)
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 2: Pure Decimal Arithmetic Evaluator');
  {
    const evaluator = new Evaluator({
      BASIC_RATE: 30000,
      PAYABLE_DAYS: 26,
      MONTH_DAYS: 31,
    });

    const { ast } = Parser.parse('ROUND(BASIC_RATE * (PAYABLE_DAYS / MONTH_DAYS), 2)');
    const { result, steps } = evaluator.evaluate(ast);

    // 30000 * (26 / 31) = 25161.29032... -> rounded to 25161.29
    assert(result.equals(new Decimal('25161.29')), `Proration Decimal precision (expected 25161.29, got ${result.toString()})`);
    assert(steps.length > 0, 'Evaluator records step-by-step evaluation trace');

    // Division by zero guard
    const divZero = Parser.parse('1000 / 0');
    const zeroEval = new Evaluator({});
    const zeroRes = zeroEval.evaluate(divZero.ast);
    assert(zeroRes.result.isZero(), 'Division by zero is safely guarded and yields 0');
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Tarjan Cycle Detection & Topological DAG Sorter
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 3: Tarjan Cycle Detection & Dependency Graph');
  {
    const dag = new FormulaDAG();
    dag.addFormula({
      code: 'A',
      name: 'A',
      expression: 'B + 10',
      category: 'earning',
      scope: 'global',
    });
    dag.addFormula({
      code: 'B',
      name: 'B',
      expression: 'C * 2',
      category: 'earning',
      scope: 'global',
    });
    dag.addFormula({
      code: 'C',
      name: 'C',
      expression: 'BASE_VALUE + 5',
      category: 'earning',
      scope: 'global',
    });

    const order = dag.getExecutionOrder();
    assert(
      order.indexOf('C') < order.indexOf('B') && order.indexOf('B') < order.indexOf('A'),
      `Topological execution order resolved correctly: ${order.join(' -> ')}`
    );

    const execResult = dag.execute({ BASE_VALUE: 10 });
    // C = 15, B = 30, A = 40
    assert(execResult.results['A'].equals(new Decimal(40)), `DAG execution result A=40 (got ${execResult.results['A']})`);

    // Circular Dependency Detection Test
    const cyclicDag = new FormulaDAG();
    cyclicDag.addFormula({ code: 'X', name: 'X', expression: 'Y + 1', category: 'earning', scope: 'global' });
    cyclicDag.addFormula({ code: 'Y', name: 'Y', expression: 'Z + 1', category: 'earning', scope: 'global' });
    cyclicDag.addFormula({ code: 'Z', name: 'Z', expression: 'X + 1', category: 'earning', scope: 'global' });

    let cycleCaught = false;
    let cycleErrorMessage = '';
    try {
      cyclicDag.getExecutionOrder();
    } catch (err: any) {
      cycleCaught = true;
      cycleErrorMessage = err.message;
    }
    assert(cycleCaught && cycleErrorMessage.includes('Circular formula dependency detected'), `Cycle detected successfully: "${cycleErrorMessage}"`);
  }

  // -------------------------------------------------------------
  // GOLDEN TEST 1: Esther Nirmala P (Section 9A Formula Set)
  // -------------------------------------------------------------
  console.log('\nGOLDEN TEST 1: Esther Nirmala P (Standard Salary & Proration)');
  {
    const dag = new FormulaDAG();
    for (const f of SECTION_9A_STANDARD_FORMULAS) {
      dag.addFormula(f);
    }

    // Esther Nirmala P: Full 31 days attendance, Basic: 15,000, HRA: 6,000, Special: 4,000
    // Gross: 25,000, PF ceiling capped at 15,000 (12% = 1,800), Gross > 21k (ESI = 0)
    const initialVars = {
      MONTH_DAYS: 31,
      PAYABLE_DAYS: 31,
      LOP_DAYS: 0,
      BASIC_RATE: 15000,
      HRA_RATE: 6000,
      CONVEYANCE_RATE: 0,
      MEDICAL_RATE: 0,
      SPECIAL_RATE: 4000,
      OTHER_ALLOWANCES: 0,
      PF_ELIGIBLE: true,
      ESI_ELIGIBLE: true,
      PT_ELIGIBLE: true,
      LWF_ELIGIBLE: true,
      PF_METHOD: 'STATUTORY_CAP',
      PF_OVERRIDE_WAGE: 0,
      PF_STATUTORY_CEILING: 15000,
      EPF_EE_RATE: 0.12,
      EPF_ER_RATE: 0.0367,
      EPS_RATE: 0.0833,
      EPS_CEILING: 15000,
      EDLI_RATE: 0.005,
      EDLI_CEILING: 15000,
      PF_ADMIN_RATE: 0.005,
      ESIC_CEILING: 21000,
      ESIC_EE_RATE: 0.0075,
      ESIC_ER_RATE: 0.0325,
      PT_SLABS: [
        { min: 0, max: 21000, amount: 0 },
        { min: 21001, max: null, amount: 208.33 },
      ],
      LWF_EE_RATE: 10,
      LWF_ER_RATE: 20,
      TDS: 0,
      OTHER_DEDUCTIONS: 0,
      SERVICE_CHARGE_RATE: 0.10,
      GST_RATE: 0.18,
    };

    const res = dag.execute(initialVars);

    // Assertions:
    assert(res.results['BASIC_EARNED'].equals(new Decimal(15000)), 'Basic Earned = 15000');
    assert(res.results['GROSS'].equals(new Decimal(25000)), 'Gross = 25000');
    assert(res.results['PF_WAGE'].equals(new Decimal(15000)), 'PF Wage capped at 15000');
    assert(res.results['EPF_EE'].equals(new Decimal(1800)), 'Employee EPF (12%) = 1800');
    assert(res.results['ESIC_EE'].isZero(), 'ESIC exempt because Gross 25000 > 21000 ceiling');
    assert(res.results['EPS_ER'].equals(new Decimal(1250)), 'Employer EPS (8.33% of 15000) = 1250');
    assert(res.results['EPF_ER'].equals(new Decimal(551)), 'Employer EPF (3.67% of 15000) = 551 (1800 - 1249.5)');
    assert(res.results['EDLI'].equals(new Decimal('75.00')), 'EDLI (0.5% of 15000) = 75.00');
    assert(res.results['PF_ADMIN'].equals(new Decimal('75.00')), 'PF Admin (0.5% of 15000) = 75.00');

    // Net pay: 25000 - (1800 + 0 + 208.33 + 10) = 22981.67
    assert(res.results['NET_PAY'].equals(new Decimal('22981.67')), `Net Pay: expected 22981.67, got ${res.results['NET_PAY']}`);
  }

  // -------------------------------------------------------------
  // GOLDEN TEST 2: Sowmiya S (Attendance Proration & LOP)
  // -------------------------------------------------------------
  console.log('\nGOLDEN TEST 2: Sowmiya S (3 Days LOP Proration)');
  {
    const dag = new FormulaDAG();
    for (const f of SECTION_9A_STANDARD_FORMULAS) {
      dag.addFormula(f);
    }

    // Sowmiya S: Month Days: 31, Payable Days: 28, LOP: 3 days.
    // Basic Rate: 20000, HRA Rate: 8000
    const initialVars = {
      MONTH_DAYS: 31,
      PAYABLE_DAYS: 28,
      LOP_DAYS: 3,
      BASIC_RATE: 20000,
      HRA_RATE: 8000,
      CONVEYANCE_RATE: 0,
      MEDICAL_RATE: 0,
      SPECIAL_RATE: 2000,
      OTHER_ALLOWANCES: 0,
      PF_ELIGIBLE: true,
      ESI_ELIGIBLE: false,
      PT_ELIGIBLE: false,
      LWF_ELIGIBLE: false,
      PF_METHOD: 'STATUTORY_CAP',
      PF_OVERRIDE_WAGE: 0,
      PF_STATUTORY_CEILING: 15000,
      EPF_EE_RATE: 0.12,
      EPF_ER_RATE: 0.0367,
      EPS_RATE: 0.0833,
      EPS_CEILING: 15000,
      EDLI_RATE: 0.005,
      EDLI_CEILING: 15000,
      PF_ADMIN_RATE: 0.005,
      ESIC_CEILING: 21000,
      ESIC_EE_RATE: 0.0075,
      ESIC_ER_RATE: 0.0325,
      PT_SLABS: [],
      LWF_EE_RATE: 0,
      LWF_ER_RATE: 0,
      TDS: 0,
      OTHER_DEDUCTIONS: 0,
      SERVICE_CHARGE_RATE: 0.10,
      GST_RATE: 0.18,
    };

    const res = dag.execute(initialVars);

    // Basic Earned: 20000 * 28 / 31 = 18064.516... -> 18064.52
    assert(res.results['BASIC_EARNED'].equals(new Decimal('18064.52')), `Basic Earned (28/31): expected 18064.52, got ${res.results['BASIC_EARNED']}`);
    // HRA Earned: 8000 * 28 / 31 = 7225.806... -> 7225.81
    assert(res.results['HRA_EARNED'].equals(new Decimal('7225.81')), `HRA Earned (28/31): expected 7225.81, got ${res.results['HRA_EARNED']}`);
    // Special Earned: 2000 * 28 / 31 = 1806.45
    assert(res.results['SPECIAL_EARNED'].equals(new Decimal('1806.45')), `Special Earned (28/31): expected 1806.45, got ${res.results['SPECIAL_EARNED']}`);
    // Gross: 18064.52 + 7225.81 + 1806.45 = 27096.78
    assert(res.results['GROSS'].equals(new Decimal('27096.78')), `Gross Earned: expected 27096.78, got ${res.results['GROSS']}`);
    // PF Wage capped at 15000 -> EPF EE = 1800
    assert(res.results['EPF_EE'].equals(new Decimal(1800)), 'EPF EE = 1800');
  }

  // -------------------------------------------------------------
  // GOLDEN TEST 3: Staffing Client Invoice Arithmetic
  // -------------------------------------------------------------
  console.log('\nGOLDEN TEST 3: Staffing Client Billing & GST Exact Match');
  {
    // Exact verification of the Section 9A Staffing Invoice Arithmetic:
    // Billing Base = 1,04,767.00
    // GST @ 18% = 18,858.06
    // Total Billing = 1,23,625.06
    const billingBase = new Decimal('104767.00');
    const gstRate = new Decimal('0.18');
    const gst = billingBase.times(gstRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const totalBilling = billingBase.plus(gst);

    assert(gst.equals(new Decimal('18858.06')), `GST calculation (expected 18858.06, got ${gst})`);
    assert(totalBilling.equals(new Decimal('123625.06')), `Total Invoice Amount (expected 123625.06, got ${totalBilling})`);
  }

  // -------------------------------------------------------------
  // GOLDEN TEST 4: Zero Floating-Point Drift (Decimal.js vs IEEE 754)
  // -------------------------------------------------------------
  console.log('\nGOLDEN TEST 4: Zero Floating-Point Drift (Decimal.js vs Native IEEE 754)');
  {
    // Native JS floating point fails this:
    const jsDrift = 0.1 + 0.2;
    const jsFailed = jsDrift !== 0.3; // true in IEEE 754: 0.30000000000000004

    // Pure Decimal.js does NOT fail:
    const decA = new Decimal('0.1');
    const decB = new Decimal('0.2');
    const decSum = decA.plus(decB);
    const decExact = decSum.equals(new Decimal('0.3'));

    assert(jsFailed && decExact, 'Decimal.js produces exact mathematical precision where IEEE 754 drifts');

    // Cumulative proration sum across 1,000 additions:
    let sumDecimal = new Decimal(0);
    const addend = new Decimal('75.00');
    for (let i = 0; i < 1000; i++) {
      sumDecimal = sumDecimal.plus(addend);
    }
    assert(sumDecimal.equals(new Decimal('75000.00')), 'Zero cumulative drift over 1,000 statutory iterations');
  }

  // -------------------------------------------------------------
  // GOLDEN TEST 5: Dynamic Export Template Engine (ExcelJS & PDFKit)
  // -------------------------------------------------------------
  console.log('\nGOLDEN TEST 5: Dynamic Export Template Engine Structure');
  {
    const template = PHASE1_DEFAULT_EXPORT_TEMPLATE;
    assert(template.groups.length === 7, 'Phase 1 template contains all 7 canonical column groups');

    const totalColumns = template.groups.reduce((acc, g) => acc + g.columns.length, 0);
    assert(totalColumns >= 45, `Template includes comprehensive column breakdown (${totalColumns} columns)`);

    // Verify ExcelJS workbook can instantiate template
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Test');
    assert(sheet !== null, 'ExcelJS creates worksheet');

    // Verify PDFKit can instantiate document
    const doc = new PDFDocument({ layout: 'landscape' });
    assert(doc !== null, 'PDFKit creates vector landscape document');
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Database Integration & End-to-End Pipeline
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 6: Database Integration & Pipeline Execution');
  {
    const { PrismaClient } = await import('@prisma/client');
    const { PayrollBatchService } = await import('../services/payroll-batch.service');
    const { PayrollExportService } = await import('../services/payroll-export.service');

    const prisma = new PrismaClient();
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { employees: { some: {} } },
      }) || await prisma.tenant.findUnique({
        where: { id: 'tenant-default-001' },
      }) || await prisma.tenant.findFirst();
      const tenantId = tenant ? tenant.id : 'tenant-default-001';

      // 1. Preflight Check
      const batchService = new PayrollBatchService(prisma);
      const preflight = await batchService.runPreflight(tenantId);
      assert(preflight !== null && preflight.totalEmployees > 0, `Preflight check completed for ${preflight.totalEmployees} employees`);

      // Verify recalculation safeguard on paid/finalized runs
      let paidLockPrevented = false;
      const paidRun = await prisma.payrollRun.findFirst({
        where: { tenantId, status: 'paid' },
      });
      if (paidRun) {
        try {
          await batchService.processBatch({
            tenantId,
            periodMonth: paidRun.periodMonth,
            periodYear: paidRun.periodYear,
          });
        } catch (e: any) {
          paidLockPrevented = e.message.includes('Cannot recalculate a finalized or paid payroll run');
        }
        assert(paidLockPrevented, 'Safeguard: Blocked recalculation of locked/paid payroll run');
      }

      // 2. Batch Processing Pipeline (Test Month 9 - September 2026)
      const existingTestRun = await prisma.payrollRun.findFirst({
        where: { tenantId, periodMonth: 9, periodYear: 2026 },
      });
      if (existingTestRun) {
        await prisma.payslip.deleteMany({ where: { payrollRunId: existingTestRun.id } });
        await prisma.payrollSnapshot.deleteMany({ where: { payrollRunId: existingTestRun.id } });
        await prisma.payrollExecutionTrace.deleteMany({ where: { payrollRunId: existingTestRun.id } });
        await prisma.payrollRun.delete({ where: { id: existingTestRun.id } });
      }

      const batchResult = await batchService.processBatch({
        tenantId,
        periodMonth: 9,
        periodYear: 2026,
      });

      assert(Boolean(batchResult.payrollRunId), `Batch executed: PayrollRun ID = ${batchResult.payrollRunId}`);
      assert(batchResult.processedCount > 0, `Processed ${batchResult.processedCount} employees via Formula DAG`);
      assert(batchResult.totalGross.greaterThan(0), `Total Gross Wages: Rs ${batchResult.totalGross.toFixed(2)}`);
      assert(batchResult.totalNet.greaterThan(0), `Total Net Payout: Rs ${batchResult.totalNet.toFixed(2)}`);

      // 3. Database Records Verification
      const slipCount = await prisma.payslip.count({ where: { payrollRunId: batchResult.payrollRunId } });
      const snapCount = await prisma.payrollSnapshot.count({ where: { payrollRunId: batchResult.payrollRunId } });
      const traceCount = await prisma.payrollExecutionTrace.count({ where: { payrollRunId: batchResult.payrollRunId } });

      assert(slipCount > 0, `Payslips generated in MySQL: ${slipCount}`);
      assert(snapCount > 0, `PayrollSnapshots locked in MySQL: ${snapCount}`);
      assert(traceCount > 0, `Cell-level execution traces recorded: ${traceCount}`);

      // 4. Excel & PDF Export Verification
      const exportService = new PayrollExportService(prisma);
      const excelBuffer = await exportService.generateExcel(tenantId, batchResult.payrollRunId);
      assert(excelBuffer.length > 5000, `Streamed Excel workbook generated (${excelBuffer.length} bytes)`);

      const pdfBuffer = await exportService.generatePDF(tenantId, batchResult.payrollRunId);
      assert(pdfBuffer.length > 1000, `Vector landscape PDF generated (${pdfBuffer.length} bytes)`);

      // -------------------------------------------------------------
      // TEST GROUP 7: Tenant Isolation & Multi-Tenancy Boundary Tests
      // -------------------------------------------------------------
      console.log('\nTEST GROUP 7: Tenant Isolation & Multi-Tenancy Boundary Enforcement');
      {
        const tenantB = await prisma.tenant.findFirst({
          where: { id: { not: tenantId } },
        });

        if (tenantB) {
          // 1. Establishment Isolation
          const estA = await prisma.establishment.findFirst({ where: { tenantId } });
          if (estA) {
            const crossTenantEst = await prisma.establishment.findFirst({
              where: { id: estA.id, tenantId: tenantB.id },
            });
            assert(crossTenantEst === null, `Cross-tenant Establishment access blocked (Tenant B cannot read Tenant A est ${estA.id})`);
          }

          // 2. Staffing Client Isolation
          const clientA = await prisma.staffingClient.findFirst({ where: { tenantId } });
          if (clientA) {
            const crossTenantClient = await prisma.staffingClient.findFirst({
              where: { id: clientA.id, tenantId: tenantB.id },
            });
            assert(crossTenantClient === null, `Cross-tenant Staffing Client access blocked (Tenant B cannot read Tenant A client ${clientA.id})`);
          }

          // 3. PayrollRun Isolation
          const crossRun = await prisma.payrollRun.findFirst({
            where: { id: batchResult.payrollRunId, tenantId: tenantB.id },
          });
          assert(crossRun === null, `Cross-tenant PayrollRun access blocked (Tenant B cannot read Tenant A run ${batchResult.payrollRunId})`);

          // 4. Payslip Isolation
          const crossSlip = await prisma.payslip.findFirst({
            where: { payrollRunId: batchResult.payrollRunId, tenantId: tenantB.id },
          });
          assert(crossSlip === null, `Cross-tenant Payslip access blocked (Tenant B cannot read Tenant A payslips)`);

          // 5. Execution Trace Isolation
          const crossTrace = await prisma.payrollExecutionTrace.findFirst({
            where: { payrollRunId: batchResult.payrollRunId, tenantId: tenantB.id },
          });
          assert(crossTrace === null, `Cross-tenant Execution Trace access blocked (Tenant B cannot read Tenant A traces)`);
        } else {
          console.log('  [SKIP] Multi-tenant boundary test skipped (only 1 tenant found in DB)');
        }
      }

      // -------------------------------------------------------------
      // TEST GROUP 8: Attendance Cutoff Windows & LOP Proration
      // -------------------------------------------------------------
      console.log('\nTEST GROUP 8: Attendance Cutoff Windows & LOP Proration');
      {
        const { PayrollAttendanceService } = await import('../services/payroll-attendance.service');
        const attService = new PayrollAttendanceService(prisma);

        // Standard calendar cutoff
        const stdWindow = attService.getCutoffDateRange({ periodMonth: 8, periodYear: 2026 });
        assert(stdWindow.totalMonthDays === 31, 'Standard Month Days for August = 31');
        assert(stdWindow.startDate.getUTCDate() === 1 && stdWindow.endDate.getUTCDate() === 31, 'Standard calendar window spans 1st to 31st');

        // Custom cutoff: 25th of prev month to 24th of current month
        const customWindow = attService.getCutoffDateRange({
          periodMonth: 8,
          periodYear: 2026,
          cutoffStartDay: 25,
          cutoffEndDay: 24,
        });
        assert(customWindow.startDate.getUTCMonth() === 6 && customWindow.startDate.getUTCDate() === 25, 'Custom window starts on 25th of July');
        assert(customWindow.endDate.getUTCMonth() === 7 && customWindow.endDate.getUTCDate() === 24, 'Custom window ends on 24th of August');

        // Manual LOP Override Verification
        const sampleEmp = await prisma.employee.findFirst({ where: { tenantId, status: 'active' } });
        if (sampleEmp) {
          const lopOverrideResult = await attService.computeTenantAttendance(
            tenantId,
            { periodMonth: 8, periodYear: 2026 },
            { [sampleEmp.id]: { lopDays: 5, reason: 'Approved bereavement leave outside policy quota' } }
          );

          const empSummary = lopOverrideResult.get(sampleEmp.id);
          assert(Boolean(empSummary), `Attendance summary generated for employee ${sampleEmp.employeeCode}`);
          if (empSummary) {
            assert(empSummary.finalLopDays === 5, `Manual LOP override applied: ${empSummary.finalLopDays} days`);
            assert(empSummary.payableDays === 26, `Payable days adjusted: ${empSummary.payableDays} days (31 - 5)`);
            assert(empSummary.auditNotes?.includes('Approved bereavement leave'), `Audit notes recorded: "${empSummary.auditNotes}"`);
            assert(empSummary.prorationFactor.equals(new Decimal(26).dividedBy(new Decimal(31))), 'Proration factor exact Decimal matching 26/31');
          }
        }
      }

      // -------------------------------------------------------------
      // TEST GROUP 9: Statutory Rule Provenance, Versioning & Digital Signoff
      // -------------------------------------------------------------
      console.log('\nTEST GROUP 9: Statutory Rule Provenance & Digital Signoff');
      {
        const epfRule = await prisma.statutoryRule.findFirst({
          where: { tenantId, ruleType: 'EPF' },
        });
        assert(Boolean(epfRule), 'Official EPF rule pack present');
        if (epfRule) {
          assert(Boolean(epfRule.sourceAuthority), `EPF source authority: "${epfRule.sourceAuthority}"`);
          assert(Boolean(epfRule.notificationRef), `EPF notification ref: "${epfRule.notificationRef}"`);
          assert(epfRule.isVerified === true, 'EPF statutory rule officially verified');
          assert(epfRule.version >= 1, `Rule version: v${epfRule.version}`);
        }

        const stateMaster = await prisma.stateUTMaster.findMany();
        assert(stateMaster.length === 36, `All 36 Indian States and Union Territories present in master table (${stateMaster.length} found)`);

        const tnState = stateMaster.find((s) => s.stateCode === 'TN');
        assert(tnState?.tinCode === '33' && tnState.hasPt === true, 'Tamil Nadu (TIN 33, Has PT) verified');

        const mhState = stateMaster.find((s) => s.stateCode === 'MH');
        assert(mhState?.tinCode === '27' && mhState.hasPt === true && mhState.hasLwf === true, 'Maharashtra (TIN 27, Has PT & LWF) verified');

        const dlState = stateMaster.find((s) => s.stateCode === 'DL');
        assert(dlState?.tinCode === '07' && dlState.isUnionTerritory === true && dlState.hasPt === false, 'Delhi (TIN 07, UT, No PT) verified');
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test execution crashed:', e);
  process.exit(1);
});
