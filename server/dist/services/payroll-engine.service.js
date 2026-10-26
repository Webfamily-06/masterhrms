"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProfessionalTax = calculateProfessionalTax;
exports.calculateStatutoryEPF = calculateStatutoryEPF;
exports.calculateStatutoryESI = calculateStatutoryESI;
exports.calculateLabourWelfareFund = calculateLabourWelfareFund;
exports.calculateGratuityAccrual = calculateGratuityAccrual;
exports.calculateAnnualTDS = calculateAnnualTDS;
exports.computeEmployeePayrollBreakdown = computeEmployeePayrollBreakdown;
const decimal_js_1 = __importDefault(require("decimal.js"));
function calculateProfessionalTax(monthlyEarnedGross, state = "MH", periodMonth = 1, customRules) {
    const normState = (state || "MH").trim().toUpperCase();
    // If a matching active versioned DB rule exists for this state, use its slabs
    if (customRules && Array.isArray(customRules)) {
        const dbPtRule = customRules.find((r) => r.ruleType === "PT" &&
            (r.stateCode?.toUpperCase() === normState || r.stateCode === "ALL") &&
            (r.isActive !== false));
        if (dbPtRule && dbPtRule.configJson?.slabs && Array.isArray(dbPtRule.configJson.slabs)) {
            const slabs = dbPtRule.configJson.slabs;
            for (const slab of slabs) {
                const min = Number(slab.min || 0);
                const max = slab.max !== null && slab.max !== undefined ? Number(slab.max) : Infinity;
                if (monthlyEarnedGross >= min && monthlyEarnedGross <= max) {
                    if (periodMonth === 2 && slab.februarySpecialTax !== undefined) {
                        return Number(slab.februarySpecialTax);
                    }
                    return Number(slab.tax || 0);
                }
            }
        }
    }
    // Fallback to official statutory state matrix
    switch (normState) {
        case "MAHARASHTRA":
        case "MH":
            if (monthlyEarnedGross <= 7500)
                return 0;
            if (monthlyEarnedGross <= 10000)
                return 175;
            // In Maharashtra, Feb is 300, other months 200
            return periodMonth === 2 ? 300 : 200;
        case "KARNATAKA":
        case "KA":
            if (monthlyEarnedGross < 15000)
                return 0;
            return 200;
        case "TELANGANA":
        case "TS":
        case "TG":
        case "ANDHRA PRADESH":
        case "AP":
            if (monthlyEarnedGross <= 15000)
                return 0;
            if (monthlyEarnedGross <= 20000)
                return 150;
            return 200;
        case "TAMIL NADU":
        case "TN":
            if (monthlyEarnedGross <= 21000)
                return 0;
            if (monthlyEarnedGross <= 30000)
                return 100;
            if (monthlyEarnedGross <= 45000)
                return 235;
            if (monthlyEarnedGross <= 60000)
                return 510;
            if (monthlyEarnedGross <= 75000)
                return 760;
            return 1095 / 6; // Half yearly averaged to ~182/mo
        case "WEST BENGAL":
        case "WB":
            if (monthlyEarnedGross <= 10000)
                return 0;
            if (monthlyEarnedGross <= 15000)
                return 110;
            if (monthlyEarnedGross <= 25000)
                return 130;
            if (monthlyEarnedGross <= 40000)
                return 150;
            return 200;
        case "GUJARAT":
        case "GJ":
            if (monthlyEarnedGross <= 12000)
                return 0;
            return 200;
        case "DELHI":
        case "DL":
        case "HARYANA":
        case "HR":
        case "RAJASTHAN":
        case "RJ":
        case "UTTAR PRADESH":
        case "UP":
            // No professional tax levied
            return 0;
        default:
            // Default standard cap
            return monthlyEarnedGross > 10000 ? 200 : 0;
    }
}
// -------------------------------------------------------------
// 2. STATUTORY EPF, ESI, LWF & GRATUITY CALCULATIONS
// -------------------------------------------------------------
function calculateStatutoryEPF(basicSalary, capAtCeiling = false, ruleRecord) {
    const config = ruleRecord?.configJson || ruleRecord;
    const statutoryCeiling = Number(config?.statutoryCeiling ?? 15000);
    const employeeRate = Number(config?.employeeRate ?? 0.12);
    const employerEpfRate = Number(config?.employerEpfRate ?? 0.0367);
    const employerEpsRate = Number(config?.employerEpsRate ?? 0.0833333333);
    const edliRate = Number(config?.edliRate ?? 0.005);
    const pfAdminRate = Number(config?.pfAdminRate ?? 0.005);
    const epsMaxMonthly = Number(config?.epsMaxMonthly ?? 1250);
    // Statutory wage ceiling
    const pfWage = capAtCeiling ? Math.min(statutoryCeiling, basicSalary) : basicSalary;
    const employeePf = Math.round(pfWage * employeeRate * 100) / 100;
    // Employer portion: EPF + EPS (capped at epsMaxMonthly) + EDLI + Admin
    const eps = Math.min(epsMaxMonthly, Math.round(pfWage * employerEpsRate));
    const epfEmployer = Math.max(0, employeePf - eps);
    const edli = Math.round(pfWage * edliRate * 100) / 100;
    const adminCharges = Math.round(pfWage * pfAdminRate * 100) / 100;
    return {
        employeePf,
        epfEmployer,
        eps,
        edli,
        adminCharges,
        totalEmployerCost: Math.round((epfEmployer + eps + edli + adminCharges) * 100) / 100,
        ruleVersion: ruleRecord?.version || 1,
        ruleId: ruleRecord?.id,
        statutoryCeiling,
        employeeRate,
    };
}
function calculateStatutoryESI(monthlyEarnedGross, isPwd = false, ruleRecord) {
    const config = ruleRecord?.configJson || ruleRecord;
    const standardCeiling = Number(config?.wageCeiling ?? 21000);
    const pwdCeiling = Number(config?.wageCeilingPwd ?? 25000);
    const wageCeiling = isPwd ? pwdCeiling : standardCeiling;
    const employeeRate = Number(config?.employeeRate ?? 0.0075);
    const employerRate = Number(config?.employerRate ?? 0.0325);
    if (monthlyEarnedGross > wageCeiling) {
        return {
            isEligible: false,
            employeeEsi: 0,
            employerEsi: 0,
            totalCost: 0,
            ruleVersion: ruleRecord?.version || 1,
            ruleId: ruleRecord?.id,
            wageCeiling,
            employeeRate,
            employerRate,
        };
    }
    const employeeEsi = Math.round(monthlyEarnedGross * employeeRate * 100) / 100;
    const employerEsi = Math.round(monthlyEarnedGross * employerRate * 100) / 100;
    return {
        isEligible: true,
        employeeEsi,
        employerEsi,
        totalCost: Math.round((employeeEsi + employerEsi) * 100) / 100,
        ruleVersion: ruleRecord?.version || 1,
        ruleId: ruleRecord?.id,
        wageCeiling,
        employeeRate,
        employerRate,
    };
}
function calculateLabourWelfareFund(monthlyEarnedGross, state = "TN", periodMonth = 12, customRules) {
    const normState = (state || "TN").trim().toUpperCase();
    const lwfRule = customRules?.find((r) => r.ruleType === "LWF" &&
        (r.stateCode?.toUpperCase() === normState || r.stateCode === "ALL") &&
        (r.isActive !== false));
    if (lwfRule && lwfRule.configJson) {
        const cfg = lwfRule.configJson;
        const deductionMonths = Array.isArray(cfg.deductionMonths)
            ? cfg.deductionMonths
            : cfg.deductionMonth !== undefined
                ? [Number(cfg.deductionMonth)]
                : [12]; // Default December
        const isDeductionMonth = deductionMonths.includes(periodMonth);
        if (!isDeductionMonth) {
            return {
                isApplicable: false,
                employeeLwf: 0,
                employerLwf: 0,
                totalLwf: 0,
                ruleVersion: lwfRule.version || 1,
                ruleId: lwfRule.id,
                isDeductionMonth: false,
            };
        }
        const employeeLwf = Number(cfg.employeeContribution || 0);
        const employerLwf = Number(cfg.employerContribution || 0);
        return {
            isApplicable: true,
            employeeLwf,
            employerLwf,
            totalLwf: Math.round((employeeLwf + employerLwf) * 100) / 100,
            ruleVersion: lwfRule.version || 1,
            ruleId: lwfRule.id,
            isDeductionMonth: true,
        };
    }
    // Statutory state defaults (TN, KA, MH) if month is December (or June for MH)
    if (normState === "TN" || normState === "TAMIL NADU") {
        if (periodMonth === 12) {
            return { isApplicable: true, employeeLwf: 10, employerLwf: 20, totalLwf: 30, isDeductionMonth: true, ruleVersion: 1 };
        }
    }
    else if (normState === "KA" || normState === "KARNATAKA") {
        if (periodMonth === 12) {
            return { isApplicable: true, employeeLwf: 20, employerLwf: 40, totalLwf: 60, isDeductionMonth: true, ruleVersion: 1 };
        }
    }
    else if (normState === "MH" || normState === "MAHARASHTRA") {
        if (periodMonth === 6 || periodMonth === 12) {
            return { isApplicable: true, employeeLwf: 12, employerLwf: 36, totalLwf: 48, isDeductionMonth: true, ruleVersion: 1 };
        }
    }
    return { isApplicable: false, employeeLwf: 0, employerLwf: 0, totalLwf: 0, isDeductionMonth: false, ruleVersion: 1 };
}
function calculateGratuityAccrual(basicSalary, ruleRecord) {
    const config = ruleRecord?.configJson || ruleRecord;
    const daysFactor = Number(config?.daysFactor ?? 15);
    const monthDaysDenominator = Number(config?.monthDaysDenominator ?? 26);
    const statutoryMaxCap = Number(config?.statutoryMaxCap ?? 2000000);
    const monthlyAccrual = Math.round(((daysFactor * basicSalary) / monthDaysDenominator / 12) * 100) / 100;
    return {
        monthlyAccrual,
        statutoryMaxCap,
        daysFactor,
        ruleVersion: ruleRecord?.version || 1,
        ruleId: ruleRecord?.id,
    };
}
// -------------------------------------------------------------
// 3. INCOME-TAX ACT, 2025 SECTION 392 WITHHOLDING TAX (TDS) ENGINE
// -------------------------------------------------------------
function calculateAnnualTDS(projectedAnnualGross, regime = "new", declarations, options) {
    let standardDeduction = 0;
    let section80C = 0;
    let section80D = 0;
    let section24b = 0;
    let hraExemption = 0;
    const otherIncome = Number(declarations?.otherIncome || 0);
    const specialRateIncome = Number(declarations?.specialRateIncome || 0);
    const isResident = options?.isResident !== false; // Resident individual by default
    // Determine financial year from options or period
    const fy = options?.financialYear || (options?.periodMonth && options?.periodYear
        ? (options.periodMonth >= 4 ? `${options.periodYear}-${options.periodYear + 1}` : `${options.periodYear - 1}-${options.periodYear}`)
        : (options?.periodYear && options.periodYear === 2025 ? "2025-2026" : "2026-2027"));
    const isFY2024 = fy === "2024-2025" || fy.startsWith("2024");
    const isFY2025 = fy === "2025-2026" || fy.startsWith("2025");
    const preferredType = isFY2024 ? "TDS_115BAC_FY2425" : (isFY2025 ? "TDS_115BAC" : "TDS_ITA2025");
    // Check if custom or versioned statutory rule exists in database rule pack
    const tdsRule = options?.statutoryRules?.find((r) => r.ruleType === preferredType && r.isActive !== false) ||
        options?.statutoryRules?.find((r) => (r.ruleType === "TDS_115BAC" || r.ruleType === "TDS_ITA2025" || r.ruleType === "TDS_115BAC_FY2425") && r.isActive !== false);
    const newRuleConfig = tdsRule?.configJson?.newRegime;
    const oldRuleConfig = tdsRule?.configJson?.oldRegime;
    if (regime === "new") {
        // Standard deduction: ₹75,000 for salaried employees
        standardDeduction = newRuleConfig?.standardDeduction || 75000;
        const stdDeductDec = new decimal_js_1.default(standardDeduction);
        const taxableSalaryDec = decimal_js_1.default.max(0, new decimal_js_1.default(projectedAnnualGross).minus(stdDeductDec));
        const totalTaxableDec = taxableSalaryDec.plus(otherIncome).plus(specialRateIncome);
        const totalTaxableIncome = totalTaxableDec.toNumber();
        const customSlabs = newRuleConfig?.slabs;
        let rawTaxDec = new decimal_js_1.default(0);
        if (Array.isArray(customSlabs) && customSlabs.length > 0) {
            let rem = totalTaxableDec;
            for (const slab of customSlabs) {
                if (rem.lessThanOrEqualTo(0))
                    break;
                const slabSpan = slab.max !== null && slab.max !== undefined
                    ? new decimal_js_1.default(slab.max).minus(slab.min)
                    : new decimal_js_1.default(Infinity);
                const taxableInSlab = decimal_js_1.default.min(rem, slabSpan);
                if (taxableInSlab.greaterThan(0) && slab.rate > 0) {
                    rawTaxDec = rawTaxDec.plus(taxableInSlab.times(slab.rate));
                }
                rem = decimal_js_1.default.max(0, rem.minus(taxableInSlab));
            }
        }
        else if (isFY2024) {
            // Historical Income-tax Act, 1961 Section 115BAC slabs (FY 2024-25 / Finance (No. 2) Act, 2024)
            if (totalTaxableDec.greaterThan(1500000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1500000).times(0.30))
                    .plus(new decimal_js_1.default(300000).times(0.20)) // 12L-15L
                    .plus(new decimal_js_1.default(300000).times(0.15)) // 9L-12L
                    .plus(new decimal_js_1.default(300000).times(0.10)) // 6L-9L
                    .plus(new decimal_js_1.default(300000).times(0.05)); // 3L-6L
            }
            else if (totalTaxableDec.greaterThan(1200000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1200000).times(0.20))
                    .plus(new decimal_js_1.default(300000).times(0.15))
                    .plus(new decimal_js_1.default(300000).times(0.10))
                    .plus(new decimal_js_1.default(300000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(900000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(900000).times(0.15))
                    .plus(new decimal_js_1.default(300000).times(0.10))
                    .plus(new decimal_js_1.default(300000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(600000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(600000).times(0.10))
                    .plus(new decimal_js_1.default(300000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(300000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(300000).times(0.05));
            }
        }
        else {
            // Enacted official slabs for FY 2025-26 (Finance Act, 2025 / Section 115BAC) and FY 2026-27 (Income-tax Act, 2025 / Section 392)
            if (totalTaxableDec.greaterThan(2400000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(2400000).times(0.30))
                    .plus(new decimal_js_1.default(400000).times(0.25)) // 20L-24L = 100,000
                    .plus(new decimal_js_1.default(400000).times(0.20)) // 16L-20L = 80,000
                    .plus(new decimal_js_1.default(400000).times(0.15)) // 12L-16L = 60,000
                    .plus(new decimal_js_1.default(400000).times(0.10)) // 8L-12L = 40,000
                    .plus(new decimal_js_1.default(400000).times(0.05)); // 4L-8L = 20,000
            }
            else if (totalTaxableDec.greaterThan(2000000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(2000000).times(0.25))
                    .plus(new decimal_js_1.default(400000).times(0.20))
                    .plus(new decimal_js_1.default(400000).times(0.15))
                    .plus(new decimal_js_1.default(400000).times(0.10))
                    .plus(new decimal_js_1.default(400000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(1600000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1600000).times(0.20))
                    .plus(new decimal_js_1.default(400000).times(0.15))
                    .plus(new decimal_js_1.default(400000).times(0.10))
                    .plus(new decimal_js_1.default(400000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(1200000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1200000).times(0.15))
                    .plus(new decimal_js_1.default(400000).times(0.10))
                    .plus(new decimal_js_1.default(400000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(800000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(800000).times(0.10))
                    .plus(new decimal_js_1.default(400000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(400000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(400000).times(0.05));
            }
        }
        rawTaxDec = rawTaxDec.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const rawTax = rawTaxDec.toNumber();
        const rebateThreshold = newRuleConfig?.section156RebateThreshold ||
            newRuleConfig?.section87ARebateThreshold ||
            (isFY2024 ? 700000 : 1200000);
        const rebateThresholdDec = new decimal_js_1.default(rebateThreshold);
        let rebateDec = new decimal_js_1.default(0);
        let taxAfterRebateDec = rawTaxDec;
        if (isResident) {
            if (totalTaxableDec.lessThanOrEqualTo(rebateThresholdDec)) {
                // Full rebate under Section 87A (ITA 1961) or Section 156(2) (ITA 2025)
                rebateDec = rawTaxDec;
                taxAfterRebateDec = new decimal_js_1.default(0);
            }
            else {
                // Marginal Relief: Tax payable cannot exceed excess taxable income over the rebate threshold
                const excessIncomeDec = totalTaxableDec.minus(rebateThresholdDec);
                if (rawTaxDec.greaterThan(excessIncomeDec)) {
                    rebateDec = rawTaxDec.minus(excessIncomeDec).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
                    taxAfterRebateDec = excessIncomeDec.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
                }
                else {
                    rebateDec = new decimal_js_1.default(0);
                    taxAfterRebateDec = rawTaxDec;
                }
            }
        }
        else {
            // Non-resident / NRI: Ineligible for Section 87A / Section 156 rebate
            rebateDec = new decimal_js_1.default(0);
            taxAfterRebateDec = rawTaxDec;
        }
        const cessRateDec = new decimal_js_1.default(tdsRule?.configJson?.cessRate || 0.04);
        const cessDec = taxAfterRebateDec.times(cessRateDec).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const totalAnnualTdsDec = taxAfterRebateDec.plus(cessDec).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const totalAnnualTds = totalAnnualTdsDec.toNumber();
        let monthlyTdsDec;
        const isFinal = Boolean(options?.isFinalPeriod || (options?.remainingPeriods !== undefined && options.remainingPeriods === 1));
        // Period-based cumulative withholding adjustment policy:
        // Standard periods (Months 1–11) withhold rounded monthly average;
        // Final reconciliation period (isFinalPeriod === true) absorbs rounding variance so cumulative sum equals annual liability exactly.
        if (options?.tdsAlreadyDeducted !== undefined && isFinal) {
            monthlyTdsDec = decimal_js_1.default.max(0, totalAnnualTdsDec.minus(new decimal_js_1.default(options.tdsAlreadyDeducted)).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP));
        }
        else if (options?.redistributeRemaining && options?.tdsAlreadyDeducted !== undefined && options?.remainingPeriods && options.remainingPeriods > 1) {
            // In-year dynamic redistribution for salary revisions, LOPs, or mid-year adjustments
            const remainingLiability = decimal_js_1.default.max(0, totalAnnualTdsDec.minus(new decimal_js_1.default(options.tdsAlreadyDeducted)));
            monthlyTdsDec = remainingLiability.dividedBy(options.remainingPeriods).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        }
        else {
            monthlyTdsDec = totalAnnualTdsDec.dividedBy(12).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        }
        const statutoryAct = isFY2024 || isFY2025 ? "Income-tax Act, 1961" : "Income-tax Act, 2025";
        const salaryWithholdingSection = isFY2024 || isFY2025 ? "192" : "392";
        let rebateSection = isFY2024 || isFY2025 ? "Section 87A" : "Section 156(2)";
        if (!isResident) {
            rebateSection = "N/A (Ineligible Non-Resident)";
        }
        else if (rebateDec.isZero() && totalTaxableDec.greaterThan(rebateThresholdDec)) {
            rebateSection = isFY2024 || isFY2025 ? "Section 87A (Exceeded Threshold)" : "Section 156(2) (Exceeded Threshold)";
        }
        return {
            annualProjectedGross: projectedAnnualGross,
            taxRegime: "new",
            isResident,
            standardDeduction,
            section80CDeduction: 0,
            section80DDeduction: 0,
            section24bDeduction: 0,
            hraExemption: 0,
            netTaxableIncome: totalTaxableIncome,
            annualTaxCalculated: rawTax,
            rebate87A: rebateDec.toNumber(), // Legacy alias / Section 87A
            section156Rebate: rebateDec.toNumber(), // Section 156(2)
            statutoryAct,
            salaryWithholdingSection,
            rebateSection,
            taxYear: tdsRule?.configJson?.taxYear || (isFY2024 ? "2024-2025" : (isFY2025 ? "2025-2026" : "2026-2027")),
            ruleVersion: tdsRule?.version || 1,
            netTaxAfterRebate: taxAfterRebateDec.toNumber(),
            cessAmount: cessDec.toNumber(),
            totalAnnualTds,
            monthlyTdsDeduction: monthlyTdsDec.toNumber(),
        };
    }
    else {
        // Old Tax Regime with dynamic configuration and fallback
        standardDeduction = Number(oldRuleConfig?.standardDeduction ?? 50000);
        const max80C = Number(oldRuleConfig?.section80CLimit ?? 150000);
        const max80D = Number(oldRuleConfig?.section80DLimit ?? 50000);
        const max24b = Number(oldRuleConfig?.section24bLimit ?? 200000);
        section80C = Math.min(max80C, Number(declarations?.section80C || 0));
        section80D = Math.min(max80D, Number(declarations?.section80D || 0));
        section24b = Math.min(max24b, Number(declarations?.homeLoanInterest || 0));
        // HRA calculation approximation (least of actual rent paid - 10% basic, 40% basic, HRA)
        const annualBasic = projectedAnnualGross * 0.5;
        const annualHra = projectedAnnualGross * 0.2;
        const annualRentPaid = (declarations?.houseRentPaid || 0) * 12;
        if (annualRentPaid > 0) {
            const rentMinusBasic = Math.max(0, annualRentPaid - annualBasic * 0.1);
            hraExemption = Math.min(annualHra, rentMinusBasic, annualBasic * 0.4);
        }
        const totalOldDeductions = standardDeduction + section80C + section80D + section24b + hraExemption;
        const totalTaxableDec = decimal_js_1.default.max(0, new decimal_js_1.default(projectedAnnualGross).plus(otherIncome).plus(specialRateIncome).minus(totalOldDeductions));
        const totalTaxableIncome = totalTaxableDec.toNumber();
        let rawTaxDec = new decimal_js_1.default(0);
        const oldCustomSlabs = oldRuleConfig?.slabs;
        if (Array.isArray(oldCustomSlabs) && oldCustomSlabs.length > 0) {
            let rem = totalTaxableDec;
            for (const slab of oldCustomSlabs) {
                if (rem.lessThanOrEqualTo(0))
                    break;
                const slabSpan = slab.max !== null && slab.max !== undefined
                    ? new decimal_js_1.default(slab.max).minus(slab.min)
                    : new decimal_js_1.default(Infinity);
                const taxableInSlab = decimal_js_1.default.min(rem, slabSpan);
                if (taxableInSlab.greaterThan(0) && slab.rate > 0) {
                    rawTaxDec = rawTaxDec.plus(taxableInSlab.times(slab.rate));
                }
                rem = decimal_js_1.default.max(0, rem.minus(taxableInSlab));
            }
        }
        else {
            // Default Old Slabs: 0 - 2.5L: 0%, 2.5L - 5L: 5%, 5L - 10L: 20%, > 10L: 30%
            if (totalTaxableDec.greaterThan(1000000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1000000).times(0.30))
                    .plus(new decimal_js_1.default(500000).times(0.20))
                    .plus(new decimal_js_1.default(250000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(500000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(500000).times(0.20))
                    .plus(new decimal_js_1.default(250000).times(0.05));
            }
            else if (totalTaxableDec.greaterThan(250000)) {
                rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(250000).times(0.05));
            }
        }
        rawTaxDec = rawTaxDec.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const rawTax = rawTaxDec.toNumber();
        let rebateDec = new decimal_js_1.default(0);
        let taxAfterRebateDec = rawTaxDec;
        const oldRebateThreshold = oldRuleConfig?.section156RebateThreshold ||
            oldRuleConfig?.section87ARebateThreshold ||
            500000;
        const oldRebateThresholdDec = new decimal_js_1.default(oldRebateThreshold);
        if (isResident) {
            if (totalTaxableDec.lessThanOrEqualTo(oldRebateThresholdDec)) {
                rebateDec = decimal_js_1.default.min(12500, rawTaxDec);
                taxAfterRebateDec = decimal_js_1.default.max(0, rawTaxDec.minus(rebateDec));
            }
        }
        const cessRateDec = new decimal_js_1.default(tdsRule?.configJson?.cessRate ?? 0.04);
        const cessDec = taxAfterRebateDec.times(cessRateDec).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const totalAnnualTdsDec = taxAfterRebateDec.plus(cessDec).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const totalAnnualTds = totalAnnualTdsDec.toNumber();
        let monthlyTdsDec;
        const isFinal = Boolean(options?.isFinalPeriod || (options?.remainingPeriods !== undefined && options.remainingPeriods === 1));
        if (options?.tdsAlreadyDeducted !== undefined && isFinal) {
            monthlyTdsDec = decimal_js_1.default.max(0, totalAnnualTdsDec.minus(new decimal_js_1.default(options.tdsAlreadyDeducted)).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP));
        }
        else if (options?.redistributeRemaining && options?.tdsAlreadyDeducted !== undefined && options?.remainingPeriods && options.remainingPeriods > 1) {
            const remainingLiability = decimal_js_1.default.max(0, totalAnnualTdsDec.minus(new decimal_js_1.default(options.tdsAlreadyDeducted)));
            monthlyTdsDec = remainingLiability.dividedBy(options.remainingPeriods).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        }
        else {
            monthlyTdsDec = totalAnnualTdsDec.dividedBy(12).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        }
        const statutoryAct = isFY2024 || isFY2025 ? "Income-tax Act, 1961" : "Income-tax Act, 2025 (Transitional) / Income-tax Act, 1961";
        const salaryWithholdingSection = isFY2024 || isFY2025 ? "192" : "392 (192)";
        let rebateSection = isFY2024 || isFY2025 ? "Section 87A" : "Section 156(1)";
        if (!isResident) {
            rebateSection = "N/A (Ineligible Non-Resident)";
        }
        else if (rebateDec.isZero() && totalTaxableDec.greaterThan(oldRebateThresholdDec)) {
            rebateSection = isFY2024 || isFY2025 ? "Section 87A (Exceeded Threshold)" : "Section 156(1) (Exceeded Threshold)";
        }
        return {
            annualProjectedGross: projectedAnnualGross,
            taxRegime: "old",
            isResident,
            standardDeduction,
            section80CDeduction: section80C,
            section80DDeduction: section80D,
            section24bDeduction: section24b,
            hraExemption,
            netTaxableIncome: totalTaxableIncome,
            annualTaxCalculated: rawTax,
            rebate87A: rebateDec.toNumber(),
            section156Rebate: rebateDec.toNumber(),
            statutoryAct,
            salaryWithholdingSection,
            rebateSection,
            taxYear: tdsRule?.configJson?.taxYear || (isFY2024 ? "2024-2025" : (isFY2025 ? "2025-2026" : "2026-2027")),
            ruleVersion: tdsRule?.version || 1,
            netTaxAfterRebate: taxAfterRebateDec.toNumber(),
            cessAmount: cessDec.toNumber(),
            totalAnnualTds,
            monthlyTdsDeduction: monthlyTdsDec.toNumber(),
        };
    }
}
// -------------------------------------------------------------
// 4. FULL COMPREHENSIVE PAYROLL CALCULATOR
// -------------------------------------------------------------
function computeEmployeePayrollBreakdown(employee, attendance, options) {
    const proration = attendance.prorationFactor;
    const baseMonthlyCtc = Number(employee.baseMonthlyCtc) || 35000;
    const reimbursements = Number(options?.reimbursements || 0);
    const periodMonth = options?.periodMonth || new Date().getMonth() + 1;
    const currency = options?.currency || "INR";
    const currencySymbol = options?.currencySymbol || "₹";
    // Standard or Structure Component Breakdown
    const salaryGrossProrated = Math.round(baseMonthlyCtc * proration * 100) / 100;
    const totalEarnedGross = Math.round((salaryGrossProrated + reimbursements) * 100) / 100;
    // Earnings standard default allocation (50-20-15-5-5-5)
    const basicSalary = Math.round(salaryGrossProrated * 0.50 * 100) / 100;
    const hra = Math.round(salaryGrossProrated * 0.20 * 100) / 100;
    const specialAllowance = Math.round(salaryGrossProrated * 0.15 * 100) / 100;
    const conveyance = Math.round(salaryGrossProrated * 0.05 * 100) / 100;
    const medical = Math.round(salaryGrossProrated * 0.05 * 100) / 100;
    const otherAllowance = Math.max(0, Math.round((salaryGrossProrated - (basicSalary + hra + specialAllowance + conveyance + medical)) * 100) / 100);
    const earningsItemized = [
        { code: "BASIC", name: "Basic Salary", amount: basicSalary, isTaxable: true },
        { code: "HRA", name: "House Rent Allowance", amount: hra, isTaxable: true },
        { code: "SPECIAL", name: "Special Allowance", amount: specialAllowance, isTaxable: true },
        { code: "CONVEYANCE", name: "Conveyance Allowance", amount: conveyance, isTaxable: false },
        { code: "MEDICAL", name: "Medical Allowance", amount: medical, isTaxable: false },
        { code: "OTHER_ALLOW", name: "Supplementary Perks", amount: otherAllowance, isTaxable: true },
        ...(reimbursements > 0 ? [{ code: "REIMBURSEMENT", name: "Approved Expense Reimbursements", amount: reimbursements, isTaxable: false }] : []),
    ];
    // Statutory Calculations with dynamic rule resolution
    const epfRule = options?.statutoryRules?.find((r) => r.ruleType === "EPF" && (r.isActive !== false));
    const esiRule = options?.statutoryRules?.find((r) => r.ruleType === "ESI" && (r.isActive !== false));
    const gratuityRule = options?.statutoryRules?.find((r) => r.ruleType === "GRATUITY" && (r.isActive !== false));
    const pfCalc = employee.pfEligible !== false
        ? calculateStatutoryEPF(basicSalary, false, epfRule)
        : { employeePf: 0, epfEmployer: 0, eps: 0, edli: 0, adminCharges: 0, totalEmployerCost: 0, ruleVersion: 1, ruleId: undefined, statutoryCeiling: 15000, employeeRate: 0.12 };
    const esiCalc = employee.esiEligible !== false
        ? calculateStatutoryESI(totalEarnedGross, Boolean(employee.isDisability), esiRule)
        : { isEligible: false, employeeEsi: 0, employerEsi: 0, totalCost: 0, ruleVersion: 1, ruleId: undefined, wageCeiling: 21000, employeeRate: 0.0075, employerRate: 0.0325 };
    const ptAmount = employee.ptEligible !== false && attendance.payableDays > 0
        ? calculateProfessionalTax(totalEarnedGross, employee.state || "MH", periodMonth, options?.statutoryRules)
        : 0;
    const lwfCalc = employee.lwfEligible !== false && attendance.payableDays > 0
        ? calculateLabourWelfareFund(totalEarnedGross, employee.state || "MH", periodMonth, options?.statutoryRules)
        : { isApplicable: false, employeeLwf: 0, employerLwf: 0, totalLwf: 0, ruleVersion: 1, isDeductionMonth: false };
    const gratuityCalc = calculateGratuityAccrual(basicSalary, gratuityRule);
    // Tax Withholding (TDS) Calculation
    // Annualization logic:
    // 1. If priorGrossEarned is provided (authoritative YTD gross from prior completed payslips):
    //    annualProjectedGross = priorGrossEarned + totalEarnedGross + (baseMonthlyCtc * futurePeriods)
    // 2. If employmentMonthsInFy is provided (mid-year joiner or exit):
    //    annualProjectedGross = (annualCtc * activeMonths / 12) or (baseMonthlyCtc * activeMonths)
    // 3. If exact annualCtc is specified on the employee profile:
    //    annualProjectedGross = Number(employee.annualCtc)
    // 4. Otherwise project 12 months from earned gross
    let annualProjectedGross;
    if (options?.priorGrossEarned !== undefined) {
        const futurePeriods = Math.max(0, (options.remainingPeriods ?? 1) - 1);
        annualProjectedGross = new decimal_js_1.default(options.priorGrossEarned)
            .plus(totalEarnedGross)
            .plus(new decimal_js_1.default(baseMonthlyCtc).times(futurePeriods))
            .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP)
            .toNumber();
    }
    else if (options?.employmentMonthsInFy !== undefined) {
        const activeMonths = Math.max(1, Math.min(12, options.employmentMonthsInFy));
        if (employee.annualCtc) {
            annualProjectedGross = new decimal_js_1.default(employee.annualCtc).times(activeMonths).dividedBy(12).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP).toNumber();
        }
        else {
            annualProjectedGross = new decimal_js_1.default(baseMonthlyCtc).times(activeMonths).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP).toNumber();
        }
    }
    else if (employee.annualCtc) {
        annualProjectedGross = Number(employee.annualCtc);
    }
    else {
        annualProjectedGross = new decimal_js_1.default(totalEarnedGross).times(12).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP).toNumber();
    }
    const taxResult = employee.tdsEligible !== false
        ? calculateAnnualTDS(annualProjectedGross, employee.taxRegime || "new", options?.declarations, {
            isResident: employee.isResident !== false,
            statutoryRules: options?.statutoryRules,
            periodMonth,
            periodYear: options?.periodYear,
            tdsAlreadyDeducted: options?.tdsAlreadyDeducted,
            isFinalPeriod: options?.isFinalPeriod,
            remainingPeriods: options?.remainingPeriods,
            redistributeRemaining: options?.redistributeRemaining,
        })
        : calculateAnnualTDS(annualProjectedGross, "new", undefined, { isResident: true });
    const monthlyTds = employee.tdsEligible !== false ? taxResult.monthlyTdsDeduction : 0;
    const totalDeductions = Math.round((pfCalc.employeePf + esiCalc.employeeEsi + ptAmount + lwfCalc.employeeLwf + monthlyTds) * 100) / 100;
    const netPay = Math.max(0, Math.round((totalEarnedGross - totalDeductions) * 100) / 100);
    const deductionsItemized = [
        { code: "PF", name: `Provident Fund (Employee ${Math.round((pfCalc.employeeRate ?? 0.12) * 100)}%)`, amount: pfCalc.employeePf, isStatutory: true },
        { code: "ESI", name: `Employee State Insurance (${((esiCalc.employeeRate ?? 0.0075) * 100).toFixed(2)}%)`, amount: esiCalc.employeeEsi, isStatutory: true },
        { code: "PT", name: "Professional Tax", amount: ptAmount, isStatutory: true },
        ...(lwfCalc.employeeLwf > 0 ? [{ code: "LWF", name: "Labour Welfare Fund (Employee)", amount: lwfCalc.employeeLwf, isStatutory: true }] : []),
        { code: "TDS", name: "Income Tax (Section 392 TDS)", amount: monthlyTds, isStatutory: true },
    ];
    return {
        baseMonthlyCtc,
        prorationFactor: Math.round(proration * 100) / 100,
        totalWorkingDays: attendance.totalWorkingDays,
        payableDays: attendance.payableDays,
        lossOfPayDays: attendance.lossOfPayDays,
        presentDays: attendance.presentDays,
        halfDays: attendance.halfDays,
        approvedLeaveDays: attendance.approvedLeaveDays,
        earnings: {
            basicSalary,
            hra,
            specialAllowance,
            conveyance,
            medical,
            otherAllowance,
            reimbursements,
            totalGross: totalEarnedGross,
            itemized: earningsItemized,
        },
        deductions: {
            providentFund: pfCalc.employeePf,
            pfEmployerMatch: pfCalc.epfEmployer,
            esi: esiCalc.employeeEsi,
            esiEmployerMatch: esiCalc.employerEsi,
            professionalTax: ptAmount,
            lwf: lwfCalc.employeeLwf,
            tds: monthlyTds,
            otherDeductions: 0,
            totalDeductions,
            itemized: deductionsItemized,
        },
        employerContributions: {
            epf: pfCalc.epfEmployer,
            eps: pfCalc.eps,
            edli: pfCalc.edli,
            adminCharges: pfCalc.adminCharges,
            esiEmployer: esiCalc.employerEsi,
            lwfEmployer: lwfCalc.employerLwf,
            gratuityAccrual: gratuityCalc.monthlyAccrual,
            totalEmployerCost: Math.round((pfCalc.totalEmployerCost + esiCalc.employerEsi + lwfCalc.employerLwf + gratuityCalc.monthlyAccrual) * 100) / 100,
        },
        taxation: taxResult,
        statutoryManifest: {
            epf: { ruleId: pfCalc.ruleId, version: pfCalc.ruleVersion, ruleType: "EPF", statutoryCeiling: pfCalc.statutoryCeiling, employeeRate: pfCalc.employeeRate },
            esi: { ruleId: esiCalc.ruleId, version: esiCalc.ruleVersion, ruleType: "ESI", wageCeiling: esiCalc.wageCeiling, employeeRate: esiCalc.employeeRate, isEligible: esiCalc.isEligible },
            pt: { stateCode: employee.state || "MH", amount: ptAmount },
            lwf: { ruleId: lwfCalc.ruleId, version: lwfCalc.ruleVersion, ruleType: "LWF", stateCode: employee.state || "MH", employeeContribution: lwfCalc.employeeLwf, employerContribution: lwfCalc.employerLwf, isDeductionMonth: Boolean(lwfCalc.isDeductionMonth) },
            gratuity: { ruleId: gratuityCalc.ruleId, version: gratuityCalc.ruleVersion, ruleType: "GRATUITY", monthlyAccrual: gratuityCalc.monthlyAccrual, statutoryMaxCap: gratuityCalc.statutoryMaxCap },
            tds: { ruleId: taxResult?.ruleId, version: taxResult.ruleVersion || 1, ruleType: taxResult?.statutoryAct || "TDS_ITA2025", taxYear: taxResult.taxYear, standardDeduction: taxResult.standardDeduction, regime: taxResult.taxRegime },
        },
        netPay,
        currency,
        currencySymbol,
    };
}
