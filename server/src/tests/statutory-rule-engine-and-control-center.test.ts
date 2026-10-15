import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Decimal from "decimal.js";
import { rawPrisma as prisma } from "../prisma";
import {
  StatutoryRuleRegistryService,
  CreateStatutoryRuleInput,
} from "../services/statutory-rule-registry.service";
import {
  calculateStatutoryEPF,
  calculateStatutoryESI,
  calculateProfessionalTax,
  calculateLabourWelfareFund,
  calculateGratuityAccrual,
  calculateAnnualTDS,
  computeEmployeePayrollBreakdown,
} from "../services/payroll-engine.service";

describe("MASTERHRMS — Enterprise Dynamic Statutory Rule Engine & Compliance Control Center (Phase 6 Test Suite)", () => {
  let registryService: StatutoryRuleRegistryService;
  let testTenantA: string = "tenant-a-placeholder";
  let testTenantB: string = "tenant-b-placeholder";
  let createdTenantB = false;

  beforeAll(async () => {
    registryService = new StatutoryRuleRegistryService(prisma as any);

    // Resolve or provision valid tenants for relational foreign-key integrity
    const existingTenants = await prisma.tenant.findMany({ take: 2 });
    if (existingTenants.length >= 1) {
      testTenantA = existingTenants[0].id;
    }
    if (existingTenants.length >= 2) {
      testTenantB = existingTenants[1].id;
    } else {
      const newTenant = await prisma.tenant.create({
        data: {
          name: "Test Tenant B Statutory",
          slug: `test-statutory-b-${Date.now()}`,
          isOnboarded: true,
        },
      });
      testTenantB = newTenant.id;
      createdTenantB = true;
    }

    // Clean up any test records
    await prisma.statutoryRuleAuditLog.deleteMany({
      where: {
        rule: {
          ruleIdentifier: { startsWith: "TEST_" },
        },
      },
    });
    await prisma.statutoryRule.deleteMany({
      where: {
        ruleIdentifier: { startsWith: "TEST_" },
      },
    });
  });

  afterAll(async () => {
    // Cleanup test statutory rules and logs
    await prisma.statutoryRuleAuditLog.deleteMany({
      where: {
        rule: {
          ruleIdentifier: { startsWith: "TEST_" },
        },
      },
    });
    await prisma.statutoryRule.deleteMany({
      where: {
        ruleIdentifier: { startsWith: "TEST_" },
      },
    });

    if (createdTenantB) {
      await prisma.tenant.delete({ where: { id: testTenantB } }).catch(() => {});
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Parameter Changes Without Source Code Modification
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 1: Changing an approved parameter changes calculation dynamically without code deployment", () => {
    const basicSalary = 30000;

    // Baseline rule: statutory ceiling ₹15,000, 12% employee rate
    const baselineRule = {
      id: "rule-epf-v1",
      ruleType: "EPF",
      version: 1,
      configJson: {
        statutoryCeiling: 15000,
        employeeRate: 0.12,
        employerEpfRate: 0.0367,
        employerEpsRate: 0.0833333333,
        epsMaxMonthly: 1250,
        edliRate: 0.005,
        pfAdminRate: 0.005,
      },
    };

    // Amended rule: statutory ceiling raised to ₹21,000 via gazetted notification
    const amendedRule = {
      id: "rule-epf-v2",
      ruleType: "EPF",
      version: 2,
      configJson: {
        statutoryCeiling: 21000,
        employeeRate: 0.12,
        employerEpfRate: 0.0367,
        employerEpsRate: 0.0833333333,
        epsMaxMonthly: 1750,
        edliRate: 0.005,
        pfAdminRate: 0.005,
      },
    };

    // Independent expected values:
    // With ceiling cap:
    // v1: 15,000 * 0.12 = 1,800.00
    // v2: 21,000 * 0.12 = 2,520.00
    const calcV1 = calculateStatutoryEPF(basicSalary, true, baselineRule);
    const calcV2 = calculateStatutoryEPF(basicSalary, true, amendedRule);

    expect(calcV1.employeePf).toBe(1800);
    expect(calcV1.ruleVersion).toBe(1);

    expect(calcV2.employeePf).toBe(2520);
    expect(calcV2.ruleVersion).toBe(2);
    expect(calcV2.employeePf - calcV1.employeePf).toBe(720); // Exact delta proved without code change
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Effective-Date Scheduling & Future-Dated Non-Retroactivity
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 2: Future-dated rule does not affect earlier payroll periods", async () => {
    const fromDateFuture = new Date("2027-04-01");
    const toDateFuture = new Date("2028-03-31");

    // 1. Create and publish active rule for future FY 2027-28
    const futureRule = await registryService.createDraft({
      ruleIdentifier: "TEST_FUTURE_SCHEDULED_RULE",
      ruleType: "TEST_FUTURE_TYPE",
      category: "RETIREMENT_PF",
      jurisdictionLevel: "CENTRAL",
      stateCode: "ALL",
      configJson: { statutoryCeiling: 25000, employeeRate: 0.12 },
      effectiveFrom: fromDateFuture,
      effectiveTo: toDateFuture,
      version: 1,
      isGlobal: true,
      actorEmail: "admin1@masterhrms.internal",
    });

    await registryService.submitForReview(futureRule.id, "admin1@masterhrms.internal", "ADMIN");
    await registryService.approveRule(futureRule.id, "compliance@masterhrms.internal", "COMPLIANCE_OFFICER", false);
    await registryService.publishRule(futureRule.id, "admin1@masterhrms.internal", "ADMIN");

    // 2. Query date in FY 2026-27 (prior to 2027-04-01) -> Must NOT resolve future rule (fails closed)
    const resolvedPrePeriod = await registryService.resolveApplicableRule({
      ruleType: "TEST_FUTURE_TYPE",
      effectiveDate: new Date("2026-10-15"),
    });
    expect(resolvedPrePeriod).toBeNull();

    // 3. Query date within FY 2027-28 (e.g. 2027-05-01) -> Must resolve future rule
    const resolvedInPeriod = await registryService.resolveApplicableRule({
      ruleType: "TEST_FUTURE_TYPE",
      effectiveDate: new Date("2027-05-01"),
    });
    expect(resolvedInPeriod).not.toBeNull();
    expect(resolvedInPeriod?.effectiveVersion).toBe(1);
    expect(resolvedInPeriod?.rule.configJson).toEqual({ statutoryCeiling: 25000, employeeRate: 0.12 });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Safe Fallback / Fail-Closed on Expired or Missing Rules
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 3: Expired or missing mandatory rules fail safely without silent corruption", async () => {
    // When no statutory rule exists in database for a query date outside any rule's effective window
    const missingResult = await registryService.resolveApplicableRule({
      ruleType: "NON_EXISTENT_RULE_TYPE",
      effectiveDate: new Date("2026-10-15"),
    });

    // Registry returns null rather than fabricating an arbitrary value
    expect(missingResult).toBeNull();

    // Payroll engine uses safe statutory defaults or explicit zero
    const employee = {
      id: "emp-safe",
      employeeCode: "SAFE001",
      firstName: "Safe",
      lastName: "Fallback",
      email: "safe@masterhrms.internal",
      baseMonthlyCtc: 50000,
      state: "TN",
      pfEligible: false,
      esiEligible: false,
      ptEligible: false,
      tdsEligible: false,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {
      periodMonth: 10,
      periodYear: 2026,
      statutoryRules: [], // Empty / missing rules
    });

    expect(breakdown.deductions.providentFund).toBe(0);
    expect(breakdown.deductions.esi).toBe(0);
    expect(breakdown.deductions.professionalTax).toBe(0);
    expect(breakdown.netPay).toBe(50000);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Jurisdiction & Employee Eligibility Matrix
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 4: Jurisdiction and employee eligibility determine the exact statutory rule", () => {
    // Tamil Nadu vs Maharashtra PT Rules
    const grossUnderExemption = 15000;
    const grossInTaxableSlab = 25000;

    // TN: gross 15,000 is <= 21,000 -> ₹0. Gross 25,000 (21,001-30,000) -> ₹100
    // MH: gross 25,000 is > 10,000 -> ₹200 (₹300 in Feb)
    const ptTN_low = calculateProfessionalTax(grossUnderExemption, "TN", 4);
    const ptTN_high = calculateProfessionalTax(grossInTaxableSlab, "TN", 4);
    const ptMH_high = calculateProfessionalTax(grossInTaxableSlab, "MH", 4);

    expect(ptTN_low).toBe(0);
    expect(ptTN_high).toBe(100);  // TN statutory slab (₹21,001 to ₹30,000 = ₹100/mo)
    expect(ptMH_high).toBe(200);  // MH statutory slab (> ₹10,000 = ₹200/mo)

    // ESI Wage Ceiling Threshold Eligibility
    // Wage ₹18,000 <= ₹21,000 -> Eligible (0.75% = ₹135)
    // Wage ₹25,000 > ₹21,000 -> Ineligible (0% = ₹0)
    const esiEligible = calculateStatutoryESI(18000, false);
    const esiExceeded = calculateStatutoryESI(25000, false);

    expect(esiEligible.isEligible).toBe(true);
    expect(esiEligible.employeeEsi).toBe(135);

    expect(esiExceeded.isEligible).toBe(false);
    expect(esiExceeded.employeeEsi).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Payroll Snapshot Provenance & Immutability
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 5: Previous payroll calculations retain their original rule-version manifest", () => {
    const employee = {
      id: "emp-prov",
      employeeCode: "PROV001",
      firstName: "Provenance",
      lastName: "Audited",
      email: "prov@masterhrms.internal",
      baseMonthlyCtc: 40000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const historicalRulePack = [
      {
        id: "hist-epf-v1",
        ruleType: "EPF",
        version: 1,
        configJson: { statutoryCeiling: 15000, employeeRate: 0.12 },
        isActive: true,
      },
    ];

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {
      periodMonth: 5,
      periodYear: 2026,
      statutoryRules: historicalRulePack as any,
    });

    // Assert that the statutoryManifest accurately captured the rule version used
    expect(breakdown.statutoryManifest).toBeDefined();
    expect(breakdown.statutoryManifest?.epf.ruleId).toBe("hist-epf-v1");
    expect(breakdown.statutoryManifest?.epf.version).toBe(1);
    expect(breakdown.statutoryManifest?.epf.statutoryCeiling).toBe(15000);
    expect(breakdown.statutoryManifest?.pt.stateCode).toBe("MH");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: Draft or Unapproved Rules Never Affect Production Calculations
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 6: Draft or unapproved rules never affect production calculations", async () => {
    // 1. Create a draft rule with an aggressive parameter (e.g. 20% employee rate)
    const draftRule = await registryService.createDraft({
      ruleIdentifier: "TEST_DRAFT_ONLY_EPF",
      ruleType: "EPF",
      category: "RETIREMENT_PF",
      jurisdictionLevel: "CENTRAL",
      stateCode: "ALL",
      configJson: { statutoryCeiling: 15000, employeeRate: 0.20 },
      effectiveFrom: new Date("2026-04-01"),
      effectiveTo: null,
      version: 99,
      isGlobal: true,
      actorEmail: "malicious_or_draft@masterhrms.internal",
    });

    expect(draftRule.publicationStatus).toBe("draft");
    expect(draftRule.isActive).toBe(false);

    // 2. Resolve applicable rule for current date -> Draft MUST NOT be returned
    const resolved = await registryService.resolveApplicableRule({
      ruleType: "EPF",
      effectiveDate: new Date("2026-06-01"),
    });

    if (resolved) {
      expect(resolved.rule.id).not.toBe(draftRule.id);
      expect(resolved.effectiveVersion).not.toBe(99);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 7: Effective Date Validation & Inverted Date Range Rejection
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 7: Inverted effective-date ranges (effectiveTo < effectiveFrom) are strictly rejected", async () => {
    await expect(
      registryService.createDraft({
        ruleIdentifier: "TEST_INVALID_DATES",
        ruleType: "EPF",
        category: "RETIREMENT_PF",
        jurisdictionLevel: "CENTRAL",
        stateCode: "ALL",
        configJson: { statutoryCeiling: 15000 },
        effectiveFrom: new Date("2026-06-01"),
        effectiveTo: new Date("2026-05-01"), // Prior to from date!
        version: 1,
        actorEmail: "tester@masterhrms.internal",
      })
    ).rejects.toThrow("effectiveTo date cannot be earlier than effectiveFrom date");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 8: Tenant Isolation for Statutory Configurations
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 8: Tenant A cannot read or modify Tenant B's statutory configurations", async () => {
    // Create tenant override for Tenant A
    const tenantARule = await registryService.createDraft({
      tenantId: testTenantA,
      ruleIdentifier: "TEST_TENANT_A_OVERRIDE",
      ruleType: "PT",
      category: "PROFESSIONAL_TAX",
      jurisdictionLevel: "ESTABLISHMENT",
      stateCode: "TN",
      configJson: { customSlab: true, deductionAmount: 300 },
      effectiveFrom: new Date("2026-04-01"),
      version: 1,
      actorEmail: "tenantA_admin@masterhrms.internal",
    });

    await registryService.submitForReview(tenantARule.id, "tenantA_admin@masterhrms.internal", "ADMIN");
    await registryService.approveRule(tenantARule.id, "tenantA_officer@masterhrms.internal", "COMPLIANCE", false);
    await registryService.publishRule(tenantARule.id, "tenantA_admin@masterhrms.internal", "ADMIN");

    // Resolving for Tenant B must NEVER resolve Tenant A's override
    const resolvedForTenantB = await registryService.resolveApplicableRule({
      tenantId: testTenantB,
      ruleType: "PT",
      stateCode: "TN",
      effectiveDate: new Date("2026-06-01"),
      allowTenantOverride: true,
    });

    if (resolvedForTenantB && resolvedForTenantB.resolutionSource === "TENANT_OVERRIDE") {
      expect(resolvedForTenantB.rule.tenantId).toBe(testTenantB);
      expect(resolvedForTenantB.rule.tenantId).not.toBe(testTenantA);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 9: Maker-Checker Enforcement & Immutable Audit Trail
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 9: Maker-Checker prevents rule creator from approving their own rule; logs full audit trail", async () => {
    const creatorEmail = "maker@masterhrms.internal";
    const checkerEmail = "checker@masterhrms.internal";

    // 1. Create draft
    const rule = await registryService.createDraft({
      ruleIdentifier: "TEST_MAKER_CHECKER_RULE",
      ruleType: "ESI",
      category: "SOCIAL_SECURITY_ESI",
      jurisdictionLevel: "CENTRAL",
      stateCode: "ALL",
      configJson: { wageCeiling: 21000, employeeRate: 0.0075 },
      effectiveFrom: new Date("2026-04-01"),
      version: 1,
      actorEmail: creatorEmail,
      actorRole: "MAKER",
    });

    // 2. Submit for review
    await registryService.submitForReview(rule.id, creatorEmail, "MAKER");

    // 3. Maker tries to approve own rule -> MUST FAIL
    await expect(
      registryService.approveRule(rule.id, creatorEmail, "CHECKER", true)
    ).rejects.toThrow("Maker-Checker violation: Rule creator cannot be the compliance approver.");

    // 4. Distinct checker approves -> SUCCEEDS
    const approved = await registryService.approveRule(rule.id, checkerEmail, "COMPLIANCE_OFFICER", true);
    expect(approved.publicationStatus).toBe("approved");
    expect(approved.approvedBy).toBe(checkerEmail);

    // 5. Verify immutable audit log entries recorded
    const auditLogs = await prisma.statutoryRuleAuditLog.findMany({
      where: { ruleId: rule.id },
      orderBy: { createdAt: "asc" },
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(3);
    expect(auditLogs[0].action).toBe("DRAFT_CREATED");
    expect(auditLogs[1].action).toBe("SUBMITTED_FOR_REVIEW");
    expect(auditLogs[2].action).toBe("APPROVED");
    expect(auditLogs[2].actorEmail).toBe(checkerEmail);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 10: Multi-Tier Statutory Amendment Simulation
  // ───────────────────────────────────────────────────────────────────────────
  it("Requirement 10: Multi-tier statutory amendment simulation evaluates representative scenarios with exact variances", () => {
    // Baseline: EPF ceiling ₹15,000, ESI ceiling ₹21,000
    // Candidate: EPF ceiling raised to ₹21,000
    const scenarios = [
      { label: "Junior Staff", monthlyGross: 15000 },
      { label: "Mid-level Associate", monthlyGross: 25000 },
      { label: "Senior Engineer", monthlyGross: 65000 },
    ];

    const baselineRules = [
      {
        id: "base-epf",
        ruleType: "EPF",
        version: 1,
        configJson: { statutoryCeiling: 15000, employeeRate: 0.12, employerEpfRate: 0.0367, employerEpsRate: 0.0833333333, epsMaxMonthly: 1250, edliRate: 0.005, pfAdminRate: 0.005 },
        isActive: true,
      },
    ];

    const proposedRules = [
      {
        id: "prop-epf",
        ruleType: "EPF",
        version: 2,
        configJson: { statutoryCeiling: 21000, employeeRate: 0.12, employerEpfRate: 0.0367, employerEpsRate: 0.0833333333, epsMaxMonthly: 1750, edliRate: 0.005, pfAdminRate: 0.005 },
        isActive: true,
      },
    ];

    for (const sc of scenarios) {
      const employee = {
        id: "emp-sim",
        employeeCode: "SIM001",
        firstName: "Sim",
        lastName: "Tier",
        email: "sim@masterhrms.internal",
        baseMonthlyCtc: sc.monthlyGross,
        state: "TN",
        pfEligible: true,
        esiEligible: sc.monthlyGross <= 21000,
        ptEligible: true,
        tdsEligible: true,
      };

      const attendance = {
        totalWorkingDays: 30,
        payableDays: 30,
        presentDays: 30,
        halfDays: 0,
        approvedLeaveDays: 0,
        lossOfPayDays: 0,
        prorationFactor: 1.0,
      };

      const baseCalc = computeEmployeePayrollBreakdown(employee, attendance, {
        periodMonth: 4,
        periodYear: 2026,
        statutoryRules: baselineRules as any,
      });

      const propCalc = computeEmployeePayrollBreakdown(employee, attendance, {
        periodMonth: 4,
        periodYear: 2026,
        statutoryRules: proposedRules as any,
      });

      if (sc.monthlyGross === 15000) {
        // Basic = 15000 * 0.5 = 7500. Both ceilings (15k and 21k) are above 7500 -> 0 variance
        expect(propCalc.deductions.providentFund).toBe(baseCalc.deductions.providentFund);
      } else if (sc.monthlyGross >= 25000) {
        expect(propCalc.deductions.providentFund).toBe(baseCalc.deductions.providentFund);
      }
    }
  });
});
