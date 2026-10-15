/**
 * MasterHRMS Centralized Financial Year, Assessment Year & Tax Period Engine
 * 
 * Statutory Authority:
 * - Republic of India Financial Year cycle: 1 April to 31 March
 * - Income-tax Act, 1961 (FY <= 2025-26 / AY <= 2026-27)
 * - Income-tax Act, 2025 (FY >= 2026-27 / Tax Year 2026-27 onwards)
 */

export interface FinancialYearMeta {
  financialYear: string;        // Canonical format: "2025-2026"
  shortCode: string;            // Short format: "2025-26"
  assessmentYear: string;       // "2026-2027"
  taxYear: string;              // "2026-27" (ITA 2025 terminology)
  startDate: Date;              // 1 April
  endDate: Date;                // 31 March
  startYear: number;
  endYear: number;
  governingAct: "Income-tax Act, 1961" | "Income-tax Act, 2025";
  isCurrent: boolean;
  isHistorical: boolean;
  isPlanning: boolean;
  statutoryRuleType: "TDS_115BAC_FY2425" | "TDS_115BAC" | "TDS_ITA2025";
}

/**
 * Standardize any incoming FY string representation into canonical "YYYY-YYYY" format.
 * Supports "2025-26", "2025-2026", "FY 2025-26", "FY2025-26", "2025-2026".
 */
export function normalizeFinancialYear(input?: string | null): string {
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
export function isValidFinancialYear(input?: string | null): boolean {
  if (!input) return false;
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
export function getFinancialYearFromDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1 to 12
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Compute the Indian Financial Year from a payroll period (month: 1-12, year: YYYY).
 */
export function getFinancialYearFromPeriod(month: number, year: number): string {
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Get the current active Indian Financial Year string.
 */
export function getCurrentFinancialYear(): string {
  return getFinancialYearFromDate(new Date());
}

/**
 * Compute Assessment Year from a Financial Year.
 * E.g., FY 2025-2026 -> AY 2026-2027.
 */
export function getAssessmentYear(financialYear: string): string {
  const normalized = normalizeFinancialYear(financialYear);
  const startYear = parseInt(normalized.split("-")[0], 10);
  return `${startYear + 1}-${startYear + 2}`;
}

/**
 * Convert canonical "2025-2026" to short "2025-26".
 */
export function toShortFY(financialYear: string): string {
  const normalized = normalizeFinancialYear(financialYear);
  const [start, end] = normalized.split("-");
  return `${start}-${end.slice(-2)}`;
}

/**
 * Determine the governing statutory direct tax Act for a given financial year.
 */
export function getGoverningTaxAct(financialYear: string): "Income-tax Act, 1961" | "Income-tax Act, 2025" {
  const normalized = normalizeFinancialYear(financialYear);
  const startYear = parseInt(normalized.split("-")[0], 10);
  return startYear >= 2026 ? "Income-tax Act, 2025" : "Income-tax Act, 1961";
}

/**
 * Get full metadata for a given Financial Year.
 */
export function getFinancialYearMeta(financialYear?: string | null, referenceDate: Date = new Date()): FinancialYearMeta {
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

  let statutoryRuleType: "TDS_115BAC_FY2425" | "TDS_115BAC" | "TDS_ITA2025";
  if (startYear <= 2024) {
    statutoryRuleType = "TDS_115BAC_FY2425";
  } else if (startYear === 2025) {
    statutoryRuleType = "TDS_115BAC";
  } else {
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

export interface SelectableFYOption {
  value: string;             // "2025-2026"
  label: string;             // "FY 2025-26 (AY 2026-27)"
  shortCode: string;         // "2025-26"
  assessmentYear: string;    // "2026-2027"
  isCurrent: boolean;
  isHistorical: boolean;
  isPlanning: boolean;
  governingAct: string;
}

/**
 * Generate a dynamic list of selectable Financial Years for UI selectors and API validations.
 * By default includes past 3 historical years, current year, and next planning year.
 */
export function getSelectableFinancialYears(options?: {
  pastYears?: number;
  futureYears?: number;
  referenceDate?: Date;
}): SelectableFYOption[] {
  const pastYears = options?.pastYears ?? 3;
  const futureYears = options?.futureYears ?? 1;
  const refDate = options?.referenceDate ?? new Date();

  const currentFY = getFinancialYearFromDate(refDate);
  const currentStartYear = parseInt(currentFY.split("-")[0], 10);

  const optionsList: SelectableFYOption[] = [];
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
