"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OFFICIAL_STATUTORY_RULE_PACKS = void 0;
exports.seedStatutoryRules = seedStatutoryRules;
exports.OFFICIAL_STATUTORY_RULE_PACKS = [
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
    // HISTORICAL INCOME TAX / TDS — FY 2024–25 (Income-tax Act, 1961 / Finance (No. 2) Act, 2024)
    // ───────────────────────────────────────────────────────────────────────────
    {
        ruleType: "TDS_115BAC_FY2425",
        stateCode: "ALL",
        version: 1,
        effectiveFrom: new Date("2024-04-01"),
        effectiveTo: new Date("2025-03-31"),
        sourceAuthority: "Central Board of Direct Taxes (CBDT) / Ministry of Finance",
        notificationRef: "Income-tax Act, 1961 Section 192 (Withholding), Section 115BAC & Section 87A / Finance (No. 2) Act, 2024",
        isVerified: true,
        status: "active",
        configJson: {
            act: "Income-tax Act, 1961",
            salaryWithholdingSection: "192",
            rebateSection: "87A",
            regimeSection: "115BAC",
            taxYear: "2024-2025",
            financialYear: "2024-2025",
            assessmentYear: "2025-2026",
            cessRate: 0.04,
            newRegime: {
                standardDeduction: 75000,
                section87ARebateThreshold: 700000,
                maxRebateAmount: 25000,
                slabs: [
                    { min: 0, max: 300000, rate: 0.0 },
                    { min: 300001, max: 600000, rate: 0.05 },
                    { min: 600001, max: 900000, rate: 0.10 },
                    { min: 900001, max: 1200000, rate: 0.15 },
                    { min: 1200001, max: 1500000, rate: 0.20 },
                    { min: 1500001, max: null, rate: 0.30 }
                ]
            },
            oldRegime: {
                standardDeduction: 50000,
                section87ARebateThreshold: 500000,
                maxRebateAmount: 12500,
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
    },
    // ───────────────────────────────────────────────────────────────────────────
    // INCOME TAX / TDS — FY 2025–26 (Income-tax Act, 1961 / Finance Act, 2025)
    // ───────────────────────────────────────────────────────────────────────────
    {
        ruleType: "TDS_115BAC",
        stateCode: "ALL",
        version: 1,
        effectiveFrom: new Date("2025-04-01"),
        effectiveTo: new Date("2026-03-31"),
        sourceAuthority: "Central Board of Direct Taxes (CBDT) / Ministry of Finance",
        notificationRef: "Income-tax Act, 1961 Section 192 (Withholding), Section 115BAC & Section 87A / Finance Act, 2025",
        isVerified: true,
        status: "active",
        configJson: {
            act: "Income-tax Act, 1961",
            salaryWithholdingSection: "192",
            rebateSection: "87A",
            regimeSection: "115BAC",
            taxYear: "2025-2026",
            financialYear: "2025-2026",
            assessmentYear: "2026-2027",
            cessRate: 0.04,
            newRegime: {
                standardDeduction: 75000,
                section87ARebateThreshold: 1200000,
                maxRebateAmount: 60000,
                slabs: [
                    { min: 0, max: 400000, rate: 0.0 },
                    { min: 400001, max: 800000, rate: 0.05 },
                    { min: 800001, max: 1200000, rate: 0.10 },
                    { min: 1200001, max: 1600000, rate: 0.15 },
                    { min: 1600001, max: 2000000, rate: 0.20 },
                    { min: 2000001, max: 2400000, rate: 0.25 },
                    { min: 2400001, max: null, rate: 0.30 }
                ]
            },
            oldRegime: {
                standardDeduction: 50000,
                section87ARebateThreshold: 500000,
                maxRebateAmount: 12500,
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
    },
    // ───────────────────────────────────────────────────────────────────────────
    // INCOME TAX / TDS — FY 2026–27 / Tax Year 2026–27 (Income-tax Act, 2025)
    // ───────────────────────────────────────────────────────────────────────────
    {
        ruleType: "TDS_ITA2025",
        stateCode: "ALL",
        version: 1,
        effectiveFrom: new Date("2026-04-01"),
        effectiveTo: null,
        sourceAuthority: "Central Board of Direct Taxes (CBDT) / Ministry of Finance",
        notificationRef: "Income-tax Act, 2025 Section 392 (Withholding) & Section 156 (Rebate)",
        isVerified: true,
        status: "active",
        configJson: {
            act: "Income-tax Act, 2025",
            salaryWithholdingSection: "392",
            rebateSection: "156",
            legacyWithholdingSection: "192",
            legacyRebateSection: "87A",
            taxYear: "2026-2027",
            financialYear: "2026-2027",
            assessmentYear: "2027-2028",
            cessRate: 0.04,
            newRegime: {
                standardDeduction: 75000,
                section156RebateThreshold: 1200000,
                section87ARebateThreshold: 1200000,
                maxRebateAmount: 60000,
                slabs: [
                    { min: 0, max: 400000, rate: 0.0 },
                    { min: 400001, max: 800000, rate: 0.05 },
                    { min: 800001, max: 1200000, rate: 0.10 },
                    { min: 1200001, max: 1600000, rate: 0.15 },
                    { min: 1600001, max: 2000000, rate: 0.20 },
                    { min: 2000001, max: 2400000, rate: 0.25 },
                    { min: 2400001, max: null, rate: 0.30 }
                ]
            },
            oldRegime: {
                standardDeduction: 50000,
                section156RebateThreshold: 500000,
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
    },
    // ───────────────────────────────────────────────────────────────────────────
    // PAYMENT OF GRATUITY — Central Jurisdiction
    // ───────────────────────────────────────────────────────────────────────────
    {
        ruleType: "GRATUITY",
        stateCode: "ALL",
        version: 1,
        effectiveFrom: new Date("2018-03-29"),
        effectiveTo: null,
        sourceAuthority: "Ministry of Labour and Employment",
        notificationRef: "Payment of Gratuity (Amendment) Act, 2018 / Act No. 12 of 2018",
        isVerified: true,
        status: "active",
        configJson: {
            daysFactor: 15,
            monthDaysDenominator: 26,
            statutoryMaxCap: 2000000, // ₹20 Lakhs
            minServiceYearsForEligibility: 5,
            accrualFrequency: "monthly", // (15 * Basic) / 26 / 12
        }
    }
];
async function seedStatutoryRules(prisma, tenantId) {
    console.log(`Seeding official statutory rule packs for ${tenantId ? `tenant: ${tenantId}` : 'central/global scope'}...`);
    let count = 0;
    for (const pack of exports.OFFICIAL_STATUTORY_RULE_PACKS) {
        const isCentral = pack.stateCode === "ALL";
        const jurisdictionLevel = isCentral ? "CENTRAL" : "STATE";
        let category = "CENTRAL_STATUTORY";
        if (pack.ruleType === "EPF")
            category = "RETIREMENT_PF";
        else if (pack.ruleType === "ESI")
            category = "SOCIAL_SECURITY_ESI";
        else if (pack.ruleType === "PT")
            category = "PROFESSIONAL_TAX";
        else if (pack.ruleType === "LWF")
            category = "LABOUR_WELFARE";
        else if (pack.ruleType.includes("TDS"))
            category = "DIRECT_TAX";
        else if (pack.ruleType === "GRATUITY")
            category = "GRATUITY";
        const ruleIdentifier = `${pack.ruleType}_${pack.stateCode}_V${pack.version}`;
        const existing = await prisma.statutoryRule.findFirst({
            where: {
                ruleType: pack.ruleType,
                stateCode: pack.stateCode,
                version: pack.version,
                ...(tenantId ? { tenantId } : { isGlobal: true }),
            }
        });
        if (existing) {
            await prisma.statutoryRule.update({
                where: { id: existing.id },
                data: {
                    ruleIdentifier,
                    category,
                    jurisdictionLevel,
                    configJson: pack.configJson,
                    effectiveFrom: pack.effectiveFrom,
                    effectiveTo: pack.effectiveTo,
                    sourceAuthority: pack.sourceAuthority,
                    notificationRef: pack.notificationRef,
                    isVerified: pack.isVerified,
                    status: pack.status,
                    publicationStatus: "published",
                    isActive: true,
                    isGlobal: !tenantId,
                }
            });
        }
        else {
            await prisma.statutoryRule.create({
                data: {
                    tenantId: tenantId || null,
                    ruleIdentifier,
                    ruleType: pack.ruleType,
                    category,
                    jurisdictionLevel,
                    stateCode: pack.stateCode,
                    applicableCategory: "ALL",
                    configJson: pack.configJson,
                    version: pack.version,
                    effectiveFrom: pack.effectiveFrom,
                    effectiveTo: pack.effectiveTo,
                    sourceAuthority: pack.sourceAuthority,
                    notificationRef: pack.notificationRef,
                    isVerified: pack.isVerified,
                    status: pack.status,
                    publicationStatus: "published",
                    isActive: true,
                    isGlobal: !tenantId,
                    createdBy: "system_seeder",
                    publishedBy: "system_seeder",
                    publishedAt: new Date(),
                }
            });
        }
        count++;
    }
    console.log(`Successfully seeded ${count} statutory rule packs.`);
}
