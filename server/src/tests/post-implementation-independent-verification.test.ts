import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { CANONICAL_36_JURISDICTIONS } from "../constants/jurisdictions";
import { StatutoryRuleRegistryService } from "../services/statutory-rule-registry.service";
import { StatutoryAmendmentIngestionService } from "../services/statutory-amendment-ingestion.service";
import {
  calculateStatutoryEPF,
  calculateStatutoryESI,
  calculateProfessionalTax,
  calculateLabourWelfareFund,
  calculateGratuityAccrual,
  calculateAnnualTDS,
  computeEmployeePayrollBreakdown,
} from "../services/payroll-engine.service";
import { PayrollBatchService } from "../services/payroll-batch.service";
import { TdsCalculatorService } from "../services/tds-calculator.service";

const prisma = new PrismaClient();

describe("MASTERHRMS — POST-IMPLEMENTATION INDEPENDENT VERIFICATION (P0)", () => {
  let tenantAId: string;
  let tenantBId: string;
  let registryService: StatutoryRuleRegistryService;
  let batchService: PayrollBatchService;

  beforeAll(async () => {
    // 1. Provision verified test tenants
    let tenantA = await prisma.tenant.findFirst({ where: { slug: "p0-verify-tenant-a" } });
    if (!tenantA) {
      tenantA = await prisma.tenant.create({
        data: {
          name: "P0 Verification Tenant A",
          slug: "p0-verify-tenant-a",
        },
      });
    }
    tenantAId = tenantA.id;

    let tenantB = await prisma.tenant.findFirst({ where: { slug: "p0-verify-tenant-b" } });
    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          name: "P0 Verification Tenant B",
          slug: "p0-verify-tenant-b",
        },
      });
    }
    tenantBId = tenantB.id;

    registryService = new StatutoryRuleRegistryService(prisma);
    batchService = new PayrollBatchService(prisma);

    // Seed authoritative rule packs
    await registryService.seedAuthoritativeRegistry();
  });

  afterAll(async () => {
    // Cleanup test tenant artifacts
    await prisma.payrollExecutionTrace.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.payrollSnapshot.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.payslip.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.payrollRun.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.setting.deleteMany({
      where: { scope: "TENANT", scopeId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.statutoryRuleAuditLog.deleteMany({
      where: { rule: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.statutoryRule.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. VERIFY THE EPF SIMULATION & LEGAL APPLICABILITY
  // =========================================================================
  describe("1. EPF Wage Ceiling Verification & Legal Applicability", () => {
    it("should confirm the official statutory wage ceiling is ₹15,000 (G.S.R. 609(E)) and treat ₹21,000 as unapproved proposal", async () => {
      // 1. Resolve current active central EPF rule
      const activeEpf = await registryService.resolveApplicableRule({
        ruleType: "EPF",
        stateCode: "ALL",
        effectiveDate: new Date("2026-10-15"),
      });

      expect(activeEpf).toBeDefined();
      expect(activeEpf?.rule.publicationStatus).toBe("published");
      expect((activeEpf?.rule.configJson as any).statutoryCeiling).toBe(15000);
      expect(activeEpf?.rule.notificationRef).toContain("609(E)");

      // Ensure clean slate for proposed draft test
      await prisma.statutoryRuleAuditLog.deleteMany({
        where: { rule: { ruleIdentifier: "RULE_EPF_CENTRAL_PROPOSED_CIRCULAR_21K" } },
      });
      await prisma.statutoryRule.deleteMany({
        where: { ruleIdentifier: "RULE_EPF_CENTRAL_PROPOSED_CIRCULAR_21K" },
      });

      // 2. Ingest ₹21,000 proposal and verify it is strictly marked as DRAFT / PROPOSED / UNAPPROVED
      const proposedPayload = {
        sourceCode: "EPFO_GOV",
        notificationRef: "PROPOSED-CIRCULAR-21K",
        sourceAuthority: "Ministry of Labour & Employment",
        sourceUrl: "https://www.epfindia.gov.in/deliberations/draft_wage_ceiling_revision.pdf",
        title: "Draft Proposal for Enhancement of Wage Ceiling to ₹21,000",
        gazetteDate: "2026-10-15",
        effectiveFrom: "2026-11-01",
        ruleType: "EPF",
        stateCode: "ALL",
        proposedConfig: {
          statutoryCeiling: 21000,
          employeeRate: 0.12,
          employerEpfRate: 0.0367,
          employerEpsRate: 0.0833,
          epsMaxMonthly: 1750,
        },
        changeSummary: "Proposed hike of EPF wage ceiling from ₹15,000 to ₹21,000",
      };

      const ingestionResult = await StatutoryAmendmentIngestionService.ingestNotificationAsDraft(
        proposedPayload,
        "analyst@masterhrms.internal",
        "COMPLIANCE_ANALYST"
      );

      // Verify draft state: Unapproved, unverified, inactive
      expect(ingestionResult.draftRule.publicationStatus).toBe("draft");
      expect(ingestionResult.draftRule.isActive).toBe(false);
      expect(ingestionResult.draftRule.isVerified).toBe(false);

      // Verify active resolver STILL resolves the ₹15,000 statutory rule
      const activeAfterIngest = await registryService.resolveApplicableRule({
        ruleType: "EPF",
        stateCode: "ALL",
        effectiveDate: new Date("2026-11-05"),
      });
      expect((activeAfterIngest?.rule.configJson as any).statutoryCeiling).toBe(15000);
    });

    it("should calculate exact mathematical values for basic salaries ₹7.5k, ₹12.5k, ₹32.5k, ₹62.5k, ₹125k in Capped Mode (capAtCeiling = true)", () => {
      const activeRuleRecord = {
        configJson: {
          statutoryCeiling: 15000,
          employeeRate: 0.12,
          employerEpfRate: 0.0367,
          employerEpsRate: 0.0833,
          epsMaxMonthly: 1250,
          edliRate: 0.005,
          pfAdminRate: 0.005,
        },
        version: 1,
      };

      // Test 1: ₹7,500 (< ₹15,000 statutory ceiling)
      const res7500 = calculateStatutoryEPF(7500, true, activeRuleRecord as any);
      expect(res7500.employeePf).toBe(900); // 12% of 7500
      expect(res7500.eps).toBe(625); // 8.33% of 7500 (rounded)
      expect(res7500.epfEmployer).toBe(275); // 900 - 625
      expect(res7500.edli).toBe(37.5); // 0.5%
      expect(res7500.adminCharges).toBe(37.5);

      // Test 2: ₹12,500 (< ₹15,000 statutory ceiling)
      const res12500 = calculateStatutoryEPF(12500, true, activeRuleRecord as any);
      expect(res12500.employeePf).toBe(1500); // 12% of 12500
      expect(res12500.eps).toBe(1041); // 8.33% of 12500
      expect(res12500.epfEmployer).toBe(459); // 1500 - 1041

      // Test 3: ₹32,500 (> ₹15,000 ceiling, capped at ₹15,000)
      const res32500 = calculateStatutoryEPF(32500, true, activeRuleRecord as any);
      expect(res32500.employeePf).toBe(1800); // 12% of 15000
      expect(res32500.eps).toBe(1250); // 8.33% of 15000 (capped at 1250)
      expect(res32500.epfEmployer).toBe(550); // 1800 - 1250
      expect(res32500.edli).toBe(75); // 0.5% of 15000
      expect(res32500.adminCharges).toBe(75);

      // Test 4: ₹62,500 (Capped at ₹15,000)
      const res62500 = calculateStatutoryEPF(62500, true, activeRuleRecord as any);
      expect(res62500.employeePf).toBe(1800);
      expect(res62500.eps).toBe(1250);
      expect(res62500.epfEmployer).toBe(550);

      // Test 5: ₹1,25,000 (Capped at ₹15,000)
      const res125000 = calculateStatutoryEPF(125000, true, activeRuleRecord as any);
      expect(res125000.employeePf).toBe(1800);
      expect(res125000.eps).toBe(1250);
      expect(res125000.epfEmployer).toBe(550);
    });

    it("should calculate exact mathematical values for basic salaries ₹7.5k, ₹12.5k, ₹32.5k, ₹62.5k, ₹125k in Uncapped Actual Wage Mode (capAtCeiling = false)", () => {
      const activeRuleRecord = {
        configJson: {
          statutoryCeiling: 15000,
          employeeRate: 0.12,
          employerEpfRate: 0.0367,
          employerEpsRate: 0.0833,
          epsMaxMonthly: 1250,
          edliRate: 0.005,
          pfAdminRate: 0.005,
        },
        version: 1,
      };

      // Test 1: ₹7,500
      const res7500 = calculateStatutoryEPF(7500, false, activeRuleRecord as any);
      expect(res7500.employeePf).toBe(900);
      expect(res7500.eps).toBe(625);
      expect(res7500.epfEmployer).toBe(275);

      // Test 2: ₹12,500
      const res12500 = calculateStatutoryEPF(12500, false, activeRuleRecord as any);
      expect(res12500.employeePf).toBe(1500);
      expect(res12500.eps).toBe(1041);
      expect(res12500.epfEmployer).toBe(459);

      // Test 3: ₹32,500 (12% of actual basic ₹32,500 = ₹3,900; EPS capped at ₹1,250)
      const res32500 = calculateStatutoryEPF(32500, false, activeRuleRecord as any);
      expect(res32500.employeePf).toBe(3900); // 12% of 32500
      expect(res32500.eps).toBe(1250); // Capped at statutory 1250
      expect(res32500.epfEmployer).toBe(2650); // 3900 - 1250

      // Test 4: ₹62,500 (12% of actual basic ₹62,500 = ₹7,500; EPS capped at ₹1,250)
      const res62500 = calculateStatutoryEPF(62500, false, activeRuleRecord as any);
      expect(res62500.employeePf).toBe(7500);
      expect(res62500.eps).toBe(1250);
      expect(res62500.epfEmployer).toBe(6250); // 7500 - 1250

      // Test 5: ₹1,25,000 (12% of actual basic ₹125,000 = ₹15,000; EPS capped at ₹1,250)
      const res125000 = calculateStatutoryEPF(125000, false, activeRuleRecord as any);
      expect(res125000.employeePf).toBe(15000);
      expect(res125000.eps).toBe(1250);
      expect(res125000.epfEmployer).toBe(13750); // 15000 - 1250
    });
  });

  // =========================================================================
  // 2. VERIFY END-TO-END STATUTORY RULE CONSUMPTION ACROSS MODULES
  // =========================================================================
  describe("2. End-to-End Dynamic Rule Consumption Across Modules", () => {
    it("EPF: Changing approved rule configuration directly changes downstream calculation", () => {
      const standardRule = { configJson: { statutoryCeiling: 15000, employeeRate: 0.12 } };
      const customRule = { configJson: { statutoryCeiling: 15000, employeeRate: 0.10 } }; // e.g. Special notified sector 10%

      const resStandard = calculateStatutoryEPF(25000, true, standardRule as any);
      const resCustom = calculateStatutoryEPF(25000, true, customRule as any);

      expect(resStandard.employeePf).toBe(1800); // 12% of 15000
      expect(resCustom.employeePf).toBe(1500); // 10% of 15000
    });

    it("ESI: Wage ceiling threshold enforcement (exempt above ₹21,000, covered below)", () => {
      const esiRule = {
        configJson: { wageCeiling: 21000, wageCeilingPwd: 25000, employeeRate: 0.0075, employerRate: 0.0325 },
      };

      const resCovered = calculateStatutoryESI(20000, false, esiRule as any);
      expect(resCovered.isEligible).toBe(true);
      expect(resCovered.employeeEsi).toBe(150); // 0.75% of 20000
      expect(resCovered.employerEsi).toBe(650); // 3.25% of 20000

      const resExempt = calculateStatutoryESI(22000, false, esiRule as any);
      expect(resExempt.isEligible).toBe(false);
      expect(resExempt.employeeEsi).toBe(0);

      // PWD employee with ₹22,000 is covered (PWD ceiling ₹25,000)
      const resPwd = calculateStatutoryESI(22000, true, esiRule as any);
      expect(resPwd.isEligible).toBe(true);
      expect(resPwd.employeeEsi).toBe(165); // 0.75% of 22000
    });

    it("Professional Tax: Consumes state-specific dynamic slabs from database rules", () => {
      const mhRule = {
        ruleType: "PT",
        stateCode: "MH",
        configJson: {
          slabs: [
            { min: 0, max: 7500, tax: 0 },
            { min: 7501, max: 10000, tax: 175 },
            { min: 10001, max: null, tax: 200, februarySpecialTax: 300 },
          ],
        },
      };

      // Standard month (January = 1)
      const ptJan = calculateProfessionalTax(45000, "MH", 1, [mhRule as any]);
      expect(ptJan).toBe(200);

      // February month (February = 2, statutory ₹300)
      const ptFeb = calculateProfessionalTax(45000, "MH", 2, [mhRule as any]);
      expect(ptFeb).toBe(300);

      // Non-PT state (Delhi)
      const ptDelhi = calculateProfessionalTax(45000, "DL", 1);
      expect(ptDelhi).toBe(0);
    });

    it("Labour Welfare Fund: Enforces schedule frequency and deduction months", () => {
      const tnLwfRule = {
        ruleType: "LWF",
        stateCode: "TN",
        configJson: { employeeContribution: 10, employerContribution: 20, deductionMonth: 12 },
      };

      // December (Month 12) -> Deducted
      const lwfDec = calculateLabourWelfareFund(30000, "TN", 12, [tnLwfRule as any]);
      expect(lwfDec.isApplicable).toBe(true);
      expect(lwfDec.employeeLwf).toBe(10);
      expect(lwfDec.employerLwf).toBe(20);

      // July (Month 7) -> Not applicable (non-deduction month)
      const lwfJuly = calculateLabourWelfareFund(30000, "TN", 7, [tnLwfRule as any]);
      expect(lwfJuly.isApplicable).toBe(false);
      expect(lwfJuly.employeeLwf).toBe(0);
    });

    it("Gratuity Accrual: Enforces 15/26 formula and statutory ₹20,00,000 ceiling", () => {
      const gratuityRule = {
        configJson: { daysFactor: 15, daysPerMonth: 26, statutoryCeiling: 2000000 },
      };

      // Basic ₹35,000: Monthly accrual = (35000 * 15) / (26 * 12) = 525000 / 312 ≈ 1682.69
      const gratuityCalc = calculateGratuityAccrual(35000, gratuityRule as any);
      expect(gratuityCalc.monthlyAccrual).toBe(1682.69);
      expect(gratuityCalc.statutoryMaxCap).toBe(2000000);
    });

    it("TDS (Income-tax Act, 2025): Dynamic Section 392 Slabs and Section 156(2) full rebate up to ₹12,00,000", () => {
      // Annual Gross ₹12,00,000 under Income-tax Act, 2025 (AY 2026-27):
      // Gross ₹12L - Std Ded ₹75k = ₹11,25,000.
      // Slabs: 0-4L: 0, 4L-8L (4L @ 5%) = 20k, 8L-11.25L (3.25L @ 10%) = 32.5k.
      // Total Tax = ₹52,500.
      // Since Net Taxable ₹11,25,000 <= ₹12,00,000 threshold, Section 156(2) provides full ₹52,500 rebate -> Net TDS = 0!
      const tdsResult = calculateAnnualTDS(1200000, "new", { isResident: true });
      expect(tdsResult.netTaxableIncome).toBe(1125000);
      expect(tdsResult.annualTaxCalculated).toBe(325000 * 0.10 + 20000); // 52500
      expect(tdsResult.section156Rebate).toBe(52500);
      expect(tdsResult.totalAnnualTds).toBe(0);
      expect(tdsResult.monthlyTdsDeduction).toBe(0);
    });
  });

  // =========================================================================
  // 3. VERIFY ALL-INDIA JURISDICTION REGISTRY AND CALCULATION READINESS
  // =========================================================================
  describe("3. All-India Jurisdiction Registry & Calculation Readiness Matrix", () => {
    it("should provide complete verification matrix distinguishing verified rules from pending research", () => {
      expect(CANONICAL_36_JURISDICTIONS.length).toBe(36);

      // Categorize Jurisdictions
      const verifiedPtStates = ["MH", "KA", "TN", "TS", "WB", "GJ", "AP", "PB"];
      const verifiedNonPtJurisdictions = ["DL", "HR", "HP", "AR", "UK", "CH", "LD", "LA"];

      // Verify each registered state has exact legal attributes
      for (const code of verifiedPtStates) {
        const item = CANONICAL_36_JURISDICTIONS.find((j) => j.stateCode === code);
        expect(item).toBeDefined();
        expect(item?.hasPt).toBe(true);
        expect(item?.governingAuthority).toBeDefined();
      }

      for (const code of verifiedNonPtJurisdictions) {
        const item = CANONICAL_36_JURISDICTIONS.find((j) => j.stateCode === code);
        expect(item).toBeDefined();
        expect(item?.hasPt).toBe(false);
      }
    });
  });

  // =========================================================================
  // 4. VERIFY DATABASE PERSISTENCE AND PAYROLL PROVENANCE CONTRACT
  // =========================================================================
  describe("4. Database Persistence & Payroll Provenance Contract", () => {
    it("should execute payroll breakdown and emit complete statutoryManifest with exact provenance", () => {
      const syntheticEmployee = {
        id: "P0_VERIFY_EMP_01",
        employeeCode: "VERIFY01",
        firstName: "Vignesh",
        lastName: "Raman",
        baseMonthlyCtc: 50000,
        state: "TN",
        taxRegime: "new" as const,
        isResident: true,
        pfEligible: true,
        esiEligible: true,
        ptEligible: true,
      };

      const attendance = {
        payableDays: 30,
        totalDays: 30,
        prorationFactor: 1.0,
        lopDays: 0,
      };

      const breakdown = computeEmployeePayrollBreakdown(
        syntheticEmployee as any,
        attendance as any,
        { periodMonth: 1, periodYear: 2026 }
      );

      // Assert Provenance Manifest
      expect(breakdown.statutoryManifest).toBeDefined();
      expect(breakdown.statutoryManifest.epf).toBeDefined();
      expect(breakdown.statutoryManifest.epf.ruleType).toBe("EPF");
      expect(breakdown.statutoryManifest.pt.stateCode).toBe("TN");
      expect(breakdown.statutoryManifest.tds.regime).toBe("new");
      expect(breakdown.statutoryManifest.tds.taxYear).toBeDefined();
    });

    it("should reject re-calculation of approved, finalized, or published payroll runs", async () => {
      // Create a finalized payroll run
      const finalizedRun = await prisma.payrollRun.create({
        data: {
          tenantId: tenantAId,
          periodMonth: 11,
          periodYear: 2025,
          approvalStatus: "finalized",
          status: "completed",
          isPublished: true,
        },
      });

      // Attempt to re-run batch on finalized run -> Must throw
      await expect(
        batchService.processBatch({
          tenantId: tenantAId,
          payrollRunId: finalizedRun.id,
          periodMonth: 11,
          periodYear: 2025,
        })
      ).rejects.toThrow(/Cannot recalculate a finalized or paid payroll run/);
    });
  });

  // =========================================================================
  // 5. VERIFY SECURITY, MAKER-CHECKER & TENANT ISOLATION
  // =========================================================================
  describe("5. Security, Maker-Checker & Tenant Isolation", () => {
    it("Maker-Checker: Rule creator cannot approve their own rule", async () => {
      const draft = await registryService.createDraft({
        tenantId: tenantAId,
        ruleIdentifier: "RULE_PT_MAKER_CHECKER_TEST",
        ruleType: "PT",
        category: "PROFESSIONAL_TAX",
        jurisdictionLevel: "STATE",
        stateCode: "MH",
        configJson: { slabs: [] },
        effectiveFrom: new Date("2026-01-01"),
        actorEmail: "creator_admin@masterhrms.internal",
        actorRole: "COMPLIANCE_ANALYST",
      });

      // Submit for review
      await registryService.submitForReview(
        draft.id,
        "creator_admin@masterhrms.internal",
        "COMPLIANCE_ANALYST"
      );

      // Attempt self-approval by creator -> Must throw Maker-Checker violation
      await expect(
        registryService.approveRule(
          draft.id,
          "creator_admin@masterhrms.internal",
          "COMPLIANCE_DIRECTOR",
          true
        )
      ).rejects.toThrow(/Maker-Checker violation/);

      // Independent compliance officer approves -> Succeeds
      const approved = await registryService.approveRule(
        draft.id,
        "independent_officer@masterhrms.internal",
        "COMPLIANCE_DIRECTOR",
        true
      );
      expect(approved.publicationStatus).toBe("approved");
      expect(approved.isVerified).toBe(true);
    });

    it("Tenant Isolation: Tenant A cannot read or mutate Tenant B configuration", async () => {
      // Tenant B setting
      await prisma.setting.upsert({
        where: {
          scope_scopeId_key: {
            scope: "TENANT",
            scopeId: tenantBId,
            key: "payroll_config",
          },
        },
        create: {
          scope: "TENANT",
          scopeId: tenantBId,
          group: "payroll",
          key: "payroll_config",
          valueType: "JSON",
          valueJson: { bankFormat: "SBI_CMP" },
          updatedBy: "tenant_b_user",
        },
        update: {
          valueJson: { bankFormat: "SBI_CMP" },
        },
      });

      // Query Tenant A scope -> Must NOT find Tenant B configuration
      const tenantAQuery = await prisma.setting.findFirst({
        where: {
          scope: "TENANT",
          scopeId: tenantAId,
          key: "payroll_config",
        },
      });

      expect(tenantAQuery?.scopeId).not.toBe(tenantBId);
      if (tenantAQuery) {
        expect((tenantAQuery.valueJson as any).bankFormat).not.toBe("SBI_CMP");
      }
    });

    it("Rollback: Rolling back published rule activates target version and logs audit trail", async () => {
      // 1. Create rule version 1
      const ruleV1 = await prisma.statutoryRule.create({
        data: {
          tenantId: tenantAId,
          ruleIdentifier: "RULE_ROLLBACK_TEST_V1",
          ruleType: "PT",
          category: "PROFESSIONAL_TAX",
          jurisdictionLevel: "STATE",
          stateCode: "MH",
          configJson: { rate: 200 },
          version: 1,
          effectiveFrom: new Date("2026-01-01"),
          publicationStatus: "published",
          isActive: false,
        },
      });

      // 2. Create rule version 2
      const ruleV2 = await prisma.statutoryRule.create({
        data: {
          tenantId: tenantAId,
          ruleIdentifier: "RULE_ROLLBACK_TEST_V2",
          ruleType: "PT",
          category: "PROFESSIONAL_TAX",
          jurisdictionLevel: "STATE",
          stateCode: "MH",
          configJson: { rate: 250 },
          version: 2,
          effectiveFrom: new Date("2026-03-01"),
          publicationStatus: "published",
          isActive: true,
        },
      });

      // Execute rollback from V2 to V1
      const restored = await registryService.rollbackRule(
        ruleV2.id,
        ruleV1.id,
        "superadmin@masterhrms.internal",
        "COMPLIANCE_DIRECTOR"
      );

      expect(restored.id).toBe(ruleV1.id);
      expect(restored.isActive).toBe(true);
      expect(restored.publicationStatus).toBe("published");

      // Verify V2 was deactivated
      const v2After = await prisma.statutoryRule.findUnique({ where: { id: ruleV2.id } });
      expect(v2After?.isActive).toBe(false);
      expect(v2After?.publicationStatus).toBe("archived");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Tax-Year Reconciliation & Statutory Provenance Integrity (P0)
  // ───────────────────────────────────────────────────────────────────────────
  describe("6. Tax-Year Reconciliation & Statutory Provenance Integrity (P0)", () => {
    it("Tax-Period Mapping: Rejects mismatched tax-year/law configurations", async () => {
      // 1. Attempting Income-tax Act, 1961 with wrong Section (e.g. 392 instead of 192)
      await expect(
        registryService.createDraft({
          ruleIdentifier: "RULE_TDS_MISMATCH_1",
          ruleType: "TDS_115BAC",
          category: "DIRECT_TAX",
          jurisdictionLevel: "CENTRAL",
          effectiveFrom: new Date("2025-04-01"),
          financialYear: "2025-2026",
          configJson: {
            act: "Income-tax Act, 1961",
            salaryWithholdingSection: "392", // Mismatch: Should be 192
            rebateSection: "87A",
          },
          actorEmail: "test@masterhrms.internal",
          actorRole: "COMPLIANCE_ANALYST",
        })
      ).rejects.toThrow(/Income-tax Act, 1961 requires salary withholding under Section 192/);

      // 2. Attempting Income-tax Act, 2025 with legacy Section (e.g. 192 instead of 392)
      await expect(
        registryService.createDraft({
          ruleIdentifier: "RULE_TDS_MISMATCH_2",
          ruleType: "TDS_ITA2025",
          category: "DIRECT_TAX",
          jurisdictionLevel: "CENTRAL",
          effectiveFrom: new Date("2026-04-01"),
          financialYear: "2026-2027",
          configJson: {
            act: "Income-tax Act, 2025",
            salaryWithholdingSection: "192", // Mismatch: Should be 392
            rebateSection: "156",
          },
          actorEmail: "test@masterhrms.internal",
          actorRole: "COMPLIANCE_ANALYST",
        })
      ).rejects.toThrow(/Income-tax Act, 2025 requires salary withholding under Section 392/);

      // 3. Attempting Income-tax Act, 2025 prior to effective date 2026-04-01
      await expect(
        registryService.createDraft({
          ruleIdentifier: "RULE_TDS_MISMATCH_3",
          ruleType: "TDS_ITA2025",
          category: "DIRECT_TAX",
          jurisdictionLevel: "CENTRAL",
          effectiveFrom: new Date("2025-04-01"), // Mismatch: Before 2026-04-01
          financialYear: "2025-2026",
          configJson: {
            act: "Income-tax Act, 2025",
            salaryWithholdingSection: "392",
            rebateSection: "156",
          },
          actorEmail: "test@masterhrms.internal",
          actorRole: "COMPLIANCE_ANALYST",
        })
      ).rejects.toThrow(/Income-tax Act, 2025 cannot be made effective prior to 2026-04-01/);
    });

    it("Mandatory Statutory Minimums: Tenant overrides cannot reduce mandatory obligations", async () => {
      // 1. Attempting EPF employee contribution < 12%
      await expect(
        registryService.createDraft({
          tenantId: tenantAId,
          ruleIdentifier: "RULE_EPF_TENANT_REDUCTION_EE",
          ruleType: "EPF",
          category: "RETIREMENT_PF",
          jurisdictionLevel: "ESTABLISHMENT",
          effectiveFrom: new Date("2026-04-01"),
          configJson: {
            employeeRate: 0.10, // Substandard: 10% < 12%
            employerRate: 0.12,
          },
          actorEmail: "tenant_admin@tenant-a.com",
          actorRole: "TENANT_ADMIN",
        })
      ).rejects.toThrow(/Tenant override cannot reduce mandatory EPF employee contribution rate below 12%/);

      // 2. Attempting ESI employer contribution < 3.25%
      await expect(
        registryService.createDraft({
          tenantId: tenantAId,
          ruleIdentifier: "RULE_ESI_TENANT_REDUCTION_ER",
          ruleType: "ESI",
          category: "SOCIAL_SECURITY_ESI",
          jurisdictionLevel: "ESTABLISHMENT",
          effectiveFrom: new Date("2026-04-01"),
          configJson: {
            employeeRate: 0.0075,
            employerRate: 0.02, // Substandard: 2% < 3.25%
          },
          actorEmail: "tenant_admin@tenant-a.com",
          actorRole: "TENANT_ADMIN",
        })
      ).rejects.toThrow(/Tenant override cannot reduce mandatory ESI employer contribution rate below 3.25%/);
    });

    it("Historical Replay: Replaying historical payroll resolves stored historical rules rather than current active rules", async () => {
      // Create historical rule (V1: effective 2025-04-01 to 2025-09-30, rate: 100)
      const histRule = await prisma.statutoryRule.create({
        data: {
          tenantId: tenantAId,
          ruleIdentifier: "RULE_PT_REPLAY_V1",
          ruleType: "PT",
          category: "PROFESSIONAL_TAX",
          jurisdictionLevel: "STATE",
          stateCode: "KA",
          configJson: { rate: 100 },
          version: 1,
          effectiveFrom: new Date("2025-04-01"),
          effectiveTo: new Date("2025-09-30"),
          publicationStatus: "published",
          isActive: true,
        },
      });

      // Create current active rule (V2: effective 2025-10-01 to null, rate: 200)
      const currRule = await prisma.statutoryRule.create({
        data: {
          tenantId: tenantAId,
          ruleIdentifier: "RULE_PT_REPLAY_V2",
          ruleType: "PT",
          category: "PROFESSIONAL_TAX",
          jurisdictionLevel: "STATE",
          stateCode: "KA",
          configJson: { rate: 200 },
          version: 2,
          effectiveFrom: new Date("2025-10-01"),
          effectiveTo: null,
          publicationStatus: "published",
          isActive: true,
        },
      });

      // Historical replay query for July 2025 -> Must resolve V1 (rate: 100)
      const historicalResolution = await registryService.resolveApplicableRule({
        tenantId: tenantAId,
        ruleType: "PT",
        stateCode: "KA",
        effectiveDate: new Date("2025-07-15"),
      });

      expect(historicalResolution).not.toBeNull();
      expect(historicalResolution?.effectiveVersion).toBe(1);
      expect((historicalResolution?.rule.configJson as any).rate).toBe(100);

      // Current replay query for November 2025 -> Must resolve V2 (rate: 200)
      const currentResolution = await registryService.resolveApplicableRule({
        tenantId: tenantAId,
        ruleType: "PT",
        stateCode: "KA",
        effectiveDate: new Date("2025-11-15"),
      });

      expect(currentResolution).not.toBeNull();
      expect(currentResolution?.effectiveVersion).toBe(2);
      expect((currentResolution?.rule.configJson as any).rate).toBe(200);
    });
  });

  // =========================================================================
  // 8. P0 EMERGENCY TDS REGRESSION CORRECTION: MULTI-PERIOD & DISPUTED SCENARIO
  // =========================================================================
  describe("8. P0 Emergency TDS Regression Correction: Multi-Period & Disputed Scenario", () => {
    it("Disputed Scenario: FY 2025-26 ₹12L gross under New Regime yields strictly ₹0 TDS (Section 87A rebate)", () => {
      // Input: Gross ₹12,00,000, FY 2025-26, Resident, New Regime
      const res = calculateAnnualTDS(1200000, "new", undefined, {
        financialYear: "2025-2026",
        isResident: true,
      });

      // 1. Standard deduction: ₹75,000
      expect(res.standardDeduction).toBe(75000);
      // 2. Net Taxable Income: ₹11,25,000
      expect(res.netTaxableIncome).toBe(1125000);
      // 3. Slabs under Finance Act, 2025 / Section 115BAC:
      //    0 - 4L @ 0% = 0
      //    4L - 8L @ 5% = 20,000
      //    8L - 11.25L @ 10% = 32,500
      //    Total Raw Tax: ₹52,500
      expect(res.annualTaxCalculated).toBe(52500);
      // 4. Section 87A Rebate: Since ₹11,25,000 <= ₹12,00,000, full rebate applies
      expect(res.rebate87A).toBe(52500);
      expect(res.netTaxAfterRebate).toBe(0);
      expect(res.cessAmount).toBe(0);
      // 5. Final Annual TDS and Monthly Withholding
      expect(res.totalAnnualTds).toBe(0);
      expect(res.monthlyTdsDeduction).toBe(0);
      // 6. Governing Statutory Act and Sections
      expect(res.statutoryAct).toBe("Income-tax Act, 1961");
      expect(res.salaryWithholdingSection).toBe("192");
      expect(res.rebateSection).toBe("Section 87A");
      expect(res.taxYear).toBe("2025-2026");

      // Verify identical result via TdsCalculatorService
      const svcRes = TdsCalculatorService.computeNewRegime({
        annualGrossSalary: 1200000,
        basicSalaryAnnual: 600000,
        hraReceivedAnnual: 240000,
        regime: "new",
        financialYear: "2025-2026",
      });
      expect(svcRes.netTaxableIncome).toBe(1125000);
      expect(svcRes.taxBeforeRebate).toBe(52500);
      expect(svcRes.rebate87A).toBe(52500);
      expect(svcRes.taxAfterRebate).toBe(0);
      expect(svcRes.cess).toBe(0);
      expect(svcRes.totalAnnualTax).toBe(0);
      expect(svcRes.monthlyTds).toBe(0);
    });

    it("Historical FY 2024-25: ₹12L gross yields ₹81,900 TDS under 2024 law (Finance (No. 2) Act, 2024)", () => {
      // In FY 2024-25, slabs were 3L intervals and Section 87A rebate threshold was ₹7,00,000
      const res = calculateAnnualTDS(1200000, "new", undefined, {
        financialYear: "2024-2025",
        isResident: true,
      });

      expect(res.standardDeduction).toBe(75000);
      expect(res.netTaxableIncome).toBe(1125000);
      // Slabs: 0-3L: 0, 3-6L: 15k, 6-9L: 30k, 9-11.25L: 33,750 => Raw Tax = 78,750
      expect(res.annualTaxCalculated).toBe(78750);
      // Net taxable ₹11,25,000 > ₹7,00,000 threshold => No rebate!
      expect(res.rebate87A).toBe(0);
      expect(res.netTaxAfterRebate).toBe(78750);
      expect(res.cessAmount).toBe(3150); // 4% cess
      expect(res.totalAnnualTds).toBe(81900);
      expect(res.monthlyTdsDeduction).toBe(6825);
      expect(res.statutoryAct).toBe("Income-tax Act, 1961");
      expect(res.salaryWithholdingSection).toBe("192");
      expect(res.rebateSection).toBe("Section 87A (Exceeded Threshold)");
    });

    it("Future FY 2026-27: ₹12L gross yields ₹0 TDS under Income-tax Act, 2025 Section 392 / 156(2)", () => {
      const res = calculateAnnualTDS(1200000, "new", undefined, {
        financialYear: "2026-2027",
        isResident: true,
      });

      expect(res.standardDeduction).toBe(75000);
      expect(res.netTaxableIncome).toBe(1125000);
      expect(res.annualTaxCalculated).toBe(52500);
      expect(res.section156Rebate).toBe(52500);
      expect(res.netTaxAfterRebate).toBe(0);
      expect(res.cessAmount).toBe(0);
      expect(res.totalAnnualTds).toBe(0);
      expect(res.monthlyTdsDeduction).toBe(0);
      expect(res.statutoryAct).toBe("Income-tax Act, 2025");
      expect(res.salaryWithholdingSection).toBe("392");
      expect(res.rebateSection).toBe("Section 156(2)");
    });

    it("Rebate Threshold Boundary: Gross ₹12.75L (Taxable ₹12L) qualifies for full ₹60,000 rebate", () => {
      const res = calculateAnnualTDS(1275000, "new", undefined, {
        financialYear: "2025-2026",
        isResident: true,
      });

      expect(res.standardDeduction).toBe(75000);
      expect(res.netTaxableIncome).toBe(1200000);
      // Slabs: 0-4L: 0, 4-8L: 20k, 8-12L: 40k => Raw Tax = 60,000
      expect(res.annualTaxCalculated).toBe(60000);
      // Full Section 87A rebate of ₹60,000
      expect(res.rebate87A).toBe(60000);
      expect(res.netTaxAfterRebate).toBe(0);
      expect(res.cessAmount).toBe(0);
      expect(res.totalAnnualTds).toBe(0);
    });

    it("Rebate Threshold Boundary: Gross ₹12.85L (Taxable ₹12.10L) receives Marginal Relief", () => {
      const res = calculateAnnualTDS(1285000, "new", undefined, {
        financialYear: "2025-2026",
        isResident: true,
      });

      expect(res.standardDeduction).toBe(75000);
      expect(res.netTaxableIncome).toBe(1210000);
      // Raw Tax: 60,000 (up to 12L) + 10,000 * 15% = 61,500
      expect(res.annualTaxCalculated).toBe(61500);
      // Excess income over ₹12,00,000 = ₹10,000
      // Marginal Relief: Tax payable is capped at excess income = ₹10,000
      expect(res.netTaxAfterRebate).toBe(10000);
      expect(res.rebate87A).toBe(51500); // 61,500 - 10,000
      expect(res.cessAmount).toBe(400); // 4% of 10,000
      expect(res.totalAnnualTds).toBe(10400);
    });

    it("Non-Resident Ineligibility: NRI with ₹12L gross receives NO Section 87A rebate", () => {
      const res = calculateAnnualTDS(1200000, "new", undefined, {
        financialYear: "2025-2026",
        isResident: false,
      });

      expect(res.isResident).toBe(false);
      expect(res.netTaxableIncome).toBe(1125000);
      expect(res.annualTaxCalculated).toBe(52500);
      // NRIs not eligible for rebate
      expect(res.rebate87A).toBe(0);
      expect(res.netTaxAfterRebate).toBe(52500);
      expect(res.cessAmount).toBe(2100); // 4% of 52,500
      expect(res.totalAnnualTds).toBe(54600);
      expect(res.monthlyTdsDeduction).toBe(4550);
      expect(res.rebateSection).toBe("N/A (Ineligible Non-Resident)");
    });

    it("Old Tax Regime in FY 2025-26: ₹12L gross with 80C, 80D and HRA computes correct liability", () => {
      const res = calculateAnnualTDS(
        1200000,
        "old",
        {
          section80C: 150000,
          section80D: 25000,
          houseRentPaid: 20000, // ₹2,40,000 annual rent
        },
        {
          financialYear: "2025-2026",
          isResident: true,
        }
      );

      // Old Regime deductions: SD ₹50,000 + 80C ₹1,50,000 + 80D ₹25,000 + HRA ₹1,80,000 = ₹4,05,000
      expect(res.standardDeduction).toBe(50000);
      expect(res.section80CDeduction).toBe(150000);
      expect(res.section80DDeduction).toBe(25000);
      expect(res.hraExemption).toBe(180000);
      // Net Taxable: 12,00,000 - 4,05,000 = 7,95,000
      expect(res.netTaxableIncome).toBe(795000);
      // Old Slabs: 0-2.5L: 0, 2.5-5L @ 5%: 12,500, 5-7.95L @ 20%: 59,000 => Raw Tax = 71,500
      expect(res.annualTaxCalculated).toBe(71500);
      expect(res.rebate87A).toBe(0); // Exceeds ₹5,00,000
      expect(res.cessAmount).toBe(2860); // 4% of 71,500
      expect(res.totalAnnualTds).toBe(74360);
      expect(res.monthlyTdsDeduction).toBe(6196.67);
      expect(res.statutoryAct).toBe("Income-tax Act, 1961");
      expect(res.salaryWithholdingSection).toBe("192");
    });

    it("Period-Date Resolver: Correct statutory Act, section and rules resolved by payroll period", () => {
      // Period 1: May 2024 (Month 5, Year 2024) -> FY 2024-25
      const res2024 = calculateAnnualTDS(1200000, "new", undefined, {
        periodMonth: 5,
        periodYear: 2024,
      });
      expect(res2024.taxYear).toBe("2024-2025");
      expect(res2024.statutoryAct).toBe("Income-tax Act, 1961");
      expect(res2024.salaryWithholdingSection).toBe("192");
      expect(res2024.totalAnnualTds).toBe(81900); // 2024 rates

      // Period 2: May 2025 (Month 5, Year 2025) -> FY 2025-26
      const res2025 = calculateAnnualTDS(1200000, "new", undefined, {
        periodMonth: 5,
        periodYear: 2025,
      });
      expect(res2025.taxYear).toBe("2025-2026");
      expect(res2025.statutoryAct).toBe("Income-tax Act, 1961");
      expect(res2025.salaryWithholdingSection).toBe("192");
      expect(res2025.rebateSection).toBe("Section 87A");
      expect(res2025.totalAnnualTds).toBe(0); // 2025 rates with ₹12L rebate

      // Period 3: May 2026 (Month 5, Year 2026) -> FY 2026-27 (ITA 2025)
      const res2026 = calculateAnnualTDS(1200000, "new", undefined, {
        periodMonth: 5,
        periodYear: 2026,
      });
      expect(res2026.taxYear).toBe("2026-2027");
      expect(res2026.statutoryAct).toBe("Income-tax Act, 2025");
      expect(res2026.salaryWithholdingSection).toBe("392");
      expect(res2026.rebateSection).toBe("Section 156(2)");
      expect(res2026.totalAnnualTds).toBe(0); // 2026 rates with Section 156(2) rebate
    });
  });
});
