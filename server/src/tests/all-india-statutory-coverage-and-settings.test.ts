import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { CANONICAL_36_JURISDICTIONS, ALL_INDIA_JURISDICTIONS } from "../constants/jurisdictions";
import { StatutoryRuleRegistryService } from "../services/statutory-rule-registry.service";
import { StatutoryAmendmentIngestionService } from "../services/statutory-amendment-ingestion.service";
import { computeEmployeePayrollBreakdown } from "../services/payroll-engine.service";

const prisma = new PrismaClient();

describe("Phase 2 — All-India Statutory Coverage & Dynamic HR Payroll Settings", () => {
  let testTenantAId: string;
  let testTenantBId: string;
  let registryService: StatutoryRuleRegistryService;

  beforeAll(async () => {
    // 1. Provision or locate test tenants
    let tenantA = await prisma.tenant.findFirst({ where: { slug: "test-jurisdiction-tenant-a" } });
    if (!tenantA) {
      tenantA = await prisma.tenant.create({
        data: {
          name: "Jurisdiction Test Tenant A",
          slug: "test-jurisdiction-tenant-a",
        },
      });
    }
    testTenantAId = tenantA.id;

    let tenantB = await prisma.tenant.findFirst({ where: { slug: "test-jurisdiction-tenant-b" } });
    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          name: "Jurisdiction Test Tenant B",
          slug: "test-jurisdiction-tenant-b",
        },
      });
    }
    testTenantBId = tenantB.id;

    registryService = new StatutoryRuleRegistryService(prisma);
    // Ensure all 13 authoritative central and state rule packs are seeded as global published rules
    await registryService.seedAuthoritativeRegistry();
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.setting.deleteMany({
      where: {
        scope: "TENANT",
        scopeId: { in: [testTenantAId, testTenantBId] },
      },
    });
    await prisma.statutoryRuleAuditLog.deleteMany({
      where: {
        rule: {
          tenantId: { in: [testTenantAId, testTenantBId] },
        },
      },
    });
    await prisma.statutoryRule.deleteMany({
      where: {
        tenantId: { in: [testTenantAId, testTenantBId] },
      },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. ALL-INDIA 36 JURISDICTIONS CANONICAL REGISTRY
  // =========================================================================
  describe("1. Canonical 36 Indian Jurisdictions Registry", () => {
    it("should cover exactly 36 jurisdictions (28 States + 8 Union Territories)", () => {
      expect(CANONICAL_36_JURISDICTIONS.length).toBe(36);
      expect(ALL_INDIA_JURISDICTIONS.length).toBe(36);

      const states = CANONICAL_36_JURISDICTIONS.filter((j) => j.type === "STATE");
      const uts = CANONICAL_36_JURISDICTIONS.filter((j) => j.type === "UNION_TERRITORY");

      expect(states.length).toBe(28);
      expect(uts.length).toBe(8);
    });

    it("should have stable codes, capitals, TIN codes, and governing authorities for key states", () => {
      const mh = CANONICAL_36_JURISDICTIONS.find((j) => j.stateCode === "MH");
      expect(mh).toBeDefined();
      expect(mh?.name).toBe("Maharashtra");
      expect(mh?.capital).toBe("Mumbai");
      expect(mh?.hasPt).toBe(true);

      const ka = CANONICAL_36_JURISDICTIONS.find((j) => j.stateCode === "KA");
      expect(ka).toBeDefined();
      expect(ka?.name).toBe("Karnataka");
      expect(ka?.hasPt).toBe(true);

      const tn = CANONICAL_36_JURISDICTIONS.find((j) => j.stateCode === "TN");
      expect(tn).toBeDefined();
      expect(tn?.name).toBe("Tamil Nadu");
      expect(tn?.hasPt).toBe(true);
      expect(tn?.hasLwf).toBe(true);

      const dl = CANONICAL_36_JURISDICTIONS.find((j) => j.stateCode === "DL");
      expect(dl).toBeDefined();
      expect(dl?.type).toBe("UNION_TERRITORY");
      expect(dl?.hasPt).toBe(false); // Delhi has no Professional Tax
      expect(dl?.hasLwf).toBe(true); // Delhi has Labour Welfare Fund
    });
  });

  // =========================================================================
  // 2. HR PAYROLL SETTINGS DATABASE PERSISTENCE & TENANT ISOLATION
  // =========================================================================
  describe("2. HR Payroll Settings Database Persistence & Tenant Isolation", () => {
    it("should persist employer configuration parameters to database and reload correctly", async () => {
      const configA = {
        cutoffDay: 25,
        cutoffEndDay: 24,
        payCycle: "monthly",
        bankFormat: "ICICI_CIB",
        voluntaryPfAllowed: true,
        defaultWorkState: "KA",
        statutoryAutoDeduction: true,
        lwfEnabled: true,
        ptEnabled: true,
      };

      // Upsert Tenant A setting
      const savedA = await prisma.setting.upsert({
        where: {
          scope_scopeId_key: {
            scope: "TENANT",
            scopeId: testTenantAId,
            key: "payroll_config",
          },
        },
        create: {
          scope: "TENANT",
          scopeId: testTenantAId,
          group: "payroll",
          key: "payroll_config",
          valueType: "JSON",
          valueJson: configA,
          updatedBy: "hr_admin_a",
        },
        update: {
          valueJson: configA,
          updatedBy: "hr_admin_a",
        },
      });

      expect(savedA.id).toBeDefined();
      expect((savedA.valueJson as any).cutoffDay).toBe(25);
      expect((savedA.valueJson as any).bankFormat).toBe("ICICI_CIB");
      expect((savedA.valueJson as any).defaultWorkState).toBe("KA");

      // Verify retrieval from database
      const reloadedA = await prisma.setting.findFirst({
        where: {
          scope: "TENANT",
          scopeId: testTenantAId,
          key: "payroll_config",
        },
      });

      expect(reloadedA).toBeDefined();
      expect((reloadedA?.valueJson as any).bankFormat).toBe("ICICI_CIB");
    });

    it("should strictly enforce tenant isolation so Tenant A cannot read or overwrite Tenant B settings", async () => {
      const configB = {
        cutoffDay: 1,
        cutoffEndDay: 30,
        payCycle: "monthly",
        bankFormat: "HDFC_CMS",
        voluntaryPfAllowed: false,
        defaultWorkState: "MH",
      };

      await prisma.setting.upsert({
        where: {
          scope_scopeId_key: {
            scope: "TENANT",
            scopeId: testTenantBId,
            key: "payroll_config",
          },
        },
        create: {
          scope: "TENANT",
          scopeId: testTenantBId,
          group: "payroll",
          key: "payroll_config",
          valueType: "JSON",
          valueJson: configB,
          updatedBy: "hr_admin_b",
        },
        update: {
          valueJson: configB,
          updatedBy: "hr_admin_b",
        },
      });

      const settingA = await prisma.setting.findFirst({
        where: { scope: "TENANT", scopeId: testTenantAId, key: "payroll_config" },
      });
      const settingB = await prisma.setting.findFirst({
        where: { scope: "TENANT", scopeId: testTenantBId, key: "payroll_config" },
      });

      expect(settingA).toBeDefined();
      expect(settingB).toBeDefined();
      expect((settingA?.valueJson as any).bankFormat).toBe("ICICI_CIB");
      expect((settingB?.valueJson as any).bankFormat).toBe("HDFC_CMS");
      expect((settingA?.valueJson as any).defaultWorkState).toBe("KA");
      expect((settingB?.valueJson as any).defaultWorkState).toBe("MH");
    });
  });

  // =========================================================================
  // 3. OFFICIAL SOURCE AMENDMENT INGESTION & SAFETY GATE
  // =========================================================================
  describe("3. Official Source Amendment Ingestion & Safety Gate", () => {
    it("should ingest gazette notification, calculate diff, and create unverified DRAFT without auto-publishing", async () => {
      const payload = {
        sourceCode: "EPFO_GOV",
        notificationRef: "TEST-SO-2026-9999",
        sourceAuthority: "Ministry of Labour & Employment",
        sourceUrl: "https://www.epfindia.gov.in/circulars/2026/9999.pdf",
        title: "Proposed Wage Ceiling Revision",
        gazetteDate: "2026-10-15",
        effectiveFrom: "2026-11-01",
        ruleType: "EPF",
        stateCode: "ALL",
        proposedConfig: {
          statutoryCeiling: 21000, // Proposed increase from 15000 to 21000
          employeeRate: 0.12,
          employerEpfRate: 0.0367,
          employerEpsRate: 0.0833,
          epsMaxMonthly: 1750,
        },
        changeSummary: "Proposed hike of EPF wage ceiling from ₹15,000 to ₹21,000",
      };

      const result = await StatutoryAmendmentIngestionService.ingestNotificationAsDraft(
        payload,
        "compliance_officer_test@masterhrms.internal",
        "COMPLIANCE_ANALYST",
        testTenantAId
      );

      expect(result.draftRule).toBeDefined();
      expect(result.draftRule.publicationStatus).toBe("draft");
      expect(result.draftRule.status).toBe("draft");
      expect(result.draftRule.isActive).toBe(false); // CRITICAL: Inactive
      expect(result.draftRule.isVerified).toBe(false); // CRITICAL: Unverified
      expect(result.checksum).toBeDefined();
      expect(result.diff.hasChanges).toBe(true);

      // Verify safety: Resolver MUST NOT pick up the draft rule
      const resolved = await registryService.resolveApplicableRule({
        ruleType: "EPF",
        stateCode: "ALL",
        effectiveDate: new Date("2026-11-05"),
        tenantId: testTenantAId,
      });

      // Resolved active rule must still be the published baseline (15000 ceiling), NOT the 21000 draft!
      expect(resolved).toBeDefined();
      expect(resolved?.rule.publicationStatus).toBe("published");
      expect((resolved?.rule.configJson as any).statutoryCeiling).toBe(15000);
    });
  });

  // =========================================================================
  // 4. RULE RESOLUTION PRECEDENCE (3-TIER RESOLVER)
  // =========================================================================
  describe("4. 3-Tier Rule Resolution Precedence", () => {
    it("should resolve Tenant Override over State Rule over Central Rule", async () => {
      // Create published tenant override for PT in MH for Tenant A
      const tenantOverride = await prisma.statutoryRule.create({
        data: {
          tenantId: testTenantAId,
          ruleIdentifier: "RULE_PT_MH_TENANT_A_OVERRIDE",
          ruleType: "PT",
          category: "PROFESSIONAL_TAX",
          jurisdictionLevel: "STATE",
          stateCode: "MH",
          applicableCategory: "ALL",
          configJson: {
            frequency: "MONTHLY",
            slabs: [
              { min: 0, max: 10000, tax: 0 },
              { min: 10001, max: null, tax: 300 }, // Custom tenant override slab
            ],
          },
          version: 1,
          effectiveFrom: new Date("2026-01-01"),
          publicationStatus: "published",
          isActive: true,
          isGlobal: false,
        },
      });

      // Tenant A resolves its own override
      const resolvedA = await registryService.resolveApplicableRule({
        ruleType: "PT",
        stateCode: "MH",
        effectiveDate: new Date("2026-06-01"),
        tenantId: testTenantAId,
      });

      expect(resolvedA).toBeDefined();
      expect(resolvedA?.resolutionSource).toBe("TENANT_OVERRIDE");
      expect((resolvedA?.rule.configJson as any).slabs[1].tax).toBe(300);

      // Tenant B (which has no override) resolves the official State Rule
      const resolvedB = await registryService.resolveApplicableRule({
        ruleType: "PT",
        stateCode: "MH",
        effectiveDate: new Date("2026-06-01"),
        tenantId: testTenantBId,
      });

      expect(resolvedB).toBeDefined();
      expect(resolvedB?.resolutionSource).toBe("STATE_RULE");
      expect((resolvedB?.rule.configJson as any).slabs[1].tax).not.toBe(300);
    });
  });

  // =========================================================================
  // 5. INTERACTIVE PAYROLL SIMULATOR INTEGRATION & PROVENANCE
  // =========================================================================
  describe("5. Interactive Payroll Simulator Integration & Provenance", () => {
    it("should compute accurate itemized deductions and emit complete statutoryManifest", () => {
      const syntheticEmployee = {
        id: "TEST_SIM_001",
        employeeCode: "SIM001",
        firstName: "Anand",
        lastName: "Subramanian",
        baseMonthlyCtc: 70000,
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
        {
          periodMonth: 1,
          periodYear: 2026,
        }
      );

      expect(breakdown.earnings.totalGross).toBe(70000);
      expect(breakdown.earnings.basicSalary).toBe(35000); // 50%
      expect(breakdown.deductions.providentFund).toBe(4200); // 12% of 35,000 basic
      expect(breakdown.deductions.esi).toBe(0); // Gross > 21,000 ceiling, so exempt
      expect(breakdown.netPay).toBeGreaterThan(0);
      expect(breakdown.deductions.totalDeductions).toBe(
        breakdown.deductions.providentFund +
        breakdown.deductions.professionalTax +
        breakdown.deductions.lwf +
        breakdown.deductions.tds
      );

      // Verify Provenance Manifest
      expect(breakdown.statutoryManifest).toBeDefined();
      expect(breakdown.statutoryManifest.epf).toBeDefined();
      expect(breakdown.statutoryManifest.pt).toBeDefined();
      expect(breakdown.statutoryManifest.pt.stateCode).toBe("TN");
    });
  });
});
