"use strict";
/**
 * MasterHRMS Centralized Financial Year, Assessment Year & Tax Period Engine
 *
 * Statutory Authority:
 * - Republic of India Financial Year cycle: 1 April to 31 March
 * - Income-tax Act, 1961 (FY <= 2025-26 / AY <= 2026-27)
 * - Income-tax Act, 2025 (FY >= 2026-27 / Tax Year 2026-27 onwards)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFinancialYear = normalizeFinancialYear;
exports.isValidFinancialYear = isValidFinancialYear;
exports.getFinancialYearFromDate = getFinancialYearFromDate;
exports.getFinancialYearFromPeriod = getFinancialYearFromPeriod;
exports.getCurrentFinancialYear = getCurrentFinancialYear;
exports.getAssessmentYear = getAssessmentYear;
exports.toShortFY = toShortFY;
exports.getGoverningTaxAct = getGoverningTaxAct;
exports.getFinancialYearMeta = getFinancialYearMeta;
exports.getSelectableFinancialYears = getSelectableFinancialYears;
/**
 * Standardize any incoming FY string representation into canonical "YYYY-YYYY" format.
 * Supports "2025-26", "2025-2026", "FY 2025-26", "FY2025-26", "2025-2026".
 */
function normalizeFinancialYear(input) {
    if (!input) {
        return getCurrentFinancialYear();
    }
    const clean = input.trim().replace(/^FY\s*/i, "");
    // Match YYYY-YYYY
    const fullMatch = clean.match(/^(\d{4})-(\d{4})$/);
    if (fullMatch) {
        const start = parseInt(fullMatch[1], 10);
        const end = parseInt(fullMatch[2], 10);
        if (end === start + 1) {
            return `${start}-${end}`;
        }
    }
    // Match YYYY-YY
    const shortMatch = clean.match(/^(\d{4})-(\d{2})$/);
    if (shortMatch) {
        const start = parseInt(shortMatch[1], 10);
        const endSuffix = parseInt(shortMatch[2], 10);
        const expectedSuffix = (start + 1) % 100;
        if (endSuffix === expectedSuffix) {
            return `${start}-${start + 1}`;
        }
    }
    // If invalid format, fallback safely to current
    return getCurrentFinancialYear();
}
/**
 * Validates whether a financial year string is formatted correctly and represents a valid 1-year span.
 */
function isValidFinancialYear(input) {
    if (!input)
        return false;
    const clean = input.trim().replace(/^FY\s*/i, "");
    const fullMatch = clean.match(/^(\d{4})-(\d{4})$/);
    if (fullMatch) {
        const start = parseInt(fullMatch[1], 10);
        const end = parseInt(fullMatch[2], 10);
        return end === start + 1 && start >= 2000 && start <= 2100;
    }
    const shortMatch = clean.match(/^(\d{4})-(\d{2})$/);
    if (shortMatch) {
        const start = parseInt(shortMatch[1], 10);
        const endSuffix = parseInt(shortMatch[2], 10);
        return endSuffix === (start + 1) % 100 && start >= 2000 && start <= 2100;
    }
    return false;
}
/**
 * Compute the Indian Financial Year for any given Gregorian Date.
 * Rule: Months 1..3 (Jan, Feb, Mar) belong to the FY starting in (year - 1).
 *       Months 4..12 (Apr..Dec) belong to the FY starting in year.
 */
function getFinancialYearFromDate(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1 to 12
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
}
/**
 * Compute the Indian Financial Year from a payroll period (month: 1-12, year: YYYY).
 */
function getFinancialYearFromPeriod(month, year) {
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
}
/**
 * Get the current active Indian Financial Year string.
 */
function getCurrentFinancialYear() {
    return getFinancialYearFromDate(new Date());
}
/**
 * Compute Assessment Year from a Financial Year.
 * E.g., FY 2025-2026 -> AY 2026-2027.
 */
function getAssessmentYear(financialYear) {
    const normalized = normalizeFinancialYear(financialYear);
    const startYear = parseInt(normalized.split("-")[0], 10);
    return `${startYear + 1}-${startYear + 2}`;
}
/**
 * Convert canonical "2025-2026" to short "2025-26".
 */
function toShortFY(financialYear) {
    const normalized = normalizeFinancialYear(financialYear);
    const [start, end] = normalized.split("-");
    return `${start}-${end.slice(-2)}`;
}
/**
 * Determine the governing statutory direct tax Act for a given financial year.
 */
function getGoverningTaxAct(financialYear) {
    const normalized = normalizeFinancialYear(financialYear);
    const startYear = parseInt(normalized.split("-")[0], 10);
    return startYear >= 2026 ? "Income-tax Act, 2025" : "Income-tax Act, 1961";
}
/**
 * Get full metadata for a given Financial Year.
 */
function getFinancialYearMeta(financialYear, referenceDate = new Date()) {
    const canonical = normalizeFinancialYear(financialYear);
    const [startStr, endStr] = canonical.split("-");
    const startYear = parseInt(startStr, 10);
    const endYear = parseInt(endStr, 10);
    const currentFY = getFinancialYearFromDate(referenceDate);
    const currentStartYear = parseInt(currentFY.split("-")[0], 10);
    const isCurrent = canonical === currentFY;
    const isHistorical = startYear < currentStartYear;
    const isPlanning = startYear > currentStartYear;
    const governingAct = startYear >= 2026 ? "Income-tax Act, 2025" : "Income-tax Act, 1961";
    let statutoryRuleType;
    if (startYear <= 2024) {
        statutoryRuleType = "TDS_115BAC_FY2425";
    }
    else if (startYear === 2025) {
        statutoryRuleType = "TDS_115BAC";
    }
    else {
        statutoryRuleType = "TDS_ITA2025";
    }
    return {
        financialYear: canonical,
        shortCode: `${startYear}-${String(endYear).slice(-2)}`,
        assessmentYear: `${startYear + 1}-${endYear + 1}`,
        taxYear: `${startYear}-${String(endYear).slice(-2)}`,
        startDate: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)), // 1 April
        endDate: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)), // 31 March
        startYear,
        endYear,
        governingAct,
        isCurrent,
        isHistorical,
        isPlanning,
        statutoryRuleType,
    };
}
/**
 * Generate a dynamic list of selectable Financial Years for UI selectors and API validations.
 * By default includes past 3 historical years, current year, and next planning year.
 */
function getSelectableFinancialYears(options) {
    const pastYears = options?.pastYears ?? 3;
    const futureYears = options?.futureYears ?? 1;
    const refDate = options?.referenceDate ?? new Date();
    const currentFY = getFinancialYearFromDate(refDate);
    const currentStartYear = parseInt(currentFY.split("-")[0], 10);
    const optionsList = [];
    const minStartYear = currentStartYear - pastYears;
    const maxStartYear = currentStartYear + futureYears;
    // Newest first
    for (let y = maxStartYear; y >= minStartYear; y--) {
        const fy = `${y}-${y + 1}`;
        const meta = getFinancialYearMeta(fy, refDate);
        const actLabel = meta.governingAct === "Income-tax Act, 2025" ? "ITA 2025" : "ITA 1961";
        const statusLabel = meta.isCurrent ? " (Current)" : (meta.isPlanning ? " (Planning)" : "");
        optionsList.push({
            value: fy,
            label: `FY ${meta.shortCode} / AY ${meta.assessmentYear}${statusLabel} [${actLabel}]`,
            shortCode: meta.shortCode,
            assessmentYear: meta.assessmentYear,
            isCurrent: meta.isCurrent,
            isHistorical: meta.isHistorical,
            isPlanning: meta.isPlanning,
            governingAct: meta.governingAct,
        });
    }
    return optionsList;
}
