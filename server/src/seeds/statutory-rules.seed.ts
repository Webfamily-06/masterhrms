import { PrismaClient } from "@prisma/client";

export interface StatutoryRuleSeed {
  ruleType: string;
  stateCode: string;
  version: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  sourceAuthority: string;
  notificationRef: string;
  isVerified: boolean;
  status: string;
  configJson: any;
}

export const OFFICIAL_STATUTORY_RULE_PACKS: StatutoryRuleSeed[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // EPF (Employees' Provident Fund) — Central Jurisdiction
  // ───────────────────────────────────────────────────────────────────────────
  {
    ruleType: "EPF",
    stateCode: "ALL",
    version: 1,
    effectiveFrom: new Date("2014-09-01"),
    effectiveTo: null,
    sourceAuthority: "Ministry of Labour & Employment / EPFO",
    notificationRef: "EPFO Notification G.S.R. 609(E) / Section 6 EPF & MP Act 1952",
    isVerified: true,
    status: "active",
    configJson: {
      statutoryCeiling: 15000,
      employeeRate: 0.12,
      employerEpfRate: 0.0367,
      employerEpsRate: 0.0833,
      edliRate: 0.005,
      edliMaxMonthly: 75,
      pfAdminRate: 0.005,
      pfAdminMinMonthly: 500,
      excludedComponents: ["HRA", "OVERTIME", "COMMISSION"],
      methods: {
        statutory_ceiling: "Capped at statutory ceiling ₹15,000",
        custom_cap: "Capped at custom company ceiling (e.g. ₹25,000)",
        actual_wages: "12% of actual wages without ceiling"
      }
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ESIC (Employees' State Insurance) — Central Jurisdiction
  // ───────────────────────────────────────────────────────────────────────────
  {
    ruleType: "ESI",
    stateCode: "ALL",
    version: 1,
    effectiveFrom: new Date("2019-07-01"),
    effectiveTo: null,
    sourceAuthority: "Ministry of Labour & Employment / ESIC",
    notificationRef: "ESIC Gazette Notification G.S.R. 423(E)",
    isVerified: true,
    status: "active",
    configJson: {
      wageCeiling: 21000,
      wageCeilingPwd: 25000,
      employeeRate: 0.0075,
      employerRate: 0.0325,
      contributionPeriods: [
        { name: "Period 1", months: [4, 5, 6, 7, 8, 9] },
        { name: "Period 2", months: [10, 11, 12, 1, 2, 3] }
      ],
      maintainCoverageWithinPeriod: true
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // PROFESSIONAL TAX (PT) — State Specific Packs
  // ───────────────────────────────────────────────────────────────────────────
  // Tamil Nadu
  {
    ruleType: "PT",
    stateCode: "TN",
    version: 1,
    effectiveFrom: new Date("2023-04-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of Tamil Nadu / Municipal Administration Department",
    notificationRef: "Tamil Nadu Municipal Laws (Amendment) Act / G.O. Ms. No. 45",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "monthly_accrual_half_yearly_settlement",
      slabs: [
        { min: 0, max: 21000, tax: 0 },
        { min: 21001, max: 30000, tax: 100 },
        { min: 30001, max: 45000, tax: 235 },
        { min: 45001, max: 60000, tax: 510 },
        { min: 60001, max: 75000, tax: 760 },
        { min: 75001, max: null, tax: 182.5 } // half-yearly 1095 / 6
      ]
    }
  },

  // Karnataka
  {
    ruleType: "PT",
    stateCode: "KA",
    version: 1,
    effectiveFrom: new Date("2023-04-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of Karnataka / Commercial Taxes Dept",
    notificationRef: "Karnataka Act No. 14 of 2023 / Notification No. FD 03 CSL 2023",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "monthly",
      slabs: [
        { min: 0, max: 14999, tax: 0 },
        { min: 15000, max: null, tax: 200 }
      ]
    }
  },

  // Maharashtra
  {
    ruleType: "PT",
    stateCode: "MH",
    version: 1,
    effectiveFrom: new Date("2023-04-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of Maharashtra / Department of Sales Tax",
    notificationRef: "Maharashtra State Tax on Professions, Trades Act / Mah. Act No. XXVIII",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "monthly",
      femaleExemptionCeiling: 25000,
      februarySpecialTax: 300,
      slabs: [
        { min: 0, max: 7500, tax: 0 },
        { min: 7501, max: 10000, tax: 175 },
        { min: 10001, max: null, tax: 200, februarySpecialTax: 300 }
      ]
    }
  },

  // Telangana
  {
    ruleType: "PT",
    stateCode: "TS",
    version: 1,
    effectiveFrom: new Date("2020-04-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of Telangana / Commercial Taxes Dept",
    notificationRef: "Telangana Tax on Professions Act 1987 (Adopted)",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "monthly",
      slabs: [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: 20000, tax: 150 },
        { min: 20001, max: null, tax: 200 }
      ]
    }
  },

  // West Bengal
  {
    ruleType: "PT",
    stateCode: "WB",
    version: 1,
    effectiveFrom: new Date("2022-04-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of West Bengal / Directorate of Commercial Taxes",
    notificationRef: "West Bengal State Tax on Professions Act, 1979",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "monthly",
      slabs: [
        { min: 0, max: 10000, tax: 0 },
        { min: 10001, max: 15000, tax: 110 },
        { min: 15001, max: 25000, tax: 130 },
        { min: 25001, max: 40000, tax: 150 },
        { min: 40001, max: null, tax: 200 }
      ]
    }
  },

  // Gujarat
  {
    ruleType: "PT",
    stateCode: "GJ",
    version: 1,
    effectiveFrom: new Date("2022-04-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of Gujarat / Commercial Tax Dept",
    notificationRef: "Gujarat Panchayats, Municipalities and State Tax Act",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "monthly",
      slabs: [
        { min: 0, max: 12000, tax: 0 },
        { min: 12001, max: null, tax: 200 }
      ]
    }
  },

  // Zero-PT States (Delhi, Haryana, Uttar Pradesh, Rajasthan, Uttarakhand, etc.)
  {
    ruleType: "PT",
    stateCode: "DL",
    version: 1,
    effectiveFrom: new Date("2020-01-01"),
    effectiveTo: null,
    sourceAuthority: "Govt of NCT of Delhi",
    notificationRef: "No Professional Tax applicable in NCT of Delhi",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "none",
      slabs: [{ min: 0, max: null, tax: 0 }]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // LABOUR WELFARE FUND (LWF) — State Specific Packs
  // ───────────────────────────────────────────────────────────────────────────
  // Tamil Nadu
  {
    ruleType: "LWF",
    stateCode: "TN",
    version: 1,
    effectiveFrom: new Date("2022-01-01"),
    effectiveTo: null,
    sourceAuthority: "Tamil Nadu Labour Welfare Board",
    notificationRef: "Tamil Nadu Labour Welfare Fund Act 1972 / G.O. (D) No. 493",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "annual",
      deductionMonth: 12, // December
      employeeContribution: 10,
      employerContribution: 20
    }
  },

  // Karnataka
  {
    ruleType: "LWF",
    stateCode: "KA",
    version: 1,
    effectiveFrom: new Date("2024-01-01"),
    effectiveTo: null,
    sourceAuthority: "Karnataka Labour Welfare Board",
    notificationRef: "Karnataka Labour Welfare Fund (Amendment) Act 2024",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "annual",
      deductionMonth: 12,
      employeeContribution: 20,
      employerContribution: 40
    }
  },

  // Maharashtra
  {
    ruleType: "LWF",
    stateCode: "MH",
    version: 1,
    effectiveFrom: new Date("2024-06-01"),
    effectiveTo: null,
    sourceAuthority: "Maharashtra Labour Welfare Board",
    notificationRef: "Maharashtra Labour Welfare Fund (Amendment) Act 2024 / No. MLWB/2024",
    isVerified: true,
    status: "active",
    configJson: {
      frequency: "half_yearly",
      deductionMonths: [6, 12], // June & December
      employeeContribution: 12,
      employerContribution: 36
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // INCOME TAX / TDS (ITA 2025/2026 Slabs) — Central Jurisdiction
  // ───────────────────────────────────────────────────────────────────────────
  {
    ruleType: "TDS_ITA2025",
    stateCode: "ALL",
    version: 1,
    effectiveFrom: new Date("2025-04-01"),
    effectiveTo: null,
    sourceAuthority: "Central Board of Direct Taxes (CBDT) / Ministry of Finance",
    notificationRef: "Finance Act 2025 / Section 115BAC & Section 392 Withholding Tables",
    isVerified: true,
    status: "active",
    configJson: {
      financialYear: "2026-2027",
      assessmentYear: "2027-2028",
      cessRate: 0.04,
      newRegime: {
        standardDeduction: 75000,
        section87ARebateThreshold: 1200000,
        slabs: [
          { min: 0, max: 400000, rate: 0.0 },
          { min: 400001, max: 800000, rate: 0.05 },
          { min: 800001, max: 1200000, rate: 0.10 },
          { min: 1200001, max: 1600000, rate: 0.15 },
          { min: 1600001, max: 2000000, rate: 0.20 },
          { min: 2000010, max: 2400000, rate: 0.25 },
          { min: 2400001, max: null, rate: 0.30 }
        ]
      },
      oldRegime: {
        standardDeduction: 50000,
        section87ARebateThreshold: 500000,
        section80CLimit: 150000,
        section80DLimit: 25000,
        section24bLimit: 200000,
        slabs: [
          { min: 0, max: 250000, rate: 0.0 },
          { min: 250001, max: 500000, rate: 0.05 },
          { min: 500001, max: 1000000, rate: 0.20 },
          { min: 1000001, max: null, rate: 0.30 }
        ]
      }
    }
  }
];

export async function seedStatutoryRules(prisma: PrismaClient, tenantId: string) {
  console.log(`Seeding official statutory rule packs for tenant: ${tenantId}...`);
  let count = 0;
  for (const pack of OFFICIAL_STATUTORY_RULE_PACKS) {
    const existing = await prisma.statutoryRule.findFirst({
      where: {
        tenantId,
        ruleType: pack.ruleType,
        stateCode: pack.stateCode,
        version: pack.version,
      }
    });

    if (existing) {
      await prisma.statutoryRule.update({
        where: { id: existing.id },
        data: {
          configJson: pack.configJson,
          effectiveFrom: pack.effectiveFrom,
          effectiveTo: pack.effectiveTo,
          sourceAuthority: pack.sourceAuthority,
          notificationRef: pack.notificationRef,
          isVerified: pack.isVerified,
          status: pack.status,
          isActive: true
        }
      });
    } else {
      await prisma.statutoryRule.create({
        data: {
          tenantId,
          ruleType: pack.ruleType,
          stateCode: pack.stateCode,
          configJson: pack.configJson,
          version: pack.version,
          effectiveFrom: pack.effectiveFrom,
          effectiveTo: pack.effectiveTo,
          sourceAuthority: pack.sourceAuthority,
          notificationRef: pack.notificationRef,
          isVerified: pack.isVerified,
          status: pack.status,
          isActive: true
        }
      });
    }
    count++;
  }
  console.log(`Successfully seeded ${count} statutory rule packs.`);
}
