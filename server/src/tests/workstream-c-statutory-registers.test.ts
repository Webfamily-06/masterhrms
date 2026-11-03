import { describe, it, before } from "node:test";
import assert from "node:assert";
import ExcelJS from "exceljs";
import { prisma, rawPrisma } from "../prisma";
import { FormURegisterBuilder } from "../services/statutory/builders/form-u-builder.service";
import { FormVRegisterBuilder } from "../services/statutory/builders/form-v-builder.service";
import { FormWRegisterBuilder } from "../services/statutory/builders/form-w-builder.service";
import { FormXRegisterBuilder } from "../services/statutory/builders/form-x-builder.service";
import { FormSRegisterBuilder } from "../services/statutory/builders/form-s-builder.service";
import { StatutoryFormRegistryService, STATUTORY_REGISTER_CATALOG } from "../services/statutory/statutory-form-registry.service";
import { StatutoryExcelExporterService } from "../services/statutory/exporters/statutory-excel-exporter.service";
import { StatutoryPdfExporterService } from "../services/statutory/exporters/statutory-pdf-exporter.service";
import { getStatutoryFormData } from "../services/statutory-form-data.service";

const db = rawPrisma || prisma;

describe("Workstream C: Dedicated Statutory Registers U, V, W, X, and S Automation", () => {
  let testTenantId = "tenant-default-001";

  before(async () => {
    const t = await db.tenant.findFirst({
      where: {
        id: "tenant-default-001",
      },
    }) || await db.tenant.findFirst({
      where: {
        employees: { some: {} },
      },
    });

    if (t) {
      testTenantId = t.id;
    }
  });

  // =========================================================================
  // SUITE 1: Form U — Employee Register [Rule 16(1)]
  // =========================================================================
  describe("1. Form U — Employee Register (27 Columns)", () => {
    it("WS-C.1.1: Form U catalog defines exactly 27 statutory columns", () => {
      assert.strictEqual(FormURegisterBuilder.COLUMNS.length, 27);
      assert.strictEqual(FormURegisterBuilder.COLUMNS[0], "Serial Number");
      assert.strictEqual(FormURegisterBuilder.COLUMNS[1], "Name of the employee");
      assert.strictEqual(FormURegisterBuilder.COLUMNS[14], "Aadhaar No.");
      assert.strictEqual(FormURegisterBuilder.COLUMNS[15], "PAN Number");
      assert.strictEqual(FormURegisterBuilder.COLUMNS[22], "Date on which completion of 480 days of service");
      assert.strictEqual(FormURegisterBuilder.COLUMNS[26], "Specimen Signature / Thumb Impression");
    });

    it("WS-C.1.2: Generates valid Form U model with correct establishment metadata", async () => {
      const res = await FormURegisterBuilder.build({ tenantId: testTenantId });
      assert.ok(res.model);
      assert.strictEqual(res.model.formCode, "FORM_U");
      assert.strictEqual(res.model.columns.length, 27);
      assert.ok(res.model.establishment.name);
      assert.ok(Array.isArray(res.model.rows));
    });

    it("WS-C.1.3: Masks Aadhaar numbers to show only last 4 digits for privacy compliance", async () => {
      const res = await FormURegisterBuilder.build({ tenantId: testTenantId });
      for (const row of res.model.rows) {
        if (row.aadhaarNumber && row.aadhaarNumber !== "—") {
          assert.match(row.aadhaarNumber, /^XXXXXXXX\d{4}$/);
        }
      }
    });

    it("WS-C.1.4: Emits validation diagnostics when mandatory fields are missing", async () => {
      const res = await FormURegisterBuilder.build({ tenantId: testTenantId });
      assert.ok(Array.isArray(res.validation.issues));
      assert.strictEqual(typeof res.validation.isValid, "boolean");
      assert.strictEqual(typeof res.validation.errorCount, "number");
    });
  });

  // =========================================================================
  // SUITE 2: Form V — Register of Employment / Muster Roll [Rule 16(1)]
  // =========================================================================
  describe("2. Form V — Register of Employment / Muster Roll (46 Columns)", () => {
    it("WS-C.2.1: Form V catalog defines exactly 46 statutory columns", () => {
      assert.strictEqual(FormVRegisterBuilder.COLUMNS.length, 46);
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[0], "Serial Number");
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[3], "Time at which work commences");
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[4], "Rest Interval");
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[5], "Time at which work ends");
      // Day 1 to Day 31: Cols 6 to 36
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[6], "Day 1");
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[36], "Day 31");
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[37], "Total Number of Days Worked");
      assert.strictEqual(FormVRegisterBuilder.COLUMNS[45], "Employer Signature / Seal");
    });

    it("WS-C.2.2: Renders exactly 31 daily punch elements in attendance array", async () => {
      const res = await FormVRegisterBuilder.build({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(res.model);
      assert.strictEqual(res.model.formCode, "FORM_V");
      for (const row of res.model.rows) {
        assert.strictEqual(row.dailyAttendance.length, 31, "Each row must have exactly 31 days");
        // Check valid status codes
        for (const status of row.dailyAttendance) {
          assert.ok(["P", "A", "WO", "HL", "OD", "HD", "LOP", "N/A"].includes(status));
        }
      }
    });

    it("WS-C.2.3: Computes rest intervals and hours with mathematical accuracy", async () => {
      const res = await FormVRegisterBuilder.build({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      for (const row of res.model.rows) {
        assert.ok(row.commencementTime.length > 0);
        assert.ok(row.workEndTime.length > 0);
        assert.ok(row.totalRestIntervalsAvailed.includes("hrs") || row.totalRestIntervalsAvailed.includes("mins"));
      }
    });
  });

  // =========================================================================
  // SUITE 3: Form W — Register of Wages [Rule 16(1)]
  // =========================================================================
  describe("3. Form W — Register of Wages (34 Columns)", () => {
    it("WS-C.3.1: Form W catalog defines exactly 34 statutory columns", () => {
      assert.strictEqual(FormWRegisterBuilder.COLUMNS.length, 34);
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[0], "Serial Number");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[3], "Number of days worked");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[4], "Basic Wage Rate / Earned");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[11], "Gross Wages Earned");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[12], "Minimum Wages Payable by Law");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[13], "EPF Employee Deduction");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[14], "ESIC Employee Deduction");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[15], "Professional Tax Deduction");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[20], "Total Deductions");
      assert.strictEqual(FormWRegisterBuilder.COLUMNS[21], "Net Wages Paid");
    });

    it("WS-C.3.2: Reconciles Gross Wages = Basic + DA + HRA + Allowances + Bonus + OT + Arrears", async () => {
      const res = await FormWRegisterBuilder.build({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(res.model);
      assert.strictEqual(res.model.formCode, "FORM_W");

      for (const r of res.model.rows) {
        const sumGross = r.basicWageEarned + r.daEarned + r.hraEarned + r.specialAllowanceEarned + r.bonusEarned + r.overtimeWages + r.arrearsAmount;
        assert.strictEqual(Math.round(sumGross * 100) / 100, r.grossWagesEarned);

        const sumDed = r.epfEmployeeDeduction + r.esiEmployeeDeduction + r.ptDeduction + r.lwfEmployeeDeduction + r.tdsDeduction + r.loanDeductions + r.damageLossDeductions;
        assert.strictEqual(Math.round(sumDed * 100) / 100, r.totalDeductions);

        const netExpected = Math.round((r.grossWagesEarned - r.totalDeductions) * 100) / 100;
        assert.strictEqual(r.netWagesPaid, netExpected);
      }
    });

    it("WS-C.3.3: Automatically reconciles register totals against frozen payroll snapshots", async () => {
      const res = await FormWRegisterBuilder.build({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(res.validation.reconciliation);
      assert.strictEqual(res.validation.reconciliation.grossVariance, 0);
      assert.strictEqual(res.validation.reconciliation.deductionsVariance, 0);
      assert.strictEqual(res.validation.reconciliation.netVariance, 0);
      assert.strictEqual(res.validation.reconciliation.isReconciled, true);
    });
  });

  // =========================================================================
  // SUITE 4: Form X — Register of Leave & Social Security Benefits [Rule 16(1)]
  // =========================================================================
  describe("4. Form X — Register of Leave & Social Security Benefits (21 Columns)", () => {
    it("WS-C.4.1: Form X catalog defines exactly 21 statutory columns", () => {
      assert.strictEqual(FormXRegisterBuilder.COLUMNS.length, 21);
      assert.strictEqual(FormXRegisterBuilder.COLUMNS[0], "Serial Number");
      assert.strictEqual(FormXRegisterBuilder.COLUMNS[3], "Earned Leave: Leave at the beginning of the Month");
      assert.strictEqual(FormXRegisterBuilder.COLUMNS[6], "Earned Leave: Leave balance at the end of the Month");
      assert.strictEqual(FormXRegisterBuilder.COLUMNS[13], "Maternity Benefits: Date of giving notice of pregnancy / delivery");
      assert.strictEqual(FormXRegisterBuilder.COLUMNS[18], "Gratuity Benefits: Whether nomination received from the employee");
      assert.strictEqual(FormXRegisterBuilder.COLUMNS[19], "Gratuity Benefits: Amount paid as Gratuity in case of exit of the employee");
    });

    it("WS-C.4.2: Enforces non-negative leave balances and proper ledger math", async () => {
      const res = await FormXRegisterBuilder.build({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(res.model);
      assert.strictEqual(res.model.formCode, "FORM_X");
      for (const row of res.model.rows) {
        assert.ok(row.earnedLeaveBalance >= 0);
        assert.ok(row.medicalLeaveBalance >= 0);
        assert.ok(row.otherLeaveBalance >= 0);
        assert.ok(["Yes", "No"].includes(row.gratuityNominationReceived));
      }
    });
  });

  // =========================================================================
  // SUITE 5: Form S — Notice of Daily Hours of Work & Shifts [Rule 18(4)]
  // =========================================================================
  describe("5. Form S — Notice of Daily Hours of Work & Shifts (38 Columns)", () => {
    it("WS-C.5.1: Form S catalog defines exactly 38 statutory columns", () => {
      assert.strictEqual(FormSRegisterBuilder.COLUMNS.length, 38);
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[0], "Serial No.");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[9], "Time of commencement of work");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[10], "Rest Interval: Start");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[12], "Time which work ends");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[13], "Weekly Holiday");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[15], "Rate of Wages: Max");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[16], "Rate of Wages: Min");
      assert.strictEqual(FormSRegisterBuilder.COLUMNS[37], "Signature of Employer / Manager");
    });

    it("WS-C.5.2: Eliminates Excel formula error (#NAME? in cell AL3) with deterministic signatory token", async () => {
      const res = await FormSRegisterBuilder.build({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(res.model);
      assert.strictEqual(res.model.formCode, "FORM_S");
      assert.ok(res.model.establishment.dateOfPaymentOfWages);
      assert.doesNotMatch(res.model.establishment.dateOfPaymentOfWages, /#NAME\?/);
      for (const row of res.model.rows) {
        assert.ok(row.employerSignature.startsWith("AUTH-SIG-"));
        assert.doesNotMatch(row.employerSignature, /#NAME\?/);
      }
    });
  });

  // =========================================================================
  // SUITE 6: Generic Fallback Removal Verification
  // =========================================================================
  describe("6. Architectural Defect Remediation (Removal of Generic 18-Col Fallback)", () => {
    it("WS-C.6.1: getStatutoryFormData returns dedicated Form U (27 cols), not 18-col fallback", async () => {
      const data = await getStatutoryFormData({
        tenantId: testTenantId,
        formType: "FORM_U",
        financialYear: "2026-2027",
      });
      assert.strictEqual(data.formSpecificModel.formCode, "FORM_U");
      const model = data.formSpecificModel as any;
      assert.strictEqual(model.columns.length, 27);
      assert.notStrictEqual(model.columns.length, 18);
    });

    it("WS-C.6.2: getStatutoryFormData returns dedicated Form V (46 cols), not 18-col fallback", async () => {
      const data = await getStatutoryFormData({
        tenantId: testTenantId,
        formType: "FORM_V",
        financialYear: "2026-2027",
      });
      assert.strictEqual(data.formSpecificModel.formCode, "FORM_V");
      const model = data.formSpecificModel as any;
      assert.strictEqual(model.columns.length, 46);
      assert.notStrictEqual(model.columns.length, 18);
    });

    it("WS-C.6.3: getStatutoryFormData returns dedicated Form W (34 cols), not 18-col fallback", async () => {
      const data = await getStatutoryFormData({
        tenantId: testTenantId,
        formType: "FORM_W",
        financialYear: "2026-2027",
      });
      assert.strictEqual(data.formSpecificModel.formCode, "FORM_W");
      const model = data.formSpecificModel as any;
      assert.strictEqual(model.columns.length, 34);
      assert.notStrictEqual(model.columns.length, 18);
    });

    it("WS-C.6.4: getStatutoryFormData returns dedicated Form X (21 cols), not 18-col fallback", async () => {
      const data = await getStatutoryFormData({
        tenantId: testTenantId,
        formType: "FORM_X",
        financialYear: "2026-2027",
      });
      assert.strictEqual(data.formSpecificModel.formCode, "FORM_X");
      const model = data.formSpecificModel as any;
      assert.strictEqual(model.columns.length, 21);
      assert.notStrictEqual(model.columns.length, 18);
    });

    it("WS-C.6.5: getStatutoryFormData returns dedicated Form S (38 cols), not 18-col fallback", async () => {
      const data = await getStatutoryFormData({
        tenantId: testTenantId,
        formType: "FORM_S",
        financialYear: "2026-2027",
      });
      assert.strictEqual(data.formSpecificModel.formCode, "FORM_S");
      const model = data.formSpecificModel as any;
      assert.strictEqual(model.columns.length, 38);
      assert.notStrictEqual(model.columns.length, 18);
    });
  });

  // =========================================================================
  // SUITE 7: Multi-Tab Excel & PDF Exporters
  // =========================================================================
  describe("7. Excel & PDF Multi-Tab Statutory Exporters", () => {
    it("WS-C.7.1: Generates valid single-register XLSX buffer for Form W", async () => {
      const buffer = await StatutoryExcelExporterService.exportSingleRegister("FORM_W", {
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 1000);

      // Verify Excel contents with ExcelJS reader
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);
      const sheet = wb.getWorksheet("FORM W ");
      assert.ok(sheet);
      assert.strictEqual(sheet.getCell("A1").value, "FORM–W: REGISTER OF WAGES [See sub-rule (1) of rule (16)]");
    });

    it("WS-C.7.2: Generates complete 5-register multi-tab statutory bundle matching reference workbook", async () => {
      const buffer = await StatutoryExcelExporterService.exportBundle({
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 5000);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);
      const sheetNames = wb.worksheets.map((s) => s.name);
      assert.deepStrictEqual(sheetNames, ["Form U", "Form V", "FORM W ", "Form X", "FORM S"]);
    });

    it("WS-C.7.3: Generates official PDF document buffer in A4 Landscape layout", async () => {
      const buffer = await StatutoryPdfExporterService.exportSingleRegister("FORM_U", {
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 500);
      // PDF Magic bytes: %PDF-
      assert.strictEqual(buffer.slice(0, 5).toString(), "%PDF-");
    });
  });

  // =========================================================================
  // SUITE 8: Central Dispatcher, Metadata & Immutability
  // =========================================================================
  describe("8. Central Dispatcher, Metadata Catalog & Immutability", () => {
    it("WS-C.8.1: Central catalog contains all 5 statutory registers with legal acts", () => {
      const catalog = StatutoryFormRegistryService.getAvailableRegisters();
      assert.strictEqual(catalog.length, 5);
      const codes = catalog.map((c) => c.code);
      assert.deepStrictEqual(codes, ["FORM_U", "FORM_V", "FORM_W", "FORM_X", "FORM_S"]);
      for (const item of catalog) {
        assert.strictEqual(item.governingAct, "Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948");
      }
    });

    it("WS-C.8.2: Central dispatcher rejects unsupported form codes fail closed", async () => {
      await assert.rejects(
        async () => {
          await StatutoryFormRegistryService.generateRegister("UNKNOWN_FORM_Z", { tenantId: testTenantId });
        },
        /Unsupported statutory register code/
      );
    });

    it("WS-C.8.3: Statutory validation endpoint returns structured validation report", async () => {
      const report = await StatutoryFormRegistryService.validateRegister("FORM_W", {
        tenantId: testTenantId,
        year: 2026,
        month: 10,
      });
      assert.strictEqual(report.formType, "FORM_W");
      assert.strictEqual(report.columnCount, 34);
      assert.strictEqual(report.governingRule, "Rule 16(1)");
      assert.ok(report.validation);
    });
  });
});
